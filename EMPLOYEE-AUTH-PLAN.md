# Employee Authentication & Role-Based Access Plan

## Overview

Implement employee login system with role-based access control and CEO command interface.

## System Architecture

### 1. Employee Roles

```
┌─────────────────────────────────────────┐
│ ADMIN ROLES                              │
├─────────────────────────────────────────┤
│ Fill (CEO)          - Full system access  │
│ Kai (CTO)           - Infrastructure mgmt │
├─────────────────────────────────────────┤
│ SPECIALIST ROLES                        │
├─────────────────────────────────────────┤
│ Zip (Developer)     - Dev task interface │
│ Mira (Artist)       - Design interface   │
│ Luna (Tech Artist)  - Performance tuning │
└─────────────────────────────────────────┘
```

### 2. Feature Requirements

#### A. CEO Command Interface
- **Location**: Front page of VirtualPC dashboard
- **Access**: Fill (CEO) only
- **Input**: Text command box for direct system execution
- **Logging**: All commands logged with:
  - IP address
  - Device ID (browser fingerprint)
  - Session ID (unique to login)
  - Timestamp (date + time)
  - Location (IP geolocation)
  - Command executed
  - Result/output
  - Status code

#### B. Employee Login System
- **Methods**: Username + password, or API key for automation
- **Session Management**: JWT tokens with 24-hour expiry
- **MFA**: Optional 2FA for CEO/CTO roles
- **Audit Trail**: All login/logout events logged

#### C. Role-Based Command Access

| Command | CEO | CTO | Dev | Artist | TechArt |
|---------|-----|-----|-----|--------|---------|
| start-deployment | ✅ | ✅ | ❌ | ❌ | ❌ |
| rollback | ✅ | ✅ | ❌ | ❌ | ❌ |
| get-status | ✅ | ✅ | ✅ | ✅ | ✅ |
| start-task | ✅ | ✅ | ✅ | ✅ | ✅ |
| modify-budget | ✅ | ✅ | ❌ | ❌ | ❌ |
| update-design | ❌ | ❌ | ❌ | ✅ | ❌ |
| optimize-performance | ❌ | ❌ | ❌ | ❌ | ✅ |

#### D. Specialist Input Forms

**For Zip (Developer)**
- Task creation
- Feature request submission
- Bug reporting
- Sprint planning

**For Mira (Artist)**
- Design specifications
- Asset uploads
- Style guide updates
- Visual feedback

**For Luna (Tech Artist)**
- Performance metrics
- Optimization recommendations
- Rendering parameters
- Quality metrics

### 3. Database Schema (MongoDB/Neo4j)

```typescript
interface Employee {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'ceo' | 'cto' | 'developer' | 'artist' | 'tech-artist';
  firstName: string;
  lastName: string;
  avatar?: string;
  department: string;
  active: boolean;
  createdAt: Date;
  lastLogin?: Date;
  mfaEnabled?: boolean;
  apiKeys?: string[];
}

interface Session {
  id: string;
  employeeId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
  location?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

interface CommandLog {
  id: string;
  sessionId: string;
  employeeId: string;
  command: string;
  parameters?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
  location?: {
    country: string;
    city: string;
  };
  timestamp: Date;
  executionTime: number;
  status: 'success' | 'failure' | 'unauthorized';
  result?: any;
  errorMessage?: string;
}
```

### 4. API Endpoints

#### Authentication
- `POST /api/auth/login` - Employee login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/register` - Admin register new employee (CEO only)
- `POST /api/auth/mfa-setup` - Enable 2FA
- `POST /api/auth/mfa-verify` - Verify MFA code

#### CEO Commands
- `POST /api/ceo/command` - Execute CEO command
- `GET /api/ceo/command-history` - View command history
- `GET /api/ceo/system-status` - Full system overview
- `GET /api/ceo/audit-log` - Access audit trail

#### Employee Dashboards
- `GET /api/dashboard/developer` - Dev-specific metrics
- `GET /api/dashboard/artist` - Art-specific metrics
- `GET /api/dashboard/tech-artist` - Performance metrics
- `POST /api/developer/task-create` - Dev task creation
- `POST /api/artist/design-submit` - Design submission
- `POST /api/tech-artist/optimization` - Optimization input

### 5. UI Changes

#### Login Page (New)
```
┌─────────────────────────────────────┐
│       VirtualPC Employee Login       │
│                                     │
│  Username: [________________]       │
│  Password: [________________]       │
│                                     │
│  [ ] Remember me                    │
│  [ ] Enable 2FA                     │
│                                     │
│  [      LOGIN      ]                │
│                                     │
│  Forgot password? | Register        │
└─────────────────────────────────────┘
```

#### Dashboard with Role Badge
```
┌─────────────────────────────────────┐
│ VirtualPC     👤 Fill (CEO)  ⚙️     │
├─────────────────────────────────────┤
│                                     │
│  ┌─ CEO Command Interface ────────┐ │
│  │                                │ │
│  │  Execute Command:              │ │
│  │  ┌────────────────────────────┐│ │
│  │  │ start-deployment prod ...  ││ │
│  │  └────────────────────────────┘│ │
│  │                                │ │
│  │  [ Execute ]  [ Clear ]        │ │
│  │                                │ │
│  │  Status: Command executing...  │ │
│  │  Device ID: abc123def...       │ │
│  │  Session ID: sess_456...       │ │
│  │  Location: US, San Francisco   │ │
│  │  IP: 203.0.113.42              │ │
│  │  Time: 2026-04-10 00:15:30 UTC │ │
│  │                                │ │
│  └────────────────────────────────┘ │
│                                     │
│  Recent Commands:                   │
│  • get-status (success)             │
│  • rollback prod (success)          │
│  • start-deployment (pending)       │
│                                     │
└─────────────────────────────────────┘
```

#### Artist/Developer Input Forms
```
For Mira (Artist):
┌─────────────────────────────────────┐
│ Design Input - Asset Upload         │
├─────────────────────────────────────┤
│ Asset Type: [Texture    ▼]          │
│ File: [Choose file...   ] [Upload]  │
│ Description: [__________________]   │
│ Style Guide: [__________________]   │
│ Tags: [__________________]          │
│                                     │
│ [Submit Design]                    │
└─────────────────────────────────────┘
```

### 6. Security Measures

- **Password Requirements**: 12+ chars, mixed case, numbers, symbols
- **Rate Limiting**: Max 5 login attempts per 15 minutes
- **Session Timeout**: 24 hours or inactivity 2 hours
- **IP Whitelist**: Optional per role (CEO/CTO)
- **Audit Logging**: All actions logged immutably
- **HTTPS Required**: TLS 1.3 minimum
- **CORS**: Restricted to trusted domains
- **CSRF Protection**: Token validation on forms
- **Input Validation**: Sanitize all command inputs

### 7. Geolocation Tracking

For each remote access:
1. Reverse IP lookup (MaxMind GeoIP2 or similar)
2. Store location: Country, City, Coordinates
3. Alert on unusual locations
4. Require re-authentication for new locations (optional)

### 8. Implementation Phases

**Phase 1: Employee Auth (2 hours)**
- Create Employee model
- Implement login/logout endpoints
- Session management with JWT

**Phase 2: CEO Command Interface (1.5 hours)**
- Frontend input box
- Command parser
- Role-based authorization

**Phase 3: Audit Logging (1 hour)**
- Command logging
- Geolocation lookup
- Audit trail visualization

**Phase 4: Specialist Dashboards (1.5 hours)**
- Developer dashboard
- Artist dashboard
- Tech Artist dashboard

**Phase 5: Testing & Security (1 hour)**
- Security audit
- Load testing
- MFA setup

---

## Current Status

✅ Task Scheduler - ready
✅ Backlog/Issues - ready
✅ Memory System - ready
⏳ Employee Auth - planned
⏳ CEO Command Interface - planned
⏳ Specialist Dashboards - planned

## Next Steps

1. Implement Employee model and authentication
2. Create login UI
3. Add CEO command interface
4. Integrate with OpenClaw execution
5. Set up audit logging
6. Deploy and test

---

## Expected Results

- 5 authorized employee roles
- CEO can execute system commands from UI
- All remote access logged with metadata
- 100% command audit trail
- 99.9% uptime guarantee
- < 500ms command execution
- Full GDPR compliance
