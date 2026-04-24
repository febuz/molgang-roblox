"""
generate_new_models.py
MOLGANG — Generate additional 3D models for new game features

New models:
1. Teleport Pad (glowing circular platform)
2. Slag Ladle (hot metal container)
3. Rail Cart (for Velzen factory rail tracks)
4. Safety Fence Post (mining outpost)
5. Warning Beacon (orange flashing light)
6. Solar Panel (carbon offset / green energy)
7. Boba Tea Cup (bubble tea bar)
8. Diploma Frame (certificate display)

Run with: flatpak run --filesystem=/home/knight2 org.blender.Blender --background --python /home/knight2/molgang-roblox/assets/blender/generate_new_models.py
"""

import bpy
import os
import math

OUTPUT_DIR = "/home/knight2/molgang-roblox/assets/models"

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def add_material(obj, name, color, metallic=0.0, roughness=0.5, emission=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission > 0:
        bsdf.inputs["Emission Strength"].default_value = emission
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
    obj.data.materials.append(mat)

def export_fbx(name):
    path = os.path.join(OUTPUT_DIR, f"{name}.fbx")
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True)
    print(f"Exported: {path}")

# ═══════════════════════════════════════════════
# 1. Teleport Pad
# ═══════════════════════════════════════════════
def create_teleport_pad():
    clear_scene()
    # Base ring
    bpy.ops.mesh.primitive_cylinder_add(radius=4, depth=0.5, location=(0, 0, 0.25))
    base = bpy.context.active_object
    base.name = "TeleportPad_Base"
    add_material(base, "PadBase", (0.15, 0.12, 0.08), metallic=0.8, roughness=0.3)

    # Glowing ring
    bpy.ops.mesh.primitive_torus_add(major_radius=3.5, minor_radius=0.2, location=(0, 0, 0.6))
    ring = bpy.context.active_object
    ring.name = "GlowRing"
    add_material(ring, "GlowGold", (1.0, 0.78, 0.15), emission=3.0)

    # Center crystal
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.8, subdivisions=2, location=(0, 0, 1.2))
    crystal = bpy.context.active_object
    crystal.name = "Crystal"
    add_material(crystal, "CrystalGlow", (0.3, 0.9, 0.5), emission=2.0)

    # Arrow markers (4 directions)
    for i in range(4):
        angle = i * math.pi / 2
        x = math.cos(angle) * 2.5
        y = math.sin(angle) * 2.5
        bpy.ops.mesh.primitive_cone_add(radius1=0.4, depth=0.6, location=(x, y, 0.8))
        arrow = bpy.context.active_object
        arrow.rotation_euler = (0, 0, angle + math.pi)
        add_material(arrow, f"Arrow_{i}", (1.0, 0.78, 0.15), emission=1.5)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("teleport_pad")

# ═══════════════════════════════════════════════
# 2. Slag Ladle
# ═══════════════════════════════════════════════
def create_slag_ladle():
    clear_scene()
    # Outer shell
    bpy.ops.mesh.primitive_cylinder_add(radius=3, depth=4, location=(0, 0, 2))
    shell = bpy.context.active_object
    shell.name = "LadleShell"
    add_material(shell, "HeatSteel", (0.35, 0.3, 0.28), metallic=0.9, roughness=0.4)

    # Inner molten glow
    bpy.ops.mesh.primitive_cylinder_add(radius=2.5, depth=0.5, location=(0, 0, 3.8))
    molten = bpy.context.active_object
    molten.name = "MoltenSlag"
    add_material(molten, "MoltenOrange", (1.0, 0.45, 0.1), emission=5.0)

    # Support trunnions
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=1.5, location=(side * 3.3, 0, 3))
        trunnion = bpy.context.active_object
        trunnion.rotation_euler = (0, math.pi/2, 0) if side > 0 else (0, -math.pi/2, 0)
        add_material(trunnion, f"Trunnion_{side}", (0.4, 0.35, 0.3), metallic=0.8)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("slag_ladle")

# ═══════════════════════════════════════════════
# 3. Rail Cart
# ═══════════════════════════════════════════════
def create_rail_cart():
    clear_scene()
    # Cart body
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.2))
    body = bpy.context.active_object
    body.scale = (2, 1.2, 0.8)
    bpy.ops.object.transform_apply(scale=True)
    add_material(body, "CartMetal", (0.3, 0.28, 0.25), metallic=0.7, roughness=0.5)

    # Wheels (4)
    for wx in [-1.5, 1.5]:
        for wy in [-0.9, 0.9]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.35, depth=0.15, location=(wx, wy, 0.35))
            wheel = bpy.context.active_object
            wheel.rotation_euler = (math.pi/2, 0, 0)
            add_material(wheel, "WheelSteel", (0.2, 0.2, 0.22), metallic=0.9)

    # Ore pile on top
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=(0, 0, 2))
    ore = bpy.context.active_object
    ore.scale = (1.2, 0.8, 0.5)
    bpy.ops.object.transform_apply(scale=True)
    add_material(ore, "OreRock", (0.2, 0.15, 0.12), roughness=0.9)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("rail_cart")

# ═══════════════════════════════════════════════
# 4. Safety Fence Post
# ═══════════════════════════════════════════════
def create_safety_fence():
    clear_scene()
    # Main post
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=3, location=(0, 0, 1.5))
    post = bpy.context.active_object
    add_material(post, "YellowPost", (0.9, 0.7, 0.0), metallic=0.3, roughness=0.4)

    # Top cap
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=(0, 0, 3.1))
    cap = bpy.context.active_object
    add_material(cap, "YellowCap", (0.9, 0.7, 0.0), metallic=0.5)

    # Base plate
    bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=0.15, location=(0, 0, 0.075))
    base = bpy.context.active_object
    add_material(base, "BasePlate", (0.25, 0.25, 0.27), metallic=0.8)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("safety_fence_post")

# ═══════════════════════════════════════════════
# 5. Warning Beacon
# ═══════════════════════════════════════════════
def create_warning_beacon():
    clear_scene()
    # Pole
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=2, location=(0, 0, 1))
    pole = bpy.context.active_object
    add_material(pole, "BeaconPole", (0.3, 0.3, 0.32), metallic=0.7)

    # Light housing
    bpy.ops.mesh.primitive_cylinder_add(radius=0.4, depth=0.3, location=(0, 0, 2.2))
    housing = bpy.context.active_object
    add_material(housing, "Housing", (0.2, 0.2, 0.22), metallic=0.8)

    # Orange light dome
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, location=(0, 0, 2.5))
    dome = bpy.context.active_object
    bpy.ops.transform.resize(value=(1, 1, 0.6))
    add_material(dome, "OrangeLight", (1.0, 0.55, 0.0), emission=4.0)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("warning_beacon")

# ═══════════════════════════════════════════════
# 6. Solar Panel
# ═══════════════════════════════════════════════
def create_solar_panel():
    clear_scene()
    # Support pole
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=2.5, location=(0, 0, 1.25))
    pole = bpy.context.active_object
    add_material(pole, "PoleAluminum", (0.6, 0.6, 0.62), metallic=0.9, roughness=0.3)

    # Panel frame
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 2.8))
    frame = bpy.context.active_object
    frame.scale = (2, 1.2, 0.08)
    frame.rotation_euler = (math.radians(30), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    add_material(frame, "SolarCell", (0.1, 0.12, 0.25), metallic=0.5, roughness=0.2)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("solar_panel")

# ═══════════════════════════════════════════════
# 7. Boba Tea Cup
# ═══════════════════════════════════════════════
def create_boba_cup():
    clear_scene()
    # Cup body (tapered cylinder)
    bpy.ops.mesh.primitive_cone_add(radius1=0.6, radius2=0.8, depth=2.2, location=(0, 0, 1.1))
    cup = bpy.context.active_object
    add_material(cup, "CupPlastic", (0.85, 0.85, 0.9), metallic=0.0, roughness=0.2)

    # Lid
    bpy.ops.mesh.primitive_cylinder_add(radius=0.85, depth=0.1, location=(0, 0, 2.25))
    lid = bpy.context.active_object
    add_material(lid, "LidDark", (0.15, 0.15, 0.17), roughness=0.3)

    # Straw
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=2.8, location=(0.2, 0, 2.4))
    straw = bpy.context.active_object
    straw.rotation_euler = (math.radians(10), 0, 0)
    add_material(straw, "StrawGreen", (0.0, 0.7, 0.4), roughness=0.4)

    # Boba pearls (6 small spheres at bottom)
    for i in range(6):
        angle = i * math.pi / 3
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12,
            location=(math.cos(angle)*0.3, math.sin(angle)*0.3, 0.3))
        pearl = bpy.context.active_object
        add_material(pearl, f"Pearl_{i}", (0.12, 0.08, 0.05), roughness=0.6)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("boba_tea_cup")

# ═══════════════════════════════════════════════
# 8. Diploma Frame
# ═══════════════════════════════════════════════
def create_diploma_frame():
    clear_scene()
    # Outer frame
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    frame = bpy.context.active_object
    frame.scale = (3, 0.1, 2.2)
    bpy.ops.object.transform_apply(scale=True)
    add_material(frame, "WoodFrame", (0.35, 0.22, 0.1), roughness=0.6)

    # Inner paper
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.06, 0))
    paper = bpy.context.active_object
    paper.scale = (2.6, 1, 1.8)
    bpy.ops.object.transform_apply(scale=True)
    add_material(paper, "Parchment", (0.95, 0.92, 0.85), roughness=0.8)

    # Gold seal
    bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.05, location=(0, 0.12, -0.6))
    seal = bpy.context.active_object
    add_material(seal, "GoldSeal", (0.9, 0.75, 0.1), metallic=0.9, roughness=0.2)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("diploma_frame")


# ═══════════════════════════════════════════════
# GENERATE ALL
# ═══════════════════════════════════════════════
if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Generating 8 new 3D models...")
    create_teleport_pad()
    create_slag_ladle()
    create_rail_cart()
    create_safety_fence()
    create_warning_beacon()
    create_solar_panel()
    create_boba_cup()
    create_diploma_frame()
    print("Done! 8 models exported to", OUTPUT_DIR)
