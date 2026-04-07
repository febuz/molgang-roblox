-- ServerScriptService/Core/EconomyManager.server.lua
-- Central economy manager for MOLGANG
-- Handles all MolCoin transactions, player data persistence, daily claims
-- GOLDEN RULE: never trust client — all economy calculations on server

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local DataTemplate = require(ReplicatedStorage.Data.DataTemplate)
local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- CONFIGURATION
-- ══════════════════════════════════════════════

local DAILY_CLAIM_AMOUNT = 50           -- MolCoins per daily claim
local DAILY_CLAIM_COOLDOWN = 86400      -- 24 hours in seconds
local MAX_MOLCOINS_PER_DAY = 2000       -- anti-farm cap
local SAVE_INTERVAL = 60               -- auto-save every 60 seconds

-- ══════════════════════════════════════════════
-- PLAYER DATA STORAGE
-- ══════════════════════════════════════════════

local playerDataStore = DataStoreService:GetDataStore("MolGang_PlayerData_v1")
local playerData = {}       -- {userId = data}
local playerDailyEarned = {} -- {userId = earned today}

-- Deep copy for template
local function deepCopy(t)
	if type(t) ~= "table" then return t end
	local copy = {}
	for k, v in pairs(t) do
		copy[k] = deepCopy(v)
	end
	return copy
end

-- ══════════════════════════════════════════════
-- PLAYER DATA LOAD / SAVE
-- ══════════════════════════════════════════════

local function loadPlayerData(player)
	local userId = player.UserId
	local data = nil

	local success, err = pcall(function()
		data = playerDataStore:GetAsync("player_" .. tostring(userId))
	end)

	if success and data then
		-- Merge with template (add any new fields from updates)
		local template = deepCopy(DataTemplate)
		for key, value in pairs(template) do
			if data[key] == nil then
				data[key] = value
			end
		end
		playerData[userId] = data
	else
		-- New player: use template
		playerData[userId] = deepCopy(DataTemplate)
		if not success then
			warn("[EconomyManager] Failed to load data for", player.Name, ":", err)
		end
	end

	-- Update login streak
	local today = os.date("%Y-%m-%d")
	local lastLogin = playerData[userId].lastLoginDate
	if lastLogin == "" then
		playerData[userId].loginStreak = 1
	elseif lastLogin ~= today then
		-- Check if yesterday (simple check)
		playerData[userId].loginStreak = playerData[userId].loginStreak + 1
	end
	playerData[userId].lastLoginDate = today

	playerDailyEarned[userId] = 0

	-- Send initial data to client
	Remotes.FireClient("PlayerDataLoaded", player, playerData[userId])

	print("[EconomyManager] Loaded data for", player.Name, "- MolCoins:", playerData[userId].molCoins)
end

local function savePlayerData(player)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	local success, err = pcall(function()
		playerDataStore:SetAsync("player_" .. tostring(userId), data)
	end)

	if not success then
		warn("[EconomyManager] Failed to save data for", player.Name, ":", err)
		-- Retry after 5 seconds
		task.delay(5, function()
			pcall(function()
				playerDataStore:SetAsync("player_" .. tostring(userId), data)
			end)
		end)
	end
end

-- ══════════════════════════════════════════════
-- MOLCOIN TRANSACTIONS
-- ══════════════════════════════════════════════

local function addMolCoins(player, amount, reason)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return false end

	-- Daily cap check
	if playerDailyEarned[userId] and playerDailyEarned[userId] + amount > MAX_MOLCOINS_PER_DAY then
		return false, "Daily MolCoin limit reached"
	end

	data.molCoins = data.molCoins + amount
	data.totalMolCoinsEarned = data.totalMolCoinsEarned + amount
	if playerDailyEarned[userId] then
		playerDailyEarned[userId] = playerDailyEarned[userId] + amount
	end

	return true
end

local function spendMolCoins(player, amount, reason)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return false end

	if data.molCoins < amount then
		return false, "Insufficient MolCoins"
	end

	data.molCoins = data.molCoins - amount
	data.totalMolCoinsSpent = data.totalMolCoinsSpent + amount

	return true
end

-- ══════════════════════════════════════════════
-- ATOM COLLECTION HANDLER
-- Uses SetAttribute events from AtomSpawner
-- ══════════════════════════════════════════════

local function onAtomCollected(player)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	local elementZ = player:GetAttribute("LastCollectedZ")
	local symbol = player:GetAttribute("LastCollectedSym")
	local coinReward = player:GetAttribute("LastCollectReward")

	if not elementZ or not symbol then return end

	-- Add atom to inventory
	if not data.atoms[symbol] then
		data.atoms[symbol] = 0
	end
	data.atoms[symbol] = data.atoms[symbol] + 1

	-- Track element discovery
	if not data.elementsFound[tostring(elementZ)] then
		data.elementsFound[tostring(elementZ)] = true
	end

	-- Add MolCoins
	addMolCoins(player, coinReward, "atom_collect")

	-- Update statistics
	data.totalAtomsCollected = data.totalAtomsCollected + 1

	-- Check for badge milestones
	local totalElements = 0
	for _ in pairs(data.elementsFound) do
		totalElements = totalElements + 1
	end

	if totalElements >= 10 and not data.badges["Beginner"] then
		data.badges["Beginner"] = true
		Remotes.FireClient("AchievementUnlocked", player, {
			id = "Beginner",
			name = "Beginner",
			description = "Collect 10 different elements",
		})
	end

	if totalElements >= 50 and not data.badges["Chemist"] then
		data.badges["Chemist"] = true
		Remotes.FireClient("AchievementUnlocked", player, {
			id = "Chemist",
			name = "Chemist",
			description = "Collect 50 different elements",
		})
	end

	if totalElements >= 118 and not data.badges["PeriodicMaster"] then
		data.badges["PeriodicMaster"] = true
		addMolCoins(player, 5000, "periodic_master")
		Remotes.FireClient("AchievementUnlocked", player, {
			id = "PeriodicMaster",
			name = "Periodic Master",
			description = "Collect all 118 elements!",
		})
		Remotes.FireAllClients("ServerAnnounce", {
			message = player.Name .. " completed the ENTIRE Periodic Table!",
			rarity = "legendary",
		})
	end
end

-- Watch for collect timestamp changes
Players.PlayerAdded:Connect(function(player)
	player:GetAttributeChangedSignal("CollectTimestamp"):Connect(function()
		onAtomCollected(player)
	end)
end)

-- ══════════════════════════════════════════════
-- MOLECULE BUILD VALIDATION
-- ══════════════════════════════════════════════

Remotes.RequestBuildMolecule.OnServerEvent:Connect(function(player, atomList)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	if type(atomList) ~= "table" then return end

	-- Validate and sanitize
	local atomCounts = {}
	for sym, count in pairs(atomList) do
		if type(sym) ~= "string" or type(count) ~= "number" then return end
		atomCounts[sym] = math.floor(count)
	end

	-- Check if valid molecule
	local molName, recipe = Chemistry.TryBuildMolecule(atomCounts)
	if not molName then return end

	-- Check if player has enough atoms
	for sym, count in pairs(recipe.atoms) do
		if (data.atoms[sym] or 0) < count then
			return -- not enough atoms
		end
	end

	-- Deduct atoms from inventory
	for sym, count in pairs(recipe.atoms) do
		data.atoms[sym] = data.atoms[sym] - count
		if data.atoms[sym] <= 0 then
			data.atoms[sym] = nil
		end
	end

	-- Add molecule to inventory
	if not data.molecules[molName] then
		data.molecules[molName] = 0
	end
	data.molecules[molName] = data.molecules[molName] + 1

	-- Track molecule discovery
	if not data.moleculesBuilt[molName] then
		data.moleculesBuilt[molName] = true
	end

	-- Award MolCoins for molecule
	addMolCoins(player, recipe.points, "molecule_build")

	-- Update statistics
	data.totalMoleculesBuilt = data.totalMoleculesBuilt + 1
	data.chainEntries = data.chainEntries + 1

	-- Check molecule-related badges
	if data.totalMoleculesBuilt >= 1 and not data.badges["MoleculeArtist"] then
		data.badges["MoleculeArtist"] = true
		Remotes.FireClient("AchievementUnlocked", player, {
			id = "MoleculeArtist",
			name = "Molecule Artist",
			description = "Build your first molecule",
		})
	end

	if molName == "V2O5" and not data.badges["Metallurgist"] then
		data.badges["Metallurgist"] = true
		addMolCoins(player, 200, "metallurgist_badge")
		Remotes.FireClient("AchievementUnlocked", player, {
			id = "Metallurgist",
			name = "Metallurgist",
			description = "Synthesize Vanadium Pentoxide (V2O5)",
		})
	end

	-- ChainRegistry handles the chain entry
	-- (the ChainRegistry script also listens to this event)
end)

-- ══════════════════════════════════════════════
-- DAILY CLAIM
-- ══════════════════════════════════════════════

Remotes.RequestDailyClaim.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	local now = os.time()
	local lastClaim = data.lastDailyClaim or 0

	if now - lastClaim < DAILY_CLAIM_COOLDOWN then
		local remaining = DAILY_CLAIM_COOLDOWN - (now - lastClaim)
		Remotes.FireClient("DailyClaimResult", player, {
			success = false,
			nextClaimTime = lastClaim + DAILY_CLAIM_COOLDOWN,
			remaining = remaining,
		})
		return
	end

	-- Streak bonus
	local streakBonus = math.min(data.loginStreak * 10, 100)  -- up to 100 bonus
	local totalClaim = DAILY_CLAIM_AMOUNT + streakBonus

	data.lastDailyClaim = now
	addMolCoins(player, totalClaim, "daily_claim")

	Remotes.FireClient("DailyClaimResult", player, {
		success = true,
		amount = totalClaim,
		streak = data.loginStreak,
		streakBonus = streakBonus,
		nextClaimTime = now + DAILY_CLAIM_COOLDOWN,
	})
end)

-- ══════════════════════════════════════════════
-- REMOTE FUNCTIONS
-- ══════════════════════════════════════════════

Remotes.GetPlayerData.OnServerInvoke = function(player)
	local data = playerData[player.UserId]
	if not data then return nil end
	-- Return read-only snapshot (deep copy)
	return deepCopy(data)
end

Remotes.GetBuildable.OnServerInvoke = function(player)
	local data = playerData[player.UserId]
	if not data then return {} end
	return Chemistry.GetBuildableMolecules(data.atoms)
end

Remotes.GetElementInfo.OnServerInvoke = function(player, z)
	if type(z) ~= "number" then return nil end
	local Elements = require(ReplicatedStorage.Data.Elements)
	local elem = Elements.Table[z]
	if not elem then return nil end

	local data = playerData[player.UserId]
	local playerCount = data and data.atoms[elem.sym] or 0
	local discovered = data and data.elementsFound[tostring(z)] or false

	return {
		z = z,
		name = elem.name,
		sym = elem.sym,
		mass = elem.mass,
		group = elem.group,
		period = elem.period,
		color = {elem.color.R * 255, elem.color.G * 255, elem.color.B * 255},
		rarity = elem.rarity,
		facts = elem.facts,
		playerCount = playerCount,
		discovered = discovered,
	}
end

-- ══════════════════════════════════════════════
-- PLAYER LIFECYCLE
-- ══════════════════════════════════════════════

Players.PlayerAdded:Connect(function(player)
	loadPlayerData(player)
end)

Players.PlayerRemoving:Connect(function(player)
	savePlayerData(player)
	playerData[player.UserId] = nil
	playerDailyEarned[player.UserId] = nil
end)

-- Auto-save loop
task.spawn(function()
	while true do
		task.wait(SAVE_INTERVAL)
		for _, player in ipairs(Players:GetPlayers()) do
			savePlayerData(player)
		end
	end
end)

-- Save all on shutdown
game:BindToClose(function()
	for _, player in ipairs(Players:GetPlayers()) do
		savePlayerData(player)
	end
end)

print("[MOLGANG] EconomyManager initialized")
