Color3 = {
	fromRGB = function(r, g, b)
		return {R = r / 255, G = g / 255, B = b / 255}
	end,
}
Vector3 = {
	new = function(x, y, z)
		return {X = x, Y = y, Z = z}
	end,
}

local MiningSystem = require("../game/src/ReplicatedStorage/Modules/MiningSystem")

local ids = {}
for _, plotType in ipairs(MiningSystem.PlotTypes) do
	assert(not ids[plotType.id], "mining plot type IDs must be unique: " .. plotType.id)
	ids[plotType.id] = true
end
local locations = {}
for _, location in ipairs(MiningSystem.PlotLocations) do
	local key = string.format("%s:%s:%s:%s", location.region, location.center.X, location.center.Y, location.center.Z)
	assert(not locations[key], "mining regions must not overlap at the same center: " .. key)
	locations[key] = true
end
assert(MiningSystem.PlotTypes[5].rarity == "legendary",
	"the fifth plot type must retain the legendary geology tier")

local surfaceRate = MiningSystem.CalculateMiningRate(MiningSystem.PlotTypes[1], {"hand_pick"})
assert(surfaceRate == surfaceRate and surfaceRate < math.huge and surfaceRate > 0,
	"surface mining rate must be finite and positive")
local deepRate = MiningSystem.CalculateMiningRate(MiningSystem.PlotTypes[4], {"hand_pick"})
assert(deepRate > 0 and deepRate < surfaceRate,
	"deep mining must be slower than a surface outcrop")

print("Mining System Tests: 5 passed, 0 failed")
