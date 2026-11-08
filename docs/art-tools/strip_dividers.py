"""Remove leftover bits of the sheets' gold divider lines along the top of frames.
They show up as thin, long, flat gold streaks above a fighter's head."""
import os, sys, json, re
import numpy as np, scipy.ndimage as nd
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import recut_solid as R
LO_S, HD_S = 0.34, 0.8
HD = json.loads(re.search(r"SPRITES_HD=(\{.*\});?\s*$", open(os.path.join(R.ROOT, "game/js/sprites-hd.js")).read(), re.S).group(1).rstrip(";"))

def fix(cell, band):
    rgb = cell[..., :3].astype(int); a = cell[..., 3] > 30
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    gold = a & (r > 140) & (g > 95) & (b < 140) & (r - b > 55)
    gold[band:] = False
    line = nd.binary_opening(gold, structure=np.ones((1, 17)))
    thick = nd.binary_opening(gold, structure=np.ones((15, 1)))      # real armour/head is tall, a divider is not
    line &= ~nd.binary_dilation(thick, iterations=2)
    if not line.any():
        return cell, 0
    kill = nd.binary_dilation(line, structure=np.ones((5, 3)))
    kill[band + 2:] = False
    # only where there is little figure directly below (a streak floating over the head or along the top edge)
    cell[kill] = 0
    return cell, int(line.sum())

for a in sys.argv[1:]:
    for name, (n, fw, fh, px, py) in HD[a]["anims"].items():
        p = os.path.join(R.CH, a, "frames-hd", name + ".webp")
        im = np.array(Image.open(p).convert("RGBA"))
        tot = 0
        for i in range(n):
            c, k = fix(im[:, i * fw:(i + 1) * fw].copy(), max(14, int(fh * 0.12)))
            im[:, i * fw:(i + 1) * fw] = c; tot += k
        if tot:
            Image.fromarray(im, "RGBA").save(p, "WEBP", quality=88, method=6)
            lw, lh = max(1, round(fw * LO_S / HD_S)), max(1, round(fh * LO_S / HD_S))
            lo = np.zeros((lh, lw * n, 4), np.uint8)
            for i in range(n):
                lo[:, i * lw:(i + 1) * lw] = R.to_size(im[:, i * fw:(i + 1) * fw], lw, lh)
            Image.fromarray(lo, "RGBA").save(os.path.join(R.CH, a, "frames", name + ".webp"), "WEBP", quality=88, method=6)
            print(a, name, tot, flush=True)
