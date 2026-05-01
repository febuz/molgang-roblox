# VirtualPC Documentation

Reference docs for the VirtualPC multi-agent platform. Run-time docs are
served by the live dashboard at `http://localhost:3100/`.

## Contents

| File                             | Topic                                            |
|----------------------------------|--------------------------------------------------|
| [VIRTUALPC-ARCHITECTURE.md](VIRTUALPC-ARCHITECTURE.md) | Process layout, agent registry, task engine, LLM routing |
| [API-ENDPOINTS.md](API-ENDPOINTS.md)                    | HTTP route reference                              |
| [API-DOCUMENTATION.md](API-DOCUMENTATION.md)            | Detailed API examples                             |
| [DEPLOYMENT.md](DEPLOYMENT.md)                          | Production deployment notes                       |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md)                      | Branch / commit / review conventions              |
| [CLEOPATRA-AUTHORITY.md](CLEOPATRA-AUTHORITY.md)        | Cleopatra agent — authority charter               |
| [ALEXANDER-PRINCIPLES.md](ALEXANDER-PRINCIPLES.md)      | Alexander agent — operating principles            |
| [MIRA-CREATIVE-AUTHORITY.md](MIRA-CREATIVE-AUTHORITY.md) | Mira agent — creative authority charter          |
| [MONEYGOD-AUTHORITY.md](MONEYGOD-AUTHORITY.md)          | MoneyGod agent — economy authority                |

The repository's top-level `README.md` covers install, smoke-tests, and
quick-start. Read that first if you're new.

The canonical agent authority docs live in the private `febuz/virtualpc`
repo under `.governance/`, `.creative/`, and `.operations/`. The dashboard
loads them live via `/api/github/virtualpc/file` — open the All-Agents page
and click any agent card to see them inline.
