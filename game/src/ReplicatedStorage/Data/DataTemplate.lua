-- ReplicatedStorage/Data/DataTemplate.lua
-- Complete player data schema voor ProfileService
-- Alle persistent data definities voor MOLGANG

return {
	-- Atom inventory: key = element symbol, value = count
	atoms = {},

	-- Molecule inventory: key = molecule name, value = count
	molecules = {},

	-- Currency
	molCoins = 500,     -- Start bonus (500 MolCoins — enough to buy slag + test features)
	chainTokens = 0,
	quantumDots = {},   -- { {sym='Og', count=1}, ... }

	-- Game progression
	day = 1,            -- Current day counter

	-- Facilities
	facilities = {
		mines = 0,
		factories = 0,
		researchLabs = 0,
		offices = 0,
	},

	-- Mining rights and plot state (persisted through EconomyManager)
	mining = {
		ownedPlots = {},
		equipment = {},
		plotStates = {},
		totalOreMined = 0,
		totalOreValue = 0,
	},

	-- Rentable factory layout and equipment (persisted through EconomyManager)
	factory = {
		rented = false,
		hasRentedBefore = false,
		rentStartTime = 0,
		placements = {},
		equipmentInventory = {},
		totalSpent = 0,
		monthsPaid = 0,
	},

	-- Product-market P&L snapshot (recent entries plus cumulative totals)
	productLedger = {
		entries = {},
		totals = { revenue = 0, cogs = 0, opex = 0, capex = 0 },
		grossProfit = 0,
		netProfit = 0,
		totalIncome = 0,
		totalExpenses = 0,
	},

	-- Si-28 purification pipeline (products and resumable active stage)
	siliconPurification = {
		products = {},
		activeStage = nil,
		completedStages = {},
		startTime = nil,
	},

	-- Persistent relationship state for the walking NPC cast
	npcTrust = {},

	-- Persistent technology research progress and the currently running job
	research = {
		unlocked = {},
		active = nil, -- {nodeId, startedAt, completesAt}
	},

	-- Operator control state for the active slag-processing line
	processControl = {
		temperature = 25,
		pressure = 101.325,
		flowRate = 10,
		pH = 7.0,
	},

	-- Quests & Achievements
	questProgress = {
		active = {},
		completed = {},
		inProgress = {},
		lastDaily = {},
	},
	unlockedAchievements = {},
	mahjongWins = 0,

	-- Steel Slag Processing
	slagInventory = {
		chunk = 0,       -- raw 5cm+ pieces (kg)
		crushed = 0,     -- hammer-crushed ~1cm (kg)
		ground = 0,      -- machine-ground ~1mm (kg)
		powder = 0,      -- ball-milled <0.1mm (kg)
	},
	activeLeaches = {},  -- { {id, reagent, size, startTime, duration, yield}, ... }
	completedLeaches = 0,
	totalSlagProcessed = 0,

	-- Fertilizer Lab / farm state (persisted by EconomyManager)
	fertilizerFarm = {},

	-- ANK Lending
	ankLoans = {},      -- { {id, borrower, lender, amount, collateral, due, interest}, ... }
	stakedCollateral = 0,
	totalLent = 0,
	totalBorrowed = 0,

	-- Chain Registry
	chainEntries = 0,       -- totaal aantal registraties door deze speler
	lastChainHash = '',

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

	-- Guild membership (populated when player joins/creates a guild)
	guild = nil,   -- guildId string or nil

	-- Territory & strategy
	controlledTerritories = {},  -- list of territoryIds owned via guild
	attackedTerritories   = {},  -- territories this player personally pressured

	-- Logistics network routes (owner=guildId or userId)
	logisticsRoutes = {},        -- serialized from LogisticsNetwork

	-- Diplomacy
	diplomacyStatus = {
		treaties         = {},
		pendingProposals = {},
		reputation       = {},
	},

	-- World events participation
	eventsParticipated = {},     -- {eventId = true}
	eventBonusEarned   = 0,      -- total MolCoins from event bonuses

	-- News feed (last 5 read headlines per player)
	lastReadNewsTime = 0,

	-- Version for migration
	dataVersion = 2,
}
