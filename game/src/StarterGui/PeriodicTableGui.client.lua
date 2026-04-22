--[[
	PeriodicTableGui.client.lua
	MOLGANG Roblox Game — Full-screen Periodic Table Overlay

	Opens via P key or HUD button.
	- 118 elements in standard periodic table layout
	- Color-coded by discovery status and element group
	- Hover/tap detail popup
	- Progress bar + milestone badges
	- RemoteFunction GetElementInfo(z) for server data
]]

-- Services
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")

-- Player
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Remotes
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local GetElementInfo = Remotes:WaitForChild("GetElementInfo")
local GetPlayerData = Remotes:WaitForChild("GetPlayerData")

--------------------------------------------------------------------------------
-- COLOR PALETTE
--------------------------------------------------------------------------------

local COLORS = {
	bgOverlay     = Color3.fromRGB(10, 10, 18),
	panel         = Color3.fromRGB(25, 25, 40),
	panelLight    = Color3.fromRGB(40, 40, 60),
	accent        = Color3.fromRGB(0, 200, 120),
	gold          = Color3.fromRGB(255, 200, 50),
	goldBorder    = Color3.fromRGB(255, 215, 0),
	textPrimary   = Color3.fromRGB(240, 240, 250),
	textSecondary = Color3.fromRGB(160, 160, 180),
	notFound      = Color3.fromRGB(55, 55, 70),
	notFoundText  = Color3.fromRGB(90, 90, 110),
	progressBg    = Color3.fromRGB(35, 35, 50),
	progressFill  = Color3.fromRGB(0, 200, 120),
	closeBtn      = Color3.fromRGB(200, 50, 50),
}

-- Element group colors
local GROUP_COLORS = {
	["Alkali Metal"]          = Color3.fromRGB(230, 90, 90),
	["Alkaline Earth Metal"]  = Color3.fromRGB(240, 150, 80),
	["Transition Metal"]      = Color3.fromRGB(220, 180, 100),
	["Post-Transition Metal"] = Color3.fromRGB(150, 200, 130),
	["Metalloid"]             = Color3.fromRGB(100, 185, 165),
	["Nonmetal"]              = Color3.fromRGB(80, 160, 240),
	["Halogen"]               = Color3.fromRGB(130, 130, 240),
	["Noble Gas"]             = Color3.fromRGB(185, 130, 240),
	["Lanthanide"]            = Color3.fromRGB(240, 160, 190),
	["Actinide"]              = Color3.fromRGB(240, 120, 165),
	["Unknown"]               = Color3.fromRGB(130, 130, 150),
}

--------------------------------------------------------------------------------
-- ELEMENT DATA — Complete periodic table layout
-- Each entry: {atomicNumber, symbol, name, group, row, col}
--------------------------------------------------------------------------------

local ELEMENT_DATA = {
	-- Row 1
	{1, "H", "Waterstof", "Nonmetal", 1, 1},
	{2, "He", "Helium", "Noble Gas", 1, 18},
	-- Row 2
	{3, "Li", "Lithium", "Alkali Metal", 2, 1},
	{4, "Be", "Beryllium", "Alkaline Earth Metal", 2, 2},
	{5, "B", "Boor", "Metalloid", 2, 13},
	{6, "C", "Koolstof", "Nonmetal", 2, 14},
	{7, "N", "Stikstof", "Nonmetal", 2, 15},
	{8, "O", "Zuurstof", "Nonmetal", 2, 16},
	{9, "F", "Fluor", "Halogen", 2, 17},
	{10, "Ne", "Neon", "Noble Gas", 2, 18},
	-- Row 3
	{11, "Na", "Natrium", "Alkali Metal", 3, 1},
	{12, "Mg", "Magnesium", "Alkaline Earth Metal", 3, 2},
	{13, "Al", "Aluminium", "Post-Transition Metal", 3, 13},
	{14, "Si", "Silicium", "Metalloid", 3, 14},
	{15, "P", "Fosfor", "Nonmetal", 3, 15},
	{16, "S", "Zwavel", "Nonmetal", 3, 16},
	{17, "Cl", "Chloor", "Halogen", 3, 17},
	{18, "Ar", "Argon", "Noble Gas", 3, 18},
	-- Row 4
	{19, "K", "Kalium", "Alkali Metal", 4, 1},
	{20, "Ca", "Calcium", "Alkaline Earth Metal", 4, 2},
	{21, "Sc", "Scandium", "Transition Metal", 4, 3},
	{22, "Ti", "Titanium", "Transition Metal", 4, 4},
	{23, "V", "Vanadium", "Transition Metal", 4, 5},
	{24, "Cr", "Chroom", "Transition Metal", 4, 6},
	{25, "Mn", "Mangaan", "Transition Metal", 4, 7},
	{26, "Fe", "IJzer", "Transition Metal", 4, 8},
	{27, "Co", "Kobalt", "Transition Metal", 4, 9},
	{28, "Ni", "Nikkel", "Transition Metal", 4, 10},
	{29, "Cu", "Koper", "Transition Metal", 4, 11},
	{30, "Zn", "Zink", "Transition Metal", 4, 12},
	{31, "Ga", "Gallium", "Post-Transition Metal", 4, 13},
	{32, "Ge", "Germanium", "Metalloid", 4, 14},
	{33, "As", "Arseen", "Metalloid", 4, 15},
	{34, "Se", "Seleen", "Nonmetal", 4, 16},
	{35, "Br", "Broom", "Halogen", 4, 17},
	{36, "Kr", "Krypton", "Noble Gas", 4, 18},
	-- Row 5
	{37, "Rb", "Rubidium", "Alkali Metal", 5, 1},
	{38, "Sr", "Strontium", "Alkaline Earth Metal", 5, 2},
	{39, "Y", "Yttrium", "Transition Metal", 5, 3},
	{40, "Zr", "Zirkonium", "Transition Metal", 5, 4},
	{41, "Nb", "Niobium", "Transition Metal", 5, 5},
	{42, "Mo", "Molybdeen", "Transition Metal", 5, 6},
	{43, "Tc", "Technetium", "Transition Metal", 5, 7},
	{44, "Ru", "Ruthenium", "Transition Metal", 5, 8},
	{45, "Rh", "Rhodium", "Transition Metal", 5, 9},
	{46, "Pd", "Palladium", "Transition Metal", 5, 10},
	{47, "Ag", "Zilver", "Transition Metal", 5, 11},
	{48, "Cd", "Cadmium", "Transition Metal", 5, 12},
	{49, "In", "Indium", "Post-Transition Metal", 5, 13},
	{50, "Sn", "Tin", "Post-Transition Metal", 5, 14},
	{51, "Sb", "Antimoon", "Metalloid", 5, 15},
	{52, "Te", "Telluur", "Metalloid", 5, 16},
	{53, "I", "Jood", "Halogen", 5, 17},
	{54, "Xe", "Xenon", "Noble Gas", 5, 18},
	-- Row 6
	{55, "Cs", "Cesium", "Alkali Metal", 6, 1},
	{56, "Ba", "Barium", "Alkaline Earth Metal", 6, 2},
	{57, "La", "Lanthaan", "Lanthanide", 6, 3},
	{72, "Hf", "Hafnium", "Transition Metal", 6, 4},
	{73, "Ta", "Tantaal", "Transition Metal", 6, 5},
	{74, "W", "Wolfraam", "Transition Metal", 6, 6},
	{75, "Re", "Renium", "Transition Metal", 6, 7},
	{76, "Os", "Osmium", "Transition Metal", 6, 8},
	{77, "Ir", "Iridium", "Transition Metal", 6, 9},
	{78, "Pt", "Platina", "Transition Metal", 6, 10},
	{79, "Au", "Goud", "Transition Metal", 6, 11},
	{80, "Hg", "Kwik", "Transition Metal", 6, 12},
	{81, "Tl", "Thallium", "Post-Transition Metal", 6, 13},
	{82, "Pb", "Lood", "Post-Transition Metal", 6, 14},
	{83, "Bi", "Bismut", "Post-Transition Metal", 6, 15},
	{84, "Po", "Polonium", "Post-Transition Metal", 6, 16},
	{85, "At", "Astatium", "Halogen", 6, 17},
	{86, "Rn", "Radon", "Noble Gas", 6, 18},
	-- Row 7
	{87, "Fr", "Francium", "Alkali Metal", 7, 1},
	{88, "Ra", "Radium", "Alkaline Earth Metal", 7, 2},
	{89, "Ac", "Actinium", "Actinide", 7, 3},
	{104, "Rf", "Rutherfordium", "Transition Metal", 7, 4},
	{105, "Db", "Dubnium", "Transition Metal", 7, 5},
	{106, "Sg", "Seaborgium", "Transition Metal", 7, 6},
	{107, "Bh", "Bohrium", "Transition Metal", 7, 7},
	{108, "Hs", "Hassium", "Transition Metal", 7, 8},
	{109, "Mt", "Meitnerium", "Unknown", 7, 9},
	{110, "Ds", "Darmstadtium", "Unknown", 7, 10},
	{111, "Rg", "Roentgenium", "Unknown", 7, 11},
	{112, "Cn", "Copernicium", "Unknown", 7, 12},
	{113, "Nh", "Nihonium", "Unknown", 7, 13},
	{114, "Fl", "Flerovium", "Unknown", 7, 14},
	{115, "Mc", "Moscovium", "Unknown", 7, 15},
	{116, "Lv", "Livermorium", "Unknown", 7, 16},
	{117, "Ts", "Tennessine", "Unknown", 7, 17},
	{118, "Og", "Oganesson", "Unknown", 7, 18},
	-- Row 8 — Lanthanides (Ce-Lu, displayed at cols 3-17 below main table)
	{58, "Ce", "Cerium", "Lanthanide", 9, 3},
	{59, "Pr", "Praseodymium", "Lanthanide", 9, 4},
	{60, "Nd", "Neodymium", "Lanthanide", 9, 5},
	{61, "Pm", "Promethium", "Lanthanide", 9, 6},
	{62, "Sm", "Samarium", "Lanthanide", 9, 7},
	{63, "Eu", "Europium", "Lanthanide", 9, 8},
	{64, "Gd", "Gadolinium", "Lanthanide", 9, 9},
	{65, "Tb", "Terbium", "Lanthanide", 9, 10},
	{66, "Dy", "Dysprosium", "Lanthanide", 9, 11},
	{67, "Ho", "Holmium", "Lanthanide", 9, 12},
	{68, "Er", "Erbium", "Lanthanide", 9, 13},
	{69, "Tm", "Thulium", "Lanthanide", 9, 14},
	{70, "Yb", "Ytterbium", "Lanthanide", 9, 15},
	{71, "Lu", "Lutetium", "Lanthanide", 9, 16},
	-- Row 9 — Actinides (Th-Lr, displayed at cols 3-17 below lanthanides)
	{90, "Th", "Thorium", "Actinide", 10, 3},
	{91, "Pa", "Protactinium", "Actinide", 10, 4},
	{92, "U", "Uranium", "Actinide", 10, 5},
	{93, "Np", "Neptunium", "Actinide", 10, 6},
	{94, "Pu", "Plutonium", "Actinide", 10, 7},
	{95, "Am", "Americium", "Actinide", 10, 8},
	{96, "Cm", "Curium", "Actinide", 10, 9},
	{97, "Bk", "Berkelium", "Actinide", 10, 10},
	{98, "Cf", "Californium", "Actinide", 10, 11},
	{99, "Es", "Einsteinium", "Actinide", 10, 12},
	{100, "Fm", "Fermium", "Actinide", 10, 13},
	{101, "Md", "Mendelevium", "Actinide", 10, 14},
	{102, "No", "Nobelium", "Actinide", 10, 15},
	{103, "Lr", "Lawrencium", "Actinide", 10, 16},
}

--------------------------------------------------------------------------------
-- UTILITY FUNCTIONS
--------------------------------------------------------------------------------

local function createCorner(parent, radius)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius or 6)
	c.Parent = parent
	return c
end

local function createStroke(parent, color, thickness)
	local s = Instance.new("UIStroke")
	s.Color = color or COLORS.accent
	s.Thickness = thickness or 1
	s.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	s.Parent = parent
	return s
end

local function createTextLabel(parent, props)
	local label = Instance.new("TextLabel")
	label.Name = props.Name or "Label"
	label.Size = props.Size or UDim2.new(1, 0, 1, 0)
	label.Position = props.Position or UDim2.new(0, 0, 0, 0)
	label.AnchorPoint = props.AnchorPoint or Vector2.new(0, 0)
	label.BackgroundTransparency = 1
	label.Text = props.Text or ""
	label.TextColor3 = props.TextColor3 or COLORS.textPrimary
	label.TextScaled = true
	label.Font = props.Font or Enum.Font.GothamBold
	label.TextXAlignment = props.TextXAlignment or Enum.TextXAlignment.Center
	label.TextYAlignment = props.TextYAlignment or Enum.TextYAlignment.Center
	label.RichText = props.RichText or false
	label.ZIndex = props.ZIndex or 1
	label.Parent = parent
	return label
end

local function tweenProperty(instance, props, duration, style, direction)
	local info = TweenInfo.new(
		duration or 0.3,
		style or Enum.EasingStyle.Quart,
		direction or Enum.EasingDirection.Out
	)
	local tween = TweenService:Create(instance, info, props)
	tween:Play()
	return tween
end

local function getGroupColor(groupName)
	return GROUP_COLORS[groupName] or GROUP_COLORS["Unknown"]
end

--------------------------------------------------------------------------------
-- SCREEN GUI
--------------------------------------------------------------------------------

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "PeriodicTableGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 10
screenGui.Enabled = false
screenGui.Parent = playerGui

--------------------------------------------------------------------------------
-- BACKGROUND OVERLAY
--------------------------------------------------------------------------------

local bgOverlay = Instance.new("Frame")
bgOverlay.Name = "Background"
bgOverlay.Size = UDim2.new(1, 0, 1, 0)
bgOverlay.BackgroundColor3 = COLORS.bgOverlay
bgOverlay.BackgroundTransparency = 0.3
bgOverlay.ZIndex = 1
bgOverlay.Parent = screenGui

--------------------------------------------------------------------------------
-- MAIN CONTAINER (centered, with aspect ratio)
--------------------------------------------------------------------------------

local mainContainer = Instance.new("Frame")
mainContainer.Name = "MainContainer"
mainContainer.Size = UDim2.new(0.95, 0, 0.92, 0)
mainContainer.Position = UDim2.new(0.5, 0, 0.5, 0)
mainContainer.AnchorPoint = Vector2.new(0.5, 0.5)
mainContainer.BackgroundColor3 = COLORS.panel
mainContainer.BackgroundTransparency = 0.05
mainContainer.ZIndex = 2
mainContainer.Parent = screenGui
createCorner(mainContainer, 16)
createStroke(mainContainer, COLORS.accent, 2)

-- UI Scale for responsive sizing
local globalScale = Instance.new("UIScale")
globalScale.Scale = 1
globalScale.Parent = mainContainer

--------------------------------------------------------------------------------
-- HEADER: Title + Progress Bar + Close Button
--------------------------------------------------------------------------------

local header = Instance.new("Frame")
header.Name = "Header"
header.Size = UDim2.new(1, -24, 0, 55)
header.Position = UDim2.new(0, 12, 0, 8)
header.BackgroundTransparency = 1
header.ZIndex = 3
header.Parent = mainContainer

-- Title
local title = createTextLabel(header, {
	Name = "Title",
	Size = UDim2.new(0, 300, 0, 30),
	Position = UDim2.new(0, 0, 0, 2),
	Text = "PERIODIEK SYSTEEM",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.accent,
	TextXAlignment = Enum.TextXAlignment.Left,
	ZIndex = 3,
})

-- Progress text
local progressText = createTextLabel(header, {
	Name = "ProgressText",
	Size = UDim2.new(0, 200, 0, 18),
	Position = UDim2.new(0, 0, 0, 34),
	Text = "0/118 elements discovered",
	Font = Enum.Font.GothamMedium,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Left,
	ZIndex = 3,
})

-- Progress bar background
local progressBarBg = Instance.new("Frame")
progressBarBg.Name = "ProgressBarBg"
progressBarBg.Size = UDim2.new(0.5, 0, 0, 10)
progressBarBg.Position = UDim2.new(0.25, 0, 0, 40)
progressBarBg.BackgroundColor3 = COLORS.progressBg
progressBarBg.ZIndex = 3
progressBarBg.Parent = header
createCorner(progressBarBg, 5)

local progressBarFill = Instance.new("Frame")
progressBarFill.Name = "Fill"
progressBarFill.Size = UDim2.new(0, 0, 1, 0)
progressBarFill.BackgroundColor3 = COLORS.progressFill
progressBarFill.ZIndex = 4
progressBarFill.Parent = progressBarBg
createCorner(progressBarFill, 5)

-- Milestone badges
local milestones = {
	{count = 10, label = "Beginner", pos = UDim2.new(0.78, 0, 0, 4)},
	{count = 50, label = "Chemist", pos = UDim2.new(0.78, 0, 0, 22)},
	{count = 118, label = "PeriodicMaster", pos = UDim2.new(0.78, 0, 0, 40)},
}

local milestoneBadges = {}
for _, ms in ipairs(milestones) do
	local badge = Instance.new("Frame")
	badge.Name = "Badge_" .. ms.label
	badge.Size = UDim2.new(0, 150, 0, 16)
	badge.Position = ms.pos
	badge.BackgroundColor3 = COLORS.panelLight
	badge.BackgroundTransparency = 0.3
	badge.ZIndex = 3
	badge.Parent = header
	createCorner(badge, 4)

	local badgeText = createTextLabel(badge, {
		Name = "Text",
		Size = UDim2.new(1, -4, 1, 0),
		Position = UDim2.new(0, 2, 0, 0),
		Text = ms.count .. " — " .. ms.label,
		Font = Enum.Font.GothamMedium,
		TextColor3 = COLORS.textSecondary,
		TextXAlignment = Enum.TextXAlignment.Left,
		ZIndex = 4,
	})

	milestoneBadges[ms.count] = {frame = badge, text = badgeText, unlocked = false}
end

-- Close button (X) top-right
local closeBtn = Instance.new("TextButton")
closeBtn.Name = "CloseBtn"
closeBtn.Size = UDim2.new(0, 40, 0, 40)
closeBtn.Position = UDim2.new(1, -4, 0, 0)
closeBtn.AnchorPoint = Vector2.new(1, 0)
closeBtn.BackgroundColor3 = COLORS.closeBtn
closeBtn.Text = "X"
closeBtn.TextColor3 = COLORS.textPrimary
closeBtn.TextScaled = true
closeBtn.Font = Enum.Font.GothamBlack
closeBtn.ZIndex = 5
closeBtn.Parent = header
createCorner(closeBtn, 8)

closeBtn.MouseButton1Click:Connect(function()
	screenGui.Enabled = false
end)

--------------------------------------------------------------------------------
-- TABLE GRID CONTAINER
--------------------------------------------------------------------------------

-- The periodic table uses absolute positioning within a grid frame
-- 18 columns, 10 rows (7 main + 1 gap + 2 for lanthanides/actinides)
local CELL_SIZE = 46
local CELL_PAD = 3
local TOTAL_COLS = 18
local TOTAL_ROWS = 10

local gridWidth = TOTAL_COLS * (CELL_SIZE + CELL_PAD) - CELL_PAD
local gridHeight = TOTAL_ROWS * (CELL_SIZE + CELL_PAD) - CELL_PAD + 20 -- extra for gap row

local tableContainer = Instance.new("Frame")
tableContainer.Name = "TableGrid"
tableContainer.Size = UDim2.new(0, gridWidth, 0, gridHeight)
tableContainer.Position = UDim2.new(0.5, 0, 0, 70)
tableContainer.AnchorPoint = Vector2.new(0.5, 0)
tableContainer.BackgroundTransparency = 1
tableContainer.ZIndex = 3
tableContainer.ClipsDescendants = false
tableContainer.Parent = mainContainer

-- UIAspectRatioConstraint to keep the table readable
local aspect = Instance.new("UIAspectRatioConstraint")
aspect.AspectRatio = gridWidth / gridHeight
aspect.AspectType = Enum.AspectType.FitWithinMaxSize
aspect.DominantAxis = Enum.DominantAxis.Width
aspect.Parent = tableContainer

-- Separator labels for Lanthanides / Actinides
local lanthanideLabel = createTextLabel(tableContainer, {
	Name = "LanthanideLabel",
	Size = UDim2.new(0, 40, 0, CELL_SIZE),
	Position = UDim2.new(0, 0, 0, (9 - 1) * (CELL_SIZE + CELL_PAD) + 10),
	Text = "Ln",
	Font = Enum.Font.GothamBold,
	TextColor3 = GROUP_COLORS["Lanthanide"],
	TextXAlignment = Enum.TextXAlignment.Center,
	ZIndex = 3,
})

local actinideLabel = createTextLabel(tableContainer, {
	Name = "ActinideLabel",
	Size = UDim2.new(0, 40, 0, CELL_SIZE),
	Position = UDim2.new(0, 0, 0, (10 - 1) * (CELL_SIZE + CELL_PAD) + 10),
	Text = "Ac",
	Font = Enum.Font.GothamBold,
	TextColor3 = GROUP_COLORS["Actinide"],
	TextXAlignment = Enum.TextXAlignment.Center,
	ZIndex = 3,
})

--------------------------------------------------------------------------------
-- DETAIL POPUP (shown on hover/tap)
--------------------------------------------------------------------------------

local detailPopup = Instance.new("Frame")
detailPopup.Name = "DetailPopup"
detailPopup.Size = UDim2.new(0, 280, 0, 220)
detailPopup.Position = UDim2.new(0.5, 0, 0.5, 0)
detailPopup.AnchorPoint = Vector2.new(0.5, 0.5)
detailPopup.BackgroundColor3 = COLORS.panel
detailPopup.BackgroundTransparency = 0.05
detailPopup.Visible = false
detailPopup.ZIndex = 50
detailPopup.Parent = screenGui
createCorner(detailPopup, 14)
createStroke(detailPopup, COLORS.accent, 2)

-- Detail popup color header
local detailHeader = Instance.new("Frame")
detailHeader.Name = "Header"
detailHeader.Size = UDim2.new(1, 0, 0, 70)
detailHeader.BackgroundColor3 = COLORS.accent
detailHeader.BackgroundTransparency = 0.2
detailHeader.ZIndex = 51
detailHeader.Parent = detailPopup
createCorner(detailHeader, 14)

-- Clip the bottom corners of header
local detailHeaderClip = Instance.new("Frame")
detailHeaderClip.Name = "HeaderClip"
detailHeaderClip.Size = UDim2.new(1, 0, 0, 20)
detailHeaderClip.Position = UDim2.new(0, 0, 1, -20)
detailHeaderClip.BackgroundColor3 = COLORS.accent
detailHeaderClip.BackgroundTransparency = 0.2
detailHeaderClip.ZIndex = 51
detailHeaderClip.BorderSizePixel = 0
detailHeaderClip.Parent = detailHeader

-- Large symbol
local detailSymbol = createTextLabel(detailHeader, {
	Name = "Symbol",
	Size = UDim2.new(0, 60, 0, 55),
	Position = UDim2.new(0, 12, 0, 8),
	Text = "H",
	Font = Enum.Font.GothamBlack,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Center,
	ZIndex = 52,
})

-- Atomic number in header
local detailZ = createTextLabel(detailHeader, {
	Name = "AtomicNumber",
	Size = UDim2.new(0, 40, 0, 18),
	Position = UDim2.new(0, 14, 0, 2),
	Text = "1",
	Font = Enum.Font.Gotham,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Left,
	ZIndex = 52,
})

-- Name in header
local detailName = createTextLabel(detailHeader, {
	Name = "Name",
	Size = UDim2.new(0, 190, 0, 26),
	Position = UDim2.new(0, 78, 0, 10),
	Text = "Waterstof",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Left,
	ZIndex = 52,
})

-- Mass in header
local detailMass = createTextLabel(detailHeader, {
	Name = "Mass",
	Size = UDim2.new(0, 190, 0, 18),
	Position = UDim2.new(0, 78, 0, 36),
	Text = "1.008 u",
	Font = Enum.Font.Gotham,
	TextColor3 = COLORS.textPrimary,
	TextXAlignment = Enum.TextXAlignment.Left,
	ZIndex = 52,
})

-- Group + Period
local detailGroup = createTextLabel(detailPopup, {
	Name = "Group",
	Size = UDim2.new(1, -24, 0, 18),
	Position = UDim2.new(0, 12, 0, 76),
	Text = "Groep: Nonmetal | Periode: 1",
	Font = Enum.Font.GothamMedium,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Left,
	ZIndex = 51,
})

-- Game info
local detailGameInfo = createTextLabel(detailPopup, {
	Name = "GameInfo",
	Size = UDim2.new(1, -24, 0, 36),
	Position = UDim2.new(0, 12, 0, 98),
	Text = "",
	Font = Enum.Font.GothamMedium,
	TextColor3 = COLORS.accent,
	TextXAlignment = Enum.TextXAlignment.Left,
	TextYAlignment = Enum.TextYAlignment.Top,
	ZIndex = 51,
})

-- Real-world fact
local detailFact = createTextLabel(detailPopup, {
	Name = "Fact",
	Size = UDim2.new(1, -24, 0, 40),
	Position = UDim2.new(0, 12, 0, 138),
	Text = "",
	Font = Enum.Font.Gotham,
	TextColor3 = COLORS.textSecondary,
	TextXAlignment = Enum.TextXAlignment.Left,
	TextYAlignment = Enum.TextYAlignment.Top,
	ZIndex = 51,
})

-- Molgang link
local detailMolgang = createTextLabel(detailPopup, {
	Name = "MolgangLink",
	Size = UDim2.new(1, -24, 0, 18),
	Position = UDim2.new(0, 12, 0, 182),
	Text = "",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.gold,
	TextXAlignment = Enum.TextXAlignment.Left,
	ZIndex = 51,
})

-- Close popup on background click
local detailCloseBg = Instance.new("TextButton")
detailCloseBg.Name = "CloseBg"
detailCloseBg.Size = UDim2.new(1, 0, 1, 0)
detailCloseBg.BackgroundTransparency = 1
detailCloseBg.Text = ""
detailCloseBg.ZIndex = 49
detailCloseBg.Parent = screenGui
detailCloseBg.Visible = false

detailCloseBg.MouseButton1Click:Connect(function()
	detailPopup.Visible = false
	detailCloseBg.Visible = false
end)

-- Close popup via X in popup
local detailCloseBtn = Instance.new("TextButton")
detailCloseBtn.Name = "CloseBtn"
detailCloseBtn.Size = UDim2.new(0, 28, 0, 28)
detailCloseBtn.Position = UDim2.new(1, -32, 0, 4)
detailCloseBtn.BackgroundColor3 = COLORS.closeBtn
detailCloseBtn.Text = "X"
detailCloseBtn.TextColor3 = COLORS.textPrimary
detailCloseBtn.TextScaled = true
detailCloseBtn.Font = Enum.Font.GothamBold
detailCloseBtn.ZIndex = 53
detailCloseBtn.Parent = detailPopup
createCorner(detailCloseBtn, 6)

detailCloseBtn.MouseButton1Click:Connect(function()
	detailPopup.Visible = false
	detailCloseBg.Visible = false
end)

--------------------------------------------------------------------------------
-- ELEMENT CELL CREATION
--------------------------------------------------------------------------------

local foundElements = {} -- {[z] = true}
local recentlyFound = {} -- {[z] = tick()}
local elementButtons = {} -- {[z] = button}

local function showElementDetail(elemData)
	local z = elemData[1]
	local symbol = elemData[2]
	local name = elemData[3]
	local group = elemData[4]
	local row = elemData[5]
	local col = elemData[6]
	local color = getGroupColor(group)

	detailSymbol.Text = symbol
	detailZ.Text = tostring(z)
	detailName.Text = name
	detailGroup.Text = "Groep: " .. group .. " | Periode: " .. row
	detailHeader.BackgroundColor3 = color
	detailHeaderClip.BackgroundColor3 = color

	-- Fetch detailed info from server
	spawn(function()
		local success, info = pcall(function()
			return GetElementInfo:InvokeServer(z)
		end)
		if success and info then
			detailMass.Text = (info.mass or "?") .. " u"
			detailGameInfo.Text = info.gameInfo or "Collect this element in the world!"
			detailFact.Text = info.fact or ""
			detailMolgang.Text = info.molgangLink or ("MOLGANG Element #" .. z)
		else
			detailMass.Text = "? u"
			detailGameInfo.Text = foundElements[z] and "Gevonden!" or "Nog niet gevonden"
			detailFact.Text = ""
			detailMolgang.Text = "MOLGANG Element #" .. z
		end
	end)

	detailPopup.Visible = true
	detailCloseBg.Visible = true

	-- Animate popup in
	detailPopup.Size = UDim2.new(0, 200, 0, 150)
	detailPopup.BackgroundTransparency = 0.5
	tweenProperty(detailPopup, {
		Size = UDim2.new(0, 280, 0, 220),
		BackgroundTransparency = 0.05,
	}, 0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
end

local function getRowYOffset(row)
	if row <= 7 then
		return (row - 1) * (CELL_SIZE + CELL_PAD)
	else
		-- Rows 9 and 10 (lanthanides/actinides) are below a gap
		return (row - 1) * (CELL_SIZE + CELL_PAD) + 10
	end
end

local function createElementCell(elemData)
	local z = elemData[1]
	local symbol = elemData[2]
	local name = elemData[3]
	local group = elemData[4]
	local row = elemData[5]
	local col = elemData[6]
	local groupColor = getGroupColor(group)

	local xPos = (col - 1) * (CELL_SIZE + CELL_PAD)
	local yPos = getRowYOffset(row)

	local btn = Instance.new("TextButton")
	btn.Name = "Element_" .. z .. "_" .. symbol
	btn.Size = UDim2.new(0, CELL_SIZE, 0, CELL_SIZE)
	btn.Position = UDim2.new(0, xPos, 0, yPos)
	btn.BackgroundColor3 = COLORS.notFound
	btn.Text = ""
	btn.AutoButtonColor = false
	btn.ZIndex = 4
	btn.Parent = tableContainer
	createCorner(btn, 5)

	-- Atomic number (top-left, tiny)
	local zLabel = createTextLabel(btn, {
		Name = "Z",
		Size = UDim2.new(0.45, 0, 0.22, 0),
		Position = UDim2.new(0, 3, 0, 1),
		Text = tostring(z),
		Font = Enum.Font.Gotham,
		TextColor3 = COLORS.notFoundText,
		TextXAlignment = Enum.TextXAlignment.Left,
		ZIndex = 5,
	})

	-- Symbol (center, large)
	local symLabel = createTextLabel(btn, {
		Name = "Symbol",
		Size = UDim2.new(1, -4, 0.5, 0),
		Position = UDim2.new(0, 2, 0.2, 0),
		Text = symbol,
		Font = Enum.Font.GothamBlack,
		TextColor3 = COLORS.notFoundText,
		TextXAlignment = Enum.TextXAlignment.Center,
		ZIndex = 5,
	})

	-- Name (bottom, small) -- abbreviated if too long
	local displayName = #name > 7 and string.sub(name, 1, 6) .. "." or name
	local nameLabel = createTextLabel(btn, {
		Name = "Name",
		Size = UDim2.new(1, -4, 0.22, 0),
		Position = UDim2.new(0, 2, 0.75, 0),
		Text = displayName,
		Font = Enum.Font.Gotham,
		TextColor3 = COLORS.notFoundText,
		TextXAlignment = Enum.TextXAlignment.Center,
		ZIndex = 5,
	})

	-- Stroke (border) — will be gold if recently found
	local cellStroke = createStroke(btn, Color3.fromRGB(70, 70, 90), 1)

	-- Store references
	elementButtons[z] = {
		button = btn,
		zLabel = zLabel,
		symLabel = symLabel,
		nameLabel = nameLabel,
		stroke = cellStroke,
		groupColor = groupColor,
		data = elemData,
	}

	-- Click/tap handler
	btn.MouseButton1Click:Connect(function()
		showElementDetail(elemData)
	end)

	-- Hover effect
	btn.MouseEnter:Connect(function()
		tweenProperty(btn, {
			Size = UDim2.new(0, CELL_SIZE + 4, 0, CELL_SIZE + 4),
			Position = UDim2.new(0, xPos - 2, 0, yPos - 2),
		}, 0.15, Enum.EasingStyle.Quart)
		btn.ZIndex = 10
		zLabel.ZIndex = 11
		symLabel.ZIndex = 11
		nameLabel.ZIndex = 11
	end)

	btn.MouseLeave:Connect(function()
		tweenProperty(btn, {
			Size = UDim2.new(0, CELL_SIZE, 0, CELL_SIZE),
			Position = UDim2.new(0, xPos, 0, yPos),
		}, 0.15, Enum.EasingStyle.Quart)
		btn.ZIndex = 4
		zLabel.ZIndex = 5
		symLabel.ZIndex = 5
		nameLabel.ZIndex = 5
	end)
end

-- Create all element cells
for _, elemData in ipairs(ELEMENT_DATA) do
	createElementCell(elemData)
end

--------------------------------------------------------------------------------
-- UPDATE ELEMENT STATES (found / not found / recently found)
--------------------------------------------------------------------------------

local function updateElementStates()
	local foundCount = 0
	for z, cellInfo in pairs(elementButtons) do
		local isFound = foundElements[z] == true
		local isRecent = recentlyFound[z] and (tick() - recentlyFound[z]) < 300 -- 5 min "recent" window

		if isFound then
			foundCount = foundCount + 1
			cellInfo.button.BackgroundColor3 = cellInfo.groupColor
			cellInfo.zLabel.TextColor3 = COLORS.textPrimary
			cellInfo.symLabel.TextColor3 = COLORS.textPrimary
			cellInfo.nameLabel.TextColor3 = COLORS.textPrimary

			if isRecent then
				cellInfo.stroke.Color = COLORS.goldBorder
				cellInfo.stroke.Thickness = 2
			else
				cellInfo.stroke.Color = Color3.fromRGB(100, 100, 120)
				cellInfo.stroke.Thickness = 1
			end
		else
			cellInfo.button.BackgroundColor3 = COLORS.notFound
			cellInfo.zLabel.TextColor3 = COLORS.notFoundText
			cellInfo.symLabel.TextColor3 = COLORS.notFoundText
			cellInfo.nameLabel.TextColor3 = COLORS.notFoundText
			cellInfo.stroke.Color = Color3.fromRGB(70, 70, 90)
			cellInfo.stroke.Thickness = 1
		end
	end

	-- Update progress
	progressText.Text = foundCount .. "/118 elements discovered"
	local fillFraction = foundCount / 118
	tweenProperty(progressBarFill, {Size = UDim2.new(fillFraction, 0, 1, 0)}, 0.5)

	-- Update milestones
	for threshold, badge in pairs(milestoneBadges) do
		if foundCount >= threshold and not badge.unlocked then
			badge.unlocked = true
			badge.frame.BackgroundColor3 = COLORS.gold
			badge.frame.BackgroundTransparency = 0.1
			badge.text.TextColor3 = COLORS.panel

			-- Animate unlock
			tweenProperty(badge.frame, {Size = UDim2.new(0, 165, 0, 20)}, 0.2, Enum.EasingStyle.Back)
			task.delay(0.3, function()
				tweenProperty(badge.frame, {Size = UDim2.new(0, 150, 0, 16)}, 0.3, Enum.EasingStyle.Elastic)
			end)
		elseif foundCount < threshold then
			badge.unlocked = false
			badge.frame.BackgroundColor3 = COLORS.panelLight
			badge.frame.BackgroundTransparency = 0.3
			badge.text.TextColor3 = COLORS.textSecondary
		end
	end
end

--------------------------------------------------------------------------------
-- LEGEND (bottom-left of table)
--------------------------------------------------------------------------------

local legendFrame = Instance.new("Frame")
legendFrame.Name = "Legend"
legendFrame.Size = UDim2.new(0, 200, 0, 180)
legendFrame.Position = UDim2.new(0, 12, 1, -192)
legendFrame.BackgroundColor3 = COLORS.panel
legendFrame.BackgroundTransparency = 0.3
legendFrame.ZIndex = 3
legendFrame.Parent = mainContainer
createCorner(legendFrame, 8)

local legendTitle = createTextLabel(legendFrame, {
	Name = "Title",
	Size = UDim2.new(1, -8, 0, 18),
	Position = UDim2.new(0, 4, 0, 2),
	Text = "LEGENDA",
	Font = Enum.Font.GothamBold,
	TextColor3 = COLORS.accent,
	TextXAlignment = Enum.TextXAlignment.Left,
	ZIndex = 4,
})

local legendGroups = {
	"Alkali Metal", "Alkaline Earth Metal", "Transition Metal",
	"Post-Transition Metal", "Metalloid", "Nonmetal",
	"Halogen", "Noble Gas", "Lanthanide", "Actinide",
}

for i, groupName in ipairs(legendGroups) do
	local y = 22 + (i - 1) * 15

	local swatch = Instance.new("Frame")
	swatch.Name = "Swatch_" .. i
	swatch.Size = UDim2.new(0, 12, 0, 12)
	swatch.Position = UDim2.new(0, 6, 0, y)
	swatch.BackgroundColor3 = getGroupColor(groupName)
	swatch.ZIndex = 4
	swatch.Parent = legendFrame
	createCorner(swatch, 3)

	local label = createTextLabel(legendFrame, {
		Name = "Label_" .. i,
		Size = UDim2.new(1, -26, 0, 14),
		Position = UDim2.new(0, 22, 0, y - 1),
		Text = groupName,
		Font = Enum.Font.Gotham,
		TextColor3 = COLORS.textSecondary,
		TextXAlignment = Enum.TextXAlignment.Left,
		ZIndex = 4,
	})
end

--------------------------------------------------------------------------------
-- DATA LOADING
--------------------------------------------------------------------------------

local function loadPlayerElementData()
	local success, data = pcall(function()
		return GetPlayerData:InvokeServer()
	end)

	if success and data and data.elements then
		for zStr, count in pairs(data.elements) do
			local z = tonumber(zStr)
			if z and count > 0 then
				foundElements[z] = true
			end
		end
	end

	updateElementStates()
end

-- Load data when GUI becomes visible
screenGui:GetPropertyChangedSignal("Enabled"):Connect(function()
	if screenGui.Enabled then
		loadPlayerElementData()

		-- Animate open
		mainContainer.Size = UDim2.new(0.5, 0, 0.5, 0)
		mainContainer.BackgroundTransparency = 0.5
		tweenProperty(mainContainer, {
			Size = UDim2.new(0.95, 0, 0.92, 0),
			BackgroundTransparency = 0.05,
		}, 0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
	end
end)

--------------------------------------------------------------------------------
-- LISTEN FOR NEW ELEMENT DISCOVERIES
--------------------------------------------------------------------------------

local AtomCollected = Remotes:WaitForChild("AtomCollected")

AtomCollected.OnClientEvent:Connect(function(data)
	if not data then return end
	local z = data.atomicNumber
	if z then
		local wasNew = not foundElements[z]
		foundElements[z] = true
		if wasNew then
			recentlyFound[z] = tick()
		end
		updateElementStates()

		-- Flash the cell if the table is visible
		if screenGui.Enabled and elementButtons[z] then
			local cell = elementButtons[z]
			tweenProperty(cell.button, {BackgroundColor3 = COLORS.gold}, 0.2)
			task.delay(0.3, function()
				tweenProperty(cell.button, {BackgroundColor3 = cell.groupColor}, 0.5)
			end)
		end
	end
end)

--------------------------------------------------------------------------------
-- KEYBOARD SHORTCUT: P to toggle
--------------------------------------------------------------------------------

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.P then
		screenGui.Enabled = not screenGui.Enabled
	end
end)

--------------------------------------------------------------------------------
-- RESPONSIVE SCALING
--------------------------------------------------------------------------------

local function updateScale()
	local viewport = workspace.CurrentCamera.ViewportSize
	local minDim = math.min(viewport.X, viewport.Y)

	if minDim < 500 then
		globalScale.Scale = 0.5
	elseif minDim < 700 then
		globalScale.Scale = 0.65
	elseif minDim < 900 then
		globalScale.Scale = 0.8
	else
		globalScale.Scale = 1
	end
end

workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
updateScale()

print("[MOLGANG] PeriodicTableGui loaded successfully")
