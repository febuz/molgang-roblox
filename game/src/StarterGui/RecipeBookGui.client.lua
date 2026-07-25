--[[
	RecipeBookGui.client.lua
	MOLGANG Recipe Book / Crafting Guide

	Shows all available molecules:
	- Recipe ingredients
	- Points reward
	- Rarity/difficulty
	- Crafting status (can craft, missing items)
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
local GetPlayerData = Remotes:WaitForChild("GetPlayerData")

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	legendary     = Color3.fromRGB(255, 215, 0),
	epic          = Color3.fromRGB(200, 100, 255),
	rare          = Color3.fromRGB(100, 150, 255),
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
screenGui.Name = "RecipeBookGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 11
screenGui.Enabled = false
screenGui.Parent = playerGui

-- Main panel
local mainPanel = Instance.new("Frame")
mainPanel.Name = "MainPanel"
-- Use viewport-relative bounds so the recipe list and Craft buttons remain
-- reachable in compact Studio/Wine windows.
mainPanel.Size = UDim2.new(0.92, 0, 0.86, 0)
mainPanel.Position = UDim2.new(0.04, 0, 0.07, 0)
mainPanel.ClipsDescendants = true
mainPanel.BackgroundColor3 = COLORS.panel
mainPanel.BackgroundTransparency = 0.1
mainPanel.Parent = screenGui
createCorner(mainPanel, 12)

-- Header
local header = Instance.new("TextLabel")
header.Name = "Header"
header.Size = UDim2.new(1, 0, 0, 50)
header.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
header.Text = "📖 Recipe Book — Crafting Guide"
header.TextColor3 = COLORS.accent
header.TextScaled = true
header.Font = Enum.Font.GothamBold
header.Parent = mainPanel

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

-- Scroll container
local scroll = Instance.new("ScrollingFrame")
scroll.Name = "RecipeScroll"
scroll.Size = UDim2.new(1, -20, 1, -70)
scroll.Position = UDim2.new(0, 10, 0, 60)
scroll.BackgroundTransparency = 1
scroll.ScrollBarThickness = 8
scroll.Parent = mainPanel

local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Vertical
layout.Padding = UDim.new(0, 8)
layout.Parent = scroll

-- ═════════════════════════════════════════════════
-- RECIPE DISPLAY
-- ═════════════════════════════════════════════════

local playerData = nil

local craftEntries = {}

local function canCraftRecipe(recipe)
	if not playerData or type(playerData.atoms) ~= "table" then return false end
	for sym, count in pairs(recipe.atoms) do
		if (playerData.atoms[sym] or 0) < count then
			return false
		end
	end
	return true
end

local function refreshCraftButtons()
	for _, entry in ipairs(craftEntries) do
		local canCraft = canCraftRecipe(entry.recipe)
		entry.button.BackgroundColor3 = canCraft and COLORS.accent or Color3.fromRGB(80, 80, 100)
		entry.button.TextColor3 = canCraft and Color3.fromRGB(0, 0, 0) or COLORS.textSecondary
		entry.button.Text = canCraft and "Craft" or "Need Items"
		entry.button.Active = canCraft
	end
end

Remotes.PlayerDataLoaded.OnClientEvent:Connect(function(data)
	playerData = data
	refreshCraftButtons()
end)

-- Sort molecules by points (reward)
local molList = {}
for molName, recipe in pairs(Chemistry.Molecules) do
	table.insert(molList, {name = molName, recipe = recipe})
end
table.sort(molList, function(a, b)
	return a.recipe.points > b.recipe.points
end)

-- Display each molecule as a recipe card
for _, mol in ipairs(molList) do
	local molName = mol.name
	local recipe = mol.recipe

	local recipeCard = Instance.new("Frame")
	recipeCard.Name = molName
	recipeCard.Size = UDim2.new(1, 0, 0, 90)
	recipeCard.BackgroundColor3 = COLORS.panelLight
	recipeCard.BackgroundTransparency = 0.2
	recipeCard.Parent = scroll
	createCorner(recipeCard, 8)

	-- Molecule name & points
	local molLabel = Instance.new("TextLabel")
	molLabel.Size = UDim2.new(0.4, 0, 0.5, 0)
	molLabel.Position = UDim2.new(0, 10, 0, 5)
	molLabel.BackgroundTransparency = 1
	molLabel.Text = molName .. " (⚗️ " .. recipe.name .. ")"
	molLabel.TextColor3 = (recipe.color or COLORS.accent)
	molLabel.TextScaled = true
	molLabel.Font = Enum.Font.GothamBold
	molLabel.TextXAlignment = Enum.TextXAlignment.Left
	molLabel.Parent = recipeCard

	local pointsLabel = Instance.new("TextLabel")
	pointsLabel.Size = UDim2.new(0.25, 0, 0.5, 0)
	pointsLabel.Position = UDim2.new(0.75, 0, 0, 5)
	pointsLabel.BackgroundTransparency = 1
	pointsLabel.Text = "💰 " .. recipe.points
	pointsLabel.TextColor3 = COLORS.legendary
	pointsLabel.TextScaled = true
	pointsLabel.Font = Enum.Font.GothamBold
	pointsLabel.TextXAlignment = Enum.TextXAlignment.Center
	pointsLabel.Parent = recipeCard

	-- Recipe ingredients with valence hints (#27)
	local ingredientsText = ""
	local valenceHints = {}
	for sym, count in pairs(recipe.atoms) do
		if ingredientsText ~= "" then ingredientsText = ingredientsText .. " + " end
		ingredientsText = ingredientsText .. sym .. "x" .. count
		local v = Chemistry.Valence[sym]
		if v then table.insert(valenceHints, sym .. "=" .. v) end
	end

	local ingredientsLabel = Instance.new("TextLabel")
	ingredientsLabel.Size = UDim2.new(0.7, -10, 0.35, 0)
	ingredientsLabel.Position = UDim2.new(0, 10, 0.45, 0)
	ingredientsLabel.BackgroundTransparency = 1
	ingredientsLabel.Text = "Ingredients: " .. ingredientsText
	ingredientsLabel.TextColor3 = COLORS.textSecondary
	ingredientsLabel.TextScaled = true
	ingredientsLabel.Font = Enum.Font.Gotham
	ingredientsLabel.TextXAlignment = Enum.TextXAlignment.Left
	ingredientsLabel.Parent = recipeCard

	-- Valence tooltip (#27)
	local valLabel = Instance.new("TextLabel")
	valLabel.Size = UDim2.new(0.7, -10, 0.2, 0)
	valLabel.Position = UDim2.new(0, 10, 0.78, 0)
	valLabel.BackgroundTransparency = 1
	valLabel.Text = "Valence: " .. table.concat(valenceHints, ", ")
	valLabel.TextColor3 = Color3.fromRGB(140, 140, 180)
	valLabel.TextScaled = true
	valLabel.Font = Enum.Font.Gotham
	valLabel.TextXAlignment = Enum.TextXAlignment.Left
	valLabel.Parent = recipeCard

	-- Craft button (if player has ingredients)
	local canCraft = canCraftRecipe(recipe)

	local craftBtn = Instance.new("TextButton")
	craftBtn.Name = "CraftBtn"
	craftBtn.Size = UDim2.new(0.15, -5, 0.8, -5)
	craftBtn.Position = UDim2.new(0.85, 0, 0.1, 0)
	craftBtn.BackgroundColor3 = canCraft and COLORS.accent or Color3.fromRGB(80, 80, 100)
	craftBtn.TextColor3 = canCraft and Color3.fromRGB(0, 0, 0) or COLORS.textSecondary
	craftBtn.Text = canCraft and "Craft" or "Need Items"
	craftBtn.Font = Enum.Font.GothamBold
	craftBtn.TextScaled = true
	craftBtn.Active = canCraft
	craftBtn.Selectable = canCraft
	craftBtn.Parent = recipeCard
	createCorner(craftBtn, 4)
	table.insert(craftEntries, {recipe = recipe, button = craftBtn})

	craftBtn.Activated:Connect(function()
		print("[RecipeBook] Craft requested:", molName)
		-- Send craft request to server via RequestBuildMolecule
		Remotes.RequestBuildMolecule:FireServer(recipe.atoms)
	end)
end

screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		-- PlayerDataLoaded may have fired before this GUI connected; refresh
		-- from the authoritative server snapshot whenever the book opens.
		local success, data = pcall(function()
			return GetPlayerData:InvokeServer()
		end)
		if success and data then
			playerData = data
			refreshCraftButtons()
		end
	end
end)

-- Close handler
closeBtn.Activated:Connect(function()
	screenGui.Enabled = false
end)

_G.RecipeBookToggle = function()
	screenGui.Enabled = not screenGui.Enabled
end

print("[RecipeBookGui] Loaded — Press R to toggle recipe book")
