--[[
	FertilizerSystem.server.lua
	MOLGANG — Fertilizer Chemistry Track Game System

	Handles the complete farming pipeline:
	1. Soil testing (analyze pH, nutrients, contaminants)
	2. Fertilizer crafting (combine atoms into NPK compounds)
	3. Fertilizer application (improve soil nutrients)
	4. Crop planting and growth (time-based, yield depends on NPK match)
	5. Harvesting (rewards based on yield quality)
	6. Story quest progression (Acts 1-3)

	Each player has 4 farm plots that persist between sessions.
	Server-authoritative: all growth, yields, and rewards validated server-side.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local FertilizerTrack = require(ReplicatedStorage.Modules.FertilizerTrack)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- ═══════════════════════════════════════════════
-- CONFIGURATION
-- ═══════════════════════════════════════════════

local MAX_PLOTS = 4                  -- farm plots per player
local GROWTH_CHECK_INTERVAL = 30     -- seconds between growth ticks
local GAME_DAY_SECONDS = 120         -- 1 game day = 2 real minutes (for teaser)
local SOIL_TEST_COST = 20            -- MolCoins per soil test

-- ═══════════════════════════════════════════════
-- PLAYER STATE
-- ═══════════════════════════════════════════════

local playerFarms = {}  -- {userId = {plots = {}, questProgress = {}, fertilizerInventory = {}}}

local function getPlayerFarm(userId)
	if not playerFarms[userId] then
		-- Initialize 4 plots with random soil types
		local soilTypes = FertilizerTrack.SoilTypes
		local plots = {}
		for i = 1, MAX_PLOTS do
			local soilIdx = ((i - 1) % (#soilTypes - 1)) + 1  -- skip contaminated initially
			local soil = soilTypes[soilIdx]
			plots[i] = {
				id = i,
				soilType = soil.id,
				soilName = soil.name,
				pH = soil.pH + (math.random() - 0.5) * 0.5,
				nutrients = {
					N = soil.baseNutrients.N + math.random(-5, 5),
					P = soil.baseNutrients.P + math.random(-5, 5),
					K = soil.baseNutrients.K + math.random(-5, 5),
				},
				crop = nil,          -- planted crop id
				cropName = nil,
				growthProgress = 0,  -- 0-100%
				growthStartTime = 0,
				growthDays = 0,
				totalGrowthDays = 0,
				fertilized = false,
				fertilizerUsed = nil,
				ready = false,
				tested = false,
				contaminants = soil.contaminated and soil.contaminants or nil,
			}
		end

		playerFarms[userId] = {
			plots = plots,
			questProgress = {},
			fertilizerInventory = {},
			totalHarvests = 0,
			totalYield = 0,
			currentAct = 1,
		}
	end
	return playerFarms[userId]
end

local function sendFarmUpdate(player, userId)
	local farm = getPlayerFarm(userId)
	Remotes.FireClient("FertilizerUpdate", player, {
		plots = farm.plots,
		questProgress = farm.questProgress,
		fertilizerInventory = farm.fertilizerInventory,
		currentAct = farm.currentAct,
		totalHarvests = farm.totalHarvests,
	})
end

-- ═══════════════════════════════════════════════
-- SOIL TESTING
-- ═══════════════════════════════════════════════

Remotes.RequestTestSoil.OnServerEvent:Connect(function(player, plotId)
	local userId = player.UserId
	local farm = getPlayerFarm(userId)

	if type(plotId) ~= "number" or plotId < 1 or plotId > MAX_PLOTS then return end
	local plot = farm.plots[plotId]
	if not plot then return end

	-- Cost
	local success = PlayerDataBridge.SpendMolCoins(userId, SOIL_TEST_COST)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Soil test costs " .. SOIL_TEST_COST .. " MolCoins.",
			rarity = "common",
		})
		return
	end

	plot.tested = true

	Remotes.FireClient("SoilTestResult", player, {
		plotId = plotId,
		soilType = plot.soilType,
		soilName = plot.soilName,
		pH = math.floor(plot.pH * 10) / 10,
		nutrients = plot.nutrients,
		contaminants = plot.contaminants,
	})

	-- Track for quest progress
	farm.questProgress.soilTests = (farm.questProgress.soilTests or 0) + 1

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Soil test: " .. plot.soilName .. " | pH " .. string.format("%.1f", plot.pH) .. " | N:" .. plot.nutrients.N .. " P:" .. plot.nutrients.P .. " K:" .. plot.nutrients.K,
		rarity = "uncommon",
	})

	sendFarmUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- FERTILIZER CRAFTING
-- ═══════════════════════════════════════════════

Remotes.RequestCraftFertilizer.OnServerEvent:Connect(function(player, fertilizerId)
	local userId = player.UserId
	local farm = getPlayerFarm(userId)

	if type(fertilizerId) ~= "string" then return end
	local fert = FertilizerTrack.GetFertilizer(fertilizerId)
	if not fert then return end

	-- Check player has required atoms (via PlayerDataBridge)
	-- For teaser: simplified — just check MolCoin cost
	local cost = fert.points  -- use points as cost to craft
	local success = PlayerDataBridge.SpendMolCoins(userId, cost)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = fert.name .. " requires " .. cost .. " MolCoins to synthesize.",
			rarity = "common",
		})
		return
	end

	-- Add to inventory
	farm.fertilizerInventory[fertilizerId] = (farm.fertilizerInventory[fertilizerId] or 0) + 1

	-- Track quest progress
	farm.questProgress.fertilizersCrafted = (farm.questProgress.fertilizersCrafted or 0) + 1
	if not farm.questProgress.craftedTypes then farm.questProgress.craftedTypes = {} end
	farm.questProgress.craftedTypes[fertilizerId] = true

	Remotes.FireClient("FertilizerCrafted", player, {
		fertilizerId = fertilizerId,
		name = fert.name,
		npk = fert.npk,
		formula = fert.formula,
	})

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Synthesized " .. fert.name .. " (" .. fert.formula .. ") NPK: " .. fert.npk[1] .. "-" .. fert.npk[2] .. "-" .. fert.npk[3],
		rarity = "rare",
	})

	sendFarmUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- SELL SURPLUS FERTILIZER (#65)
-- ═══════════════════════════════════════════════

Remotes.RequestSellFertilizer.OnServerEvent:Connect(function(player, fertilizerId)
	local userId = player.UserId
	local farm = getPlayerFarm(userId)

	if type(fertilizerId) ~= "string" then return end
	if (farm.fertilizerInventory[fertilizerId] or 0) <= 0 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "No " .. fertilizerId .. " to sell.",
			rarity = "common",
		})
		return
	end

	local fert = FertilizerTrack.GetFertilizer(fertilizerId)
	if not fert then return end

	local sellPrice = math.floor(fert.points * 0.5)
	farm.fertilizerInventory[fertilizerId] = farm.fertilizerInventory[fertilizerId] - 1
	PlayerDataBridge.AddMolCoins(userId, sellPrice)

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Sold " .. fert.name .. " for " .. sellPrice .. " MC",
		rarity = "uncommon",
	})
	sendFarmUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- APPLY FERTILIZER TO PLOT
-- ═══════════════════════════════════════════════

Remotes.RequestApplyFertilizer.OnServerEvent:Connect(function(player, plotId, fertilizerId)
	local userId = player.UserId
	local farm = getPlayerFarm(userId)

	if type(plotId) ~= "number" or type(fertilizerId) ~= "string" then return end
	local plot = farm.plots[plotId]
	if not plot then return end

	-- Check fertilizer in inventory
	if (farm.fertilizerInventory[fertilizerId] or 0) <= 0 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "No " .. fertilizerId .. " in inventory. Craft one first!",
			rarity = "common",
		})
		return
	end

	local fert = FertilizerTrack.GetFertilizer(fertilizerId)
	if not fert then return end

	-- Consume 1 unit
	farm.fertilizerInventory[fertilizerId] = farm.fertilizerInventory[fertilizerId] - 1

	-- Apply NPK boost to soil
	-- NPK values represent kg/hectare; we scale down for game plot
	local scale = 0.5
	plot.nutrients.N = plot.nutrients.N + math.floor(fert.npk[1] * scale)
	plot.nutrients.P = plot.nutrients.P + math.floor(fert.npk[2] * scale)
	plot.nutrients.K = plot.nutrients.K + math.floor(fert.npk[3] * scale)
	plot.fertilized = true
	plot.fertilizerUsed = fert.name

	-- Special: slag fertilizer fixes contamination
	if fert.special and plot.contaminants then
		plot.contaminants = nil
		plot.pH = math.clamp(plot.pH + 1.0, 5.0, 7.5)  -- raises pH toward neutral
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Slag Bio-Enhancer neutralized soil contaminants! Soil restored.",
			rarity = "legendary",
		})
	end

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Applied " .. fert.name .. " to Plot " .. plotId .. " | N+" .. math.floor(fert.npk[1]*scale) .. " P+" .. math.floor(fert.npk[2]*scale) .. " K+" .. math.floor(fert.npk[3]*scale),
		rarity = "uncommon",
	})

	sendFarmUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- PLANT CROP
-- ═══════════════════════════════════════════════

Remotes.RequestPlantCrop.OnServerEvent:Connect(function(player, plotId, cropId)
	local userId = player.UserId
	local farm = getPlayerFarm(userId)

	if type(plotId) ~= "number" or type(cropId) ~= "string" then return end
	local plot = farm.plots[plotId]
	if not plot then return end

	-- Can't plant if already growing
	if plot.crop then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Plot " .. plotId .. " already has " .. (plot.cropName or "a crop") .. " growing!",
			rarity = "common",
		})
		return
	end

	-- Can't plant in contaminated soil
	if plot.contaminants and cropId ~= "phytoremediation" then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Soil is contaminated! Apply Slag Bio-Enhancer first, or plant Phytoremediation.",
			rarity = "common",
		})
		return
	end

	-- Find crop data
	local crop = nil
	for _, c in ipairs(FertilizerTrack.Crops) do
		if c.id == cropId then crop = c break end
	end
	if not crop then return end

	-- Planting cost (seeds)
	local seedCost = 30
	local success = PlayerDataBridge.SpendMolCoins(userId, seedCost)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = crop.name .. " seeds cost " .. seedCost .. " MolCoins.",
			rarity = "common",
		})
		return
	end

	plot.crop = cropId
	plot.cropName = crop.name
	plot.growthProgress = 0
	plot.growthStartTime = tick()
	plot.totalGrowthDays = crop.growthDays
	plot.growthDays = 0
	plot.ready = false

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Planted " .. crop.name .. " in Plot " .. plotId .. "! Growth: " .. crop.growthDays .. " days.",
		rarity = "uncommon",
	})

	sendFarmUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- HARVEST CROP
-- ═══════════════════════════════════════════════

Remotes.RequestHarvestCrop.OnServerEvent:Connect(function(player, plotId)
	local userId = player.UserId
	local farm = getPlayerFarm(userId)

	if type(plotId) ~= "number" then return end
	local plot = farm.plots[plotId]
	if not plot or not plot.crop then return end

	if not plot.ready then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Crop not ready yet! " .. math.floor(plot.growthProgress) .. "% grown.",
			rarity = "common",
		})
		return
	end

	-- Calculate yield
	local yieldPct, cropName = FertilizerTrack.CalculateYield(plot.nutrients, plot.crop)

	-- Find crop reward
	local crop = nil
	for _, c in ipairs(FertilizerTrack.Crops) do
		if c.id == plot.crop then crop = c break end
	end
	if not crop then return end

	local coins = math.floor(crop.rewardCoins * yieldPct / 100)
	coins = math.max(coins, 10)  -- minimum 10 coins

	-- Award coins
	PlayerDataBridge.AddMolCoins(userId, coins)

	-- Track progress
	farm.totalHarvests = farm.totalHarvests + 1
	farm.totalYield = farm.totalYield + yieldPct
	if not farm.questProgress.cropsGrown then farm.questProgress.cropsGrown = {} end
	farm.questProgress.cropsGrown[plot.crop] = true

	-- Notify
	Remotes.FireClient("CropHarvested", player, {
		plotId = plotId,
		cropName = cropName,
		yield = yieldPct,
		coins = coins,
		quality = yieldPct >= 100 and "Excellent" or yieldPct >= 70 and "Good" or yieldPct >= 40 and "Fair" or "Poor",
	})

	local qualityStr = yieldPct >= 100 and "Excellent" or yieldPct >= 70 and "Good" or yieldPct >= 40 and "Fair" or "Poor"
	Remotes.FireClient("ServerAnnounce", player, {
		message = "Harvested " .. cropName .. "! Yield: " .. yieldPct .. "% (" .. qualityStr .. ") — " .. coins .. " MolCoins",
		rarity = yieldPct >= 100 and "epic" or yieldPct >= 70 and "rare" or "uncommon",
	})

	-- Deplete soil nutrients after harvest
	plot.nutrients.N = math.max(5, plot.nutrients.N - 15)
	plot.nutrients.P = math.max(3, plot.nutrients.P - 10)
	plot.nutrients.K = math.max(5, plot.nutrients.K - 12)

	-- Clear plot
	plot.crop = nil
	plot.cropName = nil
	plot.growthProgress = 0
	plot.ready = false
	plot.fertilized = false
	plot.fertilizerUsed = nil

	sendFarmUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- FARM INFO REQUEST
-- ═══════════════════════════════════════════════

Remotes.RequestFertilizerInfo.OnServerEvent:Connect(function(player)
	sendFarmUpdate(player, player.UserId)
end)

-- ═══════════════════════════════════════════════
-- CROP GROWTH TICK (periodic)
-- ═══════════════════════════════════════════════

task.spawn(function()
	while true do
		for _, player in ipairs(Players:GetPlayers()) do
			local userId = player.UserId
			local farm = playerFarms[userId]
			if farm then
				for _, plot in ipairs(farm.plots) do
					if plot.crop and not plot.ready then
						local elapsed = tick() - plot.growthStartTime
						local totalSeconds = plot.totalGrowthDays * GAME_DAY_SECONDS
						local progress = math.clamp(elapsed / totalSeconds * 100, 0, 100)
						plot.growthProgress = progress
						plot.growthDays = math.floor(elapsed / GAME_DAY_SECONDS)

						if progress >= 100 then
							plot.ready = true
							Remotes.FireClient("ServerAnnounce", player, {
								message = plot.cropName .. " in Plot " .. plot.id .. " is ready to harvest!",
								rarity = "rare",
							})
						end

						Remotes.FireClient("CropGrowthTick", player, {
							plotId = plot.id,
							progress = math.floor(progress),
							daysGrown = plot.growthDays,
							totalDays = plot.totalGrowthDays,
							ready = plot.ready,
						})
					end
				end
			end
		end
		task.wait(GROWTH_CHECK_INTERVAL)
	end
end)

-- ═══════════════════════════════════════════════
-- QUEST PROGRESSION TRACKING
-- Checks story quest completion after each player action
-- ═══════════════════════════════════════════════

local function checkQuestProgress(player, userId)
	local farm = getPlayerFarm(userId)
	local qp = farm.questProgress
	if not qp.completedQuests then qp.completedQuests = {} end

	for _, quest in ipairs(FertilizerTrack.StoryQuests) do
		-- Skip already completed
		if qp.completedQuests[quest.id] then continue end

		-- Check prerequisite
		if quest.requires and not qp.completedQuests[quest.requires] then continue end

		-- Check completion condition
		local completed = false

		if quest.type == "soil_test" and (qp.soilTests or 0) >= (quest.target or 1) then
			completed = true
		elseif quest.type == "craft_fertilizer" and quest.targetFertilizer then
			if qp.craftedTypes and qp.craftedTypes[quest.targetFertilizer] then
				completed = true
			end
		elseif quest.type == "grow_crop" and quest.targetCrop then
			if qp.cropsGrown and qp.cropsGrown[quest.targetCrop] then
				completed = true
			end
		elseif quest.type == "grow_crops" and quest.target then
			local cropCount = 0
			if qp.cropsGrown then
				for _ in pairs(qp.cropsGrown) do cropCount = cropCount + 1 end
			end
			if cropCount >= quest.target then completed = true end
		elseif quest.type == "complete_all" then
			-- Check if all non-final quests are done
			local allDone = true
			for _, q in ipairs(FertilizerTrack.StoryQuests) do
				if not q.isFinal and not qp.completedQuests[q.id] then
					allDone = false
					break
				end
			end
			if allDone then completed = true end
		end

		if completed then
			qp.completedQuests[quest.id] = true

			-- Award reward
			if quest.reward.molCoins then
				PlayerDataBridge.AddMolCoins(userId, quest.reward.molCoins)
			end

			-- Update act
			if quest.act > farm.currentAct then
				farm.currentAct = quest.act
			end

			-- Notify
			Remotes.FireClient("ServerAnnounce", player, {
				message = "QUEST COMPLETE: " .. quest.title .. " — +" .. (quest.reward.molCoins or 0) .. " MolCoins" .. (quest.reward.badge and (" + " .. quest.reward.badge .. " badge") or ""),
				rarity = quest.isFinal and "legendary" or "epic",
			})

			if quest.reward.badge then
				Remotes.FireClient("AchievementUnlocked", player, {
					id = quest.reward.badge,
					name = quest.reward.badge,
					description = "Completed: " .. quest.title,
				})
			end

			-- Global announce for act completions
			if quest.id == "act1_q4" or quest.id == "act2_q3" or quest.isFinal then
				Remotes.FireAllClients("ServerAnnounce", {
					message = player.Name .. " completed " .. (quest.isFinal and "THE ENTIRE FERTILIZER TRACK!" or ("Act " .. quest.act .. " of the Fertilizer Track!")),
					rarity = quest.isFinal and "legendary" or "epic",
				})
			end

			print("[FertilizerSystem]", player.Name, "completed quest:", quest.id, quest.title)
		end
	end

	sendFarmUpdate(player, userId)
end

-- Hook quest checks into existing handlers
-- (Called from soil test, craft, harvest handlers — add to each)
local origSoilTestHandler = Remotes.RequestTestSoil.OnServerEvent
local origCraftHandler = Remotes.RequestCraftFertilizer.OnServerEvent
local origHarvestHandler = Remotes.RequestHarvestCrop.OnServerEvent

-- Wrap with quest check (we just call it periodically instead)
task.spawn(function()
	while true do
		for _, player in ipairs(Players:GetPlayers()) do
			local userId = player.UserId
			if playerFarms[userId] then
				checkQuestProgress(player, userId)
			end
		end
		task.wait(5)  -- check every 5 seconds
	end
end)

-- ═══════════════════════════════════════════════
-- CLEANUP
-- ═══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	-- In production: save farm state to DataStore
	-- For teaser: state is session-only
end)

print("[MOLGANG] FertilizerSystem initialized — 4 plots, " .. #FertilizerTrack.Fertilizers .. " fertilizers, " .. #FertilizerTrack.Crops .. " crops")
