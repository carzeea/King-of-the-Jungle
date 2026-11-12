"""Phone-size fighter sheets: frames-md/ = HD frames scaled (<= K) and packed in grids <= 4096 x 4096 px,
identical HD sheets shared. Writes game/js/sprites-md.js:
SPRITES_MD[fid] = {s, anims:{anim:[n,fw,fh,px,py,cols,kRel]}, files:{anim:file}}; draw scale = s*kRel."""
import json,os,hashlib,math,shutil
from PIL import Image
from concurrent.futures import ProcessPoolExecutor
Image.MAX_IMAGE_PIXELS=None
G='/home/claude/king-of-the-jungle/game';K=float(os.environ.get('K','0.55'));LIM=4096
KF={'majic':0.33,'hippo':0.45,'elephant':0.45}  # MAJIC's frames are ~2.7x bigger than everyone else's: keep his phone sheets small
ONLY=[x for x in os.environ.get('ONLY','').split(',') if x]
HD=json.loads(open(G+'/js/sprites-hd.js').read().split('=',1)[1].strip().rstrip(';'))
def fitK(n,fw,fh,fid=None):
  k=KF.get(fid,K)
  while k>0.15:
    w,h=round(fw*k),round(fh*k);cm=max(1,min(n,LIM//w));rows=math.ceil(n/cm)
    if cm*w<=LIM and rows*h<=LIM:return k
    k-=0.01
  return k
def one(job):
  fid,fname,meta=job;n,fw,fh,px,py=meta[:5];cols=meta[5] if len(meta)>5 else n
  k=fitK(n,fw,fh,fid);w,h=max(1,round(fw*k)),max(1,round(fh*k));cm=max(1,min(n,LIM//w));rows=math.ceil(n/cm)
  im=Image.open(f'{G}/assets/characters/{fid}/frames-hd/{fname}.webp').convert('RGBA')
  out=Image.new('RGBA',(cm*w,rows*h),(0,0,0,0))
  for i in range(n):
    sx,sy=(i%cols)*fw,(i//cols)*fh
    out.paste(im.crop((sx,sy,sx+fw,sy+fh)).resize((w,h),Image.LANCZOS),((i%cm)*w,(i//cm)*h))
  out.save(f'{G}/assets/characters/{fid}/frames-md/{fname}.webp',quality=84,method=4)
  return fid,fname,[n,w,h,px,py,cm,round(k/K,4)]
if __name__=='__main__':
  MD={};jobs=[]
  OLD=json.loads(open(G+'/js/sprites-md.js').read().split('SPRITES_MD=',1)[1].strip().rstrip(';')) if ONLY else {}
  for fid,v in HD.items():
    if ONLY and fid not in ONLY:MD[fid]=OLD[fid];continue
    d=f'{G}/assets/characters/{fid}/frames-md';shutil.rmtree(d,ignore_errors=True);os.makedirs(d)
    MD[fid]={'s':round(v['s']*K,5),'anims':{},'files':{}};seen={}
    for a,m in v['anims'].items():
      p=f'{G}/assets/characters/{fid}/frames-hd/{a}.webp'
      if not os.path.exists(p):continue
      key=hashlib.md5(open(p,'rb').read()).hexdigest()+json.dumps(m[:6])
      if key not in seen:seen[key]=a;jobs.append((fid,a,m))
      MD[fid]['files'][a]=seen[key]
  res={}
  with ProcessPoolExecutor(4) as ex:
    for fid,fname,m in ex.map(one,jobs):res[(fid,fname)]=m
  for fid in MD:
    if ONLY and fid not in ONLY:continue
    for a,f in MD[fid]['files'].items():MD[fid]['anims'][a]=res[(fid,f)]
  open(G+'/js/sprites-md.js','w').write('// Phone-size fighter frames (frames-md/): grids <= %d px, scale s*kRel; files maps shared sheets.\nconst SPRITES_MD=%s;\n'%(LIM,json.dumps(MD,separators=(',',':'))))
  print(len(jobs),'unique sheets')
