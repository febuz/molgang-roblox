"""
MOLGANG — Blender GPU Rendering Setup for Dual RTX 3090
Configures Blender to use both GPUs for CYCLES rendering.

Run: flatpak run --filesystem=/home/knight2 org.blender.Blender --background --python setup_gpu_rendering.py

Also generates preview renders of all equipment models.
"""

import bpy
import os
import sys
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models"
RENDERS_DIR = Path(__file__).parent.parent / "renders"
RENDERS_DIR.mkdir(exist_ok=True)

# ═══════════════════════════════════════════════
# CONFIGURE GPU RENDERING
# ═══════════════════════════════════════════════

def setup_gpu():
    """Configure Blender to use both RTX 3090s via CUDA."""
    prefs = bpy.context.preferences
    cycles_prefs = prefs.addons.get("cycles")

    if cycles_prefs:
        cycles_prefs = cycles_prefs.preferences
        # Try OptiX first (faster on RTX), fall back to CUDA
        for compute_type in ["OPTIX", "CUDA"]:
            try:
                cycles_prefs.compute_device_type = compute_type
                # Refresh device list
                cycles_prefs.get_devices()

                # Enable ALL GPU devices
                for device in cycles_prefs.devices:
                    if device.type in ("CUDA", "OPTIX"):
                        device.use = True
                        print(f"  Enabled GPU: {device.name} ({device.type})")
                    elif device.type == "CPU":
                        device.use = False  # GPU-only for speed

                print(f"\nCompute type: {compute_type}")
                print(f"Devices enabled: {sum(1 for d in cycles_prefs.devices if d.use)}")
                return True
            except Exception as e:
                print(f"  {compute_type} failed: {e}")
                continue

    print("WARNING: Could not configure GPU rendering")
    return False


# ═══════════════════════════════════════════════
# RENDER PREVIEW OF EACH MODEL
# ═══════════════════════════════════════════════

def setup_scene():
    """Set up a nice preview scene with lighting."""
    # Clear scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Camera
    bpy.ops.object.camera_add(location=(15, -15, 12))
    camera = bpy.context.active_object
    camera.rotation_euler = (1.1, 0, 0.8)
    bpy.context.scene.camera = camera

    # 3-point lighting
    # Key light
    bpy.ops.object.light_add(type='AREA', location=(10, -5, 15))
    key = bpy.context.active_object
    key.data.energy = 500
    key.data.size = 5

    # Fill light
    bpy.ops.object.light_add(type='AREA', location=(-8, -8, 8))
    fill = bpy.context.active_object
    fill.data.energy = 200
    fill.data.size = 4

    # Rim light
    bpy.ops.object.light_add(type='AREA', location=(0, 10, 10))
    rim = bpy.context.active_object
    rim.data.energy = 300
    rim.data.size = 3

    # Ground plane
    bpy.ops.mesh.primitive_plane_add(size=50, location=(0, 0, 0))
    plane = bpy.context.active_object
    mat = bpy.data.materials.new("Ground")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs[0].default_value = (0.05, 0.06, 0.08, 1)  # dark floor
        bsdf.inputs[4].default_value = 0.9  # rough
    plane.data.materials.append(mat)

    # Render settings
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 768
    scene.cycles.samples = 128  # good quality, fast on dual 3090
    scene.render.film_transparent = False

    # World background
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.02, 0.025, 0.04, 1)  # dark blue-grey
        bg.inputs[1].default_value = 1.0

    return camera


def render_model(model_path, output_path, camera):
    """Import a model and render it."""
    # Remove previous model objects (keep camera, lights, plane)
    for obj in list(bpy.data.objects):
        if obj.type == 'MESH' and obj.name != "Plane":
            bpy.data.objects.remove(obj, do_unlink=True)

    # Import FBX
    try:
        bpy.ops.import_scene.fbx(filepath=str(model_path))
    except Exception as e:
        print(f"  Failed to import {model_path}: {e}")
        return False

    # Center and frame the model
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and obj.name != "Plane":
            obj.select_set(True)

    if bpy.context.selected_objects:
        # Calculate bounding box
        min_co = [float('inf')] * 3
        max_co = [float('-inf')] * 3
        for obj in bpy.context.selected_objects:
            for v in obj.bound_box:
                world_co = obj.matrix_world @ bpy.mathutils.Vector(v) if hasattr(bpy, 'mathutils') else v
                for i in range(3):
                    co = v[i] * obj.scale[i] + obj.location[i]
                    min_co[i] = min(min_co[i], co)
                    max_co[i] = max(max_co[i], co)

        # Position camera to frame model
        center_x = (min_co[0] + max_co[0]) / 2
        center_y = (min_co[1] + max_co[1]) / 2
        max_dim = max(max_co[i] - min_co[i] for i in range(3))
        dist = max_dim * 2.5

        camera.location = (center_x + dist * 0.7, center_y - dist * 0.7, max_dim * 1.5)
        # Point at center
        direction = bpy.mathutils.Vector((center_x, center_y, max_dim * 0.3)) - camera.location if hasattr(bpy, 'mathutils') else None

    # Render
    bpy.context.scene.render.filepath = str(output_path)
    bpy.ops.render.render(write_still=True)
    print(f"  Rendered: {output_path}")
    return True


def render_all_models():
    """Render preview images of all FBX models."""
    setup_gpu()
    camera = setup_scene()

    fbx_files = sorted(MODELS_DIR.glob("*.fbx"))
    print(f"\nFound {len(fbx_files)} models to render")

    for fbx in fbx_files:
        output = RENDERS_DIR / (fbx.stem + "_preview.png")
        print(f"\nRendering: {fbx.name}")
        render_model(fbx, output, camera)

    print(f"\nAll renders saved to: {RENDERS_DIR}")


if __name__ == "__main__":
    if "--render-all" in sys.argv:
        render_all_models()
    else:
        # Just setup and report
        success = setup_gpu()
        print(f"\nGPU setup: {'OK' if success else 'FAILED'}")
        print(f"Models dir: {MODELS_DIR} ({len(list(MODELS_DIR.glob('*.fbx')))} models)")
        print(f"Renders dir: {RENDERS_DIR}")
        print(f"\nTo render all previews:")
        print(f"  flatpak run --filesystem=/home/knight2 org.blender.Blender \\")
        print(f"    --background --python {__file__} -- --render-all")
