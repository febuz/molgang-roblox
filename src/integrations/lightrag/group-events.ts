/**
 * Group Event Bus — MQTT + Kafka fan-out for group/vote/fact events
 *
 * Single choke point through which group lifecycle events, ballots, fact
 * matrix ingests, and market transactions are mirrored outward:
 *
 *   MQTT  (live mirror, QoS 0)  topic vpc/groups/<groupId>/<type>
 *                               topic vpc/matrix/<kind>     (fact ingests)
 *   Kafka (durable stream)      topic group.events — one consumer-group
 *                               per downstream processor replays at will
 *
 * Delivery is BEST-EFFORT BY DESIGN on both legs: the sources of truth are
 * the in-process Merkle-certified stores (group ballots, fact matrix rows).
 * A dropped event can always be recomputed from them; a duplicated event is
 * idempotent for consumers because every event carries the content hash of
 * the row/ballot it mirrors. This is the same trust split as the value
 * chain vs. its Neo4j cache (threat model §3.6).
 */

import { canonicalize, sha256 } from './graph-state-root';
import { bestEffortPublish } from '../kafka/shared';
import type { MqttClient } from '../mqtt/mqtt-client';
import logger from '../../utils/logger';

export const KAFKA_GROUP_EVENTS_TOPIC = 'group.events';
export const MQTT_TOPIC_PREFIX = 'vpc';

export type GroupEventType =
  | 'group.created' | 'group.member.joined' | 'group.member.left'
  | 'group.proposal.created' | 'group.ballot.cast' | 'group.proposal.closed'
  | 'matrix.fact.ingested';

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
  readonly stats = { emitted: 0, mqttPublished: 0, kafkaAttempts: 0 };

  constructor(private readonly mqtt: MqttClient | null) {}

  /** Fire-and-forget on both legs; never throws. */
  emit(type: GroupEventType, body: Record<string, unknown>, groupId?: string): GroupEvent {
    const ts = new Date().toISOString();
    const eventHash = sha256(canonicalize({ type, groupId: groupId ?? null, body }));
    const event: GroupEvent = { type, ...(groupId ? { groupId } : {}), eventHash, ts, body };
    this.stats.emitted += 1;

    if (this.mqtt) {
      const topic = groupId
        ? `${MQTT_TOPIC_PREFIX}/groups/${groupId}/${type.split('.').slice(1).join('.')}`
        : `${MQTT_TOPIC_PREFIX}/matrix/${String(body.kind ?? 'fact')}`;
      try {
        if (this.mqtt.publish(topic, JSON.stringify(event))) this.stats.mqttPublished += 1;
      } catch (e: any) {
        logger.debug(`group-events mqtt: ${e.message}`);
      }
    }

    this.stats.kafkaAttempts += 1;
    void bestEffortPublish(p =>
      p.publishBatch(KAFKA_GROUP_EVENTS_TOPIC, [{ key: groupId ?? type, value: event }]),
    );

    return event;
  }
}
