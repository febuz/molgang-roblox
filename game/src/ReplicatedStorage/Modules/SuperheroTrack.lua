--[[
	SuperheroTrack.lua
	MOLGANG — Superhero Adventure Track (#82)

	Tertiary game track: Players become element-themed superheroes
	and defend Moleculia from chemical villains.

	Each superhero has abilities based on their element's properties.
	Missions involve using chemistry knowledge to defeat villains.
]]

local SuperheroTrack = {}

-- Superhero identities (unlocked by collecting specific elements)
SuperheroTrack.Heroes = {
	{
		id = "hydrogen_man",
		name = "Hydrogen Man",
		element = "H",
		unlockAtoms = 50,
		abilities = {
			{name = "Fusion Blast", description = "Channel hydrogen fusion for massive energy", damage = 100, cooldown = 10},
			{name = "H2 Shield", description = "Create protective H2 bubble", shield = 50, cooldown = 15},
			{name = "Acid Rain", description = "Lower pH in target area", areaEffect = true, cooldown = 20},
		},
		color = Color3.fromRGB(255, 200, 200),
		description = "The lightest hero with the biggest punch. Hydrogen fusion powers your attacks!",
	},
	{
		id = "iron_guardian",
		name = "Iron Guardian",
		element = "Fe",
		unlockAtoms = 30,
		abilities = {
			{name = "Magnetic Shield", description = "Ferromagnetic barrier blocks all attacks", shield = 100, cooldown = 12},
			{name = "Iron Fist", description = "Heavy melee attack with iron strength", damage = 80, cooldown = 5},
			{name = "Rust Storm", description = "Oxidize enemies, slowing them 50%", debuff = "slow", cooldown = 25},
		},
		color = Color3.fromRGB(180, 60, 40),
		description = "Defender of Moleculia. Magnetic powers and iron resolve.",
	},
	{
		id = "gold_phoenix",
		name = "Gold Phoenix",
		element = "Au",
		unlockAtoms = 5,
		abilities = {
			{name = "Noble Strike", description = "Unreactive noble metal pierces all defenses", damage = 150, cooldown = 15},
			{name = "Golden Aura", description = "Resist all chemical attacks", immunity = true, cooldown = 30},
			{name = "Catalyst", description = "Boost nearby heroes' abilities by 50%", teamBuff = true, cooldown = 20},
		},
		color = Color3.fromRGB(255, 215, 0),
		description = "Rare and powerful. Gold's noble properties make you nearly invincible.",
	},
	{
		id = "vanadium_knight",
		name = "Vanadium Knight",
		element = "V",
		unlockAtoms = 10,
		abilities = {
			{name = "Pentoxide Beam", description = "Channel V2O5 for a devastating beam", damage = 120, cooldown = 8},
			{name = "Slag Armor", description = "BOF slag coating absorbs damage", shield = 75, cooldown = 10},
			{name = "Redox Shift", description = "Change oxidation state to adapt attacks", transform = true, cooldown = 15},
		},
		color = Color3.fromRGB(100, 200, 255),
		description = "MOLGANG's signature hero. Master of oxidation states and slag chemistry.",
	},
}

-- Villains (chemistry-themed antagonists)
SuperheroTrack.Villains = {
	{id = "acid_lord", name = "Acid Lord", element = "HF",
		description = "Wields hydrofluoric acid. Dissolves everything!",
		health = 500, attack = 40, weakness = "base"},
	{id = "toxic_cloud", name = "Toxic Cloud", element = "Cl2",
		description = "Chlorine gas menace. Area damage over time.",
		health = 300, attack = 25, weakness = "reduction"},
	{id = "heavy_metal", name = "Heavy Metal", element = "Pb",
		description = "Lead contamination villain. Slow but devastating.",
		health = 800, attack = 60, weakness = "chelation"},
	{id = "radioactive", name = "Radioactive Rex", element = "U",
		description = "Uranium-powered villain. Final boss material.",
		health = 2000, attack = 100, weakness = "containment"},
}

-- Story missions
SuperheroTrack.Missions = {
	{id = "m1", name = "The Chlorine Leak", villain = "toxic_cloud",
		description = "A chlorine gas leak threatens the Nexus Hub! Neutralize it before it spreads.",
		reward = 500, difficulty = "easy"},
	{id = "m2", name = "Acid Rain on the Factory", villain = "acid_lord",
		description = "Acid Lord attacks the Slakkenspoor factory! Use base chemistry to counter.",
		reward = 1000, difficulty = "medium"},
	{id = "m3", name = "Lead Contamination", villain = "heavy_metal",
		description = "Heavy Metal is contaminating the mining regions. Use chelation agents!",
		reward = 2000, difficulty = "hard"},
	{id = "m4", name = "Nuclear Meltdown", villain = "radioactive",
		description = "Radioactive Rex threatens all of Moleculia. Only the strongest heroes can stop him.",
		reward = 5000, difficulty = "extreme"},
}

function SuperheroTrack.GetHero(heroId)
	for _, hero in ipairs(SuperheroTrack.Heroes) do
		if hero.id == heroId then return hero end
	end
	return nil
end

function SuperheroTrack.CanUnlockHero(hero, playerAtoms)
	local count = playerAtoms[hero.element] or 0
	return count >= hero.unlockAtoms
end

function SuperheroTrack.GetMission(missionId)
	for _, mission in ipairs(SuperheroTrack.Missions) do
		if mission.id == missionId then return mission end
	end
	return nil
end

return SuperheroTrack
