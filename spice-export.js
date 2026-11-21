/* Optional external ngspice bridge for the low-voltage LED trainer.
   Generated netlists are inspection artifacts; models are approximate.
   No OEM board/USB-C, charger, high-speed, or safety-critical SPICE claims. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./pcb-core.js"):root.BoardPCB);
if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardSpice=api;})(typeof globalThis!=="undefined"?globalThis:this,function(PCB){
"use strict";
const allowable=new Set(["healthy","fuse_open","output_short","contact_resistance","led_open","resistor_open","return_open","trace_open"]);
function ohms(text){const m=String(text||"1k").match(/^(\d+(?:\.\d+)?)\s*([kKmM]?)/);if(!m)return 1000;return Number(m[1])*({k:1000,K:1000,m:.001,M:1000000}[m[2]]||1);}
function makeNetlist(board,scenario="healthy"){
board=PCB.validateImport(board);if(!allowable.has(scenario))throw Error("Unknown training fault");
for(const id of ["j1","f1","r1","d1","c1"])if(!board.parts.some(p=>p.id===id))throw Error("SPICE exporter supports only LED reference topology.");
const drc=PCB.check(board);let openTrace=(drc.groupsByNet.LED_A||0)>1||(drc.groupsByNet.VIN_5V||0)>1||(drc.groupsByNet.VCC_PROTECTED||0)>1;
const r1=board.parts.find(x=>x.id==="r1"),R=ohms(r1.value);if(!Number.isFinite(R)||R<.001||R>1e8)throw Error("R1 outside training model limits.");
const resistorFault=scenario==="resistor_open"||openTrace||scenario==="trace_open"?1e10:R;
const fuseFault=scenario==="fuse_open"?1e10:.12;
const srcR=scenario==="contact_resistance"?18:.25;
const capR=scenario==="output_short"?.07:100000;
const diodeOpen=scenario==="led_open"||scenario==="return_open"?1e10:12;
return[
"* BOARD//LAB 4 — generated LED example, not production-verified",
"* Nonlinear diode is modeled as an idealized 1.9 V knee plus a dynamic resistor.",
"* For faults the browser engine additionally enforces an explicit 0.8 A source limit;",
"* this SPICE netlist uses the equivalent reference source only, not the limiting algorithm.",
"V1 SUPPLY 0 DC 5",
"RSRC SUPPLY VIN_5V "+srcR,
"RF1 VIN_5V VCC_PROTECTED "+fuseFault,
"RR1 VCC_PROTECTED LED_A "+resistorFault,
"RCAP VCC_PROTECTED 0 "+capR,
"VDIODE_KNEE DREF 0 DC 1.9",
"RDIODE LED_A DREF "+diodeOpen,
".op",
".print op V(VIN_5V) V(VCC_PROTECTED) V(LED_A)",
".end"
].join("\n")+"\n";
}
return{makeNetlist};
});