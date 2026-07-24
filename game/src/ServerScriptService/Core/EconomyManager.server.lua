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
local GameClock = require(ReplicatedStorage.Modules.GameClock)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local Facilities = require(ReplicatedStorage.Modules.Facilities)
local NPCDialogues = require(ReplicatedStorage.Modules.NPCDialogues)
local TradeRules = require(ReplicatedStorage.Modules.TradeRules)
local DailyStats = require(ReplicatedStorage.Modules.DailyStats)
local CommodityMarket = require(ReplicatedStorage.Modules.CommodityMarket)
local MarketTransactionLedger = require(ReplicatedStorage.Modules.MarketTransactionLedger)
local InventoryLimits = require(ReplicatedStorage.Modules.InventoryLimits)

-- ══════════════════════════════════════════════
-- CONFIGURATION
-- ══════════════════════════════════════════════

local DAILY_CLAIM_AMOUNT = 200          -- MolCoins per daily claim (enough to buy resources)
local DAILY_CLAIM_COOLDOWN = 86400      -- 24 hours in seconds
local MAX_MOLCOINS_PER_DAY = 2000       -- anti-farm cap
local SAVE_INTERVAL = 60               -- auto-save every 60 seconds

-- ══════════════════════════════════════════════
-- PLAYER DATA STORAGE
-- ══════════════════════════════════════════════

local playerDataStore = DataStoreService:GetDataStore("MolGang_PlayerData_v1")
local playerData = {}       -- {userId = data}
local playerDailyEarned = {} -- {userId = earned today}
local lastDayAdvance = {}   -- {userId = os.time() of last active-session advance}

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
		-- Facilities are nested, so merge newly introduced facility counters too.
		data.facilities = data.facilities or {}
		for key, value in pairs(template.facilities) do
			if data.facilities[key] == nil then
				data.facilities[key] = value
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
	-- Start the active-session clock at load time. Without this, the first
	-- 30-second tick compared against epoch zero and advanced a fresh player
	-- immediately instead of after one complete OTAP day.
	lastDayAdvance[userId] = os.time()
	-- Publish the same server-owned table to the bridge so other server
	-- systems (market, factory, slag and minigames) see live player state.
	PlayerDataBridge.SetEconomyData(userId, playerData[userId])

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
		-- Exponential backoff retry queue (#95)
		task.spawn(function()
			for attempt = 1, 4 do
				local delay = 5 * (2 ^ (attempt - 1))  -- 5, 10, 20, 40 seconds
				task.wait(delay)
				local retryOk = pcall(function()
					playerDataStore:SetAsync("player_" .. tostring(userId), data)
				end)
				if retryOk then
					print("[EconomyManager] Retry #" .. attempt .. " succeeded for", player.Name)
					return
				end
				warn("[EconomyManager] Retry #" .. attempt .. " failed for", player.Name)
			end
			warn("[EconomyManager] All retries exhausted for", player.Name, "- data may be lost!")
		end)
	end
end

-- ══════════════════════════════════════════════
-- MOLCOIN TRANSACTIONS
-- ══════════════════════════════════════════════

local function rejectRequest(player, message)
	Remotes.FireClient("ServerAnnounce", player, {
		message = message,
		rarity = "common",
	})
end

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
	DailyStats.Increment(data, "molCoinsEarned", amount)
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
	data.totalMolCoinsSpent = (data.totalMolCoinsSpent or 0) + amount

	return true
end

-- ══════════════════════════════════════════════
-- ATOM COLLECTION HANDLER
-- Uses secure PlayerDataBridge (server-only, not spoofable by client)
-- ══════════════════════════════════════════════

local function processAtomCollect(player, collectData)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then
		rejectRequest(player, "Your economy data is still loading. Try again shortly.")
		return
	end

	local elementZ = collectData.elementZ
	local symbol = collectData.symbol
	local coinReward = collectData.coinReward

	if not elementZ or not symbol then return end
	if not InventoryLimits.CanAddAtoms(data.atoms, data.facilities, 1) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Atom storage full. Build an Office or use existing atoms first.",
			rarity = "common",
		})
		return
	end

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
	DailyStats.Increment(data, "atomsCollected", 1)

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
		task.wait(1) -- throttled from 0.1s to 1s (#94)
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
		if type(sym) ~= "string"
			or type(count) ~= "number"
			or count ~= count
			or count == math.huge
			or count == -math.huge
			or count < 0
			or count ~= math.floor(count)
			or count > 1000 then
			return
		end
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

	-- Confirm the authoritative build so every HUD/client system can update
	-- from the same server result. Keep both legacy and current field names
	-- because older widgets still consume the former contract.
	Remotes.FireClient("MoleculeBuilt", player, {
		name = molName,
		molName = molName,
		moleculeName = molName,
		formula = molName,
		molCoinsEarned = recipe.points,
		points = recipe.points,
		chainTokensEarned = 0,
	})

	-- Track molecule discovery
	if not data.moleculesBuilt[molName] then
		data.moleculesBuilt[molName] = true
	end

	-- Award MolCoins for molecule
	addMolCoins(player, recipe.points, "molecule_build")

	-- Update statistics
	data.totalMoleculesBuilt = data.totalMoleculesBuilt + 1
	DailyStats.Increment(data, "moleculesBuilt", 1)
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
-- DAY ADVANCEMENT
-- ══════════════════════════════════════════════

-- Track day changes per player
local DAY_ADVANCE_INTERVAL = GameClock.DAY_SECONDS

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
	if not data then
		rejectRequest(player, "Your economy data is still loading. Try again shortly.")
		return
	end

	local facility = Facilities.GetFacility(facilityName)
	if not facility then
		print("[EconomyManager] Invalid facility:", facilityName)
		rejectRequest(player, "Unknown facility. Refresh the dashboard and try again.")
		return
	end

	-- Check funds
	if data.molCoins < facility.cost then
		print("[EconomyManager] Insufficient funds for", facilityName)
		rejectRequest(player, "Not enough MolCoins for " .. facilityName .. " (need " .. facility.cost .. ").")
		return
	end

	-- Check max level
	local canBuild, msg = Facilities.CanBuild(data.facilities, facilityName)
	if not canBuild then
		print("[EconomyManager] Cannot build", facilityName, ":", msg)
		rejectRequest(player, msg or "Facility cannot be built yet.")
		return
	end

	-- Deduct cost
	data.molCoins = data.molCoins - facility.cost
	data.totalMolCoinsSpent = (data.totalMolCoinsSpent or 0) + facility.cost

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
local COMMODITY_PRICES = CommodityMarket.GetBasePrices()

Remotes.RequestMarketTrade.OnServerEvent:Connect(function(player, action, itemName, quantity, offeredPrice)
	local userId = player.UserId
	local data = playerData[userId]
	if not data then
		rejectRequest(player, "Your economy data is still loading. Try again shortly.")
		return
	end

	local valid, parsedQuantity, currentPriceOrError = TradeRules.Validate(
		action, itemName, quantity, offeredPrice, COMMODITY_PRICES
	)
	if not valid then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Trade rejected: " .. currentPriceOrError,
			rarity = "common",
		})
		return
	end
	quantity = parsedQuantity
	-- offeredPrice is deliberately ignored for settlement. It is a client UI
	-- hint; the shared server market state is the only authoritative price.
	local currentPrice = CommodityMarket.GetCurrentPrice(itemName)
	if not currentPrice then
		rejectRequest(player, "Market price unavailable. Try again shortly.")
		return
	end

	if action == "buy" then
		local totalCost = currentPrice * quantity
		if not InventoryLimits.CanAddAtoms(data.atoms, data.facilities, quantity) then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Atom storage full. Build an Office or sell/process atoms first.",
				rarity = "common",
			})
			return
		end
		if data.molCoins < totalCost then
			print("[EconomyManager]", player.Name, "insufficient funds for", itemName)
			rejectRequest(player, "Not enough MolCoins to buy " .. itemName .. " (need " .. totalCost .. ").")
			return
		end

		-- Deduct MolCoins, add to inventory
		data.molCoins = data.molCoins - totalCost
		data.totalMolCoinsSpent = (data.totalMolCoinsSpent or 0) + totalCost
		data.atoms[itemName] = (data.atoms[itemName] or 0) + quantity

		Remotes.FireClient("MarketTrade", player, {
			action = "buy",
			item = itemName,
			quantity = quantity,
			totalCost = totalCost,
			newBalance = data.molCoins,
		})
		MarketTransactionLedger.Record(itemName, "buy", quantity)

		print("[EconomyManager]", player.Name, "bought", quantity, itemName, "for", totalCost)

	elseif action == "sell" then
		local itemCount = data.atoms[itemName] or 0
		if itemCount < quantity then
			print("[EconomyManager]", player.Name, "doesn't have enough", itemName)
			rejectRequest(player, "You do not have enough " .. itemName .. " to sell.")
			return
		end

		-- Deduct from inventory, add MolCoins
		local totalRevenue = currentPrice * quantity
		if playerDailyEarned[userId] + totalRevenue > MAX_MOLCOINS_PER_DAY then
			print("[EconomyManager]", player.Name, "daily earning limit reached for", itemName)
			rejectRequest(player, "Daily market income limit reached. Try again after the next reset.")
			return
		end
		data.atoms[itemName] = itemCount - quantity
		if data.atoms[itemName] <= 0 then
			data.atoms[itemName] = nil
		end
		addMolCoins(player, totalRevenue, "market_sell")

		Remotes.FireClient("MarketTrade", player, {
			action = "sell",
			item = itemName,
			quantity = quantity,
			totalRevenue = totalRevenue,
			newBalance = data.molCoins,
		})
		MarketTransactionLedger.Record(itemName, "sell", quantity)

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
			addMolCoins(player, dialogue.rewards.molCoins, "npc_dialogue")
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
-- NPC PROXIMITY QUEST OFFERS (#26)
-- ══════════════════════════════════════════════

local npcHintCooldowns = {} -- {userId = lastHintTime}

task.spawn(function()
	while true do
		task.wait(10)
		for _, player in ipairs(Players:GetPlayers()) do
			local char = player.Character
			if char then
				local hrp = char:FindFirstChild("HumanoidRootPart")
				if hrp then
					-- Check proximity to NPC models
					for _, obj in workspace:GetDescendants() do
						if obj:IsA("BasePart") and obj:GetAttribute("NPCName") then
							local dist = (hrp.Position - obj.Position).Magnitude
							if dist < 25 then
								local now = tick()
								local key = player.UserId .. "_" .. obj:GetAttribute("NPCName")
								if not npcHintCooldowns[key] or (now - npcHintCooldowns[key]) > 60 then
									npcHintCooldowns[key] = now
									Remotes.FireClient("ServerAnnounce", player, {
										message = obj:GetAttribute("NPCName") .. " wants to talk! Click to interact.",
										rarity = "uncommon",
									})
								end
							end
						end
					end
				end
			end
		end
	end
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
	PlayerDataBridge.Cleanup(player.UserId)
	playerData[player.UserId] = nil
	playerDailyEarned[player.UserId] = nil
	lastDayAdvance[player.UserId] = nil
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
