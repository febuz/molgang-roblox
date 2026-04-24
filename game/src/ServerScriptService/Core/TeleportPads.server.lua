--[[
	TeleportPads.server.lua
	MOLGANG — Teleport pads for fast travel to mining outposts (#28)

	Pads created by WorldBuilder with TeleportTarget attribute.
	Player steps on pad → teleported to target location.
]]

local Players = game:GetService("Players")

local COOLDOWN = 3 -- seconds between teleports per player
local playerCooldowns = {}

local function onTouched(hit, pad)
	local character = hit.Parent
	if not character then return end
	local humanoid = character:FindFirstChild("Humanoid")
	if not humanoid or humanoid.Health <= 0 then return end

	local player = Players:GetPlayerFromCharacter(character)
	if not player then return end

	local now = tick()
	if playerCooldowns[player.UserId] and (now - playerCooldowns[player.UserId]) < COOLDOWN then
		return
	end

	local target = pad:GetAttribute("TeleportTarget")
	if not target then return end

	playerCooldowns[player.UserId] = now

	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp then
		hrp.CFrame = CFrame.new(target + Vector3.new(0, 5, 0))
	end
end

-- Wait for pads to be created by WorldBuilder
task.delay(5, function()
	for _, obj in workspace:GetDescendants() do
		if obj:IsA("BasePart") and obj.Name:find("TeleportPad") then
			obj.Touched:Connect(function(hit) onTouched(hit, obj) end)
		end
	end
end)

Players.PlayerRemoving:Connect(function(player)
	playerCooldowns[player.UserId] = nil
end)

print("[MOLGANG] TeleportPads initialized — fast travel to mining outposts")
