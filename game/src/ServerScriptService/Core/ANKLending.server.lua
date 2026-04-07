-- ServerScriptService/Core/ANKLending.server.lua
-- ANK Cooperative Lending System for MOLGANG
-- Players lend MolCoins to other players via the ANK cooperative model
-- Interest: 5% per game-day (1 hour real-time = 1 game-day)
-- Collateral: borrower must stake 120% MolCoin value in atoms
-- ANK fee: 1% of loan goes to non-profit treasury (educational prizes)

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)

-- ══════════════════════════════════════════════
-- CONFIGURATION
-- ══════════════════════════════════════════════

local INTEREST_RATE = 0.05      -- 5% per game-day (1 hour real-time)
local COLLATERAL_RATIO = 1.2    -- 120% collateral required
local ANK_FEE = 0.01            -- 1% to non-profit treasury
local MIN_LOAN = 100            -- minimum 100 MolCoins
local MAX_LOAN = 10000          -- maximum 10,000 MolCoins
local MAX_ACTIVE_LOANS = 3      -- max 3 simultaneous loans per player
local GAME_DAY_SECONDS = 3600   -- 1 hour = 1 game day

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local activeLoans = {}          -- {loanId = loanData}
local treasuryBalance = 0       -- ANK treasury for educational prizes
local loanCounter = 0

-- DataStore for persistent loan tracking
local loanStore = DataStoreService:GetDataStore("ANK_Loans_v1")
local treasuryStore = DataStoreService:GetDataStore("ANK_Treasury_v1")

-- ══════════════════════════════════════════════
-- LOAN REQUEST HANDLER
-- ══════════════════════════════════════════════

local function requestLoan(borrower, lenderId, amount, duration)
	-- Validate input types
	if type(amount) ~= "number" or type(duration) ~= "number" then
		return false, "Invalid input types"
	end

	-- Clamp values
	amount = math.floor(amount)
	duration = math.clamp(math.floor(duration), 1, 30) -- 1-30 game days

	-- Validate loan amount
	if amount < MIN_LOAN then
		return false, "Minimum loan: " .. MIN_LOAN .. " MolCoins"
	end
	if amount > MAX_LOAN then
		return false, "Maximum loan: " .. MAX_LOAN .. " MolCoins"
	end

	-- Check borrower's active loans
	local borrowerLoans = 0
	for _, loan in pairs(activeLoans) do
		if loan.borrowerId == borrower.UserId and loan.status == "active" then
			borrowerLoans = borrowerLoans + 1
		end
	end
	if borrowerLoans >= MAX_ACTIVE_LOANS then
		return false, "Max " .. MAX_ACTIVE_LOANS .. " active loans allowed"
	end

	-- Calculate required collateral
	local required = math.ceil(amount * COLLATERAL_RATIO)

	-- Calculate total interest
	local totalInterest = math.ceil(amount * INTEREST_RATE * duration)
	local ankFee = math.ceil(amount * ANK_FEE)
	local totalRepay = amount + totalInterest

	-- Find lender player
	local lender = nil
	for _, p in ipairs(Players:GetPlayers()) do
		if p.UserId == lenderId then
			lender = p
			break
		end
	end

	if not lender then
		return false, "Lender not found on server"
	end

	if lender.UserId == borrower.UserId then
		return false, "Cannot lend to yourself"
	end

	-- Create loan record
	loanCounter = loanCounter + 1
	local loanId = tostring(os.time()) .. "_" .. tostring(borrower.UserId) .. "_" .. tostring(loanCounter)

	local loan = {
		id = loanId,
		borrowerId = borrower.UserId,
		borrowerName = borrower.Name,
		lenderId = lender.UserId,
		lenderName = lender.Name,
		amount = amount,
		collateral = required,
		interest = totalInterest,
		ankFee = ankFee,
		totalRepay = totalRepay,
		duration = duration,
		createdAt = os.time(),
		dueAt = os.time() + (duration * GAME_DAY_SECONDS),
		status = "active",
	}

	activeLoans[loanId] = loan

	-- Add ANK fee to treasury
	treasuryBalance = treasuryBalance + ankFee

	-- Notify both parties
	Remotes.FireClient("LoanCreated", borrower, {
		loanId = loanId,
		role = "borrower",
		amount = amount,
		collateral = required,
		totalRepay = totalRepay,
		dueAt = loan.dueAt,
		lenderName = lender.Name,
	})

	Remotes.FireClient("LoanCreated", lender, {
		loanId = loanId,
		role = "lender",
		amount = amount,
		interest = totalInterest,
		dueAt = loan.dueAt,
		borrowerName = borrower.Name,
	})

	-- Save to DataStore
	pcall(function()
		loanStore:SetAsync(loanId, loan)
	end)

	return true, loanId
end

-- ══════════════════════════════════════════════
-- REPAY LOAN HANDLER
-- ══════════════════════════════════════════════

local function repayLoan(player, loanId)
	if type(loanId) ~= "string" then return false, "Invalid loan ID" end

	local loan = activeLoans[loanId]
	if not loan then return false, "Loan not found" end

	if loan.status ~= "active" then
		return false, "Loan is not active"
	end

	-- Only borrower can repay
	if loan.borrowerId ~= player.UserId then
		return false, "Only the borrower can repay"
	end

	-- Mark as repaid
	loan.status = "repaid"
	loan.repaidAt = os.time()

	-- Notify both parties
	Remotes.FireClient("LoanRepaid", player, {
		loanId = loanId,
		amount = loan.totalRepay,
		collateralReturned = loan.collateral,
	})

	-- Find lender
	for _, p in ipairs(Players:GetPlayers()) do
		if p.UserId == loan.lenderId then
			Remotes.FireClient("LoanRepaid", p, {
				loanId = loanId,
				amount = loan.amount + loan.interest,
				borrowerName = loan.borrowerName,
			})
			break
		end
	end

	-- Update DataStore
	pcall(function()
		loanStore:SetAsync(loanId, loan)
	end)

	return true
end

-- ══════════════════════════════════════════════
-- AUTO-LIQUIDATION CHECK
-- Runs every game-day to check for overdue loans
-- ══════════════════════════════════════════════

local function checkOverdueLoans()
	local now = os.time()
	for loanId, loan in pairs(activeLoans) do
		if loan.status == "active" and now > loan.dueAt then
			-- Loan overdue! Auto-liquidate
			loan.status = "liquidated"
			loan.liquidatedAt = now

			-- Collateral goes to lender
			-- Find borrower and lender
			for _, p in ipairs(Players:GetPlayers()) do
				if p.UserId == loan.borrowerId then
					Remotes.FireClient("ServerAnnounce", p, {
						message = "Your loan of " .. loan.amount .. " MolCoins has been liquidated!",
						rarity = "epic",
					})
				end
				if p.UserId == loan.lenderId then
					Remotes.FireClient("LoanRepaid", p, {
						loanId = loanId,
						amount = loan.collateral,
						borrowerName = loan.borrowerName,
						liquidated = true,
					})
				end
			end

			-- Update DataStore
			pcall(function()
				loanStore:SetAsync(loanId, loan)
			end)
		end
	end
end

-- ══════════════════════════════════════════════
-- REMOTE EVENT HANDLERS
-- ══════════════════════════════════════════════

Remotes.RequestLoan.OnServerEvent:Connect(function(player, lenderId, amount, duration)
	local success, result = requestLoan(player, lenderId, amount, duration)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Loan denied: " .. result,
			rarity = "common",
		})
	end
end)

Remotes.RequestRepayLoan.OnServerEvent:Connect(function(player, loanId)
	local success, err = repayLoan(player, loanId)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Repay failed: " .. err,
			rarity = "common",
		})
	end
end)

-- ══════════════════════════════════════════════
-- SCHEDULED TASKS
-- ══════════════════════════════════════════════

-- Check overdue loans every game-day
task.spawn(function()
	while true do
		task.wait(GAME_DAY_SECONDS)
		checkOverdueLoans()
	end
end)

-- Save treasury balance periodically
task.spawn(function()
	while true do
		task.wait(300) -- every 5 minutes
		pcall(function()
			treasuryStore:SetAsync("balance", treasuryBalance)
		end)
	end
end)

-- Load treasury on start
pcall(function()
	local saved = treasuryStore:GetAsync("balance")
	if saved then
		treasuryBalance = saved
	end
end)

print("[MOLGANG] ANKLending initialized - Treasury:", treasuryBalance, "MolCoins")
