#!/bin/bash

################################################################################
# 🎨 Prepare MOLGANG Model for Roblox
# Optimizes downloaded 3D model in Blender and exports as FBX
################################################################################

BLENDER_PROJECT="/media/knight2/EDS2/projects/molgang-3d"
MODELS_DIR="$BLENDER_PROJECT/resources/sketchfab"
EXPORT_DIR="$BLENDER_PROJECT/export"
SCRIPTS_DIR="$BLENDER_PROJECT/scripts"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Usage
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <model.fbx>${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 mine-building.fbx"
    echo "  $0 factory-lowpoly.fbx"
    echo ""
    echo "Available models in: $MODELS_DIR"
    echo ""
    ls -lh "$MODELS_DIR"/*.fbx 2>/dev/null || echo "(no FBX files found)"
    exit 1
fi

MODEL_FILE="$1"
MODEL_PATH="$MODELS_DIR/$MODEL_FILE"

if [ ! -f "$MODEL_PATH" ]; then
    echo -e "${RED}❌ Model not found: $MODEL_PATH${NC}"
    exit 1
fi

# Extract filename without extension
MODEL_NAME="${MODEL_FILE%.*}"
EXPORT_FILE="$EXPORT_DIR/${MODEL_NAME}_optimized.fbx"

clear
cat << EOF
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║           🎨 MOLGANG Model Preparation & Optimization                      ║
║                                                                            ║
║  Converts downloaded FBX → Optimized FBX for Roblox Studio import        ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
EOF

echo -e "${BLUE}📋 Model Information:${NC}"
echo "  Input:  $MODEL_PATH"
echo "  Output: $EXPORT_FILE"
echo "  Size:   $(ls -lh "$MODEL_PATH" | awk '{print $5}')"
echo ""

# Create optimization script
OPTIMIZE_SCRIPT=$(mktemp)
cat > "$OPTIMIZE_SCRIPT" << 'BLENDER_SCRIPT'
import bpy
import os

# Get model path from environment
input_file = os.environ.get('MODEL_INPUT')
output_file = os.environ.get('MODEL_OUTPUT')

print(f"\n=== MOLGANG Model Optimization ===")
print(f"Input:  {input_file}")
print(f"Output: {output_file}")

# Open the model
bpy.ops.import_scene.fbx(filepath=input_file)
print("✓ Model imported")

# Select all objects
bpy.ops.object.select_all(action='SELECT')

# Join all meshes
if len(bpy.context.selected_objects) > 1:
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
    bpy.ops.object.join()
    print("✓ Meshes joined")

# Apply transforms
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
print("✓ Transforms applied")

# Clean up geometry
for obj in bpy.context.selected_objects:
    if obj.type == 'MESH':
        # Merge by distance
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles()
        bpy.ops.object.mode_set(mode='OBJECT')
        print("✓ Geometry cleaned (doubles removed)")

# Apply Decimate modifier for optimization
for obj in bpy.context.selected_objects:
    if obj.type == 'MESH':
        # Only decimate if very high poly (>100K vertices)
        vertex_count = len(obj.data.vertices)
        if vertex_count > 100000:
            bpy.context.view_layer.objects.active = obj
            mod = obj.modifiers.new(name="Decimate", type='DECIMATE')
            mod.ratio = 0.7  # Keep 70% of vertices
            bpy.ops.object.modifier_apply(modifier=mod.name)
            print(f"✓ Decimated from {vertex_count} to ~{int(vertex_count*0.7)} vertices")

# Calculate normals
bpy.ops.object.shade_smooth()
print("✓ Normals calculated")

# Export as FBX
bpy.ops.export_scene.fbx(
    filepath=output_file,
    use_selection=True,
    scale=1.0,
    forward_axis='-Y',
    up_axis='Z',
    apply_scalings='FBX_ALL'
)
print(f"✓ Exported to: {output_file}")
print("\n=== Optimization Complete ===\n")
BLENDER_SCRIPT

echo -e "${BLUE}🔧 Running Blender optimization...${NC}"
echo ""

# Run Blender with the optimization script
export MODEL_INPUT="$MODEL_PATH"
export MODEL_OUTPUT="$EXPORT_FILE"

flatpak run org.blender.Blender --background --python "$OPTIMIZE_SCRIPT" 2>&1 | grep -E "✓|===|Input:|Output:|Optimization"

if [ -f "$EXPORT_FILE" ]; then
    EXPORT_SIZE=$(ls -lh "$EXPORT_FILE" | awk '{print $5}')
    echo -e "${GREEN}✅ Model optimized successfully!${NC}"
    echo "  Output file: $EXPORT_FILE"
    echo "  Size: $EXPORT_SIZE"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "  1. In Roblox Studio: File → Insert Asset"
    echo "  2. Select: $EXPORT_FILE"
    echo "  3. Click 'Import'"
    echo "  4. Scale & position model in world"
    echo ""
else
    echo -e "${RED}❌ Optimization failed${NC}"
    echo "Check Blender output above for errors"
    exit 1
fi

# Cleanup
rm -f "$OPTIMIZE_SCRIPT"
