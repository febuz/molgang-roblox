/**
 * Webgame wiki — glossary of game terms + quantum chemical engineering
 * terminology. Pixel renders the /wiki page on the molgang-web frontend
 * using this catalogue. Authored by Kimi via taskType:'docs' so the
 * long-context Moonshot model produces internally-consistent definitions.
 *
 * Two namespaces:
 *   - 'game'  → quests, currencies, age-bands, factions, mechanics
 *   - 'qchem' → quantum chemistry / chemical engineering (orbitals,
 *                hybridization, partition function, fugacity, mass
 *                transfer, residence time, Damköhler number, ...)
 *
 * Each entry carries a governance.entryId so the wiki page can show
 * lineage ("this term was authored by Kimi from IUPAC source X").
 */
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';

export type WikiNamespace = 'game' | 'qchem';

export interface WikiEntry {
  /** kebab-case id, e.g. "fugacity" or "molco2" */
  id: string;
  term: string;
  namespace: WikiNamespace;
  /** One-line summary (renders as the glossary tooltip) */
  summary: string;
  /** Full markdown body (renders as the term's article) */
  body: string;
  /** Cross-links to other wiki ids */
  seeAlso?: string[];
  /** Governance entry id this term was sourced from */
  governanceId?: string;
  /** Last-updated ISO timestamp */
  updatedAt: string;
  /** Author agent (typically Kimi for qchem, Vice for game) */
  author?: string;
}

interface WikiState {
  entries: WikiEntry[];
}

const WIKI_PATH = path.join(__dirname, '..', '..', '..', 'data', 'wiki.json');
let state: WikiState = { entries: [] };
let dirty = false;

function defaultEntries(): WikiEntry[] {
  // Seeded baseline — Governor + Kimi will expand. Each gets a
  // governance lineage entry on first regenerate-docs run.
  const now = new Date().toISOString();
  return [
    {
      id: 'molco2',
      term: 'MOLCO2',
      namespace: 'game',
      summary: 'In-game carbon-credit currency awarded for sequestration / efficient reactions.',
      body: '## MOLCO2\n\nMOLCO2 is the carbon-credit currency in molgang. Players earn MOLCO2 by:\n\n- Running reactions that consume more CO₂ than they emit\n- Building facilities with high atom economy\n- Completing sustainability quests\n\nMOLCO2 is spent on: facility upgrades that reduce emissions, license carbon-offset partnerships, and the marketplace.\n\nSee also: [atom-economy](#atom-economy), [carbon-credit](#carbon-credit).',
      seeAlso: ['atom-economy', 'carbon-credit'],
      governanceId: 'shared-quests-json',
      updatedAt: now,
      author: 'Vice',
    },
    {
      id: 'fugacity',
      term: 'Fugacity',
      namespace: 'qchem',
      summary: 'Effective partial pressure of a real gas — replaces ideal-gas pressure in chemical-equilibrium expressions.',
      body: '## Fugacity\n\nFugacity (φ·P) is the *effective* partial pressure of a real gas. It substitutes for raw pressure in Gibbs free-energy / equilibrium-constant expressions when the gas deviates from ideal behavior.\n\n- For an ideal gas: fugacity = pressure.\n- For a real gas at high P or low T: fugacity ≠ pressure; fugacity coefficient φ < 1 means attractive interactions dominate.\n\nIn molgang, the in-game reactor sim tracks fugacity for any reaction running above ~10 bar.\n\nSee also: [activity](#activity), [chemical-potential](#chemical-potential).',
      seeAlso: ['activity', 'chemical-potential'],
      governanceId: 'wiki-terms-json',
      updatedAt: now,
      author: 'Kimi',
    },
    {
      id: 'partition-function',
      term: 'Partition function',
      namespace: 'qchem',
      summary: 'Sum over all microstates weighted by Boltzmann factor — connects quantum energy levels to thermodynamic state functions.',
      body: '## Partition function (Q)\n\nThe partition function Q = Σ exp(−Eᵢ/kT) sums Boltzmann-weighted microstates. Every macroscopic thermodynamic quantity (Helmholtz free energy, entropy, heat capacity) follows from Q.\n\nIn molgang the reaction simulator computes Q for translational + rotational + vibrational + electronic modes and uses it to predict equilibrium constants from first principles.\n\nSee also: [boltzmann-distribution](#boltzmann-distribution), [vibrational-mode](#vibrational-mode).',
      seeAlso: ['boltzmann-distribution', 'vibrational-mode'],
      governanceId: 'wiki-terms-json',
      updatedAt: now,
      author: 'Kimi',
    },
    {
      id: 'damkohler',
      term: 'Damköhler number (Da)',
      namespace: 'qchem',
      summary: 'Dimensionless ratio of reaction rate to transport rate — tells you whether kinetics or mixing limits a reactor.',
      body: '## Damköhler number\n\nDa = (reaction rate) / (transport rate). Roughly:\n\n- Da ≪ 1 → reactor is *transport-limited*; molecules leave before reacting.\n- Da ≫ 1 → reactor is *kinetics-limited*; reaction equilibrates faster than flow / diffusion can supply reactants.\n\nIn molgang facility design, Da is the headline number on every continuous-flow reactor card.\n\nSee also: [residence-time](#residence-time), [péclet-number](#peclet-number).',
      seeAlso: ['residence-time', 'peclet-number'],
      governanceId: 'wiki-terms-json',
      updatedAt: now,
      author: 'Kimi',
    },
    {
      id: 'age-bands',
      term: 'Age bands',
      namespace: 'game',
      summary: 'Player-progression tiers (8-10, 11-13, 14-17, 18+) gating quests, mechanics, and chemistry depth.',
      body: '## Age bands\n\nmolgang quests + mechanics are gated by four age bands so the game scales from middle-school casual to undergraduate-curriculum:\n\n- **8-10**: ion-pair matching, simple reactions, no thermodynamics math.\n- **11-13**: balancing equations, intro stoichiometry, MOLCO2 trading.\n- **14-17**: thermodynamics + kinetics, real-gas corrections, full reactor design.\n- **18+**: quantum chemistry path, partition functions, transport phenomena.\n\nAge band is set in the player profile and gates every quest unlock.',
      seeAlso: ['quests', 'molco2'],
      governanceId: 'shared-quests-json',
      updatedAt: now,
      author: 'Vice',
    },
  ];
}

function ensureLoaded() {
  if (state.entries.length > 0) return;
  if (!fs.existsSync(WIKI_PATH)) {
    state = { entries: defaultEntries() };
    dirty = true;
    save();
    return;
  }
  try {
    const raw = fs.readFileSync(WIKI_PATH, 'utf8');
    state = JSON.parse(raw);
    if (!state.entries) state.entries = [];
  } catch (e: any) {
    logger.warn(`wiki: failed to load ${WIKI_PATH}: ${e.message}`);
    state = { entries: defaultEntries() };
    dirty = true;
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; save(); }, 5000);
}

function save() {
  if (!dirty) return;
  try {
    fs.mkdirSync(path.dirname(WIKI_PATH), { recursive: true });
    fs.writeFileSync(WIKI_PATH, JSON.stringify(state, null, 2));
    dirty = false;
  } catch (e: any) {
    logger.warn(`wiki: save failed: ${e.message}`);
  }
}

export function listEntries(filter?: { namespace?: WikiNamespace; q?: string }): WikiEntry[] {
  ensureLoaded();
  let out = [...state.entries];
  if (filter?.namespace) out = out.filter(e => e.namespace === filter.namespace);
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    out = out.filter(e =>
      e.term.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q));
  }
  return out.sort((a, b) => a.term.localeCompare(b.term));
}

export function getEntry(id: string): WikiEntry | undefined {
  ensureLoaded();
  return state.entries.find(e => e.id === id);
}

export function upsertEntry(entry: Omit<WikiEntry, 'updatedAt'> & { updatedAt?: string }): WikiEntry {
  ensureLoaded();
  const next: WikiEntry = { ...entry, updatedAt: entry.updatedAt || new Date().toISOString() };
  const idx = state.entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) state.entries[idx] = next;
  else state.entries.push(next);
  dirty = true;
  scheduleSave();
  return next;
}

export function flushSync() { if (dirty) save(); }
