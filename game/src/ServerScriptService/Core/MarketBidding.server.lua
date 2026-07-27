--[[
	MarketBidding.server.lua
	MOLGANG — Competitive Market Bidding System (#88)

	Players can place bids on products, creating a competitive marketplace.
	Bids match with sell orders when price overlaps.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local ProductMarket = require(ReplicatedStorage.Modules.ProductMarket)
local TradeRules = require(ReplicatedStorage.Modules.TradeRules)
local InventoryLimits = require(ReplicatedStorage.Modules.InventoryLimits)
local WorldEvents = require(ReplicatedStorage.Modules.WorldEvents)
local MarketOrderRules = require(ReplicatedStorage.Modules.MarketOrderRules)

-- Active bids
local activeBids = {} -- {bidId = {playerId, playerName, productId, price, quantity, timestamp}}
local bidCounter = 0

local MIN_BID = 10
local MAX_BIDS_PER_PLAYER = 5
local MAX_SELLS_PER_PLAYER = 5
local ORDER_EXPIRY_SECONDS = 1800

local function reject(player, message)
	Remotes.FireClient("ServerAnnounce", player, {message = message, rarity = "common"})
end

local function hasRequiredResearch(playerData, product)
	if not product.requiresResearch then return true end
	local research = playerData.research or {}
	return (research.unlocked or {})[product.requiresResearch] == true
end

-- ═══════════════════════════════════════════════
-- PLACE BID
-- ═══════════════════════════════════════════════

Remotes.RequestPlaceBid.OnServerEvent:Connect(function(player, productId, bidPrice, quantity)
	local userId = player.UserId

	local quantityOk, parsedQuantity = TradeRules.ValidateQuantity(quantity, 100)
	if type(productId) ~= "string" or type(bidPrice) ~= "number" or not quantityOk
		or bidPrice ~= bidPrice or bidPrice == math.huge or bidPrice == -math.huge then
		reject(player, "Bid rejected: enter a valid product, price and quantity.")
		return
	end
	quantity = parsedQuantity
	if bidPrice < MIN_BID or quantity < 1 or quantity > 100 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Invalid bid: min " .. MIN_BID .. " MC, max 100 units.",
			rarity = "common",
		})
		return
	end
	if not ProductMarket.GetProduct(productId) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Unknown product: bid rejected.",
			rarity = "common",
		})
		return
	end
	local product = ProductMarket.GetProduct(productId)
	local bidderData = PlayerDataBridge.GetPlayerData(userId)
	if not bidderData or not hasRequiredResearch(bidderData, product) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Bid rejected: required research is not unlocked.",
			rarity = "common",
		})
		return
	end

	-- Check player bid limit
	local tradingVolumeBonus = WorldEvents.GetActiveEffects().tradingVolumeBonus
	local maxBidsPerPlayer = TradeRules.CalculateOrderLimit(MAX_BIDS_PER_PLAYER, tradingVolumeBonus)
	local playerBidCount = 0
	for _, bid in pairs(activeBids) do
		if bid.playerId == userId then playerBidCount = playerBidCount + 1 end
	end
	if playerBidCount >= maxBidsPerPlayer then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Max " .. maxBidsPerPlayer .. " active bids. Cancel one first.",
			rarity = "common",
		})
		return
	end

	-- Escrow: hold the bid amount
	local totalCost = bidPrice * quantity
	local success = PlayerDataBridge.SpendMolCoins(userId, totalCost)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Need " .. totalCost .. " MC to place bid (escrow).",
			rarity = "common",
		})
		return
	end

	bidCounter = bidCounter + 1
	local bidId = "bid_" .. bidCounter .. "_" .. os.time()

	activeBids[bidId] = {
		bidId = bidId,
		playerId = userId,
		playerName = player.Name,
		productId = productId,
		price = bidPrice,
		quantity = quantity,
		timestamp = os.time(),
	}

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Bid placed: " .. quantity .. "x " .. productId .. " @ " .. bidPrice .. " MC each (escrowed: " .. totalCost .. " MC)",
		rarity = "uncommon",
	})

	-- Order book matching engine: try to fill bid from active sell orders
	matchBid(bidId, player)

	print("[Market]", player.Name, "bid", quantity, "x", productId, "@", bidPrice, "MC")
end)

-- ═══════════════════════════════════════════════
-- SELL ORDERS (player lists products for sale)
-- ═══════════════════════════════════════════════

local activeSells = {} -- {sellId = {playerId, productId, price, quantity, ...}}
local sellCounter = 0

Remotes.RequestPlaceSell.OnServerEvent:Connect(function(player, productId, askPrice, quantity)
	local userId = player.UserId
	local quantityOk, parsedQuantity = TradeRules.ValidateQuantity(quantity, 100)
	if type(productId) ~= "string" or type(askPrice) ~= "number" or not quantityOk
		or askPrice ~= askPrice or askPrice == math.huge or askPrice == -math.huge then
		reject(player, "Sell order rejected: enter a valid product, price and quantity.")
		return
	end
	quantity = parsedQuantity
	if askPrice < 1 then reject(player, "Sell order rejected: asking price must be at least 1 MC."); return end

	-- Check player has product atoms to sell
	local pData = PlayerDataBridge.GetPlayerData(userId)
	if not pData then reject(player, "Player inventory is still loading."); return end
	local product = ProductMarket.GetProduct(productId)
	if not product then reject(player, "Unknown product; sell order rejected."); return end
	if not hasRequiredResearch(pData, product) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Sell order rejected: required research is not unlocked.",
			rarity = "common",
		})
		return
	end
	local eventEffects = WorldEvents.GetActiveEffects()
	if not ProductMarket.GetCertificationStatus(product, eventEffects, pData.research) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Sell order rejected: EU certification is required during this market event.",
			rarity = "common",
		})
		return
	end
	local maxSellsPerPlayer = TradeRules.CalculateOrderLimit(MAX_SELLS_PER_PLAYER, eventEffects.tradingVolumeBonus)
	local playerSellCount = 0
	for _, existingSell in pairs(activeSells) do
		if existingSell.playerId == userId then playerSellCount = playerSellCount + 1 end
	end
	if playerSellCount >= maxSellsPerPlayer then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Max " .. maxSellsPerPlayer .. " active sell orders. Cancel one first.",
			rarity = "common",
		})
		return
	end

	-- Open sell orders reserve the same underlying atoms. Without this check a
	-- player could list the same inventory repeatedly and create orders that
	-- can never settle once the first one fills.
	local reservedAtoms = {}
	local reservedSlag = {}
	for _, existingSell in pairs(activeSells) do
		if existingSell.playerId == userId then
			local existingProduct = ProductMarket.GetProduct(existingSell.productId)
			if existingProduct then
				MarketOrderRules.AddReservation(
					reservedAtoms, reservedSlag, existingProduct, existingSell.quantity)
			end
		end
	end
	for atom, countPerUnit in pairs(product.requiredAtoms) do
		local needed = countPerUnit * quantity
		local available = MarketOrderRules.GetAvailable(pData.atoms, reservedAtoms, atom)
		if available < needed then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Not enough unreserved " .. atom .. " for this sell order.",
				rarity = "common",
			})
			return
		end
	end
	for residue, countPerUnit in pairs(product.requiredSlag or {}) do
		local needed = countPerUnit * quantity
		local available = MarketOrderRules.GetAvailable(pData.slagInventory, reservedSlag, residue)
		if available < needed then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Not enough unreserved slag " .. residue .. " for this sell order.",
				rarity = "common",
			})
			return
		end
	end

	sellCounter = sellCounter + 1
	local sellId = "sell_" .. sellCounter .. "_" .. os.time()

	activeSells[sellId] = {
		sellId = sellId,
		playerId = userId,
		playerName = player.Name,
		productId = productId,
		price = askPrice,
		quantity = quantity,
		timestamp = os.time(),
	}

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Sell order: " .. quantity .. "x " .. productId .. " @ " .. askPrice .. " MC each",
		rarity = "uncommon",
	})

	-- Try to match with existing bids
	matchSell(sellId, player)
end)

-- ═══════════════════════════════════════════════
-- ORDER BOOK MATCHING ENGINE
-- ═══════════════════════════════════════════════

local function transferProduct(productId, sellerId, buyerId, quantity)
	local product = ProductMarket.GetProduct(productId)
	local sellerData = PlayerDataBridge.GetPlayerData(sellerId)
	local buyerData = PlayerDataBridge.GetPlayerData(buyerId)
	if not product or not sellerData or not buyerData then return false end
	sellerData.atoms = sellerData.atoms or {}
	buyerData.atoms = buyerData.atoms or {}
	sellerData.slagInventory = sellerData.slagInventory or {}
	buyerData.slagInventory = buyerData.slagInventory or {}
	if not hasRequiredResearch(sellerData, product) or not hasRequiredResearch(buyerData, product) then return false end
	local eventEffects = WorldEvents.GetActiveEffects()
	if not ProductMarket.GetCertificationStatus(product, eventEffects, sellerData.research) then
		return false
	end

	local atomTransferCount = 0

	for atom, countPerUnit in pairs(product.requiredAtoms) do
		atomTransferCount = atomTransferCount + countPerUnit * quantity
		if (sellerData.atoms[atom] or 0) < countPerUnit * quantity then
			return false
		end
	end
	if not InventoryLimits.CanAddAtoms(buyerData.atoms, buyerData.facilities, atomTransferCount) then
		return false
	end
	for residue, countPerUnit in pairs(product.requiredSlag or {}) do
		if (sellerData.slagInventory[residue] or 0) < countPerUnit * quantity then
			return false
		end
	end
	for atom, countPerUnit in pairs(product.requiredAtoms) do
		local amount = countPerUnit * quantity
		sellerData.atoms[atom] = sellerData.atoms[atom] - amount
		if sellerData.atoms[atom] <= 0 then sellerData.atoms[atom] = nil end
		buyerData.atoms[atom] = (buyerData.atoms[atom] or 0) + amount
	end
	for residue, countPerUnit in pairs(product.requiredSlag or {}) do
		local amount = countPerUnit * quantity
		sellerData.slagInventory[residue] = sellerData.slagInventory[residue] - amount
		buyerData.slagInventory[residue] = (buyerData.slagInventory[residue] or 0) + amount
	end
	return true
end

function matchBid(bidId, bidder)
	local bid = activeBids[bidId]
	if not bid then return end

	-- Find cheapest sell order for this product at or below bid price
	local bestSell = nil
	local bestSellId = nil
	for sid, sell in pairs(activeSells) do
		if sell.productId == bid.productId and sell.price <= bid.price and sell.playerId ~= bid.playerId then
			if not bestSell or sell.price < bestSell.price then
				bestSell = sell
				bestSellId = sid
			end
		end
	end

	if bestSell then
		local fillQty = math.min(bid.quantity, bestSell.quantity)
		local fillPrice = bestSell.price -- execute at seller's ask price
		if not transferProduct(bestSell.productId, bestSell.playerId, bid.playerId, fillQty) then
			-- A failed transfer can be temporary (for example, the buyer's
			-- inventory is full). Never silently delete the seller's order: its
			-- reserved material still exists and the order can match later.
			Remotes.FireClient("ServerAnnounce", bidder, {
				message = "Bid paused: product transfer unavailable; your escrow and order remain active.",
				rarity = "common",
			})
			local sellerPlayer = Players:GetPlayerByUserId(bestSell.playerId)
			if sellerPlayer then
				Remotes.FireClient("ServerAnnounce", sellerPlayer, {
					message = "Sell order paused: buyer cannot receive this transfer yet; order remains active.",
					rarity = "common",
				})
			end
			return
		end

		-- Transfer: bidder gets product, seller gets payment
		-- Refund price difference to bidder (bid was escrowed at bid price)
		local refund = (bid.price - fillPrice) * fillQty
		if refund > 0 then
			PlayerDataBridge.AddMolCoins(bid.playerId, refund)
		end
		local grossSettlement = fillPrice * fillQty
		local tradeTax, netSettlement = TradeRules.CalculateTradeTax(
			grossSettlement, WorldEvents.GetActiveEffects().tradeTaxMult
		)
		PlayerDataBridge.AddEarnedMolCoins(bestSell.playerId, netSettlement)

		-- Notify both parties
		local sellerPlayer = Players:GetPlayerByUserId(bestSell.playerId)
		if sellerPlayer then
			Remotes.FireClient("ServerAnnounce", sellerPlayer, {
				message = "SOLD: " .. fillQty .. "x " .. bid.productId .. " @ " .. fillPrice .. " MC (net " .. netSettlement .. ", tax " .. tradeTax .. ") to " .. bid.playerName,
				rarity = "rare",
			})
		end
		Remotes.FireClient("ServerAnnounce", bidder, {
			message = "BID FILLED: " .. fillQty .. "x " .. bid.productId .. " @ " .. fillPrice .. " MC from " .. bestSell.playerName,
			rarity = "rare",
		})

		-- Update or remove orders
		bid.quantity = bid.quantity - fillQty
		bestSell.quantity = bestSell.quantity - fillQty

		if bid.quantity <= 0 then activeBids[bidId] = nil end
		if bestSell.quantity <= 0 then activeSells[bestSellId] = nil end

		print("[Market] MATCH:", fillQty, "x", bid.productId, "@", fillPrice, "MC")
		if activeBids[bidId] then
			task.defer(matchBid, bidId, bidder)
		end
	end
end

function matchSell(sellId, seller)
	local sell = activeSells[sellId]
	if not sell then return end

	-- Find highest bid at or above ask price
	local bestBid = nil
	local bestBidId = nil
	for bid_id, bid in pairs(activeBids) do
		if bid.productId == sell.productId and bid.price >= sell.price and bid.playerId ~= sell.playerId then
			if not bestBid or bid.price > bestBid.price then
				bestBid = bid
				bestBidId = bid_id
			end
		end
	end

	if bestBid then
		local fillQty = math.min(sell.quantity, bestBid.quantity)
		local fillPrice = sell.price
		if not transferProduct(sell.productId, sell.playerId, bestBid.playerId, fillQty) then
			local bidderPlayer = Players:GetPlayerByUserId(bestBid.playerId)
			if bidderPlayer then
				Remotes.FireClient("ServerAnnounce", bidderPlayer, {
					message = "Bid paused: product transfer unavailable; escrow and order remain active.",
					rarity = "common",
				})
			end
			Remotes.FireClient("ServerAnnounce", seller, {
				message = "Sell order paused: buyer cannot receive this transfer yet; order remains active.",
				rarity = "common",
			})
			return
		end

		local refund = (bestBid.price - fillPrice) * fillQty
		if refund > 0 then
			PlayerDataBridge.AddMolCoins(bestBid.playerId, refund)
		end
		local grossSettlement = fillPrice * fillQty
		local tradeTax, netSettlement = TradeRules.CalculateTradeTax(
			grossSettlement, WorldEvents.GetActiveEffects().tradeTaxMult
		)
		PlayerDataBridge.AddEarnedMolCoins(sell.playerId, netSettlement)

		local bidderPlayer = Players:GetPlayerByUserId(bestBid.playerId)
		if bidderPlayer then
			Remotes.FireClient("ServerAnnounce", bidderPlayer, {
				message = "BID FILLED: " .. fillQty .. "x " .. sell.productId .. " @ " .. fillPrice .. " MC",
				rarity = "rare",
			})
		end
		Remotes.FireClient("ServerAnnounce", seller, {
			message = "SOLD: " .. fillQty .. "x " .. sell.productId .. " @ " .. fillPrice .. " MC (net " .. netSettlement .. ", tax " .. tradeTax .. ")",
			rarity = "rare",
		})

		bestBid.quantity = bestBid.quantity - fillQty
		sell.quantity = sell.quantity - fillQty

		if bestBid.quantity <= 0 then activeBids[bestBidId] = nil end
		if sell.quantity <= 0 then activeSells[sellId] = nil end
		if activeSells[sellId] then
			task.defer(matchSell, sellId, seller)
		end
	end
end

-- ═══════════════════════════════════════════════
-- CANCEL BID
-- ═══════════════════════════════════════════════

Remotes.RequestCancelBid.OnServerEvent:Connect(function(player, bidId)
	local userId = player.UserId
	local bid = activeBids[bidId]

	if not bid or bid.playerId ~= userId then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Bid not found or not yours.",
			rarity = "common",
		})
		return
	end

	-- Refund escrow
	local refund = bid.price * bid.quantity
	PlayerDataBridge.AddMolCoins(userId, refund)
	activeBids[bidId] = nil

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Bid cancelled. Refunded " .. refund .. " MC.",
		rarity = "common",
	})
end)

Remotes.RequestCancelSell.OnServerEvent:Connect(function(player, sellId)
	local sell = activeSells[sellId]
	if not sell or sell.playerId ~= player.UserId then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Sell order not found or not yours.",
			rarity = "common",
		})
		return
	end

	-- Sell orders reserve inventory logically; cancelling simply releases that
	-- reservation because the underlying material was never moved to escrow.
	activeSells[sellId] = nil
	Remotes.FireClient("ServerAnnounce", player, {
		message = "Sell order cancelled. Reserved materials are available again.",
		rarity = "common",
	})
end)

-- ═══════════════════════════════════════════════
-- GET BIDS
-- ═══════════════════════════════════════════════

Remotes.RequestMarketBids.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local allBids = {}
	local myBids = {}
	local allSells = {}
	local mySells = {}

	for bidId, bid in pairs(activeBids) do
		table.insert(allBids, {
			bidId = bid.bidId,
			playerName = bid.playerName,
			productId = bid.productId,
			price = bid.price,
			quantity = bid.quantity,
		})
		if bid.playerId == userId then
			table.insert(myBids, bid)
		end
	end
	for sellId, sell in pairs(activeSells) do
		table.insert(allSells, {
			sellId = sell.sellId,
			playerName = sell.playerName,
			productId = sell.productId,
			price = sell.price,
			quantity = sell.quantity,
		})
		if sell.playerId == userId then
			table.insert(mySells, sell)
		end
	end

	Remotes.FireClient("MarketBidsResponse", player, {
		bids = allBids,
		myBids = myBids,
		sells = allSells,
		mySells = mySells,
	})
end)

-- ═══════════════════════════════════════════════
-- EXPIRE OLD BIDS (after 30 real minutes)
-- ═══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(60)
		local now = os.time()
		for bidId, bid in pairs(activeBids) do
			if now - bid.timestamp > ORDER_EXPIRY_SECONDS then
				-- Refund
				PlayerDataBridge.AddMolCoins(bid.playerId, bid.price * bid.quantity)
				activeBids[bidId] = nil

				local p = Players:GetPlayerByUserId(bid.playerId)
				if p then
					Remotes.FireClient("ServerAnnounce", p, {
						message = "Bid expired: " .. bid.quantity .. "x " .. bid.productId .. ". Refunded " .. (bid.price * bid.quantity) .. " MC.",
						rarity = "common",
					})
				end
			end
		end
		for sellId, sell in pairs(activeSells) do
			if now - sell.timestamp > ORDER_EXPIRY_SECONDS then
				activeSells[sellId] = nil
				local seller = Players:GetPlayerByUserId(sell.playerId)
				if seller then
					Remotes.FireClient("ServerAnnounce", seller, {
						message = "Sell order expired: " .. sell.quantity .. "x " .. sell.productId .. ".",
						rarity = "common",
					})
				end
			end
		end
	end
end)

Players.PlayerRemoving:Connect(function(player)
	-- Remove session-bound orders before PlayerDataBridge cleanup. Refund bid
	-- escrow so an offline player cannot strand currency or match stale state.
	for bidId, bid in pairs(activeBids) do
		if bid.playerId == player.UserId then
			PlayerDataBridge.AddMolCoins(player.UserId, bid.price * bid.quantity)
			activeBids[bidId] = nil
		end
	end
	for sellId, sell in pairs(activeSells) do
		if sell.playerId == player.UserId then
			activeSells[sellId] = nil
		end
	end
end)

print("[MOLGANG] MarketBidding initialized — competitive bidding system")
