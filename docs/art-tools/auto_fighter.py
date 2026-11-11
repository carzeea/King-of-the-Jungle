"""Cut a fighter's Kling clips into game animations automatically, build sheets and install them.
usage: auto_fighter.py <fighter> <clip_dir> <stand_units> [--dry]
Clip names in clip_dir: idle walk light heavy jump special hit knock victory block (.mp4)"""
import sys,os,glob,json,subprocess,tempfile,numpy as np
from PIL import Image
fid,cd,su=sys.argv[1],sys.argv[2],sys.argv[3];dry='--dry' in sys.argv
T=os.path.dirname(os.path.abspath(__file__))
def masks(v):
  t=tempfile.mkdtemp();subprocess.run(['ffmpeg','-loglevel','error','-i',v,'-vf','scale=240:-2',f'{t}/%04d.png'],check=True)
  M=[];F=[]
  for p in sorted(glob.glob(t+'/*.png')):
    a=np.array(Image.open(p).convert('RGB')).astype(np.int16);m=(a[...,1]-np.maximum(a[...,0],a[...,2]))<40
    M.append(m);F.append(a.astype(np.float32))
  import shutil;shutil.rmtree(t,ignore_errors=True)
  return M,F
def stats(M):
  d=np.array([np.abs(M[0].astype(float)-m).mean() for m in M])
  top=np.array([np.where(m.any(1))[0].min() if m.any() else 0 for m in M]);bot=np.array([np.where(m.any(1))[0].max() if m.any() else 0 for m in M])
  return d,top,bot
def runs(mask):
  r=[];s=None
  for i,x in enumerate(list(mask)+[False]):
    if x and s is None:s=i
    if not x and s is not None:r.append((s,i-1));s=None
  return r
def loop(F,lo,hi,a0=0):
  best=None
  for i in range(a0,len(F)):
    for j in range(i+lo,min(i+hi,len(F))):
      dd=np.abs(F[i]-F[j]).mean()
      if best is None or dd<best[0]:best=(dd,i,j)
  return best[1],best[2]
jobs=[]  # (jsonname, anims, start, end, step, frames, pingpong)
def clip(n):return f'{cd}/{n}.mp4'
# idle / walk loops
M,F=masks(clip('idle'));i,j=loop(F,40,100,10);jobs.append(('idle',['idle'],i,j,2,None))
M,F=masks(clip('walk'));i,j=loop(F,18,60,8);jobs.append(('walk',['walk_forward','walk_back','run'],i,j,1,None))
def energy(M):
  e=np.array([0]+[np.abs(M[i].astype(float)-M[i-1]).mean() for i in range(1,len(M))])
  return np.convolve(e,np.ones(5)/5,'same')
def merge(R,gap=6):
  out=[]
  for r in R:
    if out and r[0]-out[-1][1]<=gap:out[-1]=(out[-1][0],r[1])
    else:out.append(r)
  return out
# light: first and last strike bursts
M,F=masks(clip('light'));e=energy(M)
R=[r for r in merge(runs(e>e.max()*.3)) if r[1]-r[0]>=2] or [(14,40)]
a,b=R[0];b=min(b,a+32);jobs.append(('light',['attack_light'],max(0,a-8),min(len(M),b+10),1,None))
a,b=R[-1] if len(R)>1 else (min(len(M)-30,R[0][1]+20),len(M)-1);a=max(a,b-32);jobs.append(('bite',['bite'],max(0,a-8),min(len(M),b+10),1,None))
def peakwin(n,maxlen,pre=8,post=8):
  M,F=masks(clip(n));e=energy(M);p=int(np.argmax(e));pk=e[p]
  s=p
  while s>0 and e[s]>pk*.15:s-=1
  t=p
  while t<len(e)-1 and not all(e[t:t+6]<pk*.12):t+=1
  s=max(0,s-pre);t=min(len(M),t+post)
  if t-s>maxlen:s=max(s,p-int(maxlen*.45));t=min(len(M),s+maxlen)
  return s,t
s,t=peakwin('heavy',56);jobs.append(('heavy',['attack_heavy','uppercut'],s,t,1,None))
s,t=peakwin('special',72);jobs.append(('special',['special_pounce','special_b'],s,t,1,None))
s,t=peakwin('hit',40,6,4);jobs.append(('hit',['hit_light','hit_heavy'],s,t,2,None))
# jump: airborne = feet above the floor; drop frames whose head touches the top edge
M,F=masks(clip('jump'));d,top,bot=stats(M);floor=np.median(bot[:8]);air=np.where(bot<floor-3)[0]
s,t=(max(0,int(air[0])-14),min(len(M)-1,int(air[-1])+12)) if len(air) else (50,110)
keep=[k for k in range(s,t+1) if top[k]>1];fr=[f'{a}-{b}' for a,b in runs([k in keep for k in range(len(M))])]
jobs.append(('jump',['jump'],s,t,1,','.join(fr)))
# knockdown: lying = figure height < 55% of standing; get-up starts near the end of the longest lying run
M,F=masks(clip('knock'));d,top,bot=stats(M);h=bot-top;stand=np.median(h[:6]);e=energy(M)
L=[r for r in runs(h<stand*.55) if r[1]-r[0]>4];s0=max(0,int(np.argmax(e>e.max()*.2))-8)
Lm=max(L,key=lambda r:r[1]-r[0]) if L else (int(len(M)*.3),int(len(M)*.6))
g=max(Lm[0]+6,Lm[1]-2)
jobs.append(('knock',['knockdown','defeat'],s0,g+1,2,None));jobs.append(('getup',['knockdown_getup'],g,len(M),2,None))
fall_n=(Lm[0]+8-s0)//2
# victory / block
M,F=masks(clip('victory'));d,top,bot=stats(M);act=np.where(d>d.max()*.2)[0];s=max(0,int(act[0])-8) if len(act) else 12
jobs.append(('victory',['victory'],s,len(M),2,None))
M,F=masks(clip('block'));d,top,bot=stats(M);act=np.where(d>d.max()*.3)[0];s=max(0,int(act[0])-6) if len(act) else 0
jobs.append(('block',['block'],s,min(len(M),s+34),2,None))
_have=json.loads(open('/home/claude/king-of-the-jungle/game/js/sprites-hd.js').read().split('=',1)[1].strip().rstrip(';'))[fid]['anims']
_extra={'special':['special_c','ultra_move','pounce','special_earth_slam','shadow_rampage'],'heavy':['special_d'],'walk':['dash'],'bite':['claw_swipe']}
jobs=[(n,a+[x for x in _extra.get(n,[]) if x in _have],s_,e_,st,fr) for n,a,s_,e_,st,fr in jobs]
print(json.dumps(jobs))
if dry:sys.exit()
out=f'/tmp/build_{fid}';os.makedirs(out,exist_ok=True)
for f in glob.glob(out+'/*.json'):os.remove(f)
G='/home/claude/king-of-the-jungle/game'
procs=[]
for name,anims,s,e,st,fr in jobs:
  env=dict(os.environ)
  if fr:env['FRAMES']=fr
  cmd=['python3',f'{T}/build_kling_anim.py',fid,anims[0],clip({'bite':'light','getup':'knock'}.get(name,name)),str(s),str(e),str(st),su]+anims[1:]
  procs.append((name,anims,subprocess.Popen(cmd,cwd=G,env=env,stdout=subprocess.PIPE,text=True)))
  if len(procs)%5==0:[p.wait() for *_,p in procs]
for name,anims,p in procs:
  o=p.communicate()[0].strip().splitlines()[-1];e=json.loads(o);e['anims']=anims;json.dump(e,open(f'{out}/{name}.json','w'))
kn=json.load(open(f'{out}/knock.json'))['hd'][0];gu=json.load(open(f'{out}/getup.json'))['hd'][0]
fall_n=max(4,min(fall_n+6,kn))
subprocess.run(['python3',f'{T}/install_anims.py',fid,out,'{"idle":12,"knockdown":20,"victory":12,"hit":36,"block":40}',str(fall_n),str(gu),str(kn-1)],check=True)
