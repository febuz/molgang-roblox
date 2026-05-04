# Agent model roster — GPU sizing + picks

**Hardware:** 2× RTX 3090 (24 GB VRAM each).
**Policy:** GPU0 reserved for display + browser; GPU1 for inference (per
`memory:project_gpu_policy`). Models live on EDS2 (1.1 TB) so the root
volume stays clean.
**Constraint:** every model picked here fits in 24 GB at Q4_K_M
quantization with room for context + KV cache. The 26-27B sweet spot is
intentional — one big model fits cleanly on one card.

---

## 1. Currently loaded (LM Studio :1234)

| Model id (LM Studio)                       | Params      | Q4 footprint | Speciality |
|--------------------------------------------|-------------|--------------|------------|
| `microsoft/phi-4`                           | 14 B dense  | ~9 GB        | reasoning + structured output, fast |
| `mistralai/devstral-small-2-2512`           | ~22 B       | ~13 GB       | code (Devstral fine-tune of Mistral) |
| `google/gemma-4-26b-a4b`                    | 26 B (4 B active MoE) | ~16 GB | dense factual prose, long context |
| `qwen/qwen3.5-27b`                          | 27 B        | ~16 GB       | strong instruction following + structured output |
| `deepseek/deepseek-r1-0528-qwen3-8b`        | 8 B         | ~5 GB        | reasoning specialty, fast |
| `text-embedding-nomic-embed-text-v1.5`      | -           | ~0.3 GB      | embeddings only |

These six load comfortably on one 3090 and are the **default expert
team** every agent draws from.

## 2. Routing matrix

`AGENT_MODEL_ROUTES` in `src/lmstudio.ts` picks the *primary* model per
agent. `AgentMeta.models[]` in `src/agent-registry.ts` is the
multi-model expert team that the token-tracker measures across.
`TASK_TYPE_ROUTES` overrides per task type:

| Task type      | Goes to              | Why |
|----------------|----------------------|-----|
| `chat`         | phi-4                | fast default |
| `code`         | devstral             | code-tuned 22 B |
| `concept`      | gemma-4-26b          | dense narrative |
| `reasoning`    | deepseek-r1          | reasoning specialty |
| `arbitration`  | deepseek-r1          | reasoning |
| `deep`         | qwen3.5-27b          | longest-context audit |
| `cheap`        | phi-4                | low-latency cheap |
| `design`       | claude-sonnet (CLI)  | designer agents only |
| `docs`         | claude-sonnet (CLI)  | Kami skill auto-fires |
| `embedding`    | nomic-embed          | retrieval |

When Claude CLI auth is missing, `docs` falls back to gemma-4-26b
(plain prose, no Kami styling).

---

## 3. Per-agent picks — the new agents

### Pixel — Web Developer (Next.js / Phaser / Three.js / Wiki UX)

**Models (in priority order):**
1. `devstral` — primary. Mistral 22 B fine-tuned for code; outperforms
   StarCoder2-15B on TypeScript benchmarks; fits in 13 GB at Q4_K_M.
2. `deepseek-r1` — architecture reasoning (e.g. component decomposition,
   state-management trade-offs). 8 B reasoning specialty; very fast
   (sub-second tokens at our config).
3. `phi-4` — UX prose + small refactors. 14 B dense, structured output,
   1-3 s on phi-4-loaded VRAM.
4. `gemma-4-26b` — long-context code reviews + design docs.

**Why these?** Web dev is mostly TypeScript/JSX + accessibility prose +
asset wiring. devstral handles the bulk; deepseek-r1 covers the "why
am I getting this hydration error" reasoning passes; phi-4 is the
fast-path; gemma-4-26b absorbs the long file when needed.

### Governor — Data Governance / Wiki Analyst

**Models (in priority order):**
1. `phi-4` — primary. 14 B dense, microsoft. Excellent at structured
   JSON output (governance entries are JSON-schema-shaped) + instruction
   following. Fast for the per-write registry edits.
2. `qwen3.5-27b` — heavy audits ("walk every shared/*.json and report
   licensing gaps"). Strong instruction-following; long context.
3. `gemma-4-26b` — lineage prose for wiki entries (the long-form body
   field). Dense factual writing.
4. `deepseek-r1` — reasoning when the lineage forks ("this entry
   conflicts with the source — which is canonical?").

**Why these?** Data governance is structured-output + lineage prose +
audit reasoning. phi-4 carries the routine writes; qwen3.5-27b handles
deep audits; gemma authors the wiki narrative; deepseek-r1 reasons
through conflicts.

---

## 4. Alternative pretrained models we could pull

If specialized capability is needed beyond the default six, candidates
that fit the 24 GB envelope:

### Code / Web dev candidates

| Model                                 | Params | Q4 size | Why consider |
|---------------------------------------|--------|---------|--------------|
| Qwen2.5-Coder-14B-Instruct            | 14 B   | ~9 GB   | Top-tier on JavaScript/TypeScript benchmarks; better than devstral on JSX |
| Qwen2.5-Coder-32B-Instruct            | 32 B   | ~19 GB  | Best open coder; tight on 24 GB but works at Q4_K_S |
| DeepSeek-Coder-V2-Lite-Instruct       | 16 B MoE (2.4 B active) | ~10 GB | Very fast inference (MoE); excellent code quality |
| StarCoder2-15B                        | 15 B   | ~9 GB   | Pure code, no chat; fits as a fallback |

### Data governance / structured-output candidates

| Model                                 | Params | Q4 size | Why consider |
|---------------------------------------|--------|---------|--------------|
| Granite-3.0-8B-Instruct               | 8 B    | ~5 GB   | IBM enterprise model, RAG-tuned, strong on structured data |
| Granite-3.0-2B-Instruct               | 2 B    | ~1.5 GB | fast tier-1 fallback for simple registry edits |
| Mistral-Nemo-12B-Instruct             | 12 B   | ~7 GB   | 128 K context — long-document audits |
| Llama-3.1-8B-Instruct                 | 8 B    | ~5 GB   | general-purpose, structured output  |
| InternLM2-Math-Plus-20B               | 20 B   | ~12 GB  | only if Governor needs to verify quantitative claims in wiki |

### Long-context research

| Model                                 | Params | Q4 size | Why consider |
|---------------------------------------|--------|---------|--------------|
| Mistral-Nemo-12B-Instruct             | 12 B   | ~7 GB   | 128 K context |
| Qwen2.5-14B-Instruct-1M               | 14 B   | ~9 GB   | claims 1 M context (in practice 256 K usable) |
| Yi-1.5-34B-Chat-16K                   | 34 B   | ~21 GB  | tight but workable on 24 GB |

The Kimi agent uses the Moonshot CLI for 200K+ context off-host, so a
local 1M-context model is mostly redundant — Mistral-Nemo-12B is the
practical "Kimi offline" replacement when Moonshot quota is out.

---

## 5. Pulling a new model

```bash
# LM Studio CLI
lms get qwen2.5-coder-14b-instruct

# Or via the LiteLLM gateway config (add to deploy/litellm-config.yaml):
#   - model_name: qwen2.5-coder-14b
#     litellm_params:
#       model: lm_studio/qwen/qwen2.5-coder-14b-instruct

# Then update src/lmstudio.ts AGENT_MODEL_ROUTES + AgentMeta.models[]
# to include the new substring (typically the lowercased family name).
```

Verify the model resolves: `curl http://127.0.0.1:1234/v1/models`.

---

## 6. VRAM budget (single 3090)

| Reserved for                      | VRAM   |
|-----------------------------------|--------|
| Linux + display server            | ~1.5 GB |
| Browser tabs / dashboard          | ~1.0 GB |
| KV cache headroom (32 K context)  | ~3.0 GB |
| **Available for one model**       | **~18.5 GB** |

So 26-27 B at Q4_K_M (~16 GB) is the comfortable ceiling on a single
3090. Two models loaded simultaneously is possible only when both stay
under 9 GB each — typical pattern is one big + one small (e.g.
gemma-4-26b + deepseek-r1-8b).

GPU symbiosis (`scripts/gpu-symbiosis.sh`) can rebalance LM Studio's
loaded set when memory pressure climbs; see
`memory:project_gpu_policy`.
