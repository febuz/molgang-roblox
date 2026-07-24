local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(type(DataTemplate.npcTrust) == "table", "NPC trust must be part of persistent player data")
assert(next(DataTemplate.npcTrust) == nil, "new players must start with neutral NPC trust state")

print("NPC Trust Persistence Tests: 2 passed, 0 failed")
