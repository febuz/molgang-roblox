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
local CarbonScore = require(ReplicatedStorage.Modules.CarbonScore)
local WorldEvents = require(ReplicatedStorage.Modules.WorldEvents)
local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

local playerFactories = {}  -- {userId = factoryState}
local factoryWorldModels = {}  -- {userId = Folder in workspace}

-- Factory hall world origin (matches WorldBuilder position)
local FACTORY_ORIGIN = Vector3.new(-1750, 10, -150)
local FACTORY_FLOOR_Y = 10
local CELL_SIZE_STUDS = 10  -- each grid cell = 10 studs (1m scaled up for game)
local RENT_INTERVAL = 600  -- game month = 10 real minutes for OTAP

local function persistFactory(userId, factory)
	local playerData = PlayerDataBridge.GetPlayerData(userId)
	if not playerData then return end
	playerData.factory = {
		rented = factory.rented == true,
		hasRentedBefore = factory.hasRentedBefore == true,
		rentStartTime = factory.rentStartTime or 0,
		placements = {},
		equipmentInventory = {},
		totalSpent = factory.totalSpent or 0,
		monthsPaid = factory.monthsPaid or 0,
	}
	for _, placement in ipairs(factory.placements) do
		table.insert(playerData.factory.placements, {
			itemId = placement.itemId,
			gridX = placement.gridX,
			gridY = placement.gridY,
			rotation = placement.rotation or 0,
			placedTime = placement.placedTime or 0,
		})
	end
	for itemId, count in pairs(factory.equipmentInventory) do
		playerData.factory.equipmentInventory[itemId] = count
	end
end

local function rebuildFactoryGrid(factory)
	factory.grid = {}
	for _, placement in ipairs(factory.placements) do
		local item = FactoryEquipment.GetItem(placement.itemId)
		if item then
			FactoryEquipment.Place(factory.grid, placement.itemId, placement.gridX, placement.gridY, placement.rotation or 0)
		end
	end
end

-- ═══════════════════════════════════════════════
-- 3D VISUALIZATION: Create real Parts in factory hall
-- ═══════════════════════════════════════════════

local function getFactoryFolder(userId)
	if not factoryWorldModels[userId] then
		local folder = Instance.new("Folder")
		folder.Name = "Factory_" .. tostring(userId)
		folder.Parent = workspace
		factoryWorldModels[userId] = folder
	end
	return factoryWorldModels[userId]
end

-- Convert grid position to world position
local function gridToWorld(gridX, gridY, itemWidth, itemHeight)
	-- Grid origin is top-left of factory floor
	local worldX = FACTORY_ORIGIN.X - 200 + (gridX - 1 + itemWidth / 2) * CELL_SIZE_STUDS
	local worldZ = FACTORY_ORIGIN.Z - 125 + (gridY - 1 + itemHeight / 2) * CELL_SIZE_STUDS
	return Vector3.new(worldX, FACTORY_FLOOR_Y, worldZ)
end

-- Create a 3D representation of equipment at grid position
local function createEquipment3D(userId, placement)
	local folder = getFactoryFolder(userId)
	local item = FactoryEquipment.GetItem(placement.itemId)
	if not item then return end

	local w = item.gridSize[1]
	local h = item.gridSize[2]
	if placement.rotation and placement.rotation % 2 == 1 then w, h = h, w end

	local worldPos = gridToWorld(placement.gridX, placement.gridY, w, h)
	local partName = "Equip_" .. placement.itemId .. "_" .. placement.gridX .. "_" .. placement.gridY

	-- Main body
	local body = Instance.new("Part")
	body.Name = partName
	body.Size = Vector3.new(w * CELL_SIZE_STUDS - 2, item.tier * 4 + 6, h * CELL_SIZE_STUDS - 2)
	body.Position = worldPos + Vector3.new(0, body.Size.Y / 2 + 0.5, 0)
	body.Color = item.color
	body.Material = Enum.Material.SmoothPlastic
	body.Anchored = true
	body.CanCollide = true
	body.Parent = folder

	-- Category-specific visual details
	if item.category == "Chemical" or item.category == "Separation" then
		-- Cylindrical top (reactor vessel look)
		local topCyl = Instance.new("Part")
		topCyl.Shape = Enum.PartType.Cylinder
		topCyl.Size = Vector3.new(body.Size.Y * 0.6, math.min(w, h) * CELL_SIZE_STUDS * 0.7, math.min(w, h) * CELL_SIZE_STUDS * 0.7)
		topCyl.Position = body.Position + Vector3.new(0, body.Size.Y * 0.3, 0)
		topCyl.Orientation = Vector3.new(0, 0, 90)
		topCyl.Color = Color3.new(item.color.R * 0.8, item.color.G * 0.8, item.color.B * 0.8)
		topCyl.Material = Enum.Material.SmoothPlastic
		topCyl.Anchored = true
		topCyl.CanCollide = false
		topCyl.Parent = folder
	elseif item.category == "Crushing" then
		-- Hopper on top (funnel shape)
		local hopper = Instance.new("Part")
		hopper.Size = Vector3.new(w * CELL_SIZE_STUDS * 0.6, 4, h * CELL_SIZE_STUDS * 0.6)
		hopper.Position = body.Position + Vector3.new(0, body.Size.Y / 2 + 2, 0)
		hopper.Color = Color3.fromRGB(80, 80, 85)
		hopper.Material = Enum.Material.SmoothPlastic
		hopper.Anchored = true
		hopper.CanCollide = false
		hopper.Parent = folder
	end

	-- Neon accent strip (category color)
	local catColors = {
		Crushing = Color3.fromRGB(200, 140, 60),
		Separation = Color3.fromRGB(200, 60, 60),
		Chemical = Color3.fromRGB(200, 200, 60),
		Storage = Color3.fromRGB(100, 160, 200),
		Utilities = Color3.fromRGB(80, 180, 80),
		Lab = Color3.fromRGB(180, 140, 220),
	}
	local accentColor = catColors[item.category] or Color3.fromRGB(0, 200, 130)

	local accent = Instance.new("Part")
	accent.Size = Vector3.new(w * CELL_SIZE_STUDS - 4, 1, 1)
	accent.Position = body.Position + Vector3.new(0, -body.Size.Y / 2 + 1, h * CELL_SIZE_STUDS / 2 - 1)
	accent.Color = accentColor
	accent.Material = Enum.Material.Neon
	accent.Transparency = 0.3
	accent.Anchored = true
	accent.CanCollide = false
	accent.Parent = folder

	-- Point light for ambience
	local light = Instance.new("PointLight")
	light.Color = accentColor
	light.Brightness = 0.8
	light.Range = w * CELL_SIZE_STUDS
	light.Parent = body

	-- Billboard label
	local bill = Instance.new("BillboardGui")
	bill.Size = UDim2.fromOffset(120, 30)
	bill.StudsOffset = Vector3.new(0, body.Size.Y / 2 + 4, 0)
	bill.AlwaysOnTop = false
	bill.MaxDistance = 60
	bill.Parent = body

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundColor3 = Color3.fromRGB(10, 12, 18)
	label.BackgroundTransparency = 0.3
	label.Text = item.name
	label.TextColor3 = accentColor
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.Parent = bill
	local lCorner = Instance.new("UICorner")
	lCorner.CornerRadius = UDim.new(0, 4)
	lCorner.Parent = label

	-- Tag as interactable
	body:SetAttribute("Interactable", true)
	body:SetAttribute("InteractionType", "FactoryEquipment")
	body:SetAttribute("EquipmentId", placement.itemId)
	body:SetAttribute("GridX", placement.gridX)
	body:SetAttribute("GridY", placement.gridY)
end

-- Remove 3D equipment at a grid position
local function removeEquipment3D(userId, gridX, gridY, itemId)
	local folder = factoryWorldModels[userId]
	if not folder then return end

	local partName = "Equip_" .. itemId .. "_" .. gridX .. "_" .. gridY
	-- Remove main body and all related parts
	for _, child in folder:GetChildren() do
		if child.Name == partName then
			child:Destroy()
		end
	end
	-- Also remove accent/cylinder parts (they don't have the exact name but are parented)
	-- Clean approach: destroy all children near that position
	local item = FactoryEquipment.GetItem(itemId)
	if item then
		local w = item.gridSize[1]
		local h = item.gridSize[2]
		local worldPos = gridToWorld(gridX, gridY, w, h)
		for _, child in folder:GetChildren() do
			if child:IsA("BasePart") and (child.Position - worldPos).Magnitude < w * CELL_SIZE_STUDS then
				child:Destroy()
			end
		end
	end
end

local function getFactory(userId)
	if not playerFactories[userId] then
		local saved = PlayerDataBridge.GetPlayerData(userId)
		local savedFactory = saved and saved.factory
		playerFactories[userId] = {
			rented = savedFactory and savedFactory.rented == true or false,
			hasRentedBefore = savedFactory and savedFactory.hasRentedBefore == true or false,
			rentStartTime = savedFactory and savedFactory.rentStartTime or 0,
			grid = {},                -- {[x] = {[y] = itemId}}
			placements = savedFactory and savedFactory.placements or {},
			equipmentInventory = savedFactory and savedFactory.equipmentInventory or {},
			totalSpent = savedFactory and savedFactory.totalSpent or 0,
			monthsPaid = savedFactory and savedFactory.monthsPaid or 0,
		}
		rebuildFactoryGrid(playerFactories[userId])
		if playerFactories[userId].rented then
			for _, placement in ipairs(playerFactories[userId].placements) do
				createEquipment3D(userId, placement)
			end
		end
	end
	return playerFactories[userId]
end

local function sendFactoryUpdate(player, userId)
	local factory = getFactory(userId)
	local waterTreatmentUnits = 0
	for _, placement in ipairs(factory.placements) do
		if placement.itemId == "water_treatment" then
			waterTreatmentUnits = waterTreatmentUnits + 1
		end
	end

	-- Calculate stats
	local powerDraw, powerAvail, powerBalance = FactoryEquipment.CalculatePower(factory.placements)
	local carbonScore = CarbonScore.CalculateScore({
		factory_rent = 1,
		equipment_power = powerDraw,
		water_reuse = waterTreatmentUnits,
	})
	local carbonRating = select(1, CarbonScore.GetRating(carbonScore))
	local eventEffects = WorldEvents.GetActiveEffects()
	local carbonCreditReward = CarbonScore.CalculateCreditReward(
		carbonScore, eventEffects.carbonCreditMult, #factory.placements > 0
	)
	local operatingCostMultiplier = eventEffects.factoryOpCostMult or 1
	local operatingCost, rent, maintenance = FactoryEquipment.CalculateMonthlyCostWithMultiplier(
		factory.placements, operatingCostMultiplier
	)
	local carbonTaxBeforeExemption = FactoryEquipment.CalculateCarbonTax(
		powerDraw, eventEffects.carbonTaxPerKW, RENT_INTERVAL / 60
	)
	local carbonTax = FactoryEquipment.ApplyGreenTaxExemption(
		carbonTaxBeforeExemption, carbonRating, eventEffects.greenExemptFromTax
	)
	local totalCost = operatingCost + carbonTax
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
		carbonTax = carbonTax,
		carbonTaxExempt = carbonTaxBeforeExemption > 0 and carbonTax == 0,
		carbonScore = carbonScore,
		carbonRating = carbonRating,
		carbonCredits = (PlayerDataBridge.GetPlayerData(userId) or {}).carbonCredits or 0,
		carbonCreditReward = carbonCreditReward,
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

	-- Trial rental: first month is 500 MC, regular is baseRent (2000 MC)
	local isFirstRent = not factory.hasRentedBefore
	local rentCost = isFirstRent and 500 or FactoryEquipment.FloorConfig.baseRent
	local success = PlayerDataBridge.SpendMolCoins(userId, rentCost)
	if not success then
		local msg = isFirstRent
			and "Trial rental: 500 MC for your first month! (You have " .. (PlayerDataBridge.GetPlayerData(userId).molCoins or 0) .. " MC)"
			or "Factory rent is " .. rentCost .. " MolCoins/month. Not enough funds!"
		Remotes.FireClient("ServerAnnounce", player, {
			message = msg,
			rarity = "common",
		})
		return
	end

	factory.rented = true
	factory.hasRentedBefore = true
	factory.rentStartTime = tick()
	factory.monthsPaid = 1
	persistFactory(userId, factory)

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
	persistFactory(userId, factory)

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
	persistFactory(userId, factory)

	-- Create 3D model in factory hall
	local placementData = factory.placements[#factory.placements]
	createEquipment3D(userId, placementData)

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

	-- Remove 3D model from factory hall
	removeEquipment3D(userId, foundItem.gridX, foundItem.gridY, foundItem.itemId)

	-- Return to inventory
	factory.equipmentInventory[foundItem.itemId] = (factory.equipmentInventory[foundItem.itemId] or 0) + 1

	-- Remove from placements list
	table.remove(factory.placements, foundIdx)
	persistFactory(userId, factory)

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

task.spawn(function()
	while true do
		task.wait(RENT_INTERVAL)
		for _, player in ipairs(Players:GetPlayers()) do
			local userId = player.UserId
			local factory = playerFactories[userId]
			if factory and factory.rented then
				local eventEffects = WorldEvents.GetActiveEffects()
				local powerDraw = FactoryEquipment.CalculatePower(factory.placements)
				local operatingCost = FactoryEquipment.CalculateMonthlyCostWithMultiplier(
					factory.placements, eventEffects.factoryOpCostMult or 1
				)
				local waterTreatmentUnits = 0
				for _, placement in ipairs(factory.placements) do
					if placement.itemId == "water_treatment" then
						waterTreatmentUnits = waterTreatmentUnits + 1
					end
				end
				local carbonTaxBeforeExemption = FactoryEquipment.CalculateCarbonTax(
					powerDraw, eventEffects.carbonTaxPerKW, RENT_INTERVAL / 60
				)
				local carbonScore = CarbonScore.CalculateScore({
					factory_rent = 1,
					equipment_power = powerDraw,
					water_reuse = waterTreatmentUnits,
				})
				local carbonRating = select(1, CarbonScore.GetRating(carbonScore))
				local carbonTax = FactoryEquipment.ApplyGreenTaxExemption(
					carbonTaxBeforeExemption, carbonRating, eventEffects.greenExemptFromTax
				)
				local totalCost = operatingCost + carbonTax
				local success = PlayerDataBridge.SpendMolCoins(userId, totalCost)
				if success then
					local carbonCredits = CarbonScore.CalculateCreditReward(
						carbonScore, eventEffects.carbonCreditMult, #factory.placements > 0
					)
					local playerData = PlayerDataBridge.GetPlayerData(userId)
					if playerData and carbonCredits > 0 then
						playerData.carbonCredits = (playerData.carbonCredits or 0) + carbonCredits
					end
					factory.monthsPaid = factory.monthsPaid + 1
					persistFactory(userId, factory)
					Remotes.FireClient("ServerAnnounce", player, {
						message = "Monthly factory costs paid: " .. totalCost .. " MC (rent + maintenance + carbon tax). Carbon credits earned: " .. carbonCredits,
						rarity = "common",
					})
					sendFactoryUpdate(player, userId)
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
	local factory = playerFactories[player.UserId]
	if factory then
		persistFactory(player.UserId, factory)
		playerFactories[player.UserId] = nil
	end
	factoryWorldModels[player.UserId] = nil
end)

print("[MOLGANG] EntrepreneurSystem initialized — 1000m² factory rental, " .. #FactoryEquipment.Items .. " equipment items")
