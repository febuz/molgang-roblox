-- Pure session/path helpers used by Analytics.server.lua.
-- Sampling and payload construction stay testable without booting Studio.

local PlayerPathAnalytics = {}

PlayerPathAnalytics.PATH_SAMPLE_INTERVAL = 3
PlayerPathAnalytics.MAX_PATH_SAMPLES = 600

local function clone(value)
	if type(value) ~= "table" then return value end
	local result = {}
	for key, child in pairs(value) do result[key] = clone(child) end
	return result
end

function PlayerPathAnalytics.NewSession(joinTime, clockStart, sessionId, events)
	return {
		joinTime = joinTime,
		clockStart = clockStart,
		sessionId = sessionId,
		events = events or {},
		path = {},
		lastPathSample = -PlayerPathAnalytics.PATH_SAMPLE_INTERVAL,
		saving = false,
		saved = false,
		analyticsSaved = false,
		pathSaved = false,
	}
end

function PlayerPathAnalytics.AppendSample(session, now, position, zone)
	if type(session) ~= "table" or type(position) ~= "table" then return false end
	if type(now) ~= "number" or now - session.lastPathSample < PlayerPathAnalytics.PATH_SAMPLE_INTERVAL then
		return false
	end
	if #session.path >= PlayerPathAnalytics.MAX_PATH_SAMPLES then return false end
	if type(position.x) ~= "number" or type(position.y) ~= "number"
		or type(position.z) ~= "number" then return false end
	local function halfStud(value)
		return math.floor(value * 2 + 0.5) / 2
	end
	session.lastPathSample = now
	table.insert(session.path, {
		t = math.floor(now - session.clockStart),
		x = halfStud(position.x),
		y = halfStud(position.y),
		z = halfStud(position.z),
		zone = type(zone) == "string" and zone or "unknown",
	})
	return true
end

function PlayerPathAnalytics.BuildPayload(session, userId, playerName, duration)
	return {
		schemaVersion = 2,
		sessionId = session.sessionId,
		userId = userId,
		playerName = playerName,
		startedAt = session.joinTime,
		duration = duration,
		events = clone(session.events),
		samples = clone(session.path),
	}
end

return PlayerPathAnalytics
