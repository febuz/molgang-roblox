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
assert(FertilizerTrack.GetFertilizer("ammonium_sulfate").phEffect < 0,
	"ammonium sulfate must model acidifying soil chemistry")
assert(FertilizerTrack.GetFertilizer("slag_fertilizer").phEffect > 0,
	"slag bio-enhancer must model liming effect")
assert(FertilizerTrack.ApplyYieldMultiplier(100, 1) == 100,
	"normal crop yield must remain unchanged")
assert(FertilizerTrack.ApplyYieldMultiplier(100, 1.4) == 140,
	"ideal growing season must increase crop yield")
assert(FertilizerTrack.ApplyYieldMultiplier(150, 2) == 200,
	"event stacking must respect the crop yield cap")
assert(FertilizerTrack.ApplyDemandMultiplier(100, 1) == 100,
	"normal fertilizer demand must preserve sale price")
assert(FertilizerTrack.ApplyDemandMultiplier(100, 1.6) == 160,
	"high fertilizer demand must increase sale price")
assert(FertilizerTrack.ApplyDemandMultiplier(100, 0.8) == 80,
	"low fertilizer demand must reduce sale price")

local crisisPlot = {soilType = "loam", soilName = "Loam Soil", tested = true, fertilized = true}
assert(FertilizerTrack.ApplyContaminatedSoil(crisisPlot),
	"Act 3 must expose a canonical contaminated-soil transition")
assert(crisisPlot.soilType == "contaminated" and crisisPlot.pH == 3.0,
		"contaminated soil must reset to its authored chemistry")
assert(crisisPlot.nutrients.N == 5 and crisisPlot.nutrients.P == 3 and crisisPlot.nutrients.K == 5,
		"contaminated soil must use the low-nutrient baseline")
assert(#crisisPlot.contaminants == 3 and crisisPlot.contaminants[1] == "Cr",
		"contaminated soil must carry the heavy-metal sample")

print("Fertilizer Tests: 17 passed, 0 failed")
