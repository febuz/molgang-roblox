local Tutorial = require("../game/src/ReplicatedStorage/Modules/Tutorial")

assert(not Tutorial.IsStepSatisfied({condition = "collect_atom"}, 0),
	"the first atom step must remain visible before collection")
assert(Tutorial.IsStepSatisfied({condition = "collect_atom"}, 1),
	"the first atom step should complete after one collected atom")
assert(not Tutorial.IsStepSatisfied({condition = "collect_atoms", target = 3}, 2),
	"a multi-atom step must wait for its target")
assert(Tutorial.IsStepSatisfied({condition = "collect_atoms", target = 3}, 3),
	"a multi-atom step should complete at its target")
assert(not Tutorial.IsStepSatisfied({condition = "press_key", key = "P"}, 99),
	"key steps are completed by input, not by atom count")

print("Tutorial route tests: 5 passed, 0 failed")
