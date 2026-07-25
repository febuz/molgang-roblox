-- Lune tests for the OTAP process safety and concentration model.
-- selene: allow(incorrect_standard_library_use)
Color3 = {
	fromRGB = function(r, g, b)
		return {R = r / 255, G = g / 255, B = b / 255}
	end,
}

local ProcessEngineering = require("../game/src/ReplicatedStorage/Modules/ProcessEngineering")
local SteelSlag = require("../game/src/ReplicatedStorage/Modules/SteelSlag")

local safe, code = ProcessEngineering.ValidateOperatingEnvelope({
	temperature = 25, pressure = 300, pH = 7, flowRate = 10,
})
assert(not safe and code == "OVERPRESSURE", "overpressure must trip the interlock")

local normal = ProcessEngineering.ValidateOperatingEnvelope({
	temperature = 65, pressure = 101.325, pH = 2, flowRate = 10,
})
assert(normal, "normal leaching conditions must be accepted")

local invalidTemp, invalidTempCode = ProcessEngineering.ValidateOperatingEnvelope({
	temperature = math.huge, pressure = 101.325, pH = 7, flowRate = 10,
})
assert(not invalidTemp and invalidTempCode == "INVALID_TEMPERATURE", "infinite temperature must trip the interlock")

local invalidPH, invalidPHCode = ProcessEngineering.ValidateOperatingEnvelope({
	temperature = 25, pressure = 101.325, pH = -math.huge, flowRate = 10,
})
assert(not invalidPH and invalidPHCode == "INVALID_PH", "infinite pH must trip the interlock")
assert(ProcessEngineering.ReagentPHFactor({pH = 1}, math.huge) == 0.25,
	"invalid pH must not influence reagent selectivity")

local acid = {pH = 1}
assert(ProcessEngineering.ReagentPHFactor(acid, 1) == 1, "on-setpoint acid must be full strength")
assert(ProcessEngineering.ReagentPHFactor(acid, 7) < 1, "off-setpoint acid must lose selectivity")
assert(ProcessEngineering.CalculateRecoveryFactor(0.8, 1, 1) == 0.8,
	"normal recovery must preserve process and pH factors")
assert(math.abs(ProcessEngineering.CalculateRecoveryFactor(0.8, 1, 0.75) - 0.6) < 0.000001,
	"drought efficiency must reduce leach recovery")
assert(ProcessEngineering.CalculateRecoveryFactor(0.9, 1, 1.2) == 0.95,
	"breakthrough recovery must respect the physical upper bound")
local productRecovery = ProcessEngineering.CalculateProductRecoveryFactor(0.8, 1, 1)
assert(math.abs(productRecovery - (0.8 * 0.98 * 0.95)) < 0.000001,
	"product recovery must include filtration and precipitation losses")
assert(not ProcessEngineering.IsFiniteNumber(math.huge), "infinite controls must be rejected")
assert(not ProcessEngineering.IsFiniteNumber(-math.huge), "negative infinite controls must be rejected")
assert(not ProcessEngineering.IsFiniteNumber(0 / 0), "NaN controls must be rejected")
assert(ProcessEngineering.IsFiniteNumber(25), "finite controls must be accepted")

local balance = ProcessEngineering.CreateMassBalance()
ProcessEngineering.AddStep(balance, "Crushing", 1.0, 0.99, 0.01)
ProcessEngineering.AddStep(balance, "Separation", 0.99, 0.87, 0.12)
ProcessEngineering.AddStep(balance, "Leaching", 0.87, 0.50, 0.37)
ProcessEngineering.AddStep(balance, "Filtration", 0.50, 0.49, 0.01)
assert(balance.inputKg == 1, "mass balance must start with one kilogram feed")
assert(balance.outputKg > 0, "mass balance must retain a product stream")
assert(balance.lossKg >= -0.001 and balance.lossKg <= 0.001,
	"serial process steps must conserve mass within rounding tolerance")
assert(balance.recovery > 0 and balance.recovery < 100,
	"recovery must describe final product versus original feed")

local pipeline = ProcessEngineering.CalculateSlagMassBalance("powder", "H2SO4", 65, SteelSlag)
assert(pipeline.inputKg == 1, "full slag pipeline must use one kilogram feed")
assert(pipeline.lossKg >= -0.001 and pipeline.lossKg <= 0.001,
	"full slag pipeline must conserve mass")
assert(#pipeline.steps == 5, "full slag pipeline must report all five stages")
assert(pipeline.aggregateKg > 0 and pipeline.aggregateKg < pipeline.inputKg,
	"aggregate residue must be a positive substream of the feed")

local postSepMasses, postSepTotal, magneticRecovery = SteelSlag.GetPostMagneticSeparationMasses(1)
assert(math.abs(postSepTotal - 0.87) < 0.000001 and math.abs(magneticRecovery - 0.12) < 0.000001,
	"pre-treatment mass stream must remove dust and magnetic iron")
assert(postSepMasses.FeO < 0.06,
	"magnetic separation must reduce the FeO mass reaching the leach tank")
local _, doubleBatchTotal, doubleBatchRecovery = SteelSlag.GetPostMagneticSeparationMasses(2)
assert(math.abs(doubleBatchTotal - 1.74) < 0.000001
	and math.abs(doubleBatchRecovery - 0.24) < 0.000001,
	"pre-treatment mass streams must scale with batch weight")
local hotYield = SteelSlag.CalculateYield("powder", "H2SO4", 1, 65)
for _, entry in ipairs(hotYield) do
	if entry.oxide == "FeO" then
		assert(entry.gramsExtracted < 50,
			"product yield must not recreate magnetically recovered iron")
	end
end

local chunk = ProcessEngineering.CalculateSlagMassBalance("chunk", "H2SO4", 65, SteelSlag)
local crushed = ProcessEngineering.CalculateSlagMassBalance("crushed", "H2SO4", 65, SteelSlag)
local ground = ProcessEngineering.CalculateSlagMassBalance("ground", "H2SO4", 65, SteelSlag)
assert(chunk.outputKg < crushed.outputKg and crushed.outputKg < ground.outputKg,
	"smaller particles must improve leach product yield")
assert(chunk.lossKg >= -0.001 and ground.lossKg >= -0.001,
	"particle-size leaching must conserve mass")
local cold = ProcessEngineering.CalculateSlagMassBalance("ground", "H2SO4", 25, SteelSlag)
assert(cold.outputKg < ground.outputKg,
	"higher operating temperature must improve extraction yield")
local coldYield = SteelSlag.CalculateYield("ground", "H2SO4", 1, 25)
hotYield = SteelSlag.CalculateYield("ground", "H2SO4", 1, 65)
local function totalExtracted(entries)
	local total = 0
	for _, entry in ipairs(entries) do
		total = total + entry.gramsExtracted
	end
	return total
end
assert(totalExtracted(coldYield) < totalExtracted(hotYield),
	"actual product yield must follow temperature-dependent extraction")

local baseMinutes = SteelSlag.CalculateLeachTime("ground", "H2SO4")
local coldDuration, coldRate = ProcessEngineering.CalculateEffectiveLeachDuration(baseMinutes, "H2SO4", {
	temperature = 25, pressure = 101.325, flowRate = 10, reactorVolume = 50,
}, 1)
local hotDuration, hotRate = ProcessEngineering.CalculateEffectiveLeachDuration(baseMinutes, "H2SO4", {
	temperature = 65, pressure = 101.325, flowRate = 10, reactorVolume = 50,
}, 1)
assert(hotDuration < coldDuration and hotRate > coldRate,
	"higher leach temperature must shorten duration and increase rate")
local slowDuration = ProcessEngineering.CalculateEffectiveLeachDuration(baseMinutes, "H2SO4", {
	temperature = 25, pressure = 101.325, flowRate = 50, reactorVolume = 50,
}, 1)
assert(slowDuration > coldDuration,
	"higher flow must reduce residence time and slow leaching")

assert(ProcessEngineering.CalculateProcessWaterCost(50, 1, false) == 50,
	"normal leaching must charge base process-water cost")
assert(ProcessEngineering.CalculateProcessWaterCost(50, 1.8, false) == 90,
	"drought must increase process-water cost")
assert(ProcessEngineering.CalculateProcessWaterCost(50, 1.8, true) == 45,
	"water treatment must recycle half the drought-adjusted cost")
assert(ProcessEngineering.CalculateProcessWaterCost(-1, 1, false) == 0,
	"invalid water cost must not charge coins")

print("Process Engineering Tests: 31 passed, 0 failed")
