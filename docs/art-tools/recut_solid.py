"""Re-cut fighter frames from the original sheets so the bodies are solid.

Why: the first cut keyed out every dark pixel, so the dark-gray armor on a
black sheet went see-through (holes in chests, arms and legs).

How: every existing frame (in frames/ and frames-hd/) is located on the
animal's lossless sheet in docs/sprite-sheets/<animal>/ by template matching.
The same box is cut again from the sheet with a new background removal:
background = near-black pixels connected to the outside of the box (plus
enclosed pure-black gaps such as between an arm and the body). Everything
inside the fighter's outline stays fully opaque. The old cut only limits
which shapes belong to the fighter, so frame sizes and anchor points are
unchanged and no game code changes are needed.

Usage (from the repo root):  python3 docs/art-tools/recut_solid.py lion tiger ...
"""
import os
import sys
import cv2
import numpy as np
import scipy.ndimage as nd
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CH = os.path.join(ROOT, "game", "assets", "characters")
SHEETS = os.path.join(ROOT, "docs", "sprite-sheets")

BG_T = 40        # max(R,G,B) below this, touching the outside -> background
POCKET_T = 16    # enclosed pockets darker than this -> background (real gaps)
POCKET_MIN = 150 # ...if at least this many sheet pixels (smaller = armor shadow)


def load_sheet(animal):
    p = os.path.join(SHEETS, animal, animal + "-sheet.png")
    return np.array(Image.open(p).convert("RGB"))


def match(sheet_bgr, frame, k):
    t = cv2.resize(frame, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    if t.shape[0] < 8 or t.shape[1] < 8:
        return None
    m = ((t[..., 3] > 245) * 255).astype(np.uint8)
    if m.sum() < 255 * 30:
        return None
    tb = cv2.cvtColor(t[..., :3], cv2.COLOR_RGB2BGR)
    r = cv2.matchTemplate(sheet_bgr, tb, cv2.TM_SQDIFF, mask=cv2.merge([m, m, m]))
    r = r / (m.sum() / 255)
    r[~np.isfinite(r)] = 1e12
    mn, _, loc, _ = cv2.minMaxLoc(r)
    return mn, loc


def figure_mask(crop, old_a):
    """crop: sheet RGB crop; old_a: old alpha resampled to the crop (0..255)."""
    mx = crop.max(-1).astype(np.int16)
    dark = mx < BG_T
    lab, _ = nd.label(dark)
    edge = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.isin(lab, edge[edge > 0])
    lab2, n2 = nd.label((mx < POCKET_T) & ~bg)
    if n2:
        sizes = nd.sum(np.ones_like(mx), lab2, range(1, n2 + 1))
        bg |= np.isin(lab2, np.where(sizes >= POCKET_MIN)[0] + 1)
    fig = ~bg
    # only shapes that belong to this fighter (the old cut marks them), so
    # neighbours, labels and row lines on the sheet are never pulled in
    old = old_a > 60
    zone = nd.binary_fill_holes(nd.binary_closing(old, iterations=6))
    zone = nd.binary_dilation(zone, iterations=2)
    fig &= zone
    lab3, n3 = nd.label(fig)
    if n3:
        hit = nd.sum(old, lab3, range(1, n3 + 1))
        fig = np.isin(lab3, np.where(hit > 3)[0] + 1)
    fig = nd.binary_closing(fig, iterations=1)
    return fig


def best_scale(sheet_bgr, frame, lo=0.30, hi=1.30):
    best = None
    for k in np.arange(lo, hi, 0.02):
        r = match(sheet_bgr, frame, k)
        if r and (best is None or r[0] < best[0]):
            best = (r[0], k)
    k0 = best[1]
    for k in np.arange(k0 - 0.02, k0 + 0.021, 0.004):
        r = match(sheet_bgr, frame, k)
        if r and r[0] < best[0]:
            best = (r[0], k)
    return best[1]


def cut_from_sheet(sheet, f, x, y, k):
    """Cut the box for frame f (RGBA, frame px) found at (x, y) with scale k.
    Returns RGBA at sheet resolution covering exactly that box."""
    H, fw = f.shape[:2]
    bw, bh = int(round(fw * k)), int(round(H * k))
    m = 4
    x0, y0 = x - m, y - m
    pad = np.zeros((bh + 2 * m, bw + 2 * m, 3), np.uint8)
    sx0, sy0 = max(0, x0), max(0, y0)
    sx1, sy1 = min(sheet.shape[1], x0 + pad.shape[1]), min(sheet.shape[0], y0 + pad.shape[0])
    pad[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = sheet[sy0:sy1, sx0:sx1]
    old = np.zeros(pad.shape[:2], np.uint8)
    old[m:m + bh, m:m + bw] = cv2.resize(f[..., 3], (bw, bh), interpolation=cv2.INTER_LINEAR)
    fig = figure_mask(pad, old)
    a = nd.gaussian_filter(fig.astype(np.float32), 0.6) * 255
    a[nd.binary_erosion(fig, iterations=1)] = 255
    rgba = np.dstack([pad, a.clip(0, 255).astype(np.uint8)])
    return rgba[m:m + bh, m:m + bw]


def to_size(rgba, w, h):
    c = rgba.astype(np.float32)
    c[..., :3] *= c[..., 3:4] / 255
    up = w > rgba.shape[1]
    r = cv2.resize(c, (w, h), interpolation=cv2.INTER_CUBIC if up else cv2.INTER_AREA)
    r = np.clip(r, 0, 255)
    al = r[..., 3:4]
    rgb = np.where(al > 0.5, r[..., :3] * 255 / np.maximum(al, 1e-3), 0)
    return np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8)


def merge_effects(new, old):
    # keep anything bright the old cut had (slash and impact effects)
    keep = (old[..., 3] > new[..., 3]) & (old[..., :3].max(-1) > 90)
    new[keep] = old[keep]
    return new


def recut_anim(animal, name, n, sheet, sb):
    ph = os.path.join(CH, animal, "frames-hd", name + ".webp")
    pn = os.path.join(CH, animal, "frames", name + ".webp")
    hd = np.array(Image.open(ph).convert("RGBA"))
    nm = np.array(Image.open(pn).convert("RGBA"))
    H, fw = hd.shape[0], hd.shape[1] // n
    Hn, fwn = nm.shape[0], nm.shape[1] // n
    frames = [hd[:, i * fw:(i + 1) * fw] for i in range(n)]
    ref = max(range(n), key=lambda i: (frames[i][..., 3] > 245).sum())
    k = best_scale(sb, frames[ref])
    worst = 0
    for i, f in enumerate(frames):
        if (f[..., 3] > 245).sum() < 30:
            continue
        err, (x, y) = match(sb, f, k)
        worst = max(worst, err)
        if err > 6000:      # not found on this sheet: leave the old frame alone
            continue
        cut = cut_from_sheet(sheet, f, x, y, k)
        hd[:, i * fw:(i + 1) * fw] = merge_effects(to_size(cut, fw, H), f)
        on = nm[:, i * fwn:(i + 1) * fwn]
        nm[:, i * fwn:(i + 1) * fwn] = merge_effects(to_size(cut, fwn, Hn), on)
    Image.fromarray(hd, "RGBA").save(ph, "WEBP", quality=88, method=6)
    Image.fromarray(nm, "RGBA").save(pn, "WEBP", quality=88, method=6)
    return k, worst


def run_animal(animal):
    import json, re
    src = open(os.path.join(ROOT, "game", "js", "sprites-hd.js")).read()
    hd = json.loads(re.search(r"SPRITES_HD=(\{.*\});?\s*$", src, re.S).group(1).rstrip(";"))
    sheet = load_sheet(animal)
    sb = cv2.cvtColor(sheet, cv2.COLOR_RGB2BGR)
    lines = []
    for name, spec in hd[animal]["anims"].items():
        k, worst = recut_anim(animal, name, spec[0], sheet, sb)
        flag = "  <-- kept old (no match)" if worst > 6000 else ""
        lines.append(f"{animal:9s} k={k:.3f} {name:16s} err={worst:7.0f}{flag}")
    return "\n".join(lines)


def main(animals):
    from multiprocessing import Pool
    with Pool(min(len(animals), os.cpu_count() or 1)) as p:
        for out in p.imap(run_animal, animals):
            print(out, flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])


def second_pass(animal):
    """Frames that didn't match at their animation's scale (a few hand-cut
    rows): search a scale for each frame on its own."""
    import json, re
    src = open(os.path.join(ROOT, "game", "js", "sprites-hd.js")).read()
    spec = json.loads(re.search(r"SPRITES_HD=(\{.*\});?\s*$", src, re.S).group(1).rstrip(";"))[animal]["anims"]
    sheet = load_sheet(animal)
    sb = cv2.cvtColor(sheet, cv2.COLOR_RGB2BGR)
    lines = []
    for name in ("uppercut", "special_pounce", "hit_heavy", "knockdown_getup", "defeat", "attack_heavy", "pounce"):
        if name not in spec:
            continue
        n = spec[name][0]
        ph = os.path.join(CH, animal, "frames-hd", name + ".webp")
        pn = os.path.join(CH, animal, "frames", name + ".webp")
        hd = np.array(Image.open(ph).convert("RGBA"))
        nm = np.array(Image.open(pn).convert("RGBA"))
        H, fw = hd.shape[0], hd.shape[1] // n
        Hn, fwn = nm.shape[0], nm.shape[1] // n
        k0 = best_scale(sb, hd[:, :fw]) if (hd[:, :fw, 3] > 245).sum() > 30 else 0.42
        changed = []
        for i in range(n):
            f = hd[:, i * fw:(i + 1) * fw]
            if (f[..., 3] > 245).sum() < 30:
                continue
            r = match(sb, f, k0)
            if r and r[0] <= 6000:
                k, (err, (x, y)) = k0, r
            else:
                k = best_scale(sb, f, 0.30, 0.80)
                err, (x, y) = match(sb, f, k)
            if err > 6000:
                lines.append(f"{animal} {name} frame {i}: still no match ({err:.0f})")
                continue
            cut = cut_from_sheet(sheet, f, x, y, k)
            hd[:, i * fw:(i + 1) * fw] = merge_effects(to_size(cut, fw, H), f)
            on = nm[:, i * fwn:(i + 1) * fwn]
            nm[:, i * fwn:(i + 1) * fwn] = merge_effects(to_size(cut, fwn, Hn), on)
            changed.append(i)
        if changed:
            Image.fromarray(hd, "RGBA").save(ph, "WEBP", quality=88, method=6)
            Image.fromarray(nm, "RGBA").save(pn, "WEBP", quality=88, method=6)
            lines.append(f"{animal} {name}: re-cut frames {changed}")
    return "\n".join(lines)
