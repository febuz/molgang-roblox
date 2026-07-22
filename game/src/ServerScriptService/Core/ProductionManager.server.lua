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

-- ═══════════════════════════════════════════════
-- PRODUCTION CONFIGURATION
-- ═══════════════════════════════════════════════

local PRODUCTION_INTERVAL = 60  -- 60 seconds per production cycle
local BASE_ATOMS = {"H", "O", "C", "N", "Fe", "Cu", "Au", "V", "W", "Al"}

-- Store player facilities data (loaded from EconomyManager)
local playerFacilities = {}  -- {userId = {mines=N, factories=N, ...}}

-- ═══════════════════════════════════════════════
-- PRODUCTION LOGIC
-- ═══════════════════════════════════════════════

local function produceAtoms(player, facilities)
	if not facilities or facilities.mines == 0 then return {} end

	local produced = {}
	local mineCount = facilities.mines or 0

	-- Each mine produces 5 random atoms per cycle
	for i = 1, mineCount * 5 do
		local atom = BASE_ATOMS[math.random(#BASE_ATOMS)]
		produced[atom] = (produced[atom] or 0) + 1
	end

	return produced
end

local function produceMolecules(player, playerData, facilities)
	if not facilities or facilities.factories == 0 then return {} end

	local produced = {}
	local factoryCount = facilities.factories or 0
	local atoms = playerData.atoms or {}

	-- Each factory tries to produce 2 random molecules per cycle
	for i = 1, factoryCount * 2 do
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

	-- Produce atoms from mines
	local atomsProduced = produceAtoms(player, facilities)
	for atom, count in pairs(atomsProduced) do
		playerData.atoms[atom] = (playerData.atoms[atom] or 0) + count
	end

	-- Produce molecules from factories
	local moleculesProduced = produceMolecules(player, playerData, facilities)

	-- Award MolCoins for production
	local productionBonus = 0
	for atom, count in pairs(atomsProduced) do
		productionBonus = productionBonus + (count * 2)  -- 2 MolCoins per atom
	end
	for mol, count in pairs(moleculesProduced) do
		productionBonus = productionBonus + (count * 10)  -- 10 MolCoins per molecule
	end

	if productionBonus > 0 then
		playerData.molCoins = playerData.molCoins + productionBonus
		playerData.totalMolCoinsEarned = playerData.totalMolCoinsEarned + productionBonus
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

-- Wait for EconomyManager to set up, then access playerData
task.wait(1)

local EconomyModule = nil
for _, script in ipairs(game:GetService("ServerScriptService").Core:GetChildren()) do
	if script.Name == "EconomyManager.server" then
		-- We'll use remotes to query player data instead
		break
	end
end

-- Production cycle: runs every 60 seconds
task.spawn(function()
	while true do
		task.wait(PRODUCTION_INTERVAL)

		for _, player in ipairs(Players:GetPlayers()) do
			-- Get current player data via RemoteFunction
			local playerData = Remotes.GetPlayerData:InvokeClient(player)
			if playerData then
				-- Get facilities count from player data
				local facilities = {
					mines = playerData.facilities and playerData.facilities.mines or 0,
					factories = playerData.facilities and playerData.facilities.factories or 0,
					researchLabs = playerData.facilities and playerData.facilities.researchLabs or 0,
					offices = playerData.facilities and playerData.facilities.offices or 0,
				}

				-- Only run production if player has facilities
				if facilities.mines > 0 or facilities.factories > 0 then
					-- Note: Server-side update will happen in EconomyManager
					-- This is just notification to client
					Remotes.FireClient("ProductionReady", player, {
						facilities = facilities,
					})
				end
			end
		end
	end
end)

print("[ProductionManager] initialized — 60 second production cycles active")
