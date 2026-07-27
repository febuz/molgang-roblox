--[[
	MarketBiddingGui.client.lua
	MOLGANG — Competitive Market Bidding Interface

	Place bids on products, view active bids, cancel bids.
	Accessed via Product Exchange (X key) as a sub-tab.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local ProductMarket = require(ReplicatedStorage.Modules.ProductMarket)

local C = {
	bg = Color3.fromRGB(8, 12, 16),
	panel = Color3.fromRGB(18, 24, 32),
	accent = Color3.fromRGB(0, 180, 120),
	green = Color3.fromRGB(0, 200, 100),
	red = Color3.fromRGB(220, 60, 60),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(230, 235, 245),
	textDim = Color3.fromRGB(130, 145, 160),
}

local function corner(o, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = o end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "MarketBiddingGui"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 20
screenGui.Enabled = false
screenGui.Parent = playerGui

local responsiveScale = Instance.new("UIScale")
responsiveScale.Name = "ResponsiveScale"
responsiveScale.Parent = screenGui
local biddingCamera = workspace.CurrentCamera
local function updateBiddingScale()
	if not biddingCamera then return end
	responsiveScale.Scale = math.clamp(math.min(
		(biddingCamera.ViewportSize.X - 20) / 500,
		(biddingCamera.ViewportSize.Y - 20) / 420
	), 0.65, 1)
end
updateBiddingScale()
if biddingCamera then
	biddingCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateBiddingScale)
end

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 500, 0, 420)
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.05
main.Parent = screenGui
corner(main, 12)

-- Title
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 38)
title.BackgroundColor3 = Color3.fromRGB(5, 8, 12)
title.Text = "MARKET BIDDING"
title.TextColor3 = C.accent
title.TextScaled = true
title.Font = Enum.Font.GothamBold
title.Parent = main
corner(title, 12)

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 50, 0, 28)
closeBtn.Position = UDim2.new(1, -58, 0, 5)
closeBtn.BackgroundColor3 = C.red
closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = title
corner(closeBtn, 6)
closeBtn.Activated:Connect(function() screenGui.Enabled = false end)

-- New bid section
local newBidLabel = Instance.new("TextLabel")
newBidLabel.Size = UDim2.new(1, -16, 0, 20)
newBidLabel.Position = UDim2.new(0, 8, 0, 44)
newBidLabel.BackgroundTransparency = 1
newBidLabel.Text = "Place a Market Order"
newBidLabel.TextColor3 = C.accent
newBidLabel.TextScaled = true
newBidLabel.Font = Enum.Font.GothamBold
newBidLabel.TextXAlignment = Enum.TextXAlignment.Left
newBidLabel.Parent = main

-- Product selector
local productBtns = {}
local selectedProduct = nil
local productFrame = Instance.new("Frame")
productFrame.Name = "ProductSelector"
productFrame.Size = UDim2.new(1, -16, 0, 58)
productFrame.Position = UDim2.new(0, 8, 0, 66)
productFrame.BackgroundTransparency = 1
productFrame.Parent = main

local productChoices = {}
for _, product in ipairs(ProductMarket.Products) do
	local label = product.formula
	if product.id == "SlagBioEnhancer" then label = "BIO ENHANCER" end
	if product.id == "ConstructionAggregate" then label = "AGGREGATE" end
	table.insert(productChoices, {id = product.id, label = label})
end

local function selectProduct(productId)
	selectedProduct = productId
	for id, b in pairs(productBtns) do
		b.BackgroundColor3 = id == productId and C.accent or C.panel
		b.TextColor3 = id == productId and Color3.new(0,0,0) or C.text
	end
end

for i, choice in ipairs(productChoices) do
	local pName = choice.id
	local pb = Instance.new("TextButton")
	pb.Name = pName .. "Button"
	local col = (i - 1) % 4
	local row = math.floor((i - 1) / 4)
	pb.Size = UDim2.new(0.25, -3, 0, 26)
	pb.Position = UDim2.new(col * 0.25, 1, 0, row * 29)
	pb.BackgroundColor3 = C.panel
	pb.Text = choice.label
	pb.TextColor3 = C.text
	pb.TextScaled = true
	pb.Font = Enum.Font.GothamBold
	pb.Parent = productFrame
	corner(pb, 4)
	productBtns[pName] = pb
	pb.Activated:Connect(function()
		selectProduct(pName)
	end)
end
selectProduct(productChoices[1].id)

-- Price + quantity inputs
local priceBox = Instance.new("TextBox")
priceBox.Size = UDim2.new(0.3, -4, 0, 32)
priceBox.Position = UDim2.new(0, 8, 0, 132)
priceBox.BackgroundColor3 = C.panel
priceBox.PlaceholderText = "Price (MC)"
priceBox.Text = ""
priceBox.TextColor3 = C.gold
priceBox.PlaceholderColor3 = C.textDim
priceBox.TextScaled = true
priceBox.Font = Enum.Font.Gotham
priceBox.Parent = main
corner(priceBox, 6)

local qtyBox = Instance.new("TextBox")
qtyBox.Size = UDim2.new(0.2, -4, 0, 32)
qtyBox.Position = UDim2.new(0.32, 4, 0, 132)
qtyBox.BackgroundColor3 = C.panel
qtyBox.PlaceholderText = "Qty"
qtyBox.Text = "1"
qtyBox.TextColor3 = C.text
qtyBox.PlaceholderColor3 = C.textDim
qtyBox.TextScaled = true
qtyBox.Font = Enum.Font.Gotham
qtyBox.Parent = main
corner(qtyBox, 6)

local bidBtn = Instance.new("TextButton")
bidBtn.Size = UDim2.new(0.21, -4, 0, 32)
bidBtn.Position = UDim2.new(0.54, 4, 0, 132)
bidBtn.BackgroundColor3 = C.green
bidBtn.Text = "PLACE BID"
bidBtn.TextColor3 = Color3.new(1,1,1)
bidBtn.TextScaled = true
bidBtn.Font = Enum.Font.GothamBold
bidBtn.Parent = main
corner(bidBtn, 6)

local sellBtn = Instance.new("TextButton")
sellBtn.Size = UDim2.new(0.21, -4, 0, 32)
sellBtn.Position = UDim2.new(0.77, 4, 0, 132)
sellBtn.BackgroundColor3 = C.accent
sellBtn.Text = "PLACE SELL"
sellBtn.TextColor3 = Color3.new(1, 1, 1)
sellBtn.TextScaled = true
sellBtn.Font = Enum.Font.GothamBold
sellBtn.Parent = main
corner(sellBtn, 6)

local statusLabel = Instance.new("TextLabel")
statusLabel.Name = "OrderStatus"
statusLabel.Size = UDim2.new(1, -16, 0, 18)
statusLabel.Position = UDim2.new(0, 8, 0, 168)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "Choose a product, enter a price and quantity."
statusLabel.TextColor3 = C.textDim
statusLabel.TextScaled = true
statusLabel.Font = Enum.Font.Gotham
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.Parent = main

local function setStatus(text, color)
	statusLabel.Text = text
	statusLabel.TextColor3 = color or C.textDim
end

local function requestBids()
	local r = Remotes:FindFirstChild("RequestMarketBids")
	if r then r:FireServer() else setStatus("Order book service is unavailable; try again shortly.", C.red) end
end

bidBtn.Activated:Connect(function()
	if not selectedProduct then setStatus("Select a product first.", C.red); return end
	local price = tonumber(priceBox.Text)
	local qty = tonumber(qtyBox.Text) or 1
	if not price or price < 10 then setStatus("A bid must be at least 10 MC per unit.", C.red); return end
	if qty < 1 then setStatus("Quantity must be at least 1.", C.red); return end
	local r = Remotes:FindFirstChild("RequestPlaceBid")
	if not r then setStatus("Order service is unavailable; try again shortly.", C.red); return end
	r:FireServer(selectedProduct, price, qty)
	setStatus("Bid submitted — checking escrow and matching…", C.gold)
	priceBox.Text = ""
	task.delay(0.25, requestBids)
end)

sellBtn.Activated:Connect(function()
	if not selectedProduct then setStatus("Select a product first.", C.red); return end
	local price = tonumber(priceBox.Text)
	local qty = tonumber(qtyBox.Text) or 1
	if not price or price < 1 or qty < 1 then setStatus("Enter a positive price and quantity.", C.red); return end
	local r = Remotes:FindFirstChild("RequestPlaceSell")
	if not r then setStatus("Order service is unavailable; try again shortly.", C.red); return end
	r:FireServer(selectedProduct, price, qty)
	setStatus("Sell order submitted — checking inventory and matching…", C.gold)
	priceBox.Text = ""
	task.delay(0.25, requestBids)
end)

-- Active bids list
local bidsLabel = Instance.new("TextLabel")
bidsLabel.Size = UDim2.new(1, -16, 0, 20)
bidsLabel.Position = UDim2.new(0, 8, 0, 188)
bidsLabel.BackgroundTransparency = 1
bidsLabel.Text = "Active Orders"
bidsLabel.TextColor3 = C.gold
bidsLabel.TextScaled = true
bidsLabel.Font = Enum.Font.GothamBold
bidsLabel.TextXAlignment = Enum.TextXAlignment.Left
bidsLabel.Parent = main

local bidsScroll = Instance.new("ScrollingFrame")
bidsScroll.Size = UDim2.new(1, -16, 0, 205)
bidsScroll.Position = UDim2.new(0, 8, 0, 211)
bidsScroll.BackgroundColor3 = C.panel
bidsScroll.ScrollBarThickness = 4
bidsScroll.Parent = main
corner(bidsScroll, 6)

local bidsLayout = Instance.new("UIListLayout")
bidsLayout.Padding = UDim.new(0, 3)
bidsLayout.Parent = bidsScroll

-- Handle bid response
local bidResponseEvent = Remotes:FindFirstChild("MarketBidsResponse")
if bidResponseEvent then
	bidResponseEvent.OnClientEvent:Connect(function(data)
		for _, child in bidsScroll:GetChildren() do
			if child:IsA("Frame") then child:Destroy() end
		end

		if data.bids then
			for _, bid in ipairs(data.bids) do
				local bf = Instance.new("Frame")
				bf.Size = UDim2.new(1, -8, 0, 30)
				bf.BackgroundColor3 = C.bg
				bf.Parent = bidsScroll
				corner(bf, 4)

				local bl = Instance.new("TextLabel")
				bl.Size = UDim2.new(0.7, 0, 1, 0)
				bl.Position = UDim2.new(0, 6, 0, 0)
				bl.BackgroundTransparency = 1
				bl.Text = bid.playerName .. ": " .. bid.quantity .. "x " .. bid.productId .. " @ " .. bid.price .. " MC"
				bl.TextColor3 = C.text
				bl.TextScaled = true; bl.Font = Enum.Font.Gotham
				bl.TextXAlignment = Enum.TextXAlignment.Left
				bl.Parent = bf

				-- Cancel button for own bids
				local isMyBid = false
				if data.myBids then
					for _, mb in ipairs(data.myBids) do
						if mb.bidId == bid.bidId then isMyBid = true end
					end
				end
				if isMyBid then
					local cb = Instance.new("TextButton")
					cb.Size = UDim2.new(0.2, 0, 0.8, 0)
					cb.Position = UDim2.new(0.78, 0, 0.1, 0)
					cb.BackgroundColor3 = C.red
					cb.Text = "Cancel"
					cb.TextColor3 = Color3.new(1,1,1)
					cb.TextScaled = true; cb.Font = Enum.Font.GothamBold
					cb.Parent = bf
					corner(cb, 4)
					cb.Activated:Connect(function()
						local r = Remotes:FindFirstChild("RequestCancelBid")
						if r then r:FireServer(bid.bidId) end
					end)
				end
			end
		end

		local shown = data.bids and #data.bids or 0
		if data.sells then
			for _, sell in ipairs(data.sells) do
				local sf = Instance.new("Frame")
				sf.Size = UDim2.new(1, -8, 0, 30)
				sf.BackgroundColor3 = C.bg
				sf.Parent = bidsScroll
				corner(sf, 4)

				local sl = Instance.new("TextLabel")
				sl.Size = UDim2.new(0.7, 0, 1, 0)
				sl.Position = UDim2.new(0, 6, 0, 0)
				sl.BackgroundTransparency = 1
				sl.Text = "SELL " .. sell.playerName .. ": " .. sell.quantity .. "x " .. sell.productId .. " @ " .. sell.price .. " MC"
				sl.TextColor3 = C.accent
				sl.TextScaled = true; sl.Font = Enum.Font.Gotham
				sl.TextXAlignment = Enum.TextXAlignment.Left
				sl.Parent = sf

				local isMySell = false
				if data.mySells then
					for _, ms in ipairs(data.mySells) do
						if ms.sellId == sell.sellId then isMySell = true end
					end
				end
				if isMySell then
					local cb = Instance.new("TextButton")
					cb.Size = UDim2.new(0.2, 0, 0.8, 0)
					cb.Position = UDim2.new(0.78, 0, 0.1, 0)
					cb.BackgroundColor3 = C.red
					cb.Text = "Cancel"
					cb.TextColor3 = Color3.new(1, 1, 1)
					cb.TextScaled = true; cb.Font = Enum.Font.GothamBold
					cb.Parent = sf
					corner(cb, 4)
					cb.Activated:Connect(function()
						local r = Remotes:FindFirstChild("RequestCancelSell")
						if r then r:FireServer(sell.sellId) end
					end)
				end
				shown = shown + 1
			end
		end
		bidsScroll.CanvasSize = UDim2.new(0, 0, 0, shown * 34)
		setStatus("Order book refreshed — " .. shown .. " active orders.", C.textDim)
	end)
end

-- Refresh on open
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		requestBids()
	end
end)

-- Auto-refresh every 10 seconds while open
task.spawn(function()
	while true do
		task.wait(10)
		if screenGui.Enabled then
			requestBids()
		end
	end
end)

print("[MOLGANG] MarketBiddingGui loaded — competitive product bidding")
