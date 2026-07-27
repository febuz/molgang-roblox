-- Shared HGMS input contract. Both client labels and server validation use
-- these canonical values so a visual label can never silently diverge from
-- the authoritative sorting protocol.
local MiniGameRules = {}

MiniGameRules.Bins = {
	magnetic = "LEFT",
	valuable = "CENTER",
	hazard = "RIGHT",
}

function MiniGameRules.IsValidBin(bin)
	return bin == "LEFT" or bin == "CENTER" or bin == "RIGHT"
end

return MiniGameRules
