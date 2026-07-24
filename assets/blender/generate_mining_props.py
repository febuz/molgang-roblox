"""
generate_mining_props.py
MOLGANG — 3D site-dressing props for the mining zones.

The mining zones already have the big vehicles (excavator, haul_truck,
drill_rig, rail_cart) but no small site dressing. This adds 8 props:

1. ore_cart          — mine cart of ore chunks on a rail bogie
2. mine_support_frame — timber tunnel support (A-frame)
3. ore_vein          — rock outcrop with embedded ore crystals
4. pickaxe_rack      — rack of pickaxes / tools
5. mine_rail         — straight rail-track segment
6. mine_lantern      — standing lantern with an emissive flame
7. crate_stack       — stacked wooden supply crates
8. ore_pile          — heap of mixed ore chunks

Human-scaled (1 Roblox stud = 0.28 m, character ≈ 6 studs). Each model
exports FBX (Roblox) + GLB (Godot/web + the asset viewer) with a Workbench
preview.

Run:
  /media/knight2/EDS2/apps/blender/blender-5.2.0-linux-x64/blender \
      --background --python assets/blender/generate_mining_props.py
"""

import bpy
import os
import math
import random

MODELS_DIR = "/home/knight2/molgang-roblox/assets/models"
RENDERS_DIR = "/home/knight2/molgang-roblox/assets/renders"


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for block in list(bpy.data.meshes):
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        if block.users == 0:
            bpy.data.materials.remove(block)


def add_material(obj, name, color, metallic=0.0, roughness=0.5, emission=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission > 0:
        bsdf.inputs["Emission Strength"].default_value = emission
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        for key in ("Transmission Weight", "Transmission"):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = 1.0 - alpha
                break
        try:
            mat.blend_method = 'BLEND'
        except (AttributeError, TypeError):
            pass
    mat.diffuse_color = (*color, alpha)
    obj.data.materials.append(mat)


def _box(name, size, location, color, rot=None, **mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    if rot:
        obj.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=bool(rot))
    add_material(obj, name + "_mat", color, **mat)
    return obj


def _cyl(name, radius, depth, location, color, vertices=32, rot=None, **mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    if rot:
        obj.rotation_euler = rot
        bpy.ops.object.transform_apply(rotation=True)
    add_material(obj, name + "_mat", color, **mat)
    return obj


def _rock(name, radius, location, color, **mat):
    """Low-poly irregular rock via a jittered ico sphere."""
    bpy.ops.mesh.primitive_ico_sphere_add(radius=radius, subdivisions=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    for v in obj.data.vertices:
        v.co += v.co.normalized() * random.uniform(-0.18, 0.18) * radius
    add_material(obj, name + "_mat", color, **mat)
    return obj


def render_preview(name):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.render.resolution_x = 480
    scene.render.resolution_y = 480

    import mathutils
    meshes = [o for o in scene.objects if o.type == 'MESH']
    if not meshes:
        return
    mins = mathutils.Vector((1e9, 1e9, 1e9))
    maxs = mathutils.Vector((-1e9, -1e9, -1e9))
    for o in meshes:
        for corner in o.bound_box:
            world = o.matrix_world @ mathutils.Vector(corner)
            for i in range(3):
                mins[i] = min(mins[i], world[i])
                maxs[i] = max(maxs[i], world[i])
    center = (mins + maxs) / 2
    size = max((maxs - mins).x, (maxs - mins).y, (maxs - mins).z, 1.0)

    bpy.ops.object.empty_add(location=center)
    target = bpy.context.active_object
    dist = size * 2.4
    bpy.ops.object.camera_add(location=(center.x + dist, center.y - dist, center.z + dist * 0.7))
    cam = bpy.context.active_object
    con = cam.constraints.new(type='TRACK_TO')
    con.target = target
    con.track_axis = 'TRACK_NEGATIVE_Z'
    con.up_axis = 'UP_Y'
    scene.camera = cam

    os.makedirs(RENDERS_DIR, exist_ok=True)
    scene.render.filepath = os.path.join(RENDERS_DIR, f"{name}_preview.png")
    bpy.ops.render.render(write_still=True)

    bpy.ops.object.select_all(action='DESELECT')
    cam.select_set(True)
    target.select_set(True)
    bpy.ops.object.delete()


def export_model(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.fbx(filepath=os.path.join(MODELS_DIR, f"{name}.fbx"), use_selection=True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(MODELS_DIR, f"{name}.glb"),
                              export_format='GLB', use_selection=True)
    print(f"Exported: {name}.fbx + {name}.glb")


# Palette
WOOD = (0.45, 0.30, 0.16)
WOOD_DARK = (0.32, 0.21, 0.11)
IRON = (0.32, 0.34, 0.38)
RUST = (0.5, 0.3, 0.2)
ROCK = (0.36, 0.34, 0.32)
ROCK_DARK = (0.24, 0.22, 0.21)
ORE_GOLD = (0.85, 0.68, 0.2)
ORE_COPPER = (0.75, 0.45, 0.25)
ORE_TEAL = (0.2, 0.6, 0.6)
FLAME = (1.0, 0.6, 0.2)

ORE_COLORS = [ORE_GOLD, ORE_COPPER, ORE_TEAL, (0.6, 0.6, 0.65)]


# 1. Ore cart — bucket of ore chunks on an iron bogie.
def create_ore_cart():
    clear_scene()
    _box("CartBody", (2.6, 1.8, 1.4), (0, 0, 1.4), IRON, metallic=0.5, roughness=0.5)
    _box("CartInner", (2.2, 1.4, 1.1), (0, 0, 1.6), ROCK_DARK, roughness=0.7)
    _box("CartBrace", (2.8, 0.15, 0.3), (0, 0, 0.9), RUST, metallic=0.4, roughness=0.6)
    # Ore load
    random.seed(11)
    for i in range(7):
        _rock(f"Ore_{i}", random.uniform(0.3, 0.45),
              (random.uniform(-0.8, 0.8), random.uniform(-0.5, 0.5), 1.9 + random.uniform(0, 0.2)),
              random.choice(ORE_COLORS), roughness=0.5, metallic=0.3)
    # Wheels
    for sx in (-1.0, 1.0):
        for sy in (-0.9, 0.9):
            _cyl(f"Wheel_{sx}_{sy}", 0.5, 0.2, (sx, sy, 0.5), IRON,
                 metallic=0.6, roughness=0.4, rot=(math.pi / 2, 0, 0), vertices=16)
    render_preview("ore_cart")
    export_model("ore_cart")


# 2. Mine support frame — timber A-frame tunnel support.
def create_support_frame():
    clear_scene()
    for sx in (-2.2, 2.2):
        _box(f"Post_{sx}", (0.5, 0.5, 5.0), (sx, 0, 2.5), WOOD, roughness=0.7)
        _box(f"Base_{sx}", (0.8, 0.8, 0.4), (sx, 0, 0.2), WOOD_DARK, roughness=0.7)
    _box("Lintel", (5.4, 0.6, 0.6), (0, 0, 4.9), WOOD, roughness=0.7)
    _box("Brace", (5.0, 0.4, 0.4), (0, 0, 4.2), WOOD_DARK, roughness=0.7)
    # Iron bolt plates
    for sx in (-2.2, 2.2):
        _box(f"Plate_{sx}", (0.7, 0.7, 0.15), (sx, 0, 4.75), IRON, metallic=0.6, roughness=0.4)
    render_preview("mine_support_frame")
    export_model("mine_support_frame")


# 3. Ore vein — rock outcrop with embedded glowing ore crystals.
def create_ore_vein():
    clear_scene()
    random.seed(7)
    _rock("Boulder", 2.0, (0, 0, 1.6), ROCK, roughness=0.8)
    for i in range(4):
        _rock(f"Chunk_{i}", random.uniform(0.7, 1.1),
              (random.uniform(-1.4, 1.4), random.uniform(-1.0, 1.0), random.uniform(0.6, 1.4)),
              ROCK_DARK, roughness=0.8)
    # Embedded ore crystals (angled cones)
    for i in range(6):
        ang = i * math.pi / 3
        x, y = math.cos(ang) * 1.4, math.sin(ang) * 1.0
        bpy.ops.mesh.primitive_cone_add(radius1=0.28, radius2=0.0, depth=0.9,
                                        location=(x, y, 2.1 + (i % 2) * 0.3))
        cr = bpy.context.active_object
        cr.name = f"Crystal_{i}"
        cr.rotation_euler = (random.uniform(-0.6, 0.6), random.uniform(-0.6, 0.6), 0)
        add_material(cr, f"Crystal_{i}_mat", random.choice(ORE_COLORS), roughness=0.25, emission=0.8)
    render_preview("ore_vein")
    export_model("ore_vein")


# 4. Pickaxe rack — rack of pickaxes and tools.
def create_pickaxe_rack():
    clear_scene()
    _box("RackBack", (3.2, 0.3, 3.4), (0, 0.4, 1.7), WOOD, roughness=0.7)
    _box("RackShelf", (3.2, 1.0, 0.2), (0, 0, 1.6), WOOD_DARK, roughness=0.7)
    for i in range(3):
        x = (i - 1) * 1.0
        # Handle
        _cyl(f"Handle_{i}", 0.09, 2.6, (x, -0.2, 2.0), WOOD_DARK, roughness=0.6, vertices=8)
        # Pick head (iron bar across the top)
        _box(f"Head_{i}", (0.9, 0.18, 0.18), (x, -0.2, 3.2), IRON, metallic=0.7, roughness=0.35)
    render_preview("pickaxe_rack")
    export_model("pickaxe_rack")


# 5. Mine rail — straight rail-track segment.
def create_mine_rail():
    clear_scene()
    for i in range(7):
        y = (i - 3) * 1.1
        _box(f"Tie_{i}", (2.6, 0.5, 0.25), (0, y, 0.12), WOOD_DARK, roughness=0.7)
    for sx in (-0.9, 0.9):
        _box(f"Rail_{sx}", (0.18, 7.6, 0.3), (sx, 0, 0.4), IRON, metallic=0.7, roughness=0.35)
    render_preview("mine_rail")
    export_model("mine_rail")


# 6. Mine lantern — standing lantern with an OPEN cage frame so the flame
#    is visible (a solid box hides the whole point). Corner bars + top/bottom
#    caps, flame inside, thin transparent glass added after the render.
def create_mine_lantern():
    clear_scene()
    cx = 0.5
    _cyl("LanternBase", 0.7, 0.3, (0, 0, 0.15), IRON, metallic=0.5, roughness=0.5)
    _cyl("LanternPost", 0.12, 3.0, (0, 0, 1.6), IRON, metallic=0.6, roughness=0.4)
    _box("LanternHook", (0.6, 0.15, 0.15), (0.25, 0, 3.1), IRON, metallic=0.6)
    # Cage caps
    _box("CageTop", (0.7, 0.7, 0.16), (cx, 0, 3.1), IRON, metallic=0.6, roughness=0.4)
    _box("CageBottom", (0.7, 0.7, 0.16), (cx, 0, 2.1), IRON, metallic=0.6, roughness=0.4)
    _box("CageCap", (0.4, 0.4, 0.25), (cx, 0, 3.3), IRON, metallic=0.6, roughness=0.4)
    # Four thin corner bars (open sides)
    for dx in (-0.28, 0.28):
        for dy in (-0.28, 0.28):
            _box(f"Bar_{dx}_{dy}", (0.09, 0.09, 1.0), (cx + dx, dy, 2.6), IRON,
                 metallic=0.6, roughness=0.4)
    # Flame inside — visible through the open cage
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.24, subdivisions=1, location=(cx, 0, 2.55))
    fl = bpy.context.active_object
    fl.name = "LanternFlame"
    add_material(fl, "FlameMat", FLAME, emission=4.0, roughness=0.3)
    render_preview("mine_lantern")  # render before glass so the flame shows
    # Thin glass panes on the four sides (transparent in-engine)
    for dy in (-0.32, 0.32):
        _box(f"Glass_{dy}", (0.62, 0.04, 0.95), (cx, dy, 2.6), (0.9, 0.85, 0.7), roughness=0.1, alpha=0.3)
    for dx in (-0.32, 0.32):
        _box(f"GlassX_{dx}", (0.04, 0.62, 0.95), (cx + dx, 0, 2.6), (0.9, 0.85, 0.7), roughness=0.1, alpha=0.3)
    export_model("mine_lantern")


# 7. Crate stack — stacked wooden supply crates.
def create_crate_stack():
    clear_scene()
    random.seed(3)
    positions = [(-0.6, -0.5, 0.9, 1.7), (0.7, 0.4, 0.9, 1.6), (0.1, -0.2, 2.5, 1.5)]
    for i, (x, y, z, s) in enumerate(positions):
        _box(f"Crate_{i}", (s, s, s), (x, y, z), WOOD, roughness=0.7,
             rot=(0, 0, random.uniform(-0.3, 0.3)))
        # slats
        _box(f"Slat_{i}a", (s + 0.02, s + 0.02, 0.12), (x, y, z + s / 2 - 0.1), WOOD_DARK, roughness=0.7)
        _box(f"Slat_{i}b", (0.12, s + 0.02, s + 0.02), (x - s / 2 + 0.08, y, z), WOOD_DARK, roughness=0.7)
    render_preview("crate_stack")
    export_model("crate_stack")


# 8. Ore pile — heap of mixed ore chunks.
def create_ore_pile():
    clear_scene()
    random.seed(21)
    _cyl("PileBase", 2.4, 0.3, (0, 0, 0.15), ROCK_DARK, roughness=0.85, vertices=16)
    n = 16
    for i in range(n):
        r = random.uniform(0.0, 1.8)
        ang = random.uniform(0, 2 * math.pi)
        x, y = math.cos(ang) * r, math.sin(ang) * r
        z = 0.4 + max(0.0, (1.8 - r)) * 0.5 + random.uniform(0, 0.2)
        _rock(f"Chunk_{i}", random.uniform(0.3, 0.55), (x, y, z),
              random.choice(ORE_COLORS), roughness=0.55, metallic=0.3)
    render_preview("ore_pile")
    export_model("ore_pile")


if __name__ == "__main__":
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(RENDERS_DIR, exist_ok=True)
    print("Generating 8 mining-site props...")
    create_ore_cart()
    create_support_frame()
    create_ore_vein()
    create_pickaxe_rack()
    create_mine_rail()
    create_mine_lantern()
    create_crate_stack()
    create_ore_pile()
    print("Done! 8 mining props exported (FBX + GLB) with previews.")
