import { useState, useEffect, useRef } from "react";

const C = {
  steel: "#0e1117",
  steelMid: "#1a2030",
  steelLight: "#2a3348",
  ember: "#e8620a",
  emberDim: "#a34508",
  gold: "#c8a84b",
  goldDim: "#7a6530",
  rust: "#8b2e0e",
  slag: "#4a5568",
  concrete: "#6b7280",
  smoke: "#374151",
  cream: "#f0ebe0",
  white: "#fafaf8",
  green: "#2d6a4f",
  greenLight: "#40916c",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:${C.steel};color:${C.cream};font-family:'Crimson Pro',serif;}

/* HERO */
.hero{
  min-height:100vh;
  background:${C.steel};
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;
  position:relative;overflow:hidden;
  padding:60px 24px;
}
.hero-grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(${C.steelLight}40 1px,transparent 1px),
    linear-gradient(90deg,${C.steelLight}40 1px,transparent 1px);
  background-size:60px 60px;
}
.hero-glow{
  position:absolute;
  width:600px;height:600px;
  background:radial-gradient(circle,${C.ember}15 0%,transparent 70%);
  top:50%;left:50%;transform:translate(-50%,-50%);
  pointer-events:none;
}
.hero-eyebrow{
  font-family:'JetBrains Mono',monospace;
  font-size:11px;letter-spacing:4px;text-transform:uppercase;
  color:${C.ember};margin-bottom:24px;
  position:relative;z-index:1;
}
.hero h1{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(60px,12vw,140px);
  line-height:.9;letter-spacing:2px;
  color:${C.cream};
  position:relative;z-index:1;
  margin-bottom:8px;
}
.hero h1 span.ember{color:${C.ember};}
.hero h1 span.gold{color:${C.gold};}
.hero-sub{
  font-size:clamp(16px,2.5vw,22px);
  color:${C.concrete};
  max-width:600px;
  line-height:1.5;
  margin:16px auto 40px;
  position:relative;z-index:1;
  font-style:italic;
}
.hero-metrics{
  display:flex;gap:40px;justify-content:center;flex-wrap:wrap;
  position:relative;z-index:1;
}
.hero-metric{text-align:center;}
.hero-metric-val{
  font-family:'Bebas Neue',sans-serif;
  font-size:48px;color:${C.ember};line-height:1;
}
.hero-metric-label{
  font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.concrete};
}

/* NAV */
.nav{
  background:${C.steelMid};
  border-bottom:1px solid ${C.steelLight};
  position:sticky;top:0;z-index:100;
}
.nav-inner{
  max-width:1200px;margin:0 auto;
  padding:0 24px;
  display:flex;gap:2px;overflow-x:auto;
  scrollbar-width:none;
}
.nav-inner::-webkit-scrollbar{display:none;}
.nav-btn{
  padding:14px 18px;
  background:transparent;
  border:none;
  font-family:'JetBrains Mono',monospace;
  font-size:11px;letter-spacing:2px;text-transform:uppercase;
  color:${C.slag};
  cursor:pointer;
  white-space:nowrap;
  border-bottom:2px solid transparent;
  transition:all .2s;
}
.nav-btn:hover{color:${C.cream};}
.nav-btn.active{color:${C.ember};border-bottom-color:${C.ember};}

.wrap{max-width:1200px;margin:0 auto;padding:0 24px;}

/* SECTIONS */
.sec{padding:80px 0;}
.sec-label{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;letter-spacing:4px;text-transform:uppercase;
  color:${C.ember};margin-bottom:8px;
}
.sec-title{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(36px,6vw,72px);
  line-height:1;letter-spacing:1px;
  margin-bottom:32px;color:${C.cream};
}
.sec-title em{color:${C.ember};font-style:normal;}
.sec-title span{color:${C.gold};}

/* CARDS */
.card{
  background:${C.steelMid};
  border:1px solid ${C.steelLight};
  border-radius:4px;
  padding:28px;
}
.card.ember-border{border-color:${C.ember}44;}
.card.gold-border{border-color:${C.gold}44;}

/* PROCESS FLOW */
.flow{
  display:flex;align-items:stretch;gap:0;
  overflow-x:auto;margin-bottom:48px;
}
.flow-step{
  flex:1;min-width:140px;
  background:${C.steelMid};
  border:1px solid ${C.steelLight};
  padding:20px 16px;
  position:relative;
  text-align:center;
}
.flow-step::after{
  content:'▶';
  position:absolute;right:-12px;top:50%;transform:translateY(-50%);
  color:${C.ember};font-size:16px;z-index:2;
}
.flow-step:last-child::after{display:none;}
.flow-icon{font-size:28px;margin-bottom:8px;}
.flow-num{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;color:${C.ember};letter-spacing:2px;margin-bottom:4px;
}
.flow-name{font-size:13px;font-weight:600;color:${C.cream};margin-bottom:4px;}
.flow-detail{font-size:11px;color:${C.slag};}

/* PRODUCT TABLE */
.prod-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:16px;
}
.prod-card{
  background:${C.steelMid};
  border:1px solid ${C.steelLight};
  border-radius:4px;
  overflow:hidden;
}
.prod-header{
  padding:16px 20px;
  background:${C.steelLight};
  border-bottom:2px solid ${C.ember};
}
.prod-name{
  font-family:'Bebas Neue',sans-serif;
  font-size:22px;letter-spacing:1px;color:${C.cream};
  margin-bottom:2px;
}
.prod-formula{
  font-family:'JetBrains Mono',monospace;
  font-size:11px;color:${C.ember};
}
.prod-body{padding:16px 20px;}
.prod-row{
  display:flex;justify-content:space-between;
  padding:5px 0;
  border-bottom:1px solid ${C.steelLight};
  font-size:12px;
}
.prod-key{color:${C.slag};}
.prod-val{color:${C.cream};font-family:'JetBrains Mono',monospace;}
.prod-val.ember{color:${C.ember};}
.prod-val.gold{color:${C.gold};}

/* TIMELINE */
.timeline{position:relative;padding-left:40px;}
.timeline::before{
  content:'';position:absolute;left:12px;top:0;bottom:0;
  width:2px;background:linear-gradient(${C.ember},${C.gold},${C.steelLight});
}
.tl-item{margin-bottom:48px;position:relative;}
.tl-dot{
  position:absolute;left:-34px;top:6px;
  width:20px;height:20px;border-radius:50%;
  background:${C.ember};
  border:3px solid ${C.steel};
  box-shadow:0 0 0 2px ${C.ember};
}
.tl-dot.gold{background:${C.gold};box-shadow:0 0 0 2px ${C.gold};}
.tl-dot.green{background:${C.green};box-shadow:0 0 0 2px ${C.green};}
.tl-year{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;letter-spacing:3px;text-transform:uppercase;
  color:${C.ember};margin-bottom:4px;
}
.tl-year.gold{color:${C.gold};}
.tl-year.green{color:${C.greenLight};}
.tl-title{
  font-family:'Bebas Neue',sans-serif;
  font-size:28px;letter-spacing:1px;
  color:${C.cream};margin-bottom:12px;
}
.tl-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.tl-block{
  background:${C.steelMid};
  border:1px solid ${C.steelLight};
  border-radius:4px;
  padding:14px 16px;
}
.tl-block-label{
  font-size:10px;letter-spacing:2px;text-transform:uppercase;
  color:${C.slag};margin-bottom:6px;
  font-family:'JetBrains Mono',monospace;
}
.tl-block-val{font-size:13px;color:${C.cream};line-height:1.6;}
.tl-block-val strong{color:${C.ember};}
.tl-block-val.gold strong{color:${C.gold};}

/* FINANCE */
.fin-stack{display:flex;flex-direction:column;gap:12px;}
.fin-item{
  display:flex;align-items:center;gap:20px;
  background:${C.steelMid};
  border:1px solid ${C.steelLight};
  border-left:3px solid ${C.ember};
  border-radius:0 4px 4px 0;
  padding:16px 20px;
}
.fin-item.gold{border-left-color:${C.gold};}
.fin-item.green{border-left-color:${C.greenLight};}
.fin-source{flex:0 0 200px;}
.fin-source-name{font-size:14px;font-weight:600;color:${C.cream};margin-bottom:2px;}
.fin-source-type{font-size:11px;color:${C.slag};font-family:'JetBrains Mono',monospace;}
.fin-amount{
  flex:0 0 140px;
  font-family:'Bebas Neue',sans-serif;
  font-size:28px;color:${C.ember};
}
.fin-item.gold .fin-amount{color:${C.gold};}
.fin-item.green .fin-amount{color:${C.greenLight};}
.fin-desc{font-size:12px;color:${C.slag};line-height:1.6;flex:1;}
.fin-phase{
  flex:0 0 80px;text-align:right;
  font-size:10px;letter-spacing:2px;
  text-transform:uppercase;color:${C.slag};
  font-family:'JetBrains Mono',monospace;
}

/* SYNERGY */
.syn-grid{
  display:grid;grid-template-columns:1fr auto 1fr;
  gap:24px;align-items:center;
}
.syn-col{display:flex;flex-direction:column;gap:12px;}
.syn-center{
  display:flex;flex-direction:column;align-items:center;gap:8px;
  color:${C.ember};font-family:'Bebas Neue',sans-serif;font-size:32px;
}
.syn-item{
  background:${C.steelMid};border:1px solid ${C.steelLight};
  border-radius:4px;padding:14px 18px;
  font-size:13px;color:${C.concrete};line-height:1.6;
}
.syn-item strong{color:${C.cream};display:block;margin-bottom:3px;}

/* FACTORY PLAN */
.factory-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  grid-template-rows:auto auto;
  gap:2px;
  background:${C.steelLight};
  border:1px solid ${C.steelLight};
  border-radius:4px;overflow:hidden;
}
.fac-cell{background:${C.steelMid};padding:20px;}
.fac-cell.dark{background:${C.steel};}
.fac-cell.ember-bg{background:${C.emberDim};}
.fac-cell.span2{grid-column:span 2;}
.fac-cell.span4{grid-column:span 4;}
.fac-label{
  font-family:'JetBrains Mono',monospace;
  font-size:9px;letter-spacing:3px;text-transform:uppercase;
  color:${C.ember};margin-bottom:8px;
}
.fac-cell.dark .fac-label{color:${C.gold};}
.fac-cell.ember-bg .fac-label{color:${C.cream}88;}
.fac-title{font-size:15px;font-weight:600;color:${C.cream};margin-bottom:6px;}
.fac-body{font-size:12px;color:${C.slag};line-height:1.7;}
.fac-body li{padding:2px 0 2px 12px;position:relative;}
.fac-body li::before{content:'▸';position:absolute;left:0;color:${C.ember};font-size:10px;}

/* TABLE */
table{width:100%;border-collapse:collapse;font-size:13px;}
th{
  background:${C.steelLight};
  color:${C.ember};
  padding:12px 16px;text-align:left;
  font-family:'JetBrains Mono',monospace;
  font-size:10px;letter-spacing:2px;text-transform:uppercase;
}
td{
  padding:11px 16px;
  border-bottom:1px solid ${C.steelLight};
  color:${C.slag};
}
tr:hover td{background:${C.steelLight}44;}
td:first-child{color:${C.cream};font-weight:500;}
.mono{font-family:'JetBrains Mono',monospace;font-size:12px;}
.ember-text{color:${C.ember};}
.gold-text{color:${C.gold};}
.green-text{color:${C.greenLight};}

/* CAPEX CHART */
.bar-chart{display:flex;flex-direction:column;gap:10px;}
.bar-row{display:flex;align-items:center;gap:12px;}
.bar-label{width:200px;font-size:12px;color:${C.concrete};flex-shrink:0;}
.bar-track{flex:1;height:24px;background:${C.steelLight};border-radius:2px;overflow:hidden;}
.bar-fill{height:100%;border-radius:2px;display:flex;align-items:center;padding-left:8px;
  font-family:'JetBrains Mono',monospace;font-size:11px;color:${C.cream};transition:width .8s ease;}
.bar-val{width:80px;font-family:'JetBrains Mono',monospace;font-size:12px;color:${C.ember};text-align:right;flex-shrink:0;}

/* TRL METER */
.trl-row{display:flex;gap:4px;margin-bottom:24px;}
.trl-box{
  flex:1;height:48px;display:flex;align-items:center;justify-content:center;
  font-family:'Bebas Neue',sans-serif;font-size:18px;
  border-radius:2px;position:relative;cursor:default;
  transition:all .3s;
}
.trl-box.done{background:${C.emberDim};color:${C.cream};}
.trl-box.active{background:${C.ember};color:${C.steel};box-shadow:0 0 20px ${C.ember}66;}
.trl-box.future{background:${C.steelLight};color:${C.slag};}
.trl-box.target{background:${C.goldDim};color:${C.cream};}

@media(max-width:768px){
  .prod-grid{grid-template-columns:1fr 1fr;}
  .tl-grid{grid-template-columns:1fr;}
  .syn-grid{grid-template-columns:1fr;}
  .factory-grid{grid-template-columns:1fr 1fr;}
  .fac-cell.span2,.fac-cell.span4{grid-column:span 2;}
}
`;

const TABS = ["Synergie","Procesflow","Producten","5-Jaar Plan","Fabriek","Financiering","P&L Model"];

const PRODUCTS = [
  {name:"Vanadium Pentoxide",formula:"V₂O₅",recovery:"87%",trl:"TRL4→5",
   price:"€18–22/kg",vol5y:"12 ton/jaar",rev5y:"€240K",market:"Vanadium redox flow batteries, staal",
   zekerheid:"Hoog — EU CRMA kritisch mineraal"},
  {name:"IJzerconcentraat",formula:"Fe³O₄",recovery:"65%",trl:"TRL4",
   price:"€80–110/ton",vol5y:"3.500 ton/jaar",rev5y:"€318K",market:"Staalindustrie feedstock, magnetiet",
   zekerheid:"Hoog — Tata Steel offtake"},
  {name:"Si-K Biostimulant",formula:"SiO₂·K₂O slip",recovery:"Restfractie",trl:"TRL4→5",
   price:"€1,15/L cost vs €60–106/L markt",vol5y:"50.000 L/jaar",rev5y:"€1,2M",market:"Agro: pioen Wognum, glastuinbouw",
   zekerheid:"Hoog — CE-markering roadmap loopt"},
  {name:"Titaan Precipitaat",formula:"TiO(OH)₂",recovery:"pH 1.5–2",trl:"TRL3→4",
   price:"€200–400/kg (pigment grade)",vol5y:"0,8 ton/jaar",rev5y:"€240K",market:"TiO₂ pigment, specialty coatings",
   zekerheid:"Middel — marktvalidatie nodig"},
  {name:"Calciumrijke Leachester",formula:"CaO residue",recovery:"~40% massa",trl:"TRL4",
   price:"€15–25/ton",vol5y:"8.000 ton/jaar",rev5y:"€160K",market:"Bouw (zeefzand), wegfundering",
   zekerheid:"Hoog — laagste verwaarding"},
  {name:"Chroom-vrij Proceswater",formula:"Cr(VI)<0.01mg/L",recovery:"100%",trl:"TRL4",
   price:"n.v.t. — compliance waarde",vol5y:"—",rev5y:"Milieu-bonus",market:"Lozingsrecht vergunning",
   zekerheid:"Kritisch — procesintegriteit"},
];

const FINANCING = [
  {src:"WBSO 2026",type:"Belastingvoordeel",amt:"€21K/jr",desc:"32% over S&O loonkosten (1.400 uur × €47). Edwin + Diederik. Doorloopt automatisch bij jaarlijkse verlenging.",phase:"Fase 0",color:"ember"},
  {src:"ANK Industrial Bond",type:"Coöperatief obligatie",amt:"€500K",desc:"ANK-leden financieren de pilot plant. 5% rente, 5 jaar looptijd. Slag B.V. betaalt rente uit product-omzet. Vrijgesteld <€5M Prospectusverordening.",phase:"Fase 2",color:"ember"},
  {src:"RVO Innovatiekrediet",type:"Staatslening 3.8%",amt:"€2,5M",desc:"Voor TRL5→7 (pilot naar demo). Terugbetaling na 10 jaar. Ideaal voor kapitaalintensieve equipment (HGMS, reactoren, ICP-MS). Aanvraag bij TRL5 aantoonbaar.",phase:"Fase 2",color:"gold"},
  {src:"WBSO 2027–2028",type:"Belastingvoordeel",amt:"€42K/jr",desc:"Opschaling bij meer S&O personeel. TRL5 demo rechtvaardigt bredere S&O activiteiten en hogere urenregistratie.",phase:"Fase 2",color:"ember"},
  {src:"EU CRMA Strategic Project",type:"EU subsidie / prioriteit",amt:"Niet-geld",desc:"Vanadium staat op EU CRMA Critical Minerals lijst. Aanwijzing als Strategisch Project versnelt vergunningen, geeft prioritaire toegang tot EIB financiering en EIC programma's.",phase:"Fase 3",color:"gold"},
  {src:"EIC Accelerator",type:"EU grant + equity",amt:"€2,5M+€15M",desc:"€2,5M non-dilutive grant + tot €15M equity investering van EIC Fund. Vereist TRL6 aantoonbaar. Aanvraag Q4 2027 na Zuiddijk pilot resultaten.",phase:"Fase 3",color:"gold"},
  {src:"Tata Steel Feedstock Deal",type:"Strategisch contract",amt:"€0 instroom",desc:"Tata levert BOF slag gratis/nominaal als waste stream. Tegenprestatie: Tata krijgt schone-restfractie terug + V-recovery fee. Dit is de kritische resource-lock.",phase:"Fase 1",color:"green"},
  {src:"ANK Overwaarde Garantie",type:"Zekerheid structuur",amt:"€200K–1M",desc:"ANK-leden met bedrijfspanden of woningoverwaarde stellen borg voor Slag B.V. apparatuurlening bij Triodos/ASN. ANK regelt matching; Slag B.V. betaalt marktconforme rente.",phase:"Fase 1",color:"green"},
];

const YEARS = [
  {
    year:"JAAR 1 — 2026",dot:"ember",trl:"TRL 4→5",
    title:"LAB VALIDATIE & TATA DEAL",
    blocks:[
      {label:"SmartSlag³ Lab",val:"BCR extractie volledig gevalideerd op BOF + BF slag. Drieloops HGMS protocol (0.3T/0.7T/1.5T) geconfirmeerd. V-recovery 87%. Eerste productmonsters voor Eurofins Agro."},
      {label:"ANK Opstartfonds",val:"ANK Coöperatief U.A. opgericht. Eerste 10 leden (beleggers). €99K ingelegde lidmaatschapsbijdragen. XRPL wallet infrastructure live."},
      {label:"Tata Steel Contract",val:"MOU gesloten: 500 ton BOF slag/jaar. Edwin pitch via KIVI Alkmaar netwerk. Feedstock waarde: €0 (waste). Bewijs van toelevering = basis voor alle subsidies."},
      {label:"Zuiddijk 103 Lease",val:"Basement Zaandam (90m², 300mm betonvloer) gehuurd. Ombouw lab. NEN 1010 elektrische aansluiting. Percolaat opvang. Kosten: ~€2.400/mnd."},
      {label:"Financiering",val:"WBSO €21K. EHMAC consultancy cross-subsidie (€60K omzet). Totale cashburn: <€45K."},
      {label:"KPI",val:"Eerste V₂O₅ monster: 98%+ purity. Biostimulant Si-K: 3 bodemanalyses Wognum positief. Eurofins rapport gereed."},
    ]
  },
  {
    year:"JAAR 2 — 2027",dot:"ember",trl:"TRL 5→6",
    title:"PILOT PLANT & EERSTE OMZET",
    blocks:[
      {label:"Pilotinstallatie",val:"Zuiddijk opgespannen als continue pilotlijn: feed 2 ton/week. HGMS semi-industrieel (Eriez of SciAps). Electrocoagulatie reactor (Intex ECO8220-T opschaling). pH-ladder cascade."},
      {label:"Eerste Productverkoop",val:"Si-K biostimulant: 10.000L × €8/L (korting fase) = €80K omzet. V₂O₅: 1,5 ton × €20/kg = €30K. IJzerconcentraat: 200 ton × €95/ton = €19K. Totaal: ~€130K."},
      {label:"ANK Industrial Bond I",val:"€500K obligatie uitgifte aan ANK-leden. 5% rente. Doel: HGMS apparatuur + reactoren. Slag B.V. neemt lening op van Coöperatie. Notarieel geregistreerd."},
      {label:"RVO Innovatiekrediet",val:"Aanvraag ingediend bij TRL5 resultaten. €2,5M. Reviewperiode 6 mnd. Beslissing verwacht Q4 2027."},
      {label:"Personeel",val:"Eerste laborant aangesteld (HBO Scheikunde, €38K bruto). WBSO op loonkosten. Diederik Fierig full-time Slakkenspoor VOF."},
      {label:"KPI",val:"Continu procesflow >72u aaneengesloten. Cr(VI) <0,01 mg/L in afvalwater. CE-markering Si-K Notified Body aanvraag ingediend."},
    ]
  },
  {
    year:"JAAR 3 — 2028",dot:"gold",trl:"TRL 6→7",
    title:"DEMO FABRIEK & EU SUBSIDIES",
    blocks:[
      {label:"Locatiestap",val:"Zuiddijk te klein. Nieuwe locatie: industrieterrein Zaandam of Westpoort Amsterdam. 500–1.000m². 10 ton/week BOF slag feed. Investeringsbudget: €1,5M (RVO Innovatiekrediet)."},
      {label:"CRMA Strategic Project",val:"Aanvraag EU Critical Raw Materials Act Strategic Project. Vanadium = EU-kritisch. Versnelde vergunningsprocedure (max 18 mnd i.p.v. 5+ jaar). EIB garantie toegankelijk."},
      {label:"EIC Accelerator prep",val:"TRL6 bewijs aanwezig. VITO/TNO validatierapport besteld (€30K, versterkt geloofwaardigheid). EIC pitch deck gereed. Aanvraag Q4 2028."},
      {label:"ANK Bond II",val:"Tweede emissie: €1M. ANK-leden financieren locatie-uitbreiding. Slag B.V. omzet (~€600K) dekt rentebetalingen. Zekerheid: productieapparatuur + Tata feedstock contract."},
      {label:"Productomzet",val:"Si-K: 25.000L × €10/L = €250K. V₂O₅: 5 ton × €20/kg = €100K. Fe-concentraat: 800 ton × €95 = €76K. Titaan: 200kg × €250 = €50K. Totaal: ~€476K."},
      {label:"KPI",val:"RVO beslissing positief. EIC shortlist. VITO rapport: onafhankelijke TRL6 bevestiging. Patent aangevraagd (pH-ladder V-extractie sequentie)."},
    ]
  },
  {
    year:"JAAR 4 — 2029",dot:"gold",trl:"TRL 7→8",
    title:"INDUSTRIËLE SCHAAL & EIC",
    blocks:[
      {label:"EIC Accelerator",val:"€2,5M grant + €5–15M equity optie. Totaal beschikbaar kapitaal: €7–17M. Dit financiert volledige fabrieksbouw (TRL8)."},
      {label:"Tata Steel Partnerschap",val:"Exclusief feedstock contract 10 jaar, 10.000 ton BOF slag/jaar. Tata neemt aandeel in Slag B.V. (15–25%) als strategisch partner. Valide exit-optie: Tata neemt over."},
      {label:"Fabriekslocatie",val:"Eigengebouwd of gehuurd: 3.000m² industrieel gebouw nabij IJmuiden of Zaanstreek. Volledig geautomatiseerde processlijnen. CE-gecertificeerde uitstroom."},
      {label:"ANK Terugbetaling",val:"Slag B.V. lost ANK Bond I (€500K) volledig af. ANK-leden ontvangen 5% rente × 3 jaar = €75K rendement collectief. Success story → ANK Bond III mogelijk voor andere industriële projecten."},
      {label:"Omzet",val:"Si-K: 150K liter × €12 = €1,8M. V₂O₅: 8 ton × €21 = €168K. Fe: 2.500 ton × €100 = €250K. Titaan: 600kg × €300 = €180K. Ca-residu: 5K ton × €20 = €100K. Totaal: ~€2,5M."},
      {label:"KPI",val:"EBITDA positief (>€400K). Patent verleend. Eerste internationale klant Si-K (Cantonese markt via web3 distributienetwerk?). Euronext Access voorbereiding."},
    ]
  },
  {
    year:"JAAR 5 — 2030",dot:"green",trl:"TRL 8→9",
    title:"VOLWAARDIGE FABRIEK & EXIT",
    blocks:[
      {label:"Volledig operationeel",val:"50 ton BOF slag/dag continues verwerking. 6 productstromen volledig gecertificeerd. 18 FTE (lab, operators, sales, compliance). Omzet: €6–10M."},
      {label:"ANK-Slag Synthetisch Effect",val:"ANK heeft €2,5M+ aan industrial bonds geplaatst bij leden. Slag B.V. is het vlaggenschip ANK-industrieel project. Proof-of-concept voor ANK als industrieel financieringsplatform (naast woon-niches)."},
      {label:"Exit Scenario A",val:"Tata Steel acquisitie: 100% Slag B.V. voor €15–30M (4–6× omzet). Edwin/Diederik cashen uit. VirtualV Holding ontvangt management fee + royalty op patenten."},
      {label:"Exit Scenario B",val:"Euronext Access IPO: €1,8B EV (zoals eerder gemodelleerd) via organische groei EU vanadium markt. ANK-leden krijgen preferente aandelen aangeboden vóór IPO."},
      {label:"Exit Scenario C",val:"Strategische JV: VITO, TNO of Umicore neemt 50% voor technologie-roll-out naar andere staallocaties (Arcelor Mittal, Salzgitter). Slag B.V. = technologie-licentiegever."},
      {label:"Edwin's positie",val:"CEO SmartSlag Europe. VirtualV Holding waarde: €5–20M. ANK operationeel zelfstandig met 2.000+ leden. EHMAC consultancy doorloopt. Financieel vrij."},
    ]
  },
];

export default function App() {
  const [tab, setTab] = useState("Synergie");
  const [trlHover, setTrlHover] = useState(null);

  const trlLabels = {
    1:"Basic principles",2:"Technology concept",3:"Experimental proof",
    4:"Lab validation ✓",5:"Pilot validation",6:"Demo environment",
    7:"Prototype industrieel",8:"Volledig systeem",9:"Bewezen operationeel"
  };

  return (
    <div>
      <style>{css}</style>

      {/* HERO */}
      <div className="hero">
        <div className="hero-grid"></div>
        <div className="hero-glow"></div>
        <div className="hero-eyebrow">// VirtualV Holding B.V. — Masterplan 2026–2030</div>
        <h1>
          <span className="ember">ANK</span><br/>
          <span style={{fontSize:"60%",letterSpacing:4}}>×</span><br/>
          <span className="gold">SMARTSLAG³</span>
        </h1>
        <div className="hero-sub">
          Van Amsterdamse overwaarde tot Europese kritische mineralen fabriek —<br/>
          de VOC-strategie voor de 21e eeuw.
        </div>
        <div className="hero-metrics">
          {[
            {val:"€10M",label:"Omzet jaar 5"},
            {val:"6",label:"Productstromen"},
            {val:"50T",label:"Slag/dag TRL9"},
            {val:"5jr",label:"Naar volledige fabriek"},
          ].map((m,i) => (
            <div key={i} className="hero-metric">
              <div className="hero-metric-val">{m.val}</div>
              <div className="hero-metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* NAV */}
      <div className="nav">
        <div className="nav-inner">
          {TABS.map(t => (
            <button key={t} className={`nav-btn ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="wrap">

        {/* SYNERGIE */}
        {tab==="Synergie" && (
          <div className="sec">
            <div className="sec-label">// De combinatie</div>
            <div className="sec-title">ANK <em>financiert</em><br/>wat <span>SmartSlag³</span> maakt</div>

            <div className="syn-grid" style={{marginBottom:48}}>
              <div className="syn-col">
                <div style={{fontFamily:"'Bebas Neue'",fontSize:28,color:C.ember,letterSpacing:2,marginBottom:8}}>⚓ ANK COÖPERATIE</div>
                {[
                  {title:"Kapitaalbron",body:"Leden stellen overwaarde beschikbaar als borg. Geen bank nodig. Coöperatief model (Wtk) — vergunningvrij tot €10M."},
                  {title:"ANK Industrial Bonds",body:"Niet alleen woonleningen: ANK plaatst obligaties voor Slag B.V. equipment. 5% rente gedekt door productomzet."},
                  {title:"Netwerk als distributiemacht",body:"ANK-leden zijn ook eerste klanten Si-K biostimulant (tuiniers, agrariërs). Community = markt."},
                  {title:"Treasury yield",body:"Idle ANK fondsgeld rendeert in XRPL AMM terwijl wacht op Slag B.V. rente-inkomsten. Dubbel rendement."},
                ].map((s,i)=>(
                  <div key={i} className="syn-item"><strong>{s.title}</strong>{s.body}</div>
                ))}
              </div>
              <div className="syn-center">
                <div style={{fontSize:48}}>⇄</div>
                <div style={{fontSize:14,color:C.slag,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>VLIEGWIEL</div>
                <div style={{width:2,flex:1,background:`linear-gradient(${C.ember},${C.gold})`}}></div>
              </div>
              <div className="syn-col">
                <div style={{fontFamily:"'Bebas Neue'",fontSize:28,color:C.gold,letterSpacing:2,marginBottom:8}}>⚗ SMARTSLAG³ B.V.</div>
                {[
                  {title:"Inkomstenbron",body:"6 gecertificeerde producten uit Tata Steel BOF slag. Eerste omzet jaar 2. Betaalt ANK-rente uit operationele cashflow."},
                  {title:"WBSO + subsidies",body:"€21K+/jaar belastingbaat. RVO Innovatiekrediet €2,5M. EIC Accelerator €2,5M grant. Lagere vermogensbehoefte bij ANK."},
                  {title:"EU CRMA waarde",body:"Vanadium = kritisch mineraal. Strategic Project status = versnelde vergunningen + EIB toegang. ANK-leden zijn indirect EU-kritische mineralen investeerders."},
                  {title:"Exit waarde voor ANK",body:"Bij Tata-acquisitie of IPO: ANK-obligatiehouders krijgen preferente terugbetaling + bonus. Eerste industrial exit in NL op coöperatief model."},
                ].map((s,i)=>(
                  <div key={i} className="syn-item"><strong>{s.title}</strong>{s.body}</div>
                ))}
              </div>
            </div>

            {/* VLIEGWIEL */}
            <div className="sec-label">// Het vliegwiel</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:2,background:C.steelLight,borderRadius:4,overflow:"hidden",marginBottom:48}}>
              {[
                {icon:"🏠",title:"ANK-leden brengen overwaarde in",sub:"Coöperatieve borg"},
                {icon:"💰",title:"ANK plaatst Industrial Bond",sub:"5% rente, 5 jaar"},
                {icon:"⚗",title:"Slag B.V. koopt equipment",sub:"Pilot → fabriek"},
                {icon:"🏭",title:"Fabriek produceert V₂O₅ + Si-K",sub:"6 productstromen"},
                {icon:"📈",title:"Omzet betaalt rente + ANK groeit",sub:"Vliegwiel compleet"},
              ].map((f,i)=>(
                <div key={i} style={{background:C.steelMid,padding:20,textAlign:"center"}}>
                  <div style={{fontSize:28,marginBottom:8}}>{f.icon}</div>
                  <div style={{fontFamily:"'Crimson Pro'",fontSize:13,fontWeight:600,color:C.cream,marginBottom:4}}>{f.title}</div>
                  <div style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:C.ember}}>{f.sub}</div>
                </div>
              ))}
            </div>

            {/* TRL METER */}
            <div className="sec-label">// TRL STATUS (April 2026)</div>
            <div className="trl-row">
              {[1,2,3,4,5,6,7,8,9].map(n=>(
                <div key={n}
                  className={`trl-box ${n<4?"done":n===4?"active":n<8?"future":"target"}`}
                  onMouseEnter={()=>setTrlHover(n)}
                  onMouseLeave={()=>setTrlHover(null)}
                >
                  TRL{n}
                </div>
              ))}
            </div>
            {trlHover && (
              <div style={{background:C.steelMid,border:`1px solid ${C.ember}`,borderRadius:4,padding:"10px 16px",
                fontFamily:"'JetBrains Mono'",fontSize:12,color:C.cream,marginTop:8}}>
                <span style={{color:C.ember}}>TRL{trlHover}:</span> {trlLabels[trlHover]}
              </div>
            )}
            <div style={{display:"flex",gap:16,marginTop:12}}>
              {[
                {color:C.emberDim,label:"Behaald (TRL1-3)"},
                {color:C.ember,label:"Huidig (TRL4)"},
                {color:C.steelLight,label:"Komende 3 jaar"},
                {color:C.goldDim,label:"Jaar 5 doel (TRL9)"},
              ].map((l,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:16,height:16,background:l.color,borderRadius:2}}></div>
                  <span style={{fontSize:11,color:C.slag,fontFamily:"'JetBrains Mono'"}}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROCESFLOW */}
        {tab==="Procesflow" && (
          <div className="sec">
            <div className="sec-label">// SmartSlag³ Procesarchitectuur</div>
            <div className="sec-title">Van <em>staalslak</em><br/>tot <span>zes producten</span></div>

            <div className="flow" style={{marginBottom:32}}>
              {[
                {icon:"⛏",num:"FEED",name:"BOF Slag input",detail:"Tata Steel IJmuiden\n500T→50T/dag"},
                {icon:"🧲",num:"STAP 1",name:"3-Fase HGMS",detail:"0.3T→0.7T→1.5T\n87% V-recovery"},
                {icon:"⚗",num:"STAP 2",name:"Zuurloging",detail:"H₂SO₄/citric acid\nL/S 20:1, 80°C"},
                {icon:"⬇",num:"STAP 3",name:"pH-Ladder",detail:"Ti@pH1.5, Fe@pH3.5\nV@pH8.5 (NH₄VO₃)"},
                {icon:"⚡",num:"STAP 4",name:"Electrocoag",detail:"Cr-verwijdering\nvóór NaCl stap"},
                {icon:"✨",num:"STAP 5",name:"Filtratie + DS",detail:"Productscheiding\nkwaliteitscontrole"},
                {icon:"📦",num:"OUTPUT",name:"6 Producten",detail:"V₂O₅, Fe, Si-K\nTi, Ca, Water"},
              ].map((f,i)=>(
                <div key={i} className="flow-step">
                  <div className="flow-icon">{f.icon}</div>
                  <div className="flow-num">{f.num}</div>
                  <div className="flow-name">{f.name}</div>
                  <div className="flow-detail" style={{whiteSpace:"pre"}}>{f.detail}</div>
                </div>
              ))}
            </div>

            <div className="sec-label">// Kritische procesconstraints</div>
            <table style={{marginBottom:40}}>
              <thead><tr><th>Constraint</th><th>Reden</th><th>Oplossing</th><th>Status</th></tr></thead>
              <tbody>
                {[
                  ["Cr-verwijdering vóór NaCl","NaCl + Cr → Cr(VI) = giftig en illegaal","Electrocoagulatie stap 4 (Intex ECO8220-T repurpose)","✓ Gevalideerd"],
                  ["V precipitatie pH 5.0–5.5 (H₂SO₄ route)","Diederik claim pH 10.5 was VO(OH)₂ alkalisch route","KOH toevoeging na H₂SO₄ digest, niet NH₃","✓ Gecorrigeerd"],
                  ["TiO₂ concentratie 0.59% (was 33.7%)","57× fout in initiële XRF — massabalans wrong","Gecorrigeerde XRF IJmuiden BOF slag compositie","✓ Gecorrigeerd"],
                  ["Paramagnetisch V⁴⁺ bij lage velddichtheid","V gaat verloren bij 0.3T HGMS stap","V eerst oxideren naar V⁵⁺ voor HGMS","✓ Protocol v4.0"],
                  ["Cr(VI) test Macherey-Nagel","Hanna HI95748 te duur (€800+)","VISOCOLOR ECO €45/kit — gevalideerde alternatief","✓ Besteld"],
                  ["Acetic vs citric acid keuze","Acetic: goedkoper; citric: hogere Si-K kwaliteit","Sequentieel: acetic → citric bij hogere TRL","⏳ TRL5 test"],
                ].map((r,i)=>(
                  <tr key={i}><td>{r[0]}</td><td style={{fontSize:12}}>{r[1]}</td><td style={{fontSize:12}}>{r[2]}</td>
                  <td className={r[3].startsWith("✓")?"green-text":"ember-text"} style={{fontFamily:"'JetBrains Mono'",fontSize:12}}>{r[3]}</td></tr>
                ))}
              </tbody>
            </table>

            <div className="sec-label">// Massabalans (per 100 ton BOF slag input)</div>
            <div className="bar-chart">
              {[
                {label:"Magnetische Fe-fractie (HGMS)",pct:35,val:"35 ton",color:C.slag},
                {label:"Vanadiumrijke leachoplossing",pct:8,val:"8 ton",color:C.ember},
                {label:"Si-K biostimulant slip",pct:22,val:"22 ton",color:C.greenLight},
                {label:"Ca-rijke residu (bouw)",pct:28,val:"28 ton",color:C.goldDim},
                {label:"Ti-precipitaat",pct:1,val:"~0.8 ton",color:C.gold},
                {label:"Proceswater (geloosd/hergebruikt)",pct:6,val:"6m³",color:C.steelLight},
              ].map((b,i)=>(
                <div key={i} className="bar-row">
                  <div className="bar-label">{b.label}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{width:`${b.pct*2.8}%`,background:b.color}}>{b.val}</div>
                  </div>
                  <div className="bar-val">{b.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTEN */}
        {tab==="Producten" && (
          <div className="sec">
            <div className="sec-label">// Productportfolio SmartSlag³</div>
            <div className="sec-title">Zes <em>waarde</em>stromen<br/><span>uit één afvalstroom</span></div>
            <div className="prod-grid">
              {PRODUCTS.map((p,i)=>(
                <div key={i} className="prod-card">
                  <div className="prod-header">
                    <div className="prod-name">{p.name}</div>
                    <div className="prod-formula">{p.formula}</div>
                  </div>
                  <div className="prod-body">
                    {[
                      ["Recovery",p.recovery,"ember"],
                      ["TRL",p.trl,""],
                      ["Prijs/eenheid",p.price,"gold"],
                      ["Volume jaar 5",p.vol5y,""],
                      ["Omzet jaar 5",p.rev5y,"ember"],
                      ["Markt",p.market,""],
                      ["Zekerheid",p.zekerheid,""],
                    ].map(([k,v,cl],j)=>(
                      <div key={j} className="prod-row">
                        <span className="prod-key">{k}</span>
                        <span className={`prod-val ${cl}`} style={{textAlign:"right",maxWidth:160,fontSize:11}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{marginTop:40}}>
              <div className="sec-label">// Gecombineerde omzetprojectie</div>
              <table>
                <thead><tr><th>Product</th><th>Jaar 1</th><th>Jaar 2</th><th>Jaar 3</th><th>Jaar 4</th><th>Jaar 5</th></tr></thead>
                <tbody>
                  {[
                    ["Si-K Biostimulant","€0","€80K","€250K","€1,8M","€3,5M"],
                    ["V₂O₅","€5K","€30K","€100K","€168K","€420K"],
                    ["IJzerconcentraat","€0","€19K","€76K","€250K","€700K"],
                    ["Titaan precipitaat","€0","€0","€50K","€180K","€360K"],
                    ["Ca-residu","€0","€5K","€20K","€100K","€200K"],
                    ["Proceswater compliance","—","—","—","—","—"],
                  ].map((r,i)=>(
                    <tr key={i}>
                      <td>{r[0]}</td>
                      {r.slice(1).map((v,j)=><td key={j} className={j===4?"gold-text mono":j===3?"ember-text mono":"mono"}>{v}</td>)}
                    </tr>
                  ))}
                  <tr style={{borderTop:`2px solid ${C.ember}`}}>
                    <td style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:1}}>TOTAAL</td>
                    {["€5K","€134K","€496K","€2,5M","€5,2M"].map((v,i)=>(
                      <td key={i} className={i===4?"gold-text":"ember-text"} style={{fontFamily:"'Bebas Neue'",fontSize:18}}>{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5-JAAR PLAN */}
        {tab==="5-Jaar Plan" && (
          <div className="sec">
            <div className="sec-label">// Masterroadmap</div>
            <div className="sec-title">Vijf jaar.<br/><em>Een fabriek.</em></div>
            <div className="timeline">
              {YEARS.map((y,i)=>(
                <div key={i} className="tl-item">
                  <div className={`tl-dot ${y.dot}`}></div>
                  <div className={`tl-year ${y.dot}`}>{y.year} — {y.trl}</div>
                  <div className="tl-title">{y.title}</div>
                  <div className="tl-grid">
                    {y.blocks.map((b,j)=>(
                      <div key={j} className="tl-block">
                        <div className="tl-block-label">{b.label}</div>
                        <div className={`tl-block-val ${y.dot}`} dangerouslySetInnerHTML={{__html:b.val.replace(/€[\d,K\.M]+/g,m=>`<strong>${m}</strong>`)}}/>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FABRIEK */}
        {tab==="Fabriek" && (
          <div className="sec">
            <div className="sec-label">// Fabrieksplan</div>
            <div className="sec-title">Van <em>Zuiddijk 103</em><br/>naar <span>IJmuiden Industriepark</span></div>

            <div className="factory-grid" style={{marginBottom:40}}>
              <div className="fac-cell span2 ember-bg">
                <div className="fac-label">Fase 1 — Nu → 2027</div>
                <div className="fac-title">Zuiddijk 103, Zaandam</div>
                <ul className="fac-body">
                  <li>90m² kelder, 300mm betonvloer, paalfundatie 8m diep</li>
                  <li>Draagvermogen: ~5 ton/m² — voldoende voor labequipment</li>
                  <li>NEN 1010 elektrische installatie vereist (3-fase 32A)</li>
                  <li>Omgevingsvergunning milieu categorie B (beperkt toezicht)</li>
                  <li>Capaciteit: 200kg slag/batch, 2T/week</li>
                  <li>Huurprijs: ~€2.400/maand</li>
                </ul>
              </div>
              <div className="fac-cell span2">
                <div className="fac-label">Fase 2 — 2027→2028</div>
                <div className="fac-title">Uitbreidingslocatie Zaandam</div>
                <ul className="fac-body">
                  <li>500–1.000m² industriehal Westpoort of Zaanstreek</li>
                  <li>Continue processlijnen: 10T/week feed</li>
                  <li>HGMS semi-industrieel (Eriez L-4 of gelijkwaardig)</li>
                  <li>pH-ladder cascade reactoren (6× 2.000L)</li>
                  <li>Electrocoagulatie lijn (Intex opschaling)</li>
                  <li>Budget: €800K–1,5M (RVO Innovatiekrediet)</li>
                </ul>
              </div>
              <div className="fac-cell">
                <div className="fac-label">Fase 3 — 2028→2029</div>
                <div className="fac-title">Demo Fabriek</div>
                <ul className="fac-body">
                  <li>2.000m² nabij IJmuiden (Tata logistiek)</li>
                  <li>50T/week BOF slag</li>
                  <li>Volautomatisch procescontrol</li>
                  <li>EIC/CRMA-gefinancierd</li>
                </ul>
              </div>
              <div className="fac-cell">
                <div className="fac-label">Fase 4 — 2029→2030</div>
                <div className="fac-title">Volledige Fabriek</div>
                <ul className="fac-body">
                  <li>5.000m² industriepark</li>
                  <li>50T/dag (350T/week)</li>
                  <li>18 FTE operationeel</li>
                  <li>ISO 9001 + CE-gecertificeerd</li>
                </ul>
              </div>
              <div className="fac-cell dark span4">
                <div className="fac-label">Kritieke apparatuur — capex planning</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                  {[
                    {eq:"HGMS Separator",spec:"Eriez L-4 / SciAps",fase:"Fase 2",cost:"€80–120K"},
                    {eq:"ICP-MS (Thermo X Series II)",spec:"Recovery project lopend",fase:"Fase 1",cost:"€0 (refurb)"},
                    {eq:"pH-cascade reactoren",spec:"6× 2.000L HDPE",fase:"Fase 2",cost:"€40K"},
                    {eq:"XRF analyzer",spec:"Skyray Explorer 9000",fase:"Fase 1",cost:"€25–35K"},
                    {eq:"Electrocoag unit",spec:"Intex ECO8220-T ×4",fase:"Fase 1",cost:"€2K"},
                    {eq:"LIBS (slag matrix)",spec:"SciAps Z-200 (Malvern Panalytical)",fase:"Fase 2",cost:"€35–50K"},
                    {eq:"Filterpers",spec:"Membraanfilterpers 40 platen",fase:"Fase 2",cost:"€20K"},
                    {eq:"Spraydroger Si-K",spec:"Kleine industriële droogkamer",fase:"Fase 3",cost:"€80K"},
                  ].map((e,i)=>(
                    <div key={i}>
                      <div style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:C.gold,letterSpacing:1,marginBottom:2}}>{e.eq}</div>
                      <div style={{fontSize:11,color:"#888",marginBottom:1}}>{e.spec}</div>
                      <div style={{fontSize:11,color:C.ember}}>{e.cost} — {e.fase}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sec-label">// Tata Steel feedstock deal — onderhandelingsplan</div>
            <table>
              <thead><tr><th>Argument</th><th>Tata's belang</th><th>ANK/Slag leverage</th><th>Contractterm</th></tr></thead>
              <tbody>
                {[
                  ["BOF slag is waste voor Tata","€15–30/ton afvoerkosten besparen","Gratis feedstock in ruil voor verwerking","500T→10KT/jaar, 10 jaar exclusief"],
                  ["Cr(VI)-vrij restwater","Milieu compliance vereiste","ANK garandeert <0.01mg/L Cr(VI) output","Lozingsrecht via ANK proceswater"],
                  ["EU CRMA Vanadium recovery","Tata wil duurzaamheidsrapportage verbeteren","V₂O₅ recovery = Tata ESG-bullet point","10–15% Slag B.V. aandeel voor Tata"],
                  ["Ca-residu terugname","Tata heeft wegfundering nodig op terrein","Ca-residu gratis teruggeleverd","In-kind verrekening in contract"],
                  ["Innovatiekrediet subsidie","Tata wil R&D partners (WBSO-constructie)","EHMAC fungeert als R&D partner Tata","Gezamenlijke WBSO aanvraag mogelijk"],
                ].map((r,i)=>(
                  <tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FINANCIERING */}
        {tab==="Financiering" && (
          <div className="sec">
            <div className="sec-label">// Financieringsarchitectuur</div>
            <div className="sec-title">Van WBSO<br/>tot <em>EIC Accelerator</em></div>
            <div className="fin-stack" style={{marginBottom:48}}>
              {FINANCING.map((f,i)=>(
                <div key={i} className={`fin-item ${f.color}`}>
                  <div className="fin-source">
                    <div className="fin-source-name">{f.src}</div>
                    <div className="fin-source-type">{f.type}</div>
                  </div>
                  <div className="fin-amount">{f.amt}</div>
                  <div className="fin-desc">{f.desc}</div>
                  <div className="fin-phase">{f.phase}</div>
                </div>
              ))}
            </div>

            <div className="sec-label">// Kapitaalbehoefte per fase</div>
            <table style={{marginBottom:40}}>
              <thead><tr><th>Fase</th><th>Periode</th><th>Capex Behoefte</th><th>Dekt door</th><th>ANK rol</th><th>Restrisico</th></tr></thead>
              <tbody>
                {[
                  ["Fase 0","2026","€45K","EHMAC + WBSO","—","Laag"],
                  ["Fase 1","2026–Q3","€80K","Tata deal + omzet","Overwaarde garantie €200K","Laag"],
                  ["Fase 2","2027","€500K","ANK Bond I + WBSO","Industrial Bond €500K","Middel"],
                  ["Fase 2B","2027–Q4","€2,5M","RVO Innovatiekrediet","Bond als co-zekerheid","Middel"],
                  ["Fase 3","2028","€1,5M extra","ANK Bond II + omzet","Bond II €1M","Middel"],
                  ["Fase 4","2029","€5–15M","EIC Accelerator","Obligatiehouders preferent exit","Laag bij EIC"],
                ].map((r,i)=>(
                  <tr key={i}>{r.map((c,j)=><td key={j} className={j===2?"ember-text mono":j===4?"gold-text":""}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>

            <div className="sec-label">// ANK × Slag gecombineerd kasstroommodel</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              {[
                {title:"Slag B.V. betalingen aan ANK (rente)",rows:[
                  ["ANK Bond I rente (5% × €500K)","€25K/jaar"],
                  ["ANK Bond II rente (5% × €1M)","€50K/jaar"],
                  ["Totaal ANK-rente ontvangst","€75K/jaar"],
                  ["ANK dooruitkering aan leden (80%)","€60K/jaar"],
                  ["ANK behoudt (20% margin)","€15K/jaar"],
                ]},
                {title:"Gecombineerde EBITDA Jaar 5",rows:[
                  ["Slag B.V. omzet","€5,2M"],
                  ["ANK platformomzet","€472K"],
                  ["EHMAC consultancy","€350K"],
                  ["Totale groepsomzet","€6M+"],
                  ["Geschatte EBITDA groep","€1,8–2,5M"],
                ]},
              ].map((c,i)=>(
                <div key={i} className="card">
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:20,letterSpacing:1,color:C.cream,marginBottom:16}}>{c.title}</div>
                  {c.rows.map(([l,v],j)=>(
                    <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.steelLight}`,fontSize:13}}>
                      <span style={{color:C.slag}}>{l}</span>
                      <span style={{fontFamily:"'JetBrains Mono'",color:j===c.rows.length-1?C.ember:C.cream}}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* P&L MODEL */}
        {tab==="P&L Model" && (
          <div className="sec">
            <div className="sec-label">// Geconsolideerd P&L</div>
            <div className="sec-title">VirtualV Holding<br/><em>5-jaar overzicht</em></div>

            <table style={{marginBottom:48}}>
              <thead>
                <tr>
                  <th>Kostenpost / Omzet</th>
                  <th>2026</th><th>2027</th><th>2028</th><th>2029</th><th>2030</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={6} style={{background:C.steelLight,color:C.ember,fontFamily:"'JetBrains Mono'",fontSize:10,letterSpacing:2}}>OMZET</td></tr>
                {[
                  ["EHMAC Consultancy","€120K","€140K","€160K","€200K","€350K"],
                  ["Slag B.V. producten","€5K","€134K","€496K","€2,5M","€5,2M"],
                  ["ANK platformomzet","€12K","€82K","€200K","€350K","€472K"],
                  ["TOTAAL OMZET","€137K","€356K","€856K","€3,05M","€6,02M"],
                ].map((r,i)=>(
                  <tr key={i} style={r[0].startsWith("TOT")?{borderTop:`2px solid ${C.ember}`}:{}}>
                    <td style={r[0].startsWith("TOT")?{fontFamily:"'Bebas Neue'",fontSize:16}:{}}>{r[0]}</td>
                    {r.slice(1).map((v,j)=><td key={j} className={r[0].startsWith("TOT")?"ember-text mono":j===4?"gold-text mono":"mono"}>{v}</td>)}
                  </tr>
                ))}
                <tr><td colSpan={6} style={{background:C.steelLight,color:C.ember,fontFamily:"'JetBrains Mono'",fontSize:10,letterSpacing:2}}>KOSTEN</td></tr>
                {[
                  ["EHMAC personeels + infra","€60K","€80K","€100K","€120K","€150K"],
                  ["Slag lab + pilotkosten","€35K","€120K","€350K","€800K","€1,5M"],
                  ["ANK notaris + compliance","€8K","€18K","€30K","€45K","€63K"],
                  ["Apparatuur afschrijving","€5K","€25K","€80K","€200K","€400K"],
                  ["Rente ANK Bonds","€0","€25K","€75K","€75K","€0"],
                  ["RVO Innovatiekrediet rente","€0","€0","€95K","€95K","€95K"],
                  ["TOTAAL KOSTEN","€108K","€268K","€730K","€1,335M","€2,208M"],
                ].map((r,i)=>(
                  <tr key={i} style={r[0].startsWith("TOT")?{borderTop:`2px solid ${C.steelLight}`}:{}}>
                    <td style={r[0].startsWith("TOT")?{fontFamily:"'Bebas Neue'",fontSize:16}:{}}>{r[0]}</td>
                    {r.slice(1).map((v,j)=><td key={j} className={r[0].startsWith("TOT")?"ember-text mono":"mono"}>{v}</td>)}
                  </tr>
                ))}
                <tr><td colSpan={6} style={{background:C.steelLight,color:C.ember,fontFamily:"'JetBrains Mono'",fontSize:10,letterSpacing:2}}>RESULTAAT</td></tr>
                {[
                  ["EBITDA","€29K","-€62K"," €126K","€1,715M","€3,812M"],
                  ["WBSO baat","€21K","€42K","€60K","€80K","€100K"],
                  ["Subsidies/grants","€0","€0","€0","€2,5M","€0"],
                  ["NETTO RESULTAAT","€50K","-€20K","€186K","€4,295M","€3,912M"],
                ].map((r,i)=>(
                  <tr key={i} style={r[0]==="NETTO RESULTAAT"?{borderTop:`3px solid ${C.gold}`}:{}}>
                    <td style={r[0]==="NETTO RESULTAAT"?{fontFamily:"'Bebas Neue'",fontSize:18,color:C.gold}:{}}>{r[0]}</td>
                    {r.slice(1).map((v,j)=>(
                      <td key={j} style={{
                        fontFamily:"'JetBrains Mono'",
                        color:v.includes("-")?C.rust:r[0]==="NETTO RESULTAAT"?C.gold:C.greenLight,
                        fontSize:r[0]==="NETTO RESULTAAT"?16:13
                      }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="sec-label">// Exit scenario's jaar 5</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
              {[
                {label:"SCENARIO A",title:"Tata Steel Acquisitie",val:"€15–30M",detail:"4–6× omzet multiple. Tata koopt 100% Slag B.V. Edwin ontvangt €8–16M (55% belang). ANK-obligatiehouders krijgen preferente aflossing + 20% bonus. VirtualV Holding behoudt patenten en EHMAC."},
                {label:"SCENARIO B",title:"Euronext Access IPO",val:"€50–180M",detail:"Bij €6M+ omzet en groeipad naar €20M. Beurswaarde 8–30× omzet in greentech sector. ANK-leden krijgen preferente aandelen vóór IPO. Timing: 2030–2031."},
                {label:"SCENARIO C",title:"Technologie JV",val:"€5–20M",detail:"VITO, Umicore of Arcelor Mittal neemt 50% voor technologie-roll-out EU staalindustrie. Slag B.V. = EU slag-processing standaard. Edwin CEO SmartSlag Europe. Royalty-stroom levenslang."},
              ].map((s,i)=>(
                <div key={i} className="card ember-border">
                  <div style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:C.ember,letterSpacing:3,marginBottom:4}}>{s.label}</div>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:24,color:C.cream,letterSpacing:1,marginBottom:4}}>{s.title}</div>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:36,color:C.ember,marginBottom:12}}>{s.val}</div>
                  <div style={{fontSize:13,color:C.slag,lineHeight:1.7}}>{s.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div style={{background:C.steel,borderTop:`1px solid ${C.steelLight}`,padding:"40px 24px",textAlign:"center"}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:32,letterSpacing:2,color:C.cream}}>
          <span style={{color:C.ember}}>ANK</span> × <span style={{color:C.gold}}>SMARTSLAG³</span>
        </div>
        <div style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:C.slag,marginTop:8,letterSpacing:2}}>
          VIRTUALV HOLDING B.V. — EHMAC B.V. — SLAG B.V. — ANK COÖPERATIEF U.A.
        </div>
        <div style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:C.steelLight,marginTop:4}}>
          // VERTROUWELIJK — MASTERPLAN 2026–2030
        </div>
      </div>
    </div>
  );
}
