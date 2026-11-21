#!/usr/bin/env node
/* BOARD//LAB 6 native verification bridge.
 * Executes only the fixed ngspice executable, no shell, no arbitrary commands.
 * Native solver availability and numerical validation are independent of the
 * browser's compact MNA engine. */
import {createRequire} from "node:module";
import {readFileSync,writeFileSync,mkdirSync,statSync} from "node:fs";
import {resolve,basename,join} from "node:path";
import {spawnSync} from "node:child_process";
const require=createRequire(import.meta.url);
const M=require("../simulation/mna-core.js"),Spice=require("../simulation/export-spice.js");
const args=process.argv.slice(2),get=(flag,defaultValue)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:defaultValue;};
if(args.includes("--help")){
 console.log("Usage: node tools/circuit-verify.mjs [--example divider|rc|rl|diode|nmos] [--input circuit.json] [--analysis op|tran] [--step .00001] [--duration .005] [--native]");
 console.log("Always exports comparable browser-MNA reference JSON and ngspice .cir. --native optionally invokes installed ngspice.");
 process.exit(0);
}
const example=get("--example","divider"),path=get("--input",null),analysis=get("--analysis","op");
let circuit;
try{
 if(path){const filename=resolve(path);if(statSync(filename).size>100000)throw Error("Circuit input limited to 100 kB");circuit=JSON.parse(readFileSync(filename,"utf8"));}
 else {if(!(example in M.EXAMPLES))throw Error("Unknown example");circuit=M.EXAMPLES[example];}
 const check=M.validate(circuit);
 if(!["op","tran"].includes(analysis))throw Error("Choose op or tran");
 const stepS=Number(get("--step",".00001")),durationS=Number(get("--duration",".005"));
 const result=analysis==="op"?M.solveDC(circuit):M.simulateTransient(circuit,{stepS,durationS});
 const deck=Spice.build(circuit,{analysis,stepS,durationS});
 const output=resolve("exports/circuit-v6");mkdirSync(output,{recursive:true});
 const name=(path?basename(path).replace(/\.json$/i,""):example).replace(/[^A-Za-z0-9_-]/g,"_").slice(0,60);
 const base=join(output,name+"_"+analysis);
 writeFileSync(base+".cir",deck);
 writeFileSync(base+".reference.json",JSON.stringify({schema:"boardlab.mna.reference.v1",title:check.title,result,
  disclosure:"Compact teaching solver; compare against ngspice and measurements before relying on results"},null,2));
 console.log("BOARD//LAB MNA reference and SPICE deck saved:\n"+base+".reference.json\n"+base+".cir");
 if(!args.includes("--native"))process.exit(0);
 const child=spawnSync("ngspice",["-b","-o",base+".ngspice.log",base+".cir"],{encoding:"utf8",timeout:30000,shell:false,maxBuffer:1024*1024,windowsHide:true});
 if(child.error){console.error(child.error.code==="ENOENT"?"Native ngspice is not installed: no native verification run.":child.error.message);process.exitCode=2;}
 else{console.log((child.stdout||"").slice(0,3000));console.error((child.stderr||"").slice(0,1500));console.log("ngspice exit status "+child.status+"; inspect "+base+".ngspice.log");process.exitCode=child.status||0;}
}catch(e){console.error("Verification aborted: "+e.message);process.exitCode=1;}
