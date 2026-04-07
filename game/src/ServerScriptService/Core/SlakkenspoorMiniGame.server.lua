-- ServerScriptService/Core/SlakkenspoorMiniGame.server.lua
-- HGMS Color Matching Mini-Game for the Slakkenspoor Factory zone
-- Player sorts mineral orbs from BOF slag on a conveyor belt using the
-- High Gradient Magnetic Separator (HGMS) machine, then adjusts pH for
-- each metal extraction in a bonus round.
--
-- Anti-cheat: all orb identities and scoring are server-authoritative.
-- The client only sends sort decisions; the server validates everything.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- ══════════════════════════════════════════════
-- CONFIGURATION
-- ══════════════════════════════════════════════

local MAX_CONCURRENT_SESSIONS = 4      -- max simultaneous games server-wide
local ROUND_DURATION = 60              -- seconds for the sorting round
local PROXIMITY_RANGE = 25             -- studs from HGMS machine to start
local COOLDOWN_BETWEEN_GAMES = 30      -- seconds before player can replay
local ORB_LIFETIME = 8                 -- seconds before an orb reaches the end
local ORB_START_INTERVAL = 2.0         -- seconds between orbs at start
local ORB_MIN_INTERVAL = 0.8           -- fastest orb spawn interval
local ORB_ACCELERATION_TIME = 45       -- seconds over which interval decreases

-- HGMS machine position in Slakkenspoor factory zone
local HGMS_POSITION = Vector3.new(-2000, 12, 0)

-- Conveyor layout: orbs spawn at SPAWN_POS and travel toward PLAYER_POS
local CONVEYOR_SPAWN_POS = Vector3.new(-2000, 14, -30)
local CONVEYOR_END_POS   = Vector3.new(-2000, 14, 10)
local CONVEYOR_LENGTH    = (CONVEYOR_END_POS - CONVEYOR_SPAWN_POS).Magnitude

-- Bin positions (relative to HGMS machine, for visual reference)
local BIN_POSITIONS = {
	LEFT   = Vector3.new(-2008, 10, 5),   -- Magnetic (Fe3O4) — red bin
	CENTER = Vector3.new(-2000, 10, 5),   -- Valuable (V2O5, TiO2) — gold bin
	RIGHT  = Vector3.new(-1992, 10, 5),   -- Waste/Toxic (Cr(VI)) — green hazard bin
}

-- ══════════════════════════════════════════════
-- MINERAL DEFINITIONS
-- ══════════════════════════════════════════════

-- Each mineral that can appear on the conveyor belt
-- correctBin: the bin the player should sort it into, or "PASS" for passthrough
local MINERALS = {
	{
		name = "V2O5",
		displayName = "Vanadium Pentoxide",
		color = Color3.fromRGB(255, 215, 0),    -- gold
		correctBin = "CENTER",
		category = "valuable",
		weight = 20,    -- spawn weight (relative probability)
	},
	{
		name = "Fe3O4",
		displayName = "Magnetite",
		color = Color3.fromRGB(139, 0, 0),       -- dark red
		correctBin = "LEFT",
		category = "magnetic",
		weight = 25,
	},
	{
		name = "TiO2",
		displayName = "Titanium Dioxide",
		color = Color3.fromRGB(245, 245, 245),   -- white
		correctBin = "CENTER",
		category = "valuable",
		weight = 18,
	},
	{
		name = "SiO2",
		displayName = "Silicon Dioxide",
		color = Color3.fromRGB(135, 206, 250),   -- light blue
		correctBin = "PASS",
		category = "biostimulant",
		weight = 15,
	},
	{
		name = "CaO",
		displayName = "Calcium Oxide",
		color = Color3.fromRGB(255, 253, 208),   -- cream
		correctBin = "PASS",
		category = "biostimulant",
		weight = 15,
	},
	{
		name = "Cr_VI",
		displayName = "Chromium(VI)",
		color = Color3.fromRGB(0, 255, 65),      -- toxic green
		correctBin = "RIGHT",
		category = "toxic",
		weight = 7,
	},
}

-- Build cumulative weight table for weighted random selection
local TOTAL_MINERAL_WEIGHT = 0
for _, m in ipairs(MINERALS) do
	TOTAL_MINERAL_WEIGHT = TOTAL_MINERAL_WEIGHT + m.weight
end

-- pH puzzle correct values and tolerances
local PH_TARGETS = {
	{ metalName = "V2O5", targetPH = 2.0, tolerance = 0.5, displayName = "Vanadium Pentoxide" },
	{ metalName = "Fe",   targetPH = 4.0, tolerance = 0.5, displayName = "Iron" },
	{ metalName = "Ti",   targetPH = 6.0, tolerance = 0.5, displayName = "Titanium" },
}

-- Scoring
local SCORE_CORRECT        = 10
local SCORE_WRONG          = -5
local SCORE_TOXIC_WRONG    = -20   -- Cr(VI) in wrong bin
local SCORE_MISSED         = -2    -- orb fell off conveyor unsorted
local PH_BONUS_PER_METAL   = 50   -- MolCoins for each correct pH

-- Reward tiers
local REWARD_TIERS = {
	{ minScore = 201, rank = "Expert",     coins = 200, giveRareV = true },
	{ minScore = 101, rank = "Worker",     coins = 100, giveRareV = false },
	{ minScore = 0,   rank = "Apprentice", coins = 50,  giveRareV = false },
}

local PERFECT_RUN_COINS = 500
local PERFECT_RUN_BADGE = "Metallurgist"

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local activeSessions = {}   -- { [userId] = sessionData }
local sessionCount = 0
local playerCooldowns = {}  -- { [userId] = lastGameEndTime }

-- Workspace folder for mini-game orbs
local miniGameFolder = workspace:FindFirstChild("MiniGame")
if not miniGameFolder then
	miniGameFolder = Instance.new("Folder")
	miniGameFolder.Name = "MiniGame"
	miniGameFolder.Parent = workspace
end

-- ══════════════════════════════════════════════
-- HELPER: select a random mineral (weighted)
-- ══════════════════════════════════════════════

local function selectRandomMineral()
	local roll = math.random() * TOTAL_MINERAL_WEIGHT
	local cumulative = 0
	for _, mineral in ipairs(MINERALS) do
		cumulative = cumulative + mineral.weight
		if roll <= cumulative then
			return mineral
		end
	end
	return MINERALS[1] -- fallback
end

-- ══════════════════════════════════════════════
-- HELPER: generate unique orb ID
-- ══════════════════════════════════════════════

local orbIdCounter = 0
local function generateOrbId()
	orbIdCounter = orbIdCounter + 1
	return "orb_" .. tostring(orbIdCounter) .. "_" .. tostring(math.random(1000, 9999))
end

-- ══════════════════════════════════════════════
-- HELPER: check proximity to HGMS machine
-- ══════════════════════════════════════════════

local function isPlayerNearHGMS(player)
	local character = player.Character
	if not character then return false end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then return false end
	return (hrp.Position - HGMS_POSITION).Magnitude <= PROXIMITY_RANGE
end

-- ══════════════════════════════════════════════
-- ORB CREATION (physical Part in workspace)
-- ══════════════════════════════════════════════

local function createOrbPart(orbId, mineral, playerFolder)
	local orb = Instance.new("Part")
	orb.Name = orbId
	orb.Shape = Enum.PartType.Ball
	orb.Size = Vector3.new(3, 3, 3)
	orb.Color = mineral.color
	orb.Material = Enum.Material.Neon
	orb.CFrame = CFrame.new(CONVEYOR_SPAWN_POS)
	orb.Anchored = true
	orb.CanCollide = false

	-- Attributes for client rendering
	orb:SetAttribute("OrbId", orbId)
	orb:SetAttribute("MineralName", mineral.name)
	orb:SetAttribute("DisplayName", mineral.displayName)
	orb:SetAttribute("Category", mineral.category)
	orb:SetAttribute("Interactable", true)
	orb:SetAttribute("InteractionType", "sort")

	-- Billboard label
	local bill = Instance.new("BillboardGui")
	bill.Size = UDim2.fromOffset(100, 30)
	bill.StudsOffset = Vector3.new(0, 2.5, 0)
	bill.AlwaysOnTop = false
	bill.Parent = orb

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = mineral.displayName
	label.TextColor3 = mineral.color
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.TextStrokeTransparency = 0.5
	label.TextStrokeColor3 = Color3.fromRGB(0, 0, 0)
	label.Parent = bill

	-- Glow particle
	local particle = Instance.new("ParticleEmitter")
	particle.Color = ColorSequence.new(mineral.color)
	particle.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.4),
		NumberSequenceKeypoint.new(1, 0),
	})
	particle.Lifetime = NumberRange.new(0.3, 0.8)
	particle.Rate = 8
	particle.Speed = NumberRange.new(0.3, 1.0)
	particle.SpreadAngle = Vector2.new(360, 360)
	particle.LightEmission = 1
	particle.Parent = orb

	-- Toxic Cr(VI) gets extra warning glow
	if mineral.name == "Cr_VI" then
		particle.Rate = 20
		particle.Color = ColorSequence.new(Color3.fromRGB(0, 255, 65), Color3.fromRGB(200, 255, 0))
		local light = Instance.new("PointLight")
		light.Color = Color3.fromRGB(0, 255, 65)
		light.Brightness = 2
		light.Range = 10
		light.Parent = orb
	end

	orb.Parent = playerFolder
	return orb
end

-- ══════════════════════════════════════════════
-- ORB MOVEMENT (server-side conveyor tween)
-- ══════════════════════════════════════════════

local function moveOrbAlongConveyor(orb, session)
	local startTime = tick()
	local direction = (CONVEYOR_END_POS - CONVEYOR_SPAWN_POS).Unit

	-- Move in a coroutine; stops when orb is destroyed or sorted
	task.spawn(function()
		while orb and orb.Parent and session.active do
			local elapsed = tick() - startTime
			local fraction = elapsed / ORB_LIFETIME

			if fraction >= 1 then
				-- Orb reached end without being sorted
				local orbId = orb:GetAttribute("OrbId")
				if orbId and session.orbs[orbId] then
					local orbData = session.orbs[orbId]
					if not orbData.sorted then
						-- Check if this was a PASS-type mineral (SiO2 / CaO)
						if orbData.mineral.correctBin == "PASS" then
							-- Correctly let it pass through — award points
							session.score = session.score + SCORE_CORRECT
							session.correctSorts = session.correctSorts + 1
						else
							-- Should have been sorted — penalty
							session.score = session.score + SCORE_MISSED
							session.missedOrbs = session.missedOrbs + 1
						end
						orbData.sorted = true
					end
				end
				orb:Destroy()
				return
			end

			local newPos = CONVEYOR_SPAWN_POS + direction * (CONVEYOR_LENGTH * fraction)
			-- Add gentle floating motion
			newPos = newPos + Vector3.new(0, math.sin(elapsed * 3) * 0.3, 0)
			orb.CFrame = CFrame.new(newPos)

			task.wait(0.05) -- 20 updates/sec for smooth movement
		end

		-- Session ended or orb removed externally
		if orb and orb.Parent then
			orb:Destroy()
		end
	end)
end

-- ══════════════════════════════════════════════
-- FORWARD DECLARATIONS
-- ══════════════════════════════════════════════

local startPHRound     -- defined below runOrbSpawnLoop
local finalizeGame     -- defined below startPHRound

-- ══════════════════════════════════════════════
-- SESSION MANAGEMENT
-- ══════════════════════════════════════════════

local function createSession(player)
	local userId = player.UserId

	-- Create a per-player folder under MiniGame for orb parts
	local playerFolder = miniGameFolder:FindFirstChild("HGMS_" .. tostring(userId))
	if playerFolder then
		playerFolder:ClearAllChildren()
	else
		playerFolder = Instance.new("Folder")
		playerFolder.Name = "HGMS_" .. tostring(userId)
		playerFolder.Parent = miniGameFolder
	end

	local session = {
		userId = userId,
		player = player,
		active = true,
		startTime = tick(),
		score = 0,
		orbs = {},            -- { [orbId] = { mineral, sorted, spawnTime } }
		totalOrbs = 0,
		correctSorts = 0,
		wrongSorts = 0,
		missedOrbs = 0,
		toxicErrors = 0,      -- Cr(VI) in wrong bin count
		playerFolder = playerFolder,
		-- pH puzzle state
		phRoundActive = false,
		phResults = {},       -- { [metalName] = { correct = bool, phValue = num } }
		phAllCorrect = false,
	}

	activeSessions[userId] = session
	sessionCount = sessionCount + 1
	return session
end

local function endSession(session)
	if not session.active then return end
	session.active = false
	sessionCount = sessionCount - 1

	local userId = session.userId
	playerCooldowns[userId] = tick()

	-- Clean up all orb parts
	if session.playerFolder and session.playerFolder.Parent then
		session.playerFolder:Destroy()
	end

	activeSessions[userId] = nil
end

-- ══════════════════════════════════════════════
-- ORB SPAWNING LOOP (per session)
-- ══════════════════════════════════════════════

local function runOrbSpawnLoop(session)
	task.spawn(function()
		local player = session.player
		local startTime = session.startTime

		while session.active do
			local elapsed = tick() - startTime

			-- Stop spawning after round duration (let remaining orbs finish)
			if elapsed >= ROUND_DURATION then
				break
			end

			-- Calculate current spawn interval (gets faster over time)
			local progress = math.min(elapsed / ORB_ACCELERATION_TIME, 1)
			local currentInterval = ORB_START_INTERVAL - (ORB_START_INTERVAL - ORB_MIN_INTERVAL) * progress

			-- Select mineral and create orb
			local mineral = selectRandomMineral()
			local orbId = generateOrbId()

			session.orbs[orbId] = {
				mineral = mineral,
				sorted = false,
				spawnTime = tick(),
			}
			session.totalOrbs = session.totalOrbs + 1

			-- Create physical orb in workspace
			local orb = createOrbPart(orbId, mineral, session.playerFolder)

			-- Notify client about new orb
			Remotes.FireClient("MiniGameOrbSpawned", player, {
				orbId = orbId,
				mineralType = mineral.name,
				displayName = mineral.displayName,
				color = { mineral.color.R, mineral.color.G, mineral.color.B },
				category = mineral.category,
			})

			-- Start conveyor movement for this orb
			moveOrbAlongConveyor(orb, session)

			task.wait(currentInterval)
		end

		-- Wait for remaining orbs to finish (ORB_LIFETIME grace period)
		task.wait(ORB_LIFETIME + 1)

		-- If session is still active (hasn't been ended by disconnect), start pH round
		if session.active then
			startPHRound(session)
		end
	end)
end

-- ══════════════════════════════════════════════
-- pH LADDER PUZZLE (bonus round)
-- ══════════════════════════════════════════════

startPHRound = function(session)
	if not session.active then return end

	session.phRoundActive = true

	-- Send pH round data to client
	local metalsList = {}
	for _, target in ipairs(PH_TARGETS) do
		table.insert(metalsList, {
			metalName = target.metalName,
			displayName = target.displayName,
			-- Do NOT send target pH; player must know from game knowledge
		})
	end

	Remotes.FireClient("MiniGamePHRound", session.player, {
		metals = metalsList,
		timeLimit = 30,  -- 30 seconds for all 3 pH adjustments
	})

	-- Wait for pH answers (timeout after 35 seconds)
	task.spawn(function()
		local phStartTime = tick()
		while session.active and session.phRoundActive do
			-- Check if all 3 metals have been answered
			local answeredCount = 0
			for _ in pairs(session.phResults) do
				answeredCount = answeredCount + 1
			end
			if answeredCount >= #PH_TARGETS then
				break
			end
			-- Timeout
			if tick() - phStartTime > 35 then
				break
			end
			task.wait(0.5)
		end

		session.phRoundActive = false

		-- Evaluate pH results
		local phCorrectCount = 0
		local phBonusCoins = 0
		for _, target in ipairs(PH_TARGETS) do
			local result = session.phResults[target.metalName]
			if result then
				local diff = math.abs(result.phValue - target.targetPH)
				if diff <= target.tolerance then
					result.correct = true
					phCorrectCount = phCorrectCount + 1
					phBonusCoins = phBonusCoins + PH_BONUS_PER_METAL
				else
					result.correct = false
				end
			end
			-- Unanswered metals count as incorrect (no penalty, just no bonus)
		end

		session.phAllCorrect = (phCorrectCount == #PH_TARGETS)

		-- Finalize the game
		finalizeGame(session, phBonusCoins)
	end)
end

-- ══════════════════════════════════════════════
-- GAME FINALIZATION AND REWARDS
-- ══════════════════════════════════════════════

finalizeGame = function(session, phBonusCoins)
	if not session.player or not session.player.Parent then
		endSession(session)
		return
	end

	local player = session.player
	local userId = session.userId
	local score = session.score

	-- Determine reward tier
	local rank = "Apprentice"
	local tierCoins = 50
	local giveRareV = false

	for _, tier in ipairs(REWARD_TIERS) do
		if score >= tier.minScore then
			rank = tier.rank
			tierCoins = tier.coins
			giveRareV = tier.giveRareV
			break
		end
	end

	-- Check for perfect run: no missed orbs, no wrong sorts, all pH correct
	local isPerfectRun = (session.missedOrbs == 0)
		and (session.wrongSorts == 0)
		and (session.toxicErrors == 0)
		and (session.phAllCorrect)
		and (session.totalOrbs > 0)

	-- Calculate total MolCoin reward
	local totalCoins = tierCoins + phBonusCoins
	if isPerfectRun then
		totalCoins = totalCoins + PERFECT_RUN_COINS
	end

	-- Award MolCoins via PlayerDataBridge
	local coinSuccess, newBalance = PlayerDataBridge.AddMolCoins(userId, totalCoins)
	if not coinSuccess then
		-- Fallback: try recording as pending collect so EconomyManager picks it up
		-- Use V (Z=23) as symbolic element for slag mini-game reward
		PlayerDataBridge.RecordAtomCollect(userId, 23, "V", totalCoins)
	end

	-- Award rare V atom for Expert tier
	if giveRareV then
		-- Record a Vanadium atom collect as bonus
		PlayerDataBridge.RecordAtomCollect(userId, 23, "V", 0)
	end

	-- Award rare V2O5 molecule for perfect run
	local awardedMolecule = nil
	if isPerfectRun then
		awardedMolecule = "V2O5"
		-- Record the molecule build via bridge
		PlayerDataBridge.RecordMoleculeBuild(userId, "V2O5", { V = 2, O = 5 })
	end

	-- Award badges
	local badgeAwarded = nil
	if isPerfectRun then
		badgeAwarded = PERFECT_RUN_BADGE
		-- Notify via achievement system
		Remotes.FireClient("AchievementUnlocked", player, {
			id = PERFECT_RUN_BADGE,
			name = "Metallurgist",
			description = "Perfect HGMS run: all orbs sorted correctly + all pH values nailed!",
		})
	end

	-- Build pH result summary for client
	local phSummary = {}
	for _, target in ipairs(PH_TARGETS) do
		local result = session.phResults[target.metalName]
		table.insert(phSummary, {
			metalName = target.metalName,
			displayName = target.displayName,
			targetPH = target.targetPH,
			playerPH = result and result.phValue or nil,
			correct = result and result.correct or false,
			bonus = (result and result.correct) and PH_BONUS_PER_METAL or 0,
		})
	end

	-- Send final results to client
	Remotes.FireClient("MiniGameResult", player, {
		score = score,
		rank = rank,
		totalOrbs = session.totalOrbs,
		correctSorts = session.correctSorts,
		wrongSorts = session.wrongSorts,
		missedOrbs = session.missedOrbs,
		toxicErrors = session.toxicErrors,
		phResults = phSummary,
		phBonusCoins = phBonusCoins,
		tierCoins = tierCoins,
		totalCoins = totalCoins,
		isPerfectRun = isPerfectRun,
		badge = badgeAwarded,
		molecule = awardedMolecule,
		giveRareV = giveRareV,
	})

	-- Server announce for impressive results
	if isPerfectRun then
		Remotes.FireAllClients("ServerAnnounce", {
			message = player.Name .. " achieved a PERFECT RUN on the HGMS Separator!",
			rarity = "legendary",
		})
	elseif rank == "Expert" then
		Remotes.FireAllClients("ServerAnnounce", {
			message = player.Name .. " earned Expert rank on the HGMS Separator! (" .. score .. " pts)",
			rarity = "epic",
		})
	end

	print("[SlakkenspoorMiniGame] " .. player.Name .. " finished — Score: " .. score
		.. " | Rank: " .. rank .. " | Coins: " .. totalCoins
		.. (isPerfectRun and " | PERFECT RUN!" or ""))

	endSession(session)
end

-- ══════════════════════════════════════════════
-- REMOTE EVENT HANDLERS
-- ══════════════════════════════════════════════

-- CLIENT REQUEST: Start mini-game
Remotes.RequestStartMiniGame.OnServerEvent:Connect(function(player)
	local userId = player.UserId

	-- Already in a session?
	if activeSessions[userId] then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "You are already in an HGMS session!",
			rarity = "common",
		})
		return
	end

	-- Server capacity check
	if sessionCount >= MAX_CONCURRENT_SESSIONS then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "HGMS machine is busy — max " .. MAX_CONCURRENT_SESSIONS .. " players at once. Try again soon!",
			rarity = "common",
		})
		return
	end

	-- Cooldown check
	local lastEnd = playerCooldowns[userId]
	if lastEnd and (tick() - lastEnd) < COOLDOWN_BETWEEN_GAMES then
		local remaining = math.ceil(COOLDOWN_BETWEEN_GAMES - (tick() - lastEnd))
		Remotes.FireClient("ServerAnnounce", player, {
			message = "HGMS cooldown: " .. remaining .. " seconds remaining.",
			rarity = "common",
		})
		return
	end

	-- Proximity check (anti-cheat: must be near the machine)
	if not isPlayerNearHGMS(player) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Move closer to the HGMS machine to start!",
			rarity = "common",
		})
		return
	end

	-- Create and start session
	local session = createSession(player)

	Remotes.FireClient("ServerAnnounce", player, {
		message = "HGMS Separator activated! Sort the minerals from the BOF slag!",
		rarity = "epic",
	})

	print("[SlakkenspoorMiniGame] " .. player.Name .. " started HGMS session")

	-- Start the orb spawn loop (runs asynchronously)
	runOrbSpawnLoop(session)
end)

-- CLIENT REQUEST: Sort an orb into a bin
Remotes.RequestSortOrb.OnServerEvent:Connect(function(player, orbId, binChoice)
	local userId = player.UserId
	local session = activeSessions[userId]

	-- Validate session exists and is active
	if not session or not session.active then return end

	-- Validate input types (anti-cheat)
	if type(orbId) ~= "string" then return end
	if type(binChoice) ~= "string" then return end

	-- Normalize bin choice
	binChoice = string.upper(binChoice)
	if binChoice ~= "LEFT" and binChoice ~= "CENTER" and binChoice ~= "RIGHT" then
		return -- invalid bin
	end

	-- Look up the orb in server state
	local orbData = session.orbs[orbId]
	if not orbData then return end           -- unknown orb
	if orbData.sorted then return end        -- already sorted

	-- Mark as sorted immediately (prevent double-sort)
	orbData.sorted = true

	local mineral = orbData.mineral
	local correctBin = mineral.correctBin

	-- PASS-type minerals (SiO2, CaO) should NOT be clicked — any bin is wrong
	if correctBin == "PASS" then
		-- Player tried to sort a biostimulant precursor — penalty
		session.score = session.score + SCORE_WRONG
		session.wrongSorts = session.wrongSorts + 1
	elseif binChoice == correctBin then
		-- Correct sort
		session.score = session.score + SCORE_CORRECT
		session.correctSorts = session.correctSorts + 1
	else
		-- Wrong bin
		if mineral.name == "Cr_VI" then
			-- Toxic Cr(VI) in wrong bin — severe penalty
			session.score = session.score + SCORE_TOXIC_WRONG
			session.toxicErrors = session.toxicErrors + 1
		else
			session.score = session.score + SCORE_WRONG
		end
		session.wrongSorts = session.wrongSorts + 1
	end

	-- Remove the physical orb part from workspace
	if session.playerFolder then
		local orbPart = session.playerFolder:FindFirstChild(orbId)
		if orbPart then
			orbPart:Destroy()
		end
	end
end)

-- CLIENT REQUEST: Set pH value for a metal (bonus round)
Remotes.RequestSetPH.OnServerEvent:Connect(function(player, metalName, phValue)
	local userId = player.UserId
	local session = activeSessions[userId]

	-- Validate session and pH round
	if not session or not session.active then return end
	if not session.phRoundActive then return end

	-- Validate input types
	if type(metalName) ~= "string" then return end
	if type(phValue) ~= "number" then return end

	-- Clamp pH to valid range
	phValue = math.clamp(phValue, 0, 14)

	-- Validate metal name is one of our targets
	local validMetal = false
	for _, target in ipairs(PH_TARGETS) do
		if target.metalName == metalName then
			validMetal = true
			break
		end
	end
	if not validMetal then return end

	-- Prevent re-submission for same metal
	if session.phResults[metalName] then return end

	-- Record the answer (evaluation happens when all 3 are in or timeout)
	session.phResults[metalName] = {
		phValue = phValue,
		correct = false, -- evaluated later
	}
end)

-- ══════════════════════════════════════════════
-- PLAYER DISCONNECT CLEANUP
-- ══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	local userId = player.UserId
	local session = activeSessions[userId]
	if session then
		endSession(session)
	end
	playerCooldowns[userId] = nil
end)

-- ══════════════════════════════════════════════
-- PROXIMITY DETECTION LOOP
-- Periodically checks if players are near the HGMS machine and
-- informs them they can start the mini-game (via ServerAnnounce).
-- ══════════════════════════════════════════════

local proximityNotified = {} -- { [userId] = lastNotifyTime }

task.spawn(function()
	while true do
		for _, player in ipairs(Players:GetPlayers()) do
			local userId = player.UserId
			-- Skip if player is already in a session
			if not activeSessions[userId] and isPlayerNearHGMS(player) then
				local lastNotify = proximityNotified[userId]
				local now = tick()
				-- Notify at most once every 15 seconds
				if not lastNotify or (now - lastNotify) > 15 then
					proximityNotified[userId] = now
					Remotes.FireClient("ServerAnnounce", player, {
						message = "HGMS Separator detected nearby! Press [E] or tap to start the mineral sorting challenge.",
						rarity = "common",
					})
				end
			end
		end
		task.wait(3)
	end
end)

-- Clean up proximity tracking on leave
Players.PlayerRemoving:Connect(function(player)
	proximityNotified[player.UserId] = nil
end)

print("[MOLGANG] SlakkenspoorMiniGame initialized — HGMS Color Matching ready at Slakkenspoor Factory")
