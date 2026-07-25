local ProductionProfiles = require("../game/src/ReplicatedStorage/Modules/ProductionProfiles")

local starterPool = ProductionProfiles.GetAtomPool({starterBenches = 1})
assert(#starterPool == 12, "one starter bench must expose three basic-atom units")
for _, atom in ipairs(starterPool) do
	assert(atom == "H" or atom == "O" or atom == "C" or atom == "N",
		"starter bench must only produce basic feedstock")
end

local minePool = ProductionProfiles.GetAtomPool({mines = 1})
assert(#minePool == 80, "one mine must expose ten geological-atom units")
for _, atom in ipairs(minePool) do
	assert(atom ~= "Au" and atom ~= "H" and atom ~= "C" and atom ~= "N",
		"standard mine must not produce gold or laboratory feedstock")
end

local mixedPool = ProductionProfiles.GetAtomPool({starterBenches = 1, mines = 1})
assert(#mixedPool == 92, "mixed facilities must combine their production profiles")

print("Production Profiles Tests: 3 passed, 0 failed")
