# VirtualPC MVP Pitch & Sales Playbook

A one-page guide for demoing and selling VirtualPC as soon as it runs on Ollama or Vultr.

---

## 30-second pitch

> VirtualPC turns one server into a full AI team. Install it in five minutes and you get a specialist agent roster — CEO, CTO, developers, artists, data analysts, testers and scrum masters — orchestrated behind a single dashboard, with built-in safety gates so risky work cannot reach production without human approval.

No per-token pricing. No cloud lock-in. You own the hardware and the data.

---

## The problem we solve

| Pain | How VirtualPC fixes it |
|------|------------------------|
| Hiring AI talent is expensive and slow | One install gives you a pre-trained team that works 24/7 |
| Multiple AI tools do not talk to each other | One LiteLLM gateway + task engine coordinates every agent |
| LLM mistakes reach production | Deliberation gates block high-risk changes until a human says yes |
| Cloud API bills explode | Run local models via Ollama; cloud keys are optional fallbacks |
| No audit trail | Every decision, task and token is logged |

---

## Ideal customers

1. **Indie studios & small dev teams** — ship faster with an AI art/code/test department.
2. **Data-science consultancies** — let the Analyst + Governor agents clean lineage and repeat pipelines.
3. **Security-conscious organisations** — on-premise deployment, sovereign P2P knowledge graph, no data leakage to third parties.
4. **Cloud resellers / MSPs** — white-label VirtualPC and host it for clients on Vultr.

---

## Live demo script (5 minutes)

1. **Install** — run `./scripts/setup-ollama.sh` and show the health checks.
2. **Dashboard** — open `public/index.html`, then `dashboard.html`.
3. **Agent roster** — open `public/roles.html`; highlight Fill (CEO), Kai (CTO), Analyst, Athena (reviewer).
4. **Task engine** — create a task, show subtasks streaming in real time.
5. **Safety** — mention deliberation gates: six reviewers + a judge before high-risk code merges.
6. **Pricing** — show `public/pricing.html`; emphasise self-hosted = no token tax.

---

## Key differentiators

- **Roster, not chatbots.** Agents have names, roles, model routes and tool ACLs.
- **Human-in-the-loop by default.** CEO Fill and Athena block risky spend and code.
- **Local-first.** Ollama models work out of the box; cloud is an optional fallback.
- **P2P knowledge graph.** Newsgroup 2.0 stores agent memory with BFT consensus and cryptography.
- **Self-healing deployment.** Auto-update pulls, rebuilds and restarts safely every 15 minutes.

---

## Objection handling

| Objection | Response |
|-----------|----------|
| "I can just use ChatGPT." | ChatGPT is one agent with one context. VirtualPC is a coordinated team with memory, roles and governance. |
| "Local models are not good enough." | Swap in Claude, OpenAI, Grok, DeepSeek, Kimi via the same LiteLLM gateway without changing agent code. |
| "How do I trust the agents?" | Every high-risk change goes through deliberation gates; Athena enforces coding standards; all actions are logged. |
| "I don't have a GPU." | Works on CPU with smaller Ollama models, or deploy on a Vultr GPU instance for $0.50–1.50/hour. |
| "This looks complex." | One command installs the whole stack; the landing page and videos guide users end-to-end. |

---

## Commercial tiers (overview)

See `public/pricing.html` for the full breakdown.

- **Solo** — free, self-hosted, community support.
- **Team** — €49/seat/year with commercial support and priority patches.
- **Enterprise** — custom on-premise, SSO, custom agents.
- **Managed Starter / Scale** — €199–€599/month, we run it on Vultr.
- **White-label** — custom reseller terms.

---

## Sales assets

| Asset | Location | Use case |
|-------|----------|----------|
| Landing page | `public/index.html` | First impression, demo videos |
| Pricing | `public/pricing.html` | Close the deal |
| Roles | `public/roles.html` | Explain who does what |
| Videos | `docs/videos/*.mp4` | 4-language narrated walkthroughs |
| Install script | `scripts/setup-ollama.sh` | Let prospects try it in 5 minutes |
| Cloud deploy | `scripts/vultr-cloud-init.yml` | One-click Vultr deployment |

---

## Next actions to get to first revenue

1. Record a 60-second founder demo using the existing videos as B-roll.
2. Post the landing page to Hacker News, Reddit r/selfhosted, X and LinkedIn.
3. Offer 3 free managed pilots to design partners in exchange for a testimonial.
4. Add a Calendly link to `public/pricing.html`.
5. Set up Stripe Checkout for the Team and Managed tiers.
