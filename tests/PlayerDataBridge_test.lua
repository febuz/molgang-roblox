local PlayerDataBridge = require("../game/src/ServerScriptService/Core/PlayerDataBridge")

PlayerDataBridge.RecordAtomCollect(42, 1, "H", 2)
PlayerDataBridge.RecordAtomCollect(42, 8, "O", 2)
local first = PlayerDataBridge.GetPendingCollect(42)
local second = PlayerDataBridge.GetPendingCollect(42)
assert(first and first.symbol == "H", "pending atom collections must preserve FIFO order")
assert(second and second.symbol == "O", "queued atom collections must not overwrite each other")
assert(PlayerDataBridge.GetPendingCollect(42) == nil, "empty collection queue must return nil")

print("PlayerDataBridge Tests: 3 passed, 0 failed")
