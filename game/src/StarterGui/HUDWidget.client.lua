--[[
	HUDWidget.client.lua
	MOLGANG Quick Stats HUD Widget

	Displays on top-right corner:
	- Current MolCoins
	- Day counter
	- Production status (atoms/molecules per cycle)
	- Quick links to Dashboard
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local PlayerDataLoaded = Remotes:WaitForChild("PlayerDataLoaded")

local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	accent        = Color3.fromRGB(0, 200, 120),
	gold          = Color3.fromRGB(255, 215, 0),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
}

local function createCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 8)
	corner.Parent = parent
	return corner
end

-- WIDGET GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "HUDWidget"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 8
screenGui.Parent = playerGui

-- Widget panel (top-right)
local widget = Instance.new("Frame")
widget.Name = "Widget"
widget.Size = UDim2.new(0, 280, 0, 180)
widget.Position = UDim2.new(1, -290, 0, 10)
widget.BackgroundColor3 = COLORS.panel
widget.BackgroundTransparency = 0.15
widget.Parent = screenGui
createCorner(widget, 10)

-- Title
local titleLabel = Instance.new("TextLabel")
titleLabel.Name = "Title"
titleLabel.Size = UDim2.new(1, -10, 0, 25)
titleLabel.Position = UDim2.new(0, 5, 0, 5)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "MOLGANG Status"
titleLabel.TextColor3 = COLORS.accent
titleLabel.TextScaled = true
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Center
titleLabel.Parent = widget

-- Content frame
local contentFrame = Instance.new("Frame")
contentFrame.Name = "Content"
contentFrame.Size = UDim2.new(1, -10, 1, -40)
contentFrame.Position = UDim2.new(0, 5, 0, 35)
contentFrame.BackgroundTransparency = 1
contentFrame.Parent = widget

-- Day label
local dayLabel = Instance.new("TextLabel")
dayLabel.Name = "DayLabel"
dayLabel.Size = UDim2.new(1, 0, 0, 25)
dayLabel.BackgroundTransparency = 1
dayLabel.Text = "Day: 1"
dayLabel.TextColor3 = COLORS.gold
dayLabel.TextScaled = true
dayLabel.Font = Enum.Font.GothamBold
dayLabel.TextXAlignment = Enum.TextXAlignment.Left
dayLabel.Parent = contentFrame

-- MolCoins label
local molcoinsLabel = Instance.new("TextLabel")
molcoinsLabel.Name = "MolcoinsLabel"
molcoinsLabel.Size = UDim2.new(1, 0, 0, 25)
molcoinsLabel.Position = UDim2.new(0, 0, 0, 25)
molcoinsLabel.BackgroundTransparency = 1
molcoinsLabel.Text = "MolCoins: 0"
molcoinsLabel.TextColor3 = COLORS.gold
molcoinsLabel.TextScaled = true
molcoinsLabel.Font = Enum.Font.GothamBold
molcoinsLabel.TextXAlignment = Enum.TextXAlignment.Left
molcoinsLabel.Parent = contentFrame

-- Inventory label
local invLabel = Instance.new("TextLabel")
invLabel.Name = "InvLabel"
invLabel.Size = UDim2.new(1, 0, 0, 25)
invLabel.Position = UDim2.new(0, 0, 0, 50)
invLabel.BackgroundTransparency = 1
invLabel.Text = "Atoms: 0 | Mols: 0"
invLabel.TextColor3 = COLORS.textSecondary
invLabel.TextScaled = true
invLabel.Font = Enum.Font.Gotham
invLabel.TextXAlignment = Enum.TextXAlignment.Left
invLabel.Parent = contentFrame

-- Quick links
local dashboardBtn = Instance.new("TextButton")
dashboardBtn.Name = "DashboardBtn"
dashboardBtn.Size = UDim2.new(0.48, 0, 0, 22)
dashboardBtn.Position = UDim2.new(0, 0, 0, 80)
dashboardBtn.BackgroundColor3 = COLORS.accent
dashboardBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
dashboardBtn.Text = "Dashboard (D)"
dashboardBtn.Font = Enum.Font.GothamBold
dashboardBtn.TextScaled = true
dashboardBtn.Parent = contentFrame
createCorner(dashboardBtn, 4)

local leaderboardBtn = Instance.new("TextButton")
leaderboardBtn.Name = "LeaderboardBtn"
leaderboardBtn.Size = UDim2.new(0.48, 0, 0, 22)
leaderboardBtn.Position = UDim2.new(0.52, 0, 0, 80)
leaderboardBtn.BackgroundColor3 = Color3.fromRGB(80, 150, 255)
leaderboardBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
leaderboardBtn.Text = "Leaderboard (L)"
leaderboardBtn.Font = Enum.Font.GothamBold
leaderboardBtn.TextScaled = true
leaderboardBtn.Parent = contentFrame
createCorner(leaderboardBtn, 4)

-- Update function
local playerData = nil

PlayerDataLoaded.OnClientEvent:Connect(function(data)
	playerData = data
end)

dashboardBtn.MouseButton1Click:Connect(function()
	local dashboardGui = playerGui:FindFirstChild("DashboardGui")
	if dashboardGui then
		dashboardGui.Enabled = not dashboardGui.Enabled
	end
end)

leaderboardBtn.MouseButton1Click:Connect(function()
	if _G.LeaderboardGuiShow then
		_G.LeaderboardGuiShow()
	end
end)

-- Live updates
RunService.Heartbeat:Connect(function()
	if playerData then
		dayLabel.Text = "Day: " .. (playerData.day or 1)
		molcoinsLabel.Text = "MolCoins: " .. (playerData.molCoins or 0)

		local atomCount = 0
		if playerData.atoms then
			for _, count in pairs(playerData.atoms) do
				atomCount = atomCount + count
			end
		end

		local molCount = 0
		if playerData.molecules then
			for _, count in pairs(playerData.molecules) do
				molCount = molCount + count
			end
		end

		invLabel.Text = string.format("Atoms: %d | Mols: %d", atomCount, molCount)
	end
end)

print("[HUDWidget] Loaded — Quick stats widget visible (top-right)")
