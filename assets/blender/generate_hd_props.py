#!/usr/bin/env python3
"""
generate_hd_props.py — high-detail plant props & interactive stations.

Same recipe as generate_hd_stations.py: realism through geometry density
(flanges, bolts, handrails, ladders, correct industrial colour language) and
the web renderer's HDRI/PBR pipeline. Three existing landmarks get HD
replacements (storage silo, slag ladle, distillation column) and six new
props are introduced that belong on a real hydrometallurgical plant — three
of them interactive in the web world (operator console, safety station,
XRF sample station). Gas cylinders follow the EN 1089-3 shoulder colours.

Conventions: 1 unit = 1 m, origin at ground, +Z up, exported as GLB.

Run:
  <blender> --background --python assets/blender/generate_hd_props.py
"""
import math
import os

import bpy

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")

_mats = {}


def clear_scene():
    _mats.clear()      # cached Material refs die with the purge below
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


def _obj(o, material):
    o.data.materials.append(material)
    return o


def cone(r1, r2, d, loc, material, verts=32, rot=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=d, location=loc)
    o = bpy.context.active_object
    if rot:
        o.rotation_euler = rot
    return _obj(o, material)


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
    for k in range(8):
        a = k * math.pi / 4
        off = [r * 0.75 * math.cos(a), r * 0.75 * math.sin(a), 0]
        if axis == "X":
            bl = (loc[0], loc[1] + off[0], loc[2] + off[1])
            cyl(0.02, 0.09, bl, material, verts=8, rot=(0, math.pi / 2, 0))
        else:
            cyl(0.02, 0.09, (loc[0] + off[0], loc[1] + off[1], loc[2]), material, verts=8)
    return f


def ladder(x, y, z0, z1, material, cage_from=None):
    """Vertical ladder with rungs; optional safety cage above cage_from."""
    for sy in (-0.22, 0.22):
        box((0.05, 0.05, z1 - z0), (x, y + sy, (z0 + z1) / 2), material)
    z = z0 + 0.15
    while z < z1:
        cyl(0.02, 0.44, (x, y, z), material, verts=8, rot=(math.pi / 2, 0, 0))
        z += 0.3
    if cage_from is not None:
        zc = cage_from
        while zc < z1 - 0.3:
            torus(0.42, 0.025, (x, y, zc), material)
            zc += 0.7


def handrail_ring(cx, cy, r, z, material, posts=10):
    torus(r, 0.03, (cx, cy, z), material)
    torus(r, 0.025, (cx, cy, z - 0.5), material)
    for k in range(posts):
        a = k * 2 * math.pi / posts
        cyl(0.03, 1.05, (cx + r * math.cos(a), cy + r * math.sin(a), z - 0.5), material, verts=8)


def export_glb(name):
    out = os.path.abspath(os.path.join(MODELS_DIR, f"{name}.glb"))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
    print(f"Exported: {out}")


# ---------------------------------------------------------------- upgrades

def build_storage_silo_hd():
    clear_scene()
    shell = mat("silo_shell", (0.62, 0.64, 0.68), 0.8, 0.35)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    yellow = mat("safety_yellow", (0.85, 0.68, 0.10), 0.3, 0.6)
    R, H = 1.9, 9.0                                   # body radius / roof height
    for k in range(4):                                # legs
        a = k * math.pi / 2 + math.pi / 4
        cyl(0.12, 3.2, (R * 0.8 * math.cos(a), R * 0.8 * math.sin(a), 1.6), dark, verts=12)
        box((0.4, 0.4, 0.05), (R * 0.8 * math.cos(a), R * 0.8 * math.sin(a), 0.03), dark)
    cone(0.3, R, 2.2, (0, 0, 3.0), shell)             # discharge hopper
    cyl(0.15, 1.2, (0, 0, 1.4), dark, verts=12)       # discharge pipe + valve
    sphere(0.22, (0, 0, 1.0), yellow)
    cyl(R, H - 4.6, (0, 0, 4.1 + (H - 4.6) / 2), shell, verts=48)   # body
    for z in (4.6, 6.2, 7.8):                         # weld seams
        torus(R + 0.01, 0.02, (0, 0, z), dark)
    sphere(R, (0, 0, H - 0.4), shell, scale_z=0.45)   # dome roof
    box((0.6, 0.6, 0.25), (0, 0, H + 0.42), dark)     # roof manway
    handrail_ring(0, 0, R * 0.8, H + 0.6, dark, posts=10)
    ladder(R + 0.28, 0, 0.4, H + 0.3, dark, cage_from=3.0)
    box((0.9, 0.08, 0.5), (0, -R - 0.05, 2.2), yellow)  # level indicator plate
    export_glb("storage_silo_hd")


def build_slag_ladle_hd():
    clear_scene()
    steel = mat("ladle_steel", (0.16, 0.16, 0.18), 0.85, 0.55)
    worn = mat("worn_steel", (0.30, 0.24, 0.20), 0.7, 0.7)
    slag = mat("molten_slag", (1.0, 0.42, 0.08), 0.0, 0.6, emission=4.0)
    cone(1.15, 1.65, 2.2, (0, 0, 1.35), steel, verts=40)   # tapered bowl
    torus(1.68, 0.09, (0, 0, 2.45), worn)                  # reinforced rim
    torus(1.35, 0.07, (0, 0, 0.9), worn)                   # lower stiffener band
    cyl(1.5, 0.12, (0, 0, 2.4), slag, verts=40)            # glowing slag surface
    for s in (-1, 1):                                      # trunnion pins + blocks
        box((0.5, 0.55, 0.5), (s * 1.75, 0, 1.7), steel)
        cyl(0.16, 0.5, (s * 2.05, 0, 1.7), worn, verts=16, rot=(0, math.pi / 2, 0))
    box((0.5, 0.3, 0.2), (0, 1.65, 2.3), worn)             # pouring lip
    cyl(1.3, 0.25, (0, 0, 0.13), steel, verts=40)          # base plate
    export_glb("slag_ladle_hd")


def build_distillation_column_hd():
    clear_scene()
    shell = mat("column_shell", (0.55, 0.58, 0.62), 0.8, 0.35)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    pipe = mat("pipe_steel", (0.35, 0.38, 0.42), 0.85, 0.4)
    H, R = 16.0, 1.1
    cyl(R + 0.5, 1.6, (0, 0, 0.8), dark, verts=48)         # base skirt
    cyl(R, H - 2.4, (0, 0, 1.6 + (H - 2.4) / 2), shell, verts=48)
    sphere(R, (0, 0, H - 0.8), shell, scale_z=0.6)         # top head
    for i in range(6):                                     # tray flange rings
        flange(R + 0.14, (0, 0, 3.2 + i * 2.0), dark)
    for z, r in ((5.2, R + 0.9), (10.2, R + 0.9)):         # platforms + rails
        cyl(r, 0.08, (0, 0, z), dark, verts=32)
        handrail_ring(0, 0, r - 0.12, z + 1.05, dark, posts=12)
    ladder(R + 0.75, 0, 0.4, H - 1.4, dark, cage_from=3.0)
    # overhead condenser: horizontal drum + vapour line + downcomer
    cyl(0.55, 3.0, (2.0, 0, H - 1.2), shell, verts=32, rot=(0, math.pi / 2, 0))
    flange(0.6, (0.5, 0, H - 1.2), dark, axis="X")
    cyl(0.18, 2.2, (0.9, 0, H - 0.4), pipe, verts=16, rot=(0, math.pi / 2, 0))
    cyl(0.14, H - 3.0, (3.4, 0, (H - 1.4) / 2 + 0.6), pipe, verts=16)
    cyl(0.14, 1.6, (2.7, 0, 1.2), pipe, verts=16, rot=(0, math.pi / 2, 0))
    export_glb("distillation_column_hd")


# ------------------------------------------------------------- new props

def build_cooling_tower_hd():
    clear_scene()
    conc = mat("concrete", (0.68, 0.68, 0.66), 0.0, 0.85)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    water = mat("basin_water", (0.10, 0.30, 0.38), 0.1, 0.2)
    # hyperboloid shell approximated: wide base cone -> waist -> flared top
    cone(3.6, 2.3, 4.5, (0, 0, 2.85), conc, verts=48)
    cone(2.3, 2.75, 3.4, (0, 0, 6.8), conc, verts=48)
    torus(2.78, 0.09, (0, 0, 8.5), conc)                    # top rim
    cyl(3.9, 0.6, (0, 0, 0.3), conc, verts=48)              # collection basin
    cyl(3.55, 0.1, (0, 0, 0.62), water, verts=48)           # water surface
    for k in range(12):                                     # air-inlet louvres
        a = k * math.pi / 6
        box((0.12, 1.6, 0.9), (3.35 * math.cos(a), 3.35 * math.sin(a), 1.1), dark, rot=(0, 0, a))
    cyl(0.16, 2.6, (3.2, 1.6, 1.3), dark, verts=12)         # riser pipe
    export_glb("cooling_tower_hd")


def build_pipe_rack_hd():
    clear_scene()
    frame = mat("rack_steel", (0.72, 0.45, 0.12), 0.6, 0.5)     # oxide-primer orange
    p_steel = mat("pipe_steel", (0.55, 0.58, 0.62), 0.85, 0.35)
    p_acid = mat("pipe_acid", (0.75, 0.72, 0.20), 0.3, 0.55)    # yellow = corrosives
    p_water = mat("pipe_water", (0.15, 0.42, 0.28), 0.4, 0.5)   # green = water
    L = 12.0
    for x in (-L / 2 + 0.6, 0, L / 2 - 0.6):                    # portal frames
        for sy in (-1.1, 1.1):
            box((0.16, 0.16, 3.4), (x, sy, 1.7), frame)
        box((0.16, 2.5, 0.16), (x, 0, 3.32), frame)
        box((0.16, 2.5, 0.16), (x, 0, 2.30), frame)
    runs = [(-0.8, 3.55, 0.16, p_steel), (-0.3, 3.55, 0.22, p_acid),
            (0.35, 3.55, 0.13, p_water), (0.85, 3.55, 0.16, p_steel),
            (-0.5, 2.52, 0.18, p_steel), (0.5, 2.52, 0.12, p_acid)]
    for y, z, r, m in runs:
        cyl(r, L, (0, y, z), m, verts=20, rot=(0, math.pi / 2, 0))
        flange(r + 0.05, (-L / 4, y, z), m, axis="X")
        flange(r + 0.05, (L / 4, y, z), m, axis="X")
    export_glb("pipe_rack_hd")


def build_gas_cylinder_rack_hd():
    clear_scene()
    frame = mat("rack_dark", (0.14, 0.15, 0.17), 0.8, 0.5)
    body = mat("cyl_body", (0.60, 0.62, 0.65), 0.8, 0.35)
    # EN 1089-3 shoulder colours: O2 white, C2H2 maroon, N2 black, Ar dark
    # green, H2 red, CO2 grey — the colour language players see in a real plant.
    shoulders = [mat("s_oxygen", (0.92, 0.92, 0.92), 0.4, 0.4),
                 mat("s_acetylene", (0.45, 0.12, 0.16), 0.4, 0.4),
                 mat("s_nitrogen", (0.06, 0.06, 0.07), 0.4, 0.4),
                 mat("s_argon", (0.10, 0.32, 0.18), 0.4, 0.4),
                 mat("s_hydrogen", (0.75, 0.12, 0.10), 0.4, 0.4),
                 mat("s_co2", (0.45, 0.47, 0.50), 0.4, 0.4)]
    box((3.0, 0.9, 0.08), (0, 0, 0.04), frame)              # base pallet
    for sy in (-0.42, 0.42):                                # back rails + chain bar
        box((3.0, 0.06, 0.06), (0, sy, 1.25), frame)
    for i, sh in enumerate(shoulders):
        x = -1.25 + i * 0.5
        cyl(0.20, 1.5, (x, 0, 0.83), body, verts=20)        # bottle body
        sphere(0.20, (x, 0, 1.58), sh, scale_z=0.8)         # colour-coded shoulder
        cyl(0.05, 0.16, (x, 0, 1.80), frame, verts=10)      # valve
        box((0.16, 0.16, 0.10), (x, 0.06, 1.86), frame)     # valve handwheel guard
    export_glb("gas_cylinder_rack_hd")


def build_control_console_hd():
    clear_scene()
    body = mat("console_body", (0.16, 0.18, 0.22), 0.5, 0.5)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    scr = mat("screen_glow", (0.30, 0.95, 0.80), 0.0, 0.3, emission=2.2)
    scr2 = mat("screen_amber", (0.95, 0.70, 0.25), 0.0, 0.3, emission=1.8)
    box((2.6, 0.9, 0.9), (0, 0, 0.45), body)                # desk body
    box((2.6, 0.7, 0.10), (0, -0.25, 1.0), body,            # sloped operator panel
        rot=(-0.35, 0, 0))
    for i, m in enumerate((scr, scr2, scr)):                # three monitors
        x = -0.85 + i * 0.85
        box((0.72, 0.06, 0.5), (x, 0.28, 1.45), dark)
        box((0.64, 0.02, 0.42), (x, 0.24, 1.45), m)
        cyl(0.05, 0.3, (x, 0.3, 1.05), dark, verts=10)
    for i in range(8):                                      # panel buttons/knobs
        cyl(0.035, 0.05, (-1.0 + i * 0.28, -0.34, 1.06), i % 3 == 0 and scr2 or dark, verts=10)
    box((0.5, 0.3, 0.06), (0.9, -0.3, 1.08), dark)          # keyboard
    export_glb("control_console_hd")


def build_safety_station_hd():
    clear_scene()
    green = mat("safety_green", (0.10, 0.55, 0.25), 0.3, 0.5)
    sign = mat("sign_glow", (0.20, 0.85, 0.40), 0.1, 0.4, emission=1.4)
    steel = mat("galv_steel", (0.55, 0.58, 0.60), 0.8, 0.4)
    white = mat("basin_white", (0.90, 0.91, 0.92), 0.2, 0.3)
    cyl(0.07, 2.6, (0, 0, 1.3), green, verts=16)            # riser pipe
    cyl(0.05, 0.7, (0, 0.32, 2.55), green, verts=12, rot=(math.pi / 2, 0, 0))
    cone(0.30, 0.05, 0.22, (0, 0.62, 2.42), steel, verts=24)  # shower head
    cyl(0.02, 0.5, (0.12, 0.15, 2.1), steel, verts=8)       # pull rod
    torus(0.09, 0.02, (0.12, 0.15, 1.82), steel, rot=(math.pi / 2, 0, 0))  # pull ring
    sphere(0.26, (0, 0.35, 1.05), white, scale_z=0.4)       # eyewash bowl
    cyl(0.04, 0.35, (0, 0.35, 0.88), green, verts=10)
    for s in (-1, 1):                                       # eyewash nozzles
        cyl(0.025, 0.12, (s * 0.09, 0.35, 1.12), steel, verts=8)
    box((0.55, 0.04, 0.55), (0, -0.09, 2.9), sign)          # emergency sign
    box((0.8, 0.8, 0.04), (0, 0.2, 0.02), green)            # floor marking
    export_glb("safety_station_hd")


def build_sample_station_hd():
    clear_scene()
    frame = mat("bench_frame", (0.14, 0.15, 0.17), 0.8, 0.5)
    top = mat("bench_top", (0.80, 0.80, 0.78), 0.1, 0.4)
    dev = mat("xrf_body", (0.85, 0.60, 0.10), 0.3, 0.45)     # handheld-XRF yellow
    scr = mat("readout", (0.30, 0.95, 0.80), 0.0, 0.3, emission=2.0)
    cup = mat("sample_cup", (0.70, 0.72, 0.75), 0.3, 0.4)
    slagm = mat("slag_sample", (0.22, 0.19, 0.17), 0.2, 0.9)
    box((2.0, 0.8, 0.08), (0, 0, 0.92), top)                # bench top
    for sx in (-0.9, 0.9):
        for sy in (-0.32, 0.32):
            box((0.07, 0.07, 0.9), (sx, sy, 0.45), frame)
    box((1.9, 0.7, 0.06), (0, 0, 0.45), frame)              # lower shelf
    # handheld XRF analyzer docked on a stand (pistol shape: body + snout + grip)
    cyl(0.06, 0.5, (-0.55, 0, 1.21), frame, verts=10)       # stand
    box((0.34, 0.13, 0.16), (-0.55, 0, 1.5), dev)           # body
    cone(0.055, 0.03, 0.16, (-0.76, 0, 1.5), frame, verts=16, rot=(0, math.pi / 2, 0))
    box((0.10, 0.11, 0.22), (-0.47, 0, 1.33), dev, rot=(0, -0.35, 0))  # grip
    box((0.16, 0.02, 0.11), (-0.50, -0.07, 1.55), scr)      # device screen
    for i in range(4):                                      # slag sample cups
        x = 0.15 + i * 0.28
        cyl(0.09, 0.10, (x, -0.15, 1.01), cup, verts=16)
        cyl(0.075, 0.04, (x, -0.15, 1.06), slagm, verts=16)
    box((0.5, 0.04, 0.35), (0.5, 0.3, 1.35), frame)         # wall readout panel
    box((0.44, 0.02, 0.29), (0.5, 0.28, 1.35), scr)
    cyl(0.05, 0.45, (0.5, 0.32, 1.05), frame, verts=10)
    export_glb("sample_station_hd")


BUILDERS = [build_storage_silo_hd, build_slag_ladle_hd, build_distillation_column_hd,
            build_cooling_tower_hd, build_pipe_rack_hd, build_gas_cylinder_rack_hd,
            build_control_console_hd, build_safety_station_hd, build_sample_station_hd]

if __name__ == "__main__":
    for b in BUILDERS:
        b()
    print(f"[hd-props] built {len(BUILDERS)} models -> {MODELS_DIR}")
