package economy

import (
	"fmt"
	"sync"
	"time"
)

const (
	DailyClaimAmount  = 50
	DailyClaimCooldown = 24 * time.Hour
	MaxDailyEarned    = 2000
)

// PlayerData holds per-player economy state (in-memory for web game).
type PlayerData struct {
	PlayerID       string
	Name           string
	MolCoins       int
	TotalEarned    int
	TotalSpent     int
	Atoms          map[string]int // symbol -> count
	Molecules      map[string]int // formula -> count
	ElementsFound  map[int]bool   // Z -> found
	MoleculesBuilt map[string]bool
	ChainEntries   int
	LastDailyClaim time.Time
	LoginStreak    int
	Badges         map[string]bool
	DailyEarned    int
	DailyReset     time.Time
	TxHistory      []Transaction
}

// Transaction records a MolCoin movement.
type Transaction struct {
	At     time.Time
	Amount int    // positive = credit, negative = debit
	Reason string
}

// Ledger manages all player balances concurrently.
type Ledger struct {
	mu      sync.RWMutex
	players map[string]*PlayerData
}

func NewLedger() *Ledger {
	return &Ledger{players: make(map[string]*PlayerData)}
}

// GetOrCreate returns a player's data, creating it if new.
func (l *Ledger) GetOrCreate(playerID, name string) *PlayerData {
	l.mu.Lock()
	defer l.mu.Unlock()
	p, ok := l.players[playerID]
	if !ok {
		p = &PlayerData{
			PlayerID:       playerID,
			Name:           name,
			MolCoins:       0,
			Atoms:          make(map[string]int),
			Molecules:      make(map[string]int),
			ElementsFound:  make(map[int]bool),
			MoleculesBuilt: make(map[string]bool),
			Badges:         make(map[string]bool),
			DailyReset:     time.Now().Add(24 * time.Hour),
		}
		l.players[playerID] = p
	}
	return p
}

// Get returns a player's data without creating (nil if missing).
func (l *Ledger) Get(playerID string) *PlayerData {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.players[playerID]
}

// Add credits MolCoins; respects daily cap. Returns (ok, err).
func (l *Ledger) Add(playerID string, amount int, reason string) (bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	p, ok := l.players[playerID]
	if !ok {
		return false, fmt.Errorf("player not found: %s", playerID)
	}
	l.resetDailyIfNeeded(p)
	if p.DailyEarned+amount > MaxDailyEarned {
		return false, fmt.Errorf("daily MolCoin cap reached")
	}
	p.MolCoins += amount
	p.TotalEarned += amount
	p.DailyEarned += amount
	p.TxHistory = append(p.TxHistory, Transaction{At: time.Now(), Amount: amount, Reason: reason})
	return true, nil
}

// Spend debits MolCoins. Returns (ok, err).
func (l *Ledger) Spend(playerID string, amount int, reason string) (bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	p, ok := l.players[playerID]
	if !ok {
		return false, fmt.Errorf("player not found: %s", playerID)
	}
	if p.MolCoins < amount {
		return false, fmt.Errorf("insufficient MolCoins: have %d, need %d", p.MolCoins, amount)
	}
	p.MolCoins -= amount
	p.TotalSpent += amount
	p.TxHistory = append(p.TxHistory, Transaction{At: time.Now(), Amount: -amount, Reason: reason})
	return true, nil
}

// AddAtom records an atom collection.
func (l *Ledger) AddAtom(playerID string, symbol string, z int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	p := l.players[playerID]
	if p == nil {
		return
	}
	p.Atoms[symbol]++
	p.ElementsFound[z] = true
}

// ConsumeAtomsForMolecule deducts atoms and records the molecule build.
// Returns false if player lacks atoms.
func (l *Ledger) ConsumeAtomsForMolecule(playerID string, recipe map[string]int, formula string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	p := l.players[playerID]
	if p == nil {
		return false
	}
	for sym, need := range recipe {
		if p.Atoms[sym] < need {
			return false
		}
	}
	for sym, need := range recipe {
		p.Atoms[sym] -= need
		if p.Atoms[sym] == 0 {
			delete(p.Atoms, sym)
		}
	}
	p.Molecules[formula]++
	p.MoleculesBuilt[formula] = true
	p.ChainEntries++
	return true
}

// DailyClaim attempts a daily MolCoin claim. Returns (amount, ok, nextClaimAt).
func (l *Ledger) DailyClaim(playerID string) (int, bool, time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()
	p := l.players[playerID]
	if p == nil {
		return 0, false, time.Time{}
	}
	now := time.Now()
	if !p.LastDailyClaim.IsZero() && now.Sub(p.LastDailyClaim) < DailyClaimCooldown {
		return 0, false, p.LastDailyClaim.Add(DailyClaimCooldown)
	}
	streakBonus := p.LoginStreak * 10
	if streakBonus > 100 {
		streakBonus = 100
	}
	total := DailyClaimAmount + streakBonus
	p.MolCoins += total
	p.TotalEarned += total
	p.LastDailyClaim = now
	p.TxHistory = append(p.TxHistory, Transaction{At: now, Amount: total, Reason: "daily_claim"})
	return total, true, now.Add(DailyClaimCooldown)
}

// Leaderboard returns top-N players sorted by a given category.
func (l *Ledger) Leaderboard(category string, limit int) []LeaderboardEntry {
	l.mu.RLock()
	defer l.mu.RUnlock()

	entries := make([]LeaderboardEntry, 0, len(l.players))
	for _, p := range l.players {
		var score int
		switch category {
		case "molcoins":
			score = p.MolCoins
		case "molecules":
			score = len(p.MoleculesBuilt)
		case "elements":
			score = len(p.ElementsFound)
		case "quiz":
			if p.Badges["QuizMaster_3"] {
				score = 1
			}
		default:
			score = p.TotalEarned
		}
		entries = append(entries, LeaderboardEntry{
			PlayerID: p.PlayerID,
			Name:     p.Name,
			Score:    score,
		})
	}
	sortLeaderboard(entries)
	if limit > 0 && len(entries) > limit {
		entries = entries[:limit]
	}
	return entries
}

// LeaderboardEntry is a single leaderboard row.
type LeaderboardEntry struct {
	Rank     int    `json:"rank"`
	PlayerID string `json:"playerId"`
	Name     string `json:"name"`
	Score    int    `json:"score"`
}

func sortLeaderboard(entries []LeaderboardEntry) {
	for i := 1; i < len(entries); i++ {
		for j := i; j > 0 && entries[j].Score > entries[j-1].Score; j-- {
			entries[j], entries[j-1] = entries[j-1], entries[j]
		}
	}
	for i := range entries {
		entries[i].Rank = i + 1
	}
}

func (l *Ledger) resetDailyIfNeeded(p *PlayerData) {
	if time.Now().After(p.DailyReset) {
		p.DailyEarned = 0
		p.DailyReset = time.Now().Add(24 * time.Hour)
	}
}
