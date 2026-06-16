--[[
	WorldTerritory.lua
	MOLGANG — Strategic Territory Control System

	The world is divided into 49 hex territories arranged in a 7×7 axial grid.
	Guilds and AI corporations capture territories to gain resource bonuses and
	strategic advantages. Captures are won through industrial output — no combat.

	Capture mechanic:
	  - Each territory has a "pressure" meter (0–100)
	  - Owning a factory/mine in adjacent territory adds pressure per minute
	  - Pressure from AI corps decays over time unless actively defended
	  - At 100 pressure, control flips to the attacker

	This creates a Red Alert-style front line without any violence.
]]

local WorldTerritory = {}

-- ════════════════════════════════════════════════
-- TERRITORY TYPES & RESOURCE PROFILES
-- ════════════════════════════════════════════════

local TERRITORY_TYPES = {
	MINERAL_RICH  = "mineral_rich",   -- high ore yield
	INDUSTRIAL    = "industrial",     -- factory efficiency bonus
	AGRICULTURAL  = "agricultural",   -- fertilizer demand bonus
	RESEARCH      = "research",       -- research speed bonus
	TRANSIT_HUB   = "transit_hub",    -- logistics throughput bonus
	CONTESTED     = "contested",      -- high value, no inherent bonus
	ENVIRONMENTAL = "environmental",  -- carbon score bonus
}

-- Bonuses granted to territory controller (multipliers)
local TYPE_BONUSES = {
	[TERRITORY_TYPES.MINERAL_RICH]  = { oreYield = 1.30, miningCost = 0.85 },
	[TERRITORY_TYPES.INDUSTRIAL]    = { productionSpeed = 1.20, powerCost = 0.90 },
	[TERRITORY_TYPES.AGRICULTURAL]  = { fertilizerPrice = 1.25, cropYield = 1.20 },
	[TERRITORY_TYPES.RESEARCH]      = { researchSpeed = 1.35, researchCost = 0.80 },
	[TERRITORY_TYPES.TRANSIT_HUB]   = { logisticsCapacity = 1.50, routeCost = 0.70 },
	[TERRITORY_TYPES.CONTESTED]     = { allYields = 1.15 },
	[TERRITORY_TYPES.ENVIRONMENTAL] = { carbonScore = 1.40, euCertPremium = 1.20 },
}

-- ════════════════════════════════════════════════
-- 49-HEX TERRITORY MAP (7×7 axial grid)
-- q, r = axial coordinates; center = (0,0)
-- ════════════════════════════════════════════════

WorldTerritory.Territories = {
	-- === CORE NEXUS (center) ===
	{
		id = "NEX_00",
		name = "Nexus Prime",
		q = 0, r = 0,
		type = TERRITORY_TYPES.TRANSIT_HUB,
		owner = "neutral",   -- guildId, AI corp id, or "neutral"
		pressure = {},       -- {attackerId = pressureValue}
		defense = 50,        -- base defense requires 50 pressure to start flip
		resources = { Fe = 5, V = 3, Ca = 8 },
		lore = "The original research station where MOLGANG began. Whoever holds Nexus Prime controls the main pipeline grid.",
		worldPos = Vector3.new(0, 0, 0),   -- Roblox world position (approximate)
	},

	-- === RING 1: Inner territories (6) ===
	{
		id = "INN_N",
		name = "Northern Flats",
		q = 0, r = -1,
		type = TERRITORY_TYPES.AGRICULTURAL,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { N = 12, K = 8, P = 6 },
		lore = "Fertile plains with rich NPK deposits. Farmers from across the region fought to work this land.",
		worldPos = Vector3.new(0, 0, -300),
	},
	{
		id = "INN_NE",
		name = "Iron Ridge",
		q = 1, r = -1,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 25,
		resources = { Fe = 20, Ti = 5, Mn = 3 },
		lore = "Magnetite veins run 400m deep. Three mining companies collapsed trying to extract this.",
		worldPos = Vector3.new(260, 0, -150),
	},
	{
		id = "INN_SE",
		name = "Acid Valley",
		q = 1, r = 0,
		type = TERRITORY_TYPES.INDUSTRIAL,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { S = 15, Cl = 10, H = 20 },
		lore = "Sulfurous hot springs made this valley unusable for centuries. Now it's an acid leaching paradise.",
		worldPos = Vector3.new(260, 0, 150),
	},
	{
		id = "INN_S",
		name = "Slag Basin",
		q = 0, r = 1,
		type = TERRITORY_TYPES.INDUSTRIAL,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { Ca = 18, Si = 10, Al = 8 },
		lore = "A century of steel production left these plains ankle-deep in slag. A curse turned to opportunity.",
		worldPos = Vector3.new(0, 0, 300),
	},
	{
		id = "INN_SW",
		name = "Green Basin",
		q = -1, r = 1,
		type = TERRITORY_TYPES.ENVIRONMENTAL,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { C = 10, O = 25, N = 8 },
		lore = "The wetlands survived industrialization. Now the carbon credits from this zone are worth more than ore.",
		worldPos = Vector3.new(-260, 0, 150),
	},
	{
		id = "INN_NW",
		name = "Crystal Lab",
		q = -1, r = 0,
		type = TERRITORY_TYPES.RESEARCH,
		owner = "neutral",
		pressure = {},
		defense = 30,
		resources = { Si = 20, Ge = 2, Ga = 1 },
		lore = "Built on a quartz mesa. The natural silicon purity here cut research costs by 40%.",
		worldPos = Vector3.new(-260, 0, -150),
	},

	-- === RING 2: Middle territories (12) ===
	{
		id = "MID_N",
		name = "Vanadium Heights",
		q = 0, r = -2,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 30,
		resources = { V = 25, Cr = 8, Mo = 4 },
		lore = "The vanadium pentoxide capital of the region. Whoever mines this writes the fertilizer market.",
		worldPos = Vector3.new(0, 0, -600),
	},
	{
		id = "MID_NNE",
		name = "Trade Crossing",
		q = 1, r = -2,
		type = TERRITORY_TYPES.TRANSIT_HUB,
		owner = "neutral",
		pressure = {},
		defense = 25,
		resources = { Cu = 8, Ag = 2, Au = 1 },
		lore = "Ancient trade road repurposed for pipelines and rail. All routes cross here.",
		worldPos = Vector3.new(260, 0, -520),
	},
	{
		id = "MID_NE",
		name = "Titanite Peaks",
		q = 2, r = -2,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 35,
		resources = { Ti = 20, Zr = 5, Hf = 2 },
		lore = "Rare earth titanium veins at elevation. Extraction is brutal. The view is worth it.",
		worldPos = Vector3.new(520, 0, -300),
	},
	{
		id = "MID_ENE",
		name = "Eastern Refinery Row",
		q = 2, r = -1,
		type = TERRITORY_TYPES.INDUSTRIAL,
		owner = "neutral",
		pressure = {},
		defense = 25,
		resources = { Fe = 10, Ni = 6, Co = 4 },
		lore = "Three generations of refinery workers built their lives here. The infrastructure is already in place.",
		worldPos = Vector3.new(600, 0, 0),
	},
	{
		id = "MID_E",
		name = "Copper Coast",
		q = 2, r = 0,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 30,
		resources = { Cu = 22, Zn = 10, Pb = 4 },
		lore = "The coastline runs blue-green from ancient copper deposits. Electrolytic refining plants dot the shore.",
		worldPos = Vector3.new(520, 0, 300),
	},
	{
		id = "MID_ESE",
		name = "Shipping Terminal",
		q = 2, r = 1,
		type = TERRITORY_TYPES.TRANSIT_HUB,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { Al = 8, Mg = 6, Na = 10 },
		lore = "Deep water port. Export your fertilizers to world markets from here.",
		worldPos = Vector3.new(260, 0, 520),
	},
	{
		id = "MID_SE",
		name = "Phosphate Dunes",
		q = 1, r = 1,
		type = TERRITORY_TYPES.AGRICULTURAL,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { P = 30, Ca = 12, F = 8 },
		lore = "Marine phosphate deposits from a prehistoric sea. The finest DAP fertilizer starts here.",
		worldPos = Vector3.new(260, 0, 600),
	},
	{
		id = "MID_SSE",
		name = "Potash Plains",
		q = 0, r = 2,
		type = TERRITORY_TYPES.AGRICULTURAL,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { K = 28, Mg = 10, B = 3 },
		lore = "Evaporite potash beds 200m thick. The K in every NPK fertilizer may come from here.",
		worldPos = Vector3.new(0, 0, 600),
	},
	{
		id = "MID_S",
		name = "Urea Delta",
		q = -1, r = 2,
		type = TERRITORY_TYPES.AGRICULTURAL,
		owner = "neutral",
		pressure = {},
		defense = 25,
		resources = { N = 20, H = 30, C = 12 },
		lore = "Natural gas pockets beneath the delta feed ammonia synthesis. Urea 46-0-0 is made here cheaply.",
		worldPos = Vector3.new(-260, 0, 520),
	},
	{
		id = "MID_SW",
		name = "Wetland Reserve",
		q = -2, r = 2,
		type = TERRITORY_TYPES.ENVIRONMENTAL,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { O = 20, C = 15, N = 6 },
		lore = "Protected wetlands generating massive carbon credits. Development forbidden — but credits are sellable.",
		worldPos = Vector3.new(-520, 0, 300),
	},
	{
		id = "MID_WSW",
		name = "Wind Farm Mesa",
		q = -2, r = 1,
		type = TERRITORY_TYPES.ENVIRONMENTAL,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { Li = 4, Nd = 2, Co = 6 },
		lore = "Wind turbine material: rare earth magnets and lithium batteries all sourced from this plateau.",
		worldPos = Vector3.new(-600, 0, 0),
	},
	{
		id = "MID_W",
		name = "Quantum Valley",
		q = -2, r = 0,
		type = TERRITORY_TYPES.RESEARCH,
		owner = "neutral",
		pressure = {},
		defense = 40,
		resources = { Si = 25, Ge = 5, In = 2 },
		lore = "High-purity silicon isotope deposits. Si-28 purification endgame content starts here.",
		worldPos = Vector3.new(-520, 0, -300),
	},
	{
		id = "MID_WNW",
		name = "Biotech Campus",
		q = -2, r = -1,
		type = TERRITORY_TYPES.RESEARCH,
		owner = "neutral",
		pressure = {},
		defense = 35,
		resources = { C = 18, N = 10, O = 15, P = 8 },
		lore = "Microbial research labs. The biostimulant certification breakthrough happened in Building 4.",
		worldPos = Vector3.new(-260, 0, -520),
	},
	{
		id = "MID_NW",
		name = "High Plateau Lab",
		q = -1, r = -1,
		type = TERRITORY_TYPES.RESEARCH,
		owner = "neutral",
		pressure = {},
		defense = 30,
		resources = { Ga = 3, As = 2, Se = 4 },
		lore = "Altitude gives perfect atmospheric pressure for gas-phase synthesis experiments.",
		worldPos = Vector3.new(-260, 0, -300),
	},

	-- === RING 3: Outer territories (18) — far reaches ===
	{
		id = "OUT_N1",
		name = "Arctic Manganese Fields",
		q = 0, r = -3,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 40,
		resources = { Mn = 30, Fe = 10, Co = 8, Ni = 6 },
		lore = "Permafrost conceals the richest manganese deposit in the region. Heating costs are brutal in winter.",
		worldPos = Vector3.new(0, 0, -900),
	},
	{
		id = "OUT_NNE1",
		name = "Steel Coast",
		q = 1, r = -3,
		type = TERRITORY_TYPES.INDUSTRIAL,
		owner = "neutral",
		pressure = {},
		defense = 35,
		resources = { Fe = 25, C = 15, Cr = 6 },
		lore = "Historic steel belt. The blast furnaces never went cold — they just changed what they make.",
		worldPos = Vector3.new(440, 0, -760),
	},
	{
		id = "OUT_NE1",
		name = "Chromite Badlands",
		q = 2, r = -3,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 45,
		resources = { Cr = 28, Fe = 12, Mg = 10 },
		lore = "Forbidden zone from the old chemical wars. Chromium contamination makes it dangerous. Rich rewards.",
		worldPos = Vector3.new(760, 0, -440),
	},
	{
		id = "OUT_ENE1",
		name = "Nickel Cliffs",
		q = 3, r = -2,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 40,
		resources = { Ni = 25, Cu = 10, S = 20 },
		lore = "Sulphide nickel ore at cliff face. Smelter smoke turned the rocks orange. Worth it.",
		worldPos = Vector3.new(900, 0, 0),
	},
	{
		id = "OUT_E1",
		name = "Deep Sea Platform",
		q = 3, r = -1,
		type = TERRITORY_TYPES.TRANSIT_HUB,
		owner = "neutral",
		pressure = {},
		defense = 30,
		resources = { Mg = 20, Br = 8, Na = 15 },
		lore = "Offshore extraction platform. The only way to reach the deep ocean mineral nodes.",
		worldPos = Vector3.new(900, 0, 300),
	},
	{
		id = "OUT_E2",
		name = "Zinc Estuary",
		q = 3, r = 0,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 30,
		resources = { Zn = 30, Pb = 8, Cd = 2 },
		lore = "River delta rich in sphalerite deposits. Electrolytic zinc refinery already built on-site.",
		worldPos = Vector3.new(900, 0, 300),
	},
	{
		id = "OUT_ESE1",
		name = "Salt Flats Terminal",
		q = 3, r = 1,
		type = TERRITORY_TYPES.TRANSIT_HUB,
		owner = "neutral",
		pressure = {},
		defense = 25,
		resources = { Na = 30, Cl = 30, K = 10 },
		lore = "Evaporation flats producing industrial salt. The rail hub here connects east and west regions.",
		worldPos = Vector3.new(760, 0, 440),
	},
	{
		id = "OUT_SE1",
		name = "Phosphate Lagoon",
		q = 2, r = 2,
		type = TERRITORY_TYPES.AGRICULTURAL,
		owner = "neutral",
		pressure = {},
		defense = 30,
		resources = { P = 40, Ca = 20, C = 8 },
		lore = "Marine phosphate nodules washed onto shore. The highest P concentrations in the known world.",
		worldPos = Vector3.new(520, 0, 600),
	},
	{
		id = "OUT_SSE1",
		name = "Nitrogen Basin",
		q = 1, r = 3,
		type = TERRITORY_TYPES.AGRICULTURAL,
		owner = "neutral",
		pressure = {},
		defense = 25,
		resources = { N = 35, H = 40, Ar = 5 },
		lore = "Natural nitrogen fixing bacteria thrive here. Biological N source before synthetic Haber-Bosch.",
		worldPos = Vector3.new(440, 0, 760),
	},
	{
		id = "OUT_S1",
		name = "Cropland Expanse",
		q = 0, r = 3,
		type = TERRITORY_TYPES.AGRICULTURAL,
		owner = "neutral",
		pressure = {},
		defense = 20,
		resources = { K = 20, P = 15, N = 12 },
		lore = "The world's most fertile soils. Every fertilizer product can be tested for real crop yield here.",
		worldPos = Vector3.new(0, 0, 900),
	},
	{
		id = "OUT_SSW1",
		name = "Potassium Caverns",
		q = -1, r = 3,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 35,
		resources = { K = 45, Mg = 15, Br = 6 },
		lore = "Underground potash caverns stretching for kilometers. The deepest shafts reach 800 meters.",
		worldPos = Vector3.new(-440, 0, 760),
	},
	{
		id = "OUT_SW1",
		name = "Lithium Saltpan",
		q = -2, r = 3,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 40,
		resources = { Li = 25, Mg = 12, B = 10 },
		lore = "White lithium brine pans stretch to the horizon. Battery revolution demand made this priceless.",
		worldPos = Vector3.new(-760, 0, 440),
	},
	{
		id = "OUT_W1",
		name = "Rare Earth Canyon",
		q = -3, r = 2,
		type = TERRITORY_TYPES.MINERAL_RICH,
		owner = "neutral",
		pressure = {},
		defense = 50,
		resources = { La = 8, Ce = 10, Nd = 6, Eu = 2 },
		lore = "Fifteen rare earth elements in one canyon. Strategic resource for every high-tech industry.",
		worldPos = Vector3.new(-900, 0, 0),
	},
	{
		id = "OUT_WNW1",
		name = "Silicon Glacier",
		q = -3, r = 1,
		type = TERRITORY_TYPES.RESEARCH,
		owner = "neutral",
		pressure = {},
		defense = 45,
		resources = { Si = 40, O = 20, Al = 10 },
		lore = "Glacial quartz sand of extraordinary purity. Si-28 isotope separation is possible only here.",
		worldPos = Vector3.new(-900, 0, -300),
	},
	{
		id = "OUT_NW1",
		name = "Boron Mountains",
		q = -3, r = 0,
		type = TERRITORY_TYPES.RESEARCH,
		owner = "neutral",
		pressure = {},
		defense = 40,
		resources = { B = 20, Na = 10, O = 15 },
		lore = "Tourmaline and borax deposits. Boron compounds are essential for specialty fertilizers and glass.",
		worldPos = Vector3.new(-760, 0, -440),
	},
	{
		id = "OUT_WNW2",
		name = "Geothermal Ridge",
		q = -3, r = -1,
		type = TERRITORY_TYPES.ENVIRONMENTAL,
		owner = "neutral",
		pressure = {},
		defense = 35,
		resources = { S = 20, H = 15, He = 3 },
		lore = "Geothermal energy at zero carbon. Powers half the research labs if you control this ridge.",
		worldPos = Vector3.new(-440, 0, -760),
	},
	{
		id = "OUT_NW2",
		name = "Solar Plateau",
		q = -2, r = -2,
		type = TERRITORY_TYPES.ENVIRONMENTAL,
		owner = "neutral",
		pressure = {},
		defense = 30,
		resources = { Si = 15, Ag = 3, Te = 2 },
		lore = "Highest solar irradiance in the region. Photovoltaic silicon comes from here.",
		worldPos = Vector3.new(-440, 0, -760),
	},
	{
		id = "OUT_NNW1",
		name = "Nitrogen Crater",
		q = -1, r = -2,
		type = TERRITORY_TYPES.RESEARCH,
		owner = "neutral",
		pressure = {},
		defense = 35,
		resources = { N = 25, Ar = 10, He = 5 },
		lore = "Impact crater filled with nitrogen-rich deposits. Low-temperature N research thrives here.",
		worldPos = Vector3.new(-260, 0, -900),
	},
	{
		id = "OUT_NNE2",
		name = "Observatory Hills",
		q = 1, r = -2,
		type = TERRITORY_TYPES.RESEARCH,
		owner = "neutral",
		pressure = {},
		defense = 30,
		resources = { Pt = 2, Pd = 1, Ir = 1 },
		lore = "Platinum group metals deposited by an ancient meteorite. Also home to the region's best telescope.",
		worldPos = Vector3.new(260, 0, -780),
	},

	-- === LEGENDARY (1): The Grand Convergence — center of endgame ===
	{
		id = "LEG_GC",
		name = "Grand Convergence",
		q = 0, r = 0,   -- overlaps Nexus in narrative; treated as separate contested zone
		type = TERRITORY_TYPES.CONTESTED,
		owner = "neutral",
		pressure = {},
		defense = 75,   -- hardest to capture
		resources = { Au = 5, Pt = 3, U = 1, Si = 50, V = 20 },
		lore = "Where all supply chains intersect. The faction that holds the Grand Convergence for 72 hours wins the season.",
		worldPos = Vector3.new(100, 0, 100),
		isLegendary = true,
	},
}

-- ════════════════════════════════════════════════
-- INDEX FOR FAST LOOKUP
-- ════════════════════════════════════════════════

WorldTerritory._byId = {}
WorldTerritory._byCoord = {}

for _, t in ipairs(WorldTerritory.Territories) do
	WorldTerritory._byId[t.id] = t
	WorldTerritory._byCoord[t.q .. "," .. t.r] = t
end

-- ════════════════════════════════════════════════
-- HEX ADJACENCY
-- ════════════════════════════════════════════════

local HEX_DIRECTIONS = {
	{q=1, r=0}, {q=1, r=-1}, {q=0, r=-1},
	{q=-1, r=0}, {q=-1, r=1}, {q=0, r=1},
}

function WorldTerritory.GetAdjacent(territoryId)
	local t = WorldTerritory._byId[territoryId]
	if not t then return {} end
	local neighbors = {}
	for _, dir in ipairs(HEX_DIRECTIONS) do
		local key = (t.q + dir.q) .. "," .. (t.r + dir.r)
		local neighbor = WorldTerritory._byCoord[key]
		if neighbor then
			table.insert(neighbors, neighbor)
		end
	end
	return neighbors
end

-- ════════════════════════════════════════════════
-- CAPTURE MECHANICS
-- ════════════════════════════════════════════════

-- Apply industrial pressure to a territory (called every minute by server)
-- attackerId: guildId or AI corp id
-- pressureAmount: how much pressure this tick adds (based on factories/mines in adjacent tiles)
function WorldTerritory.ApplyPressure(territory, attackerId, pressureAmount)
	if territory.owner == attackerId then return end -- already owns it

	territory.pressure[attackerId] = (territory.pressure[attackerId] or 0) + pressureAmount

	-- Natural decay: pressure from other attackers decays slightly each tick
	for id, val in pairs(territory.pressure) do
		if id ~= attackerId then
			territory.pressure[id] = val * 0.95 -- 5% decay
			if territory.pressure[id] < 1 then
				territory.pressure[id] = nil
			end
		end
	end
end

-- Decay all pressure (called each tick even without attacks — defense holds)
function WorldTerritory.DecayAllPressure(territory)
	for id, val in pairs(territory.pressure) do
		territory.pressure[id] = val * 0.98 -- 2% decay without active attack
		if territory.pressure[id] < 1 then
			territory.pressure[id] = nil
		end
	end
end

-- Check if territory flips; returns {flipped=bool, newOwner=string} or nil
function WorldTerritory.CheckCapture(territory)
	-- Find highest pressure attacker
	local topAttacker, topPressure = nil, 0
	for id, val in pairs(territory.pressure) do
		if val > topPressure then
			topAttacker = id
			topPressure = val
		end
	end

	if not topAttacker then return nil end

	local threshold = territory.defense + 100 -- needs defense + 100 pressure to flip
	if topPressure >= threshold then
		local previousOwner = territory.owner
		territory.owner = topAttacker
		territory.pressure = {}  -- reset pressure on capture
		return { flipped = true, newOwner = topAttacker, previousOwner = previousOwner }
	end

	return nil
end

-- ════════════════════════════════════════════════
-- BONUS CALCULATION
-- ════════════════════════════════════════════════

-- Get all bonuses a guild or corp gets from controlled territories
function WorldTerritory.GetOwnerBonuses(ownerId)
	local bonuses = {}
	for _, t in ipairs(WorldTerritory.Territories) do
		if t.owner == ownerId then
			local typeBonus = TYPE_BONUSES[t.type] or {}
			for stat, mult in pairs(typeBonus) do
				bonuses[stat] = (bonuses[stat] or 1) * mult
			end
		end
	end
	return bonuses
end

-- Get territories controlled by a specific owner
function WorldTerritory.GetControlled(ownerId)
	local controlled = {}
	for _, t in ipairs(WorldTerritory.Territories) do
		if t.owner == ownerId then
			table.insert(controlled, t)
		end
	end
	return controlled
end

-- Get territory by id
function WorldTerritory.Get(territoryId)
	return WorldTerritory._byId[territoryId]
end

-- Get territory at axial coordinates
function WorldTerritory.GetAt(q, r)
	return WorldTerritory._byCoord[q .. "," .. r]
end

-- ════════════════════════════════════════════════
-- SEASON VICTORY CHECK
-- ════════════════════════════════════════════════

-- Grand Convergence held for SEASON_WIN_DURATION seconds wins the season
local SEASON_WIN_DURATION = 72 * 3600 -- 72 real hours

WorldTerritory.SeasonHoldStart = {} -- {ownerId = os.time() when hold started}

function WorldTerritory.CheckSeasonVictory()
	local gc = WorldTerritory._byId["LEG_GC"]
	if not gc or gc.owner == "neutral" then
		WorldTerritory.SeasonHoldStart = {}
		return nil
	end

	local owner = gc.owner
	if not WorldTerritory.SeasonHoldStart[owner] then
		WorldTerritory.SeasonHoldStart = { [owner] = os.time() }
	end

	local holdDuration = os.time() - WorldTerritory.SeasonHoldStart[owner]
	if holdDuration >= SEASON_WIN_DURATION then
		return { winner = owner, holdDuration = holdDuration }
	end

	return nil
end

-- ════════════════════════════════════════════════
-- STAT SNAPSHOT (for client sync)
-- ════════════════════════════════════════════════

function WorldTerritory.GetSnapshot()
	local snapshot = {}
	for _, t in ipairs(WorldTerritory.Territories) do
		table.insert(snapshot, {
			id        = t.id,
			name      = t.name,
			type      = t.type,
			owner     = t.owner,
			defense   = t.defense,
			topPressure = (function()
				local top = 0
				for _, v in pairs(t.pressure) do
					if v > top then top = v end
				end
				return top
			end)(),
			resources = t.resources,
			isLegendary = t.isLegendary or false,
		})
	end
	return snapshot
end

return WorldTerritory
