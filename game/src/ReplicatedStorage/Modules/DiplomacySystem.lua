--[[
	DiplomacySystem.lua
	MOLGANG — Alliance, Treaty & Trade Agreement System

	Players (as guild leaders) and AI corporations form relationships.
	Treaties create binding agreements with mechanical effects:

	TREATY TYPES:
	  NON_AGGRESSION   — neither party applies pressure to each other's territories
	  TRADE_AGREEMENT  — preferential pricing on specific commodities
	  RESEARCH_SHARE   — share one research node (one-way or mutual)
	  LOGISTICS_ACCESS — use each other's transport routes at reduced cost
	  JOINT_VENTURE    — jointly own a territory, split resources 50/50

	Settling a treaty requires both parties to agree (or AI to accept).
	Treaties expire after their duration. Violation has reputation consequences.
]]

local DiplomacySystem = {}

-- ════════════════════════════════════════════════
-- TREATY TYPE DEFINITIONS
-- ════════════════════════════════════════════════

DiplomacySystem.TreatyTypes = {
	NON_AGGRESSION = {
		id          = "non_aggression",
		name        = "Non-Aggression Pact",
		description = "Neither party applies territorial pressure to the other's controlled zones.",
		defaultDuration = 3600,  -- 1 real hour
		maxDuration     = 86400, -- 24 real hours
		cost            = 500,   -- MolCoins to propose
		effects = {
			blockTerritoryPressure = true,
		},
		aiAcceptChance = { APEX = 0.30, NOVA = 0.60, GREEN = 0.70, OMNI = 0.55 },
	},

	TRADE_AGREEMENT = {
		id          = "trade_agreement",
		name        = "Bilateral Trade Agreement",
		description = "Agreed commodity prices between parties. Both pay/receive the negotiated rate.",
		defaultDuration = 1800,
		maxDuration     = 7200,
		cost            = 1000,
		effects = {
			-- Per-agreement: commodity and price set during negotiation
			preferentialPricing = true,
		},
		aiAcceptChance = { APEX = 0.45, NOVA = 0.70, GREEN = 0.65, OMNI = 0.80 },
	},

	RESEARCH_SHARE = {
		id          = "research_share",
		name        = "Research Sharing Protocol",
		description = "Parties share access to specified research nodes. Reduces research cost by 50% on shared nodes.",
		defaultDuration = 2700,
		maxDuration     = 10800,
		cost            = 2000,
		effects = {
			sharedResearchCostMult = 0.50,
		},
		aiAcceptChance = { APEX = 0.20, NOVA = 0.85, GREEN = 0.75, OMNI = 0.40 },
	},

	LOGISTICS_ACCESS = {
		id          = "logistics_access",
		name        = "Logistics Access Agreement",
		description = "Both parties can use each other's transport routes at 60% of normal operating cost.",
		defaultDuration = 3600,
		maxDuration     = 14400,
		cost            = 800,
		effects = {
			partnerRouteCostMult = 0.60,
		},
		aiAcceptChance = { APEX = 0.50, NOVA = 0.55, GREEN = 0.70, OMNI = 0.65 },
	},

	JOINT_VENTURE = {
		id          = "joint_venture",
		name        = "Joint Territory Venture",
		description = "Both parties co-own a neutral territory. Resources split 50/50, capture attacks split defense.",
		defaultDuration = 7200,
		maxDuration     = 86400,
		cost            = 5000,
		effects = {
			coOwnership = true,
			resourceSplitRatio = 0.50,
		},
		aiAcceptChance = { APEX = 0.25, NOVA = 0.50, GREEN = 0.60, OMNI = 0.55 },
	},
}

-- ════════════════════════════════════════════════
-- TREATY REGISTRY
-- ════════════════════════════════════════════════

DiplomacySystem._treaties = {}   -- { treatyId -> Treaty }
DiplomacySystem._proposals = {}  -- { proposalId -> Proposal }
DiplomacySystem._reputations = {} -- { entityId -> {otherEntityId -> score 0-100} }

local _nextTreatyId = 1
local _nextProposalId = 1

local function newTreatyId()
	local id = "TREATY_" .. _nextTreatyId
	_nextTreatyId = _nextTreatyId + 1
	return id
end

local function newProposalId()
	local id = "PROP_" .. _nextProposalId
	_nextProposalId = _nextProposalId + 1
	return id
end

-- ════════════════════════════════════════════════
-- REPUTATION SYSTEM
-- ════════════════════════════════════════════════

-- Reputation: 0 = hostile, 50 = neutral, 100 = allied
-- AI corps use reputation to weight alliance decisions

function DiplomacySystem.GetReputation(entityA, entityB)
	local reps = DiplomacySystem._reputations[entityA]
	if not reps then return 50 end
	return reps[entityB] or 50
end

function DiplomacySystem.AdjustReputation(entityA, entityB, delta)
	DiplomacySystem._reputations[entityA] = DiplomacySystem._reputations[entityA] or {}
	DiplomacySystem._reputations[entityB] = DiplomacySystem._reputations[entityB] or {}

	local currentAB = DiplomacySystem._reputations[entityA][entityB] or 50
	local currentBA = DiplomacySystem._reputations[entityB][entityA] or 50

	-- Reputation changes are partially mirrored (your opinion of them improves when theirs does)
	DiplomacySystem._reputations[entityA][entityB] = math.clamp(currentAB + delta, 0, 100)
	DiplomacySystem._reputations[entityB][entityA] = math.clamp(currentBA + delta * 0.5, 0, 100)
end

-- ════════════════════════════════════════════════
-- PROPOSAL SYSTEM
-- ════════════════════════════════════════════════

-- Propose a treaty (returns proposalId, cost)
function DiplomacySystem.Propose(proposerId, targetId, treatyTypeId, terms, duration)
	local ttype = DiplomacySystem.TreatyTypes[string.upper(treatyTypeId)]
	if not ttype then
		return nil, "Unknown treaty type: " .. tostring(treatyTypeId)
	end

	duration = math.clamp(duration or ttype.defaultDuration, 60, ttype.maxDuration)

	local proposal = {
		id         = newProposalId(),
		proposerId = proposerId,
		targetId   = targetId,
		treatyType = treatyTypeId,
		terms      = terms or {},    -- commodity prices, research node ids, territory id, etc.
		duration   = duration,
		cost       = ttype.cost,
		status     = "pending",      -- pending / accepted / rejected / expired
		expiresAt  = os.time() + 300, -- proposals expire after 5 minutes
	}

	DiplomacySystem._proposals[proposal.id] = proposal
	return proposal, nil
end

-- AI evaluates and responds to a proposal
function DiplomacySystem.AIEvaluateProposal(proposalId, aiCorp)
	local prop = DiplomacySystem._proposals[proposalId]
	if not prop then return false, "Proposal not found" end
	if prop.targetId ~= aiCorp.id then return false, "Wrong target" end

	local ttype = DiplomacySystem.TreatyTypes[string.upper(prop.treatyType)]
	if not ttype then return false end

	-- Base acceptance chance from corp personality
	local baseChance = ttype.aiAcceptChance[aiCorp.id] or 0.50

	-- Reputation modifier: higher reputation = more likely to accept
	local rep = DiplomacySystem.GetReputation(aiCorp.id, prop.proposerId)
	local repMod = (rep - 50) / 100  -- -0.50 to +0.50

	-- Strategy modifier
	local stratMod = aiCorp.strategy.formAlliances * 0.3

	local finalChance = math.clamp(baseChance + repMod + stratMod, 0.05, 0.95)

	if math.random() < finalChance then
		return DiplomacySystem.AcceptProposal(proposalId, aiCorp.id)
	else
		prop.status = "rejected"
		-- Reputation hit for rejection
		DiplomacySystem.AdjustReputation(aiCorp.id, prop.proposerId, -5)
		return false, "Proposal rejected by " .. aiCorp.name
	end
end

-- Accept a proposal and create treaty
function DiplomacySystem.AcceptProposal(proposalId, acceptorId)
	local prop = DiplomacySystem._proposals[proposalId]
	if not prop then return nil, "Proposal not found" end
	if prop.targetId ~= acceptorId then return nil, "Not addressed to you" end
	if prop.status ~= "pending" then return nil, "Proposal already " .. prop.status end
	if os.time() > prop.expiresAt then
		prop.status = "expired"
		return nil, "Proposal has expired"
	end

	prop.status = "accepted"

	local treaty = {
		id         = newTreatyId(),
		proposalId = proposalId,
		parties    = { prop.proposerId, prop.targetId },
		treatyType = prop.treatyType,
		terms      = prop.terms,
		startTime  = os.time(),
		endTime    = os.time() + prop.duration,
		violations = 0,
		active     = true,
	}

	DiplomacySystem._treaties[treaty.id] = treaty

	-- Reputation boost for successful treaty
	DiplomacySystem.AdjustReputation(prop.proposerId, acceptorId, 15)

	return treaty, nil
end

-- Reject a proposal
function DiplomacySystem.RejectProposal(proposalId, rejectingId)
	local prop = DiplomacySystem._proposals[proposalId]
	if not prop then return false, "Proposal not found" end
	if prop.targetId ~= rejectingId then return false, "Not addressed to you" end

	prop.status = "rejected"
	DiplomacySystem.AdjustReputation(rejectingId, prop.proposerId, -5)
	return true, nil
end

-- ════════════════════════════════════════════════
-- TREATY LIFECYCLE
-- ════════════════════════════════════════════════

-- Expire treaties and proposals past their end time
-- Returns list of expired treaty ids
function DiplomacySystem.TickExpiry()
	local now = os.time()
	local expired = {}

	for id, treaty in pairs(DiplomacySystem._treaties) do
		if treaty.active and now >= treaty.endTime then
			treaty.active = false
			table.insert(expired, id)
			-- Mild reputation decrease when treaty ends (need to renew)
			for _, party in ipairs(treaty.parties) do
				for _, other in ipairs(treaty.parties) do
					if party ~= other then
						DiplomacySystem.AdjustReputation(party, other, -3)
					end
				end
			end
		end
	end

	-- Expire proposals
	for id, prop in pairs(DiplomacySystem._proposals) do
		if prop.status == "pending" and now > prop.expiresAt then
			prop.status = "expired"
		end
	end

	return expired
end

-- Terminate a treaty early (violation)
function DiplomacySystem.ViolateTreaty(treatyId, violatorId)
	local treaty = DiplomacySystem._treaties[treatyId]
	if not treaty or not treaty.active then return false, "Treaty not active" end

	treaty.active = false
	treaty.violations = treaty.violations + 1

	-- Severe reputation hit for violating
	for _, party in ipairs(treaty.parties) do
		if party ~= violatorId then
			DiplomacySystem.AdjustReputation(violatorId, party, -30)
			DiplomacySystem.AdjustReputation(party, violatorId, -20)
		end
	end

	return true, nil
end

-- ════════════════════════════════════════════════
-- EFFECT QUERIES
-- ════════════════════════════════════════════════

-- Get all active treaties involving an entity
function DiplomacySystem.GetTreatiesFor(entityId)
	local result = {}
	for _, treaty in pairs(DiplomacySystem._treaties) do
		if treaty.active then
			for _, party in ipairs(treaty.parties) do
				if party == entityId then
					table.insert(result, treaty)
					break
				end
			end
		end
	end
	return result
end

-- Check if two entities have a specific treaty type active
function DiplomacySystem.HasTreaty(entityA, entityB, treatyTypeId)
	for _, treaty in pairs(DiplomacySystem._treaties) do
		if treaty.active and treaty.treatyType == treatyTypeId then
			local hasA, hasB = false, false
			for _, party in ipairs(treaty.parties) do
				if party == entityA then hasA = true end
				if party == entityB then hasB = true end
			end
			if hasA and hasB then return true, treaty end
		end
	end
	return false, nil
end

-- Get combined diplomatic effects for an entity pair
function DiplomacySystem.GetEffects(entityA, entityB)
	local effects = {}
	for _, treaty in pairs(DiplomacySystem._treaties) do
		if not treaty.active then continue end
		local hasA, hasB = false, false
		for _, party in ipairs(treaty.parties) do
			if party == entityA then hasA = true end
			if party == entityB then hasB = true end
		end
		if hasA and hasB then
			local ttype = DiplomacySystem.TreatyTypes[string.upper(treaty.treatyType)]
			if ttype and ttype.effects then
				for k, v in pairs(ttype.effects) do
					effects[k] = v
				end
				-- Apply treaty-specific terms
				for k, v in pairs(treaty.terms) do
					effects[k] = v
				end
			end
		end
	end
	return effects
end

-- ════════════════════════════════════════════════
-- PENDING PROPOSALS FOR AN ENTITY
-- ════════════════════════════════════════════════

function DiplomacySystem.GetPendingProposals(entityId)
	local result = {}
	for _, prop in pairs(DiplomacySystem._proposals) do
		if prop.status == "pending" and prop.targetId == entityId and os.time() <= prop.expiresAt then
			table.insert(result, prop)
		end
	end
	return result
end

-- ════════════════════════════════════════════════
-- DIPLOMACY STATUS SNAPSHOT
-- ════════════════════════════════════════════════

function DiplomacySystem.GetStatusSnapshot(entityId)
	return {
		treaties         = DiplomacySystem.GetTreatiesFor(entityId),
		pendingProposals = DiplomacySystem.GetPendingProposals(entityId),
		reputation       = DiplomacySystem._reputations[entityId] or {},
	}
end

-- ════════════════════════════════════════════════
-- PERSISTENCE
-- ════════════════════════════════════════════════

function DiplomacySystem.Serialize()
	return {
		treaties     = DiplomacySystem._treaties,
		proposals    = DiplomacySystem._proposals,
		reputations  = DiplomacySystem._reputations,
		nextTreaty   = _nextTreatyId,
		nextProposal = _nextProposalId,
	}
end

function DiplomacySystem.Deserialize(data)
	if not data then return end
	DiplomacySystem._treaties     = data.treaties     or {}
	DiplomacySystem._proposals    = data.proposals    or {}
	DiplomacySystem._reputations  = data.reputations  or {}
	_nextTreatyId                 = data.nextTreaty   or 1
	_nextProposalId               = data.nextProposal or 1
end

return DiplomacySystem
