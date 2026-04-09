-- StarterPlayerScripts/InteractionSystem.client.lua
-- MOLGANG Interaction System
-- Raycast-based object interaction: highlight on hover, inspect panel, grab mode.
-- Tags interactable objects via CollectionService: "Interactable", "Inspectable", "Grabbable"

local Players          = game:GetService("Players")
local RunService       = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local CollectionService = game:GetService("CollectionService")
local TweenService     = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

local player    = Players.LocalPlayer
local camera    = workspace.CurrentCamera
local playerGui = player:WaitForChild("PlayerGui")

-- ══════════════════════════════════════════════
-- CONFIG
-- ══════════════════════════════════════════════

local CFG = {
	RAY_DISTANCE    = 20,       -- studs max interaction range
	HIGHLIGHT_COLOR = Color3.fromRGB(34, 197, 94),   -- green
	INSPECT_COLOR   = Color3.fromRGB(255, 215, 0),   -- gold for inspectable
	GRAB_COLOR      = Color3.fromRGB(80, 180, 255),  -- blue for grabbable
	GRAB_DISTANCE   = 10,       -- studs: how far grabbed object floats
	GRAB_LERP       = 0.15,
	INSPECT_ANIM    = 0.25,     -- seconds for inspect panel tween
}

-- ══════════════════════════════════════════════
-- HIGHLIGHT INSTANCES
-- We keep one Highlight per interactable type.
-- ══════════════════════════════════════════════

local hoverHighlight = Instance.new("SelectionBox")
hoverHighlight.LineThickness = 0.04
hoverHighlight.Color3        = CFG.HIGHLIGHT_COLOR
hoverHighlight.SurfaceColor3 = CFG.HIGHLIGHT_COLOR
hoverHighlight.SurfaceTransparency = 0.85
hoverHighlight.Parent = workspace

-- ══════════════════════════════════════════════
-- INSPECT GUI
-- Floating panel that shows element/object info.
-- ══════════════════════════════════════════════

local inspectGui = Instance.new("ScreenGui")
inspectGui.Name          = "InspectGui"
inspectGui.ResetOnSpawn  = false
inspectGui.Parent        = playerGui

local inspectFrame = Instance.new("Frame")
inspectFrame.Size                  = UDim2.new(0, 260, 0, 160)
inspectFrame.Position              = UDim2.new(0.5, -130, 0.5, -80)
inspectFrame.BackgroundColor3      = Color3.fromRGB(8, 15, 12)
inspectFrame.BackgroundTransparency = 0.05
inspectFrame.BorderSizePixel       = 0
inspectFrame.Visible               = false
inspectFrame.Parent                = inspectGui

local inspectCorner = Instance.new("UICorner")
inspectCorner.CornerRadius = UDim.new(0, 8)
inspectCorner.Parent       = inspectFrame

local inspectStroke = Instance.new("UIStroke")
inspectStroke.Color     = CFG.INSPECT_COLOR
inspectStroke.Thickness = 2
inspectStroke.Parent    = inspectFrame

local inspectTitle = Instance.new("TextLabel")
inspectTitle.Size                 = UDim2.new(1, -16, 0, 28)
inspectTitle.Position             = UDim2.fromOffset(8, 8)
inspectTitle.BackgroundTransparency = 1
inspectTitle.Text                 = ""
inspectTitle.TextColor3           = CFG.INSPECT_COLOR
inspectTitle.TextScaled           = true
inspectTitle.Font                 = Enum.Font.GothamBold
inspectTitle.TextXAlignment       = Enum.TextXAlignment.Left
inspectTitle.Parent               = inspectFrame

local inspectBody = Instance.new("TextLabel")
inspectBody.Size                  = UDim2.new(1, -16, 1, -48)
inspectBody.Position              = UDim2.fromOffset(8, 40)
inspectBody.BackgroundTransparency = 1
inspectBody.Text                  = ""
inspectBody.TextColor3            = Color3.fromRGB(180, 220, 200)
inspectBody.TextScaled            = true
inspectBody.Font                  = Enum.Font.Gotham
inspectBody.TextXAlignment        = Enum.TextXAlignment.Left
inspectBody.TextYAlignment        = Enum.TextYAlignment.Top
inspectBody.TextWrapped           = true
inspectBody.Parent                = inspectFrame

local inspectClose = Instance.new("TextButton")
inspectClose.Size                 = UDim2.new(0, 22, 0, 22)
inspectClose.Position             = UDim2.new(1, -26, 0, 4)
inspectClose.BackgroundColor3     = Color3.fromRGB(239, 68, 68)
inspectClose.BackgroundTransparency = 0.3
inspectClose.Text                 = "×"
inspectClose.TextColor3           = Color3.fromRGB(255, 255, 255)
inspectClose.TextScaled           = true
inspectClose.Font                 = Enum.Font.GothamBold
inspectClose.BorderSizePixel      = 0
inspectClose.Parent               = inspectFrame

local closeCorner = Instance.new("UICorner")
closeCorner.CornerRadius = UDim.new(0, 4)
closeCorner.Parent       = inspectClose

-- ══════════════════════════════════════════════
-- CROSSHAIR HINT
-- Small text below crosshair showing action available.
-- ══════════════════════════════════════════════

local crosshairGui = Instance.new("ScreenGui")
crosshairGui.Name         = "CrosshairHintGui"
crosshairGui.ResetOnSpawn = false
crosshairGui.Parent       = playerGui

local hintLabel = Instance.new("TextLabel")
hintLabel.Size                  = UDim2.fromOffset(200, 20)
hintLabel.AnchorPoint           = Vector2.new(0.5, 0)
hintLabel.Position              = UDim2.new(0.5, 0, 0.5, 20)
hintLabel.BackgroundTransparency = 1
hintLabel.Text                  = ""
hintLabel.TextColor3            = Color3.fromRGB(255, 255, 255)
hintLabel.TextTransparency      = 0.2
hintLabel.TextScaled            = true
hintLabel.Font                  = Enum.Font.Gotham
hintLabel.Parent                = crosshairGui

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local hoveredPart:    BasePart?  = nil
local grabbedPart:    BasePart?  = nil
local grabbedOrigPos: Vector3?   = nil
local isInspecting    = false
local raycastParams   = RaycastParams.new()

-- Exclude local character from raycast
local function updateRaycastFilter()
	local char = player.Character
	if char then
		raycastParams.FilterDescendantsInstances = {char}
		raycastParams.FilterType = Enum.RaycastFilterType.Exclude
	end
end

player.CharacterAdded:Connect(updateRaycastFilter)
updateRaycastFilter()

-- ══════════════════════════════════════════════
-- INSPECT PANEL
-- ══════════════════════════════════════════════

local function showInspect(part: BasePart)
	isInspecting = true

	local title = part:GetAttribute("InspectTitle") or part.Name
	local body  = part:GetAttribute("InspectBody")
		or part:GetAttribute("ElementName")
		or part:GetAttribute("Description")
		or "No information available."

	-- Append element data if available
	local elementZ = part:GetAttribute("ElementZ")
	if elementZ then
		local symbol = part:GetAttribute("ElementSymbol") or "?"
		local mass   = part:GetAttribute("AtomicMass") or "?"
		body = string.format("Z = %d  |  Mass = %s\n%s", elementZ, tostring(mass), body)
	end

	inspectTitle.Text = title
	inspectBody.Text  = body
	inspectFrame.Visible = true
	inspectFrame.Size    = UDim2.new(0, 0, 0, 0)
	inspectFrame.Position = UDim2.new(0.5, 0, 0.5, 0)
	TweenService:Create(inspectFrame, TweenInfo.new(CFG.INSPECT_ANIM, Enum.EasingStyle.Back), {
		Size     = UDim2.new(0, 260, 0, 160),
		Position = UDim2.new(0.5, -130, 0.5, -80),
	}):Play()
end

local function hideInspect()
	isInspecting = false
	TweenService:Create(inspectFrame, TweenInfo.new(0.15), {
		Size     = UDim2.new(0, 0, 0, 0),
		Position = UDim2.new(0.5, 0, 0.5, 0),
	}):Play()
	task.delay(0.2, function()
		inspectFrame.Visible = false
	end)
end

inspectClose.MouseButton1Click:Connect(hideInspect)

-- ══════════════════════════════════════════════
-- GRAB SYSTEM
-- ══════════════════════════════════════════════

local function startGrab(part: BasePart)
	if part.Anchored then return end   -- can only grab unanchored parts
	grabbedPart    = part
	grabbedOrigPos = part.Position
	hintLabel.Text = "[Click] Release  [F] Return"
	CollectionService:AddTag(part, "BeingGrabbed")
end

local function releaseGrab()
	if not grabbedPart then return end
	CollectionService:RemoveTag(grabbedPart, "BeingGrabbed")
	-- Notify server of final position (for grabbable puzzle objects)
	Remotes.FireServer("GrabObject", {
		objectName = grabbedPart.Name,
		position   = grabbedPart.Position,
		released   = true,
	})
	grabbedPart = nil
	hintLabel.Text = ""
end

local function returnGrabbed()
	if not grabbedPart or not grabbedOrigPos then return end
	TweenService:Create(grabbedPart, TweenInfo.new(0.4, Enum.EasingStyle.Back), {
		Position = grabbedOrigPos,
	}):Play()
	releaseGrab()
end

-- ══════════════════════════════════════════════
-- INPUT
-- ══════════════════════════════════════════════

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then return end

	-- Left click: primary action on hovered part
	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		if grabbedPart then
			releaseGrab()
			return
		end
		if not hoveredPart then return end
		if CollectionService:HasTag(hoveredPart, "Inspectable") then
			if isInspecting then hideInspect() else showInspect(hoveredPart) end
		elseif CollectionService:HasTag(hoveredPart, "Grabbable") then
			startGrab(hoveredPart)
		end
	end

	-- E key: inspect
	if input.KeyCode == Enum.KeyCode.E then
		if hoveredPart and CollectionService:HasTag(hoveredPart, "Inspectable") then
			if isInspecting then hideInspect() else showInspect(hoveredPart) end
		elseif isInspecting then
			hideInspect()
		end
	end

	-- F key: return grabbed object
	if input.KeyCode == Enum.KeyCode.F then
		returnGrabbed()
	end

	-- Escape: close any open panels
	if input.KeyCode == Enum.KeyCode.Escape then
		hideInspect()
		releaseGrab()
	end
end)

-- ══════════════════════════════════════════════
-- MAIN UPDATE: RAYCAST + HIGHLIGHT
-- ══════════════════════════════════════════════

RunService.RenderStepped:Connect(function(dt: number)
	local char = player.Character
	if not char then return end

	-- Raycast from screen center
	local viewSize   = camera.ViewportSize
	local ray        = camera:ScreenPointToRay(viewSize.X / 2, viewSize.Y / 2)
	local result     = workspace:Raycast(ray.Origin, ray.Direction * CFG.RAY_DISTANCE, raycastParams)

	-- Update grabbed object position
	if grabbedPart then
		local targetPos = ray.Origin + ray.Direction * CFG.GRAB_DISTANCE
		grabbedPart.Position = grabbedPart.Position:Lerp(targetPos, CFG.GRAB_LERP)
		return
	end

	-- Clear previous hover
	if result then
		local part = result.Instance :: BasePart
		local model = part:FindFirstAncestorWhichIsA("Model") or part

		-- Walk up to find tagged ancestor
		local tagged: Instance? = nil
		local cur: Instance = part
		while cur do
			if CollectionService:HasTag(cur, "Interactable")
				or CollectionService:HasTag(cur, "Inspectable")
				or CollectionService:HasTag(cur, "Grabbable") then
				tagged = cur
				break
			end
			cur = cur.Parent
			if not cur or cur == workspace then break end
		end

		if tagged and tagged ~= hoveredPart then
			hoveredPart = tagged :: BasePart

			-- Set highlight color by type
			if CollectionService:HasTag(tagged, "Grabbable") then
				hoverHighlight.Color3        = CFG.GRAB_COLOR
				hoverHighlight.SurfaceColor3 = CFG.GRAB_COLOR
				hintLabel.Text               = "[Click/E] Grab"
			elseif CollectionService:HasTag(tagged, "Inspectable") then
				hoverHighlight.Color3        = CFG.INSPECT_COLOR
				hoverHighlight.SurfaceColor3 = CFG.INSPECT_COLOR
				hintLabel.Text               = "[E] Inspect"
			else
				hoverHighlight.Color3        = CFG.HIGHLIGHT_COLOR
				hoverHighlight.SurfaceColor3 = CFG.HIGHLIGHT_COLOR
				hintLabel.Text               = "[E] Interact"
			end
			hoverHighlight.Adornee = hoveredPart
		elseif not tagged then
			hoveredPart              = nil
			hoverHighlight.Adornee   = nil
			if not isInspecting then hintLabel.Text = "" end
		end
	else
		hoveredPart            = nil
		hoverHighlight.Adornee = nil
		if not isInspecting then hintLabel.Text = "" end
	end
end)

print("[MOLGANG] InteractionSystem initialized")
