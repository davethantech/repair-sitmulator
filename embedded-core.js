/* BOARD//LAB 5 — deterministic four-register virtual microcontroller.
   Restricted instruction model, NOT ARM/RISC-V, no real GPIO or user-code eval. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardMCU=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const TEMPLATES={
 blink:["SET R0 0","LOOP:","OUT P0 HIGH","WAIT 200","OUT P0 LOW","WAIT 200","ADD R0 1","CMP R0 4","JNZ LOOP",'UART "Blink completed"',"HALT"].join("\n"),
 sensor:["I2C R0 0x48 0","CMP R0 26","JZ COOL","OUT P0 HIGH",'UART "Warm — indicator on"',"JMP END","COOL:","OUT P0 LOW",'UART "Temperature OK"',"END:","HALT"].join("\n"),
 adc:["ADC R1 A0",'UART "ADC sampled"',"CMP R1 512","JZ EQUAL","OUT P0 HIGH","HALT","EQUAL:","OUT P0 LOW","HALT"].join("\n"),
 pwm:["PWM P0 64","WAIT 500","PWM P0 192","WAIT 500","PWM P0 0",'UART "PWM completed"',"HALT"].join("\n")
};
const OPS={SET:2,ADD:2,SUB:2,CMP:2,OUT:2,PWM:2,WAIT:1,UART:1,ADC:2,I2C:3,JMP:1,JZ:1,JNZ:1,HALT:0};
const REG=/^R[0-3]$/,PIN=/^P[0-3]$/,LABEL=/^[A-Z_][A-Z0-9_]{0,30}$/;
const val=s=>{const n=/^0x[\da-f]+$/i.test(s)?Number.parseInt(s,16):/^-?\d+$/.test(s)?Number(s):NaN;return Number.isSafeInteger(n)?n:null;};
function compile(input){
if(typeof input!=="string"||input.length>12000)throw Error("Program must be text of at most 12,000 characters.");
const lines=input.replace(/\r/g,"").split("\n");if(lines.length>250)throw Error("Maximum 250 source lines");
const labels={},instructions=[];
for(let index=0;index<lines.length;index++){
let raw=lines[index].trim();if(!raw||raw.startsWith(";")||raw.startsWith("#"))continue;
const semi=raw.indexOf(";");if(semi>=0)raw=raw.slice(0,semi).trim();if(!raw)continue;
const match=raw.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
if(match){const name=match[1].toUpperCase();if(!LABEL.test(name)||Object.prototype.hasOwnProperty.call(labels,name))throw Error("Invalid or duplicate label "+name+" on line "+(index+1));labels[name]=instructions.length;raw=match[2].trim();if(!raw)continue;}
const parts=raw.match(/"[^"\n]*"|\S+/g)||[];const op=(parts.shift()||"").toUpperCase();const args=parts.map(x=>x.startsWith('"')&&x.endsWith('"')?x.slice(1,-1):x.toUpperCase());
if(!(op in OPS)||args.length!==OPS[op])throw Error("Bad instruction or operand count on line "+(index+1)+": "+op);
const error=msg=>{throw Error(msg+" on line "+(index+1));};
if(["SET","ADD","SUB","CMP"].includes(op)){if(!REG.test(args[0])||!(REG.test(args[1])||val(args[1])!==null))error("Expected register and numeric/register operand");}
if(op==="OUT"&&(!PIN.test(args[0])||!["HIGH","LOW","1","0"].includes(args[1])))error("OUT expects P0-P3 and HIGH/LOW");
if(op==="PWM"&&(!PIN.test(args[0])||val(args[1])===null||val(args[1])<0||val(args[1])>255))error("PWM expects P0-P3 and duty 0–255");
if(op==="WAIT"&&(val(args[0])===null||val(args[0])<0||val(args[0])>10000))error("WAIT accepts 0–10000 ms");
if(op==="UART"&&args[0].length>120)error("UART text too long");
if(op==="ADC"&&(!REG.test(args[0])||!/^A[0-3]$/.test(args[1])))error("ADC expects R0-R3 and A0-A3");
if(op==="I2C"&&(!REG.test(args[0])||val(args[1])===null||val(args[1])<0||val(args[1])>127||val(args[2])===null||val(args[2])<0||val(args[2])>255))error("I2C expects register, 7-bit address, byte register");
if(["JMP","JZ","JNZ"].includes(op)&&!LABEL.test(args[0]))error("Jump requires named label");
instructions.push({op,args,line:index+1,text:raw});if(instructions.length>200)throw Error("Maximum 200 compiled instructions");
}
for(const ins of instructions)if(["JMP","JZ","JNZ"].includes(ins.op)&&!(ins.args[0] in labels))throw Error("Undefined jump label "+ins.args[0]+" at line "+ins.line);
if(!instructions.length)throw Error("No instructions");
return{instructions,labels,sourceLines:lines.length,architecture:"BOARDLAB-4R virtual teaching ISA"};
}
function make(source=TEMPLATES.blink,options={}){
const program=typeof source==="string"?compile(source):source;
if(!program||!Array.isArray(program.instructions))throw Error("Compiled program required");
const supply=Number(options.supplyV??3.3),adc=Number(options.adcV??1.65),temperature=Number(options.temperatureC??25);
if(!Number.isFinite(supply)||supply<0||supply>5||!Number.isFinite(adc)||adc<0||adc>5||!Number.isFinite(temperature)||temperature< -40||temperature>125)throw Error("Fixture outside low-voltage range");
return{program,pc:0,regs:[0,0,0,0],zero:false,pins:[0,0,0,0],duties:[0,0,0,0],supplyV:supply,adcV:adc,temperatureC:temperature,fault:["none","led_open","i2c_nack","brownout"].includes(options.fault)?options.fault:"none",cycles:0,timeMs:0,halted:false,reason:"",uart:[],trace:[],ioErrors:0};
}
function value(s,operand){if(REG.test(operand))return s.regs[Number(operand[1])];const n=val(operand);if(n===null)throw Error("Invalid numeric operand");return n;}
function pins(s){
const v=s.fault==="brownout"?Math.min(s.supplyV,2.35):s.supplyV;
const current=s.duties.reduce((m,d,i)=>m+(s.fault==="led_open"&&i===0?0:Math.max(0,v-2.0)/1000*d/255),.005);
return{railV:v,ledCurrentA:s.fault==="led_open"?0:Math.max(0,v-2.0)/1000*s.duties[0]/255,sourceCurrentA:current,ledOn:s.fault!=="led_open"&&s.duties[0]>5&&v>2.0,pins:s.pins.slice(),duties:s.duties.slice(),temperatureC:s.temperatureC};
}
function step(s){
if(s.halted)return{ok:false,done:true,reason:s.reason};
if(s.cycles>=1000||s.timeMs>=60000){s.halted=true;s.reason="Step/time budget reached";return{ok:false,done:true,reason:s.reason};}
const power=pins(s);if(power.railV<2.7){s.halted=true;s.reason="Brownout reset: rail below 2.7 V";s.trace.push({cycle:s.cycles,pc:s.pc,event:"BROWNOUT",supplyV:power.railV});return{ok:false,done:true,reason:s.reason};}
const at=s.pc,ins=s.program.instructions[at];if(!ins){s.halted=true;s.reason="Program counter outside code";return{ok:false,done:true,reason:s.reason};}
let advance=true,note="";const [a,b,c]=ins.args;
switch(ins.op){
case"SET":s.regs[+a[1]]=value(s,b)&0xffff;break;
case"ADD":s.regs[+a[1]]=(s.regs[+a[1]]+value(s,b))&0xffff;break;
case"SUB":s.regs[+a[1]]=(s.regs[+a[1]]-value(s,b))&0xffff;break;
case"CMP":s.zero=s.regs[+a[1]]===value(s,b);break;
case"OUT":{const i=+a[1],d=b==="HIGH"||b==="1"?255:0;s.duties[i]=d;s.pins[i]=d?1:0;break;}
case"PWM":{const i=+a[1],d=value(s,b);s.duties[i]=d;s.pins[i]=d?1:0;break;}
case"WAIT":s.timeMs+=value(s,a);break;
case"UART":s.uart.push({atMs:s.timeMs,text:a});note=a;break;
case"ADC":s.regs[+a[1]]=Math.min(1023,Math.max(0,Math.round(s.adcV/3.3*1023)));note="ADC sampled";break;
case"I2C":{if(s.fault==="i2c_nack"||value(s,b)!==0x48){s.ioErrors++;s.zero=true;s.regs[+a[1]]=0;note="NACK";}else{s.regs[+a[1]]=value(s,c)===0?Math.round(s.temperatureC):value(s,c)===1?1:0;s.zero=false;note="ACK";}break;}
case"JMP":s.pc=s.program.labels[a];advance=false;break;
case"JZ":if(s.zero){s.pc=s.program.labels[a];advance=false;}break;
case"JNZ":if(!s.zero){s.pc=s.program.labels[a];advance=false;}break;
case"HALT":s.halted=true;s.reason="HALT";break;
default:throw Error("Invalid opcode");
}
s.cycles++;if(advance)s.pc++;
s.trace.push({cycle:s.cycles,pc:at,line:ins.line,op:ins.op,args:ins.args.join(" "),timeMs:s.timeMs,note,registers:s.regs.slice(),pin0:s.duties[0]});
if(s.trace.length>500)s.trace.shift();
return{ok:true,done:s.halted,event:s.trace[s.trace.length-1],power:pins(s)};
}
function run(s,limit=300){const n=Number(limit);if(!Number.isSafeInteger(n)||n<1||n>1000)throw Error("Steps must be 1…1000");let done;for(let i=0;i<n&&!s.halted;i++)done=step(s);return{done:s.halted,steps:s.cycles,timeMs:s.timeMs,reason:s.reason,uart:s.uart.slice(),power:pins(s),last:done};}
function logCsv(s){const rows=[["Cycle","PC","Source line","Instruction","Time ms","R0","R1","R2","R3","P0 duty","Note"],...s.trace.map(x=>[x.cycle,x.pc,x.line,x.op+" "+x.args,x.timeMs,...(x.registers||[0,0,0,0]),x.pin0||0,x.note||""])];return rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(",")).join("\r\n")+"\r\n";}
return{TEMPLATES,OPS,compile,make,pins,step,run,logCsv};
});