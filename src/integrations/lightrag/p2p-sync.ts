/**
 * P2P Knowledge Graph Sync
 *
 * Closes the distributed loop: agents publish graph updates to the
 * Kafka `lightrag.updates` topic; this consumer subscribes and
 * materialises those events into the local Neo4j instance so every
 * node in the cluster shares the same knowledge state.
 *
 * Design:
 *  - MERGE on (id) for every incoming event — idempotent replay-safe.
 *  - Typed labels (Decision / Risk / Precedent / Context / Node) to
 *    keep compatibility with the schema indexes.
 *  - Relationship events (type === 'edge') create a directed edge
 *    between two existing nodes.
 *  - Graceful degradation: if Neo4j is offline the event is logged
 *    and skipped rather than crashing the consumer.
 *  - Stats surface via getStats() for the /api/lightrag/p2p endpoint.
 */

import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import type { LightRAGClient } from './client';
import type { FactValidator } from './fact-validator';
import logger from '../../utils/logger';

export interface P2PEvent {
  id: string;
  type: 'decision' | 'risk' | 'precedent' | 'context' | 'edge' | string;
  content: string;
  agent: string;
  affects?: string[];
  metadata?: Record<string, any>;
  /** For edge events: source / target node ids + relationship type */
  edge?: { fromId: string; toId: string; relType: string; props?: Record<string, any> };
  created_at: string;
}

interface SyncStats {
  processed: number;
  skipped: number;
  errors: number;
  lastEventAt: string | null;
  lastEventType: string | null;
  running: boolean;
}

const TOPIC = 'lightrag.updates';

/** Map event type → Neo4j label */
function labelFor(type: string): string {
  const map: Record<string, string> = {
    decision: 'Decision',
    risk: 'Risk',
    precedent: 'Precedent',
    context: 'Context',
  };
  return map[type] ?? 'Node';
}

export class P2PSync {
  private consumer: Consumer;
  private lightrag: LightRAGClient;
  private factValidator: FactValidator | null = null;
  private stats: SyncStats = {
    processed: 0,
    skipped: 0,
    errors: 0,
    lastEventAt: null,
    lastEventType: null,
    running: false,
  };

  /** Attach a FactValidator so remote fact-vote events are applied locally. */
  setFactValidator(fv: FactValidator): void { this.factValidator = fv; }

  constructor(kafkaBrokers: string[], lightragClient: LightRAGClient, groupId = 'lightrag-p2p-sync') {
    const kafka = new Kafka({
      clientId: 'lightrag-p2p-sync',
      brokers: kafkaBrokers,
      retry: { initialRetryTime: 300, retries: 5 },
    });
    this.consumer = kafka.consumer({ groupId, sessionTimeout: 30000, heartbeatInterval: 3000 });
    this.lightrag = lightragClient;
  }

  async start(): Promise<void> {
    if (/^(1|true|yes)$/i.test(process.env.KAFKA_DISABLED || '')) {
      logger.info('P2PSync disabled via KAFKA_DISABLED — Kafka topic sync not started');
      this.stats.running = false;
      return;
    }
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: TOPIC, fromBeginning: false });
      this.stats.running = true;

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      logger.info('✓ P2PSync: listening on lightrag.updates');
    } catch (err: any) {
      logger.warn(`P2PSync: Kafka unavailable — sync disabled (${err.message})`);
      this.stats.running = false;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.consumer.disconnect();
    } catch {
      // ignore disconnect errors on shutdown
    }
    this.stats.running = false;
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }

  // ──────────────────────────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────────────────────────

  private async handleMessage({ message }: EachMessagePayload): Promise<void> {
    if (!message.value) { this.stats.skipped++; return; }

    let event: P2PEvent;
    try {
      event = JSON.parse(message.value.toString('utf-8')) as P2PEvent;
    } catch {
      this.stats.errors++;
      return;
    }

    if (!this.lightrag.isConnected()) {
      this.stats.skipped++;
      return;
    }

    try {
      if (event.type === 'edge' && event.edge) {
        // Relationship creation event
        await this.lightrag.addEdge(
          event.edge.fromId,
          event.edge.relType,
          event.edge.toId,
          event.edge.props,
        );
      } else if (event.metadata?.factVote && this.factValidator) {
        // Fact-vote event — apply remotely to keep quorum counts in sync
        const vote = event.metadata.factVote as { factId: string; voter: string; vote: 'validate' | 'challenge'; reason?: string; ts: string };
        await this.factValidator.applyRemoteVote(vote);
      } else {
        // Standard node event — MERGE into local graph
        await this.lightrag.mergeTypedNode(event.id, labelFor(event.type), {
          type: event.type,
          content: event.content,
          created_by: event.agent,
          context: (event.metadata ? JSON.stringify(event.metadata) : undefined) ?? '',
          affects: event.affects ?? [],
          synced_at: new Date().toISOString(),
        });
      }

      this.stats.processed++;
      this.stats.lastEventAt = event.created_at;
      this.stats.lastEventType = event.type;
      logger.debug(`P2PSync: applied ${event.type} (${event.id}) from ${event.agent}`);
    } catch (err: any) {
      this.stats.errors++;
      logger.warn(`P2PSync: failed to apply ${event.id}: ${err.message}`);
    }
  }
}
