import { useState, useRef, useCallback, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
   MOLGANG — WITHDRAWAL VERIFICATION PORTAL
   KYC · Roblox Proof · Payment Proof · Lightning BTC Payout
   Indirect: Robux → MOLNFT → sats via Hedera buyback
   MiCA / AMLD6 Compliant
═══════════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #0b0d11;
  --surface:   #11141a;
  --border:    #1c2030;
  --border2:   #242840;
  --text:      #c8cfe0;
  --muted:     #485070;
  --gold:      #c8960a;
  --gold-l:    #f0b830;
  --gold-dim:  rgba(200,150,10,.12);
  --green:     #22c55e;
  --green-dim: rgba(34,197,94,.10);
  --red:       #ef4444;
  --red-dim:   rgba(239,68,68,.10);
  --blue:      #3b82f6;
  --blue-dim:  rgba(59,130,246,.10);
  --amber:     #f59e0b;
}

html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  overflow-x: hidden;
}
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

/* noise texture overlay */
body::before {
  content: '';
  position: fixed; inset: 0;
  opacity: .025;
  pointer-events: none;
  z-index: 9999;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px;
}

@keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
@keyframes pulse  { 0%,100% { box-shadow:0 0 0 0 rgba(200,150,10,.3) } 50% { box-shadow:0 0 0 8px transparent } }
@keyframes spin   { to { transform: rotate(360deg) } }
@keyframes shimmer {
  0%   { background-position: -400px 0 }
  100% { background-position:  400px 0 }
}
@keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.3} }

.fade-up { animation: fadeUp .4s ease both; }
.pulse   { animation: pulse 2.5s ease infinite; }
.spin    { animation: spin .9s linear infinite; }
.blink   { animation: blink 1.4s ease infinite; }

/* ── LAYOUT ───────────────────────────────────────────────── */
.shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
}

.header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 28px;
  height: 58px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky; top: 0; z-index: 100;
}

.content {
  padding: 32px 28px 64px;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
}

/* ── CARDS ────────────────────────────────────────────────── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-body { padding: 20px; }

/* ── STEP INDICATOR ──────────────────────────────────────── */
.step-row {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 32px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.step {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}

.step-circle {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 2px solid var(--border2);
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: var(--muted);
  background: var(--surface);
  transition: all .25s;
  flex-shrink: 0;
}

.step-circle.done {
  border-color: var(--green);
  color: var(--green);
  background: var(--green-dim);
}

.step-circle.active {
  border-color: var(--gold);
  color: var(--gold-l);
  background: var(--gold-dim);
  box-shadow: 0 0 0 4px rgba(200,150,10,.12);
}

.step-label {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 10px;
  white-space: nowrap;
}

.step-label.active { color: var(--gold-l); }
.step-label.done   { color: var(--green); }

.step-line {
  width: 32px; height: 1px;
  background: var(--border2);
  flex-shrink: 0;
}

.step-line.done { background: var(--green); }

/* ── UPLOAD ZONE ─────────────────────────────────────────── */
.upload-zone {
  border: 2px dashed var(--border2);
  border-radius: 10px;
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: all .2s;
  background: transparent;
}

.upload-zone:hover, .upload-zone.dragging {
  border-color: var(--gold);
  background: var(--gold-dim);
}

.upload-zone.filled {
  border-style: solid;
  border-color: var(--green);
  background: var(--green-dim);
}

/* ── INPUTS ───────────────────────────────────────────────── */
input, select {
  background: var(--bg);
  border: 1px solid var(--border2);
  border-radius: 8px;
  color: var(--text);
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  padding: 10px 14px;
  width: 100%;
  transition: border-color .2s;
  outline: none;
}

input:focus, select:focus { border-color: var(--gold); }
input::placeholder { color: var(--muted); }

label.field-label {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
  margin-bottom: 6px;
}

/* ── BUTTONS ──────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  border: none;
  transition: all .2s;
  white-space: nowrap;
}

.btn-gold {
  background: var(--gold);
  color: #0b0d11;
  font-weight: 600;
}
.btn-gold:hover { background: var(--gold-l); transform: translateY(-1px); }
.btn-gold:disabled { opacity: .4; cursor: not-allowed; transform: none; }

.btn-outline {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border2);
}
.btn-outline:hover { border-color: var(--gold); color: var(--gold-l); }

/* ── BADGE ────────────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 99px;
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid;
}

.badge-gold   { color:var(--gold-l); border-color:rgba(200,150,10,.3); background:var(--gold-dim); }
.badge-green  { color:var(--green);  border-color:rgba(34,197,94,.3);  background:var(--green-dim); }
.badge-red    { color:var(--red);    border-color:rgba(239,68,68,.3);  background:var(--red-dim); }
.badge-blue   { color:var(--blue);   border-color:rgba(59,130,246,.3); background:var(--blue-dim); }
.badge-muted  { color:var(--muted);  border-color:var(--border2);      background:transparent; }

/* ── WARN BOX ─────────────────────────────────────────────── */
.warn {
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  line-height: 1.6;
}
.warn-amber { background:#1a1200; border:1px solid #3a2800; color:#c0a060; }
.warn-red   { background:#140606; border:1px solid #3a0e0e; color:#c07070; }
.warn-blue  { background:#060c18; border:1px solid #0e2040; color:#6090c0; }
.warn-green { background:#060f09; border:1px solid #0e2a14; color:#60a060; }

/* ── TABLE ────────────────────────────────────────────────── */
table.t { width:100%; border-collapse:collapse; }
table.t th {
  font-family:'DM Mono',monospace; font-size:8px; letter-spacing:2px;
  text-transform:uppercase; color:var(--muted);
  padding:8px 12px; text-align:left;
  border-bottom:1px solid var(--border); background:var(--bg);
}
table.t td {
  padding:9px 12px; font-size:12px;
  border-bottom:1px solid var(--border);
  font-family:'DM Mono',monospace; color:var(--muted);
}
table.t tr:last-child td { border-bottom:none; }
table.t tr:hover td { background:rgba(255,255,255,.02); }
table.t td:first-child { color:var(--text); }

/* ── TIMELINE ─────────────────────────────────────────────── */
.timeline { position:relative; padding-left:24px; }
.timeline::before {
  content:''; position:absolute; left:6px; top:8px; bottom:8px;
  width:1px; background:var(--border2);
}
.tl-item {
  position:relative; padding-bottom:20px;
}
.tl-dot {
  position:absolute; left:-21px; top:4px;
  width:12px; height:12px; border-radius:50%;
  border:2px solid; display:flex; align-items:center; justify-content:center;
}
.tl-dot-gold  { border-color:var(--gold);  background:var(--gold-dim); }
.tl-dot-green { border-color:var(--green); background:var(--green-dim); }
.tl-dot-muted { border-color:var(--border2); background:var(--bg); }

/* ── CALC DISPLAY ─────────────────────────────────────────── */
.calc-row {
  display:flex; justify-content:space-between; align-items:center;
  padding:9px 0; border-bottom:1px solid var(--border);
  font-family:'DM Mono',monospace; font-size:12px;
}
.calc-row:last-child { border-bottom:none; }
.calc-row .label { color:var(--muted); font-size:11px; }
.calc-row .value { color:var(--text); }
.calc-row .total { color:var(--gold-l); font-size:14px; font-weight:600; }

/* ── LIGHTNING ────────────────────────────────────────────── */
.ln-invoice {
  background:var(--bg); border:1px solid var(--border2);
  border-radius:8px; padding:12px 14px;
  font-family:'DM Mono',monospace; font-size:10px;
  color:var(--muted); word-break:break-all; line-height:1.6;
}

/* ── COMPLIANCE BOX ───────────────────────────────────────── */
.compliance-item {
  display:flex; gap:10px; padding:10px 0;
  border-bottom:1px solid var(--border);
}
.compliance-item:last-child { border-bottom:none; }
.ci-icon { font-size:16px; flex-shrink:0; margin-top:1px; }
.ci-text { font-size:11px; color:var(--muted); line-height:1.6; }
.ci-text strong { color:var(--text); font-weight:500; }

/* ── RESPONSIVE ───────────────────────────────────────────── */
@media(max-width:640px) {
  .content { padding:20px 16px 48px; }
  .header  { padding:0 16px; }
  .step-label { display:none; }
}
`;

// ── CONSTANTS ──────────────────────────────────────────────────────

const STEPS = [
  { n:"01", label:"NFT Balans" },
  { n:"02", label:"Roblox Bewijs" },
  { n:"03", label:"Betaalbewijs" },
  { n:"04", label:"KYC Identiteit" },
  { n:"05", label:"Uitbetaling" },
];

// Conversie paramters (indicatief)
const MOL_USD   = 0.044;   // 1 MOL = $0.044 (1 mmol CO₂-equivalent)
const BTC_USD   = 97000;   // indicatieve BTC prijs
const LN_FEE    = 0.005;   // 0.5% Lightning routing fee
const KYC_FEE   = 0.015;   // 1.5% compliance fee
const MIN_SATS  = 10000;   // minimaal 10.000 sats (~$9.70)
const KYC_EUR_THRESHOLD = 1000; // AMLD6: verplichte KYC boven €1.000

function satsToBtc(sats) {
  return (sats / 1e8).toFixed(8);
}

function usdToSats(usd) {
  return Math.round((usd / BTC_USD) * 1e8);
}

function molToUsd(mol) {
  return mol * MOL_USD;
}

// ── UPLOAD COMPONENT ──────────────────────────────────────────────
function UploadZone({ label, hint, accept, value, onChange, icon }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  }, [onChange]);

  return (
    <div>
      <label className="field-label">{label}</label>
      <div
        className={`upload-zone${drag?" dragging":""}${value?" filled":""}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => ref.current.click()}
      >
        <input ref={ref} type="file" accept={accept}
          style={{ display:"none" }}
          onChange={e => onChange(e.target.files[0])} />
        {value ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{ fontSize:22 }}>✅</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"var(--green)" }}>
              {value.name}
            </div>
            <div style={{ fontSize:10, color:"var(--muted)" }}>
              {(value.size / 1024).toFixed(0)} KB · Klik om te wijzigen
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:28 }}>{icon}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"var(--muted)" }}>
              Sleep hier naartoe of klik
            </div>
            <div style={{ fontSize:10, color:"var(--muted)", opacity:.6 }}>{hint}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── STEP INDICATOR ────────────────────────────────────────────────
function StepIndicator({ current, steps }) {
  return (
    <div className="step-row">
      {steps.map((s, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="step" style={{ alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div className={`step-circle${done?" done":active?" active":""}`}>
                {done ? "✓" : s.n}
              </div>
              <div className={`step-label${done?" done":active?" active":""}`}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`step-line${done?" done":""}`}
                style={{ marginBottom:14, marginLeft:0, marginRight:0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── NFT WAARDE CALCULATOR ─────────────────────────────────────────
function ValueCalc({ molBalance, nftCount }) {
  const gross_usd = molToUsd(molBalance);
  const ln_fee    = gross_usd * LN_FEE;
  const kyc_fee   = gross_usd * KYC_FEE;
  const net_usd   = gross_usd - ln_fee - kyc_fee;
  const sats      = usdToSats(net_usd);
  const btc       = satsToBtc(sats);
  const eur       = (net_usd * 0.92).toFixed(2);

  return (
    <div style={{ marginBottom:0 }}>
      <div className="calc-row">
        <span className="label">MOL balance</span>
        <span className="value">{molBalance.toLocaleString()} mmol</span>
      </div>
      <div className="calc-row">
        <span className="label">Bruto waarde (à ${MOL_USD}/mmol)</span>
        <span className="value">${gross_usd.toFixed(2)}</span>
      </div>
      <div className="calc-row">
        <span className="label">Lightning routing fee ({(LN_FEE*100).toFixed(1)}%)</span>
        <span className="value" style={{ color:"var(--red)" }}>−${ln_fee.toFixed(2)}</span>
      </div>
      <div className="calc-row">
        <span className="label">KYC/compliance fee ({(KYC_FEE*100).toFixed(1)}%)</span>
        <span className="value" style={{ color:"var(--red)" }}>−${kyc_fee.toFixed(2)}</span>
      </div>
      <div className="calc-row">
        <span className="label">Netto USD</span>
        <span className="value">${net_usd.toFixed(2)} ≈ €{eur}</span>
      </div>
      <div className="calc-row">
        <span className="label">BTC (@ ${BTC_USD.toLocaleString()})</span>
        <span className="total">⚡ {sats.toLocaleString()} sats</span>
      </div>
      <div className="calc-row">
        <span className="label">= Bitcoin</span>
        <span className="value" style={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}>
          {btc} BTC
        </span>
      </div>
      {sats < MIN_SATS && (
        <div className="warn warn-red" style={{ marginTop:10 }}>
          <span>⚠️</span>
          <span>Minimum uitbetaling: {MIN_SATS.toLocaleString()} sats. 
          Huidig saldo te laag — blijf spelen om waarde op te bouwen.</span>
        </div>
      )}
    </div>
  );
}

// ── HOOFD APP ─────────────────────────────────────────────────────
export default function App() {
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState({
    hedera_account: "",
    roblox_user_id: "",
    mol_balance:    1432,
    nft_ids:        ["0.0.5647832:47","0.0.5647833:12"],
    // KYC fields
    full_name: "", dob: "", country: "", id_type: "passport",
    // Lightning
    ln_invoice: "",
    // Documents
    roblox_screenshot: null,
    payment_proof: null,
    id_document: null,
    selfie: null,
  });
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const gross_usd  = molToUsd(form.mol_balance);
  const eur_equiv  = gross_usd * 0.92;
  const needsFullKyc = eur_equiv >= KYC_EUR_THRESHOLD;

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div className="shell">
      <style>{CSS}</style>

      {/* HEADER */}
      <header className="header">
        <div style={{
          fontFamily:"'Syne',sans-serif", fontWeight:800,
          fontSize:16, letterSpacing:2, color:"var(--gold-l)",
          filter:"drop-shadow(0 0 8px rgba(200,150,10,.3))"
        }}>
          MOLGANG
        </div>
        <div style={{
          fontFamily:"'DM Mono',monospace", fontSize:8,
          letterSpacing:3, color:"var(--muted)", textTransform:"uppercase"
        }}>
          // Withdrawal Portal
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <span className="badge badge-gold">⚡ Lightning BTC</span>
          <span className="badge badge-blue">Hedera HTS</span>
          <span className="badge badge-muted">MiCA Compliant</span>
        </div>
      </header>

      <div className="content fade-up">

        {/* COMPLIANCE BANNER */}
        <div className="warn warn-amber" style={{ marginBottom:24 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>⚖️</span>
          <div>
            <strong>Regulated crypto withdrawal · MiCA / AMLD6 van toepassing</strong><br />
            MOLGANG verwerkt uitbetalingen via een CASP-gecertificeerde derde partij.
            Uitbetalingen boven <strong>€1.000 cumulatief</strong> vereisen volledige KYC.
            Dit systeem slaat geen payment-proof op na verificatie (privacy by design).
          </div>
        </div>

        {/* INDIRECT KETEN UITLEG */}
        <div className="card" style={{ marginBottom:24 }}>
          <div className="card-header">
            <span style={{ fontSize:16 }}>🔗</span>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>
                Indirecte Waardeketen
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"var(--muted)", letterSpacing:1 }}>
                ROBUX SPEND → MOLNFT → LIGHTNING BTC
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="timeline">
              {[
                { col:"tl-dot-gold", title:"Robux aankoop",
                  body:"Speler koopt Robux bij Roblox Inc. (fiat currency → Robux). Betaalbewijs = Roblox betaalafschrift of creditcard-statement met Roblox-transactie.", icon:"💳" },
                { col:"tl-dot-gold", title:"Gameplay → MOLNFT mining",
                  body:"Gespendeerde Robux worden gebruikt voor GamePasses / DevProducts in de MOLGANG experience. Gameplay-acties genereren MOLNFT-tokens op Hedera HTS ($0.02/mint).", icon:"🎮" },
                { col:"tl-dot-gold", title:"NFT waarde-opbouw",
                  body:"MOLNFT-tokens representeren gecertificeerde moleculaire massa-waarde (CO₂, vanadium, etc.). De interne MOL-prijs volgt de CaciTrack/FerroKalk productwaarde.", icon:"💎" },
                { col:"tl-dot-gold", title:"Buyback-aanvraag",
                  body:"Speler verzoekt EHMAC B.V. zijn MOLNFT terug te kopen. EHMAC betaalt de tegenwaarde in Lightning BTC. Dit is een 'buyback' (inkoop), geen exchange — onderscheid voor MiCA-classificatie.", icon:"↩️" },
                { col:"tl-dot-gold", title:"Lightning BTC uitbetaling",
                  body:"EHMAC betaalt via Lightning Network (sub-seconde, minimale fees). Speler ontvangt sats op zijn eigen wallet. EHMAC rapporteert de transactie conform AMLD6/DAC8.", icon:"⚡" },
              ].map((item, i) => (
                <div key={i} className="tl-item">
                  <div className={`tl-dot ${item.col}`} />
                  <div style={{ marginBottom:4 }}>
                    <span style={{ fontSize:13 }}>{item.icon}</span>
                    <span style={{
                      fontFamily:"'DM Mono',monospace", fontSize:11,
                      color:"var(--text)", marginLeft:8, fontWeight:500
                    }}>{item.title}</span>
                  </div>
                  <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.7 }}>
                    {item.body}
                  </div>
                </div>
              ))}
            </div>

            {/* Juridische noot */}
            <div className="warn warn-blue" style={{ marginTop:8 }}>
              <span>📋</span>
              <div>
                <strong>Juridische positionering:</strong> Het MOLNFT-buyback-model is gestructureerd als
                <em> inkoop van virtuele goederen</em>, niet als crypto-exchange. EHMAC B.V. als inkooppartij
                vereist geen CASP-vergunning indien de uitbetaling onder de
                €1.000-drempel blijft en de inkoopwaarde marktconform is (Transfer Pricing).
                Boven €1.000 geldt AMLD6 verplichte KYC + DAC8-rapportage.
              </div>
            </div>
          </div>
        </div>

        {/* STEP INDICATOR */}
        <StepIndicator current={step} steps={STEPS} />

        {/* ── STAP 0: NFT BALANS VERIFICATIE ── */}
        {step === 0 && (
          <div className="fade-up">
            <div className="card" style={{ marginBottom:16 }}>
              <div className="card-header">
                <span style={{ fontSize:16 }}>💎</span>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>
                    Hedera Account &amp; NFT Balans
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"var(--muted)" }}>
                    STAP 1 VAN 5 · ACCOUNT KOPPELING
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display:"grid", gap:16, marginBottom:20 }}>
                  <div>
                    <label className="field-label">Hedera Account ID</label>
                    <input placeholder="0.0.4729384"
                      value={form.hedera_account}
                      onChange={e => set("hedera_account", e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Roblox User ID</label>
                    <input placeholder="4729384"
                      value={form.roblox_user_id}
                      onChange={e => set("roblox_user_id", e.target.value)} />
                  </div>
                </div>

                {/* Live waarde preview */}
                <div style={{
                  background:"var(--bg)", borderRadius:10,
                  border:"1px solid var(--border2)", padding:16, marginBottom:16
                }}>
                  <div style={{
                    fontFamily:"'DM Mono',monospace", fontSize:9,
                    letterSpacing:2, color:"var(--muted)", marginBottom:12,
                    textTransform:"uppercase"
                  }}>
                    // Berekende uitbetalingswaarde
                  </div>
                  <ValueCalc molBalance={form.mol_balance} nftCount={form.nft_ids.length} />
                </div>

                {/* NFT overzicht */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
                    letterSpacing:2, color:"var(--muted)", marginBottom:8,
                    textTransform:"uppercase" }}>
                    // Geregistreerde NFTs (Hedera Mirror Node)
                  </div>
                  <table className="t">
                    <thead><tr>
                      {["Token ID","Serial","Type","Waarde (USD)","Status"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {[
                        ["0.0.5647832","#47","MOLNFT","$8.40","✅ Eigenaar"],
                        ["0.0.5647833","#12","MOLMAT-V","$3.20","✅ Eigenaar"],
                        ["0.0.5648901","#03","MOLNFT","$12.80","✅ Eigenaar"],
                      ].map((r,i) => (
                        <tr key={i}>
                          {r.map((c,j) => (
                            <td key={j} style={{
                              color: j===4 ? "var(--green)"
                                   : j===3 ? "var(--gold-l)"
                                   : j===2 ? "var(--blue)"
                                   : undefined
                            }}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {eur_equiv >= KYC_EUR_THRESHOLD && (
                  <div className="warn warn-amber">
                    <span>⚠️</span>
                    <span>
                      Waarde ≥ €{KYC_EUR_THRESHOLD}: <strong>Volledige KYC verplicht</strong> (AMLD6 Art. 13).
                      Stappen 3 en 4 omvatten ID-verificatie en selfie.
                    </span>
                  </div>
                )}

                <button className="btn btn-gold" style={{ marginTop:16, width:"100%" }}
                  onClick={() => setStep(1)}
                  disabled={!form.hedera_account}>
                  Verder → Roblox Screenshot Bewijs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STAP 1: ROBLOX SCREENSHOT ── */}
        {step === 1 && (
          <div className="fade-up">
            <div className="card" style={{ marginBottom:16 }}>
              <div className="card-header">
                <span style={{ fontSize:16 }}>📸</span>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>
                    Roblox Screenshot — Bewijs van Gameplay
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"var(--muted)" }}>
                    STAP 2 VAN 5 · GAME OWNERSHIP PROOF
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="warn warn-blue" style={{ marginBottom:20 }}>
                  <span>ℹ️</span>
                  <div>
                    De screenshot bewijst dat <strong>jij</strong> de game hebt gespeeld en de waarde
                    organisch hebt opgebouwd — niet gekocht of gefraudeerd.
                    Het systeem leest automatisch de PLR:/LVL:/MOL:-labels uit de HUD.
                  </div>
                </div>

                <UploadZone
                  label="Roblox Game Screenshot"
                  hint="JPEG / PNG · Max 10MB · HUD moet zichtbaar zijn"
                  accept="image/jpeg,image/png,image/webp"
                  value={form.roblox_screenshot}
                  onChange={v => set("roblox_screenshot", v)}
                  icon="🎮"
                />

                {form.roblox_screenshot && (
                  <div className="warn warn-green" style={{ marginTop:12 }}>
                    <span>✅</span>
                    <span>
                      Screenshot geladen. Server zal OCR uitvoeren op PLR:/LVL:/MOL:/ZNE: labels
                      én micro-QR uitlezen. Verificatie duurt ~3 seconden.
                    </span>
                  </div>
                )}

                <div style={{
                  background:"var(--bg)", borderRadius:8,
                  border:"1px solid var(--border)", padding:14,
                  marginTop:16
                }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
                    color:"var(--muted)", letterSpacing:2, marginBottom:10 }}>
                    // Wat het systeem uit de screenshot haalt
                  </div>
                  {[
                    ["PLR:","Roblox gebruikersnaam → verificatie via Roblox Users API"],
                    ["LVL:","Game level → minimum level 3 vereist voor uitbetaling"],
                    ["MOL:","In-game MOL balance → cross-check met Hedera Mirror Node"],
                    ["ZNE:","Actieve zone → bewijs dat speler daadwerkelijk heeft gespeeld"],
                    ["QR: ","Micro-QR payload → Player ID + Inventory Hash + Timestamp"],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", gap:12, marginBottom:8 }}>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
                        color:"var(--gold-l)", minWidth:44 }}>{k}</div>
                      <div style={{ fontSize:11, color:"var(--muted)" }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button className="btn btn-outline" onClick={() => setStep(0)}>← Terug</button>
                  <button className="btn btn-gold" style={{ flex:1 }}
                    onClick={() => setStep(2)}
                    disabled={!form.roblox_screenshot}>
                    Verder → Betaalbewijs
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STAP 2: BETAALBEWIJS ── */}
        {step === 2 && (
          <div className="fade-up">
            <div className="card" style={{ marginBottom:16 }}>
              <div className="card-header">
                <span style={{ fontSize:16 }}>💳</span>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>
                    Betaalbewijs — Robux Aankoop of Creditcard
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"var(--muted)" }}>
                    STAP 3 VAN 5 · SOURCE OF FUNDS (AML)
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="warn warn-amber" style={{ marginBottom:20 }}>
                  <span>⚖️</span>
                  <div>
                    <strong>Anti-Money Laundering (AMLD6 Art. 13):</strong> Het betaalbewijs bewijst dat
                    de fondsen afkomstig zijn uit een <em>legitieme bron</em>
                    (aankoop bij Roblox Inc. via bank/creditcard).
                    Dit is vereist voor elke crypto-uitbetaling.
                  </div>
                </div>

                {/* Welk bewijs */}
                <div style={{ marginBottom:20 }}>
                  <label className="field-label">Type bewijs</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {[
                      { id:"robux_receipt", label:"Roblox betaalafschrift",
                        sub:"Email ontvangstbewijs van Roblox", icon:"📧" },
                      { id:"cc_statement", label:"Creditcard / bankafschrift",
                        sub:"Met zichtbare Roblox-transactie", icon:"🏦" },
                      { id:"paypal", label:"PayPal / iDEAL afschrift",
                        sub:"Betaling aan Roblox Corporation", icon:"💸" },
                      { id:"ingame_purchase", label:"Roblox DevEx transactie",
                        sub:"Bewijs van Robux-verdiensten", icon:"🎮" },
                    ].map(opt => (
                      <div key={opt.id}
                        onClick={() => set("payment_type", opt.id)}
                        style={{
                          border:`1px solid ${form.payment_type===opt.id?"var(--gold)":"var(--border2)"}`,
                          borderRadius:8, padding:"10px 14px", cursor:"pointer",
                          background: form.payment_type===opt.id ? "var(--gold-dim)" : "transparent",
                          transition:"all .2s"
                        }}>
                        <div style={{ fontSize:18 }}>{opt.icon}</div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11,
                          color: form.payment_type===opt.id ? "var(--gold-l)" : "var(--text)",
                          marginTop:4 }}>{opt.label}</div>
                        <div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{opt.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <UploadZone
                  label="Upload betaalbewijs"
                  hint="PDF, JPEG, PNG · Max 10MB · Roblox transactie moet zichtbaar zijn"
                  accept="image/jpeg,image/png,application/pdf"
                  value={form.payment_proof}
                  onChange={v => set("payment_proof", v)}
                  icon="💳"
                />

                {form.payment_proof && (
                  <div style={{
                    background:"var(--bg)", borderRadius:8,
                    border:"1px solid var(--border)", padding:14, marginTop:14
                  }}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
                      color:"var(--muted)", letterSpacing:2, marginBottom:10 }}>
                      // Wat het systeem verifieert
                    </div>
                    {[
                      ["Bedrag","Totaal besteed aan Robux (bron-van-fondsen)"],
                      ["Datum","Transactiedatum (max 12 maanden geleden)"],
                      ["Merchant","'Roblox Corporation' of 'ROBLOX' als ontvanger"],
                      ["Naam","Naam op betaling = naam op ID-document (stap 4)"],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:"flex", gap:12, marginBottom:6 }}>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
                          color:"var(--gold-l)", minWidth:60 }}>{k}</div>
                        <div style={{ fontSize:11, color:"var(--muted)" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button className="btn btn-outline" onClick={() => setStep(1)}>← Terug</button>
                  <button className="btn btn-gold" style={{ flex:1 }}
                    onClick={() => setStep(3)}
                    disabled={!form.payment_proof}>
                    Verder → {needsFullKyc ? "KYC Identiteit" : "Lightning Uitbetaling"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STAP 3: KYC IDENTITEIT ── */}
        {step === 3 && (
          <div className="fade-up">
            <div className="card" style={{ marginBottom:16 }}>
              <div className="card-header">
                <span style={{ fontSize:16 }}>🪪</span>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>
                    KYC — Identiteitsverificatie
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"var(--muted)" }}>
                    STAP 4 VAN 5 · AMLD6 / MICA VEREISTE
                  </div>
                </div>
                {needsFullKyc
                  ? <span className="badge badge-red" style={{ marginLeft:"auto" }}>Verplicht boven €1.000</span>
                  : <span className="badge badge-muted" style={{ marginLeft:"auto" }}>Optioneel onder €1.000</span>
                }
              </div>
              <div className="card-body">
                {!needsFullKyc && (
                  <div className="warn warn-green" style={{ marginBottom:16 }}>
                    <span>✅</span>
                    <span>Waarde onder €1.000 — volledige KYC is optioneel maar aanbevolen
                    voor hogere toekomstige uitbetalingen. Je kunt deze stap overslaan.</span>
                  </div>
                )}

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
                  <div>
                    <label className="field-label">Volledige naam (zoals op ID)</label>
                    <input placeholder="Edwin Hauwert"
                      value={form.full_name}
                      onChange={e => set("full_name", e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Geboortedatum</label>
                    <input type="date" value={form.dob}
                      onChange={e => set("dob", e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Land van verblijf</label>
                    <select value={form.country}
                      onChange={e => set("country", e.target.value)}>
                      <option value="">Selecteer land</option>
                      {["Nederland","België","Duitsland","Groot-Brittannië","Frankrijk",
                        "Spanje","Italië","Polen","VS","Canada","Australië","Japan",
                        "Nigeria","Ghana","India","Brazilië","Argentinië","China"
                      ].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Type identiteitsbewijs</label>
                    <select value={form.id_type}
                      onChange={e => set("id_type", e.target.value)}>
                      <option value="passport">Paspoort</option>
                      <option value="id_card">Identiteitskaart</option>
                      <option value="drivers_license">Rijbewijs</option>
                    </select>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
                  <UploadZone
                    label="ID document (voor- en achterkant)"
                    hint="JPEG / PNG · Max 5MB"
                    accept="image/jpeg,image/png"
                    value={form.id_document}
                    onChange={v => set("id_document", v)}
                    icon="🪪"
                  />
                  <UploadZone
                    label="Selfie met ID document"
                    hint="Houd ID naast gezicht · Geen filters"
                    accept="image/jpeg,image/png"
                    value={form.selfie}
                    onChange={v => set("selfie", v)}
                    icon="🤳"
                  />
                </div>

                <div className="warn warn-blue">
                  <span>🔒</span>
                  <div>
                    <strong>Privacy by Design (AVG Art. 25):</strong> ID-documenten en selfie worden
                    uitsluitend gebruikt voor eenmalige verificatie via onze CASP-gecertificeerde partner
                    (Onfido / Sumsub). Na verificatie worden de documenten <em>niet</em> opgeslagen door EHMAC B.V.
                    Alleen het verificatieresultaat (pass/fail + naam) wordt bewaard conform DAC8.
                  </div>
                </div>

                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button className="btn btn-outline" onClick={() => setStep(2)}>← Terug</button>
                  <button className="btn btn-outline" onClick={() => setStep(4)}
                    style={{ display: needsFullKyc ? "none" : "inline-flex" }}>
                    Stap overslaan →
                  </button>
                  <button className="btn btn-gold" style={{ flex:1 }}
                    onClick={() => setStep(4)}
                    disabled={needsFullKyc && (!form.full_name||!form.id_document)}>
                    Verder → Lightning Uitbetaling
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STAP 4: LIGHTNING UITBETALING ── */}
        {step === 4 && !submitted && (
          <div className="fade-up">
            <div className="card" style={{ marginBottom:16 }}>
              <div className="card-header">
                <span style={{ fontSize:16 }}>⚡</span>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>
                    Lightning BTC Uitbetaling
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"var(--muted)" }}>
                    STAP 5 VAN 5 · PAYOUT CONFIGURATIE
                  </div>
                </div>
              </div>
              <div className="card-body">

                {/* Finale berekening */}
                <div style={{
                  background:"var(--bg)", borderRadius:10,
                  border:"1px solid var(--border2)", padding:16, marginBottom:20
                }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
                    letterSpacing:2, color:"var(--muted)", marginBottom:12, textTransform:"uppercase" }}>
                    // Finale uitbetalingsberekening
                  </div>
                  <ValueCalc molBalance={form.mol_balance} nftCount={form.nft_ids.length} />
                </div>

                {/* Lightning invoice */}
                <div style={{ marginBottom:16 }}>
                  <label className="field-label">
                    Lightning Invoice (BOLT-11) of Lightning Address
                  </label>
                  <input
                    placeholder="lnbc1... of user@walletofsatoshi.com"
                    value={form.ln_invoice}
                    onChange={e => set("ln_invoice", e.target.value)}
                    style={{ fontFamily:"'DM Mono',monospace", fontSize:11 }}
                  />
                  <div style={{ fontSize:10, color:"var(--muted)", marginTop:6 }}>
                    Aanbevolen wallets: Muun · Phoenix · Breez · Wallet of Satoshi · Zeus
                  </div>
                </div>

                {/* BOLT-11 preview */}
                {form.ln_invoice && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
                      letterSpacing:2, color:"var(--muted)", marginBottom:6 }}>// Invoice preview</div>
                    <div className="ln-invoice">
                      {form.ln_invoice.startsWith("lnbc") ? (
                        <>
                          <div style={{ color:"var(--gold-l)" }}>BOLT-11 Lightning Invoice</div>
                          <div style={{ color:"var(--text)", marginTop:4 }}>
                            {form.ln_invoice.slice(0,40)}...{form.ln_invoice.slice(-10)}
                          </div>
                          <div style={{ color:"var(--green)", marginTop:4 }}>
                            ✅ Geldig BOLT-11 formaat herkend
                          </div>
                        </>
                      ) : form.ln_invoice.includes("@") ? (
                        <>
                          <div style={{ color:"var(--gold-l)" }}>Lightning Address (LNURL-pay)</div>
                          <div style={{ color:"var(--text)", marginTop:4 }}>{form.ln_invoice}</div>
                          <div style={{ color:"var(--green)", marginTop:4 }}>
                            ✅ Lightning Address formaat herkend
                          </div>
                        </>
                      ) : (
                        <div style={{ color:"var(--muted)" }}>
                          Voer een geldig BOLT-11 invoice of Lightning Address in...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Compliance akkoord */}
                <div style={{
                  background:"var(--bg)", borderRadius:8,
                  border:"1px solid var(--border2)", padding:14, marginBottom:16
                }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
                    letterSpacing:2, color:"var(--muted)", marginBottom:12 }}>
                    // VERPLICHTE VERKLARINGEN
                  </div>
                  {[
                    "Ik bevestig dat ik de rechtmatige eigenaar ben van de MOLNFT-tokens op het opgegeven Hedera account.",
                    "Ik bevestig dat de fondsen afkomstig zijn uit mijn eigen Roblox-aankopen, aantoonbaar via het geüploade betaalbewijs.",
                    "Ik begrijp dat EHMAC B.V. uitbetalingen kan weigeren bij verdenking van fraude of witwassen (AMLD6).",
                    "Ik ga akkoord met rapportage aan de belastingdienst van mijn land conform DAC8 (crypto-transactierapportage).",
                    "Ik bevestig dat ik 18 jaar of ouder ben en woonachtig in een land waar de ontvangst van crypto legaal is.",
                  ].map((decl, i) => (
                    <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
                      <div style={{
                        width:16, height:16, borderRadius:3, flexShrink:0,
                        border:"1px solid var(--border2)", marginTop:2,
                        background:"var(--green-dim)",
                        display:"flex", alignItems:"center", justifyContent:"center"
                      }}>
                        <span style={{ fontSize:9, color:"var(--green)" }}>✓</span>
                      </div>
                      <div style={{ fontSize:11, color:"var(--muted)", lineHeight:1.5 }}>{decl}</div>
                    </div>
                  ))}

                  <div style={{ display:"flex", gap:10, marginTop:12, alignItems:"flex-start" }}>
                    <div
                      onClick={() => setAgreed(p => !p)}
                      style={{
                        width:18, height:18, borderRadius:3, flexShrink:0,
                        border:`2px solid ${agreed?"var(--gold)":"var(--border2)"}`,
                        background: agreed ? "var(--gold-dim)" : "transparent",
                        cursor:"pointer", marginTop:1,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        transition:"all .2s"
                      }}>
                      {agreed && <span style={{ fontSize:10, color:"var(--gold-l)" }}>✓</span>}
                    </div>
                    <div style={{ fontSize:12, color: agreed ? "var(--text)" : "var(--muted)",
                      lineHeight:1.5, cursor:"pointer" }}
                      onClick={() => setAgreed(p => !p)}>
                      Ik ga akkoord met alle bovenstaande verklaringen en de
                      <span style={{ color:"var(--gold-l)" }}> Algemene Voorwaarden </span>
                      en het
                      <span style={{ color:"var(--gold-l)" }}> Privacybeleid </span>
                      van EHMAC B.V. / VirtualV Holding B.V.
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", gap:10 }}>
                  <button className="btn btn-outline" onClick={() => setStep(3)}>← Terug</button>
                  <button className="btn btn-gold" style={{ flex:1 }}
                    onClick={() => setSubmitted(true)}
                    disabled={!form.ln_invoice || !agreed}>
                    ⚡ Uitbetaling Aanvragen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SUCCESS STATE ── */}
        {submitted && (
          <div className="fade-up">
            <div style={{
              textAlign:"center", padding:"40px 20px",
              background:"var(--surface)", borderRadius:12,
              border:"1px solid var(--green)", marginBottom:16
            }}>
              <div style={{ fontSize:48, marginBottom:16 }}>⚡</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
                fontSize:24, color:"var(--green)", marginBottom:8 }}>
                Aanvraag Ingediend
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11,
                color:"var(--muted)", marginBottom:20 }}>
                Ref: MOL-{Date.now().toString(36).toUpperCase()}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                gap:12, maxWidth:400, margin:"0 auto 20px" }}>
                {[
                  ["Screenshot OCR","Verwerking...","var(--amber)"],
                  ["Betaalbewijs","In wachtrij","var(--amber)"],
                  ["Hedera Verify","In wachtrij","var(--amber)"],
                  ["Lightning Payout","Wacht op verificatie","var(--muted)"],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ background:"var(--bg)",
                    borderRadius:8, padding:"10px 14px",
                    border:"1px solid var(--border)" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",
                      fontSize:9, color:"var(--muted)" }}>{l}</div>
                    <div style={{ fontFamily:"'DM Mono',monospace",
                      fontSize:10, color:c, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:"var(--muted)" }}>
                Verwachte verwerkingstijd: 2–24 uur.<br />
                Je ontvangt een e-mail zodra de Lightning betaling is verzonden.
              </div>
            </div>
          </div>
        )}

        {/* ── COMPLIANCE REFERENCE ── */}
        <div className="card" style={{ marginTop:24 }}>
          <div className="card-header">
            <span style={{ fontSize:16 }}>📋</span>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13 }}>
              Juridisch & Compliance Kader
            </div>
          </div>
          <div className="card-body">
            <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:0 }}>
              {[
                { icon:"⚖️", title:"MiCA Categorisering",
                  body:<>Het MOLNFT-buyback-model valt onder <strong>artikel 2(3) MiCA-uitzondering</strong> voor NFTs die uniek en niet-fungibel zijn. Maar: indien MOL-tokens als betaalmiddel circuleren, geldt <strong>MiCA Titel III (e-money token)</strong> of <strong>Titel IV (ARTs)</strong>. EHMAC B.V. dient een juridisch advies te laten uitvoeren zodra maandelijks uitbetalingsvolume &gt;€1M bereikt.</> },
                { icon:"🔍", title:"AMLD6 Drempels",
                  body:<>Cumulatieve crypto-transacties &lt;€1.000 per klant per jaar: <strong>licht KYC</strong> (naam + adres + betalingsbewijs). Boven €1.000: <strong>volledige KYC</strong> (ID + selfie + source-of-funds). Boven €10.000: Enhanced Due Diligence + RFT-melding (Toezicht Financiële Instellingen, De Nederlandsche Bank).</> },
                { icon:"📊", title:"DAC8 Rapportage",
                  body:<>Vanaf 2026 verplichte automatische rapportage van crypto-transacties aan EU-belastingdiensten via DAC8. EHMAC B.V. moet elk jaar de crypto-uitbetalingen per klant rapporteren aan de Belastingdienst. Spelers worden hierover geïnformeerd bij KYC-akkoord.</> },
                { icon:"🔐", title:"CASP Licentie",
                  body:<>Indien maandelijks volume &gt;€5M of meer dan 100 klanten/maand: EHMAC B.V. dient een CASP-licentie aan te vragen bij de AFM. Alternatief: uitbetalingen uitbesteden aan een reeds gelicentieerde CASP (bijv. Bitpay, Strike, OpenNode) die als betaalprocessor optreedt — EHMAC neemt dan geen crypto-risico.</> },
                { icon:"🌐", title:"Landen-uitsluiting",
                  body:<>Uitbetalingen naar wallets in FATF-blacklist landen (Iran, Noord-Korea, Myanmar, etc.) zijn verboden. Geoblocking op IP + geoblocking op land in KYC-formulier. Geen uitbetalingen aan personen op EU-sanctielijsten (gecheckt via OFAC/EU-sanctiescreening bij onboarding).</> },
              ].map((item, i) => (
                <div key={i} className="compliance-item">
                  <div className="ci-icon">{item.icon}</div>
                  <div className="ci-text">
                    <strong>{item.title}</strong><br />
                    {item.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BACKEND CODE TOGGLE */}
        <div style={{ marginTop:24 }}>
          <button className="btn btn-outline" style={{ width:"100%" }}
            onClick={() => setShowCode(p => !p)}>
            {showCode ? "▲ Verberg" : "▼ Toon"} backend KYC verificatie code (TypeScript)
          </button>
          {showCode && (
            <div style={{
              background:"#050807", borderRadius:10,
              border:"1px solid var(--border)", marginTop:8,
              padding:16, fontFamily:"'DM Mono',monospace",
              fontSize:10.5, lineHeight:1.85, color:"#6a9a7a",
              maxHeight:480, overflowY:"auto", whiteSpace:"pre"
            }}>{`// kyc-withdrawal-processor.ts  (Cloudflare Worker)
// Verwerkt: screenshot + betaalbewijs + NFT-verificatie + Lightning payout

import jsQR from "jsqr";
import Jimp from "jimp";
import { Client, TokenNftInfoQuery } from "@hashgraph/sdk";
import { createHash } from "crypto";

// ── DOCUMENT VERIFICATIE PIPELINE ────────────────────────────────

export async function processWithdrawalRequest(
  data: WithdrawalRequest
): Promise<WithdrawalResult> {

  // STAP 1: Roblox Screenshot OCR
  const screenshotData = await extractScreenshotData(data.roblox_screenshot);
  if (!screenshotData.player_id) throw new Error("Screenshot niet leesbaar");

  // STAP 2: Cross-check screenshot vs opgegeven Hedera account
  const robloxUser = await fetchRobloxUser(screenshotData.player_id);
  const molMatch   = Math.abs(screenshotData.mol_balance - data.mol_balance) < 10;
  if (!molMatch) throw new Error("MOL balance inconsistentie gedetecteerd");

  // STAP 3: Betaalbewijs OCR — extracteer Roblox transactie
  const paymentData = await extractPaymentProof(data.payment_proof);
  if (!paymentData.is_roblox_merchant) {
    throw new Error("Betaalbewijs bevat geen Roblox-transactie");
  }

  // STAP 4: Hedera NFT eigenaarschap verificatie
  const nftVerified = await verifyHederaNFTs(
    data.hedera_account, data.nft_ids
  );
  if (!nftVerified.all_owned) {
    throw new Error(\`NFT eigenaarschap verificatie mislukt: \${nftVerified.failed}\`);
  }

  // STAP 5: AML drempel check
  const eurValue = nftVerified.total_value_usd * 0.92;
  if (eurValue > 10000) {
    await flagForEnhancedDueDiligence(data);
    throw new Error("EDD vereist — handmatige beoordeling");
  }

  // STAP 6: Lightning payout berekening
  const netUsd  = nftVerified.total_value_usd * (1 - 0.005 - 0.015);
  const sats    = Math.round((netUsd / 97000) * 1e8);
  if (sats < 10000) throw new Error("Minimum 10.000 sats vereist");

  // STAP 7: Lightning betaling uitvoeren (via OpenNode / Strike API)
  const payment = await sendLightningPayment({
    invoice: data.ln_invoice,
    amount_sats: sats,
    memo: \`MOLNFT buyback \${data.hedera_account}\`,
  });

  // STAP 8: DAC8 rapportage log
  await logDac8Transaction({
    recipient_name:    data.full_name,
    recipient_country: data.country,
    amount_eur:        eurValue,
    crypto_amount:     sats,
    crypto_asset:      "BTC",
    tx_id:             payment.payment_hash,
    source_of_funds:   "Roblox virtual currency purchase",
    date:              new Date().toISOString(),
  });

  // STAP 9: NFT tokens markeren als ingewisseld op Hedera
  await burnNFTs(data.hedera_account, data.nft_ids);

  return {
    success:      true,
    sats_paid:    sats,
    payment_hash: payment.payment_hash,
    dac8_ref:     payment.dac8_ref,
  };
}

// ── BETAALBEWIJS READER ───────────────────────────────────────────
async function extractPaymentProof(file: File) {
  // PDF → tekst extractie OF afbeelding → Tesseract OCR
  // Zoek naar: "Roblox", "ROBUX", bedrag, datum
  const text = await ocrDocument(file);
  return {
    is_roblox_merchant: /roblox/i.test(text),
    amount: extractAmount(text),
    date:   extractDate(text),
    name:   extractName(text),
  };
}

// ── LIGHTNING PAYOUT (OpenNode) ───────────────────────────────────
async function sendLightningPayment({ invoice, amount_sats, memo }) {
  const res = await fetch("https://api.opennode.com/v2/withdrawals", {
    method: "POST",
    headers: {
      "Authorization": env.OPENNODE_API_KEY,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      type:       "lightning",
      address:    invoice,
      amount:     amount_sats,
      description: memo,
    }),
  });
  if (!res.ok) throw new Error("Lightning payout mislukt");
  return res.json();
}`}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
