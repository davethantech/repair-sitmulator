/* BOARD//LAB 6 mechanical 3D canvas renderer.
 * CPU/software three-axis projection works without WebGL.
 * All repair actions are delegated to the independent mechanical state engine. */
(()=>{
"use strict";
const A=window.BoardAssembly,$=id=>document.getElementById(id),canvas=$("threeD"),ctx=canvas.getContext("2d");
if(!A||!ctx){document.body.textContent="Mechanical model or 2D canvas unavailable";return;}
let state=A.make(),phase="teardown",view={yaw:-32,pitch:43,zoom:99},hot=[],drag=null,selected={kind:"part",id:"cover"};
const has=(a,id)=>a.includes(id),by=(a,id)=>a.find(x=>x.id===id),D=Math.PI/180;
const pickText=(label,x)=>label+" "+(x||"");
const sColor=(hex,f=.8)=>{const h=hex.replace("#",""),r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return"rgb("+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x*f)))).join(",")+")";};
function setup(){
$("partSelect").innerHTML=A.PARTS.filter(p=>p.removable).map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join("");
$("screwSelect").innerHTML=A.SCREWS.map(x=>'<option value="'+x.id+'">'+x.id+" · "+x.part+'</option>').join("");
$("cableSelect").innerHTML=A.CABLES.map(x=>'<option value="'+x.id+'">'+x.id+" · "+x.name+'</option>').join("");
$("partSelect").value="cover";$("screwSelect").value="C1";$("cableSelect").value="BAT";
for(const [id,key] of [["yaw","yaw"],["pitch","pitch"],["zoom","zoom"]])$(id).addEventListener("input",()=>{view[key]=Number($(id).value);draw();});
for(const id of ["showExploded","showScrews","seeThrough"])$(id).addEventListener("change",draw);
$("partSelect").addEventListener("change",()=>select("part",$("partSelect").value));
$("screwSelect").addEventListener("change",()=>select("screw",$("screwSelect").value));
$("cableSelect").addEventListener("change",()=>select("cable",$("cableSelect").value));
const on=(id,action)=>$(id).addEventListener("click",()=>execute(action));
on("removePart",()=>A.remove(state,$("partSelect").value));
on("installPart",()=>A.install(state,$("partSelect").value));
on("removeScrew",()=>A.loosen(state,$("screwSelect").value));
on("installScrew",()=>A.tighten(state,$("screwSelect").value,Number($("torque").value)));
on("openLatch",()=>A.latch(state,$("cableSelect").value,true));
on("closeLatch",()=>A.latch(state,$("cableSelect").value,false));
on("disconnectCable",()=>A.cable(state,$("cableSelect").value,true));
on("connectCable",()=>A.cable(state,$("cableSelect").value,false));
on("paste",()=>A.paste(state));
on("unplug",()=>A.adapter(state,false));
on("togglePower",()=>A.power(state,!state.sourceOn));
on("verify",()=>{const x=A.verify(state);return{ok:x.ok,message:x.ok?"Mechanical QA PASS — all checked dependencies restored (fictional reference).":x.reasons.slice(0,3).join("; ")};});
$("guided").addEventListener("click",()=>execute(guided));
$("reset").addEventListener("click",()=>{state=A.make();phase="teardown";select("part","cover");refresh("Training model reset. Start with the lower-cover fasteners.");});
$("exportHistory").addEventListener("click",()=>{
 const data={schema:"boardlab.assembly.v1",model:state.hardware,source:"fictional teaching geometry",state,qa:A.verify(state),parts:A.PARTS,fasteners:A.SCREWS,connectors:A.CABLES};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="BOARDLAB_mechanical_training_record.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
canvas.tabIndex=0;
canvas.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY,move:0};canvas.setPointerCapture?.(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.move+=Math.abs(dx)+Math.abs(dy);if(Math.abs(dx)+Math.abs(dy)>0){view.yaw=(view.yaw+dx*.42+180)%360-180;view.pitch=Math.max(10,Math.min(82,view.pitch+dy*.26));$("yaw").value=view.yaw;$("pitch").value=view.pitch;drag.x=e.clientX;drag.y=e.clientY;draw();}});
canvas.addEventListener("pointerup",e=>{if(!drag)return;let dist=drag.move;drag=null;if(dist<8){const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*canvas.width/rect.width,y=(e.clientY-rect.top)*canvas.height/rect.height;for(const p of hot.slice().reverse())if(inPoly({x,y},p.polygon)){select(p.kind,p.id);break;}}});
canvas.addEventListener("wheel",e=>{e.preventDefault();view.zoom=Math.max(50,Math.min(170,view.zoom+Math.sign(-e.deltaY)*6));$("zoom").value=view.zoom;draw();},{passive:false});
canvas.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();view.yaw+=(e.key==="ArrowLeft"?-5:5);view.yaw=(view.yaw+180)%360-180;$("yaw").value=view.yaw;draw();}if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();view.pitch=Math.min(82,Math.max(10,view.pitch+(e.key==="ArrowUp"?5:-5)));$("pitch").value=view.pitch;draw();}});
window.addEventListener("resize",draw);
refresh("Select screws or parts from the canvas or controls. The model enforces prerequisites.");
}
function select(kind,id){
 selected={kind,id};
 const sel=kind==="part"?"partSelect":kind==="screw"?"screwSelect":"cableSelect";$(sel).value=id;
 let name;
 if(kind==="part"){const p=by(A.PARTS,id);name=p.name;$("pickedDesc").textContent=p.box.join(" × ")+" mm coordinates / extents; "+(has(state.removed,id)?"removed":"installed")+"; "+p.material+". Dimensional teaching asset, not OEM CAD.";}
 if(kind==="screw"){const p=by(A.SCREWS,id);name=p.id+" ("+p.part+")";$("screwSpec").textContent=p.id+" training target "+p.torqueNm.toFixed(3)+" N·m; current "+(has(state.screwsRemoved,id)?"removed":"installed")+". Do not use this value on a real laptop.";$("torque").value=p.torqueNm;$("pickedDesc").textContent="Training screw. Remove before lifting parent part; use matching sequence during assembly.";}
 if(kind==="cable"){const p=by(A.CABLES,id);name=p.name;$("pickedDesc").textContent="Modeled "+p.a+" → "+p.b+" connector; "+(has(state.cablesDisconnected,id)?"disconnected":"connected")+"; latch "+(has(state.latchesOpen,id)?"open":"closed");}
 $("pickedTitle").textContent=name;draw();
}
function execute(fn){let v;try{v=fn();}catch(e){v={ok:false,message:String(e.message||e)};}refresh(v.message,v.ok);return v;}
function guided(){
 const s=state,cover=S=>S.part==="cover",internal=S=>S.part!=="cover";
 if(s.sourceOn)return A.power(s,false);
 if(s.adapterConnected)return A.adapter(s,false);
 if(phase==="teardown"){
  const x=A.SCREWS.filter(cover).find(x=>!has(s.screwsRemoved,x.id));
  if(!has(s.removed,"cover")){if(x)return A.loosen(s,x.id);return A.remove(s,"cover");}
  if(s.batteryConnected)return A.cable(s,"BAT",true);
  for(const c of A.CABLES.filter(x=>x.id!=="BAT"))if(!has(s.cablesDisconnected,c.id)){
    if(!has(s.latchesOpen,c.id))return A.latch(s,c.id,true);
    return A.cable(s,c.id,true);
  }
  const screw=A.SCREWS.filter(internal).find(x=>!has(s.screwsRemoved,x.id));if(screw)return A.loosen(s,screw.id);
  for(const id of ["fan","heatsink","ssd","ram","battery","board"])if(!has(s.removed,id))return A.remove(s,id);
  phase="reassembly";return{ok:true,message:"Full teardown complete. Next guided action begins reassembly."};
 }
 if(has(s.removed,"board"))return A.install(s,"board");
 if(has(s.removed,"heatsink")&&!s.thermalFresh)return A.paste(s);
 for(const id of ["battery","ram","ssd","heatsink","fan"])if(has(s.removed,id))return A.install(s,id);
 const screw=A.SCREWS.filter(internal).find(x=>has(s.screwsRemoved,x.id));if(screw)return A.tighten(s,screw.id,screw.torqueNm);
 for(const c of A.CABLES.filter(x=>x.id!=="BAT")){
  if(has(s.cablesDisconnected,c.id))return A.cable(s,c.id,false);
  if(has(s.latchesOpen,c.id))return A.latch(s,c.id,false);
 }
 if(has(s.cablesDisconnected,"BAT"))return A.cable(s,"BAT",false);
 if(has(s.removed,"cover"))return A.install(s,"cover");
 const coverS=A.SCREWS.filter(cover).find(x=>has(s.screwsRemoved,x.id));if(coverS)return A.tighten(s,coverS.id,coverS.torqueNm);
 const qa=A.verify(s);
 return{ok:qa.ok,message:qa.ok?"Reassembly finished: independent QA passes.":"Reassembly unfinished: "+qa.reasons.join("; ")};
}
function nextText(){
 const s=state;
 if(s.sourceOn)return"Shut down before touching fasteners.";
 if(s.adapterConnected)return"Unplug the power adapter before opening chassis.";
 if(phase==="teardown"){
  if(!has(s.removed,"cover")){const x=A.SCREWS.find(x=>x.part==="cover"&&!has(s.screwsRemoved,x.id));return x?"Remove lower-cover screw "+x.id+".":"Lift bottom access cover."; }
  if(s.batteryConnected)return"Disconnect the battery header before any internal disassembly.";
  for(const c of A.CABLES.filter(x=>x.id!=="BAT"))if(!has(s.cablesDisconnected,c.id))return(has(s.latchesOpen,c.id)?"Disconnect ":"Open latch for ")+c.name+".";
  const screw=A.SCREWS.find(x=>x.part!=="cover"&&!has(s.screwsRemoved,x.id));if(screw)return"Remove internal fastener "+screw.id+" from "+screw.part+".";
  const id=["fan","heatsink","ssd","ram","battery","board"].find(id=>!has(s.removed,id));return id?"Lift "+id+" from its mounting.":"All modules lifted; switch to reassembly.";
 }
 if(has(s.removed,"board"))return"Seat motherboard into chassis and align mount points.";
 if(has(s.removed,"heatsink")&&!s.thermalFresh)return"Clean and renew thermal interface before reinstalling heatsink.";
 const id=["battery","ram","ssd","heatsink","fan"].find(id=>has(s.removed,id));if(id)return"Seat "+id+" in its geometry.";
 const screw=A.SCREWS.find(x=>x.part!=="cover"&&has(s.screwsRemoved,x.id));if(screw)return"Tighten "+screw.id+" to its fictional training torque.";
 const cab=A.CABLES.filter(x=>x.id!=="BAT").find(x=>has(s.cablesDisconnected,x.id)||has(s.latchesOpen,x.id));if(cab)return"Reconnect and secure "+cab.name+".";
 if(has(s.cablesDisconnected,"BAT"))return"Reconnect battery last.";
 if(has(s.removed,"cover"))return"Close bottom cover.";
 const cover=A.SCREWS.find(x=>x.part==="cover"&&has(s.screwsRemoved,x.id));return cover?"Reinstall lower-cover screw "+cover.id+".":"Perform mechanical QA; then start virtual system for verification.";
}
function refresh(message,ok=true){
 const qa=A.verify(state);
 $("countRemoved").textContent=state.removed.length+"/7";$("countScrews").textContent=state.screwsRemoved.length+"/"+A.SCREWS.length;$("countCables").textContent=state.cablesDisconnected.length+"/"+A.CABLES.length;
 $("qaScore").textContent=qa.score;$("qaIssues").textContent=qa.ok?"PASS — assembled and all checked conditions restored":qa.reasons.slice(0,24).map((x,i)=>(i+1)+". "+x).join("\n");
 $("events").textContent=state.log.slice(-18).map(x=>x.index+" "+(x.ok?"✓":"✕")+" "+x.message).join("\n")||"No service actions yet.";
 $("safety").textContent=(state.sourceOn?"Powered ON — service controls blocked":state.adapterConnected?"Adapter connected — unplug first":state.batteryConnected?"Battery connected — access cover only":"Battery isolated — proceed with modeled service")+(state.damage.length?" • DAMAGE RECORDED":"");
 $("nextStep").textContent=nextText();
 $("sceneStatus").textContent=state.sourceOn?"POWER ON":state.batteryConnected?"BATTERY CONNECTED":"BATTERY ISOLATED";
 if(message){$("pickedDesc").textContent=message;$("pickedDesc").style.color=ok?"#b5e9df":"#ffc3aa";}
 draw();
}
function inPoly(pt,vertices){let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const a=vertices[i],b=vertices[j],inter=(a.y>pt.y)!==(b.y>pt.y)&&pt.x<(b.x-a.x)*(pt.y-a.y)/(b.y-a.y+1e-14)+a.x;if(inter)inside=!inside;}return inside;}
function draw(){
 const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 ctx.clearRect(0,0,w,h);hot=[];
 const yaw=view.yaw*D,elev=view.pitch*D,cy=Math.cos(yaw),sy=Math.sin(yaw),ce=Math.cos(elev),se=Math.sin(elev);
 const scale=Math.min(w/440,h/325)*view.zoom/100,centerX=w*.5,centerY=h*.60;
 function project(p){
  const x=p[0]-A.CHASSIS.width/2,y=p[1]-A.CHASSIS.depth/2,z=p[2];
  const rx=x*cy-y*sy,ry=x*sy+y*cy,vertical=ry*se-z*ce,depth=ry*ce+z*se;
  const perspective=500/(500+depth*.25),k=scale*perspective;
  return{x:centerX+rx*k,y:centerY+vertical*k,d:depth};
 }
 const ops=[];
 for(const p of A.PARTS){
  let removed=has(state.removed,p.id);
  if(removed&&!$("showExploded").checked)continue;
  const [x,y,z,ww,dd,hh]=p.box;
  let shift=removed?55+["cover","heatsink","board","battery","fan","ssd","ram"].indexOf(p.id)*9:0;
  const pos=[
   [x,y,z+shift],[x+ww,y,z+shift],[x+ww,y+dd,z+shift],[x,y+dd,z+shift],
   [x,y,z+hh+shift],[x+ww,y,z+hh+shift],[x+ww,y+dd,z+hh+shift],[x,y+dd,z+hh+shift]
  ].map(project);
  const faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
  for(let i=0;i<faces.length;i++){
   const coords=faces[i].map(k=>pos[k]),depth=coords.reduce((a,v)=>a+v.d,0)/coords.length;
   let alpha=p.id==="cover"&&!removed&&$("seeThrough").checked?.18:removed?.55:1;
   ops.push({kind:"part",id:p.id,poly:coords,depth,fill:sColor(p.color,i===1?1.15:i===0?.65:i%2?.78:.9),alpha,selected:selected.kind==="part"&&selected.id===p.id,label:i===1?p.id:""});
  }
 }
 if($("showScrews").checked)for(const x of A.SCREWS){
  const rem=has(state.screwsRemoved,x.id),o=project([x.x,x.y,x.z+(rem?95:0)]),size=Math.max(2,2.5*scale);
  ops.push({kind:"screw",id:x.id,depth:o.d,pt:o,rad:size,selected:selected.kind==="screw"&&selected.id===x.id,alpha:rem?.6:1});
 }
 for(const c of A.CABLES){
  if(has(state.removed,"cover")===false&&!$("seeThrough").checked)continue;
  const o=project([c.x,c.y,c.z+(has(state.cablesDisconnected,c.id)?38:0)]),size=Math.max(3,4*scale);
  ops.push({kind:"cable",id:c.id,depth:o.d,pt:o,rad:size,selected:selected.kind==="cable"&&selected.id===c.id,alpha:has(state.cablesDisconnected,c.id)?.55:1});
 }
 ops.sort((a,b)=>a.depth-b.depth);
 for(const o of ops){
  ctx.globalAlpha=o.alpha;ctx.strokeStyle=o.selected?"#ffffa0":"#4c8892";ctx.lineWidth=o.selected?2.3*dpr:.65*dpr;
  if(o.kind==="part"){
    ctx.fillStyle=o.fill;ctx.beginPath();for(let i=0;i<o.poly.length;i++){const p=o.poly[i];if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.closePath();ctx.fill();ctx.stroke();
    if(o.label&&o.alpha>.5){const q=o.poly[0];ctx.fillStyle="#eaf9f5";ctx.font=12*dpr+"px ui-monospace,monospace";ctx.fillText(o.label.toUpperCase(),q.x+5*dpr,q.y+15*dpr);}
    hot.push({kind:o.kind,id:o.id,polygon:o.poly});
  }else{
    ctx.beginPath();ctx.arc(o.pt.x,o.pt.y,o.rad,0,Math.PI*2);ctx.fillStyle=o.kind==="screw"?"#c6b18c":"#e0a2af";ctx.fill();ctx.stroke();
    ctx.strokeStyle="#2b3438";ctx.beginPath();ctx.moveTo(o.pt.x-o.rad*.4,o.pt.y);ctx.lineTo(o.pt.x+o.rad*.4,o.pt.y);ctx.stroke();
    hot.push({kind:o.kind,id:o.id,polygon:Array.from({length:12},(_,i)=>({x:o.pt.x+Math.cos(i/12*2*Math.PI)*o.rad,y:o.pt.y+Math.sin(i/12*2*Math.PI)*o.rad}))});
  }
 }
 ctx.globalAlpha=1;
 ctx.fillStyle="#9ad5cf";ctx.font=11*dpr+"px ui-monospace,monospace";
 ctx.fillText("BOARDLAB 15 | MODEL 355 × 245 mm | NOT MANUFACTURER CAD",14*dpr,18*dpr);
 ctx.fillStyle="#93b2b8";ctx.fillText("Drag: rotate  •  Wheel: zoom  •  Click: inspect/remove via controls",14*dpr,h-16*dpr);
}
setup();
})();