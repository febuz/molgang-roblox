--[[
	FertilizerGui.client.lua
	MOLGANG — Fertilizer Chemistry Lab & Farm Interface

	3-tab interface:
	1. Farm Plots — 4 plots with soil info, crop status, growth bars
	2. Fertilizer Lab — craft NPK fertilizers from atoms/MolCoins
	3. Story Quests — Acts 1-3 progression

	Key: F to toggle
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local FertilizerTrack = require(ReplicatedStorage.Modules.FertilizerTrack)

local C = {
	bg = Color3.fromRGB(12, 18, 10),
	panel = Color3.fromRGB(22, 30, 18),
	panelLight = Color3.fromRGB(35, 45, 28),
	accent = Color3.fromRGB(80, 200, 60),
	accentDim = Color3.fromRGB(50, 120, 40),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(230, 240, 225),
	textDim = Color3.fromRGB(130, 150, 120),
	soilBrown = Color3.fromRGB(140, 100, 60),
	waterBlue = Color3.fromRGB(80, 160, 220),
	progressBg = Color3.fromRGB(30, 40, 25),
	ready = Color3.fromRGB(0, 255, 100),
	tabActive = Color3.fromRGB(80, 200, 60),
	tabInactive = Color3.fromRGB(50, 60, 45),
}

local function corner(p, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = p end
local function lbl(p, props)
	local l = Instance.new("TextLabel"); l.Name = props.N or "L"
	l.Size = props.S or UDim2.new(1,0,0,20); l.Position = props.P or UDim2.new(0,0,0,0)
	l.BackgroundTransparency = 1; l.Text = props.T or ""; l.TextColor3 = props.C or C.text
	l.TextScaled = true; l.Font = props.F or Enum.Font.Gotham
	l.TextXAlignment = props.A or Enum.TextXAlignment.Left; l.TextWrapped = true; l.Parent = p; return l
end

-- ═══════════════════════════════════════════════
-- SCREEN GUI
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "FertilizerGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.DisplayOrder = 17
screenGui.Enabled = false
screenGui.Parent = playerGui

local responsiveScale = Instance.new("UIScale")
responsiveScale.Name = "ResponsiveScale"
responsiveScale.Parent = screenGui
local fertilizerCamera = workspace.CurrentCamera
local function updateFertilizerScale()
	if not fertilizerCamera then return end
	responsiveScale.Scale = math.clamp(math.min(
		(fertilizerCamera.ViewportSize.X - 20) / 780,
		(fertilizerCamera.ViewportSize.Y - 20) / 540
	), 0.65, 1)
end
updateFertilizerScale()
if fertilizerCamera then
	fertilizerCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateFertilizerScale)
end

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 780, 0, 540)
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.05
main.Parent = screenGui
corner(main, 12)
local ms = Instance.new("UIStroke"); ms.Color = C.accent; ms.Thickness = 2; ms.Parent = main

-- Title bar
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 42)
titleBar.BackgroundColor3 = C.panel
titleBar.Parent = main
corner(titleBar, 12)
lbl(titleBar, {N="Title", S=UDim2.new(0.8,0,1,0), P=UDim2.new(0,14,0,0),
	T="FERTILIZER CHEMISTRY LAB", C=C.accent, F=Enum.Font.GothamBold})

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(28, 28); closeBtn.Position = UDim2.new(1, -36, 0, 7)
closeBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 60); closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.new(1,1,1); closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true; closeBtn.Parent = titleBar; corner(closeBtn, 6)
closeBtn.Activated:Connect(function() screenGui.Enabled = false end)

-- Tabs
local tabFrame = Instance.new("Frame")
tabFrame.Size = UDim2.new(1, 0, 0, 34)
tabFrame.Position = UDim2.new(0, 0, 0, 42)
tabFrame.BackgroundColor3 = C.panel
tabFrame.BackgroundTransparency = 0.3
tabFrame.Parent = main
local tl = Instance.new("UIListLayout"); tl.FillDirection = Enum.FillDirection.Horizontal
tl.Padding = UDim.new(0, 4); tl.Parent = tabFrame
local tp = Instance.new("UIPadding"); tp.PaddingLeft = UDim.new(0, 8); tp.PaddingTop = UDim.new(0, 3); tp.Parent = tabFrame

local contentFrame = Instance.new("Frame")
contentFrame.Size = UDim2.new(1, 0, 1, -76)
contentFrame.Position = UDim2.new(0, 0, 0, 76)
contentFrame.BackgroundTransparency = 1
contentFrame.Parent = main

local tabs = {
	{key = "farm", name = "Farm Plots"},
	{key = "lab", name = "Fertilizer Lab"},
	{key = "quests", name = "Story Quests"},
}
local tabButtons, tabPanels = {}, {}

for _, tab in ipairs(tabs) do
	local btn = Instance.new("TextButton")
	btn.Name = tab.key; btn.Size = UDim2.new(0, 160, 0, 28)
	btn.BackgroundColor3 = C.tabInactive; btn.TextColor3 = C.textDim
	btn.Text = tab.name; btn.Font = Enum.Font.GothamBold; btn.TextScaled = true
	btn.Parent = tabFrame; corner(btn, 6)
	tabButtons[tab.key] = btn

	local panel = Instance.new("Frame"); panel.Name = tab.key
	panel.Size = UDim2.new(1, 0, 1, 0); panel.BackgroundTransparency = 1
	panel.Visible = (tab.key == "farm"); panel.Parent = contentFrame
	tabPanels[tab.key] = panel

	btn.Activated:Connect(function()
		for k, p in pairs(tabPanels) do p.Visible = false end
		for k, b in pairs(tabButtons) do b.BackgroundColor3 = C.tabInactive; b.TextColor3 = C.textDim end
		panel.Visible = true; btn.BackgroundColor3 = C.tabActive; btn.TextColor3 = C.text
	end)
end
tabButtons["farm"].BackgroundColor3 = C.tabActive; tabButtons["farm"].TextColor3 = C.text

-- ═══════════════════════════════════════════════
-- TAB 1: FARM PLOTS (2×2 grid of 4 plots)
-- ═══════════════════════════════════════════════

local farmPanel = tabPanels["farm"]
local plotCards = {}

for i = 1, 4 do
	local col = (i - 1) % 2
	local row = math.floor((i - 1) / 2)

	local card = Instance.new("Frame")
	card.Name = "Plot" .. i
	card.Size = UDim2.new(0.48, -6, 0.48, -6)
	card.Position = UDim2.new(col * 0.5 + 0.01, 4, row * 0.5 + 0.01, 4)
	card.BackgroundColor3 = C.panelLight
	card.Parent = farmPanel
	corner(card, 10)

	-- Plot header
	lbl(card, {N="Header", S=UDim2.new(1,-8,0,20), P=UDim2.new(0,4,0,4),
		T="Plot " .. i, C=C.accent, F=Enum.Font.GothamBold})

	-- Soil info
	local soilLabel = lbl(card, {N="Soil", S=UDim2.new(1,-8,0,16), P=UDim2.new(0,4,0,26),
		T="Soil: Unknown (test it!)", C=C.soilBrown})

	-- NPK display
	local npkLabel = lbl(card, {N="NPK", S=UDim2.new(1,-8,0,16), P=UDim2.new(0,4,0,42),
		T="N:? P:? K:? pH:?", C=C.textDim})

	-- Crop status
	local cropLabel = lbl(card, {N="Crop", S=UDim2.new(1,-8,0,16), P=UDim2.new(0,4,0,60),
		T="No crop planted", C=C.text})

	-- Growth progress bar
	local growBg = Instance.new("Frame")
	growBg.Size = UDim2.new(0.9, 0, 0, 10)
	growBg.Position = UDim2.new(0.05, 0, 0, 80)
	growBg.BackgroundColor3 = C.progressBg
	growBg.Parent = card
	corner(growBg, 5)
	local growFill = Instance.new("Frame")
	growFill.Name = "GrowFill"
	growFill.Size = UDim2.new(0, 0, 1, 0)
	growFill.BackgroundColor3 = C.accent
	growFill.Parent = growBg
	corner(growFill, 5)

	-- Action buttons row
	local btnY = 96
	local btnW = UDim2.new(0.3, -4, 0, 26)

	local testBtn = Instance.new("TextButton")
	testBtn.Size = btnW; testBtn.Position = UDim2.new(0.02, 0, 0, btnY)
	testBtn.BackgroundColor3 = C.waterBlue; testBtn.Text = "Test Soil"
	testBtn.TextColor3 = Color3.new(1,1,1); testBtn.Font = Enum.Font.GothamBold
	testBtn.TextScaled = true; testBtn.Parent = card; corner(testBtn, 4)

	local plantBtn = Instance.new("TextButton")
	plantBtn.Size = btnW; plantBtn.Position = UDim2.new(0.35, 0, 0, btnY)
	plantBtn.BackgroundColor3 = C.accent; plantBtn.Text = "Plant"
	plantBtn.TextColor3 = Color3.new(0,0,0); plantBtn.Font = Enum.Font.GothamBold
	plantBtn.TextScaled = true; plantBtn.Parent = card; corner(plantBtn, 4)

	local harvestBtn = Instance.new("TextButton")
	harvestBtn.Size = btnW; harvestBtn.Position = UDim2.new(0.68, 0, 0, btnY)
	harvestBtn.BackgroundColor3 = C.gold; harvestBtn.Text = "Harvest"
	harvestBtn.TextColor3 = Color3.new(0,0,0); harvestBtn.Font = Enum.Font.GothamBold
	harvestBtn.TextScaled = true; harvestBtn.Parent = card; corner(harvestBtn, 4)

	-- Fertilize button
	local fertBtn = Instance.new("TextButton")
	fertBtn.Size = UDim2.new(0.96, 0, 0, 22)
	fertBtn.Position = UDim2.new(0.02, 0, 0, btnY + 30)
	fertBtn.BackgroundColor3 = C.soilBrown
	fertBtn.Text = "Apply Fertilizer"
	fertBtn.TextColor3 = Color3.new(1,1,1); fertBtn.Font = Enum.Font.GothamBold
	fertBtn.TextScaled = true; fertBtn.Parent = card; corner(fertBtn, 4)

	-- Wire buttons
	testBtn.Activated:Connect(function()
		local r = Remotes:FindFirstChild("RequestTestSoil")
		if r then r:FireServer(i) end
	end)

	-- Simple crop picker: cycle through available crops
	local cropIdx = 0
	local availCrops = FertilizerTrack.Crops
	plantBtn.Activated:Connect(function()
		cropIdx = (cropIdx % #availCrops) + 1
		local crop = availCrops[cropIdx]
		local r = Remotes:FindFirstChild("RequestPlantCrop")
		if r then r:FireServer(i, crop.id) end
	end)

	harvestBtn.Activated:Connect(function()
		local r = Remotes:FindFirstChild("RequestHarvestCrop")
		if r then r:FireServer(i) end
	end)

	-- Simple fertilizer picker
	local fertIdx = 0
	local availFerts = FertilizerTrack.Fertilizers
	fertBtn.Activated:Connect(function()
		fertIdx = (fertIdx % #availFerts) + 1
		local fert = availFerts[fertIdx]
		local r = Remotes:FindFirstChild("RequestApplyFertilizer")
		if r then r:FireServer(i, fert.id) end
	end)

	plotCards[i] = {
		card = card,
		soilLabel = soilLabel,
		npkLabel = npkLabel,
		cropLabel = cropLabel,
		growFill = growFill,
		harvestBtn = harvestBtn,
	}
end

-- ═══════════════════════════════════════════════
-- TAB 2: FERTILIZER LAB
-- ═══════════════════════════════════════════════

local labPanel = tabPanels["lab"]
lbl(labPanel, {N="LabTitle", S=UDim2.new(1,-16,0,22), P=UDim2.new(0,8,0,4),
	T="Synthesize Fertilizers — Combine atoms into NPK compounds", C=C.accent, F=Enum.Font.GothamBold})

local fertScroll = Instance.new("ScrollingFrame")
fertScroll.Size = UDim2.new(1, -16, 1, -34)
fertScroll.Position = UDim2.new(0, 8, 0, 30)
fertScroll.BackgroundTransparency = 1
fertScroll.ScrollBarThickness = 6
fertScroll.CanvasSize = UDim2.new(0, 0, 0, #FertilizerTrack.Fertilizers * 64)
fertScroll.Parent = labPanel

local fertLayout = Instance.new("UIListLayout")
fertLayout.Padding = UDim.new(0, 4)
fertLayout.Parent = fertScroll

for _, fert in ipairs(FertilizerTrack.Fertilizers) do
	local fCard = Instance.new("Frame")
	fCard.Name = fert.id
	fCard.Size = UDim2.new(1, 0, 0, 58)
	fCard.BackgroundColor3 = C.panelLight
	fCard.Parent = fertScroll
	corner(fCard, 8)

	-- Color dot
	local dot = Instance.new("Frame")
	dot.Size = UDim2.fromOffset(6, 40); dot.Position = UDim2.new(0, 4, 0.5, -20)
	dot.BackgroundColor3 = fert.color; dot.Parent = fCard; corner(dot, 3)

	lbl(fCard, {N="Name", S=UDim2.new(0.35,0,0,20), P=UDim2.new(0,16,0,4),
		T=fert.name, C=C.text, F=Enum.Font.GothamBold})
	lbl(fCard, {N="Formula", S=UDim2.new(0.15,0,0,16), P=UDim2.new(0.35,0,0,4),
		T=fert.formula, C=C.textDim, F=Enum.Font.Code})
	lbl(fCard, {N="NPK", S=UDim2.new(0.2,0,0,16), P=UDim2.new(0,16,0,24),
		T="NPK: " .. fert.npk[1] .. "-" .. fert.npk[2] .. "-" .. fert.npk[3], C=C.accent})
	lbl(fCard, {N="Desc", S=UDim2.new(0.55,0,0,14), P=UDim2.new(0,16,0,40),
		T=fert.description, C=C.textDim})
	lbl(fCard, {N="Act", S=UDim2.new(0.1,0,0,14), P=UDim2.new(0.55,0,0,4),
		T="Act " .. fert.act, C=Color3.fromRGB(200, 180, 100)})

	-- Cost + craft button
	lbl(fCard, {N="Cost", S=UDim2.new(0.12,0,0,18), P=UDim2.new(0.7,0,0,6),
		T=fert.points .. " MC + atoms", C=C.gold, F=Enum.Font.GothamBold, A=Enum.TextXAlignment.Center})

	local craftBtn = Instance.new("TextButton")
	craftBtn.Size = UDim2.new(0.14, 0, 0, 32)
	craftBtn.Position = UDim2.new(0.84, 0, 0.5, -16)
	craftBtn.BackgroundColor3 = C.accent; craftBtn.Text = "Craft"
	craftBtn.TextColor3 = Color3.new(0,0,0); craftBtn.Font = Enum.Font.GothamBold
	craftBtn.TextScaled = true; craftBtn.Parent = fCard; corner(craftBtn, 6)

	craftBtn.Activated:Connect(function()
		local r = Remotes:FindFirstChild("RequestCraftFertilizer")
		if r then r:FireServer(fert.id) end
	end)
end

-- ═══════════════════════════════════════════════
-- TAB 3: STORY QUESTS
-- ═══════════════════════════════════════════════

local questPanel = tabPanels["quests"]
lbl(questPanel, {N="QTitle", S=UDim2.new(1,-16,0,22), P=UDim2.new(0,8,0,4),
	T="The Great Soil Crisis — Fertilizer Chemistry Track", C=C.accent, F=Enum.Font.GothamBold})

local questScroll = Instance.new("ScrollingFrame")
questScroll.Size = UDim2.new(1, -16, 1, -34)
questScroll.Position = UDim2.new(0, 8, 0, 30)
questScroll.BackgroundTransparency = 1
questScroll.ScrollBarThickness = 6
questScroll.CanvasSize = UDim2.new(0, 0, 0, #FertilizerTrack.StoryQuests * 72)
questScroll.Parent = questPanel

local questLayout = Instance.new("UIListLayout")
questLayout.Padding = UDim.new(0, 4)
questLayout.Parent = questScroll

local actColors = {
	[1] = Color3.fromRGB(100, 200, 100),   -- green
	[2] = Color3.fromRGB(200, 180, 80),    -- gold
	[3] = Color3.fromRGB(200, 80, 80),     -- red (crisis)
}

for _, quest in ipairs(FertilizerTrack.StoryQuests) do
	local qCard = Instance.new("Frame")
	qCard.Name = quest.id
	qCard.Size = UDim2.new(1, 0, 0, 66)
	qCard.BackgroundColor3 = C.panelLight
	qCard.Parent = questScroll
	corner(qCard, 8)

	-- Act badge
	local actBadge = Instance.new("Frame")
	actBadge.Size = UDim2.fromOffset(50, 18)
	actBadge.Position = UDim2.new(0, 4, 0, 4)
	actBadge.BackgroundColor3 = actColors[quest.act] or C.accent
	actBadge.Parent = qCard; corner(actBadge, 4)
	lbl(actBadge, {N="ActLabel", S=UDim2.new(1,0,1,0), T="Act " .. quest.act,
		C=Color3.new(0,0,0), F=Enum.Font.GothamBold, A=Enum.TextXAlignment.Center})

	lbl(qCard, {N="Title", S=UDim2.new(0.7,0,0,20), P=UDim2.new(0,60,0,2),
		T=quest.title, C=C.text, F=Enum.Font.GothamBold})
	lbl(qCard, {N="NPC", S=UDim2.new(0.25,0,0,14), P=UDim2.new(0.72,0,0,4),
		T=quest.npc, C=C.textDim, A=Enum.TextXAlignment.Right})
	lbl(qCard, {N="Desc", S=UDim2.new(0.9,0,0,14), P=UDim2.new(0,8,0,24),
		T=quest.description, C=C.textDim})
	lbl(qCard, {N="Obj", S=UDim2.new(0.6,0,0,14), P=UDim2.new(0,8,0,40),
		T="Objective: " .. quest.objective, C=C.waterBlue})

	-- Reward
	local rewardStr = quest.reward.molCoins .. " MC"
	if quest.reward.badge then rewardStr = rewardStr .. " + " .. quest.reward.badge end
	lbl(qCard, {N="Reward", S=UDim2.new(0.3,0,0,14), P=UDim2.new(0.65,0,0,48),
		T="Reward: " .. rewardStr, C=C.gold, A=Enum.TextXAlignment.Right})

	-- Status dot
	local statusDot = Instance.new("Frame")
	statusDot.Size = UDim2.fromOffset(10, 10)
	statusDot.Position = UDim2.new(0, 8, 0, 52)
	statusDot.BackgroundColor3 = C.textDim  -- grey = locked
	statusDot.Parent = qCard; corner(statusDot, 5)
end

-- ═══════════════════════════════════════════════
-- SERVER EVENT HANDLERS
-- ═══════════════════════════════════════════════

local fertUpdateEvent = Remotes:FindFirstChild("FertilizerUpdate")
if fertUpdateEvent then
	fertUpdateEvent.OnClientEvent:Connect(function(data)
		if data.plots then
			for i, plot in ipairs(data.plots) do
				local pc = plotCards[i]
				if pc then
					if plot.tested then
						pc.soilLabel.Text = "Soil: " .. plot.soilName
						pc.npkLabel.Text = string.format("N:%d P:%d K:%d pH:%.1f",
							plot.nutrients.N, plot.nutrients.P, plot.nutrients.K, plot.pH)
					else
						pc.soilLabel.Text = "Soil: Unknown (test it!)"
						pc.npkLabel.Text = "N:? P:? K:? pH:?"
					end

					if plot.crop then
						local status = plot.ready and " [READY!]" or (" " .. math.floor(plot.growthProgress) .. "%")
						pc.cropLabel.Text = plot.cropName .. status
						pc.cropLabel.TextColor3 = plot.ready and C.ready or C.text
					else
						pc.cropLabel.Text = "No crop planted"
						pc.cropLabel.TextColor3 = C.textDim
					end

					TweenService:Create(pc.growFill, TweenInfo.new(0.5), {
						Size = UDim2.new(math.clamp(plot.growthProgress / 100, 0, 1), 0, 1, 0),
					}):Play()
					pc.growFill.BackgroundColor3 = plot.ready and C.ready or C.accent
				end
			end
		end
	end)
end

-- Growth tick updates
local growthEvent = Remotes:FindFirstChild("CropGrowthTick")
if growthEvent then
	growthEvent.OnClientEvent:Connect(function(data)
		local pc = plotCards[data.plotId]
		if pc then
			TweenService:Create(pc.growFill, TweenInfo.new(1), {
				Size = UDim2.new(math.clamp(data.progress / 100, 0, 1), 0, 1, 0),
			}):Play()
			if data.ready then
				pc.growFill.BackgroundColor3 = C.ready
			end
		end
	end)
end

-- Refresh on open
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		local r = Remotes:FindFirstChild("RequestFertilizerInfo")
		if r then r:FireServer() end
	end
end)

print("[MOLGANG] FertilizerGui loaded — F key to open, 4 farm plots, craft + plant + harvest")
