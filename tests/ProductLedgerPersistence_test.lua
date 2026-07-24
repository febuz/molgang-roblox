local DataTemplate = require("../game/src/ReplicatedStorage/Data/DataTemplate")

assert(type(DataTemplate.productLedger) == "table", "player template must include product ledger")
assert(type(DataTemplate.productLedger.entries) == "table", "product ledger entries must be persisted")
assert(type(DataTemplate.productLedger.totals) == "table", "product ledger totals must be persisted")
assert(DataTemplate.productLedger.totals.revenue == 0, "new players must start with zero product revenue")

print("Product Ledger Persistence Tests: 4 passed, 0 failed")
