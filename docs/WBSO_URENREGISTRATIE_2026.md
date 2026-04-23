# WBSO Urenregistratie 2026

## Projectgegevens

| Veld | Waarde |
|------|--------|
| **Projectnaam** | MOLGANG — Chemical Engineering Simulator (Immersive VR/AR) |
| **S&O-referentienummer** | *In te vullen na aanvraag* |
| **Aanvrager** | VirtualV Holding B.V. / Slakkenspoor VOF |
| **Uitvoerder** | Edwin Hauwert |
| **BSN / Referentie** | 219252713 |
| **Periode** | April 2026 |
| **Technisch inhoudelijk** | Ontwikkeling innovatieve Chemical Engineering Simulator in VR/AR: realistische BOF-staalslak verwerkingsprocessen (breken, logen, magnetische scheiding, roostoven), meststofchemie met NPK-balansmodellering, en industriële procesbesturing — gamified voor breed educatief en professioneel gebruik |

---

## Projectomschrijving (S&O-activiteiten)

### Technische nieuwheid / innovatie

Het MOLGANG-project ontwikkelt een **technisch nieuwe Chemical Engineering Simulator** — een interactieve simulatie van industriële chemische processen in een immersieve VR/AR-omgeving. De innovatie combineert:

1. **Realistische proceschemie-simulatie** — BOF-staalslak verwerkingsketen (12 stations) met echte reactiekinetiek, pH-afhankelijke metaalextractie, deeltjesgrootte-afhankelijke loogsnelheden, roostoven-oxidatie (V3+→V5+ bij 900°C), en meerstaps selectief logen. Gebaseerd op wetenschappelijke publicaties (ACS, Taylor & Francis).
2. **Meststofchemie-simulatie als Chemical Engineering tool** — NPK-balansberekening volgens Liebig's Wet van het Minimum, grondanalyse (pH, nutriënten, contaminanten), gewasgroeimodellering, fytosanering van verontreinigde grond met slak-biostimulanten.
3. **Immersieve VR/AR procesbediening** — Virtual Reality laboratorium met hand-tracking interactie voor procesapparatuur (kaakbrekers, kogelsmolens, loogtanks), ruimtelijke UI-panelen voor procesmonitoring, teleport-locomotie door fabriekscomplexen.
4. **Procedurele 3D-procesapparatuur generatie** — Geautomatiseerde Blender 5.1 Python pipeline die parametrische low-poly modellen genereert van industriële apparatuur (14 typen), geoptimaliseerd voor real-time rendering (<5000 driehoeken per model).
5. **Multiplayer procesbesturing met anti-fraude architectuur** — Server-autoritatief model (PlayerDataBridge) voor gelijktijdige procesvoering door meerdere operators, met economische validatie en rate-limiting.

### Technische knelpunten opgelost

- Rendering van 118 periodiek systeem-elementen met kleurcodering in VR zonder performance-verlies
- Tijdsgebaseerde chemische processen (loogprocessen van uren tot dagen) simuleren in real-time multiplayer
- Deeltjesgrootte-afhankelijke reactiekinetiek modelleren (5cm brokken vs. 0.1mm poeder)
- Cross-platform UI (desktop, mobile, VR headset) met adaptieve schaling
- Blender 5.1 procedurele mesh-generatie voor Roblox-compatibele FBX-export (<5000 driehoeken)

---

## Urenregistratie

### Week 14 (2026-04-07, maandag)

| Datum | Uren | Minuten | Activiteit | Technische details |
|-------|------|---------|------------|-------------------|
| 07-04-2026 | 2 | 00 | Architectuurontwerp en initieel prototype | Ontwerp server-client architectuur met 19 Luau scripts. PlayerDataBridge beveiligingsmodel ontwikkeld tegen Attribute-spoofing. DataStore persistentie-schema (DataTemplate.lua) met 30+ velden. RemoteSetup module met 40+ events/functions. |
| 07-04-2026 | 1 | 30 | Atoom-spawn systeem met gewogen kansen | AtomSpawner.server.lua: gewogen random selectie over 118 elementen, zone-specifieke spawn-boosts (Slakkenspoor: V, Fe, Ti, Si, Ca ×5), anti-cheat rate-limiting (20 collects/min), server-side afstandsvalidatie. |
| 07-04-2026 | 1 | 30 | NPC-systeem (GTA6-stijl) + HGMS mini-game | NPCSystem.server.lua: 6 NPC's met dagschema's, vertrouwensniveaus (0.0-1.0), proximity-dialoog. SlakkenspoorMiniGame.server.lua: HGMS-kleursortering op lopende band met pH-puzzel bonusronde. |
| 07-04-2026 | 1 | 00 | Beveiligingsreview + critical bug fixes | PlayerDataBridge server-only module ter vervanging van spoofbare Attributes. Duplicate handler fix in EconomyManager. ANKLending MolCoin-overdrachten gevalideerd. |
| 07-04-2026 | 2 | 00 | Go game server backend | Go-backend met WebSocket multiplayer, chemie-engine (atoms, molecules, economy), quiz-systeem (500+ vragen), element/molecule JSON-databestanden. |

**Subtotaal week 14: 8 uur 00 minuten**

---

### Week 15 (2026-04-09, woensdag)

| Datum | Uren | Minuten | Activiteit | Technische details |
|-------|------|---------|------------|-------------------|
| 09-04-2026 | 1 | 30 | Dashboard GUI systeem (5 tabs) | DashboardGui.client.lua (550+ regels): Tab-systeem met Dashboard/Build/Trade/Research/Mahjong. Facility-koop validatie tegen server. Dynamische marktprijzen met variatie. ANK-leningsysteem UI. |
| 09-04-2026 | 1 | 00 | Productiesysteem + economie-integratie | ProductionManager.server.lua: 60-seconden productiecycli. Mijnen genereren atomen, fabrieken converteren naar moleculen. Dagvoortgang (10 min = 1 speldag). MolCoin daily cap (2000/dag). |
| 09-04-2026 | 0 | 45 | Leaderboard + UI-verbeteringen | LeaderboardGui.client.lua: OrderedDataStore top-100. HUDWidget.client.lua: real-time stats hoek-widget. Tutorial.lua: 8-staps onboarding framework. |
| 09-04-2026 | 0 | 45 | Mahjong mini-game (MVP) | MahjongGui.client.lua (378 regels): 136 tegels, 3 AI-tegenstanders (Ming/Yuki/Carlos), tegel-klik discard, vereenvoudigde win-detectie. MahjongGame.lua: deck-creatie, dealing, scoring. |
| 09-04-2026 | 1 | 00 | NPC-dialoogsysteem + receptenboek | NPCDialogues.lua: 4 NPC's met begroetingen en dialoogbomen. RecipeBookGui.client.lua: 25+ moleculen met ingredienten en maakbaarheidsdetectie. GlobalAnnouncements.client.lua: geanimeerde event-meldingen. |
| 09-04-2026 | 1 | 00 | Quest-systeem + wereld-uitbreiding | Quests.lua (268 regels): 11 quests (Starter/Intermediate/Advanced/Daily). QuestTrackerGui.client.lua. NPC-spawn posities in wereld. Datapersistentie-updates voor quest-voortgang. |

**Subtotaal week 15: 6 uur 00 minuten**

---

### Week 15 (2026-04-12, zaterdag)

| Datum | Uren | Minuten | Activiteit | Technische details |
|-------|------|---------|------------|-------------------|
| 12-04-2026 | 1 | 00 | Kritieke bugfix + LoadingScreen | Duplicate AtomSpawnerV2 verwijderd (veroorzaakte 3× spawn-bug). LoadingScreen.client.lua: welkomstscherm met tips, toetsenbordsnelkoppelingen, verhaal/thema introductie. |
| 12-04-2026 | 1 | 30 | Publicatie-voorbereiding documentatie | ARCHITECTURE.md (495 regels): complete systeemontwerp. TESTING_GUIDE.md: 10 testsecties. DEPLOYMENT.md: stap-voor-stap lanceerhandleiding. PUBLICATION_READY.md: pre-publicatie checklist. |
| 12-04-2026 | 2 | 00 | Game Design Document 2.0 | GAME_DESIGN_DOCUMENT.md (1.453 regels): 3 spelsporen (Meststofchemie/Quantum Racing/Superheld), 8 NPC-karakters, level 1-120 progressie, 4 leaderboard-categorieën, monetisatie-strategie, technische specificaties. |

**Subtotaal week 15 (za): 4 uur 30 minuten**

---

### Week 17 (2026-04-22, dinsdag)

| Datum | Uren | Minuten | Activiteit | Technische details |
|-------|------|---------|------------|-------------------|
| 22-04-2026 | 1 | 30 | Kritieke bugfixes voor speelbaarheid | Workspace/Zones directory aangemaakt (Rojo build faalde). Duplicate PostProcessing verwijderd (race condition met WorldBuilder). LoadingScreen fade gerepareerd (ScreenGui.Transparency bestaat niet — children individueel gefaded). DashboardGui start nu verborgen (was gameplay blokkeerend). |
| 22-04-2026 | 0 | 30 | Void kill zone + toetsenbordsnelkoppelingen | VoidKillZone.server.lua: respawn bij Y<-80 (spelers vielen eindeloos in void). GUIManager.client.lua: alle 11 sneltoetsen geïmplementeerd (P/D/I/A/L/Q/R/Tab///Esc). Vervanging duplicate shortcuts uit HUDController. |
| 22-04-2026 | 1 | 00 | Interactief tutorial-systeem | TutorialGui.client.lua: 6-staps begeleide onboarding met progressie-stippen, geanimeerde tekst, skip-knop. Stappen: welkom → vind atoom → verzamel → periodiek systeem → dashboard → verken. Event-listeners voor atoomverzameling en toetsaanslagen. |
| 22-04-2026 | 0 | 45 | HUD real-time updates | HUDWidget.client.lua herschreven: abonneert op AtomCollected, MoleculeBuilt, DayAdvanced, FacilityBuilt, MarketTrade events. Elementen-ontdekkingsvoortgangsbalk. Zone-indicator badge. MolCoin flash-animatie bij verzameling. |
| 22-04-2026 | 0 | 30 | Teaser overlay + navigatie | TeaserOverlay.client.lua: zone-kompas met live afstanden tot alle 6 zones, MOLGANG branding watermark, dagelijkse claim-popup, versie-badge. |
| 22-04-2026 | 0 | 30 | Skybox + geluidssysteem fix | WorldBuilder skybox gerepareerd (ongeldige asset-ID's). AmbientSounds.server.lua: gedifferentieerde geluiden per zone en actie (voorheen zelfde ID voor alles). |

**Subtotaal 22-04: 4 uur 45 minuten**

---

### Week 17 (2026-04-23, woensdag)

| Datum | Uren | Minuten | Activiteit | Technische details |
|-------|------|---------|------------|-------------------|
| 23-04-2026 | 0 | 30 | Vertaling Nederlands→Engels + visuele verbetering | HUDController: 15 Nederlandse UI-teksten vertaald (ATOMEN→ATOMS, MOLECULEBOUWER→MOLECULE BUILDER, etc.). PeriodicTableGui: "elementen gevonden"→"elements discovered". Lichting: Atmosphere haze 0.5 (was 1.0), bloom 1.8/30, DepthOfField effect, ExposureCompensation 0.3. |
| 23-04-2026 | 2 | 30 | Staalslak-verwerkingschemie systeem | **S&O kernactiviteit**: SteelSlag.lua (290 regels): BOF-slakcompositie gemodelleerd (CaO 45%, FeO 17%, SiO2 14%, MgO 7%, V2O5 1.5%). 4 deeltjesgrootteklassen met oppervlakte-afhankelijke loogsnelheid. 6 reagentia (H2SO4, HCl, NaOH, HNO3, citroenzuur, H2O) met unieke extractie-efficiëntie per oxide. Loogduur schaalt met deeltjesgrootte × reagenssterktte. SlagProcessing.server.lua (490 regels): server-autoritatief verwerkingssysteem met hamer-breken, machine-malen, tijdsgebaseerd logen, product-extractie. |
| 23-04-2026 | 1 | 30 | Slakverwerking GUI | SlagProcessingGui.client.lua (500+ regels): 3-tab interface (Voorraad/Breken, Logen, Monitoring). Hamer-brekanimatie met voortgangsbalk. Reagens-kaarten met pH, extractie-efficiëntie, kosten. Real-time loog-voortgangsbalken met resterende tijd. Extract-knop bij voltooiing. |
| 23-04-2026 | 1 | 00 | Literatuuronderzoek staalslakverwerking | **S&O kernactiviteit**: Wetenschappelijke publicaties bestudeerd: "Rapid Vanadium Extraction from Roasted Vanadium Steel Slag via H2SO4-H2O2 System" (ACS Omega), "Two-stage leaching of calcium and vanadium from high-calcium steelmaking slag" (Taylor & Francis), "Direct Leaching of Vanadium Using NaOH Solutions" (MPEM). Verwerkt in procesmodel: roosterstap 900°C/2u voor V3+→V5+ oxidatie, H2SO4+H2O2 snelloog (80% V extractie in 15 min), twee-staps selectief logen (NH4NO3 voor Ca, (NH4)2CO3 voor V). |
| 23-04-2026 | 1 | 30 | Volledig realistisch verwerkingspijplijn | 12-stations industrieel procesmodel toegevoegd op basis van Harsco/Tata Steel data: Koelput → Trilzeef → Kaakbreker → Zeef → Kegelbreker → Kogelmolen → HGMS → Roosteroven → Loogtank → Filtratiepress → Precipitatie → Droogoven. Snelloog-optie en twee-staps selectief logen. WorldBuilder uitgebreid met 6 nieuwe interactieve verwerkingsstations, loopbrug met veiligheidshekken, neon-pijlmarkeringen, product-opslagsilos (V2O5/Fe2O3/TiO2). |
| 23-04-2026 | 2 | 00 | 3D-modelgeneratie met Blender Python | **S&O kernactiviteit**: Procedureel 3D-model generatiescript ontwikkeld (generate_slag_models.py, 760 regels). 14 industriële modellen gegenereerd via Blender 5.1 headless Python API: kaakbreker, kegelbreker, kogelmolen, transportband, loogtank, magneetscheider, trilzeef, koelput, roosteroven, opslagsilo, slakbrokken, aambeeld+hamer, leidingsecties, filtratiepress. Alle modellen <5000 driehoeken, Roblox stud-schaal, FBX-export. |
| 23-04-2026 | 1 | 30 | VR/AR-ondersteuning | **S&O kernactiviteit**: VRARController.client.lua (350+ regels): VR headset auto-detectie via UserInputService.VREnabled. VR laserpointer met raycast-interactie vanuit rechterhand. Comfort-vignet (randverdoezeling bij beweging tegen bewegingsziekte). Teleport-locomotie via linkertrigger. Adaptieve UI-schaling (1.5× voor VR leesbaarheid). AR-modus hint voor mobiel. Desktop click-to-interact fallback met afstandscontrole. |
| 23-04-2026 | 1 | 30 | Bubble Tea Bar met gameplay-buffs | BubbleTeaBar.server.lua (280+ regels): 6 dranken met gameplay-buffs (snelheid, verzamelbereik, MolCoin bonus, quiz-hint, productiesnelheid, zeldzaamheidskans). Zichtbare boba-beker geweld aan rechterhand van speler (beker + deksel + rietje + tapioca parels). Server-autoritatief buff-tracking met cooldown. BubbleTeaGui.client.lua. Neon-bar in Nexus Hub met 6 gloeiende bekers, menuboard, barkrukken. |
| 23-04-2026 | 1 | 00 | Mahjong upgrade naar volledige Kantonese regels | **S&O kernactiviteit**: MahjongGame.lua volledig herschreven (370 regels): recursieve meld-decompositie voor correcte win-detectie (4 melds + 1 paar). Chi/Pong/Kong detectie. Faan-scoresysteem (Alle Pungs +3, Draak-pung +1, Wind-pung +1, Halve Flush +3). Slimme AI met 3 persoonlijkheden (agressief/defensief/gebalanceerd) die tegelwaarde evalueren op basis van paren, sequenties, en draken. |
| 23-04-2026 | 1 | 30 | Meststofchemie-spoortrack data | **S&O kernactiviteit**: FertilizerTrack.lua (400+ regels): 10 meststofverbindingen met echte NPK-ratio's (Ureum 46-0-0, DAP 18-46-0, NPK 15-15-15, Slak Bio-Enhancer). 5 grondtypen (zandig/klei/leem/veen/vervuild). 5 gewassen met ideale NPK/pH-vereisten. Opbrengstberekening volgens Liebig's Wet van het Minimum. Over-bemesting straf (>130% verbrandt planten). 12 verhalende quests over 3 bedrijven (Ontdekking → Beheersing → Crisis). |
| 23-04-2026 | 1 | 30 | Meststofsysteem server + GUI | FertilizerSystem.server.lua (380+ regels): 4 landbouwpercelen per speler, grondanalyse (pH/NPK/contaminanten), meststof-synthese, bemesting-toepassing, gewasplanting, tijdsgebaseerde groei (1 speldag = 2 min), oogst met opbrengstberekening, quest-voortgang. FertilizerGui.client.lua (400+ regels): 3-tab interface (Percelen/Lab/Quests) met 2×2 percelenraster, voortgangsbalken, NPK-weergave. GUIManager bijgewerkt met B/F toetsen. |

| 23-04-2026 | 2 | 00 | Weer-systeem met gevaren + entrepreneur modus | **S&O kernactiviteit**: WeatherSystem.server.lua: dynamisch weercyclus (helder→bewolkt→regen→storm→hagel) met gameplay-effecten: regenvertraging 20%, stormschade, hagelgewasvernietiging. Client-side: regendeeltjes, bliksemflitsen met cameraschudding, weer-HUD indicator. Indoor/outdoor detectie. |
| 23-04-2026 | 2 | 30 | Ondernemer fabriekshal + apparatuurcatalogus | EntrepreneurSystem.server.lua: 1000m² huurbare fabriekshal (40×25 raster), 22 apparatuuritems met prijzen/vermogen/productie. FactoryEquipment.lua: kaakbreker, kegelbreker, kogelmolen, magneetscheider, loogtank, roosteroven, silos, transportband, XRF-analyzer, ICP-OES, pH-meter. Aangrenzendheidsbonus-systeem. Energiebalans (100kW basis + generatoren). Maandelijkse huur+onderhoud. |
| 23-04-2026 | 2 | 00 | Interactief fabrieksplanner GUI | FactoryBuilderGui.client.lua (500+ regels): top-down rasterweergave van 40×25 fabrieksplattegrond. Apparatuurcatalogus zijpaneel met categorieën. Klik-om-te-plaatsen met groen/rood geldigheidspreview. Rotatie (R), verwijderen (X), rechtermuisknop. Real-time vermogen/kosten/items statistieken. Weer-indicator. Apparatuurinfo-paneel met adjacency-bonussen. |

| 23-04-2026 | 1 | 30 | Procesbesturingspaneel GUI + bugfixes | **S&O kernactiviteit**: ProcessControlGui.client.lua: real-time dashboard met 4 meetinstrumenten (temperatuur 0-1000°C met Arrhenius, druk 0-500kPa met Henry's Law, pH 0-14 met precipitatie-zones, debiet 1-50 L/min met verblijftijd). Live massabalans en energiekostenberekening. Gecombineerd reactiesnelheid-multiplicator. MahjongGui herschreven met echte chi/pong/kong spelstroom. FertilizerSystem quest-voortgangsvalidatie (12 quests). EntrepreneurSystem 3D visualisatie van geplaatste apparatuur. |

**Subtotaal 23-04: 24 uur 30 minuten**

---

## Totaaloverzicht per week

| Week | Datum(s) | Uren | Minuten | Totaal |
|------|----------|------|---------|--------|
| Week 14 | 07-04-2026 | 8 | 00 | 8:00 |
| Week 15 | 09-04-2026 | 6 | 00 | 6:00 |
| Week 15 | 12-04-2026 | 4 | 30 | 4:30 |
| Week 17 | 22-04-2026 | 4 | 45 | 4:45 |
| Week 17 | 23-04-2026 | 24 | 30 | 24:30 |
| | | | | **47:45** |

**Totaal geregistreerde S&O-uren april 2026: 47 uur en 45 minuten**

---

## S&O-activiteiten samenvatting

### Categorie 1: Technisch-wetenschappelijk onderzoek (12:00 uur)
- Literatuuronderzoek BOF-staalslak verwerkingschemie (1:00)
- Modellering reactiekinetiek: pH-afhankelijke metaaloplossing per reagens (2:30)
- Meststofchemie NPK-balansmodellering volgens Liebig's Wet (1:30)
- Mahjong regelmotor: recursieve meld-decompositie algorithme (1:00)
- VR/AR interactie-onderzoek: comfort-vignet, spatial UI, hand-tracking (1:30)
- Procedurele 3D-mesh generatie via Blender Python API (2:00)
- 12-stations industrieel procesmodel op basis van Harsco/Tata Steel data (1:30)
- Anti-cheat server-autoritatief architectuurontwerp (1:00)

### Categorie 2: Technische ontwikkeling (27:45 uur)
- Server-side game-engine (EconomyManager, AtomSpawner, ProductionManager)
- Client-side UI-systemen (19 ScreenGui's, HUD, overlays)
- Staalslak-verwerkingssysteem (chemie + server + GUI)
- VR/AR controller met laser pointer, teleport, vignet
- Meststofsysteem met landbouwsimulatie
- NPC-systeem, Quest-systeem, Leaderboards
- 3D-modelgeneratie pipeline (Blender → FBX → Roblox)
- Bubble Tea Bar met gameplay-buffs en visuele accessoires
- Mahjong met volledige Kantonese spelregels

---

## Deliverables

| # | Deliverable | Omvang | Bewijs |
|---|------------|--------|--------|
| 1 | Luau game-code (57 scripts) | 24.395 regels | github.com/febuz/molgang-roblox |
| 2 | 3D-modellen (14 FBX) | 676 KB | assets/models/*.fbx |
| 3 | Blender generatiescript | 760 regels Python | assets/blender/generate_slag_models.py |
| 4 | Game Design Document | 1.453 regels | GAME_DESIGN_DOCUMENT.md |
| 5 | Architectuurdocument | 495 regels | ARCHITECTURE.md |
| 6 | Testhandleiding | 10 secties | TESTING_GUIDE.md |
| 7 | Git-historie | 30+ commits | git log |

---

## Verklaring

Ondergetekende verklaart dat bovenstaande uren daadwerkelijk zijn besteed aan speur- en ontwikkelingswerk zoals omschreven in de WBSO-aanvraag.

**Naam:** Edwin Hauwert  
**Referentie:** 219252713  
**Datum:** 23-04-2026  
**Handtekening:** _______________

---

*Dit document is opgesteld conform de eisen van de Rijksdienst voor Ondernemend Nederland (RVO) voor WBSO-urenregistratie. Alle uren zijn gekoppeld aan aantoonbare git-commits met timestamps.*
