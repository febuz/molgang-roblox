/**
 * Storage port — snapshot persistence behind a replaceable interface
 *
 * Modularity rule (docs/MODULAR-ARCHITECTURE.md): every building block that
 * can fail or need replacing sits behind a port. The chain store previously
 * imported node:fs directly; that hard-coupled durability to the local
 * filesystem. This port makes the persistence backend a plugin: local file
 * today, S3 / IPFS / encrypted keystore tomorrow — without touching the
 * snapshot/restore logic, which is where the cryptographic re-verification
 * lives and must not change per backend.
 *
 * The port is byte-oriented on purpose: serialization, versioning and
 * tamper-rejection belong to the caller (ChainStore replays and re-verifies
 * signatures on load), NOT to the storage backend. A malicious backend can
 * withhold or corrupt bytes — it cannot forge a ledger that passes replay.
 */

import { writeFileSync, renameSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface StorageCapabilities {
  durable: boolean;            // survives process restart
  atomicWrite: boolean;        // partial writes can never be observed
  remote: boolean;             // leaves the local machine (latency + trust implications)
}

export interface SnapshotStorage {
  readonly name: string;
  readonly capabilities: StorageCapabilities;
  /** Atomically replace the snapshot. Throws on failure. */
  write(bytes: string): void;
  /** Return the snapshot, or null when none exists. */
  read(): string | null;
  exists(): boolean;
}

/** Local file with atomic temp-file + rename writes (the original behavior). */
export class FileSnapshotStorage implements SnapshotStorage {
  readonly name = 'file';
  readonly capabilities: StorageCapabilities = { durable: true, atomicWrite: true, remote: false };

  constructor(private readonly filePath: string) {}

  write(bytes: string): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tmp = this.filePath + '.tmp';
    writeFileSync(tmp, bytes, 'utf8');
    renameSync(tmp, this.filePath);
  }

  read(): string | null {
    if (!existsSync(this.filePath)) return null;
    return readFileSync(this.filePath, 'utf8');
  }

  exists(): boolean {
    return existsSync(this.filePath);
  }
}

/** In-memory storage — tests and embedded/ephemeral deployments. */
export class MemorySnapshotStorage implements SnapshotStorage {
  readonly name = 'memory';
  readonly capabilities: StorageCapabilities = { durable: false, atomicWrite: true, remote: false };
  private snapshot: string | null = null;

  write(bytes: string): void { this.snapshot = bytes; }
  read(): string | null { return this.snapshot; }
  exists(): boolean { return this.snapshot !== null; }
}
