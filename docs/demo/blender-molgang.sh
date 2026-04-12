#!/bin/bash

################################################################################
# 🎨 MOLGANG Blender Project Launcher
# Opens Blender with MOLGANG 3D modeling project
################################################################################

PROJECT_DIR="/media/knight2/EDS2/projects/molgang-3d"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ensure project structure exists
mkdir -p "$PROJECT_DIR"/{src,export,resources/sketchfab,textures,materials,scripts}

echo -e "${BLUE}🎨 Opening MOLGANG Blender Project...${NC}"
echo "Project: $PROJECT_DIR"
echo ""

# Launch Blender
cd "$PROJECT_DIR"
echo -e "${GREEN}Starting Blender 5.1.0 (via Flatpak)...${NC}"
flatpak run org.blender.Blender &

echo ""
echo -e "${BLUE}📋 Tips:${NC}"
echo "  • Create new .blend files in: src/"
echo "  • Import models from: resources/sketchfab/"
echo "  • Export finished models to: export/ (as FBX)"
echo "  • Store textures in: textures/"
echo ""
echo "  F1 = Help"
echo "  Tab = Edit/Object mode"
echo "  G = Move, R = Rotate, S = Scale"
echo "  A = Select All"
echo ""
