--[[
	SeasonalEvents.lua
	MOLGANG — Seasonal/Weekly Event System (#74)

	Defines rotating events that add variety to gameplay.
	Events run on a weekly schedule with special bonuses.
]]

local SeasonalEvents = {}

SeasonalEvents.Events = {
	{
		id = "vanadium_rush",
		name = "Vanadium Rush",
		description = "V2O5 sell price doubled! Mine and leach vanadium for maximum profit.",
		schedule = "weekly",     -- every week
		duration = 86400,        -- 24 hours
		bonuses = {
			productPriceMultiplier = {V2O5 = 2.0},
		},
		color = Color3.fromRGB(255, 215, 0),
	},
	{
		id = "rare_ore_shipment",
		name = "Rare Ore Shipment",
		description = "Special ore delivery from South Africa — 3x more rare elements in slag batches this week.",
		schedule = "weekly",
		duration = 86400,
		bonuses = {
			rareSpawnMultiplier = 3.0,
		},
		color = Color3.fromRGB(180, 68, 255),
	},
	{
		id = "speed_leach",
		name = "Speed Leaching Weekend",
		description = "All leaching times reduced by 50%! Process slag at double speed.",
		schedule = "biweekly",
		duration = 172800,       -- 48 hours
		bonuses = {
			leachTimeMultiplier = 0.5,
		},
		color = Color3.fromRGB(0, 200, 120),
	},
	{
		id = "miner_festival",
		name = "Miner's Festival",
		description = "Mining equipment fuel costs halved. Ore yields increased by 25%.",
		schedule = "monthly",
		duration = 259200,       -- 72 hours
		bonuses = {
			fuelCostMultiplier = 0.5,
			oreYieldMultiplier = 1.25,
		},
		color = Color3.fromRGB(200, 160, 40),
	},
	{
		id = "double_mc",
		name = "Double MolCoin Day",
		description = "All MolCoin earnings doubled for 24 hours!",
		schedule = "weekly",
		duration = 86400,
		bonuses = {
			coinMultiplier = 2.0,
		},
		color = Color3.fromRGB(255, 200, 0),
	},
}

-- Determine which event is active (based on day of year)
function SeasonalEvents.GetActiveEvent()
	local dayOfYear = tonumber(os.date("%j"))
	local eventIndex = (dayOfYear % #SeasonalEvents.Events) + 1
	-- Events rotate: each day a different event might be active
	-- Active on specific days only
	if dayOfYear % 7 < 2 then -- active 2 days per week
		return SeasonalEvents.Events[eventIndex]
	end
	return nil -- no event today
end

function SeasonalEvents.GetEventById(id)
	for _, event in ipairs(SeasonalEvents.Events) do
		if event.id == id then return event end
	end
	return nil
end

return SeasonalEvents
