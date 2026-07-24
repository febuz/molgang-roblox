#!/usr/bin/env python3
"""
fast_gan.py — a fast GAN generator alongside the (slow) diffusion pipeline.

Diffusion (SD-Turbo) makes high-quality impostors but costs ~1 s each. A GAN
generates in well under a millisecond — real-time. So the practical pattern
(what "fast GANs alongside diffusion" means here): diffusion AUTHORS the seed
impostors, then a small GAN is distilled from them into a real-time generator
that can spit out impostor-like sprites on the fly as the world streams — no
GPU diffusion in the hot path.

This is a compact demonstration/foundation: with only ~26 seed images (heavily
augmented) the quality is limited, but the SPEED win — the whole reason to use
a GAN — is the deliverable and is measured against diffusion. Trained briefly
to stay light on a shared GPU.

Run:  python3 assets/world/fast_gan.py
"""
import glob
import os
import time

import numpy as np
import torch
import torch.nn as nn
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
IMP = os.path.join(HERE, "impostors")
RES = 64
DEV = "cuda" if torch.cuda.is_available() else "cpu"
Z = 64


def load_data():
    imgs = []
    for f in glob.glob(os.path.join(IMP, "*.png")):
        im = Image.open(f).convert("RGBA")
        bg = Image.new("RGB", im.size, (24, 28, 34))
        bg.paste(im, mask=im.split()[3])
        bg = bg.resize((RES, RES))
        a = np.asarray(bg, dtype=np.float32) / 127.5 - 1.0
        imgs.append(a)
        imgs.append(a[:, ::-1, :].copy())            # h-flip augment
    base = np.stack(imgs).transpose(0, 3, 1, 2)      # N,C,H,W
    return torch.tensor(base)


def aug(x):
    # cheap on-the-fly augmentation: flip + small colour jitter
    if torch.rand(1).item() < 0.5:
        x = torch.flip(x, dims=[3])
    x = x + torch.randn(x.size(0), 3, 1, 1, device=x.device) * 0.05
    return x.clamp(-1, 1)


class G(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.ConvTranspose2d(Z, 256, 4, 1, 0), nn.BatchNorm2d(256), nn.ReLU(True),   # 4
            nn.ConvTranspose2d(256, 128, 4, 2, 1), nn.BatchNorm2d(128), nn.ReLU(True), # 8
            nn.ConvTranspose2d(128, 64, 4, 2, 1), nn.BatchNorm2d(64), nn.ReLU(True),   # 16
            nn.ConvTranspose2d(64, 32, 4, 2, 1), nn.BatchNorm2d(32), nn.ReLU(True),    # 32
            nn.ConvTranspose2d(32, 3, 4, 2, 1), nn.Tanh())                             # 64

    def forward(self, z): return self.net(z)


class D(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(3, 32, 4, 2, 1), nn.LeakyReLU(0.2, True),
            nn.Conv2d(32, 64, 4, 2, 1), nn.BatchNorm2d(64), nn.LeakyReLU(0.2, True),
            nn.Conv2d(64, 128, 4, 2, 1), nn.BatchNorm2d(128), nn.LeakyReLU(0.2, True),
            nn.Conv2d(128, 256, 4, 2, 1), nn.BatchNorm2d(256), nn.LeakyReLU(0.2, True),
            nn.Conv2d(256, 1, 4, 1, 0))

    def forward(self, x): return self.net(x).view(-1)


def main():
    torch.manual_seed(0)
    data = load_data().to(DEV)
    print(f"[gan] {data.size(0)} seed images (augmented from impostors), {RES}x{RES}, device={DEV}")
    g, d = G().to(DEV), D().to(DEV)
    og = torch.optim.Adam(g.parameters(), 2e-4, betas=(0.5, 0.999))
    od = torch.optim.Adam(d.parameters(), 2e-4, betas=(0.5, 0.999))
    bce = nn.BCEWithLogitsLoss()
    STEPS, B = 1500, 32
    for it in range(STEPS):
        idx = torch.randint(0, data.size(0), (B,), device=DEV)
        real = aug(data[idx])
        z = torch.randn(B, Z, 1, 1, device=DEV)
        fake = g(z)
        # D step
        od.zero_grad()
        ld = bce(d(real), torch.ones(B, device=DEV) * 0.9) + bce(d(fake.detach()), torch.zeros(B, device=DEV))
        ld.backward(); od.step()
        # G step
        og.zero_grad()
        lg = bce(d(fake), torch.ones(B, device=DEV))
        lg.backward(); og.step()
        if it % 300 == 0 or it == STEPS - 1:
            print(f"[gan] step {it:4d}  D {ld.item():.3f}  G {lg.item():.3f}")

    # sample sheet
    g.eval()
    with torch.no_grad():
        z = torch.randn(36, Z, 1, 1, device=DEV)
        s = ((g(z).clamp(-1, 1) + 1) * 127.5).byte().cpu().numpy().transpose(0, 2, 3, 1)
    sheet = Image.new("RGB", (6 * RES, 6 * RES))
    for i in range(36):
        sheet.paste(Image.fromarray(s[i]), ((i % 6) * RES, (i // 6) * RES))
    out = os.path.join(HERE, "fastgan_samples.png")
    sheet.save(out)

    # speed benchmark — the point of a GAN vs diffusion
    g.eval()
    with torch.no_grad():
        z = torch.randn(64, Z, 1, 1, device=DEV)
        if DEV == "cuda": torch.cuda.synchronize()
        t0 = time.time()
        for _ in range(10): _ = g(z)
        if DEV == "cuda": torch.cuda.synchronize()
        per = (time.time() - t0) / (10 * 64) * 1000
    torch.save(g.state_dict(), os.path.join(HERE, "fastgan_G.pt"))
    print(f"[gan] samples -> {out}")
    print(f"[gan] SPEED: fast GAN {per:.3f} ms/image  vs  SD-Turbo diffusion ~1000 ms/image "
          f"(~{int(1000/per)}x faster)")
    print(f"[gan] saved generator -> fastgan_G.pt  (real-time on-the-fly impostor generation)")


if __name__ == "__main__":
    main()
