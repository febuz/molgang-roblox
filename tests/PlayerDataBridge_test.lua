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

assert(PlayerDataBridge.RecordQuizAnswer(46, false), "quiz result should accept false answers")
assert(PlayerDataBridge.RecordQuizAnswer(46, true), "quiz result should accept true answers")
assert(PlayerDataBridge.ConsumeQuizAnswer(46) == false, "quiz results must preserve FIFO order")
assert(PlayerDataBridge.ConsumeQuizAnswer(46) == true, "quiz results must preserve correctness")
assert(PlayerDataBridge.ConsumeQuizAnswer(46) == nil, "empty quiz result queue must return nil")

local capped = {
	molCoins = 0,
	totalMolCoinsEarned = 0,
	dailyStats = {date = os.date("%Y-%m-%d"), molCoinsEarned = 9000, molCoinsRewards = 1990},
}
PlayerDataBridge.SetEconomyData(45, capped)
local saleOk = PlayerDataBridge.AddEarnedMolCoins(45, 100)
assert(saleOk and capped.dailyStats.molCoinsEarned == 9100 and capped.dailyStats.molCoinsRewards == 1990,
	"market income must not consume reward-cap room")
local rewardOk, _, rewardPaid = PlayerDataBridge.AddRewardMolCoins(45, 50)
assert(rewardOk and rewardPaid == 10, "reward cap should pay only the remaining daily room")
local rewardAgain, _, rewardPaidAgain = PlayerDataBridge.AddRewardMolCoins(45, 1)
assert(not rewardAgain and rewardPaidAgain == 0, "reward cap should reject rewards after exhaustion")

assert(PlayerDataBridge.AddMolCoins(44, 7), "offline balance adjustments should be queued")
local reloaded = {molCoins = 3}
PlayerDataBridge.SetEconomyData(44, reloaded)
assert(reloaded.molCoins == 10, "queued balance adjustments should apply on load")

print("PlayerDataBridge Tests: 23 passed, 0 failed")
