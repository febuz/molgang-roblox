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

# Match raw `local NAME = Instance.new("Part"|"MeshPart"|"Model")` so we can walk
# forward through property assignments to that NAME and reconstruct the asset.
RE_RAW_CREATE = re.compile(
    r"local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Instance\.new\(\"(Part|MeshPart|TrussPart|Model)\"\s*\)"
)
# Property assignment lines of the form `varname.Property = value`
RE_PROP_ASSIGN = re.compile(
    r"^\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Z][A-Za-z]*)\s*=\s*(.+?)\s*$",
    re.MULTILINE,
)
# When we see something like `varname.Size = Vector3.new(x,y,z)` extract the values
RE_VAL_VECTOR3 = re.compile(r"Vector3\.new\(\s*(-?[\d\.]+)\s*,\s*(-?[\d\.]+)\s*,\s*(-?[\d\.]+)\s*\)")
RE_VAL_COLOR3_RGB = re.compile(r"Color3\.fromRGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)")
RE_VAL_COLOR3_NAMED = re.compile(r"(?:CONFIG\.)?([A-Z][A-Z0-9_]+)\b")
RE_VAL_PARTTYPE = re.compile(r"Enum\.PartType\.(\w+)")
RE_VAL_MATERIAL = re.compile(r"Enum\.Material\.(\w+)")
RE_VAL_NUMBER = re.compile(r"^-?[\d\.]+$")
RE_VAL_STRING = re.compile(r"^\"([^\"]*)\"$")


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


def parse_property_value(value: str) -> Any:
    """Parse the right-hand side of `var.Property = ...`."""
    value = value.strip().rstrip(",")
    m = RE_VAL_VECTOR3.search(value)
    if m:
        return [float(m.group(1)), float(m.group(2)), float(m.group(3))]
    m = RE_VAL_COLOR3_RGB.search(value)
    if m:
        return [int(m.group(1)), int(m.group(2)), int(m.group(3))]
    m = RE_VAL_PARTTYPE.search(value)
    if m:
        return m.group(1)
    m = RE_VAL_MATERIAL.search(value)
    if m:
        return m.group(1)
    m = RE_VAL_STRING.match(value)
    if m:
        return m.group(1)
    if RE_VAL_NUMBER.match(value):
        try:
            return float(value)
        except ValueError:
            pass
    # Color reference like CONFIG.NEON_GREEN
    m = re.match(r"(?:CONFIG\.)?([A-Z][A-Z0-9_]+)\s*$", value)
    if m:
        return {"_ref": m.group(1)}
    return None


def capture_raw_instance_news(text: str) -> list[dict[str, Any]]:
    """Find `local foo = Instance.new("Part")` and walk forward in the file
    for property assignments to that variable, building an asset spec."""
    assets: list[dict[str, Any]] = []
    # Build a map varname -> {start_offset, kind}
    found = list(RE_RAW_CREATE.finditer(text))
    for i, m in enumerate(found):
        varname = m.group(1)
        kind = m.group(2)  # Part / MeshPart / TrussPart / Model
        scan_start = m.end()
        # Scope: until next `local` declaration, end of function/block, or 600 chars
        scan_end = min(len(text), scan_start + 1200)
        # Stop early at next `local NAME = Instance.new("Part"...)` to avoid bleeding
        next_match_start = found[i + 1].start() if i + 1 < len(found) else scan_end
        scan_end = min(scan_end, next_match_start)
        block = text[scan_start:scan_end]
        cfg: dict[str, Any] = {"primitive": "block", "source_function": "raw_instance"}
        if kind == "Model":
            # Models are containers; record but skip primitive geometry mapping
            cfg["primitive"] = "model"

        for prop_m in RE_PROP_ASSIGN.finditer(block):
            target_var, prop_name, value = prop_m.group(1), prop_m.group(2), prop_m.group(3)
            if target_var != varname:
                continue
            parsed = parse_property_value(value)
            if parsed is None:
                continue
            # Map Roblox properties to manifest keys
            if prop_name == "Size" and isinstance(parsed, list):
                cfg["size"] = parsed
            elif prop_name == "Position" and isinstance(parsed, list):
                cfg["position"] = parsed
            elif prop_name == "Color":
                if isinstance(parsed, list):
                    cfg["color"] = parsed
                elif isinstance(parsed, dict) and "_ref" in parsed:
                    cfg["color_ref"] = parsed["_ref"]
            elif prop_name == "Material":
                cfg["material"] = parsed
            elif prop_name == "Transparency":
                if isinstance(parsed, (int, float)):
                    cfg["transparency"] = parsed
            elif prop_name == "Shape":
                # Map Enum.PartType to primitive
                shape = parsed if isinstance(parsed, str) else None
                if shape:
                    cfg["primitive"] = {
                        "Ball": "sphere", "Cylinder": "cylinder", "Wedge": "wedge",
                    }.get(shape, "block")
            elif prop_name == "Name":
                if isinstance(parsed, str):
                    cfg["name"] = parsed
        # Only emit if we got at least size or position — otherwise it's a placeholder
        if "size" in cfg or "position" in cfg or kind == "Model":
            assets.append(cfg)
    return assets


def capture_file(path: Path) -> dict[str, Any]:
    """Capture one Lua file's palette + asset specs."""
    text = path.read_text(encoding="utf-8", errors="ignore")
    palette = parse_palette(text)
    assets: list[dict[str, Any]] = []

    # Pass 1: helper-function calls (createPart, createSphere, etc.)
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

    # Pass 2: raw `local x = Instance.new("Part")` walked forward for properties
    assets.extend(capture_raw_instance_news(text))

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
