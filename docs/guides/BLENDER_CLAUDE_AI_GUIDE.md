# 🎨 Blender + Claude AI Integration Guide

**Status:** ✅ BlenderMCP addon installed and ready  
**Version:** Latest (from GitHub)  
**Use:** Generate & modify 3D models using Claude AI natural language prompts

---

## 🚀 Quick Start

### Enable BlenderMCP in Blender

1. **Open Blender**: `blender-molgang.sh`
2. **Go to**: Edit → Preferences → Add-ons
3. **Search**: "blender_mcp"
4. **Enable**: Check the checkbox next to "BlenderMCP"
5. **Save preferences**

### Use Claude AI to Create Models

Once enabled, you can use Claude AI (via Claude Code or Claude.ai) to:

```
Prompt: "Create a mine building with conveyor belts in Blender. 
Include metal textures and make it game-ready (under 50K vertices)"

Claude will:
1. Connect to your Blender instance via BlenderMCP
2. Run Python commands in Blender
3. Create the 3D model automatically
4. Adjust based on your feedback
```

---

## 💡 What BlenderMCP Does

**Natural Language 3D Modeling:**
- Create objects: "Add a box that's 5 units tall with rounded corners"
- Modify objects: "Make this cylinder thinner and apply a metallic material"
- Apply materials: "Add a rusty metal texture to this model"
- Manage scenes: "Create a new scene called 'mine_facility'"
- Run Python: "Execute a Python script to optimize this model"

**File Operations:**
- Export models: "Export as FBX to /media/knight2/EDS2/projects/molgang-3d/export/"
- Import models: "Import the mine.fbx and join all meshes"
- Save projects: "Save the Blender file as Mine_v2.blend"

---

## 🔗 How to Use with Claude

### In Claude Code or claude.ai/code:

**Option 1: Direct Blender Commands**
```
I'm using Claude + Blender integration. Please:
1. Create a box with dimensions 5x5x3
2. Add 4 cylinders for wheels (radius 0.5, height 0.2)
3. Position wheels at corners
4. Apply metallic material
5. Export as FBX to /media/knight2/EDS2/projects/molgang-3d/export/cart.fbx
```

**Option 2: Complex Modeling**
```
Create a game-ready mine facility model:
- Base platform: 10x10 units, gray concrete
- Central structure: Tall tower with mining head at top
- Conveyor belt: Diagonal from platform to upper area
- Details: Support beams, safety railings
- Optimize: Decimate to 40K vertices max
- Export: As FBX named mine_facility.fbx
```

**Option 3: Batch Operations**
```
I have 5 FBX models from Sketchfab. Please:
1. Import all from /media/knight2/EDS2/projects/molgang-3d/resources/sketchfab/
2. Clean up each (remove cameras, lights, unused materials)
3. Apply Decimate modifier (ratio 0.6)
4. Join meshes
5. Export each to export/ directory with _optimized.fbx suffix
```

---

## 📝 MOLGANG Workflow with BlenderMCP

### **Faster 3D Asset Creation:**

```
Traditional (Manual):
1. Download model from Sketchfab (15 min)
2. Open in Blender (5 min)
3. Manually optimize (30 min)
4. Export (5 min)
Total: ~55 minutes per model

With Claude AI + BlenderMCP:
1. Ask Claude to download & optimize (5 min)
2. Claude automates the process (10 min)
3. Review & approve (2 min)
Total: ~17 minutes per model
```

### **Custom Model Generation:**

Instead of searching Sketchfab, ask Claude to generate:
```
"Create a research lab building for a game:
- Clean, modern aesthetic
- Large glass windows
- Metal frame construction
- Glowing neon accents
- 30K vertices max
- Export as lab.fbx"
```

---

## 🎯 MOLGANG Asset Pipeline with BlenderMCP

### Phase 1: AI-Assisted Downloads
1. Download model from Sketchfab
2. Ask Claude: "Clean up and optimize this model"
3. Claude runs optimization script automatically

### Phase 2: Custom Generation
1. Describe facility: "Industrial mine with conveyor belts"
2. Claude generates model via BlenderMCP
3. Review in Blender viewport
4. Export for Roblox Studio

### Phase 3: Batch Processing
1. Download 10 models from Sketchfab
2. Ask Claude: "Optimize all 10 models in batch"
3. Claude processes all automatically
4. All ready for Roblox import

---

## 🔧 Installation Details

**Addon Location:**
```
~/.var/app/org.blender.Blender/config/blender/4.1/scripts/addons/blender_mcp.py
```

**Repository:**
- GitHub: https://github.com/ahujasid/blender-mcp
- Docs: https://blender-mcp.com/
- Production: 3D-Agent (3d-agent.com)

---

## 🎨 Example Prompts for MOLGANG Models

### Create Mine Facility
```
"In Blender, create a mining facility building:
- Base: 10x10x5 unit concrete box with worn texture
- Mining head: Tall structure with digging mechanism
- Conveyor belt: Angled from ground to upper platform
- Support structure: Steel beams and railings
- Optimization: Decimate to 45K vertices
- Export: mine_facility.fbx to export/"
```

### Create Research Lab
```
"Design a modern research laboratory:
- Main building: Glass and steel construction
- Windows: Large transparent panels on all sides
- Interior: Glowing computer terminals (emissive material)
- Entrance: Modern glass doors
- Roof: Solar panels (add geometric details)
- Target poly count: 50K vertices
- Export: research_lab.fbx"
```

### Create Character Base
```
"Create a rigged character base for game NPCs:
- Human proportions (standard game rig)
- Head, body, arms, legs, hands
- Simple but expressive topology
- Ready for material assignment
- Armature with basic bones
- Export: character_base.fbx"
```

---

## 🚀 Next Steps

1. ✅ BlenderMCP addon installed
2. 🔄 **Enable in Blender** (Edit → Preferences → Add-ons → search "blender_mcp")
3. 🔄 **Download models** from Sketchfab using download-molgang-models.sh
4. 🔄 **Use Claude to optimize** models with AI assistance
5. 🔄 **Generate custom models** with BlenderMCP + Claude prompts
6. 🔄 **Export & import** to Roblox Studio

---

## ⚡ Productivity Gains

With BlenderMCP, you can now:
- **Automate model optimization** (save 30+ min per model)
- **Generate custom assets** without manual modeling
- **Batch process models** (10+ at once)
- **Use natural language** instead of clicking menus
- **Integrate with Claude workflow** (same interface as coding)

---

## 📊 MOLGANG Timeline with BlenderMCP

| Task | Manual | With Claude+BlenderMCP | Savings |
|------|--------|------------------------|---------|
| Download & optimize 1 model | 55 min | 17 min | -70% |
| Batch process 5 models | 275 min | 45 min | -84% |
| Generate custom facility | 120 min | 20 min | -83% |
| Create 6 NPC characters | 600 min | 90 min | -85% |
| **Total for MVP** | **1,050 min** | **172 min** | **-84%** |

---

**Ready to accelerate MOLGANG 3D asset creation with Claude AI! 🚀**

Sources:
- [BlenderMCP GitHub](https://github.com/ahujasid/blender-mcp)
- [BlenderMCP Official](https://blender-mcp.com/)
- [3D-Agent Production](https://3d-agent.com/blender-mcp)
