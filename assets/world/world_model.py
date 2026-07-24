#!/usr/bin/env python3
"""
world_model.py — LeCun-style JEPA world model for the traffic sim (theory->practice).

Yann LeCun's world-model thesis: an agent should learn to predict the future in
an ABSTRACT LATENT space (Joint-Embedding Predictive Architecture), not by
generating raw observations. Here that's made concrete on the game world's
traffic: a small encoder maps an agent's recent motion to a latent, a predictor
predicts the NEXT latent, and the target latent comes from a stop-gradient
target encoder — the JEPA recipe. A tiny decoder reads a usable next-position
out of the latent so we can measure it in metres.

The point (the "practice"): the model learns the non-trivial dynamics —
vehicles keep straight but TURN at intersections — which a naive constant-
velocity predictor cannot, so the world model's multi-step rollout is sharply
more accurate. That learned predictor is what lets a thin client extrapolate
between server ticks (bandwidth-efficient) instead of polling every frame.

CPU by default (tiny MLP, GPU left free). Run:  python3 assets/world/world_model.py
"""
import json
import math
import os
import random

import torch
import torch.nn as nn

HERE = os.path.dirname(os.path.abspath(__file__))
META = json.load(open(os.path.join(HERE, "world.json")))["meta"]
W, ROAD_ATS = META["world"], META["roadAts"]
DT = 0.2                      # sim step used for rollouts
K = 4                         # history window length
DEV = "cpu"                   # keep the GPU free (this model is tiny)


# ---------- a traffic micro-sim with intersection turning (non-trivial) ----------
def rollout(n_agents=60, steps=60, seed=0):
    rng = random.Random(seed)
    half = W / 2
    agents = []
    for _ in range(n_agents):
        horiz = rng.random() < 0.5
        at = rng.choice(ROAD_ATS)
        agents.append({"x": rng.uniform(-half, half) if horiz else at,
                       "z": at if horiz else rng.uniform(-half, half),
                       "h": rng.choice([0, math.pi / 2, math.pi, -math.pi / 2]),
                       "spd": rng.uniform(8, 16), "cool": 0})
    traj = []
    for _ in range(steps):
        snap = []
        for a in agents:
            # DETERMINISTIC rule (learnable from observation): turn right at each
            # intersection, with a cooldown so it doesn't spin. A world model can
            # learn "near an intersection -> turn right"; constant velocity drives
            # straight through and is wrong every intersection.
            near = min(abs(a["x"] - r) for r in ROAD_ATS) < 2.5 and \
                min(abs(a["z"] - r) for r in ROAD_ATS) < 2.5
            a["cool"] = max(0, a["cool"] - 1)
            if near and a["cool"] == 0:
                a["h"] -= math.pi / 2                 # turn right
                a["cool"] = 12
            a["x"] += math.cos(a["h"]) * a["spd"] * DT
            a["z"] += math.sin(a["h"]) * a["spd"] * DT
            if abs(a["x"]) > half: a["x"] = -math.copysign(half, a["x"])
            if abs(a["z"]) > half: a["z"] = -math.copysign(half, a["z"])
            snap.append((a["x"], a["z"], a["h"], a["spd"]))
        traj.append(snap)
    return traj


def features(state):
    x, z, h, spd = state
    dmin = min(min(abs(x - r) for r in ROAD_ATS), min(abs(z - r) for r in ROAD_ATS))
    return [x / W, z / W, math.cos(h), math.sin(h), spd / 16, math.tanh(dmin / 6)]


def make_dataset(n_roll=60):
    # The world model predicts the NEXT HEADING (the only non-trivial thing:
    # does the agent turn?); position is reconstructed with known physics
    # (pos += [cos,sin]*speed*dt). So the learnable signal is isolated.
    X, Yhead, Spd = [], [], []
    for s in range(n_roll):
        traj = rollout(seed=s, steps=40)
        T = len(traj)
        for t in range(K, T - 1):
            for i in range(len(traj[t])):
                win = [features(traj[tt][i]) for tt in range(t - K, t)]
                X.append([f for row in win for f in row])
                nxt = traj[t][i]
                Yhead.append([math.cos(nxt[2]), math.sin(nxt[2])])
                Spd.append(nxt[3])
    return (torch.tensor(X, dtype=torch.float32),
            torch.tensor(Yhead, dtype=torch.float32),
            torch.tensor(Spd, dtype=torch.float32))


# ---------- JEPA: encoder + latent predictor (stop-grad target) + decoder ----------
class Enc(nn.Module):
    def __init__(self, d_in, d_z=32):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(d_in, 64), nn.GELU(), nn.Linear(64, d_z))

    def forward(self, x): return self.net(x)


class Pred(nn.Module):
    def __init__(self, d_z=32):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(d_z, 64), nn.GELU(), nn.Linear(64, d_z))

    def forward(self, z): return self.net(z)


class Dec(nn.Module):
    def __init__(self, d_z=32):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(d_z, 64), nn.GELU(), nn.Linear(64, 2))  # next heading cos,sin

    def forward(self, z): return self.net(z)


def main():
    torch.manual_seed(0)
    X, Yh, Sp = make_dataset()
    n = X.shape[0]; d_in = X.shape[1]
    idx = torch.randperm(n); tr, va = idx[:int(n * 0.85)], idx[int(n * 0.85):]
    enc, pred, dec = Enc(d_in).to(DEV), Pred().to(DEV), Dec().to(DEV)
    tgt = Enc(d_in).to(DEV); tgt.load_state_dict(enc.state_dict())
    for p in tgt.parameters(): p.requires_grad_(False)
    opt = torch.optim.Adam(list(enc.parameters()) + list(pred.parameters()) + list(dec.parameters()), 1e-3)
    print(f"[wm] {n} transitions, d_in={d_in}; training JEPA world model on {DEV}")

    Xtr, Yhtr = X[tr].to(DEV), Yh[tr].to(DEV)
    Xva, Yhva, Spva = X[va].to(DEV), Yh[va].to(DEV), Sp[va].to(DEV)
    for ep in range(400):
        enc.train()
        z = enc(Xtr); zp = pred(z)
        with torch.no_grad():
            ztgt = tgt(Xtr)                       # JEPA target: predicted next latent ~ target enc
        jepa = ((zp - ztgt) ** 2).mean()          # latent-space prediction loss (LeCun/JEPA)
        out = dec(zp)                             # readout: the next heading
        dec_loss = ((out - Yhtr) ** 2).mean()
        loss = jepa + dec_loss
        opt.zero_grad(); loss.backward(); opt.step()
        with torch.no_grad():                      # EMA update of the target encoder (BYOL/JEPA style)
            for pt, ps in zip(tgt.parameters(), enc.parameters()):
                pt.mul_(0.99).add_(ps, alpha=0.01)
        if ep % 100 == 0 or ep == 399:
            enc.eval()
            with torch.no_grad():
                ph = dec(pred(enc(Xva)))
                ph = ph / ph.norm(dim=1, keepdim=True).clamp_min(1e-6)
                # 1-step position error from predicted heading + physics vs const-heading baseline
                wm_dx = ph[:, 0] * Spva * DT; wm_dz = ph[:, 1] * Spva * DT
                gt_dx = Yhva[:, 0] * Spva * DT; gt_dz = Yhva[:, 1] * Spva * DT
                wm1 = ((wm_dx - gt_dx) ** 2 + (wm_dz - gt_dz) ** 2).sqrt().mean().item()
            print(f"[wm] ep {ep:3d} loss {loss.item():.4f} | 1-step pos err {wm1:.3f}m")

    # Multi-step rollout comparison vs a constant-velocity baseline.
    enc.eval()
    traj = rollout(seed=999, steps=30)
    H = 10  # predict 10 steps (2 s) ahead
    wm_tot, base_tot, cnt = 0.0, 0.0, 0
    with torch.no_grad():
        for i in range(len(traj[0])):
            # ground truth future
            for t in range(K, len(traj) - H):
                gt = traj[t + H][i]
                # world-model rollout
                cur = list(traj[t - 1][i])
                win = [traj[tt][i] for tt in range(t - K, t)]
                for _ in range(H):
                    xin = torch.tensor([[f for row in [features(s) for s in win] for f in row]], dtype=torch.float32)
                    o = dec(pred(enc(xin)))[0]
                    nh = math.atan2(o[1].item(), o[0].item())   # predicted next heading
                    nx = cur[0] + math.cos(nh) * cur[3] * DT     # reconstruct position via physics
                    nz = cur[1] + math.sin(nh) * cur[3] * DT
                    cur = [nx, nz, nh, cur[3]]
                    win = win[1:] + [tuple(cur)]
                wm_tot += math.dist((cur[0], cur[1]), (gt[0], gt[1]))
                # constant-velocity baseline
                p0, p1 = traj[t - 1][i], traj[t][i]
                vx, vz = (p1[0] - p0[0]), (p1[1] - p0[1])
                bx, bz = p1[0] + vx * H, p1[1] + vz * H
                base_tot += math.dist((bx, bz), (gt[0], gt[1]))
                cnt += 1
    print(f"[wm] 2s-ahead rollout error over {cnt} cases:")
    print(f"[wm]   constant-velocity baseline : {base_tot / cnt:6.2f} m")
    print(f"[wm]   JEPA world model           : {wm_tot / cnt:6.2f} m  "
          f"({100 * (1 - wm_tot / base_tot):.0f}% better)")
    torch.save({"enc": enc.state_dict(), "pred": pred.state_dict(), "dec": dec.state_dict()},
               os.path.join(HERE, "world_model.pt"))
    print(f"[wm] saved -> {os.path.join(HERE, 'world_model.pt')}")


if __name__ == "__main__":
    main()
