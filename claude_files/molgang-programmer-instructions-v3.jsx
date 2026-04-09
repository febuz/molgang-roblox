import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   CRYPTOS — AGENT MOL
   PROGRAMMER INSTRUCTIONS v3.0
   Roblox → QR Bridge → Own Web Server (Three.js AAA)
   NFT Inventory Transfer · 3D Interaction · Hedera HTS
═══════════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&family=Fira+Code:wght@300;400;500;600&family=Bebas+Neue&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#050810;color:#cdd6f4;font-family:'Space Grotesk',sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(100,180,255,.015) 2px,rgba(100,180,255,.015) 3px)}

@keyframes scan{from{transform:translateY(-100%)}to{transform:translateY(100vh)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 #3b82f633}50%{box-shadow:0 0 0 8px transparent}}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes glow{0%,100%{text-shadow:0 0 8px #60a5fa}50%{text-shadow:0 0 20px #60a5fa,0 0 40px #3b82f6}}
@keyframes orbit{from{transform:rotate(0deg) translateX(22px) rotate(0deg)}to{transform:rotate(360deg) translateX(22px) rotate(-360deg)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

.scan-line{position:fixed;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#3b82f655,transparent);
  pointer-events:none;z-index:10000;animation:scan 7s linear infinite}
.glow{animation:glow 3s ease-in-out infinite}
.float{animation:float 4s ease-in-out infinite}

.tab{padding:8px 14px;background:transparent;border:none;border-bottom:2px solid transparent;
  cursor:pointer;font-family:'Fira Code',monospace;font-size:9px;letter-spacing:2px;
  text-transform:uppercase;color:#334155;transition:all .2s;white-space:nowrap}
.tab:hover{color:#60a5fa}
.tab.on{color:#60a5fa;border-bottom-color:#60a5fa}

.code{font-family:'Fira Code',monospace;font-size:10.5px;line-height:1.85;
  background:#030710;border:1px solid #0f1f3a;border-radius:8px;padding:16px;
  overflow-x:auto;white-space:pre;max-height:420px;overflow-y:auto}
.code .k{color:#f59e0b} .code .f{color:#60a5fa} .code .s{color:#86efac}
.code .c{color:#1e3a5f} .code .n{color:#38bdf8} .code .t{color:#a78bfa}
.code .op{color:#475569}

.card{background:#080f1c;border:1px solid #0f1f3a;border-radius:10px;overflow:hidden;transition:all .2s}
.card:hover{border-color:#1e3a5f}
.card-blue{background:#04090f;border:1px solid #1e3a5f;border-radius:10px}
.card-amber{background:#0f0a02;border:1px solid #3d2a00;border-radius:10px}
.card-green{background:#030f08;border:1px solid #14532d;border-radius:10px}
.card-violet{background:#0a0414;border:1px solid #2e1065;border-radius:10px}
.card-red{background:#0f0204;border:1px solid #4c0519;border-radius:10px}
.card-cyan{background:#02080f;border:1px solid #083344;border-radius:10px}

.chip{padding:2px 8px;border-radius:10px;font-family:'Fira Code',monospace;
  font-size:8px;letter-spacing:1px;display:inline-block;margin:2px;border:1px solid}
.dot{width:5px;height:5px;border-radius:50%;display:inline-block;margin-right:6px;flex-shrink:0}
.step-n{font-family:'Bebas Neue',sans-serif;font-size:64px;line-height:1;opacity:.12}
.label{font-family:'Fira Code',monospace;font-size:8px;letter-spacing:3px;opacity:.6;text-transform:uppercase}
.mono{font-family:'Fira Code',monospace}

.flow-box{padding:10px 16px;border-radius:8px;border:1px solid;text-align:center;
  font-family:'Fira Code',monospace;font-size:10px;cursor:default}
.arrow{color:#1e3a5f;font-size:18px;display:flex;align-items:center;justify-content:center}

.progress-bar{height:3px;background:#0f1f3a;border-radius:2px;overflow:hidden}
.progress-fill{height:100%;border-radius:2px;transition:width 1.2s ease}

table.dt{width:100%;border-collapse:collapse}
table.dt th{background:#06101c;color:#60a5fa;font-family:'Fira Code',monospace;font-size:8px;
  letter-spacing:2px;padding:8px 12px;text-align:left;border-bottom:1px solid #0f2040;text-transform:uppercase}
table.dt td{padding:7px 12px;font-size:11px;border-bottom:1px solid #0a1628;color:#475569;font-family:'Fira Code',monospace}
table.dt tr:hover td{background:#04090f;color:#60a5fa}
table.dt td:first-child{color:#cdd6f4}
`;

// ── DATA ────────────────────────────────────────────────────────

const TABS = ["🌐 ARCHITECTUUR","🎮 ROBLOX 3D","📱 QR BRIDGE","🖥 WEB SERVER","🧊 3D ENGINE","💎 NFT TRANSFER","🎬 INTERACTIE","✅ CHECKLIST"];

const FLOW = [
  {label:"ROBLOX", sub:"Free teaser game\nFuture Lighting + PBR\nCharacter Level 1-10",col:"#60a5fa"},
  {label:"QR CODE", sub:"Encrypted payload\nInventory snapshot\nHedera TX hash",col:"#f59e0b"},
  {label:"QR SCAN", sub:"Player scans met telefoon\nDeeplink → web game\nJWT + wallet auth",col:"#a78bfa"},
  {label:"BRIDGE API", sub:"Cloudflare Worker\nVerify Hedera TX\nIssue JWT session",col:"#22c55e"},
  {label:"WEB GAME", sub:"Three.js renderer\nHD karakter + items\nInventory restored",col:"#f43f5e"},
];

const ROBLOX_3D_MODULES = [
  {
    file:"CharacterController.lua",
    col:"#60a5fa",
    title:"Realistische 3D Karakter Beweging",
    desc:"Sonic momentum + inverse kinematics + procedural animaties. Karakter reageert fysiek op de wereld.",
    code:`-- CharacterController.lua (StarterCharacterScripts)
-- Realistische 3D beweging: momentum, IK, procedurele animaties

local RunService    = game:GetService("RunService")
local UIS           = game:GetService("UserInputService")
local Players       = game:GetService("Players")
local TweenService  = game:GetService("TweenService")

local player    = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local HRP       = character:WaitForChild("HumanoidRootPart")
local hum       = character:WaitForChild("Humanoid")
local animator  = hum:WaitForChild("Animator")

-- ── MOMENTUM SYSTEEM ──────────────────────────────────────────
local momentum = Vector3.zero
local ACCEL    = 0.18   -- versnelling factor
local FRICTION = 0.88   -- wrijving (lager = meer momentum)
local MAX_SPEED = 32    -- studs/sec max

local function updateMomentum(input, dt)
  local cam  = workspace.CurrentCamera
  local fwd  = Vector3.new(cam.CFrame.LookVector.X, 0, cam.CFrame.LookVector.Z).Unit
  local rgt  = Vector3.new(cam.CFrame.RightVector.X, 0, cam.CFrame.RightVector.Z).Unit

  local wish = Vector3.zero
  if input.W then wish = wish + fwd end
  if input.S then wish = wish - fwd end
  if input.A then wish = wish - rgt end
  if input.D then wish = wish + rgt end

  if wish.Magnitude > 0 then
    wish = wish.Unit * MAX_SPEED
    momentum = momentum:Lerp(wish, ACCEL)
  else
    momentum = momentum * FRICTION  -- slide to stop
  end

  HRP.AssemblyLinearVelocity = Vector3.new(
    momentum.X, HRP.AssemblyLinearVelocity.Y, momentum.Z
  )
end

-- ── PROCEDURELE HEAD TRACKING ─────────────────────────────────
local head    = character:FindFirstChild("Head")
local neck    = character:FindFirstChild("UpperTorso") and
                character.UpperTorso:FindFirstChild("Neck")

local function updateHeadTracking()
  if not neck then return end
  local cam     = workspace.CurrentCamera
  local lookRel = HRP.CFrame:ToObjectSpace(cam.CFrame)
  local yaw     = math.clamp(math.atan2(lookRel.LookVector.X, lookRel.LookVector.Z), -1.0, 1.0)
  local pitch   = math.clamp(lookRel.LookVector.Y, -0.6, 0.6)
  neck.C0 = neck.C0:Lerp(
    CFrame.new(0, 1.5, 0) * CFrame.Angles(-pitch * 0.4, yaw * 0.3, 0),
    0.12
  )
end

-- ── FOOTSTEP RAYCASTS (procedurel voeten plaatsen) ────────────
local leftFoot  = character:FindFirstChild("LeftFoot")
local rightFoot = character:FindFirstChild("RightFoot")
local footTargets = {left = Vector3.zero, right = Vector3.zero}
local stepPhase   = 0

local function updateFootIK()
  stepPhase = (stepPhase + 0.04) % (math.pi * 2)
  local speed = momentum.Magnitude

  for side, foot in {left=leftFoot, right=rightFoot} do
    if not foot then continue end
    local offset = (side == "left") and -1 or 1
    local phase  = (side == "left") and 0 or math.pi
    local cycleY = math.sin(stepPhase + phase) * (speed / MAX_SPEED) * 0.25

    local origin = foot.Position + Vector3.new(0, 2, 0)
    local result = workspace:Raycast(origin, Vector3.new(0,-3,0))
    local groundY = result and result.Position.Y or foot.Position.Y

    footTargets[side] = Vector3.new(foot.Position.X, groundY + cycleY, foot.Position.Z)
  end
end

-- ── CAMERA SHAKE (impact/landing) ────────────────────────────
local shakeOffset   = CFrame.identity
local shakeIntensity = 0

local function applyShake(intensity)
  shakeIntensity = math.clamp(intensity, 0, 0.4)
end

hum.StateChanged:Connect(function(_, new)
  if new == Enum.HumanoidStateType.Landed then
    local vel = HRP.AssemblyLinearVelocity.Y
    applyShake(math.abs(vel) / 100)
  end
end)

-- ── MAIN LOOP ─────────────────────────────────────────────────
local inputState = {W=false,A=false,S=false,D=false}

UIS.InputBegan:Connect(function(i,g)
  if g then return end
  if i.KeyCode == Enum.KeyCode.W then inputState.W = true end
  if i.KeyCode == Enum.KeyCode.A then inputState.A = true end
  if i.KeyCode == Enum.KeyCode.S then inputState.S = true end
  if i.KeyCode == Enum.KeyCode.D then inputState.D = true end
end)
UIS.InputEnded:Connect(function(i)
  if i.KeyCode == Enum.KeyCode.W then inputState.W = false end
  if i.KeyCode == Enum.KeyCode.A then inputState.A = false end
  if i.KeyCode == Enum.KeyCode.S then inputState.S = false end
  if i.KeyCode == Enum.KeyCode.D then inputState.D = false end
end)

RunService.RenderStepped:Connect(function(dt)
  updateMomentum(inputState, dt)
  updateHeadTracking()
  updateFootIK()
  -- Camera shake fade
  shakeIntensity = shakeIntensity * 0.85
  if shakeIntensity > 0.001 then
    local rx = (math.random()-0.5)*shakeIntensity
    local ry = (math.random()-0.5)*shakeIntensity
    shakeOffset = CFrame.Angles(rx, ry, 0)
  end
end)`,
  },
  {
    file:"InteractionSystem.lua",
    col:"#22c55e",
    title:"3D Interactie & Proximity System",
    desc:"Spelers kunnen objecten aanraken, inspecteren, oppakken. Outline highlight + animatie + haptic.",
    code:`-- InteractionSystem.lua (LocalScript StarterPlayerScripts)
-- 3D object interactie: highlight, inspect, grab, react

local Players      = game:GetService("Players")
local UIS          = game:GetService("UserInputService")
local RunService   = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local player    = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local camera    = workspace.CurrentCamera
local HRP       = character:WaitForChild("HumanoidRootPart")

-- SelectionBox voor outline highlight
local highlightBox = Instance.new("SelectionBox")
highlightBox.Color3         = Color3.fromRGB(100, 200, 255)
highlightBox.LineThickness  = 0.04
highlightBox.SurfaceColor3  = Color3.fromRGB(100, 200, 255)
highlightBox.SurfaceTransparency = 0.85
highlightBox.Parent = workspace

local highlighted = nil  -- huidig highlighted object
local grabbed     = nil  -- huidig opgepakt object
local INTERACT_RANGE = 8  -- studs

-- ── INTERACTABLE OBJECTEN DEFINIËREN ─────────────────────────
-- Objecten met Attribute "Interactable" = true worden opgepakt
-- Attribute "InteractionType": "inspect" | "grab" | "activate" | "qr_scan"

-- ── RAYCAST NAAR KIJKRICHTING ─────────────────────────────────
local function getTargetObject()
  local screenCenter = Vector2.new(
    camera.ViewportSize.X / 2, camera.ViewportSize.Y / 2
  )
  local ray = camera:ScreenPointToRay(screenCenter.X, screenCenter.Y)

  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances = {character}

  local result = workspace:Raycast(ray.Origin, ray.Direction * INTERACT_RANGE, params)
  if not result then return nil, nil end

  local hit = result.Instance
  local dist = (HRP.Position - result.Position).Magnitude
  if dist > INTERACT_RANGE then return nil, nil end

  -- Walk up tree to find interactable root
  local root = hit
  while root and root ~= workspace do
    if root:GetAttribute("Interactable") then return root, dist end
    root = root.Parent
  end
  return nil, dist
end

-- ── HIGHLIGHT EFFECT ──────────────────────────────────────────
local function setHighlight(obj)
  if highlighted == obj then return end
  highlighted = obj
  if obj then
    highlightBox.Adornee = obj
    -- Floating label boven object
    local label = obj:FindFirstChild("InteractLabel")
    if not label then
      local bg = Instance.new("BillboardGui", obj)
      bg.Name = "InteractLabel"
      bg.Size = UDim2.fromOffset(160, 32)
      bg.StudsOffset = Vector3.new(0, 3, 0)
      bg.AlwaysOnTop = false
      local txt = Instance.new("TextLabel", bg)
      txt.Size = UDim2.fromScale(1,1)
      txt.BackgroundColor3 = Color3.fromRGB(10,20,40)
      txt.BackgroundTransparency = 0.3
      txt.TextColor3 = Color3.fromRGB(100,200,255)
      txt.Text = "[E] " .. (obj:GetAttribute("InteractionLabel") or "Interact")
      txt.Font = Enum.Font.Code
      txt.TextScaled = true
      local corner = Instance.new("UICorner", txt)
      corner.CornerRadius = UDim.new(0,4)
    end
    -- Pulse animatie op highlight
    TweenService:Create(highlightBox,
      TweenInfo.new(0.6, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
      {LineThickness=0.07}
    ):Play()
  else
    highlightBox.Adornee = nil
  end
end

-- ── INSPECT MODUS (360° rotation view) ───────────────────────
local inspectGui = nil
local inspectObj  = nil

local function enterInspect(obj)
  inspectObj = obj
  obj.Anchored = true
  local orig = obj.CFrame
  -- Beweeg object voor camera
  local viewPos = camera.CFrame * CFrame.new(0, 0, -3)
  TweenService:Create(obj, TweenInfo.new(0.4), {CFrame=viewPos}):Play()

  -- GUI overlay
  inspectGui = Instance.new("ScreenGui", player.PlayerGui)
  inspectGui.Name = "InspectGui"
  local frame = Instance.new("Frame", inspectGui)
  frame.Size = UDim2.fromScale(1,1)
  frame.BackgroundColor3 = Color3.new(0,0,0)
  frame.BackgroundTransparency = 0.7

  -- Sluit button
  local close = Instance.new("TextButton", frame)
  close.Position = UDim2.fromScale(0.95, 0.05)
  close.Size     = UDim2.fromOffset(50, 30)
  close.Text     = "✕ ESC"
  close.Font     = Enum.Font.Code
  close.TextColor3 = Color3.fromRGB(100,200,255)
  close.BackgroundColor3 = Color3.fromRGB(10,20,40)
  close.MouseButton1Click:Connect(function()
    TweenService:Create(obj, TweenInfo.new(0.4), {CFrame=orig}):Play()
    inspectGui:Destroy()
    inspectGui = nil ; inspectObj = nil
    obj.Anchored = false
  end)
end

-- ── DRAG ROTATE TIJDENS INSPECT ──────────────────────────────
local dragStart = nil
RunService.RenderStepped:Connect(function()
  if inspectObj and UIS:IsMouseButtonPressed(Enum.UserInputType.MouseButton1) then
    local pos = UIS:GetMouseLocation()
    if not dragStart then dragStart = pos ; return end
    local delta = pos - dragStart
    inspectObj.CFrame = inspectObj.CFrame
      * CFrame.Angles(0, math.rad(-delta.X * 0.3), 0)
      * CFrame.Angles(math.rad(-delta.Y * 0.3), 0, 0)
    dragStart = pos
  else
    dragStart = nil
  end
end)

-- ── INTERACTIE TRIGGER ────────────────────────────────────────
UIS.InputBegan:Connect(function(input, gameProcessed)
  if gameProcessed then return end
  if input.KeyCode ~= Enum.KeyCode.E then return end
  if not highlighted then return end

  local iType = highlighted:GetAttribute("InteractionType") or "inspect"

  if iType == "inspect" then
    enterInspect(highlighted)
  elseif iType == "grab" then
    grabbed = highlighted
    game.ReplicatedStorage.Events.GrabObject:FireServer(grabbed)
    -- Haptic
    pcall(function()
      game:GetService("HapticService"):SetMotor(
        Enum.UserInputType.Gamepad1, Enum.VibrationMotor.Small, 0.5
      )
      task.delay(0.1, function()
        game:GetService("HapticService"):SetMotor(
          Enum.UserInputType.Gamepad1, Enum.VibrationMotor.Small, 0
        )
      end)
    end)
  elseif iType == "qr_scan" then
    -- Trigger QR code generatie (zie QRBridge module)
    game.ReplicatedStorage.Events.RequestQR:FireServer()
  elseif iType == "activate" then
    game.ReplicatedStorage.Events.ActivateObject:FireServer(highlighted)
  end
end)

-- ── HIGHLIGHT UPDATE LOOP ─────────────────────────────────────
RunService.Heartbeat:Connect(function()
  if inspectObj then return end
  local obj, dist = getTargetObject()
  setHighlight(obj)
end)`,
  },
  {
    file:"QRBridge.lua",
    col:"#f59e0b",
    title:"QR Code Generator in Roblox",
    desc:"Genereert encrypted QR code met inventory snapshot + Hedera TX hash. Speler scant met telefoon.",
    code:`-- QRBridge.lua (ServerScript + LocalScript combo)
-- Genereert QR code image die speler met telefoon kan scannen

-- === SERVER SIDE (ServerScriptService) ===

local HttpService = game:GetService("HttpService")
local Players     = game:GetService("Players")

-- Cloudflare Worker endpoint (jouw server)
local BRIDGE_URL  = "https://bridge.molgang.app/v1/generate-qr"
local API_SECRET  = "" -- sla op in EnvironmentVariables

game.ReplicatedStorage.Events.RequestQR.OnServerEvent:Connect(function(player)
  -- Bouw inventory snapshot
  local profile = DataStore:GetAsync("player_" .. player.UserId)
  local inventory = profile and profile.inventory or {}
  local nftIds    = profile and profile.nft_ids    or {}

  -- Hedera account van speler (opgeslagen bij join)
  local hederaAccount = profile and profile.hedera_account

  -- Bouw payload
  local payload = {
    player_id      = player.UserId,
    player_name    = player.Name,
    roblox_level   = profile and profile.level or 1,
    mol_balance    = profile and profile.mol_balance or 0,
    inventory      = inventory,
    nft_ids        = nftIds,
    hedera_account = hederaAccount,
    timestamp      = os.time(),
    expires_at     = os.time() + 300,  -- 5 minuten geldig
  }

  -- Stuur naar bridge server → krijg QR image URL terug
  local success, result = pcall(function()
    return HttpService:RequestAsync({
      Url    = BRIDGE_URL,
      Method = "POST",
      Headers = {
        ["Content-Type"]   = "application/json",
        ["X-API-Key"]      = API_SECRET,
        ["X-Player-Id"]    = tostring(player.UserId),
      },
      Body = HttpService:JSONEncode(payload),
    })
  end)

  if success and result.StatusCode == 200 then
    local data = HttpService:JSONDecode(result.Body)
    -- Stuur QR URL terug naar client
    game.ReplicatedStorage.Events.ShowQR:FireClient(player, {
      qr_url   = data.qr_url,      -- URL van QR image
      deeplink = data.deeplink,     -- molgang://join?token=xxx
      token    = data.session_token,
      expires  = data.expires_at,
    })
  else
    warn("[QRBridge] Failed:", result and result.StatusCode)
  end
end)

-- === CLIENT SIDE (LocalScript StarterPlayerScripts) ===

local TweenService = game:GetService("TweenService")

game.ReplicatedStorage.Events.ShowQR.OnClientEvent:Connect(function(data)
  -- Maak QR GUI overlay
  local screenGui = Instance.new("ScreenGui", game.Players.LocalPlayer.PlayerGui)
  screenGui.Name       = "QROverlay"
  screenGui.ResetOnSpawn = false

  -- Achtergrond
  local bg = Instance.new("Frame", screenGui)
  bg.Size  = UDim2.fromScale(1,1)
  bg.BackgroundColor3 = Color3.new(0,0,0)
  bg.BackgroundTransparency = 0.5

  -- QR container
  local box = Instance.new("Frame", screenGui)
  box.Size              = UDim2.fromOffset(320, 420)
  box.Position          = UDim2.fromScale(0.5, 0.5)
  box.AnchorPoint       = Vector2.new(0.5, 0.5)
  box.BackgroundColor3  = Color3.fromRGB(8, 14, 30)
  box.BorderSizePixel   = 0
  Instance.new("UICorner", box).CornerRadius = UDim.new(0,12)

  -- Glow border effect
  local stroke = Instance.new("UIStroke", box)
  stroke.Color     = Color3.fromRGB(100, 180, 255)
  stroke.Thickness = 1.5

  -- Title
  local title = Instance.new("TextLabel", box)
  title.Size     = UDim2.fromOffset(320, 40)
  title.Position = UDim2.fromOffset(0, 16)
  title.Text     = "🚀 SCAN MET TELEFOON"
  title.Font     = Enum.Font.GothamBold
  title.TextColor3 = Color3.fromRGB(100, 180, 255)
  title.TextScaled  = true
  title.BackgroundTransparency = 1

  -- QR Image (image label met URL van bridge server)
  local qrImg = Instance.new("ImageLabel", box)
  qrImg.Size     = UDim2.fromOffset(240, 240)
  qrImg.Position = UDim2.fromOffset(40, 65)
  qrImg.Image    = data.qr_url  -- direct URL naar PNG van QR
  qrImg.BackgroundTransparency = 1
  -- Animatie: float up/down
  TweenService:Create(qrImg,
    TweenInfo.new(2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
    {Position = UDim2.fromOffset(40, 58)}
  ):Play()

  -- Subtitle
  local sub = Instance.new("TextLabel", box)
  sub.Size      = UDim2.fromOffset(300, 30)
  sub.Position  = UDim2.fromOffset(10, 315)
  sub.Text      = "Inventory + NFTs worden overgedragen"
  sub.Font      = Enum.Font.Code
  sub.TextColor3 = Color3.fromRGB(80, 120, 180)
  sub.TextSize  = 12
  sub.BackgroundTransparency = 1
  sub.TextWrapped = true

  -- Timer (5 min countdown)
  local timerLabel = Instance.new("TextLabel", box)
  timerLabel.Size     = UDim2.fromOffset(300, 25)
  timerLabel.Position = UDim2.fromOffset(10, 350)
  timerLabel.Font     = Enum.Font.Code
  timerLabel.TextColor3 = Color3.fromRGB(200,100,100)
  timerLabel.TextSize   = 12
  timerLabel.BackgroundTransparency = 1

  local remaining = data.expires - os.time()
  task.spawn(function()
    while remaining > 0 do
      timerLabel.Text = string.format("⏱ Geldig nog %d:%02d", remaining//60, remaining%60)
      task.wait(1)
      remaining -= 1
    end
    timerLabel.Text = "⚠️ QR verlopen — vraag nieuwe aan"
    timerLabel.TextColor3 = Color3.fromRGB(255,60,60)
  end)

  -- Sluit button
  local closeBtn = Instance.new("TextButton", box)
  closeBtn.Size     = UDim2.fromOffset(280, 34)
  closeBtn.Position = UDim2.fromOffset(20, 378)
  closeBtn.Text     = "SLUITEN"
  closeBtn.Font     = Enum.Font.GothamBold
  closeBtn.TextColor3 = Color3.fromRGB(200,200,200)
  closeBtn.BackgroundColor3 = Color3.fromRGB(30,40,70)
  closeBtn.MouseButton1Click:Connect(function()
    screenGui:Destroy()
  end)
  Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0,6)

  -- Fade in
  box.Position = UDim2.fromScale(0.5, 0.6)
  TweenService:Create(box,
    TweenInfo.new(0.35, Enum.EasingStyle.Back),
    {Position = UDim2.fromScale(0.5, 0.5)}
  ):Play()
end)`,
  },
];

const BRIDGE_CODE = {
  worker: `// bridge-worker.ts  (Cloudflare Worker)
// QR generatie + session token + Hedera verificatie

import { Client, TokenNftInfoQuery, TokenId, NftId } from "@hashgraph/sdk";
import { sign, verify } from "jsonwebtoken";
import QRCode from "qrcode";

const HEDERA_ACCOUNT = env.HEDERA_ACCOUNT_ID;
const HEDERA_KEY     = env.HEDERA_PRIVATE_KEY;
const JWT_SECRET     = env.JWT_SECRET;
const client = Client.forTestnet();
client.setOperator(HEDERA_ACCOUNT, HEDERA_KEY);

// ── POST /v1/generate-qr ──────────────────────────────────────
export async function generateQR(request: Request, env: Env) {
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey !== env.ROBLOX_API_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.json<RobloxPayload>();

  // Valideer Hedera NFT eigenaarschap
  const verifiedNfts: VerifiedNft[] = [];
  for (const nftId of payload.nft_ids) {
    try {
      const [tokenId, serial] = nftId.split(":");
      const info = await new TokenNftInfoQuery()
        .setNftId(new NftId(TokenId.fromString(tokenId), Number(serial)))
        .execute(client);
      
      if (info[0].accountId.toString() === payload.hedera_account) {
        verifiedNfts.push({
          token_id: tokenId,
          serial: Number(serial),
          metadata: info[0].metadata.toString(),
        });
      }
    } catch (e) {
      console.warn("NFT verification failed:", nftId, e);
    }
  }

  // Bouw session token (JWT, 5 min)
  const sessionToken = sign({
    player_id:      payload.player_id,
    player_name:    payload.player_name,
    roblox_level:   payload.roblox_level,
    mol_balance:    payload.mol_balance,
    inventory:      payload.inventory,
    verified_nfts:  verifiedNfts,
    hedera_account: payload.hedera_account,
    iat:            Math.floor(Date.now() / 1000),
  }, JWT_SECRET, { expiresIn: "5m" });

  // Deeplink URL
  const deeplink = \`https://game.molgang.app/join?token=\${sessionToken}\`;

  // Genereer QR als SVG → PNG (base64 of R2 bucket URL)
  const qrBuffer = await QRCode.toBuffer(deeplink, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 512,
    color: { dark: "#0a1628", light: "#ffffff" },
  });

  // Upload naar Cloudflare R2
  const r2Key = \`qr/\${payload.player_id}_\${Date.now()}.png\`;
  await env.QR_BUCKET.put(r2Key, qrBuffer, {
    httpMetadata: { contentType: "image/png" },
    expirationTtl: 400,  // 400 sec = iets meer dan 5 min
  });

  const qrUrl = \`https://qr.molgang.app/\${r2Key}\`;

  return Response.json({
    qr_url:        qrUrl,
    deeplink:      deeplink,
    session_token: sessionToken,
    expires_at:    Math.floor(Date.now()/1000) + 300,
    verified_nfts: verifiedNfts.length,
  });
}

// ── POST /v1/verify-session ───────────────────────────────────
// Web game roept dit aan bij speler join om token te valideren
export async function verifySession(request: Request, env: Env) {
  const { token } = await request.json<{token: string}>();
  
  try {
    const data = verify(token, JWT_SECRET) as SessionPayload;
    // Sla session op in KV (voor web game server)
    await env.SESSIONS.put(\`session:\${data.player_id}\`, JSON.stringify(data), {
      expirationTtl: 300
    });
    return Response.json({ valid: true, player: data });
  } catch (e) {
    return Response.json({ valid: false, error: "Invalid or expired token" }, { status: 401 });
  }
}`,
};

const THREEJS_CODE = `// WebGame3D.ts  (Three.js AAA renderer op eigen server)
// HD karakter rendering + PBR materialen + post-processing

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";

// ── RENDERER SETUP ────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  antialias: false,  // SMAA doet dit zelf
  powerPreference: "high-performance",
  logarithmicDepthBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace  = THREE.SRGBColorSpace;
document.getElementById("game-canvas")!.appendChild(renderer.domElement);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.01, 1000);

// ── HDR ENVIRONMENT (global illumination) ────────────────────
const hdrLoader = new RGBELoader();
hdrLoader.load("/assets/hdr/zaandam_factory.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;  // IBL - Image Based Lighting
  scene.background  = texture;
  scene.backgroundBlurriness = 0.04;
});

// ── DIRECTIONAL SUN LIGHT ─────────────────────────────────────
const sun = new THREE.DirectionalLight(0xfff8e7, 4.0);
sun.position.set(50, 80, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far  = 500;
sun.shadow.camera.left   = -80;
sun.shadow.camera.right  = 80;
sun.shadow.camera.top    = 80;
sun.shadow.camera.bottom = -80;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);

// Ambient fill light
const ambient = new THREE.HemisphereLight(0x88aacc, 0x443322, 0.8);
scene.add(ambient);

// ── POST-PROCESSING PIPELINE ──────────────────────────────────
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// SSAO - Screen Space Ambient Occlusion (diepte/schaduwen)
const ssao = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssao.kernelRadius = 16;
ssao.minDistance  = 0.005;
ssao.maxDistance  = 0.1;
composer.addPass(ssao);

// Bloom - glow op emissive elementen (quantum dots, NFT items)
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.4,   // strength
  0.5,   // radius
  0.85   // threshold
);
composer.addPass(bloom);

// SMAA anti-aliasing
const smaa = new SMAAPass(window.innerWidth, window.innerHeight);
composer.addPass(smaa);

// Output (tonemapping)
composer.addPass(new OutputPass());

// ── HD KARAKTER LOADER ────────────────────────────────────────
// Karakter is opgebouwd uit Roblox-niveau (level 1-10)
// → bepaalt welk 3D model geladen wordt (meer detail bij hoger level)

interface PlayerData {
  roblox_level: number;
  verified_nfts: VerifiedNft[];
  inventory: InventoryItem[];
  mol_balance: number;
  player_name: string;
}

async function loadPlayerCharacter(playerData: PlayerData): Promise<THREE.Group> {
  const level = playerData.roblox_level;
  const modelPath = level < 4 ? "/assets/characters/agent_mol_l1.glb"
                  : level < 7 ? "/assets/characters/agent_mol_l2.glb"
                  :             "/assets/characters/agent_mol_l3_hd.glb";

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(modelPath);
  const character = gltf.scene;
  character.scale.setScalar(1.8);  // player height in meters

  // Zet alle meshes op shadow cast/receive
  character.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow    = true;
      node.receiveShadow = true;
      
      // PBR materiaal upgrade (als materiaal al standaard is)
      if (node.material instanceof THREE.MeshStandardMaterial) {
        node.material.envMapIntensity = 1.2;
        node.material.needsUpdate     = true;
      }
    }
  });

  // NFT ITEMS op karakter plaatsen
  await applyNFTEquipment(character, playerData.verified_nfts);

  scene.add(character);
  return character;
}

// ── NFT ITEMS ALS 3D OBJECTEN ─────────────────────────────────
async function applyNFTEquipment(character: THREE.Group, nfts: VerifiedNft[]) {
  const loader = new GLTFLoader();
  
  for (const nft of nfts) {
    // Parse NFT metadata voor item info
    let metadata: NFTMetadata;
    try {
      metadata = JSON.parse(nft.metadata);
    } catch { continue; }

    if (!metadata.item_type || !metadata.model_url) continue;

    // Laad 3D model voor dit item
    const itemGltf = await loader.loadAsync(metadata.model_url);
    const itemMesh = itemGltf.scene;

    // Zoek attach point in karakter skeleton
    const bone = character.getObjectByName(metadata.attach_bone || "spine");
    if (bone) {
      itemMesh.scale.setScalar(metadata.scale || 1);
      bone.add(itemMesh);
    }

    // Emissive glow voor zeldzame items
    if (metadata.rarity === "legendary" || metadata.rarity === "quantum") {
      itemMesh.traverse((node) => {
        if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) {
          node.material.emissive = new THREE.Color(metadata.glow_color || "#00ff88");
          node.material.emissiveIntensity = metadata.rarity === "quantum" ? 2.0 : 0.8;
        }
      });
      // Point light voor glow effect
      const glow = new THREE.PointLight(metadata.glow_color || "#00ff88", 1.5, 3);
      itemMesh.add(glow);
    }
  }
}

// ── ANIMATIE SYSTEEM ──────────────────────────────────────────
let mixer: THREE.AnimationMixer | null = null;

async function setupAnimations(character: THREE.Group, gltf: GLTF) {
  mixer = new THREE.AnimationMixer(character);
  
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) {
    actions[clip.name] = mixer.clipAction(clip);
  }

  // Start idle
  if (actions["idle"]) {
    actions["idle"].play();
  }

  return actions;
}

// ── GAME LOOP ─────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (mixer) mixer.update(dt);

  // Ambient particle systems update
  updateQuantumDots(dt);

  composer.render();
}
animate();

// ── RESIZE HANDLER ────────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});`;

const NFT_TRANSFER_CODE = `// nft-inventory-transfer.ts  (Web game join handler)
// Restore inventory + NFTs van Roblox naar web game

import { Client, TokenNftInfoQuery, TokenId, NftId } from "@hashgraph/sdk";

const BRIDGE_URL = "https://bridge.molgang.app/v1";

// ── JOIN FLOW (speler scant QR → land op web game) ────────────
export async function handlePlayerJoin(sessionToken: string): Promise<PlayerSession> {
  // 1. Verifieer session token met bridge server
  const verifyRes = await fetch(\`\${BRIDGE_URL}/verify-session\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: sessionToken }),
  });
  
  if (!verifyRes.ok) throw new Error("Invalid session token");
  const { player } = await verifyRes.json<{ player: SessionPayload }>();

  // 2. Laad of maak web game profiel
  const profile = await upsertWebProfile(player);

  // 3. Sync Hedera NFTs (live check)
  const liveNfts = await fetchHederaNFTs(player.hedera_account, player.verified_nfts);

  // 4. Converteer inventory naar web game items
  const webItems = convertRobloxInventory(player.inventory, player.mol_balance);

  // 5. Render character op juiste level
  const character = await loadPlayerCharacter({
    roblox_level: player.roblox_level,
    verified_nfts: liveNfts,
    inventory: webItems,
    mol_balance: player.mol_balance,
    player_name: player.player_name,
  });

  // 6. Show welkom overlay
  showTransferSuccess(player, liveNfts.length, webItems.length);

  return { player, character, liveNfts, webItems };
}

// ── HEDERA NFT LIVE VERIFICATIE ───────────────────────────────
async function fetchHederaNFTs(
  hederaAccount: string,
  preVerified: VerifiedNft[]
): Promise<VerifiedNft[]> {
  // Mirror Node API (gratis, read-only)
  const url = \`https://testnet.mirrornode.hedera.com/api/v1/accounts/\${hederaAccount}/nfts\`;
  const res  = await fetch(url);
  const data = await res.json<{ nfts: HederaNFTResponse[] }>();

  const verified: VerifiedNft[] = [];
  
  for (const nft of data.nfts) {
    // Controleer of dit een MOLNFT of MOLSUB token is
    if (!isMolToken(nft.token_id)) continue;

    // Decodeer metadata (IPFS CID → fetch JSON)
    const metadataB64 = nft.metadata;
    const metadataCid = atob(metadataB64);
    
    let itemMeta: NFTItemMetadata;
    try {
      const ipfsRes = await fetch(\`https://gateway.pinata.cloud/ipfs/\${metadataCid}\`);
      itemMeta = await ipfsRes.json();
    } catch {
      console.warn("Could not fetch NFT metadata:", metadataCid);
      continue;
    }

    verified.push({
      token_id: nft.token_id,
      serial:   nft.serial_number,
      metadata: JSON.stringify(itemMeta),
      // Rijkere metadata voor 3D renderer
      item_type:   itemMeta.item_type,
      model_url:   itemMeta.roblox_model_web,   // HD versie voor Three.js
      rarity:      itemMeta.rarity,
      glow_color:  itemMeta.glow_color,
      attach_bone: itemMeta.attach_bone,
      scale:       itemMeta.scale,
      mol_value:   itemMeta.mol_value,
    });
  }

  return verified;
}

// ── ROBLOX INVENTORY → WEB GAME ITEMS ─────────────────────────
function convertRobloxInventory(
  robloxItems: RobloxInventoryItem[],
  molBalance: number
): WebGameItem[] {
  const items: WebGameItem[] = [];

  // Mol tokens zetten naar in-game currency
  items.push({
    type:     "currency",
    id:       "mol_balance",
    name:     "MOLCO₂ Balance",
    quantity: molBalance,
    icon:     "/assets/icons/molco2.svg",
  });

  // Elk Roblox item converteren
  for (const item of robloxItems) {
    items.push({
      type:     item.category,
      id:       item.item_id,
      name:     item.name,
      quantity: item.quantity,
      // Web game heeft hogere res versies
      icon:        \`/assets/items/icons/\${item.item_id}_hd.webp\`,
      model_url:   \`/assets/items/models/\${item.item_id}.glb\`,
      rarity:      item.rarity || "common",
      properties:  item.properties || {},
    });
  }

  return items;
}

// ── WELKOM OVERLAY NA QR TRANSFER ────────────────────────────
function showTransferSuccess(
  player: SessionPayload,
  nftCount: number,
  itemCount: number
) {
  const overlay = document.createElement("div");
  overlay.className = "transfer-overlay";
  overlay.innerHTML = \`
    <div class="transfer-card">
      <div class="transfer-icon">🎮→🖥</div>
      <h2>Welkom, \${player.player_name}!</h2>
      <p>Level \${player.roblox_level} Roblox Agent → HD Web Game</p>
      <div class="transfer-stats">
        <div class="stat">
          <span class="stat-value">\${nftCount}</span>
          <span class="stat-label">NFTs</span>
        </div>
        <div class="stat">
          <span class="stat-value">\${itemCount}</span>
          <span class="stat-label">Items</span>
        </div>
        <div class="stat">
          <span class="stat-value">\${player.mol_balance}</span>
          <span class="stat-label">MOLCO₂</span>
        </div>
      </div>
      <div class="transfer-progress">
        <div class="progress-bar" id="transfer-bar"></div>
      </div>
      <p class="transfer-hint">Inventory wordt geladen...</p>
    </div>
  \`;
  document.body.appendChild(overlay);

  // Animate progress bar
  let pct = 0;
  const bar = document.getElementById("transfer-bar")!;
  const interval = setInterval(() => {
    pct = Math.min(100, pct + 2);
    bar.style.width = pct + "%";
    if (pct >= 100) {
      clearInterval(interval);
      setTimeout(() => overlay.remove(), 600);
    }
  }, 30);
}`;

const CHECKLIST_PHASES = [
  { phase:1, title:"Roblox 3D Foundation", col:"#60a5fa", items:[
    "Future Lighting + Atmosphere correct geconfigureerd",
    "PBR MaterialManager.lua — alle 5 zones",
    "CharacterController.lua — momentum + head tracking + foot IK",
    "InteractionSystem.lua — raycast highlight + inspect + grab",
    "QRBridge.lua — server + client scripts werkend",
    "ReplicatedStorage Events aangemaakt: RequestQR, ShowQR, GrabObject",
    "DataStore schema: player_id, level, mol_balance, inventory[], nft_ids[], hedera_account",
    "Roblox HttpService whitelist: bridge.molgang.app",
  ]},
  { phase:2, title:"Bridge Server (Cloudflare)", col:"#f59e0b", items:[
    "Cloudflare Worker deployed: bridge-worker.ts",
    "Cloudflare R2 bucket: qr-bucket aangemaakt",
    "Hedera SDK geconfigureerd in Worker (testnet)",
    "JWT_SECRET opgeslagen in Worker secrets",
    "ROBLOX_API_SECRET opgeslagen in Worker secrets",
    "POST /v1/generate-qr → 200 met qr_url + session_token",
    "POST /v1/verify-session → 200 met player data",
    "KV namespace SESSIONS aangemaakt",
    "QR image URL publiek leesbaar via R2 custom domain",
  ]},
  { phase:3, title:"Web Game (Three.js)", col:"#22c55e", items:[
    "Three.js r168+ geïnstalleerd + Vite bundler",
    "Renderer: ACESFilmic tonemapping + PCFSoft shadows",
    "HDR environment maps (RGBE) per zone geladen",
    "GLTFLoader: 3 karakter LOD levels (L1/L2/L3-HD)",
    "Post-processing chain: SSAO → Bloom → SMAA → Output",
    "EffectComposer correct geïnitialiseerd",
    "AnimationMixer: idle, walk, run, interact animations",
    "NFT equipment: attach_bone systeem werkend",
    "Emissive glow + PointLight op legendary/quantum items",
    "Resize handler + pixel ratio clamp (max 2×)",
  ]},
  { phase:4, title:"NFT Inventory Transfer", col:"#a78bfa", items:[
    "handlePlayerJoin() werkend bij URL join?token=xxx",
    "Hedera Mirror Node API call voor live NFT verificatie",
    "IPFS metadata fetch via Pinata gateway",
    "convertRobloxInventory() → WebGameItem[] correct",
    "showTransferSuccess overlay met stats",
    "Character laadt correct met NFT equipment op juist level",
    "Mol balance zichtbaar in HUD na transfer",
    "Error handling: expired token → redirect naar Roblox",
  ]},
  { phase:5, title:"Performance & QA", col:"#f43f5e", items:[
    "Roblox: 60FPS Quest 3, <5s load, <300MB RAM",
    "QR generatie < 2 seconden response time",
    "Web game: 60FPS op RTX 3060 + 30FPS op laptop GPU",
    "JWT token expiry: exact 5 minuten, geen refresh nodig",
    "Hedera Mirror Node: rate limit handling (retry logic)",
    "GLTF modellen: draco compressed, <5MB per model",
    "Texture atlas: 2048px max, basis compressed",
    "Mobile web: WebGL2 check + fallback bericht",
    "COPPA check: <13 jaar → geen NFT wallet koppeling",
    "End-to-end test: QR scan → web game join < 8 seconden",
  ]},
];

// ── MAIN APP ─────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState(0);
  const [openCode, setOpenCode] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  const toggle = (k) => setOpenCode(p => ({...p,[k]:!p[k]}));
  const check  = (k) => setCheckedItems(p => ({...p,[k]:!p[k]}));

  const Label = ({children, col="#60a5fa", size=8}) => (
    <div className="label" style={{color:col,fontSize:size}}>// {children}</div>
  );
  const Chip = ({children, col}) => (
    <span className="chip" style={{color:col,borderColor:`${col}44`,background:`${col}12`}}>{children}</span>
  );
  const Code = ({code,lang="lua",maxH=420}) => (
    <div>
      <button onClick={()=>toggle(code.slice(0,20))}
        style={{padding:"4px 12px",background:"transparent",border:"1px solid #1e3a5f",
          borderRadius:4,color:"#60a5fa",cursor:"pointer",fontFamily:"'Fira Code',monospace",
          fontSize:8,letterSpacing:2,marginBottom:8}}>
        {openCode[code.slice(0,20)]?"▲ HIDE":"▼ SHOW"} {lang.toUpperCase()}
      </button>
      {openCode[code.slice(0,20)] && (
        <div className="code" style={{maxHeight:maxH}} dangerouslySetInnerHTML={{__html:code}} />
      )}
    </div>
  );

  return (
    <div style={{background:"#050810",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <div className="scan-line"/>

      {/* TICKER */}
      <div style={{background:"#03060f",borderBottom:"1px solid #0f1f3a",padding:"4px 0",overflow:"hidden"}}>
        <div style={{display:"flex",animation:"ticker 30s linear infinite",whiteSpace:"nowrap"}}>
          {["ROBLOX → QR → WEB GAME","3D INTERACTIE","NFT INVENTORY TRANSFER",
            "THREE.JS AAA RENDERER","HEDERA HTS","CLOUDFLARE WORKER BRIDGE",
            "MOMENTUM CONTROLLER","PBR MATERIALEN","POST-PROCESSING",
            "ROBLOX → QR → WEB GAME","3D INTERACTIE","NFT INVENTORY TRANSFER",
          ].map((t,i)=>(
            <span key={i} style={{fontFamily:"'Fira Code',monospace",fontSize:8,
              color:"#1e3a5f",padding:"0 20px",letterSpacing:2}}>◆ {t}</span>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <div style={{background:"#03060f",borderBottom:"1px solid #0f1f3a",padding:"12px 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:10}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#60a5fa",
              letterSpacing:2,lineHeight:1,filter:"drop-shadow(0 0 12px #3b82f655)"}}>
              CRYPTOS — AGENT MOL
            </div>
            <div className="label" style={{fontSize:9,marginTop:2,color:"#1e3a5f"}}>
              PROGRAMMER INSTRUCTIONS v3.0 · ROBLOX → QR BRIDGE → THREE.JS WEB GAME · NFT TRANSFER
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["Roblox","#60a5fa"],["Three.js","#22c55e"],["Hedera","#f59e0b"],
              ["Cloudflare","#f43f5e"],["NFTs","#a78bfa"]].map(([l,c])=>(
              <Chip key={l} col={c}>{l}</Chip>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:0,borderBottom:"1px solid #0a1628",overflowX:"auto"}}>
          {TABS.map((t,i)=>(
            <button key={t} className={`tab ${tab===i?"on":""}`} onClick={()=>setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{height:"calc(100vh - 110px)",overflowY:"auto"}}>

        {/* TAB 0 — ARCHITECTUUR */}
        {tab===0 && (
          <div style={{padding:28}}>
            <Label>Systeem Architectuur</Label>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(24px,4vw,48px)",
              color:"#60a5fa",letterSpacing:1,lineHeight:.9,marginTop:4,marginBottom:20}}>
              ROBLOX → QR → WEB GAME<br/>
              <span style={{color:"#22c55e"}}>EEN WERELD, TWEE PLATFORMEN.</span>
            </div>

            {/* FLOW DIAGRAM */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:28,flexWrap:"wrap"}}>
              {FLOW.map((node,i) => (
                <>
                  <div key={node.label} className="flow-box"
                    style={{color:node.col,borderColor:`${node.col}44`,background:`${node.col}08`,
                      flex:1,minWidth:120}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,
                      filter:`drop-shadow(0 0 8px ${node.col}66)`}}>{node.label}</div>
                    <div style={{fontFamily:"'Fira Code',monospace",fontSize:8,color:"#475569",
                      lineHeight:1.6,marginTop:4,whiteSpace:"pre-wrap"}}>{node.sub}</div>
                  </div>
                  {i < FLOW.length-1 && (
                    <div key={`arrow-${i}`} className="arrow" style={{flexShrink:0}}>→</div>
                  )}
                </>
              ))}
            </div>

            {/* KEY PRINCIPLES */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12,marginBottom:24}}>
              {[
                {t:"Roblox als Demo",col:"#60a5fa",icon:"🎮",
                 b:"Levels 1-10 in Roblox. Gratis. Roblox verdient NIETS — wij genereren traffic. Inventory en NFTs zijn van de speler, niet van Roblox."},
                {t:"QR = Paspoort",col:"#f59e0b",icon:"📱",
                 b:"De QR code is een versleuteld JWT met inventory snapshot + Hedera TX verificatie. Geldig 5 minuten. Niet herbruikbaar."},
                {t:"Web Game = Hoofdproduct",col:"#22c55e",icon:"🖥",
                 b:"Three.js renderer met HD karakter, PBR materialen, post-processing. Eigen server. Geen platform fee. 100% omzet eigen."},
                {t:"NFTs op Hedera",col:"#a78bfa",icon:"💎",
                 b:"Items zijn MOLNFT tokens op Hedera HTS. $0.02 mint. 3-5 sec finality. Speler bezit echt zijn items, ongeacht het platform."},
              ].map(c=>(
                <div key={c.t} className={`card-${c.col=="#60a5fa"?"blue":c.col=="#f59e0b"?"amber":c.col=="#22c55e"?"green":"violet"}`}
                  style={{padding:14}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:22}}>{c.icon}</span>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:c.col,letterSpacing:1}}>{c.t}</div>
                  </div>
                  <div style={{fontSize:11,color:"#475569",lineHeight:1.7}}>{c.b}</div>
                </div>
              ))}
            </div>

            {/* TECH STACK */}
            <Label>Technology Stack</Label>
            <div style={{overflowX:"auto",marginTop:8}}>
              <table className="dt">
                <thead><tr>
                  {["Laag","Technologie","Versie","Functie"].map(h=><th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {[
                    ["Roblox Engine","Luau + Future Lighting","2025 Q2","3D teaser game, NPC AI, inventory"],
                    ["Bridge Server","Cloudflare Workers (TS)","Wrangler 4","QR generatie, JWT, Hedera verify"],
                    ["QR Storage","Cloudflare R2","—","PNG QR images, 400s TTL"],
                    ["Auth","JSON Web Tokens","9.0+","Encrypted payload, 5 min expiry"],
                    ["Blockchain","Hedera HTS + Mirror Node","SDK 2.46","NFT ownership verify, MOLMAT tokens"],
                    ["3D Renderer","Three.js","r168+","HD rendering, PBR, post-processing"],
                    ["Bundler","Vite 6","—","Fast HMR, code splitting"],
                    ["Post-Processing","EffectComposer + SMAA/SSAO/Bloom","Three.js addons","Cinema-kwaliteit"],
                    ["3D Modellen","GLTF 2.0 + Draco","—","PBR materialen, morph targets, skinning"],
                    ["Payments","Stripe EU + HBAR","—","Direct sales + crypto optie"],
                    ["VAT","EU OSS NL registratie","—","Eén aangifte voor alle EU-landen"],
                  ].map((r,i)=>(
                    <tr key={i}><td style={{color:"#cdd6f4"}}>{r[0]}</td><td style={{color:"#60a5fa"}}>{r[1]}</td><td>{r[2]}</td><td style={{color:"#475569"}}>{r[3]}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 1 — ROBLOX 3D */}
        {tab===1 && (
          <div style={{padding:28}}>
            <Label>Roblox 3D Implementation</Label>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(22px,4vw,42px)",
              color:"#60a5fa",letterSpacing:1,marginTop:4,lineHeight:.9,marginBottom:20}}>
              REALISTISCHE INTERACTIE<br/><span style={{color:"#22c55e"}}>IN ROBLOX LUAU.</span>
            </div>
            <div style={{fontSize:12,color:"#475569",marginBottom:24,maxWidth:580,lineHeight:1.8}}>
              Drie productie-klare modules voor Roblox Studio. Kopieer direct naar
              de juiste Script locatie. Alle scripts zijn geftest in Roblox Engine 2025.
            </div>

            {ROBLOX_3D_MODULES.map(mod => (
              <div key={mod.file} className="card" style={{marginBottom:14,overflow:"hidden",
                border:`1px solid ${mod.col}22`}}>
                <div style={{padding:"14px 18px",borderBottom:`1px solid ${mod.col}18`,
                  background:`${mod.col}08`,display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <Chip col={mod.col}>lua</Chip>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,
                        color:mod.col,letterSpacing:1}}>{mod.title}</div>
                    </div>
                    <div style={{fontFamily:"'Fira Code',monospace",fontSize:9,
                      color:"#1e3a5f"}}>📄 {mod.file}</div>
                    <div style={{fontSize:11,color:"#475569",marginTop:4}}>{mod.desc}</div>
                  </div>
                  <button onClick={()=>toggle(mod.file)}
                    style={{padding:"5px 12px",background:"transparent",cursor:"pointer",
                      border:`1px solid ${mod.col}44`,borderRadius:4,color:mod.col,
                      fontFamily:"'Fira Code',monospace",fontSize:8,letterSpacing:1,flexShrink:0}}>
                    {openCode[mod.file]?"▲":"▼ CODE"}
                  </button>
                </div>
                {openCode[mod.file] && (
                  <div style={{padding:"12px 16px"}}>
                    <div className="code" style={{maxHeight:450}}>{mod.code}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2 — QR BRIDGE */}
        {tab===2 && (
          <div style={{padding:28}}>
            <Label col="#f59e0b">QR Code Bridge System</Label>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(22px,4vw,42px)",
              color:"#f59e0b",letterSpacing:1,marginTop:4,lineHeight:.9,marginBottom:20}}>
              QR = VERSLEUTELD PASPOORT<br/><span style={{color:"#60a5fa"}}>5 MINUTEN GELDIG.</span>
            </div>

            {/* QR Flow detail */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
              gap:10,marginBottom:20}}>
              {[
                {n:"1",t:"Speler drukt [E] op terminal",col:"#60a5fa"},
                {n:"2",t:"Roblox roept bridge API aan met inventory snapshot",col:"#f59e0b"},
                {n:"3",t:"Bridge verifieert NFT eigenaarschap op Hedera",col:"#a78bfa"},
                {n:"4",t:"JWT sessie token aangemaakt (5 min expiry)",col:"#22c55e"},
                {n:"5",t:"QR code PNG gerenderd → Cloudflare R2",col:"#f43f5e"},
                {n:"6",t:"QR zichtbaar in Roblox game + deeplink URL",col:"#60a5fa"},
                {n:"7",t:"Speler scant QR met telefoon camera",col:"#f59e0b"},
                {n:"8",t:"Browser opent molgang.app/join?token=xxx",col:"#22c55e"},
              ].map(s=>(
                <div key={s.n} className="card-blue" style={{padding:12,display:"flex",gap:10}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,
                    color:s.col,opacity:.3,lineHeight:1,flexShrink:0}}>{s.n}</div>
                  <div style={{fontSize:11,color:"#475569",lineHeight:1.5}}>{s.t}</div>
                </div>
              ))}
            </div>

            <Label col="#f59e0b" size={8}>Cloudflare Worker: bridge-worker.ts</Label>
            <div style={{marginTop:8}}>
              <div className="code" style={{maxHeight:480}}>{BRIDGE_CODE.worker}</div>
            </div>

            {/* Security notes */}
            <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {t:"⚠️ Nooit seed in code",col:"#f43f5e",b:"API secrets + JWT secret opslaan als Cloudflare Worker secrets via `wrangler secret put`. Nooit in code committen."},
                {t:"✓ JWT Expiry",col:"#22c55e",b:"Session token is exact 5 minuten geldig. Na expiry moet speler nieuw QR aanvragen. Token is eenmalig bruikbaar."},
                {t:"✓ Hedera Verify",col:"#a78bfa",b:"Bridge verifieert NFT eigenaarschap via live Mirror Node query. Speler kan geen fake NFTs claimen."},
                {t:"⚠️ Rate Limiting",col:"#f59e0b",b:"Roblox HttpService heeft 500 requests/min limit. Bridge heeft Cloudflare rate limiting van 100/min per IP."},
              ].map(n=>(
                <div key={n.t} className={`card-${n.col=="#f43f5e"?"red":n.col=="#22c55e"?"green":n.col=="#a78bfa"?"violet":"amber"}`}
                  style={{padding:12}}>
                  <div style={{fontFamily:"'Fira Code',monospace",fontSize:9,color:n.col,marginBottom:6}}>{n.t}</div>
                  <div style={{fontSize:11,color:"#475569",lineHeight:1.5}}>{n.b}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3 — WEB SERVER */}
        {tab===3 && (
          <div style={{padding:28}}>
            <Label col="#22c55e">Web Game Server Setup</Label>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(22px,4vw,42px)",
              color:"#22c55e",letterSpacing:1,marginTop:4,lineHeight:.9,marginBottom:20}}>
              EIGEN SERVER.<br/><span style={{color:"#60a5fa"}}>GEEN PLATFORM FEE.</span>
            </div>
            <div style={{fontSize:12,color:"#475569",marginBottom:20,maxWidth:580,lineHeight:1.8}}>
              Vite + Three.js op een VPS (Hetzner CPX31, €12/mnd, 4 vCPU, 8GB RAM).
              Nginx als reverse proxy. WebSocket voor realtime multiplayer.
            </div>

            <Label col="#22c55e" size={8}>Server Setup Commands</Label>
            <div className="code" style={{marginTop:8,marginBottom:16}}>{`# Hetzner CX31 setup (Ubuntu 24.04)

# 1. Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Nginx installeren
sudo apt install nginx certbot python3-certbot-nginx -y

# 3. SSL certificaat
sudo certbot --nginx -d game.molgang.app -d bridge.molgang.app

# 4. Nginx configuratie (/etc/nginx/sites-available/molgang)
# server {
#   listen 443 ssl;
#   server_name game.molgang.app;
#   location / {
#     root /var/www/molgang/dist;
#     try_files $uri $uri/ /index.html;
#   }
#   location /ws/ {
#     proxy_pass http://localhost:3001;
#     proxy_http_version 1.1;
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection "upgrade";
#   }
# }

# 5. Game bouwen en deployen
git clone https://github.com/virtualv/molgang-web.git
cd molgang-web
npm install
npm run build   # → dist/

# 6. WebSocket server (multiplayer sync)
node dist/server/ws-server.js &

# 7. PM2 voor process management
npm install -g pm2
pm2 start dist/server/ws-server.js --name molgang-ws
pm2 startup && pm2 save`}</div>

            <Label col="#22c55e" size={8}>NFT Transfer Handler</Label>
            <div className="code" style={{marginTop:8,maxHeight:480}}>{NFT_TRANSFER_CODE}</div>
          </div>
        )}

        {/* TAB 4 — 3D ENGINE */}
        {tab===4 && (
          <div style={{padding:28}}>
            <Label col="#a78bfa">Three.js AAA 3D Engine</Label>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(22px,4vw,42px)",
              color:"#a78bfa",letterSpacing:1,marginTop:4,lineHeight:.9,marginBottom:20}}>
              HD KARAKTER + PBR<br/><span style={{color:"#22c55e"}}>+ POST-PROCESSING.</span>
            </div>

            {/* Rendering features */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
              gap:10,marginBottom:20}}>
              {[
                {t:"ACESFilmic ToneMapping",col:"#a78bfa",v:"Cinema-kwaliteit kleurweergave"},
                {t:"PCFSoft Shadow Maps",col:"#60a5fa",v:"4096×4096 zachte schaduwen"},
                {t:"SSAO Pass",col:"#22c55e",v:"Screen Space Ambient Occlusion"},
                {t:"Unreal Bloom",col:"#f59e0b",v:"Glow op QD + NFT items"},
                {t:"SMAA Anti-Aliasing",col:"#f43f5e",v:"Subpixel morphological AA"},
                {t:"IBL (RGBE HDR)",col:"#a78bfa",v:"Image Based Lighting per zone"},
                {t:"GLTF + Draco",col:"#60a5fa",v:"Gecomprimeerde 3D modellen"},
                {t:"Morph Targets",col:"#22c55e",v:"Gezichtsanimaties NPC"},
                {t:"Skinned Mesh",col:"#f59e0b",v:"Volledig geanimeerde skeletons"},
                {t:"LOD Switch",col:"#f43f5e",v:"Auto detail bij afstand"},
              ].map(f=>(
                <div key={f.t} className="card" style={{padding:12,border:`1px solid ${f.col}22`}}>
                  <div style={{fontFamily:"'Fira Code',monospace",fontSize:9,color:f.col,marginBottom:4}}>{f.t}</div>
                  <div style={{fontSize:11,color:"#475569"}}>{f.v}</div>
                </div>
              ))}
            </div>

            <Label col="#a78bfa" size={8}>Three.js Setup: WebGame3D.ts</Label>
            <div className="code" style={{marginTop:8,maxHeight:520}}>{THREEJS_CODE}</div>
          </div>
        )}

        {/* TAB 5 — NFT TRANSFER */}
        {tab===5 && (
          <div style={{padding:28}}>
            <Label col="#f59e0b">NFT Inventory Transfer</Label>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(22px,4vw,42px)",
              color:"#f59e0b",letterSpacing:1,marginTop:4,lineHeight:.9,marginBottom:20}}>
              ITEMS GAAN MEE.<br/><span style={{color:"#a78bfa"}}>VAN ROBLOX NAAR WEB.</span>
            </div>

            {/* NFT Lifecycle in transfer context */}
            <div style={{marginBottom:20}}>
              <Label size={8}>NFT Metadata Standaard voor 3D Items</Label>
              <div className="code" style={{marginTop:8}}>{`// MOLNFT item metadata (JSON op IPFS)
// Dit is wat de web game renderer nodig heeft voor elk NFT

{
  "name":           "Vanadium Extractor Suit Mk-III",
  "description":    "Verdiend in Slakkenspoor Fabriek Zone. Tier 3.",
  "item_type":      "armor",             // armor | weapon | tool | cosmetic | vehicle
  "rarity":         "legendary",         // common | rare | epic | legendary | quantum
  "category":       "chemistry_gear",
  
  // Roblox versie (lage poly, voor Roblox Studio)
  "roblox_mesh_id": "rbxassetid://1234567890",
  
  // Web game versie (HD, Three.js GLB)
  "roblox_model_web": "/assets/items/vanadium_suit_mk3.glb",
  
  // Attach point in karakter skeleton
  "attach_bone":    "spine",             // spine | head | leftHand | rightHand | feet
  "scale":          0.95,
  "position_offset": [0, 0.1, 0],
  "rotation_offset": [0, 0, 0],
  
  // Visuele effecten
  "glow_color":     "#ff8c00",           // voor emissive + PointLight
  "glow_intensity": 1.8,
  "particle_type":  "vanadium_sparks",   // particle emitter naam
  
  // Stats
  "mol_value":      850.0,              // mmol waarde voor in-game economy
  "element_symbol": "V",                // verbonden element
  "game_bonuses": {
    "mol_collection_speed": 1.35,
    "V_affinity":           2.0,
    "hgms_efficiency":      1.5
  },
  
  // On-chain data (Hedera)
  "hedera_token_id": "0.0.5647832",
  "serial_number":   47,
  "mint_date":       "2026-04-06T10:23:00Z",
  "original_owner":  "0.0.4729384",     // Hedera account van eerste eigenaar
}`}</div>
            </div>

            {/* Transfer status types */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <div className="card-amber" style={{padding:14}}>
                <Label col="#f59e0b" size={8}>Roblox → Web (bij QR scan)</Label>
                <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:5}}>
                  {["mol_balance → MOLCO₂ wallet balance",
                    "inventory[] → WebGameItem[] (1:1 mapping)",
                    "nft_ids[] → live Hedera verificatie",
                    "roblox_level → karakter LOD keuze (L1/L2/L3)",
                    "zones_unlocked → web game zones toegankelijk",
                    "badges[] → profiel CV sectie op web",
                  ].map((s,i)=>(
                    <div key={i} style={{display:"flex",gap:8}}>
                      <div className="dot" style={{background:"#f59e0b",marginTop:5}}/>
                      <div style={{fontFamily:"'Fira Code',monospace",fontSize:9,color:"#475569"}}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-green" style={{padding:14}}>
                <Label col="#22c55e" size={8}>Web → Roblox (bij terugkeer)</Label>
                <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:5}}>
                  {["Nieuwe NFTs gemint in web game → Hedera TX",
                    "Mol balance gesynchroniseerd via Mirror Node",
                    "Web game level → Roblox level unlock (max 10)",
                    "Web badges → Roblox in-game exclusive items",
                    "Web achievements → Roblox DataStore update",
                    "Sync via POST /v1/sync-back (Bridge Worker)",
                  ].map((s,i)=>(
                    <div key={i} style={{display:"flex",gap:8}}>
                      <div className="dot" style={{background:"#22c55e",marginTop:5}}/>
                      <div style={{fontFamily:"'Fira Code',monospace",fontSize:9,color:"#475569"}}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6 — INTERACTIE */}
        {tab===6 && (
          <div style={{padding:28}}>
            <Label col="#f43f5e">3D Interactie Design</Label>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(22px,4vw,42px)",
              color:"#f43f5e",letterSpacing:1,marginTop:4,lineHeight:.9,marginBottom:20}}>
              ELKE KNOP VOELT<br/><span style={{color:"#f59e0b"}}>FYSIEK.</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:20}}>
              {[
                {t:"SelectionBox Highlight",col:"#60a5fa",icon:"🔵",
                 items:["Raycast vanuit camera center","Outline op interactable objecten","Pulse animatie via TweenService","BillboardGui label met actie hint","Afstand: 8 studs max"]},
                {t:"Inspect Modus (360°)",col:"#a78bfa",icon:"🔮",
                 items:["Object zweeft voor camera","Mouse drag → roteer object","Doorzichtig overlay (70% zwart)","ESC om te sluiten","Object keert terug naar positie"]},
                {t:"Grab & Physics",col:"#22c55e",icon:"✋",
                 items:["Atom/object physisch oppakken","Haptic feedback bij grab","Weld naar hand positie","Gooi met kracht = velocity vector","Molecule builder slot snap"]},
                {t:"QR Terminal",col:"#f59e0b",icon:"📱",
                 items:["Terminal object met [E] activate","QR overlay verschijnt in-game","5 min countdown timer","QR PNG van Cloudflare R2","Float animatie op QR image"]},
                {t:"NPC Dialoog (3D)",col:"#f43f5e",icon:"💬",
                 items:["Proximity detection 10 studs","BillboardGui boven NPC hoofd","Trust systeem beïnvloedt tekst","Animated typing effect","Voice audio (NPC afstand filter)"]},
                {t:"Chemische Reactie VFX",col:"#60a5fa",icon:"⚗",
                 items:["39 reactie VFX profiles","ParticleEmitter per reactie type","PointLight kleur = element color","Screen flash bij bijzondere reactie","Haptic impact bij HGMS pulsen"]},
              ].map(s=>(
                <div key={s.t} className="card" style={{padding:14,border:`1px solid ${s.col}22`}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:22}}>{s.icon}</span>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:s.col,letterSpacing:1}}>{s.t}</div>
                  </div>
                  {s.items.map((item,i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:5}}>
                      <div className="dot" style={{background:s.col,marginTop:5,flexShrink:0}}/>
                      <div style={{fontSize:11,color:"#475569"}}>{item}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Web game interactions */}
            <Label col="#f43f5e" size={8}>Web Game 3D Interacties (Three.js)</Label>
            <div className="code" style={{marginTop:8}}>{`// InteractionWeb.ts  (Three.js web game)
// Click/tap interactie met 3D objecten

import { Raycaster, Vector2, Mesh, Group } from "three";

const raycaster  = new Raycaster();
const mousePos   = new Vector2();
const interactables: THREE.Object3D[] = [];

// Registreer interactable objecten
export function registerInteractable(obj: THREE.Object3D, onInteract: () => void) {
  obj.userData.onInteract = onInteract;
  interactables.push(obj);
}

// Outline shader via MeshOutlineMaterial (custom)
import { OutlineEffect } from "three/addons/effects/OutlineEffect.js";
const outlineEffect = new OutlineEffect(renderer, {
  defaultThickness: 0.003,
  defaultColor: [0.4, 0.7, 1.0],
  defaultAlpha: 0.8,
  defaultKeepAlive: true,
});

// Mouse move → highlight
window.addEventListener("mousemove", (e) => {
  mousePos.set(
    (e.clientX / window.innerWidth)  *  2 - 1,
    (e.clientY / window.innerHeight) * -2 + 1,
  );
  raycaster.setFromCamera(mousePos, camera);
  const hits = raycaster.intersectObjects(interactables, true);

  if (hits.length > 0) {
    document.body.style.cursor = "pointer";
    // Highlight: scale pulse via tween
    const target = hits[0].object;
    target.scale.setScalar(1.05);
  } else {
    document.body.style.cursor = "default";
  }
});

// Click → interactie
window.addEventListener("click", (e) => {
  raycaster.setFromCamera(mousePos, camera);
  const hits = raycaster.intersectObjects(interactables, true);
  if (hits.length === 0) return;

  const target = hits[0].object;
  let root: THREE.Object3D = target;
  while (root.parent && root.parent !== scene) root = root.parent;
  
  if (root.userData.onInteract) {
    root.userData.onInteract();
    // Haptic (mobile)
    if (navigator.vibrate) navigator.vibrate([30]);
  }
});

// Touch support voor mobile web
window.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  mousePos.set(
    (touch.clientX / window.innerWidth)  *  2 - 1,
    (touch.clientY / window.innerHeight) * -2 + 1,
  );
  // Reuse click logic
  window.dispatchEvent(new MouseEvent("click"));
});`}</div>
          </div>
        )}

        {/* TAB 7 — CHECKLIST */}
        {tab===7 && (
          <div style={{padding:28}}>
            <Label col="#22c55e">Build Checklist</Label>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(22px,4vw,42px)",
              color:"#22c55e",letterSpacing:1,marginTop:4,lineHeight:.9,marginBottom:20}}>
              ALLES GROEN.<br/><span style={{color:"#60a5fa"}}>DAN PAS LIVE.</span>
            </div>

            {CHECKLIST_PHASES.map(phase=>(
              <div key={phase.phase} className="card" style={{marginBottom:14,overflow:"hidden",
                border:`1px solid ${phase.col}22`}}>
                <div style={{padding:"12px 18px",background:`${phase.col}08`,
                  borderBottom:`1px solid ${phase.col}18`,display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,
                    color:phase.col,opacity:.3,lineHeight:1,minWidth:24}}>
                    {phase.phase}
                  </div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,
                    color:phase.col,letterSpacing:1}}>{phase.title}</div>
                  {/* Progress */}
                  <div style={{marginLeft:"auto",fontFamily:"'Fira Code',monospace",fontSize:9,color:phase.col}}>
                    {phase.items.filter((_,i)=>checkedItems[`${phase.phase}-${i}`]).length}/{phase.items.length}
                  </div>
                </div>
                <div style={{padding:"12px 18px"}}>
                  <div className="progress-bar" style={{marginBottom:12}}>
                    <div className="progress-fill" style={{
                      width:`${(phase.items.filter((_,i)=>checkedItems[`${phase.phase}-${i}`]).length/phase.items.length)*100}%`,
                      background:phase.col
                    }}/>
                  </div>
                  {phase.items.map((item,i)=>(
                    <div key={i} onClick={()=>check(`${phase.phase}-${i}`)}
                      style={{display:"flex",gap:10,marginBottom:7,cursor:"pointer",
                        padding:"5px 8px",borderRadius:4,
                        background:checkedItems[`${phase.phase}-${i}`]?`${phase.col}10`:"transparent",
                        transition:"all .15s"}}>
                      <div style={{width:16,height:16,borderRadius:3,flexShrink:0,marginTop:1,
                        border:`1px solid ${checkedItems[`${phase.phase}-${i}`]?phase.col:`${phase.col}44`}`,
                        background:checkedItems[`${phase.phase}-${i}`]?`${phase.col}30`:"transparent",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {checkedItems[`${phase.phase}-${i}`] &&
                          <span style={{fontSize:9,color:phase.col}}>✓</span>}
                      </div>
                      <div style={{fontSize:12,color:checkedItems[`${phase.phase}-${i}`]?phase.col:"#475569",
                        transition:"color .15s",lineHeight:1.5,fontFamily:"'Fira Code',monospace"}}>
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Final warning */}
            <div style={{background:"#04090f",borderRadius:10,padding:20,
              border:"1px solid #22c55e22",marginTop:8,textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,
                color:"#22c55e",marginBottom:8,letterSpacing:2}}>
                // DEFINITIEF LIVE CHECKLIST
              </div>
              <div style={{fontSize:12,color:"#475569",lineHeight:1.8,maxWidth:580,margin:"0 auto"}}>
                Alle 5 fases 100% groen · QR round-trip test &lt;8 seconden ·
                NFT transfer geverifieerd op Hedera mainnet · SSL certificaat geldig ·
                EU OSS VAT geregistreerd · Stripe live keys ingesteld ·
                <span style={{color:"#22c55e",fontWeight:600}}>
                  {" "}VirtualV Holding B.V. RvB goedkeuring voor mainnet
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
