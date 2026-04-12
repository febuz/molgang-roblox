# 🤖 OpenClaw Autonomous Workflow Configuration

**Version**: 1.0  
**Date**: 2026-04-12  
**Status**: Active Configuration  
**Scope**: Dual Claude Code Terminal Management (No New Instances)

---

## ⚠️ EMERGENCY KILL SWITCH

### Ctrl-Q-Q: Instant Automation Stop

**CRITICAL SAFETY FEATURE**

When user presses **Ctrl+Q** twice rapidly (within 1 second):

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  CTRL-Q-Q DETECTED - EMERGENCY STOP INITIATED       │
├─────────────────────────────────────────────────────────┤
│ ACTION: Kill all automated processes immediately        │
│ • Terminate all Selenium WebDriver instances            │
│ • Stop all mouse movement / GUI automation              │
│ • Kill all running OpenClaw tasks                       │
│ • Release keyboard/mouse control to user                │
│ • Abort current demo/automation                         │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**

```bash
# Global key listener (runs continuously)
listen_for_kill_switch() {
  while true; do
    if detect_ctrl_q_q_press; then
      echo "⚠️  CTRL-Q-Q DETECTED - EMERGENCY STOP"
      
      # Kill all automation processes
      pkill -f selenium-launcher
      pkill -f molgang-game-demo
      pkill -f interactive-demo
      pkill -f chrome.*webdriver
      pkill -f firefox.*webdriver
      
      # Stop mouse control
      disable_openclaw_mouse_control
      
      # Release automation
      stop_all_automation_threads
      
      # Return control to user
      echo "✅ Control returned to user"
      echo "📝 All automation stopped"
      
      # Wait for next command
      break
    fi
    sleep 0.1
  done
}
```

**Behavior After Ctrl-Q-Q:**
- ✅ All Selenium instances closed
- ✅ All mouse automation stopped
- ✅ All GUI interaction halted
- ✅ All running tasks killed
- ✅ Keyboard/mouse control returned to user
- ✅ Terminals remain active for user input
- ✅ No cleanup required (processes killed, not paused)

**Recovery:**
After pressing Ctrl-Q-Q, user can:
```bash
# Check what stopped
ps aux | grep -E 'selenium|webdriver|demo'

# Manually restart specific component
npm run demo:molgang

# Or resume normal workflow
npm run dev
```

**Usage Scenarios:**
- 🚨 Demo goes haywire (infinite loop, unresponsive)
- 🎮 User needs immediate mouse control
- 🔧 Need to stop all automation for manual testing
- ⚡ Emergency debugging (pause to inspect state)
- ❌ Unexpected behavior (stop before damage)

**DO NOT USE unless:**
- Automation is unresponsive
- GUI is stuck in infinite loop
- Need immediate user control
- Emergency situation

---

## 📋 Core Rules

### 1. Context Management (Token Budget: 200k max)

**AUTOMATIC TRIGGERS:**
```
Current Tokens < 100k   → Continue freely (healthy zone)
100k ≤ Tokens < 120k    → Plan next `/compact` timing
120k ≤ Tokens < 130k    → Expedite `/compact` (next 5 minutes)
130k+ Tokens            → IMMEDIATE `/compact` (do not delay)
Hard Limit: 150k tokens → Emergency stop point
```

**RECOGNITION PATTERN:**
OpenClaw must monitor token usage after every 5-10 tool executions and:
- Estimate current context size from tool results
- Detect when approaching 130k threshold
- Trigger `/compact` proactively (before user requests)
- Continue work immediately after compaction

### 2. Approval Request Elimination

**COMMANDS THAT NEVER NEED APPROVAL:**
```
✅ Read operations:  ls, wc, find, grep, cat, head, tail
✅ File creation:    Write, Edit, mkdir, touch
✅ Dev tools:        npx, npm run, yarn, cargo
✅ Infrastructure:   docker *, redis-server, service *
✅ Shell commands:   echo, cd, pwd
✅ Safe cleanup:     rm (non-recursive), unlink
```

**COMMANDS THAT REQUIRE APPROVAL:**
```
⚠️ Destructive:      git reset --hard, rm -rf, git push --force
⚠️ Infrastructure:   kill -9, deployment changes, secret management
⚠️ External:         API calls to non-local services
```

**OPENCLAW BEHAVIOR:**
- Skip approval for safe commands completely
- Never ask user for these approvals
- Log all skipped approvals in `/tmp/openclaw-approvals.log`

### 3. Continuous Development (Dual Terminal)

**TERMINAL ASSIGNMENTS:**
```
Terminal A (Primary):  VirtualPC development
Terminal B (Secondary): MOLGANG game web version development
```

**ACTIVATION RULES:**
```
IF idle_threads >= 90:
  - Activate Terminal B for parallel work
  - Check backlog for next task
  - Continue Phase N+1 without waiting
ELSE:
  - Continue primary terminal work
```

**CHECK FREQUENCY:**
- Every 10 minutes: Check idle thread count
- Every phase (15-30 min): Check backlog for new items
- Every commit: Update task status (TaskUpdate)

### 4. Automatic Compaction Workflow

**RECOGNITION PATTERN:**
```
WHEN token_usage >= 130k:
  1. Recognize compaction is needed
  2. Output: "Triggering automatic compaction (token usage: 135k/200k)"
  3. Execute: /compact
  4. Immediately continue work (no user input needed)
  5. Show progress: git log --oneline -3, Phase summary
```

**AFTER COMPACTION:**
```
✅ CONTEXT RESET - Continuing Phase N+1...

$ git log --oneline -3
abc1234 Feature X completed
def5678 Feature Y integrated
ghi9012 Tests passing

What's Next:
- Phase N+1: [detailed next action]
- Estimated time: 15-30 minutes

Current Status:
- Build: ✅ Clean
- Tests: ✅ Passing
- Context: ~20k tokens (reset)
```

**DO NOT:**
- ❌ Ask user for confirmation
- ❌ Wait for input after `/compact`
- ❌ Create new conversation
- ❌ Stop work flow

### 5. Phase Workflow Structure

**PHASE DURATION:** 15-30 minutes max per phase

**PHASE TEMPLATE:**
```
Phase N (HH:MM - HH:MM)
├─ Task 1: [specific action]
├─ Task 2: [specific action]
├─ Commit → git commit -m "description"
├─ TaskUpdate → Mark task status
└─ Report: ✅ Done. Time: MM/480min

[Check token usage]
IF token_usage >= 130k → /compact
THEN → Continue Phase N+1 immediately
```

**COMMIT FREQUENCY:**
- After every 10-15 minutes of work
- After every feature completion
- Never batch > 30 minutes of work
- Git log should show commits every 5-10 minutes

---

## 🎯 Task Management

### Task Status Tracking
```bash
# Start of phase
TaskCreate({
  subject: "Phase N: [Feature description]",
  description: "Detailed work for this phase",
  activeForm: "Executing Phase N..."
})

# During phase (every 10 min)
TaskUpdate(taskId, {
  status: "in_progress",
  activeForm: "Executing Phase N (30 min completed)..."
})

# End of phase
TaskUpdate(taskId, {
  status: "completed"
})
```

### Backlog Location
```
/home/knight2/virtualpc/.backlog/
├── high-priority.md      (Immediate next tasks)
├── medium-priority.md    (Secondary phase tasks)
└── low-priority.md       (Enhancement ideas)
```

---

## 🔄 QWEN Token Integration

**API Setup:**
```
QWEN_API_KEY=<1-million-daily-tokens>
QWEN_ENDPOINT=https://api.qwen.io/v1
QWEN_MODEL=qwen-2.5-72b
```

**Usage Tracking:**
- Log all QWEN calls to `/tmp/qwen-usage.log`
- Display daily token budget remaining
- Warn when usage > 80% of daily budget
- Pause non-critical requests at 90%+

---

## 🚀 OpenClaw Instance Control

**STRICT RULES:**
```
✅ ALLOWED:
  - Control Terminal A (Primary Claude Code)
  - Control Terminal B (Secondary Claude Code)
  - Execute commands in both terminals
  - Chain work between terminals

❌ FORBIDDEN:
  - Start NEW Claude Code instances
  - Create Terminal C, D, E, etc.
  - Spawn new processes
  - Fork new shell sessions
  - Maximum instances: 2 ONLY
```

**VIOLATION DETECTION:**
```bash
# OpenClaw must prevent new instances
new_instance_detected=false
for pid in $(pgrep -f "claude.*code"); do
  if ! in_allowed_terminals; then
    echo "🚨 ALERT: Unauthorized Claude Code instance detected (PID: $pid)"
    kill -9 $pid
    log_violation "New instance attempted"
  fi
done
```

---

## 📊 Performance Targets

**Development Velocity:**
- Commits per hour: 4-6 (one every 10-15 min)
- Lines of code per hour: 100-200
- Features per 8-hour session: 3-5 complete features
- Test coverage maintained: 80%+
- Build time: < 5 seconds

**Responsiveness:**
- Response time to tasks: < 2 minutes
- Phase completion accuracy: 100%
- Approval request count: 0 (eliminated)
- Context window violations: 0

---

## 🔍 Monitoring & Logging

**Log Files:**
```
/tmp/openclaw-approvals.log   → Skipped approvals
/tmp/qwen-usage.log           → Token usage
/tmp/phase-progress.log       → Phase timings
/tmp/context-monitor.log      → Token warnings
```

**Status Check Every 10 Minutes:**
```bash
echo "=== OpenClaw Status ($(date)) ==="
echo "Terminal A: $(ps aux | grep '[c]laude.*code' | head -1)"
echo "Terminal B: $(ps aux | grep '[c]laude.*code' | tail -1)"
echo "VirtualPC: $(lsof -i :3100 | tail -1)"
echo "Tokens Used: $(wc -w < /tmp/context-size.txt)"
echo "Commits Today: $(git log --oneline --since='today' | wc -l)"
```

---

## ✅ Quick Reference

### When User Runs `/compact`
1. OpenClaw detects the command
2. Waits for compaction to complete
3. Immediately continues work
4. Shows Phase summary with git log
5. No user input needed

### When Token Usage Hits 130k
1. OpenClaw recognizes threshold
2. Outputs warning: "Compaction needed (135k/200k tokens)"
3. Executes `/compact` automatically
4. Continues workflow immediately
5. Logs the proactive compaction

### When Backlog Item Found
1. Claim task from backlog
2. Create TaskCreate for the item
3. Move to next available terminal
4. Execute Phase 1 immediately
5. Report progress every 5-10 minutes

### When Approval Normally Requested
1. OpenClaw checks approval matrix
2. If in "safe commands" list → Skip approval completely
3. Execute command immediately
4. Log the execution
5. Continue work flow

---

## 🎓 Example Scenario

**Time: 14:30 - 14:45 (Phase 1)**
```
OpenClaw: "Starting Phase 1 (UI enhancement)"
Task: TaskCreate({subject: "UI auto-refresh"...})

[15 minutes of work]

$ git commit -m "Implement 5-second UI auto-refresh"
$ git log --oneline -1
abc1234 Implement 5-second UI auto-refresh

OpenClaw: "✅ Phase 1 Complete. Time: 15 min. Next: Integration"
Task: TaskUpdate({status: "in_progress", activeForm: "Phase 2..."})
```

**Time: 14:45 - 15:00 (Phase 2)**
```
[Check token usage: 95k - continue freely]
[Check backlog: MOLGANG feature available]

Terminal A: Continue VirtualPC Phase 2
Terminal B: Pick up MOLGANG task if 90+ idle threads

[10 minutes work on both terminals]

$ git commit -m "Integrate UI with API"
Token Check: 115k - getting close to limit, plan next compact

OpenClaw: "Phase 2 complete. Monitoring tokens (115k/200k)"
```

**Time: 15:00 - 15:15 (Phase 3 - Compaction Triggered)**
```
[Token usage: 127k → Approaching limit]
[OpenClaw: "Compaction needed (127k/200k)"]
/compact
[Context resets to 20k tokens]

OpenClaw: "✅ CONTEXT RESET - Continuing Phase 3..."
$ git log --oneline -3
abc1234 Integrate UI with API
def5678 Implement 5-second refresh
ghi9012 Add task-status endpoint

Next: Phase 3 - Testing & Validation
Time Remaining: 435 minutes
Build: ✅ Clean (0 errors)
```

---

## 🛠️ Implementation Checklist

- [x] Define approval elimination rules
- [x] Create compaction trigger logic
- [x] Setup dual terminal management
- [x] Configure token monitoring
- [x] Create logging structure
- [x] Document task workflow
- [ ] Deploy OpenClaw agent controller
- [ ] Test compaction automation
- [ ] Validate approval skipping
- [ ] Monitor dual terminal execution

---

**Configuration Status**: ✅ Ready for OpenClaw Integration  
**Last Updated**: 2026-04-12  
**Next Step**: Deploy OpenClaw as autonomous controller for both Claude Code terminals
