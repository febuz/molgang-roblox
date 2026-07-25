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
local SAVE_RETRIES = 3

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
			-- Capture the spawn position on the first heartbeat. Short OTAP
			-- sessions must still produce a useful route record.
			lastPathSample = -PATH_SAMPLE_INTERVAL,
			saving = false,
			saved = false,
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
Remotes.RequestAtomCollect.OnServerEvent:Connect(function(player, _atomName)
	trackEvent(player.UserId, "atomsCollected", 1)
end)

local function persistSession(player, session)
	if not session or session.saved then return true end
	if session.saving then
		local deadline = os.clock() + 8
		while session.saving and os.clock() < deadline do task.wait() end
		return session.saved
	end

	session.saving = true
	local userId = player.UserId
	local duration = os.time() - session.joinTime
	local analyticsKey = "session_" .. userId .. "_" .. os.time()
	local pathKey = "path_" .. userId .. "_" .. session.joinTime
	local payload = {
		userId = userId,
		playerName = player.Name,
		startedAt = session.joinTime,
		duration = duration,
		samples = session.path,
	}

	local saved = false
	for attempt = 1, SAVE_RETRIES do
		local analyticsOk = pcall(function()
			analyticsStore:SetAsync(analyticsKey, duration)
		end)
		local pathOk = pcall(function()
			pathStore:SetAsync(pathKey, payload)
		end)
		if analyticsOk and pathOk then
			saved = true
			break
		end
		if attempt < SAVE_RETRIES then task.wait(attempt) end
	end

	session.saving = false
	session.saved = saved
	if not saved then
		warn("[Analytics] Could not persist session after retries for " .. player.Name)
	end
	return saved
end

local function finishSession(player)
	local session = playerSessions[player.UserId]
	if not session then return end
	local duration = os.time() - session.joinTime
	local saved = persistSession(player, session)
	if saved then playerSessions[player.UserId] = nil end
	print("[Analytics]", player.Name, "session:", duration .. "s,", session.events.atomsCollected,
		"atoms,", #session.path, "path samples, saved=" .. tostring(saved))
end

-- Track when player leaves — save session summary.
Players.PlayerRemoving:Connect(finishSession)

-- Roblox can close a server before PlayerRemoving has run for every player.
-- Flush all active sessions so route analytics survives Studio stop and deploys.
game:BindToClose(function()
	for _, player in ipairs(Players:GetPlayers()) do
		finishSession(player)
	end
end)

-- Track player joins
Players.PlayerAdded:Connect(function(player)
	getSession(player.UserId)
end)

-- Server scripts can be required after players already exist (notably in
-- Studio/OTAP); do not lose those sessions or their initial path sample.
for _, player in ipairs(Players:GetPlayers()) do
	getSession(player.UserId)
end

print("[MOLGANG] Analytics initialized — tracking session events")
