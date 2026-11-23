"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const P=require("../pcb-core.js"),E=require("../cad/erc-core.js"),F=require("../factory-core.js"),J=require("../academy/pcb-journey-core.js");
const nodes=new Map(),memory=new Map(),downloads=[];
function el(id){return{id,value:"",textContent:"",innerHTML:"",style:{},checked:false,files:[],dataset:{},disabled:false,
 listeners:{},classList:{toggle(){}},setAttribute(){},addEventListener(event,fn){this.listeners[event]=fn;},click(){this.listeners.click?.();},
 querySelectorAll(){return[];},appendChild(){},remove(){},focus(){}};
}
function get(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id);}
const downloadButtons=["bundle","kicad","bom","pick","drill","schematic"].map(t=>({...el("dl-"+t),dataset:{download:t}}));
const doc={readyState:"complete",body:{appendChild(){}},getElementById:get,querySelectorAll(sel){if(sel==="[data-download]")return downloadButtons;return[];},
 createElement(type){const a=el(type);a.click=function(){downloads.push(this.download)};return a;},addEventListener(){}};
const store={getItem(k){return memory.get(k)||null;},setItem(k,v){memory.set(k,String(v));},removeItem(k){memory.delete(k);}};
const win={BoardPCB:P,BoardERC:E,BoardFactory:F,BoardJourney:J,location:{href:""},confirm:()=>true};
const code=fs.readFileSync(path.join(__dirname,"..","academy/pcb-journey-ui.js"),"utf8");
vm.runInNewContext(code,{window:win,document:doc,localStorage:store,URL:{createObjectURL:()=>"blob:testing",revokeObjectURL(){}},Blob,setTimeout(){},console},{filename:"pcb-journey-ui.js",timeout:5000});
const click=id=>{const item=get(id);assert.ok(item.listeners.click,"Missing click action "+id);item.click();};
assert.ok(get("boardSvg").innerHTML.includes("board-part"));
assert.match(get("progressSummary").textContent,/9\/12/);
assert.equal(get("drcError").textContent,0);
assert.equal(get("ercError").textContent,0);
assert.equal(get("targetOhms").textContent,"1000.0");
assert.equal(get("e12Ohms").textContent,"1.00e+3");
assert.equal(get("ledMa").textContent,"3.000");
assert.ok(get("dayNav").innerHTML.includes("DAY 5"));
assert.ok(get("stageNav").innerHTML.includes("external"));
assert.ok(get("reviewList").innerHTML.includes("supplier"));
get("idea").value="USB-C low-voltage 5V sink with LED output and input protection";
click("analyzeIdea");
assert.equal(get("template").value,"usb");
assert.match(get("ideaFeedback").textContent,/deterministic keyword triage/);
click("loadProposed");
assert.equal(get("boardHeading").textContent,"USB-C 5 V sink concept");
assert.ok(Number(get("ercError").textContent)>0);
get("template").value="led";
get("projectTitle").value="Training LED Revision B";
click("loadTemplate");
assert.equal(get("boardHeading").textContent,"Training LED Revision B");
assert.equal(get("progressSummary").textContent,"9/12");
click("runReview");
assert.ok(get("partInfo").textContent.includes("Manufacturing approval remains locked"));
for(const item of downloadButtons){assert.ok(item.listeners.click,"missing export "+item.dataset.download);item.click();}
assert.equal(downloads.length,6);
assert.ok(downloads.some(x=>x.endsWith(".kicad_pcb")));
assert.ok(downloads.some(x=>x.includes("BOM.csv")));
assert.ok(downloads.some(x=>x.includes("TRAINING_ONLY")));
click("editPcb");
assert.equal(win.location.href,"index.html#pcb");
assert.ok(memory.has("boardlab.pcb.project.v3"));
assert.equal(JSON.parse(memory.get("boardlab.pcb.project.v3")).title,"Training LED Revision B");
click("loadStudio");
assert.equal(get("boardHeading").textContent,"Training LED Revision B");
assert.ok(memory.has("boardlab.pcb.journey.v1"));
console.log("PASS: browser PCB journey UI, real layout display, planner, live ERC/DRC, 6 exports and Studio integration");
