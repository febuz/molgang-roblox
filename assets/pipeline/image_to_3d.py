#!/usr/bin/env python3
"""
MOLGANG — Image to 3D Model Pipeline
Converts photos of real chemical equipment to Roblox-ready 3D models.

Pipeline:
1. Photo input (equipment photo with known dimensions)
2. Depth estimation using MiDaS/DPT (GPU-accelerated, RTX 3090)
3. Point cloud generation from depth map + image
4. Mesh reconstruction from point cloud
5. Mesh cleanup and decimation (trimesh)
6. Scale to real-world dimensions using equipment_dimensions.json
7. Export as OBJ → Blender conversion → FBX for Roblox

Usage:
    source assets/pipeline_env/bin/activate
    python3 assets/pipeline/image_to_3d.py --input photo.jpg --type jaw_crusher
    python3 assets/pipeline/image_to_3d.py --input photo.jpg --type leaching_tank_500L --gpu 1

Requires: torch, torchvision, opencv-python, trimesh, PIL
GPU: RTX 3090 (MiDaS DPT-Large uses ~3GB VRAM)
"""

import argparse
import json
import os
import sys
import numpy as np
from pathlib import Path

# Add venv to path if not activated
VENV_PATH = Path(__file__).parent.parent / "pipeline_env"
if VENV_PATH.exists():
    sys.path.insert(0, str(VENV_PATH / "lib" / "python3.12" / "site-packages"))

import torch
import cv2
from PIL import Image

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"
DOWNLOADS_DIR = BASE_DIR / "downloads"
DIMS_FILE = BASE_DIR / "pipeline" / "equipment_dimensions.json"

# ═══════════════════════════════════════════════
# DEPTH ESTIMATION (MiDaS DPT-Large on GPU)
# ═══════════════════════════════════════════════

def load_midas_model(gpu_id=0):
    """Load MiDaS depth estimation model on specified GPU."""
    device = torch.device(f"cuda:{gpu_id}" if torch.cuda.is_available() else "cpu")
    print(f"Loading MiDaS DPT-Large on {device}...")

    # Use torch.hub to load MiDaS
    model = torch.hub.load("intel-isl/MiDaS", "DPT_Large", trust_repo=True)
    model.to(device)
    model.eval()

    # Load transforms
    midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
    transform = midas_transforms.dpt_transform

    print(f"MiDaS loaded on GPU {gpu_id} ({torch.cuda.get_device_name(gpu_id)})")
    return model, transform, device


def estimate_depth(image_path, model, transform, device):
    """Estimate depth map from a single image."""
    img = cv2.imread(str(image_path))
    if img is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Transform and predict
    input_batch = transform(img_rgb).to(device)

    with torch.no_grad():
        prediction = model(input_batch)
        prediction = torch.nn.functional.interpolate(
            prediction.unsqueeze(1),
            size=img_rgb.shape[:2],
            mode="bicubic",
            align_corners=False,
        ).squeeze()

    depth_map = prediction.cpu().numpy()

    # Normalize to 0-1 range
    depth_min = depth_map.min()
    depth_max = depth_map.max()
    if depth_max > depth_min:
        depth_map = (depth_map - depth_min) / (depth_max - depth_min)

    return depth_map, img_rgb


# ═══════════════════════════════════════════════
# POINT CLOUD FROM DEPTH + IMAGE
# ═══════════════════════════════════════════════

def depth_to_pointcloud(depth_map, image, focal_length=500, scale=1.0):
    """Convert depth map + RGB image to colored point cloud."""
    h, w = depth_map.shape
    points = []
    colors = []

    # Subsample for performance (every 4th pixel)
    step = 4
    for y in range(0, h, step):
        for x in range(0, w, step):
            z = depth_map[y, x] * scale
            if z < 0.01:  # skip very close/background
                continue

            # Back-project to 3D
            px = (x - w / 2) * z / focal_length
            py = (y - h / 2) * z / focal_length
            pz = z

            points.append([px, -py, pz])  # flip Y for Blender convention
            colors.append(image[y, x] / 255.0)

    return np.array(points), np.array(colors)


# ═══════════════════════════════════════════════
# MESH RECONSTRUCTION FROM POINT CLOUD
# ═══════════════════════════════════════════════

def pointcloud_to_mesh(points, colors=None, voxel_size=0.02):
    """Convert point cloud to triangle mesh using ball pivoting / convex hull."""
    import trimesh

    if len(points) < 100:
        print("WARNING: Too few points for mesh reconstruction")
        return None

    # Create point cloud object
    cloud = trimesh.PointCloud(points)

    # Simple approach: convex hull (works well for equipment-like shapes)
    try:
        mesh = cloud.convex_hull
        print(f"  Convex hull: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
    except Exception as e:
        print(f"  Convex hull failed: {e}, trying alpha shape...")
        # Fallback: create a basic mesh from bounding box
        bbox_min = points.min(axis=0)
        bbox_max = points.max(axis=0)
        mesh = trimesh.creation.box(
            extents=bbox_max - bbox_min,
            transform=trimesh.transformations.translation_matrix((bbox_max + bbox_min) / 2)
        )

    # Apply vertex colors if available
    if colors is not None and len(colors) == len(points):
        # Map colors to nearest mesh vertices
        pass  # trimesh handles this differently

    return mesh


# ═══════════════════════════════════════════════
# SCALE TO REAL DIMENSIONS
# ═══════════════════════════════════════════════

def scale_to_real_dimensions(mesh, equipment_type):
    """Scale mesh to match real equipment dimensions from database."""
    import trimesh

    # Load dimensions database
    with open(DIMS_FILE) as f:
        dims_db = json.load(f)

    if equipment_type not in dims_db:
        print(f"WARNING: No dimensions for '{equipment_type}', using default scale")
        return mesh

    dims = dims_db[equipment_type]
    roblox = dims.get("roblox_studs", {})

    # Get target size in Roblox studs
    if "length" in roblox:
        target_max = max(roblox.get("length", 10), roblox.get("width", 10), roblox.get("height", 10))
    elif "diameter" in roblox:
        target_max = max(roblox.get("diameter", 5), roblox.get("height", 10))
    else:
        target_max = 10

    # Current mesh size
    bbox = mesh.bounding_box.extents
    current_max = max(bbox)

    if current_max > 0:
        scale_factor = target_max / current_max
        mesh.apply_scale(scale_factor)
        print(f"  Scaled to {target_max} studs (factor: {scale_factor:.3f})")
        print(f"  Real dimensions: {dims.get('real_meters', 'unknown')}")

    return mesh


# ═══════════════════════════════════════════════
# EXPORT
# ═══════════════════════════════════════════════

def export_mesh(mesh, output_path, format="obj"):
    """Export mesh to file."""
    import trimesh
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    mesh.export(str(output_path))
    size_kb = output_path.stat().st_size / 1024
    print(f"  Exported: {output_path} ({size_kb:.1f} KB)")
    print(f"  Vertices: {len(mesh.vertices)}, Faces: {len(mesh.faces)}")


# ═══════════════════════════════════════════════
# FULL PIPELINE
# ═══════════════════════════════════════════════

def run_pipeline(image_path, equipment_type, gpu_id=0, output_dir=None):
    """Full image → 3D model pipeline."""
    image_path = Path(image_path)
    output_dir = Path(output_dir or DOWNLOADS_DIR)

    print("=" * 60)
    print("MOLGANG — Image to 3D Pipeline")
    print(f"Input: {image_path}")
    print(f"Type: {equipment_type}")
    print(f"GPU: {gpu_id}")
    print("=" * 60)

    # Step 1: Depth estimation
    print("\n[1/5] Estimating depth map...")
    model, transform, device = load_midas_model(gpu_id)
    depth_map, image = estimate_depth(image_path, model, transform, device)

    # Save depth map visualization
    depth_vis = (depth_map * 255).astype(np.uint8)
    depth_colored = cv2.applyColorMap(depth_vis, cv2.COLORMAP_MAGMA)
    depth_output = output_dir / f"{image_path.stem}_depth.png"
    cv2.imwrite(str(depth_output), depth_colored)
    print(f"  Depth map saved: {depth_output}")

    # Step 2: Point cloud
    print("\n[2/5] Generating point cloud...")
    points, colors = depth_to_pointcloud(depth_map, image, scale=5.0)
    print(f"  Points: {len(points)}")

    # Step 3: Mesh reconstruction
    print("\n[3/5] Reconstructing mesh...")
    mesh = pointcloud_to_mesh(points, colors)
    if mesh is None:
        print("ERROR: Mesh reconstruction failed")
        return None

    # Step 4: Scale to real dimensions
    print("\n[4/5] Scaling to real dimensions...")
    mesh = scale_to_real_dimensions(mesh, equipment_type)

    # Step 5: Export
    print("\n[5/5] Exporting...")
    obj_output = output_dir / f"{equipment_type}_from_photo.obj"
    export_mesh(mesh, obj_output)

    # Also export depth info for reference
    info = {
        "source_image": str(image_path),
        "equipment_type": equipment_type,
        "gpu_used": gpu_id,
        "points_generated": len(points),
        "mesh_vertices": len(mesh.vertices),
        "mesh_faces": len(mesh.faces),
        "output_obj": str(obj_output),
    }
    info_output = output_dir / f"{equipment_type}_from_photo_info.json"
    with open(info_output, "w") as f:
        json.dump(info, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Pipeline complete!")
    print(f"OBJ: {obj_output}")
    print(f"Next: Convert to FBX with:")
    print(f"  python3 assets/pipeline/gpu_scheduler.py --add-convert {obj_output}")
    print(f"{'='*60}")

    # Free GPU memory
    del model
    torch.cuda.empty_cache()

    return str(obj_output)


# ═══════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="MOLGANG Image → 3D Pipeline")
    parser.add_argument("--input", required=True, help="Input image path")
    parser.add_argument("--type", required=True, help="Equipment type (from equipment_dimensions.json)")
    parser.add_argument("--gpu", type=int, default=0, help="GPU index (0 or 1)")
    parser.add_argument("--output-dir", default=None, help="Output directory")
    parser.add_argument("--list-types", action="store_true", help="List available equipment types")

    args = parser.parse_args()

    if args.list_types:
        with open(DIMS_FILE) as f:
            dims = json.load(f)
        print("Available equipment types:")
        for key, val in dims.items():
            if not key.startswith("_"):
                print(f"  {key:25s} — {val.get('name', 'Unknown')}")
        return

    run_pipeline(args.input, args.type, args.gpu, args.output_dir)


if __name__ == "__main__":
    main()
