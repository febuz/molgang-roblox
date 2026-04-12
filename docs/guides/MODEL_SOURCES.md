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

