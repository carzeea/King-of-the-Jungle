"""Find the best seamless loop (start, end) in a Kling clip: the pair of frames that look most alike.
usage: find_loop.py video.mp4 min_len max_len [from] [to]"""
import sys,subprocess,tempfile,glob,numpy as np
from PIL import Image
v=sys.argv[1];lo,hi=int(sys.argv[2]),int(sys.argv[3]);a0=int(sys.argv[4]) if len(sys.argv)>4 else 0;a1=int(sys.argv[5]) if len(sys.argv)>5 else 9999
t=tempfile.mkdtemp();subprocess.run(['ffmpeg','-loglevel','error','-i',v,'-vf','scale=240:-2',f'{t}/%04d.png'])
F=[np.array(Image.open(p).convert('RGB')).astype(np.float32) for p in sorted(glob.glob(t+'/*.png'))]
best=None
for i in range(a0,min(a1,len(F))):
  for j in range(i+lo,min(i+hi,len(F),a1)):
    d=np.abs(F[i]-F[j]).mean()
    if best is None or d<best[0]: best=(d,i,j)
print(best[1],best[2],round(best[0],2))
