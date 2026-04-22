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
		description = "Free but very slow. Only dissolves free lime (CaO).",
		baseLeachTime = 7200,     -- 5 game days base
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

-- Calculate what products a leaching process yields
-- Returns: { {element = "Fe", amount = N}, {element = "V", amount = N}, ... }
function SteelSlag.CalculateYield(particleSize, reagentId, batchWeightKg)
	local size = SteelSlag.ParticleSizes[particleSize]
	local reagent = SteelSlag.Reagents[reagentId]
	if not size or not reagent then return {} end

	local yield = {}
	local batchWeight = batchWeightKg or SteelSlag.BATCH_WEIGHT_KG

	for oxide, data in pairs(SteelSlag.Composition) do
		local extraction = reagent.extraction[oxide] or 0
		if extraction > 0 then
			-- Weight of this oxide in the batch (grams)
			local oxideWeight = batchWeight * 1000 * (data.pct / 100)
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
