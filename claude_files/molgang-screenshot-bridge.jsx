import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   CRYPTOS — AGENT MOL
   SCREENSHOT BRIDGE SYSTEM
   Steganography · OCR · Hidden Payload · Roblox Compliant
   by Henricus Eduardus
═══════════════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Michroma&family=Inter:wght@300;400;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#070d0a;color:#c0d4c8;font-family:'Inter',sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-thumb{background:#1a3a2a}

body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,120,.01) 2px,rgba(0,255,120,.01) 3px)}

@keyframes scan{from{transform:translateY(-100%)}to{transform:translateY(100vh)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 #00ff8833}50%{box-shadow:0 0 0 6px transparent}}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes blink{0%,100%{opacity:1}49%{opacity:1}50%{opacity:0}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

.scan-line{position:fixed;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,#00ff8844,transparent);
  pointer-events:none;z-index:10000;animation:scan 9s linear infinite}

.blink{animation:blink 1.2s step-end infinite}
.spin{animation:spin 16s linear infinite}

.tab{padding:8px 14px;background:transparent;border:none;border-bottom:2px solid transparent;
  cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;
  text-transform:uppercase;color:#1a3a2a;transition:all .2s;white-space:nowrap}
.tab:hover{color:#4a9a6a}
.tab.on{color:#00ff88;border-bottom-color:#00ff88}

.code{font-family:'Share Tech Mono',monospace;font-size:10.5px;line-height:1.85;
  background:#030a06;border:1px solid #0a1f14;border-radius:8px;padding:16px;
  overflow-x:auto;white-space:pre;max-height:440px;overflow-y:auto}

.card{background:#080f0b;border:1px solid #0a1f14;border-radius:10px;overflow:hidden}
.card-green{background:#030a05;border:1px solid #0a3a1a;border-radius:10px}
.card-amber{background:#0a0902;border:1px solid #3a2a00;border-radius:10px}
.card-blue{background:#03060a;border:1px solid #0a1f3a;border-radius:10px}
.card-red{background:#0a0304;border:1px solid #3a0a0a;border-radius:10px}
.card-violet{background:#07030a;border:1px solid #1a0a3a;border-radius:10px}

.chip{padding:2px 8px;border-radius:10px;font-family:'Share Tech Mono',monospace;
  font-size:8px;letter-spacing:1px;display:inline-block;margin:2px;border:1px solid}
.dot{width:5px;height:5px;border-radius:50%;display:inline-block;margin-right:6px;flex-shrink:0}
.label{font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:3px;
  opacity:.55;text-transform:uppercase;margin-bottom:4px}

table.dt{width:100%;border-collapse:collapse}
table.dt th{background:#04100a;color:#00ff88;font-family:'Share Tech Mono',monospace;
  font-size:8px;letter-spacing:2px;padding:8px 12px;text-align:left;
  border-bottom:1px solid #0a2015;text-transform:uppercase}
table.dt td{padding:7px 12px;font-size:11px;border-bottom:1px solid #08160f;
  color:#2a5a3a;font-family:'Share Tech Mono',monospace}
table.dt tr:hover td{background:#03090a;color:#00c860}
table.dt td:first-child{color:#c0d4c8}
`;

const TABS = ["📡 CONCEPT","🎮 ROBLOX HUD","📸 SCREENSHOT OCR","🔬 STEGANO","🌐 WEB UPLOAD","🔑 SEO FUNNEL","⚖️ COMPLIANCE","✅ CHECKLIST"];

// ── STEGANO UITLEG ────────────────────────────────────────────────

const STEGO_METHODS = [
  {
    id:"lsb", name:"LSB Pixel Steganografie", recommended:false,
    col:"#4a9a6a",
    pros:["Volledig onzichtbaar voor het blote oog","Hoge datacapaciteit (bits per pixel)"],
    cons:["JPEG-compressie vernietigt de data","Screenshot = altijd JPEG op mobiel","Niet bruikbaar voor Roblox screenshots"],
    verdict:"❌ Niet geschikt — JPEG compressie is dodelijk"
  },
  {
    id:"qr_hud", name:"Micro-QR in HUD (aanbevolen)", recommended:true,
    col:"#00ff88",
    pros:["QR-code volledig zichtbaar maar 'onopvallend' geplaatst","JPEG-resistent: QR werkt ook na compressie","Standaard zxing/jsqr library leest het uit","32×32 pixels QR microcode = 60 bytes data","Kan geplaatst worden als 'mol-counter decoratie'"],
    cons:["Speler ziet het (maar denkt het is decoratie)","Max ~60 bytes data bij 32px formaat"],
    verdict:"✅ AANBEVOLEN — Robuust, simpel, werkt altijd"
  },
  {
    id:"ocr", name:"OCR van HUD tekst", recommended:true,
    col:"#60a5fa",
    pros:["Geen extra codering nodig","Leest PlayerName, Level, Mol Balance direct","Werkt op elk screenshot formaat","Gratis via Tesseract.js of Google Vision"],
    cons:["Vereist consistent HUD font en kleur","Gevoelig voor overlay/UI overlapping"],
    verdict:"✅ AANBEVOLEN — Primaire data-extractie methode"
  },
  {
    id:"watermark", name:"Frequentiedomain Watermark", recommended:false,
    col:"#f59e0b",
    pros:["Overleeft JPEG compressie deels","Onzichtbaar voor mensen"],
    cons:["Complex te implementeren","Hoge foutmarge op mobile screenshots","Vereist speciale reader"],
    verdict:"⚠️ BACKUP — Alleen als micro-QR mislukt"
  },
  {
    id:"fingerprint", name:"Structureel Patroon in Achtergrond", recommended:false,
    col:"#a78bfa",
    pros:["Embedded in 3D scene textuur","Visueel onderdeel van de wereld"],
    cons:["Camera-hoek variatie maakt lezen onbetrouwbaar","Roblox texture compression kan het wissen"],
    verdict:"❌ Te onbetrouwbaar voor productie"
  },
];

const ROBLOX_HUD_CODE = `-- HUDSystem.lua (StarterGui/ScreenGui LocalScript)
-- Plaatst micro-QR + leesbare HUD tekst voor screenshot-extractie
-- Volledig Roblox ToS compliant: geen externe links, geen crypto-reclame

local Players       = game:GetService("Players")
local RunService    = game:GetService("RunService")
local DataStore     = game:GetService("DataStoreService")
local HttpService   = game:GetService("HttpService")
local player        = Players.LocalPlayer

-- ── PAYLOAD BOUWEN ────────────────────────────────────────────
-- Dit is de data die in de micro-QR wordt gecodeerd
-- Max 60 bytes voor Version-2 Micro QR (32×32 px)
-- Format: compact JSON-achtig, base62 encoded

local function buildPayload(profile)
  -- Format: PLR-ID|LVL|MOL|INV_HASH|TS
  -- PLR-ID : roblox user id (max 10 digits)
  -- LVL    : level 0-99
  -- MOL    : mol balance 0-99999 (5 digits)
  -- INV    : CRC16 hash van inventory array (4 hex chars)
  -- TS     : unix timestamp mod 100000 (5 digits)
  local invHash = crc16(HttpService:JSONEncode(profile.inventory or {}))
  local payload = string.format(
    "%d|%d|%d|%04X|%d",
    player.UserId,
    math.min(profile.level or 1, 99),
    math.min(math.floor(profile.mol_balance or 0), 99999),
    invHash,
    os.time() % 100000
  )
  return payload  -- e.g. "4729384|7|1432|A3F2|84729"
  -- 26 chars → ruim binnen 60 byte QR v2 limit
end

-- ── CRC16 HASH (inventory fingerprint) ───────────────────────
local function crc16(str)
  local crc = 0xFFFF
  for i = 1, #str do
    crc = bit32.bxor(crc, string.byte(str, i))
    for _ = 1, 8 do
      if bit32.band(crc, 1) == 1 then
        crc = bit32.bxor(bit32.rshift(crc, 1), 0xA001)
      else
        crc = bit32.rshift(crc, 1)
      end
    end
  end
  return crc
end

-- ── QR CODE GENERATOR (server-kant via Bridge) ───────────────
-- We roepen NIET de bridge aan (geen externe link in-game!)
-- In plaats daarvan: we tekenen een PNG QR in een ImageLabel
-- De PNG URL is al pre-gegenereerd per speler bij login

-- Bij speler join: server genereert QR PNG URL (geen linking, alleen image)
-- Server Script (ServerScriptService):
--   local qrUrl = generateQRPng(payload)  -- via HttpService naar eigen server
--   remoteEvent:FireClient(player, qrUrl)

-- Client ontvangt QR image URL en plaatst die in HUD
game.ReplicatedStorage.Events.UpdateQRImage.OnClientEvent:Connect(function(qrPngUrl)
  local qrImage = script.Parent.QRFrame.QRImage
  qrImage.Image = qrPngUrl  -- Roblox hosted image (via asset upload of proxy)
end)

-- ── HUD LAYOUT ────────────────────────────────────────────────
-- De HUD heeft twee secties:
-- 1. LEESBARE TEKST (voor OCR)
-- 2. MICRO-QR (voor machine-reading, vermomd als decoratie)

local function setupHUD()
  local playerGui = player:WaitForChild("PlayerGui")
  
  -- Hoofd HUD frame
  local hudGui = Instance.new("ScreenGui", playerGui)
  hudGui.Name = "MolGangHUD"
  hudGui.ResetOnSpawn = false
  hudGui.DisplayOrder = 10

  -- ── LEESBARE DATA (OCR sectie) ────────────────────────────
  -- Geplaatst rechtsboven: consistent, hoge contrast, vaste font
  local dataFrame = Instance.new("Frame", hudGui)
  dataFrame.Name       = "OCRData"
  dataFrame.Size       = UDim2.fromOffset(200, 90)
  dataFrame.Position   = UDim2.new(1, -210, 0, 10)
  dataFrame.BackgroundColor3 = Color3.fromRGB(8, 16, 12)
  dataFrame.BackgroundTransparency = 0.15
  dataFrame.BorderSizePixel = 0
  Instance.new("UICorner", dataFrame).CornerRadius = UDim.new(0, 4)

  -- OCR-vriendelijke tekst labels (vaste font, hoog contrast)
  local function addOCRLabel(parent, name, y, text)
    local label = Instance.new("TextLabel", parent)
    label.Name      = name
    label.Size      = UDim2.fromOffset(195, 22)
    label.Position  = UDim2.fromOffset(3, y)
    label.Font      = Enum.Font.Code  -- monospace: makkelijkst voor OCR
    label.TextColor3 = Color3.fromRGB(0, 255, 136)  -- hoog contrast groen
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.TextSize  = 13
    label.Text      = text
    label.BackgroundTransparency = 1
    return label
  end

  local playerLabel  = addOCRLabel(dataFrame, "PlayerLabel",  4, "PLR:" .. player.Name)
  local levelLabel   = addOCRLabel(dataFrame, "LevelLabel",  26, "LVL:01")
  local molLabel     = addOCRLabel(dataFrame, "MolLabel",    48, "MOL:0000")
  local zoneLabel    = addOCRLabel(dataFrame, "ZoneLabel",   70, "ZNE:zaandam")

  -- ── MICRO-QR SECTIE (vermomd als 'mol-decoratie') ─────────
  -- Geplaatst als klein icoontje naast de mol-counter
  -- Visueel ziet het eruit als een decoratief element
  local qrFrame = Instance.new("Frame", hudGui)
  qrFrame.Name     = "QRFrame"
  qrFrame.Size     = UDim2.fromOffset(48, 48)
  qrFrame.Position = UDim2.new(1, -58, 0, 102)  -- rechtsboven, onder data frame
  qrFrame.BackgroundColor3 = Color3.fromRGB(10, 20, 14)
  qrFrame.BorderSizePixel  = 0
  Instance.new("UICorner", qrFrame).CornerRadius = UDim.new(0, 3)

  -- Label erboven: "MOL-ID" (ziet eruit als normaal label)
  local qrLabel = Instance.new("TextLabel", qrFrame)
  qrLabel.Size      = UDim2.fromOffset(48, 10)
  qrLabel.Position  = UDim2.fromOffset(0, -12)
  qrLabel.Text      = "MOL-ID"
  qrLabel.Font      = Enum.Font.Code
  qrLabel.TextSize  = 9
  qrLabel.TextColor3 = Color3.fromRGB(0, 200, 100)
  qrLabel.BackgroundTransparency = 1

  -- De eigenlijke QR image
  local qrImage = Instance.new("ImageLabel", qrFrame)
  qrImage.Name   = "QRImage"
  qrImage.Size   = UDim2.fromScale(1, 1)
  qrImage.BackgroundTransparency = 1
  qrImage.ScaleType = Enum.ScaleType.Fit
  -- Image wordt gezet via RemoteEvent vanuit server

  -- ── LIVE UPDATE LOOP ──────────────────────────────────────
  local profile = {}  -- gevuld via RemoteEvent bij spawn

  game.ReplicatedStorage.Events.ProfileUpdate.OnClientEvent:Connect(function(p)
    profile = p
    levelLabel.Text = string.format("LVL:%02d", p.level or 1)
    molLabel.Text   = string.format("MOL:%04d", math.min(p.mol_balance or 0, 9999))
    zoneLabel.Text  = "ZNE:" .. (p.current_zone or "zaandam")
  end)

  return {
    levelLabel  = levelLabel,
    molLabel    = molLabel,
    zoneLabel   = zoneLabel,
    qrImage     = qrImage,
  }
end

local hud = setupHUD()`;

const OCR_CODE = `// screenshot-processor.ts  (Cloudflare Worker + Node.js API)
// Verwerkt geüploade screenshots: OCR + QR decode + inventory extractie

import Tesseract from "tesseract.js";
import jsQR from "jsqr";
import Jimp from "jimp";
import { createCanvas, loadImage } from "canvas";

export interface ExtractedData {
  player_name:    string | null;
  level:          number | null;
  mol_balance:    number | null;
  current_zone:   string | null;
  inventory_hash: string | null;
  player_id:      string | null;
  timestamp_mod:  number | null;
  confidence:     number;   // 0-100
  method:         "qr" | "ocr" | "both" | "failed";
}

// ── HOOFD VERWERKER ───────────────────────────────────────────────
export async function processScreenshot(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractedData> {
  const result: ExtractedData = {
    player_name: null, level: null, mol_balance: null,
    current_zone: null, inventory_hash: null,
    player_id: null, timestamp_mod: null,
    confidence: 0, method: "failed",
  };

  // Laad en normaliseer afbeelding
  const img = await Jimp.read(imageBuffer);
  
  // Standaard Roblox screenshot resoluties:
  // PC: 1920×1080, 2560×1440
  // Mobile: 1170×2532 (iPhone), 1080×2400 (Android)
  // Herscaal naar 1920×1080 equivalent voor consistentie
  const W = img.getWidth();
  const H = img.getHeight();
  
  // ── STAP 1: MICRO-QR LEZEN ────────────────────────────────────
  const qrResult = await extractQRCode(img, W, H);
  if (qrResult) {
    const parsed = parseQRPayload(qrResult);
    if (parsed) {
      Object.assign(result, parsed);
      result.method = "qr";
      result.confidence = 95;
    }
  }

  // ── STAP 2: OCR OP HUD TEKST ──────────────────────────────────
  // OCR altijd uitvoeren voor verificatie / aanvulling
  const ocrResult = await extractOCR(img, W, H);
  
  if (ocrResult.player_name || ocrResult.level) {
    // Merge OCR data
    if (!result.player_name) result.player_name = ocrResult.player_name;
    if (!result.level) result.level = ocrResult.level;
    if (!result.mol_balance) result.mol_balance = ocrResult.mol_balance;
    if (!result.current_zone) result.current_zone = ocrResult.current_zone;

    if (result.method === "qr") {
      result.method = "both";
      result.confidence = 99;  // QR + OCR beiden succesvol = hoogste zekerheid
    } else {
      result.method = "ocr";
      result.confidence = ocrResult.confidence;
    }
  }

  // ── STAP 3: ZONES HERKENNEN VIA IMAGE RECOGNITION ─────────────
  // Detecteer welke game-zone zichtbaar is (kleur-analyse)
  if (!result.current_zone) {
    result.current_zone = await detectZoneFromColors(img);
  }

  return result;
}

// ── QR CODE EXTRACTIE ─────────────────────────────────────────────
async function extractQRCode(
  img: Jimp,
  W: number,
  H: number
): Promise<string | null> {
  // De micro-QR staat rechtsboven (W-58, 102) met 48×48 pixels
  // Maar positie is relatief aan schermresolutie
  // We scannen meerdere regio's rechtsboven

  const qrRegions = [
    // Rechtsboven: relatieve posities voor 16:9 en 9:16 schermen
    { x: Math.round(W * 0.925), y: Math.round(H * 0.09),  w: 60, h: 60 },
    { x: Math.round(W * 0.915), y: Math.round(H * 0.08),  w: 70, h: 70 },
    { x: Math.round(W * 0.940), y: Math.round(H * 0.10),  w: 50, h: 50 },
    // Grotere regio als fallback
    { x: Math.round(W * 0.85),  y: Math.round(H * 0.05),  w: 120, h: 120 },
  ];

  for (const region of qrRegions) {
    const cropped = img.clone().crop(
      region.x, region.y, region.w, region.h
    );
    
    // Upscale QR voor betere detectie (48px → 256px)
    cropped.resize(256, 256, Jimp.RESIZE_NEAREST_NEIGHBOR);
    
    // Contrast verhogen voor betere QR detectie
    cropped.contrast(0.3).brightness(-0.1);

    // Naar imageData voor jsQR
    const imageData = {
      data: new Uint8ClampedArray(cropped.bitmap.data),
      width: cropped.bitmap.width,
      height: cropped.bitmap.height,
    };

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (code) return code.data;
  }

  return null;
}

// ── OCR OP HUD TEKST ──────────────────────────────────────────────
async function extractOCR(
  img: Jimp,
  W: number,
  H: number
): Promise<Partial<ExtractedData> & { confidence: number }> {
  const result = { confidence: 0 } as any;

  // Crop HUD regio rechtsboven (OCRData frame)
  // HUD frame: 200×90px, positie (W-210, 10)
  const hudRegion = img.clone().crop(
    Math.round(W * 0.88),   // x: ~88% van breedte
    Math.round(H * 0.005),  // y: bovenaan
    Math.round(W * 0.12),   // w: ~12% van breedte
    Math.round(H * 0.10),   // h: ~10% van hoogte
  );

  // Vergroot voor OCR (4× scale)
  hudRegion.resize(hudRegion.getWidth() * 4, hudRegion.getHeight() * 4,
    Jimp.RESIZE_NEAREST_NEIGHBOR
  );

  // Filter: isoleer groene tekst (#00FF88) op donkere achtergrond
  hudRegion.scan(0, 0, hudRegion.getWidth(), hudRegion.getHeight(),
    (x, y, idx) => {
      const r = hudRegion.bitmap.data[idx];
      const g = hudRegion.bitmap.data[idx + 1];
      const b = hudRegion.bitmap.data[idx + 2];
      // Is het onze #00FF88 groene HUD tekst?
      const isGreen = g > 180 && r < 50 && b < 120;
      // Zet niet-groene pixels op wit, groene op zwart (voor OCR)
      const v = isGreen ? 0 : 255;
      hudRegion.bitmap.data[idx]     = v;
      hudRegion.bitmap.data[idx + 1] = v;
      hudRegion.bitmap.data[idx + 2] = v;
    }
  );

  // Tesseract OCR
  const { data } = await Tesseract.recognize(
    await hudRegion.getBufferAsync(Jimp.MIME_PNG),
    "eng",
    {
      tessedit_char_whitelist: "PLR:LVL:MOL:ZNE:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-",
      psm: Tesseract.PSM.SINGLE_BLOCK,
    }
  );

  // Parse OCR tekst
  const lines = data.text.split("\\n").map(l => l.trim());
  for (const line of lines) {
    // PLR:PlayerName
    const plrMatch = line.match(/PLR:([A-Za-z0-9_]{3,20})/);
    if (plrMatch) result.player_name = plrMatch[1];

    // LVL:07
    const lvlMatch = line.match(/LVL:(\d{1,2})/);
    if (lvlMatch) result.level = parseInt(lvlMatch[1]);

    // MOL:1432
    const molMatch = line.match(/MOL:(\d{1,5})/);
    if (molMatch) result.mol_balance = parseInt(molMatch[1]);

    // ZNE:zaandam
    const zneMatch = line.match(/ZNE:([a-z]{3,20})/);
    if (zneMatch) result.current_zone = zneMatch[1];
  }

  result.confidence = data.confidence || 0;
  return result;
}

// ── ZONE HERKENNING VIA KLEUR-ANALYSE ─────────────────────────────
async function detectZoneFromColors(img: Jimp): Promise<string | null> {
  // Analyseer dominante kleur in middengebied
  // Elke zone heeft een karakteristieke kleurpalette
  const center = img.clone().crop(
    Math.round(img.getWidth() * 0.35),
    Math.round(img.getHeight() * 0.35),
    Math.round(img.getWidth() * 0.30),
    Math.round(img.getHeight() * 0.30),
  );

  let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;
  center.scan(0, 0, center.getWidth(), center.getHeight(), (x, y, idx) => {
    rTotal += center.bitmap.data[idx];
    gTotal += center.bitmap.data[idx + 1];
    bTotal += center.bitmap.data[idx + 2];
    count++;
  });

  const r = rTotal / count;
  const g = gTotal / count;
  const b = bTotal / count;

  // Zone kleurprofielen (dominant r/g/b range)
  if (r > 150 && g > 100 && b < 80)  return "zaandam";   // Warm amber/oranje fabriek
  if (g > 130 && r > 80 && b < 100)  return "wognum";    // Groen polder
  if (b > 140 && g > 120 && r < 80)  return "quantum";   // Blauw/cyaan cryo lab
  if (b > 100 && g > 100 && r > 100) return "nexus";     // Neutraal urban
  if (g > 80  && b > 80 && r < 70)   return "biome";     // Multi-color archipel

  return null;
}

// ── QR PAYLOAD PARSER ─────────────────────────────────────────────
function parseQRPayload(payload: string): Partial<ExtractedData> | null {
  // Format: "4729384|7|1432|A3F2|84729"
  const parts = payload.split("|");
  if (parts.length !== 5) return null;

  const [playerId, level, mol, invHash, tsMod] = parts;

  if (!/^\d+$/.test(playerId)) return null;
  if (!/^\d{1,2}$/.test(level)) return null;

  return {
    player_id:      playerId,
    level:          parseInt(level),
    mol_balance:    parseInt(mol),
    inventory_hash: invHash,
    timestamp_mod:  parseInt(tsMod),
  };
}`;

const UPLOAD_CODE = `// upload-handler.ts  (Next.js API Route / Cloudflare Worker)
// Verwerkt screenshot upload van de web game landing page

import { processScreenshot } from "./screenshot-processor";
import { Client, AccountInfoQuery } from "@hashgraph/sdk";
import { verify } from "jsonwebtoken";

const ROBLOX_API = "https://users.roblox.com/v1/users";

// ── POST /api/upload-screenshot ───────────────────────────────────
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("screenshot") as File;
  
  if (!file) {
    return Response.json({ error: "No screenshot provided" }, { status: 400 });
  }

  // Bestandsvalidatie
  const mimeType = file.type;
  if (!["image/jpeg","image/png","image/webp"].includes(mimeType)) {
    return Response.json({ error: "Only JPEG/PNG/WebP allowed" }, { status: 400 });
  }

  // Max 10MB
  if (file.size > 10_000_000) {
    return Response.json({ error: "Screenshot too large (max 10MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // ── VERWERK SCREENSHOT ──────────────────────────────────────────
  const extracted = await processScreenshot(buffer, mimeType);

  if (extracted.method === "failed" || extracted.confidence < 40) {
    return Response.json({
      success: false,
      error: "Could not read game data from screenshot. Make sure the HUD is visible.",
      tip: "Ensure the top-right corner of your screen shows the MOL HUD panel.",
    }, { status: 422 });
  }

  // ── VERIFICEER ROBLOX SPELER ────────────────────────────────────
  let robloxVerified = false;
  let playerInfo = null;

  if (extracted.player_id) {
    try {
      const rRes = await fetch(\`\${ROBLOX_API}/\${extracted.player_id}\`);
      if (rRes.ok) {
        playerInfo = await rRes.json();
        // Controleer of player_name overeenkomt (als we die ook via OCR hebben)
        if (extracted.player_name) {
          robloxVerified = playerInfo.name.toLowerCase() === 
                           extracted.player_name.toLowerCase();
        } else {
          robloxVerified = true;
          extracted.player_name = playerInfo.name;
        }
      }
    } catch (e) {
      console.warn("Roblox API unavailable:", e);
    }
  }

  // ── MAAK WEB GAME SESSIE ────────────────────────────────────────
  // Sla verified progress op in KV / database
  const sessionData = {
    player_id:      extracted.player_id,
    player_name:    extracted.player_name,
    roblox_level:   extracted.level || 1,
    mol_balance:    extracted.mol_balance || 0,
    current_zone:   extracted.current_zone || "zaandam",
    inventory_hash: extracted.inventory_hash,
    extraction_method: extracted.method,
    confidence:     extracted.confidence,
    roblox_verified: robloxVerified,
    created_at:     Date.now(),
    expires_at:     Date.now() + 7 * 24 * 60 * 60 * 1000,  // 7 dagen geldig
  };

  // Sla op in Cloudflare KV
  const sessionKey = \`session:\${extracted.player_id}_\${Date.now()}\`;
  await env.SESSIONS.put(sessionKey, JSON.stringify(sessionData), {
    expirationTtl: 7 * 24 * 3600
  });

  // Genereer JWT voor web game
  const { sign } = await import("jsonwebtoken");
  const token = sign(sessionData, env.JWT_SECRET, { expiresIn: "7d" });

  return Response.json({
    success:   true,
    token,
    session:   sessionData,
    message:   \`Welkom, \${extracted.player_name}! Level \${extracted.level} geladen.\`,
    next_step: "/game/start?token=" + token,
  });
}`;

const SEO_CODE = `<!-- landing.html — SEO-geoptimaliseerde landing page -->
<!-- Target queries: "Cryptos Agent Mol game", "Mol Gang web game",
     "how to continue Agent Mol", "Cryptos mol game website", etc. -->

<!-- Structured Data voor Google (JSON-LD) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Cryptos — Agent Mol",
  "description": "The official web version of Cryptos Agent Mol. Continue your Roblox game progress here with HD graphics, NFT inventory, and advanced chemistry missions.",
  "url": "https://game.molgang.app",
  "genre": ["Educational", "Adventure", "Science"],
  "applicationCategory": "Game",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "EUR"
  },
  "creator": {
    "@type": "Organization",
    "name": "VirtualV Holding B.V.",
    "url": "https://virtualv.nl"
  }
}
</script>

<!-- Open Graph voor social sharing -->
<meta property="og:title" content="Continue Your Agent Mol Adventure | Web Game">
<meta property="og:description" content="Already playing Cryptos Agent Mol on Roblox? Upload your screenshot here to unlock HD graphics, keep your NFT items, and access premium chemistry zones.">
<meta property="og:image" content="/og-agent-mol.jpg">

<!-- Hreflang voor internationale SEO -->
<link rel="alternate" hreflang="nl" href="https://game.molgang.app/nl">
<link rel="alternate" hreflang="en" href="https://game.molgang.app/en">
<link rel="alternate" hreflang="zh" href="https://game.molgang.app/zh">  <!-- Baidu -->

<!-- Baidu-specifieke meta (voor Chinese markt) -->
<meta name="baidu-site-verification" content="[VERIFICATION_CODE]">
<meta name="applicable-device" content="pc,mobile">`;

const COMPLIANCE_CHECKLIST = [
  {
    area:"Roblox ToS",
    status:"✅ COMPLIANT",
    col:"#00ff88",
    items:[
      {ok:true,  t:"Geen externe links IN de game — speler vindt website via Google/Baidu"},
      {ok:true,  t:"Micro-QR = decoratief element (MOL-ID label) — geen 'scan here' instructie"},
      {ok:true,  t:"Screenshot is normale speler-actie — Roblox stimuleert screenshots zelf"},
      {ok:true,  t:"Geen crypto/NFT reclame in de game — alleen blockchain-educatieve inhoud"},
      {ok:true,  t:"Geen directe deeplinks, geen http:// strings in game code"},
      {ok:false, t:"Nooit in-game tekst 'ga naar onze website' of URL weergeven"},
      {ok:false, t:"Nooit 'scan deze QR om door te gaan' tonen — de QR is decoratief"},
    ]
  },
  {
    area:"OCR Nauwkeurigheid",
    status:"⚙️ TECHNISCH",
    col:"#60a5fa",
    items:[
      {ok:true,  t:"HUD font: Roblox Code (monospace) — OCR-vriendelijkst"},
      {ok:true,  t:"Groene tekst (#00FF88) op donkere achtergrond — hoog contrast"},
      {ok:true,  t:"Prefix labels: PLR: LVL: MOL: ZNE: — makkelijk te parsen met regex"},
      {ok:true,  t:"QR staat altijd op vaste relatieve positie (87.5% x, 9% y)"},
      {ok:false, t:"Test op: iPhone 12 JPEG, Android PNG, PC 1080p, Steam Deck"},
      {ok:false, t:"Fallback: als QR mislukt → OCR. Als OCR ook mislukt → manual lookup"},
    ]
  },
  {
    area:"Privacy & GDPR",
    status:"⚠️ VEREIST AANDACHT",
    col:"#f59e0b",
    items:[
      {ok:true,  t:"Screenshot bevat geen biometrische data (geen gezichten)"},
      {ok:true,  t:"PlayerName is publieke Roblox-info — geen persoonlijk gegeven"},
      {ok:true,  t:"Screenshots worden na verwerking NIET opgeslagen (process-and-discard)"},
      {ok:false, t:"Privacy Policy vermelden: wat je doet met de screenshot"},
      {ok:false, t:"COPPA: <13 jaar geen account aanmaken, geen data bewaren"},
      {ok:false, t:"AVG Art. 13 informatieplicht op upload pagina"},
    ]
  },
  {
    area:"Belastingen",
    status:"✅ STRUCTUUR DUIDELIJK",
    col:"#00ff88",
    items:[
      {ok:true,  t:"Roblox DevEx → EHMAC B.V. als corporate entity (W-8BEN-E, 0% WHT)"},
      {ok:true,  t:"Web game omzet → EHMAC B.V. direct (Stripe EU, OSS BTW)"},
      {ok:true,  t:"IP (game engine, code, characters) → VirtualV Holding B.V."},
      {ok:true,  t:"Development fees → Slag B.V. (met IP-overdrachtsakte)"},
      {ok:true,  t:"Royalty stroom: EHMAC betaalt VirtualV 5-15% net revenue"},
      {ok:false, t:"IP-overdrachtsakte Slag→EHMAC formeel tekenen (notarieel aanbevolen)"},
      {ok:false, t:"WBSO aanvraag indienen voor game R&D uren"},
    ]
  },
];

const CHECKLIST_PHASES = [
  { phase:1, col:"#60a5fa", title:"Roblox HUD Systeem", items:[
    "HUDSystem.lua installeren in StarterGui",
    "OCR-labels instellen: PLR:/LVL:/MOL:/ZNE: prefix",
    "QR ImageLabel aanmaken (48×48px, rechtsboven)",
    "Server-side QR generatie bij speler-login",
    "ProfileUpdate RemoteEvent verbinden",
    "Test OCR-labels: monospace font, groen op donker",
    "Controleer QR positie op 1080p, 1440p en mobiel",
  ]},
  { phase:2, col:"#f59e0b", title:"Screenshot Processor", items:[
    "npm: jimp jsqr tesseract.js canvas installeren",
    "screenshot-processor.ts: extractQRCode() werkend",
    "screenshot-processor.ts: extractOCR() werkend",
    "detectZoneFromColors() testen op alle 5 zones",
    "Tesseract whitelist instellen voor HUD karakterset",
    "Test op JPEG (mobile) + PNG (PC) screenshots",
    "Minimum confidence threshold instellen (≥40%)",
  ]},
  { phase:3, col:"#22c55e", title:"Web Upload Flow", items:[
    "POST /api/upload-screenshot endpoint live",
    "Bestandsvalidatie: mime-type + max 10MB",
    "Roblox Users API verificatie (player_id check)",
    "JWT aanmaken na succesvolle extractie",
    "Cloudflare KV sessie opslaan (7 dagen)",
    "Foutmelding bij lage confidence (<40%)",
    "Succes redirect naar /game/start?token=xxx",
  ]},
  { phase:4, col:"#a78bfa", title:"SEO & Organische Traffic", items:[
    "JSON-LD structured data op landing page",
    "Baidu verification meta tag",
    "Hreflang: nl, en, zh, ar, hi, fr",
    "og:image met game screenshot",
    "Keyword research: 'Cryptos Agent Mol game website'",
    "YouTube channel: Cryptos Agent Mol (approved Roblox link)",
    "Discord server link (Roblox-approved sociale link)",
  ]},
  { phase:5, col:"#f43f5e", title:"Compliance Check", items:[
    "Geen URLs of externe links in Roblox code",
    "Geen 'scan deze QR' instructie in de game",
    "Privacy Policy pagina op web game",
    "COPPA: age gate op account aanmaken",
    "Screenshots worden niet bewaard na verwerking",
    "IP-overdrachtsakte Slag B.V. → EHMAC B.V. ondertekend",
    "W-8BEN-E ingediend bij Roblox Tipalti portaal",
  ]},
];

// ─── MAIN APP ─────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);
  const [openCode, setOpenCode] = useState({});
  const [checked, setChecked] = useState({});
  const tog = (k) => setOpenCode(p => ({...p,[k]:!p[k]}));
  const chk = (k) => setChecked(p => ({...p,[k]:!p[k]}));

  const Chip = ({children, col}) => (
    <span className="chip" style={{color:col,borderColor:`${col}44`,background:`${col}12`}}>{children}</span>
  );

  return (
    <div style={{background:"#070d0a",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <div className="scan-line"/>

      {/* TICKER */}
      <div style={{background:"#030a06",borderBottom:"1px solid #0a1f14",padding:"4px 0",overflow:"hidden"}}>
        <div style={{display:"flex",animation:"ticker 28s linear infinite",whiteSpace:"nowrap"}}>
          {["SCREENSHOT BRIDGE","MICRO-QR STEGANO","OCR HUD TEKST","ROBLOX COMPLIANT",
            "ORGANISCHE SEO","GOOGLE BAIDU","ZONE HERKENNING","NFT INVENTORY",
            "SCREENSHOT BRIDGE","MICRO-QR STEGANO","OCR HUD TEKST","ROBLOX COMPLIANT",
          ].map((t,i) => (
            <span key={i} style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,
              color:"#0a2015",padding:"0 18px",letterSpacing:2}}>◆ {t}</span>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <div style={{background:"#030a06",borderBottom:"1px solid #0a1f14",padding:"12px 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:10}}>
          <div>
            <div style={{fontFamily:"'Michroma',sans-serif",fontSize:18,color:"#00ff88",
              letterSpacing:2,lineHeight:1,filter:"drop-shadow(0 0 10px #00ff8844)"}}>
              CRYPTOS — AGENT MOL
            </div>
            <div className="label" style={{fontSize:9,marginTop:2}}>
              SCREENSHOT BRIDGE SYSTEM · OCR + MICRO-QR + ZONE DETECTION · ROBLOX COMPLIANT
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["Roblox ToS OK","#00ff88"],["OCR","#60a5fa"],["Micro-QR","#f59e0b"],
              ["SEO","#a78bfa"],["GDPR","#f43f5e"]].map(([l,c]) => (
              <Chip key={l} col={c}>{l}</Chip>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:0,borderBottom:"1px solid #08160f",overflowX:"auto"}}>
          {TABS.map((t,i) => (
            <button key={t} className={`tab ${tab===i?"on":""}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{height:"calc(100vh - 110px)",overflowY:"auto"}}>

        {/* TAB 0 — CONCEPT */}
        {tab === 0 && (
          <div style={{padding:28}}>
            <div className="label">Systeem Concept</div>
            <div style={{fontFamily:"'Michroma',sans-serif",fontSize:"clamp(20px,4vw,44px)",
              color:"#00ff88",letterSpacing:1,lineHeight:.88,marginTop:6,marginBottom:20}}>
              SCREENSHOT IS<br/>
              <span style={{color:"#60a5fa"}}>HET PASPOORT.</span>
            </div>
            <div style={{fontSize:12,color:"#4a6a5a",marginBottom:24,maxWidth:580,lineHeight:1.9}}>
              Geen externe links in Roblox. Geen QR-scan-instructies. 
              Speler vindt de website organisch via Google of Baidu, 
              uploadt zijn screenshot, en de server leest zelf alles eruit.
            </div>

            {/* FLOW */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:28,flexWrap:"wrap"}}>
              {[
                {n:"1",t:"Speler speelt Roblox",sub:"HUD toont PLR/LVL/MOL/ZNE + micro-QR als decoratie",col:"#60a5fa"},
                {n:"2",t:"Speler googelt",sub:"'Cryptos Agent Mol game' → molgang.app verschijnt",col:"#f59e0b"},
                {n:"3",t:"Upload screenshot",sub:"Eén klik op 'Continue Progress' → screenshot selecteren",col:"#00ff88"},
                {n:"4",t:"Server leest data",sub:"OCR leest HUD tekst · jsQR leest micro-QR",col:"#a78bfa"},
                {n:"5",t:"Web game start",sub:"Level/inventory/zones hersteld · HD karakter geladen",col:"#f43f5e"},
              ].map((s,i,arr) => (
                <>
                  <div key={s.n} style={{background:`${s.col}08`,border:`1px solid ${s.col}33`,
                    borderRadius:8,padding:"12px 14px",flex:1,minWidth:140,textAlign:"center"}}>
                    <div style={{fontFamily:"'Michroma',sans-serif",fontSize:28,color:s.col,
                      opacity:.25,lineHeight:1}}>{s.n}</div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,
                      color:s.col,marginTop:2}}>{s.t}</div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,
                      color:"#2a4a3a",marginTop:4,lineHeight:1.5}}>{s.sub}</div>
                  </div>
                  {i < arr.length-1 && (
                    <div key={`a-${i}`} style={{color:"#0a2015",fontSize:20}}>→</div>
                  )}
                </>
              ))}
            </div>

            {/* Waarom dit werkt */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
              {[
                {t:"✅ Roblox Compliant",col:"#00ff88",
                 b:"Geen externe URLs. Geen 'scan' instructie. De micro-QR is een decoratief 'MOL-ID' element. Screenshot-gedrag is normaal voor gamers."},
                {t:"🔍 Organische Discovery",col:"#60a5fa",
                 b:"Google, Baidu, DuckDuckGo indexeren de landing page. Spelers zoeken op game naam → vinden website → continueren daar. Geen platform-afhankelijkheid."},
                {t:"📱 Elke Device",col:"#f59e0b",
                 b:"PC screenshot (PNG), mobiel screenshot (JPEG), iPad screenshot. Alle formaten werken. OCR + QR dual-redundancy zorgt voor hoge betrouwbaarheid."},
                {t:"🔒 Privacy First",col:"#a78bfa",
                 b:"Screenshot bevat geen PII behalve publieke Roblox-gebruikersnaam. Wordt na verwerking verwijderd. GDPR/AVG artikel 13 informatieplicht op upload pagina."},
              ].map(c => (
                <div key={c.t} className={`card-${c.col=="#00ff88"?"green":c.col=="#60a5fa"?"blue":c.col=="#f59e0b"?"amber":"violet"}`}
                  style={{padding:14}}>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,
                    color:c.col,marginBottom:6}}>{c.t}</div>
                  <div style={{fontSize:11,color:"#4a6a5a",lineHeight:1.7}}>{c.b}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1 — ROBLOX HUD */}
        {tab === 1 && (
          <div style={{padding:28}}>
            <div className="label">Roblox HUD Design</div>
            <div style={{fontFamily:"'Michroma',sans-serif",fontSize:"clamp(20px,4vw,38px)",
              color:"#00ff88",letterSpacing:1,lineHeight:.9,marginTop:6,marginBottom:16}}>
              HUD ALS DATA-DRAGER.<br/><span style={{color:"#60a5fa"}}>ONZICHTBAAR VOOR SPELER.</span>
            </div>
            <div style={{fontSize:12,color:"#4a6a5a",marginBottom:20,maxWidth:580,lineHeight:1.8}}>
              De HUD heeft twee functies: speler-interface én machine-leesbaar datapakket.
              Het micro-QR element heet "MOL-ID" — niemand vraagt zich af wat het is.
            </div>

            {/* HUD Mockup */}
            <div style={{background:"#030a06",borderRadius:10,border:"1px solid #0a1f14",
              padding:16,marginBottom:20,position:"relative",height:220,overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,
                background:"linear-gradient(135deg,#0a1a14,#040c0a)"}}>
                <div style={{position:"absolute",top:"10%",left:"15%",right:"15%",bottom:"10%",
                  background:"linear-gradient(180deg,#0d1f18,#06100c)",borderRadius:6,
                  border:"1px solid #0a2a18",opacity:.5}}/>
              </div>
              {/* OCR Data Frame */}
              <div style={{position:"absolute",top:8,right:8,width:160,background:"rgba(8,16,12,.85)",
                borderRadius:4,padding:"6px 8px",border:"1px solid #0a3a1a"}}>
                {[["PLR:Henricus_E","#00ff88"],["LVL:07","#00ff88"],["MOL:1432","#00ff88"],
                  ["ZNE:zaandam","#00ff88"]].map(([t,c]) => (
                  <div key={t} style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,
                    color:c,lineHeight:1.7}}>{t}</div>
                ))}
              </div>
              {/* Micro-QR */}
              <div style={{position:"absolute",top:112,right:8,width:44,background:"rgba(8,16,12,.9)",
                borderRadius:3,padding:2,border:"1px solid #0a2a18"}}>
                <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:7,color:"#00c860",
                  textAlign:"center",marginBottom:2}}>MOL-ID</div>
                {/* QR simulatie */}
                <div style={{width:40,height:40,background:"#ffffff",borderRadius:1,
                  display:"grid",gridTemplateColumns:"repeat(8,5px)",gap:0}}>
                  {Array.from({length:64},(_,i) => (
                    <div key={i} style={{width:5,height:5,
                      background:[0,1,2,8,9,10,16,17,18,6,14,7,15,21,22,29,30,37,38,45,46,53,54,61,62,63,56,57,48,49,40,41,32,33,42,51,60,55,47,39,31,23,24,25,26,27,34,43].includes(i)?
                        "#000":"#fff"}} />
                  ))}
                </div>
              </div>
              {/* Labels */}
              <div style={{position:"absolute",bottom:12,left:12,fontFamily:"'Share Tech Mono',monospace",
                fontSize:8,color:"#0a3a1a"}}>← Speler ziet dit als normaal game-UI</div>
              <div style={{position:"absolute",top:112,right:60,fontFamily:"'Share Tech Mono',monospace",
                fontSize:8,color:"#0a4a2a"}}>Server leest dit →</div>
            </div>

            <div className="code" style={{maxHeight:500}}>{ROBLOX_HUD_CODE}</div>
          </div>
        )}

        {/* TAB 2 — SCREENSHOT OCR */}
        {tab === 2 && (
          <div style={{padding:28}}>
            <div className="label">OCR Screenshot Verwerking</div>
            <div style={{fontFamily:"'Michroma',sans-serif",fontSize:"clamp(20px,4vw,38px)",
              color:"#60a5fa",letterSpacing:1,lineHeight:.9,marginTop:6,marginBottom:16}}>
              TESSERACT + JIMP.<br/><span style={{color:"#00ff88"}}>DUAL EXTRACTION.</span>
            </div>
            <div style={{fontSize:12,color:"#4a6a5a",marginBottom:20,maxWidth:580,lineHeight:1.8}}>
              Twee parallelle extractie-methodes: OCR leest de HUD-tekst, jsQR leest de micro-QR.
              Beide resultaten worden gecombineerd voor maximale betrouwbaarheid.
            </div>
            <div className="code" style={{maxHeight:520}}>{OCR_CODE}</div>
          </div>
        )}

        {/* TAB 3 — STEGANO */}
        {tab === 3 && (
          <div style={{padding:28}}>
            <div className="label">Steganografie Methode Vergelijking</div>
            <div style={{fontFamily:"'Michroma',sans-serif",fontSize:"clamp(20px,4vw,38px)",
              color:"#f59e0b",letterSpacing:1,lineHeight:.9,marginTop:6,marginBottom:20}}>
              WELKE METHODE<br/><span style={{color:"#00ff88"}}>OVERLEEFT JPEG?</span>
            </div>
            {STEGO_METHODS.map(m => (
              <div key={m.id} className="card" style={{marginBottom:12,overflow:"hidden",
                border:`1px solid ${m.col}${m.recommended?"55":"22"}`}}>
                <div style={{padding:"12px 16px",background:`${m.col}${m.recommended?"15":"08"}`,
                  borderBottom:`1px solid ${m.col}22`,display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,
                      color:m.col,marginBottom:4}}>
                      {m.recommended && "⭐ "}{m.name}
                    </div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,
                      color:m.col,opacity:.7}}>{m.verdict}</div>
                  </div>
                </div>
                <div style={{padding:"10px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <div className="label" style={{color:"#00ff88",fontSize:7}}>Voordelen</div>
                    {m.pros.map((p,i) => (
                      <div key={i} style={{display:"flex",gap:6,marginBottom:4}}>
                        <div className="dot" style={{background:"#00ff88",marginTop:5}}/>
                        <div style={{fontSize:11,color:"#4a6a5a"}}>{p}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="label" style={{color:"#f43f5e",fontSize:7}}>Nadelen</div>
                    {m.cons.map((c,i) => (
                      <div key={i} style={{display:"flex",gap:6,marginBottom:4}}>
                        <div className="dot" style={{background:"#f43f5e",marginTop:5}}/>
                        <div style={{fontSize:11,color:"#4a6a5a"}}>{c}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4 — WEB UPLOAD */}
        {tab === 4 && (
          <div style={{padding:28}}>
            <div className="label">Web Upload Handler</div>
            <div style={{fontFamily:"'Michroma',sans-serif",fontSize:"clamp(20px,4vw,38px)",
              color:"#22c55e",letterSpacing:1,lineHeight:.9,marginTop:6,marginBottom:16}}>
              UPLOAD → EXTRACT<br/><span style={{color:"#60a5fa"}}>→ GAME LAUNCH.</span>
            </div>
            <div className="code" style={{maxHeight:500}}>{UPLOAD_CODE}</div>

            {/* Upload flow */}
            <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[
                {t:"Bestandsvalidatie",col:"#60a5fa",items:["JPEG/PNG/WebP only","Max 10MB","Width ≥ 800px aanbevolen"]},
                {t:"Extractie cascade",col:"#f59e0b",items:["1. jsQR micro-QR lezen","2. Tesseract OCR HUD","3. Kleuranalyse zone"]},
                {t:"Roblox verificatie",col:"#00ff88",items:["Player ID → Roblox Users API","Naam cross-check met OCR","Rate limit: 5 req/sec"]},
                {t:"Fout-handling",col:"#f43f5e",items:["<40% confidence → retry tip","HUD niet zichtbaar → instructie","QR én OCR beiden fail → fallback: manual ID entry"]},
              ].map(s => (
                <div key={s.t} className={`card-${s.col=="#60a5fa"?"blue":s.col=="#f59e0b"?"amber":s.col=="#00ff88"?"green":"red"}`}
                  style={{padding:12}}>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:s.col,marginBottom:8}}>{s.t}</div>
                  {s.items.map((item,i) => (
                    <div key={i} style={{display:"flex",gap:6,marginBottom:4}}>
                      <div className="dot" style={{background:s.col,marginTop:5}}/>
                      <div style={{fontSize:11,color:"#4a6a5a"}}>{item}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5 — SEO FUNNEL */}
        {tab === 5 && (
          <div style={{padding:28}}>
            <div className="label">Organische Traffic Strategie</div>
            <div style={{fontFamily:"'Michroma',sans-serif",fontSize:"clamp(20px,4vw,38px)",
              color:"#a78bfa",letterSpacing:1,lineHeight:.9,marginTop:6,marginBottom:16}}>
              GOOGLE + BAIDU<br/><span style={{color:"#f59e0b"}}>BRENGEN DE SPELERS.</span>
            </div>
            <div style={{fontSize:12,color:"#4a6a5a",marginBottom:20,maxWidth:580,lineHeight:1.8}}>
              Spelers googelen de game name na het zien van "Mol Gang" in Roblox.
              Landing page is geoptimaliseerd voor alle grote zoekmachines inclusief Baidu (China), 
              Yandex (Rusland), en Naver (Korea).
            </div>

            {/* Keyword tabel */}
            <div className="label" style={{fontSize:7,marginBottom:8}}>Target Zoekwoorden per Regio</div>
            <div style={{overflowX:"auto",marginBottom:20}}>
              <table className="dt">
                <thead><tr>
                  {["Zoekmachine","Regio","Zoekwoord","Volume (est.)","Intent"].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {[
                    ["Google","🌍 Global","Cryptos Agent Mol game","High","Direct"],
                    ["Google","🌍 Global","Mol Gang Roblox web game","Medium","Direct"],
                    ["Google","🇳🇱 NL","Cryptos moleculen spel","Medium","Informational"],
                    ["Baidu","🇨🇳 CN","Cryptos Agent Mol 游戏网站","Medium","Direct"],
                    ["Baidu","🇨🇳 CN","分子游戏 Roblox","Low","Informational"],
                    ["Google","🇮🇳 IN","Cryptos Mol game website continue","Medium","Direct"],
                    ["Google","🇰🇪 KE / 🇳🇬 NG","Agent Mol chemistry game play","Low","Direct"],
                    ["Yandex","🇷🇺 RU","Cryptos Agent Mol играть","Low","Direct"],
                  ].map((r,i) => (
                    <tr key={i}>
                      <td style={{color:"#c0d4c8"}}>{r[0]}</td>
                      <td>{r[1]}</td>
                      <td style={{color:"#a78bfa"}}>{r[2]}</td>
                      <td>{r[3]}</td>
                      <td style={{color:r[4]==="Direct"?"#00ff88":"#60a5fa"}}>{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="code" style={{maxHeight:280}}>{SEO_CODE}</div>

            {/* Approved Roblox channels */}
            <div style={{marginTop:16,background:"#030a05",borderRadius:8,padding:14,
              border:"1px solid #0a2015"}}>
              <div className="label" style={{color:"#00ff88",fontSize:7,marginBottom:8}}>
                Roblox-goedgekeurde kanalen voor traffic
              </div>
              {[
                ["YouTube","Channel 'Cryptos Agent Mol by Henricus Eduardus' → link in Roblox experience Social Links"],
                ["Discord","Community server → link in Roblox Group description (goedgekeurd platform)"],
                ["Game Description","Experience description mag website naam noemen (geen clickable link, maar vindbaar via Google)"],
                ["Twitter/X","@CryptosAgentMol → Roblox-approved sociale link in experience"],
              ].map(([p,d]) => (
                <div key={p} style={{display:"flex",gap:12,marginBottom:8}}>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"#00c860",
                    minWidth:80}}>{p}</div>
                  <div style={{fontSize:11,color:"#4a6a5a"}}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6 — COMPLIANCE */}
        {tab === 6 && (
          <div style={{padding:28}}>
            <div className="label">Juridische Compliance Matrix</div>
            <div style={{fontFamily:"'Michroma',sans-serif",fontSize:"clamp(20px,4vw,38px)",
              color:"#00ff88",letterSpacing:1,lineHeight:.9,marginTop:6,marginBottom:20}}>
              ALLES GROEN.<br/><span style={{color:"#60a5fa"}}>NIKS TE VERBERGEN.</span>
            </div>
            {COMPLIANCE_CHECKLIST.map(section => (
              <div key={section.area} className="card" style={{marginBottom:14,overflow:"hidden",
                border:`1px solid ${section.col}22`}}>
                <div style={{padding:"12px 16px",background:`${section.col}08`,
                  borderBottom:`1px solid ${section.col}18`,display:"flex",gap:10}}>
                  <div style={{fontFamily:"'Michroma',sans-serif",fontSize:16,color:section.col,letterSpacing:1}}>{section.area}</div>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:section.col,
                    opacity:.6,marginLeft:"auto",alignSelf:"center"}}>{section.status}</div>
                </div>
                <div style={{padding:"10px 16px"}}>
                  {section.items.map((item,i) => (
                    <div key={i} style={{display:"flex",gap:10,marginBottom:6}}>
                      <div style={{width:14,height:14,borderRadius:2,flexShrink:0,marginTop:1,
                        background:item.ok?`${section.col}25`:"#4a0a0a",
                        border:`1px solid ${item.ok?section.col:"#8a2020"}`,
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{fontSize:8,color:item.ok?section.col:"#ff6060"}}>
                          {item.ok?"✓":"✗"}
                        </span>
                      </div>
                      <div style={{fontSize:11,color:item.ok?"#4a6a5a":"#6a3a3a",lineHeight:1.5}}>
                        {item.t}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* IP Structuur */}
            <div style={{marginTop:8,background:"#030a05",borderRadius:10,padding:16,
              border:"1px solid #0a2015"}}>
              <div className="label" style={{color:"#00ff88",fontSize:7,marginBottom:10}}>IP & Belasting Structuur</div>
              <div style={{overflowX:"auto"}}>
                <table className="dt">
                  <thead><tr>
                    {["Entiteit","Bezit","Inkomsten","Belasting"].map(h => <th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {[
                      ["VirtualV Holding B.V.","Game IP, Merk, Karakters","Royalties 5-15% van EHMAC omzet","Innovatiebox 9% op royalty-inkomen"],
                      ["EHMAC B.V.","Roblox Group, Web Game","DevEx USD + Web subscriptions","CIT 25.8% of 9% Innovatiebox"],
                      ["Slag B.V. (DUBV)","Development diensten","Fees van EHMAC voor dev-werk","Normaal BTW + loonheffing"],
                    ].map((r,i) => (
                      <tr key={i}>
                        <td style={{color:"#c0d4c8",fontWeight:600}}>{r[0]}</td>
                        <td style={{color:"#a78bfa"}}>{r[1]}</td>
                        <td style={{color:"#60a5fa"}}>{r[2]}</td>
                        <td style={{color:"#00ff88"}}>{r[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7 — CHECKLIST */}
        {tab === 7 && (
          <div style={{padding:28}}>
            <div className="label">Implementatie Checklist</div>
            <div style={{fontFamily:"'Michroma',sans-serif",fontSize:"clamp(20px,4vw,38px)",
              color:"#00ff88",letterSpacing:1,lineHeight:.9,marginTop:6,marginBottom:20}}>
              ALLE 5 FASES.<br/><span style={{color:"#60a5fa"}}>ALLES GROEN = LIVE.</span>
            </div>
            {CHECKLIST_PHASES.map(phase => {
              const done = phase.items.filter((_,i) => checked[`${phase.phase}-${i}`]).length;
              const pct  = (done / phase.items.length) * 100;
              return (
                <div key={phase.phase} className="card" style={{marginBottom:12,overflow:"hidden",
                  border:`1px solid ${phase.col}22`}}>
                  <div style={{padding:"10px 16px",background:`${phase.col}08`,
                    borderBottom:`1px solid ${phase.col}18`,display:"flex",gap:10,alignItems:"center"}}>
                    <div style={{fontFamily:"'Michroma',sans-serif",fontSize:20,
                      color:phase.col,letterSpacing:1}}>{phase.title}</div>
                    <div style={{marginLeft:"auto",fontFamily:"'Share Tech Mono',monospace",
                      fontSize:9,color:phase.col}}>{done}/{phase.items.length}</div>
                  </div>
                  <div style={{padding:"6px 16px 4px"}}>
                    <div style={{height:3,background:"#08160f",borderRadius:2,marginBottom:10}}>
                      <div style={{width:`${pct}%`,height:"100%",background:phase.col,
                        borderRadius:2,transition:"width .4s ease"}}/>
                    </div>
                  </div>
                  <div style={{padding:"0 16px 12px"}}>
                    {phase.items.map((item,i) => (
                      <div key={i} onClick={() => chk(`${phase.phase}-${i}`)}
                        style={{display:"flex",gap:10,marginBottom:6,cursor:"pointer",
                          padding:"4px 8px",borderRadius:4,
                          background:checked[`${phase.phase}-${i}`]?`${phase.col}10`:"transparent"}}>
                        <div style={{width:14,height:14,borderRadius:2,flexShrink:0,marginTop:1,
                          border:`1px solid ${checked[`${phase.phase}-${i}`]?phase.col:`${phase.col}44`}`,
                          background:checked[`${phase.phase}-${i}`]?`${phase.col}25`:"transparent",
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {checked[`${phase.phase}-${i}`] &&
                            <span style={{fontSize:8,color:phase.col}}>✓</span>}
                        </div>
                        <div style={{fontSize:11,fontFamily:"'Share Tech Mono',monospace",
                          color:checked[`${phase.phase}-${i}`]?phase.col:"#2a4a3a",lineHeight:1.5}}>
                          {item}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
