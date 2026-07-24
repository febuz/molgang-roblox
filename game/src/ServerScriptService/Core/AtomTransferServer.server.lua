-- Server-side player-to-player atom transfer.
-- The client may request a symbol and target, but never controls the amount or
-- either inventory. Transfers are limited to nearby, currently loaded players.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local Elements = require(ReplicatedStorage.Data.Elements)
local InventoryLimits = require(ReplicatedStorage.Modules.InventoryLimits)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)

local TRANSFER_RANGE = 50
local TRANSFER_COOLDOWN = 0.5
local lastTransferAt = {}

local function announce(player, message, rarity)
	Remotes.FireClient("ServerAnnounce", player, {
		message = message,
		rarity = rarity or "common",
	})
end

local function findPlayer(userId)
	if type(userId) ~= "number" or userId ~= math.floor(userId) then return nil end
	return Players:GetPlayerByUserId(userId)
end

Remotes.RequestAtomTransfer.OnServerEvent:Connect(function(sender, targetUserId, symbol)
	local now = os.clock()
	if now - (lastTransferAt[sender.UserId] or 0) < TRANSFER_COOLDOWN then
		return
	end
	lastTransferAt[sender.UserId] = now

	local target = findPlayer(targetUserId)
	if not target or target == sender then
		announce(sender, "Transfer failed: choose another online player.", "common")
		return
	end
	if type(symbol) ~= "string" or #symbol > 3 or not Elements.GetBySymbol(symbol) then
		announce(sender, "Transfer failed: unknown atom.", "common")
		return
	end

	local senderCharacter = sender.Character
	local targetCharacter = target.Character
	local senderRoot = senderCharacter and senderCharacter:FindFirstChild("HumanoidRootPart")
	local targetRoot = targetCharacter and targetCharacter:FindFirstChild("HumanoidRootPart")
	if not senderRoot or not targetRoot or (senderRoot.Position - targetRoot.Position).Magnitude > TRANSFER_RANGE then
		announce(sender, "Transfer failed: player is too far away.", "common")
		return
	end

	local senderData = PlayerDataBridge.GetPlayerData(sender.UserId)
	local targetData = PlayerDataBridge.GetPlayerData(target.UserId)
	if not senderData or not targetData then
		announce(sender, "Transfer failed: player data is still loading.", "common")
		return
	end
	senderData.atoms = senderData.atoms or {}
	targetData.atoms = targetData.atoms or {}
	if (senderData.atoms[symbol] or 0) < 1 then
		announce(sender, "Transfer failed: you do not own that atom.", "common")
		return
	end
	if not InventoryLimits.CanAddAtoms(targetData.atoms, targetData.facilities, 1) then
		announce(sender, "Transfer failed: recipient atom storage is full.", "common")
		return
	end

	senderData.atoms[symbol] = senderData.atoms[symbol] - 1
	targetData.atoms[symbol] = (targetData.atoms[symbol] or 0) + 1
	announce(sender, "Sent 1x " .. symbol .. " to " .. target.Name .. ".", "good")
	announce(target, "Received 1x " .. symbol .. " from " .. sender.Name .. ".", "good")
end)

Players.PlayerRemoving:Connect(function(player)
	lastTransferAt[player.UserId] = nil
end)
