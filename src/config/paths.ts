/**
 * Centralized path / location config — the single source of truth for where
 * VirtualPC reads and writes things on disk.
 *
 * Historically these paths were hardcoded to one machine (`/media/knight2/EDS2`,
 * `/home/knight2`), which meant the app only ran on that box and could not be
 * built in CI or by another developer. Every value here is env-overridable and
 * defaults to a portable, project-local location.
 *
 * Resolution happens once at import time, mirroring the previous module-level
 * `const STATE_DIR = process.env... || '...'` pattern (so dotenv timing is
 * unchanged).
 */
import * as path from 'path';
import * as os from 'os';

/**
 * Repo root. This file compiles to `dist/config/paths.js` and runs from
 * `src/config/paths.ts` under ts-node — both are two levels below the repo
 * root, so `../../` resolves correctly in dev and prod.
 */
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Persistent runtime state: credentials, task state, audit log, promo proposals.
 * Defaults to a gitignored project-local dir; override with VIRTUALPC_STATE_DIR.
 */
export const STATE_DIR =
  process.env.VIRTUALPC_STATE_DIR || path.join(REPO_ROOT, '.virtualpc-state');

/**
 * External molgang-web project checkout (asset registry + governance sources).
 * Defaults to a sibling checkout next to this repo; override with
 * MOLGANG_PROJECT_ROOT.
 */
export const PROJECT_ROOT =
  process.env.MOLGANG_PROJECT_ROOT || path.resolve(REPO_ROOT, '..', 'molgang-web');

/** Shared data directory inside the molgang-web project. */
export const PROJECT_SHARED_DIR =
  process.env.MOLGANG_SHARED_DIR || path.join(PROJECT_ROOT, 'shared');

/** Canonical asset registry consumed by the webgame loader + governance. */
export const ASSET_REGISTRY_PATH =
  process.env.ASSET_REGISTRY_PATH || path.join(PROJECT_SHARED_DIR, 'asset-registry.json');

/** Current user's home directory — was hardcoded to /home/knight2. */
export const HOME_DIR = process.env.HOME || os.homedir();

/** Resolve a file under the molgang-web shared dir (e.g. 'elements.json'). */
export function sharedDataPath(file: string): string {
  return path.join(PROJECT_SHARED_DIR, file);
}
