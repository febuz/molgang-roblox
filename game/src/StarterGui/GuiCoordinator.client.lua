-- GuiCoordinator.client.lua
-- Keeps modal menus mutually exclusive. HUD/status widgets remain visible;
-- opening one interactive menu closes the other menu that could steal input.

local Players = game:GetService("Players")
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
	MiniGameGui = true, ShortcutOverlay = true, QuestModal = true,
	QuizGui = true, TutorialGui = true,
	-- Dynamic confirmation and warning layers must also be exclusive. These
	-- used to remain above a newly opened menu and could swallow button input.
	ConfirmRemove = true, CostWarning = true,
}

local busy = false
local function closeOthers(openGui)
	if busy then return end
	busy = true
	for _, child in ipairs(playerGui:GetChildren()) do
		if child:IsA("ScreenGui") and child ~= openGui and modalNames[child.Name] and child.Enabled then
			child.Enabled = false
		end
	end
	busy = false
end

local function watch(gui)
	if not gui:IsA("ScreenGui") or not modalNames[gui.Name] then return end
	gui:GetPropertyChangedSignal("Enabled"):Connect(function()
		if gui.Enabled then closeOthers(gui) end
	end)
	if gui.Enabled then closeOthers(gui) end
end

for _, child in ipairs(playerGui:GetChildren()) do watch(child) end
playerGui.ChildAdded:Connect(watch)

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then return end
	if input.KeyCode == Enum.KeyCode.Escape then
		for _, child in ipairs(playerGui:GetChildren()) do
			if child:IsA("ScreenGui") and modalNames[child.Name] then child.Enabled = false end
		end
	end
end)

print("[GuiCoordinator] Modal menu exclusivity enabled")
