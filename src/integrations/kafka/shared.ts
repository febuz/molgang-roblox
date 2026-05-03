/**
 * Shared single-instance Kafka producer for the running virtualpc service.
 *
 * Why module-level: chatAsAgent (lmstudio.ts) and addTask (task-engine.ts)
 * both need to publish events. Spinning up a producer per call thrashes the
 * connection pool. Spinning one up on boot — even though Kafka may not be
 * running — and calling its publish-* methods inside try/catch lets every
 * mutation site emit best-effort without breaking when the broker is down.
 *
 * Connection state is monitored: when the broker comes back up the producer
 * re-establishes via kafkajs's own retry, then events flow again.
 */

import { KafkaProducer } from './producer';
import logger from '../../utils/logger';

const BROKERS  = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'virtualpc-shared';

let _producer: KafkaProducer | null = null;
let _connected = false;
let _lastConnectAttempt = 0;
const RECONNECT_BACKOFF_MS = 30_000;

/** Idempotent. Safe to call multiple times. */
export async function ensureSharedProducer(): Promise<KafkaProducer | null> {
  if (_connected && _producer) return _producer;
  // Throttle reconnect attempts so a wholly-offline Kafka doesn't burn CPU.
  if (Date.now() - _lastConnectAttempt < RECONNECT_BACKOFF_MS && !_connected) return null;
  _lastConnectAttempt = Date.now();
  if (!_producer) _producer = new KafkaProducer({ brokers: BROKERS, clientId: CLIENT_ID });
  try {
    await _producer.connect();
    _connected = true;
    logger.info(`✓ shared Kafka producer connected to ${BROKERS.join(',')}`);
    return _producer;
  } catch (e: any) {
    _connected = false;
    logger.warn(`shared Kafka producer connect failed (will retry in ${RECONNECT_BACKOFF_MS / 1000}s): ${e.message}`);
    return null;
  }
}

/** Best-effort publish — never throws. The publishFn callback is invoked
 * with the live producer when the broker is reachable; silently noops when
 * not. Use this everywhere mutations want to fire events. */
export async function bestEffortPublish(publishFn: (p: KafkaProducer) => Promise<unknown>): Promise<void> {
  try {
    const p = await ensureSharedProducer();
    if (!p) return;
    await publishFn(p);
  } catch (e: any) {
    // Mark disconnected so the next call triggers a re-attempt; don't let
    // Kafka outages take the rest of the service down.
    _connected = false;
    logger.warn(`Kafka publish failed (will reconnect): ${e.message}`);
  }
}

export function isKafkaConnected(): boolean { return _connected; }
export function getKafkaBrokers(): string[] { return BROKERS; }
