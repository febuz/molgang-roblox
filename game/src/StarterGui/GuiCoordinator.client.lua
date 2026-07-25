-- GuiCoordinator.client.lua
-- Keeps modal menus mutually exclusive. HUD/status widgets remain visible;
-- opening one interactive menu closes the other menu that could steal input.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")
local modalNames = {
	DashboardGui = true, PeriodicTableGui = true, RecipeBookGui = true,
	InventoryGui = true, SettingsGui = true, AchievementsGui = true,
	LeaderboardGui = true, SlagProcessingGui = true, FertilizerGui = true,
	FactoryBuilderGui = true, ResearchGui = true, AtomTradeGui = true,
	ProductMarketGui = true, MarketBiddingGui = true, MiningGui = true, ProcessControlGui = true,
	BubbleTeaGui = true, SuperheroGui = true, QuantumRacingGui = true,
	FeedbackGui = true, MahjongGui = true, GuildGui = true,
	WalletGui = true, NPCDialogueGui = true,
	MiniGameGui = true, ShortcutOverlay = true, QuestModal = true,
	QuizGui = true, TutorialGui = true,
	-- A world-event banner is transient feedback, not a second permanent HUD.
	-- It must remain enabled while menus are open so queued announcements can
	-- still render; its panels do not capture input.
	-- ConfirmRemove and CostWarning are owned transient overlays. They must not
	-- close the menu that spawned them; their creators assign a higher layer.
}

local busy = false
local guiTraceEnabled = RunService:IsStudio() or game:GetAttribute("EnableOtapGuiTrace") == true

local function movementInputActive()
	local movementLockUntil = Players.LocalPlayer:GetAttribute("MovementGuiLockUntil")
	return type(movementLockUntil) == "number" and os.clock() < movementLockUntil
end

local function getOpenModalNames()
	local names = {}
	for _, child in ipairs(playerGui:GetChildren()) do
		if child:IsA("ScreenGui") and modalNames[child.Name] and child.Enabled then
			table.insert(names, child.Name .. "@" .. tostring(child.DisplayOrder))
		end
	end
	table.sort(names)
	return names
end

local function traceGui(action, gui, detail)
	if not guiTraceEnabled then return end
	local name = gui and gui.Name or "unknown"
	local order = gui and gui:IsA("ScreenGui") and gui.DisplayOrder or -1
	local openNames = getOpenModalNames()
	local suffix = detail and (" | " .. detail) or ""
	print(string.format("[GuiTrace] %s %s@%s | open=[%s]%s",
		action,
		name,
		tostring(order),
		table.concat(openNames, ", "),
		suffix))
end

local function closeOthers(openGui)
	if busy then return end
	-- A live quiz is an answer-state modal. Do not let a shortcut or a delayed
	-- GUI response close it before the player can answer; reject the competing
	-- menu instead and keep the question on screen.
	local activeQuiz = playerGui:FindFirstChild("QuizGui")
	if activeQuiz and activeQuiz:IsA("ScreenGui") and activeQuiz.Enabled and openGui ~= activeQuiz then
		if openGui and openGui:IsA("ScreenGui") then
			openGui.Enabled = false
			traceGui("reject-open", openGui, "quiz remained active")
		end
		return
	end
	busy = true
	for _, child in ipairs(playerGui:GetChildren()) do
		if child:IsA("ScreenGui") and child ~= openGui and modalNames[child.Name] and child.Enabled then
			child.Enabled = false
			traceGui("forced-close", child, "opened by " .. (openGui and openGui.Name or "unknown"))
		end
	end
	busy = false
end

local function watch(gui)
	if not gui:IsA("ScreenGui") or not modalNames[gui.Name] then return end
	gui:GetPropertyChangedSignal("Enabled"):Connect(function()
		if gui.Enabled then
			if gui.Name == "AchievementsGui" and movementInputActive() then
				gui.Enabled = false
				traceGui("reject-open", gui, "movement lock active")
				return
			end
			traceGui("enabled", gui)
			closeOthers(gui)
		else
			traceGui("disabled", gui)
		end
	end)
	gui:GetPropertyChangedSignal("DisplayOrder"):Connect(function()
		if gui.Enabled then
			traceGui("display-order", gui, "display order changed while enabled")
		end
	end)
	if gui.Enabled then closeOthers(gui) end
end

for _, child in ipairs(playerGui:GetChildren()) do watch(child) end
playerGui.ChildAdded:Connect(watch)

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then return end
	if input.KeyCode == Enum.KeyCode.Escape then
		for _, child in ipairs(playerGui:GetChildren()) do
			if child:IsA("ScreenGui") and modalNames[child.Name] and child.Enabled then
				child.Enabled = false
				traceGui("escape-close", child)
			end
		end
	end
end)

print("[GuiCoordinator] Modal menu exclusivity enabled")
