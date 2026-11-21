/* BOARD//LAB 4 visual workflow, browser-only. No external network dependencies. */
(()=>{
"use strict";
const K=window.BoardPCB,T=window.BoardTwin;if(!K||!T){document.body.textContent="The PCB and electrical engines failed to load.";return;}
const $=id=>document.getElementById(id),escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const download=(name,data,type)=>{const b=new Blob([data],{type:type||"text/plain"}),url=URL.createObjectURL(b),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1300);};
const pickFault=()=>{const f=Object.keys(T.FAULTS).filter(x=>x!=="healthy");return f[Math.floor(Math.random()*f.length)];};
let active="design",mode="DCV",probe="red",board=K.routedExample(),state=T.make(board,"healthy");
let recent=null;
const hints={
 design:"Explain why the fuse precedes the protected rail and how the 1 kΩ resistor limits LED current.",
 board:"Trace VIN_5V → fuse → VCC_PROTECTED → resistor → LED_A → return. Run training DRC before manufacture.",
 diagnose:"Compare rail input to rail output, then power down for resistance checks. Avoid replacing parts based on one reading.",
 rework:"Ensure source power is disconnected, gather evidence, select the correct target and suitable virtual repair method.",
 quality:"Re-energize the board, repeat observations, verify current and rails, and document the result."
};
const titles={design:["Schematic & circuit dependencies","Explore power, protection and the current path."],board:["Copper connectivity & manufacturing checks","Test the effect of routing changes on a real shared model."],diagnose:["Live electrical instruments","The DMM and scope read derived electrical state, not random numbers."],rework:["Component replacement & trace repair","Do not rework live circuits; choose the correct method."],quality:["Post-repair evidence & score","Functional testing closes the troubleshooting loop."]};
function say(message,ok=true){const el=$("message");el.className="result "+(ok?"good":"bad");el.textContent=message;}
function show(tab){active=tab;document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));document.querySelectorAll(".scene-tab").forEach(x=>x.classList.toggle("active",x.id==="view"+tab[0].toUpperCase()+tab.slice(1)));$("stepTitle").textContent=titles[tab][0];$("stepDesc").textContent=titles[tab][1];$("stepLabel").textContent="DESIGN-TO-REPAIR / "+tab.toUpperCase();$("lessonText").textContent=hints[tab];render();}
function testPoint(net,x,y){return '<g data-test="'+escape(net)+'" class="pad" tabindex="0" role="button" aria-label="Probe '+escape(net)+'"><circle cx="'+x+'" cy="'+y+'" r="2.3" fill="#ecc778" stroke="#805533" stroke-width=".22"/><circle cx="'+x+'" cy="'+y+'" r=".9" fill="#6c5434"/><text x="'+(x+2.9)+'" y="'+(y+1)+'" fill="#fff0bd" font-size="2.8">'+escape(net)+'</text></g>';}
function renderSchematic(){
const ss=T.snapshot(state);let v=ss.volts;let E=escape;
$("schematic").innerHTML=
'<defs><pattern id="schematicGrid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#316473" opacity=".25"/></pattern></defs><rect width="820" height="445" fill="#0d2732"/><rect width="820" height="445" fill="url(#schematicGrid)"/>'+
'<g fill="none" stroke="#bce8d5" stroke-width="3" stroke-linejoin="round"><path d="M82 205H180M246 205H325M390 205H500M575 205H680V335H82V205"/><path d="M470 205V315H82"/></g>'+
'<g fill="#163943" stroke="#81b6af" stroke-width="2"><rect x="45" y="175" width="74" height="64" rx="9"/><rect x="180" y="181" width="66" height="48" rx="6" data-part="f1"/><rect x="325" y="184" width="65" height="42" rx="4" data-part="r1"/><rect x="500" y="175" width="75" height="61" rx="5" data-part="d1"/><rect x="444" y="265" width="52" height="39" rx="5" data-part="c1"/></g>'+
'<g font-size="13" font-family="monospace" fill="#e1f5ed" text-anchor="middle"><text x="83" y="198">5 V</text><text x="83" y="216">SOURCE</text><text x="213" y="201">F1</text><text x="213" y="216">FUSE</text><text x="357" y="199">R1</text><text x="357" y="216">'+E(state.board.parts.find(p=>p.id==="r1")?.value||"1kΩ")+'</text><text x="538" y="199">D1</text><text x="538" y="216">LED</text><text x="470" y="290">C1</text><text x="80" y="365">GND</text></g>'+
'<g font-size="13" fill="#ffd89a" font-family="monospace"><text x="130" y="177">VIN_5V: '+v.VIN_5V.toFixed(3)+' V</text><text x="270" y="177">VCC_PROTECTED: '+v.VCC_PROTECTED.toFixed(3)+' V</text><text x="596" y="180">LED_A: '+v.LED_A.toFixed(3)+' V</text></g>'+
'<g fill="#93c8d1" font-size="16"><text x="40" y="51">5 V DC trainer • fuse • series resistor • LED • shunt capacitor</text><text x="40" y="80" font-size="12">The capacitor acts as a 100 kΩ DC leakage/load model, not a time-domain ceramic dielectric model.</text></g>'+
'<circle cx="680" cy="335" r="8" fill="#9fdac9"/>'+
'<g font-size="13" fill="#b8e9ef"><text x="40" y="414">SOURCE CURRENT '+(ss.sourceCurrent*1000).toFixed(3)+' mA · LED '+(ss.ledOn?"ON":"OFF")+'</text></g>';
$("schematic").querySelectorAll("[data-part]").forEach(x=>x.addEventListener("click",()=>say("Part "+x.dataset.part+" — matching footprint appears on the PCB. Use DMM evidence before replacement.")));
}
const netColor=n=>n==="GND"?"#96ebd8":n==="LED_A"?"#f9d887":n==="VIN_5V"?"#f19b83":"#80c4ff";
function renderBoard(){
let b=state.board,svg=$("pcbSvg");svg.setAttribute("viewBox",[-5,-5,b.width+10,b.height+10].join(" "));
let html='<defs><pattern id="d" width="2" height="2" patternUnits="userSpaceOnUse"><circle cx=".3" cy=".3" r=".07" fill="#7fbcac"/></pattern></defs>'+
'<rect x="0" y="0" width="'+b.width+'" height="'+b.height+'" rx="2" fill="#176158" stroke="#8ad8ad" stroke-width=".5"/><rect x="0" y="0" width="'+b.width+'" height="'+b.height+'" fill="url(#d)"/>';
b.tracks.forEach(t=>html+='<polyline points="'+t.points.map(p=>p.x+','+p.y).join(" ")+'" fill="none" stroke="'+netColor(t.net)+'" stroke-width="'+Math.max(.18,t.width)+'" opacity="'+(t.layer==="B.Cu"?.6:1)+'" stroke-linecap="round" />');
b.vias.forEach(v=>html+='<circle cx="'+v.x+'" cy="'+v.y+'" r="'+v.diameter/2+'" fill="#ebc28d" stroke="#293a40" stroke-width=".12"/>');
b.parts.forEach(p=>{let d=K.COMPONENTS[p.type];if(!d)return;html+='<g class="clickablePart" data-part="'+escape(p.id)+'" transform="translate('+p.x+' '+p.y+') rotate('+p.angle+')"><rect x="'+(-d.body[0]/2)+'" y="'+(-d.body[1]/2)+'" width="'+d.body[0]+'" height="'+d.body[1]+'" rx=".3" fill="#183540" stroke="#e6d3a8" stroke-width=".14"/><text text-anchor="middle" y="'+(-d.body[1]/2-1.4)+'" font-size="2.2" fill="#dffaff">'+escape(p.ref)+'</text></g>';});
K.allPads(b).forEach(p=>html+='<rect class="pad" data-test="'+escape(p.net)+'" x="'+(p.x-p.w/2)+'" y="'+(p.y-p.h/2)+'" width="'+p.w+'" height="'+p.h+'" rx=".12" fill="#f3cb88" stroke="#5f756e" stroke-width=".09"/>');
html+='<g fill="#a5e9d5" font-size="2.7"><text x="2" y="'+(b.height+3.4)+'">'+escape(b.title)+'</text><text x="'+(b.width-28)+'" y="'+(b.height+3.4)+'">F.Cu / B.Cu</text></g>';
svg.innerHTML=html;
svg.querySelectorAll("[data-part]").forEach(el=>el.addEventListener("click",()=>{let p=b.parts.find(x=>x.id===el.dataset.part);say(p.ref+" • "+(p.value||"")+". Electrical pads: "+JSON.stringify(p.nets));}));
svg.querySelectorAll("[data-test]").forEach(el=>el.addEventListener("click",()=>{let n=el.dataset.test;if(!T.NODES.includes(n))return;$(probe).value=n;say(probe.toUpperCase()+" probe connected to "+n+". Switch to Diagnose and take a reading.");probe=probe==="red"?"black":"red";}));
const c=K.check(b);$("drcResult").innerHTML='<div class="'+(c.errors?"bad":c.warnings?"warn":"good")+'">Training DRC: '+c.errors+' errors, '+c.warnings+' warnings, '+c.percent+'% net-pad connected. '+(c.issues[0]?escape(c.issues[0].message):"No geometric issues in this small training design.")+'</div>';
}
function renderScope(){const pts=T.oscilloscope(state,$("red").value),peak=Math.max(5.5,...pts.map(p=>p.v))+0.001;
const points=pts.map(p=>(42+p.t_ms/5*588).toFixed(1)+','+(165-p.v/peak*146).toFixed(1)).join(" ");
$("scopeSvg").innerHTML='<rect width="640" height="180" fill="#071f27"/>'+
Array.from({length:8},(_,i)=>'<path d="M'+(40+i*84)+' 5V175" stroke="#1c575b" opacity=".7"/>').join("")+
Array.from({length:5},(_,i)=>'<path d="M40 '+(18+i*36)+'H640" stroke="#1c575b" opacity=".7"/>').join("")+
'<polyline points="'+points+'" fill="none" stroke="#6bf6d6" stroke-width="2.2"/>'+
'<g fill="#b0d4d8" font-size="11"><text x="6" y="16">'+peak.toFixed(2)+' V</text><text x="6" y="168">0 V</text><text x="548" y="176">5 ms →</text></g>';
const h=T.thermal(state).sort((a,b)=>b.powerW-a.powerW);
$("thermal").innerHTML=h.map(x=>'<div>'+escape(x.part.toUpperCase())+' · '+(x.powerW*1000).toFixed(2)+' mW</div>').join("")||'<span class="small">Power disconnected.</span>';
}
function render(){
const r=T.snapshot(state),c=r.pcb;
$("supply").textContent=r.sourceVoltage.toFixed(2)+" V";
$("current").textContent=(r.sourceCurrent*1000).toFixed(2)+" mA";
$("connectivity").textContent=c.percent+"%";
$("led").textContent=r.ledOn?"ON":"OFF";
$("source").textContent=state.sourceOn?"POWER OFF":"POWER ON";
$("source").classList.toggle("primary",!state.sourceOn);
$("railTable").innerHTML=T.NODES.slice(1).map(n=>'<tr><td>'+n+'</td><td>'+r.volts[n].toFixed(4)+' V</td></tr>').join("");
$("drcBadge").innerHTML='<div><strong>'+c.errors+'</strong><span>DRC ERRORS</span></div><div><strong>'+c.warnings+'</strong><span>DRC WARNINGS</span></div>';
$("events").textContent=state.log.slice(-18).map(x=>String(x.index).padStart(2,"0")+' '+x.action+': '+x.detail).join("\n")||"No actions yet.";
$("qaMetrics").innerHTML='<div><strong>'+state.evidence.length+'</strong><span>PROBE OBSERVATIONS</span></div><div><strong>'+state.mistakes+'</strong><span>INCORRECT / UNSAFE ACTIONS</span></div><div><strong>'+(state.fixed?"YES":"NO")+'</strong><span>FAULT REPAIRED</span></div><div><strong>'+(state.verified?"PASS":"PENDING")+'</strong><span>QA VERIFICATION</span></div>';
renderSchematic();renderBoard();renderScope();
}
function start(){
let id=$("scenario").value;if(id==="challenge")id=pickFault();
let selectedBoard=state.board;state=T.make(selectedBoard,id);recent=null;
if(id==="trace_open"){state.board.tracks=state.board.tracks.filter(x=>x.id!=="t4"&&x.net!=="LED_A");}
$("meter").textContent="— — —";$("meterContext").textContent="Select DMM mode and two test points.";
$("diagnosis").value="";$("qaStatus").textContent="";
say("Training case loaded. Begin with schematic and PCB evidence. The case answer stays hidden until diagnosis.");show("design");
}
function read(){const out=T.measure(state,mode,$("red").value,$("black").value);recent=out;if(out.ok){$("meter").textContent=out.formatted;$("meterContext").textContent=mode+" • RED: "+out.red+" / BLACK: "+out.black;say("Measurement recorded. Compare more points to narrow your hypothesis.");}else{say(out.message,false);}render();}
function readStudio(){
try{let raw=localStorage.getItem("boardlab.pcb.project.v3");if(!raw)throw Error("No saved project. Open PCB DESIGN in the main simulator and save a project first.");
let b=K.validateImport(JSON.parse(raw)),required=["f1","c1","r1","d1","j1"];if(required.some(id=>!b.parts.some(p=>p.id===id)))throw Error("This electrical trainer currently supports the LED reference board only. Select the LED project in PCB Studio.");
state=T.make(b,"healthy");$("scenario").value="healthy";say("Saved LED project imported. Geometry and R1 changes now drive the digital twin.");render();}
catch(e){say(String(e.message||e),false);}}
function on(id,event,fn){$(id).addEventListener(event,fn);}
document.querySelectorAll("[data-tab]").forEach(x=>x.addEventListener("click",()=>show(x.dataset.tab)));
document.querySelectorAll("[data-mode]").forEach(x=>x.addEventListener("click",()=>{mode=x.dataset.mode;document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("primary",b===x));$("meterContext").textContent="Mode "+mode+" selected. Take a new measurement.";render();}));
on("startCase","click",start);
on("arm","click",()=>{const x=T.arm(state);say(x.message||"Safety preparation complete. The isolated low-voltage source can now be enabled.",x.ok);render();});
on("source","click",()=>{const x=T.power(state,!state.sourceOn);say(x.message||(state.sourceOn?"Source enabled; probe DC voltage only.":"Source disconnected; resistance checks are now permitted."),x.ok);render();});
on("applyResistor","click",()=>{let n=Number($("resistance").value);if(!Number.isFinite(n)||n<100||n>100000)return say("Resistance must be 100–100,000 Ω.",false);let p=state.board.parts.find(x=>x.id==="r1");if(!p)return say("Missing R1 footprint.",false);p.value=n+"Ω";state.verified=false;say("R1 is now "+n+" Ω in both schematic and DC model. Recheck current and power dissipation.");render();});
on("loadStudio","click",readStudio);
on("loadReference","click",()=>{state=T.make(K.routedExample(),"healthy");$("scenario").value="healthy";say("Known-good routed LED reference board loaded.");render();});
on("exportBoard","click",()=>download("boardlab-digital-twin-board.json",JSON.stringify(state.board,null,2),"application/json"));
on("exportKiCad","click",()=>{download("BOARDLAB_LED_TRAINER_UNVERIFIED.kicad_pcb",K.toKiCad(state.board));say("Experimental PCB exported. Verify netlist, footprints and native KiCad DRC before fabrication.");});
on("breakTrace","click",()=>{const x=state.board.tracks.find(t=>t.net==="LED_A");if(!x)return say("LED_A copper is already missing.",false);state.board.tracks=state.board.tracks.filter(t=>t.id!==x.id);state.fixed=false;state.verified=false;say("LED_A copper removed: connected design net is now physically open. Verify the change using measurements.");render();});
on("restoreTrace","click",()=>{const ref=K.routedExample().tracks.filter(t=>t.net==="LED_A"),old=state.board.tracks.filter(t=>t.net==="LED_A");if(old.length===0)state.board.tracks.push(...ref);state.verified=false;say("Training copper segment restored. Run DRC and new electrical measurements.");render();});
on("inspectDesign","click",()=>{const x=K.check(state.board);say("Training DRC found "+x.errors+" errors and "+x.warnings+" warnings. "+x.percent+"% electrically joined. This is not KiCad/fabrication signoff.",!x.errors);render();});
on("takeReading","click",read);
on("coach","click",()=>say(window.BoardCoach.hint(state,T.snapshot(state))));
on("submitDiagnosis","click",()=>{let p=$("diagnosis").value;if(!p)return say("Select a component or copper trace first.",false);if(state.evidence.length<2)return say("Take at least two measurements before diagnosing.",false);let x=T.diagnose(state,p);say(x.message,x.ok);render();});
on("repair","click",()=>{let x=T.repair(state,$("repairPart").value,$("repairTool").value);say(x.message,x.ok);render();});
on("qa","click",()=>{let x=T.verify(state);$("qaStatus").innerHTML='<div class="'+(x.ok?"good":"bad")+'">'+escape(x.message)+' Score: '+x.score+'/100.</div>';say(x.message,x.ok);render();if(x.ok){try{localStorage.setItem("boardlab.twin.lastReport.v4",JSON.stringify(T.learningReport(state)));}catch{}}});
on("report","click",()=>download("BOARDLAB_training_diagnostic_report.json",JSON.stringify(T.learningReport(state),null,2),"application/json"));
on("red","change",renderScope);on("black","change",render);
$("scenario").value="challenge";start();
})();