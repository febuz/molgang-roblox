#!/usr/bin/env python3
"""
MOLGANG — GPU Work Scheduler
Utilizes 2x RTX 3090 (48GB total VRAM) for continuous rendering and processing.

Jobs are queued in a JSON file and processed 24/7:
1. Blender rendering (model previews, scene renders)
2. Image-to-3D reconstruction (TripoSR/InstantMesh)
3. Mesh optimization (decimation, UV unwrapping)
4. FreeCAD→Blender→FBX conversion
5. Batch texture baking

Usage:
    python3 gpu_scheduler.py                    # Start the scheduler daemon
    python3 gpu_scheduler.py --add-render model.blend
    python3 gpu_scheduler.py --add-convert model.obj
    python3 gpu_scheduler.py --add-image2mesh photo.jpg
    python3 gpu_scheduler.py --status
    python3 gpu_scheduler.py --queue

Requires: Blender 5.1 (Flatpak), Python 3.12, CUDA drivers
"""

import json
import os
import sys
import time
import subprocess
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# ═══════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════

BASE_DIR = Path(__file__).parent.parent  # assets/
QUEUE_FILE = BASE_DIR / "pipeline" / "job_queue.json"
LOG_FILE = BASE_DIR / "pipeline" / "scheduler.log"
MODELS_DIR = BASE_DIR / "models"
RENDERS_DIR = BASE_DIR / "renders"
DOWNLOADS_DIR = BASE_DIR / "downloads"

BLENDER_CMD = "flatpak run --filesystem=/home/knight2 org.blender.Blender"
BLENDER_SCRIPT_DIR = BASE_DIR / "blender"

# GPU assignment (distribute work across both 3090s)
GPU_0 = "0"  # First RTX 3090
GPU_1 = "1"  # Second RTX 3090

# Job types and their GPU requirements
JOB_TYPES = {
    "blender_render": {"gpu": GPU_0, "priority": 3, "est_minutes": 5},
    "blender_convert": {"gpu": GPU_0, "priority": 2, "est_minutes": 2},
    "image_to_3d": {"gpu": GPU_1, "priority": 4, "est_minutes": 10},
    "mesh_optimize": {"gpu": GPU_0, "priority": 1, "est_minutes": 1},
    "texture_bake": {"gpu": GPU_1, "priority": 3, "est_minutes": 8},
    "batch_fbx_export": {"gpu": GPU_0, "priority": 2, "est_minutes": 3},
    "freecad_convert": {"gpu": "cpu", "priority": 1, "est_minutes": 2},
}

# ═══════════════════════════════════════════════
# QUEUE MANAGEMENT
# ═══════════════════════════════════════════════

def load_queue():
    if QUEUE_FILE.exists():
        with open(QUEUE_FILE) as f:
            return json.load(f)
    return {"jobs": [], "completed": [], "stats": {"total_jobs": 0, "gpu_hours": 0}}

def save_queue(queue):
    QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f, indent=2, default=str)

def add_job(job_type, input_path, output_path=None, params=None):
    queue = load_queue()
    job_config = JOB_TYPES.get(job_type)
    if not job_config:
        print(f"Unknown job type: {job_type}")
        return

    job = {
        "id": f"job_{queue['stats']['total_jobs'] + 1}_{int(time.time())}",
        "type": job_type,
        "input": str(input_path),
        "output": str(output_path or ""),
        "params": params or {},
        "gpu": job_config["gpu"],
        "priority": job_config["priority"],
        "est_minutes": job_config["est_minutes"],
        "status": "queued",
        "created": datetime.now().isoformat(),
        "started": None,
        "completed": None,
    }

    queue["jobs"].append(job)
    queue["stats"]["total_jobs"] += 1
    save_queue(queue)
    print(f"Added job: {job['id']} ({job_type}) — Input: {input_path}")
    return job["id"]

def get_next_job(gpu_filter=None):
    queue = load_queue()
    # Sort by priority (higher = more important), then by creation time
    queued = [j for j in queue["jobs"] if j["status"] == "queued"]
    if gpu_filter:
        queued = [j for j in queued if j["gpu"] == gpu_filter]
    queued.sort(key=lambda j: (-j["priority"], j["created"]))
    return queued[0] if queued else None

# ═══════════════════════════════════════════════
# JOB EXECUTORS
# ═══════════════════════════════════════════════

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

def execute_blender_render(job):
    """Render a Blender scene to image using GPU."""
    input_file = job["input"]
    output_file = job["output"] or str(RENDERS_DIR / (Path(input_file).stem + ".png"))

    cmd = (
        f"CUDA_VISIBLE_DEVICES={job['gpu']} {BLENDER_CMD} "
        f"--background '{input_file}' "
        f"--render-output '{output_file}' "
        f"--render-frame 1 "
        f"--engine CYCLES "
        f"-- --cycles-device CUDA"
    )
    log(f"Rendering: {input_file} → {output_file} (GPU {job['gpu']})")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=600)
    return result.returncode == 0

def execute_blender_convert(job):
    """Convert a 3D model to Roblox-compatible FBX via Blender."""
    input_file = job["input"]
    output_file = job["output"] or str(MODELS_DIR / (Path(input_file).stem + ".fbx"))
    decimate_ratio = job["params"].get("decimate", 0.5)

    # Blender Python script for conversion
    convert_script = f'''
import bpy
import sys

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import source model
ext = "{Path(input_file).suffix.lower()}"
if ext == ".obj":
    bpy.ops.wm.obj_import(filepath="{input_file}")
elif ext == ".gltf" or ext == ".glb":
    bpy.ops.import_scene.gltf(filepath="{input_file}")
elif ext == ".stl":
    bpy.ops.import_mesh.stl(filepath="{input_file}")
elif ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath="{input_file}")

# Select all meshes
bpy.ops.object.select_all(action='SELECT')

# Decimate for Roblox performance
for obj in bpy.context.selected_objects:
    if obj.type == 'MESH':
        mod = obj.modifiers.new("Decimate", 'DECIMATE')
        mod.ratio = {decimate_ratio}
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier="Decimate")

# Scale to Roblox studs (1 unit = 1 stud)
# Auto-scale based on bounding box
max_dim = max(max(obj.dimensions) for obj in bpy.context.selected_objects if obj.type == 'MESH')
if max_dim > 0:
    target_size = {job["params"].get("target_studs", 10)}
    scale_factor = target_size / max_dim
    for obj in bpy.context.selected_objects:
        obj.scale *= scale_factor
    bpy.ops.object.transform_apply(scale=True)

# Export FBX
bpy.ops.export_scene.fbx(
    filepath="{output_file}",
    use_selection=True,
    global_scale=1.0,
    apply_unit_scale=True,
    object_types={{"MESH"}},
    mesh_smooth_type='OFF',
    use_triangles=True,
)
print(f"Exported: {output_file}")
'''
    script_path = BLENDER_SCRIPT_DIR / "_temp_convert.py"
    with open(script_path, "w") as f:
        f.write(convert_script)

    cmd = f"{BLENDER_CMD} --background --python '{script_path}'"
    log(f"Converting: {input_file} → {output_file}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
    script_path.unlink(missing_ok=True)
    return result.returncode == 0

def execute_mesh_optimize(job):
    """Optimize mesh: decimate, clean, and re-export."""
    return execute_blender_convert(job)  # Same pipeline with different decimate ratio

def execute_batch_fbx_export(job):
    """Re-export all models in a directory as FBX."""
    input_dir = Path(job["input"])
    output_dir = Path(job["output"] or str(MODELS_DIR))
    count = 0
    for model_file in input_dir.glob("*.obj"):
        sub_job = {
            "input": str(model_file),
            "output": str(output_dir / (model_file.stem + ".fbx")),
            "params": job.get("params", {}),
            "gpu": job["gpu"],
        }
        if execute_blender_convert(sub_job):
            count += 1
    log(f"Batch exported {count} models from {input_dir}")
    return count > 0

# Job executor dispatch
EXECUTORS = {
    "blender_render": execute_blender_render,
    "blender_convert": execute_blender_convert,
    "mesh_optimize": execute_mesh_optimize,
    "batch_fbx_export": execute_batch_fbx_export,
}

# ═══════════════════════════════════════════════
# SCHEDULER LOOP
# ═══════════════════════════════════════════════

def run_scheduler():
    """Main scheduler loop — runs continuously, processing queued jobs."""
    log("=" * 60)
    log("MOLGANG GPU Scheduler started")
    log(f"GPUs: RTX 3090 ×2 (GPU 0 + GPU 1)")
    log(f"Queue file: {QUEUE_FILE}")
    log("=" * 60)

    while True:
        queue = load_queue()

        # Try to find a job for each GPU
        for gpu in [GPU_0, GPU_1]:
            job = get_next_job(gpu_filter=gpu)
            if not job:
                job = get_next_job(gpu_filter="cpu")  # CPU jobs can run on any

            if job:
                # Mark as running
                job["status"] = "running"
                job["started"] = datetime.now().isoformat()
                save_queue(queue)

                log(f"Starting job: {job['id']} ({job['type']}) on GPU {gpu}")

                # Execute
                executor = EXECUTORS.get(job["type"])
                if executor:
                    try:
                        success = executor(job)
                        job["status"] = "completed" if success else "failed"
                    except Exception as e:
                        job["status"] = "failed"
                        log(f"Job {job['id']} failed: {e}")
                else:
                    job["status"] = "failed"
                    log(f"No executor for job type: {job['type']}")

                job["completed"] = datetime.now().isoformat()

                # Move to completed list
                queue["jobs"] = [j for j in queue["jobs"] if j["id"] != job["id"]]
                queue["completed"].append(job)

                # Update GPU hours
                if job["started"] and job["completed"]:
                    start = datetime.fromisoformat(job["started"])
                    end = datetime.fromisoformat(job["completed"])
                    hours = (end - start).total_seconds() / 3600
                    queue["stats"]["gpu_hours"] += hours

                save_queue(queue)
                log(f"Job {job['id']} {job['status']}")

        # Sleep between checks (don't spin CPU)
        time.sleep(5)

# ═══════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════

def show_status():
    queue = load_queue()
    queued = [j for j in queue["jobs"] if j["status"] == "queued"]
    running = [j for j in queue["jobs"] if j["status"] == "running"]
    completed = queue.get("completed", [])

    print(f"\n{'='*50}")
    print(f"  MOLGANG GPU Scheduler Status")
    print(f"{'='*50}")
    print(f"  Queued:    {len(queued)}")
    print(f"  Running:   {len(running)}")
    print(f"  Completed: {len(completed)}")
    print(f"  Total jobs: {queue['stats']['total_jobs']}")
    print(f"  GPU hours: {queue['stats']['gpu_hours']:.2f}")
    print(f"{'='*50}")

    if running:
        print("\n  RUNNING:")
        for j in running:
            print(f"    {j['id']} | {j['type']} | GPU {j['gpu']} | {j['input']}")

    if queued:
        print(f"\n  QUEUE ({len(queued)} jobs):")
        for j in queued[:10]:
            print(f"    {j['id']} | {j['type']} | P{j['priority']} | {j['input']}")
        if len(queued) > 10:
            print(f"    ... and {len(queued) - 10} more")

def main():
    parser = argparse.ArgumentParser(description="MOLGANG GPU Work Scheduler")
    parser.add_argument("--status", action="store_true", help="Show queue status")
    parser.add_argument("--queue", action="store_true", help="List all queued jobs")
    parser.add_argument("--add-render", metavar="FILE", help="Add Blender render job")
    parser.add_argument("--add-convert", metavar="FILE", help="Add 3D→FBX conversion job")
    parser.add_argument("--add-batch", metavar="DIR", help="Add batch export directory")
    parser.add_argument("--add-image2mesh", metavar="FILE", help="Add image→3D reconstruction job")
    parser.add_argument("--target-studs", type=float, default=10, help="Target size in Roblox studs")
    parser.add_argument("--decimate", type=float, default=0.5, help="Mesh decimation ratio (0-1)")
    parser.add_argument("--daemon", action="store_true", help="Run scheduler daemon")

    args = parser.parse_args()

    if args.status or args.queue:
        show_status()
    elif args.add_render:
        add_job("blender_render", args.add_render)
    elif args.add_convert:
        add_job("blender_convert", args.add_convert, params={
            "target_studs": args.target_studs,
            "decimate": args.decimate,
        })
    elif args.add_batch:
        add_job("batch_fbx_export", args.add_batch, params={
            "target_studs": args.target_studs,
            "decimate": args.decimate,
        })
    elif args.add_image2mesh:
        add_job("image_to_3d", args.add_image2mesh)
    elif args.daemon:
        run_scheduler()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
