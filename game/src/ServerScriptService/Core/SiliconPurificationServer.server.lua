--[[
	SiliconPurificationServer.server.lua
	MOLGANG — Si-28 Isotope Purification Server

	Server-authoritative handler for the 7-stage silicon purification pipeline.
	Players progress from raw SiO2 (from slag) to 9N pure Si-28 wafers.
	Endgame: build a quantum computer from Si-28 + V2O5.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local SiliconPurification = require(ReplicatedStorage.Modules.SiliconPurification)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- Player silicon progress
local playerSilicon = {} -- {userId = {products = {}, activeStage = nil, completedStages = {}}}

local function getSiliconData(userId)
	if not playerSilicon[userId] then
		playerSilicon[userId] = {
			products = {},         -- {productId = quantity}
			activeStage = nil,     -- currently processing stage
			completedStages = {},  -- {stageId = true}
			startTime = nil,
		}
	end
	return playerSilicon[userId]
end

-- ═══════════════════════════════════════════════
-- START PURIFICATION STAGE
-- ═══════════════════════════════════════════════

Remotes.RequestStartSiliconStage.OnServerEvent:Connect(function(player, stageId)
	local userId = player.UserId
	local data = getSiliconData(userId)

	if data.activeStage then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Already processing a silicon stage! Wait for completion.",
			rarity = "common",
		})
		return
	end

	local stage = SiliconPurification.GetStage(stageId)
	if not stage then return end

	-- Check input product
	if stage.inputProduct ~= "SiO2" then -- SiO2 comes from slag, no check needed for first stage
		if (data.products[stage.inputProduct] or 0) < 1 then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Need " .. stage.inputProduct .. " to start this stage. Complete the previous stage first.",
				rarity = "common",
			})
			return
		end
	end

	-- Pay costs
	local totalCost = (stage.reagentCost or 0) + (stage.energyCost or 0)
	if totalCost > 0 then
		local ok = PlayerDataBridge.SpendMolCoins(userId, totalCost)
		if not ok then
			Remotes.FireClient("ServerAnnounce", player, {
				message = stage.name .. " costs " .. totalCost .. " MC (reagent + energy).",
				rarity = "common",
			})
			return
		end
	end

	-- Consume input
	if stage.inputProduct ~= "SiO2" then
		data.products[stage.inputProduct] = (data.products[stage.inputProduct] or 0) - 1
	end

	-- Start processing
	data.activeStage = stageId
	data.startTime = tick()

	local purityLevel = SiliconPurification.GetPurityLevel(stage.outputPurity)

	Remotes.FireClient("SiliconStageStarted", player, {
		stageId = stageId,
		stageName = stage.name,
		duration = stage.duration,
		outputPurity = stage.outputPurity,
		purityName = purityLevel.name,
		chemistry = stage.chemistry,
	})

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Si-28 PURIFICATION: " .. stage.name .. " started! " .. stage.chemistry,
		rarity = "epic",
	})

	-- Timer for completion, shortened by an active "production" drink buff
	-- (Brown Sugar Pearl, +40% by default — a speed multiplier, so duration
	-- divides by it, same convention as the "speed" buff on WalkSpeed).
	local productionMultiplier = 1.0
	if _G.GetPlayerBuff then
		productionMultiplier = _G.GetPlayerBuff(userId, "production")
	end
	local realSeconds = (stage.duration / 120) / productionMultiplier -- 1 game minute = 0.5 real seconds for testing
	task.delay(realSeconds, function()
		local d = playerSilicon[userId]
		if d and d.activeStage == stageId then
			-- Complete!
			d.products[stage.outputProduct] = (d.products[stage.outputProduct] or 0) + 1
			d.completedStages[stageId] = true
			d.activeStage = nil
			d.startTime = nil

			-- Reward
			if stage.mcReward then
				PlayerDataBridge.AddEarnedMolCoins(userId, stage.mcReward)
			end

			Remotes.FireClient("SiliconStageComplete", player, {
				stageId = stageId,
				outputProduct = stage.outputProduct,
				outputPurity = stage.outputPurity,
				reward = stage.mcReward,
			})

			local pLevel = SiliconPurification.GetPurityLevel(stage.outputPurity)
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Si-28 STAGE COMPLETE: " .. pLevel.name .. " achieved! (" .. stage.outputPurity .. "N purity) +" .. (stage.mcReward or 0) .. " MC",
				rarity = stage.outputPurity >= 7 and "legendary" or "epic",
			})

			-- Check if quantum computer can be built
			if stage.outputProduct == "Si28_Wafer_9N" then
				Remotes.FireAllClients("ServerAnnounce", {
					message = player.Name .. " produced a 9N Si-28 QUANTUM WAFER! Quantum computer within reach!",
					rarity = "legendary",
				})
			end
		end
	end)

	print("[Si-28]", player.Name, "started:", stage.name, "purity target:", stage.outputPurity .. "N")
end)

-- ═══════════════════════════════════════════════
-- BUILD QUANTUM COMPUTER (ENDGAME)
-- ═══════════════════════════════════════════════

Remotes.RequestBuildQuantumComputer.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local data = getSiliconData(userId)
	local pData = PlayerDataBridge.GetPlayerData(userId)

	-- Check requirements
	local wafers = data.products["Si28_Wafer_9N"] or 0
	if wafers < 4 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Need 4× Si-28 wafers (9N). You have " .. wafers .. ".",
			rarity = "common",
		})
		return
	end

	-- Consume wafers
	data.products["Si28_Wafer_9N"] = data.products["Si28_Wafer_9N"] - 4

	-- Award
	local qc = SiliconPurification.QuantumComputer
	PlayerDataBridge.AddEarnedMolCoins(userId, qc.reward.molCoins)

	Remotes.FireClient("ServerAnnounce", player, {
		message = "QUANTUM COMPUTER BUILT! You are now a Quantum Pioneer! +" .. qc.reward.molCoins .. " MC!",
		rarity = "legendary",
	})

	Remotes.FireAllClients("ServerAnnounce", {
		message = player.Name .. " BUILT A QUANTUM COMPUTER from steel slag! From waste to quantum supremacy!",
		rarity = "legendary",
	})

	Remotes.FireClient("AchievementUnlocked", player, {
		id = "quantum_pioneer",
		name = qc.reward.badge,
		description = "Built a quantum computer from Si-28 purified from steel slag",
	})

	print("[Si-28] !!!", player.Name, "BUILT A QUANTUM COMPUTER !!!")
end)

-- ═══════════════════════════════════════════════
-- GET SILICON STATUS
-- ═══════════════════════════════════════════════

Remotes.RequestSiliconStatus.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local data = getSiliconData(userId)

	Remotes.FireClient("SiliconStatusResponse", player, {
		products = data.products,
		activeStage = data.activeStage,
		completedStages = data.completedStages,
		progress = data.startTime and (tick() - data.startTime) or 0,
	})
end)

-- Cleanup
Players.PlayerRemoving:Connect(function(player)
	playerSilicon[player.UserId] = nil
end)

print("[MOLGANG] SiliconPurification initialized — 7-stage Si-28 pipeline, quantum computer endgame")
