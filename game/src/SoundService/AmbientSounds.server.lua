-- SoundService/AmbientSounds.server.lua
-- Zone-based ambient audio system for MOLGANG
-- Each zone has its own ambient soundscape
-- Interaction sounds for atom collection, molecule building, etc.

local SoundService = game:GetService("SoundService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- SOUND IDS (free Roblox library sounds)
-- ══════════════════════════════════════════════

local SOUNDS = {
	-- Ambient loops
	ambient_hub      = "rbxassetid://9120386153",   -- electronic hum
	ambient_quantum  = "rbxassetid://9120386153",   -- high-pitched quantum hum
	ambient_factory  = "rbxassetid://9120386153",   -- industrial ambience
	ambient_nature   = "rbxassetid://9120386153",   -- nature sounds
	ambient_biome    = "rbxassetid://9120386153",   -- zen electronic

	-- Interaction sounds
	atom_collect     = "rbxassetid://4612362429",   -- satisfying pling
	molecule_built   = "rbxassetid://131961136",    -- fanfare chord
	quantum_catch    = "rbxassetid://131961136",    -- dramatic hit
	chain_entry      = "rbxassetid://4612362429",   -- digital blip
	achievement      = "rbxassetid://131961136",    -- celebration fanfare
	daily_claim      = "rbxassetid://4612362429",   -- cash register
	ui_click         = "rbxassetid://4612362429",   -- click
	ui_open          = "rbxassetid://4612362429",   -- whoosh open
	ui_close         = "rbxassetid://4612362429",   -- whoosh close
	error_sound      = "rbxassetid://4612362429",   -- error buzz
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

	soundObjects[name] = sound
end

-- ══════════════════════════════════════════════
-- ZONE DETECTION + AMBIENT SWITCHING
-- ══════════════════════════════════════════════

local ZONES = {
	{name = "hub",     center = Vector3.new(0, 10, 0),     radius = 400,  ambient = "ambient_hub"},
	{name = "quantum", center = Vector3.new(2000, 35, 0),  radius = 350,  ambient = "ambient_quantum"},
	{name = "factory", center = Vector3.new(-2000, 5, 0),  radius = 500,  ambient = "ambient_factory"},
	{name = "biome",   center = Vector3.new(0, 15, 2000),  radius = 900,  ambient = "ambient_biome"},
}

local playerZones = {} -- {playerId = currentZone}

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
-- PLAY INTERACTION SOUNDS (server-triggered)
-- ══════════════════════════════════════════════

-- Atom collect sound
Remotes.AtomCollected.Event = nil -- we listen differently for server scripts

-- The client handles its own interaction sounds
-- This script primarily manages ambient music zones
-- and provides sound setup for the game

-- ══════════════════════════════════════════════
-- ZONE MUSIC MANAGEMENT
-- This runs on server but ambient playback is client-side
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
		task.wait(2) -- check every 2 seconds
	end
end)

Players.PlayerRemoving:Connect(function(player)
	playerZones[player.UserId] = nil
end)

print("[MOLGANG] SoundService initialized - " .. tostring(#ZONES) .. " audio zones")
