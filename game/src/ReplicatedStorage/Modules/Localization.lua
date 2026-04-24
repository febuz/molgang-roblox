--[[
	Localization.lua
	MOLGANG — Internationalization Framework (#79)

	Supports English (en), Dutch (nl), and German (de).
	Usage:
		local L = require(Localization)
		L.SetLanguage("nl")
		local text = L.Get("welcome_message")
]]

local Localization = {}

-- Current language
local currentLang = "en"

-- Translation tables
local translations = {
	en = {
		-- General
		welcome_message = "Welcome to MOLGANG!",
		loading = "Loading...",
		close = "Close",
		confirm = "Confirm",
		cancel = "Cancel",
		back = "Back",
		save = "Save",
		saved = "Saved",
		saving = "Saving...",

		-- Economy
		molcoins = "MolCoins",
		balance = "Balance",
		cost = "Cost",
		buy = "Buy",
		sell = "Sell",
		daily_claim = "Daily Claim",
		not_enough = "Not enough MolCoins",

		-- Chemistry
		periodic_table = "Periodic Table",
		recipe_book = "Recipe Book",
		atoms = "Atoms",
		molecules = "Molecules",
		valence = "Valence",
		element = "Element",

		-- Slag Processing
		slag_processing = "Slag Processing",
		buy_raw_slag = "Buy Raw Slag",
		crush = "Crush",
		leach = "Leach",
		extract = "Extract",
		hammering = "Hammering...",
		leaching = "Leaching...",
		reagent = "Reagent",

		-- Mining
		mining = "Mining",
		explore = "Explore",
		my_mines = "My Mines",
		market = "Market",
		drill = "Drill",

		-- Factory
		factory = "Factory",
		rent_factory = "Rent Factory",
		place_equipment = "Place Equipment",
		power = "Power",

		-- Quest
		quest_log = "Quest Log",
		quest_complete = "Quest Complete!",
		reward = "Reward",

		-- HUD
		production = "Production",
		day = "Day",
	},

	nl = {
		welcome_message = "Welkom bij MOLGANG!",
		loading = "Laden...",
		close = "Sluiten",
		confirm = "Bevestigen",
		cancel = "Annuleren",
		back = "Terug",
		save = "Opslaan",
		saved = "Opgeslagen",
		saving = "Opslaan...",

		molcoins = "MolMunten",
		balance = "Saldo",
		cost = "Kosten",
		buy = "Kopen",
		sell = "Verkopen",
		daily_claim = "Dagelijkse Bonus",
		not_enough = "Niet genoeg MolMunten",

		periodic_table = "Periodiek Systeem",
		recipe_book = "Receptenboek",
		atoms = "Atomen",
		molecules = "Moleculen",
		valence = "Valentie",
		element = "Element",

		slag_processing = "Slakverwerking",
		buy_raw_slag = "Koop Ruwe Slak",
		crush = "Breken",
		leach = "Logen",
		extract = "Extraheren",
		hammering = "Hameren...",
		leaching = "Logen...",
		reagent = "Reagens",

		mining = "Mijnbouw",
		explore = "Verkennen",
		my_mines = "Mijn Mijnen",
		market = "Markt",
		drill = "Boren",

		factory = "Fabriek",
		rent_factory = "Huur Fabriek",
		place_equipment = "Apparatuur Plaatsen",
		power = "Vermogen",

		quest_log = "Opdrachtenlog",
		quest_complete = "Opdracht Voltooid!",
		reward = "Beloning",

		production = "Productie",
		day = "Dag",
	},

	de = {
		welcome_message = "Willkommen bei MOLGANG!",
		loading = "Laden...",
		close = "Schliessen",
		confirm = "Bestätigen",
		cancel = "Abbrechen",
		back = "Zurück",
		save = "Speichern",
		saved = "Gespeichert",
		saving = "Speichern...",

		molcoins = "MolMünzen",
		balance = "Guthaben",
		cost = "Kosten",
		buy = "Kaufen",
		sell = "Verkaufen",
		daily_claim = "Täglicher Bonus",
		not_enough = "Nicht genug MolMünzen",

		periodic_table = "Periodensystem",
		recipe_book = "Rezeptbuch",
		atoms = "Atome",
		molecules = "Moleküle",
		valence = "Valenz",
		element = "Element",

		slag_processing = "Schlackenverarbeitung",
		buy_raw_slag = "Rohschlacke Kaufen",
		crush = "Brechen",
		leach = "Laugen",
		extract = "Extrahieren",
		hammering = "Hämmern...",
		leaching = "Laugen...",
		reagent = "Reagenz",

		mining = "Bergbau",
		explore = "Erkunden",
		my_mines = "Meine Minen",
		market = "Markt",
		drill = "Bohren",

		factory = "Fabrik",
		rent_factory = "Fabrik Mieten",
		place_equipment = "Ausrüstung Platzieren",
		power = "Leistung",

		quest_log = "Aufgabenprotokoll",
		quest_complete = "Aufgabe Abgeschlossen!",
		reward = "Belohnung",

		production = "Produktion",
		day = "Tag",
	},
}

function Localization.SetLanguage(lang)
	if translations[lang] then
		currentLang = lang
	else
		warn("[i18n] Unknown language: " .. tostring(lang) .. ", defaulting to 'en'")
		currentLang = "en"
	end
end

function Localization.GetLanguage()
	return currentLang
end

function Localization.Get(key)
	local t = translations[currentLang]
	if t and t[key] then
		return t[key]
	end
	-- Fallback to English
	if translations.en[key] then
		return translations.en[key]
	end
	return key -- Return key itself as last resort
end

function Localization.GetAvailableLanguages()
	local langs = {}
	for lang in pairs(translations) do
		table.insert(langs, lang)
	end
	return langs
end

-- Format with substitution: L.Format("cost_label", {cost = 500})
function Localization.Format(key, params)
	local text = Localization.Get(key)
	if params then
		for k, v in pairs(params) do
			text = text:gsub("{" .. k .. "}", tostring(v))
		end
	end
	return text
end

return Localization
