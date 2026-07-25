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
    _mats.clear()      # cached Material refs die with the purge below
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


_mats = {}


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


def cone(r1, r2, d, loc, material, verts=32, rot=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=d, location=loc)
    o = bpy.context.active_object
    if rot:
        o.rotation_euler = rot
    return _obj(o, material)


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


def export_glb(name):
    out = os.path.abspath(os.path.join(MODELS_DIR, f"{name}.glb"))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
    print(f"Exported: {out}")


def gear(r, width, loc, material, teeth=20, rot=None):
    """A girth/drive gear: disc + teeth blocks around the rim."""
    g = cyl(r, width, loc, material, verts=48, rot=rot)
    for k in range(teeth):
        a = k * 2 * math.pi / teeth
        tx = loc[0] + (r + 0.05) * math.cos(a)
        tz = loc[2] + (r + 0.05) * math.sin(a)
        t = box((0.12, width * 0.9, 0.1), (tx, loc[1], tz), material)
        t.rotation_euler = (0, a, 0) if rot is None else (rot[0], a, rot[2])
    return g


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

    export_glb("leaching_tank_hd")


def build_jaw_crusher_hd():
    """Primary crusher: A-frame body, feed hopper, twin flywheels, drive motor."""
    clear_scene()
    body_m = mat("crusher_body", (0.2, 0.24, 0.34), 0.8, 0.5)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)

    # base frame + angled side plates (the A-frame)
    box((3.0, 2.2, 0.3), (0, 0, 0.15), dark)
    for sy in (-1, 1):
        p = box((2.4, 0.18, 2.2), (0, sy * 0.95, 1.4), body_m)
        p.rotation_euler = (0, 0.12, 0)
    # fixed + moving jaw (angled plates) and pitman housing
    j = box((0.25, 1.6, 1.8), (-0.7, 0, 1.5), steel); j.rotation_euler = (0, 0.3, 0)
    j2 = box((0.25, 1.6, 1.8), (0.55, 0, 1.6), steel); j2.rotation_euler = (0, -0.18, 0)
    box((0.9, 1.5, 0.7), (0.9, 0, 2.6), body_m)
    # feed hopper (inverted truncated pyramid via scaled cone)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1.7, radius2=0.8, depth=1.1,
                                    location=(0, 0, 3.3), rotation=(math.pi, 0, math.pi / 4))
    _obj(bpy.context.active_object, safety)
    # eccentric shaft + twin flywheels with hub bolts
    cyl(0.14, 3.0, (0.9, 0, 2.6), steel, rot=(math.pi / 2, 0, 0))
    for sy in (-1.55, 1.55):
        cyl(0.95, 0.22, (0.9, sy, 2.6), dark, verts=36, rot=(math.pi / 2, 0, 0))
        for k in range(6):
            a = k * math.pi / 3
            cyl(0.05, 0.26, (0.9 + 0.55 * math.cos(a), sy, 2.6 + 0.55 * math.sin(a)), steel, verts=8,
                rot=(math.pi / 2, 0, 0))
    # drive motor + belt guard
    cyl(0.3, 0.8, (2.2, -1.0, 0.75), safety, rot=(math.pi / 2, 0, 0))
    b = box((0.9, 0.25, 1.9), (1.6, -1.45, 1.6), yellow_guard()); b.rotation_euler = (0, 0.45, 0)
    # discharge chute
    c = box((1.2, 1.2, 0.15), (-0.4, 0, 0.55), steel); c.rotation_euler = (0, 0.5, 0)
    export_glb("jaw_crusher_hd")


def yellow_guard():
    return mat("handrail_yellow", (0.8, 0.62, 0.08), 0.4, 0.55)


def build_ball_mill_hd():
    """Grinding mill: horizontal drum, riding rings, girth gear + pinion drive."""
    clear_scene()
    shell = mat("mill_shell", (0.35, 0.36, 0.4), 0.85, 0.45)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)

    # drum along Y with bolted end heads + trunnions on pedestals
    cyl(1.1, 3.2, (0, 0, 1.7), shell, verts=48, rot=(math.pi / 2, 0, 0))
    for sy in (-1.62, 1.62):
        cyl(1.18, 0.14, (0, sy, 1.7), dark, verts=48, rot=(math.pi / 2, 0, 0))
        for k in range(12):
            a = k * math.pi / 6
            cyl(0.035, 0.2, (0.95 * math.cos(a), sy, 1.7 + 0.95 * math.sin(a)), steel, verts=8,
                rot=(math.pi / 2, 0, 0))
        cyl(0.3, 0.5, (0, sy * 1.15, 1.7), steel, rot=(math.pi / 2, 0, 0))   # trunnion
        box((1.0, 0.5, 0.8), (0, sy * 1.15, 0.55), dark)                      # bearing pedestal
        box((1.3, 0.8, 0.25), (0, sy * 1.15, 0.13), dark)                     # plinth
    for sy in (-0.9, 0.9):
        torus(1.14, 0.05, (0, sy, 1.7), steel, rot=(math.pi / 2, 0, 0))       # riding rings
    # girth gear + pinion + motor drive on a base
    gear(1.25, 0.18, (0, 1.35, 1.7), dark, teeth=24, rot=(math.pi / 2, 0, 0))
    cyl(0.28, 0.2, (0, 1.35, 0.45), dark, verts=20, rot=(math.pi / 2, 0, 0))  # pinion
    cyl(0.3, 0.9, (1.1, 1.35, 0.45), safety, rot=(0, math.pi / 2, 0))         # motor
    box((1.9, 0.7, 0.2), (0.7, 1.35, 0.1), dark)
    # feed chute + discharge trommel
    f = box((0.5, 0.8, 0.5), (0, -2.15, 2.1), steel); f.rotation_euler = (0.6, 0, 0)
    cyl(0.45, 0.7, (0, 2.1, 1.7), dark, verts=24, rot=(math.pi / 2, 0, 0))
    export_glb("ball_mill_hd")


def build_roasting_kiln_hd():
    """Rotary kiln: long inclined tube, riding rings on roller stations, burner hood."""
    clear_scene()
    shell = mat("kiln_shell", (0.32, 0.2, 0.16), 0.7, 0.5)      # heat-scorched steel
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)
    tilt = 0.06

    # inclined rotating tube
    t = cyl(0.75, 6.0, (0, 0, 1.9), shell, verts=40, rot=(math.pi / 2 + tilt, 0, 0))
    # riding rings + twin support rollers on concrete piers
    for sy in (-1.8, 1.8):
        zc = 1.9 - sy * tilt
        torus(0.82, 0.07, (0, sy, zc), steel, rot=(math.pi / 2, 0, 0))
        for sx in (-0.55, 0.55):
            cyl(0.22, 0.5, (sx, sy, zc - 0.95), dark, verts=20, rot=(math.pi / 2, 0, 0))
        box((1.6, 0.7, 0.5), (0, sy, zc - 1.35), dark)
    # girth gear + drive
    gear(0.92, 0.15, (0, 0.6, 1.86), dark, teeth=22, rot=(math.pi / 2, 0, 0))
    cyl(0.26, 0.8, (1.15, 0.6, 0.6), safety, rot=(0, math.pi / 2, 0))
    box((1.4, 0.6, 0.2), (0.8, 0.6, 0.12), dark)
    # burner hood (low end) with burner lance + exhaust hood/stack (high end)
    box((1.4, 0.9, 1.6), (0, 3.35, 1.6), dark)
    cyl(0.1, 1.2, (0, 4.1, 1.75), steel, rot=(math.pi / 2, 0, 0))
    box((1.3, 0.8, 1.9), (0, -3.3, 2.1), dark)
    cyl(0.3, 2.2, (0, -3.3, 4.0), steel, verts=20)
    export_glb("roasting_kiln_hd")


def build_cooling_pit_hd():
    """Concrete slag pit with glowing fresh slag, spray booms and safety rail."""
    clear_scene()
    conc = mat("concrete", (0.42, 0.42, 0.4), 0.0, 0.9)
    slag = mat("hot_slag", (1.0, 0.35, 0.06), 0.0, 0.8, emission=6.0)
    cool = mat("cool_slag", (0.12, 0.1, 0.1), 0.2, 0.9)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)
    yellow = mat("handrail_yellow", (0.8, 0.62, 0.08), 0.4, 0.55)

    box((4.2, 3.2, 0.25), (0, 0, 0.12), conc)                      # slab
    for sx in (-1, 1):
        box((0.3, 3.2, 1.0), (sx * 1.95, 0, 0.6), conc)            # long walls
    for sy in (-1, 1):
        box((3.6, 0.3, 1.0), (0, sy * 1.45, 0.6), conc)            # end walls
    for i, (x, y, r, hot) in enumerate(((0.5, 0.3, 0.55, True), (-0.6, -0.3, 0.5, True),
                                        (-0.2, 0.55, 0.4, False), (0.9, -0.5, 0.35, False),
                                        (-1.1, 0.4, 0.35, False))):
        sphere(r, (x, y, 0.45), slag if hot else cool, scale_z=0.55)
    # water spray booms across the pit
    for y in (-0.7, 0.7):
        cyl(0.05, 4.0, (0, y, 1.7), steel, verts=10, rot=(0, math.pi / 2, 0))
        for x in (-1.2, -0.4, 0.4, 1.2):
            cone(0.09, 0.02, 0.16, (x, y, 1.55), steel, verts=10, rot=(math.pi, 0, 0))
    for sx in (-2.15, 2.15):
        cyl(0.06, 4.4, (sx, 0, 1.15), steel, verts=8, rot=(0, math.pi / 2, 0))
        cyl(0.03, 3.2, (sx, 0, 1.5), yellow, verts=8, rot=(math.pi / 2, 0, 0))
        for y in (-1.4, 0, 1.4):
            cyl(0.03, 0.9, (sx, y, 1.05), yellow, verts=8)
    export_glb("cooling_pit_hd")


def build_vibrating_feeder_hd():
    """Inclined feeder trough on coil springs with twin vibration motors."""
    clear_scene()
    body = mat("crusher_body", (0.2, 0.24, 0.34), 0.8, 0.5)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)
    tilt = 0.16

    t = box((3.2, 1.3, 0.12), (0, 0, 1.25), steel); t.rotation_euler = (0, tilt, 0)
    for sy in (-1, 1):
        w = box((3.2, 0.1, 0.5), (0, sy * 0.65, 1.5), body); w.rotation_euler = (0, tilt, 0)
    h = box((1.2, 1.6, 1.0), (-1.4, 0, 2.5), safety)               # rear hopper
    cone(0.9, 0.5, 0.7, (-1.4, 0, 1.85), safety, verts=4, rot=(math.pi, 0, math.pi / 4))
    for sy in (-0.45, 0.45):                                        # twin vibrator motors
        m = cyl(0.2, 0.7, (0.4, sy * 1.05, 1.85), safety, verts=16, rot=(0, math.pi / 2 - tilt, 0))
    for sx, z in ((-1.2, 0.55), (1.2, 0.35)):                       # spring mounts + frame
        for sy in (-0.5, 0.5):
            for k in range(3):
                torus(0.14, 0.035, (sx, sy, z + k * 0.09), dark, rot=(0, 0, 0))
            box((0.24, 0.24, z * 2 - 0.2), (sx, sy, (z - 0.1) / 1), dark)
    export_glb("vibrating_feeder_hd")


def build_vibrating_screen_hd():
    """Inclined double-deck screen on springs, twin exciters, three chutes."""
    clear_scene()
    body = mat("crusher_body", (0.2, 0.24, 0.34), 0.8, 0.5)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)
    tilt = 0.2

    for sy in (-1, 1):                                              # side plates
        p = box((3.4, 0.12, 1.1), (0, sy * 0.8, 1.7), body); p.rotation_euler = (0, tilt, 0)
    for dz, m in ((0.35, steel), (-0.15, dark)):                    # two decks
        d = box((3.3, 1.5, 0.07), (0, 0, 1.7 + dz), m); d.rotation_euler = (0, tilt, 0)
    for k in range(7):                                              # deck rib lines
        r = box((0.05, 1.5, 0.1), (-1.35 + k * 0.45, 0, 2.1 - k * 0.09), dark)
        r.rotation_euler = (0, tilt, 0)
    for sy in (-0.55, 0.55):                                        # exciters on top
        cyl(0.22, 0.5, (-0.3, sy * 1.0, 2.55), safety, verts=16, rot=(math.pi / 2, 0, 0))
    for sx in (-1.4, 1.4):                                          # spring towers
        for sy in (-0.7, 0.7):
            for k in range(3):
                torus(0.15, 0.04, (sx, sy, 0.75 + k * 0.1), dark)
            box((0.26, 0.26, 0.7), (sx, sy, 0.35), dark)
    for i in range(3):                                              # fraction chutes
        c = box((0.7, 0.4, 0.1), (1.9, -0.5 + i * 0.5, 1.1 - i * 0.12), steel)
        c.rotation_euler = (0, 0.5, 0)
    export_glb("vibrating_screen_hd")


def build_cone_crusher_hd():
    """Secondary crusher: conical head, spider arms, hydraulic adjustment ring."""
    clear_scene()
    body = mat("crusher_body", (0.2, 0.24, 0.34), 0.8, 0.5)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)

    cyl(1.35, 0.9, (0, 0, 0.65), body, verts=40)                   # main frame
    cone(1.45, 1.0, 0.9, (0, 0, 1.55), body, verts=40)             # bowl
    cyl(1.5, 0.35, (0, 0, 2.1), dark, verts=40)                    # adjustment ring
    for k in range(8):                                              # hydraulic cylinders
        a = k * math.pi / 4
        cyl(0.09, 0.55, (1.35 * math.cos(a), 1.35 * math.sin(a), 1.75), safety, verts=10)
    cone(0.55, 0.95, 0.6, (0, 0, 2.55), steel, verts=32)           # feed bowl hopper
    for k in range(3):                                              # spider arms
        a = k * 2 * math.pi / 3
        b = box((0.9, 0.16, 0.16), (0.45 * math.cos(a), 0.45 * math.sin(a), 2.92), dark)
        b.rotation_euler = (0, 0, a)
    cyl(0.16, 0.5, (0, 0, 3.1), dark, verts=16)                    # spider hub
    cyl(0.3, 1.0, (1.7, 0, 0.55), safety, rot=(0, math.pi / 2, 0)) # drive motor
    box((1.0, 0.5, 0.35), (1.15, 0, 0.35), dark)                   # countershaft box
    export_glb("cone_crusher_hd")


def build_magnetic_separator_hd():
    """HGMS: vertical canister inside a big copper solenoid, control cabinet."""
    clear_scene()
    body = mat("crusher_body", (0.2, 0.24, 0.34), 0.8, 0.5)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    copper = mat("coil_copper", (0.72, 0.38, 0.18), 0.9, 0.35)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)

    box((2.6, 2.0, 0.25), (0, 0, 0.12), dark)                      # skid
    cyl(0.55, 2.4, (0, 0, 1.7), steel, verts=32)                   # canister
    for z in (1.15, 1.7, 2.25):                                     # solenoid stack
        torus(0.95, 0.24, (0, 0, z), copper)
    cyl(1.0, 0.18, (0, 0, 0.75), dark, verts=36)                   # yoke plates
    cyl(1.0, 0.18, (0, 0, 2.65), dark, verts=36)
    cyl(0.12, 0.9, (0, 0, 3.2), steel, verts=12)                   # feed pipe in
    flange(0.2, (0, 0, 3.6), dark)
    for sx, lbl in ((-0.45, 0), (0.45, 0)):                         # mags / non-mags outlets
        cyl(0.1, 1.0, (sx, 0.5, 0.55), steel, verts=12, rot=(0.5, 0, 0))
    box((0.8, 0.4, 1.3), (1.55, -0.6, 0.9), body)                  # control cabinet
    box((0.6, 0.05, 0.5), (1.55, -0.38, 1.15), dark)               # panel face
    cyl(0.04, 1.2, (0.9, -0.6, 1.4), dark, verts=8, rot=(0, 1.0, 0))   # conduit
    export_glb("magnetic_separator_hd")


def build_filtration_press_hd():
    """Plate-and-frame filter press with hydraulic closer and drip tray."""
    clear_scene()
    body = mat("crusher_body", (0.2, 0.24, 0.34), 0.8, 0.5)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    plate = mat("press_plate", (0.75, 0.73, 0.65), 0.1, 0.7)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)

    for sy in (-0.75, 0.75):                                        # side bars
        box((4.0, 0.14, 0.22), (0, sy, 1.55), steel)
    box((0.5, 1.7, 1.9), (-1.95, 0, 1.05), body)                   # head stand
    box((0.5, 1.7, 1.9), (1.95, 0, 1.05), body)                    # tail stand
    for k in range(14):                                             # plate pack
        box((0.1, 1.35, 1.25), (-1.35 + k * 0.19, 0, 1.35), plate)
        box((0.04, 1.45, 0.12), (-1.35 + k * 0.19, 0, 2.02), dark)  # lugs
    cyl(0.22, 0.9, (2.5, 0, 1.35), safety, verts=20, rot=(0, math.pi / 2, 0))   # hydraulic cyl
    cyl(0.09, 0.7, (1.85, 0, 1.35), steel, verts=12, rot=(0, math.pi / 2, 0))   # ram
    box((3.6, 1.6, 0.1), (0, 0, 0.35), dark)                       # drip tray
    for sx in (-1.6, 1.6):
        for sy in (-0.6, 0.6):
            box((0.18, 0.18, 0.6), (sx, sy, 0.05), dark)
    cyl(0.09, 1.1, (-2.35, 0, 1.35), steel, verts=12, rot=(0, math.pi / 2, 0))  # feed pipe
    flange(0.15, (-2.9, 0, 1.35), dark, axis="X")
    export_glb("filtration_press_hd")


def build_precipitation_reactor_hd():
    """Thickener-style precipitation tank: cone bottom, rake bridge, launder."""
    clear_scene()
    steel_v = mat("paint_steel", (0.16, 0.35, 0.38), 0.75, 0.4)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    yellow = mat("handrail_yellow", (0.8, 0.62, 0.08), 0.4, 0.55)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)

    cyl(1.9, 1.1, (0, 0, 1.75), steel_v, verts=48)                 # tank shell
    cone(0.25, 1.9, 1.2, (0, 0, 0.6), steel_v, verts=48)           # cone bottom
    torus(1.95, 0.09, (0, 0, 2.3), steel)                          # launder ring
    for k in range(6):                                              # support columns
        a = k * math.pi / 3
        box((0.16, 0.16, 1.6), (1.7 * math.cos(a), 1.7 * math.sin(a), 0.8), dark)
    box((4.2, 0.6, 0.08), (0, 0, 2.45), dark)                      # walkway bridge
    for sx in (-1.9, -0.95, 0, 0.95, 1.9):
        cyl(0.025, 0.9, (sx, 0.28, 2.9), yellow, verts=8)
        cyl(0.025, 0.9, (sx, -0.28, 2.9), yellow, verts=8)
    for sy in (0.28, -0.28):
        cyl(0.03, 4.2, (0, sy, 3.35), yellow, verts=8, rot=(0, math.pi / 2, 0))
    cyl(0.3, 0.5, (0, 0, 2.75), safety, verts=20)                  # rake drive
    cyl(0.08, 2.2, (0, 0, 1.6), steel, verts=10)                   # rake shaft
    cyl(0.1, 1.1, (0, 0, 0.1), steel, verts=12, rot=(math.pi / 2, 0, 0))   # underflow
    export_glb("precipitation_reactor_hd")


def build_drying_oven_hd():
    """Spray-dryer style dryer: tall cone-bottom tower, cyclone, furnace, ducts."""
    clear_scene()
    shell = mat("mill_shell", (0.35, 0.36, 0.4), 0.85, 0.45)
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)

    cyl(1.1, 2.4, (0, 0, 2.6), shell, verts=40)                    # tower
    cone(0.2, 1.1, 1.3, (0, 0, 0.75), shell, verts=40)             # cone bottom
    sphere(1.1, (0, 0, 3.8), shell, scale_z=0.4)                   # dished top
    for k in range(4):                                              # legs
        a = k * math.pi / 2 + math.pi / 4
        box((0.15, 0.15, 1.5), (0.95 * math.cos(a), 0.95 * math.sin(a), 0.75), dark)
    box((1.1, 0.8, 0.9), (1.8, -0.9, 0.5), safety)                 # air furnace
    cyl(0.16, 1.6, (1.8, -0.9, 1.8), steel, verts=14)              # hot air riser
    cyl(0.14, 1.6, (1.05, -0.45, 3.55), steel, verts=14, rot=(0.5, 0.85, 0))  # duct to top
    cyl(0.45, 1.1, (1.7, 0.9, 2.9), steel, verts=24)               # cyclone body
    cone(0.12, 0.45, 0.9, (1.7, 0.9, 1.9), steel, verts=24)        # cyclone cone
    cyl(0.12, 0.8, (1.7, 0.9, 3.75), steel, verts=12)              # vortex finder
    cyl(0.13, 1.4, (0.85, 0.45, 3.3), steel, verts=12, rot=(0.6, -0.9, 0))    # tower->cyclone duct
    cyl(0.35, 0.5, (1.7, 0.9, 1.25), dark, verts=20)               # product drum
    export_glb("drying_oven_hd")


def build_conveyor_hd():
    """Troughed belt conveyor on a truss frame: pulleys, idler sets, drive."""
    clear_scene()
    dark = mat("dark_steel", (0.10, 0.11, 0.13), 0.85, 0.5)
    belt = mat("belt_rubber", (0.06, 0.06, 0.07), 0.0, 0.85)
    safety = mat("safety_orange", (0.75, 0.28, 0.05), 0.3, 0.6)
    steel = mat("pipe_steel", (0.45, 0.47, 0.5), 0.9, 0.35)
    L = 4.4

    # truss side frames with diagonal braces
    for sy in (-0.55, 0.55):
        box((L, 0.08, 0.1), (0, sy, 1.15), dark)
        box((L, 0.08, 0.1), (0, sy, 0.75), dark)
        for k in range(6):
            b = box((0.06, 0.06, 0.5), (-1.85 + k * 0.74, sy, 0.95), dark)
            b.rotation_euler = (0, 0.6 if k % 2 else -0.6, 0)
    # belt runs (top trough + return) and side skirts
    box((L - 0.3, 0.9, 0.04), (0, 0, 1.22), belt)
    box((L - 0.3, 0.8, 0.03), (0, 0, 0.7), belt)
    for sy in (-0.5, 0.5):
        s = box((L - 0.5, 0.04, 0.16), (0, sy, 1.32), belt); s.rotation_euler = (0.5 * (1 if sy > 0 else -1), 0, 0)
    # head/tail pulleys + drive motor with guard
    for sx, drive in ((L / 2, True), (-L / 2, False)):
        cyl(0.16, 1.0, (sx, 0, 1.18), steel, verts=20, rot=(math.pi / 2, 0, 0))
        if drive:
            cyl(0.18, 0.5, (sx, 0.85, 1.18), safety, verts=16, rot=(math.pi / 2, 0, 0))
            box((0.45, 0.3, 0.45), (sx - 0.35, 0.85, 1.18), dark)
    # troughing idler sets every ~0.75 m (3 rollers) + return idlers
    x = -L / 2 + 0.55
    while x < L / 2 - 0.4:
        cyl(0.05, 0.44, (x, 0, 1.14), steel, verts=10, rot=(math.pi / 2, 0, 0))
        for sy in (-0.36, 0.36):
            r = cyl(0.05, 0.3, (x, sy, 1.2), steel, verts=10)
            r.rotation_euler = (math.pi / 2, 0.55 * (1 if sy > 0 else -1), 0)
        if int((x + L / 2) / 1.5) != int((x + L / 2 - 0.75) / 1.5):
            cyl(0.05, 0.9, (x, 0, 0.66), steel, verts=10, rot=(math.pi / 2, 0, 0))
        x += 0.75
    # legs with feet
    for sx in (-L / 2 + 0.4, 0, L / 2 - 0.4):
        for sy in (-0.5, 0.5):
            box((0.09, 0.09, 0.75), (sx, sy, 0.37), dark)
        box((0.5, 1.3, 0.05), (sx, 0, 0.02), dark)
    export_glb("conveyor_hd")


if __name__ == "__main__":
    build_leaching_tank_hd()
    build_jaw_crusher_hd()
    build_ball_mill_hd()
    build_roasting_kiln_hd()
    build_cooling_pit_hd()
    build_vibrating_feeder_hd()
    build_vibrating_screen_hd()
    build_cone_crusher_hd()
    build_magnetic_separator_hd()
    build_filtration_press_hd()
    build_precipitation_reactor_hd()
    build_drying_oven_hd()
    build_conveyor_hd()
