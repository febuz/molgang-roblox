--[[
	SiliconPurification.lua
	MOLGANG — Si-28 Isotope Purification for Quantum Computing

	THE MAIN GOAL of the OTAP teststraat:
	Purify silicon from steel slag to ultra-pure Si-28 isotope (9N = 99.9999999%)
	for use in quantum computer FPGA fabrication.

	Real-world basis:
	- Natural Si: 92.2% Si-28, 4.7% Si-29, 3.1% Si-30
	- Quantum computing requires isotopically pure Si-28
	- 9N (99.9999999%) purity needed for qubit coherence
	- Process: SiO2 → SiHCl3 (trichlorosilane via HCl) → Si-28 enrichment → CVD

	Purification pipeline (in-game stages):
	1. Extract SiO2 from slag (14% of BOF slag is silica)
	2. React SiO2 with HCl → SiHCl3 (trichlorosilane) + H2O
	3. Fractional distillation to remove impurities (6N)
	4. Isotope separation via centrifuge cascade (Si-28 enrichment)
	5. CVD (Chemical Vapor Deposition) to grow single crystal Si-28
	6. Wafer slicing → 9N pure Si-28 wafers
	7. FPGA fabrication → quantum computer chip

	Each stage increases purity by ~1 order of magnitude (N).
	Players progress from slag (3N) to quantum-grade silicon (9N).
]]

local SiliconPurification = {}

-- ═══════════════════════════════════════════════
-- PURITY LEVELS (N = nines of purity)
-- ═══════════════════════════════════════════════

SiliconPurification.PurityLevels = {
	{nines = 1, name = "Metallurgical Grade",  purity = 99,           color = Color3.fromRGB(120, 120, 130), description = "Raw silicon from silica reduction. Full of impurities."},
	{nines = 2, name = "Chemical Grade",       purity = 99.9,         color = Color3.fromRGB(140, 145, 155), description = "Purified with HCl. Suitable for silicones."},
	{nines = 3, name = "Solar Grade",          purity = 99.999,       color = Color3.fromRGB(160, 165, 175), description = "Good enough for solar panels. 5N purity."},
	{nines = 5, name = "Electronic Grade",     purity = 99.99999,     color = Color3.fromRGB(180, 185, 200), description = "Standard semiconductor fab quality. 7N."},
	{nines = 7, name = "Ultra-Pure",           purity = 99.9999999,   color = Color3.fromRGB(200, 210, 230), description = "Zone-refined crystal. 9N. Almost there."},
	{nines = 9, name = "Quantum Grade Si-28",  purity = 99.999999999, color = Color3.fromRGB(220, 240, 255), description = "Isotopically enriched Si-28. 9N. Quantum computer ready!"},
}

-- ═══════════════════════════════════════════════
-- PURIFICATION STAGES
-- ═══════════════════════════════════════════════

SiliconPurification.Stages = {
	{
		id = "extract_sio2",
		name = "Stage 1: SiO2 Extraction from Slag",
		description = "Leach BOF slag with NaOH to dissolve silica. Filter and precipitate pure SiO2.",
		inputProduct = "SiO2",        -- from slag (14% of composition)
		reagent = "NaOH",
		reagentCost = 120,            -- MolCoins
		duration = 720,               -- game minutes (~12 real min)
		outputPurity = 1,             -- 1N (99%)
		outputProduct = "SiO2_pure",
		requiredLevel = 1,            -- player research level needed
		mcReward = 100,
		chemistry = "SiO2 + 2NaOH → Na2SiO3 + H2O (then HCl precipitation)",
	},
	{
		id = "trichlorosilane",
		name = "Stage 2: Trichlorosilane Synthesis (HCl)",
		description = "React purified SiO2 with HCl at 300°C to form SiHCl3. This is the Siemens process.",
		inputProduct = "SiO2_pure",
		reagent = "HCl",
		reagentCost = 200,
		duration = 1440,
		outputPurity = 3,             -- 3N after distillation
		outputProduct = "SiHCl3",
		requiredLevel = 5,
		mcReward = 300,
		chemistry = "Si + 3HCl → SiHCl3 + H2 (at 300°C in fluidized bed reactor)",
	},
	{
		id = "fractional_distillation",
		name = "Stage 3: Fractional Distillation",
		description = "Distill SiHCl3 at 31.8°C boiling point. Remove boron, phosphorus, metals.",
		inputProduct = "SiHCl3",
		reagent = nil,                -- no reagent, just energy
		reagentCost = 0,
		energyCost = 500,             -- MolCoins for energy
		duration = 2160,
		outputPurity = 5,             -- 5N (solar grade)
		outputProduct = "SiHCl3_pure",
		requiredLevel = 10,
		mcReward = 500,
		chemistry = "SiHCl3 (bp 31.8°C) — fractional distillation removes B, P, As impurities",
	},
	{
		id = "cvd_polysilicon",
		name = "Stage 4: CVD Polysilicon Deposition",
		description = "Decompose ultra-pure SiHCl3 at 1150°C on heated silicon rods. Siemens reactor.",
		inputProduct = "SiHCl3_pure",
		reagent = "H2",
		reagentCost = 300,
		energyCost = 1000,
		duration = 4320,
		outputPurity = 7,             -- 7N (electronic grade)
		outputProduct = "Polysilicon_7N",
		requiredLevel = 15,
		mcReward = 1000,
		chemistry = "SiHCl3 + H2 → Si + 3HCl (at 1150°C, Siemens reactor)",
	},
	{
		id = "isotope_enrichment",
		name = "Stage 5: Si-28 Isotope Enrichment",
		description = "Gas centrifuge cascade to separate Si-28 from Si-29 and Si-30 isotopes. SiF4 gas.",
		inputProduct = "Polysilicon_7N",
		reagent = "F2",               -- fluorination
		reagentCost = 800,
		energyCost = 2000,
		duration = 8640,              -- long process!
		outputPurity = 8,             -- 8N, enriched Si-28
		outputProduct = "SiF4_Si28",
		requiredLevel = 20,
		mcReward = 3000,
		chemistry = "Si → SiF4 (fluorination) → centrifuge cascade → Si-28 enriched SiF4",
	},
	{
		id = "single_crystal_czochralski",
		name = "Stage 6: Czochralski Crystal Growth",
		description = "Grow a single crystal Si-28 ingot using Czochralski method. 9N purity achieved!",
		inputProduct = "SiF4_Si28",
		reagent = nil,
		energyCost = 5000,            -- extremely energy-intensive
		duration = 14400,             -- 10 game days
		outputPurity = 9,             -- 9N! Quantum grade!
		outputProduct = "Si28_Crystal_9N",
		requiredLevel = 25,
		mcReward = 10000,
		chemistry = "SiF4 → Si (reduction) → Czochralski pull at 1414°C → single crystal Si-28 ingot",
	},
	{
		id = "wafer_slicing",
		name = "Stage 7: Wafer Slicing & Polishing",
		description = "Diamond wire saw the crystal into 300mm wafers. CMP polish to atomic smoothness.",
		inputProduct = "Si28_Crystal_9N",
		reagent = nil,
		energyCost = 2000,
		duration = 2880,
		outputPurity = 9,
		outputProduct = "Si28_Wafer_9N",
		requiredLevel = 28,
		mcReward = 15000,
		chemistry = "Diamond wire sawing → lapping → CMP (Chemical Mechanical Polishing) → epitaxial layer",
	},
}

-- ═══════════════════════════════════════════════
-- ENDGAME: QUANTUM COMPUTER ASSEMBLY
-- ═══════════════════════════════════════════════

SiliconPurification.QuantumComputer = {
	name = "Quantum Computer (FPGA-based)",
	description = "The ultimate goal: Build a quantum computer using your Si-28 wafers and FPGA technology.",
	requirements = {
		{item = "Si28_Wafer_9N", quantity = 4, description = "4× Si-28 wafers (9N purity)"},
		{item = "V2O5", quantity = 10, description = "10× V2O5 (vanadium for VRFB power supply)"},
		{item = "research_complete", description = "Complete all research nodes"},
	},
	reward = {
		molCoins = 100000,
		badge = "Quantum Pioneer",
		title = "Quantum Computer Engineer",
		prestige = true, -- unlocks prestige system
	},
	lore = "From steel slag to quantum supremacy. You extracted silicon from industrial waste, "
		.. "purified it through 7 stages to 9N isotopic purity, and fabricated the qubits "
		.. "that power the next generation of computing. This is real chemical engineering.",
}

-- ═══════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════

function SiliconPurification.GetStage(stageId)
	for _, stage in ipairs(SiliconPurification.Stages) do
		if stage.id == stageId then return stage end
	end
	return nil
end

function SiliconPurification.GetPurityLevel(nines)
	for _, level in ipairs(SiliconPurification.PurityLevels) do
		if level.nines >= nines then return level end
	end
	return SiliconPurification.PurityLevels[#SiliconPurification.PurityLevels]
end

function SiliconPurification.GetNextStage(currentProduct)
	for _, stage in ipairs(SiliconPurification.Stages) do
		if stage.inputProduct == currentProduct then return stage end
	end
	return nil
end

function SiliconPurification.FormatPurity(nines)
	return string.rep("9", nines) .. "." .. string.rep("9", math.max(0, nines - 1)) .. "%"
end

function SiliconPurification.CanBuildQuantumComputer(playerData)
	local qc = SiliconPurification.QuantumComputer
	local siliconProducts = playerData.siliconPurification and playerData.siliconPurification.products
		or playerData.siliconProducts
	local molecules = playerData.molecules or {}
	for _, req in ipairs(qc.requirements) do
		if req.item and req.quantity then
			local has
			if req.item == "V2O5" then
				has = molecules[req.item] or 0
			else
				has = siliconProducts and siliconProducts[req.item] or 0
			end
			if has < req.quantity then return false, req.description end
		end
	end
	return true, "All requirements met!"
end

return SiliconPurification
