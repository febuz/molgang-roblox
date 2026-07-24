-- ServerScriptService/Core/Leaderboards.server.lua
-- Leaderboard system for MOLGANG using OrderedDataStore
-- Categories: MolCoins, Elements, Molecules, ChainTokens
-- Top 100 per category, refreshes every 60 seconds

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreProvider = require(ReplicatedStorage.Modules.DataStoreProvider)
local Players = game:GetService("Players")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- ORDERED DATASTORES
-- ══════════════════════════════════════════════

local boards = {
	MolCoins     = DataStoreProvider.GetOrderedDataStore("LB_MolCoins_v1"),
	Elements     = DataStoreProvider.GetOrderedDataStore("LB_Elements_v1"),
	Molecules    = DataStoreProvider.GetOrderedDataStore("LB_Molecules_v1"),
	ChainTokens  = DataStoreProvider.GetOrderedDataStore("LB_Chain_v1"),
	ProductSales = DataStoreProvider.GetOrderedDataStore("LB_ProductSales_v1"), -- #67
}

-- ══════════════════════════════════════════════
-- LEADERBOARD CACHE
-- ══════════════════════════════════════════════

local cachedBoards = {}  -- {category = { {userId, name, score}, ... }}
local CACHE_TTL = 60     -- seconds between refreshes
local lastRefresh = 0

-- ══════════════════════════════════════════════
-- UPDATE SCORE
-- ══════════════════════════════════════════════

function UpdateLeaderboard(player, category, newScore)
	if not boards[category] then
		warn("[Leaderboards] Unknown category:", category)
		return
	end

	local success = pcall(function()
		boards[category]:SetAsync(tostring(player.UserId), newScore)
	end)

	if not success then
		-- Retry after 5 seconds (DataStore throttle)
		task.delay(5, function()
			pcall(function()
				boards[category]:SetAsync(tostring(player.UserId), newScore)
			end)
		end)
	end
end

-- ══════════════════════════════════════════════
-- GET TOP PLAYERS
-- ══════════════════════════════════════════════

local function getTopPlayers(category, count)
	count = count or 100
	local board = boards[category]
	if not board then return {} end

	local success, result = pcall(function()
		local pages = board:GetSortedAsync(false, count) -- descending
		return pages:GetCurrentPage()
	end)

	if not success then
		warn("[Leaderboards] Failed to get top players for", category)
		return cachedBoards[category] or {}
	end

	local entries = {}
	for rank, entry in ipairs(result) do
		table.insert(entries, {
			rank = rank,
			userId = tonumber(entry.key),
			score = entry.value,
			name = "", -- will be filled if player is online
		})
	end

	-- Fill in names for online players
	for _, entry in ipairs(entries) do
		for _, player in ipairs(Players:GetPlayers()) do
			if player.UserId == entry.userId then
				entry.name = player.Name
				break
			end
		end
		if entry.name == "" then
			-- Try to get name from cache or use userId
			local success2, name = pcall(function()
				return Players:GetNameFromUserIdAsync(entry.userId)
			end)
			entry.name = success2 and name or ("Player" .. entry.userId)
		end
	end

	cachedBoards[category] = entries
	return entries
end

-- ══════════════════════════════════════════════
-- REMOTE FUNCTION HANDLER
-- ══════════════════════════════════════════════

Remotes.GetLeaderboard.OnServerInvoke = function(player, category)
	if type(category) ~= "string" then return {} end
	if not boards[category] then return {} end

	-- Use cache if fresh enough
	local now = tick()
	if cachedBoards[category] and now - lastRefresh < CACHE_TTL then
		return cachedBoards[category]
	end

	return getTopPlayers(category, 100)
end

-- ══════════════════════════════════════════════
-- PERIODIC REFRESH + BROADCAST
-- ══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(CACHE_TTL)
		lastRefresh = tick()

		for category in pairs(boards) do
			getTopPlayers(category, 100)
		end

		-- Broadcast current top players to all clients
		Remotes.FireAllClients("LeaderboardUpdate", cachedBoards)
	end
end)

-- ══════════════════════════════════════════════
-- PLAYER SCORE UPDATES (periodic)
-- Reads from player Attributes set by EconomyManager
-- ══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(30) -- update every 30 seconds
		for _, player in ipairs(Players:GetPlayers()) do
			-- These would normally come from the EconomyManager's player data
			-- For now we use a simple approach via player attributes
			local molCoins = player:GetAttribute("MolCoins") or 0
			local elements = player:GetAttribute("ElementCount") or 0
			local molecules = player:GetAttribute("MoleculeCount") or 0
			local chainTokens = player:GetAttribute("ChainTokens") or 0

			local productSales = player:GetAttribute("ProductSales") or 0  -- #67

			if molCoins > 0 then UpdateLeaderboard(player, "MolCoins", molCoins) end
			if elements > 0 then UpdateLeaderboard(player, "Elements", elements) end
			if molecules > 0 then UpdateLeaderboard(player, "Molecules", molecules) end
			if chainTokens > 0 then UpdateLeaderboard(player, "ChainTokens", chainTokens) end
			if productSales > 0 then UpdateLeaderboard(player, "ProductSales", productSales) end
		end
	end
end)

-- ══════════════════════════════════════════════
-- 3D LEADERBOARD DISPLAY IN WORLD
-- Creates SurfaceGui on a part in the Nexus Hub
-- ══════════════════════════════════════════════

task.spawn(function()
	-- Wait for world to be built
	task.wait(5)

	-- Create leaderboard display part at Nexus Hub
	local lbPart = Instance.new("Part")
	lbPart.Name = "LeaderboardDisplay"
	lbPart.Size = Vector3.new(20, 12, 1)
	lbPart.Position = Vector3.new(30, 18, -10)
	lbPart.Anchored = true
	lbPart.CanCollide = false
	lbPart.Material = Enum.Material.SmoothPlastic
	lbPart.Color = Color3.fromRGB(10, 20, 15)
	lbPart.Parent = workspace

	local surfaceGui = Instance.new("SurfaceGui")
	surfaceGui.Face = Enum.NormalId.Front
	surfaceGui.CanvasSize = Vector2.new(800, 480)
	surfaceGui.Parent = lbPart

	-- Title
	local title = Instance.new("TextLabel")
	title.Size = UDim2.fromScale(1, 0.12)
	title.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
	title.BackgroundTransparency = 0.3
	title.Text = "MOLGANG LEADERBOARD"
	title.TextColor3 = Color3.fromRGB(255, 255, 255)
	title.TextScaled = true
	title.Font = Enum.Font.GothamBold
	title.Parent = surfaceGui

	-- 4 columns for categories
	local categories = {"MolCoins", "Elements", "Molecules", "ChainTokens"}
	local catColors = {
		MolCoins = Color3.fromRGB(255, 215, 0),
		Elements = Color3.fromRGB(34, 197, 94),
		Molecules = Color3.fromRGB(168, 85, 247),
		ChainTokens = Color3.fromRGB(56, 189, 248),
	}

	for i, cat in ipairs(categories) do
		local col = Instance.new("Frame")
		col.Size = UDim2.fromScale(0.25, 0.88)
		col.Position = UDim2.fromScale((i - 1) * 0.25, 0.12)
		col.BackgroundColor3 = Color3.fromRGB(8, 15, 12)
		col.BackgroundTransparency = 0.3
		col.BorderSizePixel = 0
		col.Name = "Col_" .. cat
		col.Parent = surfaceGui

		-- Category header
		local header = Instance.new("TextLabel")
		header.Size = UDim2.fromScale(1, 0.1)
		header.BackgroundColor3 = catColors[cat]
		header.BackgroundTransparency = 0.5
		header.Text = cat
		header.TextColor3 = catColors[cat]
		header.TextScaled = true
		header.Font = Enum.Font.GothamBold
		header.Parent = col

		-- Top 10 entries
		for rank = 1, 10 do
			local entry = Instance.new("TextLabel")
			entry.Name = "Rank" .. rank
			entry.Size = UDim2.fromScale(1, 0.08)
			entry.Position = UDim2.fromScale(0, 0.1 + (rank - 1) * 0.09)
			entry.BackgroundTransparency = 1
			entry.Text = rank .. ". ---"
			entry.TextColor3 = Color3.fromRGB(150, 180, 160)
			entry.TextScaled = true
			entry.Font = Enum.Font.Gotham
			entry.Parent = col
		end
	end

	-- Update display periodically
	while true do
		task.wait(CACHE_TTL)
		for i, cat in ipairs(categories) do
			local col = surfaceGui:FindFirstChild("Col_" .. cat)
			if col and cachedBoards[cat] then
				for rank = 1, 10 do
					local label = col:FindFirstChild("Rank" .. rank)
					if label then
						local entry = cachedBoards[cat][rank]
						if entry then
							label.Text = rank .. ". " .. entry.name .. " — " .. tostring(entry.score)
						else
							label.Text = rank .. ". ---"
						end
					end
				end
			end
		end
	end
end)

print("[MOLGANG] Leaderboards initialized - 5 categories (+ ProductSales)")
