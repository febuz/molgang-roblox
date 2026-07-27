-- Quiz distractors must be unique, bounded, and close enough to teach.
local QuizQuestionUtils = require("../game/src/ReplicatedStorage/Modules/QuizQuestionUtils")

local function assertUniqueOptions(correct, wrong)
	local seen = {[correct] = true}
	for _, option in ipairs(wrong) do
		assert(not seen[option], "quiz options must not contain duplicates")
		seen[option] = true
		local value = tonumber(option)
		assert(value and value >= 1 and value <= 118, "atomic number distractor must be bounded")
	end
	assert(#wrong == 3, "quiz must provide exactly three distractors")
end

local low = QuizQuestionUtils.UniqueWrongAtomicNumbers(1, 3)
assertUniqueOptions("1", low)
assert(low[1] == "2", "Z=1 should start with the nearest valid atomic number")

local middle = QuizQuestionUtils.UniqueWrongAtomicNumbers(2, 3)
assertUniqueOptions("2", middle)

local high = QuizQuestionUtils.UniqueWrongAtomicNumbers(118, 3)
assertUniqueOptions("118", high)
assert(high[1] == "117", "Z=118 should stay within the periodic table")

for _, zone in ipairs({"any", "biome", "hub", "quantum", "factory", "chain", "ank"}) do
	assert(QuizQuestionUtils.IsValidZone(zone), "quiz pillar zone must be accepted: " .. zone)
end
assert(not QuizQuestionUtils.IsValidZone("forged_zone"), "unknown quiz zone must be rejected")
assert(not QuizQuestionUtils.IsValidZone(nil), "non-string quiz zone must be rejected")

print("Quiz Question Utils Tests: 6 passed, 0 failed")
