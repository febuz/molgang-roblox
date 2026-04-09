"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostAnalyzer = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class CostAnalyzer {
    constructor(config) {
        this.events = [];
        this.agentCosts = new Map();
        this.taskCosts = new Map();
        this.dailyStartTime = Date.now();
        this.monthlyStartTime = Date.now();
        this.budgetConfig = config;
        logger_1.default.info(`Cost Analyzer initialized: $${(config.daily_cents / 100).toFixed(2)}/day, $${(config.monthly_cents / 100).toFixed(2)}/month`);
    }
    /**
     * Record a cost event
     */
    recordEvent(event) {
        const costEvent = {
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
        logger_1.default.debug(`Cost recorded: ${event.agent} (${event.model}) - $${event.cost_usd.toFixed(4)}`);
        return costEvent;
    }
    /**
     * Get current daily cost
     */
    getDailyCost() {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return this.events
            .filter((e) => e.timestamp > oneDayAgo)
            .reduce((sum, e) => sum + e.cost_usd, 0);
    }
    /**
     * Get current monthly cost
     */
    getMonthlyCost() {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return this.events
            .filter((e) => e.timestamp > thirtyDaysAgo)
            .reduce((sum, e) => sum + e.cost_usd, 0);
    }
    /**
     * Get cost for specific agent
     */
    getAgentCost(agent) {
        return this.agentCosts.get(agent) || 0;
    }
    /**
     * Get cost for specific task
     */
    getTaskCost(taskId) {
        return this.taskCosts.get(taskId) || 0;
    }
    /**
     * Check if daily budget exceeded
     */
    isDailyBudgetExceeded() {
        const dailyCostCents = this.getDailyCost() * 100;
        return dailyCostCents > this.budgetConfig.daily_cents;
    }
    /**
     * Check if monthly budget exceeded
     */
    isMonthlyBudgetExceeded() {
        const monthlyCostCents = this.getMonthlyCost() * 100;
        return monthlyCostCents > this.budgetConfig.monthly_cents;
    }
    /**
     * Get remaining daily budget
     */
    getRemainingDailyBudget() {
        const dailyCostCents = this.getDailyCost() * 100;
        return Math.max(0, this.budgetConfig.daily_cents - dailyCostCents) / 100;
    }
    /**
     * Get remaining monthly budget
     */
    getRemainingMonthlyBudget() {
        const monthlyCostCents = this.getMonthlyCost() * 100;
        return Math.max(0, this.budgetConfig.monthly_cents - monthlyCostCents) / 100;
    }
    /**
     * Get top agents by cost
     */
    getTopAgentsByCost(limit = 10) {
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
    getTopModelsByCost(limit = 10) {
        const modelCosts = new Map();
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
    getSummary() {
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
    reset() {
        this.events = [];
        this.agentCosts.clear();
        this.taskCosts.clear();
        logger_1.default.info('Cost analyzer reset');
    }
    // ============================================================
    // Private methods
    // ============================================================
    /**
     * Check budgets and alert if needed
     */
    checkBudgets() {
        const dailyCost = this.getDailyCost();
        const dailyBudget = this.budgetConfig.daily_cents / 100;
        const dailyPercent = (dailyCost / dailyBudget) * 100;
        if (dailyPercent > 90 && dailyPercent < 95) {
            logger_1.default.warn(`⚠️  Daily budget 90% used: $${dailyCost.toFixed(2)}/$${dailyBudget.toFixed(2)}`);
        }
        else if (dailyPercent >= 95) {
            logger_1.default.error(`🚨 Daily budget ${dailyPercent.toFixed(0)}% used: $${dailyCost.toFixed(2)}/$${dailyBudget.toFixed(2)}`);
        }
        const monthlyCost = this.getMonthlyCost();
        const monthlyBudget = this.budgetConfig.monthly_cents / 100;
        const monthlyPercent = (monthlyCost / monthlyBudget) * 100;
        if (monthlyPercent > 90 && monthlyPercent < 95) {
            logger_1.default.warn(`⚠️  Monthly budget 90% used: $${monthlyCost.toFixed(2)}/$${monthlyBudget.toFixed(2)}`);
        }
        else if (monthlyPercent >= 95) {
            logger_1.default.error(`🚨 Monthly budget ${monthlyPercent.toFixed(0)}% used: $${monthlyCost.toFixed(2)}/$${monthlyBudget.toFixed(2)}`);
        }
    }
}
exports.CostAnalyzer = CostAnalyzer;
exports.default = CostAnalyzer;
//# sourceMappingURL=cost-analyzer.js.map