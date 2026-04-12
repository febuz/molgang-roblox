#!/bin/bash

################################################################################
# 📥 MOLGANG Model Downloader
# Downloads free 3D models from Sketchfab for MOLGANG
################################################################################

set -e

MODELS_DIR="/media/knight2/EDS2/projects/molgang-3d/resources/sketchfab"
REFERENCE_FILE="$MODELS_DIR/MODEL_SOURCES.md"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
cat << "EOF"
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║              📥 MOLGANG 3D Model Downloader from Sketchfab                 ║
║                                                                            ║
║         Download free, game-ready models for Roblox Studio import         ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
EOF

mkdir -p "$MODELS_DIR"
cd "$MODELS_DIR"

echo -e "${BLUE}Models will be saved to:${NC}"
echo "$MODELS_DIR"
echo ""

# Create reference guide
cat > "$REFERENCE_FILE" << 'GUIDE'
# MOLGANG Model Sources & Guide

## 📥 How to Download Models from Sketchfab

### Best Free Sources for MOLGANG:

#### 1. **Mine Building** (Priority 1)
- Search: "mine building industrial"
- Site: sketchfab.com
- Filter: Downloadable, Royalty-free, FBX/GLB format
- Target: Low-poly, game-ready model
- Use for: Mining facility in game

#### 2. **Factory/Industrial** (Priority 1)
- Search: "industrial building conveyor"
- Site: sketchfab.com
- Filter: Downloadable, under 50MB
- Target: Production facility aesthetic
- Use for: Slakkenspoor factory zone

#### 3. **Character Base** (Priority 2)
- Search: "rigged character human"
- Site: sketchfab.com
- Filter: Rigged, animation-ready, under 100K vertices
- Target: Human character for NPC base
- Use for: Femke, Vanadis, and other NPCs

#### 4. **Laboratory/Research** (Priority 2)
- Search: "laboratory building tech"
- Site: sketchfab.com
- Filter: Modern, glass elements
- Target: Clean tech aesthetic
- Use for: Research lab zone

#### 5. **Office/Corporate** (Priority 3)
- Search: "office building modern"
- Site: sketchfab.com
- Filter: Contemporary design
- Target: Business building
- Use for: ANK Cooperative office

### Download Instructions:

1. **Go to sketchfab.com**
2. **Search** for model name (e.g., "mine building")
3. **Click** result that matches criteria
4. **Click "Download"** button (may need account)
5. **Choose FBX format** (best for Roblox)
6. **Save** to: `/media/knight2/EDS2/projects/molgang-3d/resources/sketchfab/`
7. **Run**: `prepare-molgang-model <filename.fbx>`

### Alternative Free Sources:

- **Quaternius** (quaternius.com) - Low-poly, perfect for Roblox
- **Poly Haven** (polyhaven.com) - High quality, public domain
- **Free3D** (free3d.com) - Mix of free/paid models
- **OpenGameArt** (opengameart.org) - Game-focused, all free

### Important Notes:

✅ **Must have**:
- Commercial/game use license
- FBX or GLB format
- Under 100K vertices (for performance)
- Downloadable (not preview-only)

❌ **Avoid**:
- Rigged characters (we'll rig them ourselves)
- Very high poly count (>200K vertices)
- Locked/restricted licenses
- Textures embedded (PNG maps preferred)

## 🎨 After Downloading

1. **Import into Blender**: File → Import → FBX
2. **Clean up**: Delete unused objects (cameras, lights, etc)
3. **Optimize**: Apply Decimate modifier (ratio 0.5)
4. **Export**: File → Export As → FBX 7.4.0
5. **Import to Studio**: File → Insert Asset → Select FBX

## 📊 Model Priority Checklist

- [ ] Mine Building (FBX, <50MB)
- [ ] Factory Building (FBX, <50MB)
- [ ] Character Base (Rigged, <20MB)
- [ ] Laboratory (FBX, <50MB)
- [ ] Office Building (FBX, <50MB)
- [ ] Conveyor Belt (FBX, <10MB)
- [ ] Character Variants (3-4 rigged models)

## 🔗 Quick Links

- Sketchfab: https://sketchfab.com
- Quaternius: https://quaternius.com
- Poly Haven: https://polyhaven.com
- Blender Docs: https://docs.blender.org

GUIDE

echo -e "${GREEN}✅ Created model reference guide${NC}"
echo "   📄 $REFERENCE_FILE"
echo ""

# List current downloads
echo -e "${BLUE}Current downloads in: $MODELS_DIR${NC}"
if find . -type f \( -name "*.fbx" -o -name "*.blend" -o -name "*.glb" \) 2>/dev/null | grep -q .; then
    find . -type f \( -name "*.fbx" -o -name "*.blend" -o -name "*.glb" \) -exec ls -lh {} \;
else
    echo "  (no models downloaded yet)"
fi
echo ""

echo -e "${YELLOW}📋 DOWNLOAD INSTRUCTIONS:${NC}"
echo ""
echo "1. Open your web browser"
echo "2. Go to: https://sketchfab.com"
echo "3. Search for: 'mine building' or 'industrial building'"
echo "4. Find a model with:"
echo "   - Download icon (Downloadable)"
echo "   - Royalty-free license"
echo "   - Good reviews"
echo "5. Download as FBX format"
echo "6. Save to: $MODELS_DIR"
echo ""
echo "7. After downloading, run:"
echo "   prepare-molgang-model <filename.fbx>"
echo ""

echo -e "${BLUE}📊 RECOMMENDED MODELS TO START:${NC}"
echo ""
echo "  1️⃣  'Mine Industrial Building' - Mining facility (Priority 1)"
echo "  2️⃣  'Factory Building Lowpoly' - Production facility (Priority 1)"
echo "  3️⃣  'Rigged Human Character' - NPC base (Priority 2)"
echo "  4️⃣  'Laboratory Modern' - Research lab (Priority 2)"
echo "  5️⃣  'Office Building' - Corporate office (Priority 3)"
echo ""

echo -e "${GREEN}Ready to download! Open Sketchfab and start saving models.${NC}"
echo ""
echo "Resources:"
echo "  📄 Reference: $REFERENCE_FILE"
echo "  📁 Save to: $MODELS_DIR"
echo "  🎨 Open in Blender: blender-eds2"
