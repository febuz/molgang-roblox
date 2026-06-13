/**
 * Unit tests for opentimestamps.ts — calendar submission with mocked fetch.
 * No real network calls: global.fetch is stubbed per test.
 */

import {
  OtsService,
  submitToCalendar,
  stampDigest,
  DEFAULT_CALENDARS,
  registerOtsRoutes,
} from '../../src/integrations/chain/opentimestamps';
import { LightRAGClient } from '../../src/integrations/lightrag/client';
import express from 'express';
import http from 'http';

const VALID_DIGEST = 'ab'.repeat(32);

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

function mockFetchOk(proofBytes = Buffer.from('proof-bytes')): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => proofBytes.buffer.slice(proofBytes.byteOffset, proofBytes.byteOffset + proofBytes.byteLength),
  });
}

function mockFetchFail(status = 500): jest.Mock {
  return jest.fn().mockResolvedValue({ ok: false, status, arrayBuffer: async () => new ArrayBuffer(0) });
}

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

async function callRoute(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const req = http.request(`http://127.0.0.1:${port}${path}`, { method: method.toUpperCase() }, (res) => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode ?? 200, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode ?? 200, body: data }); }
        });
      });
      req.on('error', e => { server.close(); reject(e); });
      req.end();
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// submitToCalendar
// ──────────────────────────────────────────────────────────────────────────────

describe('submitToCalendar', () => {
  it('POSTs the raw digest bytes to <calendar>/digest', async () => {
    const fetchMock = mockFetchOk();
    global.fetch = fetchMock as any;
    await submitToCalendar('https://cal.example.com', VALID_DIGEST);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://cal.example.com/digest');
    expect(opts.method).toBe('POST');
    expect(Buffer.isBuffer(opts.body)).toBe(true);
    expect(opts.body.toString('hex')).toBe(VALID_DIGEST);
  });

  it('strips a trailing slash from the calendar URL', async () => {
    const fetchMock = mockFetchOk();
    global.fetch = fetchMock as any;
    await submitToCalendar('https://cal.example.com/', VALID_DIGEST);
    expect(fetchMock.mock.calls[0][0]).toBe('https://cal.example.com/digest');
  });

  it('returns the proof bytes from the calendar', async () => {
    global.fetch = mockFetchOk(Buffer.from('ots-proof')) as any;
    const proof = await submitToCalendar('https://cal.example.com', VALID_DIGEST);
    expect(proof.toString()).toBe('ots-proof');
  });

  it('accepts a 0x-prefixed digest', async () => {
    const fetchMock = mockFetchOk();
    global.fetch = fetchMock as any;
    await submitToCalendar('https://cal.example.com', '0x' + VALID_DIGEST);
    expect(fetchMock.mock.calls[0][1].body.toString('hex')).toBe(VALID_DIGEST);
  });

  it('throws on an invalid digest before any network call', async () => {
    const fetchMock = mockFetchOk();
    global.fetch = fetchMock as any;
    await expect(submitToCalendar('https://cal.example.com', 'tooshort')).rejects.toThrow(/Invalid digest/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the calendar returns a non-2xx status', async () => {
    global.fetch = mockFetchFail(503) as any;
    await expect(submitToCalendar('https://cal.example.com', VALID_DIGEST)).rejects.toThrow(/503/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// stampDigest — multi-calendar aggregation
// ──────────────────────────────────────────────────────────────────────────────

describe('stampDigest', () => {
  it('submits to all calendars in parallel and records each proof', async () => {
    global.fetch = mockFetchOk() as any;
    const proofs = await stampDigest(VALID_DIGEST, ['https://a.example', 'https://b.example']);
    expect(proofs).toHaveLength(2);
    expect(proofs.every(p => p.proofBase64)).toBe(true);
  });

  it('records per-calendar errors without failing the whole stamp', async () => {
    let call = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      call++;
      if (call === 1) return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) };
      return { ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0) };
    }) as any;
    const proofs = await stampDigest(VALID_DIGEST, ['https://a.example', 'https://b.example']);
    const ok = proofs.filter(p => p.proofBase64);
    const failed = proofs.filter(p => p.error);
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
  });

  it('defaults to the four public OpenTimestamps calendars', () => {
    expect(DEFAULT_CALENDARS).toHaveLength(4);
    expect(DEFAULT_CALENDARS.every(c => c.startsWith('https://'))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// OtsService
// ──────────────────────────────────────────────────────────────────────────────

describe('OtsService', () => {
  let client: LightRAGClient;
  let service: OtsService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new OtsService(client, ['https://a.example', 'https://b.example']);
  });

  afterEach(async () => { await client.close(); });

  it('stampCurrentRoot → pending when all calendars accept', async () => {
    global.fetch = mockFetchOk() as any;
    const stamp = await service.stampCurrentRoot();
    expect(stamp.status).toBe('pending');
    expect(stamp.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(stamp.proofs).toHaveLength(2);
  });

  it('stampCurrentRoot → partial when only some calendars accept', async () => {
    let call = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      call++;
      if (call === 1) return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) };
      return { ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0) };
    }) as any;
    const stamp = await service.stampCurrentRoot();
    expect(stamp.status).toBe('partial');
  });

  it('stampCurrentRoot → failed when no calendar accepts', async () => {
    global.fetch = mockFetchFail() as any;
    const stamp = await service.stampCurrentRoot();
    expect(stamp.status).toBe('failed');
  });

  it('getStamps/getStamp return stored stamps', async () => {
    global.fetch = mockFetchOk() as any;
    const stamp = await service.stampCurrentRoot();
    expect(service.getStamps()).toHaveLength(1);
    expect(service.getStamp(stamp.id)?.id).toBe(stamp.id);
    expect(service.getStamp('nope')).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────────────────────────────────────

describe('OTS REST API', () => {
  let client: LightRAGClient;
  let app: express.Express;

  beforeEach(() => {
    client = makeOfflineClient();
    const service = new OtsService(client, ['https://a.example']);
    app = express();
    registerOtsRoutes(app, service);
  });

  afterEach(async () => { await client.close(); });

  it('POST /api/ots/stamp creates a stamp', async () => {
    global.fetch = mockFetchOk() as any;
    const { status, body } = await callRoute(app, 'post', '/api/ots/stamp');
    expect(status).toBe(201);
    expect(body.stamp.status).toBe('pending');
  });

  it('GET /api/ots/stamps lists stamps', async () => {
    global.fetch = mockFetchOk() as any;
    await callRoute(app, 'post', '/api/ots/stamp');
    const { body } = await callRoute(app, 'get', '/api/ots/stamps');
    expect(body.count).toBe(1);
  });

  it('GET /api/ots/stamps/:id returns 404 for unknown id', async () => {
    const { status } = await callRoute(app, 'get', '/api/ots/stamps/nope');
    expect(status).toBe(404);
  });
});
