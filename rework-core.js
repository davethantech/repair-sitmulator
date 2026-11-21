/* BOARD//LAB 5 — controlled thermal rework TEACHING model.
   Simplified lumped heat-transfer and scoring, NOT validated solder profiles or equipment settings.
   Never use these temperatures/times as real repair instructions. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardRework=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const PARTS={
 capacitor_0805:{name:"0805 ceramic capacitor",capJPerC:2.8,heatCoupling:.42,maxStressC:265},
 resistor_0402:{name:"0402 resistor",capJPerC:1.8,heatCoupling:.5,maxStressC:255},
 connector:{name:"Small signal connector",capJPerC:7.2,heatCoupling:.32,maxStressC:235},
 qfn:{name:"QFN controller package",capJPerC:10,heatCoupling:.3,maxStressC:260}
};
const ALLOYS={SAC305:{name:"Sn-Ag-Cu lead-free concept",liquidusC:217},Sn63Pb37:{name:"Sn-Pb concept",liquidusC:183}};
function range(x,lo,hi,name){x=Number(x);if(!Number.isFinite(x)||x<lo||x>hi)throw Error(name+" outside "+lo+"…"+hi);return x;}
function make(options={}){
const part=options.part||"capacitor_0805",alloy=options.alloy||"SAC305";
if(!PARTS[part]||!ALLOYS[alloy])throw Error("Unknown training package or alloy");
const ambient=range(options.ambientC??25,15,40,"Ambient temperature");
return{part,alloy,ambientC:ambient,padTempC:ambient,boardTempC:ambient,flux:options.flux!==false,shielded:options.shielded===true,sourceOn:false,removed:false,replaced:false,jointLiquidusSec:0,overheatSec:0,padHealth:100,corrosion:options.corrosion===true,bridge:options.bridge===true,padLifted:false,timeS:0,history:[],actions:[],trainingOnly:true};
}
function supply(s,on){if(on&&s.padTempC>90)return{ok:false,message:"Board too hot for connector/service checks."};s.sourceOn=!!on;return{ok:true};}
function heat(s,{airC=300,airflow=.55,distanceMm=8}={},durationS=1){
if(s.sourceOn)return{ok:false,message:"Disconnect all power before thermal rework"};
const target=range(airC,100,480,"Air temperature"),flow=range(airflow,0,1,"Airflow"),distance=range(distanceMm,2,50,"Tool distance"),duration=range(durationS,.1,20,"Duration");
const cfg=PARTS[s.part],liquidus=ALLOYS[s.alloy].liquidusC,dt=.05,steps=Math.ceil(duration/dt),time=duration/steps;
for(let i=0;i<steps;i++){
const shieldFactor=s.shielded?.7:1;const hot=cfg.heatCoupling*flow*shieldFactor*(8/(distance+4));
const cool=.075*(s.padTempC-s.ambientC);
s.padTempC+=(hot*(target-s.padTempC)-cool)/cfg.capJPerC*time;
s.boardTempC+=((s.padTempC-s.boardTempC)*.025-.015*(s.boardTempC-s.ambientC))/8*time;
s.timeS+=time;
if(s.padTempC>=liquidus)s.jointLiquidusSec+=time;
if(s.padTempC>cfg.maxStressC){s.overheatSec+=time;s.padHealth=Math.max(0,s.padHealth-(s.padTempC-cfg.maxStressC)*.035*time);}
if(s.padTempC>320){s.padHealth=Math.max(0,s.padHealth-.8*time);}
}
s.padLifted=s.padHealth<25;
s.actions.push("Heat "+duration.toFixed(2)+" s at virtual "+target+" °C and airflow "+flow.toFixed(2));
record(s);
return{ok:true,padTempC:s.padTempC,liquidusReached:s.padTempC>=liquidus,padHealth:s.padHealth};
}
function cool(s,seconds=5){const d=range(seconds,.1,120,"Cooling time"),steps=Math.ceil(d/.1),dt=d/steps;for(let i=0;i<steps;i++){s.padTempC+=(s.ambientC-s.padTempC)*.07*dt;s.boardTempC+=(s.ambientC-s.boardTempC)*.045*dt;s.timeS+=dt;}s.actions.push("Cool "+d+" s");record(s);return{tempC:s.padTempC};}
function record(s){s.history.push({timeS:+s.timeS.toFixed(2),padTempC:+s.padTempC.toFixed(2),boardTempC:+s.boardTempC.toFixed(2),padHealth:+s.padHealth.toFixed(1)});if(s.history.length>200)s.history.shift();}
function applyFlux(s){if(s.sourceOn)return{ok:false,message:"Disconnect source before flux application."};s.flux=true;s.actions.push("Applied virtual flux");return{ok:true};}
function clean(s){if(s.sourceOn||s.padTempC>90)return{ok:false,message:"Disconnect source and cool to below 90 °C before cleaning."};s.corrosion=false;s.actions.push("Cleaned and inspected simulated residue/corrosion");return{ok:true};}
function remove(s){if(s.sourceOn)return{ok:false,message:"Powered rework blocked"};if(s.padTempC<ALLOYS[s.alloy].liquidusC||s.jointLiquidusSec<.5)return{ok:false,message:"Joint has not reached sufficient simulated liquidus dwell."};if(!s.flux)s.padHealth=Math.max(0,s.padHealth-20);s.removed=true;s.replaced=false;s.actions.push("Removed modeled component");return{ok:true};}
function place(s){if(s.sourceOn||!s.removed)return{ok:false,message:"Remove the failed component with source isolated first."};if(s.padLifted)return{ok:false,message:"Pads are damaged: repair/training inspection required."};s.replaced=true;s.jointLiquidusSec=0;s.actions.push("Placed compatible replacement");return{ok:true};}
function bridge(s){if(s.sourceOn)return{ok:false,message:"Source isolation required"};s.bridge=!s.bridge;s.actions.push("Toggled virtual solder bridge");return{ok:true,bridge:s.bridge};}
function inspect(s){
const reasons=[],liquidus=ALLOYS[s.alloy].liquidusC;
if(!s.removed||!s.replaced)reasons.push("Component removal and replacement incomplete");
if(s.padLifted)reasons.push("Pad adhesion damaged");
if(s.padHealth<70)reasons.push("Heat damage risk");
if(s.jointLiquidusSec<.5)reasons.push("Replacement joint has insufficient modeled soldering dwell");
if(s.padTempC>90)reasons.push("Board has not cooled for safe inspection");
if(s.bridge)reasons.push("Solder bridge remains");
if(s.corrosion)reasons.push("Corrosion/contamination remains");
if(!s.flux)reasons.push("No flux was used in this training case");
return{passed:!reasons.length,reasons,score:Math.max(0,100-22*reasons.length-Math.round(s.overheatSec*3)),tempC:s.padTempC,padHealth:s.padHealth,liquidusC:liquidus,notes:"Qualitative educational model, not real solder-joint qualification."};
}
return{PARTS,ALLOYS,make,supply,heat,cool,applyFlux,clean,remove,place,bridge,inspect};
});