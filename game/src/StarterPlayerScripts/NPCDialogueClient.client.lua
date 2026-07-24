-- StarterPlayerScripts/NPCDialogueClient.client.lua
-- Client-side NPC dialogue display for MOLGANG
-- Shows speech bubbles, trust indicators, and interaction prompts
-- Handles NPC proximity detection and dialogue UI

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ProximityPromptService = game:GetService("ProximityPromptService")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- ══════════════════════════════════════════════
-- DIALOGUE UI
-- ══════════════════════════════════════════════

local dialogueGui = Instance.new("ScreenGui")
dialogueGui.Name = "NPCDialogueGui"
dialogueGui.ResetOnSpawn = false
dialogueGui.Parent = playerGui

-- Dialogue box (bottom center)
local dialogueFrame = Instance.new("Frame")
dialogueFrame.Size = UDim2.new(0.6, 0, 0, 120)
dialogueFrame.Position = UDim2.new(0.2, 0, 1, 0) -- hidden below screen
dialogueFrame.AnchorPoint = Vector2.new(0, 1)
dialogueFrame.BackgroundColor3 = Color3.fromRGB(8, 15, 12)
dialogueFrame.BackgroundTransparency = 0.1
dialogueFrame.BorderSizePixel = 0
dialogueFrame.Visible = false
dialogueFrame.Parent = dialogueGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 10)
corner.Parent = dialogueFrame

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(34, 197, 94)
stroke.Thickness = 2
stroke.Parent = dialogueFrame

-- NPC name label
local nameLabel = Instance.new("TextLabel")
nameLabel.Size = UDim2.new(0.5, 0, 0, 24)
nameLabel.Position = UDim2.fromOffset(12, 6)
nameLabel.BackgroundTransparency = 1
nameLabel.Text = ""
nameLabel.TextColor3 = Color3.fromRGB(34, 197, 94)
nameLabel.TextScaled = true
nameLabel.Font = Enum.Font.GothamBold
nameLabel.TextXAlignment = Enum.TextXAlignment.Left
nameLabel.Parent = dialogueFrame

-- Trust indicator
local trustLabel = Instance.new("TextLabel")
trustLabel.Size = UDim2.new(0.3, 0, 0, 18)
trustLabel.Position = UDim2.new(1, -12, 0, 8)
trustLabel.AnchorPoint = Vector2.new(1, 0)
trustLabel.BackgroundTransparency = 1
trustLabel.Text = ""
trustLabel.TextColor3 = Color3.fromRGB(150, 180, 160)
trustLabel.TextScaled = true
trustLabel.Font = Enum.Font.Gotham
trustLabel.TextXAlignment = Enum.TextXAlignment.Right
trustLabel.Parent = dialogueFrame

-- Dialogue text (typewriter effect)
local textLabel = Instance.new("TextLabel")
textLabel.Size = UDim2.new(1, -24, 1, -36)
textLabel.Position = UDim2.fromOffset(12, 32)
textLabel.BackgroundTransparency = 1
textLabel.Text = ""
textLabel.TextColor3 = Color3.fromRGB(200, 230, 210)
textLabel.TextScaled = true
textLabel.Font = Enum.Font.Gotham
textLabel.TextXAlignment = Enum.TextXAlignment.Left
textLabel.TextYAlignment = Enum.TextYAlignment.Top
textLabel.TextWrapped = true
textLabel.Parent = dialogueFrame

-- "Click to continue" hint
local continueHint = Instance.new("TextLabel")
continueHint.Size = UDim2.new(1, 0, 0, 16)
continueHint.Position = UDim2.new(0, 0, 1, -18)
continueHint.BackgroundTransparency = 1
continueHint.Text = "[Click to dismiss]"
continueHint.TextColor3 = Color3.fromRGB(80, 110, 90)
continueHint.TextScaled = true
continueHint.Font = Enum.Font.Gotham
continueHint.Parent = dialogueFrame

-- ══════════════════════════════════════════════
-- TYPEWRITER EFFECT
-- ══════════════════════════════════════════════

local typewriterTask = nil
local hideDialogue

local function showDialogue(npcName, text, trustLevel)
	-- Cancel previous typewriter
	if typewriterTask then
		task.cancel(typewriterTask)
	end

	nameLabel.Text = npcName
	textLabel.Text = ""

	-- Trust display
	local trustBars = math.floor((trustLevel or 0.3) * 5)
	local trustText = string.rep("|", trustBars) .. string.rep(".", 5 - trustBars)
	trustLabel.Text = "Trust [" .. trustText .. "]"

	-- Color based on trust
	if trustLevel >= 0.8 then
		stroke.Color = Color3.fromRGB(255, 215, 0) -- gold
	elseif trustLevel >= 0.5 then
		stroke.Color = Color3.fromRGB(34, 197, 94) -- green
	else
		stroke.Color = Color3.fromRGB(150, 180, 160) -- grey
	end

	-- Show frame (slide up)
	dialogueFrame.Visible = true
	TweenService:Create(dialogueFrame, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Position = UDim2.new(0.2, 0, 1, -20),
	}):Play()

	-- Typewriter effect
	typewriterTask = task.spawn(function()
		for i = 1, #text do
			textLabel.Text = string.sub(text, 1, i)
			task.wait(0.025)
		end
	end)

	-- Auto-dismiss after 8 seconds
	task.delay(8, function()
		hideDialogue()
	end)
end

hideDialogue = function()
	TweenService:Create(dialogueFrame, TweenInfo.new(0.3), {
		Position = UDim2.new(0.2, 0, 1, 0),
	}):Play()
	task.delay(0.3, function()
		dialogueFrame.Visible = false
	end)
end

-- Click to dismiss
dialogueFrame.InputBegan:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1
		or input.UserInputType == Enum.UserInputType.Touch then
		hideDialogue()
	end
end)

-- ══════════════════════════════════════════════
-- LISTEN FOR SERVER DIALOGUE EVENTS
-- ══════════════════════════════════════════════

Remotes.NPCDialogue.OnClientEvent:Connect(function(data)
	if data and data.npcName and data.text then
		showDialogue(data.npcName, data.text, data.trustLevel or 0.3)
	end
end)

-- Trust change notification
Remotes.NPCTrustChanged.OnClientEvent:Connect(function(data)
	if data and data.npcName then
		local direction = (data.change or 0) > 0 and "+" or ""
		local color = (data.change or 0) > 0 and Color3.fromRGB(34, 197, 94) or Color3.fromRGB(239, 68, 68)

		-- Small floating text
		local popup = Instance.new("ScreenGui")
		popup.Parent = playerGui

		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromOffset(200, 24)
		label.Position = UDim2.new(0.5, -100, 0.6, 0)
		label.BackgroundTransparency = 1
		label.Text = data.npcName .. " trust " .. direction .. string.format("%.0f%%", (data.change or 0) * 100)
		label.TextColor3 = color
		label.TextScaled = true
		label.Font = Enum.Font.GothamBold
		label.Parent = popup

		TweenService:Create(label, TweenInfo.new(2), {
			Position = UDim2.new(0.5, -100, 0.5, 0),
			TextTransparency = 1,
		}):Play()

		task.delay(2.2, function() popup:Destroy() end)
	end
end)

-- ══════════════════════════════════════════════
-- PROXIMITY PROMPT HANDLING
-- ══════════════════════════════════════════════

ProximityPromptService.PromptTriggered:Connect(function(prompt, triggerPlayer)
	if triggerPlayer ~= player then return end

	local npcModel = prompt.Parent
	if not npcModel then return end

	local npcName = npcModel:GetAttribute("NPCName")
	if npcName then
		Remotes.FireServer("RequestNPCInteract", npcName)
	end
end)

print("[MOLGANG] NPCDialogueClient initialized")
