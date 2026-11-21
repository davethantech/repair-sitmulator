#!/usr/bin/env node
/* BOARD//LAB 5 local classroom server. Loopback by default, Node built-ins only.
   NOT a production internet-facing LMS, exam proctor, or certification authority. */
"use strict";
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const C=require("./advanced-core.js");
const root=__dirname;
const HOST=process.env.HOST||"127.0.0.1",PORT=Number(process.env.PORT||8714);
const dataDir=path.resolve(process.env.BOARDLAB_DATA_DIR||path.join(root,".boardlab-data"));
fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
const store=path.join(dataDir,"records.json");
let db={version:1,users:[],assignments:[],attempts:[],progress:{}};
try{const loaded=JSON.parse(fs.readFileSync(store,"utf8"));if(!Array.isArray(loaded.users)||!Array.isArray(loaded.assignments)||!Array.isArray(loaded.attempts)||!loaded.progress||typeof loaded.progress!=="object")throw Error("Invalid classroom database");db=loaded;}
catch(e){if(e.code!=="ENOENT")throw e;}
const sessions=new Map(),failures=new Map(),uuid=()=>crypto.randomBytes(16).toString("hex"),now=()=>new Date().toISOString();
function persist(){const temp=store+".tmp-"+process.pid;fs.writeFileSync(temp,JSON.stringify(db,null,2),{encoding:"utf8",mode:0o600,flag:"wx"});fs.renameSync(temp,store);}
function passwordHash(p,salt=crypto.randomBytes(16).toString("hex")){return salt+":"+crypto.scryptSync(p,salt,64).toString("hex");}
function checkPassword(p,saved){try{const [salt,hex]=saved.split(":");const expected=Buffer.from(hex,"hex"),actual=Buffer.from(passwordHash(p,salt).split(":")[1],"hex");return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);}catch{return false;}}
function send(res,status,obj){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(obj));}
function fail(res,status,msg){send(res,status,{ok:false,error:msg});}
function publicUser(u){return{id:u.id,username:u.username,displayName:u.displayName,role:u.role,batch:u.batch||"",created:u.created};}
function validUser(x){return/^[A-Za-z0-9_.-]{3,40}$/.test(x||"");}
function cookie(req,key){return(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(key+"="))?.slice(key.length+1)||"";}
function getUser(req){const token=cookie(req,"bl_session"),s=sessions.get(token);if(!s||s.exp<Date.now()){sessions.delete(token);return null;}return db.users.find(u=>u.id===s.id)||null;}
function requireRole(u,roles){return u&&roles.includes(u.role);}
function setSessionCookie(res,token,clear=false){res.setHeader("Set-Cookie","bl_session="+token+"; HttpOnly; SameSite=Strict; Path=/; Max-Age="+(clear?0:28800)+(process.env.HTTPS==="1"?"; Secure":""));}
function sameOrigin(req){if(!req.headers.origin)return true;try{return new URL(req.headers.origin).host===req.headers.host;}catch{return false;}}
function isLocal(req){return["127.0.0.1","::1","::ffff:127.0.0.1"].includes(req.socket.remoteAddress||"");}
function throttle(req){const k=req.socket.remoteAddress||"?",r=failures.get(k);return!(r&&r.until>Date.now());}
function bump(req){const k=req.socket.remoteAddress||"?",r=failures.get(k)||{n:0,until:0};if(r.until&&r.until<Date.now())r.n=0;r.n++;if(r.n>=8)r.until=Date.now()+120000;failures.set(k,r);}
async function parseBody(req){
if(!String(req.headers["content-type"]||"").toLowerCase().startsWith("application/json"))throw Object.assign(Error("Content-Type application/json required"),{status:415});
let size=0,items=[];for await(const chunk of req){size+=chunk.length;if(size>100000)throw Object.assign(Error("JSON request exceeds 100 kB"),{status:413});items.push(chunk);}
let data;try{data=JSON.parse(Buffer.concat(items).toString("utf8")||"{}");}catch{throw Object.assign(Error("Malformed JSON"),{status:400});}
if(!data||typeof data!=="object"||Array.isArray(data))throw Object.assign(Error("Expected JSON object"),{status:400});return data;
}
async function api(req,res,url){
const route=url.pathname,method=req.method;
if(method==="GET"&&route==="/api/status")return send(res,200,{ok:true,configured:db.users.some(x=>x.role==="admin"),version:C.VERSION,features:["users","assignments","attempts","progress","unproctored-practice"]});
if(!["GET","POST"].includes(method))return fail(res,405,"Unsupported method");
if(method==="POST"&&!sameOrigin(req))return fail(res,403,"Cross-origin request blocked");
if(method==="POST"&&route==="/api/setup"){
if(!isLocal(req))return fail(res,403,"First administrator setup is loopback-only");
if(db.users.length)return fail(res,403,"Admin setup is locked");const b=await parseBody(req);
if(db.users.length)return fail(res,409,"Already configured");
if(!validUser(b.username)||typeof b.password!=="string"||b.password.length<12||b.password.length>128)return fail(res,400,"Username 3–40 safe chars and password 12–128 chars required");
const u={id:uuid(),username:b.username,displayName:String(b.displayName||"Training Administrator").slice(0,80),role:"admin",batch:"",password:passwordHash(b.password),created:now()};db.users.push(u);persist();return send(res,201,{ok:true,user:publicUser(u)});
}
if(method==="POST"&&route==="/api/login"){
if(!throttle(req))return fail(res,429,"Too many failed logins");const b=await parseBody(req);const u=db.users.find(x=>x.username===b.username);
if(!u||!checkPassword(b.password||"",u.password)){bump(req);return fail(res,401,"Invalid credentials");}
const token=crypto.randomBytes(32).toString("hex");sessions.set(token,{id:u.id,exp:Date.now()+8*3600000});setSessionCookie(res,token);return send(res,200,{ok:true,user:publicUser(u)});
}
const user=getUser(req);if(!user)return fail(res,401,"Sign in first");
if(method==="GET"&&route==="/api/me")return send(res,200,{ok:true,user:publicUser(user),progress:db.progress[user.id]||null});
if(method==="POST"&&route==="/api/logout"){sessions.delete(cookie(req,"bl_session"));setSessionCookie(res,"",true);return send(res,200,{ok:true});}
if(method==="GET"&&route==="/api/users"){if(!requireRole(user,["admin","instructor"]))return fail(res,403,"Instructor permission required");return send(res,200,{ok:true,users:db.users.map(publicUser)});}
if(method==="POST"&&route==="/api/users"){
if(!requireRole(user,["admin","instructor"]))return fail(res,403,"Instructor permission required");const b=await parseBody(req),role=b.role||"student";
if(!["student","instructor"].includes(role)||role==="instructor"&&user.role!=="admin")return fail(res,403,"Only admin can create instructors");
if(!validUser(b.username)||!b.displayName||typeof b.password!=="string"||b.password.length<12||b.password.length>128)return fail(res,400,"Invalid user fields or password");
if(db.users.some(x=>x.username===b.username))return fail(res,409,"Username exists");
const u={id:uuid(),username:b.username,displayName:String(b.displayName).slice(0,80),batch:String(b.batch||"").slice(0,60),password:passwordHash(b.password),role,created:now()};db.users.push(u);persist();return send(res,201,{ok:true,user:publicUser(u)});
}
if(method==="GET"&&route==="/api/assignments")return send(res,200,{ok:true,assignments:requireRole(user,["admin","instructor"])?db.assignments:db.assignments.filter(x=>x.studentId===user.id)});
if(method==="POST"&&route==="/api/assignments"){
if(!requireRole(user,["admin","instructor"]))return fail(res,403,"Instructor permission required");const b=await parseBody(req);
const student=db.users.find(x=>x.id===b.studentId&&x.role==="student"),c=C.FAULTS.find(x=>x.id===b.caseId&&x.target);
if(!student||!c)return fail(res,400,"Unknown student or case");
const a={id:uuid(),studentId:student.id,studentName:student.displayName,instructorId:user.id,caseId:c.id,caseLabel:c.label,created:now(),dueDate:/^\d{4}-\d{2}-\d{2}$/.test(b.dueDate||"")?b.dueDate:null,status:"assigned"};db.assignments.push(a);persist();return send(res,201,{ok:true,assignment:a});
}
if(method==="GET"&&route==="/api/attempts")return send(res,200,{ok:true,attempts:requireRole(user,["admin","instructor"])?db.attempts:db.attempts.filter(x=>x.studentId===user.id)});
if(method==="POST"&&route==="/api/attempts"){
const b=await parseBody(req),c=C.FAULTS.find(x=>x.id===b.caseId&&x.target);if(!c)return fail(res,400,"Known fault case required");
const correct=b.diagnosedPart===c.target,safety=Math.min(20,Math.max(0,Math.floor(Number(b.safetyViolations)||0))),measures=Math.min(30,Math.max(0,Math.floor(Number(b.measurements)||0)));
const repaired=correct&&b.repaired===true,qa=repaired&&b.qa===true;const score=Math.max(0,Math.min(100,(correct?48:0)+(repaired?22:0)+(qa?20:0)+Math.min(10,measures*2)-safety*12));
const attempt={id:uuid(),studentId:user.id,caseId:c.id,correct,repaired,qa,score,safetyViolations:safety,measurements:measures,created:now(),grading:"UNPROCTORED — student-supplied evidence"};
db.attempts.push(attempt);
const a=db.assignments.findLast(x=>x.studentId===user.id&&x.caseId===c.id);if(a)a.status=qa?"completed":"attempted";persist();return send(res,201,{ok:true,attempt});
}
if(method==="GET"&&route==="/api/summary"){
if(!requireRole(user,["admin","instructor"]))return fail(res,403,"Instructor permission required");
const learners=db.users.filter(x=>x.role==="student").map(u=>{const attempts=db.attempts.filter(a=>a.studentId===u.id);return{...publicUser(u),attempts:attempts.length,bestScore:attempts.length?Math.max(...attempts.map(x=>x.score)):0,completedAssignments:db.assignments.filter(a=>a.studentId===u.id&&a.status==="completed").length};});
return send(res,200,{ok:true,learners,assignmentCount:db.assignments.length,attemptCount:db.attempts.length});
}
if(method==="POST"&&route==="/api/progress"){
const b=await parseBody(req),p={completed:Array.isArray(b.completed)?b.completed.filter(x=>Number.isInteger(x)&&x>=0&&x<C.FAULTS.length).slice(0,100):[],quiz:Array.isArray(b.quiz)?b.quiz.filter(x=>Number.isInteger(x)&&x>=0&&x<5):[],assemblyPasses:Math.min(10000,Math.max(0,Math.floor(Number(b.assemblyPasses)||0))),date:now(),grading:"self-reported training activity"};
db.progress[user.id]=p;persist();return send(res,200,{ok:true,progress:p});
}
return fail(res,404,"Unknown classroom API endpoint");
}
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".pdf":"application/pdf"};
function staticFile(req,res,url){
if(req.method!=="GET")return fail(res,405,"GET only");
let name;try{name=decodeURIComponent(url.pathname==="/"?"/index.html":url.pathname);}catch{return fail(res,400,"Bad path");}
const full=path.resolve(root,"."+name),ext=path.extname(full);
if(!full.startsWith(root+path.sep)||full.startsWith(dataDir+path.sep)||full.includes(path.sep+"tests"+path.sep)||full.includes(path.sep+".github"+path.sep)||!Object.prototype.hasOwnProperty.call(mime,ext))return fail(res,404,"Not found");
fs.stat(full,(err,stat)=>{if(err||!stat.isFile())return fail(res,404,"Not found");res.writeHead(200,{"Content-Type":mime[ext],"Content-Length":stat.size,"Cache-Control":"no-cache"});fs.createReadStream(full).pipe(res);});
}
const server=http.createServer(async(req,res)=>{res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("X-Frame-Options","DENY");res.setHeader("Referrer-Policy","no-referrer");res.setHeader("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'");
try{const url=new URL(req.url,"http://localhost");if(url.pathname.startsWith("/api/"))await api(req,res,url);else staticFile(req,res,url);}catch(e){fail(res,e.status||400,e.status?e.message:"Request invalid");}});
if(require.main===module){server.listen(PORT,HOST,()=>{console.log("BOARD//LAB local classroom: http://"+HOST+":"+PORT);if(!["localhost","127.0.0.1","::1"].includes(HOST))console.warn("WARNING: public network binding requires HTTPS, reverse proxy, session persistence and professional security audit.");});}
module.exports={server};
