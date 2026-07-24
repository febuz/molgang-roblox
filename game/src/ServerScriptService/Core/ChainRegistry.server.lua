-- ServerScriptService/Core/ChainRegistry.server.lua
-- XRPL blockchain simulatie via DataStore voor MOLGANG
-- Elke molecule die een speler maakt = 1 ChainEntry (gesimuleerd block)

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreProvider = require(ReplicatedStorage.Modules.DataStoreProvider)
local Players = game:GetService("Players")

local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- ══════════════════════════════════════════════
-- DATASTORES
-- ══════════════════════════════════════════════

local chainStore = DataStoreProvider.GetDataStore("MolChain_v1")
local globalChainStore = DataStoreProvider.GetOrderedDataStore("MolChain_Global_v1")

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local lastBlockHash = "0000000000000000"  -- Genesis block
local pendingEntries = {}
local totalEntries = 0
local recentEntries = {}  -- laatste 100 voor tower display
local BATCH_SIZE = 10     -- schrijf elke 10 entries naar DataStore
local MAX_RECENT = 100

-- ══════════════════════════════════════════════
-- HASH SIMULATIE (educatief, niet echt crypto)
-- ══════════════════════════════════════════════

local function simpleHash(input)
	-- Simpele hash voor educatieve doeleinden
	local hash = 0
	for i = 1, #input do
		hash = (hash * 31 + string.byte(input, i)) % (2^53)
	end
	return string.format("%016x", hash)
end

local function calculateBlockHash(entry)
	local data = entry.player .. entry.molecule .. tostring(entry.timestamp) .. entry.prevHash
	return simpleHash(data)
end

-- ══════════════════════════════════════════════
-- MOLECULE WEIGHT CALCULATOR
-- ══════════════════════════════════════════════

local function calculateMolWeight(atoms)
	return Chemistry.CalculateMolWeight(atoms)
end

-- ══════════════════════════════════════════════
-- REGISTER MOLECULE
-- ══════════════════════════════════════════════

function RegisterMolecule(player, moleculeName, atoms)
	local entry = {
		player = player.Name,
		playerId = player.UserId,
		molecule = moleculeName,
		atoms = atoms,
		timestamp = os.time(),
		molWeight = calculateMolWeight(atoms),
		prevHash = lastBlockHash,
	}

	-- Bereken hash
	entry.hash = calculateBlockHash(entry)
	lastBlockHash = entry.hash

	-- Voeg toe aan pending entries
	table.insert(pendingEntries, entry)
	totalEntries = totalEntries + 1

	-- Voeg toe aan recent (voor tower display)
	table.insert(recentEntries, 1, entry)
	if #recentEntries > MAX_RECENT then
		table.remove(recentEntries)
	end

	-- Broadcast naar alle clients
	Remotes.FireAllClients("ChainEntryAdded", {
		player = entry.player,
		molecule = entry.molecule,
		hash = entry.hash,
		molWeight = entry.molWeight,
		timestamp = entry.timestamp,
		entryNumber = totalEntries,
	})

	-- Server announce bij milestone entries
	if totalEntries % 100 == 0 then
		Remotes.FireAllClients("ServerAnnounce", {
			message = "Block " .. totalEntries .. " sealed! " .. player.Name .. " registreerde " .. moleculeName,
			rarity = "epic",
		})
	end

	-- Batch schrijven naar DataStore
	if #pendingEntries >= BATCH_SIZE then
		flushToDataStore()
	end

	-- MolCoin bonus voor chain entries
	local bonus = 0
	if totalEntries % 1000 == 0 then
		bonus = 500  -- milestone bonus
	elseif totalEntries % 100 == 0 then
		bonus = 100
	end

	return entry, bonus
end

-- ══════════════════════════════════════════════
-- DATASTORE FLUSH
-- ══════════════════════════════════════════════

function flushToDataStore()
	if #pendingEntries == 0 then return end

	local toWrite = {}
	for i, entry in ipairs(pendingEntries) do
		table.insert(toWrite, entry)
	end
	pendingEntries = {}

	-- Schrijf in pcall (DataStore kan falen)
	local success, err = pcall(function()
		for _, entry in ipairs(toWrite) do
			local key = "chain_" .. tostring(entry.timestamp) .. "_" .. tostring(entry.playerId)
			chainStore:SetAsync(key, entry)
		end
	end)

	if not success then
		warn("[ChainRegistry] DataStore write failed:", err)
		-- Retry na 5 seconden
		task.delay(5, function()
			for _, entry in ipairs(toWrite) do
				table.insert(pendingEntries, entry)
			end
			flushToDataStore()
		end)
	end
end

-- ══════════════════════════════════════════════
-- MOLECULE REGISTRATION (polled from secure PlayerDataBridge)
-- EconomyManager validates atoms and records build in the bridge
-- We poll the bridge to register chain entries — no client spoofing possible
-- ══════════════════════════════════════════════

local Players = game:GetService("Players")
task.spawn(function()
	while true do
		for _, p in ipairs(Players:GetPlayers()) do
			local buildData = PlayerDataBridge.GetPendingBuild(p.UserId)
			if buildData then
				RegisterMolecule(p, buildData.molName, buildData.atoms)
			end
		end
		task.wait(0.2)
	end
end)

-- ══════════════════════════════════════════════
-- CHAIN EXPLORER QUERIES
-- ══════════════════════════════════════════════

Remotes.GetChainPage.OnServerInvoke = function(player, pageNum)
	if type(pageNum) ~= "number" then pageNum = 1 end
	pageNum = math.max(1, math.floor(pageNum))

	local pageSize = 20
	local startIdx = (pageNum - 1) * pageSize + 1
	local endIdx = math.min(startIdx + pageSize - 1, #recentEntries)

	local page = {}
	for i = startIdx, endIdx do
		if recentEntries[i] then
			table.insert(page, {
				player = recentEntries[i].player,
				molecule = recentEntries[i].molecule,
				hash = recentEntries[i].hash,
				molWeight = recentEntries[i].molWeight,
				timestamp = recentEntries[i].timestamp,
				atoms = recentEntries[i].atoms,
			})
		end
	end

	return {
		entries = page,
		totalEntries = totalEntries,
		currentPage = pageNum,
		totalPages = math.ceil(#recentEntries / pageSize),
	}
end

-- Chain query (zoeken)
Remotes.RequestChainQuery.OnServerEvent:Connect(function(player, query)
	if type(query) ~= "string" then return end
	query = string.lower(query)

	local results = {}
	for _, entry in ipairs(recentEntries) do
		if string.find(string.lower(entry.player), query)
			or string.find(string.lower(entry.molecule), query)
			or string.find(entry.hash, query) then
			table.insert(results, {
				player = entry.player,
				molecule = entry.molecule,
				hash = entry.hash,
				molWeight = entry.molWeight,
				timestamp = entry.timestamp,
			})
			if #results >= 20 then break end
		end
	end

	Remotes.FireClient("ChainEntryAdded", player, results)
end)

-- ══════════════════════════════════════════════
-- PERIODIC FLUSH
-- ══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(60)  -- elke minuut flushen
		flushToDataStore()
	end
end)

-- Flush bij server shutdown
game:BindToClose(function()
	flushToDataStore()
end)

-- Genesis block
table.insert(recentEntries, {
	player = "MOLGANG",
	molecule = "Genesis",
	atoms = {},
	hash = "0000000000000000",
	molWeight = 0,
	timestamp = 1711929600,  -- 1 april 2026 (Unix timestamp benadering)
	prevHash = "",
})
totalEntries = 1

print("[MOLGANG] ChainRegistry initialized - Genesis block: 0000000000000000")
