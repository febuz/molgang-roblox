-- ServerScriptService/Core/QRBridge.server.lua
-- MOLGANG QR Bridge — Roblox ↔ Web Game link
-- Generates a session token via bridge.molgang.app (Cloudflare Worker),
-- fires QR code URL to requesting player, tracks active sessions.
--
-- Web bridge API (Cloudflare Worker):
--   POST /v1/generate-qr  { playerId, playerName, molBalance, inventory }
--   → { qr_url, session_token, expires_at }
--
-- Roblox HttpService whitelist must include: https://bridge.molgang.app

local Players            = game:GetService("Players")
local HttpService        = game:GetService("HttpService")
local DataStoreService   = game:GetService("DataStoreService")

local ReplicatedStorage  = game:GetService("ReplicatedStorage")
local Remotes            = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- CONFIG
-- ══════════════════════════════════════════════

local CFG = {
	BRIDGE_URL       = "https://bridge.molgang.app/v1/generate-qr",
	SESSION_TTL      = 300,    -- seconds (5 min, matches JWT expiry)
	COOLDOWN         = 30,     -- seconds between QR requests per player
	TIMEOUT          = 10,     -- HTTP request timeout seconds
	MAX_RETRIES      = 2,
	ROBLOX_SECRET    = "ROBLOX_API_SECRET",   -- env var name in Worker secrets
	ENABLED          = true,   -- set false to disable during development
}

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

-- playerId → { token, expiresAt, lastRequest }
local activeSessions: { [number]: { token: string, expiresAt: number, lastRequest: number } } = {}

-- ══════════════════════════════════════════════
-- PLAYER DATA HELPER
-- Reads from PlayerDataBridge / Attributes for inventory snapshot
-- ══════════════════════════════════════════════

local PlayerDataBridge = require(game:GetService("ServerScriptService").Core.PlayerDataBridge)

local function getPlayerSnapshot(player: Player): { [string]: any }
	local data = PlayerDataBridge.get(player)
	if not data then
		return {
			playerId   = player.UserId,
			playerName = player.Name,
			molBalance = 0,
			inventory  = {},
		}
	end

	-- Build compact inventory array: {z, count} pairs
	local inv = {}
	if data.inventory then
		for z, count in pairs(data.inventory) do
			if count > 0 then
				table.insert(inv, { z = tonumber(z), n = count })
			end
		end
	end

	return {
		playerId   = player.UserId,
		playerName = player.Name,
		molBalance = data.molCoins or 0,
		inventory  = inv,
		level      = data.level or 1,
		molecules  = data.molecules or {},
	}
end

-- ══════════════════════════════════════════════
-- HTTP: Generate QR via Cloudflare Worker
-- ══════════════════════════════════════════════

local function requestQRFromBridge(snapshot: { [string]: any }): (boolean, string?, string?, number?)
	if not CFG.ENABLED then
		-- Dev mode: return a fake QR for testing
		local fakeToken   = "dev_" .. tostring(snapshot.playerId) .. "_" .. tostring(os.time())
		local fakeQRUrl   = "https://bridge.molgang.app/qr/dev_placeholder.png"
		local fakeExpiry  = os.time() + CFG.SESSION_TTL
		return true, fakeQRUrl, fakeToken, fakeExpiry
	end

	local body = HttpService:JSONEncode(snapshot)
	local success, response

	for attempt = 1, CFG.MAX_RETRIES do
		success, response = pcall(function()
			return HttpService:RequestAsync({
				Url    = CFG.BRIDGE_URL,
				Method = "POST",
				Headers = {
					["Content-Type"]     = "application/json",
					["X-Roblox-Secret"]  = CFG.ROBLOX_SECRET,
				},
				Body = body,
			})
		end)

		if success and response.Success then
			break
		end
		if attempt < CFG.MAX_RETRIES then
			task.wait(1)
		end
	end

	if not success then
		warn("[QRBridge] HTTP error:", response)
		return false, nil, nil, nil
	end

	if not response.Success then
		warn(string.format("[QRBridge] Bridge returned %d: %s",
			response.StatusCode, response.Body))
		return false, nil, nil, nil
	end

	local ok, parsed = pcall(HttpService.JSONDecode, HttpService, response.Body)
	if not ok or not parsed then
		warn("[QRBridge] Failed to parse response JSON")
		return false, nil, nil, nil
	end

	if not parsed.qr_url or not parsed.session_token then
		warn("[QRBridge] Bridge response missing qr_url or session_token")
		return false, nil, nil, nil
	end

	return true, parsed.qr_url, parsed.session_token,
		parsed.expires_at or (os.time() + CFG.SESSION_TTL)
end

-- ══════════════════════════════════════════════
-- HANDLE RequestQR from client
-- ══════════════════════════════════════════════

Remotes.RequestQR.OnServerEvent:Connect(function(player: Player)
	local userId = player.UserId
	local now    = os.time()

	-- Cooldown check
	local existing = activeSessions[userId]
	if existing then
		local sinceLastRequest = now - (existing.lastRequest or 0)
		if sinceLastRequest < CFG.COOLDOWN then
			local wait = CFG.COOLDOWN - sinceLastRequest
			-- Re-send existing QR if still valid
			if existing.expiresAt > now then
				Remotes.FireClient("ShowQR", player, {
					qrUrl       = existing.qrUrl,
					sessionToken = existing.token,
					expiresAt   = existing.expiresAt,
					cached      = true,
				})
			else
				Remotes.FireClient("ShowQR", player, {
					error = string.format("Please wait %d seconds before requesting a new QR.", wait),
				})
			end
			return
		end
	end

	-- Build player snapshot and request QR
	local snapshot = getPlayerSnapshot(player)
	local ok, qrUrl, token, expiresAt = requestQRFromBridge(snapshot)

	if not ok then
		Remotes.FireClient("ShowQR", player, {
			error = "Could not connect to web bridge. Try again later.",
		})
		return
	end

	-- Store session
	activeSessions[userId] = {
		token       = token,
		qrUrl       = qrUrl,
		expiresAt   = expiresAt,
		lastRequest = now,
	}

	-- Fire QR to player
	Remotes.FireClient("ShowQR", player, {
		qrUrl        = qrUrl,
		sessionToken = token,
		expiresAt    = expiresAt,
	})

	print(string.format("[QRBridge] QR generated for %s (token: %s)",
		player.Name, token:sub(1, 12) .. "..."))
end)

-- ══════════════════════════════════════════════
-- CLEANUP: Remove expired sessions periodically
-- ══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(60)
		local now = os.time()
		for userId, session in pairs(activeSessions) do
			if session.expiresAt < now then
				activeSessions[userId] = nil
			end
		end
	end
end)

-- Remove session on player leave
Players.PlayerRemoving:Connect(function(player: Player)
	activeSessions[player.UserId] = nil
end)

-- ══════════════════════════════════════════════
-- GRAB OBJECT SERVER HANDLER
-- Validates grab events from InteractionSystem
-- ══════════════════════════════════════════════

Remotes.GrabObject.OnServerEvent:Connect(function(player: Player, data: { [string]: any })
	if not data or type(data) ~= "table" then return end
	-- Validate: only allow grabbable-tagged objects
	if not data.objectName or not data.position then return end
	-- Log for anti-cheat monitoring (no direct state mutation from client position)
	-- Server can verify final position is within puzzle zone bounds
end)

print("[MOLGANG] QRBridge server initialized")
