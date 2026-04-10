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

## 🔒 Security & Audit Logging (5 endpoints)

### Log Audit Event
**POST** `/api/audit/log`
```json
{
  "user_id": "user123",
  "action": "login|logout|file-access|permission-change",
  "resource": "system|file|user",
  "status": "success|failure",
  "details": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/...",
    "changes": {}
  }
}
```
- Response: `{ success, event: {id, timestamp, userId, action, status, ...} }`

### Get User Audit Log
**GET** `/api/audit/user/:userId?limit=100`
- Returns audit log for specific user
- Response: `{ success, log: [{timestamp, action, resource, status, ipAddress}, ...] }`

### Get Resource Audit Log
**GET** `/api/audit/resource/:resource?limit=100`
- Returns all access/modification events for resource
- Response: `{ success, log: [{timestamp, userId, action, status, changes}, ...] }`

### Get Security Alerts
**GET** `/api/security/alerts?level=warning|critical&limit=100`
- Returns security alerts filtered by level
- Response: `{ success, alerts: [{id, timestamp, level, type, description, action}, ...] }`

### Get Compliance Report
**GET** `/api/compliance/report?days=30`
- Returns compliance report for period
- Response: `{ success, period: "30 days", totalEvents: N, successRate: %, uniqueUsers: N, uniqueResources: N, failedAttempts: {...}, alerts: N }`

### Get Security Health
**GET** `/api/security/health`
- Returns security health score (0-100)
- Response: `{ success, score: N, status: "secure|at-risk|critical", failureRate: %, alerts24h: N, criticalAlerts: N }`

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
