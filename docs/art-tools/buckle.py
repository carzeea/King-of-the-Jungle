import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
from scipy import ndimage as nd
from metal import *
S=4;R=48;W=H=2*R*S   # disc rendered big then scaled to the buckle face
yy,xx=np.mgrid[0:H,0:W]/S-R
rr=np.hypot(xx,yy)
disc=rr<=R-0.5
# raised dome with a recessed ring near the edge
h=np.sqrt(np.clip(1-(rr/R)**2,0,1))*.35
h-=.18*np.exp(-((rr-(R-7))/1.6)**2)
# the J: bold serif, raised with a rounded bevel
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',int(62*S))
m=Image.new('L',(W,H));d=ImageDraw.Draw(m);bb=d.textbbox((0,0),'J',font=font)
d.text(((W-(bb[2]-bb[0]))/2-bb[0]+2*S,(H-(bb[3]-bb[1]))/2-bb[1]+1*S),'J',font=font,fill=255)
J=np.array(m)>0
h+=bevel(J,3.2*S)*.7
h=nd.gaussian_filter(h,.6*S)
rgba=shade(h,disc,strength=16,rough=.002,seed=9)
# deepen the field around the J slightly so the letter pops
field=disc&~nd.binary_dilation(J,iterations=2*S)
rgba[...,:3]=np.where(field[...,None],(rgba[...,:3]*.82).astype(np.uint8),rgba[...,:3])
Image.fromarray(rgba).resize((2*R*2,2*R*2),Image.LANCZOS).save('buckle_J.png')
bg=Image.new('RGBA',(4*R,4*R),(30,30,38,255));bg.alpha_composite(Image.open('buckle_J.png'));bg.convert('RGB').resize((8*R,8*R)).save('buckle_J_chk.png')
