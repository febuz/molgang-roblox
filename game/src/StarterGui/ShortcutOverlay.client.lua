--[[
	ShortcutOverlay.client.lua
	MOLGANG — Quick Reference Keyboard Shortcut Overlay

	Press F1 or ? to show/hide full shortcut reference.
	Transparent overlay that doesn't block gameplay.
]]

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ResponsiveGui = require(ReplicatedStorage.Modules.ResponsiveGui)

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "ShortcutOverlay"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 95
screenGui.Enabled = false
screenGui.Parent = playerGui
ResponsiveGui.Attach(screenGui, 700, 520)

local overlay = Instance.new("Frame")
overlay.Size = UDim2.new(1, 0, 1, 0)
overlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
overlay.BackgroundTransparency = 0.4
overlay.Parent = screenGui

local panel = Instance.new("Frame")
panel.Size = UDim2.new(0, 700, 0, 520)
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.5)
panel.BackgroundColor3 = Color3.fromRGB(12, 14, 24)
panel.BackgroundTransparency = 0.05
panel.Parent = overlay
local pc = Instance.new("UICorner"); pc.CornerRadius = UDim.new(0, 14); pc.Parent = panel

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 40)
title.BackgroundColor3 = Color3.fromRGB(8, 10, 18)
title.Text = "KEYBOARD & MOUSE CONTROLS"
title.TextColor3 = Color3.fromRGB(0, 220, 130)
title.TextScaled = true
title.Font = Enum.Font.GothamBold
title.Parent = panel
local tc = Instance.new("UICorner"); tc.CornerRadius = UDim.new(0, 14); tc.Parent = title

local dismiss = Instance.new("TextLabel")
dismiss.Size = UDim2.new(1, 0, 0, 16)
dismiss.Position = UDim2.new(0, 0, 1, -20)
dismiss.BackgroundTransparency = 1
dismiss.Text = "Press F1 or ? to close"
dismiss.TextColor3 = Color3.fromRGB(100, 110, 140)
dismiss.TextScaled = true
dismiss.Font = Enum.Font.Gotham
dismiss.Parent = panel

-- Shortcut data — 3 columns
local shortcuts = {
	-- Column 1: Movement & Navigation
	{col = 1, header = "MOVEMENT"},
	{col = 1, key = "WASD", desc = "Move around"},
	{col = 1, key = "Space", desc = "Jump"},
	{col = 1, key = "Shift", desc = "Sprint (if unlocked)"},
	{col = 1, key = "Mouse", desc = "Look around"},
	{col = 1, key = "Scroll", desc = "Zoom in/out"},
	{col = 1, key = "M / N", desc = "Toggle Minimap"},
	{col = 1, key = "Esc", desc = "Close all panels"},

	-- Column 2: Production & Chemistry
	{col = 2, header = "CHEMISTRY & PRODUCTION"},
	{col = 2, key = "P", desc = "Periodic Table"},
	{col = 2, key = "R", desc = "Recipe Book (molecules)"},
	{col = 2, key = "S", desc = "Slag Processing"},
	{col = 2, key = "C", desc = "Process Control"},
	{col = 2, key = "T", desc = "Research Tree"},
	{col = 2, key = "F", desc = "Fertilizer Lab"},
	{col = 2, key = "G", desc = "Factory Builder"},
	{col = 2, key = "X", desc = "Product Exchange"},

	-- Column 3: Economy & Social
	{col = 3, header = "ECONOMY & SOCIAL"},
	{col = 3, key = "D", desc = "Dashboard"},
	{col = 3, key = "I", desc = "Inventory"},
	{col = 3, key = "Tab", desc = "Wallet"},
	{col = 3, key = "V", desc = "Mining"},
	{col = 3, key = "B", desc = "Bubble Tea Bar"},
	{col = 3, key = "Q", desc = "Quest Log"},
	{col = 3, key = "K", desc = "Achievements"},
	{col = 3, key = "L", desc = "Leaderboards"},
	{col = 3, key = ";", desc = "Guilds"},
	{col = 3, key = ".", desc = "Atom Trading"},
	{col = 3, key = "Dashboard", desc = "Mahjong openen"},
	{col = 3, key = "/", desc = "Settings"},
}

-- Render shortcuts
local colOffsets = {0, 0.34, 0.67}
local colRows = {0, 0, 0}

for _, s in ipairs(shortcuts) do
	local col = s.col
	local xOff = colOffsets[col]
	local y = 48 + colRows[col] * 22

	if s.header then
		-- Column header
		local hl = Instance.new("TextLabel")
		hl.Size = UDim2.new(0.3, -10, 0, 18)
		hl.Position = UDim2.new(xOff, 8, 0, y)
		hl.BackgroundTransparency = 1
		hl.Text = s.header
		hl.TextColor3 = Color3.fromRGB(0, 180, 220)
		hl.TextScaled = true
		hl.Font = Enum.Font.GothamBold
		hl.TextXAlignment = Enum.TextXAlignment.Left
		hl.Parent = panel
		colRows[col] = colRows[col] + 1
	else
		-- Key badge
		local kb = Instance.new("TextLabel")
		kb.Size = UDim2.fromOffset(42, 18)
		kb.Position = UDim2.new(xOff, 8, 0, y)
		kb.BackgroundColor3 = Color3.fromRGB(40, 45, 60)
		kb.BackgroundTransparency = 0.3
		kb.Text = s.key
		kb.TextColor3 = Color3.fromRGB(220, 225, 240)
		kb.TextScaled = true
		kb.Font = Enum.Font.GothamBold
		kb.Parent = panel
		local kbc = Instance.new("UICorner"); kbc.CornerRadius = UDim.new(0, 4); kbc.Parent = kb

		-- Description
		local dl = Instance.new("TextLabel")
		dl.Size = UDim2.new(0.3, -62, 0, 18)
		dl.Position = UDim2.new(xOff, 54, 0, y)
		dl.BackgroundTransparency = 1
		dl.Text = s.desc
		dl.TextColor3 = Color3.fromRGB(180, 185, 200)
		dl.TextScaled = true
		dl.Font = Enum.Font.Gotham
		dl.TextXAlignment = Enum.TextXAlignment.Left
		dl.Parent = panel

		colRows[col] = colRows[col] + 1
	end
end

-- Mouse controls section (bottom)
local mouseY = 390
local mouseHeader = Instance.new("TextLabel")
mouseHeader.Size = UDim2.new(1, -16, 0, 18)
mouseHeader.Position = UDim2.new(0, 8, 0, mouseY)
mouseHeader.BackgroundTransparency = 1
mouseHeader.Text = "MOUSE CONTROLS"
mouseHeader.TextColor3 = Color3.fromRGB(255, 200, 0)
mouseHeader.TextScaled = true
mouseHeader.Font = Enum.Font.GothamBold
mouseHeader.TextXAlignment = Enum.TextXAlignment.Left
mouseHeader.Parent = panel

local mouseData = {
	{"Left Click", "Interact, place equipment, select items, collect"},
	{"Right Click", "Remove equipment from grid, cancel"},
	{"Scroll Wheel", "Zoom camera in/out, scroll lists"},
	{"Hover", "Preview placement (green=valid, red=blocked)"},
}

for i, m in ipairs(mouseData) do
	local mk = Instance.new("TextLabel")
	mk.Size = UDim2.fromOffset(90, 16)
	mk.Position = UDim2.new(0, 8, 0, mouseY + 22 + (i-1) * 20)
	mk.BackgroundColor3 = Color3.fromRGB(50, 45, 30)
	mk.BackgroundTransparency = 0.3
	mk.Text = m[1]
	mk.TextColor3 = Color3.fromRGB(255, 220, 160)
	mk.TextScaled = true
	mk.Font = Enum.Font.GothamBold
	mk.Parent = panel
	local mkc = Instance.new("UICorner"); mkc.CornerRadius = UDim.new(0, 4); mkc.Parent = mk

	local md = Instance.new("TextLabel")
	md.Size = UDim2.new(1, -110, 0, 16)
	md.Position = UDim2.new(0, 104, 0, mouseY + 22 + (i-1) * 20)
	md.BackgroundTransparency = 1
	md.Text = m[2]
	md.TextColor3 = Color3.fromRGB(180, 185, 200)
	md.TextScaled = true
	md.Font = Enum.Font.Gotham
	md.TextXAlignment = Enum.TextXAlignment.Left
	md.Parent = panel
end

-- Toggle with F1
UserInputService.InputBegan:Connect(function(input, gp)
	if gp then return end
	if input.KeyCode == Enum.KeyCode.F1 then
		screenGui.Enabled = not screenGui.Enabled
	end
end)

-- Click overlay to dismiss
overlay.InputBegan:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		screenGui.Enabled = false
	end
end)

print("[MOLGANG] ShortcutOverlay loaded — press F1 for full keyboard/mouse reference")
