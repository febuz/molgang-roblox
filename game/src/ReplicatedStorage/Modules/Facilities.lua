--[[
	Facilities.lua
	MOLGANG Facility & Building System

	Facilities produce resources, require cash/MolCoins to build
	MVP: Simple production, no upgrades yet
]]

local Facilities = {}

-- Facility definitions
local FACILITY_TYPES = {
	["Starter Bench"] = {
		name = "Starter Bench",
		cost = 200,
		description = "Basic workbench. Produces 3 atoms/cycle. Your first step!",
		productionRate = 3,
		productionTime = 60,
		maxLevel = 1,
	},
	Mine = {
		name = "Mine",
		cost = 800,
		description = "Collect atoms from the ground",
		productionRate = 10,  -- atoms per cycle
		productionTime = 60,  -- seconds
		maxLevel = 5,
	},
	Factory = {
		name = "Factory",
		cost = 2000,
		description = "Build molecules from atoms",
		productionRate = 5,   -- molecules per cycle
		productionTime = 120,
		maxLevel = 5,
	},
	["Research Lab"] = {
		name = "Research Lab",
		cost = 15000,
		description = "Unlock research and upgrades",
		productionRate = 1,   -- research point per cycle
		productionTime = 180,
		maxLevel = 3,
	},
	Office = {
		name = "Office",
		cost = 8000,
		description = "Increase storage capacity",
		productionRate = 0,   -- storage bonus
		productionTime = 0,
		maxLevel = 10,
	},
}

function Facilities.GetTypes()
	return FACILITY_TYPES
end

function Facilities.GetFacility(name)
	return FACILITY_TYPES[name]
end

-- Player facilities data structure
function Facilities.CreatePlayerFacilities()
	return {
		starterBenches = 0,
		mines = 0,
		factories = 0,
		researchLabs = 0,
		offices = 0,
	}
end

-- Calculate total production per cycle
function Facilities.CalculateProduction(facilities)
	local production = {
		atoms = (facilities.starterBenches or 0) * FACILITY_TYPES["Starter Bench"].productionRate
			+ (facilities.mines or 0) * FACILITY_TYPES.Mine.productionRate,
		molecules = (facilities.factories or 0) * FACILITY_TYPES.Factory.productionRate,
		research = (facilities.researchLabs or 0) * FACILITY_TYPES["Research Lab"].productionRate,
		storageBonus = (facilities.offices or 0) * 50,  -- 50 extra slots per office
	}
	return production
end

-- Outdoor facilities are affected by the server-owned weather state.
function Facilities.CalculateOutdoorAtomRate(facilities, outdoorPenalty)
	local baseAtoms = Facilities.CalculateProduction(facilities).atoms
	local multiplier = tonumber(outdoorPenalty) or 1
	multiplier = math.clamp(multiplier, 0, 1)
	return baseAtoms * multiplier
end

-- Calculate total facility cost
function Facilities.CalculateTotalCost(facilities)
	local cost = 0
	cost = cost + (facilities.starterBenches or 0) * FACILITY_TYPES["Starter Bench"].cost
	cost = cost + (facilities.mines or 0) * FACILITY_TYPES.Mine.cost
	cost = cost + (facilities.factories or 0) * FACILITY_TYPES.Factory.cost
	cost = cost + (facilities.researchLabs or 0) * FACILITY_TYPES["Research Lab"].cost
	cost = cost + (facilities.offices or 0) * FACILITY_TYPES.Office.cost
	return cost
end

local FACILITY_KEYS = {
	["Starter Bench"] = "starterBenches",
	Mine = "mines",
	Factory = "factories",
	["Research Lab"] = "researchLabs",
	Office = "offices",
}

local function getFacilityKey(facilityName)
	return FACILITY_KEYS[facilityName]
end

-- Check if facility can be built
function Facilities.CanBuild(facilities, facilityName)
	local facility = FACILITY_TYPES[facilityName]
	if not facility then return false, "Unknown facility" end

	local key = getFacilityKey(facilityName)
	if not key then return false, "Unknown facility key" end

	-- Read the legacy lowercase Research Lab field too, so old saves cannot
	-- bypass the max-level check during migration.
	local count = facilities[key] or 0
	if facilityName == "Research Lab" then
		count = math.max(count, facilities.researchlabs or 0)
	end
	if count >= facility.maxLevel then
		return false, "Facility at max level"
	end

	return true, "OK"
end

-- Build a facility (server validates cost)
function Facilities.BuildFacility(facilities, facilityName)
	local facility = FACILITY_TYPES[facilityName]
	if not facility then return false end

	local key = getFacilityKey(facilityName)
	if not key then return false end

	facilities[key] = (facilities[key] or 0) + 1
	if facilityName == "Research Lab" then
		facilities.researchlabs = nil
	end
	return true
end

return Facilities
