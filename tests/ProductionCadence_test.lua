local Facilities = require("../game/src/ReplicatedStorage/Modules/Facilities")

assert(Facilities.GetFacility("Mine").productionTime == 60, "mine cadence must be 60 seconds")
assert(Facilities.GetFacility("Factory").productionTime == 120, "factory cadence must be 120 seconds")
assert(Facilities.GetFacility("Factory").productionTime > Facilities.GetFacility("Mine").productionTime,
	"factory must not run at the mine cadence")
assert(Facilities.CalculateProduction({mines = 1, factories = 1}).atoms == 10,
	"mine capacity must remain 10 atoms per cycle")
assert(Facilities.CalculateProduction({starterBenches = 1}).atoms == 3,
	"starter bench must produce its advertised 3 atoms per cycle")
assert(Facilities.CalculateProduction({mines = 1, factories = 1}).molecules == 5,
	"factory capacity must remain 5 molecules per factory cycle")

local facilities = Facilities.CreatePlayerFacilities()
assert(Facilities.BuildFacility(facilities, "Research Lab"), "research lab should build")
assert(facilities.researchLabs == 1 and facilities.researchlabs == nil,
	"research lab must use the canonical persisted key")
assert(Facilities.CanBuild(facilities, "Research Lab"), "research lab max-level check must read canonical key")

print("Production Cadence Tests: 9 passed, 0 failed")
