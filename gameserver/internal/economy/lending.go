package economy

import (
	"fmt"
	"sync"
	"time"
)

const (
	InterestRate      = 0.05  // 5% per game-day
	CollateralRatio   = 1.20  // 120%
	ANKFeeRate        = 0.01  // 1%
	MinLoan           = 100
	MaxLoan           = 10000
	MaxActiveLoans    = 3
	GameDaySeconds    = 3600 * time.Second
)

// Loan represents an active ANK lending agreement.
type Loan struct {
	ID           string    `json:"id"`
	BorrowerID   string    `json:"borrowerId"`
	BorrowerName string    `json:"borrowerName"`
	LenderID     string    `json:"lenderId"`
	LenderName   string    `json:"lenderName"`
	Amount       int       `json:"amount"`
	Collateral   int       `json:"collateral"`
	Interest     int       `json:"interest"`
	ANKFee       int       `json:"ankFee"`
	TotalRepay   int       `json:"totalRepay"`
	Duration     int       `json:"duration"` // game-days
	CreatedAt    time.Time `json:"createdAt"`
	DueAt        time.Time `json:"dueAt"`
	Status       string    `json:"status"` // active | repaid | liquidated
	RepaidAt     *time.Time `json:"repaidAt,omitempty"`
}

// LendingBook manages all ANK loans.
type LendingBook struct {
	mu             sync.RWMutex
	loans          map[string]*Loan
	counter        int
	ledger         *Ledger
	TreasuryBalance int
}

func NewLendingBook(ledger *Ledger) *LendingBook {
	return &LendingBook{
		loans:  make(map[string]*Loan),
		ledger: ledger,
	}
}

// RequestLoan creates a new loan; moves MolCoins between parties.
func (b *LendingBook) RequestLoan(borrowerID, borrowerName, lenderID, lenderName string, amount, duration int) (*Loan, error) {
	if amount < MinLoan {
		return nil, fmt.Errorf("minimum loan is %d MolCoins", MinLoan)
	}
	if amount > MaxLoan {
		return nil, fmt.Errorf("maximum loan is %d MolCoins", MaxLoan)
	}
	if duration < 1 || duration > 30 {
		return nil, fmt.Errorf("duration must be 1-30 game-days")
	}
	if borrowerID == lenderID {
		return nil, fmt.Errorf("cannot lend to yourself")
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	// Count borrower's active loans
	activeBorrower := 0
	for _, l := range b.loans {
		if l.BorrowerID == borrowerID && l.Status == "active" {
			activeBorrower++
		}
	}
	if activeBorrower >= MaxActiveLoans {
		return nil, fmt.Errorf("max %d active loans per borrower", MaxActiveLoans)
	}

	collateral := int(float64(amount) * CollateralRatio)
	interest := int(float64(amount) * InterestRate * float64(duration))
	ankFee := int(float64(amount) * ANKFeeRate)
	totalRepay := amount + interest

	// Stake collateral from borrower
	if ok, err := b.ledger.Spend(borrowerID, collateral, "loan_collateral"); !ok {
		return nil, fmt.Errorf("borrower collateral: %w", err)
	}
	// Deduct principal from lender
	if ok, err := b.ledger.Spend(lenderID, amount, "loan_principal_out"); !ok {
		// rollback collateral
		b.ledger.Add(borrowerID, collateral, "loan_collateral_rollback") //nolint
		return nil, fmt.Errorf("lender funds: %w", err)
	}
	// Credit principal to borrower
	b.ledger.Add(borrowerID, amount, "loan_principal_received") //nolint

	b.TreasuryBalance += ankFee
	b.counter++
	id := fmt.Sprintf("LOAN-%d-%s", b.counter, borrowerID[:min8(borrowerID)])

	loan := &Loan{
		ID:           id,
		BorrowerID:   borrowerID,
		BorrowerName: borrowerName,
		LenderID:     lenderID,
		LenderName:   lenderName,
		Amount:       amount,
		Collateral:   collateral,
		Interest:     interest,
		ANKFee:       ankFee,
		TotalRepay:   totalRepay,
		Duration:     duration,
		CreatedAt:    time.Now(),
		DueAt:        time.Now().Add(GameDaySeconds * time.Duration(duration)),
		Status:       "active",
	}
	b.loans[id] = loan
	return loan, nil
}

// RepayLoan handles principal+interest repayment by the borrower.
func (b *LendingBook) RepayLoan(borrowerID, loanID string) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	loan, ok := b.loans[loanID]
	if !ok {
		return fmt.Errorf("loan not found: %s", loanID)
	}
	if loan.Status != "active" {
		return fmt.Errorf("loan is not active (status: %s)", loan.Status)
	}
	if loan.BorrowerID != borrowerID {
		return fmt.Errorf("only the borrower can repay")
	}

	if ok, err := b.ledger.Spend(borrowerID, loan.TotalRepay, "loan_repayment"); !ok {
		return fmt.Errorf("repayment failed: %w", err)
	}
	// Return principal+interest-fee to lender
	b.ledger.Add(loan.LenderID, loan.Amount+loan.Interest-loan.ANKFee, "loan_repayment_received") //nolint
	// Return collateral to borrower
	b.ledger.Add(borrowerID, loan.Collateral, "loan_collateral_returned") //nolint

	now := time.Now()
	loan.Status = "repaid"
	loan.RepaidAt = &now
	return nil
}

// CheckOverdue liquidates past-due loans; call on a schedule.
func (b *LendingBook) CheckOverdue() []string {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	var liquidated []string
	for id, loan := range b.loans {
		if loan.Status == "active" && now.After(loan.DueAt) {
			loan.Status = "liquidated"
			// Transfer collateral to lender
			b.ledger.Add(loan.LenderID, loan.Collateral, "loan_liquidation") //nolint
			liquidated = append(liquidated, id)
		}
	}
	return liquidated
}

// GetLoans returns loans for a player (as borrower or lender).
func (b *LendingBook) GetLoans(playerID string) []*Loan {
	b.mu.RLock()
	defer b.mu.RUnlock()
	out := make([]*Loan, 0)
	for _, l := range b.loans {
		if l.BorrowerID == playerID || l.LenderID == playerID {
			out = append(out, l)
		}
	}
	return out
}

// RunLiquidationLoop checks overdue loans every game-day.
func (b *LendingBook) RunLiquidationLoop() {
	t := time.NewTicker(GameDaySeconds)
	defer t.Stop()
	for range t.C {
		b.CheckOverdue()
	}
}

func min8(s string) int {
	if len(s) < 8 {
		return len(s)
	}
	return 8
}
