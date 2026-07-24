-- Lune tests for the OTAP process safety and concentration model.
-- selene: allow(incorrect_standard_library_use)
Color3 = {
	fromRGB = function(r, g, b)
		return {R = r / 255, G = g / 255, B = b / 255}
	end,
}

local ProcessEngineering = require("../game/src/ReplicatedStorage/Modules/ProcessEngineering")

local safe, code = ProcessEngineering.ValidateOperatingEnvelope({
	temperature = 25, pressure = 300, pH = 7, flowRate = 10,
})
assert(not safe and code == "OVERPRESSURE", "overpressure must trip the interlock")

local normal = ProcessEngineering.ValidateOperatingEnvelope({
	temperature = 65, pressure = 101.325, pH = 2, flowRate = 10,
})
assert(normal, "normal leaching conditions must be accepted")

local acid = {pH = 1}
assert(ProcessEngineering.ReagentPHFactor(acid, 1) == 1, "on-setpoint acid must be full strength")
assert(ProcessEngineering.ReagentPHFactor(acid, 7) < 1, "off-setpoint acid must lose selectivity")

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

print("Process Engineering Tests: 8 passed, 0 failed")
