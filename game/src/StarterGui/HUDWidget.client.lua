--[[
	HUDWidget.client.lua
	MOLGANG Quick Stats HUD Widget

	Displays on top-right corner:
	- Current MolCoins (live-updated)
	- Day counter
	- Atoms & molecules count
	- Elements discovered progress
	- Quick action buttons
	- Zone indicator

	Subscribes to all relevant server events for real-time updates.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local GetPlayerData = Remotes:WaitForChild("GetPlayerData")

local function findScreenGui(name)
	for _, child in ipairs(playerGui:GetChildren()) do
		if child.Name == name and child:IsA("ScreenGui") then return child end
	end
	return nil
end

-- Wait for remotes
local PlayerDataLoaded = Remotes:WaitForChild("PlayerDataLoaded")
local AtomCollected = Remotes:WaitForChild("AtomCollected")
local MoleculeBuilt = Remotes:WaitForChild("MoleculeBuilt")
local DayAdvanced = Remotes:WaitForChild("DayAdvanced")
local FacilityBuilt = Remotes:WaitForChild("FacilityBuilt")
local DailyClaimResult = Remotes:WaitForChild("DailyClaimResult")
local MarketTrade = Remotes:WaitForChild("MarketTrade")

local COLORS = {
	background    = Color3.fromRGB(12, 14, 24),
	panel         = Color3.fromRGB(20, 24, 38),
	accent        = Color3.fromRGB(0, 220, 130),
	accentDim     = Color3.fromRGB(0, 140, 80),
	gold          = Color3.fromRGB(255, 215, 0),
	textPrimary   = Color3.fromRGB(235, 238, 248),
	textSecondary = Color3.fromRGB(140, 148, 175),
	progressBg    = Color3.fromRGB(35, 38, 52),
	zoneBadge     = Color3.fromRGB(30, 35, 50),
}

-- ═══════════════════════════════════════════════
-- GUI CREATION
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "HUDWidget"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 8
screenGui.Parent = playerGui

-- Widget panel (top-right, compact)
local widget = Instance.new("Frame")
widget.Name = "Widget"
widget.Size = UDim2.new(0, 240, 0, 232)
widget.Position = UDim2.new(1, -250, 0, 10)
widget.BackgroundColor3 = COLORS.panel
widget.BackgroundTransparency = 0.12
widget.BorderSizePixel = 0
widget.Parent = screenGui

local wCorner = Instance.new("UICorner")
wCorner.CornerRadius = UDim.new(0, 10)
wCorner.Parent = widget

local wStroke = Instance.new("UIStroke")
wStroke.Color = COLORS.accentDim
wStroke.Thickness = 1
wStroke.Transparency = 0.5
wStroke.Parent = widget

-- ── MolCoins (prominent) ──

local molcoinsLabel = Instance.new("TextLabel")
molcoinsLabel.Name = "MolCoins"
molcoinsLabel.Size = UDim2.new(1, -16, 0, 28)
molcoinsLabel.Position = UDim2.new(0, 8, 0, 8)
molcoinsLabel.BackgroundTransparency = 1
molcoinsLabel.Text = "0 MolCoins"
molcoinsLabel.TextColor3 = COLORS.gold
molcoinsLabel.TextScaled = true
molcoinsLabel.Font = Enum.Font.GothamBold
molcoinsLabel.TextXAlignment = Enum.TextXAlignment.Left
molcoinsLabel.Parent = widget

-- ── Day counter ──

local dayLabel = Instance.new("TextLabel")
dayLabel.Name = "Day"
dayLabel.Size = UDim2.new(0.5, -8, 0, 20)
dayLabel.Position = UDim2.new(0, 8, 0, 38)
dayLabel.BackgroundTransparency = 1
dayLabel.Text = "Day 1"
dayLabel.TextColor3 = COLORS.textSecondary
dayLabel.TextScaled = true
dayLabel.Font = Enum.Font.Gotham
dayLabel.TextXAlignment = Enum.TextXAlignment.Left
dayLabel.Parent = widget

-- ── Zone indicator ──

local zoneBadge = Instance.new("TextLabel")
zoneBadge.Name = "Zone"
zoneBadge.Size = UDim2.new(0.5, -8, 0, 20)
zoneBadge.Position = UDim2.new(0.5, 0, 0, 38)
zoneBadge.BackgroundColor3 = COLORS.zoneBadge
zoneBadge.BackgroundTransparency = 0.4
zoneBadge.Text = "Nexus Hub"
zoneBadge.TextColor3 = COLORS.accent
zoneBadge.TextScaled = true
zoneBadge.Font = Enum.Font.Gotham
zoneBadge.TextXAlignment = Enum.TextXAlignment.Center
zoneBadge.Parent = widget
local zbCorner = Instance.new("UICorner")
zbCorner.CornerRadius = UDim.new(0, 4)
zbCorner.Parent = zoneBadge

-- ── Divider ──

local divider = Instance.new("Frame")
divider.Size = UDim2.new(1, -16, 0, 1)
divider.Position = UDim2.new(0, 8, 0, 62)
divider.BackgroundColor3 = COLORS.accentDim
divider.BackgroundTransparency = 0.6
divider.BorderSizePixel = 0
divider.Parent = widget

-- ── Stats row: Atoms | Molecules ──

local atomsLabel = Instance.new("TextLabel")
atomsLabel.Name = "Atoms"
atomsLabel.Size = UDim2.new(0.5, -8, 0, 22)
atomsLabel.Position = UDim2.new(0, 8, 0, 68)
atomsLabel.BackgroundTransparency = 1
atomsLabel.Text = "Atoms: 0"
atomsLabel.TextColor3 = COLORS.textPrimary
atomsLabel.TextScaled = true
atomsLabel.Font = Enum.Font.Gotham
atomsLabel.TextXAlignment = Enum.TextXAlignment.Left
atomsLabel.Parent = widget

local molsLabel = Instance.new("TextLabel")
molsLabel.Name = "Mols"
molsLabel.Size = UDim2.new(0.5, -8, 0, 22)
molsLabel.Position = UDim2.new(0.5, 0, 0, 68)
molsLabel.BackgroundTransparency = 1
molsLabel.Text = "Mols: 0"
molsLabel.TextColor3 = COLORS.textPrimary
molsLabel.TextScaled = true
molsLabel.Font = Enum.Font.Gotham
molsLabel.TextXAlignment = Enum.TextXAlignment.Left
molsLabel.Parent = widget

-- ── Production status (#32) ──

local prodLabel = Instance.new("TextLabel")
prodLabel.Name = "Production"
prodLabel.Size = UDim2.new(1, -16, 0, 16)
prodLabel.Position = UDim2.new(0, 8, 0, 92)
prodLabel.BackgroundTransparency = 1
prodLabel.Text = "Production: idle"
prodLabel.TextColor3 = COLORS.textSecondary
prodLabel.TextScaled = true
prodLabel.Font = Enum.Font.Gotham
prodLabel.TextXAlignment = Enum.TextXAlignment.Left
prodLabel.Parent = widget

-- ── Elements discovery progress bar ──

local elemLabel = Instance.new("TextLabel")
elemLabel.Size = UDim2.new(1, -16, 0, 18)
elemLabel.Position = UDim2.new(0, 8, 0, 110)
elemLabel.BackgroundTransparency = 1
elemLabel.Text = "Elements: 0/118"
elemLabel.TextColor3 = COLORS.textSecondary
elemLabel.TextScaled = true
elemLabel.Font = Enum.Font.Gotham
elemLabel.TextXAlignment = Enum.TextXAlignment.Left
elemLabel.Parent = widget

local progressBg = Instance.new("Frame")
progressBg.Size = UDim2.new(1, -16, 0, 6)
progressBg.Position = UDim2.new(0, 8, 0, 128)
progressBg.BackgroundColor3 = COLORS.progressBg
progressBg.BorderSizePixel = 0
progressBg.Parent = widget
local pbCorner = Instance.new("UICorner")
pbCorner.CornerRadius = UDim.new(1, 0)
pbCorner.Parent = progressBg

local progressFill = Instance.new("Frame")
progressFill.Size = UDim2.new(0, 0, 1, 0)
progressFill.BackgroundColor3 = COLORS.accent
progressFill.BorderSizePixel = 0
progressFill.Parent = progressBg
local pfCorner = Instance.new("UICorner")
pfCorner.CornerRadius = UDim.new(1, 0)
pfCorner.Parent = progressFill

-- ── Quick action buttons ──

-- ── Daily claim indicator ──

local claimLabel = Instance.new("TextLabel")
claimLabel.Name = "DailyClaim"
claimLabel.Size = UDim2.new(1, -16, 0, 16)
claimLabel.Position = UDim2.new(0, 8, 0, 138)
claimLabel.BackgroundTransparency = 1
claimLabel.Text = "Daily: Ready!"
claimLabel.TextColor3 = COLORS.accent
claimLabel.TextScaled = true
claimLabel.Font = Enum.Font.Gotham
claimLabel.TextXAlignment = Enum.TextXAlignment.Left
claimLabel.Parent = widget

local btnFrame = Instance.new("Frame")
btnFrame.Size = UDim2.new(1, -16, 0, 28)
btnFrame.Position = UDim2.new(0, 8, 0, 156)
btnFrame.BackgroundTransparency = 1
btnFrame.Parent = widget

local btnLayout = Instance.new("UIListLayout")
btnLayout.FillDirection = Enum.FillDirection.Horizontal
btnLayout.Padding = UDim.new(0, 6)
btnLayout.Parent = btnFrame

local function createQuickBtn(text, color, guiTarget)
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(0, 70, 1, 0)
	btn.BackgroundColor3 = color
	btn.BackgroundTransparency = 0.3
	btn.TextColor3 = Color3.fromRGB(255, 255, 255)
	btn.Text = text
	btn.Font = Enum.Font.GothamBold
	btn.TextScaled = true
	btn.Active = true
	btn.Selectable = true
	btn.ZIndex = 20
	btn.Parent = btnFrame
	local bCorner = Instance.new("UICorner")
	bCorner.CornerRadius = UDim.new(0, 4)
	bCorner.Parent = btn
	local lastToggle = 0
	local function toggleTarget()
		local now = os.clock()
		if now - lastToggle < 0.15 then return end
		lastToggle = now
		local gui = findScreenGui(guiTarget)
		if gui then
			gui.Enabled = not gui.Enabled
		end
	end
	btn.Activated:Connect(toggleTarget)
	-- Wine/Studio embedded surfaces can swallow GuiButton.Activated while
	-- still delivering UserInputService events. Hit-test the visible control
	-- explicitly so the HUD remains mouse-usable.
	UserInputService.InputBegan:Connect(function(input)
		if input.UserInputType ~= Enum.UserInputType.MouseButton1 then return end
		local point = input.Position
		local topLeft = btn.AbsolutePosition
		local bottomRight = topLeft + btn.AbsoluteSize
		if point.X >= topLeft.X and point.X <= bottomRight.X
			and point.Y >= topLeft.Y and point.Y <= bottomRight.Y then
			toggleTarget()
		end
	end)
	return btn
end

createQuickBtn("P Table", COLORS.accent, "PeriodicTableGui")
createQuickBtn("Dash", Color3.fromRGB(80, 150, 255), "DashboardGui")
-- The quick action should open the full quest modal, not the always-on compact
-- tracker shell. Using QuestTrackerGui here made the HUD button look alive
-- while leaving the real quest menu inaccessible from the shortcut lane.
createQuickBtn("Quests", Color3.fromRGB(200, 140, 50), "QuestModal")

-- ── Save indicator (#76) ──

local saveLabel = Instance.new("TextLabel")
saveLabel.Size = UDim2.new(1, -16, 0, 14)
saveLabel.Position = UDim2.new(0, 8, 1, -34)
saveLabel.BackgroundTransparency = 1
saveLabel.Text = "Saved"
saveLabel.TextColor3 = Color3.fromRGB(60, 120, 60)
saveLabel.TextScaled = true
saveLabel.Font = Enum.Font.Gotham
saveLabel.TextXAlignment = Enum.TextXAlignment.Center
saveLabel.TextTransparency = 0.5
saveLabel.Parent = widget

-- Flash "Saving..." periodically
task.spawn(function()
	while true do
		task.wait(30)
		saveLabel.Text = "Saving..."
		saveLabel.TextColor3 = Color3.fromRGB(200, 200, 100)
		saveLabel.TextTransparency = 0
		task.wait(1.5)
		saveLabel.Text = "Saved"
		saveLabel.TextColor3 = Color3.fromRGB(60, 120, 60)
		saveLabel.TextTransparency = 0.5
	end
end)

-- ── OTAP test version badge ──

local versionLabel = Instance.new("TextLabel")
versionLabel.Size = UDim2.new(1, -16, 0, 16)
versionLabel.Position = UDim2.new(0, 8, 1, -18)
versionLabel.BackgroundTransparency = 1
versionLabel.Text = "MOLGANG OTAP Teststraat"
versionLabel.TextColor3 = Color3.fromRGB(70, 75, 90)
versionLabel.TextScaled = true
versionLabel.Font = Enum.Font.Gotham
versionLabel.TextXAlignment = Enum.TextXAlignment.Center
versionLabel.Parent = widget

-- ═══════════════════════════════════════════════
-- STATE & UPDATE LOGIC
-- ═══════════════════════════════════════════════

local playerData = nil
local activeWorldEffects = {}

local function countTable(t)
	local n = 0
	if t then
		for _, v in pairs(t) do
			n = n + (type(v) == "number" and v or 1)
		end
	end
	return n
end

local function countKeys(t)
	local n = 0
	if t then
		for _ in pairs(t) do n = n + 1 end
	end
	return n
end

local lastCoinValue = 0

local function refreshHUD()
	if not playerData then return end

	-- MolCoins with pulse animation on change
	local coins = playerData.molCoins or 0
	molcoinsLabel.Text = tostring(coins) .. " MolCoins"

	if coins ~= lastCoinValue and lastCoinValue > 0 then
		-- Pulse green on gain, red on spend
		local gained = coins > lastCoinValue
		molcoinsLabel.TextColor3 = gained and Color3.fromRGB(0, 255, 130) or Color3.fromRGB(255, 100, 80)
		TweenService:Create(molcoinsLabel, TweenInfo.new(0.15), {
			TextSize = 22,
		}):Play()
		task.delay(0.15, function()
			TweenService:Create(molcoinsLabel, TweenInfo.new(0.3), {
				TextSize = 18,
			}):Play()
			TweenService:Create(molcoinsLabel, TweenInfo.new(0.5), {
				TextColor3 = COLORS.gold,
			}):Play()
		end)
	end
	lastCoinValue = coins

	-- Day
	dayLabel.Text = "Day " .. (playerData.day or 1)

	-- Atoms total
	local atomCount = countTable(playerData.atoms)
	atomsLabel.Text = "Atoms: " .. atomCount

	-- Molecules total
	local molCount = countTable(playerData.molecules)
	molsLabel.Text = "Mols: " .. molCount

	-- Production status (#32)
	if playerData.facilities then
		local fac = playerData.facilities
		local totalFac = (fac.mines or 0) + (fac.factories or 0) + (fac.researchLabs or 0) + (fac.offices or 0)
		if totalFac > 0 then
			local baseOutdoorAtoms = (fac.starterBenches or 0) * 3 + (fac.mines or 0) * 10
			local weatherPenalty = math.clamp(tonumber(player:GetAttribute("OutdoorPenalty")) or 1, 0, 1)
			local speedMultiplier = math.max(0, tonumber(activeWorldEffects.productionSpeedMult) or 1)
			local outdoorAtoms = baseOutdoorAtoms * weatherPenalty * speedMultiplier
			local factoryMolecules = (fac.factories or 0) * 5 * speedMultiplier
			prodLabel.Text = string.format("Prod: %.1f atoms/min | %.1f mol/120s", outdoorAtoms, factoryMolecules)
			prodLabel.TextColor3 = COLORS.accent
		else
			prodLabel.Text = "Production: Buy a Starter Bench!"
			prodLabel.TextColor3 = Color3.fromRGB(200, 160, 60)
		end
	end

	-- Elements discovered
	local elemCount = countKeys(playerData.elementsFound)
	elemLabel.Text = "Elements: " .. elemCount .. "/118"

	-- Progress bar
	local progress = math.clamp(elemCount / 118, 0, 1)
	TweenService:Create(progressFill, TweenInfo.new(0.3), {
		Size = UDim2.new(progress, 0, 1, 0),
	}):Play()
end

-- ═══════════════════════════════════════════════
-- EVENT SUBSCRIPTIONS (real-time updates)
-- ═══════════════════════════════════════════════

-- Initial data load
PlayerDataLoaded.OnClientEvent:Connect(function(data)
	playerData = data
	refreshHUD()
end)

-- PlayerDataLoaded is a one-shot event and can precede this script under
-- Studio/Wine startup. Fetch a server-owned snapshot until the HUD is ready.
task.spawn(function()
	for _ = 1, 10 do
		if playerData then return end
		local ok, data = pcall(function()
			return GetPlayerData:InvokeServer()
		end)
		if ok and type(data) == "table" then
			playerData = data
			refreshHUD()
			return
		end
		task.wait(0.5)
	end
end)

-- Atom collected: update atoms + elements + molcoins
AtomCollected.OnClientEvent:Connect(function(data)
	if not playerData then return end

	-- Update local data
	local sym = data.symbol
	if sym then
		if not playerData.atoms[sym] then
			playerData.atoms[sym] = 0
		end
		playerData.atoms[sym] = playerData.atoms[sym] + 1
	end

	if data.elementZ then
		playerData.elementsFound[tostring(data.elementZ)] = true
	end

	if data.coinReward then
		playerData.molCoins = (playerData.molCoins or 0) + data.coinReward
	end

	playerData.totalAtomsCollected = (playerData.totalAtomsCollected or 0) + 1
	refreshHUD()

	-- Flash MolCoins gold on collect
	TweenService:Create(molcoinsLabel, TweenInfo.new(0.1), {TextColor3 = Color3.fromRGB(255, 255, 150)}):Play()
	task.delay(0.2, function()
		TweenService:Create(molcoinsLabel, TweenInfo.new(0.3), {TextColor3 = COLORS.gold}):Play()
	end)
end)

-- Molecule built
MoleculeBuilt.OnClientEvent:Connect(function(data)
	if not playerData then return end
	local molName = data.name or data.molName
	if molName then
		if not playerData.molecules[molName] then
			playerData.molecules[molName] = 0
		end
		playerData.molecules[molName] = playerData.molecules[molName] + 1
	end
	refreshHUD()
end)

-- Day advanced
DayAdvanced.OnClientEvent:Connect(function(data)
	if playerData and data.newDay then
		playerData.day = data.newDay
		refreshHUD()
	end
end)

-- Facility built (deducts molcoins)
FacilityBuilt.OnClientEvent:Connect(function(data)
	if playerData and data.newBalance then
		playerData.molCoins = data.newBalance
		refreshHUD()
	end
end)

-- Daily claim
DailyClaimResult.OnClientEvent:Connect(function(data)
	if playerData and data.success and data.amount then
		playerData.molCoins = (playerData.molCoins or 0) + data.amount
		playerData.lastDailyClaim = os.time()
		claimLabel.Text = "Daily: Claimed! +200 MC"
		claimLabel.TextColor3 = COLORS.gold
		refreshHUD()
	elseif data and not data.success then
		claimLabel.Text = "Daily: " .. (data.reason or "Already claimed")
		claimLabel.TextColor3 = Color3.fromRGB(100, 110, 130)
	end
end)

-- Market trade
MarketTrade.OnClientEvent:Connect(function(data)
	if playerData and data.newBalance then
		playerData.molCoins = data.newBalance
		refreshHUD()
	end
end)

-- Zone update
player:GetAttributeChangedSignal("CurrentZone"):Connect(function()
	local zone = player:GetAttribute("CurrentZone") or "hub"
	local zoneNames = {
		hub = "Nexus Hub",
		quantum = "Quantum Lab",
		factory = "Slakkenspoor",
		biome = "Periodic Biome",
		space = "Deep Space",
	}
	zoneBadge.Text = zoneNames[zone] or zone
end)

player:GetAttributeChangedSignal("OutdoorPenalty"):Connect(refreshHUD)

if Remotes:FindFirstChild("WorldEffectsUpdate") then
	Remotes.WorldEffectsUpdate.OnClientEvent:Connect(function(data)
		activeWorldEffects = (data and data.effects) or {}
		refreshHUD()
	end)
end

print("[MOLGANG] HUD Widget loaded — real-time stats active")
