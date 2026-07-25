--[[
	Quests.lua
	MOLGANG Quest System

	Provides guided progression:
	- Starter quests (collect 10 atoms, build mine)
	- Intermediate quests (build factory, create molecule)
	- Advanced quests (earn 5K coins, craft 10 molecules)
	- Repeatable daily quests (collect 50 atoms, earn 1K coins)
]]

local Quests = {}

-- ═══════════════════════════════════════════════
-- QUEST DEFINITIONS
-- ═══════════════════════════════════════════════

Quests.AllQuests = {
	-- STARTER QUESTS
	first_atom = {
		id = "first_atom",
		name = "Your First Atom",
		description = "Walk near a glowing atom to collect it — start your chemistry journey!",
		category = "starter",
		reward = {molCoins = 100},
		condition = {type = "atomsCollected", target = 1},
		order = 0,
	},

	collect_atoms = {
		id = "collect_atoms",
		name = "Atom Collector",
		description = "Collect 10 atoms from around the world",
		category = "starter",
		reward = {molCoins = 200},
		condition = {type = "atomsCollected", target = 10},
		order = 1,
		requires = "first_atom",
	},

	first_molecule = {
		id = "first_molecule",
		name = "Build Your First Molecule",
		description = "Open the Recipe Book (R) and combine atoms into H2O, NaCl, or any molecule!",
		category = "starter",
		reward = {molCoins = 200},
		condition = {type = "moleculesBuilt", target = 1},
		order = 2,
		requires = "collect_atoms",
	},

	build_first_mine = {
		id = "build_first_mine",
		name = "Build Your First Mine",
		description = "Construct a mine to start production",
		category = "starter",
		reward = {molCoins = 300},
		condition = {type = "facilitiesBuilt", target = 1},
		order = 3,
		requires = "first_molecule",
	},

	collect_more_atoms = {
		id = "collect_more_atoms",
		name = "Expand Your Atom Collection",
		description = "Collect 50 atoms total",
		category = "starter",
		reward = {molCoins = 400},
		condition = {type = "atomsCollected", target = 50},
		order = 3,
		requires = "collect_atoms",
	},

	-- INTERMEDIATE QUESTS
	build_factory = {
		id = "build_factory",
		name = "Build a Factory",
		description = "Construct a factory to process atoms into molecules",
		category = "intermediate",
		reward = {molCoins = 500},
		condition = {type = "facilitiesBuilt", target = 2},
		order = 4,
		requires = "build_first_mine",
	},

	craft_molecule = {
		id = "craft_molecule",
		name = "Create Your First Molecule",
		description = "Combine atoms to craft a molecule",
		category = "intermediate",
		reward = {molCoins = 350, badge = "Alchemist"},
		condition = {type = "moleculesBuilt", target = 1},
		order = 5,
		requires = "build_factory",
	},

	craft_five_molecules = {
		id = "craft_five_molecules",
		name = "Molecular Mastery",
		description = "Craft 5 different molecules",
		category = "intermediate",
		reward = {molCoins = 750},
		condition = {type = "moleculesBuilt", target = 5},
		order = 6,
		requires = "craft_molecule",
	},

	-- ADVANCED QUESTS
	earn_wealth = {
		id = "earn_wealth",
		name = "Build Your Wealth",
		description = "Earn 5,000 MolCoins through trading and production",
		category = "advanced",
		reward = {molCoins = 1000},
		condition = {type = "molCoinsEarned", target = 5000},
		order = 7,
		requires = "craft_molecule",
	},

	build_three_facilities = {
		id = "build_three_facilities",
		name = "Industrial Complex",
		description = "Build 3 different facilities",
		category = "advanced",
		reward = {molCoins = 800},
		condition = {type = "distinctFacilitiesBuilt", target = 3},
		order = 8,
		requires = "build_factory",
	},

	-- DAILY QUESTS (repeatable)
	daily_collect = {
		id = "daily_collect",
		name = "Daily Gathering",
		description = "Collect 50 atoms today",
		category = "daily",
		reward = {molCoins = 300},
		condition = {type = "atomsCollected", target = 50, daily = true},
		order = 100,
		repeatable = true,
	},

	daily_earn = {
		id = "daily_earn",
		name = "Daily Profits",
		description = "Earn 1,000 MolCoins today",
		category = "daily",
		reward = {molCoins = 200},
		condition = {type = "molCoinsEarned", target = 1000, daily = true},
		order = 101,
		repeatable = true,
	},

	daily_craft = {
		id = "daily_craft",
		name = "Daily Creation",
		description = "Craft 3 molecules today",
		category = "daily",
		reward = {molCoins = 250},
		condition = {type = "moleculesBuilt", target = 3, daily = true},
		order = 102,
		repeatable = true,
	},
}

-- ═══════════════════════════════════════════════
-- QUEST TRACKING
-- ═══════════════════════════════════════════════

function Quests.CreateQuestProgress()
	return {
		active = {},        -- Currently active quests
		completed = {},     -- {questId = true}
		inProgress = {},    -- {questId = {progress}}
		lastDaily = {},     -- {questId = os.date("%Y-%m-%d")}
	}
end

-- Give a new player one concrete first objective without requiring them to
-- discover the quest modal first. Existing progress is never overwritten.
function Quests.EnsureStarterQuest(progress)
	if type(progress) ~= "table" then return false end
	progress.active = progress.active or {}
	progress.completed = progress.completed or {}
	progress.inProgress = progress.inProgress or {}
	if next(progress.active) ~= nil or next(progress.completed) ~= nil then return false end
	return Quests.AcceptQuest(progress, "first_atom")
end

function Quests.GetQuest(questId)
	return Quests.AllQuests[questId]
end

function Quests.GetQuestsByCategory(category)
	local quests = {}
	for _, quest in pairs(Quests.AllQuests) do
		if quest.category == category then
			table.insert(quests, quest)
		end
	end
	table.sort(quests, function(a, b)
		if a.order == b.order then return a.id < b.id end
		return a.order < b.order
	end)
	return quests
end

function Quests.GetActiveQuests(progress)
	local active = {}
	for questId in pairs(progress.active) do
		local quest = Quests.GetQuest(questId)
		if quest then
			table.insert(active, quest)
		end
	end
	table.sort(active, function(a, b) return a.order < b.order end)
	return active
end

function Quests.GetAvailableQuests(progress)
	local available = {}
	local active = progress.active or {}
	local completedSet = progress.completed or {}
	local lastDaily = progress.lastDaily or {}
	for questId, quest in pairs(Quests.AllQuests) do
		local completedToday = quest.repeatable
			and lastDaily[questId] == os.date("%Y-%m-%d")
		local completed = (not quest.repeatable and completedSet[questId]) or completedToday
		local missingPrerequisite = quest.requires and not completedSet[quest.requires]
		local alreadyActive = active[questId]
		if not completed and not missingPrerequisite and not alreadyActive then
			table.insert(available, quest)
		end
	end
	table.sort(available, function(a, b)
		if a.order == b.order then return a.id < b.id end
		return a.order < b.order
	end)
	return available
end

-- Continue the guided path when the player has no active quest. Daily quests
-- remain opt-in; only permanent progression is auto-activated.
function Quests.EnsureGuidedQuest(progress)
	if type(progress) ~= "table" then return false end
	progress.active = progress.active or {}
	progress.completed = progress.completed or {}
	if next(progress.active) ~= nil then return false end
	if next(progress.completed) == nil then
		return Quests.EnsureStarterQuest(progress)
	end
	for _, quest in ipairs(Quests.GetAvailableQuests(progress)) do
		if not quest.repeatable then
			return Quests.AcceptQuest(progress, quest.id)
		end
	end
	return false
end

function Quests.CanAccept(progress, questId)
	local quest = Quests.GetQuest(questId)
	if not quest or type(progress) ~= "table" then return false, "Unknown quest" end
	progress.active = progress.active or {}
	progress.completed = progress.completed or {}
	progress.lastDaily = progress.lastDaily or {}
	if progress.active[questId] then return false, "Quest already active" end
	if not quest.repeatable and progress.completed[questId] then return false, "Quest already completed" end
	if quest.repeatable and progress.lastDaily[questId] == os.date("%Y-%m-%d") then
		return false, "Daily quest already completed"
	end
	if quest.requires and not progress.completed[quest.requires] then
		return false, "Prerequisite quest incomplete"
	end
	return true, "OK"
end

function Quests.AcceptQuest(progress, questId)
	local quest = Quests.GetQuest(questId)
	local canAccept = Quests.CanAccept(progress, questId)
	if not canAccept then return false end

	progress.active[questId] = true
	progress.inProgress[questId] = {progress = 0, target = quest.condition.target}
	return true
end

function Quests.CompleteQuest(progress, questId)
	local quest = Quests.GetQuest(questId)
	if not quest then return false end

	progress.active[questId] = nil
	if quest.repeatable then
		progress.lastDaily[questId] = os.date("%Y-%m-%d")
	else
		progress.completed[questId] = true
	end
	return true
end

function Quests.CheckProgress(playerData, quest)
	if not quest or not quest.condition then return 0 end

	local condType = quest.condition.type
	local target = quest.condition.target
	local dailyStats = playerData.dailyStats or {}
	local isToday = dailyStats.date == os.date("%Y-%m-%d")
	if quest.condition.daily and not isToday then return 0 end

	if condType == "atomsCollected" then
		if quest.condition.daily then
			return math.min(dailyStats.atomsCollected or 0, target)
		end
		local inventoryCount = 0
		if playerData.atoms then
			for _, c in pairs(playerData.atoms) do inventoryCount = inventoryCount + c end
		end
		-- Lifetime quests must remain complete after atoms are consumed. Use
		-- inventory only as a fallback for legacy data without the lifetime
		-- counter.
		local count = math.max(tonumber(playerData.totalAtomsCollected) or 0, inventoryCount)
		return math.min(count, target)

	elseif condType == "facilitiesBuilt" then
		local count = 0
		if playerData.facilities then
			count = (playerData.facilities.mines or 0) +
					(playerData.facilities.factories or 0) +
					(playerData.facilities.researchLabs or 0) +
					(playerData.facilities.offices or 0)
		end
		return math.min(count, target)

	elseif condType == "distinctFacilitiesBuilt" then
		local count = 0
		if playerData.facilities then
			for _, key in ipairs({"starterBenches", "mines", "factories", "researchLabs", "offices"}) do
				if (tonumber(playerData.facilities[key]) or 0) > 0 then count = count + 1 end
			end
		end
		return math.min(count, target)

	elseif condType == "moleculesBuilt" then
		if quest.condition.daily then
			return math.min(dailyStats.moleculesBuilt or 0, target)
		end
		return math.min(playerData.totalMoleculesBuilt or 0, target)

	elseif condType == "molCoinsEarned" then
		if quest.condition.daily then
			return math.min(dailyStats.molCoinsEarned or 0, target)
		end
		return math.min(playerData.totalMolCoinsEarned or 0, target)
	end

	return 0
end

function Quests.IsQuestComplete(playerData, quest)
	return Quests.CheckProgress(playerData, quest) >= quest.condition.target
end

return Quests
