"""Turn a Kling green-screen clip into game sprite sheets (HD + low) for one fighter animation.

Every Kling clip starts from the same starter picture with a locked camera, so frame 0 of each clip
gives the same scale and anchor; all moves line up with each other in the game.

usage: build_kling_anim.py <fighter> <anim> <video.mp4> <start> <end> <step> <stand_units> [extra anim names...]
  start/end  frame numbers in the 24 fps clip (end exclusive)
  step       keep every Nth frame (2 = 12 fps)
  stand_units  the fighter's standing height in game units (matches the current art)
Prints the HD/low table entries as JSON on the last line.
"""
import sys, os, json, subprocess, tempfile, glob
import numpy as np
from PIL import Image

fid, anim, video = sys.argv[1], sys.argv[2], sys.argv[3]
start, end, step = int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
stand_units = float(sys.argv[7])
extra = sys.argv[8:]
G = '/home/claude/king-of-the-jungle/game'

tmp = tempfile.mkdtemp()
import atexit, shutil; atexit.register(lambda: shutil.rmtree(tmp, ignore_errors=True))
subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', video, f'{tmp}/%04d.png'], check=True)
allf = sorted(glob.glob(f'{tmp}/*.png'))

def key(p):
    a = np.array(Image.open(p).convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = g - np.maximum(r, b)
    al = np.clip(1 - (spill - 22) / 45, 0, 1)
    # despill: cap green at the brighter of red/blue on semi-green pixels
    a[..., 1] = np.where(spill > 0, np.maximum(r, b) + np.clip(spill, 0, 6), g)
    al[al < 0.06] = 0
    return np.dstack([a, al * 255]).astype(np.uint8)

def solid(arr):
    return arr[..., 3] > 110

# scale + anchor from frame 0 (the starter pose)
f0 = key(allf[0]); m0 = solid(f0)
rows = np.where(m0.any(1))[0]; top0, feet0 = rows.min(), rows.max()
unit = (feet0 - top0) / stand_units
band = m0[int(top0 + (feet0 - top0) * .4):int(top0 + (feet0 - top0) * .7)]
hipx = float(np.median([(np.where(r)[0].min() + np.where(r)[0].max()) / 2 for r in band if r.any()]))

idx = list(range(start, min(end, len(allf)), step))
if os.environ.get('FRAMES'):   # e.g. FRAMES=64-80,93-108 (inclusive ranges, step applies)
    idx = [i for r in os.environ['FRAMES'].split(',') for i in range(int(r.split('-')[0]), int(r.split('-')[1]) + 1, step)]
if os.environ.get('PINGPONG'): idx = idx + idx[-2:0:-1]   # seamless loop: forward then back
K = [key(allf[i]) for i in idx]
U = np.zeros(K[0].shape[:2], bool)
for k in K: U |= solid(k)
ys = np.where(U.any(1))[0]; xs = np.where(U.any(0))[0]
pad = 8
x0, x1 = max(0, xs.min() - pad), min(U.shape[1] - 1, xs.max() + pad)
y0, y1 = max(0, ys.min() - pad), min(U.shape[0] - 1, max(ys.max(), feet0) + 4)
crops = [Image.fromarray(k).crop((x0, y0, x1 + 1, y1 + 1)) for k in K]
W, H = crops[0].size
px, py = (hipx - x0) / unit, (feet0 - y0) / unit
out = {}
for tag, s, folder in [('hd', 2.0, 'frames-hd'), ('lo', 0.6, 'frames')]:
    fw, fh = round(W / unit * s), round(H / unit * s); n = len(crops)
    cols = min(n, max(1, 16000 // fw)); rws = (n + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * fw, rws * fh))
    for i, c in enumerate(crops):
        sheet.paste(c.resize((fw, fh), Image.LANCZOS), ((i % cols) * fw, (i // cols) * fh))
    for name in [anim] + extra:
        sheet.save(f'{G}/assets/characters/{fid}/{folder}/{name}.webp', 'WEBP', quality=78, method=6, alpha_quality=88)
    out[tag] = [n, fw, fh, round(px), round(py)] + ([cols] if cols != n else [])
print(json.dumps(out))
