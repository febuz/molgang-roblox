--[[
	Analytics.server.lua
	MOLGANG — Lightweight Player Behavior Analytics (#78)

	Tracks key gameplay events for game design insights.
	Stores session summaries to DataStore (not per-event to avoid throttling).
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreProvider = require(ReplicatedStorage.Modules.DataStoreProvider)

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

local analyticsStore = DataStoreProvider.GetOrderedDataStore("Analytics_v1")

-- Session data per player
local playerSessions = {}

local function getSession(userId)
	if not playerSessions[userId] then
		playerSessions[userId] = {
			joinTime = os.time(),
			events = {
				atomsCollected = 0,
				moleculesBuilt = 0,
				leachesStarted = 0,
				productsSold = 0,
				guisOpened = {},
				questsCompleted = 0,
				deaths = 0,
				chatMessages = 0,
			},
			firstAction = nil,
			lastAction = os.time(),
		}
	end
	return playerSessions[userId]
end

local function trackEvent(userId, eventName, value)
	local session = getSession(userId)
	session.lastAction = os.time()
	if not session.firstAction then
		session.firstAction = os.time()
	end

	if type(session.events[eventName]) == "number" then
		session.events[eventName] = session.events[eventName] + (value or 1)
	elseif type(session.events[eventName]) == "table" then
		table.insert(session.events[eventName], value or "unknown")
	end
end

-- Track collection requests on the client→server contract. AtomCollected is
-- deliberately server→client and therefore has no server-side Event signal.
Remotes.RequestAtomCollect.OnServerEvent:Connect(function(player, atomName)
	trackEvent(player.UserId, "atomsCollected", 1)
end)

-- Track when player leaves — save session summary
Players.PlayerRemoving:Connect(function(player)
	local userId = player.UserId
	local session = playerSessions[userId]
	if not session then return end

	local duration = os.time() - session.joinTime
	local summary = {
		duration = duration,
		events = session.events,
		date = os.date("%Y-%m-%d"),
	}

	-- Save compressed session data
	pcall(function()
		local key = "session_" .. userId .. "_" .. os.time()
		analyticsStore:SetAsync(key, duration)
	end)

	playerSessions[userId] = nil
	print("[Analytics]", player.Name, "session:", duration .. "s,", session.events.atomsCollected, "atoms")
end)

-- Track player joins
Players.PlayerAdded:Connect(function(player)
	getSession(player.UserId)
end)

print("[MOLGANG] Analytics initialized — tracking session events")
