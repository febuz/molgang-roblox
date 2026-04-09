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

import logger from '../utils/logger';

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
  daily_cents: number; // $X in cents
  monthly_cents: number; // $X in cents
}

export class CostAnalyzer {
  private events: CostEvent[] = [];
  private budgetConfig: BudgetConfig;
  private agentCosts: Map<string, number> = new Map();
  private taskCosts: Map<string, number> = new Map();
  private dailyStartTime: number = Date.now();
  private monthlyStartTime: number = Date.now();

  constructor(config: BudgetConfig) {
    this.budgetConfig = config;
    logger.info(
      `Cost Analyzer initialized: $${(config.daily_cents / 100).toFixed(2)}/day, $${(config.monthly_cents / 100).toFixed(2)}/month`
    );
  }

  /**
   * Record a cost event
   */
  recordEvent(event: Omit<CostEvent, 'id' | 'timestamp'>): CostEvent {
    const costEvent: CostEvent = {
      ...event,
      id: `cost-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    this.events.push(costEvent);

    // Track by agent
    const currentAgentCost = this.agentCosts.get(event.agent) || 0;
    this.agentCosts.set(event.agent, currentAgentCost + event.cost_usd);

    // Track by task
    if (event.task_id) {
      const currentTaskCost = this.taskCosts.get(event.task_id) || 0;
      this.taskCosts.set(event.task_id, currentTaskCost + event.cost_usd);
    }

    // Check budgets
    this.checkBudgets();

    logger.debug(`Cost recorded: ${event.agent} (${event.model}) - $${event.cost_usd.toFixed(4)}`);

    return costEvent;
  }

  /**
   * Get current daily cost
   */
  getDailyCost(): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return this.events
      .filter((e) => e.timestamp > oneDayAgo)
      .reduce((sum, e) => sum + e.cost_usd, 0);
  }

  /**
   * Get current monthly cost
   */
  getMonthlyCost(): number {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return this.events
      .filter((e) => e.timestamp > thirtyDaysAgo)
      .reduce((sum, e) => sum + e.cost_usd, 0);
  }

  /**
   * Get cost for specific agent
   */
  getAgentCost(agent: string): number {
    return this.agentCosts.get(agent) || 0;
  }

  /**
   * Get cost for specific task
   */
  getTaskCost(taskId: string): number {
    return this.taskCosts.get(taskId) || 0;
  }

  /**
   * Check if daily budget exceeded
   */
  isDailyBudgetExceeded(): boolean {
    const dailyCostCents = this.getDailyCost() * 100;
    return dailyCostCents > this.budgetConfig.daily_cents;
  }

  /**
   * Check if monthly budget exceeded
   */
  isMonthlyBudgetExceeded(): boolean {
    const monthlyCostCents = this.getMonthlyCost() * 100;
    return monthlyCostCents > this.budgetConfig.monthly_cents;
  }

  /**
   * Get remaining daily budget
   */
  getRemainingDailyBudget(): number {
    const dailyCostCents = this.getDailyCost() * 100;
    return Math.max(0, this.budgetConfig.daily_cents - dailyCostCents) / 100;
  }

  /**
   * Get remaining monthly budget
   */
  getRemainingMonthlyBudget(): number {
    const monthlyCostCents = this.getMonthlyCost() * 100;
    return Math.max(0, this.budgetConfig.monthly_cents - monthlyCostCents) / 100;
  }

  /**
   * Get top agents by cost
   */
  getTopAgentsByCost(limit: number = 10): Array<{
    agent: string;
    cost: number;
    percentage: number;
  }> {
    const total = Array.from(this.agentCosts.values()).reduce((a, b) => a + b, 0);

    return Array.from(this.agentCosts.entries())
      .map(([agent, cost]) => ({
        agent,
        cost,
        percentage: total > 0 ? (cost / total) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  /**
   * Get top models by cost
   */
  getTopModelsByCost(limit: number = 10): Array<{
    model: string;
    cost: number;
    calls: number;
  }> {
    const modelCosts: Map<string, { cost: number; calls: number }> = new Map();

    for (const event of this.events) {
      const current = modelCosts.get(event.model) || { cost: 0, calls: 0 };
      current.cost += event.cost_usd;
      current.calls++;
      modelCosts.set(event.model, current);
    }

    return Array.from(modelCosts.entries())
      .map(([model, { cost, calls }]) => ({
        model,
        cost,
        calls,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

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
  } {
    return {
      totalCost: Array.from(this.agentCosts.values()).reduce((a, b) => a + b, 0),
      dailyCost: this.getDailyCost(),
      monthlyCost: this.getMonthlyCost(),
      dailyBudget: this.budgetConfig.daily_cents / 100,
      monthlyBudget: this.budgetConfig.monthly_cents / 100,
      dailyRemaining: this.getRemainingDailyBudget(),
      monthlyRemaining: this.getRemainingMonthlyBudget(),
      eventCount: this.events.length,
      agentCount: this.agentCosts.size,
      dailyExceeded: this.isDailyBudgetExceeded(),
      monthlyExceeded: this.isMonthlyBudgetExceeded(),
    };
  }

  /**
   * Reset costs (for testing)
   */
  reset(): void {
    this.events = [];
    this.agentCosts.clear();
    this.taskCosts.clear();
    logger.info('Cost analyzer reset');
  }

  // ============================================================
  // Private methods
  // ============================================================

  /**
   * Check budgets and alert if needed
   */
  private checkBudgets(): void {
    const dailyCost = this.getDailyCost();
    const dailyBudget = this.budgetConfig.daily_cents / 100;
    const dailyPercent = (dailyCost / dailyBudget) * 100;

    if (dailyPercent > 90 && dailyPercent < 95) {
      logger.warn(`⚠️  Daily budget 90% used: $${dailyCost.toFixed(2)}/$${dailyBudget.toFixed(2)}`);
    } else if (dailyPercent >= 95) {
      logger.error(
        `🚨 Daily budget ${dailyPercent.toFixed(0)}% used: $${dailyCost.toFixed(2)}/$${dailyBudget.toFixed(2)}`
      );
    }

    const monthlyCost = this.getMonthlyCost();
    const monthlyBudget = this.budgetConfig.monthly_cents / 100;
    const monthlyPercent = (monthlyCost / monthlyBudget) * 100;

    if (monthlyPercent > 90 && monthlyPercent < 95) {
      logger.warn(
        `⚠️  Monthly budget 90% used: $${monthlyCost.toFixed(2)}/$${monthlyBudget.toFixed(2)}`
      );
    } else if (monthlyPercent >= 95) {
      logger.error(
        `🚨 Monthly budget ${monthlyPercent.toFixed(0)}% used: $${monthlyCost.toFixed(2)}/$${monthlyBudget.toFixed(2)}`
      );
    }
  }
}

export default CostAnalyzer;
