'use strict';
// Free in-fight colorways: recolours a fighter's own armour cloth / metal on every animation frame.
// Each fighter has hue zones measured from their sprites, so fur, skin and feathers keep their colours.
(function(){
const ZONES={
 lion:{cloth:[346,7,.68,.16]},
 tiger:{cloth:[188,252,.3,.1]},
 jaguar:{cloth:[138,196,.28,.1]},
 leopard:{cloth:[232,300,.22,.1]},
 wolf:{cloth:[192,256,.28,.08],metal:[32,62,.42,.42]},
 hyena:{cloth:[347,6,.74,.16]},
 grizzly:{cloth:[346,8,.68,.14]},
 hippo:{cloth:[192,256,.28,.08],metal:[32,62,.48,.5]},
 badger:{metal:[28,62,.42,.38]},
 elephant:{metal:[28,62,.42,.42]},
 eagle:{cloth:[192,256,.28,.08]},
 majic:{cloth:[328,16,.5,.15]},
 crocodile:{cloth:[82,170,.16,.05],metal:[30,46,.5,.5]},
 snake:{cloth:[72,170,.22,.08]},
 stag:{metal:[32,54,.5,.55]}};
const hex2hsv=h=>{h=h.replace('#','');const n=parseInt(h,16),r=((n>>16)&255)/255,g=((n>>8)&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let H=0;if(d){if(mx===r)H=((g-b)/d)%6;else if(mx===g)H=(b-r)/d+2;else H=(r-g)/d+4;H*=60;if(H<0)H+=360}return[H,mx?d/mx:0,mx]};
const sm=(x,a,b)=>{let t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t)};
function hueW(h,a,b){let d;if(a<=b)d=Math.max(a-h,h-b);else d=(h>=a||h<=b)?-1:Math.min(a-h,h-b);const w=1-d/10;return w<0?0:w>1?1:w}
// recolour pixels in place. targets: {cloth:'#hex', metal:'#hex'}
function apply(data,fid,targets){
 const Z=ZONES[fid];if(!Z||!targets)return false;
 const act=[];for(const k in Z)if(targets[k]){const [a,b,smin,vmin]=Z[k];act.push({a,b,smin,vmin,t:hex2hsv(targets[k])})}
 if(!act.length)return false;
 for(let p=0;p<data.length;p+=4){
  if(data[p+3]<8)continue;
  const r=data[p]/255,g=data[p+1]/255,bl=data[p+2]/255,mx=r>g?(r>bl?r:bl):(g>bl?g:bl),mn=r<g?(r<bl?r:bl):(g<bl?g:bl),d=mx-mn;
  if(d<.03)continue;const s=d/mx;if(s<.06)continue;
  let h;if(mx===r)h=((g-bl)/d)%6;else if(mx===g)h=(bl-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;
  for(const z of act){
   const w=hueW(h,z.a,z.b);if(!w)continue;const ww=w*sm(s,z.smin-.12,z.smin)*sm(mx,z.vmin-.06,z.vmin);if(ww<.01)continue;
   const ns=Math.min(1,z.t[1]*(.55+.45*s)),nv=Math.min(1,mx*(.3+1.05*z.t[2])),hh=z.t[0]/60,i=Math.floor(hh)%6,f=hh-Math.floor(hh),P=nv*(1-ns),Q=nv*(1-ns*f),T=nv*(1-ns*(1-f));
   const R=[nv,Q,P,P,T,nv][i],G=[T,nv,nv,Q,P,P][i],B=[P,P,T,nv,nv,Q][i];
   data[p]=(r*(1-ww)+R*ww)*255;data[p+1]=(g*(1-ww)+G*ww)*255;data[p+2]=(bl*(1-ww)+B*ww)*255;break;
  }
 }
 return true;
}
// per-frame cache (least-recently-used, capped by pixel count so phones stay light)
const cache=new Map();let px=0;const BUDGET=26e6;
const sig=t=>(t.cloth||'')+(t.metal||'');
function frame(fid,img,sx,sy,w,h,targets){
 const key=fid+'|'+img.src+'|'+sx+'|'+sy+'|'+sig(targets);let c=cache.get(key);
 if(c){cache.delete(key);cache.set(key,c);return c}
 c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,sx,sy,w,h,0,0,w,h);
 try{const id=x.getImageData(0,0,w,h);apply(id.data,fid,targets);x.putImageData(id,0,0)}catch(_){return null}
 cache.set(key,c);px+=w*h;
 while(px>BUDGET&&cache.size>1){const [k,v]=cache.entries().next().value;cache.delete(k);px-=v.width*v.height}
 return c;
}
// Hook the fight canvas: drawSprite marks which sheet belongs to a recoloured (human) fighter.
function install(){
 const cv=document.getElementById('game-canvas');if(!cv)return;const ctx=cv.getContext('2d');if(ctx.__tintHooked)return;ctx.__tintHooked=true;
 const raw=ctx.drawImage.bind(ctx);
 ctx.drawImage=function(im){
  const T=window.__tintSrc;
  if(T&&im===T.img&&arguments.length===9){const fc=frame(T.fid,im,arguments[1],arguments[2],arguments[3],arguments[4],T.targets);if(fc)return raw(fc,0,0,arguments[3],arguments[4],arguments[5],arguments[6],arguments[7],arguments[8])}
  return raw.apply(null,arguments);
 };
}
const zonesFor=fid=>Object.keys(ZONES[fid]||{});
window.KOTJ_TINT={ZONES,zonesFor,apply,frame,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
