-- Persistent production-cycle accounting shared by the production server and
-- pure tests. Values are bounded to prevent corrupted profiles from creating
-- a giant catch-up payout after a restart.
local ProductionState = {}

local function finite(value)
	return type(value) == "number" and value == value and value > -math.huge and value < math.huge
end

function ProductionState.NormalizeElapsed(value, cycleSeconds)
	local cycle = finite(cycleSeconds) and cycleSeconds > 0 and cycleSeconds or 120
	local elapsed = finite(value) and value or 0
	return math.clamp(elapsed, 0, cycle - 0.000001)
end

function ProductionState.NormalizeRemainder(value)
	return finite(value) and math.clamp(value, 0, 0.999999) or 0
end

function ProductionState.Advance(elapsed, intervalSeconds, speedMultiplier, cycleSeconds)
	local cycle = finite(cycleSeconds) and cycleSeconds > 0 and cycleSeconds or 120
	local interval = finite(intervalSeconds) and math.max(0, intervalSeconds) or 0
	-- World events normally stay near 1.0. A hard ceiling prevents malformed
	-- event state from converting one minute into an unbounded catch-up burst.
	local speed = finite(speedMultiplier) and math.clamp(speedMultiplier, 0, 4) or 1
	local total = ProductionState.NormalizeElapsed(elapsed, cycle) + interval * speed
	local cycles = math.floor(total / cycle)
	return cycles, ProductionState.NormalizeElapsed(total - cycles * cycle, cycle)
end

return ProductionState
