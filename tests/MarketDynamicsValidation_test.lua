local TradeRules = require("../game/src/ReplicatedStorage/Modules/TradeRules")

local valid = TradeRules.Validate("buy", "Iron", 1, nil, { Iron = 100 })
assert(valid, "valid market buy must pass the shared trade rules")
local invalid = TradeRules.Validate("buy", "Iron", 0, nil, { Iron = 100 })
assert(not invalid, "zero-quantity market events must be rejected")

print("Market Dynamics Validation Tests: 2 passed, 0 failed")
