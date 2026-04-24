--[[
	Certificate.lua
	MOLGANG — Chemical Engineering Diploma System (#90)

	Awards a printable-style diploma when players complete all quests or
	reach specific milestones.
]]

local Certificate = {}

Certificate.Diplomas = {
	{
		id = "bachelor_chem",
		name = "Bachelor of Chemical Engineering",
		description = "Completed all Starter and Intermediate quests",
		requirement = {questsCompleted = 6},
		border = Color3.fromRGB(0, 100, 200),
	},
	{
		id = "master_chem",
		name = "Master of Chemical Engineering",
		description = "Completed all quests including Advanced track",
		requirement = {questsCompleted = 12},
		border = Color3.fromRGB(200, 150, 0),
	},
	{
		id = "phd_chem",
		name = "PhD in Chemical Engineering",
		description = "Research tree fully unlocked + all quests complete",
		requirement = {questsCompleted = 12, researchComplete = true},
		border = Color3.fromRGB(255, 215, 0),
	},
	{
		id = "slag_specialist",
		name = "Certified Slag Processing Specialist",
		description = "Completed 50 leaching operations",
		requirement = {leachesCompleted = 50},
		border = Color3.fromRGB(180, 60, 40),
	},
	{
		id = "green_engineer",
		name = "Certified Green Chemical Engineer",
		description = "Achieved Green Champion carbon rating",
		requirement = {carbonRating = "green"},
		border = Color3.fromRGB(0, 200, 80),
	},
}

function Certificate.CheckEligibility(playerData, diplomaId)
	for _, diploma in ipairs(Certificate.Diplomas) do
		if diploma.id == diplomaId then
			local req = diploma.requirement
			if req.questsCompleted then
				local count = 0
				if playerData.completedQuests then
					for _ in pairs(playerData.completedQuests) do count = count + 1 end
				end
				if count < req.questsCompleted then return false end
			end
			return true
		end
	end
	return false
end

function Certificate.GetDiploma(diplomaId)
	for _, d in ipairs(Certificate.Diplomas) do
		if d.id == diplomaId then return d end
	end
	return nil
end

return Certificate
