-- Shared, deterministic wording for production-blocked feedback.
-- The server decides whether a block exists; both server and client use this
-- module so the player sees the same reason that the authoritative cycle sent.
local ProductionFeedback = {}

function ProductionFeedback.GetBlockedReason(atomCapacityLimited, factoryBlocked)
	local reasons = {}
	if atomCapacityLimited == true then
		table.insert(reasons, "atom storage is full")
	end
	if factoryBlocked == true then
		table.insert(reasons, "factory has no compatible feedstock/recipe")
	end
	if #reasons == 0 then return nil end
	return table.concat(reasons, "; ") .. "."
end

return ProductionFeedback
