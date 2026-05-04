# Documentation pipeline — Kami

Typeset documents (one-pagers, long-form, portfolios, resumes, slide
decks, white papers, letters) are rendered by **Kami** — a Claude Code
skill from [tw93/kami](https://github.com/tw93/kami). Kami enforces a
single design language (warm parchment, ink-blue accent, serif-led
hierarchy) so every doc that leaves the project looks like it came from
the same studio.

## Why a queue, not a daemon

Kami runs as a Claude Code skill. Skills only fire inside an active
Claude Code session — they need keychain auth, the user's local skills
directory, and a writable working tree. virtualpc cannot recursively
invoke `claude` from its systemd context without (a) splitting the
auth, (b) tripping the autoloop hook, (c) burning the user's plan on
every doc request.

So virtualpc **queues briefs**; a Claude Code session **renders them**.

```
  ┌─────────────┐        ┌──────────────┐        ┌──────────────────┐
  │ agent (e.g. │ POST   │ /api/kami/   │ GET    │ Claude Code      │
  │ Mira) wants │ ─────▶ │ queue        │ ─────▶ │ (you)            │
  │ a one-pager │        │ data/kami-   │        │ Kami auto-fires  │
  │             │        │ briefs.json  │        │ → docs/kami/*.html│
  └─────────────┘        └──────────────┘        └──────────────────┘
                                ▲                          │
                                └── PUT /status=delivered ─┘
```

## One-time setup

```bash
# Install Kami globally for Claude Code (already done on this box)
npx skills add tw93/kami -a claude-code -g -y

# Verify
ls ~/.claude/skills/kami/
```

Optional brand profile (sets persistent identity used across docs):

```bash
mkdir -p ~/.config/kami
# Author ~/.config/kami/brand.md per
# https://github.com/tw93/kami#brand-profile
```

## Producer side — queueing a brief

Three entry points:

**HTTP** — for shell scripts, GitHub Actions, anything HTTP-capable:

```bash
curl -X POST http://127.0.0.1:3100/api/kami/queue \
  -H 'content-type: application/json' \
  -d '{
    "requester": "Mira",
    "type": "one-pager",
    "title": "molgang launch one-pager",
    "audience": "press + investors",
    "outline": "## Hook\nReal physics + quantum chemistry without the vice.\n## Mechanics\n...",
    "sources": ["docs/SCRUM-CHARTERS.md", "shared/elements.json"],
    "outputPath": "docs/kami/launch-one-pager.html",
    "language": "en"
  }'
```

**MCP** — for agents going through the tool layer:

```bash
curl -X POST http://127.0.0.1:3100/api/mcp/call \
  -H 'content-type: application/json' \
  -d '{
    "agent": "Mira",
    "tool": "kami.queue",
    "args": { "requester": "Mira", "type": "one-pager", "title": "...", "outline": "..." }
  }'
```

**Bulk** — for the standard project-wide refresh:

```bash
node scripts/regenerate-docs.js --scope all
# Queues briefs for README, architecture, and a wiki one-pager.
```

## Renderer side — Claude Code session

Open Claude Code in this repo and ask:

> Render the next pending Kami brief from
> `http://127.0.0.1:3100/api/kami/briefs?status=queued`. Use the Kami
> skill, write the output to the brief's `outputPath`, then mark the
> brief delivered via POST
> `/api/kami/briefs/<id>/status` with `{"status":"delivered","notes":"..."}`.

Kami auto-triggers on doc-shaped requests (the brief's `type` field +
title are enough). It picks the right template (`*-en.html`, `*.html`,
slide deck) per language, drops in the outline content, applies the
design language, and writes the output file.

## Brief schema

```ts
{
  requester: string;                   // agent / human queueing the doc
  type: 'one-pager' | 'long-doc' | 'letter' | 'portfolio'
      | 'resume' | 'slides' | 'white-paper';
  language: 'en' | 'zh' | 'ja';        // Kami picks templates per language
  title: string;                       // appears at the top of the doc
  audience?: string;                   // tone hint for the renderer
  outline: string;                     // markdown — sections + key points
  sources?: string[];                  // file paths / URLs / governance ids
  outputPath?: string;                 // default: docs/kami/<id>.html
}
```

The renderer can pull from `sources` — read files, fetch URLs, look up
governance entries — to add specifics. The brief is a *spec*, not the
finished prose.

## Output directory

Rendered docs land in `docs/kami/` by default:

```
docs/kami/
├── README.html
├── VIRTUALPC-ARCHITECTURE.html
├── wiki-one-pager.html
└── launch-one-pager.html
```

Slide decks land as PDFs (Kami's slide template runs through `slides.py`).
Long docs and one-pagers stay as HTML — open in any browser, or print to PDF.

## Governance integration

Every Kami brief gets a `requester` field, persisted forever in
`data/kami-briefs.json`. Governor (data governance analyst) tracks who
asked for what + when it was delivered, so any rendered doc has a
traceable lineage back to the agent + governance entries that fed it.
