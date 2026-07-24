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

    def tick(self, dt):
        half = W / 2
        with self.lock:
            for a in self.agents:
                a["pos"] += a["dir"] * a["speed"] * dt
                if a["pos"] > half:
                    a["pos"] = -half
                elif a["pos"] < -half:
                    a["pos"] = half

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
            return {"t": round(time.time() - self.t0, 2), "n": len(out), "agents": out}


SIM = Sim()


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

    def do_GET(self):
        if self.path.startswith("/state"):
            body = json.dumps(SIM.state()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404); self._cors(); self.end_headers()

    def log_message(self, *a):  # quiet
        pass


if __name__ == "__main__":
    threading.Thread(target=_tick_loop, daemon=True).start()
    print(f"[sim] EVE-style world sim on http://127.0.0.1:{PORT}/state "
          f"({len(SIM.agents)} agents @ {int(1/TICK)}Hz)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
