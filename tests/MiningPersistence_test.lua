local MiningPersistence = require("../game/src/ReplicatedStorage/Modules/MiningPersistence")
local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(type(DataTemplate.mining) == "table", "player template must include persistent mining state")
assert(type(DataTemplate.mining.ownedPlots) == "table", "mining ownership must be persisted")
assert(type(DataTemplate.mining.plotStates) == "table", "mining plot details must be persisted")
assert(type(DataTemplate.mining.equipment) == "table", "mining equipment inventory must be persisted")

local safe = MiningPersistence.SanitizePlotState({
	explored = true,
	oreStockpile = math.huge,
	totalMined = -5,
	vanadiumPct = 1.2,
	composition = {V2O5 = math.huge, Fe3O4 = 3},
	mineEquipment = {"excavator", 42},
	forSale = true,
	askPrice = "corrupt",
})
assert(safe and safe.explored and safe.oreStockpile == 0 and safe.totalMined == 0,
	"corrupt mining quantities must reset safely")
assert(safe.vanadiumPct == 1.2 and #safe.mineEquipment == 1 and safe.forSale,
	"valid mining state must survive sanitization")
assert(safe.composition and safe.composition.V2O5 == nil and safe.composition.Fe3O4 == 3,
	"invalid composition percentages must be filtered")
assert(MiningPersistence.SanitizePlotState("corrupt") == nil,
	"non-table plot state must be skipped")

print("Mining Persistence Tests: 7 passed, 0 failed")
