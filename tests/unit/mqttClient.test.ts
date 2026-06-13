/**
 * Minimal MQTT 3.1.1 client — unit tests
 *
 * Packet encoding is asserted byte-for-byte against the OASIS spec, and the
 * client is exercised end-to-end against an in-process mock broker (a TCP
 * server that speaks just enough MQTT: CONNACK + packet parsing).
 */

import * as net from 'net';
import {
  MqttClient, mqttClientFromEnv,
  encodeMqttString, encodeRemainingLength, decodeRemainingLength,
  buildConnectPacket, buildPublishPacket, buildPingreqPacket, buildDisconnectPacket,
  MQTT_PROTOCOL_LEVEL, MAX_PAYLOAD_BYTES,
} from '../../src/integrations/mqtt/mqtt-client';

describe('MQTT packet encoding', () => {
  it('encodes strings with a 2-byte big-endian length prefix', () => {
    const b = encodeMqttString('MQTT');
    expect([...b]).toEqual([0, 4, 0x4d, 0x51, 0x54, 0x54]);
  });

  it('encodes remaining length per the spec examples (§2.2.3)', () => {
    expect([...encodeRemainingLength(0)]).toEqual([0]);
    expect([...encodeRemainingLength(127)]).toEqual([127]);
    expect([...encodeRemainingLength(128)]).toEqual([0x80, 0x01]);
    expect([...encodeRemainingLength(16_383)]).toEqual([0xff, 0x7f]);
    expect([...encodeRemainingLength(16_384)]).toEqual([0x80, 0x80, 0x01]);
    expect([...encodeRemainingLength(268_435_455)]).toEqual([0xff, 0xff, 0xff, 0x7f]);
  });

  it('rejects out-of-range remaining lengths', () => {
    expect(() => encodeRemainingLength(-1)).toThrow();
    expect(() => encodeRemainingLength(268_435_456)).toThrow();
  });

  it('decodes remaining length round-trip', () => {
    for (const n of [0, 1, 127, 128, 16_383, 16_384, 2_097_151, 268_435_455]) {
      const enc = encodeRemainingLength(n);
      const buf = Buffer.concat([Buffer.from([0x30]), enc]);
      const dec = decodeRemainingLength(buf, 1);
      expect(dec).toEqual({ value: n, bytes: enc.length });
    }
  });

  it('decode returns null on incomplete buffer', () => {
    // 0x80 says "continuation byte follows" but the buffer ends
    expect(decodeRemainingLength(Buffer.from([0x30, 0x80]), 1)).toBeNull();
  });

  it('CONNECT packet carries protocol name, level 4, clean session, clientId', () => {
    const p = buildConnectPacket({ clientId: 'test-client', keepaliveS: 30 });
    expect(p[0]).toBe(0x10);                              // CONNECT
    // Variable header starts after fixed header (1 type + 1 len byte here)
    expect(p.subarray(2, 8).toString('latin1')).toBe('\x00\x04MQTT');
    expect(p[8]).toBe(MQTT_PROTOCOL_LEVEL);               // protocol level 4
    expect(p[9] & 0x02).toBe(0x02);                       // clean session flag
    expect(p.readUInt16BE(10)).toBe(30);                  // keepalive
    expect(p.subarray(12).toString('utf8')).toContain('test-client');
  });

  it('CONNECT with username/password sets the flags', () => {
    const p = buildConnectPacket({ clientId: 'c', username: 'u', password: 'pw' });
    expect(p[9] & 0x80).toBe(0x80);
    expect(p[9] & 0x40).toBe(0x40);
  });

  it('PUBLISH QoS 0 packet carries topic + payload, no packet id', () => {
    const p = buildPublishPacket('vpc/test', 'hello');
    expect(p[0] & 0xf0).toBe(0x30);                       // PUBLISH
    expect(p[0] & 0x06).toBe(0);                          // QoS 0
    const topicLen = p.readUInt16BE(2);
    expect(topicLen).toBe(8);
    expect(p.subarray(4, 12).toString('utf8')).toBe('vpc/test');
    expect(p.subarray(12).toString('utf8')).toBe('hello'); // payload directly after topic
  });

  it('PUBLISH rejects wildcard topics and oversized payloads', () => {
    expect(() => buildPublishPacket('vpc/#', 'x')).toThrow();
    expect(() => buildPublishPacket('vpc/+/x', 'x')).toThrow();
    expect(() => buildPublishPacket('', 'x')).toThrow();
    expect(() => buildPublishPacket('t', Buffer.alloc(MAX_PAYLOAD_BYTES + 1))).toThrow();
  });

  it('PINGREQ and DISCONNECT are 2-byte packets', () => {
    expect([...buildPingreqPacket()]).toEqual([0xc0, 0]);
    expect([...buildDisconnectPacket()]).toEqual([0xe0, 0]);
  });
});

describe('mqttClientFromEnv', () => {
  const saved = process.env.MQTT_BROKER_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.MQTT_BROKER_URL;
    else process.env.MQTT_BROKER_URL = saved;
  });

  it('returns null when MQTT_BROKER_URL is unset (opt-in)', () => {
    delete process.env.MQTT_BROKER_URL;
    expect(mqttClientFromEnv('c1')).toBeNull();
  });

  it('parses mqtt://host:port', () => {
    process.env.MQTT_BROKER_URL = 'mqtt://broker.example:2883';
    const c = mqttClientFromEnv('c1');
    expect(c).not.toBeNull();
    c?.close();
  });

  it('returns null for unsupported protocols', () => {
    process.env.MQTT_BROKER_URL = 'http://broker.example';
    expect(mqttClientFromEnv('c1')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end against a mock broker
// ─────────────────────────────────────────────────────────────────────────────

interface ReceivedPublish { topic: string; payload: string }

/** Just enough broker: CONNACK on CONNECT, parse PUBLISH, PINGRESP on PINGREQ. */
function startMockBroker(): Promise<{
  port: number;
  server: net.Server;
  received: ReceivedPublish[];
  connects: number[];
}> {
  const received: ReceivedPublish[] = [];
  const connects: number[] = [];
  const server = net.createServer(socket => {
    let buf = Buffer.alloc(0);
    socket.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (buf.length < 2) return;
        const type = buf[0] & 0xf0;
        const dec = ((): { value: number; bytes: number } | null => {
          let m = 1, v = 0, i = 0;
          for (;;) {
            if (1 + i >= buf.length) return null;
            const d = buf[1 + i];
            v += (d & 0x7f) * m; i++;
            if ((d & 0x80) === 0) break;
            m *= 128;
          }
          return { value: v, bytes: i };
        })();
        if (!dec) return;
        const total = 1 + dec.bytes + dec.value;
        if (buf.length < total) return;
        const packet = buf.subarray(0, total);
        buf = buf.subarray(total);

        if (type === 0x10) {            // CONNECT → CONNACK accepted
          connects.push(Date.now());
          socket.write(Buffer.from([0x20, 2, 0, 0]));
        } else if (type === 0x30) {     // PUBLISH (QoS 0)
          const body = packet.subarray(1 + dec.bytes);
          const topicLen = body.readUInt16BE(0);
          received.push({
            topic: body.subarray(2, 2 + topicLen).toString('utf8'),
            payload: body.subarray(2 + topicLen).toString('utf8'),
          });
        } else if (type === 0xc0) {     // PINGREQ → PINGRESP
          socket.write(Buffer.from([0xd0, 0]));
        }
      }
    });
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ port: (server.address() as net.AddressInfo).port, server, received, connects });
    });
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 3_000, pollMs = 10): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor: timed out');
    await new Promise(r => setTimeout(r, pollMs));
  }
}

describe('MqttClient against a mock broker', () => {
  let broker: Awaited<ReturnType<typeof startMockBroker>>;
  let client: MqttClient;

  beforeEach(async () => {
    broker = await startMockBroker();
  });
  afterEach(done => {
    client?.close();
    broker.server.close(() => done());
  });

  it('connects (CONNACK) and publishes a message the broker receives intact', async () => {
    client = new MqttClient({ host: '127.0.0.1', port: broker.port, clientId: 'jest-1' });
    client.connect();
    await waitFor(() => client.getState() === 'connected');

    expect(client.publish('vpc/groups/g1/ballot.cast', '{"voter":"did:vpc:abc"}')).toBe(true);
    await waitFor(() => broker.received.length === 1);
    expect(broker.received[0]).toEqual({
      topic: 'vpc/groups/g1/ballot.cast',
      payload: '{"voter":"did:vpc:abc"}',
    });
    expect(client.stats.published).toBe(1);
  });

  it('drops publishes while disconnected (QoS 0 semantics) and counts them', () => {
    client = new MqttClient({ host: '127.0.0.1', port: broker.port, clientId: 'jest-2' });
    // never connected
    expect(client.publish('vpc/x', 'y')).toBe(false);
    expect(client.stats.dropped).toBe(1);
  });

  it('multiple publishes arrive in order', async () => {
    client = new MqttClient({ host: '127.0.0.1', port: broker.port, clientId: 'jest-3' });
    client.connect();
    await waitFor(() => client.getState() === 'connected');
    for (let i = 0; i < 5; i++) client.publish('vpc/seq', `msg-${i}`);
    await waitFor(() => broker.received.length === 5);
    expect(broker.received.map(r => r.payload)).toEqual(['msg-0', 'msg-1', 'msg-2', 'msg-3', 'msg-4']);
  });

  it('reconnects after the broker drops the connection', async () => {
    client = new MqttClient({
      host: '127.0.0.1', port: broker.port, clientId: 'jest-4',
      reconnectMs: 50, maxReconnectMs: 100,
    });
    client.connect();
    await waitFor(() => client.getState() === 'connected');
    expect(broker.connects.length).toBe(1);

    // Drop every live connection server-side
    broker.server.getConnections(() => { /* count unused */ });
    // Force-close by closing all sockets: easiest is to restart listener-level —
    // instead emit destroy via a fresh connection killing trick: close the server
    // sockets via connection event tracking is complex; simulate by destroying
    // the client's socket through a publish to a closed state after server close.
    // Simpler: close + recreate the broker on the same port is racy, so instead
    // we assert reconnect logic by destroying the underlying socket directly.
    (client as any).socket.destroy();
    await waitFor(() => broker.connects.length >= 2, 5_000);
    await waitFor(() => client.getState() === 'connected');
    expect(client.stats.reconnects).toBeGreaterThanOrEqual(1);

    // Still functional after reconnect
    client.publish('vpc/after', 'reconnected');
    await waitFor(() => broker.received.some(r => r.payload === 'reconnected'));
  });

  it('close() sends DISCONNECT and stops reconnecting', async () => {
    client = new MqttClient({ host: '127.0.0.1', port: broker.port, clientId: 'jest-5', reconnectMs: 20 });
    client.connect();
    await waitFor(() => client.getState() === 'connected');
    client.close();
    expect(client.getState()).toBe('closed');
    const reconnectsAtClose = client.stats.reconnects;
    await new Promise(r => setTimeout(r, 100));
    expect(broker.connects.length).toBe(1);              // no new connection attempts
    expect(client.stats.reconnects).toBe(reconnectsAtClose);
  });
});
