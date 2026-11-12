"""cut.py <id> <clip.mp4> -> game/audio/animal/<id>-roar.mp3 (loudest ~2.8s) and <id>-cry.mp3 (loudest ~1.3s)"""
import sys,subprocess,numpy as np,wave,os
fid,src=sys.argv[1],sys.argv[2];G='/home/claude/king-of-the-jungle/game/audio/animal';os.makedirs(G,exist_ok=True)
w=f'/tmp/sfx/{fid}.wav';subprocess.run(['ffmpeg','-loglevel','error','-y','-i',src,'-vn','-ac','1','-ar','22050',w],check=True)
r=wave.open(w);sr=r.getframerate();a=np.frombuffer(r.readframes(r.getnframes()),np.int16).astype(float)/32768
e=np.convolve(a**2,np.ones(sr//20)/(sr//20),'same')
def best(L):
  n=int(L*sr);c=np.convolve(e,np.ones(n),'valid');i=int(np.argmax(c));return i/sr
for name,L in [('roar',2.8),('cry',1.3)]:
  s=max(0,best(L)-.08);fo=L-.35
  subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',f'{s:.2f}','-t',f'{L:.2f}','-i',w,'-af',f'afade=t=in:d=0.04,afade=t=out:st={fo:.2f}:d=0.35,loudnorm=I=-14:TP=-1','-ar','44100','-b:a','128k',f'{G}/{fid}-{name}.mp3'],check=True)
print(fid,'peak rms',round(float(np.sqrt(e.max())),3))
