"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const M=require("../simulation/mna-core.js"),P=require("../pcb-core.js"),E=require("../cad/erc-core.js"),Spice=require("../simulation/export-spice.js"),A=require("../mechanical/assembly-core.js");
const code=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
function harness(defs={},withCanvas=false){
const nodes=new Map(),make=id=>({
 id,value:defs[id]??"",checked:defs[id]?.checked||false,
 textContent:"",innerHTML:"",style:{},dataset:{},classList:{toggle(){}},
 listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},
 querySelectorAll(){return[];},setAttribute(){},click(){this.listeners.click?.();},
 getBoundingClientRect(){return{width:900,height:620,left:0,top:0};},
 setPointerCapture(){},getContext(){return withCanvas?new Proxy({},{get:(o,k)=>o[k]||(()=>{})}):null;}
});
const doc={readyState:"complete",body:{},getElementById(id){if(!nodes.has(id))nodes.set(id,make(id));return nodes.get(id);},querySelectorAll(){return[];},addEventListener(){}};
const window={devicePixelRatio:1,addEventListener(){}},context={window,document:doc,URL:{createObjectURL(){return"blob:test";},revokeObjectURL(){}},Blob:class Blob{},setTimeout(){},console};
return{doc,window,context,el:id=>doc.getElementById(id)};
}
{
const h=harness({example:"divider",traceNode:"OUT",dt:".00001",duration:".005",ercTemplate:"routed",ercPin:"J1.1"});
Object.assign(h.window,{BoardMNA:M,BoardPCB:P,BoardERC:E,BoardMNASpice:Spice});
vm.runInNewContext(code("circuit-lab.js"),h.context,{timeout:3000});
assert.ok(h.el("circuitSvg").innerHTML.includes("R1"));
assert.ok(h.el("dcTable").innerHTML.includes("2.50000"));
assert.equal(h.el("ercErrors").textContent,0);
h.el("runTransient").click();assert.equal(h.el("pointCount").textContent,500);
assert.ok(h.el("waveSvg").innerHTML.includes("path"));
h.el("ercNet").value="GND";h.el("updateNet").click();
assert.ok(Number(h.el("ercErrors").textContent)>0,"Schematic pad mismatch is real");
h.el("example").value="nmos";h.el("loadExample").click();h.el("runDc").click();
assert.match(h.el("dcTable").innerHTML,/DRAIN/);
}
{
const h=harness({yaw:"-32",pitch:"43",zoom:"99",showExploded:{checked:true},seeThrough:{checked:true},showScrews:{checked:true},partSelect:"cover",screwSelect:"C1",cableSelect:"BAT",torque:".18"},true);
h.window.BoardAssembly=A;
vm.runInNewContext(code("mechanical/mechanical-ui.js"),h.context,{timeout:3000});
assert.ok(h.el("removeScrew").listeners.click,"Screw interaction wired");
assert.match(h.el("nextStep").textContent,/C1/);
h.el("removePart").click();
assert.match(h.el("pickedDesc").textContent,/Remove every cover screw/);
for(let i=0;i<100;i++){if(h.el("nextStep").textContent.includes("Perform mechanical QA"))break;h.el("guided").click();}
assert.match(h.el("qaIssues").textContent,/PASS/);
assert.equal(h.el("countRemoved").textContent,"0/7");
assert.equal(h.el("countScrews").textContent,"0/23");
assert.equal(h.el("countCables").textContent,"0/5");
h.el("togglePower").click();
assert.match(h.el("sceneStatus").textContent,/POWER ON/);
}
console.log("PASS v6 UI: nonlinear circuit and ERC interactions, 3D assembly full guided teardown/rebuild and power-on");
