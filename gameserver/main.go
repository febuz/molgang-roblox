// gameserver/main.go
// MOLGANG Nexus World — Go game server
// Provides WebSocket game protocol + REST API for the Three.js web client.
//
// WebSocket events (server → client):
//   atom_spawn         — new atom appeared in world
//   atom_collected     — atom was collected (broadcast)
//   molecule_build_result — result of build attempt
//   quiz_question      — next quiz question
//   quiz_result        — quiz session result
//   economy_update     — player balance changed
//   chain_entry        — new molecule registered on MolChain
//
// WebSocket events (client → server):
//   atom_collect       — player collects an atom {atomId}
//   molecule_build     — player attempts to build {atoms: {sym:count}}
//   quiz_start         — player starts quiz {zone}
//   quiz_answer        — player answers {answer}
//   daily_claim        — player claims daily reward
//
// REST:
//   GET  /api/elements
//   GET  /api/leaderboard?category=molcoins|molecules|elements|quiz
//   GET  /api/chain/recent?limit=50
//   POST /api/economy/lend
//   POST /api/economy/repay
//   GET  /health

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"runtime"
	"strconv"

	"github.com/gorilla/websocket"

	"github.com/febuz/molgang-roblox/gameserver/internal/chainregistry"
	"github.com/febuz/molgang-roblox/gameserver/internal/chemistry"
	"github.com/febuz/molgang-roblox/gameserver/internal/economy"
	"github.com/febuz/molgang-roblox/gameserver/internal/elements"
	"github.com/febuz/molgang-roblox/gameserver/internal/quiz"
	"github.com/febuz/molgang-roblox/gameserver/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// ── Server state ────────────────────────────────────────────────────────────

type Server struct {
	hub      *ws.Hub
	spawner  *elements.Spawner
	chem     *chemistry.Registry
	ledger   *economy.Ledger
	lending  *economy.LendingBook
	quizMgr  *quiz.Manager
	chain    *chainregistry.Registry
	elems    []elements.Element
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	dataDir := flag.String("data", dataPath(), "path to data/ directory")
	flag.Parse()

	srv, err := newServer(*dataDir)
	if err != nil {
		log.Fatalf("init: %v", err)
	}

	go srv.hub.Run()
	go srv.spawner.Run()
	go srv.lending.RunLiquidationLoop()
	go srv.forwardSpawnEvents()
	go srv.forwardChainEvents()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", srv.handleWS)
	mux.HandleFunc("/api/elements", srv.handleElements)
	mux.HandleFunc("/api/leaderboard", srv.handleLeaderboard)
	mux.HandleFunc("/api/chain/recent", srv.handleChainRecent)
	mux.HandleFunc("/api/economy/lend", srv.handleLend)
	mux.HandleFunc("/api/economy/repay", srv.handleRepay)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","goroutines":%d}`, runtime.NumGoroutine())
	})

	log.Printf("[MOLGANG] gameserver listening on %s (data=%s)", *addr, *dataDir)
	log.Fatal(http.ListenAndServe(*addr, corsMiddleware(mux)))
}

func newServer(dataDir string) (*Server, error) {
	elems, err := elements.LoadElements(filepath.Join(dataDir, "elements.json"))
	if err != nil {
		return nil, fmt.Errorf("load elements: %w", err)
	}
	zones, err := elements.LoadZones(filepath.Join(dataDir, "zones.json"))
	if err != nil {
		return nil, fmt.Errorf("load zones: %w", err)
	}
	chem, err := chemistry.LoadRegistry(filepath.Join(dataDir, "molecules.json"))
	if err != nil {
		return nil, fmt.Errorf("load molecules: %w", err)
	}
	quizMgr, err := quiz.LoadManager(filepath.Join(dataDir, "quiz.json"))
	if err != nil {
		return nil, fmt.Errorf("load quiz: %w", err)
	}
	ledger := economy.NewLedger()
	srv := &Server{
		hub:     ws.NewHub(),
		spawner: elements.NewSpawner(elems, zones),
		chem:    chem,
		ledger:  ledger,
		lending: economy.NewLendingBook(ledger),
		quizMgr: quizMgr,
		chain:   chainregistry.NewRegistry(),
		elems:   elems,
	}
	log.Printf("[MOLGANG] loaded %d elements, %d molecules, %d zones", len(elems), len(chem.All()), len(zones))
	return srv, nil
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	playerID := r.URL.Query().Get("playerId")
	playerName := r.URL.Query().Get("name")
	if playerID == "" {
		http.Error(w, "playerId required", http.StatusBadRequest)
		return
	}
	if playerName == "" {
		playerName = playerID
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade error: %v", err)
		return
	}

	// Ensure player exists in ledger
	s.ledger.GetOrCreate(playerID, playerName)

	client := ws.NewClient(playerID, s.hub, conn, s.handleClientMessage)
	client.Start()

	// Send initial economy state
	pd := s.ledger.Get(playerID)
	if pd != nil {
		s.hub.Send(playerID, "economy_update", map[string]any{
			"molCoins":      pd.MolCoins,
			"totalEarned":   pd.TotalEarned,
			"elementsFound": len(pd.ElementsFound),
			"molsBuilt":     len(pd.MoleculesBuilt),
			"chainEntries":  pd.ChainEntries,
		})
	}

	// Send currently active atoms
	for _, atom := range s.spawner.GetActive() {
		s.hub.Send(playerID, "atom_spawn", map[string]any{
			"id":       atom.ID,
			"elementZ": atom.ElementZ,
			"symbol":   atom.Symbol,
			"name":     atom.Name,
			"rarity":   atom.Rarity,
			"x":        atom.X,
			"y":        atom.Y,
			"z":        atom.Z,
			"zone":     atom.Zone,
		})
	}

	log.Printf("[ws] player connected: %s (%s)", playerName, playerID)
}

func (s *Server) handleClientMessage(playerID string, msg ws.Msg) {
	switch msg.Type {
	case "atom_collect":
		s.onAtomCollect(playerID, msg.Payload)
	case "molecule_build":
		s.onMoleculeBuild(playerID, msg.Payload)
	case "quiz_start":
		s.onQuizStart(playerID, msg.Payload)
	case "quiz_answer":
		s.onQuizAnswer(playerID, msg.Payload)
	case "daily_claim":
		s.onDailyClaim(playerID)
	}
}

// ── Game event handlers ──────────────────────────────────────────────────────

func (s *Server) onAtomCollect(playerID string, raw json.RawMessage) {
	var req struct {
		AtomID string `json:"atomId"`
	}
	if err := json.Unmarshal(raw, &req); err != nil || req.AtomID == "" {
		return
	}

	atom := s.spawner.Collect(req.AtomID)
	if atom == nil {
		s.hub.Send(playerID, "atom_collect_failed", map[string]any{
			"atomId": req.AtomID,
			"reason": "atom not found",
		})
		return
	}

	reward := elements.CoinRewards[atom.Rarity]
	s.ledger.AddAtom(playerID, atom.Symbol, atom.ElementZ)
	s.ledger.Add(playerID, reward, "atom_collect") //nolint

	pd := s.ledger.Get(playerID)

	s.hub.Send(playerID, "atom_collected", map[string]any{
		"atomId":   atom.ID,
		"elementZ": atom.ElementZ,
		"symbol":   atom.Symbol,
		"name":     atom.Name,
		"rarity":   atom.Rarity,
		"reward":   reward,
	})
	s.hub.Send(playerID, "economy_update", economyPayload(pd))

	// Broadcast rare+ finds to all
	if atom.Rarity == "epic" || atom.Rarity == "legendary" {
		name := playerID
		if pd != nil {
			name = pd.Name
		}
		s.hub.Broadcast("server_announce", map[string]any{
			"message": fmt.Sprintf("%s found %s (%s)!", name, atom.Name, atom.Symbol),
			"rarity":  atom.Rarity,
		})
	}
}

func (s *Server) onMoleculeBuild(playerID string, raw json.RawMessage) {
	var req struct {
		Atoms map[string]int `json:"atoms"`
	}
	if err := json.Unmarshal(raw, &req); err != nil || len(req.Atoms) == 0 {
		return
	}

	result := s.chem.TryBuild(req.Atoms)
	if !result.Success {
		s.hub.Send(playerID, "molecule_build_result", map[string]any{
			"success": false,
			"reason":  "no matching recipe",
		})
		return
	}

	recipe := s.chem.Recipe(result.Formula)
	if recipe == nil {
		return
	}

	if !s.ledger.ConsumeAtomsForMolecule(playerID, recipe.Atoms, result.Formula) {
		s.hub.Send(playerID, "molecule_build_result", map[string]any{
			"success": false,
			"reason":  "insufficient atoms",
		})
		return
	}

	s.ledger.Add(playerID, result.Points, "molecule_build") //nolint

	pd := s.ledger.Get(playerID)
	name := playerID
	if pd != nil {
		name = pd.Name
	}

	// Register on MolChain
	entry := s.chain.Register(playerID, name, result.Formula, result.Name, recipe.Atoms)

	s.hub.Send(playerID, "molecule_build_result", map[string]any{
		"success": true,
		"formula": result.Formula,
		"name":    result.Name,
		"points":  result.Points,
		"rarity":  result.Rarity,
		"txHash":  entry.TxHash,
		"block":   entry.BlockHeight,
	})
	s.hub.Send(playerID, "economy_update", economyPayload(pd))
	s.hub.Broadcast("server_announce", map[string]any{
		"message": fmt.Sprintf("%s built %s!", name, result.Name),
		"rarity":  result.Rarity,
	})
}

func (s *Server) onQuizStart(playerID string, raw json.RawMessage) {
	var req struct {
		Zone string `json:"zone"`
	}
	if err := json.Unmarshal(raw, &req); err != nil {
		req.Zone = "biome"
	}
	if req.Zone == "" {
		req.Zone = "biome"
	}

	sess := s.quizMgr.Start(playerID, req.Zone)
	if sess == nil {
		s.hub.Send(playerID, "quiz_error", map[string]any{"reason": "already in quiz"})
		return
	}

	q := s.quizMgr.CurrentQuestion(playerID)
	if q == nil {
		return
	}
	s.hub.Send(playerID, "quiz_question", map[string]any{
		"questionNum":    1,
		"totalQuestions": 3,
		"question":       q.Question,
		"options":        q.Options,
		"timeLimit":      30,
	})
}

func (s *Server) onQuizAnswer(playerID string, raw json.RawMessage) {
	var req struct {
		Answer string `json:"answer"`
	}
	if err := json.Unmarshal(raw, &req); err != nil || req.Answer == "" {
		return
	}

	res := s.quizMgr.Answer(playerID, req.Answer)
	if res.Reward > 0 {
		s.ledger.Add(playerID, res.Reward, "quiz") //nolint
	}

	if res.QuizDone {
		pd := s.ledger.Get(playerID)
		s.hub.Send(playerID, "quiz_result", map[string]any{
			"correct":    res.Correct,
			"answer":     res.Answer,
			"finalScore": res.FinalScore,
			"reward":     res.Reward,
		})
		s.hub.Send(playerID, "economy_update", economyPayload(pd))
	} else {
		s.hub.Send(playerID, "quiz_answer_ack", map[string]any{
			"correct": res.Correct,
			"answer":  res.Answer,
			"reward":  res.Reward,
		})
		// Send next question
		q := s.quizMgr.CurrentQuestion(playerID)
		if q != nil {
			s.hub.Send(playerID, "quiz_question", map[string]any{
				"question":  q.Question,
				"options":   q.Options,
				"timeLimit": 30,
			})
		}
	}
}

func (s *Server) onDailyClaim(playerID string) {
	amount, ok, nextAt := s.ledger.DailyClaim(playerID)
	if ok {
		pd := s.ledger.Get(playerID)
		s.hub.Send(playerID, "daily_claim_result", map[string]any{
			"success":     true,
			"amount":      amount,
			"nextClaimAt": nextAt.Unix(),
		})
		s.hub.Send(playerID, "economy_update", economyPayload(pd))
	} else {
		s.hub.Send(playerID, "daily_claim_result", map[string]any{
			"success":     false,
			"nextClaimAt": nextAt.Unix(),
		})
	}
}

// ── Background event forwarding ──────────────────────────────────────────────

func (s *Server) forwardSpawnEvents() {
	for ev := range s.spawner.Events {
		atom := ev.Atom
		if ev.Type == "spawn" {
			s.hub.Broadcast("atom_spawn", map[string]any{
				"id":       atom.ID,
				"elementZ": atom.ElementZ,
				"symbol":   atom.Symbol,
				"name":     atom.Name,
				"rarity":   atom.Rarity,
				"x":        atom.X,
				"y":        atom.Y,
				"z":        atom.Z,
				"zone":     atom.Zone,
			})
		} else {
			s.hub.Broadcast("atom_despawn", map[string]any{"id": atom.ID})
		}
	}
}

func (s *Server) forwardChainEvents() {
	for entry := range s.chain.Events {
		s.hub.Broadcast("chain_entry", map[string]any{
			"txHash":      entry.TxHash,
			"playerName":  entry.PlayerName,
			"formula":     entry.Formula,
			"molName":     entry.MolName,
			"blockHeight": entry.BlockHeight,
		})
	}
}

// ── REST handlers ─────────────────────────────────────────────────────────────

func (s *Server) handleElements(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, s.elems)
}

func (s *Server) handleLeaderboard(w http.ResponseWriter, r *http.Request) {
	cat := r.URL.Query().Get("category")
	if cat == "" {
		cat = "molcoins"
	}
	entries := s.ledger.Leaderboard(cat, 100)
	writeJSON(w, entries)
}

func (s *Server) handleChainRecent(w http.ResponseWriter, r *http.Request) {
	n := 50
	if ls := r.URL.Query().Get("limit"); ls != "" {
		if v, err := strconv.Atoi(ls); err == nil && v > 0 {
			n = v
		}
	}
	writeJSON(w, s.chain.Recent(n))
}

func (s *Server) handleLend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		BorrowerID   string `json:"borrowerId"`
		BorrowerName string `json:"borrowerName"`
		LenderID     string `json:"lenderId"`
		LenderName   string `json:"lenderName"`
		Amount       int    `json:"amount"`
		Duration     int    `json:"duration"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad JSON", http.StatusBadRequest)
		return
	}
	loan, err := s.lending.RequestLoan(
		req.BorrowerID, req.BorrowerName,
		req.LenderID, req.LenderName,
		req.Amount, req.Duration,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	// Notify both parties via WS
	s.hub.Send(req.BorrowerID, "loan_created", map[string]any{
		"loanId":     loan.ID,
		"role":       "borrower",
		"amount":     loan.Amount,
		"collateral": loan.Collateral,
		"totalRepay": loan.TotalRepay,
		"dueAt":      loan.DueAt.Unix(),
	})
	s.hub.Send(req.LenderID, "loan_created", map[string]any{
		"loanId":   loan.ID,
		"role":     "lender",
		"amount":   loan.Amount,
		"interest": loan.Interest,
		"dueAt":    loan.DueAt.Unix(),
	})
	writeJSON(w, loan)
}

func (s *Server) handleRepay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		BorrowerID string `json:"borrowerId"`
		LoanID     string `json:"loanId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad JSON", http.StatusBadRequest)
		return
	}
	if err := s.lending.RepayLoan(req.BorrowerID, req.LoanID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	pd := s.ledger.Get(req.BorrowerID)
	s.hub.Send(req.BorrowerID, "loan_repaid", map[string]any{"loanId": req.LoanID})
	s.hub.Send(req.BorrowerID, "economy_update", economyPayload(pd))
	writeJSON(w, map[string]any{"ok": true})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func economyPayload(pd *economy.PlayerData) map[string]any {
	if pd == nil {
		return map[string]any{}
	}
	return map[string]any{
		"molCoins":      pd.MolCoins,
		"totalEarned":   pd.TotalEarned,
		"elementsFound": len(pd.ElementsFound),
		"molsBuilt":     len(pd.MoleculesBuilt),
		"chainEntries":  pd.ChainEntries,
	}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		if r.Method == http.MethodOptions {
			return
		}
		next.ServeHTTP(w, r)
	})
}

// dataPath returns the data directory relative to this binary.
func dataPath() string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return "data"
	}
	return filepath.Join(filepath.Dir(file), "data")
}
