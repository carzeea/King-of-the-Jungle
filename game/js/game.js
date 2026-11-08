'use strict';
/* King of the Jungle V2 — web build 0.3
   Killer-Instinct-style combat: openers, auto-doubles, enders, potential (recoverable) damage,
   combo breakers with lockout, two life bars, DANGER state, Shadow moves, Instinct mode and
   cinematic ULTRA COMBO finishers. Plus: portraits, Badger sprites, touch, gamepad, CPU, Tower. */
(()=>{
const $=id=>document.getElementById(id), roster=KOTJ_ROSTER, screens=['menu','select','stage','fight','result','champion','story'];
const portrait=id=>'assets/characters/portraits/'+id+'.jpg?v=6.8';
let mode='versus',step=1,picks=[roster[6],roster[1]],chosen=picks[0],game=null,raf=0,paused=false,last=0,time=99;
let tower=null;
const cam={x:0,y:0,z:1,snap:true};
/* ---------- Blood setting: 0 = OFF (default), 1 = LIGHT, 2 = HEAVY. Remembered on this device. ---------- */
let blood=0;try{blood=Math.max(0,Math.min(2,+(localStorage.getItem('kotj-blood')||0)))}catch(_){}
const BLOOD_LABEL=['OFF','LIGHT','HEAVY'];
function setBlood(v){blood=v;try{localStorage.setItem('kotj-blood',String(v))}catch(_){}
 document.querySelectorAll('.blood-btn').forEach(b=>b.textContent='BLOOD: '+BLOOD_LABEL[blood]);if(game&&!blood)game.stains=[]}
// Dynamic resolution: full detail (up to 4K) when the device keeps up, lower render scale if frames drop.
// Picks a render resolution during the first seconds of a fight, then holds it steady
// (no flickering between sharp and soft). Only steps down again if the device really struggles.
let savedScale=1;try{savedScale=Math.min(1,Math.max(.4,+localStorage.getItem('kotj-res')||1))}catch(_){}
let frameDt=1/60;
const RES={scale:savedScale,acc:0,n:0,t:0,slow:0};
function resStart(){RES.acc=0;RES.n=0;RES.t=0;RES.slow=0;if(RES.scale<1)RES.scale=Math.min(1,RES.scale*1.15)}
function resTick(real){RES.t+=real;RES.acc+=real;RES.n++;
 if(RES.t<1.2)return;                                   // ignore loading hiccups at fight start
 if(RES.acc<1.5)return;const avg=RES.acc/RES.n;RES.acc=0;RES.n=0;
 if(RES.t<6){ // calibration window: settle quickly, downward only
  if(avg>1/52&&RES.scale>.4){RES.scale=Math.max(.4,RES.scale*Math.max(.55,Math.min(.85,(1/55)/avg)));}
 }else{       // locked: only step down if it stays clearly slow
  RES.slow=avg>1/40?RES.slow+1:0;if(RES.slow>=2&&RES.scale>.4){RES.scale=Math.max(.4,RES.scale*.8);RES.slow=0}
 }
 try{localStorage.setItem('kotj-res',RES.scale.toFixed(3))}catch(_){}
}
/* ---------- Arenas ---------- */
const ARENAS=[{id:'jungle-temple',name:'JUNGLE TEMPLE'},{id:'inferno-fortress',name:'INFERNO FORTRESS'},{id:'frozen-kingdom',name:'FROZEN KINGDOM'},
 {id:'savage-plains',name:'SAVAGE PLAINS'},{id:'shadow-swamp',name:'SHADOW SWAMP'},{id:'royal-colosseum',name:"MAJIC'S LAIR"}];
const arenaImg={};ARENAS.forEach(a=>{const im=new Image();im.src='assets/arenas/'+a.id+'.webp';arenaImg[a.id]=im});
let arena=ARENAS[0],stagePick=0; // stagePick: 0-5 arena, 6 = random
function renderStages(){setBackdrop(stagePick===6?'assets/arenas/cover-bg.webp':'assets/arenas/'+ARENAS[stagePick].id+'.webp');
 $('stage-vs').textContent=picks[0].name+' VS '+picks[1].name;$('stage-grid').innerHTML='';
 ARENAS.forEach((a,i)=>{const b=document.createElement('button');b.className='stage-tile'+(stagePick===i?' selected':'');
  b.innerHTML=`<span class="num">${i+1}</span><img src="assets/arenas/${a.id}-thumb.webp" alt="${a.name}"><strong>${a.name}</strong>`;
  b.onclick=()=>{stagePick=i;renderStages()};b.ondblclick=()=>$('stage-go').click();$('stage-grid').append(b)});
 const r=document.createElement('button');r.className='stage-tile random'+(stagePick===6?' selected':'');r.innerHTML='?<strong>RANDOM</strong>';
 r.onclick=()=>{stagePick=6;renderStages()};r.ondblclick=()=>$('stage-go').click();$('stage-grid').append(r);
}
function openStage(){renderStages();show('stage')}
$('stage-go').onclick=()=>{ac();arena=stagePick===6?ARENAS[Math.floor(Math.random()*6)]:ARENAS[stagePick];start()};
$('stage-back').onclick=()=>{step=mode==='versus'||mode==='cpu'?2:1;chosen=picks[step-1];render();show('select')};
// Tower: each floor moves to a new arena; the final boss is always in Majic's Lair.
function towerArena(){if(tower.kind==='forgotten')return [ARENAS[4],ARENAS[2],ARENAS[1]][tower.index]||ARENAS[5];const n=tower.ladder.length;return tower.index===n-1?ARENAS[5]:ARENAS[tower.index%5]}

const show=id=>{screens.forEach(s=>$(s).classList.toggle('hidden',s!==id));document.body.classList.toggle('on-cover',id==='menu')};
/* ---------- Atmospheric backdrop behind every non-title screen ---------- */
const BD={cur:'',flip:false};
function setBackdrop(url){
 if(!url||url===BD.cur)return;BD.cur=url;const im=new Image();im.onload=()=>{
  const a=document.querySelector(BD.flip?'.bd-a':'.bd-b'),b=document.querySelector(BD.flip?'.bd-b':'.bd-a');BD.flip=!BD.flip;
  a.style.backgroundImage=`url("${url}")`;a.classList.add('on');b.classList.remove('on')};im.src=url;
}
setBackdrop('assets/arenas/cover-bg.webp');
(function bdEmbers(){
 const cv=document.getElementById('bd-embers'),cx=cv.getContext('2d');let P=[],W=0,H=0,last=performance.now();
 function tick(t){const dt=Math.min(.05,(t-last)/1000);last=t;
  if(!document.body.classList.contains('on-cover')&&!document.body.classList.contains('fighting')){
   if(cv.clientWidth!==W||cv.clientHeight!==H){const d=Math.min(devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0)}
   const max=Math.min(110,W/10);
   while(P.length<max)P.push({x:Math.random()*W,y:H+10,r:.6+Math.random()*1.9,vy:18+Math.random()*50,vx:-8+Math.random()*16,life:0,max:5+Math.random()*7,w:Math.random()*6.28});
   cx.clearRect(0,0,W,H);cx.globalCompositeOperation='lighter';
   for(const p of P){p.life+=dt;p.w+=dt*2;p.y-=p.vy*dt;p.x+=(p.vx+Math.sin(p.w)*12)*dt;const k=Math.max(0,1-p.life/p.max);
    const g=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);g.addColorStop(0,`rgba(255,200,110,${.8*k})`);g.addColorStop(1,'rgba(255,120,30,0)');cx.fillStyle=g;cx.beginPath();cx.arc(p.x,p.y,p.r*4,0,7);cx.fill()}
   P=P.filter(p=>p.life<p.max&&p.y>-20)}
  requestAnimationFrame(tick)}
 requestAnimationFrame(tick);
})();
/* ---------- Cover / title screen ---------- */
(function cover(){
 const faces=$('cover-faces');roster.forEach((f,i)=>{const im=document.createElement('img');im.src=portrait(f.id);im.alt=f.name;im.title=f.name;im.style.animationDelay=(1.1+i*.06)+'s';faces.append(im)});
 const startCover=()=>{const m=$('menu');if(m.classList.contains('started'))return;m.classList.add('started');try{ac()}catch(_){}
  if(window.KOTJAudio){KOTJAudio.unlock();KOTJAudio.music('music.menu');KOTJAudio.preload(['sfx.punch','sfx.heavyImpact','sfx.claw','sfx.bite','sfx.block','sfx.groundSlam']);KOTJAudio.ready.then(()=>KOTJAudio.preload(Object.keys(KOTJAudio.clips).filter(k=>k.startsWith('voice.'))))}
  setTimeout(()=>{const b=document.querySelector('.cover-menu button');if(b)b.focus({preventScroll:true})},60)};
 window.__startCover=startCover;
 $('press-start').onclick=startCover;
 $('menu').addEventListener('pointerdown',e=>{if(!e.target.closest('.cover-menu'))startCover()});
 window.addEventListener('keydown',e=>{if($('menu').classList.contains('hidden'))return;
  if(!$('menu').classList.contains('started')){if(['Enter',' ','f','k'].includes(e.key)||e.key.length===1){e.preventDefault();startCover()}return}
  const bs=[...document.querySelectorAll('.cover-menu button')].filter(b=>b.offsetParent),i=bs.indexOf(document.activeElement);
  if(e.key==='ArrowDown'||e.key==='s'){e.preventDefault();bs[(i+1)%bs.length].focus()}
  if(e.key==='ArrowUp'||e.key==='w'){e.preventDefault();bs[(i-1+bs.length)%bs.length].focus()}});
 // embers
 const cv=$('embers'),cx=cv.getContext('2d');let P=[],W=0,H=0;
 const size=()=>{const d=Math.min(devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0)};
 const spawn=()=>({x:Math.random()*W,y:H+10,r:.6+Math.random()*2.2,vy:20+Math.random()*60,vx:-10+Math.random()*20,life:0,max:4+Math.random()*6,w:Math.random()*6.28});
 let last=performance.now();
 function tick(t){const dt=Math.min(.05,(t-last)/1000);last=t;
  if(!$('menu').classList.contains('hidden')){
   if(cv.clientWidth!==W||cv.clientHeight!==H)size();
   while(P.length<Math.min(140,W/8))P.push(spawn());
   cx.clearRect(0,0,W,H);cx.globalCompositeOperation='lighter';
   P.forEach(p=>{p.life+=dt;p.w+=dt*2;p.y-=p.vy*dt;p.x+=(p.vx+Math.sin(p.w)*14)*dt;const k=Math.max(0,1-p.life/p.max);
    const g=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);g.addColorStop(0,`rgba(255,${180+Math.random()*50|0},90,${.9*k})`);g.addColorStop(1,'rgba(255,120,30,0)');
    cx.fillStyle=g;cx.beginPath();cx.arc(p.x,p.y,p.r*4,0,7);cx.fill()});
   P=P.filter(p=>p.life<p.max&&p.y>-20)}
  requestAnimationFrame(tick)}
 requestAnimationFrame(tick);
})();

/* ---------- Tuning ---------- */
const BAR=100;                       // HP per life bar; every fighter has two bars
const DANGER=22;                     // last-bar HP at which an Ultra Combo becomes possible
const RANKS=['','','','TRIPLE','SUPER','HYPER','BRUTAL','SAVAGE','FERAL','PRIMAL','MONSTER','APEX','KING'];
const rankName=n=>n>=12?'KING':RANKS[n]||'';
const MOVES={ // t = total duration, hits = times (s) when the move strikes, stun = hitstun applied
 claw:{t:.36,hits:[.14],dmg:p=>5+p*.6,range:178,stun:.46,push:55},
 bite:{t:.5,hits:[.26],dmg:p=>10+p*.8,range:180,stun:.6,push:80},
 double:{t:.34,hits:[.07,.19],dmg:p=>2.6+p*.35,range:195,stun:.44,push:30,potential:true},
 special:{t:.7,hits:[.38],dmg:p=>9+p*.9,range:230,stun:.62,push:140},
 ender:{t:.62,hits:[.3],dmg:p=>4+p*.5,range:240,stun:0,push:420,ender:true},
 shadow:{t:.95,hits:[.15,.3,.45,.6,.75],dmg:p=>3+p*.35,range:250,stun:.4,push:45,shadow:true}
};

/* ---------- Audio: synthesized hits + spoken announcer ---------- */
let soundOn=true,actx=null;
function ac(){if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)()}catch(_){}}if(actx&&actx.state==='suspended')actx.resume();return actx}
function sfx(type){
 if(!soundOn)return;const a=ac();if(!a)return;const t=a.currentTime;
 const noise=(dur,freq,gain)=>{const b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
  const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const g=a.createGain();g.gain.value=gain;s.connect(f).connect(g).connect(a.destination);s.start(t)};
 const tone=(f0,f1,dur,gain,wave='sine')=>{const o=a.createOscillator(),g=a.createGain();o.type=wave;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur)};
 if(type==='hit'){noise(.12,2200,.5);tone(160,50,.14,.5)}
 else if(type==='heavy'){noise(.2,1400,.7);tone(110,35,.25,.7)}
 else if(type==='block'){noise(.06,5000,.25);tone(900,600,.05,.12,'square')}
 else if(type==='whiff'){noise(.08,4000,.12)}
 else if(type==='breaker'){tone(200,1400,.35,.3,'sawtooth');noise(.3,3000,.5)}
 else if(type==='lockout'){tone(300,90,.4,.25,'square')}
 else if(type==='instinct'){tone(120,900,.6,.3,'sawtooth')}
 else if(type==='ultra'){noise(.07,3000,.45);tone(400,120,.08,.3,'square')}
 else if(type==='boom'){noise(.6,900,.9);tone(80,25,.7,.9)}
}
const AU=window.KOTJAudio;
// Play a labeled clip from the sound library; if it isn't loaded yet, use the built-in synth sound.
function snd(key,fallback,vol=1,rate=1){if(!soundOn)return;if(!(AU&&AU.now(key,vol,rate))&&fallback)sfx(fallback)}
const HEAVY_SPECIAL=['badger','grizzly','hippo','elephant'];
function hitSound(f,mv){
 const r=.94+Math.random()*.12;
 if(mv===MOVES.bite)return snd('sfx.bite','heavy',1,r);
 if(mv===MOVES.special)return snd(HEAVY_SPECIAL.includes(f.data.id)?'sfx.groundSlam':'sfx.heavyImpact','heavy',1,r);
 if(mv===MOVES.double&&f.chain%2)return snd('sfx.claw','hit',.9,r);
 if(mv.shadow)return snd(f.hitsDone%2?'sfx.claw':'sfx.punch','hit',.85,r);
 return snd('sfx.punch','hit',.9,r);
}
const VOICE_KEY=t=>'voice.'+t.toLowerCase().replace(/\./g,'').replace(/\s+/g,'-').replace(/^k-o$/,'ko');
// Holden fallbacks: a specific recording first, then his general call, then the browser voice.
const VOICE_ALT={'voice.ultra-combo':'voice.ultra','voice.danger':'voice.finish-him'};
function say(text){
 if(soundOn&&AU){const k=VOICE_KEY(text);
  if(AU.now(k,1))return;
  if(VOICE_ALT[k]&&AU.now(VOICE_ALT[k],1))return;
  if(/-combo$/.test(k)&&k!=='voice.ultra-combo'&&AU.now('voice.combo',1))return;}
 speak(text);
}
function speak(text){
 return; // no computer voice: only Holden's recorded lines play
 if(!soundOn||!window.speechSynthesis)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.pitch=.35;u.rate=.92;u.volume=1;
  const v=speechSynthesis.getVoices().find(v=>/en/i.test(v.lang)&&/male|david|daniel|fred|alex|google uk english male/i.test(v.name));if(v)u.voice=v;speechSynthesis.speak(u)}catch(_){}
}
$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent='SOUND: '+(soundOn?'ON':'OFF');if(!soundOn&&window.speechSynthesis)speechSynthesis.cancel();AU&&AU.setEnabled(soundOn)};

/* ---------- Menus ---------- */
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ac();openSelect(b.dataset.mode)});
function openSelect(m){mode=m;step=1;tower=null;picks=[roster[6],roster[1]];chosen=picks[0];render();show('select')}
function render(){
 const who=mode==='versus'?`PLAYER ${step}`:'PLAYER 1';
  $('select-instruction').textContent=mode==='forgotten'?'CHOOSE WHO ENTERS':mode==='tower'?'CHOOSE YOUR FIGHTER · CLIMB ALL 10 OPPONENTS':mode==='cpu'&&step===2?'CHOOSE YOUR CPU OPPONENT':`${who}: CHOOSE YOUR FIGHTER`;
 $('confirm-fighter').textContent=mode==='forgotten'?'ENTER':mode==='tower'?'START THE TOWER':mode==='cpu'&&step===2?'CONFIRM CPU OPPONENT':`CONFIRM ${who}`;
 $('roster').innerHTML='';
 roster.forEach((f,i)=>{if(mode==='forgotten'&&f.id==='majic')return;const b=document.createElement('button');b.className='fighter-tile'+(chosen.id===f.id?' selected':'');if(f.id==='majic')b.classList.add('titan');
  b.innerHTML=`<img src="${portrait(f.id)}" alt="${f.name}"><strong>${f.name}</strong>`+(f.id==='majic'?`<img class="titan-pop" src="assets/characters/portraits/majic-popout.webp?v=6.7" alt="">`:'')+(crowns().includes(f.id)?'<img class="tile-crown" src="assets/ui/crown.webp" alt="Tower champion" title="Conquered the Tower">':'');
  b.onclick=()=>{chosen=f;document.querySelectorAll('.fighter-tile').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');card(f,i)};
  b.ondblclick=()=>$('confirm-fighter').click();$('roster').append(b)});
 card(chosen,roster.indexOf(chosen));
}
function card(f,i){$('confirm-fighter').disabled=false;setBackdrop(portrait(f.id));$('fighter-number').textContent=String(i+1).padStart(2,'0');$('fighter-portrait').src=portrait(f.id);$('fighter-name').textContent=f.name;$('fighter-style').textContent=f.style;$('fighter-bio').textContent=f.bio;$('power-stat').textContent=f.power;$('speed-stat').textContent=f.speed;$('defense-stat').textContent=f.defense}
$('confirm-fighter').onclick=()=>{
 ac();picks[step-1]=chosen;
 if(mode==='tower'){tower={kind:'tower',player:chosen,ladder:roster.filter(f=>BASE_IDS.includes(f.id)&&f.id!==chosen.id),index:0};picks=[chosen,tower.ladder[0]];arena=towerArena();
  return start()}
 if(mode==='forgotten'){if(chosen.id==='majic')return;
  const others=roster.filter(f=>BASE_IDS.includes(f.id)&&f.id!==chosen.id).sort(()=>Math.random()-.5).slice(0,3).map(f=>({...f,name:'FALLEN '+f.name,echo:true}));
  tower={kind:'forgotten',player:chosen,ladder:others,index:0};picks=[chosen,others[0]];arena=towerArena();
  return storyCard({dark:1,title:'',text:STORY.forgotten.enter},()=>storyCard({dark:1,title:'ECHO 1',text:STORY.forgotten.echoes[0]},start))}
 if(step===1){step=2;chosen=picks[1].id===picks[0].id?roster[(roster.indexOf(picks[0])+1)%roster.length]:picks[1];render()}else openStage();
};

/* ---------- Input ---------- */
const KEYS=[{l:'a',r:'d',j:'w',bl:'s',at:'f',sp:'g',ins:'h'},{l:'ArrowLeft',r:'ArrowRight',j:'ArrowUp',bl:'ArrowDown',at:'k',sp:'l',ins:';'}];
const kb={},tap={},touch={l:0,r:0,j:0,bl:0,at:0,sp:0,ins:0},touchTap={};
const norm=e=>e.key.length===1?e.key.toLowerCase():e.key;
window.addEventListener('keydown',e=>{if(!game)return;const k=norm(e);if(KEYS.some(m=>Object.values(m).includes(k))){e.preventDefault();if(!kb[k])tap[k]=true;kb[k]=true}if(k==='Escape'||k==='p')togglePause()});
window.addEventListener('keyup',e=>{kb[norm(e)]=false});
window.addEventListener('blur',()=>{for(const k in kb)kb[k]=false});
const pad=$('touch-pad');
const isTouch=()=>matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;
pad.querySelectorAll('button').forEach(b=>{const k=b.dataset.k;
 const on=e=>{e.preventDefault();ac();touch[k]=1;touchTap[k]=1;b.classList.add('on');try{b.setPointerCapture(e.pointerId)}catch(_){}};
 const off=e=>{e.preventDefault();touch[k]=0;b.classList.remove('on')};
 b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);
 b.addEventListener('contextmenu',e=>e.preventDefault());});
window.addEventListener('touchstart',()=>{if(game)pad.classList.remove('hidden')},{passive:true});
let padPrev=[{},{}];
function readPad(n){
 const list=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean);const g=list[n];if(!g)return null;
 const B=i=>!!(g.buttons[i]&&g.buttons[i].pressed),ax=g.axes[0]||0,ay=g.axes[1]||0;
 return{up:B(12)||ay<-.6,dn:B(13)||ay>.6,l:B(14)||ax<-.45,r:B(15)||ax>.45,j:B(0)||B(12)||ay<-.7,bl:B(1)||B(6)||B(4)||B(13)||ay>.7,at:B(2),sp:B(3),ins:B(5)||B(7),start:B(9)};
}
function inputFor(i){
 const m=KEYS[i],k={};
 for(const n in m){k[n]=!!kb[m[n]]||!!tap[m[n]];tap[m[n]]=false}
 if(i===0)for(const n in touch){k[n]=k[n]||!!touch[n]||!!touchTap[n];touchTap[n]=0}
 const g=readPad(i);if(g){for(const n in k)k[n]=k[n]||g[n];if(g.start&&!padPrev[i].start)togglePause();padPrev[i]=g}
 return k;
}
let menuPrev={};setInterval(()=>{if(game)return;const g=readPad(0);if(!g)return;const p=menuPrev;menuPrev=g;
 const vis=screens.find(s=>!$(s).classList.contains('hidden'));
 if(vis==='menu'){const m=$('menu');
  if(!m.classList.contains('started')){if((g.j&&!p.j)||(g.at&&!p.at)||(g.start&&!p.start))window.__startCover()}
  else{const bs=[...document.querySelectorAll('.cover-menu button')].filter(b=>b.offsetParent);let i=Math.max(0,bs.indexOf(document.activeElement));
   if((g.l&&!p.l)||(g.up&&!p.up))bs[(i-1+bs.length)%bs.length].focus();
   if((g.r&&!p.r)||(g.dn&&!p.dn))bs[(i+1)%bs.length].focus();
   if((g.j&&!p.j)||(g.at&&!p.at)||(g.start&&!p.start))(document.activeElement&&bs.includes(document.activeElement)?document.activeElement:bs[0]).click()}}
 if(vis==='select'){const i=roster.indexOf(chosen);let n=i;if(g.r&&!p.r)n=(i+1)%roster.length;if(g.l&&!p.l)n=(i+roster.length-1)%roster.length;
  if(n!==i){chosen=roster[n];render()}if((g.at&&!p.at)||(g.start&&!p.start))$('confirm-fighter').click();if(g.bl&&!p.bl)show('menu')}
 if(vis==='stage'){let n=stagePick;if(g.r&&!p.r)n=(n+1)%7;if(g.l&&!p.l)n=(n+6)%7;if(n!==stagePick){stagePick=n;renderStages()}if((g.at&&!p.at)||(g.start&&!p.start))$('stage-go').click();if(g.bl&&!p.bl)$('stage-back').click()}
 if(vis==='story'&&((g.j&&!p.j)||(g.at&&!p.at)||(g.start&&!p.start)))$('story-next').click();
 if(vis==='champion'&&((g.j&&!p.j)||(g.at&&!p.at)||(g.start&&!p.start)))$('champ-continue').click();
 if(vis==='result'&&g.j&&!p.j)(!$('tower-next').classList.contains('hidden')?$('tower-next'):$('rematch')).click();
},60);

/* ---------- CPU ---------- */
function cpuBrain(level){return{level,think:0,hold:{},wantBlock:0,doubles:0,pressed:{},breakTry:0}}
function cpuInput(i){
 const f=game.fighters[i],o=game.fighters[1-i],ai=f.ai,lvl=ai.level,dt=game.dt;
 const k={l:false,r:false,j:false,bl:false,at:false,sp:false,ins:false};
 const press=n=>{if(!ai.pressed[n]){k[n]=true;ai.pressed[n]=true}};
 for(const n in ai.pressed)if(ai.pressed[n]&&Math.random()<.5)ai.pressed[n]=false; // release so the next press is a new edge
 ai.think-=dt;ai.wantBlock=Math.max(0,ai.wantBlock-dt);ai.breakTry=Math.max(0,ai.breakTry-dt);
 const d=Math.abs(o.x-f.x),toward=o.x>f.x?'r':'l',away=toward==='r'?'l':'r';
 // Being comboed: try a Combo Breaker on the gold flash (better CPUs read it more often).
 if(f.stun>0){
  if(o.breakWindow>0&&!f.lockout&&!ai.breakTry){ai.breakTry=.5;if(Math.random()<.08+lvl*.42)press('at')}
  else if(!o.breakWindow&&o.combo>=2&&!f.lockout&&Math.random()<.004*(1-lvl)*60*dt)press('at'); // nervous mash = lockout
  return k;
 }
 // Comboing: link auto-doubles, then finish with an ender (or Ultra when the target is in danger).
 if(o.stun>0&&f.combo>0){
  if(f.attack<.15){if(ai.doubles>0){press('at');ai.doubles--}else if(!ai.dropping)press(f.meter>=50&&Math.random()<lvl*.4?'sp':'sp')}
  return k;
 }
 if(f.meter>=100&&!f.instinct&&Math.random()<.02)press('ins');
 if(o.actionTime>0&&o.attack>0&&d<230&&!ai.wantBlock&&Math.random()<(.01+lvl*.05)*60*dt)ai.wantBlock=.3+lvl*.3;
 if(ai.wantBlock&&f.ground){k.bl=true;return k}
 if(ai.think<=0){
  ai.think=.5-lvl*.33+Math.random()*.2;ai.hold={};ai.doubles=1+Math.floor(Math.random()*(1+lvl*3));ai.dropping=Math.random()>.45+lvl*.5;
  const r=Math.random(),aggro=.2+lvl*.55;
  if(d>175){ai.hold[toward]=1;if(r<.06+lvl*.05)ai.hold.j=1;else if(r<.12+lvl*.1&&d<260)ai.hold.sp=1;else if(f.meter>=50&&r<.2)ai.hold.shadow=1}
  else if(r<aggro){ai.hold.at=1;if(Math.random()<.25)ai.hold.heavy=1}
  else if(r<aggro+.12)ai.hold.sp=1;
  else if(r<aggro+.28)ai.hold[away]=1;
  else ai.hold.bl=1;
 }
 const h=ai.hold;k.l=!!h.l;k.r=!!h.r;k.j=!!h.j;k.bl=!!h.bl||!!h.heavy||!!h.shadow;
 if(h.at){press('at');h.at=0}
 if(h.sp){press('sp');h.sp=0}
 if(h.shadow){press('sp');h.shadow=0}
 return k;
}

/* ---------- Match flow ---------- */
function fighter(x,dir,data){return{x,y:0,vx:0,vy:0,dir,hp:BAR,bars:data.id==='majic'?3:2,potential:0,data,ground:true,block:false,blockTime:0,attack:0,stun:0,walk:0,move:0,
 action:'idle',actionTime:0,actionTotal:1,move_:null,hitsDone:0,elapsed:0,wasAttack:false,wasSpecial:false,wasIns:false,hitFlash:0,
 combo:0,meter:0,lockout:0,breakWindow:0,instinct:0,down:0,koTime:0,ai:null,trail:[]}}
function setAction(f,a,t){f.action=a;f.actionTime=t;f.actionTotal=t}
function start(){
 show('fight');document.body.classList.add('fighting');setBackdrop('assets/arenas/'+arena.id+'.webp');$('arena-title').textContent=arena.name;
 const cpu2=mode!=='versus';
 $('p1-name').textContent=picks[0].name;$('p2-name').textContent=picks[1].name;
 $('p1-face').src=portrait(picks[0].id);$('p2-face').src=portrait(picks[1].id);
 $('p1-tag').textContent='PLAYER 1';$('p2-tag').textContent=cpu2?'CPU':'PLAYER 2';
 $('mode-label').textContent=mode==='forgotten'?'? ? ?':mode==='tower'?'TOWER':mode==='cpu'?'VS CPU':'VERSUS';
 $('round-label').textContent=tower?(tower.boss?'THE SUMMIT':tower.kind==='forgotten'?`ECHO ${tower.index+1} / 3`:`FIGHT ${tower.index+1} / ${tower.ladder.length}`):'ROUND 1';
 $('p2-face').classList.toggle('echo-face',!!picks[1].echo);
 time=99;paused=false;cam.z=1;cam.snap=true;resStart();
 setTimeout(()=>{if(wantHD()){loadHD(picks[0].id);loadHD(picks[1].id)}},0);
 game={fighters:[fighter(300,1,picks[0]),fighter(800,-1,picks[1])],over:false,ko:0,dt:0,shake:0,hitstop:0,slow:1,slowT:0,flash:0,zoom:1,fx:[],stains:[],banner:null,ultra:null,intro:1.3,dangerSaid:[0,0]};
 if(cpu2)game.fighters[1].ai=cpuBrain(tower&&tower.boss?1.35:tower?(tower.kind==='forgotten'?Math.min(1,.85+tower.index*.05):Math.min(1,.1+tower.index*.09)):.45);
 ['p1','p2'].forEach(p=>{$(p+'-combo').textContent='';$(p+'-combo').classList.remove('active')});
 updateGuide();hud();$('combat-callout').textContent='';$('pause').textContent='PAUSE';
 const finalBoss=tower&&tower.kind==='tower'&&tower.index===tower.ladder.length-1;
 if(tower&&tower.boss){game.intro=2.9;banner('MAJIC','THE JUNGLE TITAN · ALL 11 IN ONE',2.8,'#ffcc33');game.shake=14}
 else if(finalBoss){game.intro=2.4;banner('FINAL BOSS',`${picks[1].name} AWAITS IN ${arena.name}`,2.3,'#ff5a3a')}
 else if(tower&&tower.kind==='forgotten')banner(`ECHO ${tower.index+1}`,`${picks[1].name} · ${arena.name}`,1.8,'#b9a0ff');
 else banner(tower?`FIGHT ${tower.index+1}`:'ROUND 1',`${picks[0].name} VS ${picks[1].name} · ${arena.name}`,1.4);
 if(AU&&soundOn){AU.music('music.'+arena.id);
  const pre=tower&&tower.index===tower.ladder.length-1?'voice.final-fight':(tower?null:'voice.round-one');
  if(AU.loaded('voice.fight')){                         // Holden: "Round one!" / "Final fight!" then "Fight!"
   if(pre&&AU.loaded(pre)){AU.now(pre);setTimeout(()=>{if(game&&!game.over)AU.now('voice.fight')},1000)}
   else if(tower&&tower.boss){if(AU.loaded('voice.majic'))AU.now('voice.majic');else speak('Majic! The jungle titan!');setTimeout(()=>{if(game&&!game.over)AU.now('voice.fight')},2200)}
   else if(finalBoss){speak('Final fight!');setTimeout(()=>{if(game&&!game.over)AU.now('voice.fight')},1500)}
   else AU.now('voice.fight');
  }else if(AU.has('announcer.fight'))AU.announce(); else speak('Fight');
 }else say('Fight');
 pad.classList.toggle('hidden',!isTouch());document.body.classList.toggle('touch',isTouch());document.body.classList.remove('paused');
 last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function banner(text,sub,life=1.1,color='#ffd36b'){game.banner={text,sub,t:0,life,color}}
// Control guide that matches the device: touch, keyboard, Xbox or PlayStation.
function padKind(g){const id=(g&&g.id||'').toLowerCase();if(/xbox|xinput|045e/.test(id))return 'xbox';return /054c|playstation|dualsense|dualshock|wireless controller|ps[345]/.test(id)?'ps':'xbox'}
function updateGuide(){
 const el=$('controls');if(!el)return;
 const pads=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean);
 const row=(t,s)=>`<div><b>${t}</b><span>${s}</span></div>`;
 const XB='STICK / D-PAD MOVE · A JUMP · X ATTACK · B + X HEAVY · Y SPECIAL · B + Y SHADOW · B / LB / LT BLOCK · RB / RT INSTINCT · MENU PAUSE';
 const PS='STICK / D-PAD MOVE · ✕ JUMP · □ ATTACK · ○ + □ HEAVY · △ SPECIAL · ○ + △ SHADOW · ○ / L1 / L2 BLOCK · R1 / R2 INSTINCT · OPTIONS PAUSE';
 const KB1='A / D MOVE · W JUMP · F ATTACK · S + F HEAVY · G SPECIAL · S + G SHADOW · S BLOCK · H INSTINCT · ESC PAUSE';
 const KB2='← / → MOVE · ↑ JUMP · K ATTACK · ↓ + K HEAVY · L SPECIAL · ↓ + L SHADOW · ↓ BLOCK · ; INSTINCT';
 const TOUCH='◀ ▶ MOVE · ▲ JUMP · ATK ATTACK · BLOCK + ATK HEAVY · SPC SPECIAL · BLOCK + SPC SHADOW · BLOCK · INS INSTINCT';
 const rows=[];
 pads.slice(0,2).forEach((g,i)=>rows.push(row(`PLAYER ${i+1} · ${padKind(g)==='ps'?'PLAYSTATION':'XBOX'}`,padKind(g)==='ps'?PS:XB)));
 if(!pads.length&&isTouch())rows.push(row('TOUCH',TOUCH));
 else{if(!pads[0])rows.push(row('PLAYER 1 · KEYBOARD',KB1));if(mode==='versus'&&!pads[1])rows.push(row('PLAYER 2 · KEYBOARD',KB2))}
 el.innerHTML=rows.join('');
}
addEventListener('gamepadconnected',updateGuide);addEventListener('gamepaddisconnected',updateGuide);
function togglePause(){if(!game||game.over)return;updateGuide();paused=!paused;$('pause').textContent=paused?'RESUME':'PAUSE';document.body.classList.toggle('paused',paused);AU&&AU.pauseMusic(paused)}
function loop(t){
 if(!game)return;const rawDt=(t-last)/1000;let real=Math.min(rawDt,.035);last=t;frameDt=real;if(!paused&&rawDt<.5)resTick(rawDt);
 if(!paused){
  if(game.slowT>0){game.slowT-=real;if(game.slowT<=0)game.slow=1}
  const dt=real*game.slow;game.dt=dt;
  fxUpdate(real);
  if(game.banner){game.banner.t+=real;if(game.banner.t>game.banner.life)game.banner=null}
  game.flash=Math.max(0,game.flash-real*3);game.shake=Math.max(0,game.shake-real);
  if(game.intro>0)game.intro-=real;
  else if(game.ultra)ultraStep(dt);
  else if(game.hitstop>0)game.hitstop-=real;
  else{
   if(!game.ko){time=Math.max(0,time-dt);$('timer').textContent=Math.ceil(time);}
   update(dt);
   if(!game.ko&&time===0){game.ko=2;banner('TIME','',1.6);say('Time');}
  }
  game.zoom=1;
  if(game.ko){game.ko-=real;if(game.ko<=0){finish();return}}
 }
 draw();raf=requestAnimationFrame(loop);
}
const total=f=>(f.bars-1)*BAR+f.hp;
function hud(){
 game.fighters.forEach((f,i)=>{const p='p'+(i+1),track=$(p+'-health').parentElement;
  $(p+'-health').style.width=Math.max(0,f.hp)+'%';
  const pot=Math.min(f.potential,BAR-Math.max(0,f.hp));$(p+'-pot').style.width=Math.max(0,pot)+'%';
  $(p+'-pot').style[i?'right':'left']=Math.max(0,f.hp)+'%';
  track.classList.toggle('last',f.bars===1);track.classList.toggle('danger',f.bars===1&&f.hp<=DANGER&&f.hp>0);
  {const pp=$(p+'-pips');while(pp.children.length<Math.max(2,f.bars,f.maxBars||0))pp.append(document.createElement('i'));f.maxBars=Math.max(f.maxBars||0,f.bars);
   pp.querySelectorAll('i').forEach((e,n)=>{e.classList.toggle('gone',n>=f.bars);e.style.display=n<Math.max(2,f.maxBars)?'':'none'})}
  $(p+'-meter').style.width=f.meter+'%';$(p+'-meter').classList.toggle('full',f.meter>=100||f.instinct>0);
 });
}
function inDanger(f){return f.bars===1&&f.hp<=DANGER}

function update(dt){
 const F=game.fighters,[a,b]=F;
 F.forEach((f,i)=>{
  const o=F[1-i],inp=f.ai?cpuInput(i):inputFor(i),frozen=!!game.ko;
  const rawAtk=inp.at&&!f.wasAttack&&!frozen,rawSp=inp.sp&&!f.wasSpecial&&!frozen,insEdge=inp.ins&&!f.wasIns&&!frozen;
  // Secret "Titan's Bane": BLOCK, BLOCK, JUMP, JUMP, ATTACK within 2.5 s while fighting MAJIC.
  if(!f.ai&&o.data.id==='majic'&&!game.bane){const ed=n=>inp[n]&&!(f.secPrev||{})[n];f.secT=(f.secT||0)+game.dt;
   const push=c=>{if(!f.sec||f.secT>2.5){f.sec='';f.secT=0}f.sec+=c};
   if(ed('bl'))push('B');if(ed('j'))push('J');if(rawAtk&&f.sec)push('A');
   if(f.sec&&!'BBJJA'.startsWith(f.sec.slice(-5))&&!'BBJJA'.startsWith(f.sec))f.sec=f.sec.endsWith('B')?'B':'';
   if(f.sec&&f.sec.endsWith('BBJJA')){game.bane=i+1;f.sec='';if(o.bars>1){o.bars--;o.potential=0}
    banner("TITAN'S BANE",'MAJIC IS WEAKENED',1.6,'#7fe8ff');game.shake=.5;game.flash=.4;floatText(o.x,o.y-340,'WEAKENED','#7fe8ff')}
   f.secPrev={bl:inp.bl,j:inp.j}}
  f.wasAttack=inp.at;f.wasSpecial=inp.sp;f.wasIns=inp.ins;
  // Input buffer: a press up to 0.15 s early still comes out at the first legal moment.
  f.bufA=rawAtk?.15:Math.max(0,(f.bufA||0)-dt);f.bufS=rawSp?.15:Math.max(0,(f.bufS||0)-dt);
  const atkEdge=f.bufA>0,spEdge=f.bufS>0;
  f.lockout=Math.max(0,f.lockout-dt);f.breakWindow=Math.max(0,f.breakWindow-dt);f.hitFlash=Math.max(0,f.hitFlash-dt);
  if(f.instinct>0){f.instinct=Math.max(0,f.instinct-dt);f.meter=f.instinct/8*100;if(!f.instinct)f.meter=0}
  const spd=(f.instinct?1.2:1);
  if(f.hp<=0&&f.bars<=1){f.action='knockdown';f.koTime+=dt;physics(f,dt);return}
  if(game.ko&&o.hp<=0&&o.bars<=1&&f.ground&&f.attack<=0&&f.stun<=0&&f.down<=0){f.winT=(f.winT||0)+dt;if(f.winT>.18){f.action='victory';physics(f,dt);return}}
  // ----- Knocked down (after an ender) -----
  if(f.down>0){f.down-=dt;f.action='down';physics(f,dt);if(f.down<=0)f.action='idle';return}
  // ----- Hitstun: the only thing you can do is try a Combo Breaker -----
  if(f.stun>0){
   f.stun-=dt;f.action='hit';
   f.bufA=0;f.bufS=0;
   if(rawAtk&&o.combo>=1&&!f.lockout){
    if(o.breakWindow>0)comboBreaker(i);
    else{f.lockout=2.2;sfx('lockout');soundOn&&AU&&AU.now('voice.lockout');floatText(f.x,f.y-300,'LOCKOUT','#ff5a4a');}
   }
   if(f.stun<=0)endCombo(1-i,false);
   physics(f,dt);return;
  }
  f.block=inp.bl&&f.ground&&f.attack<=0&&!frozen;f.blockTime=f.block?f.blockTime+dt:0;
  // ----- Attacking -----
  if(f.attack>0){
   f.attack-=dt*spd;f.actionTime=f.attack;f.elapsed+=dt*spd;
   const mv=f.move_;
   while(mv&&f.hitsDone<mv.hits.length&&f.elapsed>=mv.hits[f.hitsDone]){f.hitsDone++;resolveHit(i,mv);}
   // Linking: with the opponent still reeling, ATTACK = auto-double, SPECIAL = ender.
   const linkable=o.stun>0&&f.combo>0&&f.attack<.17;
   if(linkable&&atkEdge&&f.combo<14)doMove(f,'double');
   else if(linkable&&spEdge)doMove(f,inp.bl&&f.meter>=50?'shadow':'ender');
   if(f.attack<=0){f.attack=0;f.move_=null}
   physics(f,dt);return;
  }
  // ----- Neutral -----
  let move=0;
  if(!f.block&&!frozen){
   const sp=240*f.data.speed/7*spd;if(inp.l)move=-sp;if(inp.r)move=sp;
   if(inp.j&&f.ground){f.vy=-560;f.ground=false;}
   if(insEdge&&f.meter>=100&&!f.instinct){f.instinct=8;sfx('instinct');banner('INSTINCT',f.data.name,1);say('Instinct');game.flash=.5}
   else if(o.stun>0&&f.combo>0&&atkEdge)doMove(f,'double');
   else if(o.stun>0&&f.combo>0&&spEdge)doMove(f,'ender');
   else if(atkEdge)doMove(f,'claw');
   else if(spEdge)doMove(f,'special');
  }
  if(f.block&&!frozen){
   if(spEdge&&f.meter>=50){f.block=false;doMove(f,'shadow')}
   else if(atkEdge){f.block=false;doMove(f,o.stun>0&&f.combo>0?'double':'bite')}
  }
  f.move=move;f.x+=move*dt;
  physics(f,dt);
  if(f.attack<=0)f.action=f.block?'block':(!f.ground?'jump':Math.abs(move)>35?'walk':(Math.floor(performance.now()/1800)%3===0?'breathing':'idle'));
  f.walk+=Math.abs(move)*dt*.025;
 });
 const gap=Math.abs(a.x-b.x),minGap=122+((a.data.id==='majic'||b.data.id==='majic')?45:0);
 if(gap<minGap&&Math.abs(a.y-b.y)<120){const push=(minGap-gap)/2,s=a.x<b.x?-1:1;a.x=clampX(a.x+push*s);b.x=clampX(b.x-push*s);}
 if(a.hp>0&&b.hp>0&&!a.attack&&!a.stun)a.dir=b.x>=a.x?1:-1;
 if(a.hp>0&&b.hp>0&&!b.attack&&!b.stun)b.dir=a.x>=b.x?1:-1;
 F.forEach((f,i)=>{if(inDanger(f)&&f.hp>0&&!game.dangerSaid[i]){game.dangerSaid[i]=1;floatText(f.x,f.y-310,'DANGER','#ff4030');say('Danger')}});
 F.forEach(f=>{if(f.instinct||f.action==='shadow'){f.trail.push({x:f.x,y:f.y,dir:f.dir,a:f.action,t:.25});}f.trail=f.trail.filter(p=>(p.t-=dt)>0).slice(-6)});
 hud();
}
const clampX=x=>Math.max(72,Math.min(1028,x));
function physics(f,dt){f.x=clampX(f.x+f.vx*dt);f.y+=f.vy*dt;f.vy+=1500*dt;if(f.y>0){f.y=0;f.vy=0;f.ground=true}f.vx*=Math.pow(.004,dt)}
function doMove(f,name){
 f.bufA=0;f.bufS=0;
 const mv=MOVES[name];
 const o=game.fighters.find(x=>x!==f);
 if(o.stun>0&&f.combo>0&&(name==='ender'||name==='double'||name==='shadow'))o.stun=Math.max(o.stun,mv.hits[0]+.12); /* a linked move is guaranteed to connect */
 f.move_=mv;f.attack=mv.t;f.hitsDone=0;f.elapsed=0;
 const special=name==='special'||name==='ender'||name==='shadow';
 setAction(f,name==='claw'?'claw':name==='bite'?'bite':name==='double'?'double':name==='shadow'?'shadow':name==='ender'?'ender':special?(f.data.id==='badger'?'earthslam':'pounce'):name,mv.t);
 f.chain=(f.chain||0)+1;
 if(name==='double'){f.breakWindow=.26;f.vx=f.dir*120;sfx('whiff')}   // the gold flash: break NOW
 if(name==='claw'||name==='bite'){f.vx=f.dir*(name==='bite'?110:60);sfx('whiff')}
 if(name==='special'){f.vx=f.dir*(f.data.id==='badger'?260:420);f.vy=f.data.id==='badger'?-120:-230;f.ground=false}
 if(name==='ender'){f.vx=f.dir*200;f.vy=-140;f.ground=false;floatText(f.x,f.y-300,'ENDER','#ffd36b')}
 if(name==='shadow'){f.meter-=50;f.vx=f.dir*380;game.flash=.35;soundOn&&AU&&AU.now('voice.shadow-attack');if(AU&&soundOn&&AU.has('shadow.'+f.data.id))AU.shadow(f.data.id);else sfx('instinct');banner('SHADOW '+({badger:'RAMPAGE',wolf:'FRENZY',hyena:'MADNESS',leopard:'BLUR',jaguar:'MAULER',crocodile:'DEATH ROLL',lion:'ROAR',tiger:'STRIPES',grizzly:'MAUL',hippo:'STAMPEDE',elephant:'TITAN'}[f.data.id]||'STRIKE'),'',.8,'#c68bff')}
}
function resolveHit(i,mv){
 const f=game.fighters[i],o=game.fighters[1-i];
 if(o.down>0||(o.hp<=0&&o.bars<=1))return;
 const d=Math.abs(f.x-o.x),facing=(o.x-f.x)*f.dir>=-15;
 if(!(d<mv.range*(f.data.id==='majic'?1.3:1)&&Math.abs(f.y-o.y)<130&&facing))return;
 const comboing=o.stun>0&&f.combo>0;
 // Blocked: openers are stopped cold (specials chip a little).
 if(o.block&&o.ground&&!comboing){
  if(mv===MOVES.special||mv.shadow){o.hp=Math.max(1,o.hp-(mv.shadow?1:2));}
  o.vx=f.dir*90;f.meter=Math.min(100,f.meter+2);snd('sfx.block','block');spark(o.x-o.dir*20,o.y-170,'#9fd9ff',6);hud();return;
 }
 // Ultra Combo: an ender that lands while the opponent is in DANGER.
 const isEnder=mv.ender||(mv.shadow&&f.hitsDone===mv.hits.length&&comboing);
 if(isEnder&&inDanger(o)&&comboing){startUltra(i);return}
 const dmg=mv.dmg(f.data.power)*(f.instinct?1.25:1)*(1-(o.data.defense-7)*.03)*(game.bane===i+1&&o.data.id==='majic'?1.5:1);
 f.combo=comboing?f.combo+1:1;
 if(mv.potential&&comboing){const real=Math.min(dmg,Math.max(0,o.hp-.5));o.hp-=real;o.potential+=real;}
 else{o.hp-=dmg;}
 if(isEnder){ // cash in everything: potential becomes real, bonus for long combos
  o.hp-=f.combo*1.2;o.potential=0;o.stun=0;o.down=.9;o.vx=f.dir*mv.push;o.vy=-330;o.ground=false;
  snd('sfx.heavyImpact','heavy');game.shake=.25;game.hitstop=.09;spark(o.x,o.y-160,'#ffd36b',18);
  resolveBars(o,f);endCombo(i,true);
 }else{
  o.stun=mv.stun*Math.max(.5,1-Math.max(0,f.combo-4)*.06);o.vx=f.dir*mv.push;if(!o.ground)o.vy=-160;
  f.vx=f.dir*Math.max(20,mv.push*.4);
  hitSound(f,mv);game.hitstop=mv===MOVES.double?.035:.06;
  if(!mv.potential)resolveBars(o,f);
 }
 o.hitFlash=.1;o.attack=0;o.move_=null;o.block=false;
 f.meter=Math.min(100,f.meter+(f.instinct?0:4));o.meter=Math.min(100,o.meter+(o.instinct?0:2.5));
 spark(o.x-o.dir*10,o.y-160-Math.random()*40,mv.shadow?'#c68bff':'#fff0b0',10);
 bleed(o.x-o.dir*12,o.y-150-Math.random()*50,f.dir,isEnder?12:mv===MOVES.bite?10:mv===MOVES.special?9:(mv===MOVES.double&&f.chain%2)?6:mv.shadow?4:3);
 const p='p'+(i+1);if(f.combo>=2){$(p+'-combo').textContent=f.combo+' HITS';$(p+'-combo').classList.toggle('active',f.combo>=3)}
 hud();
}
function resolveBars(o,f){
 if(o.hp>0)return;
 if(o.bars>1){o.bars--;o.hp+=BAR;o.potential=Math.min(o.potential,BAR-o.hp);floatText(o.x,o.y-320,'BAR BROKEN','#ff9a4a');game.shake=.3;snd('sfx.heavyImpact','boom',1,.85);}
 else{o.hp=0;o.potential=0;koFinish(o,f,false)}
}
function endCombo(i,ended){
 const f=game.fighters[i],o=game.fighters[1-i];
 if(o.potential>0){ // dropped combo: half the recoverable damage is kept, half recovers
  if(!ended){o.hp+=o.potential*.5;}o.potential=0;
 }
 if(f.combo>=3){const r=rankName(f.combo);banner(r+' COMBO',f.combo+' HITS',1.1);say(r+' combo');}
 f.combo=0;f.chain=0;const p='p'+(i+1);setTimeout(()=>{if(game&&!game.fighters[i].combo){$(p+'-combo').textContent='';$(p+'-combo').classList.remove('active')}},700);
 hud();
}
function comboBreaker(i){
 const f=game.fighters[i],o=game.fighters[1-i];
 f.hp=Math.min(BAR,f.hp+f.potential);f.potential=0;f.stun=0;f.lockout=0;
 o.attack=0;o.move_=null;o.combo=0;o.breakWindow=0;o.stun=.5;o.vx=-o.dir*380;o.vy=-200;o.ground=false;o.action='hit';
 f.meter=Math.min(100,f.meter+12);
 game.flash=.8;game.hitstop=.18;game.shake=.3;sfx('breaker');spark((f.x+o.x)/2,f.y-170,'#ffffff',26);
 banner('COMBO BREAKER',f.data.name,1.3,'#7fe6ff');say('Combo breaker');
 const p='p'+(2-i);$(p+'-combo').textContent='BROKEN';hud();
}
function startUltra(i){
 const f=game.fighters[i],o=game.fighters[1-i];
 game.ultra={i,t:0,next:0,hits:0,max:18+Math.floor(f.combo*.8),start:o.hp};
 o.potential=0;o.stun=9;f.attack=9;setAction(f,'ultraseq',9);game.flash=1;snd('sfx.heavyImpact','boom');if(AU&&soundOn&&AU.has('ultra.'+f.data.id)){AU.duckMusic(.3);AU.ultra(f.data.id)}
 banner('ULTRA','',.6,'#ff5ad8');say('Ultra combo');
}
function ultraStep(dt){
 const u=game.ultra,f=game.fighters[u.i],o=game.fighters[1-u.i];
 u.t+=dt;f.elapsed=u.t;
 // Hold both fighters in place for the cinematic flurry.
 const cx=Math.max(160,Math.min(940,o.x));o.x+=(cx-o.x)*.2;f.x+=((o.x-f.dir*110)-f.x)*.25;o.y=Math.min(0,o.y+(0-o.y)*.2);f.y=o.y;
 if(u.t>=u.next&&u.hits<u.max){
  u.hits++;u.next=u.t+(u.hits<6?.13:.075);f.combo++;
  o.hp=Math.max(0,u.start*(1-u.hits/u.max));o.hitFlash=.06;o.vx=0;
  snd(u.hits%2?'sfx.claw':'sfx.punch','ultra',.75,1+Math.random()*.2);bleed(o.x-o.dir*10,o.y-130-Math.random()*90,f.dir,5);spark(o.x-o.dir*10,o.y-120-Math.random()*110,u.hits%3?'#ffd36b':'#ff6ae0',8);game.flash=Math.max(game.flash,.25);game.shake=.12;
  $('p'+(u.i+1)+'-combo').textContent=f.combo+' HITS';$('p'+(u.i+1)+'-combo').classList.add('active');hud();
 }
 if(u.hits>=u.max&&u.t>=u.next+.15){
  game.ultra=null;o.hp=0;o.potential=0;o.stun=0;f.attack=0;f.action='claw';
  o.vx=f.dir*520;o.vy=-420;o.ground=false;game.slow=.25;game.slowT=1.1;game.flash=1;game.shake=.5;snd('sfx.groundSlam','boom');
  spark(o.x,o.y-150,'#ffffff',40);bleed(o.x,o.y-150,f.dir,18);hud();
  banner('ULTRA COMBO',f.combo+' HITS',2.6,'#ff6ae0');setTimeout(()=>say('K O'),350);
  koFinish(o,f,true);
 }
}
function koFinish(o,f,ultra){
 if(game.ko)return;o.koTime=0;game.ko=ultra?3.2:2.2;
 AU&&AU.duckMusic(.4);if(!ultra)bleed(o.x,o.y-150,f.dir,14);
 if(!ultra){banner('K.O.',f.data.name+' WINS',2,'#ff5a4a');say('K O');game.slow=.35;game.slowT=.8;game.shake=.35;}
}

/* ---------- FX ---------- */
// Blood: droplets fly with the hit direction, fall with gravity and leave stains on the floor that fade during the round.
function bleed(x,y,dir,power){
 if(!blood||!game)return;const amt=Math.round(power*(blood===2?2.2:1));
 for(let k=0;k<amt;k++){
  game.fx.push({kind:'blood',x:x+(Math.random()-.5)*14,y:y+(Math.random()-.5)*20,vx:dir*(40+Math.random()*(blood===2?300:200)),vy:-(60+Math.random()*(blood===2?240:170)),
   r:1.6+Math.random()*(blood===2?3.6:2.4),t:0,life:2.2,shade:Math.random()})}
 if(blood===2&&power>=8)for(let k=0;k<4;k++)game.fx.push({kind:'mist',x:x+(Math.random()-.5)*20,y:y+(Math.random()-.5)*20,vx:dir*(40+Math.random()*80),vy:-20-Math.random()*40,r:10+Math.random()*14,t:0,life:.45})
}
function spark(x,y,color,n){for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2,s=180+Math.random()*420;game.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:0,life:.18+Math.random()*.2,color,kind:'spark'})}
 game.fx.push({x,y,t:0,life:.16,color,kind:'ring'})}
function floatText(x,y,text,color){game.fx.push({x,y,t:0,life:1,text,color,kind:'text'})}
function fxUpdate(dt){
 const FLOOR=400,maxStains=blood===2?160:70;
 for(const p of game.fx)if(p.kind==='blood'&&!p.dead){p.vy+=1500*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;
  if(p.y>=FLOOR+2+p.shade*26){p.dead=true;if(Math.random()<(blood===2?.75:.45))game.stains.push({x:p.x,y:FLOOR+6+p.shade*34,rx:p.r*(2+Math.random()*2.4),ry:p.r*(.7+Math.random()*.6),a:.85,shade:p.shade})}}
 game.fx=game.fx.filter(p=>!(p.kind==='blood'&&p.dead));
 if(game.stains.length>maxStains)game.stains.splice(0,game.stains.length-maxStains);
 for(const s of game.stains)s.a=Math.max(blood===2?.45:0,s.a-dt*(blood===2?.004:.03));
 game.stains=game.stains.filter(s=>s.a>.02);
 game.fx=game.fx.filter(p=>{p.t+=dt;if(p.kind==='mist'){p.x+=p.vx*dt;p.y+=p.vy*dt}if(p.kind==='spark'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.9;p.vy*=.9}if(p.kind==='text')p.y-=40*dt;return p.t<p.life})}

/* ---------- Results ---------- */
function finish(){
 if(game.over)return;game.over=true;AU&&soundOn&&AU.music('music.menu');
 const [p,q]=game.fighters,tp=total(p),tq=total(q),draw_=Math.abs(tp-tq)<.01,p1won=tp>tq,cpu2=mode!=='versus';
 let title=draw_?'DRAW':p1won?(cpu2?'YOU WIN':'PLAYER 1 WINS'):(cpu2?'CPU WINS':'PLAYER 2 WINS');
 let copy=draw_?'Neither fighter claimed the crown.':(p1won?picks[0].name:picks[1].name)+' claims the arena.';
 const winnerF=draw_?null:(p1won?p:q),flawless=!!winnerF&&total(winnerF)>=2*BAR-.01;
 if(flawless)copy='FLAWLESS VICTORY · '+copy;
 $('tower-next').classList.add('hidden');$('rematch').textContent='REMATCH';$('tower-ladder').innerHTML='';
 if(tower){
  if(p1won&&tower.boss){title='THE TRUE KING';copy=`${tower.player.name} defeated MAJIC at the summit.`;$('rematch').textContent='CLIMB AGAIN';tower.done=true}
  else if(p1won){tower.index++;
   if(tower.index>=tower.ladder.length&&tower.player.id!=='majic'){tower.reveal=true;title=tower.kind==='forgotten'?'THE SUMMIT':'A NEW CHALLENGER';copy=tower.kind==='forgotten'?'':'The ground shakes beneath the Lair. Something has been watching your climb.';$('tower-next').textContent=tower.kind==='forgotten'?'ASCEND':'FACE IT';$('tower-next').classList.remove('hidden');$('rematch').textContent='RETRY LAST FIGHT'}
   else if(tower.index>=tower.ladder.length){title='KING OF THE JUNGLE';copy=`${tower.player.name} conquered all ${tower.ladder.length} challengers and takes the crown.`;$('rematch').textContent='CLIMB AGAIN';tower.done=true}
   else{title='VICTORY';copy=tower.kind==='forgotten'?'':`Next up: ${tower.ladder[tower.index].name}.`;$('tower-next').textContent='NEXT FIGHT';$('tower-next').classList.remove('hidden');$('rematch').textContent='RETRY LAST FIGHT';}
  }else{title='DEFEATED';copy=tower.boss?'MAJIC crushes your challenge. The Jungle Titan still rules.':tower.kind==='forgotten'?`${picks[1].name} drags you back into the dark.`:`${picks[1].name} stops your climb at fight ${tower.index+1}. Try again.`;$('rematch').textContent='TRY AGAIN';}
  $('tower-ladder').innerHTML=tower.ladder.map((f,n)=>`<div class="${n<tower.index||tower.done?'done':n===tower.index?'next':''}"><img src="${portrait(f.id)}" alt=""${f.echo?' class="echo-face"':''}>${f.name}</div>`).join('')+((tower.kind==='forgotten'||tower.reveal||tower.boss)?(tower.boss?`<div class="${tower.done?'done':'next'}"><img src="${portrait('majic')}" alt="">MAJIC</div>`:`<div class="${tower.reveal?'next':''}"><span class="q">?</span>???</div>`):'');
 }
 $('winner-title').textContent=title;$('winner-copy').textContent=copy;
 if(soundOn&&AU){const champId=draw_?null:(p1won?picks[0].id:picks[1].id);
  const line=title==='KING OF THE JUNGLE'?'voice.king-of-the-jungle':flawless?'voice.flawless-victory':cpu2&&!draw_?(p1won?'voice.you-win':'voice.you-lose'):champId?'voice.'+champId+'-wins':null;
  if(line&&title!=='KING OF THE JUNGLE')setTimeout(()=>AU.now(line),450)}
 const champ=draw_?picks[0]:(p1won?picks[0]:picks[1]);$('winner-portrait').src=portrait(champ.id);$('winner-portrait').alt=champ.name;
 $('winner-portrait').classList.toggle('echo-face',!!(tower&&tower.reveal));
 $('result').classList.toggle('defeat',cpu2&&!p1won&&!draw_);
 pad.classList.add('hidden');document.body.classList.remove('fighting','paused','touch');cancelAnimationFrame(raf);
 if(tower&&tower.done)champion(tower.player);else show('result');
}
$('tower-next').onclick=()=>{
 if(tower.reveal){tower.reveal=false;tower.boss=true;picks=[tower.player,MAJIC];arena=ARENAS[5];
  return storyCard({dark:1,title:'THE SUMMIT',text:STORY.forgotten.summit},()=>storyCard({dark:1,title:'THE TRUTH',text:STORY.forgotten.reveal},start))}
 picks=[tower.player,tower.ladder[tower.index]];arena=towerArena();
 if(tower.kind==='forgotten')return storyCard({dark:1,title:`ECHO ${tower.index+1}`,text:STORY.forgotten.echoes[tower.index]},start);
 start()};
$('rematch').onclick=()=>{if(tower){if(tower.boss&&!tower.done){picks=[tower.player,MAJIC];arena=ARENAS[5];return start()}if(tower.reveal)tower.reveal=false;if(tower.done){tower.done=false;tower.boss=false;tower.speechDone=false;tower.index=0}else if(game&&total(game.fighters[0])>total(game.fighters[1])&&tower.index>0)tower.index--;picks=[tower.player,tower.ladder[tower.index]];arena=towerArena()}start()};
/* ---------- Tower champion: saved crowns, ending scene, secret unlock ---------- */
const SAVE={get(k,d){try{const v=localStorage.getItem('kotj.'+k);return v==null?d:JSON.parse(v)}catch(_){return d}},set(k,v){try{localStorage.setItem('kotj.'+k,JSON.stringify(v))}catch(_){}}};
const crowns=()=>SAVE.get('crowns',[]);
const STORY=window.KOTJ_STORY||{fighters:{},forgotten:{echoes:[]}};STORY.forgotten=STORY.forgotten||{echoes:[]};STORY.forgotten.echoes=STORY.forgotten.echoes||[];
const storyOf=id=>(STORY.fighters||{})[id]||{};
const BASE_IDS=KOTJ_ROSTER.filter(f=>f.id!=='majic').map(f=>f.id);
const forgottenOpen=()=>!!SAVE.get('forgotten',false);
function forgottenMenu(){const b=document.querySelector('.forgotten-btn');if(b)b.classList.add('hidden')}
// The fighter shown beside a story card: a silhouette in the shadows that is lit a little more each part.
let figTimer=0;
function storyFig(o){
 const el=$('story-fig');clearInterval(figTimer);$('story').classList.toggle('has-fig',!!o);
 if(!o){el.style.display='none';return}
 const A=(HD[o.id]||{}).anims||{},anim=A[o.anim]?o.anim:'idle',[n,fw,fh]=A[anim]||[1,1,1];
 el.style.display='block';el.style.aspectRatio=fw+'/'+fh;
 el.style.backgroundImage=`url(assets/characters/${o.id}/frames-hd/${anim}.webp?v=6.4)`;el.style.backgroundSize=`${n*100}% 100%`;
 const L=o.light;el.style.filter=L>=1?'drop-shadow(0 0 28px rgba(255,200,90,.85)) drop-shadow(0 0 4px rgba(255,230,160,.9))':
  `brightness(${.04+L*.9}) contrast(${1.3-L*.3}) drop-shadow(0 0 ${10+L*14}px rgba(${L>.5?'255,190,90':'160,120,255'},${.55+L*.3}))`;
 let i=0;const step=()=>{el.style.backgroundPosition=n>1?`${(i%n)*100/(n-1)}% 0`:'0 0';i=o.hold&&i>=n-1?n-1:i+1};step();figTimer=setInterval(step,o.hold?130:120);
}
// One story card; skipped entirely when its text is empty.
function storyCard(o,next){
 const t=(o.text||'').trim();if(!t)return next();
 const sc=$('story');sc.classList.toggle('dark',!!o.dark);
 const im=$('story-face');if(o.face){im.src=portrait(o.face);im.classList.remove('none')}else im.classList.add('none');
 $('story-eyebrow').textContent=o.eyebrow||'';$('story-title').textContent=o.title||'';
 $('story-text').innerHTML=(o.slow?t.split(/\n/):t.split(/\n+/)).map(x=>x.trim()===''?'<p class="gap"></p>':'<p>'+x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')+'</p>').join('');
 $('story').classList.toggle('slow',!!o.slow);clearTimeout(window.__slowT);
 if(o.slow){const ps=[...$('story-text').children];ps.forEach(p=>p.classList.add('wait'));let k=0;const nb=$('story-next');nb.classList.add('wait');
  const card=document.querySelector('.story-card');const step=()=>{if(k<ps.length){const p=ps[k++];p.classList.remove('wait');card.scrollTo({top:card.scrollHeight,behavior:'smooth'});window.__slowT=setTimeout(step,p.classList.contains('gap')?400:o.slow)}else nb.classList.remove('wait')};window.__slowT=setTimeout(step,900)}
 storyFig(o.fig);
 $('story-next').onclick=()=>{ac();storyFig(null);next()};show('story');setTimeout(()=>$('story-next').focus({preventScroll:true}),50);
}
const NEW_FIGHTERS=[
 {id:'snake',name:'SNAKE',icon:'🐍',style:'THE VENOMOUS KING',bio:'Patient, cold and deadly. Strikes from range with venom, crushes up close with a coil trap.',power:8,speed:8,defense:6,color:'#a88a2a'},
 {id:'eagle',name:'EAGLE',icon:'🦅',style:'THE SKY REAPER',bio:'Rules the air. Talons, beak and wing slashes, with a skyfall dive that hits like lightning.',power:7,speed:10,defense:5,color:'#a8742c'},
 {id:'stag',name:'STAG',icon:'🦌',style:'THE IRON HORN',bio:'An unstoppable charger with iron antlers, crushing kicks and an earth-shaking stomp.',power:9,speed:6,defense:8,color:'#9a6a34'}];
const unlockedNew=()=>SAVE.get('unlocked',[]);
function addUnlocked(){for(const f of NEW_FIGHTERS)if(unlockedNew().includes(f.id)&&!roster.includes(f)){const i=roster.indexOf(MAJIC);i>=0?roster.splice(i,0,f):roster.push(f)}}
const MAJIC={id:'majic',name:'MAJIC',icon:'👑',style:'THE JUNGLE TITAN · SECRET BOSS',bio:'All 11 beasts in one: lion mane, elephant tusks, eagle wings, serpents, a crocodile tail, tiger stripes and the frost-white fur of a snow leopard. Frost Strike, Jungle Rage and the Titan Fury Ultra.',power:13,speed:6,defense:14,color:'#d9a43a'};
const secretUnlocked=()=>!!SAVE.get('secret',false);
const LOCK_SVG='<svg viewBox="0 0 24 24" width="44%" fill="none" stroke="#e8b95b" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
function mysteryTile(){
 const open=secretUnlocked(),b=document.createElement('button');
 b.className='fighter-tile mystery'+(open?' unlocked':'');
 b.innerHTML=`<div class="mystery-art">${open?'<span>?</span>':LOCK_SVG}</div><strong>${open?'???':'LOCKED'}</strong>`;
 b.onclick=()=>{document.querySelectorAll('.fighter-tile').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');
  $('fighter-number').textContent='12';$('fighter-portrait').src='assets/ui/crown.webp';$('fighter-name').textContent='???';
  $('fighter-style').textContent='SECRET CHALLENGER';
  $('fighter-bio').textContent='Something waits beyond the top of the Tower. Conquer it to find out.';
  ['power-stat','speed-stat','defense-stat'].forEach(id=>$(id).textContent='?');$('confirm-fighter').disabled=true};
 return b;
}
document.querySelectorAll('.build-tag').forEach(e=>e.textContent=$('cover-build').textContent); // one build number everywhere
const CROWN_AT={badger:[.66,.13,.2],wolf:[.6,.12,.2],hyena:[.62,.11,.2],leopard:[.6,.18,.17],jaguar:[.68,.1,.2],crocodile:[.62,.1,.2],
 lion:[.63,.1,.21],tiger:[.69,.1,.2],grizzly:[.6,.11,.2],hippo:[.62,.12,.2],elephant:[.5,.11,.21],snake:[.44,.16,.17],eagle:[.72,.24,.16],stag:[.5,.29,.16],majic:[.55,.13,.13]};
let champRaf=0;
function champion(f){
 if(tower&&tower.boss&&!tower.speechDone){tower.speechDone=true;const txt=(STORY.forgotten.majicSpeech||'').split('[FIGHTER]').join(f.name);
  return storyCard({dark:1,slow:2600,fig:{id:'majic',anim:'hit_heavy',light:.22,hold:1},eyebrow:'THE JUNGLE TITAN FALLS',title:'MAJIC',text:txt},()=>champion(f))}
 const secret=!!tower.boss,list=crowns();let firstCrown=false,awaken=false,newUnlock=false,newFighter=null;const notes=[];
 if(tower.kind!=='forgotten'){firstCrown=!list.includes(f.id);if(firstCrown){list.push(f.id);SAVE.set('crowns',list)}}
if(tower.kind!=='forgotten'){const left=NEW_FIGHTERS.filter(n=>!unlockedNew().includes(n.id));
  if(left.length){const nf=left[Math.floor(Math.random()*left.length)];SAVE.set('unlocked',[...unlockedNew(),nf.id]);addUnlocked();newFighter=nf;
   notes.push(`NEW FIGHTER UNLOCKED · ${nf.name}`)}}
 if(secret){newUnlock=!secretUnlocked();if(newUnlock){SAVE.set('secret',true);if(!roster.includes(MAJIC))roster.push(MAJIC);notes.push('MAJIC HAS JOINED THE ROSTER')}}
 $('champ-unlock').textContent=notes.join(' · ');
 forgottenMenu();
 $('champ-name').textContent=f.name;
 $('champ-copy').textContent=secret?(((storyOf(f.id).trueEnding||'').split(/(?<=[.!?])\s/)[0])||`${f.name} reached the summit and defeated MAJIC.`):(`${f.name} conquered all ${tower.ladder.length} challengers and takes the crown in Majic's Lair.`);
$('champ-crowns').textContent=tower.kind==='forgotten'?'':`TOWER CROWNS: ${list.filter(id=>BASE_IDS.includes(id)).length} / ${BASE_IDS.length}`+(firstCrown?' · NEW CROWN!':'');
 $('champ-unlock').classList.toggle('hidden',!(newUnlock||awaken||newFighter));
 document.querySelector('#champion .champ-text h2').textContent=secret?'THE TRUE KING':'KING OF THE JUNGLE';
 const cr=$('champ-credits');cr.innerHTML=`<div class="roll"><h3>KING OF THE JUNGLE</h3><p class="big">Created and Developed by J. Hardy</p>
  <p class="lbl">THE FIGHTERS</p><p>${roster.map(r=>r.name).join(' · ')}</p>
  <p class="lbl">THE ARENAS</p><p>${ARENAS.map(a=>a.name).join(' · ')}</p>
  <p class="lbl">ANNOUNCER</p><p>Holden</p><p class="big">Thanks for playing</p></div>`;
 cr.classList.remove('go');void cr.offsetWidth;cr.classList.add('go');
 show('champion');setBackdrop('assets/arenas/royal-colosseum.webp');
 if(soundOn){if(AU&&AU.loaded('voice.king-of-the-jungle'))setTimeout(()=>AU.now('voice.king-of-the-jungle'),900);else setTimeout(()=>speak('King of the jungle!'),900)}
 const cv=$('champ-canvas'),cx=cv.getContext('2d'),A=(HD[f.id]||{}).anims||{},meta=A.idle||[8,1,1,0,0],n=meta[0];
 const im=new Image(),bg=new Image(),crown=new Image();let tops=null;
 im.onload=()=>{const w=im.width/n,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);
  // where each fighter's head is in their standing frame: [x across the frame, crown bottom, crown width] as fractions
  const P=CROWN_AT[f.id]||[.55,.09,.18],c2=document.createElement('canvas');c2.width=im.width;c2.height=im.height;const g2=c2.getContext('2d');g2.drawImage(im,0,0);
  const d=g2.getImageData(0,0,c2.width,c2.height).data,H_=im.height;
  // the head moves a little from frame to frame: measure the top of the head near the crown spot in every frame and follow it
  const head=i=>{const x0=Math.max(0,Math.floor(i*w+(P[0]-.22)*w)),x1=Math.min(Math.floor((i+1)*w),Math.floor(i*w+(P[0]+.22)*w));
   for(let y=Math.max(0,Math.floor((P[1]-.2)*H_));y<H_;y++){let sx=0,k=0;for(let x=x0;x<x1;x++)if(d[(y*c2.width+x)*4+3]>140){sx+=x;k++}
    if(k>=3)return{y,x:sx/k-i*w}}return{y:P[1]*H_,x:P[0]*w}};
  const h0=head(0);tops=[];for(let i=0;i<n;i++){const h=head(i);tops.push({hx:P[0]*w+(h.x-h0.x)*.7,t:P[1]*H_+(h.y-h0.y),hw:P[2]*H_})}};
 im.src=`assets/characters/${f.id}/frames-hd/idle.webp?v=6.4`;bg.src='assets/arenas/royal-colosseum.webp';crown.src='assets/ui/crown.webp';
 const conf=[];for(let i=0;i<140;i++)conf.push({x:Math.random(),y:-Math.random()*1.2,v:.08+Math.random()*.12,r:Math.random()*6.28,s:.5+Math.random(),c:['#ffd36b','#e8b95b','#fff3c4','#b94738'][i%4]});
 const t0=performance.now();let lt=t0;cancelAnimationFrame(champRaf);
 (function draw(now){
  if($('champion').classList.contains('hidden'))return;
  const dt=Math.min(.05,(now-lt)/1000),t=(now-t0)/1000;lt=now;
  const dpr=Math.min(2,window.devicePixelRatio||1),W=cv.clientWidth*dpr,H=cv.clientHeight*dpr;if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  cx.clearRect(0,0,W,H);
  if(bg.complete&&bg.naturalWidth){const z=1.08+t*.004,s=Math.max(W/bg.width,H/bg.height)*z;cx.drawImage(bg,(W-bg.width*s)/2,(H-bg.height*s)/2,bg.width*s,bg.height*s)}
  const vg=cx.createRadialGradient(W/2,H*.6,H*.1,W/2,H*.6,H*.9);vg.addColorStop(0,'rgba(0,0,0,.15)');vg.addColorStop(1,'rgba(0,0,0,.82)');cx.fillStyle=vg;cx.fillRect(0,0,W,H);
  const fx=W/2,fy=H*.86;
  cx.save();cx.translate(fx,H*.5);cx.rotate(t*.15);cx.globalCompositeOperation='lighter';
  for(let i=0;i<14;i++){cx.rotate(Math.PI/7);const gr=cx.createLinearGradient(0,0,H,0);gr.addColorStop(0,'rgba(255,205,110,.22)');gr.addColorStop(1,'rgba(255,205,110,0)');cx.fillStyle=gr;cx.beginPath();cx.moveTo(0,0);cx.lineTo(H*1.2,-H*.07);cx.lineTo(H*1.2,H*.07);cx.fill()}
  cx.restore();
  if(im.complete&&im.naturalWidth){
   const fw=im.width/n,i=Math.floor(t*7)%n,sc=H*.5/im.height,bob=0;
   const dw=fw*sc,dh=im.height*sc,x=fx-meta[3]*(HD[f.id].s||.8)*sc,y=fy-dh+bob;
   cx.save();cx.shadowColor='rgba(255,200,90,.55)';cx.shadowBlur=30*dpr;cx.drawImage(im,i*fw,0,fw,im.height,x,y,dw,dh);cx.restore();
   if(tops&&crown.complete&&crown.naturalWidth){
    // the crown floats down and settles on the fighter's head, then stays there as they breathe
    const T=tops[i],ct=Math.min(1,Math.max(0,(t-1.4)/.9)),e=1-Math.pow(1-ct,3),cw=T.hw*sc,ch=cw*crown.height/crown.width;
    const hx=x+T.hx*sc,hy=y+(T.t+im.height*.02)*sc-ch,cy=-ch+(hy+ch)*e;
    cx.save();cx.globalAlpha=Math.min(1,ct*3);cx.shadowColor='rgba(255,220,120,.9)';cx.shadowBlur=24*dpr;cx.drawImage(crown,hx-cw/2,cy,cw,ch);cx.restore()}}
  if(t>1.9)for(const p of conf){p.y+=p.v*dt;p.r+=dt*4;if(p.y>1.05){p.y=-.05;p.x=Math.random()}
   cx.save();cx.translate(p.x*W,p.y*H);cx.rotate(p.r);cx.fillStyle=p.c;cx.fillRect(-4*dpr*p.s,-2*dpr*p.s,8*dpr*p.s,4*dpr*p.s);cx.restore()}
  champRaf=requestAnimationFrame(draw)})(t0);
}
$('champ-continue').onclick=()=>{cancelAnimationFrame(champRaf);if(tower&&tower.boss){const p=tower.player,S=storyOf(p.id),cl=S.clues||{},clues=[cl[3],cl[6],cl[9]].filter(Boolean).join('\n');
  storyCard({dark:1,fig:{id:p.id,anim:'idle',light:.12},eyebrow:`${p.name} · PART 1`,title:'WHY THEY CAME',text:S.intro},()=>
  storyCard({dark:1,fig:{id:p.id,anim:'walk_forward',light:.35},eyebrow:`${p.name} · PART 2`,title:'THE CLUES',text:clues},()=>
  storyCard({fig:{id:p.id,anim:'idle',light:.65},eyebrow:`${p.name} · PART 3`,title:'THE CROWN',text:S.ending},()=>
  storyCard({fig:{id:p.id,anim:'victory',light:1,hold:1},eyebrow:`${p.name} · PART 4`,title:'THE TRUTH, AT LAST',text:S.trueEnding},()=>
  storyCard({dark:1,eyebrow:'EPILOGUE',title:'',text:STORY.forgotten.trueEnding},()=>storyCard({dark:1,eyebrow:'THE HISTORY OF THE TOWER',title:'',text:STORY.forgotten.history},()=>show('result')))))))}else show('result')};
function clean(){cancelAnimationFrame(raf);game=null;document.body.classList.remove('fighting','paused','touch');pad.classList.add('hidden');for(const k in kb)kb[k]=false;if(window.speechSynthesis)speechSynthesis.cancel()}
function menu(){clean();tower=null;show('menu');AU&&soundOn&&$('menu').classList.contains('started')&&AU.music('music.menu')}
$('pause').onclick=togglePause;
document.querySelectorAll('.blood-btn').forEach(b=>b.onclick=e=>{e.stopPropagation();setBlood((blood+1)%3)});setBlood(blood);
// Full screen (and sideways lock on phones that allow it)
(function(){const b=$('fullscreen'),el=document.documentElement,can=!!(el.requestFullscreen||el.webkitRequestFullscreen);
 if(!can){b.style.display='none';return}
 const label=()=>b.textContent=document.fullscreenElement||document.webkitFullscreenElement?'EXIT FULL SCREEN':'FULL SCREEN';
 b.onclick=async()=>{try{if(document.fullscreenElement||document.webkitFullscreenElement){await (document.exitFullscreen||document.webkitExitFullscreen).call(document)}
  else{await (el.requestFullscreen||el.webkitRequestFullscreen).call(el);try{await screen.orientation.lock('landscape')}catch(_){}}}catch(_){}label()};
 document.addEventListener('fullscreenchange',label);document.addEventListener('webkitfullscreenchange',label)})();$('back-menu').onclick=menu;$('result-menu').onclick=menu;

/* ---------- Rendering ---------- */

// Sprite-sheet fighters: one horizontal strip per animation -> [frames, frameW, frameH, worldScale]
// Standardized fighter frames (KOTJ_V2_Fighter_Animations): one strip per animation.
// anims[name] = [frames, frame w, frame h (stored px), pivot x, pivot y (game units)]; stored at scale s.
const SPRITES={
 snake:{s:0.34,anims:{"idle":[5,132,100,197,279],"walk_forward":[6,99,98,97,276],"walk_back":[6,99,98,97,276],"run":[4,155,102,201,286],"crouch":[4,121,91,122,252],"jump":[5,171,91,252,252],"block":[4,157,96,255,265],"attack_light":[7,191,100,265,282],"bite":[5,162,98,225,279],"attack_heavy":[4,218,88,313,238],"uppercut":[5,180,86,238,233],"special_pounce":[4,155,84,213,235],"special_b":[6,147,82,187,231],"ultra_move":[7,357,117,456,320],"hit_light":[5,105,86,174,235],"hit_heavy":[6,186,86,272,235],"knockdown_getup":[8,186,85,272,231],"victory":[11,203,126,367,354],"defeat":[6,186,86,272,235],"special_c":[5,203,80,276,208],"special_d":[4,212,82,248,211]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[4, 5, 6, 7]],ko:['hit_heavy',5]},
 eagle:{s:0.34,anims:{"idle":[5,114,112,195,315],"walk_forward":[5,131,108,227,304],"walk_back":[5,131,108,227,304],"run":[4,146,112,110,315],"crouch":[4,134,106,198,282],"jump":[5,148,106,154,282],"block":[4,159,107,227,283],"attack_light":[6,195,120,255,322],"bite":[5,232,112,304,301],"attack_heavy":[4,176,116,304,294],"uppercut":[5,211,119,289,301],"special_pounce":[6,179,127,248,343],"special_b":[4,259,120,372,326],"ultra_move":[7,378,125,361,340],"hit_light":[5,133,109,195,280],"hit_heavy":[6,168,107,211,273],"knockdown_getup":[9,168,111,211,287],"victory":[12,180,132,262,372],"defeat":[6,168,107,211,273]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[4, 5, 6, 7, 8]],ko:['hit_heavy',5]},
 stag:{s:0.34,anims:{"idle":[5,110,106,117,300],"walk_forward":[5,137,106,191,300],"walk_back":[5,137,106,191,300],"run":[4,184,106,237,300],"crouch":[4,146,98,177,279],"jump":[5,147,98,155,279],"block":[4,154,101,226,286],"attack_light":[6,199,101,272,276],"bite":[5,227,101,399,276],"attack_heavy":[4,275,89,378,254],"uppercut":[5,218,91,353,258],"special_pounce":[4,278,83,353,235],"special_b":[5,231,84,339,237],"ultra_move":[7,388,120,487,329],"hit_light":[4,121,84,88,226],"hit_heavy":[6,161,82,177,223],"knockdown_getup":[9,175,87,219,237],"victory":[12,191,147,283,406],"defeat":[6,161,82,177,223],"special_c":[5,162,82,138,230],"special_d":[5,214,79,226,223]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[4, 5, 6, 7, 8]],ko:['hit_heavy',5]},
 majic:{s:0.34,anims:{"idle":[4,254,144,433,399],"walk_forward":[4,277,144,449,396],"walk_back":[4,277,144,449,396],"run":[4,277,144,449,396],"dash":[3,298,134,424,371],"crouch":[3,254,160,424,447],"jump":[5,295,134,424,371],"block":[3,122,122,278,335],"attack_light":[4,269,131,303,374],"attack_heavy":[4,229,160,350,451],"bite":[4,269,131,303,374],"uppercut":[4,227,160,350,451],"special_pounce":[4,298,134,424,371],"special_b":[6,354,99,542,271],"special_c":[5,247,91,364,257],"special_d":[4,187,97,287,257],"ultra_move":[8,257,161,374,451],"hit_light":[4,192,92,273,260],"hit_heavy":[6,247,94,355,257],"knockdown_getup":[10,247,119,355,330],"victory":[7,273,159,421,444],"defeat":[5,247,94,355,257]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','special_c','special_d','attack_heavy'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[6, 7, 8, 9]],ko:['hit_heavy',5]},
 badger:{s:0.34,anims:{"idle":[9,68,73,99,215],"walk_forward":[8,73,71,88,208],"walk_back":[6,52,72,72,211],"run":[7,115,69,144,203],"crouch":[4,74,60,108,176],"block":[6,61,70,88,206],"attack_light":[7,88,70,122,206],"attack_heavy":[8,86,76,98,223],"claw_swipe":[6,99,70,122,207],"bite":[5,102,72,110,211],"uppercut":[8,75,79,94,233],"jump":[7,64,71,94,208],"pounce":[8,96,60,142,176],"special_earth_slam":[7,81,61,119,179],"shadow_rampage":[10,70,61,104,179],"hit_light":[6,84,78,130,228],"hit_heavy":[7,87,76,128,223],"knockdown_getup":[8,95,76,140,225],"victory":[7,87,83,120,245],"defeat":[6,82,67,120,196]},
  double:['attack_heavy','claw_swipe'],special:'special_earth_slam',shadow:'shadow_rampage',ultra:['attack_light','attack_heavy','uppercut','claw_swipe'],
  fall:['hit_heavy',[0,1,2,3,4]],getup:['knockdown_getup',[4,5,6,7]],ko:['hit_heavy',4]},
 crocodile:{s:0.34,anims:{"idle":[9,95,87,140,256],"walk_forward":[7,131,85,164,251],"walk_back":[6,120,85,137,251],"run":[7,149,79,157,233],"block":[6,92,80,134,236],"attack_light":[7,117,86,144,254],"attack_heavy":[6,157,85,207,251],"bite":[6,145,77,170,227],"uppercut":[7,122,79,136,233],"jump":[7,118,74,174,218],"special_pounce":[6,175,76,258,224],"hit_light":[6,106,77,187,227],"hit_heavy":[8,118,76,174,224],"knockdown_getup":[14,133,68,196,200],"victory":[8,86,103,128,304],"defeat":[7,128,68,188,201]},
  double:['bite','attack_heavy'],special:'special_pounce',shadow:null,ultra:['bite','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 elephant:{s:0.34,anims:{"idle":[9,92,112,138,330],"walk_forward":[7,136,108,162,318],"walk_back":[6,124,107,140,314],"run":[7,170,102,172,299],"block":[6,109,101,159,296],"attack_light":[7,131,109,178,321],"attack_heavy":[6,194,107,258,314],"bite":[6,221,97,247,285],"uppercut":[7,150,99,186,292],"jump":[7,138,94,202,277],"special_pounce":[6,228,98,336,288],"hit_light":[6,133,98,236,288],"hit_heavy":[8,150,98,221,288],"knockdown_getup":[14,165,87,242,256],"victory":[8,113,132,168,387],"defeat":[7,158,89,232,263]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','attack_heavy','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 grizzly:{s:0.34,anims:{"idle":[9,86,104,127,307],"walk_forward":[8,118,98,157,287],"walk_back":[6,102,98,142,287],"run":[7,141,92,146,271],"block":[6,107,94,156,277],"attack_light":[7,132,98,160,287],"attack_heavy":[6,145,97,198,284],"bite":[6,160,86,172,254],"uppercut":[7,128,87,158,257],"jump":[7,116,84,171,248],"special_pounce":[6,163,85,239,251],"hit_light":[6,127,90,220,264],"hit_heavy":[8,137,91,202,267],"knockdown_getup":[14,156,79,230,231],"victory":[8,112,120,173,353],"defeat":[7,145,84,213,248]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 hippo:{s:0.34,anims:{"idle":[9,97,107,142,316],"walk_forward":[8,112,103,154,304],"walk_back":[6,108,104,137,307],"run":[7,153,96,143,283],"block":[6,105,97,154,286],"attack_light":[7,131,99,164,290],"attack_heavy":[6,167,100,216,293],"bite":[6,181,88,182,259],"uppercut":[7,133,90,150,266],"jump":[7,125,87,184,255],"special_pounce":[6,163,90,240,266],"hit_light":[6,137,95,244,279],"hit_heavy":[8,150,94,221,276],"knockdown_getup":[14,155,80,228,235],"victory":[8,120,124,184,366],"defeat":[7,133,73,195,214]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','attack_heavy','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 hyena:{s:0.34,anims:{"idle":[9,69,82,102,240],"walk_forward":[8,93,81,121,239],"walk_back":[6,77,89,88,262],"run":[7,136,81,111,237],"block":[6,86,81,126,239],"attack_light":[7,104,84,130,248],"attack_heavy":[6,154,84,198,248],"bite":[6,131,80,166,234],"uppercut":[7,118,79,129,231],"jump":[7,109,70,161,205],"special_pounce":[6,146,72,215,211],"hit_light":[6,98,78,173,228],"hit_heavy":[8,112,78,164,228],"knockdown_getup":[14,122,68,180,200],"victory":[8,89,104,138,305],"defeat":[7,115,74,170,219]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['bite','attack_heavy','uppercut','attack_light'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 jaguar:{s:0.34,anims:{"idle":[9,82,84,128,246],"walk_forward":[8,107,83,162,244],"walk_back":[6,81,84,104,246],"run":[7,120,80,122,235],"block":[6,86,81,127,238],"attack_light":[7,112,84,132,246],"attack_heavy":[6,137,84,174,246],"bite":[6,144,77,148,226],"uppercut":[7,114,79,128,232],"jump":[7,102,73,150,215],"special_pounce":[6,160,71,235,209],"hit_light":[6,103,78,174,229],"hit_heavy":[8,113,77,166,226],"knockdown_getup":[14,125,67,184,197],"victory":[8,93,102,143,299],"defeat":[7,120,74,177,218]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','uppercut','attack_light'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 leopard:{s:0.34,anims:{"idle":[5,95,98,118,275],"walk_forward":[5,86,98,118,275],"walk_back":[5,93,98,137,275],"run":[6,140,82,201,214],"dash":[4,169,78,179,214],"crouch":[3,104,81,150,220],"jump":[6,108,81,128,220],"block":[3,76,81,67,220],"attack_light":[6,109,78,153,208],"attack_heavy":[5,118,76,208,204],"bite":[5,133,73,201,195],"uppercut":[5,119,75,184,201],"special_pounce":[5,184,73,281,195],"special_b":[6,114,88,179,230],"special_c":[5,163,77,265,198],"special_d":[14,133,76,201,201],"ultra_move":[5,185,90,270,230],"hit_light":[3,109,87,128,224],"hit_heavy":[9,175,94,259,233],"knockdown_getup":[11,176,107,259,272],"victory":[5,140,191,224,527],"defeat":[9,175,94,259,233]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','special_d','attack_heavy','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[6,7,8,9,10]],ko:['hit_heavy',8]},
 lion:{s:0.34,anims:{"idle":[9,82,89,136,263],"walk_forward":[8,101,86,151,254],"walk_back":[6,85,86,110,254],"run":[7,118,81,132,239],"block":[6,83,83,122,245],"attack_light":[7,119,87,142,257],"attack_heavy":[6,147,87,182,257],"bite":[6,144,79,168,233],"uppercut":[7,117,80,123,236],"jump":[7,101,76,149,224],"special_pounce":[6,178,77,262,227],"hit_light":[6,101,81,178,239],"hit_heavy":[8,116,80,171,236],"knockdown_getup":[14,134,67,197,198],"victory":[8,88,109,130,322],"defeat":[7,118,76,174,224]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','uppercut','attack_light'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 tiger:{s:0.34,anims:{"idle":[9,83,89,126,263],"walk_forward":[8,109,86,154,254],"walk_back":[6,85,86,114,254],"run":[7,133,79,128,233],"block":[6,84,83,122,245],"attack_light":[7,104,86,131,254],"attack_heavy":[6,150,86,199,254],"bite":[6,147,78,153,230],"uppercut":[7,117,78,133,230],"jump":[7,109,74,161,218],"special_pounce":[6,154,76,227,224],"hit_light":[6,108,78,188,230],"hit_heavy":[8,122,78,180,230],"knockdown_getup":[14,131,70,192,206],"victory":[8,98,105,155,310],"defeat":[7,120,75,177,221]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['attack_heavy','attack_light','attack_heavy','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 wolf:{s:0.34,anims:{"idle":[10,73,85,107,249],"walk_forward":[9,83,77,114,227],"walk_back":[7,75,78,101,230],"run":[8,160,79,171,233],"block":[6,83,83,122,245],"attack_light":[7,116,83,130,245],"attack_heavy":[6,148,83,190,245],"bite":[6,138,78,166,229],"uppercut":[7,112,81,130,239],"jump":[7,110,77,162,227],"special_pounce":[6,184,74,270,218],"hit_light":[6,99,84,165,248],"hit_heavy":[8,114,84,167,248],"knockdown_getup":[14,123,75,182,221],"victory":[8,92,112,135,330],"defeat":[7,129,81,189,239]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['attack_light','attack_heavy','uppercut','bite'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]}
};
const spriteImg={};for(const id in SPRITES){spriteImg[id]={};for(const k in SPRITES[id].anims){const im=new Image();im.src='assets/characters/'+id+'/frames/'+k+'.webp?v=6.4';spriteImg[id][k]=im}}
// High-detail art for big, sharp screens (laptops, TVs, 4K): loaded per fight, only for the two fighters in it.
const HD=typeof SPRITES_HD!=='undefined'?SPRITES_HD:{},spriteHD={};
function wantHD(){const r=$('game-canvas').getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,3);return r.height*d>=560}
function loadHD(id){if(!HD[id]||spriteHD[id])return;spriteHD[id]={};for(const k in HD[id].anims){const im=new Image();im.decoding='async';im.src='assets/characters/'+id+'/frames-hd/'+k+'.webp?v=6.4';spriteHD[id][k]=im}}
const c=$('game-canvas').getContext('2d');
function draw(){
 const canvas=$('game-canvas'),rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,3),w=1100,h=520;
 // Render at the screen's real pixel count, up to 4K (3840 x 2160).
 let pw=Math.max(1,Math.round(rect.width*dpr*RES.scale)),ph=Math.max(1,Math.round(rect.height*dpr*RES.scale));const cap=Math.min(1,3840/pw,2160/ph);pw=Math.round(pw*cap);ph=Math.round(ph*cap);
 if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph}
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,pw,ph);c.lineJoin='round';c.miterLimit=2;
 // ---- Fighting-game camera: fills any screen shape, follows the fighters, zooms in when they're close.
 const aspect=pw/ph,F=game.fighters,gap=Math.abs(F[0].x-F[1].x);
 let vh=Math.min(570,1210/aspect);                                    // largest view that stays inside the arena art
 const want=1;   // steady camera on every device: it pans with the fighters but never zooms
 const kz=1-Math.pow(.92,frameDt*60),kp=1-Math.pow(.88,frameDt*60);cam.z+=(want-cam.z)*kz;vh/=cam.z;const vw=vh*aspect;
 const air=Math.min(F[0].y,F[1].y);                                   // keep jumping fighters in shot
 let tx=(F[0].x+F[1].x)/2-vw/2,ty=400-vh*.84+Math.min(0,air)*.5;
 tx=Math.max(-60,Math.min(1160-vw,tx));ty=Math.max(-30,Math.min(550-vh,ty));
 if(cam.snap){cam.x=tx;cam.y=ty;cam.snap=false}else{cam.x+=(tx-cam.x)*kp;cam.y+=(ty-cam.y)*kp}
 const sc=ph/vh;c.setTransform(sc,0,0,sc,-cam.x*sc,-cam.y*sc);
 if(game.shake>0)c.translate((Math.random()-.5)*22*Math.min(1,game.shake/.3),(Math.random()-.5)*14*Math.min(1,game.shake/.3));
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 const t=performance.now()/1000;
 const bgi=arenaImg[arena.id];
 if(bgi&&bgi.complete&&bgi.naturalWidth){c.drawImage(bgi,-60,-30,w+120,h+60);
  // soft vignette + floor shade so fighters stay readable on bright stages
  const vg=c.createLinearGradient(0,0,0,h);vg.addColorStop(0,'rgba(0,0,0,.35)');vg.addColorStop(.35,'rgba(0,0,0,.05)');vg.addColorStop(.75,'rgba(0,0,0,.08)');vg.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=vg;c.fillRect(-60,-60,w+120,h+120);
  // flicker on the braziers
  c.globalAlpha=.02+Math.random()*.025;c.fillStyle='#ffb04a';c.fillRect(-60,-60,w+120,h+120);c.globalAlpha=1;
 }else{
 const sky=c.createLinearGradient(0,0,0,405);sky.addColorStop(0,'#142a25');sky.addColorStop(.55,'#294538');sky.addColorStop(1,'#536044');c.fillStyle=sky;c.fillRect(-60,-60,w+120,465);
 c.globalAlpha=.2;c.fillStyle='#e3bd71';c.beginPath();c.arc(550,105,108,0,Math.PI*2);c.fill();c.globalAlpha=1;
 for(let x=-60;x<1160;x+=42){c.fillStyle=x%84?'#10271f':'#183329';c.beginPath();c.arc(x,112+(Math.abs(x)%5)*8,54,0,Math.PI*2);c.fill();}
 c.fillStyle='#182a23';c.fillRect(-60,188,1220,205);c.fillStyle='#354638';c.fillRect(395,168,310,225);c.fillStyle='#17251e';c.fillRect(435,192,230,201);
 c.fillStyle='#6f6547';for(let x=35;x<1100;x+=145){c.fillRect(x,188,24,210);c.fillRect(x-10,184,44,13);c.fillRect(x-5,220,34,7);}
 c.globalAlpha=.42;c.fillStyle='#9dc8c1';c.fillRect(495,195,110,195);c.globalAlpha=.22;c.fillStyle='#e6fffb';for(let x=500;x<610;x+=13){const off=(t*160+x*7)%180;c.fillRect(x,200+off*.3,3,60);c.fillRect(x+5,200+((off+90)%180),2,40);}c.globalAlpha=1;
 for(const tx of [85,1015]){c.fillStyle='#766044';c.fillRect(tx-7,260,14,130);c.fillStyle='#ffb84d';c.shadowColor='#ff9b32';c.shadowBlur=22;c.beginPath();c.ellipse(tx,250+Math.sin(t*9+tx)*1.5,10,22+Math.sin(t*13+tx)*3,0,0,Math.PI*2);c.fill();c.shadowBlur=0;}
 const floor=c.createLinearGradient(0,395,0,520);floor.addColorStop(0,'#786747');floor.addColorStop(1,'#29251d');c.fillStyle=floor;c.fillRect(-60,395,1220,185);c.fillStyle='#b89a5c';c.fillRect(-60,393,1220,4);
 c.strokeStyle='#b69a61';c.globalAlpha=.62;c.lineWidth=3;c.beginPath();c.ellipse(550,455,142,35,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(550,455,105,24,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;
 c.strokeStyle='#4c422e';c.lineWidth=1;for(let x=0;x<1100;x+=110){c.beginPath();c.moveTo(x,405);c.lineTo(x+25,520);c.stroke();}
 }
 // Ultra / Instinct darken the stage so the fighters pop.
 const dim=game.ultra?.55:game.fighters.some(f=>f.instinct)?.18:0;if(dim){c.fillStyle=`rgba(10,0,20,${dim})`;c.fillRect(-60,-60,w+120,h+120)}
 drawStains();
 game.fighters.forEach((f,i)=>{f.trail.forEach(p=>{c.save();c.globalAlpha=p.t*1.2;c.filter='hue-rotate(220deg) saturate(3)';drawFighter({...f,x:p.x,y:p.y,dir:p.dir,hitFlash:0,trail:[]},i,true);c.restore()})});
 game.fighters.forEach((f,i)=>drawFighter(f,i));
 drawFx();
 {const s=Math.min(pw/w,ph/h);c.setTransform(s,0,0,s,(pw-w*s)/2,(ph-h*s)/2);}
 if(game.flash>0){c.fillStyle=`rgba(255,255,255,${Math.min(.75,game.flash*.6)})`;c.fillRect(-w,-h,3*w,3*h)}
 drawComboCounters();drawBanner();
 if(paused){c.fillStyle='#000a';c.fillRect(-w,-h,3*w,3*h);c.fillStyle='#f5ecd8';c.font='900 54px Impact,"Barlow Condensed",sans-serif';c.textAlign='center';c.fillText('PAUSED',550,270);}
}
function drawStains(){
 if(!blood||!game.stains.length)return;
 for(const s of game.stains){c.globalAlpha=s.a;c.fillStyle=s.shade<.5?'#5a0608':'#7a0b0d';c.beginPath();c.ellipse(s.x,s.y,s.rx,s.ry,0,0,Math.PI*2);c.fill();
  c.globalAlpha=s.a*.35;c.fillStyle='#c0262a';c.beginPath();c.ellipse(s.x-s.rx*.2,s.y-s.ry*.25,s.rx*.4,s.ry*.3,0,0,Math.PI*2);c.fill()}
 c.globalAlpha=1;
}
function drawFx(){
 for(const p of game.fx){const k=1-p.t/p.life;
  if(p.kind==='spark'){c.strokeStyle=p.color;c.globalAlpha=k;c.lineWidth=3;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.03,p.y-p.vy*.03);c.stroke()}
  else if(p.kind==='blood'){c.globalAlpha=1;c.fillStyle=p.shade<.5?'#8a0c10':'#b3161b';c.beginPath();
   const sp=Math.min(3,Math.hypot(p.vx,p.vy)/260);c.ellipse(p.x,p.y,p.r*(1+sp*.6),p.r,Math.atan2(p.vy,p.vx),0,Math.PI*2);c.fill()}
  else if(p.kind==='mist'){c.globalAlpha=.35*k;c.fillStyle='#9c1015';c.beginPath();c.arc(p.x,p.y,p.r*(1+p.t*2.5),0,Math.PI*2);c.fill()}
  else if(p.kind==='ring'){c.strokeStyle=p.color;c.globalAlpha=k;c.lineWidth=5*k;c.beginPath();c.arc(p.x,p.y,20+p.t*420,0,Math.PI*2);c.stroke()}
  else if(p.kind==='text'){c.globalAlpha=Math.min(1,k*2);c.font='900 30px Impact,"Barlow Condensed",sans-serif';c.textAlign='center';c.lineWidth=6;c.strokeStyle='#000';c.strokeText(p.text,p.x,p.y);c.fillStyle=p.color;c.fillText(p.text,p.x,p.y)}
 }c.globalAlpha=1;
}
function drawComboCounters(){
 game.fighters.forEach((f,i)=>{if(f.combo<2)return;const x=i?1060:40,al=i?'right':'left';
  c.textAlign=al;c.font='900 58px Impact,"Barlow Condensed",sans-serif';c.lineWidth=8;c.strokeStyle='#000';
  const g=c.createLinearGradient(0,60,0,120);g.addColorStop(0,'#fff6c8');g.addColorStop(1,'#ff9a1f');
  c.strokeText(f.combo,x,118);c.fillStyle=g;c.fillText(f.combo,x,118);
  c.font='900 22px Impact,"Barlow Condensed",sans-serif';const lbl='HITS'+(rankName(f.combo)?' · '+rankName(f.combo):'');c.lineWidth=5;c.strokeText(lbl,x,146);c.fillStyle='#ffe9a8';c.fillText(lbl,x,146);
  if(f.breakWindow>0){c.fillStyle='#ffd36b';c.globalAlpha=.85;c.font='900 16px Inter';c.fillText('▲ BREAK NOW',x,170);c.globalAlpha=1}
 });
 game.fighters.forEach((f,i)=>{if(f.lockout>0){c.textAlign=i?'right':'left';c.font='900 18px Inter';c.fillStyle='#ff5a4a';c.fillText('LOCKOUT '+f.lockout.toFixed(1),i?1060:40,195)}});
}
function drawBanner(){
 const b=game.banner;if(!b)return;const k=b.t/b.life,s=k<.12?1.6-k/.12*.6:1,a=k>.8?(1-k)/.2:1;
 c.save();c.translate(550,235);c.scale(s,s);c.globalAlpha=a;c.textAlign='center';
 c.font='900 84px Impact,"Barlow Condensed",sans-serif';c.lineWidth=12;c.strokeStyle='#000';c.strokeText(b.text,0,0);
 const g=c.createLinearGradient(0,-70,0,10);g.addColorStop(0,'#ffffff');g.addColorStop(.5,b.color);g.addColorStop(1,'#7a2b00');c.fillStyle=g;c.shadowColor=b.color;c.shadowBlur=30;c.fillText(b.text,0,0);c.shadowBlur=0;
 if(b.sub){c.font='900 26px Impact,"Barlow Condensed",sans-serif';c.lineWidth=6;c.strokeText(b.sub,0,40);c.fillStyle='#fff3cf';c.fillText(b.sub,0,40)}
 c.restore();
}
function drawFighter(f,i,ghost){
 const x=f.x,y=400+f.y;c.save();c.translate(x,y);c.scale(f.dir,1);
 const sizeScale={badger:.70,wolf:.82,hyena:.80,leopard:.86,jaguar:.86,crocodile:.90,lion:.88,tiger:.86,grizzly:.98,hippo:1.00,elephant:1.08,majic:1.4,snake:.86,eagle:.9,stag:.92}[f.data.id]||.84;
 if(!ghost){c.globalAlpha=.3;c.fillStyle='#000';c.beginPath();c.ellipse(0,-f.y,58*sizeScale,10,0,0,7);c.fill();c.globalAlpha=1;}
 if(f.instinct&&!ghost){c.shadowColor='#5fe3ff';c.shadowBlur=26;}
 if(SPRITES[f.data.id]&&drawSprite(f)){}
 else{c.scale(sizeScale,sizeScale);drawGeneric(f,i);}
 c.shadowBlur=0;c.restore();
 if(ghost)return;
 if(f.block){c.strokeStyle='#e8c36d';c.lineWidth=3;c.beginPath();c.arc(x+f.dir*20,y-120,65,f.dir>0?-1.4:Math.PI-1.4,f.dir>0?1.4:Math.PI+1.4);c.stroke();}
 if(f.breakWindow>0){c.strokeStyle='#ffd36b';c.globalAlpha=.9;c.lineWidth=4;c.beginPath();c.arc(x,y-140,95+Math.sin(performance.now()/30)*6,0,Math.PI*2);c.stroke();c.globalAlpha=1}
 c.fillStyle='#f4e9cf';c.font='bold 12px Inter';c.textAlign='center';c.fillText((f.ai?'CPU · ':'')+f.data.name,x,470);
}
function phase(f){return f.actionTotal>0?Math.min(.999,Math.max(0,1-f.actionTime/f.actionTotal)):0}
function drawSprite(f){
 const S=SPRITES[f.data.id],A=S.anims,now=performance.now()/1000,p=phase(f);let anim='idle',fr=0;
 const seq=(list,t)=>{const k=list[Math.min(list.length-1,Math.floor(t*list.length))];return k};
 switch(f.action){
  case'walk':{const fwd=Math.sign(f.move||0)===f.dir;anim=fwd?'walk_forward':'walk_back';fr=Math.floor(f.walk*3.2);break}
  case'block':anim='block';fr=Math.min(3,Math.floor(f.blockTime*20));break;
  case'claw':anim='attack_light';fr=Math.floor(p*A.attack_light[0]);break;
  case'double':anim=S.double[f.chain%2];fr=1+Math.floor(p*(A[anim][0]-1));break;
  case'bite':anim='bite';fr=Math.floor(p*A.bite[0]);break;
  case'earthslam':case'pounce':anim=S.special;fr=Math.floor(p*A[anim][0]);break;
  case'ender':anim='uppercut';fr=Math.floor(p*A.uppercut[0]);break;
  case'shadow':if(S.shadow){anim=S.shadow;fr=Math.floor(p*A[anim][0])}else{anim=S.double[Math.floor(p*5)%2];fr=Math.floor(p*5*A[anim][0])%A[anim][0]}break;
  case'ultraseq':anim=S.ultra[Math.floor(now*6)%S.ultra.length];fr=Math.floor(now*36);break;
  case'jump':{anim='jump';const n=A.jump[0];fr=Math.round((Math.max(-560,Math.min(560,f.vy))+560)/1120*(n-3))+1;break}
  case'hit':anim='hit_light';fr=Math.floor(now*18);break;
  case'down':if(f.down>.35){anim=S.fall[0];fr=seq(S.fall[1],(.9-f.down)/.55)}else{anim=S.getup[0];fr=seq(S.getup[1],(.35-f.down)/.35)}break;
  case'knockdown':anim=S.ko[0];fr=Math.min(S.ko[1],Math.floor(f.koTime*9));break;
  case'victory':anim='victory';fr=Math.min(A.victory[0]-1,Math.floor(f.winT*8));break;
  default:anim='idle';fr=Math.floor(now*9);
 }
 let img=spriteImg[f.data.id][anim],meta=A[anim],sc=S.s;
 const hi=spriteHD[f.data.id]&&spriteHD[f.data.id][anim];
 if(hi&&hi.complete&&hi.naturalWidth){img=hi;meta=HD[f.data.id].anims[anim];sc=HD[f.data.id].s}
 if(!img||!img.complete||!img.naturalWidth)return false;
 const [n,fw,fh,px,py]=meta;fr=((fr|0)%n+n)%n;
 if(f.action==='earthslam'&&p>.5){c.save();c.globalAlpha=.8*(1-p);c.strokeStyle='#f4bd43';c.lineWidth=7;const r=40+p*170;c.beginPath();c.ellipse(0,-6-f.y,r,r*.2,0,0,Math.PI*2);c.stroke();c.restore();}
 c.filter=f.hitFlash>0?'brightness(2.4)':(f.data.echo?'grayscale(1) brightness(.55) contrast(1.25) drop-shadow(0 0 8px rgba(150,110,255,.9))':'none');
 c.drawImage(img,fr*fw,0,fw,fh,-px,-py+6,fw/sc,fh/sc);c.filter='none';
 return true;
}
function drawGeneric(f,i){
 const now=performance.now()/1000;
 if(f.action==='knockdown'||f.action==='down'){const r=f.action==='down'?(f.down>.35?1:f.down/.35):Math.min(1,f.koTime*3);c.translate(0,20*r);c.rotate(-1.4*r);}
 if(f.action==='hit')c.rotate(-.12+Math.sin(now*40)*.04);
 const col=f.data.color,lunge=['claw','double','bite','ultraseq','ender'].includes(f.action)?1:0;
 c.fillStyle=col;c.strokeStyle='#17170f';c.lineWidth=5;
 c.beginPath();c.roundRect(-29,-70,25,70,10);c.roundRect(7,-70,25,70,10);c.fill();c.stroke();
 c.beginPath();c.ellipse(0,-145,49,83,0,0,7);c.fill();c.stroke();
 c.fillStyle=i===0?'#9d612d':'#b07a3e';c.beginPath();c.ellipse(-3,-216,57,62,0,0,7);c.fill();c.stroke();
 c.fillStyle=col;c.beginPath();c.ellipse(24,-226,37,34,0,0,7);c.fill();c.stroke();
 c.fillStyle='#f1d6a1';c.beginPath();c.ellipse(50,-211,22,14,0,0,7);c.fill();c.stroke();
 c.fillStyle='#17170f';c.beginPath();c.arc(33,-235,4,0,7);c.fill();
 c.strokeStyle=col;c.lineWidth=18;c.lineCap='round';c.beginPath();c.moveTo(-25,-174);c.lineTo(15+(lunge?55:0),-157-(f.action==='double'&&f.chain%2?30:0));c.moveTo(28,-174);c.lineTo(55,-145);c.stroke();
 if(lunge){c.strokeStyle='#ffbf45';c.lineWidth=4;c.beginPath();c.arc(80,-160,38,-1.1,.6);c.stroke()}
 if(f.hitFlash>0){c.globalAlpha=.4;c.fillStyle='#fff';c.beginPath();c.ellipse(0,-150,70,120,0,0,7);c.fill();c.globalAlpha=1;}
}

addUnlocked();if(secretUnlocked()&&!roster.includes(MAJIC))roster.push(MAJIC);
forgottenMenu();
render();show('menu');updateGuide();
addEventListener('resize',()=>{cam.snap=true});addEventListener('orientationchange',()=>{cam.snap=true;setTimeout(()=>{cam.snap=true},300)});
window.__kotj={get game(){return game},get tower(){return tower},arena:(i)=>{arena=ARENAS[i]},start:(m,a,b)=>{mode=m;picks=[roster.find(r=>r.id===a),roster.find(r=>r.id===b)];if(m==='tower'){tower={kind:'tower',player:picks[0],ladder:roster.filter(f=>BASE_IDS.includes(f.id)&&f.id!==a),index:0};picks[1]=tower.ladder[0];arena=towerArena()}start()},kb,sound:v=>{soundOn=v},finish:()=>finish(),towerFinal:()=>{tower.index=tower.ladder.length-1;picks=[tower.player,tower.ladder[tower.index]];arena=towerArena();start()}};
})();
