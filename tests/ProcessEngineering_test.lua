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

assert(ProcessEngineering.CalculateProcessWaterCost(50, 1, false) == 50,
	"normal leaching must charge base process-water cost")
assert(ProcessEngineering.CalculateProcessWaterCost(50, 1.8, false) == 90,
	"drought must increase process-water cost")
assert(ProcessEngineering.CalculateProcessWaterCost(50, 1.8, true) == 45,
	"water treatment must recycle half the drought-adjusted cost")
assert(ProcessEngineering.CalculateProcessWaterCost(-1, 1, false) == 0,
	"invalid water cost must not charge coins")

print("Process Engineering Tests: 28 passed, 0 failed")
