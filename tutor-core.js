/* Explainable, deterministic evidence coach; NOT a generative AI or diagnostic authority.
   Uses measurements students actually recorded and publicly visible modeled telemetry;
   never accesses the hidden scenario answer. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardCoach=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
function latest(state,name){const hit=(state.evidence||[]).filter(x=>x.ok&&x.mode==="DCV"&&x.red===name&&x.black==="GND");return hit.length?hit[hit.length-1].value:null;}
function hint(state,readout){
const ev=state.evidence||[],dc=ev.filter(x=>x.ok&&x.mode==="DCV"),r=readout||null;
if(state.sourceOn&&ev.some(x=>x.mode==="OHM"||x.mode==="CONT"))return"Your earlier live-ohms attempt was refused. Disconnect the trainer source before continuity or resistance checks; do not repeat unsafe tests.";
if(ev.length===0)return"Start by recording VIN_5V to GND using DC voltage, then measure VCC_PROTECTED to the same reference. Compare input and output of the fuse path.";
if(dc.length<2)return"One observation rarely identifies a component. Record another DC test point, ideally on the other side of F1, and compare the two under the same power state.";
const input=latest(state,"VIN_5V"),output=latest(state,"VCC_PROTECTED"),led=latest(state,"LED_A");
if(input!==null&&output!==null&&input>3&&output<1)return"Voltage exists before the protected rail but not after it. Check the intervening fuse, input routing and connector path. Confirm the open path with power disconnected.";
if(r&&r.currentLimited&&r.volts.VCC_PROTECTED<1)return"Source limiting and a depressed output suggest excessive loading. Disconnect the source and compare VCC_PROTECTED-to-GND resistance before selecting a component.";
if(input!==null&&output!==null&&Math.abs(input-output)>.02&&output>1)return"Measure the VIN_5V-to-VCC_PROTECTED drop and compare it to current. Elevated series impedance or an abnormal connection may be involved.";
if(output!==null&&output>4.5&&r&&!r.ledOn)return"The protected supply is present but the LED is off. Investigate the current-limiting resistor, the LED and its return copper. Probe LED_A, then isolate supply before ohms.";
if(led!==null&&output!==null&&led>=output-.05)return"LED_A is close to the protected supply. This often means little load current is flowing. Examine the diode path and return connection without assuming which component failed.";
if(ev.length<4)return"Map the expected path: supply → fuse → resistor → LED → GND. Collect safe measurements on both sides of a suspected element and compare them to a known-good case.";
return"Your evidence is substantial. State one falsifiable root-cause hypothesis, check it with a safe measurement, then choose the minimally invasive virtual repair. Re-test after repair.";
}
return{hint};
});