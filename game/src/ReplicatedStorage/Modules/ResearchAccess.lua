--[[
	ResearchAccess.lua
	Canonical mapping from technology research to process capabilities.
	Keep this module side-effect free so server systems and tests share the
	same rules without trusting client-provided research state.
]]

local ResearchTree
if script then
	ResearchTree = require(script.Parent.ResearchTree)
else
	-- Lune test runner fallback; Roblox supplies the ModuleScript `script`.
	ResearchTree = require("../Modules/ResearchTree")
end
local ResearchAccess = {}

ResearchAccess.ReagentRequirements = {
	H2O = {"water_leaching"},
	HCl = {"acid_leaching"},
	CitricAcid = {"acid_leaching"},
	H2SO4 = {"strong_acid_leaching", "fume_extraction"},
	HNO3 = {"strong_acid_leaching", "fume_extraction"},
	NaOH = {"alkaline_leaching"},
}

ResearchAccess.ParticleRequirements = {
	ground = {"ball_milling"},
	powder = {"ball_milling"},
}

function ResearchAccess.IsUnlocked(research, nodeId)
	if type(research) ~= "table" then return false end
	local unlocked = research.unlocked
	if type(unlocked) == "table" and unlocked[nodeId] then return true end
	local node = ResearchTree.GetNode(nodeId)
	return node ~= nil and node.unlocked == true
end

local function checkRequirements(research, requirements)
	if not requirements then return true, nil end
	for _, nodeId in ipairs(requirements) do
		if not ResearchAccess.IsUnlocked(research, nodeId) then
			local node = ResearchTree.GetNode(nodeId)
			return false, node and node.name or nodeId
		end
	end
	return true, nil
end

function ResearchAccess.CanUseReagent(research, reagentId)
	return checkRequirements(research, ResearchAccess.ReagentRequirements[reagentId])
end

function ResearchAccess.CanUseParticleSize(research, particleSize)
	return checkRequirements(research, ResearchAccess.ParticleRequirements[particleSize])
end

return ResearchAccess
