import onnxruntime as ort,numpy as np
from PIL import Image,ImageDraw,ImageFilter,ImageEnhance
src=Image.open('/mnt/user-data/uploads/093e1106-image.png').convert('RGB')
crop=src.crop((90,0,830,880))   # figure only (no close-up face panel)
sess=ort.InferenceSession('/tmp/u2net.onnx',providers=['CPUExecutionProvider'])
x=np.array(crop.resize((1024,1024),Image.LANCZOS)).astype(np.float32)/255-.5
o=sess.run(None,{sess.get_inputs()[0].name:x.transpose(2,0,1)[None]})[0][0,0];o=(o-o.min())/(o.max()-o.min())
mask=Image.fromarray((o*255).astype(np.uint8)).resize(crop.size,Image.LANCZOS)
cut=crop.copy();cut.putalpha(mask)
# warm, punchy grade like the others
rgb=ImageEnhance.Contrast(cut.convert('RGB')).enhance(1.2);rgb=ImageEnhance.Color(rgb).enhance(1.15)
r,g,b=rgb.split();r=r.point(lambda v:min(255,int(v*1.05)));b=b.point(lambda v:int(v*.95));rgb=Image.merge('RGB',(r,g,b));rgb.putalpha(mask)
W,H=500,600
bg=Image.new('RGB',(W,H),(20,13,8));d=ImageDraw.Draw(bg)
gl=Image.new('L',(W,H),0);ImageDraw.Draw(gl).ellipse((40,60,460,560),fill=110);gl=gl.filter(ImageFilter.GaussianBlur(70))
bg=Image.composite(Image.new('RGB',(W,H),(90,55,20)),bg,gl)
# gold back-frame like the other cards
fr=Image.new('RGBA',(W,H),(0,0,0,0));fd=ImageDraw.Draw(fr)
fd.rounded_rectangle((40,40,W-40,H+40),24,outline=(232,185,91,255),width=3)
fd.rounded_rectangle((50,50,W-50,H+40),18,outline=(90,60,25,200),width=2)
glow=fr.filter(ImageFilter.GaussianBlur(8));bg=bg.convert('RGBA');bg.alpha_composite(glow);bg.alpha_composite(fr)
# place her: head near top, chest-up, centred
s=1.45;fig=rgb.resize((int(crop.width*s),int(crop.height*s)),Image.LANCZOS)
headx,heady=int((470-90)*s),int(95*s)       # her face in crop coords
bg.alpha_composite(fig,(W//2-headx-10,165-heady))
v=Image.new('L',(W,H),0);ImageDraw.Draw(v).rectangle((0,0,W,H),fill=0);vg=Image.radial_gradient('L').resize((W,H))
dark=Image.new('RGBA',(W,H),(0,0,0,0));dark.putalpha(vg.point(lambda p:int(max(0,p-120)*0.9)))
bg.alpha_composite(dark)
out=bg.convert('RGB').resize((250,300),Image.LANCZOS)
out.save('/home/claude/king-of-the-jungle/game/assets/characters/portraits/leopard.jpg',quality=92)
o2=Image.new('RGB',(1000,300))
for i,c in enumerate(['jaguar','hyena','tiger','leopard']):o2.paste(Image.open(f'/home/claude/king-of-the-jungle/game/assets/characters/portraits/{c}.jpg'),(i*250,0))
o2.save('/tmp/nc/por.png')
