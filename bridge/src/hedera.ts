/**
 * bridge/src/hedera.ts
 * Hedera Hashgraph integration for MOLGANG NFT verification
 *
 * Used to:
 *   1. Verify player NFT ownership via Mirror Node API (no SDK needed)
 *   2. Check HTS token balances (MolToken)
 *   3. Mint NFTs for molecule registrations (via REST API)
 *
 * Mirror Node REST API — no SDK required in Workers.
 * Testnet: https://testnet.mirrornode.hedera.com/api/v1
 * Mainnet: https://mainnet-public.mirrornode.hedera.com/api/v1
 */

const MIRROR_BASE = "https://testnet.mirrornode.hedera.com/api/v1";
const MOLTOKEN_ID = "0.0.XXXXXXX";  // Replace with real HTS token ID after minting

// ── Rate limit handling ────────────────────────────────────────────────────────

const RETRY_DELAYS = [500, 1500, 3000];

async function mirrorFetch<T>(path: string): Promise<T | null> {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const res = await fetch(`${MIRROR_BASE}${path}`);

    if (res.status === 429) {
      // Rate limited — wait and retry
      if (attempt < RETRY_DELAYS.length) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      console.warn("[hedera] Rate limit hit, giving up");
      return null;
    }

    if (!res.ok) {
      console.warn(`[hedera] Mirror Node error ${res.status} for ${path}`);
      return null;
    }

    return res.json() as T;
  }
  return null;
}

// ── NFT Ownership verification ────────────────────────────────────────────────

export interface HederaNFT {
  token_id: string;
  serial_number: number;
  account_id: string;
  metadata: string;  // base64 encoded JSON
}

/**
 * Fetch all NFTs owned by a Hedera account.
 * Returns array of owned NFTs with metadata.
 */
export async function getNFTsForAccount(accountId: string): Promise<HederaNFT[]> {
  interface MirrorResponse {
    nfts: HederaNFT[];
    links: { next?: string };
  }

  const result: HederaNFT[] = [];
  let path = `/tokens/${MOLTOKEN_ID}/nfts?account.id=${accountId}&limit=100`;

  while (path) {
    const data = await mirrorFetch<MirrorResponse>(path);
    if (!data) break;

    result.push(...data.nfts);

    // Pagination
    if (data.links?.next) {
      path = data.links.next.replace(MIRROR_BASE, "");
    } else {
      break;
    }
  }

  return result;
}

// ── HTS Token balance ─────────────────────────────────────────────────────────

export interface TokenBalance {
  account: string;
  balance: number;
}

/**
 * Get a player's MolToken (HTS) balance.
 */
export async function getMolTokenBalance(accountId: string): Promise<number> {
  interface BalanceResponse {
    balances: TokenBalance[];
  }

  const data = await mirrorFetch<BalanceResponse>(
    `/tokens/${MOLTOKEN_ID}/balances?account.id=${accountId}`
  );

  if (!data || !data.balances.length) return 0;
  return data.balances[0].balance;
}

// ── NFT Metadata decoding ─────────────────────────────────────────────────────

export interface MolNFTMetadata {
  name: string;           // e.g. "H2O"
  molecule: string;       // molecule identifier
  registeredAt: number;   // unix timestamp
  playerId: string;       // Roblox player ID
  playerName: string;
  atoms: { z: number; count: number }[];
}

/**
 * Decode base64 NFT metadata from Mirror Node response.
 */
export function decodeNFTMetadata(b64: string): MolNFTMetadata | null {
  try {
    const json = atob(b64);
    return JSON.parse(json) as MolNFTMetadata;
  } catch {
    return null;
  }
}

// ── IPFS metadata fetch via Pinata gateway ────────────────────────────────────

/**
 * Fetch full NFT metadata from IPFS (via Pinata public gateway).
 * Falls back to direct decode if metadata is inline.
 */
export async function fetchIPFSMetadata(cid: string): Promise<unknown | null> {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];

  for (const url of gateways) {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      return res.json();
    }
  }

  return null;
}

// ── Account lookup ────────────────────────────────────────────────────────────

/**
 * Check if a Hedera account ID is valid and active.
 */
export async function accountExists(accountId: string): Promise<boolean> {
  interface AccountResponse {
    account: string;
    balance: { balance: number };
  }

  const data = await mirrorFetch<AccountResponse>(`/accounts/${accountId}`);
  return data !== null && !!data.account;
}
