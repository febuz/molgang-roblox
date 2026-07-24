--[[
	BubbleTeaGui.client.lua
	MOLGANG — Bubble Tea Bar Menu Interface

	Opens when near the factory cafe. Shows 6 drinks with:
	- Name, description, cost
	- Active buff indicator with timer
	- Visual cup preview
	- Buy button

	Key: B to toggle (when near bar)
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local C = {
	bg = Color3.fromRGB(18, 12, 20),
	panel = Color3.fromRGB(28, 22, 32),
	accent = Color3.fromRGB(220, 140, 180),
	green = Color3.fromRGB(0, 200, 120),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(240, 235, 245),
	textDim = Color3.fromRGB(140, 130, 155),
	buffActive = Color3.fromRGB(0, 255, 180),
}

-- ═══════════════════════════════════════════════
-- GUI SETUP
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BubbleTeaGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 16
screenGui.Enabled = false
screenGui.Parent = playerGui

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 460, 0, 520)
main.Position = UDim2.new(0.5, -230, 0.5, -260)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.05
main.Parent = screenGui
local mCorner = Instance.new("UICorner")
mCorner.CornerRadius = UDim.new(0, 14)
mCorner.Parent = main
local mStroke = Instance.new("UIStroke")
mStroke.Color = C.accent
mStroke.Thickness = 2
mStroke.Parent = main

-- Title
local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, 0, 0, 44)
titleLabel.BackgroundColor3 = C.panel
titleLabel.Text = "  BUBBLE TEA BAR"
titleLabel.TextColor3 = C.accent
titleLabel.TextScaled = true
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = main
local tCorner = Instance.new("UICorner")
tCorner.CornerRadius = UDim.new(0, 14)
tCorner.Parent = titleLabel

-- Close button
local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(30, 30)
closeBtn.Position = UDim2.new(1, -36, 0, 7)
closeBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 80)
closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = main
local cCorner = Instance.new("UICorner")
cCorner.CornerRadius = UDim.new(0, 6)
cCorner.Parent = closeBtn
closeBtn.Activated:Connect(function() screenGui.Enabled = false end)

-- Active buff display
local buffFrame = Instance.new("Frame")
buffFrame.Size = UDim2.new(1, -20, 0, 28)
buffFrame.Position = UDim2.new(0, 10, 0, 48)
buffFrame.BackgroundColor3 = Color3.fromRGB(15, 25, 20)
buffFrame.BackgroundTransparency = 0.3
buffFrame.Parent = main
local bfCorner = Instance.new("UICorner")
bfCorner.CornerRadius = UDim.new(0, 6)
bfCorner.Parent = buffFrame

local buffLabel = Instance.new("TextLabel")
buffLabel.Size = UDim2.new(1, -8, 1, 0)
buffLabel.Position = UDim2.new(0, 4, 0, 0)
buffLabel.BackgroundTransparency = 1
buffLabel.Text = "No active buff"
buffLabel.TextColor3 = C.textDim
buffLabel.TextScaled = true
buffLabel.Font = Enum.Font.Gotham
buffLabel.TextXAlignment = Enum.TextXAlignment.Left
buffLabel.Parent = buffFrame

-- Drink cards (scrollable)
local drinkScroll = Instance.new("ScrollingFrame")
drinkScroll.Size = UDim2.new(1, -20, 1, -90)
drinkScroll.Position = UDim2.new(0, 10, 0, 82)
drinkScroll.BackgroundTransparency = 1
drinkScroll.ScrollBarThickness = 6
drinkScroll.CanvasSize = UDim2.new(0, 0, 0, 6 * 68)
drinkScroll.Parent = main

local drinkLayout = Instance.new("UIListLayout")
drinkLayout.Padding = UDim.new(0, 6)
drinkLayout.Parent = drinkScroll

-- ═══════════════════════════════════════════════
-- POPULATE DRINKS
-- ═══════════════════════════════════════════════

local drinkCards = {}

local function populateDrinks(drinks, activeBuffs)
	-- Clear existing
	for _, child in drinkScroll:GetChildren() do
		if child:IsA("Frame") then child:Destroy() end
	end
	drinkCards = {}

	for _, drink in ipairs(drinks) do
		local card = Instance.new("Frame")
		card.Name = drink.id
		card.Size = UDim2.new(1, 0, 0, 62)
		card.BackgroundColor3 = C.panel
		card.Parent = drinkScroll
		local cardCorner = Instance.new("UICorner")
		cardCorner.CornerRadius = UDim.new(0, 8)
		cardCorner.Parent = card

		-- Cup color preview (circle)
		local cupPreview = Instance.new("Frame")
		cupPreview.Size = UDim2.fromOffset(36, 42)
		cupPreview.Position = UDim2.new(0, 6, 0.5, -21)
		cupPreview.BackgroundColor3 = drink.cupColor or drink.color
		cupPreview.Parent = card
		local cpCorner = Instance.new("UICorner")
		cpCorner.CornerRadius = UDim.new(0, 6)
		cpCorner.Parent = cupPreview

		-- Straw indicator on cup
		local strawDot = Instance.new("Frame")
		strawDot.Size = UDim2.fromOffset(4, 14)
		strawDot.Position = UDim2.new(0.7, 0, 0, -4)
		strawDot.BackgroundColor3 = C.green
		strawDot.Parent = cupPreview
		local sdCorner = Instance.new("UICorner")
		sdCorner.CornerRadius = UDim.new(0, 2)
		sdCorner.Parent = strawDot

		-- Name
		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.new(0.5, -50, 0, 22)
		nameLabel.Position = UDim2.new(0, 48, 0, 4)
		nameLabel.BackgroundTransparency = 1
		nameLabel.Text = drink.name
		nameLabel.TextColor3 = C.text
		nameLabel.TextScaled = true
		nameLabel.Font = Enum.Font.GothamBold
		nameLabel.TextXAlignment = Enum.TextXAlignment.Left
		nameLabel.Parent = card

		-- Buff description
		local descLabel = Instance.new("TextLabel")
		descLabel.Size = UDim2.new(0.55, -50, 0, 16)
		descLabel.Position = UDim2.new(0, 48, 0, 26)
		descLabel.BackgroundTransparency = 1
		descLabel.Text = drink.description
		descLabel.TextColor3 = C.green
		descLabel.TextScaled = true
		descLabel.Font = Enum.Font.Gotham
		descLabel.TextXAlignment = Enum.TextXAlignment.Left
		descLabel.Parent = card

		-- Cost
		local costLabel = Instance.new("TextLabel")
		costLabel.Size = UDim2.new(0, 60, 0, 18)
		costLabel.Position = UDim2.new(0, 48, 0, 42)
		costLabel.BackgroundTransparency = 1
		costLabel.Text = drink.cost .. " MC"
		costLabel.TextColor3 = C.gold
		costLabel.TextScaled = true
		costLabel.Font = Enum.Font.GothamBold
		costLabel.TextXAlignment = Enum.TextXAlignment.Left
		costLabel.Parent = card

		-- Buy button
		local buyBtn = Instance.new("TextButton")
		buyBtn.Size = UDim2.new(0, 70, 0, 36)
		buyBtn.Position = UDim2.new(1, -80, 0.5, -18)
		buyBtn.BackgroundColor3 = C.accent
		buyBtn.TextColor3 = Color3.new(0, 0, 0)
		buyBtn.Text = "Order"
		buyBtn.Font = Enum.Font.GothamBold
		buyBtn.TextScaled = true
		buyBtn.Parent = card
		local bbCorner = Instance.new("UICorner")
		bbCorner.CornerRadius = UDim.new(0, 6)
		bbCorner.Parent = buyBtn

		-- Check if this buff is active
		if activeBuffs and activeBuffs[drink.buffType] then
			buyBtn.Text = activeBuffs[drink.buffType].remaining .. "s"
			buyBtn.BackgroundColor3 = C.buffActive
			buyBtn.TextColor3 = Color3.new(0, 0, 0)
		end

		buyBtn.Activated:Connect(function()
			local remote = Remotes:FindFirstChild("RequestBuyDrink")
			if remote then remote:FireServer(drink.id) end
			buyBtn.BackgroundColor3 = Color3.fromRGB(100, 255, 180)
			task.delay(0.3, function()
				buyBtn.BackgroundColor3 = C.accent
			end)
		end)

		-- Low balance warning overlay (P1 #18)
		if drink.cost > 30 then
			local warnL = Instance.new("TextLabel")
			warnL.Name = "LowBalWarn"
			warnL.Size = UDim2.new(1,-8,0,10)
			warnL.Position = UDim2.new(0,4,1,-12)
			warnL.BackgroundTransparency = 1
			warnL.Text = drink.cost > 40 and "Save MC for slag!" or ""
			warnL.TextColor3 = Color3.fromRGB(200,100,80)
			warnL.TextScaled = true
			warnL.Font = Enum.Font.Gotham
			warnL.Visible = false
			warnL.Parent = card
		end

		drinkCards[drink.id] = {card = card, buyBtn = buyBtn}
	end
end

-- ═══════════════════════════════════════════════
-- EVENT HANDLERS
-- ═══════════════════════════════════════════════

local drinkListEvent = Remotes:FindFirstChild("DrinkListResponse")
if drinkListEvent then
	drinkListEvent.OnClientEvent:Connect(function(data)
		if data.drinks then
			populateDrinks(data.drinks, data.activeBuffs)
		end
		if data.activeBuffs then
			local buffText = ""
			for buffType, buff in pairs(data.activeBuffs) do
				buffText = buffText .. buffType .. " x" .. buff.value .. " (" .. buff.remaining .. "s) "
			end
			if buffText == "" then
				buffLabel.Text = "No active buff"
				buffLabel.TextColor3 = C.textDim
			else
				buffLabel.Text = "Active: " .. buffText
				buffLabel.TextColor3 = C.buffActive
			end
		end
	end)
end

local drinkEvent = Remotes:FindFirstChild("DrinkPurchased")
if drinkEvent then
	drinkEvent.OnClientEvent:Connect(function(data)
		-- Refresh drink list
		local remote = Remotes:FindFirstChild("RequestDrinkList")
		if remote then remote:FireServer() end

		-- Show buff notification
		buffLabel.Text = "Active: " .. data.name .. " — " .. data.buffDescription
		buffLabel.TextColor3 = C.buffActive
	end)
end

-- Refresh on open
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		local remote = Remotes:FindFirstChild("RequestDrinkList")
		if remote then remote:FireServer() end
	end
end)

print("[MOLGANG] Bubble Tea GUI loaded — GUIManager owns the B shortcut")
