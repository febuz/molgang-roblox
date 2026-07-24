--[[
	WeatherSystem.server.lua
	MOLGANG — Dynamic Weather with Hazards

	Weather cycle affects outdoor operations:
	- Clear: normal operation
	- Cloudy: 5% slower outdoor production
	- Rain: 20% slower, reduced atom visibility
	- Storm: 40% slower, equipment damage risk, lightning
	- Hail: 60% slower, crop damage, equipment damage, forces indoor

	Weather changes every 3-8 game minutes.
	Indoor factory is always protected.
	Motivates entrepreneur track: rent indoor space!
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ═══════════════════════════════════════════════
-- WEATHER STATES
-- ═══════════════════════════════════════════════

local WEATHER_TYPES = {
	{
		id = "clear",
		name = "Clear Skies",
		icon = "SUN",
		outdoorPenalty = 1.0,        -- no penalty
		cropDamageChance = 0,
		equipmentDamageChance = 0,
		lightingBrightness = 0.15,
		atmosphereHaze = 0.5,
		fogDensity = 0.15,
		ambientColor = Color3.fromRGB(25, 40, 35),
		weight = 35,                 -- spawn probability weight
		minDuration = 240,           -- seconds
		maxDuration = 480,
	},
	{
		id = "cloudy",
		name = "Overcast",
		icon = "CLOUD",
		outdoorPenalty = 0.95,
		cropDamageChance = 0,
		equipmentDamageChance = 0,
		lightingBrightness = 0.10,
		atmosphereHaze = 1.0,
		fogDensity = 0.25,
		ambientColor = Color3.fromRGB(20, 30, 30),
		weight = 25,
		minDuration = 180,
		maxDuration = 360,
	},
	{
		id = "rain",
		name = "Rain",
		icon = "RAIN",
		outdoorPenalty = 0.80,       -- 20% slower
		cropDamageChance = 0,        -- rain is good for crops
		equipmentDamageChance = 0.01,-- 1% per check
		lightingBrightness = 0.08,
		atmosphereHaze = 2.0,
		fogDensity = 0.35,
		ambientColor = Color3.fromRGB(15, 22, 28),
		weight = 20,
		minDuration = 120,
		maxDuration = 300,
		rainIntensity = 0.6,
	},
	{
		id = "storm",
		name = "Thunderstorm",
		icon = "STORM",
		outdoorPenalty = 0.60,       -- 40% slower
		cropDamageChance = 0.05,     -- 5% per check
		equipmentDamageChance = 0.08,-- 8% per check
		lightingBrightness = 0.04,
		atmosphereHaze = 3.0,
		fogDensity = 0.45,
		ambientColor = Color3.fromRGB(10, 12, 18),
		weight = 12,
		minDuration = 60,
		maxDuration = 180,
		rainIntensity = 1.0,
		lightningInterval = {5, 15}, -- seconds between strikes
		windSpeed = 40,
	},
	{
		id = "hail",
		name = "Hailstorm",
		icon = "HAIL",
		outdoorPenalty = 0.40,       -- 60% slower!
		cropDamageChance = 0.20,     -- 20% per check — devastating
		equipmentDamageChance = 0.15,-- 15% per check
		lightingBrightness = 0.06,
		atmosphereHaze = 2.5,
		fogDensity = 0.40,
		ambientColor = Color3.fromRGB(12, 15, 20),
		weight = 8,
		minDuration = 30,
		maxDuration = 120,
		rainIntensity = 0.8,
		hailIntensity = 1.0,
		lightningInterval = {8, 20},
		windSpeed = 60,
	},
}

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

local currentWeather = WEATHER_TYPES[1]  -- start clear
local weatherChangeTime = tick() + 300   -- first change after 5 min
local totalWeatherWeight = 0

for _, w in ipairs(WEATHER_TYPES) do
	totalWeatherWeight = totalWeatherWeight + w.weight
end

-- ═══════════════════════════════════════════════
-- WEATHER SELECTION (weighted random)
-- ═══════════════════════════════════════════════

local function selectNextWeather()
	local roll = math.random() * totalWeatherWeight
	local cumulative = 0
	for _, w in ipairs(WEATHER_TYPES) do
		cumulative = cumulative + w.weight
		if roll <= cumulative then
			return w
		end
	end
	return WEATHER_TYPES[1]
end

-- ═══════════════════════════════════════════════
-- APPLY WEATHER LIGHTING
-- ═══════════════════════════════════════════════

local function applyWeatherLighting(weather)
	-- Smoothly transition lighting
	local tweenInfo = TweenInfo.new(3, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut)

	-- Update atmosphere
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	if atmosphere then
		atmosphere.Haze = weather.atmosphereHaze
		atmosphere.Density = weather.fogDensity
	end
	Lighting:SetAttribute("WeatherBrightness", weather.lightingBrightness)

	-- Update ambient
	Lighting.Ambient = weather.ambientColor
end

-- ═══════════════════════════════════════════════
-- WEATHER EFFECTS ON PLAYERS
-- ═══════════════════════════════════════════════

local function isPlayerIndoors(player)
	local character = player.Character
	if not character then return false end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return false end

	-- Check if player is inside a roofed factory zone
	-- Factory hall is at approximately (-1850 to -1750, 5 to 30, -30 to 70)
	local pos = hrp.Position
	local inFactory = pos.X > -1900 and pos.X < -1700
		and pos.Y > 5 and pos.Y < 40
		and pos.Z > -40 and pos.Z < 80

	-- Also check player attribute (set by EntrepreneurSystem when inside rented factory)
	if player:GetAttribute("IsIndoors") then
		return true
	end

	return inFactory
end

local function applyWeatherEffects()
	for _, player in ipairs(Players:GetPlayers()) do
		local indoor = isPlayerIndoors(player)

		-- Set attribute for other scripts to check
		player:SetAttribute("CurrentWeather", currentWeather.id)
		player:SetAttribute("IsIndoors", indoor)
		player:SetAttribute("OutdoorPenalty", indoor and 1.0 or currentWeather.outdoorPenalty)

		-- Damage outdoor crops (handled by FertilizerSystem checking weather)
		-- Damage outdoor equipment (handled by EntrepreneurSystem checking weather)
	end
end

-- ═══════════════════════════════════════════════
-- LIGHTNING STRIKES (during storms)
-- ═══════════════════════════════════════════════

local function triggerLightning()
	if not currentWeather.lightningInterval then return end

	-- Brief bright flash
	local originalBrightness = Lighting.Brightness
	Lighting.Brightness = 2.0
	task.delay(0.1, function()
		Lighting.Brightness = originalBrightness + 0.5
		task.delay(0.05, function()
			Lighting.Brightness = originalBrightness
		end)
	end)

	-- Notify clients for screen flash + sound
	Remotes.FireAllClients("WeatherLightning", {
		intensity = currentWeather.id == "hail" and 0.8 or 1.0,
	})
end

-- ═══════════════════════════════════════════════
-- MAIN WEATHER LOOP
-- ═══════════════════════════════════════════════

-- Broadcast weather to all clients
local function broadcastWeather(weather, duration)
	Remotes.FireAllClients("WeatherChanged", {
		id = weather.id,
		name = weather.name,
		icon = weather.icon,
		outdoorPenalty = weather.outdoorPenalty,
		rainIntensity = weather.rainIntensity or 0,
		hailIntensity = weather.hailIntensity or 0,
		windSpeed = weather.windSpeed or 0,
		duration = duration,
		lightningInterval = weather.lightningInterval,
	})

	-- Server announcement
	if weather.id == "storm" or weather.id == "hail" then
		Remotes.FireAllClients("ServerAnnounce", {
			message = "WEATHER WARNING: " .. weather.name .. "! Outdoor production reduced " .. math.floor((1 - weather.outdoorPenalty) * 100) .. "%. Move equipment indoors!",
			rarity = weather.id == "hail" and "legendary" or "epic",
		})
	elseif weather.id == "clear" and currentWeather.id ~= "clear" then
		Remotes.FireAllClients("ServerAnnounce", {
			message = "Weather cleared! Safe to work outdoors.",
			rarity = "uncommon",
		})
	end
end

-- Weather change loop
task.spawn(function()
	-- Start with clear weather
	applyWeatherLighting(currentWeather)
	broadcastWeather(currentWeather, 300)

	while true do
		task.wait(10)  -- check every 10 seconds

		if tick() >= weatherChangeTime then
			-- Pick new weather
			local newWeather = selectNextWeather()
			local duration = math.random(newWeather.minDuration, newWeather.maxDuration)

			currentWeather = newWeather
			weatherChangeTime = tick() + duration

			-- Apply lighting changes
			applyWeatherLighting(newWeather)

			-- Broadcast to all clients
			broadcastWeather(newWeather, duration)

			print("[Weather] Changed to:", newWeather.name, "Duration:", duration .. "s")
		end

		-- Apply effects to players
		applyWeatherEffects()

		-- Lightning during storms
		if currentWeather.lightningInterval then
			local interval = currentWeather.lightningInterval
			if math.random() < (10 / ((interval[1] + interval[2]) / 2)) then
				triggerLightning()
			end
		end
	end
end)

-- Public accessor for other scripts
_G.GetCurrentWeather = function()
	return currentWeather
end

_G.IsPlayerIndoors = isPlayerIndoors

print("[MOLGANG] WeatherSystem initialized — " .. #WEATHER_TYPES .. " weather types, storm/hail hazards active")
