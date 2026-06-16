--[[
	WorldEvents.lua
	MOLGANG — Dynamic World Events Engine

	The GTA layer: the world feels alive because things happen without players
	initiating them. Events have causes, effects, and news headlines.

	Event categories:
	  MARKET     — price shocks, supply/demand shifts, trade opportunities
	  DISCOVERY  — new resource deposits found, geological surveys complete
	  CLIMATE    — extended weather patterns affecting production
	  POLITICAL  — regulatory changes, trade agreements between AI corps
	  RESEARCH   — tech breakthrough announcements (boosts or nerfs)
	  SOCIAL     — community events, competitions, seasonal festivals

	Events are weighted by probability and current world state — a drought
	becomes more likely if the agricultural territory has been overfarmed.

	Each event also has a "news headline" that appears in the world news feed,
	giving the world a GTA-Radio/newspaper feel.
]]

local WorldEvents = {}

-- ════════════════════════════════════════════════
-- EVENT TYPE CONSTANTS
-- ════════════════════════════════════════════════

local ET = {
	MARKET    = "market",
	DISCOVERY = "discovery",
	CLIMATE   = "climate",
	POLITICAL = "political",
	RESEARCH  = "research",
	SOCIAL    = "social",
}

-- ════════════════════════════════════════════════
-- EVENT CATALOG
-- Each event: probability weight, cooldown (seconds), effect function signature,
-- headline templates, and mechanical effect descriptor.
-- ════════════════════════════════════════════════

WorldEvents.Catalog = {

	-- ══ MARKET EVENTS ══════════════════════════════

	{
		id       = "vanadium_spike",
		type     = ET.MARKET,
		name     = "Vanadium Demand Surge",
		weight   = 0.08,
		cooldown = 3600,    -- 1 real hour minimum between occurrences
		duration = 600,     -- event lasts 10 minutes
		headlines = {
			"ENERGY STORAGE BOOM: Grid-scale vanadium batteries contracted globally.",
			"MOLGANG MARKET ALERT: V2O5 spot price up 45%. Sellers making fortunes.",
			"Battery factory orders triple — vanadium suppliers scramble.",
		},
		effects = {
			priceMultipliers = { V2O5 = 1.45, Vanadium = 1.40 },
		},
		tutorialHint = "Vanadium demand is up — if you have V2O5 stockpiled, now's the time to sell.",
	},

	{
		id       = "fertilizer_shortage",
		type     = ET.MARKET,
		name     = "Regional Fertilizer Shortage",
		weight   = 0.10,
		cooldown = 2700,
		duration = 900,
		headlines = {
			"CROP FAILURE RISK: Fertilizer stockpiles at 30-year low across the region.",
			"FARMERS PLEA: NPK prices triple overnight — chemical companies urged to increase output.",
			"Food security alert: fertilizer producers named essential industry.",
		},
		effects = {
			priceMultipliers = {
				Urea     = 1.60,
				DAP      = 1.55,
				NPK_15   = 1.50,
				AmmoniumNitrate = 1.45,
			},
		},
		tutorialHint = "Fertilizer shortage! Any NPK products in your inventory are worth premium prices right now.",
	},

	{
		id       = "iron_glut",
		type     = ET.MARKET,
		name     = "Iron Ore Oversupply",
		weight   = 0.07,
		cooldown = 3600,
		duration = 1200,
		headlines = {
			"IRON SURPLUS: Record Australian shipments crash global iron prices.",
			"MARKET FLASH: Fe spot price drops 35%. Buyers rejoice, miners suffer.",
			"Steel sector in turmoil — stockpiles overflowing at every port.",
		},
		effects = {
			priceMultipliers = { Iron = 0.65, Fe = 0.65 },
		},
		tutorialHint = "Iron is cheap right now — great time to stock up for your steel-slag pipeline.",
	},

	{
		id       = "rare_earth_embargo",
		type     = ET.MARKET,
		name     = "Rare Earth Export Embargo",
		weight   = 0.04,
		cooldown = 7200,
		duration = 1800,
		headlines = {
			"SHOCK EMBARGO: Major rare earth exporter halts all shipments.",
			"Nd, La, Ce prices TRIPLE — quantum computing and EV sectors in crisis.",
			"MOLGANG ALERT: Rare earth stockpiles critical. Hoard or sell?",
		},
		effects = {
			priceMultipliers = { Nd = 3.0, La = 2.8, Ce = 2.5, Eu = 3.5 },
		},
	},

	{
		id       = "silicon_boom",
		type     = ET.MARKET,
		name     = "Semiconductor Silicon Shortage",
		weight   = 0.06,
		cooldown = 5400,
		duration = 1200,
		headlines = {
			"CHIP CRISIS: Si-28 isotope purity demand spikes as quantum computing scales.",
			"SILICON PREMIUM: 99.9999% purity commands 400% markup over spot.",
			"Quantum computer builders compete for ultra-pure silicon — Si-28 now strategic resource.",
		},
		effects = {
			priceMultipliers = { Si28 = 4.0, SiliconWafer = 2.5, Si = 1.8 },
		},
	},

	-- ══ DISCOVERY EVENTS ════════════════════════════

	{
		id       = "new_vanadium_vein",
		type     = ET.DISCOVERY,
		name     = "Massive Vanadium Vein Discovered",
		weight   = 0.04,
		cooldown = 10800,
		duration = 300,   -- announcement is instant
		headlines = {
			"GEOLOGICAL SURVEY: Unexplored vanadium deposit found beneath Eastern Slag Basin.",
			"DISCOVERY ALERT: 500,000-tonne V2O5-grade ore body confirmed. Rush begins.",
			"Prospectors flood to the Eastern Ridge. Vanadium territory now contested.",
		},
		effects = {
			-- Boosts resource yield in a target territory for next 30 minutes
			territoryResourceBoost = { territory = "INN_SE", resource = "V", mult = 2.0, duration = 1800 },
		},
		tutorialHint = "A new vanadium deposit was found! Capture Acid Valley to benefit from the bonus yield.",
	},

	{
		id       = "lithium_strike",
		type     = ET.DISCOVERY,
		name     = "Lithium Brine Strike",
		weight   = 0.03,
		cooldown = 14400,
		duration = 300,
		headlines = {
			"BRINE STRIKE: 300km² of high-grade lithium brine identified via satellite survey.",
			"Battery revolution accelerates: new lithium supply could power 10M EVs per year.",
			"GreenWave and Apex already filing territory claims on Lithium Saltpan.",
		},
		effects = {
			territoryResourceBoost = { territory = "OUT_SW1", resource = "Li", mult = 3.0, duration = 3600 },
		},
	},

	{
		id       = "platinum_meteorite",
		type     = ET.DISCOVERY,
		name     = "Platinum Meteorite Fragment",
		weight   = 0.01,
		cooldown = 86400,   -- once per day maximum
		duration = 300,
		headlines = {
			"EXTRAORDINARY FIND: Platinum-rich meteorite fragment surface at Observatory Hills.",
			"Scientists estimate 50kg of platinum group metals in the impact site.",
			"Observatory Hills declared a high-security research zone. Access limited.",
		},
		effects = {
			territoryResourceBoost = { territory = "OUT_NNE2", resource = "Pt", mult = 10.0, duration = 7200 },
			priceMultipliers       = { Pt = 1.8 },
		},
	},

	-- ══ CLIMATE EVENTS ══════════════════════════════

	{
		id       = "extended_drought",
		type     = ET.CLIMATE,
		name     = "Extended Regional Drought",
		weight   = 0.06,
		cooldown = 5400,
		duration = 1800,
		headlines = {
			"DROUGHT WARNING: 60-day water deficit impacts all open-pit mining operations.",
			"Water rationing imposed — process water costs increase 80% across region.",
			"MOLGANG WEATHER: Dry spell forces leaching tank shutdowns. Stockpile impacts ahead.",
		},
		effects = {
			processWaterCostMult = 1.80,
			leachingEfficiencyMult = 0.75,
			cropYieldMult = 0.60,
		},
		tutorialHint = "Drought is active — water-intensive leaching processes will cost more and run slower.",
	},

	{
		id       = "heavy_rain_season",
		type     = ET.CLIMATE,
		name     = "Heavy Rain Season",
		weight   = 0.07,
		cooldown = 4800,
		duration = 1200,
		headlines = {
			"MONSOON ARRIVES: Continuous rainfall floods open-pit mines, halting extraction.",
			"Silver lining: crop fields get free irrigation. Fertilizer demand drops temporarily.",
			"Mining operations suspend outdoor activities. Factory indoor work unaffected.",
		},
		effects = {
			miningYieldMult = 0.50,
			cropWaterCostMult = 0,    -- free water
			fertilizerDemandMult = 0.80,
		},
	},

	{
		id       = "ideal_growing_season",
		type     = ET.CLIMATE,
		name     = "Ideal Growing Season",
		weight   = 0.08,
		cooldown = 3600,
		duration = 900,
		headlines = {
			"PERFECT GROWING SEASON: Regional conditions optimal for all major crops.",
			"Farmers report 40% yield increase — fertilizer demand at record highs.",
			"Agricultural economists: this could be the best harvest in a decade.",
		},
		effects = {
			cropYieldMult = 1.40,
			fertilizerDemandMult = 1.60,
		},
	},

	-- ══ POLITICAL EVENTS ════════════════════════════

	{
		id       = "eu_fertilizer_directive",
		type     = ET.POLITICAL,
		name     = "New EU Fertilizer Regulation",
		weight   = 0.04,
		cooldown = 7200,
		duration = 3600,
		headlines = {
			"EU REGULATION 2026/44: New heavy metal limits in fertilizers effective immediately.",
			"Fertilizer producers must achieve ICP-OES certification or face market exclusion.",
			"GreenWave praises new rules. Apex Industries lobbies for 18-month exemption.",
		},
		effects = {
			-- Uncertified producers get price penalty; certified get premium
			certifiedPricePremium   = 1.30,
			uncertifiedPricePenalty = 0.70,
			requiresCertification   = true,
		},
		tutorialHint = "New EU rules require ICP-OES certification. Research the Environmental branch to stay competitive.",
	},

	{
		id       = "carbon_tax",
		type     = ET.POLITICAL,
		name     = "Regional Carbon Tax Introduced",
		weight   = 0.05,
		cooldown = 10800,
		duration = 2400,
		headlines = {
			"CARBON TAX: €50/tonne CO₂ equivalent tax on all industrial emissions.",
			"GreenWave exempt due to carbon-neutral certification. Others face heavy bills.",
			"MOLGANG: Your factory's power consumption now has a carbon cost. Efficiency pays.",
		},
		effects = {
			carbonTaxPerKW       = 0.05,   -- MolCoins per kW per minute
			greenExemptFromTax   = true,
		},
	},

	{
		id       = "free_trade_zone",
		type     = ET.POLITICAL,
		name     = "Free Trade Zone Established",
		weight   = 0.05,
		cooldown = 5400,
		duration = 1200,
		headlines = {
			"FREE TRADE AGREEMENT: Market tariffs suspended for 24 hours — all trade tax-free.",
			"TRADE WINDOW OPEN: No import fees, no export restrictions. Traders scrambling.",
			"OmniCorp sources: 'We knew this was coming. Positioned weeks ago.'",
		},
		effects = {
			tradeTaxMult    = 0,      -- no market fees
			tradingVolumeBonus = 1.50, -- more buyers/sellers active
		},
	},

	-- ══ RESEARCH EVENTS ════════════════════════════

	{
		id       = "chemistry_breakthrough",
		type     = ET.RESEARCH,
		name     = "Chemical Process Breakthrough",
		weight   = 0.06,
		cooldown = 5400,
		duration = 600,
		headlines = {
			"BREAKTHROUGH: University team publishes 30% faster V2O5 leaching process.",
			"Open-source chemistry: new reagent combination cuts extraction cost in half.",
			"NovaChem: 'We've been using this method for 6 months. Welcome to 2026.'",
		},
		effects = {
			-- All players get temporary research speed bonus
			researchSpeedMult = 1.30,
			leachingEfficiencyMult = 1.20,
			duration = 600,
		},
		tutorialHint = "A chemistry breakthrough is giving everyone a research bonus for the next 10 minutes!",
	},

	{
		id       = "automation_advance",
		type     = ET.RESEARCH,
		name     = "Factory Automation Advance",
		weight   = 0.05,
		cooldown = 7200,
		duration = 900,
		headlines = {
			"AUTOMATION: New robotic processing system reduces factory operating costs 20%.",
			"Industry 4.0 arrives in MOLGANG: smart conveyors self-optimize routing.",
			"Factory efficiency records broken globally. Early adopters see 25% gains.",
		},
		effects = {
			factoryOpCostMult   = 0.80,
			productionSpeedMult = 1.15,
		},
	},

	-- ══ SOCIAL EVENTS ════════════════════════════

	{
		id       = "chemistry_olympiad",
		type     = ET.SOCIAL,
		name     = "International Chemistry Olympiad",
		weight   = 0.04,
		cooldown = 14400,
		duration = 1800,
		headlines = {
			"CHEMISTRY OLYMPIAD: Top students compete for MOLGANG scholarships.",
			"Best molecule synthesis wins the Grand Prize: 10,000 MolCoins!",
			"Event sponsor Dr. Femke: 'We need the next generation of process engineers.'",
		},
		effects = {
			-- Molecule-building gives 50% bonus points during event
			moleculeBonusMultiplier = 1.50,
			specialBadge = "ChemOlympian",
		},
		isCompetition = true,
	},

	{
		id       = "green_week",
		type     = ET.SOCIAL,
		name     = "Green Industry Week",
		weight   = 0.04,
		cooldown = 10800,
		duration = 3600,
		headlines = {
			"GREEN WEEK: All environmental certifications earn triple MolCoin rewards.",
			"Carbon offset trading volume spikes 300% during Green Industry Week.",
			"Amara Osei keynote: 'Sustainable chemistry is the only chemistry.'",
		},
		effects = {
			carbonCreditMult       = 3.0,
			envResearchCostMult    = 0.60,
			greenBadgeBonus        = 500,  -- MolCoins
		},
	},

	{
		id       = "guild_tournament",
		type     = ET.SOCIAL,
		name     = "Inter-Guild Production Tournament",
		weight   = 0.06,
		cooldown = 7200,
		duration = 3600,
		headlines = {
			"TOURNAMENT: Guilds compete for most V2O5 produced in 60 minutes. Winner takes all.",
			"Guild prize pool: 50,000 MolCoins split among top 3 guilds.",
			"Neutral players can join any guild temporarily for tournament duration.",
		},
		effects = {
			tournamentActive = true,
			productionBonusMult = 1.20,  -- everyone produces more
		},
		isCompetition = true,
	},
}

-- ════════════════════════════════════════════════
-- EVENT STATE MANAGEMENT
-- ════════════════════════════════════════════════

WorldEvents._active    = {}   -- { eventId = { event, startTime, endTime } }
WorldEvents._cooldowns = {}   -- { eventId = lastFiredTime }
WorldEvents._history   = {}   -- last 20 events for news feed

-- ════════════════════════════════════════════════
-- EVENT SELECTION & FIRING
-- ════════════════════════════════════════════════

-- Pick next event to fire based on weights and cooldowns
function WorldEvents.SelectEvent(worldState)
	local now = os.time()
	local eligible = {}
	local totalWeight = 0

	for _, event in ipairs(WorldEvents.Catalog) do
		-- Skip if in cooldown
		local lastFired = WorldEvents._cooldowns[event.id] or 0
		if now - lastFired < event.cooldown then continue end

		-- Skip if already active
		if WorldEvents._active[event.id] then continue end

		-- World-state conditional weight adjustments
		local w = event.weight
		if worldState then
			-- Climate events more likely if weather has been extreme
			if event.type == ET.CLIMATE and worldState.extremeWeather then w = w * 1.5 end
			-- Market events more likely if player count is high
			if event.type == ET.MARKET and (worldState.playerCount or 1) > 10 then w = w * 1.3 end
		end

		table.insert(eligible, { event = event, weight = w })
		totalWeight = totalWeight + w
	end

	if #eligible == 0 or totalWeight <= 0 then return nil end

	-- Weighted random selection
	local roll = math.random() * totalWeight
	local cumulative = 0
	for _, entry in ipairs(eligible) do
		cumulative = cumulative + entry.weight
		if roll <= cumulative then
			return entry.event
		end
	end

	return eligible[#eligible].event
end

-- Fire an event
function WorldEvents.FireEvent(event)
	local now = os.time()
	WorldEvents._active[event.id] = {
		event     = event,
		startTime = now,
		endTime   = now + event.duration,
	}
	WorldEvents._cooldowns[event.id] = now

	-- Add to history
	local headline = event.headlines[math.random(1, #event.headlines)]
	table.insert(WorldEvents._history, 1, {
		time      = now,
		eventId   = event.id,
		type      = event.type,
		name      = event.name,
		headline  = headline,
	})
	if #WorldEvents._history > 20 then
		table.remove(WorldEvents._history, 21)
	end

	return headline
end

-- Expire finished events, return list of expired event ids
function WorldEvents.TickExpiry()
	local now = os.time()
	local expired = {}
	for id, active in pairs(WorldEvents._active) do
		if now >= active.endTime then
			table.insert(expired, id)
			WorldEvents._active[id] = nil
		end
	end
	return expired
end

-- ════════════════════════════════════════════════
-- EFFECT AGGREGATION
-- ════════════════════════════════════════════════

-- Collect all active effects into one table (server applies these each tick)
function WorldEvents.GetActiveEffects()
	local combined = {}

	for _, active in pairs(WorldEvents._active) do
		local eff = active.event.effects or {}

		-- Price multipliers: stack multiplicatively
		if eff.priceMultipliers then
			combined.priceMultipliers = combined.priceMultipliers or {}
			for resource, mult in pairs(eff.priceMultipliers) do
				combined.priceMultipliers[resource] = (combined.priceMultipliers[resource] or 1) * mult
			end
		end

		-- Scalar effects: stack multiplicatively
		local scalars = {
			"miningYieldMult", "leachingEfficiencyMult", "cropYieldMult",
			"fertilizerDemandMult", "productionSpeedMult", "researchSpeedMult",
			"factoryOpCostMult", "processWaterCostMult", "carbonCreditMult",
			"moleculeBonusMultiplier", "productionBonusMult",
			"certifiedPricePremium", "uncertifiedPricePenalty",
			"tradeTaxMult",
		}
		for _, key in ipairs(scalars) do
			if eff[key] ~= nil then
				combined[key] = (combined[key] or 1) * eff[key]
			end
		end

		-- Boolean flags: any active event sets it
		local flags = { "requiresCertification", "greenExemptFromTax", "tournamentActive", "isCompetition" }
		for _, key in ipairs(flags) do
			if eff[key] then combined[key] = true end
		end

		-- Additive values
		if eff.carbonTaxPerKW then
			combined.carbonTaxPerKW = (combined.carbonTaxPerKW or 0) + eff.carbonTaxPerKW
		end
		if eff.tradingVolumeBonus then
			combined.tradingVolumeBonus = (combined.tradingVolumeBonus or 1) * eff.tradingVolumeBonus
		end

		-- Territory resource boosts (list)
		if eff.territoryResourceBoost then
			combined.territoryBoosts = combined.territoryBoosts or {}
			table.insert(combined.territoryBoosts, eff.territoryResourceBoost)
		end
	end

	return combined
end

-- ════════════════════════════════════════════════
-- NEWS FEED
-- ════════════════════════════════════════════════

function WorldEvents.GetNewsFeed(maxEntries)
	maxEntries = maxEntries or 10
	local feed = {}
	for i = 1, math.min(maxEntries, #WorldEvents._history) do
		table.insert(feed, WorldEvents._history[i])
	end
	return feed
end

function WorldEvents.GetActiveEventsSummary()
	local summary = {}
	for id, active in pairs(WorldEvents._active) do
		local remaining = active.endTime - os.time()
		table.insert(summary, {
			id        = id,
			name      = active.event.name,
			type      = active.event.type,
			remaining = math.max(0, remaining),
			hint      = active.event.tutorialHint,
		})
	end
	return summary
end

return WorldEvents
