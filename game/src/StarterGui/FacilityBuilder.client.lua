--[[
	FacilityBuilder.client.lua
	MOLGANG Facility Placement UI & Interaction

	Allows players to build mines, factories, research labs, offices
	UI triggered with D key
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local mouse = player:GetMouse()

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- FACILITY DEFINITIONS
-- ══════════════════════════════════════════════

local FACILITIES = {
	{type = "mine", name = "Mine", cost = 500, desc = "Produces atoms", color = Color3.fromRGB(139, 69, 19)},
	{type = "factory", name = "Factory", cost = 1000, desc = "Produces molecules", color = Color3.fromRGB(100, 100, 100)},
	{type = "researchLab", name = "Research Lab", cost = 2000, desc = "Rare molecules", color = Color3.fromRGB(100, 150, 255)},
	{type = "office", name = "Office", cost = 300, desc = "Passive coins", color = Color3.fromRGB(200, 200, 100)},
}

-- ══════════════════════════════════════════════
-- UI STATE
-- ══════════════════════════════════════════════

local builderGui = nil
local isBuilding = false
local selectedFacility = nil
local playerMolCoins = 0

-- ══════════════════════════════════════════════
-- COLOR PALETTE (matches HUDController)
-- ══════════════════════════════════════════════

local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	gold          = Color3.fromRGB(255, 215, 0),
	danger        = Color3.fromRGB(220, 60, 60),
}

-- ══════════════════════════════════════════════
-- HELPER FUNCTIONS
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
-- CREATE BUILDER UI
-- ══════════════════════════════════════════════

local function createBuilderUI()
	builderGui = Instance.new("ScreenGui")
	builderGui.Name = "FacilityBuilder"
	builderGui.ResetOnSpawn = false
	builderGui.Parent = playerGui
	builderGui.Enabled = false

	-- Main panel
	local mainPanel = Instance.new("Frame")
	mainPanel.Name = "MainPanel"
	mainPanel.Size = UDim2.new(0, 320, 0, 400)
	mainPanel.Position = UDim2.new(1, -340, 0.5, -200)
	mainPanel.BackgroundColor3 = COLORS.panel
	mainPanel.BackgroundTransparency = 0.1
	mainPanel.Parent = builderGui
	createCorner(mainPanel, 12)

	-- Title
	local title = createTextLabel(mainPanel, {
		Size = UDim2.new(1, 0, 0, 40),
		Position = UDim2.new(0, 0, 0, 0),
		Text = "🏗️ FACILITY BUILDER",
		TextColor3 = COLORS.accent,
		TextScaled = true,
		Font = Enum.Font.GothamBold,
	})

	-- Balance display
	local balanceLabel = createTextLabel(mainPanel, {
		Size = UDim2.new(1, -20, 0, 25),
		Position = UDim2.new(0, 10, 0, 45),
		Text = "MolCoins: 0",
		TextColor3 = COLORS.gold,
		TextXAlignment = Enum.TextXAlignment.Left,
		Font = Enum.Font.Gotham,
		TextScaled = true,
	})

	-- Facility selection buttons
	local buttonContainer = Instance.new("Frame")
	buttonContainer.Size = UDim2.new(1, -20, 1, -90)
	buttonContainer.Position = UDim2.new(0, 10, 0, 75)
	buttonContainer.BackgroundTransparency = 1
	buttonContainer.Parent = mainPanel

	local gridLayout = Instance.new("UIGridLayout")
	gridLayout.CellSize = UDim2.new(1, 0, 0, 70)
	gridLayout.FillDirection = Enum.FillDirection.Vertical
	gridLayout.HorizontalAlignment = Enum.HorizontalAlignment.Fill
	gridLayout.Padding = UDim.new(0, 8)
	gridLayout.Parent = buttonContainer

	-- Create buttons for each facility type
	for _, facility in ipairs(FACILITIES) do
		local btn = Instance.new("TextButton")
		btn.Name = facility.type
		btn.BackgroundColor3 = facility.color
		btn.BackgroundTransparency = 0.3
		btn.Text = facility.name .. " - " .. facility.cost .. " 💰"
		btn.TextColor3 = Color3.fromRGB(255, 255, 255)
		btn.TextScaled = true
		btn.Font = Enum.Font.GothamBold
		btn.BorderSizePixel = 0
		btn.Parent = buttonContainer
		createCorner(btn, 6)

		-- Add description
		local desc = createTextLabel(btn, {
			Size = UDim2.new(1, 0, 0.3, 0),
			Position = UDim2.new(0, 0, 0.5, 0),
			Text = facility.desc,
			TextColor3 = Color3.fromRGB(200, 200, 200),
			TextScaled = true,
			Font = Enum.Font.Gotham,
			BackgroundTransparency = 1,
		})

		-- Button click handler
		btn.MouseButton1Click:Connect(function()
			selectedFacility = facility.type
			isBuilding = true
			builderGui.Enabled = false
			mouse.Icon = "rbxasset://textures/Cursors/MouseLockedCursor.png"
			print("[FacilityBuilder] Building mode: " .. facility.type)
		end)
	end

	-- Update balance
	task.spawn(function()
		while builderGui do
			task.wait(1)
			local GetPlayerData = ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("GetPlayerData")
			local success, data = pcall(function()
				return GetPlayerData:InvokeServer()
			end)
			if success and data then
				playerMolCoins = data.molCoins or 0
				balanceLabel.Text = "MolCoins: " .. tostring(playerMolCoins)
			end
			task.wait(2)
		end
	end)

	return builderGui
end

-- ══════════════════════════════════════════════
-- PLACEMENT MODE (mouse tracking)
-- ══════════════════════════════════════════════

local function startPlacementMode()
	print("[FacilityBuilder] Placement mode active — click to place, ESC to cancel")

	-- Show preview while mouse moves
	RunService.RenderStepped:Connect(function()
		if not isBuilding or not selectedFacility then return end

		-- Cast ray from camera through mouse to ground
		local unitRay = mouse.UnitRay
		local rayOrigin = unitRay.Origin
		local rayDirection = unitRay.Direction
		local rayLength = 1000

		local raycastParams = RaycastParams.new()
		raycastParams.FilterType = Enum.RaycastFilterType.Blacklist
		raycastParams.FilterDescendantsInstances = {player.Character}

		local rayResult = Workspace:Raycast(rayOrigin, rayDirection * rayLength, raycastParams)

		-- Update mouse cursor feedback
		if rayResult then
			local hitPos = rayResult.Position
			mouse.Icon = "rbxasset://textures/Cursors/PointingHand.png"
		else
			mouse.Icon = "rbxasset://textures/Cursors/MouseLockedCursor.png"
		end
	end)

	-- Click to place
	mouse.Button1Down:Connect(function()
		if not isBuilding or not selectedFacility then return end

		-- Get placement position
		local unitRay = mouse.UnitRay
		local rayOrigin = unitRay.Origin
		local rayDirection = unitRay.Direction
		local rayLength = 1000

		local raycastParams = RaycastParams.new()
		raycastParams.FilterType = Enum.RaycastFilterType.Blacklist
		raycastParams.FilterDescendantsInstances = {player.Character}

		local rayResult = Workspace:Raycast(rayOrigin, rayDirection * rayLength, raycastParams)

		if rayResult then
			local hitPos = rayResult.Position + Vector3.new(0, 3, 0)  -- Offset above ground

			-- Request build from server
			Remotes.FireServer("RequestBuildFacility", selectedFacility, {
				X = hitPos.X,
				Y = hitPos.Y,
				Z = hitPos.Z,
			})

			-- Exit building mode
			isBuilding = false
			selectedFacility = nil
			mouse.Icon = ""
			print("[FacilityBuilder] Facility placed!")
		end
	end)

	-- ESC to cancel
	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then return end
		if input.KeyCode == Enum.KeyCode.Escape then
			if isBuilding then
				isBuilding = false
				selectedFacility = nil
				mouse.Icon = ""
				print("[FacilityBuilder] Placement cancelled")
			end
		end
	end)
end

-- ══════════════════════════════════════════════
-- KEYBOARD SHORTCUTS
-- ══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	-- D = Toggle Facility Builder
	if input.KeyCode == Enum.KeyCode.D then
		if not builderGui then
			createBuilderUI()
		end
		builderGui.Enabled = not builderGui.Enabled
	end
end)

-- ══════════════════════════════════════════════
-- EVENT LISTENERS
-- ══════════════════════════════════════════════

Remotes.FacilityBuilt.OnClientEvent:Connect(function(data)
	print("[FacilityBuilder] Facility built:", data.type, "at", data.position)
	-- TODO: Show celebration popup
end)

-- ══════════════════════════════════════════════
-- INITIALIZATION
-- ══════════════════════════════════════════════

createBuilderUI()
startPlacementMode()

print("[FacilityBuilder] Loaded — Press D to build facilities")
