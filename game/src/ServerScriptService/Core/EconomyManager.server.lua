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
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

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
-- Uses secure PlayerDataBridge (server-only, not spoofable by client)
-- ══════════════════════════════════════════════

local function processAtomCollect(player, collectData)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	local elementZ = collectData.elementZ
	local symbol = collectData.symbol
	local coinReward = collectData.coinReward

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

-- Poll PlayerDataBridge for pending collections (secure server-side)
task.spawn(function()
	while true do
		for _, player in ipairs(Players:GetPlayers()) do
			local collectData = PlayerDataBridge.GetPendingCollect(player.UserId)
			if collectData then
				processAtomCollect(player, collectData)
			end
		end
		task.wait(0.1) -- check 10x per second
	end
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

	-- Signal ChainRegistry via secure server-side bridge
	PlayerDataBridge.RecordMoleculeBuild(player.UserId, molName, recipe.atoms)

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

	-- Fire client confirmation event
	Remotes.FireClient("MoleculeBuilt", player, {
		moleculeName = recipe.name,
		formula = molName,  -- chemical formula key (H2O, CO2, etc)
		molCoinsEarned = recipe.points,
		chainTokensEarned = 0,
	})

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
-- FACILITY BUILDING & PRODUCTION
-- ══════════════════════════════════════════════

local FACILITY_COSTS = {
	mine = 500,
	factory = 1000,
	researchLab = 2000,
	office = 300,
}

Remotes.RequestBuildFacility.OnServerEvent:Connect(function(player, facilityType, position)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	if not FACILITY_COSTS[facilityType] then return end
	local cost = FACILITY_COSTS[facilityType]

	if data.molCoins < cost then return end

	data.molCoins = data.molCoins - cost

	if not position or not position.X then return end
	local pos = Vector3.new(math.floor(position.X), math.floor(position.Y), math.floor(position.Z))

	local facilityId = data.nextFacilityId
	data.nextFacilityId = data.nextFacilityId + 1

	data.facilityList[facilityId] = {
		type = facilityType,
		pos = {x = pos.X, y = pos.Y, z = pos.Z},
		level = 1,
		lastProduced = os.time(),
	}

	data.facilities[facilityType] = (data.facilities[facilityType] or 0) + 1

	Remotes.FireClient("FacilityBuilt", player, {
		facilityId = facilityId,
		type = facilityType,
		position = {X = pos.X, Y = pos.Y, Z = pos.Z},
	})

	print("[EconomyManager] Facility built:", player.Name, facilityType)
end)

-- Production cycle
task.spawn(function()
	local Elements = require(ReplicatedStorage.Data.Elements)
	local PRODUCTION_CONFIG = {
		mine = {elements = {1, 6, 7, 8, 11, 12, 14}, rate = 1, interval = 30},
		factory = {molecules = {"H2O", "CO2", "NH3", "NaCl"}, rate = 0.5, interval = 60},
		researchLab = {molecules = {"V2O5", "TiO2", "Al2O3"}, rate = 0.2, interval = 120},
		office = {coins = 10, interval = 45},
	}

	while true do
		task.wait(15)

		for userId, data in pairs(playerData) do
			if not data or not data.facilityList then continue end
			local now = os.time()

			for fid, facility in pairs(data.facilityList) do
				if not facility or not facility.type then continue end
				local cfg = PRODUCTION_CONFIG[facility.type]
				if not cfg or (now - facility.lastProduced) < cfg.interval then continue end

				facility.lastProduced = now

				if facility.type == "mine" then
					for _ = 1, cfg.rate do
						local z = cfg.elements[math.random(1, #cfg.elements)]
						local elem = Elements[z]
						if elem then
							data.atoms[elem.sym] = (data.atoms[elem.sym] or 0) + 1
						end
					end

				elseif facility.type == "factory" and math.random() < cfg.rate then
					local mol = cfg.molecules[math.random(1, #cfg.molecules)]
					data.molecules[mol] = (data.molecules[mol] or 0) + 1

				elseif facility.type == "researchLab" and math.random() < cfg.rate then
					local mol = cfg.molecules[math.random(1, #cfg.molecules)]
					data.molecules[mol] = (data.molecules[mol] or 0) + 1

				elseif facility.type == "office" then
					data.molCoins = data.molCoins + cfg.coins
				end
			end
		end
	end
end)

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
