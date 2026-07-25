local LoginStreak = require("../game/src/ReplicatedStorage/Modules/LoginStreak")

local streak, date = LoginStreak.Update(0, "", "2026-07-25")
assert(streak == 1 and date == "2026-07-25", "first login must start a streak")

streak, date = LoginStreak.Update(4, "2026-07-24", "2026-07-25")
assert(streak == 5 and date == "2026-07-25", "consecutive login must increase streak")

streak = LoginStreak.Update(5, "2026-07-25", "2026-07-25")
assert(streak == 5, "same-day reconnect must not increase streak")

streak = LoginStreak.Update(30, "2026-07-20", "2026-07-25")
assert(streak == 1, "a missed day must reset the streak")
assert(LoginStreak.DaysBetween("2024-02-28", "2024-03-01") == 2,
	"date arithmetic must handle leap years")

print("Login Streak Tests: 5 passed, 0 failed")
