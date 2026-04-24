--[[
	CutsceneSystem.lua
	MOLGANG — Story Cutscene / Chapter Screen System (#86)

	Displays story screens between major game milestones.
	Supports text narration, background gradients, and auto-advance.
]]

local CutsceneSystem = {}

-- Story chapters
CutsceneSystem.Chapters = {
	{
		id = "intro",
		title = "Chapter 1: The Discovery",
		scenes = {
			{
				text = "In the industrial heartlands of Velzen, the steel mills produce thousands of tons of slag every day...",
				duration = 5,
				bgColor = {20, 15, 40},
			},
			{
				text = "Most see waste. You see opportunity. Hidden within this slag: vanadium, titanium, chromium — metals worth millions.",
				duration = 6,
				bgColor = {30, 20, 50},
			},
			{
				text = "Your mission: build a chemical engineering empire from steel slag. Crush, leach, purify, and sell.",
				duration = 5,
				bgColor = {15, 25, 40},
			},
		},
		trigger = "first_login",
	},

	{
		id = "act2_factory",
		title = "Chapter 2: The Factory",
		scenes = {
			{
				text = "Your small-scale experiments proved the concept. Now it's time to go industrial.",
				duration = 5,
				bgColor = {25, 15, 10},
			},
			{
				text = "A 1000m² factory hall awaits. Jaw crushers, ball mills, leaching tanks — the tools of a process engineer.",
				duration = 6,
				bgColor = {35, 20, 15},
			},
			{
				text = "But beware: weather, energy costs, and market fluctuations will test your management skills.",
				duration = 5,
				bgColor = {20, 10, 30},
			},
		},
		trigger = "rent_factory",
	},

	{
		id = "act3_empire",
		title = "Chapter 3: The Empire",
		scenes = {
			{
				text = "From a single leaching tank to a multi-site operation. Your vanadium is in demand worldwide.",
				duration = 5,
				bgColor = {40, 30, 10},
			},
			{
				text = "Mining licenses, two-stage selective leaching, automated production lines — you've mastered the chemistry.",
				duration = 6,
				bgColor = {30, 25, 15},
			},
			{
				text = "But can you do it sustainably? The Green Champion title awaits those who balance profit with planet.",
				duration = 5,
				bgColor = {10, 30, 20},
			},
		},
		trigger = "research_complete",
	},
}

function CutsceneSystem.GetChapter(id)
	for _, chapter in ipairs(CutsceneSystem.Chapters) do
		if chapter.id == id then return chapter end
	end
	return nil
end

function CutsceneSystem.GetChapterByTrigger(trigger)
	for _, chapter in ipairs(CutsceneSystem.Chapters) do
		if chapter.trigger == trigger then return chapter end
	end
	return nil
end

-- Play a cutscene (client-side, creates GUI)
-- Call from client script: CutsceneSystem.Play(playerGui, chapter)
function CutsceneSystem.Play(playerGui, chapter)
	if not chapter or not chapter.scenes then return end

	local gui = Instance.new("ScreenGui")
	gui.Name = "CutsceneGui"
	gui.DisplayOrder = 200
	gui.IgnoreGuiInset = true
	gui.Parent = playerGui

	local bg = Instance.new("Frame")
	bg.Size = UDim2.new(1, 0, 1, 0)
	bg.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	bg.Parent = gui

	local titleLabel = Instance.new("TextLabel")
	titleLabel.Size = UDim2.new(1, 0, 0.15, 0)
	titleLabel.Position = UDim2.new(0, 0, 0.1, 0)
	titleLabel.BackgroundTransparency = 1
	titleLabel.Text = chapter.title
	titleLabel.TextColor3 = Color3.fromRGB(255, 215, 0)
	titleLabel.TextScaled = true
	titleLabel.Font = Enum.Font.GothamBold
	titleLabel.Parent = bg

	local textLabel = Instance.new("TextLabel")
	textLabel.Size = UDim2.new(0.7, 0, 0.3, 0)
	textLabel.Position = UDim2.new(0.15, 0, 0.4, 0)
	textLabel.BackgroundTransparency = 1
	textLabel.Text = ""
	textLabel.TextColor3 = Color3.fromRGB(220, 225, 240)
	textLabel.TextScaled = true
	textLabel.Font = Enum.Font.Gotham
	textLabel.TextWrapped = true
	textLabel.Parent = bg

	local skipBtn = Instance.new("TextButton")
	skipBtn.Size = UDim2.new(0.15, 0, 0, 30)
	skipBtn.Position = UDim2.new(0.425, 0, 0.85, 0)
	skipBtn.BackgroundColor3 = Color3.fromRGB(60, 60, 80)
	skipBtn.BackgroundTransparency = 0.3
	skipBtn.Text = "Skip"
	skipBtn.TextColor3 = Color3.fromRGB(180, 180, 200)
	skipBtn.TextScaled = true
	skipBtn.Font = Enum.Font.GothamBold
	skipBtn.Parent = bg

	local skipped = false
	skipBtn.MouseButton1Click:Connect(function()
		skipped = true
		gui:Destroy()
	end)

	-- Play scenes sequentially
	task.spawn(function()
		for _, scene in ipairs(chapter.scenes) do
			if skipped then break end
			-- Set background color
			if scene.bgColor then
				bg.BackgroundColor3 = Color3.fromRGB(unpack(scene.bgColor))
			end
			-- Type-writer effect
			textLabel.Text = ""
			for i = 1, #scene.text do
				if skipped then break end
				textLabel.Text = scene.text:sub(1, i)
				task.wait(0.03)
			end
			if not skipped then
				task.wait(scene.duration or 4)
			end
		end
		if not skipped and gui.Parent then
			task.wait(1)
			gui:Destroy()
		end
	end)
end

return CutsceneSystem
