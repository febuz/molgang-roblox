--[[
	TeleportPads.server.lua
	MOLGANG — Teleport pads for fast travel to mining outposts (#28)

	Pads created by WorldBuilder with TeleportTarget attribute.
	Player steps on pad → teleported to target location.
]]

local Players = game:GetService("Players")

local COOLDOWN = 3 -- seconds between teleports per player
local playerCooldowns = {}
local boundPads = {}

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

local function findNexusSpawn()
	local spawn = workspace:FindFirstChild("MolGangSpawn", true)
	return spawn and spawn:IsA("BasePart") and spawn or nil
end

local function nexusCFrame()
	local spawn = findNexusSpawn()
	if spawn then
		-- Keep the player above the actual safe pad; this follows world-builder
		-- changes instead of silently depending on one hardcoded coordinate.
		return spawn.CFrame + Vector3.new(0, 5, 0)
	end
	return CFrame.new(0, 15, 0) -- startup fallback before world construction
end

local function returnToNexus(player)
	local now = os.clock()
	if playerCooldowns[player.UserId] and now - playerCooldowns[player.UserId] < COOLDOWN then
		return
	end
	local character = player.Character
	local hrp = character and character:FindFirstChild("HumanoidRootPart")
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not hrp or not humanoid or humanoid.Health <= 0 then return end
	-- Server-owned destination; the client cannot supply an arbitrary CFrame.
	playerCooldowns[player.UserId] = now
	character:PivotTo(nexusCFrame())
	hrp.AssemblyLinearVelocity = Vector3.zero
	hrp.AssemblyAngularVelocity = Vector3.zero
	humanoid:ChangeState(Enum.HumanoidStateType.GettingUp)
	print("[TeleportPads] " .. player.Name .. " returned to Nexus Hub")
end

Remotes.RequestReturnToNexus.OnServerEvent:Connect(returnToNexus)

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
	local targetCFrame
	if pad:GetAttribute("TeleportName") == "Nexus Hub" then
		-- Keep the physical return pad and the HUD return action on the same
		-- server-owned safe spawn. The attribute remains for diagnostics and
		-- compatibility with older generated pads.
		targetCFrame = nexusCFrame()
	elseif typeof(target) == "Vector3" then
		targetCFrame = CFrame.new(target + Vector3.new(0, 5, 0))
	else
		return
	end

	playerCooldowns[player.UserId] = now

	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp then
		character:PivotTo(targetCFrame)
		hrp.AssemblyLinearVelocity = Vector3.zero
		hrp.AssemblyAngularVelocity = Vector3.zero
	end
end

local function bindPad(obj)
	if not obj:IsA("BasePart") or not obj.Name:find("TeleportPad") or boundPads[obj] then return end
	boundPads[obj] = true
	obj.Touched:Connect(function(hit) onTouched(hit, obj) end)
	local prompt = obj:FindFirstChild("ReturnToNexusPrompt")
	if prompt and prompt:IsA("ProximityPrompt") then
		prompt.Triggered:Connect(function(player)
			if obj:GetAttribute("TeleportName") == "Nexus Hub" then
				returnToNexus(player)
			end
		end)
	end
end

-- Wait for pads to be created by WorldBuilder
task.delay(5, function()
	for _, obj in workspace:GetDescendants() do
		bindPad(obj)
	end
	workspace.DescendantAdded:Connect(bindPad)
end)

Players.PlayerRemoving:Connect(function(player)
	playerCooldowns[player.UserId] = nil
end)

print("[MOLGANG] TeleportPads initialized — fast travel to mining outposts")
