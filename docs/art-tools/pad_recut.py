"""Un-crop fighter frames whose head, arm or leg was cut off flat at the frame edge.

Why: the first cut used boxes that were too tight, so in many animations the top of
the head or a reaching arm ended in a straight line at the frame border.

How: for every animation with a clipped frame, each frame is found on the animal's
lossless sheet (template matching, same as recut_solid.py). A larger area around it is
cut from the sheet, and only the parts of the figure that are connected to the existing
fighter are kept (neighbouring frames on the sheet are separate shapes and are dropped).
The frame cell is widened/heightened by the amount needed, the old pixels stay exactly
as they were, and the recovered parts are added around them. Anchor points are moved by
the padding so the fighter stands in exactly the same place in the game.
Writes frames-hd/ and frames/ strips and updates SPRITES_HD (sprites-hd.js) and SPRITES (game.js).

Usage (repo root):  python3 docs/art-tools/pad_recut.py lion tiger ...
"""
import os, sys, json, re
import numpy as np, cv2, scipy.ndimage as nd
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import recut_solid as R

ROOT = R.ROOT
CH = R.CH
HDJS = os.path.join(ROOT, "game", "js", "sprites-hd.js")
GJS = os.path.join(ROOT, "game", "js", "game.js")
LO_S, HD_S = 0.34, 0.8
CAPS = False   # drawn-in head tops looked like hats; heads cut by the sheet need new art


def load_hd():
    src = open(HDJS).read()
    return json.loads(re.search(r"SPRITES_HD=(\{.*\});?\s*$", src, re.S).group(1).rstrip(";"))


def clipped(f):
    """True for each edge (left, right, top) where the figure ends in a straight cut:
    almost as wide at the border as a few pixels further in (a natural edge tapers)."""
    a = f[..., 3] > 100
    res = []
    for e, inn in ((a[:, 0], a[:, 6]), (a[:, -1], a[:, -7]), (a[0, :], a[6, :])):
        ne, ni = e.sum(), inn.sum()
        res.append(bool(ne >= 12 and ne >= 0.75 * ni))
    return tuple(res)


def tidy(cell):
    """Drop small stray bits at the cell border (pieces of a neighbouring frame on the sheet)."""
    a = cell[..., 3] > 150
    lab, n = nd.label(a, structure=np.ones((3, 3)))
    if n < 2:
        return cell
    sizes = nd.sum(a, lab, range(1, n + 1))
    big = sizes.max()
    H, W = a.shape
    m = 3
    border = set(np.unique(np.r_[lab[:m].ravel(), lab[-m:].ravel(), lab[:, :m].ravel(), lab[:, -m:].ravel()])) - {0}
    drop = np.zeros_like(a)
    for i in border:
        if sizes[i - 1] < 0.10 * big:
            drop |= lab == i
    if drop.any():
        drop = nd.binary_dilation(drop, iterations=3) & ~nd.binary_dilation(a & ~drop, iterations=1)
        cell[drop] = 0
    return cell


def cap_runs(cell):
    """Runs of opaque pixels along the top row (a head or mane cut flat by the old crop)."""
    a = cell[..., 3] > 100
    if not clipped(cell)[2]:
        return []
    row = a[0]
    runs, x = [], 0
    W = len(row)
    while x < W:
        if row[x]:
            x0 = x
            while x < W and row[x]:
                x += 1
            if x - x0 >= 8:
                runs.append((x0, x))
        else:
            x += 1
    return runs


def cap_height(runs):
    return max([min(26, max(5, int((x1 - x0) * 0.28))) for x0, x1 in runs] or [0])


def add_cap(cell, runs, extra):
    """Grow a rounded top over each flat cut: a half-ellipse filled with the colours of
    the top rows, a little darker towards the rim, with a soft edge."""
    if not runs:
        return cell
    H, W = cell.shape[:2]
    base = cell[extra:extra + 4].astype(np.float32)          # first rows of the old top
    col = (base[..., :3] * (base[..., 3:4] / 255)).sum(0) / np.maximum((base[..., 3:4] / 255).sum(0), 1e-3)
    for x0, x1 in runs:
        w = x1 - x0
        h = min(extra, min(26, max(5, int(w * 0.28))))
        cx, rx = (x0 + x1 - 1) / 2, w / 2
        for yy in range(h):
            t = (yy + 1) / h                                  # 0 at the cut, 1 at the top of the dome
            half = rx * np.sqrt(max(0.0, 1 - t * t))
            y = extra - 1 - yy
            for x in range(int(np.floor(cx - half - 1)), int(np.ceil(cx + half + 1)) + 1):
                if x < 0 or x >= W:
                    continue
                d = half - abs(x - cx)
                al = np.clip(d + 0.5, 0, 1)
                if al <= 0:
                    continue
                shade = 1 - 0.28 * t - 0.25 * (1 - min(1, d / 3))
                c = col[min(W - 1, max(0, x))] * shade
                a0 = cell[y, x, 3] / 255
                na = al + a0 * (1 - al)
                if na > 0:
                    cell[y, x, :3] = ((c * al + cell[y, x, :3] * a0 * (1 - al)) / na).clip(0, 255)
                cell[y, x, 3] = int(na * 255)
    return cell


def grow(sheet, f, x, y, k, mt, ms):
    """Figure (RGBA at hd scale) in a box enlarged by mt (top) and ms (sides) hd px."""
    fh, fw = f.shape[:2]
    bw, bh = int(round(fw * k)), int(round(fh * k))
    T, S = int(round(mt * k)), int(round(ms * k))
    x0, y0 = x - S, y - T
    W, H = bw + 2 * S, bh + T + 2
    crop = np.zeros((H, W, 3), np.uint8)
    sx0, sy0 = max(0, x0), max(0, y0)
    sx1, sy1 = min(sheet.shape[1], x0 + W), min(sheet.shape[0], y0 + H)
    crop[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = sheet[sy0:sy1, sx0:sx1]
    old = np.zeros((H, W), bool)
    old[T:T + bh, S:S + bw] = cv2.resize(f[..., 3], (bw, bh), interpolation=cv2.INTER_LINEAR) > 60
    mx = crop.max(-1).astype(np.int16)
    edge = np.r_[mx[0], mx[-1], mx[:, 0], mx[:, -1]]
    lb = min(20, int(np.percentile(edge, 25)))
    fig = mx >= lb + 14
    # the sheets have gold divider lines and label boxes between rows: stop at them
    bright = mx > lb + 60
    rows = np.where(bright[:T].mean(1) > 0.45)[0]
    if len(rows):
        fig[:rows.max() + 3] = False
    for cols, keep_left in ((np.where(bright[:, :S].mean(0) > 0.45)[0], True), (np.where(bright[:, W - S:].mean(0) > 0.45)[0] + W - S, False)):
        if len(cols):
            if keep_left: fig[:, :cols.max() + 3] = False
            else: fig[:, cols.min() - 2:] = False
    fig = nd.binary_closing(fig, structure=R.disk(1))
    lab, n = nd.label(fig)
    if n:
        hit = nd.sum(old, lab, range(1, n + 1))
        fig = np.isin(lab, np.where(hit > 40)[0] + 1)
    fig = nd.binary_fill_holes(fig)
    a = nd.gaussian_filter(fig.astype(np.float32), 0.6) * 255
    a[nd.binary_erosion(fig, iterations=1)] = 255
    rgba = np.dstack([crop, a.clip(0, 255).astype(np.uint8)])
    Wh, Hh = fw + 2 * ms, fh + mt
    return R.to_size(rgba[:bh + T], Wh, Hh)      # drop the 2 spare rows under the box


def run_animal(animal):
    HD = load_hd()
    try:
        sheet = R.load_sheet(animal)
    except Exception:
        return animal, {}, f"{animal}: no sheet"
    sb = cv2.cvtColor(sheet, cv2.COLOR_RGB2BGR)
    changes, log = {}, []
    for name, (n, fw, fh, px, py) in HD[animal]["anims"].items():
        ph = os.path.join(CH, animal, "frames-hd", name + ".webp")
        hd = np.array(Image.open(ph).convert("RGBA"))
        frames = [hd[:, i * fw:(i + 1) * fw] for i in range(n)]
        flags = [clipped(f) for f in frames]
        if not any(any(c) for c in flags):
            continue
        ref = max(range(n), key=lambda i: (frames[i][..., 3] > 245).sum())
        k = R.best_scale(sb, frames[ref])
        mt, ms = int(fh * 0.22), int(fw * 0.18)       # search area around each frame
        grown = []
        for i, f in enumerate(frames):
            g = None
            if any(flags[i]) and (f[..., 3] > 245).sum() > 30:
                r = R.match(sb, f, k)
                if r and r[0] <= 6000:
                    _, (x, y) = r
                    g = grow(sheet, f, x, y, k, mt, ms)
            grown.append(g)
        # how far the recovered figures reach beyond the old box
        top = lft = rgt = 0
        for g in grown:
            if g is None:
                continue
            a = g[..., 3] > 60
            ys, xs = np.nonzero(a)
            if not len(ys):
                continue
            top = max(top, mt - ys.min())
            lft = max(lft, ms - xs.min())
            rgt = max(rgt, xs.max() - (ms + fw - 1))
        top = min(mt, top + 3) if top > 0 else 0
        lft = min(ms, lft + 3) if lft > 0 else 0
        rgt = min(ms, rgt + 3) if rgt > 0 else 0
        NW, NH = fw + lft + rgt, fh + top
        cells = []
        for i, f in enumerate(frames):
            cell = np.zeros((NH, NW, 4), np.uint8)
            g = grown[i]
            if g is not None:
                gx, gy = ms - lft, mt - top
                cell[:] = g[gy:gy + NH, gx:gx + NW]
            inner = cell[top:top + fh, lft:lft + fw]
            keep = f[..., 3] > 0
            inner[keep] = f[keep]                      # old pixels stay exactly as they were
            if g is not None:
                inner[~keep] = 0                       # inside the old box only the old pixels count
            cells.append(tidy(cell))
        # heads still cut flat (the sheet itself had no more): give them a rounded top
        runs = [cap_runs(c) for c in cells]
        extra = max([cap_height(r) for r in runs] or [0]) if CAPS else 0
        if extra:
            extra += 2
            cells = [add_cap(np.vstack([np.zeros((extra, NW, 4), np.uint8), c]), r, extra) for c, r in zip(cells, runs)]
            top += extra
            NH += extra
        if not (top or lft or rgt):
            log.append(f"{animal:9s} {name:16s} nothing to change")
            continue
        out = np.zeros((NH, NW * n, 4), np.uint8)
        for i, c in enumerate(cells):
            out[:, i * NW:(i + 1) * NW] = c
        Image.fromarray(out, "RGBA").save(ph, "WEBP", quality=88, method=6)
        # low-detail strip from the new hd strip
        lw, lh = max(1, round(NW * LO_S / HD_S)), max(1, round(NH * LO_S / HD_S))
        lo = np.zeros((lh, lw * n, 4), np.uint8)
        for i in range(n):
            lo[:, i * lw:(i + 1) * lw] = R.to_size(out[:, i * NW:(i + 1) * NW], lw, lh)
        Image.fromarray(lo, "RGBA").save(os.path.join(CH, animal, "frames", name + ".webp"), "WEBP", quality=88, method=6)
        npx, npy = round(px + lft / HD_S), round(py + top / HD_S)
        changes[name] = {"hd": [int(v) for v in (n, NW, NH, npx, npy)], "lo": [int(v) for v in (n, lw, lh, npx, npy)]}
        log.append(f"{animal:9s} {name:16s} k={k:.3f} +top {top} (rounded {extra}) +left {lft} +right {rgt}")
    return animal, changes, "\n".join(log)


def apply(all_changes):
    src = open(HDJS).read()
    pre, body = src.split("SPRITES_HD=", 1)
    HD = json.loads(body.strip().rstrip(";"))
    for animal, ch in all_changes.items():
        for name, c in ch.items():
            HD[animal]["anims"][name] = c["hd"]
    txt = pre + "SPRITES_HD=" + json.dumps(HD, separators=(",", ":")) + ";\n"
    open(HDJS, "w").write(txt)
    g = open(GJS).read()
    for animal, ch in all_changes.items():
        m = re.search(r"\n " + animal + r":\{s:[0-9.]+,anims:\{", g)
        if not m:
            print("SPRITES entry not found for", animal); continue
        for name, c in ch.items():
            pat = re.compile(r'("' + name + r'":)\[[^\]]*\]')
            seg_start = m.end()
            seg_end = g.find("}", seg_start)
            seg = g[seg_start:seg_end]
            seg2, k = pat.subn(lambda mm: mm.group(1) + json.dumps(c["lo"], separators=(",", ":")), seg, count=1)
            if not k:
                print("lo anim not found", animal, name)
            g = g[:seg_start] + seg2 + g[seg_end:]
    open(GJS, "w").write(g)


if __name__ == "__main__":
    from multiprocessing import Pool
    animals = sys.argv[1:]
    allc = {}
    with Pool(min(len(animals), os.cpu_count() or 1)) as p:
        for animal, ch, log in p.imap(run_animal, animals):
            print(log, flush=True)
            if ch:
                allc[animal] = ch
    apply(allc)
    json.dump(allc, open("/tmp/pad_recut_changes.json", "w"))
