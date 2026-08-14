#!/usr/bin/env python3
"""defringe.py — remove magenta chroma-key residue from whale-girl GIFs.

Pure magenta (255,0,255) and near-magenta pixels are chroma-key spill from the
original green-screen capture, not part of the character (blue/white/pink
palette). They are turned transparent so no bright fringe shows on light
backgrounds. Rewrites the GIFs in place under `lib/anim/`.

Usage:
    pip install pillow
    python tools/defringe.py
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "lib", "anim")
NAMES = ["idle", "running", "failed", "waiting", "waving", "jumping"]


def is_magenta(r, g, b):
    # strong magenta: red & blue high, green low
    return r > 190 and b > 190 and g < 110


def is_pink_spill(r, g, b):
    # pinkish spill: red dominant, blue mid-high, green very low
    return r > 200 and b > 120 and g < 120 and r > b + 40


def fix(img):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    removed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if is_magenta(r, g, b) or is_pink_spill(r, g, b):
                px[x, y] = (0, 0, 0, 0)
                removed += 1
    return img, removed


def main():
    total_removed = 0
    for name in NAMES:
        src = os.path.join(DIR, name + ".gif")
        im = Image.open(src)
        frames = []
        durations = []
        removed = 0
        for i in range(im.n_frames):
            im.seek(i)
            durations.append(im.info.get("duration", 100))
            fr, n = fix(im)
            removed += n
            frames.append(fr)
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
        print(f"{name}: removed {removed} chroma px")
        total_removed += removed
    print(f"TOTAL removed: {total_removed}")


if __name__ == "__main__":
    main()
