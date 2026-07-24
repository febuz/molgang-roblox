-- DataStoreProvider.lua
-- Studio/OTAP-safe persistence boundary.
-- Published servers use Roblox DataStoreService; local Studio sessions use a
-- process-local adapter so gameplay and tests do not fail before publishing.

local DataStoreService = game:GetService("DataStoreService")
local RunService = game:GetService("RunService")

local Provider = {}
local memoryStores = {}

local function memoryStore(name)
	if memoryStores[name] then return memoryStores[name] end
	local values = {}
	local store = {}
	function store:GetAsync(key)
		return values[tostring(key)]
	end
	function store:SetAsync(key, value)
		values[tostring(key)] = value
		return value
	end
	function store:RemoveAsync(key)
		values[tostring(key)] = nil
	end
	function store:IncrementAsync(key, delta)
		local nextValue = (tonumber(values[tostring(key)]) or 0) + (delta or 1)
		values[tostring(key)] = nextValue
		return nextValue
	end
	function store:UpdateAsync(key, transform)
		local normalized = tostring(key)
		local nextValue = transform(values[normalized])
		values[normalized] = nextValue
		return nextValue
	end
	function store:GetSortedAsync(descending, pageSize)
		local entries = {}
		for key, value in pairs(values) do
			if type(value) == "number" then
				table.insert(entries, {key = key, value = value})
			end
		end
		table.sort(entries, function(a, b)
			return descending and a.value > b.value or a.value < b.value
		end)
		local page = {}
		for index = 1, math.min(pageSize or #entries, #entries) do
			table.insert(page, entries[index])
		end
		return {GetCurrentPage = function() return page end}
	end
	memoryStores[name] = store
	return store
end

function Provider.GetDataStore(name)
	if RunService:IsStudio() then return memoryStore(name) end
	return DataStoreService:GetDataStore(name)
end

function Provider.GetOrderedDataStore(name)
	if RunService:IsStudio() then return memoryStore(name) end
	return DataStoreService:GetOrderedDataStore(name)
end

return Provider
