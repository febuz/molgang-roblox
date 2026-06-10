/**
 * Group Event Bus — capability-routed fan-out for group/vote/fact events
 *
 * Single choke point through which group lifecycle events, ballots, fact
 * matrix ingests, and market transactions are mirrored outward. The bus
 * never imports a concrete transport: it publishes through the
 * TransportAdapter interface (transport-adapter.ts) and routes every event
 * by class against the capabilities each adapter declares:
 *
 *   governance events  (group.*, ballots, certificates)
 *       → only adapters with suitableForCheckpointGossip
 *   telemetry events   (matrix.fact.ingested, sensor/lab ingest mirrors)
 *       → only adapters with suitableForTelemetry
 *
 * MQTT is therefore structurally excluded from the voting path: the
 * MqttTelemetryAdapter declares telemetry-only capabilities, so ballot and
 * proposal events can never reach an MQTT broker, regardless of wiring.
 * (Threat model §3.8 — adversarial transport.)
 *
 * Kafka (topic group.events) remains the in-house durable stream for
 * downstream processors and rides the shared best-effort producer.
 *
 * Delivery is BEST-EFFORT BY DESIGN on every leg: the sources of truth are
 * the in-process Merkle-certified stores (group ballots, fact matrix rows).
 * A dropped event can always be recomputed from them; a duplicated event is
 * idempotent for consumers because every event carries the content hash of
 * the row/ballot it mirrors. This is the same trust split as the value
 * chain vs. its Neo4j cache (threat model §3.6).
 */

import { canonicalize, sha256 } from './graph-state-root';
import { bestEffortPublish } from '../kafka/shared';
import { mayCarry, type TransportAdapter, type TransportEventClass } from './transport-adapter';
import logger from '../../utils/logger';

export const KAFKA_GROUP_EVENTS_TOPIC = 'group.events';
export const MQTT_TOPIC_PREFIX = 'vpc';

export type GroupEventType =
  | 'group.created' | 'group.member.joined' | 'group.member.left'
  | 'group.proposal.created' | 'group.ballot.cast' | 'group.proposal.closed'
  | 'matrix.fact.ingested';

/** Which transport-capability class an event type belongs to. */
export function eventClass(type: GroupEventType): TransportEventClass {
  return type === 'matrix.fact.ingested' ? 'telemetry' : 'governance';
}

export interface GroupEvent {
  type: GroupEventType;
  groupId?: string;          // absent for matrix.* events
  /** SHA-256 over the canonical body — consumers dedupe on this. */
  eventHash: string;
  ts: string;
  body: Record<string, unknown>;
}

export class GroupEventBus {
  /** Counters for /api/groups/stats + tests. */
  readonly stats = {
    emitted: 0,
    kafkaAttempts: 0,
    /** Per-adapter accepted-publish counts, keyed by adapter name. */
    transportPublished: {} as Record<string, number>,
    /** Events withheld from an adapter because it lacked the required capability. */
    transportRefused: {} as Record<string, number>,
  };

  constructor(private readonly transports: TransportAdapter[] = []) {}

  /** Fire-and-forget on every leg; never throws. */
  emit(type: GroupEventType, body: Record<string, unknown>, groupId?: string): GroupEvent {
    const ts = new Date().toISOString();
    const eventHash = sha256(canonicalize({ type, groupId: groupId ?? null, body }));
    const event: GroupEvent = { type, ...(groupId ? { groupId } : {}), eventHash, ts, body };
    this.stats.emitted += 1;

    const cls = eventClass(type);
    const topic = groupId
      ? `${MQTT_TOPIC_PREFIX}/groups/${groupId}/${type.split('.').slice(1).join('.')}`
      : `${MQTT_TOPIC_PREFIX}/matrix/${String(body.kind ?? 'fact')}`;
    const payload = Buffer.from(JSON.stringify(event));

    for (const t of this.transports) {
      if (!mayCarry(t, cls)) {
        this.stats.transportRefused[t.name] = (this.stats.transportRefused[t.name] ?? 0) + 1;
        continue;
      }
      void t.publish(topic, payload)
        .then(r => {
          if (r.accepted) {
            this.stats.transportPublished[t.name] = (this.stats.transportPublished[t.name] ?? 0) + 1;
          }
        })
        .catch((e: any) => logger.debug(`group-events ${t.name}: ${e.message}`));
    }

    this.stats.kafkaAttempts += 1;
    void bestEffortPublish(p =>
      p.publishBatch(KAFKA_GROUP_EVENTS_TOPIC, [{ key: groupId ?? type, value: event }]),
    );

    return event;
  }
}
