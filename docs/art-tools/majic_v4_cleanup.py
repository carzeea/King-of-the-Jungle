import json,numpy as np,scipy.ndimage as nd
from PIL import Image
t=json.load(open('/tmp/nc/t4.json'))['majic']
for folder in ('frames-hd','frames'):
  for name,sp in t[folder].items():
    p=f'game/assets/characters/majic/{folder}/{name}.webp';a=np.array(Image.open(p).convert('RGBA'));n=sp[0];W=a.shape[1]//n
    for i in range(n):
      f=a[:,i*W:(i+1)*W];m=f[...,3]>30;lab,k=nd.label(nd.binary_dilation(m,iterations=2))
      if k<2:continue
      sz=nd.sum(m,lab,range(1,k+1));big=int(np.argmax(sz))+1;bs=nd.find_objects(lab)[big-1]
      for j,sl in enumerate(nd.find_objects(lab),1):
        if j==big:continue
        behind=sl[1].stop<bs[1].start+(bs[1].stop-bs[1].start)*.25
        if behind or sz[j-1]<sz.max()*.02:f[lab==j,3]=0
    Image.fromarray(a,'RGBA').save(p,'WEBP',quality=88,method=6)
print('ok')
