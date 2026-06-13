/**
 * GitHub Issues ↔ Backlog bidirectional sync
 *
 * Pulls GitHub Issues into the BacklogService and pushes local items out.
 * All HTTP calls use the built-in `node:https` module — no new dependencies.
 *
 * Auth:  GITHUB_TOKEN env var (Personal Access Token or GitHub App token)
 * Scope: {owner}/{repo} — configured at construction time
 *
 * Rate limits: GitHub allows 5 000 authenticated requests / hour.
 * Pull uses pagination (per_page=100); we abort after 50 pages (5 000 issues)
 * to avoid burning the limit in one shot.
 *
 * Webhook verification: HMAC-SHA256 over the raw body with GITHUB_WEBHOOK_SECRET.
 * If the secret is not set, signature verification is skipped (dev mode).
 *
 * REST (registerGitHubSyncRoutes):
 *   POST /api/hub/sync/github          — trigger manual pull
 *   POST /api/hub/sync/github/push     — push unsynced local items to GitHub
 *   POST /api/hub/webhooks/github      — receive GitHub issue events
 */

import { request as httpsRequest } from 'node:https';
import { createHmac } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Express, Request, Response } from 'express';
import type { BacklogService, BacklogPriority } from '../lightrag/backlog';
import logger from '../../utils/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GitHubSyncOptions {
  token: string;
  owner: string;
  repo: string;
  webhookSecret?: string;
  /** Max pages per pull (100 issues/page). Default: 50. */
  maxPages?: number;
}

export interface GitHubSyncStats {
  pulls: number;
  created: number;
  updated: number;
  pushed: number;
  errors: number;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
}

// ── Label → priority mapping ──────────────────────────────────────────────────

const PRIORITY_LABELS: Record<string, BacklogPriority> = {
  critical: 'critical',
  urgent: 'critical',
  high: 'high',
  'high priority': 'high',
  medium: 'medium',
  low: 'low',
  'low priority': 'low',
};

function labelsToPriority(labels: string[]): BacklogPriority {
  for (const l of labels) {
    const p = PRIORITY_LABELS[l.toLowerCase()];
    if (p) return p;
  }
  return 'medium';
}

function priorityToLabel(p: BacklogPriority): string {
  return p;  // labels mirror priority names: 'critical', 'high', 'medium', 'low'
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function ghRequest(opts: {
  token: string;
  method: string;
  path: string;
  body?: unknown;
}): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const payload = opts.body ? JSON.stringify(opts.body) : undefined;
    const req = httpsRequest(
      {
        hostname: 'api.github.com',
        path: opts.path,
        method: opts.method,
        headers: {
          'Authorization': `Bearer ${opts.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'virtualpc-backlog-sync/1.0',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res: IncomingMessage) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            resolve({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : null });
          } catch (e) {
            resolve({ status: res.statusCode ?? 0, body: null });
          }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── GitHubBacklogSync ─────────────────────────────────────────────────────────

export class GitHubBacklogSync {
  private readonly stats: GitHubSyncStats = {
    pulls: 0, created: 0, updated: 0, pushed: 0, errors: 0,
    lastPulledAt: null, lastPushedAt: null,
  };

  constructor(
    private readonly opts: GitHubSyncOptions,
    private readonly backlog: BacklogService,
  ) {}

  // ── Pull GitHub Issues → BacklogService ─────────────────────────────────────

  async pull(state: 'open' | 'closed' | 'all' = 'open'): Promise<{ created: number; updated: number }> {
    let created = 0, updated = 0;
    const maxPages = this.opts.maxPages ?? 50;

    for (let page = 1; page <= maxPages; page++) {
      let res;
      try {
        res = await ghRequest({
          token: this.opts.token,
          method: 'GET',
          path: `/repos/${this.opts.owner}/${this.opts.repo}/issues?state=${state}&per_page=100&page=${page}&filter=all`,
        });
      } catch (e: any) {
        logger.warn(`github-sync: pull page ${page} failed: ${e.message}`);
        this.stats.errors += 1;
        break;
      }

      if (res.status === 403 || res.status === 401) {
        logger.warn(`github-sync: auth error ${res.status}`);
        this.stats.errors += 1;
        break;
      }

      const issues = Array.isArray(res.body) ? (res.body as any[]) : [];
      if (issues.length === 0) break;

      for (const issue of issues) {
        // Skip pull requests (GitHub returns PRs in the issues list)
        if (issue.pull_request) continue;

        const labels: string[] = (issue.labels ?? []).map((l: any) => String(l.name ?? ''));
        const { item, created: wasCreated } = this.backlog.upsertExternal(
          'github',
          String(issue.number),
          {
            title: String(issue.title ?? ''),
            body: String(issue.body ?? ''),
            priority: labelsToPriority(labels),
            labels,
            assignee: issue.assignee?.login,
            externalUrl: issue.html_url,
            closed: issue.state === 'closed',
          },
        );
        void item;
        if (wasCreated) created++;
        else updated++;
      }

      if (issues.length < 100) break;  // last page
    }

    this.stats.pulls += 1;
    this.stats.created += created;
    this.stats.updated += updated;
    this.stats.lastPulledAt = new Date().toISOString();
    logger.info(`github-sync: pull done — ${created} created, ${updated} updated`);
    return { created, updated };
  }

  // ── Push local items → GitHub Issues ────────────────────────────────────────

  async push(): Promise<{ pushed: number }> {
    const unsynced = this.backlog.localUnsynced('github');
    let pushed = 0;

    for (const item of unsynced) {
      try {
        const res = await ghRequest({
          token: this.opts.token,
          method: 'POST',
          path: `/repos/${this.opts.owner}/${this.opts.repo}/issues`,
          body: {
            title: item.title,
            body: item.body || undefined,
            labels: [...item.labels, priorityToLabel(item.priority)],
            ...(item.assignee ? { assignees: [item.assignee] } : {}),
          },
        });

        if (res.status === 201) {
          const gh = res.body as any;
          this.backlog.registerExternalId(item.id, 'github', String(gh.number), gh.html_url);
          pushed++;
        } else {
          logger.warn(`github-sync: push item ${item.id} failed with status ${res.status}`);
          this.stats.errors += 1;
        }
      } catch (e: any) {
        logger.warn(`github-sync: push item ${item.id} error: ${e.message}`);
        this.stats.errors += 1;
      }
    }

    this.stats.pushed += pushed;
    this.stats.lastPushedAt = new Date().toISOString();
    logger.info(`github-sync: push done — ${pushed}/${unsynced.length} pushed`);
    return { pushed };
  }

  // ── Webhook handler ──────────────────────────────────────────────────────────

  handleWebhook(eventType: string, rawBody: string, signature: string | undefined): {
    accepted: boolean;
    action?: string;
  } {
    if (this.opts.webhookSecret && signature) {
      const expected = 'sha256=' + createHmac('sha256', this.opts.webhookSecret).update(rawBody).digest('hex');
      if (expected !== signature) {
        logger.warn('github-sync: webhook signature mismatch');
        return { accepted: false };
      }
    }

    if (eventType !== 'issues') return { accepted: true, action: 'ignored' };

    let payload: any;
    try { payload = JSON.parse(rawBody); } catch { return { accepted: false }; }

    const { action, issue } = payload;
    if (!issue || typeof issue.number !== 'number') return { accepted: true, action: 'no-issue' };

    const labels: string[] = (issue.labels ?? []).map((l: any) => String(l.name ?? ''));

    switch (action) {
      case 'opened':
      case 'edited':
      case 'labeled':
      case 'unlabeled':
      case 'assigned':
      case 'unassigned':
      case 'reopened':
        this.backlog.upsertExternal('github', String(issue.number), {
          title: String(issue.title ?? ''),
          body: String(issue.body ?? ''),
          priority: labelsToPriority(labels),
          labels,
          assignee: issue.assignee?.login,
          externalUrl: issue.html_url,
          closed: false,
        });
        break;
      case 'closed':
        this.backlog.upsertExternal('github', String(issue.number), {
          title: String(issue.title ?? ''),
          body: String(issue.body ?? ''),
          priority: labelsToPriority(labels),
          labels,
          externalUrl: issue.html_url,
          closed: true,
        });
        break;
      default:
        return { accepted: true, action: `ignored:${action}` };
    }

    return { accepted: true, action };
  }

  getStats(): GitHubSyncStats { return { ...this.stats }; }
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function registerGitHubSyncRoutes(app: Express, sync: GitHubBacklogSync): void {

  app.post('/api/hub/sync/github', async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await sync.pull('open');
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hub/sync/github/push', async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await sync.push();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hub/webhooks/github', (req: Request, res: Response): void => {
    const event = String(req.headers['x-github-event'] ?? '');
    const sig = req.headers['x-hub-signature-256'] as string | undefined;
    // Raw body: Express may have parsed it; fall back to re-serialising
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const result = sync.handleWebhook(event, rawBody, sig);
    res.status(result.accepted ? 200 : 401).json(result);
  });
}

// ── Factory ───────────────────────────────────────────────────────────────────

/** Returns null when GITHUB_TOKEN is not set — sync is opt-in. */
export function gitHubSyncFromEnv(backlog: BacklogService): GitHubBacklogSync | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) return null;
  return new GitHubBacklogSync(
    { token, owner, repo, webhookSecret: process.env.GITHUB_WEBHOOK_SECRET },
    backlog,
  );
}
