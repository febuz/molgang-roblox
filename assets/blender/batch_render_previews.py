"""
MOLGANG — Batch Render All 25 Equipment Models with Dual RTX 3090
Creates high-quality preview images for each FBX model.

Run: flatpak run --filesystem=/home/knight2 org.blender.Blender --background --python batch_render_previews.py
"""
import bpy
import mathutils
import math
import os
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models"
RENDERS_DIR = Path(__file__).parent.parent / "renders"
RENDERS_DIR.mkdir(exist_ok=True)

# ═══════════════════════════════════════════════
# GPU SETUP
# ═══════════════════════════════════════════════

def setup_gpu():
    prefs = bpy.context.preferences
    cycles_prefs = prefs.addons.get("cycles")
    if cycles_prefs:
        cp = cycles_prefs.preferences
        for ct in ["OPTIX", "CUDA"]:
            try:
                cp.compute_device_type = ct
                cp.get_devices()
                for d in cp.devices:
                    d.use = d.type in ("CUDA", "OPTIX")
                    if d.use:
                        print(f"  GPU: {d.name}")
                return True
            except:
                continue
    return False

# ═══════════════════════════════════════════════
# SCENE SETUP
# ═══════════════════════════════════════════════

def setup_render_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Camera
    bpy.ops.object.camera_add(location=(12, -12, 10))
    cam = bpy.context.active_object
    cam.rotation_euler = (math.radians(60), 0, math.radians(45))
    bpy.context.scene.camera = cam

    # Key light (warm)
    bpy.ops.object.light_add(type='AREA', location=(8, -4, 12))
    key = bpy.context.active_object
    key.data.energy = 400
    key.data.size = 4
    key.data.color = (1, 0.95, 0.9)

    # Fill light (cool)
    bpy.ops.object.light_add(type='AREA', location=(-6, -6, 6))
    fill = bpy.context.active_object
    fill.data.energy = 150
    fill.data.size = 3
    fill.data.color = (0.85, 0.9, 1)

    # Rim light
    bpy.ops.object.light_add(type='AREA', location=(0, 8, 8))
    rim = bpy.context.active_object
    rim.data.energy = 250
    rim.data.size = 3

    # Ground plane
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    plane = bpy.context.active_object
    mat = bpy.data.materials.new("Ground")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs[0].default_value = (0.04, 0.045, 0.06, 1)
        bsdf.inputs[4].default_value = 0.85
    plane.data.materials.append(mat)

    # Render settings
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 960
    scene.cycles.samples = 64
    scene.render.film_transparent = False
    scene.cycles.use_denoising = True

    # World
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.015, 0.02, 0.03, 1)

    return cam

# ═══════════════════════════════════════════════
# RENDER EACH MODEL
# ═══════════════════════════════════════════════

def render_fbx(fbx_path, output_path, camera):
    # Remove previous model objects
    for obj in list(bpy.data.objects):
        if obj.type == 'MESH' and obj.name != "Plane":
            bpy.data.objects.remove(obj, do_unlink=True)

    # Import FBX
    try:
        bpy.ops.import_scene.fbx(filepath=str(fbx_path))
    except Exception as e:
        print(f"  SKIP: {fbx_path.name} — {e}")
        return False

    # Find imported objects
    imported = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name != "Plane"]
    if not imported:
        print(f"  SKIP: {fbx_path.name} — no meshes")
        return False

    # Calculate bounding box of all imported objects
    min_v = [float('inf')] * 3
    max_v = [float('-inf')] * 3
    for obj in imported:
        for corner in obj.bound_box:
            world_co = obj.matrix_world @ mathutils.Vector(corner)
            for i in range(3):
                min_v[i] = min(min_v[i], world_co[i])
                max_v[i] = max(max_v[i], world_co[i])

    center = [(min_v[i] + max_v[i]) / 2 for i in range(3)]
    size = max(max_v[i] - min_v[i] for i in range(3))

    # Position camera to frame model
    dist = size * 2.2
    camera.location = (center[0] + dist * 0.6, center[1] - dist * 0.6, center[2] + dist * 0.5)

    # Point camera at center using track-to constraint
    for c in camera.constraints:
        camera.constraints.remove(c)
    track = camera.constraints.new(type='TRACK_TO')
    track.target = imported[0]
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    # Render
    bpy.context.scene.render.filepath = str(output_path)
    bpy.ops.render.render(write_still=True)
    print(f"  OK: {output_path.name} ({size:.1f} units)")

    # Remove constraint
    camera.constraints.remove(track)
    return True


def main():
    print("=" * 60)
    print("MOLGANG — GPU Batch Render (Dual RTX 3090)")
    print("=" * 60)

    gpu_ok = setup_gpu()
    print(f"GPU rendering: {'ENABLED' if gpu_ok else 'FALLBACK TO CPU'}")

    camera = setup_render_scene()

    fbx_files = sorted(MODELS_DIR.glob("*.fbx"))
    print(f"\nRendering {len(fbx_files)} models...")

    success = 0
    for fbx in fbx_files:
        output = RENDERS_DIR / f"{fbx.stem}_preview.png"
        print(f"\n[{success+1}/{len(fbx_files)}] {fbx.name}")
        if render_fbx(fbx, output, camera):
            success += 1

    print(f"\n{'=' * 60}")
    print(f"Rendered {success}/{len(fbx_files)} models")
    print(f"Output: {RENDERS_DIR}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
