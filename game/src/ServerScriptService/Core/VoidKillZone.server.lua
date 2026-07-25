-- ServerScriptService/Core/VoidKillZone.server.lua
-- Respawns players who fall below the floating archipelago
-- Prevents infinite falling in the void

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SpawnSafety = require(ReplicatedStorage.Modules.SpawnSafety)

local KILL_Y = -35  -- recover before a normal traversal becomes a long void fall
local CHECK_INTERVAL = 0.25  -- responsive without adding meaningful server load
local SAFE_OFFSET = Vector3.new(0, 5, 0)

local function findSafeSpawn()
	local spawn = workspace:FindFirstChild("MolGangSpawn", true)
	return spawn and spawn:IsA("BasePart") and spawn or nil
end

local function recoverPlayer(character, humanoid, hrp, spawn)
	-- A fall is a traversal failure, not a player death. Teleporting the live
	-- character avoids the death/respawn UI cycle and preserves active work.
	character:PivotTo(spawn.CFrame + SAFE_OFFSET)
	hrp.AssemblyLinearVelocity = Vector3.zero
	hrp.AssemblyAngularVelocity = Vector3.zero
	humanoid:ChangeState(Enum.HumanoidStateType.GettingUp)
end

-- A character can be created before WorldBuilder publishes the real spawn.
-- Stage that character and place it once the complete world is ready; this
-- closes the startup race that otherwise leaves players falling through the
-- still-building archipelago.
local function stageCharacterUntilWorldReady(character)
	if workspace:GetAttribute("MoleculiaReady") == true then return end
	task.spawn(function()
		local deadline = os.clock() + 60
		while character.Parent and os.clock() < deadline do
			local spawn = findSafeSpawn()
			if workspace:GetAttribute("MoleculiaReady") == true and spawn then
				local hrp = character:FindFirstChild("HumanoidRootPart")
				local humanoid = character:FindFirstChild("Humanoid")
				if hrp and humanoid and humanoid.Health > 0 then
					recoverPlayer(character, humanoid, hrp, spawn)
				end
				return
			end
			task.wait(0.25)
		end
	end)
end

local function watchPlayer(player)
	player.CharacterAdded:Connect(stageCharacterUntilWorldReady)
	if player.Character then
		stageCharacterUntilWorldReady(player.Character)
	end
end

Players.PlayerAdded:Connect(watchPlayer)
for _, player in ipairs(Players:GetPlayers()) do
	watchPlayer(player)
end

task.spawn(function()
	while true do
		for _, player in ipairs(Players:GetPlayers()) do
			local character = player.Character
			if character then
				local hrp = character:FindFirstChild("HumanoidRootPart")
				local humanoid = character:FindFirstChild("Humanoid")
				local spawn = findSafeSpawn()
				-- During world construction the player may fall before the safe
				-- spawn exists. Do not kill the character; the next tick will
				-- recover it once WorldBuilder has published MolGangSpawn.
				if hrp and humanoid and SpawnSafety.ShouldRecover(hrp.Position.Y, KILL_Y, spawn ~= nil) then
					recoverPlayer(character, humanoid, hrp, spawn)
				end
			end
		end
		task.wait(CHECK_INTERVAL)
	end
end)

print("[MOLGANG] Void kill zone active at Y <", KILL_Y)
