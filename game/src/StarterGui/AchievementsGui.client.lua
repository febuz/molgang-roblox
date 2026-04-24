--[[
	AchievementsGui.client.lua
	MOLGANG Achievements Display

	Shows:
	- Unlocked achievements (badges)
	- Next achievements to work toward (progress bars)
	- Rewards for completing achievements
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Achievements = require(ReplicatedStorage.Modules.Achievements)
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
screenGui.Name = "AchievementsGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 14
screenGui.Enabled = false
screenGui.Parent = playerGui

-- Main panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
mainPanel.Size = UDim2.new(0, 900, 0, 750)
mainPanel.Position = UDim2.new(0.5, -450, 0.5, -375)
mainPanel.BackgroundColor3 = COLORS.panel
mainPanel.BackgroundTransparency = 0.1
mainPanel.Parent = screenGui
createCorner(mainPanel, 12)

-- Header
local header = Instance.new("TextLabel")
header.Name = "Header"
header.Size = UDim2.new(1, 0, 0, 50)
header.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
header.Text = "🏆 Achievements & Progress"
header.TextColor3 = COLORS.accent
header.TextScaled = true
header.Font = Enum.Font.GothamBold
header.Parent = mainPanel

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
closeBtn.Parent = header
createCorner(closeBtn, 6)

-- ═════════════════════════════════════════════════
-- UNLOCKED BADGES SECTION
-- ═════════════════════════════════════════════════

local unlockedLabel = Instance.new("TextLabel")
unlockedLabel.Name = "UnlockedLabel"
unlockedLabel.Size = UDim2.new(1, 0, 0, 30)
unlockedLabel.Position = UDim2.new(0, 10, 0, 60)
unlockedLabel.BackgroundTransparency = 1
unlockedLabel.Text = "UNLOCKED BADGES"
unlockedLabel.TextColor3 = COLORS.accent
unlockedLabel.TextScaled = true
unlockedLabel.Font = Enum.Font.GothamBold
unlockedLabel.TextXAlignment = Enum.TextXAlignment.Left
unlockedLabel.Parent = mainPanel

local badgeGrid = Instance.new("ScrollingFrame")
badgeGrid.Name = "BadgeGrid"
badgeGrid.Size = UDim2.new(1, -20, 0, 130)
badgeGrid.Position = UDim2.new(0, 10, 0, 90)
badgeGrid.BackgroundTransparency = 1
badgeGrid.ScrollBarThickness = 0
badgeGrid.CanvasSize = UDim2.new(0, 0, 0, 0)
badgeGrid.Parent = mainPanel

local badgeLayout = Instance.new("UIListLayout")
badgeLayout.FillDirection = Enum.FillDirection.Horizontal
badgeLayout.CellPadding = UDim2.new(0, 8, 0, 0)
badgeLayout.SortOrder = Enum.SortOrder.Name
badgeLayout.Parent = badgeGrid

-- ═════════════════════════════════════════════════
-- PROGRESS SECTION
-- ═════════════════════════════════════════════════

local progressLabel = Instance.new("TextLabel")
progressLabel.Name = "ProgressLabel"
progressLabel.Size = UDim2.new(1, 0, 0, 30)
progressLabel.Position = UDim2.new(0, 10, 0, 230)
progressLabel.BackgroundTransparency = 1
progressLabel.Text = "WORK TOWARDS NEXT ACHIEVEMENTS"
progressLabel.TextColor3 = COLORS.accent
progressLabel.TextScaled = true
progressLabel.Font = Enum.Font.GothamBold
progressLabel.TextXAlignment = Enum.TextXAlignment.Left
progressLabel.Parent = mainPanel

local progressScroll = Instance.new("ScrollingFrame")
progressScroll.Name = "ProgressScroll"
progressScroll.Size = UDim2.new(1, -20, 1, -270)
progressScroll.Position = UDim2.new(0, 10, 0, 260)
progressScroll.BackgroundTransparency = 1
progressScroll.ScrollBarThickness = 8
progressScroll.Parent = mainPanel

local progressLayout = Instance.new("UIListLayout")
progressLayout.FillDirection = Enum.FillDirection.Vertical
progressLayout.Padding = UDim.new(0, 8)
progressLayout.SortOrder = Enum.SortOrder.Name
progressLayout.Parent = progressScroll

-- ═════════════════════════════════════════════════
-- DISPLAY FUNCTIONS
-- ═════════════════════════════════════════════════

local playerData = nil

PlayerDataLoaded.OnClientEvent:Connect(function(data)
	playerData = data
end)

local function displayBadges()
	-- Clear existing badges
	for _, child in ipairs(badgeGrid:GetChildren()) do
		if child:IsA("Frame") or child:IsA("TextButton") then
			child:Destroy()
		end
	end

	if not playerData then return end

	-- Get unlocked achievements
	local unlocked = Achievements.GetAllUnlocked(playerData)

	-- Display each badge
	for _, achievement in ipairs(unlocked) do
		local badge = Instance.new("Frame")
		badge.Name = achievement.id
		badge.Size = UDim2.new(0, 100, 0, 100)
		badge.BackgroundColor3 = COLORS.panelLight
		badge.BackgroundTransparency = 0.3
		badge.Parent = badgeGrid
		createCorner(badge, 8)

		-- Icon
		local iconLabel = Instance.new("TextLabel")
		iconLabel.Size = UDim2.new(1, 0, 0.6, 0)
		iconLabel.BackgroundTransparency = 1
		iconLabel.Text = achievement.icon
		iconLabel.TextScaled = true
		iconLabel.Parent = badge

		-- Name (small)
		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.new(1, 0, 0.4, 0)
		nameLabel.Position = UDim2.new(0, 0, 0.6, 0)
		nameLabel.BackgroundTransparency = 1
		nameLabel.Text = achievement.name
		nameLabel.TextColor3 = COLORS.gold
		nameLabel.TextScaled = true
		nameLabel.Font = Enum.Font.GothamBold
		nameLabel.TextWrapped = true
		nameLabel.Parent = badge
	end
end

local function displayProgress()
	-- Clear existing
	for _, child in ipairs(progressScroll:GetChildren()) do
		if child:IsA("Frame") then
			child:Destroy()
		end
	end

	if not playerData then return end

	-- Get next 5 achievements
	local next = Achievements.GetNextAchievements(playerData, 5)

	for _, entry in ipairs(next) do
		local ach = entry.achievement
		local prog = entry.progress

		local card = Instance.new("Frame")
		card.Name = ach.id
		card.Size = UDim2.new(1, 0, 0, 70)
		card.BackgroundColor3 = COLORS.panelLight
		card.BackgroundTransparency = 0.2
		card.Parent = progressScroll
		createCorner(card, 8)

		-- Icon + Name + Desc
		local infoFrame = Instance.new("Frame")
		infoFrame.Size = UDim2.new(0, 50, 1, 0)
		infoFrame.BackgroundTransparency = 1
		infoFrame.Parent = card

		local iconLabel = Instance.new("TextLabel")
		iconLabel.Size = UDim2.new(1, 0, 1, 0)
		iconLabel.BackgroundTransparency = 1
		iconLabel.Text = ach.icon
		iconLabel.TextScaled = true
		iconLabel.Parent = infoFrame

		local detailFrame = Instance.new("Frame")
		detailFrame.Size = UDim2.new(1, -60, 1, 0)
		detailFrame.Position = UDim2.new(0, 50, 0, 0)
		detailFrame.BackgroundTransparency = 1
		detailFrame.Parent = card

		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.new(1, -10, 0, 25)
		nameLabel.Position = UDim2.new(0, 5, 0, 2)
		nameLabel.BackgroundTransparency = 1
		nameLabel.Text = ach.name
		nameLabel.TextColor3 = COLORS.textPrimary
		nameLabel.TextScaled = true
		nameLabel.Font = Enum.Font.GothamBold
		nameLabel.TextXAlignment = Enum.TextXAlignment.Left
		nameLabel.Parent = detailFrame

		local descLabel = Instance.new("TextLabel")
		descLabel.Size = UDim2.new(1, -10, 0, 20)
		descLabel.Position = UDim2.new(0, 5, 0, 27)
		descLabel.BackgroundTransparency = 1
		descLabel.Text = ach.description
		descLabel.TextColor3 = COLORS.textSecondary
		descLabel.TextScaled = true
		descLabel.Font = Enum.Font.Gotham
		descLabel.TextXAlignment = Enum.TextXAlignment.Left
		descLabel.Parent = detailFrame

		-- Progress bar
		local barFrame = Instance.new("Frame")
		barFrame.Size = UDim2.new(0.3, -5, 0, 8)
		barFrame.Position = UDim2.new(1, -200, 0.5, -4)
		barFrame.BackgroundColor3 = Color3.fromRGB(60, 60, 80)
		barFrame.Parent = card
		createCorner(barFrame, 2)

		local fillBar = Instance.new("Frame")
		fillBar.Size = UDim2.new(math.min(prog.percent / 100, 1), 0, 1, 0)
		fillBar.BackgroundColor3 = COLORS.accent
		fillBar.Parent = barFrame
		createCorner(fillBar, 2)

		-- Percentage text
		local percentLabel = Instance.new("TextLabel")
		percentLabel.Size = UDim2.new(0.15, 0, 1, 0)
		percentLabel.Position = UDim2.new(1, -35, 0.5, -10)
		percentLabel.BackgroundTransparency = 1
		percentLabel.Text = prog.percent .. "%"
		percentLabel.TextColor3 = COLORS.gold
		percentLabel.TextScaled = true
		percentLabel.Font = Enum.Font.GothamBold
		percentLabel.Parent = card
	end
end

local function updateDisplay()
	displayBadges()
	displayProgress()
end

PlayerDataLoaded.OnClientEvent:Connect(updateDisplay)

-- Recent achievements log (#66)
local recentAchievements = {}
local AchievementUnlocked = Remotes:FindFirstChild("AchievementUnlocked")
if AchievementUnlocked then
	AchievementUnlocked.OnClientEvent:Connect(function(data)
		table.insert(recentAchievements, 1, {
			name = data.name or "Achievement",
			desc = data.description or "",
			time = os.date("%H:%M"),
		})
		if #recentAchievements > 10 then table.remove(recentAchievements) end
	end)
end

-- Update every 5 seconds (was 3)
task.spawn(function()
	while true do
		task.wait(5)
		if screenGui.Enabled and playerData then
			updateDisplay()
		end
	end
end)

-- Close handler
closeBtn.MouseButton1Click:Connect(function()
	screenGui.Enabled = false
end)

-- Keyboard shortcut
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.A then
		screenGui.Enabled = not screenGui.Enabled
		if screenGui.Enabled then
			updateDisplay()
		end
	end
end)

_G.AchievementsGuiToggle = function()
	screenGui.Enabled = not screenGui.Enabled
	if screenGui.Enabled then
		updateDisplay()
	end
end

print("[AchievementsGui] Loaded — Press A to toggle achievements")
