# MOLGANG — FBX Model Upload Guide (#96)

## Overview

40 FBX models exist in `assets/models/` ready for Roblox import.
This guide covers three methods to get them into Roblox Studio.

---

## Method 1: Manual Import (Recommended for Teaser)

1. Open Roblox Studio → File → Import 3D
2. Select FBX file from `assets/models/`
3. Set import scale: 1 unit = 1 stud
4. Check "Import as MeshPart"
5. Place in appropriate zone folder

### Batch Import Script (Studio Command Bar)
```lua
-- Paste in Studio Command Bar to import all models from a folder
local AssetService = game:GetService("AssetService")
local meshFolder = Instance.new("Folder", workspace)
meshFolder.Name = "ImportedMeshes"

-- After importing each FBX, they appear as MeshPart in workspace
-- Organize by moving to Zones folder
```

## Method 2: Roblox Cloud API (rbxcloud CLI)

```bash
# Install rbxcloud CLI
cargo install rbxcloud

# Upload a single model
rbxcloud asset create \
  --filepath assets/models/jaw_crusher.fbx \
  --type Model \
  --name "MOLGANG - Jaw Crusher" \
  --description "Industrial jaw crusher for slag processing" \
  --api-key $ROBLOX_API_KEY

# Batch upload all models
for fbx in assets/models/*.fbx; do
  name=$(basename "$fbx" .fbx | tr '_' ' ')
  rbxcloud asset create \
    --filepath "$fbx" \
    --type Model \
    --name "MOLGANG - $name" \
    --api-key $ROBLOX_API_KEY
  sleep 2  # Rate limit
done
```

### API Key Setup
1. Go to https://create.roblox.com/credentials
2. Create API Key with `Asset:Create` scope
3. Set `ROBLOX_API_KEY` environment variable

## Method 3: Rojo + InsertService (Runtime)

For dynamic loading from asset IDs:
```lua
local InsertService = game:GetService("InsertService")
local assetId = 123456789  -- From upload

local model = InsertService:LoadAsset(assetId)
local mesh = model:GetChildren()[1]
mesh.Parent = workspace.Zones
mesh:PivotTo(CFrame.new(targetPosition))
```

---

## Model Inventory (40 FBX files)

| # | Model | Triangles (est.) | Size | Category |
|---|-------|-----------------|------|----------|
| 1-14 | Slag processing equipment | 1K-4.5K | 27-77KB | Industrial |
| 15-20 | Advanced equipment | 2K-4K | 40-65KB | Chemical Engineering |
| 21-24 | Mining equipment | 2K-3K | 35-50KB | Mining |
| 25-32 | Lab & process equipment | 1K-4K | 30-65KB | Laboratory |
| 33-40 | New models (teleport, ladle, etc.) | 0.6K-2.8K | 12-40KB | Misc/Gameplay |

**Total: ~100K triangles across 40 models — well within Roblox limits**

## Quality Standards
- Max 5,000 triangles per model (Roblox mobile compatibility)
- 1 Blender unit = 1 Roblox stud
- PBR materials with Metallic/Roughness workflow
- All models generated procedurally (reproducible from Python scripts)
