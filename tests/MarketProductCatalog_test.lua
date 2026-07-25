local ProductMarket = require("../game/src/ReplicatedStorage/Modules/ProductMarket")

assert(#ProductMarket.Products == 8, "market catalog must expose all eight products")
assert(ProductMarket.GetProduct("SlagBioEnhancer") ~= nil,
	"slag bio-enhancer must remain orderable")
assert(ProductMarket.GetProduct("ConstructionAggregate") ~= nil,
	"construction aggregate must remain orderable")

local aggregate = ProductMarket.GetProduct("ConstructionAggregate")
assert(type(aggregate.requiredSlag) == "table" and aggregate.requiredSlag.residue == 1,
	"aggregate must consume one residue unit per order unit")

print("Market Product Catalog Tests: 4 passed, 0 failed")
