--[[
	SettingsMenu.client.lua
	MOLGANG Settings & Configuration

	Allows players to customize:
	- Audio volume (music/sfx)
	- Visual settings (particles, effects)
	- Gameplay options (notifications, hints)
	- Keybinds (optional future enhancement)

	Keyboard shortcut: / (forward slash)
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- PLAYER SETTINGS (local storage)
-- ══════════════════════════════════════════════

local settings = {
	musicVolume = 0.5,
	sfxVolume = 0.8,
	showParticles = true,
	showHints = true,
	showNotifications = true,
	colorblindMode = false,
}

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
-- SETTINGS GUI
-- ══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "SettingsMenu"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui
screenGui.Enabled = false

-- Overlay
local overlay = Instance.new("Frame")
overlay.Size = UDim2.new(1, 0, 1, 0)
overlay.BackgroundColor3 = COLORS.background
overlay.BackgroundTransparency = 0.3
overlay.Parent = screenGui

-- Settings card
local card = Instance.new("Frame")
card.Size = UDim2.new(0, 700, 0, 500)
card.Position = UDim2.new(0.5, -350, 0.5, -250)
card.BackgroundColor3 = COLORS.panel
card.BackgroundTransparency = 0.1
card.Parent = screenGui
createCorner(card, 12)

-- Title
createTextLabel(card, {
	Size = UDim2.new(1, 0, 0, 40),
	Text = "⚙️ SETTINGS",
	TextColor3 = COLORS.accent,
	TextScaled = true,
	Font = Enum.Font.GothamBold,
})

-- Content area
local contentArea = Instance.new("ScrollingFrame")
contentArea.Size = UDim2.new(1, -20, 1, -60)
contentArea.Position = UDim2.new(0, 10, 0, 50)
contentArea.BackgroundTransparency = 1
contentArea.ScrollBarThickness = 6
contentArea.Parent = card

local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Vertical
layout.HorizontalAlignment = Enum.HorizontalAlignment.Fill
layout.Padding = UDim.new(0, 12)
layout.Parent = contentArea

-- ══════════════════════════════════════════════
-- AUDIO SETTINGS
-- ══════════════════════════════════════════════

local function createSliderSetting(parent, label, currentValue, onChanged)
	local container = Instance.new("Frame")
	container.Size = UDim2.new(1, 0, 0, 50)
	container.BackgroundColor3 = COLORS.panelLight
	container.BackgroundTransparency = 0.3
	container.Parent = parent
	createCorner(container, 6)

	-- Label
	createTextLabel(container, {
		Size = UDim2.new(0, 200, 1, 0),
		Position = UDim2.new(0, 10, 0, 0),
		Text = label,
		TextColor3 = COLORS.textSecondary,
		Font = Enum.Font.Gotham,
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Left,
	})

	-- Slider
	local slider = Instance.new("Frame")
	slider.Size = UDim2.new(0, 150, 0, 8)
	slider.Position = UDim2.new(0, 220, 0.5, -4)
	slider.BackgroundColor3 = Color3.fromRGB(100, 100, 100)
	slider.Parent = container
	createCorner(slider, 4)

	-- Fill
	local fill = Instance.new("Frame")
	fill.Size = UDim2.new(currentValue, 0, 1, 0)
	fill.BackgroundColor3 = COLORS.accent
	fill.BorderSizePixel = 0
	fill.Parent = slider
	createCorner(fill, 4)

	-- Value label
	local valueLabel = createTextLabel(container, {
		Size = UDim2.new(0, 50, 1, 0),
		Position = UDim2.new(0, 380, 0, 0),
		Text = string.format("%.0f%%", currentValue * 100),
		TextColor3 = COLORS.gold,
		Font = Enum.Font.GothamBold,
		TextScaled = true,
	})

	-- Slider interaction
	slider.InputBegan:Connect(function(input, gp)
		if gp then return end
		if input.UserInputType ~= Enum.UserInputType.MouseButton1 then return end

		UserInputService.InputChanged:Connect(function(input2, gp2)
			if input2.UserInputType == Enum.UserInputType.MouseMovement then
				local pos = UserInputService:GetMouseLocation()
				local sliderPos = slider.AbsolutePosition.X
				local sliderSize = slider.AbsoluteSize.X
				local relative = math.clamp((pos.X - sliderPos) / sliderSize, 0, 1)

				fill.Size = UDim2.new(relative, 0, 1, 0)
				valueLabel.Text = string.format("%.0f%%", relative * 100)
				onChanged(relative)
			end
		end)
	end)

	return container
end

-- Music volume
createSliderSetting(contentArea, "🎵 Music Volume", settings.musicVolume, function(val)
	settings.musicVolume = val
end)

-- SFX volume
createSliderSetting(contentArea, "🔊 SFX Volume", settings.sfxVolume, function(val)
	settings.sfxVolume = val
end)

-- ══════════════════════════════════════════════
-- TOGGLE SETTINGS
-- ══════════════════════════════════════════════

local function createToggleSetting(parent, label, currentValue, onChanged)
	local container = Instance.new("Frame")
	container.Size = UDim2.new(1, 0, 0, 40)
	container.BackgroundColor3 = COLORS.panelLight
	container.BackgroundTransparency = 0.3
	container.Parent = parent
	createCorner(container, 6)

	-- Label
	createTextLabel(container, {
		Size = UDim2.new(0.7, 0, 1, 0),
		Position = UDim2.new(0, 10, 0, 0),
		Text = label,
		TextColor3 = COLORS.textSecondary,
		Font = Enum.Font.Gotham,
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Left,
	})

	-- Toggle button
	local toggle = Instance.new("TextButton")
	toggle.Size = UDim2.new(0, 60, 0, 24)
	toggle.Position = UDim2.new(1, -70, 0.5, -12)
	toggle.BackgroundColor3 = currentValue and COLORS.accent or Color3.fromRGB(100, 100, 100)
	toggle.BackgroundTransparency = 0.3
	toggle.Text = currentValue and "ON" or "OFF"
	toggle.TextColor3 = COLORS.textPrimary
	toggle.TextScaled = true
	toggle.Font = Enum.Font.GothamBold
	toggle.BorderSizePixel = 0
	toggle.Parent = container
	createCorner(toggle, 4)

	toggle.MouseButton1Click:Connect(function()
		currentValue = not currentValue
		toggle.BackgroundColor3 = currentValue and COLORS.accent or Color3.fromRGB(100, 100, 100)
		toggle.Text = currentValue and "ON" or "OFF"
		onChanged(currentValue)
	end)

	return container
end

-- Show particles
createToggleSetting(contentArea, "✨ Particle Effects", settings.showParticles, function(val)
	settings.showParticles = val
end)

-- Show hints
createToggleSetting(contentArea, "💡 Show Hints", settings.showHints, function(val)
	settings.showHints = val
end)

-- Show notifications
createToggleSetting(contentArea, "📢 Show Notifications", settings.showNotifications, function(val)
	settings.showNotifications = val
end)

-- Colorblind mode
createToggleSetting(contentArea, "🎨 Colorblind Mode", settings.colorblindMode, function(val)
	settings.colorblindMode = val
end)

-- Footer
createTextLabel(card, {
	Size = UDim2.new(1, 0, 0, 30),
	Position = UDim2.new(0, 0, 1, -30),
	Text = "Press / to close • Settings auto-save",
	TextColor3 = COLORS.textSecondary,
	Font = Enum.Font.Gotham,
	TextScaled = true,
})

-- ══════════════════════════════════════════════
-- KEYBOARD SHORTCUT
-- ══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if input.KeyCode == Enum.KeyCode.Slash then
		if not gameProcessed then
			screenGui.Enabled = not screenGui.Enabled
		end
	end

	if input.KeyCode == Enum.KeyCode.Escape and screenGui.Enabled then
		screenGui.Enabled = false
	end
end)

print("[SettingsMenu] Loaded — Press / to open settings")
