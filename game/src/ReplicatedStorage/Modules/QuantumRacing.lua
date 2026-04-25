--[[
	QuantumRacing.lua
	MOLGANG — Quantum Racing Track (#81)

	Secondary game track: Race through quantum tunnels collecting
	quantum dots. Physics-based racing with element-themed power-ups.

	Race types:
	1. Sprint — Fastest through tunnel wins
	2. Collection — Most quantum dots collected
	3. Obstacle — Navigate through atomic lattices
]]

local QuantumRacing = {}

QuantumRacing.Tracks = {
	{
		id = "hydrogen_sprint",
		name = "Hydrogen Sprint",
		difficulty = "easy",
		description = "Simple straight tunnel through a hydrogen atom lattice.",
		length = 500,       -- studs
		timeLimit = 60,     -- seconds
		reward = 200,       -- MolCoins
		quantumDots = 20,
		obstacles = 5,
		unlockCost = 0,     -- free intro track
	},
	{
		id = "carbon_ring",
		name = "Carbon Ring Rush",
		difficulty = "medium",
		description = "Circular track through benzene ring structure. Watch for electron clouds!",
		length = 800,
		timeLimit = 90,
		reward = 400,
		quantumDots = 35,
		obstacles = 12,
		unlockCost = 500,
	},
	{
		id = "iron_gauntlet",
		name = "Iron Gauntlet",
		difficulty = "hard",
		description = "Navigate the dense electron shells of iron. Magnetic fields alter your path!",
		length = 1200,
		timeLimit = 120,
		reward = 800,
		quantumDots = 50,
		obstacles = 25,
		unlockCost = 2000,
	},
	{
		id = "vanadium_vortex",
		name = "Vanadium Vortex",
		difficulty = "extreme",
		description = "The ultimate quantum race through vanadium's 5 electron shells. Only the best survive.",
		length = 2000,
		timeLimit = 180,
		reward = 2000,
		quantumDots = 80,
		obstacles = 40,
		unlockCost = 5000,
	},
}

-- Power-ups collectible during race
QuantumRacing.PowerUps = {
	{id = "speed_boost", name = "Photon Boost", effect = "2x speed for 3s", color = Color3.fromRGB(255, 255, 100)},
	{id = "shield", name = "Electron Shield", effect = "Immune to obstacles for 5s", color = Color3.fromRGB(100, 200, 255)},
	{id = "magnet", name = "Quantum Magnet", effect = "Attract nearby dots for 4s", color = Color3.fromRGB(255, 100, 255)},
	{id = "phase", name = "Phase Shift", effect = "Pass through walls for 2s", color = Color3.fromRGB(100, 255, 200)},
}

function QuantumRacing.GetTrack(trackId)
	for _, track in ipairs(QuantumRacing.Tracks) do
		if track.id == trackId then return track end
	end
	return nil
end

function QuantumRacing.CalculateScore(track, timeSeconds, dotsCollected, obstaclesHit)
	local timeBonus = math.max(0, track.timeLimit - timeSeconds) * 10
	local dotBonus = dotsCollected * 20
	local obstaclePenalty = obstaclesHit * 50
	return math.max(0, timeBonus + dotBonus - obstaclePenalty)
end

function QuantumRacing.GetReward(track, score)
	local baseReward = track.reward
	-- Score multiplier: higher score = better reward
	local maxScore = track.timeLimit * 10 + track.quantumDots * 20
	local ratio = math.clamp(score / maxScore, 0, 1)
	return math.floor(baseReward * (0.5 + ratio * 0.5))
end

return QuantumRacing
