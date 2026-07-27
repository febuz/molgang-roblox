--[[
	GuildGui.client.lua
	MOLGANG — Guild/Team Interface

	Create or join guilds, manage members, view bonuses.
	Key: ; (semicolon) to toggle
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local GuildSystem = require(ReplicatedStorage.Modules.GuildSystem)
local ResponsiveGui = require(ReplicatedStorage.Modules.ResponsiveGui)

local C = {
	bg = Color3.fromRGB(12, 8, 20),
	panel = Color3.fromRGB(24, 18, 36),
	accent = Color3.fromRGB(140, 80, 255),
	green = Color3.fromRGB(0, 200, 100),
	red = Color3.fromRGB(220, 60, 60),
	gold = Color3.fromRGB(255, 215, 0),
	text = Color3.fromRGB(230, 230, 245),
	textDim = Color3.fromRGB(140, 135, 165),
	tabActive = Color3.fromRGB(140, 80, 255),
	tabInactive = Color3.fromRGB(40, 30, 55),
}

local function corner(o, r) local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = o end
local function playClick()
	local s = SoundService:FindFirstChild("ui_click")
	if s then local c = s:Clone(); c.Parent = SoundService; c:Play(); c.Ended:Connect(function() c:Destroy() end) end
end

-- Screen GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "GuildGui"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 19
screenGui.Enabled = false
screenGui.Parent = playerGui
ResponsiveGui.Attach(screenGui, 550, 450)

local main = Instance.new("Frame")
main.Size = UDim2.new(0, 550, 0, 450)
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = C.bg
main.BackgroundTransparency = 0.05
main.Parent = screenGui
corner(main, 14)

-- Title
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 42)
title.BackgroundColor3 = Color3.fromRGB(8, 5, 15)
title.Text = "GUILDS"
title.TextColor3 = C.accent
title.TextScaled = true
title.Font = Enum.Font.GothamBold
title.Parent = main
corner(title, 14)

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 55, 0, 30)
closeBtn.Position = UDim2.new(1, -65, 0, 6)
closeBtn.BackgroundColor3 = C.red
closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.new(1,1,1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextScaled = true
closeBtn.Parent = title
corner(closeBtn, 6)
closeBtn.Activated:Connect(function() playClick(); screenGui.Enabled = false end)

-- Tabs: My Guild | Browse | Create
local tabFrame = Instance.new("Frame")
tabFrame.Size = UDim2.new(1, 0, 0, 32)
tabFrame.Position = UDim2.new(0, 0, 0, 44)
tabFrame.BackgroundTransparency = 1
tabFrame.Parent = main

local tabs = {"My Guild", "Browse", "Create"}
local tabPanels = {}
local tabButtons = {}
local currentTab = "My Guild"

for i, t in ipairs(tabs) do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(1/#tabs, -4, 1, 0)
	btn.Position = UDim2.new((i-1)/#tabs, 2, 0, 0)
	btn.BackgroundColor3 = i == 1 and C.tabActive or C.tabInactive
	btn.Text = t
	btn.TextColor3 = C.text
	btn.TextScaled = true
	btn.Font = Enum.Font.GothamBold
	btn.Parent = tabFrame
	corner(btn, 6)
	tabButtons[t] = btn

	local panel = Instance.new("Frame")
	panel.Name = t
	panel.Size = UDim2.new(1, -16, 1, -90)
	panel.Position = UDim2.new(0, 8, 0, 80)
	panel.BackgroundTransparency = 1
	panel.Visible = (i == 1)
	panel.Parent = main
	tabPanels[t] = panel

	btn.Activated:Connect(function()
		playClick()
		for k, p in pairs(tabPanels) do p.Visible = false end
		for k, b in pairs(tabButtons) do b.BackgroundColor3 = C.tabInactive end
		panel.Visible = true
		btn.BackgroundColor3 = C.tabActive
		currentTab = t
	end)
end

-- ═══════════════════════════════════════════════
-- MY GUILD TAB
-- ═══════════════════════════════════════════════

local myGuildPanel = tabPanels["My Guild"]

local guildNameLabel = Instance.new("TextLabel")
guildNameLabel.Size = UDim2.new(1, 0, 0, 30)
guildNameLabel.BackgroundTransparency = 1
guildNameLabel.Text = "Not in a guild"
guildNameLabel.TextColor3 = C.accent
guildNameLabel.TextScaled = true
guildNameLabel.Font = Enum.Font.GothamBold
guildNameLabel.Parent = myGuildPanel

local membersScroll = Instance.new("ScrollingFrame")
membersScroll.Size = UDim2.new(0.55, -5, 0, 200)
membersScroll.Position = UDim2.new(0, 0, 0, 35)
membersScroll.BackgroundColor3 = C.panel
membersScroll.ScrollBarThickness = 4
membersScroll.Parent = myGuildPanel
corner(membersScroll, 6)

local membersLayout = Instance.new("UIListLayout")
membersLayout.Padding = UDim.new(0, 3)
membersLayout.Parent = membersScroll

local bonusesFrame = Instance.new("Frame")
bonusesFrame.Size = UDim2.new(0.45, -5, 0, 200)
bonusesFrame.Position = UDim2.new(0.55, 5, 0, 35)
bonusesFrame.BackgroundColor3 = C.panel
bonusesFrame.Parent = myGuildPanel
corner(bonusesFrame, 6)

local bonusTitle = Instance.new("TextLabel")
bonusTitle.Size = UDim2.new(1, -8, 0, 20)
bonusTitle.Position = UDim2.new(0, 4, 0, 4)
bonusTitle.BackgroundTransparency = 1
bonusTitle.Text = "Guild Bonuses"
bonusTitle.TextColor3 = C.gold
bonusTitle.TextScaled = true
bonusTitle.Font = Enum.Font.GothamBold
bonusTitle.TextXAlignment = Enum.TextXAlignment.Left
bonusTitle.Parent = bonusesFrame

local bonusList = Instance.new("TextLabel")
bonusList.Size = UDim2.new(1, -8, 1, -28)
bonusList.Position = UDim2.new(0, 4, 0, 26)
bonusList.BackgroundTransparency = 1
bonusList.Text = "Join a guild to unlock bonuses!"
bonusList.TextColor3 = C.textDim
bonusList.TextScaled = true
bonusList.Font = Enum.Font.Gotham
bonusList.TextWrapped = true
bonusList.TextYAlignment = Enum.TextYAlignment.Top
bonusList.TextXAlignment = Enum.TextXAlignment.Left
bonusList.Parent = bonusesFrame

local leaveBtn = Instance.new("TextButton")
leaveBtn.Size = UDim2.new(0.4, 0, 0, 34)
leaveBtn.Position = UDim2.new(0, 0, 1, -40)
leaveBtn.BackgroundColor3 = C.red
leaveBtn.Text = "Leave Guild"
leaveBtn.TextColor3 = Color3.new(1,1,1)
leaveBtn.TextScaled = true
leaveBtn.Font = Enum.Font.GothamBold
leaveBtn.Visible = false
leaveBtn.Parent = myGuildPanel
corner(leaveBtn, 6)

leaveBtn.Activated:Connect(function()
	playClick()
	local r = Remotes:FindFirstChild("RequestLeaveGuild")
	if r then r:FireServer() end
	task.delay(0.5, function()
		local r2 = Remotes:FindFirstChild("RequestGuildInfo")
		if r2 then r2:FireServer() end
	end)
end)

-- ═══════════════════════════════════════════════
-- BROWSE TAB
-- ═══════════════════════════════════════════════

local browsePanel = tabPanels["Browse"]

local browseScroll = Instance.new("ScrollingFrame")
browseScroll.Size = UDim2.new(1, 0, 1, -10)
browseScroll.Position = UDim2.new(0, 0, 0, 5)
browseScroll.BackgroundColor3 = C.panel
browseScroll.ScrollBarThickness = 4
browseScroll.Parent = browsePanel
corner(browseScroll, 6)

local browseLayout = Instance.new("UIListLayout")
browseLayout.Padding = UDim.new(0, 4)
browseLayout.Parent = browseScroll

-- ═══════════════════════════════════════════════
-- CREATE TAB
-- ═══════════════════════════════════════════════

local createPanel = tabPanels["Create"]

local createLabel = Instance.new("TextLabel")
createLabel.Size = UDim2.new(1, 0, 0, 24)
createLabel.BackgroundTransparency = 1
createLabel.Text = "Create a New Guild (" .. GuildSystem.CreateCost .. " MC)"
createLabel.TextColor3 = C.accent
createLabel.TextScaled = true
createLabel.Font = Enum.Font.GothamBold
createLabel.Parent = createPanel

local nameBox = Instance.new("TextBox")
nameBox.Size = UDim2.new(0.7, 0, 0, 36)
nameBox.Position = UDim2.new(0, 0, 0, 35)
nameBox.BackgroundColor3 = C.panel
nameBox.PlaceholderText = "Guild Name (3-20 chars)"
nameBox.Text = ""
nameBox.TextColor3 = C.text
nameBox.PlaceholderColor3 = C.textDim
nameBox.TextScaled = true
nameBox.Font = Enum.Font.Gotham
nameBox.ClearTextOnFocus = false
nameBox.Parent = createPanel
corner(nameBox, 6)

local createBtn = Instance.new("TextButton")
createBtn.Size = UDim2.new(0.25, 0, 0, 36)
createBtn.Position = UDim2.new(0.73, 0, 0, 35)
createBtn.BackgroundColor3 = C.green
createBtn.Text = "Create"
createBtn.TextColor3 = Color3.new(1,1,1)
createBtn.TextScaled = true
createBtn.Font = Enum.Font.GothamBold
createBtn.Parent = createPanel
corner(createBtn, 6)

createBtn.Activated:Connect(function()
	playClick()
	if #nameBox.Text >= 3 then
		local r = Remotes:FindFirstChild("RequestCreateGuild")
		if r then r:FireServer(nameBox.Text) end
		nameBox.Text = ""
	end
end)

-- ═══════════════════════════════════════════════
-- DATA HANDLER
-- ═══════════════════════════════════════════════

local guildInfoEvent = Remotes:FindFirstChild("GuildInfoResponse")
if guildInfoEvent then
	guildInfoEvent.OnClientEvent:Connect(function(data)
		-- Update My Guild tab
		for _, child in membersScroll:GetChildren() do
			if child:IsA("Frame") then child:Destroy() end
		end

		if data.myGuild then
			guildNameLabel.Text = "[" .. data.myGuild.tag .. "] " .. data.myGuild.name
			leaveBtn.Visible = true

			for i, member in ipairs(data.myGuild.members) do
				local mf = Instance.new("Frame")
				mf.Size = UDim2.new(1, -8, 0, 26)
				mf.BackgroundColor3 = member.rank == "leader" and Color3.fromRGB(50, 30, 70) or C.panel
				mf.Parent = membersScroll
				corner(mf, 4)

				local ml = Instance.new("TextLabel")
				ml.Size = UDim2.new(0.6, 0, 1, 0)
				ml.Position = UDim2.new(0, 6, 0, 0)
				ml.BackgroundTransparency = 1
				ml.Text = member.name
				ml.TextColor3 = member.rank == "leader" and C.gold or C.text
				ml.TextScaled = true; ml.Font = Enum.Font.Gotham
				ml.TextXAlignment = Enum.TextXAlignment.Left
				ml.Parent = mf

				local rl = Instance.new("TextLabel")
				rl.Size = UDim2.new(0.35, 0, 1, 0)
				rl.Position = UDim2.new(0.62, 0, 0, 0)
				rl.BackgroundTransparency = 1
				rl.Text = GuildSystem.GetRankInfo(member.rank).name
				rl.TextColor3 = C.textDim
				rl.TextScaled = true; rl.Font = Enum.Font.Gotham
				rl.Parent = mf
			end
			membersScroll.CanvasSize = UDim2.new(0, 0, 0, #data.myGuild.members * 30)

			-- Bonuses
			if data.myGuild.bonuses and #data.myGuild.bonuses > 0 then
				local bText = ""
				for _, b in ipairs(data.myGuild.bonuses) do
					bText = bText .. b.description .. "\n"
				end
				bonusList.Text = bText
			else
				bonusList.Text = "Get more members for bonuses!"
			end
		else
			guildNameLabel.Text = "Not in a guild"
			leaveBtn.Visible = false
			bonusList.Text = "Join or create a guild!"
		end

		-- Update Browse tab
		for _, child in browseScroll:GetChildren() do
			if child:IsA("Frame") then child:Destroy() end
		end

		if data.allGuilds then
			for _, g in ipairs(data.allGuilds) do
				local gf = Instance.new("Frame")
				gf.Size = UDim2.new(1, -8, 0, 40)
				gf.BackgroundColor3 = C.panel
				gf.Parent = browseScroll
				corner(gf, 6)

				local gl = Instance.new("TextLabel")
				gl.Size = UDim2.new(0.5, 0, 0.5, 0)
				gl.Position = UDim2.new(0, 8, 0, 2)
				gl.BackgroundTransparency = 1
				gl.Text = "[" .. g.tag .. "] " .. g.name
				gl.TextColor3 = C.accent; gl.TextScaled = true; gl.Font = Enum.Font.GothamBold
				gl.TextXAlignment = Enum.TextXAlignment.Left
				gl.Parent = gf

				local gi = Instance.new("TextLabel")
				gi.Size = UDim2.new(0.4, 0, 0.5, 0)
				gi.Position = UDim2.new(0, 8, 0.5, 0)
				gi.BackgroundTransparency = 1
				gi.Text = g.memberCount .. "/" .. GuildSystem.MaxGuildSize .. " members"
				gi.TextColor3 = C.textDim; gi.TextScaled = true; gi.Font = Enum.Font.Gotham
				gi.TextXAlignment = Enum.TextXAlignment.Left
				gi.Parent = gf

				local jb = Instance.new("TextButton")
				jb.Size = UDim2.new(0.2, 0, 0.7, 0)
				jb.Position = UDim2.new(0.78, 0, 0.15, 0)
				jb.BackgroundColor3 = C.green; jb.Text = "Join"
				jb.TextColor3 = Color3.new(1,1,1); jb.TextScaled = true
				jb.Font = Enum.Font.GothamBold; jb.Parent = gf
				corner(jb, 4)
				jb.Activated:Connect(function()
					playClick()
					local r = Remotes:FindFirstChild("RequestJoinGuild")
					if r then r:FireServer(g.name) end
				end)
			end
			browseScroll.CanvasSize = UDim2.new(0, 0, 0, #data.allGuilds * 44)
		end
	end)
end

-- Refresh on open
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		local r = Remotes:FindFirstChild("RequestGuildInfo")
		if r then r:FireServer() end
	end
end)

print("[MOLGANG] GuildGui loaded — press ; to manage guilds")
