--[[
	TutorialGui.client.lua
	MOLGANG OTAP — Interactive Tutorial Overlay

	Guides new players through their first 5 minutes:
	1. Welcome + explain the world
	2. Walk around and find an atom
	3. Collect your first atom
	4. Open the periodic table
	5. Open the dashboard
	6. Explore the zones

	Shows as a small non-intrusive panel at bottom-center
	with animated step progression and arrow hints.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local GetPlayerData = Remotes:WaitForChild("GetPlayerData")

-- Wait for game to load
task.wait(5)

-- Returning players should not be forced through onboarding again. Read a
-- server-owned snapshot so this remains true across respawns and sessions.
local dataOk, playerData = pcall(function()
	return GetPlayerData:InvokeServer()
end)
if dataOk and type(playerData) == "table"
	and type(playerData.onboarding) == "table"
	and playerData.onboarding.completed == true then
	print("[MOLGANG] Onboarding already completed via " .. tostring(playerData.onboarding.path))
	return
end

-- ═══════════════════════════════════════════════
-- COLORS
-- ═══════════════════════════════════════════════

local COLORS = {
	panel      = Color3.fromRGB(12, 16, 28),
	panelEdge  = Color3.fromRGB(0, 180, 110),
	accent     = Color3.fromRGB(0, 220, 130),
	text       = Color3.fromRGB(230, 235, 245),
	textDim    = Color3.fromRGB(140, 150, 170),
	stepDone   = Color3.fromRGB(0, 180, 110),
	stepActive = Color3.fromRGB(255, 215, 0),
	stepTodo   = Color3.fromRGB(60, 65, 80),
	skipBtn    = Color3.fromRGB(80, 85, 100),
}

-- ═══════════════════════════════════════════════
-- TUTORIAL STEPS
-- ═══════════════════════════════════════════════

local PATHS = {
	explorer = {
		{title = "Welkom, ontdekker!", text = "Beweeg met WASD. Zoek één gloeiende bol en raak hem aan.", condition = "collect_atom"},
		{title = "Je eerste element!", text = "Goed gevonden. Druk P om te zien welk element je hebt ontdekt.", condition = "press_key", key = Enum.KeyCode.P},
		{title = "Kies je volgende stap", text = "Verken rustig verder. Met D open je later je dashboard.", condition = "auto", delay = 5},
		{title = "Klaar om te ontdekken", text = "Je kunt nu vrij rondlopen. Vraag hulp bij een NPC als je vastloopt.", condition = "auto", delay = 6, isFinal = true},
	},
	scientist = {
		{title = "Welkom, jonge onderzoeker!", text = "Verzamel drie elementen en gebruik P om de Periodieke Tabel te lezen.", condition = "collect_atoms", target = 3},
		{title = "Lees je meetresultaat", text = "Open P en vergelijk symbool, atoomnummer en zeldzaamheid.", condition = "press_key", key = Enum.KeyCode.P},
		{title = "Bouw een molecule", text = "Open R en combineer alleen de elementen die een recept vraagt.", condition = "press_key", key = Enum.KeyCode.R},
		{title = "Test je kennis", text = "Open D voor je dashboard en start daarna een quiz bij een quizpunt.", condition = "press_key", key = Enum.KeyCode.D},
		{title = "Klaar voor experimenten", text = "Probeer daarna de farm of het laboratorium. Je kunt altijd terug naar de basis.", condition = "auto", delay = 7, isFinal = true},
	},
	engineer = {
	{
		title = "Welcome to Moleculia!",
		text = "You're floating in space on an archipelago of science. Walk around with WASD and explore!",
		condition = "auto",  -- auto-completes after delay
		delay = 6,
	},
	{
		title = "Find an Atom",
		text = "Glowing orbs are floating nearby — those are atoms! Walk towards one to collect it.",
		condition = "collect_atom",
	},
	{
		title = "Element Discovered!",
		text = "You collected your first element. Press P to open the Periodic Table and see your progress.",
		condition = "press_key",
		key = Enum.KeyCode.P,
	},
	{
		title = "Check Your Dashboard",
		text = "Press D to open your Dashboard. Here you can build facilities and manage your empire.",
		condition = "press_key",
		key = Enum.KeyCode.D,
	},
	{
		title = "Collect 3 More Atoms",
		text = "Keep exploring! Collect 3 more atoms. Rarer elements glow brighter and are worth more MolCoins.",
		condition = "collect_atoms",
		target = 4,  -- total (including first)
	},
	{
		title = "Build a Molecule!",
		text = "Press R to open the Recipe Book. Combine your atoms into molecules like H2O or NaCl. Each recipe shows the required atoms and their valence!",
		condition = "press_key",
		key = Enum.KeyCode.R,
	},
	{
		title = "Process Steel Slag!",
		text = "Press S to open the Slag Processing lab. Buy raw slag, crush it, and leach metals with acids. This is real chemical engineering!",
		condition = "press_key",
		key = Enum.KeyCode.S,
	},
	{
		title = "Control Your Process",
		text = "Press C for the Process Control Panel. Adjust temperature, pressure, pH, and flow rate to optimize your leaching. Arrhenius kinetics!",
		condition = "press_key",
		key = Enum.KeyCode.C,
	},
	{
		title = "Become an Entrepreneur!",
		text = "Press G to open the Factory Builder. Rent a 1000m² indoor factory and place equipment on a grid. Build your chemical empire!",
		condition = "auto",
		delay = 8,
	},
	{
		title = "You're Ready!",
		text = "Explore all 19 features! Mine vanadium (V), sell products (X), research tech (T), farm fertilizer (F), and build your empire. Good luck, chemical engineer!",
		condition = "auto",
		delay = 10,
		isFinal = true,
	},
	},
}

local STEPS = PATHS.explorer

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

local currentStep = 1
local atomsCollected = 0
local tutorialComplete = false
local selectedPath = "explorer"

local function persistOnboardingComplete()
	if tutorialComplete then return end
	tutorialComplete = true
	local completeRemote = Remotes:FindFirstChild("RequestCompleteOnboarding")
	if completeRemote then
		completeRemote:FireServer(selectedPath)
	end
end

-- ═══════════════════════════════════════════════
-- GUI SETUP
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "TutorialGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 50
screenGui.Parent = playerGui

-- Tutorial panel at bottom-center
local panel = Instance.new("Frame")
panel.Name = "TutorialPanel"
panel.Size = UDim2.new(0, 500, 0, 100)
panel.Position = UDim2.new(0.5, -250, 1, -120)
panel.BackgroundColor3 = COLORS.panel
panel.BackgroundTransparency = 0.1
panel.BorderSizePixel = 0
panel.Parent = screenGui

local panelCorner = Instance.new("UICorner")
panelCorner.CornerRadius = UDim.new(0, 12)
panelCorner.Parent = panel

local panelStroke = Instance.new("UIStroke")
panelStroke.Color = COLORS.panelEdge
panelStroke.Thickness = 1.5
panelStroke.Transparency = 0.3
panelStroke.Parent = panel

-- Step indicator dots (top of panel)
local dotsFrame = Instance.new("Frame")
dotsFrame.Size = UDim2.new(1, 0, 0, 10)
dotsFrame.Position = UDim2.new(0, 0, 0, 6)
dotsFrame.BackgroundTransparency = 1
dotsFrame.Parent = panel

local dotsLayout = Instance.new("UIListLayout")
dotsLayout.FillDirection = Enum.FillDirection.Horizontal
dotsLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
dotsLayout.Padding = UDim.new(0, 8)
dotsLayout.Parent = dotsFrame

local dots = {}
local maxStepCount = 0
for _, pathSteps in pairs(PATHS) do
	maxStepCount = math.max(maxStepCount, #pathSteps)
end
for i = 1, maxStepCount do
	local dot = Instance.new("Frame")
	dot.Name = "Dot_" .. i
	dot.Size = UDim2.fromOffset(8, 8)
	dot.BackgroundColor3 = COLORS.stepTodo
	dot.Parent = dotsFrame
	local dotCorner = Instance.new("UICorner")
	dotCorner.CornerRadius = UDim.new(1, 0)
	dotCorner.Parent = dot
	dots[i] = dot
end

-- Step number label
local stepLabel = Instance.new("TextLabel")
stepLabel.Name = "StepLabel"
stepLabel.Size = UDim2.fromOffset(60, 20)
stepLabel.Position = UDim2.new(0, 12, 0, 20)
stepLabel.BackgroundTransparency = 1
stepLabel.Text = "1/" .. #STEPS
stepLabel.TextColor3 = COLORS.textDim
stepLabel.TextScaled = true
stepLabel.Font = Enum.Font.Gotham
stepLabel.TextXAlignment = Enum.TextXAlignment.Left
stepLabel.Parent = panel

-- Title
local titleLabel = Instance.new("TextLabel")
titleLabel.Name = "Title"
titleLabel.Size = UDim2.new(1, -140, 0, 24)
titleLabel.Position = UDim2.new(0, 12, 0, 22)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = ""
titleLabel.TextColor3 = COLORS.accent
titleLabel.TextScaled = true
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = panel

-- Description
local descLabel = Instance.new("TextLabel")
descLabel.Name = "Description"
descLabel.Size = UDim2.new(1, -24, 0, 40)
descLabel.Position = UDim2.new(0, 12, 0, 50)
descLabel.BackgroundTransparency = 1
descLabel.Text = ""
descLabel.TextColor3 = COLORS.text
descLabel.TextScaled = true
descLabel.Font = Enum.Font.Gotham
descLabel.TextWrapped = true
descLabel.TextXAlignment = Enum.TextXAlignment.Left
descLabel.TextYAlignment = Enum.TextYAlignment.Top
descLabel.Parent = panel

-- Skip button
local skipBtn = Instance.new("TextButton")
skipBtn.Name = "SkipBtn"
skipBtn.Size = UDim2.fromOffset(70, 24)
skipBtn.Position = UDim2.new(1, -82, 0, 20)
skipBtn.BackgroundColor3 = COLORS.skipBtn
skipBtn.BackgroundTransparency = 0.5
skipBtn.TextColor3 = COLORS.textDim
skipBtn.Text = "Skip"
skipBtn.Font = Enum.Font.Gotham
skipBtn.TextScaled = true
skipBtn.Parent = panel
local skipCorner = Instance.new("UICorner")
skipCorner.CornerRadius = UDim.new(0, 6)
skipCorner.Parent = skipBtn

-- First-run route selector: keep the opening small and age/experience aware.
-- Exact age is never requested; players choose the amount of guidance they want.
local pathSelector = Instance.new("Frame")
pathSelector.Name = "PathSelector"
pathSelector.Size = UDim2.fromOffset(560, 290)
pathSelector.AnchorPoint = Vector2.new(0.5, 0.5)
pathSelector.Position = UDim2.fromScale(0.5, 0.5)
pathSelector.BackgroundColor3 = COLORS.panel
pathSelector.Parent = screenGui
local selectorCorner = Instance.new("UICorner")
selectorCorner.CornerRadius = UDim.new(0, 14)
selectorCorner.Parent = pathSelector
local selectorStroke = Instance.new("UIStroke")
selectorStroke.Color = COLORS.panelEdge
selectorStroke.Thickness = 2
selectorStroke.Parent = pathSelector

local selectorTitle = Instance.new("TextLabel")
selectorTitle.Size = UDim2.new(1, -32, 0, 38)
selectorTitle.Position = UDim2.fromOffset(16, 16)
selectorTitle.BackgroundTransparency = 1
selectorTitle.Text = "Hoe wil je Moleculia ontdekken?"
selectorTitle.TextColor3 = COLORS.accent
selectorTitle.TextScaled = true
selectorTitle.Font = Enum.Font.GothamBold
selectorTitle.Parent = pathSelector

local selectorHint = Instance.new("TextLabel")
selectorHint.Size = UDim2.new(1, -32, 0, 28)
selectorHint.Position = UDim2.fromOffset(16, 55)
selectorHint.BackgroundTransparency = 1
selectorHint.Text = "Kies een route; je kunt later alles spelen."
selectorHint.TextColor3 = COLORS.textDim
selectorHint.TextScaled = true
selectorHint.Font = Enum.Font.Gotham
selectorHint.Parent = pathSelector

local pathOptions = {
	{key = "explorer", title = "Ontdekker", age = "±8–11 jaar", text = "Korte stappen, bewegen en verzamelen."},
	{key = "scientist", title = "Jonge onderzoeker", age = "±12–15 jaar", text = "Elementen, recepten en eenvoudige quiz."},
	{key = "engineer", title = "Ingenieur", age = "±16+ jaar", text = "Direct naar chemie, fabriek en processturing."},
}
local showStep
for index, option in ipairs(pathOptions) do
	local button = Instance.new("TextButton")
	button.Name = option.key .. "Path"
	button.Size = UDim2.new(1, -32, 0, 50)
	button.Position = UDim2.fromOffset(16, 88 + (index - 1) * 58)
	button.BackgroundColor3 = index == 1 and COLORS.accent or Color3.fromRGB(35, 48, 65)
	button.TextColor3 = index == 1 and Color3.fromRGB(8, 20, 24) or COLORS.text
	button.Text = option.title .. "  ·  " .. option.age .. "\n" .. option.text
	button.TextScaled = true
	button.TextWrapped = true
	button.Font = Enum.Font.GothamBold
	button.Parent = pathSelector
	local optionCorner = Instance.new("UICorner")
	optionCorner.CornerRadius = UDim.new(0, 8)
	optionCorner.Parent = button
	button.Activated:Connect(function()
		selectedPath = option.key
		STEPS = PATHS[selectedPath]
		currentStep = 1
		pathSelector.Visible = false
		panel.Visible = true
		showStep(1)
		TweenService:Create(panel, TweenInfo.new(0.6, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
			Position = UDim2.new(0.5, -250, 1, -120),
		}):Play()
	end)
end

-- ═══════════════════════════════════════════════
-- TUTORIAL LOGIC
-- ═══════════════════════════════════════════════

local function updateDots()
	for i, dot in ipairs(dots) do
		if i < currentStep then
			TweenService:Create(dot, TweenInfo.new(0.3), {BackgroundColor3 = COLORS.stepDone}):Play()
		elseif i == currentStep then
			TweenService:Create(dot, TweenInfo.new(0.3), {BackgroundColor3 = COLORS.stepActive}):Play()
		else
			dot.BackgroundColor3 = COLORS.stepTodo
		end
	end
end

showStep = function(stepIdx)
	if stepIdx > #STEPS then
		-- Tutorial complete — slide out and destroy
		persistOnboardingComplete()
		TweenService:Create(panel, TweenInfo.new(0.5, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			Position = UDim2.new(0.5, -250, 1, 20),
		}):Play()
		task.delay(0.6, function()
			screenGui:Destroy()
		end)
		return
	end

	local step = STEPS[stepIdx]
	currentStep = stepIdx

	-- Animate text change
	TweenService:Create(titleLabel, TweenInfo.new(0.15), {TextTransparency = 1}):Play()
	TweenService:Create(descLabel, TweenInfo.new(0.15), {TextTransparency = 1}):Play()

	task.delay(0.15, function()
		stepLabel.Text = stepIdx .. "/" .. #STEPS
		titleLabel.Text = step.title
		descLabel.Text = step.text
		TweenService:Create(titleLabel, TweenInfo.new(0.3), {TextTransparency = 0}):Play()
		TweenService:Create(descLabel, TweenInfo.new(0.3), {TextTransparency = 0}):Play()
	end)

	updateDots()

	-- Handle auto-complete steps
	if step.condition == "auto" then
		task.delay(step.delay or 5, function()
			if currentStep == stepIdx and not tutorialComplete then
				showStep(stepIdx + 1)
			end
		end)
	end
end

local function advanceStep()
	if tutorialComplete then return end
	showStep(currentStep + 1)
end

-- ═══════════════════════════════════════════════
-- EVENT LISTENERS
-- ═══════════════════════════════════════════════

-- Listen for atom collection
local atomCollectedEvent = Remotes:FindFirstChild("AtomCollected")
if atomCollectedEvent then
	atomCollectedEvent.OnClientEvent:Connect(function(data)
		atomsCollected = atomsCollected + 1
		local step = STEPS[currentStep]
		if step and not tutorialComplete then
			if step.condition == "collect_atom"
				or (step.condition == "collect_atoms" and atomsCollected >= (step.target or 1)) then
				advanceStep()
			end
		end
	end)
end

-- Listen for key presses (for tutorial steps)
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if tutorialComplete then return end

	local step = STEPS[currentStep]
	if step and step.condition == "press_key" and input.KeyCode == step.key then
		task.delay(0.5, function()
			if currentStep <= #STEPS and STEPS[currentStep].condition == "press_key" then
				advanceStep()
			end
		end)
	end
end)

-- Skip button
skipBtn.Activated:Connect(function()
	persistOnboardingComplete()
	TweenService:Create(panel, TweenInfo.new(0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
		Position = UDim2.new(0.5, -250, 1, 20),
		BackgroundTransparency = 1,
	}):Play()
	TweenService:Create(panelStroke, TweenInfo.new(0.4), {Transparency = 1}):Play()
	TweenService:Create(titleLabel, TweenInfo.new(0.3), {TextTransparency = 1}):Play()
	TweenService:Create(descLabel, TweenInfo.new(0.3), {TextTransparency = 1}):Play()
	TweenService:Create(stepLabel, TweenInfo.new(0.3), {TextTransparency = 1}):Play()
	TweenService:Create(skipBtn, TweenInfo.new(0.3), {TextTransparency = 1, BackgroundTransparency = 1}):Play()
	task.delay(0.5, function()
		screenGui:Destroy()
	end)
end)

-- ═══════════════════════════════════════════════
-- START TUTORIAL (slide in from bottom)
-- ═══════════════════════════════════════════════

panel.Position = UDim2.new(0.5, -250, 1, 20) -- start off-screen

-- Wait for the player to choose a route before showing any controls.
panel.Visible = false
pathSelector.Visible = true

print("[MOLGANG] Tutorial system initialized — age-aware route selector")
