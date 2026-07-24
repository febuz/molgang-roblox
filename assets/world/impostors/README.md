# Diffusion impostors — gap-fill for the game world

Object types the identified asset library (`assets/models/*.glb`) does **not**
provide, generated as billboard impostors by Stable Diffusion Turbo
(`stabilityai/sd-turbo`, ungated) — see `../generate_impostors.py`.

Each PNG is a seeded, deterministic generation; `impostors.json` records the
prompt + model + seed per type (provenance). The PNGs are committed so the
world renders without a GPU; regenerating needs the diffusion stack + GPU.

Backgrounds are keyed to transparent (magenta green-screen + border
flood-fill). Matting is best-effort: SD-Turbo renders some subjects as full
scenes it won't isolate, so a few keep a faint base — the world places
impostors as ground-standing billboards so any residue sits at/below ground.
