// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * AnchorRegistry — event-only anchoring of P2P knowledge-graph state roots.
 *
 * Design (from the Newsgroup 2.0 whitepaper technical foundation):
 *   - NO storage writes: the Anchored event in the transaction log is the
 *     proof. Event-log gas is far cheaper than SSTORE — at low base fee
 *     (~0.37 gwei) an anchor transaction costs well under a cent on Ethereum.
 *   - The chain timestamp is an UPPER BOUND only ("this root existed before
 *     block N"). Fine-grained ordering comes from agent-signed HLC timestamps
 *     inside the graph itself, not from the chain.
 *   - Deployed on Ethereum (hourly cadence) and Tron (15-minute cadence).
 *     Bitcoin anchoring goes through OpenTimestamps instead (free).
 *
 * The root is the deterministic sorted-key Merkle root over all graph nodes
 * (see src/integrations/lightrag/graph-state-root.ts, sha256-merkle-v1).
 */
contract AnchorRegistry {
    /// Emitted for every anchored graph state root.
    /// `root` and `publisher` are indexed so light clients can filter
    /// on either the specific root or the publishing agent.
    event Anchored(bytes32 indexed root, uint256 timestamp, address indexed publisher);

    /// Anchor a graph state root. Costs only event-log gas (no storage).
    function anchor(bytes32 root) external {
        emit Anchored(root, block.timestamp, msg.sender);
    }

    /// Anchor several roots in one transaction (e.g. catch-up after downtime).
    /// Bounded to 64 roots to keep the transaction within sane gas limits.
    function anchorBatch(bytes32[] calldata roots) external {
        require(roots.length <= 64, "batch too large");
        for (uint256 i = 0; i < roots.length; i++) {
            emit Anchored(roots[i], block.timestamp, msg.sender);
        }
    }
}
