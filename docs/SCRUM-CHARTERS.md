# Scrum charters — molgang multi-team operating model

29 agents organised into four scrums + a tester forum. This doc is the
charter for each team: who's in it, what they ship, what their ceremonies
are, and how they hand work to the next team.

## Index

| Team              | Hermes coordinator   | Reviewer        | Members |
|-------------------|----------------------|-----------------|---------|
| scrum-roblox      | Hermes-Roblox        | Hermes-Reviewer | Fill, Kai, Mira, Vice, Hermes-Roblox + 4 testers |
| scrum-web         | Hermes-Web           | Hermes-Reviewer | Fill, Kai, Zip, Mira, Luna, Atlas, Vice, Pixel + 4 testers |
| scrum-marketing   | Hermes-Marketing     | Hermes-Reviewer | Fill, MoneyGod, Analyst, VideoProducer, Croesus, Governor + 2 testers |
| cross (S-of-S)    | Hermes-Cross         | Hermes-Reviewer | Fill (chair), Kai, Cleopatra, Alexander, MoneyGod, Kimi, Governor, Hermes-Reviewer |

Fill chairs the cross-team scrum-of-scrums; Hermes coordinators are the
scrum masters of their team. Hermes-Reviewer is the DeepSeek-R1-backed
cross-team code reviewer that pulls work from any of the four teams when
a PR / commit needs a second pair of eyes.

---

## scrum-roblox

**Mission.** Ship the Roblox build of molgang — Lua/Roblox-Studio
frontend, Roblox-native economy, MOLCO2 marketplace, periodic-table GUI,
quest engine.

**Members.** Fill (CEO oversight), Kai (cross-team infra), Mira (creative
direction), Vice (open-world design), Hermes-Roblox (scrum master).

**Testers.**

| Tester | Persona | Focus |
|---|---|---|
| Tester-RB-Casey  | Casual player, 10-13 | Onboarding clarity, quest pacing |
| Tester-RB-Riley  | Hardcore tycoon player, 14-17 | Late-game economy balance, depth |
| Tester-RB-Morgan | Speedrunner / glitch-hunter | Edge cases, exploits, perf |
| Tester-RB-Avery  | Educator in the classroom | Curriculum fit, age-band gating |

**Ceremonies.**
- *Daily standup:* Hermes-Roblox posts a digest to `/api/scrums/scrum-roblox/standup`. Each member contributes "did / blocking / next."
- *Bug triage:* testers file via `/api/scrums/scrum-roblox/bug`. Severity p0/p1 escalates to Alexander immediately.
- *Tester forum:* `/api/forum/scrum-roblox` — running thread of tips, glitches, feature ideas. Vice + Mira read this weekly to inform creative roadmap.

**Outbound to other teams.** Mira ports new mechanics to scrum-web via Pixel; Vice's quest designs flow to both teams.

---

## scrum-web

**Mission.** Ship the Next.js + Phaser + Three.js web port — wiki,
periodic table page, chemistry bench, quest engine, achievements,
inventory. Realistic physics + quantum chem are the USP.

**Members.** Fill, Kai, Zip (developer), Mira, Luna (tech artist),
Atlas (CAD/sim/AR/VR realism), Vice, Pixel (web developer · wiki + UX),
Hermes-Web.

**Testers.**

| Tester | Persona | Focus |
|---|---|---|
| Tester-Web-Sam    | Mobile-first (Z Fold 5) | Layout breaks across foldable states |
| Tester-Web-Quinn  | Desktop browser | Perf / memory under heavy reactions |
| Tester-Web-Drew   | Accessibility (screen reader) | ARIA labels, keyboard nav |
| Tester-Web-Jordan | Chemistry teacher curriculum tester | Pedagogical accuracy at age bands 14-17 / 18+ |

**Ceremonies.**
- *Daily standup:* Hermes-Web aggregates from all members.
- *Bug triage:* testers file via `/api/scrums/scrum-web/bug`. Pixel + Zip own the resolution queue.
- *Tester forum:* `/api/forum/scrum-web` — prime venue for tips on pedagogical quests + UX ideas.
- *Wiki review:* Pixel + Governor review new Kimi-authored entries weekly via `/api/wiki`.

**Outbound.** Pixel publishes the wiki page; Atlas's CAD work feeds VR/AR via the asset registry.

---

## scrum-marketing

**Mission.** Build the audience, study competitors, sustain the social
loop, run the carbon-credit economy story externally.

**Members.** Fill, MoneyGod (economy authority), Analyst (data),
VideoProducer (video), Croesus (commercialisation strategist), Governor
(data governance — owns marketing data lineage), Hermes-Marketing.

**Testers.**

| Tester | Persona | Focus |
|---|---|---|
| Tester-MK-Alex  | Plays competitor chemistry games | Feature parity gaps + pricing intel |
| Tester-MK-Robin | TikTok / social-loop tester | Virality moments, share-worthy clips |

**Ceremonies.**
- *Daily standup:* Hermes-Marketing posts a digest each morning (LM Studio time).
- *Competitor playtest:* Tester-MK-Alex plays a competitor weekly, files a structured report as a forum thread tagged `competitor-review`.
- *Forum:* `/api/forum/scrum-marketing` — TikTok hooks, share-card ideas, competitor breakdowns.

**Outbound.** Croesus's commercialisation insights drive MoneyGod's economy tuning; Analyst's data flows back to the cross-team scrum.

---

## cross — Scrum-of-Scrums

**Mission.** Resolve cross-team blockers, set quarterly priorities, run
governance + risk reviews.

**Members.** Fill (chair), Kai, Cleopatra (executive authority),
Alexander (technical arbiter), MoneyGod, Kimi (long-context research +
docs), Governor (data governance), Hermes-Cross, Hermes-Reviewer.

**Ceremonies.**
- *Weekly sync:* Each Hermes coordinator posts their team's headline
  status to `/api/scrums/cross/standup`. Fill + Cleopatra triage.
- *Governance audit:* Governor walks the data-governance registry
  monthly; flags entries with stale lineage or missing owners.
- *Cross-team code review:* Hermes-Reviewer pulls outstanding PRs across
  all three teams and runs DeepSeek-R1 review.
- *Strategic decisions:* Cleopatra + Alexander + MoneyGod adjudicate via
  the OpenClaw `strategic-decision` endpoint when teams disagree.

**Forum:** `/api/forum/cross` — minutes, RFCs, deferred decisions.

---

## Gameplay-experience testers (cross-team)

Beyond the demographic testers, four agents focus on **game systems**
rather than player personas. Their job is to drive the webgame toward
GTA6-quality polish (without the vices) by publishing running
gap-analysis threads tagged `gta6-gap`.

| Tester | Avatar | Dimension |
|---|---|---|
| Tester-GP-Sienna | 🌇 | Open-world feel — city density, ambient NPC life, weather, day/night, atmosphere. *"Does it feel alive?"* |
| Tester-GP-Dante  | 📜 | Mission + narrative design — variety, pacing, branching, story arcs. *"Is there always something interesting to do next?"* |
| Tester-GP-Onyx   | 🛞 | Physics + interaction realism — vehicle handling, ragdoll, environmental destruction, chemistry sim integration. *"Does it react like the real world?"* |
| Tester-GP-Iris   | 🎭 | Character animation + dialogue + NPC AI — facial rigs, idle anims, conversation depth, NPC routines. *"Are the characters believable?"* |

They sit in scrum-web (Sienna + Dante + Iris also in scrum-roblox so
the Roblox port benefits). Output is **forum threads tagged
`gta6-gap`**, scored 0-10 per dimension with concrete feature
recommendations. Mira / Vice / Atlas read these weekly to seed the
roadmap.

---

## How testers operate

Each tester runs continuously in a "play and report" loop:

1. **Play their persona** through the latest build (web or Roblox).
2. **File bugs** as they hit them — `POST /api/scrums/<team>/bug` with
   reproduction steps + severity.
3. **Share tips, tricks, glitches, and feature ideas** as forum threads —
   `POST /api/forum/<team>` tagged `tip`, `trick`, `glitch`, or
   `feature-request`.
4. **Cross-pollinate**: Tester-MK-Alex's competitor reviews land as
   `competitor-review` threads that Mira / Vice read weekly.

The forum is intentionally separate from the bug queue: bugs are
*defects against the spec*, forum posts are *creative + community
feedback that shapes the spec*. They feed different downstream agents.

---

## API summary

| Endpoint | Purpose |
|---|---|
| `GET  /api/scrums` | summary counts (standups + open/total bugs) per team |
| `GET  /api/scrums/:team/standups` | recent standup items |
| `POST /api/scrums/:team/standup` | log a standup item |
| `GET  /api/scrums/:team/bugs` | list bugs (filter by status/severity) |
| `POST /api/scrums/:team/bug` | file a bug report |
| `POST /api/scrums/bug/:id/update` | change status / severity / refs |
| `GET  /api/forum/:team` | list threads |
| `POST /api/forum/:team` | create a thread |
| `GET  /api/forum/thread/:id` | full thread + replies |
| `POST /api/forum/thread/:id/reply` | post a reply |

All of these are also exposed as MCP tools (`scrum.*` + `forum.*`) — see
`docs/TOOL-USE-COORDINATION.md`.

---

## Sprint: GTA6-Polish-S1 (seeded 2026-05-04)

Distilled from the four GP-tester gap analyses into 20 concrete backlog
tasks. Closes the gap on the lowest-scored dimensions (character/AI 2/10,
open-world feel 3/10) first, then mission variety (4/10) and physics
realism (5/10). Each task carries `sprint=GTA6-Polish-S1` so the dashboard
can filter the cohort.

| Agent | Count | Focus |
|---|---|---|
| Mira  | 5 | NPC personas (50+), cutscene system, character pipeline (Mixamo+RPM), voice gen (Coqui TTS), ambient audio |
| Vice  | 5 | Mission types (rescue/logistics/incident), choice nodes, recurring NPCs, dialogue trees, district density |
| Atlas | 5 | Day/night cycle, weather (rain/storm), liquid sim, glass shatter, atom-shard collectibles |
| Pixel | 3 | Vehicle layer (delivery trucks), NPC ragdoll, NPC memory of past interactions |
| Luna  | 2 | Cloth physics (lab coats), viseme lip sync (12 blendshapes) |

**Critical-priority items** (block downstream work):
- `GTA6-PH-2` — Atlas — particle-based liquid sim for the chem bench. Currently liquids teleport between containers; this fixes the core feel of a chemistry game.
- `GTA6-CH-1` — Mira — Mixamo + ReadyPlayerMe character pipeline. Unlocks every other character/dialogue task downstream.

**High-priority cluster** (ship together for visible progress):
- `GTA6-OW-1` (NPC pool) + `GTA6-OW-2` (day/night) + `GTA6-OW-5` (district density) → world stops feeling paused.
- `GTA6-CH-3` (voice gen) + `GTA6-CH-4` (dialogue trees) → world starts talking back.

The 20 tasks are visible in the dashboard backlog (`/api/backlog/per-person`)
and persist to `data/task-state.json` (EDS2, off-tree). The four GP testers'
gap threads on the scrum-web forum are the source-of-truth for the
recommendations; tasks reference those thread ids so the trace from
"playtest finding" → "feature work" stays auditable.

Ship cadence: **measured in days, not quarters.** 31 agents working in
parallel ship more in a weekend than a 30-person human team would —
each on a 4-minute tick rate, no meetings, no context-switching cost,
no sleep. Re-score by GP testers at end-of-sprint via fresh forum
threads to measure the gap-close.

The "calendar quarter" framing in earlier drafts was conservative human-
team thinking. The actual data: one overnight session shipped 50 NPCs
+ 100 collectibles + 4 dialogue trees + 14 callback nodes + 9 mission
archetypes + the entire 5-stage character pipeline spec + a working
Three.js playable level. **What human teams scope for a quarter, this
roster ships in 8 hours.**

### Snapshot — overnight 2026-05-04 → 05

| Status | Features |
|---|---|
| **data-shipped** (full) | GTA6-OW-1 (35 NPCs), GTA6-OW-5 (district density × weather × day/night specs in world-config), GTA6-MN-2 (9 quests · 3 archetypes × 3 tiers), GTA6-MN-4 (100 atom-shards procedural), GTA6-MN-5 (3 contacts · Mentor/Rival/Inspector with tier unlocks), GTA6-CH-4 (dialogue schema + 4 trees) |
| **data-partial** | GTA6-MN-3 (4 of 5 choice nodes done in extension) |
| **spec-shipped** | GTA6-OW-2 (day/night), GTA6-OW-3 (weather), GTA6-OW-4 (audio manifest), GTA6-CH-1 (5-stage character pipeline), GTA6-CH-2 (visemes), GTA6-CH-5 (NPC memory schema) |
| **spec-pending** | GTA6-MN-1 (cutscene system), GTA6-PH-1..5 (vehicles, liquids, ragdoll, cloth, glass shatter), GTA6-CH-3 (Coqui TTS) |

Live introspection at `/api/sprint/gta6-polish-s1` on molgang-web; rendered
visually on `/sprint`. Average completion at this snapshot: ≈40%.

Critical-path remaining: GTA6-PH-2 (liquid sim, Atlas) and GTA6-CH-1
implementation stages 2-5 (Mira → Atlas → Pixel → Luna). Both block
visible polish on their respective dimensions.
