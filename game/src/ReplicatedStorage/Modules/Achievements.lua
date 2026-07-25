--[[
	Achievements.lua
	MOLGANG Achievement & Progress System

	Tracks player accomplishments:
	- Collection milestones (10 atoms, 50 atoms, etc.)
	- Facility building (first mine, 5 facilities, etc.)
	- Molecule crafting (first molecule, 10 molecules, etc.)
	- Wealth milestones (1K MolCoins, 10K, etc.)
	- Special achievements (collect all 118 elements, etc.)
]]

local Achievements = {}

-- ═══════════════════════════════════════════════
-- ACHIEVEMENT DEFINITIONS
-- ═══════════════════════════════════════════════

Achievements.List = {
	-- Collection achievements
	FirstAtom = {
		id = "first_atom",
		name = "Atom Collector",
		description = "Collect your first atom",
		icon = "⚛️",
		reward = {molCoins = 50},
		tracker = {type = "atomsCollected", target = 1},
	},
	TenAtoms = {
		id = "ten_atoms",
		name = "Budding Chemist",
		description = "Collect 10 atoms",
		icon = "🧪",
		reward = {molCoins = 100},
		tracker = {type = "atomsCollected", target = 10},
	},
	FiftyAtoms = {
		id = "fifty_atoms",
		name = "Element Hunter",
		description = "Collect 50 atoms",
		icon = "🔍",
		reward = {molCoins = 250},
		tracker = {type = "atomsCollected", target = 50},
	},
	HundredAtoms = {
		id = "hundred_atoms",
		name = "Atomic Master",
		description = "Collect 100 atoms",
		icon = "💎",
		reward = {molCoins = 500, badge = "AtomicMaster"},
		tracker = {type = "atomsCollected", target = 100},
	},

	-- Building achievements
	FirstMine = {
		id = "first_mine",
		name = "Entrepreneur",
		description = "Build your first mine",
		icon = "⛏️",
		reward = {molCoins = 100},
		tracker = {type = "facilitiesBuilt", target = 1},
	},
	FacilityMaster = {
		id = "facility_master",
		name = "Industrial Tycoon",
		description = "Build 10 facilities",
		icon = "🏭",
		reward = {molCoins = 750, badge = "TycoonBadge"},
		tracker = {type = "facilitiesBuilt", target = 10},
	},

	-- Molecule crafting achievements
	FirstMolecule = {
		id = "first_molecule",
		name = "Chemist",
		description = "Create your first molecule",
		icon = "⚗️",
		reward = {molCoins = 200},
		tracker = {type = "moleculesBuilt", target = 1},
	},
	TenMolecules = {
		id = "ten_molecules",
		name = "Molecular Biologist",
		description = "Create 10 molecules",
		icon = "🧬",
		reward = {molCoins = 500},
		tracker = {type = "moleculesBuilt", target = 10},
	},
	FiftyMolecules = {
		id = "fifty_molecules",
		name = "Synthesis Master",
		description = "Create 50 molecules",
		icon = "🔬",
		reward = {molCoins = 2000, badge = "SynthesisMaster"},
		tracker = {type = "moleculesBuilt", target = 50},
	},

	-- Wealth achievements
	RichStart = {
		id = "rich_start",
		name = "Entrepreneur",
		description = "Earn 1,000 MolCoins",
		icon = "💰",
		reward = {molCoins = 100},
		tracker = {type = "molCoinsEarned", target = 1000},
	},
	WealthyMerchant = {
		id = "wealthy_merchant",
		name = "Wealthy Merchant",
		description = "Earn 10,000 MolCoins",
		icon = "💸",
		reward = {molCoins = 1000, badge = "WealthyMerchant"},
		tracker = {type = "molCoinsEarned", target = 10000},
	},
	MolCoinsMillionaire = {
		id = "molcoins_millionaire",
		name = "Millionaire",
		description = "Earn 100,000 MolCoins",
		icon = "🤑",
		reward = {molCoins = 5000, badge = "Millionaire"},
		tracker = {type = "molCoinsEarned", target = 100000},
	},

	-- Special achievements
	AllElements = {
		id = "all_elements",
		name = "Periodic Master",
		description = "Collect all 118 elements",
		icon = "🌟",
		reward = {molCoins = 10000, badge = "PeriodicMaster"},
		tracker = {type = "elementsCollected", target = 118},
	},
	FirstLoan = {
		id = "first_loan",
		name = "Borrower",
		description = "Take your first loan from ANK",
		icon = "🏦",
		reward = {molCoins = 50},
		tracker = {type = "loansReceived", target = 1},
	},
	MahjongWinner = {
		id = "mahjong_winner",
		name = "Mahjong Champ",
		description = "Win your first Mahjong game",
		icon = "🎰",
		reward = {molCoins = 200, badge = "MahjongChamp"},
		tracker = {type = "mahjongWins", target = 1},
	},
}

-- ═══════════════════════════════════════════════
-- ACHIEVEMENT TRACKING
-- ═══════════════════════════════════════════════

function Achievements.CheckProgress(playerData, achievement)
	if not playerData or not achievement.tracker then return 0 end

	local trackerType = achievement.tracker.type
	local target = achievement.tracker.target

	if trackerType == "atomsCollected" then
		local inventoryCount = 0
		if playerData.atoms then
			for _, c in pairs(playerData.atoms) do inventoryCount = inventoryCount + c end
		end
		-- Permanent achievements must not regress when atoms are consumed in
		-- molecules. Keep the inventory count as a migration fallback for old
		-- saves that predate totalAtomsCollected.
		local count = math.max(tonumber(playerData.totalAtomsCollected) or 0, inventoryCount)
		return math.min(count, target)

	elseif trackerType == "facilitiesBuilt" then
		local count = 0
		if playerData.facilities then
			count = (playerData.facilities.mines or 0) +
					(playerData.facilities.factories or 0) +
					(playerData.facilities.researchLabs or 0) +
					(playerData.facilities.offices or 0)
		end
		return math.min(count, target)

	elseif trackerType == "moleculesBuilt" then
		return math.min(playerData.totalMoleculesBuilt or 0, target)

	elseif trackerType == "molCoinsEarned" then
		return math.min(playerData.totalMolCoinsEarned or 0, target)

	elseif trackerType == "elementsCollected" then
		local count = 0
		if playerData.elementsFound then
			for _ in pairs(playerData.elementsFound) do
				count = count + 1
			end
		end
		return math.min(count, target)

	elseif trackerType == "loansReceived" then
		return math.min(#(playerData.ankLoans or {}), target)

	elseif trackerType == "mahjongWins" then
		return math.min(playerData.mahjongWins or 0, target)
	end

	return 0
end

function Achievements.IsUnlocked(playerData, achievement)
	local progress = Achievements.CheckProgress(playerData, achievement)
	return progress >= achievement.tracker.target
end

function Achievements.GetProgressBar(playerData, achievement)
	local current = Achievements.CheckProgress(playerData, achievement)
	local target = achievement.tracker.target
	return {current = current, target = target, percent = math.floor((current / target) * 100)}
end

function Achievements.GetAllUnlocked(playerData)
	local unlocked = {}
	for _, achievement in pairs(Achievements.List) do
		if Achievements.IsUnlocked(playerData, achievement) then
			table.insert(unlocked, achievement)
		end
	end
	return unlocked
end

function Achievements.GetNextAchievements(playerData, limit)
	local next = {}
	for _, achievement in pairs(Achievements.List) do
		if not Achievements.IsUnlocked(playerData, achievement) then
			table.insert(next, {
				achievement = achievement,
				progress = Achievements.GetProgressBar(playerData, achievement),
			})
		end
	end
	-- Sort by progress (closest to unlocking first)
	table.sort(next, function(a, b)
		return a.progress.percent > b.progress.percent
	end)
	-- Return top N
	local result = {}
	for i = 1, math.min(limit, #next) do
		table.insert(result, next[i])
	end
	return result
end

return Achievements
