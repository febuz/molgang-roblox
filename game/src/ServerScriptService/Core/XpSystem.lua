-- XpSystem.lua - Player experience (XP) management with café effect multipliers
-- Handles XP gain, level progression, and café-based boost effects

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local XpSystem = {}
XpSystem.__index = XpSystem

-- Configuration
local XP_PER_LEVEL = 100
local BASE_XP_VALUES = {
	quiz = 50,
	mining = 30,
	crafting = 40,
	racing = 25,
	puzzle = 60,
}

-- Café effect multipliers (classic drink = +5% XP)
local CAFE_EFFECTS = {
	["Classic Milk Tea"] = 1.05,
	["Mango Milk Tea"] = 1.0, -- Speed boost handled in RacingSystem
	["Jasmine Green Tea"] = 1.0, -- Focus boost handled in PuzzleSystem
}

-- Initialize XP data for a new player
function XpSystem.InitializePlayer(player)
	local playerData = ReplicatedStorage:WaitForChild("PlayerData"):FindFirstChild(player.Name)
	if not playerData then return end

	local xpData = playerData:FindFirstChild("XpData") or Instance.new("Folder")
	xpData.Name = "XpData"
	xpData.Parent = playerData

	if not xpData:FindFirstChild("CurrentXp") then
		Instance.new("IntValue").Name = "CurrentXp"
		Instance.new("IntValue").Name = "Level"
		Instance.new("IntValue").Name = "TotalXpEarned"

		xpData.CurrentXp.Value = 0
		xpData.Level.Value = 1
		xpData.TotalXpEarned.Value = 0

		xpData.CurrentXp.Parent = xpData
		xpData.Level.Parent = xpData
		xpData.TotalXpEarned.Parent = xpData
	end
end

-- Get café multiplier for active player drink
function XpSystem.GetCafeMultiplier(player)
	local playerData = ReplicatedStorage:FindFirstChild("PlayerData")
	if not playerData then return 1.0 end

	local data = playerData:FindFirstChild(player.Name)
	if not data then return 1.0 end

	local activeItem = data:FindFirstChild("ActiveCafeItem")
	if not activeItem or not activeItem.Value then return 1.0 end

	local multiplier = CAFE_EFFECTS[activeItem.Value] or 1.0
	return multiplier
end

-- Add XP to player (with café multiplier applied)
function XpSystem.AddXp(player, xpType, baseAmount)
	if not BASE_XP_VALUES[xpType] then
		warn("Unknown XP type: " .. xpType)
		return
	end

	local xpGain = baseAmount or BASE_XP_VALUES[xpType]
	local cafeMultiplier = XpSystem.GetCafeMultiplier(player)
	local totalXpGain = math.floor(xpGain * cafeMultiplier)

	local playerData = ReplicatedStorage:FindFirstChild("PlayerData")
	if not playerData then return end

	local data = playerData:FindFirstChild(player.Name)
	if not data then return end

	local xpData = data:FindFirstChild("XpData")
	if not xpData then
		XpSystem.InitializePlayer(player)
		xpData = data:FindFirstChild("XpData")
	end

	xpData.CurrentXp.Value = xpData.CurrentXp.Value + totalXpGain
	xpData.TotalXpEarned.Value = xpData.TotalXpEarned.Value + totalXpGain

	-- Check for level up
	XpSystem.CheckLevelUp(player, xpData)

	-- Log for testing
	print("[XpSystem] " .. player.Name .. " gained " .. totalXpGain .. " XP (type: " .. xpType ..
		", multiplier: " .. string.format("%.2f", cafeMultiplier) .. "x)")

	return totalXpGain
end

-- Check if player leveled up
function XpSystem.CheckLevelUp(player, xpData)
	local xpNeeded = XpSystem.GetXpForNextLevel(xpData.Level.Value)

	while xpData.CurrentXp.Value >= xpNeeded do
		xpData.CurrentXp.Value = xpData.CurrentXp.Value - xpNeeded
		xpData.Level.Value = xpData.Level.Value + 1

		print("[XpSystem] " .. player.Name .. " leveled up to " .. xpData.Level.Value .. "!")

		-- Trigger level up event (for achievements, etc.)
		local levelUpEvent = ReplicatedStorage:FindFirstChild("Events"):FindFirstChild("PlayerLeveledUp")
		if levelUpEvent then
			levelUpEvent:FireClient(player, xpData.Level.Value)
		end

		xpNeeded = XpSystem.GetXpForNextLevel(xpData.Level.Value)
	end
end

-- Get XP required to reach next level
function XpSystem.GetXpForNextLevel(currentLevel)
	return XP_PER_LEVEL * currentLevel
end

-- Get player's current level and XP progress
function XpSystem.GetPlayerProgress(player)
	local playerData = ReplicatedStorage:FindFirstChild("PlayerData")
	if not playerData then return nil end

	local data = playerData:FindFirstChild(player.Name)
	if not data then return nil end

	local xpData = data:FindFirstChild("XpData")
	if not xpData then return nil end

	return {
		level = xpData.Level.Value,
		currentXp = xpData.CurrentXp.Value,
		xpNeeded = XpSystem.GetXpForNextLevel(xpData.Level.Value),
		totalXpEarned = xpData.TotalXpEarned.Value
	}
end

-- Initialize system on player join
Players.PlayerAdded:Connect(function(player)
	task.wait(1) -- Wait for data to be set up
	XpSystem.InitializePlayer(player)
	print("[XpSystem] Initialized XP for " .. player.Name)
end)

return XpSystem
