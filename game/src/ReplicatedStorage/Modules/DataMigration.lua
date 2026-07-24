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
		if data[key] == nil then
			data[key] = DataMigration.DeepCopy(defaultValue)
		elseif type(data[key]) == "table" and type(defaultValue) == "table" then
			DataMigration.MergeDefaults(data[key], defaultValue)
		end
	end
	return data
end

return DataMigration
