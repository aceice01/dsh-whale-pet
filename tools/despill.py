# despill.py — remove green-screen fringe from whale-girl GIFs.
# For each frame: pixels where green strongly dominates red/blue get their
# green channel pulled down to max(r, b) (chroma spill removal), preserving
# the character's own blue/teal colors. Rewrites the GIFs in place.
import os
from PIL import Image

DIR = r"D:\Desktop\new\dsh-whale-pet\lib\anim"
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

for name in NAMES:
    src = os.path.join(DIR, name + ".gif")
    im = Image.open(src)
    frames = []
    durations = []
    disposal = []
    for i in range(im.n_frames):
        im.seek(i)
        durations.append(im.info.get("duration", 100))
        frames.append(despill_frame(im))
    # save animated GIF preserving per-frame duration + transparency
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
