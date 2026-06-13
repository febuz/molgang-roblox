/**
 * Transport adapter layer — capability routing contract
 *
 * The architectural rule under test (threat model §3.8): the voting /
 * governance core never depends on a concrete transport, and MQTT is
 * structurally excluded from the voting path. Transport delivers bytes;
 * crypto defines truth.
 */

process.env.KAFKA_DISABLED = '1';

import {
  MqttTelemetryAdapter, LoopbackAdapter, mayCarry, requiredCapability,
  MQTT_TELEMETRY_CAPABILITIES,
  type TransportCapabilities,
} from '../../src/integrations/lightrag/transport-adapter';
import { GroupEventBus, eventClass } from '../../src/integrations/lightrag/group-events';

const GOSSIP_CAPS: TransportCapabilities = {
  p2p: true, brokered: false, supportsBackpressure: true, supportsAuth: true,
  supportsEncryption: true, exposesClientMetadataRisk: 'low',
  suitableForSecretBallot: false, suitableForTelemetry: true, suitableForCheckpointGossip: true,
};

const TELEMETRY_ONLY_CAPS: TransportCapabilities = {
  ...MQTT_TELEMETRY_CAPABILITIES,
};

describe('capability model', () => {
  it('event classes map to the right required capability', () => {
    expect(requiredCapability('governance')).toBe('suitableForCheckpointGossip');
    expect(requiredCapability('telemetry')).toBe('suitableForTelemetry');
    expect(requiredCapability('secret-ballot')).toBe('suitableForSecretBallot');
  });

  it('every group/vote event type is governance-class; matrix ingest is telemetry', () => {
    expect(eventClass('group.created')).toBe('governance');
    expect(eventClass('group.member.joined')).toBe('governance');
    expect(eventClass('group.proposal.created')).toBe('governance');
    expect(eventClass('group.ballot.cast')).toBe('governance');
    expect(eventClass('group.proposal.closed')).toBe('governance');
    expect(eventClass('matrix.fact.ingested')).toBe('telemetry');
  });

  it('MQTT capabilities exclude the voting core by construction', () => {
    expect(MQTT_TELEMETRY_CAPABILITIES.suitableForSecretBallot).toBe(false);
    expect(MQTT_TELEMETRY_CAPABILITIES.suitableForCheckpointGossip).toBe(false);
    expect(MQTT_TELEMETRY_CAPABILITIES.suitableForTelemetry).toBe(true);
    expect(MQTT_TELEMETRY_CAPABILITIES.brokered).toBe(true);
    expect(MQTT_TELEMETRY_CAPABILITIES.exposesClientMetadataRisk).toBe('high');
  });

  it('mayCarry gates by declared capability, not by adapter name', () => {
    const telemetryOnly = new LoopbackAdapter('t-only', TELEMETRY_ONLY_CAPS);
    const gossip = new LoopbackAdapter('gossip', GOSSIP_CAPS);
    expect(mayCarry(telemetryOnly, 'governance')).toBe(false);
    expect(mayCarry(telemetryOnly, 'telemetry')).toBe(true);
    expect(mayCarry(telemetryOnly, 'secret-ballot')).toBe(false);
    expect(mayCarry(gossip, 'governance')).toBe(true);
    // No built-in adapter qualifies for secret ballots (Mode B is a
    // cryptographic ballot layer, not a transport feature).
    expect(mayCarry(gossip, 'secret-ballot')).toBe(false);
  });
});

describe('GroupEventBus capability routing', () => {
  it('governance events reach gossip-capable adapters only', async () => {
    const telemetryOnly = new LoopbackAdapter('t-only', TELEMETRY_ONLY_CAPS);
    const gossip = new LoopbackAdapter('gossip', GOSSIP_CAPS);
    const bus = new GroupEventBus([telemetryOnly, gossip]);

    bus.emit('group.ballot.cast', { voter: 'did:vpc:alice', option: 'a' }, 'g1');
    bus.emit('group.proposal.closed', { proposalId: 'p1' }, 'g1');
    await new Promise(r => setImmediate(r));

    expect(telemetryOnly.delivered.length).toBe(0);
    expect(gossip.delivered.length).toBe(2);
    expect(gossip.delivered[0].topic).toBe('vpc/groups/g1/ballot.cast');
    expect(bus.stats.transportRefused['t-only']).toBe(2);
    expect(bus.stats.transportPublished['gossip']).toBe(2);
  });

  it('telemetry events reach all telemetry-capable adapters', async () => {
    const telemetryOnly = new LoopbackAdapter('t-only', TELEMETRY_ONLY_CAPS);
    const gossip = new LoopbackAdapter('gossip', GOSSIP_CAPS);
    const bus = new GroupEventBus([telemetryOnly, gossip]);

    bus.emit('matrix.fact.ingested', { kind: 'spectrum', rowHash: 'h' });
    await new Promise(r => setImmediate(r));

    expect(telemetryOnly.delivered.length).toBe(1);
    expect(gossip.delivered.length).toBe(1);
    expect(telemetryOnly.delivered[0].topic).toBe('vpc/matrix/spectrum');
  });

  it('event payloads carry the dedupe content hash regardless of transport', async () => {
    const gossip = new LoopbackAdapter('gossip', GOSSIP_CAPS);
    const bus = new GroupEventBus([gossip]);
    const event = bus.emit('group.created', { name: 'x', owner: 'did:vpc:o' }, 'g2');
    await new Promise(r => setImmediate(r));

    const wire = JSON.parse(Buffer.from(gossip.delivered[0].bytes).toString());
    expect(wire.eventHash).toBe(event.eventHash);
    expect(wire.eventHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('every exchanged event is self-describing: schema id + class metadata', async () => {
    const gossip = new LoopbackAdapter('gossip', GOSSIP_CAPS);
    const bus = new GroupEventBus([gossip]);
    bus.emit('group.ballot.cast', { voter: 'did:vpc:v', option: 'a' }, 'g4');
    bus.emit('matrix.fact.ingested', { kind: 'spectrum' });
    await new Promise(r => setImmediate(r));

    const [gov, tel] = gossip.delivered.map(d => JSON.parse(Buffer.from(d.bytes).toString()));
    expect(gov.schema).toBe('vpc.group-event/1');
    expect(gov.class).toBe('governance');
    expect(tel.schema).toBe('vpc.group-event/1');
    expect(tel.class).toBe('telemetry');
  });

  it('schema/class metadata does not change the content hash (additive enrichment)', () => {
    // Dedupe hashes commit to {type, groupId, body} only — enriching the
    // envelope with metadata must never invalidate existing content addresses.
    const a = new GroupEventBus([]).emit('group.created', { name: 'n', owner: 'o' }, 'g5');
    const b = new GroupEventBus([]).emit('group.created', { name: 'n', owner: 'o' }, 'g5');
    expect(a.eventHash).toBe(b.eventHash);
  });

  it('a bus with zero transports still produces the canonical event (truth is in-process)', () => {
    const bus = new GroupEventBus([]);
    const e = bus.emit('group.ballot.cast', { voter: 'did:vpc:b', option: 'x' }, 'g3');
    expect(e.eventHash).toMatch(/^[0-9a-f]{64}$/);
    expect(bus.stats.emitted).toBe(1);
  });
});

describe('MqttTelemetryAdapter boundary', () => {
  // A stub MqttClient — publish() recorded, never touching the network.
  function stubClient() {
    const published: Array<{ topic: string; payload: Buffer }> = [];
    return {
      published,
      client: {
        publish: (topic: string, payload: Buffer | string) => {
          published.push({ topic, payload: Buffer.from(payload) });
          return true;
        },
        close: () => { /* noop */ },
        getState: () => 'connected',
      } as any,
    };
  }

  it('accepts telemetry-family topics', async () => {
    const { client, published } = stubClient();
    const adapter = new MqttTelemetryAdapter(client);
    const r = await adapter.publish('vpc/matrix/spectrum', Buffer.from('{}'));
    expect(r.accepted).toBe(true);
    expect(published.length).toBe(1);
  });

  it('refuses non-telemetry topics at the adapter boundary (defense in depth)', async () => {
    const { client, published } = stubClient();
    const adapter = new MqttTelemetryAdapter(client);
    const r = await adapter.publish('vpc/groups/g1/ballot.cast', Buffer.from('{}'));
    expect(r.accepted).toBe(false);
    expect(published.length).toBe(0);
  });

  it('is publish-only: subscribe() surfaces the limitation honestly', async () => {
    const { client } = stubClient();
    const adapter = new MqttTelemetryAdapter(client);
    await expect(adapter.subscribe()).rejects.toThrow(/publish-only/);
  });
});
