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

SlagPersistence.FiniteNonNegative = finiteNonNegative

function SlagPersistence.SanitizeInventory(saved)
	if type(saved) ~= "table" then return nil end
	local inventory = {}
	for _, size in ipairs(SIZES) do
		inventory[size] = finiteNonNegative(saved[size])
	end
	return inventory
end

function SlagPersistence.SanitizeMassBalance(saved)
	if type(saved) ~= "table" then return nil end
	local balance = {}
	for _, key in ipairs({
		"inputKg", "outputKg", "wasteKg", "lossKg", "recovery", "aggregateKg",
		"dissolvedKg", "targetProductKg", "byproductKg",
	}) do
		balance[key] = finiteNonNegative(saved[key])
	end
	balance.steps = {}
	for _, step in ipairs(type(saved.steps) == "table" and saved.steps or {}) do
		if type(step) == "table" then
			table.insert(balance.steps, {
				name = type(step.name) == "string" and step.name:sub(1, 80) or "Process step",
				inputKg = finiteNonNegative(step.inputKg),
				outputKg = finiteNonNegative(step.outputKg),
				wasteKg = finiteNonNegative(step.wasteKg),
				efficiency = finiteNonNegative(step.efficiency),
			})
		end
		if #balance.steps >= 16 then break end
	end
	return balance
end

return SlagPersistence
