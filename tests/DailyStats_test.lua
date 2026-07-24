local DailyStats = require("../game/src/ReplicatedStorage/Modules/DailyStats")
local Quests = require("../game/src/ReplicatedStorage/Modules/Quests")

local data = {
	dailyStats = {date = "2000-01-01", atomsCollected = 99, moleculesBuilt = 99, molCoinsEarned = 99, molCoinsRewards = 99},
	totalAtomsCollected = 99,
	totalMoleculesBuilt = 99,
	totalMolCoinsEarned = 99,
}
local stats = DailyStats.Ensure(data, os.time())
assert(stats.date == DailyStats.Today(), "daily stats must roll to today")
	assert(stats.atomsCollected == 0 and stats.moleculesBuilt == 0 and stats.molCoinsEarned == 0 and stats.molCoinsRewards == 0,
	"a new day must reset daily counters")
DailyStats.Increment(data, "atomsCollected", 3)
DailyStats.Increment(data, "moleculesBuilt", 2)
DailyStats.Increment(data, "molCoinsEarned", 40)
assert(data.dailyStats.atomsCollected == 3 and data.dailyStats.moleculesBuilt == 2 and data.dailyStats.molCoinsEarned == 40,
	"daily increments must be isolated from lifetime totals")

local daily = {condition = {type = "atomsCollected", target = 5, daily = true}}
assert(Quests.CheckProgress(data, daily) == 3, "daily quest progress must use today's counter")
data.dailyStats.date = "2000-01-01"
assert(Quests.CheckProgress(data, daily) == 0, "stale daily counters must not satisfy today's quest")

print("Daily Stats Tests: 6 passed, 0 failed")
