-- StationAccess.lua
-- Pure spatial rule shared by server validation and tests.

local StationAccess = {}

function StationAccess.WithinRange(playerPosition, stationPosition, radius)
	if type(playerPosition) ~= "table" or type(stationPosition) ~= "table" then
		return false
	end
	local maxDistance = tonumber(radius)
	if not maxDistance or maxDistance < 0 then return false end
	local dx = (tonumber(playerPosition.x) or 0) - (tonumber(stationPosition.x) or 0)
	local dy = (tonumber(playerPosition.y) or 0) - (tonumber(stationPosition.y) or 0)
	local dz = (tonumber(playerPosition.z) or 0) - (tonumber(stationPosition.z) or 0)
	return dx * dx + dy * dy + dz * dz <= maxDistance * maxDistance
end

return StationAccess
