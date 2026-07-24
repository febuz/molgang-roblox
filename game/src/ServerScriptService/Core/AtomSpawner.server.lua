-- ServerScriptService/Core/AtomSpawner.server.lua
-- Server-side atom spawn systeem voor MOLGANG
-- Spawnt atomen op vaste posities berekend uit periodesysteem grid layout
-- Cheat-proof: alleen server maakt atomen aan

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Elements = require(ReplicatedStorage.Data.Elements)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local MiningMilestones = require(ReplicatedStorage.Modules.GameObjects.MiningMilestones)

-- ══════════════════════════════════════════════
-- CONFIGURATIE
-- ══════════════════════════════════════════════

local SPAWN_INTERVAL_COMMON = 30        -- seconden
local SPAWN_INTERVAL_LEGENDARY = 600    -- 10 minuten
local MAX_ATOMS_SERVER = 500            -- performance limiet
local ATOM_LIFETIME = 120               -- seconden voordat atoom verdwijnt
local COLLECT_RANGE = 30                -- studs (anti-teleport cheat)
local COLLECT_COOLDOWN = 0.5            -- seconden tussen collects
local MAX_COLLECTS_PER_MINUTE = 20      -- rate limiter

-- BubbleTeaBar.server.lua exposes active drink buffs via _G.GetPlayerBuff
-- (Taro Milk Tea's "collectRange" buff, +50% by default). Guarded the same
-- way QuizSystem.server.lua's quizHint check is, since Core script init
-- order isn't guaranteed.
local function getCollectRangeMultiplier(userId)
	if _G.GetPlayerBuff then
		return _G.GetPlayerBuff(userId, "collectRange")
	end
	return 1.0
end

-- Zone spawn areas (center position, radius)
local SPAWN_ZONES = {
	-- Periodic Table Biome (noord) — meeste atomen
	{center = Vector3.new(0, 15, 2000), radius = 800, weight = 0.4, name = "PeriodicBiome"},
	-- Nexus Hub (centrum)
	{center = Vector3.new(0, 15, 0), radius = 300, weight = 0.15, name = "NexusHub"},
	-- Quantum Lab (oost) — rare elements + quantum dots
	{center = Vector3.new(2000, 35, 0), radius = 300, weight = 0.15, name = "QuantumLab"},
	-- Slakkenspoor Fabriek (west) — V, Fe, Ti, Si, Ca focus
	{center = Vector3.new(-2000, 10, 0), radius = 400, weight = 0.15, name = "Slakkenspoor"},
	-- MolChain Tower area
	{center = Vector3.new(500, 15, 0), radius = 150, weight = 0.075, name = "MolChainTower"},
	-- ANK Kredietunie area
	{center = Vector3.new(-500, 15, 0), radius = 150, weight = 0.075, name = "ANKHub"},
}

-- Slakkenspoor-specifieke elementen (hogere kans in fabriek zone)
local SLAG_ELEMENTS = {23, 26, 22, 14, 20, 25, 24, 12, 13, 8} -- V, Fe, Ti, Si, Ca, Mn, Cr, Mg, Al, O

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local activeAtoms = {}  -- {atomPart = {elementZ, spawnTime, zone}}
local atomCount = 0
local playerCooldowns = {} -- {playerId = lastCollectTime}
local playerCollectCounts = {} -- {playerId = {count, resetTime}}

-- Atoms folder in workspace
local atomsFolder = Instance.new("Folder")
atomsFolder.Name = "Atoms"
atomsFolder.Parent = workspace

-- ══════════════════════════════════════════════
-- ELEMENT SELECTIE (weighted random)
-- ══════════════════════════════════════════════

local function selectElement(zoneName)
	-- Bouw gewogen lijst op basis van rarity
	local weights = Elements.SpawnWeight
	local candidates = {}
	local totalWeight = 0

	for z, elem in pairs(Elements.Table) do
		local w = weights[elem.rarity] or 1

		-- Slakkenspoor zone: boost slag-relevante elementen
		if zoneName == "Slakkenspoor" then
			for _, slagZ in ipairs(SLAG_ELEMENTS) do
				if z == slagZ then
					w = w * 5
					break
				end
			end
		end

		-- Quantum Lab: boost rare en legendary
		if zoneName == "QuantumLab" and (elem.rarity == "rare" or elem.rarity == "epic" or elem.rarity == "legendary") then
			w = w * 3
		end

		totalWeight = totalWeight + w
		table.insert(candidates, {z = z, weight = w, cumulative = totalWeight})
	end

	-- Weighted random selectie
	local roll = math.random() * totalWeight
	for _, c in ipairs(candidates) do
		if roll <= c.cumulative then
			return c.z
		end
	end

	return 1 -- fallback: Hydrogen
end

-- ══════════════════════════════════════════════
-- ATOOM SPAWN
-- ══════════════════════════════════════════════

local function spawnAtomAt(position, elementZ, zoneName)
	if atomCount >= MAX_ATOMS_SERVER then return nil end

	local elem = Elements.Table[elementZ]
	if not elem then return nil end

	-- Maak 3D atoom-bol
	local atom = Instance.new("Part")
	atom.Shape = Enum.PartType.Ball
	atom.Size = Vector3.new(3, 3, 3) * (1 + elem.mass / 80)  -- groter bij zwaardere elementen
	atom.Color = elem.color
	atom.Material = Enum.Material.Neon
	atom.CFrame = CFrame.new(position)
	atom.Anchored = true
	atom.CanCollide = false
	atom.Name = "Atom_" .. elem.sym .. "_" .. tostring(math.random(10000))

	-- Attributes voor client-side interactie
	atom:SetAttribute("ElementZ", elementZ)
	atom:SetAttribute("Symbol", elem.sym)
	atom:SetAttribute("ElementName", elem.name)
	atom:SetAttribute("Rarity", elem.rarity)
	atom:SetAttribute("Interactable", true)
	atom:SetAttribute("InteractionType", "collect")

	-- Floating animatie via AlignPosition
	local attachment = Instance.new("Attachment")
	attachment.Parent = atom

	local alignPos = Instance.new("AlignPosition")
	alignPos.Mode = Enum.PositionAlignmentMode.OneAttachment
	alignPos.Attachment0 = attachment
	alignPos.Position = position + Vector3.new(0, math.sin(tick()) * 1.5, 0)
	alignPos.MaxForce = 10000
	alignPos.Responsiveness = 10
	alignPos.Parent = atom

	-- Rotatie
	local alignOri = Instance.new("AlignOrientation")
	alignOri.Mode = Enum.OrientationAlignmentMode.OneAttachment
	alignOri.Attachment0 = attachment
	alignOri.CFrame = CFrame.Angles(0, tick() * 0.8, 0)
	alignOri.MaxTorque = 10000
	alignOri.Responsiveness = 5
	alignOri.Parent = atom

	-- Billboard label boven atoom
	local bill = Instance.new("BillboardGui")
	bill.Size = UDim2.fromOffset(80, 40)
	bill.StudsOffset = Vector3.new(0, 3, 0)
	bill.AlwaysOnTop = false
	bill.Parent = atom

	local symLabel = Instance.new("TextLabel")
	symLabel.Size = UDim2.fromScale(1, 0.6)
	symLabel.BackgroundTransparency = 1
	symLabel.Text = elem.sym
	symLabel.TextColor3 = elem.color
	symLabel.TextScaled = true
	symLabel.Font = Enum.Font.GothamBold
	symLabel.Parent = bill

	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.fromScale(1, 0.4)
	nameLabel.Position = UDim2.fromScale(0, 0.6)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = elem.name
	nameLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
	nameLabel.TextScaled = true
	nameLabel.Font = Enum.Font.Gotham
	nameLabel.Parent = bill

	-- Particle effect op basis van element groep
	local particle = Instance.new("ParticleEmitter")
	particle.Color = ColorSequence.new(elem.color)
	particle.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.3),
		NumberSequenceKeypoint.new(1, 0),
	})
	particle.Lifetime = NumberRange.new(0.5, 1.5)
	particle.Rate = 5
	particle.Speed = NumberRange.new(0.5, 1.5)
	particle.SpreadAngle = Vector2.new(360, 360)
	particle.LightEmission = 1
	particle.Parent = atom

	-- Rarity-specifieke effecten
	if elem.rarity == "legendary" then
		particle.Rate = 30
		particle.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.8),
			NumberSequenceKeypoint.new(1, 0),
		})
		-- Extra glow
		local light = Instance.new("PointLight")
		light.Color = elem.color
		light.Brightness = 3
		light.Range = 20
		light.Parent = atom
	elseif elem.rarity == "epic" then
		particle.Rate = 15
		local light = Instance.new("PointLight")
		light.Color = elem.color
		light.Brightness = 1.5
		light.Range = 12
		light.Parent = atom
	elseif elem.rarity == "rare" then
		particle.Rate = 10
	end

	atom.Parent = atomsFolder

	-- Track active atom
	activeAtoms[atom] = {
		elementZ = elementZ,
		spawnTime = tick(),
		zone = zoneName,
	}
	atomCount = atomCount + 1

	-- Notify all clients
	Remotes.FireAllClients("AtomSpawned", {
		position = position,
		elementZ = elementZ,
		symbol = elem.sym,
		name = elem.name,
		rarity = elem.rarity,
	})

	return atom
end

-- ══════════════════════════════════════════════
-- SPAWN LOOP
-- ══════════════════════════════════════════════

local function getRandomPositionInZone(zone)
	local angle = math.random() * math.pi * 2
	local dist = math.random() * zone.radius
	return zone.center + Vector3.new(
		math.cos(angle) * dist,
		math.random(-2, 5),
		math.sin(angle) * dist
	)
end

local function spawnWave()
	if #Players:GetPlayers() == 0 then return end

	-- Bepaal hoeveel atomen te spawnen
	local targetCount = math.min(MAX_ATOMS_SERVER, 50 + #Players:GetPlayers() * 20)
	local toSpawn = math.max(0, targetCount - atomCount)

	for i = 1, math.min(toSpawn, 10) do  -- max 10 per wave
		-- Selecteer zone (gewogen)
		local totalWeight = 0
		for _, zone in ipairs(SPAWN_ZONES) do
			totalWeight = totalWeight + zone.weight
		end
		local roll = math.random() * totalWeight
		local selectedZone = SPAWN_ZONES[1]
		local cumulative = 0
		for _, zone in ipairs(SPAWN_ZONES) do
			cumulative = cumulative + zone.weight
			if roll <= cumulative then
				selectedZone = zone
				break
			end
		end

		local pos = getRandomPositionInZone(selectedZone)
		local elementZ = selectElement(selectedZone.name)
		spawnAtomAt(pos, elementZ, selectedZone.name)
	end
end

-- ══════════════════════════════════════════════
-- ATOOM CLEANUP (lifetime expired)
-- ══════════════════════════════════════════════

local function cleanupExpiredAtoms()
	local now = tick()
	for atom, data in pairs(activeAtoms) do
		if now - data.spawnTime > ATOM_LIFETIME then
			activeAtoms[atom] = nil
			atomCount = atomCount - 1
			atom:Destroy()
		end
	end
end

-- ══════════════════════════════════════════════
-- COLLECT HANDLING (server validation)
-- ══════════════════════════════════════════════

local function onRequestCollect(player, atomName)
	-- Rate limiter
	local userId = player.UserId
	local now = tick()

	-- Cooldown check
	if playerCooldowns[userId] and now - playerCooldowns[userId] < COLLECT_COOLDOWN then
		return
	end
	playerCooldowns[userId] = now

	-- Rate limit check (max per minuut)
	if not playerCollectCounts[userId] then
		playerCollectCounts[userId] = {count = 0, resetTime = now + 60}
	end
	local rateData = playerCollectCounts[userId]
	if now > rateData.resetTime then
		rateData.count = 0
		rateData.resetTime = now + 60
	end
	if rateData.count >= MAX_COLLECTS_PER_MINUTE then
		return
	end

	-- Vind het atoom
	local atom = atomsFolder:FindFirstChild(atomName)
	if not atom then return end

	local data = activeAtoms[atom]
	if not data then return end

	-- Positie validatie (anti-teleport)
	local character = player.Character
	if not character then return end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	local distance = (hrp.Position - atom.Position).Magnitude
	local effectiveRange = COLLECT_RANGE * getCollectRangeMultiplier(player.UserId)
	if distance > effectiveRange then
		warn("[AtomSpawner] Collect te ver:", player.Name, distance, "studs")
		return
	end

	-- Collect succesvol!
	local elementZ = data.elementZ
	local elem = Elements.Table[elementZ]

	-- Verwijder atoom uit wereld
	activeAtoms[atom] = nil
	atomCount = atomCount - 1
	atom:Destroy()

	rateData.count = rateData.count + 1

	-- MolCoin reward op basis van rarity
	local coinReward = 1
	if elem.rarity == "uncommon" then coinReward = 3
	elseif elem.rarity == "rare" then coinReward = 10
	elseif elem.rarity == "epic" then coinReward = 25
	elseif elem.rarity == "legendary" then coinReward = 100
	end

	-- Secure server-side bridge (not spoofable by client)
	PlayerDataBridge.RecordAtomCollect(player.UserId, elementZ, elem.sym, coinReward)

	-- Mining milestones (total atoms collected across all sessions)
	local previousCollectedCount = PlayerDataBridge.GetAtomCollectedCount(player.UserId)
	local newCollectedCount = PlayerDataBridge.RecordAtomCollected(player.UserId)
	for _, milestone in ipairs(MiningMilestones.CheckNewlyUnlocked(previousCollectedCount, newCollectedCount)) do
		PlayerDataBridge.AddRewardMolCoins(player.UserId, milestone.molCoinsReward)
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Milestone unlocked: " .. milestone.name .. "! +" .. milestone.molCoinsReward .. " MolCoins",
			rarity = "rare",
		})
	end

	-- Notify client
	Remotes.FireClient("AtomCollected", player, {
		elementZ = elementZ,
		symbol = elem.sym,
		name = elem.name,
		rarity = elem.rarity,
		coinReward = coinReward,
	})

	-- Server announce voor zeldzame elementen
	if elem.rarity == "epic" or elem.rarity == "legendary" then
		Remotes.FireAllClients("ServerAnnounce", {
			message = player.Name .. " vond " .. elem.name .. " (" .. elem.sym .. ")!",
			rarity = elem.rarity,
		})
	end
end

-- Connect remote event
Remotes.RequestAtomCollect.OnServerEvent:Connect(onRequestCollect)

-- ══════════════════════════════════════════════
-- PLAYER CLEANUP
-- ══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	playerCooldowns[player.UserId] = nil
	playerCollectCounts[player.UserId] = nil
end)

-- ══════════════════════════════════════════════
-- MAIN LOOPS
-- ══════════════════════════════════════════════

-- Initial burst: spawn atoms faster for first 5 minutes so new players find atoms quickly
task.spawn(function()
	for _ = 1, 10 do
		spawnWave()
		task.wait(3) -- rapid spawn for 30 seconds
	end
end)

-- Regular spawn loop
task.spawn(function()
	while true do
		spawnWave()
		task.wait(SPAWN_INTERVAL_COMMON)
	end
end)

-- Cleanup loop
task.spawn(function()
	while true do
		cleanupExpiredAtoms()
		task.wait(10)
	end
end)

-- NOTE: Float animation moved to client-side (AtomCollector.client.lua)
-- Server no longer iterates 500 atoms every 0.1s for visual-only updates

-- Initial spawn burst wanneer eerste speler joint
Players.PlayerAdded:Connect(function(player)
	if #Players:GetPlayers() == 1 then
		-- Eerste speler: spawn initieel burst
		for i = 1, 30 do
			spawnWave()
			task.wait(0.1)
		end
	end
end)

print("[MOLGANG] AtomSpawner initialized - max", MAX_ATOMS_SERVER, "atoms")
