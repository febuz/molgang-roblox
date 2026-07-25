-- StationAccess.lua
-- Pure spatial rule shared by server validation and tests.

local StationAccess = {}

local function finiteCoordinate(value)
	local number = tonumber(value)
	return number and number == number and number ~= math.huge and number ~= -math.huge
end

-- Keep the physical stations and their interaction envelopes in one shared
-- contract. WorldBuilder owns the geometry; server handlers and tests consume
-- these identifiers so a rename cannot silently break the production loop.
StationAccess.Stations = {
	crush = {
		partName = "CrushPlatform",
		interactionType = "SlagCrushStation",
		radius = 28,
		label = "Crushing Station",
		mapPosition = {x = -1850, y = 10, z = -40},
	},
	cone = {
		partName = "ConeCrusherBase",
		interactionType = "SlagConeCrusher",
		radius = 24,
		label = "Cone Crusher",
		mapPosition = {x = -2090, y = 10, z = -55},
	},
	mill = {
		partName = "MillBase",
		interactionType = "SlagBallMill",
		radius = 30,
		label = "Ball Mill",
		mapPosition = {x = -2050, y = 10, z = -40},
	},
	leach = {
		partName = "LeachPlatform",
		interactionType = "SlagLeachStation",
		radius = 42,
		label = "Leaching Station",
		mapPosition = {x = -1850, y = 10, z = 40},
	},
}

function StationAccess.WithinRange(playerPosition, stationPosition, radius)
	if type(playerPosition) ~= "table" or type(stationPosition) ~= "table" then
		return false
	end
	local maxDistance = tonumber(radius)
	if not finiteCoordinate(maxDistance) or maxDistance < 0 then return false end
	if not finiteCoordinate(playerPosition.x) or not finiteCoordinate(playerPosition.y)
		or not finiteCoordinate(playerPosition.z) or not finiteCoordinate(stationPosition.x)
		or not finiteCoordinate(stationPosition.y) or not finiteCoordinate(stationPosition.z) then
		return false
	end
	local dx = playerPosition.x - stationPosition.x
	local dy = playerPosition.y - stationPosition.y
	local dz = playerPosition.z - stationPosition.z
	return dx * dx + dy * dy + dz * dz <= maxDistance * maxDistance
end

return StationAccess
