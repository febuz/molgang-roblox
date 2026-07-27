-- Pure reservation helpers for the in-memory order book.
local MarketOrderRules = {}

function MarketOrderRules.AddReservation(reservedAtoms, reservedSlag, product, quantity)
	for atom, countPerUnit in pairs(product.requiredAtoms or {}) do
		reservedAtoms[atom] = (reservedAtoms[atom] or 0) + countPerUnit * quantity
	end
	for residue, countPerUnit in pairs(product.requiredSlag or {}) do
		reservedSlag[residue] = (reservedSlag[residue] or 0) + countPerUnit * quantity
	end
end

function MarketOrderRules.GetAvailable(stock, reserved, key)
	return (stock and stock[key] or 0) - (reserved[key] or 0)
end

return MarketOrderRules
