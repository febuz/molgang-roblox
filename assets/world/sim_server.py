#!/usr/bin/env python3
"""
sim_server.py — EVE-Online-style world simulation authority in Python.

The Python process owns the DYNAMIC world state (traffic + pedestrians moving
on the road network); the browser is a thin client that polls the current
state and renders it. The static map still comes from world.json; this only
adds the living, moving layer.

Efficient by design: a handful of agents, a fixed-rate tick in a background
thread, tiny JSON state (a few hundred bytes) polled a few times a second —
mega bandwidth-thin, and the client degrades gracefully to a static world if
the server isn't running.

Run:  python3 assets/world/sim_server.py        # serves state on :8099
Then open the world with ?sim=1 (or it auto-detects).
"""
import json
import math
import os
import random
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import process_sim  # realistic chemistry ported from ProcessEngineering.lua

HERE = os.path.dirname(os.path.abspath(__file__))
WORLD = json.load(open(os.path.join(HERE, "world.json")))["meta"]
W = WORLD["world"]
ROAD_ATS = WORLD["roadAts"]
ROAD = WORLD["road"]
PORT = 8077
TICK = 1 / 20.0

VEHICLES = ["car", "delivery_truck", "van", "city_bus", "motorcycle"]
PEDS = ["pedestrian", "woman_pedestrian", "worker"]


def _lane(axis, at, side):
    """A drive lane just inside a road; side +/-1 picks the lane."""
    return at + side * (ROAD * 0.25)


class Sim:
    def __init__(self):
        self.agents = []
        self.lock = threading.Lock()
        self.t0 = time.time()
        rng = random.Random(7)
        aid = 0
        # Vehicles: ride a road line (horizontal or vertical), one per lane/dir.
        for at in ROAD_ATS:
            for horizontal in (True, False):
                for side, direction in ((1, 1), (-1, -1)):
                    for _ in range(rng.randint(2, 3)):
                        kind = rng.choice(VEHICLES)
                        speed = rng.uniform(9, 16) * (0.6 if kind == "city_bus" else 1)
                        pos = rng.uniform(-W / 2, W / 2)
                        self.agents.append({
                            "id": aid, "kind": kind, "horizontal": horizontal,
                            "at": _lane(0, at, side), "pos": pos,
                            "dir": direction, "speed": speed, "ped": False})
                        aid += 1
        # Pedestrians: walk a sidewalk line, slower.
        for at in ROAD_ATS:
            for horizontal in (True, False):
                for side in (1, -1):
                    for _ in range(rng.randint(2, 3)):
                        self.agents.append({
                            "id": aid, "kind": rng.choice(PEDS), "horizontal": horizontal,
                            "at": at + side * (ROAD * 0.6 + 1.2),
                            "pos": rng.uniform(-W / 2, W / 2),
                            "dir": rng.choice((1, -1)),
                            "speed": rng.uniform(1.6, 2.8), "ped": True})
                        aid += 1

        # A live CHEMISTRY reactor station driven by the ported process sim:
        # a batch leach whose conversion advances with real Arrhenius / Henry /
        # residence-time kinetics. Its process parameters drift so the station
        # visibly runs (operator dial changes), and it resets on batch complete.
        self.reactor = process_sim.default_state()
        self.reactor.update({"temperature": 70.0, "pressure": 180.0, "flowRate": 4.0, "pH": 2.5})
        self._rt = 0.0

    def tick(self, dt):
        half = W / 2
        with self.lock:
            for a in self.agents:
                a["pos"] += a["dir"] * a["speed"] * dt
                if a["pos"] > half:
                    a["pos"] = -half
                elif a["pos"] < -half:
                    a["pos"] = half
            # Reactor: 1 real second = 1 process-minute; drift temperature on a
            # slow sine so the reaction rate visibly breathes; reset each batch.
            self._rt += dt
            self.reactor["temperature"] = 70.0 + 18.0 * math.sin(self._rt * 0.15)
            process_sim.step_reactor(self.reactor, dt * 1.0)
            if self.reactor["conversion"] >= 0.995:
                self.reactor["conversion"] = 0.0   # next batch

    def state(self):
        with self.lock:
            out = []
            for a in self.agents:
                if a["horizontal"]:
                    x, z = a["pos"], a["at"]
                    r = math.pi / 2 if a["dir"] > 0 else -math.pi / 2
                else:
                    x, z = a["at"], a["pos"]
                    r = 0 if a["dir"] > 0 else math.pi
                out.append({"id": a["id"], "k": a["kind"],
                            "x": round(x, 2), "z": round(z, 2), "r": round(r, 2),
                            "ped": a["ped"]})
            rx = self.reactor
            reactor = {"temperature": round(rx["temperature"], 1), "pressure": round(rx["pressure"], 1),
                       "flowRate": rx["flowRate"], "pH": rx["pH"],
                       "conversion": round(rx["conversion"], 3),
                       "rate": round(process_sim.reaction_rate(rx), 2)}
            return {"t": round(time.time() - self.t0, 2), "n": len(out), "agents": out,
                    "reactor": reactor}


SIM = Sim()

# Shared multiplayer presence: each browser POSTs its player position; every
# client sees the others. The Python process is the single authority (the P2P/
# shared-world layer). Stale players (no update > 4 s) are pruned.
PLAYERS = {}
PLAYERS_LOCK = threading.Lock()


def upsert_player(pid, x, z, yaw):
    with PLAYERS_LOCK:
        PLAYERS[pid] = {"x": round(x, 2), "z": round(z, 2), "yaw": round(yaw, 3), "seen": time.time()}


def players_state(exclude=None):
    now = time.time()
    with PLAYERS_LOCK:
        for pid in [p for p, v in PLAYERS.items() if now - v["seen"] > 4]:
            del PLAYERS[pid]
        return [{"id": pid, "x": v["x"], "z": v["z"], "yaw": v["yaw"]}
                for pid, v in PLAYERS.items() if pid != exclude]


def _tick_loop():
    last = time.time()
    while True:
        now = time.time()
        SIM.tick(now - last)
        last = now
        time.sleep(TICK)


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")

    def _send_json(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204); self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/state"):
            pid = None
            if "?" in self.path:
                from urllib.parse import parse_qs
                pid = parse_qs(self.path.split("?", 1)[1]).get("id", [None])[0]
            st = SIM.state()
            st["players"] = players_state(exclude=pid)
            self._send_json(st)
        else:
            self.send_response(404); self._cors(); self.end_headers()

    def do_POST(self):
        if self.path.startswith("/join"):
            n = int(self.headers.get("Content-Length", 0))
            try:
                d = json.loads(self.rfile.read(n) or b"{}")
                upsert_player(str(d["id"]), float(d["x"]), float(d["z"]), float(d.get("yaw", 0)))
                self._send_json({"ok": True})
            except Exception as e:  # noqa: BLE001
                self.send_response(400); self._cors(); self.end_headers()
        else:
            self.send_response(404); self._cors(); self.end_headers()

    def log_message(self, *a):  # quiet
        pass


if __name__ == "__main__":
    threading.Thread(target=_tick_loop, daemon=True).start()
    print(f"[sim] EVE-style world sim on http://127.0.0.1:{PORT}/state "
          f"({len(SIM.agents)} agents @ {int(1/TICK)}Hz)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
