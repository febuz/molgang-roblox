-- ServerScriptService/Core/LogisticsServer.server.lua
-- Manages player transport route builds, upgrades, operating costs, and bottleneck alerts.
-- Settlers-layer: without logistics, factories can't ship product to buyers.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService  = game:GetService("DataStoreService")
local Players           = game:GetService("Players")

local LogisticsNetwork = require(ReplicatedStorage.Modules.LogisticsNetwork)
local WorldTerritory   = require(ReplicatedStorage.Modules.WorldTerritory)
local DiplomacySystem  = require(ReplicatedStorage.Modules.DiplomacySystem)
local Remotes          = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

local COST_TICK_INTERVAL    = 60   -- operating costs deducted every minute
local BOTTLENECK_CHECK_INTERVAL = 120  -- bottleneck alerts every 2 minutes

-- DataStore for route persistence
local logisticsStore = DataStoreService:GetDataStore("MolGang_Logistics_v1")
local suspendedPayers = {}

-- ──────────────────────────────────────────────
-- PERSIST / RESTORE
-- ──────────────────────────────────────────────

local function saveLogisticsState()
	pcall(function()
		logisticsStore:SetAsync("routes_global", LogisticsNetwork.Serialize())
	end)
end

local function loadLogisticsState()
	local ok, data = pcall(function()
		return logisticsStore:GetAsync("routes_global")
	end)
	if ok and data then
		LogisticsNetwork.Deserialize(data)
		local routeCount = 0
		for _ in pairs(data.routes or {}) do
			routeCount += 1
		end
		print("[LogisticsServer] Restored", routeCount, "routes from DataStore")
	else
		print("[LogisticsServer] No saved logistics state")
	end
end

-- ──────────────────────────────────────────────
-- HEX DISTANCE (for route range validation)
-- ──────────────────────────────────────────────

local function hexDistance(t1, t2)
	if not t1 or not t2 then return 99 end
	-- Axial distance formula
	local dq = math.abs(t1.q - t2.q)
	local dr = math.abs(t1.r - t2.r)
	local ds = math.abs((t1.q + t1.r) - (t2.q + t2.r))
	return math.max(dq, dr, ds)
end

-- ──────────────────────────────────────────────
-- REMOTES
-- ──────────────────────────────────────────────

-- BUILD ROUTE
Remotes.RequestBuildRoute.OnServerEvent:Connect(function(player, fromId, toId, modeId)
	local guildId = player:GetAttribute("Guild") or tostring(player.UserId)

	local fromTerritory = WorldTerritory.Get(fromId)
	local toTerritory   = WorldTerritory.Get(toId)

	if not fromTerritory or not toTerritory then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Invalid territory IDs for route.",
			rarity  = "common",
		})
		return
	end

	-- Check ownership: player/guild must own at least one endpoint,
	-- or have a Logistics Access treaty with the endpoint owner
	local ownsFrom = fromTerritory.owner == guildId
	local ownsTo   = toTerritory.owner == guildId
	if not ownsFrom and not ownsTo then
		-- Check diplomacy
		local hasAccessFrom = DiplomacySystem.HasTreaty(guildId, fromTerritory.owner, "LOGISTICS_ACCESS")
		local hasAccessTo   = DiplomacySystem.HasTreaty(guildId, toTerritory.owner, "LOGISTICS_ACCESS")
		if not hasAccessFrom and not hasAccessTo then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "You must own or have a Logistics Access treaty for at least one endpoint.",
				rarity  = "common",
			})
			return
		end
	end

	local dist = hexDistance(fromTerritory, toTerritory)

	-- Get territory control bonuses for the owner
	local ownerBonuses = WorldTerritory.GetOwnerBonuses(guildId)

	local canBuild, reason, cost = LogisticsNetwork.ValidateBuild(fromId, toId, modeId, dist, ownerBonuses)
	if not canBuild then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Cannot build route: " .. reason,
			rarity  = "common",
		})
		return
	end

	if not PlayerDataBridge.SpendMolCoins(player.UserId, cost) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Insufficient MolCoins for this route (" .. cost .. ").",
			rarity = "common",
		})
		return
	end

	local route, err = LogisticsNetwork.BuildRoute(guildId, fromId, toId, modeId, nil, player.UserId)
	if not route then
		PlayerDataBridge.AddMolCoins(player.UserId, cost)
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Route build failed: " .. (err or "unknown error"),
			rarity  = "common",
		})
		return
	end

	Remotes.FireClient("ServerAnnounce", player, {
		message = string.format("Route built: %s → %s via %s (%.0f MolCoins)",
			fromTerritory.name, toTerritory.name, modeId, cost),
		rarity  = "uncommon",
	})

	-- Send updated route list
	Remotes.FireClient("NetworkStatusResponse", player, {
		routes      = LogisticsNetwork.GetOwnerRoutes(guildId),
		bottlenecks = LogisticsNetwork.GetBottlenecks(),
	})

	saveLogisticsState()
end)

-- UPGRADE ROUTE
Remotes.RequestUpgradeRoute.OnServerEvent:Connect(function(player, routeId)
	local guildId = player:GetAttribute("Guild") or tostring(player.UserId)

	local canUpgrade, upgradeReason, upgradeCost = LogisticsNetwork.GetUpgradeCost(routeId, guildId)
	if not canUpgrade then
		Remotes.FireClient("ServerAnnounce", player, { message = "Upgrade failed: " .. upgradeReason, rarity = "common" })
		return
	end
	if not PlayerDataBridge.SpendMolCoins(player.UserId, upgradeCost) then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Insufficient MolCoins for this upgrade (" .. upgradeCost .. ").",
			rarity = "common",
		})
		return
	end
	local ok, reason, cost = LogisticsNetwork.UpgradeRoute(routeId, guildId)
	if not ok then
		PlayerDataBridge.AddMolCoins(player.UserId, upgradeCost)
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Upgrade failed: " .. (reason or "unknown"),
			rarity  = "common",
		})
		return
	end

	Remotes.FireClient("ServerAnnounce", player, {
		message = string.format("Route upgraded (%.0f MolCoins).", cost),
		rarity  = "uncommon",
	})
	Remotes.FireClient("NetworkStatusResponse", player, {
		routes      = LogisticsNetwork.GetOwnerRoutes(guildId),
		bottlenecks = LogisticsNetwork.GetBottlenecks(),
	})

	saveLogisticsState()
end)

-- REMOVE ROUTE
Remotes.RequestRemoveRoute.OnServerEvent:Connect(function(player, routeId)
	local guildId = player:GetAttribute("Guild") or tostring(player.UserId)
	local ok, reason = LogisticsNetwork.RemoveRoute(routeId, guildId)
	if not ok then
		Remotes.FireClient("ServerAnnounce", player, { message = reason or "Remove failed.", rarity = "common" })
		return
	end
	Remotes.FireClient("ServerAnnounce", player, { message = "Route removed.", rarity = "common" })
	Remotes.FireClient("NetworkStatusResponse", player, {
		routes = LogisticsNetwork.GetOwnerRoutes(guildId),
		bottlenecks = LogisticsNetwork.GetBottlenecks(),
	})
	saveLogisticsState()
end)

-- NETWORK STATUS REQUEST
Remotes.RequestNetworkStatus.OnServerEvent:Connect(function(player)
	local guildId = player:GetAttribute("Guild") or tostring(player.UserId)
	Remotes.FireClient("NetworkStatusResponse", player, {
		routes      = LogisticsNetwork.GetOwnerRoutes(guildId),
		bottlenecks = LogisticsNetwork.GetBottlenecks(),
		snapshot    = LogisticsNetwork.GetNetworkSnapshot(),
	})
end)

-- ──────────────────────────────────────────────
-- OPERATING COST TICK
-- ──────────────────────────────────────────────

task.spawn(function()
	while true do
		task.wait(COST_TICK_INTERVAL)
		for payerId in pairs(suspendedPayers) do
			local cost = LogisticsNetwork.GetPayerOperatingCost(payerId)
			local data = PlayerDataBridge.GetEconomyData(payerId)
			if cost > 0 and data and (data.molCoins or 0) >= cost then
				local resumed = LogisticsNetwork.ResumeRoutesForPayer(payerId)
				suspendedPayers[payerId] = nil
				local payer = Players:GetPlayerByUserId(payerId)
				if payer then
					Remotes.FireClient("ServerAnnounce", payer, {
						message = "Logistics resumed after payment: " .. resumed .. " route(s) active.",
						rarity = "uncommon",
					})
				end
			end
		end

		-- Compute and deduct operating costs for all route owners
		local costs = LogisticsNetwork.ComputeOperatingCosts()
		for ownerIdStr, cost in pairs(costs) do
			-- Route to player deduction if applicable
			local userId = tonumber(ownerIdStr)
			if userId then
				if not PlayerDataBridge.SpendMolCoins(userId, cost) then
					local suspended = LogisticsNetwork.SuspendRoutesForPayer(userId)
					suspendedPayers[userId] = true
					local payer = Players:GetPlayerByUserId(userId)
					if payer then
						Remotes.FireClient("ServerAnnounce", payer, {
							message = "Logistics suspended: insufficient MolCoins for " .. suspended .. " route(s).",
							rarity = "common",
						})
					end
				end
			end
		end

		-- Reset utilisation for next minute
		LogisticsNetwork.DecayUtilisation()
	end
end)

-- ──────────────────────────────────────────────
-- BOTTLENECK ALERT TICK
-- ──────────────────────────────────────────────

task.spawn(function()
	while true do
		task.wait(BOTTLENECK_CHECK_INTERVAL)
		local bottlenecks = LogisticsNetwork.GetBottlenecks()
		if #bottlenecks > 0 then
			-- Alert route owners about bottlenecks
			for _, bn in ipairs(bottlenecks) do
				-- Find the player who owns this route
				for _, player in ipairs(Players:GetPlayers()) do
					local guildId = player:GetAttribute("Guild") or tostring(player.UserId)
					if tostring(bn.ownerId) == tostring(guildId) then
						Remotes.FireClient("ServerAnnounce", player, {
							message = "⚠ Logistics bottleneck: " .. bn.from .. " → " .. bn.to
								.. " at " .. bn.utilPct .. "% capacity. " .. bn.hint,
							rarity = "rare",
						})
						break
					end
				end
			end
		end
	end
end)

-- ──────────────────────────────────────────────
-- STARTUP
-- ──────────────────────────────────────────────

loadLogisticsState()

Players.PlayerAdded:Connect(function(player)
	task.wait(5)
	local guildId = player:GetAttribute("Guild") or tostring(player.UserId)
	Remotes.FireClient("NetworkStatusResponse", player, {
		routes      = LogisticsNetwork.GetOwnerRoutes(guildId),
		bottlenecks = {},
		snapshot    = LogisticsNetwork.GetNetworkSnapshot(),
	})
end)

game:BindToClose(function()
	saveLogisticsState()
end)

print("[MOLGANG] LogisticsServer initialized")
