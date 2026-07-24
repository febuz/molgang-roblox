#!/usr/bin/env python3
"""Write a deterministic SHA-256 inventory for demo and 3D source assets."""
from hashlib import sha256
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {".rbxl", ".rbxlx", ".rbxm", ".fbx", ".glb", ".gltf", ".blend"}

def hash_file(path):
    digest = sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

files = []
for path in sorted(ROOT.rglob("*")):
    if path.is_file() and path.suffix.lower() in EXTENSIONS and "build" not in path.parts:
        files.append({"path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "sha256": hash_file(path)})

manifest = {"schema": 1, "files": files}
output = ROOT / "assets" / "manifest.json"
output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {output} ({len(files)} binary files)")
