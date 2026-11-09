"""Re-centre every fighter animation so its anchor (the fighter's position in the game) sits on the
middle of the body (waist/hips), the same way for every animation. Some sheets were cut with the anchor
off to one side, which made hits look like they passed through or fell short.
Uses the weighted middle of the waist band (55-82% down the figure), median over the frames, so thin
tails and wings barely affect it. Updates px in SPRITES_HD (sprites-hd.js) and SPRITES (game.js).
Run once after new sheets go in, then run measure_hitboxes.py."""
import json, re, os, numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'game')
HDP = os.path.join(ROOT, 'js/sprites-hd.js'); GJ = os.path.join(ROOT, 'js/game.js')
src = open(HDP).read(); pre, body = src.split('SPRITES_HD=', 1); HD = json.loads(body.strip().rstrip(';'))
SKIP = {'knockdown_getup', 'defeat', 'hit_heavy'}  # lying-down poses: keep as they were
deltas = {}
for fid, d in HD.items():
    sc = d.get('s', .8)
    for name, (n, fw, fh, px, py) in d['anims'].items():
        if name in SKIP: continue
        im = np.array(Image.open(os.path.join(ROOT, f'assets/characters/{fid}/frames-hd/{name}.webp')).convert('RGBA'))[..., 3] > 110
        cs = []
        for i in range(n):
            f = im[:, i*fw:(i+1)*fw]; rows = np.where(f.any(1))[0]
            if len(rows) < 10: continue
            t, b = rows.min(), rows.max(); band = f[int(t+(b-t)*.55):int(t+(b-t)*.82)]
            ys, xs = np.nonzero(band)
            if len(xs): cs.append(np.median(xs))
        if not cs: continue
        c = float(np.median(cs)) / sc            # body centre in game units from frame's left edge
        delta = round(c - px)
        if abs(delta) >= 6:
            d['anims'][name][3] = px + delta; deltas.setdefault(fid, {})[name] = delta
open(HDP, 'w').write(pre + 'SPRITES_HD=' + json.dumps(HD, separators=(',', ':')) + ';\n')
g = open(GJ).read()
for fid, ch in deltas.items():
    m = re.search(r'\n ' + fid + r':\{s:[0-9.]+,anims:\{', g)
    if not m: print('no lo entry', fid); continue
    s0 = m.end(); s1 = g.find('}', s0); seg = g[s0:s1]
    for name, dl in ch.items():
        def rep(mm):
            v = json.loads(mm.group(2)); v[3] += dl; return mm.group(1) + json.dumps(v, separators=(',', ':'))
        seg = re.sub(r'("' + name + r'":)(\[[^\]]*\])', rep, seg, count=1)
    g = g[:s0] + seg + g[s1:]
open(GJ, 'w').write(g)
for k, v in deltas.items(): print(k, v)
