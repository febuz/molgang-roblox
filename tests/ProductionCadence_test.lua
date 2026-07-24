local Facilities = require("../game/src/ReplicatedStorage/Modules/Facilities")

assert(Facilities.GetFacility("Mine").productionTime == 60, "mine cadence must be 60 seconds")
assert(Facilities.GetFacility("Factory").productionTime == 120, "factory cadence must be 120 seconds")
assert(Facilities.GetFacility("Factory").productionTime > Facilities.GetFacility("Mine").productionTime,
	"factory must not run at the mine cadence")
assert(Facilities.CalculateProduction({mines = 1, factories = 1}).atoms == 10,
	"mine capacity must remain 10 atoms per cycle")
assert(Facilities.CalculateProduction({mines = 1, factories = 1}).molecules == 5,
	"factory capacity must remain 5 molecules per factory cycle")

print("Production Cadence Tests: 5 passed, 0 failed")
