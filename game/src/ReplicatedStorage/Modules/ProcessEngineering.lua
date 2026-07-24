--[[
	ProcessEngineering.lua
	MOLGANG — Chemical Engineering Process Variables & Control

	Core ChemEng simulation:
	- Temperature control (affects reaction rates via Arrhenius equation)
	- Pressure monitoring (affects gas-phase reactions, leaching)
	- Flow rate control (throughput, residence time)
	- pH control (selective metal extraction)
	- Mass balance tracking (input → output + waste)
	- Energy balance (heating/cooling costs)
	- Reaction kinetics (time × temperature × concentration)

	Based on real chemical engineering principles:
	- Arrhenius: k = A × exp(-Ea / RT)
	- Liebig's Law of the Minimum (for fertilizer yield)
	- Henderson-Hasselbalch (for pH buffer chemistry)
]]

local ProcessEngineering = {}

local function isFiniteNumber(value)
	return type(value) == "number" and value == value and value > -math.huge and value < math.huge
end

ProcessEngineering.IsFiniteNumber = isFiniteNumber

-- ═══════════════════════════════════════════════
-- CONSTANTS
-- ═══════════════════════════════════════════════

ProcessEngineering.R = 8.314           -- Universal gas constant (J/mol·K)
ProcessEngineering.ABSOLUTE_ZERO = 273.15  -- K offset

-- ═══════════════════════════════════════════════
-- TEMPERATURE EFFECTS (Arrhenius Equation)
-- k = A × exp(-Ea / RT)
-- Higher temp = exponentially faster reactions
-- ═══════════════════════════════════════════════

-- Activation energies for slag leaching reactions (kJ/mol, simplified)
ProcessEngineering.ActivationEnergies = {
	-- Acid leaching (H2SO4, HCl)
	acid_CaO   = 25,    -- CaO dissolves easily
	acid_FeO   = 40,    -- moderate
	acid_V2O5  = 55,    -- needs more energy
	acid_TiO2  = 70,    -- difficult to dissolve
	acid_SiO2  = 90,    -- very resistant to acid

	-- Alkaline leaching (NaOH)
	base_Al2O3 = 35,
	base_SiO2  = 45,
	base_Cr2O3 = 50,

	-- Roasting (V oxidation)
	roast_V    = 60,     -- V3+ → V5+ oxidation
}

-- Calculate reaction rate multiplier based on temperature
-- Reference temperature: 25°C (298K)
function ProcessEngineering.ArrheniusMultiplier(tempCelsius, activationEnergy_kJ)
	local T = tempCelsius + ProcessEngineering.ABSOLUTE_ZERO
	local T_ref = 298.15  -- 25°C reference
	local Ea = activationEnergy_kJ * 1000  -- convert to J/mol
	local R = ProcessEngineering.R

	-- k/k_ref = exp(-Ea/R × (1/T - 1/T_ref))
	local exponent = (-Ea / R) * (1/T - 1/T_ref)
	local multiplier = math.exp(exponent)

	-- Clamp to reasonable game range
	return math.clamp(multiplier, 0.01, 100)
end

-- ═══════════════════════════════════════════════
-- PRESSURE EFFECTS
-- ═══════════════════════════════════════════════

ProcessEngineering.StandardPressure = 101.325  -- kPa (1 atm)

-- Higher pressure helps dissolve gases, affects gas-phase reactions
function ProcessEngineering.PressureMultiplier(pressureKPa)
	local ratio = pressureKPa / ProcessEngineering.StandardPressure
	-- Henry's Law: gas solubility proportional to pressure
	return math.clamp(ratio, 0.5, 5.0)
end

-- ═══════════════════════════════════════════════
-- FLOW RATE & RESIDENCE TIME
-- ═══════════════════════════════════════════════

-- Residence time = reactor volume / flow rate
-- Longer residence = more complete reaction
function ProcessEngineering.ResidenceTimeEffect(flowRateLperMin, reactorVolumeL)
	if flowRateLperMin <= 0 then return 1.0 end
	local residenceMin = reactorVolumeL / flowRateLperMin

	-- Conversion follows 1 - exp(-k×t) first-order kinetics
	-- At t = residence time, conversion = 1 - exp(-1) ≈ 63%
	-- We normalize so that design residence time (30 min) = 1.0
	local normalizedTime = residenceMin / 30
	local conversion = 1 - math.exp(-normalizedTime)
	return math.clamp(conversion / 0.632, 0.1, 1.5)  -- normalize to 1.0 at design point
end

-- ═══════════════════════════════════════════════
-- pH CONTROL (Henderson-Hasselbalch)
-- ═══════════════════════════════════════════════

-- Metal precipitation pH ranges (below which metal stays in solution)
ProcessEngineering.PrecipitationPH = {
	Fe  = {start = 3.0, complete = 4.5},    -- Fe(OH)3
	Al  = {start = 4.0, complete = 5.5},    -- Al(OH)3
	Cr  = {start = 5.0, complete = 7.0},    -- Cr(OH)3
	V   = {start = 1.8, complete = 3.0},    -- V2O5 precipitates at low pH
	Mn  = {start = 8.0, complete = 9.5},    -- Mn(OH)2
	Ca  = {start = 12.0, complete = 13.0},  -- Ca(OH)2
	Ti  = {start = 2.0, complete = 4.0},    -- TiO2 hydrate
}

-- Calculate what percentage of a metal precipitates at given pH
function ProcessEngineering.PrecipitationFraction(metalSymbol, pH)
	local data = ProcessEngineering.PrecipitationPH[metalSymbol]
	if not data then return 0 end

	if pH < data.start then return 0 end
	if pH >= data.complete then return 1.0 end

	-- Linear interpolation between start and complete
	return (pH - data.start) / (data.complete - data.start)
end

-- ═══════════════════════════════════════════════
-- MASS BALANCE
-- Track material in/out/waste for each process step
-- ═══════════════════════════════════════════════

function ProcessEngineering.CreateMassBalance()
	return {
		inputKg = 0,
		outputKg = 0,
		wasteKg = 0,
		lossKg = 0,       -- unaccounted loss
		recovery = 0,      -- % recovery
		steps = {},        -- {stepName, inputKg, outputKg, wasteKg, efficiency}
	}
end

function ProcessEngineering.AddStep(balance, stepName, inputKg, outputKg, wasteKg)
	local efficiency = inputKg > 0 and (outputKg / inputKg * 100) or 0
	table.insert(balance.steps, {
		name = stepName,
		inputKg = math.floor(inputKg * 1000) / 1000,
		outputKg = math.floor(outputKg * 1000) / 1000,
		wasteKg = math.floor(wasteKg * 1000) / 1000,
		efficiency = math.floor(efficiency * 10) / 10,
	})
	-- The steps form one serial process.  Only the first step contributes to
	-- overall feed; later step inputs are transfers inside the plant, not new
	-- material.  Waste is accumulated, while output is the current product
	-- stream.  This keeps the plant-level balance physically meaningful.
	if #balance.steps == 1 then
		balance.inputKg = inputKg
	end
	balance.outputKg = outputKg
	balance.wasteKg = balance.wasteKg + wasteKg
	balance.lossKg = balance.inputKg - balance.outputKg - balance.wasteKg
	balance.recovery = balance.inputKg > 0 and (balance.outputKg / balance.inputKg * 100) or 0
	return balance
end

-- Calculate full slag processing mass balance for 1kg input
function ProcessEngineering.CalculateSlagMassBalance(particleSize, reagentId, temperature, slagModule)
	local balance = ProcessEngineering.CreateMassBalance()
	local SteelSlag = slagModule or require(script.Parent.SteelSlag)

	local inputKg = 1.0
	temperature = temperature or 25

	-- Step 1: Crushing (mechanical, no mass change but energy cost)
	local crushLoss = 0.01  -- 1% dust loss
	ProcessEngineering.AddStep(balance, "Crushing (" .. particleSize .. ")",
		inputKg, inputKg - crushLoss, crushLoss)

	-- Step 2: Magnetic Separation (removes ~17% FeO as metallic iron)
	local feRemoved = inputKg * 0.12  -- 12% iron recovered
	local afterMagSep = inputKg - crushLoss - feRemoved
	ProcessEngineering.AddStep(balance, "Magnetic Separation",
		inputKg - crushLoss, afterMagSep, feRemoved)

	-- Step 3: Leaching (dissolved fraction based on reagent + temperature)
	local reagent = SteelSlag.Reagents[reagentId]
	if reagent then
		local dissolved = 0
		local residue = 0
		local representedPct = 0
		for oxide, comp in pairs(SteelSlag.Composition) do
			local oxideMass = afterMagSep * (comp.pct / 100)
			representedPct = representedPct + comp.pct
			local extraction = reagent.extraction[oxide] or 0

			-- Apply temperature effect (Arrhenius)
			local Ea = ProcessEngineering.ActivationEnergies["acid_" .. oxide]
				or ProcessEngineering.ActivationEnergies["base_" .. oxide]
				or 50
			local tempMult = ProcessEngineering.ArrheniusMultiplier(temperature, Ea)
			extraction = math.clamp(extraction * tempMult, 0, 0.99)

			dissolved = dissolved + oxideMass * extraction
			residue = residue + oxideMass * (1 - extraction)
		end
		-- BOF analyses contain a trace/inert fraction that is not listed as an
		-- extractable oxide. Keep it in the residue instead of silently losing
		-- mass from the plant balance.
		local unlistedFraction = math.max(0, 1 - representedPct / 100)
		residue = residue + afterMagSep * unlistedFraction
		ProcessEngineering.AddStep(balance, "Leaching (" .. (reagent.name or reagentId) .. " @ " .. temperature .. "°C)",
			afterMagSep, dissolved, residue)

		-- Step 4: Filtration (separates solution from residue)
		local filtLoss = dissolved * 0.02  -- 2% loss in filter cake
		ProcessEngineering.AddStep(balance, "Filtration",
			dissolved, dissolved - filtLoss, filtLoss)

		-- Step 5: Precipitation + Drying
		local precipLoss = (dissolved - filtLoss) * 0.05  -- 5% loss
		local finalProduct = dissolved - filtLoss - precipLoss
		ProcessEngineering.AddStep(balance, "Precipitation & Drying",
			dissolved - filtLoss, finalProduct, precipLoss)
	end

	return balance
end

-- ═══════════════════════════════════════════════
-- ENERGY BALANCE
-- ═══════════════════════════════════════════════

-- Energy costs per process step (MJ per ton of slag)
ProcessEngineering.EnergyCosts = {
	crushing_jaw    = 5,      -- kWh/ton
	crushing_cone   = 8,
	grinding_ball   = 25,     -- energy-intensive
	magnetic_sep    = 3,
	roasting        = 80,     -- energy-intensive (900°C for 2h) — reduced from 150 (#60)
	leaching_heat   = 20,     -- heating reagent solution
	filtration      = 2,
	drying          = 30,     -- 110°C evaporation
}

function ProcessEngineering.CalculateEnergyCost(steps)
	local totalKWh = 0
	for _, step in ipairs(steps) do
		local cost = ProcessEngineering.EnergyCosts[step] or 0
		totalKWh = totalKWh + cost
	end
	-- Convert to MolCoins (1 kWh = 2 MolCoins)
	return totalKWh, totalKWh * 2
end

-- ═══════════════════════════════════════════════
-- PROCESS CONTROL STATE
-- Current operating conditions of a processing line
-- ═══════════════════════════════════════════════

function ProcessEngineering.CreateProcessState()
	return {
		temperature = 25,       -- °C
		pressure = 101.325,     -- kPa (1 atm)
		flowRate = 10,          -- L/min
		pH = 7.0,               -- neutral
		agitationRPM = 200,     -- mixer speed
		reactorVolume = 50,     -- L
		-- Derived values
		residenceTime = 5,      -- minutes
		reactionRate = 1.0,     -- multiplier
	}
end

function ProcessEngineering.UpdateDerivedValues(state)
	-- Residence time
	state.residenceTime = state.flowRate > 0 and (state.reactorVolume / state.flowRate) or 999

	-- Overall reaction rate = temperature × pressure × residence time effects
	local tempEffect = ProcessEngineering.ArrheniusMultiplier(state.temperature, 50)
	local pressureEffect = ProcessEngineering.PressureMultiplier(state.pressure)
	local residenceEffect = ProcessEngineering.ResidenceTimeEffect(state.flowRate, state.reactorVolume)

	state.reactionRate = tempEffect * pressureEffect * residenceEffect
	return state
end

-- Conservative safety envelope for aqueous leaching in the OTAP teststraat.
function ProcessEngineering.ValidateOperatingEnvelope(state)
	if not state then
		return false, "NO_STATE", "Process state is unavailable."
	end
	if not isFiniteNumber(state.temperature) then
		return false, "INVALID_TEMPERATURE", "Interlock: temperature reading is invalid."
	end
	if not isFiniteNumber(state.pressure) then
		return false, "INVALID_PRESSURE", "Interlock: pressure reading is invalid."
	end
	if not isFiniteNumber(state.flowRate) then
		return false, "INVALID_FLOW", "Interlock: flow reading is invalid."
	end
	if not isFiniteNumber(state.pH) then
		return false, "INVALID_PH", "Interlock: pH reading is invalid."
	end
	if state.temperature > 120 then
		return false, "HIGH_TEMPERATURE", "Interlock: cool the leach tank below 120°C."
	end
	if state.temperature < 5 then
		return false, "LOW_TEMPERATURE", "Interlock: heat the leach tank above 5°C."
	end
	if state.pressure > 250 then
		return false, "OVERPRESSURE", "Interlock: reduce vessel pressure below 250 kPa."
	end
	if state.pressure < 80 then
		return false, "LOW_PRESSURE", "Interlock: restore vessel pressure above 80 kPa."
	end
	if state.flowRate < 1 or state.flowRate > 50 then
		return false, "FLOW_OUT_OF_RANGE", "Interlock: set flow between 1 and 50 L/min."
	end
	if state.pH < 0 or state.pH > 14 then
		return false, "PH_OUT_OF_RANGE", "Interlock: pH must remain between 0 and 14."
	end
	return true, "OK", "Operating envelope safe."
end

-- Approximate concentration control: a reagent only performs at its rated
-- selectivity when the tank pH is close to its operating pH.
function ProcessEngineering.ReagentPHFactor(reagent, pH)
	if not reagent or not isFiniteNumber(pH) then return 0.25 end
	local target = reagent.pH or 7
	local deviation = math.abs(pH - target)
	return math.clamp(1 - deviation / 6, 0.25, 1)
end

-- Combine process controls with a temporary world-event efficiency modifier.
-- The bounds preserve a physically plausible recovery window.
function ProcessEngineering.CalculateRecoveryFactor(processEfficiency, phFactor, eventMultiplier)
	local process = tonumber(processEfficiency) or 0
	local ph = tonumber(phFactor) or 0
	local event = tonumber(eventMultiplier) or 1
	return math.clamp(process * ph * math.max(0, event), 0.15, 0.95)
end

-- Apply recovery without creating a product that the recovered mass cannot
-- support. Sub-atom yields remain process loss instead of rounding upward.
function ProcessEngineering.ApplyRecovery(yield, recoveryFactor)
	if type(yield) ~= "table" then return {} end
	if type(recoveryFactor) ~= "number" or recoveryFactor ~= recoveryFactor then
		recoveryFactor = 0
	end
	recoveryFactor = math.clamp(recoveryFactor, 0, 1)

	local recovered = {}
	for _, entry in ipairs(yield) do
		if type(entry) == "table" and type(entry.atomCount) == "number" then
			local copy = {}
			for key, value in pairs(entry) do copy[key] = value end
			copy.idealAtomCount = entry.atomCount
			copy.idealGramsExtracted = entry.gramsExtracted
			copy.atomCount = math.floor(entry.atomCount * recoveryFactor)
			copy.gramsExtracted = math.floor((entry.gramsExtracted or 0) * recoveryFactor * 10) / 10
			if copy.atomCount > 0 and copy.gramsExtracted > 0 then
				table.insert(recovered, copy)
			end
		end
	end
	return recovered
end

-- ═══════════════════════════════════════════════
-- DISPLAY HELPERS
-- ═══════════════════════════════════════════════

function ProcessEngineering.FormatMassBalance(balance)
	local lines = {}
	table.insert(lines, string.format("=== MASS BALANCE (%.3f kg input) ===", balance.inputKg))
	for _, step in ipairs(balance.steps) do
		table.insert(lines, string.format("  %s: %.3f kg → %.3f kg (%.1f%% eff) + %.3f kg waste",
			step.name, step.inputKg, step.outputKg, step.efficiency, step.wasteKg))
	end
	table.insert(lines, string.format("  TOTAL: In=%.3f  Out=%.3f  Waste=%.3f  Loss=%.3f  Recovery=%.1f%%",
		balance.inputKg, balance.outputKg, balance.wasteKg, balance.lossKg, balance.recovery))
	return table.concat(lines, "\n")
end

return ProcessEngineering
