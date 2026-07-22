-- ServerScriptService/Core/EconomyManager.server.lua
-- Central economy manager for MOLGANG
-- Handles all MolCoin transactions, player data persistence, daily claims
-- GOLDEN RULE: never trust client — all economy calculations on server

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local DataTemplate = require(ReplicatedStorage.Data.DataTemplate)
local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
local MOLCO2Shop = require(ReplicatedStorage.Modules.MOLCO2Shop)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local Facilities = require(ReplicatedStorage.Modules.Facilities)
local NPCDialogues = require(ReplicatedStorage.Modules.NPCDialogues)

-- Wait for tutorial system to initialize
task.wait(1)
local TutorialSystem = _G.TutorialSystem or {checkProgress = function() end}

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

	-- Sync leaderboard attributes
	syncLeaderboardAttributes(player)

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
-- LEADERBOARD SYNC (set player attributes for ranking)
-- ══════════════════════════════════════════════

local function syncLeaderboardAttributes(player)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	-- Count elements found
	local elementCount = 0
	for _ in pairs(data.elementsFound) do
		elementCount = elementCount + 1
	end

	-- Count molecules built
	local moleculeCount = 0
	for _ in pairs(data.moleculesBuilt) do
		moleculeCount = moleculeCount + 1
	end

	-- Set player attributes for leaderboard
	player:SetAttribute("MolCoins", data.molCoins)
	player:SetAttribute("ElementCount", elementCount)
	player:SetAttribute("MoleculeCount", moleculeCount)
	player:SetAttribute("ChainTokens", data.chainTokens)
	player:SetAttribute("MOLCO2", data.molco2Tokens or 0)
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

	-- Sync leaderboard attributes
	syncLeaderboardAttributes(player)
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

	-- Award MOLCO2 tokens if building CO2
	if molName == "CO2" then
		data.molco2Tokens = (data.molco2Tokens or 0) + 1
		Remotes.FireClient("ServerAnnounce", player, {
			message = player.Name .. " earned 1 MOLCO2 carbon credit for synthesizing CO₂!",
			rarity = "uncommon",
		})

		-- Check for MOLCO2 achievements
		if data.molco2Tokens == 1 and not data.badges["EcoWarrior"] then
			data.badges["EcoWarrior"] = true
			Remotes.FireClient("AchievementUnlocked", player, {
				id = "EcoWarrior",
				name = "Eco Warrior",
				description = "Synthesize your first CO₂ molecule",
			})
		end

		if data.molco2Tokens >= 10 and not data.badges["CarbonNeutral"] then
			data.badges["CarbonNeutral"] = true
			addMolCoins(player, 500, "carbon_neutral_badge")
			Remotes.FireClient("AchievementUnlocked", player, {
				id = "CarbonNeutral",
				name = "Carbon Neutral",
				description = "Synthesize 10 CO₂ molecules",
			})
		end

		if data.molco2Tokens >= 50 and not data.badges["CarbonSavior"] then
			data.badges["CarbonSavior"] = true
			addMolCoins(player, 2000, "carbon_savior_badge")
			Remotes.FireClient("AchievementUnlocked", player, {
				id = "CarbonSavior",
				name = "Carbon Savior",
				description = "Synthesize 50 CO₂ molecules",
			})
			Remotes.FireAllClients("ServerAnnounce", {
				message = player.Name .. " is a true environmental hero! 50 CO₂ molecules synthesized!",
				rarity = "epic",
			})
		end
	end

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

	-- Check tutorial progress
	TutorialSystem.checkProgress(player, userId, data)

	-- Sync leaderboard attributes
	syncLeaderboardAttributes(player)

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

	-- Apply daily bonus 2x if purchased and not yet used
	local dailyBonusApplied = false
	if data.molco2Shop and data.molco2Shop["daily_bonus_2x"] then
		totalClaim = totalClaim * 2
		dailyBonusApplied = true
		-- Consume the bonus (one-time use per purchase)
		data.molco2Shop["daily_bonus_2x"] = nil
		Remotes.FireClient("ServerAnnounce", player, {
			message = player.Name .. " used Daily Bonus 2x! Claim doubled!",
			rarity = "uncommon",
		})
	end

	data.lastDailyClaim = now
	addMolCoins(player, totalClaim, "daily_claim")

	Remotes.FireClient("DailyClaimResult", player, {
		success = true,
		amount = totalClaim,
		streak = data.loginStreak,
		streakBonus = streakBonus,
		dailyBonusApplied = dailyBonusApplied,
		nextClaimTime = now + DAILY_CLAIM_COOLDOWN,
	})

	-- Sync leaderboard after potential bonus application
	syncLeaderboardAttributes(player)
end)

-- ══════════════════════════════════════════════
-- DAY ADVANCEMENT
-- ══════════════════════════════════════════════

-- Track day changes per player
local lastDayAdvance = {} -- {userId = os.time() of last advance}
local DAY_ADVANCE_INTERVAL = 600  -- 10 minutes = 1 game day

task.spawn(function()
	while true do
		task.wait(30) -- check every 30 seconds
		local now = os.time()
		for _, player in ipairs(Players:GetPlayers()) do
			local userId = player.UserId
			local data = playerData[userId]
			if data then
				local lastAdvance = lastDayAdvance[userId] or 0
				if now - lastAdvance >= DAY_ADVANCE_INTERVAL then
					data.day = (data.day or 1) + 1
					lastDayAdvance[userId] = now
					-- Notify client of day change
					Remotes.FireClient("DayAdvanced", player, {
						newDay = data.day,
						timestamp = now,
					})
					print("[EconomyManager] Player", player.Name, "advanced to day", data.day)
				end
			end
		end
	end
end)

-- ══════════════════════════════════════════════
-- FACILITY BUILDING
-- ══════════════════════════════════════════════

Remotes.RequestBuildFacility.OnServerEvent:Connect(function(player, facilityName)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	local facility = Facilities.GetFacility(facilityName)
	if not facility then
		print("[EconomyManager] Invalid facility:", facilityName)
		return
	end

	-- Check funds
	if data.molCoins < facility.cost then
		print("[EconomyManager] Insufficient funds for", facilityName)
		return
	end

	-- Check max level
	local canBuild, msg = Facilities.CanBuild(data.facilities, facilityName)
	if not canBuild then
		print("[EconomyManager] Cannot build", facilityName, ":", msg)
		return
	end

	-- Deduct cost
	data.molCoins = data.molCoins - facility.cost

	-- Add facility
	Facilities.BuildFacility(data.facilities, facilityName)

	-- Notify client
	Remotes.FireClient("FacilityBuilt", player, {
		facilityName = facilityName,
		cost = facility.cost,
		newBalance = data.molCoins,
		facilities = data.facilities,
	})

	print("[EconomyManager]", player.Name, "built", facilityName, "for", facility.cost, "MolCoins. Now has:", data.facilities)
end)

-- ══════════════════════════════════════════════
-- MARKET TRADING
-- ══════════════════════════════════════════════

-- Simple commodity prices (can be made dynamic later)
local COMMODITY_PRICES = {
	Iron = 100,
	Copper = 150,
	Gold = 500,
	Vanadium = 300,
	Tungsten = 400,
	Aluminum = 80,
	Carbon = 60,
	Nitrogen = 70,
}

Remotes.RequestMarketTrade.OnServerEvent:Connect(function(player, action, itemName, quantity, offeredPrice)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	local basePrice = COMMODITY_PRICES[itemName]
	if not basePrice then
		print("[EconomyManager] Unknown commodity:", itemName)
		return
	end

	-- Allow 20% price variance
	local minPrice = basePrice * 0.8
	local maxPrice = basePrice * 1.2
	local currentPrice = math.max(minPrice, math.min(maxPrice, offeredPrice or basePrice))

	if action == "buy" then
		local totalCost = currentPrice * quantity
		if data.molCoins < totalCost then
			print("[EconomyManager]", player.Name, "insufficient funds for", itemName)
			return
		end

		-- Deduct MolCoins, add to inventory
		data.molCoins = data.molCoins - totalCost
		data.atoms[itemName] = (data.atoms[itemName] or 0) + quantity

		Remotes.FireClient("MarketTrade", player, {
			action = "buy",
			item = itemName,
			quantity = quantity,
			totalCost = totalCost,
			newBalance = data.molCoins,
		})

		print("[EconomyManager]", player.Name, "bought", quantity, itemName, "for", totalCost)

	elseif action == "sell" then
		local itemCount = data.atoms[itemName] or 0
		if itemCount < quantity then
			print("[EconomyManager]", player.Name, "doesn't have enough", itemName)
			return
		end

		-- Deduct from inventory, add MolCoins
		local totalRevenue = currentPrice * quantity
		data.atoms[itemName] = itemCount - quantity
		if data.atoms[itemName] <= 0 then
			data.atoms[itemName] = nil
		end
		data.molCoins = data.molCoins + totalRevenue

		Remotes.FireClient("MarketTrade", player, {
			action = "sell",
			item = itemName,
			quantity = quantity,
			totalRevenue = totalRevenue,
			newBalance = data.molCoins,
		})

		print("[EconomyManager]", player.Name, "sold", quantity, itemName, "for", totalRevenue)
	end
end)

-- ══════════════════════════════════════════════
-- NPC INTERACTIONS
-- ══════════════════════════════════════════════

Remotes.RequestNPCInteract.OnServerEvent:Connect(function(player, npcName)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	local npc = NPCDialogues.GetNPC(npcName)
	if not npc then return end

	-- Get random dialogue
	local dialogue = NPCDialogues.GetRandomDialogue(npcName)
	if not dialogue then return end

	-- Award rewards
	if dialogue.rewards then
		if dialogue.rewards.molCoins then
			data.molCoins = data.molCoins + dialogue.rewards.molCoins
		end
		if dialogue.rewards.badge then
			data.badges = data.badges or {}
			data.badges[dialogue.rewards.badge] = true
		end
	end

	-- Fire dialogue event to client
	Remotes.FireClient("NPCDialogue", player, {
		npcName = npcName,
		dialogue = dialogue.text,
		rewards = dialogue.rewards,
	})

	print("[EconomyManager]", player.Name, "talked to", npcName)
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

	-- Check tutorial progress
	TutorialSystem.checkProgress(player, userId, data)

	print("[EconomyManager] Facility built:", player.Name, facilityType)
end)

-- ══════════════════════════════════════════════
-- HELPER: Calculate production bonuses
-- ══════════════════════════════════════════════

local function getProductionMultiplier(data, facilityType)
	local multiplier = 1.0
	local shop = data.molco2Shop or {}

	-- General production bonuses (all facilities)
	if shop["farm_boost_25pct"] then
		multiplier = multiplier * 1.25
	elseif shop["farm_boost_10pct"] then
		multiplier = multiplier * 1.1
	end

	-- Café drink effects (production speed boost)
	local activeCafeItem = data.activeCafeItem or ""
	if activeCafeItem == "Mango Milk Tea" then
		multiplier = multiplier * 1.1  -- +10% production speed
	end

	-- Facility-specific bonuses
	if facilityType == "mine" and shop["atom_generator"] then
		multiplier = multiplier * 1.5
	end

	return multiplier
end

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

				-- Get production multiplier from shop bonuses
				local multiplier = getProductionMultiplier(data, facility.type)

				if facility.type == "mine" then
					-- Mines: multiply atomic output
					local rate = math.floor(cfg.rate * multiplier)
					for _ = 1, rate do
						local z = cfg.elements[math.random(1, #cfg.elements)]
						local elem = Elements[z]
						if elem then
							data.atoms[elem.sym] = (data.atoms[elem.sym] or 0) + 1
						end
					end

				elseif facility.type == "factory" then
					-- Factories: multiply success chance
					local chance = cfg.rate * multiplier
					if math.random() < chance then
						local mol = cfg.molecules[math.random(1, #cfg.molecules)]
						data.molecules[mol] = (data.molecules[mol] or 0) + 1
					end

				elseif facility.type == "researchLab" then
					-- Research labs: multiply success chance
					local chance = cfg.rate * multiplier
					if math.random() < chance then
						local mol = cfg.molecules[math.random(1, #cfg.molecules)]
						data.molecules[mol] = (data.molecules[mol] or 0) + 1
					end

				elseif facility.type == "office" then
					-- Offices: multiply coin output
					local coins = math.floor(cfg.coins * multiplier)
					data.molCoins = data.molCoins + coins
				end
			end
		end
	end
end)

-- ══════════════════════════════════════════════
-- MARKET TRADING
-- ══════════════════════════════════════════════

Remotes.RequestBuyFromMarket.OnServerEvent:Connect(function(player, symbol, quantity, pricePerUnit)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	if not symbol or quantity < 1 or pricePerUnit < 1 then return end

	local totalCost = quantity * pricePerUnit

	-- Apply market discount if purchased
	if data.molco2Shop and data.molco2Shop["market_discount"] then
		totalCost = math.floor(totalCost * 0.9)  -- 10% discount
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Market Discount applied: -10% to buy cost!",
			rarity = "uncommon",
		})
	end

	-- Check if player has enough MolCoins
	if data.molCoins < totalCost then
		print("[Market] Buy failed:", player.Name, "insufficient MolCoins")
		return
	end

	-- Deduct MolCoins
	data.molCoins = data.molCoins - totalCost

	-- Add commodity to inventory (atoms or molecules)
	if symbol == "H" or symbol == "O" or symbol == "C" or symbol == "N" or symbol == "Fe" then
		-- Element atoms
		data.atoms[symbol] = (data.atoms[symbol] or 0) + quantity
	else
		-- Molecules
		data.molecules[symbol] = (data.molecules[symbol] or 0) + quantity
	end

	-- Send confirmation to client
	Remotes.FireClient("TradeSuccess", player, {type = "buy", symbol = symbol, quantity = quantity, price = pricePerUnit, total = totalCost})

	-- Sync leaderboard attributes
	syncLeaderboardAttributes(player)

	print("[Market]", player.Name, "bought", symbol, "x" .. quantity, "for", totalCost, "coins (discount applied: " .. (data.molco2Shop and data.molco2Shop["market_discount"] and "yes" or "no") .. ")")
end)

Remotes.RequestSellToMarket.OnServerEvent:Connect(function(player, symbol, quantity, pricePerUnit)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then return end

	if not symbol or quantity < 1 or pricePerUnit < 1 then return end

	-- Check if player has commodity
	local hasQuantity = 0
	if symbol == "H" or symbol == "O" or symbol == "C" or symbol == "N" or symbol == "Fe" then
		hasQuantity = data.atoms[symbol] or 0
	else
		hasQuantity = data.molecules[symbol] or 0
	end

	if hasQuantity < quantity then
		print("[Market] Sell failed:", player.Name, "insufficient", symbol)
		return
	end

	-- Remove commodity from inventory
	if symbol == "H" or symbol == "O" or symbol == "C" or symbol == "N" or symbol == "Fe" then
		data.atoms[symbol] = data.atoms[symbol] - quantity
		if data.atoms[symbol] == 0 then data.atoms[symbol] = nil end
	else
		data.molecules[symbol] = data.molecules[symbol] - quantity
		if data.molecules[symbol] == 0 then data.molecules[symbol] = nil end
	end

	-- Award MolCoins (with market discount if owned)
	local totalEarnings = quantity * pricePerUnit

	-- Apply market discount bonus if player owns it (slightly better sell prices)
	if data.molco2Shop and data.molco2Shop["market_discount"] then
		totalEarnings = math.floor(totalEarnings * 1.1)  -- 10% bonus on sales
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Market Trader bonus: +10% to sell price!",
			rarity = "uncommon",
		})
	end

	addMolCoins(player, totalEarnings, "market_sell")

	-- Send confirmation to client
	Remotes.FireClient("TradeSuccess", player, {type = "sell", symbol = symbol, quantity = quantity, price = pricePerUnit, total = totalEarnings})

	-- Sync leaderboard attributes
	syncLeaderboardAttributes(player)

	print("[Market]", player.Name, "sold", symbol, "x" .. quantity, "for", totalEarnings, "coins (bonus applied: " .. (data.molco2Shop and data.molco2Shop["market_discount"] and "yes" or "no") .. ")")
end)

-- ══════════════════════════════════════════════
-- MOLCO2 SHOP PURCHASES
-- ══════════════════════════════════════════════

Remotes.BuyMOLCO2Item.OnServerInvoke = function(player, itemId)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then
		return {success = false, reason = "Player data not found"}
	end

	-- Validate item exists
	local item = MOLCO2Shop.GetItem(itemId)
	if not item then
		return {success = false, reason = "Item not found"}
	end

	-- Check if already purchased (cosmetics/permanent bonuses)
	if data.molco2Shop[itemId] then
		return {success = false, reason = "Already purchased"}
	end

	-- Check balance
	if data.molco2Tokens < item.cost then
		return {success = false, reason = "Insufficient MOLCO2 tokens"}
	end

	-- Deduct tokens
	data.molco2Tokens = data.molco2Tokens - item.cost
	data.molco2Shop[itemId] = true

	-- Apply bonus effects
	if item.bonus.type == "production" then
		-- Production bonus stored for facility calculations
		-- When facilities produce, they'll check player's bonuses
		-- For now, we notify the client which will apply visually
		Remotes.FireClient("ServerAnnounce", player, {
			message = player.Name .. " purchased " .. item.name .. "! Production increased!",
			rarity = "uncommon",
		})
	elseif item.bonus.type == "daily" then
		-- Daily bonus - flag this purchase for next claim
		-- Client will show indicator, next daily claim will be 2x
		Remotes.FireClient("ServerAnnounce", player, {
			message = player.Name .. " purchased " .. item.name .. "! Next daily claim doubled!",
			rarity = "uncommon",
		})
	elseif item.bonus.type == "trading" then
		-- Market discount - stored for market purchase validation
		Remotes.FireClient("ServerAnnounce", player, {
			message = player.Name .. " purchased " .. item.name .. "! Market trades now 10% cheaper!",
			rarity = "uncommon",
		})
	end

	-- Update leaderboard
	syncLeaderboardAttributes(player)

	-- Log transaction
	print("[MOLCO2Shop]", player.Name, "purchased", item.name, "for", item.cost, "tokens")

	-- Return success with updated balance
	return {success = true, newBalance = data.molco2Tokens, item = item}
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
