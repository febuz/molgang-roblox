--[[
	TeaserOverlay.client.lua
	MOLGANG OTAP — Persistent Branding & Navigation

	Features:
	- Subtle MOLGANG logo watermark (top-left)
	- Zone compass with direction arrows (bottom-center)
	- OTAP teststraat status and navigation
	- Quick navigation hints showing nearest zone distances
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Wait for game to fully load
task.wait(4)

local COLORS = {
	brand      = Color3.fromRGB(0, 220, 130),
	brandDim   = Color3.fromRGB(0, 120, 70),
	panel      = Color3.fromRGB(12, 16, 26),
	text       = Color3.fromRGB(200, 210, 230),
	textDim    = Color3.fromRGB(100, 110, 130),
	north      = Color3.fromRGB(80, 180, 255),    -- Periodic Biome
	east       = Color3.fromRGB(160, 100, 255),   -- Quantum Lab
	west       = Color3.fromRGB(200, 120, 40),    -- Slakkenspoor
	center     = Color3.fromRGB(0, 220, 130),     -- Nexus Hub
	molchain   = Color3.fromRGB(35, 200, 100),    -- MolChain Tower
	ank        = Color3.fromRGB(34, 139, 34),     -- ANK Bank
}

-- ═══════════════════════════════════════════════
-- SCREEN GUI
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "TeaserOverlay"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 5
screenGui.Parent = playerGui

-- ═══════════════════════════════════════════════
-- BRAND WATERMARK (top-left, subtle)
-- ═══════════════════════════════════════════════

local brandFrame = Instance.new("Frame")
brandFrame.Size = UDim2.fromOffset(160, 36)
brandFrame.Position = UDim2.new(0, 10, 0, 8)
brandFrame.BackgroundTransparency = 1
brandFrame.Parent = screenGui

local brandText = Instance.new("TextLabel")
brandText.Size = UDim2.new(1, 0, 0, 22)
brandText.BackgroundTransparency = 1
brandText.Text = "MOLGANG"
brandText.TextColor3 = COLORS.brand
brandText.TextTransparency = 0.4
brandText.TextScaled = true
brandText.Font = Enum.Font.GothamBold
brandText.TextXAlignment = Enum.TextXAlignment.Left
brandText.Parent = brandFrame

local brandSub = Instance.new("TextLabel")
brandSub.Size = UDim2.new(1, 0, 0, 12)
brandSub.Position = UDim2.new(0, 0, 0, 22)
brandSub.BackgroundTransparency = 1
brandSub.Text = "Chemical Engineering Simulator | 2026"
brandSub.TextColor3 = COLORS.textDim
brandSub.TextTransparency = 0.3
brandSub.TextScaled = true
brandSub.Font = Enum.Font.Gotham
brandSub.TextXAlignment = Enum.TextXAlignment.Left
brandSub.Parent = brandFrame

-- ═══════════════════════════════════════════════
-- ZONE COMPASS (bottom-left)
-- ═══════════════════════════════════════════════

local ZONES = {
	{name = "Nexus Hub",      pos = Vector3.new(0, 10, 0),     color = COLORS.center,   short = "HUB"},
	{name = "Periodic Biome", pos = Vector3.new(0, 15, 2000),  color = COLORS.north,    short = "N"},
	{name = "Quantum Lab",    pos = Vector3.new(2000, 35, 0),  color = COLORS.east,     short = "E"},
	{name = "Slakkenspoor",   pos = Vector3.new(-2000, 5, 0),  color = COLORS.west,     short = "W"},
	{name = "MolChain",       pos = Vector3.new(500, 5, 0),    color = COLORS.molchain,  short = "MC"},
	{name = "ANK Bank",       pos = Vector3.new(-500, 5, 0),   color = COLORS.ank,      short = "ANK"},
}

local compassPanel = Instance.new("Frame")
compassPanel.Name = "Compass"
compassPanel.Size = UDim2.fromOffset(200, 120)
compassPanel.Position = UDim2.new(0, 10, 1, -130)
compassPanel.BackgroundColor3 = COLORS.panel
compassPanel.BackgroundTransparency = 0.15
compassPanel.BorderSizePixel = 0
compassPanel.Parent = screenGui

local cpCorner = Instance.new("UICorner")
cpCorner.CornerRadius = UDim.new(0, 8)
cpCorner.Parent = compassPanel

local cpStroke = Instance.new("UIStroke")
cpStroke.Color = COLORS.brandDim
cpStroke.Thickness = 1
cpStroke.Transparency = 0.5
cpStroke.Parent = compassPanel

-- Compass title
local compassTitle = Instance.new("TextLabel")
compassTitle.Size = UDim2.new(1, -8, 0, 16)
compassTitle.Position = UDim2.new(0, 4, 0, 2)
compassTitle.BackgroundTransparency = 1
compassTitle.Text = "ZONES"
compassTitle.TextColor3 = COLORS.brand
compassTitle.TextTransparency = 0.3
compassTitle.TextScaled = true
compassTitle.Font = Enum.Font.GothamBold
compassTitle.TextXAlignment = Enum.TextXAlignment.Center
compassTitle.Parent = compassPanel

-- Zone entries
local zoneLabels = {}
local zoneDistLabels = {}

for i, zone in ipairs(ZONES) do
	local yPos = 20 + (i - 1) * 16

	-- Color dot
	local dot = Instance.new("Frame")
	dot.Size = UDim2.fromOffset(6, 6)
	dot.Position = UDim2.new(0, 6, 0, yPos + 4)
	dot.BackgroundColor3 = zone.color
	dot.BorderSizePixel = 0
	dot.Parent = compassPanel
	local dCorner = Instance.new("UICorner")
	dCorner.CornerRadius = UDim.new(1, 0)
	dCorner.Parent = dot

	-- Zone name
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(0.6, -20, 0, 14)
	nameLabel.Position = UDim2.new(0, 16, 0, yPos)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = zone.name
	nameLabel.TextColor3 = COLORS.text
	nameLabel.TextTransparency = 0.2
	nameLabel.TextScaled = true
	nameLabel.Font = Enum.Font.Gotham
	nameLabel.TextXAlignment = Enum.TextXAlignment.Left
	nameLabel.Parent = compassPanel
	zoneLabels[i] = nameLabel

	-- Distance
	local distLabel = Instance.new("TextLabel")
	distLabel.Size = UDim2.new(0.35, 0, 0, 14)
	distLabel.Position = UDim2.new(0.65, 0, 0, yPos)
	distLabel.BackgroundTransparency = 1
	distLabel.Text = "..."
	distLabel.TextColor3 = zone.color
	distLabel.TextTransparency = 0.3
	distLabel.TextScaled = true
	distLabel.Font = Enum.Font.Code
	distLabel.TextXAlignment = Enum.TextXAlignment.Right
	distLabel.Parent = compassPanel
	zoneDistLabels[i] = distLabel
end

-- ═══════════════════════════════════════════════
-- LIVE DISTANCE UPDATES
-- ═══════════════════════════════════════════════

local character = player.Character or player.CharacterAdded:Wait()
local hrp = character:WaitForChild("HumanoidRootPart")

player.CharacterAdded:Connect(function(char)
	character = char
	hrp = char:WaitForChild("HumanoidRootPart")
end)

local frameCount = 0
-- Force immediate distance update on first frame
task.delay(2, function()
	if hrp and hrp.Parent then
		local playerPos = hrp.Position
		for i, zone in ipairs(ZONES) do
			local dist = (playerPos - zone.pos).Magnitude
			zoneDistLabels[i].Text = dist < 50 and "HERE" or (dist < 500 and (math.floor(dist) .. "m") or string.format("%.1fk", dist/1000))
		end
	end
end)

RunService.Heartbeat:Connect(function()
	frameCount = frameCount + 1
	if frameCount % 30 ~= 0 then return end -- update every ~0.5s
	if not hrp or not hrp.Parent then return end

	local playerPos = hrp.Position
	for i, zone in ipairs(ZONES) do
		local dist = (playerPos - zone.pos).Magnitude
		local distText
		if dist < 50 then
			distText = "HERE"
			zoneDistLabels[i].TextColor3 = Color3.fromRGB(0, 255, 130)
		elseif dist < 500 then
			distText = math.floor(dist) .. "m"
		else
			distText = string.format("%.1fk", dist / 1000)
		end
		zoneDistLabels[i].Text = distText
	end
end)

-- ═══════════════════════════════════════════════
-- DAILY CLAIM REMINDER (after 10 seconds)
-- ═══════════════════════════════════════════════

task.delay(10, function()
	local claimFrame = Instance.new("Frame")
	claimFrame.Size = UDim2.fromOffset(260, 45)
	claimFrame.Position = UDim2.new(0.5, -130, 0, 50)
	claimFrame.BackgroundColor3 = Color3.fromRGB(20, 30, 20)
	claimFrame.BackgroundTransparency = 0.1
	claimFrame.BorderSizePixel = 0
	claimFrame.Parent = screenGui

	local cfCorner = Instance.new("UICorner")
	cfCorner.CornerRadius = UDim.new(0, 8)
	cfCorner.Parent = claimFrame

	local cfStroke = Instance.new("UIStroke")
	cfStroke.Color = COLORS.brand
	cfStroke.Thickness = 1.5
	cfStroke.Parent = claimFrame

	local claimText = Instance.new("TextLabel")
	claimText.Size = UDim2.new(0.7, -8, 1, 0)
	claimText.Position = UDim2.new(0, 8, 0, 0)
	claimText.BackgroundTransparency = 1
	claimText.Text = "Daily bonus available!\n+50 MolCoins"
	claimText.TextColor3 = COLORS.brand
	claimText.TextScaled = true
	claimText.Font = Enum.Font.GothamBold
	claimText.TextXAlignment = Enum.TextXAlignment.Left
	claimText.TextWrapped = true
	claimText.Parent = claimFrame

	local claimBtn = Instance.new("TextButton")
	claimBtn.Size = UDim2.new(0.28, 0, 0.7, 0)
	claimBtn.Position = UDim2.new(0.7, 0, 0.15, 0)
	claimBtn.BackgroundColor3 = COLORS.brand
	claimBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
	claimBtn.Text = "Claim"
	claimBtn.Font = Enum.Font.GothamBold
	claimBtn.TextScaled = true
	claimBtn.Parent = claimFrame
	local cbCorner = Instance.new("UICorner")
	cbCorner.CornerRadius = UDim.new(0, 6)
	cbCorner.Parent = claimBtn

	-- Slide in from top
	claimFrame.Position = UDim2.new(0.5, -130, 0, -60)
	TweenService:Create(claimFrame, TweenInfo.new(0.5, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Position = UDim2.new(0.5, -130, 0, 50),
	}):Play()

	claimBtn.Activated:Connect(function()
		local claimRemote = ReplicatedStorage.Remotes:FindFirstChild("RequestDailyClaim")
		if claimRemote then
			claimRemote:FireServer()
		end
		-- Slide out
		TweenService:Create(claimFrame, TweenInfo.new(0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			Position = UDim2.new(0.5, -130, 0, -60),
		}):Play()
		task.delay(0.5, function()
			claimFrame:Destroy()
		end)
	end)

	-- Auto-dismiss after 15 seconds
	task.delay(15, function()
		if claimFrame.Parent then
			TweenService:Create(claimFrame, TweenInfo.new(0.4), {
				BackgroundTransparency = 1,
			}):Play()
			TweenService:Create(claimText, TweenInfo.new(0.4), {TextTransparency = 1}):Play()
			TweenService:Create(claimBtn, TweenInfo.new(0.4), {BackgroundTransparency = 1, TextTransparency = 1}):Play()
			TweenService:Create(cfStroke, TweenInfo.new(0.4), {Transparency = 1}):Play()
			task.delay(0.5, function()
				claimFrame:Destroy()
			end)
		end
	end)
end)

print("[MOLGANG] OTAP overlay active — branding + compass + daily claim")
