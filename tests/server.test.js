"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"boardlab-school-"));process.env.BOARDLAB_DATA_DIR=temp;
const {server}=require("../server.js"),C=require("../advanced-core.js");
async function main(){
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
let adminCookie="",studentCookie="";
async function request(endpoint,method="GET",body,as=""){
const headers={};if(method==="POST")headers["Content-Type"]="application/json";if(as==="admin")headers.Cookie=adminCookie;else if(as==="student")headers.Cookie=studentCookie;
const response=await fetch(base+endpoint,{method,headers,body:body!==undefined?JSON.stringify(body):undefined});
const json=await response.json();return{status:response.status,json,cookie:response.headers.get("set-cookie")||""};
}
try{
let x=await request("/api/status");assert.equal(x.json.configured,false);
x=await request("/api/setup","POST",{username:"admin",password:"StrongTrainingPass!123",displayName:"Instructor Admin"});assert.equal(x.status,201);
assert.equal((await request("/api/setup","POST",{username:"other",password:"StrongTrainingPass!123"})).status,403);
x=await request("/api/login","POST",{username:"admin",password:"StrongTrainingPass!123"});assert.equal(x.status,200);adminCookie=x.cookie.split(";")[0];assert.ok(adminCookie.startsWith("bl_session="));
assert.equal((await request("/api/users")).status,401);
x=await request("/api/users","POST",{username:"learner01",password:"StudentSecurePass!123",displayName:"Student One",role:"student",batch:"2026-A"},"admin");assert.equal(x.status,201);const learnerId=x.json.user.id;
assert.ok(!JSON.stringify(x.json).includes("StudentSecurePass"));
assert.equal((await request("/api/users","POST",{username:"learner01",password:"AnotherSecurePass!123",displayName:"Dup",role:"student"},"admin")).status,409);
x=await request("/api/login","POST",{username:"learner01",password:"StudentSecurePass!123"});assert.equal(x.status,200);studentCookie=x.cookie.split(";")[0];
assert.equal((await request("/api/users","POST",{username:"admin2",password:"AnotherSecurePass!123",displayName:"New Admin",role:"instructor"},"student")).status,403);
assert.equal((await request("/api/summary","GET",undefined,"student")).status,403);
let c=C.FAULTS.find(v=>v.target&&v.target!=="NO_FAULT");assert.ok(c);
x=await request("/api/assignments","POST",{studentId:learnerId,caseId:c.id},"admin");assert.equal(x.status,201);
assert.equal((await request("/api/assignments","GET",undefined,"student")).json.assignments.length,1);
x=await request("/api/attempts","POST",{caseId:c.id,diagnosedPart:c.target,measurements:6,safetyViolations:0,repaired:true,qa:true},"student");assert.equal(x.status,201);assert.equal(x.json.attempt.score,100);
x=await request("/api/summary","GET",undefined,"admin");assert.equal(x.json.learners[0].bestScore,100);
x=await request("/api/progress","POST",{completed:[0,1,99999],quiz:[1],assemblyPasses:2},"student");assert.equal(x.status,200);assert.deepEqual(x.json.progress.completed,[0,1]);
const external=await fetch(base+"/api/progress",{method:"POST",headers:{"Content-Type":"application/json","Origin":"https://evil.example","Cookie":studentCookie},body:JSON.stringify({completed:[2]})});assert.equal(external.status,403);
const invalid=await fetch(base+"/api/progress",{method:"POST",headers:{"Content-Type":"text/plain","Cookie":studentCookie},body:"{}"});assert.equal(invalid.status,415);
const staticHTML=await fetch(base+"/engineering-lab.html");assert.equal(staticHTML.status,200);assert.match(await staticHTML.text(),/PCB FACTORY/);
const traversal=await fetch(base+"/.boardlab-data/records.json");assert.equal(traversal.status,404);

const tasks=await request("/api/lab-tasks","GET",undefined,"student");
assert.equal(tasks.status,200);assert.ok(tasks.json.tasks.some(x=>x.id==="divider"));
const circuit=require("../simulation/mna-core.js").EXAMPLES.divider;
x=await request("/api/lab-submissions","POST",{task:"divider",score:999,payload:{circuit}},"student");
assert.equal(x.status,201);assert.equal(x.json.submission.score,100);
assert.equal(x.json.submission.accredited,false);
x=await request("/api/lab-submissions","POST",{task:"divider",payload:{circuit:{components:[]}}},"student");
assert.equal(x.status,400);
x=await request("/api/lab-submissions","GET",undefined,"student");
assert.equal(x.json.submissions.length,1);
assert.equal((await request("/api/lab-submissions","GET")).status,401);
x=await request("/api/summary","GET",undefined,"admin");
assert.equal(x.json.objectiveSubmissionCount,1);
assert.equal(x.json.learners[0].objectiveLabPasses,1);
assert.ok(fs.existsSync(path.join(temp,"records.json")));
x=await request("/api/logout","POST",{},"student");assert.equal(x.status,200);
assert.equal((await request("/api/me","GET",undefined,"student")).status,401);
console.log("PASS v5: local classroom setup, login, role checks, grading, persistence and origin/content-type policy");
}finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});}
}
main().catch(err=>{console.error(err);server.close();fs.rmSync(temp,{recursive:true,force:true});process.exitCode=1;});
