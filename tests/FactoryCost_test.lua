Color3 = {
	fromRGB = function(r, g, b)
		return {R = r / 255, G = g / 255, B = b / 255}
	end,
}

local FactoryEquipment = require("../game/src/ReplicatedStorage/Modules/FactoryEquipment")
local placements = {{itemId = "jaw_crusher"}}
local normal, normalRent, normalMaintenance = FactoryEquipment.CalculateMonthlyCostWithMultiplier(placements, 1)
local reduced, reducedRent, reducedMaintenance = FactoryEquipment.CalculateMonthlyCostWithMultiplier(placements, 0.8)
assert(normal == normalRent + normalMaintenance, "normal factory cost must reconcile")
assert(reduced == reducedRent + reducedMaintenance, "event factory cost must reconcile")
assert(reducedRent == normalRent, "automation must not change fixed rent")
assert(reducedMaintenance < normalMaintenance, "automation must reduce maintenance")

print("Factory Cost Tests: 4 passed, 0 failed")
