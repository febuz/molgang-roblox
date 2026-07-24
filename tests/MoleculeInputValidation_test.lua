Color3 = {
	fromRGB = function(r, g, b)
		return { R = r / 255, G = g / 255, B = b / 255 }
	end,
}
local Chemistry = require("../game/src/ReplicatedStorage/Modules/Chemistry")

assert(Chemistry.TryBuildMolecule({ H = 2, O = 1 }) ~= nil, "valid molecule input must remain buildable")
assert(Chemistry.TryBuildMolecule({ H = -2, O = 1 }) == nil, "negative atoms must be rejected")
assert(Chemistry.TryBuildMolecule({ H = 2.5, O = 1 }) == nil, "fractional atoms must be rejected")

print("Molecule Input Validation Tests: 3 passed, 0 failed")
