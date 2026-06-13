# VirtualPC API Documentation

Complete reference for VirtualPC REST API.

## Base URL

```
http://localhost:3100/api
```

## Interactive API Docs (OpenAPI)

A machine-readable OpenAPI 3.0 spec covers the auth, audit, dashboard, and
security endpoints, with an interactive Swagger UI:

```
GET /api/openapi.json   # the spec (also served statically at /openapi.json)
GET /api/docs           # Swagger UI (try-it-out console)
```

The spec declares a `bearerAuth` scheme — the bearer token is the `sessionId`
returned by `POST /api/auth/login`. CEO/role-gated routes carry an explicit
`security` requirement; `POST /api/auth/login` and `POST /api/auth/2fa/verify`
are the only public routes.

## Authentication

### Bearer Token
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3100/api/auth/profile
```

### API Key
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3100/api/data
```

## Response Format

All responses are JSON with consistent structure:

```json
{
  "status": "ok|error",
  "data": {},
  "error": "Error message (if status=error)",
  "timestamp": "2026-04-12T10:30:00Z"
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 204 | No Content - Successful delete |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing/invalid auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Internal error |

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

**Request:**
```bash
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### POST /auth/register
Create new account.

**Request:**
```bash
curl -X POST http://localhost:3100/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "secure123",
    "name": "New User"
  }'
```

### Dashboard

#### GET /analytics/dashboard
Get dashboard statistics.

**Response:**
```json
{
  "status": "ok",
  "stats": {
    "totalRequests": 1234567,
    "averageLatency": 8.3,
    "p99Latency": 9.8,
    "errorRate": 0.001,
    "cacheHitRate": 0.40,
    "activeUsers": 150,
    "throughput": 1050
  }
}
```

#### GET /analytics/performance
Get performance metrics.

**Response:**
```json
{
  "status": "ok",
  "performance": {
    "apiLatency": {
      "p50": 5.2,
      "p95": 8.1,
      "p99": 9.8
    },
    "throughput": {
      "requestsPerSecond": 1050,
      "peakRPS": 1500
    },
    "cache": {
      "hitRate": "40.0",
      "size": "2.5GB"
    }
  }
}
```

### Backlog

#### GET /backlog
List all backlog items.

**Query Parameters:**
- `status`: Filter by status (open, in-progress, done)
- `priority`: Filter by priority (low, medium, high)
- `sprint`: Filter by sprint
- `limit`: Items per page (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "status": "ok",
  "count": 150,
  "items": [
    {
      "id": "task123",
      "title": "Implement feature X",
      "priority": "high",
      "status": "in-progress",
      "assigned_to": "user456",
      "created_at": "2026-04-12T10:00:00Z"
    }
  ]
}
```

#### POST /backlog/create
Create new backlog item.

**Request:**
```bash
curl -X POST http://localhost:3100/api/backlog/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New feature",
    "description": "Feature description",
    "priority": "high",
    "sprint": "week1",
    "assigned_to": "user123"
  }'
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "id": "task789",
    "title": "New feature",
    "created_at": "2026-04-12T11:30:00Z"
  }
}
```

#### PUT /backlog/:id
Update backlog item.

**Request:**
```bash
curl -X PUT http://localhost:3100/api/backlog/task123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "done",
    "priority": "medium"
  }'
```

#### DELETE /backlog/:id
Delete backlog item.

```bash
curl -X DELETE http://localhost:3100/api/backlog/task123
```

### Issues & Blockers

#### GET /issues
List all issues.

**Response:**
```json
{
  "status": "ok",
  "issues": [
    {
      "id": "issue123",
      "title": "API timeout",
      "severity": "high",
      "status": "open",
      "blocking_task": "task456"
    }
  ]
}
```

#### POST /issues/create
Report new issue.

**Request:**
```bash
curl -X POST http://localhost:3100/api/issues/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Performance degradation",
    "description": "API latency increased",
    "severity": "high",
    "blocking_task": "task123"
  }'
```

### Team Collaboration

#### GET /collaboration/users
List online team members.

**Response:**
```json
{
  "status": "ok",
  "users": [
    {
      "id": "user123",
      "name": "John Doe",
      "status": "online",
      "lastSeen": "2026-04-12T11:30:00Z"
    }
  ]
}
```

#### GET /collaboration/activity
Get team activity log.

**Query Parameters:**
- `limit`: Max items (default: 50)
- `userId`: Filter by user

**Response:**
```json
{
  "status": "ok",
  "activity": [
    {
      "userId": "user123",
      "action": "create",
      "resource": "task",
      "timestamp": "2026-04-12T11:30:00Z"
    }
  ]
}
```

### Memory (LightRAG)

#### POST /memory/query
Search team knowledge base.

**Request:**
```bash
curl -X POST http://localhost:3100/api/memory/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "authentication best practices"
  }'
```

**Response:**
```json
{
  "status": "ok",
  "results": [
    {
      "type": "decision",
      "content": "Use JWT for stateless auth",
      "timestamp": "2026-04-01T10:00:00Z"
    }
  ]
}
```

#### POST /memory/add
Add fact to knowledge base.

**Request:**
```bash
curl -X POST http://localhost:3100/api/memory/add \
  -H "Content-Type: application/json" \
  -d '{
    "type": "best_practice",
    "content": "Always validate user input",
    "tags": ["security", "validation"]
  }'
```

## Rate Limiting

All API calls are rate-limited.

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2026-04-12T11:05:00Z
```

### Limits by Tier
| Tier | Requests/min | Burst |
|------|-------------|-------|
| Free | 10 | 15 |
| Pro | 100 | 150 |
| Enterprise | 1000 | 1500 |

### Rate Limit Error
```json
{
  "status": "error",
  "message": "Too many requests",
  "retryAfter": 45
}
```

## Pagination

Use `limit` and `offset` for pagination:

```bash
GET /api/backlog?limit=20&offset=0    # Items 0-19
GET /api/backlog?limit=20&offset=20   # Items 20-39
GET /api/backlog?limit=20&offset=40   # Items 40-59
```

## Filtering

All list endpoints support filtering:

```bash
GET /api/backlog?status=open&priority=high&sprint=week1
```

## Sorting

Sort by field with `-` prefix for descending:

```bash
GET /api/backlog?sort=-created_at     # Newest first
GET /api/backlog?sort=priority         # Ascending
```

## Error Handling

### Error Response Format
```json
{
  "status": "error",
  "error": "Invalid request",
  "details": {
    "field": "email",
    "message": "Email is required"
  }
}
```

### Common Errors
- **Missing required field**: 400
- **Invalid format**: 400
- **Resource not found**: 404
- **Unauthorized**: 401
- **Permission denied**: 403
- **Rate limited**: 429
- **Server error**: 500

## Webhooks

Subscribe to events:

```bash
curl -X POST http://localhost:3100/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/webhook",
    "events": ["task.created", "task.updated", "task.deleted"]
  }'
```

### Events
- `task.created` - Task created
- `task.updated` - Task updated
- `task.deleted` - Task deleted
- `user.mentioned` - User mentioned
- `comment.created` - Comment added
- `issue.created` - Issue reported

## Examples

### Get Tasks for Current Sprint
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3100/api/backlog?sprint=week1&status=open"
```

### Update Task Status
```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}' \
  http://localhost:3100/api/backlog/task123
```

### Create Issue and Link to Task
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Connection timeout",
    "severity": "high",
    "blocking_task": "task123"
  }' \
  http://localhost:3100/api/issues/create
```

## Changelog

### v1.0.0 (2026-04-12)
- Initial release
- Authentication endpoints
- Backlog management
- Analytics dashboard
- Team collaboration
- Knowledge base (LightRAG)

## Support

For API issues:
- Email: api-support@virtualpc.com
- Slack: #api-support
- GitHub Issues: https://github.com/your-org/virtualpc/issues
