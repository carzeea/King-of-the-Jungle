import sys,os,numpy as np
from PIL import Image
OUT='/home/claude/king-of-the-jungle/game/assets/fx/real';os.makedirs(OUT,exist_ok=True)
BG=dict(fire='black',snow='black',ice='black',water='black',ember='black',smoke='black',venom='black',leaf='magenta',feather='green',rock='green',paw='green')
def proc(a,bg,name):
  r,g,b=a[...,0],a[...,1],a[...,2]
  if bg=='black':
    if name=='smoke':alpha=np.clip((a.mean(-1)-10)/190,0,1);rgb=np.full_like(a,255);return rgb,alpha
    # additive art: alpha from brightness, colour un-premultiplied, so it also draws correctly normally
    mx=a.max(-1);alpha=np.clip((mx-6)/120,0,1);rgb=np.where(alpha[...,None]>0,np.clip(a/np.maximum(alpha,1e-3)[...,None],0,255),0);return rgb,alpha
  key=(g-np.maximum(r,b)) if bg=='green' else (np.minimum(r,b)-g)
  alpha=np.clip(1-(key-20)/70,0,1);rgb=a.copy()
  if bg=='green':rgb[...,1]=np.minimum(g,np.maximum(r,b)*1.08)
  else:rgb[...,2]=np.minimum(b,np.maximum(g,r)*.8);rgb[...,0]=np.where(alpha<.95,np.minimum(r,np.maximum(g,b)*1.3+40),r)
  return rgb,alpha
def save(rgb,al,path,MAX):
  ys,xs=np.where(al>.04)
  if len(ys)<50:return False
  y0,y1,x0,x1=max(0,ys.min()-4),ys.max()+5,max(0,xs.min()-4),xs.max()+5
  o=Image.fromarray(np.dstack([rgb[y0:y1,x0:x1].clip(0,255).astype(np.uint8),(al[y0:y1,x0:x1]*255).astype(np.uint8)]),'RGBA')
  s=MAX/max(o.size)
  if s<1:o=o.resize((round(o.size[0]*s),round(o.size[1]*s)),Image.LANCZOS)
  o.save(path,quality=86,method=6);return True
for name,bg in BG.items():
  a=np.array(Image.open(f'/tmp/fxtex/raw/{name}.img').convert('RGB')).astype(np.float32)
  rgb,al=proc(a,bg,name)
  if name=='paw':
    W=al.shape[1];ramp=np.clip(np.arange(W)/(W*.22),0,1);al=al*ramp[None,:]  # soften the cut-off shoulder end
    save(rgb,al,f'{OUT}/paw.webp',640);print('paw');continue
  H,W=al.shape;n=0
  for i in range(3):
    for j in range(3):
      ys,xs=slice(i*H//3,(i+1)*H//3),slice(j*W//3,(j+1)*W//3)
      if save(rgb[ys,xs],al[ys,xs],f'{OUT}/{name}-{i*3+j}.webp',200 if name!='smoke' else 220):n+=1
  print(name,n)
