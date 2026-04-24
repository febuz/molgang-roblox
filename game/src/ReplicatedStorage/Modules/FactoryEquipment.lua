--[[
	FactoryEquipment.lua
	MOLGANG — Factory Equipment Catalog for Entrepreneur Mode

	All buyable equipment items for the 1000m² indoor factory.
	Each item maps to a generated FBX 3D model.
	Grid-based placement: 1 cell = 1m² = 1 stud.

	Categories:
	1. Crushing & Size Reduction
	2. Separation & Sorting
	3. Chemical Processing
	4. Storage & Logistics
	5. Utilities & Infrastructure
	6. Lab & Analysis
]]

local FactoryEquipment = {}

-- ═══════════════════════════════════════════════
-- EQUIPMENT DEFINITIONS
-- ═══════════════════════════════════════════════

FactoryEquipment.Items = {
	-- ════════════════════════════════════════
	-- CATEGORY 1: CRUSHING & SIZE REDUCTION
	-- ════════════════════════════════════════
	{
		id = "jaw_crusher",
		name = "Jaw Crusher",
		category = "Crushing",
		model = "jaw_crusher",         -- maps to jaw_crusher.fbx
		gridSize = {4, 3},             -- 4×3 cells on factory floor
		cost = 5000,                   -- MolCoins to buy
		monthlyCost = 200,             -- maintenance per game month
		powerKW = 75,                  -- kilowatts draw
		productionType = "crush_coarse",
		productionRate = 50,           -- tons/hour capacity
		inputSize = "chunk",           -- requires 5cm+ chunks
		outputSize = "coarse",         -- produces ~10cm pieces
		description = "Primary crusher. Breaks raw 5cm+ slag chunks between steel jaws.",
		color = Color3.fromRGB(140, 140, 150),
		adjacencyBonus = {vibrating_screen = 1.15},  -- 15% bonus next to screen
		tier = 1,
	},
	{
		id = "cone_crusher",
		name = "Cone Crusher",
		category = "Crushing",
		model = "cone_crusher",
		gridSize = {3, 3},
		cost = 8000,
		monthlyCost = 300,
		powerKW = 110,
		productionType = "crush_fine",
		productionRate = 30,
		inputSize = "coarse",
		outputSize = "crushed",        -- ~2cm
		description = "Secondary crusher. Reduces 10cm to ~2cm via hydraulic cone pressure.",
		color = Color3.fromRGB(130, 130, 140),
		adjacencyBonus = {jaw_crusher = 1.10, ball_mill = 1.10},
		tier = 2,
	},
	{
		id = "ball_mill",
		name = "Ball Mill",
		category = "Crushing",
		model = "ball_mill",
		gridSize = {6, 3},
		cost = 15000,
		monthlyCost = 500,
		powerKW = 250,
		productionType = "grind",
		productionRate = 10,
		inputSize = "crushed",
		outputSize = "ground",         -- <1mm
		description = "Grinding mill. Steel balls pulverize slag to <1mm powder. Energy intensive.",
		color = Color3.fromRGB(100, 100, 110),
		adjacencyBonus = {cone_crusher = 1.10, magnetic_separator = 1.15},
		tier = 3,
	},
	{
		id = "hammer_station",
		name = "Manual Hammer Station",
		category = "Crushing",
		model = "anvil_hammer",
		gridSize = {2, 2},
		cost = 500,
		monthlyCost = 0,              -- no maintenance (manual)
		powerKW = 0,                  -- human-powered
		productionType = "crush_manual",
		productionRate = 2,
		inputSize = "chunk",
		outputSize = "crushed",
		description = "Anvil + hammer. Free to operate but slow. Good for starting entrepreneurs.",
		color = Color3.fromRGB(80, 60, 40),
		tier = 1,
	},

	-- ════════════════════════════════════════
	-- CATEGORY 2: SEPARATION & SORTING
	-- ════════════════════════════════════════
	{
		id = "vibrating_screen",
		name = "Vibrating Screen",
		category = "Separation",
		model = "vibrating_screen",
		gridSize = {4, 2},
		cost = 3000,
		monthlyCost = 150,
		powerKW = 15,
		productionType = "classify",
		productionRate = 80,
		description = "Sorts material by particle size on vibrating mesh decks.",
		color = Color3.fromRGB(150, 150, 160),
		adjacencyBonus = {jaw_crusher = 1.15, cone_crusher = 1.10},
		tier = 1,
	},
	{
		id = "magnetic_separator",
		name = "HGMS Magnetic Separator",
		category = "Separation",
		model = "magnetic_separator",
		gridSize = {4, 3},
		cost = 12000,
		monthlyCost = 400,
		powerKW = 45,
		productionType = "mag_separate",
		productionRate = 25,
		description = "Removes iron (Fe3O4) from ground slag using high-gradient magnets.",
		color = Color3.fromRGB(160, 50, 50),
		adjacencyBonus = {ball_mill = 1.15, leaching_tank = 1.20},
		byproduct = "Fe",
		tier = 2,
	},
	{
		id = "filtration_press",
		name = "Filtration Press",
		category = "Separation",
		model = "filtration_press",
		gridSize = {5, 2},
		cost = 8000,
		monthlyCost = 250,
		powerKW = 20,
		productionType = "filter",
		productionRate = 15,
		description = "Separates leachate (dissolved metals) from solid residue under hydraulic pressure.",
		color = Color3.fromRGB(80, 100, 160),
		adjacencyBonus = {leaching_tank = 1.20},
		tier = 3,
	},

	-- ════════════════════════════════════════
	-- CATEGORY 3: CHEMICAL PROCESSING
	-- ════════════════════════════════════════
	{
		id = "leaching_tank",
		name = "Leaching Reactor (500L)",
		category = "Chemical",
		model = "leaching_tank",
		gridSize = {3, 3},
		cost = 10000,
		monthlyCost = 350,
		powerKW = 30,
		productionType = "leach",
		productionRate = 5,
		description = "Acid/base reactor with agitator. 500L capacity. Core of the extraction process.",
		color = Color3.fromRGB(200, 180, 60),
		adjacencyBonus = {magnetic_separator = 1.15, filtration_press = 1.20, storage_tank = 1.10},
		tier = 2,
	},
	{
		id = "leaching_tank_large",
		name = "Leaching Reactor (2000L)",
		category = "Chemical",
		model = "leaching_tank",
		gridSize = {4, 4},
		cost = 30000,
		monthlyCost = 800,
		powerKW = 60,
		productionType = "leach",
		productionRate = 20,
		description = "Large-scale reactor. 4× capacity of standard tank. Industrial production.",
		color = Color3.fromRGB(220, 200, 80),
		adjacencyBonus = {magnetic_separator = 1.15, filtration_press = 1.20},
		tier = 3,
	},
	{
		id = "roasting_kiln",
		name = "Rotary Roasting Kiln",
		category = "Chemical",
		model = "roasting_kiln",
		gridSize = {7, 3},
		cost = 25000,
		monthlyCost = 600,
		powerKW = 500,
		productionType = "roast",
		productionRate = 8,
		description = "900°C rotary kiln. Oxidizes V3+ to V5+ for 25% better extraction. Very energy-intensive.",
		color = Color3.fromRGB(180, 80, 30),
		adjacencyBonus = {leaching_tank = 1.25},
		tier = 3,
	},
	{
		id = "precipitation_tank",
		name = "Precipitation Reactor",
		category = "Chemical",
		model = "leaching_tank",
		gridSize = {3, 3},
		cost = 8000,
		monthlyCost = 250,
		powerKW = 10,
		productionType = "precipitate",
		productionRate = 10,
		description = "pH-controlled precipitation. Selectively recovers V2O5, Fe, Ti from solution.",
		color = Color3.fromRGB(100, 200, 150),
		adjacencyBonus = {filtration_press = 1.15},
		tier = 3,
	},
	{
		id = "drying_oven",
		name = "Drying Oven (110°C)",
		category = "Chemical",
		model = "roasting_kiln",
		gridSize = {3, 2},
		cost = 4000,
		monthlyCost = 150,
		powerKW = 40,
		productionType = "dry",
		productionRate = 15,
		description = "Dries precipitated metal compounds. Final step before product storage.",
		color = Color3.fromRGB(200, 160, 100),
		adjacencyBonus = {storage_silo = 1.10},
		tier = 2,
	},

	-- ════════════════════════════════════════
	-- CATEGORY 4: STORAGE & LOGISTICS
	-- ════════════════════════════════════════
	{
		id = "storage_silo",
		name = "Product Storage Silo",
		category = "Storage",
		model = "storage_silo",
		gridSize = {2, 2},
		cost = 3000,
		monthlyCost = 50,
		powerKW = 0,
		productionType = "store",
		storageCapacity = 500,         -- kg capacity
		description = "Stores finished product (V2O5, Fe2O3, TiO2). 500kg capacity per silo.",
		color = Color3.fromRGB(180, 180, 190),
		tier = 1,
	},
	{
		id = "slag_hopper",
		name = "Raw Slag Hopper",
		category = "Storage",
		model = "cooling_pit",
		gridSize = {4, 3},
		cost = 2000,
		monthlyCost = 30,
		powerKW = 0,
		productionType = "input_store",
		storageCapacity = 2000,
		description = "Receives raw BOF slag deliveries. Feeds into crushing circuit.",
		color = Color3.fromRGB(100, 90, 75),
		adjacencyBonus = {jaw_crusher = 1.10, hammer_station = 1.10},
		tier = 1,
	},
	{
		id = "conveyor_belt",
		name = "Conveyor Belt (8m)",
		category = "Storage",
		model = "conveyor_belt",
		gridSize = {8, 1},
		cost = 1500,
		monthlyCost = 50,
		powerKW = 5,
		productionType = "transport",
		description = "Connects equipment. Reduces manual handling. +10% efficiency for linked items.",
		color = Color3.fromRGB(60, 60, 65),
		linkBonus = 1.10,              -- 10% bonus to items it connects
		tier = 1,
	},

	-- ════════════════════════════════════════
	-- CATEGORY 5: UTILITIES
	-- ════════════════════════════════════════
	{
		id = "power_generator",
		name = "Diesel Generator (200kW)",
		category = "Utilities",
		model = nil,                   -- built from primitives
		gridSize = {3, 2},
		cost = 6000,
		monthlyCost = 400,
		powerKW = -200,               -- GENERATES 200kW
		productionType = "power",
		description = "Provides 200kW of power. Required when total equipment draw exceeds grid supply.",
		color = Color3.fromRGB(60, 100, 60),
		tier = 2,
	},
	{
		id = "water_treatment",
		name = "Water Treatment Unit",
		category = "Utilities",
		model = nil,
		gridSize = {3, 3},
		cost = 7000,
		monthlyCost = 200,
		powerKW = 25,
		productionType = "water",
		description = "Treats process water for reuse. Required for leaching operations. Reduces water costs 50%.",
		color = Color3.fromRGB(80, 160, 220),
		adjacencyBonus = {leaching_tank = 1.10, leaching_tank_large = 1.10},
		tier = 2,
	},
	{
		id = "fume_hood",
		name = "Fume Extraction Hood",
		category = "Utilities",
		model = nil,
		gridSize = {2, 1},
		cost = 2000,
		monthlyCost = 80,
		powerKW = 10,
		productionType = "safety",
		description = "Extracts toxic fumes from acid leaching. Required near chemical equipment for safety.",
		color = Color3.fromRGB(180, 180, 180),
		tier = 1,
	},

	-- ════════════════════════════════════════
	-- CATEGORY 6: LAB & ANALYSIS
	-- ════════════════════════════════════════
	{
		id = "xrf_analyzer",
		name = "XRF Analyzer",
		category = "Lab",
		model = nil,
		gridSize = {2, 2},
		cost = 20000,
		monthlyCost = 100,
		powerKW = 5,
		productionType = "analyze",
		description = "X-Ray Fluorescence analyzer. Instantly shows slag composition. Essential for quality control.",
		color = Color3.fromRGB(200, 200, 240),
		analysisBonus = 1.20,          -- 20% better extraction knowledge
		tier = 3,
	},
	{
		id = "ph_meter_station",
		name = "pH Meter Station",
		category = "Lab",
		model = nil,
		gridSize = {1, 1},
		cost = 1000,
		monthlyCost = 20,
		powerKW = 1,
		productionType = "ph_control",
		description = "Precise pH measurement. Required for optimal precipitation control.",
		color = Color3.fromRGB(100, 200, 180),
		tier = 1,
	},
	{
		id = "icp_oes",
		name = "ICP-OES Spectrometer",
		category = "Lab",
		model = "pressure_vessel",
		gridSize = {2, 2},
		cost = 50000,
		monthlyCost = 300,
		powerKW = 15,
		productionType = "trace_analysis",
		description = "Inductively Coupled Plasma spectrometer. Detects trace metals (Pb, Cd, As, Cr). Required for EU compliance (EU 2019/1009).",
		color = Color3.fromRGB(220, 220, 255),
		tier = 3,
	},

	-- ════════════════════════════════════════
	-- CATEGORY 7: ADVANCED CHEMICAL PROCESSING
	-- (New equipment from 3D model expansion)
	-- ════════════════════════════════════════
	{
		id = "distillation_column",
		name = "Distillation Column",
		category = "Chemical",
		model = "distillation_column",
		gridSize = {2, 2},
		cost = 35000,
		monthlyCost = 500,
		powerKW = 40,
		productionType = "distill",
		productionRate = 8,
		description = "Separates dissolved metals by boiling point differences. Essential for high-purity V2O5 recovery from leachate.",
		color = Color3.fromRGB(160, 170, 200),
		adjacencyBonus = {leaching_tank = 1.15, leaching_tank_large = 1.15},
		tier = 4,
	},
	{
		id = "heat_exchanger",
		name = "Shell-and-Tube Heat Exchanger",
		category = "Utilities",
		model = "heat_exchanger",
		gridSize = {4, 2},
		cost = 12000,
		monthlyCost = 200,
		powerKW = 5,
		productionType = "heat_recovery",
		description = "Recovers heat from hot leachate to pre-heat incoming reagent. Saves 30% energy on heated leaching.",
		color = Color3.fromRGB(180, 130, 80),
		adjacencyBonus = {leaching_tank = 1.10, roasting_kiln = 1.20},
		energySaving = 0.30,
		tier = 3,
	},
	{
		id = "centrifuge",
		name = "Basket Centrifuge",
		category = "Separation",
		model = "centrifuge",
		gridSize = {2, 2},
		cost = 18000,
		monthlyCost = 350,
		powerKW = 30,
		productionType = "centrifuge_separate",
		productionRate = 12,
		description = "High-speed solid-liquid separation. Faster than filtration press, better for fine precipitates.",
		color = Color3.fromRGB(140, 160, 180),
		adjacencyBonus = {precipitation_tank = 1.20, drying_oven = 1.10},
		tier = 3,
	},
	{
		id = "pressure_vessel",
		name = "Pressure Reactor (10 bar)",
		category = "Chemical",
		model = "pressure_vessel",
		gridSize = {2, 3},
		cost = 40000,
		monthlyCost = 600,
		powerKW = 50,
		productionType = "pressure_leach",
		productionRate = 15,
		description = "High-pressure leaching at 10 bar. Dramatically increases extraction rate for refractory ores like TiO2.",
		color = Color3.fromRGB(100, 120, 160),
		adjacencyBonus = {leaching_tank = 1.30},
		tier = 4,
	},
	{
		id = "cyclone_separator",
		name = "Cyclone Separator",
		category = "Separation",
		model = "cyclone_separator",
		gridSize = {2, 2},
		cost = 8000,
		monthlyCost = 100,
		powerKW = 8,
		productionType = "cyclone_classify",
		productionRate = 40,
		description = "Separates particles by size using centrifugal force. Low energy, high throughput. Good pre-classifier.",
		color = Color3.fromRGB(180, 160, 120),
		adjacencyBonus = {ball_mill = 1.15, vibrating_screen = 1.10},
		tier = 2,
	},
	{
		id = "erlenmeyer_flask",
		name = "Lab Flask Set",
		category = "Lab",
		model = "erlenmeyer_flask",
		gridSize = {1, 1},
		cost = 500,
		monthlyCost = 10,
		powerKW = 0,
		productionType = "lab_test",
		description = "Erlenmeyer flasks for bench-scale leaching tests. Test reagent combinations before committing to full batch.",
		color = Color3.fromRGB(200, 210, 230),
		tier = 1,
	},
	{
		id = "beaker_set",
		name = "Graduated Beaker Set",
		category = "Lab",
		model = "beaker_1L",
		gridSize = {1, 1},
		cost = 300,
		monthlyCost = 5,
		powerKW = 0,
		productionType = "measurement",
		description = "Precision measurement beakers. Improves reagent dosing accuracy by 10%.",
		color = Color3.fromRGB(200, 220, 240),
		accuracyBonus = 1.10,
		tier = 1,
	},
}

-- ═══════════════════════════════════════════════
-- FACTORY FLOOR CONFIG
-- ═══════════════════════════════════════════════

FactoryEquipment.FloorConfig = {
	width = 40,            -- cells (40m)
	height = 25,           -- cells (25m)
	totalArea = 1000,      -- m²
	baseRent = 2000,       -- MolCoins per game month
	basePowerKW = 100,     -- kW included in rent
	maxEquipment = 30,     -- max items placed
}

-- ═══════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════

function FactoryEquipment.GetItem(itemId)
	for _, item in ipairs(FactoryEquipment.Items) do
		if item.id == itemId then return item end
	end
	return nil
end

function FactoryEquipment.GetByCategory(category)
	local result = {}
	for _, item in ipairs(FactoryEquipment.Items) do
		if item.category == category then
			table.insert(result, item)
		end
	end
	return result
end

function FactoryEquipment.GetCategories()
	return {"Crushing", "Separation", "Chemical", "Storage", "Utilities", "Lab"}
end

-- Check if equipment fits on grid at position without overlap
function FactoryEquipment.CanPlace(grid, itemId, gridX, gridY, rotation)
	local item = FactoryEquipment.GetItem(itemId)
	if not item then return false, "Unknown equipment" end

	local w = item.gridSize[1]
	local h = item.gridSize[2]
	if rotation and rotation % 2 == 1 then
		w, h = h, w  -- swap for 90°/270° rotation
	end

	local floor = FactoryEquipment.FloorConfig
	if gridX < 1 or gridY < 1 or gridX + w - 1 > floor.width or gridY + h - 1 > floor.height then
		return false, "Out of bounds"
	end

	-- Check for overlaps
	for x = gridX, gridX + w - 1 do
		for y = gridY, gridY + h - 1 do
			if grid[x] and grid[x][y] then
				return false, "Overlaps with " .. grid[x][y]
			end
		end
	end

	return true, "OK"
end

-- Place equipment on grid
function FactoryEquipment.Place(grid, itemId, gridX, gridY, rotation)
	local canPlace, reason = FactoryEquipment.CanPlace(grid, itemId, gridX, gridY, rotation)
	if not canPlace then return false, reason end

	local item = FactoryEquipment.GetItem(itemId)
	local w = item.gridSize[1]
	local h = item.gridSize[2]
	if rotation and rotation % 2 == 1 then w, h = h, w end

	for x = gridX, gridX + w - 1 do
		if not grid[x] then grid[x] = {} end
		for y = gridY, gridY + h - 1 do
			grid[x][y] = itemId
		end
	end

	return true, "Placed"
end

-- Remove equipment from grid
function FactoryEquipment.Remove(grid, gridX, gridY)
	local itemId = grid[gridX] and grid[gridX][gridY]
	if not itemId then return false end

	-- Find all cells belonging to this placement
	for x, col in pairs(grid) do
		for y, id in pairs(col) do
			if id == itemId then
				grid[x][y] = nil
			end
		end
	end
	return true
end

-- Calculate total power consumption
function FactoryEquipment.CalculatePower(placements)
	local totalDraw = 0
	local totalGenerate = 0
	for _, placement in ipairs(placements) do
		local item = FactoryEquipment.GetItem(placement.itemId)
		if item then
			if item.powerKW < 0 then
				totalGenerate = totalGenerate + math.abs(item.powerKW)
			else
				totalDraw = totalDraw + item.powerKW
			end
		end
	end
	local available = FactoryEquipment.FloorConfig.basePowerKW + totalGenerate
	return totalDraw, available, available - totalDraw
end

-- Calculate total monthly costs
function FactoryEquipment.CalculateMonthlyCost(placements)
	local rent = FactoryEquipment.FloorConfig.baseRent
	local maintenance = 0
	for _, placement in ipairs(placements) do
		local item = FactoryEquipment.GetItem(placement.itemId)
		if item then
			maintenance = maintenance + item.monthlyCost
		end
	end
	return rent + maintenance, rent, maintenance
end

-- Calculate adjacency bonuses
function FactoryEquipment.CalculateAdjacencyBonuses(placements)
	local bonuses = {}
	for i, p1 in ipairs(placements) do
		local item1 = FactoryEquipment.GetItem(p1.itemId)
		if item1 and item1.adjacencyBonus then
			for j, p2 in ipairs(placements) do
				if i ~= j then
					-- Check if adjacent (within 2 cells)
					local dx = math.abs(p1.gridX - p2.gridX)
					local dy = math.abs(p1.gridY - p2.gridY)
					if dx <= item1.gridSize[1] + 1 and dy <= item1.gridSize[2] + 1 then
						local bonus = item1.adjacencyBonus[p2.itemId]
						if bonus then
							bonuses[p1.itemId] = (bonuses[p1.itemId] or 1.0) * bonus
						end
					end
				end
			end
		end
	end
	return bonuses
end

return FactoryEquipment
