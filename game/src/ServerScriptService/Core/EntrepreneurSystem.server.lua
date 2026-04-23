--[[
	EntrepreneurSystem.server.lua
	MOLGANG — Entrepreneur Factory Builder

	Players can rent a 1000m² indoor factory and place equipment:
	- Rent costs 2000 MC/game month (weather-protected!)
	- Buy equipment from catalog (jaw crusher, ball mill, reactors, etc.)
	- Place on 40×25 grid (each cell = 1m²)
	- Adjacency bonuses for smart layouts
	- Power management (don't exceed capacity!)
	- Monthly costs (rent + maintenance)
	- Indoor = protected from weather hazards
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local FactoryEquipment = require(ReplicatedStorage.Modules.FactoryEquipment)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

local playerFactories = {}  -- {userId = factoryState}

local function getFactory(userId)
	if not playerFactories[userId] then
		playerFactories[userId] = {
			rented = false,
			rentStartTime = 0,
			grid = {},                -- {[x] = {[y] = itemId}}
			placements = {},          -- {{itemId, gridX, gridY, rotation, placedTime}}
			equipmentInventory = {},  -- {[itemId] = count} — bought but not yet placed
			totalSpent = 0,
			monthsPaid = 0,
		}
	end
	return playerFactories[userId]
end

local function sendFactoryUpdate(player, userId)
	local factory = getFactory(userId)

	-- Calculate stats
	local powerDraw, powerAvail, powerBalance = FactoryEquipment.CalculatePower(factory.placements)
	local totalCost, rent, maintenance = FactoryEquipment.CalculateMonthlyCost(factory.placements)
	local bonuses = FactoryEquipment.CalculateAdjacencyBonuses(factory.placements)

	-- Build placement list for client
	local placementList = {}
	for _, p in ipairs(factory.placements) do
		local item = FactoryEquipment.GetItem(p.itemId)
		table.insert(placementList, {
			itemId = p.itemId,
			name = item and item.name or p.itemId,
			gridX = p.gridX,
			gridY = p.gridY,
			rotation = p.rotation or 0,
			gridSize = item and item.gridSize or {1, 1},
			color = item and {item.color.R, item.color.G, item.color.B} or {0.5, 0.5, 0.5},
			category = item and item.category or "Unknown",
		})
	end

	Remotes.FireClient("FactoryUpdate", player, {
		rented = factory.rented,
		placements = placementList,
		equipmentInventory = factory.equipmentInventory,
		powerDraw = powerDraw,
		powerAvailable = powerAvail,
		powerBalance = powerBalance,
		monthlyCost = totalCost,
		rent = rent,
		maintenance = maintenance,
		bonuses = bonuses,
		placementCount = #factory.placements,
		maxPlacements = FactoryEquipment.FloorConfig.maxEquipment,
		floorWidth = FactoryEquipment.FloorConfig.width,
		floorHeight = FactoryEquipment.FloorConfig.height,
	})
end

-- ═══════════════════════════════════════════════
-- RENT FACTORY
-- ═══════════════════════════════════════════════

Remotes.RequestRentFactory.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local factory = getFactory(userId)

	if factory.rented then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "You already have a factory rented!",
			rarity = "common",
		})
		sendFactoryUpdate(player, userId)
		return
	end

	local rentCost = FactoryEquipment.FloorConfig.baseRent
	local success = PlayerDataBridge.SpendMolCoins(userId, rentCost)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Factory rent is " .. rentCost .. " MolCoins/month. Not enough funds!",
			rarity = "common",
		})
		return
	end

	factory.rented = true
	factory.rentStartTime = tick()
	factory.monthsPaid = 1

	player:SetAttribute("IsIndoors", true)
	player:SetAttribute("HasFactory", true)

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Factory rented! 1000m² indoor space. Protected from weather. Place equipment with the Factory Builder (G key).",
		rarity = "epic",
	})

	Remotes.FireAllClients("ServerAnnounce", {
		message = player.Name .. " rented a factory! Entrepreneur mode activated.",
		rarity = "rare",
	})

	sendFactoryUpdate(player, userId)
	print("[Entrepreneur]", player.Name, "rented factory")
end)

-- ═══════════════════════════════════════════════
-- BUY EQUIPMENT (adds to inventory)
-- ═══════════════════════════════════════════════

Remotes.RequestBuyEquipment.OnServerEvent:Connect(function(player, itemId)
	local userId = player.UserId
	local factory = getFactory(userId)

	if not factory.rented then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Rent a factory first before buying equipment!",
			rarity = "common",
		})
		return
	end

	if type(itemId) ~= "string" then return end
	local item = FactoryEquipment.GetItem(itemId)
	if not item then return end

	local success = PlayerDataBridge.SpendMolCoins(userId, item.cost)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = item.name .. " costs " .. item.cost .. " MolCoins.",
			rarity = "common",
		})
		return
	end

	factory.equipmentInventory[itemId] = (factory.equipmentInventory[itemId] or 0) + 1
	factory.totalSpent = factory.totalSpent + item.cost

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Purchased " .. item.name .. " (" .. item.cost .. " MC). Open Factory Builder to place it.",
		rarity = "uncommon",
	})

	sendFactoryUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- PLACE EQUIPMENT ON GRID
-- ═══════════════════════════════════════════════

Remotes.RequestPlaceEquipment.OnServerEvent:Connect(function(player, itemId, gridX, gridY, rotation)
	local userId = player.UserId
	local factory = getFactory(userId)

	if not factory.rented then return end
	if type(itemId) ~= "string" or type(gridX) ~= "number" or type(gridY) ~= "number" then return end

	-- Check inventory
	if (factory.equipmentInventory[itemId] or 0) <= 0 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "No " .. itemId .. " in inventory. Buy one first!",
			rarity = "common",
		})
		return
	end

	-- Check placement limit
	if #factory.placements >= FactoryEquipment.FloorConfig.maxEquipment then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Factory full! Max " .. FactoryEquipment.FloorConfig.maxEquipment .. " equipment items.",
			rarity = "common",
		})
		return
	end

	-- Validate placement
	local canPlace, reason = FactoryEquipment.CanPlace(factory.grid, itemId, gridX, gridY, rotation)
	if not canPlace then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Can't place there: " .. reason,
			rarity = "common",
		})
		return
	end

	-- Check power
	local item = FactoryEquipment.GetItem(itemId)
	local testPlacements = {}
	for _, p in ipairs(factory.placements) do table.insert(testPlacements, p) end
	table.insert(testPlacements, {itemId = itemId})
	local draw, avail, balance = FactoryEquipment.CalculatePower(testPlacements)
	if balance < 0 and item.powerKW > 0 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Not enough power! Need " .. item.powerKW .. "kW. Balance: " .. balance .. "kW. Buy a generator!",
			rarity = "common",
		})
		return
	end

	-- Place on grid
	FactoryEquipment.Place(factory.grid, itemId, gridX, gridY, rotation)

	-- Consume from inventory
	factory.equipmentInventory[itemId] = factory.equipmentInventory[itemId] - 1

	-- Record placement
	table.insert(factory.placements, {
		itemId = itemId,
		gridX = gridX,
		gridY = gridY,
		rotation = rotation or 0,
		placedTime = tick(),
	})

	Remotes.FireClient("EquipmentPlaced", player, {
		itemId = itemId,
		name = item.name,
		gridX = gridX,
		gridY = gridY,
	})

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Placed " .. item.name .. " at (" .. gridX .. "," .. gridY .. ")",
		rarity = "uncommon",
	})

	sendFactoryUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- REMOVE EQUIPMENT FROM GRID
-- ═══════════════════════════════════════════════

Remotes.RequestRemoveEquipment.OnServerEvent:Connect(function(player, gridX, gridY)
	local userId = player.UserId
	local factory = getFactory(userId)

	if not factory.rented then return end
	if type(gridX) ~= "number" or type(gridY) ~= "number" then return end

	-- Find which placement is at this position
	local foundIdx = nil
	local foundItem = nil
	for i, p in ipairs(factory.placements) do
		local item = FactoryEquipment.GetItem(p.itemId)
		if item then
			local w = item.gridSize[1]
			local h = item.gridSize[2]
			if p.rotation and p.rotation % 2 == 1 then w, h = h, w end
			if gridX >= p.gridX and gridX < p.gridX + w
				and gridY >= p.gridY and gridY < p.gridY + h then
				foundIdx = i
				foundItem = p
				break
			end
		end
	end

	if not foundIdx or not foundItem then return end

	-- Remove from grid
	local item = FactoryEquipment.GetItem(foundItem.itemId)
	local w = item.gridSize[1]
	local h = item.gridSize[2]
	if foundItem.rotation and foundItem.rotation % 2 == 1 then w, h = h, w end

	for x = foundItem.gridX, foundItem.gridX + w - 1 do
		if factory.grid[x] then
			for y = foundItem.gridY, foundItem.gridY + h - 1 do
				factory.grid[x][y] = nil
			end
		end
	end

	-- Return to inventory
	factory.equipmentInventory[foundItem.itemId] = (factory.equipmentInventory[foundItem.itemId] or 0) + 1

	-- Remove from placements list
	table.remove(factory.placements, foundIdx)

	Remotes.FireClient("EquipmentRemoved", player, {
		gridX = gridX,
		gridY = gridY,
		itemId = foundItem.itemId,
	})

	sendFactoryUpdate(player, userId)
end)

-- ═══════════════════════════════════════════════
-- FACTORY INFO REQUEST
-- ═══════════════════════════════════════════════

Remotes.RequestFactoryInfo.OnServerEvent:Connect(function(player)
	sendFactoryUpdate(player, player.UserId)
end)

-- ═══════════════════════════════════════════════
-- MONTHLY RENT COLLECTION
-- ═══════════════════════════════════════════════

local RENT_INTERVAL = 600  -- game month = 10 real minutes for teaser

task.spawn(function()
	while true do
		task.wait(RENT_INTERVAL)
		for _, player in ipairs(Players:GetPlayers()) do
			local userId = player.UserId
			local factory = playerFactories[userId]
			if factory and factory.rented then
				local totalCost = FactoryEquipment.CalculateMonthlyCost(factory.placements)
				local success = PlayerDataBridge.SpendMolCoins(userId, totalCost)
				if success then
					factory.monthsPaid = factory.monthsPaid + 1
					Remotes.FireClient("ServerAnnounce", player, {
						message = "Monthly factory costs paid: " .. totalCost .. " MC (rent + maintenance)",
						rarity = "common",
					})
				else
					-- Can't pay rent — warning
					Remotes.FireClient("ServerAnnounce", player, {
						message = "WARNING: Can't pay factory costs (" .. totalCost .. " MC)! Equipment may be seized next month.",
						rarity = "epic",
					})
				end
			end
		end
	end
end)

-- ═══════════════════════════════════════════════
-- CLEANUP
-- ═══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	-- Keep factory state for session (would persist via DataStore in production)
end)

print("[MOLGANG] EntrepreneurSystem initialized — 1000m² factory rental, " .. #FactoryEquipment.Items .. " equipment items")
