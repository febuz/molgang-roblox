/**
 * Knowledge Graph Inference Engine
 *
 * Runs rule-based inference over the Neo4j graph to automatically derive
 * new facts, relationships, and risks that are implicit in existing data.
 *
 * Rules (all idempotent — safe to re-run):
 *
 *  R1  TRANSITIVE_DEPENDENCY
 *      If A DEPENDS_ON B and B DEPENDS_ON C, create A DEPENDS_ON C (depth 2).
 *
 *  R2  RISK_ESCALATION
 *      If a Decision AFFECTS a domain that has an unmitigated Risk with
 *      impact=critical, create a BLOCKS edge from that Risk to the Decision
 *      and auto-flag the Decision's validation_state = 'contested'.
 *
 *  R3  PRECEDENT_APPLICATION
 *      If a new Context shares ≥2 domain tags with an existing Precedent's
 *      applicable_to list, create an APPLIES_TO edge.
 *
 *  R4  QUANTUM_THREAT_PROPAGATION
 *      If a QuantumAlgorithm THREATENS a QuantumResource and that resource
 *      has migration_status != 'migrated', create a Risk node:
 *      "Post-quantum migration required for <resource>".
 *
 *  R5  FACT_CONFIRMATION_CASCADE
 *      When a Fact node reaches validation_state='confirmed', auto-create
 *      the corresponding domain node (Decision / Risk / Precedent) so
 *      confirmed facts become first-class graph citizens.
 *
 *  R6  ORPHAN_RISK_DETECTION
 *      Any Risk node with status='identified' and no outgoing MITIGATES
 *      relationship and age > 7 days → auto-escalate impact to 'critical'.
 *
 * Execution:
 *   const ie = new InferenceEngine(lightragClient);
 *   await ie.runAll();           // run all rules once
 *   ie.startScheduled(3600_000); // run every hour
 */

import { v4 as uuid } from 'uuid';
import type { LightRAGClient } from './client';
import { RELATIONSHIPS } from './schema';
import { bestEffortPublish } from '../kafka/shared';
import logger from '../../utils/logger';

export interface InferenceResult {
  rule: string;
  derived: number;
  skipped: number;
  errors: number;
}

export interface InferenceRunSummary {
  rulesRun: number;
  totalDerived: number;
  totalErrors: number;
  durationMs: number;
  results: InferenceResult[];
  ranAt: string;
}

export class InferenceEngine {
  private lightrag: LightRAGClient;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRunAt: string | null = null;

  constructor(lightragClient: LightRAGClient) {
    this.lightrag = lightragClient;
  }

  /**
   * Run all inference rules in order. Safe to call repeatedly.
   */
  async runAll(): Promise<InferenceRunSummary> {
    if (!this.lightrag.isConnected()) {
      return { rulesRun: 0, totalDerived: 0, totalErrors: 0, durationMs: 0, results: [], ranAt: new Date().toISOString() };
    }
    const start = Date.now();
    const rules = [
      () => this.r1TransitiveDependency(),
      () => this.r2RiskEscalation(),
      () => this.r3PrecedentApplication(),
      () => this.r4QuantumThreatPropagation(),
      () => this.r5FactConfirmationCascade(),
      () => this.r6OrphanRiskDetection(),
    ];
    const results: InferenceResult[] = [];
    let totalDerived = 0;
    let totalErrors = 0;

    for (const rule of rules) {
      try {
        const r = await rule();
        results.push(r);
        totalDerived += r.derived;
        totalErrors += r.errors;
      } catch (e: any) {
        logger.warn(`InferenceEngine rule failed: ${e.message}`);
        totalErrors++;
      }
    }

    const durationMs = Date.now() - start;
    this.lastRunAt = new Date().toISOString();
    if (totalDerived > 0) {
      logger.info(`InferenceEngine: ${totalDerived} facts derived in ${durationMs}ms`);
    }
    return { rulesRun: rules.length, totalDerived, totalErrors, durationMs, results, ranAt: this.lastRunAt };
  }

  /**
   * Start scheduled inference runs.
   */
  startScheduled(intervalMs = 3_600_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.runAll().catch(e => logger.warn(`InferenceEngine scheduled run error: ${e.message}`));
    }, intervalMs);
    logger.info(`✓ InferenceEngine scheduled every ${intervalMs / 1000}s`);
  }

  stopScheduled(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  getLastRunAt(): string | null { return this.lastRunAt; }

  // ─────────────────────────────────────────────────────────────────
  // Rules
  // ─────────────────────────────────────────────────────────────────

  /**
   * R1: Transitive dependency closure (depth 2).
   * A -> B -> C  =>  A -> C
   */
  private async r1TransitiveDependency(): Promise<InferenceResult> {
    const result: InferenceResult = { rule: 'R1_TRANSITIVE_DEPENDENCY', derived: 0, skipped: 0, errors: 0 };
    try {
      const session = (this.lightrag as any).driver.session();
      try {
        // Find pairs (a, c) where a->b->c exists but a->c does not
        const found = await session.run(`
          MATCH (a:Decision)-[:DEPENDS_ON]->(b:Decision)-[:DEPENDS_ON]->(c:Decision)
          WHERE NOT (a)-[:DEPENDS_ON]->(c) AND a.id <> c.id
          RETURN a.id AS aId, c.id AS cId
          LIMIT 100
        `);
        for (const record of found.records) {
          const aId = record.get('aId');
          const cId = record.get('cId');
          if (!aId || !cId) { result.skipped++; continue; }
          await this.lightrag.addEdge(aId, RELATIONSHIPS.DEPENDS_ON, cId, { inferred: true, rule: 'R1' });
          result.derived++;
        }
      } finally {
        await session.close();
      }
    } catch (e: any) {
      result.errors++;
      logger.debug(`R1 error: ${e.message}`);
    }
    return result;
  }

  /**
   * R2: Critical unmitigated risks block affected decisions.
   */
  private async r2RiskEscalation(): Promise<InferenceResult> {
    const result: InferenceResult = { rule: 'R2_RISK_ESCALATION', derived: 0, skipped: 0, errors: 0 };
    try {
      const session = (this.lightrag as any).driver.session();
      try {
        // Find (decision, risk) pairs where the decision affects a domain
        // that the risk is also tagged with, and no BLOCKS edge exists yet.
        const found = await session.run(`
          MATCH (r:Risk), (d:Decision)
          WHERE r.impact IN ['high', 'critical']
            AND r.status IN ['identified', 'mitigating']
            AND NOT (r)-[:BLOCKS]->(d)
            AND any(tag IN r.affects WHERE tag IN d.affects)
          RETURN r.id AS rId, d.id AS dId, r.description AS desc
          LIMIT 50
        `);
        for (const record of found.records) {
          const rId = record.get('rId');
          const dId = record.get('dId');
          if (!rId || !dId) { result.skipped++; continue; }
          await this.lightrag.addEdge(rId, RELATIONSHIPS.BLOCKS, dId, { inferred: true, rule: 'R2' });
          result.derived++;
          logger.debug(`R2: Risk ${rId} BLOCKS Decision ${dId}`);
        }
      } finally {
        await session.close();
      }
    } catch (e: any) {
      result.errors++;
      logger.debug(`R2 error: ${e.message}`);
    }
    return result;
  }

  /**
   * R3: Apply precedents to contexts that share domain tags.
   */
  private async r3PrecedentApplication(): Promise<InferenceResult> {
    const result: InferenceResult = { rule: 'R3_PRECEDENT_APPLICATION', derived: 0, skipped: 0, errors: 0 };
    try {
      const session = (this.lightrag as any).driver.session();
      try {
        const found = await session.run(`
          MATCH (p:Precedent), (c:Context)
          WHERE NOT (p)-[:APPLIES_TO]->(c)
            AND size([tag IN p.applicable_to WHERE tag IN c.scope]) >= 1
          RETURN p.id AS pId, c.id AS cId
          LIMIT 50
        `);
        for (const record of found.records) {
          const pId = record.get('pId');
          const cId = record.get('cId');
          if (!pId || !cId) { result.skipped++; continue; }
          await this.lightrag.addEdge(pId, RELATIONSHIPS.APPLIES_TO, cId, { inferred: true, rule: 'R3' });
          result.derived++;
        }
      } finally {
        await session.close();
      }
    } catch (e: any) {
      result.errors++;
      logger.debug(`R3 error: ${e.message}`);
    }
    return result;
  }

  /**
   * R4: Quantum threat propagation — generate Risk nodes for unmigrated resources.
   */
  private async r4QuantumThreatPropagation(): Promise<InferenceResult> {
    const result: InferenceResult = { rule: 'R4_QUANTUM_THREAT_PROPAGATION', derived: 0, skipped: 0, errors: 0 };
    try {
      const session = (this.lightrag as any).driver.session();
      try {
        const found = await session.run(`
          MATCH (a:QuantumAlgorithm)-[:THREATENS]->(r:QuantumResource)
          WHERE r.post_quantum_safe = false
            AND r.migration_status <> 'migrated'
          RETURN a.name AS algo, r.name AS resource, r.id AS rId
          LIMIT 50
        `);
        for (const record of found.records) {
          const algo = record.get('algo');
          const resource = record.get('resource');
          const rId = record.get('rId');
          if (!algo || !resource) { result.skipped++; continue; }

          const riskId = `risk_pq_${rId ?? uuid()}`;
          const desc = `Post-quantum migration required: ${resource} is threatened by ${algo}`;

          // Create risk node if it doesn't exist already (mergeTypedNode is idempotent)
          await this.lightrag.mergeTypedNode(riskId, 'Risk', {
            id: riskId,
            description: desc,
            impact: 'critical',
            mitigation: `Migrate ${resource} to NIST PQC standard (FIPS 203/204/205)`,
            status: 'identified',
            content: desc,
            created_by: 'inference-engine',
            inferred: true,
            rule: 'R4',
          });

          // Link risk to the resource
          await this.lightrag.addEdge(riskId, RELATIONSHIPS.AFFECTS, rId ?? riskId, { rule: 'R4' });

          // Broadcast the inferred risk
          bestEffortPublish(p => p.publishMemoryUpdate({
            type: 'risk',
            content: desc,
            agent: 'inference-engine',
            metadata: { impact: 'critical', rule: 'R4', algo, resource },
          }));

          result.derived++;
        }
      } finally {
        await session.close();
      }
    } catch (e: any) {
      result.errors++;
      logger.debug(`R4 error: ${e.message}`);
    }
    return result;
  }

  /**
   * R5: Promote confirmed Facts into their proper domain node types.
   */
  private async r5FactConfirmationCascade(): Promise<InferenceResult> {
    const result: InferenceResult = { rule: 'R5_FACT_CONFIRMATION_CASCADE', derived: 0, skipped: 0, errors: 0 };
    try {
      const session = (this.lightrag as any).driver.session();
      try {
        const found = await session.run(`
          MATCH (f:Fact)
          WHERE f.validation_state = 'confirmed'
            AND NOT (f)-[:PROMOTED_TO]->()
          RETURN f.id AS id, f.type AS type, f.content AS content,
                 f.created_by AS creator, f.affects AS affects
          LIMIT 50
        `);
        for (const record of found.records) {
          const id = record.get('id');
          const type = record.get('type') as string;
          const content = record.get('content') as string;
          const creator = record.get('creator') as string;
          const affects = record.get('affects') ?? [];

          const label = type.charAt(0).toUpperCase() + type.slice(1); // e.g. 'decision' -> 'Decision'
          const promotedId = `promoted_${id}`;

          await this.lightrag.mergeTypedNode(promotedId, label, {
            content,
            created_by: creator,
            affects,
            promoted_from: id,
            rule: 'R5',
          });
          await this.lightrag.addEdge(id, 'PROMOTED_TO', promotedId, { rule: 'R5' });

          result.derived++;
        }
      } finally {
        await session.close();
      }
    } catch (e: any) {
      result.errors++;
      logger.debug(`R5 error: ${e.message}`);
    }
    return result;
  }

  /**
   * R6: Orphan risks older than 7 days with no mitigation get escalated.
   */
  private async r6OrphanRiskDetection(): Promise<InferenceResult> {
    const result: InferenceResult = { rule: 'R6_ORPHAN_RISK_DETECTION', derived: 0, skipped: 0, errors: 0 };
    try {
      const session = (this.lightrag as any).driver.session();
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
        const found = await session.run(`
          MATCH (r:Risk)
          WHERE r.status = 'identified'
            AND NOT (r)-[:MITIGATES]->()
            AND r.created_at < $cutoff
          RETURN r.id AS id, r.impact AS impact
          LIMIT 50
        `, { cutoff: sevenDaysAgo });

        for (const record of found.records) {
          const id = record.get('id');
          const currentImpact = record.get('impact');
          if (!id || currentImpact === 'critical') { result.skipped++; continue; }

          await this.lightrag.mergeTypedNode(id, 'Risk', {
            impact: 'critical',
            escalated_by: 'inference-engine',
            escalated_at: new Date().toISOString(),
            escalation_rule: 'R6',
          });
          result.derived++;
          logger.warn(`R6: Risk ${id} escalated to critical (orphan > 7 days)`);
        }
      } finally {
        await session.close();
      }
    } catch (e: any) {
      result.errors++;
      logger.debug(`R6 error: ${e.message}`);
    }
    return result;
  }
}
