-- Pure spawn/void recovery policy. Kept separate so the startup race can be
-- tested without booting Roblox physics or a generated world.
local SpawnSafety = {}

local function isFiniteNumber(value)
	return type(value) == "number" and value == value and value > -math.huge and value < math.huge
end

function SpawnSafety.ShouldRecover(y, killY, spawnAvailable)
	return spawnAvailable == true
		and isFiniteNumber(y)
		and isFiniteNumber(killY)
		and y < killY
end

return SpawnSafety
