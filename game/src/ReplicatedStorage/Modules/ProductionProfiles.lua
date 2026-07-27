-- Resource profiles for the industrial production layer.
-- Starter benches provide basic feedstock; mines provide geological metals.
local ProductionProfiles = {}

ProductionProfiles.StarterAtoms = {"H", "O", "C", "N"}
ProductionProfiles.MineAtoms = {"Fe", "Fe", "Fe", "Ca", "Al", "Cu", "V", "W"}

function ProductionProfiles.GetAtomPool(facilities)
	local pool = {}
	local benches = math.max(0, math.floor(tonumber(facilities and facilities.starterBenches) or 0))
	local mines = math.max(0, math.floor(tonumber(facilities and facilities.mines) or 0))
	for _ = 1, benches * 3 do
		for _, atom in ipairs(ProductionProfiles.StarterAtoms) do
			table.insert(pool, atom)
		end
	end
	for _ = 1, mines * 10 do
		for _, atom in ipairs(ProductionProfiles.MineAtoms) do
			table.insert(pool, atom)
		end
	end
	return pool
end

return ProductionProfiles
