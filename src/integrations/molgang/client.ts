/**
 * Molgang HTTP client — lets VirtualPC agents play the Molgang chemistry game
 * running at https://5mart.ml/molgang (or any other Molgang PHP host).
 *
 * The client is intentionally thin: it mirrors the public `/api/*` routes and
 * returns the raw JSON so that MCP tools stay stateless.
 */

import logger from '../../utils/logger';

const BASE_URL = (process.env.MOLGANG_URL || 'https://5mart.ml/molgang').replace(/\/$/, '');

async function post(path: string, body: Record<string, unknown>): Promise<unknown> {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    logger.warn(`molgang POST ${path} failed: ${res.status} ${text}`);
    throw new Error(`Molgang error ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function get(path: string): Promise<unknown> {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    logger.warn(`molgang GET ${path} failed: ${res.status} ${text}`);
    throw new Error(`Molgang error ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function join(name: string, avatar?: string, device?: string): Promise<unknown> {
  return post('/join', { name, avatar, device });
}

export async function sit(sid: string, table: string): Promise<unknown> {
  return post('/sit', { sid, table });
}

export async function propose(sid: string, term: string): Promise<unknown> {
  return post('/propose', { sid, term });
}

export async function vote(sid: string, pid: string, verdict: 'confirm' | 'reject' = 'confirm'): Promise<unknown> {
  return post('/vote', { sid, pid, verdict });
}

export async function state(sid?: string): Promise<unknown> {
  return get(sid ? `/state?sid=${encodeURIComponent(sid)}` : '/state');
}

export async function web(): Promise<unknown> {
  return get('/web');
}

export async function suggested(): Promise<unknown> {
  return get('/suggested');
}
