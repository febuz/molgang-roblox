-- StarterGui/WalletGui.client.lua
-- MolWallet + ChainExplorer combined GUI for MOLGANG
-- Tab 1: Balance (MolCoins + ChainTokens + QuantumDots)
-- Tab 2: Transactions (earn/spend history)
-- Tab 3: ANK Loans (lender + borrower view)
-- Tab 4: Achievements (badge collection + XP progress)
-- ChainExplorer: search, timeline, block visualization

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- ══════════════════════════════════════════════
-- CREATE MAIN SCREENGU
-- ══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "WalletGui"
screenGui.Enabled = false -- hidden by default, Tab key toggles
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = playerGui

-- Semi-transparent background
local bg = Instance.new("Frame")
bg.Size = UDim2.fromScale(1, 1)
bg.BackgroundColor3 = Color3.fromRGB(3, 7, 5)
bg.BackgroundTransparency = 0.3
bg.BorderSizePixel = 0
bg.Parent = screenGui

-- Main panel (centered)
local panel = Instance.new("Frame")
panel.Size = UDim2.fromOffset(600, 500)
panel.Position = UDim2.new(0.5, -300, 0.5, -250)
panel.BackgroundColor3 = Color3.fromRGB(8, 15, 12)
panel.BackgroundTransparency = 0.05
panel.BorderSizePixel = 0
panel.Parent = screenGui

local panelCorner = Instance.new("UICorner")
panelCorner.CornerRadius = UDim.new(0, 12)
panelCorner.Parent = panel

local panelStroke = Instance.new("UIStroke")
panelStroke.Color = Color3.fromRGB(34, 197, 94)
panelStroke.Thickness = 2
panelStroke.Parent = panel

-- ══════════════════════════════════════════════
-- HEADER
-- ══════════════════════════════════════════════

local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 50)
header.BackgroundColor3 = Color3.fromRGB(5, 12, 8)
header.BackgroundTransparency = 0.3
header.BorderSizePixel = 0
header.Parent = panel

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(0.7, 0, 1, 0)
titleLabel.Position = UDim2.fromOffset(15, 0)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "MOL WALLET"
titleLabel.TextColor3 = Color3.fromRGB(34, 197, 94)
titleLabel.TextScaled = true
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = header

-- Close button
local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(40, 40)
closeBtn.Position = UDim2.new(1, -45, 0, 5)
closeBtn.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
closeBtn.BackgroundTransparency = 0.5
closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
closeBtn.TextScaled = true
closeBtn.Font = Enum.Font.GothamBold
closeBtn.Parent = header

local closeBtnCorner = Instance.new("UICorner")
closeBtnCorner.CornerRadius = UDim.new(0, 6)
closeBtnCorner.Parent = closeBtn

closeBtn.MouseButton1Click:Connect(function()
	screenGui.Enabled = false
end)

-- ══════════════════════════════════════════════
-- TAB BAR
-- ══════════════════════════════════════════════

local tabBar = Instance.new("Frame")
tabBar.Size = UDim2.new(1, 0, 0, 35)
tabBar.Position = UDim2.fromOffset(0, 50)
tabBar.BackgroundColor3 = Color3.fromRGB(5, 10, 8)
tabBar.BackgroundTransparency = 0.5
tabBar.BorderSizePixel = 0
tabBar.Parent = panel

local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.SortOrder = Enum.SortOrder.LayoutOrder
tabLayout.Parent = tabBar

local TABS = {"Balance", "Transactions", "ANK Loans", "Achievements", "ChainExplorer"}
local tabButtons = {}
local tabFrames = {}
local currentTab = "Balance"

-- Content area
local contentArea = Instance.new("Frame")
contentArea.Size = UDim2.new(1, -20, 1, -95)
contentArea.Position = UDim2.fromOffset(10, 90)
contentArea.BackgroundTransparency = 1
contentArea.BorderSizePixel = 0
contentArea.ClipsDescendants = true
contentArea.Parent = panel

for i, tabName in ipairs(TABS) do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(1 / #TABS, 0, 1, 0)
	btn.LayoutOrder = i
	btn.BackgroundTransparency = 1
	btn.Text = tabName
	btn.TextColor3 = Color3.fromRGB(100, 140, 120)
	btn.TextScaled = true
	btn.Font = Enum.Font.Gotham
	btn.Parent = tabBar

	tabButtons[tabName] = btn

	-- Create tab content frame
	local frame = Instance.new("ScrollingFrame")
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundTransparency = 1
	frame.BorderSizePixel = 0
	frame.ScrollBarThickness = 3
	frame.ScrollBarImageColor3 = Color3.fromRGB(34, 197, 94)
	frame.Visible = (tabName == "Balance")
	frame.CanvasSize = UDim2.new(0, 0, 0, 0)
	frame.AutomaticCanvasSize = Enum.AutomaticSize.Y
	frame.Parent = contentArea

	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 8)
	layout.Parent = frame

	tabFrames[tabName] = frame

	btn.MouseButton1Click:Connect(function()
		for name, f in pairs(tabFrames) do
			f.Visible = (name == tabName)
		end
		for name, b in pairs(tabButtons) do
			b.TextColor3 = (name == tabName) and Color3.fromRGB(34, 197, 94) or Color3.fromRGB(100, 140, 120)
		end
		currentTab = tabName
	end)
end

-- ══════════════════════════════════════════════
-- TAB 1: BALANCE
-- ══════════════════════════════════════════════

local function createBalanceCard(parent, icon, title, value, color, order)
	local card = Instance.new("Frame")
	card.Size = UDim2.new(1, 0, 0, 70)
	card.BackgroundColor3 = Color3.fromRGB(10, 20, 15)
	card.BackgroundTransparency = 0.3
	card.BorderSizePixel = 0
	card.LayoutOrder = order
	card.Parent = parent

	local cardCorner = Instance.new("UICorner")
	cardCorner.CornerRadius = UDim.new(0, 8)
	cardCorner.Parent = card

	local iconLabel = Instance.new("TextLabel")
	iconLabel.Size = UDim2.fromOffset(50, 50)
	iconLabel.Position = UDim2.fromOffset(10, 10)
	iconLabel.BackgroundTransparency = 1
	iconLabel.Text = icon
	iconLabel.TextScaled = true
	iconLabel.Parent = card

	local titleLbl = Instance.new("TextLabel")
	titleLbl.Size = UDim2.new(0.4, 0, 0, 25)
	titleLbl.Position = UDim2.fromOffset(70, 8)
	titleLbl.BackgroundTransparency = 1
	titleLbl.Text = title
	titleLbl.TextColor3 = Color3.fromRGB(150, 180, 160)
	titleLbl.TextScaled = true
	titleLbl.Font = Enum.Font.Gotham
	titleLbl.TextXAlignment = Enum.TextXAlignment.Left
	titleLbl.Parent = card

	local valueLbl = Instance.new("TextLabel")
	valueLbl.Name = "Value"
	valueLbl.Size = UDim2.new(0.5, 0, 0, 35)
	valueLbl.Position = UDim2.fromOffset(70, 30)
	valueLbl.BackgroundTransparency = 1
	valueLbl.Text = tostring(value)
	valueLbl.TextColor3 = color
	valueLbl.TextScaled = true
	valueLbl.Font = Enum.Font.GothamBold
	valueLbl.TextXAlignment = Enum.TextXAlignment.Left
	valueLbl.Parent = card

	return card
end

local balanceFrame = tabFrames["Balance"]
local molCoinCard = createBalanceCard(balanceFrame, "🪙", "MolCoins", "100", Color3.fromRGB(255, 215, 0), 1)
local chainCard = createBalanceCard(balanceFrame, "⛓", "ChainTokens", "0", Color3.fromRGB(56, 189, 248), 2)
local quantumCard = createBalanceCard(balanceFrame, "⚛", "QuantumDots", "0", Color3.fromRGB(168, 85, 247), 3)
local elementsCard = createBalanceCard(balanceFrame, "🔬", "Elements Found", "0/118", Color3.fromRGB(34, 197, 94), 4)
local moleculesCard = createBalanceCard(balanceFrame, "🧪", "Molecules Built", "0", Color3.fromRGB(255, 150, 50), 5)

-- Daily claim button
local claimBtn = Instance.new("TextButton")
claimBtn.Size = UDim2.new(1, 0, 0, 50)
claimBtn.LayoutOrder = 6
claimBtn.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
claimBtn.BackgroundTransparency = 0.3
claimBtn.Text = "CLAIM DAILY BONUS — 50 MolCoins"
claimBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
claimBtn.TextScaled = true
claimBtn.Font = Enum.Font.GothamBold
claimBtn.Parent = balanceFrame

local claimCorner = Instance.new("UICorner")
claimCorner.CornerRadius = UDim.new(0, 8)
claimCorner.Parent = claimBtn

claimBtn.MouseButton1Click:Connect(function()
	Remotes.FireServer("RequestDailyClaim")
end)

-- ══════════════════════════════════════════════
-- TAB 5: CHAIN EXPLORER
-- ══════════════════════════════════════════════

local chainFrame = tabFrames["ChainExplorer"]

-- Search bar
local searchFrame = Instance.new("Frame")
searchFrame.Size = UDim2.new(1, 0, 0, 35)
searchFrame.BackgroundColor3 = Color3.fromRGB(10, 20, 15)
searchFrame.BackgroundTransparency = 0.3
searchFrame.BorderSizePixel = 0
searchFrame.LayoutOrder = 1
searchFrame.Parent = chainFrame

local searchCorner = Instance.new("UICorner")
searchCorner.CornerRadius = UDim.new(0, 6)
searchCorner.Parent = searchFrame

local searchBox = Instance.new("TextBox")
searchBox.Size = UDim2.new(0.7, 0, 1, -6)
searchBox.Position = UDim2.fromOffset(5, 3)
searchBox.BackgroundTransparency = 1
searchBox.PlaceholderText = "Search molecule, player, or hash..."
searchBox.PlaceholderColor3 = Color3.fromRGB(80, 100, 90)
searchBox.Text = ""
searchBox.TextColor3 = Color3.fromRGB(200, 230, 210)
searchBox.TextScaled = true
searchBox.Font = Enum.Font.Gotham
searchBox.TextXAlignment = Enum.TextXAlignment.Left
searchBox.ClearTextOnFocus = false
searchBox.Parent = searchFrame

local searchBtn = Instance.new("TextButton")
searchBtn.Size = UDim2.new(0.28, 0, 1, -6)
searchBtn.Position = UDim2.new(0.71, 0, 0, 3)
searchBtn.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
searchBtn.BackgroundTransparency = 0.3
searchBtn.Text = "SEARCH"
searchBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
searchBtn.TextScaled = true
searchBtn.Font = Enum.Font.GothamBold
searchBtn.Parent = searchFrame

local searchBtnCorner = Instance.new("UICorner")
searchBtnCorner.CornerRadius = UDim.new(0, 6)
searchBtnCorner.Parent = searchBtn

-- Genesis block display
local genesisCard = Instance.new("Frame")
genesisCard.Size = UDim2.new(1, 0, 0, 45)
genesisCard.BackgroundColor3 = Color3.fromRGB(15, 30, 20)
genesisCard.BackgroundTransparency = 0.3
genesisCard.BorderSizePixel = 0
genesisCard.LayoutOrder = 2
genesisCard.Parent = chainFrame

local genesisCorner = Instance.new("UICorner")
genesisCorner.CornerRadius = UDim.new(0, 6)
genesisCorner.Parent = genesisCard

local genesisStroke = Instance.new("UIStroke")
genesisStroke.Color = Color3.fromRGB(255, 215, 0)
genesisStroke.Thickness = 1
genesisStroke.Parent = genesisCard

local genesisLabel = Instance.new("TextLabel")
genesisLabel.Size = UDim2.fromScale(1, 0.5)
genesisLabel.BackgroundTransparency = 1
genesisLabel.Text = "BLOCK #1 — MOLGANG GENESIS"
genesisLabel.TextColor3 = Color3.fromRGB(255, 215, 0)
genesisLabel.TextScaled = true
genesisLabel.Font = Enum.Font.GothamBold
genesisLabel.Parent = genesisCard

local genesisHash = Instance.new("TextLabel")
genesisHash.Size = UDim2.fromScale(1, 0.5)
genesisHash.Position = UDim2.fromScale(0, 0.5)
genesisHash.BackgroundTransparency = 1
genesisHash.Text = "Hash: 00000000...0000 — 1 april 2026"
genesisHash.TextColor3 = Color3.fromRGB(100, 140, 120)
genesisHash.TextScaled = true
genesisHash.Font = Enum.Font.Code
genesisHash.Parent = genesisCard

-- Chain entries container
local entriesContainer = Instance.new("Frame")
entriesContainer.Name = "EntriesContainer"
entriesContainer.Size = UDim2.new(1, 0, 0, 0)
entriesContainer.AutomaticSize = Enum.AutomaticSize.Y
entriesContainer.BackgroundTransparency = 1
entriesContainer.LayoutOrder = 3
entriesContainer.Parent = chainFrame

local entriesLayout = Instance.new("UIListLayout")
entriesLayout.SortOrder = Enum.SortOrder.LayoutOrder
entriesLayout.Padding = UDim.new(0, 4)
entriesLayout.Parent = entriesContainer

-- Live counter
local counterLabel = Instance.new("TextLabel")
counterLabel.Size = UDim2.new(1, 0, 0, 25)
counterLabel.LayoutOrder = 100
counterLabel.BackgroundTransparency = 1
counterLabel.Text = "0 registrations today — 0 total"
counterLabel.TextColor3 = Color3.fromRGB(100, 140, 120)
counterLabel.TextScaled = true
counterLabel.Font = Enum.Font.Gotham
counterLabel.Parent = chainFrame

-- ══════════════════════════════════════════════
-- DATA REFRESH
-- ══════════════════════════════════════════════

local function refreshData()
	local data = Remotes.GetPlayerData:InvokeServer()
	if not data then return end

	-- Update balance cards
	local mc = molCoinCard:FindFirstChild("Value")
	if mc then mc.Text = tostring(data.molCoins or 0) end

	local ct = chainCard:FindFirstChild("Value")
	if ct then ct.Text = tostring(data.chainTokens or 0) end

	local ef = elementsCard:FindFirstChild("Value")
	if ef then
		local count = 0
		for _ in pairs(data.elementsFound or {}) do count = count + 1 end
		ef.Text = count .. "/118"
	end

	local mb = moleculesCard:FindFirstChild("Value")
	if mb then mb.Text = tostring(data.totalMoleculesBuilt or 0) end
end

-- Refresh on open
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		refreshData()
	end
end)

-- Listen for chain entries
Remotes.ChainEntryAdded.OnClientEvent:Connect(function(entryData)
	if type(entryData) ~= "table" then return end
	if entryData.player then
		-- Single entry
		local card = Instance.new("Frame")
		card.Size = UDim2.new(1, 0, 0, 40)
		card.BackgroundColor3 = Color3.fromRGB(10, 20, 15)
		card.BackgroundTransparency = 0.3
		card.BorderSizePixel = 0
		card.LayoutOrder = -os.time()
		card.Parent = entriesContainer

		local cc = Instance.new("UICorner")
		cc.CornerRadius = UDim.new(0, 4)
		cc.Parent = card

		local info = Instance.new("TextLabel")
		info.Size = UDim2.fromScale(0.6, 0.5)
		info.Position = UDim2.fromOffset(8, 2)
		info.BackgroundTransparency = 1
		info.Text = (entryData.player or "?") .. " — " .. (entryData.molecule or "?")
		info.TextColor3 = Color3.fromRGB(200, 230, 210)
		info.TextScaled = true
		info.Font = Enum.Font.Gotham
		info.TextXAlignment = Enum.TextXAlignment.Left
		info.Parent = card

		local hash = Instance.new("TextLabel")
		hash.Size = UDim2.fromScale(0.9, 0.5)
		hash.Position = UDim2.new(0, 8, 0.5, 0)
		hash.BackgroundTransparency = 1
		local h = entryData.hash or "0000000000000000"
		hash.Text = string.sub(h, 1, 8) .. "..." .. string.sub(h, -4)
		hash.TextColor3 = Color3.fromRGB(100, 140, 120)
		hash.TextScaled = true
		hash.Font = Enum.Font.Code
		hash.TextXAlignment = Enum.TextXAlignment.Left
		hash.Parent = card
	end
end)

-- Search handler
searchBtn.MouseButton1Click:Connect(function()
	local query = searchBox.Text
	if query == "" then return end
	Remotes.FireServer("RequestChainQuery", query)
end)

-- Daily claim result
Remotes.DailyClaimResult.OnClientEvent:Connect(function(data)
	if data.success then
		claimBtn.Text = "CLAIMED! +" .. data.amount .. " MolCoins (streak: " .. (data.streak or 1) .. ")"
		claimBtn.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
		refreshData()
	else
		local remaining = data.remaining or 0
		local hours = math.floor(remaining / 3600)
		local mins = math.floor((remaining % 3600) / 60)
		claimBtn.Text = "Next claim in " .. hours .. "h " .. mins .. "m"
	end
end)

print("[MOLGANG] WalletGui initialized")
