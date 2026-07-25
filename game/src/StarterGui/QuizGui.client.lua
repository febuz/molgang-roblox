-- QuizGui.client.lua
-- Dedicated, modal chemistry quiz UI. ServerAnnounce remains the transport
-- so NPC and dashboard launches use exactly the same flow.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local gui = Instance.new("ScreenGui")
gui.Name = "QuizGui"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.DisplayOrder = 80
gui.Enabled = false
gui.Parent = playerGui

-- Keep the quiz card usable in the narrow embedded Studio/Wine viewport.
-- Scale the complete modal so its buttons remain inside the backdrop while
-- preserving the desktop layout at normal resolutions.
local responsiveScale = Instance.new("UIScale")
responsiveScale.Name = "ResponsiveScale"
responsiveScale.Parent = gui

local function updateQuizScale()
	local camera = workspace.CurrentCamera
	if not camera then return end
	local viewport = camera.ViewportSize
	local scale = math.min(viewport.X / 720, viewport.Y / 520)
	responsiveScale.Scale = math.clamp(scale, 0.65, 1)
end

updateQuizScale()
local cameraConnection
cameraConnection = RunService.RenderStepped:Connect(function()
	if not gui.Parent then
		cameraConnection:Disconnect()
		return
	end
	updateQuizScale()
end)

local backdrop = Instance.new("TextButton")
backdrop.Name = "Backdrop"
backdrop.Size = UDim2.fromScale(1, 1)
backdrop.BackgroundColor3 = Color3.new(0, 0, 0)
backdrop.BackgroundTransparency = 0.35
backdrop.Text = ""
backdrop.AutoButtonColor = false
backdrop.Modal = true
backdrop.Parent = gui

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.Size = UDim2.new(0, 620, 0, 430)
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.5)
panel.BackgroundColor3 = Color3.fromRGB(24, 28, 42)
panel.Parent = gui
Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 14)
local stroke = Instance.new("UIStroke", panel)
stroke.Color = Color3.fromRGB(0, 220, 140)
stroke.Thickness = 2

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -30, 0, 42)
title.Position = UDim2.new(0, 15, 0, 12)
title.BackgroundTransparency = 1
title.TextColor3 = Color3.fromRGB(0, 220, 140)
title.Font = Enum.Font.GothamBold
title.TextScaled = true
title.Parent = panel

local question = Instance.new("TextLabel")
question.Size = UDim2.new(1, -50, 0, 100)
question.Position = UDim2.new(0, 25, 0, 62)
question.BackgroundTransparency = 1
question.TextColor3 = Color3.fromRGB(245, 245, 250)
question.Font = Enum.Font.Gotham
question.TextScaled = true
question.TextWrapped = true
question.Parent = panel

local optionsFrame = Instance.new("Frame")
optionsFrame.Name = "Options"
optionsFrame.Size = UDim2.new(1, -50, 0, 210)
optionsFrame.Position = UDim2.new(0, 25, 0, 175)
optionsFrame.BackgroundTransparency = 1
optionsFrame.Parent = panel
local layout = Instance.new("UIListLayout", optionsFrame)
layout.Padding = UDim.new(0, 9)

local close = Instance.new("TextButton")
close.Size = UDim2.new(0, 110, 0, 32)
close.Position = UDim2.new(0.5, -55, 1, -42)
close.BackgroundColor3 = Color3.fromRGB(80, 86, 105)
close.Text = "Close"
close.TextColor3 = Color3.new(1, 1, 1)
close.Font = Enum.Font.GothamBold
close.TextScaled = true
close.Parent = panel
Instance.new("UICorner", close).CornerRadius = UDim.new(0, 7)

local function clearOptions()
	for _, child in ipairs(optionsFrame:GetChildren()) do
		if child:IsA("TextButton") then child:Destroy() end
	end
end

local answerLocked = false

local function showQuizExpired()
	answerLocked = true
	clearOptions()
	title.Text = "CHEMISTRY QUIZ  •  SESSION EXPIRED"
	question.Text = "De quiz is verlopen voordat alle antwoorden zijn ingestuurd.\nDruk op Close om opnieuw te beginnen."
	gui.Enabled = true
end

local function showQuiz(data)
	if type(data) ~= "table" or type(data.quizData) ~= "table" then return end
	local quiz = data.quizData
	gui.Enabled = true
	answerLocked = false
	title.Text = string.format("CHEMISTRY QUIZ  •  %d / %d", quiz.questionNum or 1, quiz.totalQuestions or 3)
	question.Text = quiz.question or "Question unavailable"
	clearOptions()
	for _, answer in ipairs(quiz.options or {}) do
		local option = Instance.new("TextButton")
		option.Size = UDim2.new(1, 0, 0, 42)
		option.BackgroundColor3 = Color3.fromRGB(45, 55, 75)
		option.TextColor3 = Color3.new(1, 1, 1)
		option.Text = tostring(answer)
		option.Font = Enum.Font.Gotham
		option.TextScaled = true
		option.TextWrapped = true
		option.Parent = optionsFrame
		Instance.new("UICorner", option).CornerRadius = UDim.new(0, 7)
		option.Activated:Connect(function()
			if answerLocked then return end
			answerLocked = true
			question.Text = "Checking answer..."
			for _, otherOption in ipairs(optionsFrame:GetChildren()) do
				if otherOption:IsA("TextButton") then
					otherOption.Active = false
					otherOption.AutoButtonColor = false
					otherOption.BackgroundColor3 = Color3.fromRGB(65, 70, 88)
				end
			end
			Remotes.RequestQuizAnswer:FireServer(quiz.questionNum, answer)
		end)
	end
end

close.Activated:Connect(function()
	Remotes.RequestQuizCancel:FireServer()
	answerLocked = false
	gui.Enabled = false
	clearOptions()
end)
backdrop.Activated:Connect(function()
	Remotes.RequestQuizCancel:FireServer()
	answerLocked = false
	gui.Enabled = false
	clearOptions()
end)

Remotes.ServerAnnounce.OnClientEvent:Connect(function(data)
	if type(data) == "table" and data.quizExpired then
		showQuizExpired()
		return
	end
	-- A world quiz pillar first announces its zone, then the server creates
	-- the authoritative question session. Dashboard launches already send
	-- RequestQuizStart directly and continue to work unchanged.
	if type(data) == "table" and type(data.quizStart) == "table" then
		Remotes.RequestQuizStart:FireServer(data.quizStart.zone or "any")
	end
	showQuiz(data)
end)
print("[QuizGui] Loaded — quiz modal ready")
