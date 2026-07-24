--[[
	ANKLending.lua
	MOLGANG Cooperative Lending System

	ANK (Kredietunie) = Cooperative lending union
	- Borrow MolCoins at 5% interest
	- 120% collateral required (lock up assets)
	- Auto-liquidation if collateral drops below 120%
	- Repay anytime before maturity
]]

local ANKLending = {}
local GameClock = require(script.Parent.GameClock)
local GAME_DAY_SECONDS = GameClock.DAY_SECONDS
local DAILY_INTEREST_RATE = 0.05

-- ═══════════════════════════════════════════════
-- LOAN STRUCTURE
-- ═══════════════════════════════════════════════

function ANKLending.CreateLoan(borrowerId, lenderId, principal, duration)
	local now = os.time()
	return {
		id = game:GetService("HttpService"):GenerateGUID(false),
		borrower = borrowerId,
		lender = lenderId,
		principal = principal,
		interest = math.floor(principal * DAILY_INTEREST_RATE * duration),
		total = principal + math.floor(principal * DAILY_INTEREST_RATE * duration),
		collateral = math.floor(principal * 1.2),  -- 120% collateral required
		created = now,
		due = now + (duration * GAME_DAY_SECONDS), -- duration in game-days → OTAP seconds
		repaid = false,
		status = "active",
	}
end

-- ═══════════════════════════════════════════════
-- VALIDATION
-- ═══════════════════════════════════════════════

function ANKLending.CanBorrow(playerData, loanAmount)
	-- Need 120% collateral (liquid MolCoins + assets)
	local collateralRequired = loanAmount * 1.2
	local availableCollateral = playerData.molCoins or 0

	-- Could also count atoms/molecules as collateral, but for MVP just MolCoins
	return availableCollateral >= collateralRequired, collateralRequired - availableCollateral
end

function ANKLending.CanRepay(playerData, loan)
	-- Need to repay total (principal + interest)
	return (playerData.molCoins or 0) >= loan.total
end

-- ═══════════════════════════════════════════════
-- INTEREST CALCULATION
-- ═══════════════════════════════════════════════

function ANKLending.CalculateInterest(loan, daysLended)
	-- OTAP uses 5% per in-game day, matching the server settlement rule.
	return math.floor(loan.principal * DAILY_INTEREST_RATE * daysLended)
end

-- ═══════════════════════════════════════════════
-- LOAN STATUS
-- ═══════════════════════════════════════════════

function ANKLending.GetLoanStatus(loan)
	local now = os.time()
	local daysRemaining = math.ceil((loan.due - now) / GAME_DAY_SECONDS)

	return {
		id = loan.id,
		principal = loan.principal,
		totalDue = loan.total,
		collateral = loan.collateral,
		daysRemaining = daysRemaining,
		isOverdue = now > loan.due and not loan.repaid,
		status = loan.status,
	}
end

-- ═══════════════════════════════════════════════
-- DEFAULT & LIQUIDATION
-- ═══════════════════════════════════════════════

function ANKLending.ShouldLiquidate(playerData, loan)
	-- If collateral drops below 120%, trigger liquidation
	local currentCollateral = playerData.molCoins or 0
	return currentCollateral < loan.collateral
end

function ANKLending.GetPresets()
	-- Preset loan amounts for quick selection
	return {
		{name = "Starter",  amount = 1000,  duration = 7},
		{name = "Growth",   amount = 5000,  duration = 14},
		{name = "Factory",  amount = 10000, duration = 30},
	}
end

return ANKLending
