"""
fbx_to_glb.py
MOLGANG — batch-convert every assets/models/*.fbx that lacks a matching .glb
into a GLB, so the browser asset viewer (assets/viewer/) can show the full
library, not just the sets that were authored with GLB export.

Imports each FBX into a fresh scene and re-exports it as GLB, preserving the
committed geometry/materials. Run:

  /media/knight2/EDS2/apps/blender/blender-5.2.0-linux-x64/blender \
      --background --python assets/blender/fbx_to_glb.py
"""

import bpy
import os
import glob

MODELS_DIR = "/home/knight2/molgang-roblox/assets/models"


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for block in list(bpy.data.meshes):
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        if block.users == 0:
            bpy.data.materials.remove(block)


def main():
    fbxs = sorted(glob.glob(os.path.join(MODELS_DIR, "*.fbx")))
    converted, skipped, failed = 0, 0, 0
    for fbx in fbxs:
        glb = fbx[:-4] + ".glb"
        if os.path.exists(glb):
            skipped += 1
            continue
        clear_scene()
        try:
            bpy.ops.import_scene.fbx(filepath=fbx)
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True)
            converted += 1
            print(f"Converted: {os.path.basename(glb)}")
        except Exception as e:  # noqa: BLE001 — report and continue the batch
            failed += 1
            print(f"FAILED: {os.path.basename(fbx)} -> {e!r}")
    print(f"Done. converted={converted} skipped_existing={skipped} failed={failed}")


if __name__ == "__main__":
    main()
