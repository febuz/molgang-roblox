-- ServerScriptService/Core/PlayerDataBridge.lua
-- Server-only module for inter-script communication
-- Replaces player Attributes (which clients can spoof) with a
-- secure server-side table that only server scripts can write to
-- CRITICAL: This module must NEVER be in ReplicatedStorage

local PlayerDataBridge = {}

local DailyStats
if game then
	local ReplicatedStorage = game:GetService("ReplicatedStorage")
	DailyStats = require(ReplicatedStorage.Modules.DailyStats)
else
	-- Lune test runner fallback; Roblox resolves the Instance path above.
	DailyStats = require("../../ReplicatedStorage/Modules/DailyStats")
end

-- Internal data store — only server scripts can access this module
local pendingCollections = {} -- {userId = {{elementZ, symbol, coinReward, timestamp}, ...}}
local pendingBuilds = {}      -- {userId = {molName, atoms, timestamp}}
local playerEconomy = {}      -- {userId = {molCoins, atoms, molecules, ...}}
local pendingBalanceAdjustments = {} -- {userId = MolCoins to apply on next load}
local drinkPurchaseCounts = {} -- {userId = count}
local atomCollectedCounts = {} -- {userId = count}
local MAX_DAILY_REWARD = 2000

-- ══════════════════════════════════════════════
-- ATOM COLLECTION (AtomSpawner → EconomyManager)
-- ══════════════════════════════════════════════

function PlayerDataBridge.RecordAtomCollect(userId, elementZ, symbol, coinReward)
	if not pendingCollections[userId] then
		pendingCollections[userId] = {}
	end
	local timestamp = tick and tick() or os.clock()
	table.insert(pendingCollections[userId], {
		elementZ = elementZ,
		symbol = symbol,
		coinReward = coinReward,
		timestamp = timestamp,
	})
end

function PlayerDataBridge.GetPendingCollect(userId)
	local queue = pendingCollections[userId]
	if queue and #queue > 0 then
		local data = table.remove(queue, 1)
		if #queue == 0 then
			pendingCollections[userId] = nil
		end
		return data
	end
	return nil
end

-- ══════════════════════════════════════════════
-- MOLECULE BUILD (EconomyManager → ChainRegistry)
-- ══════════════════════════════════════════════

function PlayerDataBridge.RecordMoleculeBuild(userId, molName, atoms)
	pendingBuilds[userId] = {
		molName = molName,
		atoms = atoms,
		timestamp = tick(),
	}
end

function PlayerDataBridge.GetPendingBuild(userId)
	local data = pendingBuilds[userId]
	if data then
		pendingBuilds[userId] = nil
		return data
	end
	return nil
end

-- ══════════════════════════════════════════════
-- ECONOMY STATE (shared between server scripts)
-- ══════════════════════════════════════════════

function PlayerDataBridge.SetEconomyData(userId, data)
	playerEconomy[userId] = data
	local pending = pendingBalanceAdjustments[userId]
	if pending then
		data.molCoins = (data.molCoins or 0) + pending
		pendingBalanceAdjustments[userId] = nil
	end
end

function PlayerDataBridge.GetEconomyData(userId)
	return playerEconomy[userId]
end

-- Canonical accessor used by gameplay systems that need to inspect the
-- server-owned player state (inventory, facilities, progression, etc.).
-- Keep this as an alias to the economy store so all systems share the same
-- table that EconomyManager loads and saves.
function PlayerDataBridge.GetPlayerData(userId)
	return playerEconomy[userId]
end

function PlayerDataBridge.AddMolCoins(userId, amount)
	if type(amount) ~= "number" or amount < 0 or amount ~= amount or amount >= math.huge then
		return false, 0
	end
	local data = playerEconomy[userId]
	if data then
		data.molCoins = (data.molCoins or 0) + amount
		return true, data.molCoins
	end
	pendingBalanceAdjustments[userId] = (pendingBalanceAdjustments[userId] or 0) + amount
	return true, amount
end

-- Like AddMolCoins, but boosted by an active "coinBonus" drink buff
-- (Classic Boba, +25% by default). Only call this for MolCoins a player
-- genuinely EARNS from the game economy (selling to a market/NPC price,
-- quest/mission/minigame rewards) — never for refunds or loan/collateral
-- payouts, where one player's gain must equal another's loss; boosting
-- only one side of a player-to-player transfer would mint MolCoins from
-- nothing (see molgang-roblox#13).
function PlayerDataBridge.AddEarnedMolCoins(userId, amount)
	if not playerEconomy[userId] then
		return false, 0
	end
	local multiplier = 1.0
	if _G.GetPlayerBuff then
		multiplier = _G.GetPlayerBuff(userId, "coinBonus")
	end
	local earnedAmount = math.floor(amount * multiplier)
	local success, balance = PlayerDataBridge.AddMolCoins(userId, earnedAmount)
	if success then
		local data = playerEconomy[userId]
		data.totalMolCoinsEarned = (data.totalMolCoinsEarned or 0) + earnedAmount
		DailyStats.Increment(data, "molCoinsEarned", earnedAmount)
	end
	return success, balance
end

-- Reward income is capped separately from genuine market revenue. This keeps
-- quests/minigames/achievements from becoming an infinite coin faucet while
-- preserving full settlement for player sales and transfers.
function PlayerDataBridge.AddRewardMolCoins(userId, amount)
	if not playerEconomy[userId] or type(amount) ~= "number" or amount < 0
		or amount ~= amount or amount == math.huge then
		return false, 0, 0
	end
	local data = playerEconomy[userId]
	local multiplier = 1.0
	if _G.GetPlayerBuff then
		multiplier = _G.GetPlayerBuff(userId, "coinBonus")
	end
	local requested = math.floor(amount * multiplier)
	local stats = DailyStats.Ensure(data)
	local remaining = math.max(0, MAX_DAILY_REWARD - (stats.molCoinsRewards or 0))
	local paid = math.min(requested, remaining)
	if paid <= 0 then return false, data.molCoins or 0, 0 end

	local success, balance = PlayerDataBridge.AddMolCoins(userId, paid)
	if not success then return false, balance, 0 end
	data.totalMolCoinsEarned = (data.totalMolCoinsEarned or 0) + paid
	DailyStats.Increment(data, "molCoinsRewards", paid)
	return true, balance, paid
end

function PlayerDataBridge.SpendMolCoins(userId, amount)
	local data = playerEconomy[userId]
	if data and type(amount) == "number" and amount >= 0 and amount == amount and amount < math.huge and (data.molCoins or 0) >= amount then
		data.molCoins = data.molCoins - amount
		data.totalMolCoinsSpent = (data.totalMolCoinsSpent or 0) + amount
		return true, data.molCoins
	end
	return false, 0
end

-- ══════════════════════════════════════════════
-- DRINK PURCHASE COUNTING (BubbleTeaBar → Achievements)
-- ══════════════════════════════════════════════

-- Returns the new total after incrementing. Callers diff old/new against
-- Modules/GameObjects/Achievements.CheckNewlyUnlocked to detect threshold
-- crossings without the caller having to track counts itself.
function PlayerDataBridge.RecordDrinkPurchase(userId)
	local newCount = (drinkPurchaseCounts[userId] or 0) + 1
	drinkPurchaseCounts[userId] = newCount
	return newCount
end

function PlayerDataBridge.GetDrinkPurchaseCount(userId)
	return drinkPurchaseCounts[userId] or 0
end

-- ══════════════════════════════════════════════
-- ATOM COLLECT COUNTING (AtomSpawner → MiningMilestones)
-- ══════════════════════════════════════════════

-- Same shape as RecordDrinkPurchase — returns the new total so callers can
-- diff old/new against Modules/GameObjects/MiningMilestones.CheckNewlyUnlocked.
function PlayerDataBridge.RecordAtomCollected(userId)
	local newCount = (atomCollectedCounts[userId] or 0) + 1
	atomCollectedCounts[userId] = newCount
	return newCount
end

function PlayerDataBridge.GetAtomCollectedCount(userId)
	return atomCollectedCounts[userId] or 0
end

function PlayerDataBridge.Cleanup(userId)
	pendingCollections[userId] = nil
	pendingBuilds[userId] = nil
	playerEconomy[userId] = nil
	drinkPurchaseCounts[userId] = nil
	atomCollectedCounts[userId] = nil
end

return PlayerDataBridge
