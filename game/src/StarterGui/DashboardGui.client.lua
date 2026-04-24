--[[
	DashboardGui.client.lua
	MOLGANG Dashboard — 5-Tab Interface

	Tabs:
	  1. Dashboard  — Day counter, cash balance, overview
	  2. Build     — Purchase facilities (mines, factories)
	  3. Trade     — Buy/sell commodities, market prices
	  4. Research  — Unlock research, upgrade facilities
	  5. Mahjong   — Enter Mahjong game
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Wait for remotes and data
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local GetPlayerData = Remotes:WaitForChild("GetPlayerData")
local PlayerDataLoaded = Remotes:WaitForChild("PlayerDataLoaded")
local DayAdvanced = Remotes:WaitForChild("DayAdvanced")
local RequestBuildFacility = Remotes:WaitForChild("RequestBuildFacility")
local RequestMarketTrade = Remotes:WaitForChild("RequestMarketTrade")

local Facilities = require(ReplicatedStorage.Modules.Facilities)
local ANKLending = require(ReplicatedStorage.Modules.ANKLending)

local playerData = nil

-- Listen for player data
PlayerDataLoaded.OnClientEvent:Connect(function(data)
	playerData = data
	print("[DashboardGui] Player data received:", data.molCoins, "Day:", data.day)
end)

-- Listen for day advancement
DayAdvanced.OnClientEvent:Connect(function(data)
	if playerData then
		playerData.day = data.newDay
		print("[DashboardGui] Day advanced to:", data.newDay)
	end
end)

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	gold          = Color3.fromRGB(255, 200, 50),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
	tabInactive   = Color3.fromRGB(80, 80, 100),
	tabActive     = Color3.fromRGB(0, 200, 120),
}

-- UTILITY FUNCTIONS
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

local function createTextLabel(parent, props)
	local label = Instance.new("TextLabel")
	label.Name = props.Name or "TextLabel"
	label.Size = props.Size or UDim2.new(1, 0, 1, 0)
	label.Position = props.Position or UDim2.new(0, 0, 0, 0)
	label.BackgroundTransparency = props.BackgroundTransparency or 1
	label.Text = props.Text or ""
	label.TextColor3 = props.TextColor3 or COLORS.textPrimary
	label.TextScaled = true
	label.Font = props.Font or Enum.Font.GothamBold
	label.TextXAlignment = props.TextXAlignment or Enum.TextXAlignment.Left
	label.TextYAlignment = props.TextYAlignment or Enum.TextYAlignment.Center
	label.RichText = props.RichText or false
	label.Parent = parent
	return label
end

-- SCREEN GUI SETUP
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "DashboardGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 10
screenGui.Enabled = false
screenGui.Parent = playerGui

-- Main panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
mainPanel.Size = UDim2.new(0, 800, 0, 600)
mainPanel.Position = UDim2.new(0.5, -400, 0.5, -300)
mainPanel.BackgroundColor3 = COLORS.panel
mainPanel.BackgroundTransparency = 0.1
mainPanel.Parent = screenGui
createCorner(mainPanel, 12)
createStroke(mainPanel, COLORS.accent, 2)

-- TAB BAR (5 tabs)
local tabBar = Instance.new("Frame")
tabBar.Name = "TabBar"
tabBar.Size = UDim2.new(1, 0, 0, 50)
tabBar.Position = UDim2.new(0, 0, 0, 0)
tabBar.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
tabBar.BackgroundTransparency = 0.2
tabBar.Parent = mainPanel
createCorner(tabBar, 10)

local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.HorizontalAlignment = Enum.HorizontalAlignment.Left
tabLayout.VerticalAlignment = Enum.VerticalAlignment.Center
tabLayout.Padding = UDim.new(0, 4)
tabLayout.Parent = tabBar

local tabPadding = Instance.new("UIPadding")
tabPadding.PaddingLeft = UDim.new(0, 8)
tabPadding.PaddingTop = UDim.new(0, 6)
tabPadding.PaddingBottom = UDim.new(0, 6)
tabPadding.Parent = tabBar

-- CONTENT FRAME
local contentFrame = Instance.new("Frame")
contentFrame.Name = "ContentFrame"
contentFrame.Size = UDim2.new(1, 0, 1, -50)
contentFrame.Position = UDim2.new(0, 0, 0, 50)
contentFrame.BackgroundTransparency = 1
contentFrame.Parent = mainPanel

-- TAB DATA
local tabs = {
	{name = "Dashboard", key = "dashboard"},
	{name = "Build",     key = "build"},
	{name = "Trade",     key = "trade"},
	{name = "Research",  key = "research"},
	{name = "Mahjong",   key = "mahjong"},
}

local currentTab = "dashboard"
local tabButtons = {}
local tabPanels = {}

-- CREATE TABS
for i, tab in ipairs(tabs) do
	-- TAB BUTTON
	local tabButton = Instance.new("TextButton")
	tabButton.Name = tab.key .. "Btn"
	tabButton.Size = UDim2.new(0, 140, 1, 0)
	tabButton.BackgroundColor3 = COLORS.tabInactive
	tabButton.TextColor3 = COLORS.textSecondary
	tabButton.Text = tab.name
	tabButton.Font = Enum.Font.GothamBold
	tabButton.TextScaled = true
	tabButton.BackgroundTransparency = 0.3
	tabButton.Parent = tabBar
	createCorner(tabButton, 8)

	tabButtons[tab.key] = tabButton

	-- TAB PANEL
	local tabPanel = Instance.new("Frame")
	tabPanel.Name = tab.key .. "Panel"
	tabPanel.Size = UDim2.new(1, 0, 1, 0)
	tabPanel.Position = UDim2.new(0, 0, 0, 0)
	tabPanel.BackgroundTransparency = 1
	tabPanel.Visible = (tab.key == "dashboard")
	tabPanel.Parent = contentFrame

	tabPanels[tab.key] = tabPanel

	-- TAB BUTTON CLICK
	tabButton.MouseButton1Click:Connect(function()
		-- Hide all panels
		for _, panel in pairs(tabPanels) do
			panel.Visible = false
		end

		-- Update button colors
		for key, btn in pairs(tabButtons) do
			if key == tab.key then
				btn.BackgroundColor3 = COLORS.tabActive
				btn.TextColor3 = COLORS.textPrimary
				btn.BackgroundTransparency = 0.1
			else
				btn.BackgroundColor3 = COLORS.tabInactive
				btn.TextColor3 = COLORS.textSecondary
				btn.BackgroundTransparency = 0.3
			end
		end

		-- Show current panel
		currentTab = tab.key
		tabPanel.Visible = true
	end)
end

-- ════════════════════════════════════════════════
-- TAB CONTENT: DASHBOARD
-- ════════════════════════════════════════════════

local dashboardPanel = tabPanels["dashboard"]

-- Day counter
local dayLabel = createTextLabel(dashboardPanel, {
	Name = "DayLabel",
	Size = UDim2.new(1, -20, 0, 50),
	Position = UDim2.new(0, 10, 0, 10),
	Text = "Day 1",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.accent,
	TextXAlignment = Enum.TextXAlignment.Center,
})

-- Cash balance
local cashLabel = createTextLabel(dashboardPanel, {
	Name = "CashLabel",
	Size = UDim2.new(1, -20, 0, 40),
	Position = UDim2.new(0, 10, 0, 70),
	Text = "Cash: $1,000",
	Font = Enum.Font.Gotham,
	TextColor3 = COLORS.gold,
	TextXAlignment = Enum.TextXAlignment.Center,
})

-- Inventory stats
local inventoryLabel = createTextLabel(dashboardPanel, {
	Name = "InventoryLabel",
	Size = UDim2.new(1, -20, 0.4, -150),
	Position = UDim2.new(0, 10, 0, 140),
	Text = "Inventory:\nAtoms: 0\nMolecules: 0\nFacilities: 0",
	Font = Enum.Font.Gotham,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Left,
	TextYAlignment = Enum.TextYAlignment.Top,
})

-- Update dashboard when data changes
local updateDashboard
function updateDashboard()
	if playerData then
		dayLabel.Text = "Day " .. (playerData.day or 1)
		local cash = playerData.molCoins or 0
		cashLabel.Text = string.format("MolCoins: %d", cash)

		-- Calculate totals
		local atomCount = 0
		if playerData.atoms then
			for _, count in pairs(playerData.atoms) do
				atomCount = atomCount + count
			end
		end

		local moleculeCount = 0
		if playerData.molecules then
			for _, count in pairs(playerData.molecules) do
				moleculeCount = moleculeCount + count
			end
		end

		local facilityCount = 0
		if playerData.facilities then
			facilityCount = (playerData.facilities.mines or 0) +
						  (playerData.facilities.factories or 0) +
						  (playerData.facilities.researchLabs or 0) +
						  (playerData.facilities.offices or 0)
		end

		inventoryLabel.Text = string.format(
			"Inventory:\nAtoms: %d\nMolecules: %d\nFacilities: %d",
			atomCount, moleculeCount, facilityCount
		)
	end
end

-- Quick Quiz button (#84)
local quizBtn = Instance.new("TextButton")
quizBtn.Size = UDim2.new(0.45, -10, 0, 36)
quizBtn.Position = UDim2.new(0, 10, 1, -50)
quizBtn.BackgroundColor3 = Color3.fromRGB(80, 60, 200)
quizBtn.Text = "Start Chemistry Quiz"
quizBtn.TextColor3 = Color3.new(1,1,1)
quizBtn.TextScaled = true
quizBtn.Font = Enum.Font.GothamBold
quizBtn.Parent = dashboardPanel
createCorner(quizBtn, 6)

quizBtn.MouseButton1Click:Connect(function()
	local r = Remotes:FindFirstChild("RequestQuizQuestion")
	if r then r:FireServer() end
end)

PlayerDataLoaded.OnClientEvent:Connect(updateDashboard)

-- Update every frame to catch changes
RunService.Heartbeat:Connect(function()
	if playerData then
		-- Check if day or cash changed
		local newDayText = "Day " .. (playerData.day or 1)
		if dayLabel.Text ~= newDayText then
			dayLabel.Text = newDayText
		end

		local newCash = playerData.molCoins or 0
		local newCashText = string.format("MolCoins: %d", newCash)
		if cashLabel.Text ~= newCashText then
			cashLabel.Text = newCashText
		end
	end
end)

-- ════════════════════════════════════════════════
-- TAB CONTENT: BUILD
-- ════════════════════════════════════════════════

local buildPanel = tabPanels["build"]

local buildTitle = createTextLabel(buildPanel, {
	Name = "Title",
	Size = UDim2.new(1, -20, 0, 40),
	Position = UDim2.new(0, 10, 0, 10),
	Text = "Build Your Factory — Entrepreneurial Path 🏭",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.accent,
})

local buildScroll = Instance.new("ScrollingFrame")
buildScroll.Name = "BuildScroll"
buildScroll.Size = UDim2.new(1, -20, 1, -70)
buildScroll.Position = UDim2.new(0, 10, 0, 50)
buildScroll.BackgroundTransparency = 1
buildScroll.ScrollBarThickness = 8
buildScroll.Parent = buildPanel

local buildLayout = Instance.new("UIListLayout")
buildLayout.FillDirection = Enum.FillDirection.Vertical
buildLayout.Padding = UDim.new(0, 8)
buildLayout.Parent = buildScroll

-- Get all facility types from Facilities module
local facilityTypes = Facilities.GetTypes()

for facilityName, facilityData in pairs(facilityTypes) do
	local itemFrame = Instance.new("Frame")
	itemFrame.Name = facilityName
	itemFrame.Size = UDim2.new(1, 0, 0, 80)
	itemFrame.BackgroundColor3 = COLORS.panelLight
	itemFrame.Parent = buildScroll
	createCorner(itemFrame, 8)

	-- Facility name and description
	local nameLabel = createTextLabel(itemFrame, {
		Name = "NameLabel",
		Size = UDim2.new(0.6, 0, 0.5, 0),
		Position = UDim2.new(0, 10, 0, 5),
		Text = facilityName .. " ($" .. facilityData.cost .. ")",
		TextXAlignment = Enum.TextXAlignment.Left,
		Font = Enum.Font.GothamBold,
	})

	local descLabel = createTextLabel(itemFrame, {
		Name = "DescLabel",
		Size = UDim2.new(0.6, 0, 0.5, 0),
		Position = UDim2.new(0, 10, 0.5, 0),
		Text = facilityData.description,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextColor3 = COLORS.textSecondary,
		Font = Enum.Font.Gotham,
	})

	local productionLabel = createTextLabel(itemFrame, {
		Name = "ProdLabel",
		Size = UDim2.new(0.25, 0, 1, 0),
		Position = UDim2.new(0.6, 0, 0, 0),
		Text = "+" .. facilityData.productionRate .. "/cycle",
		TextXAlignment = Enum.TextXAlignment.Center,
		TextColor3 = Color3.fromRGB(100, 200, 100),
		Font = Enum.Font.Gotham,
	})

	local buyBtn = Instance.new("TextButton")
	buyBtn.Name = "BuyBtn"
	buyBtn.Size = UDim2.new(0.12, -5, 1, -8)
	buyBtn.Position = UDim2.new(0.85, 0, 0, 4)
	buyBtn.BackgroundColor3 = COLORS.accent
	buyBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
	buyBtn.Text = "Build"
	buyBtn.Font = Enum.Font.GothamBold
	buyBtn.TextScaled = true
	buyBtn.Parent = itemFrame
	createCorner(buyBtn, 6)

	-- Build button click handler
	buyBtn.MouseButton1Click:Connect(function()
		print("[DashboardGui] Building:", facilityName, "Cost:", facilityData.cost)
		if playerData and playerData.molCoins < facilityData.cost then
			print("[DashboardGui] Insufficient funds!")
			buyBtn.BackgroundColor3 = Color3.fromRGB(255, 100, 100)
			task.wait(1)
			buyBtn.BackgroundColor3 = COLORS.accent
			return
		end
		-- Send build request to server
		RequestBuildFacility:FireServer(facilityName)
	end)
end

-- ════════════════════════════════════════════════
-- TAB CONTENT: TRADE
-- ════════════════════════════════════════════════

local tradePanel = tabPanels["trade"]

local tradeTitle = createTextLabel(tradePanel, {
	Name = "Title",
	Size = UDim2.new(1, -20, 0, 40),
	Position = UDim2.new(0, 10, 0, 10),
	Text = "Global Market — Buy & Sell Resources 💰",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.accent,
})

-- Market items: commodity trading
local marketItems = {
	{name = "Iron",        basePrice = 100,  symbol = "Fe",  type = "metal"},
	{name = "Copper",      basePrice = 150,  symbol = "Cu",  type = "metal"},
	{name = "Gold",        basePrice = 500,  symbol = "Au",  type = "metal"},
	{name = "Vanadium",    basePrice = 300,  symbol = "V",   type = "metal"},
	{name = "Tungsten",    basePrice = 400,  symbol = "W",   type = "metal"},
	{name = "Aluminum",    basePrice = 80,   symbol = "Al",  type = "metal"},
	{name = "Carbon",      basePrice = 60,   symbol = "C",   type = "nonmetal"},
	{name = "Nitrogen",    basePrice = 70,   symbol = "N",   type = "nonmetal"},
}

local tradeScroll = Instance.new("ScrollingFrame")
tradeScroll.Name = "TradeScroll"
tradeScroll.Size = UDim2.new(1, -20, 1, -70)
tradeScroll.Position = UDim2.new(0, 10, 0, 50)
tradeScroll.BackgroundTransparency = 1
tradeScroll.ScrollBarThickness = 8
tradeScroll.Parent = tradePanel

local tradeLayout = Instance.new("UIListLayout")
tradeLayout.FillDirection = Enum.FillDirection.Vertical
tradeLayout.Padding = UDim.new(0, 8)
tradeLayout.Parent = tradeScroll

for _, item in ipairs(marketItems) do
	local itemFrame = Instance.new("Frame")
	itemFrame.Name = item.name
	itemFrame.Size = UDim2.new(1, 0, 0, 55)
	itemFrame.BackgroundColor3 = COLORS.panelLight
	itemFrame.Parent = tradeScroll
	createCorner(itemFrame, 8)

	-- Market dynamic pricing (simulated)
	local priceVariation = math.random(-20, 20)
	local currentPrice = item.basePrice + priceVariation

	createTextLabel(itemFrame, {
		Name = "NameLabel",
		Size = UDim2.new(0.25, 0, 1, 0),
		Position = UDim2.new(0, 10, 0, 0),
		Text = item.name .. "\n(" .. item.symbol .. ")",
		TextXAlignment = Enum.TextXAlignment.Left,
		Font = Enum.Font.GothamBold,
		RichText = true,
	})

	createTextLabel(itemFrame, {
		Name = "PriceLabel",
		Size = UDim2.new(0.2, 0, 1, 0),
		Position = UDim2.new(0.25, 0, 0, 0),
		Text = "$" .. currentPrice,
		TextXAlignment = Enum.TextXAlignment.Center,
		TextColor3 = (priceVariation >= 0) and Color3.fromRGB(100, 200, 100) or Color3.fromRGB(255, 100, 100),
		Font = Enum.Font.GothamBold,
	})

	local buyBtn = Instance.new("TextButton")
	buyBtn.Name = "BuyBtn"
	buyBtn.Size = UDim2.new(0.15, -5, 1, -8)
	buyBtn.Position = UDim2.new(0.6, 0, 0, 4)
	buyBtn.BackgroundColor3 = Color3.fromRGB(100, 150, 255)
	buyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
	buyBtn.Text = "Buy 1"
	buyBtn.Font = Enum.Font.GothamBold
	buyBtn.TextScaled = true
	buyBtn.Parent = itemFrame
	createCorner(buyBtn, 6)

	buyBtn.MouseButton1Click:Connect(function()
		print("[DashboardGui] Buy clicked:", item.name, "Price:", currentPrice)
		if playerData and playerData.molCoins < currentPrice then
			print("[DashboardGui] Insufficient funds!")
			buyBtn.BackgroundColor3 = Color3.fromRGB(255, 100, 100)
			task.wait(1)
			buyBtn.BackgroundColor3 = Color3.fromRGB(100, 150, 255)
			return
		end
		RequestMarketTrade:FireServer("buy", item.name, 1, currentPrice)
	end)

	local sellBtn = Instance.new("TextButton")
	sellBtn.Name = "SellBtn"
	sellBtn.Size = UDim2.new(0.15, -5, 1, -8)
	sellBtn.Position = UDim2.new(0.75, 0, 0, 4)
	sellBtn.BackgroundColor3 = Color3.fromRGB(200, 100, 100)
	sellBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
	sellBtn.Text = "Sell 1"
	sellBtn.Font = Enum.Font.GothamBold
	sellBtn.TextScaled = true
	sellBtn.Parent = itemFrame
	createCorner(sellBtn, 6)

	sellBtn.MouseButton1Click:Connect(function()
		print("[DashboardGui] Sell clicked:", item.name, "Price:", currentPrice)
		RequestMarketTrade:FireServer("sell", item.name, 1, currentPrice)
	end)
end

-- ════════════════════════════════════════════════
-- TAB CONTENT: RESEARCH
-- ════════════════════════════════════════════════

local researchPanel = tabPanels["research"]

createTextLabel(researchPanel, {
	Name = "Title",
	Size = UDim2.new(1, -20, 0, 40),
	Position = UDim2.new(0, 10, 0, 10),
	Text = "Research & Loans (ANK Cooperative)",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.accent,
})

-- Loan presets from ANKLending
local loanPresets = ANKLending.GetPresets()
local loanScroll = Instance.new("ScrollingFrame")
loanScroll.Name = "LoanScroll"
loanScroll.Size = UDim2.new(1, -20, 1, -70)
loanScroll.Position = UDim2.new(0, 10, 0, 50)
loanScroll.BackgroundTransparency = 1
loanScroll.ScrollBarThickness = 8
loanScroll.Parent = researchPanel

local loanLayout = Instance.new("UIListLayout")
loanLayout.FillDirection = Enum.FillDirection.Vertical
loanLayout.Padding = UDim.new(0, 8)
loanLayout.Parent = loanScroll

for _, preset in ipairs(loanPresets) do
	local loanFrame = Instance.new("Frame")
	loanFrame.Name = preset.name
	loanFrame.Size = UDim2.new(1, 0, 0, 70)
	loanFrame.BackgroundColor3 = COLORS.panelLight
	loanFrame.Parent = loanScroll
	createCorner(loanFrame, 8)

	-- Loan details
	createTextLabel(loanFrame, {
		Name = "NameLabel",
		Size = UDim2.new(0.5, 0, 0.5, 0),
		Position = UDim2.new(0, 10, 0, 5),
		Text = preset.name .. " Loan",
		TextXAlignment = Enum.TextXAlignment.Left,
		Font = Enum.Font.GothamBold,
	})

	createTextLabel(loanFrame, {
		Name = "TermsLabel",
		Size = UDim2.new(0.5, 0, 0.5, 0),
		Position = UDim2.new(0, 10, 0.5, 0),
		Text = string.format("Principal: %d | 5%% interest | %d days", preset.amount, preset.duration),
		TextXAlignment = Enum.TextXAlignment.Left,
		TextColor3 = COLORS.textSecondary,
		Font = Enum.Font.Gotham,
	})

	-- Calculate collateral & interest
	local interest = math.floor(preset.amount * 0.05)
	createTextLabel(loanFrame, {
		Name = "CostLabel",
		Size = UDim2.new(0.3, 0, 1, 0),
		Position = UDim2.new(0.5, 0, 0, 0),
		Text = "Total: " .. (preset.amount + interest),
		TextXAlignment = Enum.TextXAlignment.Center,
		TextColor3 = Color3.fromRGB(255, 150, 0),
		Font = Enum.Font.GothamBold,
	})

	local borrowBtn = Instance.new("TextButton")
	borrowBtn.Name = "BorrowBtn"
	borrowBtn.Size = UDim2.new(0.15, -5, 1, -8)
	borrowBtn.Position = UDim2.new(0.8, 0, 0, 4)
	borrowBtn.BackgroundColor3 = Color3.fromRGB(100, 180, 255)
	borrowBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
	borrowBtn.Text = "Borrow"
	borrowBtn.Font = Enum.Font.GothamBold
	borrowBtn.TextScaled = true
	borrowBtn.Parent = loanFrame
	createCorner(borrowBtn, 6)

	borrowBtn.MouseButton1Click:Connect(function()
		print("[DashboardGui] Borrow clicked:", preset.name, "Amount:", preset.amount)
		if playerData then
			local canBorrow, shortfall = ANKLending.CanBorrow(playerData, preset.amount)
			if canBorrow then
				print("[DashboardGui] Borrow approved")
				-- Send to server
				RequestMarketTrade:FireServer("loan", preset.name, preset.amount, preset.duration)
			else
				print("[DashboardGui] Insufficient collateral (need", shortfall, "more MolCoins)")
				borrowBtn.BackgroundColor3 = Color3.fromRGB(255, 100, 100)
				task.wait(1)
				borrowBtn.BackgroundColor3 = Color3.fromRGB(100, 180, 255)
			end
		end
	end)
end

-- ════════════════════════════════════════════════
-- TAB CONTENT: MAHJONG
-- ════════════════════════════════════════════════

local mahjongPanel = tabPanels["mahjong"]

createTextLabel(mahjongPanel, {
	Name = "Title",
	Size = UDim2.new(1, -20, 0, 40),
	Position = UDim2.new(0, 10, 0, 10),
	Text = "Mahjong Game",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.accent,
})

local playMahjongBtn = Instance.new("TextButton")
playMahjongBtn.Name = "PlayBtn"
playMahjongBtn.Size = UDim2.new(0, 200, 0, 60)
playMahjongBtn.Position = UDim2.new(0.5, -100, 0.5, -30)
playMahjongBtn.BackgroundColor3 = COLORS.accent
playMahjongBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
playMahjongBtn.Text = "Play Mahjong"
playMahjongBtn.Font = Enum.Font.GothamBold
playMahjongBtn.TextScaled = true
playMahjongBtn.Parent = mahjongPanel
createCorner(playMahjongBtn, 10)

playMahjongBtn.MouseButton1Click:Connect(function()
	print("[DashboardGui] Play Mahjong clicked")
	-- Close dashboard and start Mahjong game
	screenGui.Enabled = false
	if _G.MahjongGuiStart then
		_G.MahjongGuiStart()
	else
		print("[DashboardGui] MahjongGui not loaded yet")
	end
end)

-- ════════════════════════════════════════════════
-- KEYBOARD SHORTCUT: TAB TO TOGGLE DASHBOARD
-- ════════════════════════════════════════════════

local dashboardOpen = true

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	-- D = Toggle Dashboard
	if input.KeyCode == Enum.KeyCode.D then
		dashboardOpen = not dashboardOpen
		screenGui.Enabled = dashboardOpen
	end
end)

-- Set active button color on start
tabButtons["dashboard"].BackgroundColor3 = COLORS.tabActive
tabButtons["dashboard"].TextColor3 = COLORS.textPrimary
tabButtons["dashboard"].BackgroundTransparency = 0.1

print("[DashboardGui] Dashboard loaded — 5 tabs ready (Dashboard, Build, Trade, Research, Mahjong)")
