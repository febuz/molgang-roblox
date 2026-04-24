--[[
	ResearchGui.client.lua
	MOLGANG — Technology Research Tree Interface

	5-branch tech tree with prerequisite chains:
	- Crushing: manual → jaw → cone → ball mill
	- Hydrometallurgy: water → acids → strong acids → fast leach → two-stage
	- Optimization: mag sep → roasting → precipitation → filtration
	- Environmental: fume hood → water treatment → ICP-OES → certification
	- Automation: conveyors → power → XRF → large reactors

	Key: T to toggle
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local ResearchTree = require(ReplicatedStorage.Modules.ResearchTree)
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local C = {
	bg = Color3.fromRGB(8, 10, 18),
	panel = Color3.fromRGB(18, 22, 35),
	node = Color3.fromRGB(30, 38, 55),
	nodeLocked = Color3.fromRGB(25, 25, 30),
	nodeUnlocked = Color3.fromRGB(20, 50, 35),
	nodeAvailable = Color3.fromRGB(40, 45, 65),
	accent = Color3.fromRGB(0, 200, 130),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(225, 230, 240),
	textDim = Color3.fromRGB(110, 120, 140),
	locked = Color3.fromRGB(80, 80, 90),
	branchColors = {
		Crushing = Color3.fromRGB(200, 140, 60),
		Hydrometallurgy = Color3.fromRGB(100, 180, 255),
		Optimization = Color3.fromRGB(200, 200, 80),
		Environmental = Color3.fromRGB(80, 200, 120),
		Automation = Color3.fromRGB(180, 140, 220),
	},
}

local function corner(p, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 6); c.Parent = p end

-- State
local unlockedResearch = {}
-- Mark initially unlocked nodes
for _, node in ipairs(ResearchTree.Nodes) do
	if node.unlocked then unlockedResearch[node.id] = true end
end

-- ═══════════════════════════════════════════════
-- SCREEN GUI
-- ═══════════════════════════════════════════════

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "ResearchGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.DisplayOrder = 19
screenGui.Enabled = false
screenGui.Parent = playerGui

local main = Instance.new("Frame")
main.Size = UDim2.new(1, -60, 1, -60)
main.Position = UDim2.new(0, 30, 0, 30)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.02
main.Parent = screenGui
corner(main, 14)
local ms = Instance.new("UIStroke"); ms.Color = C.accent; ms.Thickness = 2; ms.Parent = main

-- Title
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 40)
titleBar.BackgroundColor3 = C.panel
titleBar.Parent = main
corner(titleBar, 14)

local titleL = Instance.new("TextLabel")
titleL.Size = UDim2.new(0.5, 0, 1, 0)
titleL.Position = UDim2.new(0, 14, 0, 0)
titleL.BackgroundTransparency = 1
titleL.Text = "RESEARCH & TECHNOLOGY TREE"
titleL.TextColor3 = C.accent
titleL.TextScaled = true
titleL.Font = Enum.Font.GothamBold
titleL.TextXAlignment = Enum.TextXAlignment.Left
titleL.Parent = titleBar

-- Progress display
local progressL = Instance.new("TextLabel")
progressL.Name = "Progress"
progressL.Size = UDim2.new(0.3, 0, 1, 0)
progressL.Position = UDim2.new(0.55, 0, 0, 0)
progressL.BackgroundTransparency = 1
progressL.TextColor3 = C.gold
progressL.TextScaled = true
progressL.Font = Enum.Font.GothamBold
progressL.TextXAlignment = Enum.TextXAlignment.Right
progressL.Parent = titleBar

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.fromOffset(28, 28)
closeBtn.Position = UDim2.new(1, -36, 0, 6)
closeBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 60)
closeBtn.Text = "X"; closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold; closeBtn.TextScaled = true
closeBtn.Parent = titleBar; corner(closeBtn, 6)
closeBtn.MouseButton1Click:Connect(function() screenGui.Enabled = false end)

-- ═══════════════════════════════════════════════
-- BRANCH COLUMNS (5 branches side by side)
-- ═══════════════════════════════════════════════

local branchArea = Instance.new("ScrollingFrame")
branchArea.Size = UDim2.new(1, -20, 1, -50)
branchArea.Position = UDim2.new(0, 10, 0, 44)
branchArea.BackgroundTransparency = 1
branchArea.ScrollBarThickness = 6
branchArea.CanvasSize = UDim2.new(0, 0, 0, 800)
branchArea.Parent = main

local branchLayout = Instance.new("UIListLayout")
branchLayout.FillDirection = Enum.FillDirection.Horizontal
branchLayout.Padding = UDim.new(0, 6)
branchLayout.Parent = branchArea

local nodeCards = {}

local branches = ResearchTree.GetBranches()
for _, branchName in ipairs(branches) do
	local branchColor = C.branchColors[branchName] or C.accent
	local branchNodes = ResearchTree.GetBranch(branchName)

	local column = Instance.new("Frame")
	column.Name = branchName
	column.Size = UDim2.new(0, 200, 0, math.max(#branchNodes * 130 + 40, 400))
	column.BackgroundColor3 = C.panel
	column.BackgroundTransparency = 0.3
	column.Parent = branchArea
	corner(column, 8)

	-- Branch header
	local header = Instance.new("TextLabel")
	header.Size = UDim2.new(1, -8, 0, 26)
	header.Position = UDim2.new(0, 4, 0, 4)
	header.BackgroundTransparency = 1
	header.Text = branchName:upper()
	header.TextColor3 = branchColor
	header.TextScaled = true
	header.Font = Enum.Font.GothamBold
	header.TextXAlignment = Enum.TextXAlignment.Center
	header.Parent = column

	-- Color bar under header
	local colorBar = Instance.new("Frame")
	colorBar.Size = UDim2.new(0.9, 0, 0, 3)
	colorBar.Position = UDim2.new(0.05, 0, 0, 30)
	colorBar.BackgroundColor3 = branchColor
	colorBar.Parent = column
	corner(colorBar, 1)

	-- Node cards
	for i, node in ipairs(branchNodes) do
		local isUnlocked = unlockedResearch[node.id] or node.unlocked
		local canResearch, reason = ResearchTree.CanResearch(node.id, unlockedResearch)

		local card = Instance.new("Frame")
		card.Name = node.id
		card.Size = UDim2.new(0.92, 0, 0, 115)
		card.Position = UDim2.new(0.04, 0, 0, 36 + (i - 1) * 125)
		card.BackgroundColor3 = isUnlocked and C.nodeUnlocked or canResearch and C.nodeAvailable or C.nodeLocked
		card.Parent = column
		corner(card, 8)

		-- Tier badge
		local tierBadge = Instance.new("Frame")
		tierBadge.Size = UDim2.fromOffset(24, 18)
		tierBadge.Position = UDim2.new(0, 4, 0, 4)
		tierBadge.BackgroundColor3 = branchColor
		tierBadge.Parent = card
		corner(tierBadge, 4)
		local tierL = Instance.new("TextLabel")
		tierL.Size = UDim2.new(1, 0, 1, 0)
		tierL.BackgroundTransparency = 1
		tierL.Text = "T" .. node.tier
		tierL.TextColor3 = Color3.new(0, 0, 0)
		tierL.TextScaled = true
		tierL.Font = Enum.Font.GothamBold
		tierL.Parent = tierBadge

		-- Name
		local nameL = Instance.new("TextLabel")
		nameL.Size = UDim2.new(1, -34, 0, 18)
		nameL.Position = UDim2.new(0, 30, 0, 3)
		nameL.BackgroundTransparency = 1
		nameL.Text = node.name
		nameL.TextColor3 = isUnlocked and C.accent or canResearch and C.text or C.locked
		nameL.TextScaled = true
		nameL.Font = Enum.Font.GothamBold
		nameL.TextXAlignment = Enum.TextXAlignment.Left
		nameL.Parent = card

		-- Description
		local descL = Instance.new("TextLabel")
		descL.Size = UDim2.new(1, -8, 0, 28)
		descL.Position = UDim2.new(0, 4, 0, 22)
		descL.BackgroundTransparency = 1
		descL.Text = node.description
		descL.TextColor3 = C.textDim
		descL.TextScaled = true
		descL.Font = Enum.Font.Gotham
		descL.TextWrapped = true
		descL.TextXAlignment = Enum.TextXAlignment.Left
		descL.TextYAlignment = Enum.TextYAlignment.Top
		descL.Parent = card

		-- Effect
		local effectL = Instance.new("TextLabel")
		effectL.Size = UDim2.new(1, -8, 0, 14)
		effectL.Position = UDim2.new(0, 4, 0, 52)
		effectL.BackgroundTransparency = 1
		effectL.Text = node.effect
		effectL.TextColor3 = C.accent
		effectL.TextScaled = true
		effectL.Font = Enum.Font.Gotham
		effectL.TextXAlignment = Enum.TextXAlignment.Left
		effectL.Parent = card

		-- Cost + status
		local costL = Instance.new("TextLabel")
		costL.Size = UDim2.new(0.5, -4, 0, 16)
		costL.Position = UDim2.new(0, 4, 0, 70)
		costL.BackgroundTransparency = 1
		costL.Text = node.cost > 0 and (node.cost .. " MC") or "FREE"
		costL.TextColor3 = C.gold
		costL.TextScaled = true
		costL.Font = Enum.Font.GothamBold
		costL.TextXAlignment = Enum.TextXAlignment.Left
		costL.Parent = card

		-- Research button or status
		if isUnlocked then
			local doneL = Instance.new("TextLabel")
			doneL.Size = UDim2.new(0.45, 0, 0, 24)
			doneL.Position = UDim2.new(0.52, 0, 0, 86)
			doneL.BackgroundColor3 = C.accent
			doneL.BackgroundTransparency = 0.3
			doneL.Text = "UNLOCKED"
			doneL.TextColor3 = Color3.new(0, 0, 0)
			doneL.TextScaled = true
			doneL.Font = Enum.Font.GothamBold
			doneL.Parent = card
			corner(doneL, 4)
		elseif canResearch then
			local resBtn = Instance.new("TextButton")
			resBtn.Size = UDim2.new(0.45, 0, 0, 24)
			resBtn.Position = UDim2.new(0.52, 0, 0, 86)
			resBtn.BackgroundColor3 = branchColor
			resBtn.Text = "RESEARCH"
			resBtn.TextColor3 = Color3.new(0, 0, 0)
			resBtn.Font = Enum.Font.GothamBold
			resBtn.TextScaled = true
			resBtn.Parent = card
			corner(resBtn, 4)

			resBtn.MouseButton1Click:Connect(function()
				-- Client-side unlock (in production: validate server-side)
				unlockedResearch[node.id] = true
				resBtn.Text = "RESEARCHING..."
				resBtn.BackgroundColor3 = C.gold
				-- Simulate research time (scaled down for teaser)
				task.delay(math.min(node.researchTime / 60, 5), function()
					card.BackgroundColor3 = C.nodeUnlocked
					nameL.TextColor3 = C.accent
					resBtn:Destroy()
					local doneL = Instance.new("TextLabel")
					doneL.Size = UDim2.new(0.45, 0, 0, 24)
					doneL.Position = UDim2.new(0.52, 0, 0, 86)
					doneL.BackgroundColor3 = C.accent
					doneL.BackgroundTransparency = 0.3
					doneL.Text = "UNLOCKED"
					doneL.TextColor3 = Color3.new(0, 0, 0)
					doneL.TextScaled = true
					doneL.Font = Enum.Font.GothamBold
					doneL.Parent = card
					corner(doneL, 4)

					-- Update progress
					local done, total, pct = ResearchTree.GetProgress(unlockedResearch)
					progressL.Text = done .. "/" .. total .. " (" .. pct .. "%)"
				end)
			end)
		else
			local lockedL = Instance.new("TextLabel")
			lockedL.Size = UDim2.new(0.9, 0, 0, 16)
			lockedL.Position = UDim2.new(0.05, 0, 0, 90)
			lockedL.BackgroundTransparency = 1
			lockedL.Text = "Locked: " .. (reason or "prerequisites needed")
			lockedL.TextColor3 = C.locked
			lockedL.TextScaled = true
			lockedL.Font = Enum.Font.Gotham
			lockedL.Parent = card
		end

		-- Connection line to next node
		if i < #branchNodes then
			local line = Instance.new("Frame")
			line.Size = UDim2.new(0, 2, 0, 10)
			line.Position = UDim2.new(0.5, -1, 0, 36 + (i - 1) * 125 + 115)
			line.BackgroundColor3 = branchColor
			line.BackgroundTransparency = 0.5
			line.Parent = column
		end

		nodeCards[node.id] = card
	end

	-- Update canvas size
	branchArea.CanvasSize = UDim2.new(0, #branches * 206, 0, 0)
end

-- Initial progress
local done, total, pct = ResearchTree.GetProgress(unlockedResearch)
progressL.Text = done .. "/" .. total .. " researched (" .. pct .. "%) — 3 already unlocked! Click RESEARCH to unlock more."

print("[MOLGANG] ResearchGui loaded — T key, 5 branches, " .. #ResearchTree.Nodes .. " technologies")
