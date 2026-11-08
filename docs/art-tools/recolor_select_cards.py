import numpy as np
from PIL import Image
import colorsys
def recolor(src,dst,hue,ymin,satboost=1.0,lo=200,hi=320):
  im=np.array(Image.open(src).convert('RGB')).astype(float)/255
  r,g,b=im[...,0],im[...,1],im[...,2];mx=im.max(-1);mn=im.min(-1);d=mx-mn+1e-6
  h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
  s=np.where(mx>0,d/np.maximum(mx,1e-6),0)
  m=(h>=lo)&(h<=hi)&(s>.07)&(mx>.06)
  m[:int(im.shape[0]*ymin)]=False
  from scipy.ndimage import gaussian_filter
  w=gaussian_filter(m.astype(float),1.2)
  out=im.copy();H=hue/360
  for y,x in zip(*np.where(w>0.02)):
    v=mx[y,x];ss=min(1,s[y,x]*satboost);rr,gg,bb=colorsys.hsv_to_rgb(H,ss,v);a=w[y,x]
    out[y,x]=im[y,x]*(1-a)+np.array([rr,gg,bb])*a
  Image.fromarray((out*255).clip(0,255).astype(np.uint8)).save(dst,quality=93)
import sys
recolor('new_snake.jpg','rc_snake.jpg',356,.72,3.0)
recolor('new_stag.jpg','rc_stag.jpg',356,.72,3.0)
recolor('new_eagle.jpg','rc_eagle.jpg',222,.72,2.2,lo=250,hi=335)
P='/home/claude/king-of-the-jungle/game/assets/characters/portraits/'
o=Image.new('RGB',(1500,600))
for i,c in enumerate(['snake','stag','eagle']):
  o.paste(Image.open(f'new_{c}.jpg'),(i*500,0));o.paste(Image.open(f'rc_{c}.jpg'),(i*500+250,0))
for i,c in enumerate(['snake','stag','eagle']):
  o.paste(Image.open(f'rc_{c}.jpg').resize((500,300)).crop((0,0,500,300)) if False else Image.open(f'rc_{c}.jpg').resize((500,600)).crop((0,300,500,600)),(i*500,300))
o.save('rc_cmp.png')
