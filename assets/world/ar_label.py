#!/usr/bin/env python3
"""
ar_label.py — close the loop: run YOLOv9 on each diffusion impostor so the
"unidentified" objects the diffusion model invented get RE-identified by an
object detector, exactly the way an AR headset would recognise them.

Writes ar_labels.json: {impostor_type: {yolo: <coco class>, conf: <float>}}.
The browser AR overlay uses these labels for the diffusion objects (and the
asset name for the real models), so the AR HUD can name both.

YOLO is photo-trained, so it reads the photo-like impostor sources well but
NOT the stylised low-poly world render — which is exactly why detection runs
here on the impostor images, and the overlay draws from known identities
rather than trying to detect the stylised canvas live.

Run:  python3 assets/world/ar_label.py
"""
import json
import os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
IMP_DIR = os.path.join(HERE, "impostors")
OUT = os.path.join(HERE, "ar_labels.json")


def main():
    from ultralytics import YOLO
    from PIL import Image
    model = YOLO("yolov9c.pt")
    impostors = json.load(open(os.path.join(IMP_DIR, "impostors.json")))["impostors"]

    labels = {}
    for t in impostors:
        p = os.path.join(IMP_DIR, f"{t}.png")
        im = Image.open(p).convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[3])
        res = model(bg, conf=0.15, verbose=False)[0]
        # Pick the most-confident non-noise detection; fall back to majority.
        best, best_conf = None, 0.0
        votes = Counter()
        for b in res.boxes:
            cls = res.names[int(b.cls[0])]
            conf = float(b.conf[0])
            votes[cls] += 1
            if conf > best_conf and cls not in ("kite", "book", "sink"):
                best, best_conf = cls, conf
        if best is None and votes:
            best = votes.most_common(1)[0][0]
        labels[t] = {"yolo": best, "conf": round(best_conf, 3)}
        print(f"[ar] {t:18s} -> YOLO: {best} ({best_conf:.2f})")

    json.dump({"model": "yolov9c", "labels": labels}, open(OUT, "w"), indent=2)
    hit = sum(1 for v in labels.values() if v["yolo"])
    print(f"[done] {hit}/{len(labels)} impostors recognised by YOLO -> {OUT}")


if __name__ == "__main__":
    main()
