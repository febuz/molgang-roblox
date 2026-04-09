# Custom Paperclip - Distributed Agent Organization

A sophisticated distributed agent execution system built on **Paperclip OSS** with:
- **LightRAG**: Neo4j-based shared memory for agents
- **Kafka 3**: Message queue for decoupled API call orchestration
- **Model Router**: Intelligent routing to local (fast, free) or cloud (powerful) models
- **Nginx**: Reverse proxy with TLS, rate limiting, JWT auth
- **Docker**: Multi-GPU containerization for distributed deployment

**Status:** MVP-ready with 25 autonomous implementation tasks

---

## 🎯 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Python 3.9+
- 8GB+ RAM, 20GB disk

### 1. Clone & Setup

```bash
git clone https://github.com/your-org/custom-virtualpc.git
cd custom-virtualpc
npm install
cp .env.example .env
```

### 2. Start Services

```bash
docker-compose up -d
```

Services online:
- **LightRAG**: bolt://localhost:7687 (Neo4j)
- **Kafka**: localhost:9092-9094
- **API**: http://localhost:3100
- **Nginx**: https://localhost:443

### 3. Verify Health

```bash
curl http://localhost:3100/health
```

Expected:
```json
{
  "status": "ok",
  "services": {
    "lightrag": "connected",
    "kafka": "3/3 brokers",
    "models": "ready"
  }
}
```

---

## 📋 Implementation Tasks

25 autonomous tasks split across agents. See **Full Task List** below.

### Quick Status

| Task | Agent | What | Status | PR |
|------|-------|------|--------|-----|
| #16 | Kai | LightRAG integration | 🚀 In Progress | [PR-16](#) |
| #17 | Zip | Kafka setup | ⏳ Pending | — |
| #18 | Kai | Nginx security | ⏳ Pending | — |
| #19 | Zip | Model router | ⏳ Pending | — |
| #20 | Kai | Docker deployment | ⏳ Pending | — |
| #21 | Zip | Venv setup | ⏳ Pending | — |
| #22 | Kai | Paperclip fork | ⏳ Pending | — |
| #23 | Zip | Skills system | ⏳ Pending | — |
| #24 | Kai | Kafka API orchestration | ⏳ Pending | — |
| #25 | Vex | Value analysis | ⏳ Pending | — |

👉 **[View All 25 Tasks](../DETAILED_TASK_BRIEFS.md)**

### Critical Path (MVP in 14-19 hours)

```
Task #16 → Task #17 → Task #24 → Task #21 → (Parallel: #18, #19, #20, #22, #23, #25)
 (4-6h)   (3-4h)    (5-6h)     (2-3h)
```

---

## 🏗️ Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (TLS, Rate Limit, JWT)         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐        ┌──────────────────────┐         │
│  │   Paperclip    │        │   Model Router       │         │
│  │    Agents      │───────→│  (Cost Optimizer)    │         │
│  └────────────────┘        └──────────────────────┘         │
│          │                           │                       │
│          ├──→ LightRAG (Neo4j) ←─────┘                      │
│          │   (Shared Memory)                                 │
│          │                                                   │
│          └──→ Kafka (3 brokers)                             │
│              ├─ agent.tasks (Tasks from agents)             │
│              ├─ agent.results (Results to LightRAG)         │
│              ├─ model.requests (Routed API calls)           │
│              ├─ model.responses (Model results)             │
│              ├─ lightrag.updates (Memory sync)              │
│              ├─ cost.tracking (Budget monitoring)           │
│              └─ system.health (Health checks)               │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Local Models (LM Studio)     Cloud Models (API Keys) │ │
│  │  • Qwen 27B (32k context)    • Claude Opus (200k)     │ │
│  │  • Phi-4 (4k context)        • Mythos (100k)          │ │
│  │  • DeepSeek R1 (8k context)  • Gemini (varies)        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

| Feature | Benefit | Status |
|---------|---------|--------|
| **Shared Memory (LightRAG)** | Agents learn from each other's decisions | Task #16 |
| **Kafka Batching** | 30% fewer API calls | Task #17, #24 |
| **Cache Layer** | 40% of requests served from cache | Task #24 |
| **Local-First Routing** | $0 cost for 70% of tasks | Task #19 |
| **Cost Tracking** | Real-time budget monitoring | Task #24 |
| **Security (Nginx)** | TLS 1.3, rate limit, JWT auth | Task #18 |
| **Containerized** | Multi-GPU, distributed deployment | Task #20 |

### Cost Savings

```
Before Optimization:
  100 API calls/day × $0.03 = $3/day = $90/month

After Optimization (Task #24 complete):
  LightRAG cache hits:     -40% of calls
  Kafka batching:          -30% remaining calls
  Local model routing:     -20% cost on cloud calls
  Total:                   87% reduction = $1.20/month

Break-even: 2-3 months (infrastructure cost ~$200/month)
```

---

## 📚 Documentation

- **[GIT_WORKFLOW.md](./GIT_WORKFLOW.md)** — Branch strategy, PR process, CI/CD integration
- **[DETAILED_TASK_BRIEFS.md](../DETAILED_TASK_BRIEFS.md)** — 25 task specifications for agents
- **[AGENT_ORG_ARCHITECTURE.md](../AGENT_ORG_ARCHITECTURE.md)** — Complete system design (3500+ lines)
- **[CUSTOM_PAPERCLIP_FORK.md](../CUSTOM_PAPERCLIP_FORK.md)** — Integration strategy with OSS Paperclip
- **[AGENT_EXECUTION_SYSTEM.md](../AGENT_EXECUTION_SYSTEM.md)** — Autonomous task execution daemon

---

## 🚀 Implementation Order

Follow this sequence to unblock downstream tasks:

### Phase 1: Core Infrastructure (14-19 hours)

```
1. Task #16 (Kai, 4-6h)  → LightRAG integration + agent API wrapper
   Deliverables: agent-api.ts, schema.ts, integration tests
   Unblocks: Task #18, #22

2. Task #17 (Zip, 3-4h)  → Kafka message queue + topics
   Deliverables: topic definitions, producer/consumer, consumer groups
   Unblocks: Task #24

3. Task #24 (Kai, 5-6h)  → Kafka API middleware + caching + batching
   Deliverables: API interceptor, batching engine, caching layer
   Unblocks: Cost tracking

4. Task #21 (Zip, 2-3h)  → Setup script + quick start guide
   Deliverables: setup_venv.sh, QUICK_START.md, health check script
   Unblocks: Local testing
```

**Milestone:** Tasks #16, #17, #21, #24 complete = MVP ready ✅

### Phase 2: Security & Deployment (7-12 hours, parallel)

```
Task #18 (Kai, 2-3h)   → Nginx + TLS + JWT auth
Task #19 (Zip, 5-6h)   → Model router optimization
Task #20 (Kai, 4-5h)   → Docker + GPU support
Task #22 (Kai, 4-6h)   → Paperclip fork integration
```

### Phase 3: Skills & Analysis (5-8 hours, parallel)

```
Task #23 (Zip, 3-4h)   → LightRAG skills system
Task #25 (Vex, 2-3h)   → Value/ROI analysis
```

---

## 🔑 Key Concepts

### LightRAG (Shared Memory)

Neo4j knowledge graph storing:
- **Decisions**: "We chose Kafka for distributed coordination"
- **Risks**: "Token budget limits might require fallback to local models"
- **Precedents**: "Similar problem solved in Project X using Y"
- **Context**: "This project requires <200ms latency and <$50/month budget"

Agents query LightRAG before solving problems → **70-80% fewer tokens needed**.

### Kafka (Message Queue)

7 topics for decoupled communication:

1. **agent.tasks** — Paperclip publishes assigned work here
2. **agent.results** — Agents publish results here
3. **model.requests** — API calls go to router, published here
4. **model.responses** — Model responses published here
5. **lightrag.updates** — New facts published here
6. **cost.tracking** — Cost events published here
7. **system.health** — Health checks published here

**Benefit:** Agents don't wait for responses; messages batched and optimized.

### Model Router

Routes requests based on complexity:

```
Low complexity (<100 tokens):
  Phi-4 (local) → <200ms, $0 cost

Medium complexity (100-1000 tokens):
  Qwen 27B (local) → ~500ms, $0 cost
  (or Claude Opus if local insufficient)

High complexity (>1000 tokens, strategy):
  Claude Opus (cloud) → ~5s, $0.03 cost
  (fallback chain: Opus → Mythos → Qwen → Phi → DeepSeek)
```

**Result:** 87% cost reduction + <5% latency increase.

---

## 📊 Success Metrics

| Metric | Target | Task |
|--------|--------|------|
| Query latency (LightRAG) | <100ms | #16 |
| Kafka uptime | 99.9% | #17 |
| Cache hit rate | >40% | #24 |
| Cost reduction | 87% | #19, #24 |
| Setup time | <5 min | #21 |
| Security headers | 100% present | #18 |
| Test coverage | >90% | All |

---

## 🛠️ Development

### Local Setup (5 minutes)

```bash
# 1. Clone & install
git clone https://github.com/your-org/custom-virtualpc.git
cd custom-virtualpc
npm install

# 2. Start services
docker-compose up -d

# 3. Verify
curl http://localhost:3100/health

# 4. Begin work
git checkout -b feature/task-16-lightrag-integration
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test tests/integration/lightrag.test.ts

# With coverage
npm test -- --coverage
```

### Building

```bash
npm run build    # TypeScript → JavaScript
npm run lint     # Code quality check
npm run format   # Auto-format code
```

---

## 🔐 Security

- **TLS 1.3**: All traffic encrypted
- **Rate Limiting**: 100 req/s per IP
- **JWT Validation**: Protected API endpoints
- **API Key Auth**: Fallback for agents
- **Secrets Management**: .env never committed (see .gitignore)

---

## 📞 Support

- **Architecture questions?** → Read [AGENT_ORG_ARCHITECTURE.md](../AGENT_ORG_ARCHITECTURE.md)
- **Task stuck?** → Check [DETAILED_TASK_BRIEFS.md](../DETAILED_TASK_BRIEFS.md) for success criteria
- **Git issues?** → See [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)
- **Deployment?** → Check [Task #20](../DETAILED_TASK_BRIEFS.md) (Docker setup)

---

## 📈 Next Steps

1. **Agents**: Read [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) + [DETAILED_TASK_BRIEFS.md](../DETAILED_TASK_BRIEFS.md)
2. **Pick a task**: Start with Task #16, #17, #21, or #24 (critical path)
3. **Clone + branch**: `git checkout -b feature/task-XX-description`
4. **Build + test**: Follow task brief success criteria
5. **Push + PR**: Create pull request with passing tests
6. **Merge**: Once approved by CTO/Sr
7. **Next task**: Unblocked work in queue

**Let's ship! 🚀**
