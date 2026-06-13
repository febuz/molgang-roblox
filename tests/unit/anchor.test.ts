/**
 * Unit tests for anchor.ts — chain anchoring service.
 * All tests offline: no Neo4j, no RPC calls (dry-run mode, offline client).
 */

import {
  AnchorService,
  buildAnchorCalldata,
  buildSendRawTxRequest,
  buildGetAnchorLogsRequest,
  anchorSelector,
  anchoredEventTopic,
  defaultAnchorTargets,
  registerAnchorRoutes,
  ChainTarget,
} from '../../src/integrations/chain/anchor';
import { LightRAGClient } from '../../src/integrations/lightrag/client';
import express from 'express';
import http from 'http';

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

const TEST_TARGET: ChainTarget = {
  chain: 'ethereum',
  rpcUrl: 'http://127.0.0.1:1', // never called in dry-run
  contractAddress: '0x1111111111111111111111111111111111111111',
  intervalMs: 60_000,
  chainId: 11155111,
};

async function callRoute(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
  body?: any,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const reqBody = body ? JSON.stringify(body) : '';
      const req = http.request(`http://127.0.0.1:${port}${path}`, {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
      }, (res) => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode ?? 200, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode ?? 200, body: data }); }
        });
      });
      req.on('error', e => { server.close(); reject(e); });
      if (reqBody) req.write(reqBody);
      req.end();
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Calldata builders
// ──────────────────────────────────────────────────────────────────────────────

describe('buildAnchorCalldata', () => {
  const root = 'ab'.repeat(32); // 64 hex chars

  it('concatenates the 4-byte selector with the 32-byte root', () => {
    const data = buildAnchorCalldata(root);
    expect(data).toBe(anchorSelector() + root);
    expect(data).toHaveLength(2 + 8 + 64); // 0x + selector + root
  });

  it('strips an existing 0x prefix from the root', () => {
    expect(buildAnchorCalldata('0x' + root)).toBe(anchorSelector() + root);
  });

  it('lowercases the root', () => {
    expect(buildAnchorCalldata(root.toUpperCase())).toBe(anchorSelector() + root);
  });

  it('throws on a short root', () => {
    expect(() => buildAnchorCalldata('abcd')).toThrow(/Invalid root/);
  });

  it('throws on non-hex characters', () => {
    expect(() => buildAnchorCalldata('zz'.repeat(32))).toThrow(/Invalid root/);
  });
});

describe('RPC request builders', () => {
  it('buildSendRawTxRequest wraps the raw tx with 0x prefix', () => {
    const req: any = buildSendRawTxRequest('f86b80', 7);
    expect(req.method).toBe('eth_sendRawTransaction');
    expect(req.params[0]).toBe('0xf86b80');
    expect(req.id).toBe(7);
  });

  it('buildSendRawTxRequest keeps an existing 0x prefix', () => {
    const req: any = buildSendRawTxRequest('0xf86b80');
    expect(req.params[0]).toBe('0xf86b80');
  });

  it('buildGetAnchorLogsRequest filters on the Anchored topic0', () => {
    const req: any = buildGetAnchorLogsRequest('0xCONTRACT');
    expect(req.method).toBe('eth_getLogs');
    expect(req.params[0].topics[0]).toBe(anchoredEventTopic());
    expect(req.params[0].address).toBe('0xCONTRACT');
  });

  it('buildGetAnchorLogsRequest adds the root as topic1 when given', () => {
    const root = 'cd'.repeat(32);
    const req: any = buildGetAnchorLogsRequest('0xC', root);
    expect(req.params[0].topics[1]).toBe('0x' + root);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// AnchorService (dry-run, offline)
// ──────────────────────────────────────────────────────────────────────────────

describe('AnchorService — dry-run offline', () => {
  let client: LightRAGClient;
  let service: AnchorService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new AnchorService(client, [TEST_TARGET]);
  });

  afterEach(async () => {
    service.stop();
    await client.close();
  });

  it('anchorOnce returns a dry-run record when no signer configured', async () => {
    const rec = await service.anchorOnce(TEST_TARGET);
    expect(rec).not.toBeNull();
    expect(rec!.status).toBe('dry-run');
    expect(rec!.chain).toBe('ethereum');
    expect(rec!.root).toMatch(/^[0-9a-f]{64}$/);
    expect(rec!.txHash).toBeUndefined();
  });

  it('skips anchoring when the root is unchanged', async () => {
    const first = await service.anchorOnce(TEST_TARGET);
    const second = await service.anchorOnce(TEST_TARGET);
    expect(first).not.toBeNull();
    expect(second).toBeNull(); // offline root is constant → skip
  });

  it('anchorAll covers all targets', async () => {
    const records = await service.anchorAll();
    expect(records).toHaveLength(1);
    expect(records[0].chain).toBe('ethereum');
  });

  it('getHistory accumulates records', async () => {
    await service.anchorOnce(TEST_TARGET);
    expect(service.getHistory()).toHaveLength(1);
  });

  it('getStatus reports dry-run mode and target config', () => {
    const status: any = service.getStatus();
    expect(status.mode).toBe('dry-run');
    expect(status.running).toBe(false);
    expect(status.targets[0].chain).toBe('ethereum');
    expect(status.targets[0].intervalMin).toBe(1);
  });

  it('start/stop toggles running state', () => {
    service.start();
    expect((service.getStatus() as any).running).toBe(true);
    service.stop();
    expect((service.getStatus() as any).running).toBe(false);
  });
});

describe('defaultAnchorTargets', () => {
  it('configures ethereum hourly and tron at 15 minutes', () => {
    const targets = defaultAnchorTargets();
    const eth = targets.find(t => t.chain === 'ethereum')!;
    const tron = targets.find(t => t.chain === 'tron')!;
    expect(eth.intervalMs).toBe(60 * 60 * 1000);
    expect(tron.intervalMs).toBe(15 * 60 * 1000);
  });

  it('defaults ethereum to Sepolia chain id', () => {
    const eth = defaultAnchorTargets().find(t => t.chain === 'ethereum')!;
    expect(eth.chainId).toBe(11155111);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

describe('Anchor REST API', () => {
  let client: LightRAGClient;
  let service: AnchorService;
  let app: express.Express;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new AnchorService(client, [TEST_TARGET]);
    app = express();
    app.use(express.json());
    registerAnchorRoutes(app, service);
  });

  afterEach(async () => {
    service.stop();
    await client.close();
  });

  it('GET /api/anchor/status returns mode and targets', async () => {
    const { status, body } = await callRoute(app, 'get', '/api/anchor/status');
    expect(status).toBe(200);
    expect(body.mode).toBe('dry-run');
  });

  it('POST /api/anchor/now anchors all targets', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/anchor/now');
    expect(status).toBe(200);
    expect(body.anchored).toBe(1);
    expect(body.records[0].status).toBe('dry-run');
  });

  it('GET /api/anchor/history returns past anchors', async () => {
    await callRoute(app, 'post', '/api/anchor/now');
    const { body } = await callRoute(app, 'get', '/api/anchor/history');
    expect(body.count).toBe(1);
  });
});
