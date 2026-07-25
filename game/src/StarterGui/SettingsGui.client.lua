--[[
	SettingsGui.client.lua
	MOLGANG Settings & Controls

	Game settings:
	- Volume control
	- Game speed
	- Keyboard shortcuts
	- UI scale
]]

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
}

local function createCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 8)
	corner.Parent = parent
	return corner
end

-- SCREEN GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "SettingsGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 12
screenGui.Enabled = false
screenGui.Parent = playerGui

local responsiveScale = Instance.new("UIScale")
responsiveScale.Name = "ResponsiveScale"
responsiveScale.Parent = screenGui
local settingsCamera = workspace.CurrentCamera
local function updateSettingsScale()
	if not settingsCamera then return end
	responsiveScale.Scale = math.clamp(math.min(
		(settingsCamera.ViewportSize.X - 20) / 700,
		(settingsCamera.ViewportSize.Y - 20) / 650
	), 0.65, 1)
end
updateSettingsScale()
if settingsCamera then
	settingsCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateSettingsScale)
end

-- Main panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
mainPanel.Size = UDim2.new(0, 700, 0, 650)
mainPanel.AnchorPoint = Vector2.new(0.5, 0.5)
mainPanel.Position = UDim2.fromScale(0.5, 0.5)
mainPanel.BackgroundColor3 = COLORS.panel
mainPanel.BackgroundTransparency = 0.1
mainPanel.Parent = screenGui
createCorner(mainPanel, 12)

-- Header
local header = Instance.new("TextLabel")
header.Name = "Header"
header.Size = UDim2.new(1, 0, 0, 50)
header.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
header.Text = "⚙️ Settings & Controls"
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

-- Scroll container
local scroll = Instance.new("ScrollingFrame")
scroll.Name = "ScrollContainer"
scroll.Size = UDim2.new(1, -20, 1, -70)
scroll.Position = UDim2.new(0, 10, 0, 60)
scroll.BackgroundTransparency = 1
scroll.ScrollBarThickness = 8
scroll.Parent = mainPanel

local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Vertical
layout.Padding = UDim.new(0, 12)
layout.Parent = scroll

-- ═════════════════════════════════════════════════
-- KEYBOARD SHORTCUTS SECTION
-- ═════════════════════════════════════════════════

local shortcutsHeader = Instance.new("TextLabel")
shortcutsHeader.Name = "ShortcutsHeader"
shortcutsHeader.Size = UDim2.new(1, 0, 0, 30)
shortcutsHeader.BackgroundTransparency = 1
shortcutsHeader.Text = "KEYBOARD SHORTCUTS"
shortcutsHeader.TextColor3 = COLORS.accent
shortcutsHeader.TextScaled = true
shortcutsHeader.Font = Enum.Font.GothamBold
shortcutsHeader.TextXAlignment = Enum.TextXAlignment.Left
shortcutsHeader.Parent = scroll

local shortcuts = {
	{key = "P", action = "Periodic Table (118 elements)"},
	{key = "D", action = "Dashboard (build/trade/research)"},
	{key = "I", action = "Inventory (atoms & molecules)"},
	{key = "K", action = "Achievements & Badges"},
	{key = "L", action = "Leaderboards (top 100)"},
	{key = "Q", action = "Quest Tracker"},
	{key = "R", action = "Recipe Book (molecule crafting)"},
	{key = "S", action = "Slag Processing (ChemEng)"},
	{key = "F", action = "Fertilizer Lab (NPK farming)"},
	{key = "G", action = "Factory Builder (entrepreneur)"},
	{key = "C", action = "Process Control Panel (gauges)"},
	{key = "B", action = "Bubble Tea Bar (buffs)"},
	{key = "T", action = "Research & Technology Tree"},
	{key = "V", action = "Vanadium Mining (explore/mine/trade)"},
	{key = "X", action = "Product Exchange (sell metals)"},
	{key = ".", action = "Submit Feedback / Bug Report"},
	{key = "Tab", action = "Wallet & MolChain Explorer"},
	{key = "M", action = "Toggle Minimap"},
	{key = "/", action = "This Settings Panel"},
	{key = "ESC", action = "Close All Overlays"},
}

for _, shortcut in ipairs(shortcuts) do
	local shortcutFrame = Instance.new("Frame")
	shortcutFrame.Name = shortcut.key
	shortcutFrame.Size = UDim2.new(1, 0, 0, 35)
	shortcutFrame.BackgroundColor3 = COLORS.panelLight
	shortcutFrame.BackgroundTransparency = 0.3
	shortcutFrame.Parent = scroll
	createCorner(shortcutFrame, 6)

	local keyLabel = Instance.new("TextLabel")
	keyLabel.Size = UDim2.new(0.2, 0, 1, 0)
	keyLabel.BackgroundTransparency = 1
	keyLabel.Text = "[" .. shortcut.key .. "]"
	keyLabel.TextColor3 = COLORS.accent
	keyLabel.TextScaled = true
	keyLabel.Font = Enum.Font.GothamBold
	keyLabel.Parent = shortcutFrame

	local actionLabel = Instance.new("TextLabel")
	actionLabel.Size = UDim2.new(0.8, 0, 1, 0)
	actionLabel.Position = UDim2.new(0.2, 0, 0, 0)
	actionLabel.BackgroundTransparency = 1
	actionLabel.Text = shortcut.action
	actionLabel.TextColor3 = COLORS.textPrimary
	actionLabel.TextScaled = true
	actionLabel.Font = Enum.Font.Gotham
	actionLabel.TextXAlignment = Enum.TextXAlignment.Left
	actionLabel.Parent = shortcutFrame
end

-- ═════════════════════════════════════════════════
-- GAME INFO SECTION
-- ═════════════════════════════════════════════════

local infoHeader = Instance.new("TextLabel")
infoHeader.Name = "InfoHeader"
infoHeader.Size = UDim2.new(1, 0, 0, 30)
infoHeader.BackgroundTransparency = 1
infoHeader.Text = "GAME INFO"
infoHeader.TextColor3 = COLORS.accent
infoHeader.TextScaled = true
infoHeader.Font = Enum.Font.GothamBold
infoHeader.TextXAlignment = Enum.TextXAlignment.Left
infoHeader.Parent = scroll

local gameInfoTexts = {
	"Version: 1.0.0 (MVP)",
	"Gameplay Loop: Collect → Build → Trade → Earn",
	"NPCs: Direk, Prof. Femke, Ank, Yuki",
	"Game Day: Every 10 minutes real-time",
	"Production Cycles: Every 60 seconds",
	"Leaderboards: 4 categories (MolCoins, Elements, Molecules, Chain)",
}

for _, infoText in ipairs(gameInfoTexts) do
	local infoFrame = Instance.new("Frame")
	infoFrame.Name = "InfoFrame"
	infoFrame.Size = UDim2.new(1, 0, 0, 35)
	infoFrame.BackgroundColor3 = COLORS.panelLight
	infoFrame.BackgroundTransparency = 0.3
	infoFrame.Parent = scroll
	createCorner(infoFrame, 6)

	local infoLabel = Instance.new("TextLabel")
	infoLabel.Size = UDim2.new(1, -10, 1, 0)
	infoLabel.Position = UDim2.new(0, 5, 0, 0)
	infoLabel.BackgroundTransparency = 1
	infoLabel.Text = infoText
	infoLabel.TextColor3 = COLORS.textSecondary
	infoLabel.TextScaled = true
	infoLabel.Font = Enum.Font.Gotham
	infoLabel.TextXAlignment = Enum.TextXAlignment.Left
	infoLabel.Parent = infoFrame
end

-- Close handler
closeBtn.Activated:Connect(function()
	screenGui.Enabled = false
end)

_G.SettingsGuiToggle = function()
	screenGui.Enabled = not screenGui.Enabled
end

print("[SettingsGui] Loaded — Press / to toggle settings")
