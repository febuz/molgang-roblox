package chemistry

import (
	"encoding/json"
	"os"
)

// Molecule represents a buildable molecule recipe.
type Molecule struct {
	Formula string         `json:"formula"`
	Name    string         `json:"name"`
	Atoms   map[string]int `json:"atoms"`
	Points  int            `json:"points"`
	Rarity  string         `json:"rarity"`
	ColorR  int            `json:"colorR"`
	ColorG  int            `json:"colorG"`
	ColorB  int            `json:"colorB"`
}

// BuildResult is returned by TryBuild.
type BuildResult struct {
	Success  bool
	Formula  string
	Name     string
	Points   int
	Rarity   string
}

// Registry holds all molecule recipes.
type Registry struct {
	molecules []Molecule
}

func LoadRegistry(path string) (*Registry, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var mols []Molecule
	if err := json.Unmarshal(data, &mols); err != nil {
		return nil, err
	}
	return &Registry{molecules: mols}, nil
}

// All returns all molecule definitions (for REST API).
func (r *Registry) All() []Molecule {
	return r.molecules
}

// TryBuild checks if atomCounts exactly matches a recipe.
// atomCounts: map[symbol]count from player inventory slot.
func (r *Registry) TryBuild(atomCounts map[string]int) BuildResult {
	for _, mol := range r.molecules {
		if exactMatch(mol.Atoms, atomCounts) {
			return BuildResult{
				Success: true,
				Formula: mol.Formula,
				Name:    mol.Name,
				Points:  mol.Points,
				Rarity:  mol.Rarity,
			}
		}
	}
	return BuildResult{}
}

// CanBuild checks if the player inventory has enough atoms for a recipe.
func (r *Registry) CanBuild(formula string, inventory map[string]int) bool {
	for _, mol := range r.molecules {
		if mol.Formula != formula {
			continue
		}
		for sym, need := range mol.Atoms {
			if (inventory[sym]) < need {
				return false
			}
		}
		return true
	}
	return false
}

// BuildableList returns all molecules the player can currently build.
func (r *Registry) BuildableList(inventory map[string]int) []Molecule {
	out := make([]Molecule, 0)
	for _, mol := range r.molecules {
		canBuild := true
		for sym, need := range mol.Atoms {
			if inventory[sym] < need {
				canBuild = false
				break
			}
		}
		if canBuild {
			out = append(out, mol)
		}
	}
	return out
}

// Recipe returns the recipe for a formula (nil if unknown).
func (r *Registry) Recipe(formula string) *Molecule {
	for i := range r.molecules {
		if r.molecules[i].Formula == formula {
			return &r.molecules[i]
		}
	}
	return nil
}

func exactMatch(recipe, provided map[string]int) bool {
	if len(recipe) != len(provided) {
		return false
	}
	for sym, need := range recipe {
		if provided[sym] != need {
			return false
		}
	}
	return true
}
