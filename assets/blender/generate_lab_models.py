"""
generate_lab_models.py
MOLGANG — 3D models for the Chemistry Lab / Periodic Table zone.

Complements the existing lab pieces (beaker_1L, erlenmeyer_flask, lab_bench)
with 8 new props built around the game's core chemistry theme — atom
collection, molecule building (Chemistry / QChem modules):

1. molecule_model         — ball-and-stick molecule on a stand (the signature MOLGANG prop)
2. bunsen_burner          — burner with an emissive flame
3. test_tube_rack         — wooden rack of colour-filled test tubes
4. fume_hood              — ventilated cabinet with raised sash
5. periodic_table_display — standing chart with a grid of element tiles
6. graduated_cylinder     — tall measuring cylinder with liquid
7. microscope             — lab microscope
8. reagent_shelf          — shelf of coloured reagent bottles

Human-scaled (1 Roblox stud = 0.28 m, a character is ~6 studs). Each model
exports as FBX (Roblox) + GLB (Godot/web target) with a Workbench preview.
Glass parts are rendered before the transparent glass is added, so contents
are visible in the preview (Workbench solid shading ignores alpha).

Run:
  /media/knight2/EDS2/apps/blender/blender-5.2.0-linux-x64/blender \
      --background --python assets/blender/generate_lab_models.py
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


def _bond(name, p0, p1, color, radius=0.12):
    """Cylinder bond between two points (ball-and-stick)."""
    import mathutils
    v0 = mathutils.Vector(p0)
    v1 = mathutils.Vector(p1)
    mid = (v0 + v1) / 2
    vec = v1 - v0
    length = vec.length
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, location=mid)
    obj = bpy.context.active_object
    obj.name = name
    # Align cylinder's local Z to the bond direction.
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = vec.to_track_quat('Z', 'Y')
    add_material(obj, name + "_mat", color, metallic=0.2, roughness=0.4)
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
STEEL = (0.7, 0.72, 0.75)
DARK = (0.12, 0.12, 0.14)
WOOD = (0.55, 0.36, 0.20)
GLASS = (0.75, 0.85, 0.88)
BRASS = (0.72, 0.58, 0.25)
# CPK-ish atom colours
C_ATOM = (0.15, 0.15, 0.17)   # carbon = dark
H_ATOM = (0.92, 0.92, 0.95)   # hydrogen = white
O_ATOM = (0.85, 0.15, 0.15)   # oxygen = red
N_ATOM = (0.20, 0.35, 0.85)   # nitrogen = blue


# 1. Molecule model — tetrahedral ball-and-stick (methane CH4 style) on a stand.
def create_molecule():
    clear_scene()
    # Stand
    _cyl("MolBase", 1.6, 0.3, (0, 0, 0.15), DARK, roughness=0.5)
    _cyl("MolRod", 0.15, 2.0, (0, 0, 1.2), STEEL, metallic=0.7, roughness=0.3)
    center = (0, 0, 3.0)
    # Tetrahedral H positions around the carbon.
    r = 1.6
    tetra = [(1, 1, 1), (1, -1, -1), (-1, 1, -1), (-1, -1, 1)]
    for i, (dx, dy, dz) in enumerate(tetra):
        norm = math.sqrt(3)
        pos = (center[0] + dx / norm * r, center[1] + dy / norm * r, center[2] + dz / norm * r)
        _bond(f"Bond_{i}", center, pos, STEEL)
        _sphere(f"H_{i}", 0.55, pos, H_ATOM, roughness=0.3)
    _sphere("C_center", 0.9, center, C_ATOM, roughness=0.3)
    render_preview("molecule_model")
    export_model("molecule_model")


# 2. Bunsen burner — base, barrel, emissive flame.
def create_bunsen():
    clear_scene()
    _cyl("BurnerBase", 0.9, 0.25, (0, 0, 0.12), DARK, metallic=0.5, roughness=0.4)
    _cyl("BurnerBarrel", 0.22, 2.0, (0, 0, 1.1), STEEL, metallic=0.8, roughness=0.25)
    _cyl("GasInlet", 0.1, 0.8, (0.5, 0, 0.3), STEEL, metallic=0.7, roughness=0.3)
    # Flame (emissive cones)
    bpy.ops.mesh.primitive_cone_add(radius1=0.28, radius2=0.0, depth=1.4, location=(0, 0, 2.8))
    flame = bpy.context.active_object
    flame.name = "Flame"
    add_material(flame, "FlameBlue", (0.3, 0.5, 1.0), emission=4.0)
    bpy.ops.mesh.primitive_cone_add(radius1=0.14, radius2=0.0, depth=0.8, location=(0, 0, 2.7))
    inner = bpy.context.active_object
    inner.name = "FlameInner"
    add_material(inner, "FlameCore", (0.7, 0.85, 1.0), emission=5.0)
    render_preview("bunsen_burner")
    export_model("bunsen_burner")


# 3. Test tube rack — wooden rack of colour-filled tubes.
def create_test_tube_rack():
    clear_scene()
    _box("RackBase", (4.5, 1.4, 0.3), (0, 0, 0.15), WOOD, roughness=0.6)
    _box("RackTop", (4.5, 1.4, 0.25), (0, 0, 1.8), WOOD, roughness=0.6)
    for side in (-0.55, 0.55):
        for end in (-2.0, 2.0):
            _cyl(f"Post_{side}_{end}", 0.1, 1.7, (end, side, 0.95), WOOD, roughness=0.6, vertices=8)
    liquids = [(0.85, 0.2, 0.2), (0.2, 0.7, 0.3), (0.2, 0.4, 0.85), (0.9, 0.8, 0.2), (0.7, 0.3, 0.8)]
    # Liquids first (rendered), glass tubes added after.
    for i, col in enumerate(liquids):
        x = (i - 2) * 0.85
        _cyl(f"Liquid_{i}", 0.22, 1.0, (x, 0, 1.0), col, roughness=0.3, vertices=12)
    render_preview("test_tube_rack")
    for i in range(5):
        x = (i - 2) * 0.85
        _cyl(f"Tube_{i}", 0.28, 2.2, (x, 0, 1.6), GLASS, roughness=0.1, alpha=0.3, vertices=12)
        _sphere(f"TubeBottom_{i}", 0.28, (x, 0, 0.55), GLASS, roughness=0.1, alpha=0.3)
    export_model("test_tube_rack")


# 4. Fume hood — ventilated cabinet with a raised glass sash.
def create_fume_hood():
    clear_scene()
    body = (0.85, 0.87, 0.9)
    _box("HoodBack", (5.0, 0.2, 6.0), (0, 1.4, 3.5), body, roughness=0.4)
    for sx in (-2.4, 2.4):
        _box(f"HoodSide_{sx}", (0.2, 3.0, 6.0), (sx, 0, 3.5), body, roughness=0.4)
    _box("HoodTop", (5.0, 3.0, 0.4), (0, 0, 6.7), body, roughness=0.4)
    _box("HoodDuct", (1.2, 1.2, 1.4), (0, 0.5, 7.6), STEEL, metallic=0.6, roughness=0.35)
    _box("HoodWorktop", (5.0, 3.0, 0.35), (0, 0, 2.7), DARK, roughness=0.5)
    _box("HoodBase", (5.0, 3.0, 2.6), (0, 0, 1.3), body, roughness=0.45)
    # Raised sash (glass, up position) + frame
    _box("SashFrame", (5.0, 0.15, 0.3), (0, -1.35, 6.2), STEEL, metallic=0.6)
    render_preview("fume_hood")
    _box("Sash", (4.6, 0.08, 1.6), (0, -1.35, 5.4), GLASS, roughness=0.05, alpha=0.3)
    export_model("fume_hood")


# 5. Periodic table display — standing chart with a grid of element tiles.
def create_periodic_display():
    clear_scene()
    _box("ChartBoard", (7.0, 0.2, 4.0), (0, 0, 4.0), (0.1, 0.1, 0.12), roughness=0.6)
    _box("ChartHeader", (7.2, 0.25, 0.7), (0, 0, 6.2), (0.15, 0.45, 0.6), roughness=0.4)
    for side in (-3.0, 3.0):
        _cyl(f"ChartPost_{side}", 0.15, 4.2, (side, 0, 2.0), STEEL, metallic=0.6, roughness=0.4)
    _box("ChartFoot", (7.0, 1.6, 0.3), (0, 0, 0.15), DARK, roughness=0.6)
    # Grid of element tiles (colour bands like a real periodic table).
    tile_cols = [
        (0.85, 0.4, 0.3), (0.4, 0.7, 0.85), (0.5, 0.8, 0.4),
        (0.9, 0.8, 0.35), (0.75, 0.5, 0.85), (0.85, 0.6, 0.4),
    ]
    cols, rows = 9, 5
    tw = 0.62
    for r in range(rows):
        for c in range(cols):
            # sparse like a real table: skip some upper-row gaps
            if r == 0 and 0 < c < 8:
                continue
            x = (c - (cols - 1) / 2) * (tw + 0.08)
            z = 5.0 - r * (tw + 0.08)
            col = tile_cols[(r + c) % len(tile_cols)]
            _box(f"Tile_{r}_{c}", (tw, 0.08, tw), (x, -0.14, z), col, emission=0.25)
    render_preview("periodic_table_display")
    export_model("periodic_table_display")


# 6. Graduated cylinder — tall measuring cylinder with liquid.
def create_graduated_cylinder():
    clear_scene()
    _cyl("CylFoot", 0.9, 0.25, (0, 0, 0.12), DARK, roughness=0.4)
    _cyl("CylLiquid", 0.4, 2.2, (0, 0, 1.6), (0.2, 0.55, 0.8), roughness=0.3)
    # Graduation marks — thin ring bands up the tube, the defining feature
    # that distinguishes a graduated cylinder from a plain tube. Rendered
    # before the glass so they read in the preview.
    for i in range(7):
        z = 0.8 + i * 0.45
        bpy.ops.mesh.primitive_torus_add(major_radius=0.49, minor_radius=0.025, location=(0, 0, z))
        ring = bpy.context.active_object
        ring.name = f"Grad_{i}"
        add_material(ring, f"Grad_{i}_mat", (0.1, 0.1, 0.12), roughness=0.5)
    render_preview("graduated_cylinder")
    _cyl("CylGlass", 0.48, 3.6, (0, 0, 2.0), GLASS, roughness=0.08, alpha=0.28)
    _cyl("CylRim", 0.52, 0.15, (0, 0, 3.85), GLASS, roughness=0.08, alpha=0.4)
    export_model("graduated_cylinder")


# 7. Microscope — base, arm, tube, eyepiece, stage, objective.
def create_microscope():
    clear_scene()
    _cyl("ScopeBase", 1.3, 0.4, (0, 0, 0.2), DARK, metallic=0.4, roughness=0.4)
    _box("ScopeArm", (0.5, 0.5, 3.4), (0.6, 0, 2.0), STEEL, metallic=0.7, roughness=0.3)
    _cyl("ScopeTube", 0.32, 1.8, (0, 0, 3.6), (0.25, 0.25, 0.28), metallic=0.6, roughness=0.3)
    # Eyepiece (angled)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.9, location=(-0.25, 0, 4.5))
    eye = bpy.context.active_object
    eye.name = "Eyepiece"
    eye.rotation_euler = (0, math.radians(35), 0)
    add_material(eye, "EyeMat", DARK, metallic=0.5, roughness=0.3)
    _box("ScopeStage", (1.4, 1.4, 0.2), (0, 0, 2.2), STEEL, metallic=0.6, roughness=0.35)
    _box("Slide", (0.6, 0.6, 0.05), (0, 0, 2.32), GLASS, roughness=0.1, alpha=0.4)
    _cyl("Objective", 0.14, 0.6, (0, 0, 2.75), BRASS, metallic=0.8, roughness=0.25)
    _cyl("FocusKnob", 0.35, 0.25, (0.85, 0.55, 1.4), DARK, metallic=0.4, roughness=0.4)
    render_preview("microscope")
    export_model("microscope")


# 8. Reagent shelf — shelf unit with rows of coloured bottles.
def create_reagent_shelf():
    clear_scene()
    _box("ShelfBack", (5.0, 0.15, 5.0), (0, 0.9, 2.5), WOOD, roughness=0.6)
    for sx in (-2.4, 2.4):
        _box(f"ShelfSide_{sx}", (0.15, 1.8, 5.0), (sx, 0, 2.5), WOOD, roughness=0.6)
    bottle_cols = [(0.8, 0.25, 0.25), (0.3, 0.6, 0.85), (0.35, 0.75, 0.4),
                   (0.9, 0.75, 0.3), (0.7, 0.35, 0.8), (0.85, 0.5, 0.3)]
    for s in range(3):
        z = 0.6 + s * 1.7
        _box(f"Shelf_{s}", (5.0, 1.7, 0.15), (0, 0, z), WOOD, roughness=0.55)
        for b in range(6):
            x = (b - 2.5) * 0.78
            col = bottle_cols[(s + b) % len(bottle_cols)]
            _cyl(f"Bottle_{s}_{b}", 0.28, 1.2, (x, 0, z + 0.75), col, roughness=0.35, vertices=12)
            _cyl(f"Cap_{s}_{b}", 0.14, 0.25, (x, 0, z + 1.45), DARK, roughness=0.5, vertices=10)
    render_preview("reagent_shelf")
    export_model("reagent_shelf")


if __name__ == "__main__":
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(RENDERS_DIR, exist_ok=True)
    print("Generating 8 Chemistry Lab models...")
    create_molecule()
    create_bunsen()
    create_test_tube_rack()
    create_fume_hood()
    create_periodic_display()
    create_graduated_cylinder()
    create_microscope()
    create_reagent_shelf()
    print("Done! 8 lab models exported (FBX + GLB) with previews.")
