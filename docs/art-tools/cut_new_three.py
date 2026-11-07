"""Cut Snake, Eagle and Stag from their shared sprite sheet.
Usage (repo root): python3 docs/art-tools/cut_new_three.py
Writes game/assets/characters/<id>/frames{,-hd}/ and portraits, prints tables as JSON."""
import os, json
import numpy as np, cv2, scipy.ndimage as nd
from PIL import Image, ImageFilter

SHEET = "docs/sprite-sheets/new-three/snake-eagle-stag-sheet.png"
img = np.array(Image.open(SHEET).convert("RGB"))
H0, W0 = img.shape[:2]
mx = img.max(-1).astype(int); mn = img.min(-1).astype(int)

ROWS = {"snake": [(0, 81), (81, 156), (156, 233), (233, 308)],
        "eagle": [(332, 405), (405, 477), (477, 555), (555, 625)],
        "stag": [(654, 734), (734, 812), (812, 890), (890, 987)]}
BAND = {"snake": (0, 318), "eagle": (322, 640), "stag": (645, 1000)}
# section starts per row (sheet x), last section runs to the right edge
SECT = {
 "snake": [[560, 814, 1077, 1250], [653, 908, 1199], [678, 1052], [544, 760, 946, 1126, 1341]],
 "eagle": [[560, 817, 1080, 1250], [666, 909, 1179], [727, 1081], [556, 787, 968, 1142, 1353]],
 "stag":  [[560, 818, 1079, 1249], [659, 899, 1199], [691, 1089], [543, 762, 947, 1135, 1352]]}
NAMES = [["idle", "walk", "run", "crouch", "jump"], ["basic", "move2", "move3", "move4"],
         ["specialA", "specialB", "ultra"], ["hit", "knockdown", "getup", "block", "taunt", "victory"]]

fg_all = (mx > 58) & ~nd.binary_dilation(mn > 150, iterations=1)
lines = nd.binary_opening(fg_all, structure=np.ones((1, 60))) | nd.binary_opening(fg_all, structure=np.ones((40, 1)))
fg_all &= ~nd.binary_dilation(lines, iterations=1)
fg_all = nd.binary_opening(fg_all, iterations=1)


def effect_colored(px):
    r, g, b = px[:, 0].astype(int), px[:, 1].astype(int), px[:, 2].astype(int)
    return ((g > r + 10) | (b > r + 10)).mean() > .45


def frames_in(y0, y1, x0, x1):
    """One box per sprite: big shapes are bodies; small loose pieces (tails, arms,
    slash trails) join the nearest body. Two bodies touching are split at the thinnest point."""
    oy, ox = y0 + 16, x0 + 3
    m = fg_all[oy:y1 - 2, ox:x1 - 3]
    lab, n = nd.label(nd.binary_dilation(m, iterations=1))
    comps = []
    for j, sl in enumerate(nd.find_objects(lab), 1):
        cnt = int((m[sl] & (lab[sl] == j)).sum())
        if cnt >= 20: comps.append([sl[1].start, sl[1].stop, sl[0].start, sl[0].stop, cnt])
    if not comps: return []
    med = sorted(c[4] for c in comps)[len(comps) // 2]
    bodies = [c for c in comps if c[4] >= .35 * med]
    for c in comps:
        if c in bodies: continue
        cx = (c[0] + c[1]) / 2
        best = min(bodies, key=lambda b_: max(0, b_[0] - c[1], c[0] - b_[1]))
        if max(0, best[0] - c[1], c[0] - best[1]) <= 14:
            best[0], best[1], best[2], best[3] = min(best[0], c[0]), max(best[1], c[1]), min(best[2], c[2]), max(best[3], c[3])
    bodies.sort()
    merged = []
    for b_ in bodies:   # bodies overlapping side to side are one sprite
        if merged and min(merged[-1][1], b_[1]) - max(merged[-1][0], b_[0]) > .5 * min(b_[1] - b_[0], merged[-1][1] - merged[-1][0]):
            p = merged[-1]; p[0], p[1] = min(p[0], b_[0]), max(p[1], b_[1]); continue
        merged.append(b_[:])
    widths = sorted(b_[1] - b_[0] for b_ in merged); medw = widths[len(widths) // 2]
    out = []
    for a_, b_, t, bt, c in merged:
        w = b_ - a_
        if w > 2.1 * medw and w > 2.2 * (bt - t):
            cols = m[:, a_:b_].sum(0).astype(float); lo, hi = int(w * .3), int(w * .7)
            cut_at = a_ + lo + int(np.argmin(cols[lo:hi])); out += [(a_, cut_at), (cut_at, b_)]
        else:
            out.append((a_, b_))
    rowH = y1 - y0 - 18; res = []
    for a_, b_ in out:
        sub = m[:, a_:b_]; ys = np.where(sub.any(1))[0]
        if not len(ys): continue
        h = ys.max() - ys.min() + 1; w = b_ - a_
        px = img[oy:y1 - 2, ox + a_:ox + b_][sub].astype(int)
        gold = (px[:, 0] > px[:, 1] + 12).mean()          # bodies are gold/brown (red > green)
        if effect_colored(px) or (gold < .35 and h < .6 * rowH) or (h < .45 * rowH and w < 1.6 * h): continue
        res.append([ox + a_, ox + b_, int(sub.sum())])
    if not res: return []
    medc = sorted(r[2] for r in res)[len(res) // 2]
    keep = [r for r in res if r[2] >= .3 * medc]
    for r in res:   # small leftover pieces (an arm, a tail tip) join the nearest frame or are dropped
        if r in keep: continue
        near = min(keep, key=lambda k: max(0, k[0] - r[1], r[0] - k[1]))
        if max(0, near[0] - r[1], r[0] - near[1]) <= 20: near[0], near[1] = min(near[0], r[0]), max(near[1], r[1])
    return [(k[0], k[1]) for k in keep]


def cut(y0, y1, a, b):
    """RGBA crop of one frame with a solid mask, plus its foot anchor (sheet coords)."""
    pad = 3
    ya, yb, xa, xb = y0 + 14, y1 - 1, max(0, a - pad), min(W0, b + pad)
    crop = img[ya:yb, xa:xb]
    m = fg_all[ya:yb, xa:xb].copy()
    m = nd.binary_closing(np.pad(m, 4), iterations=2)[4:-4, 4:-4]
    m = nd.binary_fill_holes(m)
    lab, n = nd.label(m)
    if n > 1:
        sz = nd.sum(m, lab, range(1, n + 1)); m = np.isin(lab, np.where(sz >= max(20, sz.max() * .04))[0] + 1)
    alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), .5) * 255
    alpha[nd.binary_erosion(m, iterations=1)] = 255
    ys, xs = np.where(m)
    yb_ = ys.max()
    feet = xs[ys > yb_ - max(4, (yb_ - ys.min()) * .22)]
    return np.dstack([crop, alpha.clip(0, 255).astype(np.uint8)]), float(np.median(feet)), float(yb_), xa, ya


BODY = {"snake": 262, "eagle": 262, "stag": 270}     # idle height in game units


def build_char(cid):
    raw = {}
    for r, (y0, y1) in enumerate(ROWS[cid]):
        starts = [340] + SECT[cid][r] + [W0]
        for s, name in enumerate(NAMES[r]):
            fr = frames_in(y0, y1, starts[s], starts[s + 1])
            raw[name] = [cut(y0, y1, a, b) for a, b in fr]
    # common ground line per row: lowest foot of that row's frames
    idle = raw["idle"][0][0]; ih = np.where(idle[..., 3].max(1) > 128)[0]; idle_h = ih.max() - ih.min() + 1
    def seq(*names, rev=False):
        f = [x for n in names for x in raw[n]]
        return f[::-1] if rev else f
    anims = {"idle": seq("idle"), "walk_forward": seq("walk"), "walk_back": seq("walk", rev=True), "run": seq("run"),
             "crouch": seq("crouch"), "block": seq("block"), "attack_light": seq("basic"), "bite": seq("move2"),
             "attack_heavy": seq("move3"), "uppercut": seq("move4"), "jump": seq("jump"),
             "special_pounce": seq("specialA"), "special_b": seq("specialB"), "ultra_move": seq("ultra"),
             "hit_light": seq("hit"), "hit_heavy": seq("hit", "knockdown"), "knockdown_getup": seq("knockdown", "getup"),
             "victory": seq("taunt", "victory"), "defeat": seq("hit", "knockdown")}
    base = os.path.join("game/assets/characters", cid)
    tables = {}
    for folder, s in (("frames-hd", .8), ("frames", .34)):
        os.makedirs(os.path.join(base, folder), exist_ok=True)
        k = BODY[cid] * s / idle_h                       # output px per sheet px
        tab = {}
        for name, frs in anims.items():
            placed = []
            for rgba, ax, ay, xa, ya in frs:
                im = rgba.astype(np.float32); im[..., :3] *= im[..., 3:4] / 255
                w, h = max(1, round(im.shape[1] * k)), max(1, round(im.shape[0] * k))
                im = cv2.resize(im, (w, h), interpolation=cv2.INTER_CUBIC if k > 1 else cv2.INTER_AREA)
                placed.append((np.clip(im, 0, 255), ax * k, ay * k))
            L = max(p[1] for p in placed); T = max(p[2] for p in placed)
            R = max(p[0].shape[1] - p[1] for p in placed); B = max(p[0].shape[0] - p[2] for p in placed)
            Wf, Hf = int(np.ceil(L + R)), int(np.ceil(T + B))
            strip = np.zeros((Hf, Wf * len(placed), 4), np.uint8)
            for i, (im, ax, ay) in enumerate(placed):
                ox, oy = int(round(L - ax)), int(round(T - ay)); h, w = im.shape[:2]
                fr = np.zeros((Hf, Wf, 4), np.float32); fr[oy:oy + h, ox:ox + w] = im[:Hf - oy, :Wf - ox]
                al = fr[..., 3:4]; rgb = np.where(al > .5, fr[..., :3] * 255 / np.maximum(al, 1e-3), 0)
                strip[:, i * Wf:(i + 1) * Wf] = np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8)
            pil = Image.fromarray(strip, "RGBA")
            if k > 2:   # soften the upscale blur a little
                rgb = pil.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2)); rgb.putalpha(pil.getchannel("A")); pil = rgb
            pil.save(os.path.join(base, folder, name + ".webp"), "WEBP", quality=88, method=6)
            tab[name] = [len(placed), Wf, Hf, int(round(L / s)), int(round((T + 2) / s))]
        tables[folder] = tab
    # portrait from the art panel on the left of the band
    y0, y1 = BAND[cid]; ph = y1 - y0; pw = int(ph * 250 / 300)
    Image.fromarray(img[y0:y1, 0:min(335, pw)]).resize((250, 300), Image.LANCZOS).save(f"game/assets/characters/portraits/{cid}.jpg", quality=88)
    return tables


if __name__ == "__main__":
    print(json.dumps({c: build_char(c) for c in ROWS}))
