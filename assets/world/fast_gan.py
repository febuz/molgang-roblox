#!/usr/bin/env python3
"""
fast_gan.py — a fast, class-conditional GAN distilled from diffusion.

Diffusion (SD-Turbo) makes high-quality impostors but costs ~1 s each. A GAN
generates in well under a millisecond. So: diffusion AUTHORS a labelled seed
set (a handful of varied samples per object class), then a small class-
conditional GAN (ACGAN) is distilled from it into a real-time, per-class
generator — pick a class, get a fresh impostor instantly, no diffusion in the
hot path.

Upgrade over the first pass (which had only 26 blurry-blended seeds): the seed
set is now per-class and larger, and the GAN is conditioned on the class, so it
produces recognisable per-class sprites instead of a mush of all objects.

Run:  python3 assets/world/fast_gan.py
  (generates the seed set once via SD-Turbo, then trains + benchmarks)
"""
import glob
import os
import sys
import time

import numpy as np
import torch
import torch.nn as nn
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "gan_data")
RES, Z, DEV = 64, 64, "cuda" if torch.cuda.is_available() else "cpu"
PER_CLASS = 16

CLASSES = {
    "car": "a single parked stylized sedan car, side view",
    "tree": "a single lone pine tree",
    "city_bus": "a single blue city bus, side view",
    "delivery_truck": "a single box delivery truck, side view",
    "motorcycle": "a single parked motorcycle, side view",
    "fire_hydrant": "a single red fire hydrant",
    "phone_booth": "a single red telephone booth",
    "palm_tree": "a single tall palm tree",
    "dumpster": "a single green metal dumpster bin",
    "worker": "a single construction worker in an orange hi-vis vest and hard hat, full body",
}
NAMES = list(CLASSES)
NC = len(NAMES)


def ensure_dataset():
    os.makedirs(DATA, exist_ok=True)
    have = len(glob.glob(os.path.join(DATA, "*.png")))
    if have >= NC * PER_CLASS:
        print(f"[gan] seed set cached ({have} images)")
        return
    print(f"[gan] generating {NC * PER_CLASS} labelled seed images via SD-Turbo ...")
    sys.path.insert(0, HERE)
    from generate_impostors import knockout_background
    import torch as T
    from diffusers import AutoPipelineForText2Image
    pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sd-turbo", torch_dtype=T.float16, variant="fp16", safety_checker=None).to("cuda")
    STYLE = ("low-poly stylized game asset, isometric, isolated cutout on a solid "
             "flat magenta background, no scene, no ground, no shadow, centered")
    for ci, name in enumerate(NAMES):
        for k in range(PER_CLASS):
            fp = os.path.join(DATA, f"{name}__{k}.png")
            if os.path.exists(fp):
                continue
            g = T.Generator(device="cuda").manual_seed(1000 * ci + k)
            img = pipe(f"{CLASSES[name]}, {STYLE}", num_inference_steps=3, guidance_scale=0.0,
                       height=512, width=512, generator=g).images[0]
            ko = knockout_background(img)
            bg = Image.new("RGB", ko.size, (24, 28, 34))
            bg.paste(ko, mask=ko.split()[3])
            bg.resize((RES, RES)).save(fp)
        print(f"[gan]   {name}: {PER_CLASS} samples")


def load_data():
    X, Y = [], []
    for f in glob.glob(os.path.join(DATA, "*.png")):
        name = os.path.basename(f).split("__")[0]
        if name not in NAMES:
            continue
        a = np.asarray(Image.open(f).convert("RGB"), dtype=np.float32) / 127.5 - 1.0
        X.append(a.transpose(2, 0, 1)); Y.append(NAMES.index(name))
    return torch.tensor(np.stack(X)), torch.tensor(Y, dtype=torch.long)


class G(nn.Module):
    def __init__(self):
        super().__init__()
        self.emb = nn.Embedding(NC, 32)
        self.net = nn.Sequential(
            nn.ConvTranspose2d(Z + 32, 256, 4, 1, 0), nn.BatchNorm2d(256), nn.ReLU(True),
            nn.ConvTranspose2d(256, 128, 4, 2, 1), nn.BatchNorm2d(128), nn.ReLU(True),
            nn.ConvTranspose2d(128, 64, 4, 2, 1), nn.BatchNorm2d(64), nn.ReLU(True),
            nn.ConvTranspose2d(64, 32, 4, 2, 1), nn.BatchNorm2d(32), nn.ReLU(True),
            nn.ConvTranspose2d(32, 3, 4, 2, 1), nn.Tanh())

    def forward(self, z, y):
        c = self.emb(y).unsqueeze(-1).unsqueeze(-1)
        return self.net(torch.cat([z, c], 1))


class D(nn.Module):
    def __init__(self):
        super().__init__()
        self.feat = nn.Sequential(
            nn.Conv2d(3, 32, 4, 2, 1), nn.LeakyReLU(0.2, True),
            nn.Conv2d(32, 64, 4, 2, 1), nn.BatchNorm2d(64), nn.LeakyReLU(0.2, True),
            nn.Conv2d(64, 128, 4, 2, 1), nn.BatchNorm2d(128), nn.LeakyReLU(0.2, True),
            nn.Conv2d(128, 256, 4, 2, 1), nn.BatchNorm2d(256), nn.LeakyReLU(0.2, True))
        self.adv = nn.Conv2d(256, 1, 4, 1, 0)
        self.cls = nn.Conv2d(256, NC, 4, 1, 0)

    def forward(self, x):
        f = self.feat(x)
        return self.adv(f).view(-1), self.cls(f).view(-1, NC)


def main():
    torch.manual_seed(0)
    ensure_dataset()
    X, Y = load_data()
    X, Y = X.to(DEV), Y.to(DEV)
    print(f"[gan] {X.size(0)} labelled images / {NC} classes, {RES}x{RES}, device={DEV}")
    g, d = G().to(DEV), D().to(DEV)
    og = torch.optim.Adam(g.parameters(), 2e-4, betas=(0.5, 0.999))
    od = torch.optim.Adam(d.parameters(), 2e-4, betas=(0.5, 0.999))
    bce, ce = nn.BCEWithLogitsLoss(), nn.CrossEntropyLoss()
    STEPS, B = 3000, 48
    for it in range(STEPS):
        idx = torch.randint(0, X.size(0), (B,), device=DEV)
        real, ry = X[idx], Y[idx]
        if torch.rand(1).item() < 0.5: real = torch.flip(real, dims=[3])
        z = torch.randn(B, Z, 1, 1, device=DEV)
        fy = torch.randint(0, NC, (B,), device=DEV)
        fake = g(z, fy)
        # D
        od.zero_grad()
        radv, rcls = d(real); fadv, _ = d(fake.detach())
        ld = bce(radv, torch.ones(B, device=DEV) * 0.9) + bce(fadv, torch.zeros(B, device=DEV)) + ce(rcls, ry)
        ld.backward(); od.step()
        # G
        og.zero_grad()
        gadv, gcls = d(fake)
        lg = bce(gadv, torch.ones(B, device=DEV)) + ce(gcls, fy)
        lg.backward(); og.step()
        if it % 500 == 0 or it == STEPS - 1:
            print(f"[gan] step {it:4d}  D {ld.item():.3f}  G {lg.item():.3f}")

    # per-class sample sheet: one row per class, several samples each
    g.eval()
    cols = 8
    sheet = Image.new("RGB", (cols * RES, NC * RES), (24, 28, 34))
    with torch.no_grad():
        for ci in range(NC):
            z = torch.randn(cols, Z, 1, 1, device=DEV)
            y = torch.full((cols,), ci, device=DEV, dtype=torch.long)
            s = ((g(z, y).clamp(-1, 1) + 1) * 127.5).byte().cpu().numpy().transpose(0, 2, 3, 1)
            for j in range(cols):
                sheet.paste(Image.fromarray(s[j]), (j * RES, ci * RES))
    out = os.path.join(HERE, "fastgan_samples.png")
    sheet.save(out)

    with torch.no_grad():
        z = torch.randn(64, Z, 1, 1, device=DEV); y = torch.randint(0, NC, (64,), device=DEV)
        if DEV == "cuda": torch.cuda.synchronize()
        t0 = time.time()
        for _ in range(10): _ = g(z, y)
        if DEV == "cuda": torch.cuda.synchronize()
        per = (time.time() - t0) / (10 * 64) * 1000
    torch.save({"g": g.state_dict(), "classes": NAMES}, os.path.join(HERE, "fastgan_G.pt"))
    print(f"[gan] per-class samples -> {out}")
    print(f"[gan] SPEED: {per:.3f} ms/image vs SD-Turbo ~1000 ms (~{int(1000/per)}x faster), class-conditional")


if __name__ == "__main__":
    main()
