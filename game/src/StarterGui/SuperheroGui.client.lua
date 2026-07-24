--[[
	SafetyResponseGui.client.lua (was SuperheroGui)
	MOLGANG — HSE Safety & Emergency Response Interface

	Choose HSE role, view incident missions, respond to emergencies.
	Realistic chemical plant safety training.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local SafetyTrack = require(ReplicatedStorage.Modules.SuperheroTrack) -- module renamed internally

local C = {
	bg = Color3.fromRGB(10, 10, 15),
	panel = Color3.fromRGB(20, 22, 30),
	accent = Color3.fromRGB(255, 160, 0),
	green = Color3.fromRGB(0, 200, 100),
	gold = Color3.fromRGB(255, 215, 0),
	red = Color3.fromRGB(220, 60, 60),
	text = Color3.fromRGB(235, 235, 240),
	textDim = Color3.fromRGB(150, 150, 165),
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
title.BackgroundColor3 = Color3.fromRGB(8, 8, 12)
title.Text = "HSE — SAFETY & EMERGENCY RESPONSE"
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
closeBtn.Activated:Connect(function() screenGui.Enabled = false end)

-- Roles section
local roleLabel = Instance.new("TextLabel")
roleLabel.Size = UDim2.new(1, -16, 0, 22)
roleLabel.Position = UDim2.new(0, 8, 0, 50)
roleLabel.BackgroundTransparency = 1
roleLabel.Text = "Select Your HSE Role"
roleLabel.TextColor3 = C.accent
roleLabel.TextScaled = true
roleLabel.Font = Enum.Font.GothamBold
roleLabel.TextXAlignment = Enum.TextXAlignment.Left
roleLabel.Parent = main

local heroFrame = Instance.new("Frame")
heroFrame.Size = UDim2.new(1, -16, 0, 130)
heroFrame.Position = UDim2.new(0, 8, 0, 75)
heroFrame.BackgroundTransparency = 1
heroFrame.Parent = main

for i, hero in ipairs(SafetyTrack.Heroes) do
	local card = Instance.new("Frame")
	card.Size = UDim2.new(1/#SafetyTrack.Heroes, -6, 1, 0)
	card.Position = UDim2.new((i-1)/#SafetyTrack.Heroes, 3, 0, 0)
	card.BackgroundColor3 = C.panel
	card.Parent = heroFrame
	corner(card, 8)

	local accent = Instance.new("Frame")
	accent.Size = UDim2.new(1, 0, 0, 4)
	accent.BackgroundColor3 = hero.color
	accent.Parent = card
	corner(accent, 4)

	-- Role icon (element)
	local elemLabel = Instance.new("TextLabel")
	elemLabel.Size = UDim2.new(1, 0, 0, 26)
	elemLabel.Position = UDim2.new(0, 0, 0, 8)
	elemLabel.BackgroundTransparency = 1
	elemLabel.Text = hero.element
	elemLabel.TextColor3 = hero.color
	elemLabel.TextScaled = true
	elemLabel.Font = Enum.Font.GothamBold
	elemLabel.Parent = card

	local nameL = Instance.new("TextLabel")
	nameL.Size = UDim2.new(1, -4, 0, 16)
	nameL.Position = UDim2.new(0, 2, 0, 34)
	nameL.BackgroundTransparency = 1
	nameL.Text = hero.name
	nameL.TextColor3 = C.text
	nameL.TextScaled = true
	nameL.Font = Enum.Font.GothamBold
	nameL.Parent = card

	-- Skills
	local abText = ""
	for _, ab in ipairs(hero.abilities) do
		abText = abText .. ab.name .. "\n"
	end
	local abL = Instance.new("TextLabel")
	abL.Size = UDim2.new(1, -4, 0, 44)
	abL.Position = UDim2.new(0, 2, 0, 54)
	abL.BackgroundTransparency = 1
	abL.Text = abText
	abL.TextColor3 = C.textDim
	abL.TextScaled = true
	abL.Font = Enum.Font.Gotham
	abL.TextWrapped = true
	abL.Parent = card

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

	selBtn.Activated:Connect(function()
		local s = SoundService:FindFirstChild("ui_click")
		if s then local c = s:Clone(); c.Parent = SoundService; c:Play(); c.Ended:Connect(function() c:Destroy() end) end
		local r = Remotes:FindFirstChild("RequestSelectHero")
		if r then r:FireServer(hero.id) end
		roleLabel.Text = "Role: " .. hero.name
		roleLabel.TextColor3 = hero.color
	end)
end

-- Incidents section
local missLabel = Instance.new("TextLabel")
missLabel.Size = UDim2.new(1, -16, 0, 22)
missLabel.Position = UDim2.new(0, 8, 0, 215)
missLabel.BackgroundTransparency = 1
missLabel.Text = "Active Incidents"
missLabel.TextColor3 = C.red
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

local sevMap = {easy = C.green, medium = C.gold, hard = Color3.fromRGB(255, 100, 50), extreme = C.red}

for _, mission in ipairs(SafetyTrack.Missions) do
	local mCard = Instance.new("Frame")
	mCard.Size = UDim2.new(1, -4, 0, 60)
	mCard.BackgroundColor3 = C.panel
	mCard.Parent = missionScroll
	corner(mCard, 8)

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

	local mSev = Instance.new("TextLabel")
	mSev.Size = UDim2.new(0.15, 0, 0, 18)
	mSev.Position = UDim2.new(0.55, 0, 0, 6)
	mSev.BackgroundColor3 = sevMap[mission.difficulty] or C.accent
	mSev.BackgroundTransparency = 0.3
	mSev.Text = mission.difficulty:upper()
	mSev.TextColor3 = Color3.new(1,1,1)
	mSev.TextScaled = true
	mSev.Font = Enum.Font.GothamBold
	mSev.Parent = mCard
	corner(mSev, 4)

	local mReward = Instance.new("TextLabel")
	mReward.Size = UDim2.new(0.15, 0, 0, 18)
	mReward.Position = UDim2.new(0.55, 0, 0, 28)
	mReward.BackgroundTransparency = 1
	mReward.Text = mission.reward .. " MC"
	mReward.TextColor3 = C.gold
	mReward.TextScaled = true
	mReward.Font = Enum.Font.GothamBold
	mReward.Parent = mCard

	local sBtn = Instance.new("TextButton")
	sBtn.Size = UDim2.new(0.2, 0, 0.7, 0)
	sBtn.Position = UDim2.new(0.78, 0, 0.15, 0)
	sBtn.BackgroundColor3 = C.red
	sBtn.Text = "RESPOND"
	sBtn.TextColor3 = Color3.new(1,1,1)
	sBtn.TextScaled = true
	sBtn.Font = Enum.Font.GothamBold
	sBtn.Parent = mCard
	corner(sBtn, 6)

	sBtn.Activated:Connect(function()
		local r = Remotes:FindFirstChild("RequestStartMission")
		if r then r:FireServer(mission.id) end
		screenGui.Enabled = false
	end)
end

missionScroll.CanvasSize = UDim2.new(0, 0, 0, #SafetyTrack.Missions * 68)

print("[MOLGANG] SafetyResponseGui loaded — 4 HSE roles, 4 incident scenarios")
