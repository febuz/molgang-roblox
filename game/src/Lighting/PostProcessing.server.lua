-- Lighting/PostProcessing.server.lua
-- Post-processing effects for MOLGANG's atmospheric look
-- Bloom for glowing atoms, atmosphere for space-archipelago feel

local Lighting = game:GetService("Lighting")

-- ══════════════════════════════════════════════
-- BLOOM — atoms and neon materials glow
-- ══════════════════════════════════════════════

local bloom = Instance.new("BloomEffect")
bloom.Intensity = 1.5
bloom.Size = 24
bloom.Threshold = 0.8
bloom.Parent = Lighting

-- ══════════════════════════════════════════════
-- COLOR CORRECTION — vibrant but not overpowering
-- ══════════════════════════════════════════════

local cc = Instance.new("ColorCorrectionEffect")
cc.Contrast = 0.15
cc.Saturation = 0.3
cc.TintColor = Color3.fromRGB(255, 255, 255) -- neutral tint
cc.Parent = Lighting

-- ══════════════════════════════════════════════
-- ATMOSPHERE — light space/archipelago haze
-- ══════════════════════════════════════════════

local atmo = Instance.new("Atmosphere")
atmo.Density = 0.2
atmo.Color = Color3.fromRGB(180, 220, 255)
atmo.Decay = Color3.fromRGB(30, 50, 40)
atmo.Glare = 0.1
atmo.Haze = 1.5
atmo.Offset = 0.25
atmo.Parent = Lighting

-- ══════════════════════════════════════════════
-- SKY — Milky Way + molecular structures
-- ══════════════════════════════════════════════

local sky = Instance.new("Sky")
sky.SkyboxBk = "rbxassetid://1012890590"  -- generic space skybox (free)
sky.SkyboxDn = "rbxassetid://1012890590"
sky.SkyboxFt = "rbxassetid://1012890590"
sky.SkyboxLf = "rbxassetid://1012890590"
sky.SkyboxRt = "rbxassetid://1012890590"
sky.SkyboxUp = "rbxassetid://1012890590"
sky.StarCount = 5000
sky.CelestialBodiesShown = false  -- no sun/moon — we're in space
sky.Parent = Lighting

print("[MOLGANG] Post-processing initialized")
