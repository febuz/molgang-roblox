--[[
	PrestigeSystem.lua
	MOLGANG — Prestige / New Game+ System (#87)

	After completing the research tree and all quests, players can
	"prestige" — resetting progress but keeping permanent bonuses.
]]

local PrestigeSystem = {}

PrestigeSystem.Tiers = {
	{tier = 1, name = "Chemical Apprentice", requirement = {questsCompleted = 5},
		bonus = {coinMultiplier = 1.1, unlocks = {"lab_coat"}}},
	{tier = 2, name = "Process Engineer", requirement = {questsCompleted = 10, researchNodes = 10},
		bonus = {coinMultiplier = 1.25, unlocks = {"hard_hat", "speed_boost"}}},
	{tier = 3, name = "Plant Manager", requirement = {questsCompleted = 15, researchNodes = 20},
		bonus = {coinMultiplier = 1.5, unlocks = {"hazmat_suit", "double_yield"}}},
	{tier = 4, name = "Chief Metallurgist", requirement = {allQuestsComplete = true, allResearch = true},
		bonus = {coinMultiplier = 2.0, unlocks = {"gold_lab_coat", "auto_collect"}}},
	{tier = 5, name = "Chemical Engineering Master", requirement = {allQuestsComplete = true, allResearch = true, prestigeCount = 1},
		bonus = {coinMultiplier = 3.0, unlocks = {"platinum_badge", "instant_leach"}}},
}

function PrestigeSystem.CanPrestige(playerData)
	local quests = 0
	if playerData.completedQuests then
		for _ in pairs(playerData.completedQuests) do quests = quests + 1 end
	end
	-- Minimum: complete 10 quests and have 5000+ MC
	return quests >= 10 and (playerData.molCoins or 0) >= 5000
end

function PrestigeSystem.GetCurrentTier(playerData)
	local pCount = playerData.prestigeCount or 0
	for i = #PrestigeSystem.Tiers, 1, -1 do
		local tier = PrestigeSystem.Tiers[i]
		if pCount >= (tier.requirement.prestigeCount or 0) then
			return tier
		end
	end
	return PrestigeSystem.Tiers[1]
end

function PrestigeSystem.GetPrestigeRewards(currentPrestige)
	local tier = math.min(currentPrestige + 1, #PrestigeSystem.Tiers)
	return PrestigeSystem.Tiers[tier]
end

-- Returns what gets reset vs kept
function PrestigeSystem.GetResetInfo()
	return {
		reset = {
			"MolCoins (start with 500 × prestige tier)",
			"Atoms and molecules",
			"Facilities",
			"Mining plots",
			"Factory equipment",
		},
		keep = {
			"Prestige tier and permanent bonuses",
			"Unlocked cosmetics",
			"Achievement badges",
			"Certificates/diplomas",
			"Coin multiplier (stacks with each prestige)",
		},
	}
end

return PrestigeSystem
