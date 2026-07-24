--[[
	MiningMilestones.lua — atom-collection count milestones.

	Dependency-free pure module (no require, no Color3), same shape as
	Achievements.lua, so it loads directly under `lune` and its real
	threshold-crossing logic runs on every test invocation. Wired into
	AtomSpawner.server.lua's collect handler — atom collection is the
	single most frequent player action in this game, so unlike the
	seasonal drinks these milestones are exercised constantly, not
	gated behind a specific calendar month.
]]

local MiningMilestones = {}

-- Ordered ascending by threshold — CheckNewlyUnlocked relies on this order.
MiningMilestones.MILESTONES = {
	{ id = "elementHunter", name = "Element Hunter", description = "Collect 10 atoms", threshold = 10, molCoinsReward = 15 },
	{ id = "atomicCollector", name = "Atomic Collector", description = "Collect 100 atoms", threshold = 100, molCoinsReward = 75 },
	{ id = "periodicTableMaster", name = "Periodic Table Master", description = "Collect 500 atoms", threshold = 500, molCoinsReward = 300 },
}

-- Pure: given an atom-collected-count transition (previousCount ->
-- newCount), which milestones just crossed their threshold? Returns every
-- milestone whose threshold falls in (previousCount, newCount], not just
-- the nearest one, so a count jump bigger than 1 still awards every tier
-- it passed through.
function MiningMilestones.CheckNewlyUnlocked(previousCount, newCount)
	assert(type(previousCount) == "number" and previousCount >= 0, "previousCount must be a non-negative number")
	assert(type(newCount) == "number" and newCount >= previousCount, "newCount must be >= previousCount")

	local unlocked = {}
	for _, milestone in ipairs(MiningMilestones.MILESTONES) do
		if milestone.threshold > previousCount and milestone.threshold <= newCount then
			table.insert(unlocked, milestone)
		end
	end
	return unlocked
end

function MiningMilestones.GetMilestone(id)
	for _, milestone in ipairs(MiningMilestones.MILESTONES) do
		if milestone.id == id then
			return milestone
		end
	end
	return nil
end

return MiningMilestones
