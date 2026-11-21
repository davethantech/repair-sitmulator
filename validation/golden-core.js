/* BOARD//LAB 6 reference-measurement comparison engine.
 * Requires explicit provenance. Synthetic self-tests never count as real-world
 * validation, even when error=0. No automatic manufacturing qualification.
 */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("../simulation/mna-core.js"):root.BoardMNA);if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardCalibration=api;})(typeof globalThis!=="undefined"?globalThis:this,function(M){
"use strict";
const real=(v,min,max,label)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+" must be "+min+"…"+max);return n;};
function validate(raw){
 if(!raw||raw.schema!=="boardlab.golden.v1"||typeof raw!=="object")throw Error("Unsupported reference dataset");
 const c=M.validate(raw.circuit);
 if(!["op","transient"].includes(raw.analysis))throw Error("Analysis must be op or transient");
 if(!raw.provenance||typeof raw.provenance.source!=="string"||!raw.provenance.source.trim()||raw.provenance.source.length>150)throw Error("Reference data source required");
 if(!["synthetic","physical"].includes(raw.provenance.kind))throw Error("Provenance kind must identify synthetic or physical source");
 if(raw.provenance.kind==="physical"&&(!raw.provenance.instrument||!raw.provenance.date||!raw.provenance.operator||!raw.provenance.boardRevision))throw Error("Physical measurements need instrument, date, operator and board revision");
 if(!Array.isArray(raw.probes)||raw.probes.length<1||raw.probes.length>25)throw Error("1–25 probe datasets required");
 const nodes=new Set(["0",...c.nodes]);
 const tolerance=raw.tolerance||{},absV=real(tolerance.absV??.05,0,10,"Absolute tolerance"),relative=real(tolerance.relative??.01,0,.5,"Relative tolerance");
 let stepS=0,durationS=0;
 if(raw.analysis==="transient"){stepS=real(raw.options?.stepS??1e-5,1e-9,1,"Time step");durationS=real(raw.options?.durationS??.005,stepS,100,"Duration");if(durationS/stepS>3000)throw Error("Transient comparison limited to 3,000 model steps");}
 for(const probe of raw.probes){
   if(!nodes.has(probe.node))throw Error("Probe references unknown circuit net "+probe.node);
   if(!Array.isArray(probe.samples)||probe.samples.length<1||probe.samples.length>1000)throw Error("Each probe needs 1–1,000 sample points");
   let last=-Infinity;
   for(const sample of probe.samples){
     const time=real(sample.tS??0,0,100,"Probe timestamp"),val=real(sample.volts,-1e6,1e6,"Measured volts");
     if(time<=last)throw Error("Probe sample times must be strictly increasing");
     if(raw.analysis==="transient"&&time>durationS+1e-10)throw Error("Measurement exceeds simulation duration");
     last=time;
   }
 }
 return{c,tolerance:{absV,relative},stepS,durationS};
}
function interpolated(points,time,node){
 if(time<=points[0].timeS)return points[0].nodes[node];
 if(time>=points.at(-1).timeS)return points.at(-1).nodes[node];
 let lo=0,hi=points.length-1;
 while(hi-lo>1){const k=(lo+hi)>>1;if(points[k].timeS<time)lo=k;else hi=k;}
 const a=points[lo],b=points[hi],q=(time-a.timeS)/(b.timeS-a.timeS);
 return a.nodes[node]+q*(b.nodes[node]-a.nodes[node]);
}
function compare(raw){
 const options=validate(raw),data=raw.analysis==="op"?M.solveDC(raw.circuit):M.simulateTransient(raw.circuit,{stepS:options.stepS,durationS:options.durationS});
 const rows=[];
 for(const probe of raw.probes)for(const sample of probe.samples){
  const predicted=raw.analysis==="op"?data.nodes[probe.node]:interpolated(data.points,sample.tS??0,probe.node);
  const measured=sample.volts,error=predicted-measured;
  const budget=options.tolerance.absV+options.tolerance.relative*Math.abs(measured);
  rows.push({node:probe.node,timeS:sample.tS??0,measuredV:measured,simulatedV:predicted,errorV:error,toleranceV:budget,withinTolerance:Math.abs(error)<=budget});
 }
 const failed=rows.filter(x=>!x.withinTolerance);
 const rootMeanSquare=Math.sqrt(rows.reduce((a,x)=>a+x.errorV*x.errorV,0)/rows.length);
 const maxAbsError=Math.max(...rows.map(x=>Math.abs(x.errorV)));
 return{dataset:String(raw.provenance.source),kind:raw.provenance.kind,analysis:raw.analysis,observations:rows.length,passed:failed.length===0,failed:failed.length,
  rmseV:rootMeanSquare,maxAbsErrorV:maxAbsError,tolerance:options.tolerance,rows,
  referenceType:raw.provenance.kind==="physical"?"USER-DECLARED PHYSICAL REFERENCE — NOT INDEPENDENTLY AUDITED":"SYNTHETIC MODEL SELF-CHECK",
  manufacturerApproved:false,calibratedAgainstRealHardware:false,
  warning:"A numerical fit does not prove component model validity, data authenticity, electrical safety, or fabrication readiness. Independent calibrated laboratory review required."};
}
function syntheticFixture(circuit=M.EXAMPLES.rc,analysis="transient"){
 const clean=JSON.parse(JSON.stringify(circuit));let sample;
 if(analysis==="op"){const x=M.solveDC(clean);sample=[{node:"OUT",samples:[{tS:0,volts:x.nodes.OUT}]}];}
 else {
  const t=M.simulateTransient(clean,{stepS:1e-5,durationS:.005});
  sample=[{node:"OUT",samples:[9,49,99,199,299,499].map(i=>({tS:t.points[i].timeS,volts:t.points[i].nodes.OUT}))}];
 }
 return{schema:"boardlab.golden.v1",analysis,circuit:clean,options:{stepS:1e-5,durationS:.005},
  provenance:{kind:"synthetic",source:"BOARDLAB generated regression fixture (not bench data)"},
  tolerance:{absV:.03,relative:.005},probes:sample};
}
return{validate,compare,syntheticFixture};
});