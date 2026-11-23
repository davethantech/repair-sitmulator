/* BOARD//LAB PCB Journey — standalone original browser interface.
   The "assistant" is explicit deterministic rule-based planning, NOT a Pantech
   integration, OpenAI agent, automated Gerber generator or professional EDA.
 */
(()=>{
"use strict";
const P=window.BoardPCB,J=window.BoardJourney,F=window.BoardFactory;
if(!P||!J||!F){document.body.textContent="PCB Journey modules failed to load";return;}
const $=id=>document.getElementById(id),esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STORE="boardlab.pcb.journey.v1",STUDIO="boardlab.pcb.project.v3";
let project=J.brief({kind:"led"}),board=J.template(project),day=0,stage=0,proposed=null,result=null;
let manualChecks={};
const issues=e=>String(e?.message||e||"Invalid operation").slice(0,280);
function notice(text,error=false,id="ideaFeedback"){const t=$(id);t.textContent=text;t.classList.toggle("error",error);}
function store(){
 try{localStorage.setItem(STORE,JSON.stringify({project,board,day,stage,manualChecks}));}
 catch{} // localStorage may be unavailable in privacy-restricted file origin.
}
function restore(){
 try{
  const raw=localStorage.getItem(STORE);if(!raw)return;
  const s=JSON.parse(raw);if(!s||!s.board||!s.project)return;
  const p=J.brief(s.project),b=P.validateImport(s.board);
  project=p;board=b;
  day=Math.min(4,Math.max(0,Number(s.day)||0));
  stage=Math.min(J.STEPS.length-1,Math.max(0,Number(s.stage)||0));
  if(s.manualChecks&&typeof s.manualChecks==="object")manualChecks=Object.fromEntries(Object.entries(s.manualChecks).filter(([k,v])=>/^\d+$/.test(k)&&v===true));
 }catch{ /* bad saved data cannot bypass shape validation */ }
}
function readInputs(){
 return J.brief({
   kind:$("template").value,
   title:$("projectTitle").value,
   supplyV:$("supply").value,
   forwardV:$("forward").value,
   targetMa:$("targetMa").value
 });
}
function syncInputs(){
 $("template").value=project.kind;$("projectTitle").value=project.title;
 $("supply").value=project.supplyV;$("forward").value=project.forwardV;$("targetMa").value=project.targetMa;
}
function safe(fn,feedback="ideaFeedback"){
 try{return fn();}
 catch(e){notice(issues(e),true,feedback);return null;}
}
function getReport(){project=readInputs();result=J.review(board,project);return result;}
function currentReview(){
 safe(()=>{getReport();render();store();notice("Calculated and checked current low-voltage design. Manufacturing approval remains locked.",false,"partInfo");},"partInfo");
}
function selectKind(kind){
 project=J.brief({kind});syncInputs();
 board=J.template(project);
 result=J.review(board,project);day=0;stage=0;
 render();store();
 notice("Loaded "+J.KIND[kind].label+". This is an educational starter layout; vendor components are not certified.",false);
}
function analyze(){
 safe(()=>{
  proposed=J.recommend($("idea").value);
  $("template").value=proposed.kind;
  notice("Suggested trainer: "+proposed.label+". "+proposed.summary+" · "+proposed.assistantType+
  (proposed.warnings.length?" · Warning: "+proposed.warnings.join(" "):"")+
  ". Click Load suggested trainer to create a project.");
 },"ideaFeedback");
}
function savedFromStudio(){
 safe(()=>{
  const raw=localStorage.getItem(STUDIO);
  if(!raw)throw Error("No PCB Studio project saved in this browser. Open PCB Studio and save a design first.");
  const b=P.validateImport(JSON.parse(raw));
  board=b;$("projectTitle").value=b.title;
  getReport();render();store();
  notice("Loaded your saved PCB Studio project. Basic DRC and schematic checks were recalculated.",false,"partInfo");
 },"partInfo");
}
function editStudio(){
 safe(()=>{
  const data=JSON.stringify(P.validateImport(board));
  const old=localStorage.getItem(STUDIO);
  if(old&&old!==data&&typeof window.confirm==="function"&&!window.confirm("Open this project in PCB Studio? It replaces your locally saved Studio draft. Export a backup first if needed."))return;
  localStorage.setItem(STUDIO,data);
  store();
  window.location.href="index.html#pcb";
 },"partInfo");
}
function colors(net){
 if(net==="GND")return"#75e4d0";
 if(/VIN|VCC|3V3|5V|VBUS/i.test(net))return"#f3bd8f";
 if(/LED|CC1|CC2|SIGNAL|EN/i.test(net))return"#bca9ec";
 return"#9bbde6";
}
function renderBoard(){
 const b=board,svg=$("boardSvg");svg.setAttribute("viewBox",[-5,-5,b.width+10,b.height+10].join(" "));
 const x=v=>Number(v).toFixed(3);
 let text='<defs><pattern id="board-grid" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx=".6" cy=".6" r=".09" fill="#93bf9c" opacity=".35"/></pattern></defs>';
 text+='<rect width="'+x(b.width)+'" height="'+x(b.height)+'" rx="1.7" fill="#176757" stroke="#94d3b1" stroke-width=".45"/>';
 text+='<rect width="'+x(b.width)+'" height="'+x(b.height)+'" fill="url(#board-grid)"/>';
 for(const tr of b.tracks){
  if(!Array.isArray(tr.points)||tr.points.length<2)continue;
  const poly=tr.points.map(v=>x(v.x)+","+x(v.y)).join(" ");
  text+='<polyline points="'+poly+'" fill="none" stroke="'+colors(tr.net)+'" stroke-width="'+x(tr.width)+'" opacity="'+(tr.layer==="B.Cu"?.65:1)+'"><title>'+esc(tr.net+" · "+tr.layer)+"</title></polyline>";
 }
 for(const via of b.vias)text+='<circle cx="'+x(via.x)+'" cy="'+x(via.y)+'" r="'+x(via.diameter/2)+'" stroke="#244a52" stroke-width=".12" fill="#eac899"><title>'+esc(via.id+" · "+via.net)+'</title></circle>';
 for(const part of b.parts){
  const def=P.COMPONENTS[part.type];if(!def)continue;
  const w=def.body[0],h=def.body[1];
  text+='<g class="board-part" data-part="'+esc(part.id)+'" tabindex="0" role="button" aria-label="Inspect '+esc(part.ref)+'" transform="translate('+x(part.x)+' '+x(part.y)+') rotate('+x(part.angle)+')">';
  text+='<rect x="'+x(-w/2)+'" y="'+x(-h/2)+'" width="'+x(w)+'" height="'+x(h)+'" rx=".18" fill="'+(part.type==="HOLE_M3"?"#395b58":"#0e3742")+'" stroke="#bee6d4" stroke-width=".14"/>';
  text+='<text text-anchor="middle" y="'+x(-h/2-1.2)+'" font-size="2.1" fill="#eafce9">'+esc(part.ref)+'</text>';
  text+='</g>';
 }
 for(const pad of P.allPads(b)){
  text+='<rect class="board-pad" data-pad="'+esc(pad.ref+"."+pad.pin)+'" x="'+x(pad.x-pad.w/2)+'" y="'+x(pad.y-pad.h/2)+'" width="'+x(pad.w)+'" height="'+x(pad.h)+'" rx=".1" fill="#f0d19b" stroke="#3b625f" stroke-width=".08"><title>'+esc(pad.ref+"."+pad.pin+" = "+(pad.net||"unassigned"))+'</title></rect>';
 }
 text+='<text x="2" y="'+x(b.height+3.2)+'" font-size="2" fill="#b6ece1">TRAINING COPPER · VERIFY WITH KICAD BEFORE FABRICATION</text>';
 svg.innerHTML=text;
 const selectPart=id=>{
  const p=b.parts.find(v=>v.id===id);if(!p)return;
  const pins=Object.entries(p.nets||{}).map(([key,net])=>key+":"+(net||"unassigned")).join(" · ");
  notice(p.ref+" · "+P.COMPONENTS[p.type].title+" · "+p.value+" · "+(pins||"mounting hole")+". This is a training part; confirm real supplier dimensions.",false,"partInfo");
 };
 svg.querySelectorAll("[data-part]").forEach(e=>{e.addEventListener("click",()=>selectPart(e.dataset.part));e.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();selectPart(e.dataset.part);}});});
 svg.querySelectorAll("[data-pad]").forEach(e=>{e.addEventListener("click",()=>{const [ref,pin]=e.dataset.pad.split("."),p=b.parts.find(x=>x.ref===ref);notice(ref+"."+pin+" → "+(p?.nets[pin]||"unassigned")+". Use PCB Studio to edit the actual net/trace.",false,"partInfo");});});
 $("boardHeading").textContent=b.title;$("boardDimensions").textContent=b.width+" × "+b.height+" mm";
}
function renderDays(){
 $("dayNav").innerHTML=J.DAYS.map((d,i)=>'<button data-day="'+i+'" class="'+(day===i?"chosen":"")+'" type="button"><b>DAY '+(i+1)+'</b><span>'+esc(d.title)+'</span></button>').join("");
 $("dayHeading").innerHTML="<strong>Day "+(day+1)+": "+esc(J.DAYS[day].title)+"</strong>";
 $("dayObjective").textContent=J.DAYS[day].objective;
 $("dayTasks").innerHTML="<ul>"+J.DAYS[day].tasks.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>";
 $("dayNav").querySelectorAll("[data-day]").forEach(e=>e.addEventListener("click",()=>{day=Number(e.dataset.day);stage=Math.max(0,J.STEPS.findIndex(x=>x.day===day));renderDays();renderStages();store();}));
}
function renderStages(){
 const all=result.stages,total=all.filter(x=>x.status==="completed").length;
 $("progressSummary").textContent=total+"/"+all.length;
 $("progressFill").style.width=(100*total/all.length).toFixed(2)+"%";
 $("stageDone").textContent=total+" completed · "+all.filter(x=>x.status==="external").length+" external";
 $("stageNav").innerHTML=all.map((s,i)=>{
  const icon=s.status==="completed"?"✓":s.status==="external"?"↗":"○";
  return'<button type="button" data-stage="'+i+'" class="'+(stage===i?"chosen":"")+'"><i class="'+(s.status==="completed"?"ok":s.status==="external"?"external":"")+'">'+icon+'</i><span>'+esc(s.title)+'</span></button>';
 }).join("");
 $("stageNav").querySelectorAll("[data-stage]").forEach(e=>e.addEventListener("click",()=>{stage=Number(e.dataset.stage);day=J.STEPS[stage].day;renderDays();renderStages();store();}));
 const current=all[stage];$("stageHeading").textContent=String(stage+1).padStart(2,"0")+" / "+current.title;
 $("stageStatus").textContent=current.status==="completed"?"Training evidence complete":current.status==="external"?"External approval required":"Review required";
 $("stageHelp").textContent=current.help;$("stageEvidence").textContent=current.detail;
 $("prevStage").disabled=stage===0;$("nextStage").disabled=stage===all.length-1;
}
function renderGuide(){
 const calc=result.calc,summary=result.board,check=result.checks;
 $("targetOhms").textContent=calc.targetOhms.toFixed(1);
 $("e12Ohms").textContent=calc.e12Ohms.toPrecision(3);
 $("ledMa").textContent=calc.actualMa.toFixed(3);
 $("powerMw").textContent=(1000*calc.resistorPowerW).toFixed(2);
 $("connectionPct").textContent=summary.connections+"%";
 $("drcError").textContent=check.drcErrors;$("ercError").textContent=check.ercErrors;$("dfmBlockers").textContent=check.dfmBlockers;
 $("reviewList").innerHTML=result.guidance.map(x=>'<div class="review-item '+esc(x.severity)+'"><strong>'+esc(x.severity)+'</strong>'+esc(x.message)+'</div>').join("");
}
const HANDOFF=[
 "Confirm exact datasheets, actual pinout and manufacturer orderable part numbers",
 "Rebuild/recheck the schematic and run native KiCad ERC",
 "Open the native board and run KiCad DRC for the fabricator stackup",
 "Verify complete copper, connector polarity, return paths and electrical ratings",
 "Generate real Gerber, soldermask, silkscreen and Excellon drill with KiCad",
 "Inspect every manufacturing layer and drill file in an independent CAM viewer",
 "Obtain fab/assembly DFM review, quotation and documented sign-off",
 "Inspect and test the manufactured prototype under safe current limiting"
];
function renderHandoff(){
 $("handoffChecks").innerHTML=HANDOFF.map((v,i)=>'<label><input type="checkbox" data-manual="'+i+'" '+(manualChecks[i]?"checked":"")+' aria-label="Self-attest '+esc(v)+'"><span>'+esc(v)+'</span></label>').join("");
 $("handoffChecks").querySelectorAll("[data-manual]").forEach(ch=>ch.addEventListener("change",()=>{manualChecks[ch.dataset.manual]=ch.checked;store();}));
}
function render(){
 if(!result)result=J.review(board,project);
 renderDays();renderStages();renderGuide();renderBoard();renderHandoff();
}
function download(name,content,type="text/plain"){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),900);
}
function exportData(type){
 safe(()=>{
  getReport();const out=J.handoff(board,project),key=project.kind;
  if(type==="bundle")download("BOARDLAB_PCB_JOURNEY_TRAINING_ONLY_"+key+".json",JSON.stringify(out,null,2),"application/json");
  if(type==="kicad")download(key+"_BOARDLAB_UNVERIFIED.kicad_pcb",out.files.kicadPcb,"application/x-kicad-pcb");
  if(type==="bom")download(key+"_UNVERIFIED_BOM.csv",out.files.bomCsv,"text/csv");
  if(type==="pick")download(key+"_UNVERIFIED_PLACEMENT.csv",out.files.pickPlaceCsv,"text/csv");
  if(type==="drill")download(key+"_UNVERIFIED_DRILL_SUMMARY.csv",out.files.drillCsv,"text/csv");
  if(type==="schematic")download(key+"_SCHEMATIC_TRAINING.json",out.files.schematicJson,"application/json");
  store();
 },"partInfo");
}
function bind(id,event,fn){const e=$(id);if(!e)throw Error("Missing element "+id);e.addEventListener(event,fn);}
function init(){
 restore();syncInputs();$("idea").value="Design an isolated low-voltage LED indicator board with fuse protection and accessible test pads.";
 bind("analyzeIdea","click",analyze);
 bind("loadProposed","click",()=>safe(()=>{if(!proposed)analyze();if(proposed)selectKind(proposed.kind);}));
 bind("loadTemplate","click",()=>safe(()=>{project=readInputs();board=J.template(project);result=J.review(board,project);stage=0;day=0;render();store();notice("Loaded training board "+board.title+"; reviews are shown in the right panel.");}));
 bind("runReview","click",currentReview);
 bind("loadStudio","click",savedFromStudio);
 bind("editPcb","click",editStudio);
 bind("prevStage","click",()=>{if(stage>0){stage--;day=J.STEPS[stage].day;renderDays();renderStages();store();}});
 bind("nextStage","click",()=>{if(stage<J.STEPS.length-1){stage++;day=J.STEPS[stage].day;renderDays();renderStages();store();}});
 bind("downloadBoard","click",()=>download("BOARDLAB_PCB_TRAINING_PROJECT.json",JSON.stringify(board,null,2),"application/json"));
 bind("importBoard","click",()=>$("boardFile").click());
 bind("boardFile","change",async()=>{
  const file=$("boardFile").files?.[0];if(!file)return;
  if(file.size>1024*1024){notice("Project file exceeds 1 MB",true,"partInfo");return;}
  try{board=P.validateImport(JSON.parse(await file.text()));$("projectTitle").value=board.title;getReport();render();store();notice("Project imported and checked",false,"partInfo");}
  catch(e){notice("Import rejected: "+issues(e),true,"partInfo");}
 });
 document.querySelectorAll("[data-download]").forEach(e=>e.addEventListener("click",()=>exportData(e.dataset.download)));
 result=J.review(board,project);render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();