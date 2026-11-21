/* BOARD//LAB 6 — server-side reproducible engineering assessment.
 * Recompute all scores from submitted circuit/board/program/action traces.
 * NO client-provided score, certificate, exam accreditation or OEM validation.
 */
"use strict";
const M=require("../simulation/mna-core.js"),P=require("../pcb-core.js"),
 ERC=require("../cad/erc-core.js"),A=require("../mechanical/assembly-core.js"),
 F=require("../factory-core.js"),U=require("../embedded-core.js"),S=require("../signal-core.js"),
 R=require("../rework-core.js"),G=require("../assessment-core.js");
const TASKS=[
 {id:"divider",title:"DC resistive divider",group:"simulation"},
 {id:"rc",title:"RC time-domain step response",group:"simulation"},
 {id:"diode",title:"Exponential diode operating point",group:"simulation"},
 {id:"mosfet",title:"NMOS switching and off-state diagnosis",group:"simulation"},
 {id:"erc",title:"Schematic-to-board electrical consistency",group:"pcb"},
 {id:"assembly",title:"Mechanical disassembly and return to service",group:"3d"},
 ...Object.entries(G.TASKS).map(([id,t])=>({id,title:t.title,group:t.module}))
];
function grade(task,payload){
 if(!TASKS.some(t=>t.id===task))throw Error("Unsupported engineering practical");
 if(!payload||typeof payload!=="object"||Array.isArray(payload))throw Error("Assessment payload required");
 const checklist=[],add=(label,condition,points)=>checklist.push({label,passed:condition===true,points,achieved:condition===true?points:0});
 let model={};
 if(task==="divider"||task==="rc"||task==="diode"||task==="mosfet"){
  const raw=payload.circuit;const c=M.validate(raw);
  const idTypes=c.components.map(x=>x.type);
  const dc=M.solveDC(raw);
  if(task==="divider"){
   add("R-R voltage divider has two resistors",idTypes.filter(x=>x==="R").length>=2,15);
   add("Known 5 V input",Math.abs((dc.nodes.IN??0)-5)<.05,20);
   add("Expected 2.5 V output",Math.abs((dc.nodes.OUT??0)-2.5)<.08,45);
   add("Current within trainer range",Math.abs(dc.currents.R1??1)<.006,20);
  }
  if(task==="diode"){
   add("Nonlinear diode included",idTypes.includes("D"),25);
   add("Clamped output measured",dc.nodes.OUT>.5&&dc.nodes.OUT<1.5,30);
   add("KCL current agreement",Math.abs((dc.currents.R1??1)-(dc.currents.D1??0))<.00001,30);
   add("Voltage source 4.5–5.5 V",dc.nodes.IN>4.5&&dc.nodes.IN<5.5,15);
  }
  if(task==="rc"){
   if(!idTypes.includes("C"))throw Error("RC task requires capacitor");
   const transient=M.simulateTransient(raw,{stepS:.00001,durationS:.005});
   const v1=transient.points[99].nodes.OUT??0,v5=transient.points.at(-1).nodes.OUT??0;
   add("RC topology contains resistor and capacitor",idTypes.includes("R")&&idTypes.includes("C"),20);
   add("Expected ~63% at 1 ms",Math.abs(v1-5*(1-Math.exp(-1)))<.20,40);
   add("Output settles near 5 V",v5>4.8&&v5<5.2,30);
   add("Finite calculated trace",transient.points.every(x=>Number.isFinite(x.nodes.OUT)),10);
   model={at1ms:v1,at5ms:v5};
  }
  if(task==="mosfet"){
   const gate=c.components.find(x=>x.id==="VG"&&x.type==="V");
   if(!gate)throw Error("NMOS task requires a VG source");
   const switchOn=dc.nodes.DRAIN??100,other=JSON.parse(JSON.stringify(raw));other.components.find(x=>x.id==="VG").value=0;
   const switchOff=M.solveDC(other).nodes.DRAIN??-100;
   add("Actual NMOS modeled",idTypes.includes("NMOS"),25);
   add("Gate-on drain near ground",switchOn>=0&&switchOn<.35,40);
   add("Gate-off drain returns high",switchOff>4.5&&switchOff<5.5,25);
   add("Full source voltage available",dc.nodes.VIN>4.5&&dc.nodes.VIN<5.5,10);
   model={onV:switchOn,offV:switchOff};
  }
  model={...model,dcVoltages:dc.nodes};
 }else if(task==="erc"){
  const b=P.validateImport(payload.board),s=ERC.validate(payload.schematic),r=ERC.check(s,b);
  add("No pin/net mismatches",r.errors===0,40);
  add("No unconnected routing warnings",r.pcbStatus.errors===0&&r.pcbStatus.warnings===0,25);
  add("Schematic includes at least four unique nets",r.connectedNetCount>=4,20);
  add("Physical pins and footprints present",r.matchingSymbols>=5,15);
  model={errors:r.errors,warnings:r.warnings,manufacturerVerified:r.manufacturerVerified,releaseApproved:false};
 }else if(task==="assembly"){
  const ops=payload.actions;
  if(!Array.isArray(ops)||ops.length>180)throw Error("Assembly actions must be an array of ≤180 steps");
  const s=A.make(),allActions={adapter:(x)=>A.adapter(s,x.on),power:(x)=>A.power(s,x.on),
   loosen:x=>A.loosen(s,x.id),tighten:x=>A.tighten(s,x.id,x.torque),
   latch:x=>A.latch(s,x.id,x.open),cable:x=>A.cable(s,x.id,x.disconnect),
   remove:x=>A.remove(s,x.id),install:x=>A.install(s,x.id),paste:()=>A.paste(s)};
  let errors=0;
  for(const x of ops){if(!x||typeof x.action!=="string"||!allActions[x.action])throw Error("Unsupported assembly event");
    const out=allActions[x.action](x);if(!out.ok)errors++;
  }
  const qa=A.verify(s),lifted=new Set(s.log.filter(x=>x.ok&&x.type==="remove").map(x=>x.id)),
    screwsOut=new Set(s.log.filter(x=>x.ok&&x.type==="screw").map(x=>x.id)),
    isolated=s.log.some(x=>x.ok&&x.type==="cable"&&x.id==="BAT"&&x.message.startsWith("Disconnected"));
  add("Full seven-part teardown performed",lifted.size===7,25);
  add("All 23 fasteners removed during teardown",screwsOut.size===23,20);
  add("Battery isolated during service",isolated,15);
  add("Reassembled in correct mechanical state",qa.ok,30);
  add("No invalid action or overtightening",errors===0&&s.damage.length===0,10);
  model={actions:ops.length,invalidActions:errors,qaPass:qa.ok,mechanicalDamage:s.damage};
 }else{
   let ctx={};
   if(task.startsWith("factory_")){
     const b=P.validateImport(payload.board);ctx.factory=F.report(b);
   }else if(task.startsWith("mcu_")){
     const opts=payload.options||{},s=U.make(payload.source,opts);U.run(s,300);ctx.mcu=s;
   }else if(task.startsWith("signal_")){
     ctx.signal=S.waveform(payload.parameters);
   }else if(task.startsWith("rework_")){
     const s=R.make(payload.options||{}),actions=payload.actions;
     if(!Array.isArray(actions)||actions.length>90)throw Error("Rework action list too long");
     const funcs={heat:(x)=>R.heat(s,x.params,x.seconds),cool:(x)=>R.cool(s,x.seconds),
      flux:()=>R.applyFlux(s),clean:()=>R.clean(s),remove:()=>R.remove(s),place:()=>R.place(s),bridge:()=>R.bridge(s)};
     for(const x of actions){if(!x||typeof x.action!=="string"||!funcs[x.action])throw Error("Unsupported rework action");funcs[x.action](x);}
     ctx.rework=s;ctx.inspection=R.inspect(s);
   }
   const result=G.grade(task,ctx);for(const c of result.results)add(c.label,c.passed,c.points);
   model={calculatedChecks:result.results.length};
 }
 const score=checklist.reduce((n,x)=>n+x.achieved,0),maxScore=checklist.reduce((n,x)=>n+x.points,0);
 return{task,score,outOf:maxScore,passed:score>=.85*maxScore,checks:checklist,model,assessmentType:"server-recomputed unproctored educational practical",manufacturerQualified:false,accredited:false};
}
module.exports={TASKS,grade};