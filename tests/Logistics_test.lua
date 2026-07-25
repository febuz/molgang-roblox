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

local restored = LogisticsNetwork.Deserialize({
	nextId = 1,
	routes = {
		ROUTE_9 = {
			ownerId = "guild-beta", from = "zone_a", to = "zone_c", mode = "TRUCK",
			level = 1, capacity = 80, utilisation = 999, opCostPerMin = 20, active = true,
		},
		BROKEN = { ownerId = "guild-beta", from = "zone_a", to = "zone_a", mode = "TRUCK" },
		BAD_MODE = { ownerId = "guild-beta", from = "zone_a", to = "zone_c", mode = "WORMHOLE" },
	},
})
assert(restored == 1, "restore must skip malformed routes")
assert(LogisticsNetwork._routes.ROUTE_9.utilisation == 80, "restore must clamp utilisation to capacity")
local newRoute = LogisticsNetwork.BuildRoute("guild-beta", "zone_c", "zone_d", "TRUCK")
assert(newRoute.id == "ROUTE_10", "restored route IDs must not collide")
local throughput, invalidShipment = LogisticsNetwork.Route("zone_c", "zone_d", "solid", 0)
assert(throughput == 0 and invalidShipment.type == "invalid_shipment", "zero-demand shipment must be rejected")
LogisticsNetwork.RemoveRoute(newRoute.id, "guild-beta")
print("Logistics Tests: 9 passed, 0 failed")
