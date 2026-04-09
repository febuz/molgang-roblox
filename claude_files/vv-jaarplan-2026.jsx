import { useState } from "react";

const C = {
  bg: "#0f1117",
  panel: "#161b27",
  border: "#252d3d",
  ember: "#e8620a",
  gold: "#c8a84b",
  green: "#3a8a5a",
  blue: "#3a7abf",
  purple: "#7c5cbf",
  pink: "#bf5c8a",
  concrete: "#6b7280",
  muted: "#374151",
  cream: "#e8e4da",
  white: "#f5f4f0",
};

const VENTURES = {
  slag:    { label: "SmartSlag³",    color: C.ember,   icon: "⚗" },
  ank:     { label: "ANK",           color: C.gold,    icon: "⚓" },
  ehmac:   { label: "EHMAC",         color: C.green,   icon: "💼" },
  roblox:  { label: "Roblox",        color: C.blue,    icon: "🎮" },
  numerai: { label: "Numerai/Crypto",color: C.purple,  icon: "📈" },
  canton:  { label: "Cantonees",     color: C.pink,    icon: "🀄" },
};

const QUARTERS = [
  {
    label: "Q2 2026", sub: "April – Juni", num: "Q2",
    months: [
      {
        m: "April 2026", weeks: "Wk 14–17",
        items: {
          slag:    ["Zuiddijk 103 lease tekenen (counter €350/mnd)", "HGMS protocol v4.0 op BF slag testen", "Macherey-Nagel Cr(VI) kit besteld + eerste test", "XRF Skyray Explorer 9000 offerte aanvragen", "WBSO SO26017891 uurregistratie bijhouden (wekelijks)"],
          ank:     ["ANK Coöperatief U.A. oprichtingsafspraak notaris", "ANK B.V. KVK registratie", "Gnosis Safe wallet aanmaken (XRPL testnet)", "Eerste 5 prospect-leden benaderen (IJburg netwerk)"],
          ehmac:   ["APG/Aegon lopende deliverables", "WBSO uren Week 14–17 loggen", "Uniforce Stef antwoord afwachten (gebruikelijk loon)"],
          roblox:  ["Mahjong ELO ranking systeem in DataStore bouwen", "SmartSlag factory simulation: IJmuiden terrain basis"],
          numerai: ["Bestaande model Sharpe audit per sector", "SEDAR+ scraper CA mining filings bouwen", "Gnosis Safe voor USDC yield (Aave v3 Arbitrum)"],
          canton:  ["Dagelijks 20 min jyutping: baby-routine vocabulary", "Wekelijks 1 anekdote vertalen naar Cantonees"],
        }
      },
      {
        m: "Mei 2026", weeks: "Wk 18–22",
        items: {
          slag:    ["BCR extractie volledig gevalideerd op BOF + BF slag", "Eerste V₂O₅ monster: target 98%+ purity", "Eurofins Agro monster insturen (mineraal residu BOF)", "Tata Steel sustainability afdeling contacteren (MOU voorbereiding)"],
          ank:     ["XRPL Escrow demo (testnet): eerste leenlening gesimuleerd", "Notaris hypotheekakte model gereed", "ANK app MVP (React PWA): wallet + dashboard v0.1", "Farcaster account live + eerste post"],
          ehmac:   ["Q2 facturen APG/Nike versturen", "EHMAC website update met Web3 data services"],
          roblox:  ["Mahjong ranked matchmaking live op Roblox", "Market Exchange: Mahjong salon + bubble tea bar scenery"],
          numerai: ["Materials/Mining LightGBM model live op Numerai (1-5 NMR stake)", "Crypto-adjacent equities model (COIN/MSTR/RIOT) live", "Farcaster: eerste Web3 data consultant post"],
          canton:  ["Vocabulaire: geld, lenen, rente in Cantonees", "Zinnen: 我哋公司係乜嘢？ (wat doet ons bedrijf?)"],
        }
      },
      {
        m: "Juni 2026", weeks: "Wk 23–26",
        items: {
          slag:    ["Eurofins rapport ontvangen → aanpassing procesroute", "Tata Steel MOU concept (Edwin pitch via KIVI netwerk)", "ICP-MS Thermo X Series II recovery: Thermo Unity Lab contact", "V₂O₅ eerste externe afname gesprekken (VITO/battery startup)"],
          ank:     ["Eerste 3 ANK leningen genotarieerd (Opvolging niche)", "XRPL Escrow mainnet: eerste echte terugbetaling automatisch", "ANK community: 25 betalende leden (€99/jaar)", "Substack 'De Ankier' eerste editie: case study"],
          ehmac:   ["H1 financieel overzicht + WBSO declaratie Q1/Q2", "Mogelijke nieuwe client Web3 analytics (Questbook/Gitcoin scan)"],
          roblox:  ["SmartSlag Roblox sim: slag processing mini-game mechanics", "Mahjong toernooi systeem: weekelijkse rankings"],
          numerai: ["Numerai rolling Sharpe check: stake ophogen als >0.5", "NMR staking: target 50-100 NMR per goed presterend model", "Eerste USDC yield-positie actief (Aave + Pendle)"],
          canton:  ["FA YIN herhaling + exam stof doornemen", "Thema: woning kopen/overwaarde in Cantonees"],
        }
      },
    ]
  },
  {
    label: "Q3 2026", sub: "Juli – September", num: "Q3",
    months: [
      {
        m: "Juli 2026", weeks: "Wk 27–30",
        items: {
          slag:    ["Tata Steel MOU ondertekend (target)", "Zuiddijk 103: NEN 1010 elektrische installatie gereed", "pH-ladder cascade: continue 72u run eerste keer", "Cr(VI) <0.01 mg/L in afvalwater bevestigd"],
          ank:     ["ANK: 50 leden bereikt", "ANK ZZP module v1: factuur in RLUSD + BTW export", "Eerste ANK Verbouw lening (€25K) afgesloten", "Notaris-partnership Amsterdam: 1 kantoor gecontracteerd"],
          ehmac:   ["Zomerpauze voor cliënten opvangen", "WBSO H1 2026 voortgangsrapportage indienen bij RVO"],
          roblox:  ["Market Exchange complex: pool tables + K-pop stage", "Roblox monetisatie: eerste Robux via premium gamepass"],
          numerai: ["Numerai: 4-5 actieve modellen live", "Crypto trading: XRP positie opgebouwd (ANK treasury seed)", "Structuur: VirtualV Holding B.V. USDC wallet (Gnosis Safe)"],
          canton:  ["Thema: baby/ouderschap in Cantonees", "新生兒 (san1 saang1 ji4) = pasgeboren baby"],
        }
      },
      {
        m: "Augustus 2026", weeks: "Wk 31–35",
        items: {
          slag:    ["Si-K biostimulant: 3 positieve bodemanalyses Wognum pioenen", "CE-markering Si-K: Notified Body aanvraag ingediend", "Eerste productverkoop Si-K: €8/L × pilot batch 500L = €4K", "CAPEX planning Fase 2 (RVO Innovatiekrediet voorbereiding)"],
          ank:     ["ANK: break-even analyse Q3 (target 35 leningen totaal)", "ANK Crypto niche: eerste XRP/overwaarde lening gesloten", "Privacy architectuur: Privado ID ZK-KYC prototype"],
          ehmac:   ["Nike/Aegon Q3 deliverables", "Web3 data consultancy: eerste USDC-betaald project (target)"],
          roblox:  ["SmartSlag sim: vanadium extraction mini-game live", "Roblox Mahjong: AI opponent (basic)", "IP strategie: EHMAC B.V. als IP-houder van Roblox games"],
          numerai: ["Numerai: NMR stake ophogen naar 100-200 NMR totaal", "LightGBM Materials sector: Sharpe target >0.8", "Crypto: DeFi yield strategie uitbreiden (Eigenlayer restaking)"],
          canton:  ["Thema: lab en scheikunde in Cantonees", "鐵礦渣 (tit3 kwong3 zaa3) = ijzerslak"],
        }
      },
      {
        m: "September 2026", weeks: "Wk 36–39",
        items: {
          slag:    ["RVO Innovatiekrediet aanvraag concept gereed", "Pilot plant design Fase 2 (500-1000m²) locatiescout", "V₂O₅ monster: externe validatie lab (VITO of TNO offerte)", "Patent aanvraag voorbereiden: pH-ladder V-extractie sequentie"],
          ank:     ["ANK: 100 leden (beleggers + leners)", "ANK Community Bond concept: pitch aan bestaande leden", "Substack: case study ANK Opvolging (kind koopt woning)", "PR pitch: FD/RTL Z 'Amsterdammers zijn elkaars bank'"],
          ehmac:   ["Q3 omzet review + DGA salary check", "WBSO Q3 uren afsluiten"],
          roblox:  ["Mahjong: regionale varianten (Kantonees, Hong Kong)", "Market Exchange: werkend in-game economy systeem"],
          numerai: ["Numerai tournament: top 25% target voor stake growth", "Crypto news feature pipeline: 5K+ features actief", "TFT ensemble voor crypto price prediction"],
          canton:  ["Thema: financiën en investeren", "高息債券 (gou1 sik1 zaai3 hyun3) = high yield bond"],
        }
      },
    ]
  },
  {
    label: "Q4 2026", sub: "Oktober – December", num: "Q4",
    months: [
      {
        m: "Oktober 2026", weeks: "Wk 40–44",
        items: {
          slag:    ["RVO Innovatiekrediet aanvraag ingediend (€2.5M)", "Pilot plant locatie gekozen en gehuurd", "Continue processlijnen: 10T/week feed capaciteit"],
          ank:     ["ANK: break-even bereikt (35 leningen cumulatief)", "ANK Bond I: €500K obligatie-emissie aan leden gelanceerd", "Notaris-referral: eerste €150 commissies ontvangen"],
          ehmac:   ["Q4 EHMAC consultancy pipeline review", "Nieuw Web3 client onboarden (target €5K/maand USDC)"],
          roblox:  ["Mahjong: 1.000 actieve gebruikers target", "SmartSlag sim: publieke beta launch", "Eerste Robux uitbetaling (DevEx)"],
          numerai: ["NMR rendement Q4 check: target 30%+ op gestaked bedrag", "Crypto yield: 5-8% APY op USDC portfolio", "Nieuwe Numerai Signals feature: earnings surprise NL aandelen"],
          canton:  ["Midterm review: 200+ woorden actief", "Conversatie oefening via HelloTalk app"],
        }
      },
      {
        m: "November 2026", weeks: "Wk 45–48",
        items: {
          slag:    ["Pilot plant fase 2: HGMS semi-industrieel geïnstalleerd", "V₂O₅ productie: 500g/week continue run", "Si-K biostimulant: 2.500L batch, eerste externe klant (tuinbouw)"],
          ank:     ["ANK Bond I: eerste €200K geplaatst bij leden", "ANK ZZP: 50 actieve ZZP gebruikers", "Persbericht concept: 'De nieuwe volksbank op de blockchain'"],
          ehmac:   ["Jaarplanning 2027 EHMAC", "WBSO 2027 aanvraag indienen (deadline december)"],
          roblox:  ["Market Exchange: VIP room + exclusive gamepass", "Mahjong WK toernooi event in-game"],
          numerai: ["Numerai: €2K-5K maandelijkse NMR inkomsten target", "ANK crypto lening aanbod: eerste lid gebruikt XRP collateral"],
          canton:  ["Thema: zakelijk schrijven in Cantonees", "Eerste volledige business email in Cantonees (met hulp)"],
        }
      },
      {
        m: "December 2026", weeks: "Wk 49–52",
        items: {
          slag:    ["Jaarafsluiting SmartSlag³: TRL5 officieel bereikt", "Eurofins rapport definitief: meststoffenwet compliance confirmed", "2027 roadmap: RVO beslissing verwacht Q1 2027"],
          ank:     ["ANK jaarrapport 2026: transparant, on-chain", "100 leden gevierd: eerste Ankiers-borrel", "ANK Bond I: €500K volledig geplaatst (target)"],
          ehmac:   ["Kerstvakantie: 2 weken rust met gezin", "Jaar 1 omzet review: EHMAC + Slag + ANK gecombineerd"],
          roblox:  ["Roblox jaar 1 review: MAU, revenue, IP assets", "Strategie 2027: Unity export + multi-platform"],
          numerai: ["Numerai jaar 1 review: modellen, stake, rendement", "Crypto portfolio Q4 check: XRP + USDC yield", "2027 crypto strategie: ANK Industrial Bond in crypto?"],
          canton:  ["Jaar 1 Cantonees: 500+ woorden, dagelijkse routine", "Nieuwjaar groet in Cantonees: 新年快樂 (san1 nin4 faai3 lok6)"],
        }
      },
    ]
  },
  {
    label: "Q1 2027", sub: "Januari – Maart", num: "Q1",
    months: [
      {
        m: "Januari 2027", weeks: "Wk 1–4",
        items: {
          slag:    ["RVO Innovatiekrediet: beslissing verwacht (aanvraag sept '26)", "Pilot plant: 10T/week continue run starten", "V₂O₅ eerste echte verkoop (battery startup)"],
          ank:     ["ANK: 200 leden target", "ANK app v2.0: privacy dashboard + on-chain transparantie", "Seed investor gesprekken (optioneel, vanuit kracht)"],
          ehmac:   ["2027 WBSO aanvraag actief", "Web3 consultancy: 2 vaste crypto clients"],
          roblox:  ["Mahjong: Unity export prototype", "SmartSlag sim: officiële launch event"],
          numerai: ["Numerai: 5+ modellen, 300+ NMR gestaked", "Crypto: XRP ANK treasury seed actief"],
          canton:  ["Gevorderd niveau: zakelijke Cantonese gesprekken", "Hong Kong markt voor Si-K biostimulant: Cantonese pitch"],
        }
      },
      {
        m: "Februari 2027", weeks: "Wk 5–9",
        items: {
          slag:    ["VITO/TNO validatierapport besteld (TRL6 bewijs)", "EU CRMA Strategic Project aanvraag voorbereiden", "Patent aanvraag ingediend"],
          ank:     ["ANK Bond II: €1M emissie planning", "ANK × Slag synergy: eerste industrial bond leden informeren", "Break-even bevestigd (jaarlijkse omzet > kosten)"],
          ehmac:   ["APG Q1 2027 deliverables", "EHMAC IP strategie: Roblox games onder EHMAC B.V."],
          roblox:  ["Mahjong: 5.000 MAU target", "Market Exchange monetisatie optimalisatie"],
          numerai: ["Numerai: target €2K-5K/maand consistent", "Crypto yield: €500/maand passief target bereikt"],
          canton:  ["Si-K Cantonese markt pitch deck gereed", "香港農業市場 (heung1 gong2 lung4 jip6 si5 coeng4)"],
        }
      },
      {
        m: "Maart 2027", weeks: "Wk 10–13",
        items: {
          slag:    ["TRL6 demo: continue processlijnen 10T/dag", "Tata Steel: feedstock deal uitbreiding naar 2.000T/jaar", "EIC Accelerator shortlist voorbereiding (aanvraag Q4 2027)"],
          ank:     ["ANK: 500 leden. 100 leningen cumulatief", "ANK jaarrapport 2026 gepubliceerd (on-chain transparant)", "PR succes: nationale media aandacht"],
          ehmac:   ["Q1 2027 omzet review", "WBSO 2027 Q1 uren declaratie"],
          roblox:  ["Mahjong + SmartSlag sim: IP waarde assessment", "Unity/Unreal export: eerste externe pitch"],
          numerai: ["Numerai jaar 1.5: volledige ensemble live", "Crypto news pipeline: live trading signal", "VirtualV kas: target €100K+ gecombineerd"],
          canton:  ["Jaar 1 afsluiting: volledig zakelijk Cantonees"],
        }
      },
    ]
  },
];

const WEEKPLAN = [
  { day: "Maandag",    blocks: [
    { time: "09-17", v: "ehmac",   task: "EHMAC consultancy (APG/Nike/Aegon)" },
    { time: "20-21", v: "canton",  task: "Cantonees 20 min + anekdote vertalen" },
  ]},
  { day: "Dinsdag",   blocks: [
    { time: "09-17", v: "ehmac",   task: "EHMAC consultancy" },
    { time: "19-20", v: "numerai", task: "Numerai model review (wekelijks 1u)" },
    { time: "20-21", v: "canton",  task: "Cantonees herhaling" },
  ]},
  { day: "Woensdag",  blocks: [
    { time: "09-13", v: "ehmac",   task: "EHMAC consultancy" },
    { time: "13-17", v: "slag",    task: "SmartSlag³ lab (Zuiddijk)" },
    { time: "19-21", v: "ank",     task: "ANK: development / leden / XRPL" },
  ]},
  { day: "Donderdag", blocks: [
    { time: "09-17", v: "ehmac",   task: "EHMAC consultancy" },
    { time: "20-21", v: "roblox",  task: "Roblox: code sessie 1u" },
    { time: "20-21", v: "canton",  task: "Cantonees nieuw thema" },
  ]},
  { day: "Vrijdag",   blocks: [
    { time: "09-12", v: "slag",    task: "SmartSlag³: protocol + data analyse" },
    { time: "12-13", v: "ank",     task: "ANK: admin + leden contact" },
    { time: "13-17", v: "numerai", task: "Crypto/Numerai: feature engineering" },
  ]},
  { day: "Zaterdag",  blocks: [
    { time: "09-13", v: "slag",    task: "Lab sessie: continue runs, metingen" },
    { time: "14-17", v: "roblox",  task: "Roblox: design + scripting 3u" },
    { time: "20-21", v: "canton",  task: "Cantonees: week review + nieuw vocab" },
  ]},
  { day: "Zondag",    blocks: [
    { time: "Vrij",  v: "ehmac",   task: "Familie + baby — geen werk" },
    { time: "20-21", v: "numerai", task: "Crypto: portfolio check 30 min" },
  ]},
];

const KPIS = [
  { venture: "slag",    label: "V₂O₅ purity eerste monster", target: "≥98%", deadline: "Jun '26" },
  { venture: "slag",    label: "Tata MOU ondertekend", target: "500T/jaar", deadline: "Jul '26" },
  { venture: "slag",    label: "TRL5 bereikt", target: "Continue run 72u", deadline: "Dec '26" },
  { venture: "slag",    label: "RVO Innovatiekrediet", target: "€2.5M beslissing", deadline: "Q1 '27" },
  { venture: "ank",     label: "Eerste 5 leningen genotarieerd", target: "€225K portfolio", deadline: "Jun '26" },
  { venture: "ank",     label: "ANK Break-even", target: "35 leningen totaal", deadline: "Q3 '26" },
  { venture: "ank",     label: "ANK Bond I geplaatst", target: "€500K bij leden", deadline: "Dec '26" },
  { venture: "ank",     label: "ANK leden", target: "200 betalend", deadline: "Jan '27" },
  { venture: "ehmac",   label: "WBSO uren gelogd", target: "1.400u/jaar", deadline: "Dec '26" },
  { venture: "ehmac",   label: "Eerste USDC-betaald project", target: "€5K/mnd", deadline: "Q3 '26" },
  { venture: "roblox",  label: "Mahjong ranked MAU", target: "1.000 gebruikers", deadline: "Okt '26" },
  { venture: "roblox",  label: "SmartSlag sim public beta", target: "Live op Roblox", deadline: "Okt '26" },
  { venture: "roblox",  label: "Robux DevEx uitbetaling", target: "Eerste betaling", deadline: "Q4 '26" },
  { venture: "numerai", label: "Actieve modellen Numerai", target: "4-5 modellen", deadline: "Jun '26" },
  { venture: "numerai", label: "NMR gestaked totaal", target: "150-300 NMR", deadline: "Sep '26" },
  { venture: "numerai", label: "Passief crypto yield", target: "€500/mnd", deadline: "Feb '27" },
  { venture: "canton",  label: "Actieve woordenschat", target: "500+ woorden", deadline: "Dec '26" },
  { venture: "canton",  label: "Zakelijk Cantonees", target: "Si-K HK pitch", deadline: "Feb '27" },
];

const THISWEEK = [
  { v: "slag",    urgent: true,  task: "Macherey-Nagel Cr(VI) kit bestellen (Fisher Scientific NL)" },
  { v: "slag",    urgent: true,  task: "Zuiddijk 103 huurcontract: counter €350/mnd versturen" },
  { v: "ank",     urgent: true,  task: "Notarisafspraak plannen voor ANK Coöperatief U.A." },
  { v: "ank",     urgent: false, task: "Gnosis Safe aanmaken op XRPL testnet" },
  { v: "ehmac",   urgent: false, task: "WBSO uren week 14 invullen" },
  { v: "numerai", urgent: true,  task: "Bestaand Numerai model: Sharpe breakdown audit" },
  { v: "numerai", urgent: false, task: "SEDAR+ scraper bouwen voor CA mining filings" },
  { v: "roblox",  urgent: false, task: "Mahjong ELO DataStore: code session 1u vr/za" },
  { v: "canton",  urgent: false, task: "Dag 1: baby-routine vocab (slapen, eten, huilen)" },
  { v: "ank",     urgent: false, task: "Farcaster account registreren + eerste post draft" },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:${C.bg};color:${C.cream};font-family:'Space Grotesk',sans-serif;font-size:14px;}
.mono{font-family:'Space Mono',monospace;}

.topbar{
  background:${C.panel};
  border-bottom:1px solid ${C.border};
  padding:20px 24px;
  display:flex;align-items:center;gap:16px;
  position:sticky;top:0;z-index:100;
}
.logo{font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:${C.cream};}
.logo span{color:${C.ember};}
.tabs{display:flex;gap:4px;flex-wrap:wrap;}
.tab{
  padding:8px 14px;border-radius:6px;
  background:transparent;border:1px solid ${C.border};
  color:${C.concrete};font-family:'Space Grotesk',sans-serif;
  font-size:12px;font-weight:500;cursor:pointer;
  transition:all .15s;white-space:nowrap;
}
.tab.active{background:${C.ember};color:#fff;border-color:${C.ember};}
.tab:hover:not(.active){background:${C.border};color:${C.cream};}

.wrap{max-width:1280px;margin:0 auto;padding:24px;}

.legend{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;}
.leg{display:flex;align-items:center;gap:6px;font-size:12px;color:${C.concrete};}
.leg-dot{width:10px;height:10px;border-radius:50%;}

/* WEEK GRID */
.week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;}
.day-col{background:${C.panel};border:1px solid ${C.border};border-radius:8px;overflow:hidden;}
.day-header{
  padding:10px 12px;
  background:${C.border};
  font-size:11px;font-weight:600;
  letter-spacing:1px;text-transform:uppercase;
  color:${C.concrete};
}
.day-blocks{padding:8px;display:flex;flex-direction:column;gap:6px;}
.block{
  padding:8px 10px;border-radius:4px;
  border-left:3px solid transparent;
  font-size:11px;line-height:1.4;
}
.block-time{font-family:'Space Mono',monospace;font-size:10px;margin-bottom:2px;opacity:.7;}

/* QUARTER PLAN */
.q-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.month-card{background:${C.panel};border:1px solid ${C.border};border-radius:8px;overflow:hidden;}
.month-header{
  padding:12px 16px;background:${C.border};
  display:flex;justify-content:space-between;align-items:center;
}
.month-name{font-weight:600;font-size:14px;}
.month-weeks{font-size:11px;color:${C.concrete};font-family:'Space Mono',monospace;}
.venture-section{padding:12px 16px;border-bottom:1px solid ${C.border};}
.venture-section:last-child{border-bottom:none;}
.v-label{
  display:flex;align-items:center;gap:6px;
  font-size:11px;font-weight:600;
  text-transform:uppercase;letter-spacing:1px;
  margin-bottom:6px;
}
.v-items{list-style:none;}
.v-items li{
  font-size:11px;color:${C.concrete};
  padding:2px 0 2px 10px;position:relative;line-height:1.5;
}
.v-items li::before{content:'›';position:absolute;left:0;}

/* KPI TABLE */
.kpi-table{width:100%;border-collapse:collapse;}
.kpi-table th{
  background:${C.border};
  padding:10px 14px;text-align:left;
  font-size:10px;letter-spacing:2px;text-transform:uppercase;
  color:${C.concrete};font-family:'Space Mono',monospace;
}
.kpi-table td{
  padding:10px 14px;
  border-bottom:1px solid ${C.border};
  font-size:12px;color:${C.concrete};
}
.kpi-table tr:hover td{background:${C.border}44;}
.kpi-table td:first-child{width:20px;}
.kpi-table td:nth-child(2){color:${C.cream};font-weight:500;}

/* THIS WEEK */
.tw-list{display:flex;flex-direction:column;gap:8px;}
.tw-item{
  display:flex;align-items:center;gap:12px;
  background:${C.panel};border:1px solid ${C.border};
  border-radius:6px;padding:12px 16px;
}
.tw-badge{
  width:8px;height:8px;border-radius:50%;flex-shrink:0;
}
.tw-urgent{box-shadow:0 0 6px currentColor;}
.tw-v{font-size:11px;font-family:'Space Mono',monospace;flex-shrink:0;width:110px;}
.tw-task{font-size:13px;flex:1;}
.tw-flag{
  font-size:10px;padding:2px 8px;border-radius:10px;
  background:${C.ember}22;color:${C.ember};flex-shrink:0;
  font-family:'Space Mono',monospace;
}

/* GANTT */
.gantt{overflow-x:auto;}
.gantt-row{display:flex;align-items:center;gap:0;margin-bottom:2px;}
.gantt-label{width:160px;flex-shrink:0;font-size:12px;color:${C.concrete};padding:6px 8px;}
.gantt-track{flex:1;height:28px;background:${C.border};position:relative;border-radius:2px;overflow:hidden;}
.gantt-months{display:flex;}
.gantt-month-label{flex:1;font-size:10px;color:${C.muted};font-family:'Space Mono',monospace;padding:2px 4px;border-right:1px solid ${C.border}44;}
.gantt-bar{
  position:absolute;height:100%;
  border-radius:2px;display:flex;align-items:center;padding:0 8px;
  font-size:10px;color:#fff;font-family:'Space Mono',monospace;
  white-space:nowrap;overflow:hidden;
}

@media(max-width:900px){
  .week-grid{grid-template-columns:1fr 1fr;}
  .q-grid{grid-template-columns:1fr;}
}
`;

const VENTUREFILTERS = ["alle", ...Object.keys(VENTURES)];

export default function App() {
  const [tab, setTab] = useState("Deze Week");
  const [qTab, setQTab] = useState("Q2 2026");
  const [vFilter, setVFilter] = useState("alle");

  const tabs = ["Deze Week", "Week Rooster", "Kwartaalplan", "KPI Dashboard", "Gantt"];

  const filteredKPIs = vFilter === "alle" ? KPIS : KPIS.filter(k => k.venture === vFilter);
  const filteredTW = vFilter === "alle" ? THISWEEK : THISWEEK.filter(t => t.venture === vFilter);

  return (
    <div>
      <style>{css}</style>

      <div className="topbar">
        <div className="logo">VV<span>×</span>2026</div>
        <div className="tabs">
          {tabs.map(t => (
            <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="wrap">

        {/* LEGEND */}
        <div className="legend">
          {VENTUREFILTERS.map(v => (
            <div key={v} className="leg" style={{cursor:"pointer",opacity:vFilter===v?1:.6}}
              onClick={()=>setVFilter(v)}>
              {v==="alle"
                ? <><div className="leg-dot" style={{background:C.concrete}}></div><span>Alle</span></>
                : <><div className="leg-dot" style={{background:VENTURES[v].color}}></div>
                   <span>{VENTURES[v].icon} {VENTURES[v].label}</span></>
              }
            </div>
          ))}
        </div>

        {/* DEZE WEEK */}
        {tab==="Deze Week" && (
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:20}}>
              <div style={{fontFamily:"'Space Mono'",fontSize:22,fontWeight:700}}>Week 14 <span style={{color:C.ember}}>— April 2026</span></div>
              <div style={{fontSize:12,color:C.concrete}}>Nu starten. Geen wachten.</div>
            </div>
            <div className="tw-list">
              {filteredTW.map((t,i) => {
                const v = VENTURES[t.v];
                return (
                  <div key={i} className="tw-item" style={{borderLeftColor:v.color,borderLeftWidth:3}}>
                    <div className="tw-badge tw-urgent" style={{background:v.color,color:v.color}}></div>
                    <div className="tw-v mono" style={{color:v.color}}>{v.icon} {v.label}</div>
                    <div className="tw-task">{t.task}</div>
                    {t.urgent && <div className="tw-flag">URGENT</div>}
                  </div>
                );
              })}
            </div>

            <div style={{marginTop:32,background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:20}}>
              <div style={{fontFamily:"'Space Mono'",fontSize:13,color:C.ember,marginBottom:12}}>// TIJDSVERDELING APRIL (uren/week)</div>
              {[
                {v:"ehmac",   uren:32, label:"EHMAC consultancy (4 dagen)"},
                {v:"slag",    uren:8,  label:"SmartSlag³ lab + protocol"},
                {v:"ank",     uren:3,  label:"ANK opzet + leden"},
                {v:"numerai", uren:3,  label:"Numerai + crypto"},
                {v:"roblox",  uren:4,  label:"Roblox development"},
                {v:"canton",  uren:2,  label:"Cantonees dagelijks"},
              ].map((r,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                  <div style={{width:140,fontSize:11,color:C.concrete}}>{VENTURES[r.v].icon} {r.label}</div>
                  <div style={{flex:1,height:20,background:C.border,borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${(r.uren/52)*100}%`,height:"100%",background:VENTURES[r.v].color,
                      display:"flex",alignItems:"center",paddingLeft:6}}>
                      <span style={{fontSize:10,color:"#fff",fontFamily:"'Space Mono'"}}>{r.uren}u</span>
                    </div>
                  </div>
                  <div style={{width:30,fontSize:11,fontFamily:"'Space Mono'",color:VENTURES[r.v].color}}>{r.uren}u</div>
                </div>
              ))}
              <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`,
                fontFamily:"'Space Mono'",fontSize:11,color:C.concrete}}>
                Totaal: 52u/week — inclusief 6u buffer voor baby/gezin. Donderdag avond + zondag = VRIJ.
              </div>
            </div>
          </div>
        )}

        {/* WEEK ROOSTER */}
        {tab==="Week Rooster" && (
          <div>
            <div style={{fontFamily:"'Space Mono'",fontSize:18,marginBottom:20}}>
              Standaard <span style={{color:C.ember}}>Weekrooster</span>
            </div>
            <div className="week-grid">
              {WEEKPLAN.map((day,i) => (
                <div key={i} className="day-col">
                  <div className="day-header">{day.day}</div>
                  <div className="day-blocks">
                    {day.blocks.map((b,j) => {
                      const v = VENTURES[b.v];
                      return (
                        <div key={j} className="block"
                          style={{background:`${v.color}18`,borderLeftColor:v.color}}>
                          <div className="block-time">{b.time}</div>
                          <div style={{fontSize:11,color:C.cream}}>{v.icon} {b.task}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:16,background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,fontSize:12,color:C.concrete}}>
              <strong style={{color:C.cream}}>Principe:</strong> EHMAC is de motor (cashflow). SmartSlag is het kernproject (waarde). ANK + Numerai zijn de groeiende passieve inkomsten. Roblox + Cantonees zijn de creatieve/strategische investering. Baby + partner = heilig op zondag.
            </div>
          </div>
        )}

        {/* KWARTAALPLAN */}
        {tab==="Kwartaalplan" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
              {QUARTERS.map(q => (
                <button key={q.label} className={`tab ${qTab===q.label?"active":""}`}
                  onClick={()=>setQTab(q.label)}>
                  {q.label} <span style={{opacity:.7,fontSize:10}}>({q.sub})</span>
                </button>
              ))}
            </div>
            {QUARTERS.filter(q=>q.label===qTab).map(q => (
              <div key={q.label} className="q-grid">
                {q.months.map((month,mi) => (
                  <div key={mi} className="month-card">
                    <div className="month-header">
                      <span className="month-name">{month.m}</span>
                      <span className="month-weeks">{month.weeks}</span>
                    </div>
                    {Object.entries(month.items)
                      .filter(([k]) => vFilter==="alle" || k===vFilter)
                      .map(([k, items]) => {
                        const v = VENTURES[k];
                        return (
                          <div key={k} className="venture-section">
                            <div className="v-label" style={{color:v.color}}>{v.icon} {v.label}</div>
                            <ul className="v-items">
                              {items.map((item,ii) => (
                                <li key={ii} style={{"--c":v.color}}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* KPI DASHBOARD */}
        {tab==="KPI Dashboard" && (
          <div>
            <div style={{fontFamily:"'Space Mono'",fontSize:18,marginBottom:20}}>
              KPI <span style={{color:C.ember}}>Dashboard</span> 2026–2027
            </div>
            <table className="kpi-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Venture</th>
                  <th>KPI</th>
                  <th>Target</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {filteredKPIs.map((k,i) => {
                  const v = VENTURES[k.venture];
                  return (
                    <tr key={i}>
                      <td><div style={{width:8,height:8,borderRadius:"50%",background:v.color}}></div></td>
                      <td style={{color:v.color,fontFamily:"'Space Mono'",fontSize:11}}>{v.icon} {v.label}</td>
                      <td style={{color:C.cream}}>{k.label}</td>
                      <td style={{fontFamily:"'Space Mono'",fontSize:11,color:C.cream}}>{k.target}</td>
                      <td style={{fontFamily:"'Space Mono'",fontSize:11,color:C.gold}}>{k.deadline}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* GANTT */}
        {tab==="Gantt" && (
          <div>
            <div style={{fontFamily:"'Space Mono'",fontSize:18,marginBottom:16}}>
              Gantt <span style={{color:C.ember}}>— Apr '26 → Mrt '27</span>
            </div>
            <div className="gantt">
              {/* Month labels */}
              <div className="gantt-row">
                <div style={{width:160,flexShrink:0}}></div>
                <div className="gantt-track" style={{background:"transparent",display:"flex"}}>
                  {["Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec","Jan","Feb","Mrt"].map(m=>(
                    <div key={m} className="gantt-month-label">{m}</div>
                  ))}
                </div>
              </div>
              {[
                // venture, label, startMonth(0-11), spanMonths, note
                {v:"ehmac",   label:"EHMAC Consultancy",       s:0, span:12, note:"Doorlopend"},
                {v:"slag",    label:"Zuiddijk 103 Lab",         s:0, span:5,  note:"Apr-Aug"},
                {v:"slag",    label:"TRL4→5 validatie",         s:0, span:8,  note:"Apr-Nov"},
                {v:"slag",    label:"Tata MOU",                 s:1, span:3,  note:"Mei-Jul"},
                {v:"slag",    label:"RVO aanvraag",             s:5, span:4,  note:"Sep-Dec"},
                {v:"slag",    label:"CE-markering Si-K",        s:4, span:8,  note:"Aug '26-Mrt '27"},
                {v:"ank",     label:"ANK oprichting",           s:0, span:2,  note:"Apr-Mei"},
                {v:"ank",     label:"Eerste 35 leningen",       s:1, span:5,  note:"Mei-Sep"},
                {v:"ank",     label:"ANK Bond I €500K",         s:6, span:3,  note:"Okt-Dec"},
                {v:"ank",     label:"200 leden",                s:8, span:4,  note:"Dec-Mrt"},
                {v:"numerai", label:"Models live (4-5)",        s:0, span:3,  note:"Apr-Jun"},
                {v:"numerai", label:"NMR stake opbouw",         s:2, span:7,  note:"Jun-Dec"},
                {v:"numerai", label:"€500/mnd passief",         s:9, span:3,  note:"Jan-Mrt"},
                {v:"roblox",  label:"Mahjong ELO + ranked",     s:0, span:4,  note:"Apr-Jul"},
                {v:"roblox",  label:"SmartSlag sim beta",       s:3, span:4,  note:"Jul-Okt"},
                {v:"roblox",  label:"5K MAU target",            s:9, span:3,  note:"Jan-Mrt"},
                {v:"canton",  label:"Dagelijks 20 min",         s:0, span:12, note:"Heel jaar"},
                {v:"canton",  label:"500 woorden",              s:7, span:2,  note:"Nov-Dec"},
              ].filter(r => vFilter==="alle" || r.v===vFilter).map((r,i) => {
                const v = VENTURES[r.v];
                const leftPct = (r.s/12)*100;
                const widthPct = (r.span/12)*100;
                return (
                  <div key={i} className="gantt-row">
                    <div className="gantt-label">{v.icon} {r.label}</div>
                    <div className="gantt-track">
                      <div className="gantt-bar" style={{
                        left:`${leftPct}%`,width:`${widthPct}%`,
                        background:v.color,opacity:.85
                      }}>{r.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
