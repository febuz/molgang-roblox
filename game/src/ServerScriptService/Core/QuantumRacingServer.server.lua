--[[
	CommissioningServer.server.lua (was CommissioningServer)
	MOLGANG — Plant Commissioning Server (procedural checklist course + scoring)

	Generates commissioning walkthrough environments,
	manages commissioning state, checklist completion, and rewards.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local Commissioning = require(ReplicatedStorage.Modules.QuantumRacing) -- module file kept, content is PlantCommissioning
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- Active races
local activeRaces = {} -- {userId = raceState}

-- ═══════════════════════════════════════════════
-- PROCEDURAL TUNNEL BUILDER
-- ═══════════════════════════════════════════════

local function buildTunnel(track)
	local tunnelFolder = Instance.new("Folder")
	tunnelFolder.Name = "RaceTunnel_" .. track.id
	tunnelFolder.Parent = workspace

	local segmentCount = math.floor(track.length / 25)
	local tunnelRadius = 12
	local basePos = Vector3.new(4000, 50, 0) -- far from main world

	for seg = 0, segmentCount do
		local t = seg / segmentCount
		-- Curved path with some variation
		local angle = t * math.pi * 2 * (track.obstacles / 10)
		local x = basePos.X + seg * 25
		local y = basePos.Y + math.sin(angle) * 15
		local z = basePos.Z + math.cos(angle * 0.7) * 20

		-- Tunnel ring (neon wireframe look)
		local ring = Instance.new("Part")
		ring.Name = "TunnelRing_" .. seg
		ring.Shape = Enum.PartType.Cylinder
		ring.Size = Vector3.new(2, tunnelRadius * 2, tunnelRadius * 2)
		ring.Position = Vector3.new(x, y, z)
		ring.Orientation = Vector3.new(0, 0, 90)
		ring.Anchored = true
		ring.CanCollide = false
		ring.Material = Enum.Material.Neon
		ring.Color = Color3.fromHSV(t, 0.7, 0.9)
		ring.Transparency = 0.6
		ring.Parent = tunnelFolder

		-- Floor segment for running
		local floor = Instance.new("Part")
		floor.Name = "TunnelFloor_" .. seg
		floor.Size = Vector3.new(26, 1, 8)
		floor.Position = Vector3.new(x, y - tunnelRadius + 1, z)
		floor.Anchored = true
		floor.CanCollide = true
		floor.Material = Enum.Material.SmoothPlastic
		floor.Color = Color3.fromRGB(20, 25, 40)
		floor.Transparency = 0.2
		floor.Parent = tunnelFolder

		-- Quantum dots (collectible glowing orbs)
		if seg % math.max(1, math.floor(segmentCount / track.quantumDots)) == 0 and seg > 0 then
			local dot = Instance.new("Part")
			dot.Name = "QuantumDot_" .. seg
			dot.Shape = Enum.PartType.Ball
			dot.Size = Vector3.new(2, 2, 2)
			dot.Position = Vector3.new(x, y - tunnelRadius + 4, z + (math.random() - 0.5) * 4)
			dot.Anchored = true
			dot.CanCollide = false
			dot.Material = Enum.Material.Neon
			dot.Color = Color3.fromRGB(100, 255, 200)
			dot.Parent = tunnelFolder

			local light = Instance.new("PointLight")
			light.Color = Color3.fromRGB(100, 255, 200)
			light.Brightness = 2
			light.Range = 8
			light.Parent = dot
		end

		-- Obstacles
		if seg > 5 and seg % math.max(1, math.floor(segmentCount / track.obstacles)) == 0 then
			local obs = Instance.new("Part")
			obs.Name = "Obstacle_" .. seg
			obs.Size = Vector3.new(2, 6, 6)
			obs.Position = Vector3.new(x, y - tunnelRadius + 4, z + (math.random() > 0.5 and 3 or -3))
			obs.Anchored = true
			obs.CanCollide = true
			obs.Material = Enum.Material.Neon
			obs.Color = Color3.fromRGB(255, 60, 60)
			obs.Transparency = 0.3
			obs.Parent = tunnelFolder
		end
	end

	-- Start line
	local startLine = Instance.new("Part")
	startLine.Name = "StartLine"
	startLine.Size = Vector3.new(2, 0.5, 10)
	startLine.Position = basePos + Vector3.new(0, -tunnelRadius + 1.5, 0)
	startLine.Anchored = true
	startLine.CanCollide = false
	startLine.Material = Enum.Material.Neon
	startLine.Color = Color3.fromRGB(0, 255, 100)
	startLine.Parent = tunnelFolder

	-- Finish line
	local finishPos = Vector3.new(basePos.X + segmentCount * 25, basePos.Y, basePos.Z)
	local finishLine = Instance.new("Part")
	finishLine.Name = "FinishLine"
	finishLine.Size = Vector3.new(2, 0.5, 10)
	finishLine.Position = finishPos + Vector3.new(0, -tunnelRadius + 1.5, 0)
	finishLine.Anchored = true
	finishLine.CanCollide = false
	finishLine.Material = Enum.Material.Neon
	finishLine.Color = Color3.fromRGB(255, 215, 0)
	finishLine.Parent = tunnelFolder

	return tunnelFolder, basePos, finishPos
end

-- ═══════════════════════════════════════════════
-- RACE MANAGEMENT
-- ═══════════════════════════════════════════════

Remotes.RequestStartRace.OnServerEvent:Connect(function(player, trackId)
	local userId = player.UserId

	if activeRaces[userId] then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Already in a race! Finish or quit first.",
			rarity = "common",
		})
		return
	end

	local track = Commissioning.GetTrack(trackId)
	if not track then return end

	-- Check unlock cost
	if track.unlockCost > 0 then
		local ok = PlayerDataBridge.SpendMolCoins(userId, track.unlockCost)
		if not ok then
			Remotes.FireClient("ServerAnnounce", player, {
				message = track.name .. " costs " .. track.unlockCost .. " MC to enter.",
				rarity = "common",
			})
			return
		end
	end

	-- Build tunnel
	local tunnel, startPos, finishPos = buildTunnel(track)

	-- Teleport player to start
	local char = player.Character
	if char then
		local hrp = char:FindFirstChild("HumanoidRootPart")
		if hrp then
			hrp.CFrame = CFrame.new(startPos + Vector3.new(0, 3, 0))
		end
		-- Speed boost for racing
		local humanoid = char:FindFirstChild("Humanoid")
		if humanoid then
			humanoid.WalkSpeed = 32 -- 2x normal speed for racing
		end
	end

	-- Race state
	activeRaces[userId] = {
		trackId = trackId,
		tunnel = tunnel,
		startTime = tick(),
		startPos = startPos,
		finishPos = finishPos,
		dotsCollected = 0,
		obstaclesHit = 0,
		timeLimit = track.timeLimit,
	}

	Remotes.FireClient("ServerAnnounce", player, {
		message = "RACE START: " .. track.name .. "! Time limit: " .. track.timeLimit .. "s. GO!",
		rarity = "epic",
	})

	Remotes.FireClient("RaceStarted", player, {
		trackId = trackId,
		trackName = track.name,
		timeLimit = track.timeLimit,
	})

	-- Timer: auto-end race when time runs out
	task.delay(track.timeLimit + 5, function()
		local race = activeRaces[userId]
		if race and race.trackId == trackId then
			endRace(player, userId, false)
		end
	end)

	print("[Commissioning]", player.Name, "started race:", track.name)
end)

-- Dot collection (proximity-based)
function collectDot(player, dotName)
	local userId = player.UserId
	local race = activeRaces[userId]
	if not race then return end

	local tunnel = race.tunnel
	local dot = tunnel:FindFirstChild(dotName)
	if dot then
		dot:Destroy()
		race.dotsCollected = race.dotsCollected + 1
		Remotes.FireClient("RaceDotCollected", player, {
			count = race.dotsCollected,
		})
	end
end

-- End race
function endRace(player, userId, reachedFinish)
	local race = activeRaces[userId]
	if not race then return end

	local elapsed = tick() - race.startTime
	local track = Commissioning.GetTrack(race.trackId)

	local score = Commissioning.CalculateScore(track, elapsed, race.dotsCollected, race.obstaclesHit)
	local reward = reachedFinish and Commissioning.GetReward(track, score) or 0

	if reward > 0 then
		PlayerDataBridge.AddRewardMolCoins(userId, reward)
	end

	-- Cleanup tunnel
	if race.tunnel and race.tunnel.Parent then
		race.tunnel:Destroy()
	end

	-- Reset speed
	local char = player.Character
	if char then
		local humanoid = char:FindFirstChild("Humanoid")
		if humanoid then humanoid.WalkSpeed = 16 end
		-- Teleport back to hub
		local hrp = char:FindFirstChild("HumanoidRootPart")
		if hrp then hrp.CFrame = CFrame.new(0, 20, 0) end
	end

	activeRaces[userId] = nil

	Remotes.FireClient("RaceFinished", player, {
		completed = reachedFinish,
		time = string.format("%.1f", elapsed),
		dotsCollected = race.dotsCollected,
		score = score,
		reward = reward,
	})

	local msg = reachedFinish
		and string.format("RACE COMPLETE! Time: %.1fs | Dots: %d | Score: %d | Reward: %d MC", elapsed, race.dotsCollected, score, reward)
		or "Race ended (time's up or quit)."

	Remotes.FireClient("ServerAnnounce", player, {
		message = msg,
		rarity = reachedFinish and "epic" or "common",
	})

	print("[Commissioning]", player.Name, "finished race:", reachedFinish, "score:", score)
end

-- Finish line detection
task.spawn(function()
	while true do
		task.wait(0.5)
		for _, player in ipairs(Players:GetPlayers()) do
			local userId = player.UserId
			local race = activeRaces[userId]
			if race then
				local char = player.Character
				if char then
					local hrp = char:FindFirstChild("HumanoidRootPart")
					if hrp and (hrp.Position - race.finishPos).Magnitude < 15 then
						endRace(player, userId, true)
					end
				end
			end
		end
	end
end)

-- Dot collection detection
task.spawn(function()
	while true do
		task.wait(0.3)
		for _, player in ipairs(Players:GetPlayers()) do
			local userId = player.UserId
			local race = activeRaces[userId]
			if race and race.tunnel then
				local char = player.Character
				if char then
					local hrp = char:FindFirstChild("HumanoidRootPart")
					if hrp then
						for _, child in race.tunnel:GetChildren() do
							if child.Name:find("QuantumDot") and (hrp.Position - child.Position).Magnitude < 5 then
								collectDot(player, child.Name)
							end
						end
					end
				end
			end
		end
	end
end)

-- Cleanup on leave
Players.PlayerRemoving:Connect(function(player)
	local userId = player.UserId
	local race = activeRaces[userId]
	if race then
		if race.tunnel and race.tunnel.Parent then race.tunnel:Destroy() end
		activeRaces[userId] = nil
	end
end)

print("[MOLGANG] CommissioningServer initialized — plant startup procedures")
