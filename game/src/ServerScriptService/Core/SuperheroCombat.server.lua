--[[
	IncidentResponse.server.lua (was SuperheroCombat)
	MOLGANG — HSE Incident Response System (containment + resolution)

	Manages HSE role selection, incident scenarios, hazard spawning,
	response action cooldowns, containment progress, and rewards.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local SafetyTrack = require(ReplicatedStorage.Modules.SuperheroTrack) -- module file kept, content is SafetyTrack
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

local playerHeroes = {}    -- {userId = heroId}
local activeMissions = {}  -- {userId = missionState}

-- ═══════════════════════════════════════════════
-- HERO SELECTION
-- ═══════════════════════════════════════════════

Remotes.RequestSelectHero.OnServerEvent:Connect(function(player, heroId)
	local userId = player.UserId
	local hero = SafetyTrack.GetHero(heroId)
	if not hero then return end

	-- Check unlock requirement
	local pData = PlayerDataBridge.GetPlayerData(userId)
	if pData then
		local atomCount = pData.atoms and pData.atoms[hero.element] or 0
		if atomCount < hero.unlockAtoms then
			Remotes.FireClient("ServerAnnounce", player, {
				message = hero.name .. " requires " .. hero.unlockAtoms .. "x " .. hero.element .. " atoms (you have " .. atomCount .. ")",
				rarity = "common",
			})
			return
		end
	end

	playerHeroes[userId] = heroId
	Remotes.FireClient("ServerAnnounce", player, {
		message = "Hero selected: " .. hero.name .. "!",
		rarity = "rare",
	})
	Remotes.FireClient("HeroSelected", player, {heroId = heroId, name = hero.name, abilities = hero.abilities})
end)

-- ═══════════════════════════════════════════════
-- VILLAIN SPAWNER
-- ═══════════════════════════════════════════════

local function spawnVillain(villainData, arenaCenter)
	local villainModel = Instance.new("Model")
	villainModel.Name = "Villain_" .. villainData.id

	-- Villain body (large glowing figure)
	local body = Instance.new("Part")
	body.Name = "VillainBody"
	body.Size = Vector3.new(6, 12, 6)
	body.Position = arenaCenter + Vector3.new(0, 8, 0)
	body.Anchored = true
	body.CanCollide = false
	body.Material = Enum.Material.Neon
	body.Color = Color3.fromRGB(200, 40, 60)
	body.Parent = villainModel

	local humanoid = Instance.new("Humanoid")
	humanoid.MaxHealth = villainData.health
	humanoid.Health = villainData.health
	humanoid.Parent = villainModel

	-- Health bar
	local bill = Instance.new("BillboardGui")
	bill.Size = UDim2.fromOffset(120, 30)
	bill.StudsOffset = Vector3.new(0, 8, 0)
	bill.AlwaysOnTop = true
	bill.MaxDistance = 80
	bill.Parent = body

	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 0.5, 0)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = villainData.name
	nameLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
	nameLabel.TextScaled = true
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Parent = bill

	local hpBg = Instance.new("Frame")
	hpBg.Size = UDim2.new(1, 0, 0.3, 0)
	hpBg.Position = UDim2.new(0, 0, 0.6, 0)
	hpBg.BackgroundColor3 = Color3.fromRGB(40, 10, 10)
	hpBg.Parent = bill

	local hpFill = Instance.new("Frame")
	hpFill.Name = "HPFill"
	hpFill.Size = UDim2.new(1, 0, 1, 0)
	hpFill.BackgroundColor3 = Color3.fromRGB(255, 60, 60)
	hpFill.Parent = hpBg

	villainModel.PrimaryPart = body
	villainModel.Parent = workspace

	return villainModel
end

-- ═══════════════════════════════════════════════
-- MISSION START
-- ═══════════════════════════════════════════════

Remotes.RequestStartMission.OnServerEvent:Connect(function(player, missionId)
	local userId = player.UserId

	if activeMissions[userId] then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Already in a mission! Defeat the villain or quit.",
			rarity = "common",
		})
		return
	end

	local heroId = playerHeroes[userId]
	if not heroId then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Select a hero first!",
			rarity = "common",
		})
		return
	end

	local mission = SafetyTrack.GetMission(missionId)
	if not mission then return end

	local villainData = nil
	for _, v in ipairs(SafetyTrack.Villains) do
		if v.id == mission.villain then villainData = v; break end
	end
	if not villainData then return end

	-- Create arena
	local arenaCenter = Vector3.new(5000, 50, math.random(-500, 500))

	local arenaFloor = Instance.new("Part")
	arenaFloor.Name = "CombatArena_" .. userId
	arenaFloor.Size = Vector3.new(80, 2, 80)
	arenaFloor.Position = arenaCenter
	arenaFloor.Anchored = true
	arenaFloor.Material = Enum.Material.SmoothPlastic
	arenaFloor.Color = Color3.fromRGB(15, 5, 10)
	arenaFloor.Parent = workspace

	-- Arena walls (neon boundary)
	for side = -1, 1, 2 do
		for axis = 0, 1 do
			local wall = Instance.new("Part")
			wall.Size = axis == 0 and Vector3.new(2, 15, 80) or Vector3.new(80, 15, 2)
			wall.Position = arenaCenter + (axis == 0 and Vector3.new(side * 40, 8, 0) or Vector3.new(0, 8, side * 40))
			wall.Anchored = true
			wall.CanCollide = true
			wall.Material = Enum.Material.Neon
			wall.Color = Color3.fromRGB(80, 20, 40)
			wall.Transparency = 0.5
			wall.Parent = workspace
			wall.Name = "ArenaWall_" .. userId
		end
	end

	-- Spawn villain
	local villainModel = spawnVillain(villainData, arenaCenter)

	-- Teleport player
	local char = player.Character
	if char then
		local hrp = char:FindFirstChild("HumanoidRootPart")
		if hrp then
			hrp.CFrame = CFrame.new(arenaCenter + Vector3.new(-20, 5, 0))
		end
	end

	activeMissions[userId] = {
		missionId = missionId,
		heroId = heroId,
		villainModel = villainModel,
		villainHealth = villainData.health,
		villainMaxHealth = villainData.health,
		villainAttack = villainData.attack,
		arenaCenter = arenaCenter,
		startTime = tick(),
		abilityCooldowns = {},
	}

	Remotes.FireClient("ServerAnnounce", player, {
		message = "MISSION START: " .. mission.name .. "! Defeat " .. villainData.name .. "!",
		rarity = "legendary",
	})

	Remotes.FireClient("MissionStarted", player, {
		missionId = missionId,
		villainName = villainData.name,
		villainHealth = villainData.health,
	})

	-- Villain auto-attack loop
	task.spawn(function()
		while activeMissions[userId] and activeMissions[userId].missionId == missionId do
			task.wait(3)
			local m = activeMissions[userId]
			if not m then break end

			local c = player.Character
			if c then
				local hum = c:FindFirstChild("Humanoid")
				if hum and hum.Health > 0 then
					hum:TakeDamage(villainData.attack * 0.3) -- reduced for gameplay
					Remotes.FireClient("VillainAttacked", player, {
						damage = math.floor(villainData.attack * 0.3),
						villainName = villainData.name,
					})
				end
			end
		end
	end)

	print("[HSE]", player.Name, "responding to:", mission.name, "as", heroId)
end)

-- ═══════════════════════════════════════════════
-- ABILITY USE
-- ═══════════════════════════════════════════════

Remotes.RequestUseAbility.OnServerEvent:Connect(function(player, abilityIndex)
	local userId = player.UserId
	local mission = activeMissions[userId]
	if not mission then return end

	if type(abilityIndex) ~= "number" or abilityIndex < 1 or abilityIndex > 3 then return end

	local hero = SafetyTrack.GetHero(mission.heroId)
	if not hero then return end

	local ability = hero.abilities[abilityIndex]
	if not ability then return end

	-- Cooldown check
	local now = tick()
	local lastUse = mission.abilityCooldowns[abilityIndex] or 0
	if now - lastUse < (ability.cooldown or 5) then
		local remaining = math.ceil((ability.cooldown or 5) - (now - lastUse))
		Remotes.FireClient("ServerAnnounce", player, {
			message = ability.name .. " on cooldown: " .. remaining .. "s",
			rarity = "common",
		})
		return
	end

	mission.abilityCooldowns[abilityIndex] = now

	-- Apply ability effect
	if ability.damage then
		mission.villainHealth = mission.villainHealth - ability.damage

		-- Update villain HP bar
		if mission.villainModel then
			local body = mission.villainModel:FindFirstChild("VillainBody")
			if body then
				local bill = body:FindFirstChildWhichIsA("BillboardGui")
				if bill then
					local hpBg = bill:FindFirstChild("Frame")
					if hpBg then
						local hpFill = hpBg:FindFirstChild("HPFill")
						if hpFill then
							local ratio = math.clamp(mission.villainHealth / mission.villainMaxHealth, 0, 1)
							hpFill.Size = UDim2.new(ratio, 0, 1, 0)
						end
					end
				end
			end
		end

		Remotes.FireClient("AbilityUsed", player, {
			abilityName = ability.name,
			damage = ability.damage,
			villainHP = mission.villainHealth,
			villainMaxHP = mission.villainMaxHealth,
		})
	end

	if ability.shield then
		-- Heal player
		local char = player.Character
		if char then
			local hum = char:FindFirstChild("Humanoid")
			if hum then
				hum.Health = math.min(hum.MaxHealth, hum.Health + ability.shield)
			end
		end
		Remotes.FireClient("AbilityUsed", player, {
			abilityName = ability.name,
			shieldAmount = ability.shield,
		})
	end

	-- Check if villain defeated
	if mission.villainHealth <= 0 then
		completeMission(player, userId, true)
	end
end)

-- ═══════════════════════════════════════════════
-- MISSION COMPLETION
-- ═══════════════════════════════════════════════

function completeMission(player, userId, victory)
	local mission = activeMissions[userId]
	if not mission then return end

	local missionData = SafetyTrack.GetMission(mission.missionId)
	local reward = victory and (missionData and missionData.reward or 0) or 0
	local elapsed = tick() - mission.startTime

	if reward > 0 then
		PlayerDataBridge.AddMolCoins(userId, reward)
	end

	-- Cleanup arena
	if mission.villainModel and mission.villainModel.Parent then
		mission.villainModel:Destroy()
	end
	for _, obj in workspace:GetChildren() do
		if obj.Name == "CombatArena_" .. userId or obj.Name == "ArenaWall_" .. userId then
			obj:Destroy()
		end
	end

	-- Teleport back
	local char = player.Character
	if char then
		local hrp = char:FindFirstChild("HumanoidRootPart")
		if hrp then hrp.CFrame = CFrame.new(0, 20, 0) end
		local hum = char:FindFirstChild("Humanoid")
		if hum then hum.Health = hum.MaxHealth end
	end

	activeMissions[userId] = nil

	Remotes.FireClient("MissionComplete", player, {
		victory = victory,
		reward = reward,
		time = string.format("%.1f", elapsed),
	})

	local msg = victory
		and "VICTORY! " .. (missionData and missionData.name or "Mission") .. " complete! +" .. reward .. " MC"
		or "Mission failed. Try again with a stronger hero!"

	Remotes.FireClient("ServerAnnounce", player, {
		message = msg,
		rarity = victory and "legendary" or "common",
	})

	if victory then
		Remotes.FireAllClients("ServerAnnounce", {
			message = player.Name .. " defeated " .. (missionData and missionData.name or "a villain") .. "!",
			rarity = "epic",
		})
	end
end

-- Player death = mission fail
Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function(char)
		local hum = char:WaitForChild("Humanoid")
		hum.Died:Connect(function()
			if activeMissions[player.UserId] then
				completeMission(player, player.UserId, false)
			end
		end)
	end)
end)

-- Cleanup on leave
Players.PlayerRemoving:Connect(function(player)
	local userId = player.UserId
	if activeMissions[userId] then
		if activeMissions[userId].villainModel then
			activeMissions[userId].villainModel:Destroy()
		end
		for _, obj in workspace:GetChildren() do
			if obj.Name == "CombatArena_" .. userId or obj.Name == "ArenaWall_" .. userId then
				obj:Destroy()
			end
		end
		activeMissions[userId] = nil
	end
	playerHeroes[userId] = nil
end)

print("[MOLGANG] IncidentResponse initialized — HSE roles + emergency scenarios")
