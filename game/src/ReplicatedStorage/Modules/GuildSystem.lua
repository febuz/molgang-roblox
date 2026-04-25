--[[
	GuildSystem.lua
	MOLGANG — Guild / Team System (#72)

	Players can create or join guilds to:
	- Share factory production bonuses
	- Compete on guild leaderboards
	- Pool resources for expensive research
	- Trade atoms between guild members for free

	Guild ranks: Leader > Officer > Member > Recruit
]]

local GuildSystem = {}

GuildSystem.MaxGuildSize = 10
GuildSystem.CreateCost = 5000 -- MolCoins to create a guild

GuildSystem.Ranks = {
	{id = "leader", name = "Guild Leader", level = 4},
	{id = "officer", name = "Officer", level = 3},
	{id = "member", name = "Member", level = 2},
	{id = "recruit", name = "Recruit", level = 1},
}

-- Guild bonuses scale with member count
GuildSystem.Bonuses = {
	{members = 2, bonus = "coinBonus", value = 1.05, description = "+5% MolCoin earnings"},
	{members = 4, bonus = "productionBonus", value = 1.10, description = "+10% production speed"},
	{members = 6, bonus = "leachBonus", value = 0.90, description = "-10% leaching time"},
	{members = 8, bonus = "tradeDiscount", value = 0.85, description = "-15% market fees"},
	{members = 10, bonus = "rareBonus", value = 1.20, description = "+20% rare element chance"},
}

function GuildSystem.CreateGuildData(name, leaderId, leaderName)
	return {
		name = name,
		tag = name:sub(1, 4):upper(),
		leaderId = leaderId,
		createdAt = os.time(),
		members = {
			{userId = leaderId, name = leaderName, rank = "leader", joinedAt = os.time()},
		},
		treasury = 0,
		level = 1,
		totalProduction = 0,
	}
end

function GuildSystem.GetActiveBonuses(memberCount)
	local active = {}
	for _, bonus in ipairs(GuildSystem.Bonuses) do
		if memberCount >= bonus.members then
			table.insert(active, bonus)
		end
	end
	return active
end

function GuildSystem.GetRankInfo(rankId)
	for _, rank in ipairs(GuildSystem.Ranks) do
		if rank.id == rankId then return rank end
	end
	return GuildSystem.Ranks[4] -- default recruit
end

function GuildSystem.CanInvite(guild, inviterRank)
	-- Officers and leaders can invite
	local rankInfo = GuildSystem.GetRankInfo(inviterRank)
	return rankInfo.level >= 3 and #guild.members < GuildSystem.MaxGuildSize
end

function GuildSystem.CanKick(kickerRank, targetRank)
	local kickerInfo = GuildSystem.GetRankInfo(kickerRank)
	local targetInfo = GuildSystem.GetRankInfo(targetRank)
	return kickerInfo.level > targetInfo.level
end

function GuildSystem.GetGuildLevel(guild)
	-- Level based on total production
	local prod = guild.totalProduction or 0
	if prod >= 100000 then return 5, "Legendary"
	elseif prod >= 50000 then return 4, "Epic"
	elseif prod >= 20000 then return 3, "Rare"
	elseif prod >= 5000 then return 2, "Uncommon"
	else return 1, "Common"
	end
end

return GuildSystem
