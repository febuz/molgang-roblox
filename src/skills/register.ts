/**
 * Skill Registration - LightRAG as Claude Code Skills
 *
 * Converts LightRAG API calls into Claude Code skills that agents can use
 */

import { LightRAGClient } from '../integrations/lightrag/client';
import logger from '../utils/logger';

interface Skill {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

const skills: Map<string, Skill> = new Map();

export function registerSkills(lightrag: LightRAGClient): void {
  // Skill 1: Query memory
  skills.set('query_memory', {
    name: 'query_memory',
    description: 'Query LightRAG for context on a topic. Returns relevant facts and decisions.',
    parameters: {
      query: { type: 'string', description: 'Natural language query' },
      filters: { type: 'object', description: 'Optional filters' },
      limit: { type: 'number', description: 'Max results (default: 5)' }
    },
    execute: async (params) => {
      const result = await lightrag.query(params.query, params.filters);
      return {
        success: true,
        results: result.nodes,
        count: result.nodes.length,
        cached: result.cached,
        tokens_saved: result.cached ? 200 : 0
      };
    }
  });

  // Skill 2: Add fact
  skills.set('add_fact', {
    name: 'add_fact',
    description: 'Store a decision or fact in LightRAG shared memory',
    parameters: {
      fact: { type: 'string', description: 'The fact/decision to store' },
      context: { type: 'string', description: 'What context does it relate to?' },
      type: { type: 'string', enum: ['decision', 'risk', 'precedent', 'result'] },
      affects: { type: 'array', description: 'What tasks/agents does this affect?' }
    },
    execute: async (params) => {
      const node = await lightrag.addNode({
        type: params.type,
        content: params.fact,
        context: params.context,
        created_by: 'agent',
        affects: params.affects
      });
      return {
        success: true,
        node_id: node.id,
        visible_to: 'all_agents'
      };
    }
  });

  // Skill 3: Find precedent
  skills.set('find_precedent', {
    name: 'find_precedent',
    description: 'Find similar decisions or past solutions to similar problems',
    parameters: {
      topic: { type: 'string', description: 'What are you looking for?' },
      similarity_threshold: { type: 'number', description: 'Threshold 0.7-1.0 (default: 0.75)' }
    },
    execute: async (params) => {
      const precedents = await lightrag.findSimilar(
        params.topic,
        params.similarity_threshold || 0.75
      );
      return {
        success: true,
        precedents,
        count: precedents.length,
        suggestions: precedents.map(p => p.content)
      };
    }
  });

  // Skill 4: Get context
  skills.set('get_context', {
    name: 'get_context',
    description: 'Get full context and requirements for a project/task',
    parameters: {
      project_id: { type: 'string', description: 'Project identifier' },
      include: {
        type: 'array',
        description: 'What to include: decisions, risks, requirements, blockers'
      }
    },
    execute: async (params) => {
      const context = await lightrag.getContext(
        params.project_id,
        params.include || []
      );
      return {
        success: true,
        context,
        completeness: context.completeness_score,
        last_updated: context.updated_at
      };
    }
  });

  logger.info(`✓ Registered ${skills.size} LightRAG skills`);
}

export function getSkill(name: string): Skill | undefined {
  return skills.get(name);
}

export function listSkills(): Skill[] {
  return Array.from(skills.values());
}

export function executeSkill(name: string, params: any): Promise<any> {
  const skill = skills.get(name);
  if (!skill) {
    throw new Error(`Skill not found: ${name}`);
  }
  return skill.execute(params);
}
