--[[
	SuperheroGui.client.lua
	MOLGANG — Superhero Adventure Interface

	Choose element heroes, view missions, track progress.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local SuperheroTrack = require(ReplicatedStorage.Modules.SuperheroTrack)

local C = {
	bg = Color3.fromRGB(15, 5, 10),
	panel = Color3.fromRGB(30, 12, 22),
	accent = Color3.fromRGB(255, 80, 120),
	green = Color3.fromRGB(0, 200, 100),
	gold = Color3.fromRGB(255, 215, 0),
	red = Color3.fromRGB(220, 60, 60),
	text = Color3.fromRGB(240, 230, 240),
	textDim = Color3.fromRGB(160, 130, 150),
}

local function corner(o, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = o end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "SuperheroGui"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 22
screenGui.Enabled = false
screenGui.Parent = playerGui

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 620, 0, 500)
main.Position = UDim2.new(0.5, -310, 0.5, -250)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.05
main.Parent = screenGui
corner(main, 14)

-- Title
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 46)
title.BackgroundColor3 = Color3.fromRGB(10, 3, 8)
title.Text = "SUPERHERO ADVENTURE"
title.TextColor3 = C.accent
title.TextScaled = true
title.Font = Enum.Font.GothamBold
title.Parent = main
corner(title, 14)

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 55, 0, 30)
closeBtn.Position = UDim2.new(1, -63, 0, 8)
closeBtn.BackgroundColor3 = C.red
closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = title
corner(closeBtn, 6)
closeBtn.MouseButton1Click:Connect(function() screenGui.Enabled = false end)

-- Heroes section
local heroLabel = Instance.new("TextLabel")
heroLabel.Size = UDim2.new(1, -16, 0, 22)
heroLabel.Position = UDim2.new(0, 8, 0, 50)
heroLabel.BackgroundTransparency = 1
heroLabel.Text = "Choose Your Hero"
heroLabel.TextColor3 = C.accent
heroLabel.TextScaled = true
heroLabel.Font = Enum.Font.GothamBold
heroLabel.TextXAlignment = Enum.TextXAlignment.Left
heroLabel.Parent = main

local heroFrame = Instance.new("Frame")
heroFrame.Size = UDim2.new(1, -16, 0, 130)
heroFrame.Position = UDim2.new(0, 8, 0, 75)
heroFrame.BackgroundTransparency = 1
heroFrame.Parent = main

for i, hero in ipairs(SuperheroTrack.Heroes) do
	local card = Instance.new("Frame")
	card.Size = UDim2.new(1/#SuperheroTrack.Heroes, -6, 1, 0)
	card.Position = UDim2.new((i-1)/#SuperheroTrack.Heroes, 3, 0, 0)
	card.BackgroundColor3 = C.panel
	card.Parent = heroFrame
	corner(card, 8)

	-- Hero color accent
	local accent = Instance.new("Frame")
	accent.Size = UDim2.new(1, 0, 0, 4)
	accent.BackgroundColor3 = hero.color
	accent.Parent = card
	corner(accent, 4)

	-- Element symbol
	local elemLabel = Instance.new("TextLabel")
	elemLabel.Size = UDim2.new(1, 0, 0, 30)
	elemLabel.Position = UDim2.new(0, 0, 0, 8)
	elemLabel.BackgroundTransparency = 1
	elemLabel.Text = hero.element
	elemLabel.TextColor3 = hero.color
	elemLabel.TextScaled = true
	elemLabel.Font = Enum.Font.GothamBold
	elemLabel.Parent = card

	-- Name
	local nameL = Instance.new("TextLabel")
	nameL.Size = UDim2.new(1, -4, 0, 18)
	nameL.Position = UDim2.new(0, 2, 0, 38)
	nameL.BackgroundTransparency = 1
	nameL.Text = hero.name
	nameL.TextColor3 = C.text
	nameL.TextScaled = true
	nameL.Font = Enum.Font.GothamBold
	nameL.Parent = card

	-- Unlock requirement
	local unlockL = Instance.new("TextLabel")
	unlockL.Size = UDim2.new(1, -4, 0, 14)
	unlockL.Position = UDim2.new(0, 2, 0, 58)
	unlockL.BackgroundTransparency = 1
	unlockL.Text = hero.unlockAtoms .. "x " .. hero.element .. " atoms"
	unlockL.TextColor3 = C.textDim
	unlockL.TextScaled = true
	unlockL.Font = Enum.Font.Gotham
	unlockL.Parent = card

	-- Abilities list (compact)
	local abText = ""
	for _, ab in ipairs(hero.abilities) do
		abText = abText .. ab.name .. "\n"
	end
	local abL = Instance.new("TextLabel")
	abL.Size = UDim2.new(1, -4, 0, 40)
	abL.Position = UDim2.new(0, 2, 0, 76)
	abL.BackgroundTransparency = 1
	abL.Text = abText
	abL.TextColor3 = C.textDim
	abL.TextScaled = true
	abL.Font = Enum.Font.Gotham
	abL.TextWrapped = true
	abL.Parent = card

	-- Select button
	local selBtn = Instance.new("TextButton")
	selBtn.Size = UDim2.new(0.8, 0, 0, 20)
	selBtn.Position = UDim2.new(0.1, 0, 1, -24)
	selBtn.BackgroundColor3 = hero.color
	selBtn.Text = "Select"
	selBtn.TextColor3 = Color3.new(0,0,0)
	selBtn.TextScaled = true
	selBtn.Font = Enum.Font.GothamBold
	selBtn.Parent = card
	corner(selBtn, 4)

	selBtn.MouseButton1Click:Connect(function()
		local s = SoundService:FindFirstChild("ui_click")
		if s then local c = s:Clone(); c.Parent = SoundService; c:Play(); c.Ended:Connect(function() c:Destroy() end) end
		-- In teaser: show hero selected message
		heroLabel.Text = "Selected: " .. hero.name .. "!"
		heroLabel.TextColor3 = hero.color
	end)
end

-- Missions section
local missLabel = Instance.new("TextLabel")
missLabel.Size = UDim2.new(1, -16, 0, 22)
missLabel.Position = UDim2.new(0, 8, 0, 215)
missLabel.BackgroundTransparency = 1
missLabel.Text = "Story Missions"
missLabel.TextColor3 = C.gold
missLabel.TextScaled = true
missLabel.Font = Enum.Font.GothamBold
missLabel.TextXAlignment = Enum.TextXAlignment.Left
missLabel.Parent = main

local missionScroll = Instance.new("ScrollingFrame")
missionScroll.Size = UDim2.new(1, -16, 0, 230)
missionScroll.Position = UDim2.new(0, 8, 0, 240)
missionScroll.BackgroundTransparency = 1
missionScroll.ScrollBarThickness = 4
missionScroll.Parent = main

local missLayout = Instance.new("UIListLayout")
missLayout.Padding = UDim.new(0, 8)
missLayout.Parent = missionScroll

local diffMap = {easy = C.green, medium = C.gold, hard = Color3.fromRGB(255, 100, 50), extreme = C.red}

for _, mission in ipairs(SuperheroTrack.Missions) do
	local villain = nil
	for _, v in ipairs(SuperheroTrack.Villains) do
		if v.id == mission.villain then villain = v; break end
	end

	local mCard = Instance.new("Frame")
	mCard.Size = UDim2.new(1, -4, 0, 60)
	mCard.BackgroundColor3 = C.panel
	mCard.Parent = missionScroll
	corner(mCard, 8)

	-- Mission name
	local mName = Instance.new("TextLabel")
	mName.Size = UDim2.new(0.55, -8, 0, 22)
	mName.Position = UDim2.new(0, 8, 0, 4)
	mName.BackgroundTransparency = 1
	mName.Text = mission.name
	mName.TextColor3 = C.text
	mName.TextScaled = true
	mName.Font = Enum.Font.GothamBold
	mName.TextXAlignment = Enum.TextXAlignment.Left
	mName.Parent = mCard

	-- Description
	local mDesc = Instance.new("TextLabel")
	mDesc.Size = UDim2.new(0.65, -8, 0, 28)
	mDesc.Position = UDim2.new(0, 8, 0, 26)
	mDesc.BackgroundTransparency = 1
	mDesc.Text = mission.description
	mDesc.TextColor3 = C.textDim
	mDesc.TextScaled = true
	mDesc.Font = Enum.Font.Gotham
	mDesc.TextWrapped = true
	mDesc.TextXAlignment = Enum.TextXAlignment.Left
	mDesc.Parent = mCard

	-- Difficulty + reward
	local mInfo = Instance.new("TextLabel")
	mInfo.Size = UDim2.new(0.15, 0, 0, 18)
	mInfo.Position = UDim2.new(0.55, 0, 0, 6)
	mInfo.BackgroundColor3 = diffMap[mission.difficulty] or C.accent
	mInfo.BackgroundTransparency = 0.3
	mInfo.Text = mission.difficulty:upper()
	mInfo.TextColor3 = Color3.new(1,1,1)
	mInfo.TextScaled = true
	mInfo.Font = Enum.Font.GothamBold
	mInfo.Parent = mCard
	corner(mInfo, 4)

	local mReward = Instance.new("TextLabel")
	mReward.Size = UDim2.new(0.15, 0, 0, 18)
	mReward.Position = UDim2.new(0.55, 0, 0, 28)
	mReward.BackgroundTransparency = 1
	mReward.Text = mission.reward .. " MC"
	mReward.TextColor3 = C.gold
	mReward.TextScaled = true
	mReward.Font = Enum.Font.GothamBold
	mReward.Parent = mCard

	-- Start button
	local sBtn = Instance.new("TextButton")
	sBtn.Size = UDim2.new(0.2, 0, 0.7, 0)
	sBtn.Position = UDim2.new(0.78, 0, 0.15, 0)
	sBtn.BackgroundColor3 = C.accent
	sBtn.Text = "FIGHT!"
	sBtn.TextColor3 = Color3.new(1,1,1)
	sBtn.TextScaled = true
	sBtn.Font = Enum.Font.GothamBold
	sBtn.Parent = mCard
	corner(sBtn, 6)

	sBtn.MouseButton1Click:Connect(function()
		sBtn.Text = "SOON!"
		task.delay(1.5, function() sBtn.Text = "FIGHT!" end)
	end)
end

missionScroll.CanvasSize = UDim2.new(0, 0, 0, #SuperheroTrack.Missions * 68)

print("[MOLGANG] SuperheroGui loaded — 4 heroes, 4 missions")
