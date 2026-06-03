#!/usr/bin/env python3
"""
Wiki knowledge sync — publish the architecture/strategy docs into the Live Wiki
under the Head / Hands / Heart tiers, and ingest the Heart (definitive) tier into
LightRAG so queries + the local Paperclip models can use them.

  Head  — steering: ideas, prompts, strategy, agent memories
  Hands — process: agents, skills, rules, projects
  Heart — output: definitive, client-ready docs (also -> LightRAG corpus)

Usage:  python3 scripts/wiki-knowledge-sync.py [--api http://localhost:3100]
"""
import json, os, sys, urllib.request

API = "http://localhost:3100"
if "--api" in sys.argv:
    API = sys.argv[sys.argv.index("--api") + 1]

DOCS = os.path.join(os.path.dirname(__file__), "..", "docs")

# (namespace, id, term, filename, also_lightrag)
ENTRIES = [
    ("head",  "coordinator-charter", "Coordinator Charter (PO/Scrum-Master)", "CLAUDE-COORDINATOR-CHARTER.md", False),
    ("head",  "product-catalog",     "Product Catalog (P1/P2/P3)",            "PRODUCTS.md",                   True),
    ("head",  "capability-charter",  "Capability & Data-Maturity Charter",    "CAPABILITY-CHARTER.md",         True),
    ("hands", "headroom",            "Headroom token-saver",                  "HEADROOM.md",                   False),
    ("head",  "feature-capitalization", "Features as immateriële activa (token economics)", "FEATURE-CAPITALIZATION.md", True),
    ("hands", "architecture",        "VirtualPC Architecture",                "VIRTUALPC-ARCHITECTURE.md",     True),
    ("hands", "scrum-charters",      "Scrum Charters",                        "SCRUM-CHARTERS.md",             False),
    ("hands", "coding-standards",    "Coding Standards",                      "CODING-STANDARDS.md",           False),
    ("hands", "athena-review-gate",  "Athena Review Gate (Opus 4.8)",         "ATHENA-REVIEW-GATE.md",         True),
    ("heart", "platform-architecture-deliverable", "VirtualPC — Architecture & Operating Model (deliverable)", "VIRTUALPC-ARCHITECTURE.md", True),
    ("heart", "review-pipeline-deliverable",       "Competing-branch Opus review pipeline (deliverable)",      "ATHENA-REVIEW-GATE.md",     True),
]

def post(path, body):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except Exception as e:
        return {"success": False, "error": str(e)}

def read(fn):
    with open(os.path.join(DOCS, fn), encoding="utf-8") as f:
        return f.read()

def summary_of(text):
    for line in text.splitlines():
        s = line.strip().lstrip("#").strip()
        if s and not s.startswith("---"):
            return s[:160]
    return "VirtualPC knowledge entry"

wiki_ok = 0
heart_chunks = []
for ns, eid, term, fn, to_lr in ENTRIES:
    body = read(fn)
    r = post("/api/wiki", {"id": eid, "term": term, "namespace": ns,
                           "summary": summary_of(body), "body": body, "author": "Claude Coordinator"})
    ok = r.get("success")
    wiki_ok += 1 if ok else 0
    print(f"  wiki[{ns:5}] {eid:38} {'OK' if ok else 'ERR ' + str(r.get('error'))[:60]}")
    if to_lr:
        heart_chunks.append({
            "id": f"wiki-{eid}", "source": f"wiki:{ns}/{eid}", "source_kind": "doc",
            "title": term, "content": body, "meta": {"namespace": ns, "tier": "heart" if ns == "heart" else ns},
        })

print(f"\nWiki: {wiki_ok}/{len(ENTRIES)} entries upserted.")

# Ingest the definitive tier into LightRAG.
r = post("/api/corpus/ingest", {"chunks": heart_chunks})
if r.get("success"):
    print(f"LightRAG: ingested {r.get('ingested')} chunk(s)" + (" (OFFLINE — embeddings unavailable)" if r.get("offline") else ""))
else:
    print(f"LightRAG: ingest error — {r.get('error')}")
