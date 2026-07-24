local ProcessEngineering = require("../game/src/ReplicatedStorage/Modules/ProcessEngineering")

local source = {
	{oxide = "V2O5", atomCount = 1, gramsExtracted = 8},
	{oxide = "FeO", atomCount = 10, gramsExtracted = 120},
}
local low = ProcessEngineering.ApplyRecovery(source, 0.15)
assert(#low == 1, "sub-atom recovery must not create a product entry")
assert(low[1].oxide == "FeO" and low[1].atomCount == 1, "recoverable atoms must be floored, not rounded up")
assert(low[1].idealAtomCount == 10 and low[1].idealGramsExtracted == 120, "ideal yield must remain auditable")

local none = ProcessEngineering.ApplyRecovery(source, 0)
assert(#none == 0, "zero recovery must produce no inventory atoms")

print("Recovery Rounding Tests: 4 passed, 0 failed")
