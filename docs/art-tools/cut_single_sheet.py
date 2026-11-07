"""Cut a one-fighter KOTJ sheet (black background, labelled panel rows).
Each row lists its moves left to right with the number of frames in each.
Usage (repo root): python3 docs/art-tools/cut_single_sheet.py snake eagle stag
Writes game/assets/characters/<id>/frames{,-hd}/ and prints tables + frame checks as JSON."""
import os, sys, json
import numpy as np, cv2, scipy.ndimage as nd
from PIL import Image, ImageFilter

LAYOUT = {
 "snake": [((8, 117), [("idle", 5), ("walk", 6), ("run", 4)]), ((122, 225), [("crouch", 4), ("jump", 5), ("block", 4)]),
           ((230, 338), [("basic", 7), ("bite", 5)]), ((342, 440), [("tail", 4), ("constrict", 5)]),
           ((444, 538), [("specialA", 4), ("specialB", 6)]), ((542, 635), [("specialC", 5), ("specialD", 4)]),
           ((640, 765), [("ultra", 7)]), ((772, 868), [("hit", 5), ("knockdown", 4), ("getup", 4)]),
           ((875, 1008), [("taunt", 6), ("victory", 5)])],
 "stag":  [((8, 120), [("idle", 5), ("walk", 5), ("run", 4)]), ((126, 232), [("crouch", 4), ("jump", 5), ("block", 4)]),
           ((239, 345), [("basic", 6), ("bite", 5)]), ((350, 448), [("tail", 4), ("constrict", 5)]),
           ((452, 545), [("specialA", 4), ("specialB", 5)]), ((550, 640), [("specialC", 5), ("specialD", 5)]),
           ((647, 765), [("ultra", 7)]), ((770, 862), [("hit", 4), ("knockdown", 4), ("getup", 5)]),
           ((868, 1008), [("taunt", 6), ("victory", 6)])],
 "eagle": [((8, 122), [("idle", 5), ("walk", 5), ("run", 4)]), ((128, 240), [("crouch", 4), ("jump", 5), ("block", 4)]),
           ((247, 364), [("basic", 6), ("bite", 5)]), ((370, 490), [("tail", 4), ("constrict", 5)]),
           ((494, 618), [("specialA", 6), ("specialB", 4)]), ((624, 750), [("ultra", 7)]),
           ((758, 868), [("hit", 5), ("knockdown", 4), ("getup", 5)]), ((873, 1003), [("taunt", 6), ("victory", 6)])]}
SECTIONS = {   # x where each move's section starts after the first (from the sheet's dividers)
 "snake": [[735, 1195], [672, 1157], [1040], [917], [917], [943], [], [686, 1130], [928]],
 "stag":  [[717, 1135], [670, 1133], [910], [924], [885], [885], [], [648, 1070], [880]],
 "eagle": [[740, 1157], [685, 1158], [980], [802], [912], [], [698, 1135], [930]]}
BODY = {"snake": 262, "eagle": 262, "stag": 272}   # idle height in game units
X0 = 318                                           # left art column ends here


def body_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    mx = a.max(-1).astype(int)
    m = (mx > 55) & (r > g + 8) & (r > b + 25)          # gold / brown / red fighter pixels
    lines = nd.binary_opening(m, structure=np.ones((1, 70))) | nd.binary_opening(m, structure=np.ones((45, 1)))
    m &= ~nd.binary_dilation(lines, iterations=2)
    m = nd.binary_opening(m, structure=np.ones((2, 2)))
    return m


CENTERS = {   # hand-placed frame centres where glowing effects make automatic splitting unreliable
 ("stag", 3, 0): [380, 490, 612, 790], ("stag", 3, 1): [1010, 1145, 1262, 1372, 1472],
 ("stag", 4, 0): [368, 480, 600, 795], ("stag", 4, 1): [940, 1032, 1140, 1255, 1440],
 ("stag", 5, 0): [380, 488, 600, 715, 820], ("stag", 5, 1): [945, 1045, 1160, 1270, 1450],
 ("stag", 6, 0): [355, 460, 615, 775, 915, 1080, 1350]}


def frames_in_row(a, bm, y0, y1, xs, xe, n, key=None):
    """Find n frames in one move's section. Returns (cell_left, cell_right, body_left, body_right)."""
    m = bm[y0 + 26:y1 - 3, xs:xe]
    if key in CENTERS:
        cs = [c - xs for c in CENTERS[key]]
    else:
        lab, _ = nd.label(nd.binary_dilation(m, iterations=2)); comps = []
        for j, sl in enumerate(nd.find_objects(lab), 1):
            cnt = int((m[sl] & (lab[sl] == j)).sum())
            if cnt >= 30: comps.append([sl[1].start, sl[1].stop, cnt])
        comps.sort(); merged = []
        for c in comps:
            if merged:
                p = merged[-1]; ov = min(p[1], c[1]) - max(p[0], c[0])
                if ov > .35 * min(p[1] - p[0], c[1] - c[0]):
                    p[0], p[1], p[2] = min(p[0], c[0]), max(p[1], c[1]), p[2] + c[2]; continue
            merged.append(c[:])
        if merged:
            med = sorted(c[2] for c in merged)[len(merged) // 2]; merged = [c for c in merged if c[2] >= .18 * med]
        while len(merged) > n:
            i = min(range(len(merged)), key=lambda k: merged[k][2])
            j = i - 1 if i == len(merged) - 1 or (i > 0 and merged[i][0] - merged[i - 1][1] < merged[i + 1][0] - merged[i][1]) else i + 1
            a_, b_ = sorted((i, j)); p, q = merged[a_], merged[b_]; merged[a_:b_ + 1] = [[p[0], q[1], p[2] + q[2]]]
        while len(merged) < n:
            i = max(range(len(merged)), key=lambda k: merged[k][1] - merged[k][0]); s_, e_, c = merged[i]; w = e_ - s_
            cols = m[:, s_:e_].sum(0); cut = s_ + int(w * .3) + int(np.argmin(cols[int(w * .3):int(w * .7)]))
            merged[i:i + 1] = [[s_, cut, c // 2], [cut, e_, c // 2]]
        cs = [(c[0] + c[1]) / 2 for c in merged]
    edges = [0] + [int((cs[i] + cs[i + 1]) / 2) for i in range(n - 1)] + [xe - xs]
    out = []
    for i in range(n):
        seg = m[:, edges[i]:edges[i + 1]].any(0); nz = np.where(seg)[0]
        bl, br = (edges[i] + nz.min(), edges[i] + nz.max() + 1) if len(nz) else (edges[i], edges[i + 1])
        # body box: the part nearest the centre (ignore trails that reach the cell edge)
        cl, cr = edges[i], edges[i + 1]
        if key not in CENTERS:   # keep clear of the slanted section dividers
            if i == 0: cl = max(cl, bl - 14)
            if i == n - 1: cr = min(cr, br + 14)
        out.append((xs + cl, xs + cr, xs + max(bl, int(cs[i]) - 45), xs + min(br, int(cs[i]) + 45)))
    return out


def cut_frame(a, bm, y0, y1, xa, xb, nb_l, nb_r):
    """Solid RGBA of one frame; box spans halfway to the neighbouring frames so glows are kept."""
    L, R = max(X0, nb_l), min(a.shape[1], nb_r)
    T, B = y0 + 22, y1 - 2
    crop = a[T:B, L:R]
    mx = crop.max(-1).astype(int)
    seed = bm[T:B, L:R].copy()
    seed[:, :max(0, xa - L - 2)] = False; seed[:, xb - L + 2:] = False
    fg = (mx > 34) & ~LINES[T:B, L:R]
    goldish = (crop[..., 0].astype(int) > crop[..., 2].astype(int) + 40)
    sw = nd.binary_opening(fg & goldish, structure=np.ones((1, 26))); sw[16:-7] = False   # label swooshes / bottom border
    fg &= ~nd.binary_dilation(sw, iterations=2)
    lab, n = nd.label(fg)
    keep = np.unique(lab[seed & (lab > 0)])
    m = np.isin(lab, keep[keep > 0])
    m = nd.binary_fill_holes(nd.binary_closing(np.pad(m, 4), iterations=2))[4:-4, 4:-4]
    # remove thin straight leftovers (divider bits) and tiny crumbs
    thin = m & ~nd.binary_opening(m, structure=np.ones((4, 4)))
    lt, nt = nd.label(thin)
    for j, sl in enumerate(nd.find_objects(lt), 1):
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if max(hh, ww) >= 10 and (lt[sl] == j).sum() < .5 * hh * ww and not (seed[sl] & (lt[sl] == j)).sum() > 6: m[sl] &= lt[sl] != j
        elif max(hh, ww) >= 12 and min(hh, ww) <= 3: m[sl] &= lt[sl] != j
    vl = nd.binary_opening(m, structure=np.ones((14, 1))) & ~nd.binary_opening(m, structure=np.ones((5, 5)))
    W_ = m.shape[1]; vl[:, int(W_ * .25):int(W_ * .75)] = False        # divider slivers at the frame's sides
    m &= ~nd.binary_dilation(vl, iterations=1)
    lab2, n2 = nd.label(m)
    for j, sl in enumerate(nd.find_objects(lab2), 1):   # flat strips (panel borders) and anything touching the top edge
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if (hh >= 2.5 * ww and (lab2[sl] == j).mean() > .6 and ww <= 16) or (hh <= 9 and ww >= 2.5 * hh) or (sl[0].start <= 3 and hh <= 22 and ww >= 2.2 * hh): m[sl] &= lab2[sl] != j   # label swooshes
    hl = nd.binary_opening(m, structure=np.ones((1, 22))) & ~nd.binary_opening(m, structure=np.ones((6, 6)))
    hl[16:] = False; m &= ~nd.binary_dilation(hl, iterations=1)   # a border line resting on a head
    lab2, n2 = nd.label(m)
    if n2 > 1:
        sz = nd.sum(m, lab2, range(1, n2 + 1)); m = np.isin(lab2, np.where(sz >= max(15, sz.max() * .03))[0] + 1)
    # soft alpha: full on the body, fading on dim glow pixels
    alpha = np.clip((mx - 30) / 50, 0, 1) * 255
    alpha[nd.binary_erosion(m, iterations=1) & (seed | nd.binary_dilation(seed, iterations=6))] = 255
    alpha[~m] = 0
    sy, sx = np.where(seed)
    if not len(sy): sy, sx = np.where(m)
    if not len(sy): sy, sx = np.where(mx > 34)
    if not len(sy): sy, sx = np.array([B - T - 1]), np.array([(xa + xb) // 2 - L])
    bot = sy.max()
    feet = sx[sy > bot - max(4, (bot - sy.min()) * .18)]
    return np.dstack([crop, alpha.astype(np.uint8)]), float(np.median(feet)) + L, float(bot) + T, L, T


def build(cid):
    a = np.array(Image.open(f"docs/sprite-sheets/{cid}/{cid}-sheet.png").convert("RGB"))
    bm = body_mask(a)
    global LINES   # panel borders and dividers: long thin bright runs, any direction
    br = a.max(-1) > 34
    LINES = nd.binary_opening(br, structure=np.ones((1, 45))) | nd.binary_opening(br, structure=np.ones((30, 1)))
    for ang in (60, 65, 70, 75, 105, 110, 115, 120):
        k_ = np.zeros((31, 31), np.uint8); c_ = 15; t = np.deg2rad(ang)
        for r_ in range(-15, 16): k_[int(round(c_ - r_ * np.sin(t))), int(round(c_ + r_ * np.cos(t)))] = 1
        LINES |= cv2.morphologyEx(br.astype(np.uint8), cv2.MORPH_OPEN, k_).astype(bool) & ~nd.binary_opening(br, structure=np.ones((5, 5)))
    LINES &= ~nd.binary_opening(br, structure=np.ones((7, 7)))       # glows and effects are thick; lines are thin
    LINES = nd.binary_dilation(LINES, iterations=1) & ~nd.binary_opening(bm, structure=np.ones((4, 4)))
    raw = {}
    for r, ((y0, y1), moves) in enumerate(LAYOUT[cid]):
        st = [X0] + SECTIONS[cid][r] + [a.shape[1] - 4]
        fr = []
        for i, (_, n) in enumerate(moves): fr += frames_in_row(a, bm, y0, y1, st[i], st[i + 1], n, (cid, r, i))
        cuts = [cut_frame(a, bm, y0, y1, f[2], f[3], f[0] - 3, f[1] + 3) for f in fr]
        ground = float(np.percentile([c[2] for c in cuts], 80))     # row baseline
        k = 0
        for name, n in moves:
            raw[name] = []
            for c in cuts[k:k + n]:
                rgba, fx, fy, L, T = c
                gy = fy if name in ("jump",) else max(fy, ground) if name not in ("knockdown",) else max(fy, ground)
                if name == "jump": gy = ground
                raw[name].append((rgba, fx - L, gy - T))
            k += n
    seq = lambda *ns, rev=False: ([x for n_ in ns for x in raw[n_]])[::-1] if rev else [x for n_ in ns for x in raw[n_]]
    hit = raw["hit"]
    anims = {"idle": seq("idle"), "walk_forward": seq("walk"), "walk_back": seq("walk", rev=True), "run": seq("run"),
             "crouch": seq("crouch"), "jump": seq("jump"), "block": seq("block"),
             "attack_light": seq("basic"), "bite": seq("bite"), "attack_heavy": seq("tail"), "uppercut": seq("constrict"),
             "special_pounce": seq("specialA"), "special_b": seq("specialB"), "ultra_move": seq("ultra"),
             "hit_light": seq("hit"), "hit_heavy": hit[-2:] + raw["knockdown"], "knockdown_getup": raw["knockdown"] + raw["getup"],
             "victory": seq("taunt", "victory"), "defeat": hit[-2:] + raw["knockdown"]}
    if "specialC" in raw: anims["special_c"] = seq("specialC"); anims["special_d"] = seq("specialD")
    ih = np.where(raw["idle"][0][0][..., 3].max(1) > 128)[0]; idle_h = raw["idle"][0][2] - ih.min()
    base = f"game/assets/characters/{cid}"; tables = {}
    for folder, s in (("frames-hd", .8), ("frames", .34)):
        os.makedirs(f"{base}/{folder}", exist_ok=True)
        k = BODY[cid] * s / idle_h; tab = {}
        for name, frs in anims.items():
            placed = []
            for rgba, ax, ay in frs:
                im = rgba.astype(np.float32); im[..., :3] *= im[..., 3:4] / 255
                w, h = max(1, round(im.shape[1] * k)), max(1, round(im.shape[0] * k))
                im = cv2.resize(im, (w, h), interpolation=cv2.INTER_CUBIC if k > 1 else cv2.INTER_AREA)
                placed.append((np.clip(im, 0, 255), ax * k, ay * k))
            Lm = max(p[1] for p in placed); Tm = max(p[2] for p in placed)
            Rm = max(p[0].shape[1] - p[1] for p in placed); Bm = max(p[0].shape[0] - p[2] for p in placed)
            Wf, Hf = int(np.ceil(Lm + Rm)), int(np.ceil(Tm + Bm))
            strip = np.zeros((Hf, Wf * len(placed), 4), np.uint8)
            for i, (im, ax, ay) in enumerate(placed):
                ox, oy = int(round(Lm - ax)), int(round(Tm - ay)); h, w = im.shape[:2]
                fr = np.zeros((Hf, Wf, 4), np.float32); fr[oy:oy + h, ox:ox + w] = im[:Hf - oy, :Wf - ox]
                al = fr[..., 3:4]; rgb = np.where(al > .5, fr[..., :3] * 255 / np.maximum(al, 1e-3), 0)
                strip[:, i * Wf:(i + 1) * Wf] = np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8)
            pil = Image.fromarray(strip, "RGBA")
            if k > 1.5:
                rgb = pil.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)); rgb.putalpha(pil.getchannel("A")); pil = rgb
            pil.save(f"{base}/{folder}/{name}.webp", "WEBP", quality=88, method=6)
            tab[name] = [len(placed), Wf, Hf, int(round(Lm / s)), int(round(Tm / s))]
        tables[folder] = tab
    return tables


if __name__ == "__main__":
    print(json.dumps({c: build(c) for c in sys.argv[1:]}))
