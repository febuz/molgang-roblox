-- MOLGANG shared accelerated game clock.
-- One in-game day is ten real minutes across all economy and production systems.
local GameClock = {}

GameClock.DAY_SECONDS = 600

function GameClock.DayAt(timestamp, epoch)
	local now = timestamp or os.time()
	local start = epoch or 0
	return math.floor(math.max(0, now - start) / GameClock.DAY_SECONDS) + 1
end

return GameClock
