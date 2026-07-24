-- Pure server-side validation rules for commodity trades.
local TradeRules = {}

function TradeRules.ValidateQuantity(quantity, maximum)
	local parsed = tonumber(quantity)
	if not parsed or parsed ~= parsed or parsed == math.huge or parsed == -math.huge then
		return false, "Quantity must be a finite number"
	end
	parsed = math.floor(parsed)
	if parsed < 1 or parsed > maximum then
		return false, "Quantity must be between 1 and " .. maximum
	end
	return true, parsed
end

function TradeRules.Validate(action, itemName, quantity, offeredPrice, prices)
	if action ~= "buy" and action ~= "sell" then
		return false, "Invalid trade action"
	end
	local basePrice = prices and prices[itemName]
	if type(basePrice) ~= "number" then
		return false, "Unknown commodity"
	end

	local quantityOk, parsedQuantityOrError = TradeRules.ValidateQuantity(quantity, 1000)
	if not quantityOk then return false, parsedQuantityOrError end
	local parsedQuantity = parsedQuantityOrError

	local parsedPrice = tonumber(offeredPrice)
	if not parsedPrice or parsedPrice ~= parsedPrice or parsedPrice == math.huge or parsedPrice == -math.huge then
		parsedPrice = basePrice
	end
	local currentPrice = math.clamp(parsedPrice, basePrice * 0.8, basePrice * 1.2)
	return true, parsedQuantity, currentPrice
end

return TradeRules
