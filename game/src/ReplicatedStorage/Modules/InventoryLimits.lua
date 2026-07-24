-- Shared inventory capacity rules. The server is authoritative; clients use
-- the same pure helpers only to present accurate storage information.
local InventoryLimits = {}

InventoryLimits.BASE_ATOM_CAPACITY = 500
InventoryLimits.OFFICE_SLOT_BONUS = 50

function InventoryLimits.GetAtomCapacity(facilities)
	local offices = facilities and math.max(0, math.floor(facilities.offices or 0)) or 0
	return InventoryLimits.BASE_ATOM_CAPACITY + offices * InventoryLimits.OFFICE_SLOT_BONUS
end

function InventoryLimits.CountAtoms(atoms)
	local total = 0
	for _, count in pairs(atoms or {}) do
		if type(count) == "number" and count > 0 then total = total + count end
	end
	return total
end

function InventoryLimits.GetFreeAtomSlots(atoms, facilities)
	return math.max(0, InventoryLimits.GetAtomCapacity(facilities) - InventoryLimits.CountAtoms(atoms))
end

function InventoryLimits.CanAddAtoms(atoms, facilities, amount)
	return type(amount) == "number" and amount >= 0 and amount == math.floor(amount)
		and amount <= InventoryLimits.GetFreeAtomSlots(atoms, facilities)
end

return InventoryLimits
