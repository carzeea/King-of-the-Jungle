"""MAJIC from his one-sheet revamp (majic-v4-sheet.png): idle, walk, heavy claw, pounce,
titan slam, titan roar are cut from the sheet; hit, knockdown, get up, block and jump are
built from those same frames (tilts and shifts), so his design stays consistent.
Usage (repo root): python3 docs/art-tools/make_majic_v4.py  -> prints tables JSON"""
import sys, json, math
import numpy as np, cv2, scipy.ndimage as nd
sys.path.insert(0, "docs/art-tools")
import cut_by_centers as C
C.WIDE["f"] = .78
C.WIDE["trim"] = .12
from PIL import Image

C.SPEC["majic4"] = dict(sheet="docs/sprite-sheets/majic/majic-v4-sheet.png", out="majic", thr=50, body=385, moves={
 "idle": (302, 486, [98, 288, 477, 670]), "walk": (302, 486, [868, 1058, 1222, 1428]),
 "claw": (542, 710, [92, 273, 462, 666]), "pounce": (537, 710, [874, 1062, 1250, 1430]),
 "slam": (774, 976, [110, 292, 478, 665]), "roar": (774, 976, [859, 1046, 1240, 1425])})


def tilt(fr, deg, dx=0, dy=0, bright=1.0, lie=False):
    """Rotate a frame about its feet (deg > 0 leans back). Returns a new (rgba, ax, ay)."""
    rgba, ax, ay = fr
    h, w = rgba.shape[:2]; P = int(max(h, w) * 1.2)
    big = np.zeros((h + 2 * P, w + 2 * P, 4), np.float32); big[P:P + h, P:P + w] = rgba
    big[..., :3] *= big[..., 3:4] / 255
    cx, cy = ax + P, ay + P
    M = cv2.getRotationMatrix2D((cx, cy), deg, 1.0)
    out = cv2.warpAffine(big, M, (big.shape[1], big.shape[0]), flags=cv2.INTER_LINEAR)
    al = out[..., 3]; ys, xs = np.where(al > 20)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = out[y0:y1, x0:x1]; a = out[..., 3:4]
    rgb = np.where(a > .5, out[..., :3] * 255 / np.maximum(a, 1e-3), 0) * bright
    res = np.dstack([np.clip(rgb, 0, 255), a]).astype(np.uint8)
    nax, nay = cx - x0 + dx, cy - y0 + dy
    if lie:   # resting on the ground: feet anchor moves to the bottom of the body
        nay = (y1 - y0) - 2 + dy
    return res, float(nax), float(nay)


C.SPEC["majic4f"] = dict(sheet="docs/sprite-sheets/majic/majic-v4-frost.png", out="majic", thr=50, body=385, moves={
 "frost": (314, 437, [316, 553, 784, 999, 1250, 1540]), "blast": (450, 567, [253, 410, 555, 701, 864]),
 "pillars": (450, 567, [1216, 1363, 1515, 1663]), "hit": (583, 701, [288, 444, 595, 727]),
 "knock": (583, 701, [1121, 1302, 1493, 1665]), "recov": (718, 868, [217, 370, 509, 650]),
 "aura": (718, 868, [1172, 1338, 1500, 1670])})
raw, S = C.build("majic4")
F_, _ = C.build("majic4f")
I, W, CL, PO, SL, RO = raw["idle"], raw["walk"], raw["claw"], raw["pounce"], raw["slam"], raw["roar"]
f0 = I[0]
hit_l = [tilt(f0, 10, bright=1.5), tilt(f0, 16), tilt(f0, 8), f0, f0]
fall = [tilt(f0, 12, bright=1.5), tilt(f0, 28, dx=8), tilt(f0, 48, dx=18), tilt(f0, 70, dx=30, lie=True),
        tilt(f0, 86, dx=40, lie=True), tilt(f0, 90, dx=44, lie=True)]
down = [tilt(f0, 90, dx=44, lie=True)] * 3
getup = [tilt(SL[3], 40, dx=20, lie=True), tilt(SL[3], 18, dx=10), SL[3], tilt(f0, 6), f0]
anims = {"idle": I, "walk_forward": W, "walk_back": W[::-1], "run": W, "dash": PO[:3],
 "crouch": [PO[0], SL[3], SL[3]], "jump": [PO[0], PO[2], PO[2], PO[2], PO[3]], "block": [tilt(CL[0], 5)] * 3,
 "attack_light": CL, "attack_heavy": SL, "bite": CL[:3] + [CL[0]], "uppercut": SL[:3] + [SL[0]],
 "special_pounce": PO, "special_b": F_["frost"], "special_c": F_["blast"], "special_d": F_["pillars"],
 "ultra_move": F_["aura"] + RO[2:] + SL[2:], "hit_light": F_["hit"], "hit_heavy": F_["hit"][2:] + F_["knock"],
 "knockdown_getup": F_["knock"] + [F_["knock"][2]] * 2 + F_["recov"], "victory": RO + [RO[3], RO[2], RO[3]],
 "defeat": F_["hit"][2:] + F_["knock"][:3]}
print(json.dumps({"majic": C.assemble(raw, S, anims)}))
