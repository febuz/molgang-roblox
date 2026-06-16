--[[
	AICorporation.lua
	MOLGANG — AI Competitor Corporation System

	Four rival corporations compete against players for territory, market share,
	and research supremacy. Each has a distinct personality and strategy.

	AI decision cycle runs every 5 game-minutes (server tick).
	Decisions use weighted scoring: corps evaluate all possible actions and
	pick the highest-value one given their strategy profile.

	No combat — competition through industrial output, market moves, and research.
	This replaces Red Alert's military AI with an economic warfare equivalent.
]]

local AICorporation = {}

-- ════════════════════════════════════════════════
-- CORP DEFINITIONS
-- ════════════════════════════════════════════════

AICorporation.Corps = {
	-- ┌─────────────────────────────────────────────┐
	-- │  APEX INDUSTRIES — Aggressive Expander      │
	-- │  Rushes territory, sprawls fast, thin        │
	-- │  Quote: "First there, best there."           │
	-- └─────────────────────────────────────────────┘
	{
		id = "APEX",
		name = "Apex Industries",
		founder = "Viktor Marek",
		founderTitle = "CEO & Founder",
		founderLore = "Ex-military logistics officer who pivoted to chemicals after the wars. Believes speed wins everything.",
		slogan = "First there, best there.",
		colorHex = "#E63946",   -- red

		-- Strategy weights (0–1, higher = more likely to choose this action)
		strategy = {
			expandTerritory  = 0.80,   -- very likely to attack neutral/weak territories
			buildFactories   = 0.60,   -- medium factory investment
			investResearch   = 0.20,   -- avoids slow research
			manipulateMarket = 0.40,   -- some market play
			formAlliances    = 0.10,   -- rarely allies
			defendTerritory  = 0.50,   -- moderate defense investment
		},

		-- Starting state
		molCoins         = 15000,
		researchLevel    = 1,
		controlledTerrs  = {},          -- populated at game start
		factoryCount     = 2,
		marketShare      = 0.15,        -- fraction of total market
		relations        = {},          -- {corpId or guildId = "allied"|"neutral"|"hostile"}

		-- Dialogue lines (used for news feed / radio chatter)
		lines = {
			onCapture  = {
				"Apex claims another zone. Don't blink.",
				"Viktor Marek on MOLGANG Radio: 'Hesitation is bankruptcy.'",
				"APEX PRESS: Industrial expansion continues ahead of schedule.",
			},
			onLoss     = {
				"Marek: 'Temporary setback. We redeploy in 48 hours.'",
				"Apex lawyers file 11 objections. Mining continues anyway.",
				"Insider tip: Apex just moved €20M into the spot market.",
			},
			onResearch = {
				"Apex acquires patent portfolio rather than researching. Typical.",
			},
			onDeal     = {
				"Apex signs non-compete with {partner}. Market observers are nervous.",
			},
		},
	},

	-- ┌─────────────────────────────────────────────┐
	-- │  NOVACHEM — Technology Supremacist          │
	-- │  Slow start, exponential mid-game power     │
	-- │  Quote: "The lab always outlasts the mine." │
	-- └─────────────────────────────────────────────┘
	{
		id = "NOVA",
		name = "NovaChem Solutions",
		founder = "Dr. Yuki Tanaka",
		founderTitle = "Chief Science Officer",
		founderLore = "Tokyo University chemical engineer. Holds 23 patents. Has never visited a mine in her life. Doesn't need to.",
		slogan = "The lab always outlasts the mine.",
		colorHex = "#4CC9F0",  -- blue

		strategy = {
			expandTerritory  = 0.30,   -- prefers research zones only
			buildFactories   = 0.70,   -- high-tech factories
			investResearch   = 0.95,   -- almost always researches
			manipulateMarket = 0.60,   -- plays premium pricing
			formAlliances    = 0.60,   -- trades research access for resources
			defendTerritory  = 0.70,   -- defends what it owns strongly
		},

		molCoins         = 20000,
		researchLevel    = 3,           -- starts ahead in tech
		controlledTerrs  = {},
		factoryCount     = 1,
		marketShare      = 0.12,
		relations        = {},

		lines = {
			onCapture  = {
				"NovaChem's automated extraction drones deploy in {territory}.",
				"Dr. Tanaka: 'We model the territory before we touch it. Efficiency.'",
				"NOVA RESEARCH BULLETIN: Phase-2 extraction operational.",
			},
			onLoss     = {
				"NovaChem releases satellite imagery of the lost zone. Analysis pending.",
				"Dr. Tanaka: 'We harvest the data. They can have the dirt.'",
				"NovaChem files 3 new patents citing the lost territory's geology.",
			},
			onResearch = {
				"NovaChem achieves {tech} — two years ahead of industry schedule.",
				"Dr. Tanaka keynote: 'We didn't invent V2O5 purification. We perfected it.'",
			},
			onDeal     = {
				"NovaChem–{partner} R&D sharing agreement signed. Tech transfer imminent.",
			},
		},
	},

	-- ┌─────────────────────────────────────────────┐
	-- │  GREENWAVE COLLECTIVE — Sustainability AI   │
	-- │  Environmental zones, carbon credits,       │
	-- │  carbon-neutral production premium          │
	-- │  Quote: "Clean profit or no profit."        │
	-- └─────────────────────────────────────────────┘
	{
		id = "GREEN",
		name = "GreenWave Collective",
		founder = "Amara Osei",
		founderTitle = "Director of Sustainable Operations",
		founderLore = "Former Greenpeace analyst who discovered that clean chemistry was more profitable than protest. Built a €400M company on that insight.",
		slogan = "Clean profit or no profit.",
		colorHex = "#2DC653",  -- green

		strategy = {
			expandTerritory  = 0.50,   -- targets environmental zones specifically
			buildFactories   = 0.55,   -- green factories with carbon capture
			investResearch   = 0.70,   -- heavy env/safety research
			manipulateMarket = 0.30,   -- honest pricing
			formAlliances    = 0.80,   -- very alliance-friendly
			defendTerritory  = 0.40,   -- moderate defense
		},

		molCoins         = 12000,
		researchLevel    = 2,
		controlledTerrs  = {},
		factoryCount     = 1,
		marketShare      = 0.10,
		relations        = {},

		-- GreenWave targets environmental territories first, gets carbon bonuses
		preferredTerritoryTypes = { "environmental", "agricultural" },

		lines = {
			onCapture  = {
				"GreenWave's solar-powered extraction begins in {territory}.",
				"Amara Osei: 'Every mine we open plants 10,000 trees. Net positive.'",
				"GREENWAVE UPDATE: Carbon-neutral fertilizer output up 18% this quarter.",
			},
			onLoss     = {
				"Amara Osei: 'We'll buy their carbon offsets when they poison the water table.'",
				"GreenWave files environmental impact review on new zone controllers.",
				"GreenWave pivot: lost territory → funding cleanup bonds.",
			},
			onResearch = {
				"GreenWave achieves zero-liquid-discharge certification. Industry first.",
				"Amara Osei: 'Our ICP-OES detected lead at 0.003 ppm. We set the standard.'",
			},
			onDeal     = {
				"GreenWave–{partner} sustainability pact: shared carbon reporting.",
			},
		},
	},

	-- ┌─────────────────────────────────────────────┐
	-- │  OMNICORP TRADING — Market Manipulator      │
	-- │  Trades resources, corners markets,         │
	-- │  manipulates prices strategically           │
	-- │  Quote: "We don't make chemicals. We make   │
	-- │           markets."                          │
	-- └─────────────────────────────────────────────┘
	{
		id = "OMNI",
		name = "OmniCorp Trading",
		founder = "Ethan Blackwood",
		founderTitle = "Chief Markets Officer",
		founderLore = "Hedge fund veteran who realized commodity chemicals were easier to corner than gold. OmniCorp doesn't produce — it controls supply chains.",
		slogan = "We don't make chemicals. We make markets.",
		colorHex = "#F9C74F",  -- gold

		strategy = {
			expandTerritory  = 0.45,   -- takes transit hubs specifically
			buildFactories   = 0.40,   -- minimal production; prefers buying/reselling
			investResearch   = 0.40,   -- strategic only
			manipulateMarket = 0.95,   -- core competency
			formAlliances    = 0.70,   -- alliance of convenience
			defendTerritory  = 0.60,   -- defends transit chokepoints
		},

		molCoins         = 30000,      -- starts with most capital
		researchLevel    = 1,
		controlledTerrs  = {},
		factoryCount     = 0,          -- pure trader at start
		marketShare      = 0.20,
		relations        = {},

		-- OmniCorp targets transit hubs specifically to control logistics
		preferredTerritoryTypes = { "transit_hub", "contested" },

		-- Market manipulation behaviors
		manipulation = {
			corneringThreshold = 0.40,    -- if owns >40% of resource, starts cornering
			priceSpikeMultiplier = 1.50,  -- spike prices 50% when cornering
			dumpCooldown = 300,           -- seconds between dump events
		},

		lines = {
			onCapture  = {
				"OmniCorp acquires key logistics node. Expect shipping prices to rise.",
				"Blackwood: 'Infrastructure is destiny. We own the roads.'",
				"OMNI BULLETIN: Transit fee restructuring effective immediately.",
			},
			onLoss     = {
				"Blackwood: 'We'll buy it back at auction in 6 months. Cheaper.'",
				"OmniCorp absorbs the loss. Their derivatives position was already short.",
				"Market note: OmniCorp's loss is priced in. Their bonds are unchanged.",
			},
			onResearch = {
				"OmniCorp buys NovaChem patent license instead of researching. Efficient.",
			},
			onDeal     = {
				"OmniCorp–{partner} supply agreement: guaranteed offtake at {price} MolCoins/unit.",
			},
		},
	},
}

-- ════════════════════════════════════════════════
-- INDEX
-- ════════════════════════════════════════════════

AICorporation._byId = {}
for _, corp in ipairs(AICorporation.Corps) do
	AICorporation._byId[corp.id] = corp
end

-- ════════════════════════════════════════════════
-- AI DECISION ENGINE
-- ════════════════════════════════════════════════

-- Score all possible actions and return the best one
-- Called by AICorpServer each tick
function AICorporation.DecideAction(corp, worldState)
	--[[
		worldState = {
			territories = { ... },     -- WorldTerritory snapshot
			marketPrices = { ... },    -- current prices
			playerGuilds = { ... },    -- active guilds
			otherCorps = { ... },      -- other AI corps
		}
	]]

	local candidates = {}

	-- 1. Consider capturing neutral/weak territories
	if math.random() < corp.strategy.expandTerritory then
		for _, t in ipairs(worldState.territories) do
			if t.owner == "neutral" or
			  (t.owner ~= corp.id and t.topPressure < t.defense * 0.5) then

				-- Score based on strategic preference
				local score = 30
				if corp.preferredTerritoryTypes then
					for _, pref in ipairs(corp.preferredTerritoryTypes) do
						if t.type == pref then score = score + 40 end
					end
				end
				-- Bonus for adjacent owned territories (supply chain value)
				for _, neighbor in ipairs(worldState.territories) do
					-- simplified adjacency check in worldState context
					if neighbor.owner == corp.id then score = score + 10 end
				end

				table.insert(candidates, {
					type     = "capture",
					target   = t.id,
					score    = score + math.random(-10, 10),  -- noise prevents determinism
					cost     = 500 + (t.defense * 10),
				})
			end
		end
	end

	-- 2. Consider research investment
	if math.random() < corp.strategy.investResearch and corp.molCoins > 5000 then
		table.insert(candidates, {
			type  = "research",
			score = corp.strategy.investResearch * 100 + math.random(-15, 15),
			cost  = 5000 + corp.researchLevel * 2000,
		})
	end

	-- 3. Consider building factory in controlled territory
	if math.random() < corp.strategy.buildFactories and corp.molCoins > 3000 then
		for _, t in ipairs(worldState.territories) do
			if t.owner == corp.id then
				table.insert(candidates, {
					type   = "build_factory",
					target = t.id,
					score  = corp.strategy.buildFactories * 80 + math.random(-10, 10),
					cost   = 3000 + corp.factoryCount * 500,
				})
				break -- only consider one factory build per tick
			end
		end
	end

	-- 4. Consider market manipulation
	if math.random() < corp.strategy.manipulateMarket and corp.molCoins > 2000 then
		-- Find resource to corner or dump
		local resource, action = AICorporation._findMarketOpportunity(corp, worldState)
		if resource then
			table.insert(candidates, {
				type     = "market_" .. action,
				resource = resource,
				score    = corp.strategy.manipulateMarket * 90 + math.random(-20, 20),
				cost     = 2000,
			})
		end
	end

	-- 5. Consider alliance formation
	if math.random() < corp.strategy.formAlliances then
		for _, other in ipairs(worldState.otherCorps) do
			if other.id ~= corp.id and (corp.relations[other.id] or "neutral") == "neutral" then
				table.insert(candidates, {
					type   = "ally",
					target = other.id,
					score  = corp.strategy.formAlliances * 50 + math.random(-10, 10),
					cost   = 0,
				})
				break
			end
		end
	end

	-- Pick highest-scoring affordable action
	table.sort(candidates, function(a, b) return a.score > b.score end)

	for _, candidate in ipairs(candidates) do
		if corp.molCoins >= (candidate.cost or 0) then
			return candidate
		end
	end

	-- Default: defend existing territories
	return { type = "defend", score = 0, cost = 0 }
end

-- Internal: find a market opportunity for manipulation
function AICorporation._findMarketOpportunity(corp, worldState)
	if not worldState.marketPrices then return nil, nil end

	local bestResource, bestAction, bestValue = nil, nil, 0

	for resource, price in pairs(worldState.marketPrices) do
		-- Cornering opportunity: if price is high and we have supply
		if price > 200 then
			local value = price * corp.strategy.manipulateMarket
			if value > bestValue then
				bestResource = resource
				bestAction   = "corner"
				bestValue    = value
			end
		end

		-- Dumping opportunity: if we hold stock and price is stable
		if price > 100 and price < 300 then
			local value = price * 0.5 * corp.strategy.manipulateMarket
			if value > bestValue then
				bestResource = resource
				bestAction   = "dump"
				bestValue    = value
			end
		end
	end

	return bestResource, bestAction
end

-- ════════════════════════════════════════════════
-- EXECUTE ACTION (called by AICorpServer)
-- ════════════════════════════════════════════════

function AICorporation.ExecuteAction(corp, action, WorldTerritory, marketData)
	local resultLines = {}

	if action.type == "capture" then
		local t = WorldTerritory.Get(action.target)
		if t then
			WorldTerritory.ApplyPressure(t, corp.id, 40 + corp.factoryCount * 10)
			corp.molCoins = corp.molCoins - action.cost
			local line = AICorporation._pickLine(corp.lines.onCapture, { territory = t.name })
			table.insert(resultLines, { corpName = corp.name, message = line, type = "capture" })
		end

	elseif action.type == "research" then
		corp.researchLevel = corp.researchLevel + 1
		corp.molCoins = corp.molCoins - action.cost
		local line = AICorporation._pickLine(corp.lines.onResearch, { tech = "Tier " .. corp.researchLevel })
		table.insert(resultLines, { corpName = corp.name, message = line, type = "research" })

	elseif action.type == "build_factory" then
		corp.factoryCount = corp.factoryCount + 1
		corp.molCoins = corp.molCoins - action.cost

	elseif action.type == "market_corner" and marketData then
		-- Signal to market system to raise price on this resource
		marketData.priceModifiers = marketData.priceModifiers or {}
		marketData.priceModifiers[action.resource] = (marketData.priceModifiers[action.resource] or 1) * 1.25
		corp.molCoins = corp.molCoins - action.cost

	elseif action.type == "market_dump" and marketData then
		-- Flood market, depress price temporarily
		marketData.priceModifiers = marketData.priceModifiers or {}
		marketData.priceModifiers[action.resource] = (marketData.priceModifiers[action.resource] or 1) * 0.70
		corp.molCoins = corp.molCoins + action.cost * 0.5 -- partial profit

	elseif action.type == "ally" then
		corp.relations[action.target] = "allied"
		local partnerCorp = AICorporation._byId[action.target]
		if partnerCorp then
			partnerCorp.relations[corp.id] = "allied"
			local line = AICorporation._pickLine(corp.lines.onDeal, { partner = partnerCorp.name, price = "market" })
			table.insert(resultLines, { corpName = corp.name, message = line, type = "alliance" })
		end
	end

	-- Passive income from territory control (simulated)
	for _, t in ipairs(WorldTerritory.GetControlled(corp.id)) do
		corp.molCoins = corp.molCoins + 200 + corp.factoryCount * 50
	end

	return resultLines
end

-- Pick random dialogue line, substitute placeholders
function AICorporation._pickLine(lines, subs)
	if not lines or #lines == 0 then return "" end
	local line = lines[math.random(1, #lines)]
	if subs then
		for k, v in pairs(subs) do
			line = line:gsub("{" .. k .. "}", tostring(v))
		end
	end
	return line
end

-- ════════════════════════════════════════════════
-- RELATIONSHIP SYSTEM
-- ════════════════════════════════════════════════

-- Determine if two entities should be considered hostile
function AICorporation.AreHostile(entityA, entityB)
	local corpA = AICorporation._byId[entityA]
	if corpA then
		local rel = corpA.relations[entityB]
		return rel == "hostile"
	end
	return false
end

-- Corp reacts to losing a territory (may go hostile)
function AICorporation.ReactToLoss(corp, attackerId)
	local existingRel = corp.relations[attackerId] or "neutral"
	if existingRel == "allied" then
		corp.relations[attackerId] = "neutral"
	elseif existingRel == "neutral" then
		-- Aggressive corps go hostile; others stay neutral
		if corp.strategy.expandTerritory > 0.6 then
			corp.relations[attackerId] = "hostile"
		end
	end
	-- Generate loss dialogue
	return AICorporation._pickLine(corp.lines.onLoss, {})
end

-- ════════════════════════════════════════════════
-- GETTER
-- ════════════════════════════════════════════════

function AICorporation.Get(corpId)
	return AICorporation._byId[corpId]
end

function AICorporation.GetAll()
	return AICorporation.Corps
end

-- Snapshot for client (strips sensitive strategy weights)
function AICorporation.GetPublicSnapshot()
	local snap = {}
	for _, corp in ipairs(AICorporation.Corps) do
		table.insert(snap, {
			id           = corp.id,
			name         = corp.name,
			founder      = corp.founder,
			founderTitle = corp.founderTitle,
			slogan       = corp.slogan,
			colorHex     = corp.colorHex,
			molCoins     = corp.molCoins,
			researchLevel= corp.researchLevel,
			factoryCount = corp.factoryCount,
			marketShare  = corp.marketShare,
			controlledTerrs = corp.controlledTerrs,
		})
	end
	return snap
end

return AICorporation
