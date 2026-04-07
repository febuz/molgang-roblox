-- ReplicatedStorage/Data/Elements.lua
-- Complete Periodic Table for MOLGANG: The Molecular Chain
-- All 118 elements with real atomic masses, groups, periods, colors, rarity, and educational facts (NL/EN)

local Elements = {}

-- Group color mapping for visual coding
Elements.GroupColors = {
	[1]  = Color3.fromRGB(255,68,68),     -- Alkali metals: RED
	[2]  = Color3.fromRGB(255,140,68),    -- Alkaline earth: ORANGE
	[3]  = Color3.fromRGB(68,136,204),    -- Group 3-12 Transition metals: BLUE-GREY
	[4]  = Color3.fromRGB(68,136,204),
	[5]  = Color3.fromRGB(68,136,204),
	[6]  = Color3.fromRGB(68,136,204),
	[7]  = Color3.fromRGB(68,136,204),
	[8]  = Color3.fromRGB(68,136,204),
	[9]  = Color3.fromRGB(68,136,204),
	[10] = Color3.fromRGB(68,136,204),
	[11] = Color3.fromRGB(68,136,204),
	[12] = Color3.fromRGB(68,136,204),
	[13] = Color3.fromRGB(100,200,100),   -- Post-transition metals/metalloids: LIGHT GREEN
	[14] = Color3.fromRGB(100,200,100),
	[15] = Color3.fromRGB(100,200,100),
	[16] = Color3.fromRGB(100,200,100),
	[17] = Color3.fromRGB(68,255,136),    -- Halogens: GREEN
	[18] = Color3.fromRGB(204,68,255),    -- Noble gases: NEON PURPLE
}

-- Spawn rarity weights
Elements.SpawnWeight = {common=60, uncommon=25, rare=10, epic=4, legendary=1}

Elements.Table = {
	----------------------------------------------------------------------
	-- PERIOD 1
	----------------------------------------------------------------------
	[1] = {
		name='Hydrogen', sym='H', mass=1.008, group=1, period=1,
		color=Color3.fromRGB(255,68,68), rarity='common',
		facts={'Meest voorkomend element in het universum','Brandstofcel: 2H2 + O2 -> 2H2O','Watermolecuul H2O - basis van al het leven'}
	},
	[2] = {
		name='Helium', sym='He', mass=4.003, group=18, period=1,
		color=Color3.fromRGB(204,68,255), rarity='common',
		facts={'Edelgas - reageert nergens mee','Ballonnen stijgen door lage dichtheid','Koelt supergeleidende MRI-magneten'}
	},

	----------------------------------------------------------------------
	-- PERIOD 2
	----------------------------------------------------------------------
	[3] = {
		name='Lithium', sym='Li', mass=6.941, group=1, period=2,
		color=Color3.fromRGB(255,68,68), rarity='uncommon',
		facts={'Lichtste metaal dat bestaat','Li-ion batterijen in telefoons en laptops','Gebruikt in medicijnen tegen bipolaire stoornis'}
	},
	[4] = {
		name='Beryllium', sym='Be', mass=9.012, group=2, period=2,
		color=Color3.fromRGB(255,140,68), rarity='uncommon',
		facts={'Extreem licht en sterk metaal','Gebruikt in ruimtevaart en satellieten','Transparant voor roentgenstralen'}
	},
	[5] = {
		name='Boron', sym='B', mass=10.811, group=13, period=2,
		color=Color3.fromRGB(100,200,100), rarity='uncommon',
		facts={'Halfmetaal - tussen metaal en niet-metaal','Borosilicaatglas (Pyrex) is hittebestendig','Boorax wordt gebruikt als schoonmaakmiddel'}
	},
	[6] = {
		name='Carbon', sym='C', mass=12.011, group=14, period=2,
		color=Color3.fromRGB(100,200,100), rarity='common',
		facts={'Basis van alle organische chemie','Diamant en grafiet zijn allebei koolstof','Vormt meer verbindingen dan elk ander element'}
	},
	[7] = {
		name='Nitrogen', sym='N', mass=14.007, group=15, period=2,
		color=Color3.fromRGB(100,200,100), rarity='common',
		facts={'78% van de lucht is stikstof','Vloeibare N2 wordt gebruikt om te koelen','Essentieel voor aminozuren en DNA'}
	},
	[8] = {
		name='Oxygen', sym='O', mass=15.999, group=16, period=2,
		color=Color3.fromRGB(100,200,100), rarity='common',
		facts={'21% van de lucht - wij ademen het in','Nodig voor verbranding en roest','Ozon O3 beschermt tegen UV-straling'}
	},
	[9] = {
		name='Fluorine', sym='F', mass=18.998, group=17, period=2,
		color=Color3.fromRGB(68,255,136), rarity='uncommon',
		facts={'Meest reactieve element dat bestaat','Zit in tandpasta als fluoride','Teflon (PTFE) antiaanbaklaag bevat fluor'}
	},
	[10] = {
		name='Neon', sym='Ne', mass=20.180, group=18, period=2,
		color=Color3.fromRGB(204,68,255), rarity='uncommon',
		facts={'Neonlicht geeft rood-oranje gloed','Edelgas - volledig gevulde elektronenschil','Wordt gebruikt in hoogspanningsindicatoren'}
	},

	----------------------------------------------------------------------
	-- PERIOD 3
	----------------------------------------------------------------------
	[11] = {
		name='Sodium', sym='Na', mass=22.990, group=1, period=3,
		color=Color3.fromRGB(255,68,68), rarity='common',
		facts={'Keukenzout is NaCl - natriumchloride','Reageert hevig met water - explosief!','Natriumlampen geven geel straatlicht'}
	},
	[12] = {
		name='Magnesium', sym='Mg', mass=24.305, group=2, period=3,
		color=Color3.fromRGB(255,140,68), rarity='common',
		facts={'Brandt met felwit licht - vuurwerk','Essentieel mineraal voor je spieren','Legeringen met aluminium in vliegtuigen'}
	},
	[13] = {
		name='Aluminium', sym='Al', mass=26.982, group=13, period=3,
		color=Color3.fromRGB(100,200,100), rarity='common',
		facts={'Meest voorkomende metaal in aardkorst','Blikjes, vliegtuigen, aluminiumfolie','100% recyclebaar zonder kwaliteitsverlies'}
	},
	[14] = {
		name='Silicon', sym='Si', mass=28.086, group=14, period=3,
		color=Color3.fromRGB(100,200,100), rarity='common',
		facts={'Basis van alle computerchips en processors','Halfgeleider - hart van de technologie','Siliconen in Molgang circuits en sensoren'}
	},
	[15] = {
		name='Phosphorus', sym='P', mass=30.974, group=15, period=3,
		color=Color3.fromRGB(100,200,100), rarity='common',
		facts={'Witte fosfor licht op in het donker','Zit in DNA, RNA en ATP - energiemolecuul','Lucifers bevatten rode fosfor'}
	},
	[16] = {
		name='Sulfur', sym='S', mass=32.065, group=16, period=3,
		color=Color3.fromRGB(100,200,100), rarity='common',
		facts={'Rotte eieren ruiken naar H2S','Zwavelzuur H2SO4 is meest geproduceerde chemicalie','Vulkanische bronnen bevatten veel zwavel'}
	},
	[17] = {
		name='Chlorine', sym='Cl', mass=35.453, group=17, period=3,
		color=Color3.fromRGB(68,255,136), rarity='common',
		facts={'Desinfecteert zwembadwater','Keukenzout NaCl bevat chloor','PVC plastic wordt gemaakt met chloor'}
	},
	[18] = {
		name='Argon', sym='Ar', mass=39.948, group=18, period=3,
		color=Color3.fromRGB(204,68,255), rarity='common',
		facts={'Derde meest voorkomende gas in lucht (0.93%)','Edelgas - gebruikt in gloeilampen','Argonlassen beschermt metaal tegen oxidatie'}
	},

	----------------------------------------------------------------------
	-- PERIOD 4
	----------------------------------------------------------------------
	[19] = {
		name='Potassium', sym='K', mass=39.098, group=1, period=4,
		color=Color3.fromRGB(255,68,68), rarity='common',
		facts={'Bananen zijn rijk aan kalium','K komt van kalium (Latijn)','Essentieel voor zenuwsignalen in je lichaam'}
	},
	[20] = {
		name='Calcium', sym='Ca', mass=40.078, group=2, period=4,
		color=Color3.fromRGB(255,140,68), rarity='common',
		facts={'Bouwsteen van botten en tanden','Kalk CaCO3 in schelpen en koraal','Cement en beton bevatten calciumverbindingen'}
	},
	[21] = {
		name='Scandium', sym='Sc', mass=44.956, group=3, period=4,
		color=Color3.fromRGB(68,136,204), rarity='uncommon',
		facts={'Ontdekt in Scandinavische mineralen','Lichte legeringen voor fietsframes','Scandiumjodide in stadionverlichting'}
	},
	[22] = {
		name='Titanium', sym='Ti', mass=47.867, group=4, period=4,
		color=Color3.fromRGB(68,136,204), rarity='uncommon',
		facts={'Sterk als staal maar 45% lichter','Vliegtuigmotoren en heupprotheses','TiO2 witte verf en zonnebrandcreme'}
	},
	[23] = {
		name='Vanadium', sym='V', mass=50.942, group=5, period=4,
		color=Color3.fromRGB(68,136,204), rarity='uncommon',
		facts={'V2O5 katalysator in batterijen','Slakkenspoor V-recovery in Molgang','Maakt staal sterker en veerbestendiger'}
	},
	[24] = {
		name='Chromium', sym='Cr', mass=51.996, group=6, period=4,
		color=Color3.fromRGB(68,136,204), rarity='uncommon',
		facts={'Verchroomde bumpers en kranen','Roestvrij staal bevat 10-20% chroom','Cr2O3 geeft groene kleur aan glas'}
	},
	[25] = {
		name='Manganese', sym='Mn', mass=54.938, group=7, period=4,
		color=Color3.fromRGB(68,136,204), rarity='uncommon',
		facts={'In batterijen als MnO2 depolarisator','Maakt staal hard en slijtvast','Mangaanknollen op de oceaanbodem'}
	},
	[26] = {
		name='Iron', sym='Fe', mass=55.845, group=8, period=4,
		color=Color3.fromRGB(68,136,204), rarity='common',
		facts={'IJzer is het meest voorkomende element op Aarde (kern)','Hemoglobine bevat ijzer - maakt bloed rood','Staal = ijzer + koolstof legering'}
	},
	[27] = {
		name='Cobalt', sym='Co', mass=58.933, group=9, period=4,
		color=Color3.fromRGB(68,136,204), rarity='uncommon',
		facts={'Kobaltblauw - intense blauwe pigment','In Li-ion batterijen als kathode','Co-60 gebruikt in bestralingstherapie'}
	},
	[28] = {
		name='Nickel', sym='Ni', mass=58.693, group=10, period=4,
		color=Color3.fromRGB(68,136,204), rarity='uncommon',
		facts={'Vernikkeld bestek en munten','Nikkel-waterstof batterijen in satellieten','Roestvrijstaal bevat 8-12% nikkel'}
	},
	[29] = {
		name='Copper', sym='Cu', mass=63.546, group=11, period=4,
		color=Color3.fromRGB(68,136,204), rarity='uncommon',
		facts={'Uitstekende geleider - elektrische bedrading','Vrijheidsbeeld is groen door koperoxidatie','Koperen leidingen voor drinkwater'}
	},
	[30] = {
		name='Zinc', sym='Zn', mass=65.380, group=12, period=4,
		color=Color3.fromRGB(68,136,204), rarity='uncommon',
		facts={'Verzinkt staal tegen roest','Zinkzalf op de huid bij irritatie','Essentieel spoorelement voor immuunsysteem'}
	},
	[31] = {
		name='Gallium', sym='Ga', mass=69.723, group=13, period=4,
		color=Color3.fromRGB(100,200,100), rarity='rare',
		facts={'Smelt in je hand - smeltpunt 29.8C','GaAs halfgeleider in LED-verlichting','Gallium-thermometers vervangen kwik'}
	},
	[32] = {
		name='Germanium', sym='Ge', mass=72.630, group=14, period=4,
		color=Color3.fromRGB(100,200,100), rarity='rare',
		facts={'Eerste transistor gemaakt met germanium','Halfgeleider voor infrarood-optica','Genoemd naar Duitsland (Germania)'}
	},
	[33] = {
		name='Arsenic', sym='As', mass=74.922, group=15, period=4,
		color=Color3.fromRGB(100,200,100), rarity='rare',
		facts={'Historisch bekend als gifstof','GaAs in zonnecellen en lasers','Houtconserveringsmiddel (CCA behandeling)'}
	},
	[34] = {
		name='Selenium', sym='Se', mass=78.960, group=16, period=4,
		color=Color3.fromRGB(100,200,100), rarity='rare',
		facts={'Essentieel spoorelement in voeding','Fotogeleider in oude kopieerapparaten','Antioxidant selenomethionine'}
	},
	[35] = {
		name='Bromine', sym='Br', mass=79.904, group=17, period=4,
		color=Color3.fromRGB(68,255,136), rarity='rare',
		facts={'Enige niet-metaal dat vloeibaar is bij kamertemperatuur','Broomwater test op onverzadigde bindingen','Vlamvertragers in elektronica'}
	},
	[36] = {
		name='Krypton', sym='Kr', mass=83.798, group=18, period=4,
		color=Color3.fromRGB(204,68,255), rarity='rare',
		facts={'Niet het thuisplaneet van Superman','KrF-excimeerlaser voor oogchirurgie','Kryptonlamp ijkte ooit de standaardmeter'}
	},

	----------------------------------------------------------------------
	-- PERIOD 5
	----------------------------------------------------------------------
	[37] = {
		name='Rubidium', sym='Rb', mass=85.468, group=1, period=5,
		color=Color3.fromRGB(255,68,68), rarity='rare',
		facts={'Reageert explosief met water','Rubidiumklokken extreem nauwkeurig','Gebruikt in GPS-satellieten voor timing'}
	},
	[38] = {
		name='Strontium', sym='Sr', mass=87.620, group=2, period=5,
		color=Color3.fromRGB(255,140,68), rarity='rare',
		facts={'Rode kleur in vuurwerk door SrCl2','Sr-90 radioactief bijproduct kernreactor','Strontiumranelaat versterkt botten'}
	},
	[39] = {
		name='Yttrium', sym='Y', mass=88.906, group=3, period=5,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'Rode kleur in oude TV-beeldbuizen','YAG-laser voor oogbehandelingen','Ontdekt in Ytterby, Zweden'}
	},
	[40] = {
		name='Zirconium', sym='Zr', mass=91.224, group=4, period=5,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'Kubiek zirkonia lijkt op diamant','Omhulling van kernreactorbrandstof','Bestand tegen hoge temperaturen en corrosie'}
	},
	[41] = {
		name='Niobium', sym='Nb', mass=92.906, group=5, period=5,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'Supergeleidend bij lage temperatuur','Gebruikt in MRI-magneten','Nb-Ti draad in deeltjesversnellers'}
	},
	[42] = {
		name='Molybdenum', sym='Mo', mass=95.950, group=6, period=5,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'MoS2 droge smeermiddel voor machines','In staal voor hoge temperatuur toepassingen','Essentieel spoorelement in enzymen'}
	},
	[43] = {
		name='Technetium', sym='Tc', mass=98.000, group=7, period=5,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Eerste kunstmatig gemaakte element','Tc-99m meest gebruikte medische isotoop','Alle isotopen zijn radioactief'}
	},
	[44] = {
		name='Ruthenium', sym='Ru', mass=101.070, group=8, period=5,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'Katalysator in chemische industrie','Hardingsmiddel voor platina en palladium','Genoemd naar Rusland (Ruthenia)'}
	},
	[45] = {
		name='Rhodium', sym='Rh', mass=102.906, group=9, period=5,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Duurste edelmetaal ter wereld','In katalysatoren van auto-uitlaat','Spiegelcoating met hoge reflectie'}
	},
	[46] = {
		name='Palladium', sym='Pd', mass=106.420, group=10, period=5,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Autokatalysator zet CO om in CO2','Palladium absorbeert 900x eigen volume waterstof','Witgoud is legering met palladium'}
	},
	[47] = {
		name='Silver', sym='Ag', mass=107.868, group=11, period=5,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Beste elektrische geleider van alle metalen','AgBr in analoge fotografie','Zilver heeft antibacteriele werking'}
	},
	[48] = {
		name='Cadmium', sym='Cd', mass=112.411, group=12, period=5,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'CdS geel pigment in verf','Giftig zwaar metaal - nu grotendeels verboden','NiCd oplaadbare batterijen (verouderd)'}
	},
	[49] = {
		name='Indium', sym='In', mass=114.818, group=13, period=5,
		color=Color3.fromRGB(100,200,100), rarity='epic',
		facts={'ITO coating op touchscreens','Indium maakt een krakend geluid als je het buigt','Zeer zacht metaal - lager dan lood'}
	},
	[50] = {
		name='Tin', sym='Sn', mass=118.710, group=14, period=5,
		color=Color3.fromRGB(100,200,100), rarity='rare',
		facts={'Blikken conserven zijn vertind staal','Soldeer voor elektronische verbindingen','Sn van Stannum (Latijn)'}
	},
	[51] = {
		name='Antimony', sym='Sb', mass=121.760, group=15, period=5,
		color=Color3.fromRGB(100,200,100), rarity='rare',
		facts={'Vlamvertrager Sb2O3 in kunststoffen','Oude Egyptenaren gebruikten het als oogmake-up','Halfmetaal met ongewone eigenschappen'}
	},
	[52] = {
		name='Tellurium', sym='Te', mass=127.600, group=16, period=5,
		color=Color3.fromRGB(100,200,100), rarity='epic',
		facts={'CdTe dunne-film zonnecellen','Extreem zeldzaam in aardkorst','Geeft knoflookgeur aan je adem bij blootstelling'}
	},
	[53] = {
		name='Iodine', sym='I', mass=126.904, group=17, period=5,
		color=Color3.fromRGB(68,255,136), rarity='epic',
		facts={'Jodium in zout voorkomt schildklierziekte','Jodiumtinctuur als wonddesinfectie','Sublimeert direct van vast naar gas'}
	},
	[54] = {
		name='Xenon', sym='Xe', mass=131.293, group=18, period=5,
		color=Color3.fromRGB(204,68,255), rarity='epic',
		facts={'Xenonlampen in bioscopen en koplampen','Xenon-verdoving in chirurgie','Ionenmotor voor ruimtesondes'}
	},

	----------------------------------------------------------------------
	-- PERIOD 6
	----------------------------------------------------------------------
	[55] = {
		name='Caesium', sym='Cs', mass=132.905, group=1, period=6,
		color=Color3.fromRGB(255,68,68), rarity='rare',
		facts={'Cesiumklok definieert de seconde','Meest elektropositieve element','Reageert explosief met water en ijs'}
	},
	[56] = {
		name='Barium', sym='Ba', mass=137.327, group=2, period=6,
		color=Color3.fromRGB(255,140,68), rarity='rare',
		facts={'Bariumpap voor maag-roentgenfoto','Groene kleur in vuurwerk door BaCl2','Bariet BaSO4 in boormodder voor olie'}
	},

	-- LANTHANIDES (Z=57-71, group=3, period=6)
	[57] = {
		name='Lanthanum', sym='La', mass=138.905, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Startpunt van de lanthaniden','La in hybride autobatterijen (NiMH)','Lanthaan in cameralenscoating'}
	},
	[58] = {
		name='Cerium', sym='Ce', mass=140.116, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Meest voorkomende zeldzame-aardmetaal','CeO2 polijstmiddel voor glas','Vuursteentje in aanstekers bevat cerium'}
	},
	[59] = {
		name='Praseodymium', sym='Pr', mass=140.908, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Groene kleur in speciaal glas','Pr-Nd magneten in windturbines','Naam betekent groene tweeling'}
	},
	[60] = {
		name='Neodymium', sym='Nd', mass=144.242, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Sterkste permanente magneten NdFeB','In koptelefoons en harde schijven','Nd-YAG laser in oogchirurgie'}
	},
	[61] = {
		name='Promethium', sym='Pm', mass=145.000, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Alle isotopen radioactief','Pm-147 in nucleaire batterijen','Genoemd naar Prometheus uit Griekse mythe'}
	},
	[62] = {
		name='Samarium', sym='Sm', mass=150.360, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'SmCo magneten bestand tegen hitte','Sm-153 voor behandeling van botkanker','Genoemd naar mineraal samarskiet'}
	},
	[63] = {
		name='Europium', sym='Eu', mass=151.964, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Rode fosfor in TV-schermen en bankbiljetten','Eurobankbiljetten bevatten Eu anti-vervalsing','Genoemd naar het continent Europa'}
	},
	[64] = {
		name='Gadolinium', sym='Gd', mass=157.250, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'MRI contrastmiddel Gd-DTPA','Sterkste paramagnetisch bij kamertemperatuur','Neutronenvanger in kernreactoren'}
	},
	[65] = {
		name='Terbium', sym='Tb', mass=158.925, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Groene fosfor in LED en TL-buizen','Tb in Terfenol-D akoestische sensoren','Ontdekt in Ytterby, Zweden'}
	},
	[66] = {
		name='Dysprosium', sym='Dy', mass=162.500, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Maakt NdFeB magneten hittebestendig','Naam betekent moeilijk te verkrijgen','Dy in kernreactorcontrolestaven'}
	},
	[67] = {
		name='Holmium', sym='Ho', mass=164.930, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Sterkste magnetische moment van alle elementen','Ho-YAG laser voor niersteenvergruizing','Genoemd naar Stockholm (Holmia)'}
	},
	[68] = {
		name='Erbium', sym='Er', mass=167.259, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Er-doped glasvezelversterker voor internet','Roze kleur in speciaal glas en keramiek','Erbiumlaser voor huidbehandeling'}
	},
	[69] = {
		name='Thulium', sym='Tm', mass=168.934, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Zeldzaamste lanthanide in aardkorst','Tm-170 voor draagbare rontgenapparaten','Genoemd naar Thule (oud-Scandinavie)'}
	},
	[70] = {
		name='Ytterbium', sym='Yb', mass=173.045, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Yb-doped fiber laser voor industrie','Atoomklok met ytterbium extreem precies','Vierde element genoemd naar Ytterby'}
	},
	[71] = {
		name='Lutetium', sym='Lu', mass=174.967, group=3, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Laatste lanthanide in de rij','Lu-176 voor datering van meteorieten','PET-scan tracer Lu-177 voor kanker'}
	},

	-- Continue period 6 (post-lanthanides)
	[72] = {
		name='Hafnium', sym='Hf', mass=178.490, group=4, period=6,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'Controlestaven in kernreactoren','HfO2 in moderne computerchips (high-k)','Altijd gevonden samen met zirkonium'}
	},
	[73] = {
		name='Tantalum', sym='Ta', mass=180.948, group=5, period=6,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'Tantaalcondensatoren in elke smartphone','Extreem corrosiebestendig metaal','Conflictmineraal uit Congo'}
	},
	[74] = {
		name='Tungsten', sym='W', mass=183.840, group=6, period=6,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'Hoogste smeltpunt van alle metalen (3422C)','Wolfraamdraad in gloeilampen','W van Wolfram (Duitse naam)'}
	},
	[75] = {
		name='Rhenium', sym='Re', mass=186.207, group=7, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Laatste stabiele element dat ontdekt werd','Superlegering in straalmotor turbinebladen','Een van de zeldzaamste elementen op Aarde'}
	},
	[76] = {
		name='Osmium', sym='Os', mass=190.230, group=8, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Dichtstste element - 22.59 g/cm3','OsO4 kleurstof voor elektronenmicroscopie','Extreem hard maar bros metaal'}
	},
	[77] = {
		name='Iridium', sym='Ir', mass=192.217, group=9, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Meest corrosiebestendige metaal','Iridiumlaag bewijs voor meteorietinslag (dino-extinctie)','Bougies met iridium tip gaan langer mee'}
	},
	[78] = {
		name='Platinum', sym='Pt', mass=195.084, group=10, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Autokatalysator voor schone uitlaat','Platina sieraden en investering','Cisplatine Pt-medicijn tegen kanker'}
	},
	[79] = {
		name='Gold', sym='Au', mass=196.967, group=11, period=6,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Roest niet - onverwoestbaar edelmetaal','Goudblad zo dun als 100 nanometer','Aurum - gebruikt in elektronica connectoren'}
	},
	[80] = {
		name='Mercury', sym='Hg', mass=200.590, group=12, period=6,
		color=Color3.fromRGB(68,136,204), rarity='rare',
		facts={'Enige metaal dat vloeibaar is bij kamertemperatuur','Kwikthermometer - nu grotendeels verboden','Hg van Hydrargyrum (vloeibaar zilver)'}
	},
	[81] = {
		name='Thallium', sym='Tl', mass=204.383, group=13, period=6,
		color=Color3.fromRGB(100,200,100), rarity='rare',
		facts={'Extreem giftig - gebruikt als rattengif','Tl-201 voor hartscans in nucleaire geneeskunde','Ontdekt door groene spectraallijn'}
	},
	[82] = {
		name='Lead', sym='Pb', mass=207.200, group=14, period=6,
		color=Color3.fromRGB(100,200,100), rarity='rare',
		facts={'Loodschort beschermt tegen rontgenstralen','Pb van Plumbum - loodgieter komt hiervan','Loodvrije benzine sinds jaren 90'}
	},
	[83] = {
		name='Bismuth', sym='Bi', mass=208.980, group=15, period=6,
		color=Color3.fromRGB(100,200,100), rarity='epic',
		facts={'Prachtige regenboogkristallen door oxidatie','Pepto-Bismol maagmedicijn bevat bismut','Minst radioactieve radioactieve element'}
	},
	[84] = {
		name='Polonium', sym='Po', mass=209.000, group=16, period=6,
		color=Color3.fromRGB(100,200,100), rarity='legendary',
		facts={'Ontdekt door Marie Curie','Extreem radioactief en gevaarlijk','Po-210 warmtebron in ruimtesondes'}
	},
	[85] = {
		name='Astatine', sym='At', mass=210.000, group=17, period=6,
		color=Color3.fromRGB(68,255,136), rarity='legendary',
		facts={'Zeldzaamste natuurlijke element op Aarde','Minder dan 30 gram in hele aardkorst','At-211 experimenteel voor kankertherapie'}
	},
	[86] = {
		name='Radon', sym='Rn', mass=222.000, group=18, period=6,
		color=Color3.fromRGB(204,68,255), rarity='legendary',
		facts={'Radioactief edelgas - onzichtbaar gevaar','Radonmeting in huizen verplicht in sommige landen','Tweede oorzaak van longkanker na roken'}
	},

	----------------------------------------------------------------------
	-- PERIOD 7
	----------------------------------------------------------------------
	[87] = {
		name='Francium', sym='Fr', mass=223.000, group=1, period=7,
		color=Color3.fromRGB(255,68,68), rarity='legendary',
		facts={'Meest instabiele natuurlijke element','Halfwaardetijd slechts 22 minuten','Minder dan 30 gram bestaat op Aarde'}
	},
	[88] = {
		name='Radium', sym='Ra', mass=226.000, group=2, period=7,
		color=Color3.fromRGB(255,140,68), rarity='legendary',
		facts={'Ontdekt door Marie en Pierre Curie','Gloeit blauw in het donker door radioactiviteit','Vroeger in lichtgevende wijzerplaten'}
	},

	-- ACTINIDES (Z=89-103, group=3, period=7)
	[89] = {
		name='Actinium', sym='Ac', mass=227.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Naamgever van de actiniden','Gloeit blauw door intense radioactiviteit','Ac-225 veelbelovend voor kankertherapie'}
	},
	[90] = {
		name='Thorium', sym='Th', mass=232.038, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Thoriumreactor als alternatief voor uranium','Genoemd naar Thor, Noorse god van de donder','Th in gloeikousjes voor gaslantaarns'}
	},
	[91] = {
		name='Protactinium', sym='Pa', mass=231.036, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Vervalt tot actinium - proto-actinium','Extreem zeldzaam en radioactief','Een van de duurste elementen'}
	},
	[92] = {
		name='Uranium', sym='U', mass=238.029, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='epic',
		facts={'Kernenergie door U-235 splijting','Uraniumglas glowt groen onder UV-licht','Dichter dan lood - gebruikt als ballast'}
	},
	[93] = {
		name='Neptunium', sym='Np', mass=237.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Eerste transuranium element','Genoemd naar planeet Neptunus','Bijproduct van kernreactoren'}
	},
	[94] = {
		name='Plutonium', sym='Pu', mass=244.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Pu-238 warmtebron in Mars-rovers','Kernwapen materiaal - zwaar bewaakt','Genoemd naar dwergplaneet Pluto'}
	},
	[95] = {
		name='Americium', sym='Am', mass=243.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Am-241 in elke rookmelder','Genoemd naar Amerika','Ontdekt in 1944 tijdens Manhattan Project'}
	},
	[96] = {
		name='Curium', sym='Cm', mass=247.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Marie en Pierre Curie','Cm-244 warmtebron in ruimtevaart','Gloeit in het donker door radioactiviteit'}
	},
	[97] = {
		name='Berkelium', sym='Bk', mass=247.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Berkeley, Californie','Slechts microgrammen ooit geproduceerd','Bk-249 gebruikt om zwaardere elementen te maken'}
	},
	[98] = {
		name='Californium', sym='Cf', mass=251.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Cf-252 neutronenbron voor analyse','Gebruikt om gouderts op te sporen','Een microgram kost 27 miljoen dollar'}
	},
	[99] = {
		name='Einsteinium', sym='Es', mass=252.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Ontdekt in stof van eerste waterstofbom','Genoemd naar Albert Einstein','Gloeit blauw door radioactiviteit'}
	},
	[100] = {
		name='Fermium', sym='Fm', mass=257.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Enrico Fermi','Ontdekt samen met einsteinium in 1952','Kan niet in bulk geproduceerd worden'}
	},
	[101] = {
		name='Mendelevium', sym='Md', mass=258.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Dmitri Mendelejev','Slechts 17 atomen in eerste experiment','Mendelejev voorspelde het periodiek systeem'}
	},
	[102] = {
		name='Nobelium', sym='No', mass=259.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Alfred Nobel','Halfwaardetijd slechts 58 minuten','Meest stabiele +2 oxidatietoestand van actiniden'}
	},
	[103] = {
		name='Lawrencium', sym='Lr', mass=266.000, group=3, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Laatste actinide in de rij','Genoemd naar Ernest Lawrence (cyclotron)','Lr-262 halfwaardetijd slechts 4 uur'}
	},

	-- Continue period 7 (post-actinides / transactinides)
	[104] = {
		name='Rutherfordium', sym='Rf', mass=267.000, group=4, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Ernest Rutherford','Eerste transactinide element','Bestaat slechts milliseconden'}
	},
	[105] = {
		name='Dubnium', sym='Db', mass=268.000, group=5, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Dubna, Rusland','Gelijktijdig geclaimd door USA en USSR','Halfwaardetijd ongeveer 28 uur'}
	},
	[106] = {
		name='Seaborgium', sym='Sg', mass=269.000, group=6, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Glenn Seaborg','Seaborg ontdekte 10 transuraniumelementen','Slechts enkele atomen ooit gemaakt'}
	},
	[107] = {
		name='Bohrium', sym='Bh', mass=270.000, group=7, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Niels Bohr','Gemaakt in deeltjesversneller','Halfwaardetijd minder dan een seconde'}
	},
	[108] = {
		name='Hassium', sym='Hs', mass=277.000, group=8, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Hessen, Duitsland','Gemaakt door Peter Armbruster in Darmstadt','HsO4 mogelijk vluchtig zoals OsO4'}
	},
	[109] = {
		name='Meitnerium', sym='Mt', mass=278.000, group=9, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Lise Meitner - kernsplijting','Eerste element genoemd naar een vrouw','Halfwaardetijd slechts 7.6 seconden'}
	},
	[110] = {
		name='Darmstadtium', sym='Ds', mass=281.000, group=10, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Darmstadt, Duitsland','Gemaakt door bombardement van lood met nikkel','Bestaat slechts microseconden'}
	},
	[111] = {
		name='Roentgenium', sym='Rg', mass=282.000, group=11, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Wilhelm Rontgen (rontgenstralen)','Vermoedelijk een edelmetaal zoals goud','Slechts enkele atomen waargenomen'}
	},
	[112] = {
		name='Copernicium', sym='Cn', mass=285.000, group=12, period=7,
		color=Color3.fromRGB(68,136,204), rarity='legendary',
		facts={'Genoemd naar Nicolaus Copernicus','Mogelijk vloeibaar bij kamertemperatuur','Cn gedraagt zich als een edelgas-achtig metaal'}
	},
	[113] = {
		name='Nihonium', sym='Nh', mass=286.000, group=13, period=7,
		color=Color3.fromRGB(100,200,100), rarity='legendary',
		facts={'Eerste element ontdekt in Azie (Japan)','Nihon betekent Japan in het Japans','Halfwaardetijd slechts 10 seconden'}
	},
	[114] = {
		name='Flerovium', sym='Fl', mass=289.000, group=14, period=7,
		color=Color3.fromRGB(100,200,100), rarity='legendary',
		facts={'Genoemd naar Flerov Lab in Dubna','Mogelijk een vluchtig metaal','Fl op eiland van stabiliteit hypothese'}
	},
	[115] = {
		name='Moscovium', sym='Mc', mass=290.000, group=15, period=7,
		color=Color3.fromRGB(100,200,100), rarity='legendary',
		facts={'Genoemd naar regio Moskou','Vervalt snel door alfaverval','Element 115 beroemd uit UFO-conspiraties'}
	},
	[116] = {
		name='Livermorium', sym='Lv', mass=293.000, group=16, period=7,
		color=Color3.fromRGB(100,200,100), rarity='legendary',
		facts={'Genoemd naar Lawrence Livermore Lab','Slechts enkele atomen ooit geproduceerd','Halfwaardetijd circa 60 milliseconden'}
	},
	[117] = {
		name='Tennessine', sym='Ts', mass=294.000, group=17, period=7,
		color=Color3.fromRGB(68,255,136), rarity='legendary',
		facts={'Genoemd naar Tennessee, USA','Nieuwste halogeen in het periodiek systeem','Gemaakt uit berkelium doelwit'}
	},
	[118] = {
		name='Oganesson', sym='Og', mass=294.000, group=18, period=7,
		color=Color3.fromRGB(204,68,255), rarity='legendary',
		facts={'Zwaarste element ooit gemaakt','Genoemd naar Yuri Oganessian - nog levend','Mogelijk geen gas maar een vaste stof bij kamertemperatuur'}
	},
}

-- Helper: get element by symbol
function Elements.GetBySymbol(symbol)
	for z, el in pairs(Elements.Table) do
		if el.sym == symbol then
			return z, el
		end
	end
	return nil, nil
end

-- Helper: get element by name
function Elements.GetByName(name)
	for z, el in pairs(Elements.Table) do
		if el.name:lower() == name:lower() then
			return z, el
		end
	end
	return nil, nil
end

-- Helper: get all elements of a given rarity
function Elements.GetByRarity(rarity)
	local results = {}
	for z, el in pairs(Elements.Table) do
		if el.rarity == rarity then
			results[z] = el
		end
	end
	return results
end

-- Helper: get group color for an element
function Elements.GetGroupColor(group)
	return Elements.GroupColors[group] or Color3.fromRGB(180,180,180)
end

return Elements
