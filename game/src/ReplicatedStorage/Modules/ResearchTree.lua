--[[
	ResearchTree.lua
	MOLGANG — Chemical Engineering Research & Technology Tree

	Unlock new equipment, reagents, processes, and techniques.
	Research costs MolCoins + time. Higher tiers require prerequisites.

	5 branches:
	1. Crushing & Size Reduction (unlock better crushers)
	2. Hydrometallurgy (unlock reagents, leaching methods)
	3. Process Optimization (improve yields, reduce waste)
	4. Environmental & Safety (unlock compliance tools)
	5. Automation & Scale (unlock larger equipment, conveyors)
]]

local ResearchTree = {}

-- ═══════════════════════════════════════════════
-- RESEARCH NODES
-- ═══════════════════════════════════════════════

ResearchTree.Nodes = {
	-- ════════════════════════════════════════
	-- BRANCH 1: CRUSHING & SIZE REDUCTION
	-- ════════════════════════════════════════
	{
		id = "manual_crushing",
		name = "Manual Crushing",
		branch = "Crushing",
		tier = 1,
		cost = 0,          -- free starting tech
		researchTime = 0,  -- instant
		unlocked = true,   -- available from start
		requires = {},
		unlocks = {"hammer_station"},
		description = "Basic hammer and anvil technique. Crush 5cm+ chunks to ~1cm by hand.",
		effect = "Unlocks: Hammer Station",
	},
	{
		id = "jaw_crusher_tech",
		name = "Jaw Crusher Technology",
		branch = "Crushing",
		tier = 2,
		cost = 2000,
		researchTime = 300,  -- 5 game minutes
		requires = {"manual_crushing"},
		unlocks = {"jaw_crusher", "vibrating_screen"},
		description = "Mechanized primary crushing. Steel jaws reduce slag to ~10cm at 50 tons/hr.",
		effect = "Unlocks: Jaw Crusher, Vibrating Screen",
	},
	{
		id = "cone_crusher_tech",
		name = "Cone Crusher Technology",
		branch = "Crushing",
		tier = 3,
		cost = 5000,
		researchTime = 600,
		requires = {"jaw_crusher_tech"},
		unlocks = {"cone_crusher"},
		description = "Hydraulic secondary crushing. Reduces 10cm to ~2cm via gyrating mantle.",
		effect = "Unlocks: Cone Crusher",
	},
	{
		id = "ball_milling",
		name = "Ball Mill Grinding",
		branch = "Crushing",
		tier = 4,
		cost = 10000,
		researchTime = 1200,
		requires = {"cone_crusher_tech"},
		unlocks = {"ball_mill"},
		description = "Fine grinding to <1mm powder using steel balls. Energy intensive but essential for fast leaching.",
		effect = "Unlocks: Ball Mill. Enables powder-grade leaching (0.3× time).",
	},

	-- ════════════════════════════════════════
	-- BRANCH 2: HYDROMETALLURGY
	-- ════════════════════════════════════════
	{
		id = "water_leaching",
		name = "Water Leaching",
		branch = "Hydrometallurgy",
		tier = 1,
		cost = 0,
		researchTime = 0,
		unlocked = true,
		requires = {},
		unlocks = {"H2O"},
		description = "Simple water dissolution of free lime (CaO). Very slow, free.",
		effect = "Unlocks: Water as leaching agent",
	},
	{
		id = "acid_leaching",
		name = "Acid Leaching Basics",
		branch = "Hydrometallurgy",
		tier = 2,
		cost = 3000,
		researchTime = 480,
		requires = {"water_leaching"},
		unlocks = {"HCl", "CitricAcid", "leaching_tank"},
		description = "Use acids to dissolve metal oxides from slag. HCl for Ca/Fe, citric acid for mild extraction.",
		effect = "Unlocks: HCl, Citric Acid, Leaching Tank (500L)",
	},
	{
		id = "strong_acid_leaching",
		name = "Strong Acid Systems",
		branch = "Hydrometallurgy",
		tier = 3,
		cost = 8000,
		researchTime = 900,
		requires = {"acid_leaching"},
		unlocks = {"H2SO4", "HNO3"},
		description = "Sulfuric acid for V/Fe/Mn. Nitric acid dissolves almost everything. Requires fume extraction!",
		effect = "Unlocks: H2SO4, HNO3. WARNING: Requires Fume Hood.",
	},
	{
		id = "alkaline_leaching",
		name = "Alkaline Leaching",
		branch = "Hydrometallurgy",
		tier = 3,
		cost = 6000,
		researchTime = 720,
		requires = {"acid_leaching"},
		unlocks = {"NaOH"},
		description = "Sodium hydroxide dissolves Al, Si, Cr. Selective for alumina and silica recovery.",
		effect = "Unlocks: NaOH. Enables Al/Si/Cr selective extraction.",
	},
	{
		id = "fast_leach",
		name = "Oxidative Fast Leach",
		branch = "Hydrometallurgy",
		tier = 4,
		cost = 15000,
		researchTime = 1800,
		requires = {"strong_acid_leaching", "ball_milling"},
		unlocks = {"fast_leach_process"},
		description = "H2SO4 + H2O2 at 50°C. Achieves 80% vanadium extraction in just 15 minutes!",
		effect = "Unlocks: Fast Leach process (H2SO4+H2O2). Requires powder-grade slag.",
	},
	{
		id = "two_stage_leach",
		name = "Two-Stage Selective Leaching",
		branch = "Hydrometallurgy",
		tier = 5,
		cost = 25000,
		researchTime = 3600,
		requires = {"fast_leach", "alkaline_leaching"},
		unlocks = {"two_stage_process"},
		description = "Stage 1: NH4NO3 removes Ca. Stage 2: (NH4)2CO3 recovers V at high purity. Publication-grade!",
		effect = "Unlocks: Two-Stage Selective Leach. Highest V2O5 purity.",
	},

	-- ════════════════════════════════════════
	-- BRANCH 3: PROCESS OPTIMIZATION
	-- ════════════════════════════════════════
	{
		id = "magnetic_sep",
		name = "Magnetic Separation (HGMS)",
		branch = "Optimization",
		tier = 2,
		cost = 4000,
		researchTime = 600,
		requires = {"jaw_crusher_tech"},
		unlocks = {"magnetic_separator"},
		description = "High Gradient Magnetic Separation removes iron from slag. Recovers Fe3O4 as byproduct.",
		effect = "Unlocks: HGMS Separator. +5 Fe atoms per batch as byproduct.",
	},
	{
		id = "roasting",
		name = "Oxidative Roasting",
		branch = "Optimization",
		tier = 3,
		cost = 12000,
		researchTime = 1200,
		requires = {"magnetic_sep", "acid_leaching"},
		unlocks = {"roasting_kiln"},
		description = "900°C for 2 hours. Converts V3+ to V5+ (vanadium pentoxide). +25% V extraction.",
		effect = "Unlocks: Roasting Kiln. +25% V2O5 yield from leaching.",
	},
	{
		id = "precipitation_control",
		name = "pH-Controlled Precipitation",
		branch = "Optimization",
		tier = 3,
		cost = 6000,
		researchTime = 600,
		requires = {"acid_leaching"},
		unlocks = {"precipitation_tank", "ph_meter_station"},
		description = "Selective precipitation by pH adjustment. V2O5 at pH 2-3, Fe at pH 4-5, Al at pH 5-6.",
		effect = "Unlocks: Precipitation Reactor, pH Meter.",
	},
	{
		id = "filtration_tech",
		name = "Pressure Filtration",
		branch = "Optimization",
		tier = 2,
		cost = 3000,
		researchTime = 300,
		requires = {"acid_leaching"},
		unlocks = {"filtration_press"},
		description = "Separate dissolved metals from solid residue using hydraulic filter press.",
		effect = "Unlocks: Filtration Press.",
	},

	-- ════════════════════════════════════════
	-- BRANCH 4: ENVIRONMENTAL & SAFETY
	-- ════════════════════════════════════════
	{
		id = "fume_extraction",
		name = "Fume Extraction",
		branch = "Environmental",
		tier = 2,
		cost = 1500,
		researchTime = 180,
		requires = {"acid_leaching"},
		unlocks = {"fume_hood"},
		description = "Extract toxic acid fumes. Required for strong acid leaching operations. Safety first!",
		effect = "Unlocks: Fume Hood. Required for H2SO4/HNO3.",
	},
	{
		id = "water_treatment_tech",
		name = "Process Water Treatment",
		branch = "Environmental",
		tier = 3,
		cost = 5000,
		researchTime = 600,
		requires = {"fume_extraction"},
		unlocks = {"water_treatment"},
		description = "Treat and recycle process water. Reduces water costs 50%. Zero liquid discharge goal.",
		effect = "Unlocks: Water Treatment Unit. -50% water costs.",
	},
	{
		id = "trace_analysis",
		name = "Trace Metal Analysis (ICP-OES)",
		branch = "Environmental",
		tier = 4,
		cost = 30000,
		researchTime = 2400,
		requires = {"water_treatment_tech", "precipitation_control"},
		unlocks = {"icp_oes"},
		description = "ICP-OES spectrometer detects Pb, Cd, As, Cr at ppm levels. Required for EU 2019/1009 compliance.",
		effect = "Unlocks: ICP-OES. Enables EU fertilizer certification.",
	},
	{
		id = "slag_biostimulant",
		name = "Slag Bio-Enhancer Certification",
		branch = "Environmental",
		tier = 5,
		cost = 40000,
		researchTime = 3600,
		requires = {"trace_analysis"},
		unlocks = {"slag_fertilizer"},
		description = "Certify processed slag as EU-compliant biostimulant fertilizer. The ultimate goal!",
		effect = "Unlocks: Slag Bio-Enhancer production. Sells for premium prices.",
	},

	-- ════════════════════════════════════════
	-- BRANCH 5: AUTOMATION & SCALE
	-- ════════════════════════════════════════
	{
		id = "conveyor_tech",
		name = "Conveyor Systems",
		branch = "Automation",
		tier = 1,
		cost = 1000,
		researchTime = 120,
		unlocked = true,
		requires = {},
		unlocks = {"conveyor_belt"},
		description = "Flat belt conveyors connect equipment. Reduces manual handling by 10%.",
		effect = "Unlocks: Conveyor Belt. +10% efficiency for connected items.",
	},
	{
		id = "power_gen",
		name = "On-Site Power Generation",
		branch = "Automation",
		tier = 2,
		cost = 4000,
		researchTime = 300,
		requires = {"conveyor_tech"},
		unlocks = {"power_generator"},
		description = "Diesel generator provides 200kW independent power. Essential for large factories.",
		effect = "Unlocks: 200kW Generator.",
	},
	{
		id = "xrf_tech",
		name = "XRF Composition Analysis",
		branch = "Automation",
		tier = 3,
		cost = 15000,
		researchTime = 1200,
		requires = {"power_gen", "magnetic_sep"},
		unlocks = {"xrf_analyzer"},
		description = "X-Ray Fluorescence analyzer. Instantly shows slag composition. +20% extraction optimization.",
		effect = "Unlocks: XRF Analyzer. +20% yield from better process control.",
	},
	{
		id = "large_reactor",
		name = "Industrial Scale Reactors",
		branch = "Automation",
		tier = 4,
		cost = 20000,
		researchTime = 1800,
		requires = {"xrf_tech", "strong_acid_leaching"},
		unlocks = {"leaching_tank_large"},
		description = "2000L reactor. 4× capacity of standard tank. True industrial-scale production.",
		effect = "Unlocks: Large Leaching Reactor (2000L).",
	},

	-- ════════════════════════════════════════
	-- BRANCH 6: ADVANCED SEPARATION & PURIFICATION
	-- ════════════════════════════════════════
	{
		id = "cyclone_tech",
		name = "Cyclone Classification",
		branch = "Optimization",
		tier = 2,
		cost = 3000,
		researchTime = 300,
		requires = {"jaw_crusher_tech"},
		unlocks = {"cyclone_separator"},
		description = "Centrifugal particle classification. High throughput, low energy pre-sorting before grinding.",
		effect = "Unlocks: Cyclone Separator. 40 t/hr classification.",
	},
	{
		id = "centrifuge_tech",
		name = "Centrifugal Separation",
		branch = "Optimization",
		tier = 3,
		cost = 10000,
		researchTime = 900,
		requires = {"filtration_tech", "precipitation_control"},
		unlocks = {"centrifuge"},
		description = "High-speed centrifuge for fine precipitate recovery. Faster than filter press for slurries.",
		effect = "Unlocks: Basket Centrifuge. Better for fine V2O5 precipitate.",
	},
	{
		id = "distillation_tech",
		name = "Solvent Distillation",
		branch = "Hydrometallurgy",
		tier = 4,
		cost = 20000,
		researchTime = 1500,
		requires = {"strong_acid_leaching", "precipitation_control"},
		unlocks = {"distillation_column"},
		description = "Separate dissolved metals by boiling point. Essential for high-purity V2O5 (>99%).",
		effect = "Unlocks: Distillation Column. Enables premium-grade products.",
	},
	{
		id = "pressure_leaching",
		name = "Pressure Leaching (10 bar)",
		branch = "Hydrometallurgy",
		tier = 5,
		cost = 30000,
		researchTime = 2400,
		requires = {"fast_leach", "large_reactor"},
		unlocks = {"pressure_vessel"},
		description = "Autoclave leaching at 10 bar pressure. Dissolves refractory TiO2 that resists normal acid.",
		effect = "Unlocks: Pressure Reactor. +30% extraction of resistant oxides.",
	},
	{
		id = "heat_recovery",
		name = "Process Heat Recovery",
		branch = "Environmental",
		tier = 3,
		cost = 8000,
		researchTime = 600,
		requires = {"fume_extraction"},
		unlocks = {"heat_exchanger"},
		description = "Shell-and-tube heat exchanger recovers heat from hot leachate. 30% energy savings.",
		effect = "Unlocks: Heat Exchanger. -30% energy cost for heated processes.",
	},
}

-- ═══════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════

function ResearchTree.GetNode(nodeId)
	for _, node in ipairs(ResearchTree.Nodes) do
		if node.id == nodeId then return node end
	end
	return nil
end

function ResearchTree.GetBranch(branchName)
	local nodes = {}
	for _, node in ipairs(ResearchTree.Nodes) do
		if node.branch == branchName then
			table.insert(nodes, node)
		end
	end
	table.sort(nodes, function(a, b) return a.tier < b.tier end)
	return nodes
end

function ResearchTree.GetBranches()
	return {"Crushing", "Hydrometallurgy", "Optimization", "Environmental", "Automation"}
end

-- Check if a node can be researched
function ResearchTree.CanResearch(nodeId, unlockedNodes)
	local node = ResearchTree.GetNode(nodeId)
	if not node then return false, "Unknown research" end
	if unlockedNodes[nodeId] then return false, "Already researched" end

	-- Check prerequisites
	for _, reqId in ipairs(node.requires) do
		if not unlockedNodes[reqId] then
			local reqNode = ResearchTree.GetNode(reqId)
			return false, "Requires: " .. (reqNode and reqNode.name or reqId)
		end
	end

	return true, "OK"
end

-- Get total research progress
function ResearchTree.GetProgress(unlockedNodes)
	local total = #ResearchTree.Nodes
	local done = 0
	for _, node in ipairs(ResearchTree.Nodes) do
		if unlockedNodes[node.id] or node.unlocked then
			done = done + 1
		end
	end
	return done, total, math.floor(done / total * 100)
end

-- Get available (researchable now) nodes
function ResearchTree.GetAvailable(unlockedNodes)
	local available = {}
	for _, node in ipairs(ResearchTree.Nodes) do
		if not unlockedNodes[node.id] and not node.unlocked then
			local canResearch, _ = ResearchTree.CanResearch(node.id, unlockedNodes)
			if canResearch then
				table.insert(available, node)
			end
		end
	end
	return available
end

return ResearchTree
