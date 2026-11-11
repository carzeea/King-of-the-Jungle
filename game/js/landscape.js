/* V2: landscape-only on phones/tablets. Android/Chrome: real full screen + sideways lock on first tap.
   iPhone (Safari can't lock): a "turn sideways" screen covers everything until the phone is rotated. */
(function(){
 const el=document.documentElement,touch=matchMedia('(pointer:coarse)').matches||'ontouchstart'in window;
 if(!touch)return;
 el.classList.add('kotj-touch');
 const ov=document.createElement('div');ov.id='rotate-lock';
 ov.innerHTML='<div class="rl-box"><div class="rl-phone"><i></i></div><b>TURN YOUR PHONE SIDEWAYS</b><span>King of the Jungle plays in landscape</span><small>Tap here to go full screen</small></div>';
 document.body.appendChild(ov);
 const sh=document.querySelector('#splash .splash-hint');if(sh)sh.textContent='TAP TO CONTINUE';
 const isFull=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
 let userExit=false;
 async function goLand(){if(isFull()||userExit)return;const rf=el.requestFullscreen||el.webkitRequestFullscreen;
  try{if(rf)await rf.call(el,{navigationUI:'hide'})}catch(_){}
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch(_){}
  setTimeout(()=>dispatchEvent(new Event('resize')),350)}
 addEventListener('pointerdown',e=>{const t=e.target&&e.target.closest&&e.target.closest('#fullscreen,#so-full');
  if(t){userExit=isFull();return}userExit=false;goLand()},{capture:true});
 const mq=matchMedia('(orientation:portrait)');
 function check(){const p=mq.matches;el.classList.toggle('kotj-portrait',p);
  if(p&&document.body.classList.contains('fighting')&&!document.body.classList.contains('paused')){const b=document.getElementById('pause');if(b)b.click()}}
 (mq.addEventListener?mq.addEventListener('change',check):mq.addListener(check));addEventListener('resize',check);check();
})();
