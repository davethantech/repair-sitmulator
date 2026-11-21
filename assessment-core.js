/* BOARD//LAB 5 graded PRACTICE assessments from actual engine state.
   No proctoring or certification. Scores are local and self-directed. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardAssessment=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const TASKS={
 factory_route:{title:"PCB: route and review an LED board",module:"factory",brief:"Use the routed 5 V LED reference. Show 100% joined copper and no basic DRC errors.",checks:[
 ["Connectivity verified",x=>x.factory?.designRuleResults?.connectivity===100,40],
 ["No DRC blocking errors",x=>x.factory?.designRuleResults?.errors===0,30],
 ["No abstract footprint blockers",x=>x.factory?.blockers===0,30]]},
 factory_guard:{title:"PCB: identify unmanufacturable USB-C concept",module:"factory",brief:"Select the USB-C conceptual training board and identify why it cannot be released.",checks:[
 ["Conceptual footprint is blocked",x=>x.factory?.issues?.some(i=>i.code==="abstract_footprint"&&i.severity==="blocker"),50],
 ["Manufacturer release remains disabled",x=>x.factory?.canRelease===false,25],
 ["Supplier documentation unresolved",x=>x.factory?.issues?.some(i=>i.code==="concept_connector"||i.code==="unknown_ordering_value"),25]]},
 mcu_blink:{title:"Embedded: execute four LED pulses",module:"embedded",brief:"Compile and run Blink with a healthy virtual MCU. Check R0, time and GPIO trace.",checks:[
 ["Program halted normally",x=>x.mcu?.reason==="HALT",20],
 ["Four loop iterations",x=>x.mcu?.regs?.[0]===4,30],
 ["Expected 1.6 s virtual duration",x=>x.mcu?.timeMs===1600,25],
 ["GPIO high and low executed repeatedly",x=>x.mcu?.trace?.filter(t=>t.op==="OUT"&&t.args?.includes("HIGH")).length>=4&&x.mcu?.trace?.filter(t=>t.op==="OUT"&&t.args?.includes("LOW")).length>=4,25]]},
 mcu_nack:{title:"Embedded: investigate sensor NACK",module:"embedded",brief:"Load Sensor, choose I2C NACK, run and inspect I/O error status.",checks:[
 ["Sensor read failed",x=>x.mcu?.ioErrors>0,50],
 ["Trace includes NACK evidence",x=>x.mcu?.trace?.some(t=>t.note==="NACK"),30],
 ["Program completed for analysis",x=>x.mcu?.reason==="HALT",20]]},
 mcu_brownout:{title:"Embedded: distinguish brownout reset",module:"embedded",brief:"Inject brownout and show a reset reason before useful firmware executes.",checks:[
 ["Brownout fault selected",x=>x.mcu?.fault==="brownout",20],
 ["Brownout reset recorded",x=>/Brownout reset/.test(x.mcu?.reason||""),60],
 ["No GPIO output during failed power-up",x=>(x.mcu?.duties?.[0]||0)===0,20]]},
 signal_match:{title:"Signal: matched transmission line",module:"signals",brief:"Match 50-ohm source, 50-ohm characteristic impedance and 50-ohm load; show no reflected overshoot.",checks:[
 ["Load reflection near zero",x=>Math.abs(x.signal?.parameters?.loadReflection??100)<.01,30],
 ["Source reflection near zero",x=>Math.abs(x.signal?.parameters?.sourceReflection??100)<.01,30],
 ["Overshoot negligible",x=>(x.signal?.overshootV??100)<.01,25],
 ["One-way delay calculated",x=>(x.signal?.parameters?.oneWayNs??0)>0,15]]},
 signal_unmatched:{title:"Signal: investigate positive reflection",module:"signals",brief:"Use zero-ohm driver, 50-ohm line and 100-ohm receiver. Find positive reflection and overshoot.",checks:[
 ["Positive load reflection",x=>(x.signal?.parameters?.loadReflection??0)>.25,30],
 ["Low-impedance driver",x=>(x.signal?.parameters?.sourceReflection??0)<-.9,25],
 ["Visible model overshoot",x=>(x.signal?.overshootV??0)>.5,30],
 ["Computed time samples",x=>(x.signal?.points?.length??0)>=100,15]]},
 rework_repair:{title:"Rework: replace SMD with acceptable thermal history",module:"rework",brief:"Remove, place and reflow the part. Cool below 90 C and inspect without bridge, corrosion or high heat damage.",checks:[
 ["Component removed and replaced",x=>x.rework?.removed===true&&x.rework?.replaced===true,25],
 ["Inspected joint passes training checks",x=>x.rework&&x.inspection?.passed===true,40],
 ["Pad health high",x=>(x.rework?.padHealth??0)>=90,20],
 ["Board cooled below handling threshold",x=>(x.rework?.padTempC??999)<90,15]]},
 rework_contamination:{title:"Rework: clear flux and bridge inspection defects",module:"rework",brief:"Prepare a bridged and corroded part, clean it, remove bridge and complete a safe inspection.",checks:[
 ["Corrosion cleanup recorded",x=>x.rework?.actions?.some(a=>a.includes("Cleaned")),30],
 ["Solder-bridge action recorded",x=>x.rework?.actions?.some(a=>a.includes("bridge")),30],
 ["No bridge and no corrosion remain",x=>x.rework?.bridge===false&&x.rework?.corrosion===false,40]]}
};
function grade(id,context){const task=TASKS[id];if(!task)throw Error("Unknown assessment");const results=task.checks.map(([label,check,points])=>{let ok=false;try{ok=check(context)===true;}catch{}return{label,points,achieved:ok?points:0,passed:ok};});
const score=results.reduce((n,r)=>n+r.achieved,0);return{id,title:task.title,module:task.module,score,outOf:100,passed:score>=85,results,recordType:"unproctored educational simulation",disclaimer:"Not a credential or proof of safe real-world repair competence"};
}
function report(grades){if(!Array.isArray(grades))throw Error("Practice grade list required");return{schema:"boardlab.assessments.v1",exportedAt:new Date().toISOString(),records:grades.slice(-300),notes:"Self-directed training, not accredited examination; replay with source-control version for reproducibility."};}
return{TASKS,grade,report};
});