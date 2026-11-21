/* BOARD//LAB v2 — deterministic extended educational circuit model.
 * Distinct from rendering; no OEM rail values, no calibrated SPICE or BGA process claims.
 * CommonJS export for independent test; browser augments RepairCore.
 */
(function(root,factory){const v=factory(root.RepairCore || (typeof require==='function'?require('./core.js'):null));if(typeof module==='object'&&module.exports)module.exports=v;root.RepairCore=v;})(typeof globalThis!=='undefined'?globalThis:this,function(base){
'use strict';
if(!base)throw Error('Load core.js first');
const extras=[
 ['v5_short','5 V regulator current limits','A 5 V rail drops under load. The fan never receives stable standby power.','C51',3,'V5','Shorted output capacitor on 5 V standby'],
 ['v5_missing','3 V works; 5 V is absent','The 3.3 V rail is correct, but the 5 V branch never comes up.','U5',3,'V5','Failed independent 5 V regulator stage'],
 ['sys_short','Adapter trips immediately','The supply protection activates; the system input rail measures low resistance unpowered.','C_SYS',4,'SYS','Shorted input bypass capacitor'],
 ['pgood_low','All volts; power-good missing','Standby output is present but the power-good handshake never asserts.','U_PGOOD',4,'PGOOD','Defective power-good monitor'],
 ['rtc_low','CMOS clock and resume failure','RTC retention rail is lost and the embedded controller will not complete startup.','C_RTC',4,'RTC_3V','Failed RTC power path'],
 ['clock_missing','Fans run without POST','CPU rail is normal but a required clock is missing.','X1',5,'CLK_32K','Oscillator or clock distribution failure'],
 ['reset_stuck','Power sequence is stuck in reset','Regulators power up; PLT_RST# never deasserts.','U_RESET',5,'PLT_RST','Reset-generation fault'],
 ['ram_train','Memory training fails','Fans spin and POST loops because the installed memory path is faulty.','RAM',3,'VDDQ','Memory module or connection issue'],
 ['memory_power','Memory supply absent','The 1.2 V fictional training memory rail never appears during boot.','U_MEM',4,'VDDQ','Memory regulator disabled'],
 ['ssd_rail','Storage intermittently disappears','NVMe drive loses power during POST and cannot enumerate.','U_SSD',3,'SSD_3V','NVMe local regulator fault'],
 ['ssd_connector','NVMe link unstable','Storage rail is healthy but the connector has an intermittent data contact.','J_M2',4,'SSD_LINK','M.2 connection fault'],
 ['fan_stall','Thermal shutdown under load','System boots; fan tachometer never produces normal pulses and CPU overheats.','FAN',2,'FAN_TACH','Blocked or defective fan'],
 ['gpu_vrm','Display corruption under graphics load','GPU core supply is absent although CPU can boot using integrated graphics.','U_GPU',4,'GPU_CORE','Discrete GPU regulator failure'],
 ['edp_backlight','Internal display image only with flashlight','POST succeeds and panel data is present, but backlight power is absent.','U_BL',3,'BACKLIGHT','Backlight driver fault'],
 ['battery_charge','Runs on adapter but will not charge','Main rail and charging input are present; the charge-enable chain is defective.','U_CHG',3,'CHG_EN','Charger control-stage failure'],
 ['keyboard_corrosion','Keyboard keys fail after liquid exposure','The EC is live, but the keyboard matrix has a corroded contact.','J_KBD',3,'KBD_SCAN','Corroded keyboard connector'],
 ['usb_power','Dead USB-A ports','System boots but the external USB port power switch output is zero.','U_USB',2,'USB_5V','USB load-switch failure'],
 ['audio_rail','No audio output','Machine boots; the small audio supply is absent.','U_AUDIO',2,'AUDIO_3V','Audio amplifier supply failure'],
 ['ec_reset','Standby good; EC held in reset','3.3 V standby exists but the EC reset line remains low.','U_ECRST',5,'EC_RST','EC reset fault'],
 ['spi_select','BIOS chip not accessed','CPU power and clock are available, but SPI chip select never toggles.','U_SPI',5,'BIOS_CS','SPI flash select path failure'],
 ['pd_cc_open','USB-C power contract unavailable','Connector orientation is detected incorrectly; no higher PD contract.','J_USBC',4,'USB_CC','Damaged Type-C CC path'],
 ['corrosion_v3','Liquid damage leaks standby rail','Standby voltage is unstable from a resistive corrosion path to ground.','C_COR',4,'V3','Contaminated standby rail leakage'],
 ['bios_incompatible','Firmware image does not match board','Stable voltage rails, but no POST following an incompatible firmware installation.','U_BIOS',5,'BIOS_CS','Platform-ID mismatch in firmware'],
 ['cpu_sense','CPU regulator sense line open','CPU enable is present but the VCORE feedback circuit fails to regulate.','R_SENSE',5,'VCORE','VRM feedback network open'],
 ['nvram_boot','Firmware configuration prevents startup','Firmware rail and SPI activity are present, but startup halts at firmware validation.','U_BIOS',4,'BIOS_CS','Invalid NVRAM setting'],
 ['healthy_low_ohm','Healthy low-ohm CPU rail','Customer suspects a short due to very low core resistance, but this is normal for the fictional board. Diagnose as NO HARDWARE FAULT.','NO_FAULT',5,'VCORE','Normal low-impedance core load']
].map(([id,name,complaint,target,level,net,description],i)=>({id,label:`Case ${String(i+10).padStart(2,'0')} · ${name}`,complaint,symptoms:description,target,level,net,hint:`Use a known-good reference; compare ${net} with its enabling upstream supply and isolate power for resistance checks.`,technique:['DC voltage','Power sequencing','Schematic tracing','Fault isolation'],originalTarget:target}));
const EXTRA_NETS=['PGOOD','VDDQ','V1_8','RTC_3V','CLK_32K','PLT_RST','SSD_3V','SSD_LINK','FAN_TACH','GPU_CORE','BACKLIGHT','CHG_EN','VBAT','KBD_SCAN','USB_5V','AUDIO_3V','EC_RST','BIOS_CS','PD_VBUS','USB_PD_MSG'];
const VREF={...base.VREF,PGOOD:3.3,VDDQ:1.2,V1_8:1.8,RTC_3V:3.05,CLK_32K:1.65,PLT_RST:3.3,SSD_3V:3.3,SSD_LINK:.85,FAN_TACH:2.5,GPU_CORE:.87,BACKLIGHT:12,CHG_EN:3.3,VBAT:11.4,KBD_SCAN:1.65,USB_5V:5.0,AUDIO_3V:3.3,EC_RST:3.3,BIOS_CS:3.3,PD_VBUS:20,USB_PD_MSG:3.3};
const NOMINAL_OHMS={...base.NOMINAL_OHMS,PGOOD:12000,VDDQ:15,V1_8:250,RTC_3V:14000,CLK_32K:18000,PLT_RST:20000,SSD_3V:450,SSD_LINK:55000,FAN_TACH:10000,GPU_CORE:1.8,BACKLIGHT:560,CHG_EN:25000,VBAT:5000,KBD_SCAN:13000,USB_5V:90,AUDIO_3V:410,EC_RST:28000,BIOS_CS:18000,PD_VBUS:55000,USB_PD_MSG:23000};
const keys=[...base.NETS,...EXTRA_NETS];
const extrasById=Object.fromEntries(extras.map(e=>[e.id,e]));
const round=(v,n=2)=>Math.round(v*10**n)/10**n;
function solve(state){
 const raw=state.faultCleared?'none':state.fault;
 const f=extrasById[raw]?raw:'none';
 const native=base.solve({...state,fault:f==='none'?raw:'none',faultCleared:f==='none'?state.faultCleared:true});
 const v={...native.voltage};
 const alive=v.SYS>15,standby=v.V3>2.9&&v.V5>4.6,run=standby&&state.powerButton;
 Object.assign(v,{PGOOD:standby?3.3:0,VDDQ:run?1.2:0,V1_8:run?1.8:0,RTC_3V:alive?3.05:0,CLK_32K:alive?1.65:0,PLT_RST:run&&native.post?3.3:0,SSD_3V:run?3.3:0,SSD_LINK:run&&native.post?.85:0,FAN_TACH:run?2.5:0,GPU_CORE:run?.87:0,BACKLIGHT:native.displayWorking?12:0,CHG_EN:alive?3.3:0,VBAT:alive?11.4:0,KBD_SCAN:standby?1.65:0,USB_5V:standby?5:0,AUDIO_3V:run?3.3:0,EC_RST:standby?3.3:0,BIOS_CS:run?3.3:0,PD_VBUS:alive?20:0,USB_PD_MSG:alive?3.3:0});
 let post=native.post,display=native.displayWorking,blocked='',current=native.currentA;
 switch(f){
 case 'v5_short':if(alive){v.V5=.28;v.PGOOD=0;v.EC_EN=0;v.CPU_EN=0;v.VCORE=0;post=false;display=false;current+=.25}break;
 case 'v5_missing':v.V5=0;v.PGOOD=0;v.EC_EN=0;v.CPU_EN=0;v.VCORE=0;post=false;display=false;break;
 case 'sys_short':if(v.JACK){v.FUSE_OUT=.8;v.SYS=.08;for(const n of keys.filter(x=>!['JACK','FUSE_OUT','SYS','GND'].includes(x)))v[n]=0;post=false;display=false;current=.45}break;
 case 'pgood_low':v.PGOOD=0;v.CPU_EN=0;v.VCORE=0;post=false;display=false;break;
 case 'rtc_low':v.RTC_3V=0;v.CLK_32K=0;v.CPU_EN=0;v.VCORE=0;post=false;display=false;break;
 case 'clock_missing':v.CLK_32K=0;v.PLT_RST=0;post=false;display=false;break;
 case 'reset_stuck':v.PLT_RST=0;post=false;display=false;break;
 case 'ram_train':v.SSD_LINK=0;post=false;display=false;break;
 case 'memory_power':v.VDDQ=0;post=false;display=false;break;
 case 'ssd_rail':v.SSD_3V=0;v.SSD_LINK=0;break;
 case 'ssd_connector':v.SSD_LINK=0;break;
 case 'fan_stall':v.FAN_TACH=0;current+=.03;break;
 case 'gpu_vrm':v.GPU_CORE=0;break;
 case 'edp_backlight':v.BACKLIGHT=0;v.DISPLAY=0;display=false;break;
 case 'battery_charge':v.CHG_EN=0;break;
 case 'keyboard_corrosion':v.KBD_SCAN=0;break;
 case 'usb_power':v.USB_5V=0;break;
 case 'audio_rail':v.AUDIO_3V=0;break;
 case 'ec_reset':v.EC_RST=0;v.EC_EN=0;v.CPU_EN=0;v.VCORE=0;post=false;display=false;break;
 case 'spi_select':v.BIOS_CS=0;post=false;display=false;break;
 case 'pd_cc_open':v.USB_CC=.01;v.USB_PD_MSG=0;v.PD_VBUS=5;break;
 case 'corrosion_v3':if(alive){v.V3=2.35;v.PGOOD=0;v.EC_EN=0;v.CPU_EN=0;v.VCORE=0;post=false;display=false;current+=.17}break;
 case 'bios_incompatible':post=false;display=false;v.PLT_RST=0;break;
 case 'cpu_sense':v.VCORE=0;post=false;display=false;break;
 case 'nvram_boot':post=false;display=false;break;
 case 'healthy_low_ohm':break;
 }
 if(f){if(!post){v.DISPLAY=0;v.BACKLIGHT=0;v.SSD_LINK=0}if(v.V3<2.9||v.V5<4.6){for(const n of ['PGOOD','VDDQ','V1_8','PLT_RST','FAN_TACH','GPU_CORE','BACKLIGHT','KBD_SCAN','USB_5V','AUDIO_3V','BIOS_CS','SSD_3V','SSD_LINK'])v[n]=0}}
 if(['pd_cc','pd_cc_open'].includes(raw)){v.PD_VBUS=5;v.USB_PD_MSG=0}
 if(!state.powerButton){v.VDDQ=0;v.V1_8=0;v.GPU_CORE=0;v.SSD_3V=0;v.SSD_LINK=0;v.FAN_TACH=0;v.AUDIO_3V=0;v.PLT_RST=0;}
 let status=native.status,powerStage=native.powerStage;
 if(f&&state.powerButton){if(!post){status=(!v.SYS?'NO SYSTEM POWER':!v.PGOOD?'POWER-GOOD / STANDBY FAULT':!v.VCORE?'STARTUP POWER BLOCKED':'NO POST / SEQUENCING');powerStage=(!v.SYS?'INPUT':'FAULT / DIAGNOSE')}else if(!display){status='POST OK · DISPLAY FAULT'}else if(f==='ssd_rail'||f==='ssd_connector')status='POST OK · STORAGE FAULT';else if(f==='fan_stall')status='POST OK · COOLING FAULT';else if(['pd_cc_open','battery_charge','keyboard_corrosion','usb_power','audio_rail','gpu_vrm'].includes(f))status='POST OK · PERIPHERAL FAULT';}
 if(!f&&raw==='bios_bad')v.BIOS_CS=3.3;
 return {...native,fault:raw,voltage:v,post,displayWorking:display,currentA:round(current,3),status,powerStage,standby:v.V3>=2.9&&v.V5>=4.7,systemReady:post,thermalWarning:f==='fan_stall',storageWorking:post&&v.SSD_3V>3&&v.SSD_LINK>.5,chargeWorking:alive&&v.CHG_EN>3,keyboardWorking:v.KBD_SCAN>.5,usbWorking:v.USB_5V>4,fanWorking:v.FAN_TACH>1.5,gpuWorking:v.GPU_CORE>.6,blocked};
}
// Fix minor alias issue with storage-domain post processing in all browsers.
function resistance(state,a,b){
 const f=state.faultCleared?'none':state.fault;
 if(a===b)return 0;
 if(['fuse_open','fet_open','v3_short'].includes(f)&&base.NETS.includes(a)&&base.NETS.includes(b))return base.resistance(state,a,b);
 const r0=net=>(net==='GND'?0:f==='v5_short'&&net==='V5'?.4:f==='sys_short'&&net==='SYS'?.22:f==='corrosion_v3'&&net==='V3'?7.5:(NOMINAL_OHMS[net]??Infinity));
 const open=f==='fuse_open'&&['JACK','FUSE_OUT'].includes(a)&&['JACK','FUSE_OUT'].includes(b)||f==='fet_open'&&['FUSE_OUT','SYS'].includes(a)&&['FUSE_OUT','SYS'].includes(b);
 if(open)return Infinity;
 if((a==='JACK'&&b==='FUSE_OUT')||(a==='FUSE_OUT'&&b==='JACK'))return .06;
 if((a==='FUSE_OUT'&&b==='SYS')||(a==='SYS'&&b==='FUSE_OUT'))return .045;
 return a==='GND'?r0(b):b==='GND'?r0(a):r0(a)+r0(b);
}
function measure(state,mode,red,black){
 const s=solve(state);
 if(!red||!black)return{text:'— — —',detail:'Select both probes.',ok:false};
 if(!(red in s.voltage)||!(black in s.voltage))return{text:'OL',detail:'Unknown electrical test node.',ok:false};
 const val=s.voltage[red]-s.voltage[black];
 if(mode==='DCV')return{text:round(val).toFixed(2)+' V',detail:`Computed training model: ${red} − ${black}, ${s.powerStage}.`,ok:true,value:val};
 if(mode==='ACV')return{text:'0.00 V~',detail:'Steady-state DC engine: AC coupling/ripple is available in the educational oscilloscope, not this RMS meter.',ok:true,value:0};
 if(state.ac||state.battery)return{text:'LOCK',detail:'SAFETY: isolate all sources before continuity, resistance or diode test.',ok:false,unsafe:true};
 const r=resistance(state,red,black);
 if(mode==='OHM')return{text:Number.isFinite(r)?(r<1?round(r,3).toFixed(3):round(r,1).toFixed(1))+' Ω':'OL',detail:'Unpowered equivalent impedance, fictional board only.',value:r,ok:true};
 if(mode==='CONT')return{text:r<30?'● BEEP':'OL',detail:r<30?`Path ≈ ${round(r,2)} Ω; does not prove component health.`:'No continuity across selected nodes in this model.',ok:true,value:r};
 if(mode==='DIODE'){
  if(['v5_short','v3_short','sys_short'].includes(state.fault)&&((red==='GND'||black==='GND')&&r<1))return{text:'0.02 V',detail:'Simulated low impedance across these pads.',ok:true,value:.02};
  const v=((red==='GND'&&['JACK','V3','V5'].includes(black))||(red==='SYS'&&black==='FUSE_OUT'))?.58:Infinity;
  return{text:Number.isFinite(v)?v.toFixed(2)+' V':'OL',detail:Number.isFinite(v)?'Forward-junction approximation (educational).':'No forward diode path is defined for this polarity.',ok:true,value:v};
 }
 return{text:'— — —',detail:'Choose a valid meter mode.',ok:false};
}
function evaluate(state,part){const f=extrasById[state.originalFault];return f?{correct:f.target===part,expected:f.target,caseDef:f}:base.evaluate(state,part)}
function repair(state,part){const f=extrasById[state.originalFault];if(!f)return base.repair(state,part);if(!f.target||f.target==='NO_FAULT')return{ok:false,message:'This is a healthy training board. No replacement is indicated. Document evidence and stop.'};if(state.ac||state.battery)return{ok:false,message:'SAFETY: isolate adapter and battery before component repair.'};if(f.target!==part)return{ok:false,message:`${part} does not match the established cause. Review the boardview and readings.`};if(['U_BIOS','U_SPI'].includes(part)&&!state.firmwareBackup)return{ok:false,message:'Make and verify a firmware backup before any simulated writing.'};state.faultCleared=true;state.repairs.push({part,time:new Date().toISOString(),case:state.originalFault});return{ok:true,message:`Repaired ${part} in fictional ${state.originalFault} model. Reconnect and verify affected subsystems.`};}
function waveform(state,net='VCORE',scale=1,points=320){
 const s=solve(state),v=s.voltage[net]||0,clock=['CLK_32K','FAN_TACH','KBD_SCAN','SSD_LINK','BIOS_CS','USB_PD_MSG'].includes(net),supply=['V3','V5','VCORE','GPU_CORE','VDDQ','SSD_3V'].includes(net);
 const values=[];const rate=clock?net==='CLK_32K'?6:net==='FAN_TACH'?3:12:supply?27:1;
 for(let i=0;i<points;i++){
  let t=i/(points-1),y=v;
  if(clock)y=v>0?(Math.sin(2*Math.PI*t*rate)>=0?Math.min(3.3,v*2):0):0;
  else if(supply&&v>0)y=v+v*.013*Math.sin(2*Math.PI*t*rate)+v*.002*Math.sin(2*Math.PI*t*rate*5);
  else if(['CPU_EN','PGOOD','PLT_RST','EC_RST','EC_EN'].includes(net))y=(t>.1?v:0);
  else if(net==='USB_CC')y=v+.025*Math.sin(t*18);
  values.push(round(y,4));
 }
 return{net,values,min:Math.min(...values),max:Math.max(...values),frequencyLabel:clock?(net==='CLK_32K'?'32.768 kHz nominal / conceptual':'digital pulse activity / conceptual'):supply?'PWM ripple conceptual / not calibrated':'DC / static signal',sampleUnit:'normalized time',nominal:VREF[net]||0};
}
function thermal(state){const s=solve(state),fault=s.fault;const on=+!!state.ac,run=+!!state.powerButton,baseT=24;return [
 {key:'Q1',x:.25,y:.32,c:baseT+on*8+(fault==='sys_short'?52:0)},
 {key:'U3',x:.47,y:.38,c:baseT+on*10+(fault==='v5_short'?36:fault==='corrosion_v3'?24:0)},
 {key:'C24',x:.55,y:.47,c:baseT+on*4+(fault==='v3_short'?47:0)},
 {key:'C51',x:.42,y:.61,c:baseT+on*3+(fault==='v5_short'?42:0)},
 {key:'CPU',x:.72,y:.51,c:baseT+run*26+(fault==='fan_stall'?62:0)},
 {key:'GPU',x:.72,y:.72,c:baseT+run*17+(fault==='gpu_vrm'?8:0)},
 {key:'U_CHG',x:.17,y:.65,c:baseT+on*9+(fault==='battery_charge'?15:0)},
 {key:'U_PD',x:.18,y:.22,c:baseT+on*6},
 {key:'C_SYS',x:.31,y:.55,c:baseT+on*5+(fault==='sys_short'?48:0)},
 {key:'FAN',x:.88,y:.37,c:baseT+run*6}
 ];}
function pdTrace(state){const s=solve(state),bad=s.fault==='pd_cc'||s.fault==='pd_cc_open',alive=s.voltage.SYS>15;return{contractV:!alive?0:bad?5:20,contractA:!alive?0:bad?.5:3,steps:!alive?['No power at controller; attach rejected.']:bad?['Attach detected','Default 5V source advertised','CC/PD handshake failed','No high-voltage contract established']:['Attach detected','Default 5V available','Source capabilities received: 5/9/15/20V','Training sink requests 20V × 3A','Source ACCEPT / PS_RDY','Contract 20V × 3A established'],valid:alive&&!bad};}
function isolatedPSU(opts={}){const{v=0,limit=.2,load=100,output=false}=opts;const V=Math.min(5,Math.max(0,+v||0)),I=Math.min(.5,Math.max(.01,+limit||.2)),R=Math.max(.05,+load||100),wanted=V/R,actual=Math.min(I,wanted);return{voltage:output?round(wanted>I?I*R:V,3):0,current:output?round(actual,4):0,mode:!output?'OFF':wanted>I?'CC':'CV',powerW:output?round(actual*Math.min(V,I*R),4):0,isolated:true};}
return {...base,VERSION:'2.1.0',FAULTS:[...base.FAULTS,...extras],EXTRA_FAULTS:extras,NETS:keys,VREF,NOMINAL_OHMS,solve,measure,resistance,evaluate,repair,waveform,thermal,pdTrace,isolatedPSU};
});
