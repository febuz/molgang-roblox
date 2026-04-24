--[[
	ProductMarketServer.server.lua
	MOLGANG — Server-side Product Sales Handler

	Players sell refined products (V2O5, TiO2, Fe2O3, etc.) for MolCoins.
	Prices fluctuate each game day.
	Atoms are consumed from player inventory when selling.
	Revenue tracked in Profit & Loss system.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local ProductMarket = require(ReplicatedStorage.Modules.ProductMarket)
local ProfitLoss = require(ReplicatedStorage.Modules.ProfitLoss)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

local currentGameDay = 1
local playerLedgers = {}  -- {userId = ProfitLoss ledger}

local function getLedger(userId)
	if not playerLedgers[userId] then
		playerLedgers[userId] = ProfitLoss.CreateLedger()
	end
	return playerLedgers[userId]
end

-- ═══════════════════════════════════════════════
-- SELL PRODUCT
-- ═══════════════════════════════════════════════

Remotes.RequestSellProduct.OnServerEvent:Connect(function(player, productId, quantity)
	local userId = player.UserId
	if type(productId) ~= "string" then return end
	quantity = math.max(1, math.floor(tonumber(quantity) or 1))

	local product = ProductMarket.GetProduct(productId)
	if not product then return end

	-- Check player has required atoms (via PlayerDataBridge)
	-- For each unit sold, consume the required atoms
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	if not playerData then return end

	-- Check atoms for all units
	for atom, countPerUnit in pairs(product.requiredAtoms) do
		local needed = countPerUnit * quantity
		if (playerData.atoms[atom] or 0) < needed then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Not enough " .. atom .. "! Need " .. needed .. ", have " .. (playerData.atoms[atom] or 0),
				rarity = "common",
			})
			return
		end
	end

	-- Consume atoms
	for atom, countPerUnit in pairs(product.requiredAtoms) do
		local consumed = countPerUnit * quantity
		playerData.atoms[atom] = (playerData.atoms[atom] or 0) - consumed
		if playerData.atoms[atom] <= 0 then
			playerData.atoms[atom] = nil
		end
	end

	-- Calculate revenue
	local unitPrice = ProductMarket.GetCurrentPrice(productId, currentGameDay)
	local totalRevenue = unitPrice * quantity

	-- Add MolCoins
	PlayerDataBridge.AddMolCoins(userId, totalRevenue)

	-- Record in P&L
	local ledger = getLedger(userId)
	ProfitLoss.RecordTransaction(ledger, "revenue", "product_sales", totalRevenue,
		quantity .. "x " .. product.name .. " @ " .. unitPrice .. " MC")

	-- Notify
	Remotes.FireClient("ProductSold", player, {
		productId = productId,
		name = product.name,
		quantity = quantity,
		unitPrice = unitPrice,
		totalRevenue = totalRevenue,
		margin = ProfitLoss.GetMargin(ledger),
	})

	Remotes.FireClient("ServerAnnounce", player, {
		message = "SOLD: " .. quantity .. "x " .. product.name .. " for " .. totalRevenue .. " MolCoins!",
		rarity = totalRevenue >= 1000 and "epic" or "rare",
	})

	-- Global announce for big sales
	if totalRevenue >= 2000 then
		Remotes.FireAllClients("ServerAnnounce", {
			message = player.Name .. " sold " .. quantity .. "x " .. product.name .. " for " .. totalRevenue .. " MC!",
			rarity = "epic",
		})
	end

	print("[ProductMarket]", player.Name, "sold", quantity, "x", productId, "for", totalRevenue, "MC")
end)

-- ═══════════════════════════════════════════════
-- PRICE BROADCAST (every game day change)
-- ═══════════════════════════════════════════════

Remotes.RequestProductPrices.OnServerEvent:Connect(function(player)
	local prices = ProductMarket.GetAllPrices(currentGameDay)
	local ledger = getLedger(player.UserId)

	Remotes.FireClient("ProductPricesUpdate", player, {
		prices = prices,
		gameDay = currentGameDay,
		pnl = {
			revenue = ledger.totals.revenue,
			cogs = ledger.totals.cogs,
			opex = ledger.totals.opex,
			netProfit = ledger.netProfit,
			margin = ProfitLoss.GetMargin(ledger),
		},
	})
end)

-- Periodic price broadcast + day advancement
task.spawn(function()
	while true do
		task.wait(120)  -- every 2 real minutes = 1 game day
		currentGameDay = currentGameDay + 1
		local prices = ProductMarket.GetAllPrices(currentGameDay)

		for _, player in ipairs(Players:GetPlayers()) do
			Remotes.FireClient("ProductPricesUpdate", player, {
				prices = prices,
				gameDay = currentGameDay,
			})
		end
	end
end)

-- ═══════════════════════════════════════════════
-- CLEANUP
-- ═══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	-- Keep ledger for session (would persist in production)
end)

print("[MOLGANG] ProductMarketServer initialized — " .. #ProductMarket.Products .. " products tradable")
