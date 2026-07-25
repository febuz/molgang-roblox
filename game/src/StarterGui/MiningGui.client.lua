--[[
	MiningGui.client.lua
	MOLGANG — Vanadium Mining Interface

	3-tab interface:
	1. Explore — Browse available plots, buy exploration licenses
	2. My Mines — Manage owned plots, deploy equipment, collect ore
	3. Market — Buy/sell mining plots from other players

	Key: V to toggle (V for Vanadium!)
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local MiningSystem = require(ReplicatedStorage.Modules.MiningSystem)

-- UI click sound helper (#55)
local function playUIClick()
	local s = SoundService:FindFirstChild("ui_click")
	if s then
		local c = s:Clone(); c.Parent = SoundService; c:Play()
		c.Ended:Connect(function() c:Destroy() end)
	end
end

local C = {
	bg = Color3.fromRGB(14, 10, 8),
	panel = Color3.fromRGB(26, 20, 16),
	panelLight = Color3.fromRGB(40, 32, 26),
	accent = Color3.fromRGB(220, 160, 40),
	accentDim = Color3.fromRGB(140, 100, 25),
	green = Color3.fromRGB(0, 200, 120),
	red = Color3.fromRGB(200, 60, 60),
	gold = Color3.fromRGB(255, 215, 0),
	vanadium = Color3.fromRGB(255, 200, 0),
	text = Color3.fromRGB(230, 225, 215),
	textDim = Color3.fromRGB(140, 130, 110),
	unknown = Color3.fromRGB(100, 100, 110),
	tabActive = Color3.fromRGB(220, 160, 40),
	tabInactive = Color3.fromRGB(55, 48, 40),
	rare = Color3.fromRGB(80, 140, 255),
	legendary = Color3.fromRGB(255, 100, 255),
}

local RARITY_COLORS = {
	common = Color3.fromRGB(180, 180, 180),
	uncommon = Color3.fromRGB(100, 200, 100),
	rare = C.rare,
	legendary = C.legendary,
	unknown = C.unknown,
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
screenGui.Name = "MiningGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.DisplayOrder = 21
screenGui.Enabled = false
screenGui.Parent = playerGui

local responsiveScale = Instance.new("UIScale")
responsiveScale.Name = "ResponsiveScale"
responsiveScale.Parent = screenGui
local miningCamera = workspace.CurrentCamera
local function updateMiningScale()
	if not miningCamera then return end
	responsiveScale.Scale = math.clamp(math.min(
		(miningCamera.ViewportSize.X - 20) / 820,
		(miningCamera.ViewportSize.Y - 20) / 560
	), 0.65, 1)
end
updateMiningScale()
if miningCamera then
	miningCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateMiningScale)
end

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 820, 0, 560)
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.02
main.Parent = screenGui
corner(main, 14)
local ms = Instance.new("UIStroke"); ms.Color = C.accent; ms.Thickness = 2; ms.Parent = main

-- Title
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 42)
titleBar.BackgroundColor3 = C.panel
titleBar.Parent = main
corner(titleBar, 14)
lbl(titleBar, {N="Title", S=UDim2.new(0.6,0,0,22), P=UDim2.new(0,14,0,0),
	T="VANADIUM MINING — Exploration & Extraction", C=C.accent, F=Enum.Font.GothamBold})

local actionStatusLabel = lbl(titleBar, {N="ActionStatus", S=UDim2.new(0.6,0,0,16), P=UDim2.new(0,14,0,23),
	T="Ready — choose a mining action", C=C.textDim, F=Enum.Font.Gotham})
local function setActionStatus(text, color)
	actionStatusLabel.Text = tostring(text or "")
	actionStatusLabel.TextColor3 = color or C.textDim
end

local statsL = lbl(titleBar, {N="Stats", S=UDim2.new(0.35,0,1,0), P=UDim2.new(0.6,0,0,0),
	T="Ore: 0 kg | Value: 0 MC", C=C.textDim, A=Enum.TextXAlignment.Right})

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(28, 28); closeBtn.Position = UDim2.new(1, -36, 0, 7)
closeBtn.BackgroundColor3 = C.red; closeBtn.Text = "X"; closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold; closeBtn.TextScaled = true
closeBtn.Parent = titleBar; corner(closeBtn, 6)
closeBtn.Activated:Connect(function() playUIClick(); screenGui.Enabled = false end)

-- Tabs
local tabFrame = Instance.new("Frame")
tabFrame.Size = UDim2.new(1, 0, 0, 34)
tabFrame.Position = UDim2.new(0, 0, 0, 42)
tabFrame.BackgroundColor3 = C.panel; tabFrame.BackgroundTransparency = 0.3
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
	{key = "explore", name = "Explore & License"},
	{key = "mines", name = "My Mines"},
	{key = "market", name = "Plot Market"},
}
local tabButtons, tabPanels = {}, {}
for _, tab in ipairs(tabs) do
	local btn = Instance.new("TextButton")
	btn.Name = tab.key; btn.Size = UDim2.new(0, 180, 0, 28)
	btn.BackgroundColor3 = C.tabInactive; btn.TextColor3 = C.textDim
	btn.Text = tab.name; btn.Font = Enum.Font.GothamBold; btn.TextScaled = true
	btn.Parent = tabFrame; corner(btn, 6)
	tabButtons[tab.key] = btn
	local panel = Instance.new("Frame"); panel.Name = tab.key
	panel.Size = UDim2.new(1,0,1,0); panel.BackgroundTransparency = 1
	panel.Visible = (tab.key == "explore"); panel.Parent = contentFrame
	tabPanels[tab.key] = panel
	btn.Activated:Connect(function()
		playUIClick()
		for k, p in pairs(tabPanels) do p.Visible = false end
		for k, b in pairs(tabButtons) do b.BackgroundColor3 = C.tabInactive; b.TextColor3 = C.textDim end
		panel.Visible = true; btn.BackgroundColor3 = C.tabActive; btn.TextColor3 = C.text
	end)
end
tabButtons["explore"].BackgroundColor3 = C.tabActive; tabButtons["explore"].TextColor3 = C.text

-- ═══════════════════════════════════════════════
-- TAB 1: EXPLORE (buy exploration licenses)
-- ═══════════════════════════════════════════════

local explorePanel = tabPanels["explore"]
lbl(explorePanel, {N="Info", S=UDim2.new(1,-16,0,36), P=UDim2.new(0,8,0,4),
	T="MINING LOOP: buy a license → explore the plot → deploy equipment → wait for ore → collect and sell it for MolCoins. Composition stays hidden until you explore. Start with the free hand-pick, then upgrade to a Drill Rig or Haul Truck.",
	C=C.textDim})

local exploreScroll = Instance.new("ScrollingFrame")
exploreScroll.Size = UDim2.new(1, -16, 1, -48)
exploreScroll.Position = UDim2.new(0, 8, 0, 44)
exploreScroll.BackgroundTransparency = 1
exploreScroll.ScrollBarThickness = 6
exploreScroll.CanvasSize = UDim2.new(0, 0, 0, 800)
exploreScroll.Parent = explorePanel

local exploreLayout = Instance.new("UIListLayout")
exploreLayout.Padding = UDim.new(0, 4)
exploreLayout.Parent = exploreScroll

-- ═══════════════════════════════════════════════
-- TAB 2: MY MINES (manage owned plots)
-- ═══════════════════════════════════════════════

local minesPanel = tabPanels["mines"]
lbl(minesPanel, {N="Header", S=UDim2.new(1,-16,0,22), P=UDim2.new(0,8,0,4),
	T="YOUR MINING LOOP — Explore → deploy → produce ore → collect → sell", C=C.accent, F=Enum.Font.GothamBold})

local minesScroll = Instance.new("ScrollingFrame")
minesScroll.Size = UDim2.new(1, -16, 1, -30)
minesScroll.Position = UDim2.new(0, 8, 0, 28)
minesScroll.BackgroundTransparency = 1
minesScroll.ScrollBarThickness = 6
minesScroll.CanvasSize = UDim2.new(0, 0, 0, 400)
minesScroll.Parent = minesPanel

local minesLayout = Instance.new("UIListLayout")
minesLayout.Padding = UDim.new(0, 6)
minesLayout.Parent = minesScroll

-- Equipment buy section at bottom
local equipFrame = Instance.new("Frame")
equipFrame.Size = UDim2.new(1, -16, 0, 50)
equipFrame.Position = UDim2.new(0, 8, 1, -55)
equipFrame.BackgroundColor3 = C.panel
equipFrame.BackgroundTransparency = 0.3
equipFrame.Parent = minesPanel
corner(equipFrame, 6)
lbl(equipFrame, {N="EquipTitle", S=UDim2.new(0.3,0,0,18), P=UDim2.new(0,4,0,2),
	T="Buy Equipment:", C=C.accent, F=Enum.Font.GothamBold})

-- Equipment buttons
local equipBtns = {}
local equipX = 0.3
for _, equip in ipairs(MiningSystem.Equipment) do
	if equip.cost > 0 then  -- skip free hand pick
		local eb = Instance.new("TextButton")
		eb.Size = UDim2.new(0, 90, 0, 36)
		eb.Position = UDim2.new(equipX, 0, 0, 8)
		eb.BackgroundColor3 = C.panelLight
		eb.Text = equip.name:sub(1, 12) .. "\n" .. equip.cost .. " MC"
		eb.TextColor3 = C.text; eb.Font = Enum.Font.Gotham; eb.TextScaled = true
		eb.Parent = equipFrame; corner(eb, 4)
		equipX = equipX + 0.14
		eb.Activated:Connect(function()
			setActionStatus("Buying " .. equip.name .. "…", C.accent)
			local r = Remotes:FindFirstChild("RequestBuyMiningEquip")
			if r then r:FireServer(equip.id) else setActionStatus("Equipment service unavailable.", C.red) end
		end)
	end
end

-- ═══════════════════════════════════════════════
-- TAB 3: MARKET (buy/sell plots)
-- ═══════════════════════════════════════════════

local marketPanel = tabPanels["market"]
lbl(marketPanel, {N="Header", S=UDim2.new(1,-16,0,22), P=UDim2.new(0,8,0,4),
	T="PLOT MARKET — Trade plots when you want to expand or exit a region", C=C.accent, F=Enum.Font.GothamBold})

local marketScroll = Instance.new("ScrollingFrame")
marketScroll.Size = UDim2.new(1, -16, 1, -30)
marketScroll.Position = UDim2.new(0, 8, 0, 28)
marketScroll.BackgroundTransparency = 1
marketScroll.ScrollBarThickness = 6
marketScroll.CanvasSize = UDim2.new(0, 0, 0, 400)
marketScroll.Parent = marketPanel

local marketLayout = Instance.new("UIListLayout")
marketLayout.Padding = UDim.new(0, 4)
marketLayout.Parent = marketScroll

-- ═══════════════════════════════════════════════
-- SERVER EVENT HANDLERS
-- ═══════════════════════════════════════════════

local miningEvent = Remotes:FindFirstChild("MiningUpdate")
if miningEvent then
	miningEvent.OnClientEvent:Connect(function(data)
		-- Update stats
		statsL.Text = string.format("Ore: %d kg | Value: %d MC",
			data.totalOreMined or 0, data.totalOreValue or 0)

		-- TAB 1: Populate available plots
		for _, child in exploreScroll:GetChildren() do
			if child:IsA("Frame") then child:Destroy() end
		end
		if data.availablePlots then
			for _, plot in ipairs(data.availablePlots) do
				local card = Instance.new("Frame")
				card.Size = UDim2.new(1, 0, 0, 50)
				card.BackgroundColor3 = C.panelLight
				card.Parent = exploreScroll
				corner(card, 6)

				lbl(card, {N="Region", S=UDim2.new(0.35,0,0,18), P=UDim2.new(0,8,0,4),
					T="Plot #" .. plot.id .. " — " .. plot.region, C=C.text, F=Enum.Font.GothamBold})
				lbl(card, {N="Depth", S=UDim2.new(0.3,0,0,14), P=UDim2.new(0,8,0,24),
					T="Depth: " .. plot.depth .. "m | Composition: ???", C=C.unknown})
				lbl(card, {N="Cost", S=UDim2.new(0.15,0,0,18), P=UDim2.new(0.6,0,0,8),
					T=plot.licenseCost .. " MC", C=C.gold, F=Enum.Font.GothamBold, A=Enum.TextXAlignment.Center})

				local buyBtn = Instance.new("TextButton")
				buyBtn.Size = UDim2.new(0, 100, 0, 30)
				buyBtn.Position = UDim2.new(0.8, 0, 0.5, -15)
				buyBtn.BackgroundColor3 = C.accent
				buyBtn.Text = "BUY LICENSE"
				buyBtn.TextColor3 = Color3.new(0,0,0); buyBtn.Font = Enum.Font.GothamBold
				buyBtn.TextScaled = true; buyBtn.Parent = card; corner(buyBtn, 4)
				local pid = plot.id
				buyBtn.Activated:Connect(function()
					setActionStatus("Buying exploration license for Plot #" .. pid .. "…", C.accent)
					local r = Remotes:FindFirstChild("RequestBuyExplorationLicense")
					if r then r:FireServer(pid) else setActionStatus("Mining service unavailable.", C.red) end
				end)
			end
			exploreScroll.CanvasSize = UDim2.new(0, 0, 0, #data.availablePlots * 54)
		end

		-- TAB 2: Populate owned plots
		for _, child in minesScroll:GetChildren() do
			if child:IsA("Frame") then child:Destroy() end
		end
		if data.ownedPlots then
			for _, plot in ipairs(data.ownedPlots) do
				local card = Instance.new("Frame")
				card.Size = UDim2.new(1, 0, 0, 100)
				card.BackgroundColor3 = C.panelLight
				card.Parent = minesScroll
				corner(card, 8)

				local rarityColor = RARITY_COLORS[plot.rarity] or C.unknown

				-- Rarity strip
				local strip = Instance.new("Frame")
				strip.Size = UDim2.new(0, 5, 0.85, 0)
				strip.Position = UDim2.new(0, 3, 0.075, 0)
				strip.BackgroundColor3 = rarityColor
				strip.Parent = card; corner(strip, 2)

				lbl(card, {N="Name", S=UDim2.new(0.5,0,0,20), P=UDim2.new(0,14,0,4),
					T="Plot #" .. plot.id .. " — " .. plot.region, C=C.text, F=Enum.Font.GothamBold})

				if plot.explored then
					lbl(card, {N="V2O5", S=UDim2.new(0.3,0,0,20), P=UDim2.new(0,14,0,24),
						T="V2O5: " .. string.format("%.2f", plot.vanadiumPct) .. "%", C=C.vanadium, F=Enum.Font.GothamBold})

					-- Show composition
					local compStr = ""
					if plot.composition then
						for mineral, pct in pairs(plot.composition) do
							if pct >= 1.0 then
								compStr = compStr .. mineral .. ":" .. string.format("%.0f", pct) .. "% "
							end
						end
					end
					if plot.hazard then
						compStr = "⚠ Hazard: " .. plot.hazard .. "  " .. compStr
					end
					lbl(card, {N="Comp", S=UDim2.new(0.6,0,0,12), P=UDim2.new(0,14,0,44),
						T=compStr, C=plot.hazard and C.red or C.textDim})
				else
					lbl(card, {N="Unknown", S=UDim2.new(0.4,0,0,18), P=UDim2.new(0,14,0,24),
						T="UNEXPLORED — Click Explore!", C=C.unknown})
					-- Explore button
					local explBtn = Instance.new("TextButton")
					explBtn.Size = UDim2.new(0, 80, 0, 26)
					explBtn.Position = UDim2.new(0, 14, 0, 46)
					explBtn.BackgroundColor3 = Color3.fromRGB(80, 150, 255)
					explBtn.Text = "EXPLORE"; explBtn.TextColor3 = Color3.new(1,1,1)
					explBtn.Font = Enum.Font.GothamBold; explBtn.TextScaled = true
					explBtn.Parent = card; corner(explBtn, 4)
					local pid = plot.id
					explBtn.Activated:Connect(function()
						setActionStatus("Exploring Plot #" .. pid .. "…", C.rare)
						local r = Remotes:FindFirstChild("RequestExplorePlot")
						if r then r:FireServer(pid) else setActionStatus("Exploration service unavailable.", C.red) end
					end)
				end

				-- Equipment count
				local equipCount = plot.equipment and #plot.equipment or 0
				lbl(card, {N="Equip", S=UDim2.new(0.2,0,0,14), P=UDim2.new(0,14,0,62),
					T="Equipment: " .. equipCount, C=C.textDim})

				-- Ore stockpile
				lbl(card, {N="Ore", S=UDim2.new(0.2,0,0,14), P=UDim2.new(0,14,0,78),
					T="Ore: " .. math.floor(plot.oreStockpile or 0) .. " kg | Rit: " .. math.floor(plot.transportCapacity or 250) .. " kg",
					C=C.gold})

				-- Action buttons (right side)
				local actX = 0.55

				-- Deploy equipment
				local deployChoices = {}
				for equipId, amount in pairs(data.equipment or {}) do
					if amount > 0 and MiningSystem.GetEquipment(equipId) then
						table.insert(deployChoices, equipId)
					end
				end
				table.sort(deployChoices)
				local deployIndex = 1
				local deployBtn = Instance.new("TextButton")
				deployBtn.Size = UDim2.new(0, 70, 0, 24)
				deployBtn.Position = UDim2.new(actX, 0, 0, 8)
				deployBtn.BackgroundColor3 = C.accent
				local firstDeploy = deployChoices[deployIndex]
				deployBtn.Text = firstDeploy and ("Deploy\n" .. (MiningSystem.GetEquipment(firstDeploy).name or firstDeploy)) or "Buy equipment"
				deployBtn.TextColor3 = Color3.new(0,0,0)
				deployBtn.Font = Enum.Font.GothamBold; deployBtn.TextScaled = true
				deployBtn.Parent = card; corner(deployBtn, 4)
				local pid2 = plot.id
				deployBtn.Activated:Connect(function()
					if #deployChoices == 0 then setActionStatus("Buy equipment before deploying it.", C.red); return end
					local equipId = deployChoices[deployIndex]
					setActionStatus("Deploying " .. equipId .. " on Plot #" .. pid2 .. "…", C.accent)
					local r = Remotes:FindFirstChild("RequestDeployEquipment")
					if r then r:FireServer(pid2, equipId) else setActionStatus("Mining service unavailable.", C.red) end
					deployIndex = (deployIndex % #deployChoices) + 1
					local nextEquip = deployChoices[deployIndex]
					deployBtn.Text = "Deploy\n" .. (MiningSystem.GetEquipment(nextEquip).name or nextEquip)
				end)

				-- Collect ore
				local collectBtn = Instance.new("TextButton")
				collectBtn.Size = UDim2.new(0, 70, 0, 24)
				collectBtn.Position = UDim2.new(actX, 76, 0, 8)
				collectBtn.BackgroundColor3 = C.green
				collectBtn.Text = "Collect"; collectBtn.TextColor3 = Color3.new(0,0,0)
				collectBtn.Font = Enum.Font.GothamBold; collectBtn.TextScaled = true
				collectBtn.Parent = card; corner(collectBtn, 4)
				collectBtn.Activated:Connect(function()
					setActionStatus("Hauling ore from Plot #" .. pid2 .. "…", C.gold)
					local r = Remotes:FindFirstChild("RequestCollectOre")
					if r then r:FireServer(pid2) else setActionStatus("Ore service unavailable.", C.red) end
				end)

				-- Sell button
				local sellBtn = Instance.new("TextButton")
				sellBtn.Size = UDim2.new(0, 70, 0, 24)
				sellBtn.Position = UDim2.new(actX, 0, 0, 38)
				sellBtn.BackgroundColor3 = Color3.fromRGB(200, 100, 50)
				sellBtn.Text = plot.forSale and "Listed!" or "Sell"
				sellBtn.TextColor3 = Color3.new(1,1,1)
				sellBtn.Font = Enum.Font.GothamBold; sellBtn.TextScaled = true
				sellBtn.Parent = card; corner(sellBtn, 4)
				sellBtn.Activated:Connect(function()
					setActionStatus("Listing Plot #" .. pid2 .. " for sale…", C.gold)
					local r = Remotes:FindFirstChild("RequestListPlotForSale")
					if r then r:FireServer(pid2, (plot.vanadiumPct or 0.5) * 20000) else setActionStatus("Market service unavailable.", C.red) end
				end)
			end
			minesScroll.CanvasSize = UDim2.new(0, 0, 0, #data.ownedPlots * 106)
			if #data.ownedPlots == 0 then
				lbl(minesScroll, {N="NoPlots", S=UDim2.new(1, -16, 0, 92), P=UDim2.new(0, 8, 0, 8),
					T="Nog geen eigen mijn.\n1) Ga naar Explore & License\n2) Koop een licentie\n3) Explore je plot en plaats equipment om erts te produceren.",
					C=C.textDim, F=Enum.Font.GothamBold})
				minesScroll.CanvasSize = UDim2.new(0, 0, 0, 108)
			end
		end

		-- TAB 3: Populate market
		for _, child in marketScroll:GetChildren() do
			if child:IsA("Frame") then child:Destroy() end
		end
		if data.marketListings then
			for _, listing in ipairs(data.marketListings) do
				local card = Instance.new("Frame")
				card.Size = UDim2.new(1, 0, 0, 50)
				card.BackgroundColor3 = C.panelLight
				card.Parent = marketScroll
				corner(card, 6)

				lbl(card, {N="Name", S=UDim2.new(0.3,0,0,18), P=UDim2.new(0,8,0,4),
					T="Plot #" .. listing.id .. " — " .. listing.region, C=C.text, F=Enum.Font.GothamBold})

				if listing.explored then
					lbl(card, {N="V", S=UDim2.new(0.2,0,0,14), P=UDim2.new(0,8,0,26),
						T="V2O5: " .. string.format("%.1f", listing.vanadiumPct) .. "%",
						C=C.vanadium, F=Enum.Font.GothamBold})
				else
					lbl(card, {N="Unknown", S=UDim2.new(0.2,0,0,14), P=UDim2.new(0,8,0,26),
						T="Unexplored!", C=C.unknown})
				end

				lbl(card, {N="Price", S=UDim2.new(0.15,0,0,18), P=UDim2.new(0.55,0,0,8),
					T=listing.askPrice .. " MC", C=C.gold, F=Enum.Font.GothamBold, A=Enum.TextXAlignment.Center})

				local buyBtn = Instance.new("TextButton")
				buyBtn.Size = UDim2.new(0, 80, 0, 30)
				buyBtn.Position = UDim2.new(0.78, 0, 0.5, -15)
				buyBtn.BackgroundColor3 = C.green
				buyBtn.Text = "BUY PLOT"; buyBtn.TextColor3 = Color3.new(0,0,0)
				buyBtn.Font = Enum.Font.GothamBold; buyBtn.TextScaled = true
				buyBtn.Parent = card; corner(buyBtn, 4)
				local pid = listing.id
				buyBtn.Activated:Connect(function()
					setActionStatus("Buying mining Plot #" .. pid .. "…", C.gold)
					local r = Remotes:FindFirstChild("RequestBuyPlotFromMarket")
					if r then r:FireServer(pid) else setActionStatus("Market service unavailable.", C.red) end
				end)
			end
			marketScroll.CanvasSize = UDim2.new(0, 0, 0, #data.marketListings * 54)
		end
	end)
end

local announceEvent = Remotes:FindFirstChild("ServerAnnounce")
if announceEvent then
	announceEvent.OnClientEvent:Connect(function(data)
		local message = type(data) == "table" and data.message or data
		if type(message) ~= "string" then return end
		local lower = string.lower(message)
		if lower:find("plot", 1, true) or lower:find("mining", 1, true)
			or lower:find("ore", 1, true) or lower:find("haul", 1, true)
			or lower:find("equipment", 1, true) or lower:find("explor", 1, true)
			or lower:find("drill", 1, true) then
			local isFailure = lower:find("not", 1, true) or lower:find("reject", 1, true)
				or lower:find("cannot", 1, true) or lower:find("unavailable", 1, true)
			setActionStatus(message, isFailure and C.red or C.green)
		end
	end)
end

-- Exploration result popup
local plotExploredEvent = Remotes:FindFirstChild("PlotExplored")
if plotExploredEvent then
	plotExploredEvent.OnClientEvent:Connect(function(data)
		-- Refresh mining data
		local r = Remotes:FindFirstChild("RequestMiningInfo")
		if r then task.delay(0.5, function() r:FireServer() end) end
	end)
end

-- Refresh on open
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		local r = Remotes:FindFirstChild("RequestMiningInfo")
		if r then r:FireServer() end
	end
end)

print("[MOLGANG] MiningGui loaded — V key to open, explore/mine/trade vanadium plots")
