local MarketOrderRules = require("../game/src/ReplicatedStorage/Modules/MarketOrderRules")

local atoms = {}
local slag = {}
MarketOrderRules.AddReservation(atoms, slag, {
	requiredAtoms = {V = 2, O = 5},
	requiredSlag = {residue = 1},
}, 3)
MarketOrderRules.AddReservation(atoms, slag, {
	requiredAtoms = {V = 1},
	requiredSlag = {residue = 2},
}, 2)
assert(atoms.V == 8 and atoms.O == 15, "reservations must aggregate shared atoms across products")
assert(slag.residue == 7, "reservations must aggregate shared residue across products")
assert(MarketOrderRules.GetAvailable({V = 10}, atoms, "V") == 2,
	"available stock must subtract every active reservation")
assert(MarketOrderRules.GetAvailable(nil, slag, "residue") == -7,
	"missing stock must not hide an over-reservation")

print("Market Order Rules Tests: 4 passed, 0 failed")
