local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(type(DataTemplate.siliconPurification) == "table", "silicon pipeline must be persistent")
assert(type(DataTemplate.siliconPurification.products) == "table", "silicon products must be persisted")
assert(type(DataTemplate.siliconPurification.completedStages) == "table", "completed silicon stages must be persisted")
assert(DataTemplate.siliconPurification.activeStage == nil, "new players must have no active silicon stage")

print("Silicon Persistence Tests: 4 passed, 0 failed")
