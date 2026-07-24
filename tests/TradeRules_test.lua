local TradeRules = require("../game/src/ReplicatedStorage/Modules/TradeRules")

local prices = {Iron = 100}

local ok, quantity, price = TradeRules.Validate("buy", "Iron", 3, 100, prices)
assert(ok and quantity == 3 and price == 100, "valid trade must pass unchanged")
assert(not TradeRules.Validate("buy", "Iron", -1, 100, prices), "negative quantity must be rejected")
assert(not TradeRules.Validate("sell", "Iron", 1001, 100, prices), "oversized quantity must be rejected")
local quantityOk, parsed = TradeRules.ValidateQuantity("4", 100)
assert(quantityOk and parsed == 4, "string quantities must be normalized safely")
local clamped, _, clampedPrice = TradeRules.Validate("buy", "Iron", 1, 10000, prices)
assert(clamped and clampedPrice == 120, "offered price must be clamped to market bounds")

local tax, net = TradeRules.CalculateTradeTax(1000, 1)
assert(tax == 50 and net == 950, "normal trade tax should be 5%")

tax, net = TradeRules.CalculateTradeTax(1000, 0)
assert(tax == 0 and net == 1000, "free-trade event should remove tax")

tax, net = TradeRules.CalculateTradeTax(999, 2)
assert(tax == 100 and net == 899, "event multiplier should stack on the base tax")

tax, net = TradeRules.CalculateTradeTax(-1, 1)
assert(tax == 0 and net == 0, "invalid gross amount should not mint or charge coins")

print("Trade Rules Tests: 9 passed, 0 failed")
