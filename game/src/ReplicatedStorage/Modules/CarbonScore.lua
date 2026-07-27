--[[
	CarbonScore.lua
	MOLGANG — Environmental Impact / Carbon Footprint Calculator (#89)

	Tracks the player's carbon footprint based on processing activities.
	Lower score = more sustainable operations.
]]

local CarbonScore = {}

-- CO2 emissions per activity (kg CO2 equivalent per unit)
CarbonScore.Emissions = {
	-- Processing
	crushing_jaw    = 2,      -- kg CO2/ton
	crushing_cone   = 3,
	grinding_ball   = 10,
	roasting        = 45,     -- very carbon-intensive
	leaching_acid   = 15,     -- acid production has emissions
	leaching_base   = 8,
	leaching_water  = 1,      -- minimal
	drying          = 12,

	-- Mining
	manual_mining   = 0,      -- zero emissions
	drill_mining    = 5,
	excavator       = 20,
	haul_truck      = 15,
	automated       = 25,

	-- Factory
	factory_rent    = 10,     -- per month (building maintenance)
	equipment_power = 3,      -- per kW used
}

-- Carbon offset activities
CarbonScore.Offsets = {
	tree_planting   = -5,     -- per tree
	recycling       = -2,     -- per batch
	solar_power     = -8,     -- per panel installed
	water_reuse     = -3,     -- per cycle
}

-- Calculate environmental score (lower = greener)
function CarbonScore.CalculateScore(activities)
	local totalCO2 = 0
	for activity, count in pairs(activities) do
		local rate = CarbonScore.Emissions[activity] or CarbonScore.Offsets[activity] or 0
		totalCO2 = totalCO2 + rate * count
	end
	return math.max(0, totalCO2)
end

-- Get sustainability rating
function CarbonScore.GetRating(score)
	if score <= 50 then return "Green Champion", Color3.fromRGB(0, 200, 80)
	elseif score <= 150 then return "Eco-Conscious", Color3.fromRGB(100, 200, 0)
	elseif score <= 300 then return "Industrial", Color3.fromRGB(255, 200, 0)
	elseif score <= 500 then return "Heavy Industry", Color3.fromRGB(255, 120, 0)
	else return "Carbon Intensive", Color3.fromRGB(255, 60, 60)
	end
end

-- Carbon credits are earned only by an operating factory, not by an empty
-- rental. Lower emissions produce more credits; world events can multiply
-- the verified credit yield. The result is deliberately small so credits
-- reward sustainable layout choices without replacing production income.
function CarbonScore.CalculateCreditReward(score, multiplier, operating)
	if not operating then return 0 end
	local value = tonumber(score) or 0
	if value ~= value or value == math.huge or value == -math.huge then return 0 end
	local eventMultiplier = tonumber(multiplier) or 1
	if eventMultiplier ~= eventMultiplier or eventMultiplier == math.huge or eventMultiplier == -math.huge then
		eventMultiplier = 1
	end
	local baseCredits
	if value <= 50 then baseCredits = 50
	elseif value <= 150 then baseCredits = 25
	elseif value <= 300 then baseCredits = 10
	else baseCredits = 0 end
	return math.floor(baseCredits * math.max(0, eventMultiplier))
end

-- Format CO2 for display
function CarbonScore.FormatCO2(kg)
	if kg >= 1000 then
		return string.format("%.1f tons CO2", kg / 1000)
	else
		return string.format("%d kg CO2", kg)
	end
end

return CarbonScore
