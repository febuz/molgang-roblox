--[[
	Achievements.lua — Bubble Tea Bar purchase-count achievement badges
	(molgang-roblox#9 / backlog GP215).

	Deliberately dependency-free (no `require`, no Color3) so the real
	threshold-crossing logic is directly loadable and testable by `lune`,
	unlike SeasonalDrinks.lua which needs the project's Rojo instance-tree
	`require(script.Parent.X)` convention. The badge data still follows the
	same archetype shape as ObjectRegistry archetypes (id/name/description +
	a Requirement-style threshold + a Reward) — just a plain table, since
	3 flat tiers don't need `inherits` composition.
]]

local Achievements = {}

-- Ordered ascending by threshold — CheckNewlyUnlocked relies on this order.
Achievements.BADGES = {
	{ id = "firstTaste", name = "First Taste", description = "Buy your first drink at the Bubble Tea Bar", threshold = 1, molCoinsReward = 10 },
	{ id = "cafeEnthusiast", name = "Café Enthusiast", description = "Buy 10 drinks at the Bubble Tea Bar", threshold = 10, molCoinsReward = 50 },
	{ id = "bubbleTeaAddict", name = "Bubble Tea Addict", description = "Buy 50 drinks at the Bubble Tea Bar", threshold = 50, molCoinsReward = 200 },
}

-- Pure: given a purchase-count transition (previousCount -> newCount), which
-- badges just crossed their threshold? Returns every badge whose threshold
-- falls in (previousCount, newCount] — not just the nearest one — so a
-- count jump bigger than 1 (e.g. a future batch grant) still awards every
-- tier it passed through instead of silently skipping one.
function Achievements.CheckNewlyUnlocked(previousCount, newCount)
	assert(type(previousCount) == "number" and previousCount >= 0, "previousCount must be a non-negative number")
	assert(type(newCount) == "number" and newCount >= previousCount, "newCount must be >= previousCount")

	local unlocked = {}
	for _, badge in ipairs(Achievements.BADGES) do
		if badge.threshold > previousCount and badge.threshold <= newCount then
			table.insert(unlocked, badge)
		end
	end
	return unlocked
end

function Achievements.GetBadge(id)
	for _, badge in ipairs(Achievements.BADGES) do
		if badge.id == id then
			return badge
		end
	end
	return nil
end

return Achievements
