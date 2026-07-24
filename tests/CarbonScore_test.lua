Color3 = {
	fromRGB = function(r, g, b)
		return {R = r / 255, G = g / 255, B = b / 255}
	end,
}

local CarbonScore = require("../game/src/ReplicatedStorage/Modules/CarbonScore")
local score = CarbonScore.CalculateScore({factory_rent = 1, equipment_power = 100})
assert(score == 310, "factory carbon score must include rent and power")
local rating = CarbonScore.GetRating(score)
assert(rating == "Heavy Industry", "factory score must resolve to the correct rating")
assert(CarbonScore.CalculateScore({manual_mining = 10}) == 0,
	"zero-emission activity must not increase carbon score")
print("Carbon Score Tests: 3 passed, 0 failed")
