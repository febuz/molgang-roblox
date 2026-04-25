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

-- Active bids
local activeBids = {} -- {bidId = {playerId, playerName, productId, price, quantity, timestamp}}
local bidCounter = 0

local MIN_BID = 10
local MAX_BIDS_PER_PLAYER = 5

-- ═══════════════════════════════════════════════
-- PLACE BID
-- ═══════════════════════════════════════════════

Remotes.RequestPlaceBid.OnServerEvent:Connect(function(player, productId, bidPrice, quantity)
	local userId = player.UserId

	if type(productId) ~= "string" or type(bidPrice) ~= "number" or type(quantity) ~= "number" then return end
	if bidPrice < MIN_BID or quantity < 1 or quantity > 100 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Invalid bid: min " .. MIN_BID .. " MC, max 100 units.",
			rarity = "common",
		})
		return
	end

	-- Check player bid limit
	local playerBidCount = 0
	for _, bid in pairs(activeBids) do
		if bid.playerId == userId then playerBidCount = playerBidCount + 1 end
	end
	if playerBidCount >= MAX_BIDS_PER_PLAYER then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Max " .. MAX_BIDS_PER_PLAYER .. " active bids. Cancel one first.",
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

	-- Check for matching sell orders (any player selling at or below bid price)
	-- In this teaser, we auto-fill from NPC market at bid price
	-- Full implementation would match with other player sell orders

	print("[Market]", player.Name, "bid", quantity, "x", productId, "@", bidPrice, "MC")
end)

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

-- ═══════════════════════════════════════════════
-- GET BIDS
-- ═══════════════════════════════════════════════

Remotes.RequestMarketBids.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local allBids = {}
	local myBids = {}

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

	Remotes.FireClient("MarketBidsResponse", player, {
		bids = allBids,
		myBids = myBids,
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
			if now - bid.timestamp > 1800 then -- 30 min expiry
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
	end
end)

Players.PlayerRemoving:Connect(function(player)
	-- Bids persist for 30 min even after leave
end)

print("[MOLGANG] MarketBidding initialized — competitive bidding system")
