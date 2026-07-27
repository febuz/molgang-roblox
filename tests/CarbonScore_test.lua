local CarbonScore = require("../game/src/ReplicatedStorage/Modules/CarbonScore")

assert(CarbonScore.CalculateCreditReward(10, 1, false) == 0,
	"empty rentals must not earn credits")
assert(CarbonScore.CalculateCreditReward(10, 1, true) == 50,
	"green operating factory must earn base credits")
assert(CarbonScore.CalculateCreditReward(200, 3, true) == 30,
	"event multiplier must increase industrial credit yield")
assert(CarbonScore.CalculateCreditReward(600, 3, true) == 0,
	"carbon-intensive operations must not earn credits")
assert(CarbonScore.CalculateScore({factory_rent = 1, equipment_power = 50, water_reuse = 1}) == 157,
	"water reuse must reduce the factory carbon score")
print("CarbonScore tests: 5 passed")
