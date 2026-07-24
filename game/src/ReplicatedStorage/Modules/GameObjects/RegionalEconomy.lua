--[[
	RegionalEconomy.lua — country/region economy data + pure pricing logic.

	Dependency-free (no require, no Color3) so the real region data AND the
	pricing/standardization functions load and run directly under `lune`.
	This is the single source of truth for region data; Regions.lua files
	the same tables into the ObjectRegistry archetype system for in-game
	structured access — it does not duplicate the data.

	Composition: every region is DEFAULTS merged with its own overrides —
	the same "inherit a base, override what differs" idea ObjectRegistry's
	`inherits` expresses, done here in plain Lua so the module stays
	lune-loadable. A region only lists the traits where it deviates from
	the global baseline.

	Economic model (educational, deliberately simple):
	  * All in-game prices are MolCoins (one global game currency).
	  * `costOfLiving` scales what a player PAYS to buy inputs in a region.
	  * `demand[category]` scales what a player is PAID to sell outputs of
	    that category in a region — so each region's industrial character
	    (a steel hub vs an agricultural belt vs a mining region) makes
	    different products worth more there.
	  * `currency` + `eurRate` are DISPLAY / education only: they let the
	    UI render the same MolCoin value in a region's local currency so
	    players see how one value looks across currencies. They are static,
	    illustrative game constants — NOT live foreign-exchange rates and
	    not used to compute any gameplay reward. Cross-region comparison of
	    actual value is done in MolCoins, the common unit (see
	    BestRegionToSell / CheapestRegionToBuy), never on mixed currencies.
]]

local RegionalEconomy = {}

-- Baseline every region inherits, then overrides. The demand categories
-- cover every sellable thing in the game economy: refined metals (V2O5,
-- Fe2O3), industrial chemicals (TiO2, Cr2O3, MnO2, Al2O3), fertilizer
-- (Slag Bio-Enhancer + crops), construction aggregate, raw mined ore, and
-- café drinks. See PRODUCT_CATEGORY for the ProductMarket mapping.
local DEFAULTS = {
	costOfLiving = 1.0,
	demand = { metals = 1.0, chemicals = 1.0, fertilizer = 1.0, construction = 1.0, mining = 1.0, cafe = 1.0 },
	currency = { code = "EUR", symbol = "€", eurRate = 1.0 },
	flagColor = { 200, 200, 200 },
}

RegionalEconomy.CATEGORIES = { "metals", "chemicals", "fertilizer", "construction", "mining", "cafe" }

-- Maps the real ProductMarket.Products ids (read directly from
-- ProductMarket.lua, not invented) to an economy demand category, so a
-- product's regional sell price can be derived without loading that module
-- (it pulls in Color3 and isn't lune-loadable).
local PRODUCT_CATEGORY = {
	V2O5 = "metals",
	Fe2O3 = "metals",
	TiO2 = "chemicals",
	Cr2O3 = "chemicals",
	MnO2 = "chemicals",
	Al2O3 = "chemicals",
	SlagBioEnhancer = "fertilizer",
	ConstructionAggregate = "construction",
}

-- Region overrides only. Ordered for deterministic iteration.
local REGION_ORDER = { "west_europe", "north_america", "east_asia", "south_asia", "latin_america", "africa" }

local OVERRIDES = {
	west_europe = {
		name = "West Europe",
		hub = "Rotterdam–Ruhr corridor",
		costOfLiving = 1.2,
		demand = { metals = 1.1, chemicals = 1.3, fertilizer = 0.9, construction = 1.0, mining = 0.8, cafe = 1.4 },
		currency = { code = "EUR", symbol = "€", eurRate = 1.0 },
		flagColor = { 40, 80, 200 },
		industry = { "chemicals", "steel_finishing", "consumer" },
	},
	north_america = {
		name = "North America",
		hub = "Great Lakes belt",
		costOfLiving = 1.15,
		demand = { metals = 1.0, chemicals = 1.1, fertilizer = 1.1, construction = 1.2, mining = 0.9, cafe = 1.3 },
		currency = { code = "USD", symbol = "$", eurRate = 1.08 },
		flagColor = { 180, 40, 50 },
		industry = { "consumer", "agriculture", "steel" },
	},
	east_asia = {
		name = "East Asia",
		hub = "Yangtze steel belt",
		costOfLiving = 0.9,
		demand = { metals = 1.5, chemicals = 1.2, fertilizer = 1.0, construction = 1.3, mining = 1.0, cafe = 1.1 },
		currency = { code = "CNY", symbol = "¥", eurRate = 7.8 },
		flagColor = { 220, 60, 40 },
		industry = { "steel_manufacturing", "electronics" },
	},
	south_asia = {
		name = "South Asia",
		hub = "Indo-Gangetic plain",
		costOfLiving = 0.7,
		demand = { metals = 1.0, chemicals = 1.0, fertilizer = 1.4, construction = 1.2, mining = 1.0, cafe = 0.9 },
		currency = { code = "INR", symbol = "₹", eurRate = 96 },
		flagColor = { 230, 140, 30 },
		industry = { "agriculture", "textiles" },
	},
	latin_america = {
		name = "Latin America",
		hub = "Cerrado agro-mining zone",
		costOfLiving = 0.85,
		demand = { metals = 0.9, chemicals = 0.9, fertilizer = 1.3, construction = 1.0, mining = 1.4, cafe = 0.9 },
		currency = { code = "BRL", symbol = "R$", eurRate = 5.9 },
		flagColor = { 40, 160, 80 },
		industry = { "mining", "agriculture" },
	},
	africa = {
		name = "Africa",
		hub = "Bushveld complex",
		costOfLiving = 0.8,
		demand = { metals = 1.0, chemicals = 0.9, fertilizer = 1.0, construction = 1.1, mining = 1.5, cafe = 0.9 },
		currency = { code = "ZAR", symbol = "R", eurRate = 20 },
		flagColor = { 30, 120, 60 },
		industry = { "mining", "metals" },
	},
}

-- Shallow-merge one override level onto DEFAULTS, deep for the nested
-- demand/currency tables so a partial demand override still inherits the
-- baseline for categories it doesn't mention.
local function mergeRegion(override)
	local merged = {
		name = override.name,
		hub = override.hub,
		industry = override.industry,
		costOfLiving = override.costOfLiving or DEFAULTS.costOfLiving,
		flagColor = override.flagColor or DEFAULTS.flagColor,
		demand = {},
		currency = {},
	}
	for _, category in ipairs(RegionalEconomy.CATEGORIES) do
		merged.demand[category] = (override.demand and override.demand[category]) or DEFAULTS.demand[category]
	end
	local oc = override.currency or {}
	merged.currency.code = oc.code or DEFAULTS.currency.code
	merged.currency.symbol = oc.symbol or DEFAULTS.currency.symbol
	merged.currency.eurRate = oc.eurRate or DEFAULTS.currency.eurRate
	return merged
end

-- Build the flattened region table once at load.
local REGIONS = {}
for id, override in pairs(OVERRIDES) do
	REGIONS[id] = mergeRegion(override)
end

-- Region ids in a deterministic order.
function RegionalEconomy.AllRegionIds()
	local copy = table.create(#REGION_ORDER)
	table.move(REGION_ORDER, 1, #REGION_ORDER, 1, copy)
	return copy
end

-- Flattened region data (DEFAULTS + overrides), or errors on unknown id.
function RegionalEconomy.GetRegion(regionId)
	local region = REGIONS[regionId]
	if not region then
		error(("RegionalEconomy: unknown region '%s'"):format(tostring(regionId)), 0)
	end
	return region
end

-- What a player PAYS to buy an input priced `basePrice` MolCoins in a region.
function RegionalEconomy.BuyPrice(basePrice, regionId)
	assert(type(basePrice) == "number" and basePrice >= 0, "basePrice must be a non-negative number")
	return math.floor(basePrice * RegionalEconomy.GetRegion(regionId).costOfLiving + 0.5)
end

-- What a player is PAID to sell an output of `category` priced `basePrice`.
function RegionalEconomy.SellPrice(basePrice, regionId, category)
	assert(type(basePrice) == "number" and basePrice >= 0, "basePrice must be a non-negative number")
	local region = RegionalEconomy.GetRegion(regionId)
	local demand = region.demand[category]
	if not demand then
		error(("RegionalEconomy: unknown category '%s'"):format(tostring(category)), 0)
	end
	return math.floor(basePrice * demand + 0.5)
end

-- DISPLAY only: render a MolCoin amount as an approximate local-currency
-- string (MolCoin pegged 1:1 to EUR, then converted). Illustrative, not FX.
function RegionalEconomy.LocalCurrencyString(molCoins, regionId)
	assert(type(molCoins) == "number", "molCoins must be a number")
	local currency = RegionalEconomy.GetRegion(regionId).currency
	local localAmount = math.floor(molCoins * currency.eurRate + 0.5)
	return currency.symbol .. tostring(localAmount) .. " " .. currency.code
end

-- Best region to SELL an output of `category`: the one paying the most
-- MolCoins (already the common unit — no currency conversion needed, so
-- the comparison is standardized by construction). Returns id, price.
function RegionalEconomy.BestRegionToSell(basePrice, category)
	local bestId, bestPrice = nil, -1
	for _, id in ipairs(REGION_ORDER) do
		local price = RegionalEconomy.SellPrice(basePrice, id, category)
		if price > bestPrice then
			bestId, bestPrice = id, price
		end
	end
	return bestId, bestPrice
end

-- Economy demand category for a real ProductMarket product id, or nil if
-- the product isn't mapped.
function RegionalEconomy.CategoryForProduct(productId)
	return PRODUCT_CATEGORY[productId]
end

-- Regional sell price for a real ProductMarket product: composes the
-- product's category with the region's demand. Caller passes the product's
-- basePrice (from ProductMarket.Products) so this stays lune-loadable.
function RegionalEconomy.RegionalProductPrice(basePrice, regionId, productId)
	local category = PRODUCT_CATEGORY[productId]
	if not category then
		error(("RegionalEconomy: unmapped product '%s'"):format(tostring(productId)), 0)
	end
	return RegionalEconomy.SellPrice(basePrice, regionId, category)
end

-- Best region to sell a real ProductMarket product. Returns id, price.
function RegionalEconomy.BestRegionForProduct(basePrice, productId)
	local category = PRODUCT_CATEGORY[productId]
	if not category then
		error(("RegionalEconomy: unmapped product '%s'"):format(tostring(productId)), 0)
	end
	return RegionalEconomy.BestRegionToSell(basePrice, category)
end

-- Cheapest region to BUY an input priced `basePrice`. Returns id, price.
function RegionalEconomy.CheapestRegionToBuy(basePrice)
	local bestId, bestPrice = nil, math.huge
	for _, id in ipairs(REGION_ORDER) do
		local price = RegionalEconomy.BuyPrice(basePrice, id)
		if price < bestPrice then
			bestId, bestPrice = id, price
		end
	end
	return bestId, bestPrice
end

return RegionalEconomy
