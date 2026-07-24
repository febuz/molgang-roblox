local PlayerDataBridge = require("../game/src/ServerScriptService/Core/PlayerDataBridge")

PlayerDataBridge.RecordAtomCollect(42, 1, "H", 2)
PlayerDataBridge.RecordAtomCollect(42, 8, "O", 2)
local first = PlayerDataBridge.GetPendingCollect(42)
local second = PlayerDataBridge.GetPendingCollect(42)
assert(first and first.symbol == "H", "pending atom collections must preserve FIFO order")
assert(second and second.symbol == "O", "queued atom collections must not overwrite each other")
assert(PlayerDataBridge.GetPendingCollect(42) == nil, "empty collection queue must return nil")

local economy = {molCoins = 10, totalMolCoinsEarned = 4}
PlayerDataBridge.SetEconomyData(43, economy)
local ok, balance = PlayerDataBridge.AddEarnedMolCoins(43, 25)
assert(ok and balance == 35, "earned MolCoins should update the live balance")
assert(economy.totalMolCoinsEarned == 29, "earned MolCoins should update lifetime earnings")
assert(not PlayerDataBridge.AddEarnedMolCoins(43, -1), "negative earnings must be rejected")
assert(PlayerDataBridge.SpendMolCoins(43, 5), "valid spending should reduce the live balance")
assert(economy.molCoins == 30, "spending should reduce MolCoins exactly once")
assert(not PlayerDataBridge.SpendMolCoins(43, -1), "negative spending must be rejected")
assert(not PlayerDataBridge.SpendMolCoins(43, math.huge), "infinite spending must be rejected")

print("PlayerDataBridge Tests: 9 passed, 0 failed")
