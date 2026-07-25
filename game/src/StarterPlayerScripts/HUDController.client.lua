--[[
	HUDController.client.lua
	MOLGANG Roblox Game — Main HUD Overlay

	Layout:
	  TOP LEFT         : AtomInventory (5x4 icon grid)
	  TOP LEFT-CENTER  : MoleculeBuilder slot
	  TOP RIGHT        : MolCoin wallet display
	  RIGHT-CENTER     : ChainTokens counter
	  BOTTOM CENTER    : Element info bar (proximity)
	  BOTTOM RIGHT     : MiniMap
	  TOP CENTER       : Server events ticker

	Keyboard shortcuts:
	  P = Toggle PeriodicTable overlay
	  W = Toggle Wallet overlay
]]

-- Services
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local StarterGui = game:GetService("StarterGui")

-- Player
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local function findScreenGui(name)
	for _, child in ipairs(playerGui:GetChildren()) do
		if child.Name == name and child:IsA("ScreenGui") then return child end
	end
	return nil
end

-- Remotes
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local AtomCollected = Remotes:WaitForChild("AtomCollected")
local MoleculeBuilt = Remotes:WaitForChild("MoleculeBuilt")
local ChainEntryAdded = Remotes:WaitForChild("ChainEntryAdded")
local AchievementUnlocked = Remotes:WaitForChild("AchievementUnlocked")
local GetPlayerData = Remotes:WaitForChild("GetPlayerData")
local RequestReturnToNexus = Remotes:WaitForChild("RequestReturnToNexus")

--------------------------------------------------------------------------------
-- COLOR PALETTE
--------------------------------------------------------------------------------
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	gold          = Color3.fromRGB(255, 200, 50),
	coinGold      = Color3.fromRGB(255, 215, 0),
	chainBlue     = Color3.fromRGB(60, 140, 255),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
	success       = Color3.fromRGB(50, 220, 100),
	warning       = Color3.fromRGB(255, 160, 40),
	danger        = Color3.fromRGB(255, 60, 60),
	transparent   = Color3.fromRGB(0, 0, 0),
}

-- Element group colors for inventory display
local GROUP_COLORS = {
	["Alkali Metal"]          = Color3.fromRGB(255, 100, 100),
	["Alkaline Earth Metal"]  = Color3.fromRGB(255, 170, 100),
	["Transition Metal"]      = Color3.fromRGB(255, 200, 120),
	["Post-Transition Metal"] = Color3.fromRGB(180, 220, 140),
	["Metalloid"]             = Color3.fromRGB(120, 200, 180),
	["Nonmetal"]              = Color3.fromRGB(100, 180, 255),
	["Halogen"]               = Color3.fromRGB(140, 140, 255),
	["Noble Gas"]             = Color3.fromRGB(200, 140, 255),
	["Lanthanide"]            = Color3.fromRGB(255, 180, 200),
	["Actinide"]              = Color3.fromRGB(255, 140, 180),
	["Unknown"]               = Color3.fromRGB(150, 150, 150),
}

--------------------------------------------------------------------------------
-- UTILITY FUNCTIONS
--------------------------------------------------------------------------------

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
	stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	stroke.Parent = parent
	return stroke
end

local function createGradient(parent, c1, c2, rotation)
	local gradient = Instance.new("UIGradient")
	gradient.Color = ColorSequence.new(c1 or COLORS.panel, c2 or COLORS.panelLight)
	gradient.Rotation = rotation or 90
	gradient.Parent = parent
	return gradient
end

local function createPadding(parent, top, right, bottom, left)
	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, top or 6)
	padding.PaddingRight = UDim.new(0, right or 6)
	padding.PaddingBottom = UDim.new(0, bottom or 6)
	padding.PaddingLeft = UDim.new(0, left or 6)
	padding.Parent = parent
	return padding
end

local function createTextLabel(parent, props)
	local label = Instance.new("TextLabel")
	label.Name = props.Name or "TextLabel"
	label.Size = props.Size or UDim2.new(1, 0, 1, 0)
	label.Position = props.Position or UDim2.new(0, 0, 0, 0)
	label.AnchorPoint = props.AnchorPoint or Vector2.new(0, 0)
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

local function tweenProperty(instance, props, duration, style, direction)
	local info = TweenInfo.new(
		duration or 0.3,
		style or Enum.EasingStyle.Quart,
		direction or Enum.EasingDirection.Out
	)
	local tween = TweenService:Create(instance, info, props)
	tween:Play()
	return tween
end

local function flashColor(instance, flashCol, duration)
	local original = instance.BackgroundColor3
	instance.BackgroundColor3 = flashCol
	tweenProperty(instance, {BackgroundColor3 = original}, duration or 0.5)
end

local function getGroupColor(groupName)
	return GROUP_COLORS[groupName] or GROUP_COLORS["Unknown"]
end

local function formatNumber(n)
	if n >= 1000000 then
		return string.format("%.1fM", n / 1000000)
	elseif n >= 1000 then
		return string.format("%.1fK", n / 1000)
	end
	return tostring(n)
end

--------------------------------------------------------------------------------
-- SCREEN GUI SETUP
--------------------------------------------------------------------------------

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "MolgangHUD"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 5
screenGui.Parent = playerGui

-- Global UIScale for responsiveness
local uiScale = Instance.new("UIScale")
uiScale.Scale = 1
uiScale.Parent = screenGui

--------------------------------------------------------------------------------
-- 1. ATOM INVENTORY (TOP LEFT) — 5x4 grid
--------------------------------------------------------------------------------

local inventoryFrame = Instance.new("Frame")
inventoryFrame.Name = "AtomInventory"
inventoryFrame.Size = UDim2.new(0, 220, 0, 200)
inventoryFrame.Position = UDim2.new(0, 12, 0, 50)
inventoryFrame.BackgroundColor3 = COLORS.panel
inventoryFrame.BackgroundTransparency = 0.15
inventoryFrame.Parent = screenGui
createCorner(inventoryFrame, 10)
createStroke(inventoryFrame, COLORS.accent, 1.5)
createGradient(inventoryFrame, COLORS.panel, Color3.fromRGB(25, 30, 50))

-- Inventory title
local invTitle = createTextLabel(inventoryFrame, {
	Name = "Title",
	Size = UDim2.new(1, -12, 0, 24),
	Position = UDim2.new(0, 6, 0, 4),
	Text = "ATOMS",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.accent,
	TextXAlignment = Enum.TextXAlignment.Left,
})

-- Grid container
local gridContainer = Instance.new("Frame")
gridContainer.Name = "Grid"
gridContainer.Size = UDim2.new(1, -12, 1, -34)
gridContainer.Position = UDim2.new(0, 6, 0, 30)
gridContainer.BackgroundTransparency = 1
gridContainer.Parent = inventoryFrame

local gridLayout = Instance.new("UIGridLayout")
gridLayout.CellSize = UDim2.new(0, 38, 0, 38)
gridLayout.CellPadding = UDim2.new(0, 4, 0, 4)
gridLayout.FillDirection = Enum.FillDirection.Horizontal
gridLayout.HorizontalAlignment = Enum.HorizontalAlignment.Left
gridLayout.VerticalAlignment = Enum.VerticalAlignment.Top
gridLayout.SortOrder = Enum.SortOrder.LayoutOrder
gridLayout.Parent = gridContainer

-- Store inventory slot references
local inventorySlots = {}

-- Create 20 slots (5 columns x 4 rows)
for i = 1, 20 do
	local slot = Instance.new("Frame")
	slot.Name = "Slot_" .. i
	slot.BackgroundColor3 = COLORS.panelLight
	slot.BackgroundTransparency = 0.3
	slot.LayoutOrder = i
	slot.Parent = gridContainer
	createCorner(slot, 6)
	createStroke(slot, Color3.fromRGB(60, 60, 80), 1)

	-- Symbol text
	local symbolLabel = createTextLabel(slot, {
		Name = "Symbol",
		Size = UDim2.new(1, -4, 0.65, 0),
		Position = UDim2.new(0, 2, 0, 2),
		Text = "",
		Font = Enum.Font.GothamBold,
		TextColor3 = COLORS.textPrimary,
		TextXAlignment = Enum.TextXAlignment.Center,
		TextYAlignment = Enum.TextYAlignment.Center,
	})

	-- Count badge
	local countBadge = Instance.new("Frame")
	countBadge.Name = "CountBadge"
	countBadge.Size = UDim2.new(0, 18, 0, 14)
	countBadge.Position = UDim2.new(1, -20, 1, -16)
	countBadge.BackgroundColor3 = COLORS.accent
	countBadge.Visible = false
	countBadge.Parent = slot
	createCorner(countBadge, 4)

	local countLabel = createTextLabel(countBadge, {
		Name = "Count",
		Size = UDim2.new(1, 0, 1, 0),
		Text = "0",
		Font = Enum.Font.GothamBold,
		TextColor3 = COLORS.background,
		TextXAlignment = Enum.TextXAlignment.Center,
	})

	inventorySlots[i] = {
		frame = slot,
		symbol = symbolLabel,
		badge = countBadge,
		countLabel = countLabel,
		atomicNumber = nil,
	}
end

-- Inventory scroll page indicator
local pageIndicator = createTextLabel(inventoryFrame, {
	Name = "PageIndicator",
	Size = UDim2.new(1, -12, 0, 16),
	Position = UDim2.new(0, 6, 1, -18),
	AnchorPoint = Vector2.new(0, 0),
	Text = "Page 1/6",
	Font = Enum.Font.Gotham,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Center,
})

--------------------------------------------------------------------------------
-- 2. MOLECULE BUILDER SLOT (TOP LEFT-CENTER)
--------------------------------------------------------------------------------

local builderFrame = Instance.new("Frame")
builderFrame.Name = "MoleculeBuilder"
builderFrame.Size = UDim2.new(0, 180, 0, 100)
builderFrame.Position = UDim2.new(0, 244, 0, 50)
builderFrame.BackgroundColor3 = COLORS.panel
builderFrame.BackgroundTransparency = 0.15
builderFrame.Parent = screenGui
createCorner(builderFrame, 10)
createStroke(builderFrame, COLORS.chainBlue, 1.5)
createGradient(builderFrame, COLORS.panel, Color3.fromRGB(20, 30, 55))

local builderTitle = createTextLabel(builderFrame, {
	Name = "Title",
	Size = UDim2.new(1, -12, 0, 20),
	Position = UDim2.new(0, 6, 0, 4),
	Text = "MOLECULE BUILDER",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.chainBlue,
	TextXAlignment = Enum.TextXAlignment.Left,
})

-- Drop zone
local dropZone = Instance.new("Frame")
dropZone.Name = "DropZone"
dropZone.Size = UDim2.new(1, -16, 0, 50)
dropZone.Position = UDim2.new(0, 8, 0, 28)
dropZone.BackgroundColor3 = COLORS.panelLight
dropZone.BackgroundTransparency = 0.2
dropZone.Parent = builderFrame
createCorner(dropZone, 8)
createStroke(dropZone, Color3.fromRGB(80, 80, 100), 1)

local dropLabel = createTextLabel(dropZone, {
	Name = "DropLabel",
	Size = UDim2.new(1, 0, 1, 0),
	Text = "Drop atoms here...",
	Font = Enum.Font.GothamMedium,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Center,
})

-- Atom slots inside drop zone (horizontal layout)
local builderSlotContainer = Instance.new("Frame")
builderSlotContainer.Name = "SlotContainer"
builderSlotContainer.Size = UDim2.new(1, -8, 1, -8)
builderSlotContainer.Position = UDim2.new(0, 4, 0, 4)
builderSlotContainer.BackgroundTransparency = 1
builderSlotContainer.Parent = dropZone

local builderSlotLayout = Instance.new("UIListLayout")
builderSlotLayout.FillDirection = Enum.FillDirection.Horizontal
builderSlotLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
builderSlotLayout.VerticalAlignment = Enum.VerticalAlignment.Center
builderSlotLayout.Padding = UDim.new(0, 4)
builderSlotLayout.Parent = builderSlotContainer

-- Build result indicator
local buildStatus = createTextLabel(builderFrame, {
	Name = "BuildStatus",
	Size = UDim2.new(1, -16, 0, 18),
	Position = UDim2.new(0, 8, 0, 80),
	Text = "",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.success,
	TextXAlignment = Enum.TextXAlignment.Center,
})

--------------------------------------------------------------------------------
-- 3. MOLCOIN WALLET (TOP RIGHT)
--------------------------------------------------------------------------------

local walletFrame = Instance.new("Frame")
walletFrame.Name = "MolCoinWallet"
walletFrame.Size = UDim2.new(0, 180, 0, 55)
walletFrame.Position = UDim2.new(1, -192, 0, 50)
walletFrame.BackgroundColor3 = COLORS.panel
walletFrame.BackgroundTransparency = 0.15
walletFrame.Parent = screenGui
createCorner(walletFrame, 10)
createStroke(walletFrame, COLORS.coinGold, 1.5)
createGradient(walletFrame, Color3.fromRGB(40, 35, 20), Color3.fromRGB(30, 28, 18))

-- Coin icon (circle)
local coinIcon = Instance.new("Frame")
coinIcon.Name = "CoinIcon"
coinIcon.Size = UDim2.new(0, 36, 0, 36)
coinIcon.Position = UDim2.new(0, 10, 0.5, 0)
coinIcon.AnchorPoint = Vector2.new(0, 0.5)
coinIcon.BackgroundColor3 = COLORS.coinGold
coinIcon.Parent = walletFrame
createCorner(coinIcon, 18)

local coinSymbol = createTextLabel(coinIcon, {
	Name = "Symbol",
	Size = UDim2.new(1, 0, 1, 0),
	Text = "M",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.background,
	TextXAlignment = Enum.TextXAlignment.Center,
})

-- Balance display
local balanceLabel = createTextLabel(walletFrame, {
	Name = "Balance",
	Size = UDim2.new(0, 100, 0, 28),
	Position = UDim2.new(0, 54, 0, 6),
	Text = "0",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.coinGold,
	TextXAlignment = Enum.TextXAlignment.Left,
})

local walletSubLabel = createTextLabel(walletFrame, {
	Name = "SubLabel",
	Size = UDim2.new(0, 100, 0, 14),
	Position = UDim2.new(0, 54, 0, 34),
	Text = "MolCoins",
	Font = Enum.Font.Gotham,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Left,
})

-- Wallet open button
local walletBtn = Instance.new("TextButton")
walletBtn.Name = "OpenWallet"
walletBtn.Size = UDim2.new(0, 30, 0, 30)
walletBtn.Position = UDim2.new(1, -38, 0.5, 0)
walletBtn.AnchorPoint = Vector2.new(0, 0.5)
walletBtn.BackgroundColor3 = COLORS.panelLight
walletBtn.Text = "W"
walletBtn.TextColor3 = COLORS.coinGold
walletBtn.TextScaled = true
walletBtn.Font = Enum.Font.GothamBold
walletBtn.Parent = walletFrame
createCorner(walletBtn, 6)

-- Always-visible safety route. Players should never need to walk off a
-- floating island (or open the mining panel) just to get back to the Nexus.
local returnNexusBtn = Instance.new("TextButton")
returnNexusBtn.Name = "ReturnToNexus"
returnNexusBtn.Size = UDim2.fromOffset(180, 34)
returnNexusBtn.Position = UDim2.new(1, -192, 0, 112)
returnNexusBtn.BackgroundColor3 = Color3.fromRGB(0, 170, 125)
returnNexusBtn.BackgroundTransparency = 0.08
returnNexusBtn.Text = "← NEXUS  [H]"
returnNexusBtn.TextColor3 = Color3.fromRGB(235, 255, 248)
returnNexusBtn.TextScaled = true
returnNexusBtn.Font = Enum.Font.GothamBold
returnNexusBtn.Parent = screenGui
createCorner(returnNexusBtn, 8)
createStroke(returnNexusBtn, Color3.fromRGB(0, 255, 190), 1.5)

local returnBusy = false
local function returnToNexus()

	if returnBusy then return end
	returnBusy = true
	returnNexusBtn.Text = "Returning…"
	RequestReturnToNexus:FireServer()
	task.delay(1.2, function()
		returnBusy = false
		if returnNexusBtn.Parent then returnNexusBtn.Text = "← NEXUS  [H]" end
	end)
end

returnNexusBtn.Activated:Connect(returnToNexus)
-- Vinegar/desktop Studio can occasionally swallow Activated while the game
-- view has focus. Keep the visible safety route clickable in that case too.
returnNexusBtn.MouseButton1Click:Connect(returnToNexus)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed or UserInputService:GetFocusedTextBox() then return end
	if input.KeyCode == Enum.KeyCode.H then returnToNexus() end
end)

--------------------------------------------------------------------------------
-- 4. CHAIN TOKENS COUNTER (RIGHT-CENTER)
--------------------------------------------------------------------------------

local chainFrame = Instance.new("Frame")
chainFrame.Name = "ChainTokens"
chainFrame.Size = UDim2.new(0, 160, 0, 50)
chainFrame.Position = UDim2.new(1, -172, 0.5, -25)
chainFrame.BackgroundColor3 = COLORS.panel
chainFrame.BackgroundTransparency = 0.15
chainFrame.Parent = screenGui
createCorner(chainFrame, 10)
createStroke(chainFrame, COLORS.chainBlue, 1.5)
createGradient(chainFrame, Color3.fromRGB(20, 25, 50), Color3.fromRGB(18, 22, 45))

-- Chain icon
local chainIcon = Instance.new("Frame")
chainIcon.Name = "ChainIcon"
chainIcon.Size = UDim2.new(0, 32, 0, 32)
chainIcon.Position = UDim2.new(0, 10, 0.5, 0)
chainIcon.AnchorPoint = Vector2.new(0, 0.5)
chainIcon.BackgroundColor3 = COLORS.chainBlue
chainIcon.Parent = chainFrame
createCorner(chainIcon, 6)

local chainIconLabel = createTextLabel(chainIcon, {
	Name = "Icon",
	Size = UDim2.new(1, 0, 1, 0),
	Text = "#",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Center,
})

-- Token count
local chainCountLabel = createTextLabel(chainFrame, {
	Name = "Count",
	Size = UDim2.new(0, 80, 0, 24),
	Position = UDim2.new(0, 50, 0, 6),
	Text = "0",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.chainBlue,
	TextXAlignment = Enum.TextXAlignment.Left,
})

local chainSubLabel = createTextLabel(chainFrame, {
	Name = "SubLabel",
	Size = UDim2.new(0, 80, 0, 14),
	Position = UDim2.new(0, 50, 0, 30),
	Text = "ChainTokens",
	Font = Enum.Font.Gotham,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Left,
})

--------------------------------------------------------------------------------
-- 5. ELEMENT INFO BAR (BOTTOM CENTER)
--------------------------------------------------------------------------------

local infoBar = Instance.new("Frame")
infoBar.Name = "ElementInfoBar"
infoBar.Size = UDim2.new(0, 420, 0, 70)
infoBar.Position = UDim2.new(0.5, 0, 1, -20)
infoBar.AnchorPoint = Vector2.new(0.5, 1)
infoBar.BackgroundColor3 = COLORS.panel
infoBar.BackgroundTransparency = 0.1
infoBar.Visible = false
infoBar.Parent = screenGui
createCorner(infoBar, 12)
createStroke(infoBar, COLORS.accent, 2)
createGradient(infoBar, COLORS.panel, Color3.fromRGB(25, 35, 50))
createPadding(infoBar, 8, 12, 8, 12)

-- Element color strip on left
local infoColorStrip = Instance.new("Frame")
infoColorStrip.Name = "ColorStrip"
infoColorStrip.Size = UDim2.new(0, 6, 1, -8)
infoColorStrip.Position = UDim2.new(0, 4, 0, 4)
infoColorStrip.BackgroundColor3 = COLORS.accent
infoColorStrip.Parent = infoBar
createCorner(infoColorStrip, 3)

-- Symbol large
local infoSymbol = createTextLabel(infoBar, {
	Name = "Symbol",
	Size = UDim2.new(0, 55, 1, -8),
	Position = UDim2.new(0, 16, 0, 4),
	Text = "H",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Center,
})

-- Name + mass
local infoName = createTextLabel(infoBar, {
	Name = "ElementName",
	Size = UDim2.new(0, 140, 0, 22),
	Position = UDim2.new(0, 78, 0, 4),
	Text = "Waterstof",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Left,
})

local infoMass = createTextLabel(infoBar, {
	Name = "Mass",
	Size = UDim2.new(0, 140, 0, 16),
	Position = UDim2.new(0, 78, 0, 26),
	Text = "1.008 u",
	Font = Enum.Font.Gotham,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Left,
})

-- Fun fact
local infoFact = createTextLabel(infoBar, {
	Name = "Fact",
	Size = UDim2.new(0, 180, 1, -8),
	Position = UDim2.new(1, -184, 0, 4),
	Text = "Het lichtste element!",
	Font = Enum.Font.GothamMedium,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Left,
	TextYAlignment = Enum.TextYAlignment.Top,
})

--------------------------------------------------------------------------------
-- 6. MINIMAP (BOTTOM RIGHT)
--------------------------------------------------------------------------------

local minimapFrame = Instance.new("Frame")
minimapFrame.Name = "MiniMap"
minimapFrame.Size = UDim2.new(0, 140, 0, 140)
minimapFrame.Position = UDim2.new(1, -152, 1, -152)
minimapFrame.BackgroundColor3 = COLORS.panel
minimapFrame.BackgroundTransparency = 0.1
minimapFrame.Parent = screenGui
createCorner(minimapFrame, 12)
createStroke(minimapFrame, COLORS.accent, 1.5)

-- Map viewport (overhead image/canvas)
local mapViewport = Instance.new("Frame")
mapViewport.Name = "MapViewport"
mapViewport.Size = UDim2.new(1, -8, 1, -28)
mapViewport.Position = UDim2.new(0, 4, 0, 24)
mapViewport.BackgroundColor3 = Color3.fromRGB(15, 25, 15)
mapViewport.ClipsDescendants = true
mapViewport.Parent = minimapFrame
createCorner(mapViewport, 8)

-- Map title
local mapTitle = createTextLabel(minimapFrame, {
	Name = "Title",
	Size = UDim2.new(1, -8, 0, 18),
	Position = UDim2.new(0, 4, 0, 3),
	Text = "MAP",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.accent,
	TextXAlignment = Enum.TextXAlignment.Center,
})

-- Zone color patches
local zoneColors = {
	{name = "Metaal", color = Color3.fromRGB(180, 80, 80), pos = UDim2.new(0, 5, 0, 5), size = UDim2.new(0.4, 0, 0.45, 0)},
	{name = "Gas", color = Color3.fromRGB(80, 80, 180), pos = UDim2.new(0.45, 0, 0, 5), size = UDim2.new(0.5, 0, 0.45, 0)},
	{name = "Vloeibaar", color = Color3.fromRGB(80, 180, 120), pos = UDim2.new(0, 5, 0.5, 0), size = UDim2.new(0.45, 0, 0.45, 0)},
	{name = "Lab", color = Color3.fromRGB(180, 150, 60), pos = UDim2.new(0.5, 0, 0.5, 0), size = UDim2.new(0.45, 0, 0.45, 0)},
}

for _, zone in ipairs(zoneColors) do
	local patch = Instance.new("Frame")
	patch.Name = "Zone_" .. zone.name
	patch.Size = zone.size
	patch.Position = zone.pos
	patch.BackgroundColor3 = zone.color
	patch.BackgroundTransparency = 0.4
	patch.Parent = mapViewport
	createCorner(patch, 4)
end

-- Player dot
local playerDot = Instance.new("Frame")
playerDot.Name = "PlayerDot"
playerDot.Size = UDim2.new(0, 8, 0, 8)
playerDot.Position = UDim2.new(0.5, -4, 0.5, -4)
playerDot.BackgroundColor3 = COLORS.accent
playerDot.ZIndex = 10
playerDot.Parent = mapViewport
createCorner(playerDot, 4)
createStroke(playerDot, COLORS.textPrimary, 1)

-- Player dot pulse animation
spawn(function()
	while true do
		tweenProperty(playerDot, {Size = UDim2.new(0, 12, 0, 12), Position = UDim2.new(0.5, -6, 0.5, -6)}, 0.6, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut)
		wait(0.6)
		tweenProperty(playerDot, {Size = UDim2.new(0, 8, 0, 8), Position = UDim2.new(0.5, -4, 0.5, -4)}, 0.6, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut)
		wait(0.6)
	end
end)

--------------------------------------------------------------------------------
-- 7. SERVER EVENTS TICKER (TOP CENTER)
--------------------------------------------------------------------------------

local tickerFrame = Instance.new("Frame")
tickerFrame.Name = "ServerTicker"
tickerFrame.Size = UDim2.new(0, 500, 0, 30)
-- Keep the ticker in the dedicated top strip. The molecule builder starts at
-- y=50, so a ticker there would cover its drop zone and atom labels.
tickerFrame.Position = UDim2.new(0.5, 0, 0, 8)
tickerFrame.AnchorPoint = Vector2.new(0.5, 0)
tickerFrame.BackgroundColor3 = COLORS.panel
tickerFrame.BackgroundTransparency = 0.3
tickerFrame.ClipsDescendants = true
tickerFrame.Parent = screenGui
createCorner(tickerFrame, 8)

local tickerLabel = createTextLabel(tickerFrame, {
	Name = "TickerText",
	Size = UDim2.new(2, 0, 1, 0),
	Position = UDim2.new(1, 0, 0, 0),
	Text = "Welcome to MOLGANG! Collect atoms and build molecules!",
	Font = Enum.Font.GothamMedium,
	TextColor3 = COLORS.coinGold,
	TextXAlignment = Enum.TextXAlignment.Left,
})

-- Ticker scroll animation
local tickerMessages = {"Welcome to MOLGANG! Collect atoms and build molecules!"}
local currentTickerIndex = 1

local function scrollTicker()
	tickerLabel.Text = tickerMessages[currentTickerIndex]
	tickerLabel.Position = UDim2.new(1, 0, 0, 0)
	local tween = tweenProperty(tickerLabel, {Position = UDim2.new(-2, 0, 0, 0)}, 12, Enum.EasingStyle.Linear)
	tween.Completed:Connect(function()
		currentTickerIndex = (currentTickerIndex % #tickerMessages) + 1
		scrollTicker()
	end)
end

spawn(scrollTicker)

local function addTickerMessage(msg)
	table.insert(tickerMessages, msg)
	-- Keep only last 20 messages
	if #tickerMessages > 20 then
		table.remove(tickerMessages, 1)
	end
end

--------------------------------------------------------------------------------
-- NOTIFICATION / POPUP SYSTEM
--------------------------------------------------------------------------------

-- New Element Popup
local newElementPopup = Instance.new("Frame")
newElementPopup.Name = "NewElementPopup"
newElementPopup.Size = UDim2.new(0, 300, 0, 120)
newElementPopup.Position = UDim2.new(0.5, 0, 0.35, 0)
newElementPopup.AnchorPoint = Vector2.new(0.5, 0.5)
newElementPopup.BackgroundColor3 = COLORS.accent
newElementPopup.BackgroundTransparency = 0.1
newElementPopup.Visible = false
newElementPopup.ZIndex = 20
newElementPopup.Parent = screenGui
createCorner(newElementPopup, 16)
createStroke(newElementPopup, COLORS.coinGold, 3)

local popupTitle = createTextLabel(newElementPopup, {
	Name = "Title",
	Size = UDim2.new(1, -20, 0, 36),
	Position = UDim2.new(0, 10, 0, 10),
	Text = "NEW ELEMENT!",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Center,
})
popupTitle.ZIndex = 21

local popupSymbol = createTextLabel(newElementPopup, {
	Name = "Symbol",
	Size = UDim2.new(0, 60, 0, 50),
	Position = UDim2.new(0.5, -30, 0, 50),
	Text = "",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Center,
})
popupSymbol.ZIndex = 21

local popupName = createTextLabel(newElementPopup, {
	Name = "Name",
	Size = UDim2.new(1, -20, 0, 24),
	Position = UDim2.new(0, 10, 1, -30),
	Text = "",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Center,
})
popupName.ZIndex = 21

local function showNewElementPopup(symbol, name, groupColor)
	newElementPopup.BackgroundColor3 = groupColor or COLORS.accent
	popupSymbol.Text = symbol
	popupName.Text = name
	newElementPopup.Visible = true
	newElementPopup.Size = UDim2.new(0, 50, 0, 50)
	newElementPopup.BackgroundTransparency = 0.5

	tweenProperty(newElementPopup, {
		Size = UDim2.new(0, 300, 0, 120),
		BackgroundTransparency = 0.1,
	}, 0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out)

	delay(2, function()
		tweenProperty(newElementPopup, {
			BackgroundTransparency = 1,
			Size = UDim2.new(0, 350, 0, 140),
		}, 0.5, Enum.EasingStyle.Quart, Enum.EasingDirection.In)
		wait(0.5)
		newElementPopup.Visible = false
	end)
end

-- Molecule Built fanfare
local moleculePopup = Instance.new("Frame")
moleculePopup.Name = "MoleculePopup"
moleculePopup.Size = UDim2.new(0, 340, 0, 90)
moleculePopup.Position = UDim2.new(0.5, 0, 0.3, 0)
moleculePopup.AnchorPoint = Vector2.new(0.5, 0.5)
moleculePopup.BackgroundColor3 = COLORS.success
moleculePopup.BackgroundTransparency = 0.1
moleculePopup.Visible = false
moleculePopup.ZIndex = 20
moleculePopup.Parent = screenGui
createCorner(moleculePopup, 14)
createStroke(moleculePopup, COLORS.coinGold, 2)

local molPopupTitle = createTextLabel(moleculePopup, {
	Name = "Title",
	Size = UDim2.new(1, -20, 0, 30),
	Position = UDim2.new(0, 10, 0, 8),
	Text = "MOLECULE BUILT!",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Center,
})
molPopupTitle.ZIndex = 21

local molPopupName = createTextLabel(moleculePopup, {
	Name = "Name",
	Size = UDim2.new(1, -20, 0, 24),
	Position = UDim2.new(0, 10, 0, 40),
	Text = "",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Center,
})
molPopupName.ZIndex = 21

local molPopupChain = createTextLabel(moleculePopup, {
	Name = "Chain",
	Size = UDim2.new(1, -20, 0, 18),
	Position = UDim2.new(0, 10, 0, 66),
	Text = "Registered on the MolChain!",
	Font = Enum.Font.GothamMedium,
	TextColor3 = COLORS.chainBlue,
	TextXAlignment = Enum.TextXAlignment.Center,
})
molPopupChain.ZIndex = 21

local function showMoleculeBuiltPopup(moleculeName, formula)
	molPopupName.Text = moleculeName .. " (" .. formula .. ")"
	moleculePopup.Visible = true
	moleculePopup.Position = UDim2.new(0.5, 0, 0.15, 0)
	moleculePopup.BackgroundTransparency = 0.8

	tweenProperty(moleculePopup, {
		Position = UDim2.new(0.5, 0, 0.3, 0),
		BackgroundTransparency = 0.1,
	}, 0.5, Enum.EasingStyle.Back, Enum.EasingDirection.Out)

	delay(3, function()
		tweenProperty(moleculePopup, {
			BackgroundTransparency = 1,
			Position = UDim2.new(0.5, 0, 0.25, 0),
		}, 0.4)
		wait(0.4)
		moleculePopup.Visible = false
	end)
end

-- Achievement Banner (slides from left)
local achievementBanner = Instance.new("Frame")
achievementBanner.Name = "AchievementBanner"
achievementBanner.Size = UDim2.new(0, 350, 0, 65)
achievementBanner.Position = UDim2.new(-1, 0, 0.15, 0)
achievementBanner.BackgroundColor3 = COLORS.coinGold
achievementBanner.BackgroundTransparency = 0.05
achievementBanner.Visible = false
achievementBanner.ZIndex = 22
achievementBanner.Parent = screenGui
createCorner(achievementBanner, 10)
createStroke(achievementBanner, COLORS.textPrimary, 2)

-- Achievement icon area
local achieveIcon = Instance.new("Frame")
achieveIcon.Name = "Icon"
achieveIcon.Size = UDim2.new(0, 45, 0, 45)
achieveIcon.Position = UDim2.new(0, 10, 0.5, 0)
achieveIcon.AnchorPoint = Vector2.new(0, 0.5)
achieveIcon.BackgroundColor3 = COLORS.background
achieveIcon.Parent = achievementBanner
achieveIcon.ZIndex = 23
createCorner(achieveIcon, 8)

local achieveIconLabel = createTextLabel(achieveIcon, {
	Name = "Star",
	Size = UDim2.new(1, 0, 1, 0),
	Text = "*",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.coinGold,
	TextXAlignment = Enum.TextXAlignment.Center,
})
achieveIconLabel.ZIndex = 24

local achieveTitle = createTextLabel(achievementBanner, {
	Name = "Title",
	Size = UDim2.new(0, 260, 0, 24),
	Position = UDim2.new(0, 65, 0, 8),
	Text = "ACHIEVEMENT UNLOCKED!",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.background,
	TextXAlignment = Enum.TextXAlignment.Left,
})
achieveTitle.ZIndex = 23

local achieveDesc = createTextLabel(achievementBanner, {
	Name = "Desc",
	Size = UDim2.new(0, 260, 0, 20),
	Position = UDim2.new(0, 65, 0, 34),
	Text = "",
	Font = Enum.Font.GothamMedium,
	TextColor3 = Color3.fromRGB(40, 30, 10),
	TextXAlignment = Enum.TextXAlignment.Left,
})
achieveDesc.ZIndex = 23

local function showAchievementBanner(title, description)
	achieveDesc.Text = title .. " — " .. description
	achievementBanner.Visible = true
	achievementBanner.Position = UDim2.new(-1, 0, 0.15, 0)

	tweenProperty(achievementBanner, {
		Position = UDim2.new(0, 12, 0.15, 0),
	}, 0.6, Enum.EasingStyle.Back, Enum.EasingDirection.Out)

	delay(3, function()
		tweenProperty(achievementBanner, {
			Position = UDim2.new(-1, 0, 0.15, 0),
		}, 0.5, Enum.EasingStyle.Quart, Enum.EasingDirection.In)
		wait(0.5)
		achievementBanner.Visible = false
	end)
end

--------------------------------------------------------------------------------
-- MOLCOIN ANIMATION
--------------------------------------------------------------------------------

local function animateMolCoinReceived(amount)
	local currentText = balanceLabel.Text
	local currentVal = tonumber(currentText) or 0
	local newVal = currentVal + amount
	balanceLabel.Text = formatNumber(newVal)

	-- Gold flash on wallet frame
	flashColor(walletFrame, COLORS.coinGold, 0.6)

	-- Scale bounce
	local originalSize = walletFrame.Size
	tweenProperty(walletFrame, {Size = UDim2.new(0, 200, 0, 62)}, 0.15, Enum.EasingStyle.Back)
	delay(0.15, function()
		tweenProperty(walletFrame, {Size = originalSize}, 0.3, Enum.EasingStyle.Elastic)
	end)

	-- Floating +amount text
	local floater = createTextLabel(screenGui, {
		Name = "CoinFloat",
		Size = UDim2.new(0, 100, 0, 30),
		Position = walletFrame.Position + UDim2.new(0, 0, 0, -10),
		Text = "+" .. formatNumber(amount),
		Font = Enum.Font.GothamBlack,
		TextColor3 = COLORS.coinGold,
		TextXAlignment = Enum.TextXAlignment.Center,
	})
	floater.ZIndex = 30

	tweenProperty(floater, {
		Position = floater.Position + UDim2.new(0, 0, 0, -40),
		TextTransparency = 1,
	}, 1.2, Enum.EasingStyle.Quart)

	delay(1.2, function()
		floater:Destroy()
	end)
end

--------------------------------------------------------------------------------
-- PERIODIC TABLE BUTTON (HUD shortcut)
--------------------------------------------------------------------------------

local ptButton = Instance.new("TextButton")
ptButton.Name = "PeriodicTableBtn"
ptButton.Size = UDim2.new(0, 50, 0, 50)
ptButton.Position = UDim2.new(0, 12, 0.5, -25)
ptButton.BackgroundColor3 = COLORS.panel
ptButton.BackgroundTransparency = 0.15
ptButton.Text = "PT"
ptButton.TextColor3 = COLORS.accent
ptButton.TextScaled = true
ptButton.Font = Enum.Font.GothamBlack
ptButton.Parent = screenGui
createCorner(ptButton, 10)
createStroke(ptButton, COLORS.accent, 1.5)

ptButton.Activated:Connect(function()
	local ptGui = findScreenGui("PeriodicTableGui")
	if ptGui then
		ptGui.Enabled = not ptGui.Enabled
	end
end)

--------------------------------------------------------------------------------
-- REMOTE EVENT HANDLERS
--------------------------------------------------------------------------------

-- State tracking
local collectedElements = {} -- {[atomicNumber] = count}
local molCoinBalance = 0
local chainTokens = 0
local inventoryPage = 1
local inventoryMaxPerPage = 20

local function refreshInventoryGrid()
	-- Build sorted list of collected elements
	local sortedElements = {}
	for z, count in pairs(collectedElements) do
		table.insert(sortedElements, {z = z, count = count})
	end
	table.sort(sortedElements, function(a, b) return a.z < b.z end)

	-- Calculate pages
	local totalPages = math.max(1, math.ceil(#sortedElements / inventoryMaxPerPage))
	inventoryPage = math.clamp(inventoryPage, 1, totalPages)
	pageIndicator.Text = "Page " .. inventoryPage .. "/" .. totalPages

	-- Fill slots
	local startIdx = (inventoryPage - 1) * inventoryMaxPerPage + 1
	for i = 1, 20 do
		local slot = inventorySlots[i]
		local elemIdx = startIdx + i - 1
		local elem = sortedElements[elemIdx]

		if elem then
			slot.symbol.Text = tostring(elem.z)
			slot.badge.Visible = true
			slot.countLabel.Text = tostring(elem.count)
			slot.frame.BackgroundColor3 = COLORS.accent
			slot.frame.BackgroundTransparency = 0.4
			slot.atomicNumber = elem.z
		else
			slot.symbol.Text = ""
			slot.badge.Visible = false
			slot.frame.BackgroundColor3 = COLORS.panelLight
			slot.frame.BackgroundTransparency = 0.3
			slot.atomicNumber = nil
		end
	end
end

AtomCollected.OnClientEvent:Connect(function(data)
	-- data = {atomicNumber, symbol, name, group, mass, fact, isNew, count}
	if not data then return end

	local z = data.atomicNumber or 1
	local symbol = data.symbol or "?"
	local name = data.name or "Unknown"
	local group = data.group or "Unknown"
	local mass = data.mass or 0
	local fact = data.fact or ""
	local isNew = data.isNew or false
	local count = data.count or 1

	collectedElements[z] = count
	refreshInventoryGrid()

	-- Show element info bar briefly
	infoSymbol.Text = symbol
	infoName.Text = name
	infoMass.Text = string.format("%.3f u", mass)
	infoFact.Text = fact
	infoColorStrip.BackgroundColor3 = getGroupColor(group)
	infoBar.Visible = true

	-- Slide in from bottom
	infoBar.Position = UDim2.new(0.5, 0, 1, 20)
	tweenProperty(infoBar, {Position = UDim2.new(0.5, 0, 1, -20)}, 0.4, Enum.EasingStyle.Back)

	delay(4, function()
		tweenProperty(infoBar, {Position = UDim2.new(0.5, 0, 1, 20)}, 0.3)
		wait(0.3)
		infoBar.Visible = false
	end)

	-- New element popup
	if isNew then
		showNewElementPopup(symbol, name, getGroupColor(group))
	end
end)

MoleculeBuilt.OnClientEvent:Connect(function(data)
	-- data = {moleculeName, formula, molCoinsEarned, chainTokensEarned}
	if not data then return end

	local moleculeName = data.moleculeName or "Molecuul"
	local formula = data.formula or "?"
	local coinsEarned = data.molCoinsEarned or 0
	local tokensEarned = data.chainTokensEarned or 0

	-- Show popup
	showMoleculeBuiltPopup(moleculeName, formula)

	-- Animate coin gain
	if coinsEarned > 0 then
		delay(0.5, function()
			animateMolCoinReceived(coinsEarned)
		end)
	end

	-- Update chain tokens
	if tokensEarned > 0 then
		chainTokens = chainTokens + tokensEarned
		chainCountLabel.Text = formatNumber(chainTokens)
		flashColor(chainFrame, COLORS.chainBlue, 0.5)
	end

	-- Ticker message
	addTickerMessage(player.Name .. " built " .. moleculeName .. " (" .. formula .. ")!")

	-- Green flash on builder
	flashColor(dropZone, COLORS.success, 0.8)
	buildStatus.Text = moleculeName .. " built!"
	buildStatus.TextColor3 = COLORS.success
	delay(3, function()
		buildStatus.Text = ""
	end)
end)

ChainEntryAdded.OnClientEvent:Connect(function(data)
	-- data = {playerName, moleculeName, blockHash}
	if not data then return end
	local msg = data.playerName .. " registered " .. (data.moleculeName or "?") .. " on the MolChain!"
	addTickerMessage(msg)

	-- Brief chain icon pulse
	tweenProperty(chainIcon, {BackgroundColor3 = COLORS.coinGold}, 0.2)
	delay(0.3, function()
		tweenProperty(chainIcon, {BackgroundColor3 = COLORS.chainBlue}, 0.4)
	end)
end)

AchievementUnlocked.OnClientEvent:Connect(function(data)
	-- data = {title, description}
	if not data then return end
	showAchievementBanner(data.title or "Achievement", data.description or "")
	addTickerMessage(player.Name .. " unlocked achievement '" .. (data.title or "") .. "'!")
end)

--------------------------------------------------------------------------------
-- ELEMENT PROXIMITY DETECTION
--------------------------------------------------------------------------------

local function checkAtomProximity()
	local character = player.Character
	if not character then return end
	local humanoidRoot = character:FindFirstChild("HumanoidRootPart")
	if not humanoidRoot then return end

	local pos = humanoidRoot.Position
	-- Check for nearby atom pickups (tagged with "AtomPickup" attribute)
	local nearestAtom = nil
	local nearestDist = 20 -- detection radius in studs

	for _, obj in ipairs(workspace:GetDescendants()) do
		if obj:GetAttribute("AtomPickup") and obj:IsA("BasePart") then
			local dist = (obj.Position - pos).Magnitude
			if dist < nearestDist then
				nearestDist = dist
				nearestAtom = obj
			end
		end
	end

	if nearestAtom then
		local symbol = nearestAtom:GetAttribute("Symbol") or "?"
		local name = nearestAtom:GetAttribute("ElementName") or "Unknown"
		local mass = nearestAtom:GetAttribute("Mass") or 0
		local fact = nearestAtom:GetAttribute("Fact") or ""
		local group = nearestAtom:GetAttribute("Group") or "Unknown"

		infoSymbol.Text = symbol
		infoName.Text = name
		infoMass.Text = string.format("%.3f u", mass)
		infoFact.Text = fact
		infoColorStrip.BackgroundColor3 = getGroupColor(group)

		if not infoBar.Visible then
			infoBar.Visible = true
			infoBar.Position = UDim2.new(0.5, 0, 1, 20)
			tweenProperty(infoBar, {Position = UDim2.new(0.5, 0, 1, -20)}, 0.3)
		end
	else
		if infoBar.Visible then
			tweenProperty(infoBar, {Position = UDim2.new(0.5, 0, 1, 20)}, 0.3)
			delay(0.3, function()
				infoBar.Visible = false
			end)
		end
	end
end

-- Run proximity check every 0.5 seconds
local proximityTimer = 0
RunService.Heartbeat:Connect(function(dt)
	proximityTimer = proximityTimer + dt
	if proximityTimer >= 0.5 then
		proximityTimer = 0
		checkAtomProximity()
	end
end)

--------------------------------------------------------------------------------
-- MINIMAP PLAYER DOT UPDATE
--------------------------------------------------------------------------------

local MAP_WORLD_SIZE = 2000 -- world studs that map covers
local MAP_CENTER = Vector3.new(0, 0, 0) -- center of the map world
local minimapTimer = 0

RunService.Heartbeat:Connect(function(dt)
	minimapTimer = minimapTimer + dt
	if minimapTimer < 0.1 then return end
	minimapTimer = 0
	local character = player.Character
	if not character then return end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	local pos = hrp.Position
	local mapSize = mapViewport.AbsoluteSize
	local relX = math.clamp((pos.X - MAP_CENTER.X) / MAP_WORLD_SIZE + 0.5, 0, 1)
	local relZ = math.clamp((pos.Z - MAP_CENTER.Z) / MAP_WORLD_SIZE + 0.5, 0, 1)

	playerDot.Position = UDim2.new(relX, -4, relZ, -4)
end)

-- Keyboard shortcuts handled by GUIManager.client.lua

--------------------------------------------------------------------------------
-- WALLET BUTTON HANDLER
--------------------------------------------------------------------------------

walletBtn.Activated:Connect(function()
	local wGui = findScreenGui("WalletGui")
	if wGui then
		wGui.Enabled = not wGui.Enabled
	end
end)

--------------------------------------------------------------------------------
-- INITIAL DATA LOAD
--------------------------------------------------------------------------------

spawn(function()
	local success, data = pcall(function()
		return GetPlayerData:InvokeServer()
	end)

	if success and data then
		-- Load collected elements
		if data.elements then
			for z, count in pairs(data.elements) do
				collectedElements[tonumber(z)] = count
			end
			refreshInventoryGrid()
		end

		-- Load balances
		molCoinBalance = data.molCoins or 0
		balanceLabel.Text = formatNumber(molCoinBalance)

		chainTokens = data.chainTokens or 0
		chainCountLabel.Text = formatNumber(chainTokens)
	end
end)

--------------------------------------------------------------------------------
-- MOBILE SCALING
--------------------------------------------------------------------------------

local function updateScale()
	local viewportSize = workspace.CurrentCamera.ViewportSize
	local minDim = math.min(viewportSize.X, viewportSize.Y)

	if minDim < 600 then
		-- Mobile: scale down
		uiScale.Scale = math.max(0.6, minDim / 800)
	elseif minDim < 900 then
		-- Tablet
		uiScale.Scale = math.max(0.8, minDim / 1000)
	else
		uiScale.Scale = 1
	end
end

workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
updateScale()

-- ══════════════════════════════════════════════
-- MOBILE TOUCH BUTTONS
-- On-screen buttons for P (Periodic Table) and W (Wallet)
-- Only shown when TouchEnabled = true
-- ══════════════════════════════════════════════

if UserInputService.TouchEnabled then
	local mobileBar = Instance.new("Frame")
	mobileBar.Name = "MobileButtons"
	mobileBar.Size = UDim2.new(0, 200, 0, 50)
	mobileBar.Position = UDim2.new(1, -210, 1, -60)
	mobileBar.BackgroundTransparency = 1
	mobileBar.Parent = screenGui

	local mbLayout = Instance.new("UIListLayout")
	mbLayout.FillDirection = Enum.FillDirection.Horizontal
	mbLayout.Padding = UDim.new(0, 8)
	mbLayout.HorizontalAlignment = Enum.HorizontalAlignment.Right
	mbLayout.Parent = mobileBar

	local function createMobileBtn(text, color, callback)
		local btn = Instance.new("TextButton")
		btn.Size = UDim2.fromOffset(60, 44)
		btn.BackgroundColor3 = color
		btn.BackgroundTransparency = 0.3
		btn.Text = text
		btn.TextColor3 = Color3.fromRGB(255, 255, 255)
		btn.TextScaled = true
		btn.Font = Enum.Font.GothamBold
		btn.Parent = mobileBar

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 10)
		corner.Parent = btn

		btn.Activated:Connect(callback)
		return btn
	end

	-- Periodic Table button
	createMobileBtn("PT", Color3.fromRGB(34, 197, 94), function()
		local ptGui = findScreenGui("PeriodicTableGui")
		if ptGui then ptGui.Enabled = not ptGui.Enabled end
	end)

	-- Wallet button
	createMobileBtn("MC", Color3.fromRGB(255, 215, 0), function()
		local wGui = findScreenGui("WalletGui")
		if wGui then wGui.Enabled = not wGui.Enabled end
	end)

	-- Minimap toggle
	createMobileBtn("MAP", Color3.fromRGB(56, 189, 248), function()
		local minimap = screenGui:FindFirstChild("MiniMap", true)
		if minimap then minimap.Visible = not minimap.Visible end
	end)

	-- Second row of mobile buttons for ChemEng systems
	local mobileBar2 = Instance.new("Frame")
	mobileBar2.Name = "MobileButtons2"
	mobileBar2.Size = UDim2.new(0, 340, 0, 44)
	mobileBar2.Position = UDim2.new(1, -350, 1, -110)
	mobileBar2.BackgroundTransparency = 1
	mobileBar2.Parent = screenGui

	local mb2Layout = Instance.new("UIListLayout")
	mb2Layout.FillDirection = Enum.FillDirection.Horizontal
	mb2Layout.Padding = UDim.new(0, 4)
	mb2Layout.HorizontalAlignment = Enum.HorizontalAlignment.Right
	mb2Layout.Parent = mobileBar2

	local function createMobileBtn2(text, color, guiName)
		local btn2 = Instance.new("TextButton")
		btn2.Size = UDim2.fromOffset(48, 38)
		btn2.BackgroundColor3 = color
		btn2.BackgroundTransparency = 0.25
		btn2.Text = text
		btn2.TextColor3 = Color3.new(1, 1, 1)
		btn2.TextScaled = true
		btn2.Font = Enum.Font.GothamBold
		btn2.Parent = mobileBar2
		local c2 = Instance.new("UICorner")
		c2.CornerRadius = UDim.new(0, 8)
		c2.Parent = btn2
		btn2.Activated:Connect(function()
			local gui = findScreenGui(guiName)
			if gui then gui.Enabled = not gui.Enabled end
		end)
	end

	createMobileBtn2("S", Color3.fromRGB(220, 140, 40), "SlagProcessingGui")
	createMobileBtn2("F", Color3.fromRGB(80, 200, 60), "FertilizerGui")
	createMobileBtn2("G", Color3.fromRGB(0, 200, 130), "FactoryBuilderGui")
	createMobileBtn2("V", Color3.fromRGB(255, 200, 0), "MiningGui")
	createMobileBtn2("X", Color3.fromRGB(0, 220, 100), "ProductMarketGui")
	createMobileBtn2("T", Color3.fromRGB(100, 180, 255), "ResearchGui")
	createMobileBtn2("C", Color3.fromRGB(200, 140, 255), "ProcessControlGui")
end

print("[MOLGANG] HUDController loaded successfully")
