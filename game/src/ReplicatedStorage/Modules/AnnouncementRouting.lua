-- AnnouncementRouting.lua
-- Separates visual notifications from ServerAnnounce transport payloads.
-- Quiz and mini-game messages share the event for low latency but are rendered
-- by their own modal; routing them into the global queue creates duplicate,
-- stacked overlays.

local AnnouncementRouting = {}

function AnnouncementRouting.IsVisual(data)
	if type(data) ~= "table" or type(data.message) ~= "string" or data.message == "" then
		return false
	end
	if type(data.quizData) == "table" or type(data.quizStart) == "table" or data.quizExpired then
		return false
	end
	if data.miniGamePrompt or data.miniGameScore then
		return false
	end
	return true
end

return AnnouncementRouting
