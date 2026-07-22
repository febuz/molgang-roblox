--[[
	LeaderboardGui.client.lua
	MOLGANG Global Leaderboards

	Shows top 10 players by:
	- MolCoins earned
	- Elements collected
	- Molecules built
	- Chain entries (blockchain registrations)
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	gold          = Color3.fromRGB(255, 215, 0),
	silver        = Color3.fromRGB(192, 192, 192),
	bronze        = Color3.fromRGB(205, 127, 50),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
}

local function createCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 8)
	corner.Parent = parent
	return corner
end

local function createStroke(parent, color, thickness)
	local stroke = Instance.new("UIStroke")
	stroke.Color = color or COLORS.accent
	stroke.Thickness = thickness or 1.5
	stroke.Parent = parent
	return stroke
end

-- SCREEN GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "LeaderboardGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 15
screenGui.Enabled = false
screenGui.Parent = playerGui

-- Main panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
mainPanel.Size = UDim2.new(0, 900, 0, 700)
mainPanel.Position = UDim2.new(0.5, -450, 0.5, -350)
mainPanel.BackgroundColor3 = COLORS.panel
mainPanel.BackgroundTransparency = 0.1
mainPanel.Parent = screenGui
createCorner(mainPanel, 12)
createStroke(mainPanel, COLORS.accent, 2)

-- Header
local header = Instance.new("TextLabel")
header.Name = "Header"
header.Size = UDim2.new(1, 0, 0, 50)
header.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
header.Text = "🏆 Global Leaderboards"
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

-- TAB BUTTONS FOR LEADERBOARDS
local tabButtonArea = Instance.new("Frame")
tabButtonArea.Name = "TabButtons"
tabButtonArea.Size = UDim2.new(1, 0, 0, 45)
tabButtonArea.Position = UDim2.new(0, 0, 0, 50)
tabButtonArea.BackgroundColor3 = COLORS.panelLight
tabButtonArea.BackgroundTransparency = 0.3
tabButtonArea.Parent = mainPanel

local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.HorizontalAlignment = Enum.HorizontalAlignment.Left
tabLayout.Padding = UDim.new(0, 4)
tabLayout.Parent = tabButtonArea

local tabPadding = Instance.new("UIPadding")
tabPadding.PaddingLeft = UDim.new(0, 8)
tabPadding.PaddingTop = UDim.new(0, 6)
tabPadding.PaddingBottom = UDim.new(0, 6)
tabPadding.Parent = tabButtonArea

-- Leaderboard categories
local categories = {
	{name = "MolCoins",  key = "molcoins",  stat = "totalMolCoinsEarned"},
	{name = "Elements",  key = "elements",  stat = "elementsFound"},
	{name = "Molecules", key = "molecules", stat = "moleculesBuilt"},
	{name = "Chain",     key = "chain",     stat = "totalChainEntries"},
}

local tabButtons = {}
local leaderboardContent = Instance.new("Frame")
leaderboardContent.Name = "Content"
leaderboardContent.Size = UDim2.new(1, 0, 1, -95)
leaderboardContent.Position = UDim2.new(0, 0, 0, 95)
leaderboardContent.BackgroundTransparency = 1
leaderboardContent.Parent = mainPanel

local currentCategory = "molcoins"

-- Display leaderboard
local function displayLeaderboard(category)
	-- Clear content
	for _, child in ipairs(leaderboardContent:GetChildren()) do
		child:Destroy()
	end

	-- Mock leaderboard data (in real game, query from server)
	local leaderboardData = {
		{rank = 1, name = player.Name, value = 5000, medal = "🥇"},
		{rank = 2, name = "Ming",       value = 4500, medal = "🥈"},
		{rank = 3, name = "Yuki",       value = 4200, medal = "🥉"},
		{rank = 4, name = "Carlos",     value = 3800, medal = ""},
		{rank = 5, name = "Sarah",      value = 3500, medal = ""},
		{rank = 6, name = "Ahmed",      value = 3200, medal = ""},
		{rank = 7, name = "Lucia",      value = 2900, medal = ""},
		{rank = 8, name = "Kenji",      value = 2600, medal = ""},
		{rank = 9, name = "Sofia",      value = 2300, medal = ""},
		{rank = 10, name = "Pavel",     value = 2000, medal = ""},
	}

	-- Create list
	local scroll = Instance.new("ScrollingFrame")
	scroll.Name = "LeaderboardScroll"
	scroll.Size = UDim2.new(1, 0, 1, 0)
	scroll.BackgroundTransparency = 1
	scroll.ScrollBarThickness = 8
	scroll.Parent = leaderboardContent

	local layout = Instance.new("UIListLayout")
	layout.FillDirection = Enum.FillDirection.Vertical
	layout.Padding = UDim.new(0, 2)
	layout.Parent = scroll

	-- Header row
	local headerRow = Instance.new("Frame")
	headerRow.Name = "HeaderRow"
	headerRow.Size = UDim2.new(1, 0, 0, 40)
	headerRow.BackgroundColor3 = COLORS.panelLight
	headerRow.Parent = scroll
	createCorner(headerRow, 6)

	local headerParts = {
		{text = "Rank", size = 0.1},
		{text = "Player Name", size = 0.5},
		{text = category, size = 0.4},
	}

	local xPos = 0
	for _, part in ipairs(headerParts) do
		local label = Instance.new("TextLabel")
		label.Size = UDim2.new(part.size, 0, 1, 0)
		label.Position = UDim2.new(xPos, 0, 0, 0)
		label.BackgroundTransparency = 1
		label.Text = part.text
		label.TextColor3 = COLORS.accent
		label.TextScaled = true
		label.Font = Enum.Font.GothamBold
		label.Parent = headerRow
		xPos = xPos + part.size
	end

	-- Data rows
	for _, entry in ipairs(leaderboardData) do
		local row = Instance.new("Frame")
		row.Name = "Row_" .. entry.rank
		row.Size = UDim2.new(1, 0, 0, 35)
		row.BackgroundColor3 = (entry.rank <= 3) and COLORS.panelLight or COLORS.panel
		row.BackgroundTransparency = (entry.rank <= 3) and 0.2 or 0.3
		row.Parent = scroll
		createCorner(row, 4)

		-- Rank
		local rankLabel = Instance.new("TextLabel")
		rankLabel.Size = UDim2.new(0.1, 0, 1, 0)
		rankLabel.BackgroundTransparency = 1
		rankLabel.Text = entry.medal .. " #" .. entry.rank
		rankLabel.TextColor3 = (entry.rank <= 3) and COLORS.gold or COLORS.textPrimary
		rankLabel.TextScaled = true
		rankLabel.Font = Enum.Font.GothamBold
		rankLabel.Parent = row

		-- Name
		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.new(0.5, 0, 1, 0)
		nameLabel.Position = UDim2.new(0.1, 0, 0, 0)
		nameLabel.BackgroundTransparency = 1
		nameLabel.Text = entry.name
		nameLabel.TextColor3 = COLORS.textPrimary
		nameLabel.TextScaled = true
		nameLabel.Font = Enum.Font.Gotham
		nameLabel.TextXAlignment = Enum.TextXAlignment.Left
		nameLabel.Parent = row

		-- Value
		local valueLabel = Instance.new("TextLabel")
		valueLabel.Size = UDim2.new(0.4, 0, 1, 0)
		valueLabel.Position = UDim2.new(0.6, 0, 0, 0)
		valueLabel.BackgroundTransparency = 1
		valueLabel.Text = tostring(entry.value)
		valueLabel.TextColor3 = COLORS.gold
		valueLabel.TextScaled = true
		valueLabel.Font = Enum.Font.GothamBold
		valueLabel.Parent = row
	end
end

-- Create category tabs
for _, cat in ipairs(categories) do
	local btn = Instance.new("TextButton")
	btn.Name = cat.key .. "Tab"
	btn.Size = UDim2.new(0, 110, 1, 0)
	btn.BackgroundColor3 = (cat.key == "molcoins") and COLORS.accent or Color3.fromRGB(80, 80, 100)
	btn.TextColor3 = (cat.key == "molcoins") and Color3.fromRGB(0, 0, 0) or COLORS.textSecondary
	btn.Text = cat.name
	btn.Font = Enum.Font.GothamBold
	btn.TextScaled = true
	btn.BackgroundTransparency = (cat.key == "molcoins") and 0.1 or 0.3
	btn.Parent = tabButtonArea
	createCorner(btn, 6)
	tabButtons[cat.key] = btn

	btn.MouseButton1Click:Connect(function()
		-- Update button colors
		for key, button in pairs(tabButtons) do
			if key == cat.key then
				button.BackgroundColor3 = COLORS.accent
				button.TextColor3 = Color3.fromRGB(0, 0, 0)
				button.BackgroundTransparency = 0.1
			else
				button.BackgroundColor3 = Color3.fromRGB(80, 80, 100)
				button.TextColor3 = COLORS.textSecondary
				button.BackgroundTransparency = 0.3
			end
		end

		currentCategory = cat.key
		displayLeaderboard(cat.name)
	end)
end

-- Initial display
displayLeaderboard("MolCoins")

-- Close handler
closeBtn.MouseButton1Click:Connect(function()
	screenGui.Enabled = false
end)

-- Keyboard shortcut
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.L then
		screenGui.Enabled = not screenGui.Enabled
	end
end)

_G.LeaderboardGuiShow = function()
	screenGui.Enabled = true
end

_G.LeaderboardGuiHide = function()
	screenGui.Enabled = false
end

print("[LeaderboardGui] Loaded — Press L or call _G.LeaderboardGuiShow()")
