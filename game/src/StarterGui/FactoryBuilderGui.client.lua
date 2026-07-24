--[[
	FactoryBuilderGui.client.lua
	MOLGANG — Interactive Factory Floor Planner

	Top-down grid view of 1000m² factory (40×25 cells).
	Players:
	- Browse equipment catalog (sidebar)
	- Click to select, click on grid to place
	- R to rotate, X to delete
	- See power/cost stats in real-time
	- Green/red placement preview

	Key: G to toggle
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local FactoryEquipment = require(ReplicatedStorage.Modules.FactoryEquipment)

-- UI click sound helper (#55)
local function playUIClick()
	local s = SoundService:FindFirstChild("ui_click")
	if s then
		local c = s:Clone(); c.Parent = SoundService; c:Play()
		c.Ended:Connect(function() c:Destroy() end)
	end
end

local C = {
	bg = Color3.fromRGB(10, 12, 18),
	panel = Color3.fromRGB(20, 24, 32),
	grid = Color3.fromRGB(25, 30, 38),
	gridLine = Color3.fromRGB(35, 42, 52),
	cellEmpty = Color3.fromRGB(30, 36, 45),
	cellOccupied = Color3.fromRGB(60, 70, 90),
	validPlace = Color3.fromRGB(0, 180, 80),
	invalidPlace = Color3.fromRGB(220, 50, 50),
	accent = Color3.fromRGB(0, 200, 130),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(230, 235, 245),
	textDim = Color3.fromRGB(120, 130, 150),
	catCrushing = Color3.fromRGB(200, 140, 60),
	catSeparation = Color3.fromRGB(200, 60, 60),
	catChemical = Color3.fromRGB(200, 200, 60),
	catStorage = Color3.fromRGB(100, 160, 200),
	catUtilities = Color3.fromRGB(80, 180, 80),
	catLab = Color3.fromRGB(180, 140, 220),
}

local CAT_COLORS = {
	Crushing = C.catCrushing,
	Separation = C.catSeparation,
	Chemical = C.catChemical,
	Storage = C.catStorage,
	Utilities = C.catUtilities,
	Lab = C.catLab,
}

local function corner(p, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 6); c.Parent = p end

-- ═══════════════════════════════════════════════
-- SCREEN GUI
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "FactoryBuilderGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.DisplayOrder = 20
screenGui.Enabled = false
screenGui.Parent = playerGui

local main = Instance.new("Frame")
main.Size = UDim2.new(1, -40, 1, -40)
main.Position = UDim2.new(0, 20, 0, 20)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.02
main.Parent = screenGui
corner(main, 12)
local ms = Instance.new("UIStroke"); ms.Color = C.accent; ms.Thickness = 2; ms.Parent = main

-- Title bar
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 40)
titleBar.BackgroundColor3 = C.panel
titleBar.Parent = main
corner(titleBar, 12)

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(0.5, 0, 1, 0)
titleLabel.Position = UDim2.new(0, 14, 0, 0)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "FACTORY BUILDER — 1000m² Floor Plan"
titleLabel.TextColor3 = C.accent
titleLabel.TextScaled = true
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = titleBar

-- Stats bar (power, cost, items)
local statsLabel = Instance.new("TextLabel")
statsLabel.Name = "Stats"
statsLabel.Size = UDim2.new(0.45, 0, 1, 0)
statsLabel.Position = UDim2.new(0.5, 0, 0, 0)
statsLabel.BackgroundTransparency = 1
statsLabel.Text = "Power: 0/100kW | Cost: 2000 MC/mo | Items: 0/30"
statsLabel.TextColor3 = C.textDim
statsLabel.TextScaled = true
statsLabel.Font = Enum.Font.Gotham
statsLabel.TextXAlignment = Enum.TextXAlignment.Right
statsLabel.Parent = titleBar

-- Close button
local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(28, 28)
closeBtn.Position = UDim2.new(1, -36, 0, 6)
closeBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 60)
closeBtn.Text = "X"; closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold; closeBtn.TextScaled = true
closeBtn.Parent = titleBar; corner(closeBtn, 6)
closeBtn.Activated:Connect(function() playUIClick(); screenGui.Enabled = false end)

-- ═══════════════════════════════════════════════
-- LAYOUT: Left = Equipment Catalog, Center = Grid, Right = Info
-- ═══════════════════════════════════════════════

local CATALOG_WIDTH = 0.22
local INFO_WIDTH = 0.18
local GRID_WIDTH = 1 - CATALOG_WIDTH - INFO_WIDTH

-- ── EQUIPMENT CATALOG (left sidebar) ──
local catalogPanel = Instance.new("Frame")
catalogPanel.Size = UDim2.new(CATALOG_WIDTH, -4, 1, -44)
catalogPanel.Position = UDim2.new(0, 4, 0, 42)
catalogPanel.BackgroundColor3 = C.panel
catalogPanel.BackgroundTransparency = 0.3
catalogPanel.Parent = main
corner(catalogPanel, 8)

local catalogTitle = Instance.new("TextLabel")
catalogTitle.Size = UDim2.new(1, -8, 0, 22)
catalogTitle.Position = UDim2.new(0, 4, 0, 4)
catalogTitle.BackgroundTransparency = 1
catalogTitle.Text = "EQUIPMENT CATALOG"
catalogTitle.TextColor3 = C.accent
catalogTitle.TextScaled = true
catalogTitle.Font = Enum.Font.GothamBold
catalogTitle.TextXAlignment = Enum.TextXAlignment.Left
catalogTitle.Parent = catalogPanel

-- Rent button (shown when not rented)
local rentBtn = Instance.new("TextButton")
rentBtn.Name = "RentBtn"
rentBtn.Size = UDim2.new(0.9, 0, 0, 32)
rentBtn.Position = UDim2.new(0.05, 0, 0, 28)
rentBtn.BackgroundColor3 = C.accent
rentBtn.Text = "RENT FACTORY (500 MC trial / 2000 MC/mo)"
rentBtn.TextColor3 = Color3.new(0, 0, 0)
rentBtn.Font = Enum.Font.GothamBold
rentBtn.TextScaled = true
rentBtn.Parent = catalogPanel
corner(rentBtn, 6)

rentBtn.Activated:Connect(function()
	playUIClick()
	local r = Remotes:FindFirstChild("RequestRentFactory")
	if r then r:FireServer() end
end)

-- Catalog scroll
local catalogScroll = Instance.new("ScrollingFrame")
catalogScroll.Size = UDim2.new(1, -8, 1, -68)
catalogScroll.Position = UDim2.new(0, 4, 0, 64)
catalogScroll.BackgroundTransparency = 1
catalogScroll.ScrollBarThickness = 4
catalogScroll.CanvasSize = UDim2.new(0, 0, 0, #FactoryEquipment.Items * 56)
catalogScroll.Parent = catalogPanel

local catalogLayout = Instance.new("UIListLayout")
catalogLayout.Padding = UDim.new(0, 3)
catalogLayout.Parent = catalogScroll

-- State
local selectedEquipment = nil
local currentRotation = 0
local isFactoryRented = false

-- Populate catalog
for _, item in ipairs(FactoryEquipment.Items) do
	local card = Instance.new("TextButton")
	card.Name = item.id
	card.Size = UDim2.new(1, 0, 0, 52)
	card.BackgroundColor3 = C.cellEmpty
	card.TextColor3 = C.text
	card.Text = ""
	card.AutoButtonColor = true
	card.Parent = catalogScroll
	corner(card, 6)

	-- Category color strip
	local strip = Instance.new("Frame")
	strip.Size = UDim2.new(0, 4, 0.8, 0)
	strip.Position = UDim2.new(0, 2, 0.1, 0)
	strip.BackgroundColor3 = CAT_COLORS[item.category] or C.accent
	strip.Parent = card
	corner(strip, 2)

	-- Name
	local nameL = Instance.new("TextLabel")
	nameL.Size = UDim2.new(0.65, -12, 0, 16)
	nameL.Position = UDim2.new(0, 10, 0, 3)
	nameL.BackgroundTransparency = 1
	nameL.Text = item.name
	nameL.TextColor3 = C.text
	nameL.TextScaled = true
	nameL.Font = Enum.Font.GothamBold
	nameL.TextXAlignment = Enum.TextXAlignment.Left
	nameL.Parent = card

	-- Size + category
	local sizeL = Instance.new("TextLabel")
	sizeL.Size = UDim2.new(0.65, -12, 0, 12)
	sizeL.Position = UDim2.new(0, 10, 0, 19)
	sizeL.BackgroundTransparency = 1
	sizeL.Text = item.gridSize[1] .. "×" .. item.gridSize[2] .. "m | " .. item.category
	sizeL.TextColor3 = C.textDim
	sizeL.TextScaled = true
	sizeL.Font = Enum.Font.Gotham
	sizeL.TextXAlignment = Enum.TextXAlignment.Left
	sizeL.Parent = card

	-- Power + cost
	local infoL = Instance.new("TextLabel")
	infoL.Size = UDim2.new(0.65, -12, 0, 12)
	infoL.Position = UDim2.new(0, 10, 0, 34)
	infoL.BackgroundTransparency = 1
	local powerStr = item.powerKW < 0 and ("+" .. math.abs(item.powerKW) .. "kW") or (item.powerKW .. "kW")
	infoL.Text = powerStr .. " | " .. item.monthlyCost .. " MC/mo"
	infoL.TextColor3 = item.powerKW < 0 and C.accent or C.textDim
	infoL.TextScaled = true
	infoL.Font = Enum.Font.Gotham
	infoL.TextXAlignment = Enum.TextXAlignment.Left
	infoL.Parent = card

	-- Cost badge
	local costL = Instance.new("TextLabel")
	costL.Size = UDim2.new(0.3, 0, 0, 18)
	costL.Position = UDim2.new(0.68, 0, 0, 4)
	costL.BackgroundTransparency = 1
	costL.Text = item.cost .. " MC"
	costL.TextColor3 = C.gold
	costL.TextScaled = true
	costL.Font = Enum.Font.GothamBold
	costL.TextXAlignment = Enum.TextXAlignment.Right
	costL.Parent = card

	-- Buy button
	local buyBtn = Instance.new("TextButton")
	buyBtn.Size = UDim2.new(0.3, 0, 0, 18)
	buyBtn.Position = UDim2.new(0.68, 0, 0, 28)
	buyBtn.BackgroundColor3 = C.accent
	buyBtn.Text = "Buy"
	buyBtn.TextColor3 = Color3.new(0, 0, 0)
	buyBtn.Font = Enum.Font.GothamBold
	buyBtn.TextScaled = true
	buyBtn.Parent = card
	corner(buyBtn, 4)

	buyBtn.Activated:Connect(function()
		local r = Remotes:FindFirstChild("RequestBuyEquipment")
		if r then r:FireServer(item.id) end
	end)

	-- Select for placement on click
	card.Activated:Connect(function()
		selectedEquipment = item.id
		currentRotation = 0
		-- Highlight selected
		for _, child in catalogScroll:GetChildren() do
			if child:IsA("TextButton") then
				child.BackgroundColor3 = C.cellEmpty
			end
		end
		card.BackgroundColor3 = Color3.fromRGB(40, 60, 50)

		-- Update info panel
		updateInfoPanel(item)
	end)
end

-- ── GRID VIEW (center) ──
local GRID_W = FactoryEquipment.FloorConfig.width   -- 40
local GRID_H = FactoryEquipment.FloorConfig.height   -- 25
local CELL_SIZE = 14  -- pixels per cell

local gridPanel = Instance.new("Frame")
gridPanel.Size = UDim2.new(GRID_WIDTH, -8, 1, -44)
gridPanel.Position = UDim2.new(CATALOG_WIDTH, 4, 0, 42)
gridPanel.BackgroundColor3 = C.grid
gridPanel.ClipsDescendants = true
gridPanel.Parent = main
corner(gridPanel, 8)

-- Grid header
local gridHeader = Instance.new("TextLabel")
gridHeader.Size = UDim2.new(1, 0, 0, 18)
gridHeader.BackgroundTransparency = 1
gridHeader.Text = "Click grid to place selected equipment | R=Rotate | X=Remove | Scroll=Zoom"
gridHeader.TextColor3 = C.textDim
gridHeader.TextScaled = true
gridHeader.Font = Enum.Font.Gotham
gridHeader.Parent = gridPanel

-- Grid canvas (scrollable/zoomable)
local gridCanvas = Instance.new("Frame")
gridCanvas.Name = "GridCanvas"
gridCanvas.Size = UDim2.fromOffset(GRID_W * CELL_SIZE, GRID_H * CELL_SIZE)
gridCanvas.Position = UDim2.new(0.5, -(GRID_W * CELL_SIZE) / 2, 0.5, -(GRID_H * CELL_SIZE) / 2 + 10)
gridCanvas.BackgroundColor3 = Color3.fromRGB(15, 18, 25)
gridCanvas.Parent = gridPanel

-- Draw grid cells
local gridCells = {}  -- {[x][y] = frame}
for x = 1, GRID_W do
	gridCells[x] = {}
	for y = 1, GRID_H do
		local cell = Instance.new("TextButton")
		cell.Size = UDim2.fromOffset(CELL_SIZE - 1, CELL_SIZE - 1)
		cell.Position = UDim2.fromOffset((x - 1) * CELL_SIZE, (y - 1) * CELL_SIZE)
		cell.BackgroundColor3 = C.cellEmpty
		cell.Text = ""
		cell.BorderSizePixel = 0
		cell.AutoButtonColor = false
		cell.Parent = gridCanvas

		-- Click to place/interact
		cell.Activated:Connect(function()
			if selectedEquipment then
				local r = Remotes:FindFirstChild("RequestPlaceEquipment")
				if r then r:FireServer(selectedEquipment, x, y, currentRotation) end
			end
		end)

		-- Right-click to remove (with confirmation for expensive items #30)
		cell.MouseButton2Click:Connect(function()
			playUIClick()
			-- Check if cell has expensive equipment
			local isExpensive = cell:GetAttribute("Occupied") and cell:GetAttribute("Cost") and cell:GetAttribute("Cost") > 1000
			if isExpensive then
				-- Show confirm dialog
				local cg = Instance.new("ScreenGui"); cg.Name = "ConfirmRemove"; cg.Parent = playerGui
				local cf = Instance.new("Frame"); cf.Size = UDim2.new(0.3,0,0,60); cf.Position = UDim2.new(0.35,0,0.4,0)
				cf.BackgroundColor3 = Color3.fromRGB(40,15,15); cf.Parent = cg
				local cl = Instance.new("TextLabel"); cl.Size = UDim2.new(1,0,0.5,0); cl.BackgroundTransparency = 1
				cl.Text = "Remove expensive equipment? (No refund)"; cl.TextColor3 = Color3.fromRGB(255,180,80)
				cl.TextScaled = true; cl.Font = Enum.Font.GothamBold; cl.Parent = cf
				local yb = Instance.new("TextButton"); yb.Size = UDim2.new(0.4,0,0.4,0); yb.Position = UDim2.new(0.05,0,0.55,0)
				yb.Text = "Yes"; yb.BackgroundColor3 = Color3.fromRGB(200,60,60); yb.TextColor3 = Color3.new(1,1,1)
				yb.TextScaled = true; yb.Font = Enum.Font.GothamBold; yb.Parent = cf
				local nb = Instance.new("TextButton"); nb.Size = UDim2.new(0.4,0,0.4,0); nb.Position = UDim2.new(0.55,0,0.55,0)
				nb.Text = "No"; nb.BackgroundColor3 = Color3.fromRGB(60,60,80); nb.TextColor3 = Color3.new(1,1,1)
				nb.TextScaled = true; nb.Font = Enum.Font.GothamBold; nb.Parent = cf
			yb.Activated:Connect(function()
					local r = Remotes:FindFirstChild("RequestRemoveEquipment")
					if r then r:FireServer(x, y) end
					cg:Destroy()
				end)
			nb.Activated:Connect(function() cg:Destroy() end)
				task.delay(5, function() if cg.Parent then cg:Destroy() end end)
			else
				local r = Remotes:FindFirstChild("RequestRemoveEquipment")
				if r then r:FireServer(x, y) end
			end
		end)

		-- Hover preview
		cell.MouseEnter:Connect(function()
			if selectedEquipment then
				showPlacementPreview(x, y)
			end
		end)

		cell.MouseLeave:Connect(function()
			clearPreview()
		end)

		gridCells[x][y] = cell
	end
end

-- Preview frames
local previewFrames = {}

function showPlacementPreview(gx, gy)
	clearPreview()
	if not selectedEquipment then return end

	local item = FactoryEquipment.GetItem(selectedEquipment)
	if not item then return end

	local w = item.gridSize[1]
	local h = item.gridSize[2]
	if currentRotation % 2 == 1 then w, h = h, w end

	local valid = gx >= 1 and gy >= 1 and gx + w - 1 <= GRID_W and gy + h - 1 <= GRID_H
	local previewColor = valid and C.validPlace or C.invalidPlace

	for px = gx, math.min(gx + w - 1, GRID_W) do
		for py = gy, math.min(gy + h - 1, GRID_H) do
			if gridCells[px] and gridCells[px][py] then
				local cellFrame = gridCells[px][py]
				-- Check if already occupied
				if cellFrame.BackgroundColor3 == C.cellOccupied then
					previewColor = C.invalidPlace
				end
				cellFrame.BackgroundColor3 = previewColor
				cellFrame.BackgroundTransparency = 0.3
				table.insert(previewFrames, {frame = cellFrame, x = px, y = py})
			end
		end
	end
end

function clearPreview()
	for _, pf in ipairs(previewFrames) do
		-- Restore original color (check if occupied)
		local wasOccupied = pf.frame:GetAttribute("Occupied")
		pf.frame.BackgroundColor3 = wasOccupied and C.cellOccupied or C.cellEmpty
		pf.frame.BackgroundTransparency = 0
	end
	previewFrames = {}
end

-- ── INFO PANEL (right sidebar) ──
local infoPanel = Instance.new("Frame")
infoPanel.Size = UDim2.new(INFO_WIDTH, -4, 1, -44)
infoPanel.Position = UDim2.new(1 - INFO_WIDTH, 0, 0, 42)
infoPanel.BackgroundColor3 = C.panel
infoPanel.BackgroundTransparency = 0.3
infoPanel.Parent = main
corner(infoPanel, 8)

local infoTitle = Instance.new("TextLabel")
infoTitle.Size = UDim2.new(1, -8, 0, 20)
infoTitle.Position = UDim2.new(0, 4, 0, 4)
infoTitle.BackgroundTransparency = 1
infoTitle.Text = "EQUIPMENT INFO"
infoTitle.TextColor3 = C.accent
infoTitle.TextScaled = true
infoTitle.Font = Enum.Font.GothamBold
infoTitle.TextXAlignment = Enum.TextXAlignment.Left
infoTitle.Parent = infoPanel

local infoDesc = Instance.new("TextLabel")
infoDesc.Name = "InfoDesc"
infoDesc.Size = UDim2.new(1, -8, 1, -30)
infoDesc.Position = UDim2.new(0, 4, 0, 28)
infoDesc.BackgroundTransparency = 1
infoDesc.Text = "Select equipment from catalog to see details.\n\nR = Rotate\nX = Delete\nRight-click = Remove"
infoDesc.TextColor3 = C.textDim
infoDesc.TextScaled = true
infoDesc.Font = Enum.Font.Gotham
infoDesc.TextXAlignment = Enum.TextXAlignment.Left
infoDesc.TextYAlignment = Enum.TextYAlignment.Top
infoDesc.TextWrapped = true
infoDesc.Parent = infoPanel

function updateInfoPanel(item)
	if not item then return end
	local powerStr = item.powerKW < 0 and ("Generates " .. math.abs(item.powerKW) .. "kW") or ("Uses " .. item.powerKW .. "kW")
	local text = item.name .. "\n"
		.. "Category: " .. item.category .. "\n"
		.. "Size: " .. item.gridSize[1] .. "×" .. item.gridSize[2] .. "m\n"
		.. "Cost: " .. item.cost .. " MC\n"
		.. "Maintenance: " .. item.monthlyCost .. " MC/mo\n"
		.. "Power: " .. powerStr .. "\n"
		.. "Tier: " .. item.tier .. "\n\n"
		.. item.description

	if item.adjacencyBonus then
		text = text .. "\n\nAdjacency Bonuses:"
		for neighbor, bonus in pairs(item.adjacencyBonus) do
			text = text .. "\n  +" .. math.floor((bonus - 1) * 100) .. "% near " .. neighbor
		end
	end

	infoDesc.Text = text
end

-- ═══════════════════════════════════════════════
-- KEYBOARD SHORTCUTS
-- ═══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if not screenGui.Enabled then return end

	-- R = Rotate selected equipment
	if input.KeyCode == Enum.KeyCode.R then
		currentRotation = (currentRotation + 1) % 4
	end

	-- X = Deselect
	if input.KeyCode == Enum.KeyCode.X then
		selectedEquipment = nil
		for _, child in catalogScroll:GetChildren() do
			if child:IsA("TextButton") then
				child.BackgroundColor3 = C.cellEmpty
			end
		end
		infoDesc.Text = "Equipment deselected."
	end
end)

-- ═══════════════════════════════════════════════
-- SERVER EVENT HANDLERS
-- ═══════════════════════════════════════════════

local factoryEvent = Remotes:FindFirstChild("FactoryUpdate")
if factoryEvent then
	factoryEvent.OnClientEvent:Connect(function(data)
		isFactoryRented = data.rented
		rentBtn.Visible = not data.rented

		-- Update stats
		local carbonTaxText = (data.carbonTax or 0) > 0
			and string.format(" | Carbon tax: %d", data.carbonTax)
			or ""
		local carbonScoreText = data.carbonRating
			and string.format(" | Carbon: %s (%d)", data.carbonRating, data.carbonScore or 0)
			or ""
		statsLabel.Text = string.format(
			"Power: %d/%dkW | Cost: %d MC/mo%s%s | Items: %d/%d",
			data.powerDraw or 0,
			data.powerAvailable or 100,
			data.monthlyCost or 0,
			carbonTaxText,
			carbonScoreText,
			data.placementCount or 0,
			data.maxPlacements or 30
		)

		-- Power warning — flash red when overloaded (#39)
		if (data.powerBalance or 0) < 0 then
			statsLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
			-- Flash effect
			task.spawn(function()
				for _ = 1, 3 do
					statsLabel.BackgroundTransparency = 0
					statsLabel.BackgroundColor3 = Color3.fromRGB(80, 10, 10)
					task.wait(0.3)
					statsLabel.BackgroundTransparency = 1
					task.wait(0.3)
				end
			end)
		else
			statsLabel.TextColor3 = C.textDim
			statsLabel.BackgroundTransparency = 1
		end

		-- Clear grid
		for x = 1, GRID_W do
			for y = 1, GRID_H do
				if gridCells[x] and gridCells[x][y] then
					gridCells[x][y].BackgroundColor3 = C.cellEmpty
					gridCells[x][y]:SetAttribute("Occupied", false)
					gridCells[x][y].Text = ""
				end
			end
		end

		-- Draw placements
		if data.placements then
			for _, p in ipairs(data.placements) do
				local w = p.gridSize[1]
				local h = p.gridSize[2]
				if p.rotation and p.rotation % 2 == 1 then w, h = h, w end

				local color = Color3.fromRGB(
					(p.color[1] or 0.5) * 255,
					(p.color[2] or 0.5) * 255,
					(p.color[3] or 0.5) * 255
				)

				for px = p.gridX, math.min(p.gridX + w - 1, GRID_W) do
					for py = p.gridY, math.min(p.gridY + h - 1, GRID_H) do
						if gridCells[px] and gridCells[px][py] then
							gridCells[px][py].BackgroundColor3 = color
							gridCells[px][py].BackgroundTransparency = 0.2
							gridCells[px][py]:SetAttribute("Occupied", true)

							-- Show name on center cell
							if px == p.gridX and py == p.gridY then
								gridCells[px][py].Text = p.name:sub(1, 3)
								gridCells[px][py].TextColor3 = Color3.new(1, 1, 1)
								gridCells[px][py].TextScaled = true
								gridCells[px][py].Font = Enum.Font.GothamBold
							end
						end
					end
				end
			end
		end
	end)
end

-- Weather indicator in factory builder
local weatherEvent = Remotes:FindFirstChild("WeatherChanged")
if weatherEvent then
	weatherEvent.OnClientEvent:Connect(function(data)
		local weatherLabel = titleBar:FindFirstChild("WeatherLabel")
		if not weatherLabel then
			weatherLabel = Instance.new("TextLabel")
			weatherLabel.Name = "WeatherLabel"
			weatherLabel.Size = UDim2.new(0, 140, 0, 20)
			weatherLabel.Position = UDim2.new(0, 14, 0, 22)
			weatherLabel.BackgroundTransparency = 1
			weatherLabel.TextColor3 = C.textDim
			weatherLabel.TextScaled = true
			weatherLabel.Font = Enum.Font.Gotham
			weatherLabel.TextXAlignment = Enum.TextXAlignment.Left
			weatherLabel.Parent = titleBar
		end

		local penaltyStr = data.outdoorPenalty < 1.0
			and (" | Outdoor: -" .. math.floor((1 - data.outdoorPenalty) * 100) .. "%")
			or ""
		weatherLabel.Text = "Weather: " .. data.name .. penaltyStr

		if data.id == "storm" or data.id == "hail" then
			weatherLabel.TextColor3 = Color3.fromRGB(255, 100, 80)
		else
			weatherLabel.TextColor3 = C.textDim
		end
	end)
end

-- Refresh on open
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		local r = Remotes:FindFirstChild("RequestFactoryInfo")
		if r then r:FireServer() end
	end
end)

print("[MOLGANG] FactoryBuilderGui loaded — G key to open, 40×25 grid, drag-drop equipment")
