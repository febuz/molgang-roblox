--[[
	FactoryParticles.client.lua
	MOLGANG — Visual Particle Effects for Factory Equipment

	Adds ambient particle effects to make the factory feel alive:
	- Sparks on crusher jaw contact points
	- Bubbles rising in leaching tanks
	- Steam/smoke from roasting kiln
	- Dust clouds around ball mill
	- Molten slag glow in cooling pit
	- Conveyor belt material flow particles
	- Atom collection sparkle trail
	- Molecule synthesis confetti burst
	- Equipment operation indicator lights
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")

local player = Players.LocalPlayer
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

-- ═══════════════════════════════════════════════
-- PARTICLE PRESETS
-- ═══════════════════════════════════════════════

local function createParticle(parent, config)
	local emitter = Instance.new("ParticleEmitter")
	emitter.Name = config.name or "Particle"
	emitter.Color = config.color or ColorSequence.new(Color3.new(1, 1, 1))
	emitter.Size = config.size or NumberSequence.new(1)
	emitter.Transparency = config.transparency or NumberSequence.new(0, 1)
	emitter.Lifetime = config.lifetime or NumberRange.new(1, 2)
	emitter.Rate = config.rate or 10
	emitter.Speed = config.speed or NumberRange.new(2, 5)
	emitter.SpreadAngle = config.spread or Vector2.new(15, 15)
	emitter.Acceleration = config.acceleration or Vector3.new(0, 0, 0)
	emitter.LightEmission = config.lightEmission or 0.5
	emitter.LightInfluence = config.lightInfluence or 0
	emitter.EmissionDirection = config.direction or Enum.NormalId.Top
	emitter.RotSpeed = config.rotSpeed or NumberRange.new(0, 0)
	emitter.Parent = parent
	return emitter
end

-- ═══════════════════════════════════════════════
-- SCAN WORLD FOR FACTORY EQUIPMENT
-- ═══════════════════════════════════════════════

local function addEffectsToZone()
	-- Wait for world to load
	task.wait(5)

	local zones = workspace:FindFirstChild("Zones")
	if not zones then return end

	-- Find Slakkenspoor factory zone
	local zone4 = zones:FindFirstChild("Zone4_SlakkenspoorFabriek")
	if not zone4 then return end

	-- Add effects to existing factory structures
	for _, desc in zone4:GetDescendants() do
		if desc:IsA("BasePart") then
			local name = desc.Name

			-- Slag chunks: subtle dust
			if name:find("SlagChunk") then
				createParticle(desc, {
					name = "SlagDust",
					color = ColorSequence.new(Color3.fromRGB(120, 100, 80)),
					size = NumberSequence.new({
						NumberSequenceKeypoint.new(0, 0.2),
						NumberSequenceKeypoint.new(1, 0.5),
					}),
					transparency = NumberSequence.new({
						NumberSequenceKeypoint.new(0, 0.5),
						NumberSequenceKeypoint.new(1, 1),
					}),
					rate = 2,
					speed = NumberRange.new(0.3, 1),
					lifetime = NumberRange.new(1, 3),
					spread = Vector2.new(180, 180),
					lightEmission = 0,
				})
			end

			-- Hot slag: heat shimmer + embers
			if name == "HotSlagMass" then
				createParticle(desc, {
					name = "Embers",
					color = ColorSequence.new({
						ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 200, 50)),
						ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 100, 20)),
						ColorSequenceKeypoint.new(1, Color3.fromRGB(100, 30, 10)),
					}),
					size = NumberSequence.new({
						NumberSequenceKeypoint.new(0, 0.1),
						NumberSequenceKeypoint.new(0.3, 0.3),
						NumberSequenceKeypoint.new(1, 0),
					}),
					rate = 20,
					speed = NumberRange.new(2, 8),
					lifetime = NumberRange.new(1, 4),
					spread = Vector2.new(40, 40),
					lightEmission = 1,
				})
			end

			-- Kiln fire glow: flames
			if name == "KilnFireGlow" then
				createParticle(desc, {
					name = "Flames",
					color = ColorSequence.new({
						ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 255, 100)),
						ColorSequenceKeypoint.new(0.3, Color3.fromRGB(255, 150, 30)),
						ColorSequenceKeypoint.new(1, Color3.fromRGB(100, 20, 5)),
					}),
					size = NumberSequence.new({
						NumberSequenceKeypoint.new(0, 0.5),
						NumberSequenceKeypoint.new(0.5, 2),
						NumberSequenceKeypoint.new(1, 0.5),
					}),
					rate = 25,
					speed = NumberRange.new(3, 8),
					lifetime = NumberRange.new(0.5, 1.5),
					spread = Vector2.new(25, 25),
					lightEmission = 1,
				})
			end

			-- Cone crusher: dust + sparks at top
			if name == "ConeMantle" then
				createParticle(desc, {
					name = "CrushSparks",
					color = ColorSequence.new({
						ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 200, 100)),
						ColorSequenceKeypoint.new(1, Color3.fromRGB(200, 100, 30)),
					}),
					size = NumberSequence.new({
						NumberSequenceKeypoint.new(0, 0.1),
						NumberSequenceKeypoint.new(1, 0),
					}),
					rate = 8,
					speed = NumberRange.new(5, 15),
					lifetime = NumberRange.new(0.3, 0.8),
					spread = Vector2.new(60, 60),
					lightEmission = 1,
				})
			end

			-- Ball mill drum: dust cloud
			if name == "MillDrum" then
				createParticle(desc, {
					name = "GrindDust",
					color = ColorSequence.new(Color3.fromRGB(160, 150, 130)),
					size = NumberSequence.new({
						NumberSequenceKeypoint.new(0, 0.5),
						NumberSequenceKeypoint.new(0.5, 2),
						NumberSequenceKeypoint.new(1, 3),
					}),
					transparency = NumberSequence.new({
						NumberSequenceKeypoint.new(0, 0.4),
						NumberSequenceKeypoint.new(0.5, 0.7),
						NumberSequenceKeypoint.new(1, 1),
					}),
					rate = 6,
					speed = NumberRange.new(1, 3),
					lifetime = NumberRange.new(2, 5),
					spread = Vector2.new(90, 90),
					lightEmission = 0.1,
				})
			end

			-- Filter plates: drip particles
			if name:find("FilterPlate") and name:find("_0") then
				createParticle(desc, {
					name = "FilterDrip",
					color = ColorSequence.new(Color3.fromRGB(180, 200, 100)),
					size = NumberSequence.new(0.15),
					rate = 3,
					speed = NumberRange.new(1, 3),
					lifetime = NumberRange.new(0.5, 1),
					direction = Enum.NormalId.Bottom,
					acceleration = Vector3.new(0, -20, 0),
					lightEmission = 0.3,
				})
			end
		end
	end

	print("[FactoryParticles] Added ambient effects to Slakkenspoor factory")
end

-- ═══════════════════════════════════════════════
-- PLAYER FACTORY 3D EQUIPMENT EFFECTS
-- Adds particles to equipment placed in rented factory
-- ═══════════════════════════════════════════════

local function addEffectsToPlayerFactory()
	-- Check for player factory folders periodically
	while true do
		task.wait(10)

		for _, folder in workspace:GetChildren() do
			if folder:IsA("Folder") and folder.Name:find("Factory_") then
				for _, child in folder:GetChildren() do
					if child:IsA("BasePart") and not child:FindFirstChild("EquipGlow") then
						-- Add subtle glow to all placed equipment
						local glow = Instance.new("PointLight")
						glow.Name = "EquipGlow"
						glow.Color = child.Color
						glow.Brightness = 0.4
						glow.Range = 15
						glow.Parent = child

						-- Operating indicator (blinking green light)
						local indicator = Instance.new("Part")
						indicator.Name = "OpIndicator"
						indicator.Shape = Enum.PartType.Ball
						indicator.Size = Vector3.new(0.5, 0.5, 0.5)
						indicator.Position = child.Position + Vector3.new(0, child.Size.Y / 2 + 0.5, 0)
						indicator.Color = Color3.fromRGB(0, 255, 80)
						indicator.Material = Enum.Material.Neon
						indicator.Anchored = true
						indicator.CanCollide = false
						indicator.Parent = folder

						-- Blink animation
						task.spawn(function()
							while indicator.Parent do
								TweenService:Create(indicator, TweenInfo.new(0.8), {
									Transparency = 0.7
								}):Play()
								task.wait(0.8)
								TweenService:Create(indicator, TweenInfo.new(0.8), {
									Transparency = 0
								}):Play()
								task.wait(0.8)
							end
						end)
					end
				end
			end
		end
	end
end

-- ═══════════════════════════════════════════════
-- ATOM COLLECTION SPARKLE
-- ═══════════════════════════════════════════════

local atomEvent = Remotes:FindFirstChild("AtomCollected")
if atomEvent then
	atomEvent.OnClientEvent:Connect(function(data)
		local character = player.Character
		if not character then return end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if not hrp then return end

		-- Burst of sparkles at player position
		local sparkle = Instance.new("Part")
		sparkle.Size = Vector3.new(1, 1, 1)
		sparkle.Position = hrp.Position
		sparkle.Transparency = 1
		sparkle.Anchored = true
		sparkle.CanCollide = false
		sparkle.Parent = workspace

		local emitter = createParticle(sparkle, {
			name = "CollectBurst",
			color = ColorSequence.new(Color3.fromRGB(100, 255, 150)),
			size = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.3),
				NumberSequenceKeypoint.new(1, 0),
			}),
			rate = 0,  -- emit burst manually
			speed = NumberRange.new(5, 15),
			lifetime = NumberRange.new(0.3, 0.8),
			spread = Vector2.new(180, 180),
			lightEmission = 1,
		})

		-- Burst emit
		emitter:Emit(20)

		-- Cleanup
		task.delay(1.5, function()
			sparkle:Destroy()
		end)
	end)
end

-- ═══════════════════════════════════════════════
-- MOLECULE SYNTHESIS CONFETTI
-- ═══════════════════════════════════════════════

local molEvent = Remotes:FindFirstChild("MoleculeBuilt")
if molEvent then
	molEvent.OnClientEvent:Connect(function(data)
		local character = player.Character
		if not character then return end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if not hrp then return end

		local confetti = Instance.new("Part")
		confetti.Size = Vector3.new(1, 1, 1)
		confetti.Position = hrp.Position + Vector3.new(0, 5, 0)
		confetti.Transparency = 1
		confetti.Anchored = true
		confetti.CanCollide = false
		confetti.Parent = workspace

		-- Multi-color confetti burst
		local emitter = createParticle(confetti, {
			name = "Confetti",
			color = ColorSequence.new({
				ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 215, 0)),
				ColorSequenceKeypoint.new(0.25, Color3.fromRGB(0, 255, 130)),
				ColorSequenceKeypoint.new(0.5, Color3.fromRGB(80, 180, 255)),
				ColorSequenceKeypoint.new(0.75, Color3.fromRGB(255, 100, 200)),
				ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 80, 80)),
			}),
			size = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.5),
				NumberSequenceKeypoint.new(0.5, 0.3),
				NumberSequenceKeypoint.new(1, 0.1),
			}),
			rate = 0,
			speed = NumberRange.new(10, 25),
			lifetime = NumberRange.new(1, 3),
			spread = Vector2.new(180, 180),
			acceleration = Vector3.new(0, -15, 0),
			lightEmission = 0.8,
			rotSpeed = NumberRange.new(-180, 180),
		})

		emitter:Emit(50)

		task.delay(4, function()
			confetti:Destroy()
		end)
	end)
end

-- ═══════════════════════════════════════════════
-- START
-- ═══════════════════════════════════════════════

task.spawn(addEffectsToZone)
task.spawn(addEffectsToPlayerFactory)

print("[MOLGANG] FactoryParticles loaded — sparks, dust, flames, confetti active")
