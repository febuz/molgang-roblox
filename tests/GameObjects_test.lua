--[[
	GameObjects_test.lua
	MOLGANG — Unit tests for the ObjectRegistry archetype/trait engine and
	RarityTrait scoring (ReplicatedStorage/Modules/GameObjects).

	Run standalone with: lune run tests/GameObjects_test.lua
	(ObjectRegistry.lua and RarityTrait.lua have zero Roblox-instance
	dependencies, so they load directly via relative require — unlike
	SeasonalDrinks.lua, which uses the project's `require(script.Parent.X)`
	Rojo convention and Color3, and is instead covered by selene + rojo build.)
]]

local ObjectRegistry = require("../game/src/ReplicatedStorage/Modules/GameObjects/ObjectRegistry")
local RarityTrait = require("../game/src/ReplicatedStorage/Modules/GameObjects/RarityTrait")
local Achievements = require("../game/src/ReplicatedStorage/Modules/GameObjects/Achievements")
local MiningMilestones = require("../game/src/ReplicatedStorage/Modules/GameObjects/MiningMilestones")
local RegionalEconomy = require("../game/src/ReplicatedStorage/Modules/GameObjects/RegionalEconomy")

local passCount = 0
local failCount = 0

local function assert_eq(actual, expected, testName)
	if actual == expected then
		passCount += 1
	else
		failCount += 1
		print("FAIL: " .. testName .. " — expected " .. tostring(expected) .. ", got " .. tostring(actual))
	end
end

local function assert_true(condition, testName)
	if condition then
		passCount += 1
	else
		failCount += 1
		print("FAIL: " .. testName)
	end
end

local function assert_error(fn, testName)
	local ok = pcall(fn)
	if not ok then
		passCount += 1
	else
		failCount += 1
		print("FAIL: " .. testName .. " — expected an error, got none")
	end
end

-- ═══════════════════════════════════════════════
-- ObjectRegistry: basic Define + GetTrait
-- ═══════════════════════════════════════════════

do
	local reg = ObjectRegistry.new()
	reg:Define("Base", { category = "Widget", traits = { Health = { max = 100 } } })
	assert_eq(reg:GetTrait("Base", "Health").max, 100, "Define stores a retrievable trait")
	assert_true(reg:HasTrait("Base", "Health"), "HasTrait true for present trait")
	assert_true(not reg:HasTrait("Base", "Mobile"), "HasTrait false for absent trait")
end

-- ═══════════════════════════════════════════════
-- ObjectRegistry: inherits composition (OpenRA ^Base pattern)
-- ═══════════════════════════════════════════════

do
	local reg = ObjectRegistry.new()
	reg:Define("Base", { category = "Widget", traits = { Health = { max = 100 }, Mobile = { speed = 5 } } })
	reg:Define("Child", { inherits = "Base", category = "Widget", traits = { Health = { max = 200 } } })

	assert_eq(reg:GetTrait("Child", "Health").max, 200, "child trait overrides inherited trait of same name")
	assert_eq(reg:GetTrait("Child", "Mobile").speed, 5, "child inherits trait it doesn't redefine")
	assert_eq(reg:GetTrait("Base", "Health").max, 100, "base archetype unaffected by child override")
end

-- ═══════════════════════════════════════════════
-- ObjectRegistry: @SUFFIX multi-instance traits (OpenRA pattern)
-- ═══════════════════════════════════════════════

do
	local reg = ObjectRegistry.new()
	reg:Define("Dog", {
		category = "Unit",
		traits = {
			["Buff@SPEED"] = { type = "speed", value = 1.2 },
			["Buff@RANGE"] = { type = "range", value = 1.5 },
		},
	})
	local buffs = reg:GetTraitsImplementing("Dog", "Buff")
	assert_eq(#buffs, 2, "GetTraitsImplementing finds both @SUFFIX variants")
end

-- ═══════════════════════════════════════════════
-- ObjectRegistry: category buckets (Build-engine statnum pattern)
-- ═══════════════════════════════════════════════

do
	local reg = ObjectRegistry.new()
	reg:Define("a", { category = "Drink", traits = {} })
	reg:Define("b", { category = "Drink", traits = {} })
	reg:Define("c", { category = "Facility", traits = {} })

	local seen = {}
	for id in reg:EachInCategory("Drink") do
		table.insert(seen, id)
	end
	assert_eq(#seen, 2, "EachInCategory only yields ids in that category")
	assert_eq(#reg:CategoryIds("Facility"), 1, "CategoryIds counts the other bucket independently")
	assert_eq(#reg:CategoryIds("Nonexistent"), 0, "CategoryIds on unknown category returns empty, not nil")
end

-- ═══════════════════════════════════════════════
-- ObjectRegistry: error handling
-- ═══════════════════════════════════════════════

do
	local reg = ObjectRegistry.new()
	assert_error(function()
		reg:Define("X", { inherits = "DoesNotExist", category = "Widget", traits = {} })
	end, "Define with unknown inherits target raises")

	reg:Define("Y", { category = "Widget", traits = {} })
	assert_error(function()
		reg:Define("Y", { category = "Widget", traits = {} })
	end, "redefining the same id raises")

	assert_error(function()
		reg:GetTrait("Unknown", "Health")
	end, "GetTrait on unknown archetype raises")
end

do
	local reg = ObjectRegistry.new()
	-- self-inheriting archetype: raw def exists so resolveTraits recurses
	-- back into itself and must trip the circular-chain guard, not overflow.
	reg._raw.Loop = { inherits = "Loop", category = "Widget", traits = {} }
	assert_error(function()
		reg:Define("Trigger", { inherits = "Loop", category = "Widget", traits = {} })
	end, "circular inherits chain raises instead of infinite-looping")
end

-- ═══════════════════════════════════════════════
-- RarityTrait: real band edges from the 6 live BubbleTeaBar drinks
-- ═══════════════════════════════════════════════

assert_eq(RarityTrait.ComputeTier(25, 1.25), "Common", "classic (score 31.25) is Common")
assert_eq(RarityTrait.ComputeTier(30, 1.2), "Uncommon", "matcha (score 36) is Uncommon")
assert_eq(RarityTrait.ComputeTier(35, 1.3), "Rare", "mango (score 45.5) is Rare")
assert_eq(RarityTrait.ComputeTier(40, 1.5), "Epic", "taro (score 60) is Epic")
assert_eq(RarityTrait.ComputeTier(60, 1.15), "Legendary", "lychee (score 69) is Legendary")
assert_eq(RarityTrait.ComputeTier(50, 1.4), "Legendary", "brownSugar (score 70) is Legendary")

-- Band edges are exclusive on the ceiling: score must be < ceiling to land
-- in the lower tier.
assert_eq(RarityTrait.ComputeTier(33, 1.0), "Uncommon", "score exactly at a ceiling (33) lands in the next tier up")
assert_eq(RarityTrait.ComputeTier(0, 0), "Common", "zero score is Common, not an error")

assert_error(function()
	RarityTrait.ComputeTier(-1, 1.0)
end, "negative cost raises")

-- ═══════════════════════════════════════════════
-- RarityTrait: ComputeTierForArchetype reads Buyable+Buff off a registry
-- ═══════════════════════════════════════════════

do
	local reg = ObjectRegistry.new()
	reg:Define("taro", { category = "Drink", traits = { Buyable = { cost = 40 }, Buff = { value = 1.5 } } })
	assert_eq(RarityTrait.ComputeTierForArchetype(reg, "taro"), "Epic", "ComputeTierForArchetype matches the direct ComputeTier result")
end

-- ═══════════════════════════════════════════════
-- Achievements: purchase-count badge threshold crossing (molgang-roblox#9)
-- ═══════════════════════════════════════════════

do
	local unlocked = Achievements.CheckNewlyUnlocked(0, 1)
	assert_eq(#unlocked, 1, "0->1 unlocks exactly one badge")
	assert_eq(unlocked[1].id, "firstTaste", "0->1 unlocks firstTaste")
end

assert_eq(#Achievements.CheckNewlyUnlocked(1, 1), 0, "no-op purchase (same count) unlocks nothing")
assert_eq(#Achievements.CheckNewlyUnlocked(3, 9), 0, "staying below the next threshold unlocks nothing")

do
	local unlocked = Achievements.CheckNewlyUnlocked(9, 10)
	assert_eq(#unlocked, 1, "9->10 unlocks exactly one badge")
	assert_eq(unlocked[1].id, "cafeEnthusiast", "9->10 unlocks cafeEnthusiast")
end

do
	-- A count jump spanning multiple thresholds (e.g. a future batch grant)
	-- must award every tier passed through, not just the nearest one.
	local unlocked = Achievements.CheckNewlyUnlocked(0, 50)
	assert_eq(#unlocked, 3, "0->50 unlocks all 3 badges in one jump")
	assert_eq(unlocked[1].id, "firstTaste", "0->50 badge order: firstTaste first")
	assert_eq(unlocked[2].id, "cafeEnthusiast", "0->50 badge order: cafeEnthusiast second")
	assert_eq(unlocked[3].id, "bubbleTeaAddict", "0->50 badge order: bubbleTeaAddict third")
end

assert_eq(#Achievements.CheckNewlyUnlocked(50, 51), 0, "past the last threshold, nothing new unlocks")
assert_eq(Achievements.GetBadge("cafeEnthusiast").molCoinsReward, 50, "GetBadge looks up reward by id")
assert_true(Achievements.GetBadge("doesNotExist") == nil, "GetBadge returns nil for unknown id")

assert_error(function()
	Achievements.CheckNewlyUnlocked(5, 3)
end, "newCount < previousCount raises instead of silently misbehaving")

-- ═══════════════════════════════════════════════
-- MiningMilestones: atom-collected count milestone threshold crossing
-- ═══════════════════════════════════════════════

do
	local unlocked = MiningMilestones.CheckNewlyUnlocked(9, 10)
	assert_eq(#unlocked, 1, "9->10 unlocks exactly one milestone")
	assert_eq(unlocked[1].id, "elementHunter", "9->10 unlocks elementHunter")
end

assert_eq(#MiningMilestones.CheckNewlyUnlocked(10, 10), 0, "no-op collect (same count) unlocks nothing")
assert_eq(#MiningMilestones.CheckNewlyUnlocked(10, 99), 0, "staying below the next threshold unlocks nothing")

do
	local unlocked = MiningMilestones.CheckNewlyUnlocked(0, 500)
	assert_eq(#unlocked, 3, "0->500 unlocks all 3 milestones in one jump")
	assert_eq(unlocked[3].id, "periodicTableMaster", "0->500 badge order: periodicTableMaster last")
end

assert_eq(#MiningMilestones.CheckNewlyUnlocked(500, 501), 0, "past the last threshold, nothing new unlocks")
assert_eq(MiningMilestones.GetMilestone("atomicCollector").molCoinsReward, 75, "GetMilestone looks up reward by id")
assert_true(MiningMilestones.GetMilestone("doesNotExist") == nil, "GetMilestone returns nil for unknown id")

assert_error(function()
	MiningMilestones.CheckNewlyUnlocked(10, 5)
end, "newCount < previousCount raises instead of silently misbehaving")

-- ═══════════════════════════════════════════════
-- RegionalEconomy: region data, composition merge, pricing, comparison
-- ═══════════════════════════════════════════════

-- All 6 regions present and iterable in deterministic order.
do
	local ids = RegionalEconomy.AllRegionIds()
	assert_eq(#ids, 6, "there are 6 regions")
	assert_eq(ids[1], "west_europe", "region order is deterministic (west_europe first)")
end

-- Merge composition: a region inherits DEFAULTS for anything it doesn't
-- override. Every region must have all 4 demand categories filled in even
-- though several override only some of them.
do
	for _, id in ipairs(RegionalEconomy.AllRegionIds()) do
		local region = RegionalEconomy.GetRegion(id)
		for _, category in ipairs(RegionalEconomy.CATEGORIES) do
			assert_true(type(region.demand[category]) == "number", id .. " has demand for " .. category)
		end
		assert_true(type(region.currency.eurRate) == "number", id .. " has a currency eurRate")
		assert_true(region.name ~= nil, id .. " has a name")
	end
end

-- BuyPrice scales by cost of living; West Europe (1.2) costs more than
-- South Asia (0.7) for the same base input.
assert_eq(RegionalEconomy.BuyPrice(100, "west_europe"), 120, "west_europe buy price = base * 1.2")
assert_eq(RegionalEconomy.BuyPrice(100, "south_asia"), 70, "south_asia buy price = base * 0.7")

-- SellPrice scales by that region's demand for the category. East Asia
-- (steel 1.5) pays the most for steel; Latin America (mining 1.4) for mining.
assert_eq(RegionalEconomy.SellPrice(100, "east_asia", "steel"), 150, "east_asia pays 1.5x for steel")
assert_eq(RegionalEconomy.SellPrice(100, "west_europe", "cafe"), 140, "west_europe pays 1.4x for cafe")

-- BestRegionToSell picks the highest MolCoin payout (common unit, already
-- standardized — not a currency-inflated figure).
do
	local id, price = RegionalEconomy.BestRegionToSell(100, "steel")
	assert_eq(id, "east_asia", "best region to sell steel is east_asia")
	assert_eq(price, 150, "best steel sell price is 150")

	local mid = RegionalEconomy.BestRegionToSell(100, "mining")
	assert_eq(mid, "africa", "best region to sell mining is africa (1.5x)")

	local cid = RegionalEconomy.BestRegionToSell(100, "cafe")
	assert_eq(cid, "west_europe", "best region to sell cafe is west_europe (1.4x)")
end

-- CheapestRegionToBuy picks the lowest cost of living.
do
	local id, price = RegionalEconomy.CheapestRegionToBuy(100)
	assert_eq(id, "south_asia", "cheapest region to buy is south_asia (0.7x)")
	assert_eq(price, 70, "cheapest buy price is 70")
end

-- LocalCurrencyString renders the MolCoin amount in the region's currency
-- (display only). 36 MolCoins in East Asia (¥, eurRate 7.8) -> ¥281 CNY.
assert_eq(RegionalEconomy.LocalCurrencyString(36, "east_asia"), "¥281 CNY", "east_asia local currency string")
assert_eq(RegionalEconomy.LocalCurrencyString(36, "west_europe"), "€36 EUR", "west_europe is 1:1 with EUR")

-- Error handling.
assert_error(function()
	RegionalEconomy.GetRegion("atlantis")
end, "unknown region raises")
assert_error(function()
	RegionalEconomy.SellPrice(100, "africa", "spaceships")
end, "unknown category raises")
assert_error(function()
	RegionalEconomy.BuyPrice(-5, "africa")
end, "negative base price raises")

-- ═══════════════════════════════════════════════
-- REPORT
-- ═══════════════════════════════════════════════

print(string.format("\n%d passed, %d failed", passCount, failCount))
if failCount > 0 then
	error(string.format("%d test(s) failed", failCount), 0)
end
