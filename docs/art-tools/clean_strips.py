"""Final pass on cut strips: remove stray divider slivers (thin pieces apart from the body).
Usage: python3 clean_strips.py <character_dir> [...]"""
import sys, os, glob, json
import numpy as np, scipy.ndimage as nd
from PIL import Image

def clean(path, n):
    a = np.array(Image.open(path).convert("RGBA")); W = a.shape[1] // n; removed = 0
    for i in range(n):
        f = a[:, i * W:(i + 1) * W]; m = f[..., 3] > 30
        lab, k = nd.label(nd.binary_dilation(m, iterations=1))
        if k < 2: continue
        sz = nd.sum(m, lab, range(1, k + 1)); big = int(np.argmax(sz)) + 1
        for j, sl in enumerate(nd.find_objects(lab), 1):
            if j == big: continue
            hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            thin = (hh >= 2.2 * ww and ww <= max(18, W * .12)) or (ww >= 2.5 * hh and hh <= 12)
            if thin or sz[j - 1] < 40:
                f[sl][lab[sl] == j] = 0; removed += 1
    Image.fromarray(a, "RGBA").save(path, "WEBP", quality=88, method=6)
    return removed

if __name__ == "__main__":
    for d in sys.argv[1:]:
        cid = os.path.basename(d.rstrip("/"))
        tab = json.load(open("/tmp/nc/t2.json"))[cid]
        total = 0
        for folder in ("frames-hd", "frames"):
            for name, spec in tab[folder].items():
                total += clean(os.path.join(d, folder, name + ".webp"), spec[0])
        print(cid, "slivers removed:", total)
