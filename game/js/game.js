'use strict';
/* King of the Jungle V2 — web build 0.3
   Killer-Instinct-style combat: openers, auto-doubles, enders, potential (recoverable) damage,
   combo breakers with lockout, two life bars, DANGER state, Shadow moves, Instinct mode and
   cinematic ULTRA COMBO finishers. Plus: portraits, Badger sprites, touch, gamepad, CPU, Tower. */
(()=>{
const $=id=>document.getElementById(id), roster=KOTJ_ROSTER, screens=['menu','select','dojo','achievement-gallery','stage','fight','result','champion','story','online','recovery','rise','armory'];
let dojoChallenge={step:0,complete:false,medal:false};
const DOJO_SIGNATURE_TRIALS={
 badger:{move:'badgerBreaker',label:'EARTHBREAKER',hint:'Land Badger’s Earthbreaker after a 3-hit combo.'},
 wolf:{move:'wolfFrenzy',label:'PACK FRENZY',hint:'Finish a 3-hit combo with Wolf’s Pack Frenzy.'},
 hyena:{move:'hyenaFeint',label:'MAD FEINT',hint:'Finish a 3-hit combo with Hyena’s Mad Feint.'},
 leopard:{move:'special',label:'FROST POUNCE',hint:'Finish a 3-hit combo with Snow Leopard’s Frost Pounce.'},
 jaguar:{move:'jaguarAmbush',label:'PRECISION AMBUSH',hint:'Finish a 3-hit combo with Jaguar’s Precision Ambush.'},
 crocodile:{move:'crocodileRoll',label:'DEATH ROLL',hint:'Finish a 3-hit combo with Crocodile’s Death Roll.'},
 lion:{move:'lionRoar',label:'KING’S ROAR',hint:'Finish a 3-hit combo with Lion’s King’s Roar.'},
 tiger:{move:'tigerPounce',label:'STRIPED POUNCE',hint:'Finish a 3-hit combo with Tiger’s Striped Pounce.'},
 grizzly:{move:'grizzlyMaul',label:'CRUSHING MAUL',hint:'Finish a 3-hit combo with Grizzly’s Crushing Maul.'},
 hippo:{move:'hippoRush',label:'RIVER RUSH',hint:'Finish a 3-hit combo with Hippo’s River Rush.'},
 elephant:{move:'stomp',label:'TITAN STOMP',hint:'Finish a 3-hit combo with Elephant’s Titan Stomp.'},
 eagle:{move:'eagleSkyfall',label:'SKYFALL',hint:'Finish a 3-hit combo with Eagle’s Skyfall.'},
 snake:{move:'snakeCoil',label:'VENOM COIL',hint:'Finish a 3-hit combo with Snake’s Venom Coil.'},
 stag:{move:'stagAntler',label:'ANTLER CHARGE',hint:'Finish a 3-hit combo with Stag’s Antler Charge.'},
 dolphin:{move:'special',label:'RIPTIDE RUSH',hint:'Finish a 3-hit combo with Dolphin King’s Riptide Rush.'},
 majic:{move:'frostStrike',label:'FROST STRIKE',hint:'Finish a 3-hit combo with MAJIC’s Frost Strike.'}
};
// Online play state (see js/net.js). side 0 = host = Player 1, side 1 = guest = Player 2.
const ON={side:0,mine:null,theirs:null,inp:{h:{},c:{}},used:{},prevOut:{},cnt:{},lp:{},ev:[],snap:null,seq:0,lastSeq:-1,code:''};
const portrait=id=>'assets/characters/portraits/'+id+'.jpg?v=11.0',winArt=id=>'assets/characters/win/'+id+'.jpg?v=15.9';
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
// Graphics: AUTO (default) or SHARP. Every fight starts at full sharpness; AUTO only softens if the
// device stays slow after the opening seconds, and never below 75%. Nothing low is remembered between fights.
let GFX='auto';try{GFX=localStorage.getItem('kotj-gfx')==='sharp'?'sharp':'auto';localStorage.removeItem('kotj-res')}catch(_){}
let frameDt=1/60;
const RES={scale:1,acc:0,n:0,t:0,slow:0,floor:.75};
function resStart(){RES.acc=0;RES.n=0;RES.t=0;RES.slow=0;RES.scale=1}
function resTick(real){RES.t+=real;try{autoSmooth(real)}catch(_){}
 if(GFX==='sharp'){RES.scale=1;return}
 if(RES.t<3.5)return;                                   // ignore art loading at fight start
 RES.acc+=real;RES.n++;if(RES.acc<2)return;const avg=RES.acc/RES.n;RES.acc=0;RES.n=0;
 RES.slow=avg>1/45?RES.slow+1:0;                         // must stay clearly slow (under ~45 fps) twice in a row
 if(RES.slow>=2&&RES.scale>RES.floor){RES.scale=Math.max(RES.floor,RES.scale*.9);RES.slow=0}
}
function setGfx(v){GFX=v;try{localStorage.setItem('kotj-gfx',v)}catch(_){}RES.scale=1;document.querySelectorAll('.gfx-btn').forEach(b=>b.textContent='GRAPHICS: '+(v==='sharp'?'SHARP':'AUTO'))}

/* ---------- Arenas ---------- */
const ARENAS=[{id:'jungle-temple',name:'JUNGLE TEMPLE'},{id:'inferno-fortress',name:'INFERNO FORTRESS'},{id:'frozen-kingdom',name:'FROZEN KINGDOM'},
 {id:'savage-plains',name:'SAVAGE PLAINS'},{id:'shadow-swamp',name:'SHADOW SWAMP'},{id:'caes-corner',name:"CAE'S CORNER"},{id:'tidal-kingdom',name:'THE TIDAL KINGDOM'},{id:'royal-colosseum',name:"MAJIC'S LAIR",lair:1}];
const LAIR=ARENAS.find(a=>a.lair),FIGHT_ARENAS=ARENAS.filter(a=>!a.lair);
const arenaImg={};ARENAS.forEach(a=>{const im=new Image();im.src='assets/arenas/'+a.id+'.webp?v=15.54';arenaImg[a.id]=im});
let arena=ARENAS[0],stagePick=0; // stagePick: index into ARENAS, ARENAS.length = random
const RND=()=>ARENAS.length;
function renderStages(){setBackdrop('assets/ui/select-bg.webp');
 $('stage-vs').textContent=picks[0].name+' VS '+picks[1].name;$('stage-grid').innerHTML='';
 ARENAS.forEach((a,i)=>{const b=document.createElement('button');b.className='stage-tile'+(a.lair?' lair':'')+(stagePick===i?' selected':'');
  b.innerHTML=`<span class="sf"><img src="assets/arenas/${a.id}-thumb.webp?v=15.54" alt=""><strong>${a.name}</strong></span>`;
  b.onclick=()=>{ac();if(performance.now()<(window.__pickLock||0))return;window.__pickLock=performance.now()+600;stagePick=i;renderStages();setTimeout(()=>$('stage-go').click(),170)};b.ondblclick=()=>$('stage-go').click();$('stage-grid').append(b)});
 const r=document.createElement('button');r.className='stage-tile random'+(stagePick===RND()?' selected':'');
 r.innerHTML='<span class="sf"><img class="laurel" src="assets/ui/stage-random.webp?v=7.5" alt=""><strong>RANDOM</strong></span>';
 r.onclick=()=>{ac();if(performance.now()<(window.__pickLock||0))return;window.__pickLock=performance.now()+600;stagePick=RND();renderStages();setTimeout(()=>$('stage-go').click(),170)};r.ondblclick=()=>$('stage-go').click();$('stage-grid').append(r);
 const sel=$('stage-grid').querySelector('.selected');sel&&sel.scrollIntoView({block:'nearest'});
}
function openStage(){renderStages();$('stage-back').classList.toggle('hidden',mode==='online');show('stage')}
$('stage-go').onclick=()=>{ac();arena=stagePick>=RND()?ARENAS[Math.floor(Math.random()*ARENAS.length)]:ARENAS[stagePick];if(mode==='online')NET.send({t:'start',a:picks[0].id,b:picks[1].id,arena:arena.id});start()};
$('stage-back').onclick=()=>{if(mode==='online')return;step=mode==='versus'||mode==='cpu'?2:1;chosen=picks[step-1];render();show('select')};
// Tower: each floor moves to a new arena; the final boss is always in Majic's Lair.
function towerArena(){if(tower.kind==='forgotten')return [ARENAS[4],ARENAS[2],ARENAS[1]][tower.index]||LAIR;const n=tower.ladder.length;return tower.index===n-1?LAIR:FIGHT_ARENAS[tower.index%FIGHT_ARENAS.length]}

const show=id=>{try{guardTaps()}catch(_){}screens.forEach(s=>$(s).classList.toggle('hidden',s!==id));document.body.classList.toggle('on-cover',id==='menu')};
// Phones: the tap that opens a screen must not also hit a button that appears under the same finger.
let tapGuard=0;const guardTaps=()=>{tapGuard=performance.now()};
{const _show=show;window.__kotjShow=_show}
document.addEventListener('click',e=>{if(e.isTrusted&&performance.now()-tapGuard<380&&e.target.closest&&e.target.closest('button,.fighter-tile,.stage-tile')){e.stopPropagation();e.preventDefault()}},true);
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
 const startCover=()=>{const m=$('menu');if(m.classList.contains('started'))return;m.classList.add('started');guardTaps();try{ac()}catch(_){}
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
 if(recOn())ON.ev.push(['x',type]);
 if(!soundOn)return;const a=ac();if(!a)return;const t=a.currentTime;
 const noise=(dur,freq,gain)=>{const b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
  const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const g=a.createGain();g.gain.value=gain;s.connect(f).connect(g).connect(a.destination);s.start(t)};
 const tone=(f0,f1,dur,gain,wave='sine')=>{const o=a.createOscillator(),g=a.createGain();o.type=wave;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur)};
 if(type==='roar'){noise(.46,720,.52);tone(145,58,.48,.42,'sawtooth');tone(310,92,.34,.18,'triangle')}
 else if(type==='hit'){noise(.12,2200,.5);tone(160,50,.14,.5)}
 else if(type==='heavy'){noise(.2,1400,.7);tone(110,35,.25,.7)}
 else if(type==='block'){noise(.06,5000,.25);tone(900,600,.05,.12,'square')}
 else if(type==='whiff'){noise(.08,4000,.12)}
 else if(type==='breaker'){tone(200,1400,.35,.3,'sawtooth');noise(.3,3000,.5)}
 else if(type==='lockout'){tone(300,90,.4,.25,'square')}
 else if(type==='instinct'){tone(120,900,.6,.3,'sawtooth')}
 else if(type==='frost'){tone(880,1320,.18,.16,'sine');setTimeout(()=>{if(soundOn){const b=ac();if(b){const o=b.createOscillator(),g=b.createGain();o.type='sine';o.frequency.setValueAtTime(1320,b.currentTime);o.frequency.exponentialRampToValueAtTime(1760,b.currentTime+.22);g.gain.setValueAtTime(.13,b.currentTime);g.gain.exponentialRampToValueAtTime(.001,b.currentTime+.28);o.connect(g).connect(b.destination);o.start();o.stop(b.currentTime+.28)}}},95)}
 else if(type==='frostWind'){noise(.42,1800,.16);tone(520,180,.48,.16,'sine')}
 else if(type==='frostCrack'){noise(.16,5200,.42);tone(980,260,.2,.22,'triangle')}
 else if(type==='frostShatter'){noise(.48,7200,.38);tone(1480,420,.42,.2,'sine')}
 else if(type==='ultra'){noise(.07,3000,.45);tone(400,120,.08,.3,'square')}
 else if(type==='boom'){noise(.6,900,.9);tone(80,25,.7,.9)}
}
const AU=window.KOTJAudio;
// Online: the host records every sound the fight makes so the guest hears the same hits and voice lines.
const recOn=()=>mode==='online'&&ON.side===0&&!!game&&game.intro<=0&&!game.over;
if(AU)[['now','n'],['ultra','u'],['duckMusic','d']].forEach(([fn,tag])=>{const o=AU[fn];if(typeof o!=='function')return;AU[fn]=function(...a){if(recOn())ON.ev.push([tag,...a]);return o.apply(AU,a)}});
// Play a labeled clip from the sound library; if it isn't loaded yet, use the built-in synth sound.
function snd(key,fallback,vol=1,rate=1){if(!soundOn)return;if(!(AU&&AU.now(key,vol,rate))&&fallback)sfx(fallback)}
const HEAVY_SPECIAL=['badger','grizzly','hippo','elephant'];
// Relative body mass for hit reactions. Knockback only; no damage or unlock changes.
const FIGHTER_MASS={badger:1.08,hyena:.94,wolf:.9,leopard:.72,jaguar:.86,
 crocodile:1.24,lion:1.02,tiger:.94,grizzly:1.42,hippo:1.38,elephant:1.5,
 eagle:.76,snake:.7,stag:.96,dolphin:.94,majic:1.04};
const impactScale=f=>Math.max(.68,Math.min(1.28,1/(FIGHTER_MASS[f.data.id]||1)));
// Each fighter carries a restrained signature impact color, so attacks read
// as belonging to that animal without changing damage, timing, or hitboxes.
const FIGHTER_IMPACT={
 badger:'#d7a85b',hyena:'#d7a85b',wolf:'#b8d7ff',leopard:'#9ce7ff',
 jaguar:'#e9c46a',crocodile:'#78d6a3',lion:'#ffb347',tiger:'#ff8247',
 grizzly:'#c99a70',hippo:'#83c9d8',elephant:'#c6b7a0',eagle:'#fff0a6',
 snake:'#a8e06f',stag:'#b6d98b',dolphin:'#8fe3ff',majic:'#bd8cff'
};
function hitSound(f,mv){
 const r=.94+Math.random()*.12;
 if(mv===MOVES.bite)return snd('sfx.bite','heavy',1,r);
 if(mv===MOVES.special)return snd(HEAVY_SPECIAL.includes(f.data.id)?'sfx.groundSlam':'sfx.heavyImpact','heavy',1,r);
 if((mv.base||mv)===MOVES.double&&f.chain%2)return snd('sfx.claw','hit',.9,r);
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
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ac();b.dataset.mode==='online'?openOnline():openSelect(b.dataset.mode)});
$('open-dojo').onclick=()=>{ac();show('dojo');setBackdrop('assets/ui/select-bg.webp')};$('dojo-back').onclick=menu;$('dojo-start').onclick=()=>{ac();openSelect('training')};
function openSelect(m){mode=m;step=1;tower=null;picks=[roster[6],roster[1]];chosen=picks[0];if(m==='online'){ON.mine=null;ON.theirs=null}render();show('select');royalChampionEntrance()}
function royalChampionEntrance(){
 const old=$('royal-champion-entrance');if(old)old.remove();
 if(mode!=='tower')return;
 const champion=SAVE.get('jungleChampion',null);if(!champion||!champion.id)return;
 const f=roster.find(x=>x.id===champion.id);if(!f)return;
 const title=document.querySelector('#select .select-title');if(!title)return;
 const banner=document.createElement('div');banner.id='royal-champion-entrance';banner.className='royal-champion-entrance';
 banner.innerHTML=`<span class="royal-crown-wrap"><img src="assets/ui/crown.webp" alt=""></span><img class="royal-champion-portrait" src="${portrait(f.id)}" alt="${f.name}"><span class="royal-champion-copy"><b>THE JUNGLE HAS A NEW CHAMPION</b><strong>${f.name}</strong><small>THE CROWN REMEMBERS</small></span>`;
 title.append(banner);const tile=[...document.querySelectorAll('#roster .fighter-tile')].find(x=>x.querySelector('strong')?.textContent===f.name);if(tile)tile.classList.add('royal-champion-tile');
 SAVE.set('jungleChampion',null);
}
function selectBack(){if(mode==='online')menu();else show('menu')}
function render(){
 const who=mode==='versus'?`PLAYER ${step}`:'PLAYER 1';
  $('select-instruction').textContent=mode==='forgotten'?'CHOOSE WHO ENTERS':mode==='tower'?'CHOOSE YOUR FIGHTER · CLIMB ALL 10 OPPONENTS':mode==='training'?'CHOOSE YOUR FIGHTER · ENTER THE TRAINING ARENA':mode==='cpu'&&step===2?'CHOOSE YOUR CPU OPPONENT':`${who}: CHOOSE YOUR FIGHTER`;
 $('confirm-fighter').textContent=mode==='forgotten'?'ENTER':mode==='tower'?'START THE TOWER':mode==='training'?'ENTER THE DOJO':mode==='cpu'&&step===2?'CONFIRM CPU OPPONENT':`CONFIRM ${who}`;
 $('roster').innerHTML='';
 const ORDER=[['lion','tiger','jaguar','wolf','hyena','badger','dolphin','majic'],['grizzly','crocodile','hippo','elephant','leopard','snake','eagle','stag']];
 ORDER.forEach(row=>{const r=document.createElement('div');r.className='sel-row';row.forEach(id=>{const f=roster.find(x=>x.id===id);
  if(!f){if(id==='dolphin'){const l=document.createElement('div');l.className='fighter-tile locked';l.title='Hidden unlock';l.innerHTML='<span class="tf"><b class="q">?</b><i class="lock">🔒</i></span>';r.append(l);return}if(NEW_FIGHTERS.some(n=>n.id===id)){const l=document.createElement('div');l.className='fighter-tile locked';l.title='Clear the Tower to unlock a hidden fighter';l.innerHTML='<span class="tf"><b class="q">?</b><i class="lock">🔒</i></span>';r.append(l)}return}
  if(mode==='forgotten'&&f.id==='majic')return;const i=roster.indexOf(f);
  const b=document.createElement('button');b.className='fighter-tile'+(chosen.id===f.id?' selected':'');b.dataset.id=f.id;if(f.id==='majic')b.classList.add('titan');
  b.innerHTML=`<span class="tf"><img src="assets/ui/cards/${f.id}.webp?v=10.16" alt="${f.name}"><strong${f.name.length>9?' class="long"':''}>${f.name}</strong></span>`+(f.id==='majic'?'<i class="bolt b0"></i><i class="bolt b1"></i><i class="bolt b2"></i>':'')+'<em class="tap-pick">TAP TO PICK</em>'+(crowns().includes(f.id)?'<img class="tile-crown" src="assets/ui/crown.webp" alt="Tower champion" title="Conquered the Tower">':'');
  b.onclick=()=>{if(b.classList.contains('locked'))return;if(performance.now()<(window.__pickLock||0))return;chosen=f;document.querySelectorAll('.fighter-tile').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');card(f,i);window.__pickLock=performance.now()+420;setTimeout(()=>$('confirm-fighter').click(),170)}; // one tap picks
  b.ondblclick=()=>$('confirm-fighter').click();r.append(b)});$('roster').append(r)});
 card(chosen,roster.indexOf(chosen));selectWait();
 const sel=document.querySelector('.fighter-tile.selected');if(sel&&document.getElementById('select').contains(sel)&&!$('select').classList.contains('hidden'))sel.scrollIntoView({block:'nearest',behavior:'smooth'});
 selectHints();
}
function selMove(dx,dy){const t=[...document.querySelectorAll('#roster .fighter-tile:not(.locked)')];const cur=t.find(e=>e.dataset.id===chosen.id)||t[0];if(!cur)return;let n=cur;
 if(dx){const k=t.indexOf(cur);n=t[(k+dx+t.length)%t.length]}
 else{const rows=[...document.querySelectorAll('#roster .sel-row')].filter(r=>r.querySelector('.fighter-tile:not(.locked)'));const ri=rows.indexOf(cur.parentElement),tr=rows[ri+dy];if(tr){const cx=cur.offsetLeft+cur.offsetWidth/2;n=[...tr.querySelectorAll('.fighter-tile:not(.locked)')].reduce((a,b)=>Math.abs(a.offsetLeft+a.offsetWidth/2-cx)<=Math.abs(b.offsetLeft+b.offsetWidth/2-cx)?a:b)}}
 const f=roster.find(x=>x.id===n.dataset.id);if(f&&f!==chosen){chosen=f;render()}}
function gridCols(){const t=[...document.querySelectorAll('#roster .fighter-tile')];if(t.length<2)return 1;const y=t[0].offsetTop;return Math.max(1,t.filter(e=>e.offsetTop===y).length)}
function randomPick(){const pool=roster.filter(f=>f.id!==chosen.id&&!(mode==='forgotten'&&f.id==='majic'));chosen=pool[Math.floor(Math.random()*pool.length)];render()}
function selectHints(){const el=$('select-hints');if(!el)return;const pads=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean);const kind=pads[0]?padKind(pads[0]):isTouch()?'touch':'kb';
 const B={xbox:['✚','A','B','Y','☰'],ps:['✚','✕','○','△','☰'],kb:['← →','ENTER','ESC','R','P'],touch:['👆','✔','↩','🎲','']}[kind];
 el.innerHTML=[['SELECT',B[1],'ka'],['BACK',B[2],'kb'],['RANDOM',B[3],'ky'],['OPTIONS',kind==='kb'?'P':(B[4]||'⚙'),'kopt'],['TOWER MODE',kind==='kb'?'T':'🏰','ktower']].map(([t,k,c])=>`<span class="hint"><b class="${c}">${k}</b>${t}</span>`).join('');
 const H=el.querySelectorAll('.hint');H[0].onclick=()=>$('confirm-fighter').click();H[1].onclick=()=>selectBack();H[2].onclick=()=>randomPick();H[3].onclick=()=>selOpts();H[4].onclick=()=>selTower();H[4].classList.toggle('on',mode==='tower');H[4].style.display=mode==='online'?'none':''}
const selOptsOpen=()=>!$('sel-opts').classList.contains('hidden');
function selOpts(on){const o=$('sel-opts');const v=on===undefined?o.classList.contains('hidden'):on;o.classList.toggle('hidden',!v);if(v){$('so-sound').textContent=$('sound').textContent;$('so-blood').textContent=document.querySelector('.blood-btn').textContent;if($('so-gfx'))$('so-gfx').textContent='GRAPHICS: '+(GFX==='sharp'?'SHARP':'AUTO')}}
function selTower(){if(mode==='online'||mode==='tower')return;openSelect('tower')}
function card(f,i){try{spriteImg[f.id]}catch(_){}$('confirm-fighter').disabled=false;setBackdrop('assets/arenas/jungle-temple.webp');$('fighter-number').textContent=String(i+1).padStart(2,'0');$('fighter-portrait').src=`assets/ui/hero/${f.id}.webp?v=10.16`;$('select').dataset.f=f.id;$('fighter-name').textContent=f.name;$('fighter-style').textContent=f.style;$('fighter-bio').textContent=f.bio;$('power-stat').textContent=f.power;$('speed-stat').textContent=f.speed;$('defense-stat').textContent=f.defense;if(mode==='online')selectWait()}
$('confirm-fighter').onclick=()=>{
 ac();if(mode==='online'){if(ON.mine)return;ON.mine=chosen.id;NET.send({t:'pick',id:chosen.id});selectWait();return}picks[step-1]=chosen;
 if(mode==='training'){picks=[chosen,roster.find(f=>f.id==='grizzly')||roster[1]];tower=null;arena=ARENAS[0];return start()}
 if(mode==='tower'){tower={kind:'tower',player:chosen,ladder:roster.filter(f=>BASE_IDS.includes(f.id)&&f.id!==chosen.id),index:0,startedAt:Date.now()};picks=[chosen,tower.ladder[0]];arena=towerArena();
  return start()}
 if(mode==='forgotten'){if(chosen.id==='majic')return;
  const others=roster.filter(f=>BASE_IDS.includes(f.id)&&f.id!==chosen.id).sort(()=>Math.random()-.5).slice(0,3).map(f=>({...f,name:'FALLEN '+f.name,echo:true}));
  tower={kind:'forgotten',player:chosen,ladder:others,index:0,startedAt:Date.now()};picks=[chosen,others[0]];arena=towerArena();
  return storyCard({dark:1,title:'',text:STORY.forgotten.enter},()=>storyCard({dark:1,title:'ECHO 1',text:STORY.forgotten.echoes[0]},start))}
 if(step===1){step=2;chosen=picks[1].id===picks[0].id?roster[(roster.indexOf(picks[0])+1)%roster.length]:picks[1];render()}else openStage();
};

/* ---------- Input ---------- */
const KEYS=[{l:'a',r:'d',j:'w',bl:'s',at:'f',sp:'g',ins:'h',s1:'r',s2:'t',s3:'y',su:'u'},{l:'ArrowLeft',r:'ArrowRight',j:'ArrowUp',bl:'ArrowDown',at:'k',sp:'l',ins:';',s1:'i',s2:'o',s3:'p',su:'['}];
const kb={},tap={},touch={l:0,r:0,j:0,bl:0,at:0,sp:0,ins:0},touchTap={};
const norm=e=>e.key.length===1?e.key.toLowerCase():e.key;
window.addEventListener('keydown',e=>{if(!game&&!$('stage').classList.contains('hidden')){const N=RND()+1;let n=stagePick;const k=e.key;
 if(k==='ArrowRight')n=(n+1)%N;else if(k==='ArrowLeft')n=(n+N-1)%N;else if(k==='ArrowDown')n=Math.min(N-1,n+3);else if(k==='ArrowUp')n=Math.max(0,n-3);
 else if(k==='Enter'){e.preventDefault();$('stage-go').click();return}else if(k==='Escape'){$('stage-back').click();return}else return;
 e.preventDefault();stagePick=n;renderStages()}});
window.addEventListener('keydown',e=>{if(!game&&!$('select').classList.contains('hidden')){const k=e.key;
  if(k==='ArrowRight')selMove(1,0);else if(k==='ArrowLeft')selMove(-1,0);else if(k==='ArrowDown')selMove(0,1);else if(k==='ArrowUp')selMove(0,-1);
  else if(k==='Enter'){e.preventDefault();if(selOptsOpen())return selOpts(false);$('confirm-fighter').click();return}else if(k==='Escape'){if(selOptsOpen())return selOpts(false);selectBack();return}else if(k==='r'||k==='R'){randomPick();return}else if(k==='p'||k==='P'){selOpts();return}else if(k==='t'||k==='T'){selTower();return}else return;
  e.preventDefault();return}
 if(!game)return;const k=norm(e);if(KEYS.some(m=>Object.values(m).includes(k))){e.preventDefault();if(!kb[k])tap[k]=true;kb[k]=true}if(k==='Escape'||k==='p')togglePause()});
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
function padState(g){
 const B=i=>!!(g.buttons[i]&&g.buttons[i].pressed),ax=g.axes[0]||0,ay=g.axes[1]||0;
 return{up:B(12)||ay<-.6,dn:B(13)||ay>.6,l:B(14)||ax<-.45,r:B(15)||ax>.45,j:B(0)||B(12)||ay<-.7,bl:B(1)||B(13)||ay>.7,at:B(2),sp:B(3),s1:B(4),s2:B(5),s3:B(6),su:B(7),ins:B(8)||B(10)||B(11),start:B(9),back:B(1),a:B(0)};
}
// any connected controller (menus, and P1 whenever only one person is playing)
function readPadAny(){const list=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean);if(!list.length)return null;
 const o={};for(const g of list){const s=padState(g);for(const k in s)o[k]=o[k]||s[k]}return o}
function readPad(n){
 if(n===0&&mode!=='versus')return readPadAny();
 const list=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean);const g=list[n];if(!g)return null;
 return padState(g);
}
function inputFor(i){
 const m=KEYS[i],k={};
 for(const n in m){k[n]=!!kb[m[n]]||!!tap[m[n]];tap[m[n]]=false}
 if(i===0)for(const n in touch){k[n]=k[n]||!!touch[n]||!!touchTap[n];touchTap[n]=0}
 const g=readPad(i);if(g){for(const n in k)k[n]=k[n]||g[n];if(g.start&&!padPrev[i].start)togglePause();padPrev[i]=g}
 return k;
}
let menuPrev={};setInterval(()=>{if(game)return;const g=readPadAny();if(!g)return;const p=menuPrev;menuPrev=g;if(document.getElementById('splash'))return; // the button that closes the splash doesn't also press START
 if(Object.keys(g).some(k=>g[k]&&!p[k]))document.documentElement.classList.add('pad-nav');
 const vis=screens.find(s=>!$(s).classList.contains('hidden'));
 if(vis==='menu'){const m=$('menu');
  if(!m.classList.contains('started')){if((g.j&&!p.j)||(g.at&&!p.at)||(g.start&&!p.start))window.__startCover()}
  else{const bs=[...document.querySelectorAll('.cover-menu button')].filter(b=>b.offsetParent);let i=Math.max(0,bs.indexOf(document.activeElement));
   if((g.l&&!p.l)||(g.up&&!p.up))bs[(i-1+bs.length)%bs.length].focus();
   if((g.r&&!p.r)||(g.dn&&!p.dn))bs[(i+1)%bs.length].focus();
   if((g.j&&!p.j)||(g.at&&!p.at)||(g.start&&!p.start))(document.activeElement&&bs.includes(document.activeElement)?document.activeElement:bs[0]).click()}}
 if(vis==='select'&&selOptsOpen()){if(g.start&&!p.start)selOpts(false)}
 else if(vis==='select'){if(g.r&&!p.r)selMove(1,0);if(g.l&&!p.l)selMove(-1,0);if(g.dn&&!p.dn)selMove(0,1);if(g.up&&!p.up)selMove(0,-1);
  if(g.start&&!p.start)selOpts();else if((g.a&&!p.a)||(g.at&&!p.at)){if(selOptsOpen())selOpts(false);else $('confirm-fighter').click()}if(g.back&&!p.back){if(selOptsOpen())selOpts(false);else selectBack()}if(g.sp&&!p.sp)randomPick()}
 if(vis==='stage'){let n=stagePick;const N=RND()+1;if(g.r&&!p.r)n=(n+1)%N;if(g.l&&!p.l)n=(n+N-1)%N;if(g.dn&&!p.dn)n=Math.min(N-1,n+3);if(g.up&&!p.up)n=Math.max(0,n-3);if(n!==stagePick){stagePick=n;renderStages()}if((g.at&&!p.at)||(g.start&&!p.start))$('stage-go').click();if(g.bl&&!p.bl)$('stage-back').click()}
 if(vis==='story'&&((g.j&&!p.j)||(g.at&&!p.at)||(g.start&&!p.start)))$('story-next').click();
 if(vis==='champion'&&((g.j&&!p.j)||(g.at&&!p.at)||(g.start&&!p.start)))$('champ-continue').click();
},60);

/* ---------- CPU ---------- */
function cpuBrain(level){return{level,think:0,hold:{},wantBlock:0,doubles:0,pressed:{},breakTry:0}}
function cpuInput(i){
 const f=game.fighters[i],o=game.fighters[1-i],ai=f.ai,lvl=ai.level,dt=game.dt;
 const k={l:false,r:false,j:false,dn:false,bl:false,at:false,sp:false,ins:false};
 if(mode==='training')return k; // the dojo dummy stands still and never attacks
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
 // MAJIC's own moves: Titan Fury while powered up, True Titan Form (jump+block+special) when hurt, Jungle Rage (jump+special), Frost Strike (block+special) up close.
 if(f.data.id==='majic'&&!(tower&&tower.boss)&&f.ground&&f.attack<=0&&!game.ko){
  const powered=(f.jungleRageT||0)>0||(f.ascendantT||0)>0;
  if(powered&&d<400&&Math.random()<dt*(.5+lvl*.8)){k[toward]=true;press('sp');return k}
  if(!powered&&!((f.ascendantCooldownT||0)>0)&&f.hp<BAR*.55&&Math.random()<dt*(.1+lvl*.25)){k.j=true;k.bl=true;press('sp');return k}
  if(!powered&&!((f.jungleRageCooldownT||0)>0)&&Math.random()<dt*(.12+lvl*.3)){k.j=true;press('sp');return k}
  if(d<390&&f.meter<50&&Math.random()<dt*(.18+lvl*.4)){k.bl=true;press('sp');return k}
 }
 // Comboing: link auto-doubles, then finish with an ender (or Ultra when the target is in danger).
 if(o.stun>0&&f.combo>0){
  if(f.attack<.15){if(ai.doubles>0){press('at');ai.doubles--}else if(!ai.dropping)press(f.meter>=50&&Math.random()<lvl*.4?'sp':'sp')}
  return k;
 }
 if(f.meter>=100&&!f.instinct&&Math.random()<.02)press('ins');
 if(o.actionTime>0&&o.attack>0&&d<hitDist(o,f,'attack_heavy')+20&&!ai.wantBlock&&Math.random()<(.01+lvl*.05)*60*dt)ai.wantBlock=.3+lvl*.3;
 if(ai.wantBlock&&f.ground){k.bl=true;return k}
 if(ai.think<=0){
  ai.think=.5-lvl*.33+Math.random()*.2;ai.hold={};ai.doubles=1+Math.floor(Math.random()*(1+lvl*3));ai.dropping=Math.random()>.45+lvl*.5;
  const bossMajic=f.data.id==='majic'&&tower&&tower.boss,phase=bossMajic?(f.bossPhase||1):0;
  if(bossMajic){ai.majicPatternCd=Math.max(0,(ai.majicPatternCd||0)-.55);if(ai.majicPatternCd<=0&&f.attack<=0&&f.ground&&d<(phase===1?430:phase===2?395:360)&&Math.random()<(.48+lvl*.22)){if(phase===1){ai.hold.dn=1;ai.hold.sp=1;ai.majicPatternCd=2.35;ai.patternNow=1}else if(phase===2){ai.hold[toward]=1;ai.hold.sp=1;ai.majicPatternCd=1.95;ai.patternNow=1}else{ai.hold.dn=1;ai.hold.at=1;ai.majicPatternCd=1.65;ai.patternNow=1}}}
  const r=Math.random(),aggro=Math.min(.9,.2+lvl*.55+(phase===2?.1:phase===3?.2:0));
  const near=hitDist(f,o,'attack_light')-25,spR=hitDist(f,o,moveAnim(f,MOVES.special));
  if(ai.patternNow){ai.patternNow=0}
  else if(d>near){ai.hold[toward]=1;if(r<.06+lvl*.05)ai.hold.j=1;else if(r<.12+lvl*.1&&d<spR)ai.hold.sp=1;else if(f.meter>=50&&r<.2)ai.hold.shadow=1}
  else if(r<aggro){ai.hold.at=1;if(Math.random()<.25)ai.hold.heavy=1}
  else if(r<aggro+.12)ai.hold.sp=1;
  else if(r<aggro+.28)ai.hold[away]=1;
  else ai.hold.bl=1;
 }
 const h=ai.hold;k.l=!!h.l;k.r=!!h.r;k.j=!!h.j;k.dn=!!h.dn;k.bl=!!h.bl||!!h.heavy||!!h.shadow;
 if(h.at){press('at');h.at=0}
 if(h.sp){press('sp');h.sp=0}
 if(h.shadow){press('sp');h.shadow=0}
 return k;
}

/* ---------- Match flow ---------- */
function fighter(x,dir,data){return{x,y:0,vx:0,vy:0,dir,hp:BAR,bars:data.id==='majic'?3:2,potential:0,data,ground:true,block:false,blockTime:0,attack:0,stun:0,walk:0,move:0,moveVel:0,
 action:'idle',actionTime:0,actionTotal:1,move_:null,hitsDone:0,elapsed:0,wasAttack:false,wasSpecial:false,wasIns:false,hitFlash:0,hitAnimTime:0,hitHeavy:false,bossPhase:data.id==='majic'?1:0,
 combo:0,bestCombo:0,usedUltra:false,meter:0,lockout:0,breakWindow:0,instinct:0,down:0,koTime:0,ai:null,trail:[]}}
function setAction(f,a,t){f.action=a;f.actionTime=t;f.actionTotal=t}
function fighterLoading(on){let el=document.getElementById('fighter-loading');
 if(!el){el=document.createElement('div');el.id='fighter-loading';el.innerHTML='<img src="assets/ui/crown.webp" alt=""><b>THE FIGHTERS ARE ENTERING THE ARENA</b><i></i>';document.body.appendChild(el)}
 el.classList.toggle('on',!!on)}
function start(){
 // Make sure both fighters' frames have arrived before the bell (slow phone connections).
 if(mode!=='online'&&picks[0]&&picks[1]){const ids=[picks[0].id,picks[1].id],ready=()=>ids.every(id=>{const a=spriteImg[id];return !a||Object.values(a).every(im=>im.complete)});
  if(start._waiting)return;
  if(!ready()){start._waiting=performance.now();fighterLoading(true);
   const iv=setInterval(()=>{if(ready()||performance.now()-start._waiting>20000){clearInterval(iv);start._waiting=0;fighterLoading(false);start()}},120);return}}
 // First arrival at MAJIC's summit gets a one-time, three-beat boss entrance.
 // Mark it before opening the cards so the final callback can safely call start() again.
 if(tower&&tower.boss&&!tower.bossIntroSeen){
  tower.bossIntroSeen=true;
  return storyCard({dark:1,bossIntro:1,slow:820,fig:{id:'majic',anim:'idle',light:.08,hold:1},eyebrow:'THE SUMMIT · THE LAST STEP',title:'THE WORLD GOES SILENT',text:`The wind stops at the top of Majic’s Lair. The stone beneath your feet begins to pulse.

Eleven voices whisper from somewhere inside the mountain. Then every voice falls silent.`},()=>
   storyCard({dark:1,bossIntro:1,slow:760,fig:{id:'majic',anim:'walk_forward',light:.42,hold:1},eyebrow:'AN ANCIENT SHADOW STIRS',title:'ALL 11. ONE BODY.',text:`A shape steps out of the violet darkness: lion, tusks, wings, scales, stripes and antlers woven into one impossible guardian.

The crowns were never prizes. They were pieces of a lock. And you have opened it.`},()=>
    storyCard({dark:1,bossIntro:1,slow:700,fig:{id:'majic',anim:'victory',light:1,hold:1},eyebrow:'THE JUNGLE TITAN',title:'MAJIC',text:`“You climbed higher than the others. You brought every story to my door.

Now show me what all eleven could not.”

THE FINAL BATTLE BEGINS.`},start)));
 }
 show('fight');document.body.classList.add('fighting');setBackdrop('assets/arenas/'+arena.id+'.webp');$('arena-title').textContent=arena.name;
 dojoChallenge={step:0,complete:false,medal:false};$('dojo-challenge-hud').classList.toggle('hidden',mode!=='training');$('dojo-challenge-status').textContent='IN TRAINING';$('dojo-challenge-fill').style.width='0%';[1,2,3].forEach(n=>$('dojo-step-'+n).classList.remove('done'));
 if(mode==='training'){const trial=DOJO_SIGNATURE_TRIALS[picks[0].id]||DOJO_SIGNATURE_TRIALS.badger;$('dojo-challenge-title').textContent=picks[0].name+' · SIGNATURE TRIAL';$('dojo-step-1').textContent='Land your first clean hit';$('dojo-step-2').textContent='Build a 3-hit combo';$('dojo-step-3').textContent=trial.hint;}
 const cpu2=mode!=='versus'&&mode!=='online';
 $('p1-name').textContent=picks[0].name;$('p2-name').textContent=picks[1].name;
 $('p1-face').src=portrait(picks[0].id);$('p2-face').src=portrait(picks[1].id);
 $('p1-tag').textContent=mode==='online'?(ON.side===0?'YOU':'FRIEND'):'PLAYER 1';$('p2-tag').textContent=mode==='training'?'DUMMY':mode==='online'?(ON.side===1?'YOU':'FRIEND'):cpu2?'CPU':'PLAYER 2';
 $('mode-label').textContent=mode==='training'?'TRAINING':mode==='forgotten'?'? ? ?':mode==='tower'?'TOWER':mode==='cpu'?'VS CPU':mode==='online'?'ONLINE':'VERSUS';
 $('round-label').textContent=tower?(tower.boss?'THE SUMMIT':tower.kind==='forgotten'?`ECHO ${tower.index+1} / 3`:`FIGHT ${tower.index+1} / ${tower.ladder.length}`):'ROUND 1';
 $('p2-face').classList.toggle('echo-face',!!picks[1].echo);
 time=99;paused=false;if(mode==='training')$('timer').textContent='∞';Object.assign(ON,{inp:{h:{},c:{}},used:{},prevOut:{},cnt:{},lp:{},ev:[],snap:null,seq:0,lastSeq:-1});$('pause').classList.toggle('hidden',mode==='online');cam.z=1;cam.snap=true;resStart();
 setTimeout(()=>{if(wantHD()){loadHD(picks[0].id);loadHD(picks[1].id)}try{const nx=tower&&tower.ladder&&tower.ladder[tower.index+1];if(nx&&nx.id)setTimeout(()=>spriteImg[nx.id],4000)}catch(_){}},0);
 game={fighters:[fighter(300,1,picks[0]),fighter(800,-1,picks[1])],over:false,ko:0,dt:0,shake:0,hitstop:0,slow:1,slowT:0,flash:0,zoom:1,fx:[],stains:[],banner:null,ultra:null,intro:1.3,dangerSaid:[0,0]};
 if(cpu2)game.fighters[1].ai=cpuBrain(mode==='training'?.12:tower&&tower.boss?1.35:tower?(tower.kind==='forgotten'?Math.min(1,.85+tower.index*.05):Math.min(1,.1+tower.index*.09)):.45);
 ['p1','p2'].forEach(p=>{$(p+'-combo').textContent='';$(p+'-combo').classList.remove('active')});
 updateGuide();hud();$('combat-callout').textContent='';$('pause').textContent='PAUSE';
 const finalBoss=tower&&tower.kind==='tower'&&tower.index===tower.ladder.length-1;
 if(tower&&tower.boss){game.intro=2.9;banner('MAJIC','THE JUNGLE TITAN · ALL 11 IN ONE',2.8,'#ffcc33');game.shake=14}
 else if(finalBoss){game.intro=2.4;banner('FINAL BOSS',`${picks[1].name} AWAITS IN ${arena.name}`,2.3,'#ff5a3a')}
 else if(tower&&tower.kind==='forgotten')banner(`ECHO ${tower.index+1}`,`${picks[1].name} · ${arena.name}`,1.8,'#b9a0ff');
 else banner(tower?`FIGHT ${tower.index+1}`:'ROUND 1',`${picks[0].name} VS ${picks[1].name} · ${arena.name}`,1.4);
 if(AU&&soundOn){AU.music('music.'+arena.id);if(tower&&tower.boss&&AU.setMusicIntensity)AU.setMusicIntensity(1);
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
function togglePause(){if(!game||game.over||mode==='online')return;updateGuide();paused=!paused;$('pause').textContent=paused?'RESUME':'PAUSE';document.body.classList.toggle('paused',paused);AU&&AU.pauseMusic(paused)}
function loop(t){
 if(!game)return;const rawDt=(t-last)/1000;let real=Math.min(rawDt,(typeof LITE==='function'&&LITE())?.05:.035);last=t;frameDt=real;if(!paused&&rawDt<.5)resTick(rawDt);
 if(mode==='online'&&ON.side===1){guestFrame(real);if(!game)return;draw();raf=requestAnimationFrame(loop);return}
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
   if(!game.ko&&mode!=='training'){time=Math.max(0,time-dt);$('timer').textContent=Math.ceil(time);}
   update(dt);
   if(!game.ko&&mode!=='training'&&time===0){game.ko=2;banner('TIME','',1.6);say('Time');}
  }
  game.zoom=1;
  if(mode==='online')hostSend();
  if(game.ko){game.ko-=real;if(game.ko<=0){finish();return}}
 }
 draw();raf=requestAnimationFrame(loop);
}
const total=f=>(f.bars-1)*BAR+f.hp;
function hud(){
 if(mode==='training'&&dojoChallenge){$('dojo-challenge-status').textContent=dojoChallenge.complete?'MASTERED · MEDAL EARNED':`STEP ${Math.min(3,dojoChallenge.step+1)} OF 3`;$('dojo-challenge-fill').style.width=(dojoChallenge.step/3*100)+'%'}
 game.fighters.forEach((f,i)=>{const p='p'+(i+1),track=$(p+'-health').parentElement;
  $(p+'-health').style.width=Math.max(0,f.hp)+'%';
  const pot=Math.min(f.potential,BAR-Math.max(0,f.hp));$(p+'-pot').style.width=Math.max(0,pot)+'%';
  $(p+'-pot').style[i?'right':'left']=Math.max(0,f.hp)+'%';
  track.classList.toggle('last',f.bars===1);track.classList.toggle('danger',f.bars===1&&f.hp<=DANGER&&f.hp>0);
  {const pp=$(p+'-pips');while(pp.children.length<Math.max(2,f.bars,f.maxBars||0))pp.append(document.createElement('i'));f.maxBars=Math.max(f.maxBars||0,f.bars);
   pp.querySelectorAll('i').forEach((e,n)=>{e.classList.toggle('gone',n>=f.bars);e.style.display=n<Math.max(2,f.maxBars)?'':'none'})}
  $(p+'-meter').style.width=f.meter+'%';$(p+'-meter').classList.toggle('full',f.meter>=100||f.instinct>0);
 });
 const bossHud=$('majic-boss-hud'),boss=tower&&tower.boss?game.fighters.find(f=>f.data.id==='majic'):null;
 if(bossHud){bossHud.classList.toggle('hidden',!boss);if(boss){const phase=Math.max(1,Math.min(3,boss.bossPhase||1));$('majic-boss-phase-name').textContent=phase===1?'PHASE I · THE JUNGLE TITAN':phase===2?'PHASE II · JUNGLE RAGE':'PHASE III · TRUE TITAN';$('majic-boss-status').textContent=phase===3?'FINAL FORM AWAKENED':phase===2?'THE ELEVEN BEASTS AWAKEN':'THE SUMMIT';$('majic-boss-health').style.width=Math.max(0,Math.min(100,boss.hp))+'%';bossHud.dataset.phase=String(phase);bossHud.querySelectorAll('.majic-phase-segment').forEach((seg,n)=>{const index=n+1;seg.classList.toggle('complete',index<phase);seg.classList.toggle('current',index===phase);seg.classList.toggle('locked',index>phase);seg.querySelector('i').style.width=index<phase?'100%':index===phase?Math.max(0,Math.min(100,boss.hp))+'%':'0%'})}}
}
function inDanger(f){return f.bars===1&&f.hp<=DANGER}

function update(dt){
 const F=game.fighters,[a,b]=F;
 F.forEach((f,i)=>{
  const o=F[1-i],inp=f.ai?cpuInput(i):mode==='online'?netInput(i):inputFor(i),frozen=!!game.ko;
  const rawAtk=inp.at&&!f.wasAttack&&!frozen,rawSp=inp.sp&&!f.wasSpecial&&!frozen,insEdge=inp.ins&&!f.wasIns&&!frozen;
  if((f.coilT||0)>0)f.coilT=Math.max(0,f.coilT-dt);
  if((f.venomT||0)>0){f.venomT=Math.max(0,f.venomT-dt);f.venomTick=(f.venomTick||0)-dt;if(f.venomTick<=0&&f.hp>0&&!game.ko){f.venomTick=.78;f.hp-=1.35;f.hitFlash=Math.max(f.hitFlash||0,.045);spark(f.x,f.y-155,'#9bd66b',5);if(f.hp<=0)resolveBars(f,game.fighters[f.venomBy===1?1:0]);}}
  // Secret "Titan's Bane": BLOCK, BLOCK, JUMP, JUMP, ATTACK within 2.5 s while fighting MAJIC.
  if(!f.ai&&o.data.id==='majic'&&(game.baneN||0)<2&&!game.ko&&o.hp>0){const ed=n=>inp[n]&&!(f.secPrev||{})[n];f.secT=(f.secT||0)+game.dt;
   const push=c=>{if(!f.sec||f.secT>2.5){f.sec='';f.secT=0}f.sec+=c};
   if(ed('bl'))push('B');if(ed('j'))push('J');if(rawAtk&&f.sec)push('A');
   if(f.sec&&!'BBJJA'.startsWith(f.sec.slice(-5))&&!'BBJJA'.startsWith(f.sec))f.sec=f.sec.endsWith('B')?'B':'';
   // 1st correct entry: MAJIC loses a whole life bar. 2nd correct entry: he falls for good.
   if(f.sec&&f.sec.endsWith('BBJJA')){game.bane=i+1;game.baneN=(game.baneN||0)+1;f.sec='';f.secT=0;
    if(game.baneN===1){if(o.bars>1){o.bars--;o.hp=BAR;o.potential=0;majicBossPhase(o)}
     banner("TITAN'S BANE",'MAJIC IS WEAKENED · ENTER IT AGAIN TO FINISH HIM',2,'#7fe8ff');game.shake=.5;game.flash=.4;floatText(o.x,o.y-340,'WEAKENED','#7fe8ff')}
    else{o.bars=1;o.hp=0;o.potential=0;o.stun=0;o.attack=0;o.vx=f.dir*480;o.vy=-420;o.ground=false;game.shake=.7;game.flash=1;
     spark(o.x,o.y-150,'#7fe8ff',40);floatText(o.x,o.y-340,"TITAN'S BANE",'#7fe8ff');hud();koFinish(o,f)}}
   f.secPrev={bl:inp.bl,j:inp.j,l:inp.l,r:inp.r}}
  f.wasAttack=inp.at;f.wasSpecial=inp.sp;f.wasIns=inp.ins;
  // Input buffer: a press up to 0.15 s early still comes out at the first legal moment.
  f.bufA=rawAtk?.15:Math.max(0,(f.bufA||0)-dt);f.bufS=rawSp?.15:Math.max(0,(f.bufS||0)-dt);
  let atkEdge=f.bufA>0,spEdge=f.bufS>0;
  if(sxInput(f,o,inp,atkEdge,spEdge,dt,frozen)){atkEdge=false;spEdge=false;f.bufA=0;f.bufS=0}
  const elephantGrab=f.data.id==='elephant'&&(inp.dn||inp.bl)&&atkEdge&&f.ground;
  const elephantStomp=f.data.id==='elephant'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const elephantCharge=f.data.id==='elephant'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  const hippoRush=f.data.id==='hippo'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const grizzlyMaul=f.data.id==='grizzly'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  const grizzlyPaw=f.data.id==='grizzly'&&(inp.dn||inp.bl)&&atkEdge&&f.ground;
  const lionRoar=f.data.id==='lion'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const crocodileRoll=f.data.id==='crocodile'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const jaguarAmbush=f.data.id==='jaguar'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  const wolfFrenzy=f.data.id==='wolf'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  const jaguarBite=f.data.id==='jaguar'&&(inp.dn||inp.bl)&&atkEdge&&f.ground;
  const hyenaFeint=f.data.id==='hyena'&&(inp.dn||inp.bl)&&atkEdge&&f.ground;
  const badgerBreaker=f.data.id==='badger'&&(inp.dn||inp.bl)&&atkEdge&&f.ground;
  const eagleSkyfall=f.data.id==='eagle'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  const snakeVenom=f.data.id==='snake'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const snakeCoil=f.data.id==='snake'&&(inp.dn||inp.bl)&&atkEdge&&f.ground;
  const stagAntler=f.data.id==='stag'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  const majicFrost=f.data.id==='majic'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const majicEclipse=f.data.id==='majic'&&(f.bossPhase||1)>=3&&inp.dn&&atkEdge&&f.ground;
  const majicAscend=f.data.id==='majic'&&inp.j&&(inp.dn||inp.bl)&&spEdge&&f.ground&&(f.ascendantCooldownT||0)<=0;
  const majicRage=f.data.id==='majic'&&inp.j&&!(inp.dn||inp.bl)&&spEdge&&f.ground&&(f.jungleRageCooldownT||0)<=0;
  const majicFury=f.data.id==='majic'&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1))&&spEdge&&f.ground&&((f.jungleRageT||0)>0||(f.ascendantT||0)>0);
  const tigerPounce=f.data.id==='tiger'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  f.lockout=Math.max(0,f.lockout-dt);f.breakWindow=Math.max(0,f.breakWindow-dt);f.hitFlash=Math.max(0,f.hitFlash-dt);
  if(f.instinct>0){f.instinct=Math.max(0,f.instinct-dt);f.meter=f.instinct/8*100;if(!f.instinct)f.meter=0}
  const spd=(f.instinct?1.2:1)*(f.data.id==='majic'&&(((f.jungleRageT||0)>0||(f.ascendantT||0)>0)||(f.bossPhase||1)>=2)?1.12:1);
  if(f.hp<=0&&f.bars<=1){f.action='knockdown';f.koTime+=dt;physics(f,dt);return}
  if(game.ko&&o.hp<=0&&o.bars<=1&&f.ground&&f.attack<=0&&f.stun<=0&&f.down<=0){f.winT=(f.winT||0)+dt;if(f.winT>.18){const fd=finDur(f);if(fd&&f.winT<.18+fd){f.action='finisher';f.finT=f.winT-.18;f.finOff=.18+fd;const gx=o.x-f.dir*FIN_GAP;if(f.finT<.5)f.x+=(gx-f.x)*Math.min(1,dt*10);f.vx=0;physics(f,dt);return}f.action='victory';physics(f,dt);return}}
  // ----- Knocked down (after an ender) -----
  if(f.down>0){f.down-=dt;f.action='down';physics(f,dt);if(f.down<=0)f.action='idle';return}
  // ----- Hitstun: the only thing you can do is try a Combo Breaker -----
  if(f.stun>0){
   f.hitAnimTime=(f.action==='hit'?(f.hitAnimTime||0)+dt:0);f.stun-=dt;f.action='hit';
   f.bufA=0;f.bufS=0;
   if(rawAtk&&o.combo>=1&&!f.lockout){
    if(o.breakWindow>0)comboBreaker(i);
    else{f.lockout=2.2;sfx('lockout');soundOn&&AU&&AU.now('voice.lockout');floatText(f.x,f.y-300,'LOCKOUT','#ff5a4a');}
   }
   if(f.stun<=0)endCombo(1-i,false);
   physics(f,dt);return;
  }
  f.leopardCounter=Math.max(0,(f.leopardCounter||0)-dt);
  f.lionCounterT=Math.max(0,(f.lionCounterT||0)-dt);
  f.wolfCounterT=Math.max(0,(f.wolfCounterT||0)-dt);
  f.leopardDashT=Math.max(0,(f.leopardDashT||0)-dt);
  f.leopardAirFollowT=Math.max(0,(f.leopardAirFollowT||0)-dt);
  f.leopardFrostDiveT=Math.max(0,(f.leopardFrostDiveT||0)-dt);
  f.leopardDashCooldown=Math.max(0,(f.leopardDashCooldown||0)-dt);
  f.elephantGrabT=Math.max(0,(f.elephantGrabT||0)-dt);
  f.elephantStompT=Math.max(0,(f.elephantStompT||0)-dt);
  f.elephantCounterT=Math.max(0,(f.elephantCounterT||0)-dt);
  f.elephantChargeT=Math.max(0,(f.elephantChargeT||0)-dt);
  f.tigerPounceT=Math.max(0,(f.tigerPounceT||0)-dt);
  f.jaguarCommitT=Math.max(0,(f.jaguarCommitT||0)-dt);
  f.wolfFrenzyT=Math.max(0,(f.wolfFrenzyT||0)-dt);
  f.tigerCounterT=Math.max(0,(f.tigerCounterT||0)-dt);
  f.tigerEvadeT=Math.max(0,(f.tigerEvadeT||0)-dt);
  f.hyenaCounterT=Math.max(0,(f.hyenaCounterT||0)-dt);
  f.eagleCounterT=Math.max(0,(f.eagleCounterT||0)-dt);
  f.stagCounterT=Math.max(0,(f.stagCounterT||0)-dt);
  if((f.jungleRageT||0)>0)f.jungleRageT=Math.max(0,f.jungleRageT-dt);
  if((f.jungleRageCooldownT||0)>0)f.jungleRageCooldownT=Math.max(0,f.jungleRageCooldownT-dt);
  if((f.ascendantT||0)>0)f.ascendantT=Math.max(0,f.ascendantT-dt);
  if((f.ascendantCooldownT||0)>0)f.ascendantCooldownT=Math.max(0,f.ascendantCooldownT-dt);
  if((f.majicVoidGuardT||0)>0)f.majicVoidGuardT=Math.max(0,f.majicVoidGuardT-dt);
  if((f.majicDefenseCooldownT||0)>0)f.majicDefenseCooldownT=Math.max(0,f.majicDefenseCooldownT-dt);
  f.eagleEvadeT=Math.max(0,(f.eagleEvadeT||0)-dt);
  f.badgerCounterT=Math.max(0,(f.badgerCounterT||0)-dt);
  f.hyenaEvadeT=Math.max(0,(f.hyenaEvadeT||0)-dt);
  f.crocodileCounterT=Math.max(0,(f.crocodileCounterT||0)-dt);
  f.grizzlyCounterT=Math.max(0,(f.grizzlyCounterT||0)-dt);
  f.hippoRushT=Math.max(0,(f.hippoRushT||0)-dt);
  f.hippoCounterT=Math.max(0,(f.hippoCounterT||0)-dt);
  f.block=inp.bl&&f.ground&&f.attack<=0&&!frozen&&(f.coilT||0)<=0;f.blockTime=f.block?f.blockTime+dt:0;
  // ----- Attacking -----
  if(f.attack>0){
   f.attack-=dt*spd;f.actionTime=f.attack;f.elapsed+=dt*spd;
   const mv=f.move_;
   if(mv&&mv.eagleWingCounter&&!f.eagleCounterDive&&f.elapsed>=.20){f.eagleCounterDive=1;f.vy=500;f.vx=f.dir*540;spark(f.x-f.dir*26,f.y-205,'#fff0b0',16);}
   if(mv&&mv.stagAntler&&!f.stagChargeStarted&&f.elapsed>=.16){f.stagChargeStarted=1;f.vx=f.dir*625;spark(f.x-f.dir*34,f.y-125,'#c7e6a0',16);game.fx.push({x:f.x-f.dir*28,y:f.y-8,t:0,life:.34,color:'#b6d98b',kind:'ring'});}
   if(mv&&mv.eagleSkyfall&&!f.eagleDiveStarted&&f.elapsed>=.22){f.eagleDiveStarted=1;f.vy=560;f.vx=f.dir*620;spark(f.x-f.dir*28,f.y-185,'#fff0b0',10);}
   if(mv&&mv.hyenaFeint&&!f.hyenaFeintLunge&&f.elapsed>=.18){f.hyenaFeintLunge=1;f.vx=f.dir*570;floatText(f.x,f.y-305,'MAD JAW','#e5c47b');game.shake=Math.max(game.shake,.12)}
   while(mv&&f.hitsDone<mv.hits.length&&f.elapsed>=mv.hits[f.hitsDone]){f.hitsDone++;resolveHit(i,mv);}
   // Linking: with the opponent still reeling, ATTACK = auto-double, SPECIAL = ender.
   const linkable=o.stun>0&&f.combo>0&&f.attack<.17&&(!mv||!mv.base||f.hitsDone>=mv.hits.length); // let every claw of the leopard's flurry land before the next link
   if(linkable&&atkEdge&&f.combo<14)doMove(f,'double');
   else if(linkable&&spEdge)doMove(f,inp.bl&&f.meter>=50?'shadow':'ender');
   if(f.attack<=0){f.attack=0;f.move_=null}
   physics(f,dt);return;
  }
  // ----- Neutral -----
  let move=0;
  if(!f.block&&!frozen){
   const snowLeopard=f.data.id==='leopard',jaguar=f.data.id==='jaguar',wolf=f.data.id==='wolf';const stag=f.data.id==='stag';const sp=240*f.data.speed/7*spd*(snowLeopard?1.10:jaguar?1.035:wolf?1.025:stag?1.035:1)*((f.venomT||0)>0?.82:1)*((f.coilT||0)>0?.38:1);if(inp.l)move=-sp;if(inp.r)move=sp;
   // Snow Leopard frost dash: double-tap forward or back.
   if(f.data.id==='leopard'){const tap=inp.r&&!f.tapPrevR?1:inp.l&&!f.tapPrevL?-1:0;f.tapPrevR=inp.r;f.tapPrevL=inp.l;f.tapT=(f.tapT||0)+dt;
    if(tap){if(f.ground&&f.leopardDashCooldown<=0&&f.lastTap===tap&&f.tapT<.26){f.leopardDashT=.22;f.leopardDashCooldown=.7;f.moveVel=tap*680;f.lastTap=0;sfx('whiff')}else{f.lastTap=tap;f.tapT=0}}}
   if(inp.j&&f.ground&&!majicRage){if(f.data.id==='leopard'&&f.leopardDashT>0)f.leopardAirFollowT=.65;f.vy=-560;f.ground=false;}
   if(f.data.id==='leopard'&&!f.ground&&f.leopardAirFollowT>0&&atkEdge){f.leopardAirFollowT=0;f.leopardFrostDiveT=.9;doMove(f,'bite');f.vx=f.dir*430;f.vy=-95;floatText(f.x,f.y-285,'FROST DIVE','#9feaff')}
   else if(insEdge&&f.meter>=100&&!f.instinct){f.instinct=8;sfx('instinct');banner('INSTINCT',f.data.name,1);say('Instinct');game.flash=.5}
   else if(f.data.id==='leopard'&&f.leopardCounter>0&&atkEdge){f.leopardCounter=0;doMove(f,'bite');f.vx=f.dir*270;floatText(f.x,f.y-285,'FROST COUNTER','#9feaff')}
   else if(f.data.id==='elephant'&&f.elephantCounterT>0&&atkEdge){f.elephantCounterT=0;doMove(f,'tuskCounter');}
   else if(f.data.id==='hippo'&&f.hippoCounterT>0&&atkEdge){f.hippoCounterT=0;doMove(f,'riverCounter')}
   else if(f.data.id==='grizzly'&&f.grizzlyCounterT>0&&atkEdge){f.grizzlyCounterT=0;doMove(f,'bearCounter')}
   else if(f.data.id==='badger'&&f.badgerCounterT>0&&atkEdge){f.badgerCounterT=0;doMove(f,'ironCounter')}
   else if(f.data.id==='stag'&&f.stagCounterT>0&&atkEdge){f.stagCounterT=0;doMove(f,'stagCounter')}
   else if(f.data.id==='lion'&&f.lionCounterT>0&&atkEdge){f.lionCounterT=0;doMove(f,'lionCounter')}
   else if(f.data.id==='tiger'&&f.tigerCounterT>0&&atkEdge){f.tigerCounterT=0;doMove(f,'tigerSlip')}
   else if(f.data.id==='crocodile'&&f.crocodileCounterT>0&&atkEdge){f.crocodileCounterT=0;doMove(f,'tailCounter')}
   else if(f.data.id==='wolf'&&f.wolfCounterT>0&&atkEdge){f.wolfCounterT=0;doMove(f,'wolfCounter')}
   else if(f.data.id==='hyena'&&f.hyenaCounterT>0&&atkEdge){f.hyenaCounterT=0;doMove(f,'hyenaSlip')}
   else if(f.data.id==='eagle'&&f.eagleCounterT>0&&atkEdge){f.eagleCounterT=0;doMove(f,'eagleWingCounter')}
   else if(majicEclipse)doMove(f,'majicEclipse');
   else if(o.stun>0&&f.combo>0&&atkEdge)doMove(f,'double');
   else if(o.stun>0&&f.combo>0&&spEdge)doMove(f,'ender');
   else if(atkEdge)doMove(f,'claw');
   else if(elephantCharge)doMove(f,'charge');
   else if(grizzlyMaul)doMove(f,'grizzlyMaul');
   else if(tigerPounce)doMove(f,'tigerPounce');
   else if(eagleSkyfall)doMove(f,'eagleSkyfall');
   else if(stagAntler)doMove(f,'stagAntler');
   else if(majicRage)doMove(f,'jungleRage');
   else if(majicFury)doMove(f,'titanFury');
   else if(majicFrost&&inp.dn)doMove(f,'frostStrike');
   else if(jaguarAmbush)doMove(f,'jaguarAmbush');
   else if(wolfFrenzy)doMove(f,'wolfFrenzy');
   else if(spEdge)doMove(f,'special');
  }
  if(f.block&&!frozen){
   // Elephant while blocking: a fresh block opens the Tusk Counter; otherwise block+attack = Trunk Grab
   // and block+special = Titan Stomp (the shadow move keeps priority once he has half a meter).
   if(spEdge&&majicAscend){f.block=false;doMove(f,'ascendantForm')}
   else if(spEdge&&f.meter>=50){f.block=false;doMove(f,'shadow')}
   else if(spEdge&&elephantStomp){f.block=false;doMove(f,'stomp')}
   else if(spEdge&&hippoRush){f.block=false;doMove(f,'hippoRush')}
   else if(spEdge&&lionRoar){f.block=false;doMove(f,'lionRoar')}
   else if(spEdge&&crocodileRoll){f.block=false;doMove(f,'crocodileRoll')}
   else if(spEdge&&snakeVenom){f.block=false;doMove(f,'snakeVenom')}
   else if(spEdge&&majicFrost){f.block=false;doMove(f,'frostStrike')}
   else if(atkEdge){f.block=false;if(f.data.id==='elephant'&&f.elephantCounterT>0){f.elephantCounterT=0;doMove(f,'tuskCounter')}else if(f.data.id==='hippo'&&f.hippoCounterT>0){f.hippoCounterT=0;doMove(f,'riverCounter')}else if(f.data.id==='grizzly'&&f.grizzlyCounterT>0){f.grizzlyCounterT=0;doMove(f,'bearCounter')}else if(f.data.id==='lion'&&f.lionCounterT>0){f.lionCounterT=0;doMove(f,'lionCounter')}
    else if(f.data.id==='tiger'&&f.tigerCounterT>0){f.tigerCounterT=0;doMove(f,'tigerSlip')}else if(f.data.id==='crocodile'&&f.crocodileCounterT>0){f.crocodileCounterT=0;doMove(f,'tailCounter')}else if(f.data.id==='wolf'&&f.wolfCounterT>0){f.wolfCounterT=0;doMove(f,'wolfCounter')}else if(f.data.id==='hyena'&&f.hyenaCounterT>0){f.hyenaCounterT=0;doMove(f,'hyenaSlip')}else if(f.data.id==='badger'&&f.badgerCounterT>0){f.badgerCounterT=0;doMove(f,'ironCounter')}else if(f.data.id==='eagle'&&f.eagleCounterT>0){f.eagleCounterT=0;doMove(f,'eagleWingCounter')}else if(f.data.id==='stag'&&f.stagCounterT>0){f.stagCounterT=0;doMove(f,'stagCounter')}else if(hyenaFeint&&!(o.stun>0&&f.combo>0))doMove(f,'hyenaFeint');else if(snakeCoil&&!(o.stun>0&&f.combo>0))doMove(f,'snakeCoil');else if(badgerBreaker&&!(o.stun>0&&f.combo>0))doMove(f,'badgerBreaker');else if(jaguarBite&&!(o.stun>0&&f.combo>0))doMove(f,'jaguarBite');else if(elephantGrab&&!(o.stun>0&&f.combo>0))doMove(f,'grab');else if(grizzlyPaw&&!(o.stun>0&&f.combo>0))doMove(f,'grizzlyPaw');else doMove(f,o.stun>0&&f.combo>0?'double':'bite')}
  }
  // Smoothly accelerate and decelerate horizontal input. Keep this separate
  // from vx, which is reserved for hit knockback and physics impulses.
  // Character-specific handling: agile fighters react quickly to direction
  // changes; Hyena snaps into deceptive reversals, while heavier bodies build
  // and shed momentum more deliberately.
  const bodyMass=FIGHTER_MASS[f.data.id]||1;
  const agility=clamp((f.data.speed||7)/7,.72,1.42);
  const handling=clamp(12.5*agility/Math.sqrt(bodyMass)+(f.data.id==='leopard'?5.2:0)+(f.data.id==='hyena'?4.4:0)+(f.data.id==='stag'?1.8:0),7.8,26);
  const moveResponse=1-Math.exp(-dt*handling);
  if(f.data.id==='leopard'&&f.leopardDashT>0)f.moveVel=Math.sign(f.moveVel||move)*720;
  else if(f.data.id==='hyena'&&move!==0&&Math.sign(move)!==Math.sign(f.moveVel||move)&&Math.abs(f.moveVel)>95){f.moveVel+=(move-f.moveVel)*Math.min(1,moveResponse*1.32)}
  else if(f.data.id==='grizzly'&&move===0){f.moveVel*=Math.exp(-dt*4.8)}
  else if(f.data.id==='grizzly'&&move!==0){f.moveVel+=(move-f.moveVel)*moveResponse*.82}
  else if(f.data.id==='hippo'&&move===0){f.moveVel*=Math.exp(-dt*3.25)}
  else if(f.data.id==='hippo'&&move!==0){f.moveVel+=(move-f.moveVel)*moveResponse*.72}
  // Crocodile: low-slung ambush predator. It builds forward drive deliberately,
  // carries momentum through a committed rush, and pivots more slowly than
  // the feline fighters. This changes handling only, not attack balance.
  else if(f.data.id==='crocodile'&&move===0){f.moveVel*=Math.exp(-dt*3.9)}
  else if(f.data.id==='crocodile'&&move!==0){const reversal=Math.sign(move)!==Math.sign(f.moveVel||move);f.moveVel+=(move-f.moveVel)*moveResponse*(reversal?.68:.86)}
  // Stag: grounded forest guardian. It carries athletic leg-drive into a charge,
  // but plants and redirects its weight deliberately when changing direction.
  else if(f.data.id==='stag'&&move===0){f.moveVel*=Math.exp(-dt*5.2)}
  else if(f.data.id==='stag'&&move!==0){const reversal=Math.sign(move)!==Math.sign(f.moveVel||move);f.moveVel+=(move-f.moveVel)*moveResponse*(reversal?.76:1.04)}
  else f.moveVel+=(move-f.moveVel)*moveResponse;
  if(Math.abs(f.moveVel)<2&&move===0)f.moveVel=0;
  f.move=f.moveVel;f.x+=f.moveVel*dt;
  physics(f,dt);
  if(f.attack<=0)f.action=f.block?'block':(!f.ground?'jump':Math.abs(move)>35?'walk':(Math.floor(performance.now()/1800)%3===0?'breathing':'idle'));
  f.walk+=Math.abs(f.moveVel)*dt*.025;
 });
 if(mode==='training'){F.forEach(f=>{f.hp=BAR;f.bars=f.data.id==='majic'?3:2;f.potential=0});b.down=0;}
 const gap=Math.abs(a.x-b.x),minGap=Math.max(130,(bodyFront(a)+bodyFront(b))*.95);
 if(gap<minGap&&Math.abs(a.y-b.y)<120){const push=(minGap-gap)/2,s=a.x<b.x?-1:1;a.x=clampX(a.x+push*s);b.x=clampX(b.x-push*s);}
 // Always turn to face the opponent once you're free; if you get knocked, pulled or teleported past while hurt, turn right away so you face whoever moved you.
 if(a.hp>0&&b.hp>0&&(!a.attack||a.stun>0)&&Math.abs(b.x-a.x)>4)a.dir=b.x>=a.x?1:-1;
 if(a.hp>0&&b.hp>0&&(!b.attack||b.stun>0)&&Math.abs(a.x-b.x)>4)b.dir=a.x>=b.x?1:-1;
 F.forEach((f,i)=>{if(inDanger(f)&&f.hp>0&&!game.dangerSaid[i]){game.dangerSaid[i]=1;floatText(f.x,f.y-310,'DANGER','#ff4030');say('Danger')}});
 F.forEach(f=>{const frostPounce=f.data.id==='leopard'&&f.action==='pounce'&&f.attack>0;const frostDash=f.data.id==='leopard'&&(f.leopardDashT||0)>0;if(f.instinct||f.action==='shadow'||frostPounce||frostDash){f.trail.push({x:f.x,y:f.y,dir:f.dir,a:f.action,frost:!!(frostPounce||frostDash),t:frostDash?.2:frostPounce?.32:.25});}f.trail=f.trail.filter(p=>(p.t-=dt)>0).slice(-10)});
 hud();
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clampX=x=>Math.max(72,Math.min(1028,x));
function physics(f,dt){
 f.x=clampX(f.x+f.vx*dt);
 f.landImpact=Math.max(0,(f.landImpact||0)-dt*2.8);
 f.frostImpact=Math.max(0,(f.frostImpact||0)-dt*2.4);
 if(f.data.id==='leopard'&&f.ground&&Math.abs(f.vx)>35)f.vx*=Math.max(0,1-dt*8.5);
 if(f.data.id==='jaguar'&&f.ground&&Math.abs(f.vx)>30)f.vx*=Math.max(0,1-dt*11.5);
 // Wolves carry a little forward momentum between coordinated pack attacks,
 // but settle quickly when grounded so footwork remains controllable.
 if(f.data.id==='wolf'&&f.ground&&Math.abs(f.vx)>28)f.vx*=Math.max(0,1-dt*8.8);
 f.elephantImpact=Math.max(0,(f.elephantImpact||0)-dt*2.0);
 f.leopardFinisher=Math.max(0,(f.leopardFinisher||0)-dt*2.2);
 f.lionManeFinisher=Math.max(0,(f.lionManeFinisher||0)-dt*2.0);
 f.hyenaFrenzyFinisher=Math.max(0,(f.hyenaFrenzyFinisher||0)-dt*2.25);
 const wasAirborne=!f.ground;
 f.y+=f.vy*dt;f.vy+=1500*dt;
 if(f.y>0){
  if(wasAirborne){
   if(f.data.id==='leopard'&&f.action==='pounce'&&f.attack>0)f.frostImpact=.52;
   if(f.data.id==='elephant'&&f.elephantSlamArmed){f.elephantImpact=.62;f.elephantSlamArmed=0;}
   // Capture landing speed before zeroing vertical velocity. This is visual
   // feedback only and does not add damage, stun, or alter the jump arc.
   f.landImpact=clamp(Math.abs(f.vy)/900,.18,1);
  }
  f.y=0;f.vy=0;f.ground=true;
 }
 f.vx*=Math.pow(.004,dt);
}
function dojoChallengeHit(f,mv){
 if(mode!=='training'||f!==game.fighters[0]||dojoChallenge.complete)return;
 const trial=DOJO_SIGNATURE_TRIALS[f.data.id]||DOJO_SIGNATURE_TRIALS.badger;
 if(dojoChallenge.step<1)dojoChallenge.step=1;
 if(f.combo>=3&&dojoChallenge.step<2)dojoChallenge.step=2;
 if(f.combo>=3&&f.dojoMoveName!==trial.move)dojoChallenge.comboAt=performance.now();
 // The signature can land in the combo itself or right after it: many signatures can't be cancelled into mid-combo.
 const now=performance.now(),fresh=f.combo>=3||(dojoChallenge.comboAt&&now-dojoChallenge.comboAt<2600);
 if(f.dojoMoveName===trial.move&&fresh&&dojoChallenge.step>=2&&dojoChallenge.step<3){dojoChallenge.step=3;dojoChallenge.complete=true;dojoChallenge.medal=true;
  try{const key='kotj-dojo-medals-v1',data=JSON.parse(localStorage.getItem(key)||'{}'),id=f.data.id;data[id]=true;localStorage.setItem(key,JSON.stringify(data));const tk='kotj-dojo-signature-trials-v1',trials=JSON.parse(localStorage.getItem(tk)||'{}');trials[id]={label:trial.label,completedAt:Date.now()};localStorage.setItem(tk,JSON.stringify(trials))}catch(e){}
  banner('DOJO MASTERED','SIGNATURE COMBO COMPLETE · MEDAL EARNED',1.7,'#e8c66f');floatText(f.x,f.y-340,'DOJO MEDAL EARNED','#f2d58c');spark(f.x,f.y-150,'#e8c66f',24);sfx('victory');
 }
 [1,2,3].forEach(n=>$('dojo-step-'+n).classList.toggle('done',dojoChallenge.step>=n));$('dojo-challenge-status').textContent=dojoChallenge.complete?'MASTERED · MEDAL EARNED':`STEP ${Math.min(3,dojoChallenge.step+1)} OF 3`;$('dojo-challenge-fill').style.width=(dojoChallenge.step/3*100)+'%';
}
function doMove(f,name){
 f.bufA=0;f.bufS=0;
 const mv=name==='majicEclipse'&&f.data.id==='majic'?{t:1.38,hits:[.34,.72,1.10],dmg:p=>6.2+p*.38,range:390,stun:.78,push:315,majicEclipse:true}:name==='titanFury'&&f.data.id==='majic'?{t:1.08,hits:[.16,.36,.57,.81],dmg:p=>4.2+p*.28,range:405,stun:.72,push:285,majicFury:true}:name==='ascendantForm'&&f.data.id==='majic'?{t:.82,hits:[],dmg:p=>0,range:0,stun:0,push:0,majicAscendant:true}:name==='frostStrike'&&f.data.id==='majic'?{t:.78,hits:[.42],dmg:p=>14+p*.82,range:405,stun:.86,push:300,majicFrost:true}:name==='jungleRage'&&f.data.id==='majic'?{t:.72,hits:[],dmg:p=>0,range:0,stun:0,push:0,majicRage:true}:name==='stagAntler'&&f.data.id==='stag'?{t:.72,hits:[.42],dmg:p=>13+p*.74,range:375,stun:.82,push:355,stagAntler:true}:name==='stagCounter'&&f.data.id==='stag'?{t:.54,hits:[.19],dmg:p=>12+p*.72,range:315,stun:.78,push:325,stagCounter:true}:name==='snakeCoil'&&f.data.id==='snake'?{t:.72,hits:[.34],dmg:p=>10.5+p*.62,range:265,stun:.92,push:72,snakeCoil:true}:name==='snakeVenom'&&f.data.id==='snake'?{t:.66,hits:[.29],dmg:p=>11+p*.68,range:285,stun:.72,push:205,snakeVenom:true}:name==='eagleWingCounter'&&f.data.id==='eagle'?{t:.62,hits:[.36],dmg:p=>12+p*.72,range:340,stun:.78,push:325,eagleWingCounter:true}:name==='eagleSkyfall'&&f.data.id==='eagle'?{t:.68,hits:[.48],dmg:p=>13+p*.76,range:365,stun:.76,push:335,eagleSkyfall:true}:name==='ironCounter'&&f.data.id==='badger'?{t:.54,hits:[.20],dmg:p=>12+p*.7,range:295,stun:.76,push:305,ironCounter:true}:name==='badgerBreaker'&&f.data.id==='badger'?{t:.72,hits:[.36],dmg:p=>12+p*.72,range:310,stun:.78,push:315,badgerBreaker:true}:name==='wolfCounter'&&f.data.id==='wolf'?{t:.54,hits:[.20],dmg:p=>12+p*.68,range:300,stun:.72,push:300,wolfCounter:true}:name==='hyenaFeint'&&f.data.id==='hyena'?{t:.58,hits:[.34],dmg:p=>13+p*.72,range:270,stun:.76,push:310,hyenaFeint:true}:name==='hyenaSlip'&&f.data.id==='hyena'?{t:.48,hits:[.16],dmg:p=>10+p*.66,range:295,stun:.66,push:265,hyenaSlip:true}:name==='tailCounter'&&f.data.id==='crocodile'?{t:.58,hits:[.22],dmg:p=>12+p*.72,range:325,stun:.74,push:325,tailCounter:true}:name==='jaguarAmbush'&&f.data.id==='jaguar'?{t:.66,hits:[.20,.43],dmg:p=>7+p*.54,range:335,stun:.68,push:285,jaguarAmbush:true}:name==='jaguarBite'&&f.data.id==='jaguar'?{t:.58,hits:[.24],dmg:p=>15+p*.78,range:245,stun:.86,push:340,jaguarBite:true}:name==='wolfFrenzy'&&f.data.id==='wolf'?{t:.78,hits:[.20,.40,.60],dmg:p=>6+p*.43,range:330,stun:.66,push:245,wolfFrenzy:true}:name==='crocodileRoll'&&f.data.id==='crocodile'?{t:.82,hits:[.27,.53],dmg:p=>7+p*.58,range:345,stun:.74,push:305,crocodileRoll:true}:name==='tigerSlip'&&f.data.id==='tiger'?{t:.48,hits:[.16],dmg:p=>10+p*.68,range:300,stun:.66,push:270,tigerSlip:true}:name==='tigerPounce'&&f.data.id==='tiger'?{t:.62,hits:[.22,.40],dmg:p=>5+p*.4,range:310,stun:.56,push:155,tigerPounce:true}:name==='lionCounter'&&f.data.id==='lion'?{t:.56,hits:[.20],dmg:p=>12+p*.72,range:365,stun:.78,push:335,lionCounter:true}:name==='lionRoar'&&f.data.id==='lion'?{t:.84,hits:[.43],dmg:p=>7+p*.62,range:440,stun:.82,push:365,lionRoar:true}:name==='grizzlyPaw'&&f.data.id==='grizzly'?{t:.66,hits:[.34],dmg:p=>11+p*.72,range:285,stun:.7,push:245,grizzlyPaw:true}:name==='grizzlyMaul'&&f.data.id==='grizzly'?{t:.72,hits:[.29,.49],dmg:p=>9+p*.72,range:305,stun:.62,push:285,grizzlyMaul:true}:name==='hippoRush'&&f.data.id==='hippo'?{t:.74,hits:[.30,.52],dmg:p=>9+p*.62,range:320,stun:.58,push:265,hippoRush:true}:name==='charge'&&f.data.id==='elephant'?{t:.68,hits:[.24,.43],dmg:p=>7+p*.52,range:325,stun:.48,push:245,charge:true}:name==='grab'&&f.data.id==='elephant'?{t:.72,hits:[.31],dmg:p=>12+p*.85,range:250,stun:.78,push:175,grab:true}:name==='stomp'&&f.data.id==='elephant'?{t:.9,hits:[.48],dmg:p=>9+p*.7,range:330,stun:.58,push:340,stomp:true}:name==='tuskCounter'&&f.data.id==='elephant'?{t:.52,hits:[.19],dmg:p=>13+p*.72,range:285,stun:.72,push:295,tuskCounter:true}:name==='bearCounter'&&f.data.id==='grizzly'?{t:.54,hits:[.20],dmg:p=>12+p*.7,range:290,stun:.72,push:300,bearCounter:true}:name==='riverCounter'&&f.data.id==='hippo'?{t:.56,hits:[.20],dmg:p=>12+p*.68,range:295,stun:.68,push:285,riverCounter:true}:MOVES[name];
 const o=game.fighters.find(x=>x!==f);
 if(o.stun>0&&f.combo>0&&(name==='ender'||name==='double'||name==='shadow'))o.stun=Math.max(o.stun,mv.hits[0]+.12); /* a linked move is guaranteed to connect */
 // The snow leopard turns her linked double into a rapid three-hit claw flurry.
 // Each strike is lighter so the combined damage stays close to the standard double.
 const moveData=f.data.id==='leopard'&&name==='double'?{...mv,base:MOVES.double,t:.36,hits:[.055,.155,.255],dmg:p=>(2.6+p*.35)*2/3}:f.data.id==='lion'&&name==='double'?{...mv,base:MOVES.double,t:.39,hits:[.055,.17,.285],dmg:p=>(2.6+p*.35)*2/3}:f.data.id==='tiger'&&name==='double'?{...mv,base:MOVES.double,t:.43,hits:[.045,.135,.225,.315],dmg:p=>(2.6+p*.35)*.5}:f.data.id==='hyena'&&name==='double'?{...mv,base:MOVES.double,t:.38,hits:[.05,.155,.26],dmg:p=>(2.6+p*.35)*2/3}:f.data.id==='eagle'&&name==='double'?{...mv,base:MOVES.double,t:.39,hits:[.05,.16,.27],dmg:p=>(2.6+p*.35)*2/3,eagleWingCombo:true}:mv;
 f.move_=moveData;f.attack=moveData.t;f.hitsDone=0;f.elapsed=0;if(name==='hyenaFeint'){f.hyenaFeintLunge=0;f.vx=-f.dir*105;floatText(f.x,f.y-290,'MAD FEINT','#d7b46a');sfx('whiff')}
 f.chain=(f.chain||0)+1;
 // Match approach distance to the exact animation selected for this attack, including alternating double strikes.
 // Linked combo strikes get a shorter, softer chase step so knockback does not leave them visibly swinging short.
 const comboLink=o.stun>0&&f.combo>0;
 f.comboLinked=comboLink;
 if(f.ground&&!mv.shadow){const need=Math.abs(o.x-f.x)-hitDist(f,o,moveAnim(f,mv))+6;const maxGap=comboLink?105:70;if(need>0&&need<maxGap){const chase=comboLink?Math.min(260,need*4.2):Math.min(380,need*6);f.vx=f.dir*Math.max(Math.abs(f.vx),chase)}}
 const special=name==='special'||name==='titanFury'||name==='majicEclipse'||name==='frostStrike'||name==='ender'||name==='shadow'||name==='stagAntler'||name==='snakeVenom'||name==='eagleSkyfall'||name==='eagleWingCounter'||name==='tigerPounce'||name==='jaguarAmbush'||name==='wolfFrenzy';
 f.dojoMoveName=name;f.dojoMoveSpecial=!!special||['frostStrike','stagAntler','snakeCoil','snakeVenom','eagleSkyfall','eagleWingCounter','badgerBreaker','hyenaFeint','wolfFrenzy','jaguarAmbush','tigerPounce','lionRoar','grizzlyMaul','grizzlyPaw','hippoRush','crocodileRoll','charge','grab','stomp','majicEclipse'].includes(name);
 setAction(f,name==='frostStrike'?'special_c':name==='jungleRage'||name==='ascendantForm'?'special_d':name==='titanFury'||name==='majicEclipse'?'ultra_move':name==='badgerBreaker'?'earthslam':name==='stagCounter'?'attack_heavy':name==='snakeCoil'?'special_b':name==='snakeVenom'?'bite':name==='ironCounter'?'attack_heavy':name==='claw'?'claw':name==='bite'||name==='jaguarBite'||name==='hyenaFeint'?'bite':name==='double'?'double':name==='grab'?'bite':name==='stomp'||name==='tuskCounter'||name==='bearCounter'||name==='riverCounter'||name==='charge'||name==='hippoRush'||name==='grizzlyMaul'||name==='grizzlyPaw'||name==='lionRoar'||name==='lionCounter'||name==='tigerSlip'||name==='crocodileRoll'||name==='tailCounter'||name==='wolfCounter'||name==='hyenaSlip'?'attack_heavy':name==='shadow'?'shadow':name==='ender'?'ender':special?(f.data.id==='badger'?'earthslam':'pounce'):name,moveData.t);
 if(name==='tigerSlip'){f.tigerEvadeT=.19;f.vx=f.dir*390;floatText(f.x,f.y-315,'STRIPED SLIP','#f0a34e');game.shake=Math.max(game.shake,.18);sfx('whiff')}
 if(name==='crocodileRoll'){f.vx=f.dir*585;floatText(f.x,f.y-300,'DEATH ROLL','#79d6bd');game.shake=Math.max(game.shake,.16);sfx('heavy')}
 if(name==='tailCounter'){f.vx=f.dir*260;floatText(f.x,f.y-300,'TAIL COUNTER','#75d8c4');game.shake=Math.max(game.shake,.22);sfx('heavy')}
 if(name==='badgerBreaker'){f.vx=f.dir*75;f.vy=0;floatText(f.x,f.y-300,'EARTHBREAKER','#d7a85b');game.shake=Math.max(game.shake,.16);sfx('heavy')}
 if(name==='frostStrike'){f.vx=f.dir*105;floatText(f.x,f.y-315,'FROST STRIKE','#7fe8ff');banner('FROST STRIKE','THE TITAN COMMANDS THE COLD',.9,'#7fe8ff');spark(f.x+f.dir*30,f.y-155,'#baf6ff',20);game.flash=Math.max(game.flash||0,.09);game.shake=Math.max(game.shake,.18);sfx('frost')}
 if(name==='jungleRage'){f.jungleRageT=7.5;f.jungleRageCooldownT=18;f.vx=f.dir*35;floatText(f.x,f.y-330,'JUNGLE RAGE','#d8b5ff');banner('JUNGLE RAGE','ALL BEASTS ANSWER THE TITAN',1.05,'#c49aff');for(const color of ['#f3c45d','#9edce5','#b6d98b','#a8d66d','#f0a34e','#b9f6ff']){game.fx.push({x:f.x,y:f.y-155,t:0,life:.72,color,kind:'ring'});spark(f.x+(Math.random()-.5)*100,f.y-145+(Math.random()-.5)*100,color,5)}game.flash=Math.max(game.flash||0,.12);game.shake=Math.max(game.shake,.2);sfx('instinct')}
 if(name==='ascendantForm'){f.ascendantT=8.5;f.ascendantCooldownT=24;f.jungleRageT=0;f.vx=f.dir*35;floatText(f.x,f.y-350,'TRUE TITAN FORM','#e7c8ff');banner('TRUE TITAN FORM','THE JUNGLE BOWS TO MAJIC',1.25,'#d7b5ff');for(let k=0;k<12;k++){const color=['#e8c56b','#b8a0ff','#8de0d0'][k%3],a=k*Math.PI/6;game.fx.push({x:f.x+Math.cos(a)*72,y:f.y-155+Math.sin(a)*78,t:0,life:.9,color,kind:'ring'});spark(f.x+Math.cos(a)*95,f.y-155+Math.sin(a)*95,color,4)}game.flash=Math.max(game.flash||0,.24);game.shake=Math.max(game.shake,.34);game.hitstop=Math.max(game.hitstop||0,.08);sfx('instinct')}
 if(name==='titanFury'){f.vx=f.dir*185;if((f.bossPhase||1)<2)f.jungleRageT=0;if((f.bossPhase||1)<3)f.ascendantT=0;floatText(f.x,f.y-330,'TITAN FURY','#e8c8ff');banner('TITAN FURY','ALL BEASTS · ONE SUPREME POWER',1.25,'#d7b5ff');for(const color of ['#f3c45d','#9edce5','#b6d98b','#a8d66d','#f0a34e','#b9f6ff']){game.fx.push({x:f.x-f.dir*24,y:f.y-150,t:0,life:.72,color,kind:'ring'});spark(f.x+(Math.random()-.5)*90,f.y-150+(Math.random()-.5)*80,color,7)}game.flash=Math.max(game.flash||0,.18);game.shake=Math.max(game.shake,.28);sfx('instinct')}
 if(name==='majicEclipse'){f.vx=f.dir*105;floatText(f.x,f.y-330,'VOID ECLIPSE','#c5a8ff');banner('VOID ECLIPSE','WATCH THE THREE SHADOW PULSES · BLOCK TO COUNTER',1.15,'#b99cff');for(let k=0;k<3;k++){game.fx.push({x:f.x+f.dir*(70+k*42),y:f.y-145,t:0,life:.72+k*.12,color:['#b99cff','#e5c36e','#8de0d0'][k],kind:'ring'})}spark(f.x+f.dir*82,f.y-155,'#d9c7ff',18);game.shake=Math.max(game.shake,.24);game.flash=Math.max(game.flash||0,.12);sfx('instinct')}
 if(name==='stagAntler'){f.vx=f.dir*210;f.stagChargeStarted=0;floatText(f.x,f.y-310,'ANTLER CHARGE','#b6d98b');banner('ANTLER CHARGE','THE FOREST BREAKER',.78,'#b6d98b');spark(f.x-f.dir*24,f.y-115,'#b6d98b',12);game.shake=Math.max(game.shake,.14);sfx('heavy')}
 if(name==='stagCounter'){f.vx=f.dir*285;floatText(f.x,f.y-310,'ANTLER COUNTER','#c7e6a0');banner('ANTLER COUNTER','THE FOREST STRIKES BACK',.7,'#b6d98b');spark(f.x+f.dir*24,f.y-135,'#dcebb9',16);game.shake=Math.max(game.shake,.2);sfx('heavy')}
 if(name==='snakeVenom'){f.vx=f.dir*185;floatText(f.x,f.y-300,'VENOM FANG','#a8d66d');banner('VENOM FANG','A POISONED STRIKE',.72,'#a8d66d');game.shake=Math.max(game.shake,.13);sfx('heavy')}
 if(name==='snakeCoil'){f.vx=f.dir*125;floatText(f.x,f.y-300,'COIL TRAP','#a8d66d');banner('COIL TRAP','CONSTRICT AND CRUSH',.78,'#a8d66d');game.shake=Math.max(game.shake,.12);sfx('heavy')}
 if(name==='eagleSkyfall'){f.vx=f.dir*330;f.vy=-270;f.ground=false;f.eagleDiveStarted=0;floatText(f.x,f.y-315,'SKYFALL','#f3df9b');banner('EAGLE SKYFALL','THE HUNTER STRIKES FROM ABOVE',.75,'#f3df9b');game.shake=Math.max(game.shake,.14);sfx('heavy')}
 if(name==='eagleWingCounter'){f.vx=f.dir*245;f.vy=-470;f.ground=false;f.eagleEvadeT=.22;f.eagleCounterDive=0;floatText(f.x,f.y-315,'WING COUNTER','#f3df9b');banner('WING COUNTER','RISE ABOVE THE ATTACK',.7,'#f3df9b');game.shake=Math.max(game.shake,.16);sfx('heavy')}
 if(name==='ironCounter'){f.vx=f.dir*215;floatText(f.x,f.y-300,'IRON HIDE COUNTER','#c6a77a');game.shake=Math.max(game.shake,.2);sfx('heavy')}
 if(name==='wolfCounter'){f.vx=f.dir*245;floatText(f.x,f.y-300,'PACK COUNTER','#c5d9ed');game.shake=Math.max(game.shake,.2);sfx('heavy')}
 if(name==='hyenaSlip'){f.hyenaEvadeT=.17;f.vx=f.dir*405;floatText(f.x,f.y-315,'MAD SLIP','#d7b46a');game.shake=Math.max(game.shake,.16);sfx('whiff')}
 if(name==='jaguarAmbush'){f.vx=f.dir*660;f.vy=-125;f.ground=false;f.jaguarCommitT=.34;floatText(f.x,f.y-290,'JAGUAR AMBUSH','#e9bd54');game.shake=Math.max(game.shake,.16);sfx('heavy')}
 if(name==='jaguarBite'){f.vx=f.dir*205;f.jaguarCommitT=.22;floatText(f.x,f.y-290,'PRECISION BITE','#e9bd54');game.shake=Math.max(game.shake,.12);sfx('heavy')}
 if(name==='wolfFrenzy'){f.vx=f.dir*585;f.vy=-125;f.ground=false;floatText(f.x,f.y-290,'PACK FRENZY','#c5d9ed');game.shake=Math.max(game.shake,.16);sfx('heavy')}
 if(name==='tigerPounce'){f.vx=f.dir*640;f.vy=-105;f.ground=false;f.tigerPounceT=.62;floatText(f.x,f.y-290,'STRIPED POUNCE','#e99a45');game.shake=Math.max(game.shake,.13);sfx('heavy')}
 if(name==='lionCounter'){f.vx=f.dir*210;floatText(f.x,f.y-315,'ROAR COUNTER','#f3c45d');game.shake=Math.max(game.shake,.22);sfx('roar')}
 if(name==='lionRoar'){f.vx=f.dir*35;floatText(f.x,f.y-315,"KING'S ROAR",'#f3c45d');banner("KING'S ROAR",'THE KING COMMANDS THE JUNGLE',.85,'#f3c45d');game.shake=Math.max(game.shake,.16);sfx('roar')}
 if(name==='bearCounter'){f.vx=f.dir*235;floatText(f.x,f.y-300,'BEAR CLAW COUNTER','#d6ad83');game.shake=Math.max(game.shake,.2);sfx('heavy')}
 if(name==='grizzlyMaul'){f.vx=f.dir*560;floatText(f.x,f.y-300,'BEAR MAUL','#c99a70');game.shake=Math.max(game.shake,.16);sfx('heavy')}
 if(name==='grizzlyPaw'){f.vx=f.dir*115;floatText(f.x,f.y-300,'CRUSHING PAW','#d6ad83');game.shake=Math.max(game.shake,.12);sfx('heavy')}
 if(name==='riverCounter'){f.vx=f.dir*225;floatText(f.x,f.y-300,'RIVER COUNTER','#9edce5');game.shake=Math.max(game.shake,.18);sfx('heavy')}
 if(name==='hippoRush'){f.vx=f.dir*610;f.hippoRushT=.74;floatText(f.x,f.y-300,'RIVER RUSH','#83c9d8');game.shake=Math.max(game.shake,.14);sfx('heavy')}
 if(name==='charge'){f.vx=f.dir*760;f.elephantChargeT=.68;floatText(f.x,f.y-300,'TITAN CHARGE','#e4d7bd');game.shake=Math.max(game.shake,.12);sfx('heavy')}
 if(name==='grab'){f.vx=f.dir*95;f.elephantGrabT=.72;floatText(f.x,f.y-300,'TRUNK GRAB','#e7ddc8');sfx('heavy')}
 if(name==='stomp'){f.vx=f.dir*250;f.elephantStompT=.9;floatText(f.x,f.y-300,'TITAN STOMP','#d7d0bd');sfx('heavy')}
 if(name==='tuskCounter'){f.vx=f.dir*190;floatText(f.x,f.y-300,'TUSK COUNTER','#f0dfb8');sfx('heavy')}
 if(name==='double'){f.breakWindow=.26;f.vx=f.dir*Math.max(f.dir*f.vx,120);sfx('whiff')}   // the gold flash: break NOW
 if(name==='claw'||name==='bite'){f.vx=f.dir*Math.max(f.dir*f.vx,name==='bite'?110:60);sfx('whiff')}
 if(name==='special'){const frostPounce=f.data.id==='leopard';f.vx=f.dir*(f.data.id==='badger'?260:frostPounce?500:420);f.vy=f.data.id==='badger'?-120:frostPounce?-245:-230;f.ground=false;if(f.data.id==='elephant')f.elephantSlamArmed=1}
 if(name==='ender'){f.vx=f.dir*200;f.vy=-140;f.ground=false;floatText(f.x,f.y-300,'ENDER','#ffd36b')}
 if(name==='shadow'){f.meter-=50;f.vx=f.dir*380;game.flash=.35;soundOn&&AU&&AU.now('voice.shadow-attack');if(AU&&soundOn&&AU.has('shadow.'+f.data.id))AU.shadow(f.data.id);else sfx('instinct');banner('SHADOW '+({badger:'RAMPAGE',wolf:'FRENZY',hyena:'MADNESS',leopard:'BLUR',jaguar:'MAULER',crocodile:'DEATH ROLL',lion:'ROAR',tiger:'STRIPES',grizzly:'MAUL',hippo:'STAMPEDE',elephant:'TITAN'}[f.data.id]||'STRIKE'),'',.8,'#c68bff')}
}
/* ---------- Hit accuracy: body sizes and reach measured from each fighter's art (js/hitboxes.js) ---------- */
const HB=window.KOTJ_HIT||{};
// Fighter art is drawn slightly bigger/wider than the measured sprites (build 9.22–9.23); hit ranges scale to match.
const BODY_PRESENCE={badger:1.111,wolf:1.086,hyena:1.104,leopard:1.022,jaguar:1.0,crocodile:1.245,lion:1.108,tiger:1.132,grizzly:1.088,hippo:1.091,elephant:1.121,eagle:1.072,snake:1.064,stag:1.22,dolphin:1.08,majic:1.55},BODY_WIDTH={badger:1.07,wolf:1.025,hyena:1.035,leopard:1.0,jaguar:1.045,crocodile:1.10,lion:1.055,tiger:1.055,grizzly:1.095,hippo:1.12,elephant:1.075,eagle:1.015,snake:1.12,stag:1.10,dolphin:1.0,majic:1.0};
const artScale=f=>(BODY_PRESENCE[f.data.id]||1)*(BODY_WIDTH[f.data.id]||1);
const bodyFront=f=>((HB[f.data.id]&&HB[f.data.id].body[0])||85)*artScale(f);
function moveAnim(f,mv){const S=SPRITES[f.data.id]||{};if(mv.majicFury||mv.majicEclipse)return'ultra_move';if(mv.majicFrost)return'special_c';if(mv.stagCounter)return'attack_heavy';if(mv.snakeCoil)return'special_b';if(mv.snakeVenom)return'bite';if(mv.badgerBreaker)return'special_earth_slam';if(mv.ironCounter)return'attack_heavy';if(mv.tigerPounce||mv.jaguarAmbush||mv.wolfFrenzy||mv.eagleSkyfall||mv.eagleWingCounter||mv.stagAntler)return S.special||'special_pounce';if(mv.grab||mv.jaguarBite||mv.hyenaFeint)return'bite';if(mv.stomp||mv.tuskCounter||mv.bearCounter||mv.riverCounter||mv.charge||mv.hippoRush||mv.grizzlyMaul||mv.grizzlyPaw||mv.lionRoar||mv.lionCounter||mv.tigerSlip||mv.crocodileRoll||mv.tailCounter||mv.wolfCounter||mv.hyenaSlip)return'attack_heavy';
 if(mv===MOVES.claw)return S.claw||'attack_light';if(mv===MOVES.bite)return'bite';if(mv===MOVES.ender)return'uppercut';
 if((mv.base||mv)===MOVES.double){const D=S.double||['attack_heavy','attack_light'];return D[mv.eagleWingCombo?Math.min(D.length-1,Math.max(0,f.hitsDone-1)):f.chain%D.length]}
 if(mv===MOVES.special)return S.special||'special_pounce';
 if(mv===MOVES.shadow)return S.shadow||(S.double||['attack_heavy'])[0];return'attack_light'}
function reachOf(f,anim){const r=HB[f.data.id]&&HB[f.data.id].reach[anim];return Math.max(bodyFront(f)+60,(r?r[0]:180)*artScale(f))}
// distance between the two fighters' centres at which this strike touches the opponent's body
const hitDist=(f,o,anim,extra)=>reachOf(f,anim)+18+bodyFront(o)*.85+(extra||0);
function resolveHit(i,mv){
 const f=game.fighters[i],o=game.fighters[1-i];
 if(o.data.id==='tiger'&&(o.tigerEvadeT||0)>0)return;
 if(o.data.id==='hyena'&&(o.hyenaEvadeT||0)>0)return;
 if(o.data.id==='eagle'&&(o.eagleEvadeT||0)>0)return;
 if(o.down>0||(o.hp<=0&&o.bars<=1))return;
 const d=Math.abs(f.x-o.x),facing=(o.x-f.x)*f.dir>=-15;
 const anim=moveAnim(f,mv),reach=HB[f.data.id]&&HB[f.data.id].reach[anim];
 const big=Math.max(0,bodyFront(o)-90); // big opponents (Elephant, Hippo, MAJIC) are reached at their front edge
 if(mv.jaguarBite&&d>245+big)return;
 if(mv.grab&&Math.abs(f.x-o.x)>255+big)return;
 if(mv.sx){if(!sxReach(f,o,mv,d,big,facing))return;}else if(mv.lionRoar){if(!(d<=440&&Math.abs(f.y-o.y)<145))return;}
 else if(mv.eagleSkyfall){if(!(d<=365&&Math.abs(f.y-o.y)<230&&facing))return;}
 else if(!(d<=hitDist(f,o,anim,mv.shadow?40:0)&&Math.abs(f.y-o.y)<130&&facing))return;
 // where the strike lands: the defender's front edge, at the height of the fist/claw/jaws
 const cx=o.x-f.dir*bodyFront(o)*.75,cy=o.y-Math.max(70,Math.min(240,reach?reach[1]*(BODY_PRESENCE[f.data.id]||1):160));
 const comboing=o.stun>0&&f.combo>0;
 // The third connected strike of the snow leopard's triple claw gets a brief signature flourish.
 if(f.data.id==='leopard'&&mv.hits.length===3&&f.hitsDone===3){
  f.leopardFinisher=.58;
  spark(f.x+f.dir*78,f.y-178,'#9cefff',18);
 }
 // Hyena's linked double becomes a rapid three-hit bite-and-claw frenzy.
 if(f.data.id==='hyena'&&mv.hits.length===3&&f.hitsDone===3){
  f.hyenaFrenzyFinisher=.56;
  spark(f.x+f.dir*78,f.y-178,'#d7b46a',20);
  game.fx.push({x:f.x+f.dir*68,y:f.y-168,t:0,life:.48,color:'#b77a42',kind:'ring'});
  floatText(f.x+f.dir*60,f.y-278,'MAD FRENZY','#d7b46a');
  game.shake=Math.max(game.shake,.19);
 }
 // The lion's linked double becomes a three-strike mane-powered claw flurry.
 if(f.data.id==='lion'&&mv.hits.length===3&&f.hitsDone===3){
  f.lionManeFinisher=.62;
  spark(f.x+f.dir*86,f.y-190,'#f3c45d',22);
  game.fx.push({x:f.x+f.dir*74,y:f.y-174,t:0,life:.52,color:'#ffe29a',kind:'ring'});
  floatText(f.x+f.dir*65,f.y-285,'MANE CLAW','#ffd36b');
  game.shake=Math.max(game.shake,.18);
 }
 // Tiger's fourth linked claw strike finishes the four-hit striped flurry.
 if(f.data.id==='tiger'&&mv.hits.length===4&&f.hitsDone===4){
  const tx=f.x+f.dir*92,ty=f.y-182;
  for(let k=0;k<4;k++)game.fx.push({x:tx+f.dir*(k-1.5)*13,y:ty+(k%2)*9,t:0,life:.42+k*.035,color:k%2?'#ffd18a':'#e99a45',kind:'ring'});
  spark(cx,cy,'#f0a34e',26);floatText(cx,cy-92,'STRIPE FURY','#f0a34e');
  game.shake=Math.max(game.shake,.22);
 }
 // Eagle's linked combo finishes with a three-beat wing-and-talon flourish.
 if(mv.eagleWingCombo&&f.hitsDone===3){
  const ex=cx,ey=cy-12;
  for(let k=0;k<3;k++)game.fx.push({x:ex+f.dir*(k-1)*34,y:ey+(k-1)*12,t:0,life:.42+k*.045,color:k===1?'#fff4c7':'#d7e8f2',kind:'ring'});
  spark(ex,ey,'#fff0b0',24);spark(ex-f.dir*42,ey-24,'#d7e8f2',16);
  floatText(ex,ey-92,'WING FURY','#f3df9b');game.shake=Math.max(game.shake,.22);
 }
 // Eagle's Wing Counter rises over a blocked attack, then dives with a talon-first airburst.
 if(mv.eagleWingCounter){
  game.fx.push({x:cx,y:cy,t:0,life:.52,color:'#f3df9b',kind:'ring'});
  game.fx.push({x:cx-f.dir*34,y:cy-18,t:0,life:.38,color:'#d7e8f2',kind:'ring'});
  spark(cx,cy,'#fff0b0',26);spark(cx-f.dir*42,cy-24,'#d7e8f2',18);
  floatText(cx,cy-92,'WING COUNTER','#f3df9b');game.shake=Math.max(game.shake,.3);game.flash=Math.max(game.flash||0,.055);sfx('heavy');
 }
 // Eagle's Skyfall dives from above and lands with a bright, feather-like airburst.
 if(mv.eagleSkyfall){
  game.fx.push({x:cx,y:cy,t:0,life:.56,color:'#f3df9b',kind:'ring'});
  game.fx.push({x:cx-f.dir*28,y:cy-12,t:0,life:.4,color:'#fff7d8',kind:'ring'});
  spark(cx,cy,'#fff0b0',28);spark(cx-f.dir*38,cy-22,'#d7e8f2',16);
  floatText(cx,cy-96,'SKYFALL','#f3df9b');game.shake=Math.max(game.shake,.3);game.flash=Math.max(game.flash||0,.05);sfx('heavy');
 }
 // Badger's Earthbreaker drives force into the ground and erupts beneath the opponent.
 if(mv.ironCounter){
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#c6a77a',kind:'ring'});
  game.fx.push({x:cx-f.dir*24,y:cy+12,t:0,life:.34,color:'#e1c99e',kind:'ring'});
  spark(cx,cy,'#d9c29a',22);floatText(cx,cy-82,'IRON HIDE COUNTER','#d9c29a');
  game.shake=Math.max(game.shake,.26);
 }
 if(mv.badgerBreaker){
  game.fx.push({x:cx,y:f.y-8,t:0,life:.62,color:'#d7a85b',kind:'ring'});
  game.fx.push({x:cx-f.dir*34,y:f.y-5,t:0,life:.48,color:'#a88a5c',kind:'ring'});
  spark(cx,f.y-28,'#d7a85b',24);spark(cx-f.dir*38,f.y-18,'#b99a69',14);
  floatText(cx,cy-88,'EARTHBREAKER','#d7a85b');
  game.shake=Math.max(game.shake,.32);game.flash=Math.max(game.flash||0,.045);sfx('heavy');
 }
 // Blocked: openers are stopped cold (specials chip a little).
 if(o.block&&o.ground&&!comboing&&!(mv.sx&&mv.sx.grab)){
  const majicBoss=o.data.id==='majic'&&o.ai&&tower&&tower.boss,phase=majicBoss?(o.bossPhase||1):0;
  if(mv===MOVES.special||mv.shadow){const chip=phase===1?0:(mv.shadow?1:2);if(chip)o.hp=Math.max(1,o.hp-chip)}
  if(f.data.id==='majic'&&f.ai&&tower&&tower.boss&&(f.bossPhase||1)>=3&&mv.majicEclipse){f.hp=Math.max(1,f.hp-7);f.stun=Math.max(f.stun,.72);f.attack=0;f.move_=null;f.vx=-f.dir*205;o.meter=Math.min(100,o.meter+14);game.fx.push({x:f.x,y:f.y-150,t:0,life:.72,color:'#e8d8ff',kind:'ring'});spark(f.x,f.y-150,'#e8d8ff',28);floatText(o.x,o.y-285,'VOID REBOUND','#baf6ff');banner('VOID REBOUND','THE TITAN’S ECLIPSE IS TURNED AGAINST HIM',.95,'#baf6ff');game.shake=Math.max(game.shake,.38);game.flash=Math.max(game.flash||0,.16);sfx('frostCrack');hud();return}
  if(majicBoss&&phase===1){game.fx.push({x:o.x,y:o.y-145,t:0,life:.42,color:'#8feaff',kind:'ring'});spark(o.x,o.y-150,'#c8f8ff',7);floatText(o.x,o.y-270,'FROST GUARD','#a9efff')}
  if(majicBoss&&phase===2&&(o.majicDefenseCooldownT||0)<=0){o.majicDefenseCooldownT=1.15;f.hp=Math.max(1,f.hp-2.5);f.hitFlash=.12;f.stun=Math.max(f.stun,.16);game.fx.push({x:f.x,y:f.y-145,t:0,life:.48,color:'#c7a5ff',kind:'ring'});spark(f.x,f.y-145,'#d8c4ff',12);floatText(f.x,f.y-265,'ELEMENTAL PARRY','#c7a5ff');game.shake=Math.max(game.shake,.18);if(f.hp<=0)resolveBars(f,o)}
  if(majicBoss&&phase>=3&&(o.majicDefenseCooldownT||0)<=0){o.majicDefenseCooldownT=2.35;o.majicVoidGuardT=.9;game.fx.push({x:o.x,y:o.y-150,t:0,life:.7,color:'#b99cff',kind:'ring'});game.fx.push({x:o.x,y:o.y-150,t:0,life:.86,color:'#8de0d0',kind:'ring'});spark(o.x,o.y-155,'#d9c7ff',18);floatText(o.x,o.y-280,'VOID GUARD','#d9c7ff');game.flash=Math.max(game.flash||0,.07);game.shake=Math.max(game.shake,.22)}
  o.vx=f.dir*90;if(o.data.id==='leopard')o.leopardCounter=.42;if(o.data.id==='eagle')o.eagleCounterT=.68;if(o.data.id==='elephant')o.elephantCounterT=.62;if(o.data.id==='hippo')o.hippoCounterT=.68;if(o.data.id==='grizzly')o.grizzlyCounterT=.62;if(o.data.id==='lion')o.lionCounterT=.68;if(o.data.id==='wolf')o.wolfCounterT=.64;if(o.data.id==='tiger')o.tigerCounterT=.62;if(o.data.id==='hyena')o.hyenaCounterT=.64;if(o.data.id==='crocodile')o.crocodileCounterT=.66;if(o.data.id==='badger')o.badgerCounterT=.62;if(o.data.id==='stag')o.stagCounterT=.68;f.meter=Math.min(100,f.meter+2);snd('sfx.block','block');spark(o.x-o.dir*20,o.y-170,'#9fd9ff',6);hud();return;
 }
 // Hyena's Mad Slip briefly phases through a follow-up before snapping back.
 if(mv.hyenaSlip){
  game.fx.push({x:f.x-f.dir*32,y:f.y-148,t:0,life:.34,color:'#d7b46a',kind:'ring'});
  game.fx.push({x:cx,y:cy,t:0,life:.4,color:'#e5c47b',kind:'ring'});
  spark(cx,cy,'#d7b46a',19);floatText(cx,cy-82,'MAD SLIP','#d7b46a');
  game.shake=Math.max(game.shake,.2);
 }
 // Tiger's evasive slip briefly phases through a follow-up before striking back.
 if(mv.tigerSlip){
  game.fx.push({x:f.x-f.dir*34,y:f.y-150,t:0,life:.38,color:'#f0a34e',kind:'ring'});
  game.fx.push({x:cx,y:cy,t:0,life:.44,color:'#ffd18a',kind:'ring'});
  spark(cx,cy,'#f0a34e',22);floatText(cx,cy-82,'STRIPED SLIP','#f0a34e');
  game.shake=Math.max(game.shake,.22);
 }
 // Jaguar's close-range Precision Bite rewards a well-spaced, committed strike.
 if(mv.jaguarBite){
  game.fx.push({x:cx,y:cy,t:0,life:.5,color:'#e9bd54',kind:'ring'});
  game.fx.push({x:cx-f.dir*18,y:cy-8,t:0,life:.34,color:'#fff0b0',kind:'ring'});
  spark(cx,cy,'#f6df91',26);floatText(cx,cy-94,'PRECISION BITE','#e9bd54');
  game.shake=Math.max(game.shake,.3);game.flash=Math.max(game.flash||0,.055);sfx('heavy');
 }
 // Jaguar's precision ambush lands with a paired amber shock and focused claw burst.
 if(mv.jaguarAmbush){
  game.fx.push({x:cx,y:cy,t:0,life:.46,color:'#d9a83f',kind:'ring'});
  game.fx.push({x:cx-f.dir*30,y:cy+8,t:0,life:.34,color:'#f6df91',kind:'ring'});
  spark(cx,cy,'#e9bd54',22);floatText(cx,cy-82,'JAGUAR AMBUSH','#e9bd54');
  game.shake=Math.max(game.shake,.26);
 }
 // Hyena's Mad Feint baits a reaction, then snaps forward with a sudden bite.
 if(mv.hyenaFeint){
  game.fx.push({x:f.x-f.dir*42,y:f.y-145,t:0,life:.3,color:'#d7b46a',kind:'ring'});
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#e5c47b',kind:'ring'});
  spark(cx,cy,'#f1d99d',22);floatText(cx,cy-86,'MAD JAW','#e5c47b');
  game.shake=Math.max(game.shake,.25);game.flash=Math.max(game.flash||0,.04);sfx('heavy');
 }
 // Wolf's defensive Pack Counter answers a blocked attack with a fast coordinated claw strike.
 if(mv.wolfCounter){
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#c5d9ed',kind:'ring'});
  game.fx.push({x:cx-f.dir*24,y:cy-8,t:0,life:.34,color:'#e6f0fa',kind:'ring'});
  spark(cx,cy,'#d7e8f7',23);floatText(cx,cy-82,'PACK COUNTER','#c5d9ed');
  game.shake=Math.max(game.shake,.27);game.flash=Math.max(game.flash||0,.045);sfx('heavy');
 }
 // Wolf's Pack Frenzy chains three coordinated bite-and-claw contacts in one forward pounce.
 if(mv.wolfFrenzy){
  const wolfColors=['#c5d9ed','#e6f0fa','#a8c4df'];
  game.fx.push({x:cx,y:cy,t:0,life:.42,color:wolfColors[(f.hitsDone-1)%3],kind:'ring'});
  spark(cx,cy,wolfColors[(f.hitsDone-1)%3],f.hitsDone===3?22:13);
  if(f.hitsDone===3){floatText(cx,cy-88,'PACK FRENZY','#d7e8f7');game.shake=Math.max(game.shake,.26);game.flash=Math.max(game.flash||0,.045)}
 }
 // Tiger's Striped Pounce leaves a double orange-gold impact wake on contact.
 if(mv.tigerPounce){
  game.fx.push({x:cx,y:cy,t:0,life:.42,color:'#e99a45',kind:'ring'});
  game.fx.push({x:cx-f.dir*24,y:cy+10,t:0,life:.32,color:'#ffd18a',kind:'ring'});
  spark(cx,cy,'#f0a34e',20);floatText(cx,cy-78,'STRIPED POUNCE','#f0a34e');
  game.shake=Math.max(game.shake,.24);
 }
 // Lion's defensive roar counter answers a blocked attack with a focused golden burst.
 if(mv.lionCounter){
  game.fx.push({x:cx,y:cy,t:0,life:.52,color:'#f3c45d',kind:'ring'});
  game.fx.push({x:f.x+f.dir*105,y:f.y-145,t:0,life:.42,color:'#ffe6a0',kind:'ring'});
  spark(cx,cy,'#f3c45d',24);floatText(cx,cy-88,'ROAR COUNTER','#f3c45d');
  game.shake=Math.max(game.shake,.3);game.flash=Math.max(game.flash||0,.07);sfx('roar');
 }
 // Lion's King's Roar sends a broad golden shockwave through the arena on contact.
 if(mv.lionRoar){
  game.fx.push({x:f.x+f.dir*115,y:f.y-115,t:0,life:.62,color:'#f3c45d',kind:'ring'});
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#ffe6a0',kind:'ring'});
  spark(cx,cy,'#f3c45d',26);spark(f.x+f.dir*145,f.y-150,'#fff0b0',14);
  floatText(cx,cy-88,"KING'S ROAR",'#f3c45d');
  game.shake=Math.max(game.shake,.32);game.flash=Math.max(game.flash||0,.08);
 }
 // Grizzly's Crushing Paw drives a single heavyweight strike into the ground.
 if(mv.grizzlyPaw){
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#c99a70',kind:'ring'});
  game.fx.push({x:f.x+f.dir*58,y:f.y-8,t:0,life:.34,color:'#e0b98e',kind:'ring'});
  spark(cx,cy,'#d6ad83',20);floatText(cx,cy-78,'CRUSHING PAW','#e0b98e');
  game.shake=Math.max(game.shake,.25);
 }
 // Grizzly's Bear Maul lands with a rugged double shock, emphasizing its crushing forward momentum.
 if(mv.grizzlyMaul){
  game.fx.push({x:cx,y:cy,t:0,life:.5,color:'#c99a70',kind:'ring'});
  game.fx.push({x:f.x+f.dir*74,y:f.y-10,t:0,life:.38,color:'#e0b98e',kind:'ring'});
  spark(cx,cy,'#c99a70',22);floatText(cx,cy-78,'BEAR MAUL','#e0b98e');
  game.shake=Math.max(game.shake,.27);
 }
 // Crocodile's Death Roll twists through a two-stage ambush, with a watery impact on each bite.
 if(mv.crocodileRoll){
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#63c6ad',kind:'ring'});
  game.fx.push({x:cx-f.dir*28,y:cy+12,t:0,life:.34,color:'#b5f0df',kind:'ring'});
  spark(cx,cy,'#79d6bd',20);
  floatText(cx,cy-78,'DEATH ROLL','#79d6bd');
  game.shake=Math.max(game.shake,.25);
 }
 // Crocodile's tail counter sweeps through with a broad, watery knockback impact.
 if(mv.tailCounter){
  game.fx.push({x:cx,y:cy,t:0,life:.5,color:'#63c6ad',kind:'ring'});
  game.fx.push({x:cx-f.dir*52,y:cy+12,t:0,life:.38,color:'#b5f0df',kind:'ring'});
  spark(cx,cy,'#79d6bd',24);floatText(cx,cy-78,'TAIL COUNTER','#79d6bd');
  game.shake=Math.max(game.shake,.28);game.flash=Math.max(game.flash||0,.045);
 }
 // Hippo's River Rush lands with a broad water-pressure burst, emphasizing its low, heavy momentum.
 if(mv.hippoRush){
  game.fx.push({x:cx,y:cy,t:0,life:.52,color:'#83c9d8',kind:'ring'});
  game.fx.push({x:f.x+f.dir*82,y:f.y-12,t:0,life:.42,color:'#b8edf0',kind:'ring'});
  spark(cx,cy,'#9edce5',24);
  floatText(cx,cy-78,'RIVER RUSH','#a8e3eb');
  game.shake=Math.max(game.shake,.24);
 }
 if(mv.riverCounter){
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#83c9d8',kind:'ring'});
  game.fx.push({x:cx,y:cy+16,t:0,life:.34,color:'#d2f4f4',kind:'ring'});
  spark(cx,cy,'#a8e3eb',22);
  floatText(cx,cy-78,'RIVER COUNTER','#a8e3eb');
  game.shake=Math.max(game.shake,.24);
 }
 // Elephant's tusk counter adds a brief defensive impact flourish after a successful punish.
 if(mv.tuskCounter){
  game.fx.push({x:cx,y:cy,t:0,life:.42,color:'#e7d6ad',kind:'ring'});
  spark(cx,cy,'#f1e2c3',18);
  floatText(cx,cy-78,'TUSK COUNTER','#f0dfb8');
  game.shake=Math.max(game.shake,.22);
 }
 if(mv.bearCounter){
  game.fx.push({x:cx,y:cy,t:0,life:.46,color:'#c99a70',kind:'ring'});
  game.fx.push({x:cx+f.dir*24,y:cy-10,t:0,life:.32,color:'#e0b98e',kind:'ring'});
  spark(cx,cy,'#d6ad83',20);floatText(cx,cy-78,'BEAR CLAW COUNTER','#d6ad83');
  game.shake=Math.max(game.shake,.25);
 }
 // Titan Charge lands with a broad shoulder-and-tusk impact, reinforcing its bulldozing identity.
 if(mv.charge){
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#e3d5b9',kind:'ring'});
  spark(cx,cy,'#e3d5b9',20);floatText(cx,cy-78,'TITAN CHARGE','#e3d5b9');
  game.shake=Math.max(game.shake,.28);
 }
 // Elephant's Titan Stomp drives a broad ground shock into the opponent, pushing them away without launching them.
 if(mv.stomp){
  game.fx.push({x:cx,y:cy,t:0,life:.58,color:'#d7d0bd',kind:'ring'});
  game.fx.push({x:f.x+f.dir*92,y:f.y-8,t:0,life:.46,color:'#b8aa91',kind:'ring'});
  spark(cx,cy,'#d7d0bd',26);
  floatText(cx,cy-82,'TITAN STOMP','#e8dfce');
  game.shake=Math.max(game.shake,.3);
 }
 // Frost Dive gets a signature icy burst only when its aerial bite actually connects.
 if(f.data.id==='leopard'&&f.leopardFrostDiveT>0&&mv===MOVES.bite){
  f.leopardFrostDiveT=0;
  game.fx.push({x:cx,y:cy,t:0,life:.34,color:'#baf6ff',kind:'ring'});
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#66dfff',kind:'ring'});
  spark(cx,cy,'#baf6ff',24);
  floatText(cx,cy-72,'FROST IMPACT','#baf6ff');
  game.shake=Math.max(game.shake,.12);
 }
 // Hippo's bite lands with a signature water-splash burst, reinforcing its river-fighter identity.
 if(f.data.id==='hippo'&&mv===MOVES.bite){
  game.fx.push({x:cx,y:cy,t:0,life:.34,color:'#83c9d8',kind:'ring'});
  game.fx.push({x:cx-f.dir*18,y:cy+18,t:0,life:.5,color:'#b8edf0',kind:'ring'});
  spark(cx,cy,'#9edce5',18);
  floatText(cx,cy-74,'SPLASH BITE','#a8e3eb');
  game.shake=Math.max(game.shake,.16);
 }
 // Ultra Combo: an ender that lands while the opponent is in DANGER.
 const isEnder=mv.ender||(mv.shadow&&f.hitsDone===mv.hits.length&&comboing);
 if(isEnder&&inDanger(o)&&comboing){startUltra(i);return}
 // MAJIC's Titan Fury chains four elemental strikes, ending in a combined-beast detonation.
 if(mv.majicFury){
  const colors=['#f3c45d','#9edce5','#b6d98b','#c9a0ff'];
  const color=colors[Math.min(3,(f.hitsDone||1)-1)];
  game.fx.push({x:cx,y:cy,t:0,life:.42,color,kind:'ring'});
  spark(cx,cy,color,(f.hitsDone||1)===4?42:22);
  if((f.hitsDone||0)>=4){
   for(let k=0;k<3;k++)game.fx.push({x:cx+(k-1)*24,y:cy+(k%2)*10,t:0,life:.62+k*.08,color:['#e9d2ff','#baf6ff','#f3c45d'][k],kind:'ring'});
   spark(cx-f.dir*18,cy-35,'#e9d2ff',26);spark(cx+f.dir*34,cy-18,'#baf6ff',22);
   floatText(cx,cy-118,'THE TITAN REIGNS','#e9d2ff');banner('TITAN FURY','FOUR BEAST POWERS · ONE FINAL BLOW',.9,'#d7b5ff');
   o.stun=Math.max(o.stun,.92);game.flash=Math.max(game.flash||0,.2);game.shake=Math.max(game.shake,.42);game.hitstop=Math.max(game.hitstop||0,.13);sfx('frostCrack');
  }else{floatText(cx,cy-82,['LION FORCE','EAGLE STRIKE','FOREST WRATH'][Math.min(2,(f.hitsDone||1)-1)],color);game.shake=Math.max(game.shake,.2);sfx('heavy')}
 }
 // MAJIC's Frost Strike detonates a supernatural crystal burst on contact.
 if(mv.majicFrost){
  for(let k=0;k<3;k++)game.fx.push({x:cx+(k-1)*18,y:cy+(k%2)*8,t:0,life:.46+k*.08,color:k===1?'#e7fdff':'#7fe8ff',kind:'ring'});
  spark(cx,cy,'#c7f7ff',34);spark(cx+f.dir*22,cy-24,'#7fe8ff',18);
  floatText(cx,cy-105,'FROZEN BY THE TITAN','#baf6ff');banner('FROST STRIKE','MAJIC FREEZES THE BATTLEFIELD',.72,'#7fe8ff');
  o.stun=Math.max(o.stun,.98);game.flash=Math.max(game.flash||0,.13);game.shake=Math.max(game.shake,.3);sfx('frostCrack');
 }
 if(mv.majicEclipse){
  const strike=f.hitsDone||1,colors=['#a98aff','#e5c36e','#8de0d0'];
  const color=colors[Math.min(2,strike-1)];
  game.fx.push({x:cx,y:cy,t:0,life:.52+strike*.06,color,kind:'ring'});
  spark(cx,cy,color,strike===3?34:20);spark(cx+f.dir*24,cy-28,'#eee2ff',12);
  if(strike===1)banner('VOID ECLIPSE','THE TITAN BENDS THE LIGHT',.72,'#b99cff');
  if(strike===3){for(let k=0;k<4;k++)game.fx.push({x:cx+(k-1.5)*25,y:cy+(k%2)*10,t:0,life:.72,color:['#b99cff','#f0d58c','#8de0d0','#eee2ff'][k],kind:'ring'});spark(cx,cy-18,'#f1ddff',42);floatText(cx,cy-116,'VOID ECLIPSE','#e5d5ff');banner('VOID ECLIPSE','THREE REALMS · ONE TITAN',.92,'#c5a8ff');o.stun=Math.max(o.stun,.96);game.flash=Math.max(game.flash||0,.22);game.shake=Math.max(game.shake,.44);game.hitstop=Math.max(game.hitstop||0,.14);sfx('frostCrack')}
 }
 // Stag's Antler Charge drives a forest-green horn strike through a grounded rush.
 if(mv.stagCounter){
  game.fx.push({x:cx,y:cy,t:0,life:.48,color:'#b6d98b',kind:'ring'});
  game.fx.push({x:cx-f.dir*28,y:cy+14,t:0,life:.38,color:'#e0edbd',kind:'ring'});
  spark(cx,cy,'#dcebb9',24);spark(cx+f.dir*30,cy-24,'#b6d98b',12);
  floatText(cx,cy-88,'ANTLER COUNTER','#c7e6a0');banner('ANTLER COUNTER','FOREST POWER RETALIATES',.62,'#b6d98b');
  game.shake=Math.max(game.shake,.28);game.flash=Math.max(game.flash||0,.04);
 }
 if(mv.stagAntler){
  game.fx.push({x:cx,y:cy,t:0,life:.56,color:'#b6d98b',kind:'ring'});
  game.fx.push({x:cx-f.dir*42,y:cy+12,t:0,life:.42,color:'#d2e8a4',kind:'ring'});
  spark(cx,cy,'#b6d98b',28);spark(cx+f.dir*34,cy-30,'#e1efbd',12);
  floatText(cx,cy-92,'ANTLER CHARGE','#c7e6a0');banner('ANTLER CHARGE','FOREST POWER',.62,'#b6d98b');
  game.shake=Math.max(game.shake,.3);game.flash=Math.max(game.flash||0,.055);
 }
 if(mv.snakeCoil){o.coilT=1.05;o.coilBy=i;o.vx=f.dir*58;for(let k=0;k<3;k++)game.fx.push({x:cx+(k-1)*16,y:cy+(k%2)*9,t:0,life:.72+k*.06,color:k===1?'#c8ed82':'#83bd50',kind:'ring'});spark(cx,cy,'#a8d66d',22);floatText(cx,cy-100,'CONSTRICTED','#a8d66d');banner('CONSTRICTED','MOVEMENT REDUCED',.72,'#a8d66d');game.shake=Math.max(game.shake,.22)}
 if(mv.snakeVenom){o.venomT=2.4;o.venomTick=.78;o.venomBy=i;for(let k=0;k<3;k++)game.fx.push({x:cx+(k-1)*20,y:cy+(k%2)*12,t:0,life:.52+k*.06,color:k===1?'#b8e986':'#78b84f',kind:'ring'});spark(cx,cy,'#a8d66d',24);floatText(cx,cy-94,'VENOMED','#a8d66d');game.shake=Math.max(game.shake,.24);game.flash=Math.max(game.flash||0,.045)}
 const chargeArmor=o.data.id==='elephant'&&(o.elephantChargeT||0)>.12;
 const majicPower=f.data.id==='majic'?((f.bossPhase||1)>=3?1.2:(f.bossPhase||1)>=2?1.12:Math.max((f.jungleRageT||0)>0?1.18:1,(f.ascendantT||0)>0?1.2:1)):1;const majicGuard=o.data.id==='majic'?((o.majicVoidGuardT||0)>.025?.45:((o.bossPhase||1)>=2?.88:((o.jungleRageT||0)>0||(o.ascendantT||0)>0)?.88:1)):1;const dmg=mv.dmg(f.data.power)*(f.instinct?1.25:1)*majicPower*(1-(o.data.defense-7)*.03)*majicGuard*(chargeArmor?.38:1)*(game.bane===i+1&&o.data.id==='majic'?1.5:1)*(mode==='training'?0:1);
 f.combo=comboing?f.combo+1:1;f.bestCombo=Math.max(f.bestCombo||0,f.combo);dojoChallengeHit(f,mv);
 if(mv.potential&&comboing){const real=Math.min(dmg,Math.max(0,o.hp-.5));o.hp-=real;o.potential+=real;}
 else{o.hp-=dmg;}
 const bodyResponse=impactScale(o);
 const impactPush=mv.push*bodyResponse;
 if(isEnder){ // finishers move lighter fighters farther; heavyweight fighters resist displacement
  if(mode!=='training')o.hp-=f.combo*1.2;o.potential=0;o.stun=0;o.down=.9;o.vx=f.dir*impactPush;o.vy=-330*Math.max(.88,Math.min(1.08,bodyResponse));o.ground=false;
  snd('sfx.heavyImpact','heavy');game.shake=Math.max(game.shake,Math.min(.38,.18+mv.push/900));game.flash=Math.max(game.flash||0,.12);game.hitstop=Math.max(game.hitstop||0,.11);spark(cx,cy,'#ffd36b',22);
  resolveBars(o,f);endCombo(i,true);
 }else{
  o.stun=chargeArmor?0:mv.stun*Math.max(.5,1-Math.max(0,f.combo-4)*.06);o.hitHeavy=mv.push>=100||mv.dmg(0)>=9;o.hitAnimTime=0;o.vx=f.dir*impactPush*(chargeArmor?.22:1);if(!o.ground&&!chargeArmor)o.vy=-160*Math.max(.88,Math.min(1.08,bodyResponse));
  if(chargeArmor){o.hitFlash=.07;game.shake=Math.max(game.shake,.16);spark(o.x-o.dir*18,o.y-150,'#e3d5b9',10);floatText(o.x,o.y-250,'BULLDOZE','#e3d5b9')}
  f.vx=f.dir*Math.max(20,impactPush*.4);
  hitSound(f,mv);game.hitstop=Math.max(game.hitstop||0,(mv.base||mv)===MOVES.double?.045:mv===MOVES.bite?.1:mv===MOVES.special?.11:mv.shadow?.05:.07);
  // Scale camera emphasis to attack force, keeping light taps restrained.
  const cameraImpact=clamp((mv.push-35)/520,0,.24);
  if(cameraImpact>0)game.shake=Math.max(game.shake,cameraImpact);
  if(mv.push>=105)game.flash=Math.max(game.flash||0,.055);
  if(mv.grab){o.down=.42;o.stun=Math.max(o.stun,.78);o.vx=f.dir*230;o.vy=-230;o.ground=false;game.shake=Math.max(game.shake,.24);game.fx.push({x:cx,y:cy,t:0,life:.42,color:'#e7ddc8',kind:'ring'});spark(cx,cy,'#e7ddc8',20);floatText(cx,cy-72,'TITAN GRAB','#e7ddc8');}
  if(mv===MOVES.bite||mv===MOVES.special)game.shake=Math.max(game.shake,.14);
  if(!mv.potential)resolveBars(o,f);
 }
 o.hitFlash=.1;if(!chargeArmor){o.attack=0;o.move_=null;}o.block=false;
 f.meter=Math.min(100,f.meter+(f.instinct?0:4));o.meter=Math.min(100,o.meter+(o.instinct?0:2.5));
 const signature=FIGHTER_IMPACT[f.data.id]||'#fff0b0';
 const impactCount=mv.shadow?14:mv===MOVES.special?16:mv===MOVES.bite?12:(mv.base||mv)===MOVES.double?8:10;
 spark(cx,cy-Math.random()*16,mv.shadow?'#c68bff':signature,impactCount);
 bleed(cx,cy+8-Math.random()*20,f.dir,isEnder?12:mv===MOVES.bite?10:mv===MOVES.special?9:((mv.base||mv)===MOVES.double&&f.chain%2)?6:mv.shadow?4:3);
 const p='p'+(i+1);if(f.combo>=2){$(p+'-combo').textContent=f.combo+' HITS';$(p+'-combo').classList.toggle('active',f.combo>=3)}
 hud();
}
function majicBossPhase(o){
 if(!o||o.data.id!=='majic'||!o.ai||!tower||!tower.boss)return;
 const phase=o.bars<=1?3:o.bars<=2?2:1;
 if(phase<=(o.bossPhase||1))return;
 o.bossPhase=phase;
 if(AU&&soundOn&&AU.setMusicIntensity)AU.setMusicIntensity(phase);
 if(phase===2){
  o.jungleRageT=999;o.jungleRageCooldownT=999;
  banner('MAJIC · JUNGLE RAGE','“You survived the climb. Now face the rage of the eleven.”',2.6,'#c49aff');
  floatText(o.x,o.y-350,'THE ELEVEN AWAKEN','#d8b5ff');
  for(const color of ['#f3c45d','#9edce5','#b6d98b','#a8d66d','#f0a34e','#b9f6ff']){game.fx.push({x:o.x,y:o.y-155,t:0,life:1.05,color,kind:'ring'});spark(o.x+(Math.random()-.5)*130,o.y-150+(Math.random()-.5)*90,color,7)}
  game.flash=Math.max(game.flash||0,.22);game.shake=Math.max(game.shake,.38);game.hitstop=Math.max(game.hitstop||0,.1);sfx('instinct');
 }else{
  o.jungleRageT=0;o.ascendantT=999;o.ascendantCooldownT=999;
  banner('MAJIC · TRUE TITAN','“You have seen my power. Now witness my true form.”',2.8,'#e1c6ff');
  floatText(o.x,o.y-365,'TRUE TITAN AWAKENS','#e7c8ff');
  for(let k=0;k<18;k++){const color=['#e8c56b','#b8a0ff','#8de0d0'][k%3],a=k*Math.PI/9;game.fx.push({x:o.x+Math.cos(a)*82,y:o.y-155+Math.sin(a)*78,t:0,life:1.15,color,kind:'ring'});spark(o.x+Math.cos(a)*112,o.y-155+Math.sin(a)*95,color,5)}
  // The True Titan awakening sends a visible, arena-wide floor shockwave outward.
  game.fx.push({x:o.x,y:400,t:0,life:1.12,color:'#c7a5ff',kind:'titanWave'});
  game.fx.push({x:o.x,y:400,t:-.2,life:1.12,color:'#e8c56b',kind:'titanWave'});
  game.fx.push({x:o.x,y:400,t:-.4,life:1.12,color:'#8de0d0',kind:'titanWave'});
  for(let k=0;k<34;k++){const a=k*Math.PI*2/34,speed=260+Math.random()*300;game.fx.push({x:o.x,y:396,t:0,life:.42+Math.random()*.2,color:['#c7a5ff','#e8c56b','#8de0d0'][k%3],kind:'spark',vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*.28})}
  game.flash=Math.max(game.flash||0,.42);game.shake=Math.max(game.shake,.68);game.hitstop=Math.max(game.hitstop||0,.2);sfx('instinct');
 }
 hud();
}
function resolveBars(o,f){
 if(o.hp>0)return;
 if(o.bars>1){o.bars--;o.hp+=BAR;o.potential=Math.min(o.potential,BAR-o.hp);floatText(o.x,o.y-320,'BAR BROKEN','#ff9a4a');game.shake=.3;snd('sfx.heavyImpact','boom',1,.85);majicBossPhase(o);}
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
 f.usedUltra=true;
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
 if(game.ko)return;o.koTime=0;game.ko=ultra?3.2:2.2;if(o.bars<=1&&finDur(f)){game.ko+=FIN_DUR+1.2;setTimeout(()=>{if(game.ko)banner('FINISHER',(f.data.name||'').toUpperCase(),1.6,'#ffcf4a')},450)}
 AU&&AU.duckMusic(.4);if(!ultra)bleed(o.x,o.y-150,f.dir,14);
 if(!ultra){
  if(f.data.id==='leopard'){
   // Signature Frost Fatality presentation: a brief icy cinematic on the final KO.
   // This is presentation-only; damage, hitboxes, and KO timing remain unchanged.
   banner('FROST FATALITY','THE JUNGLE FREEZES',2.4,'#9cefff');
   // Three synthesized cues line up with the freeze, shell crack, and crystal shatter.
   if(soundOn){sfx('frostWind');setTimeout(()=>sfx('frostCrack'),420);setTimeout(()=>sfx('frostShatter'),850)}
   game.slow=.24;game.slowT=.95;game.shake=Math.max(game.shake||0,.38);
   game.koBurst={x:o.x,y:400+o.y-145,t:0,frost:true};
   game.fx.push({x:o.x,y:o.y-145,t:0,life:.58,color:'#baf6ff',kind:'ring'});
   game.fx.push({x:o.x,y:o.y-145,t:0,life:.82,color:'#62dcff',kind:'ring'});
   spark(o.x,o.y-145,'#baf6ff',48);spark(o.x,o.y-145,'#65dfff',28);
   game.flash=Math.max(game.flash||0,.16);
  }else{
   banner('K.O.',f.data.name+' WINS',2,'#ff5a4a');
   game.slow=.35;game.slowT=.8;game.shake=Math.max(game.shake||0,.35);
   game.koBurst={x:o.x,y:400+o.y-145,t:0};
   game.flash=Math.max(game.flash||0,.12);
   spark(o.x,o.y-145,'#ffd36b',26);
  }
  say('K O');
 }
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
 if(game.over)return;if(mode==='online'&&ON.side===0)NET.send({t:'end',s:makeSnap()});game.over=true;AU&&soundOn&&AU.music('music.menu');
 const [p,q]=game.fighters,tp=total(p),tq=total(q),draw_=Math.abs(tp-tq)<.01,p1won=tp>tq,cpu2=mode!=='versus'&&mode!=='online',net=mode==='online',iWon=(p1won?0:1)===(net?ON.side:0);
 let title=draw_?'DRAW':net?(iWon?'YOU WIN':'YOU LOSE'):p1won?(cpu2?'YOU WIN':'PLAYER 1 WINS'):(cpu2?'CPU WINS':'PLAYER 2 WINS');
 let copy=draw_?'Neither fighter claimed the crown.':(p1won?picks[0].name:picks[1].name)+' claims the arena.';
 const winnerF=draw_?null:(p1won?p:q),flawless=!!winnerF&&total(winnerF)>=2*BAR-.01;
 if(flawless)copy='FLAWLESS VICTORY · '+copy;
 $('tower-next').classList.add('hidden');$('rematch').textContent='REMATCH';$('tower-ladder').innerHTML='';
 if(mode==='training'){title='TRAINING SESSION';copy='Practice complete when you are ready. Your dummy does not attack or run out of health.';$('rematch').textContent='KEEP PRACTICING';$('tower-next').classList.add('hidden');}
 if(tower){
  if(p1won&&tower.boss){title='THE TRUE KING';copy=`${tower.player.name} defeated MAJIC at the summit.`;$('rematch').textContent='CLIMB AGAIN';tower.done=true}
  else if(p1won){tower.index++;
   if(tower.index>=tower.ladder.length&&tower.player.id!=='majic'){tower.reveal=true;title=tower.kind==='forgotten'?'THE SUMMIT':'A NEW CHALLENGER';copy=tower.kind==='forgotten'?'':'The ground shakes beneath the Lair. Something has been watching your climb.';$('tower-next').textContent=tower.kind==='forgotten'?'ASCEND':'FACE IT';$('tower-next').classList.remove('hidden');$('rematch').textContent='RETRY LAST FIGHT'}
   else if(tower.index>=tower.ladder.length){title='KING OF THE JUNGLE';copy=`${tower.player.name} conquered all ${tower.ladder.length} challengers and takes the crown.`;$('rematch').textContent='CLIMB AGAIN';tower.done=true}
   else{title='VICTORY';copy=tower.kind==='forgotten'?'':`Next up: ${tower.ladder[tower.index].name}.`;$('tower-next').textContent='NEXT FIGHT';$('tower-next').classList.remove('hidden');$('rematch').textContent='RETRY LAST FIGHT';}
  }else{title='DEFEATED';copy=tower.boss?'MAJIC crushes your challenge. The Jungle Titan still rules.':tower.kind==='forgotten'?`${picks[1].name} drags you back into the dark.`:`${picks[1].name} stops your climb at fight ${tower.index+1}. Try again.`;$('rematch').textContent='TRY AGAIN';}
  $('tower-ladder').innerHTML=tower.ladder.map((f,n)=>`<div class="${n<tower.index||tower.done?'done':n===tower.index?'next':''}"><img src="${portrait(f.id)}" alt=""${f.echo?' class="echo-face"':''}>${f.name}</div>`).join('')+((tower.kind==='forgotten'||tower.reveal||tower.boss)?(tower.boss?`<div class="${tower.done?'done':'next'}"><img src="${portrait('majic')}" alt="">MAJIC</div>`:`<div class="${tower.reveal?'next':''}"><span class="q">?</span>???</div>`):'');
 }
 const resultChampId=draw_?null:(p1won?picks[0].id:picks[1].id);
 const winnerIndex=draw_?-1:(p1won?0:1),medals=winnerIndex>=0&&!game.fighters[winnerIndex].ai?awardFighterAchievements(game.fighters[winnerIndex],true,flawless,!!(tower&&tower.boss&&winnerIndex===0)):[];renderAchievementAwards(medals,winnerIndex>=0&&!game.fighters[winnerIndex].ai?game.fighters[winnerIndex]:null);
 try{if(window.KOTJ_ARMORY&&mode!=='training'){const me=(net&&ON&&ON.side===1)?1:0,local=mode==='versus'&&!net,won=!draw_&&(local?true:(net?iWon:winnerIndex===me)),hum=game.fighters.filter(x=>!x.ai);KOTJ_ARMORY.reward({mode,draw:draw_,won,flawless:!!flawless,combo:Math.max(0,...hum.map(x=>x.bestCombo||0)),tower:!!tower,towerDone:!!(tower&&tower.done),titan:!!(tower&&tower.boss)})}}catch(_){}
 if(resultChampId==='leopard'&&!draw_){copy='❄ FROST VICTORY · '+copy;if(soundOn)sfx('frost')}
 if(resultChampId==='majic'&&!draw_){title='THE JUNGLE TITAN';copy='THE TRUE FORM IS REVEALED · THE JUNGLE BOWS TO MAJIC';}
 if(tower&&tower.boss&&!draw_){if(resultChampId==='majic'){title='THE JUNGLE TITAN';copy='“I AM THE LAW OF THIS WILD. THE CROWN WAS ALWAYS MINE.” · MAJIC HOLDS THE SUMMIT';}else{title='THE TITAN FALLS';copy='“IMPOSSIBLE... THE JUNGLE HAS CHOSEN YOU.” · MAJIC’S TRUE FORM IS DEFEATED';}}
 $('winner-title').textContent=title;$('winner-copy').textContent=copy;
 if(soundOn&&AU){const champId=resultChampId;
  const line=title==='KING OF THE JUNGLE'?'voice.king-of-the-jungle':flawless?'voice.flawless-victory':(cpu2||net)&&!draw_?(iWon?'voice.you-win':'voice.you-lose'):champId?'voice.'+champId+'-wins':null;
  // Holden names the winner after every decided match; falls back to the old call until that line is recorded
  const winLine=!draw_&&champId&&mode!=='training'&&title!=='KING OF THE JUNGLE'?'voice.'+champId+'-wins':null;
  setTimeout(()=>{const named=winLine&&AU.now(winLine,1);if(!named&&line&&title!=='KING OF THE JUNGLE')AU.now(line);if(named&&flawless)setTimeout(()=>AU.now('voice.flawless-victory'),1500)},450)}
 const champ=draw_?picks[0]:(p1won?picks[0]:picks[1]);$('winner-portrait').src=winArt(champ.id);$('winner-portrait').alt=champ.name;const champRec=SAVE.get('fighterAchievements',{})[champ.id]||{},champMastery=masteryFor(champRec),champReward=MASTERY_REWARDS[champ.id]||{title:'JUNGLE ELITE',aura:'#e8b95b'};$('winner-portrait').classList.toggle('mastery-legend-portrait',champMastery.level>=5);$('winner-portrait').style.setProperty('--mastery-aura',champReward.aura);$('winner-portrait').title=champMastery.level>=2?champReward.title:'';
 $('winner-portrait').classList.toggle('echo-face',!!(tower&&tower.reveal));
 $('result').classList.toggle('defeat',(cpu2||net)&&!iWon&&!draw_);
 pad.classList.add('hidden');document.body.classList.remove('fighting','paused','touch');cancelAnimationFrame(raf);
 if(mode==='training'){show('fight');game.over=false;paused=false;time=99;$('timer').textContent='∞';raf=requestAnimationFrame(loop);return}
 else if(tower&&tower.done)champion(tower.player);
 else if(mode==='cpu'&&!tower&&arena.id==='caes-corner'&&p1won&&!draw_)recovery(picks[0],()=>show('result'));
 else show('result');
}
$('tower-next').onclick=()=>{
 if(tower.reveal){tower.reveal=false;tower.boss=true;picks=[tower.player,MAJIC];arena=LAIR;
  return storyCard({dark:1,title:'THE SUMMIT',text:STORY.forgotten.summit},()=>storyCard({dark:1,title:'THE TRUTH',text:STORY.forgotten.reveal},start))}
 picks=[tower.player,tower.ladder[tower.index]];arena=towerArena();
 if(tower.kind==='forgotten')return storyCard({dark:1,title:`ECHO ${tower.index+1}`,text:STORY.forgotten.echoes[tower.index]},start);
 start()};
$('rematch').onclick=()=>{if(mode==='training'){clean();return start()}if(mode==='online'){NET.send({t:'again'});return openSelect('online')}if(tower){if(tower.boss&&!tower.done){picks=[tower.player,MAJIC];arena=LAIR;return start()}if(tower.reveal)tower.reveal=false;if(tower.done){tower.done=false;tower.boss=false;tower.speechDone=false;tower.index=0;tower.startedAt=Date.now();tower.recordsSaved=false;tower.hallSaved=false}else if(game&&total(game.fighters[0])>total(game.fighters[1])&&tower.index>0)tower.index--;picks=[tower.player,tower.ladder[tower.index]];arena=towerArena()}start()};
/* ---------- Tower champion: saved crowns, ending scene, secret unlock ---------- */
const SAVE={get(k,d){try{const v=localStorage.getItem('kotj.'+k);return v==null?d:JSON.parse(v)}catch(_){return d}},set(k,v){try{localStorage.setItem('kotj.'+k,JSON.stringify(v))}catch(_){}}};
const ACHIEVEMENTS=[{id:'flawless',name:'FLAWLESS FIGHTER',icon:'✦',desc:'Win without losing a life bar'},{id:'combo10',name:'COMBO MASTER',icon:'⚡',desc:'Land a 10-hit combo'},{id:'ultra',name:'ULTRA FINISHER',icon:'✹',desc:'Win after unleashing an Ultra Combo'},{id:'titan',name:'TITAN SLAYER',icon:'♛',desc:'Defeat MAJIC in the Tower'}];
const MASTERY_LEVELS=[{name:'ROOKIE',xp:0},{name:'CONTENDER',xp:300},{name:'HUNTER',xp:800},{name:'CHAMPION',xp:1600},{name:'LEGEND',xp:3000}];
const MASTERY_REWARDS={badger:{title:'IRONROOT',sig:'Earthbreaker Crest',aura:'#d7a75c'},wolf:{title:'MOONFANG',sig:'Pack Leader Mantle',aura:'#9dc9f4'},hyena:{title:'MAD JESTER',sig:'Chaos Crown',aura:'#e5b34d'},leopard:{title:'FROSTBORN',sig:'Glacier Halo',aura:'#8ceaff'},jaguar:{title:'NIGHTSTALKER',sig:'Ambush Mark',aura:'#e9b45d'},crocodile:{title:'RIVER REAPER',sig:'Marshscale Mantle',aura:'#7ed2a2'},lion:{title:'SUN KING',sig:'Solar Mane Crest',aura:'#ffd36b'},tiger:{title:'STRIPE EMPEROR',sig:'Fury Stripes',aura:'#f4a34c'},grizzly:{title:'IRON PAW',sig:'Mountain Guard',aura:'#c69a70'},hippo:{title:'TIDEBREAKER',sig:'River Crown',aura:'#77d6dc'},elephant:{title:'TITANHEART',sig:'Colossus Crown',aura:'#d9d0bd'},eagle:{title:'SKY SOVEREIGN',sig:'Skyfire Wings',aura:'#f4d889'},snake:{title:'VENOM LORD',sig:'Serpent Halo',aura:'#8bd68a'},stag:{title:'ANCIENT WARDEN',sig:'Forest Spirit Antlers',aura:'#a9d78a'},dolphin:{title:'TIDE SOVEREIGN',sig:'Crown of the Deep',aura:'#6fd0ff'},majic:{title:'VOID ASCENDANT',sig:'Infinite Adaptation Aura',aura:'#b58aff'}};
function masteryFor(rec){const xp=Math.max(0,rec.masteryXP||0);let i=0;for(let n=0;n<MASTERY_LEVELS.length;n++)if(xp>=MASTERY_LEVELS[n].xp)i=n;const cur=MASTERY_LEVELS[i],next=MASTERY_LEVELS[i+1]||null;return {name:cur.name,level:i+1,xp,next:next?next.xp:null,progress:next?Math.max(0,Math.min(100,(xp-cur.xp)/(next.xp-cur.xp)*100)):100,remaining:next?Math.max(0,next.xp-xp):0};}
function awardFighterAchievements(f,won,flawless,titan){
 if(!f||!won)return [];
 const all=SAVE.get('fighterAchievements',{}),rec=all[f.data.id]||{unlocked:[],wins:0,bestCombo:0,masteryXP:0};
 rec.unlocked=rec.unlocked||[];rec.wins=(rec.wins||0)+1;rec.bestCombo=Math.max(rec.bestCombo||0,f.bestCombo||0);
 const earned=[];if(flawless)earned.push('flawless');if((f.bestCombo||0)>=10)earned.push('combo10');if(f.usedUltra)earned.push('ultra');if(titan)earned.push('titan');
 const fresh=earned.filter(id=>!rec.unlocked.includes(id));rec.unlocked=[...new Set([...rec.unlocked,...earned])];
 const oldMastery=masteryFor(rec);rec.masteryXP=(rec.masteryXP||0)+100+Math.min(100,(f.bestCombo||0)*3)+fresh.length*50;const newMastery=masteryFor(rec);rec.masteryLevelUp=newMastery.level>oldMastery.level?newMastery.name:null;rec.lastWin=Date.now();all[f.data.id]=rec;SAVE.set('fighterAchievements',all);
 return fresh.map(id=>ACHIEVEMENTS.find(a=>a.id===id)).filter(Boolean);
}
function renderAchievementAwards(items,f){const el=$('result-achievements');if(!el)return;const rec=f?SAVE.get('fighterAchievements',{})[f.data.id]||{}:{},m=masteryFor(rec),reward=MASTERY_REWARDS[f?.data.id]||{title:'JUNGLE ELITE',sig:'Champion Aura',aura:'#e8b95b'};const levelUp=rec.masteryLevelUp?`<div class="mastery-unlock"><b>✦ ${rec.masteryLevelUp} RANK UNLOCKED</b><span>${rec.masteryLevelUp==='CONTENDER'?reward.title+' fighter title':rec.masteryLevelUp==='HUNTER'?reward.sig:rec.masteryLevelUp==='CHAMPION'?'Exclusive victory flourish':'Legendary '+reward.title+' aura'}</span></div>`:'';el.innerHTML=(items.length?`<h3>NEW FIGHTER MEDALS · ${f.data.name}</h3><div class="achievement-list">${items.map(a=>`<div class="achievement-medal"><b>${a.icon}</b><span><strong>${a.name}</strong><small>${a.desc}</small></span></div>`).join('')}</div>`:'<h3>FIGHTER ACHIEVEMENTS</h3><p>No new medals this match. Keep fighting to earn them.</p>')+levelUp;el.classList.toggle('earned',!!items.length||!!levelUp)}
function renderAchievementGallery(){
 const grid=$('achievement-gallery-grid'),all=SAVE.get('fighterAchievements',{});if(!grid)return;
 const fighters=roster.slice();let unlocked=0,total=0;
 grid.innerHTML=fighters.map(f=>{const rec=all[f.id]||{unlocked:[],wins:0,bestCombo:0,masteryXP:0},ids=rec.unlocked||[],m=masteryFor(rec);unlocked+=ids.length;total+=ACHIEVEMENTS.length;
  const rw=MASTERY_REWARDS[f.id]||{title:'JUNGLE ELITE',sig:'Champion Aura',aura:'#e8b95b'},rewardRows=[{level:2,name:'Fighter Title',detail:rw.title,icon:'✦'},{level:3,name:'Signature Crest',detail:rw.sig,icon:'♛'},{level:4,name:'Victory Flourish',detail:'Exclusive champion entrance effect',icon:'✹'},{level:5,name:'Legend Aura',detail:'Permanent '+rw.title+' glow',icon:'✧'}];
  return `<article class="achievement-fighter-card ${m.level>=5?'mastery-legend':''}" style="--mastery-accent:${rw.aura}"><div class="achievement-fighter-head"><img src="${portrait(f.id)}" alt="${f.name}"><div><h3>${f.name}</h3><small>${rec.wins||0} WINS · BEST COMBO ${rec.bestCombo||0}</small><div class="fighter-mastery-rank">${m.name} · LEVEL ${m.level}</div><div class="mastery-fighter-title">${m.level>=2?rw.title:'TITLE LOCKED'}</div></div><b>${ids.length}/${ACHIEVEMENTS.length}</b></div><div class="fighter-mastery-track"><div class="fighter-mastery-fill" style="width:${m.progress.toFixed(1)}%"></div></div><div class="fighter-mastery-caption"><span>${m.xp.toLocaleString()} MASTERY XP</span><span>${m.next===null?'MAXIMUM MASTERY':m.remaining.toLocaleString()+' XP TO NEXT LEVEL'}</span></div><div class="mastery-reward-grid">${rewardRows.map(r=>`<div class="mastery-reward ${m.level>=r.level?'unlocked':'locked'}"><b>${r.icon}</b><span><strong>${r.name}</strong><small>${m.level>=r.level?r.detail:'Unlock at '+MASTERY_LEVELS[r.level-1].name}</small></span></div>`).join('')}</div><div class="achievement-medal-grid">${ACHIEVEMENTS.map(a=>`<div class="achievement-gallery-medal ${ids.includes(a.id)?'unlocked':'locked'}"><b>${a.icon}</b><span><strong>${a.name}</strong><small>${ids.includes(a.id)?'UNLOCKED':a.desc}</small></span></div>`).join('')}</div></article>`;
 }).join('');
 $('achievement-gallery-summary').textContent=`${unlocked} OF ${total} MEDALS UNLOCKED · ${fighters.length} FIGHTER PROFILES · MASTERY RANKS TRACKED PER FIGHTER`;
}
$('open-achievement-gallery').onclick=()=>{renderAchievementGallery();show('achievement-gallery')};
$('achievement-gallery-back').onclick=()=>{show('menu')};

const crowns=()=>SAVE.get('crowns',[]);
const STORY=window.KOTJ_STORY||{fighters:{},forgotten:{echoes:[]}};STORY.forgotten=STORY.forgotten||{echoes:[]};STORY.forgotten.echoes=STORY.forgotten.echoes||[];
const storyOf=id=>(STORY.fighters||{})[id]||{};
const BASE_IDS=KOTJ_ROSTER.filter(f=>f.id!=='majic'&&f.id!=='dolphin').map(f=>f.id); // Tower ladder stays the original 11
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
/* ---------- MAJIC's spoken farewell: one recorded clip per line, read out as each line appears ---------- */
const VOX_IDS=['badger','wolf','hyena','leopard','jaguar','crocodile','lion','tiger','grizzly','hippo','elephant','snake','eagle','stag'];
const majicVox=fid=>n=>'audio/voice/majic/farewell'+String(n).padStart(2,'0')+'.mp3?v=7.7';
const voxBuf={};let voxSrc=null;
function loadVox(url){if(voxBuf[url])return voxBuf[url];const a=ac();
 return voxBuf[url]=a?fetch(url).then(r=>r.ok?r.arrayBuffer():null).then(b=>b?new Promise(res=>a.decodeAudioData(b,res,()=>res(null))):null).catch(()=>null):Promise.resolve(null)}
function playVox(url,done){if(!soundOn)return done(false);const a=ac();
 loadVox(url).then(b=>{if(!b||!a)return done(false);const s=a.createBufferSource(),g=a.createGain();g.gain.value=1.15;s.buffer=b;s.connect(g).connect(a.destination);
  s.onended=()=>{if(voxSrc===s){voxSrc=null;done(true)}};voxSrc=s;s.start()})}
function stopVox(){const s=voxSrc;voxSrc=null;if(s)try{s.stop()}catch(_){}}
function storyCard(o,next){
 const t=(o.text||'').trim();if(!t)return next();
 const sc=$('story');sc.classList.toggle('dark',!!o.dark);sc.classList.toggle('boss-intro',!!o.bossIntro);
 const im=$('story-face');if(o.face){im.src=portrait(o.face);im.classList.remove('none')}else im.classList.add('none');
 $('story-eyebrow').textContent=o.eyebrow||'';$('story-title').textContent=o.title||'';
 $('story-text').innerHTML=(o.slow?t.split(/\n/):t.split(/\n+/)).map(x=>x.trim()===''?'<p class="gap"></p>':'<p>'+x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')+'</p>').join('');
 $('story').classList.toggle('slow',!!o.slow);clearTimeout(window.__slowT);
 if(o.slow){const ps=[...$('story-text').children];ps.forEach(p=>p.classList.add('wait'));let k=0;const nb=$('story-next');nb.classList.add('wait');
  const card=document.querySelector('.story-card');let li=0;const tok=window.__slowTok={};
  if(o.voice){for(let n=0;n<ps.filter(p=>!p.classList.contains('gap')).length;n++)loadVox(o.voice(n));AU&&AU.duckMusic(.2)}
  const step=()=>{if(window.__slowTok!==tok)return;if(k<ps.length){const p=ps[k++],gap=p.classList.contains('gap');p.classList.remove('wait');card.scrollTo({top:card.scrollHeight,behavior:'smooth'});
    if(!gap&&o.voice)playVox(o.voice(li++),ok=>{if(window.__slowTok===tok)window.__slowT=setTimeout(step,ok?380:o.slow)});
    else window.__slowT=setTimeout(step,gap?400:o.slow)}else nb.classList.remove('wait')};window.__slowT=setTimeout(step,900)}
 storyFig(o.fig);
 $('story-next').onclick=()=>{ac();window.__slowTok=null;clearTimeout(window.__slowT);if(voxSrc){stopVox();AU&&AU.duckMusic(1)}else if(o.voice)AU&&AU.duckMusic(1);storyFig(null);next()};show('story');setTimeout(()=>$('story-next').focus({preventScroll:true}),50);
}
const NEW_FIGHTERS=[
 {id:'snake',name:'SNAKE',icon:'🐍',style:'THE VENOMOUS KING',bio:'Patient, cold and deadly. Strikes from range with venom, crushes up close with a coil trap.',power:8,speed:8,defense:6,color:'#a88a2a'},
 {id:'eagle',name:'EAGLE',icon:'🦅',style:'THE SKY REAPER',bio:'Rules the air. Talons, beak and wing slashes, with a skyfall dive that hits like lightning.',power:7,speed:10,defense:5,color:'#a8742c'},
 {id:'stag',name:'STAG',icon:'🦌',style:'THE IRON HORN',bio:'An unstoppable charger with iron antlers, crushing kicks and an earth-shaking stomp.',power:9,speed:6,defense:8,color:'#9a6a34'}];
const unlockedNew=()=>SAVE.get('unlocked',[]);
function addUnlocked(){for(const f of NEW_FIGHTERS)if(unlockedNew().includes(f.id)&&!roster.includes(f)){const i=roster.indexOf(MAJIC);i>=0?roster.splice(i,0,f):roster.push(f)}}
const DOLPHIN={id:'dolphin',name:'DOLPHIN KING',icon:'🐬',style:'LORD OF THE TIDES · SPEED & WATER',bio:'A crowned king of the deep. Lightning-fast rushes, water control and agility: Riptide Rush, Whirlpool, Sonar Blast, Breach Slam and the Wrath of the Deep Ultimate.',power:7,speed:9,defense:7,color:'#3f7fc4'}; // unlocked by winning a match in THE TIDAL KINGDOM
const MAJIC={id:'majic',name:'MAJIC',icon:'👑',style:'THE JUNGLE TITAN · SECRET BOSS',bio:'All 11 beasts in one: lion mane, elephant tusks, eagle wings, serpents, a crocodile tail, tiger stripes and the frost-white fur of a snow leopard. Frost Strike, Jungle Rage, True Titan Form and the Titan Fury Ultra.',power:13,speed:6,defense:14,color:'#d9a43a'};
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
 lion:[.63,.1,.21],tiger:[.69,.1,.2],grizzly:[.6,.11,.2],hippo:[.62,.12,.2],elephant:[.5,.11,.21],snake:[.44,.16,.17],eagle:[.72,.24,.16],stag:[.5,.29,.16],dolphin:[.6,.06,.17],majic:[.55,.13,.13]};
let champRaf=0;
function champion(f){
 if(tower&&tower.boss&&!tower.hallSaved){tower.hallSaved=true;
  SAVE.set('jungleChampion',{id:f.id});
  const hall=SAVE.get('hallOfChampions',[]),entry=hall.find(x=>x.id===f.id);
  if(entry){entry.wins=(entry.wins||1)+1;entry.lastWin=Date.now()}
  else hall.push({id:f.id,name:f.name,wins:1,firstWin:Date.now(),lastWin:Date.now()});
  SAVE.set('hallOfChampions',hall);
 }
 if(tower&&tower.boss&&!tower.championCinematicSeen){tower.championCinematicSeen=true;return storyCard({dark:1,slow:2100,fig:{id:f.id,anim:'victory',light:.34,hold:1},eyebrow:'THE JUNGLE CHOOSES ITS CHAMPION',title:'A NEW ERA BEGINS',text:`The eclipse breaks. Violet shadows lift from the canopy, ancient roots glow beneath the arena, and the creatures of the jungle gather in silence.\n\nThe crown is no longer MAJIC’s. **${f.name}** stands as the new guardian of the wild.`},()=>champion(f))}
 if(tower&&tower.boss&&!tower.speechDone){tower.speechDone=true;const txt=(STORY.forgotten.majicSpeech||'').split('[FIGHTER]').join(f.name);
  return storyCard({dark:1,slow:2600,fig:{id:'majic',anim:'hit_heavy',light:.22,hold:1},eyebrow:'THE JUNGLE TITAN FALLS',title:'MAJIC',text:txt,voice:majicVox(f.id)},()=>{if(!SAVE.get('riseSeen',false)){SAVE.set('riseSeen',true);$('rise-btn').classList.remove('hidden');playRise(()=>champion(f))}else champion(f)})}
 if(tower&&!tower.recordsSaved&&tower.kind==='tower'){tower.recordsSaved=true;const records=SAVE.get('globalTowerRecords',{fastestMs:null,totalChampionships:0,majicVictories:0});records.totalChampionships=(records.totalChampionships||0)+1;if(tower.boss)records.majicVictories=(records.majicVictories||0)+1;if(tower.startedAt){const elapsed=Math.max(0,Date.now()-tower.startedAt);if(records.fastestMs==null||elapsed<records.fastestMs)records.fastestMs=elapsed}SAVE.set('globalTowerRecords',records)}
 const secret=!!tower.boss,list=crowns();let firstCrown=false,awaken=false,newUnlock=false,newFighter=null;const notes=[];
 if(tower.kind!=='forgotten'){firstCrown=!list.includes(f.id);if(firstCrown){list.push(f.id);SAVE.set('crowns',list)}}
if(tower.kind!=='forgotten'){const left=NEW_FIGHTERS.filter(n=>!unlockedNew().includes(n.id));
  if(left.length){const nf=left[Math.floor(Math.random()*left.length)];SAVE.set('unlocked',[...unlockedNew(),nf.id]);addUnlocked();newFighter=nf;
   notes.push(`NEW FIGHTER UNLOCKED · ${nf.name}`)}}
 if(secret){newUnlock=!secretUnlocked();if(newUnlock){SAVE.set('secret',true);if(!roster.includes(MAJIC))roster.push(MAJIC);notes.push('MAJIC HAS JOINED THE ROSTER')}}
 $('champ-unlock').textContent=notes.join(' · ');
 const hallEl=$('champ-hall'),hall=SAVE.get('hallOfChampions',[]);
 if(hallEl){hallEl.innerHTML=hall.length?`<h3>HALL OF CHAMPIONS</h3><div class="champ-hall-list">${hall.slice().sort((a,b)=>(b.wins||0)-(a.wins||0)).map(x=>`<div class="champ-hall-entry"><img src="${portrait(x.id)}" alt=""><span>${x.name||x.id.toUpperCase()}</span><b>${x.wins||1} ${x.wins===1?'CROWN':'CROWNS'}</b></div>`).join('')}</div>`:'<h3>HALL OF CHAMPIONS</h3><p>Defeat MAJIC to claim your place in history.</p>';hallEl.classList.toggle('empty',!hall.length)}
 const board=$('champ-record-board'),records=SAVE.get('globalTowerRecords',{fastestMs:null,totalChampionships:0,majicVictories:0}),topChampion=hall.slice().sort((a,b)=>(b.wins||0)-(a.wins||0))[0];
 if(board){const fmt=ms=>{if(ms==null)return 'NOT SET';const sec=Math.floor(ms/1000),m=Math.floor(sec/60),r=sec%60;return `${m}:${String(r).padStart(2,'0')}`};board.innerHTML=`<h3>JUNGLE RECORD BOARD</h3><div class="champ-record-row"><span>FASTEST TOWER</span><b>${fmt(records.fastestMs)}</b></div><div class="champ-record-row"><span>MOST MAJIC VICTORIES</span><b>${topChampion?`${topChampion.name||topChampion.id.toUpperCase()} · ${topChampion.wins||1}`:'NONE YET'}</b></div><div class="champ-record-row"><span>CHAMPIONSHIPS WON</span><b>${records.totalChampionships||0}</b></div>`}
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
    // The ordinary tower crown settles quickly. Defeating MAJIC triggers a slower
    // coronation: a golden beam calls the crown down, then an energy seal ignites.
    const T=tops[i],start=secret?2.05:1.4,duration=secret?1.35:.9,ct=Math.min(1,Math.max(0,(t-start)/duration)),e=1-Math.pow(1-ct,3),cw=T.hw*sc,ch=cw*crown.height/crown.width;
    const hx=x+T.hx*sc,hy=y+(T.t+im.height*.02)*sc-ch,cy=-ch+(hy+ch)*e;
    if(secret&&ct<1){cx.save();cx.globalAlpha=(1-ct)*(.35+.2*Math.sin(t*18));const beam=cx.createLinearGradient(hx,cy-ch*3,hx,hy);beam.addColorStop(0,'rgba(255,240,170,0)');beam.addColorStop(.55,'rgba(255,220,120,.28)');beam.addColorStop(1,'rgba(255,246,198,.72)');cx.fillStyle=beam;cx.beginPath();cx.moveTo(hx-cw*.55,cy-ch*2.7);cx.lineTo(hx+cw*.55,cy-ch*2.7);cx.lineTo(hx+cw*.8,hy+ch*.2);cx.lineTo(hx-cw*.8,hy+ch*.2);cx.fill();cx.restore()}
    cx.save();cx.globalAlpha=Math.min(1,ct*3);cx.shadowColor='rgba(255,220,120,.9)';cx.shadowBlur=(secret?34:24)*dpr;cx.drawImage(crown,hx-cw/2,cy,cw,ch);cx.restore();
    if(secret&&ct>=1){const pulse=.5+.5*Math.sin((t-(start+duration))*5);cx.save();cx.globalCompositeOperation='lighter';cx.globalAlpha=.32+.22*pulse;cx.strokeStyle='#ffe7a0';cx.lineWidth=3*dpr;cx.shadowColor='#ffd36b';cx.shadowBlur=20*dpr;cx.beginPath();cx.ellipse(hx,hy+ch*.48,cw*(1.15+pulse*.12),ch*(.42+pulse*.08),0,0,Math.PI*2);cx.stroke();cx.restore()}}}
  if(secret&&t>3.42){const q=Math.min(1,(t-3.42)/.8),a=(1-q)*.7;cx.save();cx.globalCompositeOperation='lighter';cx.globalAlpha=a;cx.strokeStyle='#f6d77f';cx.lineWidth=5*dpr;cx.shadowColor='#ffe7a0';cx.shadowBlur=28*dpr;cx.beginPath();cx.ellipse(fx,fy-10*dpr,28*dpr+q*190*dpr,8*dpr+q*35*dpr,0,0,Math.PI*2);cx.stroke();cx.restore()}
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
function menu(){if(mode==='online'&&window.KOTJNet){NET.send({t:'leave'});NET.leave();mode='versus'}clean();tower=null;show('menu');AU&&soundOn&&$('menu').classList.contains('started')&&AU.music('music.menu')}
$('pause').onclick=togglePause;
document.querySelectorAll('.blood-btn').forEach(b=>b.onclick=e=>{e.stopPropagation();setBlood((blood+1)%3)});setBlood(blood);document.querySelectorAll('.gfx-btn').forEach(b=>b.onclick=e=>{e.stopPropagation();setGfx(GFX==='sharp'?'auto':'sharp')});setGfx(GFX);
// Full screen (and sideways lock on phones that allow it)
(function(){const b=$('fullscreen'),el=document.documentElement,can=!!(el.requestFullscreen||el.webkitRequestFullscreen);
 if(!can){b.style.display='none';return}
 const label=()=>b.textContent=document.fullscreenElement||document.webkitFullscreenElement?'EXIT FULL SCREEN':'FULL SCREEN';
 b.onclick=async()=>{try{if(document.fullscreenElement||document.webkitFullscreenElement){await (document.exitFullscreen||document.webkitExitFullscreen).call(document)}
  else{await (el.requestFullscreen||el.webkitRequestFullscreen).call(el);try{await screen.orientation.lock('landscape')}catch(_){}}}catch(_){}label()};
 document.addEventListener('fullscreenchange',label);document.addEventListener('webkitfullscreenchange',label)})();$('back-menu').onclick=menu;$('result-menu').onclick=menu;

/* ---------- Hidden: Cae's Corner recovery (win a VS CPU match in Cae's Corner) ---------- */
const TRAINER=new Image();TRAINER.src='assets/ui/trainer.webp?v=7.6';
function lyingPose(id,cb){
 const meta=HD[id]&&HD[id].anims.defeat;if(!meta)return cb(null);const [n,fw,fh]=meta;const im=new Image();
 im.onload=()=>{const c=document.createElement('canvas');c.width=fw;c.height=fh;const x=c.getContext('2d');x.drawImage(im,(n-1)*fw,0,fw,fh,0,0,fw,fh);
  const d=x.getImageData(0,0,fw,fh).data;let x0=fw,y0=fh,x1=0,y1=0;
  for(let y=0;y<fh;y++)for(let X=0;X<fw;X++)if(d[(y*fw+X)*4+3]>60){if(X<x0)x0=X;if(X>x1)x1=X;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<=x0)return cb(null);const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(c,x0,y0,o.width,o.height,0,0,o.width,o.height);cb(o)};
 im.onerror=()=>cb(null);im.src=`assets/characters/${id}/frames-hd/defeat.webp?v=6.4`}
function recovery(f,next){
 let done=false,raf2=0;const cv=$('recovery-canvas'),c=cv.getContext('2d'),bg=arenaImg['caes-corner'];
 $('recovery-name').textContent=f.name+' RECOVERS AT CAE\'S CORNER';
 const end=()=>{if(done)return;done=true;cancelAnimationFrame(raf2);window.removeEventListener('keydown',key,true);cv.onclick=null;$('recovery').onclick=null;next()};
 const key=e=>{e.preventDefault();e.stopPropagation();end()};
 show('recovery');setTimeout(()=>{window.addEventListener('keydown',key,true);$('recovery').onclick=end},600);
 const still=new Image();let useStill=false,gxF=.66,gyF=.36,hF=.62;still.onload=()=>{useStill=true};{const REC_V2={majic:[[1,.40,.45],[2,.52,.44],[3,.50,.46],[4,.47,.43],[5,.52,.45]]},v=REC_V2[f.id];if(v){const q=v[Math.floor(Math.random()*v.length)];gxF=q[1];gyF=q[2];hF=.72;still.src=`assets/ui/recovery/v2/${f.id}_${q[0]}.webp?v=10.14`}else still.src=`assets/ui/recovery/${f.id}.webp?v=7.8`}
 lyingPose(f.id,body=>{const t0=performance.now();
  const frame=t=>{if(done)return;const T=(t-t0)/1000;
   const W=cv.clientWidth||1100,H=cv.clientHeight||620,dpr=Math.min(2,devicePixelRatio||1);if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
   c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
   if(bg&&bg.complete){const s=Math.max(W/bg.width,H/bg.height);c.drawImage(bg,(W-bg.width*s)/2,(H-bg.height*s)/2,bg.width*s,bg.height*s)}
   c.fillStyle='rgba(8,4,2,.55)';c.fillRect(0,0,W,H);
   const vg=c.createRadialGradient(W/2,H*.62,H*.1,W/2,H*.62,H*.9);vg.addColorStop(0,'rgba(255,190,110,.18)');vg.addColorStop(1,'rgba(0,0,0,.6)');c.fillStyle=vg;c.fillRect(0,0,W,H);
   if(useStill){ // hand-drawn scene: fighter face-down under a towel, trainer working the shoulders
    const z=1+Math.min(T,7)*.007,sw=Math.min(W*.86,H*hF*still.width/still.height,still.width*1.6)*z,sh=sw*still.height/still.width,sx=(W-sw)/2,sy=H*.97-sh;
    c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.ellipse(W/2,sy+sh*.99,sw*.46,sh*.05,0,0,7);c.fill();
    const br=1+Math.sin(T*2.1)*.006;c.drawImage(still,sx,sy+sh*(1-br),sw,sh*br);
    const p=.5+.5*Math.sin(T*5),gx=sx+sw*gxF,gy=sy+sh*gyF,r=sh*.26;c.save();c.globalCompositeOperation='lighter';
    const g=c.createRadialGradient(gx,gy,0,gx,gy,r);g.addColorStop(0,`rgba(235,160,255,${.32*p+.1})`);g.addColorStop(.55,`rgba(160,70,255,${.12*p})`);g.addColorStop(1,'rgba(120,40,255,0)');c.fillStyle=g;c.fillRect(gx-r,gy-r,r*2,r*2);
    for(let k=0;k<6;k++){const a=(T*.6+k/6)%1,px2=gx+Math.sin(k*2.3+T)*r*.6,py2=gy-a*r*1.3;c.fillStyle=`rgba(240,200,255,${(1-a)*.7})`;c.beginPath();c.arc(px2,py2,Math.max(1,sh*.012),0,7);c.fill()}
    c.restore();
   }else{
   // trainer + table (cell 272x362; table top ~y214, x 60..265)
   const sc=Math.min(H*.78/362,W*.62/272),cx=W/2-136*sc,cy=H*.98-362*sc;
   const fi=T<.9?8:9+Math.floor((T-.9)*7)%7;
   // soft floor shadow
   c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.ellipse(cx+150*sc,cy+352*sc,135*sc,14*sc,0,0,7);c.fill();
   if(TRAINER.complete)c.drawImage(TRAINER,fi*272,0,272,362,cx,cy,272*sc,362*sc);
   if(body){let bw=200*sc,bh=bw*body.height/body.width;const mh=118*sc;if(bh>mh){bh=mh;bw=bh*body.width/body.height}
    const bx=cx+270*sc-bw,by=cy+(216+Math.sin(T*2.2)*.6)*sc-bh;c.drawImage(body,bx,by,bw,bh)}
   if(fi>=11){const p=.55+.45*Math.sin(T*7),gx=cx+150*sc,gy=cy+188*sc,r=46*sc;c.save();c.globalCompositeOperation='lighter';
    const g=c.createRadialGradient(gx,gy,0,gx,gy,r);g.addColorStop(0,`rgba(230,150,255,${.55*p})`);g.addColorStop(.5,`rgba(170,70,255,${.25*p})`);g.addColorStop(1,'rgba(120,40,255,0)');c.fillStyle=g;c.fillRect(gx-r,gy-r,r*2,r*2);c.restore()}
   }
   const fade=Math.min(1,T/.5);$('recovery').style.setProperty('--rf',fade);
   // stays up until the player taps, clicks, presses a key or a controller button
   if(T>.6){const pads=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];const any=pads.some(p=>p.buttons.some(b=>b.pressed));
    if(any&&!frame.held)return end();frame.held=any}else{frame.held=true}
   raf2=requestAnimationFrame(frame)};
  raf2=requestAnimationFrame(frame)})}

/* ---------- The Rise of MAJIC: James's movie. Plays after the first MAJIC win; replay from the menu ---------- */
function playRise(next){
 const v=$('rise-video'),skip=$('rise-skip'),tap=$('rise-play');let done=false,guard=performance.now(),raf3=0;
 const end=()=>{if(done)return;done=true;cancelAnimationFrame(raf3);try{v.pause()}catch(_){}v.removeAttribute('src');v.load();
  window.removeEventListener('keydown',key,true);AU&&AU.duckMusic(1);next()};
 const key=e=>{if(performance.now()-guard<800)return;if(['Escape','Enter'].includes(e.key)){e.preventDefault();e.stopPropagation();end()}
  else if(e.key===' '){e.preventDefault();e.stopPropagation();v.paused?v.play().catch(()=>{}):v.pause()}};
 const go=()=>{tap.classList.add('hidden');v.play().then(()=>tap.classList.add('hidden')).catch(()=>tap.classList.remove('hidden'))};
 skip.onclick=()=>{if(performance.now()-guard>500)end()};tap.onclick=go;v.onended=end;v.onclick=()=>{if(v.paused)go()};
 v.onerror=()=>{if(!done)end()};
 window.addEventListener('keydown',key,true);
 AU&&AU.duckMusic(0);show('rise');v.src='assets/cinema/rise-of-majic.mp4?v=8.3';v.currentTime=0;go();
 // controller: B or Start skips
 const pad=()=>{if(done)return;const ps=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];const b=ps.some(p=>(p.buttons[1]&&p.buttons[1].pressed)||(p.buttons[9]&&p.buttons[9].pressed));
  if(performance.now()-guard>800&&b&&!pad.held)return end();pad.held=b;raf3=requestAnimationFrame(pad)};raf3=requestAnimationFrame(pad)}

/* ---------- Online play: share a code, fight a friend ---------- */
const NET=window.KOTJNet||{send(){},fast(){},leave(){},host(){},join(){return ''},on(){}};
const BTN=['l','r','j','bl','at','sp','ins'];
const fighterById=id=>KOTJ_ROSTER.find(f=>f.id===id)||NEW_FIGHTERS.find(f=>f.id===id)||(id==='majic'?MAJIC:null)||KOTJ_ROSTER[0];
function olStatus(t,err){const s=$('ol-status');s.textContent=t||'';s.classList.toggle('err',!!err)}
function olView(v){$('ol-home').classList.toggle('hidden',v!=='home');$('ol-host').classList.toggle('hidden',v!=='host')}
function openOnline(code){NET.leave();clean();tower=null;mode='online';olView('home');olStatus('');$('ol-join').disabled=false;$('ol-create').disabled=false;
 if(code)$('ol-code').value=NET.cleanCode?NET.cleanCode(code):code;show('online');setBackdrop('assets/ui/select-bg.webp');AU&&soundOn&&AU.music('music.menu');if(code)$('ol-join').click()}
$('ol-create').onclick=()=>{ac();$('ol-create').disabled=true;olStatus('CREATING YOUR MATCH…');NET.host()};
$('ol-join').onclick=()=>{ac();const c=NET.join($('ol-code').value);if(c){$('ol-code').value=c;$('ol-join').disabled=true;$('ol-create').disabled=true;olStatus('CONNECTING TO '+c+'…')}};
$('ol-code').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')$('ol-join').click()});
$('ol-back').onclick=()=>{NET.leave();mode='versus';menu()};
$('ol-cancel').onclick=()=>{NET.leave();olView('home');olStatus('');$('ol-create').disabled=false;$('ol-join').disabled=false};
$('ol-share').onclick=async()=>{const url=location.origin+location.pathname+'?join='+ON.code,text=`Fight me in King of the Jungle! Match code: ${ON.code}`;
 if(navigator.share){try{await navigator.share({title:'King of the Jungle',text,url})}catch(_){}return}
 try{await navigator.clipboard.writeText(text+'\n'+url);olStatus('CODE AND LINK COPIED · SEND IT TO YOUR FRIEND')}catch(_){olStatus('SEND YOUR FRIEND THIS CODE: '+ON.code)}};
NET.on('hosting',code=>{ON.code=code;$('ol-mycode').textContent=code;olView('host');olStatus('')});
NET.on('joining',()=>olStatus('OPPONENT FOUND · CONNECTING…'));
NET.on('connected',role=>{ON.side=role==='host'?0:1;olStatus('');openSelect('online')});
NET.on('error',why=>{if(mode!=='online')return;
 const T={nomatch:'NO MATCH FOUND WITH THAT CODE. CHECK IT AND TRY AGAIN.',timeout:'COULD NOT CONNECT. CHECK THE CODE, OR TRY AGAIN ON WI-FI.',connect:'COULD NOT CONNECT. TRY AGAIN, OR TRY AGAIN ON WI-FI.',server:'ONLINE PLAY IS UNAVAILABLE RIGHT NOW. TRY AGAIN IN A MOMENT.',badcode:'ENTER THE CODE YOUR FRIEND SENT YOU, LIKE TIGER-427.'};
 if($('online').classList.contains('hidden'))openOnline();olView('home');$('ol-join').disabled=false;$('ol-create').disabled=false;olStatus(T[why]||T.connect,true)});
function opponentGone(msg){if(mode!=='online')return;NET.leave();openOnline();olStatus(msg,true)}
NET.on('lost',()=>opponentGone('YOUR OPPONENT DISCONNECTED.'));
NET.on('msg',m=>{if(mode!=='online')return;
 if(m.t==='pick'){ON.theirs=m.id;selectWait()}
 else if(m.t==='start'&&ON.side===1){picks=[fighterById(m.a),fighterById(m.b)];arena=ARENAS.find(a=>a.id===m.arena)||ARENAS[0];start()}
 else if(m.t==='fx'&&ON.side===1&&game){
  for(const p of m.fx||[]){if(!blood&&(p.kind==='blood'||p.kind==='mist'))continue;game.fx.push(p)}
  if(soundOn)for(const e of m.snd||[]){const [k,a,b,c2]=e;if(k==='x')sfx(a);else if(AU){if(k==='n')AU.now(a,b,c2);else if(k==='u')AU.ultra(a);else if(k==='d')AU.duckMusic(a)}}}
 else if(m.t==='end'&&ON.side===1){if(game&&!game.over){if(m.s)applySnap(m.s);finish()}}
 else if(m.t==='again'){if(!$('select').classList.contains('hidden'))return;clean();openSelect('online')}
 else if(m.t==='leave')opponentGone('YOUR OPPONENT LEFT THE MATCH.');
});
NET.on('fast',m=>{if(mode!=='online')return;
 if(m.t==='i'&&ON.side===0)ON.inp=m;
 else if(m.t==='s'&&ON.side===1&&m.q>ON.lastSeq){ON.lastSeq=m.q;ON.snap=m}});
function selectWait(){if(mode!=='online'||$('select').classList.contains('hidden'))return;
 const ins=$('select-instruction'),cf=$('confirm-fighter');
 if(ON.mine&&ON.theirs){
  if(ON.side===0){picks=[fighterById(ON.mine),fighterById(ON.theirs)];stagePick=RND();$('stage-vs').textContent=`${picks[0].name} VS ${picks[1].name}`;openStage();return}
  ins.textContent='BOTH LOCKED IN · YOUR FRIEND IS PICKING THE ARENA…';cf.textContent='LOCKED IN';cf.disabled=true;return}
 ins.textContent=ON.mine?'LOCKED IN · WAITING FOR YOUR FRIEND…':ON.theirs?'YOUR FRIEND IS READY · CHOOSE YOUR FIGHTER':'ONLINE MATCH · CHOOSE YOUR FIGHTER';
 cf.textContent=ON.mine?'LOCKED IN':'LOCK IN';cf.disabled=!!ON.mine}
// Both keyboards layouts work online (WASD or arrows), plus touch and the first controller.
function localOnline(){const a=inputFor(0),b=inputFor(1),k={};for(const n of BTN)k[n]=!!(a[n]||b[n]);return k}
function netInput(i){
 if(i===ON.side)return localOnline();
 const h=ON.inp.h||{},c=ON.inp.c||{},k={};
 for(const n of BTN){let v=!!h[n];const cn=c[n]||0;
  if(cn>(ON.used[n]||0)){if(!v&&!ON.prevOut[n])v=true;ON.used[n]=cn}  // a quick tap that fell between packets still lands
  k[n]=v;ON.prevOut[n]=v}
 return k}
const FK=['x','y','bossPhase','majicVoidGuardT','majicDefenseCooldownT','ascendantT','ascendantCooldownT','jungleRageT','jungleRageCooldownT','stagCounterT','venomT','venomTick','venomBy','coilT','eagleCounterT','eagleEvadeT','badgerCounterT','wolfCounterT','hyenaCounterT','hyenaEvadeT','hyenaFrenzyFinisher','crocodileCounterT','tigerCounterT','tigerEvadeT','vx','vy','moveVel','comboLinked','frostImpact','leopardFinisher','leopardDashT','elephantImpact','elephantSlamArmed','elephantStompT','elephantCounterT','elephantChargeT','hippoRushT','lionManeFinisher','lionCounterT','tigerPounceT','dir','hp','bars','potential','block','blockTime','attack','stun','walk','move','action','actionTime','actionTotal','hitFlash','hitAnimTime','hitHeavy','landImpact','combo','meter','lockout','breakWindow','instinct','down','koTime','chain','winT','ground','elapsed','sec','secT','secPrev'];
const r2=v=>typeof v==='number'?Math.round(v*100)/100:v;
function makeSnap(){
 const F=game.fighters.map(f=>{const o={};for(const k of FK)o[k]=r2(f[k]);o.trail=f.trail.map(p=>({x:p.x|0,y:p.y|0,dir:p.dir,a:p.a,frost:!!p.frost,t:r2(p.t)}));return o});
 const cb=i=>$('p'+i+'-combo');
 return{t:'s',q:++ON.seq,f:F,tm:r2(time),b:game.banner,fl:r2(game.flash),sh:r2(game.shake),ko:r2(game.ko),it:r2(game.intro),u:game.ultra?{i:game.ultra.i}:null,sl:game.slow,
  // Keep recent presentation and the two-stage Titan's Bane state aligned
  // with the authoritative host simulation.
  kb:game.koBurst?{x:r2(game.koBurst.x),y:r2(game.koBurst.y),t:r2(game.koBurst.t||0),frost:!!game.koBurst.frost}:null,
  bn:game.baneN||0,bi:game.bane||0,
  c:[cb(1).textContent,cb(1).classList.contains('active'),cb(2).textContent,cb(2).classList.contains('active'),$('combat-callout').textContent]}}
function applySnap(s){
 s.f.forEach((d,i)=>Object.assign(game.fighters[i],d));time=s.tm;$('timer').textContent=Math.ceil(time);
 game.banner=s.b;game.flash=s.fl;game.shake=s.sh;game.ko=s.ko;game.intro=s.it;game.ultra=s.u;game.slow=s.sl;
 game.koBurst=s.kb||null;game.baneN=s.bn||0;game.bane=s.bi||0;
 const [a,aa,b,bb,cc]=s.c;$('p1-combo').textContent=a;$('p1-combo').classList.toggle('active',aa);$('p2-combo').textContent=b;$('p2-combo').classList.toggle('active',bb);$('combat-callout').textContent=cc;
 hud()}
function hostSend(){
 if(ON.side!==0||!game)return;
 NET.fast(makeSnap());
 const fresh=[];for(const p of game.fx)if(!p._s){p._s=1;const q={};for(const k in p)if(k!=='_s')q[k]=r2(p[k]);fresh.push(q)}
 if(fresh.length||ON.ev.length){NET.send({t:'fx',fx:fresh,snd:ON.ev});ON.ev=[]}}
function guestFrame(real){
 const k=localOnline(),h={};
 for(const n of BTN){if(k[n]&&!ON.lp[n])ON.cnt[n]=(ON.cnt[n]||0)+1;ON.lp[n]=k[n];if(k[n])h[n]=1}
 NET.fast({t:'i',h,c:ON.cnt});
 if(ON.snap){applySnap(ON.snap);ON.snap=null}
 fxUpdate(real);if(game.banner){game.banner.t+=real;if(game.banner.t>game.banner.life)game.banner=null}
 game.zoom=1}
// Invite links: kingofthejunglegame.netlify.app/?join=TIGER-427 jumps straight into that match.
const JOIN=new URLSearchParams(location.search).get('join');
if(JOIN){try{history.replaceState(null,'',location.pathname)}catch(_){}
 const go=()=>{if(!$('menu').classList.contains('started'))return setTimeout(go,250);openOnline(JOIN)};setTimeout(go,250)}

$('rise-btn').classList.toggle('hidden',!SAVE.get('riseSeen',false));
$('rise-btn').onclick=()=>{ac();playRise(()=>{show('menu');AU&&soundOn&&AU.music('music.menu')})};
/* ---------- Rendering ---------- */

// Sprite-sheet fighters: one horizontal strip per animation -> [frames, frameW, frameH, worldScale]
// Standardized fighter frames (KOTJ_V2_Fighter_Animations): one strip per animation.
// anims[name] = [frames, frame w, frame h (stored px), pivot x, pivot y (game units)]; stored at scale s.
const SPRITES={
 snake:{s:0.6,anims:{"idle":[31,179,165,159,274],"walk_forward":[55,219,176,188,285],"walk_back":[55,219,176,188,285],"run":[55,219,176,188,285],"crouch":[6,160,148,126,245],"block":[17,172,167,119,278],"attack_light":[50,198,166,141,274],"bite":[37,258,169,254,279],"special_pounce":[57,194,170,142,282],"special_b":[70,346,192,270,305,46],"special_c":[57,194,170,142,282],"special_d":[33,203,178,176,296],"ultra_move":[70,346,192,270,305,46],"attack_heavy":[33,203,178,176,296],"uppercut":[33,203,178,176,296],"victory":[61,170,179,134,296],"jump":[29,192,186,186,306],"hit_light":[20,263,173,132,287],"hit_heavy":[20,263,173,132,287],"knockdown":[37,296,162,188,268],"knockdown_getup":[33,227,173,188,286],"defeat":[37,296,162,188,268],"finisher":[61,309,171,243,284,51],"sx2":[76,178,180,119,299],"sx1":[64,259,175,260,291,61]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','attack_heavy','bite','uppercut'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]],ko:['knockdown',36]},
 eagle:{s:0.6,anims:{"idle":[76,156,149,113,247],"walk_forward":[34,150,156,97,259],"walk_back":[34,150,156,97,259],"run":[34,150,156,97,259],"crouch":[6,204,144,179,237],"block":[17,157,157,119,259],"attack_light":[20,192,157,176,259],"bite":[40,196,160,179,266],"special_pounce":[60,293,161,193,266,54],"special_b":[70,289,160,193,266,55],"ultra_move":[70,289,160,193,266,55],"attack_heavy":[48,183,152,160,251],"uppercut":[48,183,152,160,251],"victory":[55,286,160,193,266],"jump":[21,265,161,193,266],"hit_light":[18,254,161,193,266],"hit_heavy":[18,254,161,193,266],"knockdown":[42,293,161,193,266],"knockdown_getup":[25,213,153,193,252],"defeat":[42,293,161,193,266],"finisher":[61,293,161,193,266,54],"sx2":[76,275,160,193,266,58],"sx1":[70,293,161,193,266,54]},
  double:['attack_light','attack_heavy','special_b'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','attack_heavy','bite','uppercut'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]],ko:['knockdown',41]},
 stag:{s:0.6,anims:{"idle":[40,117,171,80,283],"walk_forward":[28,123,174,115,286],"walk_back":[28,123,174,115,286],"run":[28,123,174,115,286],"crouch":[6,163,220,154,365],"block":[17,127,172,100,284],"attack_light":[37,131,171,80,282],"bite":[36,116,169,80,280],"special_pounce":[68,242,176,189,283,66],"special_b":[70,166,186,127,307],"special_c":[68,242,176,189,283,66],"special_d":[56,140,168,94,278],"ultra_move":[70,166,186,127,307],"attack_heavy":[56,140,168,94,278],"uppercut":[56,140,168,94,278],"victory":[61,113,176,84,291],"jump":[54,115,180,80,298],"hit_light":[20,230,174,100,289],"hit_heavy":[20,230,174,100,289],"knockdown":[45,318,173,246,287],"knockdown_getup":[26,146,160,222,265],"defeat":[45,318,173,246,287],"finisher":[61,250,190,198,307],"sx2":[51,130,170,99,281],"sx1":[76,295,186,288,307,54]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','attack_heavy','bite','uppercut'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]],ko:['knockdown',44]},
 majic:{s:0.6,anims:{"idle":[26,231,236,171,390],"walk_forward":[25,238,237,173,391],"walk_back":[25,238,237,173,391],"run":[25,238,237,173,391],"dash":[25,238,237,173,391],"crouch":[6,235,211,200,348],"block":[17,230,236,171,390],"attack_light":[50,293,235,195,388],"bite":[26,240,246,162,408],"special_pounce":[55,383,259,352,429,41],"special_b":[70,406,256,228,407,39],"special_c":[55,383,259,352,429,41],"special_d":[56,312,253,243,419,51],"ultra_move":[70,406,256,228,407,39],"attack_heavy":[56,312,253,243,419,51],"uppercut":[56,312,253,243,419,51],"victory":[60,466,254,352,418,34],"jump":[19,322,254,311,420],"hit_light":[20,410,259,235,429],"hit_heavy":[20,410,259,235,429],"knockdown":[35,435,238,277,393],"knockdown_getup":[32,348,245,269,406],"defeat":[35,435,238,277,393],"finisher":[61,480,259,352,429,33],"sx2":[55,353,249,196,403,45],"sx3":[76,299,259,235,428,53],"sx1":[55,471,270,352,429,33]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','special_c','special_d','attack_heavy'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]],ko:['knockdown',34]},
 badger:{s:0.6,anims:{"idle":[29,107,128,92,212],"walk_forward":[24,120,129,97,213],"walk_back":[24,120,129,97,213],"run":[24,120,129,97,213],"block":[17,119,127,99,211],"attack_light":[30,137,126,92,209],"bite":[40,157,123,103,204],"claw_swipe":[40,133,126,96,209],"attack_heavy":[56,144,144,97,238],"uppercut":[56,144,144,97,238],"pounce":[56,259,140,210,232],"special_earth_slam":[56,259,140,210,232],"shadow_rampage":[56,259,140,210,232],"victory":[50,120,145,92,240],"jump":[29,132,131,92,216],"crouch":[8,111,123,96,203],"hit_light":[20,139,129,113,213],"hit_heavy":[20,139,129,113,213],"knockdown":[37,269,142,226,234],"knockdown_getup":[28,165,132,172,219],"defeat":[37,269,142,226,234],"special_pounce":[56,259,140,210,232],"special_b":[64,149,142,97,235],"finisher":[61,175,144,102,236],"ultra_move":[64,149,142,97,235],"sx2":[62,195,139,103,219],"sx1":[46,117,145,92,240]},
  claw:'claw_swipe',double:['attack_heavy','claw_swipe'],special:'special_earth_slam',shadow:'special_b',ultra:['attack_light','attack_heavy','uppercut','claw_swipe'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27]],ko:['knockdown',36]},
 crocodile:{s:0.6,anims:{"idle":[25,210,156,221,259],"walk_forward":[26,223,160,233,263],"walk_back":[26,223,160,233,263],"run":[26,223,160,233,263],"block":[17,217,160,224,265],"attack_light":[36,257,159,253,263],"bite":[40,287,164,225,270],"special_pounce":[59,262,166,283,275],"attack_heavy":[56,294,158,296,261,54],"uppercut":[56,294,158,296,261,54],"victory":[59,240,182,258,301],"jump":[27,241,161,232,266],"hit_light":[20,219,161,230,267],"hit_heavy":[20,219,161,230,267],"knockdown":[37,307,182,257,301],"knockdown_getup":[30,266,159,307,262],"defeat":[37,307,182,257,301],"special_b":[61,310,182,263,301,51],"finisher":[61,336,184,307,298,47],"ultra_move":[61,310,182,263,301,51],"sx2":[67,259,182,239,301,61],"sx1":[76,311,159,307,264,51]},
  double:['bite','attack_heavy'],special:'special_pounce',shadow:null,ultra:['bite','attack_heavy','bite','uppercut'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29]],ko:['knockdown',36]},
 elephant:{s:0.6,anims:{"idle":[23,211,206,193,342],"walk_forward":[37,192,213,197,351],"walk_back":[37,192,213,197,351],"run":[37,192,213,197,351],"block":[17,215,196,198,324],"attack_light":[22,206,207,197,343],"bite":[40,271,210,238,348],"special_pounce":[72,302,221,203,363,52],"attack_heavy":[56,273,199,231,330],"uppercut":[56,273,199,231,330],"victory":[54,247,219,239,363],"jump":[24,213,215,184,355],"hit_light":[20,251,220,198,363],"hit_heavy":[20,251,220,198,363],"knockdown":[32,386,220,342,363],"knockdown_getup":[30,290,200,251,324],"defeat":[32,386,220,342,363],"special_b":[70,340,200,374,332,47],"finisher":[61,304,220,294,363,52],"ultra_move":[70,340,200,374,332,47],"sx2":[76,235,216,222,357,68],"sx1":[76,296,202,278,335,54]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','attack_heavy','uppercut'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29]],ko:['knockdown',31]},
 grizzly:{s:0.6,anims:{"idle":[38,141,192,95,318],"walk_forward":[32,156,190,114,314],"walk_back":[32,156,190,114,314],"run":[32,156,190,114,314],"block":[17,156,186,105,309],"attack_light":[34,180,188,97,311],"bite":[40,178,185,115,307],"special_pounce":[49,229,222,94,359],"attack_heavy":[54,206,217,138,359],"uppercut":[54,206,217,138,359],"victory":[50,176,206,138,342],"jump":[32,161,208,56,346],"hit_light":[20,259,217,99,359],"hit_heavy":[20,259,217,99,359],"knockdown":[41,343,196,244,324],"knockdown_getup":[25,214,190,224,316],"defeat":[41,343,196,244,324],"special_b":[69,269,201,115,326,59],"finisher":[61,149,217,106,359],"ultra_move":[69,269,201,115,326,59],"sx2":[72,203,198,110,329],"sx3":[76,162,197,117,327],"sx1":[59,158,217,90,359]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','attack_heavy','bite','uppercut'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]],ko:['knockdown',40]},
 hippo:{s:0.6,anims:{"idle":[20,213,192,167,319],"walk_forward":[32,206,210,162,348],"walk_back":[32,206,210,162,348],"run":[32,206,210,162,348],"block":[17,228,198,187,329],"attack_light":[25,223,193,190,320],"bite":[40,266,198,180,327],"special_pounce":[47,256,216,186,359],"attack_heavy":[30,301,219,195,362],"uppercut":[30,301,219,195,362],"victory":[61,241,219,167,363],"jump":[32,197,219,141,362],"hit_light":[17,332,219,216,362],"hit_heavy":[17,332,219,216,362],"knockdown":[26,381,221,297,362],"knockdown_getup":[40,298,212,286,351],"defeat":[26,381,221,297,362],"special_b":[70,251,219,209,362,63],"finisher":[61,325,217,204,353,49],"ultra_move":[70,251,219,209,362,63],"sx2":[76,283,220,228,363,56],"sx1":[56,212,220,144,363],"sx3":[76,244,208,167,343,65]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','attack_heavy','uppercut'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39]],ko:['knockdown',25]},
 hyena:{s:0.6,anims:{"idle":[33,113,143,101,237],"walk_forward":[29,112,149,83,247],"walk_back":[29,112,149,83,247],"run":[29,112,149,83,247],"block":[17,102,145,88,240],"attack_light":[50,120,145,82,240],"bite":[40,133,146,87,241],"special_pounce":[40,180,145,100,240],"attack_heavy":[56,146,167,107,276],"uppercut":[56,146,167,107,276],"victory":[58,110,168,82,276],"jump":[48,108,166,82,275],"hit_light":[12,130,141,137,234],"hit_heavy":[12,130,141,137,234],"knockdown":[49,279,157,208,257],"knockdown_getup":[23,164,148,191,241],"defeat":[49,279,157,208,257],"special_b":[70,186,162,92,256],"finisher":[61,232,156,131,257],"ultra_move":[70,186,162,92,256],"sx2":[76,182,145,126,240],"sx1":[76,109,152,82,252]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['bite','attack_heavy','uppercut','attack_light'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]],ko:['knockdown',48]},
 jaguar:{s:0.6,anims:{"idle":[26,164,153,117,252],"walk_forward":[25,163,155,112,256],"walk_back":[25,163,155,112,256],"run":[25,163,155,112,256],"block":[17,262,167,148,276],"attack_light":[50,207,151,112,250],"bite":[33,244,151,118,250],"special_pounce":[68,235,154,125,252],"attack_heavy":[56,230,165,124,273],"uppercut":[56,230,165,124,273],"victory":[39,171,172,120,285],"jump":[28,174,169,126,279],"hit_light":[20,290,166,196,276],"hit_heavy":[20,290,166,196,276],"knockdown":[39,309,156,227,252],"knockdown_getup":[28,232,158,226,256],"defeat":[39,309,156,227,252],"special_b":[70,218,172,157,285],"finisher":[61,305,178,221,285,52],"ultra_move":[70,218,172,157,285],"sx2":[56,204,151,131,250],"sx1":[67,218,153,135,253]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','uppercut','attack_light'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27]],ko:['knockdown',38]},
 leopard:{s:0.6,anims:{"idle":[32,165,157,119,261],"walk_forward":[24,171,163,136,270],"walk_back":[24,171,163,136,270],"run":[24,171,163,136,270],"dash":[24,171,163,136,270],"crouch":[6,128,155,102,256],"block":[17,169,160,122,265],"attack_light":[50,180,153,108,254],"bite":[35,195,153,100,254],"special_pounce":[72,263,175,133,287,60],"special_b":[70,228,163,134,270],"special_c":[72,263,175,133,287,60],"special_d":[56,199,164,89,273],"ultra_move":[70,228,163,134,270],"attack_heavy":[56,199,164,89,273],"uppercut":[56,199,164,89,273],"victory":[60,160,173,115,287],"jump":[27,196,173,153,284],"hit_light":[20,161,162,117,269],"hit_heavy":[20,161,162,117,269],"knockdown":[46,291,158,180,252],"knockdown_getup":[25,193,162,170,267],"defeat":[46,291,158,180,252],"finisher":[61,275,166,153,264,58],"sx2":[76,202,173,105,287],"sx3":[76,248,152,107,252,64],"sx1":[44,245,158,119,261]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','special_d','attack_heavy','uppercut'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]],ko:['knockdown',45]},
 dolphin:{s:0.6,anims:{"attack_light":[50,196,176,149,289],"hit_light":[20,279,198,168,328],"hit_heavy":[20,279,198,168,328],"walk_forward":[39,200,184,155,301],"walk_back":[39,200,184,155,301],"run":[39,200,184,155,301],"bite":[26,184,180,141,298],"knockdown":[35,366,204,313,328],"defeat":[35,366,204,313,328],"jump":[25,209,196,193,322],"block":[17,184,176,142,291],"attack_heavy":[56,249,192,213,317],"uppercut":[56,249,192,213,317],"idle":[27,186,175,146,289],"victory":[61,214,199,171,328],"knockdown_getup":[24,280,184,313,301],"special_pounce":[45,263,171,175,283],"special_b":[45,263,171,175,283],"sx2":[70,238,198,149,328,67],"sx3":[69,206,205,132,328],"sx1":[52,257,186,197,305],"finisher":[61,245,206,166,328]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','uppercut','attack_light'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]],ko:['knockdown',34]},
 lion:{s:0.6,anims:{"idle":[29,124,162,110,268],"walk_forward":[23,130,166,97,275],"walk_back":[23,130,166,97,275],"run":[23,130,166,97,275],"block":[17,137,162,104,267],"attack_light":[50,159,160,95,265],"bite":[40,147,158,95,261],"special_pounce":[62,292,161,239,259,54],"attack_heavy":[42,164,170,84,282],"uppercut":[42,164,170,84,282],"victory":[61,124,164,88,271],"jump":[29,131,181,95,299],"hit_light":[20,244,182,190,302],"hit_heavy":[20,244,182,190,302],"knockdown":[36,307,183,219,302],"knockdown_getup":[26,186,164,213,267],"defeat":[36,307,183,219,302],"special_b":[70,211,182,111,302],"finisher":[61,247,183,134,298],"ultra_move":[70,211,182,111,302],"sx2":[76,143,183,94,302],"sx1":[76,163,161,94,268]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','uppercut','attack_light'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]],ko:['knockdown',35]},
 tiger:{s:0.6,anims:{"idle":[28,147,162,113,268],"walk_forward":[25,154,171,120,283],"walk_back":[25,154,171,120,283],"run":[25,154,171,120,283],"block":[17,162,168,128,277],"attack_light":[50,198,162,128,267],"bite":[40,215,160,120,265],"special_pounce":[62,248,183,179,300],"attack_heavy":[39,169,179,109,296],"uppercut":[39,169,179,109,296],"victory":[61,164,180,117,298],"jump":[54,151,179,113,296],"hit_light":[20,274,172,164,285],"hit_heavy":[20,274,172,164,285],"knockdown":[37,218,178,205,293],"knockdown_getup":[30,190,175,193,286],"defeat":[37,218,178,205,293],"special_b":[47,154,183,111,302],"finisher":[61,201,171,162,284],"ultra_move":[47,154,183,111,302],"sx2":[71,221,164,147,272],"sx3":[76,181,177,135,280],"sx1":[76,187,182,121,301]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['attack_heavy','attack_light','attack_heavy','uppercut'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29]],ko:['knockdown',36]},
 wolf:{s:0.6,anims:{"idle":[27,131,148,107,245],"walk_forward":[25,154,152,116,252],"walk_back":[25,154,152,116,252],"run":[25,154,152,116,252],"block":[16,140,149,107,247],"attack_light":[29,160,145,92,241],"bite":[40,156,147,113,244],"special_pounce":[69,199,136,114,226],"attack_heavy":[53,226,161,102,267],"uppercut":[53,226,161,102,267],"victory":[49,129,168,103,279],"jump":[35,134,168,112,279],"hit_light":[17,138,154,119,255],"hit_heavy":[17,138,154,119,255],"knockdown":[39,286,168,203,279],"knockdown_getup":[29,162,151,135,251],"defeat":[39,286,168,203,279],"finisher":[61,185,154,122,256],"special_b":[57,184,168,149,279],"ultra_move":[57,184,168,149,279],"sx2":[76,166,147,103,244],"sx1":[76,141,161,109,267]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['attack_light','attack_heavy','uppercut','bite'],
  fall:['knockdown',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]],getup:['knockdown_getup',[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]],ko:['knockdown',38]}
};
const FIN_DUR=3,FIN_GAP=150;function finDur(f){const h=typeof SPRITES_HD!=='undefined'&&SPRITES_HD[f.data.id];return h&&h.anims&&h.anims.finisher?FIN_DUR:0}
const VFPS={eagle:{idle:10,knockdown:20,victory:12,hit:36,block:40},wolf:{idle:12,knockdown:20,victory:12,hit:36,block:40},lion:{idle:12,knockdown:20,victory:12,hit:36,block:40},tiger:{idle:12,knockdown:20,victory:12,hit:36,block:40},jaguar:{idle:12,knockdown:20,victory:12,hit:36,block:40},leopard:{idle:12,knockdown:20,victory:12,hit:36,block:40},grizzly:{idle:12,knockdown:20,victory:12,hit:36,block:40},badger:{idle:12,knockdown:20,victory:12,hit:36,block:40},hyena:{idle:12,knockdown:20,victory:12,hit:36,block:40},crocodile:{idle:12,knockdown:20,victory:12,hit:36,block:40},elephant:{idle:12,knockdown:20,victory:12,hit:36,block:40},hippo:{idle:12,knockdown:20,victory:12,hit:36,block:40},snake:{idle:12,knockdown:20,victory:12,hit:36,block:40},stag:{idle:12,knockdown:20,victory:12,hit:36,block:40},majic:{idle:12,knockdown:20,victory:12,hit:36,block:40},dolphin:{idle:12,knockdown:20,victory:12,hit:36,block:40}}; // video-made animations: playback frames per second
const SPRITE_X2={"lion":{},"tiger":{},"jaguar":{},"wolf":{},"hyena":{},"badger":{"crouch":1},"grizzly":{},"crocodile":{},"hippo":{},"elephant":{},"leopard":{"crouch":1},"snake":{"crouch":1},"eagle":{"crouch":1},"stag":{"crouch":1},"majic":{"crouch":1},"dolphin":{}}; // sheets with generated in-between frames (2x)
// Fighter frames load only when a fighter is first needed (highlighted on select, or in a fight), not all 15 at start-up.
const spriteImg=new Proxy({},{get(t,id){if(!(id in t)&&typeof id==='string'&&SPRITES[id]){t[id]={};for(const k in SPRITES[id].anims){const im=new Image();im.decoding='async';im.src='assets/characters/'+id+'/frames/'+k+'.webp?v=15.7';t[id][k]=im}}return t[id]}});
function spritesReady(id){const a=spriteImg[id];if(!a)return true;const idle=a.idle||a[Object.keys(a)[0]];return !!(idle&&idle.complete&&idle.naturalWidth)}
// High-detail art for big, sharp screens (laptops, TVs, 4K): loaded per fight, only for the two fighters in it.
const HD=typeof SPRITES_HD!=='undefined'?SPRITES_HD:{},spriteHD={};
function wantHD(){const r=$('game-canvas').getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,3);return r.height*d>=560}
// Phones and tablets get phone-size sheets (frames-md: ~1/5 the memory, every sheet <= 4096 px) instead of the full HD art.
const HDT={};// Lighter sheets for everyone on GRAPHICS: AUTO (looks the same on normal screens); full HD art only with GRAPHICS: SHARP.
function phoneArt(){return GFX!=='sharp'}
function loadHD(id){if(!HD[id]||spriteHD[id])return;spriteHD[id]={};const md=phoneArt()&&typeof SPRITES_MD!=='undefined'&&SPRITES_MD[id];HDT[id]=md||HD[id];
 const cache={};for(const k in HDT[id].anims){const file=md?(md.files[k]||k):k;if(!cache[file]){const im=new Image();im.decoding='async';im.src='assets/characters/'+id+(md?'/frames-md/':'/frames-hd/')+file+(md?'.webp?v=15.54':'.webp?v=15.54');cache[file]=im;if(md&&/^(idle|walk_forward|attack_light|attack_heavy|hit_light|hit_heavy|block|jump|bite)$/.test(k)&&im.decode)im.decode().catch(()=>{})}spriteHD[id][k]=cache[file]}}
const c=$('game-canvas').getContext('2d',{alpha:false})||$('game-canvas').getContext('2d');
function draw(){
 const canvas=$('game-canvas'),rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,3),w=1100,h=520;
 // Render at the screen's real pixel count, up to 4K (3840 x 2160).
 let pw=Math.max(1,Math.round(rect.width*dpr*RES.scale)),ph=Math.max(1,Math.round(rect.height*dpr*RES.scale));const cap=Math.min(1,3840/pw,2160/ph,(typeof GMcap==='function'?GMcap(pw,ph):1));pw=Math.round(pw*cap);ph=Math.round(ph*cap);
 if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph}
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,pw,ph);c.lineJoin='round';c.miterLimit=2;
 // ---- Fighting-game camera: fills any screen shape, follows the fighters, zooms in when they're close.
 const aspect=pw/ph,F=game.fighters,gap=Math.abs(F[0].x-F[1].x);
 let vh=Math.min(570,1210/aspect);                                    // largest view that stays inside the arena art
 // A restrained adaptive lens: tighten slightly when fighters close in,
 // widen when they spread out, and ease rather than snapping between scales.
 const want=clamp(1.02+(420-gap)/5200,.96,1.045);
 const kz=1-Math.pow(.94,frameDt*60),kp=1-Math.pow(.88,frameDt*60);
 cam.z+=(want-cam.z)*kz;vh/=cam.z;
 // Headroom for tall fighters (MAJIC, Elephant, Grizzly) and big jumps: pull the lens back just enough
 // to keep every head below the health bars. The arena art is enlarged around the floor to match.
 const vhBase=Math.min(570,1210/aspect);let tallest=0;for(const f of F)if(f._top!=null)tallest=Math.max(tallest,400-f._top);
 if(!cam.hudT||performance.now()-cam.hudT>600){cam.hudT=performance.now();try{const cr=canvas.getBoundingClientRect();let hb=0;for(const q of document.querySelectorAll('#fight .fight-hud,body.touch #fight .meter-row,#fight .majic-boss-hud:not(.hidden)')){const r=q.getBoundingClientRect();if(r.height&&r.top<cr.top+cr.height*.4)hb=Math.max(hb,r.bottom)}cam.hud=clamp((hb-cr.top)/cr.height,.06,.3)}catch(_){cam.hud=.14}}
 const vhNeed=Math.min(vhBase*1.6,(tallest+30)/(.84-(cam.hud||.14)));cam.vx=cam.vx||vh;const vxT=Math.max(vh,vhNeed);
 cam.vx+=(vxT-cam.vx)*(vxT>cam.vx?1-Math.pow(.8,frameDt*60):1-Math.pow(.95,frameDt*60));if(cam.snap)cam.vx=vxT;vh=Math.max(vh,cam.vx);
 const hudF=cam.hud||.14,akT=Math.max(1,vh/vhBase,(tallest+30+hudF*vh)/430);cam.ak=cam.ak||akT;cam.ak+=(akT-cam.ak)*(akT>cam.ak?1-Math.pow(.8,frameDt*60):1-Math.pow(.95,frameDt*60));if(cam.snap)cam.ak=akT;
 const artK=Math.max(1,vh/vhBase,cam.ak);cam.artK=artK;
 // Frost Fatality lens: push toward the frozen opponent, hold through the crack,
 // then pull back as the ice bursts apart. This changes only the camera framing.
 const frostVictim=game.koBurst?.frost&&game.ko>0?F.find(f=>f.hp<=0):null;
 let cameraEase=kp;
 if(frostVictim){
  const elapsed=2.2-game.ko;
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
  const push=smooth(elapsed/.48),pull=smooth((elapsed-.78)/.52);
  const cineZoom=1+.17*push*(1-pull);
  vh/=cineZoom;cameraEase=1-Math.pow(.78,frameDt*60);
 }
 const vw=vh*aspect;
 const air=Math.min(F[0].y,F[1].y); // follow the highest fighter without losing floor context
 const airFollow=clamp(-air/420,0,1);
 let tx=(F[0].x+F[1].x)/2-vw/2,ty=400-vh*.84+Math.min(0,air)*(.5+.12*airFollow);
 if(frostVictim){
  // Keep the defeated fighter just off-center so the frozen silhouette remains the focus.
  tx=frostVictim.x-vw*.57;ty=(400+frostVictim.y-145)-vh*.48;
 }
 if(!frostVictim)ty=Math.min(ty,400-tallest-30-hudF*vh);
 tx=Math.max(550-610*artK,Math.min(550+610*artK-vw,tx));ty=Math.max(400-430*artK,Math.min(400+150*artK-vh,ty));
 if(cam.snap){cam.x=tx;cam.y=ty;cam.snap=false}else{cam.x+=(tx-cam.x)*cameraEase;cam.y+=(ty-cam.y)*cameraEase}
 const sc=ph/vh;c.setTransform(sc,0,0,sc,-cam.x*sc,-cam.y*sc);
 if(game.shake>0)c.translate((Math.random()-.5)*22*Math.min(1,game.shake/.3),(Math.random()-.5)*14*Math.min(1,game.shake/.3));
 if(typeof camTilt==='function')camTilt(vw,vh);
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 const t=performance.now()/1000;
 const bgi=arenaImg[arena.id];
 if(bgi&&bgi.complete&&bgi.naturalWidth){if(TILT.cur){const U=1.45;c.drawImage(bgi,550-610*artK*U,400-140*artK-290*artK*U,1220*artK*U,580*artK*U)} // fills the corners while the camera is tilted
  c.drawImage(bgi,550-610*artK,400-430*artK,1220*artK,580*artK);
  // soft vignette + floor shade so fighters stay readable on bright stages
  const vy0=400-430*artK,vy1=400+150*artK,vg=c.createLinearGradient(0,vy0,0,vy1);vg.addColorStop(0,'rgba(0,0,0,.35)');vg.addColorStop(.35,'rgba(0,0,0,.05)');vg.addColorStop(.75,'rgba(0,0,0,.08)');vg.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=vg;c.fillRect(550-610*artK,vy0,1220*artK,vy1-vy0);
  // flicker on the braziers
  c.globalAlpha=.02+Math.random()*.025;c.fillStyle='#ffb04a';c.fillRect(550-610*artK,400-430*artK,1220*artK,580*artK);c.globalAlpha=1;
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
 // Subtle atmospheric depth: slow drifting motes at staggered depths sit
 // between the arena artwork and fighters. They remain cosmetic and cheap.
 {
  const atmosphere=arena.id==='royal-colosseum'?'#b58cff':arena.id==='tidal-kingdom'?'#9fe8ff':arena.id==='frozen-kingdom'?'#c9efff':'#e7c78a';
  for(let n=0;n<24;n++){
   const depth=.35+(n%5)*.13;
   const x=((n*173+t*(8+(n%4)*3)*depth)%1220)-60;
   const baseY=42+(n*67)%320;
   const y=baseY+Math.sin(t*.55+n*1.7)*7;
   const r=.7+(n%3)*.45;
   c.globalAlpha=.055+(n%4)*.012;
   c.fillStyle=atmosphere;c.beginPath();c.arc(x,y,r*depth,0,Math.PI*2);c.fill();
  }
  c.globalAlpha=1;
  const haze=c.createLinearGradient(0,275,0,410);
  haze.addColorStop(0,'rgba(210,220,205,0)');
  haze.addColorStop(1,'rgba(210,220,205,.055)');
  c.fillStyle=haze;c.fillRect(-60,260,w+120,160);
 }
 // MAJIC's Lair evolves with the final boss: the arena itself reacts to each awakening.
 if(arena.lair&&tower&&tower.boss){
  const boss=game.fighters.find(f=>f.data.id==='majic');
  const phase=boss?Math.max(1,boss.bossPhase||1):1;
  if(phase>=2){
   c.save();c.globalCompositeOperation='screen';
   const pulse=.5+.5*Math.sin(t*2.1);
   c.globalAlpha=phase===2?.075:.12+.035*pulse;
   const wash=c.createLinearGradient(0,0,0,520);
   wash.addColorStop(0,phase===2?'rgba(120,55,180,.12)':'rgba(92,35,155,.30)');
   wash.addColorStop(.68,'rgba(20,10,55,.02)');
   wash.addColorStop(1,phase===2?'rgba(130,75,210,.15)':'rgba(100,45,190,.28)');
   c.fillStyle=wash;c.fillRect(-60,-30,1220,560);
   // Elemental fractures spread across the floor in phase II.
   c.globalAlpha=phase===2?.38:.55;
   for(let n=0;n<9;n++){
    const x=95+n*118+Math.sin(t*.7+n)*7;
    c.strokeStyle=phase===2?['#b58cff','#f2bd69','#8de0d0'][n%3]:'#bd9cff';
    c.shadowColor=c.strokeStyle;c.shadowBlur=phase===2?9:15;c.lineWidth=phase===2?1.8:2.6;
    c.beginPath();c.moveTo(x,398);c.lineTo(x+Math.sin(n*4)*18,424);c.lineTo(x-13,447);c.lineTo(x+Math.cos(n)*22,478);c.stroke();
   }
   // True Titan tears open an eclipsed sky and suspends spectral stones above the arena.
   if(phase>=3){
    c.globalAlpha=.42+.08*pulse;c.fillStyle='#10051f';c.beginPath();c.arc(550,92,78+Math.sin(t*1.4)*3,0,Math.PI*2);c.fill();
    c.globalAlpha=.7;c.strokeStyle='#b99aff';c.shadowColor='#a77aff';c.shadowBlur=24;c.lineWidth=3;
    c.beginPath();c.arc(550,92,96+Math.sin(t*1.8)*5,0,Math.PI*2);c.stroke();
    c.globalAlpha=.5;c.strokeStyle='#8de0d0';c.lineWidth=1.5;c.beginPath();c.arc(550,92,112+Math.sin(t*1.1)*4,0,Math.PI*2);c.stroke();
    for(let n=0;n<7;n++){
     const x=105+n*148+Math.sin(t*1.25+n*1.7)*12;
     const y=145+Math.sin(t*1.7+n)*20;
     c.save();c.translate(x,y);c.rotate(t*.45+n);
     c.globalAlpha=.38+.2*pulse;c.fillStyle=n%2?'#a98aff':'#72dcca';c.shadowColor=c.fillStyle;c.shadowBlur=18;
     c.beginPath();c.moveTo(0,-12);c.lineTo(9,-3);c.lineTo(6,12);c.lineTo(-7,8);c.lineTo(-10,-4);c.closePath();c.fill();c.restore();
    }
   }
   c.restore();
  }
 }
 // Ultra / Instinct darken the stage so the fighters pop.
 const dim=game.ultra?.55:game.fighters.some(f=>f.instinct)?.18:0;if(dim){c.fillStyle=`rgba(10,0,20,${dim})`;c.fillRect(-60,-60,w+120,h+120)}
 drawStains();
 game.fighters.forEach((f,i)=>{f.trail.forEach(p=>{c.save();c.globalAlpha=p.t*1.2;c.filter=p.frost?'brightness(1.35) saturate(.75) hue-rotate(155deg)':'hue-rotate(220deg) saturate(3)';if(p.frost){c.shadowColor='rgba(105,225,255,.95)';c.shadowBlur=22;}drawFighter({...f,x:p.x,y:p.y,dir:p.dir,hitFlash:0,trail:[]},i,true);c.restore()})});
 game.fighters.forEach((f,i)=>drawFighter(f,i));
 // Frost Fatality cinematic: briefly encase the defeated fighter in an icy silhouette,
 // then break the shell into outward-flying crystal shards.
 if(game.koBurst?.frost&&game.ko>0){
  const elapsed=2.2-game.ko;
  const victimIndex=game.fighters.findIndex(f=>f.hp<=0);
  if(victimIndex>=0){
   const victim=game.fighters[victimIndex];
   if(elapsed<.66){
    const freeze=1-clamp(elapsed/.66,0,1);
    c.save();c.globalAlpha=.68*freeze;c.filter='brightness(1.8) saturate(.55) hue-rotate(145deg)';
    drawFighter({...victim,hitFlash:0,trail:[]},victimIndex,true);c.restore();
   }
   const shatter=clamp((elapsed-.42)/.72,0,1);
   if(shatter>0){
    c.save();c.globalCompositeOperation='lighter';
    for(let shard=0;shard<12;shard++){
     const a=shard*Math.PI/6+elapsed*1.8;
     const travel=shatter*(28+(shard%4)*17);
     const sx=victim.x+Math.cos(a)*travel,sy=400+victim.y-145+Math.sin(a)*travel*.72;
     c.globalAlpha=(1-shatter)*.85;c.strokeStyle=shard%2?'#baf6ff':'#62dcff';
     c.shadowColor='#79eaff';c.shadowBlur=12;c.lineWidth=2.5;
     c.beginPath();c.moveTo(sx-Math.cos(a)*8,sy-Math.sin(a)*8);c.lineTo(sx+Math.cos(a)*8,sy+Math.sin(a)*8);c.stroke();
    }
    c.restore();
   }
  }
 }
 drawFx();
 if(game.koBurst&&game.ko>0){
  const elapsed=2.2-game.ko;
  const pulse=clamp(elapsed/.72,0,1);
  const radius=38+pulse*245;
  c.save();c.globalAlpha=(1-pulse)*.7;c.strokeStyle=game.koBurst.frost?'#9cefff':'#ffcf78';c.lineWidth=8*(1-pulse)+1;
  c.beginPath();c.ellipse(game.koBurst.x,game.koBurst.y,radius,radius*.42,0,0,Math.PI*2);c.stroke();
  c.globalAlpha=(1-pulse)*.18;c.fillStyle=game.koBurst.frost?'#9cefff':'#ffcf78';
  c.beginPath();c.ellipse(game.koBurst.x,game.koBurst.y,radius*.72,radius*.3,0,0,Math.PI*2);c.fill();
  c.restore();
 }
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
  else if(p.kind==='titanWave'){const progress=Math.max(0,p.t/p.life),radius=30+progress*1160;c.globalAlpha=Math.max(0,k)*.9;c.strokeStyle=p.color;c.lineWidth=13*k+1;c.shadowColor=p.color;c.shadowBlur=24;c.beginPath();c.ellipse(p.x,400,radius,13+progress*18,0,0,Math.PI*2);c.stroke();c.shadowBlur=0}
  else if(p.kind==='text'){if(game.banner&&game.banner.text===p.text)continue;c.globalAlpha=Math.min(1,k*2);c.font='900 22px Impact,"Barlow Condensed",sans-serif';c.textAlign='center';c.lineWidth=5;c.strokeStyle='#000';c.strokeText(p.text,p.x,p.y);c.fillStyle=p.color;c.fillText(p.text,p.x,p.y)}
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
 const big=/^(ROUND|FIGHT|K\.O|TIME|DRAW|FINAL|PERFECT|ULTRA|FROST FATALITY|MAJIC$|.*WINS)/.test(b.text);
 c.save();c.translate(550,big?235:118);c.scale(s*(big?1:.5),s*(big?1:.5));c.globalAlpha=a;c.textAlign='center';
 // Thin metallic rails and a moving glint give round/KO banners a compact
 // championship presentation without obscuring the action.
 const railW=Math.min(460,Math.max(170,b.text.length*19));
 c.globalAlpha=a*.72;c.lineWidth=2;c.strokeStyle=b.color;
 c.beginPath();c.moveTo(-railW,-28);c.lineTo(-railW+28,-28);c.moveTo(railW-28,-28);c.lineTo(railW,-28);c.stroke();
 const sweep=((b.t*310)%(railW*2))-railW;
 c.globalAlpha=a*.34;c.fillStyle=b.color;c.fillRect(sweep-1,-34,2,7);
 c.globalAlpha=a;c.font='900 84px Impact,"Barlow Condensed",sans-serif';c.lineWidth=12;c.strokeStyle='#000';c.strokeText(b.text,0,0);
 const g=c.createLinearGradient(0,-70,0,10);g.addColorStop(0,'#ffffff');g.addColorStop(.5,b.color);g.addColorStop(1,'#7a2b00');c.fillStyle=g;c.shadowColor=b.color;c.shadowBlur=30;c.fillText(b.text,0,0);c.shadowBlur=0;
 if(b.sub){c.font='900 26px Impact,"Barlow Condensed",sans-serif';c.lineWidth=6;c.strokeText(b.sub,0,40);c.fillStyle='#fff3cf';c.fillText(b.sub,0,40)}
 c.globalAlpha=a*.72;c.lineWidth=2;c.strokeStyle=b.color;c.beginPath();c.moveTo(-railW,54);c.lineTo(-railW+28,54);c.moveTo(railW-28,54);c.lineTo(railW,54);c.stroke();
 c.restore();
}
function drawFighter(f,i,ghost){
 const x=f.x,y=400+f.y;c.save();c.translate(x,y);c.scale(f.dir,1);
 const sizeScale={badger:.70,wolf:.82,hyena:.80,leopard:.86,jaguar:.86,crocodile:.90,lion:.88,tiger:.86,grizzly:.98,hippo:1.00,elephant:1.08,majic:1.4,snake:.86,eagle:.9,stag:.92,dolphin:.9}[f.data.id]||.84;
 if(!ghost){
  // MAJIC's True Titan Form creates a distinct supernatural silhouette, not just a stronger aura.
  if(f.data.id==='majic'&&((f.ascendantT||0)>.025||(f.bossPhase||1)>=3)){
   const t=f.ascendantT,pulse=.78+Math.sin((8.5-t)*13)*.18,fade=clamp(Math.min(t,1.1)*1.4,0,1);
   c.save();c.globalAlpha=fade*pulse;
   const halo=c.createRadialGradient(0,-160,18,0,-160,205*sizeScale);
   halo.addColorStop(0,'rgba(196,158,255,.32)');halo.addColorStop(.52,'rgba(113,76,180,.22)');halo.addColorStop(1,'rgba(113,76,180,0)');
   c.fillStyle=halo;c.beginPath();c.ellipse(0,-158,178*sizeScale,215*sizeScale,0,0,Math.PI*2);c.fill();
   // Crown-like antler horns and spectral shoulder wings frame the transformed panther.
   c.lineCap='round';c.lineJoin='round';c.strokeStyle='#e8c56b';c.shadowColor='#c5a0ff';c.shadowBlur=20;c.lineWidth=7*sizeScale;
   c.beginPath();c.moveTo(-38,-278);c.quadraticCurveTo(-78,-338,-92,-382);c.quadraticCurveTo(-58,-362,-34,-324);c.moveTo(38,-278);c.quadraticCurveTo(78,-338,92,-382);c.quadraticCurveTo(58,-362,34,-324);c.stroke();
   c.strokeStyle='#bba0ff';c.lineWidth=5*sizeScale;
   for(let side of [-1,1]){c.beginPath();c.moveTo(side*48,-190);c.quadraticCurveTo(side*132,-260,side*166,-300);c.quadraticCurveTo(side*144,-228,side*102,-164);c.stroke();c.beginPath();c.moveTo(side*70,-156);c.quadraticCurveTo(side*154,-188,side*178,-222);c.stroke()}
   c.shadowBlur=0;
   const sigils=['#f3c45d','#9edce5','#b6d98b','#a8d66d','#f0a34e','#b9f6ff'];
   sigils.forEach((color,n)=>{const a=(8.5-t)*1.15+n*Math.PI/3,px=Math.cos(a)*112*sizeScale,py=-158+Math.sin(a)*136*sizeScale;c.globalAlpha=fade*pulse*.9;c.fillStyle=color;c.shadowColor=color;c.shadowBlur=13;c.beginPath();c.arc(px,py,4.5+Math.sin(a*2)*1.4,0,Math.PI*2);c.fill()});
   c.restore();
  }
  // Phase III's Void Guard wraps MAJIC in a brief layered shield after a successful parry.
  if(f.data.id==='majic'&&(f.majicVoidGuardT||0)>.025){
   const q=f.majicVoidGuardT/.9,pulse=.78+Math.sin((.9-f.majicVoidGuardT)*24)*.16;
   c.save();c.globalAlpha=clamp(q*1.25,0,.88)*pulse;c.lineWidth=4*sizeScale;c.shadowBlur=18;c.shadowColor='#b99cff';
   c.strokeStyle='#b99cff';c.beginPath();c.ellipse(0,-155,112*sizeScale,166*sizeScale,0,0,Math.PI*2);c.stroke();
   c.strokeStyle='#8de0d0';c.lineWidth=2.5*sizeScale;c.beginPath();c.ellipse(0,-155,126*sizeScale,178*sizeScale,0,Math.PI,Math.PI*2);c.stroke();
   c.shadowBlur=0;c.restore();
  }
  // MAJIC's Jungle Rage gathers visual energy from the roster's elemental colors.
  if(f.data.id==='majic'&&(f.jungleRageT||0)>.025){
   const rage=f.jungleRageT/7.5,pulse=.72+Math.sin((7.5-f.jungleRageT)*11)*.16;
   c.save();c.globalAlpha=clamp(rage*1.15,0,.9)*pulse;
   const aura=c.createRadialGradient(0,-150,24,0,-150,176*sizeScale);
   aura.addColorStop(0,'rgba(197,160,255,.28)');aura.addColorStop(.48,'rgba(117,210,174,.16)');aura.addColorStop(1,'rgba(117,210,174,0)');
   c.fillStyle=aura;c.beginPath();c.ellipse(0,-150,150*sizeScale,190*sizeScale,0,0,Math.PI*2);c.fill();
   const colors=['#f3c45d','#9edce5','#b6d98b','#a8d66d','#f0a34e','#b9f6ff'];
   colors.forEach((color,n)=>{const a=(7.5-f.jungleRageT)*1.8+n*Math.PI/3,rx=88*sizeScale,ry=112*sizeScale;const px=Math.cos(a)*rx,py=-150+Math.sin(a)*ry;
    c.globalAlpha=clamp(rage*1.25,0,.88)*pulse;c.strokeStyle=color;c.shadowColor=color;c.shadowBlur=12;c.lineWidth=3;
    c.beginPath();c.arc(px,py,13+Math.sin(a*2)*3,0,Math.PI*1.55);c.stroke();c.fillStyle=color;c.beginPath();c.arc(px,py,3.5,0,Math.PI*2);c.fill();});
   c.restore();
  }
  // MAJIC's base Shadow Panther presence: restrained violet energy follows his natural silhouette.
  // The aura intensifies with boss phases without changing his underlying animal anatomy.
  if(f.data.id==='majic'&&tower&&tower.boss){
   const phase=Math.max(1,Math.min(3,f.bossPhase||1)),time=performance.now()/1000,move=Math.min(1,Math.abs(f.moveVel||f.move||0)/220);
   c.save();c.globalCompositeOperation='lighter';
   const pulse=.5+.5*Math.sin(time*(phase===1?2.2:phase===2?3.5:5.2));
   const alpha=(phase===1?.12:phase===2?.19:.25)*(1+move*.35);
   const aura=c.createRadialGradient(0,-150,54,0,-150,190*sizeScale);
   aura.addColorStop(0,`rgba(126,78,190,${alpha})`);aura.addColorStop(.58,`rgba(95,54,155,${alpha*.55})`);aura.addColorStop(1,'rgba(95,54,155,0)');
   c.fillStyle=aura;c.beginPath();c.ellipse(0,-150,150*sizeScale,185*sizeScale,0,0,Math.PI*2);c.fill();
   // Small spectral paw sparks reinforce the panther identity rather than adding humanoid armor.
   for(let side of [-1,1]){const px=side*(phase===1?65:phase===2?78:90)*sizeScale,py=-14+Math.sin(time*4+side)*3;
    c.globalAlpha=(.22+pulse*.18)*(phase===1?1:1.35);c.fillStyle=phase===2?'#a6e7d1':'#c7a2ff';c.shadowColor=c.fillStyle;c.shadowBlur=10+phase*3;
    c.beginPath();c.ellipse(px,py,5+phase,2.5,side*.25,0,Math.PI*2);c.fill();}
   c.restore();
  }
  // Layered floor contact shadow and warm bounce light anchor the sprite to the arena.
  const lift=clamp((-f.y)/260,0,1),moving=Math.min(1,Math.abs(f.moveVel||f.move||0)/240);
  c.save();
  c.globalAlpha=.34*(1-lift*.78);
  c.fillStyle='#050403';c.shadowColor='#000';c.shadowBlur=5+lift*18;
  c.beginPath();c.ellipse(0,-f.y,58*sizeScale*(1+lift*.22),Math.max(3,10-lift*5),0,0,Math.PI*2);c.fill();
  c.shadowBlur=0;
  if(moving>.08&&f.ground){
   c.globalAlpha=.12*moving;
   const glow=c.createRadialGradient(0,-f.y,2,0,-f.y,76*sizeScale);
   glow.addColorStop(0,'rgba(244,190,104,.30)');glow.addColorStop(1,'rgba(244,190,104,0)');
   c.fillStyle=glow;c.beginPath();c.ellipse(0,-f.y,76*sizeScale,16,0,0,Math.PI*2);c.fill();
  }
  // A brief expanding floor ripple sells the weight of a landing.
  if((f.landImpact||0)>.025){
   const impact=f.landImpact;
   const radius=24+(1-impact)*10+(1-impact)*54;
   c.save();c.globalAlpha=impact*.42;
   c.strokeStyle=FIGHTER_IMPACT[f.data.id]||'#e8c36d';
   c.lineWidth=2+impact*3;
   c.beginPath();c.ellipse(0,-f.y,radius*sizeScale,radius*.22*sizeScale,0,0,Math.PI*2);c.stroke();
   c.restore();
  }
  // Tiger's low pounce carries two fast amber stripe trails through the leap.
  if(f.data.id==='tiger'&&(f.tigerPounceT||0)>.025){
   const rush=f.tigerPounceT/.62;
   c.save();c.globalAlpha=rush*.62;c.strokeStyle='#f0a34e';c.shadowColor='#d8752b';c.shadowBlur=14;c.lineWidth=3;
   for(let stripe=0;stripe<2;stripe++){const yy=-f.y-112-stripe*19,span=(62+stripe*17)*sizeScale;
    c.beginPath();c.moveTo(-f.dir*span*.65,yy+13);c.quadraticCurveTo(-f.dir*span*.12,yy-18,f.dir*span*.5,yy+2);c.stroke();}
   c.restore();
  }
  // Three jagged amber slashes mark Hyena's linked bite-and-claw finisher.
  if(f.data.id==='hyena'&&(f.hyenaFrenzyFinisher||0)>.025){
   const fin=f.hyenaFrenzyFinisher/.56;
   c.save();c.globalAlpha=fin*.9;c.strokeStyle='#d7b46a';c.shadowColor='#a85f32';c.shadowBlur=17;
   c.lineWidth=3+fin*2;
   for(let slash=0;slash<3;slash++){
    const yy=-f.y-112-slash*24,reach=(58+slash*13)*sizeScale;
    c.beginPath();c.moveTo(-f.dir*reach*.28,yy+16);c.lineTo(f.dir*reach*.12,yy-8);c.lineTo(f.dir*reach,yy+3);c.stroke();
   }
   c.restore();
  }
  // Three golden mane arcs mark the lion's linked triple-claw finisher.
  if(f.data.id==='lion'&&(f.lionManeFinisher||0)>.025){
   const fin=f.lionManeFinisher/.62;
   c.save();c.globalAlpha=fin*.9;c.strokeStyle='#ffd36b';c.shadowColor='#f3a82e';c.shadowBlur=18;
   c.lineWidth=3+fin*2;
   for(let slash=0;slash<3;slash++){
    const yy=-f.y-118-slash*25,reach=(62+slash*12)*sizeScale;
    c.beginPath();c.moveTo(-f.dir*reach*.3,yy+15);c.quadraticCurveTo(f.dir*reach*.12,yy-30,f.dir*reach,yy-5);c.stroke();
   }
   c.restore();
  }
  // A three-stroke icy arc marks the finish of the snow leopard's triple claw.
  if(f.data.id==='leopard'&&(f.leopardFinisher||0)>.025){
   const fin=f.leopardFinisher/.58;
   c.save();c.globalAlpha=fin*.88;c.strokeStyle='#b9f6ff';c.shadowColor='#55dfff';c.shadowBlur=16;
   c.lineWidth=3+fin*2;
   for(let slash=0;slash<3;slash++){
    const yy=-f.y-112-slash*23,reach=(54+slash*10)*sizeScale;
    c.beginPath();c.moveTo(-f.dir*reach*.25,yy+13);c.quadraticCurveTo(f.dir*reach*.15,yy-24,f.dir*reach,yy-4);c.stroke();
   }
   c.restore();
  }
  // River Rush leaves a low turquoise wake and two water arcs around the hippo's charge.
  if(f.data.id==='hippo'&&(f.hippoRushT||0)>.025){
   const rush=f.hippoRushT/.74,spread=(1-rush)*42;
   c.save();c.globalAlpha=rush*.52;c.strokeStyle='#9edce5';c.shadowColor='#58b7c9';c.shadowBlur=14;c.lineWidth=3;
   c.beginPath();c.ellipse(-f.dir*34,-f.y+7,(44+spread)*sizeScale,(12+spread*.12)*sizeScale,0,0,Math.PI*2);c.stroke();
   c.globalAlpha=rush*.42;c.lineWidth=2;
   for(let arc=0;arc<2;arc++){const y=-f.y-18-arc*15,span=(58+arc*18)*sizeScale;
    c.beginPath();c.moveTo(-f.dir*18,y+12);c.quadraticCurveTo(f.dir*span*.45,y-20,f.dir*span,y+2);c.stroke();}
   c.restore();
  }
  // A forward-curving trunk-sweep accent gives the elephant's close attacks a distinct visual read.
  if(f.data.id==='elephant'&&f.attack>0&&['claw','double','attack_heavy','bite'].includes(f.action)){
   const duration=Math.max(.12,(f.move_&&f.move_.t)||.3),phase=clamp((f.elapsed||0)/duration,0,1);
   const sweep=Math.sin(phase*Math.PI),reach=(f.action==='attack_heavy'?104: f.action==='bite'?86:72)*sizeScale;
   if(sweep>.12){
    c.save();c.globalAlpha=sweep*.52;c.strokeStyle='#e6ddc9';c.shadowColor='#d2c3a5';c.shadowBlur=12;c.lineWidth=f.action==='attack_heavy'?5:3;
    for(let arc=0;arc<2;arc++){
     const y=-132-arc*13,span=reach+arc*17;
     c.beginPath();c.moveTo(14,y+18);c.quadraticCurveTo(span*.48,y-30,span,y+4);c.stroke();
    }
    c.restore();
   }
  }
  // Titan Stomp builds a low dust-and-pressure ring beneath the elephant during its charge.
  if(f.data.id==='elephant'&&(f.elephantStompT||0)>.025){
   const charge=f.elephantStompT/.9,spread=(1-charge)*38;
   c.save();c.globalAlpha=charge*.42;c.strokeStyle='#d7d0bd';c.shadowColor='#b8aa91';c.shadowBlur=10;c.lineWidth=2+charge*2;
   c.beginPath();c.ellipse(0,-f.y+4,(40+spread)*sizeScale,(9+spread*.12)*sizeScale,0,0,Math.PI*2);c.stroke();
   c.restore();
  }
  // A low dust wake and tusk-forward glint mark Elephant's armored Titan Charge.
  if(f.data.id==='elephant'&&(f.elephantChargeT||0)>.025){
   const charge=f.elephantChargeT/.68;
   c.save();c.globalAlpha=charge*.48;c.strokeStyle='#e8dcc5';c.shadowColor='#d4c3a4';c.shadowBlur=15;c.lineWidth=3;
   c.beginPath();c.ellipse(-f.dir*30,-f.y+5,(36+(1-charge)*28)*sizeScale,(10+(1-charge)*4)*sizeScale,0,0,Math.PI*2);c.stroke();
   c.globalAlpha=charge*.58;c.lineWidth=2;c.beginPath();c.moveTo(f.dir*42,-f.y-145);c.lineTo(f.dir*112,-f.y-160);c.lineTo(f.dir*70,-f.y-128);c.stroke();c.restore();
  }
  // The elephant's special landing creates a broad, weighty ground-shock ring.
  if(f.data.id==='elephant'&&(f.elephantImpact||0)>.025){
   const slam=f.elephantImpact/.62,spread=(1-slam)*76;
   c.save();c.globalAlpha=slam*.72;c.strokeStyle='#d7d0bd';c.shadowColor='#b8b0a0';c.shadowBlur=13;
   c.lineWidth=3+slam*3;c.beginPath();
   c.ellipse(0,-f.y, (52+spread)*sizeScale,(13+spread*.14)*sizeScale,0,0,Math.PI*2);c.stroke();
   c.globalAlpha=slam*.34;c.lineWidth=2;
   for(let shard=0;shard<6;shard++){const a=shard*Math.PI/3,inner=48+spread*.35,outer=inner+22;
    c.beginPath();c.moveTo(Math.cos(a)*inner,-f.y+Math.sin(a)*inner*.22);c.lineTo(Math.cos(a)*outer,-f.y+Math.sin(a)*outer*.22);c.stroke();}
   c.restore();
  }
  // Fifteen distinct signatures: procedural accents follow actual attack phases.
  // These effects are intentionally screen-space modest and do not resize fighter art.
  if(['earthslam','pounce','special_b','special_c','special_d','shadow','ultraseq','ultra_move','ender'].includes(f.action)||(f.move_&&f.attack>0&&f.action==='attack_heavy'&&f.move_!==MOVES.double)){
   const signature={
    lion:['#f5c75d','roar'],tiger:['#ff9c48','slash'],jaguar:['#43d7c6','slash'],
    wolf:['#b9d9ff','wind'],hyena:['#e65c66','echo'],badger:['#bda57b','debris'],
    grizzly:['#d9ad79','impact'],crocodile:['#65c9a2','spray'],hippo:['#64e1e4','wave'],
    elephant:['#c6b9a0','debris'],eagle:['#e3e9fc','wind'],stag:['#e9c477','antler'],dolphin:['#8fe3ff','echo'],
    majic:['#bc83ff','adaptive']
   }[f.data.id];
   if(signature){
    const [color,kind]=signature,t=phase(f),power=Math.sin(Math.PI*t),dir=f.dir||1;
    const originX=dir*54,originY=-f.y-132;
    c.save();c.strokeStyle=color;c.fillStyle=color;c.lineCap='round';c.lineJoin='round';
    c.globalAlpha=.60*power;c.shadowColor=color;c.shadowBlur=kind==='adaptive'?14:6;
    if(kind==='slash'||kind==='antler'){
     c.lineWidth=kind==='antler'?3:4;
     for(let j=0;j<3;j++){const y=originY+(j-1)*19;
      c.beginPath();c.moveTo(dir*12,y+21);c.quadraticCurveTo(dir*(68+40*t),y-33,dir*(105+48*t),y-9);c.stroke();}
     if(kind==='antler'){c.lineWidth=2;c.beginPath();c.moveTo(originX,originY);c.lineTo(dir*95,originY-76);c.moveTo(dir*68,originY-44);c.lineTo(dir*43,originY-85);c.moveTo(dir*82,originY-61);c.lineTo(dir*112,originY-94);c.stroke();}
    }else if(kind==='roar'||kind==='impact'||kind==='wave'){
     c.lineWidth=kind==='impact'?5:3;
     for(let j=0;j<3;j++){const radius=25+t*(70+j*21);c.beginPath();c.ellipse(originX+dir*radius*.4,kind==='wave'?-f.y-14:originY,radius,kind==='wave'?10+j*4:radius*.65,0,-1.1,1.1);c.stroke();}
    }else if(kind==='debris'||kind==='spray'){
     for(let j=0;j<12;j++){const a=j*2.399,spread=15+90*t+(j%3)*7;
      const x=dir*24+Math.cos(a)*spread,y=-f.y-(kind==='spray'?65:9)-Math.abs(Math.sin(a))*spread*.5;
      c.beginPath();if(kind==='spray')c.ellipse(x,y,2.5,6,Math.cos(a),0,Math.PI*2);
      else{c.moveTo(x,y-5);c.lineTo(x+5,y+4);c.lineTo(x-5,y+4);c.closePath();}c.fill();}
    }else if(kind==='wind'||kind==='echo'||kind==='adaptive'){
     for(let j=0;j<5;j++){const a=j*1.256+t*2,rad=33+25*t+j*7;
      const x=originX+Math.cos(a)*rad,y=originY+Math.sin(a)*rad;
      c.lineWidth=kind==='adaptive'?2.5:2;c.beginPath();c.arc(x,y,11+j*2,a,a+1.9);c.stroke();
      if(kind==='adaptive'){c.beginPath();c.moveTo(x,y-10);c.lineTo(x+dir*9,y);c.lineTo(x,y+10);c.stroke();}
     }
    }
    c.restore();
   }
  }
  // Species-specific special-move accents stay anchored to the fighter and preserve sprite scale.
  // Short-lived frost crystals and ground mist add physical texture without obscuring the opponent.
  if(f.data.id==='leopard'&&['pounce','special_b','special_c','special_d','shadow','ultraseq'].includes(f.action)){
   const t=phase(f),intensity=Math.sin(Math.PI*t),seed=(f.x||0)*.013;
   c.save();c.globalAlpha=.58*intensity;c.strokeStyle='#c5f5ff';c.fillStyle='#b5edff';c.lineWidth=1.6;c.shadowColor='#75dfff';c.shadowBlur=7;
   for(let j=0;j<9;j++){const a=j*2.399+seed,rad=24+55*t+(j%3)*9;
    const xx=f.dir*(25+rad*Math.cos(a)),yy=-f.y-115+rad*.62*Math.sin(a)-25*t;
    const len=5+(j%4)*3;c.beginPath();c.moveTo(xx,yy-len);c.lineTo(xx+len*.45,yy);c.lineTo(xx,yy+len);c.lineTo(xx-len*.45,yy);c.closePath();c.fill();
   }
   c.globalAlpha=.20*intensity;c.fillStyle='#e1faff';c.beginPath();c.ellipse(f.dir*36,-f.y-8,58+35*t,9+4*t,0,0,Math.PI*2);c.fill();c.restore();
  }
  // Cobra: a fast tongue flick and small venom droplets during biting and coil specials.
  if(f.data.id==='snake'&&(['bite','pounce','special_b','special_c','special_d','shadow'].includes(f.action)||(f.action==='attack_heavy'&&f.move_&&f.attack>0))){
   const t=phase(f),flick=Math.max(0,1-Math.abs(t-.43)/.24),reach=25+45*flick;
   if(flick>0){c.save();c.globalAlpha=.9*flick;c.strokeStyle='#ed6574';c.lineWidth=2.5;c.lineCap='round';
    const sx=f.dir*38,sy=-f.y-173;c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo(sx+f.dir*reach*.6,sy-7,sx+f.dir*reach,sy+3);c.stroke();
    c.beginPath();c.moveTo(sx+f.dir*reach,sy+3);c.lineTo(sx+f.dir*(reach+11),sy-4);c.moveTo(sx+f.dir*reach,sy+3);c.lineTo(sx+f.dir*(reach+11),sy+10);c.stroke();
    c.fillStyle='#a6df73';for(let j=0;j<3;j++){const dx=sx+f.dir*(reach+12+j*13),dy=sy+10+j*7;c.beginPath();c.arc(dx,dy,2.5+j*.5,0,Math.PI*2);c.fill()}c.restore();}
  }
  // Frost Pounce leaves a brief icy shock ring on the snow leopard's landing.
  if(f.data.id==='leopard'&&(f.frostImpact||0)>.025){
   const frost=f.frostImpact/ .52;
   const spread=(1-frost)*48;
   c.save();c.globalAlpha=frost*.78;c.strokeStyle='#9cefff';c.shadowColor='#54dfff';c.shadowBlur=18;
   c.lineWidth=2+frost*2;c.beginPath();
   c.ellipse(0,-f.y, (34+spread)*sizeScale,(9+spread*.12)*sizeScale,0,0,Math.PI*2);c.stroke();
   c.globalAlpha=frost*.48;c.lineWidth=1.5;c.beginPath();
   c.ellipse(0,-f.y,(48+spread*1.25)*sizeScale,(5+spread*.08)*sizeScale,0,0,Math.PI*2);c.stroke();
   c.restore();
  }
  c.restore();
 }
 if(f.action==='victory'&&!ghost){
  const winPulse=.5+.5*Math.sin((f.winT||0)*3.2);
  c.save();c.globalAlpha=.12+.08*winPulse;c.fillStyle='#ffd36b';
  const aura=c.createRadialGradient(0,-150,18,0,-150,170);
  aura.addColorStop(0,'rgba(255,211,107,.28)');aura.addColorStop(1,'rgba(255,211,107,0)');
  c.fillStyle=aura;c.beginPath();c.ellipse(0,-150,170,205,0,0,Math.PI*2);c.fill();
  c.globalAlpha=.18+.12*winPulse;c.strokeStyle='#ffd36b';c.lineWidth=2;
  for(let ray=0;ray<7;ray++){
   const a=-Math.PI*.92+ray*Math.PI*.84/6;
   c.beginPath();c.moveTo(Math.cos(a)*78,-150+Math.sin(a)*78);
   c.lineTo(Math.cos(a)*118,-150+Math.sin(a)*118);c.stroke();
  }
  c.restore();
  // MAJIC's final-boss victory: the complete Jungle Titan form revealed in a violet-gold crown.
  if(f.data.id==='majic'){
   const t=f.winT||0,settle=Math.min(1,t/.55),pulse=.5+.5*Math.sin(t*3.4),orbit=t*.72;
   c.save();c.globalCompositeOperation='lighter';
   // Layered supernatural halo, kept translucent so MAJIC's sprite remains readable.
   const halo=c.createRadialGradient(0,-158,18,0,-158,205);
   halo.addColorStop(0,'rgba(193,145,255,.23)');halo.addColorStop(.58,'rgba(117,72,205,.12)');halo.addColorStop(1,'rgba(117,72,205,0)');
   c.globalAlpha=(.62+.18*pulse)*settle;c.fillStyle=halo;c.beginPath();c.ellipse(0,-158,205,224,0,0,Math.PI*2);c.fill();
   // Three rotating titan rings suggest the combined power of the entire animal kingdom.
   for(let ring=0;ring<3;ring++){
    const a=orbit*(ring%2?-.7:1)+ring*1.05;
    c.save();c.translate(0,-154);c.rotate(a);c.globalAlpha=(.24+.12*pulse)*settle;
    c.strokeStyle=ring===1?'#f0d18a':'#c7a0ff';c.shadowColor=ring===1?'#f2c66e':'#9c65ff';c.shadowBlur=22;c.lineWidth=ring===1?3:2.4;
    c.beginPath();c.ellipse(0,0,92+ring*19,130+ring*13,0,0,Math.PI*2);c.stroke();c.restore();
   }
   // Crown horns rise above the head, with a central violet jewel.
   c.globalAlpha=(.42+.16*pulse)*settle;c.strokeStyle='#e8cf9a';c.shadowColor='#bd8cff';c.shadowBlur=23;c.lineWidth=4;
   c.beginPath();c.moveTo(-42,-218);c.quadraticCurveTo(-65,-255,-88,-270);c.lineTo(-75,-235);c.moveTo(-42,-218);c.lineTo(-53,-264);c.moveTo(42,-218);c.quadraticCurveTo(65,-255,88,-270);c.lineTo(75,-235);c.moveTo(42,-218);c.lineTo(53,-264);c.moveTo(-42,-218);c.quadraticCurveTo(0,-244,42,-218);c.stroke();
   c.fillStyle='#e8c9ff';c.shadowColor='#d2a5ff';c.shadowBlur=20;c.beginPath();c.arc(0,-238,6+2*pulse,0,Math.PI*2);c.fill();
   // Spectral wings unfold behind the shoulders, then hold as a regal silhouette.
   for(const side of [-1,1]){
    c.save();c.scale(side,1);c.globalAlpha=(.28+.13*pulse)*settle;c.strokeStyle='#b99aff';c.shadowColor='#8f5be8';c.shadowBlur=19;c.lineWidth=3;
    c.beginPath();c.moveTo(43,-168);c.quadraticCurveTo(104,-218,142,-194);c.quadraticCurveTo(128,-154,83,-125);c.moveTo(86,-160);c.lineTo(130,-174);c.moveTo(76,-145);c.lineTo(117,-145);c.stroke();c.restore();
   }
   // Eleven orbiting sparks represent the original beasts bound into MAJIC.
   const colors=['#f0c66e','#b99aff','#7fe0d1','#e58d62','#a6c9ff','#d9a6d5'];
   for(let mote=0;mote<11;mote++){
    const a=orbit+mote*Math.PI*2/11,rad=112+12*Math.sin(t*2+mote*1.7),x=Math.cos(a)*rad,y=-151+Math.sin(a)*rad*.78;
    c.globalAlpha=(.32+.34*(.5+.5*Math.sin(t*4+mote)))*settle;c.fillStyle=colors[mote%colors.length];c.shadowColor=c.fillStyle;c.shadowBlur=15;
    c.beginPath();c.arc(x,y,2.1+1.1*(.5+.5*Math.sin(t*3+mote)),0,Math.PI*2);c.fill();
   }
   // A final ground seal pulses beneath the Titan.
   for(let wave=0;wave<3;wave++){
    const phase=(t*1.05+wave*.72)%2.3,rad=54+phase*42;
    c.globalAlpha=(.28*(1-phase/2.3))*settle;c.strokeStyle=wave===1?'#f0d18a':'#b994ff';c.lineWidth=2.7;c.shadowBlur=16;
    c.beginPath();c.ellipse((wave-1)*8,-6,rad,rad*.2,0,0,Math.PI*2);c.stroke();
   }
   c.restore();
  }
  // Snow Leopard's victory signature: a rising frost spiral and orbiting ice shards.
  if(f.data.id==='leopard'){
   const t=f.winT||0;
   c.save();c.globalCompositeOperation='lighter';
   const orbit= t*1.65;
   for(let shard=0;shard<6;shard++){
    const a=orbit+shard*Math.PI/3;
    const rx=78+12*Math.sin(t*2+shard), ry=92+10*Math.cos(t*1.7+shard);
    const sx=Math.cos(a)*rx, sy=-152+Math.sin(a)*ry;
    c.save();c.translate(sx,sy);c.rotate(a+Math.PI/2);
    c.globalAlpha=.34+.38*(.5+.5*Math.sin(t*4+shard));
    c.strokeStyle='#b9f6ff';c.shadowColor='#62ddff';c.shadowBlur=13;c.lineWidth=2;
    c.beginPath();c.moveTo(0,-11);c.lineTo(0,11);c.moveTo(-7,-4);c.lineTo(7,4);c.moveTo(-7,4);c.lineTo(7,-4);c.stroke();
    c.restore();
   }
   c.globalAlpha=.22+.12*winPulse;c.strokeStyle='#83eaff';c.shadowColor='#4bdcff';c.shadowBlur=18;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-148,105+8*Math.sin(t*2),138,Math.sin(t*.8)*.12,0,Math.PI*2);c.stroke();
   // Brief crown-and-wing flourish frames her settled victory pose.
   const flourish=1-Math.min(1,t/.72),pulse=.5+.5*Math.sin(t*7);
   if(flourish>0){
    c.globalAlpha=flourish*(.58+.2*pulse);c.strokeStyle='#d9fbff';c.fillStyle='rgba(105,220,255,.18)';c.lineWidth=2.2;
    c.shadowColor='#68ddff';c.shadowBlur=16;
    c.beginPath();c.moveTo(-48,-178);c.lineTo(-78,-222);c.lineTo(-60,-214);c.lineTo(-42,-244);c.lineTo(-24,-211);
    c.lineTo(0,-232);c.lineTo(24,-211);c.lineTo(42,-244);c.lineTo(60,-214);c.lineTo(78,-222);c.lineTo(48,-178);c.closePath();c.fill();c.stroke();
    for(let wing=-1;wing<=1;wing+=2){
     c.beginPath();c.moveTo(wing*54,-128);c.lineTo(wing*104,-158);c.lineTo(wing*91,-122);c.lineTo(wing*126,-105);c.stroke();
    }
   }
   c.restore();
  }
  // Badger's Earthbreaker victory signature: a grounded stone mantle and amber earth pulses.
  if(f.data.id==='badger'){
   const t=f.winT||0,settle=Math.min(1,t/.5),pulse=.5+.5*Math.sin(t*3.6);
   c.save();c.globalCompositeOperation='lighter';
   // Layered stone plates frame the shoulders without covering the fighter.
   for(let side of [-1,1]){
    c.save();c.translate(side*52,-142);c.rotate(side*(.12+.035*Math.sin(t*2+side)));
    c.globalAlpha=(.25+.12*pulse)*settle;c.fillStyle='#9a8058';c.strokeStyle='#e2bd78';c.shadowColor='#c58e45';c.shadowBlur=13;c.lineWidth=2;
    c.beginPath();c.moveTo(-5,-34);c.lineTo(19,-27);c.lineTo(31,-7);c.lineTo(18,15);c.lineTo(-8,10);c.lineTo(-18,-11);c.closePath();c.fill();c.stroke();
    c.globalAlpha=(.22+.13*pulse)*settle;c.strokeStyle='#f3d49a';c.lineWidth=1.5;c.beginPath();c.moveTo(-7,-18);c.lineTo(13,-9);c.lineTo(19,4);c.stroke();c.restore();
   }
   // Cracked-earth rings radiate from Badger's feet.
   for(let ring=0;ring<3;ring++){
    const r=68+ring*24+10*Math.sin(t*2.4+ring),y=-7+ring*2;
    c.globalAlpha=(.22+.16*pulse)*settle;c.strokeStyle=ring===2?'#f0c77e':'#bd9257';c.shadowColor='#d9a65e';c.shadowBlur=14;c.lineWidth=2.4-ring*.35;
    c.beginPath();c.ellipse(0,y,r,10+ring*2,0,0,Math.PI*2);c.stroke();
   }
   // Small stone fragments rise and settle around the champion.
   for(let chip=0;chip<10;chip++){
    const a=t*.72+chip*2.399,rad=76+12*Math.sin(t*1.8+chip),x=Math.cos(a)*rad,y=-74-Math.abs(Math.sin(a*1.15))*(28+chip%3*11);
    c.globalAlpha=(.2+.2*(.5+.5*Math.sin(t*3+chip)))*settle;c.fillStyle=chip%3?'#b99a69':'#f0ce8d';c.shadowBlur=9;
    c.save();c.translate(x,y);c.rotate(a*.7);c.beginPath();c.moveTo(0,-4);c.lineTo(4,1);c.lineTo(-2,5);c.closePath();c.fill();c.restore();
   }
   c.globalAlpha=(.2+.14*pulse)*settle;c.strokeStyle='#e7c17d';c.shadowColor='#d7a85b';c.shadowBlur=15;c.lineWidth=2.5;
   c.beginPath();c.arc(0,-143,83+7*Math.sin(t*2.1),Math.PI*1.12,Math.PI*1.88);c.stroke();
   c.restore();
  }
  // Elephant's Titan victory signature: tusk-shaped champion arcs and a ground-pulse crown.
  if(f.data.id==='elephant'){
   const t=f.winT||0,settle=Math.min(1,t/.55),pulse=.5+.5*Math.sin(t*3.4);
   c.save();c.globalCompositeOperation='lighter';
   c.globalAlpha=(.32+.2*pulse)*settle;c.strokeStyle='#e6d7b8';c.shadowColor='#d8c5a0';c.shadowBlur=18;c.lineWidth=4;
   for(let side of [-1,1]){
    c.beginPath();c.moveTo(side*34,-118);c.quadraticCurveTo(side*78,-174,side*67,-220);c.quadraticCurveTo(side*63,-239,side*49,-225);c.stroke();
    c.globalAlpha=(.18+.12*pulse)*settle;c.lineWidth=2;c.beginPath();c.moveTo(side*43,-126);c.quadraticCurveTo(side*91,-181,side*78,-228);c.stroke();
   }
   c.globalAlpha=(.2+.13*pulse)*settle;c.strokeStyle='#c9b99a';c.shadowBlur=13;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-8,88+10*Math.sin(t*2.1),15+2*pulse,0,0,Math.PI*2);c.stroke();
   for(let mote=0;mote<8;mote++){
    const a=t*1.1+mote*Math.PI/4,rad=96+8*Math.sin(t*2+mote);
    const mx=Math.cos(a)*rad,my=-105+Math.sin(a)*rad*.58;
    c.globalAlpha=(.2+.18*(.5+.5*Math.sin(t*4+mote)))*settle;c.fillStyle='#e8ddc6';c.shadowBlur=10;
    c.beginPath();c.arc(mx,my,2.5+1.5*Math.sin(t*3+mote),0,Math.PI*2);c.fill();
   }
   c.restore();
  }
  // Grizzly's Bear Champion victory signature: sweeping claw arcs and an earthy power aura.
  if(f.data.id==='grizzly'){
   const t=f.winT||0,settle=Math.min(1,t/.5),pulse=.5+.5*Math.sin(t*3.6);
   c.save();c.globalCompositeOperation='lighter';
   c.globalAlpha=(.2+.14*pulse)*settle;c.strokeStyle='#d6ad83';c.shadowColor='#b77a45';c.shadowBlur=20;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-145,112+10*Math.sin(t*1.8),145+7*Math.cos(t*1.4),0,0,Math.PI*2);c.stroke();
   // Three claw-shaped arcs rise from each shoulder like a bear's champion roar.
   for(let side of [-1,1]){
    for(let claw=0;claw<3;claw++){
     const x=side*(38+claw*13),lift=claw*8;
     c.globalAlpha=(.24+.18*pulse)*settle;c.lineWidth=2.5;c.beginPath();
     c.moveTo(x,-112-lift);c.quadraticCurveTo(x+side*(25+claw*3),-157-lift,x+side*(15+claw*4),-196-lift);c.stroke();
    }
   }
   // Heavy paw-print pulses roll outward along the ground.
   for(let print=0;print<3;print++){
    const phase=(t*1.5+print*.72)%2.2,rad=48+phase*38;
    c.globalAlpha=(.28*(1-phase/2.2))*settle;c.strokeStyle='#c99a70';c.lineWidth=2;c.shadowBlur=11;
    c.beginPath();c.ellipse((print-1)*22,-8,rad,rad*.22,0,0,Math.PI*2);c.stroke();
   }
   for(let mote=0;mote<10;mote++){
    const a=t*.9+mote*2.399,rad=86+12*Math.sin(t*2+mote);
    c.globalAlpha=(.16+.2*(.5+.5*Math.sin(t*3.8+mote)))*settle;c.fillStyle=mote%2?'#e6c39b':'#b77a45';c.shadowBlur=12;
    c.beginPath();c.arc(Math.cos(a)*rad,-132+Math.sin(a)*rad*.72,2+1.4*Math.sin(t*3+mote),0,Math.PI*2);c.fill();
   }
   c.restore();
  }
  // Wolf's Pack Leader victory signature: silver-blue pack aura and crescent howl arcs.
  if(f.data.id==='wolf'){
   const t=f.winT||0,settle=Math.min(1,t/.48),pulse=.5+.5*Math.sin(t*3.9);
   c.save();c.globalCompositeOperation='lighter';
   // Cool moonlit aura frames the wolf without obscuring the victory sprite.
   c.globalAlpha=(.2+.14*pulse)*settle;c.strokeStyle='#c6e3f5';c.shadowColor='#75bce8';c.shadowBlur=21;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-143,98+8*Math.sin(t*1.8),125+8*Math.cos(t*1.5),0,0,Math.PI*2);c.stroke();
   // Paired howl crescents rise from the shoulders like a moonlit call to the pack.
   for(let side of [-1,1]){
    c.globalAlpha=(.25+.16*pulse)*settle;c.lineWidth=3.4;
    c.beginPath();c.moveTo(side*48,-83);c.quadraticCurveTo(side*105,-137-8*Math.sin(t*2.1),side*74,-207);c.quadraticCurveTo(side*64,-224,side*51,-207);c.stroke();
    c.globalAlpha=(.17+.1*pulse)*settle;c.lineWidth=1.8;
    c.beginPath();c.moveTo(side*59,-91);c.quadraticCurveTo(side*117,-151,side*87,-214);c.stroke();
   }
   // Three expanding ground rings suggest the force of a pack leader's howl.
   for(let ring=0;ring<3;ring++){
    const phase=(t*1.3+ring*.7)%2.25,rad=46+phase*39;
    c.globalAlpha=(.26*(1-phase/2.25))*settle;c.strokeStyle='#8bc9ee';c.lineWidth=2.3;c.shadowBlur=13;
    c.beginPath();c.ellipse((ring-1)*12,-8,rad,rad*.2,0,0,Math.PI*2);c.stroke();
   }
   // Silver-blue motes spiral upward around the champion.
   for(let mote=0;mote<13;mote++){
    const a=t*.95+mote*2.399,rad=78+14*Math.sin(t*2+mote);
    c.globalAlpha=(.18+.2*(.5+.5*Math.sin(t*3.7+mote)))*settle;c.fillStyle=mote%3?'#b8d9ef':'#f0fbff';c.shadowBlur=12;
    c.beginPath();c.arc(Math.cos(a)*rad,-125+Math.sin(a)*rad*.72,2+1.3*Math.sin(t*3.4+mote),0,Math.PI*2);c.fill();
   }
   c.restore();
  }
  // Hyena's Mad Champion victory signature: jagged amber arcs and a restless laugh-like energy pulse.
  if(f.data.id==='hyena'){
   const t=f.winT||0,settle=Math.min(1,t/.46),pulse=.5+.5*Math.sin(t*5.1);
   c.save();c.globalCompositeOperation='lighter';
   // Uneven amber aura gives Hyena a wild, unpredictable champion silhouette.
   c.globalAlpha=(.18+.15*pulse)*settle;c.strokeStyle='#f3bd63';c.shadowColor='#df812d';c.shadowBlur=20;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-142,94+10*Math.sin(t*2.8),119+7*Math.cos(t*2.1),Math.sin(t*1.2)*.035,0,Math.PI*2);c.stroke();
   // Jagged bite-and-claw crescents flare asymmetrically from either shoulder.
   for(let side of [-1,1]){
    c.globalAlpha=(.25+.16*pulse)*settle;c.lineWidth=3;
    c.beginPath();c.moveTo(side*42,-91);c.lineTo(side*72,-126);c.lineTo(side*61,-145);c.lineTo(side*91,-174);c.lineTo(side*77,-196);c.stroke();
    c.globalAlpha=(.17+.11*pulse)*settle;c.lineWidth=1.8;
    c.beginPath();c.moveTo(side*53,-99);c.quadraticCurveTo(side*112,-143,side*83,-210);c.stroke();
   }
   // Broken ground pulses ripple outward with Hyena's restless energy.
   for(let ring=0;ring<3;ring++){
    const phase=(t*1.55+ring*.61)%2.15,rad=43+phase*40;
    c.globalAlpha=(.25*(1-phase/2.15))*settle;c.strokeStyle='#e8a34e';c.lineWidth=2.2;c.shadowBlur=12;
    c.beginPath();c.ellipse((ring-1)*17,-7,rad,rad*.19,Math.sin(t*2+ring)*.025,0,Math.PI*2);c.stroke();
   }
   // Amber sparks zig-zag upward rather than following a smooth orbit.
   for(let mote=0;mote<14;mote++){
    const phase=(t*1.18+mote*.53)%2.45,side=mote%2?1:-1;
    const mx=side*(36+24*Math.sin(t*3.1+mote*1.7)),my=-28-phase*69+5*Math.sin(t*5+mote);
    c.globalAlpha=(.31*(1-phase/2.45))*settle;c.fillStyle=mote%3?'#e9a34f':'#ffe0a0';c.shadowBlur=13;
    c.beginPath();c.arc(mx,my,1.7+1.2*Math.sin(t*4.6+mote),0,Math.PI*2);c.fill();
   }
   c.restore();
  }
  // Tiger's Striped Champion victory signature: fierce amber stripes and sweeping claw crescents.
  if(f.data.id==='tiger'){
   const t=f.winT||0,settle=Math.min(1,t/.46),pulse=.5+.5*Math.sin(t*4.2);
   c.save();c.globalCompositeOperation='lighter';
   // Amber aura frames the fighter without hiding the victory sprite.
   c.globalAlpha=(.18+.13*pulse)*settle;c.strokeStyle='#ffad3d';c.shadowColor='#ff6a18';c.shadowBlur=21;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-143,91+7*Math.sin(t*2.1),112+8*Math.cos(t*1.8),0,0,Math.PI*2);c.stroke();
   // Four curved stripe bands sweep upward along either side of the champion.
   for(let side of [-1,1]){
    for(let stripe=0;stripe<4;stripe++){
     const y=-82-stripe*27,spread=37+stripe*5,flow=Math.sin(t*3+stripe*.8)*5;
     c.globalAlpha=(.19+.12*pulse)*settle;c.lineWidth=3.2-stripe*.25;
     c.beginPath();c.moveTo(side*spread,y+13);c.quadraticCurveTo(side*(spread+22),y-7+flow,side*(spread+9),y-25);c.stroke();
    }
   }
   // Twin claw crescents flare out beside the shoulders during the champion pose.
   for(let side of [-1,1]){
    c.globalAlpha=(.26+.16*pulse)*settle;c.lineWidth=3.4;c.beginPath();
    c.arc(side*58,-119,34,side===-1?-1.18:Math.PI-.0,side===-1?1.05:Math.PI+2.18,side===1);c.stroke();
   }
   // Ember sparks spiral upward around the tiger.
   for(let spark=0;spark<14;spark++){
    const phase=(t*1.2+spark*.57)%2.35,side=spark%2?1:-1;
    const x=side*(42+23*Math.sin(t*2.2+spark)),y=-34-phase*72;
    c.globalAlpha=(.34*(1-phase/2.35))*settle;c.fillStyle=spark%3?'#ffad3d':'#fff0bd';c.shadowBlur=14;
    c.beginPath();c.arc(x,y,1.7+1.2*Math.sin(t*4.4+spark),0,Math.PI*2);c.fill();
   }
   c.restore();
  }
  // Lion's King's Champion victory signature: a radiant mane halo and rising golden embers.
  if(f.data.id==='lion'){
   const t=f.winT||0,settle=Math.min(1,t/.5),pulse=.5+.5*Math.sin(t*3.8);
   c.save();c.globalCompositeOperation='lighter';
   // Broad sunburst behind the mane, pulsing without obscuring the fighter.
   c.globalAlpha=(.16+.12*pulse)*settle;c.strokeStyle='#ffd36b';c.shadowColor='#ff9f2e';c.shadowBlur=22;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-158,104+8*Math.sin(t*1.7),119+9*Math.cos(t*1.4),0,0,Math.PI*2);c.stroke();
   for(let ray=0;ray<12;ray++){
    const a=t*.18+ray*Math.PI/6,inner=103+4*Math.sin(t*2+ray),outer=inner+19+5*Math.sin(t*2.5+ray);
    c.globalAlpha=(.2+.12*pulse)*settle;c.lineWidth=2;
    c.beginPath();c.moveTo(Math.cos(a)*inner,-158+Math.sin(a)*inner);
    c.lineTo(Math.cos(a)*outer,-158+Math.sin(a)*outer);c.stroke();
   }
   // Golden mane flares rise from both shoulders like a crown of fire.
   for(let side of [-1,1]){
    for(let flare=0;flare<3;flare++){
     const x=side*(34+flare*15),lift=flare*7;
     c.globalAlpha=(.25+.16*pulse)*settle;c.lineWidth=2.6;c.beginPath();
     c.moveTo(x,-112-lift);c.quadraticCurveTo(x+side*(24+flare*3),-151-lift,x+side*(13+flare*5),-190-lift-5*Math.sin(t*3+flare));c.stroke();
    }
   }
   // Embers orbit and rise around the champion.
   for(let ember=0;ember<12;ember++){
    const phase=(t*1.05+ember*.71)%2.6,side=ember%2?1:-1;
    const ex=side*(48+18*Math.sin(t*1.8+ember)),ey=-42-phase*66;
    c.globalAlpha=(.32*(1-phase/2.6))*settle;c.fillStyle=ember%3?'#ffd36b':'#fff0b0';c.shadowBlur=13;
    c.beginPath();c.arc(ex,ey,1.8+1.3*Math.sin(t*4+ember),0,Math.PI*2);c.fill();
   }
   c.restore();
  }
  // Jaguar's precision-predator victory signature: rosette glints and coiled ambush arcs.
  if(f.data.id==='jaguar'){
   const t=f.winT||0,settle=Math.min(1,t/.48),pulse=.5+.5*Math.sin(t*4.1);
   c.save();c.globalCompositeOperation='lighter';
   // Warm amber aura frames the jaguar without obscuring its victory sprite.
   c.globalAlpha=(.18+.14*pulse)*settle;c.strokeStyle='#f2c36b';c.shadowColor='#d88b2e';c.shadowBlur=20;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-145,96+8*Math.sin(t*2),125+7*Math.cos(t*1.7),0,0,Math.PI*2);c.stroke();
   // Paired pounce arcs curl inward like a predator coiling before a leap.
   for(let side of [-1,1]){
    c.globalAlpha=(.28+.16*pulse)*settle;c.lineWidth=3.2;
    c.beginPath();c.moveTo(side*72,-66);c.quadraticCurveTo(side*116,-124-8*Math.sin(t*2.4),side*63,-190);c.quadraticCurveTo(side*42,-211,side*28,-188);c.stroke();
    c.globalAlpha=(.16+.1*pulse)*settle;c.lineWidth=1.8;
    c.beginPath();c.moveTo(side*82,-73);c.quadraticCurveTo(side*128,-136,side*74,-202);c.stroke();
   }
   // Rosette-shaped glints orbit the champion as small amber rings.
   for(let spot=0;spot<9;spot++){
    const a=t*.72+spot*2.399,rad=72+13*Math.sin(t*1.8+spot),sx=Math.cos(a)*rad,sy=-135+Math.sin(a)*rad*.76;
    c.globalAlpha=(.2+.2*(.5+.5*Math.sin(t*3.6+spot)))*settle;c.strokeStyle=spot%2?'#f7d58d':'#d99a42';c.lineWidth=1.8;c.shadowBlur=10;
    c.beginPath();c.ellipse(sx,sy,4.5,5.8, a*.25,0,Math.PI*2);c.stroke();
    c.beginPath();c.arc(sx,sy,1.4,0,Math.PI*2);c.fillStyle='#ffe6ad';c.fill();
   }
   // Three low amber pulses mark the jaguar's grounded, precise stance.
   for(let ring=0;ring<3;ring++){
    const phase=(t*1.15+ring*.68)%2.1,rad=42+phase*39;
    c.globalAlpha=(.24*(1-phase/2.1))*settle;c.strokeStyle='#e8b65c';c.lineWidth=2.2;c.shadowBlur=12;
    c.beginPath();c.ellipse((ring-1)*13,-7,rad,rad*.19,0,0,Math.PI*2);c.stroke();
   }
   // Amber motes rise in a tight spiral, emphasizing precision rather than brute force.
   for(let mote=0;mote<11;mote++){
    const phase=(t*1.1+mote*.59)%2.45,side=mote%2?1:-1;
    const mx=side*(35+20*Math.sin(t*2+mote)),my=-32-phase*68;
    c.globalAlpha=(.3*(1-phase/2.45))*settle;c.fillStyle=mote%3?'#efbd64':'#fff0c5';c.shadowBlur=13;
    c.beginPath();c.arc(mx,my,1.7+1.2*Math.sin(t*4+mote),0,Math.PI*2);c.fill();
   }
   c.restore();
  }
  // Eagle's hidden-fighter victory signature: a rising sky halo, spread wing arcs, and drifting feathers.
  if(f.data.id==='eagle'){
   const t=f.winT||0,settle=Math.min(1,t/.52),pulse=.5+.5*Math.sin(t*3.8);
   c.save();c.globalCompositeOperation='lighter';
   // A warm sky-gold aura frames Eagle's silhouette without obscuring the sprite.
   c.globalAlpha=(.2+.15*pulse)*settle;c.strokeStyle='#f5d28a';c.shadowColor='#dca64c';c.shadowBlur=21;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-151,104+9*Math.sin(t*1.6),125+7*Math.cos(t*1.4),0,0,Math.PI*2);c.stroke();
   // Broad feathered wing arcs flare outward from the shoulders.
   for(let side of [-1,1]){
    c.save();c.translate(side*39,-153);c.scale(side,1);
    c.globalAlpha=(.28+.16*pulse)*settle;c.strokeStyle='#f1d49a';c.shadowBlur=17;c.lineWidth=3;
    c.beginPath();c.moveTo(0,8);c.quadraticCurveTo(37,-19,91,-54);c.quadraticCurveTo(76,-13,48,13);c.stroke();
    c.globalAlpha=(.2+.12*pulse)*settle;c.lineWidth=1.8;
    for(let feather=0;feather<5;feather++){
     const u=feather/4;
     c.beginPath();c.moveTo(22+u*48,-7-u*23);c.lineTo(48+u*43,-28-u*22);c.stroke();
    }
    c.restore();
   }
   // Golden feather motes orbit upward like a gust lifting from the arena floor.
   for(let feather=0;feather<10;feather++){
    const a=t*.92+feather*2.399,rad=72+14*Math.sin(t*1.8+feather);
    const fx=Math.cos(a)*rad,fy=-130+Math.sin(a)*rad*.78;
    c.save();c.translate(fx,fy);c.rotate(a*.35+Math.sin(t*2+feather)*.22);
    c.globalAlpha=(.24+.24*(.5+.5*Math.sin(t*4+feather)))*settle;
    c.fillStyle=feather%3?'#f5dca8':'#fff0c9';c.shadowBlur=12;
    c.beginPath();c.moveTo(0,-7);c.quadraticCurveTo(5,-1,0,7);c.quadraticCurveTo(-5,1,0,-7);c.fill();
    c.restore();
   }
   // Two sky rings pulse below the talons to finish the champion landing.
   for(let ring=0;ring<2;ring++){
    const phase=(t*1.15+ring*.72)%1.8,rad=49+phase*32;
    c.globalAlpha=(.27*(1-phase/1.8))*settle;c.strokeStyle='#ffe2a8';c.lineWidth=2.2;c.shadowBlur=13;
    c.beginPath();c.ellipse(0,-7,rad,rad*.18,0,0,Math.PI*2);c.stroke();
   }
   c.restore();
  }
  // Snake's hidden-fighter victory signature: an emerald serpent coil and venom crown.
  if(f.data.id==='snake'){
   const t=f.winT||0,settle=Math.min(1,t/.55),pulse=.5+.5*Math.sin(t*3.4);
   c.save();c.globalCompositeOperation='lighter';
   // A layered emerald aura gives Snake a supernatural presence without hiding the fighter.
   c.globalAlpha=(.19+.14*pulse)*settle;c.strokeStyle='#b4e77a';c.shadowColor='#69b83f';c.shadowBlur=22;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-143,96+8*Math.sin(t*1.7),121+7*Math.cos(t*1.5),0,0,Math.PI*2);c.stroke();
   // A living serpent-shaped energy ribbon coils upward around the body.
   for(let strand=0;strand<2;strand++){
    c.globalAlpha=(.25+.12*pulse)*settle;c.strokeStyle=strand?'#d5ef8b':'#72c84e';c.shadowBlur=17;c.lineWidth=strand?2:3;
    c.beginPath();
    for(let step=0;step<=28;step++){
     const u=step/28,y=-22-u*218,angle=t*1.35+u*Math.PI*3.1+strand*Math.PI;
     const x=Math.sin(angle)*(42+u*15);
     if(step===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    c.stroke();
   }
   // The serpent's raised hood forms a small crown above Snake's head.
   c.globalAlpha=(.3+.14*pulse)*settle;c.lineWidth=2.6;c.strokeStyle='#c5e987';c.shadowBlur=16;
   c.beginPath();c.moveTo(-28,-204);c.quadraticCurveTo(-42,-238,-15,-246);c.quadraticCurveTo(0,-251,15,-246);c.quadraticCurveTo(42,-238,28,-204);c.stroke();
   // Venom motes orbit the fighter and rise like glowing emerald droplets.
   for(let mote=0;mote<12;mote++){
    const a=t*.9+mote*2.399,rad=67+13*Math.sin(t*1.9+mote);
    const mx=Math.cos(a)*rad,my=-126+Math.sin(a)*rad*.76;
    c.globalAlpha=(.2+.22*(.5+.5*Math.sin(t*4+mote)))*settle;c.fillStyle=mote%3?'#9bd66b':'#e0f5a2';c.shadowBlur=13;
    c.beginPath();c.ellipse(mx,my,2.1,3.8,Math.cos(a)*.35,0,Math.PI*2);c.fill();
   }
   // Three emerald coil-rings pulse along the ground beneath the champion stance.
   for(let ring=0;ring<3;ring++){
    const phase=(t*1.2+ring*.67)%2.15,rad=43+phase*37;
    c.globalAlpha=(.25*(1-phase/2.15))*settle;c.strokeStyle='#a8e879';c.lineWidth=2.3;c.shadowBlur=14;
    c.beginPath();c.ellipse((ring-1)*9,-7,rad,rad*.19,0,0,Math.PI*2);c.stroke();
   }
   c.restore();
  }
  // Stag's hidden-fighter victory signature: a forest-spirit crown, antler branches, and living root pulses.
  if(f.data.id==='stag'){
   const t=f.winT||0,settle=Math.min(1,t/.52),pulse=.5+.5*Math.sin(t*2.8);
   c.save();c.globalCompositeOperation='lighter';
   // A deep forest-green aura frames the champion without obscuring the sprite.
   c.globalAlpha=(.2+.15*pulse)*settle;c.strokeStyle='#a5d99a';c.shadowColor='#4aa66b';c.shadowBlur=22;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-137,99+8*Math.sin(t*1.6),119+7*Math.cos(t*1.4),0,0,Math.PI*2);c.stroke();
   // Branching antler-energy rises above the head like a living crown.
   for(let side of [-1,1]){
    c.save();c.scale(side,1);c.globalAlpha=(.3+.16*pulse)*settle;c.strokeStyle='#d4edaa';c.shadowColor='#83c96e';c.shadowBlur=18;c.lineWidth=3.2;
    c.beginPath();c.moveTo(20,-190);c.quadraticCurveTo(34,-220,27,-245);c.lineTo(13,-263);c.moveTo(27,-245);c.lineTo(43,-264);c.moveTo(31,-229);c.lineTo(53,-244);c.stroke();
    c.restore();
   }
   // Floating leaves and green-gold motes drift around the stag.
   for(let leaf=0;leaf<14;leaf++){
    const a=t*.72+leaf*2.399,rad=73+15*Math.sin(t*1.7+leaf),lx=Math.cos(a)*rad,ly=-122+Math.sin(a)*rad*.78;
    c.save();c.translate(lx,ly);c.rotate(a*.7);c.globalAlpha=(.18+.22*(.5+.5*Math.sin(t*3.2+leaf)))*settle;
    c.fillStyle=leaf%3?'#8bcf79':'#e0d58b';c.shadowBlur=12;c.beginPath();c.ellipse(0,0,2.4,5.2,0,0,Math.PI*2);c.fill();c.restore();
   }
   // Three root-like rings spread beneath the champion's hooves.
   for(let ring=0;ring<3;ring++){
    const phase=(t*1.12+ring*.7)%2.25,rad=42+phase*39;
    c.globalAlpha=(.27*(1-phase/2.25))*settle;c.strokeStyle='#a5d99a';c.lineWidth=2.5;c.shadowBlur=14;
    c.beginPath();c.ellipse((ring-1)*10,-7,rad,rad*.2,0,0,Math.PI*2);c.stroke();
   }
   // Small star-like forest sparks rise along the antler crown.
   for(let spark=0;spark<8;spark++){
    const a=t*1.05+spark*Math.PI/4,sx=Math.cos(a)*48,sy=-216+Math.sin(a*1.4)*24;
    c.globalAlpha=(.22+.24*(.5+.5*Math.sin(t*4+spark)))*settle;c.fillStyle='#e6f5b6';c.shadowBlur=15;
    c.beginPath();c.arc(sx,sy,1.8+(.7*Math.sin(t*3+spark)),0,Math.PI*2);c.fill();
   }
   c.restore();
  }
  // Crocodile's armored river-predator victory signature: plated arcs, tail sweep, and marsh-water pulses.
  if(f.data.id==='crocodile'){
   const t=f.winT||0,settle=Math.min(1,t/.5),pulse=.5+.5*Math.sin(t*3.5);
   c.save();c.globalCompositeOperation='lighter';
   // Layered jade aura evokes the crocodile's armored scales without covering its sprite.
   c.globalAlpha=(.2+.14*pulse)*settle;c.strokeStyle='#8be2b8';c.shadowColor='#35b98c';c.shadowBlur=20;c.lineWidth=3;
   c.beginPath();c.ellipse(0,-139,103+8*Math.sin(t*1.7),116+7*Math.cos(t*1.5),0,0,Math.PI*2);c.stroke();
   // Raised dorsal-plate silhouette above the back and shoulders.
   for(let plate=0;plate<7;plate++){
    const px=-48+plate*16,py=-222+Math.abs(plate-3)*5;
    c.globalAlpha=(.22+.12*pulse)*settle;c.lineWidth=2.2;c.beginPath();
    c.moveTo(px-6,py+18);c.lineTo(px,py-3-(plate%2)*4);c.lineTo(px+7,py+18);c.stroke();
   }
   // A broad curved tail-energy sweep curls behind the champion.
   c.globalAlpha=(.3+.16*pulse)*settle;c.lineWidth=4;c.strokeStyle='#55d7b0';c.shadowBlur=17;
   c.beginPath();c.moveTo(-48,-93);c.quadraticCurveTo(-119,-78-7*Math.sin(t*2),-112,-24);c.quadraticCurveTo(-105,1,-72,-4);c.stroke();
   c.globalAlpha=(.18+.1*pulse)*settle;c.lineWidth=2;c.beginPath();c.moveTo(-53,-104);c.quadraticCurveTo(-132,-80,-121,-18);c.stroke();
   // Marsh-water rings pulse outward under the crocodile's stance.
   for(let wave=0;wave<3;wave++){
    const phase=(t*1.25+wave*.72)%2.3,rad=48+phase*36;
    c.globalAlpha=(.25*(1-phase/2.3))*settle;c.strokeStyle='#72e8cf';c.lineWidth=2.4;c.shadowBlur=12;
    c.beginPath();c.ellipse((wave-1)*12,-7,rad,rad*.2,0,0,Math.PI*2);c.stroke();
   }
   // Water beads and green-gold scale glints rise around the armored body.
   for(let mote=0;mote<12;mote++){
    const a=t*.82+mote*2.399,rad=78+13*Math.sin(t*2+mote);
    c.globalAlpha=(.17+.2*(.5+.5*Math.sin(t*3.7+mote)))*settle;
    c.fillStyle=mote%3?'#83e5c1':'#d6e9a0';c.shadowBlur=11;
    c.beginPath();c.ellipse(Math.cos(a)*rad,-125+Math.sin(a)*rad*.72,2+Math.sin(t*3+mote)*.7,3.1,Math.cos(a)*.3,0,Math.PI*2);c.fill();
   }
   c.restore();
  }
  // Hippo's River victory signature: rolling turquoise waves and rising water droplets.
  if(f.data.id==='hippo'){
   const t=f.winT||0,settle=Math.min(1,t/.48),pulse=.5+.5*Math.sin(t*3.1);
   c.save();c.globalCompositeOperation='lighter';
   c.globalAlpha=(.24+.16*pulse)*settle;c.strokeStyle='#65e9df';c.shadowColor='#28c9c2';c.shadowBlur=19;c.lineWidth=3;
   for(let wave=0;wave<3;wave++){
    const phase=t*1.8+wave*Math.PI*.66;
    c.beginPath();c.ellipse(0,-10+wave*3,76+wave*20+12*Math.sin(phase),12+wave*3,0,0,Math.PI*2);c.stroke();
   }
   for(let drop=0;drop<9;drop++){
    const phase=t*1.35+drop*2.399;
    const x=Math.cos(phase)*(66+12*Math.sin(t*2+drop));
    const y=-92-Math.abs(Math.sin(phase*1.3))*(35+drop%3*12);
    const r=2.2+1.4*(.5+.5*Math.sin(t*4+drop));
    c.globalAlpha=(.24+.25*(.5+.5*Math.sin(t*3+drop)))*settle;
    c.fillStyle=drop%2?'#b9fff4':'#55dcd3';c.shadowBlur=12;
    c.beginPath();c.ellipse(x,y,r*.8,r*1.35,Math.sin(phase)*.3,0,Math.PI*2);c.fill();
   }
   c.globalAlpha=(.18+.12*pulse)*settle;c.strokeStyle='#a5fff2';c.lineWidth=2;c.shadowBlur=15;
   c.beginPath();c.arc(0,-145,78+9*Math.sin(t*2),Math.PI*1.08,Math.PI*1.92);c.stroke();
   c.restore();
  }
 }
 if(f.instinct&&!ghost){c.shadowColor='#5fe3ff';c.shadowBlur=26;}f._aura=(!ghost&&!f.ai&&!f.instinct&&window.KOTJ_ARMORY)?KOTJ_ARMORY.auraFor(f.data.id):null;if(f._aura){const t=performance.now()/1000,pu=.5+.5*Math.sin(t*3.2);c.save();c.globalCompositeOperation='lighter';c.save();c.translate(0,-150);c.scale(1,1.75);const R=(118+10*pu)*sizeScale/.88,gr=c.createRadialGradient(0,0,R*.35,0,0,R);gr.addColorStop(0,f._aura+'00');gr.addColorStop(.6,f._aura+(pu>.5?'ee':'bb'));gr.addColorStop(.8,f._aura+'66');gr.addColorStop(1,f._aura+'00');c.fillStyle=gr;c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.fill();c.restore();c.fillStyle=f._aura;c.shadowColor=f._aura;c.shadowBlur=8;for(let k=0;k<14;k++){const ph=(t*.5+k/14)%1,ax=Math.sin(k*2.3+t*1.3)*(70+k*3)*sizeScale/.88;c.globalAlpha=Math.sin(ph*Math.PI);c.beginPath();c.arc(ax,-20-ph*300,3.5+(k%3)*1.5,0,Math.PI*2);c.fill()}c.restore();}
 if(SPRITES[f.data.id]&&drawSprite(f)){}
 else{c.scale(sizeScale,sizeScale);drawGeneric(f,i);}
 window.__tintSrc=null;
 c.shadowBlur=0;c.restore();
 if(ghost)return;
 
 if(f.breakWindow>0){c.strokeStyle='#ffd36b';c.globalAlpha=.9;c.lineWidth=4;c.beginPath();c.arc(x,y-140,95+Math.sin(performance.now()/30)*6,0,Math.PI*2);c.stroke();c.globalAlpha=1}
 c.fillStyle='#f4e9cf';c.font='bold 12px Inter';c.textAlign='center';c.fillText((f.ai?'CPU · ':'')+f.data.name,x,470);
}
function phase(f){return f.actionTotal>0?Math.min(.999,Math.max(0,1-f.actionTime/f.actionTotal)):0}
function drawSprite(f){
 const S=SPRITES[f.data.id],A=S.anims,now=performance.now()/1000,p=phase(f),visualP=f.data.id==='leopard'&&['claw','double','bite'].includes(f.action)?Math.min(.999,p*1.12):p,ap=visualP*visualP*(3-2*visualP);let anim='idle',fr=0;
 const seq=(list,t)=>{const k=list[Math.min(list.length-1,Math.floor(t*list.length))];return k};
 // Hit sync: bend playback so each sheet's strike frame shows exactly when the move's hit lands.
 const W=(a,mv)=>{const q0=typeof SPRITE_PEAK!=='undefined'&&SPRITE_PEAK[f.data.id]&&SPRITE_PEAK[f.data.id][a],M=MOVES[mv];if(!q0||!M)return ap;const q=Math.max(.25,Math.min(.85,q0)),h=M.hits[0]/M.t;return p<h?p/h*q:q+(p-h)/(1-h)*(1-q)};
 // V2: some sheets carry generated in-between frames (2x). Time-based playback keeps the same speed and lands on the in-betweens.
 const X=a=>(SPRITE_X2[f.data.id]&&SPRITE_X2[f.data.id][a])?2:1;
 const seqX=(a,list,t)=>{const L=list.length,pos=Math.max(0,t)*L,i=Math.min(L-1,Math.floor(pos)),k=list[i];return X(a)===2?k*2+((pos-i>=.5&&i<L-1)?1:0):k};
 switch(f.action){
  case'walk':{const fwd=Math.sign(f.move||0)===f.dir;anim=fwd?'walk_forward':'walk_back';fr=A[anim][0]>16?Math.floor(f.walk*A[anim][0]/6):Math.floor(f.walk*3.2*X(anim));/* video-made walks: one two-step cycle per ~240 px so feet don't slide */break}
  case'block':anim='block';{const vb=VFPS[f.data.id]&&VFPS[f.data.id].block;fr=vb?Math.min(A.block[0]-1,Math.floor(f.blockTime*vb)):Math.min(3*X('block')+(X('block')-1),Math.floor(f.blockTime*20*X('block')));}break;
  case'claw':anim=S.claw&&A[S.claw]?S.claw:'attack_light';fr=Math.min(A[anim][0]-1,Math.floor(W(anim,'claw')*A[anim][0]));break;
  case'double':anim=S.double[f.move_&&f.move_.eagleWingCombo?Math.min(S.double.length-1,f.hitsDone):f.chain%S.double.length];fr=1+Math.floor(ap*(A[anim][0]-1));break;
  case'attack_heavy':anim='attack_heavy';fr=Math.floor(ap*A.attack_heavy[0]);break;
  case'bite':anim='bite';fr=Math.min(A.bite[0]-1,Math.floor(W('bite','bite')*A.bite[0]));break;
  case'earthslam':case'pounce':anim=S.special;fr=Math.min(A[anim][0]-1,Math.floor(W(anim,'special')*A[anim][0]));break;
  case'special_b':case'special_c':case'special_d':case'ultra_move':anim=A[f.action]?f.action:S.special;fr=Math.floor(ap*A[anim][0]);break;
  case'sx':if(f.move_&&f.move_.sx){const _r=sxFrame(f,A);anim=_r[0];fr=_r[1]}else{anim='idle';fr=0}break;
  case'ender':anim='uppercut';fr=Math.min(A.uppercut[0]-1,Math.floor(W('uppercut','ender')*A.uppercut[0]));break;
  case'shadow':{const signature=[S.shadow,'shadow_rampage','ultra_move','special_d','special_c','special_b',S.special].find(a=>a&&A[a]);if(signature){anim=signature;fr=Math.min(A[anim][0]-1,Math.floor(ap*A[anim][0]));}else{anim=S.double[Math.min(S.double.length-1,Math.floor(p*S.double.length))];fr=Math.min(A[anim][0]-1,Math.floor(ap*A[anim][0]));}break;}
  case'ultraseq':{const options=(S.ultra||[]).filter(a=>A[a]);anim=options.length?options[Math.floor(now*4)%options.length]:(A.ultra_move?'ultra_move':S.special);fr=Math.floor(now*24)%A[anim][0];break;}
  case'jump':{anim='jump';const n=A.jump[0];fr=Math.round((Math.max(-560,Math.min(560,f.vy))+560)/1120*(n-3))+1;break}
  case'hit':{
   anim=f.hitHeavy&&A.hit_heavy?'hit_heavy':'hit_light';
   const count=A[anim][0];
   fr=Math.min(count-1,Math.floor((f.hitAnimTime||0)*((VFPS[f.data.id]&&VFPS[f.data.id].hit)||Math.max(8,count*5))));
   break;
  }
  case'down':if(f.down>.35){anim=S.fall[0];fr=seqX(anim,S.fall[1],(.9-f.down)/.55)}else{anim=S.getup[0];fr=seqX(anim,S.getup[1],(.35-f.down)/.35)}break;
  case'knockdown':{anim=S.ko[0];const kr=(VFPS[f.data.id]&&VFPS[f.data.id].knockdown)||9*X(anim);fr=Math.min(S.ko[1]*(VFPS[f.data.id]&&VFPS[f.data.id].knockdown?1:X(anim)),Math.floor(f.koTime*kr));break;}
  case'finisher':{anim=A.finisher?'finisher':'victory';const n=A[anim][0];fr=Math.min(n-1,Math.floor((f.finT||0)/FIN_DUR*n));break;}
  case'victory':{anim='victory';const n=A.victory[0],rate=(VFPS[f.data.id]&&VFPS[f.data.id].victory)||8*X('victory'),wT=Math.max(0,f.winT-(f.finOff||0)),intro=Math.min(n-1,Math.floor(wT*rate));const loopStart=Math.max(0,Math.floor(n*.55));fr=wT<(n/rate)?intro:loopStart+(Math.floor((wT-n/rate)*rate)%(n-loopStart));break;}
  default:anim='idle';{const idleRate={badger:6.4,wolf:8.2,hyena:9.2,leopard:10.5,jaguar:8.8,crocodile:5.4,lion:6.8,tiger:9.4,grizzly:5.2,hippo:4.8,elephant:4.2,eagle:7.8,snake:5.8,stag:6.9,majic:7.2}[f.data.id]||8;const ir=(VFPS[f.data.id]&&VFPS[f.data.id].idle)||idleRate*X('idle');fr=Math.floor(now*ir);f._ifr=now*ir-fr};
 }
 let img=spriteImg[f.data.id][anim],meta=A[anim],sc=S.s;
 const hi=spriteHD[f.data.id]&&spriteHD[f.data.id][anim];
 if(hi&&hi.complete&&hi.naturalWidth){const T=HDT[f.data.id]||HD[f.data.id];img=hi;meta=T.anims[anim];sc=T.s*(meta[6]||1);f._lg={img,meta,sc,fr}}
 else if(f._lg&&f._lg.img.complete&&f._lg.img.naturalWidth){img=f._lg.img;meta=f._lg.meta;sc=f._lg.sc;fr=f._lg.fr} // sheet still loading: hold the last frame instead of blinking
 if(!img||!img.complete||!img.naturalWidth)return false;{const tg=fightTint(f);window.__tintSrc=tg?{img,fid:f.data.id,targets:tg}:null;}
 const [n,fw,fh,px,py,cols]=meta;const CC=cols||1e9;fr=((fr|0)%n+n)%n;
 // Species-calibrated body presence: modestly enlarges the existing HD art
 // without stretching anatomy or changing the original fighter silhouettes.
 const bodyPresence=BODY_PRESENCE[f.data.id]||1;
 // Species silhouette calibration: add width where the real animal's mass or
 // body plan calls for it, while keeping frame height and foot anchoring stable.
 const bodyWidth=BODY_WIDTH[f.data.id]||1;
 const baseW=fw/sc*bodyPresence,drawW=baseW*bodyWidth,drawH=fh/sc*bodyPresence;
 const drawX=-px-(drawW-fw/sc)*.5,drawY=-py+6-(drawH-fh/sc);
 if(f.action==='earthslam'&&ap>.5){c.save();c.globalAlpha=.8*(1-ap);c.strokeStyle='#f4bd43';c.lineWidth=7;const r=40+ap*170;c.beginPath();c.ellipse(0,-6-f.y,r,r*.2,0,0,Math.PI*2);c.stroke();c.restore();}
 const impactTint=FIGHTER_IMPACT[f.data.id]||'#fff0b0';
 if(f.hitFlash>0){
  c.filter=(typeof LITE==='function'&&LITE())?'brightness(2.1)':f.data.echo
   ?`brightness(2.15) drop-shadow(0 0 12px ${impactTint}) drop-shadow(0 0 7px rgba(150,110,255,.9))`
   :`brightness(2.15) drop-shadow(0 0 13px ${impactTint})`;
 }else{
  c.filter=f.data.echo?'grayscale(1) brightness(.55) contrast(1.25) drop-shadow(0 0 8px rgba(150,110,255,.9))':'none';
 }
 // Small anticipation, committed strike, and recovery body motion make the
 // sprite sequence read as one connected action rather than a frame swap.
 const attackAction=['claw','double','bite','earthslam','pounce','ender','shadow'].includes(f.action);
 if(attackAction){
  // Linked strikes shorten the visual wind-up and delay recovery slightly,
  // preserving the move's real hit timing while making the chain read continuously.
  const leopardLink=f.data.id==='leopard'&&f.comboLinked;
  const anticipation=1-clamp(p/(leopardLink?.10:f.comboLinked?.14:.22),0,1);
  const drive=clamp((p-(leopardLink?.075:f.comboLinked?.11:.16))/(leopardLink?.34:f.comboLinked?.40:.42),0,1);
  const recovery=clamp((p-(leopardLink?.86:f.comboLinked?.78:.68))/(leopardLink?.14:f.comboLinked?.22:.32),0,1);
  const leopardSharp=f.data.id==='leopard'&&['claw','double','bite'].includes(f.action);
  const lionKing=f.data.id==='lion',tigerKing=f.data.id==='tiger',elephantTitan=f.data.id==='elephant',eagleSky=f.data.id==='eagle',snakeSerpent=f.data.id==='snake',majicPanther=f.data.id==='majic';
  const forward=(f.action==='bite'?.12:f.action==='ender'?.16:f.action==='earthslam'?.08:.105)*(leopardSharp?1.22:1);
  // Lion: load the heavy forequarters, drive through the shoulders, then settle.
  const lionLoad=lionKing?anticipation*.045:0;
  const lionDrive=lionKing?drive*(f.action==='bite'?.105:f.action==='ender'?.13:.085):0;
  const lionSettle=lionKing?recovery*.035:0;
  // Tiger: compact spring-loaded crouch, explosive diagonal extension and a
  // quick elastic recovery. This is intentionally sharper than the lion's weight.
  const tigerCrouch=tigerKing?anticipation*.065:0;
  const tigerSnap=tigerKing?drive*(f.action==='bite'?.145:f.action==='ender'?.16:.125):0;
  const tigerRecover=tigerKing?recovery*.045:0;
  // Elephant: load the immense forequarters, drive with a slow trunk-and-tusk-led
  // surge, then absorb the landing through the whole body.
  const elephantLoad=elephantTitan?anticipation*.075:0;
  const elephantDrive=elephantTitan?drive*(f.action==='ender'?.17:f.action==='bite'?.145:.115):0;
  const elephantSettle=elephantTitan?recovery*.065:0;
  // Eagle: fold into a compact dive, spear forward through the strike, then
  // flare upward into a controlled aerial recovery.
  const eagleDive=eagleSky?anticipation*.035:0;
  const eagleStrike=eagleSky?drive*(f.action==='ender'?.19:f.action==='bite'?.16:.13):0;
  const eagleFlare=eagleSky?recovery*.075:0;
  // Snake: draw the body into a compact coil, snap forward with a short precise strike,
  // then let the long body uncoil and settle instead of using a mammalian lunge.
  const snakeCoil=snakeSerpent?anticipation*.052:0;
  const snakeStrike=snakeSerpent?drive*(f.action==='bite'?.105:f.action==='ender'?.125:.075):0;
  const snakeUncoil=snakeSerpent?recovery*.042:0;
  // MAJIC moves as a true shadow panther: low stalking compression,
  // powerful shoulder-led extension, then a controlled feline settle.
  const majicStalk=majicPanther?anticipation*.072:0;
  const majicLunge=majicPanther?drive*(f.action==='bite'?.175:f.action==='ender'?.19:.135):0;
  const majicSettle=majicPanther?recovery*.052:0;
  // Full-roster body mechanics: every species receives a distinct whole-body
  // anticipation, drive and recovery signature. These are subtle transforms
  // over the existing HD frames, not replacements or stretched sprite sheets.
  const speciesMotion={
   badger:[.050,.085,.040,5, .030], wolf:[.030,.105,.028,9,.045], hyena:[.025,.125,.020,12,.055],
   leopard:[.035,.135,.025,11,.050], jaguar:[.050,.145,.035,9,.040], crocodile:[.065,.095,.060,4,.025],
   lion:[.055,.105,.045,6,.030], tiger:[.065,.155,.040,12,.060], grizzly:[.075,.090,.070,4,.025],
   hippo:[.080,.105,.075,3,.020], elephant:[.085,.115,.080,4,.020], eagle:[.035,.165,.065,13,.070],
   snake:[.070,.115,.050,6,.035], stag:[.045,.125,.035,9,.045], dolphin:[.055,.12,.04,9,.045], majic:[.075,.175,.050,8,.065]
  }[f.data.id]||[.04,.10,.04,6,.03];
  const [speciesLoad,speciesDrive,speciesRecover,speciesShift,speciesStretch]=speciesMotion;
  const speciesLean=anticipation*speciesLoad+drive*speciesDrive-recovery*speciesRecover;
  const speciesX=(drive*speciesShift-anticipation*speciesShift*.22);
  const lean=-.035*anticipation+forward*drive-.035*recovery+lionLoad+lionDrive-lionSettle-tigerCrouch+tigerSnap-tigerRecover+elephantLoad+elephantDrive-elephantSettle-eagleDive+eagleStrike-eagleFlare+majicStalk+majicLunge-majicSettle+speciesLean*.42;
  const stretch=1+(.055*(leopardSharp?1.18:1))*drive-.025*anticipation-.025*recovery+(lionKing?drive*.025:0)+(tigerKing?drive*.055-anticipation*.025:0)+(elephantTitan?drive*.018-anticipation*.018:0)+(eagleSky?drive*.075-recovery*.025:0)+(snakeSerpent?drive*.035-anticipation*.018:0)+(majicPanther?drive*.065-anticipation*.028-recovery*.018:0)+drive*speciesStretch*.24-anticipation*speciesLoad*.08-recovery*speciesRecover*.05;
  const squash=1-.035*drive+.025*anticipation+.025*recovery+(lionKing?anticipation*.035+recovery*.018:0)+(tigerKing?anticipation*.055+recovery*.012:0)+(elephantTitan?anticipation*.055+recovery*.035:0)+(eagleSky?anticipation*.035+recovery*.045:0)+(snakeSerpent?anticipation*.065+recovery*.025:0)+(majicPanther?anticipation*.075+recovery*.035:0);
  c.save();
  c.translate(speciesX+(lionKing?drive*7-anticipation*2:0)+(tigerKing?drive*11-anticipation*5:0)+(elephantTitan?drive*5-anticipation*3:0)+(eagleSky?drive*13-anticipation*4:0)+(snakeSerpent?drive*5-anticipation*2:0),-145+drive*(tigerKing?9:elephantTitan?6:eagleSky?13:4)-anticipation*(tigerKing?5:elephantTitan?8:eagleSky?3:2)-eagleFlare*18+(snakeSerpent?snakeCoil*10-snakeStrike*8+snakeUncoil*5:0));
  c.rotate(lean);
  c.scale(stretch,squash);
  c.translate(0,145);
  c.drawImage(img,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);
  c.restore();
 }else if(f.action==='idle'||f.action==='breathing'){
  // Species-specific idle cadence: subtle breathing, balance shifts and
  // alertness rhythms. The sprite art stays untouched and the feet remain
  // anchored, so this adds life without rubbery stretching or sliding.
  const idleProfile={
   badger:[.010,.010,.010,1.7], wolf:[.014,.014,.018,2.2], hyena:[.018,.016,.024,2.8],
   leopard:[.012,.009,.018,3.0], jaguar:[.011,.010,.014,2.5], crocodile:[.006,.006,.008,1.0],
   lion:[.014,.010,.012,1.45], tiger:[.012,.009,.016,2.7], grizzly:[.018,.012,.009,1.15],
   hippo:[.021,.013,.005,.78], elephant:[.012,.006,.005,.8], eagle:[.009,.012,.025,2.1],
   snake:[.009,.014,.010,1.35], stag:[.010,.009,.016,1.8], dolphin:[.013,.010,.015,2.2], majic:[.016,.012,.018,1.35]
  }[f.data.id]||[.01,.01,.01,1.5];
  const [breath,sway,tilt,rate]=idleProfile,cycle=now*rate+(Math.max(0,game.fighters.indexOf(f))*.83),wave=Math.sin(cycle),slow=Math.sin(cycle*.47+.8);
  const sx=1+breath*(.35+.65*Math.sin(cycle*.72)),sy=1-breath*(.35+.65*Math.sin(cycle*.72));
  const lean=wave*tilt*.22,shift=slow*sway*18;
  c.save();c.translate(shift,-py+6);c.rotate(lean);c.scale(sx,sy);c.translate(-shift,py-6);
  c.drawImage(img,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);
  // V2: blend into the next idle frame so breathing flows instead of ticking
  const ifr=f._ifr||0;if(ifr>.04){const ga=c.globalAlpha;c.globalAlpha=ga*ifr;c.drawImage(img,(((fr+1)%n)%CC)*fw,Math.floor(((fr+1)%n)/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);c.globalAlpha=ga}
  c.restore();
 }else if(f.action==='hit'&&f.data.id==='lion'){
  // A lion absorbs impact through its shoulders, then recoils as a heavy cat.
  const hit=clamp((f.hitAnimTime||0)/.28,0,1),pulse=Math.sin(hit*Math.PI);
  c.save();c.translate(-f.dir*(5+7*pulse),-145);c.rotate(-f.dir*(.035+.055*pulse));
  c.scale(1-.025*pulse,1+.018*pulse);c.translate(0,145);
  c.drawImage(img,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);c.restore();
 }else if(f.action==='hit'&&f.data.id==='tiger'){
  // The tiger gives ground in a quick springy recoil, then snaps back to guard.
  const hit=clamp((f.hitAnimTime||0)/.24,0,1),pulse=Math.sin(hit*Math.PI);
  c.save();c.translate(-f.dir*(9+10*pulse),-145-pulse*3);c.rotate(-f.dir*(.06+.075*pulse));
  c.scale(1-.04*pulse,1+.025*pulse);c.translate(0,145);
  c.drawImage(img,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);c.restore();
 }else if(f.action==='hit'&&f.data.id==='eagle'){
  // Aerial predator recoil: the wings/body give way, then the bird regains lift.
  const hit=clamp((f.hitAnimTime||0)/.26,0,1),pulse=Math.sin(hit*Math.PI);
  c.save();c.translate(-f.dir*(7+8*pulse),-145-pulse*5);c.rotate(-f.dir*(.075+.045*pulse));
  c.scale(1-.035*pulse,1+.045*pulse);c.translate(0,145);
  c.drawImage(img,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);c.restore();
 }else if(f.action==='hit'&&f.data.id==='majic'){
  // MAJIC absorbs impact through the forequarters, then recoils like a powerful cat.
  const hit=clamp((f.hitAnimTime||0)/.27,0,1),pulse=Math.sin(hit*Math.PI);
  c.save();c.translate(-f.dir*(6+9*pulse),-145-pulse*2);c.rotate(-f.dir*(.045+.065*pulse));
  c.scale(1-.03*pulse,1+.022*pulse);c.translate(0,145);
  c.drawImage(img,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);c.restore();
 }else if(f.action==='hit'&&f.data.id==='elephant'){
  // Heavy elephant recoil: the head and forequarters dip, then the body settles.
  const hit=clamp((f.hitAnimTime||0)/.34,0,1),pulse=Math.sin(hit*Math.PI);
  c.save();c.translate(-f.dir*(3+5*pulse),-145-pulse*7);c.rotate(-f.dir*(.018+.035*pulse));
  c.scale(1-.018*pulse,1+.032*pulse);c.translate(0,145);
  c.drawImage(img,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);c.restore();
 }else if(f.action==='hit'){
  // Species-tuned recoil for the remaining roster: low animals compress,
  // agile hunters give ground sharply, and heavyweight bodies absorb impact.
  const hit=clamp((f.hitAnimTime||0)/.30,0,1),pulse=Math.sin(hit*Math.PI);
  const recoil={badger:[5,.045,.025],wolf:[8,.060,.035],hyena:[10,.075,.040],leopard:[11,.070,.045],jaguar:[7,.055,.035],crocodile:[4,.025,.020],grizzly:[4,.030,.018],hippo:[3,.018,.015],stag:[7,.050,.030],snake:[5,.035,.025],dolphin:[8,.055,.035]}[f.data.id]||[6,.04,.025];
  c.save();c.translate(-f.dir*(recoil[0]+recoil[0]*.45*pulse),-145-pulse*(f.data.id==='snake'?2:4));c.rotate(-f.dir*(recoil[1]+recoil[2]*pulse));
  c.scale(1-.018*pulse,1+.022*pulse);c.translate(0,145);
  c.drawImage(img,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);c.restore();
 }else{
  c.drawImage(img,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,drawX,drawY,drawW,drawH);
 }
 c.filter='none';
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

addUnlocked();if(unlockedNew().includes('dolphin')&&!roster.includes(DOLPHIN)){const i=roster.indexOf(MAJIC);i>=0?roster.splice(i,0,DOLPHIN):roster.push(DOLPHIN)}if(secretUnlocked()&&!roster.includes(MAJIC))roster.push(MAJIC);
forgottenMenu();
render();show('menu');updateGuide();
addEventListener('resize',()=>{cam.snap=true});addEventListener('orientationchange',()=>{cam.snap=true;setTimeout(()=>{cam.snap=true},300)});
window.__kotj={fx:(i,st)=>{const f=game&&game.fighters[i],o=game&&game.fighters[1-i];if(f)pBurst(f,st||'start',st==='hit'&&o?o.x-f.dir*20:f.x,st==='hit'&&o?400+o.y-160:300,1)},rise:()=>playRise(()=>show('menu')),get game(){return game},get tower(){return tower},arena:(i)=>{arena=ARENAS[i]},start:(m,a,b)=>{mode=m;picks=[roster.find(r=>r.id===a),roster.find(r=>r.id===b)];if(m==='tower'){tower={kind:'tower',player:picks[0],ladder:roster.filter(f=>BASE_IDS.includes(f.id)&&f.id!==a),index:0};picks[1]=tower.ladder[0];arena=towerArena()}start()},kb,sound:v=>{soundOn=v},finish:()=>finish(),towerFinal:()=>{tower.index=tower.ladder.length-1;picks=[tower.player,tower.ladder[tower.index]];arena=towerArena();start()}};
(()=>{const w=(id,fn)=>{const e=document.getElementById(id);if(e)e.onclick=fn};
 w('so-sound',()=>{$('sound').click();selOpts(true)});w('so-blood',()=>{document.querySelector('.blood-btn').click();selOpts(true)});w('so-gfx',()=>{setGfx(GFX==='sharp'?'auto':'sharp');selOpts(true)});w('so-full',()=>$('fullscreen').click());w('so-close',()=>selOpts(false))})();
/* ---------- V2 Power Moves & Effects (drawn, recognizable effects; no damage/timing changes) ---------- */
const PFX={
 lion:{a:'#ff9a2a',b:'#ffe08a',sc:'#ff8a1a',start:['spirit:rise','flames','firewave','roar'],hit:['flameburst','gash','embers','shock'],gash:3,gc:'#ffd36b'},
 tiger:{a:'#ff7a2a',b:'#ffd08a',sc:'#ff6a1a',start:['spirit:charge','flames'],hit:['gash','flameburst','embers'],gash:3,gc:'#ff9a3a'},
 jaguar:{a:'#2fc3a8',b:'#0f2422',sc:'#2fffd0',start:['dark','eyes','after','smoke'],hit:['spirit:charge','gash','smoke'],gash:3,gc:'#7fffe6',after:'brightness(.45) sepia(1) hue-rotate(120deg) saturate(2.5)'},
 leopard:{a:'#9ce7ff',b:'#ffffff',start:['frostcone','frostpatch','flakes'],hit:['icecluster','freeze','shards','flakeburst'],gash:0},
 wolf:{a:'#7fb3ff',b:'#e8f2ff',sc:'#8fc8ff',start:['moon','spirit:rise','howl','ghostpack'],hit:['gash','spirit'],gash:3,gc:'#cfe3ff',after:'brightness(1.2) saturate(.2) sepia(1) hue-rotate(170deg) saturate(3)'},
 hyena:{a:'#ff5a3a',b:'#ffcf6b',sc:'#ff4a2a',start:['pack','cackle'],hit:['gash','cackle','dust','embers'],gash:3,gc:'#ff8a5a'},
 badger:{a:'#c9935a',b:'#6b4a2a',sc:'#e0a060',start:['eruption'],hit:['cracks','rocks','dust'],gash:0},
 grizzly:{a:'#c0442e',b:'#c99a70',sc:'#ff6a3a',start:['spirit:rise','dust'],hit:['bearhug','fissure','rocks','cracks'],gash:4,gc:'#ff6a4a'},
 crocodile:{a:'#3fd2b0',b:'#d8fbff',sc:'#3fe0c0',start:['pool'],hit:['vortex','splash'],gash:0},
 hippo:{a:'#4aa9e8',b:'#d6f1ff',sc:'#5ab9f8',start:['spirit:rise','tidal'],hit:['splash','wave','shock'],gash:0},
 elephant:{a:'#c6b7a0',b:'#8a7356',sc:'#ffe2b0',start:['spirit:rise','trumpet','stampede'],hit:['fissure','cracks','rocks','quake'],gash:0,big:1.4,sh2:300},
 eagle:{a:'#ffe08a',b:'#ffffff',sc:'#ffe9a0',start:['tornado','feathers','wind'],hit:['spirit:dive','featherburst','gash'],gash:3,gc:'#ffffff'},
 snake:{a:'#8fe04a',b:'#2f6b1a',start:['kcobra'],hit:['kstrike','venom','poison'],gash:0},
 stag:{a:'#9fd86a',b:'#ffe08a',sc:'#a8ff6a',start:['spirit:rise','leafstorm'],hit:['vines','leafburst','shock'],gash:0},
 dolphin:{a:'#4fc3ff',b:'#e4f9ff',sc:'#6fdcff',start:['leap','spirit:rise','drops'],hit:['splash','drops','shock'],gash:0},
 majic:{a:'#b46bff',b:'#7fe6ff',sc:'#b46bff',start:['after','portal','spirit:rise','skybolts'],hit:['bolts','icicles','shock'],gash:0,after:'brightness(.7) saturate(2) hue-rotate(240deg)',sh2:300}
};
const PFX_NORMAL=new Set(['claw','double','bite','block','grab','throw']);
const R=(a,b)=>a+Math.random()*(b-a);
function P(o){o.t=0;o._n=1;game.fx.push(o)}
// Spirit heads now appear as a badge by the attacker's health bar instead of rising out of the fighter.
const _hsLast=[0,0];
function HS(f,o){const side=game.fighters.indexOf(f);if(side<0)return;const now=performance.now();if(now-_hsLast[side]<700)return;_hsLast[side]=now;
 const id=o.id||f.data.id,col=o.color||'#ffd36b';const hud=document.querySelectorAll('#fight .player-hud')[side];if(!hud)return;
 let el=hud.querySelector('.hud-spirit');if(!el){el=document.createElement('div');el.className='hud-spirit';el.innerHTML='<img alt="">';hud.appendChild(el)}
 const img=el.firstChild;img.src='assets/fx/spirit-'+id+'.webp?v=13';img.style.filter=o.filter||'none';el.style.setProperty('--sp',col);
 el.classList.remove('on');void el.offsetWidth;setTimeout(()=>el.classList.add('on'),Math.round((o.delay||0)*1000));}
// ---- Realistic effect images (assets/fx/real): real fire, snow, ice, water, embers, smoke, venom, leaves, feathers, rocks, bear arm ----
const RT={};{const V='?v=1';for(const n of['fire','snow','ice','water','ember','smoke','venom','leaf','feather','rock']){RT[n]=[];for(let i=0;i<9;i++){const im=new Image();im.decoding='async';im.src='assets/fx/real/'+n+'-'+i+'.webp'+V;RT[n].push(im)}}
 RT.paw=new Image();RT.paw.src='assets/fx/real/paw.webp'+V}
const _rtOk=im=>im&&im.complete&&im.naturalWidth>0;
function rtPick(p,n,idx){if(p._tn!==n){p._tn=n;p._ti=idx?idx[Math.floor(Math.random()*idx.length)]:Math.floor(Math.random()*9);p._tf=Math.random()<.5?-1:1}const im=RT[n][p._ti];return _rtOk(im)?im:null}
function rtDraw(im,size,flip){const s=size/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*s,h=im.naturalHeight*s;if(flip<0)c.scale(-1,1);c.drawImage(im,-w/2,-h/2,w,h)}
const _rtTint=new Map();
function rtTinted(im,col){const key=im.src+col;let cv=_rtTint.get(key);if(cv)return cv;cv=document.createElement('canvas');cv.width=im.naturalWidth;cv.height=im.naturalHeight;const x=cv.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.globalAlpha=.78;x.fillStyle=col;x.fillRect(0,0,cv.width,cv.height);_rtTint.set(key,cv);if(_rtTint.size>160)_rtTint.delete(_rtTint.keys().next().value);return cv}
function rtDrawC(cv,size,flip){const s=size/Math.max(cv.width,cv.height),w=cv.width*s,h=cv.height*s;if(flip<0)c.scale(-1,1);c.drawImage(cv,-w/2,-h/2,w,h)}
const _isFire=col=>/^#ff[7-9a-f]/i.test(col||'');
// draws a particle with a real image; returns false to fall back to the drawn shape
function rtFx(p,k,pr){let im;
 switch(p.sh){
 case'flame':if(!(im=rtPick(p,'fire')))return false;c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,k*1.5)*.95;c.translate(p.x,p.y-p.r*.8);c.rotate(Math.sin(p.t*14+p._ti)*.08);rtDraw(im,p.r*3.4*(.65+.35*k),p._tf);return true;
 case'flake':if(!(im=rtPick(p,'snow')))return false;c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,k*1.6);c.translate(p.x,p.y);c.rotate(p.rot||0);rtDraw(im,p.r*2.5,1);return true;
 case'shard':if(!(im=rtPick(p,'ice')))return false;c.globalAlpha=Math.min(1,k*1.4);c.translate(p.x,p.y);c.rotate(p.rot||0);rtDraw(im,p.r*2.8,p._tf);c.globalCompositeOperation='lighter';c.globalAlpha*=.35;rtDraw(im,p.r*2.8,1);return true;
 case'leaf':if(!(im=rtPick(p,'leaf',p.color==='#5ea83a'?[0,1,2]:null)))return false;c.globalAlpha=Math.min(1,k*1.8);c.translate(p.x,p.y);c.rotate(p.rot||0);c.scale(1,.35+.65*Math.abs(Math.cos((p.rot||0)*1.7)));rtDraw(im,p.r*2.3,p._tf);return true;
 case'feather':if(!(im=rtPick(p,'feather',p.color==='#ffffff'?[0,1,2,6,7,8]:[3,4,5])))return false;c.globalAlpha=Math.min(1,k*1.8);c.translate(p.x+Math.sin(p.sway||0)*8,p.y);c.rotate((p.rot||0)+Math.sin(p.sway||0)*.5);rtDraw(im,p.r*2.7,p._tf);return true;
 case'rock':if(!(im=rtPick(p,'rock')))return false;c.globalAlpha=Math.min(1,k*2);c.translate(p.x,p.y);c.rotate(p.rot||0);rtDraw(im,p.r*2.7,p._tf);return true;
 case'puff':{if(!(im=rtPick(p,'smoke')))return false;c.globalAlpha=Math.min(1,k*(p.alpha||.35)*2.4);c.translate(p.x,p.y);c.rotate(p._ti*.7);rtDrawC(rtTinted(im,p.color||'#ffffff'),p.r*2.9,p._tf);return true}
 case'wisp':{if(!(im=rtPick(p,'smoke')))return false;c.globalCompositeOperation='lighter';c.globalAlpha=k*.6;c.translate(p.x,p.y);rtDrawC(rtTinted(im,p.color||'#ffffff'),p.r*2.6,p._tf);return true}
 case'drop':{const ember=p.glow&&_isFire(p.color),ven=p.glow&&!ember;
  if(!(im=ember?rtPick(p,'ember',[3,4,5,6,8,0,2]):ven?rtPick(p,'venom',[0,4,7,8,3]):rtPick(p,'water',[6,7,8])))return false;
  c.translate(p.x,p.y);if(ember){c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,k*1.4);c.rotate(p._ti);rtDraw(im,p.r*11,p._tf);return true}
  c.globalAlpha=Math.min(1,k*1.5);if(ven)c.globalCompositeOperation='lighter';c.rotate(Math.atan2(p.vy||1,p.vx||0)-1.5708);rtDraw(im,p.r*(ven?3.6:3.4),1);return true}
 case'sheet':{if(!(im=rtPick(p,'water',[0,1,2])))return false;c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,k*1.6);c.translate(p.x,p.y);const w=(110+pr*170)*p.big,s=w/im.naturalWidth;c.scale(p._tf,1+pr*.3);c.drawImage(im,-w/2,-im.naturalHeight*s,w,im.naturalHeight*s);return true}
 case'vortex':{const a=RT.water;if(!_rtOk(a[3])||!_rtOk(a[4]))return false;c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,k*1.5);c.translate(p.x,p.y);c.scale(1,.55);
  for(let s=0;s<3;s++){const an=pr*7+s*2.09+(p._sd||(p._sd=Math.random()*6)),rad=(40+pr*70)*p.big;c.save();c.translate(Math.cos(an)*rad,Math.sin(an)*rad);c.rotate(an+1.57);rtDraw(a[3+s],(120+pr*60)*p.big,1);c.restore()}return true}
 case'wave':{const im=RT.water[[3,4,5][(p._wi??(p._wi=Math.floor(Math.random()*3)))]];if(!_rtOk(im))return false;c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,k*1.5);c.translate(p.x+p.dir*pr*260*p.big,p.y-50*p.big);c.scale(p.dir,1);c.rotate(-.35);rtDraw(im,(170-pr*50)*p.big,1);return true}
 case'rt':{if(!(im=rtPick(p,p.tex,p.idx)))return false;c.globalCompositeOperation=p.add&&!p.tint?'lighter':'source-over';c.globalAlpha=Math.min(1,k*1.6)*(p.alpha||1);c.translate(p.x,p.y);c.rotate(p.rot||0);if(p.tint)rtDrawC(rtTinted(im,p.tint),p.r*(1+(p.grow||0)*pr),p._tf);else rtDraw(im,p.r*(1+(p.grow||0)*pr),p._tf);return true}
 case'proj':{const T={venom:['venom',[0,4,7]],wind:['smoke',null],ice:['ice',null],fire:['fire',null],water:['water',[3,4,5]]}[p.tex]||['smoke',null];if(!(im=rtPick(p,T[0],T[1])))return false;
  const e=pr<1?1-Math.pow(1-pr,2):1,x=p.x+(p.tx-p.x)*e,y=p.y+(p.ty-p.y)*e-Math.sin(e*3.14)*(p.tex==='venom'?50:0);c.globalCompositeOperation='lighter';
  for(let s=4;s>=0;s--){const ee=Math.max(0,e-s*.06),xx=p.x+(p.tx-p.x)*ee,yy=p.y+(p.ty-p.y)*ee-Math.sin(ee*3.14)*(p.tex==='venom'?50:0);c.save();c.globalAlpha=Math.min(1,k*2)*(s?.18:.95);c.translate(xx,yy);c.rotate(p.tex==='wind'?0:Math.atan2(p.ty-p.y,p.tx-p.x));c.scale(p.tex==='wind'?2.4*p.dir:1,p.tex==='wind'?.45:1);
   if(p.tex==='wind')rtDrawC(rtTinted(im,'#e8f6ff'),90,1);else rtDraw(im,p.tex==='venom'?70:80,1);c.restore()}return true}
 case'goldaura':{const f=game.fighters[p.fi];if(!f)return true;const H=f._top!=null?400+f.y-f._top:300,cx=f.x,cy=400+f.y-H*.48,a=Math.sin(Math.min(1,pr)*3.14);c.globalCompositeOperation='lighter';
  const gr=c.createRadialGradient(cx,cy,H*.15,cx,cy,H*.7);gr.addColorStop(0,'rgba(255,214,110,0)');gr.addColorStop(.55,'rgba(255,200,80,'+(.35*a)+')');gr.addColorStop(1,'rgba(255,160,40,0)');c.fillStyle=gr;c.beginPath();c.ellipse(cx,cy,H*.55,H*.7,0,0,7);c.fill();
  for(let s=0;s<3;s++)if(Math.random()<.5)P({kind:'pp',sh:'drop',x:cx+R(-H*.4,H*.4),y:cy+R(-H*.4,H*.5),vx:R(-30,30),vy:R(-160,-60),g:-40,r:R(2,4),life:R(.5,.9),color:'#ffd36b',glow:1});return true}
 case'bearhug':{im=RT.paw;if(!_rtOk(im))return true;const close=Math.min(1,p.t/.22),sq=p.t>.22?Math.sin((p.t-.22)*38)*Math.max(0,1-(p.t-.22)*2.2):0;
  const W=245*p.big,H=W*im.naturalHeight/im.naturalWidth,gap=(215-close*170)*p.big-sq*8;c.globalAlpha=Math.min(1,k*2.2,p.t*8);
  for(const s of[-1,1]){c.save();c.translate(p.x+s*gap,p.y+(s<0?-18:16)*p.big);c.scale(-s,1);c.rotate(s<0?.06:-.05);c.drawImage(im,-W,-H/2,W,H);c.restore()}return true}
 }return false}
// Hippo's tidal wave: real breaking water along the crest over the drawn wave
{const _dT=dTidal;dTidal=function(p,k){c.save();c.globalAlpha*=.55;_dT(p,k);c.restore();const W=RT.water;
 const m=Math.min(1,p.t/(p.life*.7)),mm=m*m*(3-2*m),front=p.x+(p.x1-p.x)*mm,H=230*Math.min(1,p.t/.15)*(1-Math.max(0,(p.t-p.life*.75)/(p.life*.25))*.85);
 c.save();c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,k*1.6);
 for(let i=0;i<6;i++){const im=W[[3,4,5,0,1,2][i]];if(!_rtOk(im))continue;c.save();c.translate(front-p.dir*i*48,398-H*(.9-i*.11));c.scale(p.dir,1);c.rotate(-.25-i*.05);rtDraw(im,H*(1.05-i*.1)+40,1);c.restore()}
 c.restore()}}
function pBurst(f,stage,x,y,big){
 const th0=PFX[f.data.id];if(!th0||!game)return;const _sx=f.move_&&f.move_.sx;const th=_sx&&(_sx.fs||_sx.fh)?{...th0,start:_sx.fs||[],hit:_sx.fh||th0.hit}:th0;const d=f.dir,B=big*(th.big||1);
 for(const k of (stage==='start'?th.start:th.hit)){
  if(k==='goldaura'){P({kind:'pp',sh:'goldaura',fi:game.fighters.indexOf(f),life:1.1,color:th.a});continue}
  if(k.startsWith('proj:')){const o=game.fighters[1-game.fighters.indexOf(f)],tex=k.slice(5);P({kind:'pp',sh:'proj',tex,x:f.x+d*90,y:400+f.y-175,tx:o?o.x-d*40:f.x+d*500,ty:o?400+o.y-160:400+f.y-160,dir:d,life:.46});continue}
  if(k==='dustwave'){const o=game.fighters[1-game.fighters.indexOf(f)],x1=o?o.x:f.x+d*420;for(let s=0;s<7;s++){const xx=f.x+(x1-f.x)*(s+1)/7;P({kind:'pp',sh:'puff',x:xx,y:394,vx:d*40,vy:R(-50,-15),r:R(16,24)*B,grow:50,life:.7,delay:s*.05,color:'#b89a70',alpha:.4});P({kind:'pp',sh:'rock',x:xx,y:396,vx:R(-120,120),vy:R(-420,-200),g:1700,r:R(6,10),rot:R(0,6),vr:R(-9,9),life:.8,delay:s*.05,color:'#6b5440'})}continue}
  if(k==='mud'){for(let s=0;s<3;s++)P({kind:'pp',sh:'rt',tex:'water',idx:[0,1,2,3,4,5],tint:'#6b4a2a',x:x+R(-60,60),y:y+R(-40,30),rot:R(-.5,.5),r:R(140,200)*B,grow:.3,life:.55,delay:s*.04});for(let s=0;s<6;s++)P({kind:'pp',sh:'puff',x:x+R(-60,60),y:396,vx:R(-160,160),vy:R(-140,-40),r:R(14,22),grow:40,life:.6,color:'#5a3f24',alpha:.45});continue}
  if(k==='grass'){const o=game.fighters[1-game.fighters.indexOf(f)];for(let s=0;s<16;s++){const gx=(o&&stage==='hit'?o.x:f.x)+R(-160,160);P({kind:'pp',sh:'leaf',x:gx,y:398,vx:R(-90,90),vy:R(-520,-260),g:900,drag:.97,rot:R(-1.9,-1.2),vr:R(-3,3),r:R(14,22),life:R(.8,1.1),delay:s*.02,color:'#5ea83a'})}continue}
  if(k==='bearhug'){const now=performance.now();if(now-(f._bhT||0)>900){f._bhT=now;P({kind:'pp',sh:'bearhug',x,y:y+10,life:.85,big:B});game.shake=Math.max(game.shake,.22);for(let i=0;i<5;i++)P({kind:'pp',sh:'puff',x:x+R(-70,70),y:y+R(-30,40),vx:R(-90,90),vy:R(-50,0),r:R(14,22),grow:40,life:.7,delay:.2,color:'#b89a70',alpha:.35})}continue}
  if(k==='venom')for(let i=0;i<3;i++)P({kind:'pp',sh:'rt',tex:'venom',idx:[1,5,6,8,2],add:1,x:x+R(-40,40),y:y+R(-30,20),rot:R(0,6.28),r:R(70,110)*B,grow:.4,life:.5,delay:i*.04});
  if(k==='splash')for(let i=0;i<2;i++)P({kind:'pp',sh:'rt',tex:'water',idx:[3,4,5],add:1,x:x+R(-50,50),y:y-R(30,80),rot:R(-.4,.4),r:R(150,210)*B,grow:.35,life:.45,delay:i*.05});
  if(k==='shards'||k==='icecluster')for(let i=0;i<4;i++)P({kind:'pp',sh:'rt',tex:'snow',add:1,x:x+R(-60,60),y:y+R(-60,40),rot:R(0,6.28),r:R(26,40)*B,grow:.3,life:.6,delay:i*.03});
  if(k==='flames')for(let i=0;i<14;i++)P({kind:'pp',sh:'flame',x:f.x+R(-70,70),y:400+f.y-R(0,160),vx:R(-20,20),vy:R(-170,-80),r:R(14,26),life:R(.45,.8),delay:i*.02,a:th.a,b:th.b});
  else if(k==='flameburst')for(let i=0;i<16;i++){const an=R(0,6.28);P({kind:'pp',sh:'flame',x,y,vx:Math.cos(an)*R(120,320),vy:Math.sin(an)*R(120,320)-120,r:R(14,24)*B,life:R(.35,.6),a:th.a,b:th.b})}
  else if(k==='roar')for(let i=0;i<3;i++)P({kind:'pp',sh:'roar',x:f.x+d*60,y:400+f.y-190,dir:d,delay:i*.09,life:.55,color:i%2?th.b:th.a,big:B});
  else if(k==='howl')for(let i=0;i<3;i++)P({kind:'pp',sh:'roar',x:f.x+d*50,y:400+f.y-220,dir:d,delay:i*.11,life:.6,color:th.b,big:B,up:1});
  else if(k==='gash')P({kind:'pp',sh:'gash',x,y,dir:d,n:th.gash||3,life:.55,color:th.gc||th.b,big:B});
  else if(k==='shock')P({kind:'pp',sh:'ring',x,y,life:.4,color:th.a,big:B});
  else if(k==='smoke'||k==='dust'||k==='breath'||k==='spirit'){const n=k==='breath'?8:7;for(let i=0;i<n;i++)P({kind:'pp',sh:k==='spirit'?'wisp':'puff',x:(k==='breath'?f.x+d*R(40,140):x)+R(-50,50),y:(k==='breath'?400+f.y-200:k==='dust'?396:y)+R(-30,20),vx:(k==='breath'?d*R(80,200):R(-120,120)),vy:k==='spirit'?R(-160,-60):R(-60,-5),r:R(10,18)*B,grow:R(25,50),life:R(.45,.8),color:k==='breath'?'#e8fbff':k==='spirit'?th.a:k==='dust'?th.b||'#b89a70':th.a,alpha:k==='dust'?.4:k==='spirit'?.6:.32})}
  else if(k==='flakes')for(let i=0;i<14;i++)P({kind:'pp',sh:'flake',cx:f.x,cy:400+f.y-160,ang:R(0,6.28),rad:R(60,130),av:R(2.5,4.5)*(i%2?1:-1),vr:R(-3,3),rot:R(0,6),r:R(7,13),life:R(.6,.9),orbit:1});
  else if(k==='flakeburst')for(let i=0;i<18;i++){const an=R(0,6.28);P({kind:'pp',sh:'flake',x,y,vx:Math.cos(an)*R(150,420),vy:Math.sin(an)*R(150,420)-80,g:240,drag:.95,rot:R(0,6),vr:R(-6,6),r:R(6,14)*B,life:R(.6,1)})}
  else if(k==='shards')for(let i=0;i<9;i++)P({kind:'pp',sh:'shard',x,y,vx:R(-460,460),vy:R(-460,180),g:500,r:R(9,16)*B,rot:R(0,6),vr:R(-10,10),life:R(.4,.7),color:i%2?'#bff4ff':'#ffffff'});
  else if(k==='icicles'){const n=7;for(let i=0;i<n;i++)P({kind:'pp',sh:'icicle',x:x+(i-(n-1)/2)*R(26,34)*B,y:398,h:R(70,150)*B*(1-Math.abs(i-(n-1)/2)/n*.9),w:R(16,24)*B,lean:R(-.25,.25),life:.85,delay:Math.abs(i-(n-1)/2)*.03,c1:f.data.id==='majic'?'#d9b8ff':'#e9fbff',c2:f.data.id==='majic'?'#7a3fd0':'#4fc3e8'})}
  else if(k==='after')P({kind:'pp',sh:'aftermark',fi:game.fighters.indexOf(f),life:.9,filter:th.after});
  else if(k==='cackle')for(let i=0;i<3;i++)P({kind:'pp',sh:'ha',x:f.x+R(-60,60)+d*30,y:400+f.y-R(230,300),vy:-70,life:.7,delay:i*.12,text:i%2?'HA!':'HA HA!',color:th.b});
  else if(k==='bolts')for(let i=0;i<4;i++)P({kind:'pp',sh:'bolt',x:x+R(-90,90),y:y-R(60,160),ang:R(1.1,2.0),len:R(120,200)*B,life:R(.18,.3),delay:i*.05,color:i%2?th.a:th.b,seed:Math.random()});
  else if(k==='clods'||k==='rocks'){const n=k==='rocks'?12:6;for(let i=0;i<n;i++)P({kind:'pp',sh:'rock',x:(k==='clods'?f.x:x)+R(-40,40),y:396,vx:R(-380,380),vy:R(-640,-260),g:1700,r:R(6,13)*B,rot:R(0,6),vr:R(-9,9),life:R(.7,1.1),color:i%3?'#6b5440':th.b||'#8a7356'})}
  else if(k==='cracks')P({kind:'pp',sh:'cracks',x,y:399,life:1.1,big:B,seed:Math.random(),color:f.data.id==='elephant'?'#ffb35a':'#ffcf7a'});
  else if(k==='quake'){P({kind:'pp',sh:'gring',x,y:398,life:.6,color:th.a,big:B});game.shake=Math.max(game.shake,.3)}
  else if(k==='drops')for(let i=0;i<10;i++)P({kind:'pp',sh:'drop',x:f.x+R(-50,50),y:400+f.y-R(40,200),vx:R(-160,160),vy:R(-260,-60),g:1300,r:R(4,7),life:R(.5,.8),color:th.b});
  else if(k==='splash'){P({kind:'pp',sh:'sheet',x,y:398,life:.55,big:B,color:th.a});for(let i=0;i<22;i++){const an=R(-2.6,-.5);P({kind:'pp',sh:'drop',x:x+R(-30,30),y:396,vx:Math.cos(an)*R(200,520)*B,vy:Math.sin(an)*R(380,760)*B,g:1600,r:R(4,9)*B,life:R(.6,1),color:i%3?th.b:th.a})}}
  else if(k==='wave')for(const s of[-1,1])P({kind:'pp',sh:'wave',x,y:398,dir:s,life:.7,big:B,color:th.a});
  else if(k==='vortex')for(let i=0;i<3;i++)P({kind:'pp',sh:'vortex',x,y,life:.6,delay:i*.07,big:B,color:i%2?th.b:th.a});
  else if(k==='feathers')for(let i=0;i<10;i++)P({kind:'pp',sh:'feather',x:f.x+R(-90,90),y:400+f.y-R(80,260),vx:R(-120,120),vy:R(-90,20),g:90,drag:.97,rot:R(0,6),sway:R(0,6),r:R(14,22),life:R(.9,1.4),color:i%3?'#ffffff':'#c79a5a'});
  else if(k==='featherburst')for(let i=0;i<14;i++){const an=R(0,6.28);P({kind:'pp',sh:'feather',x,y,vx:Math.cos(an)*R(150,380),vy:Math.sin(an)*R(150,380)-100,g:120,drag:.95,rot:R(0,6),sway:R(0,6),r:R(14,22)*B,life:R(.9,1.4),color:i%3?'#ffffff':'#c79a5a'})}
  else if(k==='wind')for(let i=0;i<6;i++)P({kind:'pp',sh:'gust',x:f.x-d*R(0,60),y:400+f.y-R(40,260),dir:d,len:R(90,170),life:R(.3,.45),delay:i*.04});
  else if(k==='cobra')P({kind:'pp',sh:'cobra',x:f.x+d*30,y:398,floor:1,dir:d,life:.85,color:th.a,sz:1.7});
  else if(k==='fangs'){P({kind:'pp',sh:'fangs',x,y,dir:d,life:.6,color:'#f4ffe8'});P({kind:'pp',sh:'cobra',x:x-d*120,y:398,floor:1,dir:d,life:.45,color:th.a,strike:1,sz:1.5})}
  else if(k==='venom'){for(let i=0;i<14;i++)P({kind:'pp',sh:'drop',x:x+R(-30,30),y:y+R(-20,20),vx:R(-260,260),vy:R(-380,-60),g:1200,r:R(4,8)*B,life:R(.6,1),color:i%2?'#a8ff4a':'#5fd22a',glow:1});for(let i=0;i<5;i++)P({kind:'pp',sh:'puff',x:x+R(-40,40),y:y+R(-20,30),vx:R(-60,60),vy:R(-40,0),r:R(12,18),grow:30,life:.7,color:'#7fd03a',alpha:.3})}
  else if(k==='leafstorm')for(let i=0;i<30;i++)P({kind:'pp',sh:'leaf',cx:f.x,cy:400+f.y-130,ang:R(0,6.28),rad:R(60,170),av:R(3,5.5),rise:R(-60,-20),rot:R(0,6),vr:R(-8,8),r:R(16,26),life:R(.7,1),orbit:1,color:['#5ea83a','#9fd86a','#d8b03a','#3f7f2a'][i%4]});
  else if(k==='leafburst')for(let i=0;i<20;i++){const an=R(0,6.28);P({kind:'pp',sh:'leaf',x,y,vx:Math.cos(an)*R(160,420),vy:Math.sin(an)*R(160,420)-120,g:200,drag:.95,rot:R(0,6),vr:R(-10,10),r:R(15,26)*B,life:R(.8,1.2),color:['#5ea83a','#9fd86a','#d8b03a','#3f7f2a'][i%4]})}
  else if(k.startsWith('spirit:')){const mode=k.slice(7),o=game.fighters[1-game.fighters.indexOf(f)],ox=o?o.x:f.x+d*300,col=th.sc||th.a,id=f.data.id,h=th.sh2||260;
   if(mode==='rise')HS(f,{kind:'pp',sh:'spirit',id,mode,x:f.x-d*40,y:400+f.y-120,h,dir:d,color:col,life:1.0,filter:th.sf});
   else if(mode==='charge')HS(f,{kind:'pp',sh:'spirit',id,mode,x:f.x-d*30,y:400+f.y-110,x1:ox-d*10,h:h*.85,dir:d,color:col,life:.7,travel:.28,filter:th.sf});
   else if(mode==='dive')HS(f,{kind:'pp',sh:'spirit',id,mode,x:x-d*320,y:-80,x1:x,y1:y+60,h:h*.9,dir:d,color:col,life:.65,travel:.22,filter:th.sf});
   else if(mode==='emerge')HS(f,{kind:'pp',sh:'spirit',id,mode,x,y:398,h:h,dir:d,color:col,life:.9,filter:th.sf})}
  else if(k==='firewave'){const o=game.fighters[1-game.fighters.indexOf(f)],ox=o?o.x:f.x+d*300;for(let i=0;i<22;i++){const t=i/21;P({kind:'pp',sh:'flame',x:f.x+(ox-f.x)*t+R(-12,12),y:398-R(0,20),vx:0,vy:R(-150,-60),r:R(20,34)*(1-t*.3),life:R(.45,.7),delay:.12+t*.35,a:th.a,b:th.b})}}
  else if(k==='embers')for(let i=0;i<18;i++)P({kind:'pp',sh:'drop',x:x+R(-60,60),y:y+R(-40,40),vx:R(-160,160),vy:R(-420,-120),g:-60,r:R(2,4),life:R(.7,1.2),color:i%2?'#ffd36b':'#ff7a1a',glow:1});
  else if(k==='dark')P({kind:'pp',sh:'dark',x:f.x,y:400+f.y-150,life:1.1});
  else if(k==='eyes'){const o=game.fighters[1-game.fighters.indexOf(f)];P({kind:'pp',sh:'eyes',x:(o?o.x:f.x)+d*R(140,220),y:400+(o?o.y:0)-R(250,300),life:1})}
  else if(k==='moon')P({kind:'pp',sh:'moon',x:f.x-d*140,y:120,life:1.4});
  else if(k==='leap'){P({kind:'pp',sh:'leap',x:f.x,x0:f.x-d*60,dir:d,y:380,life:1.5});sxFx(f,['splash'],f.x-d*230,396,.7)}
  else if(k==='ghostpack'){const o=game.fighters[1-game.fighters.indexOf(f)],ox=o?o.x:f.x+d*300;for(let i=0;i<3;i++)HS(f,{kind:'pp',sh:'spirit',id:'wolf',mode:'charge',x:f.x-d*R(150,260),y:400-R(10,80),x1:ox+d*R(40,140),h:R(120,160),dir:d,color:'#8fc8ff',life:.75,travel:.45,delay:.15+i*.12,alpha:.7,filter:'saturate(.2) brightness(1.3) sepia(.4) hue-rotate(170deg) saturate(2.5)'})}
  else if(k==='pack')for(let i=0;i<3;i++)HS(f,{kind:'pp',sh:'spirit',id:'hyena',mode:'rise',x:f.x+d*(i-1)*140,y:400+f.y-160-(i===1?60:0),h:150,dir:i===0?-d:d,color:'#ff5a3a',life:.9,delay:i*.1,alpha:.75});
  else if(k==='eruption'){const eo=game.fighters[1-game.fighters.indexOf(f)],ex=eo?eo.x:f.x+d*200;P({kind:'pp',sh:'fissure',x:f.x+d*30,x1:ex,y:399,life:.9,seed:Math.random()});HS(f,{kind:'pp',sh:'spirit',id:f.data.id,mode:'emerge',x:ex,delay:.2,y:398,h:230,dir:d,color:th.sc||th.a,life:.9});for(let i=0;i<16;i++)P({kind:'pp',sh:'rock',delay:.2,x:ex+R(-40,40),y:396,vx:R(-260,260),vy:R(-900,-450),g:1700,r:R(7,15),rot:R(0,6),vr:R(-9,9),life:R(.9,1.3),color:i%3?'#6b5440':'#8a7356'});for(let i=0;i<8;i++)P({kind:'pp',sh:'puff',delay:.2,x:ex+R(-50,50),y:396-R(0,120),vx:R(-40,40),vy:R(-160,-60),r:R(18,30),grow:60,life:R(.7,1),color:'#8a7356',alpha:.5})}
  else if(k==='fissure'){const o=game.fighters[1-game.fighters.indexOf(f)];P({kind:'pp',sh:'fissure',x:f.x+d*40,x1:(o?o.x:f.x+d*300)+d*60,y:399,life:1.2,seed:Math.random()})}
  else if(k==='pool'){const o=game.fighters[1-game.fighters.indexOf(f)],ox=o?o.x:f.x+d*300;P({kind:'pp',sh:'pool',x:ox,y:399,life:1.1});HS(f,{kind:'pp',sh:'spirit',id:'crocodile',mode:'emerge',x:ox-d*10,y:398,h:240,dir:d,color:th.sc||th.a,life:.85,delay:.15});P({kind:'pp',sh:'sheet',x:ox,y:398,life:.55,big:1.1,color:th.a,delay:.18})}
  else if(k==='tidal'){const o=game.fighters[1-game.fighters.indexOf(f)];P({kind:'pp',sh:'tidal',x:f.x+d*40,x1:(o?o.x:f.x+d*300)+d*50,dir:d,y:399,life:.9})}
  else if(k==='trumpet')for(let i=0;i<4;i++)P({kind:'pp',sh:'roar',x:f.x+d*90,y:400+f.y-230,dir:d,delay:i*.08,life:.6,color:i%2?'#fff3d6':'#c6b7a0',big:1.4});
  else if(k==='stampede'){const o=game.fighters[1-game.fighters.indexOf(f)],ox=o?o.x:f.x+d*300;for(let i=0;i<24;i++){const t=i/23;P({kind:'pp',sh:'puff',x:f.x+(ox-f.x)*t+R(-20,20),y:396-R(0,60),vx:d*R(60,160),vy:R(-80,-20),r:R(22,38),grow:70,life:R(.7,1),color:'#9a8466',alpha:.55,delay:t*.35})}game.shake=Math.max(game.shake,.25)}
  else if(k==='tornado')P({kind:'pp',sh:'tornado',x:f.x+d*60,y:400,life:1.0});
  else if(k==='vines'){const vs=[];for(let i=0;i<6;i++)vs.push({x:R(-70,70),h:R(150,290),f:R(5,9),ph:R(0,6),a:R(20,45),s:R(.8,1.2)});P({kind:'pp',sh:'vines',x,y:400,life:1.2,vs})}
  else if(k==='skybolts'){const o=game.fighters[1-game.fighters.indexOf(f)],ox=o?o.x:f.x+d*300;for(let i=0;i<5;i++)P({kind:'pp',sh:'skybolt',x:ox+R(-120,120),y:398,life:.35,delay:.1+i*.12,color:i%2?'#7fe6ff':'#b46bff'})}
  else if(k==='kcobra')P({kind:'pp',sh:'kcobra',x:f.x-d*90,y:398,dir:d,life:1.05,sz:1.1});
  else if(k==='kstrike'){P({kind:'pp',sh:'kcobra',x:x-d*230,y:398,dir:d,life:.8,sz:1,strike:.1});P({kind:'pp',sh:'vbite',x,y:y-10,life:.9,delay:.24});
   for(let i=0;i<3;i++)P({kind:'pp',sh:'vpuddle',x:x+R(-90,90),y:399,r:R(10,40),life:R(1.6,2.2),delay:.3+i*.08})}
  else if(k==='poison'){const o=game.fighters[1-game.fighters.indexOf(f)];if(o){o._poisonT=1.8}}
  else if(k==='frostpatch')P({kind:'pp',sh:'frostpatch',x:k==='frostpatch'&&stage==='start'?f.x:x,y:399,life:1.4,big:B,seed:Math.random()});
  else if(k==='frostcone')P({kind:'pp',sh:'frostcone',x:f.x+d*70,y:400+f.y-205,dir:d,life:.55});
  else if(k==='icecluster'){const xs=[];for(let i=0;i<7;i++){const o=(i-3);xs.push({x:o*24+R(-6,6),w:R(9,15),h:R(70,170)*(1-Math.abs(o)/5),lean:o*.13+R(-.08,.08)})}
   P({kind:'pp',sh:'icecluster',x,y:399,life:.95,big:B,xs});P({kind:'pp',sh:'frostpatch',x,y:399,life:1.4,big:B*.8,seed:Math.random()})}
  else if(k==='freeze'){const o=game.fighters[1-game.fighters.indexOf(f)];if(o){o._frozenT=.9;o._iceShatter=1}}
  else if(k==='portal')P({kind:'pp',sh:'portal',x:f.x,y:400+f.y-150,life:.8,color:th.a,c2:th.b});
 }
}
/* ---------- 1.3 signature effects: a real king cobra for Snake, real ice for Snow Leopard ---------- */
// King cobra: scaled, banded body rising out of a burrow, flared hood with spectacle markings,
// slit-pupil eyes, open mouth with dripping fangs and a flicking forked tongue. Sways, then strikes.
const COBRA_HEAD=new Image();COBRA_HEAD.src='assets/fx/cobra-head.webp?v=13';const COBRA_SKIN=new Image();COBRA_SKIN.src='assets/fx/cobra-scales.webp?v=13';let cobraPat=null;
function kCobra(p,k){if(!COBRA_HEAD.complete||!COBRA_HEAD.naturalWidth)return;
 const e=Math.min(1,p.t/.3),es=e*e*(3-2*e),s=(p.sz||1),d=p.dir;
 const st=p.strike!=null?Math.max(0,Math.min(1,(p.t-p.strike)/.13)):0,lunge=st*st*(3-2*st);
 const sway=Math.sin(p.t*6.5)*(1-lunge)*9;c.translate(p.x,p.y);c.scale(d*s,s);c.globalAlpha=Math.min(1,k*2.4);
 // burrow with broken earth
 const hole=Math.min(1,p.t/.12);c.fillStyle='rgba(18,10,3,.9)';c.beginPath();c.ellipse(-20,3,62*hole,14*hole,0,0,7);c.fill();
 c.fillStyle='#5a4128';for(let i=0;i<7;i++){const a=i/7*Math.PI*2;c.beginPath();c.ellipse(-20+Math.cos(a)*66*hole,2+Math.sin(a)*14*hole,9,5,a,0,7);c.fill()}
 // body: a thick scaled tube rising out of the hole, swaying, then lunging at the target
 const H=(p.strike!=null?200:175)*es,nx=40+lunge*170+sway,ny=-H+lunge*110;
 const P0={x:-20,y:12},P1={x:-80,y:-H*.3},P2={x:20+sway*.6,y:-H*.62+lunge*40},P3={x:nx,y:ny};
 const bz=t=>{const u=1-t;return{x:u*u*u*P0.x+3*u*u*t*P1.x+3*u*t*t*P2.x+t*t*t*P3.x,y:u*u*u*P0.y+3*u*u*t*P1.y+3*u*t*t*P2.y+t*t*t*P3.y}};
 if(!cobraPat&&COBRA_SKIN.complete&&COBRA_SKIN.naturalWidth){cobraPat=c.createPattern(COBRA_SKIN,'repeat');try{cobraPat.setTransform(new DOMMatrix().scale(.32))}catch(_){}}
 const N=48,pts=[];for(let i=0;i<=N;i++){const t=i/N;pts.push([bz(t),26-10*t])}
 c.lineCap='round';c.lineJoin='round';
 const tube=(col,wf,dx,dy)=>{for(let i=0;i<N;i++){const[q,r]=pts[i],[q2]=pts[i+1];c.strokeStyle=col;c.lineWidth=r*2*wf;c.beginPath();c.moveTo(q.x+dx*r,q.y+dy*r);c.lineTo(q2.x+dx*r,q2.y+dy*r);c.stroke()}};
 tube('#1c1404',1.08,0,0);tube(cobraPat||'#8a7330',.96,0,0);tube('rgba(0,0,0,.35)',.42,.38,.38);tube('rgba(255,236,170,.28)',.28,-.42,-.42);
 // pale belly scales along the inner edge
 c.strokeStyle='rgba(245,230,170,.55)';c.lineWidth=2;for(let i=6;i<N-4;i+=2){const[q,r]=pts[i];c.beginPath();c.moveTo(q.x+r*.55,q.y+r*.2);c.lineTo(q.x+r*.95,q.y+r*.35);c.stroke()}
 // the real cobra head from Snake's own art, hood flared, mouth open
 const hw=215,hh=hw*COBRA_HEAD.naturalHeight/COBRA_HEAD.naturalWidth;
 c.save();c.translate(P3.x,P3.y);c.rotate(-.08+lunge*.55+Math.sin(p.t*6.5)*.03*(1-lunge));const pulse=1+Math.sin(p.t*9)*.015;c.scale(pulse,pulse);
 c.shadowColor='rgba(150,255,80,.55)';c.shadowBlur=18;c.drawImage(COBRA_HEAD,-hw*.49,-hh*.93,hw,hh);c.shadowBlur=0;
 // venom drips from the fangs
 c.fillStyle='#a8ff4a';c.shadowColor='#a8ff4a';c.shadowBlur=10;for(const fx of[.18,.27]){const y0=-hh*.2+((p.t*90+fx*200)%26);c.beginPath();c.arc(hw*fx,y0,3.2,0,7);c.fill()}
 c.restore()}
// Venom puddle on the floor: glossy green pool, bubbles popping, toxic vapour rising.
function vPuddle(p,k){c.translate(p.x,p.y);const g=Math.min(1,p.t/.25),w=(34+p.r*.7)*g;c.globalAlpha=Math.min(1,k*1.5)*.85;
 const pg=c.createRadialGradient(-w*.2,-3,2,0,0,w);pg.addColorStop(0,'rgba(200,255,120,.85)');pg.addColorStop(.35,'rgba(70,170,25,.75)');pg.addColorStop(1,'rgba(30,90,8,0)');
 c.fillStyle=pg;c.beginPath();c.ellipse(0,0,w,w*.18,0,0,7);c.fill();
 for(let i=0;i<5;i++){const ph=(p.t*1.8+i*.37)%1,bx=Math.sin(i*9.1)*w*.6,br=3+ph*7;c.strokeStyle='rgba(220,255,150,'+(1-ph)*.9+')';c.lineWidth=1.5;c.beginPath();c.arc(bx,-br*.6,br,0,7);c.stroke()}
 c.globalAlpha=k*.35;for(let i=0;i<3;i++){const ph=(p.t*.9+i*.33)%1;c.fillStyle='#8fe04a';c.beginPath();c.ellipse(Math.sin(i*4+p.t)*w*.4,-20-ph*90,10+ph*18,7+ph*12,0,0,7);c.fill()}}
// Two glowing puncture wounds where the fangs landed.
function vBite(p,k){c.translate(p.x,p.y);c.globalAlpha=k;for(const s of[-1,1]){const g=c.createRadialGradient(s*14,0,1,s*14,0,14);g.addColorStop(0,'#ffffff');g.addColorStop(.35,'#b8ff5a');g.addColorStop(1,'rgba(80,200,30,0)');c.fillStyle=g;c.beginPath();c.arc(s*14,0,14,0,7);c.fill()}}
// Ice crystal: faceted hexagonal prism — translucent body, bright front facet, glints and a frosty core.
function iceCrystal(x,y,w,h,lean,a){c.save();c.translate(x,y);c.rotate(lean);c.globalAlpha*=a;
 const tip=-h,sh=h*.22;
 const body=c.createLinearGradient(-w,0,w,0);body.addColorStop(0,'rgba(120,200,240,.75)');body.addColorStop(.45,'rgba(225,248,255,.92)');body.addColorStop(.55,'rgba(170,225,250,.85)');body.addColorStop(1,'rgba(60,140,210,.8)');
 c.fillStyle=body;c.beginPath();c.moveTo(-w,0);c.lineTo(-w,tip+sh);c.lineTo(0,tip);c.lineTo(w,tip+sh);c.lineTo(w,0);c.closePath();c.fill();
 c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.moveTo(-w*.15,0);c.lineTo(-w*.15,tip+sh*.9);c.lineTo(0,tip);c.lineTo(w*.25,tip+sh);c.lineTo(w*.25,0);c.closePath();c.fill();
 c.strokeStyle='rgba(255,255,255,.95)';c.lineWidth=1.6;c.beginPath();c.moveTo(-w,0);c.lineTo(-w,tip+sh);c.lineTo(0,tip);c.lineTo(w,tip+sh);c.lineTo(w,0);c.moveTo(0,tip);c.lineTo(0,0);c.stroke();
 c.strokeStyle='rgba(90,170,230,.6)';c.lineWidth=1;for(let i=1;i<4;i++){c.beginPath();c.moveTo(-w*.8,-h*i*.2);c.lineTo(-w*.3,-h*i*.2-6);c.stroke()}
 c.restore()}
function iceCluster(p,k){const g=Math.min(1,p.t/.12),gg=1-Math.pow(1-g,3),shatter=p.t>p.life-.18;c.translate(p.x,p.y);
 c.globalAlpha=shatter?k*4:1;const B=p.big||1;
 const base=c.createRadialGradient(0,0,4,0,0,120*B);base.addColorStop(0,'rgba(230,250,255,.9)');base.addColorStop(1,'rgba(160,220,255,0)');c.fillStyle=base;c.beginPath();c.ellipse(0,0,120*B,18*B,0,0,7);c.fill();
 for(const q of p.xs)iceCrystal(q.x*B,0,q.w*B,q.h*B*gg,q.lean,1);
 // glints
 c.globalCompositeOperation='lighter';for(let i=0;i<4;i++){const ph=(p.t*3+i*.27)%1;if(ph<.35){const q=p.xs[i%p.xs.length],gx=q.x*B,gy=-q.h*B*gg*.7,r=10*(1-Math.abs(ph-.17)/.17);c.strokeStyle='#ffffff';c.lineWidth=2;c.beginPath();c.moveTo(gx-r,gy);c.lineTo(gx+r,gy);c.moveTo(gx,gy-r);c.lineTo(gx,gy+r);c.stroke()}}}
// Frost spreading across the floor: pale sheet + branching crystal cracks.
function frostPatch(p,k){c.translate(p.x,p.y);const g=Math.min(1,p.t/.3),R0=(140*(p.big||1))*g;c.globalAlpha=Math.min(1,k*1.6);
 const fg=c.createRadialGradient(0,0,4,0,0,R0);fg.addColorStop(0,'rgba(235,250,255,.75)');fg.addColorStop(.7,'rgba(180,230,255,.35)');fg.addColorStop(1,'rgba(180,230,255,0)');c.fillStyle=fg;c.beginPath();c.ellipse(0,0,R0,R0*.16,0,0,7);c.fill();
 c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=1.4;let sd=p.seed*1e4;const rnd=()=>{sd=(sd*9301+49297)%233280;return sd/233280};
 for(let i=0;i<10;i++){const a=rnd()*Math.PI*2,L=R0*(.5+rnd()*.5);let x=0,y=0;c.beginPath();c.moveTo(0,0);for(let j=1;j<=4;j++){x=Math.cos(a)*L*j/4;y=Math.sin(a)*L*j/4*.16;c.lineTo(x,y);
   if(j===2){const b=a+(rnd()<.5?-.6:.6);c.moveTo(x,y);c.lineTo(x+Math.cos(b)*L*.25,y+Math.sin(b)*L*.25*.16);c.moveTo(x,y)}}c.stroke()}}
// Frost breath: a cone of icy mist with glittering ice dust.
function frostCone(p,k){c.translate(p.x,p.y);c.scale(p.dir,1);const g=Math.min(1,p.t/.15),L=260*g;c.globalAlpha=k*.75;
 const cg=c.createLinearGradient(0,0,L,0);cg.addColorStop(0,'rgba(240,252,255,.85)');cg.addColorStop(1,'rgba(170,225,255,0)');c.fillStyle=cg;
 c.beginPath();c.moveTo(0,-6);c.quadraticCurveTo(L*.6,-55,L,-40+Math.sin(p.t*20)*6);c.lineTo(L,40);c.quadraticCurveTo(L*.6,55,0,6);c.closePath();c.fill();
 c.globalCompositeOperation='lighter';for(let i=0;i<22;i++){const ph=((p.t*1.6)+i/22)%1,x=ph*L,y=Math.sin(i*7.3+p.t*3)*ph*40;c.fillStyle='rgba(255,255,255,'+(1-ph)+')';c.fillRect(x,y,2.2,2.2)}}

/* ---------- 1.3 signature specials for all fighters: a spirit of the animal from its own art + a real elemental power ---------- */
const SPIRIT={};for(const id of['lion','tiger','jaguar','wolf','hyena','badger','grizzly','crocodile','hippo','elephant','eagle','stag','dolphin','majic']){const im=new Image();im.src='assets/fx/spirit-'+id+'.webp?v=13';SPIRIT[id]=im}
function spiritFx(p,k){const im=SPIRIT[p.id];if(!im||!im.complete||!im.naturalWidth)return;
 const u=Math.min(1,p.t/p.life),ein=Math.min(1,p.t/.18),e=ein*ein*(3-2*ein);let x=p.x,y=p.y,sc=.7+.3*e;
 if(p.mode==='charge'||p.mode==='dive'){const m=Math.min(1,p.t/(p.travel||.3)),mm=m*m*(3-2*m);x=p.x+(p.x1-p.x)*mm;y=p.y+((p.y1!=null?p.y1:p.y)-p.y)*mm;sc=.8+.35*mm}
 if(p.mode==='emerge'){const m=Math.min(1,p.t/.3);y=p.y+(1-m*m*(3-2*m))*p.h*.8}
 const roar=u>.15&&u<.55?1+Math.sin(p.t*34)*.035:1;const H=p.h*sc*roar,W=H*im.naturalWidth/im.naturalHeight;
 const a=Math.min(e,(1-u)*3.2)*(p.alpha||.8);if(a<=0)return;
 c.translate(x,y);c.scale(p.dir||1,1);if(p.mode==='dive')c.rotate(.35);
 if(p.mode==='emerge'){c.beginPath();c.rect(-2000,-3000,4000,3000-2);c.clip()}
 // aura behind the spirit
 const ag=c.createRadialGradient(0,-H*.45,H*.05,0,-H*.45,H*.75);ag.addColorStop(0,p.color+'aa');ag.addColorStop(1,p.color+'00');c.globalAlpha=a*.8;c.fillStyle=ag;c.beginPath();c.ellipse(0,-H*.45,W*.7,H*.7,0,0,7);c.fill();
 if(p.filter)c.filter=p.filter;c.shadowColor=p.color;c.shadowBlur=34;c.globalAlpha=a;c.drawImage(im,-W*.5,-H,W,H);c.shadowBlur=0;
 c.globalCompositeOperation='lighter';c.globalAlpha=a*(.22+.18*Math.sin(p.t*18));c.drawImage(im,-W*.5,-H,W,H);c.filter='none'}
function dDark(p,k){const fi=Math.min(1,p.t/.12)*Math.min(1,(p.life-p.t)/.2);const g=c.createRadialGradient(p.x,p.y,40,p.x,p.y,520);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.35,'rgba(0,4,6,.7)');g.addColorStop(1,'rgba(0,4,6,.88)');c.globalAlpha=fi;c.fillStyle=g;c.fillRect(p.x-2500,p.y-2000,5000,4000)}
function dEyes(p,k){const fi=Math.min(1,p.t/.15)*Math.min(1,(p.life-p.t)/.15),blink=Math.abs(Math.sin(p.t*2.2))>.06?1:.1;c.translate(p.x,p.y);c.globalCompositeOperation='lighter';
 for(const s of[-1,1]){c.save();c.translate(s*34,0);c.scale(1,blink);const g=c.createRadialGradient(0,0,1,0,0,26);g.addColorStop(0,'rgba(255,255,220,'+fi+')');g.addColorStop(.3,'rgba(120,255,200,'+fi+')');g.addColorStop(1,'rgba(0,120,90,0)');c.fillStyle=g;c.beginPath();c.ellipse(0,0,26,15,s*.25,0,7);c.fill();c.globalCompositeOperation='source-over';c.fillStyle='rgba(0,0,0,'+fi+')';c.fillRect(-1.8,-11,3.6,22);c.restore();c.globalCompositeOperation='lighter'}}
function dMoon(p,k){const fi=Math.min(1,p.t/.25)*Math.min(1,(p.life-p.t)/.3);c.translate(p.x,p.y);c.globalAlpha=fi;
 const halo=c.createRadialGradient(0,0,60,0,0,220);halo.addColorStop(0,'rgba(200,225,255,.55)');halo.addColorStop(1,'rgba(200,225,255,0)');c.fillStyle=halo;c.beginPath();c.arc(0,0,220,0,7);c.fill();
 const g=c.createRadialGradient(-25,-25,10,0,0,95);g.addColorStop(0,'#fbfdff');g.addColorStop(.7,'#d9e4f0');g.addColorStop(1,'#a9b9cc');c.fillStyle=g;c.beginPath();c.arc(0,0,95,0,7);c.fill();
 c.fillStyle='rgba(120,140,165,.35)';for(const[a,b,r]of[[-30,-20,18],[25,10,24],[-10,40,13],[40,-40,10],[-45,25,9]]){c.beginPath();c.arc(a,b,r,0,7);c.fill()}}
function dFissure(p,k){const g=Math.min(1,p.t/.22),x0=p.x,x1=p.x+(p.x1-p.x)*g;let sd=p.seed*1e4;const rnd=()=>{sd=(sd*9301+49297)%233280;return sd/233280};
 const pts=[];const n=18;for(let i=0;i<=n;i++){const t=i/n;if(x0+(p.x1-x0)*t>Math.max(x0,x1)&&p.x1>x0||x0+(p.x1-x0)*t<Math.min(x0,x1)&&p.x1<x0)break;pts.push([x0+(p.x1-x0)*t,399+(rnd()-.5)*10])}
 if(pts.length<2)return;c.globalAlpha=Math.min(1,k*2);c.lineJoin='round';
 for(const[w,col]of[[16,'rgba(20,10,4,.9)'],[7,'#ff7a1a'],[3,'#ffe28a']]){c.strokeStyle=col;c.lineWidth=w;if(w<10){c.shadowColor='#ff5a00';c.shadowBlur=16}c.beginPath();pts.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke()}}
function dPool(p,k){const g=Math.min(1,p.t/.2),w=150*g;c.translate(p.x,p.y);c.globalAlpha=Math.min(1,k*2);
 const pg=c.createRadialGradient(0,0,4,0,0,w);pg.addColorStop(0,'rgba(20,70,60,.95)');pg.addColorStop(.7,'rgba(30,110,100,.8)');pg.addColorStop(1,'rgba(60,170,160,0)');c.fillStyle=pg;c.beginPath();c.ellipse(0,0,w,w*.17,0,0,7);c.fill();
 c.strokeStyle='rgba(210,250,255,.7)';c.lineWidth=2;for(let i=0;i<3;i++){const ph=(p.t*1.3+i/3)%1;c.globalAlpha=Math.min(1,k*2)*(1-ph);c.beginPath();c.ellipse(0,0,w*(.3+ph*.75),w*.17*(.3+ph*.75),0,0,7);c.stroke()}}
function dTidal(p,k){const m=Math.min(1,p.t/(p.life*.7)),mm=m*m*(3-2*m),front=p.x+(p.x1-p.x)*mm,back=p.x-p.dir*140,H=230*Math.min(1,p.t/.15)*(1-Math.max(0,(p.t-p.life*.75)/(p.life*.25))*.85),d=p.dir;
 c.globalAlpha=Math.min(1,k*2.5)*.82;const top=399-H;
 const wg=c.createLinearGradient(0,top,0,400);wg.addColorStop(0,'rgba(230,250,255,.95)');wg.addColorStop(.18,'rgba(110,200,235,.85)');wg.addColorStop(.6,'rgba(30,120,180,.7)');wg.addColorStop(1,'rgba(8,60,110,.85)');c.fillStyle=wg;
 if(game&&H>40)for(let i=0;i<4;i++)game.fx.push({kind:'pp',sh:'drop',x:front+d*R(-30,30),y:top+R(0,30),vx:d*R(80,320),vy:R(-380,-120),g:1400,r:R(3,7),life:R(.4,.7),color:Math.random()<.6?'#e8fbff':'#7fd0f0',t:0,_n:1});
 c.beginPath();c.moveTo(back,400);c.lineTo(back,400-H*.35);c.quadraticCurveTo((back+front)/2,top-10,front-d*40,top+10);c.quadraticCurveTo(front+d*30,top+5,front+d*20,top+H*.38);c.quadraticCurveTo(front-d*20,top+H*.25,front-d*10,top+H*.55);c.lineTo(front+d*30,400);c.closePath();c.fill();
 c.strokeStyle='rgba(255,255,255,.95)';c.lineWidth=5;c.beginPath();c.moveTo(front-d*120,top+18);c.quadraticCurveTo(front-d*30,top-6,front+d*20,top+H*.38);c.stroke();
 c.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<26;i++){const t=(i/26),fx=front-d*(140*t)+Math.sin(i*7+p.t*20)*6,fy=top+18-Math.sin(t*Math.PI)*14+Math.cos(i*3+p.t*15)*5;c.beginPath();c.arc(fx,fy,2+((i*7)%4),0,7);c.fill()}
 c.globalCompositeOperation='lighter';c.strokeStyle='rgba(180,240,255,.18)';c.lineWidth=10;for(let i=0;i<6;i++){const xx=back+(front-back)*(i/6)+Math.sin(p.t*6+i)*10;c.beginPath();c.moveTo(xx,400);c.quadraticCurveTo(xx+d*30,400-H*.5,xx+d*60,top+H*.2);c.stroke()}c.globalCompositeOperation='source-over';
 c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=2;for(let i=1;i<5;i++){c.beginPath();c.moveTo(back,400-H*.08*i);c.quadraticCurveTo((back+front)/2,400-H*.15*i-10,front-d*20,400-H*.12*i);c.stroke()}}
function dTornado(p,k){const fi=Math.min(1,p.t/.2)*Math.min(1,(p.life-p.t)/.25);c.translate(p.x,400);c.globalAlpha=fi;const Hh=360;
 for(let i=0;i<34;i++){const t=i/33,y=-t*Hh,r=18+t*t*120,a=p.t*14+i*.7,sway=Math.sin(p.t*4+t*3)*20*t;
  c.strokeStyle=i%3?'rgba(225,228,232,.32)':'rgba(140,135,120,.42)';c.lineWidth=6+t*10;c.beginPath();c.ellipse(sway,y,r,r*.22,0,a%6.28,a%6.28+4.2);c.stroke()}
 {const dg=c.createRadialGradient(0,0,4,0,0,150);dg.addColorStop(0,'rgba(150,130,100,.55)');dg.addColorStop(1,'rgba(150,130,100,0)');c.fillStyle=dg;c.beginPath();c.ellipse(0,-10,150,40,0,0,7);c.fill()}
 c.fillStyle='rgba(90,80,60,.85)';for(let i=0;i<18;i++){const t=((p.t*.8+i/18)%1),a=p.t*12+i*2.1,r=18+t*t*120;c.fillRect(Math.cos(a)*r,-t*Hh+Math.sin(a)*r*.22,4,4)}}
function dVines(p,k){const g=Math.min(1,p.t/.35),fade=Math.min(1,(p.life-p.t)/.25);c.translate(p.x,400);c.globalAlpha=fade;c.lineCap='round';
 for(const v of p.vs){const pts=[];for(let i=0;i<=24;i++){const t=i/24*g,y=-t*v.h,x=v.x+Math.sin(t*v.f+v.ph)*v.a*t;pts.push([x,y])}
  for(const[w,col,ox]of[[14,'#1b1408',0],[10,'#4a3a1e',0],[4,'#7a6a3a',-2.5],[2,'rgba(120,170,70,.8)',2.5]]){c.strokeStyle=col;for(let i=1;i<pts.length;i++){c.lineWidth=w*v.s*(1-i/pts.length*.75);c.beginPath();c.moveTo(pts[i-1][0]+ox*v.s*(1-i/pts.length),pts[i-1][1]);c.lineTo(pts[i][0]+ox*v.s*(1-i/pts.length),pts[i][1]);c.stroke()}}
  c.fillStyle='#e9dcb0';for(let i=3;i<pts.length;i+=3){const[q0,q1]=pts[i];c.beginPath();c.moveTo(q0+6*v.s,q1);c.lineTo(q0+14*v.s,q1-4);c.lineTo(q0+6*v.s,q1-6);c.fill()}
  for(let i=4;i<pts.length;i+=4){const[q0,q1]=pts[i];c.save();c.translate(q0,q1);c.rotate(i%8?-.6:.6);pLeaf(13*v.s,i%8?'#3f7f2a':'#6b9a3a');c.restore()}}}
function dSkyBolt(p,k){if(p.t>.25&&Math.random()>.4)return;let sd=Math.random()*1e4;const rnd=()=>{sd=(sd*9301+49297)%233280;return sd/233280};c.globalCompositeOperation='lighter';
 const pts=[[p.x+(rnd()-.5)*80,-260]];while(pts[pts.length-1][1]<396){const[a,b]=pts[pts.length-1];pts.push([a+(rnd()-.5)*70,Math.min(398,b+30+rnd()*40)])}pts[pts.length-1][0]=p.x;
 for(const[w,col,al]of[[16,p.color,.35],[6,p.color,.9],[2.5,'#ffffff',1]]){c.strokeStyle=col;c.globalAlpha=al*k;c.lineWidth=w;c.shadowColor=p.color;c.shadowBlur=24;c.beginPath();pts.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke()}
 const g=c.createRadialGradient(p.x,398,4,p.x,398,90);g.addColorStop(0,'rgba(255,255,255,'+k+')');g.addColorStop(1,'rgba(160,80,255,0)');c.fillStyle=g;c.beginPath();c.ellipse(p.x,398,90,24,0,0,7);c.fill()}

function pNormalize(){for(const p of game.fx){if(p._n)continue;p._n=1;if(p.kind!=='titanWave'&&typeof p.y==='number'&&p.y<=40)p.y+=400}}
{const _doMove=doMove;doMove=function(f,name){const r=_doMove.apply(this,arguments);
  if(game&&f&&!PFX_NORMAL.has(name)&&f.move_){f._pfxMove=f.move_;f._pfxAge=0;f._after=[];pBurst(f,'start',f.x,400+f.y-150,1)}return r}}
{const _rh=resolveHit;resolveHit=function(i,mv){const o=game.fighters[1-i],f=game.fighters[i];const before=o.hp+(o.bars||0)*1000,hf=o.hitFlash||0,st=o.stun||0;const r=_rh.apply(this,arguments);
  if((o.hp+(o.bars||0)*1000<before||(o.hitFlash||0)>hf||(o.stun||0)>st)&&f._pfxMove&&f.move_===f._pfxMove){const big=mv&&mv.ender?1.25:1;pBurst(f,'hit',o.x-f.dir*30,400+o.y-150,big);game.flash=Math.max(game.flash||0,.12)}return r}}
{const _su=startUltra;startUltra=function(i){const r=_su.apply(this,arguments);const f=game.fighters[i];f._pfxMove=null;pBurst(f,'start',f.x,400+f.y-150,1.4);return r}}
{const _us=ultraStep;ultraStep=function(dt){const u=game.ultra,h=u?u.hits:0;const r=_us.apply(this,arguments);
  if(u&&u.hits>h&&u.hits%3===0){const f=game.fighters[u.i],o=game.fighters[1-u.i];pBurst(f,'hit',o.x-f.dir*20,400+o.y-R(110,190),.8)}return r}}
{const _fu=fxUpdate;fxUpdate=function(dt){pNormalize();
  if(game&&game.fighters)for(const f of game.fighters){if(!(f._pfxMove&&f.move_===f._pfxMove)){f._pfxMove=null;f._after=[];continue}
   f._pfxAge=(f._pfxAge||0)+dt;const th=PFX[f.data.id];
   if(th&&th.after){f._afterT=(f._afterT||0)+dt;if(f._afterT>.045){f._afterT=0;f._after.unshift({x:f.x,y:f.y,dir:f.dir});f._after.length=Math.min(f._after.length,5)}}
   if(th&&th.start.includes('flames')&&Math.random()<dt*20)P({kind:'pp',sh:'flame',x:f.x+R(-60,60),y:400+f.y-R(0,30),vx:0,vy:R(-160,-80),r:R(12,20),life:R(.35,.6),a:th.a,b:th.b});
   if(th&&th.start.includes('flakes')&&Math.random()<dt*14)P({kind:'pp',sh:'flake',x:f.x+R(-90,90),y:400+f.y-R(150,280),vx:R(-30,30),vy:R(40,90),rot:R(0,6),vr:R(-3,3),r:R(5,10),life:R(.6,.9)});
   if(th&&th.start.includes('leafstorm')&&Math.random()<dt*14)P({kind:'pp',sh:'leaf',cx:f.x,cy:400+f.y-150,ang:R(0,6.28),rad:R(60,140),av:R(3,5),rise:-40,rot:R(0,6),vr:R(-8,8),r:R(15,24),life:.8,orbit:1,color:['#5ea83a','#9fd86a','#d8b03a'][Math.floor(R(0,3))]});
  }
  for(const p of game.fx){if(p.kind!=='pp')continue;if(p.delay>0){p.delay-=dt;p.t-=dt;continue}
   if(p.orbit){p.ang+=p.av*dt;p.cy+=(p.rise||0)*dt;p.x=p.cx+Math.cos(p.ang)*p.rad;p.y=p.cy+Math.sin(p.ang)*p.rad*.45;if(p.vr)p.rot+=p.vr*dt}
   else if(p.vx!==undefined){p.vy+=(p.g||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.drag){p.vx*=p.drag;p.vy*=p.drag}if(p.vr)p.rot+=p.vr*dt;if(p.sway!==undefined)p.sway+=dt*4;
    if(p.sh==='rock'&&p.y>398){p.y=398;p.vy*=-.3;p.vx*=.6}if(p.sh==='drop'&&p.y>400)p.life=Math.min(p.life,p.t+.04);if((p.sh==='flake'||p.sh==='leaf'||p.sh==='feather')&&p.y>398){p.y=398;p.vy=0;p.vx*=.8}}
   if(p.sh==='puff'||p.sh==='wisp')p.r+=(p.grow||40)*dt;
   if(p.sh==='ha')p.y+=(p.vy||0)*dt}
  return _fu.apply(this,arguments)}}
// afterimages behind the fighter (jaguar shadows, wolf pack spirits, MAJIC void echoes)
{const _dF=drawFighter;drawFighter=function(f,i,ghost){
  if(!ghost&&game&&f._after&&f._after.length&&f._pfxMove&&f.move_===f._pfxMove){const th=PFX[f.data.id];
   f._after.forEach((a,k)=>{if(k===0)return;c.save();c.globalAlpha=.42*(1-k/f._after.length);c.filter=th&&th.after||'none';_dF({...f,x:a.x,y:a.y,dir:a.dir,hitFlash:0,trail:[]},i,true);c.restore()})}
  return _dF.apply(this,arguments)}}
// MAJIC's signature purple lightning glow: always on in every fight (CPU, versus, Tower), never touches damage/timing
function mjBolt(x0,y0,x1,y1,rough,depth,out){const mx=(x0+x1)/2+(Math.random()-.5)*rough,my=(y0+y1)/2+(Math.random()-.5)*rough;
 if(depth<=0){out.push([x0,y0,mx,my,x1,y1]);return}mjBolt(x0,y0,mx,my,rough/2,depth-1,out);mjBolt(mx,my,x1,y1,rough/2,depth-1,out);
 if(depth>=2&&Math.random()<.35){const a=Math.atan2(y1-y0,x1-x0)+(Math.random()<.5?-1:1)*R(.5,1.1),l=Math.hypot(x1-x0,y1-y0)*.45;mjBolt(mx,my,mx+Math.cos(a)*l,my+Math.sin(a)*l,rough/3,depth-2,out)}}
function mjAura(f,front){const now=performance.now()/1000,H=310,cx=f.x,cy=400+f.y-H*.48;
 if(!front){const pulse=.8+Math.sin(now*5.2)*.12+Math.sin(now*13.7)*.06;c.save();c.globalCompositeOperation='lighter';
  const g=c.createRadialGradient(cx,cy,10,cx,cy,H*.72);g.addColorStop(0,'rgba(190,110,255,'+(.42*pulse)+')');g.addColorStop(.45,'rgba(140,60,255,'+(.28*pulse)+')');g.addColorStop(1,'rgba(90,20,200,0)');
  c.fillStyle=g;c.beginPath();c.ellipse(cx,cy,H*.62,H*.72,0,0,Math.PI*2);c.fill();
  const fg=c.createRadialGradient(cx,402,4,cx,402,150);fg.addColorStop(0,'rgba(200,130,255,'+(.35*pulse)+')');fg.addColorStop(1,'rgba(120,40,255,0)');c.fillStyle=fg;c.beginPath();c.ellipse(cx,402,150,22,0,0,Math.PI*2);c.fill();c.restore();return}
 if(!f._mjB||now-f._mjBt>R(.07,.13)){f._mjBt=now;f._mjB=[];const n=Math.random()<.25?3:2;
  for(let i=0;i<n;i++){const side=Math.random()<.5?-1:1,a0=R(-2.6,-.5),r0=R(.25,.45)*H,x0=cx+Math.cos(a0)*r0*side*.8,y0=cy+Math.sin(a0)*r0*.9+R(-30,90),ang=R(-1.9,-1.2)+(side>0?R(0,.9):-R(0,.9)),l=R(70,150),segs=[];
   mjBolt(x0,y0,x0+Math.cos(ang)*l*side,y0+Math.sin(ang)*l*(Math.random()<.4?-1:1),l*.45,4,segs);f._mjB.push({segs,col:Math.random()<.85?'#b65cff':'#9fe8ff',life:R(.6,1)})}}
 c.save();c.lineCap='round';c.lineJoin='round';const flick=.55+Math.random()*.45;
 for(const b of f._mjB){for(const [w,al,col] of [[12,.35*flick,'#8a2be2'],[5,.9*flick,b.col],[1.8,.95*flick*b.life,'#fbf3ff']]){c.strokeStyle=col;c.globalAlpha=al;c.lineWidth=w;c.shadowColor=b.col;c.shadowBlur=w>3?16:8;c.beginPath();for(const sg of b.segs){c.moveTo(sg[0],sg[1]);c.lineTo(sg[2],sg[3]);c.lineTo(sg[4],sg[5])}c.stroke()}}
 c.restore()}
{const _dF2=drawFighter;drawFighter=function(f,i,ghost){
  const mj=!ghost&&game&&f&&f.data&&f.data.id==='majic'&&!(f.hp<=0&&game.over);
  if(mj)mjAura(f,false);let r;if(mj){const pu=.75+Math.sin(performance.now()/190)*.25;c.save();c.shadowColor='rgba(170,70,255,'+pu+')';c.shadowBlur=26+pu*14;r=_dF2.apply(this,arguments);c.restore()}else r=_dF2.apply(this,arguments);if(mj)mjAura(f,true);return r}}
function pLeaf(r,col){c.fillStyle=col;c.beginPath();c.moveTo(-r,0);c.quadraticCurveTo(-r*.2,-r*.62,r,0);c.quadraticCurveTo(-r*.2,r*.62,-r,0);c.fill();c.strokeStyle='rgba(30,60,15,.75)';c.lineWidth=1.2;c.beginPath();c.moveTo(-r*1.25,0);c.lineTo(r*.9,0);for(let s=-.5;s<=.5;s+=.33){c.moveTo(r*s,0);c.lineTo(r*(s+.25),-r*.3);c.moveTo(r*s,0);c.lineTo(r*(s+.25),r*.3)}c.stroke()}
function pFlake(r){c.strokeStyle='#ffffff';c.lineWidth=Math.max(1.4,r*.16);c.lineCap='round';c.shadowColor='#8fe6ff';c.shadowBlur=8;c.beginPath();for(let a=0;a<6;a++){const ca=Math.cos(a*1.0472),sa=Math.sin(a*1.0472);c.moveTo(0,0);c.lineTo(ca*r,sa*r);for(const t of[.45,.72]){const bx=ca*r*t,by=sa*r*t,l=r*(t<.5?.36:.24);for(const s of[-1,1]){const aa=a*1.0472+s*.8;c.moveTo(bx,by);c.lineTo(bx+Math.cos(aa)*l,by+Math.sin(aa)*l)}}}c.stroke()}
function pFeather(r,col){c.strokeStyle='#8a6a40';c.lineWidth=1.5;c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.stroke();c.fillStyle=col;c.beginPath();c.moveTo(-r*.6,0);c.quadraticCurveTo(0,-r*.45,r,0);c.quadraticCurveTo(0,r*.32,-r*.6,0);c.fill();c.strokeStyle='rgba(120,90,60,.5)';c.lineWidth=.8;c.beginPath();for(let s=-.5;s<.9;s+=.2){c.moveTo(r*s,0);c.lineTo(r*(s+.18),-r*.3);c.moveTo(r*s,0);c.lineTo(r*(s+.18),r*.22)}c.stroke()}
function pFlame(r,a,b,k){const g=c.createRadialGradient(0,r*.35,1,0,0,r*1.3);g.addColorStop(0,'#fffbe0');g.addColorStop(.3,b);g.addColorStop(.7,a);g.addColorStop(1,'rgba(200,40,0,0)');c.fillStyle=g;c.globalAlpha=k;c.beginPath();c.moveTo(0,-r*1.6);c.bezierCurveTo(r*.9,-r*.6,r*.9,r*.8,0,r);c.bezierCurveTo(-r*.9,r*.8,-r*.9,-r*.6,0,-r*1.6);c.fill()}
function pCobra(p,k){const s=(p.sz||1)*(p.strike?1.05:1)*.75,lunge=p.strike?Math.min(1,p.t/.12):Math.min(1,p.t/.22);c.translate(p.x+p.dir*(20+lunge*(p.strike?50:70)),p.floor?398:p.y);c.scale(p.dir*s,s);if(p.floor)c.translate(0,-150);
 const al=Math.min(1,k*1.6);c.lineJoin='round';c.lineCap='round';
 // body S-curve rising from the ground
 c.globalAlpha=al*.85;c.strokeStyle='rgba(120,220,70,.9)';c.shadowColor='#8fe04a';c.shadowBlur=18;c.lineWidth=18;c.beginPath();c.moveTo(-150,150);c.bezierCurveTo(-60,170,-120,70,-50,60);c.bezierCurveTo(0,52,-20,10,-10,-10);c.stroke();
 c.strokeStyle='rgba(230,255,190,.8)';c.lineWidth=3;c.shadowBlur=0;c.beginPath();c.moveTo(-150,150);c.bezierCurveTo(-60,170,-120,70,-50,60);c.bezierCurveTo(0,52,-20,10,-10,-10);c.stroke();
 // hood
 c.globalAlpha=al*.45;c.fillStyle='#4f9e22';c.beginPath();c.moveTo(-10,30);c.bezierCurveTo(-70,10,-60,-70,-10,-75);c.bezierCurveTo(40,-70,50,10,-10,30);c.fill();
 c.globalAlpha=al;c.strokeStyle='#c8ff7a';c.lineWidth=3;c.shadowColor='#8fe04a';c.shadowBlur=14;c.stroke();
 c.shadowBlur=0;c.strokeStyle='rgba(30,70,10,.8)';c.lineWidth=2.5;c.beginPath();c.arc(-24,-30,9,0,7);c.moveTo(14,-30);c.arc(4,-30,9,0,7);c.stroke();
 // head
 c.globalAlpha=al*.9;c.fillStyle='#7fcf3a';c.beginPath();c.moveTo(-14,-62);c.quadraticCurveTo(28,-84,58,-62);c.quadraticCurveTo(40,-46,-6,-50);c.closePath();c.fill();c.strokeStyle='#e4ffb0';c.lineWidth=2.5;c.stroke();
 c.fillStyle='#ffe65a';c.beginPath();c.ellipse(28,-66,5,3,-.2,0,7);c.fill();c.fillStyle='#111';c.fillRect(27,-69,2,6);
 // forked tongue flicking in and out
 const fl=Math.max(0,Math.sin(p.t*34));c.globalAlpha=al;c.strokeStyle='#ff2d55';c.lineWidth=3;c.shadowColor='#ff2d55';c.shadowBlur=8;const tl=58+fl*42;c.beginPath();c.moveTo(56,-60);c.lineTo(tl,-60);c.lineTo(tl+12,-70);c.moveTo(tl,-60);c.lineTo(tl+12,-50);c.stroke()}
{const _df=drawFx;drawFx=function(){
  if(game&&game.fighters)for(const f of game.fighters){if(!(f._pfxMove&&f.move_===f._pfxMove))continue;const th=PFX[f.data.id];if(!th)continue;
   const a=Math.min(1,(f._pfxAge||0)*5);c.save();c.globalAlpha=.55*a;c.strokeStyle=th.a;c.lineWidth=3;c.shadowColor=th.a;c.shadowBlur=14;c.beginPath();c.ellipse(f.x,402,95+Math.sin(performance.now()/90)*8,15,0,0,Math.PI*2);c.stroke();c.restore()}
  _df.apply(this,arguments);
  for(const p of game.fx){if(p.kind!=='pp'||p.delay>0||p.sh==='aftermark')continue;const k=Math.max(0,1-p.t/p.life),pr=Math.min(1,p.t/p.life);c.save();if(rtFx(p,k,pr)){c.restore();continue}
   switch(p.sh){
   case'flame':c.globalCompositeOperation='lighter';c.translate(p.x,p.y);c.scale(.8+Math.sin(p.t*30)*.08,1.25);pFlame(p.r*(.6+.4*k),p.a,p.b,k);break;
   case'flake':c.globalAlpha=Math.min(1,k*1.6);c.translate(p.x,p.y);c.rotate(p.rot||0);pFlake(p.r);break;
   case'leaf':c.globalAlpha=Math.min(1,k*1.8);c.translate(p.x,p.y);c.rotate(p.rot||0);c.scale(1,.55+.45*Math.abs(Math.cos((p.rot||0)*1.7)));pLeaf(p.r,p.color);break;
   case'feather':c.globalAlpha=Math.min(1,k*1.8);c.translate(p.x+Math.sin(p.sway||0)*8,p.y);c.rotate((p.rot||0)+Math.sin(p.sway||0)*.5);pFeather(p.r,p.color);break;
   case'shard':c.globalAlpha=k;c.translate(p.x,p.y);c.rotate(p.rot);c.shadowColor='#8fe6ff';c.shadowBlur=10;c.fillStyle=p.color;c.beginPath();c.moveTo(0,-p.r);c.lineTo(p.r*.38,0);c.lineTo(0,p.r*.8);c.lineTo(-p.r*.38,0);c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.moveTo(0,-p.r);c.lineTo(p.r*.15,-p.r*.1);c.lineTo(-p.r*.1,0);c.closePath();c.fill();break;
   case'icicle':{const grow=Math.min(1,p.t/.12),h=p.h*grow;c.globalAlpha=Math.min(1,k*2.2);c.translate(p.x,p.y);c.rotate(p.lean);const g=c.createLinearGradient(-p.w/2,0,p.w/2,0);g.addColorStop(0,p.c2);g.addColorStop(.45,p.c1);g.addColorStop(1,p.c2);c.fillStyle=g;c.shadowColor=p.c2;c.shadowBlur=14;c.beginPath();c.moveTo(-p.w/2,0);c.lineTo(-p.w*.15,-h*.85);c.lineTo(0,-h);c.lineTo(p.w*.2,-h*.8);c.lineTo(p.w/2,0);c.closePath();c.fill();c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=1.5;c.beginPath();c.moveTo(-p.w*.1,-4);c.lineTo(0,-h*.95);c.stroke();break}
   case'rock':c.globalAlpha=Math.min(1,k*2);c.translate(p.x,p.y);c.rotate(p.rot);c.fillStyle=p.color;c.beginPath();c.moveTo(-p.r,-p.r*.4);c.lineTo(-p.r*.2,-p.r);c.lineTo(p.r,-p.r*.3);c.lineTo(p.r*.6,p.r*.8);c.lineTo(-p.r*.7,p.r*.6);c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.15)';c.beginPath();c.moveTo(-p.r*.2,-p.r);c.lineTo(p.r,-p.r*.3);c.lineTo(0,-p.r*.1);c.closePath();c.fill();break;
   case'puff':c.globalAlpha=k*(p.alpha||.35);c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill();break;
   case'wisp':{c.globalCompositeOperation='lighter';c.globalAlpha=k*.7;const g=c.createRadialGradient(p.x,p.y,1,p.x,p.y,p.r);g.addColorStop(0,'#ffffff');g.addColorStop(.4,p.color);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.ellipse(p.x,p.y,p.r*.6,p.r*1.3,0,0,7);c.fill();break}
   case'drop':c.globalAlpha=k;if(p.glow){c.shadowColor=p.color;c.shadowBlur=10}c.fillStyle=p.color;c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx)+1.57);c.beginPath();c.moveTo(0,-p.r*1.8);c.quadraticCurveTo(p.r,0,0,p.r);c.quadraticCurveTo(-p.r,0,0,-p.r*1.8);c.fill();c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(-p.r*.25,-p.r*.1,p.r*.25,0,7);c.fill();break;
   case'gash':{const show=Math.min(1,p.t/.08);c.translate(p.x,p.y);c.scale(p.dir,1);c.rotate(-.5);for(let s=0;s<p.n;s++){const oy=(s-(p.n-1)/2)*24*p.big,L=110*p.big*show;c.lineCap='round';c.globalAlpha=k*.9;c.strokeStyle='rgba(20,0,0,.6)';c.lineWidth=9*p.big;c.beginPath();c.moveTo(-L/2,oy);c.quadraticCurveTo(0,oy-10,L/2,oy+4);c.stroke();c.globalCompositeOperation='lighter';c.strokeStyle=p.color;c.shadowColor=p.color;c.shadowBlur=16;c.lineWidth=4*p.big*k+1;c.beginPath();c.moveTo(-L/2,oy);c.quadraticCurveTo(0,oy-10,L/2,oy+4);c.stroke();c.globalCompositeOperation='source-over';c.shadowBlur=0}break}
   case'cracks':{c.translate(p.x,p.y);let sd=p.seed*1e4;const rnd=()=>{sd=(sd*9301+49297)%233280;return sd/233280};const grow=Math.min(1,p.t/.15);c.lineCap='round';
    for(let s=0;s<7;s++){const dir=s%2?1:-1,len=(80+rnd()*170)*p.big*grow;let x=0,y=0;const pts=[[0,0]];for(let j=0;j<6;j++){x+=dir*len/6;y+=(rnd()-.5)*10+(rnd()<.5?1:-1)*s*.4;pts.push([x,Math.max(-4,Math.min(26,y+s*2.5))])}
     c.globalAlpha=Math.min(1,k*1.8);c.strokeStyle='#1a120c';c.lineWidth=4;c.beginPath();pts.forEach((q,j)=>j?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();
     c.globalCompositeOperation='lighter';c.globalAlpha=k*.8;c.strokeStyle=p.color;c.shadowColor=p.color;c.shadowBlur=10;c.lineWidth=1.6;c.beginPath();pts.forEach((q,j)=>j?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();c.globalCompositeOperation='source-over';c.shadowBlur=0}break}
   case'sheet':{c.globalAlpha=k*.55;c.translate(p.x,p.y);const h=(60+pr*80)*p.big,w=(40+pr*120)*p.big;const g=c.createLinearGradient(0,-h,0,0);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,p.color);c.fillStyle=g;c.beginPath();c.moveTo(-w,0);c.quadraticCurveTo(-w*.6,-h,-w*.2,-h*.6);c.quadraticCurveTo(0,-h*1.1,w*.2,-h*.6);c.quadraticCurveTo(w*.6,-h,w,0);c.closePath();c.fill();break}
   case'wave':{c.globalAlpha=k*.7;c.translate(p.x+p.dir*pr*260*p.big,p.y);c.scale(p.dir,1);const h=40*p.big*(1-pr*.5);c.fillStyle=p.color;c.beginPath();c.moveTo(-60,0);c.quadraticCurveTo(-10,-h,30,-h*.7);c.quadraticCurveTo(10,-h*.3,40,0);c.closePath();c.fill();c.strokeStyle='#ffffff';c.lineWidth=3;c.beginPath();c.moveTo(-30,-h*.6);c.quadraticCurveTo(0,-h*1.05,30,-h*.7);c.stroke();break}
   case'vortex':{c.globalCompositeOperation='lighter';c.globalAlpha=k;c.translate(p.x,p.y);c.rotate(pr*9);c.strokeStyle=p.color;c.shadowColor=p.color;c.shadowBlur=12;c.lineWidth=5*k+1;for(let s=0;s<3;s++){c.beginPath();c.ellipse(0,0,(50+pr*90)*p.big,(22+pr*30)*p.big,s*2.09,0,3.6);c.stroke()}break}
   case'bolt':{c.globalCompositeOperation='lighter';c.globalAlpha=k;c.strokeStyle=p.color;c.shadowColor=p.color;c.shadowBlur=18;let sd=p.seed*1e4;const rnd=()=>{sd=(sd*9301+49297)%233280;return sd/233280};
    const branch=(x,y,ang,len,w,depth)=>{c.lineWidth=w;c.beginPath();c.moveTo(x,y);for(let j=0;j<5;j++){x+=Math.cos(ang)*len/5+(rnd()-.5)*18;y+=Math.sin(ang)*len/5+(rnd()-.5)*18;c.lineTo(x,y);if(depth<2&&rnd()<.35){c.stroke();branch(x,y,ang+(rnd()-.5)*1.4,len*.5,w*.6,depth+1);c.beginPath();c.moveTo(x,y)}}c.stroke()};
    branch(p.x,p.y,p.ang,p.len,3.5,0);c.strokeStyle='#ffffff';c.shadowBlur=0;sd=p.seed*1e4;branch(p.x,p.y,p.ang,p.len,1.2,0);break}
   case'ring':c.globalCompositeOperation='lighter';c.globalAlpha=k;c.strokeStyle=p.color;c.shadowColor=p.color;c.shadowBlur=16;c.lineWidth=7*k+1;c.beginPath();c.arc(p.x,p.y,(30+pr*190)*p.big,0,7);c.stroke();break;
   case'gring':c.globalAlpha=k*.9;c.strokeStyle=p.color;c.lineWidth=10*k+1;c.beginPath();c.ellipse(p.x,p.y,(40+pr*340)*p.big,(10+pr*26)*p.big,0,0,7);c.stroke();break;
   case'roar':c.globalCompositeOperation='lighter';c.globalAlpha=k*.9;c.strokeStyle=p.color;c.lineWidth=6*k+1;c.translate(p.x,p.y);c.scale(p.dir,1);if(p.up)c.rotate(-.5);c.beginPath();c.arc(0,0,(30+pr*230)*p.big,-.6,.6);c.stroke();break;
   case'gust':{c.globalAlpha=k*.75;c.strokeStyle='#ffffff';c.lineWidth=2.5;c.lineCap='round';const x0=p.x-p.dir*pr*220;c.beginPath();c.moveTo(x0,p.y);c.bezierCurveTo(x0-p.dir*p.len*.4,p.y-14,x0-p.dir*p.len*.7,p.y+12,x0-p.dir*p.len,p.y-4);c.stroke();c.beginPath();c.arc(x0-p.dir*p.len,p.y-12,8,0,4.5);c.stroke();break}
   case'ha':c.globalAlpha=Math.min(1,k*2);c.translate(p.x,p.y);c.rotate(Math.sin(p.t*30)*.12);c.font='900 30px Impact,"Barlow Condensed",sans-serif';c.textAlign='center';c.lineWidth=6;c.strokeStyle='#3a0a00';c.strokeText(p.text,0,0);c.fillStyle=p.color;c.fillText(p.text,0,0);break;
   case'cobra':pCobra(p,k);break;
   case'kcobra':kCobra(p,k);break;
   case'spirit':spiritFx(p,k);break;
   case'dark':dDark(p,k);break;
   case'eyes':dEyes(p,k);break;
   case'moon':dMoon(p,k);break;
   case'leap':dLeap(p);break;
   case'fissure':dFissure(p,k);break;
   case'pool':dPool(p,k);break;
   case'tidal':dTidal(p,k);break;
   case'tornado':dTornado(p,k);break;
   case'vines':dVines(p,k);break;
   case'skybolt':dSkyBolt(p,k);break;
   case'vpuddle':vPuddle(p,k);break;
   case'vbite':vBite(p,k);break;
   case'icecluster':iceCluster(p,k);break;
   case'frostpatch':frostPatch(p,k);break;
   case'frostcone':frostCone(p,k);break;
   case'fangs':{c.translate(p.x,p.y);c.scale(p.dir,1);const bite=Math.min(1,p.t/.1);c.globalAlpha=k;c.fillStyle=p.color;c.shadowColor='#a8ff4a';c.shadowBlur=12;for(const s of[-1,1]){c.save();c.translate(0,s*(34-bite*22));c.scale(1,s);c.beginPath();c.moveTo(-14,-30);c.quadraticCurveTo(-4,-6,4,10);c.quadraticCurveTo(2,-12,10,-30);c.closePath();c.fill();c.translate(18,0);c.beginPath();c.moveTo(-14,-30);c.quadraticCurveTo(-4,-6,4,10);c.quadraticCurveTo(2,-12,10,-30);c.closePath();c.fill();c.restore()}break}
   case'portal':{c.globalCompositeOperation='lighter';c.translate(p.x,p.y);c.rotate(p.t*5);c.globalAlpha=k*.8;for(let s=0;s<4;s++){c.strokeStyle=s%2?p.color:p.c2;c.shadowColor=p.color;c.shadowBlur=16;c.lineWidth=4;c.beginPath();for(let a=0;a<9;a+=.15){const r=a*14*(.5+pr);const x=Math.cos(a+s*1.57)*r,y=Math.sin(a+s*1.57)*r*.55;a?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}break}
   }
   c.restore()}
 }}


/* ---------- V2 controllers on every screen: D-pad/stick moves the highlight, A/✕ presses it, B/○ goes back ---------- */
{let gp={},held=0,pausedSince=0;
 addEventListener('mousemove',()=>document.documentElement.classList.remove('pad-nav'));addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.isTrusted)document.documentElement.classList.remove('pad-nav')});
 const vis=()=>screens.find(s=>!$(s).classList.contains('hidden'));
 const usable=root=>[...root.querySelectorAll('button,input:not([type=hidden]),select,a[href]')].filter(b=>b.offsetParent&&!b.disabled&&getComputedStyle(b).visibility!=='hidden');
 function step(bs,cur,dx,dy){if(!cur)return bs[0];const a=cur.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;let best=null,bd=1e9;
  for(const b of bs){if(b===cur)continue;const r=b.getBoundingClientRect(),x=r.left+r.width/2-ax,y=r.top+r.height/2-ay;
   const along=dx?x*dx:y*dy,side=dx?Math.abs(y):Math.abs(x);if(along<=4)continue;const sc=along+side*2.2;if(sc<bd){bd=sc;best=b}}
  if(best)return best;const i=bs.indexOf(cur);return (dx>0||dy>0)?bs[(i+1)%bs.length]:bs[(i-1+bs.length)%bs.length]}
 setInterval(()=>{const g=readPadAny();if(!g){gp={};return}const p=gp;gp=g;const e=n=>g[n]&&!p[n];
  const dirs=['l','r','up','dn'];const anyDir=dirs.some(n=>g[n]);held=anyDir?held+1:0;const rep=held>8&&held%3===0;const pr=n=>e(n)||(rep&&g[n]);
  let root=null,back=null;const v=vis();
  if(game){if(!paused){pausedSince=0;return}if(!pausedSince)pausedSince=performance.now();if(performance.now()-pausedSince<300)return;root=document.querySelector('.fight-actions');back=$('pause');if(e('start')){togglePause();return}}
  else if(v==='select'&&selOptsOpen()){root=$('sel-opts');back=$('so-close')}
  else if(v==='dojo'){root=$('dojo');back=$('dojo-back')}
  else if(v==='achievement-gallery'){root=$('achievement-gallery');back=$('achievement-gallery-back')}
  else if(v==='online'){root=$('online');back=$('ol-back')}
  else if(v==='result'){root=$('result');back=$('result-menu')}
  else if(v==='menu'&&$('menu').classList.contains('started')&&e('back')){const bs=[...document.querySelectorAll('.cover-menu button')].filter(b=>b.offsetParent);if(bs[0])bs[0].focus();return}
  else return;
  if(!root)return;const bs=usable(root);if(!bs.length)return;
  if(Object.keys(g).some(k=>e(k)))document.documentElement.classList.add('pad-nav');
  let cur=bs.includes(document.activeElement)?document.activeElement:null;
  if(!cur&&(pr('l')||pr('r')||pr('up')||pr('dn'))){bs[0].focus();return}
  if(pr('l'))step(bs,cur,-1,0).focus();else if(pr('r'))step(bs,cur,1,0).focus();else if(pr('up'))step(bs,cur,0,-1).focus();else if(pr('dn'))step(bs,cur,0,1).focus();
  if(e('a')){const t=cur||(v==='result'?(!$('tower-next').classList.contains('hidden')?$('tower-next'):$('rematch')):bs[0]);if(t&&t.tagName!=='INPUT')t.click();else if(t)t.focus()}
  else if(e('back')&&back&&back.offsetParent){back.click()}
 },60)}

// Measure how high each fighter is really drawn (head, wings, raised arms) so the camera can keep it on screen.
{const _dF3=drawFighter;drawFighter=function(f,i,ghost){if(ghost||!game)return _dF3.apply(this,arguments);
  const di=c.drawImage;let top=1e9;
  c.drawImage=function(){const a=arguments,n=a.length,dy=n>=9?a[6]:a[2],dh=n>=9?a[8]:(n>=5?a[4]:(a[0].height||0));const m=c.getTransform();
   const y1=m.d*dy+m.f,y2=m.d*(dy+dh)+m.f;top=Math.min(top,y1,y2);return di.apply(c,a)};
  let r;try{r=_dF3.apply(this,arguments)}finally{c.drawImage=di}
  if(top<1e9){const m0=c.getTransform();const sc=m0.d||1;// world y = (device y - camera offset)/scale
   f._top=(top-m0.f)/sc}
  return r}}

// Living motion for every fighter (visual only — hitboxes, damage and timing are unchanged):
// breathing + fighting-stance bounce when standing, stride bob and lean when walking, stretch on take-off,
// squash + dust on landing, lunge into every strike, recoil when hit, and heavy footfalls for the big beasts.
const MOTION={ // w: weight (0 light .. 1 huge), br: breath, bn: stance bounce px, sw: sway, hz: idle speed, ln: strike lean
 lion:{w:.55,br:0.024,bn:5.1,sw:0.0192,hz:2.4,ln:.07}, tiger:{w:.5,br:0.021,bn:8.5,sw:0.0192,hz:2.9,ln:.08}, jaguar:{w:.35,br:0.018,bn:10.2,sw:0.0224,hz:3.4,ln:.09},
 leopard:{w:.3,br:0.018,bn:10.2,sw:0.024,hz:3.3,ln:.09}, wolf:{w:.4,br:0.0195,bn:8.5,sw:0.0192,hz:3.1,ln:.08}, hyena:{w:.35,br:0.021,bn:10.2,sw:0.032,hz:3.6,ln:.08},
 badger:{w:.45,br:0.024,bn:6.8,sw:0.016,hz:3.2,ln:.09}, grizzly:{w:.85,br:0.033,bn:3.4,sw:0.0224,hz:1.9,ln:.06}, crocodile:{w:.75,br:0.024,bn:3.4,sw:0.0288,hz:1.8,ln:.06},
 hippo:{w:.9,br:0.036,bn:3.4,sw:0.0192,hz:1.7,ln:.05}, elephant:{w:1,br:0.033,bn:1.7,sw:0.0192,hz:1.5,ln:.05}, eagle:{w:.3,br:.004,bn:2,sw:.004,hz:3.2,ln:.09},
 snake:{w:.4,br:0.018,bn:3.4,sw:0.064,hz:2.2,ln:.1,snake:1}, stag:{w:.6,br:0.024,bn:6.8,sw:0.0192,hz:2.4,ln:.07}, dolphin:{w:.5,br:0.022,bn:6.2,sw:0.0192,hz:2.6,ln:.07}, majic:{w:1,br:0.033,bn:5.1,sw:0.0256,hz:2.1,ln:.06}};
function motionDust(x,n,big){for(let k=0;k<n;k++)game.fx.push({kind:'pp',sh:'puff',x:x+(Math.random()-.5)*(60+big*80),y:398,vx:(Math.random()-.5)*(50+big*60),vy:-15-Math.random()*25,r:7+Math.random()*7+big*6,grow:40+big*25,life:.4+big*.15,color:'#a88c6e',alpha:.35,_n:1,t:0})}
{const _dF4=drawFighter;drawFighter=function(f,i,ghost){
  const M=f&&f.data&&MOTION[f.data.id];if(!M||!game||ghost)return _dF4.apply(this,arguments);
  const t=performance.now()/1000,dt=Math.min(.05,game.dt||frameDt||.016),fx=f.x,fy=400+f.y,act=f.action,ph0=(i||0)*1.7;
  let sx=1,sy=1,rot=0,dy=0,dx=0;
  // landing: squash + dust (heavier = bigger)
  if(f.ground&&f._air){f._land=t;if(f._air>.12){motionDust(fx,3+Math.round(M.w*5),M.w);if(M.w>.7)game.shake=Math.max(game.shake||0,.05+M.w*.06)}}
  f._air=f.ground?0:(f._air||0)+dt;
  const land=f._land?Math.max(0,1-(t-f._land)/.2):0;
  if(act!=='knockdown'&&act!=='down')f._floored=0;
  if(act==='idle'||act==='breathing'){
   const b=Math.sin(t*M.hz+ph0),bb=Math.abs(Math.sin(t*M.hz*.5+ph0));
   sy=1+b*M.br;sx=1-b*M.br*.45;dy=-bb*M.bn;rot=Math.sin(t*M.hz*.45+ph0)*M.sw*f.dir;
   if(M.snake){dx=Math.sin(t*1.6+ph0)*6;rot=Math.sin(t*1.6+ph0)*M.sw*f.dir}}
  else if(act==='walk'){
   const ph=(f.walk||0)*3.2*Math.PI/4,step=Math.abs(Math.sin(ph)),fwd=Math.sign(f.move||0)===f.dir;
   dy=-step*(4+M.w*6+(1-M.w)*4);sy=1+(step-.5)*.02;rot=(fwd?1:-.7)*(.03+(1-M.w)*.02)*f.dir+Math.sin(ph)*.01;
   if(M.snake){dx=Math.sin(ph)*8;dy*=.3}
   if(f.ground&&M.w>=.55){const k=Math.floor(((f.walk||0)*3.2)/4);if(k!==f._step){f._step=k;motionDust(fx,2+Math.round(M.w*3),M.w);if(M.w>.8)game.shake=Math.max(game.shake||0,.03+M.w*.03)}}}
  else if(act==='jump'||!f.ground){
   const v=f.vy||0;const st=Math.max(-1,Math.min(1,-v/600));sy=1+st*.06;sx=1-st*.04;rot=(f.vx||0)/900*.12*f.dir}
  else if(act==='block'){rot=-.03*f.dir;sy=.985;dx=-f.dir*3}
  else if(act==='hit'){const k=Math.max(0,1-(f.hitAnimTime||0)/.35)*(f.hitHeavy?1.4:1);rot=-.09*k*f.dir;dx=-f.dir*10*k;sy=1-.03*k;sx=1+.02*k}
  else if(act==='victory'){const b=Math.abs(Math.sin(t*3.2));dy=-b*6;sy=1+b*.02}
  else if((act==='knockdown'||act==='down')&&f.ground){
   // Hitting the floor: impact squash, two bounces, a skid, a dust burst — then (KO) a slow heave and the odd twitch.
   const S=SPRITES[f.data.id];let ti=-1;
   if(act==='knockdown')ti=(f.koTime||0)-((S&&S.ko?S.ko[1]:8)/9)*.85;else ti=.9-(f.down||0)-.42;
   if(ti>=0){if(!f._floored){f._floored=1;motionDust(fx,5+Math.round(M.w*6),M.w+.3);game.shake=Math.max(game.shake||0,.08+M.w*.1)}
    const lift=(1-M.w*.45);dy=ti<.32?-Math.sin(ti/.32*Math.PI)*16*lift:ti<.52?-Math.sin((ti-.32)/.2*Math.PI)*5*lift:0;
    if(ti<.09){const q=1-ti/.09;sy=1-q*.07;sx=1+q*.05}
    dx=-f.dir*Math.min(1,ti/.5)*(26*(1-M.w*.5));
    if(act==='knockdown'&&ti>.7){sy=1+Math.sin(t*1.7+ph0)*.012;sx=1-Math.sin(t*1.7+ph0)*.006;const tw=Math.sin(t*.63+ph0*2);if(tw>.985)rot=Math.sin(t*38)*.012}}}
  else if(act!=='down'&&act!=='knockdown'&&f.actionTotal>0){ // every strike: wind-up, lunge, recover
   const p=1-Math.max(0,f.actionTime||0)/f.actionTotal;const wind=p<.25?p/.25:0,hit=p>=.25&&p<.55?Math.sin((p-.25)/.3*Math.PI):0;
   rot=(-wind*.4+hit)*M.ln*.6*f.dir;dx=(-wind*5+hit*14)*f.dir;sx=1+hit*.025;sy=1-hit*.015+wind*.01}
  if(land>0){sy*=1-land*(.05+M.w*.05);sx*=1+land*(.04+M.w*.04)}
  if(sx===1&&sy===1&&!rot&&!dy&&!dx)return _dF4.apply(this,arguments);
  c.save();c.translate(fx+dx,fy+dy);c.rotate(rot);c.scale(sx,sy);c.translate(-fx,-fy);
  try{return _dF4.apply(this,arguments)}finally{c.restore()}}}

// Status looks: poisoned (green, sickly, bubbling) and frozen (icy blue, sparkling) — visual only.
{const _dF5=drawFighter;drawFighter=function(f,i,ghost){
  if(game&&!ghost&&f&&f._iceShatter&&!((f._frozenT||0)>0)){f._iceShatter=0;const top=f._top!=null?f._top:400+f.y-300;
   for(let n=0;n<16;n++)game.fx.push({kind:'pp',sh:'shard',x:f.x+R(-80,80),y:R(top,400+f.y),vx:R(-520,520),vy:R(-520,80),g:900,r:R(10,20),rot:R(0,6),vr:R(-12,12),life:R(.5,.8),color:n%2?'#bff4ff':'#ffffff',t:0,_n:1});game.shake=Math.max(game.shake||0,.12)}
  if(!game||ghost||!f||!((f._poisonT||0)>0||(f._frozenT||0)>0))return _dF5.apply(this,arguments);
  const dt=Math.min(.05,frameDt||.016);let r;
  if(f._frozenT>0){f._frozenT-=dt;c.save();c.filter='saturate(.35) brightness(1.25) sepia(.35) hue-rotate(160deg) saturate(2.2)';try{r=_dF5.apply(this,arguments)}finally{c.restore()}
   {const top=f._top!=null?f._top:400+f.y-300,bot=400+f.y+6,hgt=bot-top,w=Math.max(130,hgt*.42),cx=f.x,grow=Math.min(1,(.9-f._frozenT)/.12),a=Math.min(1,f._frozenT/.15);
    if(_rtOk(RT.ice[0])&&_rtOk(RT.ice[8])){c.save();// real ice chunks encase the body from the feet up
     const IC=[[-.62,.12,1.0,0],[.6,.14,1.05,6],[0,.08,1.2,8],[-.5,.42,.95,1],[.52,.45,.95,5],[0,.36,1.1,3],[-.32,.7,.9,2],[.36,.72,.9,4],[0,.9,.85,7]];
     for(const [ox,oy,sc,ti] of IC){if(oy>grow*1.02)continue;const im=RT.ice[ti];if(!_rtOk(im))continue;const S=w*sc*1.25,s2=S/Math.max(im.naturalWidth,im.naturalHeight),iw=im.naturalWidth*s2,ih=im.naturalHeight*s2,x=cx+ox*w,y=bot-hgt*oy;
      c.globalCompositeOperation='source-over';c.globalAlpha=a*.6;c.drawImage(im,x-iw/2,y-ih/2,iw,ih);c.globalCompositeOperation='lighter';c.globalAlpha=a*.32;c.drawImage(im,x-iw/2,y-ih/2,iw,ih)}
     c.restore()}else{
    c.save();c.globalAlpha=a*.9;const yT=bot-hgt*grow*1.04;
    const g=c.createLinearGradient(cx-w,0,cx+w,0);g.addColorStop(0,'rgba(140,210,245,.45)');g.addColorStop(.4,'rgba(230,250,255,.28)');g.addColorStop(.6,'rgba(190,235,255,.22)');g.addColorStop(1,'rgba(90,170,225,.45)');
    c.fillStyle=g;c.beginPath();c.moveTo(cx-w,bot);c.lineTo(cx-w*1.04,yT+hgt*.12);c.lineTo(cx-w*.55,yT);c.lineTo(cx+w*.3,yT-hgt*.03);c.lineTo(cx+w*1.02,yT+hgt*.1);c.lineTo(cx+w,bot);c.closePath();c.fill();
    c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=2.5;c.stroke();
    c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1.5;c.beginPath();c.moveTo(cx-w*.55,yT);c.lineTo(cx-w*.35,bot);c.moveTo(cx+w*.3,yT-hgt*.03);c.lineTo(cx+w*.45,bot);c.moveTo(cx-w*1.04,yT+hgt*.12);c.lineTo(cx+w*1.02,yT+hgt*.1);c.stroke();
    c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.moveTo(cx-w*.8,yT+hgt*.18);c.lineTo(cx-w*.62,yT+hgt*.12);c.lineTo(cx-w*.5,bot-hgt*.1);c.lineTo(cx-w*.7,bot-hgt*.05);c.fill();
    c.restore()}}
   if(Math.random()<.5)game.fx.push({kind:'pp',sh:'flake',x:f.x+R(-60,60),y:400+f.y-R(20,260),vx:R(-20,20),vy:R(-30,10),r:R(4,8),rot:R(0,6),vr:R(-3,3),life:.5,t:0,_n:1});return r}
  f._poisonT-=dt;c.save();c.filter='sepia(.55) hue-rotate(45deg) saturate(1.7) brightness(.92)';try{r=_dF5.apply(this,arguments)}finally{c.restore()}
  if(Math.random()<.35)game.fx.push({kind:'pp',sh:'drop',x:f.x+R(-50,50),y:400+f.y-R(60,240),vx:R(-30,30),vy:R(-60,-10),g:300,r:R(3,5),life:.6,color:Math.random()<.5?'#a8ff4a':'#5fd22a',glow:1,t:0,_n:1});
  return r}}

{const _dF6=drawFighter;drawFighter=function(f,i,ghost){
  if(!game||!f||!f.data||f.data.id!=='eagle'||f.hp<=0&&game.ko||['down','knockdown','hit'].includes(f.action))return _dF6.apply(this,arguments);
  const t=performance.now()/1000,air=!f.ground,walk=f.action==='walk';
  if(walk||!air)return _dF6.apply(this,arguments);const flap=air?Math.sin(t*14):Math.sin(t*3.2)*.75+Math.sin(t*7.1)*.12;
  const fx=f.x,top=f._top!=null?f._top:400+f.y-330,bot=400+f.y+10,H=bot-top,core=H*.2,sy=top+H*.3;
  c.save();c.beginPath();c.rect(fx-core,-3000,core*2,6000);c.clip();_dF6.apply(this,arguments);c.restore();
  for(const s of[-1,1]){c.save();c.beginPath();if(s<0)c.rect(fx-4000,-3000,4000-core,6000);else c.rect(fx+core,-3000,4000,6000);c.clip();
   c.translate(fx+s*core,sy);c.rotate(s*flap*.16);c.scale(1,1-flap*.07);c.translate(-(fx+s*core),-sy);
   _dF6.apply(this,arguments);c.restore()}
  // downdraft under the wings while hovering/jumping
  if(air&&Math.random()<.4)game.fx.push({kind:'pp',sh:'puff',x:fx+R(-90,90),y:398,vx:R(-120,120),vy:-10,r:R(10,16),grow:60,life:.4,color:'#c8bfae',alpha:.3,t:0,_n:1});
  if(Math.random()<(air?.25:.04))game.fx.push({kind:'pp',sh:'feather',x:fx+R(-150,150),y:top+H*R(.2,.5),vx:R(-40,40),vy:R(10,40),g:60,drag:.98,rot:R(0,6),sway:R(0,6),r:R(10,16),life:R(1,1.6),color:Math.random()<.6?'#ffffff':'#8a6a40',t:0,_n:1});
  }}

/* ================= SPECIAL MOVES 2.0 (docs/SPECIAL_MOVES_SPEC.md) =================
   Every fighter: 5 special moves + 1 ultimate finisher (MAJIC: 10 + 1).
   Inputs (relative to facing): S1 ↓↘→+ATTACK · S2 ↓↙←+ATTACK · S3 ↓↘→+SPECIAL · S4 ↓↙←+SPECIAL · S5 ←→+SPECIAL
   MAJIC extra: S6 →↓↘+ATTACK · S7 →↓↘+SPECIAL · S8 ←↙↓↘→+SPECIAL · S9 →↘↓↙←+SPECIAL · S10 ←→+ATTACK
   Ultimate: full meter + ↓↓+SPECIAL (or ↓↘→↓↘→+SPECIAL). Touch: the ★ MOVES button opens one-tap buttons. */
const SX_IN=['236A','214A','236S','214S','46S','623A','623S','41236S','63214S','46A'];
const SX_GLYPH={'236A':'↓↘→ + ATK','214A':'↓↙← + ATK','236S':'↓↘→ + SPC','214S':'↓↙← + SPC','46S':'←→ + SPC','623A':'→↓↘ + ATK','623S':'→↓↘ + SPC','41236S':'←↙↓↘→ + SPC','63214S':'→↘↓↙← + SPC','46A':'←→ + ATK','U':'↓↓ + SPC (FULL METER)'};
// a: animation (first one this fighter has is used) · t: length · h: hit times · dm: base damage · r: reach · st: hitstun · pu: knockback
// fs / fh: effects on start / on hit · use: an existing move · grab / launch / down / root / slow / venom / freeze / tele / parry / proj / cost / cd
const SX={
 dolphin:{m:[
  {n:'TIDAL WAVE CRUSHER',d:'Summons a towering ocean wave that crashes into the foe and knocks them back',a:['sx3','attack_heavy'],t:1.0,h:[.62],dm:13,st:.85,pu:460,r:520,ry:80,down:1,fs:['leap','spirit:rise','drops'],fh:['tidal','splash','wave','quake'],col:'#4fc3ff'},
  {n:'SONIC ECHO BLAST',d:'Echolocation shockwave from his mouth · stuns and warps the screen',a:['sx2','attack_heavy'],t:.85,h:[.48],dm:8,st:1.25,pu:220,r:700,ry:90,warp:1,fs:['wave'],fh:['wave','shock'],col:'#b8f0ff'},
  {n:'AQUA TORNADO',d:'Rapid spin inside a water vortex · lifts the foe into the air for juggles',a:['sx1','attack_heavy'],t:.85,h:[.25,.45,.65],dm:4.2,st:.7,pu:90,r:330,vy:-420,launch:1,fs:['vortex'],fh:['vortex','drops','splash'],col:'#3fd2ff'},
  {n:'DOLPHIN TORPEDO',d:'Launches forward like a torpedo wrapped in water · devastating shoulder strike',a:['special_pounce'],t:.75,h:[.38],dm:12,st:.75,pu:360,r:330,vx:760,fs:['leap','splash','drops'],fh:['splash','drops','shock'],col:'#4fc3ff'},
  {n:'TIDAL FIST',d:'Electric water uppercut (25% meter)',a:['attack_heavy','uppercut'],t:.78,h:[.42],dm:11,st:.75,pu:300,r:290,cost:25,fs:['drops'],fh:['splash','wave','shock'],col:'#7fe0ff'}],
  u:{n:'WRATH OF THE OCEAN',s:'THE OCEAN RISES',col:'#4fc3ff',dark:1,flood:1,seq:[['sx1',.6,['leap','vortex','drops','splash'],7],['uppercut',.5,['vortex','splash','shock'],8,'up'],['jump',.45,['drops'],0,'up'],['sx3',.7,['tidal','splash','wave','quake','shock'],16,'crash']]}},
 lion:{m:[
  {n:'ROYAL ROAR',d:'Thunderous roar · golden shockwave pushes the foe back',use:'lionRoar'},
  {n:"KING'S CLAW",d:'Three-claw combination with golden slash trails',a:['sx1','attack_light'],t:.72,h:[.2,.36,.52],dm:4.6,st:.5,pu:120,r:300,vx:220,fh:['gash','embers'],col:'#ffd36b'},
  {n:'SAVANNAH QUAKE',d:'Fists into the ground · dust, stones and a ground shockwave',a:['sx2','attack_heavy'],t:.86,h:[.5],dm:11,st:.8,pu:300,r:540,ry:60,fs:['dust'],fh:['dustwave','quake','rocks','cracks'],col:'#e9c27a'},
  {n:"PREDATOR'S POUNCE",d:'Leaping claw strike · dust on landing',use:'special'},
  {n:'GOLDEN DOMINION',d:'Golden aura power attack (25% meter)',a:['special_b','attack_heavy'],t:.95,h:[.45,.7],dm:7,st:.75,pu:330,r:330,cost:25,fs:['goldaura','flames'],fh:['flameburst','shock'],aura:4,col:'#ffd36b'}],
  u:{n:"KING'S WRATH",s:'THE KING HAS SPOKEN',col:'#ffd36b',seq:[['attack_heavy',.55,['roar','shock'],6],['uppercut',.45,['gash','embers'],7,'up'],['special_pounce',.55,['gash','flameburst'],8,'air'],['attack_heavy',.6,['quake','dustwave','rocks','shock','goldaura'],14,'crash']]}},
 tiger:{m:[
  {n:'TIGER BLITZ',d:'Rapid claw flurry with orange motion trails',a:['sx1','attack_light'],t:.7,h:[.12,.24,.36,.48],dm:3.3,st:.45,pu:80,r:290,vx:170,fh:['gash','embers'],col:'#ff9a3a'},
  {n:'STRIPED FURY',d:'Lunge with alternating claws',use:'tigerPounce'},
  {n:'PREDATOR RUSH',d:'Charging tackle that knocks the foe back',a:['sx2','attack_heavy'],t:.7,h:[.32],dm:12,st:.7,pu:430,r:300,vx:700,fs:['dust'],fh:['shock','dust'],col:'#ff9a3a'},
  {n:'BURNING CLAWS',d:'Claws ignite with fiery energy trails',a:['attack_heavy'],t:.62,h:[.3],dm:11,st:.7,pu:260,r:290,vx:200,fs:['flames'],fh:['flameburst','gash','embers'],col:'#ff7a2a'},
  {n:'SAVAGE UPPERCUT',d:'Rising claw that launches the foe',a:['sx3','uppercut'],t:.66,h:[.26],dm:12,st:.9,pu:150,r:270,vy:-380,launch:1,fh:['gash','embers','shock'],col:'#ff9a3a'}],
  u:{n:"TIGER'S FURY",s:'STRIPES OF FIRE',col:'#ff8a2a',seq:[['attack_light',.3,['gash'],4],['attack_heavy',.3,['gash','embers'],4],['sx1',.45,['gash','embers'],6],['jump',.4,['flames'],0,'up'],['special_pounce',.6,['flameburst','embers','shock','dustwave'],15,'crash']]}},
 jaguar:{m:[
  {n:'SHADOW POUNCE',d:'Fast, low-profile lunge',use:'jaguarAmbush'},
  {n:'JUNGLE AMBUSH',d:'Vanish into dark mist · reappear behind with a claw',a:['attack_light'],t:.66,h:[.42],dm:10,st:.7,pu:220,r:270,tele:'behind',fs:['smoke'],fh:['gash','smoke'],col:'#2fc3a8'},
  {n:'EMERALD CLAWS',d:'Glowing teal double slash',a:['sx1','attack_heavy'],t:.6,h:[.2,.38],dm:6,st:.6,pu:200,r:300,vx:200,fh:['gash','leafburst'],col:'#2fffd0'},
  {n:"PREDATOR'S GRIP",d:'Grab and wrestling takedown (beats block)',a:['sx2','bite'],t:.85,h:[.45],dm:13,st:1,pu:120,r:235,grab:1,down:1,fh:['dust','smoke'],col:'#2fc3a8'},
  {n:'PHANTOM RUSH',d:'Close-range flurry with shadow afterimages (25% meter)',a:['special_b','attack_heavy'],t:.9,h:[.15,.3,.45,.6,.75],dm:2.7,st:.4,pu:60,r:320,vx:420,cost:25,fs:['after','smoke'],fh:['gash'],col:'#2fffd0'}],
  u:{n:'JUNGLE EXECUTION',s:'THE SHADOW STRIKES',col:'#2fffd0',dark:1,seq:[['attack_light',.35,['smoke','gash'],5,'side'],['attack_heavy',.35,['gash'],5,'side'],['sx1',.4,['gash','leafburst'],6,'side'],['special_pounce',.65,['leafburst','smoke','shock','gash'],15,'crash']]}},
 leopard:{m:[
  {n:'FROST CLAWS',d:'Icy claw slashes that scatter snowflakes',a:['sx1','attack_light'],t:.66,h:[.16,.3,.44],dm:4.1,st:.5,pu:100,r:290,vx:200,fs:['flakes'],fh:['shards','flakeburst'],col:'#9ce7ff'},
  {n:'BLIZZARD DASH',d:'Dash through the arena on swirling snow',a:['dash','run'],t:.45,h:[.2],dm:8,st:.55,pu:160,r:230,vx:900,fs:['flakes','frostpatch'],fh:['flakeburst'],col:'#bff4ff'},
  {n:'FROZEN POUNCE',d:'High-speed aerial attack · ice crystals on impact',use:'special'},
  {n:'SNOWSTORM SPIN',d:'Spinning kick wrapped in snow and icy wind',a:['sx2','attack_heavy'],t:.7,h:[.3,.46],dm:6.2,st:.6,pu:260,r:310,fs:['flakes'],fh:['flakeburst','shards'],swirl:1,col:'#9ce7ff'},
  {n:'ARCTIC BREATH',d:'Cold mist that slows the foe',a:['sx3','bite'],t:.85,h:[.5],dm:7,st:.6,pu:120,r:430,slow:3,fs:['frostcone','breath'],fh:['frostpatch','flakeburst'],col:'#bff4ff'}],
  u:{n:'ABSOLUTE ZERO',s:'THE JUNGLE FREEZES',col:'#9ce7ff',dark:1,seq:[['sx2',.45,['flakes','flakeburst'],5,'side'],['sx1',.45,['shards','flakeburst'],5,'side'],['attack_light',.35,['shards'],4,'side'],['bite',.55,['freeze','icecluster'],4],['sx2',.6,['shards','flakeburst','shock'],14,'crash']]}},
 wolf:{m:[
  {n:'LUNAR HOWL',d:'Howl that releases a silver shockwave',a:['sx1','attack_heavy'],t:.85,h:[.45],dm:7,st:.6,pu:430,r:430,fs:['moon','howl'],fh:['shock'],col:'#cfe3ff'},
  {n:'MOON CLAWS',d:'Glowing blue-white claw slashes',a:['attack_heavy'],t:.56,h:[.18,.32],dm:6,st:.55,pu:180,r:300,vx:200,fh:['gash','spirit'],col:'#cfe3ff'},
  {n:'PACK RUSH',d:'Rapid combination with spectral wolves',use:'wolfFrenzy'},
  {n:'NIGHT POUNCE',d:'Leaping attack wrapped in swirling mist',a:['special_pounce'],t:.7,h:[.4],dm:11,st:.7,pu:250,r:300,vx:520,vy:-300,fs:['smoke'],fh:['gash','smoke'],col:'#9fc4ff'},
  {n:'MOONLIGHT COUNTER',d:'Guard stance · strike back the moment you are hit',a:['block'],t:.55,h:[],parry:.5,counter:{a:['sx2','attack_heavy'],t:.5,h:[.18],dm:13,st:.8,pu:340,r:330,fh:['gash','shock']},col:'#cfe3ff'}],
  u:{n:'FULL MOON FURY',s:'THE MOON HUNTS',col:'#cfe3ff',dark:1,moon:1,seq:[['attack_light',.32,['gash'],4],['attack_heavy',.32,['gash','spirit'],5],['sx2',.4,['gash'],5],['attack_light',.3,['gash'],4],['uppercut',.6,['shock','spirit','gash'],14,'up']]}},
 hyena:{m:[
  {n:'SAVAGE LAUGH',d:'Terrifying laugh · disruptive soundwave',a:['sx1','attack_heavy'],t:.8,h:[.4],dm:5,st:.95,pu:200,r:390,fs:['cackle'],fh:['shock','cackle'],col:'#ff8a5a'},
  {n:'BONE CRUSHER',d:'Close grab and crushing bite (beats block)',a:['bite'],t:.75,h:[.4],dm:13,st:.9,pu:150,r:235,grab:1,down:1,fh:['dust','embers'],col:'#ff5a3a'},
  {n:'SCAVENGER RUSH',d:'Unpredictable feint and lunge',use:'hyenaFeint'},
  {n:'WILD FRENZY',d:'Five wild claws with red motion trails',a:['sx2','attack_light'],t:.8,h:[.12,.26,.4,.54,.68],dm:2.7,st:.4,pu:60,r:300,vx:250,fh:['gash'],col:'#ff5a3a'},
  {n:'SAVAGE LEAP',d:'Lunging leap into a brutal ground slam',a:['special_pounce'],t:.85,h:[.6],dm:12,st:.8,pu:300,r:320,vx:480,vy:-420,fh:['dust','rocks','shock'],col:'#ff8a5a'}],
  u:{n:'MADNESS UNLEASHED',s:'HA HA HA HA!',col:'#ff4a2a',seq:[['sx1',.45,['cackle'],0],['attack_light',.28,['gash'],4],['bite',.3,['gash'],5],['sx2',.45,['gash','embers'],6],['special_pounce',.65,['dust','rocks','shock','flameburst'],15,'crash']]}},
 badger:{m:[
  {n:'BURROW STRIKE',d:'Dig underground · erupt beneath the foe',a:['sx1','special_earth_slam'],t:1,h:[.72],dm:13,st:.8,pu:120,r:1400,tele:'under',launch:1,fs:['dust','clods'],fh:['rocks','dust','cracks'],col:'#e0a060'},
  {n:'EARTH CLAWS',d:'Claws that throw dirt and stones',a:['attack_light'],t:.5,h:[.22],dm:8,st:.55,pu:150,r:280,vx:150,fh:['clods','dust'],col:'#c9935a'},
  {n:'TUNNEL RUSH',d:'Fast, low charging attack',a:['sx2','run'],t:.6,h:[.3],dm:10,st:.6,pu:280,r:260,vx:780,fs:['dust'],fh:['dust','rocks'],col:'#c9935a'},
  {n:'STONE BREAKER',d:'Ground strike · short-range shockwave',use:'badgerBreaker'},
  {n:'IRON DEFENSE',d:'Brace · counter the next strike',a:['block'],t:.55,h:[],parry:.5,counter:{a:['attack_heavy'],t:.5,h:[.2],dm:12,st:.8,pu:320,r:320,fh:['rocks','shock']},col:'#c6a77a'}],
  u:{n:'EARTH SHATTER',s:'THE GROUND GIVES WAY',col:'#e0a060',seq:[['special_earth_slam',.45,['cracks','rocks','dust'],5],['special_earth_slam',.45,['cracks','rocks','dust'],5],['special_earth_slam',.45,['quake','rocks','dustwave'],5],['uppercut',.6,['rocks','dust','shock'],14,'up']]}},
 grizzly:{m:[
  {n:'GRIZZLY SLAM',d:'Two-handed ground smash',a:['sx1','attack_heavy'],t:.85,h:[.5],dm:13,st:.8,pu:300,r:320,fh:['quake','rocks','cracks','dust'],col:'#ff6a3a'},
  {n:'MOUNTAIN CHARGE',d:'Rush forward with tremendous force',use:'grizzlyMaul'},
  {n:'TITAN GRIP',d:'Crushing bear hug and throw (beats block)',a:['sx2','bite'],t:1,h:[.4,.75],dm:7,st:1,pu:380,r:240,grab:1,down:1,fh:['bearhug','dust'],col:'#c99a70'},
  {n:'EARTHQUAKE STOMP',d:'Stomp that sends shockwaves outward',a:['sx3','attack_heavy'],t:.8,h:[.42],dm:9,st:.6,pu:260,r:530,ry:50,fs:['dust'],fh:['quake','dustwave','cracks'],col:'#c99a70'},
  {n:'SAVAGE MAUL',d:'Heavy three-claw combination',a:['attack_heavy'],t:.85,h:[.25,.45,.65],dm:5,st:.55,pu:200,r:300,vx:220,fh:['gash','rocks'],col:'#ff6a3a'}],
  u:{n:'MOUNTAIN COLLAPSE',s:'THE MOUNTAIN FALLS',col:'#ff6a3a',seq:[['sx2',.75,['bearhug','dust'],8],['uppercut',.45,['dust','shock'],5,'up'],['sx1',.75,['quake','rocks','dustwave','cracks','dust'],16,'crash']]}},
 crocodile:{m:[
  {n:'TIDAL TAIL',d:'Massive tail swing with a burst of water',a:['sx1','attack_heavy'],t:.75,h:[.38],dm:11,st:.7,pu:320,r:340,fs:['drops'],fh:['splash','drops'],col:'#3fd2b0'},
  {n:'SWAMP SURGE',d:'A wave of muddy water rushes the foe',a:['sx2','attack_heavy'],t:.95,h:[.6],dm:10,st:.7,pu:340,r:620,ry:70,fs:['tidal'],fh:['splash','mud'],col:'#7fae6a'},
  {n:'DEATH ROLL',d:'Signature grab-and-roll',use:'crocodileRoll'},
  {n:'AQUA SLAM',d:'Ground smash · huge splash and shockwave',a:['attack_heavy'],t:.7,h:[.36],dm:12,st:.75,pu:300,r:300,fh:['splash','wave','quake'],col:'#3fd2b0'},
  {n:'PREDATOR AMBUSH',d:'Lunge through a burst of swamp water and mist',a:['special_pounce'],t:.7,h:[.38],dm:12,st:.7,pu:280,r:310,vx:640,fs:['splash','smoke'],fh:['splash','drops'],col:'#3fd2b0'}],
  u:{n:'DEATH ROLL TSUNAMI',s:'THE SWAMP RISES',col:'#3fd2b0',flood:1,seq:[['sx2',.6,['tidal','splash'],5],['attack_heavy',.4,['splash'],5],['sx1',.5,['vortex','splash','drops'],5],['sx1',.5,['vortex','splash','drops'],5],['special_pounce',.65,['splash','wave','drops','shock'],13,'up']]}},
 hippo:{m:[
  {n:'RIVER CHARGE',d:'Charge forward through splashing water',use:'hippoRush'},
  {n:'TITAN BITE',d:'Powerful close-range jaw attack',a:['bite'],t:.65,h:[.32],dm:13,st:.8,pu:250,r:255,fh:['splash','gash'],col:'#4aa9e8'},
  {n:'MUDQUAKE',d:'Stomp that sends a muddy shockwave',a:['sx1','attack_heavy'],t:.85,h:[.48],dm:10,st:.65,pu:280,r:530,ry:55,fs:['mud'],fh:['quake','mud','dustwave'],col:'#8a7356'},
  {n:'RIVER SLAM',d:'Grab and slam into a burst of water (beats block)',a:['sx2','attack_heavy'],t:.95,h:[.55],dm:15,st:1,pu:200,r:245,grab:1,down:1,fh:['splash','quake'],col:'#4aa9e8'},
  {n:'TERRITORIAL ROAR',d:'Enormous roar · powerful shockwave',a:['sx3','bite'],t:.85,h:[.45],dm:6,st:.7,pu:460,r:440,fs:['roar'],fh:['shock'],col:'#d6f1ff'}],
  u:{n:'RIVER RAMPAGE',s:'THE RIVER TITAN',col:'#4aa9e8',flood:1,seq:[['run',.55,['tidal','splash'],6],['uppercut',.45,['splash','shock'],6,'up'],['sx2',.7,['splash','mud','quake','wave','drops'],16,'crash']]}},
 elephant:{m:[
  {n:'THUNDER STOMP',d:'Stomp · massive shockwave',use:'stomp'},
  {n:'TUSK CHARGE',d:'Powerful forward charge',use:'charge'},
  {n:'TRUNK WHIP',d:'Swinging trunk strike',a:['sx1','attack_light'],t:.6,h:[.3],dm:10,st:.65,pu:300,r:340,fh:['gash','dust'],col:'#e4d7bd'},
  {n:'SAVANNAH STORM',d:'Swirling dust storm',a:['sx2','attack_heavy'],t:1,h:[.3,.5,.7],dm:4.6,st:.55,pu:150,r:370,fs:['tornado','dust'],fh:['dust','bolts'],col:'#c6b7a0'},
  {n:'TITAN TOSS',d:'Trunk grab and throw',use:'grab'}],
  u:{n:'THUNDERING TITAN',s:'THE EARTH TREMBLES',col:'#ffe2b0',seq:[['victory',.6,['trumpet','dust'],0],['run',.5,['stampede','dust'],6],['uppercut',.45,['shock','bolts'],7,'up'],['attack_heavy',.75,['quake','dustwave','bolts','rocks','cracks'],15,'crash']]}},
 eagle:{m:[
  {n:'RAZOR WINGS',d:'Wing sweep sends cutting wind blades',a:['sx1','attack_heavy'],t:.7,h:[.44],dm:9,st:.6,pu:220,r:640,ry:90,fs:['wind','proj:wind'],fh:['featherburst'],col:'#ffffff'},
  {n:'SKY DIVE',d:'Rise and dive onto the foe',use:'eagleSkyfall'},
  {n:'FEATHER STORM',d:'Feathers and swirling wind engulf the foe',a:['sx2','attack_heavy'],t:.9,h:[.4,.6,.8],dm:4,st:.55,pu:80,r:470,fs:['feathers','wind'],fh:['featherburst'],col:'#ffe9a0'},
  {n:'THUNDER TALONS',d:'Talon strike crackling with golden energy',a:['attack_heavy'],t:.6,h:[.3],dm:12,st:.7,pu:280,r:300,vx:250,fh:['bolts','gash'],col:'#ffe08a'},
  {n:'CYCLONE WINGS',d:'Wing beats unleash a powerful gust',a:['special_b'],t:.8,h:[.4],dm:6,st:.5,pu:540,r:490,fs:['tornado','wind'],fh:['wind','feathers'],col:'#ffffff'}],
  u:{n:'STORM OF THE SKIES',s:'THE SKY EMPEROR',col:'#ffe9a0',dark:1,seq:[['special_b',.55,['tornado','wind','feathers'],6,'up'],['jump',.45,['featherburst','wind'],0,'air'],['special_pounce',.7,['featherburst','bolts','shock','wind'],17,'crash']]}},
 stag:{m:[
  {n:'FOREST AWAKENING',d:'Grass and leaves erupt around the Stag',a:['sx1','special_b'],t:.9,h:[.5],dm:8,st:.7,pu:300,r:410,fs:['leafstorm','grass'],fh:['leafburst'],col:'#9fd86a'},
  {n:'ANTLER CHARGE',d:'Powerful antler strike',use:'stagAntler'},
  {n:"NATURE'S GRASP",d:'Roots rise and restrain the foe',a:['sx2','attack_heavy'],t:.9,h:[.55],dm:7,st:1.3,pu:20,r:570,ry:60,root:1.2,fs:['grass'],fh:['vines','grass'],col:'#7fcf3a'},
  {n:'LEAF CYCLONE',d:'Wings whip up a storm of leaves',a:['special_c','special_b'],t:.9,h:[.35,.55,.75],dm:4,st:.5,pu:120,r:430,fs:['leafstorm'],fh:['leafburst'],col:'#9fd86a'},
  {n:'EMERALD STRIKE',d:'Green-energy strike with flying leaves',a:['attack_heavy'],t:.62,h:[.3],dm:12,st:.7,pu:290,r:310,vx:250,fh:['leafburst','shock'],col:'#a8ff6a'}],
  u:{n:'WRATH OF THE FOREST',s:'THE FOREST ANSWERS',col:'#a8ff6a',seq:[['sx2',.75,['vines','grass'],5],['special_pounce',.55,['leafstorm','dust'],7],['sx1',.75,['leafburst','leafstorm','grass','shock'],15,'up']]}},
 snake:{m:[
  {n:'VENOM SPIT',d:'Glowing green venom projectile (poisons)',a:['sx1','bite'],t:.7,h:[.46],dm:7,st:.55,pu:120,r:660,ry:90,venom:3,fs:['proj:venom'],fh:['venom'],col:'#8fe04a'},
  {n:'SERPENT STRIKE',d:'Lightning-fast forward bite',use:'snakeVenom'},
  {n:'VENOM CLOUD',d:'Green mist that poisons',a:['sx2','special_c'],t:.9,h:[.5],dm:5,st:.5,pu:60,r:390,venom:4,fs:['poison'],fh:['venom'],col:'#8fe04a'},
  {n:'COILED CRUSHER',d:'Grab and constrict',use:'snakeCoil'},
  {n:'FANG UPPERCUT',d:'Rising strike with emerald energy',a:['uppercut'],t:.6,h:[.24],dm:12,st:.9,pu:150,r:270,vy:-300,launch:1,fh:['venom','fangs'],col:'#a8ff4a'}],
  u:{n:'VENOMOUS NIGHTMARE',s:'THE VENOM KING',col:'#8fe04a',dark:1,seq:[['sx2',.55,['poison'],3],['bite',.28,['venom'],4,'side'],['bite',.28,['venom'],4,'side'],['attack_light',.28,['venom'],4,'side'],['bite',.7,['kstrike','venom','shock'],14]]}},
 majic:{m:[
  {n:'ELEMENTAL CHAOS',d:'Water, fire, ice, lightning and wind in one blast (25%)',a:['ultra_move','special_b'],t:1,h:[.4,.65],dm:8,st:.7,pu:320,r:430,cost:25,fs:['splash','flames','flakes','wind'],fh:['flameburst','shards','bolts','splash'],col:'#b46bff'},
  {n:"PREDATOR'S ARSENAL",d:'Rapid five-claw flurry',a:['sx2','attack_light'],t:.9,h:[.12,.28,.44,.6,.76],dm:3,st:.45,pu:70,r:320,vx:250,fh:['gash','embers'],col:'#ffd36b'},
  {n:'FROZEN SWAMP',d:'Icy water surge that freezes the foe',a:['special_c'],t:.9,h:[.55],dm:10,st:.8,pu:200,r:570,ry:70,fs:['tidal'],fh:['freeze','splash','shards'],col:'#9ce7ff'},
  {n:'EARTH DESTROYER',d:'Ground slam, stomp and earth eruption',a:['sx3','special_d'],t:.95,h:[.55],dm:12,st:.8,pu:340,r:520,ry:60,fs:['dust'],fh:['quake','rocks','cracks','dustwave'],col:'#e0a060'},
  {n:'VENOM STORM',d:'Venom mist spun up in a wind vortex',a:['special_b'],t:.9,h:[.5],dm:7,st:.6,pu:180,r:470,venom:3,fs:['poison','tornado'],fh:['venom'],col:'#8fe04a'},
  {n:'FOREST CATACLYSM',d:'Roots and leaves ride a water surge',a:['attack_heavy'],t:.9,h:[.5],dm:8,st:1.1,pu:60,r:530,ry:60,root:1,fs:['grass'],fh:['vines','leafburst','splash'],col:'#9fd86a'},
  {n:'HYBRID TRANSFORMATION',d:'Power surges · stronger for 6 s',a:['special_d','special_b'],t:.8,h:[],buff:6,fs:['portal','after'],col:'#b46bff'},
  {n:'ROYAL DEVASTATION',d:'Roar, claws and a diving strike',a:['special_pounce'],t:.9,h:[.3,.6],dm:7,st:.7,pu:300,r:330,vx:500,vy:-250,fs:['roar'],fh:['gash','featherburst','shock'],col:'#ffd36b'},
  {n:'TITAN CRUSHER',d:'Crushing grab (beats block)',a:['bite'],t:1,h:[.5],dm:15,st:1,pu:300,r:250,grab:1,down:1,fh:['bearhug','splash','quake'],col:'#c99a70'},
  {n:'ULTIMATE PREDATOR',d:'A storm of signature strikes (50% meter)',a:['ultra_move','special_b'],t:1.1,h:[.15,.32,.5,.68,.86],dm:3.6,st:.45,pu:80,r:340,vx:300,cost:50,fh:['gash','embers','flakeburst','leafburst','featherburst'],col:'#b46bff'}],
  u:{n:"THE KINGDOM'S END",s:'THE KINGDOM FALLS',col:'#b46bff',dark:1,storm:1,seq:[['sx1',.8,['portal','tornado','flakes','leafstorm','poison'],0],['ultra_move',.5,['bolts','flameburst','splash'],7,'up'],['special_c',.45,['shards','venom','featherburst'],7,'air'],['special_d',.75,['quake','rocks','bolts','splash','flameburst','leafburst','shock','dustwave'],18,'crash']]}}
};
// less is more: each fighter's 3 best specials on ★1 ★2 ★3 (+ the Ultimate on ★U). MAJIC's CPU keeps his whole arsenal.
const SX3={dolphin:[0,1,2],lion:[0,1,3],tiger:[1,0,4],jaguar:[0,2,3],leopard:[0,1,4],wolf:[0,2,3],hyena:[0,2,3],badger:[0,2,3],
 grizzly:[1,0,2],crocodile:[2,0,1],hippo:[0,2,4],elephant:[0,1,4],eagle:[1,0,2],stag:[1,0,2],snake:[1,0,3],majic:[1,3,7]};
for(const id in SX){const D=SX[id],pick=(SX3[id]||[0,1,2]).map(i=>D.m[i]).filter(Boolean);D.m=id==='majic'?[...pick,...D.m.filter(m=>!pick.includes(m))]:pick}
const SX_SHOW=3;
const SXK=['s1','s2','s3','su'];
BTN.push(...SXK);
// ---------- effects quality, screen shake & flash ----------
let FXQ='high',RSHAKE=false,RFLASH=false,CAMTILT=true;try{CAMTILT=localStorage.getItem('kotj-tilt')!=='0'}catch(_){}
const TILT={a:0,kick:0,cur:0};
try{FXQ=localStorage.getItem('kotj-fxq')||(matchMedia('(pointer:coarse)').matches?'medium':'high');RSHAKE=localStorage.getItem('kotj-rshake')==='1';RFLASH=localStorage.getItem('kotj-rflash')==='1'}catch(_){}
const FXQ_KEEP={low:.35,medium:.65,high:1},FXQ_ALWAYS=new Set(['spirit','bearhug','proj','cracks','fissure','pool','tidal','aftermark','gash','ring','gring','cobra','kcobra','vbite','vpuddle','icecluster','frostcone','frostpatch','dark','eyes','moon','tornado','vines','portal','skybolt','ha','roar','sheet','wave','vortex','goldaura','fog']);
{const _P=P;P=function(o){if(FXQ!=='high'&&!FXQ_ALWAYS.has(o.sh)&&Math.random()>FXQ_KEEP[FXQ])return;return _P(o)}}
{const _fu=fxUpdate;fxUpdate=function(dt){const r=_fu.apply(this,arguments);if(game){if(RSHAKE)game.shake=Math.min(game.shake||0,.05);if(RFLASH)game.flash=Math.min(game.flash||0,.12)}return r}}
function sxOptLabel(){return{tilt:'CAMERA TILT: '+(CAMTILT?'ON':'OFF'),fxq:'EFFECTS: '+FXQ.toUpperCase(),shake:'SCREEN SHAKE: '+(RSHAKE?'LOW':'FULL'),flash:'FLASHES: '+(RFLASH?'LOW':'FULL')}}
function sxOptsRefresh(){const L=sxOptLabel();document.querySelectorAll('.fxq-btn').forEach(b=>b.textContent=L.fxq);document.querySelectorAll('.rshake-btn').forEach(b=>b.textContent=L.shake);document.querySelectorAll('.rflash-btn').forEach(b=>b.textContent=L.flash);document.querySelectorAll('.tilt-btn').forEach(b=>b.textContent=L.tilt)}
function sxOptsInstall(){
 const mk=(cls,parentSel,before)=>document.querySelectorAll(parentSel).forEach(p=>{if(p.querySelector('.'+cls))return;const b=document.createElement('button');b.className='secondary '+cls+(p.classList.contains('cover-menu')?' cover-setting':'');const ref=before?p.querySelector(before):null;ref?p.insertBefore(b,ref):p.appendChild(b)});
 for(const c of['fxq-btn','rshake-btn','rflash-btn','tilt-btn']){mk(c,'.fight-actions');mk(c,'#sel-opts','#so-close')}
 mk('sx-moves-btn','.fight-actions');mk('sx-moves-btn','#sel-opts','#so-close');
 document.querySelectorAll('.sx-moves-btn').forEach(b=>b.textContent='MOVE LIST');
 sxOptsRefresh()}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(!b)return;
 if(b.classList.contains('fxq-btn')){FXQ={high:'low',low:'medium',medium:'high'}[FXQ];try{localStorage.setItem('kotj-fxq',FXQ)}catch(_){}sxOptsRefresh()}
 else if(b.classList.contains('rshake-btn')){RSHAKE=!RSHAKE;try{localStorage.setItem('kotj-rshake',RSHAKE?'1':'0')}catch(_){}sxOptsRefresh()}
 else if(b.classList.contains('tilt-btn')){CAMTILT=!CAMTILT;try{localStorage.setItem('kotj-tilt',CAMTILT?'1':'0')}catch(_){}sxOptsRefresh()}
 else if(b.classList.contains('rflash-btn')){RFLASH=!RFLASH;try{localStorage.setItem('kotj-rflash',RFLASH?'1':'0')}catch(_){}sxOptsRefresh()}
 else if(b.classList.contains('sx-moves-btn')){const id=game&&game.fighters?game.fighters[0].data.id:(document.getElementById('select')&&document.getElementById('select').dataset.f)||'lion';sxMoveList(id)}});
// ---------- move list ----------
function sxMoveList(id){let el=document.getElementById('sx-movelist');if(!el){el=document.createElement('div');el.id='sx-movelist';el.className='sx-movelist';document.body.appendChild(el);el.addEventListener('click',e=>{if(e.target===el||e.target.closest('.sx-close'))el.classList.remove('on')})}
 const D=SX[id];if(!D){return}const fd=roster.find(r=>r.id===id)||{name:id.toUpperCase()};
 const dv=typeof devNow==='function'?devNow():'keyboard',row=(k,m,i)=>`<li><b>★${i+1} · ${m.n}</b><span class="in">${starHow(i,dv)}</span><i>${m.d||''}</i></li>`;
 el.innerHTML=`<div class="sx-ml-card"><h3>${fd.name} · SPECIAL MOVES</h3><ol>${D.m.slice(0,SX_SHOW).map((m,i)=>row(SX_IN[i],m,i)).join('')}</ol><div class="sx-ult"><b>★U · ULTIMATE · ${D.u.n}</b><span class="in">${starHow('U',dv)}</span></div><p class="sx-tip">One button per special move, no combos to remember.</p><button class="primary sx-close">CLOSE</button></div>`;
 el.classList.add('on')}
// ---------- touch: ★ MOVES panel ----------
function sxTouchInstall(){const pad=document.getElementById('touch-pad');if(!pad||pad.querySelector('.pad-stars'))return;
 const box=document.createElement('div');box.className='pad-stars';
 box.innerHTML='<button data-sx="s1" class="st1">★1</button><button data-sx="s2" class="st2">★2</button><button data-sx="s3" class="st3">★3</button><button data-sx="su" class="stu">★U</button>';
 pad.appendChild(box);
 box.querySelectorAll('button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();ac();touch[b.dataset.sx]=0;touchTap[b.dataset.sx]=1;b.classList.add('on')});
  const off=()=>b.classList.remove('on');b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('contextmenu',e=>e.preventDefault())});
 setInterval(()=>{if(!game||!game.fighters)return;const f=game.fighters[0],D=SX[f.data.id];box.querySelector('.stu').classList.toggle('ready',f.meter>=100);
  if(D)box.querySelectorAll('[data-sx^="s"]:not(.stu)').forEach((b,i)=>{const m=D.m[i];b.title=m?m.n:'';b.classList.toggle('low',!!(m&&m.cost&&f.meter<m.cost))})},250)}
// ---------- motion input reading ----------
function sxDirCode(f,inp){const fw=(inp.r&&f.dir===1)||(inp.l&&f.dir===-1),bk=(inp.r&&f.dir===-1)||(inp.l&&f.dir===1),dn=inp.dn||inp.bl,up=inp.j;return dn?(fw?3:bk?1:2):up?(fw?9:bk?7:8):fw?6:bk?4:5}
const SXM={'236':[[1,2,3],[6,9]],'214':[[1,2,3],[4,7]],'46':[[4,7,1],[6,9,3]],'22':[[2],[5],[2]],'623':[[6],[2,1],[3]],'41236':[[4,7],[1,2],[3],[6,9]],'63214':[[6,9],[3,2],[1],[4,7]],'236236':[[2,1],[3],[6],[2,1],[3],[6,9]]};
function sxMatch(hist,now,motion){const toks=SXM[motion];if(!toks)return false;let ti=toks.length-1,first=now;const win=toks.length>=4?.9:.5;
 for(let i=hist.length-1;i>=0&&ti>=0;i--){const h=hist[i];if(now-h.t>win)break;if(toks[ti].includes(h.c)){if(ti===toks.length-1&&(i<hist.length-2||(now-h.t>.25&&i!==hist.length-1)))return false;first=h.t;ti--}}
 return ti<0&&now-first<=win}
function sxRead(f,inp,atkE,spE){const now=game.sxClock||0;
 {const pv=f.sxBtnPrev||{};f.sxBtnPrev={};let hit=null;for(const k of SXK){f.sxBtnPrev[k]=!!inp[k];if(inp[k]&&!pv[k]&&hit===null)hit=k==='su'?'u':(+k.slice(1)-1)}if(hit!==null)return hit}
 return null; // specials are buttons only now (no motion inputs)
 const H=f.sxHist||[],D=SX[f.data.id];if(!D)return null;
 
 const order=['41236S','63214S','623A','623S','236A','214A','236S','214S','46S','46A'];
 for(const code of order){const btn=code.slice(-1),mo=code.slice(0,-1),idx=SX_IN.indexOf(code);if(idx<0||idx>=D.m.length)continue;if((btn==='A'&&atkE)||(btn==='S'&&spE)){if(sxMatch(H,now,mo))return idx}}
 if(spE&&(sxMatch(H,now,'236236')||sxMatch(H,now,'22'))&&f.meter>=100)return'u';
 return null}
function sxInput(f,o,inp,atkE,spE,dt,frozen){
 const c=sxDirCode(f,inp);f.sxHist=f.sxHist||[];const H=f.sxHist;if(!H.length||H[H.length-1].c!==c){H.push({c,t:game.sxClock});if(H.length>14)H.shift()}
 f.sxCd=f.sxCd||{};for(const k in f.sxCd)f.sxCd[k]=Math.max(0,f.sxCd[k]-dt);
 f.sxParryT=Math.max(0,(f.sxParryT||0)-dt);f.sxAuraT=Math.max(0,(f.sxAuraT||0)-dt);f.sxBuffT=Math.max(0,(f.sxBuffT||0)-dt);f.sxSlowT=Math.max(0,(f.sxSlowT||0)-dt);f.sxRootT=Math.max(0,(f.sxRootT||0)-dt);
 if(frozen||game.ko||game.sxu||f.stun>0||f.down>0||!SX[f.data.id])return false;
 const pick=sxRead(f,inp,atkE,spE);if(pick===null||pick===undefined)return false;
 // free to act, or cancelling a normal strike that just connected
 const cancel=f.attack>0&&f.move_&&!f.move_.sx&&(f.move_===MOVES.claw||f.move_===MOVES.bite||(f.move_.base||f.move_)===MOVES.double)&&o.stun>0&&f.hitsDone>0;
 if(f.attack>0&&!cancel)return false;
 if(pick==='u'){if(f.meter<100||!f.ground)return false;sxUltStart(f,o);return true}
 const def=SX[f.data.id].m[pick];if(!def)return false;
 if((f.sxCd[pick]||0)>0){floatText(f.x,f.y-300,'RECHARGING','#9aa3ad');return true}
 if(def.cost&&f.meter<def.cost){floatText(f.x,f.y-300,'NEED METER','#9aa3ad');return true}
 if(cancel){f.attack=0;f.move_=null}
 doMove(f,'sx:'+pick);return true}
// ---------- performing a special ----------
function sxAnimName(f,m){const A=(SPRITES[f.data.id]||{}).anims||{},list=(m&&m.sxAnim)||['attack_heavy'];for(const a of list)if(A[a])return a;return'attack_heavy'}
function sxBuild(f,def){const p=f.data.power;const mv={t:def.t,hits:def.h||[],dmg:q=>(def.dm||0)+q*(def.dk!=null?def.dk:.6)*((def.h||[]).length>2?.4:1)*((f.sxBuffT||0)>0?1.15:1)*((f.sxAuraT||0)>0?1.1:1),range:def.r||300,stun:def.st||.6,push:def.pu||200,sx:def,sxAnim:def.a||['attack_heavy']};return mv}
{const _dm=doMove;doMove=function(f,name){
 if(typeof name!=='string'||!name.startsWith('sx:'))return _dm.apply(this,arguments);
 const D=SX[f.data.id];let def;if(name.endsWith('c')){def=D.m[+name.slice(3,-1)].counter;def={...def,n:'COUNTER',col:D.m[+name.slice(3,-1)].col}}else def=D.m[+name.slice(3)];if(!def)return;
 const idx=parseInt(name.slice(3));
 if(def.use){_dm(f,def.use);f.sxCd=f.sxCd||{};f.sxCd[idx]=.3;return}
 if(def.cost)f.meter=Math.max(0,f.meter-def.cost);
 f.sxCd=f.sxCd||{};if(!name.endsWith('c'))f.sxCd[idx]=def.cd!=null?def.cd:(def.h&&def.h.length?.6:2.5);
 f.bufA=0;f.bufS=0;const mv=sxBuild(f,def),o=game.fighters.find(x=>x!==f);
 f.move_=mv;f.attack=mv.t;f.hitsDone=0;f.elapsed=0;f.chain=(f.chain||0)+1;f.comboLinked=o.stun>0&&f.combo>0;
 setAction(f,'sx',mv.t);
 if(def.vx)f.vx=f.dir*def.vx;if(def.vy){f.vy=def.vy;f.ground=false}
 if(def.parry){f.sxParryT=def.parry;f.sxParryIdx=idx}
 if(def.aura)f.sxAuraT=def.aura;if(def.buff){f.sxBuffT=def.buff;banner(def.n,'POWER SURGES',.9,def.col)}
 if(def.tele){f.sxTele={kind:def.tele,at:Math.min(.4,(def.h[0]||.4)*.55),done:0}}
 f.dojoMoveName=name;f.dojoMoveSpecial=true;
 floatText(f.x,f.y-310,def.n,def.col||'#ffd36b');sfx(def.grab?'heavy':'whiff');if(def.st>=.8||def.cost)game.shake=Math.max(game.shake,.12);
 f._pfxMove=mv;f._pfxAge=0;f._after=[];pBurst(f,'start',f.x,400+f.y-150,1)}}
{const _ma=moveAnim;moveAnim=function(f,mv){if(mv&&mv.sx)return sxAnimName(f,mv);return _ma.apply(this,arguments)}}
// teleports / burrow, during the move
{const _up=update;update=function(dt){const r=_up.apply(this,arguments);if(!game||!game.fighters)return r;
 for(const f of game.fighters){const T=f.sxTele;if(!T||T.done||!f.move_||!f.move_.sx){if(T&&(!f.move_||!f.move_.sx))f.sxTele=null;continue}
  const o=game.fighters.find(x=>x!==f);if(f.elapsed>=T.at){T.done=1;
   if(T.kind==='behind'){const nx=Math.max(80,Math.min(1020,o.x+o.dir*-1*0+(o.x>f.x?140:-140)));pBurst(f,'start',f.x,400+f.y-150,1);f.x=nx;f.dir=o.x>f.x?1:-1;for(let k=0;k<6;k++)P({kind:'pp',sh:'puff',x:f.x+R(-60,60),y:400+f.y-R(40,240),vx:R(-60,60),vy:R(-40,0),r:R(18,26),grow:40,life:.6,color:'#0f2422',alpha:.55})}
   else if(T.kind==='under'){f.x=o.x-f.dir*60;for(let k=0;k<10;k++)P({kind:'pp',sh:'rock',x:o.x+R(-50,50),y:396,vx:R(-260,260),vy:R(-640,-300),g:1700,r:R(7,13),rot:R(0,6),vr:R(-9,9),life:R(.7,1),color:'#6b5440'});game.shake=Math.max(game.shake,.2)}}
  if(T.kind==='under'&&f.elapsed<T.at)f._sxHide=1;else f._sxHide=0}
 return r}}
// hide the badger while he is underground
{const _dF=drawFighter;drawFighter=function(f,i,ghost){if(f&&f._sxHide&&f.move_&&f.move_.sx){const a=c.globalAlpha;c.globalAlpha=.0;const r=_dF.apply(this,arguments);c.globalAlpha=a;return r}return _dF.apply(this,arguments)}}
// reach + extra on-hit results (grab beats block, launch, roots, slow, venom, freeze) + parry counters
function sxReach(f,o,mv,d,big,facing){const def=mv.sx;if(def.tele==='under')return Math.abs(f.y-o.y)<200;
 const r=def.r*(def.r>400?1:artScale(f))+big;return d<=r&&Math.abs(f.y-o.y)<(def.ry||150)&&(facing||def.r>400||def.tele)}
{const _rh=resolveHit;resolveHit=function(i,mv){const f=game.fighters[i],o=game.fighters[1-i];
 if((o.sxParryT||0)>0&&!(mv.sx&&mv.sx.grab)&&o.attack>0){o.sxParryT=0;o.attack=0;o.move_=null;spark(o.x+o.dir*30,o.y-170,'#ffffff',16);game.hitstop=Math.max(game.hitstop||0,.08);f.stun=Math.max(f.stun||0,.35);doMove(o,'sx:'+o.sxParryIdx+'c');return}
 const hp0=o.hp+(o.bars||0)*1000,st0=o.stun||0,blk=o.block;
 if(mv.sx&&mv.sx.grab&&o.ground)o.block=false;
 const r=_rh.apply(this,arguments);
 const landed=o.hp+(o.bars||0)*1000<hp0||(o.stun||0)>st0;
 if(mv.sx&&landed&&!game.ko){const D=mv.sx;
  if(D.launch||D.down){o.down=Math.max(o.down||0,D.down?.7:.55);o.vy=D.launch?-520:-260;o.vx=f.dir*(D.launch?160:240);o.ground=false}
  if(D.root){o.sxRootT=D.root;o.coilT=Math.max(o.coilT||0,D.root)}
  if(D.slow){o.sxSlowT=D.slow;o.venomT=o.venomT||0;floatText(o.x,o.y-290,'CHILLED','#bff4ff')}
  if(D.venom){o.venomT=Math.max(o.venomT||0,D.venom);o.venomBy=i}
  if(D.freeze){o._frozenT=.9;o._iceShatter=1}}
 if(mv.sx&&mv.sx.grab)o.block=o.block&&blk;
 return r}}
// slowed (Arctic Breath) fighters move at 70%
{const _ph=physics;physics=function(f,dt){if((f.sxSlowT||0)>0&&f.ground&&f.attack<=0)f.vx*=.7;return _ph.apply(this,arguments)}}
// ---------- the ultimate finisher ----------
function sxFx(f,kinds,x,y,big){const save=PFX[f.data.id],mv=f.move_;f.move_=null;PFX[f.data.id]={...save,start:kinds,hit:kinds};try{pBurst(f,'hit',x,y,big||1)}finally{PFX[f.data.id]=save;f.move_=mv}}
function sxUltStart(f,o){const D=SX[f.data.id].u,i=game.fighters.indexOf(f);f.meter=0;hud();
 const d=Math.abs(o.x-f.x),reach=380+Math.max(0,bodyFront(o)-90);
 floatText(f.x,f.y-330,D.n,D.col);game.flash=Math.max(game.flash||0,.35);sfx('instinct');
 if(d>reach||(o.block&&o.ground)||o.down>0||(o.hp<=0&&o.bars<=1)){ // blocked or out of reach: the meter is spent, short recovery
  f.move_=sxBuild(f,{t:.7,h:[],r:0});f.attack=.7;setAction(f,'sx',.7);f.move_.sxAnim=[D.seq[0][0],'attack_heavy'];
  if(o.block&&d<=reach){spark(o.x-o.dir*20,o.y-170,'#9fd9ff',14);floatText(o.x,o.y-260,'ULTIMATE BLOCKED','#9fd9ff')}return}
 game.sxu={i,D,step:-1,t:0,st:0,start:o.hp,ox:o.x,dmg:0};f.attack=99;o.stun=99;o.attack=0;o.move_=null;o.block=false;
 banner(D.n,D.s,1.6,D.col);say('Ultimate');AU&&AU.duckMusic&&AU.duckMusic(.35);
 if(D.dark)game.sxDark=1;if(D.flood)sxFx(f,['tidal','splash'],o.x,400+o.y-120,1.3);
 if(D.moon)P({kind:'pp',sh:'moon',x:(f.x+o.x)/2,y:120,life:3.5});
 if(D.storm)game.sxStorm=1;
 sxUltNext()}
function sxUltNext(){const u=game.sxu,f=game.fighters[u.i],o=game.fighters[1-u.i];u.step++;u.st=0;
 if(u.step>=u.D.seq.length){return sxUltEnd()}
 const [a,dur,fx,dm,mode]=u.D.seq[u.step];u.cur={a,dur,fx,dm,mode,hit:0};
 f.move_={t:dur,hits:[],dmg:()=>0,range:0,stun:0,push:0,sx:{n:u.D.n},sxAnim:[a,'attack_heavy','attack_light']};f.attack=dur;f.elapsed=0;setAction(f,'sx',dur);
 if(mode==='side'){const s=u.step%2?1:-1;f.x=Math.max(70,Math.min(1030,o.x+s*(120+bodyFront(o)+bodyFront(f)*.6)));f.dir=o.x>f.x?1:-1;for(let k=0;k<4;k++)P({kind:'pp',sh:'puff',x:f.x+R(-40,40),y:400+f.y-R(40,220),vx:R(-50,50),vy:-20,r:R(14,22),grow:40,life:.4,color:u.D.col,alpha:.35})}}
function sxUltStep(dt){const u=game.sxu,f=game.fighters[u.i],o=game.fighters[1-u.i],C=u.cur;u.t+=dt;u.st+=dt;
 f.attack=Math.max(.01,C.dur-u.st);f.actionTime=f.attack;f.elapsed=u.st;
 // choreography: keep the pair together; lift / fly / crash
 const tx=o.x-f.dir*(C.mode==='side'?-0:120);if(C.mode!=='side')f.x+=(tx-f.x)*Math.min(1,dt*10);
 const lift=C.mode==='up'||C.mode==='air'?Math.min(1,u.st/C.dur):0;
 if(C.mode==='up'){o.y+=(-200*lift-o.y)*Math.min(1,dt*8);o.ground=false}
 else if(C.mode==='air'){o.y+=(-220-o.y)*Math.min(1,dt*8);f.y+=(-240-f.y)*Math.min(1,dt*8);f.ground=false;o.ground=false}
 else if(C.mode==='crash'){const k=Math.min(1,u.st/(C.dur*.45));o.y=o.y*(1-k);f.y=f.y*(1-k)}
 else{o.y+=(0-o.y)*Math.min(1,dt*8);f.y+=(0-f.y)*Math.min(1,dt*8)}
 o.vx=0;o.vy=0;f.vx=0;f.vy=0;o.stun=99;
 if(!C.hit&&u.st>=C.dur*.42){C.hit=1;const cx=o.x-f.dir*bodyFront(o)*.6,cy=400+o.y-150;
  sxFx(f,C.fx,cx,cy,C.mode==='crash'?1.35:1.05);
  if(C.dm>0){const dmg=C.dm*(1-(o.data.defense-7)*.03)*(mode==='training'?0:1);u.dmg+=dmg;o.hp-=dmg;o.hitFlash=.09;f.combo=(f.combo||0)+1;
   spark(cx,o.y-150,u.D.col,C.mode==='crash'?34:16);snd(C.mode==='crash'?'sfx.groundSlam':'sfx.punch',C.mode==='crash'?'boom':'heavy');
   game.shake=Math.max(game.shake,C.mode==='crash'?.45:.18);game.flash=Math.max(game.flash||0,C.mode==='crash'?.4:.12);game.hitstop=.05;
   $('p'+(u.i+1)+'-combo').textContent=f.combo+' HITS';$('p'+(u.i+1)+'-combo').classList.add('active');
   if(C.mode==='crash'){game.slow=.35;game.slowT=.55}}
  if(o.hp<=0&&o.bars>1){o.bars--;o.hp+=BAR;floatText(o.x,o.y-320,'BAR BROKEN','#ff9a4a');majicBossPhase(o)}
  hud()}
 if(u.st>=C.dur)sxUltNext()}
function sxUltEnd(){const u=game.sxu,f=game.fighters[u.i],o=game.fighters[1-u.i];game.sxu=null;game.sxDark=0;game.sxStorm=0;
 f.attack=0;f.move_=null;f.action='idle';f.y=0;f.ground=true;o.stun=.4;o.y=Math.min(0,o.y);
 banner(u.D.n,Math.round(u.dmg)+' DAMAGE',1.2,u.D.col);endCombo(u.i,true);
 if(o.hp<=0){o.hp=0;o.potential=0;koFinish(o,f,false)}else{o.down=.8;o.vx=f.dir*420;o.vy=-300;o.ground=false}
 hud()}
// run the ultimate in place of the normal update
{const _up=update;update=function(dt){if(game)game.sxClock=(game.sxClock||0)+dt;if(game&&game.sxu){sxUltStep(dt);for(const f of game.fighters)if(f!==game.fighters[game.sxu?game.sxu.i:0]){f.hitFlash=Math.max(0,(f.hitFlash||0)-dt)}return}return _up.apply(this,arguments)}}
// darken the arena during cinematic ultimates; MAJIC's elemental storm
{const _df=drawFx;drawFx=function(){if(game&&(game.sxDark||game.sxDarkA>0)){game.sxDarkA=Math.max(0,Math.min(1,(game.sxDarkA||0)+(game.sxDark?.06:-.05)));c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=.5*game.sxDarkA;c.fillStyle='#05030a';c.fillRect(0,0,c.canvas.width,c.canvas.height);c.restore()}
 if(game&&game.sxStorm&&Math.random()<.6){const kinds=[['flake','#ffffff'],['leaf','#5ea83a'],['drop','#d8fbff'],['puff','#8fe04a']],k=kinds[Math.floor(Math.random()*4)],f=game.fighters[game.sxu?game.sxu.i:0];P({kind:'pp',sh:k[0],cx:f.x,cy:400+f.y-170,ang:R(0,6.28),rad:R(80,220),av:R(3,5),rise:-30,rot:R(0,6),vr:R(-6,6),r:k[0]==='puff'?R(16,24):R(8,16),life:.9,orbit:1,color:k[1],alpha:.3,grow:20})}
 return _df.apply(this,arguments)}}
// ---------- sprite: play the special's animation, timed so its strike frame lands on the hit ----------
function sxFrame(f,A){const m=f.move_;const an=sxAnimName(f,m);const n=A[an][0];const p=phase(f);
 const q0=typeof SPRITE_PEAK!=='undefined'&&SPRITE_PEAK[f.data.id]&&SPRITE_PEAK[f.data.id][an];const h=m&&m.hits&&m.hits.length?m.hits[0]/m.t:0;
 let ap=p*p*(3-2*p);if(q0&&h){const q=Math.max(.25,Math.min(.85,q0));ap=p<h?p/h*q:q+(p-h)/(1-h)*(1-q)}
 if(an==='block')return[an,Math.min(n-1,Math.floor(p*n*1.6))];
 if(an==='run'||an==='dash')return[an,Math.floor(p*n*2)%n];
 return[an,Math.min(n-1,Math.floor(ap*n))]}
// ---------- CPU fighters use specials and ultimates too ----------
{const _ci=cpuInput;cpuInput=function(i){const k=_ci.apply(this,arguments);const f=game.fighters[i],o=game.fighters[1-i],D=SX[f.data.id];
 if(!D||mode==='training'||!f.ai||f.stun>0||f.attack>0||!f.ground||game.ko)return k;const lvl=f.ai.level,dt=game.dt,d=Math.abs(o.x-f.x);
 if(f.meter>=100&&d<360&&!o.block&&Math.random()<dt*(.25+lvl*.6)){k.su=true;return k}
 if(Math.random()<dt*(.45+lvl*1.1)){const opts=D.m.map((m,j)=>[m,j]).filter(([m,j])=>!m.parry&&!(m.cost&&f.meter<m.cost)&&!((f.sxCd||{})[j]>0)&&(m.use||d<=(m.r||300)*1.05+40));
  if(opts.length){const [m,j]=opts[Math.floor(Math.random()*opts.length)];k['s'+(j+1)]=true}}
 else if(o.attack>0&&d<330&&Math.random()<dt*lvl*.6){const j=D.m.findIndex(m=>m.parry);if(j>=0)k['s'+(j+1)]=true}
 return k}}
sxOptsInstall();sxTouchInstall();


// Movement-linked ambience: snow swirls around Snow Leopard and leaves stir around Stag whenever they move
{const _fu2=fxUpdate;fxUpdate=function(dt){const r=_fu2.apply(this,arguments);if(!game||!game.fighters||game.ko)return r;
 for(const f of game.fighters){const sp=Math.abs(f.vx||0)+Math.abs(f.moveVel||0)+(f.ground?0:250),id=f.data.id;if(sp<60)continue;const rate=Math.min(1,sp/500)*dt*(FXQ==='low'?4:10);
  if(id==='leopard'&&Math.random()<rate)P({kind:'pp',sh:'flake',cx:f.x,cy:400+f.y-140,ang:R(0,6.28),rad:R(50,110),av:R(3,5)*(Math.random()<.5?1:-1),rise:-25,rot:R(0,6),vr:R(-3,3),r:R(5,9),life:R(.5,.8),orbit:1});
  if(id==='stag'&&Math.random()<rate)P({kind:'pp',sh:'leaf',x:f.x-f.dir*R(20,80),y:398-R(0,40),vx:-f.dir*R(40,140),vy:R(-260,-120),g:420,drag:.97,rot:R(0,6),vr:R(-8,8),r:R(10,16),life:R(.7,1.1),color:['#5ea83a','#9fd86a','#d8b03a'][Math.floor(R(0,3))]})}
 return r}}

/* ================= DEVICE PICKER + DOJO MOVE GUIDE =================
   Asks what the player is using (phone/tablet, keyboard, Xbox, PlayStation, Switch), remembers it,
   and shows every available fighter's moves written for that device in the Dojo (and the pause-menu move list). */
const DEV_LIST=[['touch','PHONE / TABLET','Touch screen','📱'],['keyboard','KEYBOARD','Computer keys','⌨️'],['xbox','XBOX CONTROLLER','Or most PC pads','🎮'],['ps','PLAYSTATION CONTROLLER','PS4 / PS5','🎮'],['switch','SWITCH CONTROLLER','Pro Controller / Joy-Con','🎮']];
const DEV_NAME=Object.fromEntries(DEV_LIST.map(d=>[d[0],d[1]]));
let DEVICE=null;try{DEVICE=localStorage.getItem('kotj-device')}catch(_){}
function devGuess(){const pads=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean);
 if(pads.length){const id=(pads[0].id||'').toLowerCase();if(/057e|nintendo|switch|pro controller|joy-con/.test(id))return'switch';return padKind(pads[0])}
 return isTouch()?'touch':'keyboard'}
function devNow(){return DEVICE||devGuess()}
const DEV_BTN={keyboard:{at:'F',sp:'G',j:'W',bl:'S',ins:'H',pause:'ESC',mv:'A / D'},xbox:{at:'X',sp:'Y',j:'A',bl:'B',ins:'VIEW',pause:'MENU',mv:'STICK / D-PAD'},ps:{at:'□',sp:'△',j:'✕',bl:'○',ins:'SHARE',pause:'OPTIONS',mv:'STICK / D-PAD'},switch:{at:'Y',sp:'X',j:'B',bl:'A',ins:'−',pause:'+',mv:'STICK / D-PAD'},touch:{at:'ATK',sp:'SPC',j:'▲',bl:'BLOCK',ins:'INS',pause:'PAUSE',mv:'◀ ▶'}};
const DEV_SEQ={'236':[2,3,6],'214':[2,1,4],'46':[4,6],'623':[6,2,3],'41236':[4,1,2,3,6],'63214':[6,3,2,1,4]};
const ARROW={1:'↙',2:'↓',3:'↘',4:'←',6:'→'},KEYK={1:'S+A',2:'S',3:'S+D',4:'A',6:'D'};
const STAR_BTN={keyboard:['R','T','Y','U'],xbox:['LB','RB','LT','RT'],ps:['L1','R1','L2','R2'],switch:['L','R','ZL','ZR'],touch:['★1','★2','★3','★U']};
function starHow(i,dev){const S=STAR_BTN[dev]||STAR_BTN.keyboard;return i==='U'?`Full meter · press <b>${S[3]}</b>`:`Press <b>${S[i]}</b>`}
function devHow(code,dev,name){const B=DEV_BTN[dev];const si=SX_IN.indexOf(code);if(code==='U')return starHow('U',dev);if(si>=0&&si<3)return starHow(si,dev);
 if(dev==='touch')return code==='U'?`Fill the meter · tap <b>★</b> then <b>★ ${name}</b>`:`Tap <b>★</b> then <b>${name}</b>`;
 if(code==='U')return dev==='keyboard'?`Full meter · <b>S</b>, let go, <b>S</b> + <b>${B.sp}</b>`:`Full meter · <b>↓</b>, let go, <b>↓</b> + <b>${B.sp}</b>`;
 const mo=code.slice(0,-1),btn=code.slice(-1)==='A'?B.at:B.sp,seq=DEV_SEQ[mo]||[];
 return dev==='keyboard'?seq.map(n=>`<b>${KEYK[n]}</b>`).join(' → ')+` then <b>${btn}</b>`:seq.map(n=>`<b>${ARROW[n]}</b>`).join(' ')+` + <b>${btn}</b>`}
function devBasics(dev){const B=DEV_BTN[dev];
 const S=STAR_BTN[dev]||STAR_BTN.keyboard;return [['MOVE',B.mv],['JUMP',B.j],['BLOCK',B.bl],['ATTACK',B.at],['SPECIAL',B.sp],['★1 ★2 ★3',S.slice(0,3).join(' · ')],['★ ULTIMATE',S[3]],['INSTINCT',B.ins],['PAUSE',B.pause]].map(([a,b])=>`<span><i>${a}</i><b>${b}</b></span>`).join('')}
// ---- the "what are you playing on?" question ----
function devAsk(after){let el=document.getElementById('dev-ask');if(!el){el=document.createElement('div');el.id='dev-ask';el.className='dev-ask';document.body.appendChild(el)}
 const g=devGuess();
 el.innerHTML=`<div class="dev-card"><h3>WHAT ARE YOU PLAYING ON?</h3><p>We'll show every fighter's moves with the buttons on your device.</p><div class="dev-opts">${DEV_LIST.map(([k,n,s,ic])=>`<button class="dev-opt${k===(DEVICE||g)?' sel':''}" data-dev="${k}"><em>${ic}</em><b>${n}</b><small>${s}${k===g&&!DEVICE?' · detected':''}</small></button>`).join('')}</div></div>`;
 el.querySelectorAll('.dev-opt').forEach(b=>b.onclick=()=>{ac();DEVICE=b.dataset.dev;try{localStorage.setItem('kotj-device',DEVICE)}catch(_){}el.classList.remove('on');devRefresh();after&&after()});
 el.classList.add('on');setTimeout(()=>{const s=el.querySelector('.dev-opt.sel')||el.querySelector('.dev-opt');s&&s.focus()},50)}
// ---- Dojo: device line + full move guide for every fighter the player has ----
let devPick=null;
function devDojo(){const d=$('dojo');if(!d)return;let box=$('dojo-moves');
 if(!box){box=document.createElement('div');box.id='dojo-moves';box.className='dojo-moves';const act=d.querySelector('.dojo-actions');d.insertBefore(box,act)}
 const dev=devNow(),list=roster.filter(r=>SX[r.id]);if(!devPick||!list.find(r=>r.id===devPick))devPick=list[0]&&list[0].id;const D=SX[devPick],F=list.find(r=>r.id===devPick)||{name:''};
 const ctl=d.querySelector('.dojo-controls');if(ctl)ctl.innerHTML=`<strong>YOUR CONTROLS · ${DEV_NAME[dev]}</strong><span class="dev-basics">${devBasics(dev)}</span>`;
 box.innerHTML=`<div class="dm-head"><b>MOVE GUIDE</b><button class="secondary dm-dev">PLAYING ON: ${DEV_NAME[dev]} ▸ CHANGE</button></div>
  <div class="dm-fighters">${list.map(r=>`<button class="dm-f${r.id===devPick?' sel':''}" data-f="${r.id}"><img src="${portrait(r.id)}" alt=""><span>${r.name}</span></button>`).join('')}</div>
  ${D?`<div class="dm-list"><h4>${F.name}</h4>${D.m.slice(0,SX_SHOW).map((m,i)=>`<div class="dm-row"><div><b>${m.n}</b><i>${m.d||''}</i></div><div class="dm-how">${devHow(SX_IN[i],dev,m.n)}</div></div>`).join('')}
   <div class="dm-row dm-ult"><div><b>ULTIMATE · ${D.u.n}</b><i>Cinematic finisher · costs the whole meter · can be blocked</i></div><div class="dm-how">${devHow('U',dev,D.u.n)}</div></div></div>`:''}
  ${dev!=='touch'?'<p class="dm-note">Arrows are shown with your fighter facing right — swap ← and → when you face left. Moves still come out with a slightly loose input.</p>':'<p class="dm-note">The ★ button sits next to INS / SPC / ATK during a fight. The ultimate button lights up when your meter is full.</p>'}`;
 box.querySelector('.dm-dev').onclick=()=>devAsk(devDojo);
 box.querySelectorAll('.dm-f').forEach(b=>b.onclick=()=>{devPick=b.dataset.f;devDojo()})}
function devRefresh(){devDojo();try{updateGuide()}catch(_){}}
// pause-menu / select-screen move list follows the chosen device too
{const _ml=sxMoveList;sxMoveList=function(id){_ml(id);const el=document.getElementById('sx-movelist');if(!el)return;const dev=devNow(),D=SX[id];if(!D)return;
 el.querySelectorAll('.sx-ml-card li').forEach((li,i)=>{const s=li.querySelector('.in');if(s&&D.m[i])s.innerHTML=devHow(SX_IN[i],dev,D.m[i].n)});
 const u=el.querySelector('.sx-ult .in');if(u)u.innerHTML=devHow('U',dev,D.u.n);
 const tip=el.querySelector('.sx-tip');if(tip)tip.innerHTML=`Shown for <b>${DEV_NAME[dev]}</b> · <a href="#" class="dm-chg">change device</a>`;
 const a=el.querySelector('.dm-chg');if(a)a.onclick=e=>{e.preventDefault();devAsk(()=>sxMoveList(id))}}}
// first visit to the Dojo asks; afterwards it just shows the guide
{const ob=$('open-dojo');if(ob){const prev=ob.onclick;ob.onclick=e=>{prev&&prev(e);devDojo();if(!DEVICE)devAsk(devDojo)}}}
// a newly plugged-in controller offers to switch the guide
addEventListener('gamepadconnected',()=>{if(DEVICE&&DEVICE!=='xbox'&&DEVICE!=='ps'&&DEVICE!=='switch'&&!game&&!$('dojo').classList.contains('hidden'))devAsk(devDojo)});
// device choice in Options too
{const so=$('sel-opts');if(so&&!so.querySelector('.dev-btn')){const b=document.createElement('button');b.className='secondary dev-btn';b.textContent='DEVICE / CONTROLS';so.insertBefore(b,$('so-close'));b.onclick=()=>devAsk()}}
window.KOTJ_DEVICE={ask:devAsk,get:devNow};

/* ================= BLOOD THAT REACTS TO THE ATTACK (only when BLOOD is LIGHT or HEAVY) =================
   slash (claws): a fan of droplets thrown along the swipe · bite: a tight burst plus heavy drips
   blunt (heavy hits, slams, uppercuts): a wide spray and a fine mist · crush (grabs, bear hug, coils, death roll): blood squeezed out both sides and dripping down
   projectile (venom, wind blades): only a few drops · launched fighters leave a trail; wounded fighters keep dripping for a moment, and drip slowly while in DANGER. */
let BLEED_CTX=null;
function bleedType(f,mv){if(!mv)return'slash';const D=mv.sx,anim=moveAnim(f,mv)||'';
 if((D&&D.grab)||mv.grab||mv.snakeCoil||mv.crocodileRoll||mv.elephantGrab)return'crush';
 if(D&&(D.fs||[]).some(k=>k.startsWith('proj:')))return'proj';
 if(anim==='bite'||mv===MOVES.bite||mv.jaguarBite||mv.snakeVenom||mv.hyenaFeint)return'bite';
 if(/attack_heavy|uppercut|slam|earth|stomp/.test(anim)||mv.ender||(mv.push||0)>=280)return'blunt';
 return'slash'}
function bDrop(x,y,vx,vy,r,shade){game.fx.push({kind:'blood',x,y,vx,vy,r,t:0,life:2.4,shade:shade==null?Math.random():shade})}
bleed=function(x,y,dir,power,type){if(!blood||!game)return;type=type||BLEED_CTX||'slash';
 const H=blood===2,q=FXQ==='low'?.55:1,n=Math.max(1,Math.round(power*(H?2.2:1)*q)),R=()=>Math.random();
 if(type==='slash'){// droplets thrown in a fan along the claw's path (down-forward diagonal), long and fast
  for(let k=0;k<n+2;k++){const t=R()*2-1,sx=x+dir*t*34,sy=y-t*26;bDrop(sx,sy,dir*(120+R()*(H?380:260))+t*60,-(40+R()*(H?220:150))-t*80,1.3+R()*(H?3:2))}}
 else if(type==='bite'){// tight burst at the jaws, then a few heavy drips that fall almost straight down
  for(let k=0;k<n;k++){const a=R()*Math.PI*2,s=60+R()*(H?260:170);bDrop(x+(R()-.5)*10,y+(R()-.5)*10,Math.cos(a)*s*.7+dir*60,Math.sin(a)*s-60,1.5+R()*(H?3.2:2.2))}
  for(let k=0;k<(H?5:3);k++)bDrop(x+(R()-.5)*26,y+R()*14,dir*(R()*30),20+R()*40,2.6+R()*2.4,.2)}
 else if(type==='blunt'){// wide spray out the far side plus a fine mist
  for(let k=0;k<n+2;k++)bDrop(x+(R()-.5)*20,y+(R()-.5)*30,dir*(60+R()*(H?340:240)),-(80+R()*(H?300:200)),1.2+R()*(H?3.4:2.4));
  for(let k=0;k<(H?5:2);k++)game.fx.push({kind:'mist',x:x+(R()-.5)*24,y:y+(R()-.5)*24,vx:dir*(50+R()*90),vy:-20-R()*40,r:9+R()*(H?16:10),t:0,life:.45})}
 else if(type==='crush'){// squeezed out to both sides, then dripping down
  for(let k=0;k<n;k++){const s=R()<.5?-1:1;bDrop(x+s*(10+R()*20),y+(R()-.5)*40,s*(60+R()*160),-(30+R()*120),1.4+R()*(H?3:2))}
  for(let k=0;k<(H?7:4);k++)bDrop(x+(R()-.5)*50,y+R()*40,(R()-.5)*20,30+R()*50,2.2+R()*2.6,.3)}
 else{// projectile
  for(let k=0;k<Math.max(1,Math.round(n*.4));k++)bDrop(x,y,dir*(60+R()*160),-(30+R()*120),1.2+R()*1.8)}
 if(type!=='proj'&&H&&power>=8)for(let k=0;k<4;k++)game.fx.push({kind:'mist',x:x+(R()-.5)*20,y:y+(R()-.5)*20,vx:dir*(40+R()*80),vy:-20-R()*40,r:10+R()*14,t:0,life:.45})};
// classify every hit, and remember where the wound is so the fighter keeps dripping
{const _rh=resolveHit;resolveHit=function(i,mv){const f=game.fighters[i],o=game.fighters[1-i],hp0=o.hp+(o.bars||0)*1000;
 BLEED_CTX=blood?bleedType(f,mv):null;let r;try{r=_rh.apply(this,arguments)}finally{BLEED_CTX=null}
 if(blood&&o.hp+(o.bars||0)*1000<hp0){const t=bleedType(f,mv);o.bleedT=Math.max(o.bleedT||0,(t==='crush'||t==='bite'?1.6:t==='blunt'?.9:1.1)*(blood===2?1.8:1));o.woundH=110+Math.random()*90;o.woundSide=-o.dir}
 return r}}
// drips after a hit, a trail while launched, and a slow drip in DANGER
{const _fu3=fxUpdate;fxUpdate=function(dt){const r=_fu3.apply(this,arguments);if(!blood||!game||!game.fighters)return r;
 for(const f of game.fighters){f.bleedT=Math.max(0,(f.bleedT||0)-dt);const air=!f.ground&&(f.down>0||f.stun>0);
  const rate=(f.bleedT>0?(blood===2?9:4):0)+(air&&f.bleedT>0?(blood===2?14:6):0)+(inDanger(f)&&f.hp>0?(blood===2?1.6:.7):0);
  if(rate>0&&Math.random()<rate*dt*(FXQ==='low'?.5:1)){const wy=f.y-(f.woundH||150),wx=f.x+(f.woundSide||0)*(20+Math.random()*25);
   bDrop(wx,wy,(Math.random()-.5)*30+(air?f.vx*.2:0),air?Math.random()*60:10+Math.random()*30,1.4+Math.random()*(blood===2?2.6:1.6))}}
 return r}}
// ultimates bleed by their strike type too
{const _us=sxUltStep;sxUltStep=function(dt){const u=game.sxu,C=u&&u.cur,before=C&&C.hit;const r=_us.apply(this,arguments);
 if(blood&&u&&C&&!before&&C.hit&&C.dm>0){const f=game.fighters[u.i],o=game.fighters[1-u.i];bleed(o.x-f.dir*bodyFront(o)*.5,o.y-150+(Math.random()-.5)*40,f.dir,C.mode==='crash'?14:7,C.mode==='crash'||C.mode==='up'?'blunt':/bite/.test(C.a)?'bite':/sx2/.test(C.a)&&C.fx.includes('bearhug')?'crush':'slash');o.bleedT=Math.max(o.bleedT||0,1.4);o.woundH=140}
 return r}}

// ---------- Phone performance mode (Effects MEDIUM or LOW — phones start on MEDIUM) ----------
// Draws at a phone-friendly resolution, skips the costly glow/blur on the fighters' artwork,
// lets auto-quality step down further, and keeps game speed steady at lower frame rates.
function LITE(){return FXQ!=='high'}
{const _ds=drawSprite;drawSprite=function(f){if(!LITE())return _ds.apply(this,arguments);const sb=c.shadowBlur;c.shadowBlur=0;try{return _ds.apply(this,arguments)}finally{c.shadowBlur=sb}}}
RES.floor=LITE()?.6:.75;
{const _so=sxOptsRefresh;sxOptsRefresh=function(){const r=_so.apply(this,arguments);RES.floor=LITE()?.6:.75;RES.scale=1;return r}}

// ---------- Speed readout for testing on a device: open the game with ?fps=1 ----------
if(/[?&]fps=1/.test(location.search)){const el=document.createElement('div');el.id='fps-meter';el.style.cssText='position:fixed;left:6px;top:50%;z-index:99;background:rgba(0,0,0,.72);color:#9f9;font:600 11px/1.35 monospace;padding:6px 8px;border-radius:6px;pointer-events:none;white-space:pre';document.body.appendChild(el);
 let n=0,acc=0,worst=0,last=performance.now();const tick=()=>{const t=performance.now(),d=t-last;last=t;n++;acc+=d;worst=Math.max(worst,d);
  if(acc>=1000){const cv=$('game-canvas'),id=game&&game.fighters?game.fighters[0].data.id:null;
   el.textContent=`FPS ${Math.round(n*1000/acc)}  worst ${Math.round(worst)}ms\ncanvas ${cv.width}x${cv.height} dpr ${devicePixelRatio}\nart ${id?(HDT[id]?(HDT[id]===HD[id]?'HD':'LIGHT'):'LOW'):'-'}  fx ${FXQ}  res ${Math.round(RES.scale*100)}%\ngfx ${KOTJ_GM.mode.toUpperCase()}:${KOTJ_GM.level}  colors ${window.KOTJ_TINT&&id&&window.KOTJ_ARMORY&&KOTJ_ARMORY.fightColors(id)?'on':'off'}\nbuild 16.0`;n=0;acc=0;worst=0}
  requestAnimationFrame(tick)};requestAnimationFrame(tick)}

// Phones (Effects MEDIUM/LOW): canvas filters and shadow blur are the slowest things a phone browser can draw,
// especially without graphics-chip help. Turn them all off in one place; everything else still draws.
{const proto=CanvasRenderingContext2D.prototype,fd=Object.getOwnPropertyDescriptor(proto,'filter'),sd=Object.getOwnPropertyDescriptor(proto,'shadowBlur');
 if(fd&&fd.set)Object.defineProperty(c,'filter',{configurable:true,get(){return fd.get.call(this)},set(v){fd.set.call(this,LITE()?'none':v)}});
 if(sd&&sd.set)Object.defineProperty(c,'shadowBlur',{configurable:true,get(){return sd.get.call(this)},set(v){sd.set.call(this,LITE()?0:v)}})}
RES.floor=LITE()?.5:.75;
{const _so2=sxOptsRefresh;sxOptsRefresh=function(){const r=_so2.apply(this,arguments);RES.floor=LITE()?.5:.75;return r}}

// ---------- Automatic smooth mode ----------
// If a fight runs under ~40 fps with Effects HIGH, switch to the lighter MEDIUM mode (no blur/glow, smaller drawing size),
// say so briefly, and remember it for next time. Players can switch back in Options.
const AS={t:0,acc:0,n:0,slow:0,done:false};
function autoSmooth(real){if(!game||AS.done||FXQ!=='high'||game.intro>0||paused)return;AS.t+=real;if(AS.t<2.5)return;AS.acc+=real;AS.n++;if(AS.acc<1.5)return;
 const fps=AS.n/AS.acc;AS.acc=0;AS.n=0;AS.slow=fps<40?AS.slow+1:0;
 if(AS.slow>=2){AS.done=true;FXQ='medium';try{localStorage.setItem('kotj-fxq','medium')}catch(_){}sxOptsRefresh();
  let t=document.getElementById('smooth-toast');if(!t){t=document.createElement('div');t.id='smooth-toast';t.style.cssText='position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:96;background:rgba(10,8,6,.9);border:1px solid #c9a24a;color:#ffe7b0;font:700 14px Inter,sans-serif;padding:10px 16px;border-radius:10px;transition:opacity .5s;text-align:center';document.body.appendChild(t)}
  t.innerHTML='SMOOTH MODE ON<br><span style="font-weight:500;opacity:.8;font-size:12px">Effects set to MEDIUM for this device · change in Options</span>';t.style.opacity=1;setTimeout(()=>t.style.opacity=0,4000)}}
{const _rs=resStart;resStart=function(){AS.t=0;AS.acc=0;AS.n=0;AS.slow=0;return _rs.apply(this,arguments)}}

{const _sg=setGfx;setGfx=function(v){const r=_sg.apply(this,arguments);for(const k in spriteHD)delete spriteHD[k];return r}}

/* ================= GRAPHICS MANAGER =================
   One setting: GRAPHICS AUTO (default) / LOW / BALANCED / ULTRA.
   AUTO: 1) reads the device at startup (screen, touch, memory, cores, graphics chip) and picks a starting level,
         2) picks the sprite resolution for that level (light sheets, or full HD on ULTRA),
         3) measures real FPS during fights,
         4) lowers render resolution first, then the effects level, when it drops under ~42 fps,
         5) raises them again after a steady stretch above ~56 fps (with a cool-down so it never flickers back and forth),
         and remembers what this device can handle for next time.
   LOW / BALANCED / ULTRA: the player's choice is kept exactly (render resolution still eases down only if a fight really struggles). */
const GM_TIERS=[
 {name:'LOW',     fx:'low',   cap:.6e6, floor:.5, hd:false},
 {name:'BALANCED',fx:'medium',cap:1.0e6,floor:.55,hd:false},
 {name:'HIGH',    fx:'high',  cap:2.6e6,floor:.7, hd:false},
 {name:'ULTRA',   fx:'high',  cap:8.3e6,floor:.75,hd:true}];
const GM={mode:'auto',level:2,max:2,t:0,acc:0,n:0,slow:0,fast:0,cool:0,fails:[0,0,0,0],info:''};
function gmGPU(){try{const cv=document.createElement('canvas'),gl=cv.getContext('webgl')||cv.getContext('experimental-webgl');if(!gl)return'';const e=gl.getExtension('WEBGL_debug_renderer_info');return String(e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)).toLowerCase()}catch(_){return''}}
function gmDetect(){const coarse=matchMedia('(pointer:coarse)').matches,mem=navigator.deviceMemory||4,cores=navigator.hardwareConcurrency||4,gpu=gmGPU(),
  px=(screen.width||1280)*(screen.height||720)*Math.pow(Math.min(devicePixelRatio||1,3),2);
 let lvl,max;
 if(/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(gpu)){lvl=0;max=1}
 else if(coarse){lvl=mem<=3||cores<=4?0:1;max=/apple gpu|adreno \(tm\) 7|adreno 7|mali-g7[1-9]|immortalis/.test(gpu)?2:1}
 else if(/nvidia|geforce|rtx|gtx|radeon rx|radeon pro|apple m[1-9]|apple gpu/.test(gpu)){lvl=px>=3e6?3:2;max=3}
 else if(/intel|uhd|iris|radeon\(tm\) graphics|radeon graphics|vega/.test(gpu)){lvl=1;max=2}
 else{lvl=mem>=8&&cores>=8?2:1;max=2}
 if(mem<=2||cores<=2){lvl=0;max=Math.min(max,1)}
 GM.info=`${coarse?'touch':'desktop'} · ${mem}GB · ${cores} cores · ${gpu.slice(0,40)||'gpu ?'}`;
 return{lvl,max}}
function gmApply(lvl,why){lvl=Math.max(0,Math.min(3,lvl));const prev=GM.level,T=GM_TIERS[lvl];GM.level=lvl;
 FXQ=T.fx;RES.floor=T.floor;GFX=T.hd?'sharp':'auto';
 if(GM_TIERS[prev].hd!==T.hd)for(const k in spriteHD)delete spriteHD[k]; // art changes at the next fight
 gmLabels();if(why&&prev!==lvl)gmToast(`GRAPHICS ${GM.mode==='auto'?'AUTO · ':''}${T.name}`,why)}
function gmLabels(){const txt='GRAPHICS: '+(GM.mode==='auto'?'AUTO ('+GM_TIERS[GM.level].name+')':GM.mode.toUpperCase());
 document.querySelectorAll('.gfx-btn').forEach(b=>b.textContent=txt);const s=$('so-gfx');if(s)s.textContent=txt}
function gmToast(a,b){let t=document.getElementById('smooth-toast');if(!t){t=document.createElement('div');t.id='smooth-toast';t.style.cssText='position:fixed;left:50%;top:16%;transform:translateX(-50%);z-index:96;background:rgba(10,8,6,.88);border:1px solid #c9a24a;color:#ffe7b0;font:700 13px Inter,sans-serif;padding:8px 14px;border-radius:10px;transition:opacity .5s;text-align:center;pointer-events:none';document.body.appendChild(t)}
 t.innerHTML=a+(b?`<br><span style="font-weight:500;opacity:.8;font-size:11px">${b}</span>`:'');t.style.opacity=1;clearTimeout(t._h);t._h=setTimeout(()=>t.style.opacity=0,2600)}
function gmSave(){try{localStorage.setItem('kotj-gq',GM.mode);if(GM.mode==='auto')localStorage.setItem('kotj-gq-learn',String(GM.level))}catch(_){}}
function gmSet(mode){GM.mode=mode;GM.fails=[0,0,0,0];GM.cool=0;
 if(mode==='auto'){const d=gmDetect();GM.max=d.max;gmApply(d.lvl)}else gmApply({low:0,balanced:1,ultra:3}[mode]);
 RES.scale=1;gmSave()}
function GMcap(pw,ph){return Math.min(1,Math.sqrt(GM_TIERS[GM.level].cap/(pw*ph)))}
// measure real frame rate during fights and adjust
resTick=function(real){if(!game||game.intro>0||paused||game.ko){GM.acc=0;GM.n=0;return}
 GM.t+=real;GM.cool=Math.max(0,GM.cool-real);if(GM.t<2.5)return;GM.acc+=real;GM.n++;if(GM.acc<1.5)return;
 const fps=GM.n/GM.acc;GM.acc=0;GM.n=0;GM.slow=fps<42?GM.slow+1:0;GM.fast=fps>=56?GM.fast+1:0;
 if(GM.slow>=2){GM.slow=0;GM.fast=0;GM.cool=8;
  if(RES.scale>RES.floor+.01){RES.scale=Math.max(RES.floor,RES.scale*.86);return}
  if(GM.mode==='auto'&&GM.level>0){GM.fails[GM.level]++;gmApply(GM.level-1,'Lowered to keep the game smooth');RES.scale=1;gmSave()}return}
 if(GM.fast>=3&&GM.cool<=0){GM.fast=0;GM.cool=6;
  if(RES.scale<1){RES.scale=Math.min(1,RES.scale*1.12);return}
  const up=GM.level+1;
  if(GM.mode==='auto'&&up<=GM.max&&GM.fails[up]<2){if(GM_TIERS[up].hd&&game){GM.pendingUp=up;return} // HD art only switches between fights
   gmApply(up,'Raised — this device has room to spare');gmSave()}}};
{const _rs=resStart;resStart=function(){GM.t=0;GM.acc=0;GM.n=0;GM.slow=0;GM.fast=0;if(GM.pendingUp!=null&&GM.mode==='auto'){gmApply(GM.pendingUp,'Raised — this device has room to spare');GM.pendingUp=null;gmSave()}return _rs.apply(this,arguments)}}
// retire the older one-way smooth mode; the manager replaces it
autoSmooth=function(){};
// the graphics buttons now cycle AUTO → LOW → BALANCED → ULTRA
setGfx=function(){const order=['auto','low','balanced','ultra'];gmSet(order[(order.indexOf(GM.mode)+1)%order.length])};
{const _so=selOpts;selOpts=function(){const r=_so.apply(this,arguments);gmLabels();return r}}
// start-up: saved choice, or detect (and use what this device learned last time)
{let mode='auto',learn=null;try{mode=localStorage.getItem('kotj-gq')||'auto';learn=localStorage.getItem('kotj-gq-learn');localStorage.removeItem('kotj-fxq');localStorage.removeItem('kotj-gfx')}catch(_){}
 GM.mode=mode;if(mode==='auto'){const d=gmDetect();GM.max=d.max;gmApply(learn!=null&&!isNaN(+learn)?Math.min(+learn,d.max):d.lvl)}else gmApply({low:0,balanced:1,ultra:3}[mode]??2)}
window.KOTJ_GM={get level(){return GM_TIERS[GM.level].name},get mode(){return GM.mode},get info(){return GM.info},set:gmSet};

if(window.__kotj){window.__kotj.ult=()=>sxUltStart(game.fighters[0],game.fighters[1]);window.__kotj.sx=i=>doMove(game.fighters[0],'sx:'+i)}
// ---------- theater camera tilt: ultimates lean, heavy hits jolt, knockouts tip ----------
function camTilt(vw,vh){const dt=Math.min(.05,frameDt||.016),D=Math.PI/180;let tgt=0;
 if(!CAMTILT||!game||game.intro>0){TILT.a=0;TILT.kick=0;TILT.cur=0;return}
 const F=game.fighters;
 if(game.sxu){const f=F[game.sxu.i];tgt=(f.dir||1)*5*D}
 else if(game.ko>0){const v=F.find(f=>f.hp<=0);if(v)tgt=(v.x<cam.x+vw/2?-1:1)*3.5*D}
 TILT.a+=(tgt-TILT.a)*(1-Math.pow(tgt?.955:.88,dt*60));
 TILT.kick*=Math.exp(-dt*7.5);
 let a=TILT.a+TILT.kick;if(Math.abs(a)<2e-4){TILT.cur=0;return}TILT.cur=a;
 const wx=cam.x+vw/2,wy=cam.y+vh*.55,z=1+Math.abs(a)*.9;
 c.translate(wx,wy);c.rotate(a);c.scale(z,z);c.translate(-wx,-wy)}
{const _rh=resolveHit;resolveHit=function(i,mv){const f=game.fighters[i],o=game.fighters[1-i],h0=o.hp+(o.bars||0)*1000,s0=o.stun||0;const r=_rh.apply(this,arguments);
 try{const d=h0-(o.hp+(o.bars||0)*1000);if(CAMTILT&&d>0&&(o.hitHeavy||(mv&&mv.sx)||(o.stun||0)>s0+.35)){const D=Math.PI/180,k=(o.hitHeavy?1.8:1.2)*(RSHAKE?.5:1)*(game.sxu?.6:1);TILT.kick=Math.max(-3*D,Math.min(3*D,TILT.kick+(f.dir||1)*k*D))}}catch(_){}
 return r}}

// ---------- quicker start: remember your fighter, QUICK FIGHT button ----------
function lastFighter(){try{const id=localStorage.getItem('kotj-last');return roster.find(f=>f.id===id)||null}catch(_){return null}}
{const _st=start;start=function(){try{if(picks&&picks[0]&&mode!=='online'&&mode!=='training')localStorage.setItem('kotj-last',picks[0].id)}catch(_){}qfLabel();return _st.apply(this,arguments)}}
{const _os=openSelect;openSelect=function(m){_os.apply(this,arguments);const L=lastFighter();if(L&&step===1&&m!=='forgotten'){chosen=L;render()}}}
function quickFight(){ac();const me=lastFighter()||roster.find(f=>f.id==='lion')||roster[0],pool=roster.filter(f=>f.id!==me.id);
 const ar=ARENAS.filter(a=>!a.lair);mode='cpu';step=2;tower=null;picks=[me,pool[Math.floor(Math.random()*pool.length)]];arena=ar[Math.floor(Math.random()*ar.length)]||ARENAS[0];start()}
function qfLabel(){const b=document.getElementById('quick-fight');if(!b)return;const me=lastFighter()||roster.find(f=>f.id==='lion')||roster[0];b.querySelector('small').textContent=me.name+' vs a random fighter · random arena'}
// closing the cover splash goes straight to the menu (no separate PRESS START)
if(document.getElementById('splash'))['pointerup','keyup'].forEach(ev=>window.addEventListener(ev,function h(){window.removeEventListener('pointerup',h,true);window.removeEventListener('keyup',h,true);setTimeout(()=>{const m=document.getElementById('menu');if(m&&!m.classList.contains('started')&&!m.classList.contains('hidden'))document.getElementById('press-start').click()},120)},true));
(function(){const m=document.getElementById('cover-menu');if(!m||document.getElementById('quick-fight'))return;const b=document.createElement('button');b.id='quick-fight';b.className='primary quick-btn';b.innerHTML='<b>⚡ QUICK FIGHT</b><small></small>';b.onclick=quickFight;m.insertBefore(b,m.firstChild);
 const t=m.querySelector('[data-mode=tower]');if(t){t.classList.remove('primary');t.classList.add('secondary')}qfLabel()})();

// ---------- mirror matches: the second fighter wears a contrasting colorway so you can tell who's who ----------
function ownTint(f){return(!f.ai&&window.KOTJ_ARMORY&&window.KOTJ_TINT)?KOTJ_ARMORY.fightColors(f.data.id):null}
function hueOf(hex){const n=parseInt(String(hex).replace('#',''),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d||d/mx<.15)return null;let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;return h<0?h+360:h}
const hueGap=(a,b)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d};
function mirrorTint(fid,other){if(!window.KOTJ_TINT)return null;const Z=KOTJ_TINT.ZONES[fid];if(!Z)return null;const t={};
 if(Z.cloth){const c=Z.cloth,h0=other&&other.cloth?hueOf(other.cloth):((c[0]<=c[1]?(c[0]+c[1])/2:((c[0]+c[1]+360)/2)%360));
  const C=[['#1f3fa8',225],['#a8142a',352],['#1d8a3a',140],['#5a1f9a',268]];let best=C[0],bd=-1;for(const k of C){const d=h0==null?90:hueGap(h0,k[1]);if(d>bd){bd=d;best=k}}t.cloth=best[0]}
 if(Z.metal){const h=other&&other.metal?hueOf(other.metal):45,gold=h!=null&&hueGap(h,45)<40;t.metal=!gold?'#ffd04a':(!Z.cloth&&fid!=='elephant')?'#b81c30':'#c9ccd6'} // badger & stag only have metal to recolour, so go bold red
 return t}
function fightTint(f){const mine=ownTint(f);if(!game)return mine;const F=game.fighters,i=F.indexOf(f),o=F[1-i];
 if(i!==1||!o||o.data.id!==f.data.id)return mine;                  // only the second fighter in a mirror match changes
 const theirs=ownTint(o);if(mine&&JSON.stringify(mine)!==JSON.stringify(theirs))return mine; // already wearing something different
 return mirrorTint(f.data.id,theirs)}

// phones: roster grid splits evenly into two rows
{const _rd=render;render=function(){const r=_rd.apply(this,arguments);try{const n=document.querySelectorAll('#roster .fighter-tile').length;$('roster').style.setProperty('--cols',Math.max(6,Math.ceil(n/2)))}catch(_){}return r}}

// Sonic Echo Blast: a short screen ripple when it connects
{const _rh=resolveHit;resolveHit=function(i,mv){const o=game.fighters[1-i],h0=o.hp+(o.bars||0)*1000;const r=_rh.apply(this,arguments);try{if(mv&&mv.sx&&mv.sx.warp&&h0>o.hp+(o.bars||0)*1000)game.warpT=.7}catch(_){}return r}}
{const _ct=camTilt;camTilt=function(vw,vh){_ct(vw,vh);if(game&&game.warpT>0){game.warpT=Math.max(0,game.warpT-(frameDt||.016));const k=game.warpT/.7,t=performance.now()/1000,wx=cam.x+vw/2,wy=cam.y+vh/2;c.translate(wx,wy);c.transform(1+Math.sin(t*38)*.025*k,Math.sin(t*29)*.03*k,Math.cos(t*33)*.03*k,1+Math.cos(t*41)*.025*k,0,0);c.translate(-wx,-wy)}}}

// ---------- Dolphin King unlock: win any match in THE TIDAL KINGDOM ----------
{const _fin=finish;finish=function(){const was=game&&game.over;const r=_fin.apply(this,arguments);
 try{if(!was&&game&&arena&&arena.id==='tidal-kingdom'&&mode!=='training'&&!unlockedNew().includes('dolphin')&&game.fighters[1].data.id==='dolphin'){
  const [p,q]=game.fighters,tp=total(p),tq=total(q);if(Math.abs(tp-tq)>=.01){const w=tp>tq?p:q;
   const human=mode==='versus'||(mode==='online'?((tp>tq?0:1)===ON.side):!w.ai);
   if(human){SAVE.set('unlocked',[...unlockedNew(),'dolphin']);if(!roster.includes(DOLPHIN)){const i=roster.indexOf(MAJIC);i>=0?roster.splice(i,0,DOLPHIN):roster.push(DOLPHIN)}
    setTimeout(()=>{const c=$('winner-copy');if(c){const n=document.createElement('p');n.className='unlock-note';n.innerHTML='🌊 <b>NEW FIGHTER UNLOCKED · DOLPHIN KING</b><br><small>The King of the Tides rises from the deep. He is now in your roster.</small>';c.after(n)}try{AU&&AU.sfx&&AU.sfx('instinct')}catch(_){}},400)}}}}catch(_){}
 return r}}

// ---------- Dolphin King: a real dolphin leaps out of the water behind him (like the Wolf's moon) ----------
const LEAP_IMG=new Image();LEAP_IMG.src='assets/fx/dolphin-leap.webp?v=15.60';try{FXQ_ALWAYS.add('leap')}catch(_){}
function dLeap(p){if(!LEAP_IMG.complete||!LEAP_IMG.naturalWidth)return;const u=Math.min(1,p.t/p.life),d=p.dir||1;
 const S=p.span||520,Rz=p.rise||300,x=p.x0+d*(-.44*S+S*u),y=(p.y0||392)-Rz*4*u*(1-u),ang=Math.atan2(-Rz*4*(1-2*u),S*d)*.6;
 const w=(p.w||330)*.72,h=w*LEAP_IMG.naturalHeight/LEAP_IMG.naturalWidth;
 c.globalAlpha=Math.min(1,p.t/.18)*Math.min(1,(p.life-p.t)/.25)*.95;c.translate(x,y);c.rotate(ang);if(d===1)c.scale(-1,1);
 c.drawImage(LEAP_IMG,-w*.5,-h*.5,w,h)}

// every fighter's own Ultra sound also plays when their cinematic Ultimate starts
{const _us=sxUltStart;sxUltStart=function(f,o){const r=_us.apply(this,arguments);try{if(game&&game.sxu&&AU&&soundOn&&AU.has('ultra.'+f.data.id)){AU.duckMusic(.3);AU.ultra(f.data.id)}}catch(_){}return r}}

// ---------- real animal calls: a short call on special moves, the full call on the Ultimate and on winning ----------
const CALL_CD={};
function animalCall(f,kind,vol){try{if(!AU||!soundOn||!f)return;const id=f.data.id,t=performance.now();if(kind==='cry'&&(CALL_CD[id]||0)>t)return;CALL_CD[id]=t+1600;AU.now(kind+'.'+id,vol||1)}catch(_){}}
{const _stc=start;start=function(){const r=_stc.apply(this,arguments);try{if(AU&&picks)AU.preload(picks.filter(Boolean).flatMap(p=>['cry.'+p.id,'roar.'+p.id]))}catch(_){}return r}}
{const _dmc=doMove;doMove=function(f,name){const a0=f&&f.attack;const r=_dmc.apply(this,arguments);try{if(typeof name==='string'&&(name.startsWith('sx:')||name==='special'||name==='shadow')&&f.attack>0&&f.attack!==a0)animalCall(f,'cry')}catch(_){}return r}}
{const _usc=sxUltStart;sxUltStart=function(f,o){const r=_usc.apply(this,arguments);try{if(game&&game.sxu&&!(AU&&AU.has('ultra.'+f.data.id)))setTimeout(()=>animalCall(f,'roar',.9),350)}catch(_){}return r}}
{const _fnc=finish;finish=function(){const was=game&&game.over;const r=_fnc.apply(this,arguments);try{if(!was&&game&&mode!=='training'){const [p,q]=game.fighters,tp=total(p),tq=total(q);if(Math.abs(tp-tq)>=.01){const w=tp>tq?p:q;setTimeout(()=>animalCall(w,'roar',.85),1900)}}}catch(_){}return r}}

// ---------- Tidal Kingdom: until the Dolphin King is unlocked, a real dolphin leaps over the fighters as the match is decided;
// if a player wins, the Dolphin King rises from the water at the end of the bout ----------
function tideHuman(w){return mode==='versus'||(mode==='online'?(game.fighters.indexOf(w)===ON.side):!w.ai)}
function tideStart(){const F=game.fighters,w=total(F[0])>=total(F[1])?F[0]:F[1],cx=(F[0].x+F[1].x)/2,d=Math.random()<.5?1:-1;
 const T={t:0,d,cx,S:560,R:360,leap:1.6,unlock:tideHuman(w)&&mode!=='training',w,splashIn:0,splashOut:0,king:0};game.tide=T;
 if(T.unlock){game.ko+=3.2;try{loadHD('dolphin')}catch(_){}}
 const splash=x=>{try{sxFx(F[0],['splash','drops'],x,400,1.4)}catch(_){}try{AU&&soundOn&&AU.now('sfx.splash',.9)}catch(_){}};T.splash=splash;
 splash(cx-d*T.S*.5);try{AU&&soundOn&&AU.now('cry.dolphin',.75)}catch(_){}}
{const _fuT=fxUpdate;fxUpdate=function(dt){const r=_fuT.apply(this,arguments);try{
 if(game&&game.ko>0&&game.ko<2.15&&!game.tide&&arena&&arena.id==='tidal-kingdom'&&mode!=='training'&&!unlockedNew().includes('dolphin')&&game.fighters[1].data.id!=='dolphin'&&game.fighters[0].data.id!=='dolphin')tideStart();
 const T=game&&game.tide;if(T){T.t+=dt;
  if(!T.splashOut&&T.t>=T.leap*.95){T.splashOut=1;T.splash(T.cx+T.d*T.S*.5)}
  if(T.unlock&&!T.king&&T.t>=T.leap+.25){T.king=1;T.kx=tideKingX();T.splash(T.kx);try{AU&&soundOn&&AU.now('roar.dolphin',.9)}catch(_){}tideBanner('🌊 A NEW CHALLENGER RISES','DOLPHIN KING')}}}catch(_){}return r}}
function tideKingX(){const F=game.fighters,cv=$('game-canvas'),vw=(cam.vx||570)*(cv.width/Math.max(1,cv.height)),L=cam.x+vw*.1,Rr=cam.x+vw*.9;
 const lo=Math.min(...F.map(f=>f.x))-130,hi=Math.max(...F.map(f=>f.x))+(F.some(f=>f.hp<=0&&f.x>=Math.max(...F.map(q=>q.x))-1)?200:130);
 return (lo-L)>(Rr-hi)?(L+Math.max(L,lo))/2:(Math.min(Rr,hi)+Rr)/2}
// the leaping dolphin is drawn behind the fighters so it never covers them
{const _dfT=drawFighter;drawFighter=function(f,i,ghost){try{if(i===0&&!ghost&&game&&game.tide){tideLeapDraw();tideKingDraw()}}catch(_){}return _dfT.apply(this,arguments)}}
function tideLeapDraw(){const T=game.tide;if(T.t>T.leap||!LEAP_IMG.complete||!LEAP_IMG.naturalWidth)return;const u=T.t/T.leap,d=T.d;
 const x=T.cx+d*(-.5*T.S+T.S*u),y=405-T.R*4*u*(1-u),ang=Math.atan2(-T.R*4*(1-2*u),T.S*d)*.75,w=310,h=w*LEAP_IMG.naturalHeight/LEAP_IMG.naturalWidth;
 c.save();c.beginPath();c.rect(-5000,-5000,10000,5407);c.clip();c.translate(x,y);c.rotate(ang);if(d===1)c.scale(-1,1);c.drawImage(LEAP_IMG,-w*.5,-h*.5,w,h);c.restore()}
function tideKingDraw(){const T=game.tide;if(!T.king)return;const k=T.t-(T.leap+.25),im=spriteHD.dolphin&&spriteHD.dolphin.victory,Tb=HDT.dolphin;
 if(!im||!im.complete||!im.naturalWidth||!Tb)return;const m=Tb.anims.victory,[n,fw,fh,px,py,cols]=m,sc=Tb.s*(m[6]||1),CC=cols||1e9;
 const rise=Math.min(1,k/.55),ease=1-Math.pow(1-rise,3),fr=Math.min(n-1,Math.floor(Math.max(0,k-.35)*12)),dir=game.tide.w.x<T.kx?-1:1;
 c.save();c.beginPath();c.rect(-5000,-5000,10000,5372);c.clip();c.translate(T.kx,372+(1-ease)*300);c.scale(dir*.84,.84);
 c.shadowColor='#6fdcff';c.shadowBlur=(typeof LITE==='function'&&LITE())?0:24;c.globalAlpha=Math.min(1,k/.25);
 c.drawImage(im,(fr%CC)*fw,Math.floor(fr/CC)*fh,fw,fh,-px,-py+6,fw/sc,fh/sc);c.restore()}
function tideBanner(top,big){let el=document.getElementById('tide-unlock');if(!el){el=document.createElement('div');el.id='tide-unlock';document.body.appendChild(el)}
 el.innerHTML='<small>'+(top||'🌊 NEW PLAYABLE CHARACTER UNLOCKED')+'</small><b>'+(big||'DOLPHIN KING')+'</b>';el.classList.remove('on');void el.offsetWidth;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),3400)}
{const _stT=start;start=function(){const r=_stT.apply(this,arguments);try{if(game)game.tide=null;if(arena&&arena.id==='tidal-kingdom'&&!unlockedNew().includes('dolphin'))setTimeout(()=>{try{loadHD('dolphin')}catch(_){}},1500)}catch(_){}return r}}

// ---------- Tidal Kingdom challenge: win there (first time) and the Dolphin King steps in for a second bout ----------
// Works everywhere: VS CPU / 2 Player / Quick Fight go straight into the bout; Tower and Online finish the match first,
// then the winner gets a FACE THE DOLPHIN KING button (Tower carries on afterwards). Your fighter is fully healed.
const TIDAL=ARENAS.find(a=>a.id==='tidal-kingdom');
function tideChallenge(wData){const from={mode,tower,picks:picks.slice()};window.__tideFrom=from;
 if(mode==='online'&&window.KOTJNet){try{NET.send({t:'leave'});NET.leave()}catch(_){}}
 tower=null;mode='cpu';picks=[wData,DOLPHIN];step=2;arena=TIDAL;clean();
 setTimeout(()=>{start();setTimeout(()=>tideBanner('🌊 ROUND 2 · FULL HEALTH','BEAT THE DOLPHIN KING'),900)},200)}
{const _fnT=finish;finish=function(){
 const pend=game&&!game.over&&game.tide&&game.tide.unlock&&game.fighters[1].data.id!=='dolphin'&&!unlockedNew().includes('dolphin')?game.tide.w.data:null;
 if(pend&&(mode==='cpu'||mode==='versus')&&!tower){game.over=true;tideChallenge(pend);return}
 const r=_fnT.apply(this,arguments);
 try{
  if(pend){ // Tower / Online: offer the challenge on the result screen
   let b=$('tide-face');if(!b){b=document.createElement('button');b.id='tide-face';b.className='primary';$('rematch').before(b)}
   b.innerHTML='🌊 FACE THE DOLPHIN KING';b.classList.remove('hidden');b.onclick=()=>{b.classList.add('hidden');tideChallenge(pend)};
   if(tower)$('tower-next').classList.add('hidden')}
  else{const b=$('tide-face');if(b)b.classList.add('hidden')}
  const f=window.__tideFrom;
  if(f&&game&&game.fighters[1].data.id==='dolphin'){
   if(unlockedNew().includes('dolphin'))setTimeout(()=>tideBanner(),300);
   if(f.mode==='tower'&&f.tower){tower=f.tower;mode='tower';window.__tideFrom=null;
    $('tower-next').textContent='CONTINUE TOWER';$('tower-next').classList.remove('hidden');$('rematch').classList.add('hidden')}
   else if(f.mode==='online'){mode='cpu';window.__tideFrom=null}}
 }catch(_){}
 return r}}
// leaving the challenge restores the original mode for menus; rematch shows again after a tower detour
$('result-menu').addEventListener('click',()=>{const f=window.__tideFrom;if(f){mode=f.mode==='online'?'versus':f.mode;window.__tideFrom=null}},true);
$('tower-next').addEventListener('click',()=>$('rematch').classList.remove('hidden'),true);

// ---------- MAJIC: the final boss soaks hits (3 full health bars, takes 40% less damage from players) ----------
{const _rhM=resolveHit;resolveHit=function(i,mv){const f=game.fighters[i],o=game.fighters[1-i];const h0=o.hp,b0=o.bars;const r=_rhM.apply(this,arguments);
 try{if(o.data.id==='majic'&&o.ai&&f.data.id!=='majic'&&o.bars===b0&&o.hp<h0&&o.hp>0){o.hp=Math.min(BAR,o.hp+(h0-o.hp)*.4)}}catch(_){}return r}}
})();
