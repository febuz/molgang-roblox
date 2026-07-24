local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(type(DataTemplate.elementsFound) == "table", "element discoveries must persist in the canonical field")
assert(type(DataTemplate.atoms) == "table", "atom inventory must be present for recipe refresh")
assert(type(DataTemplate.research) == "table", "research progression must persist")
assert(type(DataTemplate.research.unlocked) == "table", "research unlocks must have a stable set")
assert(DataTemplate.carbonCredits == 0, "carbon credits must have a persistent numeric default")

print("Progression Schema Tests: 5 passed, 0 failed")
