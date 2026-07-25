--[[
	Analytics.server.lua
	MOLGANG — Lightweight Player Behavior Analytics (#78)

	Tracks key gameplay events for game design insights.
	Stores session summaries to DataStore (not per-event to avoid throttling).
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreProvider = require(ReplicatedStorage.Modules.DataStoreProvider)

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

local analyticsStore = DataStoreProvider.GetOrderedDataStore("Analytics_v1")
local pathStore = DataStoreProvider.GetDataStore("MolGang_PlayerPaths_v1")

-- A route sample is useful for level design, but recording every physics frame
-- is noisy, expensive, and unnecessary. Keep one rounded sample per player
-- every 3 seconds, capped to a 30-minute session.
local PATH_SAMPLE_INTERVAL = 3
local MAX_PATH_SAMPLES = 600

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
			path = {},
			clockStart = os.clock(),
			lastPathSample = 0,
		}
	end
	return playerSessions[userId]
end

local function nearestZone(position)
	local zones = workspace:FindFirstChild("Zones")
	if not zones then return "unknown" end
	local nearestName, nearestDistance = "unknown", math.huge
	for _, zone in ipairs(zones:GetChildren()) do
		if zone:IsA("Model") then
			local distance = (zone:GetPivot().Position - position).Magnitude
			if distance < nearestDistance then
				nearestName, nearestDistance = zone.Name, distance
			end
		end
	end
	return nearestName
end

local function samplePlayerPath(player, now)
	local session = playerSessions[player.UserId]
	if not session or now - session.lastPathSample < PATH_SAMPLE_INTERVAL then return end
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not root then return end
	if #session.path >= MAX_PATH_SAMPLES then return end
	session.lastPathSample = now
	local position = root.Position
	table.insert(session.path, {
		t = math.floor(now - session.clockStart),
		x = math.round(position.X * 2) / 2,
		y = math.round(position.Y * 2) / 2,
		z = math.round(position.Z * 2) / 2,
		zone = nearestZone(position),
	})
end

RunService.Heartbeat:Connect(function()
	local now = os.clock()
	for _, player in ipairs(Players:GetPlayers()) do
		samplePlayerPath(player, now)
	end
end)

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
		pathSamples = #session.path,
		date = os.date("%Y-%m-%d"),
	}

	-- Save compressed session data
	pcall(function()
		local key = "session_" .. userId .. "_" .. os.time()
		analyticsStore:SetAsync(key, duration)
		pathStore:SetAsync("path_" .. userId .. "_" .. session.joinTime, {
			userId = userId,
			playerName = player.Name,
			startedAt = session.joinTime,
			duration = duration,
			samples = session.path,
		})
	end)

	playerSessions[userId] = nil
	print("[Analytics]", player.Name, "session:", duration .. "s,", session.events.atomsCollected,
		"atoms,", #session.path, "path samples")
end)

-- Track player joins
Players.PlayerAdded:Connect(function(player)
	getSession(player.UserId)
end)

print("[MOLGANG] Analytics initialized — tracking session events")
