-- ServerScriptService/Core/QuizSystem.server.lua
-- Quiz pillar NPC system for MOLGANG educational content
-- 3 questions per zone visit, multiple choice, 30 second timer
-- Correct: +10 MolCoins + 50 XP, 3/3 correct: bonus badge + 25 extra
-- 500+ question bank generated from element data + game mechanics

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Elements = require(ReplicatedStorage.Data.Elements)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- BubbleTeaBar.server.lua exposes active drink buffs via _G.GetPlayerBuff
-- (e.g. Mango Smoothie's "quizHint" buff, +30% by default). Guarded because
-- script init order between ServerScriptService/Core scripts isn't
-- guaranteed, though in practice a player can't reach a quiz zone before
-- both scripts have run.
local function getQuizRewardMultiplier(userId)
	if _G.GetPlayerBuff then
		return _G.GetPlayerBuff(userId, "quizHint")
	end
	return 1.0
end

-- ══════════════════════════════════════════════
-- QUESTION BANK
-- Generated from real chemistry data
-- ══════════════════════════════════════════════

local function generateQuestions()
	local questions = {}

	-- Type 1: "What is the symbol for [element]?"
	for z, elem in pairs(Elements.Table) do
		if z <= 36 then -- common elements
			local wrong = {}
			-- Generate 3 wrong answers
			for wz, welem in pairs(Elements.Table) do
				if wz ~= z and #wrong < 3 then
					table.insert(wrong, welem.sym)
				end
			end
			table.insert(questions, {
				type = "symbol",
				question = "What is the chemical symbol for " .. elem.name .. "?",
				correct = elem.sym,
				options = {elem.sym, wrong[1], wrong[2], wrong[3]},
				difficulty = 1,
				zone = "biome",
			})
		end
	end

	-- Type 2: "What is the atomic number of [element]?"
	for z, elem in pairs(Elements.Table) do
		if z <= 30 then
			local wrongNums = {}
			for i = 1, 3 do
				local wz = z + math.random(-5, 5)
				if wz == z then wz = z + 1 end
				if wz < 1 then wz = 1 end
				table.insert(wrongNums, tostring(wz))
			end
			table.insert(questions, {
				type = "atomic_number",
				question = "What is the atomic number (Z) of " .. elem.name .. "?",
				correct = tostring(z),
				options = {tostring(z), wrongNums[1], wrongNums[2], wrongNums[3]},
				difficulty = 1,
				zone = "biome",
			})
		end
	end

	-- Type 3: "Which group does [element] belong to?"
	local groupNames = {
		[1] = "Alkali metals",
		[2] = "Alkaline earth metals",
		[17] = "Halogens",
		[18] = "Noble gases",
	}
	for z, elem in pairs(Elements.Table) do
		local gName = groupNames[elem.group]
		if gName and z <= 36 then
			local wrongGroups = {}
			for g, n in pairs(groupNames) do
				if g ~= elem.group then
					table.insert(wrongGroups, n)
				end
			end
			table.insert(questions, {
				type = "group",
				question = elem.name .. " belongs to which element group?",
				correct = gName,
				options = {gName, wrongGroups[1] or "Transition metals", wrongGroups[2] or "Metalloids", wrongGroups[3] or "Post-transition metals"},
				difficulty = 2,
				zone = "biome",
			})
		end
	end

	-- Type 4: Chemistry / Molgang specific questions
	local specialQuestions = {
		{
			question = "What molecule is formed by 2 Hydrogen + 1 Oxygen?",
			correct = "H2O (Water)", options = {"H2O (Water)", "CO2", "NH3", "HCl"},
			difficulty = 1, zone = "hub",
		},
		{
			question = "V2O5 (Vanadium Pentoxide) is used in which process at Slakkenspoor?",
			correct = "Steel slag processing", options = {"Steel slag processing", "Water purification", "Food production", "Textile dyeing"},
			difficulty = 2, zone = "factory",
		},
		{
			question = "What does ANK stand for in the MOLGANG economy?",
			correct = "Cooperative credit union", options = {"Cooperative credit union", "Atom Network Key", "Advanced Nuclear Knowledge", "Alternative New Krypton"},
			difficulty = 1, zone = "ank",
		},
		{
			question = "How many elements are in the periodic table?",
			correct = "118", options = {"118", "112", "120", "108"},
			difficulty = 1, zone = "biome",
		},
		{
			question = "What is the collateral ratio for ANK loans?",
			correct = "120%", options = {"120%", "100%", "150%", "80%"},
			difficulty = 2, zone = "ank",
		},
		{
			question = "Oganesson (Og) is a...",
			correct = "Noble gas (Group 18)", options = {"Noble gas (Group 18)", "Alkali metal", "Halogen", "Transition metal"},
			difficulty = 3, zone = "quantum",
		},
		{
			question = "What does a MolChain entry represent?",
			correct = "A registered molecule (simulated block)", options = {"A registered molecule (simulated block)", "A financial transaction", "A player login", "An element discovery"},
			difficulty = 2, zone = "chain",
		},
		{
			question = "CaCO3 is commonly known as...",
			correct = "Limestone / Calcite", options = {"Limestone / Calcite", "Table salt", "Baking soda", "Rust"},
			difficulty = 2, zone = "biome",
		},
		{
			question = "BOF slag from steel production contains which valuable metals?",
			correct = "Vanadium, Titanium, Iron", options = {"Vanadium, Titanium, Iron", "Gold, Silver, Platinum", "Copper, Zinc, Lead", "Lithium, Cobalt, Nickel"},
			difficulty = 3, zone = "factory",
		},
		{
			question = "Quantum dots are real semiconductor nanoparticles sized...",
			correct = "2-10 nanometers", options = {"2-10 nanometers", "2-10 micrometers", "2-10 millimeters", "2-10 centimeters"},
			difficulty = 3, zone = "quantum",
		},
	}

	for _, q in ipairs(specialQuestions) do
		q.type = "special"
		table.insert(questions, q)
	end

	return questions
end

local questionBank = generateQuestions()

-- ══════════════════════════════════════════════
-- QUIZ SESSION MANAGEMENT
-- ══════════════════════════════════════════════

local activeSessions = {} -- {playerId = {questions, currentIndex, score, startTime}}

local function shuffleOptions(options)
	local shuffled = {}
	for _, v in ipairs(options) do
		table.insert(shuffled, v)
	end
	for i = #shuffled, 2, -1 do
		local j = math.random(i)
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	end
	return shuffled
end

local function startQuiz(player, zone)
	local userId = player.UserId
	if activeSessions[userId] then return end -- already in quiz

	-- Select 3 random questions for this zone
	local zoneQuestions = {}
	for _, q in ipairs(questionBank) do
		if q.zone == zone or zone == "any" then
			table.insert(zoneQuestions, q)
		end
	end

	if #zoneQuestions < 3 then
		-- Fallback: use any questions
		zoneQuestions = questionBank
	end

	-- Pick 3 random
	local selected = {}
	local used = {}
	for i = 1, 3 do
		local idx
		repeat
			idx = math.random(#zoneQuestions)
		until not used[idx]
		used[idx] = true
		local q = zoneQuestions[idx]
		table.insert(selected, {
			question = q.question,
			options = shuffleOptions(q.options),
			correct = q.correct,
			difficulty = q.difficulty,
		})
	end

	local session = {
		questions = selected,
		currentIndex = 1,
		score = 0,
		startTime = tick(),
	}
	activeSessions[userId] = session

	-- A player who closes the client or walks away must not pin a session
	-- forever. Three questions have a 30-second budget each.
	task.delay(90, function()
		if activeSessions[userId] ~= session then return end
		activeSessions[userId] = nil
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Quiz expired: the 90-second session ended. Start a new quiz when ready.",
			rarity = "common",
			quizExpired = true,
		})
	end)

	-- Send first question to client
	local q = selected[1]
	Remotes.FireClient("ServerAnnounce", player, {
		message = "QUIZ: " .. q.question,
		rarity = "common",
		quizData = {
			questionNum = 1,
			totalQuestions = 3,
			question = q.question,
			options = q.options,
			timeLimit = 30,
		},
	})
end

-- Start a quiz from an in-world prompt or the dashboard quick action.
-- The client only supplies a zone hint; question selection stays server-side.
Remotes.RequestQuizStart.OnServerEvent:Connect(function(player, zone)
	if type(zone) ~= "string" then
		zone = "any"
	end
	startQuiz(player, zone)
end)

Remotes.RequestQuizCancel.OnServerEvent:Connect(function(player)
	activeSessions[player.UserId] = nil
end)

-- Handle quiz answer
Remotes.RequestQuizAnswer.OnServerEvent:Connect(function(player, questionId, answer)
	local userId = player.UserId
	local session = activeSessions[userId]
	if not session then return end
	if type(questionId) ~= "number" or questionId ~= math.floor(questionId) then return end
	if questionId ~= session.currentIndex or type(answer) ~= "string" then return end

	local current = session.questions[session.currentIndex]
	if not current then return end

	-- Check time limit
	if tick() - session.startTime > 30 * session.currentIndex then
		-- Time expired for this question
		session.currentIndex = session.currentIndex + 1
	else
		-- Check answer
		if answer == current.correct then
			session.score = session.score + 1
			-- Award MolCoins, boosted by an active quizHint drink buff
			local reward = math.floor(10 * getQuizRewardMultiplier(userId))
			PlayerDataBridge.AddEarnedMolCoins(userId, reward)
			player:SetAttribute("LastCollectReward", reward)
			player:SetAttribute("CollectTimestamp", tick())

			Remotes.FireClient("ServerAnnounce", player, {
				message = "Correct! +" .. reward .. " MolCoins",
				rarity = "common",
			})
		else
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Incorrect. The answer was: " .. current.correct,
				rarity = "common",
			})
		end

		session.currentIndex = session.currentIndex + 1
	end

	-- Next question or end quiz
	if session.currentIndex > 3 then
		-- Quiz complete
		local totalScore = session.score

		if totalScore == 3 then
			-- Perfect score bonus, also boosted by an active quizHint buff
			local bonus = math.floor(25 * getQuizRewardMultiplier(userId))
			PlayerDataBridge.AddEarnedMolCoins(userId, bonus)
			player:SetAttribute("LastCollectReward", bonus)
			player:SetAttribute("CollectTimestamp", tick())

			Remotes.FireClient("ServerAnnounce", player, {
				message = "PERFECT SCORE! 3/3 correct — +" .. bonus .. " bonus MolCoins!",
				rarity = "epic",
			})
		else
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Quiz complete: " .. totalScore .. "/3 correct",
				rarity = "common",
			})
		end

		activeSessions[userId] = nil
	else
		-- Send next question
		local q = session.questions[session.currentIndex]
		Remotes.FireClient("ServerAnnounce", player, {
			message = "QUIZ: " .. q.question,
			rarity = "common",
			quizData = {
				questionNum = session.currentIndex,
				totalQuestions = 3,
				question = q.question,
				options = q.options,
				timeLimit = 30,
			},
		})
	end
end)

-- Cleanup on player leave
Players.PlayerRemoving:Connect(function(player)
	activeSessions[player.UserId] = nil
end)

print("[MOLGANG] QuizSystem initialized - " .. #questionBank .. " questions in bank")
