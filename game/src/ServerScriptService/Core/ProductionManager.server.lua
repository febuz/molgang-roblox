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
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- ═══════════════════════════════════════════════
-- PRODUCTION CONFIGURATION
-- ═══════════════════════════════════════════════

local PRODUCTION_INTERVAL = 60  -- 60 seconds per production cycle
local BASE_ATOMS = {"H", "O", "C", "N", "Fe", "Cu", "Au", "V", "W", "Al"}

-- ═══════════════════════════════════════════════
-- PRODUCTION LOGIC
-- ═══════════════════════════════════════════════

local function produceAtoms(facilities)
	if not facilities or facilities.mines == 0 then return {} end

	local produced = {}

	-- Use the same capacity table as the facility purchase/build system.
	-- This prevents the production loop from silently drifting from the UI.
	local production = Facilities.CalculateProduction(facilities)
	for _ = 1, production.atoms do
		local atom = BASE_ATOMS[math.random(#BASE_ATOMS)]
		produced[atom] = (produced[atom] or 0) + 1
	end

	return produced
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
					if atoms[sym] <= 0 then atoms[sym] = nil end
				end

				-- Add molecule
				produced[molName] = (produced[molName] or 0) + 1
				playerData.molecules[molName] = (playerData.molecules[molName] or 0) + 1
			end
		end
	end

	return produced
end

local function runProductionCycle(player, playerData, facilities)
	if not playerData or not facilities then return end
	playerData.atoms = playerData.atoms or {}
	playerData.molecules = playerData.molecules or {}
	playerData.molCoins = playerData.molCoins or 0
	playerData.totalMolCoinsEarned = playerData.totalMolCoinsEarned or 0

	-- Produce atoms from mines
	local atomsProduced = produceAtoms(facilities)
	for atom, count in pairs(atomsProduced) do
		playerData.atoms[atom] = (playerData.atoms[atom] or 0) + count
	end

	-- Produce molecules from factories
	local moleculesProduced = produceMolecules(playerData, facilities)

	-- Award MolCoins for production
	local productionBonus = 0
	for atom, count in pairs(atomsProduced) do
		productionBonus = productionBonus + (count * 2)  -- 2 MolCoins per atom
	end
	for mol, count in pairs(moleculesProduced) do
		productionBonus = productionBonus + (count * 10)  -- 10 MolCoins per molecule
	end

	if productionBonus > 0 then
		PlayerDataBridge.AddEarnedMolCoins(player.UserId, productionBonus)
	end

	-- Notify client
	if next(atomsProduced) or next(moleculesProduced) or productionBonus > 0 then
		Remotes.FireClient("ProductionCycleComplete", player, {
			atomsProduced = atomsProduced,
			moleculesProduced = moleculesProduced,
			bonusMolCoins = productionBonus,
			totalAtoms = (function()
				local count = 0
				for _, c in pairs(playerData.atoms) do count = count + c end
				return count
			end)(),
			totalMolecules = (function()
				local count = 0
				for _, c in pairs(playerData.molecules) do count = count + c end
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
					mines = playerData.facilities and playerData.facilities.mines or 0,
					factories = playerData.facilities and playerData.facilities.factories or 0,
					researchLabs = playerData.facilities and playerData.facilities.researchLabs or 0,
					offices = playerData.facilities and playerData.facilities.offices or 0,
				}

				-- Only run production if player has facilities
				if facilities.mines > 0 or facilities.factories > 0 then
					runProductionCycle(player, playerData, facilities)
				end
			end
		end
	end
end)

print("[ProductionManager] initialized — 60 second production cycles active")
