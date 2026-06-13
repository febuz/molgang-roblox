/**
 * Contributor Backlog — unit tests
 *
 * Coverage:
 *  - BacklogService: lifecycle, validation, DoS bounds, graph cross-links,
 *    external upsert, proposal bridge, stats, k-NN related
 *  - encodeBacklogItem / FactMatrixService backlog ingest
 *  - GitHubBacklogSync: webhook verification, event routing, pull mapping
 *  - GitLabBacklogSync: webhook verification, event routing, pull mapping
 *  - HTTP API: create, list, get, patch, close, link
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import http from 'node:http';
import express from 'express';
import { BacklogService, registerHubBacklogRoutes, MAX_BACKLOG_ITEMS } from '../../src/integrations/lightrag/backlog';
import { FactMatrixService, encodeBacklogItem } from '../../src/integrations/lightrag/fact-matrix';
import { GitHubBacklogSync } from '../../src/integrations/backlog/github-sync';
import { GitLabBacklogSync } from '../../src/integrations/backlog/gitlab-sync';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeBacklog(matrix?: FactMatrixService): BacklogService {
  return new BacklogService(matrix);
}

function startServer(svc: BacklogService): Promise<{ url: string; server: http.Server }> {
  return new Promise(resolve => {
    const app = express();
    app.use(express.json());
    registerHubBacklogRoutes(app, svc);
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({ url: `http://localhost:${port}`, server });
    });
  });
}

function httpCall(url: string, method: string, body?: unknown): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request({
      hostname: parsed.hostname,
      port: parseInt(parsed.port),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode ?? 0, body: null }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── BacklogService — lifecycle ────────────────────────────────────────────────

describe('BacklogService lifecycle', () => {
  let svc: BacklogService;
  beforeEach(() => { svc = makeBacklog(); });

  it('creates an item with defaults', () => {
    const item = svc.create({ title: 'Fix the thing' });
    expect(item.id).toMatch(/^bklg_/);
    expect(item.status).toBe('open');
    expect(item.priority).toBe('medium');
    expect(item.labels).toEqual([]);
    expect(item.sourceProvider).toBe('local');
  });

  it('stores and retrieves the item', () => {
    const created = svc.create({ title: 'Store me' });
    const found = svc.get(created.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Store me');
  });

  it('returns undefined for unknown id', () => {
    expect(svc.get('bklg_nope')).toBeUndefined();
  });

  it('rejects empty title', () => {
    expect(() => svc.create({ title: '' })).toThrow();
  });

  it('truncates title to MAX_TITLE_LENGTH', () => {
    const item = svc.create({ title: 'x'.repeat(600) });
    expect(item.title.length).toBe(512);
  });

  it('updates an item', () => {
    const item = svc.create({ title: 'A' });
    const updated = svc.update(item.id, { title: 'B', priority: 'high' });
    expect(updated.title).toBe('B');
    expect(updated.priority).toBe('high');
  });

  it('closes an item', () => {
    const item = svc.create({ title: 'C' });
    const closed = svc.close(item.id);
    expect(closed.status).toBe('closed');
    expect(closed.closedAt).toBeDefined();
  });

  it('close is idempotent', () => {
    const item = svc.create({ title: 'D' });
    svc.close(item.id);
    const again = svc.close(item.id);
    expect(again.status).toBe('closed');
  });

  it('blocks update on closed item (status stays closed)', () => {
    const item = svc.create({ title: 'E' });
    svc.close(item.id);
    expect(() => svc.update(item.id, { title: 'F' })).toThrow();
  });

  it('allows reopening a closed item via patch status=open', () => {
    const item = svc.create({ title: 'G' });
    svc.close(item.id);
    const reopened = svc.update(item.id, { status: 'open' });
    expect(reopened.status).toBe('open');
  });

  it('sanitises labels', () => {
    const item = svc.create({ title: 'H', labels: ['  Bug  ', 'Feature', '', '  '] });
    expect(item.labels).toEqual(['Bug', 'Feature']);
  });
});

// ── BacklogService — filtering and listing ────────────────────────────────────

describe('BacklogService list', () => {
  let svc: BacklogService;
  beforeEach(() => {
    svc = makeBacklog();
    svc.create({ title: 'Open high', priority: 'high' });
    svc.create({ title: 'Open low', priority: 'low', labels: ['bug'] });
    const c = svc.create({ title: 'Closed item' });
    svc.close(c.id);
  });

  it('lists all', () => {
    expect(svc.list().length).toBe(3);
  });

  it('filters by status', () => {
    expect(svc.list({ status: 'open' }).length).toBe(2);
    expect(svc.list({ status: 'closed' }).length).toBe(1);
  });

  it('filters by priority', () => {
    expect(svc.list({ priority: 'high' }).length).toBe(1);
  });

  it('filters by label', () => {
    expect(svc.list({ label: 'bug' }).length).toBe(1);
  });

  it('paginates with offset', () => {
    const all = svc.list();
    const paged = svc.list({ limit: 2, offset: 1 });
    expect(paged.length).toBe(2);
    expect(paged[0].id).toBe(all[1].id);
  });
});

// ── Graph cross-links ─────────────────────────────────────────────────────────

describe('BacklogService graph links', () => {
  let svc: BacklogService;
  beforeEach(() => { svc = makeBacklog(); });

  it('adds a cross-link', () => {
    const item = svc.create({ title: 'Link me' });
    svc.link(item.id, 'news', 'news123');
    expect(item.graphRefs).toHaveLength(1);
    expect(item.graphRefs[0].kind).toBe('news');
    expect(item.graphRefs[0].refId).toBe('news123');
  });

  it('deduplicates cross-links', () => {
    const item = svc.create({ title: 'Dedup' });
    svc.link(item.id, 'news', 'n1');
    svc.link(item.id, 'news', 'n1');
    expect(item.graphRefs).toHaveLength(1);
  });

  it('allows different kinds with same refId', () => {
    const item = svc.create({ title: 'Multi' });
    svc.link(item.id, 'news', 'ref1');
    svc.link(item.id, 'proposal', 'ref1');
    expect(item.graphRefs).toHaveLength(2);
  });

  it('throws on unknown item', () => {
    expect(() => svc.link('bklg_nope', 'news', 'x')).toThrow();
  });
});

// ── Proposal bridge ───────────────────────────────────────────────────────────

describe('BacklogService proposal bridge', () => {
  it('closes items linked to a proposal', () => {
    const svc = makeBacklog();
    const a = svc.create({ title: 'A' });
    const b = svc.create({ title: 'B' });
    const c = svc.create({ title: 'C — unlinked' });
    svc.link(a.id, 'proposal', 'prop123');
    svc.link(b.id, 'proposal', 'prop123');
    const closed = svc.closeByProposal('prop123');
    expect(closed.length).toBe(2);
    expect(svc.get(a.id)!.status).toBe('closed');
    expect(svc.get(b.id)!.status).toBe('closed');
    expect(svc.get(c.id)!.status).toBe('open');
  });
});

// ── External sync helpers ─────────────────────────────────────────────────────

describe('BacklogService external upsert', () => {
  let svc: BacklogService;
  beforeEach(() => { svc = makeBacklog(); });

  it('creates a new item on first upsert', () => {
    const { item, created } = svc.upsertExternal('github', '42', { title: 'Issue 42' });
    expect(created).toBe(true);
    expect(item.sourceProvider).toBe('github');
    expect(item.externalId).toBe('42');
  });

  it('updates without creating on second upsert', () => {
    svc.upsertExternal('github', '42', { title: 'First' });
    const { created } = svc.upsertExternal('github', '42', { title: 'Updated' });
    expect(created).toBe(false);
    expect(svc.findByExternal('github', '42')!.title).toBe('Updated');
  });

  it('propagates closed=true from external', () => {
    const { item } = svc.upsertExternal('github', '99', { title: 'X', closed: true });
    expect(item.status).toBe('closed');
  });

  it('distinguishes github vs gitlab namespaces', () => {
    svc.upsertExternal('github', '1', { title: 'GH' });
    svc.upsertExternal('gitlab', '1', { title: 'GL' });
    expect(svc.list().length).toBe(2);
  });

  it('registerExternalId wires the key', () => {
    const item = svc.create({ title: 'Local' });
    svc.registerExternalId(item.id, 'github', '77', 'https://github.com/test/77');
    expect(svc.findByExternal('github', '77')!.id).toBe(item.id);
  });

  it('localUnsynced returns only items without external registration', () => {
    svc.create({ title: 'Unsynced' });
    svc.upsertExternal('github', '5', { title: 'Synced' });
    expect(svc.localUnsynced('github').length).toBe(1);
  });
});

// ── Stats ─────────────────────────────────────────────────────────────────────

describe('BacklogService stats', () => {
  it('counts by status and priority', () => {
    const svc = makeBacklog();
    svc.create({ title: 'A', priority: 'high' });
    svc.create({ title: 'B', priority: 'low' });
    const c = svc.create({ title: 'C' });
    svc.close(c.id);
    const stats = svc.getStats();
    expect(stats.total).toBe(3);
    expect(stats.open).toBe(2);
    expect(stats.closed).toBe(1);
    expect(stats.byPriority.high).toBe(1);
    expect(stats.byPriority.low).toBe(1);
  });
});

// ── Fact matrix integration ───────────────────────────────────────────────────

describe('encodeBacklogItem', () => {
  it('produces non-empty coordinates', () => {
    const coords = encodeBacklogItem({ itemId: 'b1', title: 'Test item', status: 'open', priority: 'high' });
    expect(coords.length).toBeGreaterThan(0);
  });

  it('throws on empty itemId', () => {
    expect(() => encodeBacklogItem({ itemId: '', title: 'T', status: 'open', priority: 'low' })).toThrow('itemId required');
  });

  it('throws on empty title', () => {
    expect(() => encodeBacklogItem({ itemId: 'x', title: '', status: 'open', priority: 'low' })).toThrow('title required');
  });

  it('includes label dimensions', () => {
    const noLabel = encodeBacklogItem({ itemId: 'b1', title: 'T', status: 'open', priority: 'low' });
    const withLabel = encodeBacklogItem({ itemId: 'b1', title: 'T', status: 'open', priority: 'low', labels: ['bug'] });
    expect(withLabel.length).toBeGreaterThan(noLabel.length);
  });

  it('open and closed items get different coordinates', () => {
    const open = encodeBacklogItem({ itemId: 'b1', title: 'T', status: 'open', priority: 'medium' });
    const closed = encodeBacklogItem({ itemId: 'b1', title: 'T', status: 'closed', priority: 'medium' });
    const dimOpen = new Set(open.map(c => c.dim));
    const dimClosed = new Set(closed.map(c => c.dim));
    // status:open dim not in closed; status:closed dim not in open
    const intersection = [...dimOpen].filter(d => dimClosed.has(d));
    expect(intersection.length).toBeLessThan(open.length);  // at least one status dim differs
  });
});

describe('FactMatrixService backlog ingest', () => {
  it('ingestBacklogItem stores a row with kind=backlog', () => {
    const matrix = new FactMatrixService();
    const row = matrix.ingestBacklogItem({ itemId: 'b1', title: 'Feature request', status: 'open', priority: 'medium' });
    expect(row.kind).toBe('backlog');
    expect(row.id).toBeDefined();
  });

  it('is idempotent per itemId', () => {
    const matrix = new FactMatrixService();
    const r1 = matrix.ingestBacklogItem({ itemId: 'same', title: 'T', status: 'open', priority: 'low' });
    const r2 = matrix.ingestBacklogItem({ itemId: 'same', title: 'T', status: 'open', priority: 'low' });
    expect(r1.id).toBe(r2.id);
  });

  it('stats.byKind.backlog reflects ingested rows', () => {
    const matrix = new FactMatrixService();
    matrix.ingestBacklogItem({ itemId: 'b1', title: 'T', status: 'open', priority: 'low' });
    const stats = matrix.getStats();
    expect(stats.byKind.backlog).toBe(1);
  });

  it('BacklogService auto-ingests on create', () => {
    const matrix = new FactMatrixService();
    const svc = new BacklogService(matrix);
    svc.create({ title: 'Auto ingest' });
    expect(matrix.listRows('backlog').length).toBe(1);
  });

  it('BacklogService related() returns matrix neighbours', () => {
    const matrix = new FactMatrixService();
    const svc = new BacklogService(matrix);
    const a = svc.create({ title: 'Bug: login fails', labels: ['bug'] });
    const b = svc.create({ title: 'Bug: logout fails', labels: ['bug'] });
    svc.create({ title: 'Feature: dark mode', priority: 'low' });
    // a and b share label 'bug' — should appear as related to each other
    const related = svc.related(a.id, 5);
    const ids = related.map(r => r.item.id);
    expect(ids).toContain(b.id);
  });
});

// ── GitHub webhook ────────────────────────────────────────────────────────────

describe('GitHubBacklogSync webhook', () => {
  function makeSync(secret?: string): GitHubBacklogSync {
    return new GitHubBacklogSync(
      { token: 'tok', owner: 'test', repo: 'repo', webhookSecret: secret },
      makeBacklog(),
    );
  }

  it('creates item on issues.opened', () => {
    const svc = makeBacklog();
    const sync = new GitHubBacklogSync({ token: 't', owner: 'o', repo: 'r' }, svc);
    const payload = JSON.stringify({
      action: 'opened',
      issue: { number: 1, title: 'Hello', body: 'World', labels: [], state: 'open', html_url: 'https://gh/1', assignee: null },
    });
    const result = sync.handleWebhook('issues', payload, undefined);
    expect(result.accepted).toBe(true);
    expect(result.action).toBe('opened');
    expect(svc.findByExternal('github', '1')).toBeDefined();
  });

  it('closes item on issues.closed', () => {
    const svc = makeBacklog();
    const sync = new GitHubBacklogSync({ token: 't', owner: 'o', repo: 'r' }, svc);
    const open = JSON.stringify({ action: 'opened', issue: { number: 2, title: 'Fix', body: '', labels: [], state: 'open', html_url: '' } });
    sync.handleWebhook('issues', open, undefined);
    const close = JSON.stringify({ action: 'closed', issue: { number: 2, title: 'Fix', body: '', labels: [], state: 'closed', html_url: '' } });
    sync.handleWebhook('issues', close, undefined);
    expect(svc.findByExternal('github', '2')!.status).toBe('closed');
  });

  it('maps priority labels', () => {
    const svc = makeBacklog();
    const sync = new GitHubBacklogSync({ token: 't', owner: 'o', repo: 'r' }, svc);
    const payload = JSON.stringify({
      action: 'opened',
      issue: { number: 3, title: 'Critical bug', body: '', labels: [{ name: 'critical' }], state: 'open', html_url: '' },
    });
    sync.handleWebhook('issues', payload, undefined);
    expect(svc.findByExternal('github', '3')!.priority).toBe('critical');
  });

  it('rejects mismatched HMAC signature', () => {
    const sync = makeSync('mysecret');
    const payload = JSON.stringify({ action: 'opened', issue: { number: 4, title: 'X', body: '', labels: [], state: 'open', html_url: '' } });
    const result = sync.handleWebhook('issues', payload, 'sha256=badhash');
    expect(result.accepted).toBe(false);
  });

  it('ignores non-issue events', () => {
    const svc = makeBacklog();
    const sync = new GitHubBacklogSync({ token: 't', owner: 'o', repo: 'r' }, svc);
    const result = sync.handleWebhook('push', '{}', undefined);
    expect(result.accepted).toBe(true);
    expect(result.action).toBe('ignored');
  });

  it('skips unknown actions gracefully', () => {
    const svc = makeBacklog();
    const sync = new GitHubBacklogSync({ token: 't', owner: 'o', repo: 'r' }, svc);
    const payload = JSON.stringify({ action: 'milestoned', issue: { number: 5, title: 'Y', body: '', labels: [], state: 'open', html_url: '' } });
    const result = sync.handleWebhook('issues', payload, undefined);
    expect(result.accepted).toBe(true);
    expect(result.action).toContain('ignored');
  });
});

// ── GitLab webhook ────────────────────────────────────────────────────────────

describe('GitLabBacklogSync webhook', () => {
  function makeSync(secret?: string): { sync: GitLabBacklogSync; svc: BacklogService } {
    const svc = makeBacklog();
    const sync = new GitLabBacklogSync(
      { token: 'tok', projectId: '1', webhookSecret: secret },
      svc,
    );
    return { sync, svc };
  }

  it('creates item on issue open', () => {
    const { sync, svc } = makeSync();
    const payload = JSON.stringify({
      object_kind: 'issue',
      labels: [],
      assignees: [],
      object_attributes: { iid: 10, title: 'GL issue', description: 'body', action: 'open', state: 'opened', url: 'https://gl/10' },
    });
    const result = sync.handleWebhook(payload, undefined);
    expect(result.accepted).toBe(true);
    expect(svc.findByExternal('gitlab', '10')).toBeDefined();
  });

  it('closes item on issue close', () => {
    const { sync, svc } = makeSync();
    const openPayload = JSON.stringify({ object_kind: 'issue', labels: [], assignees: [], object_attributes: { iid: 11, title: 'X', description: '', action: 'open', url: '' } });
    sync.handleWebhook(openPayload, undefined);
    const closePayload = JSON.stringify({ object_kind: 'issue', labels: [], assignees: [], object_attributes: { iid: 11, title: 'X', description: '', action: 'close', url: '' } });
    sync.handleWebhook(closePayload, undefined);
    expect(svc.findByExternal('gitlab', '11')!.status).toBe('closed');
  });

  it('rejects mismatched webhook token', () => {
    const { sync } = makeSync('secret123');
    const result = sync.handleWebhook('{}', 'wrongtoken');
    expect(result.accepted).toBe(false);
  });

  it('ignores non-issue events', () => {
    const { sync } = makeSync();
    const result = sync.handleWebhook(JSON.stringify({ object_kind: 'push' }), undefined);
    expect(result.accepted).toBe(true);
    expect(result.action).toBe('ignored');
  });
});

// ── HTTP API ──────────────────────────────────────────────────────────────────

describe('BacklogService HTTP API', () => {
  let url: string;
  let server: http.Server;
  let svc: BacklogService;

  beforeEach(async () => {
    svc = makeBacklog(new FactMatrixService());
    ({ url, server } = await startServer(svc));
  });

  afterEach(done => { server.close(done); });

  it('POST /api/hub/backlog creates an item', async () => {
    const res = await httpCall(`${url}/api/hub/backlog`, 'POST', { title: 'New issue', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item.title).toBe('New issue');
  });

  it('POST /api/hub/backlog rejects missing title', async () => {
    const res = await httpCall(`${url}/api/hub/backlog`, 'POST', { priority: 'high' });
    expect(res.status).toBe(422);
  });

  it('GET /api/hub/backlog lists items', async () => {
    svc.create({ title: 'A' });
    svc.create({ title: 'B' });
    const res = await httpCall(`${url}/api/hub/backlog`, 'GET');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
  });

  it('GET /api/hub/backlog/stats returns counts', async () => {
    svc.create({ title: 'Item' });
    const res = await httpCall(`${url}/api/hub/backlog/stats`, 'GET');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.open).toBe(1);
  });

  it('GET /api/hub/backlog/:id returns item', async () => {
    const item = svc.create({ title: 'Detail' });
    const res = await httpCall(`${url}/api/hub/backlog/${item.id}`, 'GET');
    expect(res.status).toBe(200);
    expect(res.body.item.id).toBe(item.id);
    expect(res.body.related).toBeDefined();
  });

  it('GET /api/hub/backlog/:id 404 for missing', async () => {
    const res = await httpCall(`${url}/api/hub/backlog/bklg_nope`, 'GET');
    expect(res.status).toBe(404);
  });

  it('PATCH /api/hub/backlog/:id updates item', async () => {
    const item = svc.create({ title: 'Old' });
    const res = await httpCall(`${url}/api/hub/backlog/${item.id}`, 'PATCH', { title: 'New', priority: 'critical' });
    expect(res.status).toBe(200);
    expect(res.body.item.title).toBe('New');
    expect(res.body.item.priority).toBe('critical');
  });

  it('POST /api/hub/backlog/:id/close closes item', async () => {
    const item = svc.create({ title: 'Close me' });
    const res = await httpCall(`${url}/api/hub/backlog/${item.id}/close`, 'POST');
    expect(res.status).toBe(200);
    expect(res.body.item.status).toBe('closed');
  });

  it('POST /api/hub/backlog/:id/link adds a graph ref', async () => {
    const item = svc.create({ title: 'Link target' });
    const res = await httpCall(`${url}/api/hub/backlog/${item.id}/link`, 'POST', { kind: 'news', refId: 'news_abc' });
    expect(res.status).toBe(200);
    expect(res.body.item.graphRefs).toHaveLength(1);
  });

  it('POST /api/hub/backlog/:id/link rejects bad kind', async () => {
    const item = svc.create({ title: 'Bad link' });
    const res = await httpCall(`${url}/api/hub/backlog/${item.id}/link`, 'POST', { kind: 'banana', refId: 'x' });
    expect(res.status).toBe(422);
  });
});
