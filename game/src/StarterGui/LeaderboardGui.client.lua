--[[
	LeaderboardGui.client.lua
	MOLGANG Global Leaderboards

	Shows top players across 4 categories:
	- MolCoins earned
	- Molecules built
	- Atoms collected
	- Chain tokens earned

	Keyboard shortcut: L
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- COLOR PALETTE
-- ══════════════════════════════════════════════

local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	gold          = Color3.fromRGB(255, 215, 0),
	bronze        = Color3.fromRGB(200, 100, 50),
	silver        = Color3.fromRGB(200, 200, 200),
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
-- LEADERBOARD GUI
-- ══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "LeaderboardGui"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui
screenGui.Enabled = false

-- Main panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
mainPanel.Size = UDim2.new(0, 900, 0, 600)
mainPanel.Position = UDim2.new(0.5, -450, 0.5, -300)
mainPanel.BackgroundColor3 = COLORS.panel
mainPanel.BackgroundTransparency = 0.1
mainPanel.Parent = screenGui
createCorner(mainPanel, 12)

-- Title
createTextLabel(mainPanel, {
	Size = UDim2.new(1, 0, 0, 40),
	Text = "🏆 GLOBAL LEADERBOARDS",
	TextColor3 = COLORS.accent,
	TextScaled = true,
	Font = Enum.Font.GothamBold,
})

-- Category tabs
local categories = {"MolCoins", "Molecules", "Elements", "ChainTokens"}
local categoryButtons = {}
local categoryFrames = {}

for i, category in ipairs(categories) do
	-- Tab button
	local btn = Instance.new("TextButton")
	btn.Name = category
	btn.Size = UDim2.new(0, 200, 0, 35)
	btn.Position = UDim2.new(0, (i-1)*210, 0, 45)
	btn.BackgroundColor3 = COLORS.panelLight
	btn.BackgroundTransparency = 0.5
	btn.Text = category
	btn.TextColor3 = COLORS.textSecondary
	btn.TextScaled = true
	btn.Font = Enum.Font.GothamBold
	btn.BorderSizePixel = 0
	btn.Parent = mainPanel
	createCorner(btn, 6)
	categoryButtons[category] = btn

	-- Content frame (hidden initially)
	local frame = Instance.new("ScrollingFrame")
	frame.Name = category .. "_Content"
	frame.Size = UDim2.new(1, -20, 1, -90)
	frame.Position = UDim2.new(0, 10, 0, 85)
	frame.BackgroundTransparency = 1
	frame.ScrollBarThickness = 6
	frame.Visible = (i == 1)  -- Show first category by default
	frame.Parent = mainPanel
	categoryFrames[category] = frame

	local layout = Instance.new("UIListLayout")
	layout.FillDirection = Enum.FillDirection.Vertical
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Fill
	layout.Padding = UDim.new(0, 4)
	layout.Parent = frame

	-- Tab click handler
	btn.MouseButton1Click:Connect(function()
		-- Hide all
		for _, f in pairs(categoryFrames) do
			f.Visible = false
		end
		-- Show selected
		frame.Visible = true

		-- Update button styles
		for _, b in pairs(categoryButtons) do
			b.BackgroundTransparency = 0.5
			b.TextColor3 = COLORS.textSecondary
		end
		btn.BackgroundTransparency = 0.1
		btn.TextColor3 = COLORS.accent
	end)
end

-- ══════════════════════════════════════════════
-- POPULATE LEADERBOARD
-- ══════════════════════════════════════════════

local function addLeaderboardEntry(categoryFrame, rank, playerName, score)
	local entry = Instance.new("Frame")
	entry.Size = UDim2.new(1, 0, 0, 35)
	entry.BackgroundColor3 = COLORS.panelLight
	entry.BackgroundTransparency = 0.3
	entry.Parent = categoryFrame
	createCorner(entry, 6)

	-- Rank (with medal for top 3)
	local rankText = "🥇"
	if rank == 2 then rankText = "🥈" end
	if rank == 3 then rankText = "🥉" end
	if rank > 3 then rankText = tostring(rank) end

	createTextLabel(entry, {
		Size = UDim2.new(0, 50, 1, 0),
		Position = UDim2.new(0, 5, 0, 0),
		Text = rankText,
		TextColor3 = COLORS.gold,
		TextScaled = true,
		Font = Enum.Font.GothamBold,
		TextXAlignment = Enum.TextXAlignment.Center,
	})

	-- Player name
	createTextLabel(entry, {
		Size = UDim2.new(0, 300, 1, 0),
		Position = UDim2.new(0, 60, 0, 0),
		Text = playerName,
		TextColor3 = COLORS.textPrimary,
		TextScaled = true,
		Font = Enum.Font.Gotham,
		TextXAlignment = Enum.TextXAlignment.Left,
	})

	-- Score
	createTextLabel(entry, {
		Size = UDim2.new(0, 200, 1, 0),
		Position = UDim2.new(1, -210, 0, 0),
		Text = string.format("%d", score),
		TextColor3 = COLORS.accent,
		TextScaled = true,
		Font = Enum.Font.GothamBold,
		TextXAlignment = Enum.TextXAlignment.Right,
	})
end

-- Stub data (in real game, would be loaded from server)
local function populateLeaderboards()
	-- Clear existing
	for _, frame in pairs(categoryFrames) do
		for _, child in ipairs(frame:GetChildren()) do
			if child:IsA("Frame") then child:Destroy() end
		end
	end

	-- Add sample entries (TODO: wire to actual leaderboard data from server)
	for cat, frame in pairs(categoryFrames) do
		for rank = 1, 10 do
			addLeaderboardEntry(frame, rank, "Player" .. (rank * 7 % 999), rank * 1000 + math.random(100, 999))
		end
	end
end

-- ══════════════════════════════════════════════
-- KEYBOARD SHORTCUTS
-- ══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	-- L = Toggle Leaderboards
	if input.KeyCode == Enum.KeyCode.L then
		screenGui.Enabled = not screenGui.Enabled
		if screenGui.Enabled then
			populateLeaderboards()
		end
	end
end)

-- Initial population
populateLeaderboards()

print("[LeaderboardGui] Loaded — Press L to view leaderboards")
