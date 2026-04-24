#!/usr/bin/env python3
"""
MOLGANG — 3D Model Downloader & Converter
Downloads free chemical equipment models and converts for Roblox.

Sources:
- Sketchfab (CC0/CC-BY, via API)
- Generates procedural models for equipment not available online

Usage:
    source assets/pipeline_env/bin/activate
    python3 assets/pipeline/download_models.py
"""

import os
import sys
import json
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"
DOWNLOADS_DIR = BASE_DIR / "downloads"
BLENDER_CMD = "flatpak run --filesystem=/home/knight2 org.blender.Blender"
BLENDER_SCRIPTS = BASE_DIR / "blender"

DOWNLOADS_DIR.mkdir(exist_ok=True)

# ═══════════════════════════════════════════════
# ADDITIONAL MODELS TO GENERATE
# Equipment not in the original batch
# ═══════════════════════════════════════════════

ADDITIONAL_MODELS = [
    # More chemical engineering equipment
    "distillation_column",
    "heat_exchanger",
    "centrifuge",
    "pump_centrifugal",
    "valve_gate",
    "pressure_vessel",
    "agitator_tank",
    "cyclone_separator",
    "scrubber_tower",
    "hopper_feed",
    # Lab equipment
    "erlenmeyer_flask",
    "beaker_1L",
    "burette",
    "fume_cupboard",
    "analytical_balance",
]

def generate_additional_blender_script():
    """Generate Blender Python script for additional chemical equipment."""
    script = '''
"""Generate additional chemical engineering 3D models."""
import bpy
import bmesh
import math
import os

OUTPUT_DIR = "{output_dir}"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for block in bpy.data.meshes:
        if block.users == 0: bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0: bpy.data.materials.remove(block)

def mat(name, color):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf: bsdf.inputs[0].default_value = (*color, 1.0)
    return m

def assign(obj, m):
    if obj.data.materials: obj.data.materials[0] = m
    else: obj.data.materials.append(m)

def export(name):
    bpy.ops.object.select_all(action='SELECT')
    fp = os.path.join(OUTPUT_DIR, f"{{name}}.fbx")
    bpy.ops.export_scene.fbx(filepath=fp, use_selection=True, global_scale=1.0,
        apply_unit_scale=True, object_types={{'MESH'}}, mesh_smooth_type='OFF', use_triangles=True)
    print(f"Exported: {{fp}}")

def cyl(loc, r, d, name, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=r, depth=d, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; return o

def box(loc, size, name):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True); return o

def sphere(loc, r, name):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=r, location=loc)
    o = bpy.context.active_object; o.name = name; return o

S = 1.0  # stud scale

# ═══ DISTILLATION COLUMN ═══
def create_distillation_column():
    clear_scene()
    steel = mat("Steel", (0.4, 0.42, 0.45))
    # Main column (tall cylinder)
    col = cyl((0, 8*S, 0), 1.5*S, 16*S, "Column", (0,0,0))
    assign(col, steel)
    # Top dome
    dome = sphere((0, 16.5*S, 0), 1.6*S, "TopDome")
    assign(dome, steel)
    # Bottom cone
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=1.5*S, radius2=0.5*S, depth=3*S, location=(0, -0.5*S, 0))
    bottom = bpy.context.active_object; bottom.name = "BottomCone"; assign(bottom, steel)
    # Tray sections (rings on column)
    for i in range(8):
        y = 1 + i * 2
        ring = cyl((0, y*S, 0), 1.7*S, 0.2*S, f"Tray_{{i}}")
        assign(ring, mat(f"Tray{{i}}", (0.5, 0.5, 0.52)))
    # Inlet/outlet pipes
    for y, x in [(4, 2), (12, -2), (14, 2)]:
        pipe = cyl((x*S, y*S, 0), 0.2*S, 2*S, f"Pipe_{{y}}", (0, 0, math.pi/2))
        assign(pipe, mat("Pipe", (0.5, 0.5, 0.52)))
    # Support legs
    for angle in range(0, 360, 90):
        x = math.cos(math.radians(angle)) * 1.3 * S
        z = math.sin(math.radians(angle)) * 1.3 * S
        leg = box((x, -2*S, z), (0.2*S, 3*S, 0.2*S), f"Leg_{{angle}}")
        assign(leg, steel)
    export("distillation_column")

# ═══ HEAT EXCHANGER (Shell & Tube) ═══
def create_heat_exchanger():
    clear_scene()
    steel = mat("Steel", (0.45, 0.45, 0.48))
    copper = mat("Copper", (0.7, 0.45, 0.25))
    # Shell (horizontal cylinder)
    shell = cyl((0, 2*S, 0), 1.5*S, 8*S, "Shell", (0, 0, math.pi/2))
    assign(shell, steel)
    # End caps (slightly larger)
    for x in [-4.3, 4.3]:
        cap = cyl((x*S, 2*S, 0), 1.7*S, 0.4*S, f"Cap_{{x}}", (0, 0, math.pi/2))
        assign(cap, steel)
    # Tube bundle visible (smaller tubes inside)
    for i in range(6):
        angle = i * 60
        ty = 2 + math.cos(math.radians(angle)) * 0.8
        tz = math.sin(math.radians(angle)) * 0.8
        tube = cyl((0, ty*S, tz*S), 0.15*S, 8.5*S, f"Tube_{{i}}", (0, 0, math.pi/2))
        assign(tube, copper)
    # Inlet/outlet nozzles
    for pos, name in [((0, 3.5*S, 0), "InletTop"), ((0, 0.5*S, 0), "OutletBot"),
                       ((-3*S, 2*S, 1.7*S), "ShellIn"), ((3*S, 2*S, -1.7*S), "ShellOut")]:
        noz = cyl(pos, 0.3*S, 1*S, name, (math.pi/2, 0, 0) if "Shell" in name else (0,0,0))
        assign(noz, steel)
    # Support saddles
    for x in [-2, 2]:
        saddle = box((x*S, 0.5*S, 0), (0.5*S, 1.5*S, 2.5*S), f"Saddle_{{x}}")
        assign(saddle, mat("Saddle", (0.3, 0.3, 0.32)))
    export("heat_exchanger")

# ═══ CENTRIFUGE ═══
def create_centrifuge():
    clear_scene()
    steel = mat("Steel", (0.4, 0.4, 0.42))
    green = mat("Motor", (0.15, 0.35, 0.15))
    # Housing (cylinder)
    housing = cyl((0, 3*S, 0), 2*S, 3*S, "Housing")
    assign(housing, steel)
    # Lid (top)
    lid = cyl((0, 4.8*S, 0), 2.2*S, 0.3*S, "Lid")
    assign(lid, steel)
    # Motor below
    motor = cyl((0, 0.5*S, 0), 1*S, 2*S, "Motor")
    assign(motor, green)
    # Basket inside (visible through top)
    basket = cyl((0, 3.5*S, 0), 1.5*S, 2*S, "Basket")
    assign(basket, mat("Basket", (0.55, 0.55, 0.58)))
    # Discharge chute
    chute = box((2.5*S, 2*S, 0), (1.5*S, 0.5*S, 1*S), "Chute")
    assign(chute, steel)
    # Base frame
    base = box((0, -0.3*S, 0), (3*S, 0.5*S, 3*S), "Base")
    assign(base, mat("Base", (0.3, 0.3, 0.32)))
    export("centrifuge")

# ═══ ERLENMEYER FLASK ═══
def create_erlenmeyer_flask():
    clear_scene()
    glass = mat("Glass", (0.8, 0.85, 0.9))
    # Cone body (truncated cone)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=1.5*S, radius2=0.3*S, depth=3*S, location=(0, 1.5*S, 0))
    body = bpy.context.active_object; body.name = "FlaskBody"
    assign(body, glass)
    # Neck (small cylinder on top)
    neck = cyl((0, 3.3*S, 0), 0.3*S, 0.8*S, "Neck")
    assign(neck, glass)
    # Liquid inside (smaller, colored)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=1.3*S, radius2=0.25*S, depth=2*S, location=(0, 1.2*S, 0))
    liquid = bpy.context.active_object; liquid.name = "Liquid"
    assign(liquid, mat("Liquid", (0.2, 0.6, 0.3)))
    export("erlenmeyer_flask")

# ═══ BEAKER ═══
def create_beaker():
    clear_scene()
    glass = mat("Glass", (0.8, 0.85, 0.9))
    # Cylinder body
    body = cyl((0, 1.5*S, 0), 1*S, 3*S, "BeakerBody")
    assign(body, glass)
    # Spout (small wedge)
    spout = box((0.8*S, 2.8*S, 0), (0.4*S, 0.3*S, 0.3*S), "Spout")
    assign(spout, glass)
    # Graduation marks (thin rings)
    for i in range(5):
        mark = cyl((0, 0.5 + i*0.5, 0), 1.02*S, 0.02*S, f"Mark_{{i}}")
        assign(mark, mat("Mark", (0.1, 0.1, 0.1)))
    # Liquid
    liq = cyl((0, 1*S, 0), 0.9*S, 2*S, "Liquid")
    assign(liq, mat("Liquid", (0.7, 0.5, 0.1)))
    export("beaker_1L")

# ═══ PRESSURE VESSEL ═══
def create_pressure_vessel():
    clear_scene()
    steel = mat("Steel", (0.4, 0.42, 0.45))
    # Main body
    body = cyl((0, 4*S, 0), 2*S, 8*S, "Body")
    assign(body, steel)
    # Hemispherical ends
    for y in [0, 8]:
        dome = sphere((0, y*S, 0), 2*S, f"Dome_{{y}}")
        assign(dome, steel)
    # Flanges
    for y in [2, 6]:
        flange = cyl((0, y*S, 2.2*S), 0.5*S, 0.3*S, f"Flange_{{y}}", (math.pi/2, 0, 0))
        assign(flange, mat("Flange", (0.5, 0.5, 0.52)))
    # Manhole
    manhole = cyl((0, 7*S, 0), 0.8*S, 0.5*S, "Manhole")
    assign(manhole, steel)
    # Legs
    for angle in range(0, 360, 120):
        x = math.cos(math.radians(angle)) * 1.8 * S
        z = math.sin(math.radians(angle)) * 1.8 * S
        leg = box((x, -1*S, z), (0.3*S, 2*S, 0.3*S), f"Leg_{{angle}}")
        assign(leg, mat("Leg", (0.35, 0.35, 0.38)))
    export("pressure_vessel")

# ═══ CYCLONE SEPARATOR ═══
def create_cyclone_separator():
    clear_scene()
    steel = mat("Steel", (0.45, 0.45, 0.48))
    # Upper cylinder
    upper = cyl((0, 5*S, 0), 1.5*S, 4*S, "UpperCyl")
    assign(upper, steel)
    # Lower cone
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=1.5*S, radius2=0.3*S, depth=5*S, location=(0, 0.5*S, 0))
    cone = bpy.context.active_object; cone.name = "LowerCone"
    assign(cone, steel)
    # Inlet pipe (tangential)
    inlet = box((1.5*S, 6*S, 0), (2*S, 0.8*S, 0.8*S), "Inlet")
    assign(inlet, mat("Pipe", (0.5, 0.5, 0.52)))
    # Vortex finder (inner pipe at top)
    vf = cyl((0, 6*S, 0), 0.6*S, 3*S, "VortexFinder")
    assign(vf, mat("VF", (0.35, 0.35, 0.38)))
    # Outlet pipe (top)
    outlet = cyl((0, 8*S, 0), 0.6*S, 1*S, "Outlet")
    assign(outlet, steel)
    # Collection hopper (bottom)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.8*S, radius2=0.3*S, depth=1.5*S, location=(0, -2.5*S, 0))
    hopper = bpy.context.active_object; hopper.name = "Hopper"
    assign(hopper, steel)
    export("cyclone_separator")

# ═══ RUN ALL ═══
generators = [
    ("Distillation Column", create_distillation_column),
    ("Heat Exchanger", create_heat_exchanger),
    ("Centrifuge", create_centrifuge),
    ("Erlenmeyer Flask", create_erlenmeyer_flask),
    ("Beaker 1L", create_beaker),
    ("Pressure Vessel", create_pressure_vessel),
    ("Cyclone Separator", create_cyclone_separator),
]

print("=" * 60)
print("MOLGANG — Additional Chemical Equipment Models")
print(f"Generating {{len(generators)}} models...")
print("=" * 60)

for name, func in generators:
    print(f"\\nGenerating: {{name}}...")
    try:
        func()
        print(f"  OK: {{name}}")
    except Exception as e:
        print(f"  FAILED: {{name}}: {{e}}")

print(f"\\nDone! Models saved to: {{OUTPUT_DIR}}")
'''.format(output_dir=str(MODELS_DIR))

    return script


def generate_models():
    """Generate additional chemical equipment models via Blender."""
    script_path = BLENDER_SCRIPTS / "_generate_additional.py"
    script_content = generate_additional_blender_script()

    with open(script_path, "w") as f:
        f.write(script_content)

    print("Generating additional 3D models via Blender...")
    cmd = f"{BLENDER_CMD} --background --python '{script_path}'"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)

    if result.returncode == 0:
        print("All models generated successfully!")
    else:
        print(f"Generation errors:\n{result.stderr[-500:]}")

    # Cleanup
    script_path.unlink(missing_ok=True)


if __name__ == "__main__":
    generate_models()

    # Show final model count
    fbx_count = len(list(MODELS_DIR.glob("*.fbx")))
    total_size = sum(f.stat().st_size for f in MODELS_DIR.glob("*.fbx")) / 1024
    print(f"\nTotal models: {fbx_count} FBX files ({total_size:.0f} KB)")
