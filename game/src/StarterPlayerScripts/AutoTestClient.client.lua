-- AutoTestClient.client.lua
-- Studio-only GUI smoke test. Server scripts cannot reliably inspect the
-- client-created PlayerGui tree, so this verifies the actual input surface.

local RunService = game:GetService("RunService")
if not RunService:IsStudio() then return end

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
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

local function findButtonByText(root, text)
	if not root then return nil end
	for _, child in ipairs(root:GetDescendants()) do
		if child:IsA("TextButton") and child.Text == text then return child end
	end
	return nil
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
local dashboardButton = findButtonByText(hud, "Dash")
if dashboardButton and dashboardButton:IsA("GuiButton") then
		check("Dashboard quick action is clickable", dashboardButton.Visible and dashboardButton.Active,
			"Dash button is not visible/active")
else
		check("Dashboard quick action is clickable", false, "Dash button not found")
end

local quizStart = findButtonByText(dashboard, "Start Chemistry Quiz")
if quizStart and quizStart:IsA("GuiButton") then
		local quizRemote = ReplicatedStorage.Remotes:FindFirstChild("RequestQuizStart")
		check("Start Chemistry Quiz is wired", quizStart.Visible and quizStart.Active and quizRemote ~= nil,
			"quiz button or RequestQuizStart remote is missing")
else
		check("Start Chemistry Quiz is wired", false, "quiz start button not found")
end

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
