-- ServerScriptService/Core/QuantumDots.server.lua
-- Quantum dot spawning system for MOLGANG
-- Rare elements (Z > 103) spawn as quantum dots in the Quantum Lab zone
-- Quantum dots flicker with 'superposition' transparency animation
-- Each captured quantum dot gives 10 ChainTokens

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- QUANTUM DOT ELEMENTS (superheavy, short half-lives)
-- ══════════════════════════════════════════════

local QUANTUM_ELEMENTS = {
	{z = 113, name = "Nihonium",   sym = "Nh", halflife = "10s",   color = Color3.fromRGB(255, 100, 100)},
	{z = 114, name = "Flerovium",  sym = "Fl", halflife = "2.1s",  color = Color3.fromRGB(255, 150, 50)},
	{z = 115, name = "Moscovium",  sym = "Mc", halflife = "220ms", color = Color3.fromRGB(200, 100, 255)},
	{z = 116, name = "Livermorium",sym = "Lv", halflife = "61ms",  color = Color3.fromRGB(100, 200, 255)},
	{z = 117, name = "Tennessine", sym = "Ts", halflife = "51ms",  color = Color3.fromRGB(100, 255, 150)},
	{z = 118, name = "Oganesson",  sym = "Og", halflife = "0.89ms",color = Color3.fromRGB(255, 215, 0)},
}

-- ══════════════════════════════════════════════
-- CONFIGURATION
-- ══════════════════════════════════════════════

local QUANTUM_ZONE_CENTER = Vector3.new(2000, 35, 0)
local QUANTUM_ZONE_RADIUS = 250
local SPAWN_INTERVAL = 120          -- spawn attempt every 2 minutes
local SPAWN_CHANCE = 0.3            -- 30% chance per attempt
local DOT_LIFETIME_GAME = 10        -- 10 seconds in-game (fun challenge!)
local MAX_DOTS = 5                   -- max 5 quantum dots at once
local CHAIN_TOKEN_REWARD = 10
local CATCH_RANGE = 8                -- studs (must be close and fast!)

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local activeDots = {}
local dotCount = 0

local dotsFolder = Instance.new("Folder")
dotsFolder.Name = "QuantumDots"
dotsFolder.Parent = workspace

-- ══════════════════════════════════════════════
-- SPAWN QUANTUM DOT
-- ══════════════════════════════════════════════

local function spawnQuantumDot(element)
	if dotCount >= MAX_DOTS then return end

	-- Random position within quantum zone
	local angle = math.random() * math.pi * 2
	local dist = math.random() * QUANTUM_ZONE_RADIUS
	local pos = QUANTUM_ZONE_CENTER + Vector3.new(
		math.cos(angle) * dist,
		math.random(5, 40),
		math.sin(angle) * dist
	)

	-- Create quantum dot part (small, neon, flickering)
	local dot = Instance.new("Part")
	dot.Size = Vector3.new(1.5, 1.5, 1.5) -- small, nanodeeltje scale
	dot.Shape = Enum.PartType.Ball
	dot.Material = Enum.Material.Neon
	dot.Color = element.color
	dot.Anchored = true
	dot.CanCollide = false
	dot.Name = "QDot_" .. element.sym .. "_" .. tostring(math.random(10000))

	dot:SetAttribute("ElementZ", element.z)
	dot:SetAttribute("Symbol", element.sym)
	dot:SetAttribute("ElementName", element.name)
	dot:SetAttribute("Interactable", true)
	dot:SetAttribute("InteractionType", "quantum_catch")
	dot:SetAttribute("Rarity", "legendary")

	dot.CFrame = CFrame.new(pos)
	dot.Parent = dotsFolder

	-- Quantum superposition visual: rapid transparency flicker
	task.spawn(function()
		local startTime = tick()
		while dot.Parent do
			-- Superposition: visible or invisible (probabilistic)
			dot.Transparency = math.random() > 0.5 and 0 or 0.7
			-- Also move slightly (quantum uncertainty)
			local offset = Vector3.new(
				(math.random() - 0.5) * 2,
				(math.random() - 0.5) * 2,
				(math.random() - 0.5) * 2
			)
			dot.CFrame = CFrame.new(pos + offset)
			task.wait(0.05) -- 20 FPS flicker
		end
	end)

	-- Electric spark particle effect
	local particle = Instance.new("ParticleEmitter")
	particle.Color = ColorSequence.new(element.color)
	particle.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.5),
		NumberSequenceKeypoint.new(0.5, 1.0),
		NumberSequenceKeypoint.new(1, 0),
	})
	particle.Lifetime = NumberRange.new(0.1, 0.3)
	particle.Rate = 50
	particle.Speed = NumberRange.new(5, 15)
	particle.SpreadAngle = Vector2.new(360, 360)
	particle.LightEmission = 1
	particle.LightInfluence = 0
	particle.Parent = dot

	-- Point light for glow
	local light = Instance.new("PointLight")
	light.Color = element.color
	light.Brightness = 5
	light.Range = 25
	light.Parent = dot

	-- Billboard label
	local bill = Instance.new("BillboardGui")
	bill.Size = UDim2.fromOffset(100, 50)
	bill.StudsOffset = Vector3.new(0, 3, 0)
	bill.AlwaysOnTop = true
	bill.Parent = dot

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 0.6)
	label.BackgroundTransparency = 1
	label.Text = element.sym .. " QUANTUM DOT"
	label.TextColor3 = element.color
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.Parent = bill

	local timer = Instance.new("TextLabel")
	timer.Size = UDim2.fromScale(1, 0.4)
	timer.Position = UDim2.fromScale(0, 0.6)
	timer.BackgroundTransparency = 1
	timer.TextColor3 = Color3.fromRGB(255, 100, 100)
	timer.TextScaled = true
	timer.Font = Enum.Font.GothamBold
	timer.Parent = bill

	-- Track
	activeDots[dot] = {
		element = element,
		spawnTime = tick(),
		position = pos,
	}
	dotCount = dotCount + 1

	-- Countdown timer + auto-despawn
	task.spawn(function()
		for remaining = DOT_LIFETIME_GAME, 0, -1 do
			if not dot.Parent then break end
			timer.Text = remaining .. "s"
			task.wait(1)
		end
		-- Despawn
		if dot.Parent then
			activeDots[dot] = nil
			dotCount = dotCount - 1
			dot:Destroy()
		end
	end)

	-- Announce to players in quantum zone
	for _, player in ipairs(Players:GetPlayers()) do
		local char = player.Character
		if char then
			local hrp = char:FindFirstChild("HumanoidRootPart")
			if hrp then
				local dist2 = (hrp.Position - QUANTUM_ZONE_CENTER).Magnitude
				if dist2 < QUANTUM_ZONE_RADIUS * 1.5 then
					Remotes.FireClient("ServerAnnounce", player, {
						message = "QUANTUM DOT DETECTED: " .. element.name .. " (" .. element.sym .. ") — " .. DOT_LIFETIME_GAME .. "s to catch!",
						rarity = "legendary",
					})
				end
			end
		end
	end
end

-- ══════════════════════════════════════════════
-- CATCH HANDLER (proximity-based via AtomCollector)
-- ══════════════════════════════════════════════

Remotes.RequestAtomCollect.OnServerEvent:Connect(function(player, atomName)
	if type(atomName) ~= "string" or #atomName > 64 then return end
	if string.sub(atomName, 1, 6) ~= "QDot_" then return end

	local dot = dotsFolder:FindFirstChild(atomName)
	if not dot then return end

	local data = activeDots[dot]
	if not data then return end

	-- Distance check
	local char = player.Character
	if not char then return end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	local distance = (hrp.Position - dot.Position).Magnitude
	if distance > CATCH_RANGE then return end

	-- Caught!
	local element = data.element
	activeDots[dot] = nil
	dotCount = dotCount - 1
	dot:Destroy()

	-- Award ChainTokens
	player:SetAttribute("ChainTokens", (player:GetAttribute("ChainTokens") or 0) + CHAIN_TOKEN_REWARD)

	-- Notify player
	Remotes.FireClient("AtomCollected", player, {
		elementZ = element.z,
		symbol = element.sym,
		name = element.name,
		rarity = "legendary",
		coinReward = CHAIN_TOKEN_REWARD,
		isQuantumDot = true,
	})

	-- Global announcement
	Remotes.FireAllClients("ServerAnnounce", {
		message = player.Name .. " caught a QUANTUM DOT: " .. element.name .. " (" .. element.sym .. ")!",
		rarity = "legendary",
	})
end)

-- ══════════════════════════════════════════════
-- SPAWN LOOP
-- ══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(SPAWN_INTERVAL)

		-- Only spawn if players are near quantum zone
		local playersInZone = false
		for _, player in ipairs(Players:GetPlayers()) do
			local char = player.Character
			if char then
				local hrp = char:FindFirstChild("HumanoidRootPart")
				if hrp and (hrp.Position - QUANTUM_ZONE_CENTER).Magnitude < QUANTUM_ZONE_RADIUS * 2 then
					playersInZone = true
					break
				end
			end
		end

		if playersInZone and math.random() < SPAWN_CHANCE then
			-- Select random quantum element (weighted by rarity / half-life)
			local element = QUANTUM_ELEMENTS[math.random(#QUANTUM_ELEMENTS)]
			spawnQuantumDot(element)
		end
	end
end)

print("[MOLGANG] QuantumDots initialized - zone center:", QUANTUM_ZONE_CENTER)
