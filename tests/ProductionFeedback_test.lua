local ProductionFeedback = require("../game/src/ReplicatedStorage/Modules/ProductionFeedback")

assert(ProductionFeedback.GetBlockedReason(false, false) == nil,
	"unblocked production must not emit a warning")
assert(ProductionFeedback.GetBlockedReason(true, false) == "atom storage is full.",
	"full atom storage must have an actionable reason")
assert(ProductionFeedback.GetBlockedReason(false, true) == "factory has no compatible feedstock/recipe.",
	"blocked factory must explain missing feedstock or recipe")
assert(ProductionFeedback.GetBlockedReason(true, true) ==
		"atom storage is full; factory has no compatible feedstock/recipe.",
	"multiple production blockers must be deterministic")

print("Production feedback tests: 4 passed")
