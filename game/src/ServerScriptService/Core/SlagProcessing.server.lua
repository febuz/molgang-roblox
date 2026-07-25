--[[
	SlagProcessing.server.lua
	MOLGANG — Server-authoritative Steel Slag Processing System

	Handles the full BOF slag processing pipeline:
	1. Buy raw slag (5cm+ chunks)
	2. Crush by hand (hammer clicks) or machine
	3. Select reagent (acid/base) and start leaching
	4. Time-based leaching progress (minutes to days)
	5. Extract products (elements go to player inventory)

	All state is server-side. Client only sends requests.
	Uses EconomyManager for MolCoin transactions.
	Uses PlayerDataBridge for atom inventory updates.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local SteelSlag = require(ReplicatedStorage.Modules.SteelSlag)
local ProcessEng = require(ReplicatedStorage.Modules.ProcessEngineering)
local WorldEvents = require(ReplicatedStorage.Modules.WorldEvents)
local ResearchAccess = require(ReplicatedStorage.Modules.ResearchAccess)
local GameClock = require(ReplicatedStorage.Modules.GameClock)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local InventoryLimits = require(ReplicatedStorage.Modules.InventoryLimits)

-- ══════════════════════════════════════════════
-- CONFIGURATION
-- ══════════════════════════════════════════════

-- Use the shared OTAP clock: 1 game day is 1440 game minutes and
-- GameClock.DAY_SECONDS real seconds. This keeps leaching aligned with
-- fertilizer growth, market cycles, loans, and factory production.
local TIME_SCALE = GameClock.DAY_SECONDS / 1440
local CRUSH_COOLDOWN = 0.3        -- seconds between hammer hits
local LEACH_UPDATE_INTERVAL = 5   -- seconds between progress updates to client
local PROCESS_WATER_COST_BY_SIZE = {
	chunk = 25,
	crushed = 35,
	ground = 50,
	powder = 70,
}

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local playerSlagData = {}         -- {userId = slagInventory}
local playerLeaches = {}          -- {userId = {leachId = leachState}}
local playerCrushState = {}       -- {userId = {lastHitTime, currentHits, targetSize}}
local playerProcessState = {}     -- {userId = ProcessEngineering.CreateProcessState()}
local recentLeachRequests = {}    -- {userId = {key, timestamp}}; duplicate guard
local lastProcessControlUpdate = {} -- {userId = monotonic timestamp}; request guard
local leachIdCounter = 0

-- Get player's process control settings
local function getProcessState(userId)
	if not playerProcessState[userId] then
		local state = ProcessEng.CreateProcessState()
		local playerData = PlayerDataBridge.GetPlayerData(userId)
		local saved = playerData and playerData.processControl
		if saved then
			state.temperature = saved.temperature or state.temperature
			state.pressure = saved.pressure or state.pressure
			state.flowRate = saved.flowRate or state.flowRate
			state.pH = saved.pH or state.pH
			ProcessEng.UpdateDerivedValues(state)
		end
		playerProcessState[userId] = state
	end
	return playerProcessState[userId]
end

local function getResearchState(userId)
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	return playerData and playerData.research or {}
end

local function hasWaterTreatment(userId)
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	local factory = playerData and playerData.factory
	for _, placement in ipairs(factory and factory.placements or {}) do
		if placement.itemId == "water_treatment" then
			return true
		end
	end
	return false
end

local function persistProcessState(userId, state)
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	if not playerData then return end
	playerData.processControl = {
		temperature = state.temperature,
		pressure = state.pressure,
		flowRate = state.flowRate,
		pH = state.pH,
	}
end

-- Calculate effective leach duration based on process controls
local function getEffectiveLeachDuration(userId, baseMinutes, reagentId)
	local state = getProcessState(userId)
	ProcessEng.UpdateDerivedValues(state)
	persistProcessState(userId, state)

	local eventEffects = WorldEvents.GetActiveEffects()
	local eventEfficiency = math.max(0, tonumber(eventEffects.leachingEfficiencyMult) or 1)
	return ProcessEng.CalculateEffectiveLeachDuration(baseMinutes, reagentId, state, eventEfficiency)
end

-- ══════════════════════════════════════════════
-- HELPERS
-- ══════════════════════════════════════════════

local function getPlayerSlag(userId)
	if not playerSlagData[userId] then
		-- Try to load from persistent PlayerDataBridge
		local persistentData = PlayerDataBridge.GetPlayerData(userId)
		if persistentData and persistentData.slagInventory then
			playerSlagData[userId] = persistentData.slagInventory
		else
			playerSlagData[userId] = {
				chunk = 0,
				crushed = 0,
				ground = 0,
				powder = 0,
			}
			-- Write back to persistent data so it saves with DataStore
			if persistentData then
				persistentData.slagInventory = playerSlagData[userId]
			end
		end
	end
	return playerSlagData[userId]
end

local function getPlayerLeaches(userId)
	if not playerLeaches[userId] then
		-- Try to restore from saved data (#77 crash recovery)
		local pData = PlayerDataBridge.GetPlayerData(userId)
		if pData and pData.activeLeaches then
			playerLeaches[userId] = {}
			for leachId, saved in pairs(pData.activeLeaches) do
				playerLeaches[userId][leachId] = saved
			end
		else
			playerLeaches[userId] = {}
		end
	end
	return playerLeaches[userId]
end

-- Save leach state to player data for crash recovery (#77)
local function persistLeachState(userId)
	local leaches = playerLeaches[userId]
	if not leaches then return end
	local pData = PlayerDataBridge.GetPlayerData(userId)
	if pData then
		pData.activeLeaches = leaches
	end
end

local function countActiveLeaches(userId)
	local leaches = getPlayerLeaches(userId)
	local count = 0
	for _ in pairs(leaches) do
		count = count + 1
	end
	return count
end

local function generateLeachId()
	leachIdCounter = leachIdCounter + 1
	return "leach_" .. tostring(leachIdCounter) .. "_" .. tostring(os.time())
end

local function sendSlagUpdate(player, userId)
	local slag = getPlayerSlag(userId)
	Remotes.FireClient("SlagInventoryUpdate", player, {
		slagInventory = slag,
		activeLeaches = countActiveLeaches(userId),
	})
end

-- ══════════════════════════════════════════════
-- BUY RAW SLAG
-- ══════════════════════════════════════════════

Remotes.RequestBuySlag.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local slag = getPlayerSlag(userId)

	-- Check inventory limit
	local totalSlag = slag.chunk + slag.crushed + slag.ground + slag.powder
	if totalSlag >= SteelSlag.MAX_SLAG_INVENTORY then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Slag storage full! Process existing slag first.",
			rarity = "common",
		})
		return
	end

	-- Deduct MolCoins via PlayerDataBridge
	local cost = SteelSlag.RAW_SLAG_COST
	local success = PlayerDataBridge.SpendMolCoins(userId, cost)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Not enough MolCoins! Raw slag costs " .. cost .. " MolCoins.",
			rarity = "common",
		})
		return
	end

	-- Add 1kg raw chunk
	slag.chunk = slag.chunk + 1

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Purchased 1kg raw BOF slag (5cm+ chunks). Crush it before leaching!",
		rarity = "uncommon",
	})

	sendSlagUpdate(player, userId)
	print("[SlagProcessing]", player.Name, "bought 1kg raw slag")
end)

-- ══════════════════════════════════════════════
-- CRUSH SLAG (hammer hits or machine)
-- ══════════════════════════════════════════════

Remotes.RequestCrushSlag.OnServerEvent:Connect(function(player, targetSize)
	local userId = player.UserId
	local slag = getPlayerSlag(userId)

	-- Validate target size
	if type(targetSize) ~= "string" then return end
	local sizeData = SteelSlag.ParticleSizes[targetSize]
	if not sizeData then return end
	local sizeAllowed, sizeRequirement = ResearchAccess.CanUseParticleSize(getResearchState(userId), targetSize)
	if not sizeAllowed then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Research required: " .. tostring(sizeRequirement) .. ".",
			rarity = "common",
		})
		return
	end

	-- Determine source size (what are we crushing FROM)
	local sourceSize, sourceKey
	if targetSize == "crushed" then
		sourceSize = "chunk"
		sourceKey = "chunk"
	elseif targetSize == "ground" then
		sourceSize = "crushed"
		sourceKey = "crushed"
	elseif targetSize == "powder" then
		sourceSize = "ground"
		sourceKey = "ground"
	else
		return -- can't crush to "chunk"
	end

	-- Check we have source material
	if slag[sourceKey] <= 0 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "No " .. SteelSlag.ParticleSizes[sourceSize].name .. " to crush!",
			rarity = "common",
		})
		return
	end

	-- Machine crushing (ground/powder) costs MolCoins, instant
	if sizeData.crushHits == 0 and sizeData.crushCost > 0 then
		local success = PlayerDataBridge.SpendMolCoins(userId, sizeData.crushCost)
		if not success then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Machine grinding costs " .. sizeData.crushCost .. " MolCoins.",
				rarity = "common",
			})
			return
		end

		-- Instant machine crush
		slag[sourceKey] = slag[sourceKey] - 1
		slag[targetSize] = slag[targetSize] + 1

		Remotes.FireClient("ServerAnnounce", player, {
			message = "Machine processed 1kg to " .. sizeData.name .. " (" .. sizeData.sizeLabel .. ")",
			rarity = "uncommon",
		})
		sendSlagUpdate(player, userId)
		return
	end

	-- Manual hammer crushing (crushed from chunk)
	if sizeData.crushHits > 0 then
		-- Initialize or continue crush state
		local crushState = playerCrushState[userId]
		if not crushState or crushState.targetSize ~= targetSize then
			crushState = {
				lastHitTime = 0,
				currentHits = 0,
				targetSize = targetSize,
			}
			playerCrushState[userId] = crushState
		end

		-- Cooldown check
		local now = tick()
		if now - crushState.lastHitTime < CRUSH_COOLDOWN then
			return
		end
		crushState.lastHitTime = now
		crushState.currentHits = crushState.currentHits + 1

		-- Send progress to client
		Remotes.FireClient("SlagCrushProgress", player, {
			hits = crushState.currentHits,
			totalHits = sizeData.crushHits,
			targetSize = targetSize,
		})

		-- Check if enough hits
		if crushState.currentHits >= sizeData.crushHits then
			slag[sourceKey] = slag[sourceKey] - 1
			slag[targetSize] = slag[targetSize] + 1
			crushState.currentHits = 0

			Remotes.FireClient("ServerAnnounce", player, {
				message = "Crushed 1kg slag to " .. sizeData.name .. " (" .. sizeData.sizeLabel .. ")",
				rarity = "uncommon",
			})
			sendSlagUpdate(player, userId)
		end
	end
end)

-- ══════════════════════════════════════════════
-- START LEACHING PROCESS
-- ══════════════════════════════════════════════

Remotes.RequestStartLeach.OnServerEvent:Connect(function(player, reagentId, particleSize)
	local userId = player.UserId
	local slag = getPlayerSlag(userId)
	local processState = getProcessState(userId)

	-- Validate inputs
	if type(reagentId) ~= "string" or type(particleSize) ~= "string" then return end
	local reagent = SteelSlag.Reagents[reagentId]
	local sizeData = SteelSlag.ParticleSizes[particleSize]
	if not reagent or not sizeData then return end

	local reagentAllowed, reagentRequirement = ResearchAccess.CanUseReagent(getResearchState(userId), reagentId)
	if not reagentAllowed then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Research required: " .. tostring(reagentRequirement) .. ".",
			rarity = "common",
		})
		return
	end

	local safe, _, safetyMessage = ProcessEng.ValidateOperatingEnvelope(processState)
	if not safe then
		Remotes.FireClient("ServerAnnounce", player, {message = safetyMessage, rarity = "common"})
		return
	end

	-- Check slag available
	if slag[particleSize] <= 0 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "No " .. sizeData.name .. " available for leaching.",
			rarity = "common",
		})
		return
	end

	-- Check active leach limit
	if countActiveLeaches(userId) >= SteelSlag.MAX_ACTIVE_LEACHES then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Maximum " .. SteelSlag.MAX_ACTIVE_LEACHES .. " concurrent leaching processes!",
			rarity = "common",
		})
		return
	end

	-- Settle reagent and process-water costs together before consuming slag.
	-- This prevents a partially paid process from being created.
	local eventEffects = WorldEvents.GetActiveEffects()
	local waterCost = ProcessEng.CalculateProcessWaterCost(
		PROCESS_WATER_COST_BY_SIZE[particleSize],
		eventEffects.processWaterCostMult,
		hasWaterTreatment(userId)
	)
	local totalProcessCost = math.max(0, reagent.cost or 0) + waterCost
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	if not playerData or (playerData.molCoins or 0) < totalProcessCost then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Process needs " .. totalProcessCost .. " MC (reagent " .. (reagent.cost or 0) .. ", water " .. waterCost .. ").",
			rarity = "common",
		})
		return
	end
	local requestKey = reagentId .. ":" .. particleSize
	local recentRequest = recentLeachRequests[userId]
	if recentRequest and recentRequest.key == requestKey and os.clock() - recentRequest.timestamp < 0.75 then
		return
	end
	if totalProcessCost > 0 and not PlayerDataBridge.SpendMolCoins(userId, totalProcessCost) then
		return
	end
	recentLeachRequests[userId] = {key = requestKey, timestamp = os.clock()}

	-- Consume 1kg of slag
	slag[particleSize] = slag[particleSize] - 1

	-- Calculate leach time with process control adjustments
	local baseLeachMinutes = SteelSlag.CalculateLeachTime(particleSize, reagentId)
	local leachMinutes, reactionRate = getEffectiveLeachDuration(userId, baseLeachMinutes, reagentId)
	local leachRealSeconds = leachMinutes * TIME_SCALE
	local idealYield = SteelSlag.CalculateYield(
		particleSize, reagentId, SteelSlag.BATCH_WEIGHT_KG, processState.temperature
	)
	local massBalance = ProcessEng.CalculateSlagMassBalance(particleSize, reagentId, processState.temperature)

	-- Controls affect rate and residence time, not conservation of mass.
	local processEfficiency = math.clamp(0.75 + reactionRate * 0.125, 0.75, 0.95)
	local phFactor = ProcessEng.ReagentPHFactor(reagent, processState.pH)
	local eventEfficiency = math.max(0, tonumber(eventEffects.leachingEfficiencyMult) or 1)
	local recoveryFactor = ProcessEng.CalculateProductRecoveryFactor(processEfficiency, phFactor, eventEfficiency)
	local yield = ProcessEng.ApplyRecovery(idealYield, recoveryFactor)

	-- Create leach record
	local leachId = generateLeachId()
	local leaches = getPlayerLeaches(userId)
	leaches[leachId] = {
		id = leachId,
		reagentId = reagentId,
		reagentName = reagent.name,
		particleSize = particleSize,
		startTime = tick(),
		durationSeconds = leachRealSeconds,
		durationMinutes = leachMinutes,
		yield = yield,
		processEfficiency = processEfficiency,
		phFactor = phFactor,
		recoveryFactor = recoveryFactor,
		waterCost = waterCost,
		waterTreatment = hasWaterTreatment(userId),
		massBalance = massBalance,
		complete = false,
		extracted = false,
	}

	-- Notify client
	local timeStr = SteelSlag.FormatLeachTime(leachMinutes)
	Remotes.FireClient("SlagLeachStarted", player, {
		leachId = leachId,
		reagent = reagent.name,
		reagentFormula = reagent.formula,
		size = sizeData.name,
		durationMinutes = leachMinutes,
		durationDisplay = timeStr,
		yield = yield,
		massBalance = massBalance,
		waterCost = waterCost,
		waterTreatment = hasWaterTreatment(userId),
		reagentColor = {reagent.color.R * 255, reagent.color.G * 255, reagent.color.B * 255},
	})

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Leaching started: " .. sizeData.name .. " + " .. reagent.name .. " (" .. timeStr .. ", water " .. waterCost .. " MC)",
		rarity = "rare",
	})

	persistLeachState(userId)  -- #77 crash recovery
	sendSlagUpdate(player, userId)
	print("[SlagProcessing]", player.Name, "started leach:", reagentId, particleSize, "ETA:", timeStr)
end)

-- ══════════════════════════════════════════════
-- EXTRACT PRODUCTS FROM COMPLETED LEACH
-- ══════════════════════════════════════════════

Remotes.RequestExtractProducts.OnServerEvent:Connect(function(player, leachId)
	local userId = player.UserId
	if type(leachId) ~= "string" then return end

	local leaches = getPlayerLeaches(userId)
	local leach = leaches[leachId]
	if not leach then return end

	-- Check if leaching is complete
	local elapsed = tick() - leach.startTime
	if elapsed < leach.durationSeconds then
		local remaining = leach.durationSeconds - elapsed
		local remainingMin = math.ceil(remaining / TIME_SCALE)
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Leaching not done yet! " .. SteelSlag.FormatLeachTime(remainingMin) .. " remaining.",
			rarity = "common",
		})
		return
	end

	-- Already extracted?
	if leach.extracted then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Products already collected from this batch.",
			rarity = "common",
		})
		return
	end

	-- Convert yield to atoms and add to player inventory
	local atoms = SteelSlag.YieldToAtoms(leach.yield)
	local totalAtoms = 0
	local bonusCoins = 0
	for _, count in pairs(atoms) do totalAtoms = totalAtoms + count end
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	if not playerData or not InventoryLimits.CanAddAtoms(
		playerData.atoms, playerData.facilities, totalAtoms) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Atom storage is too full to extract this batch. Build an Office or clear storage first.",
			rarity = "common",
		})
		return
	end
	playerData.slagInventory = playerData.slagInventory or {}
	-- Keep the aggregate byproduct aligned with the batch mass balance rather
	-- than inventing a fixed kilogram for every feed size/operating condition.
	local residueKg = tonumber(leach.massBalance and (leach.massBalance.aggregateKg or leach.massBalance.wasteKg)) or 1
	residueKg = math.max(0, math.floor(residueKg * 1000 + 0.5) / 1000)
	playerData.slagInventory.residue = (playerData.slagInventory.residue or 0) + residueKg

	local Elements = require(ReplicatedStorage.Data.Elements)
	for elem, count in pairs(atoms) do
		-- Queue one secure production batch per element, not one item per atom.
		local elementZ = nil
		for z, data in pairs(Elements.Table) do
			if data.sym == elem then
				elementZ = z
				break
			end
		end
		if elementZ and PlayerDataBridge.RecordAtomCollectBatch(userId, elementZ, elem, count, 5) then
			bonusCoins = bonusCoins + count * 5
		end
	end

	leach.extracted = true
	leach.complete = true

	-- Notify client
	Remotes.FireClient("SlagExtracted", player, {
		leachId = leachId,
		atoms = atoms,
		totalAtoms = totalAtoms,
		bonusCoins = bonusCoins,
		reagent = leach.reagentName,
	})

	-- Build announcement string
	local extractList = {}
	for elem, count in pairs(atoms) do
		table.insert(extractList, count .. "x " .. elem)
	end

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Extracted from leach: " .. table.concat(extractList, ", "),
		rarity = "epic",
	})

	-- Clean up completed leach
	leaches[leachId] = nil
	persistLeachState(userId)

	sendSlagUpdate(player, userId)
	print("[SlagProcessing]", player.Name, "extracted:", table.concat(extractList, ", "))
end)

-- ══════════════════════════════════════════════
-- SLAG INFO REQUEST (for GUI refresh)
-- ══════════════════════════════════════════════

Remotes.RequestSlagInfo.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local slag = getPlayerSlag(userId)
	local leaches = getPlayerLeaches(userId)

	-- Build leach status list
	local leachList = {}
	for leachId, leach in pairs(leaches) do
		local elapsed = tick() - leach.startTime
		local progress = math.clamp(elapsed / leach.durationSeconds, 0, 1)
		local remainingSec = math.max(0, leach.durationSeconds - elapsed)
		local remainingMin = math.ceil(remainingSec / TIME_SCALE)

		table.insert(leachList, {
			id = leachId,
			reagent = leach.reagentName,
			reagentId = leach.reagentId,
			size = leach.particleSize,
			progress = progress,
			complete = progress >= 1.0,
			timeRemaining = SteelSlag.FormatLeachTime(remainingMin),
			durationDisplay = SteelSlag.FormatLeachTime(leach.durationMinutes),
			yield = leach.yield,
			massBalance = leach.massBalance,
		})
	end

	Remotes.FireClient("SlagInventoryUpdate", player, {
		slagInventory = slag,
		activeLeaches = countActiveLeaches(userId),
		leachList = leachList,
	})
end)

-- ══════════════════════════════════════════════
-- PERIODIC LEACH PROGRESS UPDATES
-- ══════════════════════════════════════════════

task.spawn(function()
	while true do
		for _, player in ipairs(Players:GetPlayers()) do
			local userId = player.UserId
			local leaches = playerLeaches[userId]
			if leaches then
				for leachId, leach in pairs(leaches) do
					if not leach.extracted then
						local elapsed = tick() - leach.startTime
						local progress = math.clamp(elapsed / leach.durationSeconds, 0, 1)
						local remainingSec = math.max(0, leach.durationSeconds - elapsed)
						local remainingMin = math.ceil(remainingSec / TIME_SCALE)

						Remotes.FireClient("SlagLeachProgress", player, {
							leachId = leachId,
							progress = progress,
							timeRemaining = SteelSlag.FormatLeachTime(remainingMin),
							complete = progress >= 1.0,
						})
					end
				end
			end
		end
		task.wait(LEACH_UPDATE_INTERVAL)
	end
end)

-- ══════════════════════════════════════════════
-- PROCESS CONTROL VARIABLES (from ProcessControlGui)
-- ══════════════════════════════════════════════

Remotes.RequestSetProcessControl.OnServerEvent:Connect(function(player, temperature, pressure, pH, flowRate)
	local userId = player.UserId
	local now = os.clock()
	if lastProcessControlUpdate[userId] and now - lastProcessControlUpdate[userId] < 0.25 then
		return
	end
	lastProcessControlUpdate[userId] = now
	local state = getProcessState(userId)

	-- Validate and clamp inputs
	if ProcessEng.IsFiniteNumber(temperature) then
		state.temperature = math.clamp(temperature, 0, 1000)
	end
	if ProcessEng.IsFiniteNumber(pressure) then
		state.pressure = math.clamp(pressure, 50, 500)
	end
	if ProcessEng.IsFiniteNumber(pH) then
		state.pH = math.clamp(pH, 0, 14)
	end
	if ProcessEng.IsFiniteNumber(flowRate) then
		state.flowRate = math.clamp(flowRate, 1, 50)
	end

	ProcessEng.UpdateDerivedValues(state)
	persistProcessState(userId, state)

	-- Set player attributes for other scripts to read
	player:SetAttribute("ProcessTemp", state.temperature)
	player:SetAttribute("ProcessPressure", state.pressure)
	player:SetAttribute("ProcessPH", state.pH)
	player:SetAttribute("ReactionRate", state.reactionRate)
end)

Remotes.RequestProcessControlState.OnServerEvent:Connect(function(player)
	local state = getProcessState(player.UserId)
	ProcessEng.UpdateDerivedValues(state)
	Remotes.FireClient("ProcessControlState", player, {
		temperature = state.temperature,
		pressure = state.pressure,
		pH = state.pH,
		flowRate = state.flowRate,
	})
end)

-- ══════════════════════════════════════════════
-- CLEANUP ON PLAYER LEAVE
-- ══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	local userId = player.UserId
	-- Persist first, then clear all per-player runtime caches. If the same user
	-- rejoins this server, getPlayerLeaches must restore the current saved
	-- snapshot instead of reusing a stale Lua table from the prior session.
	persistLeachState(userId)
	playerLeaches[userId] = nil
	playerSlagData[userId] = nil
	playerProcessState[userId] = nil
	playerCrushState[userId] = nil
	recentLeachRequests[userId] = nil
	lastProcessControlUpdate[userId] = nil
end)

print("[MOLGANG] SlagProcessing initialized — BOF steel slag chemistry active at Slakkenspoor")
