--[[
	DashboardMenu.client.lua
	MOLGANG Main Dashboard & Quick-Access Menu

	Central hub showing:
	- Player statistics (atoms, molecules, coins, facilities)
	- Quick links to all game systems
	- Settings & help
	- Daily/weekly goals

	Keyboard shortcut: ESC or SPACE to show/hide
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- COLOR PALETTE
-- ══════════════════════════════════════════════

local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	gold          = Color3.fromRGB(255, 215, 0),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
}

-- ══════════════════════════════════════════════
-- HELPERS
-- ══════════════════════════════════════════════

local function createTextLabel(parent, props)
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	for k, v in pairs(props) do
		label[k] = v
	end
	label.Parent = parent
	return label
end

local function createCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 8)
	corner.Parent = parent
	return corner
end

-- ══════════════════════════════════════════════
-- DASHBOARD GUI
-- ══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "DashboardMenu"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui
screenGui.Enabled = false

-- Main panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
mainPanel.Size = UDim2.new(1, 0, 1, 0)
mainPanel.BackgroundColor3 = COLORS.background
mainPanel.BackgroundTransparency = 0.3
mainPanel.Parent = screenGui

-- Center card
local card = Instance.new("Frame")
card.Name = "Card"
card.Size = UDim2.new(0, 800, 0, 650)
card.Position = UDim2.new(0.5, -400, 0.5, -325)
card.BackgroundColor3 = COLORS.panel
card.BackgroundTransparency = 0.1
card.Parent = screenGui
createCorner(card, 12)

-- Title
createTextLabel(card, {
	Size = UDim2.new(1, 0, 0, 50),
	Text = "MOLGANG DASHBOARD",
	TextColor3 = COLORS.accent,
	TextScaled = true,
	Font = Enum.Font.GothamBold,
})

-- Stats section
local statsPanel = Instance.new("Frame")
statsPanel.Size = UDim2.new(1, -20, 0, 120)
statsPanel.Position = UDim2.new(0, 10, 0, 60)
statsPanel.BackgroundColor3 = COLORS.panelLight
statsPanel.BackgroundTransparency = 0.3
statsPanel.Parent = card
createCorner(statsPanel, 8)

-- Stat rows
local stats = {
	{"💰 MolCoins", "0"},
	{"⚛️  Atoms Collected", "0"},
	{"🧪 Molecules Built", "0"},
	{"🏭 Facilities Owned", "0"},
}

for i, stat in ipairs(stats) do
	local row = Instance.new("Frame")
	row.Size = UDim2.new(0.5, 0, 0.5, 0)
	row.Position = UDim2.new((i-1)%2 * 0.5, 0, math.floor((i-1)/2) * 0.5, 0)
	row.BackgroundTransparency = 1
	row.Parent = statsPanel

	createTextLabel(row, {
		Size = UDim2.new(1, -10, 0, 20),
		Position = UDim2.new(0, 5, 0, 5),
		Text = stat[1],
		TextColor3 = COLORS.textSecondary,
		Font = Enum.Font.Gotham,
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Left,
	})

	createTextLabel(row, {
		Name = "StatValue_" .. i,
		Size = UDim2.new(1, -10, 0, 20),
		Position = UDim2.new(0, 5, 0, 25),
		Text = stat[2],
		TextColor3 = COLORS.gold,
		Font = Enum.Font.GothamBold,
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Right,
	})
end

-- Quick links section
createTextLabel(card, {
	Size = UDim2.new(1, 0, 0, 25),
	Position = UDim2.new(0, 10, 0, 190),
	Text = "⚡ QUICK LINKS",
	TextColor3 = COLORS.accent,
	Font = Enum.Font.GothamBold,
	TextScaled = true,
	TextXAlignment = Enum.TextXAlignment.Left,
})

local quickLinks = {
	{key = "Q", name = "Quests", action = "toggleQuests"},
	{key = "I", name = "Inventory", action = "toggleInventory"},
	{key = "P", name = "Periodic Table", action = "toggleTable"},
	{key = "D", name = "Facility Builder", action = "toggleBuilder"},
	{key = "M", name = "Market", action = "toggleMarket"},
	{key = "L", name = "Leaderboards", action = "toggleLeaderboards"},
	{key = "W", name = "Wallet", action = "toggleWallet"},
	{key = "A", name = "Achievements", action = "toggleAchievements"},
}

local linksPanel = Instance.new("Frame")
linksPanel.Size = UDim2.new(1, -20, 0, 280)
linksPanel.Position = UDim2.new(0, 10, 0, 225)
linksPanel.BackgroundColor3 = COLORS.panelLight
linksPanel.BackgroundTransparency = 0.2
linksPanel.Parent = card
createCorner(linksPanel, 8)

local gridLayout = Instance.new("UIGridLayout")
gridLayout.CellSize = UDim2.new(0.5, -5, 0, 60)
gridLayout.FillDirection = Enum.FillDirection.Horizontal
gridLayout.HorizontalAlignment = Enum.HorizontalAlignment.Fill
gridLayout.Padding = UDim.new(0, 8)
gridLayout.Parent = linksPanel

for _, link in ipairs(quickLinks) do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(1, 0, 1, 0)
	btn.BackgroundColor3 = COLORS.accent
	btn.BackgroundTransparency = 0.3
	btn.Text = link.key .. " - " .. link.name
	btn.TextColor3 = COLORS.textPrimary
	btn.TextScaled = true
	btn.Font = Enum.Font.GothamBold
	btn.BorderSizePixel = 0
	btn.Parent = linksPanel
	createCorner(btn, 6)

	btn.MouseButton1Click:Connect(function()
		screenGui.Enabled = false
	end)
end

-- Footer
createTextLabel(card, {
	Size = UDim2.new(1, 0, 0, 30),
	Position = UDim2.new(0, 0, 1, -30),
	Text = "Press ESC to close • All hotkeys listed above",
	TextColor3 = COLORS.textSecondary,
	Font = Enum.Font.Gotham,
	TextScaled = true,
})

-- ══════════════════════════════════════════════
-- KEYBOARD SHORTCUT
-- ══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	-- Show dashboard on ESC or SPACE
	if input.KeyCode == Enum.KeyCode.Escape or input.KeyCode == Enum.KeyCode.Space then
		if not gameProcessed then
			screenGui.Enabled = not screenGui.Enabled
		end
	end
end)

-- Close button
mainPanel.InputBegan:Connect(function(input, gameProcessed)
	if input.KeyCode == Enum.KeyCode.Escape then
		screenGui.Enabled = false
	end
end)

print("[DashboardMenu] Loaded — Press ESC or SPACE to toggle dashboard")
