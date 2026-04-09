/**
 * Cost Analyzer - Track and Enforce API Spending Budgets
 *
 * Monitors:
 * - Per-agent costs
 * - Per-task costs
 * - Daily/monthly budgets
 * - Cost trends
 * - Alerts when approaching limits
 */
export interface CostEvent {
    id: string;
    agent: string;
    model: string;
    tokens_prompt: number;
    tokens_completion: number;
    cost_usd: number;
    task_id?: string;
    timestamp: number;
}
export interface BudgetConfig {
    daily_cents: number;
    monthly_cents: number;
}
export declare class CostAnalyzer {
    private events;
    private budgetConfig;
    private agentCosts;
    private taskCosts;
    private dailyStartTime;
    private monthlyStartTime;
    constructor(config: BudgetConfig);
    /**
     * Record a cost event
     */
    recordEvent(event: Omit<CostEvent, 'id' | 'timestamp'>): CostEvent;
    /**
     * Get current daily cost
     */
    getDailyCost(): number;
    /**
     * Get current monthly cost
     */
    getMonthlyCost(): number;
    /**
     * Get cost for specific agent
     */
    getAgentCost(agent: string): number;
    /**
     * Get cost for specific task
     */
    getTaskCost(taskId: string): number;
    /**
     * Check if daily budget exceeded
     */
    isDailyBudgetExceeded(): boolean;
    /**
     * Check if monthly budget exceeded
     */
    isMonthlyBudgetExceeded(): boolean;
    /**
     * Get remaining daily budget
     */
    getRemainingDailyBudget(): number;
    /**
     * Get remaining monthly budget
     */
    getRemainingMonthlyBudget(): number;
    /**
     * Get top agents by cost
     */
    getTopAgentsByCost(limit?: number): Array<{
        agent: string;
        cost: number;
        percentage: number;
    }>;
    /**
     * Get top models by cost
     */
    getTopModelsByCost(limit?: number): Array<{
        model: string;
        cost: number;
        calls: number;
    }>;
    /**
     * Get cost summary
     */
    getSummary(): {
        totalCost: number;
        dailyCost: number;
        monthlyCost: number;
        dailyBudget: number;
        monthlyBudget: number;
        dailyRemaining: number;
        monthlyRemaining: number;
        eventCount: number;
        agentCount: number;
        dailyExceeded: boolean;
        monthlyExceeded: boolean;
    };
    /**
     * Reset costs (for testing)
     */
    reset(): void;
    /**
     * Check budgets and alert if needed
     */
    private checkBudgets;
}
export default CostAnalyzer;
//# sourceMappingURL=cost-analyzer.d.ts.map