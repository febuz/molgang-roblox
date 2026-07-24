-- Lune does not provide Roblox's Color3 global; product definitions only need
-- a placeholder here because these tests exercise pure pricing rules.
if not Color3 then
	Color3 = {fromRGB = function(r, g, b) return {R = r / 255, G = g / 255, B = b / 255} end}
end
local ProductMarket = require("../game/src/ReplicatedStorage/Modules/ProductMarket")

local quoteA = ProductMarket.GetCurrentPrice("V2O5", 7)
local quoteB = ProductMarket.GetCurrentPrice("V2O5", 7)
assert(quoteA == quoteB, "same product and game day must have a stable market quote")

local product = ProductMarket.GetProduct("SlagBioEnhancer")
local effects = {
	requiresCertification = true,
	certifiedPricePremium = 1.30,
	uncertifiedPricePenalty = 0.70,
}

assert(not ProductMarket.GetCertificationStatus(product, effects, {unlocked = {}}),
	"uncertified fertilizer must be excluded during the EU event")
assert(ProductMarket.GetCertificationStatus(product, effects, {unlocked = {icp_oes = true}}),
	"ICP-OES research must satisfy certification")
assert(ProductMarket.ApplyCertificationPrice(product, 100, effects, {unlocked = {icp_oes = true}}) == 130,
	"certified fertilizer must receive the event premium")
assert(ProductMarket.ApplyCertificationPrice(product, 100, effects, {unlocked = {}}) == 70,
	"uncertified fertilizer price preview must show the penalty")
assert(ProductMarket.ApplyMarketPriceMultiplier("V2O5", 100, {V2O5 = 1.45}) == 145,
	"world price event must change the visible product price")
assert(ProductMarket.ApplyMarketPriceMultiplier("V2O5", 100, nil) == 100,
	"no world price event must preserve the base price")
print("ProductMarket certification tests: 7 passed")
