-- Lune tests for stoichiometric fertilizer crafting and Liebig yield logic.
-- selene: allow(incorrect_standard_library_use)
Color3 = {
	fromRGB = function(r, g, b)
		return {R = r / 255, G = g / 255, B = b / 255}
	end,
}

local FertilizerTrack = require("../game/src/ReplicatedStorage/Modules/FertilizerTrack")

local missing = FertilizerTrack.GetMissingAtoms({C = 1, O = 1, N = 1, H = 4}, "urea")
assert(missing.N == 1, "urea must report missing nitrogen feedstock")

local inventory = {C = 1, O = 1, N = 2, H = 4}
local consumed = FertilizerTrack.ConsumeAtoms(inventory, "urea")
assert(consumed, "urea batch must consume a complete stoichiometric feed")
assert(next(inventory) == nil, "consuming urea must remove all required atoms")

local high = FertilizerTrack.CalculateYield({N = 120, P = 40, K = 40}, "wheat")
local limiting = FertilizerTrack.CalculateYield({N = 120, P = 4, K = 40}, "wheat")
assert(high > limiting, "Liebig yield must be limited by the scarcest nutrient")
local optimalPH = FertilizerTrack.CalculateYield({N = 120, P = 40, K = 40}, "wheat", 6.8)
local stressedPH = FertilizerTrack.CalculateYield({N = 120, P = 40, K = 40}, "wheat", 3.0)
assert(optimalPH > stressedPH, "crop yield must reflect pH stress outside the ideal range")

print("Fertilizer Tests: 5 passed, 0 failed")
