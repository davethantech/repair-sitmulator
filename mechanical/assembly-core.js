/* BOARD//LAB 6 mechanically constrained SOFTWARE 3D teaching model.
 * Coordinates are mm for a fictional 15-inch training laptop, NOT OEM CAD.
 * Disassembly dependencies, cable latches, screw placement and thermal state
 * are operational; geometry is intentionally simplified.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardAssembly=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const CHASSIS={width:355,depth:245,height:14,unit:"mm",oem:false};
const PARTS=[
{id:"base",name:"Lower frame",box:[0,0,0,355,245,9],material:"aluminum",removable:false,color:"#456777"},
{id:"board",name:"System motherboard",box:[130,22,9,195,149,2.4],material:"FR4",removable:true,color:"#178b77"},
{id:"battery",name:"Battery pack (virtual)",box:[35,175,10,280,55,7],material:"polymer-safe-placeholder",removable:true,color:"#384958"},
{id:"ssd",name:"M.2 storage",box:[209,120,13,73,22,2],material:"FR4",removable:true,color:"#35ad8d"},
{id:"ram",name:"SODIMM memory",box:[167,101,13,73,32,2],material:"FR4",removable:true,color:"#278b6f"},
{id:"fan",name:"Cooling fan",box:[282,24,14,49,48,8],material:"plastic",removable:true,color:"#293d48"},
{id:"heatsink",name:"Heatsink & heatpipe",box:[190,35,16,120,55,4],material:"copper",removable:true,color:"#ca9164"},
{id:"cover",name:"Bottom access cover",box:[5,4,24,345,237,2],material:"polymer",removable:true,color:"#536e7a"}
];
const SCREWS=[
...[[16,14],[175,14],[340,14],[16,121],[340,121],[16,231],[175,231],[340,231]].map(([x,y],i)=>({id:"C"+(i+1),part:"cover",x,y,z:25,torqueNm:.18})),
...[[148,32],[312,32],[148,162],[312,162]].map(([x,y],i)=>({id:"M"+(i+1),part:"board",x,y,z:12,torqueNm:.22})),
...[[55,220],[177,220],[304,220]].map(([x,y],i)=>({id:"B"+(i+1),part:"battery",x,y,z:18,torqueNm:.12})),
...[[288,34],[321,34],[304,66]].map(([x,y],i)=>({id:"F"+(i+1),part:"fan",x,y,z:23,torqueNm:.12})),
...[[199,45],[244,45],[199,82],[244,82]].map(([x,y],i)=>({id:"H"+(i+1),part:"heatsink",x,y,z:21,torqueNm:.16})),
{id:"S1",part:"ssd",x:278,y:131,z:16,torqueNm:.12}
];
const CABLES=[
{id:"BAT",name:"Battery connector",a:"battery",b:"board",x:154,y:176,z:15},
{id:"DISP",name:"Display eDP ribbon",a:"board",b:"display",x:220,y:25,z:14},
{id:"FAN",name:"Fan header",a:"fan",b:"board",x:287,y:77,z:15},
{id:"KBD",name:"Keyboard ZIF",a:"board",b:"keyboard",x:209,y:170,z:14},
{id:"TPAD",name:"Touchpad ZIF",a:"board",b:"touchpad",x:247,y:170,z:14}
];
function copy(x){return JSON.parse(JSON.stringify(x));}
function make(){
 return{sourceOn:false,adapterConnected:false,batteryConnected:true,removed:[],screwsRemoved:[],cablesDisconnected:[],latchesOpen:[],thermalFresh:false,thermalSealBroken:false,torques:{},damage:[],log:[],last:"Ready for training",hardware:"BOARDLAB-15 fictional mechanical reference"};
}
const has=(arr,id)=>arr.includes(id),by=(arr,id)=>arr.find(x=>x.id===id);
function record(s,type,id,ok,message){
 s.last=message;s.log.push({index:s.log.length+1,type,id,ok,message});
 if(s.log.length>200)s.log.shift();
 return{ok,message};
}
function fail(s,type,id,message){return record(s,type,id,false,message);}
function safe(s,type,id){if(s.sourceOn||s.adapterConnected)return fail(s,type,id,"Disconnect the adapter and shut down before mechanical service.");return null;}
function adapter(s,on){if(on&&has(s.removed,"cover"))return fail(s,"adapter","power","Do not attach adapter with enclosure removed.");s.adapterConnected=!!on;return record(s,"adapter","power",true,on?"Adapter connected":"Adapter unplugged");}
function power(s,on){
 if(!on){s.sourceOn=false;return record(s,"power","system",true,"System shut down");}
 const status=verify(s);if(!status.ok)return fail(s,"power","system","Power-on blocked: "+status.reasons.slice(0,3).join("; "));
 s.sourceOn=true;return record(s,"power","system",true,"Virtual system powered on for QA");
}
function loosen(s,id){
 const x=by(SCREWS,id);if(!x)return fail(s,"screw",id,"Unknown screw");
 const e=safe(s,"screw",id);if(e)return e;
 if(has(s.screwsRemoved,id))return fail(s,"screw",id,"Screw is already removed.");
 if(x.part!=="cover"&&!has(s.removed,"cover"))return fail(s,"screw",id,"Remove bottom cover to access internal screw");
 if(has(s.removed,x.part))return fail(s,"screw",id,"The parent part is already removed.");
 if(x.part!=="cover"&&s.batteryConnected)return fail(s,"screw",id,"Disconnect battery before removing internal screws.");
 s.screwsRemoved.push(id);return record(s,"screw",id,true,"Removed "+id+"; store in labeled position");
}
function tighten(s,id,torque){
 const x=by(SCREWS,id);if(!x)return fail(s,"tighten",id,"Unknown screw");
 const e=safe(s,"tighten",id);if(e)return e;
 if(!has(s.screwsRemoved,id))return fail(s,"tighten",id,"Screw already installed.");
 if(has(s.removed,x.part))return fail(s,"tighten",id,"Install parent part before fastener.");
 if(x.part==="cover"&&has(s.removed,"cover"))return fail(s,"tighten",id,"Reinstall cover first.");
 const applied=Number(torque);if(!Number.isFinite(applied)||applied<0)return fail(s,"tighten",id,"Specify a non-negative applied torque.");
 if(applied>x.torqueNm*1.5){s.damage.push("Fastener "+id+" overtorqued");return fail(s,"tighten",id,"Excess torque; modeled mounting damage recorded.");}
 if(applied<x.torqueNm*.65)return fail(s,"tighten",id,"Torque below training tolerance; screw not secured.");
 s.screwsRemoved=s.screwsRemoved.filter(x=>x!==id);s.torques[id]=applied;return record(s,"tighten",id,true,"Tightened "+id+" at "+applied.toFixed(3)+" N·m (training only)");
}
function latch(s,id,open){
 const cable=by(CABLES,id);if(!cable)return fail(s,"latch",id,"Unknown connector");
 const e=safe(s,"latch",id);if(e)return e;
 if(!has(s.removed,"cover"))return fail(s,"latch",id,"Remove bottom cover first");
 if(id!=="BAT"&&s.batteryConnected)return fail(s,"latch",id,"Disconnect battery first.");
 if(id==="BAT")return fail(s,"latch",id,"Battery header does not have a ZIF latch. Use disconnect cable.");
 if(open&&!has(s.latchesOpen,id))s.latchesOpen.push(id);
 if(!open)s.latchesOpen=s.latchesOpen.filter(x=>x!==id);
 return record(s,"latch",id,true,open?"ZIF latch opened":"ZIF latch closed");
}
function cable(s,id,disconnect){
 const e=safe(s,"cable",id);if(e)return e;
 const item=by(CABLES,id);if(!item)return fail(s,"cable",id,"Unknown connector");
 if(!has(s.removed,"cover"))return fail(s,"cable",id,"Remove cover for cable access");
 if(id!=="BAT"&&s.batteryConnected)return fail(s,"cable",id,"Battery must be disconnected before working on other cables");
 if(id!=="BAT"&&disconnect&&!has(s.latchesOpen,id))return fail(s,"cable",id,"Open connector latch before disconnecting ribbon.");
 if(!disconnect&&id!=="BAT"&&has(s.latchesOpen,id)===false)return fail(s,"cable",id,"Open latch before inserting ribbon.");
 if(disconnect){
  if(has(s.cablesDisconnected,id))return fail(s,"cable",id,"Already disconnected.");
  s.cablesDisconnected.push(id);if(id==="BAT")s.batteryConnected=false;
  return record(s,"cable",id,true,"Disconnected "+item.name);
 }
 if(!has(s.cablesDisconnected,id))return fail(s,"cable",id,"Already connected.");
 if(has(s.removed,item.a)&&item.a!=="display"||has(s.removed,item.b)&&item.b!=="keyboard"&&item.b!=="touchpad"&&item.b!=="display")
   return fail(s,"cable",id,"Install both associated parts before reconnecting cable.");
 s.cablesDisconnected=s.cablesDisconnected.filter(x=>x!==id);if(id==="BAT")s.batteryConnected=true;
 return record(s,"cable",id,true,"Connected "+item.name);
}
function remove(s,id){
 const part=by(PARTS,id);if(!part||!part.removable)return fail(s,"remove",id,"Not a removable teaching part");
 const e=safe(s,"remove",id);if(e)return e;
 if(has(s.removed,id))return fail(s,"remove",id,"Already removed");
 if(SCREWS.some(x=>x.part===id&&!has(s.screwsRemoved,x.id)))return fail(s,"remove",id,"Remove every "+id+" screw before lifting.");
 if(id!=="cover"&&!has(s.removed,"cover"))return fail(s,"remove",id,"Bottom cover must be removed first.");
 if(id!=="cover"&&s.batteryConnected)return fail(s,"remove",id,"Battery must be isolated for internal removal.");
 if(CABLES.some(x=>(x.a===id||x.b===id)&&!has(s.cablesDisconnected,x.id)))return fail(s,"remove",id,"Disconnect all linked cables before lifting "+id);
 if(id==="board"&&["ssd","ram","fan","heatsink","battery"].some(p=>!has(s.removed,p)))return fail(s,"remove",id,"Remove storage, memory, cooling and battery before motherboard.");
 if(id==="heatsink"&&!has(s.removed,"fan"))return fail(s,"remove",id,"Remove fan before heatsink.");
 if(id==="battery"&&!has(s.cablesDisconnected,"BAT"))return fail(s,"remove",id,"Isolate battery header before removing battery.");
 s.removed.push(id);if(id==="heatsink"){s.thermalSealBroken=true;s.thermalFresh=false;}
 return record(s,"remove",id,true,"Lifted "+part.name+" out of chassis");
}
function install(s,id){
 const part=by(PARTS,id);if(!part||!part.removable)return fail(s,"install",id,"Not a removable teaching part");
 const e=safe(s,"install",id);if(e)return e;
 if(!has(s.removed,id))return fail(s,"install",id,"Part already installed");
 if(id!=="cover"&&id!=="board"&&has(s.removed,"board"))return fail(s,"install",id,"Install motherboard before child components");
 if(id==="cover"){
  if(PARTS.some(p=>p.removable&&p.id!=="cover"&&has(s.removed,p.id)))return fail(s,"install",id,"All internal parts must be seated before closing cover");
  if(SCREWS.filter(x=>x.part!=="cover").some(x=>has(s.screwsRemoved,x.id)))return fail(s,"install",id,"Secure internal screws first");
  if(CABLES.some(x=>has(s.cablesDisconnected,x.id)))return fail(s,"install",id,"Reconnect inspected cables first");
 }
 if(id==="heatsink"&&!s.thermalFresh)return fail(s,"install",id,"Clean interface and apply fresh virtual thermal material before installing heatsink");
 s.removed=s.removed.filter(x=>x!==id);return record(s,"install",id,true,"Installed "+part.name);
}
function paste(s){
 const e=safe(s,"thermal","paste");if(e)return e;
 if(!has(s.removed,"cover")||!has(s.removed,"heatsink"))return fail(s,"thermal","paste","Remove heatsink before renewing thermal material");
 if(s.batteryConnected)return fail(s,"thermal","paste","Disconnect battery before thermal work");
 s.thermalFresh=true;s.thermalSealBroken=false;return record(s,"thermal","paste",true,"Fresh virtual thermal material applied");
}
function verify(s){
 const reasons=[];
 if(s.adapterConnected&&has(s.removed,"cover"))reasons.push("Adapter attached while access cover removed");
 for(const p of PARTS)if(p.removable&&has(s.removed,p.id))reasons.push(p.id+" not installed");
 for(const x of SCREWS)if(has(s.screwsRemoved,x.id))reasons.push(x.id+" missing");
 for(const c of CABLES)if(has(s.cablesDisconnected,c.id)||has(s.latchesOpen,c.id))reasons.push(c.id+" connector not latched/connected");
 if(s.thermalSealBroken)reasons.push("Thermal interface disturbed without renewal");
 if(!s.batteryConnected)reasons.push("Battery not connected");
 if(s.damage.length)reasons.push("Mechanical damage: "+s.damage.join(", "));
 return{ok:reasons.length===0,reasons,score:Math.max(0,100-Math.min(100,reasons.length*10+s.damage.length*25)),model:"Fictional, dimensional training geometry; no OEM torque certification"};
}
function visible(s){return PARTS.map(p=>({...p,removed:has(s.removed,p.id)}));}
function parts(){return copy(PARTS);}
function screws(){return copy(SCREWS);}
function cables(){return copy(CABLES);}
return{CHASSIS,PARTS,SCREWS,CABLES,make,adapter,power,loosen,tighten,latch,cable,remove,install,paste,verify,visible,parts,screws,cables};
});