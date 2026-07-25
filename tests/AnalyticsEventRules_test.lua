local AnalyticsEventRules = require("../game/src/ReplicatedStorage/Modules/AnalyticsEventRules")

assert(AnalyticsEventRules.IsAllowedGuiName("MiningGui"),
	"known gameplay menus should be eligible for behavior analytics")
assert(AnalyticsEventRules.IsAllowedGuiName("AchievementsGui"),
	"achievement menu should be eligible for behavior analytics")
assert(not AnalyticsEventRules.IsAllowedGuiName("RequestBuildFacility"),
	"gameplay remotes must never be accepted as GUI analytics values")
assert(not AnalyticsEventRules.IsAllowedGuiName(42),
	"non-string analytics values must be rejected")

print("Analytics event rules tests: 4 passed, 0 failed")
