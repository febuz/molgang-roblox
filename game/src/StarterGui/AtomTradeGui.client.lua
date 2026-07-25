--[[
	AtomTradeGui.client.lua
	MOLGANG — Player-to-Player Atom Trading Interface (#71)

	Trade atoms with nearby players.
	Uses RequestAtomTransfer remote event.
	Key: / (slash) to toggle
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local ResponsiveGui = require(ReplicatedStorage.Modules.ResponsiveGui)

local C = {
	bg = Color3.fromRGB(10, 14, 20),
	panel = Color3.fromRGB(22, 28, 36),
	accent = Color3.fromRGB(0, 180, 220),
	green = Color3.fromRGB(0, 200, 100),
	red = Color3.fromRGB(220, 60, 60),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(230, 235, 245),
	textDim = Color3.fromRGB(140, 150, 170),
}

local function corner(obj, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = obj end

-- Screen GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "AtomTradeGui"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 18
screenGui.Enabled = false
screenGui.Parent = playerGui
ResponsiveGui.Attach(screenGui, 500, 400)

-- Main frame
local main = Instance.new("Frame")
main.Size = UDim2.new(0, 500, 0, 400)
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.05
main.Parent = screenGui
corner(main, 12)

-- Title
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 40)
title.BackgroundColor3 = Color3.fromRGB(8, 10, 18)
title.Text = "ATOM TRADING"
title.TextColor3 = C.accent
title.TextScaled = true
title.Font = Enum.Font.GothamBold
title.Parent = main
corner(title, 12)

-- Close button
local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 60, 0, 30)
closeBtn.Position = UDim2.new(1, -70, 0, 5)
closeBtn.BackgroundColor3 = C.red
closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = title
corner(closeBtn, 6)
closeBtn.Activated:Connect(function() screenGui.Enabled = false end)

-- Nearby players list
local playersLabel = Instance.new("TextLabel")
playersLabel.Size = UDim2.new(0.45, -10, 0, 24)
playersLabel.Position = UDim2.new(0, 10, 0, 48)
playersLabel.BackgroundTransparency = 1
playersLabel.Text = "Nearby Players:"
playersLabel.TextColor3 = C.accent
playersLabel.TextScaled = true
playersLabel.Font = Enum.Font.GothamBold
playersLabel.TextXAlignment = Enum.TextXAlignment.Left
playersLabel.Parent = main

local playerScroll = Instance.new("ScrollingFrame")
playerScroll.Size = UDim2.new(0.45, -10, 0, 140)
playerScroll.Position = UDim2.new(0, 10, 0, 75)
playerScroll.BackgroundColor3 = C.panel
playerScroll.ScrollBarThickness = 4
playerScroll.Parent = main
corner(playerScroll, 6)

local playerLayout = Instance.new("UIListLayout")
playerLayout.Padding = UDim.new(0, 4)
playerLayout.Parent = playerScroll

-- Atom selection
local atomLabel = Instance.new("TextLabel")
atomLabel.Size = UDim2.new(0.45, -10, 0, 24)
atomLabel.Position = UDim2.new(0.5, 5, 0, 48)
atomLabel.BackgroundTransparency = 1
atomLabel.Text = "Your Atoms:"
atomLabel.TextColor3 = C.gold
atomLabel.TextScaled = true
atomLabel.Font = Enum.Font.GothamBold
atomLabel.TextXAlignment = Enum.TextXAlignment.Left
atomLabel.Parent = main

local atomScroll = Instance.new("ScrollingFrame")
atomScroll.Size = UDim2.new(0.45, -10, 0, 140)
atomScroll.Position = UDim2.new(0.5, 5, 0, 75)
atomScroll.BackgroundColor3 = C.panel
atomScroll.ScrollBarThickness = 4
atomScroll.Parent = main
corner(atomScroll, 6)

local atomLayout = Instance.new("UIListLayout")
atomLayout.Padding = UDim.new(0, 4)
atomLayout.Parent = atomScroll

-- Status
local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, -20, 0, 20)
statusLabel.Position = UDim2.new(0, 10, 0, 225)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "Select a player and an atom to trade"
statusLabel.TextColor3 = C.textDim
statusLabel.TextScaled = true
statusLabel.Font = Enum.Font.Gotham
statusLabel.Parent = main

-- Trade button
local tradeBtn = Instance.new("TextButton")
tradeBtn.Size = UDim2.new(0.5, 0, 0, 40)
tradeBtn.Position = UDim2.new(0.25, 0, 0, 260)
tradeBtn.BackgroundColor3 = C.green
tradeBtn.Text = "SEND ATOM"
tradeBtn.TextColor3 = Color3.new(1,1,1)
tradeBtn.TextScaled = true
tradeBtn.Font = Enum.Font.GothamBold
tradeBtn.Parent = main
corner(tradeBtn, 8)

local selectedPlayer = nil
local selectedAtom = nil

-- Refresh nearby players
local function refreshPlayers()
	for _, child in playerScroll:GetChildren() do
		if child:IsA("TextButton") then child:Destroy() end
	end

	local character = player.Character
	if not character then return end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	for _, other in ipairs(Players:GetPlayers()) do
		if other ~= player and other.Character then
			local otherHrp = other.Character:FindFirstChild("HumanoidRootPart")
			if otherHrp and (hrp.Position - otherHrp.Position).Magnitude < 50 then
				local pb = Instance.new("TextButton")
				pb.Size = UDim2.new(1, -8, 0, 28)
				pb.BackgroundColor3 = C.panel
				pb.Text = "  " .. other.Name
				pb.TextColor3 = C.text
				pb.TextScaled = true
				pb.Font = Enum.Font.Gotham
				pb.TextXAlignment = Enum.TextXAlignment.Left
				pb.Parent = playerScroll
				corner(pb, 4)
				pb.Activated:Connect(function()
					selectedPlayer = other
					statusLabel.Text = "Trading with: " .. other.Name
					statusLabel.TextColor3 = C.accent
					-- Highlight
					for _, c in playerScroll:GetChildren() do
						if c:IsA("TextButton") then c.BackgroundColor3 = C.panel end
					end
					pb.BackgroundColor3 = C.accent
				end)
			end
		end
	end
	playerScroll.CanvasSize = UDim2.new(0, 0, 0, playerLayout.AbsoluteContentSize.Y)
end

-- Refresh atom inventory
local function refreshAtoms()
	for _, child in atomScroll:GetChildren() do
		if child:IsA("TextButton") then child:Destroy() end
	end

	local pData = nil
	local dataRemote = Remotes:FindFirstChild("GetPlayerData")
	if dataRemote then
		local ok, data = pcall(function() return dataRemote:InvokeServer() end)
		if ok and data then pData = data end
	end

	if pData and pData.atoms then
		for sym, count in pairs(pData.atoms) do
			if count > 0 then
				local ab = Instance.new("TextButton")
				ab.Size = UDim2.new(1, -8, 0, 28)
				ab.BackgroundColor3 = C.panel
				ab.Text = "  " .. sym .. " x" .. count
				ab.TextColor3 = C.gold
				ab.TextScaled = true
				ab.Font = Enum.Font.Gotham
				ab.TextXAlignment = Enum.TextXAlignment.Left
				ab.Parent = atomScroll
				corner(ab, 4)
				ab.Activated:Connect(function()
					selectedAtom = sym
					statusLabel.Text = "Selected: " .. sym .. " → " .. (selectedPlayer and selectedPlayer.Name or "???")
					for _, c in atomScroll:GetChildren() do
						if c:IsA("TextButton") then c.BackgroundColor3 = C.panel end
					end
					ab.BackgroundColor3 = C.gold
					ab.TextColor3 = Color3.new(0,0,0)
				end)
			end
		end
	end
	atomScroll.CanvasSize = UDim2.new(0, 0, 0, atomLayout.AbsoluteContentSize.Y)
end

local transferResult = Remotes:FindFirstChild("AtomTransferResult")
if transferResult then
	transferResult.OnClientEvent:Connect(function(data)
		if type(data) ~= "table" then return end
		statusLabel.Text = data.message or "Transfer finished"
		statusLabel.TextColor3 = data.success and C.green or C.red
		if data.success then refreshAtoms() end
	end)
end

-- Trade action
tradeBtn.Activated:Connect(function()
	if not selectedPlayer or not selectedAtom then
		statusLabel.Text = "Select a player AND an atom first!"
		statusLabel.TextColor3 = C.red
		return
	end

	local remote = Remotes:FindFirstChild("RequestAtomTransfer")
	if remote then
		remote:FireServer(selectedPlayer.UserId, selectedAtom)
		statusLabel.Text = "Transfer pending server confirmation..."
		statusLabel.TextColor3 = C.textDim
		-- Play sound
		local s = SoundService:FindFirstChild("purchase")
		if s then local c = s:Clone(); c.Parent = SoundService; c:Play(); c.Ended:Connect(function() c:Destroy() end) end
		task.delay(1, refreshAtoms)
	end
end)

-- Refresh on open
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		refreshPlayers()
		refreshAtoms()
	end
end)

print("[MOLGANG] AtomTradeGui loaded — press . to trade atoms with nearby players")
