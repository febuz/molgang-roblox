--[[
	SteelSlag.lua
	MOLGANG — Realistic BOF Steel Slag Processing Chemistry

	Models real Basic Oxygen Furnace (BOF) slag from steel production.
	Slag arrives as 5cm+ chunks and must be crushed before leaching.
	Different acids/bases extract different metals at different rates.
	Leaching time scales realistically with particle size.

	Real-world basis:
	- BOF slag composition from Tata Steel / ArcelorMittal data
	- Leaching kinetics simplified but proportionally accurate
	- pH-dependent metal solubility modeled per reagent
]]

local SteelSlag = {}

local ACTIVATION_ENERGIES = {
	CaO = 25, FeO = 40, V2O5 = 55, TiO2 = 70, SiO2 = 90,
	Al2O3 = 35, Cr2O3 = 50, MnO = 50, MgO = 50, P2O5 = 50,
}

local function arrheniusMultiplier(tempCelsius, activationEnergy)
	local T = tempCelsius + 273.15
	local exponent = (-(activationEnergy * 1000) / 8.314) * (1 / T - 1 / 298.15)
	return math.clamp(math.exp(exponent), 0.01, 100)
end

-- ═══════════════════════════════════════════════
-- BOF SLAG COMPOSITION (weight % of oxides)
-- Based on typical European BOF slag
-- ═══════════════════════════════════════════════

SteelSlag.Composition = {
	CaO   = {pct = 45.0, name = "Calcium Oxide (Lime)",       color = Color3.fromRGB(240, 235, 210)},
	SiO2  = {pct = 14.0, name = "Silicon Dioxide (Silica)",    color = Color3.fromRGB(200, 200, 240)},
	FeO   = {pct = 17.0, name = "Iron Oxide (Wustite)",        color = Color3.fromRGB(100, 60, 40)},
	MgO   = {pct = 7.0,  name = "Magnesium Oxide (Magnesia)",  color = Color3.fromRGB(220, 220, 220)},
	Al2O3 = {pct = 2.5,  name = "Aluminium Oxide (Alumina)",   color = Color3.fromRGB(190, 195, 210)},
	MnO   = {pct = 4.0,  name = "Manganese Oxide",             color = Color3.fromRGB(60, 50, 55)},
	P2O5  = {pct = 2.5,  name = "Phosphorus Pentoxide",        color = Color3.fromRGB(255, 200, 180)},
	V2O5  = {pct = 1.5,  name = "Vanadium Pentoxide",          color = Color3.fromRGB(255, 215, 0)},
	TiO2  = {pct = 1.2,  name = "Titanium Dioxide",            color = Color3.fromRGB(245, 245, 245)},
	Cr2O3 = {pct = 0.8,  name = "Chromium(III) Oxide",         color = Color3.fromRGB(68, 180, 68)},
	-- Remaining ~4.5% is trace elements and free iron
}

-- ═══════════════════════════════════════════════
-- PARTICLE SIZE CLASSES
-- Smaller = faster leaching but requires more processing
-- ═══════════════════════════════════════════════

SteelSlag.ParticleSizes = {
	chunk = {
		name = "Raw Chunks",
		description = "5cm+ pieces straight from the supplier",
		sizeLabel = ">50mm",
		leachMultiplier = 7.0,    -- 7x base leach time
		crushCost = 0,            -- no crush needed, this IS the raw form
		crushHits = 0,
		surfaceArea = 0.02,       -- relative surface area per kg
		color = Color3.fromRGB(80, 70, 60),
	},
	crushed = {
		name = "Crushed Pieces",
		description = "~1cm pieces, hammer-crushed by hand",
		sizeLabel = "~10mm",
		leachMultiplier = 3.0,    -- 3x base leach time
		crushCost = 0,            -- free (manual labor)
		crushHits = 8,            -- clicks/taps to crush one batch
		surfaceArea = 0.2,
		color = Color3.fromRGB(100, 90, 75),
	},
	ground = {
		name = "Ground Slag",
		description = "~1mm particles, requires grinding machine",
		sizeLabel = "~1mm",
		leachMultiplier = 1.0,    -- base leach time
		crushCost = 200,          -- MolCoins for machine grinding
		crushHits = 0,            -- machine does it
		surfaceArea = 2.0,
		color = Color3.fromRGB(130, 120, 105),
	},
	powder = {
		name = "Fine Powder",
		description = "<0.1mm, ball-milled — fastest leaching",
		sizeLabel = "<0.1mm",
		leachMultiplier = 0.3,    -- 30% of base time
		crushCost = 500,          -- expensive machine milling
		crushHits = 0,
		surfaceArea = 20.0,
		color = Color3.fromRGB(160, 150, 135),
	},
}

-- Order for UI display and progression
SteelSlag.SizeOrder = {"chunk", "crushed", "ground", "powder"}

-- ═══════════════════════════════════════════════
-- COMPLETE INDUSTRIAL PROCESSING PIPELINE
-- Based on real Harsco / Tata Steel / ArcelorMittal processes
-- Each station transforms slag through one step
-- ═══════════════════════════════════════════════

SteelSlag.ProcessingStations = {
	{
		id = "slag_pit",
		name = "Slag Cooling Pit",
		description = "Molten BOF slag (~1600°C) is poured into cooling pits. Air-cooled for 24-48h to form solid chunks.",
		inputItem = "molten_slag",
		outputItem = "chunk",
		duration = 2880,           -- 2 game days (represents 24-48h real)
		cost = 0,
		automatic = true,          -- happens passively
		temperature = 1600,        -- starting temp °C
		emoji = "🔥",
	},
	{
		id = "vibrating_feeder",
		name = "Vibrating Feeder",
		description = "Feeds cooled slag chunks uniformly to the jaw crusher at controlled rate.",
		inputItem = "chunk",
		outputItem = "chunk_fed",   -- same size, just queued for crusher
		duration = 5,
		cost = 0,
		automatic = true,
	},
	{
		id = "jaw_crusher",
		name = "Jaw Crusher",
		description = "Primary crushing: breaks 5cm+ chunks to ~10cm pieces between steel jaws. Capacity 50-100 tons/hr.",
		inputItem = "chunk",
		outputItem = "coarse",
		duration = 60,             -- 1 game hour
		cost = 0,                  -- manual hammer alternative is free
		crushHits = 8,             -- manual alternative: 8 hammer hits
		outputSize = "10cm",
	},
	{
		id = "vibrating_screen",
		name = "Vibrating Screen",
		description = "Sorts crushed material by size. Oversize returns to crusher, undersize (<2cm) passes through.",
		inputItem = "coarse",
		outputItem = "screened",
		duration = 30,
		cost = 50,
		automatic = true,
	},
	{
		id = "cone_crusher",
		name = "Cone Crusher",
		description = "Secondary crushing: reduces 10cm pieces to ~2cm. Hydraulic pressure between mantle and concave.",
		inputItem = "screened",
		outputItem = "crushed",     -- maps to existing "crushed" size
		duration = 120,
		cost = 200,
		outputSize = "2cm",
	},
	{
		id = "ball_mill",
		name = "Ball Mill",
		description = "Grinding: rotating cylinder with steel balls grinds slag to <1mm powder. 2-4h per batch.",
		inputItem = "crushed",
		outputItem = "ground",      -- maps to existing "ground" size
		duration = 480,            -- half a game day
		cost = 500,
		outputSize = "1mm",
	},
	{
		id = "magnetic_separator",
		name = "HGMS Magnetic Separator",
		description = "High Gradient Magnetic Separation: removes iron particles (Fe3O4) from slag. Recovers metallic iron for recycling.",
		inputItem = "ground",
		outputItem = "deironized",
		duration = 60,
		cost = 100,
		byproduct = "Fe",          -- iron recovered as byproduct
		byproductAmount = 5,       -- atoms of Fe per batch
		automatic = true,
	},
	{
		id = "roasting_kiln",
		name = "Roasting Kiln (Optional)",
		description = "Oxidative roasting at 900°C for 2h. Converts V3+ to V5+ (vanadium pentoxide), improving leach extraction from 68% to 85%.",
		inputItem = "deironized",
		outputItem = "roasted",
		duration = 720,            -- half a game day
		cost = 300,
		optional = true,           -- skip for faster but less efficient leach
		boostFactor = 1.25,        -- 25% better V2O5 extraction
		temperature = 900,
	},
	{
		id = "leaching_tank",
		name = "Leaching Tank",
		description = "Acid or base solution dissolves target metals from slag. Duration depends on particle size, reagent type, and concentration.",
		inputItem = "roasted",      -- or "deironized" if roasting skipped
		outputItem = "leachate",
		duration = 1440,           -- variable, depends on reagent
		cost = 0,                  -- reagent cost is separate
	},
	{
		id = "filtration",
		name = "Filtration Press",
		description = "Separates dissolved metal solution (leachate) from solid residue. Residue can be used as construction aggregate.",
		inputItem = "leachate",
		outputItem = "solution",
		duration = 120,
		cost = 50,
		byproduct = "aggregate",   -- construction material
		automatic = true,
	},
	{
		id = "precipitation",
		name = "Precipitation Reactor",
		description = "pH adjustment causes selective precipitation of dissolved metals. V2O5 precipitates at pH 2-3, Fe at pH 4-5.",
		inputItem = "solution",
		outputItem = "precipitate",
		duration = 240,
		cost = 100,
	},
	{
		id = "drying",
		name = "Drying Oven",
		description = "Dries precipitated metal compounds at 110°C. Final product: V2O5 flakes (gold), Fe2O3 (red), TiO2 (white), etc.",
		inputItem = "precipitate",
		outputItem = "product",
		duration = 180,
		cost = 50,
		temperature = 110,
	},
}

-- Fast-track leaching option (H2SO4 + H2O2 system)
-- Based on: 30% H2SO4 at 50°C with H2O2 → 80.5% V extraction in 15 minutes
SteelSlag.FastLeach = {
	name = "H2SO4 + H2O2 Fast Leach",
	description = "Oxidative acid leach: 30% sulfuric acid + hydrogen peroxide at 50°C. Achieves 80% vanadium extraction in just 15 minutes!",
	reagents = {"H2SO4", "H2O2"},
	cost = 400,                   -- expensive reagent combo
	duration = 30,                -- 30 game minutes (represents ~15 real minutes)
	vExtractionRate = 0.80,       -- 80% of V2O5 dissolved
	temperature = 50,
	requirement = "powder",       -- only works with fine powder
}

-- Two-stage leaching (Ca removal first, then V recovery)
-- Based on: ammonium nitrate for Ca, then ammonium carbonate for V
SteelSlag.TwoStageLeach = {
	name = "Two-Stage Selective Leach",
	description = "Stage 1: NH4NO3 removes calcium. Stage 2: (NH4)2CO3 dissolves vanadium from V-rich residue. Higher V purity.",
	stage1 = {
		reagent = "NH4NO3",
		name = "Ammonium Nitrate",
		target = "CaO",
		duration = 720,           -- half day per stage
		cost = 80,                -- reduced from 150 (#59)
		extractionRate = 0.90,    -- 90% Ca removal
	},
	stage2 = {
		reagent = "(NH4)2CO3",
		name = "Ammonium Carbonate",
		target = "V2O5",
		duration = 720,
		cost = 120,               -- reduced from 250 (#59)
		extractionRate = 0.85,    -- 85% V recovery, up from 75% (#59)
	},
}

-- ═══════════════════════════════════════════════
-- REAGENTS (acids & bases for leaching)
-- Each reagent has different selectivity for metals
-- ═══════════════════════════════════════════════

SteelSlag.Reagents = {
	H2SO4 = {
		name = "Sulfuric Acid",
		formula = "H2SO4",
		type = "acid",
		pH = 1.0,
		color = Color3.fromRGB(255, 200, 0),
		cost = 100,               -- MolCoins per batch
		description = "Strong acid. Excellent for V, Fe, Mn extraction.",
		baseLeachTime = 1440,     -- minutes (1 game day = 1440 min)
		-- Extraction efficiency per oxide (% of that oxide dissolved)
		extraction = {
			CaO   = 0.85,
			FeO   = 0.90,
			MnO   = 0.88,
			V2O5  = 0.82,
			MgO   = 0.70,
			Al2O3 = 0.40,
			TiO2  = 0.25,
			P2O5  = 0.60,
			Cr2O3 = 0.30,
			SiO2  = 0.05,  -- silica barely dissolves in H2SO4
		},
		-- Which elements the player actually gets from dissolved oxides
		products = {"Fe", "V", "Mn", "Ca", "Mg", "P"},
	},
	HCl = {
		name = "Hydrochloric Acid",
		formula = "HCl",
		type = "acid",
		pH = 1.5,
		color = Color3.fromRGB(180, 255, 100),
		cost = 80,
		description = "Strong acid. Best for Ca and Fe dissolution.",
		baseLeachTime = 1200,
		extraction = {
			CaO   = 0.95,  -- HCl is excellent for dissolving lime
			FeO   = 0.85,
			MnO   = 0.75,
			V2O5  = 0.55,
			MgO   = 0.80,
			Al2O3 = 0.50,
			TiO2  = 0.15,
			P2O5  = 0.45,
			Cr2O3 = 0.20,
			SiO2  = 0.03,
		},
		products = {"Ca", "Fe", "Mn", "Mg", "Al"},
	},
	NaOH = {
		name = "Sodium Hydroxide (Lye)",
		formula = "NaOH",
		type = "base",
		pH = 13.0,
		color = Color3.fromRGB(200, 200, 255),
		cost = 120,
		description = "Strong base. Selective for Al and Si extraction.",
		baseLeachTime = 2880,     -- slower than acids
		extraction = {
			Al2O3 = 0.85,  -- NaOH dissolves alumina well
			SiO2  = 0.70,  -- dissolves silica at high pH
			V2O5  = 0.45,  -- some vanadium dissolves in alkaline
			CaO   = 0.10,
			FeO   = 0.05,  -- iron barely dissolves in base
			MnO   = 0.08,
			TiO2  = 0.10,
			P2O5  = 0.35,
			Cr2O3 = 0.60,  -- Cr dissolves in strong base (forms chromate)
			MgO   = 0.15,
		},
		products = {"Al", "Si", "Cr", "V"},
	},
	HNO3 = {
		name = "Nitric Acid",
		formula = "HNO3",
		type = "acid",
		pH = 0.5,
		color = Color3.fromRGB(255, 140, 60),
		cost = 200,
		description = "Powerful oxidizing acid. Dissolves almost everything.",
		baseLeachTime = 720,      -- fastest acid
		extraction = {
			CaO   = 0.90,
			FeO   = 0.95,
			MnO   = 0.92,
			V2O5  = 0.90,
			MgO   = 0.80,
			Al2O3 = 0.65,
			TiO2  = 0.45,
			P2O5  = 0.75,
			Cr2O3 = 0.55,
			SiO2  = 0.08,
		},
		products = {"Fe", "V", "Mn", "Ca", "Ti", "Cr", "Al", "P", "Mg"},
	},
	CitricAcid = {
		name = "Citric Acid",
		formula = "C6H8O7",
		type = "organic_acid",
		pH = 3.5,
		color = Color3.fromRGB(255, 255, 140),
		cost = 50,
		description = "Mild organic acid. Slow but cheap and selective for Ca.",
		baseLeachTime = 4320,     -- 3 game days base
		extraction = {
			CaO   = 0.70,
			MgO   = 0.40,
			FeO   = 0.25,
			MnO   = 0.30,
			V2O5  = 0.15,
			Al2O3 = 0.10,
			TiO2  = 0.05,
			P2O5  = 0.20,
			Cr2O3 = 0.05,
			SiO2  = 0.02,
		},
		products = {"Ca", "Mg", "Fe"},
	},
	H2O = {
		name = "Water",
		formula = "H2O",
		type = "solvent",
		pH = 7.0,
		color = Color3.fromRGB(100, 180, 255),
		cost = 0,
		description = "Free! Slow but perfect for learning. Dissolves free lime (CaO).",
		baseLeachTime = 720,      -- reduced from 2880 for tutorial viability (~12 min with crushed)
		extraction = {
			CaO   = 0.40,  -- free lime hydrates in water
			MgO   = 0.05,
			FeO   = 0.01,
			MnO   = 0.02,
			V2O5  = 0.01,
			Al2O3 = 0.01,
			TiO2  = 0.00,
			P2O5  = 0.05,
			Cr2O3 = 0.00,
			SiO2  = 0.00,
		},
		products = {"Ca"},
	},
}

-- ═══════════════════════════════════════════════
-- RAW SLAG BATCHES
-- Player buys/finds slag in batches of 1kg
-- ═══════════════════════════════════════════════

SteelSlag.BATCH_WEIGHT_KG = 1.0
SteelSlag.RAW_SLAG_COST = 50         -- MolCoins per 1kg chunk
SteelSlag.MAX_ACTIVE_LEACHES = 3     -- max concurrent leaching processes
SteelSlag.MAX_SLAG_INVENTORY = 20    -- max kg in storage
SteelSlag.CRUSHING_DUST_FRACTION = 0.01
SteelSlag.MAGNETIC_IRON_RECOVERY_KG = 0.12

-- Return the oxide masses that actually reach the leach tank after the
-- physical pre-treatment steps. Keeping this shared prevents the product
-- yield calculator from creating Fe atoms that magnetic separation already
-- recovered from the feed.
function SteelSlag.GetPostMagneticSeparationMasses(batchWeightKg)
	local batchWeight = tonumber(batchWeightKg) or SteelSlag.BATCH_WEIGHT_KG
	batchWeight = math.max(0, batchWeight)
	local afterCrushing = batchWeight * (1 - SteelSlag.CRUSHING_DUST_FRACTION)
	local oxideMasses = {}
	local representedMass = 0
	for oxide, data in pairs(SteelSlag.Composition) do
		local mass = afterCrushing * ((tonumber(data.pct) or 0) / 100)
		oxideMasses[oxide] = mass
		representedMass = representedMass + mass
	end

	local referenceBatch = math.max(SteelSlag.BATCH_WEIGHT_KG, 0.000001)
	local requestedMagneticRecovery = SteelSlag.MAGNETIC_IRON_RECOVERY_KG
		* (batchWeight / referenceBatch)
	local magneticRecovery = math.min(
		math.max(0, oxideMasses.FeO or 0),
		requestedMagneticRecovery
	)
	oxideMasses.FeO = math.max(0, (oxideMasses.FeO or 0) - magneticRecovery)
	return oxideMasses, afterCrushing - magneticRecovery, magneticRecovery,
		math.max(0, afterCrushing - representedMass)
end

-- ═══════════════════════════════════════════════
-- CALCULATION FUNCTIONS
-- ═══════════════════════════════════════════════

-- Calculate leaching time in game minutes for a given size + reagent
function SteelSlag.CalculateLeachTime(particleSize, reagentId)
	local size = SteelSlag.ParticleSizes[particleSize]
	local reagent = SteelSlag.Reagents[reagentId]
	if not size or not reagent then return 99999 end

	return math.floor(reagent.baseLeachTime * size.leachMultiplier)
end

-- Calculate leaching time as a human-readable string
function SteelSlag.FormatLeachTime(minutes)
	if minutes >= 1440 then
		local days = minutes / 1440
		if days == math.floor(days) then
			return string.format("%d day%s", days, days == 1 and "" or "s")
		else
			return string.format("%.1f days", days)
		end
	elseif minutes >= 60 then
		local hours = minutes / 60
		return string.format("%.1f hours", hours)
	else
		return string.format("%d min", minutes)
	end
end

-- Calculate what products a leaching process yields. Temperature is optional
-- for UI previews and defaults to 25°C; the server passes its live process
-- temperature so production matches the engineering mass-balance model.
-- Returns: { {element = "Fe", amount = N}, {element = "V", amount = N}, ... }
function SteelSlag.CalculateYield(particleSize, reagentId, batchWeightKg, temperature)
	local size = SteelSlag.ParticleSizes[particleSize]
	local reagent = SteelSlag.Reagents[reagentId]
	if not size or not reagent then return {} end

	local yield = {}
	local batchWeight = batchWeightKg or SteelSlag.BATCH_WEIGHT_KG
	temperature = temperature or 25
	local contactFactor = math.clamp(1 / math.max(size.leachMultiplier, 0.05), 0.05, 4)
	local oxideMasses = SteelSlag.GetPostMagneticSeparationMasses(batchWeight)
	local targetProducts = {}
	for _, element in ipairs(reagent.products or {}) do
		targetProducts[element] = true
	end

	for oxide, data in pairs(SteelSlag.Composition) do
		local extraction = reagent.extraction[oxide] or 0
		local elements = SteelSlag.OxideToElements[oxide]
		local isTargetProduct = next(targetProducts) == nil
		if elements and next(targetProducts) ~= nil then
			isTargetProduct = false
			for element in pairs(elements) do
				if targetProducts[element] then
					isTargetProduct = true
					break
				end
			end
		end
		if extraction > 0 and isTargetProduct then
			local temperatureExtraction = math.clamp(
				extraction * arrheniusMultiplier(temperature, ACTIVATION_ENERGIES[oxide] or 50),
				0, 0.99
			)
			extraction = math.clamp(1 - ((1 - temperatureExtraction) ^ contactFactor), 0, 0.99)
			-- Weight of this oxide in the batch (grams)
			local oxideWeight = (oxideMasses[oxide] or 0) * 1000
			-- Amount extracted (grams)
			local extracted = oxideWeight * extraction
			-- Convert to game "atoms" (1 atom per 10g extracted, minimum 1 if any)
			local atomCount = math.floor(extracted / 10)
			if atomCount > 0 then
				table.insert(yield, {
					oxide = oxide,
					oxideName = data.name,
					gramsExtracted = math.floor(extracted * 10) / 10,
					atomCount = atomCount,
					color = data.color,
				})
			end
		end
	end

	-- Sort by amount descending
	table.sort(yield, function(a, b) return a.gramsExtracted > b.gramsExtracted end)
	return yield
end

-- Map oxide names to element symbols for inventory
SteelSlag.OxideToElements = {
	CaO   = {Ca = 1},
	SiO2  = {Si = 1},
	FeO   = {Fe = 1},
	MgO   = {Mg = 1},
	Al2O3 = {Al = 2},
	MnO   = {Mn = 1},
	P2O5  = {P = 2},
	V2O5  = {V = 2},
	TiO2  = {Ti = 1},
	Cr2O3 = {Cr = 2},
}

-- Convert yield list to element atoms for player inventory
function SteelSlag.YieldToAtoms(yield)
	local atoms = {}
	for _, entry in ipairs(yield) do
		local elements = SteelSlag.OxideToElements[entry.oxide]
		if elements then
			for elem, multiplier in pairs(elements) do
				atoms[elem] = (atoms[elem] or 0) + entry.atomCount * multiplier
			end
		end
	end
	return atoms
end

-- Get info about a reagent for UI display
function SteelSlag.GetReagentInfo(reagentId)
	local r = SteelSlag.Reagents[reagentId]
	if not r then return nil end

	-- Find best-extracted oxides
	local bestExtractions = {}
	for oxide, efficiency in pairs(r.extraction) do
		if efficiency >= 0.50 then
			local comp = SteelSlag.Composition[oxide]
			table.insert(bestExtractions, {
				oxide = oxide,
				name = comp and comp.name or oxide,
				efficiency = efficiency,
			})
		end
	end
	table.sort(bestExtractions, function(a, b) return a.efficiency > b.efficiency end)

	return {
		name = r.name,
		formula = r.formula,
		type = r.type,
		pH = r.pH,
		color = r.color,
		cost = r.cost,
		description = r.description,
		bestFor = bestExtractions,
	}
end

return SteelSlag
