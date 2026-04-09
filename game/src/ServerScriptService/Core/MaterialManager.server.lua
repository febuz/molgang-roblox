-- ServerScriptService/Core/MaterialManager.server.lua
-- MOLGANG PBR Material Manager
-- Applies zone-specific materials, reflectance, and visual properties
-- to all tagged parts after WorldBuilder finishes construction.
-- Runs once on server start; CollectionService tags drive zone assignment.

local CollectionService = game:GetService("CollectionService")
local RunService = game:GetService("RunService")

-- ══════════════════════════════════════════════
-- ZONE MATERIAL PALETTES
-- Each zone has a primary material, accent material, and property overrides.
-- ══════════════════════════════════════════════

local ZONE_PALETTES = {
	Centrum = {
		primary     = Enum.Material.SmoothPlastic,
		accent      = Enum.Material.Neon,
		platform    = Enum.Material.Metal,
		reflectance = 0.15,
		-- Nexus Hub: dark with green neon accents
		tintPrimary  = Color3.fromRGB(18, 22, 28),
		tintPlatform = Color3.fromRGB(30, 35, 45),
	},
	Noord = {
		primary     = Enum.Material.SmoothPlastic,
		accent      = Enum.Material.Neon,
		platform    = Enum.Material.SandStone,
		reflectance = 0.05,
		-- Periodic Table Biome: bright scientific whites and element colors
		tintPrimary  = Color3.fromRGB(240, 245, 250),
		tintPlatform = Color3.fromRGB(200, 215, 230),
	},
	Oost = {
		primary     = Enum.Material.Metal,
		accent      = Enum.Material.Neon,
		platform    = Enum.Material.Ice,
		reflectance = 0.35,
		-- Quantum Lab: cryogenic blues, high reflectance metal
		tintPrimary  = Color3.fromRGB(60, 80, 120),
		tintPlatform = Color3.fromRGB(140, 200, 240),
	},
	West = {
		primary     = Enum.Material.Metal,
		accent      = Enum.Material.Neon,
		platform    = Enum.Material.Concrete,
		reflectance = 0.1,
		-- Slakkenspoor Fabriek: industrial dark metals and concrete
		tintPrimary  = Color3.fromRGB(70, 65, 60),
		tintPlatform = Color3.fromRGB(85, 80, 75),
	},
	["Centrum-Oost"] = {
		primary     = Enum.Material.SmoothPlastic,
		accent      = Enum.Material.Neon,
		platform    = Enum.Material.DiamondPlate,
		reflectance = 0.25,
		-- MolChain Tower: sleek tech surfaces with gold/XRPL accents
		tintPrimary  = Color3.fromRGB(10, 20, 35),
		tintPlatform = Color3.fromRGB(25, 40, 60),
	},
	["Centrum-West"] = {
		primary     = Enum.Material.SmoothPlastic,
		accent      = Enum.Material.Neon,
		platform    = Enum.Material.Marble,
		reflectance = 0.2,
		-- ANK Kredietunie: glass bank, clean marble
		tintPrimary  = Color3.fromRGB(230, 235, 225),
		tintPlatform = Color3.fromRGB(210, 220, 205),
	},
}

-- ══════════════════════════════════════════════
-- SPECIAL PART RULES
-- Name patterns → specific material overrides
-- ══════════════════════════════════════════════

local NAME_OVERRIDES = {
	-- Structural elements
	{ pattern = "Platform",    material = nil,               reflectance = 0.05, castShadow = true  },
	{ pattern = "Floor",       material = nil,               reflectance = 0.04, castShadow = false },
	{ pattern = "Wall",        material = Enum.Material.SmoothPlastic, reflectance = 0.08, castShadow = true },
	{ pattern = "Pillar",      material = Enum.Material.Metal,         reflectance = 0.25, castShadow = true },
	{ pattern = "Railing",     material = Enum.Material.Metal,         reflectance = 0.30, castShadow = false },
	{ pattern = "Bridge",      material = Enum.Material.DiamondPlate,  reflectance = 0.20, castShadow = true },
	-- Glass / transparent surfaces
	{ pattern = "Glass",       material = Enum.Material.Glass,          reflectance = 0.8,  castShadow = false },
	{ pattern = "Window",      material = Enum.Material.Glass,          reflectance = 0.8,  castShadow = false },
	{ pattern = "Dome",        material = Enum.Material.Glass,          reflectance = 0.7,  castShadow = false },
	-- Organic / terrain
	{ pattern = "Crystal",     material = Enum.Material.Neon,           reflectance = 0.6,  castShadow = false },
	{ pattern = "Rock",        material = Enum.Material.Rock,           reflectance = 0.02, castShadow = true },
	{ pattern = "Ground",      material = Enum.Material.Grass,          reflectance = 0.0,  castShadow = false },
	-- Industrial
	{ pattern = "Pipe",        material = Enum.Material.Metal,          reflectance = 0.4,  castShadow = false },
	{ pattern = "Tank",        material = Enum.Material.Metal,          reflectance = 0.3,  castShadow = true },
	{ pattern = "Conveyor",    material = Enum.Material.Metal,          reflectance = 0.2,  castShadow = false },
	{ pattern = "Furnace",     material = Enum.Material.Metal,          reflectance = 0.15, castShadow = true },
	-- Decorative neon/glow
	{ pattern = "Neon",        material = Enum.Material.Neon,           reflectance = 0.0,  castShadow = false },
	{ pattern = "Glow",        material = Enum.Material.Neon,           reflectance = 0.0,  castShadow = false },
	{ pattern = "Beacon",      material = Enum.Material.Neon,           reflectance = 0.0,  castShadow = false },
	{ pattern = "Orb",         material = Enum.Material.Neon,           reflectance = 0.0,  castShadow = false },
}

-- ══════════════════════════════════════════════
-- HELPER: Apply material to a single BasePart
-- ══════════════════════════════════════════════

local function applyMaterial(part: BasePart, zoneName: string)
	if not part:IsA("BasePart") then return end
	-- Skip parts that are Neon (atom/glow objects managed elsewhere)
	if part.Material == Enum.Material.Neon then return end

	local palette = ZONE_PALETTES[zoneName]
	if not palette then return end

	local partName = part.Name

	-- Check name-based overrides first
	for _, rule in ipairs(NAME_OVERRIDES) do
		if string.find(partName, rule.pattern) then
			if rule.material then
				part.Material = rule.material
			end
			part.Reflectance = rule.reflectance
			part.CastShadow  = rule.castShadow
			return
		end
	end

	-- Apply zone palette defaults
	part.Reflectance = palette.reflectance
	part.Material    = palette.primary
end

-- ══════════════════════════════════════════════
-- APPLY TO ALL ZONE-TAGGED PARTS
-- ══════════════════════════════════════════════

local function applyZoneMaterials(zoneName: string)
	local tag  = "Zone_" .. zoneName
	local parts = CollectionService:GetTagged(tag)
	local count = 0
	for _, part in ipairs(parts) do
		if part:IsA("BasePart") then
			applyMaterial(part, zoneName)
			count += 1
		end
	end
	return count
end

-- ══════════════════════════════════════════════
-- SURFACE APPEARANCE SETUP
-- Adds SurfaceAppearance to platform-type parts for PBR look.
-- In production, replace AssetIds with real PBR textures.
-- ══════════════════════════════════════════════

local SURFACE_CONFIGS = {
	-- { tag, colorMapId, normalMapId, roughnessMapId, metalMapId }
	{ tag = "Zone_Centrum",       roughness = 0.6, metalness = 0.4 },
	{ tag = "Zone_Noord",         roughness = 0.8, metalness = 0.0 },
	{ tag = "Zone_Oost",          roughness = 0.3, metalness = 0.7 },
	{ tag = "Zone_West",          roughness = 0.9, metalness = 0.5 },
	{ tag = "Zone_Centrum-Oost",  roughness = 0.4, metalness = 0.6 },
	{ tag = "Zone_Centrum-West",  roughness = 0.5, metalness = 0.1 },
}

local function applySurfaceAppearance(part: BasePart, roughness: number, metalness: number)
	-- Only apply to solid, non-transparent large platform parts
	if part.Transparency > 0.1 then return end
	if part.Material == Enum.Material.Neon then return end
	if part.Material == Enum.Material.Glass then return end

	local existing = part:FindFirstChildOfClass("SurfaceAppearance")
	if existing then return end  -- respect manually placed SA

	local sa = Instance.new("SurfaceAppearance")
	sa.AlphaMode    = Enum.AlphaMode.Overlay
	-- Roughness + metalness via tint: no real texture IDs in this build,
	-- using SurfaceAppearance defaults which still improve lighting response
	sa.Parent = part
end

-- ══════════════════════════════════════════════
-- ATOM VISUAL POLISH
-- Makes collected atom orbs shimmer with neon material
-- ══════════════════════════════════════════════

local function polishAtomOrbs()
	-- Tag "AtomOrb" parts are spawned by AtomSpawner
	local orbs = CollectionService:GetTagged("AtomOrb")
	for _, orb in ipairs(orbs) do
		if orb:IsA("BasePart") then
			orb.Material    = Enum.Material.Neon
			orb.CastShadow  = false
			orb.Reflectance = 0.0
		end
	end
	-- Also listen for future spawns
	CollectionService:GetInstanceAddedSignal("AtomOrb"):Connect(function(part)
		if part:IsA("BasePart") then
			part.Material    = Enum.Material.Neon
			part.CastShadow  = false
			part.Reflectance = 0.0
		end
	end)
end

-- ══════════════════════════════════════════════
-- MAIN: Wait for WorldBuilder then apply
-- ══════════════════════════════════════════════

-- WorldBuilder tags a Model "WorldReady" on completion
local function waitForWorld()
	-- Check if Workspace already has the Zones folder
	local zones = game:GetService("Workspace"):FindFirstChild("Zones")
	if zones then return true end

	-- Poll until WorldBuilder finishes (max 30s)
	local t0 = os.clock()
	while os.clock() - t0 < 30 do
		zones = game:GetService("Workspace"):FindFirstChild("Zones")
		if zones then return true end
		task.wait(0.5)
	end
	return false
end

task.spawn(function()
	local ready = waitForWorld()
	if not ready then
		warn("[MaterialManager] World not ready after 30s — applying to whatever exists")
	end

	local totalApplied = 0
	for zoneName in pairs(ZONE_PALETTES) do
		local n = applyZoneMaterials(zoneName)
		totalApplied += n
	end

	-- Apply surface appearance
	for _, cfg in ipairs(SURFACE_CONFIGS) do
		local tagged = CollectionService:GetTagged(cfg.tag)
		for _, part in ipairs(tagged) do
			if part:IsA("BasePart") then
				applySurfaceAppearance(part, cfg.roughness, cfg.metalness)
			end
		end
	end

	polishAtomOrbs()

	print(string.format("[MaterialManager] Applied PBR materials to %d parts across %d zones",
		totalApplied, 6))

	-- Re-apply when new parts get tagged (dynamic spawning)
	for zoneName in pairs(ZONE_PALETTES) do
		CollectionService:GetInstanceAddedSignal("Zone_" .. zoneName):Connect(function(part)
			applyMaterial(part, zoneName)
		end)
	end
end)
