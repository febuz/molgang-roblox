local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(type(DataTemplate.mining) == "table", "player template must include persistent mining state")
assert(type(DataTemplate.mining.ownedPlots) == "table", "mining ownership must be persisted")
assert(type(DataTemplate.mining.plotStates) == "table", "mining plot details must be persisted")
assert(type(DataTemplate.mining.equipment) == "table", "mining equipment inventory must be persisted")

print("Mining Persistence Tests: 4 passed, 0 failed")
