/**
 * Chain Anchoring Service
 *
 * Periodically anchors the deterministic graph state root on-chain via the
 * AnchorRegistry contract (contracts/AnchorRegistry.sol). Asymmetric cadence
 * per the whitepaper cost analysis:
 *
 *   - Tron:     every 15 min  (~$0.05–1.00 per anchor)
 *   - Ethereum: every 60 min  (event-log only, sub-cent at 0.37 gwei)
 *   - Bitcoin:  via OpenTimestamps calendar aggregation (free — see
 *               opentimestamps.ts), not via this module.
 *
 * Trust model: the chain timestamp is an UPPER BOUND ("root existed before
 * block N"). Fine-grained event ordering lives in agent-signed HLC
 * timestamps inside the graph (hlc.ts) — never claim "nanosecond
 * chain-timestamps".
 *
 * Signing is pluggable: this module builds the exact calldata and JSON-RPC
 * payloads, but transaction signing requires secp256k1 (no dependency
 * available in-repo). Provide an AnchorSigner (e.g. a thin wrapper around a
 * remote signer or an ethers wallet in the deploy environment) or run in
 * dry-run mode where anchor intents are recorded in the graph only.
 *
 * REST (registerAnchorRoutes):
 *   GET  /api/anchor/status   — scheduler state + recent anchors
 *   POST /api/anchor/now      — force an immediate anchor round
 *   GET  /api/anchor/history  — anchor records from the graph
 */

import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from '../lightrag/client';
import { computeGraphStateRoot, GraphStateRoot } from '../lightrag/graph-state-root';
import { functionSelector, eventTopic } from './keccak';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type ChainName = 'ethereum' | 'tron' | string;

export interface ChainTarget {
  chain: ChainName;
  rpcUrl: string;                 // JSON-RPC endpoint (Sepolia / Nile testnet etc.)
  contractAddress: string;        // deployed AnchorRegistry address
  intervalMs: number;             // anchoring cadence
  chainId?: number;               // EIP-155 chain id (11155111 = Sepolia)
}

export interface AnchorRecord {
  id: string;
  chain: ChainName;
  root: string;                   // 64-char hex graph state root
  nodeCount: number;
  txHash?: string;                // present when actually broadcast
  status: 'dry-run' | 'submitted' | 'failed';
  error?: string;
  anchoredAt: string;             // ISO timestamp (local clock, NOT chain time)
}

/**
 * Pluggable transaction signer. Implementations sign an EIP-155 transaction
 * to `to` with `data` and return the raw signed tx hex for broadcast.
 */
export interface AnchorSigner {
  signAnchorTx(params: {
    chainId: number;
    to: string;
    data: string;
    nonce: number;
    gasPriceWei: bigint;
  }): Promise<string>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Calldata / RPC payload builders (pure — fully testable offline)
// ──────────────────────────────────────────────────────────────────────────────

/** 4-byte selector for anchor(bytes32), computed from the ABI signature. */
export function anchorSelector(): string {
  return functionSelector('anchor(bytes32)');
}

/** topic0 for the Anchored(bytes32,uint256,address) event. */
export function anchoredEventTopic(): string {
  return eventTopic('Anchored(bytes32,uint256,address)');
}

/**
 * ABI-encode the anchor(bytes32) call for a graph state root.
 * Accepts the 64-char hex root (with or without 0x prefix).
 */
export function buildAnchorCalldata(root: string): string {
  const clean = root.replace(/^0x/, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error(`Invalid root: expected 32-byte hex, got "${root}"`);
  }
  return anchorSelector() + clean;
}

/** Build the eth_sendRawTransaction JSON-RPC request body. */
export function buildSendRawTxRequest(rawTxHex: string, id = 1): object {
  return {
    jsonrpc: '2.0',
    id,
    method: 'eth_sendRawTransaction',
    params: [rawTxHex.startsWith('0x') ? rawTxHex : `0x${rawTxHex}`],
  };
}

/**
 * Build an eth_getLogs request to find anchor events for a specific root
 * (or all roots when omitted) emitted by the registry contract.
 */
export function buildGetAnchorLogsRequest(
  contractAddress: string,
  root?: string,
  fromBlock = 'earliest',
  id = 1,
): object {
  const topics: Array<string | null> = [anchoredEventTopic()];
  if (root) topics.push('0x' + root.replace(/^0x/, '').toLowerCase());
  return {
    jsonrpc: '2.0',
    id,
    method: 'eth_getLogs',
    params: [{ address: contractAddress, topics, fromBlock, toBlock: 'latest' }],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Anchor service
// ──────────────────────────────────────────────────────────────────────────────

export class AnchorService {
  private lightrag: LightRAGClient;
  private targets: ChainTarget[];
  private signer?: AnchorSigner;
  private timers: NodeJS.Timeout[] = [];
  private history: AnchorRecord[] = [];
  private seq = 0;
  private lastRootByChain = new Map<ChainName, string>();

  constructor(lightrag: LightRAGClient, targets: ChainTarget[], signer?: AnchorSigner) {
    this.lightrag = lightrag;
    this.targets = targets;
    this.signer = signer;
  }

  /** Start the per-chain anchoring schedulers. */
  start(): void {
    for (const target of this.targets) {
      const t = setInterval(() => {
        this.anchorOnce(target).catch(e =>
          logger.warn(`anchor ${target.chain}: ${e.message}`));
      }, target.intervalMs);
      t.unref?.();
      this.timers.push(t);
    }
    logger.info(`✓ AnchorService started (${this.targets.map(t => `${t.chain}@${t.intervalMs / 60000}min`).join(', ')})`);
  }

  stop(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  /**
   * One anchoring round for a chain target: compute the state root,
   * skip if unchanged since the last anchor (saves gas on idle graphs),
   * then sign + broadcast (or record a dry-run intent).
   */
  async anchorOnce(target: ChainTarget): Promise<AnchorRecord | null> {
    const stateRoot: GraphStateRoot = await computeGraphStateRoot(this.lightrag);

    if (this.lastRootByChain.get(target.chain) === stateRoot.root) {
      logger.debug(`anchor ${target.chain}: root unchanged, skipping`);
      return null;
    }

    const record: AnchorRecord = {
      id: `anchor_${Date.now()}_${this.seq++}`,
      chain: target.chain,
      root: stateRoot.root,
      nodeCount: stateRoot.nodeCount,
      status: 'dry-run',
      anchoredAt: new Date().toISOString(),
    };

    if (this.signer && target.chainId !== undefined) {
      try {
        const calldata = buildAnchorCalldata(stateRoot.root);
        const rawTx = await this.signer.signAnchorTx({
          chainId: target.chainId,
          to: target.contractAddress,
          data: calldata,
          nonce: await this.fetchNonce(target),
          gasPriceWei: await this.fetchGasPrice(target),
        });
        record.txHash = await this.broadcast(target, rawTx);
        record.status = 'submitted';
      } catch (e: any) {
        record.status = 'failed';
        record.error = e.message;
        logger.warn(`anchor ${target.chain} failed: ${e.message}`);
      }
    }

    this.lastRootByChain.set(target.chain, stateRoot.root);
    this.history.push(record);
    if (this.history.length > 500) this.history.shift();
    await this.persistRecord(record);

    logger.info(`⚓ Anchored ${stateRoot.root.substring(0, 12)}… on ${target.chain} (${record.status})`);
    return record;
  }

  /** Run one round on every configured chain (used by POST /api/anchor/now). */
  async anchorAll(): Promise<AnchorRecord[]> {
    const out: AnchorRecord[] = [];
    for (const target of this.targets) {
      const rec = await this.anchorOnce(target);
      if (rec) out.push(rec);
    }
    return out;
  }

  getHistory(): AnchorRecord[] {
    return [...this.history];
  }

  getStatus(): object {
    return {
      running: this.timers.length > 0,
      mode: this.signer ? 'signing' : 'dry-run',
      targets: this.targets.map(t => ({
        chain: t.chain,
        intervalMin: t.intervalMs / 60000,
        contract: t.contractAddress,
        lastRoot: this.lastRootByChain.get(t.chain) ?? null,
      })),
      totalAnchors: this.history.length,
    };
  }

  // ── JSON-RPC helpers ────────────────────────────────────────────────────────

  private async rpc(target: ChainTarget, method: string, params: unknown[]): Promise<any> {
    const res = await fetch(target.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const body: any = await res.json();
    if (body.error) throw new Error(`${method}: ${body.error.message}`);
    return body.result;
  }

  private async fetchNonce(target: ChainTarget): Promise<number> {
    if (!this.signer) throw new Error('no signer');
    // Signer address discovery is signer-specific; transaction count for the
    // zero address is a placeholder until a signer with getAddress() lands.
    const addr = (this.signer as any).address ?? '0x0000000000000000000000000000000000000000';
    const hex = await this.rpc(target, 'eth_getTransactionCount', [addr, 'pending']);
    return parseInt(hex, 16);
  }

  private async fetchGasPrice(target: ChainTarget): Promise<bigint> {
    const hex = await this.rpc(target, 'eth_gasPrice', []);
    return BigInt(hex);
  }

  private async broadcast(target: ChainTarget, rawTx: string): Promise<string> {
    return this.rpc(target, 'eth_sendRawTransaction', [rawTx.startsWith('0x') ? rawTx : `0x${rawTx}`]);
  }

  /** Record the anchor in the knowledge graph (offline-safe). */
  private async persistRecord(record: AnchorRecord): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(record.id, 'AnchorRecord', {
        ...record,
        content: `Anchor ${record.root.substring(0, 16)} on ${record.chain} (${record.status})`,
      });
    } catch (e: any) {
      logger.warn(`anchor persist: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Default targets (testnets — Sepolia + Tron Nile)
// ──────────────────────────────────────────────────────────────────────────────

export function defaultAnchorTargets(): ChainTarget[] {
  return [
    {
      chain: 'ethereum',
      rpcUrl: process.env.ETH_RPC_URL ?? 'https://rpc.sepolia.org',
      contractAddress: process.env.ETH_ANCHOR_CONTRACT ?? '0x0000000000000000000000000000000000000000',
      intervalMs: 60 * 60 * 1000, // hourly — event-log sub-cent at low base fee
      chainId: Number(process.env.ETH_CHAIN_ID ?? 11155111), // Sepolia
    },
    {
      chain: 'tron',
      rpcUrl: process.env.TRON_RPC_URL ?? 'https://nile.trongrid.io/jsonrpc',
      contractAddress: process.env.TRON_ANCHOR_CONTRACT ?? '0x0000000000000000000000000000000000000000',
      intervalMs: 15 * 60 * 1000, // 15 min — ~$0.05–1.00 per anchor
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

export function registerAnchorRoutes(app: Express, service: AnchorService): void {

  app.get('/api/anchor/status', (_req: Request, res: Response): void => {
    res.json({ success: true, ...service.getStatus() });
  });

  app.post('/api/anchor/now', async (_req: Request, res: Response): Promise<void> => {
    try {
      const records = await service.anchorAll();
      res.json({ success: true, anchored: records.length, records });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/anchor/history', (_req: Request, res: Response): void => {
    const history = service.getHistory();
    res.json({ success: true, count: history.length, history: history.slice(-100) });
  });

  logger.info('✓ Anchor API registered (/api/anchor/*)');
}
