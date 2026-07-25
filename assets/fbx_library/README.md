# FBX game-asset library (CC0, Poly Haven)

Curated photoscanned/PBR industrial + lab props for MOLGANG, collected as FBX
source (per-slug folder: `.fbx` + textures) plus packed 1k GLBs in
`../models/` for the web world's streaming renderer.

License: all assets CC0 (Poly Haven). Reproduce/refresh with:

    python3 fetch_polyhaven.py     # downloads FBX + glTF (1k) for the curated list
    # pack GLBs: npx -y gltf-pipeline -i <slug>.gltf -o <slug>.glb

The binary FBX/texture payload (~120 MB) is intentionally untracked — the
manifest in `fetch_polyhaven.py` (SLUGS list) is the source of truth.
