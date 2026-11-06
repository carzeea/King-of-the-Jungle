'use strict';
/* King of the Jungle – sound engine.
   Plays the clips listed in audio/audio-manifest.json.
   Each clip loads from its labeled local file (audio/<folder>/<name>); if that file is missing,
   it streams the clip's source link instead. Sound effects use Web Audio for low latency
   and overlapping hits; music and long cues use a single streaming <audio> element. */
(()=>{
 const BASE='audio/';
 let clips={},ctx=null,enabled=true,master=null,musicEl=null,musicKey=null,musicVol=.42,ready=null;
 const buffers={},loading={};
 const urlFor=(c,local)=>local?BASE+c.file:c.source;
 function ac(){if(!ctx){try{ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.connect(ctx.destination)}catch(_){}}
  if(ctx&&ctx.state==='suspended')ctx.resume();return ctx}
 ready=fetch(BASE+'audio-manifest.json').then(r=>r.json()).then(m=>{clips=m.clips||{}}).catch(()=>{clips={}});
 // Decode a short clip into a buffer (local file first, then source link).
 async function load(key){
  if(buffers[key])return buffers[key];if(loading[key])return loading[key];
  const c=clips[key];if(!c||!ac())return null;
  loading[key]=(async()=>{for(const local of [true,false]){try{const r=await fetch(urlFor(c,local));if(!r.ok)continue;
    const b=await ctx.decodeAudioData(await r.arrayBuffer());return buffers[key]=b}catch(_){}}return null})();
  return loading[key];
 }
 async function sfx(key,vol=1,rate=1){
  if(!enabled)return false;await ready;const c=clips[key];if(!c)return false;const b=await load(key);if(!b||!ctx)return false;
  const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;s.playbackRate.value=rate;g.gain.value=(c.volume??1)*vol;s.connect(g).connect(master);s.start();return true;
 }
 // Long clips (music, announcer, Shadow/Ultra cues) stream through <audio>.
 function stream(key,{loop=false,vol=1}={}){
  const c=clips[key];if(!c)return null;const a=new Audio();a.preload='auto';a.loop=loop;a.volume=Math.min(1,(c.volume??1)*vol);
  let triedSource=false;a.onerror=()=>{if(!triedSource){triedSource=true;a.src=urlFor(c,false);a.play().catch(()=>{})}};
  a.src=urlFor(c,true);return a;
 }
 const cues=new Set();
 async function cue(key,vol=1){if(!enabled)return;await ready;const a=stream(key,{vol});if(!a)return;cues.add(a);a.onended=()=>cues.delete(a);a.play().catch(()=>{})}
 function fade(a,to,ms,done){if(!a)return;const from=a.volume,t0=performance.now();(function step(t){const k=Math.min(1,(t-t0)/ms);a.volume=Math.max(0,Math.min(1,from+(to-from)*k));if(k<1)requestAnimationFrame(step);else done&&done()})(t0)}
 async function music(key){
  await ready;if(musicKey===key&&musicEl){if(enabled&&musicEl.paused)musicEl.play().catch(()=>{});return}
  const old=musicEl;if(old)fade(old,0,500,()=>old.pause());
  musicKey=key;musicEl=null;if(!clips[key])return;
  const a=stream(key,{loop:true});musicVol=a.volume;a.volume=0;musicEl=a;
  if(enabled){a.play().then(()=>fade(a,musicVol,800)).catch(()=>{})}
 }
 window.KOTJAudio={
  ready,unlock:ac,sfx,cue,music,
  announce(){return cue('announcer.fight')},
  shadow(id){return cue('shadow.'+id)},
  ultra(id){return cue('ultra.'+id)},
  pauseMusic(p){if(!musicEl)return;if(p)musicEl.pause();else if(enabled)musicEl.play().catch(()=>{})},
  duckMusic(level=.35){if(musicEl&&enabled)fade(musicEl,musicVol*level,300)},
  stopMusic(){if(musicEl){const m=musicEl;fade(m,0,400,()=>m.pause())}musicEl=null;musicKey=null},
  setEnabled(v){enabled=!!v;if(!enabled){if(musicEl)musicEl.pause();cues.forEach(a=>a.pause());cues.clear()}else if(musicEl)musicEl.play().catch(()=>{})},
  preload(keys){ready.then(()=>{ac();keys.forEach(k=>clips[k]&&load(k))})},
  // Play right now if the clip is already decoded; otherwise start loading it and report false.
  now(key,vol=1,rate=1){if(!enabled||!clips[key])return false;const b=buffers[key];if(!b||!ctx){load(key);return false}
   const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;s.playbackRate.value=rate;g.gain.value=(clips[key].volume??1)*vol;s.connect(g).connect(master);s.start();return true},
  has:k=>!!clips[k],
  get clips(){return clips}
 };
})();
