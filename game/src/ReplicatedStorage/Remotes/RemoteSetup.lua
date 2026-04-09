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
