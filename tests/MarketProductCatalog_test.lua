-- Lune does not provide Roblox's Color3 global; the catalog only needs a
-- stable placeholder for its display colors in this pure test.
if not Color3 then
	Color3 = {fromRGB = function(r, g, b) return {R = r / 255, G = g / 255, B = b / 255} end}
end

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
