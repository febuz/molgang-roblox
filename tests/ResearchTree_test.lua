local ResearchTree = require("../game/src/ReplicatedStorage/Modules/ResearchTree")

local initial = {}
for _, node in ipairs(ResearchTree.Nodes) do
	if node.unlocked then initial[node.id] = true end
end

assert(initial.manual_crushing and initial.water_leaching, "free starting technologies must be known")
assert(ResearchTree.CanResearch("jaw_crusher_tech", initial), "jaw crusher should follow manual crushing")
assert(ResearchTree.CanResearch("acid_leaching", initial), "acid leaching should follow water-leaching progression")
assert(not ResearchTree.CanResearch("strong_acid_leaching", initial), "strong acid must require acid-leaching progression")
assert(ResearchTree.GetNode("ball_milling").researchTime == 1200, "research duration must be server-readable")
assert(ResearchTree.GetNode("jaw_crusher_tech").cost == 2000, "research cost must be server-readable")
assert(ResearchTree.CalculateResearchDuration(600, 1) == 600,
	"normal research duration must remain unchanged")
assert(ResearchTree.CalculateResearchDuration(600, 1.3) == 461,
	"research breakthrough must shorten project duration")
assert(ResearchTree.CalculateResearchDuration(600, 0) == 60000,
	"zero speed must be clamped safely")

initial.jaw_crusher_tech = true
assert(ResearchTree.CanResearch("acid_leaching", initial), "acid leaching should unlock after its prerequisite")
assert(not ResearchTree.CanResearch("jaw_crusher_tech", initial), "completed research must not be startable twice")

print("Research Tree Tests: 10 passed, 0 failed")
