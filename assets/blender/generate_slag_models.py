"""
MOLGANG — Industrial 3D Model Generator for Roblox Studio
Generates low-poly FBX models for the Slakkenspoor steel slag processing factory.

Run with: flatpak run org.blender.Blender --background --python generate_slag_models.py

Each model is:
- Low-poly (<5000 triangles) for Roblox performance
- Scaled to Roblox studs (1 unit = 1 stud ≈ 0.28m)
- Exported as .fbx for Roblox Studio import
- Colored with vertex colors or basic materials

Models generated:
1. Jaw Crusher
2. Cone Crusher
3. Ball Mill (rotating drum)
4. Conveyor Belt
5. Leaching Tank / Reactor Vessel
6. HGMS Magnetic Separator Drum
7. Vibrating Screen
8. Cooling Pit
9. Roasting Kiln
10. Filtration Press
11. Storage Silo
12. Anvil & Hammer
13. Slag Chunk (raw material)
14. Pipe Section
"""

import bpy
import bmesh
import math
import os
import sys

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Roblox scale: 1 blender unit = 1 stud ≈ 0.28 meters
STUD = 1.0


def clear_scene():
    """Remove all objects from the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)


def create_material(name, color):
    """Create a simple material with given RGB color (0-1 floats)."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs[0].default_value = (*color, 1.0)  # Base Color
        bsdf.inputs[4].default_value = 0.8  # Roughness (metallic look)
    return mat


def assign_material(obj, mat):
    """Assign material to object."""
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def export_fbx(name):
    """Export selected objects as FBX."""
    filepath = os.path.join(OUTPUT_DIR, f"{name}.fbx")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.fbx(
        filepath=filepath,
        use_selection=True,
        global_scale=1.0,
        apply_unit_scale=True,
        apply_scale_options='FBX_SCALE_ALL',
        axis_forward='-Z',
        axis_up='Y',
        object_types={'MESH'},
        mesh_smooth_type='OFF',
        use_mesh_modifiers=True,
        use_triangles=True,
    )
    print(f"Exported: {filepath}")


def add_cube(location, size, name="Cube"):
    """Add a box at location with given size."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return obj


def add_cylinder(location, radius, depth, name="Cylinder", rotation=(0, 0, 0)):
    """Add a cylinder."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16, radius=radius, depth=depth,
        location=location, rotation=rotation
    )
    obj = bpy.context.active_object
    obj.name = name
    return obj


def add_cone(location, radius1, radius2, depth, name="Cone"):
    """Add a cone/truncated cone."""
    bpy.ops.mesh.primitive_cone_add(
        vertices=16, radius1=radius1, radius2=radius2,
        depth=depth, location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    return obj


# ════════════════════════════════════════════════════
# MODEL 1: JAW CRUSHER
# Two angled steel jaws that crush rock between them
# ════════════════════════════════════════════════════

def create_jaw_crusher():
    clear_scene()
    metal = create_material("CrusherMetal", (0.35, 0.35, 0.38))
    dark_metal = create_material("DarkMetal", (0.15, 0.15, 0.18))
    yellow = create_material("SafetyYellow", (0.9, 0.75, 0.1))

    # Main body frame
    body = add_cube((0, 4*STUD, 0), (6*STUD, 8*STUD, 5*STUD), "CrusherBody")
    assign_material(body, metal)

    # Feed hopper (top, wider)
    hopper = add_cube((0, 9*STUD, 0), (7*STUD, 2*STUD, 6*STUD), "Hopper")
    assign_material(hopper, dark_metal)

    # Left jaw (fixed)
    jaw_l = add_cube((-2*STUD, 4*STUD, 0), (0.5*STUD, 6*STUD, 4*STUD), "JawFixed")
    assign_material(jaw_l, dark_metal)

    # Right jaw (movable, angled)
    jaw_r = add_cube((2*STUD, 4*STUD, 0), (0.5*STUD, 6*STUD, 4*STUD), "JawMovable")
    jaw_r.rotation_euler = (0, 0, math.radians(-8))
    assign_material(jaw_r, dark_metal)

    # Discharge chute (bottom)
    chute = add_cube((0, -0.5*STUD, 0), (4*STUD, 1*STUD, 4*STUD), "Chute")
    assign_material(chute, metal)

    # Flywheel (side)
    wheel = add_cylinder((4*STUD, 5*STUD, 0), 2*STUD, 0.5*STUD, "Flywheel", (0, math.pi/2, 0))
    assign_material(wheel, yellow)

    # Support legs
    for x in [-2.5, 2.5]:
        for z in [-2, 2]:
            leg = add_cube((x*STUD, -1.5*STUD, z*STUD), (0.5*STUD, 2*STUD, 0.5*STUD), f"Leg_{x}_{z}")
            assign_material(leg, metal)

    # Safety stripes frame
    stripe = add_cube((0, 8*STUD, 3*STUD), (7*STUD, 0.3*STUD, 0.3*STUD), "SafetyStripe")
    assign_material(stripe, yellow)

    export_fbx("jaw_crusher")


# ════════════════════════════════════════════════════
# MODEL 2: CONE CRUSHER
# Cone inside a bowl that gyrates to crush material
# ════════════════════════════════════════════════════

def create_cone_crusher():
    clear_scene()
    metal = create_material("Metal", (0.4, 0.4, 0.42))
    inner = create_material("InnerMetal", (0.25, 0.25, 0.28))

    # Outer bowl (truncated cone, wider at top)
    bowl = add_cone((0, 3*STUD, 0), 5*STUD, 3*STUD, 6*STUD, "Bowl")
    assign_material(bowl, metal)

    # Inner mantle cone (inverted)
    mantle = add_cone((0, 4*STUD, 0), 1.5*STUD, 3*STUD, 5*STUD, "Mantle")
    assign_material(mantle, inner)

    # Base platform
    base = add_cylinder((0, -0.5*STUD, 0), 4*STUD, 1*STUD, "Base")
    assign_material(base, metal)

    # Drive shaft (bottom)
    shaft = add_cylinder((0, -2*STUD, 0), 0.8*STUD, 3*STUD, "Shaft")
    assign_material(shaft, inner)

    # Feed rim (top ring)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=5*STUD, minor_radius=0.3*STUD,
        location=(0, 6.5*STUD, 0), major_segments=24, minor_segments=8
    )
    rim = bpy.context.active_object
    rim.name = "FeedRim"
    assign_material(rim, create_material("Yellow", (0.9, 0.8, 0.1)))

    export_fbx("cone_crusher")


# ════════════════════════════════════════════════════
# MODEL 3: BALL MILL
# Rotating horizontal drum filled with steel balls
# ════════════════════════════════════════════════════

def create_ball_mill():
    clear_scene()
    metal = create_material("DrumMetal", (0.3, 0.32, 0.35))
    support = create_material("Support", (0.45, 0.45, 0.48))

    # Main drum (horizontal cylinder)
    drum = add_cylinder((0, 4*STUD, 0), 3.5*STUD, 12*STUD, "Drum", (0, 0, math.pi/2))
    assign_material(drum, metal)

    # End caps (thicker circles)
    for x in [-6.5, 6.5]:
        cap = add_cylinder((x*STUD, 4*STUD, 0), 3.8*STUD, 0.5*STUD, f"EndCap_{x}", (0, 0, math.pi/2))
        assign_material(cap, support)

    # Support cradles
    for x in [-4, 4]:
        cradle = add_cube((x*STUD, 1*STUD, 0), (1*STUD, 4*STUD, 4*STUD), f"Cradle_{x}")
        assign_material(cradle, support)

    # Drive gear (large gear on end)
    gear = add_cylinder((7*STUD, 4*STUD, 0), 4.5*STUD, 0.3*STUD, "DriveGear", (0, 0, math.pi/2))
    assign_material(gear, create_material("GearMetal", (0.2, 0.2, 0.22)))

    # Motor housing
    motor = add_cube((9*STUD, 2*STUD, 0), (2*STUD, 2.5*STUD, 2*STUD), "Motor")
    assign_material(motor, create_material("MotorGreen", (0.15, 0.35, 0.15)))

    # Feed chute (angled tube at one end)
    feed = add_cube((-8*STUD, 6*STUD, 0), (2*STUD, 1*STUD, 1.5*STUD), "FeedChute")
    feed.rotation_euler = (0, 0, math.radians(30))
    assign_material(feed, metal)

    export_fbx("ball_mill")


# ════════════════════════════════════════════════════
# MODEL 4: CONVEYOR BELT
# Flat belt on rollers with side rails
# ════════════════════════════════════════════════════

def create_conveyor_belt():
    clear_scene()
    frame = create_material("Frame", (0.35, 0.35, 0.38))
    belt_mat = create_material("Belt", (0.12, 0.12, 0.14))
    roller_mat = create_material("Roller", (0.5, 0.5, 0.52))

    belt_length = 16 * STUD
    belt_width = 3 * STUD

    # Belt surface
    belt = add_cube((0, 3*STUD, 0), (belt_length, 0.2*STUD, belt_width), "Belt")
    assign_material(belt, belt_mat)

    # Side rails
    for z in [-1.7, 1.7]:
        rail = add_cube((0, 3.5*STUD, z*STUD), (belt_length, 1*STUD, 0.2*STUD), f"Rail_{z}")
        assign_material(rail, frame)

    # Support frame (A-frame legs)
    for x_off in [-6, -2, 2, 6]:
        leg = add_cube((x_off*STUD, 1.5*STUD, 0), (0.3*STUD, 3*STUD, 2.5*STUD), f"Leg_{x_off}")
        assign_material(leg, frame)

    # Rollers
    for x_off in range(-7, 8, 2):
        roller = add_cylinder((x_off*STUD, 2.7*STUD, 0), 0.4*STUD, belt_width, f"Roller_{x_off}", (math.pi/2, 0, 0))
        assign_material(roller, roller_mat)

    # Head pulley (larger roller at end)
    head = add_cylinder((8*STUD, 3*STUD, 0), 0.8*STUD, belt_width + 0.5*STUD, "HeadPulley", (math.pi/2, 0, 0))
    assign_material(head, roller_mat)

    export_fbx("conveyor_belt")


# ════════════════════════════════════════════════════
# MODEL 5: LEACHING TANK / REACTOR VESSEL
# Large cylindrical tank with agitator and pipes
# ════════════════════════════════════════════════════

def create_leaching_tank():
    clear_scene()
    tank_mat = create_material("TankMetal", (0.4, 0.42, 0.45))
    liquid = create_material("AcidLiquid", (0.8, 0.7, 0.1))  # yellowish acid
    pipe = create_material("Pipe", (0.5, 0.5, 0.52))

    # Main tank body
    tank = add_cylinder((0, 5*STUD, 0), 4*STUD, 10*STUD, "TankBody")
    assign_material(tank, tank_mat)

    # Tank top (slightly wider cap)
    cap = add_cylinder((0, 10.5*STUD, 0), 4.3*STUD, 0.5*STUD, "TankCap")
    assign_material(cap, tank_mat)

    # Tank bottom (cone for drainage)
    bottom = add_cone((0, -0.5*STUD, 0), 4*STUD, 1*STUD, 2*STUD, "TankBottom")
    assign_material(bottom, tank_mat)

    # Liquid level indicator (transparent-ish cylinder inside)
    liq = add_cylinder((0, 4*STUD, 0), 3.8*STUD, 7*STUD, "Liquid")
    assign_material(liq, liquid)

    # Agitator shaft (vertical through center)
    shaft = add_cylinder((0, 7*STUD, 0), 0.3*STUD, 14*STUD, "AgitatorShaft")
    assign_material(shaft, pipe)

    # Agitator blades (2 sets)
    for y in [3, 6]:
        blade = add_cube((0, y*STUD, 0), (6*STUD, 0.2*STUD, 0.8*STUD), f"Blade_{y}")
        assign_material(blade, pipe)

    # Motor on top
    motor = add_cylinder((0, 12*STUD, 0), 1.2*STUD, 2*STUD, "Motor")
    assign_material(motor, create_material("MotorGreen", (0.15, 0.4, 0.15)))

    # Input pipe (side)
    in_pipe = add_cylinder((4.5*STUD, 8*STUD, 0), 0.4*STUD, 3*STUD, "InputPipe", (0, 0, math.pi/2))
    assign_material(in_pipe, pipe)

    # Output valve (bottom)
    valve = add_cylinder((0, -2*STUD, 0), 0.5*STUD, 1*STUD, "OutputValve")
    assign_material(valve, create_material("ValveRed", (0.7, 0.15, 0.1)))

    # Support legs (4)
    for angle in range(0, 360, 90):
        x = math.cos(math.radians(angle)) * 3.5 * STUD
        z = math.sin(math.radians(angle)) * 3.5 * STUD
        leg = add_cube((x, -2*STUD, z), (0.5*STUD, 3*STUD, 0.5*STUD), f"TankLeg_{angle}")
        assign_material(leg, tank_mat)

    export_fbx("leaching_tank")


# ════════════════════════════════════════════════════
# MODEL 6: MAGNETIC SEPARATOR DRUM
# Large rotating drum with magnets inside
# ════════════════════════════════════════════════════

def create_magnetic_separator():
    clear_scene()
    drum_mat = create_material("DrumSteel", (0.3, 0.3, 0.33))
    magnet = create_material("MagnetRed", (0.7, 0.1, 0.1))
    frame_mat = create_material("Frame", (0.4, 0.4, 0.42))

    # Main drum
    drum = add_cylinder((0, 4*STUD, 0), 3*STUD, 6*STUD, "SeparatorDrum", (math.pi/2, 0, 0))
    assign_material(drum, drum_mat)

    # Magnetic poles (red bands around drum)
    for i in range(4):
        angle = i * math.pi / 2
        x = math.cos(angle) * 3.2 * STUD
        y = 4*STUD + math.sin(angle) * 3.2 * STUD
        pole = add_cube((x, y, 0), (0.5*STUD, 0.5*STUD, 6.5*STUD), f"MagPole_{i}")
        assign_material(pole, magnet)

    # Support frame
    for z in [-3.5, 3.5]:
        support = add_cube((0, 2*STUD, z*STUD), (7*STUD, 0.5*STUD, 0.5*STUD), f"Support_{z}")
        assign_material(support, frame_mat)
        for x in [-3, 3]:
            leg = add_cube((x*STUD, 0.5*STUD, z*STUD), (0.5*STUD, 3*STUD, 0.5*STUD), f"Leg_{x}_{z}")
            assign_material(leg, frame_mat)

    # Feed tray (top)
    tray = add_cube((0, 7.5*STUD, 0), (4*STUD, 0.3*STUD, 5*STUD), "FeedTray")
    assign_material(tray, frame_mat)

    # Collection bins (left = magnetic, right = non-magnetic)
    bin_l = add_cube((-4*STUD, 1.5*STUD, 0), (2*STUD, 3*STUD, 4*STUD), "BinMagnetic")
    assign_material(bin_l, magnet)
    bin_r = add_cube((4*STUD, 1.5*STUD, 0), (2*STUD, 3*STUD, 4*STUD), "BinNonMag")
    assign_material(bin_r, create_material("GreenBin", (0.1, 0.5, 0.2)))

    export_fbx("magnetic_separator")


# ════════════════════════════════════════════════════
# MODEL 7: VIBRATING SCREEN
# Inclined mesh deck on springs
# ════════════════════════════════════════════════════

def create_vibrating_screen():
    clear_scene()
    frame_mat = create_material("Frame", (0.35, 0.38, 0.4))
    screen_mat = create_material("Screen", (0.5, 0.5, 0.52))
    spring_mat = create_material("Spring", (0.8, 0.6, 0.1))

    # Screen deck (slightly angled)
    deck = add_cube((0, 4*STUD, 0), (10*STUD, 0.3*STUD, 5*STUD), "ScreenDeck")
    deck.rotation_euler = (math.radians(-10), 0, 0)
    assign_material(deck, screen_mat)

    # Side walls
    for z in [-2.8, 2.8]:
        wall = add_cube((0, 4.5*STUD, z*STUD), (10*STUD, 1.5*STUD, 0.2*STUD), f"Wall_{z}")
        wall.rotation_euler = (math.radians(-10), 0, 0)
        assign_material(wall, frame_mat)

    # Spring supports (4 corners)
    for x in [-4, 4]:
        for z in [-2.2, 2.2]:
            spring = add_cylinder((x*STUD, 2*STUD, z*STUD), 0.3*STUD, 2*STUD, f"Spring_{x}_{z}")
            assign_material(spring, spring_mat)

    # Base frame
    base = add_cube((0, 0.5*STUD, 0), (11*STUD, 1*STUD, 6*STUD), "Base")
    assign_material(base, frame_mat)

    # Motor (vibration eccentric)
    motor = add_cube((5*STUD, 5*STUD, 3.5*STUD), (1.5*STUD, 1.5*STUD, 1*STUD), "VibroMotor")
    assign_material(motor, create_material("MotorGreen", (0.15, 0.4, 0.15)))

    export_fbx("vibrating_screen")


# ════════════════════════════════════════════════════
# MODEL 8: COOLING PIT
# Rectangular concrete pit with slag inside
# ════════════════════════════════════════════════════

def create_cooling_pit():
    clear_scene()
    concrete = create_material("Concrete", (0.45, 0.43, 0.4))
    slag_hot = create_material("HotSlag", (0.6, 0.25, 0.05))
    ground = create_material("Ground", (0.25, 0.22, 0.18))

    # Pit walls (4 sides, open top)
    for name, pos, size in [
        ("WallN", (0, 1*STUD, -5*STUD), (12*STUD, 3*STUD, 0.5*STUD)),
        ("WallS", (0, 1*STUD, 5*STUD), (12*STUD, 3*STUD, 0.5*STUD)),
        ("WallE", (6*STUD, 1*STUD, 0), (0.5*STUD, 3*STUD, 10*STUD)),
        ("WallW", (-6*STUD, 1*STUD, 0), (0.5*STUD, 3*STUD, 10*STUD)),
    ]:
        wall = add_cube(pos, size, name)
        assign_material(wall, concrete)

    # Pit floor (slightly below ground)
    floor = add_cube((0, -0.5*STUD, 0), (11*STUD, 0.5*STUD, 9.5*STUD), "PitFloor")
    assign_material(floor, concrete)

    # Hot slag mass inside (lumpy surface)
    slag = add_cube((0, 0.8*STUD, 0), (10*STUD, 1.5*STUD, 8*STUD), "HotSlag")
    assign_material(slag, slag_hot)

    # Surrounding ground
    gnd = add_cube((0, -0.8*STUD, 0), (20*STUD, 0.3*STUD, 16*STUD), "Ground")
    assign_material(gnd, ground)

    export_fbx("cooling_pit")


# ════════════════════════════════════════════════════
# MODEL 9: ROASTING KILN
# Rotary kiln (long tilted cylinder)
# ════════════════════════════════════════════════════

def create_roasting_kiln():
    clear_scene()
    kiln_mat = create_material("KilnSteel", (0.35, 0.3, 0.28))
    brick = create_material("FireBrick", (0.65, 0.25, 0.1))
    support_mat = create_material("Support", (0.4, 0.4, 0.42))

    # Main rotary drum (tilted)
    drum = add_cylinder((0, 5*STUD, 0), 2.5*STUD, 14*STUD, "KilnDrum", (0, 0, math.radians(85)))
    assign_material(drum, kiln_mat)

    # Fire brick lining (visible at ends — smaller cylinder)
    for x in [-7, 7]:
        lining = add_cylinder((x*STUD * 0.98, 5*STUD + x*0.09, 0), 2.3*STUD, 0.5*STUD, f"Lining_{x}", (0, 0, math.radians(85)))
        assign_material(lining, brick)

    # Support rings (riding rings)
    for x in [-4, 0, 4]:
        bpy.ops.mesh.primitive_torus_add(
            major_radius=2.7*STUD, minor_radius=0.2*STUD,
            location=(x*STUD * 0.98, 5*STUD + x*0.09, 0),
            major_segments=24, minor_segments=8
        )
        ring = bpy.context.active_object
        ring.name = f"RidingRing_{x}"
        ring.rotation_euler = (0, 0, math.radians(85))
        assign_material(ring, support_mat)

    # Support cradles
    for x in [-4, 0, 4]:
        cradle = add_cube((x*STUD * 0.98, 2*STUD, 0), (1.5*STUD, 4*STUD, 3*STUD), f"Cradle_{x}")
        assign_material(cradle, support_mat)

    # Burner housing (at lower end)
    burner = add_cylinder((8*STUD, 4.5*STUD, 0), 2*STUD, 2*STUD, "BurnerHousing")
    assign_material(burner, brick)

    # Exhaust hood (at upper end)
    hood = add_cone((-8*STUD, 6*STUD, 0), 3*STUD, 1*STUD, 3*STUD, "ExhaustHood")
    assign_material(hood, kiln_mat)

    export_fbx("roasting_kiln")


# ════════════════════════════════════════════════════
# MODEL 10: STORAGE SILO
# Tall cylinder with cone bottom and ladder
# ════════════════════════════════════════════════════

def create_storage_silo():
    clear_scene()
    silo_mat = create_material("SiloMetal", (0.55, 0.55, 0.58))
    cone_mat = create_material("ConeMetal", (0.45, 0.45, 0.48))
    ladder_mat = create_material("Ladder", (0.3, 0.3, 0.32))

    # Main body
    body = add_cylinder((0, 8*STUD, 0), 3*STUD, 12*STUD, "SiloBody")
    assign_material(body, silo_mat)

    # Cone top
    top = add_cone((0, 15*STUD, 0), 3*STUD, 0.3*STUD, 3*STUD, "SiloTop")
    assign_material(top, cone_mat)

    # Cone bottom (hopper)
    bottom = add_cone((0, 1*STUD, 0), 3*STUD, 0.8*STUD, 3*STUD, "SiloBottom")
    assign_material(bottom, cone_mat)

    # Discharge valve
    valve = add_cylinder((0, -1*STUD, 0), 0.5*STUD, 1.5*STUD, "Valve")
    assign_material(valve, create_material("ValveRed", (0.7, 0.1, 0.1)))

    # Support legs (4)
    for angle in range(0, 360, 90):
        x = math.cos(math.radians(angle)) * 2.5 * STUD
        z = math.sin(math.radians(angle)) * 2.5 * STUD
        leg = add_cube((x, -1*STUD, z), (0.3*STUD, 3*STUD, 0.3*STUD), f"Leg_{angle}")
        assign_material(leg, ladder_mat)

    # Ladder (rungs along side)
    for y_off in range(0, 14, 2):
        rung = add_cube((3.3*STUD, (2 + y_off)*STUD, 0), (0.3*STUD, 0.15*STUD, 0.8*STUD), f"Rung_{y_off}")
        assign_material(rung, ladder_mat)

    # Side rails
    for z in [-0.35, 0.35]:
        rail = add_cube((3.3*STUD, 8*STUD, z*STUD), (0.1*STUD, 14*STUD, 0.1*STUD), f"LadderRail_{z}")
        assign_material(rail, ladder_mat)

    export_fbx("storage_silo")


# ════════════════════════════════════════════════════
# MODEL 11: SLAG CHUNK (raw material)
# Rough rocky piece
# ════════════════════════════════════════════════════

def create_slag_chunk():
    clear_scene()
    slag_mat = create_material("SlagRock", (0.28, 0.24, 0.2))

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.5*STUD, location=(0, 1.5*STUD, 0))
    chunk = bpy.context.active_object
    chunk.name = "SlagChunk"

    # Deform to look rocky
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(chunk.data)
    import random
    random.seed(42)
    for v in bm.verts:
        v.co.x += random.uniform(-0.3, 0.3) * STUD
        v.co.y += random.uniform(-0.2, 0.3) * STUD
        v.co.z += random.uniform(-0.3, 0.3) * STUD
    bmesh.update_edit_mesh(chunk.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    assign_material(chunk, slag_mat)

    # Add a few smaller chunks nearby
    for i in range(3):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=(0.5 + i*0.2)*STUD,
            location=((i-1)*2*STUD, 0.8*STUD, (i-1)*STUD))
        small = bpy.context.active_object
        small.name = f"SmallChunk_{i}"
        assign_material(small, slag_mat)

    export_fbx("slag_chunk")


# ════════════════════════════════════════════════════
# MODEL 12: ANVIL AND HAMMER
# For manual slag crushing station
# ════════════════════════════════════════════════════

def create_anvil_hammer():
    clear_scene()
    anvil_mat = create_material("AnvilIron", (0.18, 0.18, 0.2))
    wood_mat = create_material("Wood", (0.4, 0.25, 0.12))
    steel_mat = create_material("SteelHead", (0.35, 0.35, 0.38))

    # Anvil body
    body = add_cube((0, 2*STUD, 0), (3*STUD, 2*STUD, 2*STUD), "AnvilBody")
    assign_material(body, anvil_mat)

    # Anvil face (flat top, wider)
    face = add_cube((0, 3.2*STUD, 0), (4*STUD, 0.5*STUD, 2.5*STUD), "AnvilFace")
    assign_material(face, anvil_mat)

    # Anvil horn (pointed end)
    horn = add_cone((2.5*STUD, 3*STUD, 0), 0.8*STUD, 0.1*STUD, 2*STUD, "AnvilHorn")
    horn.rotation_euler = (0, 0, math.pi/2)
    assign_material(horn, anvil_mat)

    # Anvil base (stump)
    stump = add_cylinder((0, 0.5*STUD, 0), 2*STUD, 1.5*STUD, "Stump")
    assign_material(stump, wood_mat)

    # Hammer handle
    handle = add_cube((5*STUD, 3*STUD, 0), (0.3*STUD, 4*STUD, 0.3*STUD), "HammerHandle")
    handle.rotation_euler = (0, 0, math.radians(-20))
    assign_material(handle, wood_mat)

    # Hammer head
    head = add_cube((4.3*STUD, 5.2*STUD, 0), (1.2*STUD, 1.2*STUD, 0.8*STUD), "HammerHead")
    head.rotation_euler = (0, 0, math.radians(-20))
    assign_material(head, steel_mat)

    export_fbx("anvil_hammer")


# ════════════════════════════════════════════════════
# MODEL 13: PIPE SECTION (for connecting equipment)
# ════════════════════════════════════════════════════

def create_pipe_section():
    clear_scene()
    pipe_mat = create_material("PipeMetal", (0.5, 0.5, 0.52))
    flange_mat = create_material("Flange", (0.4, 0.4, 0.42))

    # Straight pipe
    pipe = add_cylinder((0, 0, 0), 0.5*STUD, 8*STUD, "Pipe", (0, 0, math.pi/2))
    assign_material(pipe, pipe_mat)

    # Flanges at ends
    for x in [-4.2, 4.2]:
        flange = add_cylinder((x*STUD, 0, 0), 0.8*STUD, 0.3*STUD, f"Flange_{x}", (0, 0, math.pi/2))
        assign_material(flange, flange_mat)

    # Elbow version (separate object)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=2*STUD, minor_radius=0.5*STUD,
        location=(0, 6*STUD, 0), major_segments=8, minor_segments=8
    )
    elbow = bpy.context.active_object
    elbow.name = "PipeElbow"

    # Only keep quarter of torus
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(elbow.data)
    verts_to_delete = [v for v in bm.verts if v.co.x < -0.1 or v.co.y < 5.8]
    bmesh.ops.delete(bm, geom=verts_to_delete, context='VERTS')
    bmesh.update_edit_mesh(elbow.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    assign_material(elbow, pipe_mat)

    export_fbx("pipe_section")


# ════════════════════════════════════════════════════
# MODEL 14: FILTRATION PRESS
# Stack of plates that squeeze liquid from solids
# ════════════════════════════════════════════════════

def create_filtration_press():
    clear_scene()
    frame_mat = create_material("Frame", (0.3, 0.4, 0.6))
    plate_mat = create_material("Plate", (0.55, 0.55, 0.58))
    hydraulic = create_material("Hydraulic", (0.7, 0.15, 0.1))

    # Frame rails (horizontal)
    for y in [0, 6]:
        for z in [-2.5, 2.5]:
            rail = add_cube((0, (0.5 + y)*STUD, z*STUD), (14*STUD, 0.4*STUD, 0.4*STUD), f"Rail_{y}_{z}")
            assign_material(rail, frame_mat)

    # End plates (thick, on both sides)
    for x in [-7, 7]:
        end_plate = add_cube((x*STUD, 3.5*STUD, 0), (0.8*STUD, 6*STUD, 5*STUD), f"EndPlate_{x}")
        assign_material(end_plate, frame_mat)

    # Filter plates (series of thin plates)
    for i in range(-5, 6):
        plate = add_cube((i*STUD, 3.5*STUD, 0), (0.3*STUD, 5*STUD, 4.5*STUD), f"FilterPlate_{i}")
        assign_material(plate, plate_mat)

    # Hydraulic cylinder
    hyd_cyl = add_cylinder((-8.5*STUD, 3.5*STUD, 0), 0.6*STUD, 3*STUD, "HydCylinder", (0, 0, math.pi/2))
    assign_material(hyd_cyl, hydraulic)

    # Drip tray (bottom)
    tray = add_cube((0, -0.5*STUD, 0), (12*STUD, 0.3*STUD, 6*STUD), "DripTray")
    assign_material(tray, create_material("Tray", (0.4, 0.4, 0.42)))

    export_fbx("filtration_press")


# ════════════════════════════════════════════════════
# GENERATE ALL MODELS
# ════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("MOLGANG — Industrial 3D Model Generator")
    print("Generating 14 low-poly FBX models for Roblox Studio...")
    print("=" * 60)

    generators = [
        ("Jaw Crusher", create_jaw_crusher),
        ("Cone Crusher", create_cone_crusher),
        ("Ball Mill", create_ball_mill),
        ("Conveyor Belt", create_conveyor_belt),
        ("Leaching Tank", create_leaching_tank),
        ("Magnetic Separator", create_magnetic_separator),
        ("Vibrating Screen", create_vibrating_screen),
        ("Cooling Pit", create_cooling_pit),
        ("Roasting Kiln", create_roasting_kiln),
        ("Storage Silo", create_storage_silo),
        ("Slag Chunk", create_slag_chunk),
        ("Anvil & Hammer", create_anvil_hammer),
        ("Pipe Section", create_pipe_section),
        ("Filtration Press", create_filtration_press),
    ]

    for name, gen_func in generators:
        print(f"\nGenerating: {name}...")
        try:
            gen_func()
            print(f"  ✓ {name} exported successfully")
        except Exception as e:
            print(f"  ✗ {name} FAILED: {e}")

    print("\n" + "=" * 60)
    print(f"Done! Models saved to: {OUTPUT_DIR}")
    print(f"Import into Roblox Studio: Game > Import 3D > select .fbx")
    print("=" * 60)
