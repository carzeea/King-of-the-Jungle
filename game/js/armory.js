'use strict';
// THE JUNGLE ARMORY — outfits, colours, auras, Jungle Coins (TEST MODE), Item Shop and Locker.
// Everything here is cosmetic. Coins are test coins stored on this device until real payments are approved.
(function(){
const $=id=>document.getElementById(id);
const V='15.11';
const STORE_KEY='kotj.armory';
const BASE=[...(window.KOTJ_ROSTER||[])].map(f=>({id:f.id,name:f.name,color:f.color}));
const HIDDEN=[{id:'snake',name:'SNAKE'},{id:'eagle',name:'EAGLE'},{id:'stag',name:'STAG'},{id:'majic',name:'MAJIC'}];
const FIGHTERS=[...BASE,...HIDDEN];
const unlocked=()=>{try{return JSON.parse(localStorage.getItem('kotj.unlocked')||'[]')}catch(_){return[]}};
const isOpen=id=>!HIDDEN.some(h=>h.id===id)||unlocked().includes(id);
const fname=id=>(FIGHTERS.find(f=>f.id===id)||{name:id.toUpperCase()}).name;
const QUEEN=new Set(['leopard']);
const LOOKS=[
 {id:'original',name:'ORIGINAL',tag:'BATTLE DESIGN',price:0},
 {id:'royal',name:'ROYAL KING',tag:'WARRIOR',price:1500},
 {id:'street',name:'STREET KING',tag:'MODERN',price:1200},
 {id:'hybrid',name:'HYBRID CHAMPION',tag:'HYBRID',price:1800}];
const ON_HOLD=new Set(['royal','street','hybrid']);
const lookName=(fid,l)=>{const n=(LOOKS.find(x=>x.id===l)||LOOKS[0]).name;return QUEEN.has(fid)?n.replace('KING','QUEEN'):n};
const AURAS=[
 {id:'gold',name:'GOLDEN CROWN AURA',color:'#ffcf5a',price:800},
 {id:'frost',name:'FROST AURA',color:'#8fe8ff',price:800},
 {id:'ember',name:'EMBER AURA',color:'#ff6a2a',price:800},
 {id:'venom',name:'VENOM AURA',color:'#8fe04a',price:800},
 {id:'shadow',name:'SHADOW AURA',color:'#b48cff',price:1000},
 {id:'crimson',name:'ROYAL CRIMSON AURA',color:'#ff3d5a',price:1000}];
const CHANNELS=[{k:'primary',v:50,label:'PRIMARY'},{k:'trim',v:100,label:'TRIM'},{k:'shoes',v:150,label:'FOOTWEAR'},{k:'metal',v:200,label:'METAL'}];
const MATERIALS=['fabric','leather','metallic','glossy','matte'];
const PRESETS=['#ffd700','#d12a2a','#1f4fd1','#7a2fd1','#1f9e3a','#f4f4f4','#151515','#ff7a1a','#19c2c2','#c0c0c0'];
const PACKS=[{id:'starter',name:'STARTER',coins:500,price:4.99},{id:'fighter',name:'FIGHTER',coins:1200,price:9.99},{id:'champion',name:'CHAMPION',coins:2800,price:19.99},{id:'royal',name:'ROYAL',coins:5000,price:34.99},{id:'legendary',name:'LEGENDARY',coins:12000,price:79.99}];

// ---------- save data ----------
// COIN_SALES stays off until Square checkout is set up and the owner switches it on: no Buy Coins tab, no + button.
const COIN_SALES=false,WELCOME_BONUS=500;
const blank=()=>({coins:WELCOME_BONUS,owned:{},equipped:{},saved:{},presets:[],receipts:[],v:1,live:1,welcome:0});
let S=(()=>{try{const raw=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');return raw.live?Object.assign(blank(),raw):blank()}catch(_){return blank()}})(); // test-period wallets start over at launch
const save=()=>{try{localStorage.setItem(STORE_KEY,JSON.stringify(S))}catch(_){}};
const owns=key=>key.endsWith('.original')||(!ON_HOLD.has(key.split('.')[1])&&!!S.owned[key]);
const fmt=n=>n.toLocaleString('en-US');
const freshOutfit=look=>({look:look||'original',colors:{},materials:{},aura:null});
const equippedFor=fid=>{const o=S.equipped[fid];return o&&!ON_HOLD.has(o.look)?o:Object.assign(freshOutfit(),o&&o.look==='original'?o:{aura:o&&o.aura||null})};
const FIGHT_CH={cloth:'ARMOR CLOTH',metal:'ARMOR METAL'};
function fightColors(fid){const o=S.equipped[fid];if(!o||o.look!=='original'||!o.colors)return null;const z=window.KOTJ_TINT?KOTJ_TINT.zonesFor(fid):[];const t={};z.forEach(k=>{if(o.colors[k])t[k]=o.colors[k]});return Object.keys(t).length?t:null}
const origTargets=o=>{const t={};for(const k of ['cloth','metal'])if(o.colors&&o.colors[k])t[k]=o.colors[k];return Object.keys(t).length?t:null};

// ---------- image cache + recolour ----------
const IMG={},MASK={},MRES={};
const outfitSrc=(fid,look)=>look==='original'?`assets/ui/hero/${fid}.webp?v=10.16`:`assets/armory/${fid}/${look}.webp?v=${V}`;
function loadImg(src){if(IMG[src])return IMG[src];IMG[src]=new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});return IMG[src]}
async function loadMask(fid,look){
 const key=fid+'.'+look;if(MASK[key])return MASK[key];
 MASK[key]=(async()=>{
  const [img,m]=await Promise.all([loadImg(outfitSrc(fid,look)),loadImg(`assets/armory/${fid}/${look}-m.png?v=${V}`)]);
  const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(m,0,0,w,h);const md=x.getImageData(0,0,w,h).data;const region=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){const v=md[i*4];region[i]=v>225?0:Math.round(v/50)}
  x.clearRect(0,0,w,h);x.drawImage(img,0,0);const base=x.getImageData(0,0,w,h);
  const stats={};for(const ch of CHANNELS){const n=ch.v/50,L=[];for(let i=0;i<w*h;i+=3)if(region[i]===n&&base.data[i*4+3]>40){const p=i*4;L.push(.299*base.data[p]+.587*base.data[p+1]+.114*base.data[p+2])}
   L.sort((a,b)=>a-b);stats[ch.k]=L.length>200?{n:L.length,lo:L[Math.floor(L.length*.04)],hi:Math.max(L[Math.floor(L.length*.97)],L[Math.floor(L.length*.04)]+30)}:null}
  return MRES[key]={w,h,region,base,stats};
 })();
 return MASK[key];
}
const hex2rgb=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]};
const rgb2hex=(r,g,b)=>'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function hsv2rgb(h,s,v){const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1))};return[f(5)*255,f(3)*255,f(1)*255]}
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return[h,mx?d/mx:0,mx]}
// shade a chosen colour by the original pixel's light so folds, seams and highlights survive
function shade(c,t,mat){
 let k,spec=0;
 switch(mat){
  case'metallic':k=.12+1.15*Math.pow(t,1.5);spec=Math.max(0,t-.72)*2.6;break;
  case'glossy':k=.26+.86*t;spec=Math.max(0,t-.7)*2.0;break;
  case'leather':k=.2+.78*Math.pow(t,1.25);spec=Math.max(0,t-.85)*1.2;break;
  case'matte':k=.42+.55*t;break;
  default:k=.3+.84*t;
 }
 return[c[0]*k+255*spec,c[1]*k+255*spec,c[2]*k+255*spec];
}
async function renderOutfit(canvas,fid,o){
 const look=o.look||'original';
 if(look==='original'){const img=await loadImg(outfitSrc(fid,'original'));canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const x=canvas.getContext('2d',{willReadFrequently:true});x.clearRect(0,0,canvas.width,canvas.height);x.drawImage(img,0,0);const tg=origTargets(o);if(tg&&window.KOTJ_TINT){const d=x.getImageData(0,0,canvas.width,canvas.height);KOTJ_TINT.apply(d.data,fid,tg,canvas.width);x.putImageData(d,0,0)}return}
 const M=await loadMask(fid,look);canvas.width=M.w;canvas.height=M.h;const x=canvas.getContext('2d');
 const out=new ImageData(new Uint8ClampedArray(M.base.data),M.w,M.h),d=out.data,src=M.base.data;
 const act=CHANNELS.map(ch=>({n:ch.v/50,c:o.colors&&o.colors[ch.k]?hex2rgb(o.colors[ch.k]):null,m:(o.materials&&o.materials[ch.k])||'fabric',st:M.stats[ch.k]})).filter(a=>a.c&&a.st);
 if(act.length){const by=[];act.forEach(a=>by[a.n]=a);
  for(let i=0,n=M.w*M.h;i<n;i++){const a=by[M.region[i]];if(!a)continue;const p=i*4;if(!src[p+3])continue;
   const L=.299*src[p]+.587*src[p+1]+.114*src[p+2];const t=Math.max(0,Math.min(1.15,(L-a.st.lo)/(a.st.hi-a.st.lo)));
   const r=shade(a.c,t,a.m);d[p]=r[0];d[p+1]=r[1];d[p+2]=r[2]}}
 x.putImageData(out,0,0);
}
const thumbCache={};
async function outfitURL(fid,o,max=420){
 const key=fid+JSON.stringify(o)+max;if(thumbCache[key])return thumbCache[key];
 const c=document.createElement('canvas');await renderOutfit(c,fid,o);
 const s=Math.min(1,max/Math.max(c.width,c.height)),t=document.createElement('canvas');t.width=Math.round(c.width*s);t.height=Math.round(c.height*s);t.getContext('2d').drawImage(c,0,0,t.width,t.height);
 return thumbCache[key]=t.toDataURL('image/webp',.86);
}

// ---------- UI state ----------
let fid='lion',tab='wardrobe',chan='primary',cur=freshOutfit(),flip=false,anim='idle',spriteAnim=null;
const loadCurrent=()=>{const e=equippedFor(fid);cur=JSON.parse(JSON.stringify(e));if(!owns(fid+'.'+cur.look))cur=freshOutfit()};

function coinPills(){document.querySelectorAll('.jc-balance').forEach(el=>el.textContent=fmt(S.coins))}
function toast(msg){let t=$('arm-toast');t.textContent=msg;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),2200)}

function buildScreen(){
 let sec=$('armory');if(sec&&sec.dataset.built)return;
 if(!sec){sec=document.createElement('section');sec.id='armory';sec.className='screen hidden armory-screen';document.getElementById('app').appendChild(sec)}
 sec.dataset.built='1';
 sec.innerHTML=`
 <div class="arm-head"><div class="arm-title"><h2>THE JUNGLE ARMORY</h2><p>CLOTHING · CUSTOMIZATION · ACCESSORIES</p></div>
  <div class="arm-wallet" title="Jungle Coins · earned by playing"><img src="assets/ui/crown.webp" alt=""><div><small>JUNGLE COINS</small><b class="jc-balance">0</b></div>${COIN_SALES?'<button id="arm-buy" class="arm-plus" aria-label="Buy Jungle Coins">+</button>':''}</div></div>
 <nav class="arm-tabs">${[['store','STORE'],['wardrobe','WARDROBE'],['colors','COLORS'],['effects','EFFECTS'],['saved','SAVED OUTFITS']].concat(COIN_SALES?[['coins','BUY COINS']]:[]).map(([k,l])=>`<button data-tab="${k}">${l}</button>`).join('')}</nav>
 <div class="arm-body">
  <aside class="arm-fighters" id="arm-fighters"></aside>
  <aside class="arm-styles"><h3>OUTFIT STYLE</h3><div id="arm-looks"></div><h3 class="arm-saved-h">SAVED OUTFITS <span id="arm-saved-n"></span></h3><div id="arm-saved" class="arm-saved"></div></aside>
  <div class="arm-stage"><div class="arm-floor"></div><canvas id="arm-canvas"></canvas><canvas id="arm-sprite" class="hidden"></canvas>
   <button class="arm-rot l" id="arm-rot-l" aria-label="Turn">⟲</button><button class="arm-rot r" id="arm-rot-r" aria-label="Turn">⟳</button>
   <div class="arm-stage-name"><b id="arm-stage-fighter"></b><span id="arm-stage-look"></span></div>
   <div class="arm-anims"><span>PREVIEW ANIMATIONS</span>${['idle','attack','special','victory'].map(a=>`<button data-anim="${a}">${a.toUpperCase()}</button>`).join('')}</div>
  </div>
  <div class="arm-panel" id="arm-panel"></div>
 </div>
 <div class="arm-foot"><button id="arm-back" class="secondary">BACK</button><span class="arm-note" id="arm-note"></span><button id="arm-save" class="secondary">SAVE OUTFIT</button><button id="arm-equip" class="arm-equip">✔ EQUIP</button><button id="arm-reset" class="secondary">RESET</button></div>
 <div id="arm-modal" class="arm-modal hidden"><div class="arm-modal-box" id="arm-modal-box"></div></div>
 <div id="arm-toast" class="arm-toast"></div>`;
 sec.querySelectorAll('.arm-tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
 if($('arm-buy'))$('arm-buy').onclick=()=>{tab='coins';render()};
 $('arm-back').onclick=()=>{stopSprite();(window.__kotjShow||(()=>{}))('menu')};
 $('arm-rot-l').onclick=$('arm-rot-r').onclick=()=>{flip=!flip;$('arm-canvas').classList.toggle('flip',flip);$('arm-sprite').classList.toggle('flip',flip)};
 sec.querySelectorAll('[data-anim]').forEach(b=>b.onclick=()=>{anim=b.dataset.anim;playAnim()});
 $('arm-save').onclick=saveOutfit;$('arm-equip').onclick=equip;$('arm-reset').onclick=()=>{cur.colors={};cur.materials={};cur.aura=null;drawStage();renderPanel();toast('Back to the original colors')};
 $('arm-modal').onclick=e=>{if(e.target.id==='arm-modal')closeModal()};
}

function renderFighters(){
 $('arm-fighters').innerHTML=FIGHTERS.map(f=>{const open=isOpen(f.id);return`<button class="arm-f${f.id===fid?' on':''}${open?'':' locked'}" data-f="${f.id}" ${open?'':'disabled'}><img src="assets/characters/portraits/${f.id}.jpg?v=11.0" alt=""><span>${open?f.name:'LOCKED'}</span></button>`}).join('');
 $('arm-fighters').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{fid=b.dataset.f;loadCurrent();stopSprite();anim='idle';render()});
}
async function renderLooks(){
 const box=$('arm-looks');
 box.innerHTML=LOOKS.map(l=>{const key=fid+'.'+l.id,own=owns(key),on=cur.look===l.id;return`<button class="arm-look${on?' on':''}" data-look="${l.id}"><span class="arm-look-img"><img data-thumb="${l.id}" alt=""></span><span class="arm-look-t"><b>${lookName(fid,l.id)}</b><small>${l.tag}</small></span>${ON_HOLD.has(l.id)?'<i class="soon">COMING SOON</i>':own?(on?'<i class="ok">✔</i>':''):`<i class="price">${fmt(l.price)} JC</i>`}</button>`}).join('');
 box.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{const l=b.dataset.look;S.lookColors=S.lookColors||{};if(cur.look!=='original')S.lookColors[fid+'.'+cur.look]={colors:cur.colors,materials:cur.materials};cur.look=l;const kept=S.lookColors[fid+'.'+l]||{colors:{},materials:{}};cur.colors=JSON.parse(JSON.stringify(kept.colors));cur.materials=JSON.parse(JSON.stringify(kept.materials));stopSprite();drawStage();renderLooks();renderPanel();if(ON_HOLD.has(l))toast('Coming soon — preview only for now');else if(!owns(fid+'.'+l))toast('Preview — buy it in the Wardrobe or Store to equip')});
 for(const l of LOOKS){const im=box.querySelector(`[data-thumb="${l.id}"]`);if(im)im.src=l.id==='original'?outfitSrc(fid,'original'):`assets/armory/${fid}/${l.id}.webp?v=${V}`}
}
function renderSaved(){
 const list=S.saved[fid]||[];$('arm-saved-n').textContent=`(${list.filter(Boolean).length}/5)`;
 $('arm-saved').innerHTML=[0,1,2,3,4].map(i=>{const o=list[i];return o?`<div class="arm-slot" data-slot="${i}"><img data-slot-img="${i}" alt=""><b>${i+1}</b><span contenteditable="true" spellcheck="false" data-rename="${i}">${(o.name||('OUTFIT '+(i+1))).replace(/</g,'')}</span><button class="arm-x" data-del="${i}" aria-label="Delete">×</button></div>`:`<button class="arm-slot empty" data-new="${i}">+</button>`}).join('');
 $('arm-saved').querySelectorAll('[data-slot]').forEach(el=>el.onclick=e=>{if(e.target.dataset.rename!==undefined||e.target.dataset.del!==undefined)return;cur=JSON.parse(JSON.stringify(list[+el.dataset.slot]));delete cur.name;drawStage();renderLooks();renderPanel();toast('Outfit loaded — press EQUIP to wear it')});
 $('arm-saved').querySelectorAll('[data-new]').forEach(el=>el.onclick=saveOutfit);
 $('arm-saved').querySelectorAll('[data-del]').forEach(el=>el.onclick=()=>{list[+el.dataset.del]=null;S.saved[fid]=list;save();renderSaved()});
 $('arm-saved').querySelectorAll('[data-rename]').forEach(el=>{el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();el.blur()}};el.onblur=()=>{const i=+el.dataset.rename;if(list[i]){list[i].name=el.textContent.trim().slice(0,18).toUpperCase()||('OUTFIT '+(i+1));S.saved[fid]=list;save()}}});
 list.forEach((o,i)=>{if(!o)return;outfitURL(fid,o,160).then(u=>{const im=$('arm-saved').querySelector(`[data-slot-img="${i}"]`);if(im)im.src=u})});
}
function saveOutfit(){
 if(ON_HOLD.has(cur.look)){toast('Coming soon — save an ORIGINAL colorway instead');return}
 if(!owns(fid+'.'+cur.look)){toast('Buy this outfit before saving it');return}
 const list=S.saved[fid]||[];let i=list.findIndex(x=>!x);if(i<0)i=list.length<5?list.length:-1;
 if(i<0){toast('All 5 slots are full — delete one first');return}
 list[i]=Object.assign(JSON.parse(JSON.stringify(cur)),{name:'OUTFIT '+(i+1)});S.saved[fid]=list;save();renderSaved();toast('Saved to slot '+(i+1));
}
function equip(){
 if(ON_HOLD.has(cur.look)){toast('This outfit is coming soon — pick ORIGINAL to equip colors');return}
 if(!owns(fid+'.'+cur.look)){openBuy({type:'look',fid,look:cur.look});return}
 if(cur.aura&&!S.owned['aura.'+cur.aura]){toast('Buy the aura first');return}
 S.equipped[fid]=JSON.parse(JSON.stringify(cur));S.lookColors=S.lookColors||{};if(cur.look!=='original')S.lookColors[fid+'.'+cur.look]={colors:cur.colors,materials:cur.materials};save();for(const k in thumbCache)if(k.startsWith(fid))delete thumbCache[k];
 toast(`${fname(fid)} equipped: ${lookName(fid,cur.look)}`);renderLooks();
}

// ---------- stage ----------
async function drawStage(){
 const c=$('arm-canvas');$('arm-stage-fighter').textContent=fname(fid);$('arm-stage-look').textContent=lookName(fid,cur.look);
 await renderOutfit(c,fid,cur);
 const aura=cur.aura&&AURAS.find(a=>a.id===cur.aura);c.style.setProperty('--aura',aura?aura.color:'transparent');c.classList.toggle('aura',!!aura);
 $('arm-sprite').style.setProperty('--aura',aura?aura.color:'transparent');$('arm-sprite').classList.toggle('aura',!!aura);
 updateNote();
}
function updateNote(){
 const own=owns(fid+'.'+cur.look);const l=LOOKS.find(x=>x.id===cur.look);
 $('arm-note').innerHTML=ON_HOLD.has(cur.look)?'Coming soon · preview only':cur.look==='original'?'Original design · your colors show in every fight':'';
 $('arm-equip').textContent=ON_HOLD.has(cur.look)?'COMING SOON':own?'✔ EQUIP':`BUY ${fmt(l.price)} JC`;
}
function stopSprite(){if(spriteAnim){cancelAnimationFrame(spriteAnim);spriteAnim=null}$('arm-sprite')&&$('arm-sprite').classList.add('hidden');$('arm-canvas')&&$('arm-canvas').classList.remove('hidden','a-attack','a-special','a-victory')}
function playAnim(){
 document.querySelectorAll('[data-anim]').forEach(b=>b.classList.toggle('on',b.dataset.anim===anim));
 stopSprite();const c=$('arm-canvas');
 const HD=window.SPRITES_HD||(typeof SPRITES_HD!=='undefined'?SPRITES_HD:null);
 const map={idle:'idle',attack:'attack_heavy',special:'special_pounce',victory:'victory'};
 if(cur.look==='original'&&HD&&HD[fid]&&HD[fid].anims[map[anim]]){
  const e=HD[fid].anims[map[anim]],[n,w,h]=e,sc=$('arm-sprite');loadImg(`assets/characters/${fid}/frames-hd/${map[anim]}.webp`).then(img=>{
   const cols=Math.max(1,Math.floor(img.naturalWidth/w));sc.width=w;sc.height=h;const x=sc.getContext('2d');c.classList.add('hidden');sc.classList.remove('hidden');
   let t0=performance.now();const fps=anim==='idle'?12:18;
   const step=now=>{const k=Math.floor((now-t0)/1000*fps)%n;x.clearRect(0,0,w,h);const tg=origTargets(cur),sx=(k%cols)*w,sy=Math.floor(k/cols)*h,fc=tg&&window.KOTJ_TINT?KOTJ_TINT.frame(fid,img,sx,sy,w,h,tg):null;if(fc)x.drawImage(fc,0,0);else x.drawImage(img,sx,sy,w,h,0,0,w,h);spriteAnim=requestAnimationFrame(step)};spriteAnim=requestAnimationFrame(step);
  }).catch(()=>{});
  return;
 }
 if(anim!=='idle'){void c.offsetWidth;c.classList.add('a-'+anim);setTimeout(()=>c.classList.remove('a-'+anim),1300)}
}

// ---------- right panel ----------
function renderPanel(){
 document.querySelectorAll('.arm-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
 const p=$('arm-panel');
 if(tab==='wardrobe')return panelWardrobe(p);
 if(tab==='colors')return panelColors(p);
 if(tab==='effects')return panelEffects(p);
 if(tab==='store')return panelStore(p);
 if(tab==='saved')return panelLocker(p);
 if(tab==='coins'&&!COIN_SALES)tab='store';if(tab==='coins')return panelCoins(p);
}
function itemCard(it){
 const own=it.type==='look'?owns(it.fid+'.'+it.look):!!S.owned['aura.'+it.aura];
 const title=it.type==='look'?`${fname(it.fid)} · ${lookName(it.fid,it.look)}`:AURAS.find(a=>a.id===it.aura).name;
 const price=it.type==='look'?LOOKS.find(l=>l.id===it.look).price:AURAS.find(a=>a.id===it.aura).price;
 const img=it.type==='look'?`<img src="assets/armory/${it.fid}/${it.look}.webp?v=${V}" alt="">`:`<span class="aura-orb" style="--aura:${AURAS.find(a=>a.id===it.aura).color}"></span>`;
 return`<div class="arm-item${own?' owned':''}" data-item='${JSON.stringify(it)}'>${img}<b>${title}</b><span>${own?'OWNED':fmt(price)+' JC'}</span></div>`;
}
function bindItems(p){p.querySelectorAll('[data-item]').forEach(el=>el.onclick=()=>{const it=JSON.parse(el.dataset.item);
 if(it.type==='look'){if(it.fid!==fid){fid=it.fid}cur.look=it.look;drawStage();renderFighters();renderLooks();if(!owns(it.fid+'.'+it.look))openBuy(it);else toast('Owned — press EQUIP to wear it')}
 else{cur.aura=it.aura;drawStage();if(!S.owned['aura.'+it.aura])openBuy(it);else toast('Aura previewing — press EQUIP to wear it')}})}
function panelWardrobe(p){
 p.innerHTML=`<h3>${fname(fid)} WARDROBE</h3><p class="arm-sub">Free colorways recolor ${fname(fid)}'s battle armor in every fight. New outfits are coming soon.</p>
 <h3>COLORWAYS <small>FREE · IN FIGHTS</small></h3><div class="arm-colorways">${[['GOLD RUSH',{primary:'#151515',trim:'#ffd700',shoes:'#151515',metal:'#ffd700'}],['CRIMSON KING',{primary:'#8e1020',trim:'#ffd700',shoes:'#1a1a1a',metal:'#ffcf5a'}],['ROYAL BLUE',{primary:'#1f3fa8',trim:'#f4f4f4',shoes:'#f4f4f4',metal:'#c0c0c0'}],['VIOLET REIGN',{primary:'#4b1f8f',trim:'#ffd700',shoes:'#151515',metal:'#ffd700'}],['JUNGLE GREEN',{primary:'#1f6e34',trim:'#ffd700',shoes:'#f4f4f4',metal:'#ffcf5a'}],['ARCTIC',{primary:'#eef4f8',trim:'#7fd8ff',shoes:'#ffffff',metal:'#c0c0c0'}]].map(([n,c])=>(c={cloth:c.primary,metal:c.metal},[n,c])).map(([n,c])=>`<button class="arm-cw" data-cw='${JSON.stringify(c)}'><i style="background:linear-gradient(135deg,${c.cloth} 50%,${c.metal} 50%)"></i>${n}</button>`).join('')}</div>`;
 bindItems(p);
 p.insertAdjacentHTML('beforeend',`<h3>OUTFITS <small style="color:#ffb36b">COMING SOON</small></h3><div class="arm-grid soon">${LOOKS.filter(l=>l.id!=='original').map(l=>`<div class="arm-item"><img src="assets/armory/${fid}/${l.id}.webp?v=${V}" alt=""><b>${lookName(fid,l.id)}</b><span>COMING SOON</span></div>`).join('')}</div>`);
 p.querySelectorAll('[data-cw]').forEach(b=>b.onclick=()=>{cur.look='original';const z=window.KOTJ_TINT?KOTJ_TINT.zonesFor(fid):[];const c=JSON.parse(b.dataset.cw);cur.colors={};z.forEach(k=>cur.colors[k]=c[k]);cur.materials={};drawStage();renderLooks();playAnim();toast('Colorway applied — press EQUIP to fight in it')});
}
let wheelHSV=[45,1,1];
function panelColors(p){
 if(ON_HOLD.has(cur.look)){cur.look='original';cur.colors={};drawStage();renderLooks()}
 const ORIG=cur.look==='original',Z=ORIG&&window.KOTJ_TINT?KOTJ_TINT.zonesFor(fid):[];
 const CH=ORIG?['cloth','metal'].map(k=>({k,label:FIGHT_CH[k]})):CHANNELS;
 const M=ORIG?null:MRES[fid+'.'+cur.look];
 p.innerHTML=`<h3>COLOR CUSTOMIZATION <small>FREE</small></h3>
 ${ORIG?`<p class="arm-sub">Recolors ${fname(fid)}'s battle armor — shows in every fight. Fur and skin keep their colors.</p>`:''}<div class="arm-chans${ORIG?' two':''}">${CH.map(c=>`<button data-ch="${c.k}">${c.label}</button>`).join('')}</div>
 <div class="arm-colorrow"><canvas id="arm-wheel" width="200" height="200"></canvas><div class="arm-sliders">
  <label>Hue<input type="range" id="arm-h" min="0" max="360"></label><label>Saturation<input type="range" id="arm-s" min="0" max="100"></label><label>Brightness<input type="range" id="arm-v" min="0" max="100"></label>
  <label class="hex">HEX<input id="arm-hex" maxlength="7" spellcheck="false"></label><button id="arm-orig" class="arm-mini">ORIGINAL COLOR</button></div></div>
 <h4>PRESETS</h4><div class="arm-presets">${[...PRESETS,...S.presets].map(c=>`<button data-pre="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<button id="arm-addpre" class="arm-addpre" title="Save this color as a preset">+</button></div>
 ${ORIG?'':`<h4>MATERIAL</h4><div class="arm-mats">${MATERIALS.map(m=>`<button data-mat="${m}"><i class="mat-${m}"></i>${m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div>`}`;
 const chOK=k=>ORIG?Z.includes(k):(!M||!!M.stats[k]);
 p.querySelectorAll('[data-ch]').forEach(b=>{b.disabled=!chOK(b.dataset.ch);b.onclick=()=>{chan=b.dataset.ch;syncColorUI()}});
 if(!chOK(chan))chan=(CH.find(c=>chOK(c.k))||CH[0]).k;
 drawWheel();
 const wheel=$('arm-wheel');const pick=e=>{const r=wheel.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*2-1,y=(e.clientY-r.top)/r.height*2-1,d=Math.hypot(x,y);if(d>1)return;wheelHSV=[(Math.atan2(y,x)*180/Math.PI+360)%360,d,wheelHSV[2]||1];applyHSV()};
 wheel.onpointerdown=e=>{wheel.setPointerCapture(e.pointerId);pick(e);wheel.onpointermove=pick};wheel.onpointerup=()=>wheel.onpointermove=null;
 $('arm-h').oninput=$('arm-s').oninput=$('arm-v').oninput=()=>{wheelHSV=[+$('arm-h').value,$('arm-s').value/100,$('arm-v').value/100];applyHSV()};
 $('arm-hex').onchange=()=>{const v=$('arm-hex').value.trim();if(/^#?[0-9a-f]{6}$/i.test(v)){setColor(v[0]==='#'?v:'#'+v)}else toast('Use a 6-digit HEX like #FFD700')};
 $('arm-orig').onclick=()=>{delete cur.colors[chan];delete cur.materials[chan];drawStage();syncColorUI()};
 $('arm-orig').textContent=ORIG?'ORIGINAL ARMOR COLOR':'ORIGINAL COLOR';
 p.querySelectorAll('[data-pre]').forEach(b=>b.onclick=()=>setColor(b.dataset.pre));
 $('arm-addpre').onclick=()=>{const c=cur.colors[chan];if(!c){toast('Pick a color first');return}if(!S.presets.includes(c)){S.presets=[...S.presets,c].slice(-8);save();panelColors(p)}};
 p.querySelectorAll('[data-mat]').forEach(b=>b.onclick=()=>{cur.materials[chan]=b.dataset.mat;if(!cur.colors[chan]){const st=M&&M.stats[chan];cur.colors[chan]=PRESETS[0]}drawStage();syncColorUI()});
 syncColorUI();
}
function drawWheel(){const c=$('arm-wheel');if(!c)return;const x=c.getContext('2d'),R=100,img=x.createImageData(200,200);for(let j=0;j<200;j++)for(let i=0;i<200;i++){const dx=(i-R)/R,dy=(j-R)/R,d=Math.hypot(dx,dy),p=(j*200+i)*4;if(d>1)continue;const rgb=hsv2rgb((Math.atan2(dy,dx)*180/Math.PI+360)%360,d,1);img.data[p]=rgb[0];img.data[p+1]=rgb[1];img.data[p+2]=rgb[2];img.data[p+3]=255}x.putImageData(img,0,0);
 const [h,s]=wheelHSV,a=h*Math.PI/180;x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(R+Math.cos(a)*s*R,R+Math.sin(a)*s*R,7,0,7);x.stroke();x.strokeStyle='#000';x.lineWidth=1;x.stroke()}
function applyHSV(){setColor(rgb2hex(...hsv2rgb(...wheelHSV)),true)}
let stageTimer=0;
function setColor(hex,fromWheel){cur.colors[chan]=hex.toLowerCase();if(!fromWheel)wheelHSV=rgb2hsv(...hex2rgb(hex));clearTimeout(stageTimer);stageTimer=setTimeout(()=>{drawStage();if(cur.look==='original')tintCacheBust++},60);syncColorUI()}
let tintCacheBust=0;
function syncColorUI(){
 document.querySelectorAll('[data-ch]').forEach(b=>b.classList.toggle('on',b.dataset.ch===chan));
 const c=cur.colors[chan];if(c&&document.activeElement!==$('arm-h')&&document.activeElement!==$('arm-s')&&document.activeElement!==$('arm-v'))wheelHSV=rgb2hsv(...hex2rgb(c));
 if($('arm-h')){$('arm-h').value=Math.round(wheelHSV[0]);$('arm-s').value=Math.round(wheelHSV[1]*100);$('arm-v').value=Math.round(wheelHSV[2]*100);$('arm-hex').value=c?c.toUpperCase():'ORIGINAL';drawWheel()}
 const m=cur.materials[chan]||'fabric';document.querySelectorAll('[data-mat]').forEach(b=>b.classList.toggle('on',b.dataset.mat===m&&!!c));
}
function panelEffects(p){
 p.innerHTML=`<h3>EFFECTS · AURAS</h3><p class="arm-sub">Auras glow around your fighter in battle (cosmetic only — no stat boost). One aura per fighter.</p><div class="arm-grid">${AURAS.map(a=>itemCard({type:'aura',aura:a.id})).join('')}</div><button id="arm-noaura" class="arm-mini">NO AURA</button>`;
 bindItems(p);$('arm-noaura').onclick=()=>{cur.aura=null;drawStage();toast('Aura removed — press EQUIP to keep it')};
}
// rotating shop: fixed by the calendar day/week, no countdowns
function seeded(seed){let s=seed%2147483647||1;return()=>(s=s*16807%2147483647)/2147483647}
function rotation(){
 const pool=[];FIGHTERS.filter(f=>isOpen(f.id)).forEach(f=>['royal','street','hybrid'].filter(l=>!ON_HOLD.has(l)).forEach(l=>pool.push({type:'look',fid:f.id,look:l})));AURAS.forEach(a=>pool.push({type:'aura',aura:a.id}));
 const day=Math.floor(Date.now()/864e5),wk=Math.floor((day+3)/7);
 const pickN=(seed,n)=>{const r=seeded(seed),a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,n)};
 return{daily:pickN(day*7919,3),weekly:pickN(wk*104729+17,3)};
}
function panelStore(p){
 const r=rotation();
 p.innerHTML=`<h3>ITEM SHOP</h3><p class="arm-sub">Featured items change each day; the collection changes each week. Prices and ownership shown on every item. New outfits are coming soon.</p><h4>FEATURED TODAY</h4><div class="arm-grid">${r.daily.map(itemCard).join('')}</div><h4>THIS WEEK'S COLLECTION</h4><div class="arm-grid">${r.weekly.map(itemCard).join('')}</div>`;bindItems(p);
}
function panelLocker(p){
 const eq=Object.entries(S.equipped).filter(([k,v])=>v&&(fightColors(k)||(v.aura&&S.owned['aura.'+v.aura])));
 const ownedLooks=Object.keys(S.owned).filter(k=>!k.startsWith('aura.')&&owns(k));
 p.innerHTML=`<h3>PLAYER LOCKER</h3><p class="arm-sub">Everything you own, saved on this device. Up to 5 saved outfits per fighter — rename a slot by tapping its name.</p>
 <h4>EQUIPPED</h4><div class="arm-lockrow">${eq.length?eq.map(([f,o])=>`<span>${fname(f)}${fightColors(f)?' · CUSTOM COLORWAY':''}${o.aura?' · '+AURAS.find(a=>a.id===o.aura).name:''}</span>`).join(''):'<span>All fighters wear their original design.</span>'}</div>
 <h4>OWNED OUTFITS (${ownedLooks.length})</h4><div class="arm-grid">${ownedLooks.map(k=>{const[f,l]=k.split('.');return itemCard({type:'look',fid:f,look:l})}).join('')||'<p class="arm-sub">None yet — visit the Store or Wardrobe.</p>'}</div>
 <button id="arm-restore" class="arm-mini">RESTORE ${fname(fid)}'S ORIGINAL DESIGN</button>`;
 bindItems(p);$('arm-restore').onclick=()=>{delete S.equipped[fid];save();loadCurrent();drawStage();renderLooks();toast(fname(fid)+' is back in the original design')};
}
function panelCoins(p){
 p.innerHTML=`<h3>BUY JUNGLE COINS</h3><div class="arm-testbanner">TEST MODE — no real money is charged. Real checkout (Square) switches on only after the owner approves production payments.</div>
 <div class="arm-packs">${PACKS.map(k=>`<button class="arm-pack" data-pack="${k.id}"><b>${k.name}</b><span class="jc">${fmt(k.coins)} JC</span><span class="usd">$${k.price.toFixed(2)}</span></button>`).join('')}</div>
 <h4>EARN COINS BY PLAYING <small>FREE</small></h4><div class="arm-earn"><span>Win a fight <b>+${EARN.win}</b></span><span>Lose a fight <b>+${EARN.loss}</b></span><span>Draw <b>+${EARN.draw}</b></span><span>Flawless victory <b>+${EARN.flawless}</b></span><span>10+ hit combo <b>+${EARN.combo10}</b></span><span>Each Tower floor won <b>+${EARN.towerFloor}</b></span><span>Conquer the Tower <b>+${EARN.towerClear}</b></span><span>Defeat MAJIC <b>+${EARN.titan}</b></span><span>First win of the day <b>+${EARN.firstWin}</b></span></div><p class="arm-sub">Up to ${fmt(EARN.dailyCap)} coins a day from playing${S.earn&&S.earn.day===today()?` · earned today: ${fmt(S.earn.total)}`:''}. Training mode doesn't pay out.</p>
 <h4>PURCHASE HISTORY</h4><div class="arm-receipts">${S.receipts.length?S.receipts.slice().reverse().map(r=>`<button class="arm-rcpt" data-rcpt="${r.ref}"><b>${r.pack}</b><span>${fmt(r.coins)} JC · $${r.total.toFixed(2)}</span><small>${new Date(r.date).toLocaleString()} · ${r.ref}</small></button>`).join(''):'<p class="arm-sub">No purchases yet.</p>'}</div>`;
 p.querySelectorAll('[data-pack]').forEach(b=>b.onclick=()=>buyPack(PACKS.find(k=>k.id===b.dataset.pack)));
 p.querySelectorAll('[data-rcpt]').forEach(b=>b.onclick=()=>showReceipt(S.receipts.find(r=>r.ref===b.dataset.rcpt)));
}
// ---------- modals ----------
function openModal(html){$('arm-modal-box').innerHTML=html;$('arm-modal').classList.remove('hidden')}
function closeModal(){$('arm-modal').classList.add('hidden')}
function openBuy(it){
 const title=it.type==='look'?`${fname(it.fid)} · ${lookName(it.fid,it.look)}`:AURAS.find(a=>a.id===it.aura).name;
 const price=it.type==='look'?LOOKS.find(l=>l.id===it.look).price:AURAS.find(a=>a.id===it.aura).price;
 const can=S.coins>=price;
 openModal(`<h3>PURCHASE</h3><p class="arm-big">${title}</p><p>Price <b>${fmt(price)} JC</b> · Your balance <b>${fmt(S.coins)} JC</b></p>${can?'':`<p class="warn">Not enough Jungle Coins.</p>`}<p class="arm-sub">Cosmetic only — no gameplay advantage.</p><div class="arm-mbtns"><button class="secondary" id="m-cancel">CANCEL</button>${can?`<button class="arm-equip" id="m-ok">BUY FOR ${fmt(price)} JC</button>`:(COIN_SALES?`<button class="arm-equip" id="m-coins">GET COINS</button>`:`<span class="arm-sub">Earn more Jungle Coins by winning matches and climbing the Tower.</span>`)}</div>`);
 $('m-cancel').onclick=closeModal;
 if($('m-coins'))$('m-coins').onclick=()=>{closeModal();tab='coins';renderPanel()};
 if($('m-ok'))$('m-ok').onclick=()=>{S.coins-=price;S.owned[it.type==='look'?it.fid+'.'+it.look:'aura.'+it.aura]=Date.now();save();coinPills();closeModal();toast('Purchased! Press EQUIP to wear it');renderLooks();renderPanel();updateNote()};
}
function buyPack(k){
 const tax=0;const total=k.price+tax;
 openModal(`<h3>BUY ${k.name} PACK</h3><p class="arm-big">${fmt(k.coins)} Jungle Coins</p><table class="arm-total"><tr><td>Package</td><td>$${k.price.toFixed(2)}</td></tr><tr><td>Tax (test mode)</td><td>$${tax.toFixed(2)}</td></tr><tr><th>Total</th><th>$${total.toFixed(2)}</th></tr></table><div class="arm-testbanner">TEST MODE — this adds test coins only. No card is asked for or charged.</div><div class="arm-mbtns"><button class="secondary" id="m-cancel">CANCEL</button><button class="arm-equip" id="m-ok">CONFIRM TEST PURCHASE</button></div>`);
 $('m-cancel').onclick=closeModal;
 $('m-ok').onclick=()=>{const ref='TEST-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
  if(S.receipts.some(r=>r.ref===ref))return;const r={ref,date:Date.now(),pack:k.name,coins:k.coins,price:k.price,tax,total};S.receipts.push(r);S.coins+=k.coins;save();coinPills();showReceipt(r);renderPanel()};
}
function showReceipt(r){
 openModal(`<div class="arm-receipt"><h3>KING OF THE JUNGLE</h3><p class="arm-sub">PURCHASE CONFIRMATION · TEST MODE</p><table class="arm-total"><tr><td>Merchant</td><td>King of the Jungle (J. Hardy) — test</td></tr><tr><td>Date</td><td>${new Date(r.date).toLocaleString()}</td></tr><tr><td>Package</td><td>${r.pack} · ${fmt(r.coins)} JC</td></tr><tr><td>Amount</td><td>$${r.price.toFixed(2)}</td></tr><tr><td>Tax</td><td>$${r.tax.toFixed(2)}</td></tr><tr><th>Total</th><th>$${r.total.toFixed(2)}</th></tr><tr><td>Reference</td><td>${r.ref}</td></tr></table><p class="arm-sub">No money was charged. Support: in-game Settings › Help.</p></div><div class="arm-mbtns"><button class="arm-equip" id="m-ok">DONE</button></div>`);
 $('m-ok').onclick=closeModal;
}

function render(){renderFighters();renderLooks();renderSaved();drawStage().then(()=>{if(tab==='colors')renderPanel()});renderPanel();coinPills();playAnim()}


// ---------- earning Jungle Coins by playing ----------
const EARN={win:60,loss:20,draw:30,flawless:40,combo10:20,towerFloor:40,towerClear:500,titan:250,firstWin:150,dailyCap:2000};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
function reward(r){
 if(!r||r.mode==='training')return null;
 const lines=[];const add=(n,label)=>{if(n>0)lines.push([n,label])};
 if(r.draw)add(EARN.draw,'Draw');else if(r.won)add(EARN.win,'Victory');else add(EARN.loss,'Fought hard');
 if(r.won&&r.flawless)add(EARN.flawless,'Flawless');
 if(r.combo>=10)add(EARN.combo10,r.combo+'-hit combo');
 if(r.won&&r.tower)add(EARN.towerFloor,'Tower floor');
 if(r.won&&r.towerDone)add(EARN.towerClear,'Tower conquered');
 if(r.won&&r.titan)add(EARN.titan,'Defeated MAJIC');
 const d=today();if(!S.earn||S.earn.day!==d)S.earn={day:d,total:0,firstWin:false};
 if(r.won&&!S.earn.firstWin){S.earn.firstWin=true;add(EARN.firstWin,'First win today')}
 let total=lines.reduce((a,[n])=>a+n,0);const room=Math.max(0,EARN.dailyCap-S.earn.total);const capped=total>room;total=Math.min(total,room);
 S.earn.total+=total;S.coins+=total;S.earnedAll=(S.earnedAll||0)+total;save();coinPills();
 return{total,lines,capped,balance:S.coins};
}
function showReward(res){
 const box=document.getElementById('winner-copy');if(!box)return;let el=document.getElementById('jc-reward');
 if(!el){el=document.createElement('div');el.id='jc-reward';el.className='jc-reward';box.after(el)}
 if(!res){el.innerHTML='';return}
 el.innerHTML=res.total>0?`<b>+${fmt(res.total)} <small>JUNGLE COINS</small></b><span>${res.lines.map(([n,l])=>`${l} +${n}`).join(' · ')}</span>${res.capped?'<em>Daily coin limit reached — more tomorrow</em>':''}`:`<span>Daily coin limit reached — more tomorrow</span>`;
 el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
}
// ---------- hooks into the rest of the game ----------
function open(startFid){if(!S.welcome){S.welcome=1;save();setTimeout(()=>{try{toast('WELCOME BONUS · 500 Jungle Coins to start your collection!')}catch(_){}},700)}buildScreen();if(startFid&&isOpen(startFid))fid=startFid;loadCurrent();tab='wardrobe';(window.__kotjShow||(()=>{}))('armory');render()}
function heroInto(id,img){const o=S.equipped[id];if(!o||(o.look==='original'?!origTargets(o):!owns(id+'.'+o.look)))return;outfitURL(id,o,600).then(u=>{if(img.dataset.armFor===id)img.src=u}).catch(()=>{})}
function auraFor(id){const o=S.equipped[id];return o&&o.aura&&S.owned['aura.'+o.aura]?(AURAS.find(a=>a.id===o.aura)||{}).color:null}
function cycleOutfit(id){return false;const owned=['original',...['royal','street','hybrid'].filter(l=>owns(id+'.'+l))];if(owned.length<2)return false;const o=S.equipped[id]||freshOutfit();S.lookColors=S.lookColors||{};if(o.look!=='original')S.lookColors[id+'.'+o.look]={colors:o.colors||{},materials:o.materials||{}};const i=owned.indexOf(o.look);o.look=owned[(i+1)%owned.length];const kept=S.lookColors[id+'.'+o.look]||{colors:{},materials:{}};o.colors=JSON.parse(JSON.stringify(kept.colors));o.materials=JSON.parse(JSON.stringify(kept.materials));S.equipped[id]=o;save();return lookName(id,o.look)}
window.KOTJ_ARMORY={open,heroInto,auraFor,cycleOutfit,fightColors,reward:r=>{const x=reward(r);showReward(x);return x},lookName:id=>lookName(id,(S.equipped[id]||{}).look||'original'),coins:()=>S.coins,refresh:coinPills};

function addEntryPoints(){
 buildScreen();
 const menu=document.getElementById('cover-menu');
 if(menu&&!$('open-armory')){const b=document.createElement('button');b.id='open-armory';b.className='secondary armory-btn';b.innerHTML='<b>THE JUNGLE ARMORY</b><small>Outfits · colors · auras · Jungle Coins</small>';const after=$('open-achievement-gallery');after?after.after(b):menu.appendChild(b);b.onclick=()=>open()}
 const top=document.querySelector('.topbar');
 if(top&&!$('jc-top')){const w=document.createElement('button');w.id='jc-top';w.className='jc-top';w.title='Jungle Coins';w.innerHTML='<img src="assets/ui/crown.webp" alt=""><b class="jc-balance">0</b><small>JC</small>';top.appendChild(w);w.onclick=()=>{open();if(COIN_SALES){tab='coins';renderPanel()}}}
 const card=document.querySelector('#select .fighter-card');
 if(card&&!$('sel-outfit')){const b=document.createElement('button');b.id='sel-outfit';b.className='secondary sel-outfit';b.textContent='CUSTOMIZE ▸';const conf=$('confirm-fighter');card.insertBefore(b,conf);
  b.onclick=e=>{e.stopPropagation();const id=$('select').dataset.f;if(!id)return;const r=cycleOutfit(id);if(!r){open(id);return}syncSelect(id)}}
 coinPills();
}
function syncSelect(id){const img=$('fighter-portrait');if(!img)return;img.dataset.armFor=id;const o=S.equipped[id];const b=$('sel-outfit');
 if(b)b.textContent=(fightColors(id)?'COLORS: CUSTOM':'COLORS: ORIGINAL')+' · CUSTOMIZE ▸';
 if(o&&fightColors(id))heroInto(id,img)}
// watch the select card so the equipped outfit shows whenever a fighter is highlighted
function watchSelect(){const sel=$('select');if(!sel)return;new MutationObserver(()=>{const id=sel.dataset.f;if(id)syncSelect(id)}).observe(sel,{attributes:true,attributeFilter:['data-f']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addEntryPoints();watchSelect()});else{addEntryPoints();watchSelect()}
})();
