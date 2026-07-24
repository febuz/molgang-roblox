--[[
	MarketDynamics.server.lua
	MOLGANG Market Price Fluctuation System

	Prices adjust based on:
	- Supply (how much players have)
	- Demand (how much players want to buy)
	- Global market transactions
	- Rarity tiers
	- Time-based oscillation
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local CommodityMarket = require(ReplicatedStorage.Modules.CommodityMarket)
local MarketTransactionLedger = require(ReplicatedStorage.Modules.MarketTransactionLedger)

-- ═══════════════════════════════════════════════
-- MARKET STATE
-- ═══════════════════════════════════════════════

local marketStore = DataStoreService:GetDataStore("MOLGANG_Market_v1")

-- Base prices for commodities
local BASE_PRICES = CommodityMarket.GetBasePrices()

-- Market state tracking
local marketState = {
	-- Price history: {commodity = {prices}}
	priceHistory = {},
	-- Last update timestamp
	lastUpdate = os.time(),
}

-- Initialize market state
for commodity, basePrice in pairs(BASE_PRICES) do
	marketState.priceHistory[commodity] = {basePrice}
end

-- ═══════════════════════════════════════════════
-- PRICE CALCULATION
-- ═══════════════════════════════════════════════

local function calculatePrice(commodity, time)
	if not marketState.priceHistory[commodity] then return BASE_PRICES[commodity] end

	local basePrice = BASE_PRICES[commodity]
	local priceHistory = marketState.priceHistory[commodity]
	local currentPrice = priceHistory[#priceHistory] or basePrice

	-- Get transaction data
	local txn = MarketTransactionLedger.Get(commodity)

	-- Demand factor: if more people buying, price goes up
	local demandFactor = 1 + (txn.bought - txn.sold) / 100

	-- Supply factor: natural oscillation based on time
	local timeOscillation = 1 + math.sin(time / 60) * 0.1

	-- Random fluctuation (market noise)
	local noise = 1 + (math.random() - 0.5) * 0.05

	-- Calculate new price
	local newPrice = currentPrice * demandFactor * timeOscillation * noise

	-- Clamp price: 50% - 200% of base price
	newPrice = math.max(basePrice * 0.5, math.min(basePrice * 2, newPrice))

	return math.floor(newPrice)
end

-- ═══════════════════════════════════════════════
-- MARKET UPDATE LOOP
-- ═══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(30)  -- Update prices every 30 seconds

		local now = os.time()

		-- Update all commodity prices
		for commodity, basePrice in pairs(BASE_PRICES) do
		local newPrice = calculatePrice(commodity, now)
		CommodityMarket.SetCurrentPrice(commodity, newPrice)

			-- Record in history
			table.insert(marketState.priceHistory[commodity], newPrice)

			-- Keep only last 30 price points (10 minutes history)
			if #marketState.priceHistory[commodity] > 30 then
				table.remove(marketState.priceHistory[commodity], 1)
			end

		end

		-- Reset demand/supply counters once per market hour.
		if (now - (marketState.lastUpdate or now)) >= 3600 then
			MarketTransactionLedger.Reset()
		end

		marketState.lastUpdate = now

		-- Announce price changes to all players
		local priceUpdate = {}
		for commodity, prices in pairs(marketState.priceHistory) do
			priceUpdate[commodity] = prices[#prices]
		end

		Remotes.FireAllClients("MarketPricesUpdated", priceUpdate)
	end
end)

-- ═══════════════════════════════════════════════
-- PRICE LOOKUP
-- ═══════════════════════════════════════════════

local function getCurrentPrice(commodity)
	return CommodityMarket.GetCurrentPrice(commodity)
end

local function getPriceHistory(commodity)
	return marketState.priceHistory[commodity] or {}
end

-- ═══════════════════════════════════════════════
-- TRANSACTION RECORDING
-- ═══════════════════════════════════════════════

-- ═════════════════════════════════════════════════
-- PUBLIC API
-- ═════════════════════════════════════════════════

return {
	GetCurrentPrice = getCurrentPrice,
	GetPriceHistory = getPriceHistory,
	GetMarketState = function() return marketState end,
	RecordTransaction = MarketTransactionLedger.Record,
}
