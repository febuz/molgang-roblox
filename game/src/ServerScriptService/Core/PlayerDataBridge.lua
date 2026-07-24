-- ServerScriptService/Core/PlayerDataBridge.lua
-- Server-only module for inter-script communication
-- Replaces player Attributes (which clients can spoof) with a
-- secure server-side table that only server scripts can write to
-- CRITICAL: This module must NEVER be in ReplicatedStorage

local PlayerDataBridge = {}

-- Internal data store — only server scripts can access this module
local pendingCollections = {} -- {userId = {{elementZ, symbol, coinReward, timestamp}, ...}}
local pendingBuilds = {}      -- {userId = {molName, atoms, timestamp}}
local playerEconomy = {}      -- {userId = {molCoins, atoms, molecules, ...}}
local drinkPurchaseCounts = {} -- {userId = count}
local atomCollectedCounts = {} -- {userId = count}

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
	local data = playerEconomy[userId]
	if data and type(amount) == "number" and amount >= 0 and amount == amount and amount < math.huge then
		data.molCoins = (data.molCoins or 0) + amount
		data.totalMolCoinsEarned = (data.totalMolCoinsEarned or 0) + amount
		return true, data.molCoins
	end
	return false, 0
end

-- Like AddMolCoins, but boosted by an active "coinBonus" drink buff
-- (Classic Boba, +25% by default). Only call this for MolCoins a player
-- genuinely EARNS from the game economy (selling to a market/NPC price,
-- quest/mission/minigame rewards) — never for refunds or loan/collateral
-- payouts, where one player's gain must equal another's loss; boosting
-- only one side of a player-to-player transfer would mint MolCoins from
-- nothing (see molgang-roblox#13).
function PlayerDataBridge.AddEarnedMolCoins(userId, amount)
	local multiplier = 1.0
	if _G.GetPlayerBuff then
		multiplier = _G.GetPlayerBuff(userId, "coinBonus")
	end
	return PlayerDataBridge.AddMolCoins(userId, math.floor(amount * multiplier))
end

function PlayerDataBridge.SpendMolCoins(userId, amount)
	local data = playerEconomy[userId]
	if data and (data.molCoins or 0) >= amount then
		data.molCoins = data.molCoins - amount
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
