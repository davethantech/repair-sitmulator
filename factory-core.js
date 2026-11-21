/* BOARD//LAB 5 — deterministic fabrication-readiness TEACHING engine.
   No Gerber or drill toolpath is generated. All outputs require CAD, CAM and fab sign-off. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./pcb-core.js"):root.BoardPCB);
if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardFactory=api;})(typeof globalThis!=="undefined"?globalThis:this,function(PCB){
"use strict";
const STEPS=[
{key:"schematic",title:"Schematic & supplier validation",details:"Verify connector polarity, pin mapping, reference designators, ratings and manufacturer part numbers."},
{key:"layout",title:"Routing & geometry",details:"Run training geometry checks; then check every rule with native KiCad DRC/ERC and real library models."},
{key:"stackup",title:"Stackup & impedances",details:"Approve layer count, dielectric geometry, copper weight, controlled-impedance coupons and tolerances with the fabricator."},
{key:"artwork",title:"Artwork generation",details:"Produce manufacturer-approved native CAD Gerber/ODB++/IPC-2581 and Excellon NC drill files."},
{key:"drilling",title:"Drill, plating & lamination",details:"Confirm plated/non-plated holes, annular rings, aspect ratio, finish, solder mask and via processing."},
{key:"assembly",title:"Assembly documentation",details:"Verify component polarity, centroid rotation, footprints, substitutions, stencil and reflow plan."},
{key:"inspection",title:"Inspection & test",details:"Inspect solder joints and assembly orientation; run continuity, shorts, programming and functional tests."},
{key:"release",title:"Release gate",details:"Sign off DFM/DFT, electrical test, BOM procurement and revision control before manufacturing."}
];
function num(x,name,lo,hi){x=Number(x);if(!Number.isFinite(x)||x<lo||x>hi)throw Error(name+" must be "+lo+"…"+hi);return x;}
function esc(x){return '"'+String(x??"").replace(/"/g,'""').replace(/[\r\n]/g,' ')+'"';}
function csv(rows){return rows.map(r=>r.map(esc).join(",")).join("\r\n")+"\r\n";}
function report(board,settings={}){
const b=PCB.validateImport(board);const opt={minDrill:num(settings.minDrill??.2,"minimum drill",.1,1.5),minMaskSliver:num(settings.minMaskSliver??.1,"minimum solder-mask bridge",.05,.5),assemblyMargin:num(settings.assemblyMargin??.25,"assembly margin",0,3)};
const pcb=PCB.check(b),issues=pcb.issues.map(x=>({severity:x.level==="error"?"blocker":"review",code:x.code,location:x.id,detail:x.message,source:"Training PCB design-rule checker"}));
const add=(severity,code,detail,location="board")=>issues.push({severity,code,detail,location,source:"Teaching fabrication review"});
const holes=b.parts.filter(p=>p.type==="HOLE_M3"),smd=b.parts.filter(p=>!["HOLE_M3","HEADER2","HEADER3"].includes(p.type));
if(!holes.length)add("review","no_mounts","No mounting holes; verify mechanical mounting requirements.");
if(holes.length<2)add("review","few_mounts","Mounting strategy must be reviewed.");
if(b.layers>2)add("review","stackup_unverified","An illustrated four-layer count does not create actual inner-copper polygons. Native CAD and fab layer stack required.");
if(b.parts.some(p=>p.type.includes("CONCEPT")||p.type.includes("TRAINER")))add("blocker","abstract_footprint","Conceptual and training-specific footprints cannot be released to fabrication.");
for(const v of b.vias){
 if(v.drill<opt.minDrill)add("blocker","drill_below_profile","Via "+v.id+" drill "+v.drill+" mm below profile "+opt.minDrill+" mm.",v.id);
 if((v.diameter-v.drill)/2<.125-1e-8)add("blocker","insufficient_annular_ring","Via "+v.id+" has insufficient annular ring.",v.id);
}
for(const p of b.parts){const d=PCB.COMPONENTS[p.type];if(!d)continue;
 if(["HOLE_M3"].includes(p.type)){
  if(p.x<d.body[0]/2+.2||p.x>b.width-d.body[0]/2-.2||p.y<d.body[1]/2+.2||p.y>b.height-d.body[1]/2-.2)add("review","mount_edge","Check mounting-hole mechanical keepout.",p.ref);
  continue;
 }
 const angle=((p.angle%180)+180)%180,rotate=angle>45&&angle<135;
 const hw=(rotate?d.body[1]:d.body[0])/2+opt.assemblyMargin;
 const hh=(rotate?d.body[0]:d.body[1])/2+opt.assemblyMargin;
 if(p.x<hw||p.y<hh||p.x>b.width-hw||p.y>b.height-hh)add("blocker","component_over_edge",p.ref+" assembly courtyard intersects board edge.",p.ref);
 if(!p.value||/CHECK|select actual|abstract|concept/i.test(p.value))add("review","unknown_ordering_value",p.ref+" needs exact manufacturer part and verified pinout.",p.ref);
 }
const types={};for(const p of smd){const key=p.type+" | "+p.value;types[key]=(types[key]||0)+1;}
const review={board:b.title,boardSizeMm:[b.width,b.height],layers:b.layers,designRuleResults:{errors:pcb.errors,warnings:pcb.warnings,connectivity:pcb.percent},manufacturing:{componentCount:smd.length,throughHoleCount:b.parts.filter(p=>p.type==="HEADER2"||p.type==="HEADER3").length,viaCount:b.vias.length,mountingHoles:holes.length,uniqueAssemblyLines:Object.keys(types).length},issues,blockers:issues.filter(i=>i.severity==="blocker").length,reviews:issues.filter(i=>i.severity==="review").length,canRelease:false,releaseStatus:"TRAINING ONLY — NEVER A FABRICATION SIGNOFF",profile:opt,steps:STEPS};
return review;
}
function bom(board){const b=PCB.validateImport(board),rows=[["Refs","Qty","Value / notes","Footprint","Supplier MPN","Verified"]],groups=new Map();
for(const p of b.parts){if(p.type==="HOLE_M3")continue;const footprint=PCB.COMPONENTS[p.type].footprint,key=p.type+"|"+p.value;
if(!groups.has(key))groups.set(key,{parts:[],value:p.value,footprint});groups.get(key).parts.push(p.ref);}
for(const x of groups.values())rows.push([x.parts.sort().join(" "),x.parts.length,x.value,x.footprint,"NOT ASSIGNED","NO"]);return csv(rows);}
function pickPlace(board){const b=PCB.validateImport(board);return csv([["Ref","Footprint","Center X (mm)","Center Y (mm)","Rotation (deg)","Side","Status"],...b.parts.filter(p=>!["HOLE_M3","HEADER2","HEADER3"].includes(p.type)).map(p=>[p.ref,PCB.COMPONENTS[p.type].footprint,p.x,p.y,p.angle,"Top","UNVERIFIED CENTROID"])]);}
function drills(board){const b=PCB.validateImport(board),rows=[["Hole","X (mm)","Y (mm)","Drill (mm)","Plated","Use"]];for(const v of b.vias)rows.push([v.id,v.x,v.y,v.drill,"YES","Via"]);
for(const p of b.parts){if(p.type==="HOLE_M3")rows.push([p.ref,p.x,p.y,3.2,"NO","Mechanical mounting"]);
if(["HEADER2","HEADER3"].includes(p.type)){for(const pd of PCB.padsFor(p))rows.push([p.ref+"."+pd.pin,pd.x,pd.y,1,"YES","Header pin"]);}}
return csv(rows);}
function panelize(board,options={}){
const b=PCB.validateImport(board),cols=num(options.cols??2,"columns",1,10),rows=num(options.rows??2,"rows",1,10),gap=num(options.gap??3,"spacing",2,20),rail=num(options.rail??8,"rail",0,30);
if(cols%1||rows%1)throw Error("Panel quantities must be integers");
const w=cols*b.width+(cols-1)*gap+2*rail,h=rows*b.height+(rows-1)*gap+2*rail;
const placements=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)placements.push({index:placements.length+1,x:rail+x*(b.width+gap),y:rail+y*(b.height+gap),rotation:0});
return{type:"TRAINING_PANEL_PLAN_NOT_CAM",rows,cols,board:b.title,widthMm:w,heightMm:h,railMm:rail,gapMm:gap,copies:rows*cols,placements,reviewRequired:["Rails, break-away tabs, tooling holes and fiducials are not computed","V-score and milling strategies are not inferred","Approve panel with assembly house and fabricator"],fitsSmallPanel:w<=500&&h<=500};
}
function checklist(board){const r=report(board);return{model:"Classroom example only",passed:false,items:STEPS.map(x=>({...x,completed:false})),openBlockers:r.blockers,openReviews:r.reviews};}
return{STEPS,report,bom,pickPlace,drills,panelize,checklist};
});