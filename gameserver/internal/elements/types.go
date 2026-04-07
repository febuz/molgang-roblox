package elements

import (
	"encoding/json"
	"os"
)

type Element struct {
	Z       int      `json:"z"`
	Name    string   `json:"name"`
	Sym     string   `json:"sym"`
	Mass    float64  `json:"mass"`
	Group   int      `json:"group"`
	Period  int      `json:"period"`
	Rarity  string   `json:"rarity"`
	ColorR  int      `json:"colorR"`
	ColorG  int      `json:"colorG"`
	ColorB  int      `json:"colorB"`
	Facts   []string `json:"facts"`
}

type Zone struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Theme         string  `json:"theme"`
	Description   string  `json:"description"`
	CenterX       float64 `json:"centerX"`
	CenterY       float64 `json:"centerY"`
	CenterZ       float64 `json:"centerZ"`
	Radius        float64 `json:"radius"`
	SpawnWeight   float64 `json:"spawnWeight"`
	SlagBoost     bool    `json:"slagBoost"`
	QuantumBoost  bool    `json:"quantumBoost"`
	SlagElements  []int   `json:"slagElements,omitempty"`
	SpawnRatePerMin int   `json:"spawnRatePerMin"`
}

// SpawnWeights maps rarity to relative weight.
var SpawnWeights = map[string]float64{
	"common":    60,
	"uncommon":  25,
	"rare":      10,
	"epic":      4,
	"legendary": 1,
}

// CoinRewards maps rarity to MolCoin reward on collection.
var CoinRewards = map[string]int{
	"common":    1,
	"uncommon":  3,
	"rare":      10,
	"epic":      25,
	"legendary": 100,
}

func LoadElements(path string) ([]Element, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var elems []Element
	if err := json.Unmarshal(data, &elems); err != nil {
		return nil, err
	}
	return elems, nil
}

func LoadZones(path string) ([]Zone, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var zones []Zone
	if err := json.Unmarshal(data, &zones); err != nil {
		return nil, err
	}
	return zones, nil
}
