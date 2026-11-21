"use strict";
const assert=require("node:assert/strict");
const P=require("../pcb-core.js"),F=require("../factory-core.js"),M=require("../embedded-core.js"),S=require("../signal-core.js"),R=require("../rework-core.js"),A=require("../assessment-core.js");
const f=F.report(P.routedExample()),usb=F.report(P.getTemplate("usb"));
function completed(template,options={}){let s=M.make(M.TEMPLATES[template],options);M.run(s,300);return s;}
function reworked(){const s=R.make();for(let i=0;i<15;i++)R.heat(s,{airC:310,airflow:.7,distanceMm:4},1);R.remove(s);R.place(s);for(let i=0;i<10;i++)R.heat(s,{airC:310,airflow:.7,distanceMm:4},1);R.cool(s,60);return s;}
const good=reworked(),dirty=R.make({bridge:true,corrosion:true});R.clean(dirty);R.bridge(dirty);
const cases={
 factory_route:{factory:f},
 factory_guard:{factory:usb},
 mcu_blink:{mcu:completed("blink")},
 mcu_nack:{mcu:completed("sensor",{fault:"i2c_nack"})},
 mcu_brownout:{mcu:completed("blink",{fault:"brownout"})},
 signal_match:{signal:S.waveform({sourceOhm:50,impedanceOhm:50,loadOhm:50})},
 signal_unmatched:{signal:S.waveform({sourceOhm:0,impedanceOhm:50,loadOhm:100})},
 rework_repair:{rework:good,inspection:R.inspect(good)},
 rework_contamination:{rework:dirty,inspection:R.inspect(dirty)}
};
for(const [id,c] of Object.entries(cases)){const r=A.grade(id,c);assert.equal(r.score,100,"Expected objective pass "+id);assert.equal(r.passed,true);assert.equal(r.results.reduce((n,x)=>n+x.achieved,0),100);}
for(const id of Object.keys(A.TASKS)){const r=A.grade(id,{});assert.equal(r.passed,false,"Missing evidence should not pass "+id);}
assert.throws(()=>A.grade("made_up_id",{}),/Unknown assessment/);
const saved=A.report(Object.keys(cases).map(id=>A.grade(id,cases[id])));
assert.equal(saved.records.length,9);assert.match(saved.notes,/not accredited/);
console.log("PASS v5: nine objective lab practice assessments and missing-evidence rejection");
