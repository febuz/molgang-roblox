--[[
	MiningSystem.lua
	MOLGANG — Vanadium Mining Ground System

	Mining plots on the outskirts of the game world:
	- Each plot has a unique mineral composition (V, Cr, Ti, Fe, Mn, etc.)
	- Vanadium content varies 0.5-3% (much harder to extract than from slag)
	- Players buy mining rights with MolCoins
	- Mining plots are TRADABLE between players
	- Requires mining equipment: drill rig, excavator, haul truck
	- Automated equipment slowly increases mineral balance over time
	- Ore must still be processed through the slag processing pipeline

	Real geology basis:
	- Vanadium occurs in magnetite (Fe3O4) deposits, titanomagnetite
	- Associated minerals: Cr, Ti, Fe, Mn, Al, Si (transition metals)
	- Typical vanadiferous magnetite: 0.3-2.5% V2O5
	- South Africa (Bushveld), Russia (Kachkanar), China (Panzhihua)
]]

local MiningSystem = {}

-- ═══════════════════════════════════════════════
-- MINING PLOT TYPES (different geological formations)
-- ═══════════════════════════════════════════════

MiningSystem.PlotTypes = {
	{
		id = "magnetite_low",
		name = "Practice Outcrop",
		description = "Surface-level practice deposit. Hand-collect samples for free. Perfect for learning mining basics.",
		geology = "Weathered outcrop with exposed magnetite veins",
		composition = {
			V2O5 = 0.2,
			Fe3O4 = 30.0,
			TiO2 = 1.0,
			Cr2O3 = 0.1,
			MnO = 0.3,
			SiO2 = 25.0,
			Al2O3 = 10.0,
		},
		hardness = 3.0,
		depth = 0,         -- surface level, no drilling needed
		cost = 200,        -- affordable for new players (from simulation finding)
		monthlyTax = 0,    -- free maintenance for practice
		color = Color3.fromRGB(80, 70, 55),
		rarity = "common",
	},
	{
		id = "magnetite_low",
		name = "Low-Grade Magnetite",
		description = "Basic magnetite deposit. Low vanadium but easy to mine. Good for beginners.",
		geology = "Layered mafic intrusion, disseminated magnetite",
		composition = {
			V2O5 = 0.5,
			Fe3O4 = 45.0,
			TiO2 = 2.0,
			Cr2O3 = 0.3,
			MnO = 0.5,
			SiO2 = 20.0,
			Al2O3 = 8.0,
		},
		hardness = 5.5,
		depth = 5,
		cost = 5000,
		monthlyTax = 200,
		color = Color3.fromRGB(60, 50, 45),
		rarity = "common",
	},
	{
		id = "magnetite_medium",
		name = "Medium-Grade Titanomagnetite",
		description = "Titanomagnetite deposit with moderate vanadium. Standard mining operation.",
		geology = "Massive magnetite lens in norite, Bushveld-type",
		composition = {
			V2O5 = 1.5,
			Fe3O4 = 55.0,
			TiO2 = 8.0,
			Cr2O3 = 0.8,
			MnO = 0.3,
			SiO2 = 12.0,
			Al2O3 = 5.0,
		},
		hardness = 6.0,
		depth = 15,
		cost = 15000,
		monthlyTax = 500,
		color = Color3.fromRGB(40, 35, 35),
		rarity = "uncommon",
	},
	{
		id = "magnetite_high",
		name = "High-Grade Vanadiferous Magnetite",
		description = "Rich vanadium deposit! Panzhihua-type titanomagnetite. Premium mining rights.",
		geology = "Massive titanomagnetite band in layered intrusion",
		composition = {
			V2O5 = 2.5,
			Fe3O4 = 60.0,
			TiO2 = 12.0,
			Cr2O3 = 1.5,
			MnO = 0.2,
			SiO2 = 8.0,
			Al2O3 = 3.0,
		},
		hardness = 6.5,
		depth = 30,
		cost = 50000,
		monthlyTax = 1500,
		color = Color3.fromRGB(25, 25, 30),
		rarity = "rare",
	},
	{
		id = "chromite_vanadiun",
		name = "Chromite-Vanadium Deposit",
		description = "Rare chromite seam with exceptional vanadium. High chromium content — handle with care (Cr VI risk)!",
		geology = "Chromitite seam in UG2 reef, Bushveld Complex analog",
		composition = {
			V2O5 = 3.0,
			Fe3O4 = 30.0,
			TiO2 = 3.0,
			Cr2O3 = 25.0,   -- very high chromium!
			MnO = 0.1,
			SiO2 = 5.0,
			Al2O3 = 15.0,
			PGM = 0.001,    -- trace platinum group metals
		},
		hardness = 7.0,
		depth = 50,
		cost = 100000,
		monthlyTax = 3000,
		color = Color3.fromRGB(20, 30, 20),
		rarity = "legendary",
		hazard = "Cr(VI)",  -- chromium VI carcinogen risk
	},
}

-- ═══════════════════════════════════════════════
-- MINING EQUIPMENT
-- ═══════════════════════════════════════════════

MiningSystem.Equipment = {
	{
		id = "hand_pick",
		name = "Hand Pick & Shovel",
		category = "Manual",
		cost = 0,
		miningRate = 0.5,       -- kg ore per game minute
		fuelCost = 0,
		maintenance = 0,
		description = "Free but extremely slow. Manual labor at its finest.",
		tier = 1,
	},
	{
		id = "pneumatic_drill",
		name = "Pneumatic Rock Drill",
		category = "Semi-Auto",
		cost = 3000,
		miningRate = 5,
		fuelCost = 10,          -- MC per game hour
		maintenance = 50,       -- MC per game month
		description = "Compressed air drill. 10× faster than hand mining.",
		tier = 2,
	},
	{
		id = "excavator",
		name = "Hydraulic Excavator",
		category = "Automated",
		cost = 20000,
		miningRate = 50,
		fuelCost = 60,            -- reduced from 100 (#61)
		maintenance = 300,        -- reduced from 500 (#61)
		description = "Full-size excavator. Heavy ore extraction at industrial scale.",
		tier = 3,
	},
	{
		id = "haul_truck",
		name = "Mine Haul Truck (30t)",
		category = "Transport",
		cost = 15000,
		transportRate = 30000,  -- kg per trip
		fuelCost = 45,            -- reduced from 80 (#61)
		maintenance = 250,        -- reduced from 400 (#61)
		description = "Transports ore from mine to processing plant. 30 tons per load.",
		tier = 3,
	},
	{
		id = "drill_rig",
		name = "Diamond Core Drill Rig",
		category = "Exploration",
		cost = 8000,
		explorationRate = 2,    -- plots explored per game day
		fuelCost = 50,
		maintenance = 200,
		description = "Explores new mining plots. Reveals mineral composition before buying.",
		tier = 2,
	},
	{
		id = "automated_miner",
		name = "Autonomous Mining Unit",
		category = "Full Auto",
		cost = 75000,
		miningRate = 200,       -- kg per game minute!
		fuelCost = 180,           -- reduced from 300 (#61)
		maintenance = 1200,       -- reduced from 2000 (#61)
		description = "AI-controlled mining robot. Runs 24/7 without operator. The ultimate upgrade.",
		tier = 4,
		automationLevel = 1.0,  -- fully automated
	},
}

-- ═══════════════════════════════════════════════
-- MINING PLOT GENERATION
-- Plots are placed on world outskirts (beyond main zones)
-- ═══════════════════════════════════════════════

MiningSystem.PlotLocations = {
	-- North outskirts (beyond Periodic Table Biome)
	{region = "North Ridge", center = Vector3.new(0, 5, 3500), radius = 800},
	-- East outskirts (beyond Quantum Lab)
	{region = "East Plateau", center = Vector3.new(3500, 5, 0), radius = 600},
	-- South outskirts
	{region = "South Basin", center = Vector3.new(0, 5, -3500), radius = 700},
	-- Far west (deep mining)
	{region = "Deep West Mines", center = Vector3.new(-3500, -10, 0), radius = 500},
}

-- ═══════════════════════════════════════════════
-- SPECIAL PLOT: VELZEN (Tata Steel IJmuiden factory)
-- This is the steel factory that PRODUCES the slag.
-- Not a mining plot — this is where BOF steel production happens.
-- The slag from this factory is what players process in Slakkenspoor.
-- ═══════════════════════════════════════════════

MiningSystem.VelzenFactory = {
	id = "velzen",
	name = "Velzen — Tata Steel IJmuiden (Miniature)",
	description = "Miniature Basic Oxygen Furnace (BOF) steel factory. Produces vanadium-rich steel slag as byproduct of steelmaking. Based on the real Tata Steel plant in IJmuiden, Netherlands.",
	position = Vector3.new(-2200, 5, -200),
	size = Vector3.new(400, 60, 300),

	-- BOF slag composition from Tata Steel IJmuiden
	slagComposition = {
		CaO   = 42.0,   -- Calcium oxide (lime)
		SiO2  = 13.5,   -- Silica
		FeO   = 18.0,   -- Iron oxide (wüstite)
		MgO   = 8.0,    -- Magnesia
		Al2O3 = 2.0,    -- Alumina
		MnO   = 4.5,    -- Manganese oxide
		P2O5  = 2.0,    -- Phosphorus pentoxide
		V2O5  = 0.85,   -- VANADIUM! (the gold in the slag)
		TiO2  = 0.6,    -- Titanium dioxide
		Cr2O3 = 0.4,    -- Chromium oxide
		-- Trace: Zn, Cu, Ni, Co
	},

	-- Factory production stats
	steelProductionTonsPerDay = 50,  -- miniature scale
	slagRatio = 0.12,               -- 12% of steel weight becomes slag
	slagPerDay = 6.0,               -- tons of slag produced per day
	slagCostPerTon = 10,            -- cheaper than mining (it's a byproduct!)

	-- Player interaction
	slagPurchaseCostPerKg = 50,     -- MolCoins per kg (same as current)
	autoDeliverToSlakkenspoor = true,

	-- Visual
	color = Color3.fromRGB(80, 70, 65),
	buildingColor = Color3.fromRGB(50, 50, 55),
	smokeStackColor = Color3.fromRGB(40, 40, 45),
}

MiningSystem.PLOTS_PER_REGION = 6
MiningSystem.TOTAL_PLOTS = #MiningSystem.PlotLocations * MiningSystem.PLOTS_PER_REGION
MiningSystem.PLOT_SIZE_STUDS = 100  -- each plot is 100×100 studs

-- Generate all mining plots with randomized compositions
function MiningSystem.GeneratePlots()
	local plots = {}
	local plotId = 0

	math.randomseed(42)  -- consistent generation

	for _, region in ipairs(MiningSystem.PlotLocations) do
		for i = 1, MiningSystem.PLOTS_PER_REGION do
			plotId = plotId + 1

			-- Random position within region
			local angle = (i / MiningSystem.PLOTS_PER_REGION) * math.pi * 2
			local dist = region.radius * (0.4 + math.random() * 0.6)
			local pos = region.center + Vector3.new(
				math.cos(angle) * dist,
				0,
				math.sin(angle) * dist
			)

			-- Select plot type (weighted by rarity)
			local roll = math.random()
			local plotType
			if roll < 0.40 then
				plotType = MiningSystem.PlotTypes[1]  -- 40% low grade
			elseif roll < 0.70 then
				plotType = MiningSystem.PlotTypes[2]  -- 30% medium
			elseif roll < 0.90 then
				plotType = MiningSystem.PlotTypes[3]  -- 20% high grade
			else
				plotType = MiningSystem.PlotTypes[4]  -- 10% legendary
			end

			-- Randomize composition slightly (±20%)
			local comp = {}
			for mineral, pct in pairs(plotType.composition) do
				comp[mineral] = pct * (0.8 + math.random() * 0.4)
			end

			table.insert(plots, {
				id = plotId,
				region = region.region,
				position = pos,
				plotType = plotType.id,
				name = plotType.name .. " #" .. plotId,
				composition = comp,
				vanadiumPct = comp.V2O5 or 0,
				cost = plotType.cost,
				monthlyTax = plotType.monthlyTax,
				hardness = plotType.hardness,
				depth = plotType.depth,
				color = plotType.color,
				rarity = plotType.rarity,
				owner = nil,           -- nil = unclaimed
				mineEquipment = {},    -- equipment placed on this plot
				totalMined = 0,        -- kg ore mined total
				oreStockpile = 0,      -- kg ore waiting for transport
				explored = false,      -- true after drill rig surveys
				forSale = false,       -- listed on market
				askPrice = 0,          -- selling price if listed
			})
		end
	end

	return plots
end

-- ═══════════════════════════════════════════════
-- MINING CALCULATIONS
-- ═══════════════════════════════════════════════

-- Calculate mining output for a plot per game minute
function MiningSystem.CalculateMiningRate(plot, equipment)
	local totalRate = 0
	for _, equip in ipairs(equipment) do
		local equipData = nil
		for _, e in ipairs(MiningSystem.Equipment) do
			if e.id == equip then equipData = e break end
		end
		if equipData and equipData.miningRate then
			totalRate = totalRate + equipData.miningRate
		end
	end

	-- Hardness penalty (harder rock = slower mining)
	local hardnessFactor = 6.0 / (plot.hardness or 6.0)

	-- Depth penalty (deeper = slower access)
	local depthFactor = 10.0 / (plot.depth or 10.0)

	return totalRate * hardnessFactor * depthFactor
end

-- Calculate ore value based on mineral composition
function MiningSystem.CalculateOreValue(composition, kgOre)
	local value = 0
	-- Vanadium is most valuable
	value = value + (composition.V2O5 or 0) * kgOre * 2.0    -- €2/kg·%V2O5
	value = value + (composition.TiO2 or 0) * kgOre * 0.5
	value = value + (composition.Cr2O3 or 0) * kgOre * 1.0
	value = value + (composition.Fe3O4 or 0) * kgOre * 0.1
	return math.floor(value)
end

-- Get equipment info
function MiningSystem.GetEquipment(equipId)
	for _, e in ipairs(MiningSystem.Equipment) do
		if e.id == equipId then return e end
	end
	return nil
end

return MiningSystem
