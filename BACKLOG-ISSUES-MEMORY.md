# VirtualPC Backlog, Issues, and Memory Features

Complete guide to managing tasks, blocking issues, and team knowledge in VirtualPC.

## 📋 Backlog Management

The backlog tracks all work items with priority, assignment, and sprint planning.

### Available Endpoints

**Create Backlog Item**
```bash
POST /api/backlog/create
Content-Type: application/json

{
  "title": "MOLGANG-6.1: Kafka Integration",
  "description": "Integrate Kafka message queue for event coordination",
  "priority": "high",
  "assigned_to": "kai",
  "story_points": 13,
  "sprint": "week1"
}
```

**Get Backlog**
```bash
GET /api/backlog?sprint=week1
```

Response includes:
- Item IDs and titles
- Priority levels (high, medium, low)
- Assigned agents (fill, kai, zip, mira, luna)
- Sprint assignment
- Status (new, pending, in_progress, completed)
- Story point estimates

### Current Backlog

The system comes pre-configured with MOLGANG project backlog:

| ID | Title | Priority | Assigned | Status | Sprint |
|----|-------|----------|----------|--------|--------|
| bl-1 | Kafka Integration | high | kai | in_progress | week1 |
| bl-2 | Redis Clustering | high | kai | pending | week1 |
| bl-3 | Kubernetes Deployment | high | kai | pending | week1 |
| bl-4 | Deep Ocean Reactor Zone | medium | zip | pending | week2 |
| bl-5 | Zone Visual Design | medium | mira | pending | week2 |
| bl-6 | Weather System | medium | luna | pending | week2 |
| bl-7 | Ranked PvP System | medium | zip | pending | week3 |
| bl-8 | In-Game Shop | medium | zip | pending | week3 |
| bl-9 | Battle Pass System | medium | zip | pending | week4 |
| bl-10 | Mobile Optimization | low | luna | pending | week4 |

### Agent Expertise (Skill Mapping)

VirtualPC automatically routes tasks based on agent skills:

- **Fill** (CEO): Strategic planning, decision-making, overall vision
- **Kai** (CTO): Infrastructure, architecture, backend systems, optimization
- **Zip** (Developer): Feature development, game mechanics, implementation
- **Mira** (Artist): Visual design, UI/UX, creative direction
- **Luna** (Tech Artist): Performance optimization, rendering, technical visuals

---

## 🐛 Issue Tracking

Issues track blocking problems and bugs that need resolution.

### Available Endpoints

**Create Issue**
```bash
POST /api/issues/create
Content-Type: application/json

{
  "title": "Neo4j connection timeout",
  "description": "Connection pool exhausting under load, causing 30s timeouts",
  "severity": "high",
  "assigned_to": "kai",
  "blocking_task": "bl-1"
}
```

**Get Issues**
```bash
GET /api/issues?status=open
```

Response includes:
- Issue ID and title
- Severity (high, medium, low)
- Status (open, in_progress, resolved)
- Assigned agent
- Blocking task reference
- Creation timestamp

### Current Issues

| ID | Title | Severity | Status | Blocking | Assigned |
|----|-------|----------|--------|----------|----------|
| iss-1 | Neo4j connection timeout | high | in_progress | MOLGANG-6.1 | kai |
| iss-2 | Kafka topic creation race | medium | open | MOLGANG-6.1 | kai |

### Issue Resolution Workflow

1. **Open** - Issue created, needs investigation
2. **In Progress** - Agent actively working on resolution
3. **Resolved** - Issue fixed, ready for verification
4. **Verified** - Testing confirms fix, issue closed

### Blocking Task Integration

Issues can block backlog items. When creating an issue, specify `blocking_task` to prevent that backlog item from progressing until the issue is resolved.

---

## 🧠 Memory & Knowledge Base

The memory system uses Neo4j + LightRAG to store and retrieve team knowledge, decisions, and context.

### Available Endpoints

**Query Memory**
```bash
POST /api/memory/query
Content-Type: application/json

{
  "agent": "kai",
  "topic": "previous-decisions",
  "filters": {}
}
```

**Add Decision**
```bash
POST /api/memory/add-decision
Content-Type: application/json

{
  "agent": "kai",
  "decision": "Implemented connection pooling with max_connections=100 to handle concurrent Neo4j requests"
}
```

### Memory Topics

- **previous-decisions** - Historical decisions and their rationale
- **project-context** - MOLGANG project goals, architecture, scope
- **team-knowledge** - Technical knowledge, best practices, lessons learned

### How It Works

1. **Decision Logging**: When agents make important decisions, they're logged to memory
2. **Contextual Retrieval**: When planning new work, agents query relevant decisions
3. **Caching**: LightRAG caches frequently accessed knowledge (40% hit rate)
4. **Relationship Mapping**: Neo4j tracks decision dependencies and implications

### Example Stored Decisions

```
Agent: kai
Time: 2024-04-09
Decision: "Switched Neo4j driver from deprecated bolt to neo4j-driver v5"
Rationale: "Older driver had connection pooling bugs, new version fixes race conditions"
Impact: "Reduced 'Backup not found' errors by 85%"
Related: [MOLGANG-6.1, iss-1]
```

### Knowledge Graph Structure

```
[Agent: kai]
  --decided--> [Decision: Connection Pooling]
       --for--> [Project: MOLGANG]
       --resolves--> [Issue: Neo4j timeout]
       --affects--> [Task: MOLGANG-6.1]

[Agent: zip]
  --learned--> [Knowledge: React 18 patterns]
       --used-in--> [Task: Deep Ocean Reactor Zone]
       --affects--> [Agent: mira] (via design specifications)
```

---

## 🔗 Integrated Workflow Example

### Scenario: Adding a New Feature

1. **Create Backlog Item**
   ```bash
   POST /api/backlog/create
   {
     "title": "Add player rankings",
     "description": "Implement Glicko-2 ranking system for PvP",
     "priority": "high",
     "assigned_to": "zip",
     "story_points": 21,
     "sprint": "week3"
   }
   ```
   → Backlog ID: `bl-11`

2. **Query Memory for Context**
   ```bash
   POST /api/memory/query
   {
     "agent": "zip",
     "topic": "previous-decisions",
     "filters": {"project": "MOLGANG", "feature": "ranking"}
   }
   ```
   → Returns prior ranking system discussions

3. **Create Task in Scheduler**
   ```bash
   POST /api/tasks/schedule
   {
     "title": "Implement Glicko-2 ranking",
     "description": "Add ranking algorithm from bl-11",
     "priority": "high",
     "assigned_to": "zip",
     "estimated_hours": 40
   }
   ```
   → Task assigned to zip (Developer skill match)

4. **Add to Collaboration**
   ```bash
   POST /api/collaboration/start
   {
     "type": "code-review",
     "participants": ["zip", "kai"],
     "priority": "high"
   }
   ```
   → Start discussion with CTO for architecture review

5. **Log Implementation Decision**
   ```bash
   POST /api/memory/add-decision
   {
     "agent": "zip",
     "decision": "Used Glicko-2 algorithm for ranking; stored ratings in Redis for sub-10ms lookup"
   }
   ```
   → Store decision for future reference

6. **Track Progress**
   ```bash
   POST /api/analytics/track
   {
     "type": "task-completion",
     "agent": "zip",
     "duration": 144000000,
     "status": "success",
     "metadata": {"story_points": 21, "ranking_system": "glicko2"}
   }
   ```

7. **Complete Backlog Item**
   ```bash
   POST /api/tasks/{taskId}/complete
   {
     "quality_score": 0.97,
     "notes": "Implemented Glicko-2 with Redis optimization, 98% test coverage"
   }
   ```

---

## 📊 Metrics Integration

### Backlog Velocity
Track how many story points the team completes per sprint:
- Week1: 32 story points planned
- Completion rate impacts Week2-4 planning

### Issue Impact
Issues can cause backlog delays:
- If iss-1 (Neo4j timeout) stays open, bl-1 (Kafka Integration) can't progress
- Resolution time for iss-1 directly impacts project timeline

### Memory Hit Rate
- Current: 40% cache hit rate
- Hit rate correlates with better decision-making
- Goal: Increase to 60% through better knowledge structuring

---

## 🎯 Best Practices

### Backlog Items
✅ **DO**
- Write clear, specific titles with project prefix (e.g., "MOLGANG-6.1")
- Break large features into smaller story points (< 21 each)
- Assign to matching agent skills
- Update status as work progresses

❌ **DON'T**
- Mix unrelated tasks in single backlog item
- Assign without considering agent workload
- Leave items in "new" status for extended periods

### Issues
✅ **DO**
- Link blocking issues to related backlog items
- Set severity based on impact scope
- Include reproduction steps for bugs
- Assign to agent with expertise

❌ **DON'T**
- Create duplicate issues for same problem
- Leave issues unassigned
- Mix multiple problems in one issue

### Memory
✅ **DO**
- Log significant architectural decisions
- Include rationale and impact analysis
- Link related decisions to project context
- Query memory before starting major features

❌ **DON'T**
- Store trivial or temporary information
- Log decisions without context
- Forget to update related decision entries

---

## 🔄 API Status Check

All backlog/issues/memory endpoints are fully operational:

```bash
# Verify backlog system
curl http://localhost:3100/api/backlog

# Verify issues system
curl http://localhost:3100/api/issues

# Verify memory system
curl http://localhost:3100/api/memory/query \
  -H "Content-Type: application/json" \
  -d '{"agent":"kai","topic":"previous-decisions"}'
```

All three systems are integrated with the OpenClaw autonomous execution system, allowing agents to self-manage workload, report blockers, and access team knowledge.
