import sys,os,json,subprocess,glob
G='/home/claude/king-of-the-jungle/game';T='/home/claude/king-of-the-jungle/docs/art-tools'
SU=dict(badger=205,crocodile=255,elephant=328,grizzly=306,hippo=314,hyena=238,jaguar=244,leopard=250,lion=260,tiger=262,wolf=242,majic=386,snake=268,eagle=255,stag=278,dolphin=285)
clips=sys.argv[1:]  # paths like /tmp/sx/v/leopard_sx1.mp4
byf={}
for c in clips:
  n=os.path.basename(c)[:-4];fid,an=n.rsplit('_',1)
  s,e=subprocess.run(['python3','/home/claude/king-of-the-jungle/docs/art-tools/win.py',c,'76'],capture_output=True,text=True).stdout.split()
  r=subprocess.run(['python3',f'{T}/build_kling_anim.py',fid,an,c,s,e,'1',str(SU[fid])],cwd=G,capture_output=True,text=True)
  try:j=json.loads(r.stdout.strip().splitlines()[-1])
  except Exception:print('FAIL',n,r.stderr[-400:]);continue
  j['anims']=[an];d=f'/tmp/sx/j/{fid}';os.makedirs(d,exist_ok=True);json.dump(j,open(f'{d}/{an}.json','w'));byf.setdefault(fid,[]).append(an);print(n,s,e,'ok',flush=True)
for fid in byf:print(subprocess.run(['python3',f'{T}/install_anims.py',fid,f'/tmp/sx/j/{fid}','-','-1','0','0'],capture_output=True,text=True).stdout.strip())
