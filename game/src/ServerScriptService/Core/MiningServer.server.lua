--[[
	MiningServer.server.lua
	MOLGANG — Vanadium Mining Ground System

	Gameplay flow:
	1. Player buys EXPLORATION LICENSE for a plot (composition UNKNOWN!)
	2. Player uses Drill Rig to explore → discovers mineral composition
	3. If good vanadium content, player mines with purchased equipment
	4. Mining equipment slowly extracts ore over time (automated)
	5. Ore stockpile collected and sent to slag processing pipeline
	6. Plots can be listed for sale on player market (tradable!)
	7. Better equipment = faster mining but higher costs

	Exploration is the gamble: you pay for the license not knowing
	if you'll find 0.5% or 3% V2O5. Like real prospecting!
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local MiningSystem = require(ReplicatedStorage.Modules.MiningSystem)
local WorldEvents = require(ReplicatedStorage.Modules.WorldEvents)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local InventoryLimits = require(ReplicatedStorage.Modules.InventoryLimits)
local MiningPersistence = require(ReplicatedStorage.Modules.MiningPersistence)

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

-- Generate world plots (consistent across all players)
local worldPlots = MiningSystem.GeneratePlots()
local MINING_TICK_INTERVAL = 30  -- seconds between mining production ticks
local EXPLORATION_COST = 1000    -- base cost for exploration license (composition unknown)

local function isValidPlotId(plotId)
	return type(plotId) == "number"
		and plotId == plotId
		and plotId > -math.huge
		and plotId < math.huge
		and plotId == math.floor(plotId)
		and plotId >= 1
	end

local function isFiniteNumber(value)
	return type(value) == "number" and value == value and value > -math.huge and value < math.huge
end

local function serializePlotState(plot)
	local equipment = {}
	for index, equipId in ipairs(plot.mineEquipment or {}) do
		equipment[index] = equipId
	end
	return {
		explored = plot.explored,
		composition = plot.composition,
		vanadiumPct = plot.vanadiumPct,
		rarity = plot.rarity,
		mineEquipment = equipment,
		oreStockpile = plot.oreStockpile,
		totalMined = plot.totalMined,
		forSale = plot.forSale,
		askPrice = plot.askPrice,
	}
end

local function persistPlotState(userId, plot)
	local data = PlayerDataBridge.GetPlayerData(userId)
	if not data then return end
	data.mining = data.mining or {}
	data.mining.plotStates = data.mining.plotStates or {}
	data.mining.plotStates[tostring(plot.id)] = serializePlotState(plot)
end

local function removePersistedPlotState(userId, plotId)
	local data = PlayerDataBridge.GetPlayerData(userId)
	if data and data.mining and data.mining.plotStates then
		data.mining.plotStates[tostring(plotId)] = nil
	end
end

local function hydratePlotStates(userId, miningData)
	for plotIdString, saved in pairs(miningData.plotStates or {}) do
		local plotId = tonumber(plotIdString)
		local plot = plotId and worldPlots[plotId]
		local safeState = MiningPersistence.SanitizePlotState(saved)
		if plot and safeState and (not plot.owner or plot.owner == userId) then
			plot.owner = userId
			plot.explored = safeState.explored
			plot.composition = safeState.composition or plot.composition
			plot.vanadiumPct = safeState.vanadiumPct or plot.vanadiumPct
			plot.rarity = safeState.rarity or plot.rarity
			plot.mineEquipment = safeState.mineEquipment
			plot.oreStockpile = safeState.oreStockpile
			plot.totalMined = safeState.totalMined
			plot.forSale = safeState.forSale
			plot.askPrice = safeState.askPrice
			miningData.ownedPlots[plotId] = true
		end
	end
end

-- Player mining state
local playerMining = {}  -- {userId = {ownedPlots = {}, miningEquipment = {}}}
local hydratedMining = {}
local ownerNameCache = {}

local function getOwnerName(userId)
	local onlinePlayer = Players:GetPlayerByUserId(userId)
	if onlinePlayer then
		ownerNameCache[userId] = onlinePlayer.Name
		return onlinePlayer.Name
	end
	if ownerNameCache[userId] then return ownerNameCache[userId] end

	local success, name = pcall(function()
		return Players:GetNameFromUserIdAsync(userId)
	end)
	if success and type(name) == "string" and name ~= "" then
		ownerNameCache[userId] = name
		return name
	end
	return "Miner #" .. tostring(userId)
end

local function getPlayerMining(userId)
	if not playerMining[userId] then
		playerMining[userId] = {
			ownedPlots = {},       -- {plotId = true}
			equipment = {},        -- {equipId = count}
			totalOreMined = 0,
			totalOreValue = 0,
		}
	end
	if not hydratedMining[userId] then
		local playerData = PlayerDataBridge.GetPlayerData(userId)
		if playerData then
			playerData.mining = playerData.mining or {}
			if type(playerData.mining.ownedPlots) ~= "table" then playerData.mining.ownedPlots = {} end
			if type(playerData.mining.equipment) ~= "table" then
				playerData.mining.equipment = {}
			end
			if type(playerData.mining.plotStates) ~= "table" then
				playerData.mining.plotStates = {}
			end
			if not (type(playerData.mining.totalOreMined) == "number" and playerData.mining.totalOreMined >= 0 and playerData.mining.totalOreMined < math.huge) then
				playerData.mining.totalOreMined = 0
			end
			if not (type(playerData.mining.totalOreValue) == "number" and playerData.mining.totalOreValue >= 0 and playerData.mining.totalOreValue < math.huge) then
				playerData.mining.totalOreValue = 0
			end
			playerMining[userId] = playerData.mining
			hydratePlotStates(userId, playerData.mining)
			hydratedMining[userId] = true
		end
	end
	return playerMining[userId]
end

-- ═══════════════════════════════════════════════
-- EXPLORATION LICENSE (buy plot without knowing composition)
-- ═══════════════════════════════════════════════

Remotes.RequestBuyExplorationLicense.OnServerEvent:Connect(function(player, plotId)
	local userId = player.UserId
	if not isValidPlotId(plotId) then return end

	local plot = worldPlots[plotId]
	if not plot then return end

	-- Already owned?
	if plot.owner then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Plot #" .. plotId .. " is already claimed by another player.",
			rarity = "common",
		})
		return
	end

	-- Exploration license cost (you DON'T know the composition yet!)
	local licenseCost = EXPLORATION_COST + (plot.depth * 20)  -- deeper = more expensive license
	local success = PlayerDataBridge.SpendMolCoins(userId, licenseCost)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Exploration license for this region costs " .. licenseCost .. " MolCoins.",
			rarity = "common",
		})
		return
	end

	-- Grant ownership (but composition stays hidden until explored!)
	plot.owner = userId
	local pm = getPlayerMining(userId)
	pm.ownedPlots[plotId] = true
	persistPlotState(userId, plot)

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Exploration license acquired for Plot #" .. plotId .. " in " .. plot.region .. "! Composition UNKNOWN — use a Drill Rig to explore.",
		rarity = "rare",
	})

	Remotes.FireAllClients("ServerAnnounce", {
		message = player.Name .. " acquired mining exploration rights in " .. plot.region .. "!",
		rarity = "uncommon",
	})

	sendMiningUpdate(player, userId)
	print("[Mining]", player.Name, "bought exploration license for plot", plotId)
end)

-- ═══════════════════════════════════════════════
-- EXPLORATION (discover what minerals are in the ground)
-- ═══════════════════════════════════════════════

Remotes.RequestExplorePlot.OnServerEvent:Connect(function(player, plotId)
	local userId = player.UserId
	if not isValidPlotId(plotId) then return end

	local plot = worldPlots[plotId]
	if not plot then return end

	-- Must own it
	if plot.owner ~= userId then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "You don't own this plot! Buy an exploration license first.",
			rarity = "common",
		})
		return
	end

	-- Already explored?
	if plot.explored then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "This plot has already been explored. V2O5: " .. string.format("%.2f", plot.vanadiumPct) .. "%",
			rarity = "common",
		})
		return
	end

	-- Need drill rig equipment
	local pm = getPlayerMining(userId)
	if not pm.equipment.drill_rig or pm.equipment.drill_rig <= 0 then
		-- Allow basic exploration with hand tools (slower, costs more)
		local exploreCost = 500
		local success = PlayerDataBridge.SpendMolCoins(userId, exploreCost)
		if not success then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Manual exploration costs 500 MC, or buy a Drill Rig for faster surveys.",
				rarity = "common",
			})
			return
		end
	end

	-- REVEAL THE COMPOSITION! (this is the big moment)
	plot.explored = true
	persistPlotState(userId, plot)

	-- Build composition string
	local compStr = ""
	local sortedMinerals = {}
	for mineral, pct in pairs(plot.composition) do
		table.insert(sortedMinerals, {mineral = mineral, pct = pct})
	end
	table.sort(sortedMinerals, function(a, b) return a.pct > b.pct end)

	for _, m in ipairs(sortedMinerals) do
		if m.pct >= 0.1 then
			compStr = compStr .. m.mineral .. ": " .. string.format("%.1f", m.pct) .. "% | "
		end
	end

	Remotes.FireClient("PlotExplored", player, {
		plotId = plotId,
		composition = plot.composition,
		vanadiumPct = plot.vanadiumPct,
		plotType = plot.plotType,
		rarity = plot.rarity,
		region = plot.region,
	})

	-- Quality-based announcement
	local quality = "low"
	if plot.vanadiumPct >= 2.5 then quality = "legendary"
	elseif plot.vanadiumPct >= 1.5 then quality = "high"
	elseif plot.vanadiumPct >= 1.0 then quality = "medium"
	end

	Remotes.FireClient("ServerAnnounce", player, {
		message = "EXPLORATION RESULT — Plot #" .. plotId .. " (" .. plot.region .. ")\nV2O5: " .. string.format("%.2f", plot.vanadiumPct) .. "% (" .. quality .. " grade)\n" .. compStr,
		rarity = quality == "legendary" and "legendary" or quality == "high" and "epic" or "rare",
	})

	if plot.vanadiumPct >= 2.0 then
		Remotes.FireAllClients("ServerAnnounce", {
			message = player.Name .. " discovered a " .. quality .. "-grade vanadium deposit (" .. string.format("%.1f", plot.vanadiumPct) .. "% V2O5)!",
			rarity = "epic",
		})
	end

	sendMiningUpdate(player, userId)
	print("[Mining]", player.Name, "explored plot", plotId, "— V2O5:", plot.vanadiumPct, "%")
end)

-- ═══════════════════════════════════════════════
-- BUY MINING EQUIPMENT
-- ═══════════════════════════════════════════════

Remotes.RequestBuyMiningEquip.OnServerEvent:Connect(function(player, equipId)
	local userId = player.UserId
	if type(equipId) ~= "string" then return end

	local equip = MiningSystem.GetEquipment(equipId)
	if not equip then return end

	if equip.cost > 0 then
		local success = PlayerDataBridge.SpendMolCoins(userId, equip.cost)
		if not success then
			Remotes.FireClient("ServerAnnounce", player, {
				message = equip.name .. " costs " .. equip.cost .. " MolCoins.",
				rarity = "common",
			})
			return
		end
	end

	local pm = getPlayerMining(userId)
	pm.equipment[equipId] = (pm.equipment[equipId] or 0) + 1

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Purchased " .. equip.name .. "! Deploy it on a mining plot.",
		rarity = "uncommon",
	})

	sendMiningUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- DEPLOY EQUIPMENT ON PLOT
-- ═══════════════════════════════════════════════

Remotes.RequestDeployEquipment.OnServerEvent:Connect(function(player, plotId, equipId)
	local userId = player.UserId
	if not isValidPlotId(plotId) or type(equipId) ~= "string" then return end

	local plot = worldPlots[plotId]
	if not plot or plot.owner ~= userId then return end

	local pm = getPlayerMining(userId)
	if (pm.equipment[equipId] or 0) <= 0 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "No " .. equipId .. " in inventory!",
			rarity = "common",
		})
		return
	end

	-- Deploy
	pm.equipment[equipId] = pm.equipment[equipId] - 1
	table.insert(plot.mineEquipment, equipId)
	persistPlotState(userId, plot)

	local equip = MiningSystem.GetEquipment(equipId)
	Remotes.FireClient("ServerAnnounce", player, {
		message = "Deployed " .. (equip and equip.name or equipId) .. " on Plot #" .. plotId,
		rarity = "uncommon",
	})

	sendMiningUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- COLLECT MINED ORE
-- ═══════════════════════════════════════════════

Remotes.RequestCollectOre.OnServerEvent:Connect(function(player, plotId)
	local userId = player.UserId
	if not isValidPlotId(plotId) then return end
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	if not playerData then return end

	local plot = worldPlots[plotId]
	if not plot or plot.owner ~= userId then return end

	if plot.oreStockpile <= 0 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "No ore stockpiled yet. Deploy mining equipment and wait.",
			rarity = "common",
		})
		return
	end

	-- Convert ore to atoms based on composition
	local oreKg = plot.oreStockpile
	local value = MiningSystem.CalculateOreValue(plot.composition, oreKg)

	-- Add atoms based on composition
	local atomsGained = {}
	local pendingAtoms = {}
	local pendingAtomTotal = 0
	local Elements = require(ReplicatedStorage.Data.Elements)

	-- Map oxide compositions to element atoms
	local oxideToElem = {
		V2O5 = {sym = "V", z = 23, factor = 2},
		Fe3O4 = {sym = "Fe", z = 26, factor = 3},
		TiO2 = {sym = "Ti", z = 22, factor = 1},
		Cr2O3 = {sym = "Cr", z = 24, factor = 2},
		MnO = {sym = "Mn", z = 25, factor = 1},
		SiO2 = {sym = "Si", z = 14, factor = 1},
		Al2O3 = {sym = "Al", z = 13, factor = 2},
	}

	for oxide, pct in pairs(plot.composition) do
		local mapping = oxideToElem[oxide]
		if mapping and pct > 0.1 then
			local atomCount = math.floor(oreKg * pct / 100 * mapping.factor)
			if atomCount > 0 then
				local cappedCount = math.min(atomCount, 20) -- cap per collection
				table.insert(pendingAtoms, {z = mapping.z, sym = mapping.sym, count = cappedCount})
				pendingAtomTotal = pendingAtomTotal + cappedCount
				atomsGained[mapping.sym] = cappedCount
			end
		end
	end

	if not InventoryLimits.CanAddAtoms(
		playerData.atoms,
		playerData.facilities,
		pendingAtomTotal
	) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Atom storage is full. Clear storage or build an Office before collecting ore.",
			rarity = "common",
		})
		return
	end

	for _, pending in ipairs(pendingAtoms) do
		for _ = 1, pending.count do
			PlayerDataBridge.RecordAtomCollect(userId, pending.z, pending.sym, 2)
		end
	end

	-- Award MolCoins for ore value
	PlayerDataBridge.AddEarnedMolCoins(userId, math.floor(value / 10))

	local pm = getPlayerMining(userId)
	pm.totalOreMined = pm.totalOreMined + oreKg
	pm.totalOreValue = pm.totalOreValue + value

	-- Clear stockpile
	plot.oreStockpile = 0
	persistPlotState(userId, plot)

	-- Build result string
	local atomStr = ""
	for sym, count in pairs(atomsGained) do
		atomStr = atomStr .. count .. "x " .. sym .. " "
	end

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Collected " .. math.floor(oreKg) .. "kg ore from Plot #" .. plotId .. "!\nAtoms: " .. atomStr .. "\n+" .. math.floor(value / 10) .. " MolCoins",
		rarity = "rare",
	})

	sendMiningUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- PLOT TRADING (list for sale / buy from market)
-- ═══════════════════════════════════════════════

Remotes.RequestListPlotForSale.OnServerEvent:Connect(function(player, plotId, askPrice)
	local userId = player.UserId
	if not isValidPlotId(plotId) or not isFiniteNumber(askPrice) then return end

	local plot = worldPlots[plotId]
	if not plot or plot.owner ~= userId then return end

	plot.forSale = true
	plot.askPrice = math.max(askPrice, 100)
	persistPlotState(userId, plot)

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Plot #" .. plotId .. " listed for sale at " .. plot.askPrice .. " MolCoins!",
		rarity = "uncommon",
	})

	Remotes.FireAllClients("ServerAnnounce", {
		message = "MINING PLOT FOR SALE: Plot #" .. plotId .. " in " .. plot.region .. (plot.explored and (" V2O5: " .. string.format("%.1f", plot.vanadiumPct) .. "%") or " (unexplored)") .. " — " .. plot.askPrice .. " MC",
		rarity = "rare",
	})

	sendMiningUpdateAll()
end)

Remotes.RequestBuyPlotFromMarket.OnServerEvent:Connect(function(player, plotId)
	local userId = player.UserId
	if not isValidPlotId(plotId) then return end

	local plot = worldPlots[plotId]
	if not plot or not plot.forSale then return end
	if plot.owner == userId then return end -- can't buy own plot

	local success = PlayerDataBridge.SpendMolCoins(userId, plot.askPrice)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Plot costs " .. plot.askPrice .. " MolCoins!",
			rarity = "common",
		})
		return
	end

	-- Pay the seller
	local sellerId = plot.owner
	if sellerId then
		PlayerDataBridge.AddMolCoins(sellerId, plot.askPrice)
		-- Notify seller
		local seller = Players:GetPlayerByUserId(sellerId)
		if seller then
			Remotes.FireClient("ServerAnnounce", seller, {
				message = "Your Plot #" .. plotId .. " was bought by " .. player.Name .. " for " .. plot.askPrice .. " MC!",
				rarity = "epic",
			})
		end
		-- Remove from seller's owned list
		local sellerMining = playerMining[sellerId]
		if sellerMining then sellerMining.ownedPlots[plotId] = nil end
		removePersistedPlotState(sellerId, plotId)
	end

	-- Transfer ownership
	plot.owner = userId
	plot.forSale = false
	local pm = getPlayerMining(userId)
	pm.ownedPlots[plotId] = true
	persistPlotState(userId, plot)

	Remotes.FireClient("PlotPurchased", player, {
		plotId = plotId,
		price = plot.askPrice,
	})

	Remotes.FireAllClients("ServerAnnounce", {
		message = player.Name .. " bought mining Plot #" .. plotId .. " in " .. plot.region .. "!",
		rarity = "epic",
	})

	sendMiningUpdateAll()
end)

-- ═══════════════════════════════════════════════
-- MINING INFO REQUEST
-- ═══════════════════════════════════════════════

function sendMiningUpdate(player, userId)
	local pm = getPlayerMining(userId)

	local ownedPlotData = {}
	local marketListings = {}

	for _, plot in ipairs(worldPlots) do
		if plot.owner == userId then
			table.insert(ownedPlotData, {
				id = plot.id,
				region = plot.region,
				name = plot.name,
				explored = plot.explored,
				composition = plot.explored and plot.composition or nil,
				vanadiumPct = plot.explored and plot.vanadiumPct or nil,
				rarity = plot.explored and plot.rarity or "unknown",
				equipment = plot.mineEquipment,
				oreStockpile = plot.oreStockpile,
				totalMined = plot.totalMined,
				forSale = plot.forSale,
				askPrice = plot.askPrice,
			})
		elseif plot.forSale then
			table.insert(marketListings, {
				id = plot.id,
				region = plot.region,
				explored = plot.explored,
				vanadiumPct = plot.explored and plot.vanadiumPct or nil,
				rarity = plot.explored and plot.rarity or "unknown",
				askPrice = plot.askPrice,
				ownerName = getOwnerName(plot.owner),
			})
		end
	end

	-- Available unclaimed plots
	local availablePlots = {}
	for _, plot in ipairs(worldPlots) do
		if not plot.owner then
			table.insert(availablePlots, {
				id = plot.id,
				region = plot.region,
				depth = plot.depth,
				licenseCost = EXPLORATION_COST + (plot.depth * 20),
			})
		end
	end

	Remotes.FireClient("MiningUpdate", player, {
		ownedPlots = ownedPlotData,
		marketListings = marketListings,
		availablePlots = availablePlots,
		equipment = pm.equipment,
		totalOreMined = pm.totalOreMined,
		totalOreValue = pm.totalOreValue,
	})
end

function sendMiningUpdateAll()
	for _, player in ipairs(Players:GetPlayers()) do
		sendMiningUpdate(player, player.UserId)
	end
end

Remotes.RequestMiningInfo.OnServerEvent:Connect(function(player)
	sendMiningUpdate(player, player.UserId)
end)

-- ═══════════════════════════════════════════════
-- MINING PRODUCTION TICK
-- Equipment slowly mines ore over time
-- ═══════════════════════════════════════════════

task.spawn(function()
	while true do
		local activeEffects = WorldEvents.GetActiveEffects()
		local miningYieldMultiplier = math.max(0, tonumber(activeEffects.miningYieldMult) or 1)
		for _, plot in ipairs(worldPlots) do
			if plot.owner and #plot.mineEquipment > 0 then
				local rate = MiningSystem.CalculateMiningRate(plot, plot.mineEquipment)
				if rate > 0 then
					local produced = rate * miningYieldMultiplier * (MINING_TICK_INTERVAL / 60)  -- kg per tick
					plot.oreStockpile = plot.oreStockpile + produced
					plot.totalMined = plot.totalMined + produced
					persistPlotState(plot.owner, plot)

					-- Notify owner periodically
					local ownerPlayer = Players:GetPlayerByUserId(plot.owner)
					if ownerPlayer and math.floor(plot.totalMined) % 100 < produced then
						Remotes.FireClient("OreMined", ownerPlayer, {
							plotId = plot.id,
							kgMined = produced,
							totalStockpile = plot.oreStockpile,
						})
					end
				end
			end
		end
		task.wait(MINING_TICK_INTERVAL)
	end
end)

-- ═══════════════════════════════════════════════
-- CLEANUP
-- ═══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	-- Plot state lives in the canonical player table and is saved by
	-- EconomyManager. Drop only the runtime cache so a rejoin rehydrates it.
	playerMining[player.UserId] = nil
	hydratedMining[player.UserId] = nil
end)

print("[MOLGANG] MiningServer initialized — " .. #worldPlots .. " plots across " .. #MiningSystem.PlotLocations .. " regions")
