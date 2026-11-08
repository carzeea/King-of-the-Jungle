"""Second pass after pad_recut.py: clean the newly added border area of each frame.
Keeps only recovered pixels that are thick (no sheet divider lines) and connected to a shape
that is mostly part of the original frame (no slivers of neighbouring frames).
Needs the original frames (before pad_recut) in --old DIR (same layout as game/assets/characters)."""
import os, sys, json, re, argparse
import numpy as np, scipy.ndimage as nd
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import recut_solid as R
CH = R.CH
LO_S, HD_S = 0.34, 0.8

def locate(cell, old):
    H, W = cell.shape[:2]; h, w = old.shape[:2]
    oa = old[..., 3] > 0
    best = None
    for t in range(H - h + 1):
        for l in range(W - w + 1):
            d = np.count_nonzero((cell[t:t + h, l:l + w, 3] > 0) != oa)
            if best is None or d < best[0]:
                best = (d, t, l)
    return best[1], best[2]

def clean(cell, t, l, h, w):
    H, W = cell.shape[:2]
    pad = np.ones((H, W), bool); pad[t:t + h, l:l + w] = False
    a = cell[..., 3] > 40
    pa = nd.binary_opening(a & pad, structure=R.disk(3))
    full = (a & ~pad) | pa
    lab, n = nd.label(full, structure=np.ones((3, 3)))
    if n:
        inside = nd.sum(full & ~pad, lab, range(1, n + 1))
        size = nd.sum(full, lab, range(1, n + 1))
        ok = np.where((inside >= 30) & (inside >= 0.2 * size))[0] + 1
        keep = np.isin(lab, ok)
    else:
        keep = full
    keep = nd.binary_dilation(keep, iterations=1)
    cell[pad & ~keep] = 0
    return cell

ap = argparse.ArgumentParser(); ap.add_argument("--old", required=True); ap.add_argument("animals", nargs="+")
args = ap.parse_args()
HD = json.loads(re.search(r"SPRITES_HD=(\{.*\});?\s*$", open(os.path.join(R.ROOT, "game/js/sprites-hd.js")).read(), re.S).group(1).rstrip(";"))
OLD = json.loads(re.search(r"SPRITES_HD=(\{.*\});?\s*$", open(os.path.join(args.old, "..", "js", "sprites-hd.js")).read(), re.S).group(1).rstrip(";"))
for a in args.animals:
    for name, (n, NW, NH, px, py) in HD[a]["anims"].items():
        on, fw, fh, opx, opy = OLD[a]["anims"][name]
        if (NW, NH) == (fw, fh):
            continue
        new = np.array(Image.open(os.path.join(CH, a, "frames-hd", name + ".webp")).convert("RGBA"))
        old = np.array(Image.open(os.path.join(args.old, a, "frames-hd", name + ".webp")).convert("RGBA"))
        t, l = locate(new[:, :NW], old[:, :fw])
        for i in range(n):
            new[:, i * NW:(i + 1) * NW] = clean(new[:, i * NW:(i + 1) * NW].copy(), t, l, fh, fw)
        Image.fromarray(new, "RGBA").save(os.path.join(CH, a, "frames-hd", name + ".webp"), "WEBP", quality=88, method=6)
        lw, lh = max(1, round(NW * LO_S / HD_S)), max(1, round(NH * LO_S / HD_S))
        lo = np.zeros((lh, lw * n, 4), np.uint8)
        for i in range(n):
            lo[:, i * lw:(i + 1) * lw] = R.to_size(new[:, i * NW:(i + 1) * NW], lw, lh)
        Image.fromarray(lo, "RGBA").save(os.path.join(CH, a, "frames", name + ".webp"), "WEBP", quality=88, method=6)
        print(a, name, "offset", t, l, flush=True)
