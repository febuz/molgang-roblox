"""
MOLGANG — Mining Equipment 3D Model Generator
Generates FBX models for the vanadium mining system.

Run: flatpak run --filesystem=/home/knight2 org.blender.Blender --background --python generate_mining_models.py
"""

import bpy
import math
import os

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")
os.makedirs(OUTPUT_DIR, exist_ok=True)
S = 1.0

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for b in bpy.data.meshes:
        if b.users == 0: bpy.data.meshes.remove(b)

def mat(n, c):
    m = bpy.data.materials.new(n)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    if b: b.inputs[0].default_value = (*c, 1)
    return m

def assign(o, m):
    if o.data.materials: o.data.materials[0] = m
    else: o.data.materials.append(m)

def export(n):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.fbx(filepath=os.path.join(OUTPUT_DIR, f"{n}.fbx"),
        use_selection=True, global_scale=1.0, apply_unit_scale=True,
        object_types={'MESH'}, mesh_smooth_type='OFF', use_triangles=True)
    print(f"Exported: {n}.fbx")

def box(loc, sz, nm):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object; o.name = nm; o.scale = sz
    bpy.ops.object.transform_apply(scale=True); return o

def cyl(loc, r, d, nm, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=r, depth=d, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = nm; return o

# ═══ DRILL RIG (exploration) ═══
def create_drill_rig():
    clear()
    steel = mat("Steel", (0.35, 0.35, 0.38))
    red = mat("Red", (0.7, 0.15, 0.1))
    yellow = mat("Yellow", (0.9, 0.75, 0.1))

    # Mast (tall vertical)
    mast = cyl((0, 10*S, 0), 0.5*S, 20*S, "Mast")
    assign(mast, red)
    # Base platform
    base = box((0, 0, 0), (6*S, 1*S, 4*S), "Base")
    assign(base, steel)
    # Drill head (cylinder at top)
    head = cyl((0, 20*S, 0), 1*S, 2*S, "DrillHead")
    assign(head, steel)
    # Drill string (thin cylinder going down)
    string = cyl((0, 5*S, 0), 0.15*S, 15*S, "DrillString")
    assign(string, mat("Chrome", (0.6, 0.6, 0.62)))
    # Support legs (A-frame)
    for x in [-2, 2]:
        leg = box((x*S, 5*S, -1.5*S), (0.3*S, 10*S, 0.3*S), f"Leg_{x}")
        leg.rotation_euler = (0.1 * (-1 if x > 0 else 1), 0, 0)
        assign(leg, steel)
    # Warning stripes
    stripe = box((0, 0.7*S, 2.5*S), (6*S, 0.3*S, 0.3*S), "Stripe")
    assign(stripe, yellow)
    export("drill_rig")

# ═══ EXCAVATOR ═══
def create_excavator():
    clear()
    yellow = mat("CatYellow", (0.85, 0.65, 0.1))
    dark = mat("Dark", (0.15, 0.15, 0.18))
    glass = mat("Glass", (0.3, 0.5, 0.6))

    # Body/house
    body = box((0, 3*S, 0), (5*S, 3*S, 3*S), "Body")
    assign(body, yellow)
    # Cab (glass top)
    cab = box((0, 5*S, -0.5*S), (2.5*S, 2*S, 2*S), "Cab")
    assign(cab, glass)
    # Tracks (two side tracks)
    for z in [-1.8, 1.8]:
        track = box((0, 0.8*S, z*S), (6*S, 1.5*S, 1*S), f"Track_{z}")
        assign(track, dark)
    # Boom arm
    boom = box((3*S, 5*S, 0), (4*S, 0.5*S, 0.5*S), "Boom")
    boom.rotation_euler = (0, 0, -0.3)
    assign(boom, yellow)
    # Stick
    stick = box((6*S, 3.5*S, 0), (3*S, 0.4*S, 0.4*S), "Stick")
    stick.rotation_euler = (0, 0, 0.5)
    assign(stick, yellow)
    # Bucket
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=1.5*S, radius2=0.3*S, depth=1.5*S, location=(8*S, 2*S, 0))
    bucket = bpy.context.active_object; bucket.name = "Bucket"
    bucket.rotation_euler = (0, 0, 1.2)
    assign(bucket, dark)
    export("excavator")

# ═══ HAUL TRUCK ═══
def create_haul_truck():
    clear()
    yellow = mat("Yellow", (0.85, 0.65, 0.1))
    dark = mat("Dark", (0.12, 0.12, 0.14))
    grey = mat("Grey", (0.4, 0.4, 0.42))

    # Chassis
    chassis = box((0, 2*S, 0), (10*S, 2*S, 4*S), "Chassis")
    assign(chassis, grey)
    # Dump bed
    bed = box((2*S, 4.5*S, 0), (7*S, 3*S, 3.8*S), "DumpBed")
    assign(bed, yellow)
    # Cab
    cab = box((-3.5*S, 4.5*S, 0), (2.5*S, 2.5*S, 3*S), "Cab")
    assign(cab, yellow)
    cab_glass = box((-3.5*S, 5.5*S, 0), (2*S, 1.5*S, 2.5*S), "CabGlass")
    assign(cab_glass, mat("Glass", (0.3, 0.5, 0.6)))
    # Wheels (6: 2 front, 4 rear)
    for x, z in [(-3, -2.3), (-3, 2.3), (1, -2.3), (1, 2.3), (3, -2.3), (3, 2.3)]:
        wheel = cyl((x*S, 1*S, z*S), 1*S, 0.8*S, f"Wheel_{x}_{z}", (math.pi/2, 0, 0))
        assign(wheel, dark)
    export("haul_truck")

# ═══ BOF CONVERTER (for Velzen factory) ═══
def create_bof_converter():
    clear()
    steel = mat("Steel", (0.35, 0.35, 0.38))
    refractory = mat("Refractory", (0.6, 0.3, 0.15))
    glow = mat("MoltenGlow", (0.9, 0.4, 0.05))

    # Outer shell (pear shape = cylinder + sphere top)
    shell = cyl((0, 6*S, 0), 4*S, 12*S, "ConverterShell")
    assign(shell, steel)
    # Top opening (wider)
    top = cyl((0, 13*S, 0), 3*S, 2*S, "TopOpening")
    assign(top, refractory)
    # Bottom (narrower)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=4*S, radius2=2*S, depth=3*S, location=(0, -0.5*S, 0))
    bottom = bpy.context.active_object; bottom.name = "ConverterBottom"
    assign(bottom, steel)
    # Trunnion ring (support ring)
    bpy.ops.mesh.primitive_torus_add(major_radius=4.5*S, minor_radius=0.3*S,
        location=(0, 8*S, 0), major_segments=24, minor_segments=8)
    ring = bpy.context.active_object; ring.name = "TrunnionRing"
    assign(ring, steel)
    # Molten steel glow inside (visible from top)
    glow_part = cyl((0, 12*S, 0), 2.5*S, 1*S, "MoltenGlow")
    assign(glow_part, glow)
    # Support frame
    for x in [-5, 5]:
        pillar = box((x*S, 4*S, 0), (1*S, 12*S, 1*S), f"Pillar_{x}")
        assign(pillar, mat("Frame", (0.4, 0.4, 0.42)))
    export("bof_converter")

# ═══ RUN ALL ═══
generators = [
    ("Drill Rig", create_drill_rig),
    ("Excavator", create_excavator),
    ("Haul Truck", create_haul_truck),
    ("BOF Converter", create_bof_converter),
]

print("=" * 50)
print("MOLGANG — Mining Equipment Models")
print(f"Generating {len(generators)} models...")
print("=" * 50)

for name, func in generators:
    print(f"\nGenerating: {name}...")
    try:
        func()
        print(f"  OK: {name}")
    except Exception as e:
        print(f"  FAILED: {name}: {e}")

print(f"\nDone! Models saved to: {OUTPUT_DIR}")
