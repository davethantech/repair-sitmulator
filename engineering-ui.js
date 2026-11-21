/* BOARD//LAB 5 engineering workshop controller. Browser-only; real controls and deterministic modules. */
(function(){
"use strict";
const P=window.BoardPCB,F=window.BoardFactory,M=window.BoardMCU,S=window.BoardSignals,R=window.BoardRework;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(n,d=2)=>Number(n).toFixed(d);
const dl=(name,text,type="text/plain")=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),700);};
const bind=(id,event,fn)=>$(id).addEventListener(event,fn);
let board=P.routedExample(),dfm=null,panel=null,mcu=null,signal=null,rework=null,completed=new Set();
function tab(name){
document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("chosen",x.dataset.tab===name));
document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("open",x.id==="tab"+name[0].toUpperCase()+name.slice(1)));
const pages={factory:["CAM, ASSEMBLY & RELEASE","Virtual electronics manufacturing plant","Review training PCB copper, mounting, documentation and manufacturing gates."],embedded:["VIRTUAL MCU & BUS LAB","Firmware meets real circuit behavior","Write safe ISA commands and inspect power, GPIO, PWM, ADC, I²C and UART results."],signals:["TRANSMISSION LINE LAB","Signal integrity and termination","Derive propagation delay and reflections from a lossless-line model, then compare waveforms."],rework:["THERMAL REWORK & INSPECTION","Virtual microsoldering and microscope QA","Track component temperature, solder dwell, cooling and potential damage; avoid unsafe powered work."]};
const [ey,title,desc]=pages[name];$("currentStep").textContent=ey;$("pageTitle").textContent=title;$("pageSubtitle").textContent=desc;
}
const finite=(id)=>{let n=Number($(id).value);if(!Number.isFinite(n))throw Error("Enter a valid number for "+id);return n;};
function safe(fn,place){try{fn();}catch(e){const msg=String(e.message||e);const box=$(place||"pageSubtitle");box.textContent=msg;box.style.color="#ffb7a6";}}
function boardRender(){
const b=board,svg=$("factorySvg");
svg.setAttribute("viewBox",[-4,-4,b.width+8,b.height+8].join(" "));
let content='<rect width="'+b.width+'" height="'+b.height+'" rx="2" fill="#14645a" stroke="#8fe5bb" stroke-width=".45"/>'+
'<defs><pattern id="pcbDots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx=".5" cy=".5" r=".06" fill="#b1dca6"/></pattern></defs><rect width="'+b.width+'" height="'+b.height+'" fill="url(#pcbDots)"/>';
for(const tr of b.tracks){const color=tr.net==="GND"?"#7af6d3":tr.net==="VIN_5V"?"#f3ae98":tr.net==="LED_A"?"#ffe1a8":"#94bcff";content+='<polyline fill="none" stroke="'+color+'" stroke-width="'+tr.width+'" opacity="'+(tr.layer==="B.Cu"?.6:1)+'" points="'+tr.points.map(p=>p.x+','+p.y).join(" ")+'"/>';}
for(const via of b.vias)content+='<circle cx="'+via.x+'" cy="'+via.y+'" r="'+via.diameter/2+'" fill="#f0c68a" stroke="#1c343c" stroke-width=".14"/>';
for(const p of b.parts){const def=P.COMPONENTS[p.type];const rw=def.body[0],rh=def.body[1];content+='<g transform="translate('+p.x+' '+p.y+') rotate('+p.angle+')"><rect x="'+(-rw/2)+'" y="'+(-rh/2)+'" width="'+rw+'" height="'+rh+'" fill="#173443" stroke="#afd4cc" stroke-width=".12" rx=".25"/><text text-anchor="middle" y="'+(-rh/2-1.4)+'" font-size="2" fill="#e7f5dc">'+esc(p.ref)+'</text></g>';}
for(const pd of P.allPads(b)){content+='<rect x="'+(pd.x-pd.w/2)+'" y="'+(pd.y-pd.h/2)+'" rx=".12" width="'+pd.w+'" height="'+pd.h+'" fill="#eecf91" stroke="#385352" stroke-width=".08"><title>'+esc(pd.ref)+"."+esc(pd.pin)+" → "+esc(pd.net)+'</title></rect>';}
content+='<text x="2" y="'+(b.height+3.1)+'" font-size="2.2" fill="#b3e8dc">TOP COPPER / BOTTOM COPPER / PADS / COMPONENTS — CONCEPTUAL</text>';
svg.innerHTML=content;
$("boardTitle").textContent=b.title;$("boardDims").textContent=b.width+" × "+b.height+" mm";
}
function drawFactory(){
dfm=F.report(board,{minDrill:finite("minDrill"),assemblyMargin:finite("assemblyMargin")});
panel=F.panelize(board,{cols:finite("panelCols"),rows:finite("panelRows"),gap:finite("panelGap"),rail:finite("panelRail")});
boardRender();
$("dfmErrors").textContent=dfm.blockers;$("dfmWarnings").textContent=dfm.reviews;$("dfmPads").textContent=dfm.designRuleResults.connectivity+"%";$("dfmPanel").textContent=panel.copies;
$("dfmIssues").innerHTML=dfm.issues.slice(0,80).map(i=>'<div class="issue '+(i.severity==="blocker"?"error":"review")+'"><small>'+esc(i.code)+' · '+esc(i.severity)+'</small>'+esc(i.detail)+'</div>').join("")||'<div class="issue">No training-rule issues. Native CAD validation is still required.</div>';
$("factoryStages").innerHTML=F.STEPS.map((step,index)=>'<div class="stage"><b>'+String(index+1).padStart(2,"0")+' · '+esc(step.title)+'</b><p>'+esc(step.details)+'</p></div>').join("");
}
function exportFactory(type){
if(!dfm)drawFactory();const assets={
bom:["training-bom.csv",F.bom(board),"text/csv"],
pick:["training-centroids.csv",F.pickPlace(board),"text/csv"],
drill:["training-hole-list.csv",F.drills(board),"text/csv"],
panel:["training-panel-plan.json",JSON.stringify(panel,null,2),"application/json"],
report:["training-dfm-report.json",JSON.stringify(dfm,null,2),"application/json"]
};const data=assets[type];if(!data)throw Error("No export");dl(...data);
}
function savedBoard(){
const key="boardlab.pcb.project.v3",raw=localStorage.getItem(key);
if(!raw)throw Error("No saved BOARD//LAB PCB project in this browser. Save one in PCB Studio first.");
board=P.validateImport(JSON.parse(raw));$("boardPick").value="routed";drawFactory();
}
function compileMcu(){
mcu=M.make($("mcuSource").value,{fault:$("mcuFault").value,supplyV:finite("mcuSupply"),adcV:finite("mcuAdc"),temperatureC:finite("mcuTemp")});renderMcu();
}
function renderMcu(){
if(!mcu)return;
const state=M.pins(mcu);
$("mcuStatus").textContent=mcu.halted?mcu.reason||"HALT":mcu.cycles?"PAUSED @ "+mcu.pc:"READY @ 0";
$("mcuRail").textContent=fmt(state.railV,2)+" V";
$("mcuLed").textContent=state.ledOn?"ON":"OFF";$("ledCircle").classList.toggle("on",state.ledOn);
$("mcuDuty").textContent=state.duties[0]+"/255";$("mcuCycles").textContent=mcu.cycles;
$("mcuRegisters").innerHTML=mcu.regs.map((r,i)=>'<div>R'+i+'<strong>'+r+'</strong></div>').join("");
$("mcuUart").textContent=mcu.uart.map(e=>"["+e.atMs+" ms] "+e.text).join("\n")||"No UART output.";
$("mcuTrace").textContent=mcu.trace.slice(-14).map(e=>(e.cycle+" PC "+e.pc+" · "+(e.op||e.event||"")+" "+(e.args||"")+" "+(e.note||""))).join("\n")||"Compiled. Click step to execute.";
$("mcuHint").textContent=mcu.reason?mcu.reason:mcu.ioErrors?"I²C NACK modeled: review address and simulated sensor state.":"Virtual MCU at "+fmt(state.railV)+" V, LED current "+fmt(state.ledCurrentA*1000,3)+" mA. No physical hardware is connected.";
}
function mcuStep(){if(!mcu)compileMcu();M.step(mcu);renderMcu();}
function mcuRun(){if(!mcu)compileMcu();M.run(mcu,300);renderMcu();}
function getSignalParams(){return{impedanceOhm:finite("sigZ"),sourceOhm:finite("sigRs"),loadOhm:finite("sigRl"),lengthMm:finite("sigLength"),erEffective:finite("sigEr"),riseNs:finite("sigRise"),stepV:3.3};}
function plotWave(svgId,points,xKey,yKey,maxX,minY,maxY,{line="#70f3d2",label="Voltage"}={}){
const svg=$(svgId),W=920,H=svgId==="signalSvg"?360:340,left=56,right=25,top=24,bottom=40,spanY=Math.max(1e-6,maxY-minY),spanX=Math.max(1e-6,maxX);
const X=x=>left+(x/spanX)*(W-left-right),Y=y=>top+(maxY-y)/spanY*(H-top-bottom);
const path=points.map((p,i)=>(i?"L":"M")+fmt(X(p[xKey]),1)+" "+fmt(Y(p[yKey]),1)).join(" ");
let layers='<rect width="'+W+'" height="'+H+'" fill="#08242f"/>';
for(let i=0;i<=6;i++){const y=top+i*(H-top-bottom)/6,v=maxY-i*spanY/6;layers+='<path d="M'+left+' '+fmt(y)+' H'+(W-right)+'" stroke="#28545a"/><text x="4" y="'+fmt(y+3)+'" fill="#b2d2cd" font-size="11">'+fmt(v,2)+'</text>';}
for(let i=0;i<=8;i++){const x=left+i*(W-left-right)/8;layers+='<path d="M'+fmt(x)+' '+top+' V'+(H-bottom)+'" stroke="#28545a"/><text x="'+fmt(x-9)+'" y="'+(H-14)+'" fill="#b2d2cd" font-size="11">'+fmt(maxX*i/8,2)+'</text>';}
layers+='<path d="'+path+'" fill="none" stroke="'+line+'" stroke-width="2.7" stroke-linejoin="round"/><text x="'+left+'" y="15" fill="#d7f1ec" font-size="12">'+esc(label)+'</text>';svg.innerHTML=layers;
}
function drawSignal(){
signal=S.waveform(getSignalParams(),$("sigProbe").value,360);const p=signal.points,xmax=p[p.length-1].tNs,yVals=p.map(q=>q.v);const ymin=Math.min(0,...yVals)-.15,ymax=Math.max(3.3,...yVals)+.3;
plotWave("signalSvg",p,"tNs","v",xmax,ymin,ymax,{label:"Ideal response (V) vs time (ns)"});
$("sigDelay").textContent=fmt(signal.parameters.oneWayNs,3);
$("sigGamma").textContent=fmt(signal.parameters.loadReflection,3);
$("sigPeak").textContent=fmt(signal.maxV,3);$("sigOver").textContent=fmt(signal.overshootV,3);
$("sigMode").textContent=signal.probe.toUpperCase()+" PROBE";
$("sigWarnings").textContent=(signal.warnings.length?signal.warnings.join(" "):"No exceptional reflection warnings for this ideal case.")+" Real-world trace design needs SI/PI and manufacturer stackup verification.";
}
function resetRework(){
rework=R.make({part:$("rwPart").value,alloy:$("rwAlloy").value,corrosion:$("rwCorrosion").checked,bridge:$("rwBridge").checked});renderRework();
}
function renderRework(message){
if(!rework)return;
$("rwPad").textContent=fmt(rework.padTempC,1);$("rwLiquidus").textContent=R.ALLOYS[rework.alloy].liquidusC;
$("rwDwell").textContent=fmt(rework.jointLiquidusSec,2);$("rwHealth").textContent=fmt(rework.padHealth,0);
$("rwPhase").textContent=rework.padTempC>R.ALLOYS[rework.alloy].liquidusC?"ABOVE LIQUIDUS":rework.replaced?"REASSEMBLED":rework.removed?"REMOVED":"PREPARATION";
$("rwAssembly").textContent=rework.replaced?"Replacement placed":rework.removed?"Old component removed":"Original component installed";
$("rwComponent").textContent=rework.part.split("_")[0].toUpperCase();$("rwComponent").style.opacity=rework.removed&&!rework.replaced?".4":"1";
const inspection=R.inspect(rework);
$("rwChecklist").innerHTML=(inspection.reasons.length?inspection.reasons.map(x=>'<div class="issue review">'+esc(x)+'</div>').join(''):'<div class="issue">Checks pass in the illustrative model. Physical microscope qualification still required.</div>');
$("rwLog").textContent=rework.actions.slice(-16).join("\n")||"No actions yet.";
$("rwMessage").textContent=message||("Modeled board temp "+fmt(rework.boardTempC,1)+" °C. "+(rework.padLifted?"Pad damage threshold exceeded.":"Do not apply these virtual temperatures to real repairs."));
const hist=[{timeS:0,padTempC:rework.ambientC},...rework.history];
const maxT=Math.max(310,...hist.map(v=>v.padTempC))+15,maxX=Math.max(30,rework.timeS);
plotWave("thermalSvg",hist,"timeS","padTempC",maxX,0,maxT,{line:"#ffcb88",label:"Simulated pad °C vs virtual seconds"});
}
function actRework(type){
if(!rework)resetRework();let result;
if(type==="heat")result=R.heat(rework,{airC:finite("rwAir"),airflow:finite("rwFlow"),distanceMm:finite("rwDistance")},finite("rwSeconds"));
if(type==="cool")result=R.cool(rework,30);
if(type==="flux")result=R.applyFlux(rework);
if(type==="clean")result=R.clean(rework);
if(type==="remove")result=R.remove(rework);
if(type==="place")result=R.place(rework);
if(type==="bridge")result=R.bridge(rework);
if(type==="inspect")result=R.inspect(rework);
renderRework(type==="inspect"?(result.passed?"TRAINING QA PASS, score "+result.score+"/100. Physical inspection still mandatory.":"TRAINING QA FAILED: "+result.reasons.join("; ")):result.message||(type+" completed; check pad and action history."));
}
function init(){
document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>tab(btn.dataset.tab)));
document.querySelectorAll("[data-export]").forEach(btn=>btn.addEventListener("click",()=>safe(()=>exportFactory(btn.dataset.export),"pageSubtitle")));
bind("boardPick","change",()=>safe(()=>{board=$("boardPick").value==="routed"?P.routedExample():P.getTemplate($("boardPick").value);drawFactory();}));
for(const id of ["refreshFactory","planPanel"])bind(id,"click",()=>safe(drawFactory));
bind("importStudio","click",()=>safe(savedBoard));
bind("programPick","change",()=>{$("mcuSource").value=M.TEMPLATES[$("programPick").value];safe(compileMcu);});
bind("compileMcu","click",()=>safe(compileMcu,"mcuHint"));bind("stepMcu","click",()=>safe(mcuStep,"mcuHint"));bind("runMcu","click",()=>safe(mcuRun,"mcuHint"));
bind("downloadMcu","click",()=>safe(()=>{if(!mcu)throw Error("Compile first");dl("virtual-mcu-log.csv",M.logCsv(mcu),"text/csv");},"mcuHint"));
bind("sigCalculate","click",()=>safe(drawSignal,"sigWarnings"));
bind("sigMatched","click",()=>{$("sigRs").value=50;$("sigZ").value=50;$("sigRl").value=50;safe(drawSignal,"sigWarnings");});
bind("sigOpen","click",()=>{$("sigRs").value=50;$("sigZ").value=50;$("sigRl").value=1000000;safe(drawSignal,"sigWarnings");});
bind("sigExport","click",()=>safe(()=>{if(!signal)drawSignal();dl("transmission-line-training.csv","time_ns,volts\n"+signal.points.map(p=>p.tNs+","+p.v).join("\n")+"\n","text/csv");},"sigWarnings"));
bind("rwReset","click",()=>safe(resetRework,"rwMessage"));for(const [id,type] of [["rwHeat","heat"],["rwCool","cool"],["rwFlux","flux"],["rwRemove","remove"],["rwPlace","place"],["rwClean","clean"],["rwBridgeAction","bridge"],["rwInspect","inspect"]])bind(id,"click",()=>safe(()=>actRework(type),"rwMessage"));
$("mcuSource").value=M.TEMPLATES.blink;
drawFactory();compileMcu();drawSignal();resetRework();tab("factory");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();