--[[
	Facilities.lua
	MOLGANG Facility & Building System

	Facilities produce resources, require cash/MolCoins to build
	MVP: Simple production, no upgrades yet
]]

local Facilities = {}

-- Facility definitions
local FACILITY_TYPES = {
	Mine = {
		name = "Mine",
		cost = 5000,
		description = "Collect atoms from the ground",
		productionRate = 10,  -- atoms per cycle
		productionTime = 60,  -- seconds
		maxLevel = 5,
	},
	Factory = {
		name = "Factory",
		cost = 10000,
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
		mines = 0,
		factories = 0,
		researchLabs = 0,
		offices = 0,
	}
end

-- Calculate total production per cycle
function Facilities.CalculateProduction(facilities)
	local production = {
		atoms = (facilities.mines or 0) * FACILITY_TYPES.Mine.productionRate,
		molecules = (facilities.factories or 0) * FACILITY_TYPES.Factory.productionRate,
		research = (facilities.researchLabs or 0) * FACILITY_TYPES["Research Lab"].productionRate,
		storageBonus = (facilities.offices or 0) * 50,  -- 50 extra slots per office
	}
	return production
end

-- Calculate total facility cost
function Facilities.CalculateTotalCost(facilities)
	local cost = 0
	cost = cost + (facilities.mines or 0) * FACILITY_TYPES.Mine.cost
	cost = cost + (facilities.factories or 0) * FACILITY_TYPES.Factory.cost
	cost = cost + (facilities.researchLabs or 0) * FACILITY_TYPES["Research Lab"].cost
	cost = cost + (facilities.offices or 0) * FACILITY_TYPES.Office.cost
	return cost
end

-- Check if facility can be built
function Facilities.CanBuild(facilities, facilityName)
	local facility = FACILITY_TYPES[facilityName]
	if not facility then return false, "Unknown facility" end

	local key = string.lower(facilityName):gsub(" ", "")
	key = key == "researchlab" and "researchLabs" or (key .. "s")

	local count = facilities[key] or 0
	if count >= facility.maxLevel then
		return false, "Facility at max level"
	end

	return true, "OK"
end

-- Build a facility (server validates cost)
function Facilities.BuildFacility(facilities, facilityName)
	local facility = FACILITY_TYPES[facilityName]
	if not facility then return false end

	local key = facilityName:lower():gsub(" ", "")
	key = key == "researchlab" and "researchlabs" or (key .. "s")

	facilities[key] = (facilities[key] or 0) + 1
	return true
end

return Facilities
