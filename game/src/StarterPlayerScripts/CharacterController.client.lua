-- StarterPlayerScripts/CharacterController.client.lua
-- MOLGANG Custom Character Controller
-- Adds momentum-based movement, head tracking toward cursor,
-- and foot IK for terrain-adaptive grounding.
-- Runs client-side; falls back gracefully if character is absent.

local Players           = game:GetService("Players")
local RunService        = game:GetService("RunService")
local UserInputService  = game:GetService("UserInputService")
local TweenService      = game:GetService("TweenService")

local player    = Players.LocalPlayer
local camera    = workspace.CurrentCamera

-- ══════════════════════════════════════════════
-- CONFIG
-- ══════════════════════════════════════════════

local CFG = {
	-- Momentum
	WALK_SPEED        = 16,      -- studs/s target speed
	SPRINT_SPEED      = 24,
	MOMENTUM_FACTOR   = 0.12,    -- 0=instant, 1=never stops (lerp alpha per frame)
	STOP_FACTOR       = 0.18,    -- deceleration when no input
	-- Head tracking
	HEAD_TRACK_RANGE  = 25,      -- studs: only track within this distance from cursor
	HEAD_YMAX         = 60,      -- degrees max horizontal head turn
	HEAD_XMAX         = 30,      -- degrees max vertical head tilt
	HEAD_LERP         = 0.08,    -- smooth factor
	-- Foot IK
	FOOT_IK_ENABLED   = true,
	FOOT_RAY_LENGTH   = 3.5,     -- studs below hip
	FOOT_LERP         = 0.25,    -- snap speed
	FOOT_MAX_SLOPE    = 40,      -- degrees: disable IK on steep terrain
	-- Idle sway
	IDLE_SWAY_AMP     = 0.015,   -- subtle body sway when standing still
	IDLE_SWAY_SPEED   = 0.8,     -- Hz
}

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local character: Model?
local humanoid:  Humanoid?
local rootPart:  BasePart?
local neck:      Motor6D?
local waist:     Motor6D?
local lFoot:     Motor6D?
local rFoot:     Motor6D?

local neckC0:    CFrame
local waistC0:   CFrame
local lFootC0:   CFrame
local rFootC0:   CFrame

local headTarget = CFrame.new()   -- current head orientation (lerped)
local lFootTarget: Vector3?
local rFootTarget: Vector3?

local velocitySmoothed = Vector3.new()
local idleTimer        = 0
local isSprinting      = false

-- ══════════════════════════════════════════════
-- BIND TO CHARACTER
-- ══════════════════════════════════════════════

local function bindCharacter(char: Model)
	character = char
	humanoid  = char:WaitForChild("Humanoid") :: Humanoid
	rootPart  = char:WaitForChild("HumanoidRootPart") :: BasePart

	-- Store original Motor6D C0 offsets
	local function grabMotor(partName: string, motorName: string): Motor6D?
		local part = char:FindFirstChild(partName)
		if not part then return nil end
		return part:FindFirstChild(motorName) :: Motor6D?
	end

	neck  = grabMotor("Head",     "Neck")
	waist = grabMotor("UpperTorso", "Waist")
	lFoot = grabMotor("LeftFoot",  "LeftAnkle")
	rFoot = grabMotor("RightFoot", "RightAnkle")

	-- R6 fallback
	if not neck then
		neck = grabMotor("Torso", "Neck")
	end

	if neck  then neckC0  = neck.C0  end
	if waist then waistC0 = waist.C0 end
	if lFoot then lFootC0 = lFoot.C0 end
	if rFoot then rFootC0 = rFoot.C0 end

	-- Set default walk speed
	humanoid.WalkSpeed = CFG.WALK_SPEED
end

player.CharacterAdded:Connect(bindCharacter)
if player.Character then
	bindCharacter(player.Character)
end

-- ══════════════════════════════════════════════
-- SPRINT INPUT
-- ══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then return end
	if input.KeyCode == Enum.KeyCode.LeftShift then
		isSprinting = true
		if humanoid then humanoid.WalkSpeed = CFG.SPRINT_SPEED end
	end
end)

UserInputService.InputEnded:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.LeftShift then
		isSprinting = false
		if humanoid then humanoid.WalkSpeed = CFG.WALK_SPEED end
	end
end)

-- ══════════════════════════════════════════════
-- HEAD TRACKING
-- Rotates neck/waist to face the cursor in world space.
-- ══════════════════════════════════════════════

local function updateHeadTracking(dt: number)
	if not neck or not rootPart then return end

	local mousePos = UserInputService:GetMouseLocation()
	local ray      = camera:ScreenPointToRay(mousePos.X, mousePos.Y)

	-- Project ray onto a plane 10 studs in front of character
	local charPos  = rootPart.Position
	local lookDir  = rootPart.CFrame.LookVector
	local planePos = charPos + lookDir * 10 + Vector3.new(0, 1.5, 0)

	-- Aim direction from head to cursor projection
	local head = character and character:FindFirstChild("Head")
	if not head then return end
	local headPos = (head :: BasePart).Position

	local hitPos: Vector3
	local result = workspace:Raycast(ray.Origin, ray.Direction * 100,
		RaycastParams.new())
	if result then
		hitPos = result.Position
	else
		hitPos = ray.Origin + ray.Direction * 20
	end

	-- Compute angles in character's local space
	local localDir  = rootPart.CFrame:PointToObjectSpace(hitPos) - Vector3.new(0, 1.5, 0)
	local yaw       = math.atan2(localDir.X, -localDir.Z)
	local pitch     = math.atan2(localDir.Y, Vector3.new(localDir.X, 0, localDir.Z).Magnitude)

	-- Clamp
	yaw   = math.clamp(yaw,   math.rad(-CFG.HEAD_YMAX), math.rad(CFG.HEAD_YMAX))
	pitch = math.clamp(pitch, math.rad(-CFG.HEAD_XMAX), math.rad(CFG.HEAD_XMAX))

	-- Build target CFrame
	local targetCF = neckC0 * CFrame.Angles(pitch * 0.7, yaw * 0.5, 0)

	-- Lerp toward target
	if neck then
		neck.C0 = neck.C0:Lerp(targetCF, CFG.HEAD_LERP)
	end

	-- Subtle waist rotation (half of neck)
	if waist then
		local waistTarget = waistC0 * CFrame.Angles(pitch * 0.2, yaw * 0.3, 0)
		waist.C0 = waist.C0:Lerp(waistTarget, CFG.HEAD_LERP * 0.6)
	end
end

-- ══════════════════════════════════════════════
-- FOOT IK
-- Raycasts downward from each foot anchor to conform to terrain.
-- ══════════════════════════════════════════════

local RAYCAST_PARAMS = RaycastParams.new()

local function setupFootRaycast()
	if not character then return end
	RAYCAST_PARAMS.FilterDescendantsInstances = {character}
	RAYCAST_PARAMS.FilterType = Enum.RaycastFilterType.Exclude
end

local function getFootAnchor(footName: string): (Vector3?, Vector3?)
	if not character or not rootPart then return nil, nil end
	local foot = character:FindFirstChild(footName)
	if not foot or not foot:IsA("BasePart") then return nil, nil end
	local pos = (foot :: BasePart).Position
	return pos, (foot :: BasePart).CFrame.UpVector
end

local function updateFootIK()
	if not CFG.FOOT_IK_ENABLED then return end
	if not rootPart or not humanoid then return end
	if humanoid:GetState() ~= Enum.HumanoidStateType.Running
		and humanoid:GetState() ~= Enum.HumanoidStateType.Landed then return end

	-- Left foot
	if lFoot then
		local pos = getFootAnchor("LeftFoot")
		if pos then
			local result = workspace:Raycast(
				pos + Vector3.new(0, 0.5, 0),
				Vector3.new(0, -CFG.FOOT_RAY_LENGTH, 0),
				RAYCAST_PARAMS
			)
			if result then
				local normal  = result.Normal
				local slope   = math.deg(math.acos(normal:Dot(Vector3.new(0,1,0))))
				if slope < CFG.FOOT_MAX_SLOPE then
					local targetOffset = Vector3.new(0, result.Position.Y - pos.Y, 0)
					local smoothed = (lFootTarget or Vector3.new()):Lerp(
						lFootC0.Position + targetOffset, CFG.FOOT_LERP)
					lFootTarget = smoothed
					lFoot.C0 = CFrame.new(smoothed) * (lFootC0 - lFootC0.Position)
				end
			else
				lFoot.C0 = lFoot.C0:Lerp(lFootC0, CFG.FOOT_LERP)
			end
		end
	end

	-- Right foot
	if rFoot then
		local pos = getFootAnchor("RightFoot")
		if pos then
			local result = workspace:Raycast(
				pos + Vector3.new(0, 0.5, 0),
				Vector3.new(0, -CFG.FOOT_RAY_LENGTH, 0),
				RAYCAST_PARAMS
			)
			if result then
				local normal = result.Normal
				local slope  = math.deg(math.acos(normal:Dot(Vector3.new(0,1,0))))
				if slope < CFG.FOOT_MAX_SLOPE then
					local targetOffset = Vector3.new(0, result.Position.Y - pos.Y, 0)
					local smoothed = (rFootTarget or Vector3.new()):Lerp(
						rFootC0.Position + targetOffset, CFG.FOOT_LERP)
					rFootTarget = smoothed
					rFoot.C0 = CFrame.new(smoothed) * (rFootC0 - rFootC0.Position)
				end
			else
				rFoot.C0 = rFoot.C0:Lerp(rFootC0, CFG.FOOT_LERP)
			end
		end
	end
end

-- ══════════════════════════════════════════════
-- IDLE SWAY
-- Subtle body sway when standing still for polish.
-- ══════════════════════════════════════════════

local function updateIdleSway(dt: number)
	if not waist or not rootPart or not humanoid then return end
	local vel = rootPart.AssemblyLinearVelocity
	local speed = Vector3.new(vel.X, 0, vel.Z).Magnitude

	if speed < 0.5 then
		idleTimer += dt * CFG.IDLE_SWAY_SPEED * math.pi * 2
		local sway = math.sin(idleTimer) * CFG.IDLE_SWAY_AMP
		local breathe = math.sin(idleTimer * 0.5) * (CFG.IDLE_SWAY_AMP * 0.5)
		waist.C0 = waistC0 * CFrame.Angles(breathe, sway, sway * 0.3)
	else
		idleTimer = 0
	end
end

-- ══════════════════════════════════════════════
-- MOMENTUM SYSTEM
-- Smooths character velocity for a weightier feel.
-- Applied by tweaking WalkSpeed each frame based on input direction.
-- ══════════════════════════════════════════════

local function updateMomentum(dt: number)
	if not humanoid or not rootPart then return end

	local move = humanoid.MoveDirection
	local hasInput = move.Magnitude > 0.1

	if hasInput then
		local targetSpeed = isSprinting and CFG.SPRINT_SPEED or CFG.WALK_SPEED
		local current     = humanoid.WalkSpeed
		humanoid.WalkSpeed = current + (targetSpeed - current) * (1 - CFG.MOMENTUM_FACTOR)
	else
		local current = humanoid.WalkSpeed
		if current > 0.5 then
			humanoid.WalkSpeed = current * (1 - CFG.STOP_FACTOR)
		else
			humanoid.WalkSpeed = 0
		end
	end
end

-- ══════════════════════════════════════════════
-- MAIN UPDATE LOOP
-- ══════════════════════════════════════════════

setupFootRaycast()

player.CharacterAdded:Connect(function()
	task.wait()  -- let character load
	setupFootRaycast()
end)

RunService.RenderStepped:Connect(function(dt: number)
	if not character or not humanoid then return end
	if humanoid.Health <= 0 then return end

	updateHeadTracking(dt)
	updateFootIK()
	updateIdleSway(dt)
	updateMomentum(dt)
end)

print("[MOLGANG] CharacterController initialized")
