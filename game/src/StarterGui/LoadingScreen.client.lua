--[[
	LoadingScreen.client.lua
	MOLGANG Loading Screen & Welcome Guide

	Shows on game load:
	- Welcome message
	- Quick tips
	- Keyboard shortcuts
	- Story/theme
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	accent        = Color3.fromRGB(0, 200, 120),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
	gold          = Color3.fromRGB(255, 215, 0),
}

-- LOADING SCREEN GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "LoadingScreen"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 100
screenGui.Parent = playerGui

-- Background
local bg = Instance.new("Frame")
bg.Size = UDim2.new(1, 0, 1, 0)
bg.BackgroundColor3 = COLORS.background
bg.BackgroundTransparency = 0
bg.Parent = screenGui

-- Main content panel
local panel = Instance.new("Frame")
panel.Name = "MainPanel"
panel.Size = UDim2.new(0, 800, 0, 700)
panel.Position = UDim2.new(0.5, -400, 0.5, -350)
panel.BackgroundColor3 = COLORS.panel
panel.BackgroundTransparency = 0.15
panel.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 16)
corner.Parent = panel

-- Title
local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(1, 0, 0, 80)
title.Position = UDim2.new(0, 0, 0, 20)
title.BackgroundTransparency = 1
title.Text = "🧪 MOLGANG 🧪"
title.TextColor3 = COLORS.accent
title.TextScaled = true
title.Font = Enum.Font.GothamBold
title.Parent = panel

-- Subtitle
local subtitle = Instance.new("TextLabel")
subtitle.Size = UDim2.new(1, 0, 0, 40)
subtitle.Position = UDim2.new(0, 0, 0, 100)
subtitle.BackgroundTransparency = 1
subtitle.Text = "The Molecular Chain Game"
subtitle.TextColor3 = COLORS.textSecondary
subtitle.TextScaled = true
subtitle.Font = Enum.Font.Gotham
subtitle.Parent = panel

-- Story/Description
local descriptionText = [[
Welcome to MOLGANG, an educational game where you:
• Explore 6 magical zones collecting atoms
• Build mines & factories for production
• Craft molecules and register them on the blockchain
• Trade resources on a dynamic global market
• Compete with players worldwide

Ready to become a master chemist?
]]

local description = Instance.new("TextLabel")
description.Size = UDim2.new(1, -40, 0, 120)
description.Position = UDim2.new(0, 20, 0, 150)
description.BackgroundTransparency = 1
description.Text = descriptionText
description.TextColor3 = COLORS.textPrimary
description.TextScaled = true
description.Font = Enum.Font.Gotham
description.TextWrapped = true
description.TextYAlignment = Enum.TextYAlignment.Top
description.Parent = panel

-- Quick Tips
local tipsLabel = Instance.new("TextLabel")
tipsLabel.Size = UDim2.new(1, -40, 0, 30)
tipsLabel.Position = UDim2.new(0, 20, 0, 280)
tipsLabel.BackgroundTransparency = 1
tipsLabel.Text = "⚡ QUICK TIPS"
tipsLabel.TextColor3 = COLORS.accent
tipsLabel.TextScaled = true
tipsLabel.Font = Enum.Font.GothamBold
tipsLabel.TextXAlignment = Enum.TextXAlignment.Left
tipsLabel.Parent = panel

local tipsText = [[
📋 Press Q to view quests (your main objectives)
⚛️ Walk around to find atoms (yellow floating balls)
🏭 Press D to build facilities and manage production
💰 Press I to check your inventory
🏆 Press A to track achievements & progress
🌍 Press L for global leaderboards
🧮 Press R to see all craftable molecules
⚙️ Press / for settings & keyboard shortcuts
]]

local tips = Instance.new("TextLabel")
tips.Size = UDim2.new(1, -40, 0, 200)
tips.Position = UDim2.new(0, 20, 0, 315)
tips.BackgroundTransparency = 1
tips.Text = tipsText
tips.TextColor3 = COLORS.textPrimary
tips.TextScaled = true
tips.Font = Enum.Font.Gotham
tips.TextWrapped = true
tips.TextYAlignment = Enum.TextYAlignment.Top
tips.Parent = panel

-- Continue button
local continueBtn = Instance.new("TextButton")
continueBtn.Name = "ContinueBtn"
continueBtn.Size = UDim2.new(0, 200, 0, 50)
continueBtn.Position = UDim2.new(0.5, -100, 1, -70)
continueBtn.BackgroundColor3 = COLORS.accent
continueBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
continueBtn.Text = "Begin Game →"
continueBtn.Font = Enum.Font.GothamBold
continueBtn.TextScaled = true
continueBtn.Parent = panel

local btnCorner = Instance.new("UICorner")
btnCorner.CornerRadius = UDim.new(0, 8)
btnCorner.Parent = continueBtn

-- Fade out on button click
continueBtn.MouseButton1Click:Connect(function()
	local fadeOut = TweenService:Create(
		screenGui,
		TweenInfo.new(0.5),
		{Transparency = 1}
	)
	fadeOut:Play()
	fadeOut.Completed:Connect(function()
		screenGui:Destroy()
	end)
end)

-- Auto-fade after 30 seconds
task.delay(30, function()
	if screenGui.Parent then
		local fadeOut = TweenService:Create(
			screenGui,
			TweenInfo.new(1),
			{Transparency = 1}
		)
		fadeOut:Play()
		fadeOut.Completed:Connect(function()
			screenGui:Destroy()
		end)
	end
end)

print("[LoadingScreen] Game welcome screen displayed")
