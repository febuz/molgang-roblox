package elements

import (
	"math"
	"math/rand"
	"sync"
	"time"
)

// ActiveAtom represents a live atom in the world.
type ActiveAtom struct {
	ID        string
	ElementZ  int
	Symbol    string
	Name      string
	Rarity    string
	X, Y, Z  float64
	Zone      string
	SpawnedAt time.Time
}

// SpawnEvent is sent via channel when an atom spawns or despawns.
type SpawnEvent struct {
	Type     string      // "spawn" | "despawn"
	Atom     *ActiveAtom
}

// Spawner manages the atom spawn lifecycle for all zones.
type Spawner struct {
	mu          sync.RWMutex
	elements    []Element
	zones       []Zone
	byZ         map[int]*Element
	active      map[string]*ActiveAtom
	Events      chan SpawnEvent
	atomCounter int
	maxAtoms    int
	lifetime    time.Duration
}

func NewSpawner(elems []Element, zones []Zone) *Spawner {
	byZ := make(map[int]*Element, len(elems))
	for i := range elems {
		byZ[elems[i].Z] = &elems[i]
	}
	return &Spawner{
		elements: elems,
		zones:    zones,
		byZ:      byZ,
		active:   make(map[string]*ActiveAtom),
		Events:   make(chan SpawnEvent, 256),
		maxAtoms: 500,
		lifetime: 120 * time.Second,
	}
}

// Run starts the spawn and cleanup loops. Call in a goroutine.
func (s *Spawner) Run() {
	spawnTick := time.NewTicker(30 * time.Second)
	cleanTick := time.NewTicker(10 * time.Second)
	defer spawnTick.Stop()
	defer cleanTick.Stop()

	// initial burst
	s.spawnWave(30)

	for {
		select {
		case <-spawnTick.C:
			s.spawnWave(10)
		case <-cleanTick.C:
			s.cleanExpired()
		}
	}
}

// GetActive returns a snapshot of all active atoms.
func (s *Spawner) GetActive() []*ActiveAtom {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*ActiveAtom, 0, len(s.active))
	for _, a := range s.active {
		out = append(out, a)
	}
	return out
}

// Collect removes an atom by ID and returns it (nil if not found).
func (s *Spawner) Collect(atomID string) *ActiveAtom {
	s.mu.Lock()
	defer s.mu.Unlock()
	atom, ok := s.active[atomID]
	if !ok {
		return nil
	}
	delete(s.active, atomID)
	s.Events <- SpawnEvent{Type: "despawn", Atom: atom}
	return atom
}

func (s *Spawner) spawnWave(limit int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.active) >= s.maxAtoms {
		return
	}
	toSpawn := min(limit, s.maxAtoms-len(s.active))
	for i := 0; i < toSpawn; i++ {
		zone := s.pickZone()
		if zone == nil {
			continue
		}
		elem := s.pickElement(zone)
		if elem == nil {
			continue
		}
		x, y, z := randomPositionInZone(zone)
		s.atomCounter++
		id := atomID(elem.Sym, s.atomCounter)
		atom := &ActiveAtom{
			ID:        id,
			ElementZ:  elem.Z,
			Symbol:    elem.Sym,
			Name:      elem.Name,
			Rarity:    elem.Rarity,
			X:         x,
			Y:         y,
			Z:         z,
			Zone:      zone.ID,
			SpawnedAt: time.Now(),
		}
		s.active[id] = atom
		s.Events <- SpawnEvent{Type: "spawn", Atom: atom}
	}
}

func (s *Spawner) cleanExpired() {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for id, atom := range s.active {
		if now.Sub(atom.SpawnedAt) > s.lifetime {
			delete(s.active, id)
			s.Events <- SpawnEvent{Type: "despawn", Atom: atom}
		}
	}
}

func (s *Spawner) pickZone() *Zone {
	total := 0.0
	for _, z := range s.zones {
		total += z.SpawnWeight
	}
	roll := rand.Float64() * total
	cum := 0.0
	for i := range s.zones {
		cum += s.zones[i].SpawnWeight
		if roll <= cum {
			return &s.zones[i]
		}
	}
	return &s.zones[0]
}

func (s *Spawner) pickElement(zone *Zone) *Element {
	// build weighted list
	type candidate struct {
		elem   *Element
		weight float64
	}
	slagSet := make(map[int]bool)
	for _, z := range zone.SlagElements {
		slagSet[z] = true
	}

	candidates := make([]candidate, 0, len(s.elements))
	total := 0.0
	for i := range s.elements {
		e := &s.elements[i]
		w := SpawnWeights[e.Rarity]
		if zone.SlagBoost && slagSet[e.Z] {
			w *= 5
		}
		if zone.QuantumBoost && (e.Rarity == "rare" || e.Rarity == "epic" || e.Rarity == "legendary") {
			w *= 3
		}
		total += w
		candidates = append(candidates, candidate{e, w})
	}

	roll := rand.Float64() * total
	cum := 0.0
	for _, c := range candidates {
		cum += c.weight
		if roll <= cum {
			return c.elem
		}
	}
	return &s.elements[0]
}

func randomPositionInZone(z *Zone) (x, y, zPos float64) {
	angle := rand.Float64() * 2 * math.Pi
	dist := rand.Float64() * z.Radius
	return z.CenterX + math.Cos(angle)*dist,
		z.CenterY + float64(rand.Intn(8)-2),
		z.CenterZ + math.Sin(angle)*dist
}

func atomID(sym string, counter int) string {
	return "Atom_" + sym + "_" + itoa(counter)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	buf := [20]byte{}
	pos := 20
	for n > 0 {
		pos--
		buf[pos] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[pos:])
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
