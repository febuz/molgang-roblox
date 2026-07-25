local PlayerPathAnalytics = require("../game/src/ServerScriptService/Core/PlayerPathAnalytics")

local events = {atomsCollected = 2, guisOpened = {"MiningGui"}}
local session = PlayerPathAnalytics.NewSession(100, 10, "100_123", events)
session.firstAction = 104
session.lastAction = 112

assert(PlayerPathAnalytics.AppendSample(session, 10, {x = 1.24, y = 2.76, z = -3.26}, "Nexus"),
	"the first short-session sample should be accepted")
assert(session.path[1].x == 1 and session.path[1].y == 3 and session.path[1].z == -3.5,
	"samples should be rounded to half-stud precision")
assert(not PlayerPathAnalytics.AppendSample(session, 12.9, {x = 9, y = 9, z = 9}, "North"),
	"samples inside the interval should be rejected")
assert(PlayerPathAnalytics.AppendSample(session, 13, {x = 4, y = 5, z = 6}, "North"),
	"a sample at the interval boundary should be accepted")
assert(#session.events.zoneVisits == 2
		and session.events.zoneVisits[1].zone == "Nexus"
		and session.events.zoneVisits[2].zone == "North",
	"path analytics should record each zone transition once")

local payload = PlayerPathAnalytics.BuildPayload(session, 42, "tester", 13)
assert(payload.schemaVersion == 2 and payload.sessionId == "100_123",
	"payload should identify its schema and session")
assert(payload.firstAction == 104 and payload.lastAction == 112,
	"payload should retain the first and last action timestamps")
assert(payload.events.atomsCollected == 2 and payload.events.guisOpened[1] == "MiningGui",
	"payload should retain behavior events")
assert(payload.events.zoneVisits[2].t == 3,
	"zone transition events should retain route-relative time")
payload.events.guisOpened[1] = "changed"
assert(session.events.guisOpened[1] == "MiningGui", "payload events must be copied")

for index = #session.path + 1, PlayerPathAnalytics.MAX_PATH_SAMPLES do
	table.insert(session.path, {t = index, x = 0, y = 0, z = 0, zone = "Nexus"})
end
assert(not PlayerPathAnalytics.AppendSample(session, 16, {x = 1, y = 1, z = 1}, "Nexus"),
	"route storage must enforce its sample cap")

print("Player path analytics tests: 7 passed, 0 failed")
