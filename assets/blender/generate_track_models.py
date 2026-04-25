"""
generate_track_models.py
MOLGANG — 3D models for Quantum Racing + Superhero tracks

Models:
1. Quantum Tunnel Ring (neon racing ring)
2. Quantum Dot Collectible (glowing orb)
3. Speed Boost Pad (photon power-up)
4. Race Checkpoint Gate
5. Villain Boss Pedestal
6. Hero Shield Generator
7. Combat Arena Floor Plate
8. Trophy/Victory Cup

Run: flatpak run --filesystem=/home/knight2 org.blender.Blender --background --python generate_track_models.py
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

# 1. Quantum Tunnel Ring
def create_tunnel_ring():
    clear_scene()
    bpy.ops.mesh.primitive_torus_add(major_radius=6, minor_radius=0.3, location=(0, 0, 0))
    ring = bpy.context.active_object
    ring.name = "TunnelRing"
    add_material(ring, "NeonCyan", (0.2, 0.8, 1.0), emission=4.0)

    # Inner glow disc
    bpy.ops.mesh.primitive_circle_add(radius=5.5, fill_type='NGON', location=(0, 0, 0))
    disc = bpy.context.active_object
    add_material(disc, "GlowDisc", (0.1, 0.3, 0.5), emission=0.5)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("quantum_tunnel_ring")

# 2. Quantum Dot
def create_quantum_dot():
    clear_scene()
    bpy.ops.mesh.primitive_ico_sphere_add(radius=1, subdivisions=3, location=(0, 0, 0))
    dot = bpy.context.active_object
    add_material(dot, "QuantumGreen", (0.3, 1.0, 0.7), emission=5.0)

    # Orbiting electrons
    for i in range(3):
        angle = i * 2 * math.pi / 3
        bpy.ops.mesh.primitive_torus_add(
            major_radius=1.8, minor_radius=0.05,
            location=(0, 0, 0),
            rotation=(angle, math.pi/4 + i*0.3, 0)
        )
        orbit = bpy.context.active_object
        add_material(orbit, f"Orbit_{i}", (0.5, 1.0, 0.8), emission=2.0)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("quantum_dot")

# 3. Speed Boost Pad
def create_speed_pad():
    clear_scene()
    bpy.ops.mesh.primitive_cylinder_add(radius=3, depth=0.3, location=(0, 0, 0.15))
    pad = bpy.context.active_object
    add_material(pad, "BoostYellow", (1.0, 0.9, 0.2), emission=3.0)

    # Arrow chevrons
    for i in range(3):
        bpy.ops.mesh.primitive_cone_add(radius1=0.8, depth=0.3, location=(0, i*1.2-1.2, 0.35))
        arrow = bpy.context.active_object
        arrow.rotation_euler = (math.pi/2, 0, 0)
        add_material(arrow, f"Chevron_{i}", (1.0, 1.0, 0.5), emission=4.0)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("speed_boost_pad")

# 4. Race Checkpoint Gate
def create_checkpoint():
    clear_scene()
    # Two pillars
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=8, location=(side*4, 0, 4))
        pillar = bpy.context.active_object
        add_material(pillar, f"Pillar_{side}", (0.15, 0.15, 0.2), metallic=0.8)

    # Top bar
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 8.2))
    bar = bpy.context.active_object
    bar.scale = (4.5, 0.3, 0.3)
    bpy.ops.object.transform_apply(scale=True)
    add_material(bar, "TopBar", (0.0, 0.8, 1.0), emission=3.0)

    # Checkered flag pattern (simplified)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.2, 7))
    flag = bpy.context.active_object
    flag.scale = (3, 1, 1.5)
    bpy.ops.object.transform_apply(scale=True)
    add_material(flag, "Flag", (0.9, 0.9, 0.9), roughness=0.8)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("race_checkpoint")

# 5. Villain Boss Pedestal
def create_villain_pedestal():
    clear_scene()
    # Hexagonal base
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=4, depth=1.5, location=(0, 0, 0.75))
    base = bpy.context.active_object
    add_material(base, "DarkStone", (0.08, 0.05, 0.1), metallic=0.3, roughness=0.7)

    # Glowing ring
    bpy.ops.mesh.primitive_torus_add(major_radius=3.5, minor_radius=0.15, location=(0, 0, 1.6))
    ring = bpy.context.active_object
    add_material(ring, "EvilGlow", (0.8, 0.1, 0.2), emission=4.0)

    # Spikes
    for i in range(6):
        angle = i * math.pi / 3
        x = math.cos(angle) * 3
        y = math.sin(angle) * 3
        bpy.ops.mesh.primitive_cone_add(radius1=0.3, depth=2, location=(x, y, 2.5))
        spike = bpy.context.active_object
        add_material(spike, f"Spike_{i}", (0.15, 0.05, 0.08), metallic=0.6)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("villain_pedestal")

# 6. Hero Shield Generator
def create_shield_gen():
    clear_scene()
    # Core sphere
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5, location=(0, 0, 2))
    core = bpy.context.active_object
    add_material(core, "ShieldCore", (0.2, 0.6, 1.0), emission=3.0)

    # Base
    bpy.ops.mesh.primitive_cylinder_add(radius=2, depth=1, location=(0, 0, 0.5))
    base = bpy.context.active_object
    add_material(base, "GenBase", (0.3, 0.3, 0.35), metallic=0.7)

    # Shield dome (transparent)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=4, location=(0, 0, 2))
    dome = bpy.context.active_object
    add_material(dome, "ShieldDome", (0.3, 0.7, 1.0), emission=1.0)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("hero_shield_generator")

# 7. Combat Arena Floor
def create_arena_floor():
    clear_scene()
    # Octagonal platform
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=10, depth=0.5, location=(0, 0, 0.25))
    floor = bpy.context.active_object
    add_material(floor, "ArenaFloor", (0.06, 0.03, 0.08), metallic=0.4, roughness=0.3)

    # Center ring
    bpy.ops.mesh.primitive_torus_add(major_radius=3, minor_radius=0.15, location=(0, 0, 0.6))
    ring = bpy.context.active_object
    add_material(ring, "CenterRing", (1.0, 0.3, 0.5), emission=2.0)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("combat_arena_floor")

# 8. Victory Trophy
def create_trophy():
    clear_scene()
    # Base
    bpy.ops.mesh.primitive_cylinder_add(radius=1.5, depth=0.5, location=(0, 0, 0.25))
    base = bpy.context.active_object
    add_material(base, "TrophyBase", (0.15, 0.12, 0.1), metallic=0.3, roughness=0.6)

    # Stem
    bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=2, location=(0, 0, 1.5))
    stem = bpy.context.active_object
    add_material(stem, "GoldStem", (0.85, 0.7, 0.1), metallic=0.95, roughness=0.2)

    # Cup
    bpy.ops.mesh.primitive_cylinder_add(radius=1.2, depth=1.5, location=(0, 0, 3.25))
    cup = bpy.context.active_object
    add_material(cup, "GoldCup", (0.9, 0.75, 0.1), metallic=0.95, roughness=0.15)

    # Handles
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.1,
            location=(side*1.5, 0, 3.2))
        handle = bpy.context.active_object
        handle.rotation_euler = (0, math.pi/2, 0)
        add_material(handle, f"Handle_{side}", (0.9, 0.75, 0.1), metallic=0.95)

    # Star on top
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.4, subdivisions=1, location=(0, 0, 4.3))
    star = bpy.context.active_object
    add_material(star, "Star", (1.0, 0.9, 0.2), emission=2.0)

    bpy.ops.object.select_all(action='SELECT')
    export_fbx("victory_trophy")


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Generating 8 track models...")
    create_tunnel_ring()
    create_quantum_dot()
    create_speed_pad()
    create_checkpoint()
    create_villain_pedestal()
    create_shield_gen()
    create_arena_floor()
    create_trophy()
    print("Done! 8 track models exported.")
