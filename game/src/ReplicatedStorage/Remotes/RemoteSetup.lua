-- ReplicatedStorage/Remotes/init.lua
-- RemoteEvents en RemoteFunctions map voor MOLGANG
-- Alle client<->server communicatie gaat via deze remotes

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local remotesFolder = script

local Remotes = {}

-- ══════════════════════════════════════════════
-- SERVER → CLIENT EVENTS (FireClient)
-- ══════════════════════════════════════════════

local serverToClientEvents = {
	"AtomSpawned",         -- nieuw atoom in wereld, update minimap
	"AtomCollected",       -- {elementZ, newCount} bevestiging collect, update HUD
	"AtomRemoved",         -- atoom verdwenen (door andere speler of timeout)
	"MoleculeBuilt",       -- {molName, points} molecule succes, show fanfare
	"ChainEntryAdded",     -- {entryData} tower display update
	"LoanCreated",         -- {loanData} ANK bevestiging
	"LoanRepaid",          -- {loanId} loan afgelost
	"AchievementUnlocked", -- {achieveId, badgeName} badge earned
	"ServerAnnounce",      -- {message} global server event
	"DailyClaimResult",    -- {success, amount, nextClaimTime}
	"LeaderboardUpdate",   -- {category, entries} periodic refresh
	"PlayerDataLoaded",    -- {data} initial data load on join
	"NPCDialogue",         -- {npcName, text, trustLevel} NPC speech
	"NPCTrustChanged",     -- {npcName, newTrust} trust level update
	"MiniGameResult",      -- {score, rewards, badge} mini-game completion
	"MiniGameOrbSpawned",  -- {orbId, mineralType, color} new orb on conveyor
	"MiniGamePHRound",     -- {metals} pH puzzle round start
	"DayAdvanced",         -- {newDay, timestamp} game day incremented
	"FacilityBuilt",       -- {facilityName, cost, newBalance} facility construction confirmed
	"MarketTrade",         -- {action, item, quantity, totalCost/totalRevenue, newBalance} trade confirmed
	"ProductionCycleComplete", -- {atomsProduced, moleculesProduced, bonusMolCoins} production finished
	"ProductionReady",     -- {facilities} production ready to process
	"NPCDialogue",         -- {npcName, greeting, reward} NPC dialogue event
	"MarketPricesUpdated", -- {commodity: price} market prices changed
	-- Slag Processing
	"SlagCrushProgress",   -- {hits, totalHits, size} crushing progress update
	"SlagLeachStarted",    -- {leachId, reagent, size, duration} leaching begun
	"SlagLeachProgress",   -- {leachId, progress, timeRemaining} periodic update
	"SlagLeachComplete",   -- {leachId, yield} leaching finished, products ready
	"SlagExtracted",       -- {atoms, molCoins} products added to inventory
	"SlagInventoryUpdate", -- {slagInventory} updated slag quantities
	-- Bubble Tea Bar
	"DrinkPurchased",      -- {drinkId, name, buffType, duration} drink bought
	"DrinkListResponse",   -- {drinks, activeBuffs} available drinks and active buffs
	-- Fertilizer System
	"FertilizerUpdate",    -- {plots, soilData, questProgress} full state update
	"CropGrowthTick",     -- {plotId, progress, daysLeft} periodic growth update
	"CropHarvested",      -- {plotId, cropName, yield, coins} harvest result
	"SoilTestResult",     -- {soilType, pH, nutrients, contaminants} soil analysis
	"FertilizerCrafted",  -- {fertilizerId, name, npk} fertilizer synthesized
	-- Weather System
	"WeatherChanged",     -- {id, name, rainIntensity, windSpeed, duration} weather update
	"WeatherLightning",   -- {intensity} lightning strike flash
	-- Entrepreneur / Factory Builder
	"FactoryUpdate",      -- {placements, power, costs, bonuses} factory state
	"EquipmentPlaced",    -- {itemId, gridX, gridY} placement confirmed
	"EquipmentRemoved",   -- {gridX, gridY} removal confirmed
	-- Mining System
	"MiningUpdate",       -- {plots, ownedPlots, marketListings} mining state
	"PlotExplored",       -- {plotId, composition, vanadiumPct} exploration result
	"OreMined",           -- {plotId, kgMined, totalStockpile} ore production update
	"PlotPurchased",      -- {plotId, seller, buyer, price} plot trade confirmation
	-- Product Market
	"ProductPricesUpdate", -- {prices} current market prices for all products
	"ProductSold",         -- {productId, quantity, revenue} sale confirmation
	-- Feedback System
	"FeedbackSubmitted",   -- {success, count, max} feedback confirmation
	"RequestRating",       -- {systems} periodic rating request
}

-- ══════════════════════════════════════════════
-- CLIENT → SERVER EVENTS (FireServer)
-- ══════════════════════════════════════════════

local clientToServerEvents = {
	"RequestAtomCollect",    -- {atomName} proximity collect poging
	"RequestBuildMolecule",  -- {atomList} molecule bouwen
	"RequestLoan",           -- {lenderId, amount, duration} ANK lening aanvraag
	"RequestRepayLoan",      -- {loanId} lening terugbetalen
	"RequestChainQuery",     -- {query} chain explorer zoekquery
	"RequestDailyClaim",     -- {} login bonus claimen
	"RequestAtomTransfer",   -- {targetId, elementZ} atoom sturen naar vriend
	"RequestQuizAnswer",     -- {questionId, answer} quiz antwoord
	"RequestStartMiniGame",  -- {} start Slakkenspoor mini-game
	"RequestSortOrb",        -- {orbId, binChoice} sort orb in HGMS game
	"RequestSetPH",          -- {metalName, phValue} pH puzzle answer
	"RequestNPCInteract",    -- {npcName} interact with NPC
	"RequestBuildFacility",  -- {facilityName} purchase and build a facility
	"RequestMarketTrade",    -- {action='sell'|'buy', itemName, quantity} trade on market
	-- Slag Processing
	"RequestBuySlag",        -- {} purchase raw slag chunks
	"RequestCrushSlag",      -- {targetSize} crush slag (hammer hit or machine)
	"RequestStartLeach",     -- {reagentId, particleSize} begin leaching process
	"RequestExtractProducts",-- {leachId} collect finished leach products
	"RequestSlagInfo",       -- {} get current slag processing state
	"RequestSetProcessControl", -- {temperature, pressure, pH, flowRate} update process variables
	-- Bubble Tea Bar
	"RequestBuyDrink",       -- {drinkId} purchase a bubble tea
	"RequestDrinkList",      -- {} get drink menu and active buffs
	-- Fertilizer System
	"RequestTestSoil",       -- {plotId} analyze soil at a plot
	"RequestPlantCrop",      -- {plotId, cropId} plant a crop in a plot
	"RequestApplyFertilizer",-- {plotId, fertilizerId} apply fertilizer to soil
	"RequestHarvestCrop",    -- {plotId} harvest a ready crop
	"RequestCraftFertilizer",-- {fertilizerId} synthesize a fertilizer
	"RequestSellFertilizer", -- {fertilizerId} sell surplus fertilizer (#65)
	"RequestFertilizerInfo", -- {} get all plots, quests, state
	-- Entrepreneur / Factory Builder
	"RequestRentFactory",    -- {} rent the 1000m² factory
	"RequestPlaceEquipment", -- {itemId, gridX, gridY, rotation} place equipment
	"RequestRemoveEquipment",-- {gridX, gridY} remove equipment at position
	"RequestBuyEquipment",   -- {itemId} purchase equipment for inventory
	"RequestFactoryInfo",    -- {} get current factory state
	-- Mining System
	"RequestBuyExplorationLicense", -- {plotId} buy exploration license (composition unknown!)
	"RequestExplorePlot",    -- {plotId} drill to discover mineral composition
	"RequestBuyMiningEquip", -- {equipId} purchase mining equipment
	"RequestDeployEquipment",-- {plotId, equipId} place equipment on plot
	"RequestCollectOre",     -- {plotId} collect mined ore stockpile
	"RequestListPlotForSale",-- {plotId, askPrice} list mining plot on market
	"RequestBuyPlotFromMarket", -- {plotId} buy listed mining plot from another player
	"RequestMiningInfo",     -- {} get all plot data
	-- Product Market
	"RequestSellProduct",    -- {productId, quantity} sell refined product
	"RequestProductPrices",  -- {} get current market prices
	-- Feedback System
	"RequestSubmitFeedback", -- {type, system, rating, message} submit feedback
	-- Guild System (#72)
	"RequestCreateGuild",    -- {guildName} create a new guild
	"RequestJoinGuild",      -- {guildName} join existing guild
	"RequestLeaveGuild",     -- {} leave current guild
	"RequestGuildInfo",      -- {} get guild list + own guild info
	"GuildInfoResponse",     -- {myGuild, allGuilds} response data
	-- Market Bidding (#88)
	"RequestPlaceBid",       -- {productId, bidPrice, quantity} place market bid
	"RequestCancelBid",      -- {bidId} cancel own bid
	"RequestMarketBids",     -- {} get active bids
	"MarketBidsResponse",    -- {bids, myBids} bid data
}

-- ══════════════════════════════════════════════
-- REMOTE FUNCTIONS (tweezijdig, returns data)
-- ══════════════════════════════════════════════

local remoteFunctions = {
	"GetPlayerData",     -- returns player profile data (read-only snapshot)
	"GetChainPage",      -- (pageNum) returns 20 entries per pagina
	"GetLeaderboard",    -- (category) returns top-100 array
	"GetElementInfo",    -- (z) returns full element data + player stats
	"GetBuildable",      -- () returns list of buildable molecules for player
}

-- ══════════════════════════════════════════════
-- CREATE ALL REMOTES
-- ══════════════════════════════════════════════

-- Create server→client events
for _, name in ipairs(serverToClientEvents) do
	if not remotesFolder:FindFirstChild(name) then
		local remote = Instance.new("RemoteEvent")
		remote.Name = name
		remote.Parent = remotesFolder
	end
	Remotes[name] = remotesFolder:FindFirstChild(name)
end

-- Create client→server events
for _, name in ipairs(clientToServerEvents) do
	if not remotesFolder:FindFirstChild(name) then
		local remote = Instance.new("RemoteEvent")
		remote.Name = name
		remote.Parent = remotesFolder
	end
	Remotes[name] = remotesFolder:FindFirstChild(name)
end

-- Create remote functions
for _, name in ipairs(remoteFunctions) do
	if not remotesFolder:FindFirstChild(name) then
		local remote = Instance.new("RemoteFunction")
		remote.Name = name
		remote.Parent = remotesFolder
	end
	Remotes[name] = remotesFolder:FindFirstChild(name)
end

-- Helper functions for easy access
function Remotes.FireClient(eventName, player, ...)
	local remote = Remotes[eventName]
	if remote then
		remote:FireClient(player, ...)
	else
		warn("[Remotes] Unknown event:", eventName)
	end
end

function Remotes.FireAllClients(eventName, ...)
	local remote = Remotes[eventName]
	if remote then
		remote:FireAllClients(...)
	else
		warn("[Remotes] Unknown event:", eventName)
	end
end

function Remotes.FireServer(eventName, ...)
	local remote = Remotes[eventName]
	if remote then
		remote:FireServer(...)
	else
		warn("[Remotes] Unknown event:", eventName)
	end
end

return Remotes
