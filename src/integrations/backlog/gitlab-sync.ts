/**
 * GitLab Issues ↔ Backlog bidirectional sync
 *
 * Pulls GitLab Issues into the BacklogService and pushes local items out.
 * All HTTP calls use the built-in `node:https` module — no new dependencies.
 *
 * Auth:  GITLAB_TOKEN env var (Personal Access Token or Project Access Token)
 * Scope: GITLAB_PROJECT_ID — numeric project ID (found in Project Settings)
 *        GITLAB_BASE_URL   — defaults to https://gitlab.com
 *
 * Rate limits: GitLab allows 2 000 requests / min for authenticated users.
 * Pull uses pagination (per_page=100); we abort after 50 pages.
 *
 * Webhook verification: compare X-Gitlab-Token header with GITLAB_WEBHOOK_SECRET.
 * If the secret is not set, verification is skipped (dev mode).
 *
 * REST (registerGitLabSyncRoutes):
 *   POST /api/hub/sync/gitlab          — trigger manual pull
 *   POST /api/hub/sync/gitlab/push     — push unsynced local items to GitLab
 *   POST /api/hub/webhooks/gitlab      — receive GitLab issue events
 */

import { request as httpsRequest } from 'node:https';
import type { IncomingMessage } from 'node:http';
import type { Express, Request, Response } from 'express';
import type { BacklogService, BacklogPriority } from '../lightrag/backlog';
import logger from '../../utils/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GitLabSyncOptions {
  token: string;
  projectId: string;
  baseUrl?: string;      // default: https://gitlab.com
  webhookSecret?: string;
  maxPages?: number;     // default: 50
}

export interface GitLabSyncStats {
  pulls: number;
  created: number;
  updated: number;
  pushed: number;
  errors: number;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
}

// ── Label → priority ──────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<string, BacklogPriority> = {
  critical: 'critical',
  urgent: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

function labelsToPriority(labels: string[]): BacklogPriority {
  for (const l of labels) {
    const p = PRIORITY_LABELS[l.toLowerCase()];
    if (p) return p;
  }
  return 'medium';
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function glRequest(opts: {
  token: string;
  hostname: string;
  method: string;
  path: string;
  body?: unknown;
}): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const payload = opts.body ? JSON.stringify(opts.body) : undefined;
    const req = httpsRequest(
      {
        hostname: opts.hostname,
        path: opts.path,
        method: opts.method,
        headers: {
          'PRIVATE-TOKEN': opts.token,
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
          } catch {
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

// ── GitLabBacklogSync ─────────────────────────────────────────────────────────

export class GitLabBacklogSync {
  private readonly hostname: string;
  private readonly stats: GitLabSyncStats = {
    pulls: 0, created: 0, updated: 0, pushed: 0, errors: 0,
    lastPulledAt: null, lastPushedAt: null,
  };

  constructor(
    private readonly opts: GitLabSyncOptions,
    private readonly backlog: BacklogService,
  ) {
    const base = opts.baseUrl ?? 'https://gitlab.com';
    // Strip protocol prefix for https.request hostname
    this.hostname = base.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  private apiPath(suffix: string): string {
    return `/api/v4/projects/${encodeURIComponent(this.opts.projectId)}/issues${suffix}`;
  }

  // ── Pull GitLab Issues → BacklogService ─────────────────────────────────────

  async pull(state: 'opened' | 'closed' | 'all' = 'opened'): Promise<{ created: number; updated: number }> {
    let created = 0, updated = 0;
    const maxPages = this.opts.maxPages ?? 50;

    for (let page = 1; page <= maxPages; page++) {
      let res;
      try {
        res = await glRequest({
          token: this.opts.token,
          hostname: this.hostname,
          method: 'GET',
          path: this.apiPath(`?state=${state}&per_page=100&page=${page}&scope=all`),
        });
      } catch (e: any) {
        logger.warn(`gitlab-sync: pull page ${page} failed: ${e.message}`);
        this.stats.errors += 1;
        break;
      }

      if (res.status === 403 || res.status === 401) {
        logger.warn(`gitlab-sync: auth error ${res.status}`);
        this.stats.errors += 1;
        break;
      }

      const issues = Array.isArray(res.body) ? (res.body as any[]) : [];
      if (issues.length === 0) break;

      for (const issue of issues) {
        const labels: string[] = Array.isArray(issue.labels) ? issue.labels.map(String) : [];
        const { item, created: wasCreated } = this.backlog.upsertExternal(
          'gitlab',
          String(issue.iid),
          {
            title: String(issue.title ?? ''),
            body: String(issue.description ?? ''),
            priority: labelsToPriority(labels),
            labels,
            assignee: issue.assignee?.username,
            externalUrl: issue.web_url,
            closed: issue.state === 'closed',
          },
        );
        void item;
        if (wasCreated) created++;
        else updated++;
      }

      if (issues.length < 100) break;
    }

    this.stats.pulls += 1;
    this.stats.created += created;
    this.stats.updated += updated;
    this.stats.lastPulledAt = new Date().toISOString();
    logger.info(`gitlab-sync: pull done — ${created} created, ${updated} updated`);
    return { created, updated };
  }

  // ── Push local items → GitLab Issues ────────────────────────────────────────

  async push(): Promise<{ pushed: number }> {
    const unsynced = this.backlog.localUnsynced('gitlab');
    let pushed = 0;

    for (const item of unsynced) {
      try {
        const res = await glRequest({
          token: this.opts.token,
          hostname: this.hostname,
          method: 'POST',
          path: this.apiPath(''),
          body: {
            title: item.title,
            description: item.body || undefined,
            labels: [...item.labels, item.priority].join(','),
            ...(item.assignee ? { assignee_ids: [] } : {}),
          },
        });

        if (res.status === 201) {
          const gl = res.body as any;
          this.backlog.registerExternalId(item.id, 'gitlab', String(gl.iid), gl.web_url);
          pushed++;
        } else {
          logger.warn(`gitlab-sync: push item ${item.id} failed with status ${res.status}`);
          this.stats.errors += 1;
        }
      } catch (e: any) {
        logger.warn(`gitlab-sync: push item ${item.id} error: ${e.message}`);
        this.stats.errors += 1;
      }
    }

    this.stats.pushed += pushed;
    this.stats.lastPushedAt = new Date().toISOString();
    logger.info(`gitlab-sync: push done — ${pushed}/${unsynced.length} pushed`);
    return { pushed };
  }

  // ── Webhook handler ──────────────────────────────────────────────────────────

  handleWebhook(rawBody: string, tokenHeader: string | undefined): {
    accepted: boolean;
    action?: string;
  } {
    if (this.opts.webhookSecret) {
      if (tokenHeader !== this.opts.webhookSecret) {
        logger.warn('gitlab-sync: webhook token mismatch');
        return { accepted: false };
      }
    }

    let payload: any;
    try { payload = JSON.parse(rawBody); } catch { return { accepted: false }; }

    if (payload.object_kind !== 'issue') return { accepted: true, action: 'ignored' };

    const issue = payload.object_attributes;
    if (!issue) return { accepted: true, action: 'no-issue' };

    const labels: string[] = (payload.labels ?? []).map((l: any) => String(l.title ?? ''));
    const action: string = String(issue.action ?? 'update');

    switch (action) {
      case 'open':
      case 'update':
      case 'reopen':
        this.backlog.upsertExternal('gitlab', String(issue.iid), {
          title: String(issue.title ?? ''),
          body: String(issue.description ?? ''),
          priority: labelsToPriority(labels),
          labels,
          assignee: payload.assignees?.[0]?.username,
          externalUrl: issue.url,
          closed: false,
        });
        break;
      case 'close':
        this.backlog.upsertExternal('gitlab', String(issue.iid), {
          title: String(issue.title ?? ''),
          body: String(issue.description ?? ''),
          priority: labelsToPriority(labels),
          labels,
          externalUrl: issue.url,
          closed: true,
        });
        break;
      default:
        return { accepted: true, action: `ignored:${action}` };
    }

    return { accepted: true, action };
  }

  getStats(): GitLabSyncStats { return { ...this.stats }; }
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function registerGitLabSyncRoutes(app: Express, sync: GitLabBacklogSync): void {

  app.post('/api/hub/sync/gitlab', async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await sync.pull('opened');
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hub/sync/gitlab/push', async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await sync.push();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hub/webhooks/gitlab', (req: Request, res: Response): void => {
    const tokenHeader = req.headers['x-gitlab-token'] as string | undefined;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const result = sync.handleWebhook(rawBody, tokenHeader);
    res.status(result.accepted ? 200 : 401).json(result);
  });
}

// ── Factory ───────────────────────────────────────────────────────────────────

/** Returns null when GITLAB_TOKEN or GITLAB_PROJECT_ID is not set. */
export function gitLabSyncFromEnv(backlog: BacklogService): GitLabBacklogSync | null {
  const token = process.env.GITLAB_TOKEN;
  const projectId = process.env.GITLAB_PROJECT_ID;
  if (!token || !projectId) return null;
  return new GitLabBacklogSync(
    {
      token,
      projectId,
      baseUrl: process.env.GITLAB_BASE_URL,
      webhookSecret: process.env.GITLAB_WEBHOOK_SECRET,
    },
    backlog,
  );
}
