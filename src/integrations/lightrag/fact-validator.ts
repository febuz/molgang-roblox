/**
 * P2P Fact-Validation Graph
 *
 * Adds a consensus layer on top of the P2P knowledge graph:
 *
 *   - Any agent can SUBMIT a fact (Decision / Risk / Precedent).
 *   - Any other agent can VALIDATE or CHALLENGE it.
 *   - A fact is CONFIRMED once it reaches a quorum of unique validators
 *     (default: 3) or CONTESTED if challenges ≥ validators.
 *   - All validation events are published to `lightrag.updates` so every
 *     node in the cluster sees the same confirmation state.
 *
 * Storage:
 *   - Facts are stored as typed Neo4j nodes with an extra `validation_state`
 *     property: 'pending' | 'confirmed' | 'contested' | 'rejected'.
 *   - Each VALIDATES / CHALLENGES event creates a FactVote node linked to
 *     the fact with a HAS_VOTE relationship.
 *
 * Usage:
 *   const fv = new FactValidator(lightragClient, kafkaBrokers);
 *   const id = await fv.submit('kai', { type: 'decision', content: '...', ...});
 *   await fv.validate('zip', id);
 *   await fv.challenge('fill', id, 'contradicts precedent P-42');
 *   const state = await fv.getState(id);
 */

import { v4 as uuid } from 'uuid';
import type { LightRAGClient } from './client';
import { bestEffortPublish } from '../kafka/shared';
import logger from '../../utils/logger';

export type ValidationState = 'pending' | 'confirmed' | 'contested' | 'rejected';
export type FactType = 'decision' | 'risk' | 'precedent' | 'context' | 'claim';

export interface FactSubmission {
  type: FactType;
  content: string;
  context?: string;
  affects?: string[];
  metadata?: Record<string, any>;
}

export interface FactVote {
  factId: string;
  voter: string;
  vote: 'validate' | 'challenge';
  reason?: string;
  ts: string;
}

export interface FactState {
  id: string;
  type: FactType;
  content: string;
  submittedBy: string;
  submittedAt: string;
  state: ValidationState;
  validators: string[];
  challengers: string[];
  validationCount: number;
  challengeCount: number;
}

const QUORUM = 3;        // validations needed for CONFIRMED
const REJECT_THRESHOLD = 5; // challenges needed for REJECTED

// In-memory store — survives process lifetime; persisted to Neo4j when online.
const factStore = new Map<string, FactState>();

export class FactValidator {
  private lightrag: LightRAGClient;

  constructor(lightragClient: LightRAGClient) {
    this.lightrag = lightragClient;
  }

  /**
   * Submit a new fact for P2P validation.
   * Returns the fact ID that peers use to vote.
   */
  async submit(agent: string, fact: FactSubmission): Promise<string> {
    const id = `fact_${uuid()}`;
    const state: FactState = {
      id,
      type: fact.type,
      content: fact.content,
      submittedBy: agent,
      submittedAt: new Date().toISOString(),
      state: 'pending',
      validators: [],
      challengers: [],
      validationCount: 0,
      challengeCount: 0,
    };

    factStore.set(id, state);

    // Persist to graph
    await this.lightrag.mergeTypedNode(id, 'Fact', {
      type: fact.type,
      content: fact.content,
      context: fact.context ?? '',
      created_by: agent,
      affects: fact.affects ?? [],
      validation_state: 'pending',
      submitted_at: state.submittedAt,
    });

    // Broadcast to cluster peers
    bestEffortPublish(p => p.publishMemoryUpdate({
      type: 'context',
      content: `fact-submitted:${id} by ${agent}: ${fact.content.substring(0, 80)}`,
      agent,
      affects: fact.affects ?? [],
      metadata: { factId: id, factType: fact.type, validationState: 'pending', ...fact.metadata },
    }));

    logger.info(`Fact submitted: ${id} by ${agent} (${fact.type})`);
    return id;
  }

  /**
   * Cast a VALIDATE vote. Moves state to CONFIRMED when quorum is reached.
   */
  async validate(agent: string, factId: string): Promise<ValidationState> {
    const state = this.requireFact(factId);
    if (state.validators.includes(agent)) {
      logger.debug(`${agent} already validated ${factId}`);
      return state.state;
    }

    state.validators.push(agent);
    state.validationCount++;

    if (state.validationCount >= QUORUM && state.challengeCount < state.validationCount) {
      state.state = 'confirmed';
    } else if (state.challengeCount >= state.validationCount) {
      state.state = 'contested';
    }

    await this.persistVote({ factId, voter: agent, vote: 'validate', ts: new Date().toISOString() });
    await this.persistState(state);
    this.broadcastVote('validate', agent, factId, state.state);

    logger.info(`Fact ${factId} validated by ${agent} → ${state.state} (${state.validationCount}/${QUORUM})`);
    return state.state;
  }

  /**
   * Cast a CHALLENGE vote. Moves state to CONTESTED or REJECTED.
   */
  async challenge(agent: string, factId: string, reason?: string): Promise<ValidationState> {
    const state = this.requireFact(factId);
    if (state.challengers.includes(agent)) {
      logger.debug(`${agent} already challenged ${factId}`);
      return state.state;
    }

    state.challengers.push(agent);
    state.challengeCount++;

    if (state.challengeCount >= REJECT_THRESHOLD) {
      state.state = 'rejected';
    } else if (state.challengeCount >= state.validationCount) {
      state.state = 'contested';
    }

    await this.persistVote({ factId, voter: agent, vote: 'challenge', reason, ts: new Date().toISOString() });
    await this.persistState(state);
    this.broadcastVote('challenge', agent, factId, state.state, reason);

    logger.info(`Fact ${factId} challenged by ${agent} → ${state.state}`);
    return state.state;
  }

  /**
   * Apply an incoming vote received from a remote peer via P2PSync.
   * Called by p2p-sync when it receives a fact-vote metadata payload.
   */
  async applyRemoteVote(vote: FactVote): Promise<void> {
    if (!factStore.has(vote.factId)) {
      logger.debug(`P2P vote for unknown fact ${vote.factId} — skipping`);
      return;
    }
    if (vote.vote === 'validate') {
      await this.validate(vote.voter, vote.factId);
    } else {
      await this.challenge(vote.voter, vote.factId, vote.reason);
    }
  }

  /**
   * Retrieve current validation state of a fact.
   */
  async getState(factId: string): Promise<FactState | null> {
    return factStore.get(factId) ?? null;
  }

  /**
   * List all facts filtered by state.
   */
  listFacts(filterState?: ValidationState): FactState[] {
    const all = Array.from(factStore.values());
    return filterState ? all.filter(f => f.state === filterState) : all;
  }

  /**
   * Summary stats for /api/lightrag/facts endpoint.
   */
  getStats() {
    const counts: Record<ValidationState, number> = {
      pending: 0, confirmed: 0, contested: 0, rejected: 0,
    };
    for (const f of factStore.values()) counts[f.state]++;
    return { total: factStore.size, ...counts };
  }

  // ─────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────

  private requireFact(factId: string): FactState {
    const s = factStore.get(factId);
    if (!s) throw new Error(`Unknown fact: ${factId}`);
    return s;
  }

  private async persistVote(vote: FactVote): Promise<void> {
    const voteId = `vote_${uuid()}`;
    await this.lightrag.mergeTypedNode(voteId, 'FactVote', {
      fact_id: vote.factId,
      voter: vote.voter,
      vote: vote.vote,
      reason: vote.reason ?? '',
      created_by: vote.voter,
      content: `${vote.vote}:${vote.factId}`,
      voted_at: vote.ts,
    });
    await this.lightrag.addEdge(voteId, 'HAS_VOTE', vote.factId);
  }

  private async persistState(state: FactState): Promise<void> {
    await this.lightrag.mergeTypedNode(state.id, 'Fact', {
      validation_state: state.state,
      validation_count: state.validationCount,
      challenge_count: state.challengeCount,
      validators: state.validators,
      challengers: state.challengers,
      content: state.content,
      created_by: state.submittedBy,
    });
  }

  private broadcastVote(
    vote: 'validate' | 'challenge',
    agent: string,
    factId: string,
    newState: ValidationState,
    reason?: string,
  ): void {
    bestEffortPublish(p => p.publishMemoryUpdate({
      type: 'context',
      content: `fact-${vote}:${factId} by ${agent} → ${newState}`,
      agent,
      metadata: { factVote: { factId, voter: agent, vote, reason, ts: new Date().toISOString() } } as any,
    }));
  }
}
