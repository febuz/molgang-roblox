-- Lune tests for route ownership and bottleneck attribution.
local LogisticsNetwork = require("../game/src/ReplicatedStorage/Modules/LogisticsNetwork")

local route = LogisticsNetwork.BuildRoute("guild-alpha", "zone_a", "zone_b", "TRUCK", nil, 42)
assert(route and route.ownerId == "guild-alpha", "route must retain its owner")
assert(route.payerId == 42, "guild route must retain its payer")
route.utilisation = route.capacity * 0.9
local canUpgrade, _, upgradeCost = LogisticsNetwork.GetUpgradeCost(route.id, "guild-alpha")
assert(canUpgrade and upgradeCost > 0, "route owner must receive a valid upgrade cost")

local bottlenecks = LogisticsNetwork.GetBottlenecks()
assert(#bottlenecks == 1, "congested route must produce one bottleneck")
assert(bottlenecks[1].ownerId == "guild-alpha", "bottleneck must identify route owner")

local costs = LogisticsNetwork.ComputeOperatingCosts()
assert(costs[42] == route.opCostPerMin, "operating cost must charge the payer, not a guild string")
assert(LogisticsNetwork.SuspendRoutesForPayer(42) == 1, "unpaid payer must be able to suspend routes")
assert(not route.active, "suspended route must stop operating")
assert(LogisticsNetwork.ResumeRoutesForPayer(42) == 1 and route.active, "route must resume after payment")

LogisticsNetwork.RemoveRoute(route.id, "guild-alpha")
print("Logistics Tests: 9 passed, 0 failed")
