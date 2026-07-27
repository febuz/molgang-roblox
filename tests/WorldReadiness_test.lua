local WorldReadiness = require("../game/src/ReplicatedStorage/Modules/WorldReadiness")

assert(not WorldReadiness.CanEnter(false, false), "incomplete world must remain gated")
assert(not WorldReadiness.CanEnter(true, false), "world without a safe spawn must remain gated")
assert(not WorldReadiness.CanEnter(false, true), "safe spawn alone must not bypass world readiness")
assert(WorldReadiness.CanEnter(true, true), "ready world with safe spawn must allow entry")

print("World Readiness Tests: 4 passed, 0 failed")
