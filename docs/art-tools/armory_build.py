"""Build Jungle Armory outfit assets.
usage: armory_build.py <fighter> <look> <outfit_on_green.jpg> <mask.png>
Writes game/assets/armory/<fighter>/<look>.webp   (cut-out, transparent background, 600 px wide)
       game/assets/armory/<fighter>/<look>-m.png  (region map, grey levels: 0 none, 50 primary fabric,
                                                   100 trim/lettering, 150 footwear, 200 metal/accessories)
The mask is an AI edit of the same picture in flat colours:
 magenta=primary fabric, yellow=trim, blue=footwear, red=metal, dark grey=body, green=background."""
import sys, os, numpy as np, cv2
from PIL import Image
fid, look, src, msk = sys.argv[1:5]
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'game', 'assets', 'armory', fid)
os.makedirs(G, exist_ok=True)
W = 600
im = Image.open(src).convert('RGB'); H = round(im.height * W / im.width)
a = np.array(im.resize((W, H), Image.LANCZOS)).astype(np.int16)
# green key with soft edge + despill
g = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
alpha = np.clip((60 - g) / 40, 0, 1)
fg = (alpha > .5).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(fg, np.ones((15, 15), np.uint8)), 8)
if n > 1:
    keep = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    alpha *= (lab == keep)
rgb = a.copy(); spill = np.maximum(0, a[..., 1] - np.maximum(a[..., 0], a[..., 2]))
rgb[..., 1] -= (spill * (alpha < 1) + spill * .6 * (alpha >= 1)).astype(np.int16)
out = np.dstack([np.clip(rgb, 0, 255), (alpha * 255)]).astype(np.uint8)
ys, xs = np.where(alpha > .05); y0, y1 = max(0, ys.min() - 6), min(H, ys.max() + 6)
Image.fromarray(out[y0:y1]).save(f'{G}/{look}.webp', quality=88, method=6)
# region map: nearest palette colour
m = np.array(Image.open(msk).convert('RGB').resize((W, H), Image.NEAREST)).astype(np.int32)
P = np.array([[64, 64, 64], [255, 0, 255], [255, 255, 0], [0, 0, 255], [255, 0, 0], [0, 255, 0]])
d = ((m[:, :, None, :] - P[None, None]) ** 2).sum(-1); idx = d.argmin(-1)
val = np.array([0, 50, 100, 150, 200, 0], np.uint8)[idx]
val[alpha < .3] = 0
val = cv2.medianBlur(val, 3)
Image.fromarray(val[y0:y1]).save(f'{G}/{look}-m.png', optimize=True)
print(fid, look, out[y0:y1].shape, {k: int((val == k).sum()) for k in (50, 100, 150, 200)})
