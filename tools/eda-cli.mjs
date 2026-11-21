#!/usr/bin/env node
/* Offline EDA verification bridge. Runs only installed binaries with fixed argument arrays.
   No shell, no network calls, no firmware or physical hardware access. */
import {createRequire} from "node:module";
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawnSync} from "node:child_process";
const require=createRequire(import.meta.url);
const PCB=require("../pcb-core.js"),SPICE=require("../spice-export.js");
const flags=new Set(process.argv.slice(2)),isRun=flags.has("--ngspice")||flags.has("--kicad");
if(flags.has("--help")||!flags.size){
 console.log("BOARD//LAB EDA CLI — educational exports; NOT fabrication approval");
 console.log("node tools/eda-cli.mjs --export   Write example board + illustrative SPICE");
 console.log("node tools/eda-cli.mjs --ngspice  Run ngspice batch operating point (if installed)");
 console.log("node tools/eda-cli.mjs --kicad    Run native KiCad PCB DRC (if installed; expect trainer warnings)");
 process.exit(0);
}
const b=PCB.routedExample();
const circuit=SPICE.makeNetlist(b);
const pcb=PCB.toKiCad(b);
let dir=mkdtempSync(join(tmpdir(),"boardlab-eda-"));
const spath=join(dir,"led-training.cir"),kpath=join(dir,"led-training.kicad_pcb");
writeFileSync(spath,circuit);writeFileSync(kpath,pcb);
function run(binary,args){
 const result=spawnSync(binary,args,{cwd:dir,encoding:"utf8",timeout:25000,maxBuffer:1024*1024,windowsHide:true,shell:false});
 if(result.error?.code==="ENOENT"){console.error(binary+" not installed; no native verification performed.");return 2;}
 if(result.error){console.error(String(result.error.message));return 2;}
 console.log("COMMAND: "+binary+" "+args.join(" "));
 console.log((result.stdout||"").slice(0,8000));
 if(result.stderr)console.error(result.stderr.slice(0,4000));
 console.log("EXIT STATUS: "+result.status);
 return result.status||0;
}
let rc=0;
try{
 if(flags.has("--export")){
  const target=resolve("exports");mkdirSync(target,{recursive:true});
  writeFileSync(join(target,"BOARDLAB_LED_TRAINING_ONLY.cir"),circuit);
  writeFileSync(join(target,"BOARDLAB_LED_TRAINING_ONLY.kicad_pcb"),pcb);
  console.log("Wrote exports/ low-voltage training examples. Run native verification before fabrication.");
 }
 if(flags.has("--ngspice"))rc=Math.max(rc,run("ngspice",["-b",spath]));
 if(flags.has("--kicad")){
  const report=join(dir,"drc-report.txt");
  rc=Math.max(rc,run("kicad-cli",["pcb","drc","--exit-code-violations","--output",report,kpath]));
  try{console.log(readFileSync(report,"utf8").slice(0,10000));}catch{}
 }
}finally{rmSync(dir,{recursive:true,force:true});}
if(isRun)process.exitCode=rc;