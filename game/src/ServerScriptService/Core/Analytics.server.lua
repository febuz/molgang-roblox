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
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local PlayerPathAnalytics = require(script.Parent.PlayerPathAnalytics)

local analyticsStore = DataStoreProvider.GetOrderedDataStore("Analytics_v1")
local pathStore = DataStoreProvider.GetDataStore("MolGang_PlayerPaths_v1")
local pathIndexStore = DataStoreProvider.GetDataStore("MolGang_PlayerPathIndex_v1")

-- A route sample is useful for level design, but recording every physics frame
-- is noisy, expensive, and unnecessary. Keep one rounded sample per player
-- every 3 seconds, capped to a 30-minute session.
local SAVE_RETRIES = 3

-- Session data per player
local playerSessions = {}

local function getSession(userId)
	if not playerSessions[userId] then
		local joinTime = os.time()
		local sessionId = tostring(joinTime) .. "_" .. tostring(math.floor(os.clock() * 1000))
		playerSessions[userId] = PlayerPathAnalytics.NewSession(joinTime, os.clock(), sessionId, {
				atomsCollected = 0,
				atomsProduced = 0,
				moleculesBuilt = 0,
				leachesStarted = 0,
				productsSold = 0,
				guisOpened = {},
				questsCompleted = 0,
				questIds = {},
				deaths = 0,
				chatMessages = 0,
				zoneVisits = {},
		})
		playerSessions[userId].analyticsKey = "session_" .. userId .. "_" .. sessionId
		playerSessions[userId].pathKey = "path_" .. userId .. "_" .. sessionId
		playerSessions[userId].pathIndexKey = "player_" .. tostring(userId)
		playerSessions[userId].firstAction = nil
		playerSessions[userId].lastAction = joinTime
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
	if not session then return end
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not root then return end
	local position = root.Position
	PlayerPathAnalytics.AppendSample(session, now, {
		x = position.X,
		y = position.Y,
		z = position.Z,
	}, nearestZone(position))
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

-- Count only the successful server-side collection path. Listening to the
-- request remote would count rejected attempts, spoofed names and Quantum
-- Dots (which share the remote but are not normal atom production).
PlayerDataBridge.OnAtomCollected(function(userId)
	trackEvent(userId, "atomsCollected", 1)
end)

PlayerDataBridge.OnProductionCycle(function(userId, atomsProduced, moleculesProduced)
	trackEvent(userId, "atomsProduced", atomsProduced)
	trackEvent(userId, "moleculesBuilt", moleculesProduced)
end)

PlayerDataBridge.OnQuestCompleted(function(userId, questId)
	trackEvent(userId, "questsCompleted", 1)
	trackEvent(userId, "questIds", questId)
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
	local payload = PlayerPathAnalytics.BuildPayload(session, userId, player.Name, duration)
	local indexEntry = PlayerPathAnalytics.BuildIndexEntry(session, userId, duration)
	local analyticsSaved = session.analyticsSaved == true
	local pathSaved = session.pathSaved == true
	local pathIndexSaved = session.pathIndexSaved == true
	for attempt = 1, SAVE_RETRIES do
		if not analyticsSaved then
			analyticsSaved = pcall(function()
				analyticsStore:SetAsync(session.analyticsKey, duration)
			end)
		end
		if not pathSaved then
			pathSaved = pcall(function()
				pathStore:SetAsync(session.pathKey, payload)
			end)
		end
		if not pathIndexSaved then
			pathIndexSaved = pcall(function()
				pathIndexStore:UpdateAsync(session.pathIndexKey, function(previous)
					local entries = type(previous) == "table" and previous or {}
					local nextEntries = {indexEntry}
					for _, entry in ipairs(entries) do
						if type(entry) == "table" and entry.sessionId ~= indexEntry.sessionId then
							table.insert(nextEntries, entry)
						end
						if #nextEntries >= 100 then break end
					end
					return nextEntries
				end)
			end)
		end
		if analyticsSaved and pathSaved and pathIndexSaved then break end
		if attempt < SAVE_RETRIES then task.wait(attempt) end
	end

	session.saving = false
	session.analyticsSaved = analyticsSaved
	session.pathSaved = pathSaved
	session.pathIndexSaved = pathIndexSaved
	session.saved = analyticsSaved and pathSaved and pathIndexSaved
	if not session.saved then
		warn("[Analytics] Could not persist session after retries for " .. player.Name)
	end
	return session.saved
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
