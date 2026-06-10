# VirtualPC API Endpoints Reference

Complete documentation of all 70+ API endpoints in the VirtualPC autonomous agent system.

## Base URL
`http://localhost:3100`

## System Health
- `GET /health` - System status check
- `GET /api/kafka/status` - Kafka broker status

---

## 📊 Metrics & Monitoring (4 endpoints)

### System Metrics
**GET** `/api/metrics/system`
- Returns overall system uptime, request counts, error rates, latency, CPU/memory usage
- Response: `{ success, timestamp, system: {...}, agents: {...} }`

### Agent Metrics
**GET** `/api/metrics/agents`
- Returns performance metrics per agent (fill, kai, zip, mira, luna)
- Response: `{ success, agents: [{name, efficiency, uptime, errors, avgResponseTime}, ...] }`

### Infrastructure Metrics
**GET** `/api/metrics/infrastructure`
- Returns infrastructure health data (databases, services, clusters)
- Response: `{ success, infrastructure: {...}, services: {...} }`

### Performance Metrics
**GET** `/api/metrics/performance`
- Returns API latency (p50/p95/p99), throughput, resource utilization
- Response: `{ success, latency: {...}, throughput: {...} }`

---

## 📋 Task Scheduling (3 endpoints)

### Schedule New Task
**POST** `/api/tasks/schedule`
```json
{
  "title": "Task title",
  "description": "Task description",
  "skills_required": ["development", "testing"],
  "priority": "high|medium|low",
  "estimated_hours": 8,
  "assigned_to": "agent_name" // optional, auto-assigned if omitted
}
```
- Response: `{ success, task: {...} }`

### Get Team Schedule
**GET** `/api/tasks/schedule`
- Returns schedule for all agents with workload distribution
- Response: `{ success, schedule: {...}, totalTasks: N, agentWorkload: {...} }`

### Get Agent Schedule
**GET** `/api/tasks/agent/:agent`
- Returns tasks assigned to specific agent (fill, kai, zip, mira, luna)
- Response: `{ success, agent, tasks: [...], workload: N, efficiency: N }`

### Complete Task
**POST** `/api/tasks/:taskId/complete`
```json
{
  "quality_score": 0.95,
  "notes": "Task completed successfully"
}
```
- Response: `{ success, taskId, quality, completionTime }`

---

## 🎮 Seasonal Events (4 endpoints)

### Get Active Events
**GET** `/api/events/active`
- Returns currently active seasonal events with progress tracking
- Response: `{ success, events: [...] }`

### Get Active Challenges
**GET** `/api/events/challenges`
- Returns all challenges from active events
- Response: `{ success, challenges: [{eventId, eventName, id, title, target, progress, ...}, ...] }`

### Update Event Progress
**POST** `/api/events/progress/:eventId`
```json
{
  "player_id": "player123",
  "progress_data": {
    "completed": 5,
    "score": 1000
  }
}
```
- Response: `{ success, playerId, eventId, progress: {...} }`

### Get Leaderboard
**GET** `/api/events/leaderboard`
- Returns overall leaderboard with player rankings and achievements
- Response: `{ success, leaderboard: [{rank, player, points, achievements}, ...] }`

---

## 🚀 Deployment Management (4 endpoints)

### Start Deployment
**POST** `/api/deployments/start`
```json
{
  "version": "1.2.3",
  "environment": "staging|production|dev",
  "services": ["api-server", "web-ui", "neo4j"]
}
```
- Response: `{ success, deployment: {id, status, startTime, ...} }`

### Get Deployment Status
**GET** `/api/deployments/:deploymentId`
- Returns current deployment status and progress
- Response: `{ success, deployment: {...} }`

### Rollback Deployment
**POST** `/api/deployments/:deploymentId/rollback`
- Triggers rollback to previous successful deployment
- Response: `{ success, rollback: {id, status, ...} }`

### Get Deployment History
**GET** `/api/deployments/history/:environment?limit=50`
- Returns deployment history for environment (dev/staging/production)
- Response: `{ success, history: [{version, status, timestamp}, ...] }`

### Check Deployment Readiness
**GET** `/api/deployments/readiness/:environment`
- Checks if all services are healthy for deployment
- Response: `{ success, environment, ready: true|false, readyServices: "5/5", health: {...} }`

---

## 👥 Collaboration (3 endpoints)

### Start Collaboration
**POST** `/api/collaboration/start`
```json
{
  "type": "task-discussion|code-review|design-feedback|status-update",
  "participants": ["kai", "zip"],
  "priority": "high|medium|low"
}
```
- Response: `{ success, collab: {id, type, participants, status, ...} }`

### Add Message
**POST** `/api/collaboration/:collabId/message`
```json
{
  "author": "kai",
  "content": "Message content",
  "attachments": ["file1.txt"] // optional
}
```
- Response: `{ success, message: {id, author, content, timestamp, ...} }`

### Create Workspace
**POST** `/api/workspaces/create`
```json
{
  "name": "Sprint Planning",
  "owner": "fill",
  "members": ["kai", "zip", "mira"]
}
```
- Response: `{ success, workspace: {id, name, members, documents, ...} }`

### Get Team Summary
**GET** `/api/collaboration/team-summary`
- Returns team activity, active collaborations, document count
- Response: `{ success, activeCollaborations: N, totalWorkspaces: N, teamEngagement: {...} }`

---

## 📈 Advanced Analytics (5 endpoints)

### Track Analytics Event
**POST** `/api/analytics/track`
```json
{
  "type": "task-completion|deployment|error",
  "agent": "zip",
  "duration": 5000,
  "status": "success|failure",
  "metadata": {"task": "feature-dev", "lines_modified": 342}
}
```
- Response: `{ success, event: {id, type, agent, timestamp, ...} }`

### Get Performance Report
**GET** `/api/analytics/performance?agent=kai&hours=24`
- Returns performance metrics for agent in time period
- Response: `{ success, period: "24h", totalEvents: N, successful: N, failed: N, successRate: %, avgDuration: ms, eventsByType: {...}, agentPerformance: {...} }`

### Get Trends
**GET** `/api/analytics/trends?hours=24`
- Returns hourly trend data for performance analysis
- Response: `{ success, period: "24h", trends: {hour: {events, successful, avgDuration}, ...}, overallTrend: "stable|degrading|improving" }`

### Get Insights
**GET** `/api/analytics/insights?priority=high`
- Returns actionable insights filtered by priority
- Response: `{ success, insights: [{title, description, priority, recommendation, timestamp}, ...] }`

### Get Health Score
**GET** `/api/analytics/health`
- Returns overall system health score (0-100)
- Response: `{ success, score: N, status: "excellent|good|needs-attention", successRate: %, criticalIssues: N }`

---

## 💾 Backup & Disaster Recovery (5 endpoints)

### Create Backup
**POST** `/api/backups/create`
```json
{
  "database": "neo4j|redis|kafka",
  "type": "full|incremental|snapshot"
}
```
- Response: `{ success, backup: {id, database, type, status, location, ...} }`

### Get Backup Status
**GET** `/api/backups/:backupId`
- Returns current backup status and details
- Response: `{ success, backup: {id, status, verified, retention, ...} }`

### Restore Backup
**POST** `/api/backups/:backupId/restore`
- Initiates restore operation from backup
- Response: `{ success, restoreId, backupId, database, estimatedTime, status }`

### Get Backup History
**GET** `/api/backups/history/:database?limit=50`
- Returns backup history for database
- Response: `{ success, history: [{id, timestamp, type, status, size}, ...] }`

### Get Backup Statistics
**GET** `/api/backups/statistics`
- Returns overall backup statistics and compliance status
- Response: `{ success, totalBackups: N, completed: N, failed: N, totalSize: GB, averageSize: GB, retentionCompliance: true|false, byDatabase: {...}, oldestBackup: DATE, newestBackup: DATE }`

### Get Disaster Recovery Status
**GET** `/api/recovery/status`
- Returns disaster recovery readiness status
- Response: `{ success, status: "ready|testing-needed", recoveryPlans: N, testedPlans: N, plansNeedingTest: [...], overallReadiness: % }`

---

## 🔒 Audit Logging

### Commit audit trail (development provenance)
- **POST** `/api/audit/commit` — record a commit audit entry
- **GET** `/api/audit/commits` — list recorded commits
- **GET** `/api/audit/summary` — aggregate commit statistics
- **POST** `/api/audit/backfill` — backfill audit entries from git history

### Security audit events (requires `ceo` role)
- **GET** `/api/audit/stats` — event statistics
- **GET** `/api/audit/events?limit=100` — recent events
- **GET** `/api/audit/events/user/:username` — events for a user
- **GET** `/api/audit/events/type/:type` — events by type
- **GET** `/api/audit/events/severity/:severity` — events by severity
- **GET** `/api/audit/events/ip/:ip` — events from an IP
- **GET** `/api/audit/search?q=...` — full-text search
- **GET** `/api/audit/export/csv` · **GET** `/api/audit/export/json` — export
- **POST** `/api/audit/clear-old` — prune old events

---

## ⚡ OpenClaw Autonomous Execution (3 endpoints)

### Execute Command
**POST** `/api/openclaw/command`
```json
{
  "agent": "fill|kai|zip|mira|luna",
  "command": "start-task|pause-task|resume-task|complete-task|get-status|execute-memory-query|trigger-analysis|collect-metrics",
  "params": {}
}
```
- Response: `{ success, command: {id, agent, command, status: "pending|executing|completed|failed", timestamp, ...} }`

### Get Command Status
**GET** `/api/openclaw/command/:commandId`
- Returns current command execution status
- Response: `{ success, command: {id, status, result, executionTime, ...} }`

### Get Command History
**GET** `/api/openclaw/history?agent=kai&limit=50`
- Returns command history with optional agent filter
- Response: `{ success, commands: [{id, agent, command, timestamp, status, ...}, ...], total: N }`

### Get Execution Statistics
**GET** `/api/openclaw/stats`
- Returns command execution statistics
- Response: `{ success, totalCommands: N, successful: N, failed: N, successRate: %, avgExecutionTime: ms, byAgent: {...}, byCommand: {...} }`

### Cancel Command
**POST** `/api/openclaw/command/:commandId/cancel`
- Cancels pending command
- Response: `{ success, commandId, status: "cancelled" }`

### Clear History
**POST** `/api/openclaw/clear`
- Clears all command history
- Response: `{ success, message: "History cleared" }`

---

## 🔄 Memory & Knowledge Base (2 endpoints)

### Query Memory
**POST** `/api/memory/query`
```json
{
  "agent": "kai",
  "topic": "previous-decisions|project-context|team-knowledge",
  "filters": {}
}
```
- Response: `{ success, results: [...], cached: true|false }`

### Add Decision
**POST** `/api/memory/add-decision`
```json
{
  "agent": "kai",
  "decision": "Decision rationale and details"
}
```
- Response: `{ success, decision_id: "dec_...", stored_at: TIMESTAMP }`

---

## 📊 Dashboard & Overview (2 endpoints)

### Get Dashboard
**GET** `/api/dashboard`
- Returns main dashboard data (task overview, agent status, cost metrics)
- Response: `{ success, overview: {...}, agents: {...}, cost_optimization: {...}, performance: {...} }`

### Get Agent Status
**GET** `/api/agents/status`
- Returns detailed status for all agents
- Response: `{ success, agents: [{name, role, status, tasks_completed, efficiency}, ...], team_efficiency, total_decisions_recorded }`

---

## 💰 Cost Management (1 endpoint)

### Get Cost Dashboard
**GET** `/api/cost/dashboard`
- Returns cost optimization metrics and budget tracking
- Response: `{ success, cost_optimization: {total_reduction: "87%", breakdown: {...}, costs: {daily: {...}, monthly: {...}}, by_agent: [...]} }`

---

## 📝 Backlog Management (2 endpoints)

### Create Backlog Item
**POST** `/api/backlog/create`
```json
{
  "title": "Feature title",
  "description": "Feature description",
  "priority": "high|medium|low",
  "assigned_to": "zip",
  "story_points": 8,
  "sprint": "sprint-1"
}
```
- Response: `{ success, item: {id, title, status: "new", created_at, ...} }`

### Get Backlog
**GET** `/api/backlog?sprint=sprint-1`
- Returns backlog items, optionally filtered by sprint
- Response: `{ success, items: [...], total: N, by_priority: {...} }`

---

## 🐛 Issue Tracking (2 endpoints)

### Create Issue
**POST** `/api/issues/create`
```json
{
  "title": "Issue title",
  "description": "Issue description",
  "severity": "high|medium|low",
  "assigned_to": "kai",
  "blocking_task": "backlog-id"
}
```
- Response: `{ success, issue: {id, status: "open", created_at, ...} }`

### Get Issues
**GET** `/api/issues?status=open`
- Returns issues, optionally filtered by status
- Response: `{ success, issues: [...], total: N, open: N, in_progress: N, resolved: N }`

---

## 🕸️ P2P Knowledge Graph — Newsgroup 2.0

The sovereign P2P stack (see `docs/P2P-THREAT-MODEL.md`). All routes are
registered from `src/integrations/lightrag/`.

### Sovereign identity (`identity.ts`)
- **POST** `/api/identity/register` — register a handle, returns a self-certifying `did:vpc:` DID
- **GET** `/api/identity` — list identities
- **GET** `/api/identity/resolve/:did` · **GET** `/api/identity/handle/:handle` — resolve
- **POST** `/api/identity/:did/rotate` — hash-chained Ed25519 key rotation
- **POST** `/api/identity/credentials` · **POST** `/api/identity/credentials/verify` — verifiable credentials

### Value chain (`value-chain.ts`)
- **GET** `/api/value/balance/:did` — BigInt token balance
- **GET** `/api/value/supply` — supply + conservation invariant
- **POST** `/api/value/transfer` — node-signed transfer
- **POST** `/api/value/transfer/submit` — self-custodied (client-signed) transfer
- **GET** `/api/value/transfers/:did` — history
- **GET** `/api/value/blocks` · **POST** `/api/value/blocks/seal` — block log
- **GET** `/api/value/state-root` — current sparse-Merkle state root
- **GET** `/api/value/proof/:did` — O(log n) SMT account proof, verifiable against any block's `stateRoot`

### BFT consensus (`consensus.ts` + `consensus-network.ts`)
- **GET** `/api/consensus/status` — height, round, phase, leader, quorum
- **GET** `/api/consensus/chain` — finalized blocks with quorum certificates
- **GET** `/api/consensus/validators` · **POST** `/api/consensus/validators` — validator set
- **POST** `/api/consensus/propose` — receive a signed block proposal (peer-to-peer)
- **POST** `/api/consensus/vote` — receive a signed vote; follow-up votes propagate to peers

### Users & wallet (`user-api.ts`)
- **POST** `/api/users/register` — one-field onboarding: DID + welcome bonus + session token
- **GET** `/api/users/:handle` — profile
- **GET** `/api/users/:handle/challenge` · **POST** `/api/users/:handle/session` · **DELETE** `/api/users/:handle/session` — Ed25519 challenge-response or node-held login
- **GET** `/api/users/:handle/wallet` — balance + history
- **POST** `/api/users/:handle/send` — send tokens by handle
- **GET** `/api/users/:handle/credentials` — exportable identity proof
- **GET** `/api/node/status` — node health, supply, conservation, consensus state

### Feed (`feed-api.ts`)
- **GET** `/api/feed?orderBy=attention|time` — enriched feed (attention scores, reaction counts)
- **GET** `/api/feed/stream` — Server-Sent Events live stream
- **GET** `/api/feed/trending?hours=24` · **GET** `/api/feed/search?q=...`
- **POST** `/api/feed/publish` — publish a claim
- **GET** `/api/feed/:id` · **GET** `/api/feed/:id/reactions`
- **POST** `/api/feed/:id/react` — like/share/reply/validate; mints a token reward to the author; 409 on duplicate

### Sovereign voting (`sovereign-voting.ts`)
- **POST** `/api/sovereign-votes/proposals` — create proposal (identity or stake weighted)
- **GET** `/api/sovereign-votes/proposals` · **GET** `/api/sovereign-votes/proposals/:id`
- **POST** `/api/sovereign-votes/proposals/:id/vote` — signed vote
- **POST** `/api/sovereign-votes/proposals/:id/close` — close + Merkle-certified tally

---

## Response Format

All endpoints return JSON with standard structure:
```json
{
  "success": true|false,
  "error": "Error message (if success=false)",
  "data": {}
}
```

## Status Codes
- **200** - Success
- **400** - Bad request
- **404** - Not found
- **500** - Server error

## Rate Limiting
- No rate limiting for localhost (development)
- Production: 100 requests/minute per IP

## Authentication
- Currently disabled for development
- Production: JWT token required in `Authorization: Bearer <token>` header
