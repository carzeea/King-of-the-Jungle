import numpy as np,sys
from PIL import Image,ImageDraw,ImageFilter
from scipy import ndimage as nd
from metal import *
S=3;W,H=360*S,250*S
def poly_mask(pts):
  m=Image.new('L',(W,H));ImageDraw.Draw(m).polygon([(x*S,y*S) for x,y in pts],fill=255);return np.array(m)>0
def ell(cx,cy,rx,ry):
  m=Image.new('L',(W,H));ImageDraw.Draw(m).ellipse(((cx-rx)*S,(cy-ry)*S,(cx+rx)*S,(cy+ry)*S),fill=255);return np.array(m)>0
# --- back band (inside of the crown, seen between the points)
back=poly_mask([(40,150),(320,150),(320,175),(40,175)])
# --- front: band + 5 points (tall center, mid, outer), each topped with a pearl
band=poly_mask([(14,168),(346,168),(342,232),(18,232)])
pts=[]
def spike(cx,top,half,base=172):
  # spire with concave (swept) sides and a small knob neck
  P=[];n=14
  for i in range(n+1):
    t=i/n;y=base-(base-top)*t;w=half*(1-t)**1.7+3.2
    P.append((cx-w,y))
  for i in range(n,-1,-1):
    t=i/n;y=base-(base-top)*t;w=half*(1-t)**1.7+3.2
    P.append((cx+w,y))
  return poly_mask(P)
front=band.copy()
TIPS=[(36,96,30),(108,62,34),(180,26,40),(252,62,34),(324,96,30)]
for cx,top,half in TIPS: front|=spike(cx,top,half)
# arch cutouts between spikes for an open, crafted look
for cx in [72,144,216,288]: front&=~ell(cx,170,14,20)|band
front&=~ell(-100,0,1,1)
# heightmaps
hb=bevel(back,6*S)*.6
hf=bevel(front,7*S)
# engraved band: two grooves and a row of raised studs
yy=np.arange(H)[:,None]/S;xx=np.arange(W)[None,:]/S
groove=np.exp(-((yy-180)/1.4)**2)+np.exp(-((yy-222)/1.4)**2)
hf-=groove*.35*band
studs=np.zeros_like(hf)
for x in range(26,340,14): studs+=np.exp(-(((xx-x)/2.6)**2+((yy-201)/2.6)**2))
hf+=studs*.45*band
# filigree lines on each spike
for cx,top,half in TIPS:
  hf+= .25*np.exp(-((np.abs(xx-cx)-(yy-top)*half/(172-top)*.55)/1.1)**2)*(yy>top+8)*(yy<168)*front
hf=nd.gaussian_filter(hf,.8*S)
img=Image.new('RGBA',(W,H))
cap=ell(180,150,150,92)&(yy*0+np.arange(H)[:,None]/S<172)
yy2,xx2=np.mgrid[0:H,0:W]/S;dome=np.sqrt(np.clip(1-((xx2-180)/150)**2-((yy2-150)/92)**2,0,1))
fold=.5+.5*np.sin((xx2-180)/9+np.sin(yy2/14)*1.5)
vel=np.array([.55,.04,.08])[None,None,:]*(0.25+0.75*dome[...,None])*(0.75+0.35*fold[...,None])
vel+=np.array([.35,.15,.18])*(dome**6)[...,None]*.5
img.alpha_composite(Image.fromarray(np.dstack([np.clip(vel,0,1)*255,cap*255]).astype(np.uint8)))
img.alpha_composite(Image.fromarray(shade(hb,back,strength=10,tint=GOLD*.55,rough=.004,seed=3)))
img.alpha_composite(Image.fromarray(shade(hf,front,strength=14,rough=.003,seed=4)))
# gem settings (raised bezels) + gems + pearls
for (gx,gy,r,c,seed) in [(180,201,15,(205,20,30),1),(108,201,10,(20,90,190),2),(252,201,10,(20,90,190),3),(36,201,8,(20,140,70),4),(324,201,8,(20,140,70),5),
                          (180,120,10,(205,20,30),6),(108,140,7,(20,90,190),7),(252,140,7,(20,90,190),8)]:
  bz=ell(gx,gy,r+4,r+4)&~ell(gx,gy,r,r);hb2=bevel(ell(gx,gy,r+4,r+4),3*S)
  img.alpha_composite(Image.fromarray(shade(hb2,ell(gx,gy,r+4,r+4),strength=12,seed=seed)))
  paste(img,gem(2*r*S,c,seed=seed,facets=12),gx*S,gy*S)
for cx,top,half in TIPS: paste(img,pearl((13 if half<40 else 17)*S),cx*S,(top-4)*S)
img=img.resize((W//S,H//S),Image.LANCZOS)
# curve the crown like a ring (rows bow down toward the center front)
a=np.array(img).astype(float);hh,w=a.shape[:2];xs=np.arange(w)
pad=16;a=np.concatenate([a,np.zeros((pad,w,4))],0)
bow=(1-((xs-w/2)/(w/2))**2)*14
Y,X=np.mgrid[0:hh+pad,0:w].astype(float);Ys=Y-bow[None,:]
out=np.dstack([nd.map_coordinates(a[...,k],[Ys,X],order=1,mode='constant') for k in range(4)]).clip(0,255).astype(np.uint8)
# soften the far sides (they turn away from the viewer)
sidedark=1-0.42*(np.abs(xs-w/2)/(w/2))**2.2
out[...,:3]=(out[...,:3]*sidedark[None,:,None]).astype(np.uint8)
Image.fromarray(out).save('crown2.png')
o=Image.fromarray(out);bg=Image.new('RGBA',o.size,(30,30,38,255));bg.alpha_composite(o);bg.convert('RGB').resize((o.width*2,o.height*2)).save('crown2_chk.png')
