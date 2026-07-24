Color3 = { fromRGB = function(r, g, b) return { r = r, g = g, b = b } end }
local SiliconPurification = require("../game/src/ReplicatedStorage/Modules/SiliconPurification")

local data = {
	molecules = { V2O5 = 10 },
	siliconPurification = { products = { Si28_Wafer_9N = 4 } },
}
local ok, reason = SiliconPurification.CanBuildQuantumComputer(data)
assert(ok, reason)

data.molecules.V2O5 = 9
ok = SiliconPurification.CanBuildQuantumComputer(data)
assert(not ok, "quantum computer must require V2O5 from molecule inventory")

print("Silicon Purification Tests: 2 passed, 0 failed")
