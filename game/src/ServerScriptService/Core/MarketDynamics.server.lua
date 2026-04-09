--[[
	MarketDynamics.server.lua
	MOLGANG Dynamic Pricing System

	Implements real-time market with supply/demand-based pricing
	- Tracks buy/sell orders
	- Calculates prices dynamically
	- Broadcasts updates to clients
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- MARKET STATE
-- ══════════════════════════════════════════════

local marketState = {
	-- Key commodities (element symbols + molecule names)
	commodities = {"H", "O", "C", "N", "Fe", "H2O", "CO2", "H2SO4"},

	-- Price tracking: {symbol = {basePrice, currentPrice, history={}}}
	prices = {},

	-- Order books: {symbol = {buyOrders={}, sellOrders={}}}
	orders = {},

	-- Supply/demand trackers
	supplyDemand = {},  -- {symbol = {buyers, sellers}}
}

-- Initialize commodities
for _, symbol in ipairs(marketState.commodities) do
	marketState.prices[symbol] = {
		base = 100,
		current = 100,
		history = {},
		lastUpdate = os.time(),
	}
	marketState.orders[symbol] = {buyOrders = {}, sellOrders = {}}
	marketState.supplyDemand[symbol] = {buyers = 0, sellers = 0}
end

-- ══════════════════════════════════════════════
-- PRICE CALCULATION
-- ══════════════════════════════════════════════

local function calculatePrice(symbol)
	local basePrice = marketState.prices[symbol].base
	local sd = marketState.supplyDemand[symbol]

	-- Supply/demand factor: if many buyers and few sellers, price rises
	-- Formula: (buyers - sellers) / 100 creates normalized factor
	local sdFactor = 1.0 + ((sd.buyers - sd.sellers) / 100)
	sdFactor = math.max(0.5, math.min(2.0, sdFactor))  -- Clamp 0.5x to 2.0x

	-- Time oscillation for daily cycles (sin wave over 10 minutes)
	local timeOscillation = 1.0 + (math.sin(os.time() / 600) * 0.15)

	-- Random noise (±5%)
	local noise = 1.0 + (math.random() * 0.1 - 0.05)

	local finalPrice = basePrice * sdFactor * timeOscillation * noise

	-- Clamp to reasonable bounds
	finalPrice = math.max(basePrice * 0.5, math.min(basePrice * 2.0, finalPrice))

	return math.floor(finalPrice)
end

local function updateAllPrices()
	for _, symbol in ipairs(marketState.commodities) do
		local newPrice = calculatePrice(symbol)
		marketState.prices[symbol].current = newPrice
		table.insert(marketState.prices[symbol].history, newPrice)

		-- Keep last 30 entries for history
		if #marketState.prices[symbol].history > 30 then
			table.remove(marketState.prices[symbol].history, 1)
		end

		marketState.prices[symbol].lastUpdate = os.time()
	end

	-- Broadcast to all clients
	local priceData = {}
	for _, symbol in ipairs(marketState.commodities) do
		priceData[symbol] = {
			current = marketState.prices[symbol].current,
			base = marketState.prices[symbol].base,
			history = marketState.prices[symbol].history,
		}
	end
	Remotes.FireAllClients("MarketPricesUpdated", priceData)
end

-- ══════════════════════════════════════════════
-- TRADE EXECUTION
-- ══════════════════════════════════════════════

-- This will be called from requests
-- For now, just stub it - actual trade matching would be here
local function executeTrade(player, side, symbol, quantity, pricePerUnit)
	print("[MarketDynamics]", player.Name, "trade request:", side, symbol, "x" .. quantity, "@", pricePerUnit)
	-- TODO: Implement order matching + inventory transfers
end

-- ══════════════════════════════════════════════
-- MARKET UPDATES (periodic)
-- ══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(30)  -- Update prices every 30 seconds
		updateAllPrices()
	end
end)

-- Initial broadcast
task.wait(2)  -- Let clients load
updateAllPrices()

print("[MarketDynamics] Initialized with", #marketState.commodities, "commodities")
