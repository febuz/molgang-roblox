--[[
	ObjectRegistry.lua — data-driven archetype/trait object system.

	Composition model borrowed from OpenRA's Actor/Trait rules: an object
	("archetype") is a data table (Info) plus a set of named Trait config
	blocks. Archetypes can reuse a base archetype's traits via `inherits`
	(OpenRA's `Inherits: ^Base`), and multiple trait blocks of the same kind
	can coexist on one archetype via an `@SUFFIX` on the key (OpenRA's
	`WithInfantryBody@RUN`), e.g. `Buff@SPEED` and `Buff@RANGE`.

	Iteration model borrowed from the Build engine's SPRITE `statnum`: rather
	than scanning every archetype to find "all Drinks", each archetype is
	filed into a bucket keyed by its `category` at define-time, so category
	queries only touch the objects that actually belong to that category.

	This module is intentionally generic (no Roblox/game-specific fields) —
	category names and trait names are just strings supplied by callers.
]]

local ObjectRegistry = {}
ObjectRegistry.__index = ObjectRegistry

function ObjectRegistry.new()
	return setmetatable({
		_raw = {},        -- id -> def as authored, { inherits, category, traits }
		_resolved = {},    -- id -> flattened trait table (Inherits followed, cached)
		_buckets = {},     -- category -> { id, id, ... } in definition order
	}, ObjectRegistry)
end

local function resolveTraits(self, id, seen)
	seen[id] = seen[id] or 0
	seen[id] += 1
	if seen[id] > 1 then
		error(("ObjectRegistry: circular 'inherits' chain at '%s'"):format(id), 0)
	end

	local def = self._raw[id]
	if not def then
		error(("ObjectRegistry: unknown archetype '%s'"):format(id), 0)
	end

	local traits = {}
	if def.inherits then
		local base = self._resolved[def.inherits] or resolveTraits(self, def.inherits, seen)
		for traitKey, cfg in pairs(base) do
			traits[traitKey] = cfg
		end
	end
	for traitKey, cfg in pairs(def.traits or {}) do
		traits[traitKey] = cfg
	end
	return traits
end

-- Define an archetype. `def` = {
--   inherits = "BaseId"?,       -- optional base archetype to compose onto
--   category = "Drink",         -- bucket key for fast EachInCategory() scans
--   traits = { TraitName = {...}, ["TraitName@SUFFIX"] = {...}, ... },
-- }
-- Base archetypes must be defined before anything that inherits them.
function ObjectRegistry:Define(id, def)
	assert(type(id) == "string" and id ~= "", "ObjectRegistry:Define — id must be a non-empty string")
	assert(not self._raw[id], ("ObjectRegistry:Define — '%s' is already defined"):format(id))
	assert(type(def) == "table", "ObjectRegistry:Define — def must be a table")

	self._raw[id] = def
	self._resolved[id] = resolveTraits(self, id, {})

	local category = def.category or "Uncategorized"
	self._buckets[category] = self._buckets[category] or {}
	table.insert(self._buckets[category], id)

	return self._resolved[id]
end

-- Full flattened trait table for an archetype (Inherits already applied).
function ObjectRegistry:GetTraits(id)
	local traits = self._resolved[id]
	if not traits then
		error(("ObjectRegistry:GetTraits — unknown archetype '%s'"):format(id), 0)
	end
	return traits
end

-- One named trait config block, or nil if the archetype doesn't have it.
function ObjectRegistry:GetTrait(id, traitName)
	return self:GetTraits(id)[traitName]
end

function ObjectRegistry:HasTrait(id, traitName)
	return self:GetTrait(id, traitName) ~= nil
end

-- All trait config blocks whose base name (before `@SUFFIX`) matches
-- traitName — mirrors OpenRA's TraitsImplementing<T>().
function ObjectRegistry:GetTraitsImplementing(id, traitName)
	local out = {}
	for key, cfg in pairs(self:GetTraits(id)) do
		if key == traitName or key:match("^([^@]+)") == traitName then
			table.insert(out, cfg)
		end
	end
	return out
end

-- Iterator over archetype ids in one category, in definition order — the
-- statnum-bucket fast path: O(bucket size), not O(all archetypes).
function ObjectRegistry:EachInCategory(category)
	local ids = self._buckets[category] or {}
	local i = 0
	return function()
		i += 1
		local id = ids[i]
		if id then
			return id, self._resolved[id]
		end
		return nil
	end
end

function ObjectRegistry:CategoryIds(category)
	local ids = self._buckets[category] or {}
	local copy = table.create(#ids)
	table.move(ids, 1, #ids, 1, copy)
	return copy
end

return ObjectRegistry
