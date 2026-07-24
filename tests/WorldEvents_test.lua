local WorldEvents = require("../game/src/ReplicatedStorage/Modules/WorldEvents")

local heavyRain
local automation
for _, event in ipairs(WorldEvents.Catalog) do
	if event.id == "heavy_rain_season" then heavyRain = event end
	if event.id == "automation_advance" then automation = event end
end
assert(heavyRain and automation, "production-affecting world events must exist")

WorldEvents._active = {
	[heavyRain.id] = {event = heavyRain, startTime = 0, endTime = math.huge},
	[automation.id] = {event = automation, startTime = 0, endTime = math.huge},
}
local effects = WorldEvents.GetActiveEffects()
assert(effects.miningYieldMult == 0.5, "heavy rain must halve mining yield")
assert(effects.productionSpeedMult == 1.15, "automation advance must speed production")

WorldEvents._active = {}
print("World Events Tests: 3 passed, 0 failed")
