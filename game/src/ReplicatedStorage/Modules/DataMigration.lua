-- Recursive, non-destructive schema migration for persistent player data.
local DataMigration = {}

function DataMigration.DeepCopy(value)
	if type(value) ~= "table" then return value end
	local copy = {}
	for key, child in pairs(value) do
		copy[key] = DataMigration.DeepCopy(child)
	end
	return copy
end

function DataMigration.MergeDefaults(data, template)
	if type(data) ~= "table" or type(template) ~= "table" then return data end
	for key, defaultValue in pairs(template) do
		if data[key] == nil or type(data[key]) ~= type(defaultValue) then
			-- A schema field with the wrong type is not safely usable by the
			-- gameplay code (for example pairs("corrupt") crashes). Reset it
			-- to the versioned default instead of carrying corruption forward.
			data[key] = DataMigration.DeepCopy(defaultValue)
		elseif type(data[key]) == "table" and type(defaultValue) == "table" then
			DataMigration.MergeDefaults(data[key], defaultValue)
		end
	end
	return data
end

return DataMigration
