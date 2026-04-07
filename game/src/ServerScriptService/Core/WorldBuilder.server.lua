--[[
	WorldBuilder.server.lua
	MOLGANG - Moleculia World Builder

	Creates the entire 3D world of Moleculia: a floating archipelago in space
	with bioluminescent sci-fi + Dutch-style structures across 6 zones.
	World diameter: ~4000x4000 studs.

	Zones:
	  1. Centrum      - Molgang Nexus Hub (spawn)
	  2. Noord        - Periodic Table Biome
	  3. Oost         - Quantum Lab
	  4. West         - Slakkenspoor Fabriek
	  5. Centrum-Oost - MolChain Registry Tower
	  6. Centrum-West - ANK Kredietunie
--]]

local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")
local CollectionService = game:GetService("CollectionService")

--------------------------------------------------------------------------------
-- CONFIGURATION
--------------------------------------------------------------------------------

local CONFIG = {
	-- Global colors
	SPACE_BG        = Color3.fromRGB(5, 8, 12),
	NEON_GREEN      = Color3.fromRGB(0, 255, 120),
	NEON_PURPLE     = Color3.fromRGB(160, 80, 255),
	NEON_BLUE       = Color3.fromRGB(80, 180, 255),
	GOLD            = Color3.fromRGB(218, 165, 32),
	ANK_GREEN       = Color3.fromRGB(34, 139, 34),
	GLASS_TINT      = Color3.fromRGB(180, 220, 255),
	INDUSTRIAL_GREY = Color3.fromRGB(90, 90, 95),
	DARK_METAL      = Color3.fromRGB(50, 50, 55),
	LAVA_RED        = Color3.fromRGB(200, 50, 30),
	ICE_BLUE        = Color3.fromRGB(160, 220, 255),
	XRPL_GREEN      = Color3.fromRGB(35, 200, 100),
	V2O5_YELLOW     = Color3.fromRGB(220, 200, 50),
	FE_GREY         = Color3.fromRGB(140, 140, 145),
	SIK_GREEN       = Color3.fromRGB(80, 180, 80),
	STEAM_WHITE     = Color3.fromRGB(220, 225, 230),
	PURPLE_MIST     = Color3.fromRGB(120, 60, 200),

	-- Element group colors for Periodic Table Biome
	ALKALI_RED       = Color3.fromRGB(200, 60, 60),
	NOBLE_PURPLE     = Color3.fromRGB(140, 80, 200),
	TRANSITION_BLUE  = Color3.fromRGB(100, 120, 160),
	LANTHANIDE_TEAL  = Color3.fromRGB(60, 180, 160),
	HALOGEN_ORANGE   = Color3.fromRGB(220, 140, 40),
}

--------------------------------------------------------------------------------
-- HELPER FUNCTIONS
--------------------------------------------------------------------------------

-- Create a basic Part with common properties
local function createPart(parent: Instance, config: {
	Name: string?,
	Size: Vector3?,
	Position: Vector3?,
	Color: Color3?,
	Material: Enum.Material?,
	Transparency: number?,
	Shape: Enum.PartType?,
	Anchored: boolean?,
	CanCollide: boolean?,
}): Part
	local part = Instance.new("Part")
	part.Name = config.Name or "Part"
	part.Size = config.Size or Vector3.new(4, 1, 4)
	part.Position = config.Position or Vector3.new(0, 0, 0)
	part.Color = config.Color or Color3.fromRGB(128, 128, 128)
	part.Material = config.Material or Enum.Material.SmoothPlastic
	part.Transparency = config.Transparency or 0
	part.Shape = config.Shape or Enum.PartType.Block
	part.Anchored = if config.Anchored ~= nil then config.Anchored else true
	part.CanCollide = if config.CanCollide ~= nil then config.CanCollide else true
	part.Parent = parent
	return part
end

-- Create a cylindrical part
local function createCylinder(parent: Instance, config: {
	Name: string?,
	Size: Vector3?,
	Position: Vector3?,
	Color: Color3?,
	Material: Enum.Material?,
	Transparency: number?,
	Orientation: Vector3?,
}): Part
	local part = createPart(parent, {
		Name = config.Name,
		Size = config.Size,
		Position = config.Position,
		Color = config.Color,
		Material = config.Material,
		Transparency = config.Transparency,
		Shape = Enum.PartType.Cylinder,
	})
	part.Orientation = config.Orientation or Vector3.new(0, 0, 0)
	return part
end

-- Create a sphere part
local function createSphere(parent: Instance, config: {
	Name: string?,
	Size: Vector3?,
	Position: Vector3?,
	Color: Color3?,
	Material: Enum.Material?,
	Transparency: number?,
}): Part
	local part = createPart(parent, {
		Name = config.Name,
		Size = config.Size,
		Position = config.Position,
		Color = config.Color,
		Material = config.Material,
		Transparency = config.Transparency,
		Shape = Enum.PartType.Ball,
	})
	return part
end

-- Create a Model container
local function createModel(parent: Instance, name: string): Model
	local model = Instance.new("Model")
	model.Name = name
	model.Parent = parent
	return model
end

-- Create a Folder
local function createFolder(parent: Instance, name: string): Folder
	local folder = Instance.new("Folder")
	folder.Name = name
	folder.Parent = parent
	return folder
end

-- Add a PointLight to a part
local function addPointLight(parent: Instance, config: {
	Color: Color3?,
	Brightness: number?,
	Range: number?,
}): PointLight
	local light = Instance.new("PointLight")
	light.Color = config.Color or Color3.new(1, 1, 1)
	light.Brightness = config.Brightness or 1
	light.Range = config.Range or 30
	light.Parent = parent
	return light
end

-- Add a SpotLight to a part
local function addSpotLight(parent: Instance, config: {
	Color: Color3?,
	Brightness: number?,
	Range: number?,
	Angle: number?,
	Face: Enum.NormalId?,
}): SpotLight
	local light = Instance.new("SpotLight")
	light.Color = config.Color or Color3.new(1, 1, 1)
	light.Brightness = config.Brightness or 1
	light.Range = config.Range or 30
	light.Angle = config.Angle or 90
	light.Face = config.Face or Enum.NormalId.Front
	light.Parent = parent
	return light
end

-- Add a SurfaceLight to a part
local function addSurfaceLight(parent: Instance, config: {
	Color: Color3?,
	Brightness: number?,
	Range: number?,
	Face: Enum.NormalId?,
}): SurfaceLight
	local light = Instance.new("SurfaceLight")
	light.Color = config.Color or Color3.new(1, 1, 1)
	light.Brightness = config.Brightness or 1
	light.Range = config.Range or 20
	light.Face = config.Face or Enum.NormalId.Top
	light.Parent = parent
	return light
end

-- Create a ParticleEmitter
local function addParticleEmitter(parent: Instance, config: {
	Color: ColorSequence?,
	Size: NumberSequence?,
	Transparency: NumberSequence?,
	Lifetime: NumberRange?,
	Rate: number?,
	Speed: NumberRange?,
	SpreadAngle: Vector2?,
	Texture: string?,
	LightEmission: number?,
	LightInfluence: number?,
}): ParticleEmitter
	local emitter = Instance.new("ParticleEmitter")
	emitter.Color = config.Color or ColorSequence.new(Color3.new(1, 1, 1))
	emitter.Size = config.Size or NumberSequence.new(1)
	emitter.Transparency = config.Transparency or NumberSequence.new(0, 1)
	emitter.Lifetime = config.Lifetime or NumberRange.new(2, 4)
	emitter.Rate = config.Rate or 10
	emitter.Speed = config.Speed or NumberRange.new(2, 5)
	emitter.SpreadAngle = config.SpreadAngle or Vector2.new(15, 15)
	emitter.LightEmission = config.LightEmission or 0.5
	emitter.LightInfluence = config.LightInfluence or 0
	if config.Texture then
		emitter.Texture = config.Texture
	end
	emitter.Parent = parent
	return emitter
end

-- Create a BillboardGui with text label on a part
local function addBillboard(parent: Instance, config: {
	Text: string,
	Size: UDim2?,
	StudsOffset: Vector3?,
	TextColor: Color3?,
	BackgroundColor: Color3?,
	BackgroundTransparency: number?,
	TextSize: number?,
	Font: Enum.Font?,
	MaxDistance: number?,
}): BillboardGui
	local billboard = Instance.new("BillboardGui")
	billboard.Name = "Billboard"
	billboard.Size = config.Size or UDim2.new(10, 0, 3, 0)
	billboard.StudsOffset = config.StudsOffset or Vector3.new(0, 5, 0)
	billboard.AlwaysOnTop = false
	billboard.MaxDistance = config.MaxDistance or 200
	billboard.Parent = parent

	local label = Instance.new("TextLabel")
	label.Name = "Label"
	label.Size = UDim2.new(1, 0, 1, 0)
	label.BackgroundColor3 = config.BackgroundColor or Color3.fromRGB(10, 15, 20)
	label.BackgroundTransparency = config.BackgroundTransparency or 0.4
	label.TextColor3 = config.TextColor or Color3.new(1, 1, 1)
	label.TextScaled = true
	label.Font = config.Font or Enum.Font.GothamBold
	label.Text = config.Text
	label.TextWrapped = true
	label.Parent = billboard

	-- Rounded corners
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0.1, 0)
	corner.Parent = label

	return billboard
end

-- Tag a part for interactions
local function tagInteractable(part: Instance, interactionType: string?)
	part:SetAttribute("Interactable", true)
	if interactionType then
		part:SetAttribute("InteractionType", interactionType)
	end
	CollectionService:AddTag(part, "Interactable")
end

-- Tag a part with a zone identifier
local function tagZone(part: Instance, zoneName: string)
	part:SetAttribute("Zone", zoneName)
	CollectionService:AddTag(part, "Zone_" .. zoneName)
end

-- Create a wedge part (for ramps / spiral elements)
local function createWedge(parent: Instance, config: {
	Name: string?,
	Size: Vector3?,
	Position: Vector3?,
	Orientation: Vector3?,
	Color: Color3?,
	Material: Enum.Material?,
	Transparency: number?,
}): WedgePart
	local wedge = Instance.new("WedgePart")
	wedge.Name = config.Name or "Wedge"
	wedge.Size = config.Size or Vector3.new(4, 1, 4)
	wedge.Position = config.Position or Vector3.new(0, 0, 0)
	wedge.Orientation = config.Orientation or Vector3.new(0, 0, 0)
	wedge.Color = config.Color or Color3.fromRGB(128, 128, 128)
	wedge.Material = config.Material or Enum.Material.SmoothPlastic
	wedge.Transparency = config.Transparency or 0
	wedge.Anchored = true
	wedge.CanCollide = true
	wedge.Parent = parent
	return wedge
end

-- Create a platform (commonly used floating island base)
local function createPlatform(parent: Instance, config: {
	Name: string?,
	Position: Vector3,
	Size: Vector3?,
	Color: Color3?,
	Material: Enum.Material?,
	TopGlow: boolean?,
	GlowColor: Color3?,
}): Part
	local size = config.Size or Vector3.new(100, 4, 100)
	local platform = createPart(parent, {
		Name = config.Name or "Platform",
		Size = size,
		Position = config.Position,
		Color = config.Color or Color3.fromRGB(30, 35, 40),
		Material = config.Material or Enum.Material.SmoothPlastic,
	})

	-- Bioluminescent underside glow
	local underGlow = createPart(parent, {
		Name = (config.Name or "Platform") .. "_UnderGlow",
		Size = Vector3.new(size.X * 0.9, 0.5, size.Z * 0.9),
		Position = config.Position - Vector3.new(0, size.Y / 2 + 0.3, 0),
		Color = config.GlowColor or CONFIG.NEON_GREEN,
		Material = Enum.Material.Neon,
		Transparency = 0.3,
		CanCollide = false,
	})

	if config.TopGlow then
		addSurfaceLight(platform, {
			Color = config.GlowColor or CONFIG.NEON_GREEN,
			Brightness = 0.6,
			Range = 20,
			Face = Enum.NormalId.Top,
		})
	end

	return platform
end

-- Create a column/pillar
local function createColumn(parent: Instance, config: {
	Name: string?,
	Position: Vector3,
	Height: number?,
	Radius: number?,
	Color: Color3?,
	Material: Enum.Material?,
}): Part
	local height = config.Height or 20
	local radius = config.Radius or 2
	local col = createCylinder(parent, {
		Name = config.Name or "Column",
		Size = Vector3.new(height, radius * 2, radius * 2),
		Position = config.Position + Vector3.new(0, height / 2, 0),
		Color = config.Color or Color3.fromRGB(200, 200, 205),
		Material = config.Material or Enum.Material.SmoothPlastic,
		Orientation = Vector3.new(0, 0, 90),
	})
	return col
end

--------------------------------------------------------------------------------
-- LIGHTING SETUP
--------------------------------------------------------------------------------

local function setupLighting()
	-- Base lighting
	Lighting.Ambient = Color3.fromRGB(30, 50, 40)
	Lighting.OutdoorAmbient = Color3.fromRGB(20, 35, 30)
	Lighting.Brightness = 0.3
	Lighting.ClockTime = 0 -- Midnight sky for space look
	Lighting.GlobalShadows = true
	Lighting.Technology = Enum.Technology.Future

	-- Remove existing post-processing if any to prevent duplicates
	for _, child in Lighting:GetChildren() do
		if child:IsA("BloomEffect") or child:IsA("ColorCorrectionEffect")
			or child:IsA("Atmosphere") or child:IsA("Sky") then
			child:Destroy()
		end
	end

	-- Atmosphere
	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Density = 0.2
	atmosphere.Color = Color3.fromRGB(180, 220, 255)
	atmosphere.Decay = Color3.fromRGB(30, 50, 40)
	atmosphere.Glare = 0.1
	atmosphere.Haze = 1
	atmosphere.Offset = 0.5
	atmosphere.Parent = Lighting

	-- Bloom
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 1.5
	bloom.Size = 24
	bloom.Threshold = 0.8
	bloom.Parent = Lighting

	-- Color Correction
	local colorCorrection = Instance.new("ColorCorrectionEffect")
	colorCorrection.Contrast = 0.15
	colorCorrection.Saturation = 0.3
	colorCorrection.Brightness = 0.02
	colorCorrection.TintColor = Color3.fromRGB(240, 245, 255)
	colorCorrection.Parent = Lighting

	-- Sky
	local sky = Instance.new("Sky")
	sky.SkyboxBk = "rbxassetid://1012890" -- Milky Way placeholder
	sky.SkyboxDn = "rbxassetid://1012890"
	sky.SkyboxFt = "rbxassetid://1012890"
	sky.SkyboxLf = "rbxassetid://1012890"
	sky.SkyboxRt = "rbxassetid://1012890"
	sky.SkyboxUp = "rbxassetid://1012890"
	sky.StarCount = 5000
	sky.CelestialBodiesShown = false
	sky.Parent = Lighting

	print("[WorldBuilder] Lighting configured: Moleculia night-space ambiance")
end

--------------------------------------------------------------------------------
-- REMOVE DEFAULT BASEPLATE
--------------------------------------------------------------------------------

local function removeBaseplate()
	local baseplate = Workspace:FindFirstChild("Baseplate")
	if baseplate then
		baseplate:Destroy()
	end
	-- Also remove the default terrain fill
	Workspace.Terrain:Clear()
	print("[WorldBuilder] Baseplate removed - floating archipelago mode")
end

--------------------------------------------------------------------------------
-- ZONE 1: NEXUS HUB (CENTRUM / SPAWN)
--------------------------------------------------------------------------------

local function buildNexusHub(zonesFolder: Folder)
	local zone = createModel(zonesFolder, "Zone1_NexusHub")
	tagZone(zone, "Centrum")

	-- Central platform
	local mainPlatform = createPlatform(zone, {
		Name = "NexusPlatform",
		Position = Vector3.new(0, 10, 0),
		Size = Vector3.new(200, 6, 200),
		Color = Color3.fromRGB(35, 40, 48),
		TopGlow = true,
		GlowColor = CONFIG.NEON_GREEN,
	})
	tagZone(mainPlatform, "Centrum")

	-- Decorative rim around platform
	for i = 0, 3 do
		local angle = i * math.pi / 2
		local rimX = math.cos(angle) * 100
		local rimZ = math.sin(angle) * 100
		local rimPart = createPart(zone, {
			Name = "PlatformRim_" .. i,
			Size = if i % 2 == 0 then Vector3.new(200, 2, 4) else Vector3.new(4, 2, 200),
			Position = Vector3.new(rimX, 14, rimZ),
			Color = CONFIG.NEON_GREEN,
			Material = Enum.Material.Neon,
		})
		addPointLight(rimPart, {
			Color = CONFIG.NEON_GREEN,
			Brightness = 0.8,
			Range = 15,
		})
	end

	-- SpawnLocation
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "MolGangSpawn"
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.Position = Vector3.new(0, 14, 0)
	spawn.Color = CONFIG.NEON_GREEN
	spawn.Material = Enum.Material.Neon
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.Parent = zone
	addPointLight(spawn, {
		Color = CONFIG.NEON_GREEN,
		Brightness = 2,
		Range = 30,
	})
	tagZone(spawn, "Centrum")

	-- ================================================================
	-- MolChain Tower (in Nexus Hub - a preview/landmark, full tower at Zone 5)
	-- ================================================================
	local towerModel = createModel(zone, "MolChainTower_Preview")

	-- Tower base cylinder
	local towerBase = createCylinder(towerModel, {
		Name = "TowerBase",
		Size = Vector3.new(200, 20, 20),
		Position = Vector3.new(60, 113, -60),
		Color = Color3.fromRGB(25, 30, 35),
		Material = Enum.Material.SmoothPlastic,
		Orientation = Vector3.new(0, 0, 90),
	})

	-- Tower neon core
	local towerCore = createCylinder(towerModel, {
		Name = "TowerNeonCore",
		Size = Vector3.new(200, 8, 8),
		Position = Vector3.new(60, 113, -60),
		Color = CONFIG.NEON_GREEN,
		Material = Enum.Material.Neon,
		Transparency = 0.2,
		Orientation = Vector3.new(0, 0, 90),
	})
	addPointLight(towerCore, {
		Color = CONFIG.NEON_GREEN,
		Brightness = 3,
		Range = 60,
	})

	-- Tower top beacon
	local beacon = createSphere(towerModel, {
		Name = "TowerBeacon",
		Size = Vector3.new(14, 14, 14),
		Position = Vector3.new(60, 214, -60),
		Color = CONFIG.NEON_GREEN,
		Material = Enum.Material.Neon,
	})
	addPointLight(beacon, {
		Color = CONFIG.NEON_GREEN,
		Brightness = 5,
		Range = 100,
	})
	tagInteractable(beacon, "MolChainBeacon")

	-- Tower rings (DNA-style hint)
	for ringIdx = 1, 8 do
		local ringY = 30 + ringIdx * 22
		local ringAngle = ringIdx * 45
		local ring = createPart(towerModel, {
			Name = "TowerRing_" .. ringIdx,
			Size = Vector3.new(26, 2, 26),
			Position = Vector3.new(60, ringY, -60),
			Color = if ringIdx % 2 == 0 then CONFIG.NEON_GREEN else CONFIG.NEON_BLUE,
			Material = Enum.Material.Neon,
			Transparency = 0.4,
			Shape = Enum.PartType.Cylinder,
		})
		ring.Orientation = Vector3.new(ringAngle, 0, 90)
	end

	addBillboard(towerBase, {
		Text = "MOLGANG: The Molecular Chain",
		Size = UDim2.new(16, 0, 4, 0),
		StudsOffset = Vector3.new(0, 20, 15),
		TextColor = CONFIG.NEON_GREEN,
		BackgroundColor = Color3.fromRGB(5, 10, 15),
		BackgroundTransparency = 0.3,
		MaxDistance = 400,
	})

	-- ================================================================
	-- ANK Building
	-- ================================================================
	local ankModel = createModel(zone, "ANK_Building")

	-- Main structure
	local ankMain = createPart(ankModel, {
		Name = "ANK_MainBlock",
		Size = Vector3.new(60, 40, 60),
		Position = Vector3.new(-60, 33, 50),
		Color = Color3.fromRGB(40, 50, 45),
		Material = Enum.Material.SmoothPlastic,
	})
	tagInteractable(ankMain, "ANK_Building")
	tagZone(ankMain, "Centrum")

	-- Glass front
	local ankGlass = createPart(ankModel, {
		Name = "ANK_GlassFront",
		Size = Vector3.new(58, 38, 2),
		Position = Vector3.new(-60, 33, 19.5),
		Color = CONFIG.GLASS_TINT,
		Material = Enum.Material.Glass,
		Transparency = 0.5,
	})

	-- Green accent strips
	for strip = 0, 3 do
		createPart(ankModel, {
			Name = "ANK_GreenStrip_" .. strip,
			Size = Vector3.new(2, 40, 62),
			Position = Vector3.new(-60 + (strip - 1.5) * 20, 33, 50),
			Color = CONFIG.ANK_GREEN,
			Material = Enum.Material.Neon,
			Transparency = 0.3,
		})
	end

	-- Gold accents on roof
	createPart(ankModel, {
		Name = "ANK_GoldRoof",
		Size = Vector3.new(62, 3, 62),
		Position = Vector3.new(-60, 54, 50),
		Color = CONFIG.GOLD,
		Material = Enum.Material.SmoothPlastic,
	})

	-- ANK logo light
	local ankLogo = createPart(ankModel, {
		Name = "ANK_Logo",
		Size = Vector3.new(20, 10, 1),
		Position = Vector3.new(-60, 48, 19),
		Color = CONFIG.ANK_GREEN,
		Material = Enum.Material.Neon,
	})
	addBillboard(ankLogo, {
		Text = "ANK -- Jouw MolCoins, Jouw Keuze",
		Size = UDim2.new(14, 0, 3, 0),
		StudsOffset = Vector3.new(0, 8, 0),
		TextColor = CONFIG.GOLD,
		BackgroundColor = Color3.fromRGB(15, 30, 20),
		BackgroundTransparency = 0.3,
		MaxDistance = 300,
	})
	addPointLight(ankLogo, {
		Color = CONFIG.ANK_GREEN,
		Brightness = 2,
		Range = 40,
	})

	-- ================================================================
	-- Market Area / Open Plaza
	-- ================================================================
	local marketModel = createModel(zone, "MarketPlaza")

	-- Plaza floor
	createPlatform(marketModel, {
		Name = "PlazaFloor",
		Position = Vector3.new(0, 13.5, 60),
		Size = Vector3.new(80, 1, 60),
		Color = Color3.fromRGB(50, 55, 60),
		GlowColor = CONFIG.NEON_BLUE,
	})

	-- Columns around the plaza
	local columnPositions = {
		Vector3.new(-35, 13, 35),
		Vector3.new(35, 13, 35),
		Vector3.new(-35, 13, 85),
		Vector3.new(35, 13, 85),
		Vector3.new(-15, 13, 35),
		Vector3.new(15, 13, 35),
		Vector3.new(-15, 13, 85),
		Vector3.new(15, 13, 85),
	}
	for idx, pos in columnPositions do
		local col = createColumn(marketModel, {
			Name = "PlazaColumn_" .. idx,
			Position = pos,
			Height = 18,
			Radius = 1.5,
			Color = Color3.fromRGB(180, 185, 190),
		})
		-- Cap light on top
		local cap = createSphere(marketModel, {
			Name = "ColumnCap_" .. idx,
			Size = Vector3.new(4, 4, 4),
			Position = pos + Vector3.new(0, 19, 0),
			Color = CONFIG.NEON_BLUE,
			Material = Enum.Material.Neon,
			Transparency = 0.3,
		})
		addPointLight(cap, {
			Color = CONFIG.NEON_BLUE,
			Brightness = 1,
			Range = 15,
		})
	end

	-- Market billboard
	local marketSign = createPart(marketModel, {
		Name = "MarketSign",
		Size = Vector3.new(1, 6, 20),
		Position = Vector3.new(0, 28, 60),
		Color = Color3.fromRGB(20, 25, 30),
		Material = Enum.Material.SmoothPlastic,
	})
	addBillboard(marketSign, {
		Text = "Moleculia Markt",
		Size = UDim2.new(10, 0, 2.5, 0),
		StudsOffset = Vector3.new(0, 4, 0),
		TextColor = CONFIG.NEON_BLUE,
		BackgroundTransparency = 0.5,
		MaxDistance = 150,
	})

	print("[WorldBuilder] Zone 1: Nexus Hub built")
	return zone
end

--------------------------------------------------------------------------------
-- ZONE 2: PERIODIC TABLE BIOME (NOORD)
--------------------------------------------------------------------------------

local function buildPeriodicTableBiome(zonesFolder: Folder)
	local zone = createModel(zonesFolder, "Zone2_PeriodicTableBiome")
	tagZone(zone, "Noord")

	-- ================================================================
	-- Alkali Cluster (Group 1 elements)
	-- ================================================================
	local alkaliModel = createModel(zone, "AlkaliCluster")

	createPlatform(alkaliModel, {
		Name = "AlkaliPlatform_Main",
		Position = Vector3.new(100, 10, 2000),
		Size = Vector3.new(120, 5, 100),
		Color = CONFIG.ALKALI_RED,
		Material = Enum.Material.SmoothPlastic,
		TopGlow = true,
		GlowColor = Color3.fromRGB(255, 80, 80),
	})

	-- Sub-islands around main
	local alkaliOffsets = {
		Vector3.new(-80, 5, -30), Vector3.new(80, 8, 20),
		Vector3.new(-50, 12, 50), Vector3.new(60, 3, -60),
	}
	for idx, offset in alkaliOffsets do
		createPlatform(alkaliModel, {
			Name = "AlkaliIslet_" .. idx,
			Position = Vector3.new(100, 10, 2000) + offset,
			Size = Vector3.new(30 + idx * 5, 3, 25 + idx * 4),
			Color = Color3.fromRGB(180 + idx * 10, 50, 50),
			GlowColor = Color3.fromRGB(255, 60 + idx * 15, 60),
		})
	end

	addBillboard(alkaliModel.AlkaliPlatform_Main, {
		Text = "Alkali Metalen - Groep 1",
		Size = UDim2.new(12, 0, 3, 0),
		StudsOffset = Vector3.new(0, 15, 0),
		TextColor = Color3.fromRGB(255, 200, 200),
		BackgroundColor = Color3.fromRGB(120, 20, 20),
		MaxDistance = 250,
	})

	-- ================================================================
	-- Noble Gas Nebula (Group 18)
	-- ================================================================
	local nobleModel = createModel(zone, "NobleGasNebula")

	local noblePlatform = createPlatform(nobleModel, {
		Name = "NoblePlatform",
		Position = Vector3.new(800, 10, 2200),
		Size = Vector3.new(150, 4, 120),
		Color = Color3.fromRGB(60, 40, 100),
		TopGlow = true,
		GlowColor = CONFIG.NOBLE_PURPLE,
	})

	-- Purple fog zone (large transparent part with particle emitter)
	local fogZone = createPart(nobleModel, {
		Name = "NobleFogZone",
		Size = Vector3.new(160, 60, 130),
		Position = Vector3.new(800, 40, 2200),
		Color = CONFIG.NOBLE_PURPLE,
		Material = Enum.Material.Neon,
		Transparency = 0.92,
		CanCollide = false,
	})
	addParticleEmitter(fogZone, {
		Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(180, 100, 255)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(100, 60, 200)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(60, 30, 140)),
		}),
		Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 3),
			NumberSequenceKeypoint.new(0.5, 8),
			NumberSequenceKeypoint.new(1, 4),
		}),
		Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.7),
			NumberSequenceKeypoint.new(0.5, 0.5),
			NumberSequenceKeypoint.new(1, 1),
		}),
		Lifetime = NumberRange.new(4, 8),
		Rate = 15,
		Speed = NumberRange.new(0.5, 2),
		SpreadAngle = Vector2.new(180, 180),
		LightEmission = 0.8,
	})

	-- Noble gas orbs (representative element markers)
	local nobleElements = {
		{name = "He", color = Color3.fromRGB(255, 255, 200), offset = Vector3.new(-50, 20, 0)},
		{name = "Ne", color = Color3.fromRGB(255, 120, 60), offset = Vector3.new(-25, 25, 20)},
		{name = "Ar", color = Color3.fromRGB(160, 200, 255), offset = Vector3.new(0, 18, -15)},
		{name = "Kr", color = Color3.fromRGB(200, 255, 200), offset = Vector3.new(25, 22, 10)},
		{name = "Xe", color = Color3.fromRGB(180, 160, 255), offset = Vector3.new(50, 28, -10)},
		{name = "Rn", color = Color3.fromRGB(255, 200, 180), offset = Vector3.new(60, 15, 30)},
	}
	for _, elem in nobleElements do
		local orb = createSphere(nobleModel, {
			Name = "NobleOrb_" .. elem.name,
			Size = Vector3.new(8, 8, 8),
			Position = Vector3.new(800, 10, 2200) + elem.offset,
			Color = elem.color,
			Material = Enum.Material.Neon,
			Transparency = 0.2,
		})
		addPointLight(orb, {
			Color = elem.color,
			Brightness = 2,
			Range = 20,
		})
		addBillboard(orb, {
			Text = elem.name,
			Size = UDim2.new(3, 0, 2, 0),
			StudsOffset = Vector3.new(0, 6, 0),
			TextColor = elem.color,
			BackgroundTransparency = 0.6,
			MaxDistance = 80,
		})
		tagInteractable(orb, "Element_" .. elem.name)
	end

	addBillboard(noblePlatform, {
		Text = "Edelgassen - Groep 18",
		Size = UDim2.new(12, 0, 3, 0),
		StudsOffset = Vector3.new(0, 15, 0),
		TextColor = CONFIG.NOBLE_PURPLE,
		BackgroundColor = Color3.fromRGB(30, 15, 60),
		MaxDistance = 250,
	})

	-- ================================================================
	-- Transition Metal Continent (Groups 3-12)
	-- ================================================================
	local transitionModel = createModel(zone, "TransitionContinent")

	createPlatform(transitionModel, {
		Name = "TransitionPlatform",
		Position = Vector3.new(400, 10, 2100),
		Size = Vector3.new(250, 8, 200),
		Color = CONFIG.TRANSITION_BLUE,
		TopGlow = true,
		GlowColor = Color3.fromRGB(120, 150, 200),
	})

	-- Sub-platforms for different transition metal rows
	createPlatform(transitionModel, {
		Name = "TransitionRow4",
		Position = Vector3.new(350, 14, 2050),
		Size = Vector3.new(100, 3, 60),
		Color = Color3.fromRGB(110, 130, 170),
		GlowColor = CONFIG.NEON_BLUE,
	})
	createPlatform(transitionModel, {
		Name = "TransitionRow5",
		Position = Vector3.new(450, 14, 2100),
		Size = Vector3.new(100, 3, 60),
		Color = Color3.fromRGB(90, 110, 150),
		GlowColor = CONFIG.NEON_BLUE,
	})
	createPlatform(transitionModel, {
		Name = "TransitionRow6",
		Position = Vector3.new(400, 14, 2160),
		Size = Vector3.new(100, 3, 60),
		Color = Color3.fromRGB(80, 100, 140),
		GlowColor = CONFIG.NEON_BLUE,
	})

	addBillboard(transitionModel.TransitionPlatform, {
		Text = "Overgangsmetalen - Groepen 3-12",
		Size = UDim2.new(14, 0, 3, 0),
		StudsOffset = Vector3.new(0, 18, 0),
		TextColor = CONFIG.NEON_BLUE,
		BackgroundColor = Color3.fromRGB(20, 30, 50),
		MaxDistance = 300,
	})

	-- ================================================================
	-- Lanthanide Reef (below main level)
	-- ================================================================
	local lanthanideModel = createModel(zone, "LanthanideReef")

	createPlatform(lanthanideModel, {
		Name = "LanthanidePlatform",
		Position = Vector3.new(300, -15, 2250),
		Size = Vector3.new(140, 5, 80),
		Color = CONFIG.LANTHANIDE_TEAL,
		TopGlow = true,
		GlowColor = Color3.fromRGB(80, 220, 200),
	})

	-- Reef structures (coral-like pillars)
	for i = 1, 8 do
		local reefX = 300 + math.cos(i * 0.8) * 50
		local reefZ = 2250 + math.sin(i * 1.1) * 30
		local reefHeight = 10 + math.sin(i * 2) * 6
		local pillar = createCylinder(lanthanideModel, {
			Name = "ReefPillar_" .. i,
			Size = Vector3.new(reefHeight, 3, 3),
			Position = Vector3.new(reefX, -15 + reefHeight / 2, reefZ),
			Color = Color3.fromRGB(60 + i * 12, 160 + i * 8, 150 + i * 5),
			Material = Enum.Material.Neon,
			Transparency = 0.3,
			Orientation = Vector3.new(0, 0, 90),
		})
		addPointLight(pillar, {
			Color = CONFIG.LANTHANIDE_TEAL,
			Brightness = 1,
			Range = 12,
		})
	end

	addBillboard(lanthanideModel.LanthanidePlatform, {
		Text = "Lanthaniden Rif",
		Size = UDim2.new(10, 0, 2.5, 0),
		StudsOffset = Vector3.new(0, 12, 0),
		TextColor = CONFIG.LANTHANIDE_TEAL,
		BackgroundColor = Color3.fromRGB(15, 50, 45),
		MaxDistance = 200,
	})

	-- ================================================================
	-- Halogen Islands
	-- ================================================================
	local halogenModel = createModel(zone, "HalogenIslands")

	createPlatform(halogenModel, {
		Name = "HalogenPlatform",
		Position = Vector3.new(650, 10, 1900),
		Size = Vector3.new(100, 4, 80),
		Color = Color3.fromRGB(180, 110, 30),
		TopGlow = true,
		GlowColor = CONFIG.HALOGEN_ORANGE,
	})

	addBillboard(halogenModel.HalogenPlatform, {
		Text = "Halogenen - Groep 17",
		Size = UDim2.new(10, 0, 2.5, 0),
		StudsOffset = Vector3.new(0, 12, 0),
		TextColor = CONFIG.HALOGEN_ORANGE,
		BackgroundColor = Color3.fromRGB(60, 35, 10),
		MaxDistance = 200,
	})

	-- ================================================================
	-- Quiz Pillars scattered throughout
	-- ================================================================
	local quizPositions = {
		Vector3.new(200, 10, 2050),
		Vector3.new(500, 10, 2250),
		Vector3.new(700, 10, 2000),
		Vector3.new(350, 10, 1950),
		Vector3.new(150, 10, 2150),
	}
	for idx, pos in quizPositions do
		local pillar = createPart(zone, {
			Name = "QuizPillar_" .. idx,
			Size = Vector3.new(6, 15, 6),
			Position = pos + Vector3.new(0, 7, 0),
			Color = Color3.fromRGB(60, 200, 180),
			Material = Enum.Material.Neon,
			Transparency = 0.2,
		})
		addBillboard(pillar, {
			Text = "Quiz #" .. idx,
			Size = UDim2.new(4, 0, 2, 0),
			StudsOffset = Vector3.new(0, 10, 0),
			TextColor = Color3.new(1, 1, 1),
			BackgroundColor = Color3.fromRGB(20, 80, 70),
			MaxDistance = 80,
		})
		tagInteractable(pillar, "Quiz")
		pillar:SetAttribute("QuizId", idx)
	end

	-- Connecting bridge from Centrum to Noord
	local bridgeModel = createModel(zone, "BridgeToNexus")
	for seg = 1, 20 do
		local t = seg / 20
		local bridgeY = 10 + math.sin(t * math.pi) * 15
		local bridgeZ = t * 1900
		createPart(bridgeModel, {
			Name = "BridgeSegment_" .. seg,
			Size = Vector3.new(8, 1.5, 100),
			Position = Vector3.new(0, bridgeY, bridgeZ),
			Color = Color3.fromRGB(40, 45, 55),
			Material = Enum.Material.SmoothPlastic,
			Transparency = 0.1,
		})
		-- Railing glow
		if seg % 3 == 0 then
			for side = -1, 1, 2 do
				createPart(bridgeModel, {
					Name = "BridgeLight_" .. seg .. "_" .. side,
					Size = Vector3.new(1, 3, 1),
					Position = Vector3.new(side * 4, bridgeY + 2, bridgeZ),
					Color = CONFIG.NEON_GREEN,
					Material = Enum.Material.Neon,
					CanCollide = false,
				})
			end
		end
	end

	print("[WorldBuilder] Zone 2: Periodic Table Biome built")
	return zone
end

--------------------------------------------------------------------------------
-- ZONE 3: QUANTUM LAB (OOST)
--------------------------------------------------------------------------------

local function buildQuantumLab(zonesFolder: Folder)
	local zone = createModel(zonesFolder, "Zone3_QuantumLab")
	tagZone(zone, "Oost")

	-- Main floating platform
	local mainPlatform = createPlatform(zone, {
		Name = "QuantumPlatform",
		Position = Vector3.new(2000, 30, 0),
		Size = Vector3.new(180, 5, 160),
		Color = Color3.fromRGB(20, 30, 50),
		Material = Enum.Material.Ice,
		TopGlow = true,
		GlowColor = CONFIG.ICE_BLUE,
	})
	tagZone(mainPlatform, "Oost")

	-- Sub-platforms at different heights
	createPlatform(zone, {
		Name = "QuantumPlatform_Upper",
		Position = Vector3.new(2050, 50, -40),
		Size = Vector3.new(60, 3, 50),
		Color = Color3.fromRGB(25, 35, 55),
		Material = Enum.Material.Ice,
		GlowColor = CONFIG.NEON_PURPLE,
	})
	createPlatform(zone, {
		Name = "QuantumPlatform_Lower",
		Position = Vector3.new(1950, 18, 30),
		Size = Vector3.new(50, 3, 40),
		Color = Color3.fromRGB(18, 25, 45),
		Material = Enum.Material.Ice,
		GlowColor = CONFIG.NEON_PURPLE,
	})

	-- ================================================================
	-- QPU Core (central glowing sphere)
	-- ================================================================
	local qpuModel = createModel(zone, "QPU_Core")

	local qpuSphere = createSphere(qpuModel, {
		Name = "QPU_Sphere",
		Size = Vector3.new(30, 30, 30),
		Position = Vector3.new(2000, 55, 0),
		Color = CONFIG.NEON_PURPLE,
		Material = Enum.Material.Neon,
		Transparency = 0.15,
	})
	addPointLight(qpuSphere, {
		Color = CONFIG.NEON_PURPLE,
		Brightness = 5,
		Range = 80,
	})
	tagInteractable(qpuSphere, "QPU_Core")

	-- Outer shell rings
	for ringIdx = 1, 3 do
		local ringSize = 36 + ringIdx * 6
		local ring = createPart(qpuModel, {
			Name = "QPU_Ring_" .. ringIdx,
			Size = Vector3.new(ringSize, 1.5, ringSize),
			Position = Vector3.new(2000, 55, 0),
			Color = CONFIG.NEON_PURPLE,
			Material = Enum.Material.Neon,
			Transparency = 0.5,
			Shape = Enum.PartType.Cylinder,
			CanCollide = false,
		})
		ring.Orientation = Vector3.new(ringIdx * 30, ringIdx * 60, 0)
	end

	-- Particle swirl around QPU
	addParticleEmitter(qpuSphere, {
		Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(200, 100, 255)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(100, 200, 255)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(160, 80, 255)),
		}),
		Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.5),
			NumberSequenceKeypoint.new(0.5, 2),
			NumberSequenceKeypoint.new(1, 0.2),
		}),
		Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.3),
			NumberSequenceKeypoint.new(1, 1),
		}),
		Lifetime = NumberRange.new(1.5, 3),
		Rate = 25,
		Speed = NumberRange.new(3, 8),
		SpreadAngle = Vector2.new(360, 360),
		LightEmission = 1,
	})

	addBillboard(qpuSphere, {
		Text = "Quantum Processing Unit",
		Size = UDim2.new(12, 0, 3, 0),
		StudsOffset = Vector3.new(0, 20, 0),
		TextColor = CONFIG.NEON_PURPLE,
		BackgroundColor = Color3.fromRGB(20, 10, 40),
		BackgroundTransparency = 0.3,
		MaxDistance = 250,
	})

	-- ================================================================
	-- Server Rack Rows
	-- ================================================================
	local serverModel = createModel(zone, "ServerRacks")
	for row = 1, 4 do
		for col = 1, 6 do
			local rackX = 2000 - 60 + col * 16
			local rackZ = -50 + row * 25
			local rack = createPart(serverModel, {
				Name = "ServerRack_" .. row .. "_" .. col,
				Size = Vector3.new(4, 18, 8),
				Position = Vector3.new(rackX, 42, rackZ),
				Color = Color3.fromRGB(25, 30, 40),
				Material = Enum.Material.SmoothPlastic,
			})

			-- LED strip on front
			createPart(serverModel, {
				Name = "RackLED_" .. row .. "_" .. col,
				Size = Vector3.new(0.5, 16, 0.5),
				Position = Vector3.new(rackX + 2.2, 42, rackZ - 3.8),
				Color = if (row + col) % 3 == 0 then CONFIG.NEON_GREEN
					elseif (row + col) % 3 == 1 then CONFIG.NEON_BLUE
					else CONFIG.NEON_PURPLE,
				Material = Enum.Material.Neon,
				CanCollide = false,
			})
		end
	end

	-- ================================================================
	-- Cryogenic Aesthetic Elements
	-- ================================================================

	-- Ice crystal formations
	for i = 1, 12 do
		local angle = (i / 12) * math.pi * 2
		local dist = 60 + math.sin(i * 3) * 20
		local crystalX = 2000 + math.cos(angle) * dist
		local crystalZ = math.sin(angle) * dist
		local crystalHeight = 8 + math.random(4, 15)

		createPart(zone, {
			Name = "IceCrystal_" .. i,
			Size = Vector3.new(3, crystalHeight, 3),
			Position = Vector3.new(crystalX, 33 + crystalHeight / 2, crystalZ),
			Color = CONFIG.ICE_BLUE,
			Material = Enum.Material.Ice,
			Transparency = 0.3,
		})
	end

	-- ================================================================
	-- Local purple atmosphere (fog part)
	-- ================================================================
	local localFog = createPart(zone, {
		Name = "QuantumFog",
		Size = Vector3.new(200, 80, 180),
		Position = Vector3.new(2000, 50, 0),
		Color = CONFIG.PURPLE_MIST,
		Material = Enum.Material.Neon,
		Transparency = 0.96,
		CanCollide = false,
	})
	addParticleEmitter(localFog, {
		Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(140, 60, 220)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(80, 40, 160)),
		}),
		Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 5),
			NumberSequenceKeypoint.new(0.5, 12),
			NumberSequenceKeypoint.new(1, 6),
		}),
		Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.8),
			NumberSequenceKeypoint.new(0.5, 0.6),
			NumberSequenceKeypoint.new(1, 1),
		}),
		Lifetime = NumberRange.new(5, 10),
		Rate = 8,
		Speed = NumberRange.new(0.3, 1.5),
		SpreadAngle = Vector2.new(180, 180),
		LightEmission = 0.4,
	})

	-- Bridge from Centrum to Oost
	local bridgeModel = createModel(zone, "BridgeFromNexus")
	for seg = 1, 20 do
		local t = seg / 20
		local bridgeX = t * 1900
		local bridgeY = 10 + math.sin(t * math.pi) * 20
		createPart(bridgeModel, {
			Name = "BridgeSegment_" .. seg,
			Size = Vector3.new(100, 1.5, 8),
			Position = Vector3.new(bridgeX, bridgeY, 0),
			Color = Color3.fromRGB(30, 35, 50),
			Material = Enum.Material.SmoothPlastic,
			Transparency = 0.1,
		})
		if seg % 3 == 0 then
			for side = -1, 1, 2 do
				createPart(bridgeModel, {
					Name = "BridgeLight_" .. seg .. "_" .. side,
					Size = Vector3.new(1, 3, 1),
					Position = Vector3.new(bridgeX, bridgeY + 2, side * 4),
					Color = CONFIG.NEON_PURPLE,
					Material = Enum.Material.Neon,
					CanCollide = false,
				})
			end
		end
	end

	print("[WorldBuilder] Zone 3: Quantum Lab built")
	return zone
end

--------------------------------------------------------------------------------
-- ZONE 4: SLAKKENSPOOR FABRIEK (WEST)
--------------------------------------------------------------------------------

local function buildSlakkenspoorFabriek(zonesFolder: Folder)
	local zone = createModel(zonesFolder, "Zone4_SlakkenspoorFabriek")
	tagZone(zone, "West")

	-- Main industrial platform
	local industrialPlatform = createPlatform(zone, {
		Name = "IndustrialPlatform",
		Position = Vector3.new(-2000, 5, 0),
		Size = Vector3.new(300, 8, 200),
		Color = CONFIG.DARK_METAL,
		TopGlow = true,
		GlowColor = Color3.fromRGB(200, 100, 40),
	})
	tagZone(industrialPlatform, "West")

	-- ================================================================
	-- Building 1: Slak Invoer (BOF Slag Hopper)
	-- ================================================================
	local building1 = createModel(zone, "Building1_SlakInvoer")

	local b1Main = createPart(building1, {
		Name = "B1_Structure",
		Size = Vector3.new(50, 35, 40),
		Position = Vector3.new(-2100, 26, -40),
		Color = CONFIG.INDUSTRIAL_GREY,
		Material = Enum.Material.SmoothPlastic,
	})
	tagInteractable(b1Main, "SlakInvoer")

	-- Hopper (inverted pyramid shape approximated with parts)
	createPart(building1, {
		Name = "B1_Hopper_Top",
		Size = Vector3.new(30, 5, 25),
		Position = Vector3.new(-2100, 46, -40),
		Color = Color3.fromRGB(100, 70, 40),
		Material = Enum.Material.SmoothPlastic,
	})
	createPart(building1, {
		Name = "B1_Hopper_Chute",
		Size = Vector3.new(15, 10, 12),
		Position = Vector3.new(-2100, 40, -40),
		Color = Color3.fromRGB(80, 60, 35),
		Material = Enum.Material.SmoothPlastic,
	})

	-- Slag pile (rough appearance)
	createSphere(building1, {
		Name = "B1_SlagPile",
		Size = Vector3.new(20, 8, 18),
		Position = Vector3.new(-2100, 48, -40),
		Color = Color3.fromRGB(60, 55, 50),
		Material = Enum.Material.Slate,
	})

	addBillboard(b1Main, {
		Text = "Slak Invoer - BOF Slag",
		Size = UDim2.new(10, 0, 2.5, 0),
		StudsOffset = Vector3.new(0, 22, 25),
		TextColor = Color3.fromRGB(255, 200, 100),
		BackgroundColor = Color3.fromRGB(40, 30, 15),
		MaxDistance = 150,
	})

	-- ================================================================
	-- Building 2: HGMS Separator
	-- ================================================================
	local building2 = createModel(zone, "Building2_HGMS_Separator")

	local b2Main = createPart(building2, {
		Name = "B2_Structure",
		Size = Vector3.new(50, 30, 40),
		Position = Vector3.new(-2040, 24, 10),
		Color = CONFIG.INDUSTRIAL_GREY,
		Material = Enum.Material.SmoothPlastic,
	})
	tagInteractable(b2Main, "HGMS_Separator")

	-- Magnetic separator drum (cylinder)
	local magDrum = createCylinder(building2, {
		Name = "B2_MagDrum",
		Size = Vector3.new(20, 25, 25),
		Position = Vector3.new(-2040, 30, 10),
		Color = Color3.fromRGB(120, 40, 40),
		Material = Enum.Material.SmoothPlastic,
		Orientation = Vector3.new(0, 0, 0),
	})

	-- Red magnetic glow
	local magGlow = createPart(building2, {
		Name = "B2_MagGlow",
		Size = Vector3.new(22, 27, 27),
		Position = Vector3.new(-2040, 30, 10),
		Color = CONFIG.LAVA_RED,
		Material = Enum.Material.Neon,
		Transparency = 0.7,
		CanCollide = false,
		Shape = Enum.PartType.Cylinder,
	})
	addPointLight(magGlow, {
		Color = CONFIG.LAVA_RED,
		Brightness = 3,
		Range = 30,
	})

	addBillboard(b2Main, {
		Text = "HGMS Separator",
		Size = UDim2.new(10, 0, 2.5, 0),
		StudsOffset = Vector3.new(0, 20, 25),
		TextColor = Color3.fromRGB(255, 120, 100),
		BackgroundColor = Color3.fromRGB(50, 15, 10),
		MaxDistance = 150,
	})

	-- ================================================================
	-- Building 3: Reactie Vaten (pH Reactors)
	-- ================================================================
	local building3 = createModel(zone, "Building3_ReactieVaten")

	local b3Base = createPart(building3, {
		Name = "B3_Base",
		Size = Vector3.new(60, 5, 40),
		Position = Vector3.new(-1970, 12, -40),
		Color = CONFIG.INDUSTRIAL_GREY,
		Material = Enum.Material.SmoothPlastic,
	})
	tagInteractable(b3Base, "ReactieVaten")

	-- 6 cylinder reactors
	local reactorColors = {
		Color3.fromRGB(80, 200, 80),   -- green (pH neutral)
		Color3.fromRGB(200, 200, 60),  -- yellow (mild acid)
		Color3.fromRGB(60, 180, 200),  -- cyan (base)
		Color3.fromRGB(200, 80, 80),   -- red (strong acid)
		Color3.fromRGB(180, 120, 200), -- purple (buffer)
		Color3.fromRGB(100, 200, 160), -- teal (neutral)
	}
	for i = 1, 6 do
		local reactorX = -1970 - 25 + i * 9
		local reactor = createCylinder(building3, {
			Name = "B3_Reactor_" .. i,
			Size = Vector3.new(22, 7, 7),
			Position = Vector3.new(reactorX, 26, -40),
			Color = CONFIG.INDUSTRIAL_GREY,
			Material = Enum.Material.SmoothPlastic,
			Orientation = Vector3.new(0, 0, 90),
		})

		-- Glowing liquid inside (slightly smaller, neon)
		createCylinder(building3, {
			Name = "B3_Liquid_" .. i,
			Size = Vector3.new(18, 5.5, 5.5),
			Position = Vector3.new(reactorX, 24, -40),
			Color = reactorColors[i],
			Material = Enum.Material.Neon,
			Transparency = 0.3,
			Orientation = Vector3.new(0, 0, 90),
		})

		addPointLight(reactor, {
			Color = reactorColors[i],
			Brightness = 1.5,
			Range = 12,
		})
	end

	addBillboard(b3Base, {
		Text = "Reactie Vaten - pH Reactors",
		Size = UDim2.new(12, 0, 2.5, 0),
		StudsOffset = Vector3.new(0, 25, 0),
		TextColor = Color3.fromRGB(100, 220, 180),
		BackgroundColor = Color3.fromRGB(20, 40, 35),
		MaxDistance = 150,
	})

	-- ================================================================
	-- Building 4: Product Opslag
	-- ================================================================
	local building4 = createModel(zone, "Building4_ProductOpslag")

	local b4Main = createPart(building4, {
		Name = "B4_Structure",
		Size = Vector3.new(50, 25, 40),
		Position = Vector3.new(-1900, 21, 10),
		Color = CONFIG.INDUSTRIAL_GREY,
		Material = Enum.Material.SmoothPlastic,
	})
	tagInteractable(b4Main, "ProductOpslag")

	-- Output containers
	-- V2O5 - Yellow
	local containerV2O5 = createPart(building4, {
		Name = "B4_Container_V2O5",
		Size = Vector3.new(12, 15, 10),
		Position = Vector3.new(-1912, 16, 10),
		Color = CONFIG.V2O5_YELLOW,
		Material = Enum.Material.SmoothPlastic,
	})
	addBillboard(containerV2O5, {
		Text = "V2O5",
		Size = UDim2.new(4, 0, 2, 0),
		StudsOffset = Vector3.new(0, 10, 0),
		TextColor = CONFIG.V2O5_YELLOW,
		BackgroundTransparency = 0.5,
		MaxDistance = 60,
	})
	tagInteractable(containerV2O5, "Product_V2O5")

	-- Fe - Grey
	local containerFe = createPart(building4, {
		Name = "B4_Container_Fe",
		Size = Vector3.new(12, 15, 10),
		Position = Vector3.new(-1900, 16, 10),
		Color = CONFIG.FE_GREY,
		Material = Enum.Material.SmoothPlastic,
	})
	addBillboard(containerFe, {
		Text = "Fe",
		Size = UDim2.new(3, 0, 2, 0),
		StudsOffset = Vector3.new(0, 10, 0),
		TextColor = CONFIG.FE_GREY,
		BackgroundTransparency = 0.5,
		MaxDistance = 60,
	})
	tagInteractable(containerFe, "Product_Fe")

	-- Si-K - Green
	local containerSiK = createPart(building4, {
		Name = "B4_Container_SiK",
		Size = Vector3.new(12, 15, 10),
		Position = Vector3.new(-1888, 16, 10),
		Color = CONFIG.SIK_GREEN,
		Material = Enum.Material.SmoothPlastic,
	})
	addBillboard(containerSiK, {
		Text = "Si-K",
		Size = UDim2.new(3, 0, 2, 0),
		StudsOffset = Vector3.new(0, 10, 0),
		TextColor = CONFIG.SIK_GREEN,
		BackgroundTransparency = 0.5,
		MaxDistance = 60,
	})
	tagInteractable(containerSiK, "Product_SiK")

	addBillboard(b4Main, {
		Text = "Product Opslag",
		Size = UDim2.new(10, 0, 2.5, 0),
		StudsOffset = Vector3.new(0, 18, 25),
		TextColor = Color3.fromRGB(220, 200, 100),
		BackgroundColor = Color3.fromRGB(40, 35, 15),
		MaxDistance = 150,
	})

	-- ================================================================
	-- Conveyor Belts connecting buildings
	-- ================================================================
	local conveyorModel = createModel(zone, "ConveyorBelts")

	-- Conveyor 1->2 (Slak Invoer to HGMS)
	local function buildConveyor(startPos: Vector3, endPos: Vector3, name: string, color: Color3)
		local diff = endPos - startPos
		local dist = diff.Magnitude
		local midPoint = (startPos + endPos) / 2
		local angle = math.atan2(diff.X, diff.Z)

		-- Belt surface
		local belt = createPart(conveyorModel, {
			Name = name .. "_Belt",
			Size = Vector3.new(4, 0.5, dist),
			Position = midPoint,
			Color = Color3.fromRGB(50, 50, 55),
			Material = Enum.Material.SmoothPlastic,
		})
		belt.Orientation = Vector3.new(0, math.deg(angle), 0)

		-- Side rails
		for side = -1, 1, 2 do
			local rail = createPart(conveyorModel, {
				Name = name .. "_Rail_" .. side,
				Size = Vector3.new(0.5, 2, dist),
				Position = midPoint + Vector3.new(side * 2.5, 1, 0),
				Color = color,
				Material = Enum.Material.Neon,
				Transparency = 0.4,
			})
			rail.Orientation = Vector3.new(0, math.deg(angle), 0)
		end

		-- Direction arrows (small neon parts along belt)
		local steps = math.floor(dist / 15)
		for s = 1, steps do
			local t = s / (steps + 1)
			local arrowPos = startPos + diff * t
			createPart(conveyorModel, {
				Name = name .. "_Arrow_" .. s,
				Size = Vector3.new(2, 0.3, 1),
				Position = arrowPos + Vector3.new(0, 0.5, 0),
				Color = color,
				Material = Enum.Material.Neon,
				CanCollide = false,
			})
		end
	end

	buildConveyor(
		Vector3.new(-2075, 12, -20),
		Vector3.new(-2060, 12, 0),
		"Conveyor_1to2",
		CONFIG.LAVA_RED
	)
	buildConveyor(
		Vector3.new(-2020, 12, 0),
		Vector3.new(-1995, 12, -20),
		"Conveyor_2to3",
		Color3.fromRGB(100, 200, 180)
	)
	buildConveyor(
		Vector3.new(-1945, 12, -20),
		Vector3.new(-1925, 12, 0),
		"Conveyor_3to4",
		CONFIG.V2O5_YELLOW
	)

	-- ================================================================
	-- Smokestacks with ParticleEmitters
	-- ================================================================
	local smokestackPositions = {
		{pos = Vector3.new(-2110, 9, -60), height = 50},
		{pos = Vector3.new(-2090, 9, -60), height = 45},
		{pos = Vector3.new(-1960, 9, -60), height = 40},
		{pos = Vector3.new(-1910, 9, 30), height = 35},
	}
	for idx, stackConfig in smokestackPositions do
		local stack = createCylinder(zone, {
			Name = "Smokestack_" .. idx,
			Size = Vector3.new(stackConfig.height, 5, 5),
			Position = stackConfig.pos + Vector3.new(0, stackConfig.height / 2, 0),
			Color = CONFIG.DARK_METAL,
			Material = Enum.Material.SmoothPlastic,
			Orientation = Vector3.new(0, 0, 90),
		})

		-- Red warning light on top
		local warningLight = createSphere(zone, {
			Name = "WarningLight_" .. idx,
			Size = Vector3.new(2, 2, 2),
			Position = stackConfig.pos + Vector3.new(0, stackConfig.height + 1, 0),
			Color = CONFIG.LAVA_RED,
			Material = Enum.Material.Neon,
		})
		addPointLight(warningLight, {
			Color = CONFIG.LAVA_RED,
			Brightness = 2,
			Range = 15,
		})

		-- Steam particle emitter at the top
		local steamEmitter = createPart(zone, {
			Name = "SteamSource_" .. idx,
			Size = Vector3.new(4, 1, 4),
			Position = stackConfig.pos + Vector3.new(0, stackConfig.height + 2, 0),
			Transparency = 1,
			CanCollide = false,
		})
		addParticleEmitter(steamEmitter, {
			Color = ColorSequence.new({
				ColorSequenceKeypoint.new(0, CONFIG.STEAM_WHITE),
				ColorSequenceKeypoint.new(1, Color3.fromRGB(180, 185, 190)),
			}),
			Size = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 2),
				NumberSequenceKeypoint.new(0.3, 6),
				NumberSequenceKeypoint.new(0.7, 10),
				NumberSequenceKeypoint.new(1, 14),
			}),
			Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.3),
				NumberSequenceKeypoint.new(0.5, 0.6),
				NumberSequenceKeypoint.new(1, 1),
			}),
			Lifetime = NumberRange.new(3, 6),
			Rate = 12,
			Speed = NumberRange.new(4, 10),
			SpreadAngle = Vector2.new(20, 20),
			LightEmission = 0.1,
			LightInfluence = 0.5,
		})
	end

	-- Bridge from Centrum to West
	local bridgeModel = createModel(zone, "BridgeFromNexus")
	for seg = 1, 20 do
		local t = seg / 20
		local bridgeX = -(t * 1900)
		local bridgeY = 8 + math.sin(t * math.pi) * 10
		createPart(bridgeModel, {
			Name = "BridgeSegment_" .. seg,
			Size = Vector3.new(100, 1.5, 8),
			Position = Vector3.new(bridgeX, bridgeY, 0),
			Color = Color3.fromRGB(45, 40, 35),
			Material = Enum.Material.SmoothPlastic,
			Transparency = 0.1,
		})
		if seg % 3 == 0 then
			for side = -1, 1, 2 do
				createPart(bridgeModel, {
					Name = "BridgeLight_" .. seg .. "_" .. side,
					Size = Vector3.new(1, 3, 1),
					Position = Vector3.new(bridgeX, bridgeY + 2, side * 4),
					Color = Color3.fromRGB(200, 120, 40),
					Material = Enum.Material.Neon,
					CanCollide = false,
				})
			end
		end
	end

	print("[WorldBuilder] Zone 4: Slakkenspoor Fabriek built")
	return zone
end

--------------------------------------------------------------------------------
-- ZONE 5: MOLCHAIN REGISTRY TOWER (CENTRUM-OOST)
--------------------------------------------------------------------------------

local function buildMolChainTower(zonesFolder: Folder)
	local zone = createModel(zonesFolder, "Zone5_MolChainTower")
	tagZone(zone, "CentrumOost")

	-- Base platform
	local basePlatform = createPlatform(zone, {
		Name = "TowerBasePlatform",
		Position = Vector3.new(500, 5, 0),
		Size = Vector3.new(80, 4, 80),
		Color = Color3.fromRGB(25, 30, 35),
		TopGlow = true,
		GlowColor = CONFIG.XRPL_GREEN,
	})
	tagZone(basePlatform, "CentrumOost")

	-- ================================================================
	-- Main Tower Cylinder (200 studs tall, 30 diameter)
	-- ================================================================
	local towerModel = createModel(zone, "MainTower")

	local towerShaft = createCylinder(towerModel, {
		Name = "TowerShaft",
		Size = Vector3.new(200, 30, 30),
		Position = Vector3.new(500, 107, 0),
		Color = Color3.fromRGB(30, 35, 42),
		Material = Enum.Material.SmoothPlastic,
		Orientation = Vector3.new(0, 0, 90),
	})

	-- Inner neon core
	createCylinder(towerModel, {
		Name = "TowerInnerCore",
		Size = Vector3.new(200, 10, 10),
		Position = Vector3.new(500, 107, 0),
		Color = CONFIG.XRPL_GREEN,
		Material = Enum.Material.Neon,
		Transparency = 0.3,
		Orientation = Vector3.new(0, 0, 90),
	})

	-- ================================================================
	-- DNA-Helix Spiral Ramp
	-- ================================================================
	local helixModel = createModel(zone, "DNAHelix")

	local helixSteps = 60
	local helixRadius = 20
	local helixHeight = 200
	for step = 1, helixSteps do
		local t = step / helixSteps
		local angle = t * math.pi * 6 -- 3 full rotations
		local stepY = 7 + t * helixHeight
		local stepX = 500 + math.cos(angle) * helixRadius
		local stepZ = math.sin(angle) * helixRadius
		local angleDeg = math.deg(math.atan2(math.sin(angle), math.cos(angle)))

		-- Helix strand A (ramp steps)
		local rampStep = createWedge(helixModel, {
			Name = "HelixStepA_" .. step,
			Size = Vector3.new(6, 1, 8),
			Position = Vector3.new(stepX, stepY, stepZ),
			Orientation = Vector3.new(0, -angleDeg + 90, 0),
			Color = CONFIG.NEON_GREEN,
			Material = Enum.Material.SmoothPlastic,
			Transparency = 0.1,
		})

		-- Helix strand B (opposite side, DNA double-helix)
		local oppositeX = 500 + math.cos(angle + math.pi) * helixRadius
		local oppositeZ = math.sin(angle + math.pi) * helixRadius
		createWedge(helixModel, {
			Name = "HelixStepB_" .. step,
			Size = Vector3.new(6, 1, 8),
			Position = Vector3.new(oppositeX, stepY, oppositeZ),
			Orientation = Vector3.new(0, -angleDeg - 90, 0),
			Color = CONFIG.NEON_BLUE,
			Material = Enum.Material.SmoothPlastic,
			Transparency = 0.1,
		})

		-- Cross-bars (base pairs) every few steps
		if step % 4 == 0 then
			local midX = (stepX + oppositeX) / 2
			local midZ = (stepZ + oppositeZ) / 2
			local barLength = (Vector3.new(stepX, 0, stepZ) - Vector3.new(oppositeX, 0, oppositeZ)).Magnitude
			local bar = createPart(helixModel, {
				Name = "BasePair_" .. step,
				Size = Vector3.new(barLength, 0.8, 1.5),
				Position = Vector3.new(midX, stepY, midZ),
				Color = if step % 8 == 0 then Color3.fromRGB(255, 100, 100) else Color3.fromRGB(100, 200, 255),
				Material = Enum.Material.Neon,
				Transparency = 0.3,
				CanCollide = false,
			})
			bar.Orientation = Vector3.new(0, -angleDeg, 0)
		end

		-- Glow markers at intervals
		if step % 10 == 0 then
			addPointLight(rampStep, {
				Color = CONFIG.NEON_GREEN,
				Brightness = 1.5,
				Range = 12,
			})
		end
	end

	-- ================================================================
	-- XRPL Logo at Base
	-- ================================================================
	local xrplLogo = createCylinder(towerModel, {
		Name = "XRPL_Logo",
		Size = Vector3.new(2, 18, 18),
		Position = Vector3.new(500, 10, 18),
		Color = CONFIG.XRPL_GREEN,
		Material = Enum.Material.Neon,
		Orientation = Vector3.new(90, 0, 0),
	})
	addPointLight(xrplLogo, {
		Color = CONFIG.XRPL_GREEN,
		Brightness = 3,
		Range = 25,
	})
	addBillboard(xrplLogo, {
		Text = "XRPL - MolChain Registry",
		Size = UDim2.new(12, 0, 3, 0),
		StudsOffset = Vector3.new(0, 5, 0),
		TextColor = CONFIG.XRPL_GREEN,
		BackgroundColor = Color3.fromRGB(5, 20, 10),
		BackgroundTransparency = 0.3,
		MaxDistance = 200,
	})
	tagInteractable(xrplLogo, "XRPL_Registry")

	-- ================================================================
	-- Holographic Panels along the tower
	-- ================================================================
	local panelCount = 12
	for i = 1, panelCount do
		local panelY = 20 + (i - 1) * (180 / panelCount)
		local panelAngle = (i / panelCount) * math.pi * 4
		local panelX = 500 + math.cos(panelAngle) * 18
		local panelZ = math.sin(panelAngle) * 18

		local panel = createPart(towerModel, {
			Name = "HoloPanel_" .. i,
			Size = Vector3.new(8, 5, 0.5),
			Position = Vector3.new(panelX, panelY, panelZ),
			Color = CONFIG.NEON_GREEN,
			Material = Enum.Material.Neon,
			Transparency = 0.6,
			CanCollide = false,
		})
		panel.Orientation = Vector3.new(0, math.deg(panelAngle), 0)

		addBillboard(panel, {
			Text = "Block #" .. (1000 + i * 137),
			Size = UDim2.new(5, 0, 2, 0),
			StudsOffset = Vector3.new(0, 0, 0),
			TextColor = CONFIG.NEON_GREEN,
			BackgroundTransparency = 0.7,
			MaxDistance = 60,
		})
		tagInteractable(panel, "HolographicPanel")
		panel:SetAttribute("BlockNumber", 1000 + i * 137)
	end

	-- Tower top beacon
	local towerTop = createSphere(towerModel, {
		Name = "TowerTopBeacon",
		Size = Vector3.new(16, 16, 16),
		Position = Vector3.new(500, 210, 0),
		Color = CONFIG.XRPL_GREEN,
		Material = Enum.Material.Neon,
	})
	addPointLight(towerTop, {
		Color = CONFIG.XRPL_GREEN,
		Brightness = 6,
		Range = 120,
	})

	addBillboard(towerTop, {
		Text = "MolChain Registry Tower",
		Size = UDim2.new(16, 0, 4, 0),
		StudsOffset = Vector3.new(0, 14, 0),
		TextColor = CONFIG.XRPL_GREEN,
		BackgroundColor = Color3.fromRGB(5, 15, 10),
		BackgroundTransparency = 0.3,
		MaxDistance = 500,
	})

	print("[WorldBuilder] Zone 5: MolChain Registry Tower built")
	return zone
end

--------------------------------------------------------------------------------
-- ZONE 6: ANK KREDIETUNIE (CENTRUM-WEST)
--------------------------------------------------------------------------------

local function buildANKKredietunie(zonesFolder: Folder)
	local zone = createModel(zonesFolder, "Zone6_ANK_Kredietunie")
	tagZone(zone, "CentrumWest")

	-- Base platform
	local basePlatform = createPlatform(zone, {
		Name = "ANK_BasePlatform",
		Position = Vector3.new(-500, 5, 0),
		Size = Vector3.new(100, 4, 100),
		Color = Color3.fromRGB(25, 35, 28),
		TopGlow = true,
		GlowColor = CONFIG.ANK_GREEN,
	})
	tagZone(basePlatform, "CentrumWest")

	-- ================================================================
	-- Main Glass Building
	-- ================================================================
	local buildingModel = createModel(zone, "ANK_MainBuilding")

	-- Green/gold structural frame
	-- Vertical pillars (corners)
	local cornerOffsets = {
		Vector3.new(-30, 0, -30),
		Vector3.new(30, 0, -30),
		Vector3.new(-30, 0, 30),
		Vector3.new(30, 0, 30),
	}
	for idx, offset in cornerOffsets do
		createPart(buildingModel, {
			Name = "ANK_FramePillar_" .. idx,
			Size = Vector3.new(3, 42, 3),
			Position = Vector3.new(-500, 28, 0) + offset,
			Color = CONFIG.ANK_GREEN,
			Material = Enum.Material.SmoothPlastic,
		})
	end

	-- Horizontal frame beams (top and middle)
	for _, beamY in {49, 30} do
		-- X-direction beams
		for _, zOffset in {-30, 30} do
			createPart(buildingModel, {
				Name = "ANK_BeamX_" .. beamY .. "_" .. zOffset,
				Size = Vector3.new(63, 2, 3),
				Position = Vector3.new(-500, beamY, zOffset),
				Color = CONFIG.GOLD,
				Material = Enum.Material.SmoothPlastic,
			})
		end
		-- Z-direction beams
		for _, xOffset in {-30, 30} do
			createPart(buildingModel, {
				Name = "ANK_BeamZ_" .. beamY .. "_" .. xOffset,
				Size = Vector3.new(3, 2, 63),
				Position = Vector3.new(-500 + xOffset, beamY, 0),
				Color = CONFIG.GOLD,
				Material = Enum.Material.SmoothPlastic,
			})
		end
	end

	-- Glass walls (4 sides)
	-- Front
	createPart(buildingModel, {
		Name = "ANK_GlassFront",
		Size = Vector3.new(57, 38, 1),
		Position = Vector3.new(-500, 28, -30),
		Color = CONFIG.GLASS_TINT,
		Material = Enum.Material.Glass,
		Transparency = 0.55,
	})
	-- Back
	createPart(buildingModel, {
		Name = "ANK_GlassBack",
		Size = Vector3.new(57, 38, 1),
		Position = Vector3.new(-500, 28, 30),
		Color = CONFIG.GLASS_TINT,
		Material = Enum.Material.Glass,
		Transparency = 0.55,
	})
	-- Left
	createPart(buildingModel, {
		Name = "ANK_GlassLeft",
		Size = Vector3.new(1, 38, 57),
		Position = Vector3.new(-530, 28, 0),
		Color = CONFIG.GLASS_TINT,
		Material = Enum.Material.Glass,
		Transparency = 0.55,
	})
	-- Right
	createPart(buildingModel, {
		Name = "ANK_GlassRight",
		Size = Vector3.new(1, 38, 57),
		Position = Vector3.new(-470, 28, 0),
		Color = CONFIG.GLASS_TINT,
		Material = Enum.Material.Glass,
		Transparency = 0.55,
	})

	-- Roof
	createPart(buildingModel, {
		Name = "ANK_Roof",
		Size = Vector3.new(63, 2, 63),
		Position = Vector3.new(-500, 50, 0),
		Color = CONFIG.GOLD,
		Material = Enum.Material.SmoothPlastic,
	})

	-- Floor
	createPart(buildingModel, {
		Name = "ANK_Floor",
		Size = Vector3.new(60, 1, 60),
		Position = Vector3.new(-500, 8, 0),
		Color = Color3.fromRGB(40, 50, 42),
		Material = Enum.Material.SmoothPlastic,
	})

	-- ANK Logo on front (cooperative symbol)
	local ankLogoSign = createPart(buildingModel, {
		Name = "ANK_LogoSign",
		Size = Vector3.new(18, 10, 0.5),
		Position = Vector3.new(-500, 42, -30.5),
		Color = CONFIG.ANK_GREEN,
		Material = Enum.Material.Neon,
	})
	addPointLight(ankLogoSign, {
		Color = CONFIG.ANK_GREEN,
		Brightness = 3,
		Range = 30,
	})

	-- ================================================================
	-- Loket-balie (Counter) inside
	-- ================================================================
	local interiorModel = createModel(zone, "ANK_Interior")

	-- Counter desk
	local counter = createPart(interiorModel, {
		Name = "LoketBalie",
		Size = Vector3.new(30, 5, 4),
		Position = Vector3.new(-500, 11, -10),
		Color = Color3.fromRGB(60, 80, 65),
		Material = Enum.Material.SmoothPlastic,
	})
	tagInteractable(counter, "ANK_Counter")

	-- Counter top surface
	createPart(interiorModel, {
		Name = "LoketTop",
		Size = Vector3.new(32, 0.5, 5),
		Position = Vector3.new(-500, 13.5, -10),
		Color = CONFIG.GOLD,
		Material = Enum.Material.SmoothPlastic,
	})

	-- Teller positions (3 service points)
	for i = 1, 3 do
		local tellerX = -500 - 10 + i * 10
		local tellerScreen = createPart(interiorModel, {
			Name = "TellerScreen_" .. i,
			Size = Vector3.new(5, 4, 0.3),
			Position = Vector3.new(tellerX, 16, -10),
			Color = CONFIG.NEON_GREEN,
			Material = Enum.Material.Neon,
			Transparency = 0.4,
		})
		addBillboard(tellerScreen, {
			Text = "Loket " .. i,
			Size = UDim2.new(3, 0, 1.5, 0),
			StudsOffset = Vector3.new(0, 3, 0),
			TextColor = CONFIG.NEON_GREEN,
			BackgroundTransparency = 0.6,
			MaxDistance = 40,
		})
		tagInteractable(tellerScreen, "ANK_Teller")
		tellerScreen:SetAttribute("TellerNumber", i)
	end

	-- ================================================================
	-- Vault Door (underground access)
	-- ================================================================
	local vaultModel = createModel(zone, "ANK_Vault")

	-- Vault entrance on floor
	local vaultDoor = createPart(vaultModel, {
		Name = "VaultDoor",
		Size = Vector3.new(12, 3, 12),
		Position = Vector3.new(-500, 8, 15),
		Color = Color3.fromRGB(100, 105, 110),
		Material = Enum.Material.SmoothPlastic,
	})
	tagInteractable(vaultDoor, "ANK_Vault")

	-- Vault door details
	createCylinder(vaultModel, {
		Name = "VaultLock",
		Size = Vector3.new(1, 6, 6),
		Position = Vector3.new(-500, 8.5, 15),
		Color = CONFIG.GOLD,
		Material = Enum.Material.SmoothPlastic,
		Orientation = Vector3.new(90, 0, 0),
	})

	-- Vault room below
	createPart(vaultModel, {
		Name = "VaultChamber",
		Size = Vector3.new(30, 15, 25),
		Position = Vector3.new(-500, -3, 15),
		Color = Color3.fromRGB(35, 38, 40),
		Material = Enum.Material.SmoothPlastic,
	})

	-- Gold reserve stacks in vault
	for row = 1, 3 do
		for col = 1, 4 do
			createPart(vaultModel, {
				Name = "GoldBar_" .. row .. "_" .. col,
				Size = Vector3.new(3, 2, 5),
				Position = Vector3.new(-510 + col * 5, -9 + (row - 1) * 2.2, 15),
				Color = CONFIG.GOLD,
				Material = Enum.Material.SmoothPlastic,
			})
		end
	end

	-- ================================================================
	-- Billboard: ANK + APY display
	-- ================================================================
	local mainBillboard = createPart(zone, {
		Name = "ANK_MainBillboard",
		Size = Vector3.new(25, 12, 1),
		Position = Vector3.new(-500, 56, -32),
		Color = Color3.fromRGB(10, 18, 14),
		Material = Enum.Material.SmoothPlastic,
	})
	addBillboard(mainBillboard, {
		Text = "ANK -- Jouw MolCoins, Jouw Keuze",
		Size = UDim2.new(18, 0, 4, 0),
		StudsOffset = Vector3.new(0, 2, 0),
		TextColor = CONFIG.GOLD,
		BackgroundColor = Color3.fromRGB(10, 25, 15),
		BackgroundTransparency = 0.2,
		MaxDistance = 350,
	})
	addPointLight(mainBillboard, {
		Color = CONFIG.ANK_GREEN,
		Brightness = 2,
		Range = 35,
	})

	-- APY Display panel
	local apyPanel = createPart(zone, {
		Name = "APY_Display",
		Size = Vector3.new(12, 6, 0.5),
		Position = Vector3.new(-500, 44, -30.8),
		Color = Color3.fromRGB(10, 20, 15),
		Material = Enum.Material.SmoothPlastic,
	})
	addBillboard(apyPanel, {
		Text = "APY: 4.2% | MolCoins Gestaked: 1.2M",
		Size = UDim2.new(10, 0, 2, 0),
		StudsOffset = Vector3.new(0, 0, -1),
		TextColor = CONFIG.NEON_GREEN,
		BackgroundColor = Color3.fromRGB(5, 12, 8),
		BackgroundTransparency = 0.3,
		MaxDistance = 120,
	})
	tagInteractable(apyPanel, "APY_Display")

	-- Entrance door area (opening in glass front)
	createPart(zone, {
		Name = "ANK_EntranceFrame",
		Size = Vector3.new(10, 14, 2),
		Position = Vector3.new(-500, 15, -30),
		Color = CONFIG.ANK_GREEN,
		Material = Enum.Material.Neon,
		Transparency = 0.6,
		CanCollide = false,
	})

	-- Welcome mat
	createPart(zone, {
		Name = "ANK_WelcomeMat",
		Size = Vector3.new(8, 0.2, 4),
		Position = Vector3.new(-500, 8.2, -32),
		Color = CONFIG.ANK_GREEN,
		Material = Enum.Material.SmoothPlastic,
	})

	print("[WorldBuilder] Zone 6: ANK Kredietunie built")
	return zone
end

--------------------------------------------------------------------------------
-- GLOBAL DECORATIVE ELEMENTS
--------------------------------------------------------------------------------

local function buildGlobalElements(zonesFolder: Folder)
	local globalsModel = createModel(zonesFolder, "GlobalElements")

	-- ================================================================
	-- Floating asteroid debris around the world edges
	-- ================================================================
	local debrisModel = createModel(globalsModel, "SpaceDebris")

	local debrisPositions = {
		Vector3.new(1500, 80, 1500),
		Vector3.new(-1500, 60, 1200),
		Vector3.new(1200, 100, -1400),
		Vector3.new(-1300, 40, -1500),
		Vector3.new(0, 120, 1800),
		Vector3.new(1800, 50, 0),
		Vector3.new(-1800, 70, 0),
		Vector3.new(0, 90, -1800),
		Vector3.new(800, 150, 800),
		Vector3.new(-800, 130, -800),
	}
	for idx, pos in debrisPositions do
		local size = 10 + (idx * 7) % 30
		local asteroid = createPart(debrisModel, {
			Name = "Asteroid_" .. idx,
			Size = Vector3.new(size, size * 0.7, size * 0.9),
			Position = pos,
			Color = Color3.fromRGB(30 + idx * 3, 25 + idx * 2, 20 + idx * 2),
			Material = Enum.Material.Slate,
			CanCollide = false,
		})
		-- Some asteroids have mineral glow
		if idx % 3 == 0 then
			addPointLight(asteroid, {
				Color = Color3.fromRGB(100 + idx * 15, 200, 100 + idx * 10),
				Brightness = 0.5,
				Range = size,
			})
		end
	end

	-- ================================================================
	-- Atom-ring decoration (large rings orbiting in space)
	-- ================================================================
	local orbitRings = createModel(globalsModel, "AtomOrbitRings")

	for ringIdx = 1, 3 do
		local ringRadius = 400 + ringIdx * 200
		local ringY = 200 + ringIdx * 80
		local ringThick = 3 + ringIdx
		local ring = createPart(orbitRings, {
			Name = "OrbitRing_" .. ringIdx,
			Size = Vector3.new(ringRadius * 2, ringThick, ringRadius * 2),
			Position = Vector3.new(0, ringY, 0),
			Color = CONFIG.NEON_GREEN,
			Material = Enum.Material.Neon,
			Transparency = 0.8,
			Shape = Enum.PartType.Cylinder,
			CanCollide = false,
		})
		ring.Orientation = Vector3.new(0, 0, 90 + ringIdx * 15)
	end

	-- ================================================================
	-- Central "atom" nucleus (decorative sphere above nexus)
	-- ================================================================
	local nucleus = createSphere(globalsModel, {
		Name = "MoleculiaNucleus",
		Size = Vector3.new(20, 20, 20),
		Position = Vector3.new(0, 300, 0),
		Color = CONFIG.NEON_GREEN,
		Material = Enum.Material.Neon,
		Transparency = 0.4,
	})
	addPointLight(nucleus, {
		Color = CONFIG.NEON_GREEN,
		Brightness = 4,
		Range = 150,
	})

	-- ================================================================
	-- Bioluminescent floating particles (large-scale ambient)
	-- ================================================================
	local ambientModel = createModel(globalsModel, "AmbientParticles")

	-- Create invisible emitter volumes at various positions
	local emitterZones = {
		{pos = Vector3.new(0, 50, 0), size = Vector3.new(400, 100, 400), color = CONFIG.NEON_GREEN},
		{pos = Vector3.new(2000, 60, 0), size = Vector3.new(200, 80, 200), color = CONFIG.NEON_PURPLE},
		{pos = Vector3.new(-2000, 40, 0), size = Vector3.new(300, 60, 200), color = Color3.fromRGB(200, 120, 40)},
		{pos = Vector3.new(0, 40, 2000), size = Vector3.new(300, 80, 300), color = CONFIG.NEON_BLUE},
	}
	for idx, emZone in emitterZones do
		local emitterPart = createPart(ambientModel, {
			Name = "AmbientEmitter_" .. idx,
			Size = emZone.size,
			Position = emZone.pos,
			Transparency = 1,
			CanCollide = false,
		})
		addParticleEmitter(emitterPart, {
			Color = ColorSequence.new(emZone.color),
			Size = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.3),
				NumberSequenceKeypoint.new(0.5, 1),
				NumberSequenceKeypoint.new(1, 0.2),
			}),
			Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.5),
				NumberSequenceKeypoint.new(0.5, 0.3),
				NumberSequenceKeypoint.new(1, 1),
			}),
			Lifetime = NumberRange.new(5, 12),
			Rate = 3,
			Speed = NumberRange.new(0.5, 2),
			SpreadAngle = Vector2.new(180, 180),
			LightEmission = 1,
		})
	end

	-- ================================================================
	-- Navigation beacons between zones
	-- ================================================================
	local beaconModel = createModel(globalsModel, "NavBeacons")

	local beaconData = {
		{pos = Vector3.new(0, 30, 500), label = "Noord -->", color = CONFIG.NEON_BLUE},
		{pos = Vector3.new(500, 30, 0), label = "Oost -->", color = CONFIG.NEON_PURPLE},
		{pos = Vector3.new(-500, 30, 0), label = "<-- West", color = Color3.fromRGB(200, 120, 40)},
		{pos = Vector3.new(250, 30, 0), label = "MolChain Tower -->", color = CONFIG.XRPL_GREEN},
		{pos = Vector3.new(-250, 30, 0), label = "<-- ANK Bank", color = CONFIG.ANK_GREEN},
	}
	for idx, bData in beaconData do
		local beaconPart = createPart(beaconModel, {
			Name = "NavBeacon_" .. idx,
			Size = Vector3.new(2, 8, 2),
			Position = bData.pos,
			Color = bData.color,
			Material = Enum.Material.Neon,
		})
		addBillboard(beaconPart, {
			Text = bData.label,
			Size = UDim2.new(8, 0, 2, 0),
			StudsOffset = Vector3.new(0, 6, 0),
			TextColor = bData.color,
			BackgroundColor = Color3.fromRGB(5, 10, 15),
			BackgroundTransparency = 0.4,
			MaxDistance = 150,
		})
		addPointLight(beaconPart, {
			Color = bData.color,
			Brightness = 2,
			Range = 20,
		})
	end

	print("[WorldBuilder] Global elements built")
	return globalsModel
end

--------------------------------------------------------------------------------
-- MAIN BUILD SEQUENCE
--------------------------------------------------------------------------------

local function buildMoleculia()
	local startTime = os.clock()

	print("=============================================================")
	print("[WorldBuilder] MOLECULIA - World Construction Starting")
	print("[WorldBuilder] MOLGANG: The Molecular Chain")
	print("=============================================================")

	-- Step 1: Remove default environment
	removeBaseplate()

	-- Step 2: Configure lighting and atmosphere
	setupLighting()

	-- Step 3: Create zone container
	local zonesFolder = createFolder(Workspace, "Zones")

	-- Step 4: Build all zones
	local zone1 = buildNexusHub(zonesFolder)
	local zone2 = buildPeriodicTableBiome(zonesFolder)
	local zone3 = buildQuantumLab(zonesFolder)
	local zone4 = buildSlakkenspoorFabriek(zonesFolder)
	local zone5 = buildMolChainTower(zonesFolder)
	local zone6 = buildANKKredietunie(zonesFolder)

	-- Step 5: Build global decorative elements
	buildGlobalElements(zonesFolder)

	-- Step 6: Set world attributes for other scripts to reference
	zonesFolder:SetAttribute("WorldName", "Moleculia")
	zonesFolder:SetAttribute("WorldVersion", "1.0.0")
	zonesFolder:SetAttribute("ZoneCount", 6)
	zonesFolder:SetAttribute("BuildTimestamp", os.time())

	-- Set individual zone attributes
	zone1:SetAttribute("ZoneId", 1)
	zone1:SetAttribute("ZoneName", "Nexus Hub")
	zone1:SetAttribute("ZoneType", "Spawn")

	zone2:SetAttribute("ZoneId", 2)
	zone2:SetAttribute("ZoneName", "Periodic Table Biome")
	zone2:SetAttribute("ZoneType", "Education")

	zone3:SetAttribute("ZoneId", 3)
	zone3:SetAttribute("ZoneName", "Quantum Lab")
	zone3:SetAttribute("ZoneType", "Technology")

	zone4:SetAttribute("ZoneId", 4)
	zone4:SetAttribute("ZoneName", "Slakkenspoor Fabriek")
	zone4:SetAttribute("ZoneType", "Industry")

	zone5:SetAttribute("ZoneId", 5)
	zone5:SetAttribute("ZoneName", "MolChain Registry Tower")
	zone5:SetAttribute("ZoneType", "Blockchain")

	zone6:SetAttribute("ZoneId", 6)
	zone6:SetAttribute("ZoneName", "ANK Kredietunie")
	zone6:SetAttribute("ZoneType", "Finance")

	local elapsed = os.clock() - startTime
	print("=============================================================")
	print(string.format("[WorldBuilder] MOLECULIA construction complete in %.2fs", elapsed))
	print("[WorldBuilder] 6 zones | Floating archipelago | Space ambiance")
	print("[WorldBuilder] All parts anchored, tagged, and attributed")
	print("=============================================================")
end

-- Execute world build
buildMoleculia()
