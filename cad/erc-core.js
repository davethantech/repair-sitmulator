/* BOARD//LAB 6 — schematic↔PCB connectivity / electrical rule training checker.
 * Not KiCad ERC, full netlist parser, IPC release, or verified component library.
 * Validates explicit pin numbers/types, expected board nets and supply graph.
 */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("../pcb-core.js"):root.BoardPCB);if(typeof module==="object"&&module.exports)module.exports=api;else root.BoardERC=api;})(typeof globalThis!=="undefined"?globalThis:this,function(PCB){
"use strict";
const PIN_TYPES=new Set(["passive","input","output","power_in","power_out","open_collector","no_connect"]);
const LIBRARY={
 R0805:{footprint:"generic",pins:{"1":"passive","2":"passive"}},
 C0805:{footprint:"generic",pins:{"1":"passive","2":"passive"}},
 L0805:{footprint:"generic",pins:{"1":"passive","2":"passive"}},
 F1206:{footprint:"generic",pins:{"1":"passive","2":"passive"}},
 LED0805:{footprint:"generic",pins:{"1":"passive","2":"passive"}},
 D_SOD123:{footprint:"generic",pins:{"1":"passive","2":"passive"}},
 HEADER2:{footprint:"generic",pins:{"1":"passive","2":"passive"}},
 HEADER3:{footprint:"generic",pins:{"1":"passive","2":"passive","3":"passive"}},
 SOT23_5_TRAINER:{footprint:"fictional",pins:{"1":"input","2":"power_in","3":"passive","4":"output","5":"power_in"}},
 USB_C_CONCEPT:{footprint:"fictional",pins:{"VBUS":"power_in","GND":"passive","CC1":"passive","CC2":"passive"}},
 HOLE_M3:{footprint:"mechanical",pins:{}}
};
const clone=x=>JSON.parse(JSON.stringify(x));
function schematicFromPCB(b){
 b=PCB.validateImport(b);
 return{schema:"boardlab.schematic.v1",name:b.title,
  symbols:b.parts.filter(p=>p.type!=="HOLE_M3").map(p=>{
   const spec=LIBRARY[p.type],pins=Object.entries(spec?.pins||{}).map(([number,electrical])=>({number,net:p.nets[number]||"",electrical}));
   return{ref:p.ref,footprintType:p.type,value:p.value,pins,mpn:null,pinoutVerified:false};
  }),
  sources: b.parts.some(p=>p.id==="j1"&&p.nets["1"]==="VIN_5V")?[{net:"VIN_5V",nominalV:5,description:"External isolated 5 V training connector"}]:[],
  revision:b.rev||1};
}
function validate(raw){
 if(!raw||raw.schema!=="boardlab.schematic.v1"||!Array.isArray(raw.symbols)||raw.symbols.length>200)throw Error("Unsupported schematic project format");
 const s=clone(raw),refs=new Set();
 for(const sym of s.symbols){
  if(!sym||typeof sym.ref!=="string"||!/^[A-Za-z][\w.-]{0,25}$/.test(sym.ref)||refs.has(sym.ref))throw Error("Duplicate/invalid schematic symbol reference");
  refs.add(sym.ref);if(!LIBRARY[sym.footprintType])throw Error("Unknown training symbol footprint "+sym.footprintType);
  if(!Array.isArray(sym.pins))throw Error("Symbol missing pins");
  const ids=new Set();
  for(const pin of sym.pins){
   if(typeof pin.number!=="string"||ids.has(pin.number)||!PIN_TYPES.has(pin.electrical))throw Error("Invalid or duplicate pin");
   ids.add(pin.number);
   if(typeof pin.net!=="string"||pin.net.length>60)throw Error("Invalid pin net label");
  }
 }
 if(!Array.isArray(s.sources)||s.sources.length>12)throw Error("External source definitions required");
 for(const source of s.sources)if(typeof source.net!=="string"||source.net.length>60||!Number.isFinite(source.nominalV)||Math.abs(source.nominalV)>48)throw Error("Only isolated ≤48 V training source definitions allowed");
 return s;
}
function check(schematic,board){
 const s=validate(schematic),b=PCB.validateImport(board),issues=[];
 const add=(severity,code,message,ref,net)=>issues.push({severity,code,message,ref:ref||"",net:net||""});
 const pcbByRef=new Map(b.parts.filter(p=>p.type!=="HOLE_M3").map(p=>[p.ref,p]));
 const schByRef=new Map(s.symbols.map(x=>[x.ref,x]));
 const padNets=new Map(),netPins=new Map();
 for(const p of PCB.allPads(b))padNets.set(p.ref+"."+p.pin,p.net);
 for(const sym of s.symbols){
  const physical=pcbByRef.get(sym.ref);
  if(!physical){add("error","symbol_missing_footprint",sym.ref+" has no placed PCB footprint",sym.ref);continue;}
  if(physical.type!==sym.footprintType)add("error","footprint_type_mismatch",sym.ref+" symbol and board footprint disagree",sym.ref);
  const spec=LIBRARY[sym.footprintType];
  if(spec.footprint==="fictional")add("error","nonfabricable_symbol",sym.ref+" is a conceptual symbol requiring actual vendor footprint and pinout",sym.ref);
  if(!sym.pinoutVerified||!sym.mpn)add("review","part_not_supplier_verified",sym.ref+" has no verified manufacturer part number and pin mapping",sym.ref);
  for(const [pin,type] of Object.entries(spec.pins)){
   if(!sym.pins.some(x=>x.number===pin))add("error","missing_symbol_pin",sym.ref+" missing symbol pin "+pin,sym.ref);
  }
  for(const pin of sym.pins){
   const key=sym.ref+"."+pin.number;
   if(pin.electrical==="no_connect"&&pin.net)add("error","no_connect_wired",key+" declared NC but assigned net",sym.ref,pin.net);
   if(!pin.net&&pin.electrical!=="no_connect")add("warning","unconnected_schematic_pin",key+" has no net",sym.ref);
   const physicalNet=padNets.get(key);
   if(physicalNet===undefined)add("error","missing_physical_pad",key+" has no physical matching pad",sym.ref,pin.net);
   else if(physicalNet!==pin.net)add("error","net_mismatch",key+" schematic net "+pin.net+" differs from PCB "+physicalNet,sym.ref,pin.net);
   if(pin.net){if(!netPins.has(pin.net))netPins.set(pin.net,[]);netPins.get(pin.net).push({ref:sym.ref,pin:pin.number,electrical:pin.electrical});}
  }
  const netNames=new Map();
  for(const pin of sym.pins)if(pin.net){if(!netNames.has(pin.net))netNames.set(pin.net,[]);netNames.get(pin.net).push(pin.number);}
  for(const [net,pins] of netNames)if(pins.length>1&&["R0805","L0805","F1206","LED0805","D_SOD123"].includes(sym.footprintType))
    add("error","terminals_shorted",sym.ref+" distinct terminals share "+net+"; inspect component or schematic intent",sym.ref,net);
 }
 for(const placed of b.parts.filter(p=>p.type!=="HOLE_M3"))if(!schByRef.has(placed.ref))add("error","orphan_board_part",placed.ref+" appears on PCB but not schematic",placed.ref);
 const supply=new Set(s.sources.map(x=>x.net));
 for(const [net,pins] of netPins){
  if(pins.length===1)add("warning","single_pin_net",net+" contains only one modeled pin",pins[0].ref,net);
  const outputs=pins.filter(x=>x.electrical==="output"||x.electrical==="power_out");
  if(outputs.length>1)add("error","output_conflict",net+" has "+outputs.length+" push-pull/source outputs",outputs[0].ref,net);
  if(pins.some(x=>x.electrical==="power_in")&&!supply.has(net)&&!outputs.length)
    add("warning","power_input_no_driver",net+" has powered IC pins but no declared driver; inspect upstream passive paths",pins[0].ref,net);
 }
 for(const source of s.sources)if(!netPins.has(source.net))add("warning","unused_external_source","External source "+source.net+" is not connected",null,source.net);
 // Compare actual copper topology to declared schematic nets.
 const routing=PCB.check(b);
 for(const i of routing.issues)if(["unrouted","track_pad_short","track_clearance","pad_short"].includes(i.code))
   add(i.level==="error"?"error":"warning","pcb_"+i.code,i.message,i.id);
 const errors=issues.filter(x=>x.severity==="error").length,warnings=issues.filter(x=>x.severity==="warning").length,reviews=issues.filter(x=>x.severity==="review").length;
 return{issues,errors,warnings,reviews,connectedNetCount:netPins.size,netPins:Object.fromEntries(netPins),matchingSymbols:s.symbols.length,pcbStatus:routing,manufacturerVerified:s.symbols.length>0&&s.symbols.every(x=>x.mpn&&x.pinoutVerified),releaseApproved:false,accuracy:"TRAINING ERC — must run native KiCad ERC/DRC and exact vendor pinout checks"};
}
function reviseNet(schematic,ref,pin,net){const s=validate(schematic),sym=s.symbols.find(x=>x.ref===ref),p=sym?.pins.find(x=>x.number===pin);if(!p)throw Error("Cannot locate symbol/pin");if(typeof net!=="string"||net.length>60)throw Error("Invalid net label");p.net=net;return s;}
function exportNetlist(schematic){const s=validate(schematic);return{schema:"boardlab.netlist.v1",name:s.name,nets:[...new Set(s.symbols.flatMap(x=>x.pins.map(p=>p.net).filter(Boolean)))].sort().map(net=>({name:net,members:s.symbols.flatMap(x=>x.pins.filter(p=>p.net===net).map(p=>x.ref+"."+p.number))})),components:s.symbols.map(x=>({ref:x.ref,type:x.footprintType,value:x.value,mpn:x.mpn,verified:x.pinoutVerified})),release:"NOT APPROVED FOR MANUFACTURE"};}
return{LIBRARY,PIN_TYPES,schematicFromPCB,validate,check,reviseNet,exportNetlist};
});