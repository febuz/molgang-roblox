-- ServerScriptService/Core/ANKLending.server.lua
-- ANK Cooperative Lending System for MOLGANG
-- Players lend MolCoins to other players via the ANK cooperative model
-- NOW WITH ACTUAL CURRENCY MOVEMENT via PlayerDataBridge
-- Interest: 5% per game-day (10 real minutes = 1 game-day in OTAP)
-- Collateral: borrower must stake 120% MolCoin value
-- ANK fee: 1% of loan goes to non-profit treasury

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreProvider = require(ReplicatedStorage.Modules.DataStoreProvider)
local Players = game:GetService("Players")

local Remotes = require(ReplicatedStorage.Remotes.RemoteSetup)
local PlayerDataBridge = require(script.Parent.PlayerDataBridge)
local GameClock = require(ReplicatedStorage.Modules.GameClock)

-- ══════════════════════════════════════════════
-- CONFIGURATION
-- ══════════════════════════════════════════════

local INTEREST_RATE = 0.05
local COLLATERAL_RATIO = 1.2
local ANK_FEE = 0.01
local MIN_LOAN = 100
local MAX_LOAN = 10000
local MAX_ACTIVE_LOANS = 3
local GAME_DAY_SECONDS = GameClock.DAY_SECONDS

-- ══════════════════════════════════════════════
-- STATE
-- ══════════════════════════════════════════════

local activeLoans = {}
local treasuryBalance = 0
local loanCounter = 0

local loanStore = DataStoreProvider.GetDataStore("ANK_Loans_v1")
local treasuryStore = DataStoreProvider.GetDataStore("ANK_Treasury_v1")

local function finite(value)
	return type(value) == "number" and value == value and value > -math.huge and value < math.huge
end

local function restoreLoansForPlayer(userId)
	local data = PlayerDataBridge.GetEconomyData(userId)
	local savedLoans = data and data.ankLoans
	if type(savedLoans) ~= "table" then return end
	for key, saved in pairs(savedLoans) do
		if type(saved) == "table" then
			local loanId = type(saved.id) == "string" and saved.id or (type(key) == "string" and key or nil)
			if loanId and (saved.status == "active" or saved.status == "repaid" or saved.status == "liquidated")
				and finite(saved.borrowerId) and finite(saved.lenderId)
				and finite(saved.amount) and saved.amount >= 0
				and finite(saved.collateral) and saved.collateral >= 0
				and finite(saved.totalRepay) and saved.totalRepay >= 0
				and finite(saved.dueAt) and saved.dueAt >= 0 then
				saved.id = loanId
				if saved.status == "active" then
					activeLoans[loanId] = saved
				end
			end
		end
	end
end

local function persistLoanForParties(loan)
	for _, userId in ipairs({loan.borrowerId, loan.lenderId}) do
		local data = PlayerDataBridge.GetEconomyData(userId)
		if data then
			if type(data.ankLoans) ~= "table" then data.ankLoans = {} end
			data.ankLoans[loan.id] = loan
		end
	end
end

local function restoreWhenLoaded(player)
	task.spawn(function()
		for _ = 1, 30 do
			if PlayerDataBridge.GetEconomyData(player.UserId) then
				restoreLoansForPlayer(player.UserId)
				return
			end
			task.wait(1)
		end
	end)
end

for _, player in ipairs(Players:GetPlayers()) do restoreWhenLoaded(player) end
Players.PlayerAdded:Connect(restoreWhenLoaded)

-- ══════════════════════════════════════════════
-- LOAN REQUEST — actually moves MolCoins now
-- ══════════════════════════════════════════════

local function requestLoan(borrower, lenderId, amount, duration)
	if type(amount) ~= "number" or type(duration) ~= "number" or amount ~= amount or duration ~= duration or amount == math.huge or duration == math.huge or amount == -math.huge or duration == -math.huge then
		return false, "Invalid input types"
	end

	amount = math.floor(amount)
	duration = math.clamp(math.floor(duration), 1, 30)
	restoreLoansForPlayer(borrower.UserId)

	if amount < MIN_LOAN then return false, "Minimum loan: " .. MIN_LOAN .. " MolCoins" end
	if amount > MAX_LOAN then return false, "Maximum loan: " .. MAX_LOAN .. " MolCoins" end

	-- Count borrower's active loans
	local borrowerLoans = 0
	for _, loan in pairs(activeLoans) do
		if loan.borrowerId == borrower.UserId and loan.status == "active" then
			borrowerLoans = borrowerLoans + 1
		end
	end
	if borrowerLoans >= MAX_ACTIVE_LOANS then
		return false, "Max " .. MAX_ACTIVE_LOANS .. " active loans"
	end

	-- Find lender
	local lender = nil
	for _, p in ipairs(Players:GetPlayers()) do
		if p.UserId == lenderId then lender = p; break end
	end
	if not lender then return false, "Lender not online" end
	if lender.UserId == borrower.UserId then return false, "Cannot lend to yourself" end
	restoreLoansForPlayer(lender.UserId)

	-- Calculate finances
	local required = math.ceil(amount * COLLATERAL_RATIO)
	local totalInterest = math.ceil(amount * INTEREST_RATE * duration)
	local ankFee = math.ceil(amount * ANK_FEE)
	local totalRepay = amount + totalInterest

	-- ═══ ACTUAL CURRENCY MOVEMENT ═══

	-- 1. Check lender has enough MolCoins to lend
	local lenderData = PlayerDataBridge.GetEconomyData(lender.UserId)
	if not lenderData or (lenderData.molCoins or 0) < amount then
		return false, "Lender has insufficient MolCoins"
	end

	-- 2. Check borrower has enough MolCoins for collateral
	local borrowerData = PlayerDataBridge.GetEconomyData(borrower.UserId)
	if not borrowerData or (borrowerData.molCoins or 0) < required then
		return false, "Need " .. required .. " MolCoins as collateral (120%)"
	end

	-- 3. Deduct collateral from borrower
	local ok1, _ = PlayerDataBridge.SpendMolCoins(borrower.UserId, required)
	if not ok1 then return false, "Failed to stake collateral" end

	-- 4. Deduct loan amount from lender
	local ok2, _ = PlayerDataBridge.SpendMolCoins(lender.UserId, amount)
	if not ok2 then
		-- Rollback borrower collateral
		PlayerDataBridge.AddMolCoins(borrower.UserId, required)
		return false, "Failed to deduct from lender"
	end

	-- 5. Transfer loan amount to borrower
	PlayerDataBridge.AddMolCoins(borrower.UserId, amount)

	-- 6. Deduct ANK fee from the loan (taken from interest pool)
	treasuryBalance = treasuryBalance + ankFee

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
	persistLoanForParties(loan)

	-- Notify both parties
	Remotes.FireClient("LoanCreated", borrower, {
		loanId = loanId, role = "borrower", amount = amount,
		collateral = required, totalRepay = totalRepay,
		dueAt = loan.dueAt, lenderName = lender.Name,
	})
	Remotes.FireClient("LoanCreated", lender, {
		loanId = loanId, role = "lender", amount = amount,
		interest = totalInterest, dueAt = loan.dueAt,
		borrowerName = borrower.Name,
	})

	pcall(function() loanStore:SetAsync(loanId, loan) end)
	return true, loanId
end

-- ══════════════════════════════════════════════
-- REPAY — returns collateral, pays lender principal+interest
-- ══════════════════════════════════════════════

local function repayLoan(player, loanId)
	if type(loanId) ~= "string" then return false, "Invalid loan ID" end

	local loan = activeLoans[loanId]
	if not loan then return false, "Loan not found" end
	if loan.status ~= "active" then return false, "Loan not active" end
	if loan.borrowerId ~= player.UserId then return false, "Only borrower can repay" end

	-- Check borrower can afford repayment
	local borrowerData = PlayerDataBridge.GetEconomyData(player.UserId)
	if not borrowerData or (borrowerData.molCoins or 0) < loan.totalRepay then
		return false, "Need " .. loan.totalRepay .. " MolCoins to repay"
	end

	-- 1. Deduct repayment from borrower
	local ok, _ = PlayerDataBridge.SpendMolCoins(player.UserId, loan.totalRepay)
	if not ok then return false, "Repayment failed" end

	-- 2. Return principal + interest to lender
	PlayerDataBridge.AddMolCoins(loan.lenderId, loan.amount + loan.interest - loan.ankFee)

	-- 3. Return collateral to borrower
	PlayerDataBridge.AddMolCoins(player.UserId, loan.collateral)

	loan.status = "repaid"
	loan.repaidAt = os.time()
	persistLoanForParties(loan)

	-- Notify
	Remotes.FireClient("LoanRepaid", player, {
		loanId = loanId, amount = loan.totalRepay,
		collateralReturned = loan.collateral,
	})
	for _, p in ipairs(Players:GetPlayers()) do
		if p.UserId == loan.lenderId then
			Remotes.FireClient("LoanRepaid", p, {
				loanId = loanId, amount = loan.amount + loan.interest,
				borrowerName = loan.borrowerName,
			})
			break
		end
	end

	pcall(function() loanStore:SetAsync(loanId, loan) end)
	return true
end

-- ══════════════════════════════════════════════
-- AUTO-LIQUIDATION — collateral goes to lender
-- ══════════════════════════════════════════════

local function checkOverdueLoans()
	local now = os.time()
	for loanId, loan in pairs(activeLoans) do
		if loan.status == "active" and now > loan.dueAt then
			loan.status = "liquidated"
			loan.liquidatedAt = now
			persistLoanForParties(loan)

			-- Transfer collateral to lender (borrower loses it)
			PlayerDataBridge.AddMolCoins(loan.lenderId, loan.collateral)

			for _, p in ipairs(Players:GetPlayers()) do
				if p.UserId == loan.borrowerId then
					Remotes.FireClient("ServerAnnounce", p, {
						message = "Loan LIQUIDATED! You lost " .. loan.collateral .. " MolCoins collateral.",
						rarity = "epic",
					})
				end
				if p.UserId == loan.lenderId then
					Remotes.FireClient("LoanRepaid", p, {
						loanId = loanId, amount = loan.collateral,
						borrowerName = loan.borrowerName, liquidated = true,
					})
				end
			end

			pcall(function() loanStore:SetAsync(loanId, loan) end)
		end
	end
end

-- ══════════════════════════════════════════════
-- REMOTE HANDLERS
-- ══════════════════════════════════════════════

Remotes.RequestLoan.OnServerEvent:Connect(function(player, lenderId, amount, duration)
	local success, result = requestLoan(player, lenderId, amount, duration)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Loan denied: " .. result, rarity = "common",
		})
	end
end)

Remotes.RequestRepayLoan.OnServerEvent:Connect(function(player, loanId)
	local success, err = repayLoan(player, loanId)
	if not success then
		Remotes.FireClient("ServerAnnounce", player, {
			message = "Repay failed: " .. err, rarity = "common",
		})
	end
end)

-- ══════════════════════════════════════════════
-- SCHEDULED
-- ══════════════════════════════════════════════

task.spawn(function()
	while true do
		task.wait(GAME_DAY_SECONDS)
		checkOverdueLoans()
	end
end)

task.spawn(function()
	while true do
		task.wait(300)
		pcall(function() treasuryStore:SetAsync("balance", treasuryBalance) end)
	end
end)

pcall(function()
	local saved = treasuryStore:GetAsync("balance")
	if saved then treasuryBalance = saved end
end)

game:BindToClose(function()
	pcall(function() treasuryStore:SetAsync("balance", treasuryBalance) end)
end)

print("[MOLGANG] ANKLending initialized — Treasury:", treasuryBalance, "MC")
