local SpawnSafety = require("../game/src/ReplicatedStorage/Modules/SpawnSafety")

assert(not SpawnSafety.ShouldRecover(-200, -80, false),
	"void recovery must wait when the world has no safe spawn yet")
assert(SpawnSafety.ShouldRecover(-200, -80, true),
	"fallen player must recover once the safe spawn exists")
assert(not SpawnSafety.ShouldRecover(-20, -80, true),
	"player above the void threshold must not be teleported")
assert(not SpawnSafety.ShouldRecover(math.huge, -80, true),
	"non-finite positions must never trigger recovery")

print("Spawn Safety Tests: 4 passed, 0 failed")
