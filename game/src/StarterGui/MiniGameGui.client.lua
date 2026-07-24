-- StarterGui/MiniGameGui.client.lua
-- Client-side UI for the Slakkenspoor HGMS mini-game
-- Shows sorting bins, score counter, timer, and pH slider

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- ══════════════════════════════════════════════
-- COLORS
-- ══════════════════════════════════════════════

local BIN_COLORS = {
	magnetic = Color3.fromRGB(180, 40, 40),    -- Fe3O4 → red bin
	valuable = Color3.fromRGB(255, 215, 0),    -- V2O5/TiO2 → gold bin
	hazard   = Color3.fromRGB(40, 180, 40),    -- Cr(VI) → green hazard
}

local MINERAL_COLORS = {
	V2O5   = Color3.fromRGB(255, 200, 0),
	Fe3O4  = Color3.fromRGB(140, 30, 30),
	TiO2   = Color3.fromRGB(240, 240, 240),
	SiO2   = Color3.fromRGB(150, 180, 255),
	CaO    = Color3.fromRGB(240, 230, 200),
	CrVI   = Color3.fromRGB(0, 200, 50),
}

-- ══════════════════════════════════════════════
-- MAIN GUI
-- ══════════════════════════════════════════════

local gui = Instance.new("ScreenGui")
gui.Name = "MiniGameGui"
gui.Enabled = false
gui.ResetOnSpawn = false
gui.Parent = playerGui

-- Score + Timer header
local header = Instance.new("Frame")
header.Size = UDim2.new(0.6, 0, 0, 50)
header.Position = UDim2.new(0.2, 0, 0, 10)
header.BackgroundColor3 = Color3.fromRGB(10, 10, 5)
header.BackgroundTransparency = 0.2
header.BorderSizePixel = 0
header.Parent = gui
local hCorner = Instance.new("UICorner"); hCorner.CornerRadius = UDim.new(0, 8); hCorner.Parent = header

local titleLbl = Instance.new("TextLabel")
titleLbl.Size = UDim2.new(0.4, 0, 1, 0)
titleLbl.BackgroundTransparency = 1
titleLbl.Text = "HGMS SEPARATOR"
titleLbl.TextColor3 = Color3.fromRGB(220, 160, 60)
titleLbl.TextScaled = true
titleLbl.Font = Enum.Font.GothamBold
titleLbl.Parent = header

local scoreLbl = Instance.new("TextLabel")
scoreLbl.Name = "Score"
scoreLbl.Size = UDim2.new(0.3, 0, 1, 0)
scoreLbl.Position = UDim2.fromScale(0.4, 0)
scoreLbl.BackgroundTransparency = 1
scoreLbl.Text = "Score: 0"
scoreLbl.TextColor3 = Color3.fromRGB(255, 215, 0)
scoreLbl.TextScaled = true
scoreLbl.Font = Enum.Font.GothamBold
scoreLbl.Parent = header

local timerLbl = Instance.new("TextLabel")
timerLbl.Name = "Timer"
timerLbl.Size = UDim2.new(0.3, 0, 1, 0)
timerLbl.Position = UDim2.fromScale(0.7, 0)
timerLbl.BackgroundTransparency = 1
timerLbl.Text = "60s"
timerLbl.TextColor3 = Color3.fromRGB(255, 100, 100)
timerLbl.TextScaled = true
timerLbl.Font = Enum.Font.GothamBold
timerLbl.Parent = header

-- Sorting bins at bottom
local binBar = Instance.new("Frame")
binBar.Size = UDim2.new(0.8, 0, 0, 70)
binBar.Position = UDim2.new(0.1, 0, 1, -80)
binBar.BackgroundTransparency = 1
binBar.Parent = gui

local binLayout = Instance.new("UIListLayout")
binLayout.FillDirection = Enum.FillDirection.Horizontal
binLayout.Padding = UDim.new(0, 10)
binLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
binLayout.Parent = binBar

local function createBin(name, label, color, callback)
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.fromOffset(160, 60)
	btn.BackgroundColor3 = color
	btn.BackgroundTransparency = 0.3
	btn.Text = label
	btn.TextColor3 = Color3.fromRGB(255, 255, 255)
	btn.TextScaled = true
	btn.Font = Enum.Font.GothamBold
	btn.Parent = binBar

	local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, 10); c.Parent = btn
	local s = Instance.new("UIStroke"); s.Color = color; s.Thickness = 2; s.Parent = btn

	btn.Activated:Connect(callback)
	return btn
end

-- Track current orb for sorting
local currentOrbId = nil

createBin("magnetic", "MAGNETIC\n(Fe3O4)", BIN_COLORS.magnetic, function()
	if currentOrbId then
		Remotes.FireServer("RequestSortOrb", currentOrbId, "magnetic")
		currentOrbId = nil
	end
end)

createBin("valuable", "VALUABLE\n(V2O5/TiO2)", BIN_COLORS.valuable, function()
	if currentOrbId then
		Remotes.FireServer("RequestSortOrb", currentOrbId, "valuable")
		currentOrbId = nil
	end
end)

createBin("hazard", "HAZARD\n(Cr VI)", BIN_COLORS.hazard, function()
	if currentOrbId then
		Remotes.FireServer("RequestSortOrb", currentOrbId, "hazard")
		currentOrbId = nil
	end
end)

-- Incoming orb display (center)
local orbDisplay = Instance.new("Frame")
orbDisplay.Name = "OrbDisplay"
orbDisplay.Size = UDim2.fromOffset(120, 120)
orbDisplay.Position = UDim2.new(0.5, -60, 0.4, -60)
orbDisplay.BackgroundColor3 = Color3.fromRGB(100, 100, 100)
orbDisplay.BackgroundTransparency = 0.3
orbDisplay.BorderSizePixel = 0
orbDisplay.Visible = false
orbDisplay.Parent = gui

local orbCorner = Instance.new("UICorner"); orbCorner.CornerRadius = UDim.new(0.5, 0); orbCorner.Parent = orbDisplay
local orbStroke = Instance.new("UIStroke"); orbStroke.Thickness = 3; orbStroke.Parent = orbDisplay

local orbLabel = Instance.new("TextLabel")
orbLabel.Size = UDim2.fromScale(1, 0.5)
orbLabel.BackgroundTransparency = 1
orbLabel.Text = "?"
orbLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
orbLabel.TextScaled = true
orbLabel.Font = Enum.Font.GothamBold
orbLabel.Parent = orbDisplay

local orbName = Instance.new("TextLabel")
orbName.Size = UDim2.fromScale(1, 0.3)
orbName.Position = UDim2.fromScale(0, 0.6)
orbName.BackgroundTransparency = 1
orbName.Text = ""
orbName.TextColor3 = Color3.fromRGB(200, 200, 200)
orbName.TextScaled = true
orbName.Font = Enum.Font.Gotham
orbName.Parent = orbDisplay

-- ══════════════════════════════════════════════
-- pH SLIDER (bonus round)
-- ══════════════════════════════════════════════

local phFrame = Instance.new("Frame")
phFrame.Name = "PHSlider"
phFrame.Size = UDim2.new(0.6, 0, 0, 80)
phFrame.Position = UDim2.new(0.2, 0, 0.5, -40)
phFrame.BackgroundColor3 = Color3.fromRGB(10, 15, 10)
phFrame.BackgroundTransparency = 0.2
phFrame.BorderSizePixel = 0
phFrame.Visible = false
phFrame.Parent = gui

local phCorner = Instance.new("UICorner"); phCorner.CornerRadius = UDim.new(0, 8); phCorner.Parent = phFrame

local phTitle = Instance.new("TextLabel")
phTitle.Size = UDim2.new(1, 0, 0, 24)
phTitle.BackgroundTransparency = 1
phTitle.Text = "SET pH FOR: V2O5"
phTitle.TextColor3 = Color3.fromRGB(255, 200, 0)
phTitle.TextScaled = true
phTitle.Font = Enum.Font.GothamBold
phTitle.Parent = phFrame

-- pH value display
local phValue = Instance.new("TextLabel")
phValue.Name = "PHValue"
phValue.Size = UDim2.new(0.2, 0, 0, 30)
phValue.Position = UDim2.new(0.8, 0, 0, 24)
phValue.BackgroundTransparency = 1
phValue.Text = "7.0"
phValue.TextColor3 = Color3.fromRGB(255, 255, 255)
phValue.TextScaled = true
phValue.Font = Enum.Font.GothamBold
phValue.Parent = phFrame

-- Slider track
local sliderTrack = Instance.new("Frame")
sliderTrack.Size = UDim2.new(0.75, 0, 0, 8)
sliderTrack.Position = UDim2.new(0.025, 0, 0, 40)
sliderTrack.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
sliderTrack.BorderSizePixel = 0
sliderTrack.Parent = phFrame

local sliderGradient = Instance.new("UIGradient")
sliderGradient.Color = ColorSequence.new({
	ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 50, 50)),    -- pH 0 acid
	ColorSequenceKeypoint.new(0.5, Color3.fromRGB(50, 200, 50)),  -- pH 7 neutral
	ColorSequenceKeypoint.new(1, Color3.fromRGB(50, 50, 255)),    -- pH 14 base
})
sliderGradient.Parent = sliderTrack

-- Slider knob
local sliderKnob = Instance.new("Frame")
sliderKnob.Size = UDim2.fromOffset(16, 24)
sliderKnob.Position = UDim2.new(0.5, -8, 0.5, -12)
sliderKnob.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
sliderKnob.BorderSizePixel = 0
sliderKnob.Parent = sliderTrack
local knobCorner = Instance.new("UICorner"); knobCorner.CornerRadius = UDim.new(0, 4); knobCorner.Parent = sliderKnob

-- pH submit button
local phSubmit = Instance.new("TextButton")
phSubmit.Size = UDim2.new(0.2, 0, 0, 28)
phSubmit.Position = UDim2.new(0.4, 0, 0, 52)
phSubmit.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
phSubmit.Text = "SET"
phSubmit.TextColor3 = Color3.fromRGB(255, 255, 255)
phSubmit.TextScaled = true
phSubmit.Font = Enum.Font.GothamBold
phSubmit.Parent = phFrame
local phSubCorner = Instance.new("UICorner"); phSubCorner.CornerRadius = UDim.new(0, 6); phSubCorner.Parent = phSubmit

-- Slider drag logic
local dragging = false
local currentPH = 7.0
local currentMetal = "V2O5"

sliderTrack.InputBegan:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1
		or input.UserInputType == Enum.UserInputType.Touch then
		dragging = true
	end
end)

UserInputService.InputEnded:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1
		or input.UserInputType == Enum.UserInputType.Touch then
		dragging = false
	end
end)

UserInputService.InputChanged:Connect(function(input)
	if dragging and (input.UserInputType == Enum.UserInputType.MouseMovement
		or input.UserInputType == Enum.UserInputType.Touch) then
		local absPos = sliderTrack.AbsolutePosition
		local absSize = sliderTrack.AbsoluteSize
		local relX = math.clamp((input.Position.X - absPos.X) / absSize.X, 0, 1)
		sliderKnob.Position = UDim2.new(relX, -8, 0.5, -12)
		currentPH = math.floor(relX * 140) / 10 -- 0.0 to 14.0
		phValue.Text = string.format("%.1f", currentPH)
	end
end)

phSubmit.Activated:Connect(function()
	Remotes.FireServer("RequestSetPH", currentMetal, currentPH)
end)

-- ══════════════════════════════════════════════
-- EVENT HANDLERS
-- ══════════════════════════════════════════════

-- Mini-tutorial overlay shown once (#34)
local tutorialShown = false
local function showMiniTutorial()
	if tutorialShown then return end
	tutorialShown = true
	local tut = Instance.new("Frame")
	tut.Size = UDim2.new(0.5, 0, 0.3, 0)
	tut.Position = UDim2.new(0.25, 0, 0.35, 0)
	tut.BackgroundColor3 = Color3.fromRGB(10, 15, 30)
	tut.BackgroundTransparency = 0.1
	tut.Parent = gui
	local tc = Instance.new("UICorner"); tc.CornerRadius = UDim.new(0, 12); tc.Parent = tut
	local tl = Instance.new("TextLabel")
	tl.Size = UDim2.new(1, -20, 1, -10)
	tl.Position = UDim2.new(0, 10, 0, 5)
	tl.BackgroundTransparency = 1
	tl.Text = "HGMS MINERAL SORTING\n\nMinerals arrive on the conveyor.\nDrag or click to sort into bins:\n  RED = Magnetic (Fe3O4)\n  GOLD = Valuable (V2O5, TiO2)\n  GREEN = Hazardous (Cr(VI))\n\nSort correctly to earn MolCoins!"
	tl.TextColor3 = Color3.fromRGB(200, 220, 255)
	tl.TextScaled = true
	tl.Font = Enum.Font.GothamBold
	tl.TextWrapped = true
	tl.Parent = tut
	task.delay(5, function() tut:Destroy() end)
end

-- New orb spawned on conveyor
Remotes.MiniGameOrbSpawned.OnClientEvent:Connect(function(data)
	if not gui.Enabled then
		gui.Enabled = true
		showMiniTutorial()
	end

	currentOrbId = data.orbId
	local color = MINERAL_COLORS[data.mineralType] or Color3.fromRGB(150, 150, 150)

	orbDisplay.Visible = true
	orbDisplay.BackgroundColor3 = color
	orbStroke.Color = color
	orbLabel.Text = data.mineralType or "?"
	orbName.Text = data.mineralName or ""

	-- Animate orb in
	orbDisplay.Size = UDim2.fromOffset(0, 0)
	orbDisplay.Position = UDim2.new(0.5, 0, 0.4, 0)
	TweenService:Create(orbDisplay, TweenInfo.new(0.3, Enum.EasingStyle.Back), {
		Size = UDim2.fromOffset(120, 120),
		Position = UDim2.new(0.5, -60, 0.4, -60),
	}):Play()
end)

-- pH round
Remotes.MiniGamePHRound.OnClientEvent:Connect(function(data)
	if data and data.metal then
		currentMetal = data.metal
		phTitle.Text = "SET pH FOR: " .. data.metal
		phFrame.Visible = true
		-- Reset slider
		currentPH = 7.0
		sliderKnob.Position = UDim2.new(0.5, -8, 0.5, -12)
		phValue.Text = "7.0"
	end
end)

-- Game result
Remotes.MiniGameResult.OnClientEvent:Connect(function(data)
	-- Hide game UI
	orbDisplay.Visible = false
	phFrame.Visible = false

	-- Show result popup
	local popup = Instance.new("Frame")
	popup.Size = UDim2.fromOffset(350, 180)
	popup.Position = UDim2.new(0.5, -175, 0.3, 0)
	popup.BackgroundColor3 = Color3.fromRGB(10, 20, 12)
	popup.BackgroundTransparency = 0.1
	popup.BorderSizePixel = 0
	popup.Parent = gui

	local pc = Instance.new("UICorner"); pc.CornerRadius = UDim.new(0, 12); pc.Parent = popup
	local ps = Instance.new("UIStroke"); ps.Color = Color3.fromRGB(255, 215, 0); ps.Thickness = 2; ps.Parent = popup

	local resultTitle = Instance.new("TextLabel")
	resultTitle.Size = UDim2.new(1, 0, 0, 40)
	resultTitle.BackgroundTransparency = 1
	resultTitle.Text = "ROUND COMPLETE"
	resultTitle.TextColor3 = Color3.fromRGB(255, 215, 0)
	resultTitle.TextScaled = true
	resultTitle.Font = Enum.Font.GothamBold
	resultTitle.Parent = popup

	local scoreText = Instance.new("TextLabel")
	scoreText.Size = UDim2.new(1, 0, 0, 30)
	scoreText.Position = UDim2.fromOffset(0, 40)
	scoreText.BackgroundTransparency = 1
	scoreText.Text = "Score: " .. (data.score or 0) .. " — " .. (data.rank or "Apprentice")
	scoreText.TextColor3 = Color3.fromRGB(200, 230, 210)
	scoreText.TextScaled = true
	scoreText.Font = Enum.Font.Gotham
	scoreText.Parent = popup

	local rewardText = Instance.new("TextLabel")
	rewardText.Size = UDim2.new(1, 0, 0, 30)
	rewardText.Position = UDim2.fromOffset(0, 70)
	rewardText.BackgroundTransparency = 1
	rewardText.Text = "+" .. (data.molCoins or 0) .. " MolCoins"
	rewardText.TextColor3 = Color3.fromRGB(255, 215, 0)
	rewardText.TextScaled = true
	rewardText.Font = Enum.Font.GothamBold
	rewardText.Parent = popup

	if data.badge then
		local badgeText = Instance.new("TextLabel")
		badgeText.Size = UDim2.new(1, 0, 0, 24)
		badgeText.Position = UDim2.fromOffset(0, 105)
		badgeText.BackgroundTransparency = 1
		badgeText.Text = "BADGE UNLOCKED: " .. data.badge
		badgeText.TextColor3 = Color3.fromRGB(168, 85, 247)
		badgeText.TextScaled = true
		badgeText.Font = Enum.Font.GothamBold
		badgeText.Parent = popup
	end

	-- Dismiss after 5 seconds
	task.delay(5, function()
		popup:Destroy()
		gui.Enabled = false
	end)
end)

-- Update score/timer from server
local function updateHUD(score, timeLeft)
	scoreLbl.Text = "Score: " .. tostring(score)
	timerLbl.Text = tostring(timeLeft) .. "s"
	if timeLeft <= 10 then
		timerLbl.TextColor3 = Color3.fromRGB(255, 50, 50)
	end
end

-- Listen for score updates via ServerAnnounce with special miniGame flag
Remotes.ServerAnnounce.OnClientEvent:Connect(function(data)
	if data and data.miniGameScore then
		updateHUD(data.miniGameScore, data.miniGameTimer or 0)
	end
end)

print("[MOLGANG] MiniGameGui initialized")
