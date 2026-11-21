/* Desktop PC / ATX virtual trainer. External DC connectors and POST only;
 * intentionally NO mains PSU teardown, probing or repair procedures.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DesktopCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CASES=[
 {id:'ok',label:'Reference · healthy desktop',complaint:'PC posts normally; map supply, EPS and POST paths.',target:null,level:1},
 {id:'no_5vsb',label:'Dead desktop, no standby',complaint:'ATX standby output is absent with a functioning wall supply. PSU is a sealed, replace-only unit.',target:'PSU',level:2},
 {id:'atx24_open',label:'ATX main connector failure',complaint:'5VSB is normal, but the motherboard never receives stable main rails.',target:'ATX24',level:2},
 {id:'eps8_open',label:'Missing CPU 12V input',complaint:'Fans run but CPU VRM cannot start because EPS connector is open.',target:'EPS8',level:3},
 {id:'no_pgood',label:'Missing PSU power-good',complaint:'Main DC rails appear but PWR_OK handshake is never asserted.',target:'PWR_OK',level:3},
 {id:'ram_training',label:'POST stalls at memory',complaint:'Power rails reach nominal values but memory initialization fails.',target:'DIMM_A1',level:2},
 {id:'gpu_power',label:'GPU power connector missing',complaint:'GPU outputs remain dark although CPU and RAM POST successfully.',target:'PCIE8',level:2},
 {id:'front_switch',label:'Front-panel switch broken',complaint:'ATX standby supply is good, but pressing power does not signal the motherboard.',target:'PWR_SW',level:2},
 {id:'cpu_vrm',label:'CPU regulator faulty',complaint:'EPS 12V and PWR_OK exist, but CPU core voltage is absent.',target:'CPU_VRM',level:4},
 {id:'sata_link',label:'Boot drive not detected',complaint:'System boots into firmware but cannot enumerate its SATA storage drive.',target:'SATA1',level:2},
 {id:'cmos',label:'RTC/CMOS retention lost',complaint:'System resets firmware settings after all power sources are removed.',target:'CMOS_BAT',level:2}
 ];
 const NETS=['GND','STANDBY5','PS_ON','ATX12','ATX5','ATX3V3','EPS12','PWR_OK','CPU_CORE','RAM_VDD','PCIE12','GPU_CORE','SATA5','SATA_LINK','RTC3'];
 const REF={GND:0,STANDBY5:5,PS_ON:0,ATX12:12,ATX5:5,ATX3V3:3.3,EPS12:12,PWR_OK:5,CPU_CORE:1.12,RAM_VDD:1.2,PCIE12:12,GPU_CORE:.88,SATA5:5,SATA_LINK:1,RTC3:3.05};
 const OHMS={STANDBY5:130,PS_ON:10000,ATX12:240,ATX5:230,ATX3V3:70,EPS12:45,PWR_OK:17000,CPU_CORE:1.8,RAM_VDD:17,PCIE12:110,GPU_CORE:1.6,SATA5:210,SATA_LINK:24000,RTC3:9000};
 function createState(id='ok'){return {id,caseId:id,ac:true,power:false,psuSwitch:true,isolated:false,diagnosed:false,repaired:false,repairs:[],measureCount:0,safety:0}}
 function solve(s){const f=s.repaired?'ok':s.id,standby=s.ac&&s.psuSwitch&&f!=='no_5vsb',signaled=standby&&s.power&&f!=='front_switch',main=signaled&&f!=='atx24_open',good=main&&f!=='no_pgood';const v={GND:0,STANDBY5:standby?5:0,PS_ON:signaled?0:standby?5:0,ATX12:main?12:0,ATX5:main?5:0,ATX3V3:main?3.3:0,EPS12:main&&f!=='eps8_open'?12:0,PWR_OK:good?5:0,CPU_CORE:good&&f!=='eps8_open'&&f!=='cpu_vrm'?1.12:0,RAM_VDD:good?1.2:0,PCIE12:good&&f!=='gpu_power'?12:0,GPU_CORE:good&&f!=='gpu_power'?.88:0,SATA5:good?5:0,SATA_LINK:good&&f!=='sata_link'?1:0,RTC3:f==='cmos'?0:3.05};const post=good&&v.CPU_CORE>1&&f!=='ram_training';const display=post&&v.GPU_CORE>.7;const boot=post&&f!=='sata_link';return {voltage:v,post,display,boot,main,good,status:!standby?'NO ATX STANDBY':!s.power?'SOFT OFF':!signaled?'NO POWER SWITCH COMMAND':!main?'MAIN RAILS ABSENT':!good?'PWR_OK BLOCKED':!v.CPU_CORE?'CPU VRM FAILURE':!post?'NO POST / MEMORY':!display?'POST · GPU BLACK SCREEN':!boot?'POST · NO BOOT DRIVE':'POST / BOOT OK'}}
 function measure(s,mode,r,b){s.measureCount++;const v=solve(s).voltage;if(!NETS.includes(r)||!NETS.includes(b))return {text:'OL',detail:'Select two known training nodes'};if(mode==='DCV')return {text:(v[r]-v[b]).toFixed(2)+' V',detail:'DC values computed from ATX supply and current fault state'};if(s.ac)return {text:'LOCK',detail:'Unplug AC before resistance/continuity (PSU remains sealed)',unsafe:true};const resistance=x=>x==='GND'?0:s.id==='atx24_open'&&x==='ATX12'?Infinity:s.id==='eps8_open'&&x==='EPS12'?Infinity:OHMS[x]??Infinity;const ohm=r==='GND'?resistance(b):b==='GND'?resistance(r):resistance(r)+resistance(b);return {text:mode==='CONT'?(ohm<25?'● BEEP':'OL'):Number.isFinite(ohm)?ohm.toFixed(2)+' Ω':'OL',detail:'Simplified equivalent resistance, isolated training PC only'}}
 function repair(s,part){const c=CASES.find(x=>x.id===s.caseId)||CASES[0];if(s.ac)return {ok:false,message:'Disconnect AC and release power before replacing desktop components.'};if(!c.target)return {ok:false,message:'Healthy reference. Do not swap good parts.'};if(part!==c.target)return {ok:false,message:'That replacement is not supported by the evidence; test again.'};s.repaired=true;s.repairs.push({part,date:new Date().toISOString()});return {ok:true,message:`Replaced ${part} in the virtual desktop trainer. Reconnect power and verify POST.`}}
 return {CASES,NETS,REF,OHMS,createState,solve,measure,repair};
});
