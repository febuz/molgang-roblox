--[[
	TooltipSystem.lua
	MOLGANG — Hover Tooltip System (#69)

	Provides tooltip functionality for any GUI button.
	Usage: TooltipSystem.AddTooltip(button, "Tooltip text")
]]

local TooltipSystem = {}

local Players = game:GetService("Players")
local player = Players.LocalPlayer

-- The module is also included in the server-side invariant sweep. It is a
-- client GUI helper, so loading it on the server must be harmless.
if not player then
	function TooltipSystem.AddTooltip() end
	function TooltipSystem.AddBatch() end
	return TooltipSystem
end

local playerGui = player:WaitForChild("PlayerGui")

-- Shared tooltip GUI
local tooltipGui = Instance.new("ScreenGui")
tooltipGui.Name = "TooltipGui"
tooltipGui.DisplayOrder = 100
tooltipGui.ResetOnSpawn = false
tooltipGui.Parent = playerGui

local tooltipFrame = Instance.new("Frame")
tooltipFrame.Name = "Tooltip"
tooltipFrame.Size = UDim2.new(0, 200, 0, 30)
tooltipFrame.BackgroundColor3 = Color3.fromRGB(20, 22, 35)
tooltipFrame.BackgroundTransparency = 0.1
tooltipFrame.Visible = false
tooltipFrame.ZIndex = 100
tooltipFrame.Parent = tooltipGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 6)
corner.Parent = tooltipFrame

local tooltipLabel = Instance.new("TextLabel")
tooltipLabel.Size = UDim2.new(1, -10, 1, -4)
tooltipLabel.Position = UDim2.new(0, 5, 0, 2)
tooltipLabel.BackgroundTransparency = 1
tooltipLabel.TextColor3 = Color3.fromRGB(220, 225, 240)
tooltipLabel.TextScaled = true
tooltipLabel.Font = Enum.Font.Gotham
tooltipLabel.TextWrapped = true
tooltipLabel.ZIndex = 101
tooltipLabel.Parent = tooltipFrame

-- Add tooltip to a button
function TooltipSystem.AddTooltip(button, text)
	if not button or not button:IsA("GuiObject") then return end

	button.MouseEnter:Connect(function()
		tooltipLabel.Text = text
		-- Size to fit text
		local textLen = #text
		tooltipFrame.Size = UDim2.new(0, math.min(300, textLen * 7 + 20), 0, 28)
		tooltipFrame.Visible = true
	end)

	button.MouseMoved:Connect(function(x, y)
		tooltipFrame.Position = UDim2.fromOffset(x + 10, y + 15)
	end)

	button.MouseLeave:Connect(function()
		tooltipFrame.Visible = false
	end)
end

-- Batch add tooltips from a table {button = tooltipText}
function TooltipSystem.AddBatch(tooltips)
	for button, text in pairs(tooltips) do
		TooltipSystem.AddTooltip(button, text)
	end
end

return TooltipSystem
