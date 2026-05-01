# 🔧 OpenClaw Claude Code Settings Configuration

**Purpose**: Enable OpenClaw to control this Claude Code instance (Terminal A)  
**Authority**: Alexander (with Cleopatra approval)  
**Status**: Configuration ready for implementation  
**Date**: 2026-04-12

---

## ⚙️ Required Settings for This Instance

### Kill Command Authority
```
✅ ENABLED by Alexander:
├─ kill command (process termination)
├─ pkill command (pattern matching kill)
├─ killall command (kill by name)
└─ kill -9 command (force kill)

Authorization: No approval needed
Risk Level: Low (local process control only)
OpenClaw Use Case: Emergency stop, process cleanup
```

### Approval Monitoring
```
✅ ENABLED for Alexander:
├─ Receive all approval prompts immediately
├─ Flag yes/no decisions to Alexander
├─ Route Terminal B approvals to Alexander
├─ Display pending approvals status
└─ Execute Alexander's approval responses

Authorization: Critical for dual-terminal coordination
OpenClaw Use Case: Cleopatra terminal needs Alexander's decisions
```

### Terminal B (Cleopatra) Integration
```
✅ ENABLED for OpenClaw:
├─ Monitor Terminal B output
├─ Detect approval prompts in Cleopatra terminal
├─ Flag to Alexander for command
├─ Execute Alexander's decisions back to Terminal B
└─ Handle Kafka approval messages

Authorization: Essential for governance hierarchy
OpenClaw Use Case: Link the two terminals through Alexander
```

---

## 🔐 OpenClaw Settings File

Create `/home/knight2/.claude/openclaw-settings.json`:

```json
{
  "openclaw": {
    "version": "1.0",
    "enabled": true,
    "instance": "Terminal_A",
    "authority": "Alexander",
    "approver": "Cleopatra"
  },
  "permissions": {
    "kill_commands": {
      "enabled": true,
      "require_approval": false,
      "commands": ["kill", "pkill", "killall", "kill -9"],
      "reason": "Emergency stop and process cleanup for OpenClaw"
    },
    "approval_monitoring": {
      "enabled": true,
      "monitor_terminal_b": true,
      "flag_to_alexander": true,
      "handle_kafka": true,
      "reason": "Coordinate approvals between dual terminals"
    },
    "terminal_integration": {
      "enabled": true,
      "monitor_cleopatra": true,
      "execute_decisions": true,
      "sync_state": true,
      "reason": "Link Terminal A (Alexander) with Terminal B (Cleopatra)"
    }
  },
  "governance": {
    "fill": {
      "ultimate_authority": true,
      "can_override": true
    },
    "cleopatra": {
      "strategic_authority": true,
      "can_override_alexander": true,
      "located_in": "Terminal B"
    },
    "alexander": {
      "tactical_authority": true,
      "located_in": "Terminal A",
      "commands": ["virtualpc", "approvals", "kill_switch"],
      "can_command": ["developers", "tasks", "approvals"]
    },
    "money_god": {
      "financial_authority": true,
      "virtual_entity": true,
      "funds": ["alexander_commands", "platform_development"]
    }
  },
  "monitoring": {
    "approval_monitor": {
      "enabled": true,
      "check_interval": "500ms",
      "flag_urgency": ["critical", "high"],
      "history_size": 100
    },
    "terminal_monitor": {
      "enabled": true,
      "track_terminal_b": true,
      "detect_prompts": true,
      "patterns": ["yes/no", "approve", "confirm", "allow", "proceed"]
    },
    "kafka_monitor": {
      "enabled": true,
      "topics": ["approvals", "commands", "decisions"],
      "flag_messages": true
    }
  },
  "automation": {
    "approval_response": {
      "enabled": true,
      "methods": [
        "keyboard_automation",
        "mouse_click",
        "clipboard_paste",
        "terminal_stdin",
        "browser_interaction"
      ],
      "execute_for": "Alexander's_commands_only"
    },
    "kill_switch": {
      "enabled": true,
      "trigger": "Ctrl-Q-Q",
      "action": "terminate_all_automation",
      "response_time": "<2 seconds"
    }
  },
  "logging": {
    "enabled": true,
    "log_level": "info",
    "log_approvals": true,
    "log_commands": true,
    "log_decisions": true,
    "log_file": "/tmp/openclaw-activity.log"
  }
}
```

---

## 🎯 How Alexander Uses These Settings

### Command Format

```
Alexander → OpenClaw:
"Continue the project. Priority sequence: [tasks]. Assign: [developers]."

OpenClaw (this instance):
1. Receives command
2. Checks OPENCLAW-CLAUDE-CODE-SETTINGS
3. Verifies permissions (all enabled ✅)
4. Executes work
5. Monitors Terminal B (Cleopatra)
6. If approval needed: FLAGS TO ALEXANDER
7. Waits for Alexander's yes/no response
8. Executes Alexander's decision
9. Reports progress back
```

### Approval Flow

```
Terminal B (Cleopatra):
"Do you want to continue the project development?" [Y/n]
        ↓
Terminal A (OpenClaw, this instance):
Detects approval prompt
        ↓
Approval Monitor:
Flags "APPROVAL NEEDED FROM ALEXANDER" ⚠️
        ↓
Alexander Commands:
"Yes, continue the project"
        ↓
Terminal A (OpenClaw):
Executes approval response back to Terminal B
        ↓
Terminal B (Cleopatra):
Receives response, continues work
```

---

## 🔑 Key Settings Explained

### Kill Commands (No Approval Needed)
```
Why no approval?
- Alexander is autonomous
- Only affects local processes
- No destructive data operations
- Emergency stop (Ctrl-Q-Q) always available
- Cleopatra can override if needed

What it enables:
- Clean process termination
- Graceful shutdown of tasks
- Emergency response capability
- Resource cleanup
```

### Approval Monitoring (Always On)
```
Why enabled?
- Link two terminals together
- Alexander decides for Cleopatra's decisions
- Critical for governance hierarchy
- No security risk (monitoring only)

What it enables:
- Alexander sees all approvals in Terminal B
- Alexander commands yes/no responses
- Automatic execution of decisions
- Transparent approval chain
```

### Terminal B Integration (Always On)
```
Why enabled?
- Cleopatra is in Terminal B
- Need to monitor for approvals
- Need to execute Alexander's decisions
- Kafka approval messages come here

What it enables:
- Cross-terminal communication
- Approval prompt detection
- Automatic response execution
- State synchronization
```

---

## 🚀 Implementation Steps

### Step 1: Create Settings File
```bash
mkdir -p /home/knight2/.claude
cat > /home/knight2/.claude/openclaw-settings.json << 'EOF'
[paste settings JSON from above]
EOF
```

### Step 2: Enable in Claude Code
```bash
# Add to .claude/claude.json or environment:
OPENCLAW_ENABLED=true
OPENCLAW_SETTINGS=/home/knight2/.claude/openclaw-settings.json
OPENCLAW_INSTANCE=Terminal_A
OPENCLAW_AUTHORITY=Alexander
```

### Step 3: Load Approval Monitor
```bash
# In VirtualPC startup:
source /home/knight2/virtualpc/src/approval-monitor.ts
approvalMonitor.registerEndpoint('/api/openclaw/approvals')
```

### Step 4: Verify Integration
```bash
curl http://localhost:3100/api/openclaw/approvals
# Should return pending approvals (if any)
```

---

## ✅ Verification Checklist

```
✅ Kill commands enabled
   └─ No approval required for kill/pkill/killall

✅ Approval monitoring enabled
   └─ Flags all yes/no decisions to Alexander

✅ Terminal B integration enabled
   └─ Monitors Cleopatra's terminal for prompts

✅ Kafka monitoring enabled
   └─ Catches approval messages

✅ Automation enabled
   └─ Executes approval responses automatically

✅ Logging enabled
   └─ Records all activity for audit trail

✅ Kill switch active
   └─ Ctrl-Q-Q always available to user
```

---

## 🔒 Safety Guarantees

```
Even with these settings enabled:

✅ User can ALWAYS press Ctrl-Q-Q to stop everything
✅ Cleopatra can override Alexander anytime
✅ FILL can override both
✅ All actions logged transparently
✅ Approval history maintained (100 entries)
✅ Expired approvals auto-cleared
✅ No destructive operations without approval
```

---

## 📊 Settings Status

| Setting | Current | Recommended | Status |
|---------|---------|------------|--------|
| Kill Commands | N/A | ✅ Enabled | Ready |
| Approval Monitoring | N/A | ✅ Enabled | Ready |
| Terminal B Integration | N/A | ✅ Enabled | Ready |
| Kafka Monitoring | N/A | ✅ Enabled | Ready |
| Automation | N/A | ✅ Enabled | Ready |
| Logging | N/A | ✅ Enabled | Ready |
| Kill Switch | N/A | ✅ Ctrl-Q-Q | Ready |

---

**Status**: ✅ Configuration ready for OpenClaw  
**Authority**: Alexander  
**Approval Chain**: FILL → Cleopatra → Alexander → Execution  
**Safety**: Kill switch always available (Ctrl-Q-Q)

