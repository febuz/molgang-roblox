local CommodityMarket = require("../game/src/ReplicatedStorage/Modules/CommodityMarket")

assert(CommodityMarket.GetCurrentPrice("Iron") == 100, "base price must be authoritative initially")
assert(CommodityMarket.GetCurrentPrice("Unknown") == nil, "unknown commodities must have no price")
assert(CommodityMarket.SetCurrentPrice("Iron", 125), "valid market price should be accepted")
assert(CommodityMarket.GetCurrentPrice("Iron") == 125, "current price should be shared")
assert(not CommodityMarket.SetCurrentPrice("Iron", -1), "negative prices must be rejected")
assert(not CommodityMarket.SetCurrentPrice("Unknown", 10), "unknown commodity prices must be rejected")

print("Commodity Market Tests: 6 passed, 0 failed")
