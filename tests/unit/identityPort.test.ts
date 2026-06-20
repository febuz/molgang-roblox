/**
 * Identity port — replaceability contract
 *
 * Consumers take the narrowest identity port (docs/MODULAR-ARCHITECTURE.md):
 * resolver-only consumers (elections, feeds, chain-store, wallet-vault) must
 * work against an implementation that holds NO private keys; custody
 * consumers get the full port. A hostile resolver can serve stale documents
 * but cannot forge signatures that verify — verification is cryptography,
 * not port trust.
 */

process.env.KAFKA_DISABLED = '1';

import {
  SovereignIdentityService, verifyIdentityDocument, type IdentityDocument,
} from '../../src/integrations/lightrag/identity';
import type {
  IdentityPort, IdentityResolverPort,
} from '../../src/integrations/lightrag/identity-port';
import { DemocraticElectionService } from '../../src/integrations/lightrag/sovereign-elections';
import { ChainStore } from '../../src/integrations/lightrag/chain-store';
import { MemorySnapshotStorage } from '../../src/integrations/lightrag/storage-port';
import { ValueChainService } from '../../src/integrations/lightrag/value-chain';

const offlineRag = { isConnected: () => false } as any;

/**
 * A resolver WITHOUT key custody: it can only mirror documents received from
 * elsewhere — the shape of an external DID registry / read-only mirror.
 */
class MirrorResolver implements IdentityResolverPort {
  private docs = new Map<string, IdentityDocument>();
  private handles = new Map<string, string>();

  resolve(did: string): IdentityDocument | undefined { return this.docs.get(did); }
  resolveHandle(handle: string): IdentityDocument | undefined {
    const did = this.handles.get(handle);
    return did ? this.docs.get(did) : undefined;
  }
  didForHandle(handle: string): string | null { return this.handles.get(handle) ?? null; }
  list(): IdentityDocument[] { return [...this.docs.values()]; }
  receive(doc: IdentityDocument): { accepted: boolean; reason?: string } {
    const check = verifyIdentityDocument(doc);
    if (!check.valid) return { accepted: false, reason: check.reason };
    this.docs.set(doc.did, { ...doc, rotations: doc.rotations.map(r => ({ ...r })) });
    if (doc.handle) this.handles.set(doc.handle, doc.did);
    return { accepted: true };
  }
}

describe('SovereignIdentityService satisfies the full port', () => {
  it('is assignable to IdentityPort (compile-time contract, runtime smoke)', () => {
    const svc: IdentityPort = new SovereignIdentityService(offlineRag);
    const doc = svc.register('porty');
    expect(svc.resolve(doc.did)?.did).toBe(doc.did);
    expect(svc.didForHandle('porty')).toBe(doc.did);
    const { signature } = svc.signAs(doc.did, 'msg');
    expect(svc.verifyAs(doc.did, 'msg', signature)).toBe(true);
  });
});

describe('resolver-only consumers work without key custody', () => {
  it('elections accept a keyless mirror resolver', () => {
    // Documents originate from a custodian node, mirror only resolves.
    const custodian = new SovereignIdentityService(offlineRag);
    const mirror = new MirrorResolver();
    const voter = custodian.register('voter1');
    expect(mirror.receive(custodian.resolve(voter.did)!).accepted).toBe(true);

    const elections = new DemocraticElectionService(mirror);
    const e = elections.createElection({
      country: 'NL', electionType: 'parliamentary', votingSystem: 'proportional',
      ballotFormat: 'party',
      constituencies: [{ id: 'nl', name: 'Netherlands', seats: 150 }],
      candidates: [{ id: 'a', name: 'A', party: 'P1', constituencyId: 'nl' }],
    });
    elections.openElection(e.id);
    const r = elections.registerVoter(e.id, voter.did);
    expect(r.registered).toBe(true);
    // An unknown DID is still rejected — the mirror resolves, crypto gates.
    expect(() => elections.registerVoter(e.id, 'did:vpc:ghost')).toThrow(/not found/);
  });

  it('chain-store persists and restores identities through a mirror resolver', () => {
    const custodian = new SovereignIdentityService(offlineRag);
    const chain = new ValueChainService(offlineRag, { identity: custodian });
    const alice = custodian.register('alice');
    chain.mintReward(alice.did, 5);

    const storage = new MemorySnapshotStorage();
    new ChainStore(storage, chain, custodian).saveNow();

    // Fresh node restores into a keyless mirror — no custody required to boot.
    const mirror = new MirrorResolver();
    const identity2 = new SovereignIdentityService(offlineRag);
    const chain2 = new ValueChainService(offlineRag, { identity: identity2 });
    const loaded = new ChainStore(storage, chain2, mirror).load();
    expect(loaded).not.toBeNull();
    expect(loaded!.identities).toBe(1);
    expect(mirror.resolve(alice.did)?.handle).toBe('alice');
  });

  it('a hostile resolver cannot forge documents past verification', () => {
    const mirror = new MirrorResolver();
    const forged: IdentityDocument = {
      did: 'did:vpc:forged', genesisKeyPem: '-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----\n',
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----\n',
      handle: 'fake', createdAt: new Date().toISOString(), rotations: [],
    };
    expect(mirror.receive(forged).accepted).toBe(false);
  });
});
