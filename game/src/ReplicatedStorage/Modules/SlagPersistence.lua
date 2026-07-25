-- Defensive normalization for persisted BOF slag inventory.
local SlagPersistence = {}

local SIZES = {"chunk", "crushed", "ground", "powder", "residue"}

local function finiteNonNegative(value)
	value = tonumber(value)
	if not value or value ~= value or value == math.huge or value == -math.huge then
		return 0
	end
	return math.max(0, math.floor(value * 1000 + 0.5) / 1000)
end

function SlagPersistence.SanitizeInventory(saved)
	if type(saved) ~= "table" then return nil end
	local inventory = {}
	for _, size in ipairs(SIZES) do
		inventory[size] = finiteNonNegative(saved[size])
	end
	return inventory
end

return SlagPersistence
