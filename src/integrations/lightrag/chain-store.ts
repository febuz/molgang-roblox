/**
 * Chain Store — crash-safe durability for the sovereign stack
 *
 * Everything in the P2P stack was in-memory: a restart lost the ledger, all
 * identities and the finalized history. That is acceptable for a library,
 * not for an MVP node. This store gives every restartable service a single
 * JSON snapshot on disk:
 *
 *   - LEDGER: the ordered transfer log + sealed blocks (value-chain.ts
 *     exportState). Restore REPLAYS the log — signed transfers are
 *     re-verified cryptographically, the conservation invariant and the
 *     block chain are re-checked. A tampered snapshot fails restore loudly
 *     instead of booting a corrupted ledger.
 *
 *   - IDENTITIES: public identity documents (DID, genesis key, rotation
 *     chain, handle). Restore feeds them through the normal receive() path,
 *     so the same longest-chain / handle-takeover rules apply to disk state
 *     as to gossip. Node-held PRIVATE keys are deliberately NOT persisted —
 *     key custody on disk is a deployment decision (HSM, encrypted keystore),
 *     not something a snapshot file should silently do.
 *
 *   - ATOMIC WRITES: snapshot goes to a temp file first, then rename() —
 *     a crash mid-write leaves the previous good snapshot intact.
 *
 *   - DEBOUNCED SAVES: scheduleSave() coalesces bursts (every transfer fires
 *     the hook) into one write per `debounceMs`.
 */

import { writeFileSync, renameSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type { ValueChainService } from './value-chain';
import type { SovereignIdentityService, IdentityDocument } from './identity';
import logger from '../../utils/logger';

export const SNAPSHOT_VERSION = 1;

export interface ChainSnapshot {
  version: number;
  savedAt: string;
  ledger: ReturnType<ValueChainService['exportState']>;
  identities: IdentityDocument[];
}

export class ChainStore {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  constructor(
    private readonly filePath: string,
    private readonly valueChain: ValueChainService,
    private readonly identity?: SovereignIdentityService,
    opts: { debounceMs?: number } = {},
  ) {
    this.debounceMs = opts.debounceMs ?? 1_000;
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  /** Coalesce save requests: at most one disk write per debounce window. */
  scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, this.debounceMs);
    this.saveTimer.unref();
  }

  /** Write the snapshot atomically (temp file + rename). */
  saveNow(): void {
    try {
      const snapshot: ChainSnapshot = {
        version: SNAPSHOT_VERSION,
        savedAt: new Date().toISOString(),
        ledger: this.valueChain.exportState(),
        identities: this.identity?.list() ?? [],
      };
      mkdirSync(dirname(this.filePath), { recursive: true });
      const tmp = this.filePath + '.tmp';
      writeFileSync(tmp, JSON.stringify(snapshot), 'utf8');
      renameSync(tmp, this.filePath);
    } catch (e: any) {
      logger.warn(`chain store save failed: ${e.message}`);
    }
  }

  /** Flush any pending debounced save (call on shutdown). */
  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveNow();
  }

  // ── Load ─────────────────────────────────────────────────────────────────────

  /**
   * Restore state from disk into the (empty) services. Returns what was
   * loaded, or null when no snapshot exists. Identity documents are restored
   * FIRST so that the ledger replay sees registered DIDs.
   *
   * MUST run before any hooks (onTransfer / attention mining) are wired —
   * replayed history must not re-trigger consensus or re-mint rewards.
   */
  load(): { transfers: number; blocks: number; identities: number } | null {
    if (!existsSync(this.filePath)) return null;
    let snapshot: ChainSnapshot;
    try {
      snapshot = JSON.parse(readFileSync(this.filePath, 'utf8'));
    } catch (e: any) {
      logger.error(`chain store: snapshot unreadable (${e.message}) — starting fresh`);
      return null;
    }
    if (snapshot.version !== SNAPSHOT_VERSION) {
      logger.error(`chain store: snapshot version ${snapshot.version} unsupported — starting fresh`);
      return null;
    }

    let identities = 0;
    if (this.identity) {
      for (const doc of snapshot.identities ?? []) {
        const r = this.identity.receive(doc);
        if (r.accepted) identities++;
        else logger.warn(`chain store: identity ${doc.did} rejected on restore: ${r.reason}`);
      }
    }

    // Replay throws on tampering / broken invariants — let it propagate:
    // booting with a corrupted ledger is worse than refusing to boot.
    this.valueChain.restoreState(snapshot.ledger);

    return {
      transfers: snapshot.ledger.transfers.length,
      blocks: snapshot.ledger.blocks.length,
      identities,
    };
  }
}

/** Default snapshot location: <dataDir>/chain-snapshot.json */
export function defaultSnapshotPath(dataDir = process.env.CHAIN_DATA_DIR ?? './data'): string {
  return join(dataDir, 'chain-snapshot.json');
}
