--[[
	ResearchSystem.server.lua
	MOLGANG — server-authoritative, persistent technology research.

	The client may display the tree, but it never grants an unlock, chooses a
	cost, or advances a timer. The active job is stored in player data so a
	reconnect cannot reset or duplicate research progress.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ResearchTree = require(ReplicatedStorage.Modules.ResearchTree)
local WorldEvents = require(ReplicatedStorage.Modules.WorldEvents)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

local function getResearchData(userId)
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	if not playerData then return nil end

	playerData.research = playerData.research or {}
	if type(playerData.research.unlocked) ~= "table" then
		playerData.research.unlocked = {}
	end
	local active = playerData.research.active
	if active ~= nil then
		local nodeId = type(active) == "table" and active.nodeId or nil
		local completesAt = type(active) == "table" and tonumber(active.completesAt) or nil
		if type(nodeId) ~= "string" or not ResearchTree.GetNode(nodeId)
			or not completesAt or completesAt ~= completesAt
			or completesAt == math.huge or completesAt == -math.huge or completesAt < 0 then
			-- A malformed or removed job must not permanently lock the research tree.
			playerData.research.active = nil
		else
			local startedAt = tonumber(active.startedAt) or os.time()
			if startedAt ~= startedAt or startedAt == math.huge or startedAt == -math.huge then
				startedAt = os.time()
			end
			playerData.research.active = {
				nodeId = nodeId,
				startedAt = math.floor(startedAt),
				completesAt = math.floor(completesAt),
			}
		end
	end

	-- Migrate the free starting technologies into the persisted set.
	for _, node in ipairs(ResearchTree.Nodes) do
		if node.unlocked then
			playerData.research.unlocked[node.id] = true
		end
	end
	return playerData.research
end

local function statePayload(research)
	return {
		unlocked = research.unlocked,
		active = research.active,
	}
end

local function completeIfReady(player, research, now)
	local active = research and research.active
	if not active or type(active.completesAt) ~= "number" or now < active.completesAt then
		return false
	end

	local node = ResearchTree.GetNode(active.nodeId)
	if node then
		research.unlocked[node.id] = true
		research.active = nil
		Remotes.FireClient("ResearchCompleted", player, {
			nodeId = node.id,
			name = node.name,
			unlocked = research.unlocked,
		})
		return true
	end

	-- Do not leave an orphaned job blocking the tree after a content update.
	research.active = nil
	return true
end

Remotes.RequestResearchInfo.OnServerEvent:Connect(function(player)
	local research = getResearchData(player.UserId)
	if not research then return end
	completeIfReady(player, research, os.time())
	Remotes.FireClient("ResearchState", player, statePayload(research))
end)

Remotes.RequestStartResearch.OnServerEvent:Connect(function(player, nodeId)
	if type(nodeId) ~= "string" then return end

	local research = getResearchData(player.UserId)
	if not research then return end
	local now = os.time()
	completeIfReady(player, research, now)

	if research.active then
		Remotes.FireClient("ResearchFailed", player, {reason = "Research is already running."})
		return
	end

	local node = ResearchTree.GetNode(nodeId)
	if not node then
		Remotes.FireClient("ResearchFailed", player, {reason = "Unknown research node."})
		return
	end

	local canResearch, reason = ResearchTree.CanResearch(nodeId, research.unlocked)
	if not canResearch then
		Remotes.FireClient("ResearchFailed", player, {reason = reason})
		return
	end

	local cost = math.max(0, math.floor(tonumber(node.cost) or 0))
	if cost > 0 and not PlayerDataBridge.SpendMolCoins(player.UserId, cost) then
		Remotes.FireClient("ResearchFailed", player, {
			reason = "Insufficient MolCoins: " .. tostring(cost) .. " required.",
		})
		return
	end

	local eventEffects = WorldEvents.GetActiveEffects()
	local researchSpeedMultiplier = math.max(0.01, tonumber(eventEffects.researchSpeedMult) or 1)
	local duration = ResearchTree.CalculateResearchDuration(node.researchTime, researchSpeedMultiplier)
	if duration == 0 then
		research.unlocked[node.id] = true
		Remotes.FireClient("ResearchCompleted", player, {
			nodeId = node.id,
			name = node.name,
			unlocked = research.unlocked,
		})
		return
	end

	research.active = {
		nodeId = node.id,
		startedAt = now,
		completesAt = now + duration,
	}
	Remotes.FireClient("ResearchStarted", player, {
		nodeId = node.id,
		name = node.name,
		startedAt = now,
		completesAt = now + duration,
		duration = duration,
		researchSpeedMultiplier = researchSpeedMultiplier,
		cost = cost,
	})
	Remotes.FireClient("ResearchState", player, statePayload(research))
end)

task.spawn(function()
	while true do
		task.wait(1)
		local now = os.time()
		for _, player in ipairs(Players:GetPlayers()) do
			local research = getResearchData(player.UserId)
			if research and completeIfReady(player, research, now) then
				Remotes.FireClient("ResearchState", player, statePayload(research))
			end
		end
	end
end)
