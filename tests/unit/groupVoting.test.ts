/**
 * Group Voting — unit tests
 *
 * Covers: group lifecycle, the open/closed membership gates (DID-signed
 * join), proposal creation, the membership voting gate, server-derived
 * weights (identity + stake), double-vote rejection, Merkle-certified
 * close, MQTT/Kafka event fan-out (via a mock broker), fact-matrix vote
 * ingest, and the REST surface.
 */

process.env.KAFKA_DISABLED = '1';   // Kafka leg noops; MQTT leg gets a mock broker

import express from 'express';
import * as http from 'http';
import * as net from 'net';
import {
  GroupVotingService, registerGroupVotingRoutes, joinPayload, groupBallotPayload,
} from '../../src/integrations/lightrag/group-voting';
import { GroupEventBus, KAFKA_GROUP_EVENTS_TOPIC } from '../../src/integrations/lightrag/group-events';
import { FactMatrixService } from '../../src/integrations/lightrag/fact-matrix';
import { MqttClient } from '../../src/integrations/mqtt/mqtt-client';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { ValueChainService } from '../../src/integrations/lightrag/value-chain';

const offlineRag = { isConnected: () => false } as any;

function makeStack(opts: { mqtt?: MqttClient | null; withChain?: boolean } = {}) {
  const identity = new SovereignIdentityService(offlineRag);
  const chain = opts.withChain ? new ValueChainService(offlineRag, { identity }) : undefined;
  const bus = new GroupEventBus(opts.mqtt ?? null);
  const matrix = new FactMatrixService(bus);
  const groups = new GroupVotingService(identity, { valueChain: chain, events: bus, matrix });
  return { identity, chain, bus, matrix, groups };
}

describe('group lifecycle', () => {
  it('creates a group; owner is automatically a member', () => {
    const { identity, groups } = makeStack();
    const owner = identity.register('owner');
    const g = groups.createGroup({ name: 'DAO Kern', owner: owner.did });
    expect(g.access).toBe('open');
    expect(groups.isMember(g.id, owner.did)).toBe(true);
    expect(groups.getMembers(g.id)).toEqual([owner.did]);
  });

  it('rejects unregistered owner, empty and oversized names', () => {
    const { identity, groups } = makeStack();
    const owner = identity.register();
    expect(() => groups.createGroup({ name: 'x', owner: 'did:vpc:ghost' })).toThrow(/registered/);
    expect(() => groups.createGroup({ name: '', owner: owner.did })).toThrow(/name/);
    expect(() => groups.createGroup({ name: 'y'.repeat(200), owner: owner.did })).toThrow(/exceeds/);
  });

  it('open group: DID-signed self-join; bad signature rejected', () => {
    const { identity, groups } = makeStack();
    const owner = identity.register('o');
    const joiner = identity.register('j');
    const g = groups.createGroup({ name: 'open-club', owner: owner.did });

    const { signature, publicKeyPem } = identity.signAs(joiner.did, joinPayload(g.id, joiner.did));
    const result = groups.join(g.id, joiner.did, publicKeyPem, signature);
    expect(result).toEqual({ joined: true, alreadyMember: false });
    expect(groups.isMember(g.id, joiner.did)).toBe(true);

    // Tampered signature
    const third = identity.register('k');
    expect(() => groups.join(g.id, third.did, identity.resolve(third.did)!.publicKeyPem, 'AAAA'))
      .toThrow(/invalid join signature/);
  });

  it('join signature is group-bound (signature for group A fails on group B)', () => {
    const { identity, groups } = makeStack();
    const owner = identity.register('o');
    const joiner = identity.register('j');
    const a = groups.createGroup({ name: 'A', owner: owner.did });
    const b = groups.createGroup({ name: 'B', owner: owner.did });
    const { signature, publicKeyPem } = identity.signAs(joiner.did, joinPayload(a.id, joiner.did));
    expect(() => groups.join(b.id, joiner.did, publicKeyPem, signature)).toThrow(/invalid join signature/);
  });

  it('closed group: self-join blocked, owner adds members', () => {
    const { identity, groups } = makeStack();
    const owner = identity.register('o');
    const member = identity.register('m');
    const g = groups.createGroup({ name: 'closed-club', access: 'closed', owner: owner.did });

    const { signature, publicKeyPem } = identity.signAs(member.did, joinPayload(g.id, member.did));
    expect(() => groups.join(g.id, member.did, publicKeyPem, signature)).toThrow(/closed group/);

    expect(groups.addMember(g.id, owner.did, member.did)).toEqual({ added: true, alreadyMember: false });
    expect(groups.isMember(g.id, member.did)).toBe(true);
    // Non-owner cannot add
    expect(() => groups.addMember(g.id, member.did, owner.did)).toThrow(/only the owner/);
  });

  it('leave removes membership; owner cannot leave', () => {
    const { identity, groups } = makeStack();
    const owner = identity.register('o');
    const member = identity.register('m');
    const g = groups.createGroup({ name: 'g', owner: owner.did });
    groups.addMember(g.id, owner.did, member.did);

    expect(groups.leave(g.id, member.did)).toEqual({ left: true });
    expect(groups.isMember(g.id, member.did)).toBe(false);
    expect(() => groups.leave(g.id, owner.did)).toThrow(/owner cannot leave/);
    expect(() => groups.leave(g.id, member.did)).toThrow(/not a member/);
  });
});

describe('group proposals + voting', () => {
  function setup() {
    const stack = makeStack();
    const owner = stack.identity.register('owner');
    const alice = stack.identity.register('alice');
    const bob = stack.identity.register('bob');
    const g = stack.groups.createGroup({ name: 'voters', owner: owner.did });
    stack.groups.addMember(g.id, owner.did, alice.did);
    stack.groups.addMember(g.id, owner.did, bob.did);
    return { ...stack, owner, alice, bob, g };
  }

  it('only members may create proposals', () => {
    const { identity, groups, g } = setup();
    const outsider = identity.register('outsider');
    expect(() => groups.createProposal(g.id, {
      question: 'q?', options: ['a', 'b'], createdBy: outsider.did,
    })).toThrow(/only members/);
  });

  it('member votes count; outsiders are rejected by the membership gate', () => {
    const { identity, groups, alice, g } = setup();
    const p = groups.createProposal(g.id, { question: 'kleur?', options: ['rood', 'blauw'], createdBy: alice.did });

    const ballot = groups.castVote(p.id, alice.did, 'rood');
    expect(ballot.weight).toBe(1);

    const outsider = identity.register('outsider2');
    const payload = groupBallotPayload({ proposalId: p.id, groupId: g.id, voter: outsider.did, option: 'rood' });
    const { signature, publicKeyPem } = identity.signAs(outsider.did, payload);
    const result = groups.submitBallot({
      proposalId: p.id, groupId: g.id, voter: outsider.did, option: 'rood',
      weight: 999, ts: new Date().toISOString(), publicKeyPem, signature,
    });
    expect(result).toEqual({ accepted: false, reason: 'voter is not a group member' });
  });

  it('one ballot per member; submitted weights are ignored', () => {
    const { identity, groups, alice, g } = setup();
    const p = groups.createProposal(g.id, { question: 'q?', options: ['a', 'b'], createdBy: alice.did });
    groups.castVote(p.id, alice.did, 'a');
    expect(() => groups.castVote(p.id, alice.did, 'b')).toThrow(/already voted/);

    // Forged weight on a signed ballot is overwritten server-side
    const { groups: g2, identity: id2 } = makeStack();
    const o = id2.register('o'); const v = id2.register('v');
    const grp = g2.createGroup({ name: 'w', owner: o.did });
    g2.addMember(grp.id, o.did, v.did);
    const prop = g2.createProposal(grp.id, { question: 'q?', options: ['a', 'b'], createdBy: o.did });
    const payload = groupBallotPayload({ proposalId: prop.id, groupId: grp.id, voter: v.did, option: 'a' });
    const { signature, publicKeyPem } = id2.signAs(v.did, payload);
    const res = g2.submitBallot({
      proposalId: prop.id, groupId: grp.id, voter: v.did, option: 'a',
      weight: 1_000_000, ts: new Date().toISOString(), publicKeyPem, signature,
    });
    expect(res.accepted).toBe(true);
    expect(g2.getBallots(prop.id)[0].weight).toBe(1);
  });

  it('stake mode derives weight from the value chain', () => {
    const stack = makeStack({ withChain: true });
    const owner = stack.identity.register('rich');
    const poor = stack.identity.register('poor');
    stack.chain!.mintReward(owner.did, 25);
    const g = stack.groups.createGroup({ name: 'stake-group', owner: owner.did });
    stack.groups.addMember(g.id, owner.did, poor.did);
    const p = stack.groups.createProposal(g.id, {
      question: 'q?', options: ['a', 'b'], createdBy: owner.did, mode: 'stake',
    });

    const ballot = stack.groups.castVote(p.id, owner.did, 'a');
    expect(ballot.weight).toBe(25);
    expect(() => stack.groups.castVote(p.id, poor.did, 'b')).toThrow(/zero balance/);
  });

  it('tally + certified close with Merkle ballot root; idempotent close', () => {
    const { groups, owner, alice, bob, g } = setup();
    const p = groups.createProposal(g.id, { question: 'winner?', options: ['x', 'y'], createdBy: owner.did });
    groups.castVote(p.id, owner.did, 'x');
    groups.castVote(p.id, alice.did, 'x');
    groups.castVote(p.id, bob.did, 'y');

    const tally = groups.tally(p.id);
    expect(tally.totals).toEqual({ x: 2, y: 1 });
    expect(tally.winner).toBe('x');
    expect(tally.turnoutMembers).toBe(3);
    expect(tally.eligibleMembers).toBe(3);

    const cert = groups.close(p.id);
    expect(cert.certHash).toMatch(/^[0-9a-f]{64}$/);
    expect(cert.ballotRoot).toMatch(/^[0-9a-f]{64}$/);
    expect(groups.close(p.id)).toBe(cert);                       // idempotent
    expect(() => groups.castVote(p.id, alice.did, 'y')).toThrow(); // closed
  });

  it('accepted ballots are mirrored into the fact matrix vote region', () => {
    const { groups, matrix, alice, g } = setup();
    const p = groups.createProposal(g.id, { question: 'q?', options: ['a', 'b'], createdBy: alice.did });
    groups.castVote(p.id, alice.did, 'a');
    const row = matrix.getRowByRef('vote', `${p.id}:${alice.did}`);
    expect(row).toBeDefined();
    expect(row!.kind).toBe('vote');
  });

  it('event bus sees the full lifecycle', () => {
    const { groups, bus, identity } = makeStack();
    const before = bus.stats.emitted;
    const o = identity.register('eo');
    const g = groups.createGroup({ name: 'events', owner: o.did });              // group.created
    const p = groups.createProposal(g.id, { question: 'q?', options: ['a', 'b'], createdBy: o.did }); // proposal.created
    groups.castVote(p.id, o.did, 'a');   // ballot.cast + matrix.fact.ingested
    groups.close(p.id);                  // proposal.closed
    expect(bus.stats.emitted - before).toBe(5);
    expect(bus.stats.kafkaAttempts - before).toBe(5);
    expect(KAFKA_GROUP_EVENTS_TOPIC).toBe('group.events');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MQTT fan-out (mock broker)
// ─────────────────────────────────────────────────────────────────────────────

describe('group events → MQTT', () => {
  it('a cast ballot is published to vpc/groups/<id>/ballot.cast', async () => {
    // Minimal broker: CONNACK + PUBLISH capture (same shape as mqttClient.test.ts)
    const received: Array<{ topic: string; payload: string }> = [];
    const broker = net.createServer(socket => {
      let buf = Buffer.alloc(0);
      socket.on('data', chunk => {
        buf = Buffer.concat([buf, chunk]);
        for (;;) {
          if (buf.length < 2) return;
          const type = buf[0] & 0xf0;
          let m = 1, v = 0, i = 0, ok = true;
          for (;;) {
            if (1 + i >= buf.length) { ok = false; break; }
            const d = buf[1 + i]; v += (d & 0x7f) * m; i++;
            if ((d & 0x80) === 0) break;
            m *= 128;
          }
          if (!ok) return;
          const total = 1 + i + v;
          if (buf.length < total) return;
          const packet = buf.subarray(0, total);
          buf = buf.subarray(total);
          if (type === 0x10) socket.write(Buffer.from([0x20, 2, 0, 0]));
          else if (type === 0x30) {
            const body = packet.subarray(1 + i);
            const tl = body.readUInt16BE(0);
            received.push({ topic: body.subarray(2, 2 + tl).toString(), payload: body.subarray(2 + tl).toString() });
          }
        }
      });
    });
    const port: number = await new Promise(res => broker.listen(0, '127.0.0.1', () => res((broker.address() as net.AddressInfo).port)));

    const mqtt = new MqttClient({ host: '127.0.0.1', port, clientId: 'group-test' });
    mqtt.connect();
    const deadline = Date.now() + 3_000;
    while (mqtt.getState() !== 'connected') {
      if (Date.now() > deadline) throw new Error('mqtt connect timeout');
      await new Promise(r => setTimeout(r, 10));
    }

    const { groups, identity } = makeStack({ mqtt });
    const o = identity.register('mq-owner');
    const g = groups.createGroup({ name: 'mqtt-grp', owner: o.did });
    const p = groups.createProposal(g.id, { question: 'q?', options: ['a', 'b'], createdBy: o.did });
    groups.castVote(p.id, o.did, 'a');

    const d2 = Date.now() + 3_000;
    while (!received.some(r => r.topic.endsWith('/ballot.cast'))) {
      if (Date.now() > d2) throw new Error('publish timeout');
      await new Promise(r => setTimeout(r, 10));
    }

    const ballotEvent = received.find(r => r.topic.endsWith('/ballot.cast'))!;
    expect(ballotEvent.topic).toBe(`vpc/groups/${g.id}/ballot.cast`);
    const parsed = JSON.parse(ballotEvent.payload);
    expect(parsed.type).toBe('group.ballot.cast');
    expect(parsed.eventHash).toMatch(/^[0-9a-f]{64}$/);
    expect(parsed.body.voter).toBe(o.did);
    // Lifecycle topics all present
    expect(received.some(r => r.topic === `vpc/groups/${g.id}/created`)).toBe(true);
    expect(received.some(r => r.topic === `vpc/groups/${g.id}/proposal.created`)).toBe(true);
    // Matrix ingest goes to the matrix topic family
    expect(received.some(r => r.topic === 'vpc/matrix/vote')).toBe(true);

    mqtt.close();
    await new Promise<void>(res => broker.close(() => res()));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REST
// ─────────────────────────────────────────────────────────────────────────────

describe('Group voting HTTP API', () => {
  let server: http.Server;
  let base: string;
  let identity: SovereignIdentityService;

  beforeAll(done => {
    const stack = makeStack();
    identity = stack.identity;
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    registerGroupVotingRoutes(app, stack.groups, stack.bus);
    server = http.createServer(app);
    server.listen(0, () => {
      base = `http://127.0.0.1:${(server.address() as any).port}`;
      done();
    });
  });
  afterAll(done => { server.close(() => done()); });

  function call(method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const reqBody = body ? JSON.stringify(body) : '';
      const req = http.request(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
      }, res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => resolve({ status: res.statusCode!, body: data ? JSON.parse(data) : {} }));
      });
      req.on('error', reject);
      if (reqBody) req.write(reqBody);
      req.end();
    });
  }

  it('full journey: create → join → proposal → vote → tally → close', async () => {
    const owner = identity.register('http-owner');
    const member = identity.register('http-member');

    const created = await call('POST', '/api/groups', { name: 'http-group', owner: owner.did });
    expect(created.status).toBe(201);
    const gid = created.body.group.id;

    const { signature, publicKeyPem } = identity.signAs(member.did, joinPayload(gid, member.did));
    const joined = await call('POST', `/api/groups/${gid}/join`, { did: member.did, publicKeyPem, signature });
    expect(joined.status).toBe(201);

    const prop = await call('POST', `/api/groups/${gid}/proposals`, {
      question: 'pizza of friet?', options: ['pizza', 'friet'], createdBy: owner.did,
    });
    expect(prop.status).toBe(201);
    const pid = prop.body.proposal.id;

    expect((await call('POST', `/api/groups/${gid}/proposals/${pid}/vote`, { voter: owner.did, option: 'pizza' })).status).toBe(201);
    expect((await call('POST', `/api/groups/${gid}/proposals/${pid}/vote`, { voter: member.did, option: 'pizza' })).status).toBe(201);

    const detail = await call('GET', `/api/groups/${gid}/proposals/${pid}`);
    expect(detail.body.tally.totals.pizza).toBe(2);
    expect(detail.body.tally.winner).toBe('pizza');

    const closed = await call('POST', `/api/groups/${gid}/proposals/${pid}/close`);
    expect(closed.status).toBe(200);
    expect(closed.body.certificate.certHash).toMatch(/^[0-9a-f]{64}$/);

    const groupView = await call('GET', `/api/groups/${gid}`);
    expect(groupView.body.members).toHaveLength(2);
    expect(groupView.body.proposals).toHaveLength(1);
  });

  it('GET /api/groups exposes event-bus stats', async () => {
    const res = await call('GET', '/api/groups');
    expect(res.status).toBe(200);
    expect(res.body.events.emitted).toBeGreaterThan(0);
  });

  it('validation: missing fields → 422; unknown group → 404; double vote → 409', async () => {
    expect((await call('POST', '/api/groups', { name: 'x' })).status).toBe(422);
    expect((await call('GET', '/api/groups/grp_nope')).status).toBe(404);
    expect((await call('POST', '/api/groups/grp_nope/join', { did: 'd', publicKeyPem: 'p', signature: 's' })).status).toBe(404);

    const owner = identity.register('dv-owner');
    const created = await call('POST', '/api/groups', { name: 'dv', owner: owner.did });
    const gid = created.body.group.id;
    const prop = await call('POST', `/api/groups/${gid}/proposals`, {
      question: 'q?', options: ['a', 'b'], createdBy: owner.did,
    });
    const pid = prop.body.proposal.id;
    await call('POST', `/api/groups/${gid}/proposals/${pid}/vote`, { voter: owner.did, option: 'a' });
    const dup = await call('POST', `/api/groups/${gid}/proposals/${pid}/vote`, { voter: owner.did, option: 'b' });
    expect(dup.status).toBe(409);
  });
});
