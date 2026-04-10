# VirtualPC Quick Start Guide

## Start the System

```bash
# Build and start VirtualPC
cd /home/knight2/virtualpc
npm run build
npm start

# Open in browser
open http://localhost:3100
```

## Dashboard Overview

### Main Pages
- 📊 **Dashboard** - System status, OpenClaw controls, agent status
- 📑 **Tasks** - Per-agent task scheduling, efficiency metrics
- 📋 **Backlog** - 10 items with priority colors
- ⚠️ **Issues** - 2 active issues with blocking references
- 🔢 **Numerai** (NEW!) - Competition data, eligible shares, data quality
- 🧠 **Memory** - Neo4j knowledge base status
- ⚙️ **Settings** - System health, infrastructure metrics

## Quick Actions

### Fetch Numerai Data Manually
```bash
# Via UI
1. Click "🔢 Numerai" in sidebar
2. Click "🔄 Fetch Daily Data" button
3. Wait for success message

# Via API
curl -X POST http://localhost:3100/api/numerai/fetch-daily
```

### View Agent Status
```bash
# In Dashboard
1. See agent models: Kai (Qwen 27B), Zip (Qwen 14B), Luna (DeepSeek R1), etc.
2. See workload: tasks assigned, completion status
3. See efficiency: % of time actively working

# Via API
curl http://localhost:3100/api/dashboard
```

### Monitor Task Facilitation
```bash
# See if tasks are hanging
curl http://localhost:3100/api/tasks/facilitate/status

# Returns:
# - Current workload per agent
# - Pending/blocked/escalated task counts
# - Average task age
# - Overdue task count
```

### Trigger Agent Commands
```bash
# Via Dashboard OpenClaw buttons
1. Click "🤖 Kai Status" / "👨‍💻 Zip Status" etc.
2. See response in status box

# Via API
curl -X POST http://localhost:3100/api/openclaw/command \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "kai",
    "command": "get-status",
    "params": {}
  }'
```

## Key Metrics to Monitor

### Data Quality
```bash
curl http://localhost:3100/api/numerai/data-quality

# Returns:
# - Completeness: 98% (how much data available)
# - Timeliness: 95% (how fresh the data is)
# - Accuracy: 92% (data validation score)
# - Last fetch: ISO timestamp
```

### Agent Workload
```bash
curl http://localhost:3100/api/tasks/facilitate/status | jq '.workload'

# Example output:
# {
#   "fill": {"current": 0, "max": 5, "availability": 5, "utilization": 0%},
#   "kai": {"current": 2, "max": 5, "availability": 3, "utilization": 40%},
#   "zip": {"current": 3, "max": 5, "availability": 2, "utilization": 60%},
#   "mira": {"current": 1, "max": 5, "availability": 4, "utilization": 20%},
#   "luna": {"current": 4, "max": 5, "availability": 1, "utilization": 80%}
# }
```

## Numerai Competition Tracking

### View Tracked Shares
```bash
curl http://localhost:3100/api/numerai/eligible-shares | jq '.securities[] | {ticker, asset_class}'

# Shows 45 tracked: BTC, ETH, BNB, SOL, AAPL, MSFT, etc.
```

### View Active Competitions
```bash
curl http://localhost:3100/api/numerai/competitions

# Shows:
# - Competition name
# - Participant count
# - Prize pool
# - Submission deadline
```

## Local Model Configuration

All agents use local models on 3090 GPUs:

| Agent | Primary Model | Fallback | Use Case |
|-------|--------------|----------|----------|
| Fill (CEO) | Qwen 27B | Claude Opus | Strategic planning |
| Kai (CTO) | Qwen 27B | Claude Opus | Architecture |
| Zip (Dev) | Qwen 14B | Claude Sonnet | Feature development |
| Mira (Artist) | Phi 4 15B | Claude Opus | Creative design |
| Luna (Tech) | DeepSeek R1 8B | Claude Sonnet | Performance optimization |

## Daily Automatic Tasks

✅ **Every 24 hours**:
1. Fetch Numerai data (securities, signals, competitions)
2. Update entity model (FactSet-style)
3. Store to EDB database
4. Update data quality metrics

✅ **Every 10 seconds**:
1. Check for hanging tasks
2. Detect overdue (>60s) tasks
3. Reassign to less-loaded agents
4. Escalate critical failures to CEO

✅ **Every 30 seconds**:
1. Rebalance workload across agents
2. Update efficiency metrics
3. Log system health

## Troubleshooting

### Tasks Hanging?
```bash
# Check facilitator status
curl http://localhost:3100/api/tasks/facilitate/status | jq '.stats'

# If overdue_tasks > 0:
# - Facilitator automatically reassigns (within 10 seconds)
# - CEO is notified after 2 minutes
# - Check agent logs for specific errors
```

### Low Data Quality?
```bash
# Check data quality
curl http://localhost:3100/api/numerai/data-quality | jq '.current'

# If completeness < 95%:
# - Manual fetch might be needed
# - Check internet connection to data sources
# - Verify EDB database is accessible
```

### Agent Not Responding?
```bash
# Get OpenClaw stats
curl http://localhost:3100/api/openclaw/stats | jq '.byAgent'

# If agent has high error rate:
# - Check agent logs
# - Restart agent if needed
# - Kai can diagnose infrastructure issues
```

## Cost Savings

**Monthly Cost**: $0-10 (vs $100-300 with Claude only)

- 90% of tasks: Local models ($0)
- 10% of tasks: Claude API (for complex reasoning)
- GPU electricity: ~$2-5/month
- **Total savings**: 87-93%

## Next Steps

1. **Monitor Dashboard**: Check http://localhost:3100 regularly
2. **Review Numerai Data**: Click "🔢 Numerai" to see competition data
3. **Check Task Status**: Verify agents stay active (no hangs)
4. **View Logs**: Monitor agent efficiency metrics
5. **Set Up GitHub**: Configure remote and push to GitHub

## Useful Endpoints Reference

```bash
# Dashboard
GET /api/dashboard                    # System overview

# Numerai
GET /api/numerai/entities            # Entity stats
POST /api/numerai/fetch-daily        # Trigger fetch
GET /api/numerai/eligible-shares     # 45 tracked shares
GET /api/numerai/competitions        # Active contests
GET /api/numerai/data-quality        # 30-day metrics

# Tasks
GET /api/tasks/schedule              # All scheduled tasks
GET /api/tasks/facilitate/status     # Facilitation metrics
POST /api/tasks/facilitate/register  # Register new task

# OpenClaw
POST /api/openclaw/command           # Execute command
GET /api/openclaw/stats              # Command statistics
GET /api/openclaw/history            # Command history

# Models
GET /api/models/ollama/status        # Local model status
GET /api/models/config               # Model configuration
```

---

**For detailed documentation**, see:
- `NUMERAI-INTEGRATION.md` - Complete architecture
- `SESSION-SUMMARY.md` - What was built
- `OLLAMA-SETUP-GUIDE.md` - Local model setup
- `MULTI-MODEL-SETUP.md` - Model routing
