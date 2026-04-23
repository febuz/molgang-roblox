-- StarterPlayerScripts/GUIManager.client.lua
-- Central GUI manager for MOLGANG
-- Handles all keyboard shortcuts, audio feedback, zone-based ambience
-- Manages GUI toggle states and coordination

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local playerData = nil
local currentZone = "hub"

-- Track which GUI panels are open (for ESC close-all)
local guiStates = {
	PeriodicTableGui = false,
	WalletGui = false,
	DashboardGui = false,
	InventoryGui = false,
	AchievementsGui = false,
	LeaderboardGui = false,
	QuestTrackerGui = false,
	RecipeBookGui = false,
	SettingsGui = false,
	SlagProcessingGui = false,
	BubbleTeaGui = false,
	FertilizerGui = false,
	FactoryBuilderGui = false,
}

-- ══════════════════════════════════════════════
-- WAIT FOR INITIAL DATA
-- ══════════════════════════════════════════════

Remotes.PlayerDataLoaded.OnClientEvent:Connect(function(data)
	playerData = data
	print("[GUIManager] Player data loaded - MolCoins:", data.molCoins)
end)

-- ══════════════════════════════════════════════
-- GUI TOGGLE HELPER
-- ══════════════════════════════════════════════

local function toggleGui(guiName)
	local gui = playerGui:FindFirstChild(guiName)
	if gui then
		gui.Enabled = not gui.Enabled
		guiStates[guiName] = gui.Enabled
		playSound(gui.Enabled and "ui_open" or "ui_close")
		return gui.Enabled
	end
	return false
end

local function closeAllOverlays()
	for guiName, _ in pairs(guiStates) do
		local gui = playerGui:FindFirstChild(guiName)
		if gui and gui.Enabled then
			gui.Enabled = false
			guiStates[guiName] = false
		end
	end
	playSound("ui_close")
end

-- ══════════════════════════════════════════════
-- KEYBOARD SHORTCUTS
-- ══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	-- P = Toggle Periodic Table
	if input.KeyCode == Enum.KeyCode.P then
		toggleGui("PeriodicTableGui")
	end

	-- Tab = Toggle Wallet
	if input.KeyCode == Enum.KeyCode.Tab then
		toggleGui("WalletGui")
	end

	-- D = Toggle Dashboard
	if input.KeyCode == Enum.KeyCode.D then
		toggleGui("DashboardGui")
	end

	-- I = Toggle Inventory
	if input.KeyCode == Enum.KeyCode.I then
		toggleGui("InventoryGui")
	end

	-- A = Toggle Achievements
	if input.KeyCode == Enum.KeyCode.A then
		toggleGui("AchievementsGui")
	end

	-- L = Toggle Leaderboards
	if input.KeyCode == Enum.KeyCode.L then
		toggleGui("LeaderboardGui")
	end

	-- Q = Toggle Quest Tracker
	if input.KeyCode == Enum.KeyCode.Q then
		toggleGui("QuestTrackerGui")
	end

	-- R = Toggle Recipe Book
	if input.KeyCode == Enum.KeyCode.R then
		toggleGui("RecipeBookGui")
	end

	-- M = Toggle Minimap (HUD element)
	if input.KeyCode == Enum.KeyCode.M then
		local hudGui = playerGui:FindFirstChild("HUDGui")
		if hudGui then
			local minimap = hudGui:FindFirstChild("MiniMap")
			if minimap then
				minimap.Visible = not minimap.Visible
			end
		end
	end

	-- S = Toggle Slag Processing
	if input.KeyCode == Enum.KeyCode.S then
		toggleGui("SlagProcessingGui")
	end

	-- B = Toggle Bubble Tea Bar
	if input.KeyCode == Enum.KeyCode.B then
		toggleGui("BubbleTeaGui")
	end

	-- F = Toggle Fertilizer Lab
	if input.KeyCode == Enum.KeyCode.F then
		toggleGui("FertilizerGui")
	end

	-- G = Toggle Factory Builder (Entrepreneur)
	if input.KeyCode == Enum.KeyCode.G then
		toggleGui("FactoryBuilderGui")
	end

	-- / or Slash = Toggle Settings
	if input.KeyCode == Enum.KeyCode.Slash then
		toggleGui("SettingsGui")
	end

	-- ESC = Close all overlays
	if input.KeyCode == Enum.KeyCode.Escape then
		closeAllOverlays()
	end
end)

-- ══════════════════════════════════════════════
-- SOUND PLAYBACK
-- ══════════════════════════════════════════════

function playSound(name)
	local sound = SoundService:FindFirstChild(name)
	if sound then
		local clone = sound:Clone()
		clone.Parent = SoundService
		clone:Play()
		clone.Ended:Connect(function()
			clone:Destroy()
		end)
	end
end

-- ══════════════════════════════════════════════
-- ZONE-BASED AMBIENT MUSIC
-- ══════════════════════════════════════════════

local currentAmbient = nil

local function updateAmbientMusic()
	local zone = player:GetAttribute("CurrentZone") or "hub"
	if zone == currentZone then return end
	currentZone = zone

	-- Fade out current ambient
	if currentAmbient then
		local fadeOut = TweenService:Create(currentAmbient, TweenInfo.new(2), {Volume = 0})
		fadeOut:Play()
		fadeOut.Completed:Connect(function()
			currentAmbient:Stop()
		end)
	end

	-- Fade in new ambient
	local ambientName = "ambient_" .. zone
	local sound = SoundService:FindFirstChild(ambientName)
	if not sound then
		sound = SoundService:FindFirstChild("ambient_hub") -- fallback
	end

	if sound then
		currentAmbient = sound
		sound.Volume = 0
		sound:Play()
		TweenService:Create(sound, TweenInfo.new(3), {Volume = 0.3}):Play()
	end
end

player:GetAttributeChangedSignal("CurrentZone"):Connect(updateAmbientMusic)

-- ══════════════════════════════════════════════
-- EVENT LISTENERS FOR AUDIO FEEDBACK
-- ══════════════════════════════════════════════

Remotes.AtomCollected.OnClientEvent:Connect(function(data)
	if data.isQuantumDot then
		playSound("quantum_catch")
	else
		playSound("atom_collect")
	end
end)

Remotes.MoleculeBuilt.OnClientEvent:Connect(function(data)
	playSound("molecule_built")
end)

Remotes.ChainEntryAdded.OnClientEvent:Connect(function(data)
	playSound("chain_entry")
end)

Remotes.AchievementUnlocked.OnClientEvent:Connect(function(data)
	playSound("achievement")
	showAchievementBanner(data)
end)

Remotes.DailyClaimResult.OnClientEvent:Connect(function(data)
	if data.success then
		playSound("daily_claim")
	else
		playSound("error_sound")
	end
end)

-- ══════════════════════════════════════════════
-- ACHIEVEMENT BANNER
-- Slides in from left, stays 3 seconds, slides out
-- ══════════════════════════════════════════════

function showAchievementBanner(data)
	local gui = Instance.new("ScreenGui")
	gui.Name = "AchievementBanner"
	gui.Parent = playerGui

	local banner = Instance.new("Frame")
	banner.Size = UDim2.fromOffset(350, 80)
	banner.Position = UDim2.new(-0.3, 0, 0.15, 0)
	banner.BackgroundColor3 = Color3.fromRGB(10, 25, 15)
	banner.BackgroundTransparency = 0.1
	banner.BorderSizePixel = 0
	banner.Parent = gui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 10)
	corner.Parent = banner

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(255, 215, 0)
	stroke.Thickness = 2
	stroke.Parent = banner

	local uiGradient = Instance.new("UIGradient")
	uiGradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 215, 0)),
		ColorSequenceKeypoint.new(0.3, Color3.fromRGB(34, 197, 94)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(10, 25, 15)),
	})
	uiGradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.7),
		NumberSequenceKeypoint.new(1, 0.95),
	})
	uiGradient.Parent = banner

	-- Trophy icon
	local icon = Instance.new("TextLabel")
	icon.Size = UDim2.fromOffset(50, 50)
	icon.Position = UDim2.fromOffset(15, 15)
	icon.BackgroundTransparency = 1
	icon.Text = "T"  -- Trophy symbol placeholder
	icon.TextColor3 = Color3.fromRGB(255, 215, 0)
	icon.TextScaled = true
	icon.Font = Enum.Font.GothamBold
	icon.Parent = banner

	-- Achievement name
	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(0, 250, 0, 30)
	title.Position = UDim2.fromOffset(75, 10)
	title.BackgroundTransparency = 1
	title.Text = data.name or "Achievement"
	title.TextColor3 = Color3.fromRGB(255, 215, 0)
	title.TextScaled = true
	title.Font = Enum.Font.GothamBold
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Parent = banner

	-- Description
	local desc = Instance.new("TextLabel")
	desc.Size = UDim2.new(0, 250, 0, 30)
	desc.Position = UDim2.fromOffset(75, 42)
	desc.BackgroundTransparency = 1
	desc.Text = data.description or ""
	desc.TextColor3 = Color3.fromRGB(180, 210, 190)
	desc.TextScaled = true
	desc.Font = Enum.Font.Gotham
	desc.TextXAlignment = Enum.TextXAlignment.Left
	desc.Parent = banner

	-- Slide in
	TweenService:Create(banner, TweenInfo.new(0.5, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Position = UDim2.new(0, 20, 0.15, 0),
	}):Play()

	-- Slide out after 3 seconds
	task.delay(3, function()
		TweenService:Create(banner, TweenInfo.new(0.5, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			Position = UDim2.new(-0.3, 0, 0.15, 0),
		}):Play()
		task.delay(0.6, function()
			gui:Destroy()
		end)
	end)
end

-- ══════════════════════════════════════════════
-- SERVER ANNOUNCE TICKER
-- ══════════════════════════════════════════════

Remotes.ServerAnnounce.OnClientEvent:Connect(function(data)
	local gui = Instance.new("ScreenGui")
	gui.Name = "AnnounceTicker"
	gui.Parent = playerGui

	local rarityColors = {
		common = Color3.fromRGB(200, 200, 200),
		uncommon = Color3.fromRGB(100, 200, 100),
		rare = Color3.fromRGB(68, 136, 255),
		epic = Color3.fromRGB(180, 68, 255),
		legendary = Color3.fromRGB(255, 215, 0),
	}

	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 0, 30)
	label.Position = UDim2.new(0, 0, 0, 0)
	label.BackgroundColor3 = Color3.fromRGB(5, 10, 8)
	label.BackgroundTransparency = 0.3
	label.Text = "  " .. (data.message or "")
	label.TextColor3 = rarityColors[data.rarity] or Color3.fromRGB(200, 200, 200)
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Parent = gui

	-- Fade out after 5 seconds
	task.delay(5, function()
		TweenService:Create(label, TweenInfo.new(1), {
			BackgroundTransparency = 1,
			TextTransparency = 1,
		}):Play()
		task.delay(1.1, function()
			gui:Destroy()
		end)
	end)
end)

-- Start ambient
task.delay(2, function()
	updateAmbientMusic()
end)

print("[MOLGANG] GUIManager client initialized — all shortcuts active")
