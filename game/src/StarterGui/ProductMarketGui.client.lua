--[[
	ProductMarketGui.client.lua
	MOLGANG — Product Sales Market Interface

	Sell refined products from slag/ore processing:
	- V2O5, TiO2, Fe2O3, Cr2O3, MnO2, Al2O3
	- Slag Bio-Enhancer, Construction Aggregate
	- Dynamic prices that fluctuate each game day
	- P&L summary showing profit/loss

	Key: X to toggle (eXchange)
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local ProductMarket = require(ReplicatedStorage.Modules.ProductMarket)

local C = {
	bg = Color3.fromRGB(8, 14, 10),
	panel = Color3.fromRGB(18, 28, 20),
	panelLight = Color3.fromRGB(30, 42, 32),
	accent = Color3.fromRGB(0, 220, 100),
	gold = Color3.fromRGB(255, 215, 0),
	red = Color3.fromRGB(220, 60, 60),
	text = Color3.fromRGB(225, 235, 225),
	textDim = Color3.fromRGB(120, 140, 120),
	profit = Color3.fromRGB(0, 255, 120),
	loss = Color3.fromRGB(255, 80, 80),
}

local function corner(p, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = p end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "ProductMarketGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.DisplayOrder = 22
screenGui.Enabled = false
screenGui.Parent = playerGui

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 700, 0, 520)
main.Position = UDim2.new(0.5, -350, 0.5, -260)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.02
main.Parent = screenGui
corner(main, 14)
local ms = Instance.new("UIStroke"); ms.Color = C.accent; ms.Thickness = 2; ms.Parent = main

-- Title
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 42)
titleBar.BackgroundColor3 = C.panel
titleBar.Parent = main
corner(titleBar, 14)

local titleL = Instance.new("TextLabel")
titleL.Size = UDim2.new(0.5, 0, 1, 0)
titleL.Position = UDim2.new(0, 14, 0, 0)
titleL.BackgroundTransparency = 1
titleL.Text = "PRODUCT EXCHANGE — Sell Refined Metals"
titleL.TextColor3 = C.accent
titleL.TextScaled = true
titleL.Font = Enum.Font.GothamBold
titleL.TextXAlignment = Enum.TextXAlignment.Left
titleL.Parent = titleBar

-- P&L summary
local pnlLabel = Instance.new("TextLabel")
pnlLabel.Name = "PnL"
pnlLabel.Size = UDim2.new(0.4, 0, 1, 0)
pnlLabel.Position = UDim2.new(0.55, 0, 0, 0)
pnlLabel.BackgroundTransparency = 1
pnlLabel.Text = "P&L: 0 MC | Margin: 0%"
pnlLabel.TextColor3 = C.gold
pnlLabel.TextScaled = true
pnlLabel.Font = Enum.Font.GothamBold
pnlLabel.TextXAlignment = Enum.TextXAlignment.Right
pnlLabel.Parent = titleBar

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(28, 28); closeBtn.Position = UDim2.new(1, -36, 0, 7)
closeBtn.BackgroundColor3 = C.red; closeBtn.Text = "X"; closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold; closeBtn.TextScaled = true
closeBtn.Parent = titleBar; corner(closeBtn, 6)
closeBtn.MouseButton1Click:Connect(function() screenGui.Enabled = false end)

-- Hint for new players
local hintLabel = Instance.new("TextLabel")
hintLabel.Size = UDim2.new(1, -16, 0, 16)
hintLabel.Position = UDim2.new(0, 8, 0, 44)
hintLabel.BackgroundTransparency = 1
hintLabel.Text = "TIP: Process slag (S key) → extract atoms → sell as refined products here for MolCoins!"
hintLabel.TextColor3 = Color3.fromRGB(100, 180, 130)
hintLabel.TextScaled = true; hintLabel.Font = Enum.Font.Gotham
hintLabel.TextXAlignment = Enum.TextXAlignment.Left
hintLabel.Parent = main

-- Game day indicator
local dayLabel = Instance.new("TextLabel")
dayLabel.Size = UDim2.new(1, -16, 0, 18)
dayLabel.Position = UDim2.new(0, 8, 0, 60)
dayLabel.BackgroundTransparency = 1
dayLabel.Text = "Market Day 1 — Prices update daily"
dayLabel.TextColor3 = C.textDim
dayLabel.TextScaled = true
dayLabel.Font = Enum.Font.Gotham
dayLabel.TextXAlignment = Enum.TextXAlignment.Left
dayLabel.Parent = main

-- Product list
local scroll = Instance.new("ScrollingFrame")
scroll.Size = UDim2.new(1, -16, 1, -70)
scroll.Position = UDim2.new(0, 8, 0, 64)
scroll.BackgroundTransparency = 1
scroll.ScrollBarThickness = 6
scroll.CanvasSize = UDim2.new(0, 0, 0, #ProductMarket.Products * 62)
scroll.Parent = main

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 4)
layout.Parent = scroll

-- Populate products
local productCards = {}
local currentPrices = {}

for _, product in ipairs(ProductMarket.Products) do
	local card = Instance.new("Frame")
	card.Name = product.id
	card.Size = UDim2.new(1, 0, 0, 56)
	card.BackgroundColor3 = C.panelLight
	card.Parent = scroll
	corner(card, 8)

	-- Color dot
	local dot = Instance.new("Frame")
	dot.Size = UDim2.fromOffset(8, 40)
	dot.Position = UDim2.new(0, 4, 0.5, -20)
	dot.BackgroundColor3 = product.color
	dot.Parent = card
	corner(dot, 4)

	-- Name
	local nameL = Instance.new("TextLabel")
	nameL.Size = UDim2.new(0.32, -16, 0, 20)
	nameL.Position = UDim2.new(0, 16, 0, 4)
	nameL.BackgroundTransparency = 1
	nameL.Text = product.name
	nameL.TextColor3 = C.text
	nameL.TextScaled = true
	nameL.Font = Enum.Font.GothamBold
	nameL.TextXAlignment = Enum.TextXAlignment.Left
	nameL.Parent = card

	-- Category + description
	local descL = Instance.new("TextLabel")
	descL.Size = UDim2.new(0.32, -16, 0, 14)
	descL.Position = UDim2.new(0, 16, 0, 24)
	descL.BackgroundTransparency = 1
	descL.Text = product.category .. " | " .. product.realWorldPrice
	descL.TextColor3 = C.textDim
	descL.TextScaled = true
	descL.Font = Enum.Font.Gotham
	descL.TextXAlignment = Enum.TextXAlignment.Left
	descL.Parent = card

	-- Required atoms
	local atomStr = ""
	for atom, count in pairs(product.requiredAtoms) do
		atomStr = atomStr .. count .. atom .. " "
	end
	local atomL = Instance.new("TextLabel")
	atomL.Size = UDim2.new(0.15, 0, 0, 14)
	atomL.Position = UDim2.new(0, 16, 0, 40)
	atomL.BackgroundTransparency = 1
	atomL.Text = atomStr ~= "" and ("Needs: " .. atomStr) or "Byproduct"
	atomL.TextColor3 = Color3.fromRGB(100, 180, 150)
	atomL.TextScaled = true
	atomL.Font = Enum.Font.Gotham
	atomL.TextXAlignment = Enum.TextXAlignment.Left
	atomL.Parent = card

	-- Price display (updates dynamically)
	local priceL = Instance.new("TextLabel")
	priceL.Name = "Price"
	priceL.Size = UDim2.new(0, 80, 0, 24)
	priceL.Position = UDim2.new(0.55, 0, 0.5, -12)
	priceL.BackgroundTransparency = 1
	priceL.Text = product.basePrice .. " MC"
	priceL.TextColor3 = C.gold
	priceL.TextScaled = true
	priceL.Font = Enum.Font.GothamBold
	priceL.TextXAlignment = Enum.TextXAlignment.Center
	priceL.Parent = card

	-- Quantity selector
	local qtyFrame = Instance.new("Frame")
	qtyFrame.Size = UDim2.new(0, 80, 0, 28)
	qtyFrame.Position = UDim2.new(0.7, 0, 0.5, -14)
	qtyFrame.BackgroundColor3 = Color3.fromRGB(25, 35, 28)
	qtyFrame.Parent = card
	corner(qtyFrame, 4)

	local qtyLabel = Instance.new("TextLabel")
	qtyLabel.Name = "Qty"
	qtyLabel.Size = UDim2.new(0.4, 0, 1, 0)
	qtyLabel.Position = UDim2.new(0.3, 0, 0, 0)
	qtyLabel.BackgroundTransparency = 1
	qtyLabel.Text = "1"
	qtyLabel.TextColor3 = C.text
	qtyLabel.TextScaled = true
	qtyLabel.Font = Enum.Font.GothamBold
	qtyLabel.Parent = qtyFrame

	local minusBtn = Instance.new("TextButton")
	minusBtn.Size = UDim2.new(0.3, 0, 1, 0)
	minusBtn.BackgroundTransparency = 1
	minusBtn.Text = "-"; minusBtn.TextColor3 = C.red
	minusBtn.Font = Enum.Font.GothamBold; minusBtn.TextScaled = true
	minusBtn.Parent = qtyFrame

	local plusBtn = Instance.new("TextButton")
	plusBtn.Size = UDim2.new(0.3, 0, 1, 0)
	plusBtn.Position = UDim2.new(0.7, 0, 0, 0)
	plusBtn.BackgroundTransparency = 1
	plusBtn.Text = "+"; plusBtn.TextColor3 = C.accent
	plusBtn.Font = Enum.Font.GothamBold; plusBtn.TextScaled = true
	plusBtn.Parent = qtyFrame

	local qty = 1
	minusBtn.MouseButton1Click:Connect(function()
		qty = math.max(1, qty - 1); qtyLabel.Text = tostring(qty)
	end)
	plusBtn.MouseButton1Click:Connect(function()
		qty = math.min(99, qty + 1); qtyLabel.Text = tostring(qty)
	end)

	-- Sell button
	local sellBtn = Instance.new("TextButton")
	sellBtn.Size = UDim2.new(0, 70, 0, 34)
	sellBtn.Position = UDim2.new(0.88, 0, 0.5, -17)
	sellBtn.BackgroundColor3 = C.accent
	sellBtn.Text = "SELL"
	sellBtn.TextColor3 = Color3.new(0, 0, 0)
	sellBtn.Font = Enum.Font.GothamBold
	sellBtn.TextScaled = true
	sellBtn.Parent = card
	corner(sellBtn, 6)

	local pid = product.id
	sellBtn.MouseButton1Click:Connect(function()
		local r = Remotes:FindFirstChild("RequestSellProduct")
		if r then r:FireServer(pid, qty) end
		sellBtn.BackgroundColor3 = C.gold
		task.delay(0.3, function() sellBtn.BackgroundColor3 = C.accent end)
	end)

	productCards[product.id] = {card = card, priceLabel = priceL, qtyLabel = qtyLabel}
end

-- ═══════════════════════════════════════════════
-- SERVER EVENTS
-- ═══════════════════════════════════════════════

local priceEvent = Remotes:FindFirstChild("ProductPricesUpdate")
if priceEvent then
	priceEvent.OnClientEvent:Connect(function(data)
		if data.prices then
			for productId, price in pairs(data.prices) do
				local pc = productCards[productId]
				if pc then
					local oldPrice = currentPrices[productId] or price
					pc.priceLabel.Text = price .. " MC"
					-- Green if price up, red if down
					if price > oldPrice then
						pc.priceLabel.TextColor3 = C.profit
					elseif price < oldPrice then
						pc.priceLabel.TextColor3 = C.loss
					else
						pc.priceLabel.TextColor3 = C.gold
					end
					currentPrices[productId] = price
				end
			end
		end
		if data.gameDay then
			dayLabel.Text = "Market Day " .. data.gameDay .. " — Prices update daily"
		end
		if data.pnl then
			local margin = data.pnl.margin or 0
			pnlLabel.Text = string.format("Net: %d MC | Margin: %d%%", data.pnl.netProfit or 0, margin)
			pnlLabel.TextColor3 = (data.pnl.netProfit or 0) >= 0 and C.profit or C.loss
		end
	end)
end

-- Refresh on open
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		local r = Remotes:FindFirstChild("RequestProductPrices")
		if r then r:FireServer() end
	end
end)

print("[MOLGANG] ProductMarketGui loaded — X key to open, sell 8 products")
