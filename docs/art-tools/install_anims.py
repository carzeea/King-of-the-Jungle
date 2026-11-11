"""Install converter output (JSON files from build_kling_anim.py) into sprites-hd.js and game.js.
usage: install_anims.py <fighter> <json_dir> <vfps_json> <fall_n> <getup_n> <ko_frame>
Each <name>.json in json_dir must hold {"anims":[...game anim names...],"hd":[...],"lo":[...]};
vfps_json e.g. '{"idle":12,"knockdown":20,"victory":12,"hit":36,"block":40}'."""
import sys,json,glob,os,re
fid,jd,vf=sys.argv[1],sys.argv[2],json.loads(sys.argv[3]);fall_n,getup_n,ko=int(sys.argv[4]),int(sys.argv[5]),int(sys.argv[6])
G='/home/claude/king-of-the-jungle/game/js/'
E=[json.load(open(p)) for p in glob.glob(jd+'/*.json')]
s=open(G+'sprites-hd.js').read();pre,js=s.split('=',1);d=json.loads(js.strip().rstrip(';'))
for e in E:
  for a in e['anims']: d[fid]['anims'][a]=e['hd']
open(G+'sprites-hd.js','w').write(pre+'='+json.dumps(d,separators=(',',':'))+';\n')
g=open(G+'game.js').read()
i=g.index(f' {fid}:{{s:0.6,anims:');a0=g.index('{',g.index('anims:',i));dep=0
for j in range(a0,len(g)):
  dep+=g[j]=='{';dep-=g[j]=='}'
  if dep==0:break
an=json.loads(g[a0:j+1])
for e in E:
  for a in e['anims']: an[a]=e['lo']
g=g[:a0]+json.dumps(an,separators=(',',':'))+g[j+1:]
# fall / getup / ko for this fighter (first occurrence after its table)
k=g.index('fall:[',a0)
end=g.index('}',g.index('ko:[',k))
g=g[:k]+("fall:['knockdown',%s],getup:['knockdown_getup',%s],ko:['knockdown',%d]"%(list(range(fall_n)),list(range(getup_n)),ko)).replace(' ','')+g[end:]
# VFPS
m=re.search(r'const VFPS=(\{.*?\}\});',g);V=json.loads(re.sub(r'(\w+):',r'"\1":',m.group(1)))
V[fid]=vf;g=g[:m.start(1)]+json.dumps(V,separators=(',',':')).replace('"','')+';'+g[m.end():]
# drop SPRITE_X2 flags for replaced anims
m=re.search(r'const SPRITE_X2=(\{.*?\}\});',g);X=json.loads(m.group(1))
for e in E:
  for a in e['anims']: X.get(fid,{}).pop(a,None)
g=g[:m.start(1)]+json.dumps(X,separators=(',',':'))+';'+g[m.end():]
open(G+'game.js','w').write(g);print('installed',fid,sorted(a for e in E for a in e['anims']))
