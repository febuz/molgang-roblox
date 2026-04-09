# VirtualPC Claude Code Skills System

Extend Claude Code with access to VirtualPC's shared team memory and autonomous agent capabilities.

---

## 🚀 Overview

Claude Code Skills expose VirtualPC's LightRAG system through an MCP (Model Context Protocol) interface. This allows Claude Code users to:

1. **Query Team Memory** - Access decisions, precedents, and context from autonomous agents
2. **Find Precedents** - Get similar past decisions and their outcomes
3. **Record Decisions** - Share learnings with the team
4. **Monitor Agents** - Check status and performance of autonomous agents
5. **Track Costs** - Monitor budget usage and cost reduction
6. **Access Learnings** - Learn from team experiences and best practices

---

## 📦 Installation

### 1. Register Skills with Claude Code

```bash
# In your Claude Code settings or claude.md
claude_code_skills:
  - name: "virtualpc"
    endpoint: "http://localhost:3100/api/skills"
    token: "${VIRTUALPC_API_TOKEN}"
```

### 2. Set Environment Variable

```bash
export VIRTUALPC_API_TOKEN="your-api-token-here"
```

### 3. Verify Registration

```bash
curl http://localhost:3100/api/skills/list
```

---

## 🛠️ Available Skills

### Skill 1: Query Team Memory

**Query shared team memory for decisions and context**

```typescript
const memory = await claude.skills.queryTeamMemory({
  topic: 'cache optimization',
  limit: 5,
  agent: 'kai'  // optional
});

// Returns: Array of past decisions, their impact, and reasoning
console.log(memory.results);
// [
//   {
//     decision: 'Use Redis for distributed caching',
//     agent: 'kai',
//     impact: 'Reduced API latency from 2.5s to 0.8s',
//     reasoning: 'Redis provides fast, distributed caching',
//     timestamp: '2024-04-09T14:30:00Z'
//   },
//   ...
// ]
```

**Use Cases:**
- Get context before making decisions
- Learn how team solved similar problems
- Avoid reinventing the wheel
- Understand trade-offs of previous approaches

---

### Skill 2: Find Precedents

**Find similar past decisions using semantic similarity**

```typescript
const precedents = await claude.skills.findPrecedents({
  description: 'How to optimize database query performance?',
  threshold: 0.8,  // semantic similarity threshold
  limit: 5
});

// Returns: Similar past decisions ranked by relevance
console.log(precedents);
// {
//   query: 'How to optimize database query performance?',
//   precedents: [
//     {
//       title: 'Database optimization project',
//       approach: 'Added indexes and implemented query caching',
//       result: '+40% query throughput',
//       lessons: 'Index strategy matters more than rewrites',
//       agent: 'kai',
//       similarity: 0.95
//     },
//     ...
//   ]
// }
```

**Use Cases:**
- Find relevant precedents before tackling new problems
- Learn from past successes and failures
- Understand proven approaches for similar tasks
- Get context on lessons learned

---

### Skill 3: Record Decision

**Share your decision with the team**

```typescript
await claude.skills.recordDecision({
  agent: 'claude-code-user',
  decision: 'Implement microservices for API scaling',
  reasoning: 'Current monolith hits CPU limits at 70% load',
  impact: 'Expected 5x better scalability',
  tags: ['architecture', 'scalability', 'api']
});

// Returns: Confirmation and decision ID
// {
//   status: 'recorded',
//   decision_id: 'dec-1712766600000',
//   timestamp: '2024-04-09T14:30:00Z',
//   access_key: 'Available to team via queryTeamMemory'
// }
```

**Use Cases:**
- Share design decisions with autonomous agents
- Help team learn from your work
- Create institutional memory
- Document reasoning for future reference

---

### Skill 4: Get Agent Status

**Check status and performance of autonomous agents**

```typescript
const status = await claude.skills.getAgentStatus();

// Returns: Current status of all agents
console.log(status);
// {
//   agents: [
//     {
//       name: 'fill',
//       status: 'active',
//       current_task: 'Strategic planning',
//       tasks_completed: 156,
//       avg_quality: 0.94,
//       cost_total: 2.34
//     },
//     {
//       name: 'kai',
//       status: 'idle',
//       tasks_completed: 201,
//       avg_quality: 0.96,
//       cost_total: 1.89
//     },
//     ...
//   ],
//   team_efficiency: 0.94
// }
```

**Use Cases:**
- Check if agents are available before creating tasks
- Monitor team performance
- Understand current workload
- Plan task distribution

---

### Skill 5: Check Cost Status

**Monitor budget usage and cost reduction metrics**

```typescript
const costs = await claude.skills.checkCostStatus();

// Returns: Real-time cost tracking
console.log(costs);
// {
//   daily_cost: 2.34,
//   daily_budget: 50,
//   daily_remaining: 47.66,
//   daily_exceeded: false,
//   monthly_cost: 45.67,
//   monthly_budget: 1500,
//   monthly_remaining: 1454.33,
//   monthly_exceeded: false,
//   cost_reduction_percent: 87,
//   top_agents: [
//     { agent: 'kai', cost: 1.89 },
//     { agent: 'fill', cost: 0.45 }
//   ]
// }
```

**Use Cases:**
- Check budget before creating expensive tasks
- Monitor cost reduction effectiveness
- Identify cost hotspots
- Plan resource allocation

---

### Skill 6: Access Learnings

**Get best practices and lessons from team experience**

```typescript
const learnings = await claude.skills.accessLearnings({
  topic: 'performance optimization',
  category: 'best_practices',
  limit: 10
});

// Returns: Curated learnings with impact scores
console.log(learnings);
// {
//   learnings: [
//     {
//       title: 'Index Strategy Matters',
//       description: 'Proper indexing provides better ROI than query rewrites',
//       category: 'best_practices',
//       agent: 'kai',
//       impact_score: 0.95,
//       related_decision: 'dec-001'
//     },
//     {
//       title: 'Cache Invalidation is Critical',
//       description: 'Multi-instance caching requires careful invalidation',
//       category: 'lessons_learned',
//       agent: 'luna',
//       impact_score: 0.88
//     },
//     ...
//   ],
//   count: 47
// }
```

**Categories:**
- `best_practices` - Proven approaches with high success rate
- `lessons_learned` - Hard-won wisdom from experience
- `common_mistakes` - Pitfalls to avoid
- `success_patterns` - Patterns that consistently work well

**Use Cases:**
- Learn industry best practices from team
- Avoid common pitfalls
- Apply proven patterns
- Build on collective experience

---

## 💡 Common Patterns

### Pattern 1: Query Before Deciding

```typescript
// Before making a decision, check what team has done
const precedents = await claude.skills.findPrecedents({
  description: 'Should we use microservices or monolith?'
});

if (precedents.precedents.length > 0) {
  console.log('Similar decision made before:');
  console.log(precedents.precedents[0].lessons);
}

// Then record your decision
await claude.skills.recordDecision({
  agent: 'claude-code',
  decision: 'Microservices for new project',
  reasoning: 'Learning from team experience + current requirements',
  impact: 'Better scalability and independent deployments'
});
```

### Pattern 2: Cost-Aware Task Creation

```typescript
// Check cost before expensive operations
const costs = await claude.skills.checkCostStatus();

if (costs.daily_exceeded) {
  console.log('Daily budget exceeded - use cheaper models only');
  await createTask({
    model: 'local-qwen',  // Use free local model
    priority: 'low'
  });
} else if (costs.daily_cost > costs.daily_budget * 0.8) {
  console.log('80% of budget used - switch to standard models');
  await createTask({
    model: 'mistral-7b',  // Cheaper cloud model
    priority: 'normal'
  });
} else {
  console.log('Budget available - can use premium models if needed');
  // Can use any model
}
```

### Pattern 3: Learn from Failures

```typescript
// When something fails, learn from team experience
try {
  await performTask();
} catch (error) {
  // Find what team learned about similar failures
  const learnings = await claude.skills.accessLearnings({
    topic: error.type,
    category: 'common_mistakes'
  });

  console.log('Similar issue happened before:');
  console.log(learnings.learnings.map(l => l.description));

  // Record this for future reference
  await claude.skills.recordDecision({
    agent: 'claude-code',
    decision: `Handled ${error.type} error`,
    reasoning: learnings.learnings[0]?.description,
    impact: `Prevented repeated error`
  });
}
```

### Pattern 4: Monitor Team Health

```typescript
// Regular check-in on team
const status = await claude.skills.getAgentStatus();

const activeAgents = status.agents.filter(a => a.status === 'active');
console.log(`${activeAgents.length} agents active, team efficiency: ${status.team_efficiency * 100}%`);

// If team is overloaded, reduce task complexity
if (status.team_efficiency < 0.7) {
  console.log('Team overloaded - creating simpler tasks');
}

// If team is idle, create more work
if (status.team_efficiency < 0.2) {
  console.log('Team has capacity - creating more tasks');
}
```

---

## 🔄 Integration Examples

### Example 1: Code Review with Team Knowledge

```typescript
// Use team memory to inform code review
async function reviewCode(code: string): Promise<string> {
  // Find relevant learnings
  const learnings = await claude.skills.accessLearnings({
    topic: 'code quality',
    category: 'best_practices'
  });

  // Get precedents for similar code
  const precedents = await claude.skills.findPrecedents({
    description: `Review this pattern: ${code.substring(0, 100)}`
  });

  // Perform review with team context
  const review = await claude.performReview(code, {
    best_practices: learnings.learnings.map(l => l.description),
    precedents: precedents.precedents.map(p => p.lessons)
  });

  // Record findings
  await claude.skills.recordDecision({
    agent: 'claude-code-reviewer',
    decision: `Code review findings`,
    reasoning: review.analysis,
    impact: review.suggestions
  });

  return review;
}
```

### Example 2: Intelligent Task Routing

```typescript
// Route tasks to best agents based on their performance
async function routeTask(task: Task): Promise<string> {
  // Get agent status
  const status = await claude.skills.getAgentStatus();

  // Find best agent for this task type
  const bestAgent = status.agents
    .filter(a => a.status !== 'offline')
    .sort((a, b) => b.avg_quality - a.avg_quality)[0];

  console.log(`Routing to ${bestAgent.name} (quality: ${bestAgent.avg_quality})`);

  // Create task
  const result = await createTask({
    assigned_to: bestAgent.name,
    ...task
  });

  // Record in team memory
  await claude.skills.recordDecision({
    agent: 'task-router',
    decision: `Routed task to ${bestAgent.name}`,
    reasoning: `Highest quality for this task type`,
    impact: `Optimized task assignment`
  });

  return result;
}
```

### Example 3: Budget-Conscious Processing

```typescript
// Process large batches while respecting budget
async function processBatch(items: Item[]): Promise<Result[]> {
  const costs = await claude.skills.checkCostStatus();
  const budget = costs.daily_remaining;

  // Estimate items to process
  const costPerItem = 0.001;
  const maxItems = Math.floor(budget / costPerItem);

  if (items.length > maxItems) {
    console.log(`Can only process ${maxItems}/${items.length} with remaining budget`);
    
    // Use cheaper processing for excess
    const expensiveItems = items.slice(0, maxItems);
    const cheapItems = items.slice(maxItems);

    const results = [
      ...await processExpensive(expensiveItems),
      ...await processCheap(cheapItems)
    ];

    return results;
  }

  return await processExpensive(items);
}
```

---

## 📊 Best Practices

### 1. **Always Query Before Deciding**
Check team memory before making design decisions. You might find a better approach already discovered.

### 2. **Record Your Learnings**
Share what you learn with the team. Future Claude Code sessions and agents will benefit.

### 3. **Monitor Costs**
Always check budget before expensive operations. Use cheaper models when possible.

### 4. **Respect Agent Workload**
Check agent status before creating tasks. Don't overload the team.

### 5. **Learn from Failures**
When something goes wrong, record it. Help the team avoid repeated mistakes.

### 6. **Update Decisions**
If your decision worked well (or didn't), record the outcome. Help team learn.

---

## 🔐 Security

### Authentication

```bash
# Skills require API token
VIRTUALPC_API_TOKEN="sk-..."

# Token provides access to:
# - Read: Memory, precedents, learnings, status
# - Write: Decisions, events (limited)
# - No access to: Cost details, agent internals, config
```

### Permissions

```typescript
// Skills check permissions:
Skills require: 'read:memory', 'read:decisions', 'read:status'
Recording requires: 'write:decisions'
Cost checks require: 'read:cost'
```

---

## 🚀 Deployment

### As MCP Server

```bash
# Register with Claude Code
claude-code config add skill virtualpc \
  --endpoint http://localhost:3100/api/skills \
  --token $VIRTUALPC_API_TOKEN
```

### In Cloud

```bash
# Deploy skills as hosted service
docker run -e VIRTUALPC_API_TOKEN=$TOKEN virtualpc-skills
```

### In IDE Extensions

```json
{
  "claudeCode.skills": [
    {
      "id": "virtualpc",
      "name": "VirtualPC Team Knowledge",
      "endpoint": "https://api.example.com/virtualpc-skills",
      "token": "${env:VIRTUALPC_API_TOKEN}"
    }
  ]
}
```

---

## 📚 References

- **MCP Documentation**: https://modelcontextprotocol.io/
- **Claude Code Docs**: https://claude.com/claude-code
- **VirtualPC Architecture**: AGENT_OPERATIONS.md
- **API Reference**: API_DOCS.md

---

**Claude Code Skills Ready** ✅

Extend your coding with team knowledge and autonomous agent capabilities.
