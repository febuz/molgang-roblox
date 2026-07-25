--[[
	ProcessControlGui.client.lua
	MOLGANG — Chemical Engineering Process Control Panel

	Real-time dashboard for monitoring and controlling process variables:
	- Temperature gauge (0-1000°C) with Arrhenius rate indicator
	- Pressure gauge (0-500 kPa) with Henry's Law effect
	- pH meter (0-14) with metal precipitation zones
	- Flow rate control (1-50 L/min) with residence time
	- Reaction rate multiplier (combined effect)
	- Mass balance summary (input → products → waste)
	- Energy cost estimator

	Players adjust controls to optimize their slag leaching and
	fertilizer production. Bad settings = wasted reagents + low yield.

	Key: C to toggle (Control panel)
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local ProcessEng = require(ReplicatedStorage.Modules.ProcessEngineering)

local C = {
	bg = Color3.fromRGB(8, 12, 20),
	panel = Color3.fromRGB(16, 22, 34),
	gauge = Color3.fromRGB(22, 30, 45),
	gaugeFill = Color3.fromRGB(0, 200, 130),
	tempHot = Color3.fromRGB(255, 80, 30),
	tempCold = Color3.fromRGB(60, 140, 255),
	phAcid = Color3.fromRGB(255, 60, 60),
	phNeutral = Color3.fromRGB(80, 200, 80),
	phBase = Color3.fromRGB(80, 80, 255),
	accent = Color3.fromRGB(0, 220, 140),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(220, 230, 240),
	textDim = Color3.fromRGB(110, 125, 150),
	warning = Color3.fromRGB(255, 160, 40),
	danger = Color3.fromRGB(255, 60, 60),
}

local function corner(p, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = p end

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

local processState = ProcessEng.CreateProcessState()
local controlsReady = false

-- ═══════════════════════════════════════════════
-- SCREEN GUI
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "ProcessControlGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.DisplayOrder = 18
screenGui.Enabled = false
screenGui.Parent = playerGui

local responsiveScale = Instance.new("UIScale")
responsiveScale.Name = "ResponsiveScale"
responsiveScale.Parent = screenGui
local controlCamera = workspace.CurrentCamera
local function updateControlScale()
	if not controlCamera then return end
	responsiveScale.Scale = math.clamp(math.min(
		(controlCamera.ViewportSize.X - 20) / 860,
		(controlCamera.ViewportSize.Y - 20) / 520
	), 0.65, 1)
end
updateControlScale()
if controlCamera then
	controlCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateControlScale)
end

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 860, 0, 520)
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.02
main.Parent = screenGui
corner(main, 14)
local ms = Instance.new("UIStroke"); ms.Color = C.accent; ms.Thickness = 2; ms.Parent = main

-- Title
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 40)
titleBar.BackgroundColor3 = C.panel
titleBar.Parent = main
corner(titleBar, 14)

local titleL = Instance.new("TextLabel")
titleL.Size = UDim2.new(0.6, 0, 1, 0)
titleL.Position = UDim2.new(0, 14, 0, 0)
titleL.BackgroundTransparency = 1
titleL.Text = "PROCESS CONTROL PANEL — Chemical Engineering Simulator"
titleL.TextColor3 = C.accent
titleL.TextScaled = true
titleL.Font = Enum.Font.GothamBold
titleL.TextXAlignment = Enum.TextXAlignment.Left
titleL.Parent = titleBar

-- Reaction rate display (top right)
local rateLabel = Instance.new("TextLabel")
rateLabel.Name = "RateLabel"
rateLabel.Size = UDim2.new(0.3, 0, 1, 0)
rateLabel.Position = UDim2.new(0.65, 0, 0, 0)
rateLabel.BackgroundTransparency = 1
rateLabel.Text = "Reaction Rate: 1.00x"
rateLabel.TextColor3 = C.gold
rateLabel.TextScaled = true
rateLabel.Font = Enum.Font.GothamBold
rateLabel.TextXAlignment = Enum.TextXAlignment.Right
rateLabel.Parent = titleBar

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(28, 28)
closeBtn.Position = UDim2.new(1, -36, 0, 6)
closeBtn.BackgroundColor3 = C.danger
closeBtn.Text = "X"; closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold; closeBtn.TextScaled = true
closeBtn.Parent = titleBar; corner(closeBtn, 6)
closeBtn.Activated:Connect(function() screenGui.Enabled = false end)

-- ═══════════════════════════════════════════════
-- GAUGE HELPER: Creates a vertical gauge with slider
-- ═══════════════════════════════════════════════

local function createGauge(parent, config)
	local frame = Instance.new("Frame")
	frame.Name = config.name
	frame.Size = config.size or UDim2.new(0, 160, 0, 400)
	frame.Position = config.position
	frame.BackgroundColor3 = C.gauge
	frame.Parent = parent
	corner(frame, 10)

	-- Title
	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, -8, 0, 22)
	title.Position = UDim2.new(0, 4, 0, 6)
	title.BackgroundTransparency = 1
	title.Text = config.title
	title.TextColor3 = config.accentColor or C.accent
	title.TextScaled = true
	title.Font = Enum.Font.GothamBold
	title.TextXAlignment = Enum.TextXAlignment.Center
	title.Parent = frame

	-- Value display
	local valueLabel = Instance.new("TextLabel")
	valueLabel.Name = "Value"
	valueLabel.Size = UDim2.new(1, -8, 0, 28)
	valueLabel.Position = UDim2.new(0, 4, 0, 28)
	valueLabel.BackgroundTransparency = 1
	valueLabel.Text = config.formatValue(config.default)
	valueLabel.TextColor3 = C.text
	valueLabel.TextScaled = true
	valueLabel.Font = Enum.Font.GothamBold
	valueLabel.TextXAlignment = Enum.TextXAlignment.Center
	valueLabel.Parent = frame

	-- Gauge bar background
	local barBg = Instance.new("Frame")
	barBg.Size = UDim2.new(0, 30, 0, 260)
	barBg.Position = UDim2.new(0.5, -15, 0, 62)
	barBg.BackgroundColor3 = Color3.fromRGB(15, 18, 28)
	barBg.Parent = frame
	corner(barBg, 6)

	-- Gauge fill (from bottom up)
	local barFill = Instance.new("Frame")
	barFill.Name = "Fill"
	local initPct = (config.default - config.min) / (config.max - config.min)
	barFill.Size = UDim2.new(1, 0, initPct, 0)
	barFill.Position = UDim2.new(0, 0, 1 - initPct, 0)
	barFill.BackgroundColor3 = config.accentColor or C.gaugeFill
	barFill.Parent = barBg
	corner(barFill, 6)

	-- Gradient for temperature-style gauges
	if config.gradient then
		local grad = Instance.new("UIGradient")
		grad.Color = config.gradient
		grad.Rotation = 270  -- bottom to top
		grad.Parent = barFill
	end

	-- Scale labels (min/max)
	local maxL = Instance.new("TextLabel")
	maxL.Size = UDim2.new(0, 50, 0, 14)
	maxL.Position = UDim2.new(0.5, 20, 0, 60)
	maxL.BackgroundTransparency = 1
	maxL.Text = tostring(config.max) .. (config.unit or "")
	maxL.TextColor3 = C.textDim
	maxL.TextScaled = true
	maxL.Font = Enum.Font.Gotham
	maxL.TextXAlignment = Enum.TextXAlignment.Left
	maxL.Parent = frame

	local minL = Instance.new("TextLabel")
	minL.Size = UDim2.new(0, 50, 0, 14)
	minL.Position = UDim2.new(0.5, 20, 0, 308)
	minL.BackgroundTransparency = 1
	minL.Text = tostring(config.min) .. (config.unit or "")
	minL.TextColor3 = C.textDim
	minL.TextScaled = true
	minL.Font = Enum.Font.Gotham
	minL.TextXAlignment = Enum.TextXAlignment.Left
	minL.Parent = frame

	-- Effect indicator
	local effectLabel = Instance.new("TextLabel")
	effectLabel.Name = "Effect"
	effectLabel.Size = UDim2.new(1, -8, 0, 30)
	effectLabel.Position = UDim2.new(0, 4, 1, -40)
	effectLabel.BackgroundTransparency = 1
	effectLabel.Text = ""
	effectLabel.TextColor3 = C.textDim
	effectLabel.TextScaled = true
	effectLabel.Font = Enum.Font.Gotham
	effectLabel.TextWrapped = true
	effectLabel.TextXAlignment = Enum.TextXAlignment.Center
	effectLabel.Parent = frame

	-- Increment/decrement buttons
	local upBtn = Instance.new("TextButton")
	upBtn.Size = UDim2.new(0.4, 0, 0, 24)
	upBtn.Position = UDim2.new(0.05, 0, 0, 330)
	upBtn.BackgroundColor3 = C.accent
	upBtn.Text = "+"
	upBtn.TextColor3 = Color3.new(0, 0, 0)
	upBtn.Font = Enum.Font.GothamBold
	upBtn.TextScaled = true
	upBtn.Parent = frame
	corner(upBtn, 4)

	local downBtn = Instance.new("TextButton")
	downBtn.Size = UDim2.new(0.4, 0, 0, 24)
	downBtn.Position = UDim2.new(0.55, 0, 0, 330)
	downBtn.BackgroundColor3 = Color3.fromRGB(100, 60, 60)
	downBtn.Text = "-"
	downBtn.TextColor3 = Color3.new(1, 1, 1)
	downBtn.Font = Enum.Font.GothamBold
	downBtn.TextScaled = true
	downBtn.Parent = frame
	corner(downBtn, 4)

	local currentValue = config.default

	local function updateGauge(value)
		currentValue = math.clamp(value, config.min, config.max)
		local pct = (currentValue - config.min) / (config.max - config.min)
		TweenService:Create(barFill, TweenInfo.new(0.2), {
			Size = UDim2.new(1, 0, pct, 0),
			Position = UDim2.new(0, 0, 1 - pct, 0),
		}):Play()
		valueLabel.Text = config.formatValue(currentValue)

		-- Call effect calculator
		if config.onChanged then
			local effectText, effectColor = config.onChanged(currentValue)
			effectLabel.Text = effectText
			effectLabel.TextColor3 = effectColor or C.textDim
		end
	end

	upBtn.Activated:Connect(function()
		updateGauge(currentValue + config.step)
	end)
	downBtn.Activated:Connect(function()
		updateGauge(currentValue - config.step)
	end)

	-- Initial effect
	updateGauge(config.default)

	return {
		frame = frame,
		getValue = function() return currentValue end,
		setValue = updateGauge,
	}
end

-- ═══════════════════════════════════════════════
-- GAUGES LAYOUT
-- ═══════════════════════════════════════════════

-- Help bar explaining what each gauge does
local helpBar = Instance.new("TextLabel")
helpBar.Size = UDim2.new(1, -20, 0, 32)
helpBar.Position = UDim2.new(0, 10, 0, 42)
helpBar.BackgroundColor3 = Color3.fromRGB(20, 25, 35)
helpBar.BackgroundTransparency = 0.3
helpBar.Text = "  TEMP: Higher = faster (Arrhenius) | PRESSURE: Helps dissolve gases | pH: Controls which metals precipitate | FLOW: Slower = better conversion"
helpBar.TextColor3 = C.textDim
helpBar.TextScaled = true
helpBar.Font = Enum.Font.Gotham
helpBar.TextWrapped = true
helpBar.TextXAlignment = Enum.TextXAlignment.Left
helpBar.Parent = main
local hbCorner = Instance.new("UICorner")
hbCorner.CornerRadius = UDim.new(0, 6)
hbCorner.Parent = helpBar

local gaugeArea = Instance.new("Frame")
gaugeArea.Size = UDim2.new(1, -20, 1, -80)
gaugeArea.Position = UDim2.new(0, 10, 0, 76)
gaugeArea.BackgroundTransparency = 1
gaugeArea.Parent = main

-- Gauge 1: TEMPERATURE
local tempGauge = createGauge(gaugeArea, {
	name = "Temperature",
	title = "TEMPERATURE",
	position = UDim2.new(0, 0, 0, 0),
	size = UDim2.new(0, 160, 1, 0),
	min = 0, max = 1000, default = 25, step = 25,
	unit = "°C",
	accentColor = C.tempHot,
	gradient = ColorSequence.new({
		ColorSequenceKeypoint.new(0, C.tempCold),
		ColorSequenceKeypoint.new(0.5, C.gold),
		ColorSequenceKeypoint.new(1, C.tempHot),
	}),
	formatValue = function(v) return string.format("%d°C", v) end,
	onChanged = function(temp)
		processState.temperature = temp
		local mult = ProcessEng.ArrheniusMultiplier(temp, 50)
		local text = string.format("Rate: %.2fx", mult)
		if temp > 500 then
			text = text .. "\nHigh energy cost!"
			return text, C.danger
		elseif temp > 200 then
			text = text .. "\nGood for roasting"
			return text, C.gold
		elseif temp < 10 then
			text = text .. "\nToo cold!"
			return text, C.tempCold
		end
		return text, C.accent
	end,
})

-- Gauge 2: PRESSURE
local pressGauge = createGauge(gaugeArea, {
	name = "Pressure",
	title = "PRESSURE",
	position = UDim2.new(0, 170, 0, 0),
	size = UDim2.new(0, 160, 1, 0),
	min = 50, max = 500, default = 101, step = 10,
	unit = "kPa",
	accentColor = Color3.fromRGB(100, 200, 255),
	formatValue = function(v) return string.format("%d kPa\n(%.1f atm)", v, v / 101.325) end,
	onChanged = function(pressure)
		processState.pressure = pressure
		local mult = ProcessEng.PressureMultiplier(pressure)
		local text = string.format("Gas sol: %.2fx", mult)
		if pressure > 300 then
			text = text .. "\nHigh pressure vessel!"
			return text, C.warning
		end
		return text, Color3.fromRGB(100, 200, 255)
	end,
})

-- Gauge 3: pH
local phGauge = createGauge(gaugeArea, {
	name = "pH",
	title = "pH CONTROL",
	position = UDim2.new(0, 340, 0, 0),
	size = UDim2.new(0, 160, 1, 0),
	min = 0, max = 14, default = 7, step = 0.5,
	unit = "",
	accentColor = C.phNeutral,
	gradient = ColorSequence.new({
		ColorSequenceKeypoint.new(0, C.phAcid),
		ColorSequenceKeypoint.new(0.5, C.phNeutral),
		ColorSequenceKeypoint.new(1, C.phBase),
	}),
	formatValue = function(v) return string.format("pH %.1f", v) end,
	onChanged = function(pH)
		processState.pH = pH
		-- Show what precipitates at this pH
		local precipitates = {}
		for metal, _ in pairs(ProcessEng.PrecipitationPH) do
			local frac = ProcessEng.PrecipitationFraction(metal, pH)
			if frac > 0.1 then
				table.insert(precipitates, metal .. ":" .. math.floor(frac * 100) .. "%")
			end
		end
		local text = #precipitates > 0 and ("Precip: " .. table.concat(precipitates, " ")) or "No precipitation"
		if pH < 2 then return text, C.phAcid
		elseif pH > 12 then return text, C.phBase
		else return text, C.phNeutral end
	end,
})

-- Gauge 4: FLOW RATE
local flowGauge = createGauge(gaugeArea, {
	name = "FlowRate",
	title = "FLOW RATE",
	position = UDim2.new(0, 510, 0, 0),
	size = UDim2.new(0, 160, 1, 0),
	min = 1, max = 50, default = 10, step = 2,
	unit = "L/min",
	accentColor = Color3.fromRGB(80, 180, 220),
	formatValue = function(v) return string.format("%d L/min", v) end,
	onChanged = function(flow)
		processState.flowRate = flow
		local resEffect = ProcessEng.ResidenceTimeEffect(flow, processState.reactorVolume)
		local resTime = processState.reactorVolume / flow
		local text = string.format("Res.time: %.0f min\nConversion: %.0f%%", resTime, resEffect * 63.2)
		if flow > 30 then
			text = text .. "\nToo fast! Low conversion"
			return text, C.warning
		end
		return text, Color3.fromRGB(80, 180, 220)
	end,
})

-- Load the server-owned persisted controls before the heartbeat can publish
-- the GUI defaults back to the server.
local processStateEvent = Remotes:FindFirstChild("ProcessControlState")
if processStateEvent then
	processStateEvent.OnClientEvent:Connect(function(data)
		if type(data) ~= "table" then return end
		if data.temperature then tempGauge.setValue(data.temperature) end
		if data.pressure then pressGauge.setValue(data.pressure) end
		if data.pH then phGauge.setValue(data.pH) end
		if data.flowRate then flowGauge.setValue(data.flowRate) end
		controlsReady = true
	end)
end

screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if not screenGui.Enabled then return end
	controlsReady = false
	local request = Remotes:FindFirstChild("RequestProcessControlState")
	if request then request:FireServer() end
end)

-- ═══════════════════════════════════════════════
-- RIGHT PANEL: Mass Balance + Summary
-- ═══════════════════════════════════════════════

local summaryPanel = Instance.new("Frame")
summaryPanel.Size = UDim2.new(0, 170, 1, 0)
summaryPanel.Position = UDim2.new(0, 680, 0, 0)
summaryPanel.BackgroundColor3 = C.panel
summaryPanel.Parent = gaugeArea
corner(summaryPanel, 10)

local summaryTitle = Instance.new("TextLabel")
summaryTitle.Size = UDim2.new(1, -8, 0, 20)
summaryTitle.Position = UDim2.new(0, 4, 0, 6)
summaryTitle.BackgroundTransparency = 1
summaryTitle.Text = "PROCESS SUMMARY"
summaryTitle.TextColor3 = C.gold
summaryTitle.TextScaled = true
summaryTitle.Font = Enum.Font.GothamBold
summaryTitle.Parent = summaryPanel

local summaryText = Instance.new("TextLabel")
summaryText.Name = "SummaryText"
summaryText.Size = UDim2.new(1, -8, 1, -30)
summaryText.Position = UDim2.new(0, 4, 0, 28)
summaryText.BackgroundTransparency = 1
summaryText.Text = "Adjust controls\nto see effects..."
summaryText.TextColor3 = C.textDim
summaryText.TextScaled = true
summaryText.Font = Enum.Font.Gotham
summaryText.TextXAlignment = Enum.TextXAlignment.Left
summaryText.TextYAlignment = Enum.TextYAlignment.Top
summaryText.TextWrapped = true
summaryText.Parent = summaryPanel

-- ═══════════════════════════════════════════════
-- UPDATE LOOP: Recalculate combined effects
-- ═══════════════════════════════════════════════

local frameCount = 0
local lastSentControls = nil
RunService.Heartbeat:Connect(function()
	if not screenGui.Enabled then return end
	if not controlsReady then return end
	frameCount = frameCount + 1
	if frameCount % 60 ~= 0 then return end -- at most once per second

	-- Update derived values
	ProcessEng.UpdateDerivedValues(processState)

	-- Send process variables to server
	local setControlRemote = Remotes:FindFirstChild("RequestSetProcessControl")
	local controlsChanged = not lastSentControls
		or lastSentControls.temperature ~= processState.temperature
		or lastSentControls.pressure ~= processState.pressure
		or lastSentControls.pH ~= processState.pH
		or lastSentControls.flowRate ~= processState.flowRate
	if setControlRemote and controlsChanged then
		setControlRemote:FireServer(
			processState.temperature,
			processState.pressure,
			processState.pH,
			processState.flowRate
		)
		lastSentControls = {
			temperature = processState.temperature,
			pressure = processState.pressure,
			pH = processState.pH,
			flowRate = processState.flowRate,
		}
	end

	-- Update reaction rate display
	rateLabel.Text = string.format("Reaction Rate: %.2fx", processState.reactionRate)
	if processState.reactionRate > 5 then
		rateLabel.TextColor3 = C.accent
	elseif processState.reactionRate > 1 then
		rateLabel.TextColor3 = C.gold
	elseif processState.reactionRate > 0.5 then
		rateLabel.TextColor3 = C.warning
	else
		rateLabel.TextColor3 = C.danger
	end

	-- Show the same operating-envelope decision that the server will enforce.
	-- This turns a failed start into an actionable plant instruction.
	local safe, _, safetyMessage = ProcessEng.ValidateOperatingEnvelope(processState)
	if safe then
		helpBar.Text = "SYSTEM SAFE  |  TEMP: Arrhenius rate  |  PRESSURE: gas solubility  |  pH: selectivity  |  FLOW: residence time"
		helpBar.TextColor3 = C.accent
	else
		helpBar.Text = "INTERLOCK  |  " .. safetyMessage .. "  |  Adjust the gauges before starting a batch."
		helpBar.TextColor3 = C.danger
	end

	-- Update mass balance summary
	local balance = ProcessEng.CalculateSlagMassBalance("ground", "H2SO4", processState.temperature)

	local summaryLines = {
		"MASS BALANCE (1kg slag):",
		"",
	}
	for _, step in ipairs(balance.steps) do
		table.insert(summaryLines, step.name:sub(1, 20))
		table.insert(summaryLines, string.format("  In:%.2f Out:%.2f", step.inputKg, step.outputKg))
		table.insert(summaryLines, string.format("  Eff: %.0f%%", step.efficiency))
		table.insert(summaryLines, "")
	end
	table.insert(summaryLines, string.format("RECOVERY: %.1f%%", balance.recovery))
	table.insert(summaryLines, string.format("Waste: %.3f kg", balance.wasteKg))

	-- Energy cost
	local energyKWh, energyMC = ProcessEng.CalculateEnergyCost({
		"crushing_jaw", "grinding_ball", "magnetic_sep",
		processState.temperature > 500 and "roasting" or "leaching_heat",
		"filtration", "drying"
	})
	table.insert(summaryLines, "")
	table.insert(summaryLines, string.format("Energy: %d kWh", energyKWh))
	table.insert(summaryLines, string.format("Cost: %d MC/batch", energyMC))

	summaryText.Text = table.concat(summaryLines, "\n")
end)

-- ═══════════════════════════════════════════════
-- KEYBOARD: C key toggle (handled by GUIManager)
-- ═══════════════════════════════════════════════

print("[MOLGANG] ProcessControlGui loaded — C key to open, real-time ChemEng gauges")
