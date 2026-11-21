/* BOARD//LAB deterministic educational electrical model. No OEM specs or SPICE claims. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.RepairCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VREF={JACK:19.20,FUSE_OUT:19.18,SYS:19.12,V3:3.30,V5:5.05,EC_EN:3.30,CPU_EN:3.30,VCORE:0.94,DISPLAY:19.12,USB_CC:0.76,GND:0};
const FAULTS=[
{id:'none',label:'Case 00 · Healthy reference board',complaint:'A working training board. Learn normal power rails, compare measurements, and practise the diagnostic workflow.',symptoms:'Standby rails present; boots normally.',target:null,level:1,initialPower:true},
{id:'fuse_open',label:'Case 01 · No charging indicator',complaint:'Customer reports: "The laptop stopped charging after a power event. No lights at all."',symptoms:'Adapter detected, no downstream power.',target:'F1',level:2},
{id:'fet_open',label:'Case 02 · Dead after adapter replacement',complaint:'Customer reports: "The adapter tests OK, but the laptop is completely dead."',symptoms:'Input rail present, standby absent.',target:'Q1',level:3},
{id:'v3_short',label:'Case 03 · 3.3 V rail will not start',complaint:'Customer reports: "Machine is dead. The board develops a small warm area near the standby circuit."',symptoms:'19 V system rail present; 3.3 V output collapses.',target:'C24',level:4},
{id:'buck_disabled',label:'Case 04 · No 3 V / 5 V standby',complaint:'Customer reports: "19 V reaches the board, but the power button has no effect."',symptoms:'Input power present, missing standby outputs.',target:'U3',level:3},
{id:'bios_bad',label:'Case 05 · Power light but no POST',complaint:'Customer reports: "Fans spin, keyboard lights up, but there is no image after a failed update."',symptoms:'Power rails within model reference, firmware boot blocked.',target:'U_BIOS',level:4},
{id:'lcd_cable',label:'Case 06 · External monitor works',complaint:'Customer reports: "The laptop starts and works over HDMI, but the internal panel stays dark."',symptoms:'POST succeeds; internal display route open.',target:'J_EDP',level:2},
{id:'core_disabled',label:'Case 07 · No CPU core power',complaint:'Customer reports: "Power indicator appears, then the system refuses to POST."',symptoms:'Standby normal; CPU enable is present but core rail remains at 0 V.',target:'U_VRM',level:4},
{id:'pd_cc',label:'Case 08 · USB-C remains at default supply',complaint:'Customer reports: "A known-good USB-C charger provides only default voltage and never negotiates higher power."',symptoms:'USB-C CC/PD negotiation incomplete.',target:'U_PD',level:4},
{id:'ec_fail',label:'Case 09 · Standby good, no power sequence',complaint:'Customer reports: "3.3 V and 5 V are present, but pressing the power key does nothing."',symptoms:'Standby rails good; no EC-issued CPU enable.',target:'U_EC',level:5}
];
const NETS=['GND','JACK','FUSE_OUT','SYS','V3','V5','EC_EN','CPU_EN','VCORE','DISPLAY','USB_CC'];
const NOMINAL_OHMS={JACK:50000,FUSE_OUT:40000,SYS:1200,V3:82,V5:110,EC_EN:30000,CPU_EN:30000,VCORE:2.4,DISPLAY:230,USB_CC:18000};
function round(v,n=3){return Math.round(v*10**n)/10**n}
function createState(fault='none'){
  return {fault,originalFault:fault,ac:true,battery:false,powerButton:false,repairs:[],faultCleared:false,firmwareBackup:false,diagnosisSubmitted:false};
}
function solve(state){
  const f=state.faultCleared?'none':state.fault;
  const line=state.ac ? 19.2 : 0; // Battery intentionally isolated in this DC-input training network.
  const fuseGood=f!=='fuse_open',fetGood=f!=='fet_open';
  const fuseOut=line&&fuseGood?19.18:0;
  const sys=fuseOut&&fetGood?19.12:0;
  const v3=sys>15&&f!=='buck_disabled'?(f==='v3_short'?0.25:3.30):0;
  const v5=sys>15&&f!=='buck_disabled'?5.05:0;
  const ec=v3>3&&v5>4.7&&f!=='ec_fail';
  const ecEnable=ec?3.3:0;
  const cpuEnable=ec&&state.powerButton?3.3:0;
  const vcore=cpuEnable&&f!=='core_disabled'?0.94:0;
  const post=!!(vcore>0.85&&f!=='bios_bad');
  const display=post&&f!=='lcd_cable'?sys:0;
  const cc=sys>15?(f==='pd_cc'?0.16:0.76):0;
  const vals={GND:0,JACK:line,FUSE_OUT:fuseOut,SYS:sys,V3:v3,V5:v5,EC_EN:ecEnable,CPU_EN:cpuEnable,VCORE:vcore,DISPLAY:display,USB_CC:cc};
  const short3=(f==='v3_short'&&sys>15);
  const currentA=sys?(0.06+(v3>1?3.3/82/0.83/(sys/3.3):0)+(v5>1?5.05/110/0.85/(sys/5.05):0)+(vcore>0?0.23:0)+(short3?0.24:0)):0;
  const readings={...vals};
  return {fault:f,voltage:readings,post,displayWorking:display>10,ecReady:ec,fuseGood,fetGood,short3,currentA:round(currentA),powerStage:!line?'OFF':!fuseOut?'FUSE':!sys?'INPUT FET':v3<2.9?'STANDBY':!state.powerButton?'S5 / STANDBY':!vcore?'CPU VRM':!post?'FIRMWARE':'S0 / RUNNING',status:!line?'ADAPTER DISCONNECTED':!sys?'NO SYSTEM INPUT':v3<2.9?'STANDBY FAILURE':!state.powerButton?'STANDBY READY':!vcore?'NO CPU RAIL':!post?'NO POST':!display?'EXTERNAL DISPLAY ONLY':'RUNNING'};
}
function ohmsToGround(state,net){
 const f=state.faultCleared?'none':state.fault;
 if(net==='GND')return 0;
 if(net==='V3'&&f==='v3_short')return 0.35;
 return NOMINAL_OHMS[net]??Infinity;
}
function resistance(state,a,b){
 if(a===b)return 0;
 if(a==='GND')return ohmsToGround(state,b);
 if(b==='GND')return ohmsToGround(state,a);
 const f=state.faultCleared?'none':state.fault;
 const edges=[['JACK','FUSE_OUT',f==='fuse_open'?Infinity:0.06],['FUSE_OUT','SYS',f==='fet_open'?Infinity:0.045]];
 const e=edges.find(([x,y])=>(a===x&&b===y)||(a===y&&b===x));
 if(e)return e[2];
 if(a==='JACK'&&b==='SYS'||b==='JACK'&&a==='SYS')return (f==='fuse_open'||f==='fet_open')?Infinity:0.105;
 return ohmsToGround(state,a)+ohmsToGround(state,b);
}
function measure(state,mode,red,black){
 const s=solve(state);
 if(!red||!black)return {text:'— — —',detail:'Place both probes on named test points.',ok:false};
 if(!(red in s.voltage)||!(black in s.voltage))return {text:'OL',detail:'Unknown training test point.',ok:false};
 const volts=s.voltage[red]-s.voltage[black];
 if(mode==='DCV')return {text:round(volts,2).toFixed(2)+' V',detail:`V(${red}) − V(${black}); model computed from the active power state.`,ok:true,value:volts};
 if(mode==='ACV')return {text:'0.00 V~',detail:'DC training model; no AC ripple is resolved in this steady-state exercise.',ok:true,value:0};
 if(state.ac||state.battery)return {text:'LOCK',detail:'Safety interlock: disconnect AC and isolate the battery before Ω, continuity or diode checks.',ok:false,unsafe:true};
 const r=resistance(state,red,black);
 if(mode==='OHM')return {text:Number.isFinite(r)?(r<1?round(r,3).toFixed(3)+' Ω':round(r,1).toFixed(1)+' Ω'):'OL',detail:'Unpowered equivalent resistance for this fictional training circuit.',ok:true,value:r};
 if(mode==='CONT')return {text:r<30?'● BEEP':'OL',detail:r<30?`Conductive path (${round(r,2)} Ω).`:'No low-resistance path through the selected nodes.',ok:true,value:r};
 if(mode==='DIODE'){
  const f=state.faultCleared?'none':state.fault;
  if((red==='V3'&&black==='GND'||black==='V3'&&red==='GND')&&f==='v3_short')return {text:'0.02 V',detail:'The simulated short across the standby rail conducts in either polarity.',ok:true,value:.02};
  const diode=(red==='GND'&&['JACK','V3'].includes(black))||(red==='SYS'&&black==='FUSE_OUT'&&f!=='fet_open');
  return {text:diode?'0.58 V':'OL',detail:diode?'Educational forward-biased protection / body-diode model.':'No forward-biased diode path is defined for this probe polarity.',ok:true,value:diode?.58:Infinity};
 }
 return {text:'— — —',detail:'Select a measurement mode.',ok:false};
}
function evaluate(state,part){
 const caseDef=FAULTS.find(x=>x.id===state.originalFault)||FAULTS[0];
 return {correct:caseDef.target===part,expected:caseDef.target,caseDef};
}
function repair(state,part){
 const d=evaluate(state,part);
 if(!d.expected)return {ok:false,message:'This is the known-good reference board; no fault repair is needed.'};
 if(state.ac||state.battery)return {ok:false,message:'Safety interlock: turn off adapter power and disconnect the simulated battery first.'};
 if(!d.correct)return {ok:false,message:`The selected part ${part||'none'} does not match the diagnosed cause. Measure and compare the rails before replacing parts.`};
 if(part==='U_BIOS'&&!state.firmwareBackup)return {ok:false,message:'Firmware workflow: create and verify a read-only original flash backup before sandbox reprogramming.'};
 state.faultCleared=true;
 state.repairs.push({part,time:new Date().toISOString()});
 return {ok:true,message:`${part} repaired in the training model. Restore power and repeat the measurements to verify the result.`};
}
return {FAULTS,VREF,NETS,NOMINAL_OHMS,createState,solve,measure,resistance,evaluate,repair};
});
