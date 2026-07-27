-- Shared chemistry quiz helpers.
-- Kept separate from the server session code so answer quality can be tested
-- without booting a Roblox server.

local QuizQuestionUtils = {}

-- Shared by dashboard quizzes and in-world quiz pillars. Keeping this list in
-- the pure helper makes subject routing testable without a Roblox server.
QuizQuestionUtils.ValidZones = {
	any = true,
	biome = true,
	hub = true,
	quantum = true,
	factory = true,
	chain = true,
	ank = true,
}

function QuizQuestionUtils.IsValidZone(zone)
	return type(zone) == "string" and QuizQuestionUtils.ValidZones[zone] == true
end

function QuizQuestionUtils.UniqueWrongAtomicNumbers(correctNumber, amount)
	local wrong = {}
	local seen = {[correctNumber] = true}
	local requested = math.max(0, math.floor(tonumber(amount) or 3))

	-- Prefer nearby atomic numbers: plausible distractors are more educational
	-- than arbitrary values, while the seen set prevents duplicate buttons.
	for delta = 1, 118 do
		for _, candidate in ipairs({correctNumber - delta, correctNumber + delta}) do
			if candidate >= 1 and candidate <= 118 and not seen[candidate] then
				seen[candidate] = true
				table.insert(wrong, tostring(candidate))
				if #wrong == requested then
					return wrong
				end
			end
		end
	end

	return wrong
end

return QuizQuestionUtils
