/**
 * Familie knowledge graph — een aparte, *verbergbare* kennisgraaf binnen de
 * gitnexus/LightRAG/Neo4j familie van grafen (naast Asset, Governance, Wiki,
 * Corpus, Codegraph).
 *
 * Doel
 * ----
 * Eén benoemde graaf ("Familie") die de privé/holding-structuur modelleert:
 * personen, bedrijven (B.V./VOF/holdings), hardware, software/OS, diensten,
 * projecten, winning-trajecten, materialen en game-engines. Omdat dit
 * gevoelige (familie/holding) data is, is de hele graaf met één toggle te
 * **verbergen** — de 3D-viewer en API geven dan niets terug.
 *
 * Scheiding van de andere grafen
 * ------------------------------
 *   - Alle knopen krijgen het label `:Familie` *plus* een type-label
 *     (`:Persoon`, `:Bedrijf`, ...). Daardoor raakt deze graaf nooit de
 *     bestaande Asset/Corpus/Node-grafen en kun je 'm los queryen/wissen.
 *   - Elke knoop heeft `graph: 'Familie'` zodat een platte query op property
 *     ook werkt.
 *   - De zichtbaarheid (`hidden`) staat zowel als property op elke knoop als
 *     in `data/family-graph-visibility.json`, zodat de toggle een Neo4j-herstart
 *     overleeft en de viewer 'm zonder DB kan uitlezen.
 *
 * Eerlijkheid over data
 * ---------------------
 * Conform de huisregel "nooit synthetische data": de enige *feiten* die we
 * vastleggen zijn (a) dat een object bestaat en (b) zijn type/categorie — dat
 * zijn precies de objecten die de gebruiker heeft opgegeven. Categorie-randen
 * zijn puur organisatorisch (radiale structuur voor de 3D-weergave). De enkele
 * semantische randen die we leggen (product → winning, studio → engine,
 * dienst → platform, workstation → OS) zijn 1-op-1 uit de namen zelf af te
 * leiden en worden gemarkeerd met `inferred: true`. We verzinnen géén
 * familierelaties of bedrijfs-eigendom waarvoor we geen bewijs hebben.
 *
 * Idempotent: MERGE op elke knoop/rand. Veilig om te herhalen. Bij offline
 * LightRAG (Neo4j onbereikbaar) noopt alles netjes — zelfde graceful-degradation
 * als de rest van de LightRAG-integratie.
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';
import type { LightRAGClient } from './client';

export const FAMILY_GRAPH_NAME = 'Familie';

const VISIBILITY_FILE = path.resolve(__dirname, '..', '..', '..', 'data', 'family-graph-visibility.json');

/** Categorie-taxonomie (Nederlandse labels) → Neo4j type-label + 3D groep-id. */
interface Category {
  /** Nederlandse weergavenaam van de categorie (hub-knoop). */
  label: string;
  /** Neo4j-label dat elk object in deze categorie krijgt. */
  nodeLabel: string;
  /** Numerieke groep voor kleur-clustering in de 3D-viewer. */
  group: number;
}

const CATEGORIES: Record<string, Category> = {
  persoon:   { label: 'Personen',        nodeLabel: 'Persoon',   group: 1 },
  bedrijf:   { label: 'Bedrijven',       nodeLabel: 'Bedrijf',   group: 2 },
  hardware:  { label: 'Hardware',        nodeLabel: 'Hardware',  group: 3 },
  software:  { label: 'Software / OS',   nodeLabel: 'Software',  group: 4 },
  dienst:    { label: 'Diensten',        nodeLabel: 'Dienst',    group: 5 },
  project:   { label: 'Projecten',       nodeLabel: 'Project',   group: 6 },
  winning:   { label: 'Winning',         nodeLabel: 'Winning',   group: 7 },
  materiaal: { label: 'Materialen',      nodeLabel: 'Materiaal', group: 8 },
  engine:    { label: 'Game-engines',    nodeLabel: 'Engine',    group: 9 },
  tool:      { label: 'Studio / Tools',  nodeLabel: 'Tool',      group: 10 },
};

interface Entity {
  /** Weergavenaam (exact zoals door gebruiker opgegeven). */
  name: string;
  /** Sleutel in CATEGORIES. */
  cat: keyof typeof CATEGORIES;
  /** Optionele korte omschrijving voor de tooltip in de viewer. */
  note?: string;
}

/**
 * Alle door de gebruiker opgegeven objecten. Volgorde = invoervolgorde van het
 * verzoek (kern-familie/holding objecten eerst, daarna de project/3D-objecten).
 */
const ENTITIES: Entity[] = [
  // --- Kern: personen -------------------------------------------------------
  { name: 'Vanya', cat: 'persoon' },
  { name: 'Edwin', cat: 'persoon' },
  { name: 'Archie', cat: 'persoon' },
  { name: 'Lea', cat: 'persoon' },
  { name: 'Adrie', cat: 'persoon' },
  { name: 'Gonny', cat: 'persoon' },
  { name: 'Karin', cat: 'persoon' },
  { name: 'X.Wu', cat: 'persoon', note: '51% meerderheidsaandeelhouder Slag B.V. (nieuwe situatie)' },

  // --- Kern: bedrijven (holdings / B.V. / VOF) ------------------------------
  { name: 'VirtualV Holding B.V.',     cat: 'bedrijf', note: 'Holding' },
  { name: 'EHMAC B.V.',                cat: 'bedrijf' },
  { name: 'SLAG B.V.',                 cat: 'bedrijf' },
  { name: 'VirtuAnalytica VOF',        cat: 'bedrijf', note: 'VOF' },
  { name: "Zack's Holding B.V.",       cat: 'bedrijf', note: 'Holding' },
  { name: "Zack's Consultancy B.V.",   cat: 'bedrijf' },
  { name: 'Uniforce Group B.V.',       cat: 'bedrijf' },

  // --- Kern: hardware -------------------------------------------------------
  { name: 'GPU Server 1', cat: 'hardware', note: '2×3090 ML/Ollama server' },

  // --- Kern: software / OS --------------------------------------------------
  { name: 'Python',            cat: 'software' },
  { name: 'Ubuntu',            cat: 'software', note: 'Linux OS' },
  { name: 'Microsoft Windows', cat: 'software', note: 'OS' },

  // --- Kern: diensten -------------------------------------------------------
  { name: 'Google',       cat: 'dienst' },
  { name: 'Google Drive', cat: 'dienst' },
  { name: 'Google Mail',  cat: 'dienst' },
  { name: 'Transip',      cat: 'dienst' },
  { name: 'Transip Mail', cat: 'dienst' },

  // --- 3D-vulling: projecten ------------------------------------------------
  { name: 'SmartSlag3', cat: 'project' },
  { name: 'VANECO',     cat: 'project' },
  { name: 'SlagBox',    cat: 'project' },
  { name: 'MOLGANG',    cat: 'project', note: 'Chemical Engineering game' },

  // --- 3D-vulling: winning-trajecten ----------------------------------------
  { name: 'Vanadium winning', cat: 'winning' },
  { name: 'Silicium winning', cat: 'winning' },
  { name: 'Calcium winning',  cat: 'winning' },
  { name: 'Titanium winning', cat: 'winning' },
  { name: 'Fosfor winning',   cat: 'winning' },
  { name: 'Ijzer winning',    cat: 'winning' },

  // --- 3D-vulling: materialen / producten -----------------------------------
  { name: 'Vanadium elektrolyt', cat: 'materiaal' },
  { name: 'Vanadium ijzer',      cat: 'materiaal' },
  { name: 'Vanadium baar',       cat: 'materiaal' },

  // --- 3D-vulling: game-engines ---------------------------------------------
  { name: 'Roblox', cat: 'engine' },
  { name: 'Unreal', cat: 'engine' },
  { name: 'GoDot',  cat: 'engine' },

  // --- 3D-vulling: studio's / tools -----------------------------------------
  { name: 'Roblox Studio', cat: 'tool' },
  { name: 'Unreal Studio', cat: 'tool' },
  { name: 'GoDot Studio',  cat: 'tool' },

  // --- 3D-vulling: extra hardware / devices ---------------------------------
  { name: 'Laptop macbook air 2023', cat: 'hardware' },
  { name: 'Laptop Dell',             cat: 'hardware' },
  { name: 'APG',                     cat: 'hardware' },
  { name: 'Windows Workstation',     cat: 'hardware' },
  { name: 'Ubuntu Workstation',      cat: 'hardware' },
  { name: 'Optane nvram',            cat: 'hardware' },
  { name: 'Intel SSD 750',           cat: 'hardware' },
  { name: 'Smartphone Samsung Z-fold 5', cat: 'hardware' },
];

/**
 * Semantische randen die rechtstreeks uit de objectnamen volgen (geen
 * verzonnen feiten). Gemarkeerd `inferred` zodat consumenten weten dat dit
 * naam-afleidingen zijn, geen geverifieerde claims.
 *   TOOL_VOOR    : studio/editor hoort bij een engine
 *   DIENST_VAN   : sub-dienst hoort bij een platform
 *   DRAAIT_OP    : workstation draait een OS
 * (De Vanadium product→winning randen stonden hier eerder als naam-afleiding;
 *  ze zijn nu opgenomen in VERIFIED_EDGES met bron-bewijs uit de werkcontext.)
 */
interface SemanticEdge { from: string; to: string; rel: string; }
const SEMANTIC_EDGES: SemanticEdge[] = [
  // Studio → engine
  { from: 'Roblox Studio', to: 'Roblox', rel: 'TOOL_VOOR' },
  { from: 'Unreal Studio', to: 'Unreal', rel: 'TOOL_VOOR' },
  { from: 'GoDot Studio',  to: 'GoDot',  rel: 'TOOL_VOOR' },
  // Sub-dienst → platform
  { from: 'Google Drive', to: 'Google',  rel: 'DIENST_VAN' },
  { from: 'Google Mail',  to: 'Google',  rel: 'DIENST_VAN' },
  { from: 'Transip Mail', to: 'Transip', rel: 'DIENST_VAN' },
  // Workstation → OS
  { from: 'Ubuntu Workstation',  to: 'Ubuntu',            rel: 'DRAAIT_OP' },
  { from: 'Windows Workstation', to: 'Microsoft Windows', rel: 'DRAAIT_OP' },
];

/**
 * Geverifieerde randen uit de werkcontext (door de gebruiker aangeleverd).
 * Elke rand is adversarieel "geground" tegen de brontekst: alleen relaties die
 * de context écht ondersteunt zijn opgenomen. `confidence`:
 *   'stated'   — expliciet in de context vermeld
 *   'inferred' — redelijke afleiding uit de bewoording
 * `evidence` bewaart de bron-frase op de Neo4j-relatie zodat de claim
 * herleidbaar is. Géén familie-relaties of eigendom zonder bewijs (twee
 * speculatieve randen — Optane→GPU Server 1 en Edwin→MOLGANG — zijn bewust
 * afgewezen tijdens verificatie).
 */
interface VerifiedEdge {
  from: string; to: string; rel: string;
  confidence: 'stated' | 'inferred'; evidence: string;
  /** Aandeel-percentage als string (bv '51%') — zet r.aandeel + r.meerderheid. */
  share?: string;
  /** Open punt dat herziening vraagt — zet r.review zodat de tensie in-graph zichtbaar is. */
  review?: string;
}
const VERIFIED_EDGES: VerifiedEdge[] = [
  // Edwin ↔ holding / bedrijven
  { from: 'Edwin', to: 'VirtualV Holding B.V.', rel: 'CEO_VAN',       confidence: 'stated',   evidence: 'Edwin Hauwert is CEO/founder of VirtualV Holding B.V.' },
  { from: 'Edwin', to: 'VirtualV Holding B.V.', rel: 'OPRICHTER_VAN', confidence: 'stated',   evidence: 'Edwin Hauwert is CEO/founder of VirtualV Holding B.V.' },
  { from: 'Edwin', to: 'Uniforce Group B.V.',   rel: 'GESCHIL_MET',   confidence: 'stated',   evidence: 'Edwin pursues a civil lawsuit (dagvaarding) against Uniforce Group B.V.' },
  // NB: 'Edwin -CONTROLEERT-> SLAG B.V.' (was inferred) is bewust vervallen —
  // in de nieuwe situatie krijgt X.Wu 51% (meerderheid), dus Edwin heeft geen
  // zeggenschapsmeerderheid meer.
  // Nieuwe situatie: X.Wu meerderheidsaandeelhouder Slag B.V.
  { from: 'X.Wu', to: 'SLAG B.V.', rel: 'AANDEELHOUDER_VAN', confidence: 'stated', share: '51%',
    evidence: 'In de nieuwe situatie krijgt X.Wu 51% aandeel in Slag B.V. om ook werk aan te nemen waarvoor geen zelfstandigen in aanmerking komen' },
  // Holding-structuur
  { from: 'VirtualV Holding B.V.', to: 'EHMAC B.V.', rel: 'HEEFT_DOCHTER', confidence: 'stated', evidence: 'VirtualV Holding B.V. has subsidiaries EHMAC B.V. and Slag B.V.' },
  { from: 'VirtualV Holding B.V.', to: 'SLAG B.V.',  rel: 'HEEFT_DOCHTER', confidence: 'stated', evidence: 'VirtualV Holding B.V. has subsidiaries EHMAC B.V. and Slag B.V.',
    review: 'X.Wu 51% in nieuwe situatie → VirtualV houdt ≤49%: herzie of SLAG nog dochter (>50%) is of een deelneming (≤49%).' },
  { from: 'SLAG B.V.', to: 'Uniforce Group B.V.',   rel: 'GESCHIL_MET',   confidence: 'stated', evidence: 'the dispute is between Slag B.V./Edwin and Uniforce Group B.V.' },
  // Edwin ↔ hardware / software
  { from: 'Edwin', to: 'GPU Server 1', rel: 'BEZIT',    confidence: 'stated',   evidence: 'Edwin owns a Supermicro 4029GP-TRT server with 4× RTX 3090 GPUs' },
  { from: 'Edwin', to: 'Optane nvram', rel: 'BEZIT',    confidence: 'stated',   evidence: 'Edwin evaluated/purchased Optane DCPMM for the X11DPG-OT-CPU server board' },
  // Door gebruiker bevestigd (was eerder afgewezen bij verificatie): de Optane
  // zit zowel in het X11DPG-bord als in het Supermicro-serverbord (= GPU Server 1).
  { from: 'Optane nvram', to: 'GPU Server 1', rel: 'ONDERDEEL_VAN', confidence: 'stated',
    evidence: 'Optane hoort bij zowel het X11DPG bord als ook de Supermicro Server bord (= GPU Server 1)' },
  { from: 'GPU Server 1', to: 'Python', rel: 'DRAAIT',  confidence: 'stated',   evidence: 'Local server runs an 8-model expert LLM team and ML stack (Python)' },
  { from: 'Edwin', to: 'Python',       rel: 'GEBRUIKT', confidence: 'inferred', evidence: 'The ML/data work is in Python and Rust' },
  // Projecten / SmartSlag3
  { from: 'Edwin', to: 'SmartSlag3',           rel: 'WERKT_AAN',    confidence: 'stated',   evidence: 'Edwin operates Slakkenspoor VOF for the SmartSlag3 R&D venture' },
  { from: 'SlagBox', to: 'SmartSlag3',         rel: 'ONDERDEEL_VAN', confidence: 'inferred', evidence: 'SmartSlag3 MK-II "SlagBox 100" design — SlagBox is a sub-project of SmartSlag3' },
  { from: 'Vanadium winning', to: 'SmartSlag3', rel: 'ONDERDEEL_VAN', confidence: 'stated',  evidence: 'the vanadium extraction (Vanadium winning) within SmartSlag3' },
  { from: 'Vanadium baar',      to: 'Vanadium winning', rel: 'PRODUCT_VAN', confidence: 'stated', evidence: 'Vanadium baar/elektrolyt/ijzer are vanadium products derived from the vanadium extraction' },
  { from: 'Vanadium elektrolyt', to: 'Vanadium winning', rel: 'PRODUCT_VAN', confidence: 'stated', evidence: 'Vanadium baar/elektrolyt/ijzer are vanadium products derived from the vanadium extraction' },
  { from: 'Vanadium ijzer',     to: 'Vanadium winning', rel: 'PRODUCT_VAN', confidence: 'stated', evidence: 'Vanadium baar/elektrolyt/ijzer are vanadium products derived from the vanadium extraction' },
  // Game
  { from: 'MOLGANG', to: 'Roblox', rel: 'GEBOUWD_MET', confidence: 'stated', evidence: 'MOLGANG: Roblox/Three.js game development' },
];

// Defense-in-depth: elk dynamisch geïnterpoleerd Neo4j-label/relatietype moet
// een veilige identifier zijn. Waarden komen vandaag enkel uit de hardcoded
// whitelists hierboven; deze guard voorkomt dat een toekomstige edit met een
// user-afkomstige waarde stilletjes injecteerbaar wordt.
const SAFE_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
function assertSafeIdent(v: string): string {
  if (!SAFE_IDENT.test(v)) throw new Error(`family-graph: onveilig label/relatie '${v}'`);
  return v;
}

// ---------------------------------------------------------------------------
// Zichtbaarheid (toggle "verbergen")
// ---------------------------------------------------------------------------

export interface Visibility {
  graph: string;
  hidden: boolean;
  updated_at: string;
}

/** Lees de toggle-status van schijf (default: zichtbaar). */
export function getFamilyVisibility(): Visibility {
  try {
    if (fs.existsSync(VISIBILITY_FILE)) {
      const v = JSON.parse(fs.readFileSync(VISIBILITY_FILE, 'utf8'));
      return { graph: FAMILY_GRAPH_NAME, hidden: !!v.hidden, updated_at: v.updated_at || '' };
    }
  } catch (e: any) {
    logger.warn(`family-graph: kon zichtbaarheid niet lezen: ${e.message}`);
  }
  return { graph: FAMILY_GRAPH_NAME, hidden: false, updated_at: '' };
}

function persistVisibility(hidden: boolean): Visibility {
  const v: Visibility = { graph: FAMILY_GRAPH_NAME, hidden, updated_at: new Date().toISOString() };
  try {
    fs.mkdirSync(path.dirname(VISIBILITY_FILE), { recursive: true });
    fs.writeFileSync(VISIBILITY_FILE, JSON.stringify(v, null, 2));
  } catch (e: any) {
    logger.warn(`family-graph: kon zichtbaarheid niet schrijven: ${e.message}`);
  }
  return v;
}

/**
 * Zet de hele Familie-graaf op verborgen/zichtbaar. Schrijft de toggle naar
 * schijf én zet `hidden` op alle :Familie-knopen (zodat een directe Cypher-query
 * de toggle ook respecteert). Graceful bij offline Neo4j.
 */
export async function setFamilyVisibility(client: LightRAGClient, hidden: boolean): Promise<Visibility> {
  const v = persistVisibility(hidden);
  if (client.isConnected()) {
    const session = (client as any).driver.session();
    try {
      await session.run(
        `MATCH (n:Familie) SET n.hidden = $hidden`,
        { hidden },
      );
    } catch (e: any) {
      logger.warn(`family-graph: kon hidden-property niet zetten: ${e.message}`);
    } finally {
      await session.close();
    }
  }
  logger.info(`✓ family-graph: zichtbaarheid → ${hidden ? 'VERBORGEN' : 'zichtbaar'}`);
  return v;
}

// ---------------------------------------------------------------------------
// Ingest
// ---------------------------------------------------------------------------

export interface IngestResult {
  entities: number;
  categories: number;
  /** Organisatorische randen: IN_CATEGORIE (per object) + DEEL_VAN (per hub). */
  structuralEdges: number;
  /** Naam-afgeleide randen (inferred). */
  semanticEdges: number;
  /** Bron-geverifieerde randen uit de werkcontext. */
  verifiedEdges: number;
  hidden: boolean;
  offline?: boolean;
}

/**
 * Bouw/ververs de Familie-graaf in Neo4j. Idempotent (MERGE overal):
 *   (:Familie:<Type> {name})            één per object
 *   (:Familie:Categorie {name})         één hub per categorie
 *   (:Familie:Graaf {name:'Familie'})   één root-knoop
 *   (entity)-[:IN_CATEGORIE]->(hub)
 *   (hub)-[:DEEL_VAN]->(root)
 *   (entity)-[:<semantic>]->(entity)    de afgeleide randen
 */
export async function ingestFamilyGraph(client: LightRAGClient): Promise<IngestResult> {
  const vis = getFamilyVisibility();
  if (!client.isConnected()) {
    return { entities: 0, categories: 0, structuralEdges: 0, semanticEdges: 0, verifiedEdges: 0, hidden: vis.hidden, offline: true };
  }
  const session = (client as any).driver.session();
  let structuralEdges = 0, semanticEdges = 0, verifiedEdges = 0;
  try {
    // Root-knoop van deze benoemde graaf.
    await session.run(
      `MERGE (g:Familie:Graaf {name: $name})
       SET g.graph = $name, g.hidden = $hidden, g.kind = 'graph-root'`,
      { name: FAMILY_GRAPH_NAME, hidden: vis.hidden },
    );

    // Categorie-hubs (elke hub → DEEL_VAN → root).
    for (const key of Object.keys(CATEGORIES)) {
      const c = CATEGORIES[key];
      await session.run(
        `MERGE (cat:Familie:Categorie {name: $label})
         SET cat.graph = $graph, cat.hidden = $hidden, cat.group = $group, cat.kind = 'category'
         WITH cat
         MATCH (g:Familie:Graaf {name: $graph})
         MERGE (cat)-[:DEEL_VAN]->(g)`,
        { label: c.label, graph: FAMILY_GRAPH_NAME, hidden: vis.hidden, group: c.group },
      );
      structuralEdges++; // DEEL_VAN
    }

    // Entiteiten + categorie-randen. We zetten het type-label dynamisch via
    // apoc-vrije string-interpolatie van een gevalideerde whitelist-waarde
    // (nodeLabel komt uit CATEGORIES, nooit uit user input; extra geguard).
    for (const e of ENTITIES) {
      const c = CATEGORIES[e.cat];
      const typeLabel = assertSafeIdent(c.nodeLabel);
      await session.run(
        `MERGE (n:Familie:\`${typeLabel}\` {name: $name})
         SET n.graph = $graph, n.hidden = $hidden, n.category = $catLabel,
             n.group = $group, n.note = $note, n.kind = 'entity'
         WITH n
         MATCH (cat:Familie:Categorie {name: $catLabel})
         MERGE (n)-[:IN_CATEGORIE]->(cat)`,
        {
          name: e.name,
          graph: FAMILY_GRAPH_NAME,
          hidden: vis.hidden,
          catLabel: c.label,
          group: c.group,
          note: e.note || '',
        },
      );
      structuralEdges++; // IN_CATEGORIE
    }

    // Reconciliatie — maak de afgeleide + geverifieerde randen DECLARATIEF.
    // MERGE voegt alleen toe; een rand die uit de bron-arrays verdwijnt (bv. de
    // vervallen 'Edwin -CONTROLEERT-> SLAG B.V.') zou anders in Neo4j blijven
    // hangen. Daarom verwijderen we eerst alle door deze module gezette randen
    // (die dragen r.verified) en herbouwen ze daarna 1-op-1 uit de arrays.
    // Structurele randen (IN_CATEGORIE/DEEL_VAN) hebben deze property niet en
    // blijven dus onaangeroerd.
    await session.run(
      `MATCH (:Familie)-[r]->(:Familie) WHERE r.verified IS NOT NULL DELETE r`,
    );

    // Afgeleide semantische randen (naam-afleiding → inferred=true).
    for (const s of SEMANTIC_EDGES) {
      await session.run(
        `MATCH (a:Familie {name: $from}), (b:Familie {name: $to})
         MERGE (a)-[r:\`${assertSafeIdent(s.rel)}\`]->(b)
         SET r.inferred = true, r.verified = false`,
        { from: s.from, to: s.to },
      );
      semanticEdges++;
    }

    // Bron-geverifieerde randen uit de werkcontext (met bewijs op de relatie).
    // `inferred` = niet expliciet gesteld (confidence === 'inferred'), zodat de
    // 3D-viewer geverifieerd-maar-afgeleid visueel kan onderscheiden.
    for (const v of VERIFIED_EDGES) {
      const pct = v.share ? parseInt(v.share, 10) : null;
      await session.run(
        `MATCH (a:Familie {name: $from}), (b:Familie {name: $to})
         MERGE (a)-[r:\`${assertSafeIdent(v.rel)}\`]->(b)
         SET r.verified = true, r.confidence = $confidence,
             r.evidence = $evidence, r.inferred = $inferred,
             r.aandeel = $share, r.meerderheid = $meerderheid, r.review = $review`,
        {
          from: v.from, to: v.to, confidence: v.confidence, evidence: v.evidence,
          inferred: v.confidence === 'inferred',
          share: v.share || null,
          meerderheid: pct == null ? null : pct > 50,
          review: v.review || null,
        },
      );
      verifiedEdges++;
    }

    logger.info(`✓ family-graph: ${ENTITIES.length} objecten, ${Object.keys(CATEGORIES).length} categorieën, ${structuralEdges} structurele + ${semanticEdges} afgeleide + ${verifiedEdges} geverifieerde randen (hidden=${vis.hidden})`);
    return {
      entities: ENTITIES.length,
      categories: Object.keys(CATEGORIES).length,
      structuralEdges,
      semanticEdges,
      verifiedEdges,
      hidden: vis.hidden,
    };
  } finally {
    await session.close();
  }
}

// ---------------------------------------------------------------------------
// 3D query-surface
// ---------------------------------------------------------------------------

export interface Graph3D {
  graph: string;
  hidden: boolean;
  nodes: Array<{ id: string; name: string; type: string; category: string; group: number; kind: string; note?: string; val: number }>;
  links: Array<{ source: string; target: string; type: string; inferred?: boolean; verified?: boolean; confidence?: string; evidence?: string; share?: string; review?: string }>;
}

/**
 * Geef de Familie-graaf terug in het `3d-force-graph` formaat ({nodes, links}).
 * Als de toggle op "verbergen" staat, komt er een lege graaf terug met
 * `hidden: true` — zo blijft de privé-data buiten beeld zonder de DB te wissen.
 */
export async function getFamilyGraph3D(client: LightRAGClient): Promise<Graph3D> {
  const vis = getFamilyVisibility();
  const empty: Graph3D = { graph: FAMILY_GRAPH_NAME, hidden: vis.hidden, nodes: [], links: [] };
  if (vis.hidden) return empty;          // toggle wint — niets teruggeven
  if (!client.isConnected()) return empty;

  const session = (client as any).driver.session();
  try {
    const nodeRes = await session.run(
      `MATCH (n:Familie)
       WHERE coalesce(n.hidden, false) = false
       RETURN n.name AS name, labels(n) AS labels, coalesce(n.category,'') AS category,
              coalesce(n.group,0) AS group, coalesce(n.kind,'entity') AS kind,
              coalesce(n.note,'') AS note`,
    );
    const nodes = nodeRes.records.map((r: any) => {
      const o = r.toObject();
      const labels: string[] = o.labels || [];
      // primair type = het niet-'Familie' label (Persoon/Bedrijf/Categorie/Graaf...)
      const type = labels.find((l) => l !== 'Familie') || 'Familie';
      const group = typeof o.group === 'object' && o.group?.low !== undefined ? o.group.low : Number(o.group) || 0;
      return {
        id: o.name,
        name: o.name,
        type,
        category: o.category,
        group,
        kind: o.kind,
        note: o.note || undefined,
        // hubs/root groter dan losse objecten zodat de 3D-layout structuur toont
        val: o.kind === 'graph-root' ? 12 : o.kind === 'category' ? 6 : 2,
      };
    });

    const linkRes = await session.run(
      `MATCH (a:Familie)-[r]->(b:Familie)
       WHERE coalesce(a.hidden,false) = false AND coalesce(b.hidden,false) = false
       RETURN a.name AS source, b.name AS target, type(r) AS type,
              coalesce(r.inferred,false) AS inferred, coalesce(r.verified,false) AS verified,
              coalesce(r.confidence,'') AS confidence, coalesce(r.evidence,'') AS evidence,
              coalesce(r.aandeel,'') AS share, coalesce(r.review,'') AS review`,
    );
    const links = linkRes.records.map((r: any) => {
      const o = r.toObject();
      return {
        source: o.source, target: o.target, type: o.type,
        inferred: !!o.inferred, verified: !!o.verified,
        confidence: o.confidence || undefined, evidence: o.evidence || undefined,
        share: o.share || undefined, review: o.review || undefined,
      };
    });

    return { graph: FAMILY_GRAPH_NAME, hidden: false, nodes, links };
  } finally {
    await session.close();
  }
}

/** Platte lijst van alle objecten (voor tabel/debug). Respecteert de toggle. */
export async function listFamilyEntities(client: LightRAGClient): Promise<{ hidden: boolean; count: number; entities: any[] }> {
  const vis = getFamilyVisibility();
  if (vis.hidden || !client.isConnected()) return { hidden: vis.hidden, count: 0, entities: [] };
  const session = (client as any).driver.session();
  try {
    const res = await session.run(
      `MATCH (n:Familie) WHERE n.kind = 'entity'
       RETURN n.name AS name, n.category AS category, coalesce(n.note,'') AS note
       ORDER BY n.category, n.name`,
    );
    const entities = res.records.map((r: any) => r.toObject());
    return { hidden: false, count: entities.length, entities };
  } finally {
    await session.close();
  }
}
