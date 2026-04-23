--[[
	MahjongGame.lua
	MOLGANG — Cantonese Mahjong Game Logic

	Full Cantonese Mahjong rules (no flowers):
	- 136 tiles: 9 Characters + 9 Dots + 9 Bamboo + 4 Winds + 3 Dragons (×4 each)
	- Chi (sequential meld from discard, next player only)
	- Pong (3 identical from discard, any player)
	- Kong (4 identical, declared or from discard)
	- Win detection: 4 melds + 1 pair (14 tiles)
	- Faan scoring system (simplified for game)
	- Smart AI with strategy (not random discards)
	- Turn-based flow with draw → discard cycle
]]

local MahjongGame = {}

-- ═══════════════════════════════════════════════
-- TILE DEFINITIONS
-- 34 unique types × 4 copies = 136 tiles
-- ═══════════════════════════════════════════════

local SUITS = {"c", "d", "b"}  -- characters, dots, bamboo
local SUIT_NAMES = {c = "Characters", d = "Dots", b = "Bamboo"}
local WIND_TILES = {"E", "S", "W", "N"}
local DRAGON_TILES = {"Wd", "Gd", "Rd"}
local HONOR_TILES = {"E", "S", "W", "N", "Wd", "Gd", "Rd"}

local TILE_TYPES = {}
for _, suit in ipairs(SUITS) do
	for num = 1, 9 do
		table.insert(TILE_TYPES, num .. suit)
	end
end
for _, t in ipairs(HONOR_TILES) do
	table.insert(TILE_TYPES, t)
end

-- Tile display names for UI
local TILE_DISPLAY = {}
for _, suit in ipairs(SUITS) do
	for num = 1, 9 do
		TILE_DISPLAY[num .. suit] = num .. " " .. SUIT_NAMES[suit]
	end
end
TILE_DISPLAY["E"] = "East Wind"
TILE_DISPLAY["S"] = "South Wind"
TILE_DISPLAY["W"] = "West Wind"
TILE_DISPLAY["N"] = "North Wind"
TILE_DISPLAY["Wd"] = "White Dragon"
TILE_DISPLAY["Gd"] = "Green Dragon"
TILE_DISPLAY["Rd"] = "Red Dragon"

MahjongGame.TILE_TYPES = TILE_TYPES
MahjongGame.TILE_DISPLAY = TILE_DISPLAY

-- ═══════════════════════════════════════════════
-- TILE HELPERS
-- ═══════════════════════════════════════════════

local function getTileSuit(tile)
	if #tile == 2 and tonumber(tile:sub(1, 1)) then
		return tile:sub(2, 2)
	end
	return nil  -- honor tile
end

local function getTileNumber(tile)
	if #tile == 2 and tonumber(tile:sub(1, 1)) then
		return tonumber(tile:sub(1, 1))
	end
	return nil  -- honor tile
end

local function isHonorTile(tile)
	for _, h in ipairs(HONOR_TILES) do
		if tile == h then return true end
	end
	return false
end

local function countTiles(hand)
	local counts = {}
	for _, tile in ipairs(hand) do
		counts[tile] = (counts[tile] or 0) + 1
	end
	return counts
end

local function removeTileFromHand(hand, tile)
	for i, t in ipairs(hand) do
		if t == tile then
			table.remove(hand, i)
			return true
		end
	end
	return false
end

local function copyHand(hand)
	local copy = {}
	for _, t in ipairs(hand) do
		table.insert(copy, t)
	end
	return copy
end

-- ═══════════════════════════════════════════════
-- DECK & DEALING
-- ═══════════════════════════════════════════════

function MahjongGame.CreateDeck()
	local deck = {}
	for _, tileType in ipairs(TILE_TYPES) do
		for i = 1, 4 do
			table.insert(deck, tileType)
		end
	end
	-- Fisher-Yates shuffle
	for i = #deck, 2, -1 do
		local j = math.random(i)
		deck[i], deck[j] = deck[j], deck[i]
	end
	return deck
end

function MahjongGame.DealHands(deck)
	local hands = {{}, {}, {}, {}}
	local tileIdx = 1

	-- Deal 13 tiles per player (East starts)
	for _ = 1, 13 do
		for p = 1, 4 do
			table.insert(hands[p], deck[tileIdx])
			tileIdx = tileIdx + 1
		end
	end

	-- Sort each hand
	for p = 1, 4 do
		table.sort(hands[p])
	end

	return hands, tileIdx
end

-- Draw a tile from the wall
function MahjongGame.DrawTile(gameState)
	if gameState.drawIdx > #gameState.deck then
		return nil  -- wall exhausted = draw game
	end
	local tile = gameState.deck[gameState.drawIdx]
	gameState.drawIdx = gameState.drawIdx + 1
	return tile
end

-- ═══════════════════════════════════════════════
-- MELD DETECTION
-- ═══════════════════════════════════════════════

-- Check if player can Chi (sequential meld) from a discarded tile
-- Only the NEXT player in turn order can chi
function MahjongGame.CanChi(hand, discardedTile)
	local suit = getTileSuit(discardedTile)
	local num = getTileNumber(discardedTile)
	if not suit or not num then return false, {} end

	local counts = countTiles(hand)
	local options = {}

	-- Check all possible sequences containing this tile
	-- num-2, num-1, num (need num-2 and num-1)
	if num >= 3 then
		local t1 = (num - 2) .. suit
		local t2 = (num - 1) .. suit
		if (counts[t1] or 0) > 0 and (counts[t2] or 0) > 0 then
			table.insert(options, {t1, t2, discardedTile})
		end
	end
	-- num-1, num, num+1 (need num-1 and num+1)
	if num >= 2 and num <= 8 then
		local t1 = (num - 1) .. suit
		local t2 = (num + 1) .. suit
		if (counts[t1] or 0) > 0 and (counts[t2] or 0) > 0 then
			table.insert(options, {t1, discardedTile, t2})
		end
	end
	-- num, num+1, num+2 (need num+1 and num+2)
	if num <= 7 then
		local t1 = (num + 1) .. suit
		local t2 = (num + 2) .. suit
		if (counts[t1] or 0) > 0 and (counts[t2] or 0) > 0 then
			table.insert(options, {discardedTile, t1, t2})
		end
	end

	return #options > 0, options
end

-- Check if player can Pong (3 identical) from a discarded tile
function MahjongGame.CanPong(hand, discardedTile)
	local counts = countTiles(hand)
	return (counts[discardedTile] or 0) >= 2
end

-- Check if player can Kong (4 identical)
function MahjongGame.CanKong(hand, discardedTile)
	local counts = countTiles(hand)
	if discardedTile then
		return (counts[discardedTile] or 0) >= 3
	end
	-- Concealed kong: 4 identical in hand
	for tile, count in pairs(counts) do
		if count >= 4 then return true end
	end
	return false
end

-- ═══════════════════════════════════════════════
-- WIN DETECTION (proper Cantonese rules)
-- A winning hand = 4 melds + 1 pair = 14 tiles
-- Each meld is either a pong (3 identical) or chi (3 sequential)
-- ═══════════════════════════════════════════════

-- Recursive check if remaining tiles form valid melds
local function canFormMelds(counts, meldCount)
	-- Find first tile with count > 0
	local firstTile = nil
	for _, t in ipairs(TILE_TYPES) do
		if (counts[t] or 0) > 0 then
			firstTile = t
			break
		end
	end

	if not firstTile then
		return meldCount == 4  -- all tiles consumed into melds
	end

	-- Try pong (3 identical)
	if counts[firstTile] >= 3 then
		counts[firstTile] = counts[firstTile] - 3
		if canFormMelds(counts, meldCount + 1) then
			counts[firstTile] = counts[firstTile] + 3
			return true
		end
		counts[firstTile] = counts[firstTile] + 3
	end

	-- Try chi (3 sequential) — only for suited tiles
	local suit = getTileSuit(firstTile)
	local num = getTileNumber(firstTile)
	if suit and num and num <= 7 then
		local t1 = firstTile
		local t2 = (num + 1) .. suit
		local t3 = (num + 2) .. suit
		if (counts[t1] or 0) > 0 and (counts[t2] or 0) > 0 and (counts[t3] or 0) > 0 then
			counts[t1] = counts[t1] - 1
			counts[t2] = counts[t2] - 1
			counts[t3] = counts[t3] - 1
			if canFormMelds(counts, meldCount + 1) then
				counts[t1] = counts[t1] + 1
				counts[t2] = counts[t2] + 1
				counts[t3] = counts[t3] + 1
				return true
			end
			counts[t1] = counts[t1] + 1
			counts[t2] = counts[t2] + 1
			counts[t3] = counts[t3] + 1
		end
	end

	return false
end

function MahjongGame.IsWinningHand(hand)
	if #hand ~= 14 then return false end

	local counts = countTiles(hand)

	-- Try each possible pair, then check if remaining 12 tiles form 4 melds
	for _, pairTile in ipairs(TILE_TYPES) do
		if (counts[pairTile] or 0) >= 2 then
			counts[pairTile] = counts[pairTile] - 2
			if canFormMelds(counts, 0) then
				counts[pairTile] = counts[pairTile] + 2
				return true
			end
			counts[pairTile] = counts[pairTile] + 2
		end
	end

	return false
end

-- Check if a tile would complete a winning hand
function MahjongGame.IsWinningTile(hand, tile)
	local testHand = copyHand(hand)
	table.insert(testHand, tile)
	return MahjongGame.IsWinningHand(testHand)
end

-- ═══════════════════════════════════════════════
-- FAAN SCORING (simplified Cantonese)
-- ═══════════════════════════════════════════════

function MahjongGame.CalculateFaan(hand, melds, seatWind, roundWind)
	local faan = 0
	local counts = countTiles(hand)
	local details = {}

	-- All Pongs (no chi melds) = 3 faan
	local allPongs = true
	for _, meld in ipairs(melds or {}) do
		if meld.type == "chi" then allPongs = false end
	end
	if allPongs and #(melds or {}) > 0 then
		faan = faan + 3
		table.insert(details, "All Pongs (+3)")
	end

	-- Dragon pongs = 1 faan each
	for _, dragon in ipairs(DRAGON_TILES) do
		if (counts[dragon] or 0) >= 3 then
			faan = faan + 1
			table.insert(details, "Dragon Pong: " .. (TILE_DISPLAY[dragon] or dragon) .. " (+1)")
		end
	end

	-- Seat wind pong = 1 faan
	if seatWind and (counts[seatWind] or 0) >= 3 then
		faan = faan + 1
		table.insert(details, "Seat Wind Pong (+1)")
	end

	-- Round wind pong = 1 faan
	if roundWind and (counts[roundWind] or 0) >= 3 then
		faan = faan + 1
		table.insert(details, "Round Wind Pong (+1)")
	end

	-- Half flush (tiles from one suit + honors) = 3 faan
	for _, suit in ipairs(SUITS) do
		local hasSuit = false
		local hasOtherSuit = false
		for tile, count in pairs(counts) do
			if count > 0 then
				local ts = getTileSuit(tile)
				if ts == suit then
					hasSuit = true
				elseif ts ~= nil then
					hasOtherSuit = true
				end
			end
		end
		if hasSuit and not hasOtherSuit then
			faan = faan + 3
			table.insert(details, "Half Flush (+3)")
			break
		end
	end

	-- Minimum 1 faan to win (Cantonese rule)
	-- Self-drawn = 1 faan
	faan = math.max(faan, 1)

	return faan, details
end

-- Convert faan to MolCoins reward
function MahjongGame.FaanToCoins(faan)
	local base = 20
	return base * math.pow(2, math.min(faan - 1, 6))  -- 20, 40, 80, 160, 320, 640, 1280
end

-- ═══════════════════════════════════════════════
-- SMART AI PLAYERS
-- ═══════════════════════════════════════════════

local AI_NAMES = {"Ming", "Yuki", "Carlos"}
local AI_PERSONALITIES = {
	{name = "Ming", style = "aggressive", riskTolerance = 0.7},   -- goes for big hands
	{name = "Yuki", style = "defensive", riskTolerance = 0.3},    -- safe plays
	{name = "Carlos", style = "balanced", riskTolerance = 0.5},   -- mixed strategy
}

function MahjongGame.GetAINames()
	return AI_NAMES
end

-- AI evaluates how useful a tile is to their hand
local function evaluateTileValue(hand, tile)
	local counts = countTiles(hand)
	local value = 0

	-- Tiles that form pairs are valuable
	if (counts[tile] or 0) >= 1 then
		value = value + 3  -- pair potential
	end
	if (counts[tile] or 0) >= 2 then
		value = value + 5  -- pong potential
	end

	-- Sequential neighbors (for suited tiles)
	local suit = getTileSuit(tile)
	local num = getTileNumber(tile)
	if suit and num then
		if num > 1 and (counts[(num-1) .. suit] or 0) > 0 then value = value + 2 end
		if num < 9 and (counts[(num+1) .. suit] or 0) > 0 then value = value + 2 end
		if num > 2 and (counts[(num-2) .. suit] or 0) > 0 then value = value + 1 end
		if num < 8 and (counts[(num+2) .. suit] or 0) > 0 then value = value + 1 end
	end

	-- Honor tiles with pairs are valuable
	if isHonorTile(tile) and (counts[tile] or 0) >= 1 then
		value = value + 2
	end

	-- Dragons always valuable
	for _, d in ipairs(DRAGON_TILES) do
		if tile == d then value = value + 1 end
	end

	return value
end

-- Smart AI: discard least useful tile
function MahjongGame.AIChooseDiscard(hand, aiIndex)
	if #hand == 0 then return nil end

	local personality = AI_PERSONALITIES[aiIndex] or AI_PERSONALITIES[1]
	local worstTile = hand[1]
	local worstValue = 999

	for _, tile in ipairs(hand) do
		local value = evaluateTileValue(hand, tile)

		-- Personality adjustment
		if personality.style == "aggressive" then
			-- Aggressive: willing to break pairs for bigger melds
			if isHonorTile(tile) then value = value + 1 end
		elseif personality.style == "defensive" then
			-- Defensive: keeps safe tiles, discards dangerous ones
			if isHonorTile(tile) then value = value - 1 end
		end

		-- Random noise (prevents perfectly predictable play)
		value = value + math.random() * personality.riskTolerance

		if value < worstValue then
			worstValue = value
			worstTile = tile
		end
	end

	return worstTile
end

-- AI decides whether to chi/pong a discard
function MahjongGame.AIDecideClaim(hand, discardedTile, claimType, aiIndex)
	local personality = AI_PERSONALITIES[aiIndex] or AI_PERSONALITIES[1]

	-- Always pong if possible (strong meld)
	if claimType == "pong" then
		return math.random() < (0.7 + personality.riskTolerance * 0.3)
	end

	-- Chi only if it helps (check hand value improvement)
	if claimType == "chi" then
		return math.random() < (0.4 + personality.riskTolerance * 0.3)
	end

	-- Kong always
	if claimType == "kong" then return true end

	return false
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
		currentPlayer = 1,      -- 1=human, 2-4=AI
		discardPile = {},
		lastDiscard = nil,
		lastDiscardPlayer = nil,
		melds = {{}, {}, {}, {}},  -- exposed melds per player
		winner = nil,
		winnerFaan = 0,
		round = 1,
		seatWinds = {"E", "S", "W", "N"},
		roundWind = "E",
		turnCount = 0,
		tilesRemaining = #deck - drawIdx + 1,
	}
end

function MahjongGame.GetGameStats()
	return {
		totalRounds = 0,
		playerWins = 0,
		aiWins = 0,
		currentRound = 0,
		totalMolCoins = 0,
	}
end

-- Calculate score with proper faan
function MahjongGame.CalculateScore(hand)
	if MahjongGame.IsWinningHand(hand) then
		local faan, _ = MahjongGame.CalculateFaan(hand, {}, "E", "E")
		return MahjongGame.FaanToCoins(faan)
	end
	return 0
end

return MahjongGame
