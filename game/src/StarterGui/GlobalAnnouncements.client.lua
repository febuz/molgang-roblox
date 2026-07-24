--[[
	GlobalAnnouncements.client.lua
	MOLGANG Global Announcements

	Displays global events & achievements:
	- Player milestones (first mine, first molecule)
	- Leaderboard changes
	- Special events
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	accent        = Color3.fromRGB(0, 200, 120),
	legendary     = Color3.fromRGB(255, 215, 0),
	epic          = Color3.fromRGB(200, 100, 255),
	rare          = Color3.fromRGB(100, 150, 255),
	textPrimary   = Color3.fromRGB(240, 240, 250),
}

-- ANNOUNCEMENTS SCREEN GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "GlobalAnnouncements"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 9
screenGui.Parent = playerGui

-- Announcement queue
local announcementQueue = {}
local currentAnnouncement = nil
local isDisplaying = false

-- ═════════════════════════════════════════════════
-- ANNOUNCEMENT DISPLAY
-- ═════════════════════════════════════════════════

local function displayAnnouncement(announcement)
	-- Create announcement panel
	local panel = Instance.new("Frame")
	panel.Name = "AnnouncementPanel"
	panel.Size = UDim2.new(0, 600, 0, 100)
	panel.Position = UDim2.new(0.5, -300, 0.5, -200)
	panel.BackgroundColor3 = COLORS.background
	panel.BackgroundTransparency = 0.1
	panel.Parent = screenGui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 12)
	corner.Parent = panel

	local stroke = Instance.new("UIStroke")
	stroke.Color = announcement.color or COLORS.accent
	stroke.Thickness = 2
	stroke.Parent = panel

	-- Icon
	local iconLabel = Instance.new("TextLabel")
	iconLabel.Name = "Icon"
	iconLabel.Size = UDim2.new(0, 50, 1, 0)
	iconLabel.Position = UDim2.new(0, 10, 0, 0)
	iconLabel.BackgroundTransparency = 1
	iconLabel.Text = announcement.icon or "📢"
	iconLabel.TextScaled = true
	iconLabel.Parent = panel

	-- Message
	local messageLabel = Instance.new("TextLabel")
	messageLabel.Name = "Message"
	messageLabel.Size = UDim2.new(1, -70, 1, 0)
	messageLabel.Position = UDim2.new(0, 60, 0, 0)
	messageLabel.BackgroundTransparency = 1
	messageLabel.Text = announcement.message
	messageLabel.TextColor3 = COLORS.textPrimary
	messageLabel.TextScaled = true
	messageLabel.Font = Enum.Font.GothamBold
	messageLabel.TextWrapped = true
	messageLabel.Parent = panel

	-- Fade in
	local fadeIn = TweenService:Create(
		panel,
		TweenInfo.new(0.3),
		{BackgroundTransparency = 0.2}
	)
	fadeIn:Play()

	-- Wait 3 seconds, then fade out
	task.wait(3)

	local fadeOut = TweenService:Create(
		panel,
		TweenInfo.new(0.5),
		{BackgroundTransparency = 1}
	)
	fadeOut:Play()
	fadeOut.Completed:Connect(function()
		panel:Destroy()
		isDisplaying = false

		-- Show next announcement if queued
		if #announcementQueue > 0 then
			local nextAnnouncement = table.remove(announcementQueue, 1)
			displayAnnouncement(nextAnnouncement)
		end
	end)
end

local function queueAnnouncement(announcement)
	if isDisplaying then
		table.insert(announcementQueue, announcement)
	else
		isDisplaying = true
		displayAnnouncement(announcement)
	end
end

-- ═════════════════════════════════════════════════
-- LISTEN FOR GAME EVENTS
-- ═════════════════════════════════════════════════

-- Achievement unlocked
Remotes.AchievementUnlocked.OnClientEvent:Connect(function(data)
	queueAnnouncement({
		icon = "🏅",
		message = data.name .. " unlocked!",
		color = COLORS.epic,
	})
end)

-- Facility built
Remotes.FacilityBuilt.OnClientEvent:Connect(function(data)
	if data.facilityName then
		queueAnnouncement({
			icon = "🏭",
			message = "Built: " .. data.facilityName,
			color = COLORS.rare,
		})
	end
end)

-- Molecule built
Remotes.MoleculeBuilt.OnClientEvent:Connect(function(data)
	if data.molName then
		queueAnnouncement({
			icon = "⚗️",
			message = "Created: " .. data.molName,
			color = COLORS.accent,
		})
	end
end)

-- Day advanced
Remotes.DayAdvanced.OnClientEvent:Connect(function(data)
	queueAnnouncement({
		icon = "🌅",
		message = "Day " .. data.newDay .. " begins!",
		color = COLORS.legendary,
	})
end)

-- World events must be visible when their server-side modifiers change.
-- Reuse the existing queue so event headlines cannot create overlapping GUI.
local function formatWorldModifiers(effects)
	local modifiers = {}
	local labels = {
		productionSpeedMult = "production speed",
		productionBonusMult = "production rewards",
		miningYieldMult = "mining yield",
		leachingEfficiencyMult = "leach efficiency",
		cropYieldMult = "crop yield",
		researchSpeedMult = "research speed",
		fertilizerDemandMult = "fertilizer demand",
		factoryOpCostMult = "factory costs",
		processWaterCostMult = "process-water costs",
		carbonCreditMult = "carbon credits",
		tradeTaxMult = "trade tax",
		moleculeBonusMultiplier = "molecule rewards",
	}
	for key, label in pairs(labels) do
		local value = effects and effects[key]
		if type(value) == "number" and value ~= 1 then
			table.insert(modifiers, label .. " x" .. string.format("%.2f", value))
		end
	end
	local carbonTax = effects and effects.carbonTaxPerKW
	if type(carbonTax) == "number" and carbonTax > 0 then
		table.insert(modifiers, string.format("carbon tax %.2f/kW/min", carbonTax))
	end
	table.sort(modifiers)
	return #modifiers > 0 and (" | " .. table.concat(modifiers, ", ")) or ""
end

if Remotes.WorldEventStarted then
	Remotes.WorldEventStarted.OnClientEvent:Connect(function(data)
		queueAnnouncement({
			icon = "🌐",
			message = "WORLD EVENT: " .. tostring(data.name or "Active event")
				.. (data.hint and (" — " .. data.hint) or ""),
			color = COLORS.legendary,
		})
	end)
end

if Remotes.WorldEventEnded then
	Remotes.WorldEventEnded.OnClientEvent:Connect(function(data)
		queueAnnouncement({
			icon = "🌐",
			message = "World event ended: " .. tostring(data.eventId or "event"),
			color = COLORS.rare,
		})
	end)
end

if Remotes.WorldEffectsUpdate then
	Remotes.WorldEffectsUpdate.OnClientEvent:Connect(function(data)
		local modifiers = formatWorldModifiers(data and data.effects)
		if modifiers ~= "" then
			queueAnnouncement({
				icon = "📊",
				message = "Active world modifiers" .. modifiers,
				color = COLORS.accent,
			})
		end
	end)
end

if Remotes.WorldNewsItem then
	Remotes.WorldNewsItem.OnClientEvent:Connect(function(data)
		if type(data) == "table" and type(data.message) == "string" then
			queueAnnouncement({
				icon = "📰",
				message = data.message,
				color = COLORS.rare,
			})
		end
	end)
end

if Remotes.WorldNewsFeed then
	Remotes.WorldNewsFeed.OnClientEvent:Connect(function(data)
		local latest = data and data.feed and data.feed[1]
		if type(latest) == "table" and type(latest.message) == "string" then
			queueAnnouncement({
				icon = "🗞️",
				message = "Latest world news: " .. latest.message,
				color = COLORS.rare,
			})
		end
	end)
end

-- Production complete
Remotes.ProductionCycleComplete.OnClientEvent:Connect(function(data)
	local msg = "Production: "
	local items = {}
	if data.atomsProduced and next(data.atomsProduced) then
		for atom, count in pairs(data.atomsProduced) do
			table.insert(items, atom .. "x" .. count)
		end
	end
	if data.moleculesProduced and next(data.moleculesProduced) then
		for mol, count in pairs(data.moleculesProduced) do
			table.insert(items, mol .. "x" .. count)
		end
	end
	if #items > 0 then
		msg = msg .. table.concat(items, ", ")
		if data.bonusMolCoins and data.bonusMolCoins > 0 then
			msg = msg .. " (+$" .. data.bonusMolCoins .. ")"
		end
		queueAnnouncement({
			icon = "⚙️",
			message = msg,
			color = COLORS.rare,
		})
	end
end)

-- Server announcements (from ServerAnnounce event)
if Remotes:FindFirstChild("ServerAnnounce") then
	Remotes.ServerAnnounce.OnClientEvent:Connect(function(announcement)
		queueAnnouncement({
			icon = "📣",
			message = announcement.message or "Server announcement",
			color = COLORS.accent,
		})
	end)
end

print("[GlobalAnnouncements] Loaded — Global events will display as notifications")
