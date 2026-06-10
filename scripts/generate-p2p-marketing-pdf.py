#!/usr/bin/env python3
"""
Generate the P2P Knowledge Graph Marketing Strategy PDF.
Run with: python3 scripts/generate-p2p-marketing-pdf.py
Output:   docs/p2p-marketing-strategy.pdf
"""

import os, time

# -- Content --------------------------------------------------------------------

TITLE = "P2P Knowledge Graph - Go-To-Market Strategy"
SUBTITLE = "VirtualPC Platform | Confidential"

SECTIONS = [
    ("Executive Summary", [
        "VirtualPC operates a distributed multi-agent AI platform underpinned by a P2P knowledge graph: "
        "a shared Neo4j graph that 40+ autonomous agents read and write in real time. This document outlines "
        "the commercial opportunity, target segments, positioning, and a 90-day launch roadmap for bringing "
        "the platform to market.",
        "Key value drivers: 87% LLM cost reduction via local-first routing, zero-trust P2P fact validation "
        "with quorum consensus, quantum-information-ready schema, and Kafka-backed eventual consistency "
        "across all nodes.",
    ]),
    ("Market Opportunity", [
        "The enterprise AI orchestration market is projected to exceed USD 28 billion by 2028 (CAGR 36%). "
        "Within this, distributed knowledge graph platforms represent a high-growth sub-segment driven by "
        "demand for explainable AI, audit trails, and multi-agent coordination.",
        "Three primary vectors:",
        "  1. Game studios and interactive media companies needing multi-agent content pipelines "
        "(addressable market: USD 4.2 B).",
        "  2. Financial services requiring provenance-tracked decisions with regulatory audit trails "
        "(addressable market: USD 6.8 B).",
        "  3. Research institutions adopting P2P AI collaboration for quantum computing simulation "
        "and chemistry modelling (addressable market: USD 2.1 B).",
    ]),
    ("Product Positioning", [
        "Positioning: 'The only AI orchestration platform where every agent decision is P2P-validated, "
        "graph-provenance-tracked, and quantum-information-ready  -  at 87% lower cost than closed-model stacks.'",
        "Against LangChain / AutoGen: VirtualPC is infrastructure-grade (Kafka, Neo4j, Docker), not "
        "a prototyping library. Graph persistence, quorum fact-validation, and Kafka-backed P2P sync "
        "are production features, not bolt-ons.",
        "Against proprietary platforms (Microsoft Copilot Studio, AWS Bedrock Agents): VirtualPC is "
        "open-extensible  -  bring your own models (Qwen, DeepSeek, local Ollama) with zero per-token "
        "lock-in.",
    ]),
    ("P2P Network Effect Strategy", [
        "The core moat is the P2P knowledge graph itself: every node that joins the cluster enriches "
        "the shared fact base, increasing validation quorum coverage and reducing hallucination rates "
        "for all participants. This creates a classic network effect.",
        "Growth flywheel:",
        "  Step 1  -  Seed: onboard 5 design-partner studios; each contributes domain-specific Decisions, "
        "Risks, and Precedents to the shared graph.",
        "  Step 2  -  Compound: new nodes bootstrap faster because confirmed facts reduce cold-start errors "
        "by an estimated 60%.",
        "  Step 3  -  Lock-in: the graph becomes the institutional memory; switching cost = re-validating "
        "all confirmed facts on a new platform.",
        "Incentive structure: nodes that contribute > 50 confirmed facts per month receive priority "
        "access to Tier-1 model capacity and reduced per-seat pricing.",
    ]),
    ("Quantum Information Readiness as Differentiator", [
        "The platform's quantum-schema extension (QuantumCircuit, Qubit, QuantumAlgorithm, EntanglementPair "
        "node types + THREATENS / ENTANGLED_WITH relationships) positions VirtualPC ahead of the post-quantum "
        "cryptography migration wave.",
        "Target segment: enterprises mandated by NIST PQC standards (FIPS 203/204/205) to audit and migrate "
        "classical cryptographic resources. VirtualPC's graph can track migration_status for every key, "
        "hash, and signature resource and auto-flag those threatened by Shor's algorithm.",
        "Marketing message: 'Know exactly which cryptographic assets Shor's algorithm can break  -  before "
        "a quantum adversary does. VirtualPC maps every dependency in your stack.'",
    ]),
    ("Go-To-Market Channels", [
        "1. Developer Community (Month 1-2):",
        "   Open-source the lightrag/ and p2p-sync/ modules on GitHub. Target Hacker News, r/MachineLearning, "
        "and the Neo4j community. Goal: 500 GitHub stars, 3 design-partner commitments.",
        "2. Conference & Demo Track (Month 2-3):",
        "   Submit talks to QIP 2027, NeurIPS Workshops, and GameDev Summit. Demo: live P2P fact-validation "
        "across 3 nodes with quorum consensus visible in the Neo4j browser.",
        "3. Enterprise Direct Sales (Month 3+):",
        "   Target: financial services (post-quantum audit use case), game studios (multi-agent content "
        "pipeline), and research labs (quantum chemistry simulation). ACV target: EUR 120k per enterprise seat.",
        "4. Partner Ecosystem:",
        "   Neo4j ISV partner programme, Anthropic startup credits, Kafka / Confluent marketplace listing.",
    ]),
    ("Pricing Model", [
        "Tier 0  -  Open Source: core graph + P2P sync modules, free. Community support.",
        "Tier 1  -  Studio (up to 10 agents, 1 Neo4j node): EUR 499/month. Includes fact-validation dashboard, "
        "Kafka integration, email support.",
        "Tier 2  -  Enterprise (unlimited agents, multi-node cluster): EUR 2 999/month. Includes quantum-schema "
        "module, SLA 99.9%, dedicated CS.",
        "Tier 3  -  Sovereign (on-prem, air-gapped): EUR 24 000/year. Full source license, quantum-readiness "
        "assessment, custom onboarding.",
        "Expected blended ARPU at 50 customers: EUR 1 800/month -> EUR 1.08 M ARR.",
    ]),
    ("90-Day Launch Roadmap", [
        "Month 1  -  Foundation:",
        "  - Open-source lightrag/, fact-validator/, p2p-sync/ (this PR)",
        "  - Launch landing page + waitlist",
        "  - Onboard 2 design partners (game studio + fintech)",
        "  - Publish technical blog: 'How we cut LLM costs 87% with a P2P knowledge graph'",
        "Month 2  -  Validation:",
        "  - First paying Studio customer",
        "  - Demo at 1 conference (Neo4j GraphConnect or similar)",
        "  - Publish quantum-readiness white paper",
        "  - Reach 500 GitHub stars",
        "Month 3  -  Scale:",
        "  - 5 paying customers (mix of tiers)",
        "  - Enterprise pilot with 1 financial services firm",
        "  - Kafka marketplace listing live",
        "  - MRR target: EUR 8 000",
    ]),
    ("Graph ML Layer - Semantic Intelligence", [
        "Beyond raw storage, VirtualPC now includes a pure-TypeScript ML layer running on the knowledge "
        "graph with zero external dependencies:",
        "  - TF-IDF cosine similarity: find semantically related nodes across the graph instantly.",
        "  - k-means clustering: automatically groups nodes by topic/domain for discovery and navigation.",
        "  - Near-duplicate detection: configurable threshold (default 80%) to prevent knowledge pollution.",
        "  - Edge suggestion heuristics: AFFECTS (decision-risk pairs), RELATED_TO (same-domain nodes).",
        "  - Agent reputation scoring: track each agent's fact-validation accuracy with tier labels "
        "(novice / contributor / trusted / expert). Accuracy is weighted by engagement volume.",
        "REST endpoints: /api/graph/ml/similar/:id, /api/graph/ml/clusters, /api/graph/ml/duplicates, "
        "/api/graph/ml/suggest-edges, /api/graph/ml/reputation",
        "All ML operations run in-process on the graph snapshot - no GPU, no external API, no cost.",
    ]),
    ("P2P Bootstrap - Snapshot and Restore", [
        "New nodes joining a P2P cluster can now bootstrap their local Neo4j from a peer snapshot "
        "rather than waiting for Kafka replay (which may be limited by retention policy):",
        "  - GET /api/graph/snapshot: paginated full-graph export as gzip-compressed JSON-LD.",
        "  - POST /api/graph/snapshot/restore: idempotent MERGE replay with SHA-256 integrity check.",
        "  - GET /api/graph/snapshot/status: metadata (nodeCount, edgeCount, takenAt, checksum).",
        "Snapshots are cryptographically signed. Tampered snapshots are rejected at restore time.",
        "Typical bootstrap time for a 10k-node graph: under 30 seconds on standard hardware.",
        "This feature eliminates the 'new node cold-start problem' that plagues naive P2P graphs.",
    ]),
    ("Unified P2P Health Monitor", [
        "Single endpoint GET /api/lightrag/monitor aggregates health from all components:",
        "  - Neo4j: connected/offline, node count, edge count.",
        "  - P2PSync (Kafka): processed/skipped/errors, last event type and timestamp.",
        "  - P2PGossip (HTTP): push/pull/merge counts, peers configured, last gossip time.",
        "  - FactValidator: pending/confirmed/contested/rejected fact counts.",
        "  - InferenceEngine: last rule-run timestamp.",
        "  - AgentBridge: tasks completed/failed, proposals, errors.",
        "Health tiers: 'healthy' (all green), 'degraded' (>10 component errors), 'offline' (no Neo4j).",
        "Can be polled by Prometheus, Grafana, or any HTTP monitoring stack for alerting.",
    ]),
    ("Key Risks & Mitigations", [
        "Risk: Neo4j licence cost at scale  -  Mitigation: evaluate Apache AGE (PostgreSQL extension) "
        "as a free alternative for Tier-0 deployments; keep Neo4j for Tier 2+.",
        "Risk: Kafka operational complexity scares SME buyers  -  Mitigation: ship a single-binary mode "
        "(in-process event bus) for Tier-0/1 that transparently upgrades to Kafka at scale.",
        "Risk: Quantum differentiation is premature for most buyers  -  Mitigation: position quantum "
        "readiness as 'insurance' not 'immediate need'; keep it as a Tier-2 feature.",
        "Risk: P2P network effect requires critical mass  -  Mitigation: federated graph mode "
        "allows nodes to share only explicit namespaces, reducing privacy concerns for early adopters.",
        "Risk: ML layer accuracy without deep learning  -  Mitigation: TF-IDF is intentionally "
        "lightweight and runs offline; add optional embedding models (OpenAI, local) as a Tier-2 upgrade.",
    ]),
    ("Success Metrics", [
        "Month 1: 2 design partners signed, 200 GitHub stars, landing page live.",
        "Month 3: 5 paying customers, EUR 8 000 MRR, 500 GitHub stars.",
        "Month 6: EUR 25 000 MRR, 1 enterprise pilot active, quantum white paper cited >= 10 times.",
        "Month 12: EUR 90 000 MRR (EUR 1.08 M ARR run-rate), 3 enterprise accounts.",
    ]),
]

# -- Raw PDF writer (no external dependencies) ---------------------------------

def safe(s):
    return s.replace('\\','\\\\').replace('(','\\(').replace(')','\\)')

def make_pdf(filename, title, subtitle, sections):
    objs = []
    xrefs = []

    def add(content):
        xrefs.append(len('\n'.join(objs) + ('\n' if objs else '')))
        n = len(objs) + 1
        objs.append(f'{n} 0 obj\n{content}\nendobj')
        return n

    # Fonts
    f_bold   = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
    f_normal = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    f_italic = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>')

    PAGE_W, PAGE_H = 595, 842
    MARGIN_X, MARGIN_TOP, MARGIN_BOT = 60, 60, 60
    COL_W = PAGE_W - 2 * MARGIN_X
    LINE_BODY = 13
    LINE_HEAD = 18

    # Build content stream across pages
    pages_content = []
    current_lines = []  # (font_obj, size, text_string)
    y = PAGE_H - MARGIN_TOP

    def new_page():
        nonlocal y, current_lines
        pages_content.append(current_lines)
        current_lines = []
        y = PAGE_H - MARGIN_TOP

    def emit(font_n, size, text, dy=None):
        nonlocal y
        if dy is None:
            dy = size + 3
        if y - dy < MARGIN_BOT:
            new_page()
        current_lines.append((font_n, size, y, text))
        y -= dy

    def wrap_and_emit(font_n, size, text, dy=None, indent=0):
        chars_per_line = int((COL_W - indent) / (size * 0.52))
        words = text.split()
        line = ''
        for w in words:
            if len(line) + len(w) + 1 > chars_per_line:
                emit(font_n, size, (' ' * indent) + line.strip(), dy)
                line = w
            else:
                line = (line + ' ' + w).strip()
        if line:
            emit(font_n, size, (' ' * indent) + line.strip(), dy)

    # Title page
    emit(f_bold, 22, title, dy=30)
    emit(f_italic, 12, subtitle, dy=20)
    emit(f_normal, 10, f'Generated: {time.strftime("%Y-%m-%d")}', dy=30)

    # Table of contents hint
    emit(f_bold, 13, 'Table of Contents', dy=20)
    for i, (sec_title, _) in enumerate(sections, 1):
        emit(f_normal, 10, f'  {i}. {sec_title}', dy=14)
    y -= 10

    # Sections
    for sec_title, paras in sections:
        y -= 8
        if y - LINE_HEAD < MARGIN_BOT:
            new_page()
        emit(f_bold, 13, sec_title, dy=LINE_HEAD + 4)
        for para in paras:
            indent = 16 if para.startswith('  ') else 0
            wrap_and_emit(f_normal, 10, para.strip(), dy=LINE_BODY, indent=indent)
        y -= 4

    pages_content.append(current_lines)

    # Render each page's content stream
    page_obj_ids = []
    for page_lines in pages_content:
        parts = ['BT']
        for font_n, size, py, text in page_lines:
            parts.append(f'/F{font_n} {size} Tf')
            parts.append(f'{MARGIN_X} {py} Td')
            parts.append(f'({safe(text)}) Tj')
        parts.append('ET')
        stream = '\n'.join(parts)
        stream_id = add(f'<< /Length {len(stream)} >>\nstream\n{stream}\nendstream')
        page_obj_ids.append(stream_id)

    # Page objects
    page_node_ids = []
    for stream_id in page_obj_ids:
        pid = add(
            f'<< /Type /Page /Parent 0 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] '
            f'/Contents {stream_id} 0 R '
            f'/Resources << /Font << /F{f_bold} {f_bold} 0 R /F{f_normal} {f_normal} 0 R /F{f_italic} {f_italic} 0 R >> >> >>'
        )
        page_node_ids.append(pid)

    kids = ' '.join(f'{p} 0 R' for p in page_node_ids)
    pages_id = add(f'<< /Type /Pages /Kids [{kids}] /Count {len(page_node_ids)} >>')

    # Fix parent refs
    for pid in page_node_ids:
        idx = pid - 1
        objs[idx] = objs[idx].replace('/Parent 0 0 R', f'/Parent {pages_id} 0 R')

    catalog_id = add(f'<< /Type /Catalog /Pages {pages_id} 0 R /Info << /Title ({safe(title)}) /Author (VirtualPC) >> >>')

    # Build xref table
    body = '\n'.join(objs)
    # Recalculate offsets from scratch
    lines_out = ['%PDF-1.4', '%\xe2\xe3\xcf\xd3', '']
    offsets = {}
    for i, obj_str in enumerate(objs, 1):
        offsets[i] = sum(len(l)+1 for l in lines_out)
        lines_out.append(obj_str)
        lines_out.append('')

    xref_pos = sum(len(l)+1 for l in lines_out)
    n_objs = len(objs) + 1
    lines_out.append('xref')
    lines_out.append(f'0 {n_objs}')
    lines_out.append('0000000000 65535 f ')
    for i in range(1, n_objs):
        lines_out.append(f'{offsets[i]:010d} 00000 n ')
    lines_out.append('trailer')
    lines_out.append(f'<< /Size {n_objs} /Root {catalog_id} 0 R >>')
    lines_out.append('startxref')
    lines_out.append(str(xref_pos))
    lines_out.append('%%EOF')

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'w', encoding='latin-1') as f:
        f.write('\n'.join(lines_out))
    print(f' PDF written: {filename}  ({len(pages_content)} pages)')

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'docs', 'p2p-marketing-strategy.pdf')
    make_pdf(os.path.normpath(out), TITLE, SUBTITLE, SECTIONS)
