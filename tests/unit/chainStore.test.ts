/**
 * MVP durability + state-proof tests
 *
 * Covers the three MVP gaps:
 *  1. SMT state proofs integrated in the value chain (stateRoot per block,
 *     proveAccount verifiable by a stateless light client)
 *  2. export/restore round-trip — the ledger survives a restart, with
 *     cryptographic re-verification on replay
 *  3. ChainStore — atomic disk snapshots, load-before-hooks contract,
 *     corrupted snapshots refused
 *  4. ConsensusNetwork driver — auto-propose tick carries a single-node
 *     round to finality
 */

import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  ValueChainService,
  accountLeafValue,
  tokensToUnits,
} from '../../src/integrations/lightrag/value-chain';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { verifySMTProof, smtKey } from '../../src/integrations/lightrag/sparse-merkle';
import { ChainStore, SNAPSHOT_VERSION } from '../../src/integrations/lightrag/chain-store';
import { MemorySnapshotStorage, FileSnapshotStorage } from '../../src/integrations/lightrag/storage-port';
import { ConsensusEngine } from '../../src/integrations/lightrag/consensus';
import { ConsensusNetwork } from '../../src/integrations/lightrag/consensus-network';
import { sha256 } from '../../src/integrations/lightrag/graph-state-root';
import { generateKeyPairSync } from 'crypto';

const offlineRag = { isConnected: () => false } as any;

function makeStack() {
  const identity = new SovereignIdentityService(offlineRag);
  const chain = new ValueChainService(offlineRag, { identity });
  return { identity, chain };
}

// ─── 1. SMT state proofs in the value chain ───────────────────────────────────

describe('ValueChain – SMT state proofs', () => {
  it('state root changes when balances change', () => {
    const { identity, chain } = makeStack();
    const alice = identity.register('alice');
    const r0 = chain.getStateRoot();
    chain.mintReward(alice.did, 10);
    expect(chain.getStateRoot()).not.toBe(r0);
  });

  it('proveAccount verifies against the state root (light client)', () => {
    const { identity, chain } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 10);

    const { account, proof, stateRoot } = chain.proveAccount(alice.did);
    // Stateless verification — no chain access needed
    expect(verifySMTProof(proof, stateRoot)).toBe(true);
    // The leaf commits to the exact (balance, nonce) pair
    expect(proof.valueHash).toBe(
      require('crypto').createHash('sha256').update(accountLeafValue(account)).digest('hex')
    );
  });

  it('a claimed wrong balance fails proof verification', () => {
    const { identity, chain } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 10);
    const { proof, stateRoot } = chain.proveAccount(alice.did);

    // Adversary claims a different balance → different leaf value hash
    const forgedLeaf = accountLeafValue({ balance: tokensToUnits(999), nonce: 0 });
    const forgedHash = require('crypto').createHash('sha256').update(forgedLeaf).digest('hex');
    expect(verifySMTProof({ ...proof, valueHash: forgedHash }, stateRoot)).toBe(false);
  });

  it('untouched accounts get a non-inclusion proof', () => {
    const { chain } = makeStack();
    const { proof, stateRoot } = chain.proveAccount('did:vpc:never-seen');
    expect(proof.included).toBe(false);
    expect(verifySMTProof(proof, stateRoot)).toBe(true);
  });

  it('sealed blocks commit to the state root', () => {
    const { identity, chain } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 10);
    const rootAtSeal = chain.getStateRoot();
    const block = chain.sealBlock()!;
    expect(block.stateRoot).toBe(rootAtSeal);

    // The account proof verifies against the BLOCK's stateRoot — this is the
    // anchorable commitment a light client checks against
    const { proof } = chain.proveAccount(alice.did);
    expect(verifySMTProof(proof, block.stateRoot)).toBe(true);
  });
});

// ─── 2. export / restore ──────────────────────────────────────────────────────

describe('ValueChain – export/restore round-trip', () => {
  function populatedStack() {
    const { identity, chain } = makeStack();
    const alice = identity.register('alice');
    const bob = identity.register('bob');
    chain.mintReward(alice.did, 100);
    chain.transfer(alice.did, bob.did, tokensToUnits(25));
    chain.sealBlock();
    chain.mintReward(bob.did, 5);
    return { identity, chain, alice, bob };
  }

  it('restore reproduces balances, supply, blocks and conservation', () => {
    const { identity, chain, alice, bob } = populatedStack();
    const exported = chain.exportState();

    const chain2 = new ValueChainService(offlineRag, { identity });
    chain2.restoreState(JSON.parse(JSON.stringify(exported)));

    expect(chain2.getAccount(alice.did).balance).toBe(chain.getAccount(alice.did).balance);
    expect(chain2.getAccount(bob.did).balance).toBe(chain.getAccount(bob.did).balance);
    expect(chain2.getAccount(alice.did).nonce).toBe(chain.getAccount(alice.did).nonce);
    expect(chain2.getSupply().mintedUnits).toBe(chain.getSupply().mintedUnits);
    expect(chain2.getBlocks(10)).toEqual(chain.getBlocks(10));
    expect(chain2.checkConservation().holds).toBe(true);
    expect(chain2.verifyChain().valid).toBe(true);
  });

  it('the ledger continues correctly after restore (nonces intact)', () => {
    const { identity, chain, alice, bob } = populatedStack();
    const chain2 = new ValueChainService(offlineRag, { identity });
    chain2.restoreState(chain.exportState());
    // alice's next transfer uses the restored nonce — must apply cleanly
    const tx = chain2.transfer(alice.did, bob.did, tokensToUnits(1));
    expect(tx.nonce).toBe(chain.getAccount(alice.did).nonce + 1);
    expect(chain2.checkConservation().holds).toBe(true);
  });

  it('a tampered transfer amount fails restore (signature recheck)', () => {
    const { identity, chain } = populatedStack();
    const exported = chain.exportState();
    const signed = exported.transfers.find(t => t.from !== 'did:vpc:coinbase')!;
    signed.amount = tokensToUnits(99).toString(); // tamper

    const chain2 = new ValueChainService(offlineRag, { identity });
    expect(() => chain2.restoreState(exported)).toThrow(/rejected/);
  });

  it('a tampered block hash fails restore (chain verification)', () => {
    const { identity, chain } = populatedStack();
    const exported = chain.exportState();
    exported.blocks[0].txRoot = sha256('forged');

    const chain2 = new ValueChainService(offlineRag, { identity });
    expect(() => chain2.restoreState(exported)).toThrow(/verification failed/);
  });

  it('restore into a non-empty ledger is refused', () => {
    const { identity, chain } = populatedStack();
    expect(() => chain.restoreState(chain.exportState())).toThrow(/empty/);
  });
});

// ─── 3. ChainStore disk persistence ───────────────────────────────────────────

describe('ChainStore – disk snapshots', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'chain-store-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('save → load round-trip restores ledger AND identities', () => {
    const { identity, chain } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 10);
    chain.sealBlock();

    const file = join(dir, 'snap.json');
    new ChainStore(file, chain, identity).saveNow();
    expect(existsSync(file)).toBe(true);

    // Fresh node boots from the snapshot
    const identity2 = new SovereignIdentityService(offlineRag);
    const chain2 = new ValueChainService(offlineRag, { identity: identity2 });
    const loaded = new ChainStore(file, chain2, identity2).load();

    expect(loaded).not.toBeNull();
    expect(loaded!.identities).toBe(1);
    expect(identity2.resolve(alice.did)).toBeDefined();
    expect(identity2.didForHandle('alice')).toBe(alice.did);
    expect(chain2.getAccount(alice.did).balance).toBe(chain.getAccount(alice.did).balance);
    expect(chain2.getBlocks(5)).toEqual(chain.getBlocks(5));
  });

  it('load returns null when no snapshot exists', () => {
    const { identity, chain } = makeStack();
    const store = new ChainStore(join(dir, 'missing.json'), chain, identity);
    expect(store.load()).toBeNull();
  });

  it('an unreadable snapshot is refused (fresh start), not crashed on', () => {
    const file = join(dir, 'corrupt.json');
    writeFileSync(file, '{not json', 'utf8');
    const { identity, chain } = makeStack();
    expect(new ChainStore(file, chain, identity).load()).toBeNull();
  });

  it('a snapshot with a tampered ledger throws on load (refuse to boot)', () => {
    const { identity, chain } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 10);
    chain.transfer(alice.did, identity.register('bob').did, tokensToUnits(2));
    const file = join(dir, 'snap.json');
    new ChainStore(file, chain, identity).saveNow();

    // Tamper a signed transfer on disk
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    const signed = raw.ledger.transfers.find((t: any) => t.from !== 'did:vpc:coinbase');
    signed.amount = tokensToUnits(9).toString();
    writeFileSync(file, JSON.stringify(raw), 'utf8');

    const identity2 = new SovereignIdentityService(offlineRag);
    const chain2 = new ValueChainService(offlineRag, { identity: identity2 });
    expect(() => new ChainStore(file, chain2, identity2).load()).toThrow(/rejected/);
  });

  it('snapshot version mismatch is refused', () => {
    const { identity, chain } = makeStack();
    const file = join(dir, 'snap.json');
    new ChainStore(file, chain, identity).saveNow();
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    expect(raw.version).toBe(SNAPSHOT_VERSION);
    raw.version = 999;
    writeFileSync(file, JSON.stringify(raw), 'utf8');
    expect(new ChainStore(file, chain, identity).load()).toBeNull();
  });

  it('scheduleSave debounces into a single write and flush forces it', () => {
    const { identity, chain } = makeStack();
    const file = join(dir, 'snap.json');
    const store = new ChainStore(file, chain, identity, { debounceMs: 60_000 });
    store.scheduleSave();
    store.scheduleSave();
    store.scheduleSave();
    expect(existsSync(file)).toBe(false); // still in the debounce window
    store.flush();
    expect(existsSync(file)).toBe(true);
  });
});

// ─── 3b. Storage port — the persistence backend is replaceable ────────────────

describe('ChainStore – SnapshotStorage port', () => {
  it('round-trips through a non-filesystem backend (MemorySnapshotStorage)', () => {
    const { identity, chain } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 10);

    const storage = new MemorySnapshotStorage();
    new ChainStore(storage, chain, identity).saveNow();
    expect(storage.exists()).toBe(true);

    const identity2 = new SovereignIdentityService(offlineRag);
    const chain2 = new ValueChainService(offlineRag, { identity: identity2 });
    const loaded = new ChainStore(storage, chain2, identity2).load();
    expect(loaded).not.toBeNull();
    expect(chain2.getAccount(alice.did).balance).toBe(chain.getAccount(alice.did).balance);
  });

  it('tamper-rejection is backend-independent: a hostile store cannot forge a ledger', () => {
    const { identity, chain } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 10);
    chain.transfer(alice.did, identity.register('bob').did, tokensToUnits(2));

    const storage = new MemorySnapshotStorage();
    new ChainStore(storage, chain, identity).saveNow();

    // The "backend" tampers a signed transfer in the bytes it serves
    const raw = JSON.parse(storage.read()!);
    const signed = raw.ledger.transfers.find((t: any) => t.from !== 'did:vpc:coinbase');
    signed.amount = tokensToUnits(9).toString();
    storage.write(JSON.stringify(raw));

    const identity2 = new SovereignIdentityService(offlineRag);
    const chain2 = new ValueChainService(offlineRag, { identity: identity2 });
    expect(() => new ChainStore(storage, chain2, identity2).load()).toThrow(/rejected/);
  });

  it('declares capabilities so callers can reason about durability', () => {
    expect(new MemorySnapshotStorage().capabilities.durable).toBe(false);
    expect(new FileSnapshotStorage('/tmp/x.json').capabilities.durable).toBe(true);
    expect(new FileSnapshotStorage('/tmp/x.json').capabilities.atomicWrite).toBe(true);
  });
});

// ─── 4. ConsensusNetwork driver ───────────────────────────────────────────────

describe('ConsensusNetwork – auto-propose driver', () => {
  it('one tick drives a single-node round to finality', async () => {
    const finalized: number[] = [];
    const kp = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const did = `did:vpc:${sha256(kp.publicKey).substring(0, 16)}`;
    const engine = new ConsensusEngine(offlineRag, undefined, {
      blockTimeoutMs: 60_000,
      onFinalized: (b) => finalized.push(b.proposal.payload.height),
    });
    engine.setSelf(did, kp.privateKey);
    engine.addValidator({ did, stake: 0n, publicKeyPem: kp.publicKey });
    engine.queueTransfer('tx-mvp-1');

    const network = new ConsensusNetwork(engine, []); // no peers: self-only
    await network.tick();

    expect(finalized).toEqual([0]);
    expect(engine.getHeight()).toBe(1);
    expect(engine.getPendingTxIds()).toHaveLength(0);
    network.stop();
    engine.destroy();
  });

  it('tick is a no-op when there are no pending transfers', async () => {
    const kp = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const did = `did:vpc:${sha256(kp.publicKey).substring(0, 16)}`;
    const engine = new ConsensusEngine(offlineRag, undefined, { blockTimeoutMs: 60_000 });
    engine.setSelf(did, kp.privateKey);
    engine.addValidator({ did, stake: 0n, publicKeyPem: kp.publicKey });

    const network = new ConsensusNetwork(engine, []);
    await network.tick();
    expect(engine.getHeight()).toBe(0);
    network.stop();
    engine.destroy();
  });

  it('end-to-end MVP loop: transfer hook → consensus → sealed block with state root', async () => {
    const { identity, chain } = makeStack();
    const kp = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const did = `did:vpc:${sha256(kp.publicKey).substring(0, 16)}`;
    const engine = new ConsensusEngine(offlineRag, undefined, {
      blockTimeoutMs: 60_000,
      onFinalized: () => { chain.sealBlock(); },
    });
    engine.setSelf(did, kp.privateKey);
    engine.addValidator({ did, stake: 0n, publicKeyPem: kp.publicKey });
    chain.setOnTransfer(tx => engine.queueTransfer(tx.id));

    // The MVP loop: register → mint → transfer → consensus tick → finalized block
    const alice = identity.register('alice');
    const bob = identity.register('bob');
    chain.mintReward(alice.did, 50);
    chain.transfer(alice.did, bob.did, tokensToUnits(10));

    const network = new ConsensusNetwork(engine, []);
    await network.tick();

    // Consensus finalized → value chain sealed a block committing to state
    const blocks = chain.getBlocks(5);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].txIds).toHaveLength(2); // mint + transfer
    const { proof } = chain.proveAccount(bob.did);
    expect(verifySMTProof(proof, blocks[0].stateRoot)).toBe(true);
    network.stop();
    engine.destroy();
  });
});
