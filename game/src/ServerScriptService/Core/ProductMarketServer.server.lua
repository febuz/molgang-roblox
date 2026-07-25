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
local TradeRules = require(ReplicatedStorage.Modules.TradeRules)
local GameClock = require(ReplicatedStorage.Modules.GameClock)
local WorldEvents = require(ReplicatedStorage.Modules.WorldEvents)

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

-- Use the shared absolute clock so a server restart does not reset market
-- prices to day 1 or make two live servers quote different market days.
local currentGameDay = GameClock.DayAt()
local playerLedgers = {}  -- {userId = ProfitLoss ledger}

local function persistLedger(userId, ledger)
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	if not playerData then return end
	local saved = {
		entries = {},
		totals = {
			revenue = ledger.totals.revenue or 0,
			cogs = ledger.totals.cogs or 0,
			opex = ledger.totals.opex or 0,
			capex = ledger.totals.capex or 0,
		},
		grossProfit = ledger.grossProfit or 0,
		netProfit = ledger.netProfit or 0,
		totalIncome = ledger.totalIncome or 0,
		totalExpenses = ledger.totalExpenses or 0,
	}
	-- Keep a bounded audit trail while retaining cumulative accounting totals.
	local first = math.max(1, #ledger.entries - 99)
	for index = first, #ledger.entries do
		local entry = ledger.entries[index]
		table.insert(saved.entries, {
			timestamp = entry.timestamp or os.time(),
			categoryType = entry.categoryType,
			subcategory = entry.subcategory,
			amount = entry.amount,
			description = entry.description,
		})
	end
	playerData.productLedger = saved
end

local function getLedger(userId)
	if not playerLedgers[userId] then
		local playerData = PlayerDataBridge.GetPlayerData(userId)
		local saved = playerData and playerData.productLedger
		playerLedgers[userId] = saved or ProfitLoss.CreateLedger()
		playerLedgers[userId].entries = playerLedgers[userId].entries or {}
		playerLedgers[userId].totals = playerLedgers[userId].totals or { revenue = 0, cogs = 0, opex = 0, capex = 0 }
		playerLedgers[userId].totals.revenue = playerLedgers[userId].totals.revenue or 0
		playerLedgers[userId].totals.cogs = playerLedgers[userId].totals.cogs or 0
		playerLedgers[userId].totals.opex = playerLedgers[userId].totals.opex or 0
		playerLedgers[userId].totals.capex = playerLedgers[userId].totals.capex or 0
		playerLedgers[userId].grossProfit = playerLedgers[userId].grossProfit or 0
		playerLedgers[userId].netProfit = playerLedgers[userId].netProfit or 0
		playerLedgers[userId].totalIncome = playerLedgers[userId].totalIncome or 0
		playerLedgers[userId].totalExpenses = playerLedgers[userId].totalExpenses or 0
	end
	return playerLedgers[userId]
end

-- ═══════════════════════════════════════════════
-- SELL PRODUCT
-- ═══════════════════════════════════════════════

Remotes.RequestSellProduct.OnServerEvent:Connect(function(player, productId, quantity)
	local userId = player.UserId
	if type(productId) ~= "string" then return end
	local quantityOk, parsedQuantity = TradeRules.ValidateQuantity(quantity, 1000)
	if not quantityOk then
		Remotes.FireClient("ServerAnnounce", player, {message = "Sale rejected: " .. parsedQuantity, rarity = "common"})
		return
	end
	quantity = parsedQuantity

	local product = ProductMarket.GetProduct(productId)
	if not product then return end
	local eventEffects = WorldEvents.GetActiveEffects()

	-- Check player has required atoms (via PlayerDataBridge)
	-- For each unit sold, consume the required atoms
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	if not playerData then return end
	if product.requiresResearch then
		local research = playerData.research or {}
		local unlocked = research.unlocked or {}
		if not unlocked[product.requiresResearch] then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Sale rejected: research required (" .. product.requiresResearch .. ").",
				rarity = "common",
			})
			return
		end
	end
	if not ProductMarket.GetCertificationStatus(product, eventEffects, playerData.research) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Sale rejected: EU certification is required during this market event.",
			rarity = "common",
		})
		return
	end
	playerData.atoms = playerData.atoms or {}
	playerData.slagInventory = playerData.slagInventory or {}

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
	for residue, countPerUnit in pairs(product.requiredSlag or {}) do
		local needed = countPerUnit * quantity
		if (playerData.slagInventory[residue] or 0) < needed then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Not enough slag " .. residue .. "! Need " .. needed .. ", have " .. (playerData.slagInventory[residue] or 0),
				rarity = "common",
			})
			return
		end
	end

	-- Calculate revenue
	local unitPrice = ProductMarket.ApplyMarketPriceMultiplier(
		productId,
		ProductMarket.GetCurrentPrice(productId, currentGameDay),
		eventEffects.priceMultipliers
	)
	unitPrice = math.floor(ProductMarket.ApplyCertificationPrice(
		product, unitPrice, eventEffects, playerData.research
	) + 0.5)
	local totalRevenue = unitPrice * quantity
	local tradeTax, netRevenue = TradeRules.CalculateTradeTax(totalRevenue, eventEffects.tradeTaxMult)

	-- Settle the payout before consuming material. A daily income cap or other
	-- economy rejection must leave the player's atoms and residue untouched.
	local paid = PlayerDataBridge.AddEarnedMolCoins(userId, netRevenue)
	if not paid then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Sale rejected: today's MolCoin income limit has been reached; materials were not consumed.",
			rarity = "common",
		})
		return
	end

	-- Consume atoms only after the payout has been accepted.
	for atom, countPerUnit in pairs(product.requiredAtoms) do
		local consumed = countPerUnit * quantity
		playerData.atoms[atom] = (playerData.atoms[atom] or 0) - consumed
		if playerData.atoms[atom] <= 0 then
			playerData.atoms[atom] = nil
		end
	end
	for residue, countPerUnit in pairs(product.requiredSlag or {}) do
		local consumed = countPerUnit * quantity
		playerData.slagInventory[residue] = playerData.slagInventory[residue] - consumed
	end

	-- Record in P&L
	local ledger = getLedger(userId)
	ProfitLoss.RecordTransaction(ledger, "revenue", "product_sales", netRevenue,
		quantity .. "x " .. product.name .. " @ " .. unitPrice .. " MC")
	if tradeTax > 0 then
		ProfitLoss.RecordTransaction(ledger, "opex", "trade_tax", tradeTax,
			"Market trade tax: " .. tradeTax .. " MC")
	end
	persistLedger(userId, ledger)

	-- Notify
	Remotes.FireClient("ProductSold", player, {
		productId = productId,
		name = product.name,
		quantity = quantity,
		unitPrice = unitPrice,
		totalRevenue = netRevenue,
		grossRevenue = totalRevenue,
		tradeTax = tradeTax,
		margin = ProfitLoss.GetMargin(ledger),
	})

	Remotes.FireClient("ServerAnnounce", player, {
		message = "SOLD: " .. quantity .. "x " .. product.name .. " for " .. netRevenue .. " MC (gross " .. totalRevenue .. ", tax " .. tradeTax .. ")!",
		rarity = totalRevenue >= 1000 and "epic" or "rare",
	})

	-- Global announce for big sales
	if netRevenue >= 2000 then
		Remotes.FireAllClients("ServerAnnounce", {
			message = player.Name .. " sold " .. quantity .. "x " .. product.name .. " for " .. netRevenue .. " MC!",
			rarity = "epic",
		})
	end

	print("[ProductMarket]", player.Name, "sold", quantity, "x", productId, "for", netRevenue, "MC (gross", totalRevenue, "tax", tradeTax .. ")")
end)

-- ═══════════════════════════════════════════════
-- PRICE BROADCAST (every game day change)
-- ═══════════════════════════════════════════════

Remotes.RequestProductPrices.OnServerEvent:Connect(function(player)
	currentGameDay = GameClock.DayAt()
	local prices = ProductMarket.GetAllPrices(currentGameDay, WorldEvents.GetActiveEffects().priceMultipliers)
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
		task.wait(GameClock.DAY_SECONDS)  -- shared clock: 10 real minutes = 1 game day
		local nextGameDay = GameClock.DayAt()
		if nextGameDay == currentGameDay then
			continue
		end
		currentGameDay = nextGameDay
		local prices = ProductMarket.GetAllPrices(
			currentGameDay, WorldEvents.GetActiveEffects().priceMultipliers
		)

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
	local ledger = playerLedgers[player.UserId]
	if ledger then
		persistLedger(player.UserId, ledger)
		playerLedgers[player.UserId] = nil
	end
end)

print("[MOLGANG] ProductMarketServer initialized — " .. #ProductMarket.Products .. " products tradable")
