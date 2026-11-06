import numpy as np,sys
from PIL import Image,ImageFilter,ImageDraw
lion=Image.open('lion_cut.png').convert('RGBA')
# --- belt: replace the medallion face with the J disc
cx,cy,rx,ry=557,596,33,38
J=Image.open('buckle_J.png').resize((2*rx,2*ry),Image.LANCZOS)
# warm it to the painting's palette
a=np.array(J).astype(float);a[...,0]*=1.04;a[...,2]*=.9;J=Image.fromarray(a.clip(0,255).astype(np.uint8))
m=Image.new('L',(2*rx,2*ry));ImageDraw.Draw(m).ellipse((0,0,2*rx-1,2*ry-1),fill=255);m=m.filter(ImageFilter.GaussianBlur(1.2))
J.putalpha(Image.fromarray(np.minimum(np.array(J.getchannel('A')),np.array(m))))
# inner shadow ring so it sits inside the original gold frame
sh=Image.new('RGBA',(2*rx+8,2*ry+8));ImageDraw.Draw(sh).ellipse((2,2,2*rx+6,2*ry+6),fill=(40,20,0,150));sh=sh.filter(ImageFilter.GaussianBlur(3))
lion.alpha_composite(sh,(cx-rx-4,cy-ry-2));lion.alpha_composite(J,(cx-rx,cy-ry))
# --- crown
CX,CY,WID,ANG=map(float,sys.argv[1:5])
cr=Image.open('crown2.png');cr=cr.resize((int(WID),round(WID*cr.height/cr.width)),Image.LANCZOS).rotate(-ANG,expand=True,resample=Image.BICUBIC)
pad=60;canvas=Image.new('RGBA',(lion.width,lion.height+pad));canvas.alpha_composite(lion,(0,pad))
x=round(CX-cr.width/2);y=round(CY-cr.height/2)+pad
shadow=Image.new('RGBA',cr.size,(20,8,0,0));shadow.putalpha(cr.getchannel('A').point(lambda v:int(v*.6)));shadow=shadow.filter(ImageFilter.GaussianBlur(7))
canvas.alpha_composite(shadow,(x+5,y+12));canvas.alpha_composite(cr,(x,y))
canvas=canvas.crop(canvas.getbbox());canvas.save('lion_crowned2.png')
bg=Image.new('RGBA',canvas.size,(26,26,34,255));bg.alpha_composite(canvas)
bg.crop((420,0,canvas.width,300)).convert('RGB').resize((936,600)).save('chk_crown_on.png')
bg.crop((470,canvas.height-1222+520,650,canvas.height-1222+680)).convert('RGB').resize((540,480)).save('chk_belt.png')
print(canvas.size)
