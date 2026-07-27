--[[
	NPCDialogueGui.client.lua
	MOLGANG NPC Dialogue UI

	Shows dialogue popups when talking to NPCs
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local ResponsiveGui = require(ReplicatedStorage.Modules.ResponsiveGui)

local NPCDialogues = require(ReplicatedStorage.Modules.NPCDialogues)

-- COLOR PALETTE
local COLORS = {
	background    = Color3.fromRGB(20, 20, 30),
	panel         = Color3.fromRGB(30, 30, 45),
	panelLight    = Color3.fromRGB(45, 45, 65),
	accent        = Color3.fromRGB(0, 200, 120),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(180, 180, 200),
}

local function createCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or 8)
	corner.Parent = parent
	return corner
end

-- DIALOGUE SCREEN GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "NPCDialogueGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 25
screenGui.Enabled = false
screenGui.Parent = playerGui
ResponsiveGui.Attach(screenGui, 600, 300)

-- Semi-transparent background (for focus)
local bgOverlay = Instance.new("Frame")
bgOverlay.Name = "BgOverlay"
bgOverlay.Size = UDim2.new(1, 0, 1, 0)
bgOverlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
bgOverlay.BackgroundTransparency = 0.6
bgOverlay.Parent = screenGui

-- Dialogue box
local dialogueBox = Instance.new("Frame")
dialogueBox.Name = "DialogueBox"
dialogueBox.Size = UDim2.new(0, 600, 0, 300)
dialogueBox.AnchorPoint = Vector2.new(0.5, 0.5)
dialogueBox.Position = UDim2.fromScale(0.5, 0.5)
dialogueBox.BackgroundColor3 = COLORS.panel
dialogueBox.BackgroundTransparency = 0.05
dialogueBox.Parent = screenGui
createCorner(dialogueBox, 12)

-- NPC portrait/name
local npcHeader = Instance.new("Frame")
npcHeader.Name = "NPCHeader"
npcHeader.Size = UDim2.new(1, 0, 0, 60)
npcHeader.BackgroundColor3 = COLORS.panelLight
npcHeader.BackgroundTransparency = 0.3
npcHeader.Parent = dialogueBox

local npcNameLabel = Instance.new("TextLabel")
npcNameLabel.Name = "NPCName"
npcNameLabel.Size = UDim2.new(0.7, 0, 1, 0)
npcNameLabel.BackgroundTransparency = 1
npcNameLabel.Text = "NPC Name"
npcNameLabel.TextColor3 = COLORS.accent
npcNameLabel.TextScaled = true
npcNameLabel.Font = Enum.Font.GothamBold
npcNameLabel.TextXAlignment = Enum.TextXAlignment.Left
npcNameLabel.Parent = npcHeader

local npcRoleLabel = Instance.new("TextLabel")
npcRoleLabel.Name = "NPCRole"
npcRoleLabel.Size = UDim2.new(0.7, 0, 1, 0)
npcRoleLabel.BackgroundTransparency = 1
npcRoleLabel.Text = ""
npcRoleLabel.TextColor3 = COLORS.textSecondary
npcRoleLabel.TextScaled = true
npcRoleLabel.Font = Enum.Font.Gotham
npcRoleLabel.TextXAlignment = Enum.TextXAlignment.Left
npcRoleLabel.Parent = npcHeader

-- Dialogue text
local dialogueText = Instance.new("TextLabel")
dialogueText.Name = "DialogueText"
dialogueText.Size = UDim2.new(1, -20, 1, -120)
dialogueText.Position = UDim2.new(0, 10, 0, 60)
dialogueText.BackgroundTransparency = 1
dialogueText.Text = "..."
dialogueText.TextColor3 = COLORS.textPrimary
dialogueText.TextScaled = true
dialogueText.Font = Enum.Font.Gotham
dialogueText.TextWrapped = true
dialogueText.TextYAlignment = Enum.TextYAlignment.Top
dialogueText.Parent = dialogueBox

-- Continue button
local continueBtn = Instance.new("TextButton")
continueBtn.Name = "ContinueBtn"
continueBtn.Size = UDim2.new(0, 150, 0, 40)
continueBtn.Position = UDim2.new(0.5, -75, 1, -50)
continueBtn.BackgroundColor3 = COLORS.accent
continueBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
continueBtn.Text = "Continue →"
continueBtn.Font = Enum.Font.GothamBold
continueBtn.TextScaled = true
continueBtn.Parent = dialogueBox
createCorner(continueBtn, 6)

-- ═════════════════════════════════════════════
-- DIALOGUE SYSTEM
-- ═════════════════════════════════════════════

local currentNPC = nil
local currentDialogueIndex = 1
local dialogueActive = false

local function showDialogue(npcName, payload)
	local npc = NPCDialogues.GetNPC(npcName)
	if not npc then return end

	currentNPC = npc
	currentDialogueIndex = 1
	dialogueActive = true

	screenGui.Enabled = true

	npcNameLabel.Text = npc.name
	npcRoleLabel.Text = npc.role

	-- Server-authored text takes precedence over the static greeting.
	dialogueText.Text = type(payload) == "table" and (payload.text or payload.dialogue)
		or npc.greeting
end

local function advanceDialogue()
	if not currentNPC then return end
	if currentDialogueIndex <= #currentNPC.dialogues then
		local dialogue = currentNPC.dialogues[currentDialogueIndex]
		dialogueText.Text = dialogue.text

		-- Show rewards
		if dialogue.rewards then
			if dialogue.rewards.molCoins then
				dialogueText.Text = dialogueText.Text .. "\n\n💰 +" .. dialogue.rewards.molCoins .. " MolCoins"
			end
			if dialogue.rewards.badge then
				dialogueText.Text = dialogueText.Text .. "\n🏅 Badge: " .. dialogue.rewards.badge
			end
		end

		currentDialogueIndex = currentDialogueIndex + 1
	else
		-- End dialogue
		screenGui.Enabled = false
		dialogueActive = false
		currentNPC = nil
	end
end

-- Connect once. Connecting inside showDialogue stacked callbacks after every
-- conversation and made later clicks advance multiple NPC dialogues at once.
continueBtn.Activated:Connect(advanceDialogue)

-- Listen for NPC dialogue requests
Remotes.NPCDialogue.OnClientEvent:Connect(function(data)
	if type(data) == "table" and data.npcName then
		showDialogue(data.npcName, data)
	end
end)

-- ═════════════════════════════════════════════
-- KEYBOARD SHORTCUT
-- ═════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	-- ESC to close
	if input.KeyCode == Enum.KeyCode.Escape and dialogueActive then
		screenGui.Enabled = false
		dialogueActive = false
	end
end)

-- Export functions
_G.NPCTalk = function(npcName)
	showDialogue(npcName)
end

print("[NPCDialogueGui] Loaded — Call _G.NPCTalk('NpcName') to trigger dialogue")
