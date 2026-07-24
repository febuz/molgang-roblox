-- Lune tests for route ownership and bottleneck attribution.
local LogisticsNetwork = require("../game/src/ReplicatedStorage/Modules/LogisticsNetwork")

local route = LogisticsNetwork.BuildRoute("guild-alpha", "zone_a", "zone_b", "TRUCK")
assert(route and route.ownerId == "guild-alpha", "route must retain its owner")
route.utilisation = route.capacity * 0.9
local canUpgrade, _, upgradeCost = LogisticsNetwork.GetUpgradeCost(route.id, "guild-alpha")
assert(canUpgrade and upgradeCost > 0, "route owner must receive a valid upgrade cost")

local bottlenecks = LogisticsNetwork.GetBottlenecks()
assert(#bottlenecks == 1, "congested route must produce one bottleneck")
assert(bottlenecks[1].ownerId == "guild-alpha", "bottleneck must identify route owner")

LogisticsNetwork.RemoveRoute(route.id, "guild-alpha")
print("Logistics Tests: 4 passed, 0 failed")
