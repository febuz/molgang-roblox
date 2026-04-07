-- ServerScriptService/Core/PlayerDataBridge.lua
-- Server-only module for inter-script communication
-- Replaces player Attributes (which clients can spoof) with a
-- secure server-side table that only server scripts can write to
-- CRITICAL: This module must NEVER be in ReplicatedStorage

local PlayerDataBridge = {}

-- Internal data store — only server scripts can access this module
local pendingCollections = {} -- {userId = {elementZ, symbol, coinReward, timestamp}}
local pendingBuilds = {}      -- {userId = {molName, atoms, timestamp}}
local playerEconomy = {}      -- {userId = {molCoins, atoms, molecules, ...}}

-- ══════════════════════════════════════════════
-- ATOM COLLECTION (AtomSpawner → EconomyManager)
-- ══════════════════════════════════════════════

function PlayerDataBridge.RecordAtomCollect(userId, elementZ, symbol, coinReward)
	pendingCollections[userId] = {
		elementZ = elementZ,
		symbol = symbol,
		coinReward = coinReward,
		timestamp = tick(),
	}
end

function PlayerDataBridge.GetPendingCollect(userId)
	local data = pendingCollections[userId]
	if data then
		pendingCollections[userId] = nil
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

function PlayerDataBridge.AddMolCoins(userId, amount)
	local data = playerEconomy[userId]
	if data then
		data.molCoins = (data.molCoins or 0) + amount
		return true, data.molCoins
	end
	return false, 0
end

function PlayerDataBridge.SpendMolCoins(userId, amount)
	local data = playerEconomy[userId]
	if data and (data.molCoins or 0) >= amount then
		data.molCoins = data.molCoins - amount
		return true, data.molCoins
	end
	return false, 0
end

function PlayerDataBridge.Cleanup(userId)
	pendingCollections[userId] = nil
	pendingBuilds[userId] = nil
	playerEconomy[userId] = nil
end

return PlayerDataBridge
