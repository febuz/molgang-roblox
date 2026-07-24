--[[
	Regions.lua — files the RegionalEconomy regions into the shared
	ObjectRegistry so in-game code reaches them through the same
	archetype/trait API as drinks and achievements (category-bucket
	iteration via EachInCategory("Region"), GetTrait, etc.).

	This is a thin adapter, not a second source of truth: all region data
	lives in RegionalEconomy.lua (which is dependency-free and lune-tested);
	Regions.lua only re-shapes it into registry archetypes and re-exports
	the pure pricing helpers for convenience. It uses the project's Rojo
	`require(script.Parent.X)` convention (so it isn't lune-loadable
	directly — the logic it wraps already is), and is verified by
	selene + rojo build.
]]

local ObjectRegistry = require(script.Parent.ObjectRegistry)
local RegionalEconomy = require(script.Parent.RegionalEconomy)

local Regions = {}

local Registry = ObjectRegistry.new()
Regions.Registry = Registry
Regions.Economy = RegionalEconomy

for _, id in ipairs(RegionalEconomy.AllRegionIds()) do
	local region = RegionalEconomy.GetRegion(id)
	Registry:Define(id, {
		category = "Region",
		traits = {
			Descriptive = { name = region.name, hub = region.hub },
			Economy = { costOfLiving = region.costOfLiving, demand = region.demand },
			Currency = region.currency,
			Industry = { sectors = region.industry },
			Cosmetic = { flagColor = region.flagColor },
		},
	})
end

-- Convenience: iterate every region archetype id + its flattened traits.
function Regions.All()
	return Registry:EachInCategory("Region")
end

-- Re-export the pure helpers so a consumer can `require(Regions)` alone.
Regions.BuyPrice = RegionalEconomy.BuyPrice
Regions.SellPrice = RegionalEconomy.SellPrice
Regions.LocalCurrencyString = RegionalEconomy.LocalCurrencyString
Regions.BestRegionToSell = RegionalEconomy.BestRegionToSell
Regions.CheapestRegionToBuy = RegionalEconomy.CheapestRegionToBuy

return Regions
