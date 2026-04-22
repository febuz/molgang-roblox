-- ServerScriptService/Core/VoidKillZone.server.lua
-- Respawns players who fall below the floating archipelago
-- Prevents infinite falling in the void

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local KILL_Y = -80  -- below all platforms (lowest is ~-15 at Lanthanide Reef)
local CHECK_INTERVAL = 1  -- seconds between checks

task.spawn(function()
	while true do
		for _, player in ipairs(Players:GetPlayers()) do
			local character = player.Character
			if character then
				local hrp = character:FindFirstChild("HumanoidRootPart")
				local humanoid = character:FindFirstChild("Humanoid")
				if hrp and humanoid and hrp.Position.Y < KILL_Y then
					-- Respawn at spawn point
					humanoid.Health = 0
				end
			end
		end
		task.wait(CHECK_INTERVAL)
	end
end)

print("[MOLGANG] Void kill zone active at Y <", KILL_Y)
