local Ledger = require("../game/src/ReplicatedStorage/Modules/MarketTransactionLedger")

local function assertEqual(actual, expected, message)
	assert(actual == expected, string.format("%s: expected %s, got %s", message, tostring(expected), tostring(actual)))
end

Ledger.Reset()
assertEqual(Ledger.Get("Iron").bought, 0, "empty commodity starts at zero")
assert(Ledger.Record("Iron", "buy", 3), "valid buy is recorded")
assert(Ledger.Record("Iron", "sell", 1), "valid sell is recorded")
assertEqual(Ledger.Get("Iron").bought, 3, "buy count is tracked")
assertEqual(Ledger.Get("Iron").sold, 1, "sell count is tracked")
assert(not Ledger.Record("Iron", "buy", 0), "zero quantity is rejected")
assert(not Ledger.Record("Iron", "buy", 1.5), "fractional quantity is rejected")
Ledger.Reset()
assertEqual(Ledger.Get("Iron").bought, 0, "reset clears settled demand")
assertEqual(Ledger.Get("Iron").sold, 0, "reset clears settled supply")

print("Market Transaction Ledger Tests: 8 passed, 0 failed")
