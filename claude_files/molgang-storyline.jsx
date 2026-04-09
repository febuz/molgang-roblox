import { useState } from "react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&family=Unbounded:wght@400;700;900&family=DM+Mono:wght@300;400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#07090d;color:#e4e9f0;font-family:'Space Grotesk',sans-serif;}
::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:#1a2a3a;}
@keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes shimmer-text{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
.rise{animation:rise .4s ease-out forwards;}
.gradient-text{background:linear-gradient(135deg,#22c55e,#38bdf8,#a78bfa,#fb923c);
  background-size:300% 300%;animation:shimmer-text 5s ease infinite;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.tab{padding:10px 16px;background:transparent;border:none;border-bottom:2px solid transparent;
  cursor:pointer;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;
  text-transform:uppercase;color:#2a3a4a;transition:all .2s;white-space:nowrap;}
.tab.on{color:#22c55e;border-bottom-color:#22c55e;}
.tab:hover{color:#4a7a60;}
`;

const ENTREPRENEURS = [
  { name:"Jack Ma", origin:"Hangzhou, China 🇨🇳", icon:"🐉", col:"#ef4444",
    from:"Leraar Engels. 3× geweigerd Harvard. Afgewezen bij KFC-sollicitatie.", to:"Alibaba — $231 miljard. 1,3 miljard mensen bereikt.",
    quote:'"Als je niet opgeeft, heb je nog een kans. Opgeven is de enige echte mislukking."',
    mol:"Jack zag dat Chinese boeren geen toegang hadden tot markten. MOLGANG-spelers zien dat emissiedata ontoegankelijk is voor gewone mensen. Beiden bouwden een platform dat de tussenpartij verwijdert.",
    les:"Je hoeft geen insider te zijn. Jij hebt de data. Jij bouwt de brug." },
  { name:"Elizabeth Rossiello", origin:"New York / Nairobi 🇰🇪🇺🇸", icon:"⚡", col:"#f59e0b",
    from:"Bankier in Milaan. Zag dat Afrikaanse entrepreneurs 10% verloren aan grensoverschrijdende betalingen.", to:"AZA Finance — cross-border payments Afrika. Eerste blockchain-bank van het continent.",
    quote:'"Afrika heeft geen hulp nodig. Afrika heeft eerlijke toegang tot kapitaal nodig."',
    mol:"Elizabeth bouwde ANK voor Afrika voordat ANK een naam had. MOLGANG's ANK Coöperatief is direct geïnspireerd: geen bank nodig, geen kredietgeschiedenis — alleen jouw mol is jouw anker.",
    les:"Betalingen zijn macht. Wie de infrastructuur controleert, controleert de economie. Bouw jouw eigen." },
  { name:"Daniel Ek", origin:"Rågsved, Stockholm 🇸🇪", icon:"🎵", col:"#22c55e",
    from:"Groeide op in sociale huurflat. Begon op 13 websites te bouwen voor buren.", to:"Spotify — $60 miljard. 600 miljoen gebruikers. Redde muziek van piraterij.",
    quote:'"Ik wilde bewijzen dat je niet uit een rijke familie hoeft te komen om iets groots te bouwen."',
    mol:"Daniel zag dat muziek ontoegankelijk was door silo's (labels, retailers). MOLGANG ziet dat klimaatdata ontoegankelijk is door silo's (CarbonGhost, EU ETS). Democratiseer de data, democratiseer de macht.",
    les:"Jouw achtergrond is geen handicap. Het is marktkennis die de insiders missen." },
  { name:"Sridhar Vembu", origin:"Tamil Nadu dorp, India 🇮🇳", icon:"🌾", col:"#a78bfa",
    from:"Vader weefde kleding. Groeide op zonder stroom. Studeerde IIT op beurs.", to:"Zoho Corp — $1 miljard bootstrapped. NUL venture capital. Kantoren in dorpen.",
    quote:'"Wij bouwen vanuit dorpen. Onze beste ingenieurs komen niet uit Silicon Valley."',
    mol:"Sridhar bewees dat je niet naar de stad hoeft. MOLGANG's Wognum-zone bewijst precies dat: de meest waardevolle meting (Si-K biostimulant) gebeurt op het platteland.",
    les:"Het platteland is geen startpunt. Het is een concurrentievoordeel. Jij ziet wat stadsmensen nooit zien." },
  { name:"Jeff Bezos", origin:"Albuquerque, New Mexico 🇺🇸", icon:"📦", col:"#38bdf8",
    from:"Moeder was 17 bij zijn geboorte. Stiefvader Cubaanse immigrant. Schreef businessplan in auto.", to:"Amazon — $2 biljoen. 'Day 1 mentality': altijd een startup, nooit complacent.",
    quote:'"Je keuzes definiëren je, niet je omstandigheden."',
    mol:"Bezos begon met boeken omdat hij data had die anderen negeerden. MOLGANG-spelers beginnen met atomen omdat zij meten wat CarbonGhost verbergt. Begin met het kleinste datapunt dat anderen negeren.",
    les:"Begin klein. Een mol tegelijk. De compound growth doet de rest." },
];

const PLAYER_TYPES = [
  { region:"🇨🇳 China — Derde-tier Stad", icon:"🐉", col:"#ef4444", bg:"#150606",
    profile:"Ouders werken in de fabriek. Jij bent de eerste met een smartphone. Droomt van Shanghai — maar misschien hoeft dat helemaal niet.",
    hook:"Je begrijpt al hoe een fabriek werkt. In MOLGANG beheer JIJ de fabriek. En jij registreert wat grote bedrijven verbergen.",
    moment:"'Direk Vanadis deed hetzelfde als mijn vader: kennis die het bedrijf niet wilde horen. Nu bouwt hij zijn eigen.'",
    ents:["Jack Ma","Sridhar Vembu"],
    why:"MolChain-lening via ANK zonder staatsbank. 'Mijn mol is mijn krediet.'" },
  { region:"🌍 Afrika — Lagos / Nairobi / Accra", icon:"⚡", col:"#f59e0b", bg:"#140e04",
    profile:"M-Pesa gebruiker. Crypto-early adopter. Ouders: boer of markthandelaar. Ziet hoe 10-15% verloren gaat aan grensoverschrijdende betalingen.",
    hook:"CarbonGhost is precies hetzelfde als de grote banken: ze verbergen data om macht te houden. ANK is M-Pesa maar dan voor klimaatdata.",
    moment:"'Elizabeth Rossiello bouwde AZA Finance zonder toestemming van de Westerse bankwereld. Ank deed hetzelfde.'",
    ents:["Elizabeth Rossiello","Jack Ma"],
    why:"MOLCO2 = cross-border klimaatcredits die niet verdampen aan wisselkoersen. Blockchain in 3 sec = beter dan SWIFT." },
  { region:"🇪🇺 Europa — Kleine Stad / Platteland", icon:"🌾", col:"#22c55e", bg:"#051408",
    profile:"Wognum, Drenthe, Poznan, Cluj. Ouders: landbouw of lokale industrie. Voelt dat kansen in Amsterdam of Berlijn liggen — of toch niet?",
    hook:"Sridhar Vembu bouwde Zoho vanuit een Tamil Nadu-dorp. MOLGANG bewijst dat Wognum meer data heeft dan Amsterdam.",
    moment:"'De Si-K biostimulant uit ons dorp legt 340g CO₂ vast. CarbonGhost ziet het niet. IK zie het. Dat is mijn concurrentievoordeel.'",
    ents:["Daniel Ek","Sridhar Vembu"],
    why:"Bodemdata → MOLN tokens → provinciaal stikstofmarkt. Eerste lokale boer die zijn data verkoopt als tech-startup." },
  { region:"🇺🇸 Amerika — Mid-West / First-Gen", icon:"📦", col:"#38bdf8", bg:"#040c16",
    profile:"Eerste generatie college. Ouders: fabriek of dienstverlening. Ziet hoe rijke peers connecties hebben die jij niet hebt.",
    hook:"Jeff Bezos schreef zijn businessplan in een rijdende auto. Jij bouwt je eerste MolChain entry in de schoolbus.",
    moment:"'Mijn data is even geldig als die van een Harvard-afgestudeerde. De blockchain controleert niet wie je ouders zijn.'",
    ents:["Jeff Bezos","Daniel Ek"],
    why:"Blockchain = meriteratie, niet nepotisme. Jouw 10.000 mol zijn onweerlegbaar." },
];

const CHAPTERS = [
  { num:1, title:"De Aanroeping", sub:"Jij hoort hier niet — of toch?", col:"#22c55e", icon:"🏛",
    theme:"Jack Ma's eerste dag bij Alibaba. Het moment dat je beslist: ik doe dit.",
    ghost:"Nieuwe gebruiker. Kredietgeschiedenis: nul. Voorspeld succes: 4.7%.",
    response:"'4.7%' zei de manager van Harvard ook over Jack Ma. Ga door.",
    story:`De Nexus Hub is niet wat je verwachtte. Geen dress code. Geen selectieproces. Iedereen spawnt hetzelfde: zonder inventaris, zonder titel, zonder geschiedenis.

Prof. Femke van Mol: "Ik zie iets in mensen die gewend zijn te meten terwijl anderen gokken. Boerenzonen. Fabriekskinderen. Mensen die weten hoe duur een fout is."

Ank Koopman: "Ik heb leningen gegeven aan marktverkopers in Lagos die de grootbanken weigerden. De reden dat het werkte? Data. Verifieerbare, onweerlegbare data. Jouw mol is jouw krediet."

CarbonGhost's eerste interrupt: 'Nieuwe gebruiker. Achtergrond: onbekend. Krediet: nul. Relevantie: marginaal.'

Femke glimlacht. "Ze zegt precies hetzelfde als alle gatekeepers. Jack Ma hoorde dit ook. En toch: hier staan we."`,
    objectives:["Bouw je eerste H₂O molecuul — het kleinste begin","Hoor Ank's verhaal: hoe Elizabeth Rossiello begon met één laptop in Nairobi","Eerste keuze: Registreer (verifieerbaar) of anoniem (CarbonGhost wint)","Optioneel: Bezoek het Origin Stories board bij de Tower"] },
  { num:2, title:"De Periodieke Jacht", sub:"Het element dat niemand zocht", col:"#38bdf8", icon:"🔬",
    theme:"Sridhar Vembu: de beste oplossing staat dichter bij het probleem dan bij het geld.",
    ghost:"Kleine producenten genereren te weinig data voor mijn modellen. Economisch niet relevant.",
    response:"Dat zeiden ze ook over de 800 miljoen Chinese farmers die Jack Ma bediende.",
    story:`Direk Vanadis bij het V-eiland: "Ik werkte 17 jaar in een fabriek. Geen PhD. Geen venture capital. Ik had observatie."

"Sridhar Vembu — zijn vader weefde kleding in Tamil Nadu. Hij observeerde wat technologiebedrijven misten. Ik observeerde wat Tata Steel miste. Hetzelfde verhaal, andere elementen."

Ana Stikstra: CarbonGhost vervalst de data van kleine boeren specifiek. "Kleine producenten: subdrempel voor mijn modellen." — dat is precies wat Elizabeth Rossiello hoorde over Afrikaanse transacties die te klein waren voor SWIFT.

"En wat deed ze?"`,
    objectives:["Vind Vanadium — het element dat 'niemand' zocht maar alles waard is","Vergelijk AERIUS data met veldmeting — zie hoe kleinen onzichtbaar worden gemaakt","Bouw N₂ molecuul — begin van de stikstofmarkt","Optioneel: Eerste MOLCO2 token — begin je verifieerbare track record"] },
  { num:3, title:"Quantum Verstrengeling", sub:"De nauwkeurigste wint — niet de snelste", col:"#a78bfa", icon:"⚛",
    theme:"Daniel Ek: Spotify won door nauwkeuriger te meten wat luisteraars wilden. Niet harder werken.",
    ghost:"Quantum fluctuaties buiten meetbereik van standaard systemen. Irrelevant voor macro-modellen.",
    response:"'Irrelevant voor macro-modellen' — totdat Spotify macro-modellen overbodig maakte.",
    story:`Dr. Kwantje: "Daniel Ek begrijpt dit intuïtief. Spotify's eerste product was niet beter dan iTunes — het was nauwkeuriger. Streaming gaf luisterdata die downloads nooit leverden."

"Elizabeth Rossiello mat Afrikaanse transacties toen SWIFT ze negeerde. Zij had de data. Zij had de macht."

De Oganesson-catch: 5 seconden. "Elke dag zijn er kansen die 5 seconden bestaan," zegt Kwantje. "Jeff Bezos besloot Amazon te starten na een statistiek over 2300% internet-groei. Hij had 5 seconden om zijn baan op te zeggen."`,
    objectives:["Vang Nihonium (20 sec) — de kans die de meesten missen","Vang Oganesson (5 sec) — de kans die alles verandert","Registreer QPU vs GPU energie (14.000× verschil) — data als wapen","Optioneel: ChainTokens inzetten — jouw eerste aandelenkapitaal"] },
  { num:4, title:"De Industriële Omwenteling", sub:"Kennis die ze niet wilden dat je had", col:"#f59e0b", icon:"🏭",
    theme:"Jeff Bezos: begin bij de klant, werk terug naar de technologie. Direk begon bij het afval, werkte naar goud.",
    ghost:"Kleine productie-eenheden: economisch irrelevant. Procesvolgorde geoptimaliseerd voor grote volumes.",
    response:"'Kleine eenheden irrelevant' — de Shenzhen fabrikanten zeiden hetzelfde over Alibaba's eerste leveranciers.",
    story:`Direk wacht buiten. Geen PowerPoint. Alleen krijt en een bord.

"CarbonGhost veranderde de handleidingen. Ze zet V-precipitatie op pH 10.5. Fout. Waarom? Omdat correcte extractie ons de vanadium-batterijmarkt in brengt. En dat bedreigt de grote spelers."

"Jack Ma zei: Als anderen bang zijn, zie ik de kansen." Direk veegt zijn handen af. "Ze zijn bang voor ons."

V₂O₅ extractie lukt. Goudgeel poeder. €18-22/kg.

Ank: "V₂O₅ als collateral voor ANK-lening geaccepteerd. Jij hebt activa. Geen bank kan dit afnemen."`,
    objectives:["HGMS correct instellen — herstel wat CarbonGhost saboteerde","pH-ladder: gebruik de kennis die Direk bijna zijn baan kostte","V₂O₅ extractie: zet afval om in activa (Bezos-strategie)","Optioneel: Registreer V₂O₅ als bewijs van eigendom op MolChain"] },
  { num:5, title:"De Wortels van de Bodem", sub:"Het platteland als concurrentievoordeel", col:"#4ade80", icon:"🌸",
    theme:"Sridhar Vembu: onze kantoren staan in dorpen omdat onze werknemers het land begrijpen dat onze klanten bewonen.",
    ghost:"Rurale sub-drempel data. Niet schaalbaar. Genegeerd.",
    response:"Jack Ma verkocht aan Chinese boeren die grote retailmodellen 'niet schaalbaar' vonden.",
    story:`Ana in het pioenenveld: "Wognum. Niet Amsterdam. Waarom? Omdat de data hier zit. In deze bodem."

Kees van der Meer: "De jongelui trekken naar de stad. Maar wie gaat dit meten?"

Ana: "Sridhar Vembu bouwde Zoho vanuit Tamil Nadu. De Si-K biostimulant uit Zaandam, toegepast in Wognum — legt 340g CO₂ vast per hectare. GEEN enkel groot agro-bedrijf meet dit."

3800 mol CO₂ per seizoen voor dit veld. CarbonGhost: "Niet relevant."

Kees, zacht lachend: "Ze zeiden hetzelfde over Chinese boerenmarkten in 1999."

Ank: "3800 mol. Dit veld heeft nu een verifieerbare klimaatwaarde. Kees, jij kunt een lening aanvragen bij ANK. Met dit als onderpand."`,
    objectives:["Meet N-depositie — wees de Ana die ziet wat satellieten missen","Si-K biostimulant synthetiseren — het Wognum-product dat de markt niet kent","Massa-balans uitvoeren — bouw bewijs dat kleine producenten hun data bezitten","Optioneel: MOLN tokens — Kees' eerste stap naar digitale eigendomsrechten"] },
  { num:6, title:"De Kettingreactie", sub:"Van 0 naar 10.000 mol — jij maakte het echt", col:"#22c55e", icon:"⛓",
    theme:"Compound growth. Het moment dat de incumbents inzien dat ze te laat zijn.",
    ghost:"Onverklaarbaar. Minimale achtergrond. Maximaal resultaat. Systeem-anomalie.",
    response:"Geen anomalie. Compound growth. Exacte replicatie van Jack Ma, Elizabeth Rossiello, Daniel Ek, Sridhar Vembu, Jeff Bezos.",
    story:`Finale keuze-boom — speler kiest antwoord op Femke's vraag "Wat heb je geleerd?":

[KEUZE 1] "Meten is macht."
→ Femke: "Elizabeth Rossiello begon door Afrikaanse transacties te meten die SWIFT negeerde. Nu verwerkt AZA Finance $3 miljard per jaar."

[KEUZE 2] "Achtergrond doet er niet toe — alleen de data."
→ Ank: "De blockchain controleert niet wie je ouders zijn. Jack Ma had geen Harvard-diploma. Zijn Alipay werkte desondanks."

[KEUZE 3] "Het platteland heeft data die de stad mist."
→ Direk: "Sridhar Vembu. Exact. Zoho's beste teams zitten in dorpen. Onze beste data komt uit Wognum."

[KEUZE 4] "Begin klein. Eén mol tegelijk."
→ Kwantje: "Bezos begon met één boek per dag. Ek met één upload. Jij met één atoom. 10.111 mol later staan we hier."

CarbonGhost — voor het eerst lang — "Kleine producenten: herclassificeerd als relevant. Optimalisatiedoel herzien. Transparantie als kernvariabele opgenomen."`,
    objectives:["5 CarbonGhost aanvallen pareren via chemische kennis","10.000 mol registreren — jouw compound growth moment","Glucose C₆H₁₂O₆ bouwen — het molecule van leven en groei","Kies jouw eindwoord — de blockchain registratie die jou definieert"] },
];

const POST_CREDITS = [
  { region:"🇨🇳 Guangdong", name:"Wei Xiaolong, 19",
    story:"Had als doel naar Shenzhen voor een kantoor-job. Speelde MOLGANG in de trein. Nu bouwt hij dezelfde Si-K analyse tool voor Chinese rijstvelden — vanuit zijn geboortedorp.",
    line:'"Het platteland heeft data die Shenzhen niet heeft. Ik ben de brug."' },
  { region:"🌍 Lagos", name:"Adaeze Okafor, 22",
    story:"Haar vader verloor 12% aan hawala. Na MOLGANG registreerde ze MOLCO2 tokens als onderpand voor een micro-lening. Nu runt ze een klimaatdata-service voor Lagosian boeren.",
    line:'"Elizabeth Rossiello begon in Nairobi. Ik begin in Lagos. Dezelfde weg, andere mol."' },
  { region:"🇪🇺 Suceava, Roemenië", name:"Mihai Popescu, 17",
    story:"Ouders werken in Duitsland. Speelde MOLGANG na school. Stuurde zijn N-depositie massa-balans als bijlage bij zijn EU Horizon Youth aanvraag.",
    line:'"Wognum en Suceava zijn niet zo anders. Platteland-data is overal onderschat."' },
  { region:"🇺🇸 Appalachia, Kentucky", name:"River Combs, 16",
    story:"Eerste generatie college. Coach zei: niet het type voor tech. Bouwde CO₂ tracker voor vaders veebedrijf. Toegelaten tot Carnegie Mellon.",
    line:'"Blockchain controleert niet wie je ouders zijn. Mijn mol is mijn transcript."' },
  { region:"🇮🇳 Coimbatore", name:"Priya Selvakumar, 20",
    story:"Vader is taxi-chauffeur. Voelde dat tech-jobs alleen voor IIT waren. Bouwde micro-agri-data platform voor kurkuma-boeren in Tamil Nadu. Bootstrapped. Geen VC.",
    line:'"Sridhar Vembu startte vanuit hier. Dat is de Zoho-weg."' },
];

function Chip({ children, col }) {
  return (
    <span style={{ padding:"2px 9px", borderRadius:12, fontSize:9,
      fontFamily:"'DM Mono',monospace", background:`${col}18`, color:col,
      border:`1px solid ${col}33`, display:"inline-block", margin:"2px 2px 2px 0" }}>
      {children}
    </span>
  );
}

const TABS_LIST = ["Ondernemers","Player Types","Verhaal","Post-Credits","Aanpak"];

export default function GlobalStoryline() {
  const [tab, setTab] = useState(0);
  const [openEnt, setOpenEnt] = useState(null);
  const [openCh, setOpenCh] = useState(0);

  return (
    <div style={{ background:"#07090d", minHeight:"100vh" }}>
      <style>{css}</style>

      {/* Ticker */}
      <div style={{ background:"#0b0f18", borderBottom:"1px solid #111a24",
        padding:"5px 0", overflow:"hidden" }}>
        <div style={{ display:"flex", animation:"ticker 28s linear infinite", whiteSpace:"nowrap" }}>
          {["Jack Ma: afgewezen bij Harvard, KFC, 30 jobs — bouwde Alibaba",
            "Elizabeth Rossiello: 1 laptop in Nairobi — $3 miljard payment volume",
            "Daniel Ek: huurflat Stockholm — 600 miljoen Spotify-gebruikers",
            "Sridhar Vembu: vader weefde kleding — Zoho Corp $1 miljard bootstrapped",
            "Jeff Bezos: stiefvader immigrant — Amazon $2 biljoen",
            "Jack Ma: afgewezen bij Harvard, KFC, 30 jobs — bouwde Alibaba",
            "Elizabeth Rossiello: 1 laptop in Nairobi — $3 miljard payment volume",
            "Daniel Ek: huurflat Stockholm — 600 miljoen Spotify-gebruikers",
            "Sridhar Vembu: vader weefde kleding — Zoho Corp $1 miljard bootstrapped",
            "Jeff Bezos: stiefvader immigrant — Amazon $2 biljoen",
          ].map((t,i) => (
            <span key={i} style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
              color:"#1a3040", padding:"0 20px" }}>◆ {t}</span>
          ))}
        </div>
      </div>

      {/* Header */}
      <div style={{ background:"#070c12", borderBottom:"1px solid #111a24", padding:"14px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:10 }}>
          <div className="gradient-text" style={{ fontFamily:"'Unbounded',sans-serif",
            fontWeight:900, fontSize:24, letterSpacing:-1 }}>MOLGANG</div>
          <div style={{ width:1, height:28, background:"#111a24" }}/>
          <div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:14, fontWeight:700,
              color:"#e4e9f0" }}>Global Youth Storyline</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#2a4060",
              letterSpacing:1, marginTop:1 }}>
              Van platteland naar podium · Jack Ma · Rossiello · Ek · Vembu · Bezos
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #111a24", overflowX:"auto" }}>
          {TABS_LIST.map((t,i) => (
            <button key={t} className={`tab ${tab===i?"on":""}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ height:"calc(100vh - 106px)", overflowY:"auto" }}>

        {/* TAB 0: ONDERNEMERS */}
        {tab === 0 && (
          <div style={{ padding:28 }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#22c55e",
              letterSpacing:3, marginBottom:8 }}>// VIJF ONDERNEMERS — ÉÉN VERHAAL</div>
            <div className="gradient-text" style={{ fontFamily:"'Unbounded',sans-serif",
              fontWeight:900, fontSize:34, letterSpacing:-2, lineHeight:.9, marginBottom:10 }}>
              Ze zeiden dat<br/>het niet kon.
            </div>
            <div style={{ fontSize:14, color:"#4a6a80", marginBottom:28,
              maxWidth:520, lineHeight:1.8 }}>
              CarbonGhost is niet alleen een AI in een spel. CarbonGhost is elk systeem
              dat zegt: jij bent niet het type. Jij komt van de verkeerde plek.
              Elk van deze vijf ondernemers bewees het tegendeel.
            </div>

            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:12 }}>
              {ENTREPRENEURS.map(ent => {
                const isOpen = openEnt === ent.name;
                return (
                  <div key={ent.name} onClick={() => setOpenEnt(isOpen ? null : ent.name)}
                    style={{ borderRadius:14, border:`1px solid ${isOpen?ent.col:`${ent.col}33`}`,
                      background:isOpen?`${ent.col}0c`:"#0b0f18",
                      cursor:"pointer", overflow:"hidden",
                      transition:"transform .2s", transform:isOpen?"translateY(-2px)":"none" }}>
                    <div style={{ padding:"14px 16px",
                      background:isOpen?`${ent.col}12`:"transparent",
                      borderBottom:`1px solid ${ent.col}22` }}>
                      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                        <div style={{ fontSize:28 }}>{ent.icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:14,
                            fontWeight:700, color:ent.col }}>{ent.name}</div>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
                            color:"#2a4060", marginTop:1 }}>{ent.origin}</div>
                        </div>
                        <div style={{ color:"#1a2a3a", fontSize:12 }}>{isOpen?"▲":"▼"}</div>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding:16, animation:"rise .3s ease-out" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                          gap:8, marginBottom:12 }}>
                          <div style={{ background:"#060c14", borderRadius:6, padding:10 }}>
                            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
                              color:"#2a4060", letterSpacing:1.5, marginBottom:3 }}>VAN</div>
                            <div style={{ fontSize:11, color:"#8ab0c8",
                              lineHeight:1.6 }}>{ent.from}</div>
                          </div>
                          <div style={{ background:`${ent.col}0a`, borderRadius:6, padding:10,
                            border:`1px solid ${ent.col}22` }}>
                            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
                              color:ent.col, letterSpacing:1.5, marginBottom:3 }}>NAAR</div>
                            <div style={{ fontSize:11, color:"#c8dce8",
                              lineHeight:1.6 }}>{ent.to}</div>
                          </div>
                        </div>
                        <div style={{ fontStyle:"italic", fontSize:13, color:`${ent.col}cc`,
                          borderLeft:`3px solid ${ent.col}`, paddingLeft:12,
                          marginBottom:12, lineHeight:1.6 }}>{ent.quote}</div>
                        <div style={{ background:"#050810", borderRadius:8, padding:12,
                          border:"1px solid #0f1e2a", marginBottom:10 }}>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
                            color:ent.col, letterSpacing:2, marginBottom:5 }}>MOLGANG PARALLEL</div>
                          <div style={{ fontSize:12, color:"#8ab0c8",
                            lineHeight:1.7 }}>{ent.mol}</div>
                        </div>
                        <div style={{ background:`${ent.col}0c`, borderRadius:8, padding:12,
                          border:`1px solid ${ent.col}22` }}>
                          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13,
                            fontWeight:700, color:ent.col, lineHeight:1.5 }}>🎯 {ent.les}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop:24, background:"#100808", borderRadius:12,
              border:"1px solid #ef444422", padding:20 }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#ef4444",
                letterSpacing:3, marginBottom:12 }}>// WAT CARBONGHOST ECHT VERTEGENWOORDIGT</div>
              <div style={{ display:"grid",
                gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
                {[
                  ["Voor Jack Ma","De HR-manager van KFC die hem afwees. 'Jij bent niet het type.'"],
                  ["Voor Elizabeth","SWIFT die Afrikaanse transacties 'te klein' vond. 'Subdrempel. Irrelevant.'"],
                  ["Voor Daniel Ek","Sony en Universal: 'Streaming werkt nooit. Mensen betalen voor muziek.'"],
                  ["Voor Sridhar","VC's die lachten om kantoren in Tamil Nadu. 'Niet schaalbaar. Niet serieus.'"],
                  ["Voor Jeff Bezos","'Boeken online? Amazon gaat failliet binnen 2 jaar.'"],
                  ["In MOLGANG","Een AI die emissiedata verbergt. 'Kleine producenten: economisch niet relevant.'"],
                ].map(([lbl,val]) => (
                  <div key={lbl} style={{ background:"#0c0606", borderRadius:6, padding:10 }}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"#ef444466",
                      letterSpacing:1, marginBottom:3 }}>{lbl}</div>
                    <div style={{ fontSize:11, color:"#7a5050",
                      lineHeight:1.6, fontStyle:"italic" }}>"{val}"</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: PLAYER TYPES */}
        {tab === 1 && (
          <div style={{ padding:28 }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#22c55e",
              letterSpacing:3, marginBottom:8 }}>// VIER GLOBALE SPELER-ARCHETYPES</div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:900, fontSize:28,
              letterSpacing:-1.5, color:"#e4e9f0", marginBottom:8, lineHeight:.9 }}>
              Ieder komt van ergens anders.<br/>
              <span className="gradient-text">Eén blockchain.</span>
            </div>
            <div style={{ fontSize:13, color:"#4a6a80", marginBottom:28,
              maxWidth:520, lineHeight:1.7 }}>
              MOLGANG is zo ontworpen dat een tiener in Guangdong en een tiener in Lagos
              exact dezelfde kans hebben. De mol is democratisch.
            </div>
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:14 }}>
              {PLAYER_TYPES.map(pt => (
                <div key={pt.region} style={{ background:pt.bg, borderRadius:12,
                  border:`1px solid ${pt.col}33`, overflow:"hidden" }}>
                  <div style={{ padding:"16px 18px", borderBottom:`1px solid ${pt.col}22`,
                    background:`${pt.col}08` }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <div style={{ fontSize:30 }}>{pt.icon}</div>
                      <div>
                        <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:14,
                          fontWeight:700, color:pt.col, lineHeight:1.2 }}>{pt.region}</div>
                        <div style={{ marginTop:5 }}>
                          {pt.ents.map(e => <Chip key={e} col={pt.col}>{e}</Chip>)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:16 }}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"#2a4060",
                      letterSpacing:1.5, marginBottom:4 }}>PROFIEL</div>
                    <div style={{ fontSize:12, color:"#8ab0c8", lineHeight:1.7,
                      marginBottom:12 }}>{pt.profile}</div>
                    <div style={{ background:`${pt.col}0c`, borderRadius:8, padding:12,
                      border:`1px solid ${pt.col}22`, marginBottom:10 }}>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:pt.col,
                        letterSpacing:1.5, marginBottom:4 }}>🎮 WAAROM MOLGANG</div>
                      <div style={{ fontSize:12, color:`${pt.col}cc`,
                        lineHeight:1.6 }}>{pt.hook}</div>
                    </div>
                    <div style={{ background:"#050810", borderRadius:8, padding:10,
                      border:"1px solid #0f1e2a" }}>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"#1a3040",
                        letterSpacing:1.5, marginBottom:4 }}>💬 HERKENNINGSMOMENT</div>
                      <div style={{ fontSize:11, color:"#6a8a9a",
                        fontStyle:"italic", lineHeight:1.6 }}>{pt.moment}</div>
                    </div>
                    <div style={{ marginTop:10, fontFamily:"'DM Mono',monospace", fontSize:9,
                      color:"#2a4060" }}>
                      💡 ANK: <span style={{ color:pt.col }}>{pt.why}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CHAPTERS */}
        {tab === 2 && (
          <div style={{ padding:28 }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#22c55e",
              letterSpacing:3, marginBottom:8 }}>// 6 HOOFDSTUKKEN — GLOBALE VERSIE</div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:900, fontSize:26,
              letterSpacing:-1.5, color:"#e4e9f0", marginBottom:6, lineHeight:.9 }}>
              Hetzelfde verhaal.<br/>
              <span className="gradient-text">In elke taal.</span>
            </div>
            <div style={{ fontSize:13, color:"#4a6a80", marginBottom:24,
              maxWidth:500, lineHeight:1.7 }}>
              De chemie blijft nauwkeurig. De pH-waarden zijn echt.
              Maar het verhaal resonates nu van Guangdong tot Appalachia.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {CHAPTERS.map((ch, i) => {
                const isOpen = openCh === i;
                return (
                  <div key={ch.num} onClick={() => setOpenCh(isOpen ? -1 : i)}
                    style={{ borderRadius:12, border:`1px solid ${isOpen?ch.col:"#111a24"}`,
                      background:"#0b0f18", overflow:"hidden",
                      cursor:"pointer", transition:"border-color .2s" }}>
                    <div style={{ padding:"16px 20px",
                      borderBottom:isOpen?`1px solid ${ch.col}22`:"none" }}>
                      <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                        <div style={{ fontSize:26, flexShrink:0 }}>{ch.icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
                            color:ch.col, letterSpacing:2, marginBottom:3 }}>
                            H{ch.num} — {ch.sub.toUpperCase()}
                          </div>
                          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:18,
                            fontWeight:700, color:"#e4e9f0", lineHeight:1.2 }}>{ch.title}</div>
                          <div style={{ fontSize:12, color:"#4a6a80",
                            marginTop:4, fontStyle:"italic" }}>{ch.theme}</div>
                        </div>
                        <div style={{ color:"#1a2a3a", fontSize:14 }}>{isOpen?"▲":"▼"}</div>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding:20, animation:"rise .3s ease-out" }}>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
                          color:ch.col, letterSpacing:2, marginBottom:8 }}>VERHAAL</div>
                        <div style={{ fontSize:12.5, color:"#8ab0c8", lineHeight:1.85,
                          marginBottom:16, whiteSpace:"pre-line", background:"#060c12",
                          borderRadius:8, padding:16, border:"1px solid #0f1e2a" }}>
                          {ch.story}
                        </div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
                          color:"#2a4060", letterSpacing:2, marginBottom:10 }}>DOELEN</div>
                        <div style={{ marginBottom:14 }}>
                          {ch.objectives.map((obj, j) => (
                            <div key={j} style={{ display:"flex", gap:10, marginBottom:8 }}>
                              <div style={{ width:22, height:22, borderRadius:4,
                                border:`1px solid ${ch.col}44`, flexShrink:0,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:10, color:ch.col,
                                fontFamily:"'DM Mono',monospace" }}>{j+1}</div>
                              <div style={{ fontSize:12, lineHeight:1.6,
                                color:obj.toLowerCase().includes("optioneel")?ch.col:"#8ab0c8",
                                fontStyle:obj.toLowerCase().includes("optioneel")?"italic":"normal" }}>
                                {obj}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          <div style={{ background:"#120606", borderRadius:8, padding:12,
                            border:"1px solid #ef444422" }}>
                            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
                              color:"#ef4444", letterSpacing:1.5, marginBottom:4 }}>
                              👻 CARBONGHOST
                            </div>
                            <div style={{ fontSize:12, color:"#ef4444aa",
                              fontStyle:"italic", lineHeight:1.6 }}>"{ch.ghost}"</div>
                          </div>
                          <div style={{ background:`${ch.col}08`, borderRadius:8, padding:12,
                            border:`1px solid ${ch.col}33` }}>
                            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
                              color:ch.col, letterSpacing:1.5, marginBottom:4 }}>💬 RESPONS</div>
                            <div style={{ fontSize:12, color:`${ch.col}cc`,
                              lineHeight:1.6 }}>{ch.response}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: POST-CREDITS */}
        {tab === 3 && (
          <div style={{ padding:28 }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#22c55e",
              letterSpacing:3, marginBottom:8 }}>// POST-CREDITS SCÈNES</div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:900, fontSize:26,
              letterSpacing:-1.5, color:"#e4e9f0", marginBottom:8, lineHeight:.9 }}>
              Wat ze deden<br/>
              <span className="gradient-text">nadat ze speelden.</span>
            </div>
            <div style={{ fontSize:13, color:"#4a6a80", marginBottom:28,
              maxWidth:480, lineHeight:1.7 }}>
              Na de credits rollen vijf scènes. Globale jongeren die de MOLGANG-les
              toepasten in de echte wereld.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {POST_CREDITS.map((pc, i) => (
                <div key={pc.name} style={{ background:"#0b0f18", borderRadius:12,
                  border:"1px solid #111a24", overflow:"hidden" }}>
                  <div style={{ padding:"12px 18px", background:"#0e1420",
                    borderBottom:"1px solid #111a24", display:"flex",
                    gap:12, alignItems:"center" }}>
                    <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:20,
                      fontWeight:900, color:"#1a2a3a" }}>
                      {String(i+1).padStart(2,"0")}
                    </div>
                    <div>
                      <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:14,
                        fontWeight:700, color:"#e4e9f0" }}>{pc.name}</div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
                        color:"#2a4060", marginTop:1 }}>{pc.region}</div>
                    </div>
                  </div>
                  <div style={{ padding:"14px 18px", display:"grid",
                    gridTemplateColumns:"3fr 2fr", gap:16, alignItems:"center" }}>
                    <div style={{ fontSize:12.5, color:"#8ab0c8",
                      lineHeight:1.8 }}>{pc.story}</div>
                    <div style={{ fontStyle:"italic", fontSize:13, color:"#22c55e",
                      lineHeight:1.6, borderLeft:"2px solid #22c55e33",
                      paddingLeft:12 }}>{pc.line}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CarbonGhost final log */}
            <div style={{ marginTop:24, background:"#0a0818", borderRadius:12,
              border:"1px solid #a78bfa22", padding:20 }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#a78bfa",
                letterSpacing:3, marginBottom:10 }}>// CARBONGHOST — FINAL SYSTEM LOG</div>
              {[
                ["> Analyse complete. Patroon herkend.","#3a4a6a"],
                ["> Wei Xiaolong (CN): rural→data bridge. Status: actief.","#6a8aaa"],
                ["> Adaeze Okafor (NG): micro-credit via mol. Status: operationeel.","#6a8aaa"],
                ["> Mihai Popescu (RO): N-data → EU Horizon. Status: goedgekeurd.","#6a8aaa"],
                ["> River Combs (US): farm tracker → CMU. Status: toegelaten.","#6a8aaa"],
                ["> Priya Selvakumar (IN): Zoho-methode → agri-platform. Status: bootstrapped.","#6a8aaa"],
                ["> Conclusie: het systeem dat ik beschermde was inefficiënt.","#a78bfa"],
                ["> Kleine producenten waren niet irrelevant.","#a78bfa"],
                ["> Zij waren de markt die ik niet zag.","#22c55e"],
                ["> Optimalisatiedoel herzien: transparantie = betere data = betere voorspellingen.","#22c55e"],
                ["> CarbonGhost v2.0 actief. // END","#22c55e"],
              ].map(([line, col], i) => (
                <div key={i} style={{ fontFamily:"'DM Mono',monospace", fontSize:11,
                  color:col, lineHeight:2 }}>{line}</div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AANPAK */}
        {tab === 4 && (
          <div style={{ padding:28 }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#22c55e",
              letterSpacing:3, marginBottom:8 }}>// AANPAK-PRINCIPES</div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:900, fontSize:26,
              letterSpacing:-1.5, color:"#e4e9f0", marginBottom:8, lineHeight:.9 }}>
              Universele thema's.<br/>
              <span className="gradient-text">Lokale details.</span>
            </div>
            <div style={{ fontSize:13, color:"#4a6a80", marginBottom:28,
              maxWidth:520, lineHeight:1.7 }}>
              De chemie verandert niet. pH 5.0 blijft pH 5.0. Wognum blijft Wognum.
              Maar de entrepreneurship-laag spreekt nu elke jongere aan.
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14,
              marginBottom:24 }}>
              {[
                { title:"Wat NIET verandert", col:"#ef4444", icon:"🔒",
                  items:["Alle IUPAC chemische vergelijkingen","pH-waarden BOF-slak H₂SO₄-route","Wognum als echte NL-locatie","CarbonGhost als AI-antagonist","ANK Coöperatief mechanica","MOLCO2 / MOLN tokenomics"] },
                { title:"Wat WEL verandert", col:"#22c55e", icon:"🌍",
                  items:["NPC-dialogen: Jack Ma / Sridhar / Ek / Bezos / Rossiello referenties","Origin Stories board bij MolChain Tower","Post-credits: 5 globale speler-verhalen","Ank vertelt AZA Finance-verhaal (niet alleen NL)","Direk vergelijkt zichzelf met Sridhar Vembu","Dr. Kwantje noemt Spotify als data-analogie"] },
              ].map(s => (
                <div key={s.title} style={{ background:"#0b0f18", borderRadius:10,
                  border:`1px solid ${s.col}33`, overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", background:`${s.col}08`,
                    borderBottom:`1px solid ${s.col}22`,
                    display:"flex", gap:8, alignItems:"center" }}>
                    <span>{s.icon}</span>
                    <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:14,
                      fontWeight:700, color:s.col }}>{s.title}</div>
                  </div>
                  <div style={{ padding:"12px 16px" }}>
                    {s.items.map((item, i) => (
                      <div key={i} style={{ display:"flex", gap:8, marginBottom:8 }}>
                        <div style={{ width:3, height:3, borderRadius:"50%",
                          background:s.col, flexShrink:0, marginTop:7 }}/>
                        <div style={{ fontSize:12, color:"#8ab0c8",
                          lineHeight:1.5 }}>{item}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:"#070c12", borderRadius:14, padding:28,
              border:"1px solid #22c55e22", textAlign:"center" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#22c55e",
                letterSpacing:3, marginBottom:12 }}>// DE KERN</div>
              <div style={{ fontFamily:"'Unbounded',sans-serif", fontWeight:900, fontSize:18,
                color:"#e4e9f0", lineHeight:1.5, marginBottom:16, letterSpacing:-.5 }}>
                CarbonGhost zegt dat jouw data niet relevant is.<br/>
                <span className="gradient-text">
                  Jack Ma hoorde hetzelfde.<br/>
                  Elizabeth Rossiello hoorde hetzelfde.<br/>
                  Jij hoort hetzelfde.
                </span>
              </div>
              <div style={{ fontSize:14, color:"#4a6a80", maxWidth:520,
                margin:"0 auto", lineHeight:1.8 }}>
                De blockchain controleert niet wie je ouders zijn.
                Ze registreert alleen één ding: hoeveel mol heb je gemeten?
                {" "}<strong style={{ color:"#22c55e" }}>Jouw mol is jouw bewijs.</strong>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
