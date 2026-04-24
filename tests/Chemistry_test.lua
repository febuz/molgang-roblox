--[[
	Chemistry_test.lua
	MOLGANG — Unit tests for Chemistry module (#97)

	Run via Roblox TestService or TestEZ framework.
	Validates molecule recipes, valence data, and synthesis logic.
]]

-- Mock require (for standalone testing)
local Chemistry = require(game.ReplicatedStorage.Modules.Chemistry)

local passCount = 0
local failCount = 0

local function assert_eq(actual, expected, testName)
	if actual == expected then
		passCount = passCount + 1
	else
		failCount = failCount + 1
		warn("FAIL: " .. testName .. " — expected " .. tostring(expected) .. ", got " .. tostring(actual))
	end
end

local function assert_true(condition, testName)
	if condition then
		passCount = passCount + 1
	else
		failCount = failCount + 1
		warn("FAIL: " .. testName)
	end
end

-- ═══════════════════════════════════════════════
-- TEST: Valence data exists for key elements
-- ═══════════════════════════════════════════════

assert_eq(Chemistry.Valence.H, 1, "Hydrogen valence = 1")
assert_eq(Chemistry.Valence.O, 2, "Oxygen valence = 2")
assert_eq(Chemistry.Valence.C, 4, "Carbon valence = 4")
assert_eq(Chemistry.Valence.V, 5, "Vanadium valence = 5")
assert_eq(Chemistry.Valence.Fe, 2, "Iron valence = 2")
assert_eq(Chemistry.Valence.Na, 1, "Sodium valence = 1")
assert_eq(Chemistry.Valence.Cl, 1, "Chlorine valence = 1")

-- ═══════════════════════════════════════════════
-- TEST: Molecules have required fields
-- ═══════════════════════════════════════════════

for molName, recipe in pairs(Chemistry.Molecules) do
	assert_true(recipe.atoms ~= nil, molName .. " has atoms field")
	assert_true(recipe.points ~= nil, molName .. " has points field")
	assert_true(recipe.name ~= nil, molName .. " has name field")
	assert_true(recipe.points > 0, molName .. " points > 0")

	-- Every atom in recipe must have a valence entry
	for sym, count in pairs(recipe.atoms) do
		assert_true(Chemistry.Valence[sym] ~= nil, molName .. " atom " .. sym .. " has valence")
		assert_true(count > 0, molName .. " atom " .. sym .. " count > 0")
	end
end

-- ═══════════════════════════════════════════════
-- TEST: Key molecules exist
-- ═══════════════════════════════════════════════

assert_true(Chemistry.Molecules.H2O ~= nil, "H2O exists")
assert_true(Chemistry.Molecules.V2O5 ~= nil, "V2O5 exists")
assert_true(Chemistry.Molecules.NaCl ~= nil, "NaCl exists")
assert_true(Chemistry.Molecules.H2SO4 ~= nil, "H2SO4 exists")
assert_true(Chemistry.Molecules.MolCrystal ~= nil, "MolCrystal (legendary) exists")

-- ═══════════════════════════════════════════════
-- TEST: H2O recipe is correct
-- ═══════════════════════════════════════════════

assert_eq(Chemistry.Molecules.H2O.atoms.H, 2, "H2O needs 2 hydrogen")
assert_eq(Chemistry.Molecules.H2O.atoms.O, 1, "H2O needs 1 oxygen")
assert_eq(Chemistry.Molecules.H2O.name, "Water", "H2O is Water")

-- ═══════════════════════════════════════════════
-- TEST: V2O5 recipe is correct
-- ═══════════════════════════════════════════════

assert_eq(Chemistry.Molecules.V2O5.atoms.V, 2, "V2O5 needs 2 vanadium")
assert_eq(Chemistry.Molecules.V2O5.atoms.O, 5, "V2O5 needs 5 oxygen")
assert_true(Chemistry.Molecules.V2O5.points >= 1000, "V2O5 is a high-value product")

-- ═══════════════════════════════════════════════
-- RESULTS
-- ═══════════════════════════════════════════════

print("═══════════════════════════════════════════")
print(string.format("Chemistry Tests: %d passed, %d failed", passCount, failCount))
print("═══════════════════════════════════════════")
