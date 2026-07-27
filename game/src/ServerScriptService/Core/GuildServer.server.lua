--[[
	GuildServer.server.lua
	MOLGANG — Guild System Server (#72)

	Handles guild creation, joining, leaving, and bonus application.
	Guild data stored in DataStore for persistence.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreProvider = require(ReplicatedStorage.Modules.DataStoreProvider)

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local GuildSystem = require(ReplicatedStorage.Modules.GuildSystem)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

local guildStore = DataStoreProvider.GetDataStore("MolGang_Guilds_v1")

-- In-memory guild cache
local guilds = {}           -- {guildName = guildData}
local playerGuilds = {}     -- {userId = guildName}

-- ═══════════════════════════════════════════════
-- CREATE GUILD
-- ═══════════════════════════════════════════════

Remotes.RequestCreateGuild.OnServerEvent:Connect(function(player, guildName)
	local userId = player.UserId

	if type(guildName) ~= "string" or #guildName < 3 or #guildName > 20 then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Guild name must be 3-20 characters.",
			rarity = "common",
		})
		return
	end

	-- Already in a guild?
	if playerGuilds[userId] then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "You're already in guild: " .. playerGuilds[userId],
			rarity = "common",
		})
		return
	end

	-- Name taken?
	if guilds[guildName] then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Guild name already taken!",
			rarity = "common",
		})
		return
	end

	-- Cost check
	local success = PlayerDataBridge.SpendMolCoins(userId, GuildSystem.CreateCost)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Creating a guild costs " .. GuildSystem.CreateCost .. " MC.",
			rarity = "common",
		})
		return
	end

	-- Create guild
	local guild = GuildSystem.CreateGuildData(guildName, userId, player.Name)
	guilds[guildName] = guild
	playerGuilds[userId] = guildName

	-- Save to DataStore
	pcall(function()
		guildStore:SetAsync("guild_" .. guildName, guild)
	end)

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Guild [" .. guild.tag .. "] " .. guildName .. " created! You are the Guild Leader.",
		rarity = "epic",
	})

	Remotes.FireAllClients("ServerAnnounce", {
		message = player.Name .. " founded guild [" .. guild.tag .. "] " .. guildName .. "!",
		rarity = "uncommon",
	})

	print("[Guild]", player.Name, "created guild:", guildName)
end)

-- ═══════════════════════════════════════════════
-- JOIN GUILD
-- ═══════════════════════════════════════════════

Remotes.RequestJoinGuild.OnServerEvent:Connect(function(player, guildName)
	local userId = player.UserId

	if playerGuilds[userId] then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Leave your current guild first!",
			rarity = "common",
		})
		return
	end

	local guild = guilds[guildName]
	if not guild then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Guild not found: " .. tostring(guildName),
			rarity = "common",
		})
		return
	end

	if #guild.members >= GuildSystem.MaxGuildSize then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Guild is full! (" .. #guild.members .. "/" .. GuildSystem.MaxGuildSize .. ")",
			rarity = "common",
		})
		return
	end

	-- Add member
	table.insert(guild.members, {
		userId = userId,
		name = player.Name,
		rank = "recruit",
		joinedAt = os.time(),
	})
	playerGuilds[userId] = guildName

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Joined [" .. guild.tag .. "] " .. guildName .. " as Recruit!",
		rarity = "rare",
	})

	-- Notify guild members
	for _, member in ipairs(guild.members) do
		local memberPlayer = Players:GetPlayerByUserId(member.userId)
		if memberPlayer and memberPlayer ~= player then
			Remotes.FireClient("ServerAnnounce", memberPlayer, {
				message = player.Name .. " joined your guild!",
				rarity = "uncommon",
			})
		end
	end

	print("[Guild]", player.Name, "joined", guildName)
end)

-- ═══════════════════════════════════════════════
-- LEAVE GUILD
-- ═══════════════════════════════════════════════

Remotes.RequestLeaveGuild.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local guildName = playerGuilds[userId]
	if not guildName then return end

	local guild = guilds[guildName]
	if not guild then
		playerGuilds[userId] = nil
		return
	end

	-- Remove from member list
	for i, member in ipairs(guild.members) do
		if member.userId == userId then
			-- Leader leaving? Promote next member
			if member.rank == "leader" and #guild.members > 1 then
				local nextLeader = nil
				for j, m in ipairs(guild.members) do
					if j ~= i then
						nextLeader = m
						break
					end
				end
				if nextLeader then
					nextLeader.rank = "leader"
				end
			end
			table.remove(guild.members, i)
			break
		end
	end

	playerGuilds[userId] = nil

	-- Disband if empty
	if #guild.members == 0 then
		guilds[guildName] = nil
		pcall(function() guildStore:RemoveAsync("guild_" .. guildName) end)
	end

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Left guild [" .. guild.tag .. "] " .. guildName,
		rarity = "common",
	})

	print("[Guild]", player.Name, "left", guildName)
end)

-- ═══════════════════════════════════════════════
-- GUILD INFO REQUEST
-- ═══════════════════════════════════════════════

Remotes.RequestGuildInfo.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local guildName = playerGuilds[userId]

	local allGuilds = {}
	for name, guild in pairs(guilds) do
		table.insert(allGuilds, {
			name = name,
			tag = guild.tag,
			memberCount = #guild.members,
			level = GuildSystem.GetGuildLevel(guild),
		})
	end

	local myGuild = nil
	if guildName and guilds[guildName] then
		local g = guilds[guildName]
		myGuild = {
			name = guildName,
			tag = g.tag,
			members = g.members,
			treasury = g.treasury,
			bonuses = GuildSystem.GetActiveBonuses(#g.members),
			level = GuildSystem.GetGuildLevel(g),
		}
	end

	Remotes.FireClient("GuildInfoResponse", player, {
		myGuild = myGuild,
		allGuilds = allGuilds,
	})
end)

-- ═══════════════════════════════════════════════
-- CLEANUP
-- ═══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	-- Guild membership persists (DataStore), don't remove on leave
end)

print("[MOLGANG] GuildServer initialized — team system with bonuses")
