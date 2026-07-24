-- ServerScriptService/Core/NPCSystem.server.lua
-- GTA6-inspired NPC system for MOLGANG educational chemistry game
-- 6 unique NPCs with daily schedules, trust levels, and contextual dialogue
-- Trust range 0.0-1.0, schedule-based movement, proximity-triggered dialogue

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local CollectionService = game:GetService("CollectionService")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- ══════════════════════════════════════════════
-- CONFIGURATION
-- ══════════════════════════════════════════════

local TRUST_DEFAULT = 0.3
local TRUST_MIN = 0.0
local TRUST_MAX = 1.0
local TRUST_INCREMENT = 0.05      -- positive action
local TRUST_DECREMENT = -0.1      -- negative action (faster decrease)
local NPC_WALK_SPEED = 10         -- studs per second
local PROXIMITY_RANGE = 8         -- studs for ProximityPrompt
local DIALOGUE_DISPLAY_TIME = 6   -- seconds to show speech bubble
local SCHEDULE_CHECK_INTERVAL = 10 -- seconds between schedule checks
local GAME_HOUR_SECONDS = 60      -- 1 real minute = 1 game hour (24 min full day)

-- NPC body colors per character
local NPC_COLORS = {
	Femke   = { head = Color3.fromRGB(255, 224, 189), torso = Color3.fromRGB(255, 255, 255), legs = Color3.fromRGB(50, 50, 120) },
	Vanadis = { head = Color3.fromRGB(210, 180, 140), torso = Color3.fromRGB(200, 100, 40),  legs = Color3.fromRGB(70, 70, 70) },
	Ank     = { head = Color3.fromRGB(255, 220, 185), torso = Color3.fromRGB(34, 139, 34),   legs = Color3.fromRGB(40, 40, 40) },
	Kwantje = { head = Color3.fromRGB(240, 210, 170), torso = Color3.fromRGB(80, 180, 255),  legs = Color3.fromRGB(30, 30, 30) },
	Yusuf   = { head = Color3.fromRGB(180, 140, 100), torso = Color3.fromRGB(220, 200, 50),  legs = Color3.fromRGB(60, 50, 40) },
	Quiz    = { head = Color3.fromRGB(160, 80, 255),  torso = Color3.fromRGB(160, 80, 255),  legs = Color3.fromRGB(160, 80, 255) },
}

-- ══════════════════════════════════════════════
-- WORLD POSITION REFERENCE
-- Derived from WorldBuilder.server.lua zone centers
-- ══════════════════════════════════════════════

local ZONE_POSITIONS = {
	-- Zone 1: Nexus Hub (Centrum) — center of the world at (0, 14, 0)
	nexus_hub       = Vector3.new(0, 15, 0),
	nexus_lab       = Vector3.new(60, 15, -60),      -- near MolChain Tower preview
	nexus_lecture    = Vector3.new(-60, 15, 50),       -- ANK building area (lecture hall)
	nexus_market     = Vector3.new(0, 15, 60),         -- MarketPlaza
	nexus_home       = Vector3.new(-30, 15, -40),      -- residential corner

	-- Zone 2: Periodic Table Biome (Noord) at (100, 10, 2000)
	biome_park       = Vector3.new(100, 12, 2000),

	-- Zone 3: Quantum Lab (Oost) at (2000, 32, 0)
	quantum_lab      = Vector3.new(2000, 35, 0),
	quantum_upper    = Vector3.new(2050, 55, -40),

	-- Zone 4: Slakkenspoor Fabriek (West) at (-2000, 9, 0)
	factory_main     = Vector3.new(-2000, 12, 0),
	factory_invoer   = Vector3.new(-2100, 12, -40),
	factory_cafe     = Vector3.new(-1900, 12, 50),
	factory_home     = Vector3.new(-1850, 12, -30),

	-- Zone 5: MolChain Tower (Centrum-Oost) at (500, 7, 0)
	tower_base       = Vector3.new(500, 10, 0),

	-- Zone 6: ANK Kredietunie (Centrum-West) at (-500, 7, 0)
	ank_building     = Vector3.new(-500, 10, 0),

	-- Quiz pillar positions (one per zone)
	quiz_nexus       = Vector3.new(25, 15, 25),
	quiz_biome       = Vector3.new(130, 12, 2020),
	quiz_quantum     = Vector3.new(2030, 35, 30),
	quiz_factory     = Vector3.new(-1960, 12, 30),
	quiz_tower       = Vector3.new(530, 10, 30),
	quiz_ank         = Vector3.new(-470, 10, 30),
}

-- ══════════════════════════════════════════════
-- TRUST STORAGE (per player per NPC)
-- ══════════════════════════════════════════════

local trustData = {} -- { [userId] = { [npcId] = trustFloat } }

local function persistTrust(player)
	local playerData = PlayerDataBridge.GetPlayerData(player.UserId)
	local current = trustData[player.UserId]
	if not playerData or not current then return end
	playerData.npcTrust = {}
	for npcId, value in pairs(current) do
		playerData.npcTrust[npcId] = math.clamp(value, TRUST_MIN, TRUST_MAX)
	end
end

local function getTrust(player, npcId)
	local userId = player.UserId
	if not trustData[userId] then
		local playerData = PlayerDataBridge.GetPlayerData(userId)
		local saved = playerData and playerData.npcTrust
		trustData[userId] = {}
		if saved then
			for savedNpcId, savedValue in pairs(saved) do
				if type(savedValue) == "number" then
					trustData[userId][savedNpcId] = math.clamp(savedValue, TRUST_MIN, TRUST_MAX)
				end
			end
		end
	end
	if not trustData[userId][npcId] then
		trustData[userId][npcId] = TRUST_DEFAULT
	end
	return trustData[userId][npcId]
end

local function setTrust(player, npcId, value)
	local userId = player.UserId
	if not trustData[userId] then
		trustData[userId] = {}
	end
	trustData[userId][npcId] = math.clamp(value, TRUST_MIN, TRUST_MAX)
end

local function modifyTrust(player, npcId, delta)
	local current = getTrust(player, npcId)
	setTrust(player, npcId, current + delta)
	persistTrust(player)
	return getTrust(player, npcId)
end

-- Trust bracket: "low" (0-0.3), "mid" (0.3-0.6), "high" (0.6-1.0)
local function getTrustBracket(trust)
	if trust < 0.3 then
		return "low"
	elseif trust < 0.6 then
		return "mid"
	else
		return "high"
	end
end

-- ══════════════════════════════════════════════
-- GAME TIME SYSTEM
-- In-game clock: 1 real minute = 1 game hour
-- ══════════════════════════════════════════════

local gameStartTime = os.time()

local function getGameTime()
	local elapsed = os.time() - gameStartTime
	local totalGameHours = (elapsed / GAME_HOUR_SECONDS)
	local gameHour = math.floor(totalGameHours) % 24
	local gameMinute = math.floor((totalGameHours % 1) * 60)
	-- Day of week: 0=Monday .. 6=Sunday (cycles every 7 game-days)
	local gameDayTotal = math.floor(totalGameHours / 24)
	local gameDayOfWeek = gameDayTotal % 7 -- 0=Mon, 5=Sat, 6=Sun
	return gameHour, gameMinute, gameDayOfWeek
end

local function isWeekend()
	local _, _, dayOfWeek = getGameTime()
	return dayOfWeek >= 5 -- Saturday (5) or Sunday (6)
end

-- ══════════════════════════════════════════════
-- DIALOGUE BANKS
-- Each NPC has dialogue organized by trust bracket
-- ══════════════════════════════════════════════

local DIALOGUE = {}

-- ──────────────────────────────────────────────
-- 1. Prof. Femke van Mol — 24 variants
-- ──────────────────────────────────────────────
DIALOGUE.femke = {
	low = {
		"Welcome to Moleculia. I'm Professor van Mol. Stand still if you want to learn something.",
		"Chemistry isn't magic — it's logic. Each element follows rules. Do you know the periodic table?",
		"You look new here. The periodic table biome to the north has all 118 elements laid out spatially.",
		"A molecule is atoms bonded together. Water? Two hydrogen, one oxygen. Simple, but precise.",
		"I don't give free answers. Prove you understand the basics first. Try a quiz pillar.",
		"Element groups tell you behavior. Group 1? Reactive metals. Group 18? Noble gases. Learn the pattern.",
		"Molecule building requires exact ratios. Don't guess — calculate.",
		"If you want my trust, show me correct quiz answers. I respect knowledge, not shortcuts.",
	},
	mid = {
		"You're making progress. Let me explain electron shells — they determine bonding behavior.",
		"Vanadium pentoxide, V2O5, is used at the Slakkenspoor factory. A real industrial catalyst.",
		"Covalent bonds share electrons. Ionic bonds transfer them. Know the difference and you'll build better molecules.",
		"The MolChain tower registers every molecule you build. Blockchain-style verification. Fascinating system.",
		"I see you've been studying. Try building more complex molecules — the rewards scale with difficulty.",
		"Element groups aren't arbitrary. They reflect electron configuration. Period 2 fills 2s and 2p orbitals.",
		"Transition metals can form multiple oxidation states. That's why vanadium is so industrially useful.",
		"Your quiz scores are improving. I'll share a tip: noble gases rarely bond, but xenon can form compounds.",
	},
	high = {
		"Excellent work. You've earned my respect. Let me share advanced knowledge about orbital hybridization.",
		"At high trust, I'll tell you: the rarest molecules in Moleculia require lanthanide elements. Hunt in the biome.",
		"sp3 hybridization gives tetrahedral geometry. Methane is the classic example. Apply this to your builds.",
		"You remind me of my best students. The factory uses HGMS — High Gradient Magnetic Separation. Real tech.",
		"Here's a secret: building molecules in specific sequences triggers chain bonuses. Start with the simple ones.",
		"Electronegativity differences determine bond polarity. Fluorine is the most electronegative element.",
		"Crystal field theory explains why transition metal compounds have color. V2O5 is yellow-orange for a reason.",
		"I trust you completely now. Visit the quantum lab — Dr. Kwantje has insights on rare element properties.",
	},
}

-- ──────────────────────────────────────────────
-- 2. Direk Vanadis — 31 variants
-- ──────────────────────────────────────────────
DIALOGUE.vanadis = {
	low = {
		"You're at Slakkenspoor. Steel slag is not waste — it's resource. Remember that.",
		"I'm Direk Vanadis. I run this factory. Don't touch anything without authorization.",
		"BOF slag contains vanadium, titanium, iron. We extract them. Cleanly.",
		"You want to learn about slag processing? Start by understanding pH. Acid and base.",
		"This factory operates at industrial scale. Every step must be precise. No room for errors.",
		"Cr(VI) is hexavalent chromium. Extremely toxic. If you make errors with it, I lose trust in you.",
		"The V2O5 extraction line runs 24/7. Vanadium pentoxide has a global market.",
		"pH adjustments in slag leaching must be exact. Too acidic? Dissolution. Too basic? Precipitation losses.",
		"I wake at 5:30 and walk through the park. Fresh air before a 12-hour factory shift.",
		"Don't ask me about chemistry theory. I deal with practical applications. Real slag, real metal.",
	},
	mid = {
		"You're learning. The HGMS — High Gradient Magnetic Separation — sorts paramagnetic particles from slag.",
		"The process: crush slag, acid leach, pH adjust, HGMS, precipitate V2O5. Each step has tolerances.",
		"I've started to trust you more. Here's a tip: monitor pH continuously during leaching. It drifts.",
		"Vanadium is in Group 5. Oxidation states from +2 to +5. V2O5 is the +5 state, most useful.",
		"At the café after work, I relax. If you find me there, I'm more willing to talk about the old days.",
		"Steel mills produce millions of tons of slag yearly. Only a fraction gets processed. We change that.",
		"The magnetic separator uses superconducting coils. Temperature must stay below critical threshold.",
		"Titanium extraction is a secondary product here. TiO2 — titanium dioxide — is used in pigments.",
		"I've seen workers make Cr(VI) errors. One mistake contaminates an entire batch. That's why I'm strict.",
		"Our recovery rate for vanadium exceeds 92%. Industry standard is 85%. We're better because we're precise.",
		"The park at dawn is quiet. Best time to think about process optimization.",
	},
	high = {
		"You've proven yourself. I'll share the factory's proprietary pH curve for maximum V2O5 yield.",
		"At trust above 0.8, I'll tell you: we're experimenting with bioleaching. Bacteria that extract metals.",
		"The expert process: two-stage leaching. First sulfuric acid at pH 1.5, then ammonium sulfate at pH 8.",
		"You handle Cr(VI) correctly. That's rare. Most people panic. You stayed methodical.",
		"Here's a factory secret: the magnetic field gradient we use is 500 T/m. Higher than any competitor.",
		"I respect your work ethic. If you want, I can teach you about rare earth recovery from slag.",
		"Vanadium redox flow batteries are the future of energy storage. We're already producing battery-grade V2O5.",
		"The slag processing chain you've mastered connects to the MolChain tower. Every extraction is registered.",
		"At this trust level, I'll introduce you to the night shift protocols. That's where the advanced runs happen.",
		"You've earned the title of Process Specialist. Congratulations. Few players reach this point.",
	},
}

-- ──────────────────────────────────────────────
-- 3. Ank Koopman — 19 variants
-- ──────────────────────────────────────────────
DIALOGUE.ank = {
	low = {
		"Welcome to ANK — your cooperative credit union. We lend MolCoins fairly.",
		"I'm Ank Koopman. Before I trust you with large loans, build your credit history.",
		"The interest rate is 5% per game-day. Collateral required: 120% of the loan value.",
		"We're closed on weekends. Come back Monday through Friday, 08:30 to 17:00.",
		"MolCoins represent real value in Moleculia. Don't borrow more than you can repay.",
		"A cooperative means we're owned by our members. Every lender and borrower has a voice.",
		"Your credit history is empty. Start small — borrow 100 MolCoins and repay on time.",
	},
	mid = {
		"Your repayment record is building up. I can offer you slightly better terms now.",
		"The ANK fee is 1% of each loan. It goes to the community treasury for public goods.",
		"Tip: lend to other players too. Being a lender improves your trust score faster than borrowing.",
		"The cooperative model works because everyone participates. Lenders earn interest, borrowers get capital.",
		"I notice you repay on time. That's the most important factor in your ANK trust score.",
		"MolCoin value fluctuates based on total economy activity. Check the market for current rates.",
	},
	high = {
		"Outstanding credit history. I'm authorizing higher loan limits for you — up to 10,000 MolCoins.",
		"At your trust level, I'll share a secret: the treasury balance determines how generous rates can be.",
		"You've become one of our most reliable members. Consider becoming a lender — the returns are excellent.",
		"Here's an insider tip: loans taken just before a market price increase effectively cost less to repay.",
		"Your ANK standing is exemplary. If all members were like you, the cooperative would thrive indefinitely.",
		"I trust you completely. You now have access to emergency loans with reduced collateral — 100% instead of 120%.",
	},
}

-- ──────────────────────────────────────────────
-- 4. Dr. Kwantje van der Berg — 41 variants
-- ──────────────────────────────────────────────
DIALOGUE.kwantje = {
	low = {
		"Hmm? Oh, you're here. I was in the middle of a superposition calculation. What do you want?",
		"I'm Dr. Kwantje. I study quantum behavior of rare elements. Don't expect consistent answers from me.",
		"Oganesson — element 118. Noble gas. Except it might be a solid. Quantum effects are strange.",
		"The quantum dots floating in this lab? Real semiconductor nanoparticles, 2-10 nanometers across.",
		"I forget lunch sometimes. Actually, I forget it about 18% of the time. I calculated it.",
		"Wave-particle duality isn't just theory here. The dot collector works on quantum probability.",
		"You want tips for catching quantum dots? Well, they have probability distributions. Maybe try left?",
		"Or try right. The answer changes depending on when you observe it. That's quantum mechanics.",
		"I've been here since 9 AM. What time is it? ...I see. I'll leave when my calculations finish.",
		"The uncertainty principle: you can't know both position and momentum precisely. Applies to dot catching.",
		"Ask me the same question tomorrow. You'll get a different answer. That's not a bug — it's a feature.",
		"Rare elements beyond uranium are mostly synthetic. But in Moleculia, they manifest as quantum dots.",
		"My lab runs until 1 AM. Most scientists leave at 5. I consider that midday.",
		"Electron tunneling means particles pass through barriers. Impossible classically, normal quantumly.",
	},
	mid = {
		"Your persistence impresses me. Most visitors leave after my first contradictory answer.",
		"Let me explain: quantum dots confine electrons in three dimensions. This creates discrete energy levels.",
		"The color of a quantum dot depends on its size. Smaller dots emit blue light, larger ones emit red.",
		"I'll give you a consistent answer for once: Group 18 elements have full valence shells. That's reliable.",
		"Heisenberg's uncertainty principle: delta-x times delta-p >= h-bar over 2. Memorize it.",
		"Quantum entanglement means two particles share state instantaneously. Einstein called it spooky action.",
		"In this lab, I've managed to simulate orbital shapes. The d-orbitals are particularly beautiful.",
		"Sometimes I give different answers to the same question because I'm exploring possibility space.",
		"Schrödinger's cat is a thought experiment. In Moleculia, we have actual superposition events.",
		"The quantum dot collector rewards patience. High-value dots appear in low-probability locations.",
		"I respect that you keep coming back despite my... unconventional teaching style.",
		"Fermions obey Pauli exclusion. Bosons don't. This is why electron configuration follows specific rules.",
		"The rare element spawns in the biome correlate with real-world abundance. Oganesson is extremely rare.",
		"My calculations suggest you're becoming a better scientist. The data supports moderate trust.",
	},
	high = {
		"You've proven you can handle uncertainty. That makes you a true quantum thinker.",
		"At high trust, I'll be more consistent. The dot spawns follow a Poisson distribution, lambda = 3.7.",
		"Here's my most guarded secret: the quantum lab has a hidden resonance chamber. Find the frequency.",
		"Spin-orbit coupling splits energy levels. This is why transition metal spectra have fine structure.",
		"I've been studying element 118 for decades. In this simulation, it behaves differently than predicted.",
		"Quantum decoherence is the enemy. The dots lose quantum properties when observed too long. Be quick.",
		"The rare quantum dots — Oganesson type — appear only between 23:00 and 01:00 game time. Now you know.",
		"I trust you with this: my calculations show the quantum lab has emergent properties at full capacity.",
		"Bose-Einstein condensates form at near-zero Kelvin. In Moleculia, the quantum fog simulates this.",
		"You've reached expert level. The probability distributions I share with you now will be 90% accurate.",
		"Here's a formula: Expected dots per hour = base_rate * (1 + 0.2 * trust_level). Your rate is now highest.",
		"The quantum eraser experiment proves measurement affects reality. In Moleculia, your trust affects my answers.",
		"I rarely say this, but: you understand quantum mechanics better than most of my colleagues. Well done.",
	},
}

-- ──────────────────────────────────────────────
-- 5. Marktkoopman Yusuf — 12 variants
-- ──────────────────────────────────────────────
DIALOGUE.yusuf = {
	low = {
		"Welcome to the Moleculia Market! I'm Yusuf. Atoms for sale, atoms for trade.",
		"Prices change based on supply and demand. Check back often for good deals.",
		"You're new? I give fair prices, but my best deals are reserved for trusted traders.",
		"Registration ratio matters here. The more atoms you register on the chain, the better your reputation.",
	},
	mid = {
		"Your trading record is decent. I can offer you 10% better prices on common elements.",
		"Market tip: rare elements spike in price when few players are collecting. Time your trades.",
		"I've seen many traders come and go. The successful ones diversify their atom portfolios.",
		"The economy runs on participation. Buy low, build molecules, register them. That's the cycle.",
	},
	high = {
		"You're one of my best customers! VIP pricing unlocked — 25% discount on all atoms.",
		"Insider tip: the MolChain tower tracks global supply. When supply drops, I raise prices. Act early.",
		"At your trust level, I'll hold rare atoms for you before they hit the public market. First pick.",
		"You've mastered the Moleculia economy. Between you and me, lanthanides are about to spike.",
	},
}

-- ──────────────────────────────────────────────
-- 6. Quiz Zuil Robot — static, no trust dialogue
--    (uses QuizSystem for actual quiz logic)
-- ──────────────────────────────────────────────
DIALOGUE.quiz = {
	low = {
		"[QUIZ PILLAR ACTIVATED] Approach to test your chemistry knowledge. 3 questions, 30 seconds each.",
		"Beep boop. Quiz protocol initiated. Correct answers earn MolCoins and increase NPC trust.",
	},
	mid = {
		"Welcome back, student. Your quiz accuracy is improving. Ready for harder questions?",
		"Quiz pillar online. Difficulty scales with your performance. Show me what you've learned.",
	},
	high = {
		"Expert mode available. You've proven mastery. Prepare for advanced chemistry challenges.",
		"Quiz protocol: maximum difficulty. Rewards doubled for expert-level players. Begin when ready.",
	},
}

-- ══════════════════════════════════════════════
-- NPC SCHEDULE DEFINITIONS
-- Times in 24h format, each entry: { hour, minute, waypointKey }
-- NPCs move to the next scheduled waypoint when game time passes the threshold
-- ══════════════════════════════════════════════

local SCHEDULES = {}

-- Prof. Femke van Mol: lab → lecture → lunch → tower → home
SCHEDULES.femke = {
	{ hour = 7,  minute = 0,  waypoint = "nexus_lab" },
	{ hour = 9,  minute = 0,  waypoint = "nexus_lecture" },
	{ hour = 12, minute = 30, waypoint = "nexus_market" },
	{ hour = 15, minute = 0,  waypoint = "tower_base" },
	{ hour = 19, minute = 0,  waypoint = "nexus_home" },
}

-- Direk Vanadis: park → work → café → home
SCHEDULES.vanadis = {
	{ hour = 5,  minute = 30, waypoint = "biome_park" },
	{ hour = 6,  minute = 0,  waypoint = "factory_main" },
	{ hour = 18, minute = 0,  waypoint = "factory_cafe" },
	{ hour = 22, minute = 0,  waypoint = "factory_home" },
}

-- Ank Koopman: open → close (weekday only, closed on weekends)
SCHEDULES.ank = {
	{ hour = 8,  minute = 30, waypoint = "ank_building" },
	{ hour = 17, minute = 0,  waypoint = "nexus_home" },   -- goes home after closing
}

-- Dr. Kwantje van der Berg: in lab basically all day (09:00 to 01:00)
-- 18% chance to forget lunch at 12:00
SCHEDULES.kwantje = {
	{ hour = 9,  minute = 0,  waypoint = "quantum_lab" },
	{ hour = 12, minute = 0,  waypoint = "quantum_lab" },  -- might stay or go to market
	{ hour = 13, minute = 0,  waypoint = "quantum_lab" },
	{ hour = 1,  minute = 0,  waypoint = "nexus_home" },   -- finally goes home at 1 AM
}

-- Marktkoopman Yusuf: market hours 09:00-18:00
SCHEDULES.yusuf = {
	{ hour = 9,  minute = 0,  waypoint = "nexus_market" },
	{ hour = 18, minute = 0,  waypoint = "nexus_home" },
}

-- Quiz Zuil Robot: static, no schedule (spawned at fixed positions)

-- ══════════════════════════════════════════════
-- NPC MODEL BUILDER
-- Creates a simple humanoid character with colored body parts
-- ══════════════════════════════════════════════

local function createNPCModel(npcId, displayName, colorSet, startPosition)
	local model = Instance.new("Model")
	model.Name = "NPC_" .. npcId

	-- Torso (root part)
	local torso = Instance.new("Part")
	torso.Name = "HumanoidRootPart"
	torso.Size = Vector3.new(2, 2, 1)
	torso.Position = startPosition + Vector3.new(0, 3, 0)
	torso.Color = colorSet.torso
	torso.Material = Enum.Material.SmoothPlastic
	torso.Anchored = false
	torso.CanCollide = true
	torso.Parent = model

	-- Head
	local head = Instance.new("Part")
	head.Name = "Head"
	head.Shape = Enum.PartType.Ball
	head.Size = Vector3.new(1.6, 1.6, 1.6)
	head.Position = startPosition + Vector3.new(0, 4.8, 0)
	head.Color = colorSet.head
	head.Material = Enum.Material.SmoothPlastic
	head.Anchored = false
	head.CanCollide = false
	head.Parent = model

	-- Neck weld
	local neckWeld = Instance.new("Weld")
	neckWeld.Part0 = torso
	neckWeld.Part1 = head
	neckWeld.C0 = CFrame.new(0, 1.8, 0)
	neckWeld.Parent = torso

	-- Left leg
	local leftLeg = Instance.new("Part")
	leftLeg.Name = "LeftLeg"
	leftLeg.Size = Vector3.new(0.8, 2, 0.8)
	leftLeg.Position = startPosition + Vector3.new(-0.5, 1, 0)
	leftLeg.Color = colorSet.legs
	leftLeg.Material = Enum.Material.SmoothPlastic
	leftLeg.Anchored = false
	leftLeg.CanCollide = false
	leftLeg.Parent = model

	local leftWeld = Instance.new("Weld")
	leftWeld.Part0 = torso
	leftWeld.Part1 = leftLeg
	leftWeld.C0 = CFrame.new(-0.5, -2, 0)
	leftWeld.Parent = torso

	-- Right leg
	local rightLeg = Instance.new("Part")
	rightLeg.Name = "RightLeg"
	rightLeg.Size = Vector3.new(0.8, 2, 0.8)
	rightLeg.Position = startPosition + Vector3.new(0.5, 1, 0)
	rightLeg.Color = colorSet.legs
	rightLeg.Material = Enum.Material.SmoothPlastic
	rightLeg.Anchored = false
	rightLeg.CanCollide = false
	rightLeg.Parent = model

	local rightWeld = Instance.new("Weld")
	rightWeld.Part0 = torso
	rightWeld.Part1 = rightLeg
	rightWeld.C0 = CFrame.new(0.5, -2, 0)
	rightWeld.Parent = torso

	-- Humanoid (required for MoveTo)
	local humanoid = Instance.new("Humanoid")
	humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None -- we use custom billboard
	humanoid.WalkSpeed = NPC_WALK_SPEED
	humanoid.MaxHealth = 100
	humanoid.Health = 100
	humanoid.Parent = model

	-- Set PrimaryPart
	model.PrimaryPart = torso

	-- BillboardGui for name + trust indicator
	local billboard = Instance.new("BillboardGui")
	billboard.Name = "NPCBillboard"
	billboard.Size = UDim2.new(6, 0, 2, 0)
	billboard.StudsOffset = Vector3.new(0, 3.5, 0)
	billboard.AlwaysOnTop = false
	billboard.MaxDistance = 40
	billboard.Adornee = head
	billboard.Parent = head

	local nameLabel = Instance.new("TextLabel")
	nameLabel.Name = "NameLabel"
	nameLabel.Size = UDim2.new(1, 0, 0.5, 0)
	nameLabel.Position = UDim2.new(0, 0, 0, 0)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = displayName
	nameLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
	nameLabel.TextStrokeTransparency = 0.3
	nameLabel.TextScaled = true
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Parent = billboard

	local trustLabel = Instance.new("TextLabel")
	trustLabel.Name = "TrustLabel"
	trustLabel.Size = UDim2.new(1, 0, 0.3, 0)
	trustLabel.Position = UDim2.new(0, 0, 0.55, 0)
	trustLabel.BackgroundTransparency = 1
	trustLabel.Text = ""  -- updated per-player from client
	trustLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
	trustLabel.TextStrokeTransparency = 0.5
	trustLabel.TextScaled = true
	trustLabel.Font = Enum.Font.Gotham
	trustLabel.Parent = billboard

	-- Speech bubble (hidden by default)
	local speechBubble = Instance.new("BillboardGui")
	speechBubble.Name = "SpeechBubble"
	speechBubble.Size = UDim2.new(10, 0, 3, 0)
	speechBubble.StudsOffset = Vector3.new(0, 5.5, 0)
	speechBubble.AlwaysOnTop = false
	speechBubble.MaxDistance = 25
	speechBubble.Adornee = head
	speechBubble.Enabled = false
	speechBubble.Parent = head

	local speechBg = Instance.new("Frame")
	speechBg.Name = "Background"
	speechBg.Size = UDim2.new(1, 0, 1, 0)
	speechBg.BackgroundColor3 = Color3.fromRGB(20, 25, 35)
	speechBg.BackgroundTransparency = 0.15
	speechBg.BorderSizePixel = 0
	speechBg.Parent = speechBubble

	local speechCorner = Instance.new("UICorner")
	speechCorner.CornerRadius = UDim.new(0.1, 0)
	speechCorner.Parent = speechBg

	local speechStroke = Instance.new("UIStroke")
	speechStroke.Color = Color3.fromRGB(0, 255, 120)
	speechStroke.Thickness = 2
	speechStroke.Transparency = 0.3
	speechStroke.Parent = speechBg

	local speechText = Instance.new("TextLabel")
	speechText.Name = "DialogueText"
	speechText.Size = UDim2.new(0.9, 0, 0.85, 0)
	speechText.Position = UDim2.new(0.05, 0, 0.075, 0)
	speechText.BackgroundTransparency = 1
	speechText.Text = ""
	speechText.TextColor3 = Color3.fromRGB(240, 245, 255)
	speechText.TextStrokeTransparency = 0.6
	speechText.TextScaled = true
	speechText.TextWrapped = true
	speechText.Font = Enum.Font.Gotham
	speechText.Parent = speechBubble

	-- ProximityPrompt for dialogue interaction
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "DialoguePrompt"
	prompt.ActionText = "Talk"
	prompt.ObjectText = displayName
	prompt.MaxActivationDistance = PROXIMITY_RANGE
	prompt.HoldDuration = 0
	prompt.RequiresLineOfSight = false
	prompt.Parent = torso

	-- Tag for CollectionService
	CollectionService:AddTag(model, "NPC")
	CollectionService:AddTag(model, "NPC_" .. npcId)

	-- Store metadata as attributes
	model:SetAttribute("NPCId", npcId)
	model:SetAttribute("DisplayName", displayName)
	model:SetAttribute("CurrentWaypoint", "")
	model:SetAttribute("IsMoving", false)

	return model
end

-- ══════════════════════════════════════════════
-- QUIZ PILLAR BUILDER (static, non-humanoid)
-- ══════════════════════════════════════════════

local function createQuizPillar(waypointKey, zoneLabel)
	local pos = ZONE_POSITIONS[waypointKey]
	if not pos then
		warn("[NPCSystem] Unknown waypoint for quiz pillar:", waypointKey)
		return nil
	end

	local model = Instance.new("Model")
	model.Name = "QuizPillar_" .. zoneLabel

	-- Base pillar
	local pillar = Instance.new("Part")
	pillar.Name = "Pillar"
	pillar.Shape = Enum.PartType.Cylinder
	pillar.Size = Vector3.new(5, 2, 2)        -- height 5, radius 1
	pillar.CFrame = CFrame.new(pos + Vector3.new(0, 2.5, 0)) * CFrame.Angles(0, 0, math.rad(90))
	pillar.Color = Color3.fromRGB(160, 80, 255)
	pillar.Material = Enum.Material.Neon
	pillar.Anchored = true
	pillar.CanCollide = true
	pillar.Parent = model

	-- Top sphere (glowing)
	local top = Instance.new("Part")
	top.Name = "TopGlow"
	top.Shape = Enum.PartType.Ball
	top.Size = Vector3.new(3, 3, 3)
	top.Position = pos + Vector3.new(0, 6, 0)
	top.Color = Color3.fromRGB(200, 120, 255)
	top.Material = Enum.Material.Neon
	top.Transparency = 0.2
	top.Anchored = true
	top.CanCollide = false
	top.Parent = model

	-- Point light
	local light = Instance.new("PointLight")
	light.Color = Color3.fromRGB(180, 100, 255)
	light.Brightness = 2
	light.Range = 20
	light.Parent = top

	-- Billboard
	local billboard = Instance.new("BillboardGui")
	billboard.Name = "QuizBillboard"
	billboard.Size = UDim2.new(5, 0, 1.5, 0)
	billboard.StudsOffset = Vector3.new(0, 4, 0)
	billboard.AlwaysOnTop = false
	billboard.MaxDistance = 30
	billboard.Adornee = top
	billboard.Parent = top

	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 1, 0)
	label.BackgroundTransparency = 1
	label.Text = "QUIZ ZUIL"
	label.TextColor3 = Color3.fromRGB(200, 120, 255)
	label.TextStrokeTransparency = 0.2
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.Parent = billboard

	-- ProximityPrompt to start quiz
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "QuizPrompt"
	prompt.ActionText = "Start Quiz"
	prompt.ObjectText = "Quiz Zuil"
	prompt.MaxActivationDistance = PROXIMITY_RANGE
	prompt.HoldDuration = 0.5
	prompt.RequiresLineOfSight = false
	prompt.Parent = pillar

	model.PrimaryPart = pillar

	-- Tag
	CollectionService:AddTag(model, "NPC")
	CollectionService:AddTag(model, "NPC_quiz")
	CollectionService:AddTag(model, "QuizPillar")

	model:SetAttribute("NPCId", "quiz")
	model:SetAttribute("DisplayName", "Quiz Zuil")
	model:SetAttribute("Zone", zoneLabel)

	return model
end

-- ══════════════════════════════════════════════
-- ANK OPEN/CLOSED INDICATOR
-- ══════════════════════════════════════════════

local ankIndicatorPart = nil

local function createAnkIndicator()
	-- Create a sign part near the ANK building
	local pos = ZONE_POSITIONS.ank_building + Vector3.new(0, 12, -35)
	local sign = Instance.new("Part")
	sign.Name = "ANK_StatusSign"
	sign.Size = Vector3.new(8, 3, 0.5)
	sign.Position = pos
	sign.Color = Color3.fromRGB(34, 139, 34)
	sign.Material = Enum.Material.Neon
	sign.Anchored = true
	sign.CanCollide = false

	local billboard = Instance.new("BillboardGui")
	billboard.Name = "StatusBillboard"
	billboard.Size = UDim2.new(6, 0, 2, 0)
	billboard.StudsOffset = Vector3.new(0, 0, 0)
	billboard.AlwaysOnTop = false
	billboard.MaxDistance = 60
	billboard.Adornee = sign
	billboard.Parent = sign

	local statusLabel = Instance.new("TextLabel")
	statusLabel.Name = "StatusText"
	statusLabel.Size = UDim2.new(1, 0, 1, 0)
	statusLabel.BackgroundTransparency = 1
	statusLabel.Text = "ANK OPEN"
	statusLabel.TextColor3 = Color3.fromRGB(0, 255, 100)
	statusLabel.TextStrokeTransparency = 0.2
	statusLabel.TextScaled = true
	statusLabel.Font = Enum.Font.GothamBold
	statusLabel.Parent = billboard

	ankIndicatorPart = sign
	return sign
end

local function updateAnkIndicator()
	if not ankIndicatorPart then return end

	local billboard = ankIndicatorPart:FindFirstChild("StatusBillboard")
	if not billboard then return end
	local statusLabel = billboard:FindFirstChild("StatusText")
	if not statusLabel then return end

	local hour = getGameTime()
	local weekend = isWeekend()

	if weekend then
		statusLabel.Text = "ANK GESLOTEN (Weekend)"
		statusLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
		ankIndicatorPart.Color = Color3.fromRGB(180, 40, 40)
	elseif hour >= 8 and hour < 17 then
		statusLabel.Text = "ANK OPEN"
		statusLabel.TextColor3 = Color3.fromRGB(0, 255, 100)
		ankIndicatorPart.Color = Color3.fromRGB(34, 139, 34)
	else
		statusLabel.Text = "ANK GESLOTEN"
		statusLabel.TextColor3 = Color3.fromRGB(255, 160, 40)
		ankIndicatorPart.Color = Color3.fromRGB(180, 100, 20)
	end
end

-- ══════════════════════════════════════════════
-- NPC REGISTRY AND SPAWNING
-- ══════════════════════════════════════════════

local npcInstances = {}    -- { npcId = modelInstance }
local npcCooldowns = {}    -- { [npcId .. "_" .. userId] = tick() } dialogue cooldown

local NPC_DEFINITIONS = {
	{
		id = "femke",
		name = "Prof. Femke van Mol",
		colors = NPC_COLORS.Femke,
		startWaypoint = "nexus_lab",
		schedule = SCHEDULES.femke,
		dialogue = DIALOGUE.femke,
	},
	{
		id = "vanadis",
		name = "Direk Vanadis",
		colors = NPC_COLORS.Vanadis,
		startWaypoint = "factory_main",
		schedule = SCHEDULES.vanadis,
		dialogue = DIALOGUE.vanadis,
	},
	{
		id = "ank",
		name = "Ank Koopman",
		colors = NPC_COLORS.Ank,
		startWaypoint = "ank_building",
		schedule = SCHEDULES.ank,
		dialogue = DIALOGUE.ank,
	},
	{
		id = "kwantje",
		name = "Dr. Kwantje van der Berg",
		colors = NPC_COLORS.Kwantje,
		startWaypoint = "quantum_lab",
		schedule = SCHEDULES.kwantje,
		dialogue = DIALOGUE.kwantje,
	},
	{
		id = "yusuf",
		name = "Marktkoopman Yusuf",
		colors = NPC_COLORS.Yusuf,
		startWaypoint = "nexus_market",
		schedule = SCHEDULES.yusuf,
		dialogue = DIALOGUE.yusuf,
	},
}

-- Quiz pillar spawn locations
local QUIZ_PILLAR_LOCATIONS = {
	{ waypointKey = "quiz_nexus",   zone = "Nexus" },
	{ waypointKey = "quiz_biome",   zone = "Biome" },
	{ waypointKey = "quiz_quantum", zone = "Quantum" },
	{ waypointKey = "quiz_factory", zone = "Factory" },
	{ waypointKey = "quiz_tower",   zone = "Tower" },
	{ waypointKey = "quiz_ank",     zone = "ANK" },
}

local function spawnAllNPCs()
	-- Parent folder for all NPCs
	local npcFolder = Instance.new("Folder")
	npcFolder.Name = "NPCs"
	npcFolder.Parent = workspace

	-- Spawn walking NPCs
	for _, def in ipairs(NPC_DEFINITIONS) do
		local startPos = ZONE_POSITIONS[def.startWaypoint]
		if not startPos then
			warn("[NPCSystem] Unknown start waypoint for NPC:", def.id, def.startWaypoint)
			continue
		end

		local model = createNPCModel(def.id, def.name, def.colors, startPos)
		model.Parent = npcFolder
		npcInstances[def.id] = model

		print("[NPCSystem] Spawned NPC:", def.name, "at", def.startWaypoint)
	end

	-- Spawn quiz pillars
	for _, pillarDef in ipairs(QUIZ_PILLAR_LOCATIONS) do
		local pillar = createQuizPillar(pillarDef.waypointKey, pillarDef.zone)
		if pillar then
			pillar.Parent = npcFolder
			print("[NPCSystem] Spawned Quiz Pillar in zone:", pillarDef.zone)
		end
	end

	-- Create ANK open/closed sign
	local ankSign = createAnkIndicator()
	ankSign.Parent = npcFolder

	print("[NPCSystem] All NPCs and quiz pillars spawned")
end

-- ══════════════════════════════════════════════
-- NPC MOVEMENT (schedule-based pathfinding)
-- ══════════════════════════════════════════════

-- Determine which waypoint an NPC should be at based on current game time
local function getScheduledWaypoint(npcId)
	local schedule = nil
	for _, def in ipairs(NPC_DEFINITIONS) do
		if def.id == npcId then
			schedule = def.schedule
			break
		end
	end
	if not schedule then return nil end

	local hour, minute = getGameTime()
	local currentTimeMinutes = hour * 60 + minute

	-- Special: Ank is closed on weekends, stays home
	if npcId == "ank" and isWeekend() then
		return "nexus_home"
	end

	-- Special: Kwantje 18% chance to forget lunch — stay in lab instead of going to market
	if npcId == "kwantje" then
		-- If it's lunchtime (12:00-13:00), 18% chance to stay in lab
		if hour == 12 then
			-- Use a deterministic seed per game-day so it doesn't flicker
			local _, _, dayOfWeek = getGameTime()
			local seed = dayOfWeek * 1000 + 12
			math.randomseed(seed)
			local forgotLunch = math.random(100) <= 18
			math.randomseed(os.time()) -- reset seed
			if forgotLunch then
				return "quantum_lab"
			else
				return "nexus_market"  -- Kwantje goes to market for lunch
			end
		end
	end

	-- Find the latest schedule entry that has passed
	local bestWaypoint = schedule[1].waypoint -- default to first entry
	local bestTime = -1

	for _, entry in ipairs(schedule) do
		local entryMinutes = entry.hour * 60 + entry.minute
		if entryMinutes <= currentTimeMinutes and entryMinutes > bestTime then
			bestTime = entryMinutes
			bestWaypoint = entry.waypoint
		end
	end

	-- Handle wrap-around: if no entry has passed today, use last entry from previous day
	if bestTime == -1 then
		bestWaypoint = schedule[#schedule].waypoint
	end

	return bestWaypoint
end

-- Move NPC to target position using Humanoid:MoveTo()
local function moveNPCTo(npcId, targetWaypointKey)
	local model = npcInstances[npcId]
	if not model then return end

	local targetPos = ZONE_POSITIONS[targetWaypointKey]
	if not targetPos then return end

	local humanoid = model:FindFirstChildOfClass("Humanoid")
	if not humanoid then return end

	local rootPart = model.PrimaryPart
	if not rootPart then return end

	-- Check if already at target (within 5 studs)
	local distance = (rootPart.Position - targetPos).Magnitude
	if distance < 5 then
		model:SetAttribute("IsMoving", false)
		model:SetAttribute("CurrentWaypoint", targetWaypointKey)
		return
	end

	-- Mark as moving
	model:SetAttribute("IsMoving", true)
	model:SetAttribute("CurrentWaypoint", targetWaypointKey)

	-- For large distances (cross-zone), teleport instead of walking
	-- This prevents NPCs from falling off platforms or getting stuck
	if distance > 200 then
		rootPart.CFrame = CFrame.new(targetPos + Vector3.new(0, 3, 0))
		model:SetAttribute("IsMoving", false)
		return
	end

	-- Walk to position
	humanoid:MoveTo(targetPos)

	-- Listen for completion (with timeout)
	local reached = false
	local connection
	connection = humanoid.MoveToFinished:Connect(function(didReach)
		reached = true
		model:SetAttribute("IsMoving", false)
		if connection then
			connection:Disconnect()
		end
	end)

	-- Timeout: if NPC hasn't arrived in 30 seconds, teleport
	task.delay(30, function()
		if not reached then
			if connection then
				connection:Disconnect()
			end
			if rootPart and rootPart.Parent then
				rootPart.CFrame = CFrame.new(targetPos + Vector3.new(0, 3, 0))
			end
			model:SetAttribute("IsMoving", false)
		end
	end)
end

-- ══════════════════════════════════════════════
-- DIALOGUE SELECTION AND DELIVERY
-- ══════════════════════════════════════════════

-- Select a dialogue line based on NPC, trust bracket, and optional context
local function selectDialogue(npcId, trustBracket)
	local dialogueBank = nil
	for _, def in ipairs(NPC_DEFINITIONS) do
		if def.id == npcId then
			dialogueBank = def.dialogue
			break
		end
	end

	-- Fallback for quiz pillar
	if not dialogueBank and npcId == "quiz" then
		dialogueBank = DIALOGUE.quiz
	end

	if not dialogueBank then return "..." end

	local bracketLines = dialogueBank[trustBracket]
	if not bracketLines or #bracketLines == 0 then
		bracketLines = dialogueBank["low"] or { "..." }
	end

	-- Dr. Kwantje special: stochastic behavior — 70% chance of picking a random line
	-- even if the same question was asked (achieved by pure random selection each time)
	-- For other NPCs, also random but the pool is fixed per trust bracket
	local index = math.random(#bracketLines)
	return bracketLines[index]
end

-- Show dialogue via speech bubble (server-side billboard update + remote event to client)
local function showDialogue(npcId, player, dialogueText)
	local model = npcInstances[npcId]

	-- For quiz pillars, find the model differently
	if not model and npcId == "quiz" then
		-- Find nearest quiz pillar to the player
		local character = player.Character
		if not character then return end
		local playerPos = character:GetPivot().Position

		local nearest = nil
		local nearestDist = math.huge
		for _, obj in ipairs(workspace:FindFirstChild("NPCs"):GetChildren()) do
			if obj:GetAttribute("NPCId") == "quiz" then
				local pillarPart = obj.PrimaryPart
				if pillarPart then
					local dist = (pillarPart.Position - playerPos).Magnitude
					if dist < nearestDist then
						nearestDist = dist
						nearest = obj
					end
				end
			end
		end
		model = nearest
	end

	if not model then return end

	-- Find speech bubble and update text
	local head = model:FindFirstChild("Head") or model:FindFirstChild("TopGlow")
	if head then
		local speechBubble = head:FindFirstChild("SpeechBubble")
		if speechBubble then
			local textLabel = speechBubble:FindFirstChild("DialogueText")
			if textLabel then
				textLabel.Text = dialogueText
			end
			speechBubble.Enabled = true

			-- Hide after display time
			task.delay(DIALOGUE_DISPLAY_TIME, function()
				if speechBubble and speechBubble.Parent then
					speechBubble.Enabled = false
				end
			end)
		end
	end

	-- Also send a typed dialogue event so the client can render this per player.
	Remotes.FireClient("NPCDialogue", player, {
		npcName = model:GetAttribute("DisplayName") or npcId,
		text = dialogueText,
		trustLevel = getTrust(player, npcId),
	})
	Remotes.FireClient("ServerAnnounce", player, {
		message = dialogueText,
		rarity = "common",
		npcData = {
			npcId = npcId,
			displayName = model:GetAttribute("DisplayName") or npcId,
			trust = getTrust(player, npcId),
		},
	})
end

-- ══════════════════════════════════════════════
-- MARKET PRICE FLUCTUATION (Yusuf)
-- Prices fluctuate based on simulated demand
-- ══════════════════════════════════════════════

local marketPriceMultiplier = 1.0

local function updateMarketPrices()
	-- Simple demand simulation: fluctuate between 0.7x and 1.3x
	local hour = getGameTime()
	-- Peak hours: 10-14 (higher prices), off-peak: other times
	local baseDemand = 1.0
	if hour >= 10 and hour <= 14 then
		baseDemand = 1.15
	elseif hour >= 18 or hour <= 6 then
		baseDemand = 0.85
	end

	-- Add small random noise
	local noise = (math.random() - 0.5) * 0.2
	marketPriceMultiplier = math.clamp(baseDemand + noise, 0.7, 1.3)
end

-- ══════════════════════════════════════════════
-- PROXIMITY PROMPT HANDLERS
-- ══════════════════════════════════════════════

local function setupProximityHandlers()
	-- Handle all NPC dialogue prompts
	local function onPromptTriggered(prompt, player)
		local model = prompt.Parent and prompt.Parent.Parent
		if not model then
			-- Prompt might be directly on a part in a model
			model = prompt.Parent
			if model and not model:GetAttribute("NPCId") then
				model = model.Parent
			end
		end

		if not model then return end

		local npcId = model:GetAttribute("NPCId")
		if not npcId then return end

		-- Cooldown check (2 seconds between interactions)
		local cooldownKey = npcId .. "_" .. tostring(player.UserId)
		if npcCooldowns[cooldownKey] and (tick() - npcCooldowns[cooldownKey]) < 2 then
			return
		end
		npcCooldowns[cooldownKey] = tick()

		-- Quiz Pillar: trigger QuizSystem instead of dialogue
		if npcId == "quiz" then
			local zone = model:GetAttribute("Zone") or "any"
			local zoneMap = {
				Nexus = "hub",
				Biome = "biome",
				Quantum = "quantum",
				Factory = "factory",
				Tower = "chain",
				ANK = "ank",
			}
			local quizZone = zoneMap[zone] or "any"

			-- Show brief quiz intro dialogue
			local trust = getTrust(player, "quiz")
			local bracket = getTrustBracket(trust)
			local intro = selectDialogue("quiz", bracket)
			showDialogue("quiz", player, intro)

			-- Fire quiz answer request to start the quiz
			-- The QuizSystem listens for RequestQuizAnswer, but we need to trigger the start
			-- We reuse ServerAnnounce to send quiz start data
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Quiz starting...",
				rarity = "common",
				quizStart = {
					zone = quizZone,
					pillarId = model.Name,
				},
			})
			return
		end

		-- Ank special: closed on weekends
		if npcId == "ank" then
			local hour = getGameTime()
			local weekend = isWeekend()
			if weekend then
				showDialogue(npcId, player, "The ANK is closed on weekends. Come back Monday! Typical Dutch, I know.")
				return
			end
			if hour < 8 or hour >= 17 then
				showDialogue(npcId, player, "We're closed for the day. ANK hours: 08:30 - 17:00, Monday to Friday.")
				return
			end
		end

		-- Yusuf special: include price info at higher trust
		if npcId == "yusuf" then
			local hour = getGameTime()
			if hour < 9 or hour >= 18 then
				showDialogue(npcId, player, "The market is closed right now. Come between 09:00 and 18:00!")
				return
			end
		end

		-- Get trust and select dialogue
		local trust = getTrust(player, npcId)
		local bracket = getTrustBracket(trust)
		local dialogueLine = selectDialogue(npcId, bracket)

		-- Dr. Kwantje special: 70% chance of stochastic answer variation
		-- (Already handled by random selection in selectDialogue)
		-- Add occasional meta-comment about stochasticity
		if npcId == "kwantje" and math.random(100) <= 15 then
			dialogueLine = dialogueLine .. " ...Wait, did I already tell you that? The answer might have been different last time."
		end

		-- Yusuf special: append price multiplier info at mid/high trust
		if npcId == "yusuf" and bracket ~= "low" then
			local priceStr = string.format("%.0f%%", marketPriceMultiplier * 100)
			dialogueLine = dialogueLine .. " [Market rate: " .. priceStr .. "]"
		end

		-- Femke special: gives hints when player stands still
		if npcId == "femke" then
			local character = player.Character
			if character then
				local humanoid = character:FindFirstChildOfClass("Humanoid")
				if humanoid and humanoid.MoveDirection.Magnitude < 0.1 then
					-- Player is standing still — Femke gives a bonus hint
					if bracket == "low" then
						dialogueLine = dialogueLine .. " (Tip: stay still and listen. I have more to teach.)"
					elseif bracket == "mid" then
						dialogueLine = dialogueLine .. " (Since you're listening carefully: check the MolChain tower for build bonuses.)"
					else
						dialogueLine = dialogueLine .. " (Expert insight: combine rare elements during peak quantum lab hours for best yields.)"
					end
				end
			end
		end

		showDialogue(npcId, player, dialogueLine)
	end

	-- Connect all proximity prompts via CollectionService
	-- This catches prompts on NPCs spawned now and in the future
	local function connectPrompt(prompt)
		prompt.Triggered:Connect(function(player)
			onPromptTriggered(prompt, player)
		end)
	end

	-- Find all existing ProximityPrompts in the NPC folder
	local npcFolder = workspace:WaitForChild("NPCs", 10)
	if npcFolder then
		for _, descendant in ipairs(npcFolder:GetDescendants()) do
			if descendant:IsA("ProximityPrompt") then
				connectPrompt(descendant)
			end
		end

		-- Also listen for new prompts added later
		npcFolder.DescendantAdded:Connect(function(descendant)
			if descendant:IsA("ProximityPrompt") then
				connectPrompt(descendant)
			end
		end)
	end
end

-- ══════════════════════════════════════════════
-- TRUST EVENT HOOKS
-- Connect to game events that modify trust
-- ══════════════════════════════════════════════

local function setupTrustHooks()
	-- Quiz answers affect trust for Femke and the quiz robot
	Remotes.RequestQuizAnswer.OnServerEvent:Connect(function(player, questionId, answer)
		-- The QuizSystem handles the actual quiz logic and rewards
		-- Here we only handle trust changes
		-- We check if the answer was correct by checking the reward attribute
		task.delay(0.5, function()
			local reward = player:GetAttribute("LastCollectReward")
			local timestamp = player:GetAttribute("CollectTimestamp")
			if reward and timestamp and (tick() - timestamp) < 2 then
				if reward > 0 then
					-- Correct answer: increase trust with Femke and quiz
					modifyTrust(player, "femke", TRUST_INCREMENT)
					modifyTrust(player, "quiz", TRUST_INCREMENT)
				end
			end
		end)
	end)

	-- Molecule builds affect trust for Femke and Vanadis
	-- Listen for MoleculeBuilt events (fired by EconomyManager)
	if Remotes.MoleculeBuilt then
		-- We hook into the attribute system since MoleculeBuilt fires to client
		-- Use PlayerDataBridge to detect builds
	end

	-- Monitor player attributes for economy events that affect trust
	Players.PlayerAdded:Connect(function(player)
		-- Initialize trust data
		local userId = player.UserId
		trustData[userId] = nil
		getTrust(player, "femke")

		-- Watch for attribute changes that indicate game events
		player.AttributeChanged:Connect(function(attributeName)
			if attributeName == "CollectTimestamp" then
				-- An atom was collected or quiz answered — small trust bump for nearby NPCs
				local reward = player:GetAttribute("LastCollectReward")
				if reward and reward > 0 then
					-- Molecule build reward (detected by higher reward values)
					if reward >= 20 then
						modifyTrust(player, "femke", TRUST_INCREMENT)
						modifyTrust(player, "vanadis", TRUST_INCREMENT * 0.5)
					end
				end
			end
		end)
	end)

	-- Loan repayment affects trust with Ank
	if Remotes.LoanRepaid then
		Remotes.LoanRepaid.OnServerEvent:Connect(function(player)
			-- Successful repayment increases Ank trust
			modifyTrust(player, "ank", TRUST_INCREMENT * 2) -- double increment for loans
		end)
	end

	-- Vanadis trust: decreases on Cr(VI) errors
	-- This is tracked via a custom attribute set by factory minigames
	Players.PlayerAdded:Connect(function(player)
		player.AttributeChanged:Connect(function(attributeName)
			if attributeName == "CrVI_Error" then
				local errorCount = player:GetAttribute("CrVI_Error") or 0
				if errorCount > 0 then
					modifyTrust(player, "vanadis", TRUST_DECREMENT)
					player:SetAttribute("CrVI_Error", 0) -- reset after processing
				end
			end

			if attributeName == "pH_StepCorrect" then
				local correct = player:GetAttribute("pH_StepCorrect") or 0
				if correct > 0 then
					modifyTrust(player, "vanadis", TRUST_INCREMENT)
					player:SetAttribute("pH_StepCorrect", 0)
				end
			end

			-- Ank trust from lending activity
			if attributeName == "LoanGiven" then
				modifyTrust(player, "ank", TRUST_INCREMENT)
				player:SetAttribute("LoanGiven", nil)
			end

			-- Yusuf trust based on registration ratio
			if attributeName == "ChainRegistration" then
				modifyTrust(player, "yusuf", TRUST_INCREMENT * 0.5)
				player:SetAttribute("ChainRegistration", nil)
			end
		end)
	end)
end

-- ══════════════════════════════════════════════
-- SCHEDULE UPDATE LOOP
-- Periodically checks game time and moves NPCs
-- ══════════════════════════════════════════════

local lastScheduleCheck = 0

local function scheduleUpdateLoop()
	while true do
		task.wait(SCHEDULE_CHECK_INTERVAL)

		local hour, minute = getGameTime()

		-- Update each walking NPC's position based on schedule
		for _, def in ipairs(NPC_DEFINITIONS) do
			local targetWaypoint = getScheduledWaypoint(def.id)
			if targetWaypoint then
				local model = npcInstances[def.id]
				if model then
					local currentWaypoint = model:GetAttribute("CurrentWaypoint")
					local isMoving = model:GetAttribute("IsMoving")

					-- Only move if target changed and NPC is not already moving
					if targetWaypoint ~= currentWaypoint and not isMoving then
						moveNPCTo(def.id, targetWaypoint)
					end
				end
			end
		end

		-- Update ANK open/closed indicator
		updateAnkIndicator()

		-- Update market prices periodically
		updateMarketPrices()
	end
end

-- ══════════════════════════════════════════════
-- TRUST DISPLAY UPDATE
-- Periodically update trust indicators on NPCs
-- visible to nearby players
-- ══════════════════════════════════════════════

local function trustDisplayLoop()
	while true do
		task.wait(3) -- update every 3 seconds

		for _, player in ipairs(Players:GetPlayers()) do
			local character = player.Character
			if not character then continue end

			local playerPos = character:GetPivot().Position

			-- Check distance to each NPC and update trust display
			for npcId, model in pairs(npcInstances) do
				local rootPart = model.PrimaryPart
				if not rootPart then continue end

				local distance = (rootPart.Position - playerPos).Magnitude
				if distance > 40 then continue end -- only update for nearby NPCs

				local trust = getTrust(player, npcId)
				local trustPercent = math.floor(trust * 100)

				-- BillboardGuis replicate to every player, so trust must be rendered
				-- by each client rather than writing one player's value globally.
				Remotes.FireClient("NPCTrustChanged", player, {
					npcId = npcId,
					npcName = npcId,
					newTrust = trust,
					trustPercent = trustPercent,
				})
			end
		end
	end
end

-- ══════════════════════════════════════════════
-- PLAYER CLEANUP
-- Remove trust data when player leaves
-- ══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	persistTrust(player)
	trustData[player.UserId] = nil

	-- Clean up cooldowns
	for key, _ in pairs(npcCooldowns) do
		if string.find(key, tostring(player.UserId)) then
			npcCooldowns[key] = nil
		end
	end
end)

-- ══════════════════════════════════════════════
-- INITIALIZATION
-- ══════════════════════════════════════════════

local function initialize()
	print("=============================================================")
	print("[NPCSystem] MOLGANG NPC System initializing...")
	print("[NPCSystem] 5 walking NPCs + 6 quiz pillars")
	print("=============================================================")

	-- Wait for world to be built
	local zones = workspace:WaitForChild("Zones", 30)
	if not zones then
		warn("[NPCSystem] Zones folder not found. WorldBuilder may not have run yet. Proceeding anyway.")
	end

	-- Spawn all NPCs
	spawnAllNPCs()

	-- Setup interaction handlers
	setupProximityHandlers()

	-- Setup trust modification hooks
	setupTrustHooks()

	-- Start background loops
	task.spawn(scheduleUpdateLoop)
	task.spawn(trustDisplayLoop)

	-- Initial market price
	updateMarketPrices()

	print("=============================================================")
	print("[NPCSystem] System online. NPCs are alive in Moleculia.")
	print("[NPCSystem] Game time speed: 1 real minute = 1 game hour")
	print("[NPCSystem] Trust range: 0.0-1.0, default: " .. TRUST_DEFAULT)
	print("=============================================================")
end

-- Run initialization
initialize()
