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

print("Trade Rules Tests: 5 passed, 0 failed")
