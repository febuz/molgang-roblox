local DataMigration = require("../game/src/ReplicatedStorage/Modules/DataMigration")
local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(DataTemplate.mining.equipment.hand_pick == 1,
	"new players must receive a free hand pick for the first mining path")

local template = {
	carbonCredits = 0,
	onboarding = {completed = false, path = ""},
	facilities = {starterBenches = 0, mines = 0},
	productLedger = {totals = {revenue = 0, cogs = 0}},
}
local existing = {facilities = {mines = 2}, productLedger = {totals = {revenue = 10}}}
DataMigration.MergeDefaults(existing, template)
assert(existing.facilities.mines == 2, "migration must preserve existing nested values")
assert(existing.facilities.starterBenches == 0, "migration must add missing nested facility values")
assert(existing.productLedger.totals.revenue == 10, "migration must preserve nested totals")
assert(existing.productLedger.totals.cogs == 0, "migration must add missing nested totals")
assert(existing.carbonCredits == 0, "migration must add missing carbon-credit balance")
assert(existing.onboarding.completed == false and existing.onboarding.path == "",
	"migration must add the persistent onboarding state")

local corrupted = {
	facilities = "invalid",
	productLedger = {totals = {revenue = "invalid"}},
}
DataMigration.MergeDefaults(corrupted, template)
assert(type(corrupted.facilities) == "table" and corrupted.facilities.mines == 0,
	"migration must replace wrong-type nested records")
assert(type(corrupted.productLedger.totals.revenue) == "number"
	and corrupted.productLedger.totals.revenue == 0,
	"migration must replace wrong-type scalar fields")

local corruptOnboarding = {onboarding = "finished"}
DataMigration.MergeDefaults(corruptOnboarding, template)
assert(type(corruptOnboarding.onboarding) == "table"
	and corruptOnboarding.onboarding.completed == false,
	"migration must replace corrupt onboarding state")

local copy = DataMigration.DeepCopy(template)
copy.facilities.mines = 99
assert(template.facilities.mines == 0, "deep copy must not alias template tables")

print("Data Migration Tests: 9 passed, 0 failed")
