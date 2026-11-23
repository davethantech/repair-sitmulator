/* BOARD//LAB — independent AI-assisted PCB design learning workflow.
   This is original guided curriculum inspired by industry standard EDA stages.
   No Pantech/GPT-6 Astra API, no AI-generated CAD, no certification.
   Real KiCad and vendor/fabricator checks required for production.
*/
(function(root,build){
 const api=build(
   typeof module==="object"&&module.exports?require("../pcb-core.js"):root.BoardPCB,
   typeof module==="object"&&module.exports?require("../cad/erc-core.js"):root.BoardERC,
   typeof module==="object"&&module.exports?require("../factory-core.js"):root.BoardFactory
 );
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.BoardJourney=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(PCB,ERC,Factory){
"use strict";
const EXTERNAL="https://app.pantech.ai/pcbdesign-gptaastra6-home-c3";
const DAYS=Object.freeze([
 {title:"Requirements & circuit reasoning",objective:"Translate a safe, low-voltage use case into nets, components and a testable schematic.",tasks:["Record power source, loads and limits","Choose components using real datasheets","Calculate values and write expected electrical measurements"]},
 {title:"Schematic and footprint alignment",objective:"Associate each schematic pin with the actual PCB pad number and component orientation.",tasks:["Trace VIN to each load and GND return","Cross-check pin numbering and polarity","Inspect component courtyard and mounting constraints"]},
 {title:"Placement, routing & copper verification",objective:"Route copper intentionally, preserving return paths, clearance and current limits.",tasks:["Identify high-current nets and suitable routing","Inspect power-return loop","Resolve unrouted nets, shorts and edge-clearance issues"]},
 {title:"Electrical checks & manufacturing preparation",objective:"Interpret DRC, generate an auditable BOM and prepare native CAD handoff.",tasks:["Run schematic ERC and PCB DRC in KiCad","Verify manufacturer part numbers and substitutions","Generate and inspect fabrication outputs with native KiCad"]},
 {title:"Assembly, bring-up and fault prevention",objective:"Plan inspection and safe initial testing of a manufactured prototype.",tasks:["Confirm fab stackup and order configuration","Create receiving/AOI/short-test checklist","Define current-limited initial power-up and functional checks"]}
]);
const STEPS=Object.freeze([
 {id:"brief",title:"Define engineering requirements",day:0,help:"State function, voltage, current, safety assumptions, inputs and outputs.",check:"complete brief"},
 {id:"components",title:"Choose component functions",day:0,help:"Inspect power input, fuse/protection, bypass capacitor and load.",check:"real board parts"},
 {id:"values",title:"Calculate values",day:0,help:"Estimate LED resistor, current and dissipation from the modeled assumptions.",check:"theoretical values"},
 {id:"schematic",title:"Review schematic pin/net mapping",day:1,help:"Reconcile each electrical symbol pin with its physical pad.",check:"training ERC"},
 {id:"footprints",title:"Verify symbol-to-footprint mapping",day:1,help:"Unverified part libraries must be reviewed before real fabrication.",check:"library validation"},
 {id:"outline",title:"Set PCB outline and mechanical limits",day:1,help:"Check board size, mounting arrangement and component edge clearance.",check:"physical dimensions"},
 {id:"placement",title:"Plan component placement",day:2,help:"Keep input/protection close, preserve return paths and check courtyard.",check:"layout review"},
 {id:"routing",title:"Route copper and return current",day:2,help:"Evaluate actual track connectivity, shorts and vias.",check:"copper continuity"},
 {id:"drc",title:"Run electrical and geometry checks",day:2,help:"Training DRC is preliminary; native KiCad ERC/DRC is required.",check:"native engineering check"},
 {id:"bom",title:"Prepare the BOM and assembly outputs",day:3,help:"Each orderable part requires verified MPN, supplier, rating and footprint.",check:"purchase review"},
 {id:"gerber",title:"Produce verified fabrication output in KiCad",day:3,help:"Gerber, Excellon and drill map are produced and independently checked outside this teaching editor.",check:"external KiCad"},
 {id:"manufacturing",title:"Approve supplier DFM and prototype bring-up",day:4,help:"Approve CAM, stackup, fabrication/assembly constraints and calibrated test plan.",check:"external manufacturer"}
]);
const KIND=Object.freeze({
 led:{key:"led",label:"5 V safety-indicator board",template:"led",supplyV:5,forwardV:2,targetMa:3,overview:"Basic isolated 5 V input, fuse, LED resistor, bypass and ground return"},
 regulator:{key:"regulator",label:"3.3 V sensor supply concept",template:"regulator",supplyV:5,forwardV:2,targetMa:1,overview:"Conceptual LDO with abstract pinout; no manufacturing authorisation"},
 usb:{key:"usb",label:"USB-C 5 V sink concept",template:"usb",supplyV:5,forwardV:2,targetMa:2,overview:"USB-C CC resistors and protected 5 V concept; connector footprint is not real"}
});
const safeText=(x,n=500)=>String(x??"").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/g,"").slice(0,n).trim();
function num(x,name,min,max){const v=Number(x);if(!Number.isFinite(v)||v<min||v>max)throw Error(name+" must be "+min+" to "+max);return v;}
function recommend(description){
 const prompt=safeText(description,1500);
 if(prompt.length<8)throw Error("Describe a circuit idea in at least eight characters");
 const lc=prompt.toLowerCase(),usb=/usb[\s-]*c|type[\s-]*c|\bcc\b/.test(lc),
       regulator=/(3[.,]3|sensor|ldo|regulat|microcontroller|mcu)/.test(lc);
 const kind=usb?"usb":regulator?"regulator":"led",fixture=KIND[kind];
 const unknown=(/\bbattery\b|\blithium\b|\bmains\b|\bac[\s-]*(line|power)|\b230\s*v\b/.test(lc));
 return{kind,template:fixture.template,label:fixture.label,summary:fixture.overview,
    assistantType:"deterministic keyword triage, NOT a generative AI designer",
    confidence:"heuristic only",
    requirements:[prompt,"Confirm nominal voltage, maximum load, polarity, operating temperature, enclosure and applicable safety rules."],
    warnings:[...(
       unknown?["This beginner workflow does not model mains or lithium battery design. Only use isolated low-voltage trainer templates."]:[]
    ),...(kind==="usb"?["USB-C connector, CC and ESD design require actual standards-compliant pin mapping and native ERC/DRC."]:[])],
    next:"Start with a manufacturer datasheet and a circuit block diagram. Design reviews are mandatory."};
}
function brief(input={}){
 const kind=input.kind||"led";if(!KIND[kind])throw Error("Unknown supported training project type");
 const title=safeText(input.title||KIND[kind].label,120);
 if(title.length<5)throw Error("Project title must have at least five characters");
 const supplyV=num(input.supplyV??KIND[kind].supplyV,"Isolated supply voltage",1,24);
 const targetMa=num(input.targetMa??KIND[kind].targetMa,"Target LED current (mA)",.1,40);
 const forwardV=num(input.forwardV??KIND[kind].forwardV,"LED forward voltage",.8,4.5);
 if(supplyV<=forwardV)throw Error("Source must exceed LED forward voltage to estimate series resistor");
 return{schema:"boardlab.pcb.journey.v1",kind,title,supplyV,forwardV,targetMa,
  intendedUse:safeText(input.intendedUse||KIND[kind].overview,500),
  assumption:"An isolated ideal low-voltage source and an LED approximation, not a vendor device characterization",
  productionApproved:false};
}
const E12=[1,1.2,1.5,1.8,2.2,2.7,3.3,3.9,4.7,5.6,6.8,8.2];
function nearestE12(ohms){
 if(!Number.isFinite(ohms)||ohms<=0)throw Error("Positive resistance required");
 let best=0,dist=Infinity;
 const dec=Math.floor(Math.log10(ohms));
 for(let i=dec-1;i<=dec+1;i++)for(const n of E12){const r=n*10**i,d=Math.abs(Math.log(r/ohms));if(d<dist){dist=d;best=r;}}
 return Number(best.toPrecision(6));
}
function ledCalculation(project){
 const b=brief(project),r=(b.supplyV-b.forwardV)/(b.targetMa/1000),series=nearestE12(r),currentMa=(b.supplyV-b.forwardV)/series*1000,
       dissipationW=((b.supplyV-b.forwardV)**2)/series;
 return{targetOhms:r,e12Ohms:series,actualMa:currentMa,resistorPowerW:dissipationW,
   suggestedRatedPowerW:Math.max(.125,Math.ceil(dissipationW*3*8)/8),
   resistorWattHeadroom:3,
   caveats:["LED forward voltage depends on device bin, current and temperature.","Check actual supply tolerance, pulse currents, footprint power derating and resistor voltage rating.","No battery/mains/USB-C power negotiation safety validation is implied."]};
}
function template(project){const spec=brief(project),b=spec.kind==="led"?PCB.routedExample():PCB.getTemplate(KIND[spec.kind].template);b.title=spec.title;
 b.notes.push("BOARD//LAB PCB journey starter. Schematic and BOM require device-level manufacturer validation.");
 return PCB.validateImport(b);
}
function review(board,project){
 const spec=brief(project),b=PCB.validateImport(board),pcb=PCB.check(b),sch=ERC.schematicFromPCB(b),erc=ERC.check(sch,b),dfm=Factory.report(b),calc=ledCalculation(spec);
 const hasAbstract=b.parts.some(p=>p.type.includes("CONCEPT")||p.type.includes("TRAINER"));
 const hasSource=b.parts.some(p=>p.type==="HEADER2"||p.type==="USB_C_CONCEPT");
 const hasLoad=b.parts.some(p=>p.type==="LED0805");
 const hasResistor=b.parts.some(p=>p.type==="R0805");
 const holes=b.parts.filter(p=>p.type==="HOLE_M3");
 const totalPads=PCB.allPads(b).filter(p=>p.net).length;
 const profile=Object.freeze({
  brief:{done:!!spec.title&&spec.supplyV<=24,detail:"Requirements defined for isolated, low-voltage training"},
  components:{done:b.parts.length>=4&&hasSource&&hasResistor&&hasLoad,detail:"Connector, resistor and LED roles checked"},
  values:{done:Number.isFinite(calc.e12Ohms)&&calc.actualMa>0,detail:"Theoretical LED resistor and dissipation calculated"},
  schematic:{done:erc.errors===0,detail:erc.errors+" schematic ↔ PCB pin mismatch(es)"},
  footprints:{done:!hasAbstract&&erc.errors===0,detail:hasAbstract?"Contains nonfabricable conceptual footprints":"Generic footprint pins appear consistent; vendor part mapping remains unverified"},
  outline:{done:b.width>=25&&b.height>=25&&holes.length>=2,detail:holes.length+" mounting holes; "+b.width+" × "+b.height+" mm"},
  placement:{done:!pcb.issues.some(x=>x.code==="pad_edge"||x.code==="pad_short"),detail:"Teaching placement/edge checks, not full 3D mechanical clearance"},
  routing:{done:pcb.percent>=99.999&&pcb.errors===0,detail:"Connected copper "+pcb.percent+"%; "+pcb.errors+" basic DRC error(s)"},
  drc:{done:pcb.errors===0&&pcb.warnings===0&&erc.errors===0,detail:"Training DRC "+pcb.errors+" error(s), "+pcb.warnings+" warning(s); real KiCad ERC/DRC not run"},
  bom:{done:false,detail:"Purchase MPNs, ratings, substitutions and assembly footprints require verified supplier evidence"},
  gerber:{done:false,detail:"Generate and inspect real Gerber/Excellon files in KiCad; teaching export is NOT certified CAM"},
  manufacturing:{done:false,detail:"Supplier signoff, production testing and safe prototype bring-up are external approval gates"}
 });
 const stages=STEPS.map(step=>({...step,status:["bom","gerber","manufacturing"].includes(step.id)?"external":profile[step.id].done?"completed":"action-required",detail:profile[step.id].detail}));
 const guidance=[];
 if(!hasSource)guidance.push({severity:"error",message:"No modeled input connector found; check power input and ground return."});
 if(!hasLoad)guidance.push({severity:"review",message:"No LED load found. Switch to a suitable model or check design intent."});
 if(erc.errors)guidance.push({severity:"error",message:erc.errors+" schematic-pad mismatches: cross-probe in the Circuit Design Laboratory."});
 if(pcb.errors||pcb.warnings)guidance.push({severity:"warning",message:"Copper validation: "+pcb.errors+" errors, "+pcb.warnings+" warnings; inspect PCB Studio traces."});
 if(hasAbstract)guidance.push({severity:"error",message:"Abstract footprint/pin map cannot be used in an actual KiCad fabrication release."});
 if(erc.reviews)guidance.push({severity:"review",message:erc.reviews+" parts lack verified supplier MPN/pin documentation."});
 if(!holes.length)guidance.push({severity:"review",message:"No mount-hole planning is included; verify enclosure and fastening requirements."});
 guidance.push({severity:"external",message:"Training calculations never establish manufacturing approval. Open KiCad, run native ERC/DRC, validate actual components and manufacturer constraints."});
 return{spec,calc,stages,guidance,board:{title:b.title,width:b.width,height:b.height,parts:b.parts.length,assignedPads:totalPads,
   tracks:b.tracks.length,vias:b.vias.length,connections:pcb.percent,holes:holes.length},
  checks:{drcErrors:pcb.errors,drcWarnings:pcb.warnings,ercErrors:erc.errors,ercReviews:erc.reviews,dfmBlockers:dfm.blockers},
  trainingProgress:stages.filter(x=>x.status==="completed").length+"/"+stages.length,
  externallyVerified:false,manufacturerApproved:false,canFabricate:false,
  notes:"No AI language model, Pantech integration, manufacturer part validation or physical board test."};
}
function handoff(board,project){
 const b=PCB.validateImport(board),r=review(b,project),s=ERC.schematicFromPCB(b);
 return{metadata:{schema:"boardlab.pcb.journey.bundle.v1",release:"EDUCATION_ONLY",
   manufacturerApproved:false,generatedFrom:"BOARD//LAB original training workspace"},
   designBrief:brief(project),pcbProject:b,schematic: s,validation:r,
   checklist:[
    "Open and inspect the exported PCB in actual KiCad; resolve every native DRC/ERC error.",
    "Recreate/verify schematic symbols, current library footprints, polarity, thermal pins, supplier part numbers and datasheets.",
    "Check width/current/temperature, copper clearances, isolated supply, fuse protection, test access and stackup with your fab.",
    "Generate actual Gerber and Excellon from native KiCad only after signed off checks; inspect outputs in Gerber viewer.",
    "Get fab and assembly quotations and run electrical test + current-limited first bring-up under qualified supervision."
   ],
   files:{pcbJson:JSON.stringify(b,null,2),schematicJson:JSON.stringify(s,null,2),bomCsv:Factory.bom(b),
      pickPlaceCsv:Factory.pickPlace(b),drillCsv:Factory.drills(b),kicadPcb:PCB.toKiCad(b)},
   externalCourse:EXTERNAL};
}
return{EXTERNAL,DAYS,STEPS,KIND,recommend,brief,ledCalculation,nearestE12,template,review,handoff};
});