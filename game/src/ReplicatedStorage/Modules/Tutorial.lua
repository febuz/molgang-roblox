--[[
	Tutorial.lua
	MOLGANG Tutorial/Onboarding System

	Step-by-step guide for new players:
	1. Welcome to MOLGANG
	2. Build your first mine
	3. Collect atoms from market
	4. Build a factory
	5. Create a molecule
	6. Explore the map
]]

local Tutorial = {}

-- Shared route-step predicate. Keeping this outside the GUI makes the first
-- run contract testable and prevents a collect step from being auto-skipped
-- just because the step was rendered.
function Tutorial.IsStepSatisfied(step, atomsCollected)
	if type(step) ~= "table" then return false end
	local condition = step.condition
	local count = math.max(0, tonumber(atomsCollected) or 0)
	if condition == "collect_atom" then return count >= 1 end
	if condition == "collect_atoms" then return count >= (tonumber(step.target) or 1) end
	return false
end

-- ═══════════════════════════════════════════════
-- TUTORIAL STEPS
-- ═══════════════════════════════════════════════

Tutorial.Steps = {
	{
		id = 1,
		title = "Welcome to MOLGANG!",
		description = "You've entered a world of chemistry, trading, and entrepreneurship.",
		action = "Read message",
		reward = {molCoins = 50},
	},
	{
		id = 2,
		title = "Build Your First Mine",
		description = "Go to the Build tab (D) and purchase a Mine. It will collect atoms automatically.",
		action = "Build a Mine",
		reward = {molCoins = 100},
	},
	{
		id = 3,
		title = "Collect Resources from Market",
		description = "Visit the Trade tab to buy Iron, Copper, or other metals on the global market.",
		action = "Buy 1 commodity",
		reward = {molCoins = 50},
	},
	{
		id = 4,
		title = "Build a Factory",
		description = "Your mine produces atoms. Now build a Factory to convert atoms into molecules.",
		action = "Build a Factory",
		reward = {molCoins = 100},
	},
	{
		id = 5,
		title = "Create Your First Molecule",
		description = "With atoms in inventory, you can combine them into molecules (H2O, CO2, etc.)",
		action = "Build 1 molecule",
		reward = {molCoins = 150, badge = "FirstMolecule"},
	},
	{
		id = 6,
		title = "Explore Leaderboards",
		description = "Press L to see where you rank! Compete with other players globally.",
		action = "View leaderboards",
		reward = {molCoins = 50},
	},
	{
		id = 7,
		title = "Play Mahjong",
		description = "Take a break and play Mahjong against AI opponents. Great for earning bonus coins!",
		action = "Play 1 game",
		reward = {molCoins = 75},
	},
	{
		id = 8,
		title = "Get a Loan (Optional)",
		description = "If you need more cash, visit ANK Cooperative in Research tab to borrow MolCoins.",
		action = "Take a loan",
		reward = {molCoins = 0},  -- No reward, loan is the benefit
	},
}

-- ═══════════════════════════════════════════════
-- TUTORIAL PROGRESS
-- ═══════════════════════════════════════════════

function Tutorial.CreateProgress()
	return {
		currentStep = 1,
		completedSteps = {},
		totalRewards = 0,
		tutorialComplete = false,
	}
end

function Tutorial.GetStep(stepId)
	for _, step in ipairs(Tutorial.Steps) do
		if step.id == stepId then
			return step
		end
	end
	return nil
end

function Tutorial.CompleteStep(progress, stepId)
	local step = Tutorial.GetStep(stepId)
	if not step then return false end

	progress.completedSteps[stepId] = true
	if step.reward and step.reward.molCoins then
		progress.totalRewards = progress.totalRewards + step.reward.molCoins
	end

	-- Move to next step
	if stepId == #Tutorial.Steps then
		progress.tutorialComplete = true
		progress.currentStep = #Tutorial.Steps + 1
	else
		progress.currentStep = stepId + 1
	end

	return true
end

function Tutorial.GetProgressPercentage(progress)
	local completed = 0
	for _ in pairs(progress.completedSteps) do
		completed = completed + 1
	end
	return math.floor((completed / #Tutorial.Steps) * 100)
end

function Tutorial.IsComplete(progress)
	return progress.tutorialComplete
end

return Tutorial
