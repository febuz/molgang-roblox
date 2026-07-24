-- Pure server-side validation rules for commodity trades.
local TradeRules = {}

function TradeRules.Validate(action, itemName, quantity, offeredPrice, prices)
	if action ~= "buy" and action ~= "sell" then
		return false, "Invalid trade action"
	end
	local basePrice = prices and prices[itemName]
	if type(basePrice) ~= "number" then
		return false, "Unknown commodity"
	end

	local parsedQuantity = tonumber(quantity)
	if not parsedQuantity or parsedQuantity ~= parsedQuantity then
		return false, "Quantity must be a number"
	end
	parsedQuantity = math.floor(parsedQuantity)
	if parsedQuantity < 1 or parsedQuantity > 1000 then
		return false, "Quantity must be between 1 and 1000"
	end

	local parsedPrice = tonumber(offeredPrice)
	if not parsedPrice or parsedPrice ~= parsedPrice or parsedPrice == math.huge or parsedPrice == -math.huge then
		parsedPrice = basePrice
	end
	local currentPrice = math.clamp(parsedPrice, basePrice * 0.8, basePrice * 1.2)
	return true, parsedQuantity, currentPrice
end

return TradeRules
