import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#f7f4ee",
  ink: "#12110f",
  paper: "#ffffff",
  sand: "#e8e2d6",
  sandDark: "#cec6b5",
  teal: "#0a6e5c",
  tealLight: "#d4ede8",
  tealMid: "#2a9d87",
  gold: "#c8941a",
  goldLight: "#fdf3dc",
  red: "#c0392b",
  blue: "#1a4fa0",
  blueMid: "#3a7abf",
  blueLight: "#dde8f7",
  muted: "#7a7264",
  border: "#ddd8ce",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: ${C.bg}; color: ${C.ink}; font-family: 'Cormorant Garamond', Georgia, serif; }
.mono { font-family: 'DM Mono', monospace; }

/* HERO */
.hero {
  background: ${C.ink};
  padding: 72px 40px 80px;
  position: relative;
  overflow: hidden;
}
.hero-noise {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
}
.hero-grid-line {
  position: absolute;
  background: rgba(255,255,255,0.04);
}
.hero-grid-line.v { width: 1px; top: 0; bottom: 0; }
.hero-grid-line.h { height: 1px; left: 0; right: 0; }
.hero-inner { max-width: 1100px; margin: 0 auto; position: relative; z-index: 1; }
.hero-tag {
  font-family: 'DM Mono', monospace;
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
  color: ${C.tealMid}; margin-bottom: 24px;
}
.hero-title {
  font-size: clamp(52px, 9vw, 108px);
  font-weight: 300; line-height: .92; letter-spacing: -1px;
  color: #f0ebe0; margin-bottom: 8px;
}
.hero-title strong { font-weight: 700; color: ${C.tealMid}; }
.hero-title em { font-style: italic; color: ${C.gold}; }
.hero-sub {
  font-size: clamp(17px, 2.5vw, 22px);
  color: #7a7264; font-weight: 300; font-style: italic;
  max-width: 520px; line-height: 1.5; margin-bottom: 48px;
}
.hero-stats {
  display: flex; gap: 40px; flex-wrap: wrap;
}
.stat { }
.stat-val {
  font-size: 36px; font-weight: 600; color: #f0ebe0; line-height: 1;
}
.stat-val span { color: ${C.tealMid}; }
.stat-label {
  font-family: 'DM Mono', monospace; font-size: 10px;
  letter-spacing: 2px; text-transform: uppercase; color: #5a5448; margin-top: 4px;
}

/* NAV TABS */
.tabs-bar {
  background: ${C.paper}; border-bottom: 1px solid ${C.border};
  position: sticky; top: 0; z-index: 100;
}
.tabs-inner {
  max-width: 1100px; margin: 0 auto;
  display: flex; gap: 0; padding: 0 24px;
  overflow-x: auto; scrollbar-width: none;
}
.tabs-inner::-webkit-scrollbar { display: none; }
.tab-btn {
  padding: 16px 20px; background: transparent; border: none;
  font-family: 'DM Mono', monospace; font-size: 11px;
  letter-spacing: 2px; text-transform: uppercase;
  color: ${C.muted}; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all .2s; white-space: nowrap;
}
.tab-btn:hover { color: ${C.ink}; }
.tab-btn.active { color: ${C.teal}; border-bottom-color: ${C.teal}; }

/* WRAP */
.wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
.sec { padding: 72px 0; }
.sec-label {
  font-family: 'DM Mono', monospace; font-size: 10px;
  letter-spacing: 3px; text-transform: uppercase;
  color: ${C.tealMid}; margin-bottom: 12px;
}
.sec-title {
  font-size: clamp(32px, 5vw, 56px); font-weight: 300;
  line-height: 1; margin-bottom: 32px; color: ${C.ink};
}
.sec-title strong { font-weight: 700; }
.sec-title em { font-style: italic; color: ${C.gold}; }
.divider { height: 1px; background: ${C.border}; margin: 0; }

/* BUS DIAGRAM */
.bus-wrap {
  background: ${C.ink}; border-radius: 16px; padding: 40px;
  position: relative; overflow: hidden; margin-bottom: 40px;
}
.bus-wrap::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,.03) 60px);
}
.bus-title {
  font-family: 'DM Mono', monospace; font-size: 11px;
  letter-spacing: 3px; text-transform: uppercase;
  color: ${C.tealMid}; margin-bottom: 32px;
}
.bus-track {
  position: relative; height: 72px;
  background: rgba(255,255,255,.04); border-radius: 36px;
  border: 1px solid rgba(255,255,255,.08); margin-bottom: 16px;
  overflow: hidden;
}
.bus-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  border-radius: 36px; transition: width 2s cubic-bezier(.4,0,.2,1);
  display: flex; align-items: center; padding-left: 20px;
}
.bus-bus {
  position: absolute; top: 50%; transform: translateY(-50%);
  font-size: 28px; transition: left 2s cubic-bezier(.4,0,.2,1);
  filter: drop-shadow(0 0 12px rgba(42,157,135,.6));
}
.bus-stops {
  display: flex; justify-content: space-between;
  padding: 0 24px; margin-bottom: 8px;
}
.bus-stop {
  font-family: 'DM Mono', monospace; font-size: 10px;
  letter-spacing: 2px; color: rgba(255,255,255,.3); text-transform: uppercase;
}
.bus-stop.done { color: ${C.tealMid}; }
.bus-stop.current { color: #f0ebe0; }
.bus-tick-row {
  display: flex; gap: 6px; padding: 0 24px;
}
.bus-tick {
  flex: 1; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,.1); transition: background .3s;
}
.bus-tick.done { background: ${C.tealMid}; }
.bus-tick.current { background: ${C.gold}; }

.bus-stats-row {
  display: grid; grid-template-columns: repeat(4,1fr);
  gap: 16px; margin-top: 24px;
}
.bus-stat {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 10px; padding: 16px;
}
.bus-stat-val {
  font-family: 'DM Mono', monospace; font-size: 18px;
  color: #f0ebe0; margin-bottom: 4px;
}
.bus-stat-val span { color: ${C.tealMid}; }
.bus-stat-label {
  font-family: 'DM Mono', monospace; font-size: 9px;
  letter-spacing: 2px; text-transform: uppercase; color: #5a5448;
}

/* PACKAGES */
.pkg-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-bottom: 40px;
}
.pkg-card {
  border: 1px solid ${C.border}; border-radius: 12px;
  overflow: hidden; background: ${C.paper};
  transition: transform .2s, box-shadow .2s;
}
.pkg-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,.08); }
.pkg-header { padding: 24px; position: relative; }
.pkg-tier {
  font-family: 'DM Mono', monospace; font-size: 9px;
  letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px;
}
.pkg-amount {
  font-size: 40px; font-weight: 700; line-height: 1; margin-bottom: 4px;
}
.pkg-range {
  font-family: 'DM Mono', monospace; font-size: 11px; color: ${C.muted};
}
.pkg-badge {
  position: absolute; top: 20px; right: 20px;
  font-family: 'DM Mono', monospace; font-size: 10px;
  letter-spacing: 1px; padding: 4px 10px; border-radius: 20px;
}
.pkg-body { padding: 0 24px 24px; }
.pkg-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid ${C.border};
  font-size: 14px;
}
.pkg-row:last-child { border-bottom: none; }
.pkg-key { color: ${C.muted}; }
.pkg-val { font-weight: 600; font-family: 'DM Mono', monospace; font-size: 13px; }
.pkg-val.teal { color: ${C.teal}; }
.pkg-val.gold { color: ${C.gold}; }

/* KYC MODULE */
.kyc-stack { display: flex; flex-direction: column; gap: 16px; margin-bottom: 48px; }
.kyc-tier {
  display: grid; grid-template-columns: 48px 180px 1fr auto;
  gap: 20px; align-items: start;
  background: ${C.paper}; border: 1px solid ${C.border};
  border-radius: 12px; padding: 24px;
  transition: border-color .2s;
}
.kyc-tier:hover { border-color: ${C.tealMid}; }
.kyc-num {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; flex-shrink: 0;
}
.kyc-name { }
.kyc-name-title { font-size: 18px; font-weight: 600; margin-bottom: 2px; }
.kyc-name-sub {
  font-family: 'DM Mono', monospace; font-size: 11px; color: ${C.muted};
  text-transform: uppercase; letter-spacing: 1px;
}
.kyc-items { display: flex; flex-direction: column; gap: 6px; }
.kyc-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; color: ${C.ink};
}
.kyc-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.kyc-time {
  text-align: right; flex-shrink: 0;
}
.kyc-time-val {
  font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 500;
  color: ${C.teal};
}
.kyc-time-label {
  font-family: 'DM Mono', monospace; font-size: 9px;
  letter-spacing: 2px; text-transform: uppercase; color: ${C.muted};
}

/* COMPARISON TABLE */
.cmp-wrap { overflow-x: auto; margin-bottom: 48px; }
.cmp-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 800px; }
.cmp-table th {
  padding: 16px 20px; text-align: left;
  font-family: 'DM Mono', monospace; font-size: 10px;
  letter-spacing: 2px; text-transform: uppercase; font-weight: 500;
  white-space: nowrap;
}
.cmp-table th.ank {
  background: ${C.teal}; color: #fff;
  border-radius: 8px 8px 0 0;
}
.cmp-table th:not(.ank) { background: ${C.sand}; color: ${C.muted}; }
.cmp-table td { padding: 13px 20px; border-bottom: 1px solid ${C.border}; vertical-align: middle; }
.cmp-table tr:last-child td { border-bottom: none; }
.cmp-table tr:hover td { background: ${C.bg}; }
.cmp-table td.cat {
  font-weight: 600; font-size: 13px; color: ${C.ink};
  background: ${C.bg}!important;
  border-right: 1px solid ${C.border};
}
.cmp-table td.ank-col { background: ${C.tealLight}; }
.cmp-table tr:hover td.ank-col { background: ${C.tealLight}; }
.tick { color: ${C.teal}; font-size: 16px; font-weight: 700; }
.cross { color: ${C.red}; font-size: 16px; }
.warn { color: ${C.gold}; font-size: 14px; }
.best { 
  background: ${C.teal}; color: #fff; 
  padding: 2px 8px; border-radius: 10px; font-size: 11px;
  font-family: 'DM Mono', monospace; white-space: nowrap;
}
.bad {
  background: ${C.sand}; color: ${C.muted};
  padding: 2px 8px; border-radius: 10px; font-size: 11px;
  font-family: 'DM Mono', monospace; white-space: nowrap;
}
.ok {
  background: ${C.goldLight}; color: ${C.gold};
  padding: 2px 8px; border-radius: 10px; font-size: 11px;
  font-family: 'DM Mono', monospace; white-space: nowrap;
}

/* FLOW DIAGRAM */
.flow-diagram {
  display: flex; align-items: center; gap: 0;
  background: ${C.paper}; border: 1px solid ${C.border};
  border-radius: 16px; overflow: hidden; margin-bottom: 40px;
}
.flow-node {
  flex: 1; padding: 24px 20px; text-align: center;
  position: relative;
}
.flow-node::after {
  content: '→'; position: absolute; right: -12px; top: 50%;
  transform: translateY(-50%); font-size: 18px; color: ${C.muted};
  z-index: 2;
}
.flow-node:last-child::after { display: none; }
.flow-node.active { background: ${C.tealLight}; }
.flow-icon { font-size: 28px; margin-bottom: 8px; }
.flow-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.flow-detail {
  font-family: 'DM Mono', monospace; font-size: 10px;
  color: ${C.muted}; letter-spacing: 1px; line-height: 1.4;
}

/* REGULATORY */
.reg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.reg-card {
  background: ${C.paper}; border: 1px solid ${C.border};
  border-radius: 12px; padding: 24px;
}
.reg-card h4 { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
.reg-card p, .reg-card li {
  font-size: 14px; color: ${C.muted}; line-height: 1.7;
}
.reg-card ul { padding-left: 16px; }
.reg-card li { margin-bottom: 4px; }
.reg-card .highlight { color: ${C.teal}; font-weight: 600; }

/* BUS ANIMATION */
@keyframes busRide {
  0% { left: 2%; }
  100% { left: 88%; }
}
@keyframes txPop {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.tx-dot {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  font-size: 11px; font-family: 'DM Mono', monospace;
  color: #fff; margin: 3px;
  animation: txPop .3s ease forwards;
}

@media(max-width: 768px) {
  .pkg-grid { grid-template-columns: 1fr; }
  .kyc-tier { grid-template-columns: 40px 1fr; }
  .kyc-time { display: none; }
  .bus-stats-row { grid-template-columns: 1fr 1fr; }
  .reg-grid { grid-template-columns: 1fr; }
}
`;

const TABS = ["Product", "De Bus", "Pakketten", "KYC Levels", "Vergelijking", "Regulatoir"];

const PACKAGES = [
  {
    tier: "Express", label: "Micro", range: "€1 – €1.000",
    color: C.tealMid, bg: C.tealLight, textColor: C.teal,
    badgeText: "Populair", badgeBg: C.teal,
    fee: "0.15% + €0.50", speed: "1–3 blokken (~15s)", kyc: "Tier 1",
    currencies: "EUR, USD, GBP, RLUSD", stablecoin: "RLUSD lock",
    maxWait: "Max 60 sec", limit: "€1.000/dag",
    icon: "🚌",
  },
  {
    tier: "Regulier", label: "Standard", range: "€1.000 – €10.000",
    color: C.gold, bg: C.goldLight, textColor: C.gold,
    badgeText: "Business", badgeBg: C.gold,
    fee: "0.12% + €1.00", speed: "4–12 blokken (~90s)", kyc: "Tier 2",
    currencies: "EUR, USD, GBP, AED, SGD, CNY, RLUSD", stablecoin: "RLUSD / USDC lock",
    maxWait: "Max 5 min", limit: "€50.000/maand",
    icon: "🚎",
  },
  {
    tier: "Zakelijk", label: "Premium", range: "€10.000 – €100.000",
    color: C.blue, bg: C.blueLight, textColor: C.blue,
    badgeText: "High-Value", badgeBg: C.blue,
    fee: "0.08% + €5.00", speed: "12–30 blokken (~4 min)", kyc: "Tier 3",
    currencies: "35+ valuta via ODL corridors", stablecoin: "Multi-stable lock",
    maxWait: "Max 15 min", limit: "€300.000/maand",
    icon: "🚄",
  },
];

const KYC_TIERS = [
  {
    num: 1, name: "Micro KYC", range: "€1 – €1.000",
    color: C.tealMid, bg: C.tealLight,
    timeVal: "< 2", timeUnit: "minuten",
    items: [
      "Mobiel telefoonnummer (SMS OTP)",
      "E-mailadres bevestigd",
      "IP-geolocation check (niet-sanctieland)",
      "Device fingerprint + cookie consent",
      "Automatische PEP/sanctiescreening (naam + geboortejaar)",
    ],
    noItems: ["Geen ID-document", "Geen selfie", "Geen bankrekening koppeling"],
    basis: "MiCA Art. 68 + AMLD6 art. 15 vereenvoudigde CDD",
  },
  {
    num: 2, name: "Standard KYC", range: "€1.000 – €10.000",
    color: C.gold, bg: C.goldLight,
    timeVal: "< 8", timeUnit: "minuten",
    items: [
      "Tier 1 items +",
      "Foto ID (paspoort / rijbewijs)",
      "Eén selfie (liveness check via AI)",
      "Adresbevestiging via IBAN (eerste €0.01 test-transaction)",
      "Volledige PEP/sanctiescreening + adverse media",
      "Automatische risicoclassificatie (laag/midden)",
    ],
    noItems: ["Geen notarieel document", "Geen persoonlijk bezoek", "Geen bewijs van inkomen"],
    basis: "AMLD6 standaard CDD, Wwft art. 3+4",
  },
  {
    num: 3, name: "Enhanced KYC", range: "€10.000 – €100.000",
    color: C.blue, bg: C.blueLight,
    timeVal: "< 25", timeUnit: "minuten",
    items: [
      "Tier 2 items +",
      "Herkomst vermogen (self-declaration < €50K of bank-statement > €50K)",
      "Video-selfie of geautomatiseerde call (AI-gedreven)",
      "Zakelijke klanten: UBO-verklaring + KVK-uittreksel",
      "Transactiedoel (dropdown, 5 categorieën)",
      "Jaarlijkse her-verificatie",
    ],
    noItems: ["Geen face-to-face vereist", "Geen notaris", "Geen accountantsverklaring"],
    basis: "AMLD6 Enhanced CDD, Wwft art. 8+9, MiCA CASP Art. 72",
  },
];

const CMP_ROWS = [
  { cat: "Min. KYC (€500)", ank: "📱 telefoonnummer", wu: "Naam + ID", mg: "Naam + ID", wise: "Email + ID", visa: "Naam + bankkaart", mc: "Naam + bankkaart", paypal: "Email + bankrekening" },
  { cat: "KYC-doorlooptijd", ank: "best:< 2 min (Tier 1)", wu: "ok:5-15 min", mg: "ok:10-20 min", wise: "ok:5-10 min", visa: "bad:Bankproces", mc: "bad:Bankproces", paypal: "ok:3-5 min" },
  { cat: "Max. bedrag (enkel)", ank: "best:€100.000", wu: "bad:€5.000", mg: "bad:€2.500", wise: "ok:€1.000.000*", visa: "bad:Kaartlimiet", mc: "bad:Kaartlimiet", paypal: "bad:€9.999" },
  { cat: "FX kosten", ank: "best:0.08–0.15%", wu: "bad:2.5–5%", mg: "bad:2–4.5%", wise: "ok:0.35–2%", visa: "bad:1.5–3%", mc: "bad:1.5–3%", paypal: "bad:3–4.5%" },
  { cat: "Bevestigingstijd", ank: "best:15s – 15 min", wu: "bad:Min – uren", mg: "bad:Minuten – dagen", wise: "ok:Uren – 2 dagen", visa: "ok:Real-time*", mc: "ok:Real-time*", paypal: "ok:Instant*" },
  { cat: "Stablecoin lock-in", ank: "best:RLUSD / USDC", wu: "cross:Nee", mg: "cross:Nee", wise: "cross:Nee", visa: "warn:Beperkt", mc: "warn:Beperkt", paypal: "warn:PYUSD" },
  { cat: "XRPL transparantie", ank: "best:Volledig on-chain", wu: "cross:Nee", mg: "cross:Nee", wise: "cross:Nee", visa: "cross:Nee", mc: "cross:Nee", paypal: "cross:Nee" },
  { cat: "Max-wachttijd garantie", ank: "best:Contractueel", wu: "cross:Nee", mg: "cross:Nee", wise: "cross:Nee", visa: "cross:Nee", mc: "cross:Nee", paypal: "cross:Nee" },
  { cat: "Privacy (data-verkoop)", ank: "best:Nee (contractueel)", wu: "bad:Ja", mg: "bad:Ja", wise: "ok:Beperkt", visa: "bad:Ja (ad)", mc: "bad:Ja (ad)", paypal: "bad:Ja" },
  { cat: "Coöperatief model", ank: "best:Ja (ANK lid)", wu: "cross:Nee", mg: "cross:Nee", wise: "cross:Nee", visa: "cross:Nee", mc: "cross:Nee", paypal: "cross:Nee" },
  { cat: "Corridors (valuta)", ank: "best:35+ (ODL)", wu: "ok:200+ landen", mg: "ok:200+ landen", wise: "ok:40+ valuta", visa: "ok:160+ landen", mc: "ok:150+ landen", paypal: "ok:25 valuta" },
  { cat: "Kosten €5.000 transfer", ank: "best:€11", wu: "bad:€125–250", mg: "bad:€100–225", wise: "ok:€17.50–100", visa: "bad:€75–150", mc: "bad:€75–150", paypal: "bad:€150–225" },
];

function renderCell(val) {
  if (!val) return <span className="cross">✕</span>;
  if (val.startsWith("best:")) return <span className="best">{val.slice(5)}</span>;
  if (val.startsWith("bad:")) return <span className="bad">{val.slice(4)}</span>;
  if (val.startsWith("ok:")) return <span className="ok">{val.slice(3)}</span>;
  if (val === "cross:Nee") return <span className="cross">✕</span>;
  if (val === "warn:Beperkt") return <span className="warn">△</span>;
  return val;
}

function BusAnimation() {
  const [tick, setTick] = useState(0);
  const [txs, setTxs] = useState([]);
  const maxTx = 8;
  const COLORS = [C.tealMid, C.gold, C.blue, "#9b59b6", "#e74c3c", "#27ae60", "#e67e22", "#16a085"];

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => {
        const next = (t + 1) % 32;
        if (next === 0) setTxs([]);
        if (next < maxTx) {
          setTxs(prev => [...prev, { id: next, color: COLORS[next % COLORS.length], label: `T${next+1}` }]);
        }
        return next;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(tick / 16, 1);
  const phase = tick < maxTx ? "boarding" : tick < 16 ? "dispatching" : tick < 28 ? "transit" : "arrived";
  const busLeft = phase === "transit" ? `${20 + (tick - 16) * 5}%` : phase === "arrived" ? "88%" : "2%";

  return (
    <div className="bus-wrap">
      <div className="bus-title">// XRPL Bus Engine — Live Simulatie</div>

      <div style={{display:"flex", gap:8, marginBottom:16, flexWrap:"wrap"}}>
        <div style={{fontSize:12,color:"#f0ebe0",fontFamily:"'DM Mono',monospace",marginRight:8}}>
          Instappende transacties:
        </div>
        {txs.map(tx => (
          <div key={tx.id} className="tx-dot" style={{background:tx.color}}>{tx.label}</div>
        ))}
        {Array.from({length: maxTx - txs.length}).map((_,i) => (
          <div key={`empty-${i}`} style={{
            width:28,height:28,borderRadius:"50%",
            background:"rgba(255,255,255,.06)",
            border:"1px dashed rgba(255,255,255,.15)"
          }}/>
        ))}
        <div style={{
          marginLeft:"auto",
          fontFamily:"'DM Mono',monospace",fontSize:11,
          color: phase === "arrived" ? C.tealMid : C.gold,
          textTransform:"uppercase",letterSpacing:2,
          alignSelf:"center"
        }}>
          {phase === "boarding" && "⏳ Boarding..."}
          {phase === "dispatching" && "🚌 Klaar voor vertrek"}
          {phase === "transit" && "🔄 In transit op XRPL"}
          {phase === "arrived" && "✓ Gearriveerd"}
        </div>
      </div>

      <div style={{position:"relative",height:64,background:"rgba(255,255,255,.04)",borderRadius:32,border:"1px solid rgba(255,255,255,.08)",marginBottom:12,overflow:"hidden"}}>
        <div style={{
          position:"absolute",left:0,top:0,bottom:0,
          width:`${progress*100}%`,
          background:`linear-gradient(90deg,${C.teal}44,${C.tealMid}88)`,
          borderRadius:32,transition:"width .6s ease"
        }}/>
        <div style={{
          position:"absolute",top:"50%",transform:"translateY(-50%)",
          left:busLeft,fontSize:28,transition:"left .6s ease",
          filter:`drop-shadow(0 0 8px ${C.tealMid})`
        }}>🚌</div>
        <div style={{
          position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",
          fontFamily:"'DM Mono',monospace",fontSize:11,color:"rgba(255,255,255,.3)"
        }}>🏁 Bestemming</div>
      </div>

      <div className="bus-stats-row">
        {[
          {label:"Ledger blocks", val: tick.toString(), unit: "/ 32 max"},
          {label:"Transacties", val: txs.length.toString(), unit: `/ ${maxTx} plekken`},
          {label:"Verwachte kosten", val: "0.12%", unit: "+ €1.00 vast"},
          {label:"Max wachttijd", val: "5", unit: "minuten"},
        ].map((s,i) => (
          <div key={i} className="bus-stat">
            <div className="bus-stat-val">{s.val}<span style={{fontSize:12,opacity:.6}}> {s.unit}</span></div>
            <div className="bus-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:20,padding:"16px 20px",background:"rgba(255,255,255,.04)",borderRadius:10,
        fontFamily:"'DM Mono',monospace",fontSize:11,color:"rgba(255,255,255,.5)",lineHeight:1.8}}>
        <span style={{color:C.tealMid}}>BUS PROTOCOL:</span> Transacties worden gebundeld totdat de bus vol is ({maxTx} plekken)
        óf de maximale wachttijd verstreken is. De bus vertrekt altijd — ook met 1 passagier.
        Settlement via XRPL ODL (On-Demand Liquidity): XRP als bridgecurrency, finale FX-lock in stablecoin.
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("Product");

  return (
    <div>
      <style>{css}</style>

      {/* HERO */}
      <div className="hero">
        <div className="hero-noise"/>
        {[20,40,60,80].map(p => <div key={p} className="hero-grid-line v" style={{left:`${p}%`}}/>)}
        {[33,66].map(p => <div key={p} className="hero-grid-line h" style={{top:`${p}%`}}/>)}
        <div className="hero-inner">
          <div className="hero-tag">// ANK × XRPL — Product Specificatie v1.0</div>
          <h1 className="hero-title">
            ANK<br/><strong>Remit</strong><br/><em>Swift.</em>
          </h1>
          <p className="hero-sub">
            Internationale betalingen als een publieke bus op de XRP Ledger. 
            Transparant, gebundeld, maximaal eerlijk.
          </p>
          <div className="hero-stats">
            {[
              {val:<>€1 <span>–</span> €100K</>, label:"Per transactie"},
              {val:<>0.08 <span>%</span></>, label:"Laagste fee tier"},
              {val:<>35<span>+</span></>, label:"Valutacorridors"},
              {val:<>&lt;2 <span>min</span></>, label:"KYC Tier 1"},
            ].map((s,i) => (
              <div key={i} className="stat">
                <div className="stat-val">{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs-bar">
        <div className="tabs-inner">
          {TABS.map(t => (
            <button key={t} className={`tab-btn ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="wrap">

        {/* PRODUCT */}
        {tab==="Product" && (
          <div className="sec">
            <div className="sec-label">// Product Architectuur</div>
            <div className="sec-title">Het <strong>Bus Principe</strong><br/>op de <em>XRP Ledger</em></div>

            <div className="flow-diagram" style={{marginBottom:40}}>
              {[
                {icon:"💶",name:"Klant stort",detail:"IBAN of RLUSD\nANK Wallet"},
                {icon:"🚏",name:"Bushalte",detail:"Wacht op\nbundeling"},
                {icon:"⚡",name:"XRP Bridge",detail:"ODL corridor\nRipple Swift"},
                {icon:"🔒",name:"Stablecoin lock",detail:"RLUSD / USDC\nFX vastgelegd"},
                {icon:"🏦",name:"Uitbetaling",detail:"Lokale valuta\nof stablecoin"},
              ].map((f,i) => (
                <div key={i} className={`flow-node ${i===2?"active":""}`}>
                  <div className="flow-icon">{f.icon}</div>
                  <div className="flow-name">{f.name}</div>
                  <div className="flow-detail" style={{whiteSpace:"pre"}}>{f.detail}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:40}}>
              {[
                {title:"🚌 Waarom een bus?", body:"Net als een stadsbus bundelt ANK Remit meerdere kleine transacties in één XRPL-batch. Dit verlaagt de gemiddelde transactiekosten drastisch (gedeelde gas-fee), versnelt afhandeling en maakt kleinere bedragen (€1+) rendabel. De wachttijd is transparant en gebonden aan een contractueel maximum."},
                {title:"⚡ XRPL Swift toegang", body:"ANK Remit maakt gebruik van Ripple's ODL (On-Demand Liquidity) corridors via de nieuwe RippleNet Swift-toegangspakketten. XRP fungeert als de bridgecurrency: EUR→XRP→USD/AED/SGD/CNY/etc. Finale FX-koers wordt bij afrijden van de bus 'gelockt' in stablecoin — geen koersrisico voor de klant."},
                {title:"🔒 Stablecoin lock-in", body:"Na XRPL-settlement wordt de waarde vastgelegd in RLUSD (Ripple USD Stablecoin) of USDC. De ontvanger kiest: uitbetaling in lokale fiat, RLUSD aanhouden, of direct ANK Vault insturen voor yield. Dit is de bridge tussen traditioneel bankieren en crypto-native finance."},
                {title:"📊 Transparantie by design", body:"Elke bus-rit genereert een XRPL-transactie-ID die publiek verifieerbaar is op xrpscan.com. Klanten zien in real-time: welke blok hun transactie in zit, hoeveel plekken nog vrij zijn, en de exacte FX-koers bij lock-in. Geen verborgen kosten — alle fees staan on-chain."},
              ].map((c,i) => (
                <div key={i} style={{background:C.paper,border:`1px solid ${C.border}`,borderRadius:12,padding:24}}>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:10}}>{c.title}</div>
                  <div style={{fontSize:14,color:C.muted,lineHeight:1.7}}>{c.body}</div>
                </div>
              ))}
            </div>

            <div style={{background:C.ink,borderRadius:16,padding:"28px 32px",
              fontFamily:"'DM Mono',monospace",fontSize:13,lineHeight:1.8,color:"rgba(240,235,224,.7)"}}>
              <div style={{color:C.tealMid,marginBottom:12,fontSize:11,letterSpacing:3,textTransform:"uppercase"}}>
                // XRPL Bus Technische Spec
              </div>
              <div><span style={{color:"#9b59b6"}}>max_wait_blocks</span> = {"{"} T1: <span style={{color:C.gold}}>3</span>, T2: <span style={{color:C.gold}}>12</span>, T3: <span style={{color:C.gold}}>30</span> {"}"}</div>
              <div><span style={{color:"#9b59b6"}}>max_wait_seconds</span> = {"{"} T1: <span style={{color:C.gold}}>60</span>, T2: <span style={{color:C.gold}}>300</span>, T3: <span style={{color:C.gold}}>900</span> {"}"}</div>
              <div><span style={{color:"#9b59b6"}}>batch_size</span> = <span style={{color:C.gold}}>8</span> tx_per_bus <span style={{color:C.muted}}>// of eerder als max_wait bereikt</span></div>
              <div><span style={{color:"#9b59b6"}}>bridge_asset</span> = <span style={{color:C.tealMid}}>"XRP"</span> <span style={{color:C.muted}}>// Ripple ODL corridors</span></div>
              <div><span style={{color:"#9b59b6"}}>lock_asset</span> = <span style={{color:C.tealMid}}>"RLUSD" | "USDC"</span> <span style={{color:C.muted}}>// FX-lock bij afrijden</span></div>
              <div><span style={{color:"#9b59b6"}}>settlement_type</span> = <span style={{color:C.tealMid}}>"XRPL_ESCROW" | "XRPL_PAYMENT"</span></div>
              <div><span style={{color:"#9b59b6"}}>fallback</span> = <span style={{color:C.tealMid}}>"SEPA_INSTANT"</span> <span style={{color:C.muted}}>// als XRPL congested</span></div>
            </div>
          </div>
        )}

        {/* DE BUS */}
        {tab==="De Bus" && (
          <div className="sec">
            <div className="sec-label">// Live Bus Simulatie</div>
            <div className="sec-title">Zo werkt<br/><strong>de bus</strong> live</div>
            <BusAnimation/>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              {[
                {phase:"⬆ Boarding",time:"0 – max wachttijd",desc:"Transacties stappen in. De bus wacht op volle bezetting óf maximum blokken. De FX-koers is nog niet vastgelegd — de klant ziet een indicatieve koers."},
                {phase:"🚌 Vertrek",time:"Bij vol of time-out",desc:"Zodra de bus vertrekt, wordt de FX-koers gelockt via XRPL AMM of Ripple ODL. Dit is het moment van zekerheid. De klant ontvangt een Escrow-ID."},
                {phase:"✓ Aankomst",time:"3–30 XRPL blokken",desc:"XRPL settelt razendsnel. Finale stablecoin-waarde wordt vrijgegeven aan de ontvangers. XRPL-transactiehash beschikbaar voor verificatie."},
              ].map((p,i) => (
                <div key={i} style={{background:C.paper,border:`1px solid ${C.border}`,borderRadius:12,padding:24}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.tealMid,
                    letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{p.phase}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:C.gold,marginBottom:12}}>{p.time}</div>
                  <div style={{fontSize:14,color:C.muted,lineHeight:1.7}}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAKKETTEN */}
        {tab==="Pakketten" && (
          <div className="sec">
            <div className="sec-label">// Productpakketten</div>
            <div className="sec-title">Drie <strong>pakketten</strong>,<br/>één <em>principe</em></div>
            <div className="pkg-grid">
              {PACKAGES.map((p,i) => (
                <div key={i} className="pkg-card">
                  <div className="pkg-header" style={{background:p.bg}}>
                    <div className="pkg-tier" style={{color:p.textColor}}>{p.tier} — {p.icon}</div>
                    <div className="pkg-amount" style={{color:p.textColor}}>{p.label}</div>
                    <div className="pkg-range" style={{color:p.textColor}}>{p.range}</div>
                    <div className="pkg-badge" style={{background:p.badgeBg,color:"#fff"}}>{p.badgeText}</div>
                  </div>
                  <div className="pkg-body">
                    {[
                      ["Fee",p.fee],
                      ["Snelheid",p.speed],
                      ["KYC niveau",p.kyc],
                      ["Max wachttijd",p.maxWait],
                      ["Stablecoin",p.stablecoin],
                      ["Maandlimiet",p.limit],
                      ["Corridors",p.currencies],
                    ].map(([k,v],j) => (
                      <div key={j} className="pkg-row">
                        <span className="pkg-key">{k}</span>
                        <span className="pkg-val" style={{color: k==="Fee"?p.textColor:k==="Snelheid"?p.textColor:"inherit"}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:C.ink,borderRadius:12,padding:24,
              fontFamily:"'DM Mono',monospace",fontSize:12,color:"rgba(240,235,224,.6)",lineHeight:2}}>
              <div style={{color:C.tealMid,marginBottom:8,fontSize:11,letterSpacing:3,textTransform:"uppercase"}}>
                // Voorbeeldberekening: €5.000 van NL naar UAE
              </div>
              <div>ANK Remit (Standard): <span style={{color:"#f0ebe0"}}>€5.000 × 0.12% + €1.00 = <strong style={{color:C.tealMid}}>€7.00 totaal</strong></span></div>
              <div>Western Union:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{color:"#f0ebe0"}}>€5.000 × 2.5% + €4.99 = <strong style={{color:"#e74c3c"}}>~€130 totaal</strong></span></div>
              <div>Wise:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{color:"#f0ebe0"}}>€5.000 × 0.43% + €0.50 = <strong style={{color:C.gold}}>~€22 totaal</strong></span></div>
              <div style={{marginTop:8,color:C.tealMid}}>ANK Remit bespaart: <strong style={{color:"#f0ebe0"}}>€15–€123 per transactie</strong></div>
            </div>
          </div>
        )}

        {/* KYC LEVELS */}
        {tab==="KYC Levels" && (
          <div className="sec">
            <div className="sec-label">// KYC Module</div>
            <div className="sec-title">Lichter dan<br/><em>iedereen</em><br/><strong>conform de wet</strong></div>
            <div className="kyc-stack">
              {KYC_TIERS.map((tier,i) => (
                <div key={i} className="kyc-tier">
                  <div className="kyc-num" style={{background:tier.bg,color:tier.color}}>{tier.num}</div>
                  <div className="kyc-name">
                    <div className="kyc-name-title">{tier.name}</div>
                    <div className="kyc-name-sub">{tier.range}</div>
                  </div>
                  <div>
                    <div className="kyc-items">
                      {tier.items.map((item,j) => (
                        <div key={j} className="kyc-item">
                          <div className="kyc-dot" style={{background:tier.color}}/>
                          {item}
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
                      {tier.noItems.map((item,j) => (
                        <span key={j} style={{
                          background:C.bg,border:`1px solid ${C.border}`,
                          padding:"2px 10px",borderRadius:20,
                          fontSize:12,color:C.muted,
                          fontFamily:"'DM Mono',monospace"
                        }}>{item}</span>
                      ))}
                    </div>
                    <div style={{marginTop:10,fontFamily:"'DM Mono',monospace",fontSize:10,
                      color:C.muted,letterSpacing:1}}>
                      Basis: {tier.basis}
                    </div>
                  </div>
                  <div className="kyc-time">
                    <div className="kyc-time-val">{tier.timeVal}</div>
                    <div className="kyc-time-label">{tier.timeUnit}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:C.tealLight,border:`1px solid ${C.tealMid}22`,
              borderRadius:12,padding:24}}>
              <div style={{fontSize:16,fontWeight:700,color:C.teal,marginBottom:12}}>
                ⚖️ Waarom dit compliant is terwijl het lichter aanvoelt
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {[
                  {title:"Tier 1 — AMLD6 Simplified CDD",body:"Art. 15 AMLD6 staat vereenvoudigde CDD toe voor producten met laag risico: laag bedrag, beperkt gebruik, geen witwasrisico. Telefoon + IP + PEP-screening voldoet aan de minimumeisen. MoneyGram/WU passen dit niet toe omdat hun legacy-systemen dit niet aankunnen."},
                  {title:"Tier 2 — Eén selfie volstaat",body:"Visa/Mastercard vragen geen selfie maar wél een bankkaartprocedure die 3 weken duurt. ANK doet AI-gedreven liveness-check in 30 seconden — compliant met eIDAS-richtlijn en DNB-guidance op remote ID-verificatie."},
                  {title:"AI screent PEP/sancties",body:"Automatische screening (Dow Jones, UN, OFAC, EU sanctielijsten) bij elke transactie — ook voor Tier 1. Dit gaat sneller dan handmatige screening bij Western Union-agenten én is aantoonbaar beter gedocumenteerd voor regulatoire audit."},
                  {title:"Geen overkill = beter beleid",body:"De FATF Guidance on Digital ID (2020) en DNB beleidsnota 2024 moedigen risicogebaseerde KYC aan: strenger waar nodig, lichter waar risico laag is. ANK's Tier-systeem is een modelimplementatie van dit principe."},
                ].map((c,i) => (
                  <div key={i}>
                    <div style={{fontWeight:700,fontSize:14,color:C.teal,marginBottom:6}}>{c.title}</div>
                    <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{c.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VERGELIJKING */}
        {tab==="Vergelijking" && (
          <div className="sec">
            <div className="sec-label">// Marktpositie</div>
            <div className="sec-title"><strong>ANK Remit</strong><br/>vs. de <em>incumbents</em></div>
            <div className="cmp-wrap">
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th style={{background:C.bg,color:C.muted,minWidth:180}}>Criterium</th>
                    <th className="ank">⚓ ANK Remit</th>
                    <th>💛 Western Union</th>
                    <th>🟠 MoneyGram</th>
                    <th>🟢 Wise</th>
                    <th>💳 Visa Direct</th>
                    <th>🔴 Mastercard Send</th>
                    <th>🔵 PayPal</th>
                  </tr>
                </thead>
                <tbody>
                  {CMP_ROWS.map((row,i) => (
                    <tr key={i}>
                      <td className="cat">{row.cat}</td>
                      <td className="ank-col">{renderCell(row.ank)}</td>
                      <td>{renderCell(row.wu)}</td>
                      <td>{renderCell(row.mg)}</td>
                      <td>{renderCell(row.wise)}</td>
                      <td>{renderCell(row.visa)}</td>
                      <td>{renderCell(row.mc)}</td>
                      <td>{renderCell(row.paypal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{fontSize:12,color:C.muted,fontFamily:"'DM Mono',monospace",marginBottom:32}}>
              * Wise tot €1M mogelijk maar boven €50K vereist enhanced verificatie. Visa/MC real-time voor debitcards; cross-border settlement T+1. PayPal Instant: alleen binnen PayPal-netwerk.
            </div>

            <div style={{background:C.ink,borderRadius:12,padding:24}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.tealMid,
                letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>
                // Samenvattende Score (hogere = beter)
              </div>
              {[
                {name:"⚓ ANK Remit",score:92,color:C.tealMid},
                {name:"🟢 Wise",score:68,color:"#27ae60"},
                {name:"🔵 PayPal",score:51,color:C.blue},
                {name:"💳 Visa Direct",score:44,color:"#8e44ad"},
                {name:"🔴 MC Send",score:42,color:C.red},
                {name:"💛 Western Union",score:31,color:C.gold},
                {name:"🟠 MoneyGram",score:28,color:"#e67e22"},
              ].map((s,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <div style={{width:140,fontFamily:"'DM Mono',monospace",fontSize:12,color:"rgba(240,235,224,.7)"}}>{s.name}</div>
                  <div style={{flex:1,height:24,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${s.score}%`,height:"100%",background:s.color,
                      display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8,
                      transition:"width 1s ease"}}>
                      <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"#fff"}}>{s.score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGULATOIR */}
        {tab==="Regulatoir" && (
          <div className="sec">
            <div className="sec-label">// Juridisch & Compliance</div>
            <div className="sec-title">Compliance<br/><em>by design</em></div>
            <div className="reg-grid">
              {[
                {title:"🇪🇺 MiCA Art. 68 — CASP betalingen",body:[
                  "ANK Remit als onderdeel van ANK B.V. CASP-licentie (AFM)",
                  "Art. 68 MiCA: betalingsdiensten gekoppeld aan crypto-asset bewaring",
                  "RLUSD is een EMT (E-Money Token) — vereist aparte emittent-licentie óf gebruik van Ripple's bestaande EMT-registratie",
                  "Alternatief: USDC (Circle, al MiCA-compliant per dec 2024)",
                ]},
                {title:"🏛️ PSD2 / Wft Art. 1:5a",body:[
                  "ANK Remit verricht betaaldienst (geldoverdracht art. 1 lid 1 sub 6 PSD2)",
                  "PI-licentie bij DNB nodig (€125.000 kapitaal) óf EMI white-label partner (Swan/Modulr)",
                  "Optie: agent van bestaande PI/EMI — geen eigen licentie, snel te starten",
                  "WAADI-registratie niet van toepassing (geen arbeidskrachten)",
                ]},
                {title:"🔍 AMLD6 / Wwft",body:[
                  "Wwft art. 3: ANK Remit is een instelling (financiële dienstverlener)",
                  "CDD-verplichting per transactie ≥ €1.000 of vermoeden witwas",
                  "Tier 1 (<€1.000): Simplified CDD (art. 15 AMLD6) — juridisch solide mits risicoassessment gedocumenteerd",
                  "FIU-melding bij verdachte transacties (art. 16 Wwft)",
                  "Bewaartermijn KYC-data: 5 jaar (art. 33 Wwft)",
                ]},
                {title:"⚡ XRPL/ODL Compliance",body:[
                  "Ripple's ODL vereist een zakelijk contract met RippleNet",
                  "RLUSD-gebruik: Ripple als emittent houdt EMT-registratie — ANK distribueert alleen",
                  "XRPL is een publiek gedecentraliseerd netwerk — transacties zijn pseudoniem maar traceerbaar",
                  "Travel Rule (FATF Rec. 16, Wtra): verplicht voor transfers ≥ €1.000 — XRPL-compatible via IVMS101 standaard",
                ]},
                {title:"🛡️ GDPR / AVG",body:[
                  "KYC-data: verwerking op basis van wettelijke verplichting (art. 6(1)(c) AVG)",
                  "Data minimization: Tier 1 slaat alleen gehashte telefoon + device-ID op",
                  "Bewaartermijn: 5 jaar (Wwft) daarna automatisch verwijderd",
                  "Verwerkers: AI-liveness check (bijv. Onfido/Veriff) — DPA vereist",
                ]},
                {title:"📅 Tijdlijn Vergunningen",body:[
                  "Nu → Q3 2026: opereren als agent van Swan/Modulr (geen eigen PI nodig)",
                  "Q3 2026: ANK CASP-aanvraag bij AFM (voor crypto-component)",
                  "Q1 2027: eigen PI-licentie bij DNB (€125K kapitaal)",
                  "Q3 2027: volledige zelfstandige operatie ANK Remit zonder partner",
                ]},
              ].map((c,i) => (
                <div key={i} className="reg-card">
                  <h4>{c.title}</h4>
                  <ul>{c.body.map((b,j) => <li key={j}>{b}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div style={{background:C.ink,padding:"32px 40px",textAlign:"center",marginTop:40}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:300,color:"#f0ebe0"}}>
          ANK <span style={{color:C.tealMid}}>Remit</span>
        </div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#5a5448",marginTop:8,letterSpacing:2}}>
          PRODUCT SPECIFICATIE v1.0 — VERTROUWELIJK — VIRTUALV HOLDING B.V.
        </div>
      </div>
    </div>
  );
}
