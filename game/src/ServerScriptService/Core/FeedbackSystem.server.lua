--[[
	FeedbackSystem.server.lua
	MOLGANG — In-Game Feedback Collection System

	Collects and stores player feedback for game improvement:
	- Bug reports (with screenshot context)
	- Feature requests
	- Gameplay ratings (1-5 stars per system)
	- Session analytics (time played, systems used)
	- Free-text comments

	Feedback stored in DataStore for retrieval by developers.
	Also tracks automatic gameplay metrics per session.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreProvider = require(ReplicatedStorage.Modules.DataStoreProvider)
local Players = game:GetService("Players")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ═══════════════════════════════════════════════
-- CONFIGURATION
-- ═══════════════════════════════════════════════

local FEEDBACK_STORE_NAME = "MolGang_Feedback_v1"
local SESSION_STORE_NAME = "MolGang_Sessions_v1"
local MAX_FEEDBACK_PER_PLAYER = 10  -- per session
local METRIC_INTERVAL = 60          -- seconds between metric snapshots

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

local feedbackStore = DataStoreProvider.GetDataStore(FEEDBACK_STORE_NAME)
local sessionStore = DataStoreProvider.GetDataStore(SESSION_STORE_NAME)

local playerSessions = {}    -- {userId = sessionData}
local playerFeedbackCount = {} -- {userId = count}

-- ═══════════════════════════════════════════════
-- SESSION TRACKING (automatic metrics)
-- ═══════════════════════════════════════════════

local function startSession(player)
	local userId = player.UserId
	playerSessions[userId] = {
		playerId = userId,
		playerName = player.Name,
		joinTime = os.time(),
		leaveTime = nil,
		duration = 0,

		-- System usage tracking
		systemsOpened = {},     -- {guiName = openCount}
		atomsCollected = 0,
		moleculesBuilt = 0,
		molCoinsEarned = 0,
		molCoinsSpent = 0,
		slagProcessed = 0,
		fertilizersUsed = 0,
		miningPlotsExplored = 0,
		productsSold = 0,
		equipmentPlaced = 0,
		researchCompleted = 0,
		questsCompleted = 0,
		mahjongGamesPlayed = 0,
		bubbleTeaDrinks = 0,
		weatherEventsExperienced = 0,
		vrModeUsed = false,

		-- Progression snapshot
		finalMolCoins = 0,
		finalAtomCount = 0,
		finalElementCount = 0,

		-- Performance
		averageFPS = 0,
		peakMemoryMB = 0,

		-- Feedback submitted
		feedbackEntries = {},
	}

	playerFeedbackCount[userId] = 0
end

local function endSession(player)
	local userId = player.UserId
	local session = playerSessions[userId]
	if not session then return end

	session.leaveTime = os.time()
	session.duration = session.leaveTime - session.joinTime

	-- Save session to DataStore
	local success, err = pcall(function()
		local key = "session_" .. userId .. "_" .. session.joinTime
		sessionStore:SetAsync(key, session)
	end)

	if not success then
		warn("[FeedbackSystem] Failed to save session:", err)
	end

	print("[FeedbackSystem]", player.Name, "session:", session.duration, "sec",
		"| Atoms:", session.atomsCollected,
		"| MolCoins:", session.molCoinsEarned)
end

-- ═══════════════════════════════════════════════
-- FEEDBACK SUBMISSION
-- ═══════════════════════════════════════════════

Remotes.RequestSubmitFeedback.OnServerEvent:Connect(function(player, feedbackData)
	local userId = player.UserId

	-- Rate limit
	if (playerFeedbackCount[userId] or 0) >= MAX_FEEDBACK_PER_PLAYER then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Maximum feedback submissions reached for this session. Thank you!",
			rarity = "common",
		})
		return
	end

	-- Validate input
	if type(feedbackData) ~= "table" then return end

	local entry = {
		playerId = userId,
		playerName = player.Name,
		timestamp = os.time(),
		type = feedbackData.type or "general",       -- bug, feature, rating, comment
		system = feedbackData.system or "general",    -- which game system
		rating = type(feedbackData.rating) == "number" and math.clamp(feedbackData.rating, 1, 5) or nil,
		message = type(feedbackData.message) == "string" and feedbackData.message:sub(1, 500) or "",
		severity = feedbackData.severity or "normal", -- low, normal, high, critical
	}

	-- Store in session
	local session = playerSessions[userId]
	if session then
		table.insert(session.feedbackEntries, entry)
	end

	-- Store in DataStore
	local success, err = pcall(function()
		local key = "feedback_" .. userId .. "_" .. os.time() .. "_" .. math.random(1000)
		feedbackStore:SetAsync(key, entry)
	end)

	playerFeedbackCount[userId] = (playerFeedbackCount[userId] or 0) + 1

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Feedback submitted! Thank you for helping improve MOLGANG.",
		rarity = "uncommon",
	})

	Remotes.FireClient("FeedbackSubmitted", player, {
		success = success,
		count = playerFeedbackCount[userId],
		max = MAX_FEEDBACK_PER_PLAYER,
	})

	print("[FeedbackSystem] Feedback from", player.Name, "type:", entry.type, "system:", entry.system)
end)

-- ═══════════════════════════════════════════════
-- SYSTEM USAGE TRACKING
-- Track which GUIs are opened via Attribute changes
-- ═══════════════════════════════════════════════

local function trackSystemUsage(player, systemName)
	local session = playerSessions[player.UserId]
	if session then
		session.systemsOpened[systemName] = (session.systemsOpened[systemName] or 0) + 1
	end
end

-- Listen for atom collections
local atomEvent = ReplicatedStorage.Remotes:FindFirstChild("AtomCollected")
if atomEvent then
	atomEvent.OnServerEvent = nil -- this is a server→client event, track differently
end

-- Track via global function hooks
_G.TrackFeedbackMetric = function(userId, metric, value)
	local session = playerSessions[userId]
	if session and session[metric] then
		if type(value) == "number" then
			session[metric] = session[metric] + value
		elseif type(value) == "boolean" then
			session[metric] = value
		end
	end
end

-- ═══════════════════════════════════════════════
-- RATING REQUEST (periodic)
-- Ask player to rate experience after 10 minutes
-- ═══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(600)  -- every 10 minutes
		for _, player in ipairs(Players:GetPlayers()) do
			local session = playerSessions[player.UserId]
			if session and (os.time() - session.joinTime) >= 600 then
				-- Only ask once per 10 minutes
				local lastAsk = session._lastRatingAsk or 0
				if os.time() - lastAsk >= 600 then
					session._lastRatingAsk = os.time()
					Remotes.FireClient("RequestRating", player, {
						systems = {"Overall", "Slag Processing", "Fertilizer Lab", "Factory Builder", "Mining", "Mahjong"},
					})
				end
			end
		end
	end
end)

-- ═══════════════════════════════════════════════
-- PLAYER LIFECYCLE
-- ═══════════════════════════════════════════════

Players.PlayerAdded:Connect(startSession)
Players.PlayerRemoving:Connect(endSession)

-- Handle players already in game
for _, player in ipairs(Players:GetPlayers()) do
	startSession(player)
end

print("[MOLGANG] FeedbackSystem initialized — tracking sessions + collecting feedback")
