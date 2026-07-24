--[[
	QuestSystem.server.lua
	MOLGANG — server-authoritative general quest acceptance and rewards.

	The client only requests an offer. Active quests, completion checks and
	rewards are persisted in the canonical player data table.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Quests = require(ReplicatedStorage.Modules.Quests)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

local function getQuestProgress(userId)
	local data = PlayerDataBridge.GetPlayerData(userId)
	if not data then return nil end
	data.questProgress = data.questProgress or Quests.CreateQuestProgress()
	local progress = data.questProgress
	progress.active = progress.active or {}
	progress.completed = progress.completed or {}
	progress.inProgress = progress.inProgress or {}
	progress.lastDaily = progress.lastDaily or {}
	return data, progress
end

local function sendState(player, progress)
	Remotes.FireClient("QuestState", player, {questProgress = progress})
end

local function completeReadyQuests(player, data, progress)
	local changed = false
	for questId in pairs(progress.active) do
		local quest = Quests.GetQuest(questId)
		if quest and Quests.IsQuestComplete(data, quest) then
			Quests.CompleteQuest(progress, questId)
			local reward = quest.reward or {}
			if reward.molCoins and reward.molCoins > 0 then
				PlayerDataBridge.AddEarnedMolCoins(player.UserId, reward.molCoins)
			end
			if reward.badge then
				data.badges = data.badges or {}
				data.badges[reward.badge] = true
			end
			Remotes.FireClient("QuestCompleted", player, {
				questId = questId,
				reward = reward,
			})
			changed = true
		end
	end
	return changed
end

Remotes.RequestQuestInfo.OnServerEvent:Connect(function(player)
	local data, progress = getQuestProgress(player.UserId)
	if not data then return end
	completeReadyQuests(player, data, progress)
	sendState(player, progress)
end)

Remotes.RequestAcceptQuest.OnServerEvent:Connect(function(player, questId)
	if type(questId) ~= "string" then return end
	local data, progress = getQuestProgress(player.UserId)
	if not data then return end
	local allowed, reason = Quests.CanAccept(progress, questId)
	if not allowed then
		Remotes.FireClient("QuestFailed", player, {reason = reason})
		return
	end
	Quests.AcceptQuest(progress, questId)
	sendState(player, progress)
	completeReadyQuests(player, data, progress)
end)

task.spawn(function()
	while true do
		task.wait(2)
		for _, player in ipairs(Players:GetPlayers()) do
			local data, progress = getQuestProgress(player.UserId)
			if data and completeReadyQuests(player, data, progress) then
				sendState(player, progress)
			end
		end
	end
end)
