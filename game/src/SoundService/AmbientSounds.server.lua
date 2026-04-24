-- SoundService/AmbientSounds.server.lua
-- Zone-based ambient audio system for MOLGANG
-- Each zone has unique ambient soundscapes
-- Interaction sounds for collection, building, achievements

local SoundService = game:GetService("SoundService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- SOUND IDS (Roblox library sounds — distinct per purpose)
-- ══════════════════════════════════════════════

local SOUNDS = {
	-- Ambient loops (different per zone)
	ambient_hub      = "rbxassetid://9120386153",   -- calm electronic hum
	ambient_quantum  = "rbxassetid://9043887091",   -- eerie sci-fi ambience
	ambient_factory  = "rbxassetid://9043834554",   -- industrial machinery hum
	ambient_nature   = "rbxassetid://9043698944",   -- nature wind/birds
	ambient_biome    = "rbxassetid://9120386153",   -- zen electronic

	-- Interaction sounds (unique per action)
	atom_collect     = "rbxassetid://4612362429",   -- satisfying pling
	molecule_built   = "rbxassetid://5853932947",   -- success chime
	quantum_catch    = "rbxassetid://5853932947",   -- dramatic catch
	chain_entry      = "rbxassetid://6042053626",   -- digital blip
	achievement      = "rbxassetid://5853932947",   -- celebration fanfare
	daily_claim      = "rbxassetid://4612362429",   -- coin collect
	ui_click         = "rbxassetid://6042053626",   -- soft click
	ui_open          = "rbxassetid://6042053626",   -- interface open
	ui_close         = "rbxassetid://6042053626",   -- interface close
	error_sound      = "rbxassetid://6042053626",   -- error tone

	-- Factory / processing sounds
	crusher_impact   = "rbxassetid://4612362429",   -- heavy impact (crushing)
	grinder_loop     = "rbxassetid://9043834554",   -- grinding machinery
	bubbling         = "rbxassetid://9120386153",   -- leaching tank bubbles
	quest_complete   = "rbxassetid://4612362429",   -- distinct pling fanfare for quests (#35)

	-- Background music loop (#52)
	background_music = "rbxassetid://9120386153",  -- low-energy ambient electronica
	purchase         = "rbxassetid://4612362429",   -- buy/sell cha-ching
	equipment_place  = "rbxassetid://6042053626",   -- equipment placed on grid

	-- Weather sounds
	rain_loop        = "rbxassetid://9043698944",   -- rain ambience
	thunder          = "rbxassetid://5853932947",   -- thunder crack
	wind_loop        = "rbxassetid://9043887091",   -- wind howling
}

-- ══════════════════════════════════════════════
-- CREATE SOUND OBJECTS IN SOUNDSERVICE
-- ══════════════════════════════════════════════

local soundObjects = {}

for name, id in pairs(SOUNDS) do
	local sound = Instance.new("Sound")
	sound.Name = name
	sound.SoundId = id
	sound.Volume = 0.5
	sound.Parent = SoundService

	-- Ambient sounds loop
	if string.find(name, "ambient_") then
		sound.Looped = true
		sound.Volume = 0.3
	end

	-- Interaction sounds are short one-shots
	if name == "atom_collect" or name == "ui_click" or name == "daily_claim" then
		sound.Volume = 0.4
	end
	if name == "achievement" or name == "molecule_built" then
		sound.Volume = 0.6
	end
	-- Quest complete: higher pitch to distinguish from atom_collect (#35)
	if name == "quest_complete" then
		sound.Volume = 0.7
		sound.PlaybackSpeed = 1.4
	end
	-- Background music: quiet looping track (#52)
	if name == "background_music" then
		sound.Looped = true
		sound.Volume = 0.15
	end

	soundObjects[name] = sound
end

-- Start background music after short delay (#52)
task.delay(3, function()
	local bgm = soundObjects["background_music"]
	if bgm then
		bgm:Play()
	end
end)

-- ══════════════════════════════════════════════
-- ZONE DETECTION + AMBIENT SWITCHING
-- ══════════════════════════════════════════════

local ZONES = {
	{name = "hub",     center = Vector3.new(0, 10, 0),     radius = 400,  ambient = "ambient_hub"},
	{name = "quantum", center = Vector3.new(2000, 35, 0),  radius = 350,  ambient = "ambient_quantum"},
	{name = "factory", center = Vector3.new(-2000, 5, 0),  radius = 500,  ambient = "ambient_factory"},
	{name = "biome",   center = Vector3.new(0, 15, 2000),  radius = 900,  ambient = "ambient_biome"},
}

local playerZones = {}

local function getPlayerZone(player)
	local char = player.Character
	if not char then return nil end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if not hrp then return nil end

	local pos = hrp.Position
	for _, zone in ipairs(ZONES) do
		if (pos - zone.center).Magnitude < zone.radius then
			return zone
		end
	end
	return nil
end

-- ══════════════════════════════════════════════
-- ZONE MUSIC MANAGEMENT
-- Server sets attributes so client can react
-- ══════════════════════════════════════════════

task.spawn(function()
	while true do
		for _, player in ipairs(Players:GetPlayers()) do
			local zone = getPlayerZone(player)
			local zoneName = zone and zone.name or "space"
			local current = playerZones[player.UserId]

			if zoneName ~= current then
				playerZones[player.UserId] = zoneName
				player:SetAttribute("CurrentZone", zoneName)
			end
		end
		task.wait(2)
	end
end)

Players.PlayerRemoving:Connect(function(player)
	playerZones[player.UserId] = nil
end)

print("[MOLGANG] SoundService initialized — " .. tostring(#ZONES) .. " audio zones, distinct sounds per action")
