/* TapLab recorder: add to a webpage you own. No dependencies, no network sends.
   Configure BEFORE loading, e.g.:
   window.TAPLAB_CONFIG = {targetSelector:'#search-button',gameAreaSelector:'#game'};
   <script src="taplab-recorder.js" defer></script>
*/
(() => {
 'use strict';
 if(window.__TAPLAB_RECORDER_LOADED__)return;
 window.__TAPLAB_RECORDER_LOADED__=true;
 const config=Object.assign({targetSelector:'[data-taplab-target]',gameAreaSelector:null,positionTolerancePx:46,maxTaps:2500},window.TAPLAB_CONFIG||{});
 const rnd=v=>Number.isFinite(v)?Math.round(v*100)/100:null;
 const clock=()=>performance.now();
 const iso=()=>new Date().toISOString();
 const selector=q=>{try{return q?document.querySelector(q):null}catch{return null}};
 const closest=(el,q)=>{try{return q&&el instanceof Element?el.closest(q):null}catch{return null}};
 const bounds=el=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:rnd(r.x),y:rnd(r.y),width:rnd(r.width),height:rnd(r.height),centerX:rnd(r.x+r.width/2),centerY:rnd(r.y+r.height/2)}};
 const inside=(r,x,y)=>r&&x>=r.x&&y>=r.y&&x<=r.x+r.width&&y<=r.y+r.height;
 const viewport=()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,scrollX,scrollY});
 let hud,caption,recordBtn,stopBtn,exportBtn,shareBtn,collapseBtn;
 let session=null,recording=false,active=null,startedMono=null,lastDown=null,lastUp=null,observedSlots=[],prevSlot=null,overlayCollapsed=false;
 const style=document.createElement('style');
 style.textContent=`#taplab-hud{position:fixed!important;top:max(15px,env(safe-area-inset-top))!important;left:12px!important;width:202px!important;z-index:2147483647!important;font:12px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif!important;color:#e9f1ff!important;background:#0e192bf2!important;border:1px solid #6283a2!important;border-radius:14px!important;box-shadow:0 8px 28px #0008!important;padding:9px!important;box-sizing:border-box!important;user-select:none!important;-webkit-user-select:none!important}#taplab-hud *{box-sizing:border-box!important;font-family:inherit!important}#taplab-hud .tl-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:6px!important;cursor:move!important;touch-action:none!important;padding:3px 2px 9px!important;font-size:14px!important;font-weight:750!important}#taplab-hud .tl-head small{font-size:9px!important;color:#c4d7ef!important;font-weight:500!important}#taplab-hud .tl-btns{display:flex!important;flex-wrap:wrap!important;gap:5px!important}#taplab-hud button{display:inline-block!important;font-size:12px!important;font-weight:650!important;line-height:1.25!important;border-radius:8px!important;padding:9px 10px!important;border:1px solid #6c89a9!important;min-height:36px!important;color:#f5faff!important;background:#264464!important;touch-action:manipulation!important}#taplab-hud button:disabled{opacity:.45!important}#taplab-hud button.tl-primary{background:#8cddff!important;border-color:#8cddff!important;color:#061626!important}#taplab-hud p{margin:7px 0 1px!important;font-size:11px!important;color:#cbdaf0!important}#taplab-hud.tl-collapsed .tl-body{display:none!important}#taplab-hud.tl-collapsed .tl-head{padding:2px!important}#taplab-hud .tl-hide{font-size:11px!important}`;
 document.head.appendChild(style);
 function init(){if(!document.body){setTimeout(init,30);return}hud=document.createElement('aside');hud.id='taplab-hud';hud.setAttribute('data-taplab-ui','');hud.innerHTML=`<div class="tl-head"><span>◎ TapLab <small>drag to move</small></span><button class="tl-hide" type="button" aria-label="Toggle panel">−</button></div><div class="tl-body"><div class="tl-btns"><button class="tl-primary tl-start" type="button">● Record</button><button class="tl-stop" type="button" disabled>■ Stop</button><button class="tl-export" type="button" disabled>↓ JSON</button><button class="tl-share" type="button" disabled>⇧ Share</button></div><p class="tl-caption">Ready. Tap Record and use your game.</p></div>`;document.body.appendChild(hud);
   caption=hud.querySelector('.tl-caption');recordBtn=hud.querySelector('.tl-start');stopBtn=hud.querySelector('.tl-stop');exportBtn=hud.querySelector('.tl-export');shareBtn=hud.querySelector('.tl-share');collapseBtn=hud.querySelector('.tl-hide');
   recordBtn.addEventListener('click',start);stopBtn.addEventListener('click',stop);exportBtn.addEventListener('click',download);shareBtn.addEventListener('click',share);
   collapseBtn.addEventListener('click',()=>{overlayCollapsed=!overlayCollapsed;hud.classList.toggle('tl-collapsed',overlayCollapsed);collapseBtn.textContent=overlayCollapsed?'+':'−'});
   let drag=null;
   const head=hud.querySelector('.tl-head');head.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=hud.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};head.setPointerCapture(e.pointerId);e.preventDefault()});
   head.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;hud.style.setProperty('left',Math.max(0,Math.min(innerWidth-hud.offsetWidth,drag.left+e.clientX-drag.x))+'px','important');hud.style.setProperty('top',Math.max(0,Math.min(innerHeight-45,drag.top+e.clientY-drag.y))+'px','important')});
   head.addEventListener('pointerup',()=>drag=null);head.addEventListener('pointercancel',()=>drag=null);
   document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',e=>up(e,false),true);document.addEventListener('pointercancel',e=>up(e,true),true);
   window.TapLabRecorder={getSession:()=>session,export:download,start,stop};
 }
 function makeSession(){return{schema:'taplab.taps.v1',app:'TapLab game-integration recorder',sessionId:new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+Math.random().toString(36).slice(2,8),startedAt:iso(),endedAt:null,game:{url:location.href,targetSelector:config.targetSelector,gameAreaSelector:config.gameAreaSelector,slotClusteringTolerancePx:config.positionTolerancePx},device:{userAgent:navigator.userAgent,language:navigator.language,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||null},initialViewport:viewport(),observedPositions:[],shifts:[],events:[]}}
 function start(){session=makeSession();recording=true;active=null;lastDown=null;lastUp=null;startedMono=clock();observedSlots=[];prevSlot=null;recordBtn.disabled=true;stopBtn.disabled=false;exportBtn.disabled=true;shareBtn.disabled=true;caption.textContent='Recording. Touch your game buttons normally.'}
 function stop(){if(!recording)return;recording=false;active=null;session.endedAt=iso();recordBtn.disabled=false;stopBtn.disabled=true;exportBtn.disabled=!session.events.length;shareBtn.disabled=!session.events.length;caption.textContent=`Stopped: ${session.events.length} taps. Export or start again.`}
 function sample(e){return{tMs:rnd(clock()-active.start),x:rnd(e.clientX),y:rnd(e.clientY),pressure:rnd(e.pressure),contactWidth:rnd(e.width),contactHeight:rnd(e.height)}}
 function whichSlot(rect,el){if(el?.dataset?.taplabSlot)return String(el.dataset.taplabSlot);if(!rect)return null;let idx=observedSlots.findIndex(s=>Math.hypot(rect.centerX-s.x,rect.centerY-s.y)<=config.positionTolerancePx);if(idx<0){idx=observedSlots.length;observedSlots.push({label:String.fromCharCode(65+idx),x:rect.centerX,y:rect.centerY})}return observedSlots[idx].label}
 function down(e){if(!recording||active||hud.contains(e.target)||session.events.length>=config.maxTaps)return;if(e.pointerType==='mouse'&&e.button!==0)return;
   const target=closest(e.target,config.targetSelector),area=selector(config.gameAreaSelector);
   if(!target&&(!area||!area.contains(e.target)))return;
   const button=target||selector(config.targetSelector),buttonRect=bounds(button),areaRect=bounds(area),start=clock();
   active={id:e.pointerId,start,downAt:iso(),pointerType:e.pointerType||'unknown',x:e.clientX,y:e.clientY,pressure:e.pressure,buttonRect,areaRect,slot:whichSlot(buttonRect,button),hitAtDown:inside(buttonRect,e.clientX,e.clientY),path:[]};active.path.push(sample(e))
 }
 function move(e){if(!active||!recording||e.pointerId!==active.id)return;const pt=sample(e),prev=active.path.at(-1);if(active.path.length<80&&(pt.tMs-prev.tMs>=12||Math.hypot(pt.x-prev.x,pt.y-prev.y)>1.5))active.path.push(pt)}
 function up(e,cancel){if(!active||!recording||e.pointerId!==active.id)return;move(e);const a=active;active=null;if(cancel)return;
  const time=clock(),b=a.buttonRect,area=a.areaRect,hit=!!(a.hitAtDown&&inside(b,e.clientX,e.clientY));
  const entry={index:session.events.length+1,downAt:a.downAt,upAt:iso(),fromSessionStartMs:rnd(a.start-startedMono),interTapMs:lastDown===null?null:rnd(a.start-lastDown),idleGapMs:lastUp===null?null:rnd(a.start-lastUp),holdMs:rnd(time-a.start),pointerType:a.pointerType,down:{x:rnd(a.x),y:rnd(a.y),pressure:rnd(a.pressure)},up:{x:rnd(e.clientX),y:rnd(e.clientY),pressure:rnd(e.pressure)},path:a.path,slot:a.slot,hit,buttonRect:b,gameAreaRect:area,viewport:viewport(),buttonOffsetPx:b?{x:rnd(a.x-b.centerX),y:rnd(a.y-b.centerY)}:null,normalizedInButton:b&&b.width&&b.height?{x:rnd((a.x-b.x)/b.width),y:rnd((a.y-b.y)/b.height)}:null,normalizedInGameArea:area&&area.width&&area.height?{x:rnd((a.x-area.x)/area.width),y:rnd((a.y-area.y)/area.height)}:null,moveDistancePx:rnd(Math.hypot(e.clientX-a.x,e.clientY-a.y))};
  session.events.push(entry);if(prevSlot&&a.slot&&prevSlot!==a.slot)session.shifts.push({at:a.downAt,firstObservedTapIndex:entry.index,from:prevSlot,to:a.slot,approximate:true});prevSlot=a.slot||prevSlot;
  session.observedPositions=observedSlots;lastDown=a.start;lastUp=time;exportBtn.disabled=false;shareBtn.disabled=false;caption.textContent=`Recording: ${session.events.length} taps (${session.events.filter(v=>v.hit).length} button hits)`;
 }
 function output(){if(!session)return'{}';const events=session.events,hits=events.filter(e=>e.hit).length;return JSON.stringify({...session,summary:{taps:events.length,hits,misses:events.length-hits,observedShiftCount:session.shifts.length},exportedAt:iso()},null,2)}
 function file(){return new File([output()],`taplab-game-${session.sessionId}.json`,{type:'application/json'})}
 function download(){if(!session?.events.length)return;const url=URL.createObjectURL(new Blob([output()],{type:'application/json'})),a=document.createElement('a');a.download=`taplab-game-${session.sessionId}.json`;a.href=url;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);caption.textContent='Check Safari Downloads, or tap Share → Save to Files.'}
 async function share(){if(!session?.events.length)return;try{const f=file();if(navigator.canShare?.({files:[f]})&&navigator.share){await navigator.share({files:[f],title:'TapLab game recording'})}else download()}catch(e){if(e.name!=='AbortError')caption.textContent='Sharing blocked; use JSON download.'}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
