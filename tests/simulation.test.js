"use strict";
const assert=require("node:assert/strict"),E=require("../simulation/mna-core.js");
function approx(a,b,tol=.03){assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol,"Expected "+a+" ≈ "+b+" ± "+tol);}
for(const [name,fixture] of Object.entries(E.EXAMPLES)){const c=E.validate(fixture);assert.ok(c.nodes.length>0,"Validated "+name);}
const divider=E.solveDC(E.EXAMPLES.divider);
approx(divider.nodes.IN,5,1e-8);approx(divider.nodes.OUT,2.5,1e-8);
approx(divider.currents.R1,.0025,1e-8);approx(divider.currents.R2,.0025,1e-8);
const d=E.solveDC(E.EXAMPLES.diode);
assert.ok(d.nodes.OUT>.6&&d.nodes.OUT<1.4);approx(d.currents.R1,d.currents.D1,1e-8);
const q=E.solveDC(E.EXAMPLES.nmos);
assert.ok(q.nodes.DRAIN<.3,"NMOS on should pull drain low");
const off=JSON.parse(JSON.stringify(E.EXAMPLES.nmos));off.components.find(x=>x.id==="VG").value=0;
assert.ok(E.solveDC(off).nodes.DRAIN>4.9,"NMOS gate low should release drain");
const pmos={title:"high-side PMOS switch",components:[
 {id:"V1",type:"V",p:"VIN",n:"0",value:5},
 {id:"VG",type:"V",p:"GATE",n:"0",value:0},
 {id:"R1",type:"R",p:"OUT",n:"0",value:1000},
 {id:"Q1",type:"PMOS",p:"OUT",n:"VIN",g:"GATE",vth:2,k:.05}]};
const hp=E.solveDC(pmos);assert.ok(hp.nodes.OUT>4.7,"PMOS high-side should provide supply");
pmos.components.find(x=>x.id==="VG").value=5;
assert.ok(E.solveDC(pmos).nodes.OUT<.1,"PMOS high-side off output should fall low");
const rc=E.simulateTransient(E.EXAMPLES.rc,{stepS:1e-5,durationS:.005});
assert.equal(rc.points.length,500);
approx(rc.points[0].nodes.OUT,5*(1-Math.exp(-.00001/.001)),.001);
const at1ms=rc.points[99];approx(at1ms.nodes.OUT,5*(1-Math.exp(-1)),.03);
assert.ok(rc.points.at(-1).nodes.OUT>4.95);
assert.ok(rc.points[0].currents.C1>.004&&rc.points[0].currents.C1<.005);
const rl=E.simulateTransient(E.EXAMPLES.rl,{stepS:1e-5,durationS:.001});
approx(rl.points.at(-1).currents.L1,.05,.0001);
assert.ok(rl.points[0].nodes.OUT>4);
const currentSource={title:"Current source parallel resistor",components:[
 {id:"I1",type:"I",p:"0",n:"OUT",value:.001},
 {id:"R1",type:"R",p:"OUT",n:"0",value:1000}]};
approx(E.solveDC(currentSource).nodes.OUT,1,1e-8);
const pulse={title:"Pulse generator",components:[
 {id:"V1",type:"V",p:"IN",n:"0",value:{pulse:[0,5,0,.001,.0005]}},
 {id:"R1",type:"R",p:"IN",n:"0",value:1000}]};
let pul=E.simulateTransient(pulse,{stepS:.0001,durationS:.002});
assert.ok(pul.points[0].nodes.IN>4.9);
assert.ok(Math.abs(pul.points[7].nodes.IN)<.01);
assert.throws(()=>E.validate({components:[{type:"XYZ",id:"P1",p:"A",n:"0"}]}),/Unsupported/);
assert.throws(()=>E.validate({components:[{type:"R",id:"R1",p:"A",n:"0",value:0}]}),/must be a finite/);
assert.throws(()=>E.solveDC({components:[{type:"R",id:"R1",p:"A",n:"B",value:1000}]}),/Singular circuit/);
assert.throws(()=>E.simulateTransient(E.EXAMPLES.rc,{stepS:1e-9,durationS:1}),/Maximum/);
assert.throws(()=>E.validate({components:[{type:"V",id:"V1",p:"A",n:"0",value:{pulse:[0,5,0,0,.1]}}]}),/Pulse timing invalid/);
console.log("PASS v6: nonlinear MNA DC, RLC transient, diode/NMOS/PMOS, current source, pulses, safety limits and singular topology");
