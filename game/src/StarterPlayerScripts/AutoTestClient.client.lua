-- AutoTestClient.client.lua
-- Studio-only GUI smoke test. Server scripts cannot reliably inspect the
-- client-created PlayerGui tree, so this verifies the actual input surface.
-- It is opt-in: automatic button activation must never interrupt a manual
-- playtest (especially the age route selector or a live quiz question).

local RunService = game:GetService("RunService")
if not RunService:IsStudio() or game:GetAttribute("RunAutoTest") ~= true then return end

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local requiredGuis = {
	"HUDWidget", "DashboardGui", "QuizGui", "SlagProcessingGui",
	"FactoryBuilderGui", "MiningGui", "ResearchGui", "InventoryGui",
	"WalletGui", "ProductMarketGui", "MinimapGui", "QuestModal",
}

-- GUI LocalScripts start independently and Studio/Wine can spend 15–30s
-- compiling/loading them. A fixed stabilization window avoids a race where
-- the readiness loop observes PlayerGui before the scripts parent their UIs.
task.wait(15)

local visibleChildren = {}
for _, child in ipairs(playerGui:GetChildren()) do
	table.insert(visibleChildren, child.Name .. ":" .. child.ClassName)
end
print("[AutoTestClient] PlayerGui children: " .. table.concat(visibleChildren, ", "))

local passCount = 0
local failCount = 0

local function findScreenGui(name)
	for _, child in ipairs(playerGui:GetChildren()) do
		if child.Name == name and child:IsA("ScreenGui") then return child end
	end
	return nil
end

local function check(name, condition, detail)
	if condition then
		passCount = passCount + 1
		print("[AutoTestClient][PASS] " .. name)
	else
		failCount = failCount + 1
		warn("[AutoTestClient][FAIL] " .. name .. ": " .. (detail or "condition was false"))
	end
end

local function findButtonByText(root, text)
	if not root then return nil end
	for _, child in ipairs(root:GetDescendants()) do
		if child:IsA("TextButton") and child.Text == text then return child end
	end
	return nil
end

for _, guiName in ipairs(requiredGuis) do
	local gui = nil
	local guiCount = 0
	for _, child in ipairs(playerGui:GetChildren()) do
		if child.Name == guiName and child:IsA("ScreenGui") then
			guiCount = guiCount + 1
			gui = child
		end
	end
	check("GUI exists: " .. guiName, gui and gui:IsA("ScreenGui"), "missing client ScreenGui")
	check("GUI is unique: " .. guiName, guiCount == 1,
		"expected one ScreenGui, found " .. tostring(guiCount))
	if gui then
		local buttonCount = 0
		local invalidHitAreas = 0
		for _, child in ipairs(gui:GetDescendants()) do
			if child:IsA("TextButton") or child:IsA("ImageButton") then
				buttonCount = buttonCount + 1
				if child.Visible and (child.AbsoluteSize.X < 2 or child.AbsoluteSize.Y < 2) then
					invalidHitAreas = invalidHitAreas + 1
				end
			end
		end
		check("GUI has controls: " .. guiName, buttonCount > 0, "no TextButton/ImageButton descendants")
		check("GUI visible controls have hit area: " .. guiName, invalidHitAreas == 0,
			"visible button has zero-sized hit area; likely clipped or outside its layout")
	end
end

-- The navigation overlay is intentionally informational and therefore does
-- not need a TextButton. Keep its existence/compass contract separate from
-- interactive modal GUIs so the smoke test does not report a false failure.
local navigationOverlay = findScreenGui("OTAPNavigationOverlay")
check("Navigation overlay exists", navigationOverlay ~= nil,
	"OTAPNavigationOverlay is missing")
check("Navigation overlay has compass", navigationOverlay ~= nil
	and navigationOverlay:FindFirstChild("Compass", true) ~= nil,
	"zone compass is missing from the navigation overlay")

local loadingScreen = findScreenGui("LoadingScreen")
if loadingScreen then
	local playButton = loadingScreen:FindFirstChild("PlayBtn", true)
	local contentPanel = loadingScreen:FindFirstChild("ContentPanel", true)
	check("LoadingScreen survives respawn", loadingScreen.ResetOnSpawn == false,
		"intro ScreenGui would be recreated on character reset")
	check("LoadingScreen enter control exists", playButton ~= nil,
		"PlayBtn was not created")
	check("LoadingScreen content stays inside viewport", contentPanel ~= nil and contentPanel.ClipsDescendants,
		"ContentPanel must clip its responsive shortcut grid at the rounded outline")
	if contentPanel then
		local introControlCount = 0
		for _, child in ipairs(contentPanel:GetDescendants()) do
			if child:IsA("TextLabel") and child.Parent and child.Parent.Name == "ControlsFrame" then
				introControlCount = introControlCount + 1
			end
		end
		check("LoadingScreen keeps the first step simple", introControlCount <= 8,
			"intro exposes more than four basic actions")
	end
	local footer = loadingScreen:FindFirstChild("Footer", true)
	check("LoadingScreen identifies the OTAP build", footer ~= nil
		and string.find(footer.Text, "MOLGANG OTAP teststraat", 1, true) ~= nil
		and string.find(footer.Text, "v0.2", 1, true) == nil,
		"loading footer still presents the old v0.2/demo identity")
	if playButton then
		check("LoadingScreen enter control is ready", playButton.Visible and playButton.Active,
			"PlayBtn is not visible/active after the loading phase")
		if playButton.Visible and playButton.Active then
			playButton:Activate()
			task.wait(0.9)
			check("LoadingScreen enter control responds", findScreenGui("LoadingScreen") == nil,
				"PlayBtn activation did not close the intro screen")
		end
	end
	else
		print("[AutoTestClient][PASS] LoadingScreen enter control: intro gate already active")
		passCount = passCount + 1
	end

	local tutorial = findScreenGui("TutorialGui")
	if tutorial then
		local routeSelector = tutorial:FindFirstChild("PathSelector", true)
		check("Tutorial presents age-aware route selector", routeSelector ~= nil,
			"PathSelector is missing from the first-run tutorial")
		for _, routeKey in ipairs({"explorer", "scientist", "engineer"}) do
			local routeButton = routeSelector and routeSelector:FindFirstChild(routeKey .. "Path", true)
			check("Tutorial route exists: " .. routeKey,
				routeButton ~= nil and routeButton:IsA("GuiButton") and routeButton.Active,
				"age-aware route button is missing or inactive")
		end
	else
		print("[AutoTestClient][PASS] Tutorial route selector: onboarding already completed")
		passCount = passCount + 1
	end

	check("Intro session gate is retained",
		player:GetAttribute("MOLGANGIntroShown") == true
			or ReplicatedStorage:FindFirstChild("MOLGANGIntroGate") ~= nil,
		"intro gate marker disappeared after the loading screen closed")

-- Exercise the three flows that previously looked clickable but could resolve
-- a same-named LocalScript instead of the real ScreenGui. These are intentionally
-- short, non-destructive probes: opening/closing UI and sending one free hammer
-- request cannot grant currency or mutate production without valid inventory.
local hud = findScreenGui("HUDWidget")
local dashboard = findScreenGui("DashboardGui")
local dashboardButton = findButtonByText(hud, "Dash")
if dashboardButton and dashboardButton:IsA("GuiButton") then
		check("Dashboard quick action is clickable", dashboardButton.Visible and dashboardButton.Active,
			"Dash button is not visible/active")
else
		check("Dashboard quick action is clickable", false, "Dash button not found")
end

local minimap = findScreenGui("MinimapGui")
for _, stationKey in ipairs({"crush", "cone", "mill", "leach"}) do
	local marker = minimap and minimap:FindFirstChild("Station_" .. stationKey, true)
	local waypointButton = marker and marker:FindFirstChild("SetWaypoint", true)
	check("Minimap station waypoint: " .. stationKey,
		marker ~= nil and waypointButton ~= nil and waypointButton:IsA("GuiButton")
			and waypointButton.Active,
		"station marker or clickable SetWaypoint control is missing")
end

local miniGame = findScreenGui("MiniGameGui")
if miniGame then
	check("HGMS mini-game is above HUD", miniGame.DisplayOrder > (hud and hud.DisplayOrder or 0),
		"MiniGameGui DisplayOrder must exceed HUDWidget so bins receive input")
	check("HGMS mini-game uses sibling Z ordering", miniGame.ZIndexBehavior == Enum.ZIndexBehavior.Sibling,
		"MiniGameGui must use sibling ZIndex ordering for reliable modal hit testing")
	check("HGMS start prompt has a real button", miniGame:FindFirstChild("StartButton", true) ~= nil,
		"Proximity prompt must provide a clickable start path")
	check("HGMS start remote exists", ReplicatedStorage.Remotes:FindFirstChild("RequestStartMiniGame") ~= nil,
		"HGMS start button has no server remote")
	local phFrame = miniGame:FindFirstChild("PHSlider", true)
	local phButton = phFrame and phFrame:FindFirstChildWhichIsA("TextButton", true)
	check("HGMS pH controls exist", phFrame ~= nil and phButton ~= nil,
		"pH bonus round must expose an interactive control")
else
	check("HGMS mini-game is above HUD", false, "MiniGameGui not found")
	check("HGMS mini-game uses sibling Z ordering", false, "MiniGameGui not found")
	check("HGMS start prompt has a real button", false, "MiniGameGui not found")
	check("HGMS start remote exists", false, "MiniGameGui not found")
	check("HGMS pH controls exist", false, "MiniGameGui not found")
end

local wallet = findScreenGui("WalletGui")
if wallet then
	check("Wallet modal is above HUD", wallet.DisplayOrder > (hud and hud.DisplayOrder or 0),
		"WalletGui DisplayOrder must exceed HUDWidget so wallet tabs receive input")
	check("Wallet modal uses sibling Z ordering", wallet.ZIndexBehavior == Enum.ZIndexBehavior.Sibling,
		"WalletGui must use sibling ZIndex ordering for reliable modal hit testing")
else
	check("Wallet modal is above HUD", false, "WalletGui not found")
	check("Wallet modal uses sibling Z ordering", false, "WalletGui not found")
end

local recipeBook = findScreenGui("RecipeBookGui")
local recipePanel = recipeBook and recipeBook:FindFirstChild("MainPanel", true)
check("Recipe book stays inside viewport", recipePanel ~= nil and recipePanel.ClipsDescendants
	and recipePanel.Size.X.Scale > 0 and recipePanel.Size.X.Scale <= 1
	and recipePanel.Size.Y.Scale > 0 and recipePanel.Size.Y.Scale <= 1,
	"RecipeBook MainPanel must use bounded responsive scale dimensions")
local craftButton = recipeBook and recipeBook:FindFirstChild("CraftBtn", true)
local craftRemote = ReplicatedStorage.Remotes:FindFirstChild("RequestBuildMolecule")
check("Recipe crafting is wired", craftButton ~= nil and craftRemote ~= nil,
	"Recipe Book needs a CraftBtn and RequestBuildMolecule remote")

for _, guiName in ipairs({
	"InventoryGui", "LeaderboardGui", "AchievementsGui", "WalletGui",
	"SuperheroGui", "GuildGui", "FeedbackGui", "BubbleTeaGui", "AtomTradeGui",
	"QuantumRacingGui", "NPCDialogueGui", "ShortcutOverlay", "QuestModal",
}) do
	local responsiveGui = findScreenGui(guiName)
	local scale = responsiveGui and responsiveGui:FindFirstChild("ResponsiveScale")
	check(guiName .. " scales to viewport", scale ~= nil and scale:IsA("UIScale")
		and scale.Scale > 0 and scale.Scale <= 1,
		"large modal must have a bounded ResponsiveScale")
end

local slagProcessing = findScreenGui("SlagProcessingGui")
local slagScale = slagProcessing and slagProcessing:FindFirstChild("ResponsiveScale")
check("Slag processing scales to viewport", slagScale ~= nil and slagScale:IsA("UIScale")
	and slagScale.Scale > 0 and slagScale.Scale <= 1,
	"core production modal must have a bounded ResponsiveScale")

local dashboardScale = dashboard and dashboard:FindFirstChild("ResponsiveScale")
check("Dashboard scales to viewport", dashboardScale ~= nil and dashboardScale:IsA("UIScale")
	and dashboardScale.Scale > 0 and dashboardScale.Scale <= 1,
	"dashboard modal must have a bounded ResponsiveScale")

local processControl = findScreenGui("ProcessControlGui")
local processScale = processControl and processControl:FindFirstChild("ResponsiveScale")
check("Process control scales to viewport", processScale ~= nil and processScale:IsA("UIScale")
	and processScale.Scale > 0 and processScale.Scale <= 1,
	"process-control modal must have a bounded ResponsiveScale")

local mining = findScreenGui("MiningGui")
local miningScale = mining and mining:FindFirstChild("ResponsiveScale")
check("Mining scales to viewport", miningScale ~= nil and miningScale:IsA("UIScale")
	and miningScale.Scale > 0 and miningScale.Scale <= 1,
	"mining modal must have a bounded ResponsiveScale")

local fertilizer = findScreenGui("FertilizerGui")
local fertilizerScale = fertilizer and fertilizer:FindFirstChild("ResponsiveScale")
check("Fertilizer lab scales to viewport", fertilizerScale ~= nil and fertilizerScale:IsA("UIScale")
	and fertilizerScale.Scale > 0 and fertilizerScale.Scale <= 1,
	"fertilizer modal must have a bounded ResponsiveScale")

local settings = findScreenGui("SettingsGui")
local settingsScale = settings and settings:FindFirstChild("ResponsiveScale")
check("Settings scales to viewport", settingsScale ~= nil and settingsScale:IsA("UIScale")
	and settingsScale.Scale > 0 and settingsScale.Scale <= 1,
	"settings modal must have a bounded ResponsiveScale")

local productMarket = findScreenGui("ProductMarketGui")
local productMarketScale = productMarket and productMarket:FindFirstChild("ResponsiveScale")
check("Product market scales to viewport", productMarketScale ~= nil and productMarketScale:IsA("UIScale")
	and productMarketScale.Scale > 0 and productMarketScale.Scale <= 1,
	"product-market modal must have a bounded ResponsiveScale")

local marketBidding = findScreenGui("MarketBiddingGui")
local marketBiddingScale = marketBidding and marketBidding:FindFirstChild("ResponsiveScale")
check("Market bidding scales to viewport", marketBiddingScale ~= nil and marketBiddingScale:IsA("UIScale")
	and marketBiddingScale.Scale > 0 and marketBiddingScale.Scale <= 1,
	"market-bidding modal must have a bounded ResponsiveScale")
local orderBookEntry = findButtonByText(productMarket, "ORDER BOOK")
check("Product exchange opens order book", orderBookEntry ~= nil and orderBookEntry.Active
		and marketBidding ~= nil,
	"order book entry point is missing from ProductMarketGui")
local placeSell = findButtonByText(marketBidding, "PLACE SELL")
local placeSellRemote = ReplicatedStorage.Remotes:FindFirstChild("RequestPlaceSell")
local cancelSellRemote = ReplicatedStorage.Remotes:FindFirstChild("RequestCancelSell")
check("Sell orders have playable controls", placeSell ~= nil and placeSell.Active
	and placeSellRemote ~= nil and cancelSellRemote ~= nil,
	"sell order placement/cancellation is not wired")
local productSelector = marketBidding and marketBidding:FindFirstChild("ProductSelector", true)
check("Order book includes byproduct routes", productSelector ~= nil
	and findButtonByText(productSelector, "BIO ENHANCER") ~= nil
	and findButtonByText(productSelector, "AGGREGATE") ~= nil,
	"bio-enhancer or aggregate product selector is missing")

local quizStart = findButtonByText(dashboard, "Start Chemistry Quiz")
if quizStart and quizStart:IsA("GuiButton") then
	local quizRemote = ReplicatedStorage.Remotes:FindFirstChild("RequestQuizStart")
	check("Start Chemistry Quiz is wired", quizStart.Visible and quizStart.Active and quizRemote ~= nil,
		"quiz button or RequestQuizStart remote is missing")
	if quizRemote and quizStart.Visible and quizStart.Active then
		local quizGui = findScreenGui("QuizGui")
		local announceEvent = ReplicatedStorage.Remotes:FindFirstChild("ServerAnnounce")
		local gotQuestion = false
		local announceConnection = announceEvent and announceEvent.OnClientEvent:Connect(function(data)
			if type(data) == "table" and type(data.quizData) == "table" then
				gotQuestion = true
			end
		end)
		if quizGui then
			quizGui.Enabled = false
		end
		dashboard.Enabled = true
		quizStart:Activate()
		task.wait(0.8)
		if announceConnection then
			announceConnection:Disconnect()
		end
		check("Start Chemistry Quiz receives first question", gotQuestion,
			"RequestQuizStart produced no ServerAnnounce.quizData response")
		check("Start Chemistry Quiz opens quiz modal", quizGui ~= nil and quizGui.Enabled,
			"QuizGui did not become visible after the server response")
		if quizGui then
			local quizOptions = {}
			for _, child in ipairs(quizGui:GetDescendants()) do
				if child:IsA("TextButton") and child.Parent and child.Parent.Name == "Options" then
					table.insert(quizOptions, child)
				end
			end
			check("Quiz answer controls are present", #quizOptions > 0,
				"first quiz question did not create answer buttons")
		end
		if quizRemote then
			local cancelRemote = ReplicatedStorage.Remotes:FindFirstChild("RequestQuizCancel")
			if cancelRemote then
				cancelRemote:FireServer()
			end
		end
		if quizGui then
			quizGui.Enabled = false
		end
	end
else
	check("Start Chemistry Quiz is wired", false, "quiz start button not found")
end

local quizResponsive = findScreenGui("QuizGui")
local quizScale = quizResponsive and quizResponsive:FindFirstChild("ResponsiveScale")
check("Quiz modal scales to viewport", quizScale ~= nil and quizScale:IsA("UIScale")
	and quizScale.Scale > 0 and quizScale.Scale <= 1,
	"quiz modal must keep its answer controls inside narrow viewports")

local slagGui = findScreenGui("SlagProcessingGui")
if slagGui then
		slagGui.Enabled = true
		task.wait(0.15)
		local hammer = slagGui:FindFirstChild("HammerBtn", true)
		local label = slagGui:FindFirstChild("CrushLabel", true)
		if hammer and hammer:IsA("GuiButton") then
			local crushRemote = ReplicatedStorage.Remotes:FindFirstChild("RequestCrushSlag")
			check("Free Hammer is wired", hammer.Visible and hammer.Active and label ~= nil and crushRemote ~= nil,
				"HammerBtn, CrushLabel or RequestCrushSlag remote is missing")
			if crushRemote and hammer.Visible and hammer.Active then
				local gotServerResponse = false
				local progressEvent = ReplicatedStorage.Remotes:FindFirstChild("SlagCrushProgress")
				local announceEvent = ReplicatedStorage.Remotes:FindFirstChild("ServerAnnounce")
				local progressConnection = progressEvent and progressEvent.OnClientEvent:Connect(function()
					gotServerResponse = true
				end)
				local announceConnection = announceEvent and announceEvent.OnClientEvent:Connect(function()
					gotServerResponse = true
				end)
				hammer:Activate()
				task.wait(0.6)
				if progressConnection then
					progressConnection:Disconnect()
				end
				if announceConnection then
					announceConnection:Disconnect()
				end
				check("Free Hammer receives server response", gotServerResponse,
					"Hammer activation produced no SlagCrushProgress or ServerAnnounce event")
			end
		else
			check("Free Hammer responds", false, "HammerBtn not found")
		end
		slagGui.Enabled = false
else
	check("Free Hammer responds", false, "SlagProcessingGui not found")
end

-- Exercise the modal coordinator itself. This catches the regression where a
-- second menu remained enabled above the first menu and swallowed input.
local modalDashboard = findScreenGui("DashboardGui")
local modalQuiz = findScreenGui("QuizGui")
if modalDashboard and modalQuiz then
	modalDashboard.Enabled = false
	modalQuiz.Enabled = false
	task.wait(0.1)
	modalDashboard.Enabled = true
	task.wait(0.1)
	modalQuiz.Enabled = true
	task.wait(0.1)
	check("Modal menus are mutually exclusive",
		modalDashboard.Enabled == false and modalQuiz.Enabled == true,
		"Dashboard and Quiz were enabled at the same time")
	modalQuiz.Enabled = false
	local announcements = findScreenGui("GlobalAnnouncements")
	if announcements then
		announcements.Enabled = true
		modalDashboard.Enabled = true
		task.wait(0.1)
		check("Announcements remain enabled with modal open", announcements.Enabled,
			"GuiCoordinator incorrectly disabled the transient announcement layer")
		check("Announcements render above normal modals",
			announcements.DisplayOrder > modalDashboard.DisplayOrder,
			"announcement DisplayOrder must exceed DashboardGui")
		modalDashboard.Enabled = false
	end
	check("Owned overlays are not modal lane members",
		findScreenGui("CostWarning") == nil or findScreenGui("CostWarning").DisplayOrder > modalDashboard.DisplayOrder,
		"CostWarning must layer above its owner without closing it")
else
	check("Modal menus are mutually exclusive", false, "DashboardGui or QuizGui is missing")
end

-- Probe every modal lane member, not just the two menus above. This catches a
-- newly added GUI that forgot to register with GuiCoordinator and therefore
-- can remain above another menu and swallow its input.
local modalNames = {
	"DashboardGui", "PeriodicTableGui", "RecipeBookGui", "InventoryGui", "SettingsGui",
	"AchievementsGui", "LeaderboardGui", "SlagProcessingGui", "FertilizerGui",
	"FactoryBuilderGui", "ResearchGui", "AtomTradeGui", "ProductMarketGui",
	"MarketBiddingGui", "MiningGui", "ProcessControlGui", "BubbleTeaGui",
	"SuperheroGui", "QuantumRacingGui", "FeedbackGui", "MahjongGui", "GuildGui",
	"WalletGui", "NPCDialogueGui", "MiniGameGui", "QuizGui", "TutorialGui",
}
local modalGuis = {}
for _, guiName in ipairs(modalNames) do
	local modalGui = findScreenGui(guiName)
	if modalGui then
		table.insert(modalGuis, modalGui)
	end
end
for _, modalGui in ipairs(modalGuis) do
	for _, otherGui in ipairs(modalGuis) do
		otherGui.Enabled = false
	end
	modalGui.Enabled = true
	task.wait(0.05)
	local enabledCount = 0
	for _, otherGui in ipairs(modalGuis) do
		if otherGui.Enabled then
			enabledCount = enabledCount + 1
		end
	end
	check("Modal exclusivity: " .. modalGui.Name, enabledCount == 1,
		"expected one enabled modal, found " .. tostring(enabledCount))
	modalGui.Enabled = false
end

local result = string.format("%d/%d passed", passCount, passCount + failCount)
player:SetAttribute("MOLGANGClientAutoTestResults", result)
player:SetAttribute("MOLGANGClientAutoTestFailures", failCount)
print("[AutoTestClient] GUI smoke result: " .. result)
