-- ButtonStyleCoordinator.client.lua
-- One visual contract for every TextButton, including buttons created later by
-- dynamic menus. This keeps the game readable without changing each GUI's
-- functional code or its semantic accent colors.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")
local styled = {}

local function luminance(color)
	return color.R * 0.2126 + color.G * 0.7152 + color.B * 0.0722
end

local function strongerColor(color)
	local h, s, v = color:ToHSV()
	-- Neutral grey controls read as washed out; give them the MOLGANG blue tone.
	if s < 0.18 and v > 0.18 and v < 0.8 then
		return Color3.fromRGB(48, 62, 92)
	end
	return color
end

local function styleButton(button)
	if styled[button] then return end
	styled[button] = true

	local baseColor = strongerColor(button.BackgroundColor3)
	button.BackgroundColor3 = baseColor
	button.BackgroundTransparency = math.min(button.BackgroundTransparency, 0.08)
	button.BorderSizePixel = 0
	button.AutoButtonColor = false
	button.TextStrokeTransparency = 0.82
	button.TextStrokeColor3 = Color3.new(0, 0, 0)
	button.TextColor3 = luminance(baseColor) > 0.52 and Color3.fromRGB(8, 12, 18) or Color3.fromRGB(248, 250, 255)

	local stroke = button:FindFirstChild("ContrastStroke")
	if not stroke then
		stroke = Instance.new("UIStroke")
		stroke.Name = "ContrastStroke"
		stroke.Thickness = 1
		stroke.Transparency = 0.38
		stroke.Color = luminance(baseColor) > 0.52 and Color3.fromRGB(255, 255, 255) or Color3.fromRGB(120, 220, 255)
		stroke.Parent = button
	end

	button.MouseEnter:Connect(function()
		TweenService:Create(button, TweenInfo.new(0.12), {
			BackgroundColor3 = baseColor:Lerp(Color3.new(1, 1, 1), 0.14),
			BackgroundTransparency = 0,
		}):Play()
		TweenService:Create(stroke, TweenInfo.new(0.12), {Transparency = 0}):Play()
	end)
	button.MouseLeave:Connect(function()
		TweenService:Create(button, TweenInfo.new(0.16), {
			BackgroundColor3 = baseColor,
			BackgroundTransparency = 0.08,
		}):Play()
		TweenService:Create(stroke, TweenInfo.new(0.16), {Transparency = 0.38}):Play()
	end)
	button.MouseButton1Down:Connect(function()
		TweenService:Create(button, TweenInfo.new(0.06), {
			BackgroundColor3 = baseColor:Lerp(Color3.new(0, 0, 0), 0.12),
		}):Play()
	end)
	button.MouseButton1Up:Connect(function()
		if button:IsDescendantOf(playerGui) then
			TweenService:Create(button, TweenInfo.new(0.08), {BackgroundColor3 = baseColor}):Play()
		end
	end)
end

local function inspect(root)
	if root:IsA("TextButton") then styleButton(root) end
	for _, descendant in ipairs(root:GetDescendants()) do
		if descendant:IsA("TextButton") then styleButton(descendant) end
	end
end

inspect(playerGui)
playerGui.DescendantAdded:Connect(function(descendant)
	if descendant:IsA("TextButton") then styleButton(descendant) end
end)

print("[ButtonStyleCoordinator] High-contrast button styling enabled")
