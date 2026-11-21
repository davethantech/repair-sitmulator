/* BOARD//LAB 5 — ideal lossless single-ended transmission-line teaching model.
   Not a frequency-domain field solver, DDR/PCIe signoff, EMI or IPC validation.
   Waveforms use travelling-wave theory with finite linear edge ramps. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardSignals=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const C=299792458;
function number(v,name,lo,hi){const x=Number(v);if(!Number.isFinite(x)||x<lo||x>hi)throw Error(name+" outside "+lo+"…"+hi);return x;}
function calculate(params={}){
const Z0=number(params.impedanceOhm??50,"Characteristic impedance",10,200);
const Rs=number(params.sourceOhm??50,"Source resistance",0,1000);
const loadOpen=params.loadOhm==="open"||params.loadOhm===Infinity;
const Rl=loadOpen?Infinity:number(params.loadOhm??50,"Load resistance",0,1000000);
const lengthMm=number(params.lengthMm??100,"Line length",1,10000);
const erEffective=number(params.erEffective??2.9,"Effective permittivity",1,12);
const riseNs=number(params.riseNs??.2,"Rise time",.005,40);
const stepV=number(params.stepV??3.3,"Driver step",.001,5);
const vi=stepV*Z0/(Rs+Z0),gs=(Rs-Z0)/(Rs+Z0),gl=loadOpen?1:(Rl-Z0)/(Rl+Z0),velocity=C/Math.sqrt(erEffective);
const oneWayNs=(lengthMm*.001/velocity)*1e9,roundTripNs=2*oneWayNs;
return{Z0,Rs,Rl:loadOpen?"OPEN":Rl,lengthMm,erEffective,riseNs,stepV,velocityMps:velocity,oneWayNs,roundTripNs,sourceReflection:gs,loadReflection:gl,incidentV:vi,model:"Ideal lossless single-ended line with ideal resistive source/load. Educational estimate."};
}
function ramp(t,at,tr){if(t<=at)return 0;if(t>=at+tr)return 1;return(t-at)/tr;}
function voltageAt(tNs,result,end="load",bounces=12){
const r=result,t=number(tNs,"time",0,100000),N=number(bounces,"bounces",1,30);let v=end==="load"?0:r.incidentV*ramp(t,0,r.riseNs);
for(let k=0;k<N;k++){
if(end==="load"){const amplitude=r.incidentV*(1+r.loadReflection)*Math.pow(r.loadReflection*r.sourceReflection,k);const arrival=r.oneWayNs*(2*k+1);v+=amplitude*ramp(t,arrival,r.riseNs);}
else if(end==="source"){const amplitude=r.incidentV*(1+r.sourceReflection)*r.loadReflection*Math.pow(r.loadReflection*r.sourceReflection,k);const arrival=r.roundTripNs*(k+1);v+=amplitude*ramp(t,arrival,r.riseNs);}
else throw Error("Probe location must be load or source");
}
return v;
}
function waveform(params={},end="load",count=240){
const r=calculate(params);const n=number(count,"samples",20,1200);if(!Number.isInteger(n))throw Error("Sample count must be integer");
const duration=Math.max(6*r.oneWayNs+2*r.riseNs,4);
const points=Array.from({length:n},(_,i)=>{const tNs=duration*i/(n-1);return{tNs:Number(tNs.toFixed(4)),v:Number(voltageAt(tNs,r,end).toFixed(6))};});
const peak=Math.max(...points.map(p=>p.v)),valley=Math.min(...points.map(p=>p.v));
const steady=r.loadReflection===1?0:r.loadReflection===-1?0:r.stepV*(r.Rl/(r.Rs+r.Rl));
const overshoot=peak-Math.max(steady,0);
const warnings=[];
if(r.lengthMm>500&&r.riseNs<r.oneWayNs)warnings.push("Propagation delay exceeds edge time: route and termination deserve careful attention.");
if(r.loadReflection>.7)warnings.push("High load reflection; large open-ended ringing/overshoot is possible.");
if(r.loadReflection<-.7)warnings.push("Low load impedance; the waveform can swing or undershoot.");
if(r.erEffective>8)warnings.push("Unusual dielectric: verify manufacturer loss/dispersion parameters.");
return{parameters:r,probe:end,points,maxV:Number(peak.toFixed(4)),minV:Number(valley.toFixed(4)),settledV:steady,overshootV:Math.max(0,Number(overshoot.toFixed(4))),warnings};
}
function timing({lengthMm=100,erEffective=2.9,bitRateMbps=100}={}){
const oneWayNs=calculate({lengthMm,erEffective}).oneWayNs;
const rate=number(bitRateMbps,"Bitrate",.1,10000),bitNs=1000/rate;
return{propagationNs:oneWayNs,unitIntervalNs:bitNs,delayUI:oneWayNs/bitNs,note:"This is a one-dimensional timing illustration. No skew/jitter, discontinuities, insertion loss, crosstalk or vias."};
}
return{calculate,voltageAt,waveform,timing};
});