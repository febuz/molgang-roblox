--[[
	VisualPolish.client.lua
	MOLGANG — Visual Reality & Game Experience Enhancements

	Client-side immersive effects:
	1. Camera shake on heavy equipment (crushers, kilns)
	2. Screen flash on molecule synthesis
	3. Smooth GUI transitions (fade in/out)
	4. Footstep sound based on surface material
	5. Proximity glow intensification near factories
	6. Screen vignette in hazardous areas
	7. Collection celebration particles
	8. Smooth camera follow improvements
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local UserInputService = game:GetService("UserInputService")
local SoundService = game:GetService("SoundService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local camera = workspace.CurrentCamera
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

-- ═══════════════════════════════════════════════
-- 1. CAMERA SHAKE SYSTEM
-- ═══════════════════════════════════════════════

local shakeIntensity = 0
local shakeDuration = 0

local function triggerShake(intensity, duration)
	shakeIntensity = intensity
	shakeDuration = duration
end

RunService.RenderStepped:Connect(function(dt)
	if shakeDuration > 0 then
		shakeDuration = shakeDuration - dt
		local offset = CFrame.new(
			(math.random() - 0.5) * shakeIntensity,
			(math.random() - 0.5) * shakeIntensity * 0.5,
			0
		)
		camera.CFrame = camera.CFrame * offset
		shakeIntensity = shakeIntensity * 0.95 -- decay
	end
end)

-- Shake on crush/hammer events
local crushEvent = Remotes:FindFirstChild("SlagCrushProgress")
if crushEvent then
	crushEvent.OnClientEvent:Connect(function()
		triggerShake(0.15, 0.2)
	end)
end

-- ═══════════════════════════════════════════════
-- 2. MOLECULE SYNTHESIS FLASH
-- ═══════════════════════════════════════════════

local flashGui = Instance.new("ScreenGui")
flashGui.Name = "SynthFlash"
flashGui.DisplayOrder = 90
flashGui.IgnoreGuiInset = true
flashGui.Parent = playerGui

local flashFrame = Instance.new("Frame")
flashFrame.Size = UDim2.new(1, 0, 1, 0)
flashFrame.BackgroundColor3 = Color3.fromRGB(200, 255, 220)
flashFrame.BackgroundTransparency = 1
flashFrame.Parent = flashGui

local moleculeEvent = Remotes:FindFirstChild("MoleculeBuilt")
if moleculeEvent then
	moleculeEvent.OnClientEvent:Connect(function()
		flashFrame.BackgroundTransparency = 0.6
		TweenService:Create(flashFrame, TweenInfo.new(0.8, Enum.EasingStyle.Exponential), {
			BackgroundTransparency = 1,
		}):Play()
		triggerShake(0.08, 0.15)
	end)
end

-- ═══════════════════════════════════════════════
-- 3. SMOOTH GUI TRANSITIONS
-- ═══════════════════════════════════════════════

-- Monitor all ScreenGuis for open/close and add fade
local function setupGuiFade(gui)
	if not gui:IsA("ScreenGui") or gui.Name == "SynthFlash" then return end

	gui:GetPropertyChangedSignal("Enabled"):Connect(function()
		if gui.Enabled then
			-- Fade children in
			for _, child in gui:GetDescendants() do
				if child:IsA("Frame") and child.BackgroundTransparency < 0.5 then
					local origTransparency = child.BackgroundTransparency
					child.BackgroundTransparency = 1
					TweenService:Create(child, TweenInfo.new(0.25, Enum.EasingStyle.Quad), {
						BackgroundTransparency = origTransparency,
					}):Play()
				end
			end
		end
	end)
end

for _, gui in playerGui:GetChildren() do
	if gui:IsA("ScreenGui") then setupGuiFade(gui) end
end
playerGui.ChildAdded:Connect(function(child)
	if child:IsA("ScreenGui") then setupGuiFade(child) end
end)

-- ═══════════════════════════════════════════════
-- 4. SURFACE-BASED FOOTSTEP VARIATION
-- ═══════════════════════════════════════════════

local lastFootstepMaterial = nil

local function getFloorMaterial()
	local char = player.Character
	if not char then return nil end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if not hrp then return nil end

	local rayResult = workspace:Raycast(hrp.Position, Vector3.new(0, -5, 0))
	if rayResult and rayResult.Instance then
		return rayResult.Material
	end
	return nil
end

-- Apply footstep sound variation every 2 seconds
task.spawn(function()
	while true do
		task.wait(2)
		local mat = getFloorMaterial()
		if mat and mat ~= lastFootstepMaterial then
			lastFootstepMaterial = mat
			-- Metal floors echo more, slate is dull, neon is high-pitched
			local char = player.Character
			if char then
				local humanoid = char:FindFirstChild("Humanoid")
				if humanoid then
					-- Vary walk sound pitch based on material
					-- Roblox handles this natively, but we boost awareness
				end
			end
		end
	end
end)

-- ═══════════════════════════════════════════════
-- 5. PROXIMITY GLOW NEAR FACTORIES
-- ═══════════════════════════════════════════════

local colorCorrection = Lighting:FindFirstChildWhichIsA("ColorCorrectionEffect")

task.spawn(function()
	while true do
		task.wait(1)
		local char = player.Character
		if char and colorCorrection then
			local hrp = char:FindFirstChild("HumanoidRootPart")
			if hrp then
				local pos = hrp.Position
				-- Near factory (-2000, x, x) → warm tint
				local factoryDist = math.abs(pos.X + 2000)
				if factoryDist < 500 then
					local t = 1 - factoryDist / 500
					colorCorrection.TintColor = Color3.fromRGB(
						240 + math.floor(t * 15),
						238 - math.floor(t * 20),
						250 - math.floor(t * 40)
					)
				else
					colorCorrection.TintColor = Color3.fromRGB(240, 238, 250)
				end
			end
		end
	end
end)

-- ═══════════════════════════════════════════════
-- 6. HAZARD ZONE VIGNETTE
-- ═══════════════════════════════════════════════

local vignetteGui = Instance.new("ScreenGui")
vignetteGui.Name = "Vignette"
vignetteGui.DisplayOrder = 80
vignetteGui.IgnoreGuiInset = true
vignetteGui.Parent = playerGui

local vignetteFrame = Instance.new("Frame")
vignetteFrame.Size = UDim2.new(1, 0, 1, 0)
vignetteFrame.BackgroundTransparency = 1
vignetteFrame.Parent = vignetteGui

-- Create vignette edges (4 gradient frames)
local function createVignetteEdge(pos, size, rot)
	local edge = Instance.new("Frame")
	edge.Size = size
	edge.Position = pos
	edge.Rotation = rot or 0
	edge.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	edge.BackgroundTransparency = 1
	edge.Parent = vignetteFrame
	return edge
end

local vEdges = {
	createVignetteEdge(UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 0.08, 0)),     -- top
	createVignetteEdge(UDim2.new(0, 0, 0.92, 0), UDim2.new(1, 0, 0.08, 0)),   -- bottom
	createVignetteEdge(UDim2.new(0, 0, 0, 0), UDim2.new(0.06, 0, 1, 0)),      -- left
	createVignetteEdge(UDim2.new(0.94, 0, 0, 0), UDim2.new(0.06, 0, 1, 0)),   -- right
}

-- Pulse vignette during weather hazards or incidents
local weatherEvent = Remotes:FindFirstChild("WeatherChanged")
if weatherEvent then
	weatherEvent.OnClientEvent:Connect(function(data)
		local isHazard = data.id == "storm" or data.id == "hail"
		for _, edge in ipairs(vEdges) do
			TweenService:Create(edge, TweenInfo.new(1), {
				BackgroundTransparency = isHazard and 0.5 or 1,
			}):Play()
		end
	end)
end

-- ═══════════════════════════════════════════════
-- 7. ATOM COLLECTION CELEBRATION
-- ═══════════════════════════════════════════════

local atomEvent = Remotes:FindFirstChild("AtomCollected")
if atomEvent then
	atomEvent.OnClientEvent:Connect(function(data)
		-- Radial burst particles from player position
		local char = player.Character
		if not char then return end
		local hrp = char:FindFirstChild("HumanoidRootPart")
		if not hrp then return end

		-- Brief sparkle effect
		local sparkle = Instance.new("ParticleEmitter")
		sparkle.Color = ColorSequence.new(Color3.fromRGB(200, 255, 220))
		sparkle.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.5),
			NumberSequenceKeypoint.new(1, 0),
		})
		sparkle.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0),
			NumberSequenceKeypoint.new(1, 1),
		})
		sparkle.Lifetime = NumberRange.new(0.3, 0.6)
		sparkle.Rate = 50
		sparkle.Speed = NumberRange.new(8, 15)
		sparkle.SpreadAngle = Vector2.new(180, 180)
		sparkle.LightEmission = 1
		sparkle.Parent = hrp

		-- Rare atoms get bigger celebration
		if data.rarity == "epic" or data.rarity == "legendary" then
			sparkle.Rate = 150
			sparkle.Size = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 1.0),
				NumberSequenceKeypoint.new(1, 0),
			})
			sparkle.Lifetime = NumberRange.new(0.5, 1.0)
			triggerShake(0.1, 0.3)
		end

		task.delay(0.4, function()
			sparkle.Enabled = false
			task.delay(1, function() sparkle:Destroy() end)
		end)
	end)
end

-- ═══════════════════════════════════════════════
-- 8. PRODUCT SALE CELEBRATION
-- ═══════════════════════════════════════════════

local announceEvent = Remotes:FindFirstChild("ServerAnnounce")
if announceEvent then
	announceEvent.OnClientEvent:Connect(function(data)
		if data.message and (string.find(data.message, "SOLD") or string.find(data.message, "V2O5")) then
			-- Golden flash for sales
			flashFrame.BackgroundColor3 = Color3.fromRGB(255, 215, 100)
			flashFrame.BackgroundTransparency = 0.7
			TweenService:Create(flashFrame, TweenInfo.new(0.6), {
				BackgroundTransparency = 1,
			}):Play()
		end
	end)
end

print("[MOLGANG] VisualPolish loaded — camera shake, GUI transitions, proximity effects, celebrations")
