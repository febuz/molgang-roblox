"""
MOLGANG — Advanced Chemical Equipment 3D Models (Batch 3)
More realistic industrial equipment for the ChemEng simulator.

Run: flatpak run --filesystem=/home/knight2 org.blender.Blender --background --python generate_advanced_models.py
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
    if b:
        b.inputs[0].default_value = (*c, 1)
        b.inputs[4].default_value = 0.6
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
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=d, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = nm; return o

def sphere(loc, r, nm):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=r, location=loc)
    o = bpy.context.active_object; o.name = nm; return o

def torus(loc, major, minor, nm):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
        location=loc, major_segments=24, minor_segments=12)
    o = bpy.context.active_object; o.name = nm; return o

# ═══ CENTRIFUGAL PUMP ═══
def create_pump():
    clear()
    steel = mat("PumpSteel", (0.4, 0.42, 0.45))
    green = mat("Motor", (0.15, 0.35, 0.15))
    # Volute casing (spiral shell)
    casing = cyl((0, 1.5*S, 0), 2*S, 1.5*S, "Volute")
    assign(casing, steel)
    # Inlet pipe (axial)
    inlet = cyl((0, 1.5*S, -2.5*S), 0.6*S, 2*S, "Inlet", (math.pi/2, 0, 0))
    assign(inlet, steel)
    # Outlet pipe (tangential, top)
    outlet = cyl((2.5*S, 2*S, 0), 0.5*S, 2*S, "Outlet", (0, 0, math.pi/2))
    assign(outlet, steel)
    # Motor housing
    motor = cyl((0, 1.5*S, 2.5*S), 1.2*S, 3*S, "Motor", (math.pi/2, 0, 0))
    assign(motor, green)
    # Shaft coupling
    coupling = cyl((0, 1.5*S, 1.2*S), 0.4*S, 0.5*S, "Coupling", (math.pi/2, 0, 0))
    assign(coupling, mat("Chrome", (0.6, 0.6, 0.62)))
    # Base plate
    base = box((0, 0, 0.5*S), (4*S, 0.3*S, 5*S), "Base")
    assign(base, mat("Base", (0.3, 0.3, 0.32)))
    # Flanges on pipes
    for pos, rot in [((0, 1.5*S, -3.5*S), (math.pi/2,0,0)), ((3.5*S, 2*S, 0), (0,0,math.pi/2))]:
        f = cyl(pos, 0.8*S, 0.15*S, "Flange", rot)
        assign(f, steel)
    export("centrifugal_pump")

# ═══ GATE VALVE ═══
def create_valve():
    clear()
    steel = mat("ValveSteel", (0.45, 0.45, 0.48))
    red = mat("Handwheel", (0.7, 0.15, 0.1))
    # Body (main block)
    body = box((0, 0, 0), (1.5*S, 2*S, 1.5*S), "Body")
    assign(body, steel)
    # Inlet/outlet pipes
    for z in [-1.5, 1.5]:
        pipe = cyl((0, 0, z*S), 0.5*S, 1.5*S, f"Pipe_{z}", (math.pi/2, 0, 0))
        assign(pipe, steel)
        flange = cyl((0, 0, z*1.8*S), 0.7*S, 0.12*S, f"Flange_{z}", (math.pi/2, 0, 0))
        assign(flange, steel)
    # Bonnet (top extension)
    bonnet = cyl((0, 1.8*S, 0), 0.4*S, 1.5*S, "Bonnet")
    assign(bonnet, steel)
    # Handwheel
    hw = torus((0, 3*S, 0), 0.8*S, 0.1*S, "Handwheel")
    assign(hw, red)
    # Wheel spokes
    for angle in range(0, 360, 90):
        x = math.cos(math.radians(angle)) * 0.6 * S
        z = math.sin(math.radians(angle)) * 0.6 * S
        spoke = cyl((x, 3*S, z), 0.05*S, 1.2*S, f"Spoke_{angle}", (0, 0, math.pi/2))
        spoke.rotation_euler = (0, math.radians(angle), math.pi/2)
        assign(spoke, red)
    # Stem
    stem = cyl((0, 2.2*S, 0), 0.08*S, 1.5*S, "Stem")
    assign(stem, mat("Chrome", (0.6, 0.6, 0.62)))
    export("gate_valve")

# ═══ LAB BENCH ═══
def create_lab_bench():
    clear()
    wood = mat("Countertop", (0.3, 0.25, 0.18))
    metal = mat("Frame", (0.4, 0.4, 0.42))
    white = mat("Sink", (0.85, 0.85, 0.88))
    # Countertop
    top = box((0, 4*S, 0), (10*S, 0.4*S, 3*S), "Countertop")
    assign(top, wood)
    # Legs (4)
    for x in [-4, 4]:
        for z in [-1, 1]:
            leg = box((x*S, 2*S, z*S), (0.3*S, 4*S, 0.3*S), f"Leg_{x}_{z}")
            assign(leg, metal)
    # Lower shelf
    shelf = box((0, 1*S, 0), (9*S, 0.2*S, 2.5*S), "Shelf")
    assign(shelf, metal)
    # Sink (recess in countertop)
    sink = box((3*S, 3.8*S, 0), (1.5*S, 0.5*S, 1.2*S), "Sink")
    assign(sink, white)
    # Faucet
    faucet = cyl((3*S, 5*S, -0.8*S), 0.08*S, 1.5*S, "FaucetPipe")
    assign(faucet, mat("Chrome", (0.6, 0.6, 0.62)))
    faucet_head = cyl((3*S, 5.5*S, -0.3*S), 0.08*S, 1*S, "FaucetHead", (math.pi/3, 0, 0))
    assign(faucet_head, mat("Chrome2", (0.6, 0.6, 0.62)))
    # Equipment on bench: flask rack
    for i in range(3):
        flask = cyl((-3*S + i*1.5*S, 5*S, 0), 0.4*S, 1.5*S, f"Flask_{i}")
        assign(flask, mat(f"Glass_{i}", (0.7+i*0.05, 0.75, 0.85)))
    # Gas burner
    burner = cyl((-1*S, 4.5*S, 0.8*S), 0.3*S, 0.5*S, "Burner")
    assign(burner, metal)
    export("lab_bench")

# ═══ SPRAY DRYER ═══
def create_spray_dryer():
    clear()
    steel = mat("Steel", (0.4, 0.42, 0.45))
    # Main chamber (large cone-bottom cylinder)
    chamber = cyl((0, 6*S, 0), 3.5*S, 8*S, "Chamber")
    assign(chamber, steel)
    # Cone bottom
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=3.5*S, radius2=0.8*S,
        depth=4*S, location=(0, 0, 0))
    cone = bpy.context.active_object; cone.name = "ConeBottom"
    assign(cone, steel)
    # Top dome
    dome = sphere((0, 10.5*S, 0), 3.5*S, "TopDome")
    assign(dome, steel)
    # Atomizer inlet (top center pipe)
    atomizer = cyl((0, 12*S, 0), 0.4*S, 3*S, "Atomizer")
    assign(atomizer, mat("Chrome", (0.6, 0.6, 0.62)))
    # Hot air inlet (side)
    air_in = cyl((3.5*S, 8*S, 0), 0.6*S, 3*S, "AirInlet", (0, 0, math.pi/2))
    assign(air_in, steel)
    # Product outlet (bottom)
    outlet = cyl((0, -2.5*S, 0), 0.5*S, 1.5*S, "ProductOutlet")
    assign(outlet, steel)
    # Exhaust (top side)
    exhaust = cyl((-3*S, 10*S, 0), 0.5*S, 2*S, "Exhaust", (0, 0, -math.pi/4))
    assign(exhaust, steel)
    # Support frame
    for angle in range(0, 360, 120):
        x = math.cos(math.radians(angle)) * 3 * S
        z = math.sin(math.radians(angle)) * 3 * S
        leg = box((x, -3*S, z), (0.3*S, 4*S, 0.3*S), f"Leg_{angle}")
        assign(leg, mat("Frame", (0.35, 0.35, 0.38)))
    export("spray_dryer")

# ═══ SCREW CONVEYOR ═══
def create_screw_conveyor():
    clear()
    steel = mat("Steel", (0.4, 0.42, 0.45))
    # Trough (half-cylinder housing)
    trough = cyl((0, 1.5*S, 0), 1*S, 12*S, "Trough", (0, 0, math.pi/2))
    assign(trough, steel)
    # End plates
    for x in [-6.3, 6.3]:
        plate = cyl((x*S, 1.5*S, 0), 1.1*S, 0.2*S, f"EndPlate_{x}", (0, 0, math.pi/2))
        assign(plate, steel)
    # Screw flights (helical approximation with angled discs)
    for i in range(12):
        x = -5.5 + i * 1.0
        angle = i * 30
        flight = cyl((x*S, 1.5*S, 0), 0.9*S, 0.08*S, f"Flight_{i}", (0, 0, math.pi/2))
        flight.rotation_euler = (math.radians(angle), 0, math.pi/2)
        assign(flight, mat("FlightSteel", (0.5, 0.5, 0.52)))
    # Central shaft
    shaft = cyl((0, 1.5*S, 0), 0.15*S, 13*S, "Shaft", (0, 0, math.pi/2))
    assign(shaft, mat("Chrome", (0.55, 0.55, 0.58)))
    # Motor
    motor = box((7*S, 1.5*S, 0), (1.5*S, 1.5*S, 1.5*S), "Motor")
    assign(motor, mat("Motor", (0.15, 0.35, 0.15)))
    # Feed hopper
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=1.5*S, radius2=0.6*S,
        depth=2*S, location=(-4*S, 3.5*S, 0))
    hopper = bpy.context.active_object; hopper.name = "FeedHopper"
    assign(hopper, steel)
    # Support legs
    for x in [-4, 0, 4]:
        leg = box((x*S, 0.3*S, 0), (0.3*S, 1.5*S, 0.3*S), f"Leg_{x}")
        assign(leg, mat("Frame", (0.35, 0.35, 0.38)))
    export("screw_conveyor")

# ═══ THICKENER TANK ═══
def create_thickener():
    clear()
    concrete = mat("Concrete", (0.5, 0.48, 0.45))
    steel = mat("Steel", (0.4, 0.42, 0.45))
    # Large flat tank
    tank = cyl((0, 2*S, 0), 5*S, 4*S, "Tank")
    assign(tank, concrete)
    # Cone bottom
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=5*S, radius2=1*S,
        depth=3*S, location=(0, -1.5*S, 0))
    cone = bpy.context.active_object; cone.name = "ConeFloor"
    assign(cone, concrete)
    # Central drive column
    column = cyl((0, 5*S, 0), 0.5*S, 6*S, "DriveColumn")
    assign(column, steel)
    # Rake arms (2 long horizontal bars)
    for angle in [0, 180]:
        x = math.cos(math.radians(angle)) * 2.5 * S
        z = math.sin(math.radians(angle)) * 2.5 * S
        arm = box((x, 0.5*S, z), (5*S, 0.2*S, 0.3*S), f"Rake_{angle}")
        arm.rotation_euler = (0, math.radians(angle), 0)
        assign(arm, steel)
    # Overflow weir (rim)
    weir = torus((0, 3.5*S, 0), 5*S, 0.15*S, "OverflowWeir")
    assign(weir, steel)
    # Feed well (center)
    feed = cyl((0, 3.5*S, 0), 1.2*S, 2*S, "FeedWell")
    assign(feed, steel)
    # Walkway/bridge
    bridge = box((0, 4.5*S, 0), (11*S, 0.15*S, 0.8*S), "Walkway")
    assign(bridge, mat("Grating", (0.45, 0.45, 0.48)))
    # Railing
    for side in [-0.5, 0.5]:
        rail = box((0, 5.2*S, side*S), (11*S, 0.1*S, 0.1*S), f"Rail_{side}")
        assign(rail, mat("Yellow", (0.9, 0.75, 0.1)))
    export("thickener_tank")

# ═══ RUN ALL ═══
generators = [
    ("Centrifugal Pump", create_pump),
    ("Gate Valve", create_valve),
    ("Lab Bench", create_lab_bench),
    ("Spray Dryer", create_spray_dryer),
    ("Screw Conveyor", create_screw_conveyor),
    ("Thickener Tank", create_thickener),
]

print("=" * 50)
print("MOLGANG — Advanced Equipment Models (Batch 3)")
print(f"Generating {len(generators)} models...")
print("=" * 50)

for name, func in generators:
    print(f"\nGenerating: {name}...")
    try:
        func()
        print(f"  OK: {name}")
    except Exception as e:
        print(f"  FAILED: {name}: {e}")

print(f"\nDone! Total models: {len([f for f in os.listdir(OUTPUT_DIR) if f.endswith('.fbx')])}")
