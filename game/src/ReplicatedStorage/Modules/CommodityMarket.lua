-- Shared server-side commodity price state.
-- The client may display prices, but only this module's current price is
-- authoritative for a transaction.
local CommodityMarket = {}

CommodityMarket.BasePrices = {
	Iron = 100,
	Copper = 150,
	Gold = 500,
	Vanadium = 300,
	Tungsten = 400,
	Aluminum = 80,
	Carbon = 60,
	Nitrogen = 70,
}

local currentPrices = {}
for commodity, price in pairs(CommodityMarket.BasePrices) do
	currentPrices[commodity] = price
end

function CommodityMarket.GetBasePrices()
	return CommodityMarket.BasePrices
end

function CommodityMarket.GetCurrentPrice(commodity)
	return currentPrices[commodity]
end

function CommodityMarket.SetCurrentPrice(commodity, price)
	if type(commodity) ~= "string" or type(price) ~= "number"
		or price ~= price or price <= 0 or price == math.huge then
		return false
	end
	if not CommodityMarket.BasePrices[commodity] then return false end
	currentPrices[commodity] = price
	return true
end

return CommodityMarket
