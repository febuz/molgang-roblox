--[[
	BubbleTeaBar.server.lua
	MOLGANG — Bubble Tea Bar at Factory Cafe

	6 drinks with gameplay buffs:
	1. Matcha Latte      — +20% move speed (2 min)
	2. Taro Milk Tea     — +50% atom collect range (2 min)
	3. Classic Boba      — +25% MolCoin earnings (3 min)
	4. Mango Smoothie    — +30% quiz accuracy hint (2 min)
	5. Brown Sugar Pearl — +40% production speed (3 min)
	6. Lychee Fizz       — +15% rare element chance (2 min)

	Players get a visible cup accessory in their hand.
	Drinks cost MolCoins and have a cooldown.
	Server-authoritative: buffs are tracked server-side.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local SeasonalDrinks = require(ReplicatedStorage.Modules.GameObjects.SeasonalDrinks)
local Achievements = require(ReplicatedStorage.Modules.GameObjects.Achievements)
local RarityTrait = require(ReplicatedStorage.Modules.GameObjects.RarityTrait)

-- ═══════════════════════════════════════════════
-- DRINK DEFINITIONS
-- ═══════════════════════════════════════════════

local DRINKS = {
	{
		id = "matcha",
		name = "Matcha Latte",
		color = Color3.fromRGB(100, 180, 80),
		cost = 30,
		buffType = "speed",
		buffValue = 1.2,           -- 20% speed boost
		buffDuration = 120,        -- seconds
		description = "+20% Move Speed (2 min)",
		cupColor = Color3.fromRGB(130, 200, 100),
	},
	{
		id = "taro",
		name = "Taro Milk Tea",
		color = Color3.fromRGB(160, 100, 200),
		cost = 40,
		buffType = "collectRange",
		buffValue = 1.5,           -- 50% more range
		buffDuration = 120,
		description = "+50% Atom Collect Range (2 min)",
		cupColor = Color3.fromRGB(180, 120, 220),
	},
	{
		id = "classic",
		name = "Classic Boba",
		color = Color3.fromRGB(140, 100, 60),
		cost = 25,
		buffType = "coinBonus",
		buffValue = 1.25,          -- 25% more MolCoins
		buffDuration = 180,
		description = "+25% MolCoin Earnings (3 min)",
		cupColor = Color3.fromRGB(160, 120, 80),
	},
	{
		id = "mango",
		name = "Mango Smoothie",
		color = Color3.fromRGB(255, 180, 40),
		cost = 35,
		buffType = "quizHint",
		buffValue = 1.3,
		buffDuration = 120,
		description = "+30% Quiz Accuracy Hint (2 min)",
		cupColor = Color3.fromRGB(255, 200, 60),
	},
	{
		id = "brownSugar",
		name = "Brown Sugar Pearl",
		color = Color3.fromRGB(120, 70, 30),
		cost = 50,
		buffType = "production",
		buffValue = 1.4,           -- 40% faster production
		buffDuration = 180,
		description = "+40% Production Speed (3 min)",
		cupColor = Color3.fromRGB(140, 90, 50),
	},
	{
		id = "lychee",
		name = "Lychee Fizz",
		color = Color3.fromRGB(255, 200, 200),
		cost = 60,
		buffType = "rarity",
		buffValue = 1.15,          -- 15% more rare spawns
		buffDuration = 120,
		description = "+15% Rare Element Chance (2 min)",
		cupColor = Color3.fromRGB(255, 220, 220),
	},
}

-- Rarity tier per permanent drink (molgang-roblox#11) — computed via the
-- shared RarityTrait module rather than a hardcoded per-drink value, so it
-- stays consistent with the seasonal drinks' rarity below.
for _, drink in ipairs(DRINKS) do
	drink.rarity = RarityTrait.ComputeTier(drink.cost, drink.buffValue)
end

-- ═══════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════

local playerBuffs = {}       -- {userId = {buffType = {value, expireTime}}}
local playerCooldowns = {}   -- {userId = lastDrinkTime}
local DRINK_COOLDOWN = 10    -- seconds between drinks

-- Bar location (factory cafe)
local BAR_POSITION = Vector3.new(-1900, 12, 50)
local BAR_RANGE = 20         -- studs to interact

-- ═══════════════════════════════════════════════
-- CUP ACCESSORY (visible in hand)
-- ═══════════════════════════════════════════════

-- Rarity-driven cup glow (molgang-roblox#11 remainder / GP216) — keyed by
-- the same tier vocabulary RarityTrait.TIER_ORDER produces, so any drink's
-- computed `rarity` field maps straight onto a visual without a separate
-- name list to keep in sync.
local RARITY_GLOW = {
	Common = { brightness = 0.8, range = 4, sparkle = false },
	Uncommon = { brightness = 1.0, range = 5, sparkle = false },
	Rare = { brightness = 1.3, range = 6, sparkle = false },
	Epic = { brightness = 1.7, range = 7, sparkle = true },
	Legendary = { brightness = 2.2, range = 9, sparkle = true },
}

local function giveCupAccessory(player, drink)
	local character = player.Character
	if not character then return end

	-- Remove existing cup
	local existingCup = character:FindFirstChild("BobaCup")
	if existingCup then existingCup:Destroy() end

	-- Create cup model
	local cup = Instance.new("Part")
	cup.Name = "BobaCup"
	cup.Size = Vector3.new(0.8, 1.4, 0.8)
	cup.Color = drink.cupColor
	cup.Material = Enum.Material.SmoothPlastic
	cup.Transparency = 0.15
	cup.CanCollide = false
	cup.Massless = true

	-- Cup lid (darker top)
	local lid = Instance.new("Part")
	lid.Name = "Lid"
	lid.Size = Vector3.new(0.9, 0.15, 0.9)
	lid.Color = Color3.fromRGB(40, 40, 45)
	lid.Material = Enum.Material.SmoothPlastic
	lid.CanCollide = false
	lid.Massless = true

	-- Straw
	local straw = Instance.new("Part")
	straw.Name = "Straw"
	straw.Size = Vector3.new(0.1, 1.8, 0.1)
	straw.Color = Color3.fromRGB(0, 200, 120)
	straw.Material = Enum.Material.SmoothPlastic
	straw.CanCollide = false
	straw.Massless = true

	-- Weld cup to right hand
	local rightHand = character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
	if not rightHand then return end

	cup.CFrame = rightHand.CFrame * CFrame.new(0, -0.5, -0.3)
	cup.Parent = character

	local weld = Instance.new("WeldConstraint")
	weld.Part0 = rightHand
	weld.Part1 = cup
	weld.Parent = cup

	-- Attach lid to cup
	lid.CFrame = cup.CFrame * CFrame.new(0, 0.75, 0)
	lid.Parent = character
	local lidWeld = Instance.new("WeldConstraint")
	lidWeld.Part0 = cup
	lidWeld.Part1 = lid
	lidWeld.Parent = lid

	-- Attach straw to lid
	straw.CFrame = lid.CFrame * CFrame.new(0.15, 0.9, 0)
	straw.Parent = character
	local strawWeld = Instance.new("WeldConstraint")
	strawWeld.Part0 = lid
	strawWeld.Part1 = straw
	strawWeld.Parent = straw

	-- Boba pearls (small dark spheres inside cup)
	for i = 1, 4 do
		local pearl = Instance.new("Part")
		pearl.Name = "BobaPearl_" .. i
		pearl.Shape = Enum.PartType.Ball
		pearl.Size = Vector3.new(0.15, 0.15, 0.15)
		pearl.Color = Color3.fromRGB(30, 20, 15)
		pearl.Material = Enum.Material.SmoothPlastic
		pearl.CanCollide = false
		pearl.Massless = true
		pearl.CFrame = cup.CFrame * CFrame.new(
			(math.random() - 0.5) * 0.4,
			-0.4 + i * 0.1,
			(math.random() - 0.5) * 0.4
		)
		pearl.Parent = character
		local pearlWeld = Instance.new("WeldConstraint")
		pearlWeld.Part0 = cup
		pearlWeld.Part1 = pearl
		pearlWeld.Parent = pearl
	end

	-- Neon glow on cup (buff color), scaled by rarity tier
	local glow = RARITY_GLOW[drink.rarity] or RARITY_GLOW.Common
	local light = Instance.new("PointLight")
	light.Color = drink.color
	light.Brightness = glow.brightness
	light.Range = glow.range
	light.Parent = cup

	-- Epic/Legendary drinks get a sparkle flourish on the cup
	if glow.sparkle then
		local sparkle = Instance.new("ParticleEmitter")
		sparkle.Color = ColorSequence.new(drink.color)
		sparkle.Size = NumberSequence.new(0.08)
		sparkle.Lifetime = NumberRange.new(0.4, 0.8)
		sparkle.Rate = 8
		sparkle.Speed = NumberRange.new(0.5, 1)
		sparkle.SpreadAngle = Vector2.new(180, 180)
		sparkle.Parent = cup
	end

	-- Billboard showing drink name above cup
	local bill = Instance.new("BillboardGui")
	bill.Size = UDim2.fromOffset(80, 20)
	bill.StudsOffset = Vector3.new(0, 1.5, 0)
	bill.AlwaysOnTop = false
	bill.MaxDistance = 20
	bill.Parent = cup

	local drinkLabel = Instance.new("TextLabel")
	drinkLabel.Size = UDim2.fromScale(1, 1)
	drinkLabel.BackgroundTransparency = 1
	drinkLabel.Text = drink.name
	drinkLabel.TextColor3 = drink.color
	drinkLabel.TextScaled = true
	drinkLabel.Font = Enum.Font.GothamBold
	drinkLabel.TextStrokeTransparency = 0.5
	drinkLabel.Parent = bill

	-- Remove cup when buff expires
	task.delay(drink.buffDuration, function()
		if cup and cup.Parent then
			cup:Destroy()
		end
		if lid and lid.Parent then lid:Destroy() end
		if straw and straw.Parent then straw:Destroy() end
		-- Clean up pearls
		if character then
			for _, child in character:GetChildren() do
				if child.Name:find("BobaPearl") then
					child:Destroy()
				end
			end
		end
	end)
end

-- ═══════════════════════════════════════════════
-- BUFF MANAGEMENT
-- ═══════════════════════════════════════════════

local function applyBuff(userId, buffType, buffValue, duration)
	if not playerBuffs[userId] then
		playerBuffs[userId] = {}
	end
	playerBuffs[userId][buffType] = {
		value = buffValue,
		expireTime = tick() + duration,
	}

	-- Apply speed buff to character
	if buffType == "speed" then
		local player = Players:GetPlayerByUserId(userId)
		if player and player.Character then
			local humanoid = player.Character:FindFirstChild("Humanoid")
			if humanoid then
				humanoid.WalkSpeed = 16 * buffValue  -- default is 16
				task.delay(duration, function()
					if humanoid and humanoid.Parent then
						humanoid.WalkSpeed = 16
					end
				end)
			end
		end
	end
end

-- Public function for other scripts to check buffs
function GetPlayerBuff(userId, buffType)
	local buffs = playerBuffs[userId]
	if not buffs then return 1.0 end
	local buff = buffs[buffType]
	if not buff then return 1.0 end
	if tick() > buff.expireTime then
		buffs[buffType] = nil
		return 1.0
	end
	return buff.value
end

-- Make accessible to other server scripts
_G.GetPlayerBuff = GetPlayerBuff

-- ═══════════════════════════════════════════════
-- DRINK PURCHASE HANDLER
-- ═══════════════════════════════════════════════

Remotes.RequestBuyDrink.OnServerEvent:Connect(function(player, drinkId)
	local userId = player.UserId

	-- Validate drink
	if type(drinkId) ~= "string" then return end
	local drink = nil
	for _, d in ipairs(DRINKS) do
		if d.id == drinkId then
			drink = d
			break
		end
	end
	if not drink then return end

	-- Proximity check
	local character = player.Character
	if character then
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if hrp and (hrp.Position - BAR_POSITION).Magnitude > BAR_RANGE then
			Remotes.FireClient("ServerAnnounce", player, {
				message = "Move closer to the Bubble Tea Bar!",
				rarity = "common",
			})
			return
		end
	end

	-- Cooldown check
	local lastDrink = playerCooldowns[userId]
	if lastDrink and (tick() - lastDrink) < DRINK_COOLDOWN then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Wait " .. math.ceil(DRINK_COOLDOWN - (tick() - lastDrink)) .. "s before ordering again.",
			rarity = "common",
		})
		return
	end

	-- Deduct cost
	local success = PlayerDataBridge.SpendMolCoins(userId, drink.cost)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = drink.name .. " costs " .. drink.cost .. " MolCoins.",
			rarity = "common",
		})
		return
	end

	-- Apply buff
	playerCooldowns[userId] = tick()
	applyBuff(userId, drink.buffType, drink.buffValue, drink.buffDuration)

	-- Purchase-count achievements (molgang-roblox#9)
	local previousPurchaseCount = PlayerDataBridge.GetDrinkPurchaseCount(userId)
	local newPurchaseCount = PlayerDataBridge.RecordDrinkPurchase(userId)
	for _, badge in ipairs(Achievements.CheckNewlyUnlocked(previousPurchaseCount, newPurchaseCount)) do
		PlayerDataBridge.AddMolCoins(userId, badge.molCoinsReward)
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Achievement unlocked: " .. badge.name .. "! +" .. badge.molCoinsReward .. " MolCoins",
			rarity = "rare",
		})
	end

	-- Give cup accessory
	giveCupAccessory(player, drink)

	-- Notify
	Remotes.FireClient("DrinkPurchased", player, {
		drinkId = drink.id,
		name = drink.name,
		buffType = drink.buffType,
		buffDescription = drink.description,
		duration = drink.buffDuration,
		color = {drink.color.R * 255, drink.color.G * 255, drink.color.B * 255},
	})

	Remotes.FireClient("ServerAnnounce", player, {
		message = "Ordered " .. drink.name .. "! " .. drink.description,
		rarity = "uncommon",
	})

	-- Global announce for premium drinks
	if drink.cost >= 50 then
		Remotes.FireAllClients("ServerAnnounce", {
			message = player.Name .. " ordered " .. drink.name .. " at the Bubble Tea Bar!",
			rarity = "uncommon",
		})
	end

	print("[BubbleTeaBar]", player.Name, "ordered", drink.name, "- buff:", drink.buffType, "x" .. drink.buffValue)
end)

-- ═══════════════════════════════════════════════
-- DRINK LIST REQUEST (for GUI)
-- ═══════════════════════════════════════════════

Remotes.RequestDrinkList.OnServerEvent:Connect(function(player)
	local userId = player.UserId
	local activeBuffs = {}

	if playerBuffs[userId] then
		for buffType, buff in pairs(playerBuffs[userId]) do
			if tick() < buff.expireTime then
				activeBuffs[buffType] = {
					value = buff.value,
					remaining = math.ceil(buff.expireTime - tick()),
				}
			end
		end
	end

	Remotes.FireClient("DrinkListResponse", player, {
		drinks = DRINKS,
		activeBuffs = activeBuffs,
	})
end)

-- ═══════════════════════════════════════════════
-- CLEANUP
-- ═══════════════════════════════════════════════

Players.PlayerRemoving:Connect(function(player)
	local userId = player.UserId
	playerBuffs[userId] = nil
	playerCooldowns[userId] = nil
end)

-- ═══════════════════════════════════════════════
-- SEASONAL DRINKS (data-driven archetypes — see Modules/GameObjects)
--
-- Appended last, after both remote handlers are already connected: a
-- throw anywhere in this seasonal path degrades to "no seasonal drink
-- today" instead of taking the whole bar offline before it can wire up.
-- ═══════════════════════════════════════════════

for _, seasonalDrink in ipairs(SeasonalDrinks.GetActiveSeasonalDrinks(os.date("*t").month)) do
	table.insert(DRINKS, seasonalDrink)
end

print("[MOLGANG] Bubble Tea Bar initialized — 6 drinks with buffs at factory cafe")
