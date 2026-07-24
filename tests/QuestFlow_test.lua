local Quests = require("../game/src/ReplicatedStorage/Modules/Quests")

local progress = Quests.CreateQuestProgress()
local allowed, reason = Quests.CanAccept(progress, "first_atom")
assert(allowed and reason == "OK", "first quest must be acceptible for a new player")
assert(Quests.AcceptQuest(progress, "first_atom"), "server quest acceptance should activate the quest")
assert(not Quests.CanAccept(progress, "first_atom"), "an active quest must not be accepted twice")
assert(not Quests.CanAccept(progress, "collect_atoms"), "prerequisites must be enforced")
assert(Quests.CompleteQuest(progress, "first_atom"), "completed quest must move to completed state")
assert(Quests.CanAccept(progress, "collect_atoms"), "completed prerequisites must unlock the next quest")

progress.lastDaily.daily_collect = os.date("%Y-%m-%d")
assert(not Quests.CanAccept(progress, "daily_collect"), "daily quests must not repeat on the same day")

print("Quest Flow Tests: 7 passed, 0 failed")
