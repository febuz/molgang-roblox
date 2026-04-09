--[[
	MarketGui.client.lua
	MOLGANG Market Interface

	Shows real-time commodity prices
	Allows buy/sell of atoms and molecules
	Keyboard shortcut: M
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
	buy           = Color3.fromRGB(100, 200, 100),
	sell          = Color3.fromRGB(200, 100, 100),
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
-- MARKET GUI
-- ══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "MarketGui"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui
screenGui.Enabled = false

-- Main panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
mainPanel.Size = UDim2.new(0, 600, 0, 500)
mainPanel.Position = UDim2.new(0.5, -300, 0.5, -250)
mainPanel.BackgroundColor3 = COLORS.panel
mainPanel.BackgroundTransparency = 0.1
mainPanel.Parent = screenGui
createCorner(mainPanel, 12)

-- Title
local title = createTextLabel(mainPanel, {
	Size = UDim2.new(1, 0, 0, 40),
	Text = "📈 MARKET",
	TextColor3 = COLORS.accent,
	TextScaled = true,
	Font = Enum.Font.GothamBold,
})

-- Price list container
local priceContainer = Instance.new("Frame")
priceContainer.Size = UDim2.new(1, -20, 1, -60)
priceContainer.Position = UDim2.new(0, 10, 0, 50)
priceContainer.BackgroundTransparency = 1
priceContainer.Parent = mainPanel

local scrollView = Instance.new("ScrollingFrame")
scrollView.Size = UDim2.new(1, 0, 1, 0)
scrollView.BackgroundTransparency = 1
scrollView.ScrollBarThickness = 6
scrollView.Parent = priceContainer

local listLayout = Instance.new("UIListLayout")
listLayout.FillDirection = Enum.FillDirection.Vertical
listLayout.HorizontalAlignment = Enum.HorizontalAlignment.Fill
listLayout.Padding = UDim.new(0, 4)
listLayout.Parent = scrollView

-- Price display table
local currentPrices = {}

local function updatePriceDisplay(symbol, priceData)
	-- Find or create price row
	local row = scrollView:FindFirstChild("Price_" .. symbol)
	if not row then
		row = Instance.new("Frame")
		row.Name = "Price_" .. symbol
		row.Size = UDim2.new(1, 0, 0, 40)
		row.BackgroundColor3 = COLORS.panelLight
		row.BackgroundTransparency = 0.2
		row.Parent = scrollView
		createCorner(row, 6)

		-- Symbol label
		createTextLabel(row, {
			Size = UDim2.new(0, 80, 1, 0),
			Position = UDim2.new(0, 5, 0, 0),
			Text = symbol,
			TextColor3 = COLORS.gold,
			TextScaled = true,
			Font = Enum.Font.GothamBold,
			TextXAlignment = Enum.TextXAlignment.Left,
		})

		-- Price label
		local priceLabel = createTextLabel(row, {
			Name = "PriceLabel",
			Size = UDim2.new(0, 100, 1, 0),
			Position = UDim2.new(0, 90, 0, 0),
			Text = "100",
			TextColor3 = COLORS.accent,
			TextScaled = true,
			Font = Enum.Font.Gotham,
		})

		-- Change indicator
		createTextLabel(row, {
			Size = UDim2.new(0, 80, 1, 0),
			Position = UDim2.new(0, 200, 0, 0),
			Text = "—",
			TextColor3 = Color3.fromRGB(150, 150, 150),
			TextScaled = true,
			Font = Enum.Font.Gotham,
		})

		-- Buy button
		local buyBtn = Instance.new("TextButton")
		buyBtn.Name = "BuyBtn"
		buyBtn.Size = UDim2.new(0, 60, 0, 28)
		buyBtn.Position = UDim2.new(1, -140, 0, 6)
		buyBtn.BackgroundColor3 = COLORS.buy
		buyBtn.BackgroundTransparency = 0.2
		buyBtn.Text = "BUY"
		buyBtn.TextColor3 = COLORS.buy
		buyBtn.TextScaled = true
		buyBtn.Font = Enum.Font.GothamBold
		buyBtn.BorderSizePixel = 0
		buyBtn.Parent = row
		createCorner(buyBtn, 4)

		-- Sell button
		local sellBtn = Instance.new("TextButton")
		sellBtn.Name = "SellBtn"
		sellBtn.Size = UDim2.new(0, 60, 0, 28)
		sellBtn.Position = UDim2.new(1, -70, 0, 6)
		sellBtn.BackgroundColor3 = COLORS.sell
		sellBtn.BackgroundTransparency = 0.2
		sellBtn.Text = "SELL"
		sellBtn.TextColor3 = COLORS.sell
		sellBtn.TextScaled = true
		sellBtn.Font = Enum.Font.GothamBold
		sellBtn.BorderSizePixel = 0
		sellBtn.Parent = row
		createCorner(sellBtn, 4)
	end

	-- Update price
	if priceData and priceData.current then
		local priceLabel = row:FindFirstChild("PriceLabel")
		if priceLabel then
			priceLabel.Text = tostring(priceData.current) .. " 💰"
		end
		currentPrices[symbol] = priceData.current
	end
end

-- ══════════════════════════════════════════════
-- EVENT LISTENERS
-- ══════════════════════════════════════════════

Remotes.MarketPricesUpdated.OnClientEvent:Connect(function(priceData)
	for symbol, data in pairs(priceData) do
		updatePriceDisplay(symbol, data)
	end
end)

-- ══════════════════════════════════════════════
-- KEYBOARD SHORTCUTS
-- ══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	-- M = Toggle Market
	if input.KeyCode == Enum.KeyCode.M then
		screenGui.Enabled = not screenGui.Enabled
	end
end)

print("[MarketGui] Loaded — Press M to open market")
