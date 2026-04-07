package quiz

import (
	"encoding/json"
	"math/rand"
	"os"
	"sync"
	"time"
)

// Question is a single quiz entry from quiz.json.
type Question struct {
	Question   string   `json:"question"`
	Correct    string   `json:"correct"`
	Options    []string `json:"options"`
	Difficulty int      `json:"difficulty"`
	Zone       string   `json:"zone"`
	Type       string   `json:"type"`
}

// Session tracks one player's active quiz run.
type Session struct {
	PlayerID  string
	Questions []sessionQ
	Index     int
	Score     int
	StartedAt time.Time
}

type sessionQ struct {
	Question string
	Options  []string
	Correct  string
}

// AnswerResult is returned when a player submits an answer.
type AnswerResult struct {
	Correct    bool
	Answer     string
	QuizDone   bool
	FinalScore int // only set when QuizDone
	Reward     int // MolCoins earned this question
}

// Manager handles quiz sessions for all players.
type Manager struct {
	mu       sync.Mutex
	bank     []Question
	sessions map[string]*Session // playerID -> session
}

func LoadManager(path string) (*Manager, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var questions []Question
	if err := json.Unmarshal(data, &questions); err != nil {
		return nil, err
	}
	return &Manager{
		bank:     questions,
		sessions: make(map[string]*Session),
	}, nil
}

// Start creates a quiz session for a player in a given zone.
// Returns nil if already in a session.
func (m *Manager) Start(playerID, zone string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.sessions[playerID]; exists {
		return nil
	}

	pool := m.questionsForZone(zone)
	if len(pool) < 3 {
		pool = m.bank
	}

	// Pick 3 unique questions
	picked := pickN(pool, 3)
	qs := make([]sessionQ, len(picked))
	for i, q := range picked {
		opts := shuffledOptions(q.Options)
		qs[i] = sessionQ{
			Question: q.Question,
			Options:  opts,
			Correct:  q.Correct,
		}
	}

	sess := &Session{
		PlayerID:  playerID,
		Questions: qs,
		Index:     0,
		StartedAt: time.Now(),
	}
	m.sessions[playerID] = sess
	return sess
}

// CurrentQuestion returns the current question for a session, or nil if done/not started.
func (m *Manager) CurrentQuestion(playerID string) *sessionQ {
	m.mu.Lock()
	defer m.mu.Unlock()
	sess := m.sessions[playerID]
	if sess == nil || sess.Index >= len(sess.Questions) {
		return nil
	}
	q := sess.Questions[sess.Index]
	return &q
}

// Answer processes the player's answer. Returns AnswerResult.
func (m *Manager) Answer(playerID, answer string) AnswerResult {
	m.mu.Lock()
	defer m.mu.Unlock()

	sess := m.sessions[playerID]
	if sess == nil {
		return AnswerResult{}
	}
	if sess.Index >= len(sess.Questions) {
		return AnswerResult{QuizDone: true, FinalScore: sess.Score}
	}

	// 30 second per-question timeout
	if time.Since(sess.StartedAt) > time.Duration(sess.Index+1)*30*time.Second {
		sess.Index++
	} else {
		current := sess.Questions[sess.Index]
		correct := answer == current.Correct
		reward := 0
		if correct {
			sess.Score++
			reward = 10
		}
		sess.Index++
		if sess.Index >= len(sess.Questions) {
			// Quiz complete
			bonus := 0
			if sess.Score == 3 {
				bonus = 25
			}
			delete(m.sessions, playerID)
			return AnswerResult{
				Correct:    correct,
				Answer:     current.Correct,
				QuizDone:   true,
				FinalScore: sess.Score,
				Reward:     reward + bonus,
			}
		}
		return AnswerResult{
			Correct: correct,
			Answer:  current.Correct,
			Reward:  reward,
		}
	}

	return AnswerResult{}
}

// EndSession removes a session (e.g. player disconnect).
func (m *Manager) EndSession(playerID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, playerID)
}

func (m *Manager) questionsForZone(zone string) []Question {
	out := make([]Question, 0)
	for _, q := range m.bank {
		if q.Zone == zone || q.Zone == "any" || q.Zone == "biome" {
			out = append(out, q)
		}
	}
	return out
}

func pickN(pool []Question, n int) []Question {
	indices := rand.Perm(len(pool))
	if n > len(pool) {
		n = len(pool)
	}
	out := make([]Question, n)
	for i := 0; i < n; i++ {
		out[i] = pool[indices[i]]
	}
	return out
}

func shuffledOptions(opts []string) []string {
	out := make([]string, len(opts))
	copy(out, opts)
	rand.Shuffle(len(out), func(i, j int) { out[i], out[j] = out[j], out[i] })
	return out
}
