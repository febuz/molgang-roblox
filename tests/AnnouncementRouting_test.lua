local AnnouncementRouting = require("../game/src/ReplicatedStorage/Modules/AnnouncementRouting")

assert(AnnouncementRouting.IsVisual({message = "Walk to the station"}),
	"ordinary server feedback must use the global notification queue")
assert(not AnnouncementRouting.IsVisual({quizData = {question = "pH?"}, message = "Question"}),
	"quiz transport must not create a second notification overlay")
assert(not AnnouncementRouting.IsVisual({miniGamePrompt = true, message = "Start"}),
	"mini-game prompt must stay in its modal")
assert(not AnnouncementRouting.IsVisual({message = ""}),
	"empty messages must not create an overlay")

print("Announcement Routing Tests: 4 passed, 0 failed")
