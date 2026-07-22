--[[
	MahjongGame.lua
	Simplified Mahjong minigame for MOLGANG

	MVP: Relaxation/fun minigame with 3 AI opponents
	- 136 tiles (Cantonese standard, no flowers)
	- Simple win detection
	- AI players make random discards
	- Track rounds and wins
]]

local MahjongGame = {}

-- Tile definitions: 34 types x 4 copies = 136 tiles
local TILE_TYPES = {
	-- Characters 1-9 (Cracks)
	"1c", "2c", "3c", "4c", "5c", "6c", "7c", "8c", "9c",
	-- Dots (Balls) 1-9
	"1d", "2d", "3d", "4d", "5d", "6d", "7d", "8d", "9d",
	-- Bamboo 1-9
	"1b", "2b", "3b", "4b", "5b", "6b", "7b", "8b", "9b",
	-- Winds
	"E", "S", "W", "N",  -- East, South, West, North
	-- Dragons
	"Wd", "Gd", "Rd",    -- White, Green, Red dragons
}

-- ═══════════════════════════════════════════════
-- TILE DECK & DEALING
-- ═══════════════════════════════════════════════

function MahjongGame.CreateDeck()
	local deck = {}
	for _, tileType in ipairs(TILE_TYPES) do
		for i = 1, 4 do  -- 4 copies of each tile
			table.insert(deck, tileType)
		end
	end
	-- Shuffle
	for i = #deck, 2, -1 do
		local j = math.random(i)
		deck[i], deck[j] = deck[j], deck[i]
	end
	return deck
end

function MahjongGame.DealHands(deck)
	-- Each player gets 13 tiles, 1 left over (draw next turn)
	local hands = {
		hand1 = {}, -- Player
		hand2 = {}, -- AI 1
		hand3 = {}, -- AI 2
		hand4 = {}, -- AI 3
	}

	local handNames = {"hand1", "hand2", "hand3", "hand4"}
	local tileIdx = 1

	-- Deal 13 tiles per player
	for _ = 1, 13 do
		for _, handName in ipairs(handNames) do
			table.insert(hands[handName], deck[tileIdx])
			tileIdx = tileIdx + 1
		end
	end

	-- Draw pile starts at tileIdx
	return hands, tileIdx
end

-- ═══════════════════════════════════════════════
-- WIN DETECTION (Simplified Cantonese)
-- ═══════════════════════════════════════════════

-- Count occurrences of each tile
local function countTiles(hand)
	local counts = {}
	for _, tile in ipairs(hand) do
		counts[tile] = (counts[tile] or 0) + 1
	end
	return counts
end

-- Check if hand forms a "pung" (3 identical tiles)
local function hasPung(counts, tile)
	return counts[tile] and counts[tile] >= 3
end

-- Check if hand forms a "chow" (3 consecutive tiles of same suit)
local function hasChow(counts, suit)
	-- For simplification: just check if we have 3 consecutive numbers
	local nums = {}
	for tile, count in pairs(counts) do
		if string.sub(tile, -1) == suit then
			local num = tonumber(string.sub(tile, 1, 1))
			if num then nums[num] = (nums[num] or 0) + count end
		end
	end

	for i = 1, 7 do
		if (nums[i] or 0) > 0 and (nums[i+1] or 0) > 0 and (nums[i+2] or 0) > 0 then
			return true
		end
	end
	return false
end

-- Simple win condition: has melds + pair
function MahjongGame.IsWinningHand(hand)
	if #hand ~= 14 then return false end  -- Mahjong hand is 14 tiles (13+1 drawn)

	local counts = countTiles(hand)
	local meldCount = 0

	-- Count visible melds
	for tile, count in pairs(counts) do
		if count >= 3 then meldCount = meldCount + 1 end
	end

	-- Simple rule: 4+ melds + 1 pair = win
	-- (MVP simplified - not full Cantonese rules)
	local pairCount = 0
	for tile, count in pairs(counts) do
		if count >= 2 then pairCount = pairCount + 1 end
	end

	-- Win: player has at least 2 melds and 1 pair
	return meldCount >= 2 and pairCount >= 1
end

-- ═══════════════════════════════════════════════
-- AI PLAYERS
-- ═══════════════════════════════════════════════

local AI_NAMES = {"Ming", "Yuki", "Carlos"}

function MahjongGame.GetAINames()
	return AI_NAMES
end

-- Simple AI: discard random tile
function MahjongGame.AIChooseDiscard(hand)
	if #hand == 0 then return nil end
	return hand[math.random(#hand)]
end

-- Simple AI: try to form melds (simplified)
function MahjongGame.AIChooseKeep(hand, drawnTile)
	-- Just keep the last drawn tile 50% of the time
	if math.random() < 0.5 then
		return drawnTile
	end
	-- Otherwise keep random tile
	return hand[math.random(#hand)]
end

-- ═══════════════════════════════════════════════
-- ROUND MANAGEMENT
-- ═══════════════════════════════════════════════

function MahjongGame.CreateRound()
	local deck = MahjongGame.CreateDeck()
	local hands, drawIdx = MahjongGame.DealHands(deck)

	return {
		deck = deck,
		hands = hands,
		drawIdx = drawIdx,
		currentPlayer = 1,  -- 1=player, 2-4=AI
		discardPile = {},
		winner = nil,
		winnerTile = nil,
		round = 1,
	}
end

-- ═══════════════════════════════════════════════
-- SCORING
-- ═══════════════════════════════════════════════

function MahjongGame.CalculateScore(hand)
	local counts = countTiles(hand)
	local score = 0

	-- 1 point per tile
	score = #hand

	-- 5 point bonus per pung (3 identical)
	for tile, count in pairs(counts) do
		if count >= 3 then
			score = score + 5
		end
	end

	-- 10 point bonus for winning
	if MahjongGame.IsWinningHand(hand) then
		score = score + 10
	end

	return score
end

-- ═══════════════════════════════════════════════
-- GAME STATE
-- ═══════════════════════════════════════════════

function MahjongGame.GetGameStats()
	return {
		totalRounds = 0,
		playerWins = 0,
		aiWins = 0,
		currentRound = 0,
	}
end

return MahjongGame
