# Headroom — context-compression token saver

[headroom](https://github.com/chopratejas/headroom) compresses tool outputs,
logs, RAG chunks, files, and conversation history before they reach the LLM —
**60–95% fewer tokens** at the same answer quality (e.g. a code-search workload
17,765 → 1,408 tokens, 92% saved).

## Containerized (the portable way)

It ships as a **sidecar** in `docker-compose.yml` from the published image, so
the token saver travels with the repo — clone + `docker compose up` on any server
and it is there, no host Python install:

```yaml
headroom:
  image: ghcr.io/chopratejas/headroom:latest
  ports: ["8787:8787"]
  command: ["proxy", "--host", "0.0.0.0", "--port", "8787"]
```

The app gets `HEADROOM_PROXY=http://headroom:8787`. Point agent/LLM traffic at the
proxy for zero-code compression.

```bash
docker compose up -d            # brings up neo4j + headroom + virtualpc
curl -s localhost:8787/health   # headroom proxy
```

## Other modes

- **CLI wrapper:** `headroom wrap claude` — wraps a coding agent.
- **Library:** `from headroom import compress`.
- **MCP server:** tools `headroom_compress`, `headroom_retrieve`, `headroom_stats`.

## Why a sidecar, not baked into the app image

The virtualpc app image is Node-only and stays lean (<400 MB); headroom is
Python/Rust. Keeping it a separate container keeps both runtimes clean and lets
either be upgraded independently — and makes the whole stack reproducible on a
fresh server from the repo alone.
