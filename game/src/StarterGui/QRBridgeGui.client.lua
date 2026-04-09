-- StarterGui/QRBridgeGui.client.lua
-- MOLGANG QR Bridge GUI
-- Shows the QR code panel when player scans to link Roblox → Web Game.
-- Receives ShowQR event from QRBridge.server.lua with qr_url + session token.

local Players        = game:GetService("Players")
local TweenService   = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes    = require(ReplicatedStorage.Remotes.RemoteSetup)
local player     = Players.LocalPlayer
local playerGui  = player:WaitForChild("PlayerGui")

-- ══════════════════════════════════════════════
-- MAIN GUI
-- ══════════════════════════════════════════════

local qrGui = Instance.new("ScreenGui")
qrGui.Name          = "QRBridgeGui"
qrGui.ResetOnSpawn  = false
qrGui.Parent        = playerGui

-- Backdrop blur
local backdrop = Instance.new("Frame")
backdrop.Size                  = UDim2.new(1, 0, 1, 0)
backdrop.BackgroundColor3      = Color3.fromRGB(0, 0, 0)
backdrop.BackgroundTransparency = 0.5
backdrop.BorderSizePixel       = 0
backdrop.Visible               = false
backdrop.Parent                = qrGui

-- Main card
local card = Instance.new("Frame")
card.Size                  = UDim2.new(0, 340, 0, 420)
card.AnchorPoint           = Vector2.new(0.5, 0.5)
card.Position              = UDim2.new(0.5, 0, 0.5, 0)
card.BackgroundColor3      = Color3.fromRGB(8, 15, 12)
card.BackgroundTransparency = 0.0
card.BorderSizePixel       = 0
card.Parent                = backdrop

local cardCorner = Instance.new("UICorner")
cardCorner.CornerRadius = UDim.new(0, 12)
cardCorner.Parent       = card

local cardStroke = Instance.new("UIStroke")
cardStroke.Color     = Color3.fromRGB(34, 197, 94)
cardStroke.Thickness = 2
cardStroke.Parent    = card

-- Header
local header = Instance.new("Frame")
header.Size             = UDim2.new(1, 0, 0, 48)
header.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
header.BackgroundTransparency = 0.85
header.BorderSizePixel  = 0
header.Parent           = card

local headerCorner = Instance.new("UICorner")
headerCorner.CornerRadius = UDim.new(0, 12)
headerCorner.Parent       = header

local headerTitle = Instance.new("TextLabel")
headerTitle.Size                 = UDim2.new(1, -50, 1, 0)
headerTitle.Position             = UDim2.fromOffset(16, 0)
headerTitle.BackgroundTransparency = 1
headerTitle.Text                 = "MOLGANG Web Bridge"
headerTitle.TextColor3           = Color3.fromRGB(34, 197, 94)
headerTitle.TextScaled           = true
headerTitle.Font                 = Enum.Font.GothamBold
headerTitle.TextXAlignment       = Enum.TextXAlignment.Left
headerTitle.Parent               = header

local closeBtn = Instance.new("TextButton")
closeBtn.Size                 = UDim2.new(0, 32, 0, 32)
closeBtn.Position             = UDim2.new(1, -40, 0.5, -16)
closeBtn.BackgroundColor3     = Color3.fromRGB(239, 68, 68)
closeBtn.BackgroundTransparency = 0.4
closeBtn.Text                 = "×"
closeBtn.TextColor3           = Color3.fromRGB(255, 255, 255)
closeBtn.TextScaled           = true
closeBtn.Font                 = Enum.Font.GothamBold
closeBtn.BorderSizePixel      = 0
closeBtn.Parent               = header

local closeBtnCorner = Instance.new("UICorner")
closeBtnCorner.CornerRadius = UDim.new(0, 6)
closeBtnCorner.Parent       = closeBtn

-- QR image container
local qrContainer = Instance.new("Frame")
qrContainer.Size                  = UDim2.new(0, 220, 0, 220)
qrContainer.AnchorPoint           = Vector2.new(0.5, 0)
qrContainer.Position              = UDim2.new(0.5, 0, 0, 60)
qrContainer.BackgroundColor3      = Color3.fromRGB(255, 255, 255)
qrContainer.BorderSizePixel       = 0
qrContainer.Parent                = card

local qrCorner = Instance.new("UICorner")
qrCorner.CornerRadius = UDim.new(0, 8)
qrCorner.Parent       = qrContainer

local qrImage = Instance.new("ImageLabel")
qrImage.Size                  = UDim2.new(1, -12, 1, -12)
qrImage.AnchorPoint           = Vector2.new(0.5, 0.5)
qrImage.Position              = UDim2.new(0.5, 0, 0.5, 0)
qrImage.BackgroundTransparency = 1
qrImage.Image                 = ""  -- set at runtime
qrImage.ScaleType             = Enum.ScaleType.Fit
qrImage.Parent                = qrContainer

-- Placeholder while loading
local qrPlaceholder = Instance.new("TextLabel")
qrPlaceholder.Size                  = UDim2.new(1, 0, 1, 0)
qrPlaceholder.BackgroundTransparency = 1
qrPlaceholder.Text                  = "Loading QR..."
qrPlaceholder.TextColor3            = Color3.fromRGB(120, 130, 120)
qrPlaceholder.TextScaled            = true
qrPlaceholder.Font                  = Enum.Font.Gotham
qrPlaceholder.Parent                = qrContainer

-- Instruction text
local instructionLabel = Instance.new("TextLabel")
instructionLabel.Size                  = UDim2.new(1, -24, 0, 36)
instructionLabel.Position             = UDim2.new(0, 12, 0, 292)
instructionLabel.BackgroundTransparency = 1
instructionLabel.Text                  = "Scan with your phone to open\nthe MOLGANG Web Game"
instructionLabel.TextColor3            = Color3.fromRGB(160, 200, 180)
instructionLabel.TextScaled            = true
instructionLabel.Font                  = Enum.Font.Gotham
instructionLabel.TextWrapped           = true
instructionLabel.Parent                = card

-- Token display (shortened)
local tokenLabel = Instance.new("TextLabel")
tokenLabel.Size                  = UDim2.new(1, -24, 0, 20)
tokenLabel.Position              = UDim2.new(0, 12, 0, 336)
tokenLabel.BackgroundTransparency = 1
tokenLabel.Text                  = ""
tokenLabel.TextColor3            = Color3.fromRGB(80, 110, 90)
tokenLabel.TextScaled            = true
tokenLabel.Font                  = Enum.Font.Code
tokenLabel.TextXAlignment        = Enum.TextXAlignment.Center
tokenLabel.Parent                = card

-- Countdown timer
local timerLabel = Instance.new("TextLabel")
timerLabel.Size                  = UDim2.new(1, -24, 0, 22)
timerLabel.Position              = UDim2.new(0, 12, 0, 360)
timerLabel.BackgroundTransparency = 1
timerLabel.Text                  = ""
timerLabel.TextColor3            = Color3.fromRGB(34, 197, 94)
timerLabel.TextScaled            = true
timerLabel.Font                  = Enum.Font.GothamBold
timerLabel.TextXAlignment        = Enum.TextXAlignment.Center
timerLabel.Parent                = card

-- Error label
local errorLabel = Instance.new("TextLabel")
errorLabel.Size                  = UDim2.new(1, -24, 0, 60)
errorLabel.Position              = UDim2.new(0, 12, 0, 60)
errorLabel.BackgroundTransparency = 1
errorLabel.Text                  = ""
errorLabel.TextColor3            = Color3.fromRGB(239, 68, 68)
errorLabel.TextScaled            = true
errorLabel.Font                  = Enum.Font.Gotham
errorLabel.TextWrapped           = true
errorLabel.Visible               = false
errorLabel.Parent                = card

-- ══════════════════════════════════════════════
-- SHOW / HIDE
-- ══════════════════════════════════════════════

local timerTask = nil

local function hideQR()
	if timerTask then
		task.cancel(timerTask)
		timerTask = nil
	end
	TweenService:Create(backdrop, TweenInfo.new(0.2), {
		BackgroundTransparency = 1,
	}):Play()
	TweenService:Create(card, TweenInfo.new(0.2, Enum.EasingStyle.Back, Enum.EasingDirection.In), {
		Size = UDim2.new(0, 0, 0, 0),
	}):Play()
	task.delay(0.25, function()
		backdrop.Visible = false
		card.Size = UDim2.new(0, 340, 0, 420)
	end)
end

local function showQR(data: { [string]: any })
	if data.error then
		-- Show error state
		qrImage.Image           = ""
		qrContainer.Visible     = false
		errorLabel.Text         = data.error
		errorLabel.Visible      = true
		instructionLabel.Visible = false
		tokenLabel.Text         = ""
		timerLabel.Text         = ""
	else
		qrContainer.Visible      = true
		errorLabel.Visible       = false
		instructionLabel.Visible = true

		-- Set QR image (Roblox loads it via Image URL → must be rbxasset or proxy)
		-- In production, bridge returns a Roblox-proxied URL or decal ID
		if data.qrUrl and data.qrUrl ~= "" then
			qrImage.Image      = data.qrUrl
			qrPlaceholder.Visible = false
		else
			qrPlaceholder.Visible = true
			qrPlaceholder.Text    = "QR unavailable"
		end

		-- Token display (first 16 chars)
		if data.sessionToken then
			tokenLabel.Text = "Token: " .. data.sessionToken:sub(1, 16) .. "..."
		end

		-- Countdown timer
		if data.expiresAt then
			if timerTask then task.cancel(timerTask) end
			timerTask = task.spawn(function()
				while true do
					local remaining = data.expiresAt - os.time()
					if remaining <= 0 then
						timerLabel.Text = "Expired — click close to dismiss"
						timerLabel.TextColor3 = Color3.fromRGB(239, 68, 68)
						break
					end
					timerLabel.Text = string.format("Valid for %d:%02d", remaining // 60, remaining % 60)
					timerLabel.TextColor3 = remaining < 60
						and Color3.fromRGB(239, 120, 68)
						or Color3.fromRGB(34, 197, 94)
					task.wait(1)
				end
			end)
		end
	end

	-- Animate in
	backdrop.BackgroundTransparency = 1
	backdrop.Visible = true
	card.Size = UDim2.new(0, 0, 0, 0)

	TweenService:Create(backdrop, TweenInfo.new(0.2), {
		BackgroundTransparency = 0.5,
	}):Play()
	TweenService:Create(card, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Size = UDim2.new(0, 340, 0, 420),
	}):Play()
end

-- ══════════════════════════════════════════════
-- EVENTS
-- ══════════════════════════════════════════════

Remotes.ShowQR.OnClientEvent:Connect(function(data)
	if data then
		showQR(data)
	end
end)

closeBtn.MouseButton1Click:Connect(hideQR)
backdrop.InputBegan:Connect(function(input)
	-- Close on backdrop click (if clicking outside card)
	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		hideQR()
	end
end)

-- ══════════════════════════════════════════════
-- QR REQUEST BUTTON (in Nexus Hub HUD)
-- HUDController fires "RequestQR" when player clicks the Web Bridge button.
-- We just listen here for the server response.
-- ══════════════════════════════════════════════

print("[MOLGANG] QRBridgeGui initialized")
