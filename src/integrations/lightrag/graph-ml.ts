/**
 * Knowledge Graph ML Layer
 *
 * Pure TypeScript (zero external ML deps) utilities for semantic analysis
 * of the P2P knowledge graph:
 *
 *  - TF-IDF cosine similarity between node content
 *  - k-means clustering of nodes by topic
 *  - Top-K similar node lookup
 *  - Duplicate / near-duplicate detection
 *  - Edge suggestion based on content similarity
 *  - Agent reputation scoring from fact-validation history
 *
 * All functions operate on plain data objects so they can run offline in
 * unit tests or on snapshots — no Neo4j session required.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface MLNode {
  id: string;
  type: string;
  content: string;
  created_by?: string;
  affects?: string[];
  [key: string]: unknown;
}

export interface SimilarNode {
  id: string;
  score: number;
  type: string;
}

export interface Cluster {
  id: number;
  centroid: Map<string, number>;
  nodes: string[];
  topTerms: string[];
}

export interface EdgeSuggestion {
  fromId: string;
  toId: string;
  relType: string;
  score: number;
  reason: string;
}

export interface DuplicatePair {
  aId: string;
  bId: string;
  score: number;
}

export interface AgentReputation {
  agent: string;
  score: number;
  validates: number;
  challenges: number;
  submissions: number;
  accuracy: number;
  tier: 'novice' | 'contributor' | 'trusted' | 'expert';
}

export interface FactVoteRecord {
  factId: string;
  voter: string;
  vote: 'validate' | 'challenge';
  factFinalState?: 'confirmed' | 'rejected' | 'pending' | 'contested';
  submittedBy?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Stopwords (common English + technical terms that add no signal)
// ──────────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'can', 'it', 'its',
  'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she', 'they',
  'not', 'no', 'so', 'if', 'then', 'than', 'when', 'which', 'who', 'what',
  'how', 'all', 'any', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'once',
  'use', 'used', 'using', 'also', 'such', 'new', 'get', 'set', 'based',
]);

// ──────────────────────────────────────────────────────────────────────────────
// TF-IDF Utilities
// ──────────────────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const total = tokens.length || 1;
  tf.forEach((v, k) => tf.set(k, v / total));
  return tf;
}

function buildIDF(documents: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  const N = documents.length;
  for (const doc of documents) {
    for (const term of new Set(doc)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  df.forEach((count, term) => {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1);
  });
  return idf;
}

function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = termFrequency(tokens);
  const vec = new Map<string, number>();
  tf.forEach((tfVal, term) => {
    const idfVal = idf.get(term) ?? Math.log(2);
    vec.set(term, tfVal * idfVal);
  });
  return vec;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  a.forEach((v, k) => {
    dot += v * (b.get(k) ?? 0);
    normA += v * v;
  });
  b.forEach(v => (normB += v * v));
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Find the top-K most similar nodes to `target` within `corpus`.
 * Returns sorted descending by cosine similarity.
 */
export function findSimilar(
  target: MLNode,
  corpus: MLNode[],
  topK = 5,
): SimilarNode[] {
  const allTokens = corpus.map(n => tokenize(n.content));
  const idf = buildIDF(allTokens);

  const targetVec = tfidfVector(tokenize(target.content), idf);

  return corpus
    .filter(n => n.id !== target.id)
    .map(n => ({
      id: n.id,
      type: n.type,
      score: cosine(targetVec, tfidfVector(tokenize(n.content), idf)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Detect near-duplicate node pairs above the similarity threshold.
 */
export function detectDuplicates(
  nodes: MLNode[],
  threshold = 0.85,
): DuplicatePair[] {
  const allTokens = nodes.map(n => tokenize(n.content));
  const idf = buildIDF(allTokens);
  const vecs = nodes.map(n => tfidfVector(tokenize(n.content), idf));

  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const score = cosine(vecs[i], vecs[j]);
      if (score >= threshold) {
        pairs.push({ aId: nodes[i].id, bId: nodes[j].id, score });
      }
    }
  }
  return pairs.sort((a, b) => b.score - a.score);
}

/**
 * Suggest new edges based on content similarity.
 *
 * Heuristics:
 *  - Decision ↔ Risk with score > 0.4  →  AFFECTS
 *  - Decision ↔ Decision with score > 0.5  →  RELATED_TO
 *  - Same type with score > 0.7 (but < 0.85) →  RELATED_TO  (too close = duplicate)
 */
export function suggestEdges(
  nodes: MLNode[],
  minScore = 0.35,
): EdgeSuggestion[] {
  const allTokens = nodes.map(n => tokenize(n.content));
  const idf = buildIDF(allTokens);
  const vecs = nodes.map(n => tfidfVector(tokenize(n.content), idf));

  const suggestions: EdgeSuggestion[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const score = cosine(vecs[i], vecs[j]);
      if (score < minScore) continue;

      const a = nodes[i];
      const b = nodes[j];

      const relType =
        (a.type === 'decision' && b.type === 'risk') ||
        (a.type === 'risk' && b.type === 'decision')
          ? 'AFFECTS'
          : 'RELATED_TO';

      const reason =
        relType === 'AFFECTS'
          ? `Risk may affect decision (similarity ${score.toFixed(3)})`
          : `Semantically related content (similarity ${score.toFixed(3)})`;

      suggestions.push({ fromId: a.id, toId: b.id, relType, score, reason });
    }
  }
  return suggestions.sort((a, b) => b.score - a.score);
}

/**
 * k-means clustering of nodes by TF-IDF content vectors.
 * Uses cosine distance.  Falls back gracefully for very small corpora.
 */
export function clusterNodes(
  nodes: MLNode[],
  k = 5,
  maxIter = 30,
): Cluster[] {
  if (nodes.length === 0) return [];
  const effectiveK = Math.min(k, nodes.length);

  const allTokens = nodes.map(n => tokenize(n.content));
  const idf = buildIDF(allTokens);
  const vecs = nodes.map(n => tfidfVector(tokenize(n.content), idf));

  // Seed centroids using spread initialisation (pick nodes most spread out)
  const centroids: Map<string, number>[] = [];
  centroids.push(new Map(vecs[0]));
  for (let c = 1; c < effectiveK; c++) {
    // Next centroid = node with maximum minimum-distance to existing centroids
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < vecs.length; i++) {
      const minSim = Math.min(...centroids.map(cen => cosine(vecs[i], cen)));
      const dist = 1 - minSim;
      if (dist > bestScore) { bestScore = dist; best = i; }
    }
    centroids.push(new Map(vecs[best]));
  }

  let assignments = new Array<number>(nodes.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign step
    const next = assignments.map((_, i) => {
      let best = 0;
      let bestSim = -1;
      for (let c = 0; c < centroids.length; c++) {
        const sim = cosine(vecs[i], centroids[c]);
        if (sim > bestSim) { bestSim = sim; best = c; }
      }
      return best;
    });

    const changed = next.some((v, i) => v !== assignments[i]);
    assignments = next;
    if (!changed) break;

    // Update step — recompute centroids as mean of assigned vectors
    for (let c = 0; c < effectiveK; c++) {
      const members = nodes.filter((_, i) => assignments[i] === c);
      if (members.length === 0) continue;
      const newCentroid = new Map<string, number>();
      const memberVecs = members.map((_, mi) => vecs[nodes.indexOf(members[mi])]);
      for (const vec of memberVecs) {
        vec.forEach((v, term) => {
          newCentroid.set(term, (newCentroid.get(term) ?? 0) + v);
        });
      }
      newCentroid.forEach((v, k) => newCentroid.set(k, v / members.length));
      centroids[c] = newCentroid;
    }
  }

  // Build result clusters
  return centroids.map((centroid, cId) => {
    const memberIds = nodes.filter((_, i) => assignments[i] === cId).map(n => n.id);
    // Top terms = highest-weight terms in centroid
    const topTerms = [...centroid.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);
    return { id: cId, centroid, nodes: memberIds, topTerms };
  }).filter(c => c.nodes.length > 0);
}

/**
 * Score agent reputation from their voting history.
 *
 * Formula:
 *   accuracy   = fraction of their votes that aligned with the final quorum verdict
 *   engagement = log(1 + total_votes) — rewards consistent participation
 *   score      = accuracy * engagement (capped to [0, 10])
 *
 * Tiers: novice <1 | contributor <3 | trusted <6 | expert >=6
 */
export function scoreAgentReputation(
  agent: string,
  history: FactVoteRecord[],
): AgentReputation {
  const mine = history.filter(r => r.voter === agent);
  const validates = mine.filter(r => r.vote === 'validate').length;
  const challenges = mine.filter(r => r.vote === 'challenge').length;
  const total = mine.length;

  const submissions = history.filter(r => r.submittedBy === agent).length;

  // Accuracy: votes that matched the final verdict
  const aligned = mine.filter(r => {
    if (!r.factFinalState) return false;
    return (
      (r.vote === 'validate' && r.factFinalState === 'confirmed') ||
      (r.vote === 'challenge' && r.factFinalState === 'rejected')
    );
  }).length;

  const accuracy = total === 0 ? 0 : aligned / total;
  const engagement = Math.log(1 + total);
  const rawScore = accuracy * engagement;
  const score = Math.min(10, rawScore);

  const tier: AgentReputation['tier'] =
    score >= 6 ? 'expert' :
    score >= 3 ? 'trusted' :
    score >= 1 ? 'contributor' :
    'novice';

  return { agent, score, validates, challenges, submissions, accuracy, tier };
}

/**
 * Rank all agents from a batch of fact vote records.
 */
export function rankAgents(history: FactVoteRecord[]): AgentReputation[] {
  const agents = new Set(history.map(r => r.voter));
  return [...agents]
    .map(agent => scoreAgentReputation(agent, history))
    .sort((a, b) => b.score - a.score);
}
