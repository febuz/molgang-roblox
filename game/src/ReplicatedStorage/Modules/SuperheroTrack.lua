--[[
	SafetyTrack.lua (was SuperheroTrack.lua)
	MOLGANG — Safety & Emergency Response Track

	Realistic game track: Players train as HSE (Health, Safety, Environment)
	officers and respond to real chemical plant incidents.

	Each role specializes in different hazard types.
	Missions involve using chemistry knowledge to contain incidents.
]]

local SafetyTrack = {}

-- HSE Roles (realistic plant positions)
SafetyTrack.Heroes = {
	{
		id = "process_engineer",
		name = "Process Engineer",
		element = "Fe",
		unlockAtoms = 30,
		abilities = {
			{name = "Emergency Shutdown", description = "Initiate ESD on runaway reactor", damage = 100, cooldown = 10},
			{name = "Pressure Relief", description = "Open safety valve to prevent BLEVE", shield = 50, cooldown = 15},
			{name = "Neutralization", description = "Add base to acid spill (or vice versa)", areaEffect = true, cooldown = 20},
		},
		color = Color3.fromRGB(0, 100, 200),
		description = "Controls process parameters. First responder for chemical runaways and pressure events.",
	},
	{
		id = "safety_officer",
		name = "HSE Officer",
		element = "O",
		unlockAtoms = 20,
		abilities = {
			{name = "Evacuation Order", description = "Clear personnel from hazard zone", shield = 100, cooldown = 12},
			{name = "SCBA Deploy", description = "Self-Contained Breathing Apparatus for toxic exposure", damage = 80, cooldown = 5},
			{name = "Containment Berm", description = "Deploy spill containment around leak", debuff = "slow", cooldown = 25},
		},
		color = Color3.fromRGB(255, 200, 0),
		description = "Manages safety protocols. Expert in evacuation, PPE, and regulatory compliance.",
	},
	{
		id = "environmental_tech",
		name = "Environmental Technician",
		element = "Ca",
		unlockAtoms = 15,
		abilities = {
			{name = "pH Adjustment", description = "Lime dosing to neutralize acidic wastewater", damage = 150, cooldown = 15},
			{name = "Absorbent Deploy", description = "Apply oil-sorb to chemical spill", immunity = true, cooldown = 30},
			{name = "Air Monitoring", description = "Deploy gas detectors in affected area", teamBuff = true, cooldown = 20},
		},
		color = Color3.fromRGB(0, 180, 80),
		description = "Handles environmental compliance. Specialist in wastewater treatment and emissions.",
	},
	{
		id = "maintenance_lead",
		name = "Maintenance Lead",
		element = "V",
		unlockAtoms = 10,
		abilities = {
			{name = "Valve Isolation", description = "Close block valves to isolate leaking section", damage = 120, cooldown = 8},
			{name = "Temporary Repair", description = "Clamp or patch leaking pipe/vessel", shield = 75, cooldown = 10},
			{name = "Hot Work Permit", description = "Authorize emergency welding with gas-free certificate", transform = true, cooldown = 15},
		},
		color = Color3.fromRGB(200, 100, 50),
		description = "Mechanical expert. Isolates equipment, performs emergency repairs under pressure.",
	},
}

-- Incident types (realistic chemical plant emergencies)
SafetyTrack.Villains = {
	{id = "acid_spill", name = "H2SO4 Acid Spill", element = "H2SO4",
		description = "Sulfuric acid tank leak. Corrosive liquid spreading. pH dropping fast.",
		health = 500, attack = 40, weakness = "neutralization"},
	{id = "toxic_release", name = "Chlorine Gas Release", element = "Cl2",
		description = "Chlorine cylinder valve failure. Toxic green cloud forming. Wind direction critical.",
		health = 300, attack = 25, weakness = "evacuation"},
	{id = "thermal_runaway", name = "Reactor Thermal Runaway", element = "Exotherm",
		description = "Exothermic reaction out of control. Temperature rising 5°C/min. BLEVE risk.",
		health = 800, attack = 60, weakness = "emergency_cooling"},
	{id = "wastewater_breach", name = "Wastewater Containment Breach", element = "pH",
		description = "Settling pond overflows after heavy rain. Heavy metals entering waterway.",
		health = 2000, attack = 100, weakness = "containment"},
}

-- Response missions (realistic scenarios)
SafetyTrack.Missions = {
	{id = "m1", name = "Acid Spill in Tank Farm", villain = "acid_spill",
		description = "A 20% H2SO4 storage tank developed a flange leak. Contain and neutralize before it reaches the storm drain.",
		reward = 500, difficulty = "easy"},
	{id = "m2", name = "Chlorine Release at Water Treatment", villain = "toxic_release",
		description = "Chlorine dosing system valve failure. Evacuate downwind, isolate supply, deploy scrubber.",
		reward = 1000, difficulty = "medium"},
	{id = "m3", name = "Reactor Runaway — Emergency Cooling", villain = "thermal_runaway",
		description = "Batch reactor exotherm exceeded setpoint. Activate emergency cooling, reduce feed rate, prepare for pressure relief.",
		reward = 2000, difficulty = "hard"},
	{id = "m4", name = "Environmental Crisis — Heavy Metal Discharge", villain = "wastewater_breach",
		description = "Settling pond #3 overtopped. V, Cr, and Mn detected in river. Regulator notified. Contain at all costs.",
		reward = 5000, difficulty = "extreme"},
}

function SafetyTrack.GetHero(heroId)
	for _, hero in ipairs(SafetyTrack.Heroes) do
		if hero.id == heroId then return hero end
	end
	return nil
end

function SafetyTrack.CanUnlockHero(hero, playerAtoms)
	local count = playerAtoms[hero.element] or 0
	return count >= hero.unlockAtoms
end

function SafetyTrack.GetMission(missionId)
	for _, mission in ipairs(SafetyTrack.Missions) do
		if mission.id == missionId then return mission end
	end
	return nil
end

return SafetyTrack
