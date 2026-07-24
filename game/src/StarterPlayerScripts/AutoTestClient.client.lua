-- AutoTestClient.client.lua
-- Studio-only GUI smoke test. Server scripts cannot reliably inspect the
-- client-created PlayerGui tree, so this verifies the actual input surface.

local RunService = game:GetService("RunService")
if not RunService:IsStudio() then return end

local Players = game:GetService("Players")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

task.wait(5)

local requiredGuis = {
	"HUDWidget", "DashboardGui", "QuizGui", "SlagProcessingGui",
	"FactoryBuilderGui", "MiningGui", "ResearchGui", "InventoryGui",
	"WalletGui", "ProductMarketGui",
}

local passCount = 0
local failCount = 0

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
	local gui = playerGui:FindFirstChild(guiName)
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

local result = string.format("%d/%d passed", passCount, passCount + failCount)
player:SetAttribute("MOLGANGClientAutoTestResults", result)
player:SetAttribute("MOLGANGClientAutoTestFailures", failCount)
print("[AutoTestClient] GUI smoke result: " .. result)
