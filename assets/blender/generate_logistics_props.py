#!/usr/bin/env python3
"""generate_logistics_props.py — the plant's heavy-logistics props, HD.

Four new props that make the Slakkenspoor read like a working integrated
steel plant, all click-inspectable in the web world (PROP_INFO) and two of
them proximity-interactive (weighbridge, slag pot):

  torpedo_ladle_hd.glb  — torpedo car that hauls liquid hot metal
  slag_pot_hd.glb       — slag pot on a stand (the origin of our slib!)
  gantry_crane_hd.glb   — rail-mounted gantry crane
  weighbridge_hd.glb    — truck weighbridge with an operator hut

Same conventions as generate_hd_props.py: realism through geometry density
and industrial colour language, 1 unit = 1 m, origin at ground, +Z up, GLB.

Run:
  /media/knight2/EDS2/apps/blender/current/blender --background \
      --python assets/blender/generate_logistics_props.py
"""
import math
import os

import bpy

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")

_mats = {}


def clear_scene():
    _mats.clear()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def mat(name, color, metallic=0.6, roughness=0.45, emission=0.0):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    _mats[name] = m
    return m


M = {
    "refract": lambda: mat("refractory", (0.35, 0.12, 0.08), 0.1, 0.9),
    "steel": lambda: mat("steel_plate", (0.45, 0.47, 0.50), 0.85, 0.45),
    "dark": lambda: mat("steel_dark", (0.16, 0.17, 0.19), 0.8, 0.55),
    "rust": lambda: mat("rust", (0.42, 0.25, 0.15), 0.4, 0.8),
    "yellow": lambda: mat("safety_yellow", (0.85, 0.65, 0.08), 0.3, 0.6),
    "cab": lambda: mat("cab_grey", (0.55, 0.58, 0.60), 0.5, 0.5),
    "glass": lambda: mat("glass_pane", (0.35, 0.55, 0.65), 0.9, 0.1),
    "slag": lambda: mat("slag_glow", (0.9, 0.35, 0.05), 0.0, 0.8, 6.0),
    "concrete": lambda: mat("concrete", (0.52, 0.52, 0.50), 0.05, 0.9),
}


def add(obj, material):
    obj.data.materials.append(material)
    return obj


def box(x, y, z, sx, sy, sz, material, rz=0.0):
    bpy.ops.mesh.primitive_cube_add(location=(x, y, z))
    o = bpy.context.object
    o.scale = (sx / 2, sy / 2, sz / 2)
    o.rotation_euler[2] = rz
    return add(o, material)


def cyl(x, y, z, r, depth, material, rx=0.0, ry=0.0, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(location=(x, y, z), radius=r,
                                        depth=depth, vertices=verts)
    o = bpy.context.object
    o.rotation_euler[0] = rx
    o.rotation_euler[1] = ry
    return add(o, material)


def export(name):
    path = os.path.join(MODELS_DIR, name)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB",
                              use_selection=True, export_apply=True)
    print(f"[export] {name}: {os.path.getsize(path) // 1024} KB")


def wheels_bogie(x, y, z, mdark):
    """Two-axle rail bogie."""
    box(x, y, z + 0.35, 1.6, 1.4, 0.5, mdark)
    for dy in (-0.45, 0.45):
        for dx in (-0.55, 0.55):
            cyl(x + dx, y + dy, z + 0.35, 0.35, 0.18, mdark, rx=math.pi / 2)


def torpedo_ladle():
    clear_scene()
    ms, md, mr = M["steel"](), M["dark"](), M["refract"]()
    # Torpedo vessel: long horizontal barrel with conical ends + mouth.
    cyl(0, 0, 2.15, 1.5, 7.0, mr, ry=math.pi / 2, verts=28)
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_cone_add(location=(sx * 4.35, 0, 2.15),
                                        radius1=1.5, radius2=0.55, depth=1.8,
                                        vertices=28)
        o = bpy.context.object
        o.rotation_euler[1] = sx * math.pi / 2
        add(o, mr)
    cyl(0, 0, 3.55, 0.55, 0.9, mr)                       # mouth
    for sx in (-1, 1):                                    # riding rings
        cyl(sx * 2.2, 0, 2.15, 1.62, 0.3, ms, ry=math.pi / 2, verts=28)
    for sx in (-1, 1):                                    # end supports
        box(sx * 5.6, 0, 1.35, 1.5, 1.8, 1.3, ms)
        wheels_bogie(sx * 5.6, 0, 0, md)
    box(0, 0, 0.9, 12.6, 0.9, 0.25, ms)                   # spine beam
    export("torpedo_ladle_hd.glb")


def slag_pot():
    clear_scene()
    mr, ms, mrust, mslag = M["refract"](), M["steel"](), M["rust"](), M["slag"]()
    # Pot: truncated cone, wide mouth, on a cradle stand.
    bpy.ops.mesh.primitive_cone_add(location=(0, 0, 2.0), radius1=1.35,
                                    radius2=2.05, depth=2.6, vertices=32)
    add(bpy.context.object, mrust)
    cyl(0, 0, 3.32, 1.85, 0.12, mslag, verts=32)          # glowing slag surface
    cyl(0, 0, 3.28, 2.10, 0.22, ms, verts=32)             # rim ring
    for a in range(2):                                    # trunnions
        sx = -1 if a == 0 else 1
        cyl(sx * 2.25, 0, 2.6, 0.28, 0.9, ms, ry=math.pi / 2)
    for sx in (-1, 1):                                    # cradle stand
        box(sx * 2.25, 0, 1.1, 0.5, 2.4, 2.2, ms)
        box(sx * 2.25, 0, 0.15, 0.9, 3.0, 0.3, ms)
    export("slag_pot_hd.glb")


def gantry_crane():
    clear_scene()
    my, md, mc, mg = M["yellow"](), M["dark"](), M["cab"](), M["glass"]()
    H, SPAN = 9.0, 14.0
    for sx in (-1, 1):                                    # portal legs (A-frames)
        for dy in (-1.6, 1.6):
            box(sx * SPAN / 2, dy, H / 2, 0.7, 0.7, H, my)
        box(sx * SPAN / 2, 0, 1.0, 1.4, 4.6, 0.5, my)     # leg tie + bogies
        wheels_bogie(sx * SPAN / 2, -1.6, 0, md)
        wheels_bogie(sx * SPAN / 2, 1.6, 0, md)
    for dy in (-1.2, 1.2):                                # twin main girders
        box(0, dy, H + 0.55, SPAN + 2.4, 0.9, 1.1, my)
    box(2.0, 0, H + 0.1, 2.2, 2.6, 1.0, my)               # trolley
    cyl(2.0, 0, H - 0.6, 0.45, 0.8, md)                   # hoist drum
    box(2.0, 0, H - 3.4, 0.12, 0.12, 4.6, md)             # hoist rope
    box(2.0, 0, H - 5.9, 1.6, 0.35, 0.5, md)              # lifting beam
    for sx in (-1, 1):
        cyl(2.0 + sx * 0.7, 0, H - 6.4, 0.18, 0.7, md)    # hooks
    box(-SPAN / 2 + 1.1, 2.05, H - 1.4, 2.0, 1.4, 1.6, mc)  # operator cab
    box(-SPAN / 2 + 1.1, 2.55, H - 1.3, 1.6, 0.06, 0.9, mg)
    export("gantry_crane_hd.glb")


def weighbridge():
    clear_scene()
    mcon, ms, md, mc, mg, my = (M["concrete"](), M["steel"](), M["dark"](),
                                M["cab"](), M["glass"](), M["yellow"]())
    box(0, 0, 0.12, 18.0, 3.2, 0.24, ms)                  # deck
    for dx in range(-2, 3):                               # load cells
        for dy in (-1.2, 1.2):
            cyl(dx * 4.0, dy, 0.05, 0.22, 0.1, md)
    box(0, 0, 0.02, 18.6, 3.8, 0.04, mcon)                # pit apron
    for sx in (-1, 1):                                    # approach ramps
        box(sx * 10.4, 0, 0.08, 2.8, 3.2, 0.16, mcon)
    for dx in (-8.5, 8.5):                                # guide rails
        for dy in (-1.7, 1.7):
            box(dx, dy, 0.45, 1.0, 0.12, 0.7, my)
    box(0, 3.6, 1.4, 3.0, 2.4, 2.8, mc)                   # operator hut
    box(0, 2.45, 1.7, 2.2, 0.06, 1.0, mg)                 # window to the deck
    box(0, 3.6, 3.0, 3.4, 2.8, 0.2, md)                   # flat roof
    box(1.9, 2.6, 2.2, 0.5, 0.1, 0.9, md)                 # display mast
    cyl(1.9, 2.6, 3.0, 0.06, 1.4, md)
    export("weighbridge_hd.glb")


if __name__ == "__main__":
    torpedo_ladle()
    slag_pot()
    gantry_crane()
    weighbridge()
    print("[done] 4 logistics props exported")
