"""Cut a fighter from a labelled sheet using hand-measured frame centres per move.
Each move: (row_top, row_bottom, [frame centre x ...]). Frames are boxed halfway to their
neighbours, the fighter is the bright shape connected to the middle of the box, panel lines
are removed, holes are filled, and every frame is aligned on its feet.
Usage (repo root): python3 docs/art-tools/cut_by_centers.py snow-leopard majic"""
import os, sys, json
import numpy as np, cv2, scipy.ndimage as nd
from PIL import Image, ImageFilter

SPEC = {
 "snow-leopard": dict(sheet="docs/sprite-sheets/snow-leopard/snow-leopard-sheet.png", out="leopard", thr=70, fog=True, body=246, moves={
  "idle": (112, 202, [328, 400, 475, 552, 637]), "walk": (112, 202, [805, 870, 940, 1005, 1073]),
  "walkback": (112, 202, [1235, 1305, 1370, 1435, 1500]),
  "run": (210, 282, [368, 450, 550, 640, 725, 812]), "dash": (210, 282, [1050, 1180, 1325, 1470]),
  "jump": (287, 362, [398, 485, 575, 655, 733, 826]), "crouch": (287, 362, [1004, 1087, 1170]),
  "block": (287, 362, [1340, 1407, 1475]),
  "light": (366, 436, [393, 452, 527, 600, 668, 736]), "heavy": (366, 436, [985, 1055, 1155, 1265, 1372]),
  "combo": (440, 508, [405, 483, 565, 645, 724, 800, 860, 925, 1015, 1095, 1185, 1280, 1350, 1440]),
  "claw": (513, 580, [400, 477, 570, 670, 765]), "pounce": (513, 580, [1010, 1100, 1215, 1330, 1460]),
  "spin": (585, 652, [410, 500, 580, 665, 745]), "frost": (585, 652, [1023, 1120, 1210, 1310, 1460]),
  "phantom": (657, 736, [384, 455, 530, 605, 668, 750]), "ultra": (657, 736, [980, 1050, 1145, 1270, 1440]),
  "hit": (742, 822, [360, 455, 530, 615, 710]), "knockdown": (742, 822, [940, 1045, 1155, 1255, 1360, 1470]),
  "getup": (826, 915, [335, 440, 537, 627, 725]), "win": (826, 1000, [935, 1055, 1165, 1260, 1380])}),
 "majic": dict(sheet="docs/sprite-sheets/majic/majic-sheet-v2.png", out="majic", thr=48, body=429, moves={
  "idle": (5, 77, [485, 585, 680, 775, 875, 1035, 1130, 1220, 1310, 1400]),
  "walk": (80, 140, [480, 557, 630, 705, 775, 840, 905]), "walkback": (80, 140, [1140, 1205, 1265, 1320, 1380, 1440]),
  "run": (145, 205, [495, 605, 715, 815, 915, 1010, 1130, 1240]),
  "jump": (207, 266, [480, 560, 660, 740, 810, 880]), "crouch": (207, 266, [1150, 1220, 1290, 1355, 1430]),
  "block": (268, 330, [480, 560, 635, 710, 785]), "dodge": (268, 330, [1100, 1190, 1300, 1390]),
  "light": (332, 398, [490, 575, 655, 745, 835]), "heavy": (332, 398, [1100, 1185, 1265, 1345, 1430]),
  "claw": (400, 458, [480, 570, 665, 750, 845]), "bite": (400, 458, [1105, 1195, 1280, 1365, 1435]),
  "pounce": (460, 520, [480, 595, 710, 810]), "slam": (460, 520, [1105, 1190, 1290, 1365, 1440]),
  "frost": (523, 585, [480, 555, 630, 705, 775, 850]), "rage": (523, 585, [1095, 1180, 1265, 1340, 1430]),
  "ultra": (588, 660, [500, 580, 660, 740, 825, 905, 1010, 1140, 1255, 1400]),
  "hit": (663, 722, [485, 555, 625, 695, 770]), "hitheavy": (663, 722, [1060, 1140, 1205, 1290, 1360, 1430]),
  "knockdown": (725, 785, [480, 550, 630, 700, 770, 830]), "getup": (725, 785, [1060, 1150, 1230, 1300, 1375, 1440]),
  "win": (787, 870, [490, 590, 700, 810, 910, 1015, 1140, 1270, 1395])})}


WIDE = {}


def cut(a, mx, lines, thr, top, bot, cs, i, fog=False):
    c = cs[i]; gap_l = (c - cs[i - 1]) if i else (cs[1] - c if len(cs) > 1 else 60)
    gap_r = (cs[i + 1] - c) if i + 1 < len(cs) else gap_l
    wf = WIDE.get('f', .5)
    L, R = max(0, int(c - gap_l * wf)), min(a.shape[1], int(c + gap_r * wf))
    crop = a[top:bot, L:R]; m0 = (mx[top:bot, L:R] > thr) & ~lines[top:bot, L:R]
    h, w = m0.shape
    m0[:6] = False; m0[-3:] = False                      # row borders
    if fog:   # dim purple floor haze under the feet
        r_, g_, b_ = [crop[..., c].astype(int) for c in range(3)]
        hz = (b_ > r_ + 10) & (b_ > g_ + 30) & (crop.max(-1) < 125); hz[:int(h * .82)] = False; m0 &= ~hz
    lab, n = nd.label(m0)
    seed = np.zeros_like(m0); seed[int(h * .2):int(h * .95), max(0, int(w / 2 - w * .2)):int(w / 2 + w * .2)] = True
    keep = np.unique(lab[seed & m0]); m = np.isin(lab, keep[keep > 0])
    if n:
        sz = nd.sum(m0, lab, range(1, n + 1))
        for j in keep[keep > 0]:
            if sz[j - 1] < 30: m[lab == j] = False
    # row border lines that run through the top or bottom of the box
    band = np.zeros_like(m); band[:8] = True; band[-8:] = True
    hl = nd.binary_opening(m0, structure=np.ones((1, 30))) & band
    m &= ~nd.binary_dilation(hl, iterations=2)
    lab2, n2 = nd.label(m)
    if n2 > 1:
        sz2 = nd.sum(m, lab2, range(1, n2 + 1)); m = np.isin(lab2, np.where(sz2 >= max(25, sz2.max() * .02))[0] + 1)
    if WIDE.get('trim'):   # drop pieces that belong to the neighbouring frames
        lab3, n3 = nd.label(m); midl, midr = c - L - gap_l / 2, c - L + gap_r / 2
        for j, sl in enumerate(nd.find_objects(lab3), 1):
            xs_ = np.where(lab3[sl] == j)[1] + sl[1].start
            if xs_.mean() < midl or xs_.mean() > midr: m[lab3 == j] = False
        m[:, :max(0, int(midl - gap_l * WIDE['trim']))] = False; m[:, int(midr + gap_r * WIDE['trim']):] = False
    m = nd.binary_fill_holes(nd.binary_closing(np.pad(m, 5), iterations=4))[5:-5, 5:-5]
    alpha = np.clip((mx[top:bot, L:R] - thr * .7) / 40, 0, 1) * 255
    alpha[nd.binary_erosion(m, iterations=2)] = 255; alpha[~m] = 0
    ys, xs = np.where(m[:, int(w * .2):int(w * .8)])
    if not len(ys): ys, xs = np.array([h - 1]), np.array([w * .3])
    yb = ys.max(); feet = xs[ys > yb - max(4, (yb - ys.min()) * .15)] + int(w * .2)
    return np.dstack([crop, alpha.astype(np.uint8)]), float(np.median(feet)), float(yb)


def build(key):
    S = SPEC[key]; a = np.array(Image.open(S["sheet"]).convert("RGB")); mx = a.max(-1).astype(int)
    br = mx > S["thr"]
    lines = nd.binary_opening(br, structure=np.ones((1, 45))) | nd.binary_opening(br, structure=np.ones((28, 1)))
    lines &= ~nd.binary_opening(br, structure=np.ones((7, 7)))
    lines = nd.binary_dilation(lines, iterations=1)
    raw = {}
    for mv, (top, bot, cs) in S["moves"].items():
        frs = [cut(a, mx, lines, S["thr"], top, bot, cs, i, S.get("fog", False)) for i in range(len(cs))]
        ground = float(np.percentile([f[2] for f in frs], 75))
        raw[mv] = [(f[0], f[1], ground if mv in ("jump", "pounce", "dash", "dodge") else max(f[2], ground - 3)) for f in frs]
    return raw, S


def assemble(raw, S, anims):
    i0 = raw["idle"][0]; ih = np.where(i0[0][..., 3].max(1) > 128)[0]; idle_h = i0[2] - ih.min()
    base = f"game/assets/characters/{S['out']}"; tables = {}
    for folder, s in (("frames-hd", .8), ("frames", .34)):
        os.makedirs(f"{base}/{folder}", exist_ok=True); k = S["body"] * s / idle_h; tab = {}
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
                rgb = pil.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2, percent=55, threshold=2)); rgb.putalpha(pil.getchannel("A")); pil = rgb
            pil.save(f"{base}/{folder}/{name}.webp", "WEBP", quality=88, method=6)
            tab[name] = [len(placed), Wf, Hf, int(round(Lm / s)), int(round(Tm / s))]
        tables[folder] = tab
    return tables


def snow(raw):
    r = raw; return {"idle": r["idle"], "walk_forward": r["walk"], "walk_back": r["walkback"], "run": r["run"], "dash": r["dash"],
        "crouch": r["crouch"], "jump": r["jump"], "block": r["block"], "attack_light": r["light"], "attack_heavy": r["heavy"],
        "bite": r["claw"], "uppercut": r["spin"], "special_pounce": r["pounce"], "special_b": r["phantom"], "special_c": r["frost"],
        "special_d": r["combo"], "ultra_move": r["ultra"], "hit_light": r["hit"][:3], "hit_heavy": r["hit"][2:] + r["knockdown"],
        "knockdown_getup": r["knockdown"] + r["getup"], "victory": r["win"], "defeat": r["hit"][2:] + r["knockdown"]}


def majic(raw):
    r = raw; return {"idle": r["idle"], "walk_forward": r["walk"], "walk_back": r["walkback"], "run": r["run"], "dash": r["dodge"],
        "crouch": r["crouch"], "jump": r["jump"], "block": r["block"], "attack_light": r["light"], "attack_heavy": r["heavy"],
        "bite": r["bite"], "uppercut": r["claw"], "special_pounce": r["pounce"], "special_b": r["frost"], "special_c": r["rage"],
        "special_d": r["slam"], "ultra_move": r["ultra"], "hit_light": r["hit"], "hit_heavy": r["hitheavy"],
        "knockdown_getup": r["knockdown"] + r["getup"], "victory": r["win"], "defeat": r["hitheavy"]}


if __name__ == "__main__":
    out = {}
    for key in sys.argv[1:]:
        raw, S = build(key)
        out[S["out"]] = assemble(raw, S, snow(raw) if key == "snow-leopard" else majic(raw))
    print(json.dumps(out))
