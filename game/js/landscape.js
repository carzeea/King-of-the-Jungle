/* V2: full screen from the very first tap / click / key on every platform that allows it.
   Phones & tablets also play landscape-only: Android locks sideways; iPhone (Safari can't lock or go
   full screen from a web page) gets a "turn sideways" screen and an "Add to Home Screen" tip. */
(function(){
 const el=document.documentElement,d=document;
 const touch=matchMedia('(pointer:coarse)').matches||'ontouchstart'in window;
 const iOS=/iphone|ipod/i.test(navigator.userAgent)||(/macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1&&!el.requestFullscreen&&!el.webkitRequestFullscreen);
 const standalone=matchMedia('(display-mode:fullscreen),(display-mode:standalone)').matches||navigator.standalone===true;
 const rf=el.requestFullscreen||el.webkitRequestFullscreen;
 const isFull=()=>!!(d.fullscreenElement||d.webkitFullscreenElement);
 if(touch)el.classList.add('kotj-touch');
 let wasFull=false,optOut=false; // once a player leaves full screen on purpose we stop pulling them back in
 async function goFull(){
  if(standalone||optOut||isFull()||!rf)return;
  try{await rf.call(el,{navigationUI:'hide'})}catch(_){return}
  try{if(touch&&screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch(_){}
  // keep Esc for the game (pause/back) instead of leaving full screen; holding Esc still exits (Chrome/Edge)
  try{if(!touch&&navigator.keyboard&&navigator.keyboard.lock)await navigator.keyboard.lock(['Escape'])}catch(_){}
  setTimeout(()=>dispatchEvent(new Event('resize')),350)}
 function onFs(){const f=isFull();if(wasFull&&!f&&!touch)optOut=true;wasFull=f;if(!f){try{navigator.keyboard&&navigator.keyboard.unlock&&navigator.keyboard.unlock()}catch(_){}}
  setTimeout(()=>dispatchEvent(new Event('resize')),200)}
 d.addEventListener('fullscreenchange',onFs);d.addEventListener('webkitfullscreenchange',onFs);
 // the game's own FULL SCREEN buttons always work; using them re-enables or disables the auto behaviour
 const own=t=>t&&t.closest&&t.closest('#fullscreen,#so-full');
 // mouse: pointerdown counts as a user gesture; touch: only the finger lifting (pointerup/touchend) does
 addEventListener('pointerdown',e=>{if(own(e.target)){optOut=isFull();return}if(e.pointerType==='mouse')goFull()},{capture:true});
 addEventListener('pointerup',e=>{if(!own(e.target)&&e.pointerType!=='mouse')goFull()},{capture:true});
 addEventListener('touchend',e=>{if(!own(e.target))goFull()},{capture:true,passive:true});
 addEventListener('keydown',e=>{if(e.key==='F11')return;if(e.key==='Escape'&&isFull())return;goFull()},{capture:true});
 addEventListener('click',e=>{if(own(e.target))setTimeout(()=>{optOut=!isFull()},400)},{capture:true});

 // splash hint text matches the device
 const sh=d.querySelector('#splash .splash-hint');if(sh)sh.textContent=touch?'TAP TO CONTINUE':'CLICK OR PRESS ANY KEY / BUTTON';

 // iPhone: one-time tip for true full screen
 if(iOS&&!standalone&&!rf){const tip=d.createElement('div');tip.id='ios-tip';
  tip.innerHTML='<b>FULL SCREEN ON IPHONE</b><span>Tap <i>Share</i> → <i>Add to Home Screen</i>, then open King of the Jungle from your home screen.</span><button aria-label="Close">✕</button>';
  d.body.appendChild(tip);let shown=false;try{shown=sessionStorage.getItem('kotj.iostip')}catch(_){}
  const hide=()=>{tip.classList.remove('on');try{sessionStorage.setItem('kotj.iostip','1')}catch(_){}};
  tip.querySelector('button').onclick=hide;
  if(!shown)setTimeout(()=>{tip.classList.add('on');setTimeout(hide,9000)},2500)}

 // controller players on a computer: browsers don't allow a controller button to open full screen, so show how
 if(!touch&&rf){const t=d.createElement('div');t.id='fs-tip';t.textContent='CLICK OR PRESS ANY KEY FOR FULL SCREEN';d.body.appendChild(t);
  const sp=d.getElementById('splash');let tries=0;const iv=setInterval(()=>{tries++;if(isFull()||optOut||tries>40){clearInterval(iv);t.classList.remove('on');return}
   if(!d.getElementById('splash')||(sp&&sp.classList.contains('out'))){if(!t.classList.contains('on')){t.classList.add('on');setTimeout(()=>t.classList.remove('on'),6000)}clearInterval(iv)}},500);
  d.addEventListener('fullscreenchange',()=>t.classList.remove('on'))}

 if(!touch)return;
 const ov=d.createElement('div');ov.id='rotate-lock';
 ov.innerHTML='<div class="rl-box"><div class="rl-phone"><i></i></div><b>TURN YOUR PHONE SIDEWAYS</b><span>King of the Jungle plays in landscape</span>'+(rf?'<small>Tap here to go full screen</small>':'')+'</div>';
 d.body.appendChild(ov);
 const mq=matchMedia('(orientation:portrait)');
 function check(){const p=mq.matches;el.classList.toggle('kotj-portrait',p);
  if(p&&d.body.classList.contains('fighting')&&!d.body.classList.contains('paused')){const b=d.getElementById('pause');if(b)b.click()}}
 (mq.addEventListener?mq.addEventListener('change',check):mq.addListener(check));addEventListener('resize',check);check();
})();
// the select-screen OPTIONS box always floats in the middle of the screen, above everything
(function(){const o=document.getElementById('sel-opts');if(o&&o.parentNode!==document.body){document.body.appendChild(o);o.style.zIndex='9000'}})();
