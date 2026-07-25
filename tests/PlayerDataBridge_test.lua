local PlayerDataBridge = require("../game/src/ServerScriptService/Core/PlayerDataBridge")

local callbackUser, callbackCount
assert(PlayerDataBridge.OnAtomCollected(function(userId, count)
	callbackUser, callbackCount = userId, count
end), "server atom collection listeners should register")
assert(PlayerDataBridge.RecordAtomCollected(50) == 1,
	"validated atom collection should increment its server-side count")
assert(callbackUser == 50 and callbackCount == 1,
	"validated atom collection should notify analytics consumers")

local productionUser, productionAtoms, productionMolecules
assert(PlayerDataBridge.OnProductionCycle(function(userId, atoms, molecules)
	productionUser, productionAtoms, productionMolecules = userId, atoms, molecules
end), "production listeners should register")
assert(PlayerDataBridge.RecordProduction(51, 12, 3),
	"validated production should notify analytics consumers")
assert(productionUser == 51 and productionAtoms == 12 and productionMolecules == 3,
	"production analytics should receive actual atom and molecule counts")
assert(not PlayerDataBridge.RecordProduction(51, -1, 0),
	"negative production must be rejected")

local questUser, questId
assert(PlayerDataBridge.OnQuestCompleted(function(userId, completedId)
	questUser, questId = userId, completedId
end), "server quest listeners should register")
assert(PlayerDataBridge.RecordQuestCompleted(52, "first_atom"),
	"server quest completion should notify analytics consumers")
assert(questUser == 52 and questId == "first_atom",
	"quest analytics should receive the completed quest id")
assert(not PlayerDataBridge.RecordQuestCompleted(52, ""),
	"empty quest ids must be rejected")

local recoveryUser, recoveryY
assert(PlayerDataBridge.OnFallRecovery(function(userId, yPosition)
	recoveryUser, recoveryY = userId, yPosition
end), "server fall-recovery listeners should register")
assert(PlayerDataBridge.RecordFallRecovery(53, -42),
	"server void recovery should notify analytics consumers")
assert(recoveryUser == 53 and recoveryY == -42,
	"fall analytics should retain the recovery position")
assert(not PlayerDataBridge.RecordFallRecovery(53, "invalid"),
	"invalid fall positions must be rejected")

PlayerDataBridge.RecordAtomCollect(42, 1, "H", 2)
PlayerDataBridge.RecordAtomCollect(42, 8, "O", 2)
assert(PlayerDataBridge.RecordAtomCollectBatch(47, 23, "V", 12, 5),
	"atom production batches should queue as one secure collection")
local batch = PlayerDataBridge.GetPendingCollect(47)
assert(batch and batch.amount == 12 and batch.symbol == "V",
	"atom production batch must preserve amount and symbol")
assert(PlayerDataBridge.RecordAtomCollectMultiBatch(48, {
	{elementZ = 26, symbol = "Fe", amount = 4, coinReward = 2},
	{elementZ = 8, symbol = "O", amount = 6, coinReward = 2},
}), "mixed atom collections should queue as one atomic batch")
assert(PlayerDataBridge.GetPendingAtomAmount(48) == 10,
	"pending mixed collections must reserve every atom before delayed processing")
local mixed = PlayerDataBridge.GetPendingCollect(48)
assert(mixed and mixed.entries and #mixed.entries == 2 and mixed.entries[2].amount == 6,
	"mixed atom batches must preserve every entry")
assert(PlayerDataBridge.GetPendingAtomAmount(48) == 0,
	"consuming a queued collection must release its reserved atom capacity")
assert(not PlayerDataBridge.RecordAtomCollectMultiBatch(49, {{elementZ = 0, symbol = "X", amount = 1}}),
	"invalid mixed atom batches must be rejected")
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

print("PlayerDataBridge Tests: 37 passed, 0 failed")
