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

-- NPCDialogueGui.client.lua owns the single dialogue ScreenGui. This script
-- only handles trust indicators and proximity prompts; creating a second
-- ScreenGui here caused duplicate NPCDialogueGui instances and overlapping
-- modal layers.

-- Trust change notification
Remotes.NPCTrustChanged.OnClientEvent:Connect(function(data)
	if data and data.npcId and data.newTrust then
		local npcFolder = workspace:FindFirstChild("NPCs")
		if npcFolder then
			for _, model in ipairs(npcFolder:GetChildren()) do
				if model:GetAttribute("NPCId") == data.npcId then
					local head = model:FindFirstChild("Head")
					local billboard = head and head:FindFirstChild("NPCBillboard")
					local label = billboard and billboard:FindFirstChild("TrustLabel")
					if label then
						local trust = math.clamp(data.newTrust, 0, 1)
						label.Text = "Trust: " .. math.floor(trust * 100) .. "%"
						label.TextColor3 = trust >= 0.6
							and Color3.fromRGB(100, 255, 100)
							or (trust >= 0.3 and Color3.fromRGB(255, 220, 100) or Color3.fromRGB(255, 100, 100))
					end
					break
				end
			end
		end
	end
	if data and data.npcName and data.change then
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
