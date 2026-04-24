-- ReplicatedStorage/Modules/Chemistry.lua
-- Chemische bindingsregels en molecule synthese voor MOLGANG

local Chemistry = {}

-- Valentieschema (vereenvoudigd voor game)
Chemistry.Valence = {
	H = 1, O = 2, N = 3, C = 4, Ca = 2, Fe = 2, S = 2, Cl = 1,
	Si = 4, V = 5, Al = 3, Na = 1, K = 1, Mg = 2, P = 3, F = 1,
	Br = 1, I = 1, Ti = 4, Cr = 3, Mn = 2, Co = 2, Ni = 2, Cu = 2,
	Zn = 2, Ag = 1, Au = 3, Pt = 4, Li = 1, Be = 2, B = 3,
}

-- Geldige moleculen met punten
-- atoms = {sym = count}, points = MolCoins reward
Chemistry.Molecules = {
	-- Basis moleculen (common)
	H2O   = {atoms = {H = 2, O = 1}, points = 100,  name = 'Water',              color = Color3.fromRGB(68, 136, 255)},
	CO2   = {atoms = {C = 1, O = 2}, points = 150,  name = 'Kooldioxide',        color = Color3.fromRGB(100, 100, 100)},
	NH3   = {atoms = {N = 1, H = 3}, points = 120,  name = 'Ammoniak',           color = Color3.fromRGB(68, 200, 136)},
	O2    = {atoms = {O = 2},        points = 80,   name = 'Zuurstof',           color = Color3.fromRGB(255, 100, 100)},
	N2    = {atoms = {N = 2},        points = 80,   name = 'Stikstof',           color = Color3.fromRGB(136, 68, 255)},
	H2    = {atoms = {H = 2},        points = 60,   name = 'Waterstof',          color = Color3.fromRGB(255, 200, 200)},
	NaCl  = {atoms = {Na = 1, Cl = 1}, points = 100, name = 'Keukenzout',        color = Color3.fromRGB(255, 255, 255)},
	HCl   = {atoms = {H = 1, Cl = 1}, points = 90,  name = 'Zoutzuur',          color = Color3.fromRGB(200, 255, 68)},

	-- Intermediate moleculen (uncommon)
	CaCO3 = {atoms = {Ca = 1, C = 1, O = 3}, points = 300,  name = 'Calciet',    color = Color3.fromRGB(255, 230, 200)},
	SiO2  = {atoms = {Si = 1, O = 2},        points = 200,  name = 'Kwarts',     color = Color3.fromRGB(200, 200, 255)},
	Fe2O3 = {atoms = {Fe = 2, O = 3},        points = 350,  name = 'Hematiet',   color = Color3.fromRGB(180, 60, 40)},
	CH4   = {atoms = {C = 1, H = 4},         points = 150,  name = 'Methaan',    color = Color3.fromRGB(100, 200, 100)},
	C2H6  = {atoms = {C = 2, H = 6},         points = 200,  name = 'Ethaan',     color = Color3.fromRGB(120, 220, 120)},
	H2SO4 = {atoms = {H = 2, S = 1, O = 4},  points = 400,  name = 'Zwavelzuur', color = Color3.fromRGB(255, 200, 0)},
	NaOH  = {atoms = {Na = 1, O = 1, H = 1}, points = 180,  name = 'Natronloog', color = Color3.fromRGB(255, 255, 200)},
	MgO   = {atoms = {Mg = 1, O = 1},        points = 160,  name = 'Magnesiumoxide', color = Color3.fromRGB(230, 230, 230)},
	CaO   = {atoms = {Ca = 1, O = 1},        points = 180,  name = 'Ongebluste kalk', color = Color3.fromRGB(240, 240, 220)},
	KOH   = {atoms = {K = 1, O = 1, H = 1},  points = 170,  name = 'Kaliloog',   color = Color3.fromRGB(255, 240, 200)},

	-- Advanced moleculen (rare - Slakkenspoor producten)
	V2O5  = {atoms = {V = 2, O = 5},         points = 1000, name = 'Vanadium Pentoxide', color = Color3.fromRGB(255, 215, 0)},
	TiO2  = {atoms = {Ti = 1, O = 2},        points = 500,  name = 'Titaniumdioxide',   color = Color3.fromRGB(255, 255, 255)},
	Al2O3 = {atoms = {Al = 2, O = 3},        points = 450,  name = 'Aluminiumoxide',    color = Color3.fromRGB(200, 200, 220)},
	Cr2O3 = {atoms = {Cr = 2, O = 3},        points = 600,  name = 'Chroomoxide',       color = Color3.fromRGB(68, 200, 68)},
	MnO2  = {atoms = {Mn = 1, O = 2},        points = 400,  name = 'Mangaandioxide',    color = Color3.fromRGB(50, 50, 50)},
	FeTiO3 = {atoms = {Fe = 1, Ti = 1, O = 3}, points = 700, name = 'Ilmeniet',         color = Color3.fromRGB(40, 40, 60)},
	CaSiO3 = {atoms = {Ca = 1, Si = 1, O = 3}, points = 500, name = 'Wollastoniet',     color = Color3.fromRGB(220, 220, 200)},

	-- Biologische moleculen (epic)
	C6H12O6 = {atoms = {C = 6, H = 12, O = 6}, points = 800,  name = 'Glucose',    color = Color3.fromRGB(255, 200, 100)},
	C2H5OH  = {atoms = {C = 2, H = 6, O = 1},  points = 350,  name = 'Ethanol',    color = Color3.fromRGB(200, 255, 200)},

	-- Additional molecules (#83 — expanded chemistry)
	CaCl2   = {atoms = {Ca = 1, Cl = 2},        points = 160,  name = 'Calcium Chloride', color = Color3.fromRGB(240, 240, 250)},
	FeCl3   = {atoms = {Fe = 1, Cl = 3},        points = 280,  name = 'Iron(III) Chloride', color = Color3.fromRGB(160, 100, 40)},
	Na2SO4  = {atoms = {Na = 2, S = 1, O = 4},  points = 300,  name = 'Sodium Sulfate',  color = Color3.fromRGB(240, 240, 220)},
	KCl     = {atoms = {K = 1, Cl = 1},         points = 110,  name = 'Potassium Chloride', color = Color3.fromRGB(250, 245, 240)},
	MgCl2   = {atoms = {Mg = 1, Cl = 2},        points = 150,  name = 'Magnesium Chloride', color = Color3.fromRGB(230, 230, 235)},
	P2O5    = {atoms = {P = 2, O = 5},          points = 400,  name = 'Phosphorus Pentoxide', color = Color3.fromRGB(255, 220, 200)},
	SO3     = {atoms = {S = 1, O = 3},          points = 250,  name = 'Sulfur Trioxide', color = Color3.fromRGB(230, 220, 180)},
	NO2     = {atoms = {N = 1, O = 2},          points = 200,  name = 'Nitrogen Dioxide', color = Color3.fromRGB(180, 120, 60)},
	HNO3    = {atoms = {H = 1, N = 1, O = 3},   points = 350,  name = 'Nitric Acid',     color = Color3.fromRGB(255, 240, 100)},
	CuSO4   = {atoms = {Cu = 1, S = 1, O = 4},  points = 450,  name = 'Copper Sulfate',  color = Color3.fromRGB(60, 120, 255)},
	ZnO     = {atoms = {Zn = 1, O = 1},         points = 200,  name = 'Zinc Oxide',      color = Color3.fromRGB(245, 245, 245)},
	AgNO3   = {atoms = {Ag = 1, N = 1, O = 3},  points = 600,  name = 'Silver Nitrate',  color = Color3.fromRGB(220, 220, 220)},
	LiOH    = {atoms = {Li = 1, O = 1, H = 1},  points = 180,  name = 'Lithium Hydroxide', color = Color3.fromRGB(250, 250, 255)},
	BeCl2   = {atoms = {Be = 1, Cl = 2},        points = 220,  name = 'Beryllium Chloride', color = Color3.fromRGB(200, 210, 200)},
	B2O3    = {atoms = {B = 2, O = 3},          points = 300,  name = 'Boron Trioxide',  color = Color3.fromRGB(230, 230, 240)},
	NiO     = {atoms = {Ni = 1, O = 1},         points = 250,  name = 'Nickel Oxide',    color = Color3.fromRGB(140, 180, 140)},
	CoO     = {atoms = {Co = 1, O = 1},         points = 280,  name = 'Cobalt Oxide',    color = Color3.fromRGB(60, 80, 160)},
	PtCl4   = {atoms = {Pt = 1, Cl = 4},        points = 900,  name = 'Platinum Chloride', color = Color3.fromRGB(210, 210, 220)},
	AuCl3   = {atoms = {Au = 1, Cl = 3},        points = 1200, name = 'Gold Chloride',   color = Color3.fromRGB(255, 215, 0)},
	NH4Cl   = {atoms = {N = 1, H = 4, Cl = 1},  points = 160,  name = 'Ammonium Chloride', color = Color3.fromRGB(255, 255, 255)},

	-- Speciale Molgang moleculen (legendary)
	MolCrystal = {atoms = {V = 1, Ti = 1, Fe = 1, Si = 1, O = 5}, points = 2000, name = 'MolKristal', color = Color3.fromRGB(255, 215, 100)},
}

-- Molecuulgewicht berekenen vanuit atoomlijst
function Chemistry.CalculateMolWeight(atomCounts)
	local Elements = require(script.Parent.Parent.Data.Elements)
	local total = 0
	for sym, count in pairs(atomCounts) do
		for z, elem in pairs(Elements.Table) do
			if elem.sym == sym then
				total = total + elem.mass * count
				break
			end
		end
	end
	return math.floor(total * 100) / 100
end

-- Probeer een molecuul te bouwen vanuit atoomcounts
-- Returns: moleculeName, recipe OF nil
function Chemistry.TryBuildMolecule(atomCounts)
	for molName, recipe in pairs(Chemistry.Molecules) do
		local match = true
		-- Check of alle benodigde atomen aanwezig zijn
		for sym, count in pairs(recipe.atoms) do
			if (atomCounts[sym] or 0) < count then
				match = false
				break
			end
		end
		-- Check of er geen extra atomen zijn (exacte match)
		if match then
			local extraAtoms = false
			for sym, count in pairs(atomCounts) do
				if not recipe.atoms[sym] or recipe.atoms[sym] ~= count then
					extraAtoms = true
					break
				end
			end
			if not extraAtoms then
				return molName, recipe
			end
		end
	end
	return nil, nil
end

-- Check of een combinatie gedeeltelijk geldig is (voor real-time feedback)
function Chemistry.IsPartialMatch(atomCounts)
	for molName, recipe in pairs(Chemistry.Molecules) do
		local couldMatch = true
		for sym, count in pairs(atomCounts) do
			if not recipe.atoms[sym] then
				couldMatch = false
				break
			end
			if count > recipe.atoms[sym] then
				couldMatch = false
				break
			end
		end
		if couldMatch then
			return true, molName
		end
	end
	return false, nil
end

-- Lijst van moleculen die een speler kan bouwen met huidige inventory
function Chemistry.GetBuildableMolecules(playerAtoms)
	local buildable = {}
	for molName, recipe in pairs(Chemistry.Molecules) do
		local canBuild = true
		for sym, count in pairs(recipe.atoms) do
			if (playerAtoms[sym] or 0) < count then
				canBuild = false
				break
			end
		end
		if canBuild then
			table.insert(buildable, {name = molName, recipe = recipe})
		end
	end
	table.sort(buildable, function(a, b) return a.recipe.points > b.recipe.points end)
	return buildable
end

return Chemistry
