/**
 * Transport adapter layer — the core never imports a concrete transport
 *
 * Design rule (threat model §3.8):
 *
 *   Transport delivers bytes.
 *   Crypto defines truth.
 *   Reducer defines state.
 *   Certificate defines finality.
 *   Anchor defines external timestamp.
 *
 * The voting / governance core therefore sees only this interface. Concrete
 * protocols (MQTT, libp2p gossipsub, Nostr relays, HTTP/3 gateways, Hedera
 * HCS) are plugins, each declaring its capabilities; the event bus routes by
 * capability and refuses to send governance-class events to adapters that
 * are only suitable for telemetry.
 *
 * MQTT is explicitly excluded from the sovereign voting core. It may be used
 * as a telemetry ingress adapter for IoT and laboratory systems, but voting
 * privacy, eligibility, tallying, checkpointing and result certification
 * must be transport-independent and cryptographically verifiable under an
 * adversarial transport model. The transport may read, delay, duplicate,
 * drop, or reorder messages — it must never be able to forge a vote, link a
 * choice to an identity, change a result root, or silently alter a tally.
 * Those guarantees come from signatures, content hashes, Merkle state roots
 * and result certificates — never from transport trust.
 */

import type { MqttClient } from '../mqtt/mqtt-client';
import logger from '../../utils/logger';

// ── Core interfaces (the only thing the voting/graph core may depend on) ─────

export interface PublishReceipt {
  /** Whether the adapter accepted the message for delivery (best-effort). */
  accepted: boolean;
  adapter: string;
  at: string;
}

export type Unsubscribe = () => Promise<void>;

export interface TransportMessage {
  topic: string;
  bytes: Uint8Array;
  receivedAt: string;
  transportPeer?: string;
  brokerId?: string;
}

export interface TransportCapabilities {
  p2p: boolean;
  brokered: boolean;
  supportsBackpressure: boolean;
  supportsAuth: boolean;
  supportsEncryption: boolean;
  /** How much client metadata (identity, timing, subscriptions) the transport exposes. */
  exposesClientMetadataRisk: 'low' | 'medium' | 'high';
  suitableForSecretBallot: boolean;
  suitableForTelemetry: boolean;
  suitableForCheckpointGossip: boolean;
}

export interface TransportAdapter {
  readonly name: string;
  readonly capabilities: TransportCapabilities;
  publish(topic: string, message: Uint8Array): Promise<PublishReceipt>;
  subscribe(
    topic: string,
    handler: (message: TransportMessage) => Promise<void>,
  ): Promise<Unsubscribe>;
  close(): Promise<void>;
}

// ── Event classes and capability-based routing ────────────────────────────────

/**
 * Every outbound event belongs to exactly one class; the class decides which
 * capability an adapter must declare before it may carry the event.
 *
 *  - `governance`: group lifecycle, proposals, ballots, certificates. These
 *    mirror the Merkle-certified record outward and may carry voter DIDs
 *    (Mode A roll-call voting) — never routed to telemetry-only transports.
 *  - `telemetry`: sensor/lab/machine readings, fact-matrix ingest mirrors.
 *  - `secret-ballot`: reserved for Mode B encrypted ballots; requires
 *    `suitableForSecretBallot` (no built-in adapter qualifies today).
 */
export type TransportEventClass = 'governance' | 'telemetry' | 'secret-ballot';

export function requiredCapability(cls: TransportEventClass): keyof TransportCapabilities {
  switch (cls) {
    case 'governance': return 'suitableForCheckpointGossip';
    case 'telemetry': return 'suitableForTelemetry';
    case 'secret-ballot': return 'suitableForSecretBallot';
  }
}

/** True iff the adapter declares the capability the event class requires. */
export function mayCarry(adapter: TransportAdapter, cls: TransportEventClass): boolean {
  return adapter.capabilities[requiredCapability(cls)] === true;
}

// ── MQTT: telemetry ingress adapter ONLY ─────────────────────────────────────

export const MQTT_TELEMETRY_CAPABILITIES: TransportCapabilities = {
  p2p: false,
  brokered: true,
  supportsBackpressure: false,        // QoS 0 fire-and-forget
  supportsAuth: false,                // basic-auth mode is not trust-symmetrical (MQTT 3.1.1 §5.4)
  supportsEncryption: false,          // TLS is a fronting concern, not provided here
  exposesClientMetadataRisk: 'high',  // broker sees client ids, topics, timing
  suitableForSecretBallot: false,
  suitableForTelemetry: true,
  suitableForCheckpointGossip: false,
};

/**
 * Wraps the zero-dep MQTT 3.1.1 client as a telemetry-only transport.
 * Defense in depth: even if a caller bypasses the bus routing, publish()
 * refuses non-telemetry traffic at the adapter boundary.
 */
export class MqttTelemetryAdapter implements TransportAdapter {
  readonly name = 'mqtt-telemetry';
  readonly capabilities = MQTT_TELEMETRY_CAPABILITIES;

  constructor(
    private readonly client: MqttClient,
    /** Topic prefixes this adapter will carry; everything else is refused. */
    private readonly allowedTopicPrefixes: string[] = ['vpc/matrix/', 'vpc/telemetry/'],
  ) {}

  async publish(topic: string, message: Uint8Array): Promise<PublishReceipt> {
    const at = new Date().toISOString();
    if (!this.allowedTopicPrefixes.some(p => topic.startsWith(p))) {
      logger.debug(`mqtt-telemetry: refused non-telemetry topic ${topic}`);
      return { accepted: false, adapter: this.name, at };
    }
    const accepted = this.client.publish(topic, Buffer.from(message));
    return { accepted, adapter: this.name, at };
  }

  async subscribe(): Promise<Unsubscribe> {
    // The minimal client is publish-only (QoS 0); ingress subscription is a
    // broker-side concern. Surface that honestly instead of pretending.
    throw new Error('mqtt-telemetry adapter is publish-only (no SUBSCRIBE in minimal client)');
  }

  async close(): Promise<void> {
    this.client.close();
  }
}

// ── In-memory adapter (tests, single-process wiring) ─────────────────────────

/**
 * Loopback adapter with caller-chosen capabilities. Used by tests to verify
 * routing and by single-process deployments that want the bus contract
 * without an external broker.
 */
export class LoopbackAdapter implements TransportAdapter {
  readonly delivered: Array<{ topic: string; bytes: Uint8Array }> = [];
  private handlers = new Map<string, Array<(m: TransportMessage) => Promise<void>>>();

  constructor(
    readonly name: string,
    readonly capabilities: TransportCapabilities,
  ) {}

  async publish(topic: string, message: Uint8Array): Promise<PublishReceipt> {
    const at = new Date().toISOString();
    this.delivered.push({ topic, bytes: message });
    for (const h of this.handlers.get(topic) ?? []) {
      await h({ topic, bytes: message, receivedAt: at });
    }
    return { accepted: true, adapter: this.name, at };
  }

  async subscribe(topic: string, handler: (m: TransportMessage) => Promise<void>): Promise<Unsubscribe> {
    const list = this.handlers.get(topic) ?? [];
    list.push(handler);
    this.handlers.set(topic, list);
    return async () => {
      const cur = this.handlers.get(topic) ?? [];
      this.handlers.set(topic, cur.filter(h => h !== handler));
    };
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }
}
