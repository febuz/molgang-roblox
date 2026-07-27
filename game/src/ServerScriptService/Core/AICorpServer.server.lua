-- ServerScriptService/Core/AICorpServer.server.lua
-- Drives AI corporation decision loop, market manipulation, and world chatter.
-- AI corps make decisions every 5 minutes (configurable).

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreProvider = require(ReplicatedStorage.Modules.DataStoreProvider)

local AICorporation  = require(ReplicatedStorage.Modules.AICorporation)
local WorldTerritory = require(ReplicatedStorage.Modules.WorldTerritory)
local DiplomacySystem = require(ReplicatedStorage.Modules.DiplomacySystem)
local Remotes        = require(ReplicatedStorage.Remotes.RemoteSetup)

local AI_TICK_INTERVAL = 300    -- 5 minutes between AI decision rounds
local MARKET_TICK_INTERVAL = 60 -- market prices update every minute

-- DataStore for AI corp state persistence
local aiStore = DataStoreProvider.GetDataStore("MolGang_AICorpState_v1")

-- ──────────────────────────────────────────────
-- MARKET DATA (shared with AICorpServer)
-- Prices are managed here and pushed to clients via MarketPricesUpdated
-- ──────────────────────────────────────────────

local marketData = {
	prices = {
		-- Base commodity prices (MolCoins per unit)
		V2O5    = 800,   Vanadium  = 300, Iron     = 100, Copper  = 150,
		Gold    = 500,   Tungsten  = 400, Aluminum = 80,  Carbon  = 60,
		Nitrogen = 70,   Urea      = 400, DAP      = 600, NPK_15  = 500,
		AmmoniumNitrate = 350,
		Silicon  = 200,  Si28      = 2000,
		Lithium  = 350,  Nickel    = 300,
		Pt       = 1500, La        = 600, Ce       = 550, Nd      = 800,
	},
	priceModifiers = {},  -- {resource = multiplier} from AI manipulation
	history        = {},  -- { {time, resource, price} } last 100 entries
	volume         = {},  -- {resource = units traded this minute}
}

local function getCurrentPrice(resource)
	local base = marketData.prices[resource] or 100
	local mod  = marketData.priceModifiers[resource] or 1
	-- Clamp price between 10% and 500% of base
	return math.clamp(math.floor(base * mod), math.floor(base * 0.10), math.floor(base * 5.0))
end

local function applyNaturalPriceDrift()
	-- Prices naturally drift back toward base (mean reversion)
	for resource, mod in pairs(marketData.priceModifiers) do
		-- 3% reversion per minute
		local newMod = mod + (1.0 - mod) * 0.03
		if math.abs(newMod - 1.0) < 0.01 then
			marketData.priceModifiers[resource] = nil
		else
			marketData.priceModifiers[resource] = newMod
		end
	end

	-- Small random walk on all prices ±2%
	for resource in pairs(marketData.prices) do
		local drift = 1 + (math.random() - 0.5) * 0.04  -- ±2%
		marketData.priceModifiers[resource] = (marketData.priceModifiers[resource] or 1) * drift
		-- Don't drift too far without manipulation
		marketData.priceModifiers[resource] = math.clamp(
			marketData.priceModifiers[resource], 0.50, 2.50
		)
	end
end

-- ──────────────────────────────────────────────
-- PERSIST / RESTORE AI STATE
-- ──────────────────────────────────────────────

local function saveAIState()
	local snapshot = {}
	for _, corp in ipairs(AICorporation.Corps) do
		snapshot[corp.id] = {
			molCoins      = corp.molCoins,
			researchLevel = corp.researchLevel,
			factoryCount  = corp.factoryCount,
			marketShare   = corp.marketShare,
			relations     = corp.relations,
		}
	end
	pcall(function()
		aiStore:SetAsync("ai_corps_global", snapshot)
	end)
end

local function loadAIState()
	local ok, data = pcall(function()
		return aiStore:GetAsync("ai_corps_global")
	end)
	if ok and data then
		for _, corp in ipairs(AICorporation.Corps) do
			if data[corp.id] then
				corp.molCoins      = data[corp.id].molCoins      or corp.molCoins
				corp.researchLevel = data[corp.id].researchLevel or corp.researchLevel
				corp.factoryCount  = data[corp.id].factoryCount  or corp.factoryCount
				corp.marketShare   = data[corp.id].marketShare   or corp.marketShare
				corp.relations     = data[corp.id].relations     or {}
			end
		end
		print("[AICorpServer] Restored AI corp state")
	else
		print("[AICorpServer] No saved AI state — starting fresh")
	end
end

-- ──────────────────────────────────────────────
-- ASSIGN STARTING TERRITORIES
-- Give AI corps a few starting territories at game start
-- ──────────────────────────────────────────────

local function assignStartingTerritories()
	-- Only assign if they have none (fresh world)
	local apexTerrs  = { "INN_SE", "MID_ENE" }         -- industrial zones
	local novaTerrs  = { "INN_NW", "MID_W" }            -- research zones
	local greenTerrs = { "INN_SW", "MID_WSW" }          -- environmental
	local omniTerrs  = { "INN_N", "MID_NNE" }           -- transit hubs

	local assignments = {
		APEX  = apexTerrs,
		NOVA  = novaTerrs,
		GREEN = greenTerrs,
		OMNI  = omniTerrs,
	}

	for corpId, terrIds in pairs(assignments) do
		local corp = AICorporation.Get(corpId)
		if corp and #corp.controlledTerrs == 0 then
			for _, tid in ipairs(terrIds) do
				local t = WorldTerritory.Get(tid)
				if t and t.owner == "neutral" then
					t.owner = corpId
					table.insert(corp.controlledTerrs, tid)
				end
			end
		end
	end
end

-- ──────────────────────────────────────────────
-- AI DECISION TICK
-- ──────────────────────────────────────────────

local function buildWorldState()
	return {
		territories = WorldTerritory.GetSnapshot(),
		marketPrices = (function()
			local prices = {}
			for res in pairs(marketData.prices) do
				prices[res] = getCurrentPrice(res)
			end
			return prices
		end)(),
		playerCount = #game:GetService("Players"):GetPlayers(),
		otherCorps  = AICorporation.GetAll(),
	}
end

local function runAITick()
	local worldState = buildWorldState()
	local allNews = {}

	for _, corp in ipairs(AICorporation.Corps) do
		-- Corps get passive income from controlled territories
		local controlled = WorldTerritory.GetControlled(corp.id)
		corp.controlledTerrs = {}
		for _, t in ipairs(controlled) do
			table.insert(corp.controlledTerrs, t.id)
		end

		-- Decide and execute action
		local action = AICorporation.DecideAction(corp, worldState)
		local newsLines = AICorporation.ExecuteAction(corp, action, WorldTerritory, marketData)

		-- Apply research level to market share
		corp.marketShare = math.clamp(
			corp.marketShare + corp.researchLevel * 0.001,
			0.05,
			0.40
		)

		for _, nl in ipairs(newsLines) do
			table.insert(allNews, nl)
		end

		-- Check if AI corps want to propose diplomacy with players
		-- (proposals to other AI corps)
		if math.random() < corp.strategy.formAlliances * 0.3 then
			for _, other in ipairs(AICorporation.Corps) do
				if other.id ~= corp.id and (corp.relations[other.id] or "neutral") == "neutral" then
					local proposalTypes = { "TRADE_AGREEMENT", "RESEARCH_SHARE", "NON_AGGRESSION" }
					local chosen = proposalTypes[math.random(1, #proposalTypes)]
					local prop, _ = DiplomacySystem.Propose(corp.id, other.id, chosen, {}, nil)
					if prop then
						DiplomacySystem.AIEvaluateProposal(prop.id, other)
					end
					break
				end
			end
		end
	end

	-- Broadcast news to clients (max 3 per tick to avoid spam)
	local count = 0
	for _, nl in ipairs(allNews) do
		if count >= 3 then break end
		Remotes.FireAllClients("WorldNewsItem", nl)
		count = count + 1
	end

	-- Update territory → corp mapping in corps
	for _, corp in ipairs(AICorporation.Corps) do
		local controlled = WorldTerritory.GetControlled(corp.id)
		corp.controlledTerrs = {}
		for _, t in ipairs(controlled) do
			table.insert(corp.controlledTerrs, t.id)
		end
	end

	-- Push corp snapshot to clients
	Remotes.FireAllClients("AICorpStateUpdate", AICorporation.GetPublicSnapshot())

	saveAIState()
end

-- ──────────────────────────────────────────────
-- MARKET TICK
-- ──────────────────────────────────────────────

local function runMarketTick()
	applyNaturalPriceDrift()

	-- Apply AI manipulation modifiers
	for _, corp in ipairs(AICorporation.Corps) do
		local manipulation = corp.manipulation
		if manipulation then
			-- Already applied in ExecuteAction; modifiers persist in marketData
		end
	end

	-- Build current price table and send to clients
	local currentPrices = {}
	for resource, base in pairs(marketData.prices) do
		currentPrices[resource] = getCurrentPrice(resource)
	end

	Remotes.FireAllClients("MarketPricesUpdated", currentPrices)
end

-- ──────────────────────────────────────────────
-- REMOTES: CLIENT REQUESTS
-- ──────────────────────────────────────────────

-- Client requests diplomacy proposal to an AI corp
if Remotes.RequestProposeTreaty then
	Remotes.RequestProposeTreaty.OnServerEvent:Connect(function(player, targetId, treatyTypeId, terms)
		local guildId = player:GetAttribute("Guild")
		if not guildId then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "You must be in a guild to propose treaties.",
				rarity  = "common",
			})
			return
		end

		local prop, err = DiplomacySystem.Propose(guildId, targetId, treatyTypeId, terms or {})
		if not prop then
			Remotes.FireClient("DiplomacyResult", player, { success = false, error = err })
			return
		end

		-- If target is an AI corp, evaluate immediately
		local targetCorp = AICorporation.Get(targetId)
		if targetCorp then
			local treaty, rejectReason = DiplomacySystem.AIEvaluateProposal(prop.id, targetCorp)
			if treaty then
				Remotes.FireClient("DiplomacyResult", player, {
					success    = true,
					treatyId   = treaty.id,
					treatyType = treaty.treatyType,
					partner    = targetCorp.name,
				})
				Remotes.FireClient("ServerAnnounce", player, {
					message = targetCorp.name .. " accepted your " .. treatyTypeId .. " proposal!",
					rarity  = "rare",
				})
			else
				Remotes.FireClient("DiplomacyResult", player, {
					success = false,
					error   = rejectReason or "Proposal rejected",
				})
			end
		else
			-- Player-to-player treaty: notify target guild (requires player lookup)
			Remotes.FireClient("DiplomacyResult", player, {
				success    = true,
				proposalId = prop.id,
				message    = "Treaty proposed. Waiting for " .. targetId .. " to respond.",
			})
		end
	end)
end

-- Client requests AI corp + market state on join
game:GetService("Players").PlayerAdded:Connect(function(player)
	task.wait(3)
	Remotes.FireClient("AICorpStateUpdate", player, AICorporation.GetPublicSnapshot())
	local currentPrices = {}
	for resource in pairs(marketData.prices) do
		currentPrices[resource] = getCurrentPrice(resource)
	end
	Remotes.FireClient("MarketPricesUpdated", player, currentPrices)
end)

-- ──────────────────────────────────────────────
-- STARTUP
-- ──────────────────────────────────────────────

loadAIState()
assignStartingTerritories()

-- Market tick every minute
task.spawn(function()
	while true do
		task.wait(MARKET_TICK_INTERVAL)
		local ok, err = pcall(runMarketTick)
		if not ok then warn("[AICorpServer] Market tick error:", err) end
	end
end)

-- AI decision tick every 5 minutes
task.spawn(function()
	task.wait(30)  -- delay startup to let other systems initialize
	while true do
		local ok, err = pcall(runAITick)
		if not ok then warn("[AICorpServer] AI tick error:", err) end
		task.wait(AI_TICK_INTERVAL)
	end
end)

-- Diplomacy expiry check every minute
task.spawn(function()
	while true do
		task.wait(60)
		local expiredTreaties  = DiplomacySystem.TickExpiry()
		if #expiredTreaties > 0 then
			Remotes.FireAllClients("DiplomacyExpired", { treaties = expiredTreaties })
		end
	end
end)

game:BindToClose(function()
	saveAIState()
end)

print("[MOLGANG] AICorpServer initialized — " .. #AICorporation.Corps .. " AI corporations active")
