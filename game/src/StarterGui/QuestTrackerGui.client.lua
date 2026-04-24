--[[
	QuestTrackerGui.client.lua
	MOLGANG Quest Tracker

	Shows:
	- Active quests with progress bars
	- Available quests to accept
	- Quest rewards preview
	- Quest requirements/prerequisites
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Quests = require(ReplicatedStorage.Modules.Quests)
local PlayerDataLoaded = Remotes:WaitForChild("PlayerDataLoaded")

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
	gold          = Color3.fromRGB(255, 215, 0),
}

local function createCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 8)
	corner.Parent = parent
	return corner
end

-- SCREEN GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "QuestTrackerGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 7
screenGui.Enabled = true
screenGui.Parent = playerGui

-- COMPACT TRACKER WIDGET (always visible top-left)
local compactTracker = Instance.new("Frame")
compactTracker.Name = "CompactTracker"
compactTracker.Size = UDim2.new(0, 320, 0, 200)
compactTracker.Position = UDim2.new(0, 10, 0, 60)
compactTracker.BackgroundColor3 = COLORS.panel
compactTracker.BackgroundTransparency = 0.2
compactTracker.Parent = screenGui
createCorner(compactTracker, 10)

-- Tracker header
local trackerTitle = Instance.new("TextLabel")
trackerTitle.Size = UDim2.new(1, 0, 0, 30)
trackerTitle.BackgroundTransparency = 0.3
trackerTitle.Text = "📋 Active Quests"
trackerTitle.TextColor3 = COLORS.accent
trackerTitle.TextScaled = true
trackerTitle.Font = Enum.Font.GothamBold
trackerTitle.Parent = compactTracker
createCorner(trackerTitle, 8)

-- Active quests list
local questsList = Instance.new("ScrollingFrame")
questsList.Name = "QuestsList"
questsList.Size = UDim2.new(1, -10, 1, -40)
questsList.Position = UDim2.new(0, 5, 0, 35)
questsList.BackgroundTransparency = 1
questsList.ScrollBarThickness = 4
questsList.Parent = compactTracker

local questsLayout = Instance.new("UIListLayout")
questsLayout.FillDirection = Enum.FillDirection.Vertical
questsLayout.Padding = UDim.new(0, 4)
questsLayout.Parent = questsList

-- ═════════════════════════════════════════════════
-- FULL QUEST MODAL
-- ═════════════════════════════════════════════════

local modalGui = Instance.new("ScreenGui")
modalGui.Name = "QuestModal"
modalGui.ResetOnSpawn = false
modalGui.IgnoreGuiInset = true
modalGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
modalGui.DisplayOrder = 16
modalGui.Enabled = false
modalGui.Parent = playerGui

-- Modal background
local modalBg = Instance.new("Frame")
modalBg.Size = UDim2.new(1, 0, 1, 0)
modalBg.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
modalBg.BackgroundTransparency = 0.5
modalBg.Parent = modalGui

-- Modal panel
local modalPanel = Instance.new("Frame")
modalPanel.Name = "ModalPanel"
modalPanel.Size = UDim2.new(0, 700, 0, 600)
modalPanel.Position = UDim2.new(0.5, -350, 0.5, -300)
modalPanel.BackgroundColor3 = COLORS.panel
modalPanel.BackgroundTransparency = 0.1
modalPanel.Parent = modalGui
createCorner(modalPanel, 12)

-- Modal header
local modalHeader = Instance.new("TextLabel")
modalHeader.Name = "Header"
modalHeader.Size = UDim2.new(1, 0, 0, 50)
modalHeader.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
modalHeader.Text = "📋 Quests & Objectives"
modalHeader.TextColor3 = COLORS.accent
modalHeader.TextScaled = true
modalHeader.Font = Enum.Font.GothamBold
modalHeader.Parent = modalPanel

-- Close button
local closeBtn = Instance.new("TextButton")
closeBtn.Name = "CloseBtn"
closeBtn.Size = UDim2.new(0, 80, 0, 35)
closeBtn.Position = UDim2.new(1, -90, 0, 8)
closeBtn.BackgroundColor3 = Color3.fromRGB(200, 80, 80)
closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
closeBtn.Text = "Close"
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = modalHeader
createCorner(closeBtn, 6)

-- Modal scroll container
local modalScroll = Instance.new("ScrollingFrame")
modalScroll.Name = "QuestsScroll"
modalScroll.Size = UDim2.new(1, -20, 1, -70)
modalScroll.Position = UDim2.new(0, 10, 0, 60)
modalScroll.BackgroundTransparency = 1
modalScroll.ScrollBarThickness = 8
modalScroll.Parent = modalPanel

local modalLayout = Instance.new("UIListLayout")
modalLayout.FillDirection = Enum.FillDirection.Vertical
modalLayout.Padding = UDim.new(0, 8)
modalLayout.Parent = modalScroll

-- ═════════════════════════════════════════════════
-- DATA & DISPLAY
-- ═════════════════════════════════════════════════

local playerData = nil
local questProgress = {}

PlayerDataLoaded.OnClientEvent:Connect(function(data)
	playerData = data
	if not playerData.questProgress then
		playerData.questProgress = Quests.CreateQuestProgress()
		questProgress = playerData.questProgress
	else
		questProgress = playerData.questProgress
	end
end)

local function displayQuestInTracker(quest)
	local questCard = Instance.new("Frame")
	questCard.Name = quest.id
	questCard.Size = UDim2.new(1, -8, 0, 55)
	questCard.BackgroundColor3 = COLORS.panelLight
	questCard.BackgroundTransparency = 0.2
	questCard.Parent = questsList
	createCorner(questCard, 6)

	-- Quest name
	local questName = Instance.new("TextLabel")
	questName.Size = UDim2.new(0.8, 0, 0.4, 0)
	questName.Position = UDim2.new(0, 5, 0, 2)
	questName.BackgroundTransparency = 1
	questName.Text = quest.name
	questName.TextColor3 = COLORS.textPrimary
	questName.TextScaled = true
	questName.Font = Enum.Font.GothamBold
	questName.TextXAlignment = Enum.TextXAlignment.Left
	questName.Parent = questCard

	-- Progress bar
	local barFrame = Instance.new("Frame")
	barFrame.Size = UDim2.new(1, -10, 0, 6)
	barFrame.Position = UDim2.new(0, 5, 0.5, -3)
	barFrame.BackgroundColor3 = Color3.fromRGB(60, 60, 80)
	barFrame.Parent = questCard
	createCorner(barFrame, 2)

	local progress = Quests.CheckProgress(playerData, quest)
	local percent = math.min(progress / quest.condition.target, 1)

	local fillBar = Instance.new("Frame")
	fillBar.Size = UDim2.new(percent, 0, 1, 0)
	fillBar.BackgroundColor3 = COLORS.accent
	fillBar.Parent = barFrame
	createCorner(fillBar, 2)

	-- Progress text
	local progressText = Instance.new("TextLabel")
	progressText.Size = UDim2.new(0.2, 0, 0.4, 0)
	progressText.Position = UDim2.new(0.8, 0, 0, 2)
	progressText.BackgroundTransparency = 1
	progressText.Text = progress .. "/" .. quest.condition.target
	progressText.TextColor3 = COLORS.gold
	progressText.TextScaled = true
	progressText.Font = Enum.Font.Gotham
	progressText.Parent = questCard
end

local function updateCompactTracker()
	-- Clear existing
	for _, child in ipairs(questsList:GetChildren()) do
		if child:IsA("Frame") then
			child:Destroy()
		end
	end

	if not playerData or not questProgress then return end

	-- Get active quests
	local activeQuests = Quests.GetActiveQuests(questProgress)

	if #activeQuests == 0 then
		local noQuestLabel = Instance.new("TextLabel")
		noQuestLabel.Size = UDim2.new(1, 0, 1, 0)
		noQuestLabel.BackgroundTransparency = 1
		noQuestLabel.Text = "No active quests.\nPress Q to find quests!"
		noQuestLabel.TextColor3 = COLORS.textSecondary
		noQuestLabel.TextScaled = true
		noQuestLabel.Font = Enum.Font.Gotham
		noQuestLabel.TextWrapped = true
		noQuestLabel.Parent = questsList
	else
		for _, quest in ipairs(activeQuests) do
			displayQuestInTracker(quest)
		end
	end
end

local function displayModalQuests()
	-- Clear
	for _, child in ipairs(modalScroll:GetChildren()) do
		if child:IsA("Frame") then
			child:Destroy()
		end
	end

	if not playerData or not questProgress then return end

	-- Active quests section
	local activeLabel = Instance.new("TextLabel")
	activeLabel.Size = UDim2.new(1, 0, 0, 25)
	activeLabel.BackgroundTransparency = 1
	activeLabel.Text = "ACTIVE QUESTS"
	activeLabel.TextColor3 = COLORS.accent
	activeLabel.TextScaled = true
	activeLabel.Font = Enum.Font.GothamBold
	activeLabel.TextXAlignment = Enum.TextXAlignment.Left
	activeLabel.Parent = modalScroll

	local activeQuests = Quests.GetActiveQuests(questProgress)
	for _, quest in ipairs(activeQuests) do
		local card = Instance.new("Frame")
		card.Name = quest.id
		card.Size = UDim2.new(1, 0, 0, 100)
		card.BackgroundColor3 = COLORS.panelLight
		card.BackgroundTransparency = 0.2
		card.Parent = modalScroll
		createCorner(card, 8)

		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.new(0.8, 0, 0, 25)
		nameLabel.Position = UDim2.new(0, 10, 0, 5)
		nameLabel.BackgroundTransparency = 1
		nameLabel.Text = quest.name
		nameLabel.TextColor3 = COLORS.textPrimary
		nameLabel.TextScaled = true
		nameLabel.Font = Enum.Font.GothamBold
		nameLabel.TextXAlignment = Enum.TextXAlignment.Left
		nameLabel.Parent = card

		local descLabel = Instance.new("TextLabel")
		descLabel.Size = UDim2.new(1, -20, 0, 20)
		descLabel.Position = UDim2.new(0, 10, 0, 30)
		descLabel.BackgroundTransparency = 1
		descLabel.Text = quest.description
		descLabel.TextColor3 = COLORS.textSecondary
		descLabel.TextScaled = true
		descLabel.Font = Enum.Font.Gotham
		descLabel.TextXAlignment = Enum.TextXAlignment.Left
		descLabel.Parent = card

		-- Progress
		local progress = Quests.CheckProgress(playerData, quest)
		local percent = math.floor((progress / quest.condition.target) * 100)

		local progressLabel = Instance.new("TextLabel")
		progressLabel.Size = UDim2.new(1, -20, 0, 15)
		progressLabel.Position = UDim2.new(0, 10, 0.65, 0)
		progressLabel.BackgroundTransparency = 1
		progressLabel.Text = "Progress: " .. progress .. "/" .. quest.condition.target .. " (" .. percent .. "%)"
		progressLabel.TextColor3 = COLORS.gold
		progressLabel.TextScaled = true
		progressLabel.Font = Enum.Font.Gotham
		progressLabel.Parent = card
	end

	-- Available quests section
	local availLabel = Instance.new("TextLabel")
	availLabel.Size = UDim2.new(1, 0, 0, 25)
	availLabel.BackgroundTransparency = 1
	availLabel.Text = "AVAILABLE QUESTS"
	availLabel.TextColor3 = COLORS.accent
	availLabel.TextScaled = true
	availLabel.Font = Enum.Font.GothamBold
	availLabel.TextXAlignment = Enum.TextXAlignment.Left
	availLabel.Parent = modalScroll

	local availQuests = Quests.GetAvailableQuests(questProgress)
	for _, quest in ipairs(availQuests) do
		local card = Instance.new("Frame")
		card.Size = UDim2.new(1, 0, 0, 70)
		card.BackgroundColor3 = COLORS.panelLight
		card.BackgroundTransparency = 0.3
		card.Parent = modalScroll
		createCorner(card, 8)

		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.new(0.65, 0, 0, 25)
		nameLabel.Position = UDim2.new(0, 10, 0, 5)
		nameLabel.BackgroundTransparency = 1
		nameLabel.Text = quest.name
		nameLabel.TextColor3 = COLORS.textPrimary
		nameLabel.TextScaled = true
		nameLabel.Font = Enum.Font.GothamBold
		nameLabel.TextXAlignment = Enum.TextXAlignment.Left
		nameLabel.Parent = card

		local rewardLabel = Instance.new("TextLabel")
		rewardLabel.Size = UDim2.new(0.3, 0, 0, 25)
		rewardLabel.Position = UDim2.new(0.7, 0, 0, 5)
		rewardLabel.BackgroundTransparency = 1
		rewardLabel.Text = "+" .. quest.reward.molCoins .. " 💰"
		rewardLabel.TextColor3 = COLORS.gold
		rewardLabel.TextScaled = true
		rewardLabel.Font = Enum.Font.GothamBold
		rewardLabel.Parent = card

		local descLabel = Instance.new("TextLabel")
		descLabel.Size = UDim2.new(1, -20, 0, 25)
		descLabel.Position = UDim2.new(0, 10, 0.45, 0)
		descLabel.BackgroundTransparency = 1
		descLabel.Text = quest.description
		descLabel.TextColor3 = COLORS.textSecondary
		descLabel.TextScaled = true
		descLabel.Font = Enum.Font.Gotham
		descLabel.TextWrapped = true
		descLabel.Parent = card

		-- Accept button
		local acceptBtn = Instance.new("TextButton")
		acceptBtn.Size = UDim2.new(0.25, -5, 0.4, 0)
		acceptBtn.Position = UDim2.new(0.73, 0, 0.5, 0)
		acceptBtn.BackgroundColor3 = COLORS.accent
		acceptBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
		acceptBtn.Text = "Accept"
		acceptBtn.Font = Enum.Font.GothamBold
		acceptBtn.TextScaled = true
		acceptBtn.Parent = card
		createCorner(acceptBtn, 4)

		acceptBtn.MouseButton1Click:Connect(function()
			Quests.AcceptQuest(questProgress, quest.id)
			displayModalQuests()
			updateCompactTracker()
		end)
	end
end

-- Event listeners
PlayerDataLoaded.OnClientEvent:Connect(function()
	updateCompactTracker()
end)

-- Throttled to every 60 frames (#92)
local questFrameCount = 0
RunService.Heartbeat:Connect(function()
	questFrameCount = questFrameCount + 1
	if questFrameCount < 60 then return end
	questFrameCount = 0
	if playerData and questProgress then
		updateCompactTracker()
	end
end)

-- Keyboard shortcuts
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.Q then
		modalGui.Enabled = not modalGui.Enabled
		if modalGui.Enabled then
			displayModalQuests()
		end
	end
end)

closeBtn.MouseButton1Click:Connect(function()
	modalGui.Enabled = false
end)

_G.QuestTrackerToggle = function()
	modalGui.Enabled = not modalGui.Enabled
	if modalGui.Enabled then
		displayModalQuests()
	end
end

print("[QuestTrackerGui] Loaded — Press Q to toggle quest list")
