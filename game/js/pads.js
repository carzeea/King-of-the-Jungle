/* V2: every controller looks like a standard Xbox/PlayStation pad to the game.
   Chrome/Edge/Safari/Firefox already give Xbox, PS4/PS5, Switch Pro, 8BitDo etc. the "standard" layout;
   this fixes the rest (older/generic USB pads, D-pads reported as a hat or as axes). */
(function(){
 const N=navigator;if(!N.getGamepads)return;
 const raw=N.getGamepads.bind(N);
 const SONY=[1,2,0,3,4,5,6,7,8,9,10,11];          // DirectInput DualShock: □ ✕ ○ △ → ✕ ○ □ △
 const btn=(pressed,value)=>({pressed:!!pressed,touched:!!pressed,value:value!=null?value:(pressed?1:0)});
 function hat(v){if(typeof v!=='number'||v<-1.05||v>1.05)return null;const i=Math.round((v+1)/(2/7));
  return{u:i===7||i===0||i===1,r:i>=1&&i<=3,d:i>=3&&i<=5,l:i>=5&&i<=7}}
 function norm(g){
  if(!g||g.mapping==='standard')return g;
  const id=(g.id||'').toLowerCase(),order=/054c|playstation|dualshock|dualsense|wireless controller/.test(id)?SONY:null;
  const B=[];for(let i=0;i<16;i++){const r=order&&i<order.length?g.buttons[order[i]]:g.buttons[i];B.push(r?btn(r.pressed,r.value):btn(false))}
  let dp=null;const ax=g.axes||[];
  if(ax.length>=10)dp=hat(ax[9]);                    // hat switch (common on Windows/Firefox)
  if(!dp&&ax.length>=8&&(Math.abs(ax[6])>.5||Math.abs(ax[7])>.5))dp={l:ax[6]<-.5,r:ax[6]>.5,u:ax[7]<-.5,d:ax[7]>.5};
  if(dp){if(dp.u)B[12]=btn(true);if(dp.d)B[13]=btn(true);if(dp.l)B[14]=btn(true);if(dp.r)B[15]=btn(true)}
  return{id:g.id,index:g.index,connected:g.connected,timestamp:g.timestamp,mapping:'standard',axes:[ax[0]||0,ax[1]||0,ax[2]||0,ax[3]||0],buttons:B,vibrationActuator:g.vibrationActuator||null}}
 try{Object.defineProperty(N,'getGamepads',{configurable:true,value:()=>Array.from(raw()||[]).map(norm)})}catch(_){}
 // Firefox/Safari only list a pad after its first button press; tell the game when one appears or leaves.
 addEventListener('gamepadconnected',()=>{document.documentElement.classList.add('has-pad');dispatchEvent(new Event('kotj-pads'))});
 addEventListener('gamepaddisconnected',()=>{const any=Array.from(raw()||[]).some(Boolean);document.documentElement.classList.toggle('has-pad',any);dispatchEvent(new Event('kotj-pads'))});
})();
