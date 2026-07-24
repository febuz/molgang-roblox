--[[
	RarityTrait.lua — pure rarity-tier scoring, usable by any archetype that
	carries a Buyable{cost} + Buff{value} trait pair.

	Thresholds are derived from the real 6 live drinks in
	ServerScriptService/Core/BubbleTeaBar.server.lua (read directly, not
	guessed), score = cost * buffValue:
		classic     25 * 1.25 = 31.25
		matcha      30 * 1.20 = 36.00
		mango       35 * 1.30 = 45.50
		taro        40 * 1.50 = 60.00
		lychee      60 * 1.15 = 69.00
		brownSugar  50 * 1.40 = 70.00
	Band edges sit at the midpoints between consecutive sorted scores, so
	each of the 6 real drinks lands in a distinct tier except the top two
	(lychee/brownSugar), which legitimately tie for Legendary.
]]

local RarityTrait = {}

RarityTrait.TIER_ORDER = { "Common", "Uncommon", "Rare", "Epic", "Legendary" }

local BANDS = {
	{ ceiling = 33, tier = "Common" },
	{ ceiling = 41, tier = "Uncommon" },
	{ ceiling = 52, tier = "Rare" },
	{ ceiling = 65, tier = "Epic" },
	{ ceiling = math.huge, tier = "Legendary" },
}

-- Pure: score = cost * buffValue, banded into a tier. No object/state lookup.
function RarityTrait.ComputeTier(cost, buffValue)
	assert(type(cost) == "number" and cost >= 0, "RarityTrait.ComputeTier — cost must be a non-negative number")
	assert(type(buffValue) == "number" and buffValue >= 0, "RarityTrait.ComputeTier — buffValue must be a non-negative number")

	local score = cost * buffValue
	for _, band in ipairs(BANDS) do
		if score < band.ceiling then
			return band.tier
		end
	end
	return "Legendary"
end

-- Convenience overload for an ObjectRegistry archetype carrying Buyable+Buff.
function RarityTrait.ComputeTierForArchetype(registry, archetypeId)
	local buyable = registry:GetTrait(archetypeId, "Buyable")
	local buff = registry:GetTrait(archetypeId, "Buff")
	assert(buyable and buyable.cost, ("RarityTrait — '%s' has no Buyable{cost} trait"):format(archetypeId))
	assert(buff and buff.value, ("RarityTrait — '%s' has no Buff{value} trait"):format(archetypeId))
	return RarityTrait.ComputeTier(buyable.cost, buff.value)
end

return RarityTrait
