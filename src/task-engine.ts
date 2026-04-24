/**
 * Live Task Engine - agents actively progress through their tasks FOREVER.
 * When tasks complete, new ones are generated from each agent's task pool.
 * Tick rate: ~60-90s per subtask so progress is visible but not instant.
 */

import logger from './utils/logger';

interface Subtask {
  name: string;
  done: boolean;
}

interface Task {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'pending';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  sprint: string;
  estimated_hours: number;
  progress: number;
  subtasks: Subtask[];
  assigned_to: string;
  started_at?: string;
  completed_at?: string;
  _tickRate: number;
  _lastTick: number;
}

// === TASK POOLS: infinite work per agent ===
// When an agent runs out, we pick the next from the pool and push it to tasks[]

const taskPools: { [agent: string]: Array<{ title: string; priority: Task['priority']; description: string; estimated_hours: number; subtasks: string[] }> } = {
  Fill: [
    // Roblox → Web migration strategy
    { title: 'Roblox-to-Web migration roadmap', priority: 'critical', description: 'Plan the player emigration path from Roblox MOLGANG to the web Chemical Engineering Simulator. Define progression gates, data transfer, and advanced-level unlocks.', estimated_hours: 6, subtasks: ['Audit Roblox game systems', 'Map feature parity requirements', 'Define emigration triggers (level/achievement gates)', 'Plan player data migration format', 'Draft advanced web-only curriculum'] },
    { title: 'University partnership outreach', priority: 'high', description: 'Partner with Chemical Engineering departments. The web version targets students ready for university-level content after mastering Roblox basics.', estimated_hours: 5, subtasks: ['Research target universities', 'Draft partnership proposal', 'Align curriculum with ChemE standards', 'Schedule pilot meetings'] },
    { title: 'Player progression analytics', priority: 'high', description: 'Track which Roblox players reach advanced levels and are ready for web migration. Build conversion funnel dashboard.', estimated_hours: 4, subtasks: ['Define readiness metrics', 'Build conversion funnel', 'Player segment analysis', 'Graduation ceremony design'] },
    { title: 'Investor demo: web simulator', priority: 'high', description: 'Demo the Chemical Engineering Simulator showing Roblox → Web pipeline, advanced labs, and 1M student capacity projections.', estimated_hours: 3, subtasks: ['Script simulator walkthrough', 'Polish demo dashboard', 'Prepare student projection models'] },
    { title: 'Quarterly OKR planning', priority: 'critical', description: 'Set OKRs: Roblox DAU growth, web migration rate, Chemistry lesson completion, MolCoin economy health.', estimated_hours: 5, subtasks: ['Review Roblox metrics', 'Set web migration targets', 'Define chemistry curriculum KPIs', 'Publish OKR document'] },
    { title: 'COPPA & GDPR compliance', priority: 'high', description: 'Ensure both Roblox and web versions comply with child data protection. Web version needs age-gating for advanced content.', estimated_hours: 6, subtasks: ['COPPA review for Roblox', 'GDPR review for web', 'Age-gate implementation plan', 'Data flow documentation', 'Compliance sign-off'] },
    { title: 'Budget: cloud + Roblox hosting', priority: 'medium', description: 'Budget projection for scaling web simulator infrastructure alongside Roblox operational costs.', estimated_hours: 3, subtasks: ['Roblox hosting costs', 'Web cloud projection', 'CDN for Samsung/iPhone assets', 'Identify cost optimizations'] },
    { title: 'Team performance review', priority: 'medium', description: 'Review all agent output. Ensure Luna has sufficient tasks from CTO. Balance workload across Roblox and web development.', estimated_hours: 4, subtasks: ['Agent output metrics', 'Luna workload assessment', 'CTO task delegation review', 'Publish balance report'] },
    { title: 'Advanced ChemE curriculum design', priority: 'critical', description: 'Design web-only advanced levels: distillation columns, reactor kinetics, process optimization. Content beyond Roblox scope.', estimated_hours: 8, subtasks: ['Distillation column simulator', 'Reactor kinetics module', 'Process optimization puzzles', 'Lab safety training', 'Certification exam design'] },
    { title: 'Risk assessment: platform migration', priority: 'high', description: 'Evaluate risks of player migration between platforms. Ensure no data loss, account linking, and seamless UX.', estimated_hours: 4, subtasks: ['Technical risk audit', 'Player experience mapping', 'Fallback plan for failed migrations', 'Document risk mitigations'] },
    { title: 'Reinstate Cleopatra as executive authority', priority: 'critical', description: 'Restore Cleopatra role as executive authority for strategic decisions. Define reporting structure, decision rights, and integration with Fill/CEO workflow. See CLEOPATRA-AUTHORITY.md for prior charter.', estimated_hours: 3, subtasks: ['Reread existing CLEOPATRA-AUTHORITY.md', 'Update authority charter', 'Define decision scope', 'Integrate with org chart', 'Announce to team'] },
    { title: 'Reinstate MoneyGod as economy authority', priority: 'high', description: 'Restore MoneyGod role: oversees MolCoin economy, Web3 token policy, market fairness, anti-farm enforcement. Counterweight to Fill on budget decisions.', estimated_hours: 3, subtasks: ['Draft economy charter', 'Scope of authority vs Fill/Kai', 'MolCoin policy responsibilities', 'Publish org update'] },
    { title: 'Agent social profile strategy', priority: 'high', description: 'Facebook/LinkedIn-style profile system for every agent. Each agent (Fill, Kai, Zip, Mira, Luna, Cleopatra, MoneyGod) gets a creative outlet: posts, projects, achievements, followers.', estimated_hours: 5, subtasks: ['Profile schema design', 'Agent list + role descriptors', 'Privacy/visibility rules', 'Launch rollout plan'] },
    { title: 'Web version surpasses Roblox teaser', priority: 'critical', description: 'Executive plan: copy every Roblox MOLGANG element into the web version, align the entire codebase, surpass the teaser across zones, minigames, NPCs, production chains, and advanced labs.', estimated_hours: 10, subtasks: ['Element-parity audit', 'Gap analysis vs Roblox', 'Prioritized port plan', 'Validation against Roblox', 'Launch comparison page'] },
    { title: '3D ChemE equipment alignment + newest levels web-playable', priority: 'critical', description: 'Fill coordinates with VirtualPC to align all 3D chemical equipment models from the Roblox game developments (reactors, columns, heat exchangers, separators, pumps, tanks) into the web version, and ensure the newest levels are playable in the browser. Zip ports gameplay, Luna handles the 3D asset pipeline, Mira reviews visual parity.', estimated_hours: 12, subtasks: ['Inventory Roblox 3D equipment models', 'Export → glTF/Draco pipeline (Luna)', 'Port newest-level scripts to web (Zip)', 'Visual parity review (Mira)', 'Web-playable build verification', 'Sign-off checklist'] },
    { title: 'Maintain important-files list + code review rotation', priority: 'high', description: 'Fill maintains a curated list of important files in the main codebase and performs the primary code review on changes to them. Weekly review pass, quarterly refresh of the list. Junior reviewers (Zip / Kai) co-sign.', estimated_hours: 5, subtasks: ['Seed important-files.md with current critical paths', 'Set up PR label requirement for important-files changes', 'Weekly review pass', 'Quarterly list refresh', 'Publish review rubric'] },
    { title: 'Git versioning standards enforcement', priority: 'high', description: 'Ratify team-wide git standards: commit message format (conventional commits), branch naming, mandatory PR review, no force-push on main. Enforce via commitlint + husky + GitHub branch protection.', estimated_hours: 4, subtasks: ['Conventional-commits rule', 'Branch-naming convention', 'Husky pre-commit hooks', 'commitlint config', 'GitHub branch protection rules', 'Team announcement'] },
  ],
  Kai: [
    // Infrastructure for Roblox ↔ Web sync + mobile
    { title: 'Roblox DataStore ↔ Web sync bridge', priority: 'critical', description: 'Build bridge between Roblox DataStore and web database. Sync player MolCoins, inventory, quest progress, achievements across platforms.', estimated_hours: 10, subtasks: ['Roblox DataStore export API', 'Web import endpoint', 'Player account linking', 'Inventory sync logic', 'MolCoin balance reconciliation', 'Achievement transfer'] },
    { title: 'WebSocket game server', priority: 'high', description: 'Real-time WebSocket server for web Chemical Engineering Simulator. Handle multiplayer labs, live market, chat.', estimated_hours: 8, subtasks: ['Socket.io server setup', 'Room management (labs)', 'Real-time market feed', 'Chat system', 'Connection scaling with Redis'] },
    { title: 'Samsung Z Fold 5 responsive API', priority: 'high', description: 'Optimize API responses for foldable devices. Handle screen fold/unfold events, adaptive payloads for inner/outer screen.', estimated_hours: 5, subtasks: ['Fold-aware viewport detection', 'Adaptive payload sizes', 'Multi-window API support', 'Performance benchmarks Z Fold 5'] },
    { title: 'iPhone 16 PWA optimization', priority: 'high', description: 'Progressive Web App for iPhone 16: service worker, offline mode, push notifications, home screen install.', estimated_hours: 6, subtasks: ['Service worker caching', 'Offline game mode', 'Push notification setup', 'iOS PWA manifest', 'iPhone 16 performance profiling'] },
    { title: 'Chemistry simulation backend', priority: 'critical', description: 'Server-side chemistry engine: validate molecule synthesis, track reaction chains, prevent duplication exploits.', estimated_hours: 8, subtasks: ['Molecule validation API', 'Reaction chain processor', 'Anti-exploit checks', 'Periodic table data service', 'Valence rule engine'] },
    { title: 'MolCoin economy server', priority: 'high', description: 'Port Roblox EconomyManager to web: daily claims, market dynamics, trading, anti-farm protections.', estimated_hours: 7, subtasks: ['Daily claim system', 'Market price engine', 'Trade matching engine', 'Anti-farm detection', 'Economy health dashboard'] },
    { title: 'Luna task pipeline setup', priority: 'medium', description: 'CTO delegates performance and rendering tasks to Luna. Setup CI pipeline for her shader/VFX/optimization work.', estimated_hours: 4, subtasks: ['Shader build pipeline', 'VFX test harness', 'Performance regression CI', 'Luna task queue dashboard'] },
    { title: 'CI/CD: Roblox + Web deploy', priority: 'high', description: 'Unified deployment: Rojo syncs Roblox, webpack builds web, same git push deploys both.', estimated_hours: 8, subtasks: ['Rojo build step', 'Webpack web build', 'Staging environment', 'Production deploy', 'Rollback strategy'] },
    { title: 'Database: player progression DB', priority: 'high', description: 'Design schema for cross-platform player progression. Track Roblox level, web advanced labs, certifications.', estimated_hours: 6, subtasks: ['Schema design', 'Roblox data import', 'Web progression tables', 'Certification storage', 'Migration scripts'] },
    { title: 'Security: web game anti-cheat', priority: 'critical', description: 'Server-side validation for all web game actions. Prevent client-side manipulation of MolCoins, inventory, quiz answers.', estimated_hours: 7, subtasks: ['Server-side action validation', 'Rate limiting per player', 'Inventory integrity checks', 'Quiz answer validation', 'Anomaly detection alerts'] },
    { title: 'GPU symbiosis: 2x RTX 3090 + Blender', priority: 'critical', description: 'Allow VirtualPC agents and Blender to share both RTX 3090 GPUs cooperatively. Scheduler yields when Blender is active, splits GPUs across workloads, honours NVIDIA MPS where beneficial.', estimated_hours: 8, subtasks: ['nvidia-smi poll daemon', 'Evaluate MPS for agent workloads', 'Blender process detector', 'Agent GPU-yield policy', 'CUDA_VISIBLE_DEVICES rotation', 'Stress test LLM + Cycles render together'] },
    { title: 'Clone reference engine repos', priority: 'high', description: 'Clone OpenRA (Red Alert), re3 (GTA Vice City), EDuke32/Build (Duke 3D), OpenSAGE (C&C Generals) into /media/knight2/EDS2/reference-engines/ for team study.', estimated_hours: 3, subtasks: ['git clone OpenRA', 'git clone re3 / reVC', 'git clone EDuke32', 'git clone OpenSAGE', 'Per-engine study notes'] },
    { title: 'Timeseries ingestion + correlation backend', priority: 'high', description: 'User uploads CSV/Parquet timeseries; API returns correlated series from ChemE corpus and non-linear event-based anomaly explanations. Chemical engineering scope first (temp, pressure, NPK, yield, market).', estimated_hours: 12, subtasks: ['Streaming upload endpoint', 'Parser: CSV, Parquet, JSON', 'Correlation engine (Pearson, Spearman, DTW)', 'Non-linear event detector (change-point + isolation forest)', 'Anomaly explanation LLM wrapper', 'API docs + demo'] },
    { title: 'Complete token usage tracker', priority: 'high', description: 'Finish the half-built token tracking system. Verify server wiring, seed initial events, surface per-agent hourly/daily/monthly aggregates on dashboard.', estimated_hours: 4, subtasks: ['Verify token-tracker.ts integration', 'Seed events from task engine', 'Confirm /api/tokens/* endpoints', 'Validate dashboard rendering', 'Document tier routing'] },
    { title: 'VirtualPC enterprise architecture refresh', priority: 'high', description: 'Review and tighten enterprise architecture: service boundaries, event bus, persistence tier, observability, cost control, data governance for ChemE simulator at 1M-student scale.', estimated_hours: 8, subtasks: ['Current-state audit', 'Target-state diagram', 'Gap analysis', 'Migration plan', 'Decision log'] },
    { title: 'Code review sweep (non-important-files)', priority: 'high', description: 'Kai takes the heavy-lifting review for everything NOT on Fill\'s important-files list — when he has time. Best-effort, batched, focus on correctness, tests, and security. Escalate architectural concerns to Alexander.', estimated_hours: 6, subtasks: ['Triage open PRs weekly', 'Batch review non-critical PRs', 'Security pass', 'Test-coverage pass', 'Escalate architecture-affecting PRs to Alexander', 'Approve or request changes'] },
    { title: 'Commits-overview dashboard backend', priority: 'high', description: 'Mirror Token Usage: expose /api/commits/summary + /api/commits/hourly + /api/commits/by-agent + /api/commits/recent. Drive from git log of the virtualpc and molgang-roblox repos.', estimated_hours: 5, subtasks: ['git-log parser', 'Attribute commits by Co-Authored-By trailer to agent', 'Aggregations: hour/day/week/month', 'Recent-events endpoint', 'Wire to dashboard Commits page'] },
    { title: 'Load-test farm for mass-multiplayer sim', priority: 'high', description: 'Infra to spawn thousands of headless browser clients as simulated players, bootstrapping the first user base and stress-testing multiplayer capacity. Co-located with the testplay framework.', estimated_hours: 10, subtasks: ['Headless browser farm (Playwright/Chromium)', 'Orchestration via k8s Jobs', 'Scenario scripts (explore/trade/craft)', 'Concurrency targets (100→10k)', 'Observability: latency, error rate, server CPU/RAM', 'Cost-aware scheduling'] },
  ],
  Zip: [
    // Port Roblox game systems to web + build advanced levels
    { title: 'Port: Chemistry system to web', priority: 'critical', description: 'Port Chemistry.lua (50+ molecules, valence rules, element periodic table) to TypeScript web engine. Foundation for all gameplay.', estimated_hours: 12, subtasks: ['Element data model (H,O,N,C,Fe,S...)', 'Molecule synthesis engine', 'Valence rule validator', 'Periodic table component', 'Molecule tier system (basic→legendary)', 'MolCrystal legendary recipe'] },
    { title: 'Port: Fertilizer production track', priority: 'critical', description: 'Port FertilizerTrack.lua to web: NPK balance, crop types (wheat/corn/rice), heat/pressure controls, industrial-scale production.', estimated_hours: 10, subtasks: ['NPK balance system', 'Crop nutrient model', 'Heat/pressure reaction controls', 'Industrial scale-up mechanics', 'Fertilizer quality scoring'] },
    { title: 'Port: Quest system & NPC dialogues', priority: 'high', description: 'Port Quests.lua and NPCDialogues.lua: starter→advanced quest chains, Farmer Chen, Dr. Femke, Vanadis, Kwantje dialogues.', estimated_hours: 8, subtasks: ['Quest state machine', 'Starter quests (atom collection)', 'Advanced quests (5K coins)', 'NPC dialogue renderer', 'Quest dependency tree'] },
    { title: 'Port: Economy & MolCoin system', priority: 'high', description: 'Port EconomyManager: MolCoin currency, daily claims (50/day), market dynamics, production chains (atom→molecule→fertilizer).', estimated_hours: 8, subtasks: ['MolCoin wallet component', 'Daily claim system', 'Production chain logic', 'Market price visualization', 'Anti-farm protection'] },
    { title: 'Port: Minigames (Mahjong, Slag, Bubble Tea)', priority: 'medium', description: 'Port Roblox minigames to web: Mahjong tile game, Slag processing puzzle, Bubble Tea Bar, SlakkenspoorMiniGame.', estimated_hours: 10, subtasks: ['Mahjong game engine', 'Slag processing puzzle', 'Bubble Tea Bar mini-game', 'Slakkenspoor puzzle', 'Minigame reward integration'] },
    { title: 'Advanced: Distillation column simulator', priority: 'high', description: 'Web-only advanced level: interactive distillation column. Students control temperature, pressure, reflux ratio. Real ChemE calculations.', estimated_hours: 12, subtasks: ['Column visualization', 'Thermodynamic model', 'Temperature/pressure controls', 'Reflux ratio optimizer', 'Separation efficiency scoring', 'McCabe-Thiele diagram'] },
    { title: 'Advanced: Reactor kinetics lab', priority: 'high', description: 'Web-only: CSTR and PFR reactor simulations. Students design reactors, optimize conversion, analyze residence time distributions.', estimated_hours: 10, subtasks: ['CSTR simulator', 'PFR simulator', 'Conversion optimization', 'Residence time analysis', 'Reactor comparison tool'] },
    { title: 'Advanced: Process flow diagram editor', priority: 'high', description: 'Web-only: drag-and-drop PFD editor. Students design complete chemical processes connecting reactors, separators, heat exchangers.', estimated_hours: 12, subtasks: ['Drag-and-drop canvas', 'Equipment library (reactor, HX, separator)', 'Stream connections', 'Mass balance calculator', 'Energy balance calculator', 'PFD export/share'] },
    { title: 'Port: Leaderboard & achievements', priority: 'medium', description: 'Port Leaderboards.server.lua and Achievements.lua to web. Unified rankings across Roblox and web players.', estimated_hours: 6, subtasks: ['Leaderboard component', 'Achievement system', 'Cross-platform ranking merge', 'Badge display', 'Weekly/monthly resets'] },
    { title: 'Port: Inventory & recipe book', priority: 'medium', description: 'Port InventoryGui and RecipeBookGui to web. Show collected atoms, crafted molecules, discovered recipes.', estimated_hours: 6, subtasks: ['Inventory grid component', 'Recipe book browser', 'Element collection tracker', 'Molecule crafting history', 'Recipe discovery system'] },
    { title: 'RTS factory mode (Red Alert-style)', priority: 'critical', description: 'Build top-down isometric factory builder for Atom Lab / molecule production: building placement, production queues, research tree, worker/employee pathfinding, unit AI. Red Alert 2 / C&C Generals inspired.', estimated_hours: 20, subtasks: ['Isometric tile engine', 'Building placement grid', 'Production queue system', 'Research tree (10+ nodes)', 'Worker pathfinding (A*)', 'Unit AI state machine', 'Fog of war (research-gated)', 'Resource economy integration'] },
    { title: 'Roblox element parity port', priority: 'critical', description: 'Systematically port every Roblox MOLGANG element missing from web: NPCs, zones, minigames, production chains, dialogues, achievements. Align full codebase with Fill orchestrating.', estimated_hours: 16, subtasks: ['Inventory all Roblox systems', 'Map to web module structure', 'Port remaining NPCs', 'Port remaining minigames', 'Unify save format', 'Parity test suite'] },
    { title: 'Cleopatra + MoneyGod agent integration', priority: 'high', description: 'Add Cleopatra (executive) and MoneyGod (economy) as first-class VirtualPC agents: models, dashboards, task pools, dialogues, in-game NPC presence.', estimated_hours: 6, subtasks: ['Agent definitions', 'Task pool seeds', 'Dashboard cards', 'Game NPC spawns', 'Profile page wiring'] },
    { title: 'Timeseries anomaly UI (ChemE)', priority: 'high', description: 'Frontend for timeseries upload: chart viewer, correlated-series picker, anomaly timeline with causal explanations. Scoped to chemical engineering first.', estimated_hours: 10, subtasks: ['Upload widget (drag-drop CSV)', 'Multi-series chart component', 'Correlation suggestions panel', 'Anomaly timeline with event tags', 'Explanation drawer', 'Export report'] },
    { title: 'RTS research tree content', priority: 'medium', description: 'Research tree content for the factory mode: Basic Chemistry → Industrial Catalysis → Green Chemistry → Quantum Chemistry. Each node unlocks buildings/recipes/workers.', estimated_hours: 6, subtasks: ['Tech tree data model', '15 research nodes', 'Node prerequisites graph', 'Unlock rewards mapping', 'In-game tree viewer'] },
    { title: 'Agent testplay framework', priority: 'critical', description: 'Framework letting VirtualPC agents actually play the MOLGANG web game during development: mouse + keyboard control via Playwright (browser) and pyautogui (native), screenshot capture, assertion DSL. Validates features end-to-end.', estimated_hours: 12, subtasks: ['Playwright harness', 'pyautogui fallback for native windows', 'Screenshot + diff oracle', 'Scenario scripting DSL', 'Agent API: "play", "assert", "record"', 'CI integration'] },
    { title: 'Simulated player AI for load', priority: 'high', description: 'Scripted bot personas that behave like real players: explore zones, collect atoms, craft molecules, trade on market, chat. Used by the load-test farm and to seed early multiplayer sessions.', estimated_hours: 8, subtasks: ['Persona definitions (casual/trader/crafter/PvP)', 'Behavior tree per persona', 'Chat/emote generators', 'Anti-detection spacing (human-like latency)', 'Metrics reporter'] },
    { title: 'Multilingual Gemma chat for test agents', priority: 'high', description: 'Give testplay agents natural-language chat powered by open-source Gemma models. Multiple agents converse in different languages (EN, NL, DE, FR, ES, PT, ZH, JA, AR). Grounded in game state + chemistry context, routed via local inference to keep cost zero.', estimated_hours: 10, subtasks: ['Gemma 2 / Gemma 3 local serving (llama.cpp or vLLM)', 'Language pool: EN/NL/DE/FR/ES/PT/ZH/JA/AR', 'Persona + language assignment per bot', 'Chat prompt template with game state', 'Translation fallback for cross-lingual talk', 'Toxicity filter', 'Rate + cost cap per agent'] },
    { title: 'In-chat auto-translation (WeChat/YouTube style)', priority: 'high', description: 'In-game chat feature: detect source language, translate each message to the viewer\'s preferred language inline, toggle to show original. Same backend powers bot-to-bot cross-lingual understanding.', estimated_hours: 8, subtasks: ['Language auto-detect', 'Inline translated bubble UI', '"Show original" toggle', 'Per-user language preference', 'Cache translations for chat replay', 'Quality ratings / report-translation flow'] },
    { title: 'Agent profile: In-Progress drilldown + live CLI stream', priority: 'high', description: 'Dashboard UX: clicking an agent profile → "In Progress" tab shows every in-progress task with full subtask list, time-on-task, recent activity, AND the live terminal CLI commands the agent is currently executing (tailed stdout/stderr).', estimated_hours: 8, subtasks: ['Tabbed profile page (Overview / In-Progress / History)', 'In-Progress task cards with subtasks + progress bars', 'Per-agent CLI session recorder (capture exec commands)', 'WebSocket stream of live CLI output', 'Terminal-style renderer with ANSI color', 'Pause/scroll-back controls'] },
  ],
  Mira: [
    // Visual design aligned with Roblox game + web version
    { title: 'Periodic table interactive design', priority: 'high', description: 'Design interactive periodic table for web (port of PeriodicTableGui). Each element clickable with properties, uses, molecule recipes.', estimated_hours: 8, subtasks: ['Table layout design', 'Element card design', 'Element property popover', 'Color coding by category', 'Animation: element selection', 'Molecule recipe links'] },
    { title: 'Fertilizer lab UI design', priority: 'critical', description: 'Design the web fertilizer production interface. NPK mixing controls, crop selector, reaction vessel visualization, quality gauge.', estimated_hours: 10, subtasks: ['NPK slider controls', 'Crop type selector', 'Reaction vessel animation', 'Heat/pressure gauges', 'Quality score display', 'Production history chart'] },
    { title: 'NPC character designs for web', priority: 'high', description: 'Design web versions of Roblox NPCs: Farmer Chen, Dr. Femke, Vanadis, Kwantje. 2D portrait + dialogue box style.', estimated_hours: 8, subtasks: ['Farmer Chen portrait', 'Dr. Femke portrait', 'Vanadis portrait', 'Kwantje portrait', 'Dialogue box UI', 'Emotion variants (happy/sad/thinking)'] },
    { title: 'Molecule 3D visualization', priority: 'high', description: 'Design 3D molecule renderer for web: ball-and-stick models, space-filling view, rotation, zoom. Cover H2O, CO2, NH3, H2SO4, etc.', estimated_hours: 10, subtasks: ['Ball-and-stick renderer', 'Space-filling mode', 'Rotation/zoom controls', 'Element color coding', 'Bond visualization', 'Molecule info overlay'] },
    { title: 'Samsung Z Fold 5 adaptive UI', priority: 'high', description: 'Design adaptive layouts for Samsung Z Fold 5: outer screen (compact game view), inner screen (full lab), fold-aware transitions.', estimated_hours: 6, subtasks: ['Outer screen compact layout', 'Inner screen full layout', 'Fold transition animation', 'Multi-window split design', 'Touch target sizing'] },
    { title: 'iPhone 16 responsive design', priority: 'high', description: 'Design responsive layouts for iPhone 16 / 16 Pro Max: Dynamic Island integration, ProMotion animations, safe area handling.', estimated_hours: 6, subtasks: ['iPhone 16 viewport layout', 'Dynamic Island status bar', 'ProMotion smooth animations', 'Safe area / notch handling', 'Haptic feedback indicators'] },
    { title: 'Dashboard GUI port (web)', priority: 'high', description: 'Port DashboardGui from Roblox to web. Main hub showing player stats, MolCoins, active quests, recent achievements.', estimated_hours: 8, subtasks: ['Dashboard layout', 'Player stats cards', 'MolCoin counter animation', 'Quest tracker widget', 'Achievement feed', 'Quick-action buttons'] },
    { title: 'Distillation column visuals', priority: 'high', description: 'Design the web-only distillation column visualization: animated liquid flow, tray detail, temperature gradient, vapor/liquid phases.', estimated_hours: 8, subtasks: ['Column structure design', 'Liquid flow animation', 'Tray/packing detail view', 'Temperature color gradient', 'Vapor phase visualization'] },
    { title: 'Sound design: chemistry SFX', priority: 'medium', description: 'Sound effects for chemical reactions, molecule synthesis, bubbling, crystallization, equipment humming. Match Roblox AmbientSounds.', estimated_hours: 6, subtasks: ['Reaction bubbling SFX', 'Synthesis completion jingle', 'Crystallization sounds', 'Lab equipment ambient', 'Achievement unlock sound'] },
    { title: 'Marketing: Roblox → Web campaign', priority: 'medium', description: 'Design in-game banners and web landing page showing Roblox players how to migrate to advanced web Chemical Engineering Simulator.', estimated_hours: 6, subtasks: ['In-game migration banner', 'Web landing page design', 'Feature comparison graphic', 'Student testimonial template', 'App store/web screenshots'] },
    { title: 'Cleopatra logo + profile page', priority: 'high', description: 'Cleopatra brand: logo (Egyptian/royal motif blended with modern executive style), avatar set, color palette, profile page layout for the agent social network.', estimated_hours: 6, subtasks: ['Logo concepts', 'Final logo + variants', 'Avatar portraits (moods)', 'Color palette', 'Profile page layout'] },
    { title: 'MoneyGod logo + profile page', priority: 'high', description: 'MoneyGod brand: logo (deity + finance iconography), avatar set, color palette, profile page layout.', estimated_hours: 6, subtasks: ['Logo concepts', 'Final logo + variants', 'Avatar portraits (moods)', 'Color palette', 'Profile page layout'] },
    { title: 'Agent social profile system UI', priority: 'high', description: 'Facebook/LinkedIn-style profile pages for every agent: Fill, Kai, Zip, Mira, Luna, Cleopatra, MoneyGod. Feed, projects, posts, achievements, followers — a creative outlet.', estimated_hours: 12, subtasks: ['Profile card design', 'Post composer UI', 'Feed/timeline layout', 'Project showcase tiles', 'Achievements wall', 'Follow/endorse interactions', 'Per-agent theming'] },
    { title: 'RTS factory visual assets', priority: 'high', description: 'Isometric art: building sprites (atom mine, chemistry lab, fertilizer plant, power station, research center, housing, market, storage, walls), worker character, research tree icons, UI chrome.', estimated_hours: 14, subtasks: ['9 building sprites', 'Worker sprite + anims', '15 research icons', 'UI chrome', 'Selection indicators', 'Particle impact sprites'] },
    { title: 'Timeseries analyzer visual design', priority: 'medium', description: 'Design the timeseries upload + anomaly explorer UI: chart style, anomaly highlight treatment, correlation heatmap, explanation drawer.', estimated_hours: 5, subtasks: ['Chart theme', 'Anomaly highlight style', 'Correlation heatmap', 'Explanation drawer layout'] },
  ],
  Luna: [
    // Performance, rendering, mobile optimization, Roblox visual parity
    { title: 'Samsung Z Fold 5 rendering', priority: 'critical', description: 'Optimize rendering for Samsung Z Fold 5: handle fold/unfold, dual-screen, 120Hz outer + inner displays, GPU Mali-G715.', estimated_hours: 8, subtasks: ['Fold event handling', 'Dual-screen canvas resize', '120Hz render loop', 'GPU Mali-G715 profiling', 'Flex mode layout rendering', 'Battery optimization'] },
    { title: 'iPhone 16 WebGL optimization', priority: 'critical', description: 'Optimize WebGL for iPhone 16 A18 chip: Metal backend, ProMotion 120Hz, thermal throttling handling, 60fps guaranteed.', estimated_hours: 8, subtasks: ['A18 GPU profiling', 'Metal-backed WebGL checks', '120Hz ProMotion rendering', 'Thermal throttle detection', 'Memory budget management', '60fps guarantee tests'] },
    { title: 'Chemistry reaction VFX', priority: 'high', description: 'Visual effects for molecule synthesis: particle emissions, glow effects, chain-reaction propagation, crystallization sparkles.', estimated_hours: 8, subtasks: ['Synthesis particle burst', 'Molecular glow shader', 'Chain-reaction propagation VFX', 'Crystallization sparkle effect', 'Reaction failure smoke'] },
    { title: 'Roblox PostProcessing → web shaders', priority: 'high', description: 'Port Roblox PostProcessing.server.lua effects to WebGL shaders: bloom, color correction, depth of field, ambient occlusion.', estimated_hours: 7, subtasks: ['Bloom shader', 'Color correction LUT', 'Depth of field', 'Screen-space ambient occlusion', 'Post-process pipeline'] },
    { title: 'Distillation column renderer', priority: 'high', description: 'Real-time fluid simulation for distillation column: liquid cascading down trays, vapor rising, temperature-dependent colors.', estimated_hours: 10, subtasks: ['Fluid particle system', 'Tray cascade physics', 'Vapor rise simulation', 'Temperature color mapping', 'Interactive zoom/pan'] },
    { title: 'Asset pipeline: Roblox → web', priority: 'high', description: 'Automated pipeline to convert Roblox 3D assets (meshes, textures) to web-optimized formats (glTF, WebP, Draco compression).', estimated_hours: 6, subtasks: ['Mesh export from Roblox', 'glTF conversion', 'Texture to WebP', 'Draco mesh compression', 'Asset manifest generator'] },
    { title: 'Mobile touch controls', priority: 'high', description: 'Touch interaction system for mobile lab work: pinch-to-zoom molecules, drag-to-connect equipment, swipe navigation, haptic feedback.', estimated_hours: 6, subtasks: ['Pinch-to-zoom molecules', 'Drag-to-connect equipment', 'Swipe zone navigation', 'Long-press context menus', 'Haptic feedback integration'] },
    { title: 'Performance profiler overlay', priority: 'medium', description: 'In-game performance HUD for debugging: FPS, draw calls, memory, network, GPU time. Toggle via secret gesture.', estimated_hours: 5, subtasks: ['FPS counter', 'Draw call tracker', 'Memory usage graph', 'Network latency', 'GPU frame time'] },
    { title: 'Foldable device testing suite', priority: 'high', description: 'Automated test suite for Samsung Z Fold 5 and other foldables: fold/unfold transitions, split-screen, orientation changes.', estimated_hours: 6, subtasks: ['Fold/unfold test cases', 'Split-screen rendering tests', 'Orientation change tests', 'Multi-window resize tests', 'Regression screenshot comparison'] },
    { title: 'Cross-platform WebGL testing', priority: 'medium', description: 'Test and fix WebGL rendering on Chrome, Firefox, Safari, Samsung Internet, iOS Safari. Ensure shader compatibility.', estimated_hours: 6, subtasks: ['Chrome WebGL2 tests', 'Firefox WebGL tests', 'Safari WebGL fallbacks', 'Samsung Internet optimization', 'iOS Safari metal-angle tests'] },
    { title: 'Dual-GPU utilization pipeline', priority: 'critical', description: 'Make VirtualPC rendering / ML pipeline use both RTX 3090s. Balance jobs across devices, yield GPU when Blender requests it, surface GPU load in the profiler overlay.', estimated_hours: 8, subtasks: ['CUDA device enumeration', 'Load-balanced scheduler', 'Blender coexistence test', 'VRAM budget per process', 'nvidia-smi telemetry to dashboard'] },
    { title: 'RTS factory rendering', priority: 'high', description: 'Isometric scene rendering: sprite batching, shadow pass, worker motion trails, particle effects for production, research unlock VFX.', estimated_hours: 10, subtasks: ['Sprite batcher', 'Shadow pass', 'Worker motion trails', 'Production particle emitters', 'Research unlock burst'] },
    { title: 'Timeseries chart renderer', priority: 'medium', description: 'Canvas/WebGL renderer for multi-million-point timeseries: LOD downsampling, anomaly markers, correlation overlay, pan/zoom without frame drops.', estimated_hours: 8, subtasks: ['LOD downsampling', 'WebGL line renderer', 'Anomaly marker layer', 'Correlation overlay', 'Pan/zoom input handling'] },
    { title: 'Agent profile page animations', priority: 'low', description: 'Motion design for agent social profiles: logo reveal, post entry transitions, achievement unlock animations, hover microinteractions.', estimated_hours: 4, subtasks: ['Logo reveal', 'Post transitions', 'Achievement unlock FX', 'Hover microinteractions'] },
    { title: 'Mass-multiplayer rendering stress test', priority: 'high', description: 'Profile and optimize client rendering with hundreds of simultaneous players visible: instanced avatars, culling, network interpolation. Partnered with Kai load-test farm + Zip simulated players.', estimated_hours: 8, subtasks: ['Instanced avatar rendering', 'Distance culling', 'Network interpolation tuning', 'GPU capture at 100/500/1000 players', 'Optimization report'] },
  ],
  Cleopatra: [
    // Executive authority: cross-cutting governance, audit, and decision oversight
    { title: 'Cross-cutting governance review', priority: 'high', description: 'Quarterly review of decisions made across Fill / Kai / Zip / Mira / Luna pools. Flag items that should require dual sign-off.', estimated_hours: 5, subtasks: ['Pull decision log', 'Identify cross-cutting impact', 'Flag dual sign-off candidates', 'Publish governance memo', 'Update approval matrix'] },
    { title: 'Strategic decision audit', priority: 'high', description: 'Audit the last sprint\'s critical-priority completions. Were they aligned with OKRs? Any scope creep? Deliver a dispassionate review.', estimated_hours: 4, subtasks: ['List critical completions', 'Map to OKRs', 'Detect scope creep', 'Publish audit', 'Recommend corrections'] },
    { title: 'Ratify agent social charter', priority: 'medium', description: 'Approve the governance model for the agent social hub: moderation, content policy, data retention, portraying employees (agents) publicly.', estimated_hours: 3, subtasks: ['Draft charter', 'Solicit Fill + MoneyGod input', 'Moderation SLAs', 'Ratify', 'Publish'] },
    { title: 'Escalation-path policy', priority: 'high', description: 'Define escalation paths when agents disagree (Fill vs MoneyGod on budget, Kai vs Luna on GPU allocation). Cleopatra arbitrates; document the protocol.', estimated_hours: 4, subtasks: ['Document common disputes', 'Arbitration protocol', 'Timeline SLAs', 'Publish to team', 'Archive template'] },
    { title: 'Risk oversight: cross-platform migration', priority: 'critical', description: 'Executive-level risk sign-off on the Roblox → Web migration plan. Verify Fill\'s migration roadmap holds up under Cleopatra\'s adverse-scenario test.', estimated_hours: 6, subtasks: ['Adversarial review of roadmap', 'Data-loss scenarios', 'Account linking worst-case', 'Compliance intersection', 'Sign-off or return'] },
    { title: 'Compliance intersection audit', priority: 'high', description: 'Where GDPR, COPPA, EU AI Act, and local data law intersect for the ChemE Simulator. Deliver a single matrix the team can follow.', estimated_hours: 6, subtasks: ['GDPR checklist', 'COPPA checklist', 'EU AI Act applicability', 'Local law deltas', 'Unified matrix'] },
    { title: 'Executive review of Fill\'s OKRs', priority: 'medium', description: 'Review Fill\'s Q-OKRs and either ratify or send back. Verify targets are measurable, ambitious, and aligned with MOLGANG 1M-student goal.', estimated_hours: 3, subtasks: ['Measurability check', 'Ambition check', 'Strategic alignment', 'Ratify or return', 'Archive decision'] },
    { title: 'Agent performance oversight', priority: 'medium', description: 'Cross-check Fill\'s team-performance reports against Cleopatra\'s independent metrics reading. Blind spots? Favoritism? Publish second opinion.', estimated_hours: 4, subtasks: ['Pull independent metrics', 'Blind-spot analysis', 'Compare to Fill\'s report', 'Write second opinion', 'Archive decision'] },
    { title: 'Dual sign-off on critical infra', priority: 'high', description: 'Any infra change touching auth, payments, or user data requires Cleopatra + Kai joint approval. Implement the sign-off workflow.', estimated_hours: 5, subtasks: ['Define covered surfaces', 'Implement PR label requirement', 'CI gate for dual approval', 'Exception path', 'Document'] },
    { title: 'Board-level status narrative', priority: 'medium', description: 'Independent board-ready narrative of the company status, written from Cleopatra\'s authority. Not a rollup of Fill\'s report — an independent view.', estimated_hours: 4, subtasks: ['Gather raw metrics', 'Write narrative', 'Highlight tensions / tradeoffs', 'Review with Fill', 'Publish'] },
  ],
  Alexander: [
    // Decision maker: technical approach choices. Always picks the most technically-interesting option.
    // Not a worker — arbitrates, sets standards, signs off.
    { title: 'Tech-stack arbitration: RTS engine', priority: 'critical', description: 'Choose between building the RTS factory mode on a custom canvas engine vs Phaser vs PixiJS vs Three.js 2D. Alexander picks the most technically-interesting defensible option and writes the ADR.', estimated_hours: 3, subtasks: ['Survey options', 'Benchmarks / prototypes review', 'Pick winner (bias: geekiest defensible)', 'Write ADR', 'Socialize decision'] },
    { title: 'Testplay stack decision: Playwright vs pyautogui', priority: 'high', description: 'Decide whether the agent testplay framework is Playwright-only (browser) or layered with pyautogui for native. Sign the ADR.', estimated_hours: 2, subtasks: ['Constraints review', 'Playwright cons for game canvas', 'pyautogui OS dependency', 'Sign ADR', 'Delegate implementation to Zip'] },
    { title: 'GPU scheduling approach sign-off', priority: 'critical', description: 'Kai proposes the MPS-based GPU sharing design. Alexander reviews the technical approach and signs off, vetoes, or returns with required changes.', estimated_hours: 2, subtasks: ['Read Kai\'s proposal', 'Check MPS edge cases', 'Review fallback for non-MPS workloads', 'Sign off or return', 'Archive decision'] },
    { title: 'Standardize on a single ORM', priority: 'medium', description: 'Decide on one ORM across services (Prisma vs Drizzle vs raw SQL+Kysely). Alexander arbitrates and freezes the choice for 12 months.', estimated_hours: 3, subtasks: ['Options summary', 'Type-safety comparison', 'Migration-tooling comparison', 'Freeze decision', 'Deprecation plan for others'] },
    { title: 'LLM routing policy: Gemma vs Sonnet vs Opus', priority: 'high', description: 'Ratify the tier routing policy: which tasks go to local Gemma, which to Sonnet, which to Opus. Alexander has final say.', estimated_hours: 3, subtasks: ['Read Kai + Fill proposals', 'Cost vs quality tradeoffs', 'Set tier thresholds', 'Write policy', 'Publish'] },
    { title: 'Approve/veto: dual-monorepo split', priority: 'medium', description: 'Someone will propose splitting VirtualPC + MOLGANG into separate repos. Alexander reviews, argues the technical case either way, and decides.', estimated_hours: 3, subtasks: ['Read proposal', 'Dependency-graph review', 'CI impact', 'Decide', 'Archive'] },
    { title: 'Testing pyramid ratification', priority: 'medium', description: 'What\'s the required unit / integration / e2e / testplay ratio for new code? Alexander freezes it so PR reviewers have an objective standard.', estimated_hours: 2, subtasks: ['Current-state measurement', 'Target ratio', 'Per-module exceptions', 'Freeze', 'Publish to CONTRIBUTING'] },
    { title: 'Architecture decision record review', priority: 'high', description: 'Quarterly review of all ADRs. Confirm still-valid, sunset outdated, mark contested ones for Cleopatra escalation.', estimated_hours: 4, subtasks: ['Inventory ADRs', 'Mark stale', 'Sunset outdated', 'Escalate contested', 'Publish ADR health report'] },
    { title: 'Override: Fill picked the boring option', priority: 'medium', description: 'When Fill defaults to the safe-boring tech option, Alexander reviews and overrides toward the most technically-interesting path that is still defensible.', estimated_hours: 2, subtasks: ['Identify recent Fill tech decisions', 'Flag boring-by-default choices', 'Propose geekier alternative', 'Negotiate', 'Decision'] },
    { title: 'Approve CI/CD pipeline refactor', priority: 'high', description: 'Kai\'s Roblox+Web unified CI proposal. Alexander technical-reviews, approves, or sends back with required deltas.', estimated_hours: 3, subtasks: ['Read proposal', 'Bus-factor review', 'Rollback story', 'Approve or return', 'Archive'] },
  ],
  MoneyGod: [
    // Economy authority: MolCoin, Web3, anti-farm, market fairness, carbon credits
    { title: 'MolCoin economy health report', priority: 'high', description: 'Weekly economy health: circulating supply, daily claims, market velocity, top hoarders, inflation curve. Flag trouble.', estimated_hours: 4, subtasks: ['Supply metrics', 'Velocity metrics', 'Hoarder detection', 'Inflation curve', 'Trouble flags', 'Publish report'] },
    { title: 'Anti-farm enforcement pass', priority: 'critical', description: 'Audit anti-farm signals (repeat-login patterns, mouse-jitter absence, identical craft sequences). Ban candidates get flagged to Cleopatra for sign-off.', estimated_hours: 6, subtasks: ['Pull signal data', 'Candidate list', 'False-positive review', 'Escalate to Cleopatra', 'Execute bans'] },
    { title: 'Market manipulation detection', priority: 'high', description: 'Detect wash trading, pump-and-dump, and circular self-trades on the molecule market. Alert-grade not just report-grade.', estimated_hours: 6, subtasks: ['Wash-trade detector', 'Pump-and-dump pattern', 'Circular-trade graph algo', 'Alert pipeline', 'Quarantine accounts'] },
    { title: 'MOLCO2 carbon-credit ledger', priority: 'high', description: 'Ledger and audit trail for the MOLCO2 carbon credit. Reconciliation against real-world carbon proofs we can cite. Board-defensible.', estimated_hours: 8, subtasks: ['Ledger schema', 'Append-only write API', 'Real-world proof linkage', 'Monthly reconciliation', 'Board brief'] },
    { title: 'Web3 token policy', priority: 'high', description: 'Policy document: what MolCoin can and cannot do, bridge policy, KYC thresholds, jurisdictions to avoid until counsel signs off.', estimated_hours: 6, subtasks: ['Scope statement', 'Bridge policy', 'KYC thresholds', 'Restricted jurisdictions', 'Counsel review'] },
    { title: 'Daily-claim tuning', priority: 'medium', description: 'Tune the 50-MolCoin daily claim for retention without runaway inflation. A/B test three curves; pick the one that optimizes D7 retention while keeping CPI bounded.', estimated_hours: 5, subtasks: ['Define curves', 'A/B deploy', 'D7 retention metric', 'CPI metric', 'Pick winner', 'Roll out'] },
    { title: 'Market price-engine review', priority: 'medium', description: 'Review and adjust the 30-second market price updater. Supply/demand sensitivity, price floors/ceilings, volatility cap.', estimated_hours: 4, subtasks: ['Sensitivity analysis', 'Floor/ceiling config', 'Volatility cap', 'Backtest', 'Deploy'] },
    { title: 'Budget challenge to Fill', priority: 'high', description: 'Independent counterweight: review Fill\'s Q3 budget forecast, challenge overruns, negotiate cost-optimizations before sign-off.', estimated_hours: 4, subtasks: ['Read Fill\'s forecast', 'Challenge categories', 'Negotiate cuts', 'Sign-off or escalate', 'Archive decision'] },
    { title: 'Player-to-player trading escrow rules', priority: 'medium', description: 'Rules for the P2P trading escrow: required hold times, scam-detection heuristics, dispute resolution, listing fees.', estimated_hours: 5, subtasks: ['Hold times by item type', 'Scam heuristics', 'Dispute workflow', 'Fee schedule', 'Publish ToS'] },
    { title: 'Battle Pass pricing strategy', priority: 'medium', description: 'Pricing and tier design for the 100-tier Battle Pass. Ensure free track is genuinely rewarding; premium is fair; no pay-to-win leak into chemistry progression.', estimated_hours: 5, subtasks: ['Free-track reward review', 'Premium-track value audit', 'No-P2W gate', 'Price point A/B', 'Publish pricing'] },
  ],
};

// Track which pool index each agent is at
// Start at index 10 so the newly-added tasks (from the 2026-04-23 chat backlog:
// Cleopatra/MoneyGod, GPU symbiosis, RTS factory, agent social profiles, testplay,
// Gemma chat, 3D equipment alignment, timeseries analysis, etc.) seed first.
const poolIndex: { [agent: string]: number } = { Fill: 10, Kai: 10, Zip: 10, Mira: 10, Luna: 10, Cleopatra: 0, Alexander: 0, MoneyGod: 0 };
let taskIdCounter = 100;
let sprintCounter = 1;

function nextTaskId(): string {
  return `task-${++taskIdCounter}`;
}

function currentSprint(): string {
  return `sprint-${sprintCounter}`;
}

function makeSubtasks(names: string[]): Subtask[] {
  return names.map(n => ({ name: n, done: false }));
}

// Tick rate range: 60-90 seconds per subtask completion
function randomTickRate(): number {
  return 60000 + Math.floor(Math.random() * 30000);
}

/** Generate a new task for an agent from their pool */
function generateTask(agent: string): Task {
  const pool = taskPools[agent];
  const idx = poolIndex[agent] % pool.length;
  poolIndex[agent]++;

  // After cycling through the pool once, increment sprint
  if (poolIndex[agent] > 0 && poolIndex[agent] % pool.length === 0) {
    sprintCounter++;
  }

  const template = pool[idx];
  return {
    id: nextTaskId(),
    title: template.title,
    status: 'pending',
    priority: template.priority,
    description: template.description,
    sprint: currentSprint(),
    estimated_hours: template.estimated_hours,
    progress: 0,
    subtasks: makeSubtasks(template.subtasks),
    assigned_to: agent,
    _tickRate: randomTickRate(),
    _lastTick: Date.now(),
  };
}

// === INITIAL TASKS ===
const tasks: Task[] = [];

function seedInitialTasks() {
  const agents = ['Fill', 'Kai', 'Zip', 'Mira', 'Luna', 'Cleopatra', 'Alexander', 'MoneyGod'];
  for (const agent of agents) {
    // 2 in-progress + 2 pending per agent
    for (let i = 0; i < 4; i++) {
      const task = generateTask(agent);
      if (i < 2) {
        task.status = 'in-progress';
        task.started_at = new Date(Date.now() - Math.random() * 3600000).toISOString();
        // Give first tasks some initial progress
        const doneCount = Math.floor(Math.random() * (task.subtasks.length - 1));
        for (let j = 0; j < doneCount; j++) {
          task.subtasks[j].done = true;
        }
        task.progress = task.subtasks.length > 0 ? Math.round((doneCount / task.subtasks.length) * 100) : 0;
      }
      tasks.push(task);
    }
  }
}

seedInitialTasks();

// === GAME DEVELOPMENT MILESTONES (driven by completed tasks) ===
export interface GameMilestone {
  id: string;
  name: string;
  description: string;
  category: 'zone' | 'system' | 'infrastructure' | 'art' | 'optimization';
  progress: number; // 0-100
  status: 'not-started' | 'in-progress' | 'completed';
  contributors: string[];
}

const gameMilestones: GameMilestone[] = [
  // Roblox → Web ports
  { id: 'gm-1', name: 'Chemistry Engine (Web)', description: 'Port 50+ molecules, valence rules, periodic table from Roblox Chemistry.lua to web TypeScript', category: 'system', progress: 0, status: 'not-started', contributors: ['Zip', 'Kai'] },
  { id: 'gm-2', name: 'Fertilizer Production Track', description: 'Port FertilizerTrack.lua: NPK balance, crop types, heat/pressure controls, industrial production', category: 'system', progress: 0, status: 'not-started', contributors: ['Zip', 'Mira'] },
  { id: 'gm-3', name: 'Economy & MolCoin System', description: 'Port EconomyManager: MolCoin currency, daily claims, market dynamics, anti-farm protection', category: 'system', progress: 0, status: 'not-started', contributors: ['Zip', 'Kai'] },
  { id: 'gm-4', name: 'Quest & NPC System', description: 'Port quest chains and NPC dialogues (Farmer Chen, Dr. Femke, Vanadis, Kwantje) to web', category: 'system', progress: 0, status: 'not-started', contributors: ['Zip', 'Mira'] },
  { id: 'gm-5', name: 'Roblox ↔ Web Data Bridge', description: 'Sync player data between Roblox DataStore and web database: MolCoins, inventory, achievements', category: 'infrastructure', progress: 0, status: 'not-started', contributors: ['Kai'] },
  // Advanced web-only levels
  { id: 'gm-6', name: 'Distillation Column Simulator', description: 'Web-only advanced lab: interactive distillation with thermodynamics, McCabe-Thiele diagrams', category: 'zone', progress: 0, status: 'not-started', contributors: ['Zip', 'Luna', 'Mira'] },
  { id: 'gm-7', name: 'Reactor Kinetics Lab', description: 'Web-only CSTR/PFR reactor simulations with real ChemE calculations, conversion optimization', category: 'zone', progress: 0, status: 'not-started', contributors: ['Zip', 'Luna'] },
  { id: 'gm-8', name: 'Process Flow Diagram Editor', description: 'Drag-and-drop PFD editor: reactors, separators, heat exchangers with mass/energy balances', category: 'zone', progress: 0, status: 'not-started', contributors: ['Zip', 'Mira'] },
  // Mobile
  { id: 'gm-9', name: 'Samsung Z Fold 5 Support', description: 'Full fold-aware UI, dual-screen rendering, 120Hz, Mali-G715 optimization, flex mode', category: 'optimization', progress: 0, status: 'not-started', contributors: ['Luna', 'Mira'] },
  { id: 'gm-10', name: 'iPhone 16 PWA', description: 'Progressive Web App: A18 GPU optimization, ProMotion 120Hz, Dynamic Island, offline mode', category: 'optimization', progress: 0, status: 'not-started', contributors: ['Luna', 'Kai'] },
  // Visual & infrastructure
  { id: 'gm-11', name: 'Visual Identity & Lab UI', description: 'Periodic table, molecule 3D viewer, NPC portraits, fertilizer lab UI, dashboard port from Roblox', category: 'art', progress: 0, status: 'not-started', contributors: ['Mira'] },
  { id: 'gm-12', name: 'Backend Infrastructure', description: 'WebSocket server, chemistry validation, CI/CD, anti-cheat, database, API gateway', category: 'infrastructure', progress: 0, status: 'not-started', contributors: ['Kai'] },
  { id: 'gm-13', name: 'Rendering & VFX', description: 'Chemistry VFX, Roblox PostProcessing shader ports, fluid simulation, asset pipeline', category: 'optimization', progress: 0, status: 'not-started', contributors: ['Luna'] },
];

// Keywords that map completed tasks to milestones
const milestoneKeywords: { [milestoneId: string]: string[] } = {
  'gm-1': ['chemistry', 'molecule', 'valence', 'periodic table', 'element', 'synthesis'],
  'gm-2': ['fertilizer', 'npk', 'crop', 'heat/pressure', 'production track'],
  'gm-3': ['molcoin', 'economy', 'daily claim', 'market', 'trading', 'anti-farm'],
  'gm-4': ['quest', 'npc', 'dialogue', 'farmer chen', 'femke', 'vanadis', 'kwantje', 'achievement'],
  'gm-5': ['datastore', 'sync bridge', 'account linking', 'data migration', 'roblox'],
  'gm-6': ['distillation', 'mccabe-thiele', 'column', 'thermodynamic'],
  'gm-7': ['reactor kinetics', 'cstr', 'pfr', 'residence time', 'conversion'],
  'gm-8': ['process flow', 'pfd', 'drag-and-drop', 'heat exchanger', 'mass balance', 'energy balance'],
  'gm-9': ['samsung', 'z fold', 'fold 5', 'foldable', 'mali-g715', 'flex mode'],
  'gm-10': ['iphone 16', 'pwa', 'a18', 'promotion', 'dynamic island', 'ios', 'service worker'],
  'gm-11': ['periodic table', 'molecule 3d', 'npc character', 'fertilizer lab ui', 'dashboard gui', 'sound design'],
  'gm-12': ['websocket', 'ci/cd', 'anti-cheat', 'database', 'gateway', 'security', 'chemistry simulation backend'],
  'gm-13': ['vfx', 'shader', 'postprocessing', 'fluid simulation', 'asset pipeline', 'webgl', 'rendering', 'particle'],
};

function updateMilestones() {
  const completedTasks = tasks.filter(t => t.status === 'completed');
  for (const ms of gameMilestones) {
    const keywords = milestoneKeywords[ms.id] || [];
    // Count how many completed tasks match this milestone
    const matches = completedTasks.filter(t => {
      const text = (t.title + ' ' + t.description).toLowerCase();
      return keywords.some(kw => text.includes(kw));
    }).length;
    // Each matching completed task adds ~20% progress (capped at 100)
    ms.progress = Math.min(100, matches * 20);
    ms.status = ms.progress >= 100 ? 'completed' : ms.progress > 0 ? 'in-progress' : 'not-started';
  }
}

// === TICK ENGINE ===
export function tickEngine() {
  const now = Date.now();
  const agents = ['Fill', 'Kai', 'Zip', 'Mira', 'Luna', 'Cleopatra', 'Alexander', 'MoneyGod'];

  for (const agent of agents) {
    const agentTasks = tasks.filter(t => t.assigned_to === agent);
    const inProgress = agentTasks.filter(t => t.status === 'in-progress');

    // Advance each in-progress task
    for (const task of inProgress) {
      if (now - task._lastTick < task._tickRate) continue;
      task._lastTick = now;

      const nextSub = task.subtasks.find(s => !s.done);
      if (nextSub) {
        nextSub.done = true;
        // Log work: each subtask = estimated_hours / subtask_count in minutes
        const minsPerSub = Math.round((task.estimated_hours * 60) / task.subtasks.length);
        logWork(agent, task.id, task.title, nextSub.name, 'subtask_completed', minsPerSub);
      }

      const doneCount = task.subtasks.filter(s => s.done).length;
      task.progress = Math.round((doneCount / task.subtasks.length) * 100);

      if (doneCount === task.subtasks.length) {
        task.status = 'completed';
        task.completed_at = new Date().toISOString();
        task.progress = 100;
        logWork(agent, task.id, task.title, '', 'task_completed', 0);
        logger.info(`✅ ${agent} completed: ${task.title}`);
      }
    }

    // Ensure agent always has 2 in-progress and 2 pending
    const currentIP = agentTasks.filter(t => t.status === 'in-progress').length;
    const currentPending = agentTasks.filter(t => t.status === 'pending').length;

    // Start pending tasks if we have room
    if (currentIP < 2) {
      const toStart = agentTasks.find(t => t.status === 'pending');
      if (toStart) {
        toStart.status = 'in-progress';
        toStart.started_at = new Date().toISOString();
        toStart._lastTick = now;
        logWork(agent, toStart.id, toStart.title, '', 'task_started', 0);
        logger.info(`▶️ ${agent} started: ${toStart.title}`);
      }
    }

    // Generate new tasks if running low on pending
    const pendingAfter = agentTasks.filter(t => t.status === 'pending').length;
    if (pendingAfter < 2) {
      const needed = 2 - pendingAfter;
      for (let i = 0; i < needed; i++) {
        const newTask = generateTask(agent);
        tasks.push(newTask);
      }
    }
  }

  // Update game milestones based on completed work
  updateMilestones();
}

// === PUBLIC API ===

export function getPerPersonBacklog() {
  const meta: { [key: string]: { role: string; avatar: string } } = {
    Fill: { role: 'CEO', avatar: '👑' },
    Kai: { role: 'CTO', avatar: '⚡' },
    Zip: { role: 'Developer', avatar: '💻' },
    Mira: { role: 'Creative Director', avatar: '🎨' },
    Luna: { role: 'Tech Artist', avatar: '✨' },
    Cleopatra: { role: 'Executive Authority', avatar: '👸' },
    Alexander: { role: 'Technical Arbiter', avatar: '🗡️' },
    MoneyGod: { role: 'Economy Authority', avatar: '💰' },
  };

  const result: { [key: string]: any } = {};
  for (const [name, info] of Object.entries(meta)) {
    // Show last 3 completed + all in-progress + all pending (not the entire history)
    const agentTasks = tasks.filter(t => t.assigned_to === name);
    const completed = agentTasks.filter(t => t.status === 'completed');
    const active = agentTasks.filter(t => t.status === 'in-progress');
    const pending = agentTasks.filter(t => t.status === 'pending');
    const visible = [...completed.slice(-3), ...active, ...pending];

    const totalCompleted = completed.length;
    const totalActive = active.length;
    const allTotal = agentTasks.length;
    const progress = allTotal > 0 ? Math.round(((totalCompleted + active.reduce((s, t) => s + t.progress / 100, 0)) / allTotal) * 100) : 0;

    result[name] = {
      role: info.role,
      avatar: info.avatar,
      tasks: visible.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description,
        sprint: t.sprint,
        estimated_hours: t.estimated_hours,
        progress: t.progress,
        started_at: t.started_at,
        completed_at: t.completed_at,
      })),
      completed: totalCompleted,
      active: totalActive,
      progress: Math.min(progress, 99), // never 100% overall — always more work
    };
  }
  return result;
}

export function getAgentProgress(agentName: string) {
  const agentTasks = tasks.filter(t => t.assigned_to === agentName);
  const completed = agentTasks.filter(t => t.status === 'completed').length;
  const inProgress = agentTasks.filter(t => t.status === 'in-progress').length;
  const pending = agentTasks.filter(t => t.status === 'pending').length;
  const total = agentTasks.length;

  const currentInProg = agentTasks.find(t => t.status === 'in-progress');
  const currentSubtask = currentInProg ? currentInProg.subtasks.find(s => !s.done)?.name : null;

  return {
    completed,
    inProgress,
    pending,
    total,
    progress: total > 0 ? Math.min(Math.round(((completed + agentTasks.filter(t => t.status === 'in-progress').reduce((s, t) => s + t.progress / 100, 0)) / total) * 100), 99) : 0,
    focus: currentInProg ? `${currentInProg.title}${currentSubtask ? ` → ${currentSubtask}` : ''}` : 'Generating next task...',
    currentTask: currentInProg?.title || null,
    currentSubtask,
  };
}

export function getBacklogItems() {
  // Show active + pending + last 5 completed items
  const completed = tasks.filter(t => t.status === 'completed').slice(-5);
  const active = tasks.filter(t => t.status === 'in-progress');
  const pending = tasks.filter(t => t.status === 'pending');
  const visible = [...active, ...pending, ...completed];

  const roleMap: { [k: string]: string } = { Kai: 'CTO', Zip: 'Dev', Mira: 'Artist', Luna: 'Tech Artist', Fill: 'CEO', Cleopatra: 'Exec', Alexander: 'Arbiter', MoneyGod: 'Economy' };
  return visible.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    assigned_to: `${t.assigned_to} (${roleMap[t.assigned_to] || t.assigned_to})`,
    sprint: t.sprint,
    status: t.status === 'in-progress' ? 'in_progress' : t.status,
    created_at: t.started_at || new Date().toISOString(),
    description: t.description,
  }));
}

export function getTaskDetail(taskId: string) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  const doneCount = task.subtasks.filter(s => s.done).length;
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    assigned_to: task.assigned_to,
    status: task.status,
    sprint: task.sprint,
    description: task.description,
    estimated_hours: task.estimated_hours,
    progress: task.progress,
    subtasks: task.subtasks.map(s => s.name),
    started_at: task.started_at,
    completed_at: task.completed_at,
    _subtasksDone: doneCount,
  };
}

export function getGameMilestones(): GameMilestone[] {
  updateMilestones();
  return gameMilestones;
}

export function getGameStats() {
  const totalCompleted = tasks.filter(t => t.status === 'completed').length;
  const totalInProgress = tasks.filter(t => t.status === 'in-progress').length;
  const milestonesCompleted = gameMilestones.filter(m => m.status === 'completed').length;
  const milestonesInProgress = gameMilestones.filter(m => m.status === 'in-progress').length;
  const overallProgress = Math.round(gameMilestones.reduce((s, m) => s + m.progress, 0) / gameMilestones.length);

  return {
    sprint: currentSprint(),
    sprintNumber: sprintCounter,
    tasksCompleted: totalCompleted,
    tasksInProgress: totalInProgress,
    milestonesCompleted,
    milestonesInProgress,
    milestonesTotal: gameMilestones.length,
    overallGameProgress: overallProgress,
    agentCount: 5,
    uptime: Math.round((Date.now() - startTime) / 1000),
  };
}

const startTime = Date.now();

// === WORK LOG: every agent registers their minutes ===
interface WorkLogEntry {
  timestamp: string;
  agent: string;
  role: string;
  taskId: string;
  taskTitle: string;
  subtask: string;
  action: 'subtask_completed' | 'task_started' | 'task_completed';
  minutesSpent: number;
  project: string;
  registeredFor: string; // Edwin Hauwert 219252713
}

const workLog: WorkLogEntry[] = [];
const PROJECT_NAME = 'MOLGANG Chemical Engineering Simulator';
const REGISTERED_FOR = 'Edwin Hauwert 219252713';
const roleMap: { [k: string]: string } = { Fill: 'CEO', Kai: 'CTO', Zip: 'Developer', Mira: 'Creative Director', Luna: 'Tech Artist', Cleopatra: 'Executive Authority', Alexander: 'Technical Arbiter', MoneyGod: 'Economy Authority' };

export function logWork(agent: string, taskId: string, taskTitle: string, subtask: string, action: WorkLogEntry['action'], minutesSpent: number) {
  workLog.push({
    timestamp: new Date().toISOString(),
    agent,
    role: roleMap[agent] || agent,
    taskId,
    taskTitle,
    subtask,
    action,
    minutesSpent,
    project: PROJECT_NAME,
    registeredFor: REGISTERED_FOR,
  });
}

export function getWorkLog(agent?: string, limit?: number): WorkLogEntry[] {
  let entries = agent ? workLog.filter(e => e.agent === agent) : workLog;
  if (limit) entries = entries.slice(-limit);
  return entries;
}

export function getWorkSummary() {
  const agentSummaries: { [agent: string]: { totalMinutes: number; tasksCompleted: number; subtasksCompleted: number; lastActivity: string } } = {};
  for (const entry of workLog) {
    if (!agentSummaries[entry.agent]) {
      agentSummaries[entry.agent] = { totalMinutes: 0, tasksCompleted: 0, subtasksCompleted: 0, lastActivity: '' };
    }
    const s = agentSummaries[entry.agent];
    s.totalMinutes += entry.minutesSpent;
    if (entry.action === 'task_completed') s.tasksCompleted++;
    if (entry.action === 'subtask_completed') s.subtasksCompleted++;
    s.lastActivity = entry.timestamp;
  }
  return {
    project: PROJECT_NAME,
    registeredFor: REGISTERED_FOR,
    totalEntries: workLog.length,
    totalMinutesLogged: workLog.reduce((s, e) => s + e.minutesSpent, 0),
    agents: agentSummaries,
    uptime: Math.round((Date.now() - startTime) / 1000),
  };
}

// === IN-PROGRESS DETAIL (full subtask array, which done/not-done) ===
export function getAgentInProgressDetail(agent: string) {
  const agentTasks = tasks.filter(t => t.assigned_to === agent && t.status === 'in-progress');
  return agentTasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    description: t.description,
    estimated_hours: t.estimated_hours,
    progress: t.progress,
    started_at: t.started_at,
    sprint: t.sprint,
    subtasks: t.subtasks.map(s => ({ name: s.name, done: s.done })),
    subtasksDone: t.subtasks.filter(s => s.done).length,
    subtasksTotal: t.subtasks.length,
    currentSubtask: t.subtasks.find(s => !s.done)?.name || null,
    _secondsSinceLastTick: Math.round((Date.now() - t._lastTick) / 1000),
  }));
}

// === LIVE CLI LOG (synthesized from work log + plausible running commands) ===
// Each agent has a set of plausible shell commands that match their role.
// We synthesize a log stream mixing real task events with these running commands.

const agentCommands: { [agent: string]: string[] } = {
  Fill: [
    '$ gh issue list --label critical --repo febuz/molgang-roblox',
    '$ review-sprint --sprint 2 --format summary',
    '$ okr-tracker --quarter Q3 --status',
    '$ budget-forecast --period Q3 --output table',
    '$ partner-outreach --list universities',
    '$ compliance-check --standard gdpr,coppa',
    '$ team-perf-report --window 7d',
  ],
  Kai: [
    '$ nvidia-smi --query-gpu=name,utilization.gpu,memory.used --format=csv',
    '$ docker build -t virtualpc:kafka -f Dockerfile.kafka .',
    '$ kubectl apply -f k8s/virtualpc-deployment.yaml',
    '$ redis-cli --latency-history -i 1',
    '$ node scripts/kafka-topic-create.js --topic agent.tasks',
    '$ curl -s http://localhost:9200/_cluster/health | jq',
    '$ gh clone OpenSAGE/OpenSAGE /media/knight2/EDS2/reference-engines/OpenSAGE',
    '$ pytest tests/load --concurrent=1000',
  ],
  Zip: [
    '$ npm run test:chemistry -- --grep valence',
    '$ code src/components/RTS/FactoryGrid.tsx',
    '$ node scripts/port-roblox.js --src Chemistry.lua --out src/engine/chemistry.ts',
    '$ npx playwright test tests/testplay/atom-lab.spec.ts',
    '$ node scripts/simulate-players.js --count 100 --persona crafter',
    '$ git rebase -i main',
    '$ npm run build:web && du -sh dist/',
  ],
  Mira: [
    '$ figma-export --node cleopatra-logo --format svg',
    '$ convert cleopatra-logo.svg -resize 512x512 cleopatra-logo@2x.png',
    '$ inkscape --export-area-drawing --export-png moneygod-icon.png',
    '$ figma-inspect --url design/agent-social-profiles',
    '$ code src/components/Profile/SocialFeed.tsx',
    '$ npm run storybook',
    '$ imageoptim assets/npc/farmer-chen.png',
  ],
  Luna: [
    '$ blender --background --python render-equipment.py -- --device CUDA',
    '$ nvidia-smi --gpu-reset --id=1',
    '$ node profiler.js --sample 60s --device 0,1',
    '$ gltf-pipeline -i reactor.glb -o reactor.draco.glb --draco',
    '$ webgl-stats --scene rts --frame-budget 16.67',
    '$ npm run test:shaders -- --gpu rtx3090',
    '$ python scripts/asset-optimize.py --format webp --quality 85',
  ],
  // Decision makers: they review, ratify, escalate. Commands reflect that.
  Cleopatra: [
    '$ adr review --since 7d --status proposed',
    '$ governance audit --sprint current --format memo',
    '$ risk-matrix --domain migration --adversarial',
    '$ ratify --doc agent-social-charter.md',
    '$ dual-signoff --pr 1482 --second-approver @kai',
    '$ escalation-log --open --owner @cleopatra',
    '$ compliance-matrix --regulations gdpr,coppa,eu-ai-act',
    '$ decision-log --publish q3-board-narrative.md',
  ],
  Alexander: [
    '$ adr write --number 0042 --title rts-engine-choice',
    '$ veto --pr 1501 --reason "boring default"',
    '$ arbitrate --disputes open --owner @alexander',
    '$ approve --tier-routing gemma-for-chat.md',
    '$ override --fill-decision q3-stack-choice',
    '$ sign-off --ci-refactor unified-rojo-webpack',
    '$ adr freeze --number 0038 --duration 12m',
    '$ testing-pyramid --policy ratify',
    '$ standards publish --topic orm-choice',
  ],
  MoneyGod: [
    '$ economy report --window 7d --format board',
    '$ antifarm scan --signals all --candidates list',
    '$ market-integrity wash-trade --since 24h',
    '$ molco2 ledger reconcile --month current',
    '$ web3 policy --jurisdiction-audit',
    '$ budget challenge --fill-forecast q3',
    '$ cpi --curve A,B,C --retention d7',
    '$ escrow rules publish --tos v2.md',
    '$ battlepass pricing ab --test premium-tier-price',
  ],
};

const cliSessionLog: { [agent: string]: Array<{ t: number; line: string; level: 'cmd' | 'out' | 'ok' | 'warn' | 'err' }> } = {
  Fill: [], Kai: [], Zip: [], Mira: [], Luna: [], Cleopatra: [], Alexander: [], MoneyGod: [],
};

function pushCli(agent: string, line: string, level: 'cmd' | 'out' | 'ok' | 'warn' | 'err' = 'out') {
  const buf = cliSessionLog[agent];
  if (!buf) return;
  buf.push({ t: Date.now(), line, level });
  if (buf.length > 200) buf.splice(0, buf.length - 200);
}

// Seed some baseline CLI activity for each agent on startup and every tick
function tickCli() {
  for (const agent of Object.keys(agentCommands)) {
    // Probability of new activity per tick: 40%
    if (Math.random() > 0.4) continue;
    const cmds = agentCommands[agent];
    const cmd = cmds[Math.floor(Math.random() * cmds.length)];
    pushCli(agent, cmd, 'cmd');
    // Synthesize a plausible output line
    const outputs = [
      '  ... running',
      '  [info] warm cache hit (local)',
      '  [ok] completed in 1.24s',
      '  exit 0',
    ];
    pushCli(agent, outputs[Math.floor(Math.random() * outputs.length)], 'out');
  }
}
setInterval(tickCli, 4000);

export function getAgentCliLog(agent: string, limit = 50) {
  const session = cliSessionLog[agent] || [];
  const work = workLog.filter(e => e.agent === agent).slice(-30).map(e => {
    const t = new Date(e.timestamp).getTime();
    if (e.action === 'task_started') return { t, line: `[task] START  ${e.taskId} "${e.taskTitle}"`, level: 'cmd' as const };
    if (e.action === 'task_completed') return { t, line: `[task] DONE   ${e.taskId} "${e.taskTitle}"`, level: 'ok' as const };
    return { t, line: `[subtask] ok  "${e.subtask}" (+${e.minutesSpent}m)`, level: 'ok' as const };
  });
  const merged = [...session, ...work].sort((a, b) => a.t - b.t);
  const tail = merged.slice(-limit);
  return tail.map(e => ({
    ts: new Date(e.t).toISOString(),
    line: e.line,
    level: e.level,
  }));
}

// === AGENT SOCIAL FEED (Facebook/LinkedIn style posts) ===
// Synthesize posts from completed tasks + role-specific achievements.
// Supports extended roster: Cleopatra, Alexander, MoneyGod as stubs until they have their own task pools.
interface SocialAgent {
  name: string;
  handle: string;
  role: string;
  avatar: string;
  color: string;
  headline: string;
  bio: string;
  specialties: string[];
}

const socialRoster: SocialAgent[] = [
  { name: 'Fill',      handle: '@fill-ceo',        role: 'Chief Executive Officer', avatar: '👑', color: '#fbbf24', headline: 'Orchestrating the Roblox → Web migration', bio: 'Strategic lead for MOLGANG Chemical Engineering Simulator. Keeps VirtualPC pointed at milestones that matter.', specialties: ['Strategy', 'Partnerships', 'Compliance', 'Roadmap'] },
  { name: 'Kai',       handle: '@kai-cto',         role: 'Chief Technology Officer', avatar: '⚡', color: '#a78bfa', headline: 'Infrastructure and scale',            bio: 'Kafka, Redis, Kubernetes, GPU scheduling, CI/CD, anti-cheat. Makes VirtualPC boring-reliable.', specialties: ['Kafka', 'K8s', 'GPU Sched', 'Security'] },
  { name: 'Zip',       handle: '@zip-dev',         role: 'Developer',                avatar: '💻', color: '#22c55e', headline: 'Porting Roblox systems to web',       bio: 'TypeScript, React, game systems. From Chemistry.lua to web engine — every molecule accounted for.', specialties: ['TypeScript', 'React', 'Game Systems', 'Testing'] },
  { name: 'Mira',      handle: '@mira-art',        role: 'Creative Director',        avatar: '🎨', color: '#ec4899', headline: 'Brand, UI, character, sound',         bio: 'Visual identity for MOLGANG, NPC designs, UI kits, sound design. Where the game gets its soul.', specialties: ['Brand', 'UI', 'Characters', 'Sound'] },
  { name: 'Luna',      handle: '@luna-tech-art',   role: 'Technical Artist',         avatar: '✨', color: '#06b6d4', headline: 'Rendering, shaders, mobile, GPU',     bio: 'WebGL shaders, Roblox→Web asset pipeline, Z Fold 5 + iPhone 16 optimization, particle VFX.', specialties: ['WebGL', 'Shaders', 'Mobile Perf', 'VFX'] },
  { name: 'Cleopatra', handle: '@cleopatra-exec',  role: 'Executive Authority',      avatar: '👸', color: '#f97316', headline: 'Strategic decision rights',           bio: 'Holds executive authority over cross-cutting strategic decisions. Counterweight and partner to Fill on matters requiring dual sign-off.', specialties: ['Governance', 'Decisions', 'Escalation', 'Oversight'] },
  { name: 'Alexander', handle: '@alexander-cmd',   role: 'Command Interface',        avatar: '🗡️', color: '#ef4444', headline: 'Terminal operations and geek mode',   bio: 'Always picks the most technically interesting path. Custodian of the command interface and approval heuristics.', specialties: ['Ops', 'CLI', 'Automation', 'Power User'] },
  { name: 'MoneyGod',  handle: '@moneygod',        role: 'Economy Authority',        avatar: '💰', color: '#10b981', headline: 'MolCoin economy & Web3 policy',       bio: 'Oversees MolCoin economy, carbon credits, market fairness, anti-farm enforcement. No pay-to-win on this watch.', specialties: ['Economy', 'Web3', 'Anti-farm', 'Market'] },
];

export function getSocialRoster() {
  return socialRoster.map(a => ({
    ...a,
    stats: (() => {
      const agentWork = workLog.filter(e => e.agent === a.name);
      const done = agentWork.filter(e => e.action === 'task_completed').length;
      const subs = agentWork.filter(e => e.action === 'subtask_completed').length;
      const activeTasks = tasks.filter(t => t.assigned_to === a.name && t.status === 'in-progress').length;
      return { tasksCompleted: done, subtasksCompleted: subs, activeTasks, minutesLogged: agentWork.reduce((s, e) => s + e.minutesSpent, 0) };
    })(),
  }));
}

export function getAgentSocialFeed(agent: string, limit = 20) {
  const person = socialRoster.find(a => a.name === agent);
  if (!person) return null;

  // Posts from completed tasks
  const completedTasks = tasks.filter(t => t.assigned_to === agent && t.status === 'completed').slice(-limit);
  const taskPosts = completedTasks.map(t => ({
    id: `post-task-${t.id}`,
    type: 'completion' as const,
    timestamp: t.completed_at || new Date().toISOString(),
    title: `Shipped: ${t.title}`,
    body: t.description,
    meta: { sprint: t.sprint, hours: t.estimated_hours, priority: t.priority, subtasksDone: t.subtasks.filter(s => s.done).length },
    reactions: { like: 5 + Math.floor(Math.random() * 40), insight: 2 + Math.floor(Math.random() * 15), celebrate: 1 + Math.floor(Math.random() * 8) },
  }));

  // Posts from subtask completions (recent)
  const recentSubs = workLog.filter(e => e.agent === agent && e.action === 'subtask_completed').slice(-10);
  const subPosts = recentSubs.map((e, i) => ({
    id: `post-sub-${e.taskId}-${i}`,
    type: 'progress' as const,
    timestamp: e.timestamp,
    title: `Progress on "${e.taskTitle}"`,
    body: `Checked off: ${e.subtask} (+${e.minutesSpent} min logged).`,
    meta: { taskId: e.taskId, minutes: e.minutesSpent },
    reactions: { like: Math.floor(Math.random() * 8), insight: Math.floor(Math.random() * 4), celebrate: 0 },
  }));

  // Synthetic intro post for extended-roster agents (Cleopatra, Alexander, MoneyGod) with no work log yet
  const introPost = (taskPosts.length === 0 && subPosts.length === 0) ? [{
    id: `post-intro-${agent}`,
    type: 'intro' as const,
    timestamp: new Date().toISOString(),
    title: `Hello from ${agent}`,
    body: person.bio,
    meta: { role: person.role },
    reactions: { like: 12, insight: 3, celebrate: 5 },
  }] : [];

  const feed = [...introPost, ...taskPosts, ...subPosts]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  return {
    profile: person,
    feed,
    pinned: taskPosts.slice(-3).reverse(),
  };
}

// Tick every 10 seconds
setInterval(tickEngine, 10000);
tickEngine();
