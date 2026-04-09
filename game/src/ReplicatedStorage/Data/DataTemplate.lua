-- ReplicatedStorage/Data/DataTemplate.lua
-- Complete player data schema voor ProfileService
-- Alle persistent data definities voor MOLGANG

return {
	-- Atom inventory: key = element symbol, value = count
	atoms = {},

	-- Molecule inventory: key = molecule name, value = count
	molecules = {},

	-- Currency
	molCoins = 100,     -- Start bonus (100 MolCoins welkomstbonus)
	chainTokens = 0,
	quantumDots = {},   -- { {sym='Og', count=1}, ... }

	-- ANK Lending
	ankLoans = {},      -- { {id, borrower, lender, amount, collateral, due, interest}, ... }
	stakedCollateral = 0,
	totalLent = 0,
	totalBorrowed = 0,

	-- Chain Registry
	chainEntries = 0,       -- totaal aantal registraties door deze speler
	lastChainHash = '',

	-- Facilities (production buildings)
	facilities = {
		mines = 0,
		factories = 0,
		researchLabs = 0,
		offices = 0,
	},
	facilityList = {},  -- {[facilityId] = {type='mine', pos={x,y,z}, level=1, production=10, lastProduced=0}}
	nextFacilityId = 1,

	-- Progress tracking
	elementsFound = {},     -- set van elementZ nummers: {[1]=true, [8]=true, ...}
	moleculesBuilt = {},    -- set van molecule namen: {['H2O']=true, ...}
	badges = {},            -- {['Beginner']=true, ['Chemist']=true, ...}

	-- Statistics
	totalAtomsCollected = 0,
	totalMoleculesBuilt = 0,
	totalMolCoinsEarned = 0,
	totalMolCoinsSpent = 0,
	totalChainEntries = 0,
	totalQuizCorrect = 0,
	totalLoansGiven = 0,
	totalLoansReceived = 0,
	loginStreak = 0,
	lastLoginDate = '',

	-- Daily claim tracking
	lastDailyClaim = 0,     -- os.time() of last claim

	-- Settings
	musicVolume = 0.5,
	sfxVolume = 0.8,
	showMinimap = true,
	language = 'nl',        -- nl / en

	-- Version for migration
	dataVersion = 1,
}
