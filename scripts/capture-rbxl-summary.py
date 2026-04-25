#!/usr/bin/env python3
"""
Extract a summary of a Roblox binary .rbxl/.rbxm place file: total instance
count, count per class type, top-level child names. Tagged with VirtualV
ownership and merged into the existing virtualv-asset-manifest.json.

This is a minimal parser — it walks the chunked binary format enough to
read class/type names from INST chunks. Full geometry / property values
require rbx-dom (Rust). That capture pass is queued in Luna's pool.

Usage:
    python3 scripts/capture-rbxl-summary.py \\
        --rbxl /home/knight2/molgang-roblox/MOLGANG_Demo.rbxl \\
        /media/knight2/EDS2/projects/roblox_molgang/MOLGANG.rbxl \\
        --merge-into public/assets/virtualv-manifest.json
"""

from __future__ import annotations
import argparse
import json
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

import lz4.block

OWNER = "VirtualV Holding B.V."
LICENSE = "Proprietary - VirtualV Holding B.V. - all rights reserved"

# Binary RBXL header
RBXL_MAGIC = b"<roblox!\x89\xff\r\n\x1a\n"


def parse_rbxl_chunks(path: Path) -> dict:
    """Walk the chunked binary format and surface per-class instance counts.

    File layout (from the rbx-dom binary format spec):
      - 16 bytes magic (b"<roblox!\\x89\\xff\\r\\n\\x1a\\n")
      - 4 bytes "0000" version stub
      - u32 num_types
      - u32 num_instances
      - 8 bytes reserved
      - then a series of chunks, each:
           4-byte chunk_id ("META", "SSTR", "INST", "PROP", "PRNT", "END_")
           u32 compressed_len
           u32 decompressed_len
           u32 reserved (= 0)
           payload (LZ4-compressed if compressed_len != 0, raw otherwise)
    """
    data = path.read_bytes()
    if not data.startswith(RBXL_MAGIC):
        raise ValueError(f"not a binary rbxl: {path.name}")

    pos = len(RBXL_MAGIC)
    # u16 version (rbx-dom binary v0)
    pos += 2
    num_types = struct.unpack_from("<I", data, pos)[0]; pos += 4
    num_instances = struct.unpack_from("<I", data, pos)[0]; pos += 4
    pos += 8  # reserved (u64 zero)

    classes_by_id: dict[int, str] = {}
    counts_by_class: dict[str, int] = {}
    parent_chunks_seen = 0

    while pos < len(data):
        chunk_id = data[pos:pos + 4].decode("ascii", errors="replace"); pos += 4
        comp_len = struct.unpack_from("<I", data, pos)[0]; pos += 4
        decomp_len = struct.unpack_from("<I", data, pos)[0]; pos += 4
        pos += 4  # reserved

        if comp_len == 0:
            payload = data[pos:pos + decomp_len]
            pos += decomp_len
        else:
            payload = lz4.block.decompress(data[pos:pos + comp_len], uncompressed_size=decomp_len)
            pos += comp_len

        if chunk_id == "INST":
            # INST chunk layout:
            #   u32 type_id
            #   string class_name (u32 len + bytes)
            #   u8 is_service
            #   u32 num_instances_of_type
            #   ... referent ints ...
            inst_pos = 0
            type_id = struct.unpack_from("<I", payload, inst_pos)[0]; inst_pos += 4
            name_len = struct.unpack_from("<I", payload, inst_pos)[0]; inst_pos += 4
            class_name = payload[inst_pos:inst_pos + name_len].decode("utf-8", errors="replace")
            inst_pos += name_len
            inst_pos += 1  # is_service flag
            num_of_type = struct.unpack_from("<I", payload, inst_pos)[0]
            classes_by_id[type_id] = class_name
            counts_by_class[class_name] = counts_by_class.get(class_name, 0) + num_of_type
        elif chunk_id == "PRNT":
            parent_chunks_seen += 1
        elif chunk_id == "END_":
            break

    return {
        "file": path.name,
        "size_bytes": len(data),
        "header_num_types": num_types,
        "header_num_instances": num_instances,
        "class_count": len(counts_by_class),
        "instance_count_by_class": dict(sorted(counts_by_class.items(), key=lambda kv: -kv[1])),
        "total_instances": sum(counts_by_class.values()),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--rbxl", nargs="+", required=True, help="One or more .rbxl/.rbxm paths")
    ap.add_argument("--merge-into", help="Existing virtualv-asset-manifest.json to enrich")
    ap.add_argument("--out", help="Standalone summary JSON output (used if --merge-into is not set)")
    args = ap.parse_args()

    summaries = []
    total_instances = 0
    for p in args.rbxl:
        path = Path(p)
        if not path.is_file():
            print(f"⚠ skip (not a file): {path}", file=sys.stderr)
            continue
        try:
            s = parse_rbxl_chunks(path)
            s["path"] = str(path)
            summaries.append(s)
            total_instances += s["total_instances"]
            print(f"✓ {path.name}: {s['total_instances']} instances across {s['class_count']} classes", file=sys.stderr)
        except Exception as e:
            print(f"✗ {path}: {e}", file=sys.stderr)

    block = {
        "owner": OWNER,
        "license": LICENSE,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "total_rbxl_instances": total_instances,
        "files": summaries,
    }

    if args.merge_into:
        target = Path(args.merge_into)
        if target.is_file():
            existing = json.loads(target.read_text())
        else:
            existing = {"schema": "virtualv-asset-manifest/v1", "owner": OWNER, "license": LICENSE}
        existing["rbxl_summary"] = block
        target.write_text(json.dumps(existing, indent=2))
        print(f"merged into {target}", file=sys.stderr)
    else:
        out = Path(args.out or "rbxl-summary.json")
        out.write_text(json.dumps(block, indent=2))
        print(f"wrote {out}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
