-- DailyStats.lua
-- Shared, deterministic reset/increment helper for daily quests and caps.

local DailyStats = {}

function DailyStats.Today(now)
	return os.date("%Y-%m-%d", now or os.time())
end

function DailyStats.Ensure(data, now)
	data.dailyStats = data.dailyStats or {}
	local stats = data.dailyStats
	local today = DailyStats.Today(now)
	if stats.date ~= today then
		stats.date = today
		stats.atomsCollected = 0
		stats.moleculesBuilt = 0
		stats.molCoinsEarned = 0
	end
	return stats
end

function DailyStats.Increment(data, field, amount, now)
	local stats = DailyStats.Ensure(data, now)
	if type(amount) ~= "number" or amount <= 0 or amount ~= amount then
		return stats[field] or 0
	end
	stats[field] = (stats[field] or 0) + amount
	return stats[field]
end

return DailyStats
