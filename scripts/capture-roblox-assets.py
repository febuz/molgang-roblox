#!/usr/bin/env python3
"""
Capture Roblox MOLGANG procedural geometry into a VirtualV-owned asset manifest.

Roblox-side scripts use `Instance.new("Part")` + `Vector3.new(x,y,z)` + `Color3.fromRGB(r,g,b)`
to construct the world at runtime. Since these are user-authored procedural specs (not third-
party content) and the user owns the source repo (febuz/molgang-roblox), we extract the
specs into a reusable JSON manifest that the WebGPU front-end can render. Every asset in the
output manifest is tagged with owner = "VirtualV Holding B.V.".

Usage:
    python3 scripts/capture-roblox-assets.py \
        --src /media/knight2/EDS2/projects/roblox_molgang/game/src \
        --out public/assets/virtualv-manifest.json
"""

from __future__ import annotations
import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

OWNER = "VirtualV Holding B.V."
LICENSE = "Proprietary - VirtualV Holding B.V. - all rights reserved"

# Regexes for the Roblox helper patterns
RE_COLOR3 = re.compile(r"Color3\.fromRGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)")
RE_VECTOR3 = re.compile(r"Vector3\.new\(\s*(-?[\d\.]+)\s*,\s*(-?[\d\.]+)\s*,\s*(-?[\d\.]+)\s*\)")
RE_PALETTE = re.compile(r"^\s*([A-Z][A-Z0-9_]+)\s*=\s*Color3\.fromRGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", re.MULTILINE)
RE_PART_TYPE = re.compile(r"Enum\.PartType\.(\w+)")
RE_MATERIAL = re.compile(r"Enum\.Material\.(\w+)")
# Match createPart / createCylinder / createSphere calls and grab the config block
RE_CREATE_FN = re.compile(
    r"create(Part|Cylinder|Sphere|Wedge)\s*\(\s*[A-Za-z_][A-Za-z0-9_]*\s*,\s*\{([^}]*)\}",
    re.DOTALL,
)


def parse_palette(text: str) -> dict[str, list[int]]:
    """Extract the named-color palette from a CONFIG block."""
    return {
        name: [int(r), int(g), int(b)]
        for name, r, g, b in RE_PALETTE.findall(text)
    }


def parse_config_block(block: str) -> dict[str, Any]:
    """Loose parser for the inner table of a createX call. Pulls out Name, Size,
    Position, Color, Material, Transparency, Shape, Orientation if present."""
    cfg: dict[str, Any] = {}
    # Name = "..."
    m = re.search(r"Name\s*=\s*\"([^\"]+)\"", block)
    if m:
        cfg["name"] = m.group(1)
    # Size = Vector3.new(x,y,z)
    m = RE_VECTOR3.search(block)
    if m:
        cfg["size"] = [float(m.group(1)), float(m.group(2)), float(m.group(3))]
    # Position = Vector3.new(...) — find second Vector3 if it follows "Position ="
    pos_m = re.search(r"Position\s*=\s*Vector3\.new\(\s*(-?[\d\.]+)\s*,\s*(-?[\d\.]+)\s*,\s*(-?[\d\.]+)", block)
    if pos_m:
        cfg["position"] = [float(pos_m.group(1)), float(pos_m.group(2)), float(pos_m.group(3))]
    size_m = re.search(r"Size\s*=\s*Vector3\.new\(\s*(-?[\d\.]+)\s*,\s*(-?[\d\.]+)\s*,\s*(-?[\d\.]+)", block)
    if size_m:
        cfg["size"] = [float(size_m.group(1)), float(size_m.group(2)), float(size_m.group(3))]
    # Color = Color3.fromRGB(r,g,b) OR named palette token (CONFIG.NEON_GREEN)
    col_m = re.search(r"Color\s*=\s*Color3\.fromRGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", block)
    if col_m:
        cfg["color"] = [int(col_m.group(1)), int(col_m.group(2)), int(col_m.group(3))]
    else:
        named = re.search(r"Color\s*=\s*(?:CONFIG\.)?([A-Z][A-Z0-9_]+)", block)
        if named:
            cfg["color_ref"] = named.group(1)
    # Material
    mat_m = RE_MATERIAL.search(block)
    if mat_m:
        cfg["material"] = mat_m.group(1)
    # Transparency = number
    t_m = re.search(r"Transparency\s*=\s*([\d\.]+)", block)
    if t_m:
        cfg["transparency"] = float(t_m.group(1))
    # Shape (only relevant for createPart)
    sh_m = RE_PART_TYPE.search(block)
    if sh_m:
        cfg["shape"] = sh_m.group(1)
    return cfg


def capture_file(path: Path) -> dict[str, Any]:
    """Capture one Lua file's palette + asset specs."""
    text = path.read_text(encoding="utf-8", errors="ignore")
    palette = parse_palette(text)
    assets: list[dict[str, Any]] = []
    for fn, block in RE_CREATE_FN.findall(text):
        cfg = parse_config_block(block)
        if not cfg:
            continue
        kind = {
            "Part": "block",
            "Cylinder": "cylinder",
            "Sphere": "sphere",
            "Wedge": "wedge",
        }.get(fn, "block")
        cfg["primitive"] = kind
        cfg["source_function"] = f"create{fn}"
        assets.append(cfg)
    return {"palette": palette, "assets": assets}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--src", required=True, help="Roblox source root (game/src)")
    ap.add_argument("--out", required=True, help="Output manifest path")
    args = ap.parse_args()

    src = Path(args.src)
    if not src.is_dir():
        print(f"err: {src} is not a directory", file=sys.stderr)
        return 1

    bundle: dict[str, Any] = {
        "schema": "virtualv-asset-manifest/v1",
        "owner": OWNER,
        "license": LICENSE,
        "captured_at": datetime.utcnow().isoformat() + "Z",
        "source_repo": "github.com/febuz/molgang-roblox",
        "global_palette": {},
        "modules": [],
    }

    lua_files = sorted(src.rglob("*.lua"))
    captured = 0
    palette_combined: dict[str, list[int]] = {}

    for path in lua_files:
        result = capture_file(path)
        if result["palette"]:
            palette_combined.update(result["palette"])
        if result["assets"]:
            module_id = str(path.relative_to(src)).replace(os.sep, "/")
            bundle["modules"].append({
                "module": module_id,
                "asset_count": len(result["assets"]),
                "assets": result["assets"],
            })
            captured += len(result["assets"])

    bundle["global_palette"] = {k: v for k, v in palette_combined.items()}
    bundle["totals"] = {
        "modules": len(bundle["modules"]),
        "assets": captured,
        "palette_colors": len(palette_combined),
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(bundle, indent=2))

    print(f"✓ captured {captured} assets across {len(bundle['modules'])} modules "
          f"with {len(palette_combined)} palette colors -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
