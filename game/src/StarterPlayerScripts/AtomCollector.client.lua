-- StarterPlayerScripts/AtomCollector.client.lua
-- Client-side atoom collectie: proximity detect + UI feedback
-- Touch = collect, geen klik vereist — mobile friendly

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local hrp = character:WaitForChild("HumanoidRootPart")

-- Reconnect bij respawn
player.CharacterAdded:Connect(function(char)
	character = char
	hrp = char:WaitForChild("HumanoidRootPart")
end)

-- ══════════════════════════════════════════════
-- CONFIGURATIE
-- ══════════════════════════════════════════════

local COLLECT_RANGE = 12        -- studs proximity
local HIGHLIGHT_RANGE = 20      -- studs om highlight te tonen
local COOLDOWN = 0.5            -- seconden tussen collects
local lastCollectTime = 0

-- ══════════════════════════════════════════════
-- PROXIMITY COLLECT SYSTEEM
-- ══════════════════════════════════════════════

local atomsFolder = workspace:WaitForChild("Atoms", 30)
if not atomsFolder then
	warn("[AtomCollector] Atoms folder not found!")
	return
end

-- Highlight effect voor dichtbijzijnde atoom
local highlight = Instance.new("Highlight")
highlight.FillColor = Color3.fromRGB(100, 255, 150)
highlight.FillTransparency = 0.7
highlight.OutlineColor = Color3.fromRGB(200, 255, 200)
highlight.OutlineTransparency = 0.3
highlight.Enabled = false
highlight.Parent = player.PlayerGui

local currentHighlighted = nil

-- Collect animatie popup
local function showCollectPopup(elementData)
	local gui = player.PlayerGui
	local popup = Instance.new("ScreenGui")
	popup.Name = "CollectPopup"
	popup.Parent = gui

	local frame = Instance.new("Frame")
	frame.Size = UDim2.fromOffset(200, 60)
	frame.Position = UDim2.new(0.5, -100, 0.7, 0)
	frame.BackgroundColor3 = Color3.fromRGB(10, 20, 15)
	frame.BackgroundTransparency = 0.2
	frame.BorderSizePixel = 0
	frame.Parent = popup

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 8)
	corner.Parent = frame

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(100, 255, 150)
	stroke.Thickness = 2
	stroke.Parent = frame

	-- Element symbool
	local symLabel = Instance.new("TextLabel")
	symLabel.Size = UDim2.fromScale(0.3, 1)
	symLabel.BackgroundTransparency = 1
	symLabel.Text = elementData.symbol
	symLabel.TextColor3 = Color3.fromRGB(100, 255, 150)
	symLabel.TextScaled = true
	symLabel.Font = Enum.Font.GothamBold
	symLabel.Parent = frame

	-- Element naam
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.fromScale(0.45, 0.5)
	nameLabel.Position = UDim2.fromScale(0.3, 0)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = elementData.name
	nameLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
	nameLabel.TextScaled = true
	nameLabel.Font = Enum.Font.Gotham
	nameLabel.TextXAlignment = Enum.TextXAlignment.Left
	nameLabel.Parent = frame

	-- Coins
	local coinLabel = Instance.new("TextLabel")
	coinLabel.Size = UDim2.fromScale(0.45, 0.5)
	coinLabel.Position = UDim2.fromScale(0.3, 0.5)
	coinLabel.BackgroundTransparency = 1
	coinLabel.Text = "+" .. tostring(elementData.coinReward) .. " MolCoins"
	coinLabel.TextColor3 = Color3.fromRGB(255, 215, 0)
	coinLabel.TextScaled = true
	coinLabel.Font = Enum.Font.GothamBold
	coinLabel.TextXAlignment = Enum.TextXAlignment.Left
	coinLabel.Parent = frame

	-- Rarity badge
	local rarityColors = {
		common = Color3.fromRGB(150, 150, 150),
		uncommon = Color3.fromRGB(100, 200, 100),
		rare = Color3.fromRGB(68, 136, 255),
		epic = Color3.fromRGB(180, 68, 255),
		legendary = Color3.fromRGB(255, 215, 0),
	}

	local badge = Instance.new("TextLabel")
	badge.Size = UDim2.fromScale(0.25, 0.4)
	badge.Position = UDim2.fromScale(0.73, 0.3)
	badge.BackgroundColor3 = rarityColors[elementData.rarity] or Color3.fromRGB(150, 150, 150)
	badge.BackgroundTransparency = 0.3
	badge.Text = string.upper(elementData.rarity or "common")
	badge.TextColor3 = Color3.fromRGB(255, 255, 255)
	badge.TextScaled = true
	badge.Font = Enum.Font.GothamBold
	badge.Parent = frame
	local badgeCorner = Instance.new("UICorner")
	badgeCorner.CornerRadius = UDim.new(0, 4)
	badgeCorner.Parent = badge

	-- Animate in
	frame.Position = UDim2.new(0.5, -100, 0.75, 0)
	frame.BackgroundTransparency = 1
	symLabel.TextTransparency = 1
	nameLabel.TextTransparency = 1
	coinLabel.TextTransparency = 1

	local tweenIn = TweenService:Create(frame, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Position = UDim2.new(0.5, -100, 0.7, 0),
		BackgroundTransparency = 0.2,
	})
	tweenIn:Play()

	TweenService:Create(symLabel, TweenInfo.new(0.3), {TextTransparency = 0}):Play()
	TweenService:Create(nameLabel, TweenInfo.new(0.3), {TextTransparency = 0}):Play()
	TweenService:Create(coinLabel, TweenInfo.new(0.3), {TextTransparency = 0}):Play()

	-- Animate out na 2 sec
	task.delay(2, function()
		local tweenOut = TweenService:Create(frame, TweenInfo.new(0.5, Enum.EasingStyle.Quad), {
			Position = UDim2.new(0.5, -100, 0.6, 0),
			BackgroundTransparency = 1,
		})
		tweenOut:Play()
		TweenService:Create(symLabel, TweenInfo.new(0.5), {TextTransparency = 1}):Play()
		TweenService:Create(nameLabel, TweenInfo.new(0.5), {TextTransparency = 1}):Play()
		TweenService:Create(coinLabel, TweenInfo.new(0.5), {TextTransparency = 1}):Play()
		task.delay(0.6, function()
			popup:Destroy()
		end)
	end)
end

-- ══════════════════════════════════════════════
-- PROXIMITY DETECTION LOOP
-- ══════════════════════════════════════════════

RunService.Heartbeat:Connect(function()
	if not hrp or not hrp.Parent then return end

	local playerPos = hrp.Position
	local closestAtom = nil
	local closestDist = HIGHLIGHT_RANGE

	-- Zoek dichtsbijzijnde atoom
	for _, atom in ipairs(atomsFolder:GetChildren()) do
		if atom:IsA("BasePart") then
			local dist = (playerPos - atom.Position).Magnitude
			if dist < closestDist then
				closestDist = dist
				closestAtom = atom
			end
		end
	end

	-- Update highlight
	if closestAtom ~= currentHighlighted then
		if currentHighlighted then
			highlight.Adornee = nil
			highlight.Enabled = false
		end
		currentHighlighted = closestAtom
		if closestAtom then
			highlight.Adornee = closestAtom
			highlight.FillColor = closestAtom.Color
			highlight.OutlineColor = closestAtom.Color
			highlight.Enabled = true
		end
	end

	-- Auto-collect bij proximity (touch = collect)
	if closestAtom and closestDist <= COLLECT_RANGE then
		local now = tick()
		if now - lastCollectTime >= COOLDOWN then
			lastCollectTime = now
			-- Stuur collect request naar server
			Remotes.FireServer("RequestAtomCollect", closestAtom.Name)
		end
	end
end)

-- ══════════════════════════════════════════════
-- LISTEN VOOR SERVER BEVESTIGING
-- ══════════════════════════════════════════════

Remotes.AtomCollected.OnClientEvent:Connect(function(data)
	showCollectPopup(data)
end)

-- Eerste element popup (grotere versie)
local elementsFound = {}
Remotes.AtomCollected.OnClientEvent:Connect(function(data)
	if not elementsFound[data.elementZ] then
		elementsFound[data.elementZ] = true

		-- "NIEUW ELEMENT!" popup
		local gui = player.PlayerGui
		local popup = Instance.new("ScreenGui")
		popup.Name = "NewElementPopup"
		popup.Parent = gui

		local frame = Instance.new("Frame")
		frame.Size = UDim2.fromOffset(300, 120)
		frame.Position = UDim2.new(0.5, -150, 0.35, 0)
		frame.BackgroundColor3 = Color3.fromRGB(5, 15, 10)
		frame.BackgroundTransparency = 0.1
		frame.BorderSizePixel = 0
		frame.Parent = popup

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 12)
		corner.Parent = frame

		local stroke = Instance.new("UIStroke")
		stroke.Color = Color3.fromRGB(34, 197, 94)
		stroke.Thickness = 3
		stroke.Parent = frame

		local title = Instance.new("TextLabel")
		title.Size = UDim2.fromScale(1, 0.35)
		title.BackgroundTransparency = 1
		title.Text = "NEW ELEMENT!"
		title.TextColor3 = Color3.fromRGB(34, 197, 94)
		title.TextScaled = true
		title.Font = Enum.Font.GothamBold
		title.Parent = frame

		local sym = Instance.new("TextLabel")
		sym.Size = UDim2.fromScale(0.3, 0.65)
		sym.Position = UDim2.fromScale(0.05, 0.35)
		sym.BackgroundTransparency = 1
		sym.Text = data.symbol
		sym.TextColor3 = Color3.fromRGB(255, 255, 255)
		sym.TextScaled = true
		sym.Font = Enum.Font.GothamBold
		sym.Parent = frame

		local name = Instance.new("TextLabel")
		name.Size = UDim2.fromScale(0.6, 0.3)
		name.Position = UDim2.fromScale(0.35, 0.35)
		name.BackgroundTransparency = 1
		name.Text = data.name
		name.TextColor3 = Color3.fromRGB(200, 230, 210)
		name.TextScaled = true
		name.Font = Enum.Font.Gotham
		name.TextXAlignment = Enum.TextXAlignment.Left
		name.Parent = frame

		local count = Instance.new("TextLabel")
		count.Size = UDim2.fromScale(0.6, 0.25)
		count.Position = UDim2.fromScale(0.35, 0.65)
		count.BackgroundTransparency = 1
		local totalFound = 0
		for _ in pairs(elementsFound) do totalFound = totalFound + 1 end
		count.Text = totalFound .. "/118 elements discovered"
		count.TextColor3 = Color3.fromRGB(150, 180, 160)
		count.TextScaled = true
		count.Font = Enum.Font.Gotham
		count.TextXAlignment = Enum.TextXAlignment.Left
		count.Parent = frame

		-- Animate
		frame.Size = UDim2.fromOffset(0, 0)
		frame.Position = UDim2.new(0.5, 0, 0.4, 0)
		TweenService:Create(frame, TweenInfo.new(0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
			Size = UDim2.fromOffset(300, 120),
			Position = UDim2.new(0.5, -150, 0.35, 0),
		}):Play()

		task.delay(3, function()
			TweenService:Create(frame, TweenInfo.new(0.5), {
				BackgroundTransparency = 1,
			}):Play()
			task.delay(0.6, function() popup:Destroy() end)
		end)
	end
end)

print("[MOLGANG] AtomCollector client initialized")
