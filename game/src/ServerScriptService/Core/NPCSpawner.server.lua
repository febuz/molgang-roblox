--[[
	NPCSpawner.server.lua
	MOLGANG NPC World Placement System

	Spawns NPC characters at specific world locations:
	- Direk at spawn (Centrum)
	- Prof. Femke at Periodic Table Biome (Noord)
	- Ank at ANK Kredietunie (Centrum-West)
	- Yuki at Quantum Lab (Oost)

	NPCs can be approached for dialogue & rewards
]]

local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ═══════════════════════════════════════════════
-- NPC SPAWN LOCATIONS
-- ═══════════════════════════════════════════════

local NPC_SPAWNS = {
	{
		name = "Direk",
		position = Vector3.new(0, 50, -50),
		zone = "Centrum",
		role = "Tutorial Guide",
		description = "Helps new players learn the basics",
	},
	{
		name = "Prof. Femke",
		position = Vector3.new(2000, 50, 0),
		zone = "Noord",
		role = "Chemistry Expert",
		description = "Teaches about chemistry & molecules",
	},
	{
		name = "Ank",
		position = Vector3.new(-500, 50, 500),
		zone = "Centrum-West",
		role = "Cooperative Lender",
		description = "Offers loans & financial advice",
	},
	{
		name = "Yuki",
		position = Vector3.new(0, 50, 2000),
		zone = "Oost",
		role = "Mahjong Master",
		description = "Teaches Mahjong & relaxation",
	},
}

-- ═══════════════════════════════════════════════
-- NPC CREATION
-- ═══════════════════════════════════════════════

local function createNPC(config)
	-- Create folder for NPC
	local npcFolder = Instance.new("Folder")
	npcFolder.Name = config.name
	npcFolder.Parent = Workspace

	-- Create NPC body (simple humanoid model)
	local humanoidRootPart = Instance.new("Part")
	humanoidRootPart.Name = "HumanoidRootPart"
	humanoidRootPart.Shape = Enum.PartType.Ball
	humanoidRootPart.Size = Vector3.new(2, 2, 2)
	humanoidRootPart.Color = Color3.fromRGB(100, 200, 255)
	humanoidRootPart.Material = Enum.Material.Neon
	humanoidRootPart.CanCollide = true
	humanoidRootPart.CFrame = CFrame.new(config.position + Vector3.new(0, 5, 0))
	humanoidRootPart.Parent = npcFolder

	-- Create humanoid
	local humanoid = Instance.new("Humanoid")
	humanoid.Parent = npcFolder

	-- NPC info (metadata)
	npcFolder:SetAttribute("NPCName", config.name)
	npcFolder:SetAttribute("Role", config.role)
	npcFolder:SetAttribute("Zone", config.zone)
	npcFolder:SetAttribute("InteractionRange", 30)

	-- Add to NPC collection
	CollectionService:AddTag(npcFolder, "NPC")

	-- Create interaction detector
	task.spawn(function()
		while npcFolder.Parent do
			task.wait(1)

			-- Check if any player is nearby
			for _, player in ipairs(Players:GetPlayers()) do
				local char = player.Character
				if not char or not char:FindFirstChild("HumanoidRootPart") then continue end

				local distance = (humanoidRootPart.Position - char.HumanoidRootPart.Position).Magnitude
				local interactionRange = npcFolder:GetAttribute("InteractionRange") or 30

				if distance < interactionRange then
					-- Player is nearby - could trigger dialogue
					player:SetAttribute("NearbyNPC", config.name)
				else
					if player:GetAttribute("NearbyNPC") == config.name then
						player:SetAttribute("NearbyNPC", nil)
					end
				end
			end
		end
	end)

	print("[NPCSpawner] Spawned NPC:", config.name, "at", config.position)
	return npcFolder
end

-- ═══════════════════════════════════════════════
-- NPC INTERACTION
-- ═══════════════════════════════════════════════

Remotes.RequestNPCInteract.OnServerEvent:Connect(function(player, npcName)
	-- Verify player is near NPC
	local npc = nil
	for _, child in ipairs(Workspace:GetChildren()) do
		if child:IsA("Folder") and child:GetAttribute("NPCName") == npcName then
			npc = child
			break
		end
	end

	if not npc then return end

	local char = player.Character
	if not char or not char:FindFirstChild("HumanoidRootPart") then return end

	local humanoidRootPart = npc:FindFirstChild("HumanoidRootPart")
	if not humanoidRootPart then return end

	local distance = (humanoidRootPart.Position - char.HumanoidRootPart.Position).Magnitude
	if distance > 40 then return end  -- Too far away

	-- NPC interaction successful
	Remotes.FireClient("NPCDialogue", player, {
		npcName = npcName,
		role = npc:GetAttribute("Role"),
	})

	print("[NPCSpawner]", player.Name, "interacted with", npcName)
end)

-- ═══════════════════════════════════════════════
-- SPAWN ALL NPCs
-- ═══════════════════════════════════════════════

for _, npcConfig in ipairs(NPC_SPAWNS) do
	createNPC(npcConfig)
end

print("[NPCSpawner] Initialized —", #NPC_SPAWNS, "NPCs spawned in world")
