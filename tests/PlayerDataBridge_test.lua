local PlayerDataBridge = require("../game/src/ServerScriptService/Core/PlayerDataBridge")

PlayerDataBridge.RecordAtomCollect(42, 1, "H", 2)
PlayerDataBridge.RecordAtomCollect(42, 8, "O", 2)
local first = PlayerDataBridge.GetPendingCollect(42)
local second = PlayerDataBridge.GetPendingCollect(42)
assert(first and first.symbol == "H", "pending atom collections must preserve FIFO order")
assert(second and second.symbol == "O", "queued atom collections must not overwrite each other")
assert(PlayerDataBridge.GetPendingCollect(42) == nil, "empty collection queue must return nil")

local economy = {molCoins = 10, totalMolCoinsEarned = 4, totalMolCoinsSpent = 0}
PlayerDataBridge.SetEconomyData(43, economy)
local ok, balance = PlayerDataBridge.AddEarnedMolCoins(43, 25)
assert(ok and balance == 35, "earned MolCoins should update the live balance")
assert(economy.totalMolCoinsEarned == 29, "earned MolCoins should update lifetime earnings")
assert(not PlayerDataBridge.AddEarnedMolCoins(43, -1), "negative earnings must be rejected")
assert(PlayerDataBridge.AddMolCoins(43, 10), "balance transfers should be accepted")
assert(economy.totalMolCoinsEarned == 29, "balance transfers must not count as earned income")
assert(PlayerDataBridge.SpendMolCoins(43, 5), "valid spending should reduce the live balance")
assert(economy.molCoins == 40, "spending should reduce MolCoins exactly once")
assert(economy.totalMolCoinsSpent == 5, "spending should update lifetime expenses")
assert(not PlayerDataBridge.SpendMolCoins(43, -1), "negative spending must be rejected")
assert(not PlayerDataBridge.SpendMolCoins(43, math.huge), "infinite spending must be rejected")

assert(PlayerDataBridge.AddMolCoins(44, 7), "offline balance adjustments should be queued")
local reloaded = {molCoins = 3}
PlayerDataBridge.SetEconomyData(44, reloaded)
assert(reloaded.molCoins == 10, "queued balance adjustments should apply on load")

print("PlayerDataBridge Tests: 14 passed, 0 failed")
