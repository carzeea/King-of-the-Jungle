"""Find the strike frame (furthest forward reach) of each attack sheet so hits land on it.
Writes game/js/peaks.js: SPRITE_PEAK[fighter][anim] = fraction of the animation at the strike frame."""
import json,numpy as np
from PIL import Image
G='/home/claude/king-of-the-jungle/game'
d=json.loads(open(G+'/js/sprites-hd.js').read().split('=',1)[1].strip().rstrip(';'))
ATT=['attack_light','bite','claw_swipe','attack_heavy','uppercut','special_pounce','special_b','pounce','special_earth_slam','sx1','sx2','sx3']
out={}
for fid,v in d.items():
  out[fid]={}
  for a in ATT:
    if a not in v['anims']:continue
    n,fw,fh,px,py=v['anims'][a][:5];cols=v['anims'][a][5] if len(v['anims'][a])>5 else n
    try:im=np.array(Image.open(f'{G}/assets/characters/{fid}/frames-hd/{a}.webp'))[...,3]
    except Exception:continue
    reach=[]
    for i in range(n):
      r,c=divmod(i,cols);f=im[r*fh:(r+1)*fh,c*fw:(c+1)*fw]>100
      xs=np.where(f.any(0))[0];reach.append(xs.max() if len(xs) else 0)
    reach=np.convolve(np.array(reach,float),np.ones(3)/3,'same')
    k=int(np.argmax(reach[1:-1]))+1 if n>3 else int(np.argmax(reach))
    out[fid][a]=round(k/max(1,n-1),3)
open(G+'/js/peaks.js','w').write('const SPRITE_PEAK='+json.dumps(out,separators=(',',':'))+';\n')
print(json.dumps(out)[:600])
