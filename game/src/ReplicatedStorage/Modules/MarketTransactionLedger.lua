-- Shared server-side counters for settled commodity transactions.
local Ledger = {}
local transactions = {}

local function bucket(commodity)
	if not transactions[commodity] then
		transactions[commodity] = {bought = 0, sold = 0}
	end
	return transactions[commodity]
end

function Ledger.Record(commodity, action, quantity)
	if type(commodity) ~= "string" or (action ~= "buy" and action ~= "sell")
		or type(quantity) ~= "number" or quantity ~= math.floor(quantity) or quantity < 1 then
		return false
	end
	local counts = bucket(commodity)
	local key = action == "buy" and "bought" or "sold"
	counts[key] = counts[key] + quantity
	return true
end

function Ledger.Get(commodity)
	local counts = transactions[commodity]
	if not counts then return {bought = 0, sold = 0} end
	return {bought = counts.bought, sold = counts.sold}
end

function Ledger.Reset()
	for commodity in pairs(transactions) do
		transactions[commodity] = {bought = 0, sold = 0}
	end
end

return Ledger
