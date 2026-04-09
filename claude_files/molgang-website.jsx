import { useState, useEffect } from "react";

/* ══════════════════════════════════════════════════════════════
   MOLGANG — GLOBAL PLAYER WEBSITE
   14 Languages: NL · EN · DE · FR · ES · ES_AR · PT · AR (RTL)
   粵語 · हिन्दी · தமிழ் · Kiswahili · Yorùbá · አማርኛ
══════════════════════════════════════════════════════════════ */

// ── LANGUAGE DEFINITIONS ─────────────────────────────────────
const LANGS = [
  { code:"nl",   label:"Nederlands",   flag:"🇳🇱", script:"latin",   dir:"ltr", native:"Nederlands" },
  { code:"en",   label:"English",      flag:"🇬🇧", script:"latin",   dir:"ltr", native:"English" },
  { code:"de",   label:"Deutsch",      flag:"🇩🇪", script:"latin",   dir:"ltr", native:"Deutsch" },
  { code:"fr",   label:"Français",     flag:"🇫🇷", script:"latin",   dir:"ltr", native:"Français" },
  { code:"es",   label:"Español",      flag:"🇪🇸", script:"latin",   dir:"ltr", native:"Español" },
  { code:"es_ar",label:"Español (AR)", flag:"🇦🇷", script:"latin",   dir:"ltr", native:"Español (AR)" },
  { code:"pt",   label:"Português",    flag:"🇧🇷", script:"latin",   dir:"ltr", native:"Português" },
  { code:"ar",   label:"العربية",      flag:"🇸🇦", script:"arabic",  dir:"rtl", native:"العربية" },
  { code:"yue",  label:"粵語",         flag:"🇨🇳", script:"cjk",     dir:"ltr", native:"廣州話" },
  { code:"hi",   label:"हिन्दी",       flag:"🇮🇳", script:"devanagari",dir:"ltr",native:"हिन्दी" },
  { code:"ta",   label:"தமிழ்",        flag:"🇮🇳", script:"tamil",   dir:"ltr", native:"தமிழ்" },
  { code:"sw",   label:"Kiswahili",    flag:"🌍",  script:"latin",   dir:"ltr", native:"Kiswahili" },
  { code:"yo",   label:"Yorùbá",       flag:"🌍",  script:"latin",   dir:"ltr", native:"Yorùbá" },
  { code:"am",   label:"አማርኛ",        flag:"🌍",  script:"ethiopic",dir:"ltr", native:"አማርኛ" },
];

// ── FULL TRANSLATIONS ─────────────────────────────────────────
const T = {
  nl: {
    nav_play:"Speel Nu",nav_about:"Over het Spel",nav_learn:"Leer Chemie",nav_community:"Community",
    hero_eyebrow:"Roblox Educatief Spel",
    hero_h1:"Jouw Mol is\nJouw Bewijs.",
    hero_sub:"Registreer moleculen op de blockchain. Bouw een bedrijf uit niets. Verander de wereld — één mol tegelijk.",
    hero_cta:"Speel Gratis",hero_cta2:"Bekijk Trailer",
    hero_stat1:"118 elementen",hero_stat2:"39 reacties",hero_stat3:"5 zones",hero_stat4:"Gratis",
    section_what:"Wat is MOLGANG?",
    what_p:"MOLGANG is een Roblox-spel waarin jij een Mol Ranger bent. Je vangt atomen, bouwt moleculen, registreert je emissies op de blockchain en bouwt een klimaatbedrijf — net zoals Jack Ma, Elizabeth Rossiello en Sridhar Vembu begonnen met niets.",
    section_how:"Hoe Speel Je?",
    how1_t:"Vang Atomen", how1_d:"Loop door Moleculia en vang 118 elementen. Elk atoom is anders, zeldzamer en waardevoller.",
    how2_t:"Bouw Moleculen", how2_d:"Combineer atomen tot moleculen zoals H₂O, V₂O₅ en C₆H₁₂O₆. Echte chemie, echt plezier.",
    how3_t:"Registreer op Blockchain", how3_d:"Optioneel maar lonend: registreer jouw CO₂-captures op de MolChain. Jouw mol is jouw bewijs.",
    how4_t:"Bouw je Bedrijf", how4_d:"Gebruik ANK Coöperatief voor leningen. Zet jouw klimaatdata om in echt kapitaal.",
    section_zones:"De Wereld",
    zone1:"Slakkenspoor Fabriek", zone1d:"BOF-slak verwerking. HGMS magneten. pH-ladder puzzel.",
    zone2:"Wognum Natuur", zone2d:"Pioenenveldenm Si-K biostimulant. Stikstofmeting.",
    zone3:"Quantum Lab", zone3d:"Quantum dots vangen. TU Delft cryogene zone.",
    zone4:"Nexus Hub", zone4d:"Spawn punt. ANK Coöperatief. MolChain Tower.",
    zone5:"Periodic Table Biome", zone5d:"118 element-eilanden. Quantum Frontier.",
    section_ents:"Zij Begonnen Ook Met Niets",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"3× geweigerd door Harvard. Nu $231 miljard.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"1 laptop in Nairobi. Nu $3 miljard aan betalingen.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"Sociale huurflat Stockholm. Nu 600M gebruikers.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Dorpskind Tamil Nadu. Nu $1 miljard bootstrapped.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"Businessplan in auto. Nu $2 biljoen.",
    section_mol:"De Mol Filosofie",
    mol_q:'"Jouw achtergrond doet er niet toe. Alleen de mol telt."',
    mol_attr:"— Professor Femke van Mol, MOLGANG",
    mol_p:"De blockchain controleert niet wie je ouders zijn. Ze registreert alleen: hoeveel mol heb je gemeten? Hoeveel heb je geregistreerd? Dat is jouw track record. Dat is jouw bewijs.",
    section_cta:"Begin Vandaag",
    cta_h:"Gratis spelen op Roblox",
    cta_sub:"Geen betaalmuur. Geen pay-to-win. Alleen jouw mol.",
    cta_btn:"Speel Nu op Roblox",
    footer_made:"Gemaakt door VirtualV Holding B.V.",
    footer_edu:"Educatief — Non-Profit Jaar 1-5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"Jouw achtergrond: onbekend. Succes kans: 4.7%.",
    ghost_reply:"Jack Ma hoorde hetzelfde. Ga door.",
  },
  en: {
    nav_play:"Play Now",nav_about:"About",nav_learn:"Learn Chemistry",nav_community:"Community",
    hero_eyebrow:"Roblox Educational Game",
    hero_h1:"Your Mol Is\nYour Proof.",
    hero_sub:"Register molecules on the blockchain. Build a business from nothing. Change the world — one mol at a time.",
    hero_cta:"Play Free",hero_cta2:"Watch Trailer",
    hero_stat1:"118 elements",hero_stat2:"39 reactions",hero_stat3:"5 zones",hero_stat4:"Free",
    section_what:"What is MOLGANG?",
    what_p:"MOLGANG is a Roblox game where you become a Mol Ranger. Catch atoms, build molecules, register your emissions on the blockchain, and build a climate business — just like Jack Ma, Elizabeth Rossiello, and Sridhar Vembu started from nothing.",
    section_how:"How Do You Play?",
    how1_t:"Catch Atoms", how1_d:"Explore Moleculia and catch 118 elements. Each atom is unique, rarer and more valuable.",
    how2_t:"Build Molecules", how2_d:"Combine atoms into molecules like H₂O, V₂O₅ and C₆H₁₂O₆. Real chemistry, real fun.",
    how3_t:"Register on Blockchain", how3_d:"Optional but rewarding: register your CO₂ captures on MolChain. Your mol is your proof.",
    how4_t:"Build Your Business", how4_d:"Use ANK Cooperative for loans. Convert your climate data into real capital.",
    section_zones:"The World",
    zone1:"Slakkenspoor Factory", zone1d:"BOF slag processing. HGMS magnets. pH-ladder puzzle.",
    zone2:"Wognum Nature", zone2d:"Peony fields. Si-K biostimulant. Nitrogen measurement.",
    zone3:"Quantum Lab", zone3d:"Catch quantum dots. TU Delft cryogenic zone.",
    zone4:"Nexus Hub", zone4d:"Spawn point. ANK Cooperative. MolChain Tower.",
    zone5:"Periodic Table Biome", zone5d:"118 element islands. Quantum Frontier.",
    section_ents:"They Also Started With Nothing",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Rejected by Harvard 3×. Now $231 billion.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"1 laptop in Nairobi. Now $3B in payments.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"Social housing Stockholm. Now 600M users.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Village kid Tamil Nadu. Now $1B bootstrapped.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"Business plan in a car. Now $2 trillion.",
    section_mol:"The Mol Philosophy",
    mol_q:'"Your background doesn\'t matter. Only the mol counts."',
    mol_attr:"— Professor Femke van Mol, MOLGANG",
    mol_p:"The blockchain doesn't check who your parents are. It only records: how many mols did you measure? How many did you register? That's your track record. That's your proof.",
    section_cta:"Start Today",
    cta_h:"Play Free on Roblox",
    cta_sub:"No paywall. No pay-to-win. Just your mol.",
    cta_btn:"Play Now on Roblox",
    footer_made:"Made by VirtualV Holding B.V.",
    footer_edu:"Educational — Non-Profit Years 1-5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"Your background: unknown. Success probability: 4.7%.",
    ghost_reply:"Jack Ma heard the same thing. Keep going.",
  },
  de: {
    nav_play:"Jetzt spielen",nav_about:"Über das Spiel",nav_learn:"Chemie lernen",nav_community:"Community",
    hero_eyebrow:"Roblox Lernspiel",
    hero_h1:"Dein Mol ist\ndein Beweis.",
    hero_sub:"Registriere Moleküle auf der Blockchain. Baue ein Unternehmen aus dem Nichts. Verändere die Welt — ein Mol nach dem anderen.",
    hero_cta:"Kostenlos spielen",hero_cta2:"Trailer ansehen",
    hero_stat1:"118 Elemente",hero_stat2:"39 Reaktionen",hero_stat3:"5 Zonen",hero_stat4:"Kostenlos",
    section_what:"Was ist MOLGANG?",
    what_p:"MOLGANG ist ein Roblox-Spiel, in dem du ein Mol Ranger wirst. Fange Atome, baue Moleküle, registriere deine Emissionen auf der Blockchain und baue ein Klimaunternehmen auf — genau wie Jack Ma, Elizabeth Rossiello und Sridhar Vembu aus dem Nichts begannen.",
    section_how:"Wie spielt man?",
    how1_t:"Atome fangen", how1_d:"Erkunde Moleculia und fange 118 Elemente. Jedes Atom ist einzigartig, seltener und wertvoller.",
    how2_t:"Moleküle bauen", how2_d:"Kombiniere Atome zu Molekülen wie H₂O, V₂O₅ und C₆H₁₂O₆. Echte Chemie, echter Spaß.",
    how3_t:"Auf Blockchain registrieren", how3_d:"Optional, aber lohnend: Registriere deine CO₂-Aufnahmen auf MolChain. Dein Mol ist dein Beweis.",
    how4_t:"Dein Unternehmen aufbauen", how4_d:"Nutze ANK Kooperative für Kredite. Wandle deine Klimadaten in echtes Kapital um.",
    section_zones:"Die Welt",
    zone1:"Slakkenspoor Fabrik", zone1d:"BOF-Schlacke-Verarbeitung. HGMS-Magnete. pH-Leiter-Rätsel.",
    zone2:"Wognum Natur", zone2d:"Pfingstrosenfelder. Si-K Biostimulans. Stickstoffmessung.",
    zone3:"Quantenlabor", zone3d:"Quantenpunkte fangen. TU Delft Kryogen-Zone.",
    zone4:"Nexus Hub", zone4d:"Spawn-Punkt. ANK Kooperative. MolChain Tower.",
    zone5:"Periodensystem Biom", zone5d:"118 Element-Inseln. Quanten-Grenzgebiet.",
    section_ents:"Sie begannen auch mit nichts",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"3× von Harvard abgelehnt. Jetzt 231 Milliarden $.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"1 Laptop in Nairobi. Jetzt 3 Mrd. $ Zahlungen.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"Sozialer Wohnungsbau Stockholm. Jetzt 600M Nutzer.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Dorfkind Tamil Nadu. Jetzt 1 Mrd. $ bootstrapped.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"Businessplan im Auto. Jetzt 2 Billionen $.",
    section_mol:"Die Mol-Philosophie",
    mol_q:'"Dein Hintergrund spielt keine Rolle. Nur das Mol zählt."',
    mol_attr:"— Professor Femke van Mol, MOLGANG",
    mol_p:"Die Blockchain überprüft nicht, wer deine Eltern sind. Sie erfasst nur: Wie viele Mole hast du gemessen? Wie viele hast du registriert? Das ist dein Leistungsnachweis. Das ist dein Beweis.",
    section_cta:"Fang heute an",
    cta_h:"Kostenlos auf Roblox spielen",
    cta_sub:"Keine Bezahlschranke. Kein Pay-to-win. Nur dein Mol.",
    cta_btn:"Jetzt auf Roblox spielen",
    footer_made:"Erstellt von VirtualV Holding B.V.",
    footer_edu:"Bildung — Non-Profit Jahre 1–5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"Dein Hintergrund: unbekannt. Erfolgswahrscheinlichkeit: 4,7 %.",
    ghost_reply:"Jack Ma hat dasselbe gehört. Mach weiter.",
  },
  fr: {
    nav_play:"Jouer maintenant",nav_about:"À propos",nav_learn:"Apprendre la chimie",nav_community:"Communauté",
    hero_eyebrow:"Jeu éducatif Roblox",
    hero_h1:"Ta Mole est\nTa Preuve.",
    hero_sub:"Enregistre des molécules sur la blockchain. Crée une entreprise de zéro. Change le monde — une mole à la fois.",
    hero_cta:"Jouer gratuitement",hero_cta2:"Voir la bande-annonce",
    hero_stat1:"118 éléments",hero_stat2:"39 réactions",hero_stat3:"5 zones",hero_stat4:"Gratuit",
    section_what:"Qu'est-ce que MOLGANG?",
    what_p:"MOLGANG est un jeu Roblox où tu deviens un Ranger Mol. Capture des atomes, construis des molécules, enregistre tes émissions sur la blockchain et bâtis une entreprise climatique — tout comme Jack Ma, Elizabeth Rossiello et Sridhar Vembu ont commencé de rien.",
    section_how:"Comment jouer?",
    how1_t:"Capturer des atomes", how1_d:"Explore Moleculia et capture 118 éléments. Chaque atome est unique, plus rare et plus précieux.",
    how2_t:"Construire des molécules", how2_d:"Combine des atomes en molécules comme H₂O, V₂O₅ et C₆H₁₂O₆. Vraie chimie, vrai plaisir.",
    how3_t:"S'inscrire sur la blockchain", how3_d:"Facultatif mais rentable: enregistre tes captures de CO₂ sur MolChain. Ta mole est ta preuve.",
    how4_t:"Construis ton entreprise", how4_d:"Utilise la coopérative ANK pour des prêts. Transforme tes données climatiques en capital réel.",
    section_zones:"Le Monde",
    zone1:"Usine Slakkenspoor", zone1d:"Traitement des scories BOF. Aimants HGMS. Puzzle pH.",
    zone2:"Nature Wognum", zone2d:"Champs de pivoines. Biostimulant Si-K. Mesure de l'azote.",
    zone3:"Laboratoire Quantique", zone3d:"Capturer des points quantiques. Zone cryogénique TU Delft.",
    zone4:"Nexus Hub", zone4d:"Point de départ. Coopérative ANK. Tour MolChain.",
    zone5:"Biome Tableau Périodique", zone5d:"118 îles d'éléments. Frontière quantique.",
    section_ents:"Ils ont aussi commencé de zéro",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Refusé 3× par Harvard. Maintenant 231 milliards $.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"1 ordinateur à Nairobi. Maintenant 3 Md$ de paiements.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"HLM Stockholm. Maintenant 600M utilisateurs.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Enfant de village Tamil Nadu. Maintenant 1 Md$ sans VC.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"Business plan dans une voiture. Maintenant 2 billions $.",
    section_mol:"La Philosophie Mol",
    mol_q:'"Ton passé ne compte pas. Seule la mole compte."',
    mol_attr:"— Professeure Femke van Mol, MOLGANG",
    mol_p:"La blockchain ne vérifie pas qui sont tes parents. Elle n'enregistre qu'une chose: combien de moles as-tu mesurées? Combien as-tu enregistrées? C'est ton bilan. C'est ta preuve.",
    section_cta:"Commence aujourd'hui",
    cta_h:"Jouer gratuitement sur Roblox",
    cta_sub:"Pas de paywall. Pas de pay-to-win. Juste ta mole.",
    cta_btn:"Jouer maintenant sur Roblox",
    footer_made:"Créé par VirtualV Holding B.V.",
    footer_edu:"Éducatif — Sans but lucratif années 1–5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"Ton passé: inconnu. Probabilité de succès: 4,7 %.",
    ghost_reply:"Jack Ma a entendu la même chose. Continue.",
  },
  yue: {
    nav_play:"立即玩",nav_about:"關於遊戲",nav_learn:"學化學",nav_community:"社群",
    hero_eyebrow:"Roblox 教育遊戲",
    hero_h1:"你嘅摩爾\n係你嘅證明。",
    hero_sub:"將分子登記上區塊鏈。由零開始建立事業。改變世界——一個摩爾一個摩爾咁做。",
    hero_cta:"免費玩",hero_cta2:"睇預告片",
    hero_stat1:"118種元素",hero_stat2:"39種反應",hero_stat3:"5個區域",hero_stat4:"免費",
    section_what:"MOLGANG係乜嘢？",
    what_p:"MOLGANG係一個Roblox遊戲，你係摩爾遊俠。捉原子、砌分子、將你嘅碳排放登記上區塊鏈，同建立氣候企業——就好似馬雲、Elizabeth Rossiello同Sridhar Vembu一樣，由零開始。",
    section_how:"點樣玩？",
    how1_t:"捉原子", how1_d:"探索Moleculia，捉取118種元素。每種原子都唔同，越罕見越值錢。",
    how2_t:"砌分子", how2_d:"將原子組合成H₂O、V₂O₅同C₆H₁₂O₆等分子。真實化學，真實樂趣。",
    how3_t:"登記上區塊鏈", how3_d:"自願但有回報：將你嘅CO₂捕獲登記上MolChain。你嘅摩爾係你嘅證明。",
    how4_t:"建立你嘅事業", how4_d:"用ANK合作社借貸。將你嘅氣候數據轉化成真實資本。",
    section_zones:"遊戲世界",
    zone1:"Slakkenspoor工廠", zone1d:"BOF爐渣處理。HGMS磁鐵。pH梯謎題。",
    zone2:"Wognum自然區", zone2d:"芍藥田。矽鉀生物刺激素。氮含量測量。",
    zone3:"量子實驗室", zone3d:"捉量子點。TU Delft低溫區。",
    zone4:"Nexus中心", zone4d:"出生點。ANK合作社。MolChain塔。",
    zone5:"週期表生物圈", zone5d:"118個元素島嶼。量子前沿。",
    section_ents:"佢哋都係由零開始",
    ent_jack:"馬雲 — 阿里巴巴",ent_jack_d:"三次被哈佛拒絕。而家$2310億。",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"喺奈洛比一部手提電腦。而家$30億付款。",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"斯德哥爾摩公屋。而家6億用戶。",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Tamil Nadu鄉村仔。而家$10億自力更生。",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"喺車入面寫商業計劃書。而家$2萬億。",
    section_mol:"摩爾哲學",
    mol_q:"「你嘅背景唔重要。只有摩爾先算數。」",
    mol_attr:"— Femke van Mol教授，MOLGANG",
    mol_p:"區塊鏈唔會查你父母係邊個。佢只記錄：你量咗幾多摩爾？你登記咗幾多？呢個係你嘅成績。呢個係你嘅證明。",
    section_cta:"今日開始",
    cta_h:"喺Roblox免費玩",
    cta_sub:"無付費牆。無課金優勢。只係你嘅摩爾。",
    cta_btn:"而家喺Roblox玩",
    footer_made:"由VirtualV Holding B.V.製作",
    footer_edu:"教育用途——第1-5年非牟利",
    ghost_label:"CarbonGhost:",
    ghost_msg:"你嘅背景：未知。成功機率：4.7%。",
    ghost_reply:"馬雲都聽過同樣嘅說話。繼續。",
  },
  hi: {
    nav_play:"अभी खेलें",nav_about:"खेल के बारे में",nav_learn:"रसायन सीखें",nav_community:"समुदाय",
    hero_eyebrow:"Roblox शैक्षिक खेल",
    hero_h1:"तुम्हारा मोल\nतुम्हारा सबूत है।",
    hero_sub:"ब्लॉकचेन पर अणुओं को पंजीकृत करें। शून्य से व्यवसाय बनाएं। दुनिया को बदलें — एक मोल एक समय में।",
    hero_cta:"मुफ़्त खेलें",hero_cta2:"ट्रेलर देखें",
    hero_stat1:"118 तत्व",hero_stat2:"39 प्रतिक्रियाएं",hero_stat3:"5 क्षेत्र",hero_stat4:"निःशुल्क",
    section_what:"MOLGANG क्या है?",
    what_p:"MOLGANG एक Roblox गेम है जहाँ आप एक मोल रेंजर बनते हैं। परमाणु पकड़ें, अणु बनाएं, अपने उत्सर्जन को ब्लॉकचेन पर पंजीकृत करें — ठीक वैसे ही जैसे Jack Ma, Elizabeth Rossiello और Sridhar Vembu ने शून्य से शुरुआत की थी।",
    section_how:"कैसे खेलें?",
    how1_t:"परमाणु पकड़ें", how1_d:"Moleculia का अन्वेषण करें और 118 तत्व पकड़ें। हर परमाणु अनूठा और अधिक मूल्यवान है।",
    how2_t:"अणु बनाएं", how2_d:"परमाणुओं को H₂O, V₂O₅ और C₆H₁₂O₆ जैसे अणुओं में मिलाएं। असली रसायन, असली मज़ा।",
    how3_t:"ब्लॉकचेन पर पंजीकृत करें", how3_d:"वैकल्पिक लेकिन फ़ायदेमंद: MolChain पर CO₂ कैप्चर पंजीकृत करें। तुम्हारा मोल तुम्हारा सबूत है।",
    how4_t:"अपना व्यवसाय बनाएं", how4_d:"ANK सहकारी से ऋण लें। अपना जलवायु डेटा वास्तविक पूंजी में बदलें।",
    section_zones:"दुनिया",
    zone1:"Slakkenspoor कारखाना", zone1d:"BOF स्लैग प्रसंस्करण। HGMS चुम्बक। pH-लेडर पहेली।",
    zone2:"Wognum प्रकृति", zone2d:"पेओनी खेत। Si-K बायोस्टिमुलेंट। नाइट्रोजन माप।",
    zone3:"क्वांटम लैब", zone3d:"क्वांटम डॉट्स पकड़ें। TU Delft क्रायोजेनिक ज़ोन।",
    zone4:"Nexus हब", zone4d:"स्पॉन पॉइंट। ANK सहकारी। MolChain टॉवर।",
    zone5:"आवर्त सारणी बायोम", zone5d:"118 तत्व-द्वीप। क्वांटम फ्रंटियर।",
    section_ents:"उन्होंने भी शून्य से शुरुआत की",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Harvard ने 3 बार ठुकराया। अब $231 अरब।",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"नैरोबी में 1 लैपटॉप। अब $3 अरब का लेनदेन।",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"स्टॉकहोम सोशल हाउसिंग। अब 60 करोड़ यूज़र।",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Tamil Nadu गाँव का बच्चा। अब $1 अरब बिना VC।",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"कार में लिखा बिज़नेस प्लान। अब $2 लाख करोड़।",
    section_mol:"मोल दर्शन",
    mol_q:"\"तुम्हारी पृष्ठभूमि मायने नहीं रखती। केवल मोल मायने रखता है।\"",
    mol_attr:"— प्रोफ़ेसर Femke van Mol, MOLGANG",
    mol_p:"ब्लॉकचेन यह नहीं देखती कि तुम्हारे माता-पिता कौन हैं। वह सिर्फ एक चीज़ रिकॉर्ड करती है: तुमने कितने मोल मापे? कितने पंजीकृत किए? यही तुम्हारा रिकॉर्ड है। यही तुम्हारा सबूत है।",
    section_cta:"आज शुरू करें",
    cta_h:"Roblox पर मुफ़्त खेलें",
    cta_sub:"कोई पेवॉल नहीं। कोई pay-to-win नहीं। बस तुम्हारा मोल।",
    cta_btn:"अभी Roblox पर खेलें",
    footer_made:"VirtualV Holding B.V. द्वारा बनाया गया",
    footer_edu:"शैक्षिक — वर्ष 1-5 गैर-लाभकारी",
    ghost_label:"CarbonGhost:",
    ghost_msg:"तुम्हारी पृष्ठभूमि: अज्ञात। सफलता की संभावना: 4.7%।",
    ghost_reply:"Jack Ma ने भी यही सुना था। आगे बढ़ते रहो।",
  },
  ta: {
    nav_play:"இப்போது விளையாடு",nav_about:"விளையாட்டை பற்றி",nav_learn:"வேதியியல் கற்க",nav_community:"சமூகம்",
    hero_eyebrow:"Roblox கல்வி விளையாட்டு",
    hero_h1:"உன் மோல்\nஉன் ஆதாரம்.",
    hero_sub:"தொகுதிகளை பிளாக்செயினில் பதிவு செய். பூஜ்யத்திலிருந்து வணிகம் கட்டு. உலகை மாற்று — ஒரு மோல் ஒரு நேரத்தில்.",
    hero_cta:"இலவசமாக விளையாடு",hero_cta2:"டிரெய்லர் பார்",
    hero_stat1:"118 தனிமங்கள்",hero_stat2:"39 வினைகள்",hero_stat3:"5 பகுதிகள்",hero_stat4:"இலவசம்",
    section_what:"MOLGANG என்றால் என்ன?",
    what_p:"MOLGANG என்பது Roblox விளையாட்டு, இதில் நீ மோல் ரேஞ்சர் ஆகிறாய். அணுக்களை பிடி, மூலக்கூறுகள் கட்டு, உன் உமிழ்வுகளை பிளாக்செயினில் பதிவு செய் — Jack Ma, Elizabeth Rossiello, Sridhar Vembu போல பூஜ்யத்திலிருந்து தொடங்கு.",
    section_how:"எப்படி விளையாடுவது?",
    how1_t:"அணுக்களை பிடி", how1_d:"Moleculiaவை ஆராய்ந்து 118 தனிமங்களை பிடி. ஒவ்வொரு அணுவும் தனித்துவமானது.",
    how2_t:"மூலக்கூறுகள் கட்டு", how2_d:"H₂O, V₂O₅, C₆H₁₂O₆ போல மூலக்கூறுகள் உருவாக்கு. உண்மையான வேதியியல், உண்மையான மகிழ்ச்சி.",
    how3_t:"பிளாக்செயினில் பதிவு செய்", how3_d:"விருப்பமானால் ஆனால் லாபகரமானது: MolChainல் CO₂ பதிவு செய். உன் மோல் உன் ஆதாரம்.",
    how4_t:"உன் தொழிலை கட்டு", how4_d:"ANK கூட்டுறவிலிருந்து கடன் வாங்கு. உன் தட்ப நிலை தரவை உண்மையான மூலதனமாக மாற்று.",
    section_zones:"உலகம்",
    zone1:"Slakkenspoor தொழிற்சாலை", zone1d:"BOF சக்கை செயலாக்கம். HGMS காந்தங்கள். pH-நூலிசை புதிர்.",
    zone2:"Wognum இயற்கை", zone2d:"பெஓனி வயல்கள். Si-K உயிர் தூண்டுசி. நைட்ரஜன் அளவீடு.",
    zone3:"குவாண்டம் ஆய்வகம்", zone3d:"குவாண்டம் புள்ளிகளை பிடி. TU Delft கிரையோஜெனிக் பகுதி.",
    zone4:"Nexus மையம்", zone4d:"பிறப்பு புள்ளி. ANK கூட்டுறவு. MolChain கோபுரம்.",
    zone5:"ஆவர்த்தன அட்டவணை உயிர்மண்டலம்", zone5d:"118 தனிம தீவுகள். குவாண்டம் எல்லை.",
    section_ents:"அவர்களும் பூஜ்யத்திலிருந்து தொடங்கினார்கள்",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Harvard 3 முறை நிராகரித்தது. இப்போது $231 பில்லியன்.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"நைரோபியில் 1 லேப்டாப். இப்போது $3 பில்லியன்.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"ஸ்டாக்ஹோம் சமூக வீட்டுவசதி. இப்போது 60 கோடி பயனர்கள்.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"தமிழ்நாடு கிராம சிறுவன். இப்போது $1 பில்லியன் bootstrapped.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"காரில் வணிகத் திட்டம். இப்போது $2 ட்ரில்லியன்.",
    section_mol:"மோல் தத்துவம்",
    mol_q:"\"உன் பின்னணி முக்கியமில்லை. மோல் மட்டுமே முக்கியம்.\"",
    mol_attr:"— பேராசிரியர் Femke van Mol, MOLGANG",
    mol_p:"பிளாக்செயின் உன் பெற்றோர் யார் என்று சரிபார்க்காது. அது ஒரு விஷயம் மட்டும் பதிவு செய்கிறது: நீ எத்தனை மோல்கள் அளந்தாய்? எத்தனை பதிவு செய்தாய்? அதுவே உன் சாதனைப் பதிவு. அதுவே உன் ஆதாரம்.",
    section_cta:"இன்று தொடங்கு",
    cta_h:"Robloxல் இலவசமாக விளையாடு",
    cta_sub:"கட்டண தடை இல்லை. Pay-to-win இல்லை. உன் மோல் மட்டுமே.",
    cta_btn:"இப்போது Robloxல் விளையாடு",
    footer_made:"VirtualV Holding B.V. ஆல் உருவாக்கப்பட்டது",
    footer_edu:"கல்வி — 1-5 ஆண்டுகள் இலாப நோக்கற்றது",
    ghost_label:"CarbonGhost:",
    ghost_msg:"உன் பின்னணி: தெரியவில்லை. வெற்றி வாய்ப்பு: 4.7%.",
    ghost_reply:"Jack Ma-வும் இதையே கேட்டார். தொடர்.",
  },
  sw: {
    nav_play:"Cheza Sasa",nav_about:"Kuhusu Mchezo",nav_learn:"Jifunza Kemia",nav_community:"Jumuiya",
    hero_eyebrow:"Mchezo wa Elimu wa Roblox",
    hero_h1:"Mole Yako ni\nUthibitisho Wako.",
    hero_sub:"Sajili molekuli kwenye blockchain. Jenga biashara kutoka sifuri. Badilisha ulimwengu — mole moja kwa wakati.",
    hero_cta:"Cheza Bure",hero_cta2:"Tazama Trailer",
    hero_stat1:"Elementi 118",hero_stat2:"Mwitikio 39",hero_stat3:"Maeneo 5",hero_stat4:"Bure",
    section_what:"MOLGANG ni nini?",
    what_p:"MOLGANG ni mchezo wa Roblox ambapo unakuwa Mol Ranger. Nakili atomi, jenga molekuli, sajili uzalishaji wako kwenye blockchain na ujenga biashara ya hali ya hewa — kama vile Jack Ma, Elizabeth Rossiello na Sridhar Vembu walianza kutoka sifuri.",
    section_how:"Jinsi ya Kucheza?",
    how1_t:"Nakili Atomi", how1_d:"Chunguza Moleculia na unakili elementi 118. Kila atomi ni ya kipekee, adimu zaidi na yenye thamani zaidi.",
    how2_t:"Jenga Molekuli", how2_d:"Changanua atomi kuwa molekuli kama H₂O, V₂O₅ na C₆H₁₂O₆. Kemia ya kweli, furaha ya kweli.",
    how3_t:"Sajili kwenye Blockchain", how3_d:"Hiari lakini yenye faida: sajili unakiliaji wa CO₂ kwenye MolChain. Mole yako ni uthibitisho wako.",
    how4_t:"Jenga Biashara Yako", how4_d:"Tumia Ushirika wa ANK kwa mkopo. Badilisha data yako ya hali ya hewa kuwa mtaji wa kweli.",
    section_zones:"Ulimwengu",
    zone1:"Kiwanda cha Slakkenspoor", zone1d:"Usindikaji wa slag wa BOF. Sumaku za HGMS. Fumbo la pH.",
    zone2:"Asili ya Wognum", zone2d:"Mashamba ya peony. Kibiolojia cha Si-K. Kupima nitrojeni.",
    zone3:"Maabara ya Quantum", zone3d:"Kunasa pointi za quantum. Eneo la cryogenic la TU Delft.",
    zone4:"Kituo cha Nexus", zone4d:"Mahali pa kuzaliwa. Ushirika wa ANK. Mnara wa MolChain.",
    zone5:"Biome ya Jedwali la Mara kwa Mara", zone5d:"Visiwa 118 vya elementi. Mpaka wa Quantum.",
    section_ents:"Wao Pia Walianza Kutoka Sifuri",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Alikataliwa na Harvard mara 3. Sasa $231 bilioni.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"Laptop 1 huko Nairobi. Sasa $3 bilioni.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"Nyumba za kijamii Stockholm. Sasa watumiaji milioni 600.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Mtoto wa kijiji Tamil Nadu. Sasa $1 bilioni bila VC.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"Mpango wa biashara ndani ya gari. Sasa trilioni $2.",
    section_mol:"Falsafa ya Mole",
    mol_q:'"Asili yako haihusiani. Mole pekee ndiyo inayohusika."',
    mol_attr:"— Profesa Femke van Mol, MOLGANG",
    mol_p:"Blockchain haikagui wazazi wako ni nani. Inarekodiwa kitu kimoja tu: umepima mole ngapi? Umesajili ngapi? Hiyo ndiyo rekodi yako. Hiyo ndiyo uthibitisho wako.",
    section_cta:"Anza Leo",
    cta_h:"Cheza Bure kwenye Roblox",
    cta_sub:"Hakuna kizuizi cha kulipa. Hakuna pay-to-win. Mole yako tu.",
    cta_btn:"Cheza Sasa kwenye Roblox",
    footer_made:"Imetengenezwa na VirtualV Holding B.V.",
    footer_edu:"Elimu — Yasiyo ya faida Miaka 1–5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"Historia yako: haijulikani. Uwezekano wa mafanikio: 4.7%.",
    ghost_reply:"Jack Ma alisikia vivyo hivyo. Endelea.",
  },
  yo: {
    nav_play:"Ṣeré Ní Báyìí",nav_about:"Nípa Eré",nav_learn:"Kọ́ Kẹ́místrì",nav_community:"Àwùjọ",
    hero_eyebrow:"Eré Ẹ̀kọ́ Roblox",
    hero_h1:"Mole Rẹ ni\nẸ̀rí Rẹ.",
    hero_sub:"Forúkọsílẹ̀ molecule sórí blockchain. Kọ́ iṣowo láti ọ̀fẹ́. Yí ayé padà — mole kan ní àkókò kan.",
    hero_cta:"Ṣeré Lọ́fẹ̀",hero_cta2:"Wo Trailer",
    hero_stat1:"Erò 118",hero_stat2:"Ìfọwọpabọ̀ 39",hero_stat3:"Àgbègbè 5",hero_stat4:"Ọ̀fẹ́",
    section_what:"Kíni MOLGANG?",
    what_p:"MOLGANG jẹ́ eré Roblox níbi tí o di Mol Ranger. Mú atom, kọ́ molecule, forúkọsílẹ̀ ìtújáde rẹ sórí blockchain — gẹ́gẹ́ bí Jack Ma, Elizabeth Rossiello àti Sridhar Vembu ti bẹ̀rẹ̀ láti ọ̀fẹ́.",
    section_how:"Báwo ni Wọn Ṣe Ṣeré?",
    how1_t:"Mú Atom", how1_d:"Ṣàwárí Moleculia kí o sì mú erò 118. Atom kọ̀ọ̀kan jẹ́ àkànṣe, àìṣẹlẹ̀ jù àti iye rẹ̀ pọ̀ sí i.",
    how2_t:"Kọ́ Molecule", how2_d:"Dapọ̀ atom sí molecule bíi H₂O, V₂O₅ àti C₆H₁₂O₆. Kẹ́místrì gidi, igbádùn gidi.",
    how3_t:"Forúkọsílẹ̀ sórí Blockchain", how3_d:"Àṣàyàn ṣùgbọ́n o ní ẹ̀san: forúkọsílẹ̀ CO₂ captures rẹ sórí MolChain. Mole rẹ jẹ́ ẹ̀rí rẹ.",
    how4_t:"Kọ́ Iṣowo Rẹ", how4_d:"Lo Ẹgbẹ́ ANK fún àwín. Yí data afẹ́fẹ́ rẹ padà sí owó gidi.",
    section_zones:"Ayé Eré",
    zone1:"Ilé-iṣẹ́ Slakkenspoor", zone1d:"Ìtọ́jú slag BOF. Aráṣo HGMS. Ìdárayá pH.",
    zone2:"Ẹ̀dá Wognum", zone2d:"Pápá peony. Biostimulant Si-K. Wíwọn nitrogen.",
    zone3:"Ìdánwò Quantum", zone3d:"Mú quantum dots. Àgbègbè cryogenic TU Delft.",
    zone4:"Nexus Hub", zone4d:"Ibi ìbí. Ẹgbẹ́ ANK. Ilé-gogoro MolChain.",
    zone5:"Biome Tábìlì Àkókò", zone5d:"Erékùṣù erò 118. Ààlà Quantum.",
    section_ents:"Wọn Bẹ̀rẹ̀ Láti Ọ̀fẹ́ Pẹ̀lú",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Harvard kọ̀ ẹ́ ní ìgbà 3. Ní báyìí $231 bílíọ̀nù.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"Laptop 1 ní Nairobi. Ní báyìí $3 bílíọ̀nù.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"Ilé ìjọba Stockholm. Ní báyìí olùmúlò 600M.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Ọmọ abúlé Tamil Nadu. Ní báyìí $1 bílíọ̀nù.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"Ètò iṣowo nínú ọkọ̀. Ní báyìí $2 tirílíọ̀nù.",
    section_mol:"Ìmọ̀-ọgbọ́n Mole",
    mol_q:'"Ìpilẹ̀ rẹ kò ṣe pàtàkì. Mole nìkan ni ó ṣe pàtàkì."',
    mol_attr:"— Ọ̀jọ̀gbọ́n Femke van Mol, MOLGANG",
    mol_p:"Blockchain kò ṣàyẹ̀wò bí àwọn òbí rẹ ṣe rí. Ó ń gbasilẹ nkan kan ṣoṣo: melo ni mole tí o wọ̀n? Melo ni tí o forúkọsílẹ̀? Ìyẹn ni àkọsílẹ̀ rẹ. Ìyẹn ni ẹ̀rí rẹ.",
    section_cta:"Bẹ̀rẹ̀ Lónìí",
    cta_h:"Ṣeré Lọ́fẹ̀ sórí Roblox",
    cta_sub:"Kò sí ìdèwò ìsanwó. Kò sí pay-to-win. Mole rẹ ṣoṣo.",
    cta_btn:"Ṣeré Ní Báyìí sórí Roblox",
    footer_made:"Ṣẹ̀dá nípa VirtualV Holding B.V.",
    footer_edu:"Ẹ̀kọ́ — Kò sí èrè Ọdún 1–5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"Ìpilẹ̀ rẹ: àìmọ̀. Ìṣeeṣe àṣeyọrí: 4.7%.",
    ghost_reply:"Jack Ma gbọ́ ohun kanna. Máa bá a lọ.",
  },
  am: {
    nav_play:"አሁን ተጫወት",nav_about:"ስለ ጨዋታ",nav_learn:"ኬሚስትሪ ተማር",nav_community:"ማህበረሰብ",
    hero_eyebrow:"Roblox የትምህርት ጨዋታ",
    hero_h1:"ሞሌህ\nማስረጃህ ነው።",
    hero_sub:"ሞሌኩሎችን በብሎክቼይን ላይ ምዝገባ። ከዜሮ ንግድ ምስረታ። ዓለምን ለወጥ — ሞሌ በሞሌ።",
    hero_cta:"ነፃ ተጫወት",hero_cta2:"ትሬሎ ይዩ",
    hero_stat1:"118 ንጥረ ነገሮች",hero_stat2:"39 ምላሾች",hero_stat3:"5 ዞኖች",hero_stat4:"ነፃ",
    section_what:"MOLGANG ምንድን ነው?",
    what_p:"MOLGANG Roblox ጨዋታ ሲሆን ሞሌ ሬንጀር ትሆናለህ። አቶሞችን ያዝ፣ ሞሌኩሎች ምስረታ፣ ልቀቶቻቸውን ብሎክቼይን ላይ ምዝገባ — Jack Ma፣ Elizabeth Rossiello እና Sridhar Vembu ከዜሮ እንደጀመሩ።",
    section_how:"እንዴት ይጫወቱ?",
    how1_t:"አቶሞችን ያዝ", how1_d:"Moleculiaን ፈልጉ እና 118 ንጥረ ነገሮችን ይያዙ። እያንዳንዱ አቶም ልዩ፣ ብርቅ እና ዋጋ ያለው ነው።",
    how2_t:"ሞሌኩሎች ምስረታ", how2_d:"አቶሞችን እንደ H₂O፣ V₂O₅ እና C₆H₁₂O₆ ወደ ሞሌኩሎች ያዋህዱ። እውነተኛ ኬሚስትሪ፣ እውነተኛ ደስታ።",
    how3_t:"ብሎክቼይን ላይ ምዝገባ", how3_d:"አማራጭ ግን ጠቃሚ: CO₂ captures MolChain ላይ ምዝገባ። ሞሌህ ማስረጃህ ነው።",
    how4_t:"ንግድህን ምስረታ", how4_d:"ANK ህብረት ስለ ብድር ተጠቀም። የአየር ንብረት ዳታህን ወደ ካፒታል ለወጥ።",
    section_zones:"ዓለሙ",
    zone1:"Slakkenspoor ፋብሪካ", zone1d:"BOF ሲሜ ማስተናገጃ። HGMS መግነጢሳዊ። pH ፓዝ።",
    zone2:"Wognum ተፈጥሮ", zone2d:"የፒዮኒ ሜዳ። Si-K ባዮስቲሙላንት። ናይትሮጂን ስሌት።",
    zone3:"የኳንተም ላቦ", zone3d:"የኳንተም ነጥቦችን ያዝ። TU Delft ክሪዮጅኒክ ዞን።",
    zone4:"ኔክሰስ ሃብ", zone4d:"ስፖን ነጥብ። ANK ህብረት። MolChain ቱዋር።",
    zone5:"ዑደታዊ ሠንጠረዥ ባዮም", zone5d:"118 የንጥረ ነገር ደሴቶች። የኳንተም ድንበር።",
    section_ents:"እነሱም ከዜሮ ጀምረዋል",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Harvard 3 ጊዜ ከለከለ። አሁን $231 ቢሊዮን።",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"ናይሮቢ 1 ላፕቶፕ። አሁን $3 ቢሊዮን።",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"ስቶክሆልም ማህበራዊ ቤት። አሁን 600M ተጠቃሚዎች።",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Tamil Nadu የቀበሌ ልጅ። አሁን $1 ቢሊዮን።",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"በመኪና ውስጥ የቢዝነስ ፕላን። አሁን $2 ትሪሊዮን።",
    section_mol:"የሞሌ ፍልስፍና",
    mol_q:"«ዳራህ አስፈላጊ አይደለም። ሞሌ ብቻ ነው አስፈላጊው።»",
    mol_attr:"— ፕሮፌሰር Femke van Mol፣ MOLGANG",
    mol_p:"ብሎክቼይን ወላጆቻቸው ማን እንደሆኑ አይጠይቅም። አንድ ነገር ብቻ ይመዘግባል: ስንት ሞሌ ደደቡ? ስንቱን ምዘገቡ? ያ ሪኮርዳቸው ነው። ያ ማስረጃቸው ነው።",
    section_cta:"ዛሬ ጀምር",
    cta_h:"Roblox ላይ ነፃ ተጫወት",
    cta_sub:"ምንም ክፍያ አስፈላጊ አይደለም። ምንም pay-to-win የለም። ሞሌህ ብቻ።",
    cta_btn:"አሁን Roblox ላይ ተጫወት",
    footer_made:"VirtualV Holding B.V. ሰርቷቸዋል",
    footer_edu:"ትምህርታዊ — ዓመት 1-5 ትርፋ-ፈላጊ ያልሆነ",
    ghost_label:"CarbonGhost:",
    ghost_msg:"ዳራህ: የማይታወቅ። የስኬት ዕድል: 4.7%።",
    ghost_reply:"Jack Ma ያው ነው የሰማው። ቀጥል።",
  },
  es: {
    nav_play:"Jugar Ahora",nav_about:"Sobre el Juego",nav_learn:"Aprender Química",nav_community:"Comunidad",
    hero_eyebrow:"Juego Educativo de Roblox",
    hero_h1:"Tu Mol es\ntu Prueba.",
    hero_sub:"Registra moléculas en la blockchain. Construye un negocio desde cero. Cambia el mundo — un mol a la vez.",
    hero_cta:"Jugar Gratis",hero_cta2:"Ver Tráiler",
    hero_stat1:"118 elementos",hero_stat2:"39 reacciones",hero_stat3:"5 zonas",hero_stat4:"Gratis",
    section_what:"¿Qué es MOLGANG?",
    what_p:"MOLGANG es un juego de Roblox donde te conviertes en un Mol Ranger. Atrapa átomos, construye moléculas, registra tus emisiones en la blockchain y construye un negocio climático — igual que Jack Ma, Elizabeth Rossiello y Sridhar Vembu empezaron de la nada.",
    section_how:"¿Cómo Juegas?",
    how1_t:"Atrapar Átomos", how1_d:"Explora Moleculia y atrapa 118 elementos. Cada átomo es único, más raro y más valioso.",
    how2_t:"Construir Moléculas", how2_d:"Combina átomos en moléculas como H₂O, V₂O₅ y C₆H₁₂O₆. Química real, diversión real.",
    how3_t:"Registrar en Blockchain", how3_d:"Opcional pero rentable: registra tus capturas de CO₂ en MolChain. Tu mol es tu prueba.",
    how4_t:"Construye tu Negocio", how4_d:"Usa la Cooperativa ANK para préstamos. Convierte tus datos climáticos en capital real.",
    section_zones:"El Mundo",
    zone1:"Fábrica Slakkenspoor", zone1d:"Procesamiento de escoria BOF. Imanes HGMS. Puzzle de pH.",
    zone2:"Naturaleza de Wognum", zone2d:"Campos de peonías. Bioestimulante Si-K. Medición de nitrógeno.",
    zone3:"Laboratorio Cuántico", zone3d:"Atrapar puntos cuánticos. Zona criogénica TU Delft.",
    zone4:"Nexus Hub", zone4d:"Punto de spawn. Cooperativa ANK. Torre MolChain.",
    zone5:"Bioma Tabla Periódica", zone5d:"118 islas de elementos. Frontera Cuántica.",
    section_ents:"Ellos También Empezaron de Cero",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Rechazado 3 veces por Harvard. Ahora $231 mil millones.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"1 portátil en Nairobi. Ahora $3 mil millones.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"Vivienda social en Estocolmo. Ahora 600M usuarios.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Niño de aldea de Tamil Nadu. Ahora $1 mil millones sin VC.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"Plan de negocios en un coche. Ahora $2 billones.",
    section_mol:"La Filosofía Mol",
    mol_q:'"Tu origen no importa. Solo cuenta el mol."',
    mol_attr:"— Profesora Femke van Mol, MOLGANG",
    mol_p:"La blockchain no verifica quiénes son tus padres. Solo registra una cosa: ¿cuántos moles mediste? ¿Cuántos registraste? Ese es tu historial. Esa es tu prueba.",
    section_cta:"Empieza Hoy",
    cta_h:"Jugar Gratis en Roblox",
    cta_sub:"Sin muro de pago. Sin pay-to-win. Solo tu mol.",
    cta_btn:"Jugar Ahora en Roblox",
    footer_made:"Creado por VirtualV Holding B.V.",
    footer_edu:"Educativo — Sin fines de lucro años 1–5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"Tu origen: desconocido. Probabilidad de éxito: 4,7%.",
    ghost_reply:"Jack Ma escuchó lo mismo. Sigue adelante.",
  },
  es_ar: {
    nav_play:"Jugá Ahora",nav_about:"Sobre el Juego",nav_learn:"Aprendé Química",nav_community:"Comunidad",
    hero_eyebrow:"Juego Educativo de Roblox",
    hero_h1:"Tu Mol es\ntu Prueba.",
    hero_sub:"Registrá moléculas en la blockchain. Construí un negocio desde cero. Cambiá el mundo — un mol a la vez.",
    hero_cta:"Jugá Gratis",hero_cta2:"Ver Tráiler",
    hero_stat1:"118 elementos",hero_stat2:"39 reacciones",hero_stat3:"5 zonas",hero_stat4:"Gratis",
    section_what:"¿Qué es MOLGANG?",
    what_p:"MOLGANG es un juego de Roblox donde te convertís en un Mol Ranger. Atrapar átomos, construir moléculas, registrar tus emisiones en la blockchain y armar un negocio climático — igual que Jack Ma, Elizabeth Rossiello y Sridhar Vembu empezaron de la nada.",
    section_how:"¿Cómo se Juega?",
    how1_t:"Atrapar Átomos", how1_d:"Explorá Moleculia y atrapar 118 elementos. Cada átomo es único, más raro y más valioso.",
    how2_t:"Armar Moléculas", how2_d:"Combiná átomos en moléculas como H₂O, V₂O₅ y C₆H₁₂O₆. Química real, diversión real.",
    how3_t:"Registrar en Blockchain", how3_d:"Opcional pero conveniente: registrá tus capturas de CO₂ en MolChain. Tu mol es tu prueba.",
    how4_t:"Armá tu Negocio", how4_d:"Usá la Cooperativa ANK para préstamos. Convertí tu data climática en capital real.",
    section_zones:"El Mundo",
    zone1:"Fábrica Slakkenspoor", zone1d:"Procesamiento de escoria BOF. Imanes HGMS. Puzzle de pH.",
    zone2:"Naturaleza de Wognum", zone2d:"Campos de peonías. Bioestimulante Si-K. Medición de nitrógeno.",
    zone3:"Laboratorio Cuántico", zone3d:"Atrapar puntos cuánticos. Zona criogénica TU Delft.",
    zone4:"Nexus Hub", zone4d:"Punto de spawn. Cooperativa ANK. Torre MolChain.",
    zone5:"Bioma Tabla Periódica", zone5d:"118 islas de elementos. Frontera Cuántica.",
    section_ents:"También Empezaron de Cero",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Rechazado 3 veces por Harvard. Ahora $231 mil millones.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"1 portátil en Nairobi. Ahora $3 mil millones.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"Vivienda social en Estocolmo. Ahora 600M usuarios.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Pibe de pueblo en Tamil Nadu. Ahora $1 mil millones sin VC.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"Plan de negocios en un auto. Ahora $2 billones.",
    section_mol:"La Filosofía Mol",
    mol_q:'"Tu origen no importa. Solo cuenta el mol."',
    mol_attr:"— Profesora Femke van Mol, MOLGANG",
    mol_p:"La blockchain no verifica quiénes son tus viejos. Solo registra una cosa: ¿cuántos moles mediste? ¿Cuántos registraste? Ese es tu historial. Esa es tu prueba.",
    section_cta:"Empezá Hoy",
    cta_h:"Jugá Gratis en Roblox",
    cta_sub:"Sin paywall. Sin pay-to-win. Solo tu mol.",
    cta_btn:"Jugá Ahora en Roblox",
    footer_made:"Creado por VirtualV Holding B.V.",
    footer_edu:"Educativo — Sin fines de lucro años 1–5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"Tu origen: desconocido. Probabilidad de éxito: 4,7%.",
    ghost_reply:"Jack Ma escuchó lo mismo. Seguí.",
  },
  pt: {
    nav_play:"Jogar Agora",nav_about:"Sobre o Jogo",nav_learn:"Aprender Química",nav_community:"Comunidade",
    hero_eyebrow:"Jogo Educativo no Roblox",
    hero_h1:"O Seu Mol é\na Sua Prova.",
    hero_sub:"Registre moléculas na blockchain. Construa um negócio do zero. Mude o mundo — um mol de cada vez.",
    hero_cta:"Jogar Grátis",hero_cta2:"Ver Trailer",
    hero_stat1:"118 elementos",hero_stat2:"39 reações",hero_stat3:"5 zonas",hero_stat4:"Grátis",
    section_what:"O que é MOLGANG?",
    what_p:"MOLGANG é um jogo Roblox onde você se torna um Mol Ranger. Capture átomos, construa moléculas, registre suas emissões na blockchain e construa um negócio climático — assim como Jack Ma, Elizabeth Rossiello e Sridhar Vembu começaram do zero.",
    section_how:"Como Jogar?",
    how1_t:"Capturar Átomos", how1_d:"Explore Moleculia e capture 118 elementos. Cada átomo é único, mais raro e mais valioso.",
    how2_t:"Construir Moléculas", how2_d:"Combine átomos em moléculas como H₂O, V₂O₅ e C₆H₁₂O₆. Química real, diversão real.",
    how3_t:"Registrar na Blockchain", how3_d:"Opcional mas recompensador: registre suas capturas de CO₂ no MolChain. Seu mol é sua prova.",
    how4_t:"Construa seu Negócio", how4_d:"Use a Cooperativa ANK para empréstimos. Converta seus dados climáticos em capital real.",
    section_zones:"O Mundo",
    zone1:"Fábrica Slakkenspoor", zone1d:"Processamento de escória BOF. Ímãs HGMS. Quebra-cabeça de pH.",
    zone2:"Natureza de Wognum", zone2d:"Campos de peônias. Bioestimulante Si-K. Medição de nitrogênio.",
    zone3:"Laboratório Quântico", zone3d:"Capturar pontos quânticos. Zona criogênica TU Delft.",
    zone4:"Nexus Hub", zone4d:"Ponto de spawn. Cooperativa ANK. Torre MolChain.",
    zone5:"Bioma Tabela Periódica", zone5d:"118 ilhas de elementos. Fronteira Quântica.",
    section_ents:"Eles Também Começaram do Zero",
    ent_jack:"Jack Ma — Alibaba",ent_jack_d:"Rejeitado 3 vezes por Harvard. Agora $231 bilhões.",
    ent_eliz:"Elizabeth Rossiello — AZA Finance",ent_eliz_d:"1 laptop em Nairóbi. Agora $3 bilhões.",
    ent_dan:"Daniel Ek — Spotify",ent_dan_d:"Habitação social em Estocolmo. Agora 600M usuários.",
    ent_sri:"Sridhar Vembu — Zoho",ent_sri_d:"Menino de aldeia em Tamil Nadu. Agora $1 bilhão sem VC.",
    ent_jeff:"Jeff Bezos — Amazon",ent_jeff_d:"Plano de negócios num carro. Agora $2 trilhões.",
    section_mol:"A Filosofia Mol",
    mol_q:'"Sua origem não importa. Apenas o mol conta."',
    mol_attr:"— Professora Femke van Mol, MOLGANG",
    mol_p:"A blockchain não verifica quem são seus pais. Ela registra apenas uma coisa: quantos moles você mediu? Quantos você registrou? Esse é o seu histórico. Essa é a sua prova.",
    section_cta:"Comece Hoje",
    cta_h:"Jogar Grátis no Roblox",
    cta_sub:"Sem paywall. Sem pay-to-win. Apenas o seu mol.",
    cta_btn:"Jogar Agora no Roblox",
    footer_made:"Criado por VirtualV Holding B.V.",
    footer_edu:"Educacional — Sem fins lucrativos anos 1–5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"Sua origem: desconhecida. Probabilidade de sucesso: 4,7%.",
    ghost_reply:"Jack Ma ouviu o mesmo. Continue.",
  },
  ar: {
    nav_play:"العب الآن",nav_about:"عن اللعبة",nav_learn:"تعلم الكيمياء",nav_community:"المجتمع",
    hero_eyebrow:"لعبة تعليمية على Roblox",
    hero_h1:"مولك\nهو دليلك.",
    hero_sub:"سجّل الجزيئات على البلوكتشين. ابنِ عملاً تجارياً من الصفر. غيّر العالم — مول واحد في كل مرة.",
    hero_cta:"العب مجاناً",hero_cta2:"شاهد الإعلان",
    hero_stat1:"118 عنصراً",hero_stat2:"39 تفاعلاً",hero_stat3:"5 مناطق",hero_stat4:"مجاني",
    section_what:"ما هو MOLGANG؟",
    what_p:"MOLGANG لعبة Roblox تصبح فيها مول رينجر. التقط الذرات، وابنِ الجزيئات، وسجّل انبعاثاتك على البلوكتشين، وابنِ مشروعاً مناخياً — تماماً كما بدأ جاك ما وإليزابيث روسيلو وسريدهار فيمبو من لا شيء.",
    section_how:"كيف تلعب؟",
    how1_t:"التقط الذرات", how1_d:"استكشف Moleculia والتقط 118 عنصراً. كل ذرة فريدة، أكثر ندرة وقيمة.",
    how2_t:"ابنِ الجزيئات", how2_d:"ادمج الذرات في جزيئات مثل H₂O وV₂O₅ وC₆H₁₂O₆. كيمياء حقيقية، متعة حقيقية.",
    how3_t:"سجّل على البلوكتشين", how3_d:"اختياري لكن مجدٍ: سجّل التقاطات CO₂ على MolChain. مولك هو دليلك.",
    how4_t:"ابنِ مشروعك", how4_d:"استخدم تعاونية ANK للحصول على قروض. حوّل بيانات المناخ إلى رأس مال حقيقي.",
    section_zones:"عالم اللعبة",
    zone1:"مصنع Slakkenspoor", zone1d:"معالجة خبث BOF. مغناطيس HGMS. لغز pH.",
    zone2:"طبيعة Wognum", zone2d:"حقول الفاوانيا. محفّز Si-K الحيوي. قياس النيتروجين.",
    zone3:"المختبر الكمي", zone3d:"التقاط النقاط الكمية. المنطقة المبردة TU Delft.",
    zone4:"Nexus Hub", zone4d:"نقطة البداية. تعاونية ANK. برج MolChain.",
    zone5:"عالم الجدول الدوري", zone5d:"118 جزيرة عنصر. الحدود الكمية.",
    section_ents:"بدأوا هم أيضاً من الصفر",
    ent_jack:"جاك ما — Alibaba",ent_jack_d:"رُفض 3 مرات من هارفارد. الآن 231 مليار دولار.",
    ent_eliz:"إليزابيث روسيلو — AZA Finance",ent_eliz_d:"حاسوب محمول واحد في نيروبي. الآن 3 مليارات دولار.",
    ent_dan:"دانيال إيك — Spotify",ent_dan_d:"سكن اجتماعي في ستوكهولم. الآن 600 مليون مستخدم.",
    ent_sri:"سريدهار فيمبو — Zoho",ent_sri_d:"طفل قرية في تاميل نادو. الآن مليار دولار بلا تمويل.",
    ent_jeff:"جيف بيزوس — Amazon",ent_jeff_d:"خطة عمل في سيارة. الآن 2 تريليون دولار.",
    section_ents_biz:"نموذج العمل للشباب العربي",
    biz_title:"مولك = رأس مالك",
    biz_p:"البلوكتشين لا تسأل عن الواسطة أو المحسوبية. المول الذي تسجّله هو ملكيتك الحقيقية. ANK التعاونية تمنحك قرضاً بناءً على بياناتك المناخية — لا على علاقاتك.",
    biz_1_t:"ابدأ بالمدرسة", biz_1_d:"سجّل أول 100 مول أثناء الدراسة. هذا هو CVك الأول.",
    biz_2_t:"حوّل الخبرة إلى بيانات", biz_2_d:"مزارع؟ عامل؟ طالب؟ كل بيئتك مصدر لبيانات مناخية لم تُسجَّل بعد.",
    biz_3_t:"الشراكة عبر الحدود", biz_3_d:"MOLCO2 يُتداول عبر البلدان. اتفاقية مع شريك في نيجيريا أو ماليزيا من داخل اللعبة.",
    biz_4_t:"بنِ credibilityك", biz_4_d:"10000 مول مسجّل = سمعة لا يمكن لأحد إزالتها. هذا رأس المال الاجتماعي الجديد.",
    section_mol:"فلسفة المول",
    mol_q:"«أصلك لا يهم. فقط المول يهم.»",
    mol_attr:"— الأستاذة Femke van Mol، MOLGANG",
    mol_p:"البلوكتشين لا تتحقق من هوية والديك. تسجّل شيئاً واحداً فقط: كم مولاً قِسته؟ كم سجّلت؟ هذا هو سجلك. هذا هو دليلك.",
    section_cta:"ابدأ اليوم",
    cta_h:"العب مجاناً على Roblox",
    cta_sub:"لا جدار دفع. لا pay-to-win. فقط مولك.",
    cta_btn:"العب الآن على Roblox",
    footer_made:"من إنتاج VirtualV Holding B.V.",
    footer_edu:"تعليمي — غير ربحي السنوات 1–5",
    ghost_label:"CarbonGhost:",
    ghost_msg:"أصلك: مجهول. احتمال النجاح: 4.7%.",
    ghost_reply:"جاك ما سمع الشيء نفسه. واصل.",
  },
};

// ── STYLES ───────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=Noto+Sans+Devanagari:wght@400;700&family=Noto+Sans+Tamil:wght@400;700&family=Noto+Sans+Ethiopic:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&family=Unbounded:wght@400;700;900&family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#050709;color:#d4dfe8;overflow-x:hidden;}
::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#1a2a3a;border-radius:2px;}

/* Font stacks per script */
.script-latin   {font-family:'Space Grotesk',sans-serif;}
.script-cjk     {font-family:'Noto Sans SC','Space Grotesk',sans-serif;}
.script-devanagari{font-family:'Noto Sans Devanagari','Space Grotesk',sans-serif;}
.script-tamil   {font-family:'Noto Sans Tamil','Space Grotesk',sans-serif;}
.script-ethiopic{font-family:'Noto Sans Ethiopic','Space Grotesk',sans-serif;}
.script-arabic  {font-family:'Noto Naskh Arabic','Space Grotesk',sans-serif;line-height:1.9;}
[dir="rtl"]{text-align:right;}
[dir="rtl"] .nav-link{letter-spacing:0;}
[dir="rtl"] .ghost-chip{flex-direction:row-reverse;}
.hero-title-font{font-family:'Unbounded',sans-serif;}

/* NOISE TEXTURE */
body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:9998;
  opacity:.35;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E");}

/* KEYFRAMES */
@keyframes float  {0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes glow   {0%,100%{opacity:.7;filter:brightness(1)}50%{opacity:1;filter:brightness(1.4)}}
@keyframes ticker {0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes fadein {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin   {from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes pulse-border{0%,100%{box-shadow:0 0 0 0 #22c55e33}50%{box-shadow:0 0 0 8px transparent}}

.float{animation:float 5s ease-in-out infinite;}
.glow{animation:glow 3s ease-in-out infinite;}
.spin{animation:spin 20s linear infinite;}
.fadein{animation:fadein .6s ease-out forwards;}
.pulse{animation:pulse-border 2s infinite;}

/* GRADIENT TEXT */
.grad{background:linear-gradient(135deg,#22c55e 0%,#34d399 40%,#38bdf8 70%,#a78bfa 100%);
  background-size:200% 200%;animation:shimmer 4s ease infinite;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}

/* NAV */
.nav-link{color:#2a4a5a;font-family:'DM Mono',monospace;font-size:11px;
  letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;
  padding:6px 12px;border-radius:6px;transition:all .2s;border:1px solid transparent;cursor:pointer;}
.nav-link:hover{color:#22c55e;border-color:#22c55e22;background:#22c55e0a;}

/* LANG SWITCHER */
.lang-btn{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:8px;
  border:1px solid;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px;
  background:transparent;transition:all .15s;white-space:nowrap;}
.lang-btn:hover{transform:translateY(-1px);}

/* CARDS */
.card{background:#0b1018;border-radius:12px;border:1px solid #111d2a;
  transition:transform .2s,border-color .2s;overflow:hidden;}
.card:hover{transform:translateY(-4px);border-color:#22c55e33;}

/* ZONE CARDS */
.zone-card{padding:20px;background:#0b1018;border-radius:10px;
  border:1px solid #111d2a;transition:all .25s;}
.zone-card:hover{border-color:var(--c);background:color-mix(in srgb, var(--c) 6%, #0b1018);}

/* ENT CARDS */
.ent-card{padding:16px;background:#0b1018;border-radius:10px;
  border:1px solid #111d2a;transition:all .2s;cursor:default;}
.ent-card:hover{border-color:#f59e0b44;background:#f59e0b06;}

/* BUTTON */
.btn-primary{padding:14px 28px;border-radius:10px;border:none;cursor:pointer;
  font-family:'Unbounded',sans-serif;font-size:13px;font-weight:700;
  background:linear-gradient(135deg,#22c55e,#34d399);color:#050709;
  transition:all .2s;letter-spacing:.5px;}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px #22c55e44;}
.btn-secondary{padding:13px 24px;border-radius:10px;border:1px solid #22c55e44;cursor:pointer;
  font-family:'DM Mono',monospace;font-size:11px;background:transparent;color:#22c55e;
  transition:all .2s;letter-spacing:1px;}
.btn-secondary:hover{background:#22c55e12;border-color:#22c55e;}

/* SECTION */
.section{padding:80px 24px;max-width:1100px;margin:0 auto;}
.section-sm{padding:60px 24px;max-width:1100px;margin:0 auto;}

/* GHOST CHIP */
.ghost-chip{background:#1a0808;border:1px solid #ef444433;border-radius:10px;
  padding:12px 18px;display:inline-flex;align-items:center;gap:10px;}

/* STEP CARD */
.step-card{padding:24px;background:#0b1018;border-radius:12px;
  border:1px solid #111d2a;border-top:3px solid;}
`;

// ── LANGUAGE SWITCHER COMPONENT ───────────────────────────────
function LangSwitcher({ current, onChange }) {
  const [open, setOpen] = useState(false);
  const cur = LANGS.find(l => l.code === current);

  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen(o => !o)}
        className="lang-btn"
        style={{ borderColor:"#22c55e44", color:"#22c55e",
          background:open?"#22c55e12":"transparent" }}>
        <span style={{ fontSize:16 }}>{cur.flag}</span>
        <span style={{ fontSize:11 }}>{cur.native}</span>
        <span style={{ fontSize:9, opacity:.6 }}>{open?"▲":"▼"}</span>
      </button>

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0,
          background:"#0c1420", border:"1px solid #111d2a", borderRadius:12,
          padding:8, zIndex:1000, minWidth:200, boxShadow:"0 16px 48px #000a",
          display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          {/* Section headers */}
          {[
            { header:"🌍 Europa", langs:["nl","en","de","fr"] },
            { header:"🌎 Americas", langs:["es","es_ar","pt"] },
            { header:"🌙 Arabisch", langs:["ar"] },
            { header:"🌏 Azië", langs:["yue","hi","ta"] },
            { header:"🌍 Afrika", langs:["sw","yo","am"] },
          ].map(group => (
            <div key={group.header} style={{ gridColumn:"1/-1" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
                color:"#2a4a5a", letterSpacing:2, padding:"6px 8px 2px" }}>
                {group.header}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3 }}>
                {group.langs.map(code => {
                  const l = LANGS.find(x => x.code === code);
                  return (
                    <button key={code}
                      onClick={() => { onChange(code); setOpen(false); }}
                      className="lang-btn"
                      style={{ borderColor: current===code ? "#22c55e" : "#111d2a",
                        color: current===code ? "#22c55e" : "#4a6a80",
                        background: current===code ? "#22c55e12" : "transparent",
                        fontSize:11, padding:"6px 10px", justifyContent:"flex-start" }}>
                      <span>{l.flag}</span>
                      <span style={{ fontFamily:
                        l.script==="cjk"?"'Noto Sans SC',sans-serif":
                        l.script==="devanagari"?"'Noto Sans Devanagari',sans-serif":
                        l.script==="tamil"?"'Noto Sans Tamil',sans-serif":
                        l.script==="ethiopic"?"'Noto Sans Ethiopic',sans-serif":
                        l.script==="arabic"?"'Noto Naskh Arabic',sans-serif":
                        "'DM Mono',sans-serif" }}>
                        {l.native}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN WEBSITE ──────────────────────────────────────────────
export default function MolGangWebsite() {
  const [lang, setLang] = useState("nl");
  const [menuOpen, setMenuOpen] = useState(false);

  const l = LANGS.find(x => x.code === lang);
  const t = T[lang] || T.nl;

  // Close dropdown on outside click
  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const scriptClass = `script-${l.script}`;

  const ZONE_DATA = [
    { key:"zone1", name:t.zone1, desc:t.zone1d, col:"#dc7a3c", icon:"🏭" },
    { key:"zone2", name:t.zone2, desc:t.zone2d, col:"#4ade80", icon:"🌸" },
    { key:"zone3", name:t.zone3, desc:t.zone3d, col:"#a78bfa", icon:"⚛" },
    { key:"zone4", name:t.zone4, desc:t.zone4d, col:"#22c55e", icon:"🏛" },
    { key:"zone5", name:t.zone5, desc:t.zone5d, col:"#34d399", icon:"🔬" },
  ];

  const ENT_DATA = [
    { key:"jack", icon:"🐉", col:"#ef4444" },
    { key:"eliz", icon:"⚡", col:"#f59e0b" },
    { key:"dan",  icon:"🎵", col:"#22c55e" },
    { key:"sri",  icon:"🌾", col:"#a78bfa" },
    { key:"jeff", icon:"📦", col:"#38bdf8" },
  ];

  return (
    <div className={scriptClass} dir={l.dir}>
      <style>{css}</style>

      {/* ── NAV ── */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:900,
        background:"#050709ee", backdropFilter:"blur(16px)",
        borderBottom:"1px solid #111d2a", padding:"0 24px", height:60,
        display:"flex", alignItems:"center", gap:20 }}>

        {/* Logo */}
        <div className="grad" style={{ fontFamily:"'Unbounded',sans-serif",
          fontWeight:900, fontSize:20, letterSpacing:-1, flexShrink:0 }}>
          MOLGANG
        </div>

        {/* Nav links - desktop */}
        <div style={{ display:"flex", gap:4, flex:1,
          justifyContent:"center", flexWrap:"wrap" }}>
          {["nav_play","nav_about","nav_learn","nav_community"].map(k => (
            <span key={k} className="nav-link">{t[k]}</span>
          ))}
        </div>

        {/* Lang switcher + CTA */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <LangSwitcher current={lang} onChange={setLang}/>
          <button className="btn-primary" style={{ padding:"8px 18px", fontSize:11 }}>
            {t.hero_cta}
          </button>
        </div>
      </nav>

      {/* ── TICKER ── */}
      <div style={{ position:"fixed", top:60, left:0, right:0, zIndex:800,
        background:"#0a1018", borderBottom:"1px solid #111d2a",
        padding:"5px 0", overflow:"hidden" }}>
        <div style={{ display:"flex", gap:0, animation:"ticker 35s linear infinite",
          whiteSpace:"nowrap" }}>
          {[t.hero_stat1,t.hero_stat2,t.hero_stat3,t.hero_stat4,
            "MOLCO2","MOLN","ANK","MolChain","CarbonGhost",
            t.hero_stat1,t.hero_stat2,t.hero_stat3,t.hero_stat4,
            "MOLCO2","MOLN","ANK","MolChain","CarbonGhost",
          ].map((item,i) => (
            <span key={i} style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
              color:"#1a3040", padding:"0 16px" }}>◆ {item}</span>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section style={{ minHeight:"100vh", display:"flex", alignItems:"center",
        justifyContent:"center", flexDirection:"column",
        padding:"100px 24px 60px", textAlign:"center", direction:l.dir,
        background:"radial-gradient(ellipse 120% 60% at 50% 0%, #0d2218 0%, #050709 70%)",
        position:"relative", overflow:"hidden" }}>

        {/* Background atoms */}
        {[["⚛","left:10%,top:20%","#a78bfa"],["⚗","right:8%,top:30%","#22c55e"],
          ["💧","left:5%,bottom:25%","#38bdf8"],["⚡","right:12%,bottom:30%","#f59e0b"]
        ].map(([icon,pos,col],i) => (
          <div key={i} className="float" style={{
            position:"absolute",fontSize:48,opacity:.08,color:col,
            filter:`drop-shadow(0 0 20px ${col})`,
            animationDelay:`${i*0.8}s`,
            ...Object.fromEntries(pos.split(",").map(s => {
              const [k,v] = s.trim().split(":");
              return [k,v];
            }))
          }}>{icon}</div>
        ))}

        {/* Eyebrow */}
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
          color:"#22c55e", letterSpacing:4, marginBottom:16,
          background:"#22c55e15", padding:"5px 16px", borderRadius:20,
          border:"1px solid #22c55e33", display:"inline-block" }}>
          {t.hero_eyebrow}
        </div>

        {/* Main headline */}
        <h1 className="hero-title-font grad"
          style={{ fontSize:"clamp(44px,8vw,96px)", fontWeight:900,
            lineHeight:1, letterSpacing:-3, marginBottom:24,
            whiteSpace:"pre-line" }}>
          {t.hero_h1}
        </h1>

        {/* Sub */}
        <p style={{ fontSize:"clamp(15px,2.5vw,20px)", color:"#4a7a90",
          maxWidth:600, lineHeight:1.7, marginBottom:32 }}>
          {t.hero_sub}
        </p>

        {/* CTA buttons */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap",
          justifyContent:"center", marginBottom:48 }}>
          <button className="btn-primary">{t.hero_cta}</button>
          <button className="btn-secondary">{t.hero_cta2}</button>
        </div>

        {/* Stats row */}
        <div style={{ display:"flex", gap:2, flexWrap:"wrap",
          justifyContent:"center" }}>
          {[t.hero_stat1,t.hero_stat2,t.hero_stat3,t.hero_stat4].map((s,i) => (
            <div key={i} style={{ padding:"10px 20px",
              background:"#0b1018", border:"1px solid #111d2a",
              borderRadius: i===0?"10px 0 0 10px":i===3?"0 10px 10px 0":"0",
              borderLeft:i>0?"none":undefined }}>
              <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:18,
                fontWeight:900, color:"#22c55e", lineHeight:1 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Ghost chip */}
        <div className="ghost-chip" style={{ marginTop:40 }}>
          <span style={{ fontSize:16 }}>👻</span>
          <div>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
              color:"#ef4444", marginRight:6 }}>{t.ghost_label}</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
              color:"#ef4444aa", fontStyle:"italic" }}>{t.ghost_msg}</span>
          </div>
          <span style={{ color:"#22c55e", fontSize:11,
            fontFamily:"'DM Mono',monospace" }}>→ {t.ghost_reply}</span>
        </div>
      </section>

      {/* ── WHAT IS MOLGANG ── */}
      <section style={{ padding:"80px 24px", background:"#07090d",
        borderTop:"1px solid #111d2a", borderBottom:"1px solid #111d2a" }}>
        <div style={{ maxWidth:800, margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
            color:"#22c55e", letterSpacing:3, marginBottom:12 }}>
            // {t.section_what.toUpperCase()}
          </div>
          <h2 style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"clamp(24px,4vw,40px)",
            fontWeight:900, color:"#d4dfe8", marginBottom:20,
            lineHeight:1.2, letterSpacing:-1 }}>{t.section_what}</h2>
          <p style={{ fontSize:16, color:"#4a7a90", lineHeight:1.85,
            maxWidth:660, margin:"0 auto" }}>{t.what_p}</p>
        </div>
      </section>

      {/* ── HOW TO PLAY ── */}
      <section style={{ padding:"80px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
            color:"#22c55e", letterSpacing:3, marginBottom:12, textAlign:"center" }}>
            // {t.section_how.toUpperCase()}
          </div>
          <h2 style={{ fontFamily:"'Unbounded',sans-serif",
            fontSize:"clamp(24px,4vw,38px)", fontWeight:900, color:"#d4dfe8",
            marginBottom:40, textAlign:"center", lineHeight:1.2,
            letterSpacing:-1 }}>{t.section_how}</h2>

          <div style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16 }}>
            {[
              { t:t.how1_t, d:t.how1_d, icon:"⚛", col:"#a78bfa", n:"01" },
              { t:t.how2_t, d:t.how2_d, icon:"⚗", col:"#22c55e", n:"02" },
              { t:t.how3_t, d:t.how3_d, icon:"⛓", col:"#38bdf8", n:"03" },
              { t:t.how4_t, d:t.how4_d, icon:"🏦", col:"#f59e0b", n:"04" },
            ].map((step) => (
              <div key={step.n} className="step-card"
                style={{ borderTopColor:step.col }}>
                <div style={{ display:"flex", gap:12, alignItems:"center",
                  marginBottom:12 }}>
                  <div style={{ fontSize:28 }}>{step.icon}</div>
                  <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:28,
                    fontWeight:900, color:step.col, opacity:.3,
                    lineHeight:1 }}>{step.n}</div>
                </div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:16,
                  fontWeight:700, color:"#d4dfe8", marginBottom:10,
                  lineHeight:1.3 }}>{step.t}</div>
                <div style={{ fontSize:13, color:"#4a7a90",
                  lineHeight:1.7 }}>{step.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ZONES ── */}
      <section style={{ padding:"80px 24px",
        background:"radial-gradient(ellipse 80% 50% at 50% 50%, #0d1e14 0%, #050709 100%)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
            color:"#22c55e", letterSpacing:3, marginBottom:12, textAlign:"center" }}>
            // {t.section_zones.toUpperCase()}
          </div>
          <h2 style={{ fontFamily:"'Unbounded',sans-serif",
            fontSize:"clamp(24px,4vw,38px)", fontWeight:900, color:"#d4dfe8",
            marginBottom:40, textAlign:"center", letterSpacing:-1 }}>
            {t.section_zones}
          </h2>
          <div style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
            {ZONE_DATA.map(z => (
              <div key={z.key} className="zone-card"
                style={{ "--c":z.col } as any}>
                <div style={{ fontSize:32, marginBottom:12 }}>{z.icon}</div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:14,
                  fontWeight:700, color:z.col, marginBottom:8,
                  lineHeight:1.3 }}>{z.name}</div>
                <div style={{ fontSize:12, color:"#4a7a90",
                  lineHeight:1.6 }}>{z.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENTREPRENEURS ── */}
      <section style={{ padding:"80px 24px", borderTop:"1px solid #111d2a" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
            color:"#f59e0b", letterSpacing:3, marginBottom:12, textAlign:"center" }}>
            // {t.section_ents.toUpperCase()}
          </div>
          <h2 style={{ fontFamily:"'Unbounded',sans-serif",
            fontSize:"clamp(22px,4vw,36px)", fontWeight:900, color:"#d4dfe8",
            marginBottom:40, textAlign:"center", letterSpacing:-1,
            lineHeight:1.2 }}>{t.section_ents}</h2>
          <div style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
            {ENT_DATA.map(e => (
              <div key={e.key} className="ent-card">
                <div style={{ fontSize:28, marginBottom:10 }}>{e.icon}</div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13,
                  fontWeight:700, color:e.col, marginBottom:6,
                  lineHeight:1.3 }}>{t[`ent_${e.key}`]}</div>
                <div style={{ fontSize:12, color:"#4a7a90",
                  lineHeight:1.5 }}>{t[`ent_${e.key}_d`]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARABIC BUSINESS MODEL (only shown for Arabic) ── */}
      {lang === "ar" && t.biz_title && (
        <section style={{ padding:"80px 24px",
          background:"linear-gradient(135deg, #1a0a08 0%, #050709 50%, #0a0818 100%)",
          borderTop:"1px solid #2a1208" }}>
          <div style={{ maxWidth:1000, margin:"0 auto" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
              color:"#f59e0b", letterSpacing:2, marginBottom:12, textAlign:"center" }}>
              // {t.section_ents_biz.toUpperCase()}
            </div>
            <h2 style={{ fontFamily:"'Noto Naskh Arabic',sans-serif",
              fontSize:"clamp(24px,4vw,42px)", fontWeight:700, color:"#fbbf24",
              marginBottom:16, textAlign:"center", lineHeight:1.4 }}>
              {t.biz_title}
            </h2>
            <p style={{ fontSize:16, color:"#7a9080", lineHeight:2,
              maxWidth:700, margin:"0 auto 40px", textAlign:"center" }}>
              {t.biz_p}
            </p>
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
              {[
                { t:t.biz_1_t, d:t.biz_1_d, icon:"📚", col:"#22c55e", n:"٠١" },
                { t:t.biz_2_t, d:t.biz_2_d, icon:"🌾", col:"#f59e0b", n:"٠٢" },
                { t:t.biz_3_t, d:t.biz_3_d, icon:"🌐", col:"#38bdf8", n:"٠٣" },
                { t:t.biz_4_t, d:t.biz_4_d, icon:"⛓",  col:"#a78bfa", n:"٠٤" },
              ].map((step) => (
                <div key={step.n} style={{ padding:24, background:"#0e0c18",
                  borderRadius:12, border:"1px solid #1a1530",
                  borderTop:`3px solid ${step.col}` }}>
                  <div style={{ display:"flex", gap:12, alignItems:"center",
                    marginBottom:14, flexDirection:"row-reverse" }}>
                    <div style={{ fontSize:26 }}>{step.icon}</div>
                    <div style={{ fontFamily:"'Noto Naskh Arabic',sans-serif",
                      fontSize:28, fontWeight:700, color:step.col,
                      opacity:.3, lineHeight:1 }}>{step.n}</div>
                  </div>
                  <div style={{ fontFamily:"'Noto Naskh Arabic',sans-serif",
                    fontSize:16, fontWeight:700, color:"#d4dfe8",
                    marginBottom:10, lineHeight:1.6 }}>{step.t}</div>
                  <div style={{ fontFamily:"'Noto Naskh Arabic',sans-serif",
                    fontSize:13, color:"#4a7a90", lineHeight:1.85 }}>{step.d}</div>
                </div>
              ))}
            </div>
            {/* Arabic entrepreneur callout */}
            <div style={{ marginTop:32, padding:24,
              background:"#0a0c10", borderRadius:14,
              border:"1px solid #f59e0b22", textAlign:"center" }}>
              <div style={{ fontFamily:"'Noto Naskh Arabic',sans-serif",
                fontSize:18, color:"#fbbf24", lineHeight:1.8, marginBottom:8 }}>
                «لا تحتاج إلى محسوبية. تحتاج فقط إلى مول مسجّل.»
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
                color:"#2a4060" }}>— ANK Cooperative · MOLCHAIN · XRPL</div>
            </div>
          </div>
        </section>
      )}

      {/* ── MOL PHILOSOPHY ── */}
      <section style={{ padding:"80px 24px",
        background:"linear-gradient(135deg, #0d2218 0%, #050709 50%, #0a0d18 100%)" }}>
        <div style={{ maxWidth:760, margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
            color:"#22c55e", letterSpacing:3, marginBottom:20 }}>
            // {t.section_mol.toUpperCase()}
          </div>
          <blockquote style={{ fontFamily:"'Unbounded',sans-serif",
            fontSize:"clamp(18px,3.5vw,32px)", fontWeight:900,
            lineHeight:1.3, color:"#d4dfe8", marginBottom:12,
            letterSpacing:-.5 }} className="grad">
            {t.mol_q}
          </blockquote>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11,
            color:"#2a4a5a", marginBottom:28 }}>{t.mol_attr}</div>
          <p style={{ fontSize:15, color:"#4a7a90", lineHeight:1.85,
            maxWidth:580, margin:"0 auto" }}>{t.mol_p}</p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:"80px 24px", textAlign:"center",
        borderTop:"1px solid #111d2a", borderBottom:"1px solid #111d2a" }}>
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <div style={{ fontFamily:"'Unbounded',sans-serif",
            fontSize:"clamp(28px,5vw,52px)", fontWeight:900, color:"#d4dfe8",
            marginBottom:16, letterSpacing:-2, lineHeight:1 }} className="glow">
            {t.cta_h}
          </div>
          <p style={{ fontSize:15, color:"#4a7a90", marginBottom:32 }}>
            {t.cta_sub}
          </p>
          <button className="btn-primary pulse" style={{ fontSize:15, padding:"16px 40px" }}>
            {t.cta_btn}
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:"32px 24px", background:"#030507",
        borderTop:"1px solid #0b1018" }}>
        <div style={{ maxWidth:1100, margin:"0 auto",
          display:"flex", gap:16, flexWrap:"wrap",
          justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div className="grad" style={{ fontFamily:"'Unbounded',sans-serif",
              fontWeight:900, fontSize:16, letterSpacing:-1, marginBottom:4 }}>
              MOLGANG
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
              color:"#1a2a3a" }}>{t.footer_made}</div>
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9,
            color:"#1a3040", textAlign:"center" }}>
            {t.footer_edu}<br/>
            <span style={{ color:"#0d2030" }}>WBSO SO26017891 · XRPL · Roblox Platform</span>
          </div>
          {/* Language flags strip */}
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {LANGS.map(lg => (
              <button key={lg.code}
                onClick={() => setLang(lg.code)}
                title={lg.native}
                style={{ fontSize:20, background:lang===lg.code?"#22c55e18":"transparent",
                  border:`1px solid ${lang===lg.code?"#22c55e33":"transparent"}`,
                  borderRadius:6, padding:"3px 6px", cursor:"pointer",
                  transition:"all .15s" }}>
                {lg.flag}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
