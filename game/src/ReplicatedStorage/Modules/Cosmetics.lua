--[[
	Cosmetics.lua
	MOLGANG — Character Cosmetics & Unlockable Skins (#75)

	Players can unlock lab coats, hard hats, goggles, and badges
	by completing achievements or spending MolCoins.
]]

local Cosmetics = {}

Cosmetics.Items = {
	-- Lab Equipment
	{id = "lab_coat", name = "Lab Coat", category = "outfit", cost = 500,
		description = "Standard white lab coat. Essential for any chemist.",
		color = Color3.fromRGB(240, 240, 245), unlockCondition = "collect_20_atoms"},
	{id = "safety_goggles", name = "Safety Goggles", category = "accessory", cost = 200,
		description = "Polycarbonate safety goggles. OSHA approved!",
		color = Color3.fromRGB(200, 220, 255), unlockCondition = "free"},
	{id = "hard_hat", name = "Hard Hat", category = "hat", cost = 300,
		description = "Mining safety helmet with headlamp.",
		color = Color3.fromRGB(255, 200, 0), unlockCondition = "own_mine"},
	{id = "hazmat_suit", name = "Hazmat Suit", category = "outfit", cost = 2000,
		description = "Chemical-resistant full-body suit. For serious leaching.",
		color = Color3.fromRGB(200, 200, 80), unlockCondition = "complete_10_leaches"},

	-- Factory Boss
	{id = "boss_tie", name = "CEO Tie", category = "accessory", cost = 5000,
		description = "Gold-trimmed tie. Shows you mean business.",
		color = Color3.fromRGB(255, 215, 0), unlockCondition = "rent_factory"},
	{id = "factory_boots", name = "Steel-Toe Boots", category = "accessory", cost = 800,
		description = "Heavy-duty boots for the factory floor.",
		color = Color3.fromRGB(60, 50, 40), unlockCondition = "free"},

	-- Science Badges
	{id = "badge_chemist", name = "Chemist Badge", category = "badge", cost = 0,
		description = "Earned by crafting your first molecule.",
		color = Color3.fromRGB(0, 200, 120), unlockCondition = "build_molecule"},
	{id = "badge_miner", name = "Miner Badge", category = "badge", cost = 0,
		description = "Earned by extracting first ore.",
		color = Color3.fromRGB(180, 130, 60), unlockCondition = "extract_ore"},
	{id = "badge_entrepreneur", name = "Entrepreneur Badge", category = "badge", cost = 0,
		description = "Earned by renting a factory.",
		color = Color3.fromRGB(255, 215, 0), unlockCondition = "rent_factory"},
	{id = "badge_green", name = "Green Champion Badge", category = "badge", cost = 0,
		description = "Earned by achieving Green Champion carbon rating.",
		color = Color3.fromRGB(0, 200, 80), unlockCondition = "green_rating"},
}

function Cosmetics.GetItem(id)
	for _, item in ipairs(Cosmetics.Items) do
		if item.id == id then return item end
	end
	return nil
end

function Cosmetics.GetByCategory(category)
	local result = {}
	for _, item in ipairs(Cosmetics.Items) do
		if item.category == category then
			table.insert(result, item)
		end
	end
	return result
end

function Cosmetics.CanUnlock(item, playerData)
	if item.unlockCondition == "free" then return true end
	if item.cost > 0 and (playerData.molCoins or 0) >= item.cost then return true end
	-- Check specific conditions
	if item.unlockCondition == "collect_20_atoms" then
		local count = 0
		for _, c in pairs(playerData.atoms or {}) do count = count + c end
		return count >= 20
	end
	if item.unlockCondition == "build_molecule" then
		local count = 0
		for _, c in pairs(playerData.molecules or {}) do count = count + c end
		return count >= 1
	end
	return false
end

return Cosmetics
