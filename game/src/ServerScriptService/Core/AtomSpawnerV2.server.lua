--[[
	AtomSpawnerV2.server.lua
	MOLGANG Enhanced Atom Spawning System

	Creates actual atom objects in the world that players collect.
	- Weighted spawn based on zone
	- Visual representations (colored spheres)
	- Proximity-based collection
	- Respawn system
	- Rarity tiers (common, uncommon, rare, legendary)
]]

local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Elements = require(ReplicatedStorage.Data.Elements)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ═══════════════════════════════════════════════
-- CONFIGURATION
-- ═══════════════════════════════════════════════

local ATOM_CONFIG = {
	SPAWN_INTERVAL = 10,      -- Spawn new atoms every 10 seconds
	COLLECTION_RANGE = 30,    -- Pickup range (studs)
	ATOM_LIFETIME = 600,      -- Atoms disappear after 10 minutes if not collected
	ATOMS_PER_SPAWN = 5,      -- Spawn 5 atoms per interval
	MAX_ATOMS_IN_WORLD = 50,  -- Don't spawn if too many exist
}

-- Zone definitions with spawn locations & atom preferences
local ZONES = {
	{
		name = "Centrum",
		position = Vector3.new(0, 50, 0),
		spawnRadius = 300,
		commonElements = {"H", "O", "C", "N"},  -- Basic building blocks
		weight = 0.2,
	},
	{
		name = "Noord",
		position = Vector3.new(2000, 50, 0),
		spawnRadius = 400,
		commonElements = {"Fe", "Cu", "Au", "Ag"},  -- Metals
		weight = 0.2,
	},
	{
		name = "Oost",
		position = Vector3.new(0, 50, 2000),
		spawnRadius = 350,
		commonElements = {"N", "O", "He", "Ne"},  -- Gases, noble gases
		weight = 0.15,
	},
	{
		name = "West",
		position = Vector3.new(-2000, 50, 0),
		spawnRadius = 350,
		commonElements = {"V", "Ti", "Fe", "Cr"},  -- Industrial metals
		weight = 0.25,
	},
	{
		name = "Centrum-Oost",
		position = Vector3.new(500, 50, 500),
		spawnRadius = 250,
		commonElements = {"Si", "Al", "Ca", "P"},  -- Minerals
		weight = 0.1,
	},
	{
		name = "Centrum-West",
		position = Vector3.new(-500, 50, 500),
		spawnRadius = 250,
		commonElements = {"K", "Na", "Mg", "H"},  -- Reactive elements
		weight = 0.1,
	},
}

-- Rarity tiers for special atoms
local RARITY_TIERS = {
	common = {elements = {"H", "O", "N", "C"}, spawnChance = 0.6, color = Color3.fromRGB(100, 200, 100)},
	uncommon = {elements = {"Fe", "Cu", "Al", "Si"}, spawnChance = 0.25, color = Color3.fromRGB(100, 150, 255)},
	rare = {elements = {"Au", "Ag", "Pt", "V"}, spawnChance = 0.12, color = Color3.fromRGB(200, 100, 255)},
	legendary = {elements = {"U", "Og"}, spawnChance = 0.03, color = Color3.fromRGB(255, 215, 0)},
}

-- ═══════════════════════════════════════════════
-- ATOM OBJECT CREATION
-- ═══════════════════════════════════════════════

local function createAtomObject(symbol, position)
	-- Create visual atom
	local atom = Instance.new("Part")
	atom.Name = "Atom_" .. symbol
	atom.Shape = Enum.PartType.Ball
	atom.Size = Vector3.new(1, 1, 1)
	atom.Color = Elements.Table[1].color or Color3.fromRGB(100, 200, 100)  -- Default color
	atom.Material = Enum.Material.Neon
	atom.CanCollide = true
	atom.CFrame = CFrame.new(position + Vector3.new(0, 5, 0))
	atom.Parent = Workspace

	-- Add metadata
	atom:SetAttribute("ElementSymbol", symbol)
	atom:SetAttribute("SpawnTime", os.time())
	atom:SetAttribute("Collected", false)

	-- Add to collection
	CollectionService:AddTag(atom, "Atom")

	-- Create floating animation (subtle bob)
	local floatPos = atom.Position
	local time = 0
	task.spawn(function()
		while atom.Parent and not atom:GetAttribute("Collected") do
			time = time + 0.03
			atom.Position = floatPos + Vector3.new(0, math.sin(time) * 0.5, 0)
			task.wait(0.03)
		end
	end)

	-- Lifetime check - despawn after ATOM_LIFETIME
	task.delay(ATOM_CONFIG.ATOM_LIFETIME, function()
		if atom.Parent and not atom:GetAttribute("Collected") then
			atom:Destroy()
		end
	end)

	return atom
end

-- ═══════════════════════════════════════════════
-- ATOM COLLECTION
-- ═══════════════════════════════════════════════

local function pickupAtom(player, atom)
	local symbol = atom:GetAttribute("ElementSymbol")
	if not symbol then return end

	-- Mark as collected
	atom:SetAttribute("Collected", true)

	-- Award to player (via DataStore - handled by EconomyManager)
	local data = Remotes.GetPlayerData:InvokeClient(player)
	if data then
		if not data.atoms then data.atoms = {} end
		data.atoms[symbol] = (data.atoms[symbol] or 0) + 1

		-- Visual feedback
		Remotes.FireClient("AtomCollected", player, {
			symbol = symbol,
			newCount = data.atoms[symbol],
			isQuantumDot = false,
		})

		print("[AtomSpawner] Player", player.Name, "collected", symbol)
	end

	-- Destroy atom
	atom:Destroy()
end

-- ═══════════════════════════════════════════════
-- SPAWN SYSTEM
-- ═══════════════════════════════════════════════

local function selectRandomElement()
	-- Weighted random selection based on rarity
	local rand = math.random()
	if rand < 0.6 then
		return RARITY_TIERS.common.elements[math.random(#RARITY_TIERS.common.elements)]
	elseif rand < 0.85 then
		return RARITY_TIERS.uncommon.elements[math.random(#RARITY_TIERS.uncommon.elements)]
	elseif rand < 0.97 then
		return RARITY_TIERS.rare.elements[math.random(#RARITY_TIERS.rare.elements)]
	else
		return RARITY_TIERS.legendary.elements[math.random(#RARITY_TIERS.legendary.elements)]
	end
end

local function spawnAtomsInZone(zone)
	local atomCount = #CollectionService:GetTagged("Atom")
	if atomCount >= ATOM_CONFIG.MAX_ATOMS_IN_WORLD then return end

	for i = 1, ATOM_CONFIG.ATOMS_PER_SPAWN do
		-- Random element from zone preferences
		local element = zone.commonElements[math.random(#zone.commonElements)]

		-- Random position in zone
		local randomOffset = Vector3.new(
			(math.random() - 0.5) * zone.spawnRadius * 2,
			0,
			(math.random() - 0.5) * zone.spawnRadius * 2
		)
		local spawnPos = zone.position + randomOffset

		-- Create atom
		createAtomObject(element, spawnPos)
	end
end

-- ═══════════════════════════════════════════════
-- MAIN SPAWN LOOP
-- ═══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(ATOM_CONFIG.SPAWN_INTERVAL)

		-- Spawn atoms in each zone weighted by zone preference
		for _, zone in ipairs(ZONES) do
			if math.random() < zone.weight then
				spawnAtomsInZone(zone)
			end
		end
	end
end)

-- ═══════════════════════════════════════════════
-- COLLECTION DETECTION
-- ═══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(0.5)  -- Check every 0.5 seconds

		for _, atom in ipairs(CollectionService:GetTagged("Atom")) do
			if atom:GetAttribute("Collected") then continue end

			-- Check proximity to all players
			for _, player in ipairs(Players:GetPlayers()) do
				local char = player.Character
				if not char or not char:FindFirstChild("HumanoidRootPart") then continue end

				local distance = (atom.Position - char.HumanoidRootPart.Position).Magnitude
				if distance < ATOM_CONFIG.COLLECTION_RANGE then
					pickupAtom(player, atom)
					break  -- Atom collected, move to next atom
				end
			end
		end
	end
end)

print("[AtomSpawnerV2] Initialized — spawning atoms in", #ZONES, "zones")
