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
