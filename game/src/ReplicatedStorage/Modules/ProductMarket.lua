--[[
	ProductMarket.lua
	MOLGANG — Product Sales Market for Refined Metals & Chemicals

	Players sell finished products from their processing:
	- V2O5 (Vanadium Pentoxide) — most valuable, used in steel alloys
	- Fe2O3 (Iron Oxide) — construction, pigments
	- TiO2 (Titanium Dioxide) — paint, cosmetics, sunscreen
	- Cr2O3 (Chromium Oxide) — pigments, refractory
	- MnO2 (Manganese Dioxide) — batteries, ceramics
	- CaSiO3 (Calcium Silicate) — construction, insulation
	- Slag Bio-Enhancer — premium fertilizer product

	Market prices fluctuate based on supply/demand (game-simulated).
	Closes the business loop: mine → process → sell → profit.

	Real-world price basis (per ton):
	- V2O5: $12,000-18,000/t (2024 market)
	- TiO2: $3,000-4,000/t
	- Fe2O3: $100-200/t
	- Cr2O3: $5,000-8,000/t
]]

local ProductMarket = {}

-- ═══════════════════════════════════════════════
-- PRODUCT DEFINITIONS & PRICING
-- ═══════════════════════════════════════════════

ProductMarket.Products = {
	{
		id = "V2O5",
		name = "Vanadium Pentoxide (V2O5)",
		formula = "V2O5",
		basePrice = 500,          -- MolCoins per unit (scaled from real ~$15K/t)
		volatility = 0.15,        -- 15% price swing
		category = "Premium Metal",
		color = Color3.fromRGB(255, 215, 0),
		description = "The gold of steel slag! Used in HSLA steel, vanadium redox batteries, catalysts.",
		realWorldPrice = "$12,000-18,000/ton",
		requiredAtoms = {V = 2, O = 5},
	},
	{
		id = "TiO2",
		name = "Titanium Dioxide (TiO2)",
		formula = "TiO2",
		basePrice = 200,
		volatility = 0.10,
		category = "Industrial Chemical",
		color = Color3.fromRGB(245, 245, 250),
		description = "Brilliant white pigment. Used in paint, sunscreen, food coloring, paper.",
		realWorldPrice = "$3,000-4,000/ton",
		requiredAtoms = {Ti = 1, O = 2},
	},
	{
		id = "Fe2O3",
		name = "Iron Oxide (Fe2O3)",
		formula = "Fe2O3",
		basePrice = 50,
		volatility = 0.08,
		category = "Bulk Metal",
		color = Color3.fromRGB(180, 60, 40),
		description = "Iron ore concentrate. Recyclable to steelmaking or used as pigment.",
		realWorldPrice = "$100-200/ton",
		requiredAtoms = {Fe = 2, O = 3},
	},
	{
		id = "Cr2O3",
		name = "Chromium Oxide (Cr2O3)",
		formula = "Cr2O3",
		basePrice = 300,
		volatility = 0.12,
		category = "Specialty Chemical",
		color = Color3.fromRGB(68, 180, 68),
		description = "Bright green pigment. Used in paints, ceramics, refractory bricks.",
		realWorldPrice = "$5,000-8,000/ton",
		requiredAtoms = {Cr = 2, O = 3},
	},
	{
		id = "MnO2",
		name = "Manganese Dioxide (MnO2)",
		formula = "MnO2",
		basePrice = 120,
		volatility = 0.10,
		category = "Battery Material",
		color = Color3.fromRGB(50, 50, 55),
		description = "Essential for alkaline batteries, water treatment, ceramics.",
		realWorldPrice = "$1,500-2,500/ton",
		requiredAtoms = {Mn = 1, O = 2},
	},
	{
		id = "Al2O3",
		name = "Aluminium Oxide (Al2O3)",
		formula = "Al2O3",
		basePrice = 80,
		volatility = 0.08,
		category = "Industrial Chemical",
		color = Color3.fromRGB(200, 200, 220),
		description = "Alumina. Used in aluminum smelting, abrasives, ceramics.",
		realWorldPrice = "$400-600/ton",
		requiredAtoms = {Al = 2, O = 3},
	},
	{
		id = "SlagBioEnhancer",
		name = "Slag Bio-Enhancer Fertilizer",
		formula = "CaSiO3+MgO+traces",
		basePrice = 150,
		volatility = 0.05,
		category = "Agricultural Product",
		color = Color3.fromRGB(160, 170, 140),
		description = "EU-certified biostimulant from processed slag. Premium agricultural product.",
		realWorldPrice = "€200-400/ton",
		requiredAtoms = {Ca = 2, Si = 1, Mg = 1, O = 5},
		requiresResearch = "slag_biostimulant",
	},
	{
		id = "ConstructionAggregate",
		name = "Construction Aggregate",
		formula = "Slag residue",
		basePrice = 20,
		volatility = 0.03,
		category = "Construction Material",
		color = Color3.fromRGB(120, 115, 100),
		description = "Leftover slag after metal extraction. Used as road base, concrete aggregate.",
		realWorldPrice = "€5-15/ton",
		requiredAtoms = {},  -- byproduct, no specific atoms needed
		requiredSlag = {residue = 1},
	},
}

-- ═══════════════════════════════════════════════
-- PRICE CALCULATION
-- ═══════════════════════════════════════════════

-- Dynamic pricing (fluctuates each game day)
function ProductMarket.GetCurrentPrice(productId, gameDay)
	gameDay = tonumber(gameDay) or 1
	for _, product in ipairs(ProductMarket.Products) do
		if product.id == productId then
			-- Deterministic market movement: the same product/day must produce
			-- the same quote in the UI, sale validation, and bidding systems.
			local productSeed = 0
			for index = 1, #product.id do
				productSeed = productSeed + string.byte(product.id, index) * index
			end
			local dayFactor = math.sin(gameDay * 0.3 + productSeed) * product.volatility
			local marketNoise = math.sin(gameDay * 1.7 + productSeed * 0.13) * 0.025
			local price = product.basePrice * (1 + dayFactor + marketNoise)
			return math.floor(math.max(0, price))
		end
	end
	return 0
end

function ProductMarket.ApplyMarketPriceMultiplier(productId, price, multipliers)
	local basePrice = math.max(0, tonumber(price) or 0)
	local multiplier = multipliers and tonumber(multipliers[productId]) or 1
	if not multiplier or multiplier ~= multiplier or multiplier == math.huge or multiplier == -math.huge then
		multiplier = 1
	end
	return math.max(0, basePrice * math.max(0, multiplier))
end

-- EU certification events affect only agricultural products. Keep the rule
-- pure so the server can validate before consuming inventory and tests can
-- prove that premium/penalty paths are symmetric.
function ProductMarket.GetCertificationStatus(product, effects, research)
	if not product or product.category ~= "Agricultural Product"
		or not effects or not effects.requiresCertification then
		return true
	end
	local unlocked = research and research.unlocked or {}
	return unlocked.slag_biostimulant == true or unlocked.icp_oes == true
end

function ProductMarket.ApplyCertificationPrice(product, price, effects, research)
	local basePrice = math.max(0, tonumber(price) or 0)
	if not product or product.category ~= "Agricultural Product"
		or not effects or not effects.requiresCertification then
		return basePrice
	end
	local multiplier = ProductMarket.GetCertificationStatus(product, effects, research)
		and (tonumber(effects.certifiedPricePremium) or 1)
		or (tonumber(effects.uncertifiedPricePenalty) or 1)
	return math.max(0, basePrice * math.max(0, multiplier))
end

-- Get all current prices
function ProductMarket.GetAllPrices(gameDay, multipliers)
	local prices = {}
	for _, product in ipairs(ProductMarket.Products) do
		prices[product.id] = math.floor(ProductMarket.ApplyMarketPriceMultiplier(
			product.id, ProductMarket.GetCurrentPrice(product.id, gameDay), multipliers
		) + 0.5)
	end
	return prices
end

-- Check if player has enough atoms to sell a product
function ProductMarket.CanSell(playerAtoms, productId, slagInventory)
	for _, product in ipairs(ProductMarket.Products) do
		if product.id == productId then
			for atom, count in pairs(product.requiredAtoms) do
				if (playerAtoms[atom] or 0) < count then
					return false, "Need " .. count .. "x " .. atom
				end
			end
			for residue, count in pairs(product.requiredSlag or {}) do
				if not slagInventory or (slagInventory[residue] or 0) < count then
					return false, "Need " .. count .. "x " .. residue
				end
			end
			return true, "OK"
		end
	end
	return false, "Unknown product"
end

-- Get product info
function ProductMarket.GetProduct(productId)
	for _, p in ipairs(ProductMarket.Products) do
		if p.id == productId then return p end
	end
	return nil
end

return ProductMarket
