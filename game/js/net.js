'use strict';
/* King of the Jungle: online play.
   Peer-to-peer WebRTC between two browsers. The free public PeerJS signaling server only helps
   the two players find each other; the fight itself goes directly device to device.
   Two data channels: "ctl" (reliable: picks, start, results) and "rt" (fast: inputs and fight state). */
window.KOTJNet=(()=>{
 const CFG={host:'0.peerjs.com',port:443,secure:true,key:'peerjs',path:'/'};
 const over=new URLSearchParams(location.search).get('peer');            // testing: ?peer=localhost:9000
 if(over){const [h,p]=over.split(':');CFG.host=h;CFG.port=+p||9000;CFG.secure=false}
 const ICE=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']},{urls:'stun:global.stun.twilio.com:3478'}];
 /* Relay (TURN) for networks where the two devices can't reach each other directly
    (same Wi-Fi without router "hairpin" support, phone carriers, school/work Wi-Fi).
    Free Metered Open Relay account: put the app name and API key here. */
 const TURN={app:'',key:''};
 let relay=null;
 function loadRelay(){if(relay||!TURN.app||!TURN.key)return Promise.resolve(relay||[]);
  return fetch(`https://${TURN.app}.metered.live/api/v1/turn/credentials?apiKey=${TURN.key}`).then(r=>r.ok?r.json():[]).then(j=>relay=Array.isArray(j)?j:[]).catch(()=>[])}
 loadRelay();
 const PREFIX='kotj-jh-';
 const WORDS=['LION','TIGER','WOLF','BEAR','HIPPO','JAGUAR','HYENA','CROC','BADGER','RHINO','COBRA','EAGLE'];
 let ws=null,hb=0,pc=null,ctl=null,rt=null,peerId=null,role=null,ready=false,pend=[],timer=0,closed=true;
 const H={};const emit=(n,...a)=>{try{H[n]&&H[n](...a)}catch(e){console.error(e)}};
 const rnd=n=>Math.floor(Math.random()*n);
 const makeCode=()=>WORDS[rnd(WORDS.length)]+'-'+(100+rnd(900));
 function cleanCode(s){s=String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');const m=s.match(/^([A-Z]+)(\d+)$/);return m?m[1]+'-'+m[2]:''}
 function sig(type,payload){if(ws&&ws.readyState===1)ws.send(JSON.stringify({type,payload,dst:peerId}))}
 function connectSignal(id,onOpen){
  const tok=Math.random().toString(36).slice(2);
  ws=new WebSocket(`${CFG.secure?'wss':'ws'}://${CFG.host}:${CFG.port}${CFG.path.replace(/\/$/,'')}/peerjs?key=${CFG.key}&id=${encodeURIComponent(id)}&token=${tok}&version=1.5.4`);
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}
   switch(m.type){
    case'OPEN':onOpen();break;
    case'ID-TAKEN':emit('taken');break;
    case'ERROR':fail('server');break;
    case'EXPIRE':if(role==='guest'&&!ready)fail('nomatch');break;
    case'LEAVE':if(m.src===peerId&&ready)lost();break;
    case'OFFER':onOffer(m);break;
    case'ANSWER':if(pc&&m.src===peerId)pc.setRemoteDescription(m.payload.sdp).then(flush).catch(()=>fail('connect'));break;
    case'CANDIDATE':if(m.src===peerId&&m.payload&&m.payload.candidate){if(pc&&pc.remoteDescription)pc.addIceCandidate(m.payload.candidate).catch(()=>{});else pend.push(m.payload.candidate)}break;
   }};
  ws.onerror=()=>{if(!ready)fail('server')};
  ws.onclose=()=>{clearInterval(hb)};
  clearInterval(hb);hb=setInterval(()=>{if(ws&&ws.readyState===1)ws.send('{"type":"HEARTBEAT"}')},5000);
 }
 function flush(){const p=pend;pend=[];p.forEach(c=>pc.addIceCandidate(c).catch(()=>{}))}
 function makePC(){
  pc=new RTCPeerConnection({iceServers:ICE.concat(relay||[])});
  pc.onicecandidate=e=>{if(e.candidate)sig('CANDIDATE',{candidate:e.candidate})};
  pc.onconnectionstatechange=()=>{const s=pc&&pc.connectionState;if(s==='failed'){ready?lost():fail('connect')}};
  pc.ondatachannel=e=>wire(e.channel);
 }
 function wire(ch){
  if(ch.label==='rt')rt=ch;else ctl=ch;
  ch.onopen=check;ch.onclose=()=>{if(ready)lost()};
  ch.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}emit(ch.label==='rt'?'fast':'msg',m)};
  check();
 }
 function check(){if(!ready&&ctl&&rt&&ctl.readyState==='open'&&rt.readyState==='open'){ready=true;clearTimeout(timer);emit('connected',role)}}
 async function onOffer(m){
  if(role!=='host'||peerId&&peerId!==m.src)return;                       // one opponent per match
  peerId=m.src;await loadRelay();makePC();
  try{await pc.setRemoteDescription(m.payload.sdp);flush();const a=await pc.createAnswer();await pc.setLocalDescription(a);sig('ANSWER',{sdp:pc.localDescription});emit('joining')}
  catch(_){fail('connect')}
 }
 function fail(why){if(closed)return;const r=role;leave();emit('error',why,r)}
 function lost(){if(closed)return;leave();emit('lost')}
 function reset(){closed=false;ready=false;pend=[];peerId=null;ctl=rt=null;clearTimeout(timer)}
 function host(){
  leave();reset();role='host';const code=makeCode();
  H.taken=()=>{ws&&ws.close();host()};                                   // code already used by someone: roll a new one
  connectSignal(PREFIX+code,()=>emit('hosting',code));
 }
 function join(raw){
  const code=cleanCode(raw);if(!code){emit('error','badcode','guest');return false}
  leave();reset();role='guest';
  connectSignal(PREFIX+'g-'+Math.random().toString(36).slice(2,10),async()=>{
   await loadRelay();peerId=PREFIX+code;makePC();
   wire(pc.createDataChannel('ctl',{ordered:true}));
   wire(pc.createDataChannel('rt',{ordered:false,maxRetransmits:0}));
   try{const o=await pc.createOffer();await pc.setLocalDescription(o);sig('OFFER',{sdp:pc.localDescription})}catch(_){fail('connect')}
  });
  timer=setTimeout(()=>{if(!ready)fail('timeout')},30000);
  return code;
 }
 function send(m){if(ctl&&ctl.readyState==='open')ctl.send(JSON.stringify(m))}
 function fast(m){if(rt&&rt.readyState==='open'&&rt.bufferedAmount<65536)rt.send(JSON.stringify(m))}
 function leave(){
  closed=true;ready=false;clearTimeout(timer);clearInterval(hb);
  try{ctl&&ctl.close()}catch(_){}try{rt&&rt.close()}catch(_){}try{pc&&pc.close()}catch(_){}
  try{if(ws){if(ws.readyState===1)ws.send('{"type":"LEAVE"}');ws.close()}}catch(_){}
  ws=pc=ctl=rt=null;peerId=null;role=null;
 }
 return{host,join,send,fast,leave,cleanCode,on:(n,f)=>{H[n]=f},get ready(){return ready},get role(){return role}};
})();
