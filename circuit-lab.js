/* BOARD//LAB 6 — circuit and schematic-to-board visual controller.
 * Read-only result renderers; every instrument value comes from the MNA model.
 * Browser-only. No dynamic code execution or external requests.
 */
(()=>{
"use strict";
const M=window.BoardMNA,P=window.BoardPCB,E=window.BoardERC,Spice=window.BoardMNASpice,Cal=window.BoardCalibration,$=id=>document.getElementById(id);
if(!M||!P||!E){document.body.textContent="Missing circuit or PCB solver modules";return;}
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(v,d=5)=>Number(v).toPrecision(d);
let dc=null,transient=null,model=null,board=P.routedExample(),schematic=E.schematicFromPCB(board),erc=null,focusPin=null;
const colour=(n)=>n==="0"?"#aaaec5":n==="GND"?"#b8dddd":n.includes("VIN")?"#f4b289":n.includes("LED")?"#e6d38a":"#80d9d1";
const download=(name,text,type="text/plain")=>{const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);};
function info(str,good=true,id="simStatus"){const e=$(id);e.textContent=str;e.classList.toggle("noticeBad",!good);}
function example(){
const key=$("example").value,base=M.EXAMPLES[key];$("circuitJson").value=JSON.stringify(base,null,2);
dc=null;transient=null;model=M.validate(base);renderCircuit();renderTable();$("iterations").textContent="—";$("pointCount").textContent="—";info("Loaded "+base.title+". Change component values, then solve. All readings are recomputed.");
}
function parseModel(){const raw=JSON.parse($("circuitJson").value);model=M.validate(raw);return raw;}
function showMode(name){document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("selected",x.dataset.mode===name));$("simulationTab").classList.toggle("hidden",name!=="simulate");$("ercTab").classList.toggle("hidden",name!=="erc");}
function renderCircuit(){
if(!model)return;
$("circuitTitle").textContent=model.title;$("nodeCount").textContent=model.nodes.length;$("partCount").textContent=model.components.length;
const nodes=["0",...model.nodes],centerX=470,centerY=200,RX=350,RY=132,coords={};
if(nodes.length===2){coords["0"]={x:120,y:315};coords[model.nodes[0]]={x:620,y:115};}
else nodes.forEach((n,i)=>{const angle=(i/(nodes.length))*2*Math.PI-1.2;coords[n]={x:centerX+RX*Math.cos(angle),y:centerY+RY*Math.sin(angle)};});
let svg='<defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#265c62"/></pattern></defs><rect width="940" height="400" fill="#082636"/><rect width="940" height="400" fill="url(#dots)"/>';
for(const c of model.components){
const a=coords[c.p==="GND"?"0":c.p],b=coords[c.n==="GND"?"0":c.n];if(!a||!b)continue;
const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
const p1={x:mx-ux*22,y:my-uy*22},p2={x:mx+ux*22,y:my+uy*22};
svg+='<path d="M'+a.x+' '+a.y+'L'+p1.x+' '+p1.y+'M'+p2.x+' '+p2.y+'L'+b.x+' '+b.y+'" stroke="'+colour(c.p)+'" stroke-width="2.5" fill="none"/>';
let shape=c.type==="R"?"<rect x='-19' y='-9' width='38' height='18' rx='2' fill='#203f48' stroke='#e5d1ad'/>":
c.type==="C"?"<path d='M-5 -14V14M5 -14V14' fill='none' stroke='#c2e3ee' stroke-width='3'/>":
c.type==="L"?"<path d='M-20 0 Q-15 -16 -10 0 Q-5 -16 0 0 Q5 -16 10 0 Q15 -16 20 0' fill='none' stroke='#bfe3d9' stroke-width='2.5'/>":
c.type==="V"?"<circle r='16' stroke='#e7d6a4' stroke-width='2' fill='#254552'/><path d='M0 -9V-1M-4 -5H4M-4 8H4' stroke='#fff5bd' stroke-width='2'/>":
c.type==="I"?"<circle r='16' stroke='#e7d6a4' stroke-width='2' fill='#254552'/><path d='M0 9V-9M-4 -4L0 -9L4 -4' stroke='#fff5bd' stroke-width='2' fill='none'/>":
c.type==="D"?"<path d='M-12 -13L9 0L-12 13Z M12 -13V13' stroke='#e2d9a9' stroke-width='2' fill='#1a5a50'/>":
"<rect x='-17' y='-15' width='34' height='30' rx='5' fill='#243f59' stroke='#84ddcc'/><text y='4' text-anchor='middle' fill='#eafff0' font-size='10'>"+c.type+"</text>";
svg+='<g transform="translate('+mx+' '+my+') rotate('+(Math.atan2(dy,dx)*180/Math.PI)+')" data-part="'+esc(c.id)+'" tabindex="0" role="button" aria-label="'+esc(c.type+" "+c.id)+'">'+shape+'</g>';
svg+='<text x="'+(mx+10)+'" y="'+(my-24)+'" fill="#f5ddab" font-size="12" font-family="monospace">'+esc(c.id)+" ("+esc(c.type)+")"+'</text>';
if(c.g&&coords[c.g])svg+='<path d="M'+coords[c.g].x+' '+coords[c.g].y+' L'+mx+' '+my+'" stroke="#f3bba4" stroke-width="1.7" stroke-dasharray="5 3"/>';
}
for(const [name,n] of Object.entries(coords)){
svg+='<g data-node="'+esc(name)+'" tabindex="0" role="button"><circle cx="'+n.x+'" cy="'+n.y+'" r="9" fill="#0e282c" stroke="'+colour(name)+'" stroke-width="3"/><text x="'+n.x+'" y="'+(n.y-17)+'" text-anchor="middle" font-size="13" font-weight="bold" fill="#dbf4ed">'+esc(name)+'</text></g>';
}
$("circuitSvg").innerHTML=svg;
$("circuitSvg").querySelectorAll("[data-part]").forEach(e=>e.addEventListener("click",()=>{const c=model.components.find(c=>c.id===e.dataset.part);info(c.id+" "+c.type+" "+c.p+" → "+c.n+" "+(c.value!==undefined?JSON.stringify(c.value):"")+". Edit its JSON properties and re-run.");}));
$("circuitSvg").querySelectorAll("[data-node]").forEach(e=>e.addEventListener("click",()=>{$("traceNode").value=e.dataset.node;drawWave();}));
const selected=$("traceNode").value,opts=nodes.filter(n=>n!=="0");
$("traceNode").innerHTML=opts.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join("");$("traceNode").value=opts.includes(selected)?selected:opts[opts.length-1];
drawWave();
}
function renderTable(){
$("dcTable").innerHTML=dc?Object.entries(dc.nodes).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+fmt(v,6)+'</td></tr>').join(""):'<tr><td colspan="2">Run DC operating point</td></tr>';
$("currentTable").innerHTML=dc?Object.entries(dc.currents).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+fmt(v,5)+'</td></tr>').join(""):'<tr><td colspan="2">Pending calculation</td></tr>';
}
function calculateDC(){
try{const c=parseModel();dc=M.solveDC(c);renderCircuit();renderTable();$("iterations").textContent=dc.iterations;info("DC solve converged in "+dc.iterations+" Newton iterations. Current directions are from p terminal to n terminal; negative voltage-source current indicates delivery.");}
catch(e){dc=null;renderTable();info("DC solver error: "+e.message,false);}
}
function calculateTransient(){
try{const c=parseModel(),stepS=Number($("dt").value),durationS=Number($("duration").value);transient=M.simulateTransient(c,{stepS,durationS});dc=M.solveDC(c);renderCircuit();renderTable();$("pointCount").textContent=transient.points.length;$("iterations").textContent=transient.points.at(-1)?.iterations||"—";info("Calculated "+transient.points.length+" time steps with Backward Euler and nonlinear iteration. Waveform and branch currents derive from the same circuit graph.");}
catch(e){transient=null;drawWave();info("Transient solver error: "+e.message,false);}
}
function drawWave(){
const svg=$("waveSvg");if(!transient||!transient.points?.length){svg.innerHTML='<rect width="940" height="260" fill="#071e2a"/><text x="470" y="132" fill="#8faeb7" font-size="17" text-anchor="middle">Run a transient experiment to show calculated node voltage</text>';return;}
const node=$("traceNode").value,pts=transient.points.map(p=>({t:p.timeS*1000,v:p.nodes[node]??0})),maxT=pts.at(-1).t,values=pts.map(p=>p.v),low=Math.min(0,...values),high=Math.max(.1,...values),pad=(high-low)*.12,minY=low-pad,maxY=high+pad;
const X=t=>54+t/maxT*860,Y=v=>18+(maxY-v)/(maxY-minY)*208;
let svgText='<rect width="940" height="260" fill="#071e2a"/>';
for(let i=0;i<=6;i++){const y=18+i*208/6;svgText+='<path d="M54 '+y+'H923" stroke="#265660"/><text x="8" y="'+(y+5)+'" fill="#acd0cf" font-size="11">'+fmt(maxY-(maxY-minY)*i/6,3)+'</text>';}
for(let i=0;i<=8;i++){const x=54+i*860/8;svgText+='<path d="M'+x+' 18V226" stroke="#265660"/><text x="'+(x-10)+'" y="247" fill="#acd0cf" font-size="11">'+fmt(maxT*i/8,3)+'</text>';}
const path=pts.map((p,i)=>(i?"L":"M")+X(p.t).toFixed(2)+" "+Y(p.v).toFixed(2)).join(" ");
svgText+='<path d="'+path+'" stroke="#74edd6" stroke-width="2.6" fill="none"/><text x="66" y="16" fill="#d8f4e8" font-size="12">'+esc(node)+" (V) vs time (ms)"+'</text>';
svg.innerHTML=svgText;
}
const ercN=net=>net==="GND"?"#a9e4d5":net.includes("LED")?"#efca88":net.includes("VIN")?"#f9a59b":"#79baf0";
function selectPin(key){focusPin=key;$("ercPin").value=key;const [ref,pin]=key.split("."),symbol=schematic.symbols.find(x=>x.ref===ref),record=symbol?.pins.find(p=>p.number===pin);$("ercNet").value=record?.net||"";drawERC();}
function loadBoard(){
board=$("ercTemplate").value==="routed"?P.routedExample():P.getTemplate($("ercTemplate").value);
schematic=E.schematicFromPCB(board);focusPin=null;
$("ercTitle").textContent=board.title;$("ercSvg").setAttribute("viewBox",[-3,-3,board.width+6,board.height+6].join(" "));
const pins=schematic.symbols.flatMap(s=>s.pins.map(p=>({key:s.ref+"."+p.number,net:p.net})));
$("ercPin").innerHTML=pins.map(p=>'<option value="'+esc(p.key)+'">'+esc(p.key)+" · "+esc(p.net)+'</option>').join("");
if(pins.length)selectPin(pins[0].key);runERC();
}
function drawERC(){
let b=board,markup='<rect x="0" y="0" width="'+b.width+'" height="'+b.height+'" fill="#166659" stroke="#9edac6" stroke-width=".4" rx="2"/>';
for(const t of b.tracks)markup+='<polyline points="'+t.points.map(p=>p.x+','+p.y).join(" ")+'" fill="none" stroke="'+ercN(t.net)+'" stroke-width="'+t.width+'" opacity="'+(t.layer==="B.Cu"?.6:1)+'"/>';
for(const part of b.parts){const d=P.COMPONENTS[part.type];if(!d)continue;markup+='<g transform="translate('+part.x+' '+part.y+') rotate('+part.angle+')"><rect x="'+(-d.body[0]/2)+'" y="'+(-d.body[1]/2)+'" width="'+d.body[0]+'" height="'+d.body[1]+'" fill="#17404b" stroke="#bad5b8" stroke-width=".12"/><text text-anchor="middle" y="'+(-d.body[1]/2-1.2)+'" fill="#def6eb" font-size="2">'+esc(part.ref)+'</text></g>';}
for(const pad of P.allPads(b)){const key=pad.ref+"."+pad.pin,sel=focusPin===key;
markup+='<rect data-pin="'+esc(key)+'" x="'+(pad.x-pad.w/2)+'" y="'+(pad.y-pad.h/2)+'" width="'+pad.w+'" height="'+pad.h+'" fill="'+(sel?"#ffb58c":"#e8d18e")+'" stroke="'+(sel?"#ff6c5c":"#40534b")+'" stroke-width="'+(sel?".3":".09")+'"><title>'+esc(key+" → "+pad.net)+'</title></rect>';
}
$("ercSvg").innerHTML=markup;
$("ercSvg").querySelectorAll("[data-pin]").forEach(p=>p.addEventListener("click",()=>selectPin(p.dataset.pin)));
$("ercPins").innerHTML='<table class="readings"><thead><tr><th>Pin</th><th>Schematic net</th><th>Electrical</th></tr></thead><tbody>'+schematic.symbols.flatMap(s=>s.pins.map(p=>'<tr><td>'+esc(s.ref+"."+p.number)+'</td><td>'+esc(p.net)+'</td><td>'+esc(p.electrical)+'</td></tr>')).join("")+'</tbody></table>';
}
function runERC(){
try{erc=E.check(schematic,board);$("ercErrors").textContent=erc.errors;$("ercWarnings").textContent=erc.warnings;$("ercReviews").textContent=erc.reviews;$("ercConnected").textContent=erc.connectedNetCount;
$("ercIssues").innerHTML=erc.issues.slice(0,110).map(i=>'<div class="ercFlag '+esc(i.severity)+'"><strong>'+esc(i.code)+'</strong><div>'+esc(i.message)+'</div></div>').join("")||'<div class="ercFlag">Training checker detected no discrepancies. Native CAD verification still required.</div>';
const message=erc.errors?erc.errors+" electrical errors detected; correct schematic/physical mismatches before progressing.":"No electrical errors in the training schema. "+erc.reviews+" supplier/part-number reviews remain before physical fabrication.";
info(message,!erc.errors,"ercStatus");drawERC();
}catch(e){info("ERC checker failed: "+e.message,false,"ercStatus");}
}
function updateNet(){
try{const [ref,pin]=$("ercPin").value.split("."),net=$("ercNet").value.trim();schematic=E.reviseNet(schematic,ref,pin,net);runERC();}catch(e){info(e.message,false,"ercStatus");}
}
function init(){
document.querySelectorAll("[data-mode]").forEach(x=>x.addEventListener("click",()=>showMode(x.dataset.mode)));
$("loadExample").addEventListener("click",example);$("example").addEventListener("change",example);
$("runDc").addEventListener("click",calculateDC);$("runTransient").addEventListener("click",calculateTransient);$("traceNode").addEventListener("change",drawWave);
$("exportSpice").addEventListener("click",()=>{try{const c=parseModel();const analysis=transient?"tran":"op",deck=Spice.build(c,{analysis,stepS:Number($("dt").value),durationS:Number($("duration").value)});download("BOARDLAB_unverified_"+analysis+".cir",deck,"text/plain");info("Exported an inspectable native ngspice deck. Numerical results and vendor models require external verification.");}catch(e){info(e.message,false);}});
$("exampleGolden").addEventListener("click",()=>{try{const circuit=parseModel(),fixture=Cal.syntheticFixture(circuit,"transient");download("BOARDLAB_SYNTHETIC_REFERENCE_NOT_BENCH_DATA.json",JSON.stringify(fixture,null,2),"application/json");$("goldenStatus").textContent="Synthetic fixture generated for solver regression only. It is not calibrated data.";}catch(e){$("goldenStatus").textContent=e.message;}});
$("compareGolden").addEventListener("click",async()=>{
 const file=$("goldenFile").files?.[0];if(!file){$("goldenStatus").textContent="Choose a JSON reference dataset with explicit provenance.";return;}
 if(file.size>150000){$("goldenStatus").textContent="Dataset exceeds 150 kB upload safety limit.";return;}
 try{
  const source=JSON.parse(await file.text()),result=Cal.compare(source);
  const badge=result.passed?"NUMERICAL PASS":"NUMERICAL FAIL";
  $("goldenStatus").textContent=badge+" — "+result.failed+"/"+result.observations+" measurements outside tolerance; maximum absolute error "+result.maxAbsErrorV.toFixed(5)+" V; RMSE "+result.rmseV.toFixed(5)+" V. "+result.referenceType+". Manufacturer-qualified: NO. Physical calibration certified: NO.";
 }catch(e){$("goldenStatus").textContent="Calibration comparison error: "+e.message;}
});
$("exportSpec").addEventListener("click",()=>{try{const data=parseModel();download("BOARDLAB_circuit_experiment.json",JSON.stringify(data,null,2),"application/json");}catch(e){info(e.message,false);}});
$("exportWave").addEventListener("click",()=>{if(!transient)return info("Calculate a transient waveform first",false);const node=$("traceNode").value;download("BOARDLAB_transient_"+node+".csv","time_s,voltage_v\n"+transient.points.map(p=>p.timeS+","+(p.nodes[node]??0)).join("\n")+"\n","text/csv");});
$("loadPcb").addEventListener("click",loadBoard);$("ercTemplate").addEventListener("change",loadBoard);$("ercRun").addEventListener("click",runERC);
$("ercPin").addEventListener("change",()=>selectPin($("ercPin").value));
$("updateNet").addEventListener("click",updateNet);$("restoreNet").addEventListener("click",loadBoard);
$("exportNetlist").addEventListener("click",()=>download("BOARDLAB_schematic_netlist.json",JSON.stringify(E.exportNetlist(schematic),null,2),"application/json"));
$("exportBoard").addEventListener("click",()=>download("BOARDLAB_board_project.json",JSON.stringify(board,null,2),"application/json"));
example();calculateDC();loadBoard();showMode("simulate");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();