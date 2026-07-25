--[[
	ProductionManager.server.lua
	MOLGANG Production System

	Handles facility production cycles:
	- Mines produce atoms (H, O, C, N, Fe, Cu, Au, V, W, etc.)
	- Factories convert atoms → molecules
	- Research Labs unlock new recipes
	- Offices increase storage
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Facilities = require(ReplicatedStorage.Modules.Facilities)
local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
local WorldEvents = require(ReplicatedStorage.Modules.WorldEvents)
local DailyStats = require(ReplicatedStorage.Modules.DailyStats)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local InventoryLimits = require(ReplicatedStorage.Modules.InventoryLimits)
local ProductionState = require(ReplicatedStorage.Modules.ProductionState)
local ProductionProfiles = require(ReplicatedStorage.Modules.ProductionProfiles)

-- ═══════════════════════════════════════════════
-- PRODUCTION CONFIGURATION
-- ═══════════════════════════════════════════════

local PRODUCTION_INTERVAL = 60  -- 60 seconds per production cycle
local FACTORY_CYCLE_SECONDS = Facilities.GetFacility("Factory").productionTime

-- ═══════════════════════════════════════════════
-- PRODUCTION LOGIC
-- ═══════════════════════════════════════════════

local function produceAtoms(facilities, playerData, outdoorPenalty, productionSpeedMultiplier, previousRemainder)
	if not facilities or ((facilities.mines or 0) == 0 and (facilities.starterBenches or 0) == 0) then return {} end

	local produced = {}
	local atomPool = ProductionProfiles.GetAtomPool(facilities)
	if #atomPool == 0 then return produced end

	-- Use the same capacity table as the facility purchase/build system.
	-- This prevents the production loop from silently drifting from the UI.
	local due = Facilities.CalculateOutdoorAtomRate(facilities, outdoorPenalty, productionSpeedMultiplier) + (previousRemainder or 0)
	local wholeDue = math.floor(due)
	local freeSlots = InventoryLimits.GetFreeAtomSlots(playerData.atoms, playerData.facilities)
	local atomCount = math.min(wholeDue, freeSlots)
	local remainder = due - wholeDue
	if atomCount < wholeDue then
		-- Storage overflow is discarded rather than banked into a later burst.
		remainder = 0
	end
	for _ = 1, atomCount do
		local atom = atomPool[math.random(#atomPool)]
		produced[atom] = (produced[atom] or 0) + 1
	end

	return produced, remainder, atomCount < wholeDue
end

local function produceMolecules(playerData, facilities)
	if not facilities or facilities.factories == 0 then return {} end

	local produced = {}
	local atoms = playerData.atoms or {}

	local production = Facilities.CalculateProduction(facilities)
	-- Each factory attempts its configured capacity; unavailable feedstock
	-- correctly leaves that slot idle instead of creating free product.
	for _ = 1, production.molecules do
		-- Pick a random buildable molecule
		local buildable = Chemistry.GetBuildableMolecules(atoms)
		if #buildable > 0 then
			local molName = buildable[math.random(#buildable)]
			local recipe = Chemistry.GetRecipe(molName)

			-- Check if we have enough atoms
			local canBuild = true
			for sym, count in pairs(recipe.atoms) do
				if (atoms[sym] or 0) < count then
					canBuild = false
					break
				end
			end

			if canBuild then
				-- Consume atoms
				for sym, count in pairs(recipe.atoms) do
					atoms[sym] = atoms[sym] - count
					if atoms[sym] <= 0 then
						atoms[sym] = nil
					end
				end

				-- Add molecule
				produced[molName] = (produced[molName] or 0) + 1
				playerData.molecules[molName] = (playerData.molecules[molName] or 0) + 1
			end
		end
	end

	return produced
end

local function runProductionCycle(player, playerData, facilities, factoryCycles)
	if not playerData or not facilities then return end
	playerData.atoms = playerData.atoms or {}
	playerData.molecules = playerData.molecules or {}
	playerData.production = type(playerData.production) == "table" and playerData.production or {}
	playerData.production.outdoorAtomRemainder = ProductionState.NormalizeRemainder(
		playerData.production.outdoorAtomRemainder
	)
	playerData.molCoins = playerData.molCoins or 0
	playerData.totalMolCoinsEarned = playerData.totalMolCoinsEarned or 0
	local activeEffects = WorldEvents.GetActiveEffects()
	local productionSpeedMultiplier = math.max(0, tonumber(activeEffects.productionSpeedMult) or 1)

	-- Produce atoms from mines
	local atomsProduced, nextRemainder, atomCapacityLimited = produceAtoms(
		facilities,
		playerData,
		player:GetAttribute("OutdoorPenalty"),
		productionSpeedMultiplier,
		playerData.production.outdoorAtomRemainder
	)
	playerData.production.outdoorAtomRemainder = ProductionState.NormalizeRemainder(nextRemainder)
	for atom, count in pairs(atomsProduced) do
		playerData.atoms[atom] = (playerData.atoms[atom] or 0) + count
	end
	-- Mine output is a real inventory acquisition, just like a manually
	-- collected atom. Keep lifetime and daily progress aligned with what the
	-- player actually received so quests, dashboard totals and achievements do
	-- not under-report industrial production.
	local producedAtomCount = 0
	for _, count in pairs(atomsProduced) do
		producedAtomCount = producedAtomCount + count
	end
	if producedAtomCount > 0 then
		playerData.totalAtomsCollected = (playerData.totalAtomsCollected or 0) + producedAtomCount
		DailyStats.Increment(playerData, "atomsCollected", producedAtomCount)
	end

	-- Produce molecules from factories
	local moleculesProduced = {}
	for _ = 1, factoryCycles do
		local cycleMolecules = produceMolecules(playerData, facilities)
		for molName, count in pairs(cycleMolecules) do
			moleculesProduced[molName] = (moleculesProduced[molName] or 0) + count
		end
	end
	for molName, count in pairs(moleculesProduced) do
		playerData.moleculesBuilt = playerData.moleculesBuilt or {}
		playerData.moleculesBuilt[molName] = true
		playerData.totalMoleculesBuilt = (playerData.totalMoleculesBuilt or 0) + count
		DailyStats.Increment(playerData, "moleculesBuilt", count)
	end

	-- A completed factory cycle with no molecule output is a real blocked
	-- state, not a successful zero-output cycle: the player needs feedstock or
	-- a compatible recipe. Keep this visible without inventing production.
	local factoryBlocked = factoryCycles > 0
		and (facilities.factories or 0) > 0
		and next(moleculesProduced) == nil

	-- Award MolCoins for production
	local productionBonus = 0
	for _, count in pairs(atomsProduced) do
		productionBonus = productionBonus + (count * 2)  -- 2 MolCoins per atom
	end
	for _, count in pairs(moleculesProduced) do
		productionBonus = productionBonus + (count * 10)  -- 10 MolCoins per molecule
	end
	productionBonus = Facilities.ApplyProductionBonus(
		productionBonus,
		activeEffects.productionBonusMult
	)

	if productionBonus > 0 then
		PlayerDataBridge.AddEarnedMolCoins(player.UserId, productionBonus)
	end

	-- Notify client
	if next(atomsProduced) or next(moleculesProduced) or productionBonus > 0
		or atomCapacityLimited or factoryBlocked then
		Remotes.FireClient("ProductionCycleComplete", player, {
			atomsProduced = atomsProduced,
			moleculesProduced = moleculesProduced,
			bonusMolCoins = productionBonus,
			outdoorPenalty = player:GetAttribute("OutdoorPenalty") or 1,
			productionBonusMultiplier = tonumber(activeEffects.productionBonusMult) or 1,
			atomCapacityLimited = atomCapacityLimited == true,
			factoryBlocked = factoryBlocked,
			totalAtoms = (function()
				local count = 0
				for _, c in pairs(playerData.atoms) do
					count = count + c
				end
				return count
			end)(),
			totalMolecules = (function()
				local count = 0
				for _, c in pairs(playerData.molecules) do
					count = count + c
				end
				return count
			end)(),
		})
	end
end

-- ═══════════════════════════════════════════════
-- GAME LOOP
-- ═══════════════════════════════════════════════

-- Wait for EconomyManager to set up its server-owned data table.
task.wait(1)

-- Production cycle: runs every 60 seconds
task.spawn(function()
	while true do
		task.wait(PRODUCTION_INTERVAL)

		for _, player in ipairs(Players:GetPlayers()) do
			-- Production is server-authoritative. Never ask a client for the
			-- canonical economy state: clients may be disconnected or spoofed.
			local playerData = PlayerDataBridge.GetPlayerData(player.UserId)
			if playerData then
				local facilities = {
					starterBenches = playerData.facilities and playerData.facilities.starterBenches or 0,
					mines = playerData.facilities and playerData.facilities.mines or 0,
					factories = playerData.facilities and playerData.facilities.factories or 0,
					researchLabs = playerData.facilities and playerData.facilities.researchLabs or 0,
					offices = playerData.facilities and playerData.facilities.offices or 0,
					}

					playerData.production = type(playerData.production) == "table" and playerData.production or {}
					playerData.production.factoryElapsedSeconds = ProductionState.NormalizeElapsed(
						playerData.production.factoryElapsedSeconds,
						FACTORY_CYCLE_SECONDS
					)

					local factoryCycles = 0
					if facilities.factories > 0 then
						local activeEffects = WorldEvents.GetActiveEffects()
						local productionSpeedMultiplier = math.max(0, tonumber(activeEffects.productionSpeedMult) or 1)
						factoryCycles, playerData.production.factoryElapsedSeconds = ProductionState.Advance(
							playerData.production.factoryElapsedSeconds,
							PRODUCTION_INTERVAL,
							productionSpeedMultiplier,
							FACTORY_CYCLE_SECONDS
						)
					else
						playerData.production.factoryElapsedSeconds = 0
					end

				-- Mines run every minute; factories only when their configured
				-- 120-second cycle becomes due.
				if facilities.starterBenches > 0 or facilities.mines > 0 or factoryCycles > 0 then
					runProductionCycle(player, playerData, facilities, factoryCycles)
				end
			end
		end
	end
end)

print("[ProductionManager] initialized — mine 60s / factory " .. FACTORY_CYCLE_SECONDS .. "s cycles active")
