-- Pure server-side validation rules for commodity trades.
local TradeRules = {}

-- A normal market transaction carries a 5% trade/tariff cost. World events
-- can multiply this (for example free-trade sets it to 0). Keep this pure so
-- every settlement path uses the exact same rounding and validation rules.
TradeRules.BASE_TRADE_TAX_RATE = 0.05

function TradeRules.CalculateTradeTax(grossAmount, multiplier)
	local gross = tonumber(grossAmount) or 0
	if gross ~= gross or gross == math.huge or gross == -math.huge or gross < 0 then
		return 0, 0
	end
	local eventMultiplier = tonumber(multiplier)
	if not eventMultiplier or eventMultiplier ~= eventMultiplier
		or eventMultiplier == math.huge or eventMultiplier == -math.huge then
		eventMultiplier = 1
	end
	eventMultiplier = math.max(0, eventMultiplier)
	local tax = math.floor(gross * TradeRules.BASE_TRADE_TAX_RATE * eventMultiplier + 0.5)
	return tax, math.max(0, gross - tax)
end

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
