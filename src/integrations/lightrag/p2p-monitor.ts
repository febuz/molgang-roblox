/**
 * P2P Network Monitor
 *
 * Aggregates health and stats from all P2P knowledge-graph components
 * into a single dashboard endpoint: GET /api/lightrag/monitor
 *
 * Reports on:
 *  - Neo4j connection state
 *  - P2PSync (Kafka consumer) — processed/skipped/errors
 *  - P2PGossip (HTTP fallback) — push/pull/merge counts
 *  - FactValidator — pending/confirmed/contested/rejected counts
 *  - InferenceEngine — last run, rules derived
 *  - Graph ML — node/edge/cluster counts (lightweight)
 *  - Snapshot — last snapshot metadata
 *  - AgentBridge — tasks bridged, errors
 *
 * All fields degrade gracefully to null/0 when the component is offline.
 */

import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import type { P2PSync } from './p2p-sync';
import type { P2PGossip } from './p2p-gossip';
import type { FactValidator } from './fact-validator';
import type { InferenceEngine } from './graph-inference';
import type { AgentBridge } from './agent-bridge';
import logger from '../../utils/logger';

export interface MonitorSnapshot {
  ts: string;
  neo4j: {
    connected: boolean;
    nodeCount: number | null;
    edgeCount: number | null;
  };
  p2pSync: {
    running: boolean;
    processed: number;
    skipped: number;
    errors: number;
    lastEventAt: string | null;
    lastEventType: string | null;
  } | null;
  gossip: {
    running: boolean;
    peersConfigured: number;
    pushCount: number;
    pullCount: number;
    mergeCount: number;
    errorCount: number;
    lastGossipAt: string | null;
  } | null;
  factValidator: {
    total: number;
    pending: number;
    confirmed: number;
    contested: number;
    rejected: number;
  } | null;
  inferenceEngine: {
    lastRunAt: string | null;
  } | null;
  agentBridge: {
    tasksCompleted: number;
    tasksFailed: number;
    proposals: number;
    errors: number;
  } | null;
  overallHealth: 'healthy' | 'degraded' | 'offline';
}

async function countNodesAndEdges(lightrag: LightRAGClient): Promise<{ nodeCount: number; edgeCount: number } | null> {
  if (!lightrag.isConnected()) return null;
  const driver = (lightrag as any).driver;
  const session = driver.session();
  try {
    const [nodeRes, edgeRes] = await Promise.all([
      session.run('MATCH (n) RETURN count(n) AS c'),
      session.run('MATCH ()-[r]->() RETURN count(r) AS c'),
    ]);
    const toNum = (res: any) => {
      const raw = res.records[0]?.get('c');
      if (!raw) return 0;
      return typeof raw === 'object' && 'low' in raw ? raw.low : Number(raw);
    };
    return { nodeCount: toNum(nodeRes), edgeCount: toNum(edgeRes) };
  } catch {
    return null;
  } finally {
    await session.close();
  }
}

function determineHealth(snap: MonitorSnapshot): MonitorSnapshot['overallHealth'] {
  if (!snap.neo4j.connected) return 'offline';
  if (
    (snap.p2pSync?.errors ?? 0) > 10 ||
    (snap.gossip?.errorCount ?? 0) > 10
  ) return 'degraded';
  return 'healthy';
}

export function registerMonitorRoutes(
  app: Express,
  lightrag: LightRAGClient,
  components: {
    p2pSync?: P2PSync;
    gossip?: P2PGossip;
    factValidator?: FactValidator;
    inferenceEngine?: InferenceEngine;
    agentBridge?: AgentBridge;
  } = {},
): void {
  const { p2pSync, gossip, factValidator, inferenceEngine, agentBridge } = components;

  app.get('/api/lightrag/monitor', async (_req: Request, res: Response): Promise<void> => {
    const graphCounts = await countNodesAndEdges(lightrag).catch(() => null);

    const syncStats = p2pSync?.getStats() ?? null;
    const gossipStats = gossip?.getStats() ?? null;
    const fvStats = factValidator?.getStats() ?? null;
    const bridgeStats = (agentBridge as any)?.getStats?.() ?? null;

    const snap: MonitorSnapshot = {
      ts: new Date().toISOString(),
      neo4j: {
        connected: lightrag.isConnected(),
        nodeCount: graphCounts?.nodeCount ?? null,
        edgeCount: graphCounts?.edgeCount ?? null,
      },
      p2pSync: syncStats
        ? {
            running: syncStats.running,
            processed: syncStats.processed,
            skipped: syncStats.skipped,
            errors: syncStats.errors,
            lastEventAt: syncStats.lastEventAt,
            lastEventType: syncStats.lastEventType,
          }
        : null,
      gossip: gossipStats
        ? {
            running: gossipStats.running,
            peersConfigured: gossipStats.peersConfigured,
            pushCount: gossipStats.pushCount,
            pullCount: gossipStats.pullCount,
            mergeCount: gossipStats.mergeCount,
            errorCount: gossipStats.errorCount,
            lastGossipAt: gossipStats.lastGossipAt,
          }
        : null,
      factValidator: fvStats
        ? {
            total: fvStats.total,
            pending: fvStats.pending,
            confirmed: fvStats.confirmed,
            contested: fvStats.contested,
            rejected: fvStats.rejected,
          }
        : null,
      inferenceEngine: inferenceEngine
        ? { lastRunAt: inferenceEngine.getLastRunAt() }
        : null,
      agentBridge: bridgeStats
        ? {
            tasksCompleted: bridgeStats.tasksCompleted ?? 0,
            tasksFailed: bridgeStats.tasksFailed ?? 0,
            proposals: bridgeStats.proposals ?? 0,
            errors: bridgeStats.errors ?? 0,
          }
        : null,
      overallHealth: 'healthy',
    };

    snap.overallHealth = determineHealth(snap);
    res.json({ success: true, monitor: snap });
  });

  logger.info('✓ P2P Monitor registered (/api/lightrag/monitor)');
}
