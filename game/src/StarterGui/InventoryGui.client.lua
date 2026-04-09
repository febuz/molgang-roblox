--[[
	InventoryGui.client.lua
	MOLGANG Inventory System

	Shows:
	- All atoms collected (grid layout)
	- Count per atom
	- Atom properties (atomic number, name, color)
	- Drag-and-drop to craft molecules
	- Storage limit based on offices
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local Elements = require(ReplicatedStorage.Data.Elements)
local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
local PlayerDataLoaded = Remotes:WaitForChild("PlayerDataLoaded")

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
}

local function createCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 8)
	corner.Parent = parent
	return corner
end

-- SCREEN GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "InventoryGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 13
screenGui.Enabled = false
screenGui.Parent = playerGui

-- Main panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
mainPanel.Size = UDim2.new(0, 900, 0, 700)
mainPanel.Position = UDim2.new(0.5, -450, 0.5, -350)
mainPanel.BackgroundColor3 = COLORS.panel
mainPanel.BackgroundTransparency = 0.1
mainPanel.Parent = screenGui
createCorner(mainPanel, 12)

-- Header
local header = Instance.new("TextLabel")
header.Name = "Header"
header.Size = UDim2.new(1, 0, 0, 50)
header.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
header.Text = "🧪 Inventory — Collected Atoms"
header.TextColor3 = COLORS.accent
header.TextScaled = true
header.Font = Enum.Font.GothamBold
header.Parent = mainPanel

-- Storage info
local storageLabel = Instance.new("TextLabel")
storageLabel.Name = "StorageLabel"
storageLabel.Size = UDim2.new(0.5, 0, 0, 40)
storageLabel.Position = UDim2.new(0, 10, 0, 55)
storageLabel.BackgroundTransparency = 1
storageLabel.Text = "Storage: 0/500"
storageLabel.TextColor3 = COLORS.textSecondary
storageLabel.TextScaled = true
storageLabel.Font = Enum.Font.Gotham
storageLabel.TextXAlignment = Enum.TextXAlignment.Left
storageLabel.Parent = mainPanel

-- Close button
local closeBtn = Instance.new("TextButton")
closeBtn.Name = "CloseBtn"
closeBtn.Size = UDim2.new(0, 80, 0, 35)
closeBtn.Position = UDim2.new(1, -90, 0, 8)
closeBtn.BackgroundColor3 = Color3.fromRGB(200, 80, 80)
closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
closeBtn.Text = "Close"
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = header
createCorner(closeBtn, 6)

-- Atom grid container
local gridContainer = Instance.new("ScrollingFrame")
gridContainer.Name = "GridContainer"
gridContainer.Size = UDim2.new(1, -20, 1, -110)
gridContainer.Position = UDim2.new(0, 10, 0, 100)
gridContainer.BackgroundTransparency = 1
gridContainer.ScrollBarThickness = 8
gridContainer.CanvasSize = UDim2.new(0, 0, 0, 0)
gridContainer.Parent = mainPanel

local gridLayout = Instance.new("UIGridLayout")
gridLayout.CellPadding = UDim2.new(0, 8, 0, 8)
gridLayout.CellSize = UDim2.new(0, 80, 0, 100)
gridLayout.SortOrder = Enum.SortOrder.Name
gridLayout.FillDirection = Enum.FillDirection.Horizontal
gridLayout.Parent = gridContainer

-- ═════════════════════════════════════════════════
-- INVENTORY DISPLAY
-- ═════════════════════════════════════════════════

local playerData = nil
local displayedAtoms = {}

PlayerDataLoaded.OnClientEvent:Connect(function(data)
	playerData = data
end)

local function displayAtomSlot(symbol, count)
	-- Find element data
	local elemData = nil
	for z, elem in pairs(Elements.Table) do
		if elem.sym == symbol then
			elemData = elem
			break
		end
	end

	if not elemData then return end

	-- Create atom slot
	local slot = Instance.new("Frame")
	slot.Name = symbol
	slot.Size = UDim2.new(1, 0, 1, 0)
	slot.BackgroundColor3 = elemData.color or COLORS.panelLight
	slot.BackgroundTransparency = 0.3
	slot.Parent = gridContainer
	createCorner(slot, 8)

	-- Atom symbol
	local symbolLabel = Instance.new("TextLabel")
	symbolLabel.Size = UDim2.new(1, 0, 0, 30)
	symbolLabel.Position = UDim2.new(0, 0, 0, 5)
	symbolLabel.BackgroundTransparency = 1
	symbolLabel.Text = symbol
	symbolLabel.TextColor3 = COLORS.textPrimary
	symbolLabel.TextScaled = true
	symbolLabel.Font = Enum.Font.GothamBold
	symbolLabel.Parent = slot

	-- Atom number
	local numLabel = Instance.new("TextLabel")
	numLabel.Size = UDim2.new(1, 0, 0, 20)
	numLabel.Position = UDim2.new(0, 0, 0, 35)
	numLabel.BackgroundTransparency = 1
	numLabel.Text = "Z=" .. elemData.z
	numLabel.TextColor3 = COLORS.textSecondary
	numLabel.TextScaled = true
	numLabel.Font = Enum.Font.Gotham
	numLabel.Parent = slot

	-- Count
	local countLabel = Instance.new("TextLabel")
	countLabel.Name = "CountLabel"
	countLabel.Size = UDim2.new(1, 0, 0, 25)
	countLabel.Position = UDim2.new(0, 0, 1, -30)
	countLabel.BackgroundColor3 = Color3.fromRGB(255, 215, 0)
	countLabel.TextColor3 = Color3.fromRGB(0, 0, 0)
	countLabel.Text = "x" .. count
	countLabel.TextScaled = true
	countLabel.Font = Enum.Font.GothamBold
	countLabel.Parent = slot
	createCorner(countLabel, 4)

	-- Hover tooltip
	local tooltip = Instance.new("TextLabel")
	tooltip.Name = "Tooltip"
	tooltip.Size = UDim2.new(0, 150, 0, 50)
	tooltip.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	tooltip.BackgroundTransparency = 0.2
	tooltip.Text = elemData.name
	tooltip.TextColor3 = COLORS.textPrimary
	tooltip.TextScaled = true
	tooltip.Font = Enum.Font.Gotham
	tooltip.Visible = false
	tooltip.Parent = slot
	createCorner(tooltip, 4)

	-- Show tooltip on hover
	slot.MouseEnter:Connect(function()
		tooltip.Visible = true
	end)
	slot.MouseLeave:Connect(function()
		tooltip.Visible = false
	end)

	displayedAtoms[symbol] = {slot = slot, countLabel = countLabel}
end

local function updateInventoryDisplay()
	if not playerData or not playerData.atoms then return end

	-- Clear existing displays
	for symbol, display in pairs(displayedAtoms) do
		if display.slot.Parent then
			display.slot:Destroy()
		end
		displayedAtoms[symbol] = nil
	end

	-- Calculate storage
	local totalAtoms = 0
	local maxStorage = 500  -- Base 500, +50 per office
	if playerData.facilities then
		maxStorage = maxStorage + (playerData.facilities.offices or 0) * 50
	end

	-- Display each atom
	for symbol, count in pairs(playerData.atoms) do
		displayAtomSlot(symbol, count)
		totalAtoms = totalAtoms + count
	end

	-- Update storage label
	storageLabel.Text = string.format("Storage: %d/%d", totalAtoms, maxStorage)

	-- If near capacity, show warning
	if totalAtoms > maxStorage * 0.8 then
		storageLabel.TextColor3 = Color3.fromRGB(255, 150, 0)
	else
		storageLabel.TextColor3 = COLORS.textSecondary
	end
end

-- Update on data load
PlayerDataLoaded.OnClientEvent:Connect(updateInventoryDisplay)

-- Real-time updates
RunService.Heartbeat:Connect(function()
	if playerData and playerData.atoms then
		-- Check if any atom counts changed
		for symbol, display in pairs(displayedAtoms) do
			local newCount = playerData.atoms[symbol] or 0
			local oldCount = tonumber(display.countLabel.Text:sub(2))
			if newCount ~= oldCount then
				updateInventoryDisplay()
				break
			end
		end
	end
end)

-- Listen for atom collection
Remotes.AtomCollected.OnClientEvent:Connect(function(data)
	if playerData then
		playerData.atoms[data.symbol] = data.newCount
		updateInventoryDisplay()
	end
end)

-- Close handler
closeBtn.MouseButton1Click:Connect(function()
	screenGui.Enabled = false
end)

-- Keyboard shortcut
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.I then
		screenGui.Enabled = not screenGui.Enabled
		if screenGui.Enabled then
			updateInventoryDisplay()
		end
	end
end)

_G.InventoryGuiToggle = function()
	screenGui.Enabled = not screenGui.Enabled
	if screenGui.Enabled then
		updateInventoryDisplay()
	end
end

print("[InventoryGui] Loaded — Press I to toggle inventory")
