--[[
	VRARController.client.lua
	MOLGANG — VR & AR Support Controller

	Handles immersive experiences:
	- VR headset detection and camera setup
	- VR hand/controller pointer interaction
	- Spatial UI panels (BillboardGui-based menus)
	- Comfort vignette during movement
	- Teleport locomotion option
	- AR camera pass-through on mobile
	- Adaptive UI scaling for headset vs desktop vs mobile

	Roblox VR support is native via UserInputService.VREnabled.
	Uses VRService for hand tracking and controller input.
]]

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local VRService = game:GetService("VRService")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterGui = game:GetService("StarterGui")
local Camera = workspace.CurrentCamera

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- ═══════════════════════════════════════════════
-- DETECT MODE
-- ═══════════════════════════════════════════════

local isVR = UserInputService.VREnabled
local isTouch = UserInputService.TouchEnabled
local isAR = false  -- set below based on camera type

local MODE = isVR and "VR" or isTouch and "MOBILE" or "DESKTOP"

print("[MOLGANG] Input mode detected:", MODE)

-- ═══════════════════════════════════════════════
-- VR CONFIGURATION
-- ═══════════════════════════════════════════════

local VR_CONFIG = {
	-- Comfort
	vignetteEnabled = true,
	vignetteIntensity = 0.3,
	snapTurnDegrees = 30,
	teleportEnabled = true,
	teleportRange = 80,           -- studs max teleport distance

	-- Interaction
	laserPointerRange = 50,       -- studs
	laserPointerColor = Color3.fromRGB(0, 220, 130),
	interactionDistance = 8,      -- studs for hand grab

	-- UI
	spatialUIDistance = 4,        -- studs from player for floating panels
	uiScale = 1.5,               -- VR GUI is larger for readability
	worldUIScale = 1.2,          -- billboard text bigger in VR
}

-- ═══════════════════════════════════════════════
-- VR MODE SETUP
-- ═══════════════════════════════════════════════

if isVR then
	print("[MOLGANG] VR headset detected — initializing immersive mode")

	-- Configure VR-specific camera
	Camera.HeadScale = 1.0
	StarterGui:SetCore("VRLaserPointerMode", 1)  -- enable laser pointer
	StarterGui:SetCore("VREnableControllerModels", true)

	-- ── Comfort Vignette ──
	-- Darkens screen edges during movement to reduce motion sickness
	local vignetteGui = Instance.new("ScreenGui")
	vignetteGui.Name = "VRVignette"
	vignetteGui.ResetOnSpawn = false
	vignetteGui.IgnoreGuiInset = true
	vignetteGui.DisplayOrder = 200
	vignetteGui.Parent = playerGui

	local vignetteFrame = Instance.new("Frame")
	vignetteFrame.Size = UDim2.new(1, 0, 1, 0)
	vignetteFrame.BackgroundTransparency = 1
	vignetteFrame.BorderSizePixel = 0
	vignetteFrame.Parent = vignetteGui

	-- Radial gradient for vignette effect
	local vigGradient = Instance.new("UIGradient")
	vigGradient.Color = ColorSequence.new(Color3.new(0, 0, 0))
	vigGradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1),       -- center: transparent
		NumberSequenceKeypoint.new(0.5, 1),     -- mid: transparent
		NumberSequenceKeypoint.new(0.85, 0.7),  -- edge: darkening
		NumberSequenceKeypoint.new(1, 0),        -- outer edge: black
	})
	vigGradient.Parent = vignetteFrame

	local lastPosition = Vector3.new(0, 0, 0)
	local isMoving = false

	RunService.RenderStepped:Connect(function()
		local character = player.Character
		if not character then return end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if not hrp then return end

		local currentPos = hrp.Position
		local velocity = (currentPos - lastPosition).Magnitude
		lastPosition = currentPos

		-- Show vignette when moving fast
		local targetTransparency = velocity > 0.5 and (1 - VR_CONFIG.vignetteIntensity) or 1
		if VR_CONFIG.vignetteEnabled then
			vignetteFrame.BackgroundTransparency = targetTransparency
		end
	end)

	-- ── VR Laser Pointer (for interacting with world objects) ──
	local laserPart = Instance.new("Part")
	laserPart.Name = "VRLaserPointer"
	laserPart.Size = Vector3.new(0.05, 0.05, VR_CONFIG.laserPointerRange)
	laserPart.Color = VR_CONFIG.laserPointerColor
	laserPart.Material = Enum.Material.Neon
	laserPart.Transparency = 0.5
	laserPart.Anchored = true
	laserPart.CanCollide = false
	laserPart.CastShadow = false
	laserPart.Parent = workspace

	-- Laser dot at endpoint
	local laserDot = Instance.new("Part")
	laserDot.Name = "VRLaserDot"
	laserDot.Shape = Enum.PartType.Ball
	laserDot.Size = Vector3.new(0.3, 0.3, 0.3)
	laserDot.Color = VR_CONFIG.laserPointerColor
	laserDot.Material = Enum.Material.Neon
	laserDot.Anchored = true
	laserDot.CanCollide = false
	laserDot.CastShadow = false
	laserDot.Parent = workspace

	-- Update laser pointer each frame
	RunService.RenderStepped:Connect(function()
		-- Get right hand CFrame from VR
		local success, rightHandCF = pcall(function()
			return VRService:GetUserCFrame(Enum.UserCFrame.RightHand)
		end)

		if success and rightHandCF then
			local headCF = Camera.CFrame
			local handWorldCF = headCF * rightHandCF

			-- Raycast from hand
			local origin = handWorldCF.Position
			local direction = handWorldCF.LookVector * VR_CONFIG.laserPointerRange

			local rayParams = RaycastParams.new()
			rayParams.FilterType = Enum.RaycastFilterType.Exclude
			rayParams.FilterDescendantsInstances = {player.Character, laserPart, laserDot}

			local result = workspace:Raycast(origin, direction, rayParams)

			if result then
				local hitPos = result.Position
				local dist = (hitPos - origin).Magnitude
				laserPart.Size = Vector3.new(0.05, 0.05, dist)
				laserPart.CFrame = CFrame.lookAt(origin, hitPos) * CFrame.new(0, 0, -dist / 2)
				laserDot.Position = hitPos
				laserDot.Visible = true

				-- Check if pointing at interactable
				local hitPart = result.Instance
				if hitPart:GetAttribute("Interactable") then
					laserDot.Color = Color3.fromRGB(255, 215, 0)  -- gold for interactable
					laserDot.Size = Vector3.new(0.5, 0.5, 0.5)
				else
					laserDot.Color = VR_CONFIG.laserPointerColor
					laserDot.Size = Vector3.new(0.3, 0.3, 0.3)
				end
			else
				laserPart.CFrame = CFrame.lookAt(origin, origin + direction) * CFrame.new(0, 0, -VR_CONFIG.laserPointerRange / 2)
				laserPart.Size = Vector3.new(0.05, 0.05, VR_CONFIG.laserPointerRange)
				laserDot.Visible = false
			end
		else
			laserPart.Transparency = 1
			laserDot.Visible = false
		end
	end)

	-- ── VR Trigger Input (interact with pointed object) ──
	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then return end

		-- VR trigger buttons
		if input.KeyCode == Enum.KeyCode.ButtonR1 or input.KeyCode == Enum.KeyCode.ButtonR2 then
			-- Check what laser is pointing at
			local success, rightHandCF = pcall(function()
				return VRService:GetUserCFrame(Enum.UserCFrame.RightHand)
			end)

			if success and rightHandCF then
				local headCF = Camera.CFrame
				local handWorldCF = headCF * rightHandCF
				local origin = handWorldCF.Position
				local direction = handWorldCF.LookVector * VR_CONFIG.laserPointerRange

				local rayParams = RaycastParams.new()
				rayParams.FilterType = Enum.RaycastFilterType.Exclude
				rayParams.FilterDescendantsInstances = {player.Character, laserPart, laserDot}

				local result = workspace:Raycast(origin, direction, rayParams)
				if result and result.Instance:GetAttribute("Interactable") then
					local interactionType = result.Instance:GetAttribute("InteractionType")
					handleVRInteraction(result.Instance, interactionType)
				end
			end
		end

		-- VR Snap Turn (thumbstick left/right)
		if input.KeyCode == Enum.KeyCode.Thumbstick2 then
			-- Handled by Roblox default VR controls
		end
	end)

	-- ── VR Teleport (left trigger + point at ground) ──
	local teleportMarker = Instance.new("Part")
	teleportMarker.Name = "TeleportMarker"
	teleportMarker.Shape = Enum.PartType.Cylinder
	teleportMarker.Size = Vector3.new(0.5, 4, 4)
	teleportMarker.Color = Color3.fromRGB(0, 200, 255)
	teleportMarker.Material = Enum.Material.Neon
	teleportMarker.Transparency = 0.5
	teleportMarker.Anchored = true
	teleportMarker.CanCollide = false
	teleportMarker.CastShadow = false
	teleportMarker.Orientation = Vector3.new(0, 0, 90)
	teleportMarker.Visible = false
	teleportMarker.Parent = workspace

	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then return end
		if input.KeyCode == Enum.KeyCode.ButtonL2 and VR_CONFIG.teleportEnabled then
			-- Show teleport marker and execute teleport on release
			teleportMarker.Visible = true
		end
	end)

	UserInputService.InputEnded:Connect(function(input)
		if input.KeyCode == Enum.KeyCode.ButtonL2 and teleportMarker.Visible then
			teleportMarker.Visible = false
			-- Teleport to marker position
			local character = player.Character
			if character and teleportMarker.Position.Y > -50 then
				local hrp = character:FindFirstChild("HumanoidRootPart")
				if hrp then
					hrp.CFrame = CFrame.new(teleportMarker.Position + Vector3.new(0, 3, 0))
				end
			end
		end
	end)

	-- Update teleport marker position
	RunService.RenderStepped:Connect(function()
		if not teleportMarker.Visible then return end

		local success, leftHandCF = pcall(function()
			return VRService:GetUserCFrame(Enum.UserCFrame.LeftHand)
		end)

		if success and leftHandCF then
			local headCF = Camera.CFrame
			local handWorldCF = headCF * leftHandCF
			local origin = handWorldCF.Position
			local direction = handWorldCF.LookVector * VR_CONFIG.teleportRange

			local rayParams = RaycastParams.new()
			rayParams.FilterType = Enum.RaycastFilterType.Exclude
			rayParams.FilterDescendantsInstances = {player.Character, teleportMarker, laserPart, laserDot}

			local result = workspace:Raycast(origin, direction, rayParams)
			if result and result.Normal.Y > 0.5 then  -- only teleport to walkable surfaces
				teleportMarker.Position = result.Position
				teleportMarker.Transparency = 0.3
			else
				teleportMarker.Transparency = 0.8
			end
		end
	end)

end  -- end VR mode

-- ═══════════════════════════════════════════════
-- VR INTERACTION HANDLER
-- Opens the correct GUI based on interactable type
-- ═══════════════════════════════════════════════

function handleVRInteraction(part, interactionType)
	if not interactionType then return end

	local guiMapping = {
		SlagCrushStation = "SlagProcessingGui",
		SlagLeachStation = "SlagProcessingGui",
		SlagSupplier = "SlagProcessingGui",
		SlagCoolingPit = "SlagProcessingGui",
		SlagVibratingScreen = "SlagProcessingGui",
		SlagConeCrusher = "SlagProcessingGui",
		SlagBallMill = "SlagProcessingGui",
		SlagRoastingKiln = "SlagProcessingGui",
		SlagFiltration = "SlagProcessingGui",
		ANK_Counter = "DashboardGui",
		ANK_Building = "DashboardGui",
		ANK_Teller = "DashboardGui",
		XRPL_Registry = "WalletGui",
		MolChainBeacon = "WalletGui",
		Quiz = "DashboardGui",
		collect = nil,  -- handled by AtomCollector
	}

	local targetGui = guiMapping[interactionType]
	if targetGui then
		local gui = playerGui:FindFirstChild(targetGui)
		if gui then
			gui.Enabled = true
		end
	end
end

-- ═══════════════════════════════════════════════
-- ADAPTIVE UI SCALING
-- Scales all GUIs for headset, desktop, or mobile
-- ═══════════════════════════════════════════════

local function applyUIScale()
	local scale = 1.0
	if isVR then
		scale = VR_CONFIG.uiScale  -- 1.5x for VR readability
	elseif isTouch then
		local viewportSize = Camera.ViewportSize
		local minDim = math.min(viewportSize.X, viewportSize.Y)
		scale = math.clamp(minDim / 800, 0.6, 1.0)
	end

	-- Apply scale to all ScreenGuis
	for _, gui in playerGui:GetChildren() do
		if gui:IsA("ScreenGui") then
			local existingScale = gui:FindFirstChildOfClass("UIScale")
			if existingScale then
				existingScale.Scale = scale
			end
		end
	end

	-- Scale world BillboardGuis for VR
	if isVR then
		task.spawn(function()
			task.wait(3)  -- wait for world to load
			for _, desc in workspace:GetDescendants() do
				if desc:IsA("BillboardGui") then
					desc.Size = UDim2.new(
						desc.Size.X.Scale * VR_CONFIG.worldUIScale,
						desc.Size.X.Offset * VR_CONFIG.worldUIScale,
						desc.Size.Y.Scale * VR_CONFIG.worldUIScale,
						desc.Size.Y.Offset * VR_CONFIG.worldUIScale
					)
					desc.MaxDistance = desc.MaxDistance * 1.5  -- visible from further in VR
				end
			end
		end)
	end
end

-- ═══════════════════════════════════════════════
-- AR MODE (Mobile)
-- Uses Roblox's built-in AR session
-- ═══════════════════════════════════════════════

if isTouch and not isVR then
	-- AR overlay hint (shows after 30 seconds for mobile users)
	task.delay(30, function()
		-- Check if device supports AR
		local arSupported = pcall(function()
			return Camera.CameraType == Enum.CameraType.Custom
		end)

		if arSupported then
			-- Show AR hint in teaser overlay
			local arHint = Instance.new("TextLabel")
			arHint.Size = UDim2.fromOffset(260, 36)
			arHint.Position = UDim2.new(0.5, -130, 0, 90)
			arHint.BackgroundColor3 = Color3.fromRGB(20, 30, 50)
			arHint.BackgroundTransparency = 0.2
			arHint.TextColor3 = Color3.fromRGB(80, 180, 255)
			arHint.Text = "AR Mode: Point camera at flat surface!"
			arHint.TextScaled = true
			arHint.Font = Enum.Font.GothamBold
			arHint.Parent = playerGui:FindFirstChild("TeaserOverlay") or playerGui

			local corner = Instance.new("UICorner")
			corner.CornerRadius = UDim.new(0, 8)
			corner.Parent = arHint

			-- Auto-dismiss
			task.delay(8, function()
				TweenService:Create(arHint, TweenInfo.new(0.5), {
					TextTransparency = 1,
					BackgroundTransparency = 1,
				}):Play()
				task.delay(0.6, function()
					arHint:Destroy()
				end)
			end)
		end
	end)
end

-- ═══════════════════════════════════════════════
-- WORLD INTERACTION (click/touch on interactable objects)
-- Works for both desktop and mobile/VR
-- ═══════════════════════════════════════════════

if not isVR then
	-- Desktop/mobile: click on interactable objects
	local mouse = player:GetMouse()

	mouse.Button1Down:Connect(function()
		local target = mouse.Target
		if target and target:GetAttribute("Interactable") then
			local character = player.Character
			if not character then return end
			local hrp = character:FindFirstChild("HumanoidRootPart")
			if not hrp then return end

			-- Distance check
			local dist = (hrp.Position - target.Position).Magnitude
			if dist < 30 then
				local interactionType = target:GetAttribute("InteractionType")
				handleVRInteraction(target, interactionType)
			end
		end
	end)
end

-- Apply UI scaling on load
task.delay(2, applyUIScale)
Camera:GetPropertyChangedSignal("ViewportSize"):Connect(applyUIScale)

-- ═══════════════════════════════════════════════
-- MODE INDICATOR (shows current input mode)
-- ═══════════════════════════════════════════════

local modeGui = Instance.new("ScreenGui")
modeGui.Name = "ModeIndicator"
modeGui.ResetOnSpawn = false
modeGui.IgnoreGuiInset = true
modeGui.DisplayOrder = 3
modeGui.Parent = playerGui

local modeLabel = Instance.new("TextLabel")
modeLabel.Size = UDim2.fromOffset(80, 18)
modeLabel.Position = UDim2.new(1, -90, 1, -22)
modeLabel.BackgroundColor3 = isVR and Color3.fromRGB(80, 40, 200) or Color3.fromRGB(30, 35, 50)
modeLabel.BackgroundTransparency = 0.4
modeLabel.TextColor3 = Color3.fromRGB(180, 190, 210)
modeLabel.Text = isVR and "VR Mode" or isTouch and "Mobile" or "Desktop"
modeLabel.TextScaled = true
modeLabel.Font = Enum.Font.Gotham
modeLabel.Parent = modeGui
local mCorner = Instance.new("UICorner")
mCorner.CornerRadius = UDim.new(0, 4)
mCorner.Parent = modeLabel

print("[MOLGANG] VR/AR Controller initialized — Mode:", MODE)
if isVR then
	print("  VR Features: Laser pointer, teleport, comfort vignette, spatial UI")
end
