/**
 * Contributor Backlog — P2P knowledge-graph hub for GitHub / GitLab issues
 *
 * The knowledge graph is the AUTHORITATIVE store. GitHub Issues and GitLab
 * Issues are mirrors: sync adapters (github-sync.ts / gitlab-sync.ts) pull
 * their issues into this service and push local items outward. Every item
 * lives here first; the external trackers are downstream caches.
 *
 * What makes the graph a hub:
 *  - Cross-links: each item can reference news claims, group proposals,
 *    value-chain transactions, git commits, and other groups via graphRefs.
 *  - Matrix ingest: items are encoded in the 888 888 888-dim fact matrix
 *    (semantic region) → cosine k-NN finds related items across fact kinds.
 *  - Proposal bridge: closing a linked proposal can propagate to close the
 *    backlog item (call closeByProposal).
 *
 * REST (registerHubBacklogRoutes):
 *   POST   /api/hub/backlog              — create item
 *   GET    /api/hub/backlog              — list (filter status/priority/label/provider)
 *   GET    /api/hub/backlog/stats        — counts + matrixRoot
 *   GET    /api/hub/backlog/:id          — detail + related matrix rows
 *   PATCH  /api/hub/backlog/:id          — update title/body/priority/labels/assignee
 *   POST   /api/hub/backlog/:id/close    — close item
 *   POST   /api/hub/backlog/:id/link     — add graph cross-reference
 */

import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import { canonicalize, sha256 } from './graph-state-root';
import type { FactMatrixService } from './fact-matrix';
import type { GroupEventBus } from './group-events';
import logger from '../../utils/logger';

// ── DoS bounds ────────────────────────────────────────────────────────────────
export const MAX_BACKLOG_ITEMS = 100_000;
export const MAX_TITLE_LENGTH = 512;
export const MAX_BODY_LENGTH = 65_536;
export const MAX_LABELS = 32;
export const MAX_LABEL_LENGTH = 64;
export const MAX_GRAPH_REFS_PER_ITEM = 1_000;

// ── Types ─────────────────────────────────────────────────────────────────────

export type BacklogStatus = 'open' | 'in-progress' | 'closed';
export type BacklogPriority = 'low' | 'medium' | 'high' | 'critical';
export type GraphRefKind = 'news' | 'proposal' | 'transaction' | 'group' | 'commit';
export type ExternalProvider = 'local' | 'github' | 'gitlab';

export interface GraphRef {
  kind: GraphRefKind;
  refId: string;
  addedAt: string;
}

export interface BacklogItem {
  id: string;
  title: string;
  body: string;
  status: BacklogStatus;
  priority: BacklogPriority;
  labels: string[];
  assignee?: string;            // DID
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  sourceProvider: ExternalProvider;
  externalId?: string;          // GitHub issue number / GitLab iid (as string)
  externalUrl?: string;
  graphRefs: GraphRef[];
  itemHash: string;             // sha256(canonical{title,body,status,priority,labels})
}

// ── Hash helper ───────────────────────────────────────────────────────────────

function computeItemHash(title: string, body: string, status: BacklogStatus, priority: BacklogPriority, labels: string[]): string {
  return sha256(canonicalize({ title, body, status, priority, labels: [...labels].sort() }));
}

// ── BacklogService ────────────────────────────────────────────────────────────

export class BacklogService {
  private items = new Map<string, BacklogItem>();
  /** (provider, externalId) → item id */
  private byExternal = new Map<string, string>();

  constructor(
    private readonly matrix?: FactMatrixService,
    private readonly events?: GroupEventBus,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  create(params: {
    title: string;
    body?: string;
    priority?: BacklogPriority;
    labels?: string[];
    assignee?: string;
    sourceProvider?: ExternalProvider;
    externalId?: string;
    externalUrl?: string;
  }): BacklogItem {
    if (this.items.size >= MAX_BACKLOG_ITEMS) {
      throw Object.assign(new Error('backlog full'), { status: 429 });
    }
    const title = String(params.title ?? '').trim().slice(0, MAX_TITLE_LENGTH);
    if (!title) throw Object.assign(new Error('title required'), { status: 422 });

    const body = String(params.body ?? '').slice(0, MAX_BODY_LENGTH);
    const priority: BacklogPriority = params.priority ?? 'medium';
    const labels = sanitiseLabels(params.labels ?? []);
    const provider: ExternalProvider = params.sourceProvider ?? 'local';
    const now = new Date().toISOString();

    const item: BacklogItem = {
      id: `bklg_${uuid()}`,
      title,
      body,
      status: 'open',
      priority,
      labels,
      assignee: params.assignee,
      createdAt: now,
      updatedAt: now,
      sourceProvider: provider,
      externalId: params.externalId,
      externalUrl: params.externalUrl,
      graphRefs: [],
      itemHash: computeItemHash(title, body, 'open', priority, labels),
    };

    this.items.set(item.id, item);
    if (provider !== 'local' && params.externalId) {
      this.byExternal.set(externalKey(provider, params.externalId), item.id);
    }

    this.ingestToMatrix(item);
    this.emitEvent('hub.backlog.created', item);
    logger.info(`backlog: created ${item.id} (${provider})`);
    return item;
  }

  get(id: string): BacklogItem | undefined {
    return this.items.get(id);
  }

  list(opts: {
    status?: BacklogStatus;
    priority?: BacklogPriority;
    label?: string;
    provider?: ExternalProvider;
    limit?: number;
    offset?: number;
  } = {}): BacklogItem[] {
    let out = [...this.items.values()];
    if (opts.status) out = out.filter(i => i.status === opts.status);
    if (opts.priority) out = out.filter(i => i.priority === opts.priority);
    if (opts.label) out = out.filter(i => i.labels.includes(opts.label!));
    if (opts.provider) out = out.filter(i => i.sourceProvider === opts.provider);
    // newest first
    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const offset = Math.max(0, opts.offset ?? 0);
    const limit = Math.max(1, Math.min(opts.limit ?? 100, 1000));
    return out.slice(offset, offset + limit);
  }

  update(id: string, patch: {
    title?: string;
    body?: string;
    priority?: BacklogPriority;
    labels?: string[];
    assignee?: string | null;
    status?: BacklogStatus;
    externalUrl?: string;
  }): BacklogItem {
    const item = this.items.get(id);
    if (!item) throw Object.assign(new Error('item not found'), { status: 404 });
    if (item.status === 'closed' && patch.status !== 'open') {
      throw Object.assign(new Error('item is closed; reopen first'), { status: 409 });
    }

    if (patch.title !== undefined) item.title = String(patch.title).trim().slice(0, MAX_TITLE_LENGTH);
    if (patch.body !== undefined) item.body = String(patch.body).slice(0, MAX_BODY_LENGTH);
    if (patch.priority !== undefined) item.priority = patch.priority;
    if (patch.labels !== undefined) item.labels = sanitiseLabels(patch.labels);
    if (patch.assignee !== undefined) item.assignee = patch.assignee ?? undefined;
    if (patch.status !== undefined) item.status = patch.status;
    if (patch.externalUrl !== undefined) item.externalUrl = patch.externalUrl;
    item.updatedAt = new Date().toISOString();
    item.itemHash = computeItemHash(item.title, item.body, item.status, item.priority, item.labels);

    this.ingestToMatrix(item);
    this.emitEvent('hub.backlog.updated', item);
    return item;
  }

  close(id: string): BacklogItem {
    const item = this.items.get(id);
    if (!item) throw Object.assign(new Error('item not found'), { status: 404 });
    if (item.status === 'closed') return item;  // idempotent
    item.status = 'closed';
    const now = new Date().toISOString();
    item.closedAt = now;
    item.updatedAt = now;
    item.itemHash = computeItemHash(item.title, item.body, 'closed', item.priority, item.labels);
    this.ingestToMatrix(item);
    this.emitEvent('hub.backlog.closed', item);
    logger.info(`backlog: closed ${id}`);
    return item;
  }

  // ── Graph cross-links ────────────────────────────────────────────────────────

  link(id: string, kind: GraphRefKind, refId: string): BacklogItem {
    const item = this.items.get(id);
    if (!item) throw Object.assign(new Error('item not found'), { status: 404 });
    if (item.graphRefs.length >= MAX_GRAPH_REFS_PER_ITEM) {
      throw Object.assign(new Error('graph ref limit reached'), { status: 429 });
    }
    // dedupe
    const exists = item.graphRefs.some(r => r.kind === kind && r.refId === refId);
    if (!exists) {
      item.graphRefs.push({ kind, refId, addedAt: new Date().toISOString() });
      item.updatedAt = new Date().toISOString();
      this.emitEvent('hub.backlog.linked', { id, kind, refId });
    }
    return item;
  }

  /** Called when a group proposal is closed — propagates to any linked items. */
  closeByProposal(proposalId: string): BacklogItem[] {
    const closed: BacklogItem[] = [];
    for (const item of this.items.values()) {
      if (item.status !== 'closed' && item.graphRefs.some(r => r.kind === 'proposal' && r.refId === proposalId)) {
        closed.push(this.close(item.id));
      }
    }
    return closed;
  }

  // ── External sync helpers ────────────────────────────────────────────────────

  findByExternal(provider: ExternalProvider, externalId: string): BacklogItem | undefined {
    const itemId = this.byExternal.get(externalKey(provider, externalId));
    return itemId ? this.items.get(itemId) : undefined;
  }

  /** Create-or-update from an external issue. Used by sync adapters. */
  upsertExternal(provider: ExternalProvider, externalId: string, data: {
    title: string;
    body?: string;
    priority?: BacklogPriority;
    labels?: string[];
    assignee?: string;
    externalUrl?: string;
    closed?: boolean;
  }): { item: BacklogItem; created: boolean } {
    const existing = this.findByExternal(provider, externalId);
    if (existing) {
      this.update(existing.id, {
        title: data.title,
        body: data.body,
        priority: data.priority,
        labels: data.labels,
        assignee: data.assignee ?? null,
        externalUrl: data.externalUrl,
        ...(data.closed && existing.status !== 'closed' ? { status: 'closed' } : {}),
        ...(!data.closed && existing.status === 'closed' ? { status: 'open' } : {}),
      });
      if (data.closed && existing.status !== 'closed') this.close(existing.id);
      return { item: existing, created: false };
    }
    const item = this.create({
      title: data.title,
      body: data.body,
      priority: data.priority,
      labels: data.labels,
      assignee: data.assignee,
      sourceProvider: provider,
      externalId,
      externalUrl: data.externalUrl,
    });
    if (data.closed) this.close(item.id);
    return { item, created: true };
  }

  /** Items that have not been pushed to an external tracker yet. */
  localUnsynced(provider: ExternalProvider): BacklogItem[] {
    return [...this.items.values()].filter(
      i => i.sourceProvider === 'local' && !this.byExternal.has(externalKey(provider, i.id)),
    );
  }

  /** Register the external ID returned by the tracker after creating the issue. */
  registerExternalId(itemId: string, provider: ExternalProvider, externalId: string, externalUrl?: string): void {
    const item = this.items.get(itemId);
    if (!item) return;
    item.externalId = externalId;
    if (externalUrl) item.externalUrl = externalUrl;
    item.sourceProvider = provider;
    item.updatedAt = new Date().toISOString();
    this.byExternal.set(externalKey(provider, externalId), itemId);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  getStats(): {
    total: number;
    open: number;
    inProgress: number;
    closed: number;
    byPriority: Record<BacklogPriority, number>;
    byProvider: Record<ExternalProvider, number>;
    matrixRows: number;
  } {
    const byPriority: Record<BacklogPriority, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byProvider: Record<ExternalProvider, number> = { local: 0, github: 0, gitlab: 0 };
    let open = 0, inProgress = 0, closed = 0;
    for (const item of this.items.values()) {
      if (item.status === 'open') open++;
      else if (item.status === 'in-progress') inProgress++;
      else closed++;
      byPriority[item.priority] += 1;
      byProvider[item.sourceProvider] += 1;
    }
    const matrixRows = this.matrix ? this.matrix.listRows('backlog', 1_000_000).length : 0;
    return { total: this.items.size, open, inProgress, closed, byPriority, byProvider, matrixRows };
  }

  /** k-NN related items via fact matrix cosine similarity. */
  related(id: string, k = 10): Array<{ item: BacklogItem; similarity: number }> {
    if (!this.matrix) return [];
    const row = this.matrix.getRowByRef('backlog', id);
    if (!row) return [];
    const neighbours = this.matrix.similar(row.id, k * 3, false);
    const out: Array<{ item: BacklogItem; similarity: number }> = [];
    for (const { row: r, similarity } of neighbours) {
      if (r.kind === 'backlog') {
        const item = this.items.get(r.refId);
        if (item && item.id !== id) out.push({ item, similarity });
      }
      if (out.length >= k) break;
    }
    return out;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private ingestToMatrix(item: BacklogItem): void {
    if (!this.matrix) return;
    try {
      this.matrix.ingestBacklogItem({
        itemId: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        labels: item.labels,
        assignee: item.assignee,
      });
    } catch (e: any) {
      logger.warn(`backlog: matrix ingest failed for ${item.id}: ${e.message}`);
    }
  }

  private emitEvent(type: string, body: unknown): void {
    if (!this.events) return;
    try {
      (this.events as any).emit(type as any, { data: body });
    } catch { /* best effort */ }
  }
}

// ── Private utilities ─────────────────────────────────────────────────────────

function sanitiseLabels(labels: unknown[]): string[] {
  return (labels ?? [])
    .map(l => String(l ?? '').trim().slice(0, MAX_LABEL_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_LABELS);
}

function externalKey(provider: ExternalProvider, externalId: string): string {
  return `${provider}:${externalId}`;
}

// ── REST routes ───────────────────────────────────────────────────────────────

const VALID_STATUSES: BacklogStatus[] = ['open', 'in-progress', 'closed'];
const VALID_PRIORITIES: BacklogPriority[] = ['low', 'medium', 'high', 'critical'];
const VALID_REF_KINDS: GraphRefKind[] = ['news', 'proposal', 'transaction', 'group', 'commit'];

export function registerHubBacklogRoutes(app: Express, svc: BacklogService): void {

  app.post('/api/hub/backlog', (req: Request, res: Response): void => {
    const { title, body, priority, labels, assignee, externalId, externalUrl, sourceProvider } = req.body ?? {};
    if (!title) { res.status(422).json({ success: false, error: 'title required' }); return; }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      res.status(422).json({ success: false, error: 'invalid priority' }); return;
    }
    try {
      const item = svc.create({ title, body, priority, labels, assignee, externalId, externalUrl, sourceProvider });
      res.status(201).json({ success: true, item });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/hub/backlog/stats', (_req: Request, res: Response): void => {
    res.json({ success: true, ...svc.getStats() });
  });

  app.get('/api/hub/backlog', (req: Request, res: Response): void => {
    const { status, priority, label, provider } = req.query as Record<string, string>;
    if (status && !VALID_STATUSES.includes(status as BacklogStatus)) {
      res.status(422).json({ success: false, error: 'invalid status' }); return;
    }
    if (priority && !VALID_PRIORITIES.includes(priority as BacklogPriority)) {
      res.status(422).json({ success: false, error: 'invalid priority' }); return;
    }
    const limit = Math.max(1, Math.min(parseInt(String(req.query.limit ?? '100'), 10) || 100, 1000));
    const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0);
    const items = svc.list({ status: status as BacklogStatus, priority: priority as BacklogPriority, label, provider: provider as ExternalProvider, limit, offset });
    res.json({ success: true, count: items.length, items });
  });

  app.get('/api/hub/backlog/:id', (req: Request, res: Response): void => {
    const item = svc.get(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: 'item not found' }); return; }
    const related = svc.related(item.id, 5);
    res.json({ success: true, item, related });
  });

  app.patch('/api/hub/backlog/:id', (req: Request, res: Response): void => {
    const { title, body, priority, labels, assignee, status, externalUrl } = req.body ?? {};
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      res.status(422).json({ success: false, error: 'invalid priority' }); return;
    }
    if (status && !VALID_STATUSES.includes(status)) {
      res.status(422).json({ success: false, error: 'invalid status' }); return;
    }
    try {
      const item = svc.update(req.params.id, { title, body, priority, labels, assignee, status, externalUrl });
      res.json({ success: true, item });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hub/backlog/:id/close', (req: Request, res: Response): void => {
    try {
      const item = svc.close(req.params.id);
      res.json({ success: true, item });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hub/backlog/:id/link', (req: Request, res: Response): void => {
    const { kind, refId } = req.body ?? {};
    if (!kind || !VALID_REF_KINDS.includes(kind)) {
      res.status(422).json({ success: false, error: `kind must be one of: ${VALID_REF_KINDS.join('|')}` }); return;
    }
    if (!refId) { res.status(422).json({ success: false, error: 'refId required' }); return; }
    try {
      const item = svc.link(req.params.id, kind as GraphRefKind, String(refId));
      res.json({ success: true, item });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });
}
