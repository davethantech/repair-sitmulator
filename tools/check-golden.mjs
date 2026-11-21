#!/usr/bin/env node
/* BOARD//LAB 6 — independently reproducible comparison against a declared
   reference JSON. Synthetic data is never interpreted as physical validation. */
import {createRequire} from "node:module";
import {readFileSync,writeFileSync,statSync,mkdirSync} from "node:fs";
import {resolve,basename,join} from "node:path";
const require=createRequire(import.meta.url),C=require("../validation/golden-core.js");
const file=process.argv[2];
if(!file||process.argv.includes("--help")){console.log("Usage: node tools/check-golden.mjs <reference-dataset.json>");process.exit(file?0:1);}
try{
 const source=resolve(file);
 if(statSync(source).size>150000)throw Error("Reference dataset limited to 150 kB");
 const data=JSON.parse(readFileSync(source,"utf8")),result=C.compare(data);
 const target=resolve("exports/calibration");mkdirSync(target,{recursive:true});
 const filename=basename(file).replace(/[^A-Za-z0-9_.-]/g,"_")+".report.json";
 writeFileSync(join(target,filename),JSON.stringify(result,null,2));
 console.log(JSON.stringify({source:result.dataset,kind:result.kind,observations:result.observations,pass:result.passed,failed:result.failed,rmseV:result.rmseV,maxAbsErrorV:result.maxAbsErrorV,certified:false,report:join(target,filename)},null,2));
 if(!result.passed)process.exitCode=2;
}catch(e){console.error("Reference comparison failed: "+e.message);process.exitCode=1;}
