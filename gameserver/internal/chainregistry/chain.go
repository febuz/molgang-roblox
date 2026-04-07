package chainregistry

import (
	"fmt"
	"sync"
	"time"
)

// ChainEntry represents a simulated XRPL molecule registration.
type ChainEntry struct {
	TxHash     string         `json:"txHash"`
	PlayerID   string         `json:"playerId"`
	PlayerName string         `json:"playerName"`
	Formula    string         `json:"formula"`
	MolName    string         `json:"molName"`
	Atoms      map[string]int `json:"atoms"`
	RegisteredAt time.Time    `json:"registeredAt"`
	BlockHeight  int          `json:"blockHeight"`
}

// Registry stores simulated XRPL chain events.
type Registry struct {
	mu      sync.RWMutex
	entries []*ChainEntry
	block   int
	Events  chan *ChainEntry
}

func NewRegistry() *Registry {
	return &Registry{
		entries: make([]*ChainEntry, 0, 1000),
		block:   1000000,
		Events:  make(chan *ChainEntry, 128),
	}
}

// Register records a new molecule on the simulated chain.
func (r *Registry) Register(playerID, playerName, formula, molName string, atoms map[string]int) *ChainEntry {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.block++
	entry := &ChainEntry{
		TxHash:       generateTxHash(playerID, formula, r.block),
		PlayerID:     playerID,
		PlayerName:   playerName,
		Formula:      formula,
		MolName:      molName,
		Atoms:        atoms,
		RegisteredAt: time.Now(),
		BlockHeight:  r.block,
	}
	r.entries = append(r.entries, entry)
	r.Events <- entry
	return entry
}

// Recent returns the N most recent chain entries.
func (r *Registry) Recent(n int) []*ChainEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if n <= 0 || n > len(r.entries) {
		n = len(r.entries)
	}
	start := len(r.entries) - n
	out := make([]*ChainEntry, n)
	copy(out, r.entries[start:])
	return out
}

// PlayerEntries returns all entries for a player.
func (r *Registry) PlayerEntries(playerID string) []*ChainEntry {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]*ChainEntry, 0)
	for _, e := range r.entries {
		if e.PlayerID == playerID {
			out = append(out, e)
		}
	}
	return out
}

// BlockHeight returns the current simulated block height.
func (r *Registry) BlockHeight() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.block
}

func generateTxHash(playerID, formula string, block int) string {
	// Deterministic fake XRPL-style hash
	seed := fmt.Sprintf("%s%s%d%d", playerID, formula, block, time.Now().UnixNano())
	return fmt.Sprintf("XRPL%X", simpleHash(seed))
}

func simpleHash(s string) uint64 {
	var h uint64 = 14695981039346656037
	for i := 0; i < len(s); i++ {
		h ^= uint64(s[i])
		h *= 1099511628211
	}
	return h
}
