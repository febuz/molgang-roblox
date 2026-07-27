#!/usr/bin/env python3
"""Static audit for client FireServer remotes and server handlers.

This intentionally checks the literal/WaitForChild remote names used in the
source tree. It catches the common failure mode where a button fires a remote
that exists in RemoteSetup but has no server listener (or uses the wrong name).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "game" / "src"
REMOTE_SETUP = SRC / "ReplicatedStorage" / "Remotes" / "RemoteSetup.lua"


def read_lua_files(folder: Path) -> list[tuple[Path, str]]:
    return [(path, path.read_text(encoding="utf-8")) for path in folder.rglob("*.lua")]


def configured_remotes(source: str) -> set[str]:
    return set(re.findall(r'"([A-Za-z][A-Za-z0-9_]*)"', source))


def aliases(source: str) -> dict[str, str]:
    result: dict[str, str] = {}
    pattern = r'local\s+([A-Za-z][A-Za-z0-9_]*)\s*=\s*Remotes:(?:WaitForChild|FindFirstChild)\("([A-Za-z][A-Za-z0-9_]*)"\)'
    for match in re.finditer(pattern, source):
        result[match.group(1)] = match.group(2)
    return result


def main() -> int:
    setup = REMOTE_SETUP.read_text(encoding="utf-8")
    configured = configured_remotes(setup)
    client_files = read_lua_files(SRC / "StarterGui") + read_lua_files(SRC / "StarterPlayerScripts")
    server_files = read_lua_files(SRC / "ServerScriptService")

    fired: dict[str, set[str]] = {}
    invoked: dict[str, set[str]] = {}
    for path, source in client_files:
        names = set(re.findall(r'Remotes\.([A-Za-z][A-Za-z0-9_]*):FireServer\s*\(', source))
        function_names = set()
        local_names = aliases(source)
        for alias, remote in local_names.items():
            if re.search(rf'\b{re.escape(alias)}:FireServer\s*\(', source):
                names.add(remote)
            if re.search(rf'\b{re.escape(alias)}:InvokeServer\s*\(', source):
                function_names.add(remote)
        if names:
            fired[str(path.relative_to(ROOT))] = names
        if function_names:
            invoked[str(path.relative_to(ROOT))] = function_names

    handled: set[str] = set()
    invoked_handlers: set[str] = set()
    for _, source in server_files:
        handled.update(re.findall(r'Remotes\.([A-Za-z][A-Za-z0-9_]*)\.OnServerEvent\s*:\s*Connect', source))
        invoked_handlers.update(re.findall(r'Remotes\.([A-Za-z][A-Za-z0-9_]*)\.OnServerInvoke\s*=', source))
        local_names = aliases(source)
        for alias, remote in local_names.items():
            if re.search(rf'\b{re.escape(alias)}\.OnServerEvent\s*:\s*Connect', source):
                handled.add(remote)

    fired_names = set().union(*fired.values()) if fired else set()
    missing_setup = sorted(fired_names - configured)
    missing_handler = sorted(fired_names - handled)
    invoked_names = set().union(*invoked.values()) if invoked else set()
    missing_function_handler = sorted(invoked_names - invoked_handlers)

    print(f"configured_remotes={len(configured)}")
    print(f"client_fire_remotes={len(fired_names)}")
    print(f"server_event_handlers={len(handled)}")
    if missing_setup:
        print("MISSING_FROM_REMOTE_SETUP=" + ",".join(missing_setup))
    if missing_handler:
        print("MISSING_SERVER_HANDLER=" + ",".join(missing_handler))
        for path, names in sorted(fired.items()):
            unresolved = sorted(names.intersection(missing_handler))
            if unresolved:
                print(f"  {path}: {', '.join(unresolved)}")
    if missing_function_handler:
        print("MISSING_SERVER_FUNCTION_HANDLER=" + ",".join(missing_function_handler))
    if missing_setup or missing_handler or missing_function_handler:
        return 1
    print("PASS remote contract audit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
