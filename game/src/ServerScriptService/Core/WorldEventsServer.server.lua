-- ServerScriptService/Core/WorldEventsServer.server.lua
-- Fires dynamic world events and applies their effects to all game systems.
-- Checks for new events every 3 minutes; events fire probabilistically.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players           = game:GetService("Players")

local WorldEvents    = require(ReplicatedStorage.Modules.WorldEvents)
local WorldTerritory = require(ReplicatedStorage.Modules.WorldTerritory)
local Remotes        = require(ReplicatedStorage.Remotes.RemoteSetup)

local EVENT_CHECK_INTERVAL = 180   -- 3 minutes between event rolls
local MIN_PLAYERS_FOR_EVENTS = 1   -- minimum players in server to fire events

-- ──────────────────────────────────────────────
-- WORLD STATE (snapshot passed to event selector)
-- ──────────────────────────────────────────────

local _worldStateCache = {
	playerCount    = 0,
	extremeWeather = false,
}

local function refreshWorldState()
	_worldStateCache.playerCount = #Players:GetPlayers()
	-- (extremeWeather would be set by WeatherSystem — defaults to false)
end

-- ──────────────────────────────────────────────
-- APPLY EVENT EFFECTS TO GAME SYSTEMS
-- ──────────────────────────────────────────────

-- Effects table is aggregated by WorldEvents.GetActiveEffects()
-- Individual systems query this each tick — we broadcast summaries here

local function broadcastActiveEffects()
	local effects = WorldEvents.GetActiveEffects()
	-- Send to all clients for UI display
	Remotes.FireAllClients("WorldEffectsUpdate", {
		activeEvents = WorldEvents.GetActiveEventsSummary(),
		effects      = {
			-- Only expose what the client needs for display
			priceMultipliers    = effects.priceMultipliers,
			miningYieldMult     = effects.miningYieldMult,
			cropYieldMult       = effects.cropYieldMult,
			researchSpeedMult   = effects.researchSpeedMult,
			productionSpeedMult = effects.productionSpeedMult,
			tournamentActive    = effects.tournamentActive,
		},
	})
end

-- Apply territory resource boosts from events
local function applyTerritoryBoosts()
	local effects = WorldEvents.GetActiveEffects()
	if not effects.territoryBoosts then return end

	for _, boost in ipairs(effects.territoryBoosts) do
		local t = WorldTerritory.Get(boost.territory)
		if t and t.resources and boost.resource then
			-- Boost tracked as a temporary attribute on the territory
			t._eventBoost = t._eventBoost or {}
			t._eventBoost[boost.resource] = {
				mult    = boost.mult,
				expires = os.time() + (boost.duration or 1800),
			}
		end
	end

	-- Expire old boosts
	for _, t in ipairs(WorldTerritory.Territories) do
		if t._eventBoost then
			for resource, boost in pairs(t._eventBoost) do
				if os.time() > boost.expires then
					t._eventBoost[resource] = nil
				end
			end
		end
	end
end

-- ──────────────────────────────────────────────
-- FIRE AN EVENT
-- ──────────────────────────────────────────────

local function fireEvent(event)
	local headline = WorldEvents.FireEvent(event)

	-- Broadcast headline as world news
	Remotes.FireAllClients("WorldNewsItem", {
		corpName = "MOLGANG WORLD NEWS",
		message  = headline,
		type     = event.type,
		eventId  = event.id,
		name     = event.name,
	})

	-- Dedicated event started notification
	Remotes.FireAllClients("WorldEventStarted", {
		eventId    = event.id,
		name       = event.name,
		type       = event.type,
		headline   = headline,
		duration   = event.duration,
		hint       = event.tutorialHint,
		isComp     = event.isCompetition,
	})

	-- Urgency announce for high-value events
	if event.type == "market" or event.isCompetition then
		Remotes.FireAllClients("ServerAnnounce", {
			message = "🌐 WORLD EVENT: " .. event.name,
			rarity  = "legendary",
		})
	end

	-- Apply territory boosts immediately
	applyTerritoryBoosts()

	-- Update price modifiers in market system
	-- (AICorpServer reads WorldEvents.GetActiveEffects().priceMultipliers each market tick)
	broadcastActiveEffects()

	print("[WorldEventsServer] Fired:", event.name, "— Duration:", event.duration .. "s")
end

-- ──────────────────────────────────────────────
-- EXPIRY HANDLING
-- ──────────────────────────────────────────────

local function handleExpirations()
	local expired = WorldEvents.TickExpiry()
	if #expired > 0 then
		for _, eventId in ipairs(expired) do
			Remotes.FireAllClients("WorldEventEnded", { eventId = eventId })
		end
		broadcastActiveEffects()
		applyTerritoryBoosts()
		print("[WorldEventsServer] Expired events:", table.concat(expired, ", "))
	end
end

-- ──────────────────────────────────────────────
-- NEWS FEED REQUEST
-- ──────────────────────────────────────────────

Players.PlayerAdded:Connect(function(player)
	task.wait(4)
	-- Send recent news history to joining player
	Remotes.FireClient("WorldNewsFeed", player, {
		feed         = WorldEvents.GetNewsFeed(10),
		activeEvents = WorldEvents.GetActiveEventsSummary(),
	})
	broadcastActiveEffects()
end)

-- Client requests news feed refresh
if Remotes.RequestNewsFeed then
	Remotes.RequestNewsFeed.OnServerEvent:Connect(function(player)
		Remotes.FireClient("WorldNewsFeed", player, {
			feed         = WorldEvents.GetNewsFeed(10),
			activeEvents = WorldEvents.GetActiveEventsSummary(),
		})
	end)
end

-- ──────────────────────────────────────────────
-- MAIN TICK LOOPS
-- ──────────────────────────────────────────────

-- Event check (every 3 minutes)
task.spawn(function()
	-- Initial delay to let world warm up
	task.wait(60)

	while true do
		refreshWorldState()

		-- Only fire events if players are online
		if _worldStateCache.playerCount >= MIN_PLAYERS_FOR_EVENTS then
			local event = WorldEvents.SelectEvent(_worldStateCache)
			if event then
				fireEvent(event)
			end
		end

		-- Always check expirations
		handleExpirations()

		task.wait(EVENT_CHECK_INTERVAL)
	end
end)

-- Expiry check (every 30 seconds — events can end between ticks)
task.spawn(function()
	while true do
		task.wait(30)
		handleExpirations()
	end
end)

-- Effect broadcast (every minute — keep clients in sync)
task.spawn(function()
	while true do
		task.wait(60)
		broadcastActiveEffects()
	end
end)

-- Fire one guaranteed event on server start to give the world life immediately
task.spawn(function()
	task.wait(90)
	refreshWorldState()
	-- Force a social or market event on first startup
	local socialEvent = nil
	for _, event in ipairs(WorldEvents.Catalog) do
		if event.type == "social" then
			socialEvent = event
			break
		end
	end
	if socialEvent then
		fireEvent(socialEvent)
	end
end)

print("[MOLGANG] WorldEventsServer initialized — " .. #WorldEvents.Catalog .. " events in catalog")
