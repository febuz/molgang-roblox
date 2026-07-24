--[[
	SlagProcessingGui.client.lua
	MOLGANG — Steel Slag Processing Interface

	Full workflow UI for the Slakkenspoor factory:
	1. Buy raw slag (5cm+ chunks)
	2. Crush by hand (hammer animation) or machine grind
	3. Select reagent (acid/base) with chemistry info
	4. Monitor leaching progress (real-time bars)
	5. Extract products when done

	Opens near the Slakkenspoor factory buildings or via keybind.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local SteelSlag = require(ReplicatedStorage.Modules.SteelSlag)
local ProcessEngineering = require(ReplicatedStorage.Modules.ProcessEngineering)

-- UI click sound helper (#55)
local function playUIClick()
	local s = SoundService:FindFirstChild("ui_click")
	if s then
		local c = s:Clone(); c.Parent = SoundService; c:Play()
		c.Ended:Connect(function() c:Destroy() end)
	end
end

-- ═══════════════════════════════════════════════
-- COLORS
-- ═══════════════════════════════════════════════

local C = {
	bg          = Color3.fromRGB(14, 16, 26),
	panel       = Color3.fromRGB(22, 26, 40),
	panelLight  = Color3.fromRGB(32, 38, 55),
	accent      = Color3.fromRGB(220, 140, 40),
	accentDim   = Color3.fromRGB(140, 90, 25),
	green       = Color3.fromRGB(0, 200, 120),
	red         = Color3.fromRGB(220, 60, 60),
	gold        = Color3.fromRGB(255, 215, 0),
	text        = Color3.fromRGB(230, 235, 245),
	textDim     = Color3.fromRGB(130, 140, 160),
	progressBg  = Color3.fromRGB(35, 40, 55),
	tabActive   = Color3.fromRGB(220, 140, 40),
	tabInactive = Color3.fromRGB(60, 65, 80),
}

-- ═══════════════════════════════════════════════
-- HELPERS
-- ═══════════════════════════════════════════════

local function corner(parent, r)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, r or 8)
	c.Parent = parent
end

local function stroke(parent, color, thick)
	local s = Instance.new("UIStroke")
	s.Color = color or C.accentDim
	s.Thickness = thick or 1
	s.Parent = parent
end

local function label(parent, props)
	local l = Instance.new("TextLabel")
	l.Name = props.Name or "Label"
	l.Size = props.Size or UDim2.new(1, 0, 0, 20)
	l.Position = props.Position or UDim2.new(0, 0, 0, 0)
	l.BackgroundTransparency = 1
	l.Text = props.Text or ""
	l.TextColor3 = props.Color or C.text
	l.TextScaled = true
	l.Font = props.Font or Enum.Font.Gotham
	l.TextXAlignment = props.Align or Enum.TextXAlignment.Left
	l.TextWrapped = true
	l.Parent = parent
	return l
end

local function btn(parent, props)
	local b = Instance.new("TextButton")
	b.Name = props.Name or "Btn"
	b.Size = props.Size or UDim2.new(0, 120, 0, 32)
	b.Position = props.Position or UDim2.new(0, 0, 0, 0)
	b.BackgroundColor3 = props.BgColor or C.accent
	b.TextColor3 = props.TextColor or Color3.fromRGB(0, 0, 0)
	b.Text = props.Text or "Button"
	b.Font = Enum.Font.GothamBold
	b.TextScaled = true
	b.Active = true
	b.Selectable = true
	b.ZIndex = 30
	b.Parent = parent
	corner(b, 6)
	return b
end

-- ═══════════════════════════════════════════════
-- MAIN GUI
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "SlagProcessingGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 15
screenGui.Enabled = false
screenGui.Parent = playerGui

-- Main panel
local main = Instance.new("Frame")
main.Name = "MainPanel"
main.Size = UDim2.new(0, 820, 0, 560)
main.Position = UDim2.new(0.5, -410, 0.5, -280)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.05
main.Parent = screenGui
corner(main, 12)
stroke(main, C.accent, 2)

-- Title bar
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 44)
titleBar.BackgroundColor3 = C.panel
titleBar.Parent = main
corner(titleBar, 12)

label(titleBar, {Name="Title", Size=UDim2.new(0.7,0,1,0), Position=UDim2.new(0,14,0,0),
	Text="SLAKKENSPOOR — Steel Slag Processing", Color=C.accent, Font=Enum.Font.GothamBold})

-- Close button
local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(30, 30)
closeBtn.Position = UDim2.new(1, -38, 0, 7)
closeBtn.BackgroundColor3 = C.red
closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Text = "X"
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = titleBar
corner(closeBtn, 6)
closeBtn.Activated:Connect(function() playUIClick(); screenGui.Enabled = false end)

-- ═══════════════════════════════════════════════
-- TAB SYSTEM (3 tabs)
-- ═══════════════════════════════════════════════

local tabFrame = Instance.new("Frame")
tabFrame.Size = UDim2.new(1, 0, 0, 36)
tabFrame.Position = UDim2.new(0, 0, 0, 44)
tabFrame.BackgroundColor3 = C.panel
tabFrame.BackgroundTransparency = 0.3
tabFrame.Parent = main

local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.Padding = UDim.new(0, 4)
tabLayout.Parent = tabFrame
local tabPad = Instance.new("UIPadding")
tabPad.PaddingLeft = UDim.new(0, 8)
tabPad.PaddingTop = UDim.new(0, 4)
tabPad.Parent = tabFrame

local contentFrame = Instance.new("Frame")
contentFrame.Size = UDim2.new(1, 0, 1, -80)
contentFrame.Position = UDim2.new(0, 0, 0, 80)
contentFrame.BackgroundTransparency = 1
contentFrame.Parent = main

local tabs = {
	{key = "slag",    name = "Slag & Crushing"},
	{key = "leach",   name = "Leaching"},
	{key = "monitor", name = "Active Processes"},
}

local tabButtons = {}
local tabPanels = {}
local currentTab = "slag"

for _, tab in ipairs(tabs) do
	local tbtn = Instance.new("TextButton")
	tbtn.Name = tab.key
	tbtn.Size = UDim2.new(0, 180, 0, 28)
	tbtn.BackgroundColor3 = C.tabInactive
	tbtn.TextColor3 = C.textDim
	tbtn.Text = tab.name
	tbtn.Font = Enum.Font.GothamBold
	tbtn.TextScaled = true
	tbtn.Parent = tabFrame
	corner(tbtn, 6)
	tabButtons[tab.key] = tbtn

	local tpanel = Instance.new("Frame")
	tpanel.Name = tab.key .. "Panel"
	tpanel.Size = UDim2.new(1, 0, 1, 0)
	tpanel.BackgroundTransparency = 1
	tpanel.Visible = (tab.key == "slag")
	tpanel.Parent = contentFrame
	tabPanels[tab.key] = tpanel

	tbtn.Activated:Connect(function()
		playUIClick()
		for k, p in pairs(tabPanels) do p.Visible = false end
		for k, b in pairs(tabButtons) do
			b.BackgroundColor3 = C.tabInactive; b.TextColor3 = C.textDim
		end
		tpanel.Visible = true
		tbtn.BackgroundColor3 = C.tabActive; tbtn.TextColor3 = C.text
		currentTab = tab.key
		if tab.key == "monitor" then refreshMonitor() end
	end)
end
tabButtons["slag"].BackgroundColor3 = C.tabActive
tabButtons["slag"].TextColor3 = C.text

-- ═══════════════════════════════════════════════
-- TAB 1: SLAG INVENTORY & CRUSHING
-- ═══════════════════════════════════════════════

local slagPanel = tabPanels["slag"]

-- Slag inventory display
-- Info: What is slag?
label(slagPanel, {Name="WhatIsSlag", Size=UDim2.new(1,-20,0,28), Position=UDim2.new(0,10,0,4),
	Text="Steel slag = byproduct of steelmaking (BOF). Contains V, Fe, Ti, Cr, Mn. Buy chunks → crush → leach with acids → extract valuable metals!",
	Color=C.textDim})

label(slagPanel, {Name="InvTitle", Size=UDim2.new(1,-20,0,24), Position=UDim2.new(0,10,0,34),
	Text="Slag Inventory", Color=C.accent, Font=Enum.Font.GothamBold})

local slagCards = {}
local slagAmounts = {}

for i, sizeKey in ipairs(SteelSlag.SizeOrder) do
	local data = SteelSlag.ParticleSizes[sizeKey]
	local yPos = 40 + (i-1) * 70

	local card = Instance.new("Frame")
	card.Name = sizeKey
	card.Size = UDim2.new(0.48, -10, 0, 60)
	card.Position = UDim2.new((i-1) % 2 * 0.5, 10, 0, yPos + math.floor((i-1)/2) * 10)
	card.BackgroundColor3 = C.panelLight
	card.Parent = slagPanel
	corner(card, 8)

	-- Color indicator
	local colorDot = Instance.new("Frame")
	colorDot.Size = UDim2.fromOffset(8, 40)
	colorDot.Position = UDim2.new(0, 4, 0.5, -20)
	colorDot.BackgroundColor3 = data.color
	colorDot.Parent = card
	corner(colorDot, 4)

	label(card, {Name="Name", Size=UDim2.new(0.6,0,0,18), Position=UDim2.new(0,18,0,4),
		Text=data.name, Color=C.text, Font=Enum.Font.GothamBold})
	label(card, {Name="Size", Size=UDim2.new(0.5,0,0,14), Position=UDim2.new(0,18,0,22),
		Text=data.sizeLabel .. " particles", Color=C.textDim})
	label(card, {Name="Leach", Size=UDim2.new(0.5,0,0,14), Position=UDim2.new(0,18,0,38),
		Text="Leach speed: " .. data.leachMultiplier .. "x", Color=C.textDim})

	local amtLabel = label(card, {Name="Amount", Size=UDim2.new(0.3,0,0,24), Position=UDim2.new(0.65,0,0,4),
		Text="0 kg", Color=C.gold, Font=Enum.Font.GothamBold, Align=Enum.TextXAlignment.Center})
	slagAmounts[sizeKey] = amtLabel

	slagCards[sizeKey] = card
end

-- Reposition cards in 2-column grid
local cardIdx = 0
for _, sizeKey in ipairs(SteelSlag.SizeOrder) do
	local col = cardIdx % 2
	local row = math.floor(cardIdx / 2)
	slagCards[sizeKey].Position = UDim2.new(col * 0.5, 10, 0, 40 + row * 72)
	cardIdx = cardIdx + 1
end

-- Action buttons
local actionY = 200
local crushLabel

-- Buy Raw Slag button
local buyBtn = btn(slagPanel, {Name="BuyBtn", Size=UDim2.new(0.45,-10,0,36),
	Position=UDim2.new(0,10,0,actionY), Text="Buy Raw Slag (50 MC)", BgColor=C.green})

buyBtn.Activated:Connect(function()
	playUIClick()
	local remote = Remotes:FindFirstChild("RequestBuySlag")
	if remote then
		crushLabel.Text = "Buying 1 kg raw BOF slag..."
		remote:FireServer()
	else
		crushLabel.Text = "Slag service is still loading; try again."
	end
end)

-- Crush section
label(slagPanel, {Name="CrushTitle", Size=UDim2.new(1,-20,0,22), Position=UDim2.new(0,10,0,actionY+46),
	Text="Crushing Station", Color=C.accent, Font=Enum.Font.GothamBold})

label(slagPanel, {Name="CrushDesc", Size=UDim2.new(1,-20,0,16), Position=UDim2.new(0,10,0,actionY+68),
	Text="Hammer raw chunks by hand, or use machines for finer grinding.", Color=C.textDim})

-- Crush progress bar
local crushBarBg = Instance.new("Frame")
crushBarBg.Name = "CrushBarBg"
crushBarBg.Size = UDim2.new(0.9, 0, 0, 14)
crushBarBg.Position = UDim2.new(0.05, 0, 0, actionY + 88)
crushBarBg.BackgroundColor3 = C.progressBg
crushBarBg.Parent = slagPanel
corner(crushBarBg, 7)

local crushBarFill = Instance.new("Frame")
crushBarFill.Size = UDim2.new(0, 0, 1, 0)
crushBarFill.BackgroundColor3 = C.accent
crushBarFill.Parent = crushBarBg
corner(crushBarFill, 7)

crushLabel = label(slagPanel, {Name="CrushLabel", Size=UDim2.new(0.9,0,0,16),
	Position=UDim2.new(0.05,0,0,actionY+104), Text="Click HAMMER to crush chunks", Color=C.textDim,
	Align=Enum.TextXAlignment.Center})

-- Crush buttons row
local crushBtnY = actionY + 126

local hammerBtn = btn(slagPanel, {Name="HammerBtn", Size=UDim2.new(0.28,-4,0,40),
	Position=UDim2.new(0.02,0,0,crushBtnY), Text="HAMMER\n(Free)", BgColor=C.accent})

local grindBtn = btn(slagPanel, {Name="GrindBtn", Size=UDim2.new(0.28,-4,0,40),
	Position=UDim2.new(0.35,0,0,crushBtnY), Text="GRIND\n(200 MC)", BgColor=Color3.fromRGB(80,150,255)})
grindBtn.TextColor3 = Color3.new(1,1,1)

local millBtn = btn(slagPanel, {Name="MillBtn", Size=UDim2.new(0.28,-4,0,40),
	Position=UDim2.new(0.68,0,0,crushBtnY), Text="BALL MILL\n(500 MC)", BgColor=Color3.fromRGB(160,100,255)})
millBtn.TextColor3 = Color3.new(1,1,1)

hammerBtn.Activated:Connect(function()
	playUIClick()
	local remote = Remotes:FindFirstChild("RequestCrushSlag")
	if remote then
		crushLabel.Text = "Hammer hit sent — raw chunks are required."
		remote:FireServer("crushed")
	else
		crushLabel.Text = "Slag service is still loading; try again."
	end
	-- Hammer sound (#51)
	local SoundService = game:GetService("SoundService")
	local hammerSound = SoundService:FindFirstChild("crusher_impact")
	if hammerSound then
		local clone = hammerSound:Clone()
		clone.Volume = 0.5
		clone.Parent = SoundService
		clone:Play()
		clone.Ended:Connect(function() clone:Destroy() end)
	end
	-- Visual hammer effect
	TweenService:Create(hammerBtn, TweenInfo.new(0.05), {Size=UDim2.new(0.26,-4,0,36)}):Play()
	task.delay(0.05, function()
		TweenService:Create(hammerBtn, TweenInfo.new(0.1, Enum.EasingStyle.Back), {Size=UDim2.new(0.28,-4,0,40)}):Play()
	end)
end)

grindBtn.Activated:Connect(function()
	playUIClick()
	local remote = Remotes:FindFirstChild("RequestCrushSlag")
	if remote then
		crushLabel.Text = "Grinding request sent — first hammer raw chunks."
		remote:FireServer("ground")
	else
		crushLabel.Text = "Slag service is still loading; try again."
	end
end)

millBtn.Activated:Connect(function()
	playUIClick()
	local remote = Remotes:FindFirstChild("RequestCrushSlag")
	if remote then
		crushLabel.Text = "Ball mill request sent — ground slag is required."
		remote:FireServer("powder")
	else
		crushLabel.Text = "Slag service is still loading; try again."
	end
end)

-- ═══════════════════════════════════════════════
-- TAB 2: LEACHING (reagent selection)
-- ═══════════════════════════════════════════════

local leachPanel = tabPanels["leach"]

label(leachPanel, {Name="LeachTitle", Size=UDim2.new(1,-20,0,24), Position=UDim2.new(0,10,0,8),
	Text="Select Reagent for Leaching", Color=C.accent, Font=Enum.Font.GothamBold})

label(leachPanel, {Name="LeachDesc", Size=UDim2.new(1,-20,0,16), Position=UDim2.new(0,10,0,32),
	Text="Each acid/base extracts different metals. Choose wisely!", Color=C.textDim})

-- Reagent cards (scrollable)
local reagentScroll = Instance.new("ScrollingFrame")
reagentScroll.Size = UDim2.new(1, -20, 0, 260)
reagentScroll.Position = UDim2.new(0, 10, 0, 54)
reagentScroll.BackgroundTransparency = 1
reagentScroll.ScrollBarThickness = 6
reagentScroll.CanvasSize = UDim2.new(0, 0, 0, 0) -- auto
reagentScroll.Parent = leachPanel

local reagentLayout = Instance.new("UIListLayout")
reagentLayout.Padding = UDim.new(0, 6)
reagentLayout.Parent = reagentScroll

local selectedReagent = nil
local selectedSize = nil
local selectedReagentLabel
local leachTimeLabel
local yieldLabel
local processTemperature = tonumber(player:GetAttribute("ProcessTemp")) or 25
local processPressure = 101.325
local processFlowRate = 10
local processReactorVolume = 50

local function getLeachEstimate(particleSize, reagentId)
	local baseMinutes = SteelSlag.CalculateLeachTime(particleSize, reagentId)
	local duration, rate = ProcessEngineering.CalculateEffectiveLeachDuration(baseMinutes, reagentId, {
		temperature = processTemperature,
		pressure = processPressure,
		flowRate = processFlowRate,
		reactorVolume = processReactorVolume,
	}, 1)
	return duration, rate
end

local function updateYieldPreview()
	if not yieldLabel or not selectedReagent or not selectedSize then return end
	local yield = SteelSlag.CalculateYield(selectedSize, selectedReagent, 1.0, processTemperature)
	local yieldStr = ""
	for j, item in ipairs(yield) do
		if j <= 5 then
			yieldStr = yieldStr .. item.oxide .. ":" .. item.atomCount .. " "
		end
	end
	yieldLabel.Text = string.format("Yield @ %d°C: %s", math.floor(processTemperature + 0.5), yieldStr)
end

Remotes.ProcessControlState.OnClientEvent:Connect(function(data)
	if type(data) ~= "table" or type(data.temperature) ~= "number" then return end
	processTemperature = data.temperature
	processPressure = tonumber(data.pressure) or processPressure
	processFlowRate = tonumber(data.flowRate) or processFlowRate
	updateYieldPreview()
	if selectedReagent and selectedSize then
		local mins, rate = getLeachEstimate(selectedSize, selectedReagent)
		leachTimeLabel.Text = string.format("Est. time: %s (rate %.2fx)", SteelSlag.FormatLeachTime(mins), rate)
		leachTimeLabel.TextColor3 = C.text
	end
end)
local processStateRemote = Remotes:FindFirstChild("RequestProcessControlState")
if processStateRemote then
	processStateRemote:FireServer()
end
local reagentCards = {}

local reagentOrder = {"H2SO4", "HCl", "NaOH", "HNO3", "CitricAcid", "H2O"}

for _, rId in ipairs(reagentOrder) do
	local r = SteelSlag.Reagents[rId]
	local info = SteelSlag.GetReagentInfo(rId)

	local rCard = Instance.new("Frame")
	rCard.Name = rId
	rCard.Size = UDim2.new(1, 0, 0, 72)
	rCard.BackgroundColor3 = C.panelLight
	rCard.Parent = reagentScroll
	corner(rCard, 8)

	-- Color strip
	local strip = Instance.new("Frame")
	strip.Size = UDim2.new(0, 6, 0.8, 0)
	strip.Position = UDim2.new(0, 4, 0.1, 0)
	strip.BackgroundColor3 = r.color
	strip.Parent = rCard
	corner(strip, 3)

	-- Name + formula
	label(rCard, {Name="Name", Size=UDim2.new(0.4,0,0,20), Position=UDim2.new(0,16,0,4),
		Text=r.name, Color=C.text, Font=Enum.Font.GothamBold})
	label(rCard, {Name="Formula", Size=UDim2.new(0.15,0,0,18), Position=UDim2.new(0.38,0,0,4),
		Text=r.formula, Color=r.color, Font=Enum.Font.Code})

	-- pH + type
	local typeStr = r.type == "acid" and "Acid" or r.type == "base" and "Base" or r.type == "organic_acid" and "Organic Acid" or "Solvent"
	label(rCard, {Name="pH", Size=UDim2.new(0.3,0,0,14), Position=UDim2.new(0,16,0,24),
		Text="pH " .. r.pH .. " | " .. typeStr, Color=C.textDim})

	-- Description
	label(rCard, {Name="Desc", Size=UDim2.new(0.6,0,0,14), Position=UDim2.new(0,16,0,40),
		Text=r.description, Color=C.textDim})

	-- Best extractions
	local bestStr = "Best for: "
	if info.bestFor and #info.bestFor > 0 then
		local names = {}
		for j, b in ipairs(info.bestFor) do
			if j <= 3 then table.insert(names, b.oxide .. " (" .. math.floor(b.efficiency*100) .. "%)") end
		end
		bestStr = bestStr .. table.concat(names, ", ")
	else
		bestStr = bestStr .. "Limited extraction"
	end
	label(rCard, {Name="Best", Size=UDim2.new(0.95,0,0,12), Position=UDim2.new(0,16,0,56),
		Text=bestStr, Color=Color3.fromRGB(100, 200, 150)})

	-- Cost
	local costStr = r.cost > 0 and (r.cost .. " MC") or "FREE"
	label(rCard, {Name="Cost", Size=UDim2.new(0.15,0,0,20), Position=UDim2.new(0.7,0,0,4),
		Text=costStr, Color=r.cost == 0 and C.green or C.gold, Font=Enum.Font.GothamBold, Align=Enum.TextXAlignment.Center})

	-- Select button
	local selBtn = btn(rCard, {Name="SelBtn", Size=UDim2.new(0.14,0,0,28),
		Position=UDim2.new(0.84,0,0.5,-14), Text="Select", BgColor=C.accent})

	local cardStroke = Instance.new("UIStroke")
	cardStroke.Color = C.panelLight
	cardStroke.Thickness = 2
	cardStroke.Parent = rCard

	selBtn.Activated:Connect(function()
		selectedReagent = rId
		-- Highlight selected
		for _, rc in pairs(reagentCards) do
			rc.stroke.Color = C.panelLight
		end
		cardStroke.Color = C.accent
		selectedReagentLabel.Text = "Selected: " .. r.name .. " (" .. r.formula .. ")"
		selectedReagentLabel.TextColor3 = r.color
		-- Update time estimate if size also selected
		if selectedSize then
			local mins, rate = getLeachEstimate(selectedSize, rId)
			leachTimeLabel.Text = string.format("Est. time: %s (rate %.2fx)", SteelSlag.FormatLeachTime(mins), rate)
			leachTimeLabel.TextColor3 = C.text
			updateYieldPreview()
		end
	end)

	reagentCards[rId] = {card = rCard, stroke = cardStroke}
end

-- Update canvas size
reagentScroll.CanvasSize = UDim2.new(0, 0, 0, #reagentOrder * 78)

-- Size selector + start leach
label(leachPanel, {Name="SizeTitle", Size=UDim2.new(0.5,-10,0,20), Position=UDim2.new(0,10,0,322),
	Text="Slag Size to Leach:", Color=C.text, Font=Enum.Font.GothamBold})

selectedReagentLabel = label(leachPanel, {Name="SelReagent", Size=UDim2.new(0.5,-10,0,20),
	Position=UDim2.new(0.5,0,0,322), Text="No reagent selected", Color=C.textDim, Align=Enum.TextXAlignment.Right})

-- Reagent comparison header (#38)
label(leachPanel, {Name="CompareTitle", Size=UDim2.new(1,-20,0,14), Position=UDim2.new(0,10,0,318),
	Text="Quick Compare: H2SO4(best yield) | HCl(fast+cheap) | NaOH(selective) | H2O(free, slow)", Color=Color3.fromRGB(140,160,180)})

-- Size buttons
selectedSize = nil
local sizeBtns = {}
local sizeBtnY = 348

for i, sizeKey in ipairs(SteelSlag.SizeOrder) do
	if sizeKey == "chunk" then continue end -- can't leach raw chunks directly
	local data = SteelSlag.ParticleSizes[sizeKey]
	local sBtn = btn(leachPanel, {Name=sizeKey, Size=UDim2.new(0.3,-8,0,32),
		Position=UDim2.new((i-2)*0.33, 10, 0, sizeBtnY),
		Text=data.name .. "\n" .. data.sizeLabel, BgColor=C.tabInactive})
	sBtn.TextColor3 = C.text

	sBtn.Activated:Connect(function()
		selectedSize = sizeKey
		for _, sb in pairs(sizeBtns) do sb.BackgroundColor3 = C.tabInactive end
		sBtn.BackgroundColor3 = C.accent
		sBtn.TextColor3 = Color3.new(0,0,0)
		-- Update time estimate
		if selectedReagent then
			local mins, rate = getLeachEstimate(sizeKey, selectedReagent)
			leachTimeLabel.Text = string.format("Est. time: %s (rate %.2fx)", SteelSlag.FormatLeachTime(mins), rate)
		end
		updateYieldPreview()
	end)
	sizeBtns[sizeKey] = sBtn
end

-- Time estimate and start button
leachTimeLabel = label(leachPanel, {Name="TimeEst", Size=UDim2.new(0.5,-10,0,20),
	Position=UDim2.new(0,10,0,390), Text="Select reagent and size to see estimate", Color=C.textDim})

-- Yield preview
yieldLabel = label(leachPanel, {Name="Yield", Size=UDim2.new(0.5,-10,0,40),
	Position=UDim2.new(0.5,0,0,386), Text="", Color=C.textDim})

local startLeachBtn = btn(leachPanel, {Name="StartLeach", Size=UDim2.new(0.94,0,0,40),
	Position=UDim2.new(0.03,0,0,420), Text="START LEACHING", BgColor=C.green})

-- Prevent accidental double-clicks from creating duplicate batches/costs.
-- The server remains authoritative; this only closes the client-side race
-- while the first request is travelling to the server.
local startLeachBusy = false

startLeachBtn.Activated:Connect(function()
	playUIClick()
	if not selectedReagent then
		leachTimeLabel.Text = "Select a reagent first!"
		leachTimeLabel.TextColor3 = C.red
		return
	end
	if not selectedSize then
		leachTimeLabel.Text = "Select a particle size first!"
		leachTimeLabel.TextColor3 = C.red
		return
	end
	if startLeachBusy then
		leachTimeLabel.Text = "Leach request is processing — please wait."
		leachTimeLabel.TextColor3 = C.textDim
		return
	end
	local remote = Remotes:FindFirstChild("RequestStartLeach")
	if remote then
		startLeachBusy = true
		startLeachBtn.Active = false
		remote:FireServer(selectedReagent, selectedSize)
		task.delay(0.75, function()
			startLeachBusy = false
			if startLeachBtn.Parent then
				startLeachBtn.Active = true
			end
		end)
	end
	-- Flash button
	startLeachBtn.BackgroundColor3 = Color3.fromRGB(100, 255, 180)
	task.delay(0.3, function()
		startLeachBtn.BackgroundColor3 = C.green
	end)
end)

-- ═══════════════════════════════════════════════
-- TAB 3: ACTIVE PROCESSES MONITOR
-- ═══════════════════════════════════════════════

local monitorPanel = tabPanels["monitor"]

label(monitorPanel, {Name="MonTitle", Size=UDim2.new(1,-20,0,24), Position=UDim2.new(0,10,0,8),
	Text="Active Leaching Processes", Color=C.accent, Font=Enum.Font.GothamBold})

local monitorScroll = Instance.new("ScrollingFrame")
monitorScroll.Size = UDim2.new(1, -20, 1, -80)
monitorScroll.Position = UDim2.new(0, 10, 0, 38)
monitorScroll.BackgroundTransparency = 1
monitorScroll.ScrollBarThickness = 6
monitorScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
monitorScroll.Parent = monitorPanel

local monitorLayout = Instance.new("UIListLayout")
monitorLayout.Padding = UDim.new(0, 8)
monitorLayout.Parent = monitorScroll

local noProcessLabel = label(monitorPanel, {Name="NoProc", Size=UDim2.new(1,-20,0,30),
	Position=UDim2.new(0,10,0.4,0), Text="No active leaching processes. Start one in the Leaching tab!",
	Color=C.textDim, Align=Enum.TextXAlignment.Center})

-- Refresh button
local refreshBtn = btn(monitorPanel, {Name="RefreshBtn", Size=UDim2.new(0.3,0,0,30),
	Position=UDim2.new(0.65,0,1,-40), Text="Refresh", BgColor=Color3.fromRGB(80,150,255)})
refreshBtn.TextColor3 = Color3.new(1,1,1)

local leachCards = {} -- {leachId = frame}

function refreshMonitor()
	local remote = Remotes:FindFirstChild("RequestSlagInfo")
	if remote then remote:FireServer() end
end

refreshBtn.Activated:Connect(refreshMonitor)

-- ═══════════════════════════════════════════════
-- SERVER EVENT HANDLERS
-- ═══════════════════════════════════════════════

-- Slag inventory update
local slagInvEvent = Remotes:FindFirstChild("SlagInventoryUpdate")
if slagInvEvent then
	slagInvEvent.OnClientEvent:Connect(function(data)
		if data.slagInventory then
			for sizeKey, amount in pairs(data.slagInventory) do
				if slagAmounts[sizeKey] then
					slagAmounts[sizeKey].Text = amount .. " kg"
				end
			end
		end

		-- Update leach monitor if we have leach list
		if data.leachList then
			-- Clear old cards
			for _, child in monitorScroll:GetChildren() do
				if child:IsA("Frame") then child:Destroy() end
			end
			leachCards = {}

			if #data.leachList == 0 then
				noProcessLabel.Visible = true
			else
				noProcessLabel.Visible = false
				for _, leach in ipairs(data.leachList) do
					local card = Instance.new("Frame")
					card.Name = leach.id
					card.Size = UDim2.new(1, 0, 0, 112)
					card.BackgroundColor3 = C.panelLight
					card.Parent = monitorScroll
					corner(card, 8)

					-- Reagent color strip
					local reagent = SteelSlag.Reagents[leach.reagentId]
					local rColor = reagent and reagent.color or C.accent
					local rStrip = Instance.new("Frame")
					rStrip.Size = UDim2.new(0, 6, 0.85, 0)
					rStrip.Position = UDim2.new(0, 4, 0.075, 0)
					rStrip.BackgroundColor3 = rColor
					rStrip.Parent = card
					corner(rStrip, 3)

					label(card, {Name="Reagent", Size=UDim2.new(0.5,0,0,20), Position=UDim2.new(0,16,0,4),
						Text=leach.reagent .. " + " .. (SteelSlag.ParticleSizes[leach.size] and SteelSlag.ParticleSizes[leach.size].name or leach.size),
						Color=C.text, Font=Enum.Font.GothamBold})

					label(card, {Name="Time", Size=UDim2.new(0.3,0,0,16), Position=UDim2.new(0,16,0,26),
						Text=leach.complete and "COMPLETE!" or ("Remaining: " .. leach.timeRemaining),
						Color=leach.complete and C.green or C.textDim})

					-- Progress bar
					local pBg = Instance.new("Frame")
					pBg.Size = UDim2.new(0.9, 0, 0, 12)
					pBg.Position = UDim2.new(0.05, 0, 0, 48)
					pBg.BackgroundColor3 = C.progressBg
					pBg.Parent = card
					corner(pBg, 6)

					local pFill = Instance.new("Frame")
					pFill.Name = "Fill"
					pFill.Size = UDim2.new(math.clamp(leach.progress, 0, 1), 0, 1, 0)
					pFill.BackgroundColor3 = leach.complete and C.green or rColor
					pFill.Parent = pBg
					corner(pFill, 6)

					local pctLabel = label(card, {Name="Pct", Size=UDim2.new(0.3,0,0,14),
						Position=UDim2.new(0.65,0,0,26),
						Text=math.floor(leach.progress * 100) .. "%",
						Color=C.gold, Font=Enum.Font.GothamBold, Align=Enum.TextXAlignment.Right})

					-- Extract button (only if complete)
					if leach.complete then
						local extBtn = btn(card, {Name="ExtractBtn", Size=UDim2.new(0.3,0,0,24),
							Position=UDim2.new(0.65,0,0,64), Text="EXTRACT", BgColor=C.green})
						extBtn.Activated:Connect(function()
							local remote = Remotes:FindFirstChild("RequestExtractProducts")
							if remote then remote:FireServer(leach.id) end
							task.delay(0.5, refreshMonitor)
						end)
					end

					-- Yield preview
					if leach.yield and #leach.yield > 0 then
						local yStr = ""
						for j, y in ipairs(leach.yield) do
							if j <= 4 then yStr = yStr .. y.oxide .. " " end
						end
						label(card, {Name="YieldPreview", Size=UDim2.new(0.55,0,0,14),
							Position=UDim2.new(0.05,0,0,68), Text="Yields: " .. yStr, Color=C.textDim})
					end

					-- Show the physical mass outcome for this one-kilogram batch.
					-- This keeps residue and recovery visible instead of presenting
					-- extraction as if all input became saleable atoms.
					local balance = leach.massBalance
					if type(balance) == "table" and type(balance.inputKg) == "number" then
						local outputKg = tonumber(balance.outputKg) or 0
						local wasteKg = tonumber(balance.wasteKg) or 0
						local recovery = tonumber(balance.recovery) or 0
						label(card, {Name="MassBalance", Size=UDim2.new(0.58,0,0,14),
							Position=UDim2.new(0.05,0,0,86),
							Text=string.format("Mass: %.2f → %.2f kg | residue %.2f kg | %.1f%% recovery",
								balance.inputKg, outputKg, wasteKg, recovery),
							Color=C.gold})
					end

					leachCards[leach.id] = card
				end
			end

			monitorScroll.CanvasSize = UDim2.new(0, 0, 0, #data.leachList * 120)
		end
	end)
end

-- Crush progress update — persisted between opens (#33)
local lastCrushProgress = 0
local lastCrushHits = 0
local lastCrushTotal = 8

local crushEvent = Remotes:FindFirstChild("SlagCrushProgress")
if crushEvent then
	crushEvent.OnClientEvent:Connect(function(data)
		local progress = data.hits / data.totalHits
		lastCrushProgress = progress
		lastCrushHits = data.hits
		lastCrushTotal = data.totalHits
		TweenService:Create(crushBarFill, TweenInfo.new(0.1), {
			Size = UDim2.new(progress, 0, 1, 0),
		}):Play()
		crushLabel.Text = "Hammering... " .. data.hits .. "/" .. data.totalHits .. " hits"

		if data.hits >= data.totalHits then
			crushLabel.Text = "Crushed! Ready for next batch."
			crushBarFill.BackgroundColor3 = C.green
			lastCrushProgress = 0
			lastCrushHits = 0
			task.delay(1, function()
				crushBarFill.BackgroundColor3 = C.accent
				TweenService:Create(crushBarFill, TweenInfo.new(0.3), {Size = UDim2.new(0, 0, 1, 0)}):Play()
			end)
		end
	end)
end

-- Leach progress update (periodic)
local leachProgressEvent = Remotes:FindFirstChild("SlagLeachProgress")
if leachProgressEvent then
	leachProgressEvent.OnClientEvent:Connect(function(data)
		local card = leachCards[data.leachId]
		if card then
			local fill = card:FindFirstChild("Fill", true)
			if fill then
				TweenService:Create(fill, TweenInfo.new(1), {
					Size = UDim2.new(math.clamp(data.progress, 0, 1), 0, 1, 0),
				}):Play()
				if data.complete then
					fill.BackgroundColor3 = C.green
				end
			end
			local pct = card:FindFirstChild("Pct")
			if pct then pct.Text = math.floor(data.progress * 100) .. "%" end
			local timeL = card:FindFirstChild("Time")
			if timeL then
				timeL.Text = data.complete and "COMPLETE!" or ("Remaining: " .. data.timeRemaining)
				timeL.TextColor3 = data.complete and C.green or C.textDim
			end
		end
	end)
end

-- Extraction results
local extractEvent = Remotes:FindFirstChild("SlagExtracted")
if extractEvent then
	extractEvent.OnClientEvent:Connect(function(data)
		-- Play leach completion fanfare (#53)
		local SoundService = game:GetService("SoundService")
		local fanfare = SoundService:FindFirstChild("molecule_built")
		if fanfare then
			local clone = fanfare:Clone()
			clone.Volume = 0.6
			clone.Parent = SoundService
			clone:Play()
			clone.Ended:Connect(function() clone:Destroy() end)
		end
		-- Refresh monitor
		task.delay(0.5, refreshMonitor)
	end)
end

-- Leach started
local leachStartEvent = Remotes:FindFirstChild("SlagLeachStarted")
if leachStartEvent then
	leachStartEvent.OnClientEvent:Connect(function(data)
		-- Auto-switch to monitor tab
		for k, p in pairs(tabPanels) do p.Visible = false end
		for k, b in pairs(tabButtons) do b.BackgroundColor3 = C.tabInactive; b.TextColor3 = C.textDim end
		tabPanels["monitor"].Visible = true
		tabButtons["monitor"].BackgroundColor3 = C.tabActive
		tabButtons["monitor"].TextColor3 = C.text
		currentTab = "monitor"
		task.delay(0.5, refreshMonitor)
	end)
end

-- Request initial slag data when GUI opens + restore crush bar (#33)
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		refreshMonitor()
		-- Restore crush progress (#33)
		if lastCrushProgress > 0 then
			crushBarFill.Size = UDim2.new(lastCrushProgress, 0, 1, 0)
			crushLabel.Text = "Hammering... " .. lastCrushHits .. "/" .. lastCrushTotal .. " hits"
		end
		-- Also request slag inventory
		local remote = Remotes:FindFirstChild("RequestSlagInfo")
		if remote then remote:FireServer() end
	end
end)

print("[MOLGANG] SlagProcessingGui loaded — steel slag chemistry interface ready")
