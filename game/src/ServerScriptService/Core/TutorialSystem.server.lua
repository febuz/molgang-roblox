--[[
	TutorialSystem.server.lua
	MOLGANG Player Onboarding

	Guides new players through core mechanics:
	1. Collect atoms (walk around, proximity detection)
	2. Build molecules (select atoms, click BUILD)
	3. Register on MolChain (confirmation popup)
	4. Build facilities (click D, place mines/factories)
	5. Market trading (view prices, practice trade)

	Triggered automatically on first spawn
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- TUTORIAL STEPS
-- ══════════════════════════════════════════════

local TUTORIAL_STEPS = {
	{
		id = "step_1_collect",
		trigger = "onSpawn",
		message = "👋 Welcome, Chemist! Walk around to find atoms (yellow glowing balls). Get within 12 studs to auto-collect!",
		hotkey = "None",
		target = 5,  -- atoms to collect
		type = "atomsCollected",
	},
	{
		id = "step_2_inventory",
		trigger = "onProgress",
		message = "✓ Nice! Your inventory now has atoms. Press I to view them and select atoms for building.",
		hotkey = "I",
		target = 0,
		type = "none",
	},
	{
		id = "step_3_build_molecule",
		trigger = "onProgress",
		message = "🧪 Now build your first molecule! Click atoms in inventory to select them, then click the BUILD button.",
		hotkey = "None",
		target = 1,
		type = "moleculesBuilt",
	},
	{
		id = "step_4_chain_register",
		trigger = "onProgress",
		message = "⛓️ Great! Your molecule is registered on MolChain. Each molecule = 1 blockchain entry. You earned MolCoins!",
		hotkey = "None",
		target = 0,
		type = "none",
	},
	{
		id = "step_5_facilities",
		trigger = "onProgress",
		message = "🏭 Ready to automate? Press D to build facilities. Start with a MINE to auto-produce atoms!",
		hotkey = "D",
		target = 0,
		type = "none",
	},
	{
		id = "step_6_market",
		trigger = "onProgress",
		message = "📈 Now open the MARKET (Press M) to see live commodity prices. You can buy/sell atoms and molecules!",
		hotkey = "M",
		target = 0,
		type = "none",
	},
}

-- ══════════════════════════════════════════════
-- PLAYER DATA (shared with EconomyManager)
-- ══════════════════════════════════════════════

local playerData = {}
local playerTutorialState = {}  -- {userId = {currentStep=1, completed=false}}

-- ══════════════════════════════════════════════
-- TUTORIAL PROGRESSION
-- ══════════════════════════════════════════════

local function getTutorialProgress(userId)
	if not playerTutorialState[userId] then
		playerTutorialState[userId] = {
			currentStep = 1,
			completed = false,
			startTime = os.time(),
		}
	end
	return playerTutorialState[userId]
end

local function advanceTutorial(userId, player)
	local progress = getTutorialProgress(userId)
	if progress.completed then return end

	progress.currentStep = progress.currentStep + 1
	if progress.currentStep > #TUTORIAL_STEPS then
		progress.completed = true
		print("[Tutorial] Player", player.Name, "completed tutorial!")
		return
	end

	local step = TUTORIAL_STEPS[progress.currentStep]
	if step and player then
		-- Show tutorial message via ServerAnnounce
		Remotes.FireClient("ServerAnnounce", player, {
			message = step.message,
			type = "tutorial",
		})
		print("[Tutorial]", player.Name, "→", step.id)
	end
end

-- ══════════════════════════════════════════════
-- TRIGGER ON FIRST SPAWN
-- ══════════════════════════════════════════════

local function onPlayerJoin(player)
	task.wait(2)  -- Let data load
	local userId = player.UserId
	local progress = getTutorialProgress(userId)

	if not progress.completed and progress.currentStep == 1 then
		-- Show initial tutorial message
		local step = TUTORIAL_STEPS[1]
		Remotes.FireClient("ServerAnnounce", player, {
			message = step.message,
			type = "tutorial",
		})
		print("[Tutorial] Player", player.Name, "started tutorial - step 1")
	end
end

-- ══════════════════════════════════════════════
-- PROGRESS TRACKING (hook into event listeners)
-- ══════════════════════════════════════════════

-- When atom is collected
local originalAtomCollected = Remotes.AtomCollected.OnClientEvent
if originalAtomCollected then
	-- Note: We can't easily hook events in Roblox, so we'll track progress in EconomyManager instead
	-- For now, tutorial progression happens when key events fire
end

-- ══════════════════════════════════════════════
-- MANUAL TRIGGER (for testing)
-- ══════════════════════════════════════════════

local function checkTutorialProgress(player, userId, data)
	-- This would be called from EconomyManager after each major action
	if not data then return end

	local progress = getTutorialProgress(userId)
	if progress.completed then return end

	local step = TUTORIAL_STEPS[progress.currentStep]
	if not step then return end

	-- Check if current step is complete
	local isComplete = false

	if step.type == "atomsCollected" then
		local atomCount = 0
		if data.atoms then
			for _, count in pairs(data.atoms) do
				atomCount = atomCount + count
			end
		end
		isComplete = atomCount >= step.target

	elseif step.type == "moleculesBuilt" then
		isComplete = (data.totalMoleculesBuilt or 0) >= step.target

	elseif step.type == "facilitiesBuilt" then
		local facilityCount = 0
		if data.facilities then
			facilityCount = (data.facilities.mines or 0) +
				(data.facilities.factories or 0) +
				(data.facilities.researchLabs or 0) +
				(data.facilities.offices or 0)
		end
		isComplete = facilityCount >= step.target

	elseif step.type == "none" then
		-- These are info-only steps, auto-advance after display
		isComplete = true
	end

	if isComplete then
		advanceTutorial(userId, player)
	end
end

-- Export for use by EconomyManager
_G.TutorialSystem = {
	checkProgress = checkTutorialProgress,
	onPlayerJoin = onPlayerJoin,
}

Players.PlayerAdded:Connect(onPlayerJoin)

print("[TutorialSystem] Initialized — 6-step tutorial for new players")
