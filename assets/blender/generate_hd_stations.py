#!/usr/bin/env python3
"""
generate_hd_stations.py — high-detail Slakkenspoor station models (pilot).

Realism comes from geometry density here (greebles: flanges, bolts, nozzles,
ladder, handrail, jacket ribs) — the web renderer's HDRI/PBR pipeline does the
rest. Pilot: the leaching reactor. Same conventions as the other generators
(1 unit = 1 m, origin at ground, +Z up), exported as GLB into assets/models/.

Run:
  <blender> --background --python assets/blender/generate_hd_stations.py
"""
import math
import os

import bpy

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


_mats = {}


def mat(name, color, metallic=0.6, roughness=0.45):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    _mats[name] = m
    return m


def _obj(o, material):
    o.data.materials.append(material)
    return o


def cyl(r, d, loc, material, verts=32, rot=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d, location=loc)
    o = bpy.context.active_object
    if rot:
        o.rotation_euler = rot
    return _obj(o, material)


def box(size, loc, material, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.scale = size
    if rot:
        o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True)
    return _obj(o, material)


def sphere(r, loc, material, scale_z=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=32, ring_count=16)
    o = bpy.context.active_object
    o.scale = (1, 1, scale_z)
    bpy.ops.object.transform_apply(scale=True)
    return _obj(o, material)


def torus(r, tube, loc, material, rot=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=tube, location=loc,
                                     major_segments=40, minor_segments=10)
    o = bpy.context.active_object
    if rot:
        o.rotation_euler = rot
    return _obj(o, material)


def flange(r, loc, material, axis="Z"):
    rot = {"Z": None, "X": (0, math.pi / 2, 0), "Y": (math.pi / 2, 0, 0)}[axis]
    f = cyl(r, 0.06, loc, material, rot=rot)
    # bolt ring
    for k in range(8):
        a = k * math.pi / 4
        off = [r * 0.75 * math.cos(a), r * 0.75 * math.sin(a), 0]
        if axis == "X":
            bl = (loc[0], loc[1] + off[0], loc[2] + off[1])
            cyl(0.02, 0.09, bl, material, verts=8, rot=(0, math.pi / 2, 0))
        else:
            cyl(0.02, 0.09, (loc[0] + off[0], loc[1] + off[1], loc[2]), material, verts=8)
    return f


def build_leaching_tank_hd():
    clear_scene()
    steel = mat("paint_steel", (0.16, 0.35, 0.38), 0.75, 0.4)     # teal painted vessel
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    pipe_m = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    yellow = mat("handrail_yellow", (0.8, 0.62, 0.08), 0.4, 0.55)

    # vessel: shell + torispherical heads + heating jacket + ribs
    cyl(1.5, 3.0, (0, 0, 2.6), steel, verts=48)
    sphere(1.5, (0, 0, 4.1), steel, scale_z=0.45)
    sphere(1.5, (0, 0, 1.1), steel, scale_z=0.45)
    cyl(1.62, 1.4, (0, 0, 2.0), dark, verts=48)                    # jacket band
    for z in (1.5, 2.5, 3.5):
        torus(1.52, 0.035, (0, 0, z), dark)                        # stiffening ribs

    # legs (4x) with foot pads
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        x, y = 1.25 * math.cos(a), 1.25 * math.sin(a)
        box((0.16, 0.16, 1.3), (x, y, 0.65), dark)
        box((0.34, 0.34, 0.06), (x, y, 0.03), dark)

    # agitator: motor + gearbox + shaft housing on top
    cyl(0.28, 0.7, (0, 0, 4.95), safety, verts=24)
    box((0.5, 0.4, 0.3), (0, 0, 4.5), dark)
    cyl(0.1, 0.5, (0, 0, 4.3), pipe_m, verts=16)

    # manway (side) + top nozzles with flanges
    cyl(0.4, 0.5, (1.45, 0, 3.2), steel, verts=24, rot=(0, math.pi / 2, 0))
    flange(0.5, (1.75, 0, 3.2), dark, axis="X")
    for dx, dy in ((-0.7, 0.5), (0.6, 0.6), (0.1, -0.8)):
        cyl(0.11, 0.5, (dx, dy, 4.45), pipe_m, verts=16)
        flange(0.18, (dx, dy, 4.72), dark)

    # feed pipe with elbow into the top; bottom outlet + valve handwheel
    cyl(0.13, 2.6, (-2.2, 0, 3.4), pipe_m, verts=16, rot=(0, math.pi / 2, 0))
    sphere(0.16, (-0.9, 0, 3.4), pipe_m)
    cyl(0.13, 1.0, (-0.9, 0, 3.95), pipe_m, verts=16)
    flange(0.2, (-2.9, 0, 3.4), dark, axis="X")
    cyl(0.12, 0.9, (0, 0, 0.45), pipe_m, verts=16)
    torus(0.16, 0.03, (0.0, 0.28, 0.45), yellow, rot=(math.pi / 2, 0, 0))   # handwheel

    # ladder + small top platform with handrail
    for s in (-0.18, 0.18):
        cyl(0.03, 3.9, (1.62 + 0.0, s, 2.0), yellow, verts=10)
    for z in [0.4 + 0.3 * i for i in range(12)]:
        cyl(0.025, 0.36, (1.62, 0, z), yellow, verts=8, rot=(math.pi / 2, 0, 0))
    box((1.0, 0.9, 0.05), (1.4, 0, 4.05), dark)
    for k in range(3):
        cyl(0.025, 0.9, (1.0 + 0.45 * k, 0.44, 4.5), yellow, verts=8)
        cyl(0.025, 0.9, (1.0 + 0.45 * k, -0.44, 4.5), yellow, verts=8)
    cyl(0.03, 1.0, (1.4, 0.44, 4.95), yellow, verts=8, rot=(0, math.pi / 2, 0))
    cyl(0.03, 1.0, (1.4, -0.44, 4.95), yellow, verts=8, rot=(0, math.pi / 2, 0))

    # export
    out = os.path.abspath(os.path.join(MODELS_DIR, "leaching_tank_hd.glb"))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
    print(f"Exported: {out}")


if __name__ == "__main__":
    build_leaching_tank_hd()
