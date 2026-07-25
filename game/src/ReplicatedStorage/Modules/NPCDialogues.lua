--[[
	NPCDialogues.lua
	MOLGANG NPC Dialogue System

	NPCs: Direk (tutorial), Prof. Femke (chemistry), Ank (loans), Yuki (mahjong)
]]

local NPCDialogues = {}

-- ═══════════════════════════════════════════════
-- NPC DEFINITIONS
-- ═══════════════════════════════════════════════

NPCDialogues.NPCs = {
	Direk = {
		name = "Direk",
		role = "Tutorial Guide",
		greeting = "Welcome to MOLGANG! I'm Direk, your guide.",
		dialogues = {
			{
				text = "Let me show you the basics...",
				rewards = {molCoins = 50},
			},
			{
				text = "Build your first mine to collect atoms!",
				rewards = {badge = "FirstBuilder"},
			},
			{
				text = "Once you have atoms, combine them into molecules!",
				rewards = {molCoins = 50},
			},
		},
	},

	["Prof. Femke"] = {
		name = "Prof. Femke",
		role = "Chemistry Expert",
		greeting = "Ah, a budding chemist! Let me teach you about elements and molecules.",
		dialogues = {
			{
				text = "Did you know? H2O has 2 hydrogen atoms and 1 oxygen atom.",
				rewards = {molCoins = 25},
			},
			{
				text = "Vanadium (V) is essential for the V2O5 molecule. Very useful!",
				rewards = {molCoins = 25},
			},
			{
				text = "Collecting all 118 elements is the ultimate chemistry challenge.",
				rewards = {badge = "ChemistPath"},
			},
		},
	},

	Ank = {
		name = "Ank",
		role = "Cooperative Lender",
		greeting = "Welcome to ANK Cooperative! Need funding? I can help.",
		dialogues = {
			{
				text = "We offer loans at 5% interest with 120% collateral requirement.",
				rewards = {molCoins = 50},
			},
			{
				text = "The larger the loan, the longer you have to repay.",
				rewards = {molCoins = 25},
			},
			{
				text = "Use loans strategically to scale your operations faster!",
				rewards = {badge = "EntrepreneurPath"},
			},
		},
	},

	Yuki = {
		name = "Yuki",
		role = "Mahjong Master",
		greeting = "Konnichiwa! Want to learn Mahjong? It's a great way to relax.",
		dialogues = {
			{
				text = "Mahjong is a game of strategy, luck, and skill.",
				rewards = {molCoins = 25},
			},
			{
				text = "Winning hands require 4 melds and 1 pair. Good luck!",
				rewards = {molCoins = 25},
			},
			{
				text = "Playing Mahjong wins you bonus MolCoins. Try it!",
				rewards = {badge = "MahjongEnthusiast"},
			},
		},
	},
}

-- ═══════════════════════════════════════════════
-- NPC INTERACTIONS
-- ═══════════════════════════════════════════════

function NPCDialogues.GetNPC(npcName)
	return NPCDialogues.NPCs[npcName]
end

function NPCDialogues.GetGreeting(npcName)
	local npc = NPCDialogues.GetNPC(npcName)
	if npc then
		return npc.greeting
	end
	return "Hello there!"
end

function NPCDialogues.GetDialogues(npcName)
	local npc = NPCDialogues.GetNPC(npcName)
	if npc then
		return npc.dialogues
	end
	return {}
end

function NPCDialogues.GetRandomDialogue(npcName)
	local dialogues = NPCDialogues.GetDialogues(npcName)
	if #dialogues > 0 then
		return dialogues[math.random(#dialogues)]
	end
	return nil
end

-- Quest-aware dialogue: returns context-specific dialogue based on player progress (#85)
function NPCDialogues.GetQuestDialogue(npcName, playerData)
	local npc = NPCDialogues.GetNPC(npcName)
	if not npc then return nil end

	local atomCount = 0
	if playerData and playerData.atoms then
		for _, c in pairs(playerData.atoms) do atomCount = atomCount + c end
	end
	local hasFactory = playerData and playerData.facilities and (playerData.facilities.factories or 0) > 0

	-- Branching dialogues based on progress
	if npcName == "Direk" then
		if atomCount == 0 then
			return {text = "You haven't collected any atoms yet! Walk towards the glowing orbs nearby.", choices = {"Where are they?", "I'll go look!"}}
		elseif atomCount < 10 then
			return {text = "Good job collecting " .. atomCount .. " atoms! Try pressing R to combine them into molecules.", choices = {"How do molecules work?", "Thanks!"}}
		else
			return {text = "You're becoming a real chemist! Have you tried the Slag Processing lab? Press J!", choices = {"Tell me about slag", "I'll try it!"}}
		end
	elseif npcName == "Prof. Femke" then
		if not hasFactory then
			return {text = "To really do chemistry, you'll want a factory. Press G to see the Factory Builder!", choices = {"What equipment do I need?", "How much does it cost?"}}
		else
			return {text = "Excellent factory setup! Try the two-stage leach for maximum V2O5 purity.", choices = {"What's two-stage leach?", "Which reagents?"}}
		end
	end

	return NPCDialogues.GetRandomDialogue(npcName)
end

-- ═══════════════════════════════════════════════
-- TRUST & RELATIONSHIPS
-- ═══════════════════════════════════════════════

function NPCDialogues.CreateNPCData()
	return {
		Direk = {trust = 0, dialoguesRead = 0},
		["Prof. Femke"] = {trust = 0, dialoguesRead = 0},
		Ank = {trust = 0, dialoguesRead = 0},
		Yuki = {trust = 0, dialoguesRead = 0},
	}
end

function NPCDialogues.IncreaseTrust(npcData, npcName, amount)
	if npcData[npcName] then
		npcData[npcName].trust = npcData[npcName].trust + amount
		npcData[npcName].dialoguesRead = npcData[npcName].dialoguesRead + 1
	end
end

return NPCDialogues
