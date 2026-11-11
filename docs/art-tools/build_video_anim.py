"""Turn a green-screen video loop into game sprite sheets (HD + low) for one fighter animation.
usage: build_video_anim.py <fighter> <anim> <frames_dir> <start> <count> <target_height_units> [reverse_name]"""
import sys,glob,json,re,numpy as np
from PIL import Image
fid,anim,fdir,start,count,TH=sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4]),int(sys.argv[5]),float(sys.argv[6])
rev=sys.argv[7] if len(sys.argv)>7 else None
G='/home/claude/king-of-the-jungle/game'
fs=sorted(glob.glob(fdir+'/*.png'))[start:start+count]
def key(p):
    a=np.array(Image.open(p).convert('RGB')).astype(np.float32);r,g,b=a[...,0],a[...,1],a[...,2]
    spill=g-np.maximum(r,b)
    al=np.clip(1-(spill-18)/50,0,1)            # soft matte: strong green -> transparent
    # despill: pull green down to the other channels on the edges
    g2=np.where(spill>0,np.maximum(r,b)+np.minimum(spill,0)*0,g);a[...,1]=np.minimum(g,g2+np.clip(spill,0,8))
    al[(a[...,0]+a[...,1]+a[...,2])<30]=al[(a[...,0]+a[...,1]+a[...,2])<30]  # keep dark shadows as-is
    out=np.dstack([a,al*255]).astype(np.uint8)
    # remove the floor shadow line: only keep the largest blob rows above the ground line
    return Image.fromarray(out,'RGBA')
K=[key(p) for p in fs]
A=[np.array(k)[...,3]>110 for k in K]
# drop the thin ground shadow under the feet (wide, very short streak)
for i,a in enumerate(A):
    rows=np.where(a.any(1))[0];bottom=rows.max()
    # a ground line is a row much wider than the feet just above it
    for y in range(bottom,bottom-14,-1):
        if a[y].sum()>a[y-16].sum()*2.2:a[y]=False;arr=np.array(K[i]);arr[y,:,3]=0;K[i]=Image.fromarray(arr)
U=np.zeros_like(A[0])
for a in A:U|=a
ys=np.where(U.any(1))[0];xs=np.where(U.any(0))[0];y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
heights=[np.where(a.any(1))[0] for a in A];figH=np.median([h.max()-h.min() for h in heights])
# hip centre (40-70% band) for the anchor
cs=[]
for a in A:
    rows=np.where(a.any(1))[0];t,b=rows.min(),rows.max();band=a[int(t+(b-t)*.4):int(t+(b-t)*.7)]
    r=[np.where(x)[0] for x in band if x.any()];cs.append((np.median([c.min() for c in r])+np.median([c.max() for c in r]))/2)
hipX=float(np.median(cs));feetY=float(np.median([h.max() for h in heights]))
unit=figH/TH   # video pixels per game unit
pad=6;x0-=pad;x1+=pad;y0-=pad;y1=min(U.shape[0]-1,y1+2)
crops=[k.crop((x0,y0,x1+1,y1+1)) for k in K]
W,H=crops[0].size;px=(hipX-x0)/unit;py=(feetY-y0)/unit
hd_s,lo_s=2.0,0.6
res={}
for tag,s,folder in [('hd',hd_s,'frames-hd'),('lo',lo_s,'frames')]:
    fw,fh=round(W/unit*s),round(H/unit*s);n=len(crops)
    cols=n if n*fw<=16383 else (n+1)//2;rows=(n+cols-1)//cols
    def sheet(seq,name):
        st=Image.new('RGBA',(cols*fw,rows*fh))
        for i,c in enumerate(seq):st.paste(c.resize((fw,fh),Image.LANCZOS),((i%cols)*fw,(i//cols)*fh))
        st.save(f'{G}/assets/characters/{fid}/{folder}/{name}.webp','WEBP',quality=80,method=6,alpha_quality=90)
    sheet(crops,anim)
    if rev:sheet(crops[::-1],rev)
    meta=[n,fw,fh,round(px),round(py)]+([cols] if cols!=n else [])
    res[tag]=meta
json.dump(res,open(f'/tmp/ev/out/{fid}_{anim}.json','w'));print(res,'unit',round(unit,3),'figH',figH)
