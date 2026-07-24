local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(type(DataTemplate.factory) == "table", "player template must include persistent factory state")
assert(DataTemplate.factory.rented == false, "new players must not start with a rented factory")
assert(type(DataTemplate.factory.placements) == "table", "factory placements must be persisted")
assert(type(DataTemplate.factory.equipmentInventory) == "table", "factory equipment inventory must be persisted")

print("Factory Persistence Tests: 4 passed, 0 failed")
