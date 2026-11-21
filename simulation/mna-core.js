/*
 * BOARD//LAB 6 — inspectable compact circuit simulator.
 *
 * Restricted modified nodal analysis with Newton iteration (DC) and
 * backward-Euler time stepping (transient), supporting independent V/I,
 * R, C, L, exponential diodes and LEVEL-1-like square-law MOS switches.
 *
 * This is NOT ngspice, BSIM, a verified physical device model, RF,
 * mixed-signal, power-integrity, temperature or OEM verification.
 * Browser + CommonJS, no eval, no arbitrary user-supplied executable code.
 */
(function(root,factory) {
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.BoardMNA=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const GND=new Set(["0","GND","gnd"]);
const TYPES=new Set(["R","C","L","V","I","D","NMOS","PMOS"]);
const clone=x=>JSON.parse(JSON.stringify(x));
function real(x,label,min,max){const n=Number(x);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+" must be a finite number from "+min+" to "+max);return n;}
function gnd(n){return GND.has(n)?null:n;}
function valueAt(spec,t) {
 if(typeof spec==="number")return spec;
 if(spec&&typeof spec==="object"&&!Array.isArray(spec)){
   const step=spec.step;if(Array.isArray(step)&&step.length===3) return t>=step[0]?step[2]:step[1];
   const pulse=spec.pulse;
   if(Array.isArray(pulse)&&pulse.length===5){
     const [low,high,delay,period,highTime]=pulse;
     if(t<delay)return low;
     const phase=(t-delay)%period;
     return phase<highTime?high:low;
   }
 }
 throw Error("Expected numeric source or step:[time,low,high] / pulse:[low,high,delay,period,highTime]");
}
function validate(raw){
 if(!raw||typeof raw!=="object"||!Array.isArray(raw.components))throw Error("Circuit components required");
 if(raw.components.length<1||raw.components.length>150)throw Error("Circuit must contain 1–150 parts");
 const comps=clone(raw.components),nodes=new Set(),ids=new Set();
 const node=n=>{if(typeof n!=="string"||!n||n.length>32||!/^[a-zA-Z_0-9.]+$/.test(n))throw Error("Invalid net identifier");if(!GND.has(n))nodes.add(n);return n;};
 for(const c of comps){
  if(!c||!TYPES.has(c.type))throw Error("Unsupported component type: "+c?.type);
  if(typeof c.id!=="string"||!/^[A-Za-z][\w.-]{0,23}$/.test(c.id)||ids.has(c.id))throw Error("Invalid or duplicate part ID");ids.add(c.id);
  node(c.p);node(c.n);if(c.p===c.n)throw Error(c.id+" terminals coincide");
  if(c.type==="NMOS"||c.type==="PMOS"){
    node(c.g);
    c.vth=real(c.vth??2,"MOS threshold",.01,12);
    c.k=real(c.k??.05,"MOS strength",1e-9,100);
    c.lambda=real(c.lambda??0,"MOS channel-length modulation",0,10);
  } else if(c.type==="D"){
    c.is=real(c.is??1e-12,"Diode saturation current",1e-20,.01);
    c.nvt=real(c.nvt??.052,"Diode nVT",.01,.5);
  } else if(["R","C","L"].includes(c.type)){
    const low=c.type==="R"?1e-6:c.type==="C"?1e-15:1e-12;
    const high=c.type==="R"?1e12:1e3;
    c.value=real(c.value,c.id+" value",low,high);
  } else {
    const limits=[-1e6,1e6],sample=[0,1e-6,1,100];
    for(const t of sample)real(valueAt(c.value,t),c.id+" source",...limits);
    if(typeof c.value==="object"&&Array.isArray(c.value.pulse)){
      if(!(c.value.pulse[3]>0)||!(c.value.pulse[4]>=0&&c.value.pulse[4]<=c.value.pulse[3]))throw Error("Pulse timing invalid");
    }
  }
 }
 if(nodes.size>45)throw Error("Maximum 45 non-ground nodes");
 const ordered=[...nodes].sort(),sourceIds=comps.filter(c=>c.type==="V").map(c=>c.id);
 if(ordered.length+sourceIds.length>60)throw Error("Maximum matrix dimension 60");
 // Floating islands produce singular matrices; do not silently generate readings.
 return{title:String(raw.title||"Circuit experiment").slice(0,100),components:comps,nodes:ordered,sources:sourceIds};
}
function matrix(dim){return Array.from({length:dim},()=>new Float64Array(dim));}
function pivotSolve(A,b){
 const n=b.length,M=A.map((r,i)=>Float64Array.from([...r,b[i]]));
 for(let k=0;k<n;k++){
   let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
   if(Math.abs(M[p][k])<1e-17)throw Error("Singular circuit: floating node, open return, conflicting source, or insufficient reference");
   if(p!==k)[M[p],M[k]]=[M[k],M[p]];
   for(let i=k+1;i<n;i++){const factor=M[i][k]/M[k][k];M[i][k]=0;for(let j=k+1;j<=n;j++)M[i][j]-=factor*M[k][j];}
 }
 const x=new Float64Array(n);
 for(let i=n-1;i>=0;i--){let s=M[i][n];for(let j=i+1;j<n;j++)s-=M[i][j]*x[j];x[i]=s/M[i][i];if(!Number.isFinite(x[i]))throw Error("Circuit solve diverged");}
 return x;
}
function makeContext(raw) {
 const c=validate(raw),index=new Map(c.nodes.map((n,i)=>[n,i])),curr=new Map(c.sources.map((n,i)=>[n,c.nodes.length+i]));
 return{c,index,curr,dim:c.nodes.length+c.sources.length,oldV:new Map(),oldI:new Map()};
}
function nodeIndex(ctx,n){return GND.has(n)?-1:ctx.index.get(n);}
function voltage(ctx,x,n){const i=nodeIndex(ctx,n);return i<0?0:x[i];}
function voltagePair(ctx,x,p,n){return voltage(ctx,x,p)-voltage(ctx,x,n);}
function stampG(A,ctx,p,n,g){
 const a=nodeIndex(ctx,p),b=nodeIndex(ctx,n);
 if(a>=0)A[a][a]+=g;if(b>=0)A[b][b]+=g;
 if(a>=0&&b>=0){A[a][b]-=g;A[b][a]-=g;}
}
function stampI(rhs,ctx,p,n,i){const a=nodeIndex(ctx,p),b=nodeIndex(ctx,n);if(a>=0)rhs[a]-=i;if(b>=0)rhs[b]+=i;}
function stampV(A,rhs,ctx,c,voltage){
 const p=nodeIndex(ctx,c.p),n=nodeIndex(ctx,c.n),k=ctx.curr.get(c.id);
 if(p>=0){A[p][k]+=1;A[k][p]+=1;}
 if(n>=0){A[n][k]-=1;A[k][n]-=1;}
 rhs[k]+=voltage;
}
function diode(c,v){
 const exp=Math.exp(Math.max(-40,Math.min(35,v/c.nvt)));
 return{I:c.is*(exp-1),g:c.is*exp/c.nvt};
}
function mosCurrent(c,vd,vg,vs){
 const polarity=c.type==="NMOS"?1:-1;
 const vgs=polarity*(vg-vs),vds=polarity*(vd-vs),over=vgs-c.vth;
 // Body conduction not modeled; a bounded very small off-conductance
 // improves conditioning without hiding an unconnected circuit topology.
 if(over<=0)return polarity*1e-10*vds;
 let id;
 if(vds>=0&&vds<over)id=c.k*(over*vds-vds*vds/2);
 else if(vds>=over)id=.5*c.k*over*over;
 else id=1e-10*vds;
 id*=1+c.lambda*Math.max(0,vds);
 return polarity*id;
}
function stampMOS(A,rhs,ctx,c,x){
 const nd=nodeIndex(ctx,c.p),ng=nodeIndex(ctx,c.g),ns=nodeIndex(ctx,c.n);
 const vd=voltage(ctx,x,c.p),vg=voltage(ctx,x,c.g),vs=voltage(ctx,x,c.n);
 const I=mosCurrent(c,vd,vg,vs),h=1e-5;
 // Numerical Jacobian; derivatives are of branch current from drain to source.
 const gd=(mosCurrent(c,vd+h,vg,vs)-mosCurrent(c,vd-h,vg,vs))/(2*h);
 const gg=(mosCurrent(c,vd,vg+h,vs)-mosCurrent(c,vd,vg-h,vs))/(2*h);
 const gs=(mosCurrent(c,vd,vg,vs+h)-mosCurrent(c,vd,vg,vs-h))/(2*h);
 const ieq=I-gd*vd-gg*vg-gs*vs;
 for(const [column,g] of [[nd,gd],[ng,gg],[ns,gs]])if(column>=0){
   if(nd>=0)A[nd][column]+=g;
   if(ns>=0)A[ns][column]-=g;
 }
 stampI(rhs,ctx,c.p,c.n,ieq);
}
function build(ctx,x,{t=0,dt=0,transient=false}={}){
 const A=matrix(ctx.dim),rhs=new Float64Array(ctx.dim);
 for(const c of ctx.c.components){
  if(c.type==="R")stampG(A,ctx,c.p,c.n,1/c.value);
  if(c.type==="V")stampV(A,rhs,ctx,c,valueAt(c.value,t));
  if(c.type==="I")stampI(rhs,ctx,c.p,c.n,valueAt(c.value,t));
  if(c.type==="C"&&transient){
    const g=c.value/dt,prev=ctx.oldV.get(c.id)||0;
    stampG(A,ctx,c.p,c.n,g);stampI(rhs,ctx,c.p,c.n,-g*prev);
  }
  if(c.type==="L"){
    if(transient){
      const g=dt/c.value,old=ctx.oldI.get(c.id)||0;
      stampG(A,ctx,c.p,c.n,g);stampI(rhs,ctx,c.p,c.n,old);
    }else stampG(A,ctx,c.p,c.n,1e9);
  }
  if(c.type==="D"){
    const v=voltagePair(ctx,x,c.p,c.n),d=diode(c,v);
    stampG(A,ctx,c.p,c.n,d.g);stampI(rhs,ctx,c.p,c.n,d.I-d.g*v);
  }
  if(c.type==="NMOS"||c.type==="PMOS")stampMOS(A,rhs,ctx,c,x);
 }
 return{A,rhs};
}
function nonlinear(ctx,options={},initial){
 const guess=initial?Float64Array.from(initial):new Float64Array(ctx.dim);
 const itMax=options.iterations||80;
 if(ctx.dim<1)throw Error("Circuit needs at least one grounded non-reference node");
 let x=guess,relaxed=false,iterations=0,last=Infinity;
 for(let k=0;k<itMax;k++){
  iterations=k+1;
  const built=build(ctx,x,options);
  let next=pivotSolve(built.A,built.rhs);
  // Damping large jumps improves cases with strongly nonlinear diodes.
  const diff=Math.max(...Array.from(next,(v,i)=>Math.abs(v-x[i])));
  const scale=Math.max(1,...Array.from(next,Math.abs));
  if(!Number.isFinite(diff))throw Error("Nonlinear solver diverged");
  if(diff<1e-8+scale*1e-8){x=next;return{x,iterations,converged:true};}
  let alpha=diff>.5?.5/diff:1;
  if(k>10&&diff>last*1.2)alpha=Math.min(alpha,.2);
  if(alpha<1)relaxed=true;
  for(let i=0;i<next.length;i++)next[i]=x[i]+alpha*(next[i]-x[i]);
  last=diff;x=next;
 }
 throw Error("Nonlinear solver did not converge within "+itMax+" iterations; change timestep or circuit topology");
}
function result(ctx,answer,t,dt=0){
 const nodes={"0":0};for(const n of ctx.c.nodes)nodes[n]=voltage(ctx,answer.x,n);
 const current={};for(const id of ctx.c.sources)current[id]=answer.x[ctx.curr.get(id)];
 const branch={};
 for(const c of ctx.c.components){
  const v=voltagePair(ctx,answer.x,c.p,c.n);
  if(c.type==="R")branch[c.id]=v/c.value;
  if(c.type==="C")branch[c.id]=dt>0?c.value/dt*(v-(ctx.oldV.get(c.id)||0)):0;
  if(c.type==="L")branch[c.id]=dt>0?(ctx.oldI.get(c.id)||0)+dt/c.value*v:1e9*v;
  if(c.type==="D")branch[c.id]=diode(c,v).I;
  if(c.type==="NMOS"||c.type==="PMOS")branch[c.id]=mosCurrent(c,voltage(ctx,answer.x,c.p),voltage(ctx,answer.x,c.g),voltage(ctx,answer.x,c.n));
  if(c.type==="V")branch[c.id]=current[c.id];
  if(c.type==="I")branch[c.id]=valueAt(c.value,t);
 }
 return{timeS:t,nodes,currents:branch,voltageSourceCurrents:current,iterations:answer.iterations,model:"compact-MNA teaching solver"};
}
function solveDC(raw,{t=0}={}){
 const ctx=makeContext(raw),answer=nonlinear(ctx,{t});return result(ctx,answer,t);
}
function simulateTransient(raw,{stepS=1e-5,durationS=.005,initialVoltages={},maxPoints=3000}={}){
 const dt=real(stepS,"Time step",1e-9,1),duration=real(durationS,"Duration",dt,100);
 if(duration/dt>maxPoints||duration/dt>3000)throw Error("Maximum 3,000 integration steps: shorten duration or increase time step");
 const ctx=makeContext(raw);
 for(const c of ctx.c.components){
  if(c.type==="C")ctx.oldV.set(c.id,Number(initialVoltages[c.id])||0);
  if(c.type==="L")ctx.oldI.set(c.id,0);
 }
 let x=new Float64Array(ctx.dim),points=[],prevTime=0;
 const steps=Math.ceil(duration/dt);
 for(let k=1;k<=steps;k++){
  const t=Math.min(duration,k*dt),h=t-prevTime;
  const ans=nonlinear(ctx,{t,dt:h,transient:true},x);
  x=ans.x;
  points.push(result(ctx,ans,t,h));
  for(const c of ctx.c.components){
   if(c.type==="C")ctx.oldV.set(c.id,voltagePair(ctx,x,c.p,c.n));
   if(c.type==="L"){
    const v=voltagePair(ctx,x,c.p,c.n);
    ctx.oldI.set(c.id,(ctx.oldI.get(c.id)||0)+h/c.value*v);
   }
  }
  prevTime=t;
 }
 return{points,stepS:dt,durationS:duration,method:"Backward Euler, fixed step, Newton-MNA",accuracy:"educational compact models; no tolerance/external device validation"};
}
const EXAMPLES={
 divider:{title:"Resistive divider 5V → 2.5V",components:[
   {id:"V1",type:"V",p:"IN",n:"0",value:5},
   {id:"R1",type:"R",p:"IN",n:"OUT",value:1000},
   {id:"R2",type:"R",p:"OUT",n:"0",value:1000}]},
 rc:{title:"RC low-pass 5V step",components:[
   {id:"V1",type:"V",p:"IN",n:"0",value:{step:[0,0,5]}},
   {id:"R1",type:"R",p:"IN",n:"OUT",value:1000},
   {id:"C1",type:"C",p:"OUT",n:"0",value:1e-6}]},
 rl:{title:"RL step current rise",components:[
   {id:"V1",type:"V",p:"IN",n:"0",value:{step:[0,0,5]}},
   {id:"R1",type:"R",p:"IN",n:"OUT",value:100},
   {id:"L1",type:"L",p:"OUT",n:"0",value:.01}]},
 diode:{title:"Diode clamp (compact exponential)",components:[
   {id:"V1",type:"V",p:"IN",n:"0",value:5},
   {id:"R1",type:"R",p:"IN",n:"OUT",value:1000},
   {id:"D1",type:"D",p:"OUT",n:"0",is:1e-12,nvt:.052}]},
 nmos:{title:"NMOS low-side switching",components:[
   {id:"V1",type:"V",p:"VIN",n:"0",value:5},
   {id:"VG",type:"V",p:"GATE",n:"0",value:5},
   {id:"R1",type:"R",p:"VIN",n:"DRAIN",value:1000},
   {id:"Q1",type:"NMOS",p:"DRAIN",n:"0",g:"GATE",vth:2,k:.05}]}
};
return{EXAMPLES,validate,solveDC,simulateTransient,valueAt};
});