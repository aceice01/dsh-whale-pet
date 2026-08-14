#!/usr/bin/env python3
"""despill.py — remove green-screen (chroma key) fringe from whale-girl GIFs.

Pixels where green strongly dominates red/blue are chroma spill from the
original green-screen capture; their green channel is pulled down to
max(r, b), preserving the character's own blue/teal palette. Rewrites the
GIFs in place under `lib/anim/`.

Usage:
    pip install pillow
    python tools/despill.py
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "lib", "anim")
NAMES = ["idle", "running", "failed", "waiting", "waving", "jumping"]


def despill_frame(img):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx = r if r > b else b
            if g > mx + 40:
                # strong spill: remove green excess entirely
                px[x, y] = (r, mx, b, a)
            elif g > mx + 15:
                # mild spill: keep 30% of the excess (natural sheen)
                excess = g - mx
                px[x, y] = (r, mx + int(excess * 0.3), b, a)
    return img


def main():
    for name in NAMES:
        src = os.path.join(DIR, name + ".gif")
        im = Image.open(src)
        frames = []
        durations = []
        for i in range(im.n_frames):
            im.seek(i)
            durations.append(im.info.get("duration", 100))
            frames.append(despill_frame(im))
        # Save animated GIF preserving per-frame duration + transparency.
        frames[0].save(
            src,
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
            transparency=0,
            disposal=2,
            optimize=False,
        )
        print("despilled:", name, "frames:", len(frames), "size:", os.path.getsize(src))
    print("done")


if __name__ == "__main__":
    main()
