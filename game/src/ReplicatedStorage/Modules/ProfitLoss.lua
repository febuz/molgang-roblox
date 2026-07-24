--[[
	ProfitLoss.lua
	MOLGANG — Profit & Loss Accounting for Entrepreneur Mode

	Tracks all income and expenses like real business accounting:
	- Revenue: product sales (V2O5, Fe2O3, TiO2), ore trading
	- COGS: raw slag purchase, reagent costs, mining equipment
	- OpEx: factory rent, equipment maintenance, power, labor
	- CapEx: equipment purchases, mining licenses
	- Profit: Revenue - COGS - OpEx

	Provides P&L statement and cash flow overview.
]]

local ProfitLoss = {}

-- ═══════════════════════════════════════════════
-- ACCOUNT CATEGORIES
-- ═══════════════════════════════════════════════

ProfitLoss.Categories = {
	-- Revenue
	revenue = {
		"product_sales",       -- V2O5, Fe, TiO2 product revenue
		"ore_sales",           -- raw ore trading
		"plot_sales",          -- mining plot sales
		"atom_collection",     -- atom collection bonuses
		"quest_rewards",       -- quest completion MolCoins
		"daily_claims",        -- daily login bonuses
		"mahjong_winnings",    -- mahjong game earnings
	},
	-- Cost of Goods Sold
	cogs = {
		"raw_slag_purchase",   -- buying slag from Velzen
		"reagent_costs",       -- H2SO4, HCl, NaOH, etc.
		"mining_fuel",         -- fuel for mining equipment
		"seeds",               -- crop seeds
	},
	-- Operating Expenses
	opex = {
		"factory_rent",        -- monthly factory hall rent
		"equipment_maintenance",-- monthly equipment upkeep
		"power_costs",         -- electricity for factory
		"mining_taxes",        -- monthly mining plot taxes
		"exploration_licenses",-- mining exploration costs
		"soil_tests",          -- farming soil analysis
		"trade_tax",           -- market tariffs and transaction fees
	},
	-- Capital Expenditures
	capex = {
		"equipment_purchase",  -- factory equipment bought
		"mining_equipment",    -- mining drills, excavators
		"facility_construction",-- mines, factories, labs, offices
	},
}

-- ═══════════════════════════════════════════════
-- LEDGER FUNCTIONS
-- ═══════════════════════════════════════════════

function ProfitLoss.CreateLedger()
	return {
		entries = {},           -- {timestamp, category, subcategory, amount, description}
		totals = {
			revenue = 0,
			cogs = 0,
			opex = 0,
			capex = 0,
		},
		grossProfit = 0,
		netProfit = 0,
		totalIncome = 0,
		totalExpenses = 0,
	}
end

function ProfitLoss.RecordTransaction(ledger, categoryType, subcategory, amount, description)
	table.insert(ledger.entries, {
		timestamp = os.time(),
		categoryType = categoryType,
		subcategory = subcategory,
		amount = amount,
		description = description or subcategory,
	})

	-- Update totals
	if categoryType == "revenue" then
		ledger.totals.revenue = ledger.totals.revenue + amount
		ledger.totalIncome = ledger.totalIncome + amount
	elseif categoryType == "cogs" then
		ledger.totals.cogs = ledger.totals.cogs + amount
		ledger.totalExpenses = ledger.totalExpenses + amount
	elseif categoryType == "opex" then
		ledger.totals.opex = ledger.totals.opex + amount
		ledger.totalExpenses = ledger.totalExpenses + amount
	elseif categoryType == "capex" then
		ledger.totals.capex = ledger.totals.capex + amount
		ledger.totalExpenses = ledger.totalExpenses + amount
	end

	-- Recalculate profit
	ledger.grossProfit = ledger.totals.revenue - ledger.totals.cogs
	ledger.netProfit = ledger.grossProfit - ledger.totals.opex

	return ledger
end

-- Generate P&L statement text
function ProfitLoss.GenerateStatement(ledger)
	local lines = {
		"═══ PROFIT & LOSS STATEMENT ═══",
		"",
		"REVENUE",
		"  Product Sales & Trading:  " .. ledger.totals.revenue .. " MC",
		"",
		"COST OF GOODS SOLD (COGS)",
		"  Raw materials & reagents: " .. ledger.totals.cogs .. " MC",
		"",
		"─────────────────────────────",
		"GROSS PROFIT:               " .. ledger.grossProfit .. " MC",
		"",
		"OPERATING EXPENSES (OpEx)",
		"  Rent, maintenance, power: " .. ledger.totals.opex .. " MC",
		"",
		"─────────────────────────────",
		"NET OPERATING PROFIT:       " .. ledger.netProfit .. " MC",
		"",
		"CAPITAL EXPENDITURES",
		"  Equipment & assets:       " .. ledger.totals.capex .. " MC",
		"",
		"═══════════════════════════════",
		"TOTAL INCOME:    " .. ledger.totalIncome .. " MC",
		"TOTAL EXPENSES:  " .. ledger.totalExpenses .. " MC",
		"NET CASH FLOW:   " .. (ledger.totalIncome - ledger.totalExpenses) .. " MC",
	}
	return table.concat(lines, "\n")
end

-- Get recent transactions (last N entries)
function ProfitLoss.GetRecent(ledger, count)
	local recent = {}
	local start = math.max(1, #ledger.entries - (count or 20) + 1)
	for i = start, #ledger.entries do
		table.insert(recent, ledger.entries[i])
	end
	return recent
end

-- Calculate profit margin percentage
function ProfitLoss.GetMargin(ledger)
	if ledger.totals.revenue <= 0 then return 0 end
	return math.floor(ledger.netProfit / ledger.totals.revenue * 100)
end

return ProfitLoss
