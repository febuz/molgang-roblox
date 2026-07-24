"""
generate_hub_models.py
MOLGANG — 3D models for the Nexus Hub (central spawn plaza).

The hub is the first zone every player sees but was undressed (only a
procedural platform + tower). This adds 8 wayfinding / decorative props,
with a molecule motif on the fountain to tie the central plaza to the game's
chemistry theme:

1. welcome_arch       — entrance archway players walk under
2. directory_signpost — multi-arm wayfinding sign to the zones
3. nexus_fountain     — tiered fountain topped by a molecule sculpture
4. plaza_bench        — public seating bench
5. info_kiosk         — angled info screen on a stand
6. lamp_post          — plaza lamp with an emissive head
7. holo_map_stand     — pedestal with an emissive holographic dome
8. banner_pole        — tall pole with a hanging banner

Human-scaled (1 Roblox stud = 0.28 m, character ≈ 6 studs). Each model
exports as FBX (Roblox) + GLB (Godot/web + the asset viewer) with a Workbench
preview. Glass/emissive-through parts are rendered before transparent glass
is added (Workbench solid ignores alpha).

Run:
  /media/knight2/EDS2/apps/blender/blender-5.2.0-linux-x64/blender \
      --background --python assets/blender/generate_hub_models.py
"""

import bpy
import os
import math

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


def _box(name, size, location, color, **mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(scale=True)
    add_material(obj, name + "_mat", color, **mat)
    return obj


def _cyl(name, radius, depth, location, color, vertices=32, **mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    add_material(obj, name + "_mat", color, **mat)
    return obj


def _sphere(name, radius, location, color, **mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
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
STONE = (0.55, 0.57, 0.6)
STONE_DARK = (0.3, 0.32, 0.36)
TEAL = (0.10, 0.55, 0.52)
STEEL = (0.72, 0.74, 0.78)
WOOD = (0.5, 0.33, 0.18)
WATER = (0.25, 0.6, 0.9)
HOLO = (0.3, 0.8, 1.0)
GOLD = (0.85, 0.7, 0.2)
C_ATOM = (0.15, 0.15, 0.17)
O_ATOM = (0.85, 0.15, 0.15)


# 1. Welcome arch — two pillars + top beam + header, wide enough to walk under.
def create_welcome_arch():
    clear_scene()
    for sx in (-5, 5):
        _cyl(f"Pillar_{sx}", 0.7, 10, (sx, 0, 5), STONE, metallic=0.1, roughness=0.7)
        _box(f"PillarCap_{sx}", (1.8, 1.8, 0.5), (sx, 0, 10.2), STONE_DARK, roughness=0.6)
        _box(f"PillarBase_{sx}", (2.0, 2.0, 0.6), (sx, 0, 0.3), STONE_DARK, roughness=0.6)
    _box("ArchBeam", (11.5, 1.4, 1.2), (0, 0, 10.9), STONE, roughness=0.6)
    _box("ArchHeader", (7.0, 1.5, 1.4), (0, 0, 11.8), TEAL, emission=0.4, roughness=0.4)
    # "MOLGANG" letter blocks (abstract cream tiles on the header)
    for i in range(7):
        _box(f"Letter_{i}", (0.55, 0.1, 0.7), (-2.4 + i * 0.8, -0.78, 11.8), (0.95, 0.93, 0.85), emission=0.5)
    render_preview("welcome_arch")
    export_model("welcome_arch")


# 2. Directory signpost — central post with angled directional arms.
def create_signpost():
    clear_scene()
    _cyl("SignPost", 0.22, 6.0, (0, 0, 3.0), WOOD, roughness=0.6)
    _cyl("SignFinial", 0.35, 0.4, (0, 0, 6.1), GOLD, metallic=0.7, roughness=0.3)
    _box("SignFoot", (1.4, 1.4, 0.4), (0, 0, 0.2), STONE_DARK, roughness=0.6)
    arm_cols = [(0.85, 0.4, 0.3), (0.4, 0.7, 0.85), (0.5, 0.8, 0.4), (0.9, 0.8, 0.35)]
    for i in range(4):
        ang = i * math.pi / 2 + 0.2
        z = 5.2 - i * 0.75
        _box(f"Arm_{i}", (2.6, 0.5, 0.5), (math.cos(ang) * 1.4, math.sin(ang) * 1.4, z),
             arm_cols[i], roughness=0.5)
        obj = bpy.context.active_object
        obj.rotation_euler = (0, 0, ang)
        bpy.ops.object.transform_apply(rotation=True)
    render_preview("directory_signpost")
    export_model("directory_signpost")


# 3. Nexus fountain — tiered basin topped by a molecule sculpture. Taller,
#    narrower tiers so the fountain shape reads (a wide flat basin foreshortens
#    to a disc from a 3/4 view); visible raised water pools + jets.
def create_fountain():
    clear_scene()
    # Lower tier
    _cyl("BasinWall", 3.4, 1.6, (0, 0, 0.8), STONE, roughness=0.7)
    _cyl("BasinInner", 3.0, 1.4, (0, 0, 1.0), STONE_DARK, roughness=0.6)   # inner recess
    _cyl("WaterLower", 3.0, 0.5, (0, 0, 1.2), WATER, roughness=0.12, alpha=0.95)  # visible pool
    _cyl("BasinRim", 3.5, 0.3, (0, 0, 1.65), STONE, roughness=0.6)
    # Central stem
    _cyl("Stem", 0.6, 2.2, (0, 0, 2.6), STONE, roughness=0.7)
    # Water jets rising from the pool around the stem
    for a in range(4):
        ang = a * math.pi / 2
        _cyl(f"Jet_{a}", 0.1, 1.4, (math.cos(ang) * 1.0, math.sin(ang) * 1.0, 2.4),
             (0.55, 0.8, 1.0), roughness=0.1, alpha=0.7, vertices=8)
    # Upper tier
    _cyl("UpperWall", 1.7, 0.7, (0, 0, 3.9), STONE, roughness=0.7)
    _cyl("UpperInner", 1.4, 0.55, (0, 0, 4.0), STONE_DARK, roughness=0.6)
    _cyl("WaterUpper", 1.4, 0.25, (0, 0, 4.15), WATER, roughness=0.12, alpha=0.95)
    _cyl("UpperRim", 1.75, 0.18, (0, 0, 4.3), STONE, roughness=0.6)
    _cyl("UpperStem", 0.35, 1.0, (0, 0, 4.8), STONE, roughness=0.7)
    # Molecule sculpture on top (O–C–O, a nod to MOLCO2)
    center = (0, 0, 5.9)
    for sx in (-1.1, 1.1):
        pos = (sx, 0, 5.9)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=1.1,
                                             location=(sx / 2, 0, 5.9),
                                             rotation=(0, math.pi / 2, 0))
        bond = bpy.context.active_object
        bond.name = f"Bond_{sx}"
        add_material(bond, f"Bond_{sx}_mat", STEEL, metallic=0.5, roughness=0.3)
        _sphere(f"O_{sx}", 0.5, pos, O_ATOM, roughness=0.3)
    _sphere("C_center", 0.65, center, C_ATOM, roughness=0.3)
    render_preview("nexus_fountain")
    export_model("nexus_fountain")


# 4. Plaza bench — public seating.
def create_bench():
    clear_scene()
    _box("BenchSeat", (5.0, 1.6, 0.3), (0, 0, 1.6), WOOD, roughness=0.5)
    _box("BenchBack", (5.0, 0.3, 1.6), (0, 0.65, 2.4), WOOD, roughness=0.5)
    for sx in (-2.1, 2.1):
        _box(f"BenchLegL_{sx}", (0.35, 1.6, 1.6), (sx, 0, 0.8), STONE_DARK, metallic=0.3, roughness=0.6)
    for i in range(3):
        _box(f"BackSlat_{i}", (5.0, 0.12, 0.35), (0, 0.55, 2.0 + i * 0.5), WOOD, roughness=0.5)
    render_preview("plaza_bench")
    export_model("plaza_bench")


# 5. Info kiosk — angled emissive screen on a stand.
def create_info_kiosk():
    clear_scene()
    _box("KioskBase", (2.4, 1.6, 0.4), (0, 0, 0.2), STONE_DARK, roughness=0.6)
    _cyl("KioskColumn", 0.4, 3.0, (0, 0, 1.7), STEEL, metallic=0.7, roughness=0.3)
    _box("KioskHousing", (3.0, 0.6, 2.4), (0, 0, 3.8), (0.15, 0.16, 0.2), roughness=0.5)
    # Angled screen (emissive teal), tilt forward
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.35, 3.8))
    screen = bpy.context.active_object
    screen.name = "KioskScreen"
    screen.scale = (2.6, 0.1, 2.0)
    screen.rotation_euler = (math.radians(-12), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    add_material(screen, "ScreenMat", (0.15, 0.7, 0.75), emission=1.6, roughness=0.3)
    _box("KioskRoof", (3.3, 1.0, 0.25), (0, 0, 5.1), TEAL, roughness=0.4)
    render_preview("info_kiosk")
    export_model("info_kiosk")


# 6. Lamp post — plaza lamp with an emissive head.
def create_lamp_post():
    clear_scene()
    _box("LampFoot", (1.0, 1.0, 0.5), (0, 0, 0.25), STONE_DARK, roughness=0.6)
    _cyl("LampPole", 0.18, 7.0, (0, 0, 3.7), (0.2, 0.22, 0.25), metallic=0.6, roughness=0.4)
    _cyl("LampCollar", 0.3, 0.3, (0, 0, 7.1), STEEL, metallic=0.7, roughness=0.3)
    # Cross arm + two lamp heads
    _box("LampArm", (3.0, 0.15, 0.15), (0, 0, 7.2), (0.2, 0.22, 0.25), metallic=0.6)
    for sx in (-1.3, 1.3):
        _box(f"LampHead_{sx}", (0.7, 0.7, 0.5), (sx, 0, 6.95), (0.25, 0.25, 0.28), roughness=0.4)
        _sphere(f"LampGlow_{sx}", 0.28, (sx, 0, 6.75), (1.0, 0.95, 0.75), emission=3.0)
    render_preview("lamp_post")
    export_model("lamp_post")


# 7. Holo map stand — pedestal with an emissive holographic dome.
def create_holo_map():
    clear_scene()
    _cyl("HoloPedestal", 1.3, 2.2, (0, 0, 1.1), STONE_DARK, metallic=0.4, roughness=0.5)
    _cyl("HoloEmitter", 1.5, 0.25, (0, 0, 2.3), STEEL, metallic=0.8, roughness=0.25)
    # Holographic dome (emissive, semi-transparent) rendered last but emissive
    # reads even in workbench via base colour.
    _sphere("HoloDome", 1.6, (0, 0, 3.4), HOLO, emission=1.8, roughness=0.2, alpha=0.5)
    # Floating "map" rings inside
    for i, r in enumerate((0.6, 1.0, 1.4)):
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.04, location=(0, 0, 3.2 + i * 0.25))
        ring = bpy.context.active_object
        ring.name = f"HoloRing_{i}"
        add_material(ring, f"HoloRing_{i}_mat", (0.6, 0.9, 1.0), emission=2.5)
    render_preview("holo_map_stand")
    export_model("holo_map_stand")


# 8. Banner pole — tall pole with a hanging banner.
def create_banner_pole():
    clear_scene()
    _cyl("PoleFoot", 0.8, 0.5, (0, 0, 0.25), STONE_DARK, roughness=0.6)
    _cyl("Pole", 0.16, 9.0, (0, 0, 4.7), STEEL, metallic=0.7, roughness=0.3)
    _sphere("PoleTop", 0.3, (0, 0, 9.3), GOLD, metallic=0.8, roughness=0.25)
    _box("BannerArm", (0.15, 0.15, 2.6), (0, 0, 8.0), STEEL, metallic=0.7)
    bpy.ops.object.select_all(action='DESELECT')
    # Hanging banner (teal) with a molecule emblem
    _box("Banner", (2.4, 0.08, 4.5), (1.2, 0, 6.2), TEAL, roughness=0.5)
    _sphere("Emblem_c", 0.35, (1.2, -0.1, 6.8), (0.95, 0.93, 0.85), emission=0.4)
    for sx in (-0.6, 0.6):
        _sphere(f"Emblem_{sx}", 0.22, (1.2 + sx, -0.1, 6.3), (0.95, 0.93, 0.85), emission=0.4)
    render_preview("banner_pole")
    export_model("banner_pole")


if __name__ == "__main__":
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(RENDERS_DIR, exist_ok=True)
    print("Generating 8 Nexus Hub models...")
    create_welcome_arch()
    create_signpost()
    create_fountain()
    create_bench()
    create_info_kiosk()
    create_lamp_post()
    create_holo_map()
    create_banner_pole()
    print("Done! 8 hub models exported (FBX + GLB) with previews.")
