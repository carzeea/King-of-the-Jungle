import sys,onnxruntime as ort,numpy as np
from PIL import Image,ImageDraw,ImageFilter,ImageEnhance
sess=ort.InferenceSession('/tmp/u2net.onnx',providers=['CPUExecutionProvider'])
U='/mnt/user-data/uploads/'
C={'snake':dict(f=U+'ecfac112-image.jpg',fig=(0,0,700,1033),face=(470,140),belt=(500,725),bg=(600,230,1080,640)),
   'stag': dict(f=U+'4563bb55-image.jpg',fig=(0,20,640,1211),face=(403,242),belt=(497,699),bg=(600,230,1080,650),span=375,fy=190),
   'eagle':dict(dx=95,f=U+'4ecefc2d-image.jpg',fig=(0,20,880,1037),notext=(650,560),face=(564,180),belt=(588,720),bg=(880,250,1080,650))}
def card(cid):
  c=C[cid];src=Image.open(c['f']).convert('RGB')
  if cid in ('eagle','snake'):   # paint out the 'THE EAGLE / THE SKY REAPER' lettering so the wing stays whole
    import cv2,scipy.ndimage as nd
    a=np.array(src);r,g,b=[a[...,k].astype(int) for k in range(3)]
    txt=np.zeros(r.shape,bool);reg=np.zeros(r.shape,bool);reg[660:900,620:1060]=True
    if cid=='snake':reg[:]=False;reg[640:930,680:1060]=True
    txt[reg]=(((r>200)&(g>150)&(b<120))|((r>200)&(g>200)&(b>200)))[reg]
    txt=nd.binary_dilation(txt,iterations=4)
    a=cv2.inpaint(a,txt.astype(np.uint8)*255,7,cv2.INPAINT_TELEA);src=Image.fromarray(a)
    src.crop((560,600,1080,940)).save('/tmp/nc/eagle_inpaint.png')
  x0,y0,x1,y1=c['fig'];crop=src.crop(c['fig'])
  x=np.array(crop.resize((1024,1024),Image.LANCZOS)).astype(np.float32)/255-.5
  o=sess.run(None,{sess.get_inputs()[0].name:x.transpose(2,0,1)[None]})[0][0,0];o=(o-o.min())/(o.max()-o.min())
  mask=Image.fromarray((o*255).astype(np.uint8)).resize(crop.size,Image.LANCZOS)
  if cid=='snake':   # his shaded right arm, which the cut-out tool treats as background
    am=Image.new('L',crop.size,0);ImageDraw.Draw(am).polygon([(540,405),(598,418),(626,470),(634,560),(655,600),(660,690),(600,700),(560,690),(540,560)],fill=255)
    am=np.array(am.filter(ImageFilter.GaussianBlur(3)));cc=np.array(crop).astype(int)
    notgreen=~((cc[...,1]>cc[...,0]+12)&(cc[...,1]>cc[...,2]))
    mm=np.maximum(np.array(mask),(am*notgreen).astype(np.uint8))
    lift=Image.fromarray(np.clip(cc*1.0,0,255).astype(np.uint8));lift=ImageEnhance.Brightness(lift).enhance(1.7)
    crop=Image.composite(lift,crop,Image.fromarray((am*notgreen*.85).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)))
    mm[640:,682:]=0;mm[700:,585:]=0;mm[845:,520:]=0;mask=Image.fromarray(mm).filter(ImageFilter.GaussianBlur(1))
  if cid=='eagle':
    mm=np.array(mask);mm[742-c['fig'][1]:,770-c['fig'][0]:]=0;mask=Image.fromarray(mm).filter(ImageFilter.GaussianBlur(1.5))
  if 'notext' in c:   # title lettering next to the fighter
    import scipy.ndimage as nd
    m=np.array(mask);tx,ty=c['notext'];lab,n=nd.label(m>60)
    for j,sl in enumerate(nd.find_objects(lab),1):
      if sl[1].start>=tx-x0-40 and sl[0].start>=ty-y0-40: m[lab==j]=0
    mask=Image.fromarray(m).filter(ImageFilter.GaussianBlur(1))
  rgb=ImageEnhance.Contrast(crop).enhance(1.12);rgb=ImageEnhance.Color(rgb).enhance(1.1);rgb.putalpha(mask)
  W,H=500,600
  scene=src.crop(c['bg']).resize((W,H),Image.LANCZOS).filter(ImageFilter.GaussianBlur(9))
  scene=ImageEnhance.Brightness(scene).enhance(.45);bg=scene.convert('RGBA')
  fr=Image.new('RGBA',(W,H),(0,0,0,0));box=(14,50,W-14,H+30);ImageDraw.Draw(fr).rectangle(box,outline=(255,160,40,255),width=10)
  g1=fr.filter(ImageFilter.GaussianBlur(14));g2=fr.filter(ImageFilter.GaussianBlur(5))
  for _ in range(4):bg.alpha_composite(g1)
  bg.alpha_composite(g2);bg.alpha_composite(g2);bg.alpha_composite(fr)
  core=Image.new('RGBA',(W,H),(0,0,0,0));ImageDraw.Draw(core).rectangle(box,outline=(255,225,140,255),width=4);bg.alpha_composite(core)
  fx,fy=c['face'][0]-x0,c['face'][1]-y0;by=c['belt'][1]-y0
  s=c.get('span',395)/(by-fy);fig=rgb.resize((int(crop.width*s),int(crop.height*s)),Image.LANCZOS)
  bg.alpha_composite(fig,(int(W/2+c.get('dx',30)-fx*s),int(c.get('fy',105)-fy*s)))
  vg=Image.radial_gradient('L').resize((W,H));dark=Image.new('RGBA',(W,H),(0,0,0,0));dark.putalpha(vg.point(lambda p:int(max(0,p-120)*.9)));bg.alpha_composite(dark)
  return bg.convert('RGB').resize((250,300),Image.LANCZOS)
out=sys.argv[1]
for cid in C:card(cid).save(f'{out}/{cid}.jpg',quality=92)
