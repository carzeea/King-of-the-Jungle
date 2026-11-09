'use strict';
/* King of the Jungle V2 — web build 0.3
   Killer-Instinct-style combat: openers, auto-doubles, enders, potential (recoverable) damage,
   combo breakers with lockout, two life bars, DANGER state, Shadow moves, Instinct mode and
   cinematic ULTRA COMBO finishers. Plus: portraits, Badger sprites, touch, gamepad, CPU, Tower. */
(()=>{
const $=id=>document.getElementById(id), roster=KOTJ_ROSTER, screens=['menu','select','stage','fight','result','champion','story','online','recovery','rise'];
// Online play state (see js/net.js). side 0 = host = Player 1, side 1 = guest = Player 2.
const ON={side:0,mine:null,theirs:null,inp:{h:{},c:{}},used:{},prevOut:{},cnt:{},lp:{},ev:[],snap:null,seq:0,lastSeq:-1,code:''};
const portrait=id=>'assets/characters/portraits/'+id+'.jpg?v=7.0';
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
 {id:'savage-plains',name:'SAVAGE PLAINS'},{id:'shadow-swamp',name:'SHADOW SWAMP'},{id:'caes-corner',name:"CAE'S CORNER"},{id:'royal-colosseum',name:"MAJIC'S LAIR",lair:1}];
const LAIR=ARENAS.find(a=>a.lair),FIGHT_ARENAS=ARENAS.filter(a=>!a.lair);
const arenaImg={};ARENAS.forEach(a=>{const im=new Image();im.src='assets/arenas/'+a.id+'.webp';arenaImg[a.id]=im});
let arena=ARENAS[0],stagePick=0; // stagePick: index into ARENAS, ARENAS.length = random
const RND=()=>ARENAS.length;
function renderStages(){setBackdrop('assets/ui/select-bg.webp');
 $('stage-vs').textContent=picks[0].name+' VS '+picks[1].name;$('stage-grid').innerHTML='';
 ARENAS.forEach((a,i)=>{const b=document.createElement('button');b.className='stage-tile'+(a.lair?' lair':'')+(stagePick===i?' selected':'');
  b.innerHTML=`<span class="sf"><img src="assets/arenas/${a.id}-thumb.webp?v=7.5" alt=""><strong>${a.name}</strong></span>`;
  b.onclick=()=>{ac();stagePick=i;renderStages()};b.ondblclick=()=>$('stage-go').click();$('stage-grid').append(b)});
 const r=document.createElement('button');r.className='stage-tile random'+(stagePick===RND()?' selected':'');
 r.innerHTML='<span class="sf"><img class="laurel" src="assets/ui/stage-random.webp?v=7.5" alt=""><strong>RANDOM</strong></span>';
 r.onclick=()=>{ac();stagePick=RND();renderStages()};r.ondblclick=()=>$('stage-go').click();$('stage-grid').append(r);
 const sel=$('stage-grid').querySelector('.selected');sel&&sel.scrollIntoView({block:'nearest'});
}
function openStage(){renderStages();$('stage-back').classList.toggle('hidden',mode==='online');show('stage')}
$('stage-go').onclick=()=>{ac();arena=stagePick>=RND()?ARENAS[Math.floor(Math.random()*ARENAS.length)]:ARENAS[stagePick];if(mode==='online')NET.send({t:'start',a:picks[0].id,b:picks[1].id,arena:arena.id});start()};
$('stage-back').onclick=()=>{if(mode==='online')return;step=mode==='versus'||mode==='cpu'?2:1;chosen=picks[step-1];render();show('select')};
// Tower: each floor moves to a new arena; the final boss is always in Majic's Lair.
function towerArena(){if(tower.kind==='forgotten')return [ARENAS[4],ARENAS[2],ARENAS[1]][tower.index]||LAIR;const n=tower.ladder.length;return tower.index===n-1?LAIR:FIGHT_ARENAS[tower.index%FIGHT_ARENAS.length]}

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
 crocodile:1.12,lion:1.02,tiger:.94,grizzly:1.28,hippo:1.38,elephant:1.5,
 eagle:.76,snake:.7,stag:.88,majic:1.04};
const impactScale=f=>Math.max(.68,Math.min(1.28,1/(FIGHTER_MASS[f.data.id]||1)));
// Each fighter carries a restrained signature impact color, so attacks read
// as belonging to that animal without changing damage, timing, or hitboxes.
const FIGHTER_IMPACT={
 badger:'#d7a85b',hyena:'#d7a85b',wolf:'#b8d7ff',leopard:'#9ce7ff',
 jaguar:'#e9c46a',crocodile:'#78d6a3',lion:'#ffb347',tiger:'#ff8247',
 grizzly:'#c99a70',hippo:'#83c9d8',elephant:'#c6b7a0',eagle:'#fff0a6',
 snake:'#a8e06f',stag:'#b6d98b',majic:'#bd8cff'
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
function openSelect(m){mode=m;step=1;tower=null;picks=[roster[6],roster[1]];chosen=picks[0];if(m==='online'){ON.mine=null;ON.theirs=null}render();show('select')}
function selectBack(){if(mode==='online')menu();else show('menu')}
function render(){
 const who=mode==='versus'?`PLAYER ${step}`:'PLAYER 1';
  $('select-instruction').textContent=mode==='forgotten'?'CHOOSE WHO ENTERS':mode==='tower'?'CHOOSE YOUR FIGHTER · CLIMB ALL 10 OPPONENTS':mode==='cpu'&&step===2?'CHOOSE YOUR CPU OPPONENT':`${who}: CHOOSE YOUR FIGHTER`;
 $('confirm-fighter').textContent=mode==='forgotten'?'ENTER':mode==='tower'?'START THE TOWER':mode==='cpu'&&step===2?'CONFIRM CPU OPPONENT':`CONFIRM ${who}`;
 $('roster').innerHTML='';
 roster.forEach((f,i)=>{if(mode==='forgotten'&&f.id==='majic')return;const b=document.createElement('button');b.className='fighter-tile'+(chosen.id===f.id?' selected':'');if(f.id==='majic')b.classList.add('titan');
  b.innerHTML=`<span class="tf"><img src="${portrait(f.id)}" alt="${f.name}"><strong${f.name.length>9?' class="long"':''}>${f.name}</strong></span>`+(f.id==='majic'?'<i class="bolt b0"></i><i class="bolt b1"></i><i class="bolt b2"></i>':'')+(crowns().includes(f.id)?'<img class="tile-crown" src="assets/ui/crown.webp" alt="Tower champion" title="Conquered the Tower">':'');
  b.onclick=()=>{chosen=f;document.querySelectorAll('.fighter-tile').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');card(f,i)};
  b.ondblclick=()=>$('confirm-fighter').click();$('roster').append(b)});
 card(chosen,roster.indexOf(chosen));selectWait();
 const sel=document.querySelector('.fighter-tile.selected');if(sel&&document.getElementById('select').contains(sel)&&!$('select').classList.contains('hidden'))sel.scrollIntoView({block:'nearest',behavior:'smooth'});
 selectHints();
}
function gridCols(){const t=[...document.querySelectorAll('#roster .fighter-tile')];if(t.length<2)return 1;const y=t[0].offsetTop;return Math.max(1,t.filter(e=>e.offsetTop===y).length)}
function randomPick(){const pool=roster.filter(f=>f.id!==chosen.id&&!(mode==='forgotten'&&f.id==='majic'));chosen=pool[Math.floor(Math.random()*pool.length)];render()}
function selectHints(){const el=$('select-hints');if(!el)return;const pads=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean);const kind=pads[0]?padKind(pads[0]):isTouch()?'touch':'kb';
 const B={xbox:['✚','A','B','Y','☰'],ps:['✚','✕','○','△','☰'],kb:['← →','ENTER','ESC','R','P'],touch:['👆','✔','↩','🎲','']}[kind];
 el.innerHTML=[['SELECT FIGHTER',B[0],'dpad'],['CONFIRM',B[1],'ka'],['BACK',B[2],'kb'],['RANDOM',B[3],'ky']].map(([t,k,c])=>`<span class="hint"><b class="${c}">${k}</b>${t}</span>`).join('');
 if(kind==='touch'){el.querySelectorAll('.hint')[0].lastChild.textContent='TAP A FIGHTER';el.querySelectorAll('.hint')[1].onclick=()=>$('confirm-fighter').click()}el.querySelectorAll('.hint')[2].onclick=()=>selectBack();el.querySelectorAll('.hint')[3].onclick=()=>randomPick()}
function card(f,i){$('confirm-fighter').disabled=false;setBackdrop(portrait(f.id));$('fighter-number').textContent=String(i+1).padStart(2,'0');$('fighter-portrait').src=portrait(f.id);$('fighter-name').textContent=f.name;$('fighter-style').textContent=f.style;$('fighter-bio').textContent=f.bio;$('power-stat').textContent=f.power;$('speed-stat').textContent=f.speed;$('defense-stat').textContent=f.defense;if(mode==='online')selectWait()}
$('confirm-fighter').onclick=()=>{
 ac();if(mode==='online'){if(ON.mine)return;ON.mine=chosen.id;NET.send({t:'pick',id:chosen.id});selectWait();return}picks[step-1]=chosen;
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
window.addEventListener('keydown',e=>{if(!game&&!$('stage').classList.contains('hidden')){const N=RND()+1;let n=stagePick;const k=e.key;
 if(k==='ArrowRight')n=(n+1)%N;else if(k==='ArrowLeft')n=(n+N-1)%N;else if(k==='ArrowDown')n=Math.min(N-1,n+3);else if(k==='ArrowUp')n=Math.max(0,n-3);
 else if(k==='Enter'){e.preventDefault();$('stage-go').click();return}else if(k==='Escape'){$('stage-back').click();return}else return;
 e.preventDefault();stagePick=n;renderStages()}});
window.addEventListener('keydown',e=>{if(!game&&!$('select').classList.contains('hidden')){const i=roster.indexOf(chosen),cols=gridCols();let n=i;const k=e.key;
  if(k==='ArrowRight')n=(i+1)%roster.length;else if(k==='ArrowLeft')n=(i+roster.length-1)%roster.length;else if(k==='ArrowDown')n=Math.min(roster.length-1,i+cols);else if(k==='ArrowUp')n=Math.max(0,i-cols);
  else if(k==='Enter'){e.preventDefault();$('confirm-fighter').click();return}else if(k==='Escape'){selectBack();return}else if(k==='r'||k==='R'){randomPick();return}else return;
  e.preventDefault();if(n!==i){chosen=roster[n];render()}return}
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
function readPad(n){
 const list=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(Boolean);const g=list[n];if(!g)return null;
 const B=i=>!!(g.buttons[i]&&g.buttons[i].pressed),ax=g.axes[0]||0,ay=g.axes[1]||0;
 return{up:B(12)||ay<-.6,dn:B(13)||ay>.6,l:B(14)||ax<-.45,r:B(15)||ax>.45,j:B(0)||B(12)||ay<-.7,bl:B(1)||B(6)||B(4)||B(13)||ay>.7,at:B(2),sp:B(3),ins:B(5)||B(7),start:B(9),back:B(1),a:B(0)};
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
 if(vis==='select'){const i=roster.indexOf(chosen),cols=gridCols();let n=i;if(g.r&&!p.r)n=(i+1)%roster.length;if(g.l&&!p.l)n=(i+roster.length-1)%roster.length;
  if(g.dn&&!p.dn)n=Math.min(roster.length-1,i+cols);if(g.up&&!p.up)n=Math.max(0,i-cols);
  if(n!==i){chosen=roster[n];render()}if((g.a&&!p.a)||(g.at&&!p.at)||(g.start&&!p.start))$('confirm-fighter').click();if(g.back&&!p.back)selectBack();if(g.sp&&!p.sp)randomPick()}
 if(vis==='stage'){let n=stagePick;const N=RND()+1;if(g.r&&!p.r)n=(n+1)%N;if(g.l&&!p.l)n=(n+N-1)%N;if(g.dn&&!p.dn)n=Math.min(N-1,n+3);if(g.up&&!p.up)n=Math.max(0,n-3);if(n!==stagePick){stagePick=n;renderStages()}if((g.at&&!p.at)||(g.start&&!p.start))$('stage-go').click();if(g.bl&&!p.bl)$('stage-back').click()}
 if(vis==='online'&&g.back&&!p.back)$('ol-back').click();
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
 if(o.actionTime>0&&o.attack>0&&d<hitDist(o,f,'attack_heavy')+20&&!ai.wantBlock&&Math.random()<(.01+lvl*.05)*60*dt)ai.wantBlock=.3+lvl*.3;
 if(ai.wantBlock&&f.ground){k.bl=true;return k}
 if(ai.think<=0){
  ai.think=.5-lvl*.33+Math.random()*.2;ai.hold={};ai.doubles=1+Math.floor(Math.random()*(1+lvl*3));ai.dropping=Math.random()>.45+lvl*.5;
  const r=Math.random(),aggro=.2+lvl*.55;
  const near=hitDist(f,o,'attack_light')-25,spR=hitDist(f,o,moveAnim(f,MOVES.special));
  if(d>near){ai.hold[toward]=1;if(r<.06+lvl*.05)ai.hold.j=1;else if(r<.12+lvl*.1&&d<spR)ai.hold.sp=1;else if(f.meter>=50&&r<.2)ai.hold.shadow=1}
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
function fighter(x,dir,data){return{x,y:0,vx:0,vy:0,dir,hp:BAR,bars:data.id==='majic'?3:2,potential:0,data,ground:true,block:false,blockTime:0,attack:0,stun:0,walk:0,move:0,moveVel:0,
 action:'idle',actionTime:0,actionTotal:1,move_:null,hitsDone:0,elapsed:0,wasAttack:false,wasSpecial:false,wasIns:false,hitFlash:0,hitAnimTime:0,hitHeavy:false,
 combo:0,meter:0,lockout:0,breakWindow:0,instinct:0,down:0,koTime:0,ai:null,trail:[]}}
function setAction(f,a,t){f.action=a;f.actionTime=t;f.actionTotal=t}
function start(){
 show('fight');document.body.classList.add('fighting');setBackdrop('assets/arenas/'+arena.id+'.webp');$('arena-title').textContent=arena.name;
 const cpu2=mode!=='versus'&&mode!=='online';
 $('p1-name').textContent=picks[0].name;$('p2-name').textContent=picks[1].name;
 $('p1-face').src=portrait(picks[0].id);$('p2-face').src=portrait(picks[1].id);
 $('p1-tag').textContent=mode==='online'?(ON.side===0?'YOU':'FRIEND'):'PLAYER 1';$('p2-tag').textContent=mode==='online'?(ON.side===1?'YOU':'FRIEND'):cpu2?'CPU':'PLAYER 2';
 $('mode-label').textContent=mode==='forgotten'?'? ? ?':mode==='tower'?'TOWER':mode==='cpu'?'VS CPU':mode==='online'?'ONLINE':'VERSUS';
 $('round-label').textContent=tower?(tower.boss?'THE SUMMIT':tower.kind==='forgotten'?`ECHO ${tower.index+1} / 3`:`FIGHT ${tower.index+1} / ${tower.ladder.length}`):'ROUND 1';
 $('p2-face').classList.toggle('echo-face',!!picks[1].echo);
 time=99;paused=false;Object.assign(ON,{inp:{h:{},c:{}},used:{},prevOut:{},cnt:{},lp:{},ev:[],snap:null,seq:0,lastSeq:-1});$('pause').classList.toggle('hidden',mode==='online');cam.z=1;cam.snap=true;resStart();
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
function togglePause(){if(!game||game.over||mode==='online')return;updateGuide();paused=!paused;$('pause').textContent=paused?'RESUME':'PAUSE';document.body.classList.toggle('paused',paused);AU&&AU.pauseMusic(paused)}
function loop(t){
 if(!game)return;const rawDt=(t-last)/1000;let real=Math.min(rawDt,.035);last=t;frameDt=real;if(!paused&&rawDt<.5)resTick(rawDt);
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
   if(!game.ko){time=Math.max(0,time-dt);$('timer').textContent=Math.ceil(time);}
   update(dt);
   if(!game.ko&&time===0){game.ko=2;banner('TIME','',1.6);say('Time');}
  }
  game.zoom=1;
  if(mode==='online')hostSend();
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
  const o=F[1-i],inp=f.ai?cpuInput(i):mode==='online'?netInput(i):inputFor(i),frozen=!!game.ko;
  const rawAtk=inp.at&&!f.wasAttack&&!frozen,rawSp=inp.sp&&!f.wasSpecial&&!frozen,insEdge=inp.ins&&!f.wasIns&&!frozen;
  // Secret "Titan's Bane": BLOCK, BLOCK, JUMP, JUMP, ATTACK within 2.5 s while fighting MAJIC.
  if(!f.ai&&o.data.id==='majic'&&(game.baneN||0)<2&&!game.ko&&o.hp>0){const ed=n=>inp[n]&&!(f.secPrev||{})[n];f.secT=(f.secT||0)+game.dt;
   const push=c=>{if(!f.sec||f.secT>2.5){f.sec='';f.secT=0}f.sec+=c};
   if(ed('bl'))push('B');if(ed('j'))push('J');if(rawAtk&&f.sec)push('A');
   if(f.sec&&!'BBJJA'.startsWith(f.sec.slice(-5))&&!'BBJJA'.startsWith(f.sec))f.sec=f.sec.endsWith('B')?'B':'';
   // 1st correct entry: MAJIC loses a whole life bar. 2nd correct entry: he falls for good.
   if(f.sec&&f.sec.endsWith('BBJJA')){game.bane=i+1;game.baneN=(game.baneN||0)+1;f.sec='';f.secT=0;
    if(game.baneN===1){if(o.bars>1){o.bars--;o.hp=BAR;o.potential=0}
     banner("TITAN'S BANE",'MAJIC IS WEAKENED · ENTER IT AGAIN TO FINISH HIM',2,'#7fe8ff');game.shake=.5;game.flash=.4;floatText(o.x,o.y-340,'WEAKENED','#7fe8ff')}
    else{o.bars=1;o.hp=0;o.potential=0;o.stun=0;o.attack=0;o.vx=f.dir*480;o.vy=-420;o.ground=false;game.shake=.7;game.flash=1;
     spark(o.x,o.y-150,'#7fe8ff',40);floatText(o.x,o.y-340,"TITAN'S BANE",'#7fe8ff');hud();koFinish(o,f)}}
   f.secPrev={bl:inp.bl,j:inp.j,l:inp.l,r:inp.r}}
  f.wasAttack=inp.at;f.wasSpecial=inp.sp;f.wasIns=inp.ins;
  // Input buffer: a press up to 0.15 s early still comes out at the first legal moment.
  f.bufA=rawAtk?.15:Math.max(0,(f.bufA||0)-dt);f.bufS=rawSp?.15:Math.max(0,(f.bufS||0)-dt);
  const atkEdge=f.bufA>0,spEdge=f.bufS>0;
  const elephantGrab=f.data.id==='elephant'&&(inp.dn||inp.bl)&&atkEdge&&f.ground;
  const elephantStomp=f.data.id==='elephant'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const elephantCharge=f.data.id==='elephant'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  const hippoRush=f.data.id==='hippo'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const grizzlyMaul=f.data.id==='grizzly'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  const grizzlyPaw=f.data.id==='grizzly'&&(inp.dn||inp.bl)&&atkEdge&&f.ground;
  const lionRoar=f.data.id==='lion'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const crocodileRoll=f.data.id==='crocodile'&&(inp.dn||inp.bl)&&spEdge&&f.ground;
  const tigerPounce=f.data.id==='tiger'&&spEdge&&f.ground&&((inp.r&&f.dir===1)||(inp.l&&f.dir===-1));
  f.lockout=Math.max(0,f.lockout-dt);f.breakWindow=Math.max(0,f.breakWindow-dt);f.hitFlash=Math.max(0,f.hitFlash-dt);
  if(f.instinct>0){f.instinct=Math.max(0,f.instinct-dt);f.meter=f.instinct/8*100;if(!f.instinct)f.meter=0}
  const spd=(f.instinct?1.2:1);
  if(f.hp<=0&&f.bars<=1){f.action='knockdown';f.koTime+=dt;physics(f,dt);return}
  if(game.ko&&o.hp<=0&&o.bars<=1&&f.ground&&f.attack<=0&&f.stun<=0&&f.down<=0){f.winT=(f.winT||0)+dt;if(f.winT>.18){f.action='victory';physics(f,dt);return}}
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
  f.leopardDashT=Math.max(0,(f.leopardDashT||0)-dt);
  f.leopardAirFollowT=Math.max(0,(f.leopardAirFollowT||0)-dt);
  f.leopardFrostDiveT=Math.max(0,(f.leopardFrostDiveT||0)-dt);
  f.leopardDashCooldown=Math.max(0,(f.leopardDashCooldown||0)-dt);
  f.elephantGrabT=Math.max(0,(f.elephantGrabT||0)-dt);
  f.elephantStompT=Math.max(0,(f.elephantStompT||0)-dt);
  f.elephantCounterT=Math.max(0,(f.elephantCounterT||0)-dt);
  f.elephantChargeT=Math.max(0,(f.elephantChargeT||0)-dt);
  f.tigerPounceT=Math.max(0,(f.tigerPounceT||0)-dt);
  f.tigerCounterT=Math.max(0,(f.tigerCounterT||0)-dt);
  f.tigerEvadeT=Math.max(0,(f.tigerEvadeT||0)-dt);
  f.grizzlyCounterT=Math.max(0,(f.grizzlyCounterT||0)-dt);
  f.hippoRushT=Math.max(0,(f.hippoRushT||0)-dt);
  f.hippoCounterT=Math.max(0,(f.hippoCounterT||0)-dt);
  f.block=inp.bl&&f.ground&&f.attack<=0&&!frozen;f.blockTime=f.block?f.blockTime+dt:0;
  // ----- Attacking -----
  if(f.attack>0){
   f.attack-=dt*spd;f.actionTime=f.attack;f.elapsed+=dt*spd;
   const mv=f.move_;
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
   const sp=240*f.data.speed/7*spd;if(inp.l)move=-sp;if(inp.r)move=sp;
   // Snow Leopard frost dash: double-tap forward or back.
   if(f.data.id==='leopard'){const tap=inp.r&&!f.tapPrevR?1:inp.l&&!f.tapPrevL?-1:0;f.tapPrevR=inp.r;f.tapPrevL=inp.l;f.tapT=(f.tapT||0)+dt;
    if(tap){if(f.ground&&f.leopardDashCooldown<=0&&f.lastTap===tap&&f.tapT<.26){f.leopardDashT=.22;f.leopardDashCooldown=.7;f.moveVel=tap*680;f.lastTap=0;sfx('whiff')}else{f.lastTap=tap;f.tapT=0}}}
   if(inp.j&&f.ground){if(f.data.id==='leopard'&&f.leopardDashT>0)f.leopardAirFollowT=.65;f.vy=-560;f.ground=false;}
   if(f.data.id==='leopard'&&!f.ground&&f.leopardAirFollowT>0&&atkEdge){f.leopardAirFollowT=0;f.leopardFrostDiveT=.9;doMove(f,'bite');f.vx=f.dir*430;f.vy=-95;floatText(f.x,f.y-285,'FROST DIVE','#9feaff')}
   else if(insEdge&&f.meter>=100&&!f.instinct){f.instinct=8;sfx('instinct');banner('INSTINCT',f.data.name,1);say('Instinct');game.flash=.5}
   else if(f.data.id==='leopard'&&f.leopardCounter>0&&atkEdge){f.leopardCounter=0;doMove(f,'bite');f.vx=f.dir*270;floatText(f.x,f.y-285,'FROST COUNTER','#9feaff')}
   else if(f.data.id==='elephant'&&f.elephantCounterT>0&&atkEdge){f.elephantCounterT=0;doMove(f,'tuskCounter');}
   else if(f.data.id==='hippo'&&f.hippoCounterT>0&&atkEdge){f.hippoCounterT=0;doMove(f,'riverCounter')}
   else if(f.data.id==='grizzly'&&f.grizzlyCounterT>0&&atkEdge){f.grizzlyCounterT=0;doMove(f,'bearCounter')}
   else if(f.data.id==='lion'&&f.lionCounterT>0&&atkEdge){f.lionCounterT=0;doMove(f,'lionCounter')}
   else if(f.data.id==='tiger'&&f.tigerCounterT>0&&atkEdge){f.tigerCounterT=0;doMove(f,'tigerSlip')}
   else if(o.stun>0&&f.combo>0&&atkEdge)doMove(f,'double');
   else if(o.stun>0&&f.combo>0&&spEdge)doMove(f,'ender');
   else if(atkEdge)doMove(f,'claw');
   else if(elephantCharge)doMove(f,'charge');
   else if(grizzlyMaul)doMove(f,'grizzlyMaul');
   else if(tigerPounce)doMove(f,'tigerPounce');
   else if(spEdge)doMove(f,'special');
  }
  if(f.block&&!frozen){
   // Elephant while blocking: a fresh block opens the Tusk Counter; otherwise block+attack = Trunk Grab
   // and block+special = Titan Stomp (the shadow move keeps priority once he has half a meter).
   if(spEdge&&f.meter>=50){f.block=false;doMove(f,'shadow')}
   else if(spEdge&&elephantStomp){f.block=false;doMove(f,'stomp')}
   else if(spEdge&&hippoRush){f.block=false;doMove(f,'hippoRush')}
   else if(spEdge&&lionRoar){f.block=false;doMove(f,'lionRoar')}
   else if(spEdge&&crocodileRoll){f.block=false;doMove(f,'crocodileRoll')}
   else if(atkEdge){f.block=false;if(f.data.id==='elephant'&&f.elephantCounterT>0){f.elephantCounterT=0;doMove(f,'tuskCounter')}else if(f.data.id==='hippo'&&f.hippoCounterT>0){f.hippoCounterT=0;doMove(f,'riverCounter')}else if(f.data.id==='grizzly'&&f.grizzlyCounterT>0){f.grizzlyCounterT=0;doMove(f,'bearCounter')}else if(f.data.id==='lion'&&f.lionCounterT>0){f.lionCounterT=0;doMove(f,'lionCounter')}
    else if(f.data.id==='tiger'&&f.tigerCounterT>0){f.tigerCounterT=0;doMove(f,'tigerSlip')}else if(elephantGrab&&!(o.stun>0&&f.combo>0))doMove(f,'grab');else if(grizzlyPaw&&!(o.stun>0&&f.combo>0))doMove(f,'grizzlyPaw');else doMove(f,o.stun>0&&f.combo>0?'double':'bite')}
  }
  // Smoothly accelerate and decelerate horizontal input. Keep this separate
  // from vx, which is reserved for hit knockback and physics impulses.
  // Character-specific handling: agile fighters react quickly to direction
  // changes; heavier bodies build and shed momentum more deliberately.
  const bodyMass=FIGHTER_MASS[f.data.id]||1;
  const agility=clamp((f.data.speed||7)/7,.72,1.42);
  const handling=clamp(12.5*agility/Math.sqrt(bodyMass),8.5,17);
  const moveResponse=1-Math.exp(-dt*handling);
  if(f.data.id==='leopard'&&f.leopardDashT>0)f.moveVel=Math.sign(f.moveVel||move)*680;
  else f.moveVel+=(move-f.moveVel)*moveResponse;
  if(Math.abs(f.moveVel)<2&&move===0)f.moveVel=0;
  f.move=f.moveVel;f.x+=f.moveVel*dt;
  physics(f,dt);
  if(f.attack<=0)f.action=f.block?'block':(!f.ground?'jump':Math.abs(move)>35?'walk':(Math.floor(performance.now()/1800)%3===0?'breathing':'idle'));
  f.walk+=Math.abs(f.moveVel)*dt*.025;
 });
 const gap=Math.abs(a.x-b.x),minGap=Math.max(130,(bodyFront(a)+bodyFront(b))*.95);
 if(gap<minGap&&Math.abs(a.y-b.y)<120){const push=(minGap-gap)/2,s=a.x<b.x?-1:1;a.x=clampX(a.x+push*s);b.x=clampX(b.x-push*s);}
 if(a.hp>0&&b.hp>0&&!a.attack&&!a.stun)a.dir=b.x>=a.x?1:-1;
 if(a.hp>0&&b.hp>0&&!b.attack&&!b.stun)b.dir=a.x>=b.x?1:-1;
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
 f.elephantImpact=Math.max(0,(f.elephantImpact||0)-dt*2.0);
 f.leopardFinisher=Math.max(0,(f.leopardFinisher||0)-dt*2.2);
 f.lionManeFinisher=Math.max(0,(f.lionManeFinisher||0)-dt*2.0);
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
function doMove(f,name){
 f.bufA=0;f.bufS=0;
 const mv=name==='crocodileRoll'&&f.data.id==='crocodile'?{t:.82,hits:[.27,.53],dmg:p=>7+p*.58,range:345,stun:.74,push:305,crocodileRoll:true}:name==='tigerSlip'&&f.data.id==='tiger'?{t:.48,hits:[.16],dmg:p=>10+p*.68,range:300,stun:.66,push:270,tigerSlip:true}:name==='tigerPounce'&&f.data.id==='tiger'?{t:.62,hits:[.22,.40],dmg:p=>5+p*.4,range:310,stun:.56,push:155,tigerPounce:true}:name==='lionCounter'&&f.data.id==='lion'?{t:.56,hits:[.20],dmg:p=>12+p*.72,range:365,stun:.78,push:335,lionCounter:true}:name==='lionRoar'&&f.data.id==='lion'?{t:.84,hits:[.43],dmg:p=>7+p*.62,range:440,stun:.82,push:365,lionRoar:true}:name==='grizzlyPaw'&&f.data.id==='grizzly'?{t:.66,hits:[.34],dmg:p=>11+p*.72,range:285,stun:.7,push:245,grizzlyPaw:true}:name==='grizzlyMaul'&&f.data.id==='grizzly'?{t:.72,hits:[.29,.49],dmg:p=>9+p*.72,range:305,stun:.62,push:285,grizzlyMaul:true}:name==='hippoRush'&&f.data.id==='hippo'?{t:.74,hits:[.30,.52],dmg:p=>9+p*.62,range:320,stun:.58,push:265,hippoRush:true}:name==='charge'&&f.data.id==='elephant'?{t:.68,hits:[.24,.43],dmg:p=>7+p*.52,range:325,stun:.48,push:245,charge:true}:name==='grab'&&f.data.id==='elephant'?{t:.72,hits:[.31],dmg:p=>12+p*.85,range:250,stun:.78,push:175,grab:true}:name==='stomp'&&f.data.id==='elephant'?{t:.9,hits:[.48],dmg:p=>9+p*.7,range:330,stun:.58,push:340,stomp:true}:name==='tuskCounter'&&f.data.id==='elephant'?{t:.52,hits:[.19],dmg:p=>13+p*.72,range:285,stun:.72,push:295,tuskCounter:true}:name==='bearCounter'&&f.data.id==='grizzly'?{t:.54,hits:[.20],dmg:p=>12+p*.7,range:290,stun:.72,push:300,bearCounter:true}:name==='riverCounter'&&f.data.id==='hippo'?{t:.56,hits:[.20],dmg:p=>12+p*.68,range:295,stun:.68,push:285,riverCounter:true}:MOVES[name];
 const o=game.fighters.find(x=>x!==f);
 if(o.stun>0&&f.combo>0&&(name==='ender'||name==='double'||name==='shadow'))o.stun=Math.max(o.stun,mv.hits[0]+.12); /* a linked move is guaranteed to connect */
 // The snow leopard turns her linked double into a rapid three-hit claw flurry.
 // Each strike is lighter so the combined damage stays close to the standard double.
 const moveData=f.data.id==='leopard'&&name==='double'?{...mv,base:MOVES.double,t:.36,hits:[.055,.155,.255],dmg:p=>(2.6+p*.35)*2/3}:f.data.id==='lion'&&name==='double'?{...mv,base:MOVES.double,t:.39,hits:[.055,.17,.285],dmg:p=>(2.6+p*.35)*2/3}:f.data.id==='tiger'&&name==='double'?{...mv,base:MOVES.double,t:.43,hits:[.045,.135,.225,.315],dmg:p=>(2.6+p*.35)*.5}:mv;
 f.move_=moveData;f.attack=moveData.t;f.hitsDone=0;f.elapsed=0;
 f.chain=(f.chain||0)+1;
 // Match approach distance to the exact animation selected for this attack, including alternating double strikes.
 // Linked combo strikes get a shorter, softer chase step so knockback does not leave them visibly swinging short.
 const comboLink=o.stun>0&&f.combo>0;
 f.comboLinked=comboLink;
 if(f.ground&&!mv.shadow){const need=Math.abs(o.x-f.x)-hitDist(f,o,moveAnim(f,mv))+6;const maxGap=comboLink?105:70;if(need>0&&need<maxGap){const chase=comboLink?Math.min(260,need*4.2):Math.min(380,need*6);f.vx=f.dir*Math.max(Math.abs(f.vx),chase)}}
 const special=name==='special'||name==='ender'||name==='shadow'||name==='tigerPounce';
 setAction(f,name==='claw'?'claw':name==='bite'?'bite':name==='double'?'double':name==='grab'?'bite':name==='stomp'||name==='tuskCounter'||name==='bearCounter'||name==='riverCounter'||name==='charge'||name==='hippoRush'||name==='grizzlyMaul'||name==='grizzlyPaw'||name==='lionRoar'||name==='lionCounter'||name==='tigerSlip'||name==='crocodileRoll'?'attack_heavy':name==='shadow'?'shadow':name==='ender'?'ender':special?(f.data.id==='badger'?'earthslam':'pounce'):name,moveData.t);
 if(name==='tigerSlip'){f.tigerEvadeT=.19;f.vx=f.dir*390;floatText(f.x,f.y-315,'STRIPED SLIP','#f0a34e');game.shake=Math.max(game.shake,.18);sfx('whiff')}
 if(name==='crocodileRoll'){f.vx=f.dir*585;floatText(f.x,f.y-300,'DEATH ROLL','#79d6bd');game.shake=Math.max(game.shake,.16);sfx('heavy')}
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
const bodyFront=f=>(HB[f.data.id]&&HB[f.data.id].body[0])||85;
function moveAnim(f,mv){const S=SPRITES[f.data.id]||{};if(mv.tigerPounce)return S.special||'special_pounce';if(mv.grab)return'bite';if(mv.stomp||mv.tuskCounter||mv.bearCounter||mv.riverCounter||mv.charge||mv.hippoRush||mv.grizzlyMaul||mv.grizzlyPaw||mv.lionRoar||mv.lionCounter||mv.tigerSlip||mv.crocodileRoll)return'attack_heavy';
 if(mv===MOVES.claw)return S.claw||'attack_light';if(mv===MOVES.bite)return'bite';if(mv===MOVES.ender)return'uppercut';
 if((mv.base||mv)===MOVES.double)return(S.double||['attack_heavy','attack_light'])[f.chain%2];
 if(mv===MOVES.special)return S.special||'special_pounce';
 if(mv===MOVES.shadow)return S.shadow||(S.double||['attack_heavy'])[0];return'attack_light'}
function reachOf(f,anim){const r=HB[f.data.id]&&HB[f.data.id].reach[anim];return Math.max(bodyFront(f)+60,r?r[0]:180)}
// distance between the two fighters' centres at which this strike touches the opponent's body
const hitDist=(f,o,anim,extra)=>reachOf(f,anim)+18+bodyFront(o)*.85+(extra||0);
function resolveHit(i,mv){
 const f=game.fighters[i],o=game.fighters[1-i];
 if(o.data.id==='tiger'&&(o.tigerEvadeT||0)>0)return;
 if(o.down>0||(o.hp<=0&&o.bars<=1))return;
 const d=Math.abs(f.x-o.x),facing=(o.x-f.x)*f.dir>=-15;
 const anim=moveAnim(f,mv),reach=HB[f.data.id]&&HB[f.data.id].reach[anim];
 if(mv.grab&&Math.abs(f.x-o.x)>255)return;
 if(mv.lionRoar){if(!(d<=440&&Math.abs(f.y-o.y)<145))return;}
 else if(!(d<=hitDist(f,o,anim,mv.shadow?40:0)&&Math.abs(f.y-o.y)<130&&facing))return;
 // where the strike lands: the defender's front edge, at the height of the fist/claw/jaws
 const cx=o.x-f.dir*bodyFront(o)*.75,cy=o.y-Math.max(70,Math.min(240,reach?reach[1]:160));
 const comboing=o.stun>0&&f.combo>0;
 // The third connected strike of the snow leopard's triple claw gets a brief signature flourish.
 if(f.data.id==='leopard'&&mv.hits.length===3&&f.hitsDone===3){
  f.leopardFinisher=.58;
  spark(f.x+f.dir*78,f.y-178,'#9cefff',18);
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
 // Blocked: openers are stopped cold (specials chip a little).
 if(o.block&&o.ground&&!comboing){
  if(mv===MOVES.special||mv.shadow){o.hp=Math.max(1,o.hp-(mv.shadow?1:2));}
  o.vx=f.dir*90;if(o.data.id==='leopard')o.leopardCounter=.42;if(o.data.id==='elephant')o.elephantCounterT=.62;if(o.data.id==='hippo')o.hippoCounterT=.68;if(o.data.id==='grizzly')o.grizzlyCounterT=.62;if(o.data.id==='lion')o.lionCounterT=.68;if(o.data.id==='tiger')o.tigerCounterT=.62;f.meter=Math.min(100,f.meter+2);snd('sfx.block','block');spark(o.x-o.dir*20,o.y-170,'#9fd9ff',6);hud();return;
 }
 // Tiger's evasive slip briefly phases through a follow-up before striking back.
 if(mv.tigerSlip){
  game.fx.push({x:f.x-f.dir*34,y:f.y-150,t:0,life:.38,color:'#f0a34e',kind:'ring'});
  game.fx.push({x:cx,y:cy,t:0,life:.44,color:'#ffd18a',kind:'ring'});
  spark(cx,cy,'#f0a34e',22);floatText(cx,cy-82,'STRIPED SLIP','#f0a34e');
  game.shake=Math.max(game.shake,.22);
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
 const chargeArmor=o.data.id==='elephant'&&(o.elephantChargeT||0)>.12;
 const dmg=mv.dmg(f.data.power)*(f.instinct?1.25:1)*(1-(o.data.defense-7)*.03)*(chargeArmor?.38:1)*(game.bane===i+1&&o.data.id==='majic'?1.5:1);
 f.combo=comboing?f.combo+1:1;
 if(mv.potential&&comboing){const real=Math.min(dmg,Math.max(0,o.hp-.5));o.hp-=real;o.potential+=real;}
 else{o.hp-=dmg;}
 const bodyResponse=impactScale(o);
 const impactPush=mv.push*bodyResponse;
 if(isEnder){ // finishers move lighter fighters farther; heavyweight fighters resist displacement
  o.hp-=f.combo*1.2;o.potential=0;o.stun=0;o.down=.9;o.vx=f.dir*impactPush;o.vy=-330*Math.max(.88,Math.min(1.08,bodyResponse));o.ground=false;
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
 if(resultChampId==='leopard'&&!draw_){copy='❄ FROST VICTORY · '+copy;if(soundOn)sfx('frost')}
 $('winner-title').textContent=title;$('winner-copy').textContent=copy;
 if(soundOn&&AU){const champId=resultChampId;
  const line=title==='KING OF THE JUNGLE'?'voice.king-of-the-jungle':flawless?'voice.flawless-victory':(cpu2||net)&&!draw_?(iWon?'voice.you-win':'voice.you-lose'):champId?'voice.'+champId+'-wins':null;
  if(line&&title!=='KING OF THE JUNGLE')setTimeout(()=>AU.now(line),450)}
 const champ=draw_?picks[0]:(p1won?picks[0]:picks[1]);$('winner-portrait').src=portrait(champ.id);$('winner-portrait').alt=champ.name;
 $('winner-portrait').classList.toggle('echo-face',!!(tower&&tower.reveal));
 $('result').classList.toggle('defeat',(cpu2||net)&&!iWon&&!draw_);
 pad.classList.add('hidden');document.body.classList.remove('fighting','paused','touch');cancelAnimationFrame(raf);
 if(tower&&tower.done)champion(tower.player);
 else if(mode==='cpu'&&!tower&&arena.id==='caes-corner'&&p1won&&!draw_)recovery(picks[0],()=>show('result'));
 else show('result');
}
$('tower-next').onclick=()=>{
 if(tower.reveal){tower.reveal=false;tower.boss=true;picks=[tower.player,MAJIC];arena=LAIR;
  return storyCard({dark:1,title:'THE SUMMIT',text:STORY.forgotten.summit},()=>storyCard({dark:1,title:'THE TRUTH',text:STORY.forgotten.reveal},start))}
 picks=[tower.player,tower.ladder[tower.index]];arena=towerArena();
 if(tower.kind==='forgotten')return storyCard({dark:1,title:`ECHO ${tower.index+1}`,text:STORY.forgotten.echoes[tower.index]},start);
 start()};
$('rematch').onclick=()=>{if(mode==='online'){NET.send({t:'again'});return openSelect('online')}if(tower){if(tower.boss&&!tower.done){picks=[tower.player,MAJIC];arena=LAIR;return start()}if(tower.reveal)tower.reveal=false;if(tower.done){tower.done=false;tower.boss=false;tower.speechDone=false;tower.index=0}else if(game&&total(game.fighters[0])>total(game.fighters[1])&&tower.index>0)tower.index--;picks=[tower.player,tower.ladder[tower.index]];arena=towerArena()}start()};
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
 const sc=$('story');sc.classList.toggle('dark',!!o.dark);
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
  return storyCard({dark:1,slow:2600,fig:{id:'majic',anim:'hit_heavy',light:.22,hold:1},eyebrow:'THE JUNGLE TITAN FALLS',title:'MAJIC',text:txt,voice:majicVox(f.id)},()=>{if(!SAVE.get('riseSeen',false)){SAVE.set('riseSeen',true);$('rise-btn').classList.remove('hidden');playRise(()=>champion(f))}else champion(f)})}
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
function menu(){if(mode==='online'&&window.KOTJNet){NET.send({t:'leave'});NET.leave();mode='versus'}clean();tower=null;show('menu');AU&&soundOn&&$('menu').classList.contains('started')&&AU.music('music.menu')}
$('pause').onclick=togglePause;
document.querySelectorAll('.blood-btn').forEach(b=>b.onclick=e=>{e.stopPropagation();setBlood((blood+1)%3)});setBlood(blood);
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
 const still=new Image();let useStill=false;still.onload=()=>{useStill=true};still.src=`assets/ui/recovery/${f.id}.webp?v=7.8`;
 lyingPose(f.id,body=>{const t0=performance.now();
  const frame=t=>{if(done)return;const T=(t-t0)/1000;
   const W=cv.clientWidth||1100,H=cv.clientHeight||620,dpr=Math.min(2,devicePixelRatio||1);if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
   c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
   if(bg&&bg.complete){const s=Math.max(W/bg.width,H/bg.height);c.drawImage(bg,(W-bg.width*s)/2,(H-bg.height*s)/2,bg.width*s,bg.height*s)}
   c.fillStyle='rgba(8,4,2,.55)';c.fillRect(0,0,W,H);
   const vg=c.createRadialGradient(W/2,H*.62,H*.1,W/2,H*.62,H*.9);vg.addColorStop(0,'rgba(255,190,110,.18)');vg.addColorStop(1,'rgba(0,0,0,.6)');c.fillStyle=vg;c.fillRect(0,0,W,H);
   if(useStill){ // hand-drawn scene: fighter face-down under a towel, trainer working the shoulders
    const z=1+Math.min(T,7)*.007,sw=Math.min(W*.86,H*.62*still.width/still.height,still.width*1.6)*z,sh=sw*still.height/still.width,sx=(W-sw)/2,sy=H*.97-sh;
    c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.ellipse(W/2,sy+sh*.99,sw*.46,sh*.05,0,0,7);c.fill();
    const br=1+Math.sin(T*2.1)*.006;c.drawImage(still,sx,sy+sh*(1-br),sw,sh*br);
    const p=.5+.5*Math.sin(T*5),gx=sx+sw*.66,gy=sy+sh*.36,r=sh*.26;c.save();c.globalCompositeOperation='lighter';
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
const FK=['x','y','tigerCounterT','tigerEvadeT','vx','vy','moveVel','comboLinked','frostImpact','leopardFinisher','leopardDashT','elephantImpact','elephantSlamArmed','elephantStompT','elephantCounterT','elephantChargeT','hippoRushT','lionManeFinisher','lionCounterT','tigerPounceT','dir','hp','bars','potential','block','blockTime','attack','stun','walk','move','action','actionTime','actionTotal','hitFlash','hitAnimTime','hitHeavy','landImpact','combo','meter','lockout','breakWindow','instinct','down','koTime','chain','winT','ground','elapsed','sec','secT','secPrev'];
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
 snake:{s:0.34,anims:{"idle":[5,132,100,143,279],"walk_forward":[6,99,98,156,276],"walk_back":[6,99,98,156,276],"run":[4,155,102,282,286],"crouch":[4,121,91,170,252],"jump":[5,171,91,275,252],"block":[4,157,96,233,265],"attack_light":[7,191,100,227,282],"bite":[5,162,98,170,279],"attack_heavy":[4,218,88,326,238],"uppercut":[5,180,86,309,233],"special_pounce":[4,155,84,195,235],"special_b":[6,147,82,187,231],"ultra_move":[7,357,117,366,320],"hit_light":[5,105,86,136,235],"hit_heavy":[6,186,86,272,235],"knockdown_getup":[8,186,85,272,231],"victory":[11,203,126,321,354],"defeat":[6,186,86,272,235],"special_c":[5,203,80,244,208],"special_d":[4,212,82,273,211]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[4, 5, 6, 7]],ko:['hit_heavy',5]},
 eagle:{s:0.34,anims:{"idle":[5,114,112,159,315],"walk_forward":[5,131,108,179,304],"walk_back":[5,131,108,179,304],"run":[4,146,112,209,315],"crouch":[4,134,106,212,282],"jump":[5,148,106,178,282],"block":[4,159,107,227,283],"attack_light":[6,195,120,261,322],"bite":[5,232,112,320,301],"attack_heavy":[4,176,116,270,294],"uppercut":[5,211,119,330,301],"special_pounce":[6,179,127,201,343],"special_b":[4,259,120,416,326],"ultra_move":[7,378,125,413,340],"hit_light":[5,133,109,145,280],"hit_heavy":[6,168,107,211,273],"knockdown_getup":[9,168,111,211,287],"victory":[12,180,132,262,372],"defeat":[6,168,107,211,273]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[4, 5, 6, 7, 8]],ko:['hit_heavy',5]},
 stag:{s:0.34,anims:{"idle":[5,110,106,157,300],"walk_forward":[5,137,106,241,300],"walk_back":[5,137,106,241,300],"run":[4,184,106,287,300],"crouch":[4,146,98,183,279],"jump":[5,147,98,195,279],"block":[4,154,101,166,286],"attack_light":[6,199,101,325,276],"bite":[5,227,101,299,276],"attack_heavy":[4,275,89,296,254],"uppercut":[5,218,91,369,258],"special_pounce":[4,278,83,466,235],"special_b":[5,231,84,321,237],"ultra_move":[7,388,120,511,329],"hit_light":[4,121,84,143,226],"hit_heavy":[6,161,82,177,223],"knockdown_getup":[9,175,87,219,237],"victory":[12,191,147,229,406],"defeat":[6,161,82,177,223],"special_c":[5,162,82,214,230],"special_d":[5,214,79,300,223]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[4, 5, 6, 7, 8]],ko:['hit_heavy',5]},
 majic:{s:0.34,anims:{"idle":[4,254,144,384,399],"walk_forward":[4,277,144,449,396],"walk_back":[4,277,144,449,396],"run":[4,277,144,449,396],"dash":[3,298,134,528,371],"crouch":[3,254,160,411,447],"jump":[5,295,134,528,371],"block":[3,122,122,135,335],"attack_light":[4,269,131,380,374],"attack_heavy":[4,229,160,322,451],"bite":[4,269,131,297,374],"uppercut":[4,227,160,316,451],"special_pounce":[4,298,134,479,371],"special_b":[6,354,99,555,271],"special_c":[5,247,91,286,257],"special_d":[4,187,97,299,257],"ultra_move":[8,257,161,374,451],"hit_light":[4,192,92,301,260],"hit_heavy":[6,247,94,355,257],"knockdown_getup":[10,247,119,355,330],"victory":[7,273,159,465,444],"defeat":[5,247,94,355,257]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','special_c','special_d','attack_heavy'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[6, 7, 8, 9]],ko:['hit_heavy',5]},
 badger:{s:0.34,anims:{"idle":[9,68,73,99,215],"walk_forward":[8,73,71,88,208],"walk_back":[6,52,72,72,211],"run":[7,115,69,191,203],"crouch":[4,74,60,101,176],"block":[6,61,70,88,206],"attack_light":[7,88,70,122,206],"attack_heavy":[8,86,76,98,223],"claw_swipe":[6,99,70,122,207],"bite":[5,102,72,120,211],"uppercut":[8,75,79,94,233],"jump":[7,64,71,79,208],"pounce":[8,96,60,124,176],"special_earth_slam":[7,81,61,110,179],"shadow_rampage":[10,70,61,98,179],"hit_light":[6,84,78,111,228],"hit_heavy":[7,87,76,128,223],"knockdown_getup":[8,95,76,140,225],"victory":[7,87,83,120,245],"defeat":[6,82,67,120,196]},
  claw:'claw_swipe',double:['attack_heavy','claw_swipe'],special:'special_earth_slam',shadow:'shadow_rampage',ultra:['attack_light','attack_heavy','uppercut','claw_swipe'],
  fall:['hit_heavy',[0,1,2,3,4]],getup:['knockdown_getup',[4,5,6,7]],ko:['hit_heavy',4]},
 crocodile:{s:0.34,anims:{"idle":[9,95,87,128,256],"walk_forward":[7,131,85,181,251],"walk_back":[6,120,85,169,251],"run":[7,149,79,175,233],"block":[6,92,80,134,236],"attack_light":[7,117,86,158,254],"attack_heavy":[6,157,85,207,251],"bite":[6,145,77,181,227],"uppercut":[7,124,79,148,233],"jump":[7,118,74,145,218],"special_pounce":[6,175,76,209,224],"hit_light":[6,106,77,161,227],"hit_heavy":[8,118,76,174,224],"knockdown_getup":[14,133,68,196,200],"victory":[8,86,103,136,304],"defeat":[7,128,68,188,201]},
  double:['bite','attack_heavy'],special:'special_pounce',shadow:null,ultra:['bite','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 elephant:{s:0.34,anims:{"idle":[9,92,112,128,330],"walk_forward":[7,184,114,233,337],"walk_back":[6,166,107,205,314],"run":[7,230,102,306,299],"block":[6,109,101,159,296],"attack_light":[7,178,109,247,321],"attack_heavy":[6,194,107,258,314],"bite":[6,221,97,247,285],"uppercut":[7,204,99,265,292],"jump":[7,187,94,248,277],"special_pounce":[6,261,98,316,288],"hit_light":[6,133,98,206,288],"hit_heavy":[8,150,98,221,288],"knockdown_getup":[14,198,87,252,256],"victory":[8,113,132,168,387],"defeat":[7,186,89,314,263]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','attack_heavy','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 grizzly:{s:0.34,anims:{"idle":[9,86,104,127,307],"walk_forward":[8,118,98,157,287],"walk_back":[6,104,98,148,287],"run":[7,141,92,164,271],"block":[6,145,94,205,277],"attack_light":[7,132,98,169,287],"attack_heavy":[6,177,96,271,284],"bite":[6,160,86,191,254],"uppercut":[7,144,88,170,257],"jump":[7,116,84,151,248],"special_pounce":[6,173,85,205,251],"hit_light":[6,170,90,260,264],"hit_heavy":[8,161,91,273,267],"knockdown_getup":[14,176,79,230,231],"victory":[8,112,120,173,353],"defeat":[7,179,84,238,248]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','attack_heavy','bite','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 hippo:{s:0.34,anims:{"idle":[9,97,107,142,316],"walk_forward":[8,116,103,159,304],"walk_back":[6,147,110,184,322],"run":[7,156,96,180,283],"block":[6,142,97,209,286],"attack_light":[7,131,99,164,290],"attack_heavy":[6,167,100,226,293],"bite":[6,181,88,203,259],"uppercut":[7,156,91,161,266],"jump":[7,125,87,162,255],"special_pounce":[6,176,91,201,266],"hit_light":[6,185,95,281,279],"hit_heavy":[8,153,94,221,276],"knockdown_getup":[14,184,80,233,235],"victory":[8,120,124,184,366],"defeat":[7,133,73,195,214]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','attack_heavy','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 hyena:{s:0.34,anims:{"idle":[9,69,82,102,240],"walk_forward":[8,97,81,126,239],"walk_back":[6,77,89,99,262],"run":[7,162,81,142,237],"block":[6,90,81,131,239],"attack_light":[7,108,84,144,248],"attack_heavy":[6,154,84,188,248],"bite":[6,140,79,184,234],"uppercut":[7,118,79,139,231],"jump":[7,109,70,155,205],"special_pounce":[6,146,72,190,211],"hit_light":[6,101,77,156,228],"hit_heavy":[8,112,78,164,228],"knockdown_getup":[14,122,68,180,200],"victory":[8,89,104,138,305],"defeat":[7,115,74,170,219]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['bite','attack_heavy','uppercut','attack_light'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 jaguar:{s:0.34,anims:{"idle":[9,82,84,128,246],"walk_forward":[8,107,83,150,244],"walk_back":[6,81,84,104,246],"run":[7,163,80,184,235],"block":[6,86,81,127,238],"attack_light":[7,115,84,150,246],"attack_heavy":[6,137,84,174,246],"bite":[6,144,77,148,226],"uppercut":[7,114,79,139,232],"jump":[7,138,89,180,261],"special_pounce":[6,160,71,187,209],"hit_light":[6,105,78,155,229],"hit_heavy":[8,113,77,166,226],"knockdown_getup":[14,130,67,195,197],"victory":[8,95,104,156,305],"defeat":[7,120,74,177,218]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','uppercut','attack_light'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 leopard:{s:0.34,anims:{"idle":[5,95,98,145,275],"walk_forward":[5,86,98,106,275],"walk_back":[5,93,98,137,275],"run":[6,140,82,251,214],"dash":[4,169,78,229,214],"crouch":[3,104,81,150,220],"jump":[6,108,81,144,220],"block":[3,76,81,123,220],"attack_light":[6,109,78,106,208],"attack_heavy":[5,118,76,148,204],"bite":[5,133,73,195,195],"uppercut":[5,119,75,178,201],"special_pounce":[5,184,73,281,195],"special_b":[6,114,88,137,230],"special_c":[5,163,77,271,198],"special_d":[14,133,76,154,201],"ultra_move":[5,185,90,270,230],"hit_light":[3,109,87,189,224],"hit_heavy":[9,175,94,259,233],"knockdown_getup":[11,176,107,259,272],"victory":[5,140,191,196,527],"defeat":[9,175,94,259,233]},
  double:['attack_heavy','bite'],special:'special_pounce',shadow:'special_b',ultra:['ultra_move','special_d','attack_heavy','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[6,7,8,9,10]],ko:['hit_heavy',8]},
 lion:{s:0.34,anims:{"idle":[9,82,89,124,263],"walk_forward":[8,105,86,141,254],"walk_back":[6,89,86,115,254],"run":[7,118,81,150,239],"block":[6,98,83,159,245],"attack_light":[7,119,87,148,257],"attack_heavy":[6,147,87,182,257],"bite":[6,165,79,181,233],"uppercut":[7,140,80,140,236],"jump":[7,101,76,134,224],"special_pounce":[6,199,77,224,227],"hit_light":[6,101,81,146,239],"hit_heavy":[8,116,80,171,236],"knockdown_getup":[14,134,67,197,198],"victory":[8,88,109,137,322],"defeat":[7,149,76,236,224]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['attack_heavy','bite','uppercut','attack_light'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 tiger:{s:0.34,anims:{"idle":[9,108,91,157,269],"walk_forward":[8,116,86,139,254],"walk_back":[6,101,86,140,254],"run":[7,137,79,168,233],"block":[6,84,83,122,245],"attack_light":[7,142,86,196,254],"attack_heavy":[6,177,86,199,254],"bite":[6,147,78,176,230],"uppercut":[7,145,78,206,230],"jump":[7,109,74,151,218],"special_pounce":[6,165,76,225,224],"hit_light":[6,110,78,161,230],"hit_heavy":[8,122,78,180,230],"knockdown_getup":[14,131,70,192,206],"victory":[8,133,108,216,318],"defeat":[7,120,75,177,221]},
  double:['attack_heavy','attack_light'],special:'special_pounce',shadow:null,ultra:['attack_heavy','attack_light','attack_heavy','uppercut'],
  fall:['hit_heavy',[0,1,2,3,4,5]],getup:['knockdown_getup',[2,3,4,5,6]],ko:['hit_heavy',6]},
 wolf:{s:0.34,anims:{"idle":[10,73,85,107,249],"walk_forward":[9,85,77,114,227],"walk_back":[7,78,78,109,230],"run":[8,160,79,171,233],"block":[6,89,83,127,245],"attack_light":[7,120,83,154,245],"attack_heavy":[6,150,83,196,245],"bite":[6,138,78,174,229],"uppercut":[7,134,81,210,239],"jump":[7,110,77,148,227],"special_pounce":[6,224,76,259,223],"hit_light":[6,99,84,140,248],"hit_heavy":[8,114,84,167,248],"knockdown_getup":[14,128,75,190,221],"victory":[8,124,112,182,330],"defeat":[7,129,81,189,239]},
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
 // A restrained adaptive lens: tighten slightly when fighters close in,
 // widen when they spread out, and ease rather than snapping between scales.
 const want=clamp(1.02+(420-gap)/5200,.96,1.045);
 const kz=1-Math.pow(.94,frameDt*60),kp=1-Math.pow(.88,frameDt*60);
 cam.z+=(want-cam.z)*kz;vh/=cam.z;
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
 tx=Math.max(-60,Math.min(1160-vw,tx));ty=Math.max(-30,Math.min(550-vh,ty));
 if(cam.snap){cam.x=tx;cam.y=ty;cam.snap=false}else{cam.x+=(tx-cam.x)*cameraEase;cam.y+=(ty-cam.y)*cameraEase}
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
 // Subtle atmospheric depth: slow drifting motes at staggered depths sit
 // between the arena artwork and fighters. They remain cosmetic and cheap.
 {
  const atmosphere=arena.id==='royal-colosseum'?'#b58cff':arena.id==='frozen-kingdom'?'#c9efff':'#e7c78a';
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
 const sizeScale={badger:.70,wolf:.82,hyena:.80,leopard:.86,jaguar:.86,crocodile:.90,lion:.88,tiger:.86,grizzly:.98,hippo:1.00,elephant:1.08,majic:1.4,snake:.86,eagle:.9,stag:.92}[f.data.id]||.84;
 if(!ghost){
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
 const S=SPRITES[f.data.id],A=S.anims,now=performance.now()/1000,p=phase(f),visualP=f.data.id==='leopard'&&['claw','double','bite'].includes(f.action)?Math.min(.999,p*1.12):p,ap=visualP*visualP*(3-2*visualP);let anim='idle',fr=0;
 const seq=(list,t)=>{const k=list[Math.min(list.length-1,Math.floor(t*list.length))];return k};
 switch(f.action){
  case'walk':{const fwd=Math.sign(f.move||0)===f.dir;anim=fwd?'walk_forward':'walk_back';fr=Math.floor(f.walk*3.2);break}
  case'block':anim='block';fr=Math.min(3,Math.floor(f.blockTime*20));break;
  case'claw':anim=S.claw&&A[S.claw]?S.claw:'attack_light';fr=Math.floor(ap*A[anim][0]);break;
  case'double':anim=S.double[f.chain%2];fr=1+Math.floor(ap*(A[anim][0]-1));break;
  case'attack_heavy':anim='attack_heavy';fr=Math.floor(ap*A.attack_heavy[0]);break;
  case'bite':anim='bite';fr=Math.floor(ap*A.bite[0]);break;
  case'earthslam':case'pounce':anim=S.special;fr=Math.floor(ap*A[anim][0]);break;
  case'ender':anim='uppercut';fr=Math.floor(ap*A.uppercut[0]);break;
  case'shadow':if(S.shadow){anim=S.shadow;fr=Math.floor(ap*A[anim][0])}else{anim=S.double[Math.floor(p*5)%2];fr=Math.floor(p*5*A[anim][0])%A[anim][0]}break;
  case'ultraseq':anim=S.ultra[Math.floor(now*6)%S.ultra.length];fr=Math.floor(now*36);break;
  case'jump':{anim='jump';const n=A.jump[0];fr=Math.round((Math.max(-560,Math.min(560,f.vy))+560)/1120*(n-3))+1;break}
  case'hit':{
   anim=f.hitHeavy&&A.hit_heavy?'hit_heavy':'hit_light';
   const count=A[anim][0];
   fr=Math.min(count-1,Math.floor((f.hitAnimTime||0)*Math.max(8,count*5)));
   break;
  }
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
 if(f.action==='earthslam'&&ap>.5){c.save();c.globalAlpha=.8*(1-ap);c.strokeStyle='#f4bd43';c.lineWidth=7;const r=40+ap*170;c.beginPath();c.ellipse(0,-6-f.y,r,r*.2,0,0,Math.PI*2);c.stroke();c.restore();}
 const impactTint=FIGHTER_IMPACT[f.data.id]||'#fff0b0';
 if(f.hitFlash>0){
  c.filter=f.data.echo
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
  const forward=(f.action==='bite'?.12:f.action==='ender'?.16:f.action==='earthslam'?.08:.105)*(leopardSharp?1.22:1);
  const lean=-.035*anticipation+forward*drive-.035*recovery;
  const stretch=1+(.055*(leopardSharp?1.18:1))*drive-.025*anticipation-.025*recovery;
  const squash=1-.035*drive+.025*anticipation+.025*recovery;
  c.save();
  c.translate(0,-145+drive*4-anticipation*2);
  c.rotate(lean);
  c.scale(stretch,squash);
  c.translate(0,145);
  c.drawImage(img,fr*fw,0,fw,fh,-px,-py+6,fw/sc,fh/sc);
  c.restore();
 }else{
  c.drawImage(img,fr*fw,0,fw,fh,-px,-py+6,fw/sc,fh/sc);
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

addUnlocked();if(secretUnlocked()&&!roster.includes(MAJIC))roster.push(MAJIC);
forgottenMenu();
render();show('menu');updateGuide();
addEventListener('resize',()=>{cam.snap=true});addEventListener('orientationchange',()=>{cam.snap=true;setTimeout(()=>{cam.snap=true},300)});
window.__kotj={rise:()=>playRise(()=>show('menu')),get game(){return game},get tower(){return tower},arena:(i)=>{arena=ARENAS[i]},start:(m,a,b)=>{mode=m;picks=[roster.find(r=>r.id===a),roster.find(r=>r.id===b)];if(m==='tower'){tower={kind:'tower',player:picks[0],ladder:roster.filter(f=>BASE_IDS.includes(f.id)&&f.id!==a),index:0};picks[1]=tower.ladder[0];arena=towerArena()}start()},kb,sound:v=>{soundOn=v},finish:()=>finish(),towerFinal:()=>{tower.index=tower.ladder.length-1;picks=[tower.player,tower.ladder[tower.index]];arena=towerArena();start()}};
})();
