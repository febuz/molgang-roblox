-- StarterGui/WalletGui.client.lua
-- MolWallet + ChainExplorer combined GUI for MOLGANG
-- Tab 1: Balance (MolCoins + ChainTokens + QuantumDots)
-- Tab 2: ANK Loans (lender + borrower view)
-- Tab 3: Achievements (badge collection)
-- Tab 4: ChainExplorer (search, timeline, block visualization)

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local ResponsiveGui = require(ReplicatedStorage.Modules.ResponsiveGui)
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- ══════════════════════════════════════════════
-- COLORS
-- ══════════════════════════════════════════════

local C = {
	bg = Color3.fromRGB(5, 10, 8),
	panel = Color3.fromRGB(10, 20, 15),
	accent = Color3.fromRGB(34, 197, 94),
	gold = Color3.fromRGB(255, 215, 0),
	blue = Color3.fromRGB(56, 189, 248),
	purple = Color3.fromRGB(168, 85, 247),
	text = Color3.fromRGB(220, 240, 230),
	dim = Color3.fromRGB(80, 110, 90),
}

-- ══════════════════════════════════════════════
-- HELPERS
-- ══════════════════════════════════════════════

local function corner(p, r)
	local c = Instance.new("UICorner"); c.CornerRadius = UDim.new(0, r or 8); c.Parent = p
end

local function label(p, txt, col, font, sz, pos)
	local l = Instance.new("TextLabel")
	l.Size = sz or UDim2.fromScale(1, 1)
	l.Position = pos or UDim2.new()
	l.BackgroundTransparency = 1
	l.Text = txt or ""
	l.TextColor3 = col or C.text
	l.TextScaled = true
	l.Font = font or Enum.Font.Gotham
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.Parent = p
	return l
end

-- ══════════════════════════════════════════════
-- MAIN GUI
-- ══════════════════════════════════════════════

local gui = Instance.new("ScreenGui")
gui.Name = "WalletGui"
gui.Enabled = false
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
-- Wallet is a full-screen interactive modal; keep it above HUD/status layers.
gui.DisplayOrder = 23
gui.Parent = playerGui
ResponsiveGui.Attach(gui, 580, 480)

-- Background
local bg = Instance.new("Frame")
bg.Size = UDim2.fromScale(1, 1)
bg.BackgroundColor3 = C.bg
bg.BackgroundTransparency = 0.3
bg.BorderSizePixel = 0
bg.Parent = gui

-- Panel
local panel = Instance.new("Frame")
panel.Size = UDim2.fromOffset(580, 480)
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.5)
panel.BackgroundColor3 = C.panel
panel.BackgroundTransparency = 0.05
panel.BorderSizePixel = 0
panel.Parent = gui
corner(panel, 12)
local ps = Instance.new("UIStroke"); ps.Color = C.accent; ps.Thickness = 2; ps.Parent = panel

-- Header
local hdr = Instance.new("Frame")
hdr.Size = UDim2.new(1, 0, 0, 42)
hdr.BackgroundColor3 = Color3.fromRGB(5, 12, 8)
hdr.BackgroundTransparency = 0.3
hdr.BorderSizePixel = 0
hdr.Parent = panel
label(hdr, "MOL WALLET", C.accent, Enum.Font.GothamBold, UDim2.new(0.6, 0, 1, 0), UDim2.fromOffset(12, 0))

local xBtn = Instance.new("TextButton")
xBtn.Size = UDim2.fromOffset(34, 34)
xBtn.Position = UDim2.new(1, -40, 0, 4)
xBtn.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
xBtn.BackgroundTransparency = 0.5
xBtn.Text = "X"
xBtn.TextColor3 = Color3.new(1, 1, 1)
xBtn.TextScaled = true
xBtn.Font = Enum.Font.GothamBold
xBtn.Parent = hdr
corner(xBtn, 6)
xBtn.Activated:Connect(function() gui.Enabled = false end)

-- ══════════════════════════════════════════════
-- TABS
-- ══════════════════════════════════════════════

local tabBar = Instance.new("Frame")
tabBar.Size = UDim2.new(1, 0, 0, 30)
tabBar.Position = UDim2.fromOffset(0, 42)
tabBar.BackgroundColor3 = Color3.fromRGB(5, 10, 8)
tabBar.BackgroundTransparency = 0.5
tabBar.BorderSizePixel = 0
tabBar.Parent = panel
local tl = Instance.new("UIListLayout"); tl.FillDirection = Enum.FillDirection.Horizontal; tl.Parent = tabBar

local TABS = {"Balance", "Loans", "Badges", "Chain"}
local tBtns, tFrames = {}, {}

local content = Instance.new("Frame")
content.Size = UDim2.new(1, -12, 1, -80)
content.Position = UDim2.fromOffset(6, 76)
content.BackgroundTransparency = 1
content.ClipsDescendants = true
content.Parent = panel

for i, name in ipairs(TABS) do
	local b = Instance.new("TextButton")
	b.Size = UDim2.new(1/#TABS, 0, 1, 0)
	b.LayoutOrder = i
	b.BackgroundTransparency = 1
	b.Text = name
	b.TextColor3 = i == 1 and C.accent or C.dim
	b.TextScaled = true
	b.Font = Enum.Font.GothamBold
	b.Parent = tabBar
	tBtns[name] = b

	local f = Instance.new("ScrollingFrame")
	f.Size = UDim2.fromScale(1, 1)
	f.BackgroundTransparency = 1
	f.BorderSizePixel = 0
	f.ScrollBarThickness = 3
	f.Visible = (i == 1)
	f.AutomaticCanvasSize = Enum.AutomaticSize.Y
	f.Parent = content
	tFrames[name] = f
	local ly = Instance.new("UIListLayout"); ly.Padding = UDim.new(0, 6); ly.Parent = f

	b.Activated:Connect(function()
		for n, fr in pairs(tFrames) do fr.Visible = (n == name) end
		for n, bt in pairs(tBtns) do bt.TextColor3 = (n == name) and C.accent or C.dim end
	end)
end

-- ══════════════════════════════════════════════
-- BALANCE TAB
-- ══════════════════════════════════════════════

local function balCard(parent, icon, lbl, col, ord)
	local card = Instance.new("Frame")
	card.Size = UDim2.new(1, 0, 0, 58)
	card.BackgroundColor3 = Color3.fromRGB(8, 18, 12)
	card.BackgroundTransparency = 0.2
	card.BorderSizePixel = 0
	card.LayoutOrder = ord
	card.Parent = parent
	corner(card, 6)
	label(card, icon, C.text, Enum.Font.GothamBold, UDim2.fromOffset(36, 36), UDim2.fromOffset(8, 11))
	label(card, lbl, C.dim, Enum.Font.Gotham, UDim2.new(0.5, 0, 0, 16), UDim2.fromOffset(50, 4))
	local v = label(card, "0", col, Enum.Font.GothamBold, UDim2.new(0.5, 0, 0, 28), UDim2.fromOffset(50, 22))
	v.Name = "Value"
	return card
end

local bf = tFrames["Balance"]
balCard(bf, "M", "MolCoins", C.gold, 1)
balCard(bf, "#", "ChainTokens", C.blue, 2)
balCard(bf, "Q", "QuantumDots", C.purple, 3)
balCard(bf, "E", "Elements", C.accent, 4)
balCard(bf, "B", "Molecules", Color3.fromRGB(255, 150, 50), 5)

local claim = Instance.new("TextButton")
claim.Size = UDim2.new(1, 0, 0, 40)
claim.LayoutOrder = 6
claim.BackgroundColor3 = C.accent
claim.BackgroundTransparency = 0.3
claim.Text = "CLAIM DAILY — 50 MolCoins"
claim.TextColor3 = Color3.new(1, 1, 1)
claim.TextScaled = true
claim.Font = Enum.Font.GothamBold
claim.Parent = bf
corner(claim, 6)
claim.Activated:Connect(function()
	Remotes.FireServer("RequestDailyClaim")
end)

-- ══════════════════════════════════════════════
-- CHAIN TAB
-- ══════════════════════════════════════════════

local cf = tFrames["Chain"]

local sr = Instance.new("Frame")
sr.Size = UDim2.new(1, 0, 0, 30)
sr.BackgroundTransparency = 1
sr.LayoutOrder = 1
sr.Parent = cf

local sb = Instance.new("TextBox")
sb.Size = UDim2.new(0.7, -4, 1, 0)
sb.BackgroundColor3 = Color3.fromRGB(12, 24, 18)
sb.PlaceholderText = "Search molecule / player / hash..."
sb.PlaceholderColor3 = C.dim
sb.Text = ""
sb.TextColor3 = C.text
sb.TextScaled = true
sb.Font = Enum.Font.Gotham
sb.ClearTextOnFocus = false
sb.Parent = sr
corner(sb, 4)

local sbtn = Instance.new("TextButton")
sbtn.Size = UDim2.new(0.28, 0, 1, 0)
sbtn.Position = UDim2.fromScale(0.72, 0)
sbtn.BackgroundColor3 = C.accent
sbtn.BackgroundTransparency = 0.3
sbtn.Text = "SEARCH"
sbtn.TextColor3 = Color3.new(1, 1, 1)
sbtn.TextScaled = true
sbtn.Font = Enum.Font.GothamBold
sbtn.Parent = sr
corner(sbtn, 4)
sbtn.Activated:Connect(function()
	if sb.Text ~= "" then Remotes.FireServer("RequestChainQuery", sb.Text) end
end)

-- Genesis
local gen = Instance.new("Frame")
gen.Size = UDim2.new(1, 0, 0, 36)
gen.BackgroundColor3 = Color3.fromRGB(15, 30, 20)
gen.BackgroundTransparency = 0.3
gen.BorderSizePixel = 0
gen.LayoutOrder = 2
gen.Parent = cf
corner(gen, 4)
local gs = Instance.new("UIStroke"); gs.Color = C.gold; gs.Thickness = 1; gs.Parent = gen
label(gen, "BLOCK #1 — MOLGANG GENESIS", C.gold, Enum.Font.GothamBold, UDim2.fromScale(1, 0.5), UDim2.fromOffset(6, 0))
label(gen, "Hash: 00000000...0000 — 1 april 2026", C.dim, Enum.Font.Code, UDim2.fromScale(1, 0.5), UDim2.new(0, 6, 0.5, 0))

-- Entries container
local entries = Instance.new("Frame")
entries.Name = "Entries"
entries.Size = UDim2.new(1, 0, 0, 0)
entries.AutomaticSize = Enum.AutomaticSize.Y
entries.BackgroundTransparency = 1
entries.LayoutOrder = 3
entries.Parent = cf
local el = Instance.new("UIListLayout"); el.Padding = UDim.new(0, 3); el.Parent = entries

-- ══════════════════════════════════════════════
-- DATA
-- ══════════════════════════════════════════════

local function refresh()
	local ok, data = pcall(function() return Remotes.GetPlayerData:InvokeServer() end) -- #93
	if not ok or not data then return end
	for _, card in ipairs(bf:GetChildren()) do
		if card:IsA("Frame") then
			local v = card:FindFirstChild("Value")
			if v then
				local o = card.LayoutOrder
				if o == 1 then v.Text = tostring(data.molCoins or 0)
				elseif o == 2 then v.Text = tostring(data.chainTokens or 0)
				elseif o == 3 then
					local n = 0; for _ in pairs(data.quantumDots or {}) do n = n+1 end; v.Text = tostring(n)
				elseif o == 4 then
					local n = 0; for _ in pairs(data.elementsFound or {}) do n = n+1 end; v.Text = n.."/118"
				elseif o == 5 then v.Text = tostring(data.totalMoleculesBuilt or 0) end
			end
		end
	end
end

gui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if gui.Enabled then task.spawn(refresh) end
end)

-- Chain entries
Remotes.ChainEntryAdded.OnClientEvent:Connect(function(d)
	if type(d) ~= "table" or not d.player then return end
	local card = Instance.new("Frame")
	card.Size = UDim2.new(1, 0, 0, 32)
	card.BackgroundColor3 = Color3.fromRGB(10, 20, 15)
	card.BackgroundTransparency = 0.3
	card.BorderSizePixel = 0
	card.LayoutOrder = -(d.timestamp or os.time())
	card.Parent = entries
	corner(card, 3)
	label(card, (d.player or "?").." — "..(d.molecule or "?"), C.text, Enum.Font.Gotham, UDim2.new(0.6, 0, 0.5, 0), UDim2.fromOffset(6, 1))
	local h = d.hash or "0000000000000000"
	label(card, string.sub(h,1,8).."..."..string.sub(h,-4), C.dim, Enum.Font.Code, UDim2.new(0.9, 0, 0.5, 0), UDim2.new(0, 6, 0.5, 0))
end)

Remotes.DailyClaimResult.OnClientEvent:Connect(function(d)
	if d.success then
		claim.Text = "CLAIMED +"..d.amount.." MC (streak "..(d.streak or 1)..")"
		claim.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
		task.spawn(refresh)
	else
		local h = math.floor((d.remaining or 0) / 3600)
		local m = math.floor(((d.remaining or 0) % 3600) / 60)
		claim.Text = d.reason or ("Next: "..h.."h "..m.."m")
	end
end)

print("[MOLGANG] WalletGui initialized")
