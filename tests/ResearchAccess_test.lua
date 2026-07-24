local ResearchAccess = require("../game/src/ReplicatedStorage/Modules/ResearchAccess")

local initial = {unlocked = {manual_crushing = true, water_leaching = true}}
assert(ResearchAccess.CanUseReagent(initial, "H2O"), "water must be available from the start")
assert(not ResearchAccess.CanUseReagent(initial, "HCl"), "acid must require acid-leaching research")
assert(not ResearchAccess.CanUseReagent(initial, "H2SO4"), "strong acid must require safety research")
assert(not ResearchAccess.CanUseParticleSize(initial, "ground"), "machine grinding must require ball-mill research")

initial.unlocked.acid_leaching = true
assert(ResearchAccess.CanUseReagent(initial, "HCl"), "acid-leaching research must unlock HCl")
initial.unlocked.strong_acid_leaching = true
assert(not ResearchAccess.CanUseReagent(initial, "H2SO4"), "strong acid still needs fume extraction")
initial.unlocked.fume_extraction = true
assert(ResearchAccess.CanUseReagent(initial, "H2SO4"), "fume extraction must unlock safe strong-acid use")
initial.unlocked.ball_milling = true
assert(ResearchAccess.CanUseParticleSize(initial, "powder"), "ball-mill research must unlock fine powder")

print("Research Access Tests: 8 passed, 0 failed")
