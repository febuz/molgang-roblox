/**
 * Governance + wiki knowledge graph — pushes governance entries and
 * wiki terms into LightRAG/Neo4j as Nodes so the rest of the system can
 * ask "what's the lineage of fugacity?" or "which wiki terms are tagged
 * quantum-chemistry?" via Cypher.
 *
 * Two ingest functions:
 *   - ingestGovernanceState(client) — writes one Node per governance
 *     entry. Type: 'governance'. Tags / kind / owner go into context.
 *   - ingestWikiState(client) — writes one Node per wiki entry. Type:
 *     'wiki'. The governanceId becomes an `affects` link so a later
 *     query can walk wiki → governance.
 *
 * Both are idempotent — the LightRAG client uses MERGE/CREATE patterns;
 * re-running on the same dataset just refreshes the timestamps. Both
 * are graceful: if LightRAG is offline (Neo4j unreachable), they noop
 * silently and return { offline: true }.
 *
 * Real-time hook:
 *   - notifyGovernanceWrite(client, entry) is called from index.ts
 *     after a successful POST /api/governance/register. Fire-and-forget.
 *   - notifyWikiWrite(client, entry) likewise after wiki upserts.
 */
import logger from '../../utils/logger';
import type { LightRAGClient } from './client';
import * as governance from '../governance';
import * as wiki from '../wiki';
import { bestEffortPublish } from '../kafka/shared';

// Publish to the lightrag.updates Kafka topic so the audit consumer (and
// future replicas) see governance + wiki state changes. Best-effort: if
// Kafka is offline we still wrote to Neo4j, so the local graph stays
// consistent. Schema matches KafkaProducer.publishMemoryUpdate.
function publishUpdate(payload: {
  type: 'decision' | 'risk' | 'precedent' | 'context';
  content: string;
  agent: string;
  affects?: string[];
  metadata?: Record<string, any>;
}) {
  bestEffortPublish(p => p.publishMemoryUpdate(payload));
}

interface IngestResult {
  ingested: number;
  offline: boolean;
}

export async function ingestGovernanceState(client: LightRAGClient): Promise<IngestResult> {
  if (!client.isConnected()) return { ingested: 0, offline: true };
  const entries = governance.listEntries();
  let ingested = 0;
  for (const e of entries) {
    try {
      await client.addNode({
        type: 'governance',
        content: `${e.name} — ${e.lineage || ''}`,
        context: `kind=${e.kind} owner=${e.owner} license=${e.license || ''} tags=${(e.tags || []).join(',')}`,
        created_by: e.owner,
        affects: e.tags || [],
      });
      // Mirror to Kafka lightrag.updates so the audit log + future replicas
      // see the same state. Best-effort: Kafka offline means we still
      // ingested to Neo4j.
      publishUpdate({
        type: 'context',
        content: `governance:${e.id} — ${e.name}`,
        agent: e.owner,
        affects: e.tags || [],
        metadata: { kind: e.kind, source: e.source, license: e.license },
      });
      ingested++;
    } catch (err: any) {
      logger.warn(`governance-graph: failed to ingest ${e.id}: ${err.message}`);
    }
  }
  return { ingested, offline: false };
}

export async function ingestWikiState(client: LightRAGClient): Promise<IngestResult> {
  if (!client.isConnected()) return { ingested: 0, offline: true };
  const entries = wiki.listEntries();
  let ingested = 0;
  for (const e of entries) {
    try {
      // affects[] links wiki → governance entry that owns this term, plus any
      // see-also targets, so a Cypher walk can recover the citation chain.
      const affects = [
        ...(e.governanceId ? [e.governanceId] : []),
        ...(e.seeAlso || []),
      ];
      await client.addNode({
        type: 'wiki',
        content: `${e.term}: ${e.summary}`,
        context: `namespace=${e.namespace} author=${e.author || ''} updated=${e.updatedAt}`,
        created_by: e.author || 'unknown',
        affects,
      });
      publishUpdate({
        type: 'context',
        content: `wiki:${e.id} — ${e.term}`,
        agent: e.author || 'unknown',
        affects,
        metadata: { namespace: e.namespace, governanceId: e.governanceId },
      });
      ingested++;
    } catch (err: any) {
      logger.warn(`governance-graph: failed to ingest wiki:${e.id}: ${err.message}`);
    }
  }
  return { ingested, offline: false };
}

/**
 * Real-time write hook for a single governance entry. Called from
 * index.ts after POST /api/governance/register succeeds. Fire-and-forget
 * — failure logs but never breaks the parent request.
 */
export function notifyGovernanceWrite(client: LightRAGClient, entry: governance.GovernanceEntry): void {
  if (client.isConnected()) {
    client.addNode({
      type: 'governance',
      content: `${entry.name} — ${entry.lineage || ''}`,
      context: `kind=${entry.kind} owner=${entry.owner} license=${entry.license || ''} tags=${(entry.tags || []).join(',')}`,
      created_by: entry.owner,
      affects: entry.tags || [],
    }).catch((err: any) => logger.warn(`governance-graph: notify failed for ${entry.id}: ${err.message}`));
  }
  // Always publish to Kafka regardless of LightRAG state — Kafka is the
  // authoritative event log.
  publishUpdate({
    type: 'context',
    content: `governance:${entry.id} — ${entry.name}`,
    agent: entry.owner,
    affects: entry.tags || [],
    metadata: { kind: entry.kind, source: entry.source, license: entry.license },
  });
}

export function notifyWikiWrite(client: LightRAGClient, entry: wiki.WikiEntry): void {
  const affects = [
    ...(entry.governanceId ? [entry.governanceId] : []),
    ...(entry.seeAlso || []),
  ];
  if (client.isConnected()) {
    client.addNode({
      type: 'wiki',
      content: `${entry.term}: ${entry.summary}`,
      context: `namespace=${entry.namespace} author=${entry.author || ''} updated=${entry.updatedAt}`,
      created_by: entry.author || 'unknown',
      affects,
    }).catch((err: any) => logger.warn(`governance-graph: notify failed for wiki:${entry.id}: ${err.message}`));
  }
  publishUpdate({
    type: 'context',
    content: `wiki:${entry.id} — ${entry.term}`,
    agent: entry.author || 'unknown',
    affects,
    metadata: { namespace: entry.namespace, governanceId: entry.governanceId },
  });
}
