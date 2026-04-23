--[[
	WeatherEffects.client.lua
	MOLGANG — Client-side Weather Visual Effects

	Renders weather conditions:
	- Rain particles falling from sky
	- Lightning screen flashes with camera shake
	- Hail particles (white, bouncing)
	- Fog/atmosphere changes
	- Wind sound modulation
	- Weather HUD indicator
	- Indoor detection (no effects when inside factory)
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local SoundService = game:GetService("SoundService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local camera = workspace.CurrentCamera
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

-- ═══════════════════════════════════════════════
-- WEATHER STATE
-- ═══════════════════════════════════════════════

local currentWeatherId = "clear"
local rainIntensity = 0
local hailIntensity = 0
local windSpeed = 0

-- ═══════════════════════════════════════════════
-- RAIN PARTICLE SYSTEM
-- Invisible part attached to camera with downward emitter
-- ═══════════════════════════════════════════════

local rainEmitter = Instance.new("Part")
rainEmitter.Name = "RainEmitter"
rainEmitter.Size = Vector3.new(80, 1, 80)
rainEmitter.Transparency = 1
rainEmitter.Anchored = true
rainEmitter.CanCollide = false
rainEmitter.CastShadow = false
rainEmitter.Parent = workspace

local rainParticles = Instance.new("ParticleEmitter")
rainParticles.Name = "Rain"
rainParticles.Color = ColorSequence.new(Color3.fromRGB(180, 200, 220))
rainParticles.Size = NumberSequence.new({
	NumberSequenceKeypoint.new(0, 0.05),
	NumberSequenceKeypoint.new(1, 0.02),
})
rainParticles.Transparency = NumberSequence.new({
	NumberSequenceKeypoint.new(0, 0.3),
	NumberSequenceKeypoint.new(0.8, 0.5),
	NumberSequenceKeypoint.new(1, 1),
})
rainParticles.Lifetime = NumberRange.new(0.8, 1.5)
rainParticles.Rate = 0  -- controlled by weather
rainParticles.Speed = NumberRange.new(40, 60)
rainParticles.SpreadAngle = Vector2.new(5, 5)
rainParticles.Acceleration = Vector3.new(0, -50, 0)
rainParticles.EmissionDirection = Enum.NormalId.Bottom
rainParticles.LightEmission = 0.1
rainParticles.LightInfluence = 1
rainParticles.Parent = rainEmitter

-- Hail particles (white, larger)
local hailParticles = Instance.new("ParticleEmitter")
hailParticles.Name = "Hail"
hailParticles.Color = ColorSequence.new(Color3.fromRGB(240, 245, 255))
hailParticles.Size = NumberSequence.new({
	NumberSequenceKeypoint.new(0, 0.3),
	NumberSequenceKeypoint.new(1, 0.15),
})
hailParticles.Transparency = NumberSequence.new({
	NumberSequenceKeypoint.new(0, 0.1),
	NumberSequenceKeypoint.new(1, 0.5),
})
hailParticles.Lifetime = NumberRange.new(0.5, 1.0)
hailParticles.Rate = 0
hailParticles.Speed = NumberRange.new(30, 50)
hailParticles.SpreadAngle = Vector2.new(15, 15)
hailParticles.Acceleration = Vector3.new(0, -40, 0)
hailParticles.EmissionDirection = Enum.NormalId.Bottom
hailParticles.LightEmission = 0.3
hailParticles.Parent = rainEmitter

-- ═══════════════════════════════════════════════
-- LIGHTNING FLASH OVERLAY
-- ═══════════════════════════════════════════════

local flashGui = Instance.new("ScreenGui")
flashGui.Name = "LightningFlash"
flashGui.ResetOnSpawn = false
flashGui.IgnoreGuiInset = true
flashGui.DisplayOrder = 150
flashGui.Parent = playerGui

local flashFrame = Instance.new("Frame")
flashFrame.Size = UDim2.new(1, 0, 1, 0)
flashFrame.BackgroundColor3 = Color3.fromRGB(200, 210, 255)
flashFrame.BackgroundTransparency = 1
flashFrame.Parent = flashGui

-- ═══════════════════════════════════════════════
-- WEATHER HUD INDICATOR (top-center)
-- ═══════════════════════════════════════════════

local weatherHud = Instance.new("ScreenGui")
weatherHud.Name = "WeatherHUD"
weatherHud.ResetOnSpawn = false
weatherHud.IgnoreGuiInset = true
weatherHud.DisplayOrder = 7
weatherHud.Parent = playerGui

local weatherPanel = Instance.new("Frame")
weatherPanel.Size = UDim2.fromOffset(180, 30)
weatherPanel.Position = UDim2.new(0.5, -90, 0, 4)
weatherPanel.BackgroundColor3 = Color3.fromRGB(15, 18, 25)
weatherPanel.BackgroundTransparency = 0.3
weatherPanel.Parent = weatherHud
local wpCorner = Instance.new("UICorner")
wpCorner.CornerRadius = UDim.new(0, 6)
wpCorner.Parent = weatherPanel

local weatherIcon = Instance.new("TextLabel")
weatherIcon.Size = UDim2.fromOffset(24, 24)
weatherIcon.Position = UDim2.new(0, 4, 0.5, -12)
weatherIcon.BackgroundTransparency = 1
weatherIcon.Text = "O"  -- sun icon placeholder
weatherIcon.TextColor3 = Color3.fromRGB(255, 200, 50)
weatherIcon.TextScaled = true
weatherIcon.Font = Enum.Font.GothamBold
weatherIcon.Parent = weatherPanel

local weatherLabel = Instance.new("TextLabel")
weatherLabel.Size = UDim2.new(1, -34, 1, 0)
weatherLabel.Position = UDim2.new(0, 30, 0, 0)
weatherLabel.BackgroundTransparency = 1
weatherLabel.Text = "Clear Skies"
weatherLabel.TextColor3 = Color3.fromRGB(200, 210, 230)
weatherLabel.TextScaled = true
weatherLabel.Font = Enum.Font.Gotham
weatherLabel.TextXAlignment = Enum.TextXAlignment.Left
weatherLabel.Parent = weatherPanel

local indoorLabel = Instance.new("TextLabel")
indoorLabel.Size = UDim2.fromOffset(60, 18)
indoorLabel.Position = UDim2.new(1, 4, 0, 6)
indoorLabel.BackgroundColor3 = Color3.fromRGB(0, 150, 80)
indoorLabel.BackgroundTransparency = 0.3
indoorLabel.Text = "INDOOR"
indoorLabel.TextColor3 = Color3.new(1, 1, 1)
indoorLabel.TextScaled = true
indoorLabel.Font = Enum.Font.GothamBold
indoorLabel.Visible = false
indoorLabel.Parent = weatherPanel
local ilCorner = Instance.new("UICorner")
ilCorner.CornerRadius = UDim.new(0, 4)
ilCorner.Parent = indoorLabel

-- ═══════════════════════════════════════════════
-- WEATHER ICON MAP
-- ═══════════════════════════════════════════════

local WEATHER_ICONS = {
	clear = {icon = "O", color = Color3.fromRGB(255, 200, 50)},
	cloudy = {icon = "C", color = Color3.fromRGB(180, 180, 190)},
	rain = {icon = "R", color = Color3.fromRGB(100, 160, 220)},
	storm = {icon = "S", color = Color3.fromRGB(200, 100, 255)},
	hail = {icon = "H", color = Color3.fromRGB(255, 80, 80)},
}

-- ═══════════════════════════════════════════════
-- WEATHER CHANGE HANDLER
-- ═══════════════════════════════════════════════

local weatherChangedEvent = Remotes:FindFirstChild("WeatherChanged")
if weatherChangedEvent then
	weatherChangedEvent.OnClientEvent:Connect(function(data)
		currentWeatherId = data.id
		rainIntensity = data.rainIntensity or 0
		hailIntensity = data.hailIntensity or 0
		windSpeed = data.windSpeed or 0

		-- Update rain/hail particles
		rainParticles.Rate = rainIntensity * 300  -- 0-300 particles/sec
		hailParticles.Rate = hailIntensity * 100

		-- Wind angle on rain
		if windSpeed > 0 then
			rainParticles.SpreadAngle = Vector2.new(windSpeed / 3, windSpeed / 3)
		else
			rainParticles.SpreadAngle = Vector2.new(5, 5)
		end

		-- Update HUD
		local iconData = WEATHER_ICONS[data.id] or WEATHER_ICONS.clear
		weatherIcon.Text = iconData.icon
		weatherIcon.TextColor3 = iconData.color
		weatherLabel.Text = data.name
		weatherLabel.TextColor3 = iconData.color

		-- Panel flash for dangerous weather
		if data.id == "storm" or data.id == "hail" then
			weatherPanel.BackgroundColor3 = Color3.fromRGB(40, 15, 15)
			TweenService:Create(weatherPanel, TweenInfo.new(1), {
				BackgroundColor3 = Color3.fromRGB(15, 18, 25),
			}):Play()
		end
	end)
end

-- ═══════════════════════════════════════════════
-- LIGHTNING FLASH HANDLER
-- ═══════════════════════════════════════════════

local lightningEvent = Remotes:FindFirstChild("WeatherLightning")
if lightningEvent then
	lightningEvent.OnClientEvent:Connect(function(data)
		-- Check if player is indoor (no flash)
		if player:GetAttribute("IsIndoors") then return end

		local intensity = data.intensity or 1.0

		-- Screen flash
		flashFrame.BackgroundTransparency = 1 - (0.7 * intensity)
		TweenService:Create(flashFrame, TweenInfo.new(0.08), {
			BackgroundTransparency = 1 - (0.3 * intensity),
		}):Play()
		task.delay(0.08, function()
			flashFrame.BackgroundTransparency = 1 - (0.5 * intensity)
			task.delay(0.04, function()
				TweenService:Create(flashFrame, TweenInfo.new(0.3), {
					BackgroundTransparency = 1,
				}):Play()
			end)
		end)

		-- Camera shake
		local originalCF = camera.CFrame
		task.spawn(function()
			for i = 1, 4 do
				local shakeX = (math.random() - 0.5) * 0.3 * intensity
				local shakeY = (math.random() - 0.5) * 0.2 * intensity
				camera.CFrame = originalCF * CFrame.new(shakeX, shakeY, 0)
				task.wait(0.03)
			end
			camera.CFrame = originalCF
		end)
	end)
end

-- ═══════════════════════════════════════════════
-- UPDATE LOOP (move rain emitter with player)
-- ═══════════════════════════════════════════════

RunService.Heartbeat:Connect(function()
	-- Move rain emitter above player
	local character = player.Character
	if character then
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if hrp then
			rainEmitter.Position = hrp.Position + Vector3.new(0, 50, 0)
		end
	end

	-- Update indoor indicator
	local isIndoors = player:GetAttribute("IsIndoors")
	indoorLabel.Visible = isIndoors == true

	-- Suppress rain particles when indoor
	if isIndoors then
		rainParticles.Rate = 0
		hailParticles.Rate = 0
	else
		rainParticles.Rate = rainIntensity * 300
		hailParticles.Rate = hailIntensity * 100
	end
end)

print("[MOLGANG] WeatherEffects loaded — rain, hail, lightning, weather HUD")
