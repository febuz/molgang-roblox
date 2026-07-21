/**
 * User API tests — registration, authentication, profiles, wallets
 */

import {
  UserApiService,
  SessionStore,
  WELCOME_BONUS_TOKENS,
  CHALLENGE_TTL_MS,
} from '../../src/integrations/lightrag/user-api';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { ValueChainService, tokensToUnits, unitsToTokenString } from '../../src/integrations/lightrag/value-chain';
import { AttentionChainService } from '../../src/integrations/lightrag/attention-chain';
import { NewsService } from '../../src/integrations/lightrag/news';

const offlineRag = { isConnected: () => false } as any;

function makeStack() {
  const identity = new SovereignIdentityService(offlineRag);
  const chain = new ValueChainService(offlineRag, { identity });
  const attention = new AttentionChainService(offlineRag);
  const news = new NewsService(offlineRag, undefined, { attentionService: attention });
  const api = new UserApiService(identity, chain, attention, news);
  return { identity, chain, attention, news, api };
}

// ─── SessionStore ─────────────────────────────────────────────────────────────

describe('SessionStore', () => {
  it('issues and verifies a session token', () => {
    const store = new SessionStore();
    const token = store.issueToken('did:vpc:alice', 'alice');
    const entry = store.verify(token);
    expect(entry).not.toBeNull();
    expect(entry!.did).toBe('did:vpc:alice');
    expect(entry!.handle).toBe('alice');
  });

  it('revoked token is rejected', () => {
    const store = new SessionStore();
    const token = store.issueToken('did:vpc:bob', 'bob');
    store.revoke(token);
    expect(store.verify(token)).toBeNull();
  });

  it('unknown token is rejected', () => {
    const store = new SessionStore();
    expect(store.verify('deadbeef')).toBeNull();
  });

  it('challenge is consumed once', () => {
    const store = new SessionStore();
    store.issueToken('did:vpc:x', 'x'); // prime
    const nonce = store.issueChallenge('alice');
    expect(store.consumeChallenge('alice', nonce)).toBe(true);
    expect(store.consumeChallenge('alice', nonce)).toBe(false); // second time
  });

  it('wrong nonce fails', () => {
    const store = new SessionStore();
    store.issueChallenge('alice');
    expect(store.consumeChallenge('alice', 'wrong-nonce')).toBe(false);
  });

  it('challenge for unknown handle fails', () => {
    const store = new SessionStore();
    expect(store.consumeChallenge('nobody', 'nonce')).toBe(false);
  });

  it('prune removes expired sessions', () => {
    const store = new SessionStore();
    // Manually insert an expired entry
    const token = 'expired-token';
    (store as any).sessions.set(token, { did: 'd', handle: 'h', expiresAt: Date.now() - 1 });
    store.prune();
    expect(store.verify(token)).toBeNull();
  });
});

// ─── Registration ─────────────────────────────────────────────────────────────

describe('UserApiService – registration', () => {
  it('register creates an identity with a sovereign DID', () => {
    const { api, identity } = makeStack();
    const { profile } = api.register('alice');
    expect(profile.handle).toBe('alice');
    expect(profile.did).toMatch(/^did:vpc:/);
    expect(identity.resolve(profile.did)).toBeDefined();
  });

  it('register mints the welcome bonus', () => {
    const { api, chain } = makeStack();
    const { profile, welcomeTransferId } = api.register('bob');
    expect(welcomeTransferId).not.toBeNull();
    const balance = chain.getAccount(profile.did).balance;
    expect(balance).toBeGreaterThan(0n);
    // Balance is exactly the era-scaled welcome bonus
    expect(parseFloat(unitsToTokenString(balance))).toBeCloseTo(WELCOME_BONUS_TOKENS, 0);
  });

  it('register issues a valid session token', () => {
    const { api } = makeStack();
    const { sessionToken, profile } = api.register('carol');
    const entry = api.sessions.verify(sessionToken);
    expect(entry).not.toBeNull();
    expect(entry!.handle).toBe('carol');
    expect(entry!.did).toBe(profile.did);
  });

  it('duplicate handle is rejected', () => {
    const { api } = makeStack();
    api.register('dave');
    expect(() => api.register('dave')).toThrow(/already registered/);
  });
});

// ─── Authentication ────────────────────────────────────────────────────────────

describe('UserApiService – authentication', () => {
  it('challenge returns a nonce for a known handle', () => {
    const { api } = makeStack();
    api.register('alice');
    const { nonce } = api.challenge('alice');
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('challenge for unknown handle throws', () => {
    const { api } = makeStack();
    expect(() => api.challenge('nobody')).toThrow('not found');
  });

  it('nodeLogin issues a token for a node-held identity', () => {
    const { api } = makeStack();
    api.register('alice');
    const { sessionToken, did } = api.nodeLogin('alice');
    expect(api.sessions.verify(sessionToken)).not.toBeNull();
    expect(did).toMatch(/^did:vpc:/);
  });

  it('nodeLogin for unknown handle throws', () => {
    const { api } = makeStack();
    expect(() => api.nodeLogin('ghost')).toThrow('not found');
  });

  it('verifySession validates a real Ed25519 challenge signature', () => {
    const { api, identity } = makeStack();
    api.register('alice');
    const { nonce } = api.challenge('alice');
    const aliceDid = identity.didForHandle('alice')!;
    // Use the identity service to sign the nonce (node holds the key)
    const { signature } = identity.signAs(aliceDid, nonce);
    const { sessionToken } = api.verifySession('alice', nonce, signature);
    expect(api.sessions.verify(sessionToken)?.handle).toBe('alice');
  });

  it('verifySession rejects a bad signature', () => {
    const { api } = makeStack();
    api.register('alice');
    const { nonce } = api.challenge('alice');
    expect(() => api.verifySession('alice', nonce, 'badsig==')).toThrow(/signature/);
  });

  it('verifySession rejects a replayed nonce', () => {
    const { api, identity } = makeStack();
    api.register('alice');
    const { nonce } = api.challenge('alice');
    const aliceDid = identity.didForHandle('alice')!;
    const { signature } = identity.signAs(aliceDid, nonce);
    api.verifySession('alice', nonce, signature); // consumes nonce
    expect(() => api.verifySession('alice', nonce, signature)).toThrow(/nonce/);
  });
});

// ─── Profiles ─────────────────────────────────────────────────────────────────

describe('UserApiService – profiles', () => {
  it('buildProfile returns correct DID and balance', () => {
    const { api } = makeStack();
    api.register('alice');
    const profile = api.buildProfile('alice');
    expect(profile.handle).toBe('alice');
    expect(profile.did).toMatch(/^did:vpc:/);
    expect(profile.balanceTokens).toBeDefined();
    expect(Number(profile.balanceUnits)).toBeGreaterThan(0);
  });

  it('buildProfile for unknown handle throws', () => {
    const { api } = makeStack();
    expect(() => api.buildProfile('ghost')).toThrow('not found');
  });

  it('recentClaims reflects published news', async () => {
    const { api, news } = makeStack();
    api.register('alice');
    await news.publish({ claimedFact: 'test fact', source: 'test', claimer: 'alice' });
    const profile = api.buildProfile('alice');
    expect(profile.recentClaims).toBe(1);
  });
});

// ─── Wallet ───────────────────────────────────────────────────────────────────

describe('UserApiService – wallet', () => {
  it('wallet shows balance and empty history for a new user', () => {
    const { api } = makeStack();
    api.register('alice');
    const w = api.wallet('alice');
    expect(w.handle).toBe('alice');
    expect(Number(w.balanceUnits)).toBeGreaterThan(0); // welcome bonus
    // welcome bonus is a coinbase tx (from === coinbase) — not in transfersOf
    expect(Array.isArray(w.history)).toBe(true);
  });

  it('wallet shows transfers after a send', () => {
    const { api, chain, identity } = makeStack();
    api.register('alice');
    api.register('bob');
    const aliceDid = identity.didForHandle('alice')!;
    chain.mintReward(aliceDid, 100);
    const tx = api.sendByHandle('alice', 'bob', 5);
    const w = api.wallet('alice');
    const outgoing = w.history.find(h => h.id === tx.id);
    expect(outgoing).toBeDefined();
    expect(outgoing!.direction).toBe('out');
    expect(parseFloat(outgoing!.amountTokens)).toBeCloseTo(5, 6);
  });

  it('sendByHandle transfers tokens correctly', () => {
    const { api, chain, identity } = makeStack();
    api.register('alice');
    api.register('bob');
    const aliceDid = identity.didForHandle('alice')!;
    const bobDid = identity.didForHandle('bob')!;
    chain.mintReward(aliceDid, 100);
    const before = chain.getAccount(bobDid).balance;
    api.sendByHandle('alice', 'bob', 10);
    expect(chain.getAccount(bobDid).balance).toBe(before + tokensToUnits(10));
  });

  it('sendByHandle throws for unknown handles', () => {
    const { api } = makeStack();
    api.register('alice');
    expect(() => api.sendByHandle('alice', 'nobody', 1)).toThrow('recipient handle');
    expect(() => api.sendByHandle('ghost', 'alice', 1)).toThrow('sender handle');
  });
});
