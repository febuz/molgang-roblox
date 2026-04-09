import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   MOLGANG — MVP DEVELOPER MASTER PLAN
   WebGPU · Three.js r168 · Strike Lightning · XRP Gateway
   "Beter dan Roblox" Renderer + Payment Infrastructure
═══════════════════════════════════════════════════════════════ */

const G = `
@import url('https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@200;300;400;500;700&family=Playfair+Display:wght@400;700;900&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}

:root{
  --ink:#0e0a06;
  --paper:#13100b;
  --card:#1a1510;
  --line:#2a2218;
  --line2:#3a3028;
  --burn:#e07020;
  --burn2:#f09040;
  --burn3:#ffc070;
  --steel:#8090a8;
  --grass:#50a060;
  --sky:#4080c0;
  --red:#c04040;
  --text:#d4c8b8;
  --muted:#6a6050;
}

body{
  background:var(--ink);
  color:var(--text);
  font-family:'Azeret Mono',monospace;
  font-size:13px;
  line-height:1.6;
  overflow-x:hidden;
}

/* blueprint grid bg */
body::after{
  content:'';
  position:fixed;inset:0;
  pointer-events:none;
  z-index:0;
  opacity:.04;
  background-image:
    linear-gradient(var(--burn) 1px, transparent 1px),
    linear-gradient(90deg, var(--burn) 1px, transparent 1px);
  background-size:40px 40px;
}

::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-thumb{background:var(--line2)}

@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes scanH{from{transform:translateX(-100%)}to{transform:translateX(100vw)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes countUp{from{--n:0}to{--n:100}}

.fi{animation:fadeIn .35s ease both}
.pulse{animation:pulse 2s ease infinite}

/* scanline */
.scanline{
  position:fixed;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent 0%,var(--burn) 50%,transparent 100%);
  pointer-events:none;z-index:9999;
  animation:scanH 12s linear infinite;
  width:200px;
}

/* ── TABS ── */
.tab{
  padding:9px 16px;
  background:transparent;border:none;
  border-bottom:2px solid transparent;
  cursor:pointer;
  font-family:'Azeret Mono',monospace;
  font-size:8px;letter-spacing:2.5px;
  text-transform:uppercase;
  color:var(--muted);
  transition:all .18s;
  white-space:nowrap;
}
.tab:hover{color:var(--burn2)}
.tab.on{color:var(--burn3);border-bottom-color:var(--burn)}

/* ── HEADER ── */
.hdr{
  background:var(--paper);
  border-bottom:1px solid var(--line);
  padding:0 28px;
  position:sticky;top:0;z-index:100;
}

/* ── CARDS ── */
.card{
  background:var(--card);
  border:1px solid var(--line);
  border-radius:6px;
  overflow:hidden;
  position:relative;
  z-index:1;
}
.card::before{
  content:'';
  position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--burn)40,transparent);
}
.ch{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px}
.cb{padding:18px}

/* ── CODE ── */
.code{
  font-family:'Azeret Mono',monospace;font-size:10px;
  line-height:1.9;background:#0a0805;
  border:1px solid var(--line);border-radius:6px;
  padding:16px;overflow-x:auto;white-space:pre;
  max-height:460px;overflow-y:auto;
  color:#a09080;
}
.code .kw{color:#e08040}
.code .fn{color:#80b0e0}
.code .st{color:#70c080}
.code .cm{color:#3a3028}
.code .ty{color:#c080a0}
.code .nm{color:#a0c0e0}

/* ── CHIP ── */
.chip{
  padding:2px 8px;border-radius:3px;
  font-family:'Azeret Mono',monospace;
  font-size:8px;letter-spacing:1.5px;
  display:inline-block;margin:2px;
  border:1px solid;text-transform:uppercase;
}

/* ── PHASE CARD ── */
.phase{
  background:var(--card);
  border:1px solid var(--line);
  border-left:3px solid;
  border-radius:0 6px 6px 0;
  margin-bottom:12px;
  overflow:hidden;
  position:relative;z-index:1;
}

/* ── PROGRESS ── */
.pbar{height:3px;background:var(--line);border-radius:2px;overflow:hidden;margin:8px 0}
.pfill{height:100%;border-radius:2px;transition:width .6s ease}

/* ── TABLE ── */
table.t{width:100%;border-collapse:collapse}
table.t th{
  font-family:'Azeret Mono',monospace;font-size:8px;
  letter-spacing:2px;color:var(--muted);
  padding:8px 12px;text-align:left;
  border-bottom:1px solid var(--line);
  background:var(--ink);text-transform:uppercase;
}
table.t td{
  padding:8px 12px;font-size:11px;
  border-bottom:1px solid var(--line);
  font-family:'Azeret Mono',monospace;color:var(--muted);
}
table.t tr:last-child td{border-bottom:none}
table.t tr:hover td{background:rgba(224,112,32,.04)}
table.t td:first-child{color:var(--text)}

/* ── INLINE CODE ── */
code{
  font-family:'Azeret Mono',monospace;font-size:10px;
  background:rgba(224,112,32,.1);border:1px solid rgba(224,112,32,.2);
  border-radius:3px;padding:1px 5px;color:var(--burn3);
}

/* ── WARN ── */
.warn{border-radius:6px;padding:12px 14px;font-size:11px;line-height:1.7;display:flex;gap:12px;border:1px solid}
.wa{background:#1a1000;border-color:#4a3000;color:#c0a060}
.wr{background:#140808;border-color:#4a1010;color:#c06060}
.wg{background:#081408;border-color:#1a4010;color:#60a060}
.wb{background:#080e18;border-color:#102040;color:#6090c0}

/* ── NODE DIAGRAM ── */
.node{
  background:var(--card);border:1px solid var(--line2);
  border-radius:6px;padding:12px;text-align:center;
  font-family:'Azeret Mono',monospace;font-size:9px;
  letter-spacing:1px;
}
.arrow-right{color:var(--line2);font-size:20px;display:flex;align-items:center;justify-content:center}

/* RESPONSIVE */
@media(max-width:680px){
  .hdr{padding:0 14px}
  .cb,.ch{padding:14px}
  .content{padding:18px 14px 48px}
}
`;

const TABS = [
  "🗺 MVP ROADMAP",
  "🧊 3D ENGINE",
  "⚡ STRIKE NODE",
  "🌊 XRP GATEWAY",
  "🏗 INFRA",
  "✅ SPRINTS",
];

/* ═══════════════════════════════════
   DATA
═══════════════════════════════════ */

const PHASES = [
  {
    n:"01", title:"MVP Foundation", weeks:"Weken 1–3", col:"#e07020", pct:0,
    deliverable:"Draaiende web game met werkende screenshot-upload + basic 3D scene",
    tech:["Vite 6","React 19","Three.js r168","Cloudflare Workers","Supabase"],
    tasks:[
      "Vite + React project init met Three.js r168",
      "WebGPU renderer detectie + WebGL2 fallback",
      "Eerste 3D scène: Slakkenspoor Fabriek (GLTF placeholder)",
      "HemisphereLight + DirectionalLight basis setup",
      "Screenshot upload endpoint (POST /api/upload-screenshot)",
      "Tesseract.js OCR + jsQR pipeline",
      "Supabase player_profiles tabel aanmaken",
      "JWT sessie na succesvolle screenshot-verificatie",
      "Character loader: basis GLTF animatie (idle/walk)",
      "Landing page SEO: JSON-LD + hreflang",
    ]
  },
  {
    n:"02", title:"AAA Renderer", weeks:"Weken 4–7", col:"#50a060", pct:0,
    deliverable:"Visueel beter dan Roblox: physically correct lighting, post-processing, HD shaders",
    tech:["WebGPU","WGSL Shaders","EffectComposer","Draco","RGBE HDR"],
    tasks:[
      "WebGPU renderer activeren (Three.js WebGPURenderer)",
      "RGBE HDR environment per zone (zaandam_hdr.hdr etc.)",
      "ACESFilmic tonemapping + exposure control",
      "Custom PBR shader voor slag-materialen (ruwe metaaloppervlak)",
      "SSAO pass (Screen Space Ambient Occlusion)",
      "Unreal Bloom pass (quantum dots glow)",
      "SMAA anti-aliasing (beter dan Roblox native AA)",
      "Cascaded Shadow Maps (PCFSoft, 4096px)",
      "Volumetric god-rays (custom GLSL raymarching shader)",
      "LOD systeem: 3 detail-levels per karakter",
      "Particle systeem: chemische reacties (vanadium sparks etc.)",
      "Draco-compressed GLTF loading (<5MB per model)",
    ]
  },
  {
    n:"03", title:"Hedera + NFT", weeks:"Weken 5–8", col:"#4080c0", pct:0,
    deliverable:"Werkende NFT-mint + inventory sync + screenshot→Hedera bridge",
    tech:["Hedera SDK","Mirror Node","IPFS/Pinata","HTS"],
    tasks:[
      "Hedera testnet operator account aanmaken",
      "MOLNFT token aanmaken op Hedera HTS",
      "NFT-mint functie bij game-achievement",
      "Mirror Node polling voor live NFT-status",
      "IPFS metadata upload via Pinata API",
      "Inventory sync: Roblox screenshot → Hedera account",
      "NFT 3D items: load GLTF op skeleton bones",
      "Emissive glow + PointLight per rarity tier",
      "NFT gallery pagina op web game profiel",
    ]
  },
  {
    n:"04", title:"Strike Lightning", weeks:"Weken 8–10", col:"#c0a000", pct:0,
    deliverable:"Werkende uitbetaling: MOLNFT → Lightning BTC via Strike API",
    tech:["Strike API","BOLT-11","LNURL","KYC/AML"],
    tasks:[
      "Strike developer account aanmaken (developer.strike.me)",
      "Strike API key + webhook configureren",
      "POST /api/withdrawal: KYC check + Strike payment uitvoeren",
      "BOLT-11 invoice validatie (client-side)",
      "Lightning Address ondersteuning (LNURL-pay)",
      "Uitbetalingslimieten per tier (€1K / €10K)",
      "DAC8 transactie logging naar Supabase",
      "KYC document upload + Onfido/Sumsub integratie",
      "Withdrawal history pagina op user dashboard",
    ]
  },
  {
    n:"05", title:"XRP Gateway (Geavanceerd)", weeks:"Weken 10–14", col:"#c04080", pct:0,
    deliverable:"Eigen XRP stablecoin gateway voor EUR/USD/CNY betalingen en uitbetalingen",
    tech:["XRPL","xrpl.js","Issued Currency","AMM","Ripple Gateway"],
    tasks:[
      "XRPL cold + hot wallet aanmaken (mainnet)",
      "Gateway trust line instellen voor EUR/USD/CNY IOU's",
      "Issued Currency mint: EUR.EHMAC, USD.EHMAC, CNY.EHMAC",
      "XRPL AMM pool: MOLTOKEN/EUR.EHMAC",
      "Deposit flow: speler stuurt EUR → EHMAC gateway → ontvangt EUR.EHMAC",
      "Withdrawal flow: speler stuurt EUR.EHMAC terug → EHMAC betaalt SEPA",
      "Ripple Gateway Services compliance (MSB registratie / DNB melden)",
      "XRPL Hooks (smart contracts) voor fee logic",
      "CNY corridor: integratie met BitoEX of OSL voor CNY liquidity",
    ]
  },
];

/* ═══════════════════════════════════
   CODE SNIPPETS
═══════════════════════════════════ */

const WEBGPU_CODE = `// renderer-setup.ts  —  WebGPU-first met WebGL2 fallback
// Three.js r168+ · Beter dan Roblox Future Lighting

import * as THREE from "three";
import WebGPURenderer from "three/addons/renderers/webgpu/WebGPURenderer.js";
import WebGPUCapabilities from "three/addons/renderers/webgpu/WebGPUCapabilities.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass }     from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass }       from "three/addons/postprocessing/GTAOPass.js";   // GTAO beter dan SSAO
import { UnrealBloomPass }from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass }       from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass }     from "three/addons/postprocessing/OutputPass.js";
import { SSRPass }        from "three/addons/postprocessing/SSRPass.js";    // Screen-Space Reflections
import { RGBELoader }     from "three/addons/loaders/RGBELoader.js";

// ── DETECTEER BESTE RENDERER ─────────────────────────────────────
export async function createRenderer(canvas: HTMLCanvasElement) {

  let renderer: WebGPURenderer | THREE.WebGLRenderer;
  let isWebGPU = false;

  // WebGPU check  (Chrome 113+, Edge 113+, Firefox Nightly)
  if (await WebGPUCapabilities.isAvailable()) {
    renderer = new WebGPURenderer({
      canvas,
      antialias: false,          // SMAA doet dit zelf
      powerPreference: "high-performance",
    });
    await (renderer as WebGPURenderer).init();
    isWebGPU = true;
    console.log("[renderer] WebGPU actief ✅");
  } else {
    // Fallback: WebGL2 met alle extensions
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: true,
      precision: "highp",
    });
    console.log("[renderer] WebGL2 fallback ✅");
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ── TONEMAPPING & COLOR ─────────────────────────────────────────
  renderer.toneMapping        = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace   = THREE.SRGBColorSpace;

  // ── SHADOWS ─────────────────────────────────────────────────────
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.VSMShadowMap;  // VSM: zachtste schaduwen

  return { renderer, isWebGPU };
}

// ── POST-PROCESSING PIPELINE ────────────────────────────────────
// Roblox Future Lighting heeft: SSAO, bloom, depth of field
// Wij hebben: GTAO (beter), bloom, SSR, SMAA, depth of field, chromatic aberration

export function buildPostPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): EffectComposer {

  const W = window.innerWidth, H = window.innerHeight;
  const composer = new EffectComposer(renderer);

  // 1. BASE RENDER
  composer.addPass(new RenderPass(scene, camera));

  // 2. GTAO — Ground Truth Ambient Occlusion (beter dan Roblox SSAO)
  const gtao = new GTAOPass(scene, camera, W, H);
  gtao.blendIntensity = 0.8;
  composer.addPass(gtao);

  // 3. SSR — Screen Space Reflections (nat metaal, plassen)
  const ssr = new SSRPass({ scene, camera, width:W, height:H,
    groundReflector: null,
    selects: null,
    bouncing: false,
    blur: true,
  });
  ssr.thickness    = 0.018;
  ssr.maxDistance  = 1;
  ssr.opacity      = 0.35;
  composer.addPass(ssr);

  // 4. UNREAL BLOOM — emissive quantum dots, NFT glow, lava slag
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(W, H),
    0.45,   // strength
    0.6,    // radius
    0.82    // threshold
  );
  composer.addPass(bloom);

  // 5. CUSTOM CHROMATIC ABERRATION (subtle, cinematic)
  const chromaticPass = buildChromaticAberrationPass();
  composer.addPass(chromaticPass);

  // 6. SMAA — best AA voor performance vs kwaliteit
  composer.addPass(new SMAAPass(W, H));

  // 7. OUTPUT (tonemapping apply)
  composer.addPass(new OutputPass());

  return composer;
}

// ── CUSTOM CHROMATIC ABERRATION SHADER ─────────────────────────
function buildChromaticAberrationPass() {
  const { ShaderPass } = require("three/addons/postprocessing/ShaderPass.js");
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uOffset:  { value: new THREE.Vector2(0.002, 0.0) },
    },
    vertexShader: \`
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    \`,
    fragmentShader: \`
      uniform sampler2D tDiffuse;
      uniform vec2 uOffset;
      varying vec2 vUv;
      void main(){
        float r = texture2D(tDiffuse, vUv + uOffset).r;
        float g = texture2D(tDiffuse, vUv         ).g;
        float b = texture2D(tDiffuse, vUv - uOffset).b;
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    \`,
  });
}

// ── VOLUMETRIC FOG / GOD-RAYS SHADER (GLSL) ────────────────────
// Roblox heeft geen volumetrische god-rays — wij wel
export const GodRaysShader = \`
  // fragment shader snippet (Three.js ShaderPass)
  uniform sampler2D tDiffuse;
  uniform sampler2D tOcclusion;
  uniform vec2 uLightPos;     // light positie in screen space
  uniform float uDecay;       // 0.97 — hoe snel rays uitdoven
  uniform float uDensity;     // 0.96 — dichtheid
  uniform float uWeight;      // 0.4  — intensiteit
  uniform int   uSamples;     // 100  — samples per ray
  varying vec2 vUv;

  void main(){
    vec2 delta = (vUv - uLightPos) / float(uSamples) * uDensity;
    vec2 tc    = vUv;
    float illumination = 1.0;
    vec4  color = vec4(0.0);
    for(int i=0; i<uSamples; i++){
      tc -= delta;
      vec4 s = texture2D(tOcclusion, tc);
      s *= illumination * uWeight;
      color += s;
      illumination *= uDecay;
    }
    gl_FragColor = texture2D(tDiffuse, vUv) + color * 0.6;
  }
\`;

// ── HDR ENVIRONMENT PER ZONE ────────────────────────────────────
export const ZONE_HDRS: Record<string, string> = {
  zaandam:   "/hdr/zaandam_steel_mill_4k.hdr",    // warm industrieel
  wognum:    "/hdr/polder_overcast_4k.hdr",         // koud grijs
  quantum:   "/hdr/cryolab_blue_4k.hdr",            // cyaan cryo
  nexus:     "/hdr/amsterdam_night_4k.hdr",          // nacht urban
  biome:     "/hdr/volcanic_crater_4k.hdr",          // element archipel
};

export async function loadHDR(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  zone: string
) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const loader = new RGBELoader();
  const texture = await loader.loadAsync(
    ZONE_HDRS[zone] || ZONE_HDRS.zaandam
  );
  const envMap = pmrem.fromEquirectangular(texture).texture;
  scene.environment = envMap;
  scene.background  = envMap;
  scene.backgroundBlurriness = 0.06;
  texture.dispose();
  pmrem.dispose();
  return envMap;
}`;

const STRIKE_CODE = `// strike-integration.ts  —  Strike API voor Lightning BTC
// Documentatie: developer.strike.me
// EHMAC B.V. is MERCHANT, niet exchange — Strike draagt CASP-licentie

import { createHmac } from "crypto";

// ── CONFIGURATIE ─────────────────────────────────────────────────
const STRIKE_BASE   = "https://api.strike.me/v1";
const STRIKE_API_KEY = env.STRIKE_API_KEY;  // Cloudflare Worker secret

// ── STAP 1: STRIKE ACCOUNT AANMAKEN ─────────────────────────────
// 1. Ga naar: https://developer.strike.me
// 2. Klik "Sign Up" → maak business account (EHMAC B.V.)
// 3. Vul in: bedrijfsnaam, KVK-nummer, IBAN
// 4. Wacht op verificatie (1-3 werkdagen)
// 5. Genereer API key via Dashboard → Keys
// 6. Sla op als Cloudflare Worker secret: wrangler secret put STRIKE_API_KEY

// ── PAYOUT VIA LIGHTNING ─────────────────────────────────────────

interface LightningPayoutRequest {
  amount_sats:   number;
  ln_destination: string;   // BOLT-11 invoice OF Lightning Address
  description:   string;
  player_id:     string;
}

export async function sendLightningPayout(req: LightningPayoutRequest): Promise<PayoutResult> {
  
  const isLightningAddress = req.ln_destination.includes("@");
  
  if (isLightningAddress) {
    // ── Lightning Address flow (LNURL-pay) ───────────────────────
    return await payToLightningAddress(req);
  } else {
    // ── BOLT-11 invoice flow ──────────────────────────────────────
    return await payBolt11Invoice(req);
  }
}

// ── BOLT-11 INVOICE BETALEN ───────────────────────────────────────
async function payBolt11Invoice(req: LightningPayoutRequest): Promise<PayoutResult> {
  
  // Strike API: send to payment
  const payRes = await fetch(\`\${STRIKE_BASE}/payments/send\`, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${STRIKE_API_KEY}\`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      description:  req.description,
      correlationId: \`molgang_\${req.player_id}_\${Date.now()}\`,
      lightning: {
        invoice: req.ln_destination,
      },
    }),
  });

  if (!payRes.ok) {
    const err = await payRes.json();
    throw new Error(\`Strike payout failed: \${err.data?.message || payRes.status}\`);
  }

  const payment = await payRes.json();

  // Verificatie: wacht op payment completion
  const confirmed = await waitForPaymentCompletion(payment.paymentId);

  return {
    success:       true,
    payment_id:    payment.paymentId,
    amount_sats:   req.amount_sats,
    fee_sats:      confirmed.lightningFee || 0,
    payment_hash:  confirmed.paymentHash,
    completed_at:  new Date().toISOString(),
  };
}

// ── LIGHTNING ADDRESS BETALEN ─────────────────────────────────────
// Strike ondersteunt directe Lightning Address betalingen via Quotes API
async function payToLightningAddress(req: LightningPayoutRequest): Promise<PayoutResult> {

  // Stap 1: Quote aanvragen
  const quoteRes = await fetch(\`\${STRIKE_BASE}/payment-quotes/lightning\`, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${STRIKE_API_KEY}\`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      sourceCurrency: "BTC",
      amount: { amount: (req.amount_sats / 1e8).toFixed(8), currency: "BTC" },
      lnAddress: req.ln_destination,
      description: req.description,
    }),
  });

  const quote = await quoteRes.json();

  // Stap 2: Quote uitvoeren
  const execRes = await fetch(
    \`\${STRIKE_BASE}/payment-quotes/\${quote.paymentQuoteId}/execute\`, {
    method: "PATCH",
    headers: { "Authorization": \`Bearer \${STRIKE_API_KEY}\` },
  });

  const result = await execRes.json();

  return {
    success:      true,
    payment_id:   result.paymentId,
    amount_sats:  req.amount_sats,
    fee_sats:     result.lightningFee || 1,
    payment_hash: result.paymentHash || "",
    completed_at: new Date().toISOString(),
  };
}

// ── WACHT OP BEVESTIGING (polling) ────────────────────────────────
async function waitForPaymentCompletion(paymentId: string, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res  = await fetch(\`\${STRIKE_BASE}/payments/\${paymentId}\`, {
      headers: { "Authorization": \`Bearer \${STRIKE_API_KEY}\` },
    });
    const data = await res.json();
    if (data.state === "COMPLETED") return data;
    if (data.state === "FAILED")    throw new Error("Payment failed: " + data.reason);
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error("Payment timeout after 30s");
}

// ── WEBHOOK VOOR INKOMENDE BETALINGEN ─────────────────────────────
// In-game MOL aankopen via Lightning: speler betaalt → game ontvangt
export async function handleStrikeWebhook(request: Request) {
  
  // Verifieer Strike webhook handtekening
  const signature = request.headers.get("X-Webhook-Signature");
  const body      = await request.text();
  const expected  = createHmac("sha256", env.STRIKE_WEBHOOK_SECRET)
    .update(body).digest("hex");
  
  if (signature !== \`sha256=\${expected}\`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.eventType === "payment.created") {
    const payment = event.data;
    // Credenteer MOL-tokens aan de speler
    await creditMolBalance(payment.metadata.player_id, payment.amount.amount);
  }

  return new Response("OK");
}

// ── SETUP CHECKLIST VOOR NIEUWE ONTWIKKELAAR ─────────────────────
/*
  1. REGISTRATIE
     → https://developer.strike.me → Business account
     → Vul in: EHMAC B.V., KVK 93406797, IBAN NL...

  2. API KEYS
     → Dashboard → API Keys → "Create Key"
     → Permissions: payments:read, payments:write, quotes:write
     → wrangler secret put STRIKE_API_KEY

  3. WEBHOOK
     → Dashboard → Webhooks → Add Endpoint
     → URL: https://bridge.molgang.app/v1/strike-webhook
     → Events: payment.created, payment.updated
     → wrangler secret put STRIKE_WEBHOOK_SECRET

  4. SANDBOX TESTEN
     → Gebruik sandbox.strike.me voor testbetalingen
     → Test wallet: Phoenix App (iOS/Android) op testnet

  5. LIMITEN (Strike Business, geen CASP-licentie nodig)
     → Per betaling: geen limiet (Strike reguleert zelf)
     → Maandelijks volume: contact Strike voor custom limiet
     → EHMAC = merchant, Strike = regulated payment processor
*/`;

const XRP_CODE = `// xrpl-gateway.ts  —  XRP Ledger Stablecoin Gateway
// EUR.EHMAC · USD.EHMAC · CNY.EHMAC Issued Currencies
// Gedistribueerde liquiditeit via XRPL AMM

import { Client, Wallet, Payment, TrustSet, OfferCreate, AMMCreate } from "xrpl";

// ── GATEWAY ARCHITECTUUR ─────────────────────────────────────────
//
// COLD WALLET (offline) = uitgevende instantie
//   ↓ sets DefaultRipple, vertrouwt hot wallet
// HOT WALLET (online)   = operationele transacties
//   ↓ ontvangt fiat van klanten, mint IOU's
// AMM POOL (XRPL DEX)   = liquiditeit MOLTOKEN / EUR.EHMAC
//   ↓ spelers wisselen MOLTOKEN naar EUR.EHMAC zonder orderboek

// ── STAP 1: WALLETS AANMAKEN ──────────────────────────────────────

export async function setupGateway() {
  const client = new Client("wss://xrplcluster.com");  // mainnet
  await client.connect();

  // COLD WALLET: bewaar OFFLINE (hardware wallet / air-gapped PC)
  const coldWallet = Wallet.generate();
  console.log("COLD wallet (BEWAAR OFFLINE):", coldWallet.classicAddress);
  // → Zet op hardware wallet. NOOIT online.

  // HOT WALLET: operationele wallet voor gateway
  const hotWallet  = Wallet.generate();
  console.log("HOT wallet:", hotWallet.classicAddress);

  // ── COLD WALLET INSTELLINGEN ──────────────────────────────────
  // 1. DefaultRipple inschakelen (verplicht voor gateway)
  const setDefaultRipple = await client.submitAndWait({
    TransactionType: "AccountSet",
    Account:         coldWallet.classicAddress,
    SetFlag:         8,   // asfDefaultRipple
    Fee:             "12",
  }, { wallet: coldWallet });

  // 2. RequireAuth inschakelen (alleen geautoriseerde trust lines)
  await client.submitAndWait({
    TransactionType: "AccountSet",
    Account:         coldWallet.classicAddress,
    SetFlag:         2,   // asfRequireAuth
    Fee:             "12",
  }, { wallet: coldWallet });

  // ── HOT WALLET: TRUST LINES INSTELLEN ────────────────────────
  // Hot wallet vertrouwt cold wallet voor EUR, USD, CNY
  for (const [currency, limit] of [
    ["EUR", "10000000"],
    ["USD", "10000000"],
    ["CNY", "50000000"],
  ]) {
    await client.submitAndWait({
      TransactionType: "TrustSet",
      Account:         hotWallet.classicAddress,
      LimitAmount: {
        currency: currency,
        issuer:   coldWallet.classicAddress,
        value:    limit,
      },
      Fee: "12",
    } as TrustSet, { wallet: hotWallet });
    console.log(\`Trust line \${currency} ingesteld ✅\`);
  }

  await client.disconnect();
  return { coldWallet, hotWallet };
}

// ── STAP 2: EUR/USD/CNY MINTING (bij fiat-storting klant) ─────────

export async function mintStablecoin(params: {
  recipient:   string;   // klant's XRP wallet address
  currency:    "EUR" | "USD" | "CNY";
  amount:      string;   // bijv. "100"
  coldWallet:  Wallet;
  client:      Client;
}) {
  // Klant heeft SEPA/wire/WeChat gestort → hot wallet ontvangt fiat
  // → mint equivalent IOU op XRPL

  const payment: Payment = {
    TransactionType: "Payment",
    Account:  params.coldWallet.classicAddress,   // cold wallet = uitgevend
    Destination: params.recipient,
    Amount: {
      currency: params.currency,
      issuer:   params.coldWallet.classicAddress,
      value:    params.amount,
    },
    Fee: "12",
  };

  const result = await params.client.submitAndWait(payment, {
    wallet: params.coldWallet,
  });

  console.log(\`Minted \${params.amount} \${params.currency} → \${params.recipient}\`);
  return result;
}

// ── STAP 3: AMM POOL AANMAKEN (MOLTOKEN / EUR.EHMAC) ──────────────

export async function createAMMPool(params: {
  asset1_amount: string;   // MOLTOKEN amount
  asset2_amount: string;   // EUR.EHMAC amount
  fee_bps: number;         // bijv. 500 = 0.5%
  operatorWallet: Wallet;
  client: Client;
  coldAddress: string;
}) {
  const ammCreate: AMMCreate = {
    TransactionType: "AMMCreate",
    Account:         params.operatorWallet.classicAddress,
    Amount: {
      currency: "MOL",
      issuer:   params.coldAddress,
      value:    params.asset1_amount,
    },
    Amount2: {
      currency: "EUR",
      issuer:   params.coldAddress,
      value:    params.asset2_amount,
    },
    TradingFee: params.fee_bps,   // 500 = 0.5%
    Fee: "2000000",               // AMM creation fee (2 XRP)
  };

  const result = await params.client.submitAndWait(
    ammCreate, { wallet: params.operatorWallet }
  );

  console.log("AMM pool aangemaakt ✅");
  return result;
}

// ── STAP 4: CNY CORRIDOR (China) ───────────────────────────────────
// Voor CNY: upstream liquiditeitsprovider nodig
// Opties: BitoEX (Taiwan), OSL (HK), RippleNet partners
// Simpelste: gebruik Ripple ODL (On-Demand Liquidity) via Bitstamp

// ── STAP 5: WITHDRAWAL (IOU → fiat uitbetaling) ───────────────────

export async function processWithdrawal(params: {
  from_address:   string;   // klant's XRP wallet
  currency:       "EUR" | "USD" | "CNY";
  amount:         string;
  iban_or_bank:   string;   // klant's bankrekening
  client:         Client;
  coldWallet:     Wallet;
}) {
  // 1. Klant stuurt IOU terug naar cold wallet (gateway adres)
  //    (dit doet de klant zelf in zijn XRPL wallet)
  
  // 2. Wij horen dit via XRPL account subscribe
  const ledger = await params.client.request({
    command: "subscribe",
    accounts: [params.coldWallet.classicAddress],
  });

  // 3. Bij ontvangst: burn de IOU + initieer SEPA/wire via bank API
  //    (bijv. via Wise Business API of Bunq API)
  // await initiateSepaTransfer(params.iban_or_bank, params.amount, params.currency);

  console.log(\`Withdrawal \${params.amount} \${params.currency} → \${params.iban_or_bank}\`);
}

// ── SETUP CHECKLIST NIEUWE ONTWIKKELAAR ───────────────────────────
/*
  VEREISTEN:
  - Node.js 20+
  - xrpl library: npm install xrpl

  STAPPEN:
  1. Genereer cold + hot wallet (setup script hierboven)
  2. Fund beide wallets met XRP (min 10 XRP reserve per wallet)
     → Koop XRP via Kraken/Bitvavo → transfer naar cold wallet
  3. Cold wallet AccountSet: DefaultRipple + RequireAuth
  4. Hot wallet TrustSet naar cold: EUR, USD, CNY
  5. Test op XRPL Testnet eerst (wss://testnet.xrpl-labs.com)
  
  COMPLIANCE (NL):
  → DNB melden als "betaalinstelling" of "elektronisch geldinstituut"
  → Vergunning vereist boven €3M/jaar (art. 2:3a Wft)
  → Alternatief: partnership met vergunninghoudende instelling
    (Stichting Molgateway als uitgevende instelling)
  
  CNY LIQUIDITEIT:
  → Contact: RippleNet Liquidity Hub partners NL
  → Of: directe relatie met BitoEX / B2BinPay via XRPL
  
  TESTNET FAUCET:
  → https://xrpl.org/xrp-testnet-faucet.html
*/`;

const INFRA_CODE = `# infrastructure.yml — Productie-infrastructuur MOLGANG
# Hetzner VPS + Cloudflare + Supabase + Pinata + Strike

# ── SERVERS ───────────────────────────────────────────────────────

# Game web server: Hetzner CPX31 (Amsterdam, €12/mnd)
# 4 vCPU · 8GB RAM · 160GB NVMe · 1Gbit/s
game_server:
  provider:   hetzner
  type:        cpx31
  location:    nbg1   # Nürnberg (dichtstbij AMS)
  os:          ubuntu-24.04
  purpose:     Three.js web game + WebSocket multiplayer

# API server: Hetzner CX22 (€4/mnd)
api_server:
  provider:   hetzner
  type:        cx22
  purpose:     Node.js API, OCR processor, Hedera bridge

# XRP Gateway server: Hetzner CX32 (€8/mnd) GEÏSOLEERD
xrp_gateway:
  provider:   hetzner
  type:        cx32
  purpose:     XRPL hot wallet daemon (ISOLEER van game server)
  note:        >
    XRPL gateway NOOIT op zelfde server als game.
    Aparte firewall, geen shared secrets.

# ── EDGE / CDN / WORKERS ──────────────────────────────────────────

cloudflare:
  workers:
    - name:    bridge-worker
      route:   bridge.molgang.app/*
      purpose: QR generatie, OCR, NFT verify, JWT
    - name:    kyc-worker
      route:   kyc.molgang.app/*
      purpose: Document upload, KYC verwerking, Strike payout
    - name:    xrp-webhook
      route:   xrp.molgang.app/webhook
      purpose: XRPL event listener
  r2_buckets:
    - name: qr-codes      # QR PNG's (TTL 400s)
    - name: model-assets  # GLTF modellen (CDN cached)
    - name: hdr-maps      # RGBE HDR environments (CDN cached)
  kv_namespaces:
    - SESSIONS            # JWT sessies (TTL 7d)
    - RATE_LIMITS         # API rate limiting
  d1_databases:
    - molgang_db          # Player data, transactions

# ── DATABASE ──────────────────────────────────────────────────────

supabase:
  plan:       pro        # €25/mnd
  region:     eu-west-1  # Frankfurt
  tables:
    - player_profiles     # userId, name, level, mol_balance
    - nft_inventory       # player_id, token_id, serial, metadata
    - transactions        # alle in/out transacties (DAC8)
    - kyc_records         # naam, geboortedatum, verificatie status
    - withdrawal_log      # strike/xrp payout history
  realtime:   true        # WebSocket voor live NFT updates

# ── EXTERNE SERVICES ──────────────────────────────────────────────

services:
  hedera:
    network:    testnet → mainnet
    sdk:        @hashgraph/sdk@2.46+
    mirror_node: https://mainnet.mirrornode.hedera.com/api/v1

  pinata:
    plan:       professional  # $20/mnd, 100GB IPFS
    purpose:    NFT metadata opslag

  strike:
    env:        sandbox → production
    api_base:   https://api.strike.me/v1
    webhooks:   https://bridge.molgang.app/v1/strike-webhook

  onfido:       # KYC identity verification
    plan:       pay-per-use (~€2 per verificatie)
    purpose:    ID scan + selfie matching

  opennode:     # Backup Lightning provider
    plan:       business
    purpose:    Fallback als Strike rate limiet raakt

# ── NGINX CONFIGURATIE (game server) ─────────────────────────────

nginx_sites:
  - domain:    game.molgang.app
    root:      /var/www/molgang/dist
    ssl:        true (certbot auto-renew)
    headers:
      - "Cross-Origin-Opener-Policy: same-origin"
      - "Cross-Origin-Embedder-Policy: require-corp"  # SharedArrayBuffer voor WebGPU
    websocket:
      path:    /ws/
      proxy:   localhost:3001  # multiplayer WS server

  - domain:    xrp.molgang.app
    note:      >
      ALLEEN Cloudflare Worker webhook door.
      Game-traffic NOOIT op dit domein.

# ── MAANDELIJKSE KOSTEN SCHATTING ────────────────────────────────
# Hetzner CPX31 + CX22 + CX32: €24
# Cloudflare Workers + R2 (first 10M reqs free): €0-5
# Supabase Pro: €25
# Pinata Professional: $20 (~€18)
# Onfido KYC: variabel (~€2/verificatie)
# Strike: geen maandkosten (commissie per tx)
# TOTAAL VAST: ~€72/mnd
# Break-even: 7-8 betalende spelers/mnd`;

/* ═══════════════════════════════════
   RENDER
═══════════════════════════════════ */

export default function App() {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState({});
  const [ck, setCk]   = useState({});
  const tog = k => setOpen(p => ({...p,[k]:!p[k]}));
  const chk = k => setCk(p => ({...p,[k]:!p[k]}));

  const Chip = ({c,children}) => (
    <span className="chip" style={{color:c,borderColor:c+"55",background:c+"12"}}>{children}</span>
  );

  const CodeBlock = ({code,id,lang="ts",maxH=440}) => (
    <div>
      <button onClick={()=>tog(id)} style={{
        padding:"5px 12px",background:"transparent",cursor:"pointer",
        border:`1px solid var(--line2)`,borderRadius:4,
        color:"var(--burn2)",fontFamily:"'Azeret Mono',monospace",
        fontSize:8,letterSpacing:2,marginBottom:6,
        textTransform:"uppercase",display:"block"
      }}>
        {open[id]?"▲ VERBERG":"▼ CODE"} {lang.toUpperCase()}
      </button>
      {open[id] && (
        <div className="code" style={{maxHeight:maxH}}>{code}</div>
      )}
    </div>
  );

  return (
    <div style={{background:"var(--ink)",minHeight:"100vh",position:"relative"}}>
      <style>{G}</style>
      <div className="scanline"/>

      {/* TICKER */}
      <div style={{background:"var(--paper)",borderBottom:"1px solid var(--line)",
        padding:"4px 0",overflow:"hidden"}}>
        <div style={{display:"flex",animation:"ticker 32s linear infinite",whiteSpace:"nowrap"}}>
          {["WEBGPU RENDERER","BETTER THAN ROBLOX","STRIKE LIGHTNING",
            "XRPL STABLECOIN","EUR USD CNY","MVP SPRINT PLAN",
            "GTAO + SSR + BLOOM","HEDERA HTS","XRPL AMM",
            "WEBGPU RENDERER","BETTER THAN ROBLOX","STRIKE LIGHTNING",
          ].map((t,i)=>(
            <span key={i} style={{fontFamily:"'Azeret Mono',monospace",fontSize:8,
              color:"var(--line2)",padding:"0 20px",letterSpacing:2}}>◆ {t}</span>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <div className="hdr" style={{paddingTop:0,paddingBottom:0}}>
        <div style={{display:"flex",alignItems:"center",gap:16,paddingTop:12,paddingBottom:4}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
              fontSize:20,color:"var(--burn3)",letterSpacing:1,lineHeight:1,
              filter:"drop-shadow(0 0 10px rgba(224,112,32,.35))"}}>
              MOLGANG
            </div>
            <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:8,
              letterSpacing:3,color:"var(--muted)",textTransform:"uppercase",marginTop:2}}>
              // MVP Developer Master Plan
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["WebGPU","#4080c0"],["Strike","#f59e0b"],["XRPL","#50c0a0"],
              ["Hedera","#e07020"],["MiCA","#c04080"]].map(([l,c])=>(
              <Chip key={l} c={c}>{l}</Chip>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:0,borderBottom:"1px solid var(--line)",overflowX:"auto"}}>
          {TABS.map((t,i)=>(
            <button key={t} className={`tab${tab===i?" on":""}`} onClick={()=>setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{height:"calc(100vh - 116px)",overflowY:"auto",position:"relative",zIndex:1}}>
      <div className="content" style={{padding:"28px 28px 64px",maxWidth:900,margin:"0 auto"}}>

      {/* ══════ TAB 0: MVP ROADMAP ══════ */}
      {tab===0 && (
        <div className="fi">
          <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
            fontSize:"clamp(22px,4vw,52px)",color:"var(--burn3)",lineHeight:.88,
            marginBottom:20,letterSpacing:-1}}>
            BETER DAN<br/>
            <span style={{color:"var(--text)"}}>ROBLOX.</span>
          </div>
          <div style={{fontSize:12,color:"var(--muted)",marginBottom:28,maxWidth:580,lineHeight:1.9}}>
            5 fases van MVP naar volledige deployment. Fase 1 en 2 draaien parallel.
            Strike integratie in fase 4 — geen licentie nodig. XRP Gateway is
            optionele fase 5 voor gevorderde ontwikkelaars.
          </div>

          {/* WAAROM BETER DAN ROBLOX */}
          <div className="card" style={{marginBottom:20}}>
            <div className="ch">
              <span style={{fontSize:18}}>🏆</span>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:16,
                color:"var(--burn3)"}}>Waarom het beter wordt dan Roblox</div>
            </div>
            <div className="cb">
              <div style={{overflowX:"auto"}}>
                <table className="t">
                  <thead><tr>
                    {["Technologie","Roblox Future Lighting","Molgang Web (Ons)","Verschil"].map(h=><th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {[
                      ["Anti-Aliasing","MSAA 4x","SMAA (Subpixel Morphological)","✅ Scherpere edges"],
                      ["Ambient Occlusion","SSAO","GTAO (Ground Truth AO)","✅ Fysisch correct"],
                      ["Reflecties","Cube map approximations","SSR (Screen Space Reflections)","✅ Dynamische reflecties"],
                      ["God-Rays","Geen","Volumetrisch raymarching GLSL","✅ Echt volumetrisch"],
                      ["Shadow Maps","ShadowMap basic","VSM (Variance Shadow Maps)","✅ Zachtere schaduwen"],
                      ["HDR Lighting","Roblox sky system","RGBE HDR per zone (4K)","✅ Fotorealistisch"],
                      ["Tonemapping","Roblox default","ACESFilmic","✅ Cinema-kwaliteit"],
                      ["GPU Pipeline","Fixed Roblox pipeline","WebGPU custom WGSL shaders","✅ Volledige controle"],
                      ["Chromatic Aberration","Niet beschikbaar","Custom fragment shader","✅ Film lens effect"],
                      ["Particle System","Roblox Particles (beperkt)","Custom WGSL compute shaders","✅ Miljoenen deeltjes"],
                    ].map((r,i)=>(
                      <tr key={i}>
                        <td>{r[0]}</td>
                        <td style={{color:"var(--muted)"}}>{r[1]}</td>
                        <td style={{color:"var(--burn2)"}}>{r[2]}</td>
                        <td style={{color:"var(--grass)"}}>{r[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* FASE CARDS */}
          {PHASES.map((phase,pi)=>(
            <div key={phase.n} className="phase"
              style={{borderLeftColor:phase.col,marginBottom:12}}>
              <div style={{padding:"14px 18px",background:`${phase.col}0a`,
                borderBottom:"1px solid var(--line)",display:"flex",gap:12,alignItems:"center"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
                  fontSize:32,color:phase.col,opacity:.2,lineHeight:1}}>{phase.n}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,
                    fontSize:18,color:phase.col}}>{phase.title}</div>
                  <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,
                    color:"var(--muted)",marginTop:2}}>{phase.weeks}</div>
                </div>
                <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,
                  color:phase.col,textAlign:"right",maxWidth:280,lineHeight:1.4}}>
                  {phase.deliverable}
                </div>
              </div>
              <div style={{padding:"10px 18px"}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {phase.tech.map(t=><Chip key={t} c={phase.col}>{t}</Chip>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:4}}>
                  {phase.tasks.map((task,i)=>(
                    <div key={i} onClick={()=>chk(`${pi}-${i}`)}
                      style={{display:"flex",gap:8,padding:"4px 8px",
                        borderRadius:4,cursor:"pointer",
                        background:ck[`${pi}-${i}`]?`${phase.col}12`:"transparent"}}>
                      <div style={{width:14,height:14,borderRadius:2,flexShrink:0,marginTop:2,
                        border:`1px solid ${ck[`${pi}-${i}`]?phase.col:"var(--line2)"}`,
                        background:ck[`${pi}-${i}`]?`${phase.col}25`:"transparent",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {ck[`${pi}-${i}`]&&<span style={{fontSize:8,color:phase.col}}>✓</span>}
                      </div>
                      <div style={{fontSize:11,fontFamily:"'Azeret Mono',monospace",
                        color:ck[`${pi}-${i}`]?phase.col:"var(--muted)",lineHeight:1.5}}>
                        {task}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Progress bar */}
                <div className="pbar" style={{marginTop:8}}>
                  <div className="pfill" style={{
                    width:`${(phase.tasks.filter((_,i)=>ck[`${pi}-${i}`]).length/phase.tasks.length)*100}%`,
                    background:phase.col
                  }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════ TAB 1: 3D ENGINE ══════ */}
      {tab===1 && (
        <div className="fi">
          <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
            fontSize:"clamp(22px,4vw,48px)",color:"var(--burn3)",lineHeight:.88,
            marginBottom:20}}>
            WEBGPU RENDERER.<br/>
            <span style={{color:"#50a060"}}>BETER DAN</span>
            <span style={{color:"var(--text)"}}> ROBLOX.</span>
          </div>

          <div className="warn wa" style={{marginBottom:20}}>
            <span>⚙️</span>
            <div>
              <strong>WebGPU vereist: Chrome 113+, Edge 113+, Firefox Nightly (2025).</strong>
              Three.js r168 heeft een automatische WebGL2 fallback — het systeem detecteert
              de beste renderer per bezoeker. WebGPU geeft 2-3× betere GPU-benutting
              door direct toegang tot compute shaders (WGSL).
            </div>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <div className="ch">
              <span style={{fontSize:18}}>🎨</span>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:"var(--burn3)"}}>
                  renderer-setup.ts
                </div>
                <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"var(--muted)"}}>
                  WebGPU + WebGL2 fallback · Post-processing pipeline · God-rays shader
                </div>
              </div>
            </div>
            <div className="cb">
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,
                  color:"var(--muted)",letterSpacing:2,marginBottom:8}}>// NPM INSTALLATIE</div>
                <div className="code" style={{maxHeight:80}}>{`npm install three@0.168.0
npm install -D @types/three
npm install postprocessing   # extra effects

# WebGPU support (three.js ingebouwd)
# Geen extra package nodig voor WebGPU renderer`}
                </div>
              </div>

              <CodeBlock code={WEBGPU_CODE} id="webgpu" lang="ts" maxH={500}/>
            </div>
          </div>

          {/* SHADER MATERIALS */}
          <div className="card" style={{marginBottom:16}}>
            <div className="ch">
              <span>🔮</span>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:"#4080c0"}}>
                Custom WGSL / GLSL Shaders
              </div>
            </div>
            <div className="cb">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                {[
                  {t:"Slag Metaal PBR",col:"#e07020",
                   features:["Procedurele roest textuur via noise","Temperature-based emission (gloeiend metaal)","Sub-surface scattering voor oxidatie-laag","Roughness map via voronoi noise"]},
                  {t:"Quantum Dot Emitter",col:"#4080c0",
                   features:["Emissive wavelength = Brus equation","Particle trail van emissie-foton","Glitch/blink effect bij lage coherentie","Bloom-amplitude via energy level"]},
                  {t:"Vanadium Crystal",col:"#50a060",
                   features:["Anisotropic specular (kristalrooster)","Birefringence shader (dubbele breking)","UV fluorescence bij blacklight zone","Triplanar texture mapping"]},
                  {t:"Water/Acid Pool",col:"#c04080",
                   features:["FFT-based ocean shader (JONSWAP)","Caustics projection van acid surface","Foam mask via velocity buffer","Chemical bubble particle system"]},
                ].map(s=>(
                  <div key={s.t} style={{background:"var(--ink)",borderRadius:6,
                    border:`1px solid ${s.col}44`,padding:12}}>
                    <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,
                      color:s.col,marginBottom:8}}>{s.t}</div>
                    {s.features.map((f,i)=>(
                      <div key={i} style={{display:"flex",gap:6,marginBottom:4}}>
                        <span style={{color:s.col,flexShrink:0}}>›</span>
                        <div style={{fontSize:10,color:"var(--muted)"}}>{f}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="warn wb">
                <span>💡</span>
                <div>
                  <strong>Aanbevolen 3D model workflow:</strong> Blender 4.x (gratis) →
                  export als GLTF 2.0 + Draco compression. Texturen als WEBP (50% kleiner dan PNG).
                  HDR environments van <a style={{color:"var(--burn2)"}} href="https://polyhaven.com">polyhaven.com</a> (gratis CC0).
                  Karakter rig: Mixamo (gratis) → re-export via Blender.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ TAB 2: STRIKE NODE ══════ */}
      {tab===2 && (
        <div className="fi">
          <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
            fontSize:"clamp(22px,4vw,48px)",color:"#f59e0b",lineHeight:.88,
            marginBottom:20}}>
            STRIKE API.<br/>
            <span style={{color:"var(--text)"}}>GEEN EIGEN LICENTIE.</span>
          </div>

          <div className="warn wg" style={{marginBottom:20}}>
            <span>✅</span>
            <div>
              <strong>Strategisch voordeel Strike:</strong> Strike is een gereguleerde CASP
              (BitLicense NY + FinCEN MSB + EU regulatory sandbox).
              EHMAC B.V. is <em>merchant/partner</em> — geen CASP-licentie vereist.
              Strike verwerkt de compliance. Kosten: 0-1% per transactie.
              API docs: <span style={{color:"#f59e0b"}}>developer.strike.me</span>
            </div>
          </div>

          {/* SETUP STAPPEN */}
          <div className="card" style={{marginBottom:16}}>
            <div className="ch">
              <span>⚡</span>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:"#f59e0b"}}>
                Strike Account Setup (5 stappen)
              </div>
            </div>
            <div className="cb">
              {[
                {n:"01",t:"Business Account Aanmaken",
                 b:<>Ga naar <code>developer.strike.me</code> → "Get Started" → Business account.
                 Vul in: EHMAC B.V., KVK 93406797, IBAN NL... , website molgang.app.
                 Wacht 1-3 werkdagen op goedkeuring.</>},
                {n:"02",t:"API Key Genereren",
                 b:<>Dashboard → Settings → API Keys → "Create New Key".
                 Permissions: <code>payments:read</code>, <code>payments:write</code>, <code>quotes:write</code>.
                 Sla op: <code>wrangler secret put STRIKE_API_KEY</code></>,
                },
                {n:"03",t:"Webhook Configureren",
                 b:<>Dashboard → Webhooks → "Add Endpoint".
                 URL: <code>https://bridge.molgang.app/v1/strike-webhook</code>.
                 Events: payment.created, payment.updated.
                 <code>wrangler secret put STRIKE_WEBHOOK_SECRET</code></>,
                },
                {n:"04",t:"Sandbox Testen",
                 b:<>Gebruik <code>sandbox.api.strike.me</code> voor test-transacties.
                 Test Lightning wallet: Phoenix (iOS/Android) op testnet.
                 Stuur test-payment → verifieer webhook → controleer DAC8 log.</>,
                },
                {n:"05",t:"Productie Inschakelen",
                 b:<>Strike team koppelt sandbox account aan live account na review.
                 Minimum uitbetalingslimiet: $1 (geen minimum).
                 Maandelijks volume: contact Strike Business voor custom tier.</>,
                },
              ].map(s=>(
                <div key={s.n} style={{display:"flex",gap:14,padding:"12px 0",
                  borderBottom:"1px solid var(--line)"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
                    fontSize:28,color:"#f59e0b",opacity:.2,lineHeight:1,flexShrink:0,width:36}}>
                    {s.n}
                  </div>
                  <div>
                    <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,
                      color:"#f59e0b",marginBottom:4}}>{s.t}</div>
                    <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>{s.b}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <div className="ch">
              <span>🔧</span>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:"#f59e0b"}}>
                strike-integration.ts
              </div>
            </div>
            <div className="cb">
              <CodeBlock code={STRIKE_CODE} id="strike" lang="ts" maxH={520}/>
            </div>
          </div>

          {/* LIMIETEN */}
          <div className="card">
            <div className="ch">
              <span>📊</span>
              <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"var(--muted)"}}>
                Strike limieten + alternatieven
              </div>
            </div>
            <div className="cb">
              <table className="t">
                <thead><tr>{["Provider","Licentie","Fee","Limiet/mnd","Geschikt voor"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {[
                    ["Strike","Eigen CASP","0-1%","Onbeperkt","MVP → Scale"],
                    ["OpenNode","MSB + CASP","1%","$1M+","Backup provider"],
                    ["Bitpay","Diverse licenties","1%","Custom","Enterprise backup"],
                    ["Eigen LN Node","CASP vereist","0.01-0.1%","Onbeperkt","Fase 5+"],
                  ].map((r,i)=>(
                    <tr key={i}>
                      <td style={{color:i===0?"#f59e0b":undefined}}>{r[0]}</td>
                      <td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td>
                      <td style={{color:i===0?"var(--grass)":undefined}}>{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════ TAB 3: XRP GATEWAY ══════ */}
      {tab===3 && (
        <div className="fi">
          <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
            fontSize:"clamp(22px,4vw,44px)",color:"#50c0a0",lineHeight:.88,
            marginBottom:20}}>
            XRP GATEWAY.<br/>
            <span style={{color:"var(--text)"}}>EUR · USD · CNY.</span>
          </div>

          <div className="warn wr" style={{marginBottom:20}}>
            <span>⚠️</span>
            <div>
              <strong>Geavanceerd — alleen voor ervaren blockchain-ontwikkelaars.</strong>
              Een eigen XRPL gateway vereist een DNB-melding als betaalinstelling
              boven €3M/jaar omzet (art. 2:3a Wft). Kleiner volume: melden als 
              "beperkte betaaldienst". Start altijd op XRPL Testnet.
              Geschatte setup-tijd: 3-6 weken voor een competente ontwikkelaar.
            </div>
          </div>

          {/* ARCHITECTUUR DIAGRAM */}
          <div className="card" style={{marginBottom:16}}>
            <div className="ch">
              <span>🏗</span>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:"#50c0a0"}}>
                Gateway Architectuur
              </div>
            </div>
            <div className="cb">
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:16}}>
                {[
                  {t:"Klant",sub:"SEPA / WeChat / Wire",col:"#e07020"},
                  {t:"→"},
                  {t:"EHMAC\nHot Wallet",sub:"Online operaties",col:"#50c0a0"},
                  {t:"→"},
                  {t:"XRPL\nAMM Pool",sub:"MOL / EUR.EHMAC",col:"#4080c0"},
                  {t:"→"},
                  {t:"EHMAC\nCold Wallet",sub:"Issuer (OFFLINE)",col:"#c04080"},
                ].map((n,i)=>
                  n.t==="→" ? (
                    <div key={i} className="arrow-right">→</div>
                  ) : (
                    <div key={i} className="node" style={{
                      border:`1px solid ${n.col}44`,color:n.col,
                      flex:1,minWidth:100,whiteSpace:"pre"}}>
                      <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10}}>{n.t}</div>
                      {n.sub && <div style={{fontSize:8,color:"var(--muted)",marginTop:4}}>{n.sub}</div>}
                    </div>
                  )
                )}
              </div>

              {/* EUR/USD/CNY flows */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                {[
                  {cur:"EUR",flag:"🇪🇺",method:"SEPA / iDEAL / Wise API",corridor:"Direct NL bank",col:"#4080c0"},
                  {cur:"USD",flag:"🇺🇸",method:"Wire / ACH / Stripe",corridor:"Bitstamp OTC desk",col:"#50c0a0"},
                  {cur:"CNY",flag:"🇨🇳",method:"Alipay / WeChat Pay / CIPS",corridor:"BitoEX / B2BinPay XRPL",col:"#e07020"},
                ].map(c=>(
                  <div key={c.cur} style={{background:"var(--ink)",borderRadius:6,
                    border:`1px solid ${c.col}33`,padding:12}}>
                    <div style={{fontSize:20,marginBottom:4}}>{c.flag}</div>
                    <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:12,color:c.col}}>{c.cur}</div>
                    <div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>{c.method}</div>
                    <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,
                      color:"var(--muted)",marginTop:2}}>Corridor: {c.corridor}</div>
                  </div>
                ))}
              </div>

              <CodeBlock code={XRP_CODE} id="xrp" lang="ts" maxH={520}/>
            </div>
          </div>

          {/* Vergelijking: Strike vs eigen XRPL */}
          <div className="card">
            <div className="ch">
              <span>⚖️</span>
              <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"var(--muted)"}}>
                Strike vs Eigen XRPL Gateway: wanneer upgraden?
              </div>
            </div>
            <div className="cb">
              <table className="t">
                <thead><tr>{["Criterium","Strike (eenvoudig)","Eigen XRPL (geavanceerd)"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {[
                    ["Setup tijd","2-3 dagen","3-6 weken"],
                    ["Licentie","Strike draagt het","DNB melden boven €3M/j"],
                    ["Valuta","BTC (Lightning)","EUR + USD + CNY + XRP"],
                    ["Fee","0-1%","0.01-0.3% + XRPL ledger"],
                    ["Volume limiet","Custom via Strike","Onbeperkt"],
                    ["CNY support","Nee","Ja (via BitoEX/B2BinPay)"],
                    ["Wanneer kiezen","MVP → €1M/jaar","Boven €1M/jaar of CNY vereist"],
                  ].map((r,i)=>(
                    <tr key={i}>
                      <td>{r[0]}</td>
                      <td style={{color:"#f59e0b"}}>{r[1]}</td>
                      <td style={{color:"#50c0a0"}}>{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════ TAB 4: INFRA ══════ */}
      {tab===4 && (
        <div className="fi">
          <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
            fontSize:"clamp(22px,4vw,44px)",color:"var(--text)",lineHeight:.88,
            marginBottom:20}}>
            INFRA.<br/>
            <span style={{color:"var(--burn3)"}}>€72/MAAND.</span>
          </div>
          <div className="code" style={{maxHeight:520}}>{INFRA_CODE}</div>
        </div>
      )}

      {/* ══════ TAB 5: SPRINTS ══════ */}
      {tab===5 && (
        <div className="fi">
          <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
            fontSize:"clamp(22px,4vw,44px)",color:"var(--text)",lineHeight:.88,
            marginBottom:20}}>
            SPRINT PLAN.<br/>
            <span style={{color:"var(--burn3)"}}>14 WEKEN.</span>
          </div>

          <div style={{overflowX:"auto",marginBottom:20}}>
            <table className="t" style={{minWidth:640}}>
              <thead><tr>{["Week","Focus","Deliverable","Owner","Priority"].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {[
                  ["1","Vite + Three.js r168 project setup","Eerste 3D scene draait in browser","Frontend Dev","🔴 Critical"],
                  ["1","Supabase + Cloudflare Worker setup","Database schema + API skeleton","Backend Dev","🔴 Critical"],
                  ["2","WebGPU renderer + WebGL2 fallback","Automatische renderer detectie","Frontend Dev","🔴 Critical"],
                  ["2","Screenshot OCR endpoint","POST /api/upload-screenshot werkend","Backend Dev","🔴 Critical"],
                  ["3","Character GLTF loader + animaties","Idle/walk animatie in browser","Frontend Dev","🟠 High"],
                  ["3","JWT sessie flow","Screenshot → JWT → game start","Backend Dev","🔴 Critical"],
                  ["4","HDR lighting + tonemapping","Fotorealistische verlichting zaandam","Frontend Dev","🟠 High"],
                  ["4","GTAO + Bloom post-processing","Visueel beter dan Roblox screenshot","Frontend Dev","🟠 High"],
                  ["5","God-rays volumetrisch shader","Custom GLSL in Three.js ShaderPass","3D Shader Dev","🟡 Medium"],
                  ["5","Hedera testnet: NFT mint","MOLNFT token mint werkend","Blockchain Dev","🟠 High"],
                  ["6","NFT 3D items op karakter","Equipped items zichtbaar in game","Frontend Dev","🟡 Medium"],
                  ["6","SSR + VSM shadows","Dynamische reflecties + zachte schaduwen","3D Shader Dev","🟡 Medium"],
                  ["7","Landing page + SEO","JSON-LD, hreflang, og:image","Frontend Dev","🟠 High"],
                  ["7","5-zone wereld: basis geometry","Alle 5 zones toegankelijk","Frontend Dev","🟡 Medium"],
                  ["8","Strike API sandbox integratie","Test Lightning payout €0.01","Backend Dev","🔴 Critical"],
                  ["8","KYC document upload flow","Roblox screenshot + betaalbewijs","Backend Dev","🔴 Critical"],
                  ["9","Strike productie go-live","Eerste echte Lightning uitbetaling","Backend Dev","🔴 Critical"],
                  ["9","DAC8 transactie logging","Compliance audit trail","Backend Dev","🟠 High"],
                  ["10","WebSocket multiplayer sync","2-4 spelers tegelijk","Backend Dev","🟡 Medium"],
                  ["10","Quantum zone shader","Cryogeen + quantum dot particles","3D Shader Dev","🟡 Medium"],
                  ["11","XRP testnet gateway setup","EUR.EHMAC IOU op testnet","Blockchain Dev","🟡 Medium"],
                  ["11","Performance optimalisatie","60fps op RTX 3060 + 30fps laptop","Frontend Dev","🟠 High"],
                  ["12","XRP mainnet gateway","Eerste EUR.EHMAC mint op mainnet","Blockchain Dev","🟡 Medium"],
                  ["12","Mobile web testing","WebGL2 op iOS Safari + Android Chrome","QA","🟠 High"],
                  ["13","XRPL AMM pool aanmaken","MOL/EUR.EHMAC liquiditeit","Blockchain Dev","🟡 Medium"],
                  ["13","Security audit","Pen test API endpoints","Security","🔴 Critical"],
                  ["14","Soft launch (invite-only)","100 beta spelers","Product","🔴 Critical"],
                  ["14","Monitoring + error tracking","Sentry + Cloudflare Analytics","DevOps","🟠 High"],
                ].map((r,i)=>(
                  <tr key={i}>
                    <td style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"var(--burn2)"}}>{r[0]}</td>
                    <td>{r[1]}</td>
                    <td style={{color:"var(--text)",fontSize:11}}>{r[2]}</td>
                    <td style={{fontSize:10}}>{r[3]}</td>
                    <td style={{fontSize:10}}>{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Team rollen */}
          <div className="card">
            <div className="ch">
              <span>👥</span>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,color:"var(--burn3)"}}>
                Minimaal team (via Slag B.V. / DUBV)
              </div>
            </div>
            <div className="cb">
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
                {[
                  {rol:"Frontend / 3D Dev",rate:"€65-85/u",scope:"Three.js, WebGPU, shaders, GLTF, UI",uren:"80u/fase",col:"#e07020"},
                  {rol:"Backend Dev",rate:"€55-70/u",scope:"Cloudflare Workers, Node.js, OCR, JWT, Strike API",uren:"60u/fase",col:"#4080c0"},
                  {rol:"Blockchain Dev",rate:"€75-95/u",scope:"Hedera SDK, XRPL, smart contracts, NFT",uren:"40u/fase",col:"#50c0a0"},
                  {rol:"3D Artist / Shader",rate:"€50-65/u",scope:"Blender, PBR materialen, GLSL shaders",uren:"30u/fase",col:"#c04080"},
                ].map(r=>(
                  <div key={r.rol} style={{background:"var(--ink)",borderRadius:6,
                    border:`1px solid ${r.col}33`,padding:12}}>
                    <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,
                      color:r.col,marginBottom:6}}>{r.rol}</div>
                    <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,
                      color:"var(--burn3)",marginBottom:4}}>{r.rate}</div>
                    <div style={{fontSize:10,color:"var(--muted)",marginBottom:4}}>{r.scope}</div>
                    <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,
                      color:"var(--muted)"}}>Richtlijn: {r.uren}</div>
                  </div>
                ))}
              </div>

              <div className="warn wa" style={{marginTop:14}}>
                <span>💰</span>
                <div>
                  <strong>Budget indicatie MVP (fasen 1-4, 10 weken):</strong>
                  Frontend 3D Dev: 80u × €75 = €6.000 ·
                  Backend Dev: 60u × €62 = €3.720 ·
                  Blockchain Dev: 40u × €85 = €3.400 ·
                  Infra: €72/mnd × 3 = €216.
                  <strong> Totaal MVP: ~€13.336 excl. BTW.</strong>
                  Slag B.V. factureert aan EHMAC B.V. — IP-overdrachtsakte vereist.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
      </div>
    </div>
  );
}
