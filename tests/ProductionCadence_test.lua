local Facilities = require("../game/src/ReplicatedStorage/Modules/Facilities")
local ProductionState = require("../game/src/ReplicatedStorage/Modules/ProductionState")

assert(Facilities.GetFacility("Mine").productionTime == 60, "mine cadence must be 60 seconds")
assert(Facilities.GetFacility("Factory").productionTime == 120, "factory cadence must be 120 seconds")
assert(Facilities.GetFacility("Factory").productionTime > Facilities.GetFacility("Mine").productionTime,
	"factory must not run at the mine cadence")
assert(Facilities.CalculateProduction({mines = 1, factories = 1}).atoms == 10,
	"mine capacity must remain 10 atoms per cycle")
assert(Facilities.CalculateProduction({starterBenches = 1}).atoms == 3,
	"starter bench must produce its advertised 3 atoms per cycle")
assert(Facilities.CalculateTotalCost({starterBenches = 1}) == 200,
	"starter bench must be included in facility cost accounting")
assert(Facilities.CalculateProduction({mines = 1, factories = 1}).molecules == 5,
	"factory capacity must remain 5 molecules per factory cycle")
local outdoorFacilities = {starterBenches = 1, mines = 1}
assert(Facilities.CalculateOutdoorAtomRate(outdoorFacilities, 1) == 13,
	"clear weather must preserve outdoor atom rate")
assert(Facilities.CalculateOutdoorAtomRate(outdoorFacilities, 0.8) == 10.4,
	"rain must reduce outdoor atom rate")
assert(Facilities.CalculateOutdoorAtomRate(outdoorFacilities, 0.4) == 5.2,
	"hail must reduce outdoor atom rate")
assert(Facilities.CalculateOutdoorAtomRate(outdoorFacilities, 99) == 13,
	"weather multiplier must be capped at normal production")
assert(math.abs(Facilities.CalculateOutdoorAtomRate(outdoorFacilities, 0.8, 1.15) - 11.96) < 0.000001,
	"automation event must combine with weather-adjusted production")
assert(Facilities.CalculateOutdoorAtomRate(outdoorFacilities, 1, 0.5) == 6.5,
	"a 50% production event must halve the outdoor rate")
assert(Facilities.ApplyProductionBonus(100, 1) == 100,
	"normal production bonus must remain unchanged")
assert(Facilities.ApplyProductionBonus(100, 1.2) == 120,
	"production tournament must increase production bonus")
assert(Facilities.ApplyProductionBonus(99, 1.2) == 118,
	"production bonus must use deterministic floor rounding")
local cycles, remainder = ProductionState.Advance(60, 60, 1, 120)
assert(cycles == 1 and remainder == 0, "restored factory progress must complete at 120 seconds")
local boostedCycles, boostedRemainder = ProductionState.Advance(60, 60, 1.5, 120)
assert(boostedCycles == 1 and boostedRemainder == 30,
	"production speed must advance the persisted factory clock deterministically")
assert(ProductionState.NormalizeElapsed(math.huge, 120) == 0,
	"corrupt factory progress must reset instead of granting catch-up output")
assert(ProductionState.NormalizeRemainder(4) < 1,
	"atom remainder must remain fractional")

local facilities = Facilities.CreatePlayerFacilities()
assert(Facilities.BuildFacility(facilities, "Research Lab"), "research lab should build")
assert(facilities.researchLabs == 1 and facilities.researchlabs == nil,
	"research lab must use the canonical persisted key")
assert(Facilities.CanBuild(facilities, "Research Lab"), "research lab max-level check must read canonical key")

print("Production Cadence Tests: 23 passed, 0 failed")
