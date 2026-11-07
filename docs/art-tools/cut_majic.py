"""Cut Majic's frames from his sprite sheet, using the Tiger sheet (same
template layout) to know where each frame sits and where its feet are.

Usage: python3 cut_majic.py <majic_sheet_without_row_lines.png> <tiger_map.json>
Writes game/assets/characters/majic/frames{,-hd}/ and prints the tables.
"""
import sys, os, json
import numpy as np, cv2, scipy.ndimage as nd
from PIL import Image

sheet = np.array(Image.open(sys.argv[1]).convert("RGB"))
TM = json.load(open(sys.argv[2]))
BODY = 420            # Majic's idle height in game units (Elephant is ~330)
OUT = "game/assets/characters/majic"


def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def solid_mask(crop):
    mx = crop.max(-1).astype(np.int16)
    edge = np.r_[mx[0], mx[-1], mx[:, 0], mx[:, -1]]
    lb = min(20, int(np.percentile(edge, 25)))
    lab, _ = nd.label(mx < lb + 14)
    e = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    fig = ~np.isin(lab, e[e > 0])
    lab3, n3 = nd.label(fig)
    if n3:
        sz = nd.sum(fig, lab3, range(1, n3 + 1))
        fig = np.isin(lab3, np.where(sz >= 60)[0] + 1)
    f2 = np.pad(fig, 5)
    f2 = nd.binary_fill_holes(nd.binary_closing(f2, structure=disk(3)))[5:-5, 5:-5]
    pocket = f2 & ~fig & (mx < lb + 7)
    lab2, n2 = nd.label(pocket)
    if n2:
        sz = nd.sum(pocket, lab2, range(1, n2 + 1))
        f2 &= ~np.isin(lab2, np.where(sz >= 120)[0] + 1)
    return f2


def fix_dupes(locs):
    for i in range(1, len(locs)):
        if locs[i][:2] == locs[i - 1][:2] and i >= 2:
            locs[i] = [2 * locs[i - 1][0] - locs[i - 2][0], locs[i - 1][1]] + locs[i][2:]
    return locs


cuts = {}
for name, t in TM.items():
    locs = fix_dupes([l[:] for l in t["locs"]])
    n, fw, H = t["n"], t["fw"], t["H"]
    frames = []
    for i, (x, y, k, _) in enumerate(locs):
        bw, bh = fw * k, H * k
        cx = x + bw / 2
        prev_c = locs[i - 1][0] + bw / 2 if i else None
        next_c = locs[i + 1][0] + bw / 2 if i + 1 < n else None
        sp = (next_c - cx) if next_c else (cx - prev_c)
        left = (prev_c + cx) / 2 if prev_c else x - 4
        right = (next_c + cx) / 2 if next_c else min(sheet.shape[1], cx + sp * .62)
        top, bot = max(0, int(y - 6)), min(sheet.shape[0], int(y + bh + 3))
        L, Rr = int(max(0, left)), int(min(sheet.shape[1], right))
        crop = sheet[top:bot, L:Rr]
        m = solid_mask(np.pad(crop, ((4, 4), (4, 4), (0, 0))))[4:-4, 4:-4]
        # keep Majic (the biggest shape) and effects near him; drop slices of the
        # neighbouring frames, row-label badges and leftover row lines
        lab, nl = nd.label(m)
        if nl > 1:
            sz = nd.sum(m, lab, range(1, nl + 1)); big = int(np.argmax(sz)) + 1
            keep = np.zeros(nl + 1, bool); keep[big] = True
            for j, sl in enumerate(nd.find_objects(lab), 1):
                if j == big or sz[j - 1] < 150: continue
                hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
                edge = sl[1].start <= 1 or sl[1].stop >= m.shape[1] - 1
                if edge or hh < 7 or ww < 7 or sz[j-1] < 0.25*hh*ww: continue
                keep[j] = True
            m = keep[lab]
        # thin straight lines (row dividers) that touch the body
        thin = m & ~nd.binary_opening(m, structure=np.ones((5, 5)))
        lt, nt = nd.label(thin)
        for j, sl in enumerate(nd.find_objects(lt), 1):
            hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if max(hh, ww) > 25 and min(hh, ww) <= 5: m[sl] &= lt[sl] != j
        a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), .6) * 255
        a[nd.binary_erosion(m, iterations=1)] = 255
        rgba = np.dstack([crop, a.clip(0, 255).astype(np.uint8)])
        ax = x + t["px"] * .8 * k - L          # tiger's feet point, inside the crop
        ay = y + t["py"] * .8 * k - top
        frames.append((rgba, ax, ay, k))
    cuts[name] = frames

# overall size: Majic's idle stands BODY game units tall
idle0 = cuts["idle"][0][0][..., 3] > 128
ys = np.where(idle0.any(1))[0]
h_sheet = ys.max() - ys.min() + 1
k_idle = cuts["idle"][0][3]
G = (BODY * .8) / h_sheet * k_idle       # HD px per (sheet px / k)


def build(folder, s):
    os.makedirs(folder, exist_ok=True)
    table = {}
    for name, frames in cuts.items():
        placed = []
        for rgba, ax, ay, k in frames:
            f = G / k * (s / .8)
            img = rgba.astype(np.float32)
            img[..., :3] *= img[..., 3:4] / 255
            w, h = max(1, int(round(img.shape[1] * f))), max(1, int(round(img.shape[0] * f)))
            img = cv2.resize(img, (w, h), interpolation=cv2.INTER_CUBIC if f > 1 else cv2.INTER_AREA)
            placed.append((np.clip(img, 0, 255), ax * f, ay * f))
        # common frame: anchor at the same spot in every frame
        L = max(p[1] for p in placed); T = max(p[2] for p in placed)
        Rr = max(p[0].shape[1] - p[1] for p in placed); B = max(p[0].shape[0] - p[2] for p in placed)
        W, Hh = int(np.ceil(L + Rr)), int(np.ceil(T + B))
        strip = np.zeros((Hh, W * len(placed), 4), np.float32)
        for i, (img, ax, ay) in enumerate(placed):
            ox, oy = int(round(L - ax)), int(round(T - ay))
            h, w = img.shape[:2]
            strip[oy:oy + h, i * W + ox:i * W + ox + w] = img[:Hh - oy, :W - ox]
        # crop empty rows/cols shared by all frames (keeps files small)
        al = strip[..., 3].reshape(Hh, len(placed), W).max(1)
        rows = np.where(al.max(1) > 2)[0]; cols = np.where(al.max(0) > 2)[0]
        y0, y1, x0, x1 = rows.min(), rows.max() + 1, cols.min(), cols.max() + 1
        fw = x1 - x0
        out = np.zeros((y1 - y0, fw * len(placed), 4), np.uint8)
        for i in range(len(placed)):
            fr = strip[y0:y1, i * W + x0:i * W + x1]
            alp = fr[..., 3:4]
            rgb = np.where(alp > .5, fr[..., :3] * 255 / np.maximum(alp, 1e-3), 0)
            out[:, i * fw:(i + 1) * fw] = np.dstack([np.clip(rgb, 0, 255), alp]).astype(np.uint8)
        Image.fromarray(out, "RGBA").save(os.path.join(folder, name + ".webp"), "WEBP", quality=88, method=6)
        table[name] = [len(placed), int(fw), int(y1 - y0), int(round((L - x0) / s)), int(round((T - y0) / s))]
    return table


hd = build(os.path.join(OUT, "frames-hd"), .8)
lo = build(os.path.join(OUT, "frames"), .34)
print(json.dumps({"hd": hd, "lo": lo}))
