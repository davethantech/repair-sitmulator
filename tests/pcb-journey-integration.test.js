"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=f=>fs.readFileSync(path.join(root,f),"utf8");
const html=read("pcb-journey.html"),ui=read("academy/pcb-journey-ui.js");
assert.match(html,/BOARD\/\/LAB/);
assert.match(html,/https:\/\/app\.pantech\.ai\/pcbdesign-gptaastra6-home-c3/);
assert.match(html,/noopener noreferrer/);
assert.match(html,/Rule-based guidance/);
assert.match(html,/Manufacturing approval locked/);
for(const id of ["idea","analyzeIdea","loadProposed","template","loadTemplate","runReview","loadStudio","editPcb","boardSvg","reviewList","downloadBoard","boardFile","handoffChecks","progressSummary"]){
 assert.ok(html.includes('id="'+id+'"'),"Missing referenced control "+id);
}
for(const m of html.matchAll(/<script src="([^"]+)"><\/script>/g))assert.ok(fs.existsSync(path.join(root,m[1])),"Missing script "+m[1]);
for(const m of html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g))assert.ok(fs.existsSync(path.join(root,m[1])),"Missing stylesheet "+m[1]);
for(const file of ["index.html","standalone.html","engineering-lab.html","digital-twin.html","circuit-lab.html","assembly-3d.html"]){
 assert.ok(read(file).includes('href="pcb-journey.html"'),"No accessible guided PCB link from "+file);
}
assert.match(read("pcb-studio.js"),/window\.location\.hash==='#pcb'/);
assert.match(ui,/boardlab\.pcb\.project\.v3/);
assert.match(read("README.md"),/pcb-journey\.html/);
assert.ok(!html.includes("iframe"),"Third-party content must not be embedded or impersonated");
console.log("PASS: all guided academy assets, controls, navigation links, safe third-party course URL, PCB Studio deep-link");
