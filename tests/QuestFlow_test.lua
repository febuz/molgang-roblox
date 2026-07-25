local Quests = require("../game/src/ReplicatedStorage/Modules/Quests")
local Achievements = require("../game/src/ReplicatedStorage/Modules/Achievements")

local progress = Quests.CreateQuestProgress()
assert(Quests.EnsureStarterQuest(progress), "new players should receive a first objective")
assert(Quests.GetActiveQuests(progress)[1].id == "first_atom",
	"the first objective should be the atom collection quest")
local allowed, reason = Quests.CanAccept(progress, "first_atom")
assert(not allowed and reason == "Quest already active", "the starter quest must not be duplicated")
assert(not Quests.EnsureStarterQuest(progress), "existing progress must not be overwritten")
assert(not Quests.CanAccept(progress, "collect_atoms"), "prerequisites must be enforced")
assert(Quests.CompleteQuest(progress, "first_atom"), "completed quest must move to completed state")
assert(not Quests.EnsureStarterQuest(progress), "completed progress must not restart the starter quest")
assert(Quests.CanAccept(progress, "collect_atoms"), "completed prerequisites must unlock the next quest")
assert(Quests.EnsureGuidedQuest(progress), "completed starter quest should advance the guided path")
assert(Quests.GetActiveQuests(progress)[1].id == "collect_atoms",
	"guided path should activate the next collection objective")
assert(not Quests.EnsureGuidedQuest(progress), "guided path must not duplicate an active quest")

progress.lastDaily.daily_collect = os.date("%Y-%m-%d")
assert(not Quests.CanAccept(progress, "daily_collect"), "daily quests must not repeat on the same day")

local consumedAtoms = {totalAtomsCollected = 10, atoms = {H = 1}}
local atomQuest = Quests.GetQuest("collect_atoms")
assert(Quests.CheckProgress(consumedAtoms, atomQuest) == 10,
	"lifetime quest progress must survive consumed atoms")
local atomAchievement = Achievements.List.TenAtoms
assert(Achievements.CheckProgress(consumedAtoms, atomAchievement) == 10,
	"lifetime achievement progress must survive consumed atoms")

print("Quest Flow Tests: 15 passed, 0 failed")
