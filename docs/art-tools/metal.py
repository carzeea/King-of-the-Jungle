# Physically-styled gold renderer: heightmap -> normals -> lighting with environment reflection.
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
from scipy import ndimage as nd
GOLD=np.array([1.0,0.66,0.22])
def bevel(mask,width):
  d=nd.distance_transform_edt(mask);return np.sin(np.clip(d/width,0,1)*np.pi/2)
def shade(h,mask,strength=6.0,light=(-0.45,-0.6,0.66),tint=GOLD,rough=0.0,seed=1,env_bias=0.0):
  rng=np.random.default_rng(seed)
  if rough: h=h+nd.gaussian_filter(rng.standard_normal(h.shape),1.2)*rough
  gy,gx=np.gradient(h*strength)
  n=np.dstack([-gx,-gy,np.ones_like(h)]);n/=np.linalg.norm(n,axis=2,keepdims=True)
  L=np.array(light,float);L/=np.linalg.norm(L);V=np.array([0,0,1.0]);Hh=(L+V)/np.linalg.norm(L+V)
  ndl=np.clip(n@L,0,1);ndh=np.clip(n@Hh,0,1)
  # environment: reflection y picks a warm sky (bright) / dark ground horizon band
  r=2*n[...,2:3]*n-V; ry=r[...,1]+env_bias
  env=np.interp(ry,[-1,-.55,-.25,-.05,.08,.3,.6,1],[1.35,1.2,1.0,.62,.26,.3,.5,.12])
  spec=ndh**60*1.6+ndh**8*.25
  col=tint[None,None,:]*(0.06+0.35*ndl[...,None]+0.95*env[...,None])+spec[...,None]*np.array([1,.95,.8])
  ao=nd.gaussian_filter(h,4);col*= (0.75+0.25*np.clip(ao*1.4,0,1))[...,None]
  rgba=np.dstack([np.clip(col,0,1)*255,mask*255]).astype(np.uint8);return rgba
def gem(size,color,seed=0,facets=10):
  s=size;y,x=np.mgrid[-1:1:s*1j,-1:1:s*1j];rr=np.hypot(x,y);ang=np.arctan2(y,x)
  m=rr<=1;f=np.floor((ang+np.pi)/(2*np.pi)*facets);ring=(rr>.55)
  rng=np.random.default_rng(seed);fv=rng.uniform(.35,1.0,facets+1);tv=rng.uniform(.6,1.0,facets+1)
  b=np.where(ring,fv[f.astype(int)],tv[f.astype(int)]*.9+.1*(1-rr))
  c=np.array(color)/255;col=c[None,None,:]*(0.25+0.95*b[...,None])
  glint=np.exp(-((x+.35)**2+(y+.4)**2)/.02)*1.2+np.exp(-((x-.3)**2+(y-.25)**2)/.05)*.25
  col=col+glint[...,None];edge=np.clip((1-rr)*s/2.5,0,1)
  col*=(0.55+0.45*edge)[...,None]
  return np.dstack([np.clip(col,0,1)*255,m*255]).astype(np.uint8)
def pearl(size):
  s=size;y,x=np.mgrid[-1:1:s*1j,-1:1:s*1j];rr=np.hypot(x,y);m=rr<=1;z=np.sqrt(np.clip(1-rr**2,0,1))
  L=np.array([-.5,-.6,.62]);L/=np.linalg.norm(L);ndl=np.clip(-x*L[0]*-1+(-y)*-L[1]*-1+z*L[2],0,1)
  ndl=np.clip(x*L[0]+y*L[1]+z*L[2],0,1)
  base=np.array([.95,.92,.88]);col=base*(0.35+0.6*ndl[...,None])+np.array([.25,.12,.18])*(1-z)[...,None]*.6
  col+=(np.clip(ndl,0,1)**40*.9)[...,None]
  return np.dstack([np.clip(col,0,1)*255,m*255]).astype(np.uint8)
def paste(dst,src,cx,cy):
  s=Image.fromarray(src);dst.alpha_composite(s,(int(cx-s.width/2),int(cy-s.height/2)))
