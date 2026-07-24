--[[
	LoadingScreen.client.lua
	MOLGANG Teaser — Animated Loading & Welcome Screen

	Features:
	- Animated molecule logo with orbiting electrons
	- Smooth fade-in of title, tagline, tips
	- Progress bar animation
	- "OTAP TEST" badge
	- Proper fade-out on click (fades children, not ScreenGui)
]]

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- StarterGui can recreate LocalScripts after a character reset. The intro is
-- a session gate, not a respawn screen, so never show it a second time.
local introGate = ReplicatedStorage:FindFirstChild("MOLGANGIntroGate")
if introGate or playerGui:FindFirstChild("MOLGANGIntroGate")
	 or _G.MOLGANGIntroShown or player:GetAttribute("MOLGANGIntroShown") then
	return
end
-- Player attributes, script globals and PlayerGui can be reset/recreated with
-- the character under Studio playtest. A client-local ReplicatedStorage marker
-- survives those clones and is the authoritative session gate.
introGate = Instance.new("BoolValue")
introGate.Name = "MOLGANGIntroGate"
introGate.Value = true
introGate.Parent = ReplicatedStorage
_G.MOLGANGIntroShown = true
player:SetAttribute("MOLGANGIntroShown", true)

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(8, 10, 18),
	panel         = Color3.fromRGB(18, 22, 35),
	accent        = Color3.fromRGB(0, 220, 130),
	accentDim     = Color3.fromRGB(0, 140, 80),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(160, 165, 185),
	gold          = Color3.fromRGB(255, 215, 0),
	teaserBadge   = Color3.fromRGB(255, 80, 60),
	molBlue       = Color3.fromRGB(80, 180, 255),
	molPurple     = Color3.fromRGB(160, 100, 255),
}

-- ═══════════════════════════════════════════════
-- SCREEN GUI
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "LoadingScreen"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 100
screenGui.Parent = playerGui

-- Full-screen background
local bg = Instance.new("Frame")
bg.Name = "Background"
bg.Size = UDim2.new(1, 0, 1, 0)
bg.BackgroundColor3 = COLORS.background
bg.BackgroundTransparency = 0
bg.BorderSizePixel = 0
bg.Parent = screenGui

-- Subtle gradient overlay
local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
	ColorSequenceKeypoint.new(0, Color3.fromRGB(15, 20, 35)),
	ColorSequenceKeypoint.new(0.5, Color3.fromRGB(8, 10, 18)),
	ColorSequenceKeypoint.new(1, Color3.fromRGB(5, 15, 12)),
})
gradient.Rotation = 135
gradient.Parent = bg

-- ═══════════════════════════════════════════════
-- ANIMATED MOLECULE LOGO
-- ═══════════════════════════════════════════════

local logoContainer = Instance.new("Frame")
logoContainer.Name = "LogoContainer"
logoContainer.Size = UDim2.fromOffset(120, 120)
logoContainer.Position = UDim2.new(0.5, -60, 0, 60)
logoContainer.BackgroundTransparency = 1
logoContainer.Parent = bg

-- Central atom (nucleus)
local nucleus = Instance.new("Frame")
nucleus.Name = "Nucleus"
nucleus.Size = UDim2.fromOffset(30, 30)
nucleus.Position = UDim2.new(0.5, -15, 0.5, -15)
nucleus.BackgroundColor3 = COLORS.accent
nucleus.Parent = logoContainer
local nucleusCorner = Instance.new("UICorner")
nucleusCorner.CornerRadius = UDim.new(1, 0)
nucleusCorner.Parent = nucleus

-- Nucleus glow
local nucleusGlow = Instance.new("Frame")
nucleusGlow.Size = UDim2.fromOffset(50, 50)
nucleusGlow.Position = UDim2.new(0.5, -25, 0.5, -25)
nucleusGlow.BackgroundColor3 = COLORS.accent
nucleusGlow.BackgroundTransparency = 0.7
nucleusGlow.Parent = logoContainer
local glowCorner = Instance.new("UICorner")
glowCorner.CornerRadius = UDim.new(1, 0)
glowCorner.Parent = nucleusGlow

-- Orbit rings (decorative)
for i = 1, 3 do
	local ring = Instance.new("Frame")
	ring.Name = "Ring_" .. i
	ring.Size = UDim2.fromOffset(80 + i * 12, 80 + i * 12)
	ring.Position = UDim2.new(0.5, -(40 + i * 6), 0.5, -(40 + i * 6))
	ring.BackgroundTransparency = 1
	ring.Rotation = i * 60
	ring.Parent = logoContainer

	local stroke = Instance.new("UIStroke")
	stroke.Color = COLORS.accent
	stroke.Thickness = 1.5
	stroke.Transparency = 0.5 + i * 0.1
	stroke.Parent = ring

	local ringCorner = Instance.new("UICorner")
	ringCorner.CornerRadius = UDim.new(1, 0)
	ringCorner.Parent = ring
end

-- Orbiting electrons (small dots)
local electrons = {}
for i = 1, 3 do
	local electron = Instance.new("Frame")
	electron.Name = "Electron_" .. i
	electron.Size = UDim2.fromOffset(8, 8)
	electron.BackgroundColor3 = i == 1 and COLORS.accent or i == 2 and COLORS.molBlue or COLORS.molPurple
	electron.Parent = logoContainer
	local eCorner = Instance.new("UICorner")
	eCorner.CornerRadius = UDim.new(1, 0)
	eCorner.Parent = electron
	electrons[i] = {frame = electron, offset = i * (math.pi * 2 / 3), radius = 40 + i * 6, speed = 1.5 + i * 0.3}
end

-- Animate electrons
local animConnection
animConnection = RunService.RenderStepped:Connect(function(dt)
	if not logoContainer.Parent then
		animConnection:Disconnect()
		return
	end
	for _, e in ipairs(electrons) do
		e.offset = e.offset + dt * e.speed
		local cx = 60 + math.cos(e.offset) * e.radius - 4
		local cy = 60 + math.sin(e.offset) * e.radius * 0.5 - 4
		e.frame.Position = UDim2.fromOffset(cx, cy)
	end
end)

-- ═══════════════════════════════════════════════
-- TITLE & TAGLINE
-- ═══════════════════════════════════════════════

local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(0.8, 0, 0, 60)
title.Position = UDim2.new(0.1, 0, 0, 200)
title.BackgroundTransparency = 1
title.Text = "MOLGANG"
title.TextColor3 = COLORS.accent
title.TextScaled = true
title.Font = Enum.Font.GothamBold
title.TextTransparency = 1
title.Parent = bg

local tagline = Instance.new("TextLabel")
tagline.Name = "Tagline"
tagline.Size = UDim2.new(0.7, 0, 0, 28)
tagline.Position = UDim2.new(0.15, 0, 0, 262)
tagline.BackgroundTransparency = 1
tagline.Text = "Chemical Engineering Simulator"
tagline.TextColor3 = COLORS.textSecondary
tagline.TextScaled = true
tagline.Font = Enum.Font.Gotham
tagline.TextTransparency = 1
tagline.Parent = bg

-- OTAP test badge
local teaserBadge = Instance.new("TextLabel")
teaserBadge.Name = "TeaserBadge"
teaserBadge.Size = UDim2.fromOffset(110, 26)
teaserBadge.Position = UDim2.new(0.5, 50, 0, 205)
teaserBadge.BackgroundColor3 = COLORS.teaserBadge
teaserBadge.BackgroundTransparency = 0.1
teaserBadge.Text = "OTAP TEST"
teaserBadge.TextColor3 = Color3.fromRGB(255, 255, 255)
teaserBadge.TextScaled = true
teaserBadge.Font = Enum.Font.GothamBold
teaserBadge.TextTransparency = 1
teaserBadge.Parent = bg
local badgeCorner = Instance.new("UICorner")
badgeCorner.CornerRadius = UDim.new(0, 6)
badgeCorner.Parent = teaserBadge
local badgePad = Instance.new("UIPadding")
badgePad.PaddingLeft = UDim.new(0, 6)
badgePad.PaddingRight = UDim.new(0, 6)
badgePad.Parent = teaserBadge

-- ═══════════════════════════════════════════════
-- DESCRIPTION & TIPS PANEL
-- ═══════════════════════════════════════════════

local contentPanel = Instance.new("Frame")
contentPanel.Name = "ContentPanel"
contentPanel.Size = UDim2.new(0, 600, 0, 280)
contentPanel.Position = UDim2.new(0.5, -300, 0, 310)
contentPanel.BackgroundColor3 = COLORS.panel
contentPanel.BackgroundTransparency = 1
contentPanel.Parent = bg
local cpCorner = Instance.new("UICorner")
cpCorner.CornerRadius = UDim.new(0, 12)
cpCorner.Parent = contentPanel
local cpStroke = Instance.new("UIStroke")
cpStroke.Color = COLORS.accentDim
cpStroke.Thickness = 1.5
cpStroke.Transparency = 1
cpStroke.Parent = contentPanel

-- Description text
local descText = [[OTAP teststraat for a Chemical Engineering Simulator in space. Process BOF steel slag through realistic crushing, leaching, and extraction. Synthesize fertilizers with real NPK chemistry. Manage an industrial factory, trade on global markets, and master the periodic table — all in immersive VR/AR.]]

local description = Instance.new("TextLabel")
description.Name = "Description"
description.Size = UDim2.new(1, -30, 0, 70)
description.Position = UDim2.new(0, 15, 0, 15)
description.BackgroundTransparency = 1
description.Text = descText
description.TextColor3 = COLORS.textPrimary
description.TextScaled = true
description.Font = Enum.Font.Gotham
description.TextWrapped = true
description.TextYAlignment = Enum.TextYAlignment.Top
description.TextTransparency = 1
description.Parent = contentPanel

-- Divider line
local divider = Instance.new("Frame")
divider.Size = UDim2.new(0.9, 0, 0, 1)
divider.Position = UDim2.new(0.05, 0, 0, 90)
divider.BackgroundColor3 = COLORS.accentDim
divider.BackgroundTransparency = 1
divider.BorderSizePixel = 0
divider.Parent = contentPanel

-- Quick controls section
local controlsTitle = Instance.new("TextLabel")
controlsTitle.Size = UDim2.new(1, -30, 0, 22)
controlsTitle.Position = UDim2.new(0, 15, 0, 100)
controlsTitle.BackgroundTransparency = 1
controlsTitle.Text = "CONTROLS"
controlsTitle.TextColor3 = COLORS.accent
controlsTitle.TextScaled = true
controlsTitle.Font = Enum.Font.GothamBold
controlsTitle.TextXAlignment = Enum.TextXAlignment.Left
controlsTitle.TextTransparency = 1
controlsTitle.Parent = contentPanel

-- Controls grid (2 columns)
local controlsData = {
	{"WASD", "Move around"},
	{"Space", "Jump"},
	{"P", "Periodic Table"},
	{"D", "Dashboard"},
	{"I", "Inventory"},
	{"R", "Recipe Book"},
	{"Q", "Quest Log"},
	{"S", "Slag Processing"},
	{"F", "Fertilizer Lab"},
	{"G", "Factory Builder"},
	{"C", "Process Control"},
	{"T", "Research Tree"},
	{"V", "Mining"},
	{"X", "Product Exchange"},
	{"B", "Bubble Tea Bar"},
	{"L", "Leaderboards"},
	{"A", "Achievements"},
	{"Tab", "Wallet"},
	{"M", "Map / Mahjong"},
	{"Esc", "Close All"},
}

local controlsFrame = Instance.new("Frame")
-- Four compact columns keep all shortcuts inside the outlined panel.
controlsFrame.Size = UDim2.new(1, -30, 0, 150)
controlsFrame.Position = UDim2.new(0, 15, 0, 125)
controlsFrame.BackgroundTransparency = 1
controlsFrame.Parent = contentPanel

local controlLabels = {}
for i, ctrl in ipairs(controlsData) do
	local col = (i - 1) % 4
	local row = math.floor((i - 1) / 4)

	-- Key badge
	local keyBadge = Instance.new("TextLabel")
	keyBadge.Size = UDim2.fromOffset(42, 22)
	keyBadge.Position = UDim2.new(col * 0.25, 0, 0, row * 28)
	keyBadge.BackgroundColor3 = Color3.fromRGB(40, 45, 60)
	keyBadge.BackgroundTransparency = 0.3
	keyBadge.Text = ctrl[1]
	keyBadge.TextColor3 = COLORS.accent
	keyBadge.TextScaled = true
	keyBadge.Font = Enum.Font.Code
	keyBadge.TextTransparency = 1
	keyBadge.Parent = controlsFrame
	local kCorner = Instance.new("UICorner")
	kCorner.CornerRadius = UDim.new(0, 4)
	kCorner.Parent = keyBadge
	table.insert(controlLabels, keyBadge)

	-- Action label
	local actionLabel = Instance.new("TextLabel")
	actionLabel.Size = UDim2.new(0.25, -48, 0, 22)
	actionLabel.Position = UDim2.new(col * 0.25, 47, 0, row * 28)
	actionLabel.BackgroundTransparency = 1
	actionLabel.Text = ctrl[2]
	actionLabel.TextColor3 = COLORS.textSecondary
	actionLabel.TextScaled = true
	actionLabel.Font = Enum.Font.Gotham
	actionLabel.TextXAlignment = Enum.TextXAlignment.Left
	actionLabel.TextTransparency = 1
	actionLabel.Parent = controlsFrame
	table.insert(controlLabels, actionLabel)
end

-- ═══════════════════════════════════════════════
-- PROGRESS BAR
-- ═══════════════════════════════════════════════

local progressContainer = Instance.new("Frame")
progressContainer.Name = "ProgressBar"
progressContainer.Size = UDim2.new(0, 400, 0, 6)
progressContainer.Position = UDim2.new(0.5, -200, 1, -100)
progressContainer.BackgroundColor3 = Color3.fromRGB(30, 35, 45)
progressContainer.BackgroundTransparency = 0.5
progressContainer.BorderSizePixel = 0
progressContainer.Parent = bg
local pbCorner = Instance.new("UICorner")
pbCorner.CornerRadius = UDim.new(1, 0)
pbCorner.Parent = progressContainer

local progressFill = Instance.new("Frame")
progressFill.Name = "Fill"
progressFill.Size = UDim2.new(0, 0, 1, 0)
progressFill.BackgroundColor3 = COLORS.accent
progressFill.BorderSizePixel = 0
progressFill.Parent = progressContainer
local pfCorner = Instance.new("UICorner")
pfCorner.CornerRadius = UDim.new(1, 0)
pfCorner.Parent = progressFill

local loadingText = Instance.new("TextLabel")
loadingText.Size = UDim2.new(0, 400, 0, 20)
loadingText.Position = UDim2.new(0.5, -200, 1, -88)
loadingText.BackgroundTransparency = 1
loadingText.Text = "Loading Moleculia..."
loadingText.TextColor3 = COLORS.textSecondary
loadingText.TextScaled = true
loadingText.Font = Enum.Font.Gotham
loadingText.TextTransparency = 0.3
loadingText.Parent = bg

-- ═══════════════════════════════════════════════
-- PLAY BUTTON (appears after progress)
-- ═══════════════════════════════════════════════

local playBtn = Instance.new("TextButton")
playBtn.Name = "PlayBtn"
playBtn.Size = UDim2.fromOffset(220, 50)
playBtn.Position = UDim2.new(0.5, -110, 1, -82)
playBtn.BackgroundColor3 = COLORS.accent
playBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
playBtn.Text = "ENTER MOLECULIA"
playBtn.Font = Enum.Font.GothamBold
playBtn.TextScaled = true
playBtn.Visible = false
playBtn.Active = true
playBtn.Selectable = true
playBtn.ZIndex = 25
playBtn.Parent = bg
local playCorner = Instance.new("UICorner")
playCorner.CornerRadius = UDim.new(0, 10)
playCorner.Parent = playBtn
local playStroke = Instance.new("UIStroke")
playStroke.Color = Color3.fromRGB(0, 255, 160)
playStroke.Thickness = 2
playStroke.Transparency = 0.5
playStroke.Parent = playBtn

-- Footer
local footer = Instance.new("TextLabel")
footer.Size = UDim2.new(0.6, 0, 0, 18)
footer.Position = UDim2.new(0.2, 0, 1, -30)
footer.BackgroundTransparency = 1
footer.Text = "MOLGANG OTAP teststraat | Chemical Engineering Simulator v0.2"
footer.TextColor3 = Color3.fromRGB(80, 85, 100)
footer.TextScaled = true
footer.Font = Enum.Font.Gotham
footer.Parent = bg

-- ═══════════════════════════════════════════════
-- ANIMATION SEQUENCE
-- ═══════════════════════════════════════════════

local tweenFast = TweenInfo.new(0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local tweenMedium = TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local tweenSlow = TweenInfo.new(1.0, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)

-- Phase 1: Title fade in (0.3s delay)
task.delay(0.3, function()
	TweenService:Create(title, tweenMedium, {TextTransparency = 0}):Play()
	TweenService:Create(teaserBadge, tweenMedium, {TextTransparency = 0, BackgroundTransparency = 0.1}):Play()
end)

-- Phase 2: Tagline (0.6s delay)
task.delay(0.6, function()
	TweenService:Create(tagline, tweenMedium, {TextTransparency = 0}):Play()
end)

-- Phase 3: Content panel (0.9s delay)
task.delay(0.9, function()
	TweenService:Create(contentPanel, tweenSlow, {BackgroundTransparency = 0.15}):Play()
	TweenService:Create(cpStroke, tweenSlow, {Transparency = 0.5}):Play()
	TweenService:Create(description, tweenSlow, {TextTransparency = 0}):Play()
	TweenService:Create(divider, tweenSlow, {BackgroundTransparency = 0.5}):Play()
	TweenService:Create(controlsTitle, tweenSlow, {TextTransparency = 0}):Play()
end)

-- Phase 4: Controls grid (staggered, 1.2s start)
task.delay(1.2, function()
	for i, label in ipairs(controlLabels) do
		task.delay(i * 0.05, function()
			TweenService:Create(label, tweenFast, {TextTransparency = 0}):Play()
		end)
	end
end)

-- Phase 5: Progress bar animation (1.5s start, fills over 2s)
task.delay(1.5, function()
	TweenService:Create(progressFill, TweenInfo.new(2, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut), {
		Size = UDim2.new(1, 0, 1, 0),
	}):Play()
end)

-- Phase 6: Show play button (3.5s — after progress bar fills)
task.delay(3.5, function()
	loadingText.Text = "Ready!"
	TweenService:Create(loadingText, tweenFast, {TextTransparency = 1}):Play()
	TweenService:Create(progressContainer, tweenFast, {BackgroundTransparency = 1}):Play()
	TweenService:Create(progressFill, tweenFast, {BackgroundTransparency = 1}):Play()

	playBtn.Visible = true
	playBtn.Size = UDim2.fromOffset(180, 40)
	playBtn.BackgroundTransparency = 0.5
	TweenService:Create(playBtn, TweenInfo.new(0.5, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Size = UDim2.fromOffset(220, 50),
		BackgroundTransparency = 0,
	}):Play()
end)

-- ═══════════════════════════════════════════════
-- FADE OUT (button click or auto after 20s)
-- ═══════════════════════════════════════════════

local didFadeOut = false
local function fadeOutAndDestroy()
	if didFadeOut then return end
	didFadeOut = true
	-- Disconnect electron animation
	if animConnection then
		animConnection:Disconnect()
	end

	-- Fade all visible elements
	local fadeTime = TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.In)

	TweenService:Create(bg, fadeTime, {BackgroundTransparency = 1}):Play()
	TweenService:Create(title, fadeTime, {TextTransparency = 1}):Play()
	TweenService:Create(tagline, fadeTime, {TextTransparency = 1}):Play()
	TweenService:Create(teaserBadge, fadeTime, {TextTransparency = 1, BackgroundTransparency = 1}):Play()
	TweenService:Create(contentPanel, fadeTime, {BackgroundTransparency = 1}):Play()
	TweenService:Create(cpStroke, fadeTime, {Transparency = 1}):Play()
	TweenService:Create(description, fadeTime, {TextTransparency = 1}):Play()
	TweenService:Create(controlsTitle, fadeTime, {TextTransparency = 1}):Play()
	TweenService:Create(divider, fadeTime, {BackgroundTransparency = 1}):Play()
	TweenService:Create(playBtn, fadeTime, {BackgroundTransparency = 1, TextTransparency = 1}):Play()
	TweenService:Create(footer, fadeTime, {TextTransparency = 1}):Play()
	TweenService:Create(nucleus, fadeTime, {BackgroundTransparency = 1}):Play()
	TweenService:Create(nucleusGlow, fadeTime, {BackgroundTransparency = 1}):Play()

	for _, label in ipairs(controlLabels) do
		TweenService:Create(label, fadeTime, {TextTransparency = 1, BackgroundTransparency = 1}):Play()
	end
	for _, e in ipairs(electrons) do
		TweenService:Create(e.frame, fadeTime, {BackgroundTransparency = 1}):Play()
	end

	task.delay(0.7, function()
		screenGui:Destroy()
	end)
end

-- Activated works consistently for mouse, touch and gamepad in Studio.
playBtn.Activated:Connect(fadeOutAndDestroy)
-- MouseButton1Click is retained as a desktop fallback for Wine/Studio input
-- paths where Activated can be swallowed by the embedded game surface.
playBtn.MouseButton1Click:Connect(fadeOutAndDestroy)

-- Never strand a player on the intro if input focus is lost. The button is
-- still shown and clickable, but the session gate always releases eventually.
task.delay(20, fadeOutAndDestroy)

print("[MOLGANG] OTAP test loading screen displayed")
