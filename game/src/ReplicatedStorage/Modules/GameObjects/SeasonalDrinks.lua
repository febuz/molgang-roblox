--[[
	SeasonalDrinks.lua — the 4 seasonal Bubble Tea Bar drinks, defined as
	composable archetypes instead of one-off hardcoded tables.

	Each drink is a `Drink`-inheriting archetype made of named trait blocks
	(Buyable/Buff/Cosmetic/Descriptive/Seasonal) — the OpenRA Actor/Trait
	pattern. `ObjectRegistry` files every archetype into a `Drink` category
	bucket (the Build-engine statnum pattern) so callers can enumerate
	"all Drinks" without scanning unrelated categories.

	BubbleTeaBar.server.lua requires GetActiveSeasonalDrinks(month) and
	appends the result onto its existing DRINKS list — this module owns the
	seasonal *data*, BubbleTeaBar still owns purchase/buff/cooldown logic.
]]

local ObjectRegistry = require(script.Parent.ObjectRegistry)
local RarityTrait = require(script.Parent.RarityTrait)

local SeasonalDrinks = {}

local Registry = ObjectRegistry.new()
SeasonalDrinks.Registry = Registry

-- Base archetype: every seasonal drink inherits this "for free" via
-- `inherits = "Drink"`, mirroring OpenRA's `^Soldier`/`^Vehicle` bases.
Registry:Define("Drink", {
	category = "Drink",
	traits = {
		Metadata = { kind = "Beverage", station = "BubbleTeaBar" },
	},
})

Registry:Define("pumpkinSpice", {
	inherits = "Drink",
	category = "Drink",
	traits = {
		Descriptive = { name = "Pumpkin Spice Latte", description = "+35% Production Speed (2.5 min)" },
		Buyable = { cost = 45 },
		Buff = { type = "production", value = 1.35, duration = 150 },
		Cosmetic = { color = Color3.fromRGB(200, 120, 50), cupColor = Color3.fromRGB(210, 140, 70) },
		Seasonal = { activeMonths = { 10 } }, -- October
	},
})

Registry:Define("peppermint", {
	inherits = "Drink",
	category = "Drink",
	traits = {
		Descriptive = { name = "Peppermint Bliss", description = "+30% Move Speed (2 min)" },
		Buyable = { cost = 35 },
		Buff = { type = "speed", value = 1.3, duration = 120 },
		Cosmetic = { color = Color3.fromRGB(220, 40, 60), cupColor = Color3.fromRGB(240, 250, 250) },
		Seasonal = { activeMonths = { 12 } }, -- December
	},
})

Registry:Define("cherryBlossom", {
	inherits = "Drink",
	category = "Drink",
	traits = {
		Descriptive = { name = "Cherry Blossom Fizz", description = "+25% Rare Element Chance (2.5 min)" },
		Buyable = { cost = 55 },
		Buff = { type = "rarity", value = 1.25, duration = 150 },
		Cosmetic = { color = Color3.fromRGB(255, 180, 200), cupColor = Color3.fromRGB(255, 200, 220) },
		Seasonal = { activeMonths = { 3 } }, -- March
	},
})

Registry:Define("icedMatcha", {
	inherits = "Drink",
	category = "Drink",
	traits = {
		Descriptive = { name = "Iced Matcha Cooler", description = "+30% MolCoin Earnings (2.5 min)" },
		Buyable = { cost = 42 },
		Buff = { type = "coinBonus", value = 1.3, duration = 150 },
		Cosmetic = { color = Color3.fromRGB(120, 200, 140), cupColor = Color3.fromRGB(140, 220, 160) },
		Seasonal = { activeMonths = { 6 } }, -- June
	},
})

-- Pure: which seasonal archetype (if any) is active for a given month
-- number (1-12). Injectable for testing — never reads os.date() itself.
function SeasonalDrinks.ActiveArchetypeIdForMonth(month)
	assert(type(month) == "number" and month >= 1 and month <= 12, "month must be 1-12")
	for id in Registry:EachInCategory("Drink") do
		local seasonal = Registry:GetTrait(id, "Seasonal")
		if seasonal then
			for _, activeMonth in ipairs(seasonal.activeMonths) do
				if activeMonth == month then
					return id
				end
			end
		end
	end
	return nil
end

-- Flatten an archetype's traits into the exact schema BubbleTeaBar.server.lua's
-- DRINKS table entries use, so the result can be table.insert'ed directly.
local function toDrinkEntry(id)
	local descriptive = Registry:GetTrait(id, "Descriptive")
	local buyable = Registry:GetTrait(id, "Buyable")
	local buff = Registry:GetTrait(id, "Buff")
	local cosmetic = Registry:GetTrait(id, "Cosmetic")

	return {
		id = id,
		name = descriptive.name,
		color = cosmetic.color,
		cost = buyable.cost,
		buffType = buff.type,
		buffValue = buff.value,
		buffDuration = buff.duration,
		description = descriptive.description,
		cupColor = cosmetic.cupColor,
		rarity = RarityTrait.ComputeTierForArchetype(Registry, id),
	}
end

-- Public entry point: 0 or 1 seasonal drinks active for `month` (1-12), in
-- the flat DRINKS schema, ready to append onto BubbleTeaBar's DRINKS list.
function SeasonalDrinks.GetActiveSeasonalDrinks(month)
	local activeId = SeasonalDrinks.ActiveArchetypeIdForMonth(month)
	if not activeId then
		return {}
	end
	return { toDrinkEntry(activeId) }
end

return SeasonalDrinks
