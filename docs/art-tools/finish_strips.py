"""Last cleanup on cut strips: make near-black background that touches the frame edge
transparent (keeps dark armor, which is enclosed), and remove thin border lines lying
along the bottom or top of a frame.
Usage: python3 finish_strips.py <char_dir> <tables.json> [dark_threshold]"""
import sys, os, json
import numpy as np, scipy.ndimage as nd
from PIL import Image
d, tj = sys.argv[1], sys.argv[2]; thr = int(sys.argv[3]) if len(sys.argv) > 3 else 42
cid = os.path.basename(d.rstrip('/')); tab = json.load(open(tj))[cid]
for folder in ('frames-hd', 'frames'):
    for name, sp in tab[folder].items():
        p = f'{d}/{folder}/{name}.webp'; a = np.array(Image.open(p).convert('RGBA')); n = sp[0]; W = a.shape[1] // n; H = a.shape[0]
        for i in range(n):
            f = a[:, i * W:(i + 1) * W]; mx = f[..., :3].max(-1).astype(int)
            dark = (mx < thr) | (f[..., 3] < 20)
            lab, _ = nd.label(dark); e = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
            out = np.isin(lab, e[e > 0]); f[out, 3] = 0
            m = f[..., 3] > 30
            hl = nd.binary_opening(m, structure=np.ones((1, max(12, W // 8)))) & ~nd.binary_opening(m, structure=np.ones((7, 7)))
            hl[int(H * .12):int(H * .88)] = False
            f[nd.binary_dilation(hl, iterations=1), 3] = 0
            m = f[..., 3] > 30; lab, k = nd.label(m)
            if k > 1:
                sz = nd.sum(m, lab, range(1, k + 1))
                f[np.isin(lab, np.where(sz < max(20, sz.max() * .01))[0] + 1), 3] = 0
        Image.fromarray(a, 'RGBA').save(p, 'WEBP', quality=88, method=6)
print(cid, 'finished')
