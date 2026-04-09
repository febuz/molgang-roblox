/**
 * Skill Registration - LightRAG as Claude Code Skills
 *
 * Converts LightRAG API calls into Claude Code skills that agents can use
 */
import { LightRAGClient } from '../integrations/lightrag/client';
interface Skill {
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute: (params: any) => Promise<any>;
}
export declare function registerSkills(lightrag: LightRAGClient): void;
export declare function getSkill(name: string): Skill | undefined;
export declare function listSkills(): Skill[];
export declare function executeSkill(name: string, params: any): Promise<any>;
export {};
//# sourceMappingURL=register.d.ts.map