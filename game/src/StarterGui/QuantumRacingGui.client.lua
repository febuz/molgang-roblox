--[[
	QuantumRacingGui.client.lua
	MOLGANG — Quantum Racing Track Interface

	Browse tracks, start races, view scores.
	Race through quantum tunnels collecting quantum dots!
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local QuantumRacing = require(ReplicatedStorage.Modules.QuantumRacing)

local C = {
	bg = Color3.fromRGB(5, 8, 20),
	panel = Color3.fromRGB(15, 20, 40),
	accent = Color3.fromRGB(80, 200, 255),
	green = Color3.fromRGB(0, 200, 100),
	red = Color3.fromRGB(220, 60, 60),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(230, 235, 250),
	textDim = Color3.fromRGB(120, 140, 180),
	easy = Color3.fromRGB(0, 200, 100),
	medium = Color3.fromRGB(255, 200, 0),
	hard = Color3.fromRGB(255, 100, 50),
	extreme = Color3.fromRGB(255, 50, 100),
}

local function corner(o, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = o end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "QuantumRacingGui"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 21
screenGui.Enabled = false
screenGui.Parent = playerGui

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 600, 0, 480)
main.Position = UDim2.new(0.5, -300, 0.5, -240)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.05
main.Parent = screenGui
corner(main, 14)

-- Title with neon glow effect
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 50)
title.BackgroundColor3 = Color3.fromRGB(3, 5, 15)
title.Text = "QUANTUM RACING"
title.TextColor3 = C.accent
title.TextScaled = true
title.Font = Enum.Font.GothamBold
title.Parent = main
corner(title, 14)

local subtitle = Instance.new("TextLabel")
subtitle.Size = UDim2.new(0.5, 0, 0, 16)
subtitle.Position = UDim2.new(0, 10, 0, 35)
subtitle.BackgroundTransparency = 1
subtitle.Text = "Race through quantum tunnels!"
subtitle.TextColor3 = C.textDim
subtitle.TextScaled = true
subtitle.Font = Enum.Font.Gotham
subtitle.TextXAlignment = Enum.TextXAlignment.Left
subtitle.Parent = main

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 55, 0, 30)
closeBtn.Position = UDim2.new(1, -65, 0, 10)
closeBtn.BackgroundColor3 = C.red
closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = title
corner(closeBtn, 6)
closeBtn.MouseButton1Click:Connect(function() screenGui.Enabled = false end)

-- Track cards
local trackScroll = Instance.new("ScrollingFrame")
trackScroll.Size = UDim2.new(1, -16, 1, -120)
trackScroll.Position = UDim2.new(0, 8, 0, 58)
trackScroll.BackgroundTransparency = 1
trackScroll.ScrollBarThickness = 6
trackScroll.Parent = main

local trackLayout = Instance.new("UIListLayout")
trackLayout.Padding = UDim.new(0, 10)
trackLayout.Parent = trackScroll

local diffColors = {easy = C.easy, medium = C.medium, hard = C.hard, extreme = C.extreme}

for _, track in ipairs(QuantumRacing.Tracks) do
	local card = Instance.new("Frame")
	card.Size = UDim2.new(1, -8, 0, 90)
	card.BackgroundColor3 = C.panel
	card.Parent = trackScroll
	corner(card, 10)

	-- Difficulty stripe
	local stripe = Instance.new("Frame")
	stripe.Size = UDim2.new(0, 6, 0.85, 0)
	stripe.Position = UDim2.new(0, 5, 0.075, 0)
	stripe.BackgroundColor3 = diffColors[track.difficulty] or C.accent
	stripe.Parent = card
	corner(stripe, 3)

	-- Track name
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(0.5, -20, 0, 24)
	nameLabel.Position = UDim2.new(0, 18, 0, 6)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = track.name
	nameLabel.TextColor3 = C.text
	nameLabel.TextScaled = true
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.TextXAlignment = Enum.TextXAlignment.Left
	nameLabel.Parent = card

	-- Difficulty badge
	local diffBadge = Instance.new("TextLabel")
	diffBadge.Size = UDim2.new(0, 70, 0, 18)
	diffBadge.Position = UDim2.new(0, 18, 0, 30)
	diffBadge.BackgroundColor3 = diffColors[track.difficulty] or C.accent
	diffBadge.BackgroundTransparency = 0.3
	diffBadge.Text = track.difficulty:upper()
	diffBadge.TextColor3 = Color3.new(1,1,1)
	diffBadge.TextScaled = true
	diffBadge.Font = Enum.Font.GothamBold
	diffBadge.Parent = card
	corner(diffBadge, 4)

	-- Description
	local desc = Instance.new("TextLabel")
	desc.Size = UDim2.new(0.6, -20, 0, 28)
	desc.Position = UDim2.new(0, 18, 0, 52)
	desc.BackgroundTransparency = 1
	desc.Text = track.description
	desc.TextColor3 = C.textDim
	desc.TextScaled = true
	desc.Font = Enum.Font.Gotham
	desc.TextWrapped = true
	desc.TextXAlignment = Enum.TextXAlignment.Left
	desc.Parent = card

	-- Stats (right side)
	local statsLabel = Instance.new("TextLabel")
	statsLabel.Size = UDim2.new(0.22, 0, 0.8, 0)
	statsLabel.Position = UDim2.new(0.55, 0, 0.1, 0)
	statsLabel.BackgroundTransparency = 1
	statsLabel.Text = track.length .. "m\n" .. track.timeLimit .. "s\n" .. track.quantumDots .. " dots"
	statsLabel.TextColor3 = C.textDim
	statsLabel.TextScaled = true
	statsLabel.Font = Enum.Font.Gotham
	statsLabel.Parent = card

	-- Reward
	local rewardLabel = Instance.new("TextLabel")
	rewardLabel.Size = UDim2.new(0, 80, 0, 20)
	rewardLabel.Position = UDim2.new(0.77, 0, 0, 8)
	rewardLabel.BackgroundTransparency = 1
	rewardLabel.Text = track.reward .. " MC"
	rewardLabel.TextColor3 = C.gold
	rewardLabel.TextScaled = true
	rewardLabel.Font = Enum.Font.GothamBold
	rewardLabel.Parent = card

	-- Start button
	local startBtn = Instance.new("TextButton")
	startBtn.Size = UDim2.new(0, 80, 0, 32)
	startBtn.Position = UDim2.new(0.77, 0, 0.5, -4)
	startBtn.BackgroundColor3 = track.unlockCost == 0 and C.green or C.accent
	startBtn.Text = track.unlockCost == 0 and "RACE!" or track.unlockCost .. " MC"
	startBtn.TextColor3 = Color3.new(1,1,1)
	startBtn.TextScaled = true
	startBtn.Font = Enum.Font.GothamBold
	startBtn.Parent = card
	corner(startBtn, 6)

	startBtn.MouseButton1Click:Connect(function()
		-- In teaser: show "Coming Soon" for non-free tracks
		if track.unlockCost > 0 then
			local s = SoundService:FindFirstChild("ui_click")
			if s then local c = s:Clone(); c.Parent = SoundService; c:Play(); c.Ended:Connect(function() c:Destroy() end) end
			startBtn.Text = "SOON!"
			task.delay(1.5, function() startBtn.Text = track.unlockCost .. " MC" end)
		else
			-- Start the free intro race
			local r = Remotes:FindFirstChild("RequestStartRace")
			if r then r:FireServer(track.id) end
			screenGui.Enabled = false
		end
	end)
end

trackScroll.CanvasSize = UDim2.new(0, 0, 0, #QuantumRacing.Tracks * 100)

-- Power-ups legend
local powerLabel = Instance.new("TextLabel")
powerLabel.Size = UDim2.new(1, -16, 0, 50)
powerLabel.Position = UDim2.new(0, 8, 1, -58)
powerLabel.BackgroundColor3 = C.panel
powerLabel.BackgroundTransparency = 0.5
powerLabel.Text = "Power-ups: Photon Boost (2x speed) | Electron Shield (immunity) | Quantum Magnet (attract dots) | Phase Shift (through walls)"
powerLabel.TextColor3 = C.textDim
powerLabel.TextScaled = true
powerLabel.TextWrapped = true
powerLabel.Font = Enum.Font.Gotham
powerLabel.Parent = main
corner(powerLabel, 6)

print("[MOLGANG] QuantumRacingGui loaded — 4 quantum race tracks")
