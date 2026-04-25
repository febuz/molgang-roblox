# VirtualPC - New Engineer Setup Guide

**Welcome to the VirtualPC team!** This guide gets you from zero to running in under 15 minutes.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18+ (recommended: 22 LTS) | `node --version` |
| npm | 9+ | `npm --version` |
| Git | 2.30+ | `git --version` |
| Docker | 24+ (optional, for full stack) | `docker --version` |

---

## 1. Clone the Repository

```bash
# SSH (preferred - set up SSH key on GitHub first)
git clone git@github.com:febuz/virtualpc.git
cd virtualpc

# HTTPS alternative
git clone https://github.com/febuz/virtualpc.git
cd virtualpc
```

Also clone the Roblox game source for reference:
```bash
cd ..
git clone git@github.com:febuz/molgang-roblox.git
cd virtualpc
```

---

## 2. Install Dependencies

```bash
npm install
```

This installs ~641 packages including:
- Express 4.18, React 19, Socket.io 4.8
- Neo4j driver, ioredis, KafkaJS
- TypeScript 5.9, Webpack 5, Jest 29

---

## 3. Configure Environment

```bash
cp .env.example .env
```

Default `.env` works for local development. Key settings:

```env
PORT=3100                    # API server port
NODE_ENV=production          # or 'development'
NEO4J_URI=bolt://localhost:7687   # Optional: LightRAG graph DB
REDIS_HOST=localhost         # Optional: caching
KAFKA_BROKERS=localhost:9092 # Optional: message queue
```

**Note:** VirtualPC starts gracefully without Neo4j, Redis, or Kafka. These are optional for full functionality.

---

## 4. Build

```bash
# Build TypeScript backend
npm run build

# Build React frontend (webpack)
npx webpack --mode production
```

---

## 5. Start the Server

```bash
# Production mode (compiled JS)
npm start

# Development mode (ts-node, auto-reload)
npm run dev
```

The server starts at **http://localhost:3100**

You should see:
```
╔════════════════════════════════════════════════╗
║  VirtualPC Ready                               ║
║  Port: 3100                                    ║
║  Web UI: http://localhost:3100                 ║
╚════════════════════════════════════════════════╝
```

---

## 6. Verify Everything Works

### Dashboard
Open **http://localhost:3100** in your browser. You should see:
- Left sidebar with navigation (Overview, Backlog, Leaderboard, Agents, etc.)
- Agent cards showing live progress
- Paperclip assistant in the bottom-right corner

### Game Demo
Open **http://localhost:3100/game**. Interactive Chemical Engineering Simulator with:
- Hub screen with zone selection
- Atom Lab (click to collect)
- Fertilizer Factory (NPK mixing)
- Synthesis Lab (molecule crafting)
- Market Exchange (trading)

### API Health Check
```bash
curl http://localhost:3100/api/health
# Expected: {"status":"healthy","version":"1.0.0",...}
```

### Quick API Test
```bash
# All agents working?
curl http://localhost:3100/api/agents/status | python3 -m json.tool

# Task engine running?
curl http://localhost:3100/api/game/stats | python3 -m json.tool

# Work log recording?
curl http://localhost:3100/api/worklog/summary | python3 -m json.tool
```

---

## 7. LM Studio — local GPU inference for agents

VirtualPC agents run their inference through a local LM Studio server. Models live on EDS2 so they don't fill the home partition.

### Install LM Studio

Download and install from https://lmstudio.ai. The CLI is bundled:

```bash
# Add lms to PATH (once, add to your ~/.bashrc)
export PATH="$HOME/.lmstudio/bin:$PATH"
lms --version
```

### Point models at EDS2

VirtualPC expects models to live on the fast SSD. Symlink the LM Studio models directory if it isn't already:

```bash
mkdir -p /media/knight2/EDS2/lmstudio-models
# If ~/.lmstudio/models exists and isn't a symlink, move contents first
ln -sfn /media/knight2/EDS2/lmstudio-models ~/.lmstudio/models
ls -la ~/.lmstudio/models   # should show '-> /media/knight2/EDS2/lmstudio-models'
```

### Download the per-role model set

VirtualPC's per-agent router expects these model ids. Download the ones you want (they total ~64 GB):

```bash
lms get google/gemma-4-26b-a4b          # chat (Fill, Mira, Analyst, Vice, VideoProducer)
lms get mistralai/devstral-small-2-2512 # code (Kai, Zip, Luna, Atlas)
lms get qwen/qwen3.5-27b                # arbitration (Cleopatra, Alexander, MoneyGod)
lms get microsoft/phi-4                 # cheap / fast tasks
lms get deepseek/deepseek-r1-0528-qwen3-8b  # reasoning
lms get text-embedding-nomic-embed-text-v1.5  # embeddings
```

Quick start with just one model (5 GB, fast load) to get going:

```bash
lms get deepseek/deepseek-r1-0528-qwen3-8b
```

### Start the server

```bash
lms server start
lms load deepseek/deepseek-r1-0528-qwen3-8b --ttl 600
lms ps     # confirm model loaded
```

The LM Studio OpenAI-compatible API is then live at `http://127.0.0.1:1234/v1`.

### Verify VirtualPC sees it

```bash
# Health check
curl -s http://localhost:3100/api/llm/health | python3 -m json.tool

# List models as VirtualPC sees them
curl -s http://localhost:3100/api/llm/models | python3 -m json.tool

# Ask an agent something — routes to the per-role model automatically
curl -s -X POST http://localhost:3100/api/llm/chat \
     -H 'Content-Type: application/json' \
     -d '{"agent":"Fill","role":"CEO","message":"Give me a one-sentence status.","max_tokens":80}' \
     | python3 -m json.tool
```

### Per-agent model routing

Routing lives in `src/lmstudio.ts` — `AGENT_MODEL_ROUTES` maps agent → model-id substring, `TASK_TYPE_ROUTES` maps task type → substring. You can override per request with `"taskType": "chat|code|arbitration|reasoning|cheap|embedding"`.

| Agent | Default model | Rationale |
|---|---|---|
| Fill, Mira, Analyst, Vice, VideoProducer | `gemma-4-26b` | Long-form chat, narrative, concept articulation |
| Kai, Zip, Luna, Atlas | `devstral-small-2-2512` | Code + technical writing |
| Cleopatra, Alexander, MoneyGod | `qwen3.5-27b` | Arbitration / reasoning |

Graceful degradation: if LM Studio isn't running or the expected model isn't loaded, `/api/llm/chat` returns `{success: false, reason, hint}` rather than 500'ing. Dashboards can surface the hint to the engineer.

### Running alongside Blender

When Mira or VideoProducer is rendering in Blender Cycles, GPU memory gets tight. Policy:

- Blender takes precedence — LM Studio should use the less-loaded GPU, or swap to a smaller model (Phi-4, DeepSeek R1).
- Manual swap: `lms unload <big-model>; lms load microsoft/phi-4`
- Queued in Kai's pool: "GPU symbiosis: 2x RTX 3090 + Blender" will automate this via `CUDA_VISIBLE_DEVICES` rotation.

---

## 8. Full Stack (Docker)

For Neo4j + Redis + Kafka:

```bash
docker-compose up -d
```

This starts:
- **Neo4j** on port 7687 (browser: http://localhost:7474)
- **Redis** on port 6379
- **Kafka** on port 9092 (with Zookeeper)
- **VirtualPC** on port 3100

---

## 9. Project Structure

```
virtualpc/
├── src/                    # TypeScript backend source
│   ├── index.ts            # Main Express server + all routes
│   ├── task-engine.ts      # Live task engine (12 agents, persists to EDS2)
│   ├── lmstudio.ts         # LM Studio (local Gemma/Phi/Qwen) wrapper + retry
│   ├── token-tracker.ts    # Per-agent token usage (single source: agent-registry)
│   ├── commits-tracker.ts  # Git commit attribution per agent
│   ├── timeseries.ts       # CSV → stats / Pearson / z-score anomalies
│   ├── agent-registry.ts   # The 12-agent canonical roster
│   ├── auth/, security/, analytics/, integrations/, orchestration/, utils/
│   └── game/               # Game systems (seasonal events, PvP)
├── client/                 # React frontend (SPA)
├── public/                 # Static dashboards + games (served by Express)
│   ├── world.html          # WebGPU 3D world (VirtualV manifest renderer)
│   ├── game.html           # 2D zone-based MOLGANG hub
│   ├── game3d.html         # 3D open-world demo
│   ├── game-rts.html       # RTS factory builder
│   ├── logos/              # Cleopatra, Alexander, MoneyGod SVG marks
│   └── assets/
│       └── virtualv-manifest.json  # © VirtualV Holding B.V. asset catalog
├── dist/                   # Compiled backend + dashboard HTML
│   └── public/index.html   # The VirtualPC dashboard
├── docs/                   # Architecture, setup, agent charters
│   ├── VIRTUALPC-ARCHITECTURE.md
│   ├── ENGINEER-SETUP-GUIDE.md
│   ├── CHEMICAL-ENGINEERING-GAME-ENGINE.md
│   ├── GAME-ENGINE-REFERENCES.md
│   ├── important-files.md
│   ├── CLEOPATRA-AUTHORITY.md / ALEXANDER-PRINCIPLES.md / ...
│   └── API-DOCUMENTATION.md / API-ENDPOINTS.md
├── deploy/                 # All deployment artifacts (since 2026-04-25)
│   ├── docker-compose.yml / .gpu.yml / .production.yml
│   ├── Dockerfile / Dockerfile.gpu / Dockerfile.nginx / Dockerfile.production
│   ├── k8s-deployment.yaml / k8s-molgang-deployment.yaml / k8s-production-manifest.yaml
│   ├── nginx.conf
│   ├── prometheus.yml
│   └── virtualpc.service
├── scripts/                # Operational scripts
│   ├── setup.sh / start.sh / stop.sh / quick-start.sh
│   ├── deploy.sh / deploy-production.sh
│   ├── lmstudio-watchdog.sh / install-lmstudio-watchdog.sh
│   ├── run-testplay.sh
│   ├── capture-roblox-assets.py  # Roblox → VirtualV manifest extractor
│   └── gpu-clean.sh / health-check.sh / launch-virtualpc.sh / ...
├── tests/                  # Jest + Selenium tests
│   └── testplay/           # Playwright agent-driven game playthroughs
├── package.json / tsconfig.json / jest.config.js / webpack.config.js   # tooling at root
├── README.md / SECURITY.md
└── .env
```

---

## 10. Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (ts-node) |
| `npm run build` | Compile TypeScript |
| `npm start` | Start production server |
| `npx webpack` | Build frontend bundle |
| `npm test` | Run Jest tests |
| `npm run lint` | ESLint check |
| `npm run docker:up` | Start Docker stack |

---

## 11. Key API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard (Paperclip white-label) |
| `GET /game` | Playable web game demo |
| `GET /api/health` | System health |
| `GET /api/agents/status` | All agents with live task data |
| `GET /api/progress/:name` | Agent progress (Fill, Kai, Zip, Mira, Luna) |
| `GET /api/backlog` | All backlog items (live from task engine) |
| `GET /api/backlog/per-person` | Per-agent task breakdown |
| `GET /api/backlog/item/:id` | Task detail with subtasks |
| `GET /api/game/milestones` | Game development milestones |
| `GET /api/game/stats` | Sprint, task count, progress |
| `GET /api/worklog` | Agent time registration |
| `GET /api/worklog/summary` | Per-agent minutes/tasks summary |
| `GET /api/metrics` | System metrics (live) |
| `GET /api/molgang/*` | Game API (auth, player, economy, sessions) |

---

## 12. Architecture References

- **Engine Design**: `docs/CHEMICAL-ENGINEERING-GAME-ENGINE.md`
- **System Architecture**: `docs/VIRTUALPC-ARCHITECTURE.md`
- **API Documentation**: `API-DOCUMENTATION.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Security**: `SECURITY.md`

---

## 13. Git Workflow

```bash
# Feature branch
git checkout -b feature/my-feature
# ... make changes ...
npm run build && npm test
git add -A
git commit -m "Add my feature"
git push -u origin feature/my-feature
# Create PR on GitHub
```

Remotes:
- `origin`: git@github.com:febuz/molgang-roblox.git (shared repo)
- `virtualpc`: git@github.com:febuz/virtualpc.git (VirtualPC-specific)

---

## 14. Troubleshooting

**Server won't start:**
- Check `PORT=3100` in `.env`
- Run `lsof -i :3100` to check if port is occupied
- Neo4j/Redis not needed - server starts without them

**Build errors:**
- Run `npm install` to ensure dependencies
- Check Node.js version: `node --version` (needs 18+)
- TypeScript version: `npx tsc --version`

**Game page blank:**
- Ensure `/public/game.html` exists
- Check `curl http://localhost:3100/game` returns HTML
- Try hard refresh: Ctrl+Shift+R

**Dashboard shows stale data:**
- Task engine ticks every 10 seconds
- Hard refresh: Ctrl+F5
- Check logs: `tail -f /tmp/virtualpc.log`

---

**Welcome aboard! Ask any agent for help - they're always working.**
