-- ServerScriptService/Core/TerritoryServer.server.lua
-- Drives the WorldTerritory capture system and syncs state to clients.
-- Ticks every 60 seconds (1 game-minute = 1 real minute for territory pressure).

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreProvider = require(ReplicatedStorage.Modules.DataStoreProvider)
local Players           = game:GetService("Players")

local WorldTerritory = require(ReplicatedStorage.Modules.WorldTerritory)
local AICorporation  = require(ReplicatedStorage.Modules.AICorporation)
local DiplomacySystem = require(ReplicatedStorage.Modules.DiplomacySystem)
local Remotes        = require(ReplicatedStorage.Remotes.RemoteSetup)

local TICK_INTERVAL     = 60    -- seconds between pressure ticks
local CAPTURE_ANNOUNCE  = true  -- broadcast when territories flip

-- DataStore for persistent territory state
local territoryStore = DataStoreProvider.GetDataStore("MolGang_TerritoryState_v1")

-- ──────────────────────────────────────────────
-- PERSIST / RESTORE
-- ──────────────────────────────────────────────

local function saveTerritoryState()
	local snapshot = {}
	for _, t in ipairs(WorldTerritory.Territories) do
		snapshot[t.id] = {
			owner    = t.owner,
			pressure = t.pressure,
			defense  = t.defense,
		}
	end
	pcall(function()
		territoryStore:SetAsync("territory_global", snapshot)
	end)
end

local function loadTerritoryState()
	local ok, data = pcall(function()
		return territoryStore:GetAsync("territory_global")
	end)
	if ok and data then
		for _, t in ipairs(WorldTerritory.Territories) do
			if data[t.id] then
				t.owner    = data[t.id].owner    or t.owner
				t.pressure = data[t.id].pressure or {}
				t.defense  = data[t.id].defense  or t.defense
			end
		end
		print("[TerritoryServer] Restored territory state from DataStore")
	else
		print("[TerritoryServer] No saved state — using defaults")
	end
end

-- ──────────────────────────────────────────────
-- GUILD → TERRITORY PRESSURE CALCULATION
-- Each guild gets pressure proportional to:
--   - factories in adjacent territories: +15/min each
--   - mines in adjacent territories: +10/min each
--   - bonus from allied corps: +5/min per allied corp territory
-- ──────────────────────────────────────────────

local function getGuildPressureFor(guildId, targetTerritory, playerData)
	-- Sum up adjacent assets owned by this guild
	local neighbors = WorldTerritory.GetAdjacent(targetTerritory.id)
	local pressure = 0

	for _, neighbor in ipairs(neighbors) do
		if neighbor.owner == guildId then
			pressure = pressure + 20  -- base adjacency pressure per owned neighbor
		end
	end

	-- Bonus from guild's factories (fetched from player data aggregate)
	-- (playerData is a map of userId → data, passed in from economy manager)
	for _, data in pairs(playerData) do
		if data.guild == guildId and data.facilities then
			pressure = pressure + (data.facilities.factories or 0) * 15
			pressure = pressure + (data.facilities.mines or 0) * 10
		end
	end

	-- Non-aggression pact blocks pressure
	if DiplomacySystem.HasTreaty(guildId, targetTerritory.owner, "NON_AGGRESSION") then
		pressure = 0
	end

	return pressure
end

-- ──────────────────────────────────────────────
-- PRESSURE TICK
-- ──────────────────────────────────────────────

-- Shared player data reference (populated by EconomyManager startup event)
local _playerDataCache = {}

-- Receive player data updates from EconomyManager via BindableEvent or direct table
-- (In a full implementation, server scripts share via a module-level singleton)
-- Here we collect it from player attributes for simplicity
local function refreshPlayerDataCache()
	for _, player in ipairs(Players:GetPlayers()) do
		local userId = player.UserId
		local guild  = player:GetAttribute("Guild")
		local factories = player:GetAttribute("Factories") or 0
		local mines     = player:GetAttribute("Mines") or 0
		if guild then
			_playerDataCache[tostring(userId)] = {
				guild = guild, facilities = { factories = factories, mines = mines }
			}
		end
	end
end

local function runPressureTick()
	refreshPlayerDataCache()

	-- Collect all active guild ids from player data
	local guilds = {}
	for _, data in pairs(_playerDataCache) do
		if data.guild then guilds[data.guild] = true end
	end

	-- Apply pressure from all guilds to non-owned territories
	for _, territory in ipairs(WorldTerritory.Territories) do
		for guildId in pairs(guilds) do
			if territory.owner ~= guildId then
				local pressure = getGuildPressureFor(guildId, territory, _playerDataCache)
				if pressure > 0 then
					WorldTerritory.ApplyPressure(territory, guildId, pressure)
				end
			end
		end

		-- Natural decay for uncontested territories
		WorldTerritory.DecayAllPressure(territory)

		-- Check for capture
		local result = WorldTerritory.CheckCapture(territory)
		if result and result.flipped then
			local prevOwner = result.previousOwner
			local newOwner  = result.newOwner
			local tName     = territory.name

			-- Reputation consequences for AI corps
			local aiCorp = AICorporation.Get(prevOwner)
			if aiCorp then
				local line = AICorporation.ReactToLoss(aiCorp, newOwner)
				if line ~= "" then
					Remotes.FireAllClients("ServerAnnounce", {
						message = "[" .. aiCorp.name .. "] " .. line,
						rarity  = "uncommon",
					})
				end
			end

			if CAPTURE_ANNOUNCE then
				local ownerLabel = newOwner
				local prevLabel  = (prevOwner == "neutral") and "neutral territory" or prevOwner
				Remotes.FireAllClients("TerritoryChanged", {
					territoryId   = territory.id,
					territoryName = tName,
					newOwner      = newOwner,
					previousOwner = prevLabel,
					message       = ownerLabel .. " captured " .. tName .. "!",
				})
				Remotes.FireAllClients("ServerAnnounce", {
					message = "⚡ " .. ownerLabel .. " captured " .. tName .. "!",
					rarity  = "rare",
				})
			end
		end
	end

	-- Season victory check
	local victory = WorldTerritory.CheckSeasonVictory()
	if victory then
		Remotes.FireAllClients("SeasonVictory", {
			winner       = victory.winner,
			holdDuration = victory.holdDuration,
			message      = "🏆 " .. victory.winner .. " has won the season by holding the Grand Convergence!",
		})
		-- Reset Grand Convergence for next season
		local gc = WorldTerritory.Get("LEG_GC")
		if gc then
			gc.owner = "neutral"
			gc.pressure = {}
			WorldTerritory.SeasonHoldStart = {}
		end
	end

	-- Push updated snapshot to all clients
	Remotes.FireAllClients("TerritoryStateUpdate", WorldTerritory.GetSnapshot())

	-- Persist every 5 ticks (~5 minutes)
	if (os.time() % 300) < TICK_INTERVAL then
		saveTerritoryState()
	end
end

-- ──────────────────────────────────────────────
-- REMOTES: CLIENT REQUESTS
-- ──────────────────────────────────────────────

-- Client requests full territory state on join
Remotes.RequestTerritoryState = Remotes.RequestTerritoryState or script  -- fallback

Players.PlayerAdded:Connect(function(player)
	task.wait(3) -- wait for player data to load
	Remotes.FireClient("TerritoryStateUpdate", player, WorldTerritory.GetSnapshot())
end)

-- Client requests to apply pressure (attack) manually — costs MolCoins
Remotes.RequestTerritoryAttack = Remotes.RequestTerritoryAttack
if Remotes.RequestTerritoryAttack then
	Remotes.RequestTerritoryAttack.OnServerEvent:Connect(function(player, territoryId)
		local data = _playerDataCache[tostring(player.UserId)]
		if not data or not data.guild then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Join a guild to participate in territory control.",
				rarity  = "common",
			})
			return
		end

		local territory = WorldTerritory.Get(territoryId)
		if not territory then return end
		if territory.owner == data.guild then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Your guild already controls " .. territory.name .. ".",
				rarity  = "common",
			})
			return
		end

		-- Manual attack: costs 100 MolCoins, adds 30 pressure
		-- (MolCoin deduction handled by EconomyManager; we just note the pressure here)
		-- In production, use a BindableEvent to request deduction from EconomyManager
		WorldTerritory.ApplyPressure(territory, data.guild, 30)
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Applied industrial pressure to " .. territory.name .. ".",
			rarity  = "uncommon",
		})
	end)
end

-- ──────────────────────────────────────────────
-- STARTUP
-- ──────────────────────────────────────────────

loadTerritoryState()

-- Main tick loop
task.spawn(function()
	while true do
		task.wait(TICK_INTERVAL)
		local ok, err = pcall(runPressureTick)
		if not ok then
			warn("[TerritoryServer] Tick error:", err)
		end
	end
end)

game:BindToClose(function()
	saveTerritoryState()
end)

print("[MOLGANG] TerritoryServer initialized — " .. #WorldTerritory.Territories .. " territories loaded")
