-- ServerScriptService/Core/VoidKillZone.server.lua
-- Respawns players who fall below the floating archipelago
-- Prevents infinite falling in the void

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local KILL_Y = -80  -- below all platforms (lowest is ~-15 at Lanthanide Reef)
local CHECK_INTERVAL = 1  -- seconds between checks
local SAFE_OFFSET = Vector3.new(0, 5, 0)

local function findSafeSpawn()
	local spawn = workspace:FindFirstChild("MolGangSpawn", true)
	return spawn and spawn:IsA("BasePart") and spawn or nil
end

local function recoverPlayer(character, humanoid, hrp)
	local spawn = findSafeSpawn()
	if not spawn then
		-- Keep the old fail-safe if world construction has not completed yet.
		humanoid.Health = 0
		return
	end

	-- A fall is a traversal failure, not a player death. Teleporting the live
	-- character avoids the death/respawn UI cycle and preserves active work.
	character:PivotTo(spawn.CFrame + SAFE_OFFSET)
	hrp.AssemblyLinearVelocity = Vector3.zero
	hrp.AssemblyAngularVelocity = Vector3.zero
	humanoid:ChangeState(Enum.HumanoidStateType.GettingUp)
end

task.spawn(function()
	while true do
		for _, player in ipairs(Players:GetPlayers()) do
			local character = player.Character
			if character then
				local hrp = character:FindFirstChild("HumanoidRootPart")
				local humanoid = character:FindFirstChild("Humanoid")
				if hrp and humanoid and hrp.Position.Y < KILL_Y then
					recoverPlayer(character, humanoid, hrp)
				end
			end
		end
		task.wait(CHECK_INTERVAL)
	end
end)

print("[MOLGANG] Void kill zone active at Y <", KILL_Y)
