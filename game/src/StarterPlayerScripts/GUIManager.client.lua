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
	QuestModal = false,
	RecipeBookGui = false,
	SettingsGui = false,
	SlagProcessingGui = false,
	BubbleTeaGui = false,
	FertilizerGui = false,
	FactoryBuilderGui = false,
	ProcessControlGui = false,
	ResearchGui = false,
	MiningGui = false,
	ProductMarketGui = false,
	AtomTradeGui = false,
	GuildGui = false,
	QuizGui = false,
	TutorialGui = false,
	SuperheroGui = false,
	QuantumRacingGui = false,
	MarketBiddingGui = false,
	FeedbackGui = false,
	MahjongGui = false,
	MiniGameGui = false,
	ConfirmRemove = false,
	CostWarning = false,
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

local function findScreenGui(guiName)
	for _, child in ipairs(playerGui:GetChildren()) do
		if child.Name == guiName and child:IsA("ScreenGui") then
			return child
		end
	end
	return nil
end

-- Cost hints for expensive GUIs (#7)
local GUI_COST_HINTS = {
	FactoryBuilderGui = {cost = 2000, hint = "Factory rental costs 2000 MC/month"},
	MiningGui = {cost = 800, hint = "Exploration licenses start at 800 MC"},
	SlagProcessingGui = {cost = 50, hint = "Raw slag costs 50 MC per batch"},
}

local closeOtherOverlays

local function toggleGui(guiName)
	local gui = findScreenGui(guiName)
	if gui then
		local shouldEnable = not gui.Enabled
		if shouldEnable then
			closeOtherOverlays(guiName)
		end
		gui.Enabled = shouldEnable
		guiStates[guiName] = gui.Enabled
		playSound(gui.Enabled and "ui_open" or "ui_close")
		-- Cost warning when opening expensive GUIs (#7)
		if gui.Enabled and playerData and GUI_COST_HINTS[guiName] then
			local hint = GUI_COST_HINTS[guiName]
			if playerData.molCoins < hint.cost then
					task.defer(function()
						local warnGui = Instance.new("ScreenGui")
						warnGui.Name = "CostWarning"
						warnGui.IgnoreGuiInset = true
						warnGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
						warnGui.DisplayOrder = 93
						warnGui.Parent = playerGui
					local wl = Instance.new("TextLabel")
					wl.Size = UDim2.new(0.4, 0, 0, 24)
					wl.Position = UDim2.new(0.3, 0, 0.12, 0)
					wl.BackgroundColor3 = Color3.fromRGB(60, 20, 10)
					wl.BackgroundTransparency = 0.2
					wl.Text = "  " .. hint.hint .. " (You have " .. playerData.molCoins .. " MC)"
					wl.TextColor3 = Color3.fromRGB(255, 180, 80)
					wl.TextScaled = true
					wl.Font = Enum.Font.GothamBold
					wl.Parent = warnGui
					task.delay(4, function() warnGui:Destroy() end)
				end)
			end
		end
		return gui.Enabled
	end
	return false
end

local function closeAllOverlays()
	for guiName, _ in pairs(guiStates) do
		local gui = findScreenGui(guiName)
		if gui and gui.Enabled then
			gui.Enabled = false
			guiStates[guiName] = false
		end
	end
	playSound("ui_close")
end

closeOtherOverlays = function(exceptName)
	for guiName, _ in pairs(guiStates) do
		if guiName ~= exceptName then
			local gui = findScreenGui(guiName)
			if gui and gui.Enabled then
				gui.Enabled = false
				guiStates[guiName] = false
			end
		end
	end
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
		toggleGui("QuestModal")
	end

	-- R = Toggle Recipe Book
	if input.KeyCode == Enum.KeyCode.R then
		local factoryGui = findScreenGui("FactoryBuilderGui")
		if not (factoryGui and factoryGui.Enabled) then
			toggleGui("RecipeBookGui")
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

	-- C = Toggle Process Control Panel
	if input.KeyCode == Enum.KeyCode.C then
		toggleGui("ProcessControlGui")
	end

	-- T = Toggle Research Tree
	if input.KeyCode == Enum.KeyCode.T then
		toggleGui("ResearchGui")
	end

	-- V = Toggle Mining (Vanadium)
	if input.KeyCode == Enum.KeyCode.V then
		toggleGui("MiningGui")
	end

	-- X = Toggle Product Exchange
	if input.KeyCode == Enum.KeyCode.X then
		local factoryGui = findScreenGui("FactoryBuilderGui")
		if not (factoryGui and factoryGui.Enabled) then
			toggleGui("ProductMarketGui")
		end
	end

	-- / or Slash = Toggle Settings
	if input.KeyCode == Enum.KeyCode.Slash then
		toggleGui("SettingsGui")
	end

	-- . (Period) = Toggle Atom Trading (#71)
	if input.KeyCode == Enum.KeyCode.Period then
		toggleGui("AtomTradeGui")
	end

	-- ; (Semicolon) = Toggle Guild
	if input.KeyCode == Enum.KeyCode.Semicolon then
		toggleGui("GuildGui")
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

local firstAtomHintShown = false
Remotes.AtomCollected.OnClientEvent:Connect(function(data)
	if data.isQuantumDot then
		playSound("quantum_catch")
	else
		playSound("atom_collect")
	end
	-- Quest hint after first atom (#17)
	if not firstAtomHintShown then
		firstAtomHintShown = true
		task.delay(2, function()
			local hg = Instance.new("ScreenGui")
			hg.Name = "QuestHint"; hg.Parent = playerGui
			local hl = Instance.new("TextLabel")
			hl.Size = UDim2.new(0.5, 0, 0, 28)
			hl.Position = UDim2.new(0.25, 0, 0.18, 0)
			hl.BackgroundColor3 = Color3.fromRGB(20, 10, 50)
			hl.BackgroundTransparency = 0.15
			hl.Text = "  Press Q to open Quest Log — complete quests to earn MolCoins!"
			hl.TextColor3 = Color3.fromRGB(180, 140, 255)
			hl.TextScaled = true
			hl.Font = Enum.Font.GothamBold
			hl.Parent = hg
			task.delay(6, function() hg:Destroy() end)
		end)
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
	-- Play quest_complete sound for quest announcements (#35)
	if type(data) == "table" and data.message and string.find(data.message, "QUEST COMPLETE") then
		playSound("quest_complete")
	end
end)

-- Start ambient
task.delay(2, function()
	updateAmbientMusic()
end)

print("[MOLGANG] GUIManager client initialized — all shortcuts active")
