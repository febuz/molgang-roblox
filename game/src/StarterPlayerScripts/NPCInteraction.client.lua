--[[
	NPCInteraction.client.lua
	MOLGANG NPC Dialogue Interaction System

	Allows players to interact with NPCs by pressing E key
	Shows dialogue bubbles and trust level
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- UI SETUP
-- ══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "NPCDialogueGui"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

-- Dialogue bubble (shown above NPC heads)
local dialogueBubble = Instance.new("Frame")
dialogueBubble.Name = "DialogueBubble"
dialogueBubble.Size = UDim2.new(0, 300, 0, 100)
dialogueBubble.BackgroundColor3 = Color3.fromRGB(30, 30, 45)
dialogueBubble.BackgroundTransparency = 0.1
dialogueBubble.Visible = false
dialogueBubble.Parent = screenGui

-- Round corners
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 8)
corner.Parent = dialogueBubble

-- Dialogue text
local dialogueText = Instance.new("TextLabel")
dialogueText.Name = "Text"
dialogueText.Size = UDim2.new(1, -10, 1, -25)
dialogueText.Position = UDim2.new(0, 5, 0, 5)
dialogueText.BackgroundTransparency = 1
dialogueText.Text = ""
dialogueText.TextColor3 = Color3.fromRGB(240, 240, 250)
dialogueText.TextScaled = true
dialogueText.TextWrapped = true
dialogueText.Font = Enum.Font.Gotham
dialogueText.Parent = dialogueBubble

-- NPC name
local npcNameLabel = Instance.new("TextLabel")
npcNameLabel.Name = "NPCName"
npcNameLabel.Size = UDim2.new(1, -10, 0, 20)
npcNameLabel.Position = UDim2.new(0, 5, 1, -20)
npcNameLabel.BackgroundTransparency = 1
npcNameLabel.Text = "NPC Name"
npcNameLabel.TextColor3 = Color3.fromRGB(0, 200, 120)
npcNameLabel.TextScaled = true
npcNameLabel.Font = Enum.Font.GothamBold
npcNameLabel.Parent = dialogueBubble

-- ══════════════════════════════════════════════
-- INTERACTION STATE
-- ══════════════════════════════════════════════

local nearbyNPC = nil
local lastInteractionTime = 0
local INTERACTION_COOLDOWN = 2  -- seconds between interactions

-- ══════════════════════════════════════════════
-- E KEY LISTENER
-- ══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode ~= Enum.KeyCode.E then return end

	if not nearbyNPC then
		return  -- Not near an NPC
	end

	local now = tick()
	if now - lastInteractionTime < INTERACTION_COOLDOWN then
		return  -- Cooldown active
	end

	lastInteractionTime = now

	-- Request interaction from server
	Remotes.FireServer("RequestNPCInteract", nearbyNPC)
	print("[NPCInteraction] Interacting with:", nearbyNPC)
end)

-- ══════════════════════════════════════════════
-- TRACK NEARBY NPC VIA ATTRIBUTE
-- ══════════════════════════════════════════════

RunService.Heartbeat:Connect(function()
	local char = player.Character
	if not char or not char:FindFirstChild("HumanoidRootPart") then return end

	-- Check player attributes for nearby NPC (set by server proximity loop)
	if player:GetAttribute("NearbyNPC") then
		nearbyNPC = player:GetAttribute("NearbyNPC")
	else
		nearbyNPC = nil
	end

	-- Show/hide proximity hint
	-- TODO: Add "Press E to interact" hint when nearbyNPC is set
end)

-- ══════════════════════════════════════════════
-- DIALOGUE DISPLAY
-- ══════════════════════════════════════════════

Remotes.NPCDialogue.OnClientEvent:Connect(function(data)
	if not data then return end

	local npcName = data.npcName or "NPC"
	local text = data.text or "..."
	local trustLevel = data.trustLevel or 0.5

	-- Update bubble
	npcNameLabel.Text = npcName
	dialogueText.Text = text

	-- Color based on trust (red=low, green=high)
	local trustColor = Color3.new(1, trustLevel, 0)
	npcNameLabel.TextColor3 = trustColor

	-- Show bubble
	dialogueBubble.Visible = true

	-- Position bubble at screen center (could be enhanced to follow NPC head)
	dialogueBubble.Position = UDim2.new(0.5, -150, 0.5, -100)

	-- Auto-hide after 5 seconds
	task.delay(5, function()
		dialogueBubble.Visible = false
	end)

	print("[NPCInteraction] Dialogue from", npcName)
end)

print("[NPCInteraction] Loaded — Press E near NPCs to interact")
