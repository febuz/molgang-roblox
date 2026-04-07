# Contributing to MOLGANG

## We're Hiring

VirtualV Holding B.V. is looking for developers to join the MOLGANG project.
This is a non-profit educational game with real-world chemistry and blockchain education.

### Open Roles

**Roblox / Luau Developer**
- Extend game mechanics (NPC system, mini-games, tournament brackets)
- Optimize for 100+ concurrent players
- Build new zones and interactive content
- Rate: EUR 55-75/hr | Remote | Part-time OK

**Three.js / WebGPU Developer**
- Build the web companion game (HD renderer, QR bridge from Roblox)
- WebGPU shaders, PBR materials, post-processing
- Rate: EUR 65-85/hr | Remote

**Blockchain Developer (XRPL/Hedera)**
- Integrate real XRPL for MolChain (currently simulated in DataStore)
- NFT minting for molecule registrations
- Hedera HTS token integration
- Rate: EUR 75-95/hr | Remote

**3D Artist**
- Create assets for 6 game zones in Roblox style
- Blender → Roblox pipeline (PBR materials)
- Element-themed visual effects
- Rate: EUR 50-65/hr | Remote

### How to Apply

1. Fork this repo
2. Pick an issue from the backlog or fix a bug
3. Submit a PR with clean code and English comments
4. Include a brief note about your experience

Or reach out directly via GitHub issues.

## Development Workflow

### Trunk-Based Development
- `main` — stable, reviewed code only
- `dev` — active development branch
- Feature branches: `feature/npc-system`, `fix/mobile-ui`, etc.

### Build
```bash
cd game
rojo build -o MOLGANG.rbxl
```

### Code Standards
- All comments in English (international audience)
- Server-side validation for all economy actions
- Never trust client data — use `PlayerDataBridge` for inter-script communication
- Mobile-friendly: TextScaled=true, minimum 50px touch targets
- DataStore: always use pcall, respect rate limits (60 writes/min)

### Review Process
1. Create PR from feature branch → dev
2. Auto-review agent provides feedback
3. Address critical issues
4. Merge to dev, then PR dev → main
5. Main is always buildable with Rojo
