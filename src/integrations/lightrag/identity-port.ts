/**
 * Identity port — DID resolution and key custody behind replaceable interfaces
 *
 * Modularity rule (docs/MODULAR-ARCHITECTURE.md): consumers used to take the
 * concrete SovereignIdentityService. This file splits the surface they
 * actually use into two narrow ports, so implementations can vary per
 * deployment without touching any consumer:
 *
 *   IdentityResolverPort  — read/gossip surface (resolve, handles, receive).
 *                           An external DID registry, an on-chain resolver or
 *                           a read-only mirror can implement this WITHOUT
 *                           ever holding a private key.
 *   IdentityCustodianPort — node-held key custody (register, signAs,
 *                           verifyAs). Implementations decide custody policy:
 *                           in-memory (default), HSM, encrypted keystore.
 *
 * Consumers take the NARROWEST port that suffices (elections and feeds only
 * resolve; the value chain also signs). The port returns documents and
 * booleans — verification logic stays with the cryptography, never with the
 * port implementation, so a hostile resolver can serve stale documents but
 * cannot forge signatures that verify.
 */

import type { IdentityDocument } from './identity';

export interface IdentityCapabilities {
  /** Implementation holds private keys (can sign). */
  holdsPrivateKeys: boolean;
  /** Accepts externally-controlled documents via receive() (gossip). */
  acceptsExternalDocs: boolean;
  /** Documents survive a process restart. */
  persistent: boolean;
}

/** Read/gossip surface — no key custody required. */
export interface IdentityResolverPort {
  resolve(did: string): IdentityDocument | undefined;
  resolveHandle(handle: string): IdentityDocument | undefined;
  didForHandle(handle: string): string | null;
  list(): IdentityDocument[];
  /** Ingest a peer document; must verify end-to-end before acceptance. */
  receive(doc: IdentityDocument): { accepted: boolean; reason?: string };
}

/** Key-custody surface — only implementations that hold private keys. */
export interface IdentityCustodianPort {
  register(handle?: string): IdentityDocument;
  signAs(did: string, message: string): { signature: string; publicKeyPem: string };
  verifyAs(did: string, message: string, signature: string): boolean;
}

/** Full port — what SovereignIdentityService provides. */
export interface IdentityPort extends IdentityResolverPort, IdentityCustodianPort {
  getStats(): Record<string, unknown>;
}
