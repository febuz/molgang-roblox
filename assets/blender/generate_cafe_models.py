"""
generate_cafe_models.py
MOLGANG — 3D models for the Bubble Tea Café zone (Factory Café).

Complements the BubbleTeaBar server system (drinks, seasonal drinks,
purchase achievements): the zone previously had only boba_tea_cup.fbx and
no furniture/environment. This adds a coherent 8-piece café set.

Models (human-scaled; 1 Roblox stud = 0.28 m, a character is ~6 studs):
1. cafe_counter          — service bar the player orders drinks at
2. boba_brewing_station  — three tea dispensers on a stand
3. cafe_bar_stool        — round seat on chrome legs
4. cafe_bistro_table     — round pedestal table
5. cafe_menu_board       — standing menu sign
6. tapioca_pearl_jar     — glass jar of dark boba pearls
7. drink_display_fridge  — glass-front drinks cooler
8. cafe_planter          — potted plant for ambiance

Exports each as FBX (Roblox) + GLB (Godot/web target), and renders a cheap
Workbench preview PNG (no GPU) so the geometry/scale can be reviewed.

Run:
  /media/knight2/EDS2/apps/blender/blender-5.2.0-linux-x64/blender \
      --background --python assets/blender/generate_cafe_models.py
"""

import bpy
import os
import math

MODELS_DIR = "/home/knight2/molgang-roblox/assets/models"
RENDERS_DIR = "/home/knight2/molgang-roblox/assets/renders"


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    # Also purge orphaned meshes/materials so repeated runs stay clean.
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
        # Transmission input was renamed across versions; set it if present.
        for key in ("Transmission Weight", "Transmission"):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = 1.0 - alpha
                break
        try:
            mat.blend_method = 'BLEND'
        except (AttributeError, TypeError):
            pass  # EEVEE Next / 5.x may not expose blend_method
    # Workbench "Material" shading + Studio viewport read from diffuse_color,
    # not the Principled base-color node — set it so previews show the palette.
    mat.diffuse_color = (*color, alpha)
    obj.data.materials.append(mat)


def _box(name, size, location, color, **mat):
    """Axis-aligned box via a unit cube scaled to `size` (x,y,z in studs)."""
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


def render_preview(name):
    """Cheap Workbench render (CPU, no GPU) of the whole scene, auto-framed."""
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.render.resolution_x = 480
    scene.render.resolution_y = 480
    scene.render.film_transparent = False

    # Combined bounding box of all mesh objects.
    meshes = [o for o in scene.objects if o.type == 'MESH']
    if not meshes:
        return
    import mathutils
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

    # Target empty for the camera to track.
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

    # Remove camera + target so they aren't exported with the model.
    bpy.ops.object.select_all(action='DESELECT')
    cam.select_set(True)
    target.select_set(True)
    bpy.ops.object.delete()


def export_model(name):
    bpy.ops.object.select_all(action='SELECT')
    fbx = os.path.join(MODELS_DIR, f"{name}.fbx")
    glb = os.path.join(MODELS_DIR, f"{name}.glb")
    bpy.ops.export_scene.fbx(filepath=fbx, use_selection=True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True)
    print(f"Exported: {name}.fbx + {name}.glb")


# Palette
WOOD = (0.45, 0.28, 0.15)
WOOD_LIGHT = (0.62, 0.44, 0.26)
CHROME = (0.8, 0.82, 0.85)
CREAM = (0.93, 0.88, 0.78)
TEAL = (0.10, 0.55, 0.52)
PEARL_DARK = (0.10, 0.07, 0.06)
GLASS = (0.75, 0.85, 0.88)
LEAF = (0.20, 0.55, 0.22)
TERRACOTTA = (0.72, 0.38, 0.24)


# 1. Café counter — the order bar (BAR_POSITION in BubbleTeaBar).
def create_counter():
    clear_scene()
    _box("CounterBody", (8, 2.4, 3.4), (0, 0, 1.7), TEAL, roughness=0.6)
    _box("CounterTop", (8.6, 3.0, 0.3), (0, 0, 3.55), WOOD_LIGHT, roughness=0.4)
    _box("CounterKick", (7.6, 2.0, 0.4), (0, -0.3, 0.2), (0.06, 0.06, 0.07), roughness=0.7)
    # Front trim panels
    for x in (-2.6, 0, 2.6):
        _box(f"Panel_{x}", (2.2, 0.1, 2.4), (x, -1.25, 1.7), CREAM, roughness=0.5)
    render_preview("cafe_counter")
    export_model("cafe_counter")


# 2. Boba brewing station — three dispensers on a stand.
def create_brewing_station():
    clear_scene()
    _box("StationBase", (4.5, 2.0, 0.4), (0, 0, 0.2), CHROME, metallic=0.8, roughness=0.3)
    _box("StationBack", (4.5, 0.3, 3.2), (0, 0.85, 1.8), (0.2, 0.22, 0.25), metallic=0.6)
    tea_colors = [(0.35, 0.20, 0.10), (0.55, 0.42, 0.20), (0.20, 0.45, 0.30)]
    for i, tc in enumerate(tea_colors):
        x = (i - 1) * 1.5
        _cyl(f"Tea_{i}", 0.48, 1.6, (x, 0, 1.3), tc, roughness=0.3)
        _cyl(f"Tap_{i}", 0.08, 0.5, (x, -0.55, 0.6), CHROME, metallic=0.9, roughness=0.2)
    # Render before the glass dispensers so the tea colours are visible.
    render_preview("boba_brewing_station")
    for i in range(3):
        x = (i - 1) * 1.5
        _cyl(f"Dispenser_{i}", 0.55, 2.2, (x, 0, 1.5), GLASS, roughness=0.15, alpha=0.3)
    export_model("boba_brewing_station")


# 3. Café bar stool — seat height ~2.7 studs.
def create_bar_stool():
    clear_scene()
    _cyl("StoolSeat", 1.1, 0.35, (0, 0, 2.7), TERRACOTTA, roughness=0.5)
    _cyl("StoolCushion", 1.0, 0.2, (0, 0, 2.95), (0.85, 0.5, 0.35), roughness=0.6)
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        x, y = math.cos(ang) * 0.8, math.sin(ang) * 0.8
        leg = _cyl(f"Leg_{a}", 0.08, 2.6, (x, y, 1.3), CHROME, metallic=0.9, roughness=0.2)
        leg.rotation_euler = (math.radians(6) * math.sin(ang), math.radians(6) * -math.cos(ang), 0)
    _cyl("Footrest", 0.85, 0.06, (0, 0, 1.0), CHROME, metallic=0.9, roughness=0.2)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.85, minor_radius=0.06, location=(0, 0, 1.0))
    ring = bpy.context.active_object
    add_material(ring, "FootRing", CHROME, metallic=0.9, roughness=0.2)
    render_preview("cafe_bar_stool")
    export_model("cafe_bar_stool")


# 4. Café bistro table — round pedestal table ~2.7 studs tall.
def create_bistro_table():
    clear_scene()
    _cyl("TableTop", 2.4, 0.25, (0, 0, 2.6), WOOD_LIGHT, roughness=0.4)
    _cyl("TableEdge", 2.5, 0.1, (0, 0, 2.45), WOOD, roughness=0.5)
    _cyl("TableColumn", 0.35, 2.4, (0, 0, 1.3), CHROME, metallic=0.85, roughness=0.25)
    _cyl("TableFoot", 1.6, 0.2, (0, 0, 0.1), (0.2, 0.2, 0.22), metallic=0.6, roughness=0.4)
    render_preview("cafe_bistro_table")
    export_model("cafe_bistro_table")


# 5. Café menu board — standing sign ~5 studs tall.
def create_menu_board():
    clear_scene()
    _box("BoardPanel", (4.0, 0.2, 3.0), (0, 0, 3.4), (0.12, 0.12, 0.14), roughness=0.6)
    _box("BoardHeader", (4.2, 0.25, 0.8), (0, 0, 5.1), TEAL, roughness=0.4)
    # Menu "text" rows (thin cream bars)
    for i in range(4):
        _box(f"MenuRow_{i}", (3.0, 0.05, 0.18), (-0.3, -0.12, 4.3 - i * 0.6), CREAM, emission=0.3)
    for side in (-1.6, 1.6):
        _cyl(f"Post_{side}", 0.12, 3.8, (side, 0, 1.9), WOOD, roughness=0.5)
    _box("BoardBase", (4.0, 1.4, 0.25), (0, 0, 0.12), (0.15, 0.1, 0.08), roughness=0.6)
    render_preview("cafe_menu_board")
    export_model("cafe_menu_board")


# 6. Tapioca pearl jar — glass jar of boba pearls.
def create_pearl_jar():
    clear_scene()
    # Pearls fill the jar; base + lid framing it. Rendered before the glass
    # wall so the boba is visible in the preview (glass is transparent
    # in-engine but opaque under Workbench solid shading).
    _cyl("JarPearls", 0.6, 1.3, (0, 0, 0.85), PEARL_DARK, roughness=0.3)
    _cyl("JarBase", 0.78, 0.14, (0, 0, 0.12), (0.6, 0.65, 0.68), roughness=0.3)
    _cyl("JarLid", 0.8, 0.22, (0, 0, 1.6), (0.75, 0.6, 0.35), metallic=0.4, roughness=0.4)
    render_preview("tapioca_pearl_jar")
    _cyl("JarBody", 0.7, 1.4, (0, 0, 0.85), GLASS, roughness=0.1, alpha=0.3)
    export_model("tapioca_pearl_jar")


# 7. Drink display fridge — OPEN-front cooler so the drinks are visible
#    (a solid box hides the whole point). Framed cabinet: back + sides +
#    top/bottom + corner posts, aperture open, thin transparent glass pane.
def create_display_fridge():
    clear_scene()
    body_col = (0.85, 0.87, 0.9)
    _box("FridgeBack", (3.6, 0.2, 6.0), (0, 1.2, 3.0), body_col, metallic=0.5, roughness=0.35)
    for sx in (-1.7, 1.7):
        _box(f"FridgeSide_{sx}", (0.2, 2.6, 6.0), (sx, 0, 3.0), body_col, metallic=0.5, roughness=0.35)
    _box("FridgeTop", (3.6, 2.6, 0.25), (0, 0, 5.9), body_col, metallic=0.5, roughness=0.35)
    _box("FridgeBottom", (3.6, 2.6, 0.25), (0, 0, 0.12), (0.3, 0.3, 0.33), metallic=0.5, roughness=0.4)
    # Front door frame (thin posts around the open aperture)
    for sx in (-1.6, 1.6):
        _box(f"DoorPost_{sx}", (0.18, 0.18, 5.5), (sx, -1.25, 3.0), (0.2, 0.2, 0.22), metallic=0.6)
    _box("DoorTop", (3.4, 0.18, 0.18), (0, -1.25, 5.6), (0.2, 0.2, 0.22), metallic=0.6)
    _box("FridgeHeader", (3.8, 2.7, 0.9), (0, 0, 6.45), TEAL, roughness=0.4)
    # Shelves with drink bottles — now visible through the open front.
    drink_colors = [(0.3, 0.7, 0.4), (0.7, 0.5, 0.2), (0.6, 0.3, 0.6), (0.9, 0.6, 0.2)]
    for s in range(3):
        z = 1.2 + s * 1.5
        _box(f"Shelf_{s}", (3.0, 2.2, 0.1), (0, 0.1, z), (0.7, 0.72, 0.75), metallic=0.4)
        for b in range(4):
            x = (b - 1.5) * 0.7
            _cyl(f"Bottle_{s}_{b}", 0.22, 1.0, (x, 0.1, z + 0.6), drink_colors[b], roughness=0.3, vertices=12)
    # Render BEFORE adding the glass pane — Workbench solid shading ignores
    # alpha, so a pane in the render would re-occlude the drinks. The
    # exported model still includes it (transparent in-engine).
    render_preview("drink_display_fridge")
    _box("FridgeGlass", (3.2, 0.06, 5.2), (0, -1.28, 3.1), GLASS, roughness=0.05, alpha=0.25)
    export_model("drink_display_fridge")


# 8. Café planter — potted plant for ambiance.
def create_planter():
    clear_scene()
    # Tapered pot (cone frustum)
    bpy.ops.mesh.primitive_cone_add(radius1=1.0, radius2=1.3, depth=1.6, location=(0, 0, 0.8))
    pot = bpy.context.active_object
    pot.name = "PlanterPot"
    add_material(pot, "PotMat", TERRACOTTA, roughness=0.6)
    _cyl("Soil", 1.2, 0.2, (0, 0, 1.5), (0.15, 0.1, 0.07), roughness=0.9)
    # Foliage clumps
    for i in range(5):
        ang = i * 2 * math.pi / 5
        x, y = math.cos(ang) * 0.5, math.sin(ang) * 0.5
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.7, subdivisions=2, location=(x, y, 2.2 + (i % 2) * 0.4))
        leaf = bpy.context.active_object
        add_material(leaf, f"Leaf_{i}", LEAF, roughness=0.7)
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.8, subdivisions=2, location=(0, 0, 2.9))
    top = bpy.context.active_object
    add_material(top, "LeafTop", (0.25, 0.62, 0.28), roughness=0.7)
    render_preview("cafe_planter")
    export_model("cafe_planter")


if __name__ == "__main__":
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(RENDERS_DIR, exist_ok=True)
    print("Generating 8 Bubble Tea Café models...")
    create_counter()
    create_brewing_station()
    create_bar_stool()
    create_bistro_table()
    create_menu_board()
    create_pearl_jar()
    create_display_fridge()
    create_planter()
    print("Done! 8 café models exported (FBX + GLB) with previews.")
