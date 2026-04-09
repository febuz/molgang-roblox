/**
 * web-game/src/utils/elements.ts
 * Minimal element data needed for web game rendering.
 * Full data is in Roblox: ReplicatedStorage/Data/Elements.lua
 * This only contains visual/display properties.
 */

export interface ElementInfo {
  z: number;
  symbol: string;
  name: string;
  mass: number;
  group: string;
}

// Subset: first 20 + notable elements for UI display
// Full 118-element array would be generated from Elements.lua data
const ELEMENTS: ElementInfo[] = [
  { z: 1,   symbol: "H",  name: "Hydrogen",    mass: 1.008,   group: "nonmetal"   },
  { z: 2,   symbol: "He", name: "Helium",       mass: 4.003,   group: "noble"      },
  { z: 3,   symbol: "Li", name: "Lithium",      mass: 6.941,   group: "alkali"     },
  { z: 4,   symbol: "Be", name: "Beryllium",    mass: 9.012,   group: "alkaline"   },
  { z: 5,   symbol: "B",  name: "Boron",        mass: 10.81,   group: "metalloid"  },
  { z: 6,   symbol: "C",  name: "Carbon",       mass: 12.01,   group: "nonmetal"   },
  { z: 7,   symbol: "N",  name: "Nitrogen",     mass: 14.01,   group: "nonmetal"   },
  { z: 8,   symbol: "O",  name: "Oxygen",       mass: 16.00,   group: "nonmetal"   },
  { z: 9,   symbol: "F",  name: "Fluorine",     mass: 19.00,   group: "halogen"    },
  { z: 10,  symbol: "Ne", name: "Neon",         mass: 20.18,   group: "noble"      },
  { z: 11,  symbol: "Na", name: "Sodium",       mass: 22.99,   group: "alkali"     },
  { z: 12,  symbol: "Mg", name: "Magnesium",    mass: 24.31,   group: "alkaline"   },
  { z: 13,  symbol: "Al", name: "Aluminium",    mass: 26.98,   group: "post-tran"  },
  { z: 14,  symbol: "Si", name: "Silicon",      mass: 28.09,   group: "metalloid"  },
  { z: 15,  symbol: "P",  name: "Phosphorus",   mass: 30.97,   group: "nonmetal"   },
  { z: 16,  symbol: "S",  name: "Sulfur",       mass: 32.07,   group: "nonmetal"   },
  { z: 17,  symbol: "Cl", name: "Chlorine",     mass: 35.45,   group: "halogen"    },
  { z: 18,  symbol: "Ar", name: "Argon",        mass: 39.95,   group: "noble"      },
  { z: 19,  symbol: "K",  name: "Potassium",    mass: 39.10,   group: "alkali"     },
  { z: 20,  symbol: "Ca", name: "Calcium",      mass: 40.08,   group: "alkaline"   },
  { z: 26,  symbol: "Fe", name: "Iron",         mass: 55.85,   group: "transition" },
  { z: 29,  symbol: "Cu", name: "Copper",       mass: 63.55,   group: "transition" },
  { z: 30,  symbol: "Zn", name: "Zinc",         mass: 65.38,   group: "transition" },
  { z: 47,  symbol: "Ag", name: "Silver",       mass: 107.87,  group: "transition" },
  { z: 50,  symbol: "Sn", name: "Tin",          mass: 118.71,  group: "post-tran"  },
  { z: 56,  symbol: "Ba", name: "Barium",       mass: 137.33,  group: "alkaline"   },
  { z: 74,  symbol: "W",  name: "Tungsten",     mass: 183.84,  group: "transition" },
  { z: 79,  symbol: "Au", name: "Gold",         mass: 196.97,  group: "transition" },
  { z: 82,  symbol: "Pb", name: "Lead",         mass: 207.2,   group: "post-tran"  },
  { z: 92,  symbol: "U",  name: "Uranium",      mass: 238.03,  group: "actinide"   },
  { z: 118, symbol: "Og", name: "Oganesson",    mass: 294,     group: "noble"      },
];

// Index by atomic number
const BY_Z = new Map<number, ElementInfo>();
ELEMENTS.forEach(e => BY_Z.set(e.z, e));

export function getElement(z: number): ElementInfo | undefined {
  return BY_Z.get(z);
}

export default ELEMENTS;
