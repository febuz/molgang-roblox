--[[
	CommissioningGui.client.lua (was QuantumRacingGui)
	MOLGANG — Plant Commissioning & Startup Interface

	Browse commissioning phases, complete checklists, run test batches.
	Realistic chemical plant startup procedures.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local Commissioning = require(ReplicatedStorage.Modules.QuantumRacing) -- module renamed internally

local C = {
	bg = Color3.fromRGB(8, 10, 16),
	panel = Color3.fromRGB(18, 22, 32),
	accent = Color3.fromRGB(0, 160, 220),
	green = Color3.fromRGB(0, 200, 100),
	red = Color3.fromRGB(220, 60, 60),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(230, 235, 245),
	textDim = Color3.fromRGB(130, 145, 170),
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
main.Size = UDim2.new(0, 620, 0, 520)
main.Position = UDim2.new(0.5, -310, 0.5, -260)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.05
main.Parent = screenGui
corner(main, 14)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 46)
title.BackgroundColor3 = Color3.fromRGB(5, 7, 12)
title.Text = "PLANT COMMISSIONING & STARTUP"
title.TextColor3 = C.accent
title.TextScaled = true
title.Font = Enum.Font.GothamBold
title.Parent = main
corner(title, 14)

local subtitle = Instance.new("TextLabel")
subtitle.Size = UDim2.new(0.6, 0, 0, 14)
subtitle.Position = UDim2.new(0, 10, 0, 32)
subtitle.BackgroundTransparency = 1
subtitle.Text = "Follow real engineering startup procedures"
subtitle.TextColor3 = C.textDim
subtitle.TextScaled = true
subtitle.Font = Enum.Font.Gotham
subtitle.TextXAlignment = Enum.TextXAlignment.Left
subtitle.Parent = main

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 55, 0, 30)
closeBtn.Position = UDim2.new(1, -65, 0, 8)
closeBtn.BackgroundColor3 = C.red
closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = title
corner(closeBtn, 6)
closeBtn.MouseButton1Click:Connect(function() screenGui.Enabled = false end)

-- Phase cards
local trackScroll = Instance.new("ScrollingFrame")
trackScroll.Size = UDim2.new(1, -16, 1, -68)
trackScroll.Position = UDim2.new(0, 8, 0, 52)
trackScroll.BackgroundTransparency = 1
trackScroll.ScrollBarThickness = 6
trackScroll.Parent = main

local trackLayout = Instance.new("UIListLayout")
trackLayout.Padding = UDim.new(0, 10)
trackLayout.Parent = trackScroll

local diffColors = {easy = C.easy, medium = C.medium, hard = C.hard, extreme = C.extreme}

for _, track in ipairs(Commissioning.Tracks) do
	local card = Instance.new("Frame")
	card.Size = UDim2.new(1, -8, 0, 105)
	card.BackgroundColor3 = C.panel
	card.Parent = trackScroll
	corner(card, 10)

	-- Phase stripe
	local stripe = Instance.new("Frame")
	stripe.Size = UDim2.new(0, 6, 0.9, 0)
	stripe.Position = UDim2.new(0, 5, 0.05, 0)
	stripe.BackgroundColor3 = diffColors[track.difficulty] or C.accent
	stripe.Parent = card
	corner(stripe, 3)

	-- Phase name
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(0.55, -20, 0, 22)
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
	diffBadge.Size = UDim2.new(0, 70, 0, 16)
	diffBadge.Position = UDim2.new(0, 18, 0, 28)
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
	desc.Size = UDim2.new(0.6, -20, 0, 18)
	desc.Position = UDim2.new(0, 18, 0, 48)
	desc.BackgroundTransparency = 1
	desc.Text = track.description
	desc.TextColor3 = C.textDim
	desc.TextScaled = true
	desc.Font = Enum.Font.Gotham
	desc.TextWrapped = true
	desc.TextXAlignment = Enum.TextXAlignment.Left
	desc.Parent = card

	-- Checklist preview
	if track.checklist then
		local checkText = ""
		for ci = 1, math.min(3, #track.checklist) do
			checkText = checkText .. "- " .. track.checklist[ci] .. "\n"
		end
		if #track.checklist > 3 then
			checkText = checkText .. "  +" .. (#track.checklist - 3) .. " more items..."
		end
		local checkLabel = Instance.new("TextLabel")
		checkLabel.Size = UDim2.new(0.6, -20, 0, 30)
		checkLabel.Position = UDim2.new(0, 18, 0, 68)
		checkLabel.BackgroundTransparency = 1
		checkLabel.Text = checkText
		checkLabel.TextColor3 = Color3.fromRGB(100, 160, 120)
		checkLabel.TextScaled = true
		checkLabel.Font = Enum.Font.Gotham
		checkLabel.TextWrapped = true
		checkLabel.TextXAlignment = Enum.TextXAlignment.Left
		checkLabel.TextYAlignment = Enum.TextYAlignment.Top
		checkLabel.Parent = card
	end

	-- Stats
	local statsLabel = Instance.new("TextLabel")
	statsLabel.Size = UDim2.new(0.18, 0, 0.7, 0)
	statsLabel.Position = UDim2.new(0.58, 0, 0.15, 0)
	statsLabel.BackgroundTransparency = 1
	statsLabel.Text = track.quantumDots .. " items\n" .. track.timeLimit .. "s limit\n" .. track.obstacles .. " issues"
	statsLabel.TextColor3 = C.textDim
	statsLabel.TextScaled = true
	statsLabel.Font = Enum.Font.Gotham
	statsLabel.Parent = card

	-- Reward
	local rewardLabel = Instance.new("TextLabel")
	rewardLabel.Size = UDim2.new(0, 80, 0, 18)
	rewardLabel.Position = UDim2.new(0.78, 0, 0, 8)
	rewardLabel.BackgroundTransparency = 1
	rewardLabel.Text = track.reward .. " MC"
	rewardLabel.TextColor3 = C.gold
	rewardLabel.TextScaled = true
	rewardLabel.Font = Enum.Font.GothamBold
	rewardLabel.Parent = card

	-- Start button
	local startBtn = Instance.new("TextButton")
	startBtn.Size = UDim2.new(0, 85, 0, 34)
	startBtn.Position = UDim2.new(0.78, 0, 0.45, 0)
	startBtn.BackgroundColor3 = track.unlockCost == 0 and C.green or C.accent
	startBtn.Text = track.unlockCost == 0 and "START" or track.unlockCost .. " MC"
	startBtn.TextColor3 = Color3.new(1,1,1)
	startBtn.TextScaled = true
	startBtn.Font = Enum.Font.GothamBold
	startBtn.Parent = card
	corner(startBtn, 6)

	startBtn.MouseButton1Click:Connect(function()
		local r = Remotes:FindFirstChild("RequestStartRace")
		if r then r:FireServer(track.id) end
		screenGui.Enabled = false
	end)
end

trackScroll.CanvasSize = UDim2.new(0, 0, 0, #Commissioning.Tracks * 115)

print("[MOLGANG] CommissioningGui loaded — 4 plant startup phases")
