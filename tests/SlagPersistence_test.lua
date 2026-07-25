local SlagPersistence = require("../game/src/ReplicatedStorage/Modules/SlagPersistence")
local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(type(DataTemplate.slagInventory) == "table", "player template must include slag inventory")
assert(DataTemplate.slagInventory.residue == 0, "slag template must persist aggregate residue")

local safe = SlagPersistence.SanitizeInventory({
	chunk = 1.23456,
	crushed = -4,
	ground = math.huge,
	powder = "2.5",
	residue = "corrupt",
})
assert(safe.chunk == 1.235 and safe.crushed == 0 and safe.ground == 0,
	"slag quantities must be finite, nonnegative and rounded")
assert(safe.powder == 2.5 and safe.residue == 0,
	"valid numeric slag values must survive sanitization")
assert(SlagPersistence.SanitizeInventory("corrupt") == nil,
	"non-table slag state must be rejected")

local balance = SlagPersistence.SanitizeMassBalance({
	inputKg = 1,
	outputKg = math.huge,
	lossKg = -4,
	aggregateKg = 0.25,
	steps = {{name = 42, inputKg = 0.5, efficiency = math.huge}, "corrupt"},
})
assert(balance and balance.inputKg == 1 and balance.outputKg == 0 and balance.lossKg == 0,
	"leach mass balance must reject non-finite and negative recovery data")
assert(balance.aggregateKg == 0.25 and #balance.steps == 1 and balance.steps[1].efficiency == 0,
	"valid mass balance fields must survive recovery sanitization")
assert(SlagPersistence.SanitizeMassBalance("corrupt") == nil,
	"non-table mass balance must be rejected")

print("Slag Persistence Tests: 10 passed, 0 failed")
