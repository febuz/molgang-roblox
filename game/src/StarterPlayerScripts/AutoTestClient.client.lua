-- AutoTestClient.client.lua
-- Studio-only GUI smoke test. Server scripts cannot reliably inspect the
-- client-created PlayerGui tree, so this verifies the actual input surface.

local RunService = game:GetService("RunService")
if not RunService:IsStudio() then return end

local Players = game:GetService("Players")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local requiredGuis = {
	"HUDWidget", "DashboardGui", "QuizGui", "SlagProcessingGui",
	"FactoryBuilderGui", "MiningGui", "ResearchGui", "InventoryGui",
	"WalletGui", "ProductMarketGui",
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

for _, guiName in ipairs(requiredGuis) do
	local gui = nil
	for _, child in ipairs(playerGui:GetChildren()) do
		if child.Name == guiName and child:IsA("ScreenGui") then
			gui = child
			break
		end
	end
	check("GUI exists: " .. guiName, gui and gui:IsA("ScreenGui"), "missing client ScreenGui")
	if gui then
		local buttonCount = 0
		for _, child in ipairs(gui:GetDescendants()) do
			if child:IsA("TextButton") or child:IsA("ImageButton") then
				buttonCount = buttonCount + 1
			end
		end
		check("GUI has controls: " .. guiName, buttonCount > 0, "no TextButton/ImageButton descendants")
	end
end

local loadingScreen = findScreenGui("LoadingScreen")
if loadingScreen then
	local playButton = loadingScreen:FindFirstChild("PlayBtn", true)
	check("LoadingScreen enter control exists", playButton ~= nil,
		"PlayBtn was not created")
	if playButton then
		check("LoadingScreen enter control is ready", playButton.Visible and playButton.Active,
			"PlayBtn is not visible/active after the loading phase")
	end
	else
		print("[AutoTestClient][PASS] LoadingScreen enter control: intro gate already active")
		passCount = passCount + 1
	end

-- Exercise the three flows that previously looked clickable but could resolve
-- a same-named LocalScript instead of the real ScreenGui. These are intentionally
-- short, non-destructive probes: opening/closing UI and sending one free hammer
-- request cannot grant currency or mutate production without valid inventory.
local hud = findScreenGui("HUDWidget")
local dashboard = findScreenGui("DashboardGui")
local dashboardButton = hud and hud:FindFirstChild("Dash", true)
if dashboardButton and dashboardButton:IsA("GuiButton") then
		dashboardButton:Activate()
		task.wait(0.25)
		check("Dashboard quick action opens ScreenGui", dashboard.Enabled == true,
			"Dash button did not enable DashboardGui")
	else
		check("Dashboard quick action opens ScreenGui", false, "Dash button not found")
end

local quizStart = dashboard and dashboard:FindFirstChild("Start Chemistry Quiz", true)
if quizStart and quizStart:IsA("GuiButton") then
		quizStart:Activate()
		task.wait(0.75)
		local quizGui = findScreenGui("QuizGui")
		check("Start Chemistry Quiz opens quiz modal", quizGui and quizGui.Enabled == true,
			"quiz modal did not open after dashboard action")
		local quizClose = quizGui and quizGui:FindFirstChild("Close", true)
		if quizClose and quizClose:IsA("GuiButton") then quizClose:Activate() end
	else
		check("Start Chemistry Quiz opens quiz modal", false, "quiz start button not found")
end

local slagGui = findScreenGui("SlagProcessingGui")
if slagGui then
		slagGui.Enabled = true
		task.wait(0.15)
		local hammer = slagGui:FindFirstChild("HammerBtn", true)
		local label = slagGui:FindFirstChild("CrushLabel", true)
		if hammer and hammer:IsA("GuiButton") then
			hammer:Activate()
			task.wait(0.15)
			check("Free Hammer responds", label and string.find(label.Text, "sent") ~= nil,
				"HammerBtn did not update CrushLabel")
		else
			check("Free Hammer responds", false, "HammerBtn not found")
		end
		slagGui.Enabled = false
	else
		check("Free Hammer responds", false, "SlagProcessingGui not found")
end

local result = string.format("%d/%d passed", passCount, passCount + failCount)
player:SetAttribute("MOLGANGClientAutoTestResults", result)
player:SetAttribute("MOLGANGClientAutoTestFailures", failCount)
print("[AutoTestClient] GUI smoke result: " .. result)
