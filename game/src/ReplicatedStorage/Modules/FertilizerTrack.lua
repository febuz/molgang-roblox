--[[
	FertilizerTrack.lua
	MOLGANG — Fertilizer Chemistry Track (PRIMARY Game Track)

	Story: "The Great Soil Crisis"
	- Act 1: Discovery (NPK basics, soil testing, compost)
	- Act 2: Mastery (Industrial synthesis, optimization, sustainability)
	- Act 3: Crisis (Contamination cleanup, environmental restoration)

	Features:
	- Fertilizer recipes (NPK compounds from real chemistry)
	- Soil analysis mini-game (pH, nutrient levels)
	- Crop testing system (apply fertilizer → see growth results)
	- Environmental impact scoring
	- Story quest progression tied to NPCs
]]

local FertilizerTrack = {}

-- ═══════════════════════════════════════════════
-- NPK FERTILIZER COMPOUNDS
-- Real chemistry: Nitrogen (N), Phosphorus (P), Potassium (K)
-- ═══════════════════════════════════════════════

FertilizerTrack.Fertilizers = {
	-- Basic fertilizers (Act 1)
	{
		id = "urea",
		name = "Urea",
		formula = "CO(NH2)2",
		npk = {46, 0, 0},         -- 46-0-0 (pure nitrogen)
		phEffect = -0.10,         -- mildly acidifying hydrolysis
		atoms = {C = 1, O = 1, N = 2, H = 4},
		points = 200,
		act = 1,
		description = "Highest nitrogen content of any solid fertilizer. Made from ammonia + CO2.",
		color = Color3.fromRGB(255, 255, 220),
	},
	{
		id = "ammonium_nitrate",
		name = "Ammonium Nitrate",
		formula = "NH4NO3",
		npk = {34, 0, 0},
		phEffect = -0.20,
		atoms = {N = 2, H = 4, O = 3},
		points = 180,
		act = 1,
		description = "Fast-acting nitrogen source. Water-soluble. Used worldwide.",
		color = Color3.fromRGB(240, 240, 240),
	},
	{
		id = "dap",
		name = "Diammonium Phosphate (DAP)",
		formula = "(NH4)2HPO4",
		npk = {18, 46, 0},
		phEffect = 0.10,
		atoms = {N = 2, H = 9, P = 1, O = 4},
		points = 300,
		act = 1,
		description = "Most widely used phosphorus fertilizer. Also provides nitrogen.",
		color = Color3.fromRGB(200, 180, 140),
	},
	{
		id = "kci",
		name = "Potassium Chloride (MOP)",
		formula = "KCl",
		npk = {0, 0, 60},
		phEffect = 0.00,
		atoms = {K = 1, Cl = 1},
		points = 150,
		act = 1,
		description = "Muriate of Potash. Cheapest potassium source. From mining.",
		color = Color3.fromRGB(255, 200, 200),
	},
	{
		id = "tsp",
		name = "Triple Superphosphate",
		formula = "Ca(H2PO4)2",
		npk = {0, 46, 0},
		phEffect = -0.20,
		atoms = {Ca = 1, H = 4, P = 2, O = 8},
		points = 250,
		act = 1,
		description = "High-phosphorus fertilizer. Made by treating rock phosphate with phosphoric acid.",
		color = Color3.fromRGB(220, 210, 190),
	},

	-- Intermediate fertilizers (Act 2)
	{
		id = "npk_15_15_15",
		name = "NPK 15-15-15 (Balanced)",
		formula = "Blend",
		npk = {15, 15, 15},
		phEffect = 0.00,
		atoms = {N = 4, P = 2, K = 2, H = 8, O = 6},
		points = 500,
		act = 2,
		description = "Balanced all-purpose fertilizer. Equal parts N, P, K. Most popular worldwide.",
		color = Color3.fromRGB(180, 200, 160),
	},
	{
		id = "ammonium_sulfate",
		name = "Ammonium Sulfate",
		formula = "(NH4)2SO4",
		npk = {21, 0, 0},
		phEffect = -0.40,
		atoms = {N = 2, H = 8, S = 1, O = 4},
		points = 220,
		act = 2,
		description = "Provides nitrogen AND sulfur. Lowers soil pH (good for alkaline soils).",
		color = Color3.fromRGB(240, 240, 255),
	},
	{
		id = "potassium_nitrate",
		name = "Potassium Nitrate",
		formula = "KNO3",
		npk = {13, 0, 44},
		phEffect = 0.00,
		atoms = {K = 1, N = 1, O = 3},
		points = 350,
		act = 2,
		description = "NK fertilizer. Chloride-free! Great for sensitive crops like tobacco, grapes.",
		color = Color3.fromRGB(230, 230, 240),
	},

	-- Advanced fertilizers (Act 3)
	{
		id = "slag_fertilizer",
		name = "Slag Bio-Enhancer",
		formula = "CaSiO3+MgO",
		npk = {0, 5, 0},
		phEffect = 0.80,
		atoms = {Ca = 2, Si = 1, Mg = 1, O = 5},
		points = 800,
		act = 3,
		description = "Made from processed steel slag! Provides Ca, Si, Mg + trace elements. Slakkenspoor specialty.",
		color = Color3.fromRGB(160, 170, 140),
		special = true,
	},
	{
		id = "biochar_blend",
		name = "Biochar-Compost Blend",
		formula = "C(organic)+NPK",
		npk = {5, 3, 4},
		phEffect = 0.50,
		atoms = {C = 6, N = 1, P = 1, K = 1, H = 4, O = 3},
		points = 600,
		act = 3,
		description = "Carbon-negative fertilizer! Biochar sequesters CO2 while feeding soil biology.",
		color = Color3.fromRGB(60, 50, 40),
		special = true,
	},
}

-- ═══════════════════════════════════════════════
-- SOIL TYPES & TESTING
-- ═══════════════════════════════════════════════

FertilizerTrack.SoilTypes = {
	{
		id = "sandy",
		name = "Sandy Soil",
		baseNutrients = {N = 10, P = 8, K = 15},
		pH = 6.0,
		drainage = "fast",
		description = "Light, drains quickly. Low nutrient retention. Needs frequent feeding.",
		color = Color3.fromRGB(210, 190, 140),
	},
	{
		id = "clay",
		name = "Clay Soil",
		baseNutrients = {N = 25, P = 30, K = 40},
		pH = 7.5,
		drainage = "slow",
		description = "Heavy, retains water and nutrients. Can be compacted. Rich but hard to work.",
		color = Color3.fromRGB(140, 100, 70),
	},
	{
		id = "loam",
		name = "Loam Soil",
		baseNutrients = {N = 20, P = 20, K = 25},
		pH = 6.8,
		drainage = "moderate",
		description = "The ideal soil! Good balance of sand, silt, clay. Best for most crops.",
		color = Color3.fromRGB(100, 80, 50),
	},
	{
		id = "peat",
		name = "Peat Soil",
		baseNutrients = {N = 35, P = 5, K = 10},
		pH = 4.5,
		drainage = "wet",
		description = "Acidic, high organic matter. Great for acid-loving plants. Low in P and K.",
		color = Color3.fromRGB(50, 40, 30),
	},
	{
		id = "contaminated",
		name = "Contaminated Soil (Act 3)",
		baseNutrients = {N = 5, P = 3, K = 5},
		pH = 3.0,
		drainage = "variable",
		description = "Industrial contamination! Heavy metals present. Needs remediation before planting.",
		color = Color3.fromRGB(80, 90, 60),
		contaminated = true,
		contaminants = {"Cr", "Pb", "Cd"},
	},
}

-- ═══════════════════════════════════════════════
-- CROP TYPES
-- Each crop has ideal NPK and pH requirements
-- ═══════════════════════════════════════════════

FertilizerTrack.Crops = {
	{
		id = "wheat",
		name = "Wheat",
		idealNPK = {120, 40, 40},
		idealPH = {6.0, 7.5},
		growthDays = 3,
		rewardCoins = 100,
		act = 1,
		icon = "W",
	},
	{
		id = "tomato",
		name = "Tomato",
		idealNPK = {80, 80, 100},
		idealPH = {6.0, 6.8},
		growthDays = 5,
		rewardCoins = 200,
		act = 1,
		icon = "T",
	},
	{
		id = "rice",
		name = "Rice",
		idealNPK = {150, 60, 60},
		idealPH = {5.5, 6.5},
		growthDays = 4,
		rewardCoins = 150,
		act = 2,
		icon = "R",
	},
	{
		id = "grape",
		name = "Grape Vine",
		idealNPK = {40, 60, 120},
		idealPH = {5.5, 6.5},
		growthDays = 7,
		rewardCoins = 400,
		act = 2,
		icon = "G",
	},
	{
		id = "phytoremediation",
		name = "Phytoremediation Plant",
		idealNPK = {60, 40, 80},
		idealPH = {4.0, 6.0},
		growthDays = 10,
		rewardCoins = 800,
		act = 3,
		icon = "P",
		special = true,
		description = "Absorbs heavy metals from contaminated soil!",
	},
}

-- ═══════════════════════════════════════════════
-- STORY QUESTS (3 Acts)
-- ═══════════════════════════════════════════════

FertilizerTrack.StoryQuests = {
	-- ACT 1: DISCOVERY
	{
		id = "act1_q1",
		act = 1,
		title = "The Soil Test",
		description = "Prof. Femke needs you to analyze soil pH in the Periodic Table Biome. Use litmus paper!",
		objective = "Test 3 different soil samples",
		npc = "Prof. Femke",
		reward = {molCoins = 200, badge = "SoilTester"},
		type = "soil_test",
		target = 3,
	},
	{
		id = "act1_q2",
		act = 1,
		title = "NPK Basics",
		description = "Farmer Chen explains: plants need N for leaves, P for roots, K for fruit. Craft your first fertilizer!",
		objective = "Synthesize Urea (CO(NH2)2)",
		npc = "Farmer Chen",
		reward = {molCoins = 300},
		type = "craft_fertilizer",
		targetFertilizer = "urea",
	},
	{
		id = "act1_q3",
		act = 1,
		title = "First Harvest",
		description = "Apply your fertilizer to wheat and watch it grow! NPK balance matters.",
		objective = "Grow and harvest wheat",
		npc = "Farmer Chen",
		reward = {molCoins = 400, badge = "FirstHarvest"},
		type = "grow_crop",
		targetCrop = "wheat",
	},
	{
		id = "act1_q4",
		act = 1,
		title = "The P Problem",
		description = "Soil is low in phosphorus. Prof. Femke suggests DAP. Synthesize it!",
		objective = "Craft DAP and apply to soil",
		npc = "Prof. Femke",
		reward = {molCoins = 500},
		type = "craft_fertilizer",
		targetFertilizer = "dap",
	},

	-- ACT 2: MASTERY
	{
		id = "act2_q1",
		act = 2,
		title = "Industrial Scale",
		description = "Direk Vanadis wants to scale up. Build a factory that produces NPK 15-15-15 balanced fertilizer.",
		objective = "Build factory + produce balanced NPK",
		npc = "Direk Vanadis",
		reward = {molCoins = 800, badge = "Industrialist"},
		type = "craft_fertilizer",
		targetFertilizer = "npk_15_15_15",
		requires = "act1_q4",
	},
	{
		id = "act2_q2",
		act = 2,
		title = "Precision Agriculture",
		description = "Each crop needs different NPK ratios. Match the right fertilizer to 3 different crops.",
		objective = "Successfully grow 3 different crops with optimized NPK",
		npc = "Prof. Femke",
		reward = {molCoins = 1000},
		type = "grow_crops",
		target = 3,
	},
	{
		id = "act2_q3",
		act = 2,
		title = "The Sulfur Secret",
		description = "Alkaline soils need sulfur. Ammonium sulfate lowers pH AND feeds nitrogen.",
		objective = "Craft ammonium sulfate and correct a pH 8.5 soil",
		npc = "Prof. Femke",
		reward = {molCoins = 600},
		type = "craft_fertilizer",
		targetFertilizer = "ammonium_sulfate",
	},

	-- ACT 3: CRISIS & RESOLUTION
	{
		id = "act3_q1",
		act = 3,
		title = "The Contamination Crisis",
		description = "Heavy metals detected in Zone 4 soil! Chromium, lead, cadmium. We need to remediate!",
		objective = "Analyze contaminated soil and identify pollutants",
		npc = "Prof. Femke",
		reward = {molCoins = 500},
		type = "soil_test",
		target = 1,
		requires = "act2_q3",
	},
	{
		id = "act3_q2",
		act = 3,
		title = "Slag to Solution",
		description = "Direk Vanadis reveals: processed steel slag can actually HEAL contaminated soil! Create Slag Bio-Enhancer.",
		objective = "Process slag + create Bio-Enhancer fertilizer",
		npc = "Direk Vanadis",
		reward = {molCoins = 1500, badge = "SlagMaster"},
		type = "craft_fertilizer",
		targetFertilizer = "slag_fertilizer",
	},
	{
		id = "act3_q3",
		act = 3,
		title = "Phytoremediation",
		description = "Use Bio-Enhancer on contaminated soil, then plant phytoremediation crops to absorb heavy metals!",
		objective = "Clean contaminated soil using plants + Bio-Enhancer",
		npc = "Prof. Femke",
		reward = {molCoins = 2000, badge = "EnvironmentHero"},
		type = "grow_crop",
		targetCrop = "phytoremediation",
	},
	{
		id = "act3_final",
		act = 3,
		title = "The Great Soil Revival",
		description = "All soil in Moleculia is restored! You've proven that industrial waste can become the cure.",
		objective = "Complete all fertilizer track quests",
		npc = "All NPCs",
		reward = {molCoins = 5000, badge = "SoilScientist"},
		type = "complete_all",
		isFinal = true,
	},
}

-- ═══════════════════════════════════════════════
-- GAMEPLAY FUNCTIONS
-- ═══════════════════════════════════════════════

-- Calculate crop yield based on soil nutrients vs crop needs
function FertilizerTrack.CalculatePHMatch(soilPH, cropId)
	local crop = nil
	for _, c in ipairs(FertilizerTrack.Crops) do
		if c.id == cropId then
			crop = c
			break
		end
	end
	if not crop or type(soilPH) ~= "number" then return 1 end

	local idealPH = crop.idealPH
	if soilPH >= idealPH[1] and soilPH <= idealPH[2] then return 1 end
	local distance = soilPH < idealPH[1] and idealPH[1] - soilPH or soilPH - idealPH[2]
	-- Two pH units away is severe stress, but not an instant crop death.
	return math.clamp(1 - distance / 2, 0.25, 1)
end

function FertilizerTrack.CalculateYield(soilNutrients, cropId, soilPH)
	local crop = nil
	for _, c in ipairs(FertilizerTrack.Crops) do
		if c.id == cropId then crop = c break end
	end
	if not crop then return 0, "Unknown crop" end

	local ideal = crop.idealNPK
	local nScore = math.clamp(soilNutrients.N / ideal[1], 0, 1.5)
	local pScore = math.clamp(soilNutrients.P / ideal[2], 0, 1.5)
	local kScore = math.clamp(soilNutrients.K / ideal[3], 0, 1.5)

	-- Liebig's Law of the Minimum: yield limited by scarcest nutrient
	local minScore = math.min(nScore, pScore, kScore)
	-- Average of all for overall quality
	local avgScore = (nScore + pScore + kScore) / 3
	local phFactor = FertilizerTrack.CalculatePHMatch(soilPH, cropId)

	local yieldPct = math.floor(minScore * avgScore * phFactor * 100)
	-- Penalty for excess (>1.0 means over-fertilized, burns plants)
	if nScore > 1.3 or pScore > 1.3 or kScore > 1.3 then
		yieldPct = math.floor(yieldPct * 0.7)  -- 30% penalty
	end

	return math.clamp(yieldPct, 0, 150), crop.name
end

-- Apply temporary world-event conditions after soil chemistry is evaluated.
-- Keep the result bounded so event stacking cannot create unbounded rewards.
function FertilizerTrack.ApplyYieldMultiplier(yieldPct, cropYieldMultiplier)
	local baseYield = tonumber(yieldPct) or 0
	local multiplier = math.max(0, tonumber(cropYieldMultiplier) or 1)
	return math.clamp(math.floor(baseYield * multiplier), 0, 200)
end

function FertilizerTrack.ApplyDemandMultiplier(basePrice, demandMultiplier)
	local price = math.max(0, tonumber(basePrice) or 0)
	local multiplier = math.max(0, tonumber(demandMultiplier) or 1)
	return math.max(1, math.floor(price * multiplier))
end

-- Stoichiometric input validation for the Fertilizer Lab.
-- The server uses these helpers so crafting consumes real atom inventory,
-- rather than minting a fertilizer after only charging currency.
function FertilizerTrack.GetMissingAtoms(atomInventory, fertilizerId)
	local fertilizer = FertilizerTrack.GetFertilizer(fertilizerId)
	if not fertilizer then return nil, "Unknown fertilizer" end
	atomInventory = atomInventory or {}
	local missing = {}
	for symbol, required in pairs(fertilizer.atoms) do
		local available = atomInventory[symbol] or 0
		if available < required then
			missing[symbol] = required - available
		end
	end
	return missing
end

function FertilizerTrack.ConsumeAtoms(atomInventory, fertilizerId)
	local missing, err = FertilizerTrack.GetMissingAtoms(atomInventory, fertilizerId)
	if not missing then return false, err end
	for _, amount in pairs(missing) do
		if amount > 0 then return false, missing end
	end
	local fertilizer = FertilizerTrack.GetFertilizer(fertilizerId)
	for symbol, required in pairs(fertilizer.atoms) do
		atomInventory[symbol] = atomInventory[symbol] - required
		if atomInventory[symbol] <= 0 then atomInventory[symbol] = nil end
	end
	return true
end

-- Get fertilizer by id
function FertilizerTrack.GetFertilizer(fertilizerId)
	for _, f in ipairs(FertilizerTrack.Fertilizers) do
		if f.id == fertilizerId then return f end
	end
	return nil
end

-- Get quests for a specific act
function FertilizerTrack.GetQuestsForAct(act)
	local quests = {}
	for _, q in ipairs(FertilizerTrack.StoryQuests) do
		if q.act == act then table.insert(quests, q) end
	end
	return quests
end

-- Get total track progress
function FertilizerTrack.GetProgress(completedQuests)
	local total = #FertilizerTrack.StoryQuests
	local done = 0
	for _, q in ipairs(FertilizerTrack.StoryQuests) do
		if completedQuests[q.id] then done = done + 1 end
	end
	return done, total, math.floor(done / total * 100)
end

return FertilizerTrack
