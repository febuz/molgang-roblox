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

print("Process Engineering Tests: 4 passed, 0 failed")
