--[[
	MahjongGui.client.lua
	MOLGANG Mahjong Minigame — Relaxation & Fun

	MVP Features:
	- 3 AI opponents (Ming, Yuki, Carlos)
	- Simple tile display (14 tiles per player)
	- Discard mechanism
	- Win detection
	- Scoreboard
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local MahjongGame = require(ReplicatedStorage.Modules.MahjongGame)

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	tileColor     = Color3.fromRGB(220, 200, 150),
	tileBorder    = Color3.fromRGB(100, 100, 100),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
	aiColor       = Color3.fromRGB(100, 150, 255),
	playerColor   = Color3.fromRGB(0, 200, 120),
}

local function createCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 8)
	corner.Parent = parent
	return corner
end

local function createStroke(parent, color, thickness)
	local stroke = Instance.new("UIStroke")
	stroke.Color = color or COLORS.accent
	stroke.Thickness = thickness or 1.5
	stroke.Parent = parent
	return stroke
end

-- MAIN SCREEN GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "MahjongGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 20
screenGui.Enabled = false  -- Hidden by default
screenGui.Parent = playerGui

-- Main game panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
mainPanel.Size = UDim2.new(1, 0, 1, 0)
mainPanel.BackgroundColor3 = COLORS.background
mainPanel.BackgroundTransparency = 0
mainPanel.Parent = screenGui

-- Header
local headerLabel = Instance.new("TextLabel")
headerLabel.Name = "Header"
headerLabel.Size = UDim2.new(1, 0, 0, 60)
headerLabel.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
headerLabel.Text = "🀄 Mahjong Game — Relax & Enjoy"
headerLabel.TextColor3 = COLORS.accent
headerLabel.TextScaled = true
headerLabel.Font = Enum.Font.GothamBold
headerLabel.Parent = mainPanel

-- Close button (ESC)
local closeBtn = Instance.new("TextButton")
closeBtn.Name = "CloseBtn"
closeBtn.Size = UDim2.new(0, 80, 0, 40)
closeBtn.Position = UDim2.new(1, -90, 0, 10)
closeBtn.BackgroundColor3 = Color3.fromRGB(200, 80, 80)
closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
closeBtn.Text = "Close"
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = headerLabel
createCorner(closeBtn, 6)

-- ═════════════════════════════════════════════════
-- GAME AREA
-- ═════════════════════════════════════════════════

local gameArea = Instance.new("Frame")
gameArea.Name = "GameArea"
gameArea.Size = UDim2.new(1, 0, 1, -60)
gameArea.Position = UDim2.new(0, 0, 0, 60)
gameArea.BackgroundTransparency = 1
gameArea.Parent = mainPanel

-- Scoreboard (top)
local scoreBoard = Instance.new("Frame")
scoreBoard.Name = "ScoreBoard"
scoreBoard.Size = UDim2.new(1, 0, 0, 80)
scoreBoard.BackgroundColor3 = COLORS.panelLight
scoreBoard.BackgroundTransparency = 0.2
scoreBoard.Parent = gameArea

local scoreLayout = Instance.new("UIListLayout")
scoreLayout.FillDirection = Enum.FillDirection.Horizontal
scoreLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
scoreLayout.VerticalAlignment = Enum.VerticalAlignment.Center
scoreLayout.Padding = UDim.new(0, 20)
scoreLayout.Parent = scoreBoard

local playerScores = {player.Name, "Ming", "Yuki", "Carlos"}
for i, name in ipairs(playerScores) do
	local scoreFrame = Instance.new("Frame")
	scoreFrame.Name = name .. "_Score"
	scoreFrame.Size = UDim2.new(0, 150, 0, 60)
	scoreFrame.BackgroundColor3 = (i == 1) and COLORS.playerColor or COLORS.aiColor
	scoreFrame.BackgroundTransparency = 0.3
	scoreFrame.Parent = scoreBoard
	createCorner(scoreFrame, 8)

	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 0.5, 0)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = name
	nameLabel.TextColor3 = COLORS.textPrimary
	nameLabel.TextScaled = true
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Parent = scoreFrame

	local pointsLabel = Instance.new("TextLabel")
	pointsLabel.Name = "Points"
	pointsLabel.Size = UDim2.new(1, 0, 0.5, 0)
	pointsLabel.Position = UDim2.new(0, 0, 0.5, 0)
	pointsLabel.BackgroundTransparency = 1
	pointsLabel.Text = "0 points"
	pointsLabel.TextColor3 = COLORS.gold or Color3.fromRGB(255, 200, 50)
	pointsLabel.TextScaled = true
	pointsLabel.Font = Enum.Font.Gotham
	pointsLabel.Parent = scoreFrame
end

-- ═════════════════════════════════════════════════
-- TABLE VIEW (Simplified)
-- ═════════════════════════════════════════════════

local tableView = Instance.new("Frame")
tableView.Name = "TableView"
tableView.Size = UDim2.new(1, 0, 1, -80)
tableView.Position = UDim2.new(0, 0, 0, 80)
tableView.BackgroundColor3 = Color3.fromRGB(25, 35, 50)
tableView.BackgroundTransparency = 0.5
tableView.Parent = gameArea

-- Center text: "Shuffling tiles..."
local statusLabel = Instance.new("TextLabel")
statusLabel.Name = "Status"
statusLabel.Size = UDim2.new(1, 0, 1, 0)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "Shuffling tiles...\n\nWaiting for opponents..."
statusLabel.TextColor3 = COLORS.textSecondary
statusLabel.TextScaled = true
statusLabel.Font = Enum.Font.GothamBold
statusLabel.TextYAlignment = Enum.TextYAlignment.Center
statusLabel.RichText = true
statusLabel.Parent = tableView

-- ═════════════════════════════════════════════════
-- PLAYER HAND (Bottom)
-- ═════════════════════════════════════════════════

local handArea = Instance.new("Frame")
handArea.Name = "HandArea"
handArea.Size = UDim2.new(1, 0, 0, 150)
handArea.Position = UDim2.new(0, 0, 1, -150)
handArea.BackgroundColor3 = COLORS.panel
handArea.BackgroundTransparency = 0.1
handArea.Parent = tableView
createStroke(handArea, COLORS.playerColor, 2)

local handLabel = Instance.new("TextLabel")
handLabel.Size = UDim2.new(1, 0, 0, 30)
handLabel.BackgroundTransparency = 1
handLabel.Text = "Your Hand (Click tile to discard)"
handLabel.TextColor3 = COLORS.playerColor
handLabel.TextScaled = true
handLabel.Font = Enum.Font.GothamBold
handLabel.Parent = handArea

local handScroll = Instance.new("ScrollingFrame")
handScroll.Name = "HandScroll"
handScroll.Size = UDim2.new(1, -20, 1, -40)
handScroll.Position = UDim2.new(0, 10, 0, 35)
handScroll.BackgroundTransparency = 1
handScroll.ScrollBarThickness = 6
handScroll.Parent = handArea

local handLayout = Instance.new("UIListLayout")
handLayout.FillDirection = Enum.FillDirection.Horizontal
handLayout.Padding = UDim.new(0, 6)
handLayout.VerticalAlignment = Enum.VerticalAlignment.Center
handLayout.Parent = handScroll

-- ═════════════════════════════════════════════════
-- GAME LOGIC & STATE
-- ═════════════════════════════════════════════════

local gameState = nil
local gameActive = false

function startGame()
	statusLabel.Text = "Game started! Dealing tiles..."
	gameActive = true
	gameState = MahjongGame.CreateRound()

	-- Display player hand
	task.wait(1)
	displayPlayerHand()

	statusLabel.Text = "Your turn! Click a tile to discard."
end

function displayPlayerHand()
	-- Clear hand display
	for _, child in ipairs(handScroll:GetChildren()) do
		if child:IsA("Frame") or child:IsA("TextButton") then
			child:Destroy()
		end
	end

	-- Show tiles
	local hand = gameState.hands.hand1
	for i, tile in ipairs(hand) do
		local tileBtn = Instance.new("TextButton")
		tileBtn.Name = "Tile_" .. i
		tileBtn.Size = UDim2.new(0, 60, 0, 80)
		tileBtn.BackgroundColor3 = COLORS.tileColor
		tileBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
		tileBtn.Text = tile
		tileBtn.Font = Enum.Font.GothamBold
		tileBtn.TextScaled = true
		tileBtn.Parent = handScroll
		createCorner(tileBtn, 4)
		createStroke(tileBtn, COLORS.tileBorder, 1)

		-- Discard on click
		tileBtn.MouseButton1Click:Connect(function()
			discardTile(i, tile)
		end)
	end
end

function discardTile(index, tile)
	if not gameActive then return end

	table.remove(gameState.hands.hand1, index)
	table.insert(gameState.discardPile, tile)

	statusLabel.Text = "You discarded: " .. tile .. "\n\nAI opponents playing..."

	-- Simple AI turn: each AI discards a random tile
	task.wait(1)
	for aiIdx = 2, 4 do
		local aiHand = gameState.hands["hand" .. aiIdx]
		if #aiHand > 0 then
			local discardIdx = math.random(#aiHand)
			table.insert(gameState.discardPile, aiHand[discardIdx])
			table.remove(aiHand, discardIdx)
		end
	end

	-- Check for win conditions
	local playerWon = MahjongGame.IsWinningHand(gameState.hands.hand1)
	if playerWon then
		statusLabel.Text = "🎉 You won! Congratulations!\n\nPress Close to return."
		gameActive = false
	else
		displayPlayerHand()
		statusLabel.Text = "Your turn! Click a tile to discard."
	end
end

function closeGame()
	screenGui.Enabled = false
	gameActive = false
	gameState = nil
	-- Re-enable dashboard
	local dashboardGui = playerGui:FindFirstChild("DashboardGui")
	if dashboardGui then
		dashboardGui.Enabled = true
	end
end

-- ═════════════════════════════════════════════════
-- KEYBOARD SHORTCUTS
-- ═════════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	-- ESC to close
	if input.KeyCode == Enum.KeyCode.Escape then
		closeGame()
	end
end)

closeBtn.MouseButton1Click:Connect(closeGame)

-- ═════════════════════════════════════════════════
-- EXPORT FUNCTIONS (for DashboardGui to call)
-- ═════════════════════════════════════════════════

_G.MahjongGuiStart = function()
	screenGui.Enabled = true
	startGame()
end

_G.MahjongGuiStop = function()
	closeGame()
end

print("[MahjongGui] Loaded — Call _G.MahjongGuiStart() to begin game")
