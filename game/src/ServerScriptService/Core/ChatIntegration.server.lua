--[[
	ChatIntegration.server.lua
	MOLGANG — Chat System Integration (#73)

	Broadcasts game events to Roblox chat.
	Uses TextChatService for modern chat integration.
]]

local Players = game:GetService("Players")
local TextChatService = game:GetService("TextChatService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- System message channel
local systemChannel = nil

task.delay(2, function()
	-- Try to find or create system channel
	local channels = TextChatService:FindFirstChild("TextChannels")
	if channels then
		systemChannel = channels:FindFirstChild("RBXSystem")
	end
end)

-- Broadcast a system message to all players via chat
local function broadcastChat(message)
	if systemChannel and systemChannel.DisplaySystemMessage then
		pcall(function()
			systemChannel:DisplaySystemMessage(message)
		end)
	end
end

-- Listen for major game events and broadcast
Remotes.ServerAnnounce.Event:Connect(function(player, data)
	if data and data.rarity then
		-- Only broadcast epic/legendary events to chat
		if data.rarity == "epic" or data.rarity == "legendary" then
			local chatMsg = "[MOLGANG] " .. (data.message or "")
			broadcastChat(chatMsg)
		end
	end
end)

-- Player joins
Players.PlayerAdded:Connect(function(player)
	task.delay(3, function()
		broadcastChat("[MOLGANG] " .. player.Name .. " joined Moleculia! Welcome, chemical engineer!")
	end)
end)

-- Player leaves
Players.PlayerRemoving:Connect(function(player)
	broadcastChat("[MOLGANG] " .. player.Name .. " left Moleculia.")
end)

print("[MOLGANG] ChatIntegration initialized — game events broadcast to chat")
