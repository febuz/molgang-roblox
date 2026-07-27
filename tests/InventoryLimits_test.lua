local InventoryLimits = require("../game/src/ReplicatedStorage/Modules/InventoryLimits")

assert(InventoryLimits.GetAtomCapacity({offices = 0}) == 500, "base capacity must be 500")
assert(InventoryLimits.GetAtomCapacity({offices = 2}) == 600, "offices must add 50 slots each")
assert(InventoryLimits.CountAtoms({H = 3, O = 2}) == 5, "atom counts must be summed")
assert(InventoryLimits.GetFreeAtomSlots({H = 499}, {offices = 0}) == 1, "free slots must be accurate")
assert(InventoryLimits.CanAddAtoms({H = 499}, {offices = 0}, 1), "last slot must be usable")
assert(not InventoryLimits.CanAddAtoms({H = 499}, {offices = 0}, 2), "capacity overflow must be rejected")

print("Inventory Limits Tests: 6 passed, 0 failed")
