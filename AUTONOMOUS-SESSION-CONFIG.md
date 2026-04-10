# Autonomous Session Configuration Guide

**Purpose**: Prevent invisible stalls during long autonomous work sessions (8+ hours).

---

## The Problem (April 10, 2024)

**What Happened:**
- User: "Work 8 hours straight"
- Claude Code: Started strong, then went silent
- Result: Appeared like no work happened, even though ~2000 lines were added

**Root Cause:**
- Compacted early without clear continuation
- Long silence between activities
- No visible progress tracking
- Accumulated work output at end instead of streaming

**Solution**: Enforce continuous work patterns with server-side monitoring

---

## Configuration Overview

### Updated CLAUDE.md Rules
**File**: `/home/knight2/.claude/CLAUDE.md`

Added section: "AUTONOMOUS WORK SESSION RULES (Critical)"

**Key Rules**:
- ✅ Break work into 15-30 minute phases
- ✅ Commit after EVERY phase (not at end)
- ✅ Output progress every 5-10 minutes
- ✅ Update task status continuously
- ✅ Run `/compact` after 2-3 commits
- ❌ Never batch work before committing
- ❌ Never go silent > 5 minutes
- ❌ Never accumulate output for end

### Server-Side Session Manager
**Component**: `src/automation/autonomous-session-manager.ts`

Monitors & enforces:
- Commit frequency (max 10 min between commits)
- Progress output (max 5 min between reports)
- Task updates (one per phase)
- Context tokens (alerts at 140k, critical at 150k)
- Silence duration (alerts at 5 min silence)

### Configuration File
**File**: `src/automation/autonomous-config.json`

Controls behavior:
- Session duration (480 min default = 8 hours)
- Phase length (15-20 min per phase)
- Commit frequency (every 10 min max)
- Output frequency (every 5 min)
- Context limits (150k tokens)
- Stall detection (5 min silence max)

---

## How to Use for 8-Hour Sessions

### Step 1: Start Session

**CLI Command** (Claude Code will support):
```bash
/session-start 480
# Starts 8-hour session with default config
```

**Or via API**:
```bash
curl -X POST http://localhost:3100/api/sessions/start \
  -H "Content-Type: application/json" \
  -d '{"duration": 480}'
```

**Or programmatically**:
```typescript
sessionManager.startSession(480, {
  phaseLength: 20,
  commitMinFrequency: 10,
  outputFrequency: 5
});
```

### Step 2: Work in Phases

**Phase Structure** (repeat 32 times for 8 hours):

```
[15-20 minute phase]
├─ Implement feature / fix bug
├─ git commit "description" → sessionManager.recordCommit()
├─ TaskUpdate(in_progress, "Phase N/32...") → recordTaskUpdate()
└─ Progress report → recordProgressReport()
     ├─ What built
     ├─ Next actions
     ├─ Time elapsed
     └─ Time remaining
```

### Step 3: Monitor Session

**Check Status (anytime)**:
```bash
curl http://localhost:3100/api/sessions/stats | jq '.'

# Returns:
{
  "duration_min": "45.3",
  "phases_completed": 3,
  "commits": 9,
  "total_lines_added": 2340,
  "commits_per_phase": "3.0",
  "warnings_critical": 0,
  "context_tokens": 95000
}
```

**Check Warnings**:
```bash
curl http://localhost:3100/api/sessions/warnings | jq '.'

# Returns:
{
  "total": 2,
  "critical": 0,
  "warnings": [
    {
      "type": "no_commit",
      "severity": "warning",
      "message": "12.5 min since last commit",
      "action": "Increase commit frequency"
    }
  ]
}
```

### Step 4: After Session

**View Final Report**:
```bash
curl http://localhost:3100/api/sessions/stats | jq '.stats'

# Shows:
# - Total duration
# - Phases completed
# - Total commits
# - Lines added
# - Efficiency metrics
```

---

## API Endpoints Reference

### Start Session
```bash
POST /api/sessions/start
{
  "duration": 480,           # minutes (default: 8 hours)
  "config": {
    "phaseLength": 20,
    "commitMinFrequency": 10,
    "outputFrequency": 5,
    "maxSilenceDuration": 300000
  }
}
```

### Record Work Activities

**Record Commit** (call after each git commit):
```bash
POST /api/sessions/record-commit
{
  "message": "Add feature X core logic",
  "hash": "abc1234567890",
  "filesChanged": 3,
  "linesAdded": 250
}
```

**Record Task Update** (call when TaskUpdate):
```bash
POST /api/sessions/record-task-update
{
  "taskId": "task_123",
  "status": "in_progress",
  "activeForm": "Executing Phase 5/32..."
}
```

**Record Progress Report** (call at phase end):
```bash
POST /api/sessions/record-progress
{
  "phase": 5,
  "title": "Feature X core logic complete",
  "whatBuilt": [
    "Entity model for Securities",
    "Data fetcher pipeline",
    "EDB integration"
  ],
  "nextActions": [
    "Phase 6: API endpoints",
    "Phase 7: Frontend UI",
    "Phase 8: Documentation"
  ]
}
```

**Update Context Tokens** (call when compacting):
```bash
PUT /api/sessions/context-tokens
{
  "tokens": 95000
}
```

### Query Session

**Get Statistics**:
```bash
GET /api/sessions/stats
```

**Get Warnings**:
```bash
GET /api/sessions/warnings
```

**Stop Session**:
```bash
POST /api/sessions/stop
```

---

## What Gets Tracked

### Commits
- Message
- Git hash
- Files changed
- Lines added
- Timestamp

### Task Updates
- Task ID
- Status change
- Active form
- Timestamp

### Progress Reports
- Phase number
- What was built (list)
- Next actions (list)
- Time elapsed
- Estimated remaining

### Warnings
- Type (context_high, no_commit, silent, no_output, stalled)
- Severity (warning, critical)
- Message
- Recommended action

### Context Tracking
- Token count updates
- Alerts at 140k tokens (warning)
- Critical at 150k tokens (force compact)

---

## Warning Types & Actions

| Warning | When | Action |
|---------|------|--------|
| **context_high** | >150k tokens | IMMEDIATELY run `/compact` |
| **context_warning** | 140k tokens | Consider `/compact` soon |
| **no_commit** | >10 min since commit | Commit immediately |
| **no_output** | >5 min since report | Output progress now |
| **silent** | >5 min no activity | CRITICAL: Resume or investigate |
| **stalled** | Silent + 5 min threshold | Session marked as stalled |

---

## Example: Complete 8-Hour Session

```
09:00 START
POST /api/sessions/start {"duration": 480}

09:00-09:20 PHASE 1: Feature Core
├─ Build implementation
├─ git commit "Add feature X core" 
├─ POST /api/sessions/record-commit {message, hash, files, lines}
├─ TaskUpdate(in_progress, "Phase 1/32")
├─ POST /api/sessions/record-task-update {...}
└─ POST /api/sessions/record-progress {phase: 1, ...}
   Output:
   ✅ PHASE 1 COMPLETE
   What Built: [Feature X core]
   Next: Phase 2 integration
   Time: 20/480 min

09:20-09:40 PHASE 2: Feature Integration
├─ Build integration
├─ git commit "Integrate feature X"
├─ POST /api/sessions/record-commit {...}
├─ POST /api/sessions/record-task-update {...}
└─ POST /api/sessions/record-progress {phase: 2, ...}
   Output:
   ✅ PHASE 2 COMPLETE
   Time: 40/480 min

09:40-10:00 PHASE 3: Tests & Polish
├─ git commit "Add tests for feature X"
├─ POST /api/sessions/record-commit {...}
└─ POST /api/sessions/record-progress {phase: 3, ...}

10:00 /compact
PUT /api/sessions/context-tokens {"tokens": 65000}
Output:
✅ Context reset (65k tokens)
Continuing Phase 4...

[Continue pattern for remaining phases]

17:00 SESSION END
GET /api/sessions/stats
{
  "duration_min": "480",
  "phases_completed": 32,
  "commits": 96,
  "total_lines_added": 3840,
  "warnings_critical": 0
}
```

---

## Prevention Checklist

**Before starting 8-hour session:**
- [ ] Read CLAUDE.md autonomous rules
- [ ] Start session with `/session-start 480`
- [ ] Create TaskCreate for session
- [ ] Set timer for 15-minute phases

**During session (every phase):**
- [ ] Implement 1 feature/fix
- [ ] git commit with clear message
- [ ] Call recordCommit API
- [ ] Call recordTaskUpdate API
- [ ] Output phase completion report
- [ ] If context > 140k: run `/compact`

**Monitor (every phase):**
- [ ] Check `/api/sessions/stats`
- [ ] Review critical warnings
- [ ] Verify commits recorded
- [ ] Confirm progress reports output

**If warnings appear:**
- [ ] "no_commit" → Commit immediately
- [ ] "no_output" → Output progress now
- [ ] "context_high" → Run `/compact` now
- [ ] "silent" (5+ min) → CRITICAL: Resume or investigate

---

## Integration with Claude Code

The system will automatically:
1. Encourage commits after every phase
2. Alert on long silence (>5 min)
3. Warn when context gets large (>140k)
4. Track all progress automatically
5. Prevent invisible stalls

**Future enhancement**: Claude Code can natively integrate:
```
/session-start 480       # Start 8-hour session
/phase-complete          # Mark phase done (commits, reports)
/context-status          # Check context tokens
/session-stats          # View progress
/session-stop           # End session
```

---

## For Future Long Sessions

**Remember**:
1. Small commits > big batches
2. Progress output > silent work
3. Frequent updates > end dumps
4. `/compact` early > hit limits
5. Activity visible > invisible brilliance

This configuration will prevent "worked all night but looks like nothing happened" issues.
