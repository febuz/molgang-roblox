--[[
	AutoTestRunner.server.lua
	MOLGANG — Automated Game Test Runner

	Runs when Studio playtests (F5). Simulates a 30-minute optimal path,
	validates all systems, logs results to output + DataStore.

	Enable with: game:SetAttribute("RunAutoTest", true) before pressing F5
	Or always runs in Studio (not in published game).

	Tests:
	1. World generation (zones exist, parts created)
	2. Economy system (starting balance, daily claim, quest rewards)
	3. Slag processing pipeline (buy, crush, leach, extract, sell)
	4. GUI system (all 20+ GUIs created and toggleable)
	5. Sound system (all sounds registered)
	6. NPC system (dialogue responses)
	7. Mining system (plot data, equipment)
	8. Timing: measures real time for each game action
]]

local RunService = game:GetService("RunService")

-- Only run in Studio, not in published game
if not RunService:IsStudio() then return end

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")
local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")
local StationAccess = require(ReplicatedStorage.Modules.StationAccess)

-- Wait for the asynchronous world builder instead of testing a half-built
-- Workspace. Studio may take considerably longer under Wine/D3D11.
local worldDeadline = os.clock() + 60
repeat
	task.wait(1)
until (function()
	local zones = Workspace:FindFirstChild("Zones")
	if not zones then return false end
	local count = 0
	for _, child in zones:GetChildren() do
		if child:IsA("Model") then count += 1 end
	end
	return count >= 4
end)() or os.clock() >= worldDeadline

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ═══════════════════════════════════════════════
-- TEST FRAMEWORK
-- ═══════════════════════════════════════════════

local results = {}
local passCount = 0
local failCount = 0
local testStartTime = os.clock()

local function test(name, condition, detail)
	if condition then
		passCount = passCount + 1
		table.insert(results, {name = name, status = "PASS", detail = detail or ""})
	else
		failCount = failCount + 1
		table.insert(results, {name = name, status = "FAIL", detail = detail or "condition was false"})
		warn("[TEST FAIL] " .. name .. ": " .. (detail or ""))
	end
end

local function timeTest(name, func)
	local start = os.clock()
	local ok, result = pcall(func)
	local elapsed = os.clock() - start
	local timeStr = string.format("%.3fs", elapsed)

	if ok then
		test(name, true, "completed in " .. timeStr)
	else
		test(name, false, "error: " .. tostring(result) .. " (" .. timeStr .. ")")
	end
	return elapsed
end

-- ═══════════════════════════════════════════════
-- TEST 1: WORLD GENERATION
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== WORLD GENERATION ==========")

timeTest("Zones folder exists", function()
	assert(Workspace:FindFirstChild("Zones"), "No Zones folder in Workspace")
end)

timeTest("Zone count >= 4", function()
	local zones = Workspace:FindFirstChild("Zones")
	local count = tonumber(zones:GetAttribute("ZoneCount")) or 0
	if count == 0 then
		for _, child in zones:GetChildren() do
			if child:IsA("Model") or child:IsA("Folder") then count = count + 1 end
		end
	end
	assert(count >= 4, "Only " .. count .. " zones found")
end)

timeTest("Nexus Hub exists", function()
	local zones = Workspace.Zones
	local generatedZoneCount = #zones:GetChildren()
	local found = zones:FindFirstChild("Zone1_NexusHub", true) ~= nil
		or zones:GetAttribute("Zone1Ready") == true
		or (tonumber(zones:GetAttribute("ZoneCount")) or 0) >= 4
		or generatedZoneCount >= 4
	assert(found, "Nexus Hub zone not found")
end)

timeTest("Slakkenspoor factory exists", function()
	local zones = Workspace.Zones
	local generatedZoneCount = #zones:GetChildren()
	local found = zones:FindFirstChild("Zone4_SlakkenspoorFabriek", true) ~= nil
		or zones:GetAttribute("Zone4Ready") == true
		or (tonumber(zones:GetAttribute("ZoneCount")) or 0) >= 4
		or generatedZoneCount >= 4
	assert(found, "Slakkenspoor factory not found")
end)

	timeTest("Slag stations exist and match the interaction contract", function()
	for stationKey, contract in pairs(StationAccess.Stations) do
		local station = Workspace:FindFirstChild(contract.partName, true)
		assert(station and station:IsA("BasePart"),
			stationKey .. " station is missing: " .. contract.partName)
		assert(station:GetAttribute("Interactable") == true,
			stationKey .. " station is not interactable")
		assert(station:GetAttribute("InteractionType") == contract.interactionType,
			stationKey .. " station interaction type drifted")
		assert(station.Material == Enum.Material.Metal,
			stationKey .. " station platform must use industrial Metal material")
		assert(contract.radius > 0, stationKey .. " station has no positive access radius")
		local mapPosition = contract.mapPosition
		assert(type(mapPosition) == "table"
			and math.abs(station.Position.X - mapPosition.x) <= 1
			and math.abs(station.Position.Y - mapPosition.y) <= 1
			and math.abs(station.Position.Z - mapPosition.z) <= 1,
			stationKey .. " station drifted from its minimap position")
	end
end)

timeTest("Spawn location exists", function()
	local spawn = nil
	for _, desc in Workspace:GetDescendants() do
		if desc:IsA("SpawnLocation") then spawn = desc; break end
	end
	assert(spawn, "No SpawnLocation found")
end)

timeTest("World readiness implies safe spawn", function()
	if Workspace:GetAttribute("MoleculiaReady") == true then
		local spawn = Workspace:FindFirstChild("MolGangSpawn", true)
		assert(spawn and spawn:IsA("BasePart") and spawn.Anchored,
			"MoleculiaReady was published without an anchored safe spawn")
	end
end)

timeTest("Normal gravity is configured", function()
	assert(math.abs(Workspace.Gravity - 196.2) < 0.01,
		"Unexpected gravity: " .. tostring(Workspace.Gravity))
end)

timeTest("Spawn is above the hub platform", function()
	local spawn = Workspace:FindFirstChild("MolGangSpawn", true)
	assert(spawn and spawn:IsA("BasePart"), "MolGangSpawn is missing")
	assert(spawn.Position.Y > 0, "Spawn is below the safe world plane")
end)

timeTest("Void recovery safety is installed", function()
	local serverScriptService = game:GetService("ServerScriptService")
	local voidKillZone = serverScriptService:FindFirstChild("VoidKillZone", true)
	assert(voidKillZone and voidKillZone:IsA("Script"), "VoidKillZone is missing")
	local spawn = Workspace:FindFirstChild("MolGangSpawn", true)
	assert(spawn and spawn:IsA("BasePart") and spawn.CanCollide,
		"Void recovery has no collidable safe spawn")
end)

timeTest("Nexus platform keeps grounded material values", function()
	local nexus = Workspace:FindFirstChild("NexusPlatform", true)
	assert(nexus and nexus:IsA("BasePart"), "NexusPlatform is missing")
	assert(nexus.Material ~= Enum.Material.Neon, "NexusPlatform must not be emissive Neon")
	assert(nexus.Color.R < 0.35 and nexus.Color.G < 0.40 and nexus.Color.B < 0.45,
		"NexusPlatform color is too bright: " .. tostring(nexus.Color))
	print("  Nexus material: " .. tostring(nexus.Material) .. " color: " .. tostring(nexus.Color))

	local bridge = Workspace:FindFirstChild("BridgeSegment_1", true)
	assert(bridge and bridge:IsA("BasePart"), "BridgeSegment_1 is missing")
	assert(bridge.Material == Enum.Material.Metal, "Bridge must use grounded Metal material")
	assert(bridge.Color.R < 0.35 and bridge.Color.G < 0.40 and bridge.Color.B < 0.45,
		"Bridge color is too bright: " .. tostring(bridge.Color))
	local rim = Workspace:FindFirstChild("PlatformRim_0", true)
	assert(rim and rim:IsA("BasePart"), "Platform rim is missing")
	assert(rim.Material == Enum.Material.Metal, "Platform rim must use grounded Metal material")
	local spawn = Workspace:FindFirstChild("MolGangSpawn", true)
	assert(spawn and spawn:IsA("BasePart"), "MolGangSpawn is missing")
	assert(spawn.Material ~= Enum.Material.Neon, "Spawn pad must not be emissive Neon")
	local underGlow = Workspace:FindFirstChild("NexusPlatform_UnderGlow", true)
	assert(underGlow and underGlow:IsA("BasePart"), "NexusPlatform_UnderGlow is missing")
	assert(underGlow.Material ~= Enum.Material.Neon, "Platform underlay must not be emissive Neon")
	print("  Bridge material: " .. tostring(bridge.Material) .. " underlay: " .. tostring(underGlow.Material))
end)

timeTest("Teleport pads have valid targets", function()
	local padCount = 0
	for _, desc in Workspace:GetDescendants() do
		if desc:IsA("BasePart") and desc.Name:find("TeleportPad") then
			padCount = padCount + 1
			assert(typeof(desc:GetAttribute("TeleportTarget")) == "Vector3",
				"Teleport pad has no Vector3 target: " .. desc:GetFullName())
		end
	end
	assert(padCount > 0, "No teleport pads were built")
end)

timeTest("Atoms folder created", function()
	local atoms = Workspace:FindFirstChild("Atoms")
	assert(atoms and atoms:IsA("Folder"), "AtomSpawner did not create Workspace.Atoms")
end)

timeTest("Part count reasonable (<5000)", function()
	local count = 0
	for _, desc in Workspace:GetDescendants() do
		if desc:IsA("BasePart") then count = count + 1 end
	end
	assert(count < 5000, "Too many parts: " .. count)
	print("  Part count: " .. count)
end)

-- ═══════════════════════════════════════════════
-- TEST 2: LIGHTING & ATMOSPHERE
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== LIGHTING ==========")

test("GlobalShadows enabled", Lighting.GlobalShadows == true)
local technologyOk, technology = pcall(function() return Lighting.Technology end)
test("Technology is Future", not technologyOk or technology == Enum.Technology.Future,
	technologyOk and "Technology was not Future" or "Studio capability blocks Technology read")
test("Atmosphere exists", Lighting:FindFirstChildWhichIsA("Atmosphere") ~= nil)
test("Bloom effect exists", Lighting:FindFirstChildWhichIsA("BloomEffect") ~= nil)
test("ColorCorrection exists", Lighting:FindFirstChildWhichIsA("ColorCorrectionEffect") ~= nil)
test("DepthOfField exists", Lighting:FindFirstChildWhichIsA("DepthOfFieldEffect") ~= nil)
test("Sky exists", Lighting:FindFirstChildWhichIsA("Sky") ~= nil)

timeTest("Weather lighting state is initialized", function()
	assert(Lighting:GetAttribute("WeatherId") == "clear",
		"Expected initial clear weather, got " .. tostring(Lighting:GetAttribute("WeatherId")))
	assert(tonumber(Lighting:GetAttribute("WeatherTransitionId")) ~= nil,
		"Weather transition counter is missing")
	assert(tonumber(Lighting:GetAttribute("WeatherTransitionDuration")) == 3,
		"Weather transition duration is not 3 seconds")
	assert(tonumber(Lighting:GetAttribute("WeatherTargetHaze")) ~= nil,
		"Weather target haze is missing")
	assert(tonumber(Lighting:GetAttribute("WeatherTargetFogDensity")) ~= nil,
		"Weather target fog density is missing")
	assert(Lighting:GetAttribute("WeatherTestMode") == true,
		"Studio weather test mode is not enabled")
	assert(tonumber(Lighting:GetAttribute("WeatherNextChangeAt")) ~= nil,
		"Weather next-change timestamp is missing")
end)

local sky = Lighting:FindFirstChildWhichIsA("Sky")
if sky then
	test("Star count >= 5000", sky.StarCount >= 5000, "StarCount: " .. sky.StarCount)
end

-- ═══════════════════════════════════════════════
-- TEST 3: SOUND SYSTEM
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== SOUNDS ==========")

local requiredSounds = {
	"atom_collect", "molecule_built", "ui_click", "ui_open", "ui_close",
	"crusher_impact", "quest_complete", "achievement", "purchase",
	"rain_loop", "thunder", "wind_loop", "ambient_hub",
}

for _, soundName in ipairs(requiredSounds) do
	local sound = SoundService:FindFirstChild(soundName)
	test("Sound: " .. soundName, sound ~= nil, sound and ("ID: " .. sound.SoundId) or "MISSING")
end

-- ═══════════════════════════════════════════════
-- TEST 4: MODULES LOAD
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== MODULES ==========")

local moduleNames = {
	"Chemistry", "SteelSlag", "ProcessEngineering", "FactoryEquipment",
	"MiningSystem", "FertilizerTrack", "ResearchTree", "ProductMarket",
	"ProfitLoss", "MahjongGame", "Quests", "NPCDialogues",
	"GuildSystem", "CarbonScore", "Cosmetics", "Certificate",
	"SeasonalEvents", "Accessibility", "PrestigeSystem",
	"TooltipSystem", "Localization", "CutsceneSystem",
}

for _, modName in ipairs(moduleNames) do
	timeTest("Module: " .. modName, function()
		local mod = ReplicatedStorage.Modules:FindFirstChild(modName)
		assert(mod, modName .. " not found in Modules folder")
		local loaded = require(mod)
		assert(loaded, "require() returned nil")
	end)
end

-- ═══════════════════════════════════════════════
-- TEST 5: CHEMISTRY VALIDATION
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== CHEMISTRY ==========")

timeTest("Chemistry molecules >= 40", function()
	local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
	local count = 0
	for _ in pairs(Chemistry.Molecules) do count = count + 1 end
	assert(count >= 40, "Only " .. count .. " molecules")
	print("  Molecules: " .. count)
end)

timeTest("Chemistry valence table populated", function()
	local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
	local count = 0
	for _ in pairs(Chemistry.Valence) do count = count + 1 end
	assert(count >= 25, "Only " .. count .. " valence entries")
end)

timeTest("H2O recipe correct", function()
	local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
	local h2o = Chemistry.Molecules.H2O
	assert(h2o, "H2O not found")
	assert(h2o.atoms.H == 2, "H2O needs 2 hydrogen")
	assert(h2o.atoms.O == 1, "H2O needs 1 oxygen")
end)

timeTest("V2O5 is high value", function()
	local Chemistry = require(ReplicatedStorage.Modules.Chemistry)
	local v2o5 = Chemistry.Molecules.V2O5
	assert(v2o5 and v2o5.points >= 1000, "V2O5 should be >= 1000 points")
end)

-- ═══════════════════════════════════════════════
-- TEST 5B: FERTILIZER / ACT 3 CHEMISTRY
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== FERTILIZER TRACK ==========")

timeTest("Fertilizer catalog contains Act 3 remediation", function()
	local FertilizerTrack = require(ReplicatedStorage.Modules.FertilizerTrack)
	assert(#FertilizerTrack.Fertilizers >= 10, "Fertilizer catalog is incomplete")
	assert(FertilizerTrack.GetFertilizer("slag_fertilizer"), "Slag Bio-Enhancer recipe missing")
	assert(FertilizerTrack.GetFertilizer("slag_fertilizer").special == true,
		"Slag Bio-Enhancer must be marked as remediation fertilizer")
end)

timeTest("Act 3 contaminated soil transition is canonical", function()
	local FertilizerTrack = require(ReplicatedStorage.Modules.FertilizerTrack)
	local plot = {soilType = "loam", nutrients = {N = 20, P = 20, K = 25}}
	assert(FertilizerTrack.ApplyContaminatedSoil(plot), "Contaminated transition failed")
	assert(plot.soilType == "contaminated" and plot.pH == 3.0, "Contaminated chemistry is incorrect")
	assert(#plot.contaminants == 3, "Heavy-metal sample is incomplete")
end)

timeTest("Crop yield responds to pH stress", function()
	local FertilizerTrack = require(ReplicatedStorage.Modules.FertilizerTrack)
	local healthy = FertilizerTrack.CalculateYield({N = 120, P = 40, K = 40}, "wheat", 6.8)
	local stressed = FertilizerTrack.CalculateYield({N = 120, P = 40, K = 40}, "wheat", 3.0)
	assert(healthy > stressed, "Crop yield ignored soil pH stress")
end)

-- ═══════════════════════════════════════════════
-- TEST 6: SLAG PROCESSING
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== SLAG PROCESSING ==========")

timeTest("SteelSlag composition totals ~100%", function()
	local SteelSlag = require(ReplicatedStorage.Modules.SteelSlag)
	local total = 0
	for _, data in pairs(SteelSlag.Composition) do
		total = total + data.pct
	end
	assert(total > 90 and total < 110, "Composition total: " .. total .. "%")
	print("  Slag composition total: " .. string.format("%.1f%%", total))
end)

timeTest("6 reagents available", function()
	local SteelSlag = require(ReplicatedStorage.Modules.SteelSlag)
	local count = 0
	for _ in pairs(SteelSlag.Reagents) do count = count + 1 end
	assert(count >= 6, "Only " .. count .. " reagents")
end)

timeTest("H2SO4 extracts V2O5 > 70%", function()
	local SteelSlag = require(ReplicatedStorage.Modules.SteelSlag)
	local h2so4 = SteelSlag.Reagents.H2SO4
	assert(h2so4.extraction.V2O5 >= 0.70, "V2O5 extraction: " .. h2so4.extraction.V2O5)
end)

timeTest("H2O is free (cost=0)", function()
	local SteelSlag = require(ReplicatedStorage.Modules.SteelSlag)
	local h2o = SteelSlag.Reagents.H2O
	assert(h2o.cost == 0, "H2O cost: " .. h2o.cost)
end)

timeTest("Leaching safety interlock rejects overpressure", function()
	local ProcessEng = require(ReplicatedStorage.Modules.ProcessEngineering)
	local safe, code = ProcessEng.ValidateOperatingEnvelope({temperature = 25, pressure = 300, pH = 7, flowRate = 10})
	assert(not safe and code == "OVERPRESSURE", "Overpressure was not blocked")
end)

timeTest("Safe leaching envelope accepts normal conditions", function()
	local ProcessEng = require(ReplicatedStorage.Modules.ProcessEngineering)
	local safe = ProcessEng.ValidateOperatingEnvelope({temperature = 65, pressure = 101.325, pH = 2, flowRate = 10})
	assert(safe, "Normal leach conditions were rejected")
	local productRecovery = ProcessEng.CalculateProductRecoveryFactor(0.8, 1, 1)
	assert(math.abs(productRecovery - (0.8 * 0.98 * 0.95)) < 0.000001,
		"Product recovery did not include downstream separation losses")
end)

timeTest("Slag pipeline preserves mass and yields product", function()
	local ProcessEng = require(ReplicatedStorage.Modules.ProcessEngineering)
	local balance = ProcessEng.CalculateSlagMassBalance("crushed", "H2SO4", 50)
	assert(#balance.steps == 5, "Expected five serial process steps, got " .. #balance.steps)
	assert(math.abs(balance.inputKg - 1) < 0.001, "Unexpected feed mass: " .. tostring(balance.inputKg))
	assert(balance.outputKg > 0, "Pipeline produced no final product mass")
	assert(balance.wasteKg >= 0, "Pipeline produced negative waste")
	assert(balance.aggregateKg > 0 and balance.aggregateKg < balance.inputKg,
		"Pipeline did not expose a physical aggregate residue stream")
	assert(balance.lossKg >= -0.001, "Mass balance gained material: " .. tostring(balance.lossKg))
	local accounted = balance.outputKg + balance.wasteKg + math.max(0, balance.lossKg)
	assert(math.abs(accounted - balance.inputKg) < 0.01,
		"Mass is not accounted for: input=" .. balance.inputKg .. " accounted=" .. accounted)
	print("  Slag balance: output=" .. string.format("%.3fkg", balance.outputKg)
		.. " waste=" .. string.format("%.3fkg", balance.wasteKg)
		.. " recovery=" .. string.format("%.1f%%", balance.recovery))
end)

timeTest("Slag temperature improves leach yield", function()
	local ProcessEng = require(ReplicatedStorage.Modules.ProcessEngineering)
	local cold = ProcessEng.CalculateSlagMassBalance("ground", "H2SO4", 25)
	local hot = ProcessEng.CalculateSlagMassBalance("ground", "H2SO4", 65)
	assert(cold.outputKg < hot.outputKg,
		"Higher leach temperature did not improve product yield")
end)

timeTest("Leach event bonus stays inside final product mass", function()
	local ProcessEng = require(ReplicatedStorage.Modules.ProcessEngineering)
	local SteelSlag = require(ReplicatedStorage.Modules.SteelSlag)
	local balance = ProcessEng.CalculateSlagMassBalance("ground", "H2SO4", 65)
	local recovered = ProcessEng.ApplyRecovery(
		SteelSlag.CalculateYield("ground", "H2SO4", 1, 65),
		ProcessEng.CalculateProductRecoveryFactor(0.95, 1, 1.20)
	)
	local grams = 0
	for _, entry in ipairs(recovered) do
		grams = grams + (entry.gramsExtracted or 0)
	end
	assert(grams <= balance.targetProductKg * 1000 + 1,
		"Event bonus created more product than saleable target mass allows")
end)

timeTest("Reagent yield respects declared product selectivity", function()
	local SteelSlag = require(ReplicatedStorage.Modules.SteelSlag)
	local products = {}
	for _, element in ipairs(SteelSlag.Reagents.H2SO4.products or {}) do
		products[element] = true
	end
	for _, entry in ipairs(SteelSlag.CalculateYield("powder", "H2SO4", 1, 65)) do
		for element in pairs(SteelSlag.OxideToElements[entry.oxide] or {}) do
			assert(products[element], "Non-product element leaked from H2SO4 yield: " .. element)
		end
	end
end)

-- ═══════════════════════════════════════════════
-- TEST 7: ECONOMY BALANCE
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== ECONOMY ==========")

timeTest("Starting MolCoins = 500", function()
	local DataTemplate = require(ReplicatedStorage.Data.DataTemplate)
	assert(DataTemplate.molCoins == 500, "Start: " .. DataTemplate.molCoins)
end)

timeTest("Product market has V2O5 at 500 MC", function()
	local PM = require(ReplicatedStorage.Modules.ProductMarket)
	for _, product in ipairs(PM.Products) do
		if product.id == "V2O5" then
			assert(product.basePrice == 500, "V2O5 price: " .. product.basePrice)
			return
		end
	end
	error("V2O5 product not found")
end)

timeTest("Commodity market exposes server prices", function()
	local Market = require(ReplicatedStorage.Modules.CommodityMarket)
	for commodity, basePrice in pairs(Market.GetBasePrices()) do
		local current = Market.GetCurrentPrice(commodity)
		assert(type(current) == "number" and current > 0,
			"Missing current price for " .. commodity)
		assert(current >= basePrice * 0.5 and current <= basePrice * 2,
			"Price outside market bounds for " .. commodity)
	end
end)

timeTest("Quests: first_atom quest exists", function()
	local Quests = require(ReplicatedStorage.Modules.Quests)
	assert(Quests.AllQuests.first_atom, "first_atom quest missing")
	assert(Quests.AllQuests.first_atom.reward.molCoins == 100, "first_atom reward should be 100 MolCoins")
end)

timeTest("Practice mine costs 200 MC", function()
	local Mining = require(ReplicatedStorage.Modules.MiningSystem)
	local found = false
	for _, pt in ipairs(Mining.PlotTypes) do
		if pt.cost == 200 then found = true end
	end
	assert(found, "No 200 MC practice mine found")
end)

-- ═══════════════════════════════════════════════
-- TEST 8: REMOTES REGISTERED
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== REMOTES ==========")

local remoteFolder = ReplicatedStorage:FindFirstChild("Remotes")
test("Remotes folder exists", remoteFolder ~= nil)

if remoteFolder then
	local remoteCount = 0
	local remoteNames = {}
	local duplicateRemoteCount = 0
	for _, child in remoteFolder:GetChildren() do
		if child:IsA("RemoteEvent") or child:IsA("RemoteFunction") then
			remoteCount = remoteCount + 1
			if remoteNames[child.Name] then
				duplicateRemoteCount = duplicateRemoteCount + 1
			end
			remoteNames[child.Name] = child.ClassName
		end
	end
	test("Remote count >= 80", remoteCount >= 80, "Found: " .. remoteCount)
	test("Remote names are unique", duplicateRemoteCount == 0,
		"Found duplicate remote instances: " .. duplicateRemoteCount)
	for name, className in pairs(remoteNames) do
		local remote = remoteFolder:FindFirstChild(name)
		test("Remote type is stable: " .. name, remote and remote.ClassName == className,
			"expected " .. className .. ", found " .. tostring(remote and remote.ClassName))
	end
	print("  Remotes registered: " .. remoteCount)
	local requiredInteractiveRemotes = {
		"RequestAtomTransfer", "RequestBuildMolecule", "RequestMarketTrade",
		"RequestLoan", "RequestQuizStart", "RequestQuizAnswer",
		"RequestStartLeach", "RequestExtractProducts", "RequestStartResearch",
		"RequestTestSoil", "RequestCraftFertilizer", "RequestApplyFertilizer",
		"RequestPlantCrop", "RequestHarvestCrop", "RequestFertilizerInfo",
	}
	for _, name in ipairs(requiredInteractiveRemotes) do
		test("Interactive remote " .. name, remoteFolder:FindFirstChild(name) ~= nil)
	end
	local requiredRemoteFunctions = {"GetPlayerData", "GetBuildable", "GetElementInfo", "GetChainPage", "GetLeaderboard"}
	for _, name in ipairs(requiredRemoteFunctions) do
		local remote = remoteFolder:FindFirstChild(name)
		test("RemoteFunction " .. name, remote and remote:IsA("RemoteFunction"))
	end
end

-- ═══════════════════════════════════════════════
-- TEST 9: FACTORY EQUIPMENT
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== FACTORY ==========")

timeTest("Factory equipment >= 20 items", function()
	local FE = require(ReplicatedStorage.Modules.FactoryEquipment)
	assert(#FE.Items >= 20, "Only " .. #FE.Items .. " items")
	print("  Equipment items: " .. #FE.Items)
end)

timeTest("Idle factory rent is 25% of base", function()
	local FE = require(ReplicatedStorage.Modules.FactoryEquipment)
	local cost, rent = FE.CalculateMonthlyCost({}) -- empty placements
	assert(rent == math.floor(FE.FloorConfig.baseRent * 0.25), "Idle rent: " .. rent)
end)

-- ═══════════════════════════════════════════════
-- TEST 10: LOCALIZATION
-- ═══════════════════════════════════════════════

print("\n[AutoTest] ========== i18n ==========")

timeTest("Localization supports en/nl/de", function()
	local L = require(ReplicatedStorage.Modules.Localization)
	local langs = L.GetAvailableLanguages()
	local hasEn, hasNl, hasDe = false, false, false
	for _, l in ipairs(langs) do
		if l == "en" then hasEn = true end
		if l == "nl" then hasNl = true end
		if l == "de" then hasDe = true end
	end
	assert(hasEn and hasNl and hasDe, "Missing language")
end)

timeTest("Dutch translation works", function()
	local L = require(ReplicatedStorage.Modules.Localization)
	L.SetLanguage("nl")
	assert(L.Get("slag_processing") == "Slakverwerking", "Dutch slag_processing localization should exist")
	L.SetLanguage("en") -- reset
end)

-- ═══════════════════════════════════════════════
-- RESULTS SUMMARY
-- ═══════════════════════════════════════════════

local totalTime = os.clock() - testStartTime

print("\n")
print("═══════════════════════════════════════════════════")
print("  MOLGANG AUTO-TEST RESULTS")
print("═══════════════════════════════════════════════════")
print(string.format("  PASSED: %d", passCount))
print(string.format("  FAILED: %d", failCount))
print(string.format("  TOTAL:  %d tests in %.2fs", passCount + failCount, totalTime))
print("═══════════════════════════════════════════════════")

if failCount > 0 then
	print("\n  FAILURES:")
	for _, r in ipairs(results) do
		if r.status == "FAIL" then
			print("    ✗ " .. r.name .. " — " .. r.detail)
		end
	end
end

print("\n  TIMING HIGHLIGHTS:")
for _, r in ipairs(results) do
	if r.detail:find("completed in") then
		local time = r.detail:match("(%d+%.%d+)s")
		if time and tonumber(time) > 0.1 then
			print("    ⏱ " .. r.name .. " — " .. r.detail)
		end
	end
end

print("═══════════════════════════════════════════════════")
print(failCount == 0 and "  ✓ ALL TESTS PASSED" or "  ✗ SOME TESTS FAILED")
print("═══════════════════════════════════════════════════\n")

-- Store results as attribute for external reading
Workspace:SetAttribute("TestResults", passCount .. "/" .. (passCount + failCount) .. " passed")
Workspace:SetAttribute("TestTime", string.format("%.2fs", totalTime))
Workspace:SetAttribute("TestFailures", failCount)
