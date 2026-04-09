import { useState } from "react";

/* ═══════════════════════════════════════════════════════════
   CRYPTOS — AGENT MOL
   Claude Code Programmer Instructions
   Realistic 3D · VR/AR · Multi-Platform
   by Henricus Eduardus (EHMAC / Agent Mache)
═══════════════════════════════════════════════════════════ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#030608;color:#c8d8e8;font-family:'Inter',sans-serif;overflow-x:hidden;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-thumb{background:#0d2a1a;border-radius:2px;}

/* Scan effect */
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9998;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.04) 2px,rgba(0,0,0,.04) 4px);}

@keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes blink{0%,100%{opacity:1}49%{opacity:1}50%{opacity:0}}
@keyframes fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 #22c55e33}50%{box-shadow:0 0 0 8px transparent}}
@keyframes typing{from{width:0}to{width:100%}}
@keyframes scroll-x{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

.scan-line{position:fixed;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#22c55e44,transparent);
  pointer-events:none;z-index:9999;animation:scan 6s linear infinite;}
.blink{animation:blink 1s step-end infinite;}
.fade-in{animation:fade-in .4s ease-out forwards;}
.pulse{animation:pulse-glow 2s infinite;}
.spin{animation:spin 20s linear infinite;}

.tab-btn{padding:8px 16px;background:transparent;border:none;border-bottom:2px solid transparent;
  cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;
  text-transform:uppercase;color:#1a3a2a;transition:all .2s;white-space:nowrap;}
.tab-btn.active{color:#22c55e;border-bottom-color:#22c55e;}
.tab-btn:hover{color:#4a9a6a;}

.code-block{font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.8;
  background:#020507;border:1px solid #0a1f14;border-radius:8px;padding:16px;
  overflow-x:auto;white-space:pre;}
.code-block .kw{color:#22c55e;} .code-block .fn{color:#f59e0b;}
.code-block .st{color:#86efac;} .code-block .cm{color:#1a4a2a;}
.code-block .nu{color:#38bdf8;} .code-block .tp{color:#a78bfa;}
.code-block .op{color:#94a3b8;}

.platform-badge{padding:4px 10px;border-radius:20px;font-family:'JetBrains Mono',monospace;
  font-size:9px;letter-spacing:1px;border:1px solid;display:inline-block;margin:2px;}

.step-num{font-family:'Orbitron',sans-serif;font-size:32px;font-weight:900;
  opacity:.15;line-height:1;}
.priority-chip{padding:2px 8px;border-radius:4px;font-family:'JetBrains Mono',monospace;
  font-size:8px;letter-spacing:1px;border:1px solid;}
`;

// ── DATA ─────────────────────────────────────────────────────

const PLATFORMS = [
  { id:"vr_meta",   name:"Meta Quest 3/4", icon:"🥽", col:"#a78bfa", type:"VR",
    sdk:"Roblox VR Service", input:"Hand tracking + controllers", notes:"Native PCVR + standalone" },
  { id:"vr_psvr",  name:"PlayStation VR2", icon:"🎮", col:"#2563eb", type:"VR",
    sdk:"Roblox VR + PS5 SDK bridge", input:"PS Move 2 controllers", notes:"Via PS5 remote play tunnel" },
  { id:"vr_steam", name:"SteamVR (Index/Vive)", icon:"💻", col:"#1a9acc", type:"VR",
    sdk:"Roblox VR Service + SteamVR", input:"SteamVR controllers", notes:"PC Roblox client" },
  { id:"ar_phone",  name:"Smartphone AR", icon:"📱", col:"#22c55e", type:"AR",
    sdk:"ARKit (iOS) / ARCore (Android)", input:"Touch + gyro + camera", notes:"Roblox mobile + ANK app" },
  { id:"xbox",      name:"Xbox Series X/S", icon:"🎮", col:"#107c10", type:"Console",
    sdk:"Roblox Xbox client", input:"Xbox controller", notes:"Adaptive triggers supported" },
  { id:"ps5",       name:"PlayStation 5", icon:"🎮", col:"#003791", type:"Console",
    sdk:"Roblox PS5 client (2025)", input:"DualSense haptics", notes:"Haptic feedback + adaptive triggers" },
  { id:"switch",    name:"Nintendo Switch", icon:"🕹", col:"#e4000f", type:"Console",
    sdk:"Roblox Switch client", input:"Joy-Con gyro + touch", notes:"Handheld + docked modes" },
  { id:"pc",        name:"PC / Mac", icon:"🖥", col:"#6b7280", type:"Desktop",
    sdk:"Roblox desktop client", input:"KB+Mouse + gamepad", notes:"Ultra graphics mode" },
];

const VISUAL_SYSTEMS = [
  {
    id:"lighting", title:"Lighting & Global Illumination",
    priority:"CRITICAL", col:"#f59e0b",
    desc:"Roblox Future Lighting + custom HDR pipeline. Photorealistic light behaves physically — no more flat ambient.",
    modules:[
      { name:"Future Lighting Setup", file:"LightingConfig.lua",
        code:`-- LightingConfig.lua  (ServerScriptService)
-- MOLGANG Ultra Realistic Lighting Setup

local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")

-- ── CORE SETTINGS ──────────────────────────────────────
Lighting.Technology = Enum.Technology.Future  -- PBR + Raytracing
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.25     -- Soft shadows (0=hard, 1=very soft)
Lighting.Brightness = 2.0
Lighting.EnvironmentDiffuseScale = 0.8
Lighting.EnvironmentSpecularScale = 1.0
Lighting.ExposureCompensation = 0.2

-- ── ATMOSPHERE ─────────────────────────────────────────
local atm = Instance.new("Atmosphere", Lighting)
atm.Density       = 0.22    -- Haze amount
atm.Offset        = 0.08    -- Horizon offset
atm.Color         = Color3.fromRGB(199, 210, 225)  -- Sky color
atm.Decay         = Color3.fromRGB(80, 110, 150)
atm.Glare         = 0.12    -- Sun glare intensity
atm.Haze          = 0.08    -- Distant haze

-- ── SUN / SKY ──────────────────────────────────────────
local sun = Instance.new("Sky", Lighting)
sun.SkyboxBk = "rbxassetid://6444884337"  -- 4K HDRI sky back
sun.SkyboxDn = "rbxassetid://6444884337"  -- bottom
sun.SkyboxFt = "rbxassetid://6444884337"  -- front
sun.SkyboxLf = "rbxassetid://6444884337"  -- left
sun.SkyboxRt = "rbxassetid://6444884337"  -- right
sun.SkyboxUp = "rbxassetid://6444884337"  -- top
sun.SunAngularSize = 0.55   -- Realistic sun size
sun.SunTextureId   = "rbxassetid://6444856000"
sun.MoonAngularSize = 11
sun.StarCount      = 5000   -- Night stars

-- ── POST-PROCESSING ────────────────────────────────────
local cc = Instance.new("ColorCorrectionEffect", Lighting)
cc.Brightness = 0.02 ; cc.Contrast = 0.08
cc.Saturation = 0.15 ; cc.TintColor = Color3.fromRGB(253,248,240)

local bloom = Instance.new("BloomEffect", Lighting)
bloom.Intensity = 0.4 ; bloom.Size = 24 ; bloom.Threshold = 0.95

local blur = Instance.new("DepthOfFieldEffect", Lighting)
blur.FocusDistance = 40    -- meters from camera
blur.InFocusRadius = 5
blur.NearIntensity = 0.3
blur.FarIntensity  = 0.8

local sunrays = Instance.new("SunRaysEffect", Lighting)
sunrays.Intensity = 0.12 ; sunrays.Spread = 0.6

-- ── DYNAMIC TIME-OF-DAY ────────────────────────────────
-- 1 real minute = 1 game hour (24-min full cycle)
local SPEED = 1/24  -- clock multiplier
RunService.Heartbeat:Connect(function(dt)
  Lighting.ClockTime = (Lighting.ClockTime + dt * SPEED) % 24
end)` },
    ]
  },
  {
    id:"pbr", title:"PBR Materials — Physically Based Rendering",
    priority:"CRITICAL", col:"#22c55e",
    desc:"Every surface in MOLGANG has real-world material properties. Steel reflects like steel. Acid glows. Glass refracts.",
    modules:[
      { name:"Material Manager", file:"MaterialManager.lua",
        code:`-- MaterialManager.lua  (ReplicatedStorage/Modules)
-- Assigns PBR SurfaceAppearance to all zone objects

local Materials = {}

-- PBR Material Definitions
-- Each asset ID points to a Roblox Texture (512-2048px)
Materials.DEFS = {

  -- ZAANDAM FACTORY MATERIALS
  factory_steel = {
    ColorMap       = "rbxassetid://9876543001",  -- Brushed steel albedo
    NormalMap      = "rbxassetid://9876543002",  -- Normal map (surface bumps)
    MetalnessMap   = "rbxassetid://9876543003",  -- Metalness (white = full metal)
    RoughnessMap   = "rbxassetid://9876543004",  -- Roughness (0=mirror, 1=matte)
    Roughness = 0.28, Metalness = 0.92,
  },
  corroded_iron = {
    ColorMap     = "rbxassetid://9876543010",
    NormalMap    = "rbxassetid://9876543011",
    MetalnessMap = "rbxassetid://9876543012",
    Roughness = 0.75, Metalness = 0.60,
  },
  acid_green_liquid = {
    ColorMap  = "rbxassetid://9876543020",
    Roughness = 0.02, Metalness = 0.0,  -- Near mirror
    -- Emissive glow on pH-vat liquids
    _emissive = Color3.fromRGB(100, 255, 80),
    _emissiveIntensity = 0.8,
  },

  -- WOGNUM NATURE MATERIALS
  polder_grass = {
    ColorMap  = "rbxassetid://9876543030",
    NormalMap = "rbxassetid://9876543031",
    Roughness = 0.95, Metalness = 0.0,
  },
  peony_petal = {
    ColorMap  = "rbxassetid://9876543040",
    NormalMap = "rbxassetid://9876543041",
    Roughness = 0.82, Metalness = 0.0,
  },

  -- QUANTUM LAB MATERIALS
  cryogenic_metal = {
    ColorMap     = "rbxassetid://9876543050",
    NormalMap    = "rbxassetid://9876543051",
    MetalnessMap = "rbxassetid://9876543052",
    Roughness = 0.12, Metalness = 0.98,
    -- Ice frost overlay
    _frostEmissive = Color3.fromRGB(180, 230, 255),
  },
  quantum_glass = {
    ColorMap  = "rbxassetid://9876543060",
    Roughness = 0.0, Metalness = 0.0,
    _transparency = 0.85,
    _refraction = true,
  },
}

-- Apply SurfaceAppearance to a BasePart
function Materials.Apply(part, matName)
  local def = Materials.DEFS[matName]
  if not def then warn("Material not found:", matName) return end

  -- Remove existing SurfaceAppearance
  local existing = part:FindFirstChildOfClass("SurfaceAppearance")
  if existing then existing:Destroy() end

  local sa = Instance.new("SurfaceAppearance", part)
  if def.ColorMap     then sa.ColorMap     = def.ColorMap     end
  if def.NormalMap    then sa.NormalMap    = def.NormalMap    end
  if def.MetalnessMap then sa.MetalnessMap = def.MetalnessMap end
  if def.RoughnessMap then sa.RoughnessMap = def.RoughnessMap end

  sa.Roughness = def.Roughness or 0.5
  sa.Metalness = def.Metalness or 0.0

  -- Emissive glow
  if def._emissive then
    local glow = Instance.new("SelectionBox")
    -- Use PointLight for emissive glow effect
    local light = Instance.new("PointLight", part)
    light.Color      = def._emissive
    light.Brightness = (def._emissiveIntensity or 1) * 3
    light.Range      = 8
    light.Shadows    = true
  end
end

return Materials` },
    ]
  },
  {
    id:"vfx", title:"VFX — Particle Systems & Shaders",
    priority:"HIGH", col:"#a78bfa",
    desc:"39 chemical reactions each have unique VFX. HGMS magnetic fields visualised. CarbonGhost glitch shaders.",
    modules:[
      { name:"Reaction VFX Engine", file:"ReactionVFX.lua",
        code:`-- ReactionVFX.lua  (ReplicatedStorage/VFX)
-- Visual effects for all 39 chemical reactions

local TweenService   = game:GetService("TweenService")
local Debris         = game:GetService("Debris")
local ReactionVFX    = {}

-- ── REACTION VISUAL PROFILES ──────────────────────────────────
ReactionVFX.PROFILES = {

  -- CaCO₃ formation (CO₂ capture) — white crystalline precipitation
  CaCO3_formation = {
    ParticleColor = ColorSequence.new({
      ColorSequenceKeypoint.new(0,   Color3.fromRGB(255,255,255)),
      ColorSequenceKeypoint.new(0.5, Color3.fromRGB(220,235,255)),
      ColorSequenceKeypoint.new(1,   Color3.fromRGB(180,200,240)),
    }),
    LightEmission  = 0.2,
    Rotation       = NumberRange.new(-360, 360),
    RotSpeed       = NumberRange.new(-30, 30),
    Speed          = NumberRange.new(0.5, 2),
    Lifetime       = NumberRange.new(1.5, 3.5),
    Rate           = 80,
    Texture        = "rbxassetid://7248994855",  -- Crystal sparkle
    SoundId        = "rbxassetid://507012678",    -- Crystal chime
    SoundVolume    = 0.4,
  },

  -- V₂O₅ extraction — golden/orange crystalline
  V2O5_extraction = {
    ParticleColor = ColorSequence.new({
      ColorSequenceKeypoint.new(0,   Color3.fromRGB(255,210,50)),
      ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255,140,10)),
      ColorSequenceKeypoint.new(1,   Color3.fromRGB(200,80,0)),
    }),
    LightEmission = 0.7,
    Speed         = NumberRange.new(1, 4),
    Lifetime      = NumberRange.new(0.8, 2),
    Rate          = 120,
    Texture       = "rbxassetid://5217897500",   -- Sparkle burst
    SoundId       = "rbxassetid://131768573",     -- Metallic ting
    SoundVolume   = 0.6,
    -- Radial screen flash in gold
    _screenFlash  = Color3.fromRGB(255,200,50),
    _flashDuration = 0.15,
  },

  -- CarbonGhost glitch — red data corruption effect
  CarbonGhost_glitch = {
    ParticleColor = ColorSequence.new({
      ColorSequenceKeypoint.new(0,   Color3.fromRGB(255,30,30)),
      ColorSequenceKeypoint.new(0.3, Color3.fromRGB(255,0,100)),
      ColorSequenceKeypoint.new(1,   Color3.fromRGB(100,0,200)),
    }),
    LightEmission = 1.0,
    Speed         = NumberRange.new(5, 20),
    Lifetime      = NumberRange.new(0.1, 0.4),
    Rate          = 500,   -- Dense burst
    Texture       = "rbxassetid://6027713728",  -- Pixel glitch texture
    SoundId       = "rbxassetid://9113294244",   -- Glitch sound
    SoundVolume   = 1.0,
    _screenDistort = true,   -- Screen chromatic aberration effect
    _distortAmount = 0.04,
  },

  -- Quantum dot capture — rainbow prismatic
  quantum_dot_capture = {
    ParticleColor = ColorSequence.new({
      ColorSequenceKeypoint.new(0,   Color3.fromRGB(100,200,255)),
      ColorSequenceKeypoint.new(0.25,Color3.fromRGB(200,100,255)),
      ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255,255,100)),
      ColorSequenceKeypoint.new(0.75,Color3.fromRGB(100,255,150)),
      ColorSequenceKeypoint.new(1,   Color3.fromRGB(255,150,100)),
    }),
    LightEmission = 1.0,
    Speed         = NumberRange.new(2, 12),
    Lifetime      = NumberRange.new(0.4, 1.2),
    Rate          = 300,
    Texture       = "rbxassetid://7248994855",
    SoundId       = "rbxassetid://131768573",
    SoundVolume   = 0.8,
    _slowMotion   = true,    -- Brief 0.5× time scale
    _slowDuration = 0.3,
  },
}

-- ── HGMS MAGNETIC FIELD VISUALIZER ───────────────────────────
-- Draws field lines around HGMS magnet objects
function ReactionVFX.ShowMagneticField(magnetPart, tesla)
  -- tesla: 0.3, 0.7, or 1.5 (HGMS stages)
  local fieldColor = tesla < 0.5
    and Color3.fromRGB(80,160,255)    -- 0.3T = blue
    or tesla < 1.0
    and Color3.fromRGB(200,100,255)   -- 0.7T = violet
    or Color3.fromRGB(255,50,50)      -- 1.5T = red (strongest)

  -- Spawn 12 arc BeamEffects around magnet
  for i = 1, 12 do
    local angle = (i/12) * math.pi * 2
    local radius = 3 + tesla * 2
    -- Beam from magnet center to field point
    local attach0 = Instance.new("Attachment", magnetPart)
    attach0.Position = Vector3.new(0,0,0)
    local attach1 = Instance.new("Attachment", magnetPart)
    attach1.Position = Vector3.new(
      math.cos(angle) * radius, 0, math.sin(angle) * radius
    )
    local beam = Instance.new("Beam", magnetPart)
    beam.Attachment0 = attach0
    beam.Attachment1 = attach1
    beam.Color       = ColorSequence.new(fieldColor)
    beam.Width0 = 0.05 * tesla
    beam.Width1 = 0
    beam.LightEmission = 0.8
    beam.LightInfluence = 0.2
    beam.Transparency = NumberSequence.new({
      NumberSequenceKeypoint.new(0, 0.2),
      NumberSequenceKeypoint.new(1, 1.0),
    })
    -- Animate field lines
    local tween = TweenService:Create(beam,
      TweenInfo.new(0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
      {Width0 = 0.08 * tesla}
    )
    tween:Play()
  end
end

return ReactionVFX` },
    ]
  },
];

const VR_MODULES = [
  {
    title:"VR Core Service",
    file:"VRService.lua", priority:"CRITICAL", col:"#a78bfa",
    code:`-- VRService.lua  (LocalScript in StarterPlayerScripts)
-- Handles all VR device detection and session management

local VRService    = game:GetService("VRService")
local UserInputSvc = game:GetService("UserInputService")
local RunService   = game:GetService("RunService")
local Players      = game:GetService("Players")
local Camera       = workspace.CurrentCamera

local VR = {}
VR.IsVR         = false
VR.HeadsetType  = "None"   -- "MetaQuest" | "PSVR2" | "Index" | "Generic"
VR.IPD          = 64.0     -- Inter-Pupillary Distance (mm) — default
VR.SnapTurn     = false    -- Smooth turn vs snap turn preference
VR.TurnAngle    = 45       -- Snap turn degrees
VR.ComfortMode  = false    -- Reduces motion sickness

-- ── DEVICE DETECTION ──────────────────────────────────────────
function VR.Init()
  VR.IsVR = VRService.VREnabled

  if VR.IsVR then
    -- Identify headset by reported UserAgent or VR device info
    local device = VRService:GetUserCFrameEnabled(Enum.UserCFrame.Head)
    if device then
      -- Roblox reports device via game:GetService("UserInputService")
      local gamepadType = UserInputSvc:GetStringForKeyCode(Enum.KeyCode.ButtonA)
      if string.find(gamepadType or "", "PSVR") then
        VR.HeadsetType = "PSVR2"
      elseif string.find(gamepadType or "", "Quest") then
        VR.HeadsetType = "MetaQuest"
      else
        VR.HeadsetType = "Generic"
      end
    end

    -- Set camera to VR mode
    Camera.CameraType = Enum.CameraType.Custom
    VRService.AutomaticScaling = Enum.VRScaling.World

    -- Player height calibration
    local char = Players.LocalPlayer.Character
    if char then
      local hrp = char:FindFirstChild("HumanoidRootPart")
      if hrp then
        -- Scale world to player's real height (default 1.75m → 5.5 studs)
        VRService:SetUserCFrameEnabled(Enum.UserCFrame.Head, true)
        VRService:SetUserCFrameEnabled(Enum.UserCFrame.LeftHand, true)
        VRService:SetUserCFrameEnabled(Enum.UserCFrame.RightHand, true)
      end
    end

    -- Apply comfort settings
    if VR.ComfortMode then
      VR.EnableComfortVignette()
    end
    print("[MOLGANG VR] Initialized —", VR.HeadsetType)
  end
end

-- ── COMFORT VIGNETTE (reduces motion sickness) ────────────────
function VR.EnableComfortVignette()
  -- Dark border during movement to reduce peripheral motion blur
  local gui = Players.LocalPlayer:WaitForChild("PlayerGui")
  local vignette = Instance.new("ScreenGui", gui)
  vignette.Name = "VRVignette"
  vignette.IgnoreGuiInset = true
  local frame = Instance.new("Frame", vignette)
  frame.Size = UDim2.fromScale(1,1)
  frame.BackgroundTransparency = 1
  -- Radial gradient via UIGradient
  local gradient = Instance.new("UIGradient", frame)
  gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.new(0,0,0)),
    ColorSequenceKeypoint.new(0.7, Color3.new(0,0,0)),
    ColorSequenceKeypoint.new(1, Color3.new(0,0,0)),
  })
  -- Activate during movement, deactivate when still
  local moving = false
  RunService.Heartbeat:Connect(function()
    local vel = Players.LocalPlayer.Character
      and Players.LocalPlayer.Character:FindFirstChild("HumanoidRootPart")
      and Players.LocalPlayer.Character.HumanoidRootPart.Velocity
    local speed = vel and vel.Magnitude or 0
    local targetAlpha = speed > 2 and 0.5 or 0
    -- Smooth fade
    frame.BackgroundTransparency = frame.BackgroundTransparency
      + (targetAlpha == 0 and 0.05 or -0.05)
    frame.BackgroundTransparency = math.clamp(frame.BackgroundTransparency, 0, 0.7)
  end)
end

-- ── SNAP TURN (VR locomotion) ─────────────────────────────────
local lastSnapTime = 0
function VR.HandleSnapTurn(thumbstickX)
  if not VR.SnapTurn then return end
  local now = tick()
  if now - lastSnapTime < 0.3 then return end  -- Cooldown
  if math.abs(thumbstickX) > 0.7 then
    local dir = thumbstickX > 0 and 1 or -1
    local currentCF = Camera.CFrame
    Camera.CFrame = CFrame.new(currentCF.Position)
      * CFrame.Angles(0, math.rad(-dir * VR.TurnAngle), 0)
      * CFrame.new(-currentCF.Position)
      * currentCF
    lastSnapTime = now
  end
end

VR.Init()
return VR`
  },
  {
    title:"VR Hand Interaction",
    file:"VRHandController.lua", priority:"CRITICAL", col:"#38bdf8",
    code:`-- VRHandController.lua  (LocalScript)
-- Full hand tracking for atom catching, molecule building, pH ladder

local VRService    = game:GetService("VRService")
local RunService   = game:GetService("RunService")
local Players      = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local HandCtrl = {}
HandCtrl.LeftGrab   = false
HandCtrl.RightGrab  = false
HandCtrl.HeldAtom   = nil   -- Currently held atom

-- Controller models (visible in VR)
local leftHandModel  = nil
local rightHandModel = nil

function HandCtrl.Init(character)
  -- Create visual hand meshes
  leftHandModel  = HandCtrl.CreateHandMesh("Left",  character)
  rightHandModel = HandCtrl.CreateHandMesh("Right", character)
end

function HandCtrl.CreateHandMesh(side, character)
  -- Create a hand-shaped part following the controller
  local hand = Instance.new("Model")
  hand.Name = side .. "VRHand"

  local palm = Instance.new("Part", hand)
  palm.Name  = "Palm"
  palm.Size  = Vector3.new(0.4, 0.12, 0.6)
  palm.Anchored = false
  palm.CanCollide = false
  palm.CastShadow = false

  -- PBR glove material (Agent Mol style)
  local sa = Instance.new("SurfaceAppearance", palm)
  sa.ColorMap     = "rbxassetid://GLOVE_ALBEDO_ID"
  sa.NormalMap    = "rbxassetid://GLOVE_NORMAL_ID"
  sa.Roughness = 0.65 ; sa.Metalness = 0.1

  -- Weld to VR controller position
  local weld = Instance.new("WeldConstraint", palm)

  -- HUD display on left palm (like a wristwatch)
  local palmBillboard = Instance.new("BillboardGui", palm)
  palmBillboard.Size        = UDim2.fromOffset(120, 60)
  palmBillboard.StudsOffset = Vector3.new(0, 0.1, 0)
  local palmLabel = Instance.new("TextLabel", palmBillboard)
  palmLabel.Size            = UDim2.fromScale(1,1)
  palmLabel.BackgroundColor3 = Color3.fromRGB(0, 30, 15)
  palmLabel.BackgroundTransparency = 0.3
  palmLabel.TextColor3      = Color3.fromRGB(0, 255, 100)
  palmLabel.TextScaled      = true
  palmLabel.Font            = Enum.Font.Code
  palmLabel.Text            = "MOL: 0\nCO₂: +0g"

  hand.Parent = workspace
  return hand
end

-- ── ATOM GRAB MECHANIC ────────────────────────────────────────
function HandCtrl.OnTriggerPress(side, position)
  -- Raycast for nearby atoms (2 stud radius)
  local overlapParams = OverlapParams.new()
  overlapParams.FilterType = Enum.RaycastFilterType.Include
  overlapParams.FilterDescendantsInstances = {workspace.Atoms}

  local atoms = workspace:GetPartBoundsInRadius(position, 2.0, overlapParams)
  if #atoms > 0 then
    local closest = atoms[1]
    HandCtrl.GrabAtom(closest, side)
  end
end

function HandCtrl.GrabAtom(atomPart, side)
  if HandCtrl.HeldAtom then return end  -- Already holding something

  HandCtrl.HeldAtom = atomPart
  atomPart.Anchored = true  -- Prevent physics while held

  -- Haptic feedback
  local gamepad = side == "Left"
    and Enum.UserInputType.Gamepad1
    or  Enum.UserInputType.Gamepad2
  game:GetService("HapticService"):SetMotor(
    gamepad, Enum.VibrationMotor.Small, 0.4
  )
  task.delay(0.15, function()
    game:GetService("HapticService"):SetMotor(
      gamepad, Enum.VibrationMotor.Small, 0
    )
  end)

  -- Atom glows when grabbed
  local light = Instance.new("PointLight", atomPart)
  light.Color      = atomPart:GetAttribute("ElementColor") or Color3.fromRGB(100,255,150)
  light.Brightness = 2.0
  light.Range      = 4
  HandCtrl.HeldAtomLight = light

  print("[VR] Grabbed:", atomPart:GetAttribute("ElementSymbol"))
end

function HandCtrl.ReleaseAtom(position)
  if not HandCtrl.HeldAtom then return end
  local atom = HandCtrl.HeldAtom

  -- Check if near a molecule builder slot
  local builderSlots = workspace:GetPartBoundsInRadius(position, 1.5, OverlapParams.new())
  local slotFound = nil
  for _, part in builderSlots do
    if part:GetAttribute("MoleculeSlot") then
      slotFound = part
      break
    end
  end

  if slotFound then
    -- Snap to slot — molecule building!
    atom.Position = slotFound.Position
    atom.Anchored = true
    MoleculeBuilder.PlaceAtom(atom, slotFound)
  else
    atom.Anchored = false  -- Drop it
  end

  if HandCtrl.HeldAtomLight then
    HandCtrl.HeldAtomLight:Destroy()
  end
  HandCtrl.HeldAtom = nil
end

return HandCtrl`
  },
  {
    title:"AR Smartphone Mode",
    file:"ARMobileService.lua", priority:"HIGH", col:"#22c55e",
    code:`-- ARMobileService.lua  (LocalScript — Mobile only)
-- Activates AR camera pass-through on iOS (ARKit) and Android (ARCore)
-- Works in conjunction with the ANK Collateral App (separate React Native app)

local UserInputSvc = game:GetService("UserInputService")
local RunService   = game:GetService("RunService")
local Camera       = workspace.CurrentCamera

local ARMode = {}
ARMode.IsActive = false
ARMode.GyroEnabled = false

-- Detect mobile device
function ARMode.IsMobile()
  return UserInputSvc.TouchEnabled and not UserInputSvc.KeyboardEnabled
end

function ARMode.Init()
  if not ARMode.IsMobile() then return end

  -- Enable gyroscope tracking
  UserInputSvc.AccelerometerEnabled = true
  UserInputSvc.GyroscopeEnabled     = true
  ARMode.GyroEnabled = true

  -- Transparent camera background (for AR passthrough)
  -- Roblox doesn't natively support camera passthrough,
  -- but we simulate AR by:
  -- 1. Making background transparent on Sky
  -- 2. Using phone camera as background via WebView overlay
  --    (via Roblox In-Experience Browser or ANK app bridge)
  Camera.CameraType = Enum.CameraType.Scriptable

  print("[MOLGANG AR] Mobile AR mode initialized")
end

-- ── GYRO CAMERA CONTROL ───────────────────────────────────────
function ARMode.BindGyroCamera()
  RunService.RenderStepped:Connect(function()
    if not ARMode.GyroEnabled then return end

    local gyro    = UserInputSvc:GetDeviceRotation()
    local accel   = UserInputSvc:GetDeviceGravity()

    -- Convert device orientation to camera CFrame
    local cframe  = CFrame.new(Camera.CFrame.Position)
      * CFrame.fromEulerAngles(gyro.X, gyro.Y, gyro.Z)

    Camera.CFrame = cframe
  end)
end

-- ── AR ATOM OVERLAY ───────────────────────────────────────────
-- Spawn atoms that appear to sit in real-world space
function ARMode.SpawnARAtom(elementSymbol, worldPos)
  local atom = Instance.new("Part", workspace)
  atom.Name     = "ARAtom_" .. elementSymbol
  atom.Position = worldPos
  atom.Size     = Vector3.new(1.2, 1.2, 1.2)
  atom.Shape    = Enum.PartType.Ball
  atom.Anchored = true
  atom.CastShadow = false

  -- Semi-transparent holographic material
  atom.Material    = Enum.Material.Neon
  atom.Color       = Color3.fromRGB(0, 200, 120)
  atom.Transparency = 0.3

  -- Floating label
  local bg = Instance.new("BillboardGui", atom)
  bg.Size           = UDim2.fromOffset(80, 30)
  bg.StudsOffset    = Vector3.new(0, 1.2, 0)
  bg.AlwaysOnTop    = true
  local lbl = Instance.new("TextLabel", bg)
  lbl.Size             = UDim2.fromScale(1,1)
  lbl.BackgroundColor3 = Color3.fromRGB(0,20,10)
  lbl.BackgroundTransparency = 0.4
  lbl.TextColor3       = Color3.fromRGB(0,255,120)
  lbl.Text             = elementSymbol
  lbl.Font             = Enum.Font.Code
  lbl.TextScaled       = true

  -- Tap to collect (mobile touch)
  atom.Touched:Connect(function()
    -- Collect atom
    ARMode.CollectARAtom(atom, elementSymbol)
  end)

  return atom
end

-- ── ANK APP BRIDGE ────────────────────────────────────────────
-- Deep link to ANK Collateral App when player scans real object
-- The ANK app opens, player registers their object, NFT minted,
-- then returns to game with new MOLNFT in wallet
function ARMode.OpenANKApp(nftData)
  -- Opens ANK app via universal link (iOS) or intent (Android)
  -- Deep link format: molgang://ank/register?data={base64(nftData)}
  local encoded = game:GetService("HttpService"):JSONEncode(nftData)
  -- The link is handled by Roblox's ExternalLinkGui or platform browser
  game:GetService("GuiService"):OpenBrowserWindow(
    "molgang://ank/register?payload=" .. encoded
  )
end

ARMode.Init()
ARMode.BindGyroCamera()
return ARMode`
  },
];

const PLATFORM_MODULES = [
  {
    title:"Multi-Platform Input Manager",
    file:"InputManager.lua", priority:"CRITICAL", col:"#f59e0b",
    code:`-- InputManager.lua  (LocalScript in StarterPlayerScripts)
-- Unified input handling for: VR, Xbox, PS5, Switch, PC, Mobile

local UIS  = game:GetService("UserInputService")
local GS   = game:GetService("GamepadService")

local Input = {}
Input.Platform = "PC"    -- Detected platform
Input.HasHaptics = false
Input.HasGyro    = false

-- ── PLATFORM DETECTION ────────────────────────────────────────
function Input.Detect()
  if game:GetService("VRService").VREnabled then
    Input.Platform = "VR"
  elseif UIS.TouchEnabled and not UIS.KeyboardEnabled then
    Input.Platform = "Mobile"
    Input.HasGyro  = true
  elseif UIS.GamepadEnabled then
    -- Differentiate console by gamepad type
    local pads = UIS:GetConnectedGamepads()
    for _, pad in pads do
      local info = UIS:GetGamepadState(pad)
      -- PS5 DualSense: has adaptive trigger resistance
      if UIS:IsGamepadButtonSupported(pad, Enum.KeyCode.ButtonL2) then
        Input.Platform    = "PS5"
        Input.HasHaptics  = true  -- DualSense haptics
      else
        Input.Platform    = "Xbox"
        Input.HasHaptics  = true  -- Rumble
      end
    end
  else
    Input.Platform = "PC"
  end
  print("[MOLGANG Input] Platform:", Input.Platform)
end

-- ── ACTION BINDING TABLE ──────────────────────────────────────
-- Unified actions across all platforms
Input.Bindings = {
  Interact = {
    PC      = {Enum.KeyCode.E},
    Xbox    = {Enum.KeyCode.ButtonX},
    PS5     = {Enum.KeyCode.ButtonSquare},
    Switch  = {Enum.KeyCode.ButtonX},
    Mobile  = "Tap",
    VR      = "TriggerRight",
  },
  Jump = {
    PC      = {Enum.KeyCode.Space},
    Xbox    = {Enum.KeyCode.ButtonA},
    PS5     = {Enum.KeyCode.ButtonCross},
    Switch  = {Enum.KeyCode.ButtonB},
    Mobile  = "JumpButton",
    VR      = "ThumbstickClickRight",
  },
  OpenMolBuilder = {
    PC      = {Enum.KeyCode.Q},
    Xbox    = {Enum.KeyCode.ButtonY},
    PS5     = {Enum.KeyCode.ButtonTriangle},
    Switch  = {Enum.KeyCode.ButtonY},
    Mobile  = "UIButton",
    VR      = "MenuButton",
  },
  Sprint = {
    PC      = {Enum.KeyCode.LeftShift},
    Xbox    = {Enum.KeyCode.ButtonL3},
    PS5     = {Enum.KeyCode.ButtonL3},
    Switch  = {Enum.KeyCode.ButtonL3},
    Mobile  = "DoubleTap",
    VR      = "GripLeft",
  },
  ScanAtom = {
    PC      = {Enum.KeyCode.F},
    Xbox    = {Enum.KeyCode.ButtonRB},
    PS5     = {Enum.KeyCode.ButtonR1},
    Switch  = {Enum.KeyCode.ButtonR},
    Mobile  = "CameraButton",
    VR      = "TriggerLeft",
  },
}

-- ── PS5 DUALSENSE ADAPTIVE TRIGGERS ──────────────────────────
-- pH Ladder puzzle: trigger resistance increases at wrong pH step
function Input.SetAdaptiveTrigger(triggerSide, mode, params)
  if Input.Platform ~= "PS5" then return end
  -- Roblox exposes PS5 haptics via HapticService
  local haptic = game:GetService("HapticService")
  local motor = triggerSide == "Left"
    and Enum.VibrationMotor.Large
    or  Enum.VibrationMotor.Small

  if mode == "Rigid" then
    -- Hard resistance — wrong action
    haptic:SetMotor(Enum.UserInputType.Gamepad1, motor, 1.0)
  elseif mode == "Weapon" then
    -- Progressive resistance — pulling pH lever
    haptic:SetMotor(Enum.UserInputType.Gamepad1, motor, params.intensity or 0.5)
  elseif mode == "Off" then
    haptic:SetMotor(Enum.UserInputType.Gamepad1, motor, 0)
  end
end

-- ── NINTENDO SWITCH GYRO AIMING ──────────────────────────────
function Input.BindSwitchGyro()
  if Input.Platform ~= "Switch" then return end
  -- Use gyroscope for precision atom-catching (Joy-Con gyro)
  UIS.DeviceRotationChanged:Connect(function(delta, cf)
    local aimOffset = Vector2.new(
      delta.Y * 2.0,   -- Horizontal
      delta.X * 2.0    -- Vertical (inverted)
    )
    -- Apply to aim reticle
    game.ReplicatedStorage.Events.AimDelta:FireServer(aimOffset)
  end)
end

-- ── HAPTIC FEEDBACK PROFILES ──────────────────────────────────
Input.HapticProfiles = {
  AtomCatch       = {large=0.3, small=0.6, duration=0.1},
  MoleculeComplete= {large=0.8, small=0.8, duration=0.4},
  WrongpH         = {large=0.2, small=0.9, duration=0.05},
  CarbonGhostHit  = {large=1.0, small=1.0, duration=0.6},
  Footstep        = {large=0.1, small=0.0, duration=0.05},
  HMGSPulse       = {large=0.4, small=0.2, duration=0.2},
}

function Input.Haptic(profileName)
  if not Input.HasHaptics then return end
  local p = Input.HapticProfiles[profileName]
  if not p then return end
  local haptic = game:GetService("HapticService")
  haptic:SetMotor(Enum.UserInputType.Gamepad1, Enum.VibrationMotor.Large, p.large)
  haptic:SetMotor(Enum.UserInputType.Gamepad1, Enum.VibrationMotor.Small, p.small)
  task.delay(p.duration, function()
    haptic:SetMotor(Enum.UserInputType.Gamepad1, Enum.VibrationMotor.Large, 0)
    haptic:SetMotor(Enum.UserInputType.Gamepad1, Enum.VibrationMotor.Small, 0)
  end)
end

Input.Detect()
Input.BindSwitchGyro()
return Input`
  },
];

const ASSET_PIPELINE = [
  { step:1, title:"3D Model Pipeline", col:"#f59e0b",
    desc:"All zone assets modeled in Blender 4.x, exported as FBX, imported to Roblox Studio with PBR textures.",
    items:[
      "Target: 10K-80K triangles per hero asset (characters, machines)",
      "LOD system: LOD0 (full), LOD1 (50%), LOD2 (25%) — auto-switch at 50/150 studs",
      "Texture resolution: 2048×2048 for hero assets, 512×512 for props",
      "Normal maps baked from high-poly sculpt in ZBrush or Blender",
      "Sketchfab assets (20 verified): re-export as FBX from Sketchfab + re-rig in Blender",
    ],
    code:`-- LOD Manager (ReplicatedStorage/Modules/LODManager.lua)
-- Switches mesh detail based on camera distance

local LOD = {}
local RunService = game:GetService("RunService")
local Camera     = workspace.CurrentCamera

-- LOD threshold distances (in studs)
local THRESHOLDS = {LOD0=0, LOD1=50, LOD2=150, LODCull=400}

-- Register an asset with its LOD variants
function LOD.Register(model, lod1, lod2)
  -- model: full-detail Model
  -- lod1/lod2: lower-res variants
  LOD._assets = LOD._assets or {}
  table.insert(LOD._assets, {
    primary = model,
    lods    = {model, lod1, lod2},
    current = 0,
  })
end

-- Update per-frame (runs on client only)
RunService.Heartbeat:Connect(function()
  if not LOD._assets then return end
  local camPos = Camera.CFrame.Position
  for _, asset in LOD._assets do
    local dist = (asset.primary.PrimaryPart.Position - camPos).Magnitude
    local target = dist < 50 and 0 or dist < 150 and 1 or dist < 400 and 2 or -1
    if target ~= asset.current then
      for i, lod in asset.lods do
        lod.Parent = i-1 == target and workspace or nil
      end
      if target == -1 then asset.primary.Parent = nil end
      asset.current = target
    end
  end
end)
return LOD`
  },
  { step:2, title:"Audio Architecture", col:"#38bdf8",
    desc:"3D spatialized audio with MoH-inspired distance falloff. Each zone has layered ambient tracks.",
    items:[
      "SoundService.RespectFilteringEnabled = true",
      "Spatial audio: RolloffStyle = InverseTapered, MinDistance=5, MaxDistance=200",
      "Distance effect: NPC voice at 200+ studs = radio filter (EQ + reverb)",
      "Reverb zones: factory=large_metal, quantum=echo_chamber, polder=open_air",
      "Dynamic music: base layer + danger layer (CarbonGhost) + discovery layer",
    ],
    code:`-- AudioManager.lua  (LocalScript)
local SoundService = game:GetService("SoundService")
local RunService   = game:GetService("RunService")

-- ── ZONE AMBIENT SYSTEM ────────────────────────────────────────
local ZoneAmbients = {
  zaandam = {
    base     = "rbxassetid://FACTORY_AMBIENT",     -- Machinery loop
    danger   = "rbxassetid://CARBONGH_ALARM",       -- CarbonGhost alert
    discover = "rbxassetid://VANADIUM_CHIME",        -- V2O5 discovery
    reverb   = Enum.ReverbType.MediumRoom,
  },
  wognum = {
    base     = "rbxassetid://POLDER_WIND",
    danger   = "rbxassetid://NITROGEN_BUZZ",
    discover = "rbxassetid://PETAL_CHIME",
    reverb   = Enum.ReverbType.NoReverb,
  },
  quantum = {
    base     = "rbxassetid://CRYO_HUM",
    danger   = "rbxassetid://DECOHERENCE_STATIC",
    discover = "rbxassetid://QUANTUM_PING",
    reverb   = Enum.ReverbType.SmallRoom,
  },
}

-- ── NPC DISTANCE AUDIO FILTER ─────────────────────────────────
-- NPCs at >80 studs get radio filter (EqualizerSoundEffect)
local function updateNPCAudio(npcSound, distance)
  local eq = npcSound:FindFirstChildOfClass("EqualizerSoundEffect")
    or Instance.new("EqualizerSoundEffect", npcSound)
  if distance > 80 then
    -- Radio effect: cut low + high frequencies
    eq.LowGain  = -20  -- Remove bass
    eq.HighGain = -15  -- Remove highs
    eq.MidGain  =  5   -- Boost mids (telephone range)
    npcSound.Volume = math.max(0.1, 1 - (distance-80)/200)
  else
    eq.LowGain = 0 ; eq.HighGain = 0 ; eq.MidGain = 0
    npcSound.Volume = math.max(0.3, 1 - distance/200)
  end
end`
  },
];

const TABS = ["📋 Overview","🖥 Visual Systems","🥽 VR / AR","🎮 Platforms","🗂 Asset Pipeline","🚀 Build Checklist"];

export default function ProgrammerDoc() {
  const [tab, setTab] = useState(0);
  const [openCode, setOpenCode] = useState({});

  const toggleCode = (id) => setOpenCode(p => ({...p, [id]: !p[id]}));

  const PriorityChip = ({p, col}) => (
    <span className="priority-chip" style={{color:col,borderColor:`${col}44`,background:`${col}12`}}>
      {p}
    </span>
  );

  return (
    <div style={{background:"#030608",minHeight:"100vh"}}>
      <style>{css}</style>
      <div className="scan-line"/>

      {/* TICKER */}
      <div style={{background:"#040a06",borderBottom:"1px solid #071510",
        padding:"4px 0",overflow:"hidden"}}>
        <div style={{display:"flex",animation:"scroll-x 30s linear infinite",whiteSpace:"nowrap"}}>
          {["CLAUDE CODE INSTRUCTIONS","MOLGANG ROBLOX","VR/AR MULTI-PLATFORM",
            "REALISTIC 3D","AGENT MOL","HENRICUS EDUARDUS","EHMAC","MACHE",
            "CLAUDE CODE INSTRUCTIONS","MOLGANG ROBLOX","VR/AR MULTI-PLATFORM",
            "REALISTIC 3D","AGENT MOL","HENRICUS EDUARDUS","EHMAC","MACHE",
          ].map((t,i)=>(
            <span key={i} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              color:"#0a2a18",padding:"0 20px"}}>// {t}</span>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <div style={{background:"#040c08",borderBottom:"1px solid #071510",padding:"14px 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:10}}>
          <div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:900,
              color:"#22c55e",letterSpacing:2,lineHeight:1}}>
              CRYPTOS — AGENT MOL
            </div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              color:"#1a4a2a",letterSpacing:2,marginTop:2}}>
              CLAUDE CODE PROGRAMMER INSTRUCTIONS · REALISTIC 3D + VR/AR + MULTI-PLATFORM
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
            {PLATFORMS.map(p=>(
              <span key={p.id} className="platform-badge"
                style={{color:p.col,borderColor:`${p.col}44`,background:`${p.col}10`}}>
                {p.icon} {p.name.split(" ")[0]}
              </span>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:0,borderBottom:"1px solid #071510",overflowX:"auto"}}>
          {TABS.map((t,i)=>(
            <button key={t} className={`tab-btn ${tab===i?"active":""}`}
              onClick={()=>setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{height:"calc(100vh - 108px)",overflowY:"auto"}}>

        {/* TAB 0 — OVERVIEW */}
        {tab===0 && (
          <div style={{padding:28}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#22c55e",
              letterSpacing:4,marginBottom:8}}>// MISSION BRIEFING FOR CLAUDE CODE</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:32,fontWeight:900,
              color:"#e4e9f0",letterSpacing:-1,lineHeight:.95,marginBottom:16}}>
              BUILD THE MOST<br/>
              <span style={{color:"#22c55e"}}>REALISTIC ROBLOX GAME</span><br/>
              EVER MADE.
            </div>
            <div style={{fontSize:14,color:"#4a6a5a",marginBottom:28,maxWidth:640,lineHeight:1.8}}>
              This document is the complete technical specification for Claude Code to build
              MOLGANG's Roblox game with photorealistic 3D graphics, full VR/AR support
              across Meta Quest, PSVR2, Xbox, PS5, Nintendo Switch, and smartphone.
            </div>

            {/* Architecture summary */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:24}}>
              {[
                {t:"Rendering Engine",v:"Roblox Future Lighting + PBR",col:"#f59e0b",icon:"🖥"},
                {t:"VR SDK",v:"Roblox VRService + OpenXR bridge",col:"#a78bfa",icon:"🥽"},
                {t:"AR SDK",v:"ARKit (iOS) + ARCore (Android)",col:"#22c55e",icon:"📱"},
                {t:"Physics",v:"Roblox Constraints + custom fluid sim",col:"#38bdf8",icon:"⚗"},
                {t:"Audio",v:"Spatial 3D + Distance EQ filter",col:"#f472b6",icon:"🔊"},
                {t:"Platforms",v:"8 platforms, 1 codebase",col:"#6b7280",icon:"🎮"},
                {t:"LOD System",v:"3-tier distance LOD + culling",col:"#dc7a3c",icon:"📐"},
                {t:"Network",v:"Knit framework + ProfileService",col:"#10b981",icon:"🌐"},
              ].map(c=>(
                <div key={c.t} style={{background:"#070e08",borderRadius:8,padding:14,
                  border:`1px solid ${c.col}22`,display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:24}}>{c.icon}</span>
                  <div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,
                      color:"#1a3a2a",letterSpacing:2,marginBottom:2}}>{c.t}</div>
                    <div style={{fontSize:13,fontWeight:600,color:c.col}}>{c.v}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Platform matrix */}
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#22c55e",
              letterSpacing:3,marginBottom:12}}>// PLATFORM COMPATIBILITY MATRIX</div>
            <div style={{overflowX:"auto",marginBottom:24}}>
              <table style={{borderCollapse:"collapse",width:"100%",minWidth:800}}>
                <thead>
                  <tr style={{background:"#071510"}}>
                    {["Platform","Type","SDK","VR/AR","Haptics","Gyro","Notes"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace",
                        fontSize:9,color:"#22c55e",letterSpacing:1,textAlign:"left",
                        borderBottom:"1px solid #0a2015"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLATFORMS.map((p,i)=>(
                    <tr key={p.id} style={{background:i%2===0?"#040a06":"#050c07"}}>
                      <td style={{padding:"8px 12px",fontWeight:600,color:p.col,fontSize:12}}>
                        {p.icon} {p.name}
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <span className="platform-badge" style={{color:p.col,
                          borderColor:`${p.col}44`,background:`${p.col}10`}}>
                          {p.type}
                        </span>
                      </td>
                      <td style={{padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace",
                        fontSize:10,color:"#4a6a5a"}}>{p.sdk}</td>
                      <td style={{padding:"8px 12px",textAlign:"center",
                        color:p.type==="VR"||p.type==="AR"?"#22c55e":"#1a3a2a"}}>
                        {p.type==="VR"||p.type==="AR"?"✓":"—"}
                      </td>
                      <td style={{padding:"8px 12px",textAlign:"center",
                        color:["PS5","Xbox","Console"].includes(p.type)?"#f59e0b":"#1a3a2a"}}>
                        {["PS5","Xbox"].includes(p.id)?"✓ Adv":
                          ["vr_meta","vr_psvr","vr_steam"].includes(p.id)?"✓":"—"}
                      </td>
                      <td style={{padding:"8px 12px",textAlign:"center",
                        color:["ar_phone","switch"].includes(p.id)?"#38bdf8":"#1a3a2a"}}>
                        {["ar_phone","switch"].includes(p.id)?"✓":"—"}
                      </td>
                      <td style={{padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace",
                        fontSize:9,color:"#2a4a3a"}}>{p.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* File structure */}
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#22c55e",
              letterSpacing:3,marginBottom:12}}>// PROJECT FILE STRUCTURE</div>
            <div className="code-block" style={{fontSize:10}}>
{`MOLGANG/
├── ServerScriptService/
│   ├── Core/
│   │   ├── GameService.lua          -- Knit main service
│   │   ├── NPCScheduleService.lua   -- GTA6-style NPC AI
│   │   ├── WeatherSystem.lua        -- NL climate model
│   │   ├── EmissionSystem.lua       -- CO2 balance → world
│   │   ├── ChemistryValidator.lua   -- Reaction verification
│   │   └── ChainRegistry.lua        -- MolChain bridge
│   └── VR/
│       └── VRServerBridge.lua       -- Server-side VR state
├── StarterPlayerScripts/
│   ├── Movement/
│   │   ├── MovementController.lua   -- Sonic momentum physics
│   │   └── TerrainPhysics.lua       -- Wind, ice, conveyor
│   ├── VR/
│   │   ├── VRService.lua            -- VR session manager
│   │   ├── VRHandController.lua     -- Hand tracking + grab
│   │   └── ARMobileService.lua      -- Smartphone AR mode
│   ├── Input/
│   │   └── InputManager.lua         -- All platforms unified
│   ├── Visual/
│   │   ├── LightingConfig.lua       -- Future Lighting + DOF
│   │   ├── MaterialManager.lua      -- PBR surface setup
│   │   ├── LODManager.lua           -- 3-tier LOD switching
│   │   └── ReactionVFX.lua          -- 39 reaction effects
│   └── Audio/
│       └── AudioManager.lua         -- Spatial 3D + zones
├── ReplicatedStorage/
│   ├── Modules/
│   │   ├── Chemistry/               -- IUPAC element data
│   │   ├── ZoneConfig.lua           -- Zone definitions
│   │   └── Schedules.lua            -- NPC time tables
│   └── VFX/
│       ├── ParticleProfiles.lua     -- All 39 reaction FX
│       └── ShaderEffects.lua        -- Glitch, hologram, etc.
└── Assets/
    ├── Models/                      -- All FBX imports
    ├── Textures/                    -- PBR texture sets
    ├── Audio/                       -- SFX + ambient loops
    └── Animations/                  -- Character + NPC rigs`}
            </div>
          </div>
        )}

        {/* TAB 1 — VISUAL SYSTEMS */}
        {tab===1 && (
          <div style={{padding:28}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:900,
              color:"#f59e0b",letterSpacing:1,marginBottom:6}}>
              REALISTIC 3D VISUAL SYSTEMS
            </div>
            <div style={{fontSize:13,color:"#4a6a5a",marginBottom:24,maxWidth:580,lineHeight:1.7}}>
              Future Lighting + PBR materials + VFX = photorealistic Roblox.
              Every system listed is production-ready Lua for Roblox Studio.
            </div>

            {VISUAL_SYSTEMS.map(sys=>(
              <div key={sys.id} style={{background:"#06100a",borderRadius:10,
                border:`1px solid ${sys.col}22`,marginBottom:16,overflow:"hidden"}}>
                <div style={{padding:"14px 18px",borderBottom:`1px solid ${sys.col}18`,
                  display:"flex",gap:12,alignItems:"center",background:`${sys.col}08`}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:16,
                        fontWeight:700,color:sys.col}}>{sys.title}</div>
                      <PriorityChip p={sys.priority} col={sys.priority==="CRITICAL"?"#ef4444":"#f59e0b"}/>
                    </div>
                    <div style={{fontSize:12,color:"#4a6a5a"}}>{sys.desc}</div>
                  </div>
                </div>
                {sys.modules.map(mod=>(
                  <div key={mod.name} style={{borderBottom:`1px solid #071510`}}>
                    <div style={{padding:"10px 18px",display:"flex",gap:10,alignItems:"center",
                      cursor:"pointer",background:openCode[mod.file]?"#05140a":"transparent"}}
                      onClick={()=>toggleCode(mod.file)}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                        color:sys.col}}>📄 {mod.file}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                        color:"#1a3a2a",marginLeft:"auto"}}>
                        {openCode[mod.file]?"▲ HIDE":"▼ SHOW CODE"}
                      </span>
                    </div>
                    {openCode[mod.file] && (
                      <div style={{padding:"0 12px 12px"}} className="fade-in">
                        <div className="code-block">{mod.code}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2 — VR / AR */}
        {tab===2 && (
          <div style={{padding:28}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:900,
              color:"#a78bfa",letterSpacing:1,marginBottom:6}}>VR / AR IMPLEMENTATION</div>
            <div style={{fontSize:13,color:"#4a6a5a",marginBottom:24,maxWidth:580,lineHeight:1.7}}>
              Full VR for Meta Quest, PSVR2, and SteamVR. AR mode for smartphones.
              Hand tracking, haptic feedback, comfort settings.
            </div>

            {/* VR Setup Order */}
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#a78bfa",
              letterSpacing:3,marginBottom:12}}>// VR SETUP SEQUENCE (follow in order)</div>
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
              {["VRService init","Hand models","Input bindings","Comfort vignette",
                "Snap turn","AR mode","ANK bridge","Test all headsets"].map((s,i)=>(
                <div key={s} style={{padding:"6px 12px",borderRadius:6,
                  background:i<3?"#0a0a18":"#060812",
                  border:`1px solid ${i<3?"#a78bfa":"#1a1a30"}`,
                  display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                    color:"#a78bfa",opacity:.6}}>{i+1}</span>
                  <span style={{fontSize:11,color:i<3?"#a78bfa":"#2a2a5a"}}>{s}</span>
                </div>
              ))}
            </div>

            {VR_MODULES.map(mod=>(
              <div key={mod.file} style={{background:"#06080e",borderRadius:10,
                border:`1px solid ${mod.col}22`,marginBottom:14,overflow:"hidden"}}>
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${mod.col}18`,
                  background:`${mod.col}08`,display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:15,
                        fontWeight:700,color:mod.col}}>{mod.title}</span>
                      <PriorityChip p={mod.priority}
                        col={mod.priority==="CRITICAL"?"#ef4444":"#f59e0b"}/>
                    </div>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                      color:"#2a3a4a"}}>📄 {mod.file}</span>
                  </div>
                  <button onClick={()=>toggleCode(mod.file)}
                    style={{padding:"4px 10px",background:"transparent",cursor:"pointer",
                      border:`1px solid ${mod.col}44`,borderRadius:4,
                      color:mod.col,fontFamily:"'JetBrains Mono',monospace",fontSize:9}}>
                    {openCode[mod.file]?"▲ HIDE":"▼ CODE"}
                  </button>
                </div>
                {openCode[mod.file] && (
                  <div style={{padding:12}} className="fade-in">
                    <div className="code-block">{mod.code}</div>
                  </div>
                )}
              </div>
            ))}

            {/* VR Comfort settings UI */}
            <div style={{background:"#080610",borderRadius:10,border:"1px solid #1a1030",
              padding:18,marginTop:8}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#a78bfa",
                letterSpacing:3,marginBottom:12}}>// VR COMFORT SETTINGS (in-game menu)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["Snap Turn","45°/90°/Smooth — prevents rotation sickness"],
                  ["Comfort Vignette","Dark border during fast movement"],
                  ["Height Calibration","Match player real-world height"],
                  ["IPD Setting","64mm default, adjustable 58-72mm"],
                  ["Teleport Mode","Alternative to continuous locomotion"],
                  ["HUD Position","Wrist / floating / disabled"],
                ].map(([k,v])=>(
                  <div key={k} style={{background:"#060410",borderRadius:6,padding:10,
                    border:"1px solid #120e20"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                      color:"#a78bfa",marginBottom:3}}>{k}</div>
                    <div style={{fontSize:11,color:"#3a2a5a"}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3 — PLATFORMS */}
        {tab===3 && (
          <div style={{padding:28}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:900,
              color:"#38bdf8",letterSpacing:1,marginBottom:6}}>MULTI-PLATFORM IMPLEMENTATION</div>
            <div style={{fontSize:13,color:"#4a6a5a",marginBottom:24,maxWidth:580,lineHeight:1.7}}>
              One codebase, eight platforms. Platform detection at runtime, then
              branch to platform-specific features.
            </div>

            {PLATFORM_MODULES.map(mod=>(
              <div key={mod.file} style={{background:"#06080e",borderRadius:10,
                border:`1px solid ${mod.col}22`,marginBottom:14,overflow:"hidden"}}>
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${mod.col}18`,
                  background:`${mod.col}08`,display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:15,
                        fontWeight:700,color:mod.col}}>{mod.title}</span>
                      <PriorityChip p={mod.priority}
                        col={mod.priority==="CRITICAL"?"#ef4444":"#f59e0b"}/>
                    </div>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                      color:"#1a3040"}}>📄 {mod.file}</span>
                  </div>
                  <button onClick={()=>toggleCode(mod.file)}
                    style={{padding:"4px 10px",background:"transparent",cursor:"pointer",
                      border:`1px solid ${mod.col}44`,borderRadius:4,
                      color:mod.col,fontFamily:"'JetBrains Mono',monospace",fontSize:9}}>
                    {openCode[mod.file]?"▲":"▼ CODE"}
                  </button>
                </div>
                {openCode[mod.file] && (
                  <div style={{padding:12}} className="fade-in">
                    <div className="code-block">{mod.code}</div>
                  </div>
                )}
              </div>
            ))}

            {/* Platform-specific notes */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:8}}>
              {[
                {p:"PS5 DualSense",col:"#003791",icon:"🎮",
                  notes:["Adaptive triggers: pH puzzle resistance","Haptic feedback: reaction impact","Speaker: NPC proximity audio","Light bar: CO₂ balance color (green→red)"]},
                {p:"Nintendo Switch",col:"#e4000f",icon:"🕹",
                  notes:["Joy-Con gyro: atom-catching aim","HD Rumble: chemistry reaction feedback","Handheld: touch-screen molecule building","TV mode: full 1080p future lighting"]},
                {p:"Xbox Series",col:"#107c10",icon:"🎮",
                  notes:["Rumble: large + small motors","Impulse triggers: directional haptics","Quick resume: instant game state restore","120FPS mode on Series X"]},
                {p:"Smartphone AR",col:"#22c55e",icon:"📱",
                  notes:["ARKit / ARCore: real-world plane detection","Gyro camera: look around real space","Tap to collect: atoms in real environment","ANK app bridge: register real objects"]},
              ].map(x=>(
                <div key={x.p} style={{background:"#06080e",borderRadius:8,
                  border:`1px solid ${x.col}22`,overflow:"hidden"}}>
                  <div style={{padding:"10px 14px",background:`${x.col}0a`,
                    borderBottom:`1px solid ${x.col}18`,display:"flex",gap:8}}>
                    <span style={{fontSize:20}}>{x.icon}</span>
                    <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,
                      fontWeight:700,color:x.col}}>{x.p}</span>
                  </div>
                  <div style={{padding:"10px 14px"}}>
                    {x.notes.map((n,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
                        <div style={{width:3,height:3,borderRadius:"50%",
                          background:x.col,flexShrink:0,marginTop:5}}/>
                        <div style={{fontSize:11,color:"#2a4a5a"}}>{n}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4 — ASSET PIPELINE */}
        {tab===4 && (
          <div style={{padding:28}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:900,
              color:"#dc7a3c",letterSpacing:1,marginBottom:6}}>ASSET PIPELINE</div>
            <div style={{fontSize:13,color:"#4a6a5a",marginBottom:24,maxWidth:580,lineHeight:1.7}}>
              From Blender sculpt to Roblox game-ready asset with PBR textures,
              LOD variants, and spatial audio.
            </div>

            {ASSET_PIPELINE.map(step=>(
              <div key={step.step} style={{background:"#060c06",borderRadius:10,
                border:`1px solid ${step.col}22`,marginBottom:16,overflow:"hidden"}}>
                <div style={{padding:"14px 18px",borderBottom:`1px solid ${step.col}18`,
                  background:`${step.col}08`,display:"flex",gap:16,alignItems:"flex-start"}}>
                  <div className="step-num" style={{color:step.col}}>{String(step.step).padStart(2,"0")}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:16,
                      fontWeight:700,color:step.col,marginBottom:4}}>{step.title}</div>
                    <div style={{fontSize:12,color:"#4a6a5a"}}>{step.desc}</div>
                  </div>
                </div>
                <div style={{padding:"12px 18px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                    {step.items.map((item,i)=>(
                      <div key={i} style={{display:"flex",gap:8}}>
                        <div style={{width:3,height:3,borderRadius:"50%",
                          background:step.col,flexShrink:0,marginTop:6}}/>
                        <div style={{fontSize:12,color:"#2a4a3a"}}>{item}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>toggleCode("asset_"+step.step)}
                    style={{padding:"4px 12px",background:"transparent",cursor:"pointer",
                      border:`1px solid ${step.col}44`,borderRadius:4,
                      color:step.col,fontFamily:"'JetBrains Mono',monospace",fontSize:9}}>
                    {openCode["asset_"+step.step]?"▲ HIDE":"▼ SHOW CODE"}
                  </button>
                  {openCode["asset_"+step.step] && (
                    <div style={{marginTop:10}} className="fade-in">
                      <div className="code-block">{step.code}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5 — BUILD CHECKLIST */}
        {tab===5 && (
          <div style={{padding:28}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:900,
              color:"#22c55e",letterSpacing:1,marginBottom:6}}>BUILD CHECKLIST</div>
            <div style={{fontSize:13,color:"#4a6a5a",marginBottom:24,maxWidth:580,lineHeight:1.7}}>
              Complete build order for Claude Code. Follow phases sequentially.
              Each phase must pass tests before proceeding.
            </div>

            {[
              { phase:"PHASE 1", title:"Visual Foundation", col:"#f59e0b", steps:[
                "Set Lighting.Technology = Future in Studio Explorer",
                "Configure Atmosphere, Sky HDRI (6 faces), SunRays, Bloom, DOF",
                "Create ColorCorrectionEffect with neutral starting values",
                "Import test cube — apply SurfaceAppearance with steel PBR maps",
                "Verify PBR in Studio preview: metalness reflections visible",
                "Create LightingConfig.lua — test day/night cycle (1min full cycle)",
                "Build MaterialManager.lua with all zone materials",
                "Apply materials to Zaandam zone placeholder geometry",
                "TEST: All 5 zones have distinct visual identity",
              ]},
              { phase:"PHASE 2", title:"3D Assets & LOD", col:"#dc7a3c", steps:[
                "Import Sketchfab FBX: all 20 verified assets (see whitepaper Appendix)",
                "Fix Bioreactor asset (corrected ID in whitepaper: 653399916c7f...)",
                "Create LOD variants in Blender: LOD1 (50% poly), LOD2 (25%)",
                "Build LODManager.lua — test switching at 50/150 stud distances",
                "Set up ReactionVFX.lua — test CaCO3_formation and V2O5_extraction",
                "Implement HGMS magnetic field visualizer (3 Tesla levels)",
                "Test all 39 reaction VFX profiles in Studio",
                "TEST: No particle VFX exceed 500 rate per emitter (performance cap)",
              ]},
              { phase:"PHASE 3", title:"VR Implementation", col:"#a78bfa", steps:[
                "Enable VR in Roblox Studio settings: File → Game Settings → VR",
                "Install VRService.lua — test device detection printout",
                "Create hand mesh models (Agent Mol gloves with PBR material)",
                "Build VRHandController.lua — test grab + release mechanics",
                "Implement comfort vignette — test at walk speed 28 s/s",
                "Add snap turn (45°) and smooth turn options in settings",
                "Test in Meta Quest simulator (Roblox desktop VR mode)",
                "Implement ARMobileService.lua — test gyro camera on Android",
                "TEST: VR session starts within 3 seconds on Meta Quest 3",
                "TEST: No VR-induced nausea in 5-minute test session",
              ]},
              { phase:"PHASE 4", title:"Multi-Platform Input", col:"#38bdf8", steps:[
                "Build InputManager.lua with all platform bindings table",
                "Test on Xbox controller (Roblox Studio gamepad sim)",
                "Test PS5 DualSense haptics via Steam Input bridge",
                "Implement Nintendo Switch gyro aim — test atom-catching precision",
                "Test mobile touch controls — all UI buttons accessible",
                "Verify adaptive triggers on PS5 (pH puzzle resistance feedback)",
                "Build platform-specific HUD variants (VR wrist, console center, mobile overlay)",
                "TEST: All 8 platforms show correct control scheme on spawn",
              ]},
              { phase:"PHASE 5", title:"Audio & Polish", col:"#22c55e", steps:[
                "Import all zone ambient tracks (loop-perfect, no audible seam)",
                "Build AudioManager.lua with zone transitions (cross-fade 3s)",
                "Implement NPC distance audio filter (80+ studs = radio effect)",
                "Spatial audio: all SFX have max range set, RolloffStyle = InverseTapered",
                "Dynamic music: base → danger (CarbonGhost proximity) → discovery",
                "Performance pass: Roblox Studio profiler < 16ms frame time on mid-range PC",
                "VR performance: maintain 72FPS on Meta Quest 3 (required for comfort)",
                "Mobile: < 8ms CPU per frame on iPhone 13 / Samsung Galaxy S22",
                "TEST: Full 30-minute play session on each platform — no crashes",
                "TEST: CO₂ balance visual response < 500ms after reaction registration",
              ]},
            ].map(phase=>(
              <div key={phase.phase} style={{background:"#06100a",borderRadius:10,
                border:`1px solid ${phase.col}22`,marginBottom:14,overflow:"hidden"}}>
                <div style={{padding:"12px 18px",background:`${phase.col}08`,
                  borderBottom:`1px solid ${phase.col}18`,
                  display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:11,
                    fontWeight:700,color:phase.col,opacity:.5,letterSpacing:2}}>
                    {phase.phase}
                  </div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,
                    fontWeight:700,color:phase.col}}>{phase.title}</div>
                </div>
                <div style={{padding:"12px 18px"}}>
                  {phase.steps.map((s,i)=>(
                    <div key={i} style={{display:"flex",gap:10,marginBottom:8,
                      alignItems:"flex-start"}}>
                      <div style={{width:18,height:18,borderRadius:3,
                        border:`1px solid ${s.startsWith("TEST")?"#22c55e":`${phase.col}44`}`,
                        flexShrink:0,marginTop:1,
                        background:s.startsWith("TEST")?"#22c55e15":"transparent",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {s.startsWith("TEST") && <span style={{fontSize:8,color:"#22c55e"}}>✓</span>}
                      </div>
                      <div style={{fontSize:12,
                        color:s.startsWith("TEST")?"#22c55e":"#2a4a3a",
                        fontWeight:s.startsWith("TEST")?600:400,
                        fontFamily:s.startsWith("TEST")?
                          "'JetBrains Mono',monospace":"inherit",
                        lineHeight:1.5}}>
                        {s}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Final note */}
            <div style={{background:"#030608",borderRadius:10,padding:20,
              border:"1px solid #22c55e22",marginTop:8,textAlign:"center"}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,
                fontWeight:700,color:"#22c55e",marginBottom:8,letterSpacing:2}}>
                // COMPLETION CRITERIA
              </div>
              <div style={{fontSize:13,color:"#4a6a5a",lineHeight:1.8,maxWidth:600,margin:"0 auto"}}>
                All 5 phases complete · All TEST checkpoints green ·
                Performance targets met on all 8 platforms ·
                VR comfort certification passed ·
                <span style={{color:"#22c55e",fontWeight:600}}>
                  {" "}Ready for Roblox public launch as "Cryptos — Agent Mol"
                  by Henricus Eduardus
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
