# Ingesting external documents into the VirtualPC corpus

VirtualPC has a **Corpus** module (`src/integrations/corpus/index.ts`) that turns text into chunked, embedded `Corpus` nodes in Neo4j. This is how external knowledge becomes searchable by agents.

## What is integrated automatically?

At startup, VirtualPC already ingests:

- `asset-graph` — assets from the asset registry.
- `governance-graph` — governance entries and wiki entries.
- `family-graph` — the Familie knowledge graph.

Arbitrary external HTML or Markdown files (for example landing pages outside the repo) are **not** auto-ingested.

## How to ingest a file manually

Use the helper script `scripts/ingest-html-to-corpus.py`:

```bash
# 1. Generate a corpus payload from an external HTML file
python3 scripts/ingest-html-to-corpus.py \
  --file /Users/develuse/Documents/knitnet_landing.html \
  --title "KnitNet landing page" \
  --kind doc \
  --out data/external/knitnet-landing-corpus.json

# 2. POST it to a running VirtualPC instance
curl -X POST http://localhost:3100/api/corpus/ingest \
  -H "Content-Type: application/json" \
  -d @data/external/knitnet-landing-corpus.json
```

You can also POST directly:

```bash
python3 scripts/ingest-html-to-corpus.py \
  --file /Users/develuse/Documents/knitnet_landing.html \
  --title "KnitNet landing page" \
  --kind doc \
  --api http://localhost:3100/api/corpus/ingest
```

## Requirements

- Neo4j running and reachable via `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD`.
- An embedding endpoint reachable via `EMBED_URL` (defaults to LM Studio on `http://127.0.0.1:1234/v1`).
- VirtualPC running (`npm start` or `systemctl --user start virtualpc`).

## Current status: `knitnet_landing.html`

The file `/Users/develuse/Documents/knitnet_landing.html` has been extracted and chunked into `data/external/knitnet-landing-corpus.json`. It is ready to be POSTed into the corpus as soon as VirtualPC + Neo4j are running.

You can verify the chunks:

```bash
python3 -c "import json; print(len(json.load(open('data/external/knitnet-landing-corpus.json'))['chunks']), 'chunks')"
```

## From corpus chunks to graph triples

The corpus gives agents **semantic retrieval** (search passages). If you also want **graph triples** (subject-predicate-object nodes), extract facts from the text and submit them via:

```bash
POST /api/lightrag/facts/submit
{
  "subject": "KnitNet",
  "predicate": "uses",
  "object": "KnitWeb",
  "source": "knitnet_landing.html",
  "created_by": "did:knit:loom"
}
```

For now, graph triples are added manually or by agent pipelines; the corpus provides the searchable raw text layer.
