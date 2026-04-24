# VirtualPC Architecture Document

**System:** VirtualPC - Autonomous Agent System with LightRAG, Kafka, and Cost Optimization
**Project:** MOLGANG Chemical Engineering Simulator
**Owner:** Edwin Hauwert 219252713
**Date:** 2026-04-23
**Version:** 3.2

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Component Architecture](#3-component-architecture)
4. [Agent System](#4-agent-system)
5. [Task Engine](#5-task-engine)
6. [Data Architecture](#6-data-architecture)
7. [Hindsight Memory Analysis](#7-hindsight-memory-analysis)
8. [Enterprise Architecture Vision](#8-enterprise-architecture-vision)
9. [Security Architecture](#9-security-architecture)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. System Overview

VirtualPC is an autonomous agent orchestration system that manages 5 AI agents (Fill, Kai, Zip, Mira, Luna) to continuously develop the MOLGANG Chemical Engineering Simulator. It serves as both the development management platform and the game's backend infrastructure.

### Core Principles

- **Autonomous operation**: agents work 24/7, progressing through tasks without human intervention
- **Paperclip white-label**: dashboard modeled after the Paperclip OSS assistant framework
- **Roblox continuity**: web game development aligned with and extending the Roblox version
- **Live forever**: task engine generates infinite work, sprints never end
- **Cost optimized**: 87% cost reduction through intelligent model routing (Tier 1/2/3)

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    VirtualPC Platform                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Dashboard (Static HTML)                  │    │
│  │  ┌──────┬────────┬─────────┬────────┬──────────┐    │    │
│  │  │ Hub  │Backlog │Agents   │MOLGANG │ System   │    │    │
│  │  │      │        │Profiles │Game    │ Status   │    │    │
│  │  └──────┴────────┴─────────┴────────┴──────────┘    │    │
│  └──────────────────────────────────────────────────────┘    │
│                            │                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Express.js API Server (:3100)            │    │
│  │                                                      │    │
│  │  ┌────────┐  ┌──────────┐  ┌──────────────────┐    │    │
│  │  │ REST   │  │ WebSocket│  │ Task Engine       │    │    │
│  │  │ Routes │  │ (Socket) │  │ (Live Agent Work) │    │    │
│  │  │ 50+    │  │ Real-time│  │ Tick every 10s    │    │    │
│  │  └────────┘  └──────────┘  └──────────────────┘    │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │         Integration Layer                     │   │    │
│  │  │  ┌─────────┐ ┌───────┐ ┌──────────────────┐ │   │    │
│  │  │  │LightRAG │ │ Kafka │ │ Model Router     │ │   │    │
│  │  │  │(Neo4j)  │ │       │ │ (3-tier routing) │ │   │    │
│  │  │  └─────────┘ └───────┘ └──────────────────┘ │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Game Layer                               │    │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────────────┐    │    │
│  │  │ Web Game  │ │ MOLGANG  │ │ Roblox DataStore │    │    │
│  │  │ /game     │ │ Web API  │ │ Sync Bridge      │    │    │
│  │  │ (HTML5)   │ │ 38+ eps  │ │ (planned)        │    │    │
│  │  └───────────┘ └──────────┘ └──────────────────┘    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌────────────┐   │
│  │ Neo4j   │  │ Redis   │  │ Kafka    │  │ Ollama     │   │
│  │ (Graph) │  │ (Cache) │  │ (Queue)  │  │ (Local AI) │   │
│  └─────────┘  └─────────┘  └──────────┘  └────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

### 3.1 API Server (`src/index.ts`)

Main Express.js application serving:
- **Static dashboard** at `/` (Paperclip white-label)
- **Game demo** at `/game` (Chemical Engineering Simulator)
- **REST API** at `/api/*` (50+ endpoints)
- **WebSocket** via Socket.io for real-time updates

### 3.2 Task Engine (`src/task-engine.ts`)

Self-sustaining work generation system:
- 5 agents with 10 task templates each (50 total)
- Tasks cycle infinitely through sprint numbers
- Each subtask completes in 60-90 seconds
- Agents always maintain 2 in-progress + 2 pending tasks
- Game milestones advance as tasks complete
- Work log records every minute under Edwin Hauwert 219252713

### 3.3 LightRAG (`src/integrations/lightrag/`)

Neo4j-backed knowledge graph for shared agent memory:
- Graceful degradation when Neo4j unavailable (offline mode)
- Query caching to reduce database hits
- Stores decisions, facts, precedents across agent sessions

### 3.4 Model Router (`src/orchestration/model-router.ts`)

3-tier intelligent model routing:
- **Tier 1 (Free)**: Qwen 27B, DeepSeek-R1, Phi-4 (via Ollama)
- **Tier 2 (Low cost)**: Mistral 7B, Llama 70B
- **Tier 3 (Premium)**: Claude Opus, GPT-4 Turbo
- Result: 87% cost reduction vs all-Tier-3

### 3.5 MOLGANG Web Integration (`src/integrations/molgang-web-integration.ts`)

38+ endpoints porting Roblox game systems to web:
- Authentication (register, login, token verify)
- Player management (profile, progress, leaderboard)
- Game sessions (start, end, action tracking)
- Educational tracking (lessons, quizzes, certifications)
- Economy simulation (market, trades, portfolios)
- Multiplayer synchronization (broadcast, nearby, trades)

---

## 4. Agent System

### 4.1 Agent Roster

| Agent | Role | Specialization |
|-------|------|----------------|
| **Fill** | CEO | Strategy, partnerships, compliance, budgets, OKRs |
| **Kai** | CTO | Infrastructure, DevOps, security, databases, platform bridges |
| **Zip** | Developer | Game features, Roblox→Web ports, advanced labs, quest systems |
| **Mira** | Creative Director | Visual design, UI/UX, NPC art, brand, sound, mobile layouts |
| **Luna** | Tech Artist | Rendering, shaders, VFX, performance, mobile optimization, testing |

### 4.2 Task Delegation

Kai (CTO) delegates performance-critical tasks to Luna via the task pipeline:
- Samsung Z Fold 5 rendering optimization
- iPhone 16 WebGL profiling
- Roblox PostProcessing → WebGL shader ports
- Fluid simulation for advanced labs
- Foldable device testing suite

### 4.3 Agent Communication

Agents share context through:
1. **LightRAG** knowledge graph (persistent decisions/facts)
2. **Kafka topics** (real-time event streaming, when enabled)
3. **Task Engine state** (shared in-memory task list)
4. **Dashboard** (human oversight via web UI)

---

## 5. Task Engine

### 5.1 Lifecycle

```
Task Pool (10 templates per agent)
  → Generate task (pending)
  → Start task (in-progress, log: task_started)
  → Tick: complete subtask (log: subtask_completed, +minutes)
  → All subtasks done: task completed (log: task_completed)
  → Agent needs work: generate next from pool
  → Pool exhausted: increment sprint, cycle back to start
```

### 5.2 Work Registration

Every agent action is logged as a timesheet entry:
```json
{
  "timestamp": "2026-04-23T11:08:40.000Z",
  "agent": "Zip",
  "role": "Developer",
  "taskId": "task-142",
  "taskTitle": "Port: Chemistry system to web",
  "subtask": "Molecule synthesis engine",
  "action": "subtask_completed",
  "minutesSpent": 120,
  "project": "MOLGANG Chemical Engineering Simulator",
  "registeredFor": "Edwin Hauwert 219252713"
}
```

### 5.3 Game Milestones

13 milestones tracking real game development progress:
- Chemistry Engine, Fertilizer Track, Economy, Quests (Roblox ports)
- Distillation Column, Reactor Kinetics, PFD Editor (web-only advanced)
- Samsung Z Fold 5, iPhone 16 PWA (mobile)
- Visual Identity, Backend Infrastructure, Rendering/VFX

Milestones advance automatically when agents complete related tasks (keyword matching).

---

## 6. Data Architecture

### 6.1 Current State

```
┌─────────────────────────────────────────────────┐
│                 Data Stores                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  Neo4j (LightRAG)                               │
│  ├── Node: decisions, facts, precedents          │
│  ├── Relationships: affects, depends_on           │
│  └── Purpose: shared agent knowledge graph       │
│                                                  │
│  Redis                                           │
│  ├── Session cache                               │
│  ├── API response cache                          │
│  ├── Rate limiting counters                      │
│  └── Real-time leaderboard                       │
│                                                  │
│  In-Memory (Task Engine)                         │
│  ├── Task state (all 5 agents)                   │
│  ├── Work log entries                            │
│  ├── Game milestones                             │
│  └── Market prices                               │
│                                                  │
│  Kafka Topics (when enabled)                     │
│  ├── agent.tasks / agent.results                 │
│  ├── model.requests / model.responses            │
│  ├── lightrag.updates                            │
│  ├── game.events                                 │
│  └── system.alerts                               │
│                                                  │
│  File System                                     │
│  ├── .backlog/ (markdown task files)             │
│  ├── logs/ (application logs)                    │
│  ├── data/ (persistent data)                     │
│  └── .backups/ (automated backups)               │
└─────────────────────────────────────────────────┘
```

### 6.2 Planned: PostgreSQL for Player Data

```sql
-- Cross-platform player progression
CREATE TABLE players (
  id UUID PRIMARY KEY,
  roblox_user_id BIGINT UNIQUE,
  web_account_id UUID UNIQUE,
  username VARCHAR(50),
  email VARCHAR(255),
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  molcoins INT DEFAULT 0,
  created_at TIMESTAMP,
  last_login TIMESTAMP
);

-- Inventory (atoms, molecules, fertilizer)
CREATE TABLE inventory (
  player_id UUID REFERENCES players(id),
  item_type VARCHAR(20), -- 'atom', 'molecule', 'fertilizer'
  item_name VARCHAR(50),
  quantity INT DEFAULT 0,
  PRIMARY KEY (player_id, item_type, item_name)
);

-- Quest progress
CREATE TABLE quest_progress (
  player_id UUID REFERENCES players(id),
  quest_id VARCHAR(20),
  status VARCHAR(20), -- 'active', 'completed', 'claimed'
  completed_at TIMESTAMP,
  PRIMARY KEY (player_id, quest_id)
);

-- Achievement tracking
CREATE TABLE achievements (
  player_id UUID REFERENCES players(id),
  achievement_id VARCHAR(50),
  unlocked_at TIMESTAMP,
  PRIMARY KEY (player_id, achievement_id)
);

-- Certifications (web-only advanced content)
CREATE TABLE certifications (
  player_id UUID REFERENCES players(id),
  cert_id VARCHAR(50),
  score DECIMAL(5,2),
  passed BOOLEAN,
  issued_at TIMESTAMP,
  PRIMARY KEY (player_id, cert_id)
);
```

### 6.3 Data Flow

```
Roblox Player → Roblox DataStore → Sync Bridge → PostgreSQL
                                                       ↓
Web Player → Web Auth → JWT → PostgreSQL ← ← ← ← ← ← ┘
                                   ↓
                              Game Session
                                   ↓
                    ┌─────────────────────────────┐
                    │  Real-time: Redis + Socket.io │
                    │  Persistent: PostgreSQL        │
                    │  Knowledge: Neo4j              │
                    │  Events: Kafka                 │
                    └─────────────────────────────┘
```

---

## 7. Hindsight Memory Analysis

### 7.1 What is Hindsight Memory?

Hindsight memory is a retrospective learning system where agents analyze completed tasks and outcomes to improve future decisions. Unlike LightRAG (which stores decisions/facts as they happen), hindsight memory performs **post-hoc analysis** of what worked, what failed, and why.

### 7.2 Current Gap

VirtualPC currently has:
- ✅ **LightRAG**: real-time knowledge graph (decisions, facts)
- ✅ **Work log**: timestamped activity record
- ✅ **Task engine**: tracks completion status
- ❌ **No retrospective analysis**: agents don't learn from past sprints
- ❌ **No pattern detection**: repeated failures aren't flagged
- ❌ **No optimization feedback**: no "this approach was 2x faster"

### 7.3 Proposed Hindsight Memory Architecture

```
┌──────────────────────────────────────────────┐
│            Hindsight Memory System            │
├──────────────────────────────────────────────┤
│                                              │
│  Sprint Review Engine (runs at sprint end)   │
│  ├── Analyze completed tasks per agent       │
│  ├── Compare estimated vs actual hours       │
│  ├── Identify patterns:                      │
│  │   - Which task types are fastest?         │
│  │   - Which agent combos work best?         │
│  │   - Where do blockers cluster?            │
│  ├── Generate "lessons learned" entries       │
│  └── Store in Neo4j as Hindsight nodes       │
│                                              │
│  Optimization Engine (runs on task start)    │
│  ├── Query: "what worked for similar tasks?" │
│  ├── Suggest: optimal tick rate for agent    │
│  ├── Recommend: task ordering by priority    │
│  └── Flag: "this task type usually blocks"   │
│                                              │
│  Anomaly Detector (runs every tick)          │
│  ├── Detect: task stuck (no progress 5min)   │
│  ├── Detect: agent idle (no active tasks)    │
│  ├── Detect: sprint velocity dropping        │
│  └── Alert: surface in dashboard             │
│                                              │
│  Knowledge Synthesis (weekly)                │
│  ├── Summarize sprint outcomes               │
│  ├── Update agent efficiency profiles        │
│  ├── Recommend workload rebalancing          │
│  └── Feed insights to Fill (CEO) for OKRs   │
│                                              │
└──────────────────────────────────────────────┘
```

### 7.4 Impact on Architecture

Adding hindsight memory would:

| Area | Current | With Hindsight | Improvement |
|------|---------|---------------|-------------|
| Task assignment | Round-robin from pool | Data-driven: assign to fastest agent for type | ~20% faster completion |
| Sprint planning | Fixed pool order | Reorder by historical velocity | Better prioritization |
| Bug detection | Manual (user notices) | Automated anomaly alerts | Faster response |
| Agent balance | CEO reviews manually | Auto-detected imbalances | Luna never idle |
| Cost optimization | Static tier routing | Dynamic: "this task doesn't need Tier 3" | Further 10-15% savings |

### 7.5 Implementation Priority

1. **Phase 1**: Anomaly detector (detect stuck agents like Luna) - 2 days
2. **Phase 2**: Sprint review engine (lessons learned) - 3 days
3. **Phase 3**: Optimization engine (smarter assignment) - 5 days
4. **Phase 4**: Knowledge synthesis (weekly reports) - 3 days

---

## 8. Enterprise Architecture Vision

### 8.1 Scale Targets

- **1M+ students** globally
- **5,000 DAU** (daily active users) on web
- **1,000 DAU** on Roblox
- **50 university partnerships**
- **99.9% uptime** SLA

### 8.2 Enterprise Architecture

```
                    ┌─────────────────────────┐
                    │    CDN (CloudFlare)      │
                    │  Static assets, game     │
                    │  Samsung Z Fold / iPhone │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   API Gateway (Nginx)    │
                    │   Rate limiting, JWT     │
                    │   TLS termination        │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                   │
    ┌─────────▼──────┐  ┌─────▼──────┐  ┌────────▼────────┐
    │ VirtualPC      │  │ Game API   │  │ Auth Service    │
    │ Dashboard +    │  │ Server     │  │ (JWT + OAuth)   │
    │ Task Engine    │  │ (gameplay) │  │                 │
    └────────────────┘  └────────────┘  └─────────────────┘
              │                 │                   │
    ┌─────────┴─────────┬──────┴───────┬───────────┘
    │                   │              │
    ▼                   ▼              ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│PostgreSQL│    │  Neo4j   │    │  Redis   │
│(Players) │    │(Knowledge│    │ (Cache)  │
│          │    │  Graph)  │    │          │
└──────────┘    └──────────┘    └──────────┘
                                       │
                               ┌───────▼──────┐
                               │   Kafka      │
                               │(Event Stream)│
                               └──────────────┘
                                       │
                            ┌──────────▼──────────┐
                            │ Roblox DataStore     │
                            │ Sync Bridge          │
                            │ (player migration)   │
                            └─────────────────────┘
```

### 8.3 Deployment Strategy

- **Kubernetes** on AWS EKS or GCP GKE
- **Auto-scaling**: 2-10 pods per service based on load
- **Blue-green deployment**: zero-downtime releases
- **Multi-region**: EU (primary), US-East (secondary)
- **GPU nodes**: for Ollama local model inference (Tier 1)

---

## 9. Security Architecture

- **Authentication**: JWT with 24h expiry + refresh tokens (7d)
- **Authorization**: Role-based (CEO, CTO, Developer, Artist, Student)
- **API Security**: Rate limiting (600 req/min), input validation, CORS
- **Data Protection**: GDPR + COPPA compliant, age-gating for web
- **Infrastructure**: TLS everywhere, secrets in environment variables
- **Audit**: All CEO actions logged, agent activity tracked
- **Kill Switch**: Emergency stop for all automation (Ctrl+Q+Q)

---

## 10. Deployment Architecture

### 10.1 Development

```bash
git clone git@github.com:febuz/virtualpc.git
cd virtualpc
npm install
cp .env.example .env
npm run dev          # Development server with ts-node
npm run build        # Compile TypeScript
npx webpack          # Build React frontend
npm start            # Production server
```

### 10.2 Docker

```bash
docker-compose up -d                    # Dev: API + Neo4j + Redis + Kafka
docker-compose -f docker-compose.production.yml up -d  # Production
```

### 10.3 Kubernetes

```bash
kubectl apply -f k8s-production-manifest.yaml
```
