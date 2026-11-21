/* BOARD//LAB 6 — restricted, inspectable ngspice deck exporter.
 * Translates supported compact teaching topologies; physical model correlation
 * and ngspice numerical equivalence MUST be checked independently. */
(function(root,factory){
 const api=factory(typeof module==="object"&&module.exports?require("./mna-core.js"):root.BoardMNA);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardMNASpice=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(M){
"use strict";
const numeric=x=>Number(x).toExponential(9);
const node=x=>x==="GND"||x==="gnd"?"0":x;
function sourceValue(v){
 if(typeof v==="number")return"DC "+numeric(v);
 if(v&&Array.isArray(v.step)){const [t,a,b]=v.step;return"DC "+numeric(a)+" PWL(0 "+numeric(a)+(t>0?" "+numeric(t)+" "+numeric(a):"")+" "+numeric(Math.max(0,t)+1e-9)+" "+numeric(b)+")";}
 if(v&&Array.isArray(v.pulse)){const [lo,hi,delay,period,width]=v.pulse;return"DC "+numeric(lo)+" PULSE("+[lo,hi,delay,1e-10,1e-10,width,period].map(numeric).join(" ")+")";}
 throw Error("Unsupported source waveform");
}
function build(raw,{analysis="op",stepS=1e-5,durationS=.005}={}){
 const c=M.validate(raw);
 if(!["op","tran"].includes(analysis))throw Error("Analysis must be op or tran");
 if(analysis==="tran"&&(!Number.isFinite(stepS)||stepS<=0||stepS>1||!Number.isFinite(durationS)||durationS<=0||durationS>100))throw Error("Invalid simulation duration");
 const lines=["* BOARD//LAB 6 restricted compact-model verification deck",
 "* Educational export; validate device models and run actual ngspice before relying on numerical results."];
 const models=[];
 for(const e of c.components){
  const p=node(e.p),n=node(e.n),tag=e.id.replace(/[^A-Za-z0-9_.-]/g,"_");
  switch(e.type){
  case"R":lines.push("R"+tag+" "+p+" "+n+" "+numeric(e.value));break;
  case"C":lines.push("C"+tag+" "+p+" "+n+" "+numeric(e.value));break;
  case"L":lines.push("L"+tag+" "+p+" "+n+" "+numeric(e.value));break;
  case"V":lines.push("V"+tag+" "+p+" "+n+" "+sourceValue(e.value));break;
  case"I":lines.push("I"+tag+" "+p+" "+n+" "+sourceValue(e.value));break;
  case"D":{
   const model="DM_"+tag;lines.push("D"+tag+" "+p+" "+n+" "+model);
   const N=e.nvt/.025852;models.push(".model "+model+" D(IS="+numeric(e.is)+" N="+numeric(N)+")");
   break;
  }
  case"NMOS":case"PMOS":{
   const model="MOS_"+tag,pol=e.type==="NMOS"?"NMOS":"PMOS",th=e.type==="PMOS"?-e.vth:e.vth;
   lines.push("M"+tag+" "+p+" "+node(e.g)+" "+n+" "+n+" "+model+" L=1u W=1u");
   models.push(".model "+model+" "+pol+" (LEVEL=1 VTO="+numeric(th)+" KP="+numeric(e.k)+" LAMBDA="+numeric(e.lambda)+")");
   break;
  }
  default:throw Error("Unsupported circuit component");
  }
 }
 lines.push(...models);
 lines.push(analysis==="op"?".op":".tran "+numeric(stepS)+" "+numeric(durationS)+" 0 "+numeric(stepS));
 const visible=c.nodes.slice(0,18).map(n=>"V("+node(n)+")");
 if(!visible.length)throw Error("No observable nodes");
 lines.push(".print "+analysis+" "+visible.join(" "));
 lines.push(".end");
 return lines.join("\n")+"\n";
}
return{build};
});