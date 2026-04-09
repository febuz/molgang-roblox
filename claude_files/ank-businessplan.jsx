import { useState } from "react";

const palette = {
  ink: "#0d0d0d",
  cream: "#f5f0e8",
  gold: "#c8a84b",
  goldLight: "#e8d5a0",
  rust: "#8b3a1e",
  sage: "#4a6741",
  stone: "#7a7068",
  white: "#faf9f6",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${palette.cream}; color: ${palette.ink}; font-family: 'DM Sans', sans-serif; }

  .hero {
    background: ${palette.ink};
    color: ${palette.cream};
    padding: 80px 40px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '⚓';
    position: absolute;
    font-size: 400px;
    opacity: 0.04;
    top: -80px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .hero-tag {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: ${palette.gold};
    margin-bottom: 20px;
  }
  .hero h1 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(48px, 8vw, 96px);
    font-weight: 900;
    line-height: 1;
    margin-bottom: 12px;
  }
  .hero h1 span { color: ${palette.gold}; }
  .hero-sub {
    font-size: 18px;
    color: #aaa;
    font-weight: 300;
    max-width: 480px;
    margin: 0 auto 40px;
    line-height: 1.6;
  }
  .hero-pills {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .pill {
    background: rgba(200,168,75,0.15);
    border: 1px solid ${palette.gold};
    color: ${palette.gold};
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 12px;
    letter-spacing: 1px;
  }

  .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

  .section { padding: 64px 0; }
  .section-label {
    font-size: 10px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: ${palette.gold};
    margin-bottom: 8px;
  }
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(28px, 4vw, 44px);
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 32px;
    color: ${palette.ink};
  }
  .section-title em { color: ${palette.rust}; font-style: normal; }

  .divider {
    height: 1px;
    background: linear-gradient(to right, transparent, ${palette.goldLight}, transparent);
    margin: 0 40px;
  }

  /* KERN MECHANIC */
  .mechanic-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2px;
    background: ${palette.goldLight}22;
    border: 1px solid ${palette.goldLight};
    border-radius: 16px;
    overflow: hidden;
  }
  .mechanic-step {
    background: ${palette.white};
    padding: 32px 24px;
    position: relative;
  }
  .mechanic-step:not(:last-child)::after {
    content: '→';
    position: absolute;
    right: -16px;
    top: 50%;
    transform: translateY(-50%);
    color: ${palette.gold};
    font-size: 24px;
    z-index: 2;
  }
  .step-num {
    font-family: 'Playfair Display', serif;
    font-size: 48px;
    font-weight: 900;
    color: ${palette.goldLight};
    line-height: 1;
    margin-bottom: 8px;
  }
  .step-title {
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 8px;
    color: ${palette.ink};
  }
  .step-body { font-size: 13px; color: ${palette.stone}; line-height: 1.6; }

  /* TABS */
  .tabs { display: flex; gap: 4px; margin-bottom: 32px; flex-wrap: wrap; }
  .tab {
    padding: 10px 20px;
    border-radius: 8px;
    border: 1px solid ${palette.goldLight};
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    cursor: pointer;
    color: ${palette.stone};
    transition: all 0.2s;
  }
  .tab.active {
    background: ${palette.ink};
    color: ${palette.gold};
    border-color: ${palette.ink};
  }
  .tab:hover:not(.active) { background: ${palette.goldLight}33; }

  /* LEAN CANVAS */
  .canvas-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: auto auto auto;
    gap: 2px;
    background: ${palette.ink}22;
    border: 1px solid ${palette.ink}22;
    border-radius: 12px;
    overflow: hidden;
  }
  .canvas-cell {
    background: ${palette.white};
    padding: 20px 16px;
    min-height: 140px;
  }
  .canvas-cell.tall { grid-row: span 2; }
  .canvas-cell.wide { grid-column: span 2; }
  .canvas-cell.full { grid-column: span 5; }
  .canvas-cell.dark { background: ${palette.ink}; color: ${palette.cream}; }
  .canvas-cell.gold-bg { background: ${palette.gold}; color: ${palette.ink}; }
  .cell-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: ${palette.gold};
    margin-bottom: 10px;
  }
  .canvas-cell.dark .cell-label { color: ${palette.goldLight}; }
  .canvas-cell.gold-bg .cell-label { color: ${palette.ink}88; }
  .cell-content { font-size: 12px; line-height: 1.7; color: ${palette.stone}; }
  .canvas-cell.dark .cell-content { color: #ccc; }
  .canvas-cell.gold-bg .cell-content { color: ${palette.ink}; font-weight: 500; }
  .cell-items { list-style: none; }
  .cell-items li { font-size: 12px; line-height: 1.7; color: ${palette.stone}; padding-left: 12px; position: relative; }
  .cell-items li::before { content: '—'; position: absolute; left: 0; color: ${palette.gold}; }
  .canvas-cell.dark .cell-items li { color: #ccc; }

  /* NICHES */
  .niche-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
  }
  .niche-card {
    border: 1px solid ${palette.goldLight};
    border-radius: 16px;
    overflow: hidden;
    background: ${palette.white};
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .niche-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
  .niche-header {
    padding: 24px;
    background: ${palette.ink};
    color: ${palette.cream};
  }
  .niche-icon { font-size: 32px; margin-bottom: 12px; }
  .niche-name {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .niche-sub { font-size: 12px; color: #888; }
  .niche-body { padding: 20px 24px; }
  .niche-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
  .niche-key { font-size: 11px; color: ${palette.stone}; letter-spacing: 1px; text-transform: uppercase; }
  .niche-val { font-size: 13px; font-weight: 500; color: ${palette.ink}; }
  .niche-val.gold { color: ${palette.gold}; }
  .niche-desc { font-size: 12px; color: ${palette.stone}; line-height: 1.6; margin-top: 12px; border-top: 1px solid ${palette.goldLight}; padding-top: 12px; }

  /* TABLES */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th {
    background: ${palette.ink};
    color: ${palette.gold};
    padding: 12px 16px;
    text-align: left;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 500;
  }
  td { padding: 12px 16px; border-bottom: 1px solid ${palette.goldLight}33; color: ${palette.stone}; }
  tr:hover td { background: ${palette.goldLight}15; }
  td:first-child { color: ${palette.ink}; font-weight: 500; }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
  }
  .badge-green { background: #e8f5e9; color: #2e7d32; }
  .badge-amber { background: #fff8e1; color: #f57f17; }
  .badge-red { background: #fce4ec; color: #c62828; }

  /* FINANCIALS */
  .fin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .fin-card {
    background: ${palette.white};
    border: 1px solid ${palette.goldLight};
    border-radius: 16px;
    padding: 28px;
  }
  .fin-card h3 {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    margin-bottom: 20px;
    color: ${palette.ink};
  }
  .fin-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid ${palette.goldLight}33; }
  .fin-label { font-size: 12px; color: ${palette.stone}; }
  .fin-val { font-size: 13px; font-weight: 500; color: ${palette.ink}; }
  .fin-val.positive { color: ${palette.sage}; }
  .fin-val.negative { color: ${palette.rust}; }
  .fin-total { display: flex; justify-content: space-between; padding: 12px 0; margin-top: 8px; }
  .fin-total .fin-label { font-weight: 600; color: ${palette.ink}; font-size: 13px; }
  .fin-total .fin-val { font-size: 15px; }

  .milestone-line {
    position: relative;
    padding-left: 40px;
    margin-bottom: 28px;
  }
  .milestone-line::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 20px;
    bottom: -28px;
    width: 2px;
    background: ${palette.goldLight};
  }
  .milestone-line:last-child::before { display: none; }
  .milestone-dot {
    position: absolute;
    left: 5px;
    top: 4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${palette.gold};
    border: 3px solid ${palette.cream};
    box-shadow: 0 0 0 2px ${palette.gold};
  }
  .milestone-phase {
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: ${palette.gold};
    margin-bottom: 2px;
  }
  .milestone-title {
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .milestone-body { font-size: 12px; color: ${palette.stone}; line-height: 1.7; }

  /* MARKETING */
  .mkt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .mkt-card {
    background: ${palette.white};
    border: 1px solid ${palette.goldLight};
    border-radius: 12px;
    padding: 24px;
  }
  .mkt-card h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mkt-card p, .mkt-card li {
    font-size: 12px;
    color: ${palette.stone};
    line-height: 1.7;
  }
  .mkt-card ul { padding-left: 16px; }

  /* REGULATORY */
  .reg-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .reg-layer {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 18px 24px;
    border-radius: 12px;
    border: 1px solid ${palette.goldLight};
    background: ${palette.white};
  }
  .reg-layer.active { background: ${palette.ink}; color: ${palette.cream}; border-color: ${palette.ink}; }
  .reg-icon { font-size: 24px; flex-shrink: 0; }
  .reg-title { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
  .reg-active .reg-title { color: ${palette.gold}; }
  .reg-desc { font-size: 12px; color: ${palette.stone}; line-height: 1.5; }
  .reg-layer.active .reg-desc { color: #aaa; }
  .reg-threshold { margin-left: auto; text-align: right; flex-shrink: 0; }
  .reg-threshold-val { font-size: 15px; font-weight: 700; color: ${palette.gold}; }
  .reg-threshold-label { font-size: 10px; color: ${palette.stone}; }
  .reg-layer.active .reg-threshold-label { color: #888; }

  @media(max-width: 768px) {
    .mechanic-grid { grid-template-columns: 1fr; }
    .mechanic-step::after { display: none; }
    .fin-grid { grid-template-columns: 1fr; }
    .mkt-grid { grid-template-columns: 1fr; }
    .canvas-grid { grid-template-columns: 1fr 1fr; }
    .canvas-cell.full { grid-column: span 2; }
    .canvas-cell.wide { grid-column: span 2; }
  }
`;

const NICHES = [
  {
    icon: "🏡",
    name: "ANK Opvolging",
    sub: "Ouders → kinderen",
    target: "€20K – €150K",
    rente: "1.5 – 3%",
    looptijd: "10 – 30 jaar",
    zekerheden: "Recht van hypotheek",
    desc: "Ouders zetten overwaarde in als borg zodat hun kind een woning koopt of overbrugt zonder bank. De ANK-coöperatie faciliteert het notariële traject en beheert terugbetaling via XRPL.",
  },
  {
    icon: "🔨",
    name: "ANK Verbouw",
    sub: "Verduurzaming & renovatie",
    target: "€10K – €80K",
    rente: "2 – 4%",
    looptijd: "5 – 15 jaar",
    zekerheden: "2e hypotheek + taxatierapport",
    desc: "WOZ-stijging door verbouwing genereert hogere leenruimte. Lening gefinancierd door ANK-pool-leden die rendement zoeken op hun liquide overwaarde.",
  },
  {
    icon: "₿",
    name: "ANK Crypto",
    sub: "XRP & digital assets",
    target: "€5K – €50K",
    rente: "4 – 8%",
    looptijd: "1 – 5 jaar",
    zekerheden: "XRP/RLUSD collateral + gedeeltelijk vastgoed",
    desc: "Hoogste rente-niche: lening voor crypto-aankopen gedekt door combinatie van XRP-collateral (on-chain Escrow op XRPL) én overwaarde. Volledig on-chain afhandeling.",
  },
  {
    icon: "🎓",
    name: "ANK Studie",
    sub: "Kennis investering",
    target: "€5K – €30K",
    rente: "0.5 – 2%",
    looptijd: "5 – 15 jaar",
    zekerheden: "Solidariteitsfonds garantie",
    desc: "Nul of minimale rente voor studie/opleiding. Gedekt door het ANK Solidariteitsfonds: overwaarde van meerdere leden dekt het risico collectief. VOC-principe: collectief kapitaal, individueel profijt.",
  },
];

const tabs = ["Concept", "Lean Canvas", "Niches", "Businessmodel", "Marketing", "Financiering", "Regulatie"];

export default function App() {
  const [active, setActive] = useState("Concept");

  return (
    <div>
      <style>{styles}</style>

      {/* HERO */}
      <div className="hero">
        <div className="hero-tag">Bedrijfsplan 2026 — VirtualV Holding B.V.</div>
        <h1>ANK<span>⚓</span></h1>
        <div className="hero-sub">
          Jouw huis. Jouw anker.<br />
          <em style={{color: palette.goldLight}}>Voor elkaar.</em>
        </div>
        <div className="hero-pills">
          <span className="pill">XRP Ledger</span>
          <span className="pill">Kredietunie Model</span>
          <span className="pill">Overwaarde-gedekt</span>
          <span className="pill">Privacy-first</span>
          <span className="pill">Vergunningvrij tot €10M</span>
        </div>
      </div>

      {/* TABS */}
      <div style={{background: palette.white, borderBottom: `1px solid ${palette.goldLight}`, position: "sticky", top: 0, zIndex: 10}}>
        <div className="container" style={{padding: "0 24px"}}>
          <div className="tabs" style={{margin: 0, padding: "12px 0", gap: "4px"}}>
            {tabs.map(t => (
              <button key={t} className={`tab ${active === t ? "active" : ""}`} onClick={() => setActive(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="container">

        {/* CONCEPT */}
        {active === "Concept" && (
          <div className="section">
            <div className="section-label">De kern</div>
            <div className="section-title">Geen bank. Een <em>Ank</em>.<br />De VOC voor woonkapitaal.</div>

            <div className="mechanic-grid">
              <div className="mechanic-step">
                <div className="step-num">01</div>
                <div className="step-title">Jij brengt je overwaarde in</div>
                <div className="step-body">
                  Als lid van ANK Coöperatief U.A. zet jij een deel van je woningoverwaarde als borg in het Solidariteitsfonds. Geen liquide geld: een notarieel recht van hypotheek op ANK's naam. Jij blijft eigenaar. Jouw woning is het anker.
                </div>
              </div>
              <div className="mechanic-step">
                <div className="step-num">02</div>
                <div className="step-title">Het fonds leent uit aan leden</div>
                <div className="step-body">
                  ANK matcht vraag (lener) met aanbod (belegger-lid). De coöperatie faciliteert het contract, de notaris, en de XRPL-afhandeling. Leners betalen rente; belegger-leden ontvangen dit rendement. ANK pakt een platformvergoeding.
                </div>
              </div>
              <div className="mechanic-step">
                <div className="step-num">03</div>
                <div className="step-title">XRPL regelt alles</div>
                <div className="step-body">
                  Elke lening leeft als XRPL Escrow-contract. Terugbetaling gaat automatisch via RLUSD of EUR-IBAN bridge. Transparant, onomkeerbaar, geen tussenpartij. Jij ziet live wat jouw kapitaal doet.
                </div>
              </div>
            </div>

            <div style={{marginTop: 48}}>
              <div className="section-label">De piratenstrategie</div>
              <div className="section-title">Wij zijn geen <em>bank</em>.<br />Wij zijn een kredietunie.</div>
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24}}>
                {[
                  {title: "Kredietunie = leden lenen aan leden", body: "Wet Toezicht Kredietunies (Wtk): coöperatieve structuur waarbij leden onderling krediet verlenen. Onder €10M portfoliobalans: NÙLL DNB-toezicht. Geen bankvergunning nodig. Geen EMI nodig. Dit is de juridische ruggengraat van ANK."},
                  {title: "De VOC-parallel", body: "De VOC haalde privékapitaal op (aandeelhouders = leden), sloeg nationale grenzen over, en bouwde handelsmacht zonder 'staatsbank'. ANK doet hetzelfde: leden investeren collectief, verdelen risico, en omzeilen het traditionele bancaire intermediair volledig."},
                  {title: "Overwaarde als vloot", body: "Nederland heeft €1.000+ miljard aan woningoverwaarde. Het staat stil. ANK maakt dit kapitaal vlot — zonder het te verkopen. Jij anker t je vermogen en zet het aan het werk voor je netwerk."},
                  {title: "Schaalpad naar €800K kas", body: "Fase 1 (Wtk, 0-€10M): nul regulatoire kosten. Fase 2 (licht Wtk, €10-100M): minimale rapportage. Pas bij >€100M portfoliobalans nadenken over EMI/PI. De €800K kas trigger = Fase 2 transitie, niet eerder."},
                ].map((c,i) => (
                  <div key={i} style={{background: palette.white, border: `1px solid ${palette.goldLight}`, borderRadius: 12, padding: 24}}>
                    <div style={{fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 8}}>{c.title}</div>
                    <div style={{fontSize: 13, color: palette.stone, lineHeight: 1.7}}>{c.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LEAN CANVAS */}
        {active === "Lean Canvas" && (
          <div className="section">
            <div className="section-label">Lean Startup</div>
            <div className="section-title">ANK <em>Lean Canvas</em></div>
            <div className="canvas-grid">
              <div className="canvas-cell tall">
                <div className="cell-label">Probleem</div>
                <ul className="cell-items">
                  <li>Overwaarde staat stil terwijl kinderen/buren kapitaal tekortkomen</li>
                  <li>Bancaire rente is hoog, privacy nihil</li>
                  <li>Intergenerationeel vermogen ontoegankelijk</li>
                  <li>Crypto-aankopen worden niet gefinancierd door banken</li>
                </ul>
                <div style={{marginTop: 20}}>
                  <div className="cell-label">Bestaande alternatieven</div>
                  <ul className="cell-items">
                    <li>Hypotheek ophogen bij bank (hoge kosten, trage doorlooptijd)</li>
                    <li>Familiehypotheek (informeel, juridisch kwetsbaar)</li>
                    <li>Kredietunie concurrenten (Qredits = ZZP, niet particulier)</li>
                  </ul>
                </div>
              </div>
              <div className="canvas-cell">
                <div className="cell-label">Oplossing</div>
                <ul className="cell-items">
                  <li>Coöperatief platform waarbij overwaarde productief wordt gemaakt</li>
                  <li>Notariële zekerheden zonder bank</li>
                  <li>XRPL Escrow voor automatische terugbetaling</li>
                  <li>Vier niches: opvolging, verbouw, crypto, studie</li>
                </ul>
              </div>
              <div className="canvas-cell dark tall">
                <div className="cell-label">Uniek waardevoorstel</div>
                <div className="cell-content" style={{fontSize: 14, fontWeight: 500, color: palette.gold, fontFamily: "'Playfair Display', serif", lineHeight: 1.4}}>
                  "Jouw huis is het anker voor jouw netwerk — en dat van jouw kinderen."
                </div>
                <div className="cell-content" style={{marginTop: 16}}>
                  ANK is de enige plek waar je overwaarde productief maakt zonder je woning te verkopen, zonder bank, en met volledige privacy op de XRPL.
                </div>
              </div>
              <div className="canvas-cell">
                <div className="cell-label">Oneerlijk voordeel</div>
                <ul className="cell-items">
                  <li>XRPL-tech stack: lagere operationele kosten dan elke bank</li>
                  <li>Kredietunie structuur: vergunningvrij tot €10M</li>
                  <li>VirtualV / EHMAC data science = betere kredietscoring</li>
                  <li>Coöperatief vertrouwen > bank-wantrouwen</li>
                </ul>
              </div>
              <div className="canvas-cell">
                <div className="cell-label">Klantsegmenten</div>
                <ul className="cell-items">
                  <li>Huizenbezitters 40-65 met overwaarde (€100K+)</li>
                  <li>Kinderen die willen kopen (25-35)</li>
                  <li>ZZP'ers met verbouwwens</li>
                  <li>Crypto-native NL (400K+ mensen)</li>
                  <li>Vroege adoptors: IJburg/Amsterdam community</li>
                </ul>
              </div>
              <div className="canvas-cell">
                <div className="cell-label">Key Metrics</div>
                <ul className="cell-items">
                  <li>Leden (leners + beleggers)</li>
                  <li>Totale lening portfolio (€)</li>
                  <li>Gemiddeld rendement belegger-lid</li>
                  <li>Default rate per niche</li>
                  <li>NPS (verwijzingen)</li>
                </ul>
              </div>
              <div className="canvas-cell wide">
                <div className="cell-label">Kanalen</div>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12}}>
                  {[
                    {fase: "Fase 1", ch: "Persoonlijk netwerk IJburg/Amsterdam, WhatsApp groepen, Facebook wijkgroepen"},
                    {fase: "Fase 2", ch: "Farcaster/Web3 community, Reddit r/DutchFIRE, LinkedIn ZZP-financiën"},
                    {fase: "Fase 3", ch: "PR (ANK als beweging), notarissen als verwijzers, hypotheekadviseurs"},
                  ].map((c,i) => (
                    <div key={i}>
                      <div style={{fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: palette.gold, marginBottom: 4}}>{c.fase}</div>
                      <div style={{fontSize: 12, color: palette.stone, lineHeight: 1.6}}>{c.ch}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="canvas-cell gold-bg wide">
                <div className="cell-label">Kostenstructuur</div>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16}}>
                  <div>
                    <div style={{fontSize: 12, fontWeight: 600, marginBottom: 4}}>Vast (maandelijks)</div>
                    <ul className="cell-items">
                      <li>XRPL node + infra: €50/mnd</li>
                      <li>Legal retainer notaris: €200/mnd</li>
                      <li>KVK/admin: €50/mnd</li>
                    </ul>
                  </div>
                  <div>
                    <div style={{fontSize: 12, fontWeight: 600, marginBottom: 4}}>Variabel (per lening)</div>
                    <ul className="cell-items">
                      <li>Notariskosten: €300-800</li>
                      <li>Taxatie: €300-500</li>
                      <li>KYC/ID check: €5-15</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="canvas-cell wide">
                <div className="cell-label">Inkomstenstromen</div>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12}}>
                  {[
                    {stroom: "Platformfee", detail: "1-1.5% van leenbedrag bij origination. Op €5M portfolio = €50-75K/jaar"},
                    {stroom: "Spread", detail: "0.5-1% rente-spread tussen lener en belegger-lid. Stijgt met volume."},
                    {stroom: "Ledenbijdrage", detail: "€99/jaar voor belegger-leden (toegang dashboard + XRPL wallet). Coöperatief model."},
                  ].map((c,i) => (
                    <div key={i}>
                      <div style={{fontSize: 11, fontWeight: 600, color: palette.ink, marginBottom: 4}}>{c.stroom}</div>
                      <div style={{fontSize: 12, color: palette.stone, lineHeight: 1.6}}>{c.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NICHES */}
        {active === "Niches" && (
          <div className="section">
            <div className="section-label">Producten</div>
            <div className="section-title">Vier <em>ankers</em><br />voor vier levensfasen</div>
            <div className="niche-cards">
              {NICHES.map((n, i) => (
                <div key={i} className="niche-card">
                  <div className="niche-header">
                    <div className="niche-icon">{n.icon}</div>
                    <div className="niche-name">{n.name}</div>
                    <div className="niche-sub">{n.sub}</div>
                  </div>
                  <div className="niche-body">
                    <div className="niche-row">
                      <span className="niche-key">Leenbedrag</span>
                      <span className="niche-val gold">{n.target}</span>
                    </div>
                    <div className="niche-row">
                      <span className="niche-key">Rente</span>
                      <span className="niche-val">{n.rente}</span>
                    </div>
                    <div className="niche-row">
                      <span className="niche-key">Looptijd</span>
                      <span className="niche-val">{n.looptijd}</span>
                    </div>
                    <div className="niche-row">
                      <span className="niche-key">Zekerheid</span>
                      <span className="niche-val" style={{fontSize: 11, textAlign: "right", maxWidth: 160}}>{n.zekerheden}</span>
                    </div>
                    <div className="niche-desc">{n.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{marginTop: 48}}>
              <div className="section-label">Kredietproces</div>
              <div className="section-title">Van aanvraag<br />tot <em>XRPL Escrow</em></div>
              <table>
                <thead>
                  <tr>
                    <th>Stap</th><th>Actie</th><th>Wie</th><th>Doorlooptijd</th><th>Tech</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["1. Aanvraag", "Lid dient leenverzoek in via ANK app", "Lener", "5 min", "ANK App + XRPL wallet connect"],
                    ["2. Kredietcheck", "ANK ML-model scoort aanvraag (LightGBM + WOZ data)", "ANK automatisch", "< 24u", "EHMAC data science"],
                    ["3. Taxatie", "Gecertificeerde taxateur waardeert woning", "Taxateur", "3-5 dagen", "API taxatierapport"],
                    ["4. Matching", "ANK matcht met belegger-lid(en) uit fonds", "ANK platform", "1-3 dagen", "Matching algorithm"],
                    ["5. Notaris", "Recht van hypotheek gevestigd, contract gesigneerd", "Notaris + partijen", "1-2 weken", "iDIN + eHerkenning"],
                    ["6. Uitbetaling", "XRPL Escrow aangemaakt, RLUSD/EUR overgemaakt", "Automatisch", "< 1 uur", "XRPL Escrow smart contract"],
                    ["7. Terugbetaling", "Maandelijkse automatische afschrijving via Escrow release", "Automatisch", "Ongoing", "XRPL + IBAN bridge"],
                  ].map((r,i) => (
                    <tr key={i}>
                      <td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td style={{fontSize: 11}}>{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BUSINESSMODEL */}
        {active === "Businessmodel" && (
          <div className="section">
            <div className="section-label">Uitgebreid Businessmodel</div>
            <div className="section-title">Hoe ANK <em>geld verdient</em><br />en waarde creëert</div>

            <table style={{marginBottom: 48}}>
              <thead>
                <tr><th>Inkomstenstroom</th><th>Mechanisme</th><th>Tarief</th><th>Jaar 1 (10 leningen)</th><th>Jaar 3 (200 leningen)</th></tr>
              </thead>
              <tbody>
                {[
                  ["Origination fee", "Eenmalig bij verstrekking, gedragen door lener", "1.25%", "€6.250", "€250.000"],
                  ["Rente-spread", "Verschil lener vs belegger-lid rente", "0.75% p.a.", "€1.875", "€112.500"],
                  ["Ledenbijdrage beleggers", "€99/jaar voor dashboard + wallet toegang", "€99/lid/jaar", "€990", "€9.900"],
                  ["Notaris-referral", "Verwijs vergoeding van partnerkantoor", "€150/lening", "€1.500", "€30.000"],
                  ["ANK Crypto premium", "Hogere spread op crypto-niche leningen", "+1.5% spread", "€750", "€45.000"],
                  ["Treasury yield", "Idle fondsgeld in XRPL AMM/Aave USDC", "5% p.a.", "€250", "€25.000"],
                ].map((r,i) => (
                  <tr key={i}>
                    <td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td>
                    <td style={{color: palette.sage, fontWeight: 500}}>{r[3]}</td>
                    <td style={{color: palette.gold, fontWeight: 500}}>{r[4]}</td>
                  </tr>
                ))}
                <tr style={{borderTop: `2px solid ${palette.gold}`}}>
                  <td style={{fontWeight: 700}}>TOTAAL</td><td></td><td></td>
                  <td style={{color: palette.sage, fontWeight: 700}}>~€11.600</td>
                  <td style={{color: palette.gold, fontWeight: 700}}>~€472.400</td>
                </tr>
              </tbody>
            </table>

            <div className="section-label">Unit Economics per Lening</div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 48}}>
              {[
                {label: "Gem. leenbedrag", val: "€45.000", sub: "Mix van alle niches"},
                {label: "Origination fee (bruto)", val: "€563", sub: "1.25% eenmalig"},
                {label: "Variabele kosten/lening", val: "€650 - €1.300", sub: "Notaris + taxatie + KYC"},
                {label: "Nettomargin Jaar 1", val: "negatief", sub: "Leercurve + schaal"},
                {label: "Break-even leningen", val: "~35 / jaar", sub: "Bij €63K vaste lasten"},
                {label: "CLV belegger-lid (5jr)", val: "€495+", sub: "€99/jr + spread inkomsten"},
              ].map((c,i) => (
                <div key={i} style={{background: palette.white, border: `1px solid ${palette.goldLight}`, borderRadius: 12, padding: 20}}>
                  <div style={{fontSize: 11, color: palette.stone, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4}}>{c.label}</div>
                  <div style={{fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: palette.ink}}>{c.val}</div>
                  <div style={{fontSize: 11, color: palette.stone, marginTop: 4}}>{c.sub}</div>
                </div>
              ))}
            </div>

            <div className="section-label">Drijfveren organische groei</div>
            <table>
              <thead>
                <tr><th>Vliegwiel</th><th>Hoe het werkt</th><th>Impact</th></tr>
              </thead>
              <tbody>
                {[
                  ["Verwijzingsnetwerk", "Elk lid dat geld heeft geleend vertelt zijn netwerk → nieuwe leners en beleggers komen organisch", "K-factor > 1 na 50 leden"],
                  ["Rente-rendement pull", "Belegger-leden verdienen 2-6% risicoarm rendement → vertellen vrienden → nieuwe beleggers", "Vult fonds zonder marketing"],
                  ["Notaris-netwerk", "Partnerkantoor heeft toegang tot honderden klanten met overwaarde → structureel instroom", "B2B kanaal zonder salaris"],
                  ["XRPL on-chain transparantie", "Elk afbetaald contract is publiek zichtbaar → vertrouwensopbouw → pers en social proof", "Gratis marketing + PR"],
                  ["EHMAC data flywheel", "Meer leningen → betere ML-kredietscoring → lagere defaults → hogere rendementen → meer leden", "Competitief moat"],
                ].map((r,i) => (
                  <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MARKETING */}
        {active === "Marketing" && (
          <div className="section">
            <div className="section-label">Marketingplan</div>
            <div className="section-title">De <em>beweging</em><br />niet het product</div>
            <p style={{fontSize: 14, color: palette.stone, maxWidth: 600, marginBottom: 40, lineHeight: 1.8}}>
              ANK verkoopt geen financieel product — het verkoopt een identiteitsshift. Van "ik heb overwaarde die stil staat" naar "ik ben een ankier voor mijn gemeenschap." Marketing volgt de bewegingsstrategie van Triodos Bank en STARK-gevoel van Bunq, maar hyperlocaal en crypto-native.
            </p>

            <div className="section-label">Fase 1 — Organische kern (0 – 100 leden)</div>
            <div className="mkt-grid" style={{marginBottom: 40}}>
              {[
                {icon: "🏘️", title: "IJburg Community First", body: ["Jij woont in IJburg: hét testbed.", "Buurt-WhatsApp + Facebook IJburg groep: 1 post per week over overwaarde.", "Eerste 10 leden = founding members met levenslang €0 ledenbijdrage.", "Organische groei via ANK-bord bij voordeur (letterlijk een anker)"]},
                {icon: "🤝", title: "Notaris Partnerships", body: ["2-3 Amsterdamse notariskantoren als referral partners.", "Zij zien dagelijks mensen met overwaarde-vragen.", "Commissie: €150 per doorgestuurde lening die wordt afgesloten.", "Maak een A4 folder die notarissen bij taxatiegesprekken neerleggen."]},
                {icon: "📖", title: "Content: 'De Ankier'", body: ["Substack / nieuwsbrief: 'Hoe ik mijn overwaarde liet werken voor mijn dochter'.", "1 echte case study per kwartaal (geanonimiseerd).", "SEO target: 'familiehypotheek zonder bank', 'overwaarde investeren', 'kredietunie particulier'"]},
                {icon: "🎙️", title: "Podcast & Community", body: ["Gast op DutchFIRE podcast, Geldfit, en crypto NL podcasts.", "Reddit r/DutchFIRE: bijdragen aan threads over overwaarde + crypto.", "LinkedIn: Edwin als thought leader 'De nieuwe Nederlandse volksbank bestaat al — jij bent hem.'"]},
              ].map((c,i) => (
                <div key={i} className="mkt-card">
                  <h4><span>{c.icon}</span> {c.title}</h4>
                  <ul>{c.body.map((b,j) => <li key={j}>{b}</li>)}</ul>
                </div>
              ))}
            </div>

            <div className="section-label">Fase 2 — Schaal (100 – 2.000 leden)</div>
            <div className="mkt-grid" style={{marginBottom: 40}}>
              {[
                {icon: "⚓", title: "Merkbeweging: 'De Ankiers'", body: ["Leden worden 'Ankiers' — identiteitsmerk.", "Fysiek ankerteken: pin/sticker voor op je voordeur.", "Jaarlijkse Ankiers-dag: bijeenkomst met transparantie-rapport + borrel.", "Persbericht 'Eerste Nederlandse woning-gebaseerde coöperatief op blockchain'"]},
                {icon: "🌐", title: "Farcaster / Web3 Kanaal", body: ["Frame op Farcaster: 'Check hoeveel ANK-kapaciteit jouw overwaarde heeft'.", "XRP community NL: organic posts over XRPL Escrow werking.", "Crypto Twitter/X: educatieve threads over particulier krediet vs bank."]},
                {icon: "📺", title: "PR & Media", body: ["Target: RTL Z, FD, NRC Handelsblad (financieel katern).", "Hook: 'Amsterdamse startup laat buren elkaars bank worden'.", "Pers-kit: één case study per niche (kind + woning, verbouw, crypto)."]},
                {icon: "🔁", title: "Referral Engine", body: ["Elke lener die doorverwijst: €50 korting op volgende lening-fee.", "Elke belegger die doorverwijst: 1 maand gratis ledenbijdrage.", "Top-referrer per kwartaal: 'Ankier van het Kwartaal' + PR spotlight."]},
              ].map((c,i) => (
                <div key={i} className="mkt-card">
                  <h4><span>{c.icon}</span> {c.title}</h4>
                  <ul>{c.body.map((b,j) => <li key={j}>{b}</li>)}</ul>
                </div>
              ))}
            </div>

            <div className="section-label">Campagne concepten</div>
            <table>
              <thead>
                <tr><th>Campagne</th><th>Kanaal</th><th>Boodschap</th><th>Doel</th></tr>
              </thead>
              <tbody>
                {[
                  ["'ING weet wat je gisterochtend at'", "Social + PR", "Jouw transacties zijn jouw zaken. Niet die van ons.", "Privacy-bewuste consumenten"],
                  ["'Mijn kind kocht een huis zonder bank'", "Substack + LinkedIn", "Case study: overwaarde → eerste koopwoning kind", "Ouders 45-65"],
                  ["'Mijn verbouwing op de blockchain'", "Instagram + YouTube short", "Before/after + XRPL transparantie demo", "Verbouw-doelgroep"],
                  ["'Ik kocht XRP met mijn huis'", "Crypto Twitter + Farcaster", "ANK Crypto niche: de logica uitgelegd", "Crypto-native NL"],
                  ["'100 Ankiers. €5M verzet.'", "PR + Substack", "Jaarrapport als beweging-mijlpaal", "Investeerders + media"],
                ].map((r,i) => (
                  <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FINANCIERING */}
        {active === "Financiering" && (
          <div className="section">
            <div className="section-label">Financieringsplan</div>
            <div className="section-title">Organische groei.<br /><em>Nul externe investeerders</em> — tot jij het wilt.</div>

            <div className="fin-grid" style={{marginBottom: 48}}>
              <div className="fin-card">
                <h3>Opstartbudget (Jaar 0)</h3>
                {[
                  ["ANK B.V. / Coöperatie oprichting", "€300"],
                  ["Notaris (model-hypotheekakte)", "€1.500"],
                  ["Legal review kredietunie structuur", "€3.000"],
                  ["XRPL testnet + wallet infra", "€500"],
                  ["ANK app MVP (React PWA)", "€0 (EHMAC uren)"],
                  ["Merk + domeinen", "€500"],
                  ["Eerste 2 leningen (notaris + taxatie)", "€2.400"],
                ].map(([l,v],i) => (
                  <div key={i} className="fin-row"><span className="fin-label">{l}</span><span className="fin-val negative">{v}</span></div>
                ))}
                <div className="fin-total">
                  <span className="fin-label" style={{fontWeight:600}}>TOTAAL OPSTARTKOSTEN</span>
                  <span className="fin-val negative" style={{fontWeight:700}}>~€8.200</span>
                </div>
                <div style={{fontSize: 12, color: palette.stone, marginTop: 12, padding: "12px", background: `${palette.sage}11`, borderRadius: 8}}>
                  ✅ Gedekt door EHMAC consultancy-omzet. Geen externe financiering nodig.
                </div>
              </div>

              <div className="fin-card">
                <h3>P&L Projectie</h3>
                {[
                  ["", "Jaar 1", "Jaar 2", "Jaar 3"],
                ].map(([l,...vs]) => (
                  <div key="h" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginBottom:8}}>
                    <div></div>{vs.map((v,i)=><div key={i} style={{fontSize:11,color:palette.gold,textAlign:"right",fontWeight:600}}>{v}</div>)}
                  </div>
                ))}
                {[
                  ["# Leningen", "12", "60", "200"],
                  ["Omzet", "€11.6K", "€82K", "€472K"],
                  ["Variabele kosten", "€9.6K", "€48K", "€160K"],
                  ["Vaste lasten", "€36K", "€48K", "€63K"],
                  ["WBSO-baat (tech)", "€8K", "€12K", "€18K"],
                  ["EBITDA", "-€26K", "-€2K", "+€267K"],
                ].map(([l,...vs],i) => (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,padding:"6px 0",borderBottom:`1px solid ${palette.goldLight}33`}}>
                    <div className="fin-label">{l}</div>
                    {vs.map((v,j) => <div key={j} className={`fin-val ${v.startsWith("+")?"positive":v.startsWith("-")?"negative":""}`} style={{textAlign:"right",fontSize:12}}>{v}</div>)}
                  </div>
                ))}
              </div>
            </div>

            <div className="section-label">Organische groeipaden</div>
            <div className="reg-stack" style={{marginBottom: 40}}>
              {[
                {fase: "Fase 0 — Nu → Q3 2026", title: "Bootstrap vanuit EHMAC", body: "Opstartkosten (~€8K) gedekt door EHMAC consultancy. Edwin brengt 20% tijd in als WBSO-uren. XRPL tech = intern gebouwd. Eerste 10 leningen = €6.250 fee-omzet. Nul externe funding nodig.", active: true},
                {fase: "Fase 1 — Q3 2026 → Q2 2027", title: "Zelf-financierend via fee-omzet", body: "Break-even bij ~35 leningen/jaar (~Q3 2027). Coöperatieve bijdragen van founding members: €99/jaar × 100 = €9.900. Geen dilution, geen investeerder, geen bank.", active: false},
                {fase: "Fase 2 — 2027 → 2028", title: "ANK Obligaties (Community Bond)", body: "ANK geeft coöperatieve obligaties uit aan leden: €1.000 – €10.000 per obligatie, 4% rente, looptijd 3 jaar. Bestemd voor uitbreiding leenfonds. Juridische basis: obligatie-uitgifte door coöperatie (geen EMI nodig). Doel: €1-2M extra fondsvermogen.", active: false},
                {fase: "Fase 3 — 2028+", title: "Venture / Impact Finance (optioneel)", body: "Als organische groei plateaut OF als schaal naar €10M+ portfolio het vraagt: impact investor (Triodos, ASN Impact Investors) of seed ronde via Euronext Access. Maar pas zodra €800K eigen kas bereikt is — zodat terms vanuit sterkte onderhandeld worden.", active: false},
              ].map((item, i) => (
                <div key={i} className={`reg-layer ${item.active ? "active" : ""}`}>
                  <div className="reg-icon">{["⚓","🌊","💰","🚀"][i]}</div>
                  <div>
                    <div style={{fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: item.active ? palette.gold : palette.stone, marginBottom: 2}}>{item.fase}</div>
                    <div className="reg-title" style={{color: item.active ? palette.gold : palette.ink}}>{item.title}</div>
                    <div className="reg-desc">{item.body}</div>
                  </div>
                  {item.active && <div className="reg-threshold"><div className="reg-threshold-val">NU</div><div className="reg-threshold-label">actief pad</div></div>}
                </div>
              ))}
            </div>

            <div className="section-label">Mijlpalen naar €800K kas</div>
            <div>
              {[
                {fase: "Q2 2026", title: "Launch: eerste 5 leningen live", body: "ANK B.V. + Coöperatie opgericht. Eerste 5 leningen genotarieerd. XRPL Escrow actief. Fee-omzet: ~€3.125. WBSO uren ingediend."},
                {fase: "Q4 2026", title: "35 leningen → Break-even bereikt", body: "Maandelijkse omzet overtreft vaste lasten. Eerste ANK Opvolging en Verbouw leningen live. 100 betalende belegger-leden. Community bond idee getest via member survey."},
                {fase: "Q2 2027", title: "100 leningen → €4.5M portfolio", body: "Notaris-partnership actief. PR in FD/RTL Z gerealiseerd. XRPL transparantie-rapport gepubliceerd. Eerste ANK Crypto lening gesloten. NMR + EHMAC consultancy financiert operationele overschrijding."},
                {fase: "Q4 2027", title: "€1M obligatie-emissie", body: "ANK Community Bond gelanceerd. €1M opgehaald van 100-200 leden à €5K gem. Fondsvermogen verdubbeld. Portfolio naar €9M (net onder Wtk €10M lichte toezichtsgrens)."},
                {fase: "Q4 2028", title: "€800K kas bereikt → DNB keuze", body: "Portfolio €15M+, jaarlijkse fee-omzet €800K+. Cas-positie >€800K. ANK kan nu op eigen kracht een PI/EMI-licentie aanvragen (€125K-€350K kapitaaleis is betaalbaar). Geen investor nodig tenzij strategisch gewenst."},
              ].map((m, i) => (
                <div key={i} className="milestone-line">
                  <div className="milestone-dot"></div>
                  <div className="milestone-phase">{m.fase}</div>
                  <div className="milestone-title">{m.title}</div>
                  <div className="milestone-body">{m.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGULATIE */}
        {active === "Regulatie" && (
          <div className="section">
            <div className="section-label">Regulatoire strategie</div>
            <div className="section-title">De <em>piratenstrategie</em><br />volledig uitgewerkt</div>

            <div className="reg-stack" style={{marginBottom: 48}}>
              <div style={{background: palette.ink, borderRadius: 12, padding: "20px 24px", color: palette.cream}}>
                <div style={{color: palette.gold, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8}}>Kernprincipe</div>
                <div style={{fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 8}}>
                  Wft Art. 3:5 is de muur. ANK staat er nooit aan.
                </div>
                <div style={{fontSize: 13, color: "#aaa", lineHeight: 1.7}}>
                  Een bankvergunning is alleen vereist als je <strong style={{color: palette.goldLight}}>opvorderbare gelden aantrekt van het publiek</strong> (spaargeld) <em>én</em> tegelijkertijd <strong style={{color: palette.goldLight}}>kredieten verstrekt voor eigen rekening</strong>. ANK doet dit niet: het fonds is eigendom van de coöperatie (leden), niet van ANK B.V. ANK bemiddelt en beheert. Het geld is van de leden.
                </div>
              </div>
            </div>

            <table style={{marginBottom: 40}}>
              <thead>
                <tr><th>Activiteit ANK</th><th>Regulatoire kwalificatie</th><th>Vereiste</th><th>Status</th></tr>
              </thead>
              <tbody>
                {[
                  ["Leden matchen als coöperatie", "Kredietunie (Wtk)", "Geen toezicht <€10M", <span className="badge badge-green">✓ Vrij</span>],
                  ["Overwaarde-zekerheid vestigen", "Notarieel recht van hypotheek", "BKR + notaris", <span className="badge badge-green">✓ Standaard</span>],
                  ["XRPL wallet + RLUSD beheer", "Crypto custody (MiCA Art. 3)", "CASP licentie (AFM)", <span className="badge badge-amber">⚠ Beperkt</span>],
                  ["IBAN-betaling verwerken", "Betaaldienst PSD2", "PI of EMI licentie", <span className="badge badge-amber">⚠ Via partner</span>],
                  ["Rente ontvangen en doorbetalen", "Bemiddeling in krediet (Wft)", "Geen bij coöperatief model", <span className="badge badge-green">✓ Vrij</span>],
                  ["Obligaties uitgeven aan leden", "Prospectusverordening", "Vrijstelling <€5M/jaar", <span className="badge badge-green">✓ Vrij tot €5M</span>],
                  ["Kredietadvies geven", "Advies in consumptief krediet (Wft)", "AFM-vergunning of onafhankelijk", <span className="badge badge-red">✗ Vermijden</span>],
                  ["Deposito's aantrekken van publiek", "Bankvergunning (Wft 3:5)", "DNB bankvergunning €5M+", <span className="badge badge-red">✗ Nimmer</span>],
                ].map((r,i) => (
                  <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
                ))}
              </tbody>
            </table>

            <div className="section-label">Gefaseerde vergunningsstrategie</div>
            <div className="reg-stack">
              {[
                {icon: "⚓", fase: "Fase 0 — Nu", active: true, vergunning: "Geen — Kredietunie Wtk", details: [
                  "ANK Coöperatief U.A. opgericht bij notaris",
                  "Kredietunie melding bij KVK (statutair doel: kredietverstrekking aan leden)",
                  "Geen DNB-registratie vereist onder €10M portfoliobalans",
                  "Wwft-verplichtingen: wel van toepassing — KYC/AML intern inrichten",
                  "XRPL custody: werken met non-custodial wallets (user beheert eigen keys) → geen CASP vereist",
                  "IBAN betalingen: via Modulr of Swan als white-label agent (EMI van partner)",
                ]},
                {icon: "🌊", fase: "Fase 1 — €10M portfolio", active: false, vergunning: "Wtk Licht Toezicht (DNB)", details: [
                  "Zodra portfoliobalans €10M overschrijdt: melding bij DNB vereist",
                  "Licht toezicht: jaarrapportage + prudentiële basisvereisten",
                  "Geen kapitaaleis, geen vergunningsaanvraag — enkel registratie",
                  "Kosten: ~€5K/jaar compliance (accountant + DNB-rapportage)",
                ]},
                {icon: "💰", fase: "Fase 2 — €800K kas", active: false, vergunning: "Optioneel: CASP (AFM) of PI (DNB)", details: [
                  "Bij eigen XRPL custody voor leden: CASP Class 1 (€50K kapitaal, 5-8 mnd aanvraag)",
                  "Bij eigen IBAN-issuance: PI licentie (€125K kapitaal, 12 mnd aanvraag)",
                  "Strategie: CASP first via AFM (nieuwe toezichthouder, soepelere cultuur dan DNB crypto)",
                  "InnovationHub sessie inplannen voor vroegtijdige afstemming",
                ]},
                {icon: "🏛️", fase: "Fase 3 — €100M+ portfolio", active: false, vergunning: "Volledige EMI (DNB)", details: [
                  "Bij schaal boven €100M en eigen e-money issuance",
                  "€350K kapitaal + 2% van uitstaand e-money",
                  "18-24 maanden aanvraagtraject",
                  "Op dit punt: ANK is bewezen business — funding voor kapitaaleis is geen obstakel",
                ]},
              ].map((item, i) => (
                <div key={i} style={{
                  background: item.active ? palette.ink : palette.white,
                  border: `1px solid ${item.active ? palette.gold : palette.goldLight}`,
                  borderRadius: 12, padding: "24px", marginBottom: 8
                }}>
                  <div style={{display: "flex", alignItems: "center", gap: 16, marginBottom: 16}}>
                    <span style={{fontSize: 28}}>{item.icon}</span>
                    <div>
                      <div style={{fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: palette.gold, marginBottom: 2}}>{item.fase}</div>
                      <div style={{fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: item.active ? palette.gold : palette.ink}}>{item.vergunning}</div>
                    </div>
                    {item.active && <span className="badge badge-green" style={{marginLeft: "auto"}}>ACTIEF</span>}
                  </div>
                  <ul style={{listStyle: "none"}}>
                    {item.details.map((d, j) => (
                      <li key={j} style={{fontSize: 12, color: item.active ? "#bbb" : palette.stone, padding: "3px 0 3px 16px", position: "relative", lineHeight: 1.6}}>
                        <span style={{position: "absolute", left: 0, color: palette.gold}}>→</span>{d}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div style={{background: palette.ink, color: "#666", textAlign: "center", padding: "32px", fontSize: 12, marginTop: 40}}>
        <span style={{color: palette.gold, fontFamily: "'Playfair Display', serif", fontSize: 18}}>ANK ⚓</span>
        <div style={{marginTop: 8}}>Jouw huis. Jouw anker. Voor elkaar.</div>
        <div style={{marginTop: 4}}>VirtualV Holding B.V. — EHMAC B.V. — ANK Coöperatief U.A. (op te richten)</div>
      </div>
    </div>
  );
}
