--[[
	MinimapGui.client.lua
	MOLGANG — Minimap with Zone Navigation & Travel Time

	Features:
	- Top-left corner minimap showing player position
	- Zone markers with icons and travel time estimates
	- Click zone on minimap to set waypoint (arrow + ETA)
	- Teleport pad indicators
	- Real-time player dot tracking
	- Toggle with N key
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StationAccess = require(ReplicatedStorage.Modules.StationAccess)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local WALK_SPEED = 16 -- studs/second (default Humanoid.WalkSpeed)
local MAP_SCALE = 0.025 -- 1 stud = 0.025 pixels on minimap
local MAP_SIZE = 180

-- Zone data (from WorldBuilder)
local ZONES = {
	{name = "Nexus Hub", shortName = "HUB", pos = Vector3.new(0, 14, 0), color = Color3.fromRGB(0, 220, 130), icon = "H"},
	{name = "Periodic Biome", shortName = "PT", pos = Vector3.new(0, 15, 2000), color = Color3.fromRGB(100, 150, 255), icon = "P"},
	{name = "Quantum Lab", shortName = "LAB", pos = Vector3.new(2000, 35, 0), color = Color3.fromRGB(160, 80, 255), icon = "Q"},
	{name = "Slakkenspoor", shortName = "FAB", pos = Vector3.new(-2000, 10, 0), color = Color3.fromRGB(255, 140, 40), icon = "S"},
	{name = "MolChain Tower", shortName = "MCT", pos = Vector3.new(500, 15, 0), color = Color3.fromRGB(35, 200, 100), icon = "M"},
	{name = "ANK Bank", shortName = "ANK", pos = Vector3.new(-500, 15, 0), color = Color3.fromRGB(34, 139, 34), icon = "A"},
	{name = "North Mines", shortName = "MN", pos = Vector3.new(0, 5, 3500), color = Color3.fromRGB(200, 160, 40), icon = "N"},
	{name = "East Mines", shortName = "ME", pos = Vector3.new(3500, 5, 0), color = Color3.fromRGB(200, 160, 40), icon = "E"},
	{name = "South Mines", shortName = "MS", pos = Vector3.new(0, 5, -3500), color = Color3.fromRGB(200, 160, 40), icon = "S"},
	{name = "West Mines", shortName = "MW", pos = Vector3.new(-3500, -10, 0), color = Color3.fromRGB(200, 160, 40), icon = "W"},
}

-- Teleport pads (from WorldBuilder hub)
local TELEPORTS = {
	{name = "→ North Ridge", pos = Vector3.new(30, 14, -20), target = Vector3.new(0, 10, 3500)},
	{name = "→ East Plateau", pos = Vector3.new(45, 14, -20), target = Vector3.new(3500, 10, 0)},
	{name = "→ South Basin", pos = Vector3.new(60, 14, -20), target = Vector3.new(0, 10, -3500)},
	{name = "→ Deep West", pos = Vector3.new(75, 14, -20), target = Vector3.new(-3500, -5, 0)},
}

local C = {
	bg = Color3.fromRGB(8, 10, 18),
	border = Color3.fromRGB(0, 140, 80),
	playerDot = Color3.fromRGB(255, 255, 255),
	waypoint = Color3.fromRGB(255, 215, 0),
	telepad = Color3.fromRGB(200, 160, 40),
	textDim = Color3.fromRGB(140, 150, 170),
}

local function corner(o, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = o end

-- ═══════════════════════════════════════════════
-- MINIMAP GUI
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "MinimapGui"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 5
screenGui.IgnoreGuiInset = true
screenGui.Parent = playerGui

-- Map container (top-left)
local mapFrame = Instance.new("Frame")
mapFrame.Name = "Minimap"
mapFrame.Size = UDim2.fromOffset(MAP_SIZE, MAP_SIZE)
mapFrame.Position = UDim2.new(0, 10, 0, 10)
mapFrame.BackgroundColor3 = C.bg
mapFrame.BackgroundTransparency = 0.15
mapFrame.Parent = screenGui
corner(mapFrame, 10)

local mapStroke = Instance.new("UIStroke")
mapStroke.Color = C.border
mapStroke.Thickness = 1.5
mapStroke.Transparency = 0.3
mapStroke.Parent = mapFrame

-- Map title
local mapTitle = Instance.new("TextLabel")
mapTitle.Size = UDim2.new(1, 0, 0, 14)
mapTitle.Position = UDim2.new(0, 0, 0, 2)
mapTitle.BackgroundTransparency = 1
mapTitle.Text = "MOLECULIA"
mapTitle.TextColor3 = C.border
mapTitle.TextScaled = true
mapTitle.Font = Enum.Font.GothamBold
mapTitle.Parent = mapFrame

-- Player dot (center of minimap, world rotates around it)
local playerDot = Instance.new("Frame")
playerDot.Name = "PlayerDot"
playerDot.Size = UDim2.fromOffset(6, 6)
playerDot.Position = UDim2.new(0.5, -3, 0.5, -3)
playerDot.BackgroundColor3 = C.playerDot
playerDot.Parent = mapFrame
corner(playerDot, 3)

-- Player direction indicator
local dirArrow = Instance.new("Frame")
dirArrow.Size = UDim2.fromOffset(2, 10)
dirArrow.Position = UDim2.new(0.5, -1, 0.5, -13)
dirArrow.BackgroundColor3 = C.playerDot
dirArrow.Parent = mapFrame

-- Zone dots on minimap
local zoneDots = {}
for _, zone in ipairs(ZONES) do
	local dot = Instance.new("Frame")
	dot.Name = "Zone_" .. zone.shortName
	dot.Size = UDim2.fromOffset(8, 8)
	dot.BackgroundColor3 = zone.color
	dot.Parent = mapFrame
	corner(dot, 4)

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromOffset(30, 10)
	label.Position = UDim2.new(0.5, -15, 1, 1)
	label.BackgroundTransparency = 1
	label.Text = zone.shortName
	label.TextColor3 = zone.color
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.Parent = dot

	table.insert(zoneDots, {dot = dot, zone = zone})
end

-- Teleport pad markers
for _, tp in ipairs(TELEPORTS) do
	local tpDot = Instance.new("Frame")
	tpDot.Name = "TP_" .. tp.name
	tpDot.Size = UDim2.fromOffset(5, 5)
	tpDot.BackgroundColor3 = C.telepad
	tpDot.Rotation = 45 -- diamond shape
	tpDot.Parent = mapFrame
	table.insert(zoneDots, {dot = tpDot, zone = {pos = tp.pos}})
end

-- Production stations are explicit navigation targets, not anonymous points
-- inside the factory zone. Their positions come from the shared station
-- contract used by server access validation.
local setWaypoint
for _, stationKey in ipairs({"crush", "cone", "mill", "leach"}) do
	local station = StationAccess.Stations[stationKey]
	local map = station.mapPosition
	local stationDot = Instance.new("Frame")
	stationDot.Name = "Station_" .. stationKey
	stationDot.Size = UDim2.fromOffset(9, 9)
	local stationColor = {
		crush = Color3.fromRGB(255, 150, 50),
		cone = Color3.fromRGB(255, 190, 80),
		mill = Color3.fromRGB(190, 120, 255),
		leach = Color3.fromRGB(80, 210, 255),
	}
	stationDot.BackgroundColor3 = stationColor[stationKey]
	stationDot.Parent = mapFrame
	corner(stationDot, 4)
	local stationLabel = Instance.new("TextLabel")
	stationLabel.Size = UDim2.fromOffset(72, 12)
	stationLabel.Position = UDim2.new(0.5, -36, 1, 1)
	stationLabel.BackgroundTransparency = 1
	stationLabel.Text = stationKey == "crush" and "CRUSH"
		or stationKey == "cone" and "CONE"
		or stationKey == "mill" and "MILL"
		or "LEACH"
	stationLabel.TextColor3 = stationDot.BackgroundColor3
	stationLabel.TextScaled = true
	stationLabel.Font = Enum.Font.GothamBold
	stationLabel.Parent = stationDot
	local stationPos = Vector3.new(map.x, map.y, map.z)
	local clickBtn = Instance.new("TextButton")
	clickBtn.Name = "SetWaypoint"
	clickBtn.Size = UDim2.new(1, 8, 1, 8)
	clickBtn.Position = UDim2.new(0, -4, 0, -4)
	clickBtn.BackgroundTransparency = 1
	clickBtn.Text = ""
	clickBtn.Parent = stationDot
	clickBtn.Activated:Connect(function()
		setWaypoint(station.label, stationPos)
	end)
	table.insert(zoneDots, {dot = stationDot, zone = {name = station.label, pos = stationPos}})
end

-- ═══════════════════════════════════════════════
-- WAYPOINT SYSTEM
-- ═══════════════════════════════════════════════

local activeWaypoint = nil

-- Waypoint HUD (shows direction arrow + ETA at bottom-center)
local waypointGui = Instance.new("Frame")
waypointGui.Name = "WaypointHUD"
waypointGui.Size = UDim2.new(0.25, 0, 0, 36)
waypointGui.Position = UDim2.new(0.375, 0, 0.92, 0)
waypointGui.BackgroundColor3 = Color3.fromRGB(15, 18, 30)
waypointGui.BackgroundTransparency = 0.2
waypointGui.Visible = false
waypointGui.Parent = screenGui
corner(waypointGui, 8)

local wpArrow = Instance.new("TextLabel")
wpArrow.Size = UDim2.new(0, 30, 1, 0)
wpArrow.BackgroundTransparency = 1
wpArrow.Text = "→"
wpArrow.TextColor3 = C.waypoint
wpArrow.TextScaled = true
wpArrow.Font = Enum.Font.GothamBold
wpArrow.Parent = waypointGui

local wpText = Instance.new("TextLabel")
wpText.Size = UDim2.new(1, -35, 1, 0)
wpText.Position = UDim2.new(0, 35, 0, 0)
wpText.BackgroundTransparency = 1
wpText.Text = ""
wpText.TextColor3 = C.waypoint
wpText.TextScaled = true
wpText.Font = Enum.Font.GothamBold
wpText.TextXAlignment = Enum.TextXAlignment.Left
wpText.Parent = waypointGui

function setWaypoint(zoneName, targetPos)
	activeWaypoint = {name = zoneName, pos = targetPos}
	waypointGui.Visible = true
end

local function clearWaypoint()
	activeWaypoint = nil
	waypointGui.Visible = false
end

-- Click on minimap zone to set waypoint
for _, zd in ipairs(zoneDots) do
	if zd.zone.name then
		local clickBtn = Instance.new("TextButton")
		clickBtn.Size = UDim2.new(1, 6, 1, 6)
		clickBtn.Position = UDim2.new(0, -3, 0, -3)
		clickBtn.BackgroundTransparency = 1
		clickBtn.Text = ""
		clickBtn.Parent = zd.dot

		clickBtn.Activated:Connect(function()
			setWaypoint(zd.zone.name, zd.zone.pos)
		end)
	end
end

-- ═══════════════════════════════════════════════
-- TRAVEL TIME INFO PANEL
-- ═══════════════════════════════════════════════

local infoPanel = Instance.new("Frame")
infoPanel.Size = UDim2.fromOffset(MAP_SIZE, 50)
infoPanel.Position = UDim2.new(0, 10, 0, MAP_SIZE + 15)
infoPanel.BackgroundColor3 = C.bg
infoPanel.BackgroundTransparency = 0.15
infoPanel.Parent = screenGui
corner(infoPanel, 6)

local zoneNameLabel = Instance.new("TextLabel")
zoneNameLabel.Size = UDim2.new(1, -8, 0, 16)
zoneNameLabel.Position = UDim2.new(0, 4, 0, 4)
zoneNameLabel.BackgroundTransparency = 1
zoneNameLabel.Text = "Current Zone: Nexus Hub"
zoneNameLabel.TextColor3 = C.border
zoneNameLabel.TextScaled = true
zoneNameLabel.Font = Enum.Font.GothamBold
zoneNameLabel.TextXAlignment = Enum.TextXAlignment.Left
zoneNameLabel.Parent = infoPanel

local travelTimeLabel = Instance.new("TextLabel")
travelTimeLabel.Size = UDim2.new(1, -8, 0, 14)
travelTimeLabel.Position = UDim2.new(0, 4, 0, 22)
travelTimeLabel.BackgroundTransparency = 1
travelTimeLabel.Text = "Nearest: Factory 2m5s | Teleport: 3s"
travelTimeLabel.TextColor3 = C.textDim
travelTimeLabel.TextScaled = true
travelTimeLabel.Font = Enum.Font.Gotham
travelTimeLabel.TextXAlignment = Enum.TextXAlignment.Left
travelTimeLabel.Parent = infoPanel

local coordLabel = Instance.new("TextLabel")
coordLabel.Size = UDim2.new(1, -8, 0, 12)
coordLabel.Position = UDim2.new(0, 4, 0, 36)
coordLabel.BackgroundTransparency = 1
coordLabel.Text = "Pos: 0, 14, 0"
coordLabel.TextColor3 = Color3.fromRGB(80, 90, 110)
coordLabel.TextScaled = true
coordLabel.Font = Enum.Font.Code
coordLabel.TextXAlignment = Enum.TextXAlignment.Left
coordLabel.Parent = infoPanel

-- ═══════════════════════════════════════════════
-- UPDATE LOOP (every 10 frames)
-- ═══════════════════════════════════════════════

local frameCount = 0

RunService.Heartbeat:Connect(function()
	frameCount = frameCount + 1
	if frameCount % 10 ~= 0 then return end

	local char = player.Character
	if not char then return end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	local playerPos = hrp.Position
	local playerDir = hrp.CFrame.LookVector

	-- Update coordinates
	coordLabel.Text = string.format("Pos: %d, %d, %d", playerPos.X, playerPos.Y, playerPos.Z)

	-- Update direction arrow rotation
	local angle = math.atan2(playerDir.X, playerDir.Z)
	dirArrow.Rotation = math.deg(-angle)

	-- Update zone dots relative to player (player-centered map)
	for _, zd in ipairs(zoneDots) do
		local relX = (zd.zone.pos.X - playerPos.X) * MAP_SCALE
		local relZ = (zd.zone.pos.Z - playerPos.Z) * MAP_SCALE

		-- Clamp to minimap bounds
		local maxR = MAP_SIZE * 0.45
		local dist = math.sqrt(relX * relX + relZ * relZ)
		if dist > maxR then
			relX = relX / dist * maxR
			relZ = relZ / dist * maxR
		end

		zd.dot.Position = UDim2.new(0.5, relX - 4, 0.5, -relZ - 4) -- -Z because screen Y is inverted
	end

	-- Find current zone
	local currentZone = "Open Space"
	local nearestDist = math.huge
	local nearestZone = ZONES[1]

	for _, zone in ipairs(ZONES) do
		local d = (Vector3.new(playerPos.X, 0, playerPos.Z) - Vector3.new(zone.pos.X, 0, zone.pos.Z)).Magnitude
		if d < nearestDist then
			nearestDist = d
			nearestZone = zone
		end
		if d < 500 then
			currentZone = zone.name
		end
	end

	zoneNameLabel.Text = "Zone: " .. currentZone
	zoneNameLabel.TextColor3 = nearestZone.color or C.border

	-- Travel time to nearest different zone
	local walkTime = math.ceil(nearestDist / WALK_SPEED)
	local walkMin = math.floor(walkTime / 60)
	local walkSec = walkTime % 60
	local walkStr = walkMin > 0 and (walkMin .. "m" .. walkSec .. "s") or (walkSec .. "s")

	-- Check if near a teleport pad
	local nearTeleport = false
	for _, tp in ipairs(TELEPORTS) do
		if (Vector3.new(playerPos.X, 0, playerPos.Z) - Vector3.new(tp.pos.X, 0, tp.pos.Z)).Magnitude < 50 then
			nearTeleport = true
			break
		end
	end

	travelTimeLabel.Text = "To " .. nearestZone.shortName .. ": " .. walkStr .. (nearTeleport and " | Teleport nearby!" or "")

	-- Update waypoint HUD
	if activeWaypoint then
		local wpDist = (Vector3.new(playerPos.X, 0, playerPos.Z) - Vector3.new(activeWaypoint.pos.X, 0, activeWaypoint.pos.Z)).Magnitude
		if wpDist < 20 then
			clearWaypoint() -- arrived
		else
			local wpTime = math.ceil(wpDist / WALK_SPEED)
			local wpMin = math.floor(wpTime / 60)
			local wpSec = wpTime % 60
			wpText.Text = activeWaypoint.name .. " — " .. (wpMin > 0 and (wpMin .. "m") or "") .. wpSec .. "s (" .. math.floor(wpDist) .. " studs)"

			-- Arrow direction
			local dx = activeWaypoint.pos.X - playerPos.X
			local dz = activeWaypoint.pos.Z - playerPos.Z
			local wpAngle = math.deg(math.atan2(dx, dz))
			wpArrow.Rotation = -wpAngle
		end
	end
end)

-- Toggle minimap with M (documented primary shortcut) or N (legacy shortcut).
UserInputService.InputBegan:Connect(function(input, gp)
	if gp then return end
	if input.KeyCode == Enum.KeyCode.M or input.KeyCode == Enum.KeyCode.N then
		screenGui.Enabled = not screenGui.Enabled
	end
end)

print("[MOLGANG] MinimapGui loaded — player-centered map with zone navigation + travel times (M/N key)")
