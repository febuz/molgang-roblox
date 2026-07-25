local DataMigration = require("../game/src/ReplicatedStorage/Modules/DataMigration")

local template = {
	carbonCredits = 0,
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

local copy = DataMigration.DeepCopy(template)
copy.facilities.mines = 99
assert(template.facilities.mines == 0, "deep copy must not alias template tables")

print("Data Migration Tests: 6 passed, 0 failed")
