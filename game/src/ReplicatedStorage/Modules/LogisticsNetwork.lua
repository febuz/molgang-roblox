--[[
	LogisticsNetwork.lua
	MOLGANG — Supply Chain & Transport System

	Connects factories, mines, and territories via four transport modes:
	  1. Conveyor Belt   — fast, cheap, short range (adjacent tiles only)
	  2. Pipeline        — medium range, ideal for fluids/slurries
	  3. Rail Network    — long range, high capacity, bulk cargo
	  4. Truck Route     — flexible, any distance, lower capacity

	Building a route from A → B:
	  - Player places a route via the factory builder UI
	  - Route has capacity (units/min), operating cost/min, build cost
	  - Throughput degrades if utilisation > 80% (congestion)
	  - Can be upgraded for higher capacity (Research Tree: Automation branch)

	This is the Settlers layer — without good logistics, your factories idle.

	Bottleneck analysis:
	  - Each tick, server checks throughput vs demand on every route
	  - If demand > capacity, generates a bottleneck warning
	  - Bottleneck persists until player upgrades route or reroutes
]]

local LogisticsNetwork = {}

-- ════════════════════════════════════════════════
-- TRANSPORT MODE DEFINITIONS
-- ════════════════════════════════════════════════

LogisticsNetwork.TransportModes = {
	CONVEYOR = {
		id          = "conveyor",
		name        = "Conveyor Belt",
		icon        = "🔄",
		maxRange    = 1,          -- only adjacent hex territories
		buildCost   = 500,        -- MolCoins
		opCostPerMin= 2,
		capacity    = 60,         -- units/min base
		speedMult   = 1.0,        -- delivery multiplier
		cargo       = { "solid" },-- solid materials only
		upgradeLevels = {
			{ level = 2, cost = 1000, capacityMult = 1.5  },
			{ level = 3, cost = 2500, capacityMult = 2.5  },
		},
	},
	PIPELINE = {
		id          = "pipeline",
		name        = "Pipeline",
		icon        = "🔩",
		maxRange    = 3,          -- up to 3 hex hops
		buildCost   = 2000,
		opCostPerMin= 5,
		capacity    = 120,
		speedMult   = 0.9,
		cargo       = { "liquid", "slurry", "gas" },
		upgradeLevels = {
			{ level = 2, cost = 4000, capacityMult = 1.8  },
			{ level = 3, cost = 10000, capacityMult = 3.0 },
		},
	},
	RAIL = {
		id          = "rail",
		name        = "Rail Network",
		icon        = "🚂",
		maxRange    = 7,          -- any non-adjacent territory
		buildCost   = 8000,
		opCostPerMin= 15,
		capacity    = 500,
		speedMult   = 0.7,        -- slower because of scheduling
		cargo       = { "solid", "bulk" },
		upgradeLevels = {
			{ level = 2, cost = 15000, capacityMult = 2.0  },
			{ level = 3, cost = 35000, capacityMult = 4.0  },
		},
	},
	TRUCK = {
		id          = "truck",
		name        = "Truck Route",
		icon        = "🚛",
		maxRange    = 99,         -- unlimited range
		buildCost   = 1200,
		opCostPerMin= 20,         -- most expensive per unit
		capacity    = 80,
		speedMult   = 0.6,
		cargo       = { "solid", "liquid", "bulk", "hazardous" },
		upgradeLevels = {
			{ level = 2, cost = 2500, capacityMult = 1.5  },
		},
	},
}

-- ════════════════════════════════════════════════
-- ROUTE MANAGEMENT
-- ════════════════════════════════════════════════

-- Player/guild route registry (in-memory; persisted to DataStore by server)
-- Structure: { routeId -> Route }
LogisticsNetwork._routes = {}

local _nextRouteId = 1
local function newRouteId()
	local id = "ROUTE_" .. _nextRouteId
	_nextRouteId = _nextRouteId + 1
	return id
end

-- Validate whether a route can be built between two territories
-- Returns: canBuild (bool), reason (string), cost (number)
function LogisticsNetwork.ValidateBuild(fromId, toId, modeId, hexDistance, ownerBonuses)
	local mode = LogisticsNetwork.TransportModes[string.upper(modeId)]
	if not mode then
		return false, "Unknown transport mode: " .. tostring(modeId), 0
	end

	if fromId == toId then
		return false, "Source and destination must differ", 0
	end

	if hexDistance > mode.maxRange then
		return false, mode.name .. " max range is " .. mode.maxRange .. " hex(es). Distance is " .. hexDistance, 0
	end

	-- Apply logistics capacity bonus from territory control
	local capacityBonus = (ownerBonuses and ownerBonuses.logisticsCapacity) or 1
	local cost = math.floor(mode.buildCost / capacityBonus)

	return true, "OK", cost
end

-- Build a new route
function LogisticsNetwork.BuildRoute(ownerId, fromId, toId, modeId, level)
	local id = newRouteId()
	level = level or 1

	local mode = LogisticsNetwork.TransportModes[string.upper(modeId)]
	if not mode then return nil, "Invalid mode" end

	local baseCapacity = mode.capacity
	for _, upg in ipairs(mode.upgradeLevels) do
		if upg.level <= level then
			baseCapacity = math.floor(baseCapacity * upg.capacityMult)
		end
	end

	local route = {
		id           = id,
		ownerId      = ownerId,
		from         = fromId,
		to           = toId,
		mode         = modeId,
		level        = level,
		capacity     = baseCapacity,
		utilisation  = 0,         -- units/min currently routed
		opCostPerMin = mode.opCostPerMin,
		active       = true,
		createdAt    = os.time(),
	}

	LogisticsNetwork._routes[id] = route
	return route, nil
end

-- Remove a route
function LogisticsNetwork.RemoveRoute(routeId, requesterId)
	local route = LogisticsNetwork._routes[routeId]
	if not route then return false, "Route not found" end
	if route.ownerId ~= requesterId then return false, "Not your route" end

	LogisticsNetwork._routes[routeId] = nil
	return true, nil
end

-- Upgrade a route to the next level
function LogisticsNetwork.UpgradeRoute(routeId, requesterId)
	local route = LogisticsNetwork._routes[routeId]
	if not route then return false, "Route not found", 0 end
	if route.ownerId ~= requesterId then return false, "Not your route", 0 end

	local mode = LogisticsNetwork.TransportModes[string.upper(route.mode)]
	if not mode then return false, "Invalid mode", 0 end

	-- Find next upgrade
	local nextUpgrade = nil
	for _, upg in ipairs(mode.upgradeLevels) do
		if upg.level == route.level + 1 then
			nextUpgrade = upg
			break
		end
	end

	if not nextUpgrade then return false, "Already at max level", 0 end

	route.level    = nextUpgrade.level
	route.capacity = math.floor(mode.capacity * nextUpgrade.capacityMult)

	return true, nil, nextUpgrade.cost
end

function LogisticsNetwork.GetUpgradeCost(routeId, requesterId)
	local route = LogisticsNetwork._routes[routeId]
	if not route then return false, "Route not found", 0 end
	if route.ownerId ~= requesterId then return false, "Not your route", 0 end
	local mode = LogisticsNetwork.TransportModes[string.upper(route.mode)]
	if not mode then return false, "Invalid mode", 0 end
	for _, upg in ipairs(mode.upgradeLevels) do
		if upg.level == route.level + 1 then
			return true, "OK", upg.cost
		end
	end
	return false, "Already at max level", 0
end

-- ════════════════════════════════════════════════
-- THROUGHPUT & BOTTLENECK ANALYSIS
-- ════════════════════════════════════════════════

-- Route a shipment through the network (returns actual throughput, bottleneck if any)
-- demand: units/min needed
-- cargo: cargo type string
function LogisticsNetwork.Route(fromId, toId, cargoType, demand)
	-- Find all valid routes for this pair
	local viable = {}
	for _, route in pairs(LogisticsNetwork._routes) do
		if route.active and
		  (route.from == fromId and route.to == toId or
		   route.from == toId and route.to == fromId) then

			local mode = LogisticsNetwork.TransportModes[string.upper(route.mode)]
			if mode then
				local cargoOk = false
				for _, c in ipairs(mode.cargo) do
					if c == cargoType then cargoOk = true; break end
				end
				if cargoOk then table.insert(viable, route) end
			end
		end
	end

	if #viable == 0 then
		return 0, { type = "no_route", from = fromId, to = toId, cargo = cargoType }
	end

	-- Sum available capacity across viable routes
	local totalCapacity = 0
	for _, route in ipairs(viable) do
		local available = math.max(0, route.capacity - route.utilisation)
		totalCapacity = totalCapacity + available
	end

	local actualThroughput = math.min(demand, totalCapacity)
	local remaining = demand

	-- Distribute demand across routes (highest available capacity first)
	table.sort(viable, function(a, b)
		return (a.capacity - a.utilisation) > (b.capacity - b.utilisation)
	end)
	for _, route in ipairs(viable) do
		local canTake = math.max(0, route.capacity - route.utilisation)
		local take    = math.min(remaining, canTake)
		route.utilisation = route.utilisation + take
		remaining = remaining - take
		if remaining <= 0 then break end
	end

	-- Bottleneck if we couldn't route all demand
	local bottleneck = nil
	if remaining > 0 then
		bottleneck = {
			type      = "capacity_exceeded",
			from      = fromId,
			to        = toId,
			cargo     = cargoType,
			demand    = demand,
			supplied  = actualThroughput,
			shortfall = remaining,
			hint      = "Upgrade existing routes or add parallel routes between these territories.",
		}
	end

	return actualThroughput, bottleneck
end

-- ════════════════════════════════════════════════
-- OPERATING COST TICK (called every minute)
-- ════════════════════════════════════════════════

-- Returns total operating costs by ownerId for this tick
function LogisticsNetwork.ComputeOperatingCosts()
	local costs = {}
	for _, route in pairs(LogisticsNetwork._routes) do
		if route.active then
			costs[route.ownerId] = (costs[route.ownerId] or 0) + route.opCostPerMin
		end
	end
	return costs
end

-- Decay utilisation each tick (demand is per-minute, resets between ticks)
function LogisticsNetwork.DecayUtilisation()
	for _, route in pairs(LogisticsNetwork._routes) do
		route.utilisation = 0
	end
end

-- ════════════════════════════════════════════════
-- NETWORK ANALYTICS
-- ════════════════════════════════════════════════

-- Return all bottlenecks currently in the network
function LogisticsNetwork.GetBottlenecks()
	local bottlenecks = {}
	for _, route in pairs(LogisticsNetwork._routes) do
		local utilPct = route.capacity > 0 and (route.utilisation / route.capacity) or 0
		if utilPct > 0.80 then
			 table.insert(bottlenecks, {
				routeId   = route.id,
				ownerId   = route.ownerId,
				from      = route.from,
				to        = route.to,
				mode      = route.mode,
				utilPct   = math.floor(utilPct * 100),
				capacity  = route.capacity,
				used      = route.utilisation,
				hint      = "Route is at " .. math.floor(utilPct * 100) .. "% capacity. Consider upgrading.",
			})
		end
	end
	return bottlenecks
end

-- Return routes owned by an entity
function LogisticsNetwork.GetOwnerRoutes(ownerId)
	local result = {}
	for _, route in pairs(LogisticsNetwork._routes) do
		if route.ownerId == ownerId then
			table.insert(result, route)
		end
	end
	return result
end

-- Full network snapshot for client map rendering
function LogisticsNetwork.GetNetworkSnapshot()
	local routes = {}
	for _, route in pairs(LogisticsNetwork._routes) do
		table.insert(routes, {
			id          = route.id,
			ownerId     = route.ownerId,
			from        = route.from,
			to          = route.to,
			mode        = route.mode,
			level       = route.level,
			capacity    = route.capacity,
			utilisation = route.utilisation,
			utilPct     = route.capacity > 0 and math.floor(route.utilisation / route.capacity * 100) or 0,
		})
	end
	return routes
end

-- ════════════════════════════════════════════════
-- PERSISTENCE HELPERS (called by server)
-- ════════════════════════════════════════════════

-- Serialize for DataStore
function LogisticsNetwork.Serialize()
	local data = { routes = {}, nextId = _nextRouteId }
	for id, route in pairs(LogisticsNetwork._routes) do
		data.routes[id] = route
	end
	return data
end

-- Restore from DataStore
function LogisticsNetwork.Deserialize(data)
	if not data then return end
	LogisticsNetwork._routes = data.routes or {}
	_nextRouteId = data.nextId or 1
end

return LogisticsNetwork
