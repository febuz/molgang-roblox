local GameClock = require("../game/src/ReplicatedStorage/Modules/GameClock")

assert(GameClock.DAY_SECONDS == 600, "all systems must use the ten-minute OTAP day")
assert(GameClock.DayAt(0, 0) == 1, "the clock starts at day one")
assert(GameClock.DayAt(599, 0) == 1, "day one lasts the full interval")
assert(GameClock.DayAt(600, 0) == 2, "the next day starts at the shared boundary")
assert(GameClock.DayAt(1200, 0) == 3, "clock advances deterministically")

print("Game Clock Tests: 5 passed, 0 failed")
