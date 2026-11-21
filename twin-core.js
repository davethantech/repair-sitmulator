/* BOARD//LAB 4 — reproducible low-voltage design-to-repair laboratory.
   LED training board only. DC resistor network + piecewise diode approximation,
   not SPICE, not safety-certified, not a calibrated meter. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./pcb-core.js"):root.BoardPCB);
if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardTwin=api;})(typeof globalThis!=="undefined"?globalThis:this,function(PCB){
"use strict";
const FAULTS={
 healthy:{name:"Known-good reference",part:null,tool:null},
 fuse_open:{name:"Open input fuse",part:"f1",tool:"replace_fuse"},
 output_short:{name:"Shorted output capacitor",part:"c1",tool:"replace_smd"},
 contact_resistance:{name:"High-resistance input connector",part:"j1",tool:"rework_connector"},
 led_open:{name:"Open LED junction",part:"d1",tool:"replace_smd"},
 resistor_open:{name:"Open series resistor",part:"r1",tool:"replace_smd"},
 return_open:{name:"Broken ground return",part:"j1",tool:"rework_connector"},
 trace_open:{name:"Broken LED_A copper trace",part:"trace",tool:"repair_trace"}
};
const NODES=["GND","VIN_5V","VCC_PROTECTED","LED_A"];
const pinName={GND:"GND",JACK:"VIN_5V",FUSE_OUT:"VCC_PROTECTED",LED_ANODE:"LED_A"};
function clone(v){return JSON.parse(JSON.stringify(v));}
function standardBoard(){return PCB.routedExample();}
function make(board,scenario){return{board:PCB.validateImport(board||standardBoard()),scenario:FAULTS[scenario]?scenario:"healthy",sourceOn:false,isolated:true,fixed:false,diagnosis:null,log:[],evidence:[],mistakes:0,repairCount:0,verified:false};}
function resistanceValue(part,defaultValue){let v=part&&String(part.value||"").trim().match(/^(\d+(?:\.\d+)?)\s*([kKmM]?)(?:[ΩoO]|ohm)?/);
if(!v)return defaultValue;const m={k:1000,K:1000,m:.001,M:1000000};return Math.max(.001,Number(v[1])*(m[v[2]]||1));}
function netOpen(board,name){const c=PCB.check(board);return(c.groupsByNet[name]||0)>1;}
function faultOf(s){return s.fixed?"healthy":s.scenario;}
function gaussian(a,b){let n=b.length,A=a.map((row,i)=>row.concat(b[i]));for(let j=0;j<n;j++){let pivot=j;for(let i=j+1;i<n;i++)if(Math.abs(A[i][j])>Math.abs(A[pivot][j]))pivot=i;
if(Math.abs(A[pivot][j])<1e-20)throw Error("Unsolvable circuit matrix");[A[pivot],A[j]]=[A[j],A[pivot]];
const scale=A[j][j];for(let k=j;k<=n;k++)A[j][k]/=scale;
for(let i=0;i<n;i++)if(i!==j){let m=A[i][j];for(let k=j;k<=n;k++)A[i][k]-=m*A[j][k];}}
return A.map(row=>row[n]);}
function solveResistors(links,sources){const nodes=NODES.slice(1),g=nodes.map(()=>[0,0,0]),rhs=[0,0,0],idx=x=>nodes.indexOf(x);
for(const e of links){const r=Math.max(e.r,1e-9),z=1/r,i=idx(e.a),j=idx(e.b);
if(i>=0)g[i][i]+=z;if(j>=0)g[j][j]+=z;if(i>=0&&j>=0){g[i][j]-=z;g[j][i]-=z;}
if(e.known!==undefined){if(i>=0)rhs[i]+=z*e.known;if(j>=0)rhs[j]+=z*e.known;}}
for(const p of sources||[]){const i=idx(p.node);if(i>=0)rhs[i]+=p.amp;}
for(let i=0;i<3;i++)g[i][i]+=1e-11;
const volt=gaussian(g,rhs);return{GND:0,VIN_5V:volt[0],VCC_PROTECTED:volt[1],LED_A:volt[2]};}
function network(s,supply,ledOn){
const faulty=faultOf(s),board=s.board,partR=board.parts.find(x=>x.id==="r1");
const trackBroken=netOpen(board,"LED_A")||faulty==="trace_open";
const inputBroken=netOpen(board,"VIN_5V")||netOpen(board,"VCC_PROTECTED");
const gndBroken=netOpen(board,"GND");
let rs=faulty==="contact_resistance"?18:.25;
let rf=(faulty==="fuse_open"||inputBroken)?1e10:.12;
let rr=(faulty==="resistor_open"||trackBroken)?1e10:resistanceValue(partR,1000);
const links=[
 {a:"VIN_5V",b:"GND",r:rs,known:supply},
 {a:"VIN_5V",b:"VCC_PROTECTED",r:rf},
 {a:"VCC_PROTECTED",b:"LED_A",r:rr},
 {a:"VCC_PROTECTED",b:"GND",r:faulty==="output_short"?.07:100000},
 {a:"LED_A",b:"GND",r:faulty==="led_open"||faulty==="return_open"||gndBroken?1e10:ledOn?12:1e10,known:ledOn?1.9:0}
];return{links,rs,rf,rr};
}
function evaluate(s,setpoint=5,currentLimit=.8){
let supply=setpoint,V=null,branch=null,diodeOn=true,I=0;
function run(level){const forbidden=faultOf(s)==="led_open"||faultOf(s)==="return_open"||netOpen(s.board,"GND");let parts=network(s,level,false),off=solveResistors(parts.links),active=!forbidden&&off.LED_A>1.9; if(!active)return{v:off,p:parts,on:false};parts=network(s,level,true);let on=solveResistors(parts.links);if(on.LED_A<1.9-1e-8){parts=network(s,level,false);return{v:solveResistors(parts.links),p:parts,on:false};}return{v:on,p:parts,on:true};}
let z=run(supply);I=Math.max(0,(supply-z.v.VIN_5V)/z.p.rs);
if(I>currentLimit){let lo=0,hi=supply;for(let j=0;j<42;j++){let m=(lo+hi)/2,q=run(m);let current=Math.max(0,(m-q.v.VIN_5V)/q.p.rs);if(current>currentLimit)hi=m;else lo=m;}supply=lo;z=run(supply);I=Math.max(0,(supply-z.v.VIN_5V)/z.p.rs);}
const ledCurrent=z.on?Math.max(0,(z.v.LED_A-1.9)/12):0;
const heat={j1:I*I*z.p.rs,f1:Math.pow((z.v.VIN_5V-z.v.VCC_PROTECTED)/Math.max(z.p.rf,1e-8),2)*z.p.rf,c1:Math.pow(z.v.VCC_PROTECTED,2)/(faultOf(s)==="output_short"?.07:100000),r1:Math.pow((z.v.VCC_PROTECTED-z.v.LED_A)/Math.max(z.p.rr,1e-8),2)*z.p.rr,d1:ledCurrent*(z.v.LED_A)};
return{volts:z.v,sourceVoltage:supply,sourceCurrent:I,currentLimited:supply<setpoint-.0001,ledOn:ledCurrent>.0001,ledCurrent,heat,powerW:I*supply,model:"piecewise-linear teaching model",pcb:PCB.check(s.board)};
}
function snapshot(s){if(!s.sourceOn)return{volts:{GND:0,VIN_5V:0,VCC_PROTECTED:0,LED_A:0},sourceCurrent:0,sourceVoltage:0,currentLimited:false,ledOn:false,ledCurrent:0,heat:{},pcb:PCB.check(s.board),model:"source disconnected"};return evaluate(s);}
function componentForFault(s){const f=FAULTS[faultOf(s)];return f?f.part:null;}
function addEvidence(s,action,detail){s.log.push({action,detail,index:s.log.length+1});if(s.log.length>300)s.log.shift();}
function power(s,on){if(on&&s.isolated){addEvidence(s,"safety","Power blocked: complete isolation check first");s.mistakes++;return{ok:false,message:"Confirm safe board condition and enable the trainer source before powering."};}s.sourceOn=!!on;addEvidence(s,"power",on?"energized":"disconnected");return{ok:true};}
function isolate(s){if(s.sourceOn){s.sourceOn=false;addEvidence(s,"power","Automatically disconnected for servicing");}s.isolated=true;return{ok:true};}
function arm(s){if(s.sourceOn)return{ok:false,message:"Disconnect electrical source before changing isolation state."};s.isolated=false;addEvidence(s,"check","Low-voltage trainer safety check complete");return{ok:true};}
function measure(s,mode,positive,negative){
const a=pinName[positive]||positive,b=pinName[negative]||negative;
if(!NODES.includes(a)||!NODES.includes(b))return{ok:false,message:"Select actual defined test points."};
if(["OHM","CONT"].includes(mode)&&s.sourceOn){s.mistakes++;addEvidence(s,"safety","Unsafe resistance check refused");return{ok:false,message:"Live resistance/continuity test blocked. Disconnect source first."};}
let value,unit,view=snapshot(s);
if(mode==="DCV"){value=view.volts[a]-view.volts[b];unit="V";}
else if(mode==="OHM"||mode==="CONT"){if(a===b)value=0;else{
let networkState=clone(s);networkState.sourceOn=false;const p=network(networkState,0,false);
const nodes=NODES.slice(1);let links=p.links.filter(x=>x.a!=="VIN_5V"||x.b!=="GND").map(x=>({...x}));
const xN=nodes.indexOf(a),yN=nodes.indexOf(b);
const mat=nodes.map(()=>[0,0,0]),rhs=[0,0,0];
for(const e of links){let g=1/Math.max(e.r,1e-9),i=nodes.indexOf(e.a),j=nodes.indexOf(e.b);if(i>=0)mat[i][i]+=g;if(j>=0)mat[j][j]+=g;if(i>=0&&j>=0){mat[i][j]-=g;mat[j][i]-=g;}}
for(let i=0;i<3;i++)mat[i][i]+=1e-10;
if(xN>=0)rhs[xN]+=1;if(yN>=0)rhs[yN]-=1;
const v=gaussian(mat,rhs),va=xN>=0?v[xN]:0,vb=yN>=0?v[yN]:0;value=Math.max(0,va-vb);}
unit="Ω";if(mode==="CONT")unit=value<20?"BEEP":"OPEN";}
else return{ok:false,message:"Supported modes: DCV, OHM, CONT."};
const rec={ok:true,mode,red:a,black:b,value:Number(value.toPrecision(6)),unit,formatted:unit==="BEEP"?"BEEP · "+value.toFixed(2)+" Ω":unit==="OPEN"?"NO BEEP · "+(value>1000000?"OL":value.toFixed(1)+" Ω"):value>1000000?"OL":Number(value.toPrecision(5))+" "+unit};
s.evidence.push(rec);addEvidence(s,"measure",mode+" "+a+" - "+b+" = "+rec.formatted);return rec;
}
function diagnose(s,part){s.diagnosis=part;const ok=part===componentForFault(s);addEvidence(s,"diagnosis",part+" "+(ok?"matches fault":"incorrect"));if(!ok)s.mistakes++;return{ok,message:ok?"Root cause supported by hidden case. Proceed with safe repair.":"Hypothesis not confirmed. Compare upstream and downstream readings."};}
function repair(s,part,tool){if(s.sourceOn){s.mistakes++;return{ok:false,message:"Disconnect the trainer source before rework."};}
if(s.scenario==="healthy")return{ok:false,message:"Reference board has no defective component."};
if(s.evidence.length<2)return{ok:false,message:"Collect at least two measurements before repair."};
const expected=FAULTS[faultOf(s)];if(!expected)return{ok:false,message:"No repair required."};
if(expected.part!==part||expected.tool!==tool){s.mistakes++;addEvidence(s,"repair","Incorrect part or rework method");return{ok:false,message:"Incorrect repair target or technique. No state change."};}
s.fixed=true;s.repairCount++;s.verified=false;
if(s.scenario==="trace_open"){s.board=PCB.routedExample();}
addEvidence(s,"repair",part+" corrected with "+tool);return{ok:true,message:"Virtual repair completed. Re-energize and verify operating conditions."};}
function verify(s){const r=snapshot(s),p=r.pcb;const ok=(s.fixed||s.scenario==="healthy")&&s.sourceOn&&p.errors===0&&p.warnings===0&&r.ledOn&&r.volts.VCC_PROTECTED>4.5&&!r.currentLimited;
s.verified=ok;addEvidence(s,"QA",ok?"pass":"incomplete");return{ok,message:ok?"QA PASS — expected LED operation and rail behavior restored.":"QA incomplete: check fault, power, routing, and measurements.",score:Math.max(0,100-s.mistakes*15-(s.evidence.length<3?10:0)-(s.repairCount>1?10:0))};}
function oscilloscope(s,node){const r=snapshot(s),a=pinName[node]||node,dc=r.volts[a]||0;
return Array.from({length:128},(_,i)=>{let t=i/127*5;return{t_ms:t,v:s.sourceOn?dc*(1-Math.exp(-t/.25))+(.008*Math.sin(2*Math.PI*t*3))*(dc>1?1:0):0};});}
function thermal(s){const r=snapshot(s);return Object.entries(r.heat||{}).map(([part,power])=>({part,powerW:power,estimatedRiseC:Math.min(90,power*38)}));}
function learningReport(s){return{scenario:s.scenario,probes:s.evidence.length,unsafeAttempts:s.mistakes,diagnosis:s.diagnosis,repairCount:s.repairCount,verified:s.verified,history:clone(s.log),model:"Low-voltage LED trainer, not an instrument calibration or fabrication verification"};}
return{FAULTS,NODES,make,standardBoard,network,evaluate,snapshot,measure,diagnose,repair,verify,power,isolate,arm,oscilloscope,thermal,learningReport};
});