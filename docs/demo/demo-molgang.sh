#!/bin/bash

################################################################################
# 🎮 MOLGANG Demo Launcher with 3D Model Integration
# Showcases: Roblox game + downloaded Sketchfab models + Blender integration
################################################################################

set -e

GAME_FILE="/home/knight2/MOLGANG.rbxl"
BLENDER_PROJECT="/media/knight2/EDS2/projects/molgang-3d"
MODELS_DIR="$BLENDER_PROJECT/resources/sketchfab"
EXPORT_DIR="$BLENDER_PROJECT/export"
LOG_FILE="/tmp/molgang-demo-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Banner
clear
cat << "EOF"
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                    🧬 MOLGANG Roblox Game Demo 🧬                         ║
║                                                                            ║
║            Production-Ready Game + Downloaded 3D Models + Blender         ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
EOF

echo -e "${BLUE}Initializing demo environment...${NC}"
echo "Game File: $GAME_FILE"
echo "Blender Project: $BLENDER_PROJECT"
echo "Models Directory: $MODELS_DIR"
echo "Log: $LOG_FILE"
echo ""

# Step 1: Verify game file
echo -e "${YELLOW}[Step 1/5] Verifying game file...${NC}"
if [ ! -f "$GAME_FILE" ]; then
    echo -e "${RED}❌ Game file not found: $GAME_FILE${NC}"
    exit 1
fi
FILE_SIZE=$(ls -lh "$GAME_FILE" | awk '{print $5}')
echo -e "${GREEN}✅ Game file ready (${FILE_SIZE})${NC}"
echo ""

# Step 2: Verify Blender installation
echo -e "${YELLOW}[Step 2/5] Checking Blender installation...${NC}"
if flatpak list --app 2>/dev/null | grep -q "Blender"; then
    echo -e "${GREEN}✅ Blender 5.1.0 installed via Flatpak${NC}"
else
    echo -e "${RED}⚠️  Blender not detected. Install with: flatpak install flathub org.blender.Blender${NC}"
fi
echo ""

# Step 3: Show downloaded models status
echo -e "${YELLOW}[Step 3/5] Checking downloaded models...${NC}"
if [ -d "$MODELS_DIR" ]; then
    MODEL_COUNT=$(find "$MODELS_DIR" -type f \( -name "*.fbx" -o -name "*.blend" \) 2>/dev/null | wc -l)
    if [ "$MODEL_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Found $MODEL_COUNT models in $MODELS_DIR${NC}"
        find "$MODELS_DIR" -type f \( -name "*.fbx" -o -name "*.blend" \) -exec ls -lh {} \;
    else
        echo -e "${YELLOW}ℹ️  No models downloaded yet. Run: download-molgang-models${NC}"
    fi
else
    mkdir -p "$MODELS_DIR"
    echo -e "${YELLOW}ℹ️  Models directory created. Ready for downloads.${NC}"
fi
echo ""

# Step 4: Show exported models status
echo -e "${YELLOW}[Step 4/5] Checking Blender exports...${NC}"
if [ -d "$EXPORT_DIR" ]; then
    EXPORT_COUNT=$(find "$EXPORT_DIR" -type f -name "*.fbx" 2>/dev/null | wc -l)
    if [ "$EXPORT_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Found $EXPORT_COUNT exported models${NC}"
        find "$EXPORT_DIR" -type f -name "*.fbx" -exec ls -lh {} \;
    else
        echo -e "${YELLOW}ℹ️  No exports yet. Create models in Blender and export as FBX.${NC}"
    fi
else
    mkdir -p "$EXPORT_DIR"
    echo -e "${YELLOW}ℹ️  Export directory created.${NC}"
fi
echo ""

# Step 5: Launch Roblox Studio
echo -e "${YELLOW}[Step 5/5] Launching Roblox Studio...${NC}"
echo ""
echo -e "${BLUE}📊 DEMO FEATURES:${NC}"
echo "  ✓ Full MOLGANG game environment (6 zones)"
echo "  ✓ 6 NPCs with dialogue systems"
echo "  ✓ Real-time economy & production cycles"
echo "  ✓ 16 UI screens (Dashboard, Leaderboards, etc)"
echo "  ✓ Particle effects & animations"
echo "  ✓ Ready for imported 3D models"
echo ""
echo -e "${BLUE}🎮 DEMO CONTROLS:${NC}"
echo "  F5 = Play game"
echo "  D = Dashboard (main UI)"
echo "  L = Leaderboards"
echo "  P = Periodic Table"
echo "  R = Recipe Book"
echo "  ESC = Close UI"
echo ""
echo -e "${BLUE}📁 3D MODEL WORKFLOW:${NC}"
echo "  1. Download models: download-molgang-models"
echo "  2. Open Blender: blender-eds2"
echo "  3. Import FBX models into Blender"
echo "  4. Optimize & export as FBX"
echo "  5. Import to Studio: File → Insert Asset"
echo ""
echo -e "${GREEN}Starting Studio...${NC}"
echo ""

# Kill any existing Studio processes
pkill -f "RobloxStudio" 2>/dev/null || true
sleep 1

# Launch Studio with game file
{
    flatpak run org.vinegarhq.Vinegar "$GAME_FILE" 2>&1 | tee -a "$LOG_FILE"
} &

STUDIO_PID=$!
sleep 10

# Check if Studio started successfully
if ps -p $STUDIO_PID > /dev/null 2>&1 || pgrep -f "RobloxStudio" > /dev/null; then
    echo -e "${GREEN}✅ Studio launched successfully!${NC}"
    echo -e "${GREEN}PID: $STUDIO_PID${NC}"
else
    echo -e "${RED}❌ Studio may have failed to start${NC}"
    echo "Check log: $LOG_FILE"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo "  1. Wait for Studio to fully load (30-60 seconds)"
echo "  2. Press F5 to play the game"
echo "  3. Explore all 6 zones and test systems"
echo "  4. Download more 3D models (run: download-molgang-models)"
echo "  5. Import models into Blender for customization"
echo ""
echo "Press Ctrl+C to close this demo launcher when done."
echo ""

# Keep launcher running while Studio is active
wait $STUDIO_PID 2>/dev/null || true

echo -e "${BLUE}Demo session complete. Log saved to: $LOG_FILE${NC}"
