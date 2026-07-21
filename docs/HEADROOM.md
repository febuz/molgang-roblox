# Headroom — context-compression token saver

[headroom](https://github.com/chopratejas/headroom) compresses tool outputs,
logs, RAG chunks, files, and conversation history before they reach the LLM —
**60–95% fewer tokens** at the same answer quality (e.g. a code-search workload
17,765 → 1,408 tokens, 92% saved).

## Installed on the host (no env, no container)

headroom runs **directly on the host system** — not in a venv, not in a Docker
container. Installed system-wide:

```bash
pip install --break-system-packages headroom-ai     # add sudo for /usr-wide
headroom --help                                       # CLI: ~/.local/bin/headroom
python3 -c "import headroom; print(headroom.__version__)"
```

Start the optimization proxy on the host:

```bash
headroom proxy --port 8787
```

The dockerized app reaches it via the host gateway —
`HEADROOM_PROXY=http://host.docker.internal:8787` is already wired in
`docker-compose.yml`. Point agent/LLM traffic at the proxy for zero-code
compression.

## Modes

- **Proxy:** `headroom proxy --port 8787` — zero-code integration.
- **CLI wrapper:** `headroom wrap claude` — wraps a coding agent.
- **Library:** `from headroom import compress`.
- **MCP server:** tools `headroom_compress`, `headroom_retrieve`, `headroom_stats`.

## Why host, not a container

It is shared infrastructure for *every* agent/terminal on the box, so it lives
on the host once rather than being trapped inside one container's environment.
