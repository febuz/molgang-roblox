--[[
	FeedbackGui.client.lua
	MOLGANG — In-Game Feedback & Rating System

	Players can:
	- Rate each game system (1-5 stars)
	- Report bugs with system context
	- Submit feature requests
	- Write free-text comments

	Opens via ? key or periodic prompt after 10 minutes.
	Feedback stored in DataStore for developer review.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local C = {
	bg = Color3.fromRGB(12, 10, 16),
	panel = Color3.fromRGB(22, 20, 30),
	accent = Color3.fromRGB(100, 180, 255),
	gold = Color3.fromRGB(255, 215, 0),
	star = Color3.fromRGB(255, 200, 50),
	starEmpty = Color3.fromRGB(60, 55, 50),
	text = Color3.fromRGB(225, 230, 240),
	textDim = Color3.fromRGB(120, 125, 140),
	green = Color3.fromRGB(0, 200, 120),
	red = Color3.fromRGB(200, 60, 60),
}

local function corner(p, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = p end

-- ═══════════════════════════════════════════════
-- SCREEN GUI
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "FeedbackGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.DisplayOrder = 90
screenGui.Enabled = false
screenGui.Parent = playerGui

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 500, 0, 520)
main.Position = UDim2.new(0.5, -250, 0.5, -260)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.02
main.Parent = screenGui
corner(main, 14)
local ms = Instance.new("UIStroke"); ms.Color = C.accent; ms.Thickness = 2; ms.Parent = main

-- Title
local titleL = Instance.new("TextLabel")
titleL.Size = UDim2.new(1, 0, 0, 40)
titleL.BackgroundColor3 = C.panel
titleL.Text = "  FEEDBACK — Help Us Improve MOLGANG!"
titleL.TextColor3 = C.accent
titleL.TextScaled = true; titleL.Font = Enum.Font.GothamBold
titleL.TextXAlignment = Enum.TextXAlignment.Left
titleL.Parent = main
corner(titleL, 14)

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(28, 28); closeBtn.Position = UDim2.new(1, -36, 0, 6)
closeBtn.BackgroundColor3 = C.red; closeBtn.Text = "X"; closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold; closeBtn.TextScaled = true
closeBtn.Parent = main; corner(closeBtn, 6)
closeBtn.Activated:Connect(function() screenGui.Enabled = false end)

-- Feedback type selector
local typeFrame = Instance.new("Frame")
typeFrame.Size = UDim2.new(1, -16, 0, 30)
typeFrame.Position = UDim2.new(0, 8, 0, 46)
typeFrame.BackgroundTransparency = 1
typeFrame.Parent = main
local tLayout = Instance.new("UIListLayout")
tLayout.FillDirection = Enum.FillDirection.Horizontal
tLayout.Padding = UDim.new(0, 4)
tLayout.Parent = typeFrame

local feedbackType = "rating"
local typeButtons = {}
for _, t in ipairs({"rating", "bug", "feature", "comment"}) do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(0, 110, 0, 28)
	btn.BackgroundColor3 = t == "rating" and C.accent or Color3.fromRGB(40, 40, 50)
	btn.Text = t:upper(); btn.TextColor3 = C.text
	btn.Font = Enum.Font.GothamBold; btn.TextScaled = true
	btn.Parent = typeFrame; corner(btn, 6)
	typeButtons[t] = btn
	btn.Activated:Connect(function()
		feedbackType = t
		for k, b in pairs(typeButtons) do
			b.BackgroundColor3 = k == t and C.accent or Color3.fromRGB(40, 40, 50)
		end
	end)
end

-- System selector
local systemLabel = Instance.new("TextLabel")
systemLabel.Size = UDim2.new(1, -16, 0, 18)
systemLabel.Position = UDim2.new(0, 8, 0, 82)
systemLabel.BackgroundTransparency = 1
systemLabel.Text = "Which system? (click to select)"
systemLabel.TextColor3 = C.textDim; systemLabel.TextScaled = true
systemLabel.Font = Enum.Font.Gotham; systemLabel.TextXAlignment = Enum.TextXAlignment.Left
systemLabel.Parent = main

local systemFrame = Instance.new("Frame")
systemFrame.Size = UDim2.new(1, -16, 0, 60)
systemFrame.Position = UDim2.new(0, 8, 0, 100)
systemFrame.BackgroundTransparency = 1
systemFrame.Parent = main
local sLayout = Instance.new("UIGridLayout")
sLayout.CellSize = UDim2.new(0, 90, 0, 26)
sLayout.CellPadding = UDim2.new(0, 4, 0, 4)
sLayout.Parent = systemFrame

local selectedSystem = "Overall"
local systems = {"Overall", "Slag", "Fertilizer", "Factory", "Mining", "Mahjong", "Weather", "VR/AR", "Tutorial", "Economy"}
local systemButtons = {}
for _, sys in ipairs(systems) do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(0, 90, 0, 26)
	btn.BackgroundColor3 = sys == "Overall" and C.accent or Color3.fromRGB(35, 35, 45)
	btn.Text = sys; btn.TextColor3 = C.text
	btn.Font = Enum.Font.Gotham; btn.TextScaled = true
	btn.Parent = systemFrame; corner(btn, 4)
	systemButtons[sys] = btn
	btn.Activated:Connect(function()
		selectedSystem = sys
		for k, b in pairs(systemButtons) do
			b.BackgroundColor3 = k == sys and C.accent or Color3.fromRGB(35, 35, 45)
		end
	end)
end

-- Star rating (1-5)
local ratingLabel = Instance.new("TextLabel")
ratingLabel.Size = UDim2.new(1, -16, 0, 18)
ratingLabel.Position = UDim2.new(0, 8, 0, 168)
ratingLabel.BackgroundTransparency = 1
ratingLabel.Text = "Rating: (click stars)"
ratingLabel.TextColor3 = C.textDim; ratingLabel.TextScaled = true
ratingLabel.Font = Enum.Font.Gotham; ratingLabel.TextXAlignment = Enum.TextXAlignment.Left
ratingLabel.Parent = main

local starFrame = Instance.new("Frame")
starFrame.Size = UDim2.new(0, 200, 0, 36)
starFrame.Position = UDim2.new(0, 8, 0, 188)
starFrame.BackgroundTransparency = 1
starFrame.Parent = main

local selectedRating = 0
local starButtons = {}
for i = 1, 5 do
	local star = Instance.new("TextButton")
	star.Size = UDim2.fromOffset(36, 36)
	star.Position = UDim2.fromOffset((i - 1) * 40, 0)
	star.BackgroundColor3 = C.starEmpty
	star.Text = "★"; star.TextColor3 = C.starEmpty
	star.Font = Enum.Font.GothamBold; star.TextScaled = true
	star.Parent = starFrame; corner(star, 4)
	starButtons[i] = star

	star.Activated:Connect(function()
		selectedRating = i
		for j = 1, 5 do
			starButtons[j].BackgroundColor3 = j <= i and C.star or C.starEmpty
			starButtons[j].TextColor3 = j <= i and Color3.fromRGB(40, 30, 10) or C.starEmpty
		end
		ratingLabel.Text = "Rating: " .. i .. "/5 " .. ({"Poor", "Fair", "Good", "Great", "Excellent"})[i]
	end)
end

-- Comment text box
local commentLabel = Instance.new("TextLabel")
commentLabel.Size = UDim2.new(1, -16, 0, 18)
commentLabel.Position = UDim2.new(0, 8, 0, 232)
commentLabel.BackgroundTransparency = 1
commentLabel.Text = "Your feedback (optional):"
commentLabel.TextColor3 = C.textDim; commentLabel.TextScaled = true
commentLabel.Font = Enum.Font.Gotham; commentLabel.TextXAlignment = Enum.TextXAlignment.Left
commentLabel.Parent = main

local commentBox = Instance.new("TextBox")
commentBox.Size = UDim2.new(1, -16, 0, 120)
commentBox.Position = UDim2.new(0, 8, 0, 252)
commentBox.BackgroundColor3 = Color3.fromRGB(25, 25, 35)
commentBox.TextColor3 = C.text
commentBox.PlaceholderText = "Describe the issue or suggestion..."
commentBox.PlaceholderColor3 = C.textDim
commentBox.Text = ""
commentBox.TextScaled = true; commentBox.Font = Enum.Font.Gotham
commentBox.TextXAlignment = Enum.TextXAlignment.Left
commentBox.TextYAlignment = Enum.TextYAlignment.Top
commentBox.TextWrapped = true
commentBox.ClearTextOnFocus = false
commentBox.MultiLine = true
commentBox.Parent = main
corner(commentBox, 8)

-- Severity selector (for bugs)
local severityFrame = Instance.new("Frame")
severityFrame.Size = UDim2.new(1, -16, 0, 28)
severityFrame.Position = UDim2.new(0, 8, 0, 380)
severityFrame.BackgroundTransparency = 1
severityFrame.Parent = main

local severityLabel = Instance.new("TextLabel")
severityLabel.Size = UDim2.new(0.2, 0, 1, 0)
severityLabel.BackgroundTransparency = 1
severityLabel.Text = "Severity:"
severityLabel.TextColor3 = C.textDim; severityLabel.TextScaled = true
severityLabel.Font = Enum.Font.Gotham; severityLabel.TextXAlignment = Enum.TextXAlignment.Left
severityLabel.Parent = severityFrame

local selectedSeverity = "normal"
local sevColors = {low = C.green, normal = C.accent, high = C.gold, critical = C.red}
for i, sev in ipairs({"low", "normal", "high", "critical"}) do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(0, 70, 0, 24)
	btn.Position = UDim2.new(0.2 + (i-1) * 0.19, 0, 0, 2)
	btn.BackgroundColor3 = sev == "normal" and sevColors[sev] or Color3.fromRGB(35, 35, 45)
	btn.Text = sev:upper(); btn.TextColor3 = C.text
	btn.Font = Enum.Font.Gotham; btn.TextScaled = true
	btn.Parent = severityFrame; corner(btn, 4)
	btn.Activated:Connect(function()
		selectedSeverity = sev
		for _, child in severityFrame:GetChildren() do
			if child:IsA("TextButton") then
				child.BackgroundColor3 = child.Text:lower() == sev and sevColors[sev] or Color3.fromRGB(35, 35, 45)
			end
		end
	end)
end

-- Submit button
local submitBtn = Instance.new("TextButton")
submitBtn.Size = UDim2.new(0.6, 0, 0, 40)
submitBtn.Position = UDim2.new(0.2, 0, 0, 420)
submitBtn.BackgroundColor3 = C.green
submitBtn.Text = "SUBMIT FEEDBACK"
submitBtn.TextColor3 = Color3.new(0, 0, 0)
submitBtn.Font = Enum.Font.GothamBold; submitBtn.TextScaled = true
submitBtn.Parent = main; corner(submitBtn, 8)

submitBtn.Activated:Connect(function()
	local r = Remotes:FindFirstChild("RequestSubmitFeedback")
	if r then
		r:FireServer({
			type = feedbackType,
			system = selectedSystem,
			rating = selectedRating > 0 and selectedRating or nil,
			message = commentBox.Text,
			severity = selectedSeverity,
		})
	end
	-- Visual confirmation
	submitBtn.Text = "SUBMITTED!"
	submitBtn.BackgroundColor3 = C.gold
	task.delay(2, function()
		submitBtn.Text = "SUBMIT FEEDBACK"
		submitBtn.BackgroundColor3 = C.green
		commentBox.Text = ""
		selectedRating = 0
		for i = 1, 5 do
			starButtons[i].BackgroundColor3 = C.starEmpty
			starButtons[i].TextColor3 = C.starEmpty
		end
		ratingLabel.Text = "Rating: (click stars)"
	end)
end)

-- Remaining feedback counter
local counterLabel = Instance.new("TextLabel")
counterLabel.Size = UDim2.new(1, -16, 0, 16)
counterLabel.Position = UDim2.new(0, 8, 0, 465)
counterLabel.BackgroundTransparency = 1
counterLabel.Text = "10 feedback submissions remaining"
counterLabel.TextColor3 = C.textDim; counterLabel.TextScaled = true
counterLabel.Font = Enum.Font.Gotham
counterLabel.Parent = main

local feedbackEvent = Remotes:FindFirstChild("FeedbackSubmitted")
if feedbackEvent then
	feedbackEvent.OnClientEvent:Connect(function(data)
		counterLabel.Text = (data.max - data.count) .. " feedback submissions remaining"
	end)
end

-- Rating request popup (from server after 10 min)
local ratingEvent = Remotes:FindFirstChild("RequestRating")
if ratingEvent then
	ratingEvent.OnClientEvent:Connect(function(data)
		screenGui.Enabled = true
		feedbackType = "rating"
		for k, b in pairs(typeButtons) do
			b.BackgroundColor3 = k == "rating" and C.accent or Color3.fromRGB(40, 40, 50)
		end
	end)
end

-- ? key to open (Shift+/ = ?)
-- Actually use period key for feedback since / is settings
UserInputService.InputBegan:Connect(function(input, gp)
	if gp then return end
	if input.KeyCode == Enum.KeyCode.Period then
		screenGui.Enabled = not screenGui.Enabled
	end
end)

print("[MOLGANG] FeedbackGui loaded — press . (period) to submit feedback")
