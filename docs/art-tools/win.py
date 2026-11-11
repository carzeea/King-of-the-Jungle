import sys,subprocess,tempfile,glob,numpy as np,shutil
from PIL import Image
v,maxlen=sys.argv[1],int(sys.argv[2])
t=tempfile.mkdtemp();subprocess.run(['ffmpeg','-loglevel','error','-i',v,'-vf','scale=240:-2',f'{t}/%04d.png'])
M=[]
for p in sorted(glob.glob(t+'/*.png')):
  a=np.array(Image.open(p).convert('RGB')).astype(int);M.append((a[...,1]-np.maximum(a[...,0],a[...,2]))<40)
shutil.rmtree(t)
e=np.array([0]+[np.abs(M[i].astype(float)-M[i-1]).mean() for i in range(1,len(M))]);e=np.convolve(e,np.ones(5)/5,'same')
act=np.where(e>e.max()*.15)[0];s=max(0,int(act[0])-6);t2=min(len(M),int(act[-1])+8)
if t2-s>maxlen:
  p=int(np.argmax(e));s=max(s,p-int(maxlen*.45));t2=min(len(M),s+maxlen)
print(s,t2)
