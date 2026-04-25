--[[
	PlantCommissioning.lua (was QuantumRacing.lua)
	MOLGANG — Plant Commissioning & Startup Track

	Realistic game track: Follow real plant startup procedures.
	Complete checklists, verify equipment, run test batches.

	Commissioning types:
	1. Cold Commissioning — mechanical checks, no chemicals
	2. Hot Commissioning — introduce chemicals, first reaction
	3. Performance Test — achieve design capacity
	4. Handover — document everything, train operators
]]

local PlantCommissioning = {}

PlantCommissioning.Tracks = {
	{
		id = "cold_commissioning",
		name = "Cold Commissioning",
		difficulty = "easy",
		description = "Mechanical completion. Check all equipment, piping, instruments. No chemicals yet.",
		length = 500,
		timeLimit = 120,
		reward = 200,
		quantumDots = 20,  -- checklist items to complete
		obstacles = 5,     -- issues to resolve
		unlockCost = 0,
		checklist = {
			"Verify all vessels are properly anchored",
			"Check valve positions (all closed)",
			"Test instrument loops (4-20mA signals)",
			"Pressure test piping at 1.5x design",
			"Verify safety relief valve settings",
			"Check electrical connections and grounding",
			"Run pumps on water — check rotation direction",
			"Verify agitator operation in reactors",
		},
	},
	{
		id = "hot_commissioning",
		name = "Hot Commissioning",
		difficulty = "medium",
		description = "First chemical introduction. Careful pH control, temperature ramp-up, reagent dosing.",
		length = 800,
		timeLimit = 180,
		reward = 400,
		quantumDots = 35,
		obstacles = 12,
		unlockCost = 500,
		checklist = {
			"Fill leaching tank with water to operating level",
			"Introduce H2SO4 at 10% of design rate",
			"Monitor pH — target 1.5 to 2.0",
			"Gradually increase temperature to 60°C",
			"Add first batch of crushed slag (100kg)",
			"Monitor reaction rate — check for foam/gas",
			"Sample every 30 minutes for V extraction",
			"Verify cooling water flow on heat exchangers",
		},
	},
	{
		id = "performance_test",
		name = "72-Hour Performance Test",
		difficulty = "hard",
		description = "Run at full design capacity for 72 hours. Achieve >80% V2O5 recovery. Document everything.",
		length = 1200,
		timeLimit = 300,
		reward = 800,
		quantumDots = 50,
		obstacles = 25,
		unlockCost = 2000,
		checklist = {
			"Achieve 90% of design feed rate (1 ton/hr slag)",
			"Maintain V2O5 recovery above 80%",
			"Keep pH within ±0.2 of setpoint",
			"No unplanned shutdowns for 72 hours",
			"Energy consumption within 110% of design",
			"Wastewater pH between 6.5 and 8.5",
			"All emissions below permit limits",
			"Complete mass balance across plant",
		},
	},
	{
		id = "handover",
		name = "Plant Handover & SOPs",
		difficulty = "extreme",
		description = "Final handover. Complete all documentation, train operators, get regulatory sign-off.",
		length = 2000,
		timeLimit = 360,
		reward = 2000,
		quantumDots = 80,
		obstacles = 40,
		unlockCost = 5000,
		checklist = {
			"Write Standard Operating Procedures (SOPs)",
			"Complete P&ID markup with as-built changes",
			"Train 3 shift operators (written + practical exam)",
			"Submit environmental permit compliance report",
			"HAZOP review sign-off for all process sections",
			"Emergency response plan tested and approved",
			"Spare parts inventory verified (2 years stock)",
			"Insurance inspection completed and approved",
		},
	},
}

-- Real engineering milestones (replacing power-ups)
PlantCommissioning.PowerUps = {
	{id = "expediter", name = "Equipment Expediter", effect = "Skip one procurement delay", color = Color3.fromRGB(255, 255, 100)},
	{id = "consultant", name = "Expert Consultant", effect = "Auto-complete one checklist item", color = Color3.fromRGB(100, 200, 255)},
	{id = "overtime", name = "Overtime Crew", effect = "2x completion speed for 30s", color = Color3.fromRGB(255, 100, 255)},
	{id = "vendor", name = "Vendor Support", effect = "Resolve one equipment issue instantly", color = Color3.fromRGB(100, 255, 200)},
}

function PlantCommissioning.GetTrack(trackId)
	for _, track in ipairs(PlantCommissioning.Tracks) do
		if track.id == trackId then return track end
	end
	return nil
end

function PlantCommissioning.CalculateScore(track, timeSeconds, itemsCompleted, issuesHit)
	local timeBonus = math.max(0, track.timeLimit - timeSeconds) * 10
	local itemBonus = itemsCompleted * 20
	local issuePenalty = issuesHit * 50
	return math.max(0, timeBonus + itemBonus - issuePenalty)
end

function PlantCommissioning.GetReward(track, score)
	local baseReward = track.reward
	local maxScore = track.timeLimit * 10 + track.quantumDots * 20
	local ratio = math.clamp(score / maxScore, 0, 1)
	return math.floor(baseReward * (0.5 + ratio * 0.5))
end

return PlantCommissioning
