"""Build Majic's animation strips from one cut-out pose (until a full sprite
sheet exists). Each animation is a set of keyframed moves of the same pose:
lean, lunge, squash/stretch, kneel, plus gold claw-slash arcs.

Usage: python3 make_majic.py <majic_cut.png> <game_dir>
Writes game/assets/characters/majic/frames{,-hd}/*.webp and prints the
SPRITES / SPRITES_HD table entries.
"""
import sys, os, json, math
import numpy as np, cv2
from PIL import Image

SRC, GAME = sys.argv[1], sys.argv[2]
BODY = 420          # Majic's height in game units (the Elephant is ~330)
src = np.array(Image.open(SRC).convert("RGBA")).astype(np.float32)
# drop bits of blue sky left between the legs
b, g, r = src[..., 2], src[..., 1], src[..., 0]
src[(b > r + 25) & (b > g + 8), 3] = 0
src[..., :3] *= src[..., 3:4] / 255          # premultiply
Hs, Ws = src.shape[:2]
ANCHOR = (Ws * 0.5, Hs - 4)                  # between the feet, on the ground

L = lambda t: math.sin(math.pi * t)          # 0 -> 1 -> 0 lunge curve

def P(dx=0, dy=0, rot=0, sx=1, sy=1, br=1, slash=None, ghosts=0):
    return dict(dx=dx, dy=dy, rot=rot, sx=sx, sy=sy, br=br, slash=slash, ghosts=ghosts)

def frames(n, f):
    return [f(i / max(1, n - 1), i) for i in range(n)]

ANIMS = {
 "idle": frames(9, lambda t, i: P(sy=1 + .015 * math.sin(2 * math.pi * t), sx=1 - .006 * math.sin(2 * math.pi * t))),
 "walk_forward": frames(8, lambda t, i: P(dy=-7 * abs(math.sin(2 * math.pi * t)), rot=2.5 * math.sin(2 * math.pi * t) + 2)),
 "walk_back": frames(6, lambda t, i: P(dy=-6 * abs(math.sin(2 * math.pi * t)), rot=2 * math.sin(2 * math.pi * t) - 2)),
 "run": frames(7, lambda t, i: P(dy=-9 * abs(math.sin(2 * math.pi * t)), rot=8 + 2 * math.sin(2 * math.pi * t), dx=10)),
 "block": frames(6, lambda t, i: P(rot=-5 * min(1, t * 3), dx=-8 * min(1, t * 3), sx=.96, sy=.98, br=.9)),
 "attack_light": frames(7, lambda t, i: P(dx=45 * L(t), rot=9 * L(t), slash=("side", .9) if .3 < t < .75 else None)),
 "attack_heavy": frames(6, lambda t, i: P(dx=70 * L(t), rot=13 * L(t), sy=1 + .04 * L(t), slash=("big", 1.2) if .3 < t < .8 else None)),
 "bite": frames(6, lambda t, i: P(dx=60 * L(t), rot=15 * L(t), dy=12 * L(t))),
 "uppercut": frames(7, lambda t, i: P(sy=.9, rot=5, dy=0) if t < .3 else
                    P(sy=1.08, rot=-7, dy=-34 * L((t - .3) / .7 * .5 + .5) - 10, dx=20,
                      slash=("up", 1.1) if t < .8 else None)),
 "jump": frames(7, lambda t, i: P(sy=.9, sx=1.04) if i in (0, 6) else P(rot=-6 + 12 * t, sy=1.02)),
 "special_pounce": frames(6, lambda t, i: P(dx=140 * t, dy=-90 * L(t), rot=16 * L(t) + 4, ghosts=3 if .1 < t < .9 else 0,
                                           slash=("big", 1.3) if t > .7 else None)),
 "hit_light": frames(6, lambda t, i: P(dx=-22 * L(t), rot=-9 * L(t), br=1.5 if i < 2 else 1)),
 "hit_heavy": frames(8, lambda t, i: P(dx=-60 * min(1, t * 1.3), rot=-18 * min(1, t * 1.3), sy=1 - .28 * min(1, t * 1.3),
                                       br=1.5 if i == 0 else 1 - .15 * min(1, t * 1.3))),
 "knockdown_getup": frames(14, lambda t, i: P(rot=-18, sy=.72, dx=-60, br=.85) if i < 7 else
                           P(rot=-18 * (1 - (i - 6) / 7), sy=.72 + .28 * (i - 6) / 7, dx=-60 * (1 - (i - 6) / 7), br=.85 + .15 * (i - 6) / 7)),
 "victory": frames(8, lambda t, i: P(sy=1 + .07 * min(1, t * 1.5), rot=-5 * min(1, t * 1.5), dy=-10 * min(1, t * 1.5), br=1 + .15 * min(1, t * 1.5))),
 "defeat": frames(7, lambda t, i: P(sy=1 - .35 * t, rot=-22 * t, dx=-40 * t, br=1 - .35 * t)),
}

def slash_layer(shape, ax, ay, kind, k, scale):
    h, w = shape
    lay = np.zeros((h, w, 4), np.float32)
    R = int(BODY * scale * k * .55)
    cx, cy = int(ax + BODY * .38 * scale), int(ay - BODY * .55 * scale)
    if kind == "up":
        a0, a1 = 200, 330; cx = int(ax + BODY * .25 * scale); cy = int(ay - BODY * .45 * scale)
    elif kind == "side":
        a0, a1 = -70, 60
    else:
        a0, a1 = -80, 80; R = int(R * 1.15)
    for thick, col, al in ((int(26 * scale * k), (255, 150, 40), .45), (int(12 * scale * k), (255, 215, 110), .9), (int(4 * scale * k) + 1, (255, 250, 220), 1)):
        tmp = np.zeros((h, w), np.uint8)
        cv2.ellipse(tmp, (cx, cy), (R, int(R * .85)), 0, a0, a1, 255, max(1, thick), cv2.LINE_AA)
        tmp = cv2.GaussianBlur(tmp, (0, 0), max(.6, thick * .25)).astype(np.float32) / 255 * al
        for c_, v in enumerate(col):
            lay[..., c_] = lay[..., c_] * (1 - tmp) + v * tmp
        lay[..., 3] = np.maximum(lay[..., 3], tmp * 255)
    lay[..., :3] *= lay[..., 3:4] / 255
    return lay

def render(p, s):
    """Render one frame on a big canvas with the feet at (cx, gy)."""
    scale = s                                  # game unit -> pixels
    k = BODY * scale / Hs                       # source pixel -> output pixel
    Wc, Hc = int(BODY * 2.4 * scale), int(BODY * 1.5 * scale)
    cx, gy = Wc * .45, Hc * .9
    out = np.zeros((Hc, Wc, 4), np.float32)
    def put(dx, dy, alpha):
        th = math.radians(p["rot"])
        c, s_ = math.cos(th), math.sin(th)
        A = np.array([[c, -s_], [s_, c]]) @ np.diag([p["sx"] * k, p["sy"] * k])
        t = np.array([cx + dx * scale, gy + dy * scale]) - A @ np.array(ANCHOR)
        M = np.hstack([A, t[:, None]])
        w = cv2.warpAffine(src, M, (Wc, Hc), flags=cv2.INTER_AREA if k < 1 else cv2.INTER_CUBIC, borderValue=(0, 0, 0, 0))
        w[..., :3] *= p["br"]
        w *= alpha
        return w
    for gi in range(p["ghosts"], 0, -1):
        gw = put(p["dx"] - gi * 30, p["dy"] + gi * 6, .22 / gi)
        gw[..., 0] *= .6; gw[..., 1] *= .8
        out = gw + out * (1 - gw[..., 3:4] / 255)
    body = put(p["dx"], p["dy"], 1)
    out = body + out * (1 - body[..., 3:4] / 255)
    if p["slash"]:
        sl = slash_layer((Hc, Wc), cx + p["dx"] * scale, gy + p["dy"] * scale, p["slash"][0], p["slash"][1], scale)
        out = sl + out * (1 - sl[..., 3:4] / 255)
    return out, (cx, gy)

def unpremul(a):
    al = a[..., 3:4]
    rgb = np.where(al > .5, a[..., :3] * 255 / np.maximum(al, 1e-3), 0)
    return np.dstack([np.clip(rgb, 0, 255), np.clip(al, 0, 255)]).astype(np.uint8)

def build(folder, s):
    os.makedirs(folder, exist_ok=True)
    table = {}
    for name, keys in ANIMS.items():
        rend = [render(p, s) for p in keys]
        alpha = np.max([r[0][..., 3] for r in rend], axis=0)
        ys, xs = np.where(alpha > 2)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        fw, fh = x1 - x0, y1 - y0
        strip = np.zeros((fh, fw * len(rend), 4), np.uint8)
        for i, (fr, _) in enumerate(rend):
            strip[:, i * fw:(i + 1) * fw] = unpremul(fr[y0:y1, x0:x1])
        Image.fromarray(strip, "RGBA").save(os.path.join(folder, name + ".webp"), "WEBP", quality=86, method=6)
        cx, gy = rend[0][1]
        table[name] = [len(rend), int(fw), int(fh), int(round((cx - x0) / s)), int(round((gy - y0) / s))]
    return table

base = os.path.join(GAME, "assets", "characters", "majic")
hd = build(os.path.join(base, "frames-hd"), 0.8)
lo = build(os.path.join(base, "frames"), 0.34)
print(json.dumps({"hd": hd, "lo": lo}))
