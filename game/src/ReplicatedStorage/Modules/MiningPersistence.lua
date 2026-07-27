-- Sanitizes persisted mining records before they enter the live world state.
local MiningPersistence = {}

local function finiteNonNegative(value)
	return type(value) == "number" and value == value and value >= 0 and value < math.huge
end

function MiningPersistence.SanitizePlotState(saved)
	if type(saved) ~= "table" then return nil end
	local equipment = {}
	if type(saved.mineEquipment) == "table" then
		for _, equipId in ipairs(saved.mineEquipment) do
			if type(equipId) == "string" then
				table.insert(equipment, equipId)
			end
		end
	end
	local composition = {}
	if type(saved.composition) == "table" then
		for mineral, pct in pairs(saved.composition) do
			if type(mineral) == "string" and finiteNonNegative(pct) then
				composition[mineral] = math.min(pct, 100)
			end
		end
	end
	return {
		explored = saved.explored == true,
		composition = next(composition) and composition or nil,
		vanadiumPct = finiteNonNegative(saved.vanadiumPct) and saved.vanadiumPct or nil,
		rarity = type(saved.rarity) == "string" and saved.rarity or nil,
		mineEquipment = equipment,
		oreStockpile = finiteNonNegative(saved.oreStockpile) and saved.oreStockpile or 0,
		totalMined = finiteNonNegative(saved.totalMined) and saved.totalMined or 0,
		forSale = saved.forSale == true,
		askPrice = finiteNonNegative(saved.askPrice) and saved.askPrice or 0,
	}
end

return MiningPersistence
