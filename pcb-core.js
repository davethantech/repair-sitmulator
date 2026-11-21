/* BOARD//LAB PCB Studio 3.0 — educational electronic design core.
   No manufacturer geometry, IEC/IPC certification, controlled impedance signoff or fab release implied.
   Pure functions, browser + CommonJS compatible. Units for layout are mm. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BoardPCB=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=o=>JSON.parse(JSON.stringify(o));
const round=(n,d=3)=>Number(Number(n).toFixed(d));
const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
const COMPONENTS={
 'R0805':{title:'Resistor · 0805',kind:'R',body:[2.1,1.35],pads:[['1',-1.15,0,1.05,1.22],['2',1.15,0,1.05,1.22]],silk:'#d9e4ea',footprint:'Resistor_SMD:R_0805_2012Metric',label:'RES'},
 'C0805':{title:'Capacitor · 0805',kind:'C',body:[2.1,1.35],pads:[['1',-1.15,0,1.05,1.22],['2',1.15,0,1.05,1.22]],silk:'#a9dced',footprint:'Capacitor_SMD:C_0805_2012Metric',label:'CAP'},
 'L0805':{title:'Inductor · 0805',kind:'L',body:[2.1,1.35],pads:[['1',-1.15,0,1.05,1.22],['2',1.15,0,1.05,1.22]],silk:'#d3b8ef',footprint:'Inductor_SMD:L_0805_2012Metric',label:'IND'},
 'LED0805':{title:'LED · 0805',kind:'D',body:[2.1,1.35],pads:[['1',-1.15,0,1.05,1.22],['2',1.15,0,1.05,1.22]],silk:'#c7eaa2',footprint:'LED_SMD:LED_0805_2012Metric',label:'LED'},
 'D_SOD123':{title:'Protection diode · SOD-123',kind:'D',body:[2.7,1.7],pads:[['1',-1.75,0,1.25,1.45],['2',1.75,0,1.25,1.45]],silk:'#f1d2bc',footprint:'Diode_SMD:D_SOD-123',label:'DIODE'},
 'F1206':{title:'Fuse · 1206',kind:'F',body:[3.2,1.7],pads:[['1',-1.85,0,1.35,1.6],['2',1.85,0,1.35,1.6]],silk:'#f5dd99',footprint:'Fuse:Fuse_1206_3216Metric',label:'FUSE'},
 'HEADER2':{title:'Two-position through-hole input',kind:'J',body:[3.8,8],pads:[['1',0,-2.54,1.8,1.8,1],['2',0,2.54,1.8,1.8,1]],silk:'#b5d0ff',footprint:'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical',label:'PWR'},
 'HEADER3':{title:'Three-position through-hole header',kind:'J',body:[3.8,10],pads:[['1',0,-2.54,1.8,1.8,1],['2',0,0,1.8,1.8,1],['3',0,2.54,1.8,1.8,1]],silk:'#b5d0ff',footprint:'Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical',label:'HDR'},
 'SOT23_5_TRAINER':{title:'5-pin controller (abstract pin map)',kind:'U',body:[3.3,2.9],pads:[['1',-1.35,-1.15,.75,.65],['2',-1.35,0,.75,.65],['3',-1.35,1.15,.75,.65],['4',1.35,1.15,.75,.65],['5',1.35,-1.15,.75,.65]],silk:'#c5ddfd',footprint:'Package_TO_SOT_SMD:SOT-23-5',label:'IC'},
 'USB_C_CONCEPT':{title:'USB-C 5V-only concept (NOT physical receptacle footprint)',kind:'J',body:[6.2,8.0],pads:[['VBUS',-3,-2.4,1.25,.9],['GND',-3,-.8,1.25,.9],['CC1',-3,.8,1.25,.9],['CC2',-3,2.4,1.25,.9]],silk:'#ebc4a8',footprint:'BOARDLAB:USB_C_CONCEPT_NOT_FAB',label:'USB-C'},
 'HOLE_M3':{title:'M3 mounting hole (non-plated)',kind:'H',body:[6.5,6.5],pads:[],hole:3.2,silk:'#9baac4',footprint:'MountingHole:MountingHole_3.2mm_M3',label:'M3'}
};
function part(id,type,ref,value,x,y,nets={},angle=0){return{id,type,ref,value,x,y,angle,nets:clone(nets)};}
function base(title,w=84,h=54){return{schema:'boardlab.pcb.v1',title,width:w,height:h,layers:2,stackup:{thickness:1.6,er:4.2,copper:0.035,signalHeight:0.18,plane:'GND',mask:true},rules:{clearance:.25,minTrack:.25,edge:.5,viaDiameter:.65,viaDrill:.3},parts:[],tracks:[],vias:[],notes:['TRAINING ARTIFACT: not fabrication-approved. Verify exact footprints, datasheets and fab constraints in KiCad.'],rev:1};}
function presets(){
 let beginner=base('5V LED safety indicator — introductory PCB',84,54);beginner.parts=[
 part('j1','HEADER2','J1','5V IN',11,27,{'1':'VIN_5V','2':'GND'}),
 part('f1','F1206','F1','Resettable fuse (select actual rating)',29,24.46,{'1':'VIN_5V','2':'VCC_PROTECTED'}),
 part('c1','C0805','C1','10µF (select voltage/derating)',45,34,{'1':'VCC_PROTECTED','2':'GND'}),
 part('r1','R0805','R1','1kΩ',54,16,{'1':'VCC_PROTECTED','2':'LED_A'}),
 part('d1','LED0805','D1','Indicator LED',70,16,{'1':'LED_A','2':'GND'}),
 part('h1','HOLE_M3','H1','NPTH M3',6,6),part('h2','HOLE_M3','H2','NPTH M3',78,6),part('h3','HOLE_M3','H3','NPTH M3',6,48),part('h4','HOLE_M3','H4','NPTH M3',78,48)];
 beginner.notes.push('The input is a 5 V LOW-VOLTAGE TRAINER: do not apply mains. LED polarity and actual part pin numbers require datasheet verification.');
 let power=base('3.3V sensor module — schematic-to-board',90,58);power.layers=4;power.parts=[
 part('j1','HEADER2','J1','5V IN',11,28,{'1':'VIN_5V','2':'GND'}),part('f1','F1206','F1','Input fuse',26,25.46,{'1':'VIN_5V','2':'5V_FUSED'}),
 part('c1','C0805','C1','10µF',35,34,{'1':'5V_FUSED','2':'GND'}),
 part('u1','SOT23_5_TRAINER','U1','3.3V LDO concept · datasheet pinout required',49,26,{'1':'5V_FUSED','2':'GND','3':'EN','4':'3V3','5':'GND'}),
 part('c2','C0805','C2','10µF',61,33,{'1':'3V3','2':'GND'}),
 part('r1','R0805','R1','1kΩ',65,16,{'1':'3V3','2':'LED_A'}),
 part('d1','LED0805','D1','LED',78,16,{'1':'LED_A','2':'GND'}),
 part('j2','HEADER3','J2','Sensor output',80,40,{'1':'3V3','2':'GND','3':'SIGNAL'}),
 part('r2','R0805','R2','100kΩ · enable pullup',42,16,{'1':'5V_FUSED','2':'EN'})];
 power.notes.push('U1 is an ABSTRACT five-pin training regulator: verify device-specific VIN, VOUT, EN, GND, thermal and capacitor-ESR requirements before any hardware build.');
 let usb=base('USB-C 5V sink — CC pull-down concept',96,62);usb.layers=4;usb.parts=[
 part('j1','USB_C_CONCEPT','J1','USB Type-C connector CONCEPT ONLY',15,31,{'VBUS':'VBUS','GND':'GND','CC1':'CC1','CC2':'CC2'}),
 part('rcc1','R0805','R1','5.1kΩ Rd on CC1',34,43,{'1':'CC1','2':'GND'}),part('rcc2','R0805','R2','5.1kΩ Rd on CC2',34,50,{'1':'CC2','2':'GND'}),
 part('f1','F1206','F1','Fuse rated to source/current budget',33,22,{'1':'VBUS','2':'5V_SAFE'}),
 part('d1','D_SOD123','D1','TVS · select standoff/clamp',50,37,{'1':'5V_SAFE','2':'GND'}),
 part('c1','C0805','C1','10µF input decoupling',60,39,{'1':'5V_SAFE','2':'GND'}),
 part('r3','R0805','R3','1kΩ',64,19,{'1':'5V_SAFE','2':'LED_A'}),part('d2','LED0805','D2','Power indicator',81,19,{'1':'LED_A','2':'GND'}),
 part('j2','HEADER2','J2','5V outlet',82,46,{'1':'5V_SAFE','2':'GND'})];
 usb.notes.push('USB-C J1 is a symbolic concept, NOT a physical footprint or verified pin map. For a real PCB select an exact manufacturer connector, including all A/B mirrored VBUS/GND pins, shields, CC polarity, footprint pad numbering and mechanical keepouts.');
 usb.notes.push('Independent ~5.1kΩ pull-downs on CC1 and CC2 are a 5V sink concept, NOT a USB-PD negotiation or unrestricted current entitlement. Observe advertised current and real connector/ESD design rules.');
 return {led:beginner,regulator:power,usb:usb,blank:base('Untitled low-voltage training board',84,54)};
}
function getTemplate(key){return clone(presets()[key]||presets().led);}
function rotated(px,py,angle){let a=((angle||0)%360)*Math.PI/180;return [px*Math.cos(a)-py*Math.sin(a),px*Math.sin(a)+py*Math.cos(a)];}
function padsFor(p){let def=COMPONENTS[p.type];if(!def)return[];return def.pads.map(d=>{const xy=rotated(d[1],d[2],p.angle);const ang=((p.angle||0)%360)*Math.PI/180,w=Math.abs(d[3]*Math.cos(ang))+Math.abs(d[4]*Math.sin(ang)),h=Math.abs(d[3]*Math.sin(ang))+Math.abs(d[4]*Math.cos(ang));return{part:p.id,ref:p.ref,pin:d[0],net:(p.nets||{})[d[0]]||'',x:round(p.x+xy[0],4),y:round(p.y+xy[1],4),w:round(w,4),h:round(h,4),th:!!d[5],layer:d[5]?'*.Cu':'F.Cu',type:p.type}});}
function allPads(b){return b.parts.flatMap(padsFor)};
function nets(b){let r=new Set();allPads(b).forEach(p=>p.net&&r.add(p.net));return [...r].sort();}
function newPart(b,type,x,y){if(!COMPONENTS[type])throw new Error('Unknown footprint');const prefix=COMPONENTS[type].kind,occupied=new Set(b.parts.map(p=>p.ref)),num=Array.from({length:999},(_,i)=>i+1).find(i=>!occupied.has(prefix+i));const ref=prefix+num,id='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);const nets={};COMPONENTS[type].pads.forEach(pd=>nets[pd[0]]='');return part(id,type,ref,'CHECK DATASHEET',clamp(round(x,1),4,b.width-4),clamp(round(y,1),4,b.height-4),nets);}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pointSegment=(p,a,b)=>{let x=b.x-a.x,y=b.y-a.y,len=x*x+y*y,t=len?clamp(((p.x-a.x)*x+(p.y-a.y)*y)/len,0,1):0;return Math.hypot(p.x-a.x-x*t,p.y-a.y-y*t)};
function segIntersect(a,b,c,d){const cross=(u,v,w)=>(v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x);let s1=cross(a,b,c),s2=cross(a,b,d),s3=cross(c,d,a),s4=cross(c,d,b);return(s1*s2<0&&s3*s4<0)||(Math.abs(s1)<1e-9&&pointSegment(c,a,b)<1e-9)||(Math.abs(s2)<1e-9&&pointSegment(d,a,b)<1e-9)||(Math.abs(s3)<1e-9&&pointSegment(a,c,d)<1e-9)||(Math.abs(s4)<1e-9&&pointSegment(b,c,d)<1e-9);}
function segmentDistance(a,b,c,d){return segIntersect(a,b,c,d)?0:Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));}
function conductiveLayerMatch(a,b){return a.layer===b.layer||a.layer==='*.Cu'||b.layer==='*.Cu';}
function pathLength(t){return(t.points||[]).slice(1).reduce((s,v,i)=>s+dist(v,t.points[i]),0);}
function traceSegs(b){const arr=[];b.tracks.forEach(t=>{for(let j=0;j<t.points.length-1;j++)arr.push({net:t.net,layer:t.layer||'F.Cu',w:Number(t.width)||.25,a:t.points[j],b:t.points[j+1],id:t.id,kind:'track'});});return arr;}
function issue(level,code,message,id){return{level,code,message,id};}
function check(b){let out=[],pads=allPads(b),segs=traceSegs(b),vias=b.vias||[],rules=b.rules||{};const clear=+rules.clearance||.25,edge=+rules.edge||.5,minTrack=+rules.minTrack||.25;
 const partRefs=new Set();for(const p of b.parts){if(!COMPONENTS[p.type]){out.push(issue('error','unknown_footprint','Footprint type '+p.type+' is not available.',p.id));continue;}if(partRefs.has(p.ref))out.push(issue('error','duplicate_ref','Duplicate reference '+p.ref,p.id));partRefs.add(p.ref);if(p.type==='USB_C_CONCEPT')out.push(issue('warning','concept_connector','J1 USB-C footprint is conceptual; do not fabricate or treat pin labels as vendor pad numbers.',p.id));if(p.type==='SOT23_5_TRAINER')out.push(issue('warning','unverified_pinout','U1 pin mapping is illustrative; replace it using an actual datasheet.',p.id));if(!COMPONENTS[p.type].pads.length&&p.type!=='HOLE_M3')out.push(issue('warning','no_pads',p.ref+' has no pads.',p.id));}
 for(const p of pads){let r=Math.max(p.w,p.h)/2;if(Math.min(p.x,p.y,b.width-p.x,b.height-p.y)<r+edge)out.push(issue('error','pad_edge',`${p.ref}.${p.pin} violates copper-to-edge rule.`,p.part));if(!p.net)out.push(issue('warning','unassigned_net',`${p.ref}.${p.pin} needs a schematic net assignment.`,p.part));}
 for(let i=0;i<pads.length;i++)for(let j=i+1;j<pads.length;j++){let a=pads[i],c=pads[j];if(a.part===c.part)continue;if(conductiveLayerMatch(a,c)&&a.net&&c.net&&a.net!==c.net&&dist(a,c)<Math.max(a.w,a.h)/2+Math.max(c.w,c.h)/2+clear)out.push(issue('error','pad_short',`${a.ref}.${a.pin} overlaps ${c.ref}.${c.pin} on different nets.`,a.part));}
 for(const t of b.tracks){if(!nets(b).includes(t.net))out.push(issue('warning','orphan_net',`Track ${t.id} uses a net that is not assigned to any pad.`,t.id));if(t.layer!=='F.Cu'&&t.layer!=='B.Cu')out.push(issue('error','bad_layer','Tracks must be on F.Cu or B.Cu in this training editor.',t.id));if(t.width<minTrack)out.push(issue('error','min_width',`Track ${t.id} is ${t.width} mm; minimum is ${minTrack} mm.`,t.id));if(!Array.isArray(t.points)||t.points.length<2)out.push(issue('error','trace_shape','Trace needs two or more points.',t.id));for(const q of t.points||[])if(Math.min(q.x,q.y,b.width-q.x,b.height-q.y)<edge+t.width/2)out.push(issue('error','trace_edge',`Track ${t.id} is too close to the board edge.`,t.id));}
 for(const v of vias){if(v.diameter<v.drill+.25)out.push(issue('error','annular_ring',`Via ${v.id}: annular ring needs at least 0.125 mm per side (training default).`,v.id));if(v.drill<.2)out.push(issue('error','via_drill',`Via ${v.id}: drill is below 0.2 mm training minimum.`,v.id));if(Math.min(v.x,v.y,b.width-v.x,b.height-v.y)<v.diameter/2+edge)out.push(issue('error','via_edge',`Via ${v.id} violates edge clearance.`,v.id));}
 for(let i=0;i<segs.length;i++){let s=segs[i];for(let p of pads){if(p.net===s.net||!p.net||!conductiveLayerMatch(s,p))continue;let separation=pointSegment(p,s.a,s.b)-(s.w/2+Math.max(p.w,p.h)/2);if(separation<clear)out.push(issue('error','track_pad_short',`Copper ${s.id} (${s.net}) is within ${round(separation)} mm of ${p.ref}.${p.pin} (${p.net}).`,s.id));}for(let j=i+1;j<segs.length;j++){let o=segs[j];if(o.layer!==s.layer||o.net===s.net)continue;let separation=segmentDistance(s.a,s.b,o.a,o.b)-(s.w+o.w)/2;if(separation<clear)out.push(issue('error','track_clearance',`Tracks ${s.id}/${o.id} are too close (${round(separation)} mm).`,s.id));}for(let v of vias){if(v.net===s.net)continue;let separation=pointSegment(v,s.a,s.b)-(s.w+v.diameter)/2;if(separation<clear)out.push(issue('error','track_via_short',`Track ${s.id} is too close to via ${v.id}.`,s.id));}}
 for(let i=0;i<vias.length;i++){let v=vias[i];for(let p of pads){if(!p.net||p.net===v.net)continue;if(dist(v,p)<(v.diameter+Math.max(p.w,p.h))/2+clear)out.push(issue('error','via_pad_short',`Via ${v.id} is too close to ${p.ref}.${p.pin}.`,v.id));}for(let j=i+1;j<vias.length;j++){let u=vias[j];if(v.net!==u.net&&dist(v,u)<(v.diameter+u.diameter)/2+clear)out.push(issue('error','via_clearance',`Vias ${v.id} and ${u.id} violate clearance.`,v.id));}}
 // Connectivity by electrical net and geometry. A plated through-hole pad can connect F/B copper.
 let totalConnections=0,joinedConnections=0,groupsByNet={};
 for(const net of nets(b)){const P=pads.filter(p=>p.net===net),T=segs.filter(t=>t.net===net),V=vias.filter(v=>v.net===net);
  const nodes=[...P.map(p=>({type:'pad',o:p})),...T.map(t=>({type:'seg',o:t})),...V.map(v=>({type:'via',o:v}))];const parent=nodes.map((_,i)=>i);const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));const join=(a,c)=>{a=find(a);c=find(c);if(a!==c)parent[c]=a};
  const connected=(a,c)=>{let x=a.o,y=c.o;if(a.type==='pad'&&c.type==='pad')return conductiveLayerMatch(x,y)&&dist(x,y)<Math.max(x.w,x.h)/2+Math.max(y.w,y.h)/2;
   if(a.type==='seg'&&c.type==='seg')return x.layer===y.layer&&segmentDistance(x.a,x.b,y.a,y.b)<(x.w+y.w)/2+.01;
   if(a.type==='via'&&c.type==='via')return dist(x,y)<(x.diameter+y.diameter)/2+.01;
   if(a.type==='pad'&&c.type==='seg')return conductiveLayerMatch(x,y)&&pointSegment(x,y.a,y.b)<(Math.max(x.w,x.h)+y.w)/2+.02;
   if(a.type==='seg'&&c.type==='pad')return connected(c,a);
   if(a.type==='pad'&&c.type==='via')return dist(x,y)<(Math.max(x.w,x.h)+y.diameter)/2+.01;
   if(a.type==='via'&&c.type==='pad')return connected(c,a);
   if(a.type==='seg'&&c.type==='via')return pointSegment(y,x.a,x.b)<(x.w+y.diameter)/2+.01;
   if(a.type==='via'&&c.type==='seg')return connected(c,a);return false;};
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(connected(nodes[i],nodes[j]))join(i,j);
  let padGroups=new Set(P.map((_,i)=>find(i)));groupsByNet[net]=padGroups.size;
  if(P.length>1){totalConnections+=P.length-1;joinedConnections+=P.length-padGroups.size;if(padGroups.size>1)out.push(issue('warning','unrouted',`${net}: ${padGroups.size} disconnected copper groups (${P.length} component pads).`,P[0].part));}
 }
 const dedup=new Map();out.forEach(i=>dedup.set([i.code,i.message].join('::'),i));out=[...dedup.values()];return{issues:out,errors:out.filter(x=>x.level==='error').length,warnings:out.filter(x=>x.level==='warning').length,totalConnections,joinedConnections,percent:totalConnections?Math.round(100*joinedConnections/totalConnections):100,groupsByNet};
}
// Ohmic loss only: assumes uniformly plated copper and no temperature rise; does not determine safe ampacity.
function copperLoss(lengthMm,widthMm,thicknessMm,currentA=1){let l=Math.max(0,lengthMm)*.001,a=Math.max(widthMm,.001)*.001*Math.max(thicknessMm,.001)*.001,R=1.724e-8*l/a;return{resistance:round(R,5),drop:round(R*currentA,5),loss:round(R*currentA*currentA,5)};}
// Rough outer-layer microstrip closed form, low-frequency quasi-TEM approximation; NOT stackup signoff.
function microstrip(width,h,er=4.2,t=.035){width=Math.max(width,.01);h=Math.max(h,.01);let u=(width+t/Math.PI)/h,eEff=(er+1)/2+(er-1)/2/Math.sqrt(1+12/u);let z=u<=1?60/Math.sqrt(eEff)*Math.log(8/u+.25*u):120*Math.PI/(Math.sqrt(eEff)*(u+1.393+.667*Math.log(u+1.444)));return round(z,2);}
function widthForZ(target,h,er,t){let lo=.02,hi=10;for(let i=0;i<60;i++){let m=(lo+hi)/2;if(microstrip(m,h,er,t)>target)lo=m;else hi=m;}return round((lo+hi)/2,3);}
function validateImport(b){if(!b||b.schema!=='boardlab.pcb.v1')throw Error('Not a BOARD//LAB PCB project file.');if(!Array.isArray(b.parts)||!Array.isArray(b.tracks)||!Array.isArray(b.vias))throw Error('Project arrays missing.');if(b.parts.length>200||b.tracks.length>1500||b.vias.length>1000)throw Error('Project exceeds training-editor limits.');if(!Number.isFinite(b.width)||!Number.isFinite(b.height)||b.width<25||b.width>400||b.height<25||b.height>300)throw Error('Board dimensions must be 25–400 × 25–300 mm.');if(!b.rules||!b.stackup)throw Error('Missing design rules or layer stack.');for(const p of b.parts){if(!COMPONENTS[p.type])throw Error('Unknown footprint '+p.type);if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.angle))throw Error('Invalid component position.');if(!p.nets||typeof p.nets!=='object')throw Error('Missing pad assignments.');for(let n of Object.values(p.nets))if(typeof n!=='string'||n.length>60)throw Error('Invalid net label.');}if(typeof b.title!=='string'||b.title.length>140)throw Error('Invalid project title.');for(const t of b.tracks){if(typeof t.net!=='string'||t.net.length>60||!Array.isArray(t.points)||t.points.length<2||t.points.length>128||!['F.Cu','B.Cu'].includes(t.layer)||!Number.isFinite(t.width))throw Error('Invalid trace.');for(let p of t.points)if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Invalid trace coordinate.');}for(const v of b.vias){if(!Number.isFinite(v.x)||!Number.isFinite(v.y)||!Number.isFinite(v.drill)||!Number.isFinite(v.diameter)||typeof v.net!=='string'||v.net.length>60)throw Error('Invalid via.');}return clone(b);}
function csv(b){let rows=[['Designator','Value / spec','Footprint type','Quantity','Verification status']];const parts=b.parts.filter(p=>p.type!=='HOLE_M3');for(let p of parts)rows.push([p.ref,p.value,COMPONENTS[p.type].footprint,'1',p.type.includes('TRAINER')||p.type.includes('CONCEPT')?'NON-MANUFACTURABLE / CHECK DEVICE':'VERIFY SUPPLIER PART']);return rows.map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\r\n');}
function toKiCad(b){let P=allPads(b),netNames=nets(b),netMap=new Map(netNames.map((n,i)=>[n,i+1])),q=s=>'"'+String(s??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,' ')+'"',n=val=>round(val,5),lines=[];
 lines.push('(kicad_pcb (version 20221018) (generator pcbnew)');lines.push('  (general (thickness '+n(b.stackup.thickness)+'))');lines.push('  (paper "A4")');lines.push('  (layers (0 "F.Cu" signal) (31 "B.Cu" signal) (32 "B.Adhes" user) (33 "F.Adhes" user) (34 "B.Paste" user) (35 "F.Paste" user) (36 "B.SilkS" user) (37 "F.SilkS" user) (38 "B.Mask" user) (39 "F.Mask" user) (44 "Edge.Cuts" user) (48 "B.Fab" user) (49 "F.Fab" user))');lines.push('  (setup (pad_to_mask_clearance 0))');lines.push('  (net 0 "")');netNames.forEach(net=>lines.push(`  (net ${netMap.get(net)} ${q(net)})`));
 const edge=([x1,y1,x2,y2])=>`  (gr_line (start ${n(x1)} ${n(y1)}) (end ${n(x2)} ${n(y2)}) (stroke (width 0.05) (type default)) (layer "Edge.Cuts") (tstamp ${uuid()}))`;
 [[0,0,b.width,0],[b.width,0,b.width,b.height],[b.width,b.height,0,b.height],[0,b.height,0,0]].forEach(v=>lines.push(edge(v)));
 for(const p of b.parts){let def=COMPONENTS[p.type];lines.push(`  (footprint ${q(def.footprint)} (layer "F.Cu") (tstamp ${uuid()}) (at ${n(p.x)} ${n(p.y)} ${n(p.angle)})`);
 lines.push(`    (attr ${p.type==='HOLE_M3'?'board_only exclude_from_pos_files exclude_from_bom':['HEADER2','HEADER3'].includes(p.type)?'through_hole':'smd'})`);
 lines.push(`    (fp_text reference ${q(p.ref)} (at 0 ${n(-Math.max(3,def.body[1]/2+2))}) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))`);
 lines.push(`    (fp_text value ${q(p.value)} (at 0 ${n(Math.max(3,def.body[1]/2+2))}) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15))))`);
 if(p.type==='HOLE_M3'){lines.push(`    (pad "" np_thru_hole circle (at 0 0) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask"))`);}else{
 lines.push(`    (fp_rect (start ${n(-def.body[0]/2)} ${n(-def.body[1]/2)}) (end ${n(def.body[0]/2)} ${n(def.body[1]/2)}) (stroke (width 0.12) (type default)) (fill none) (layer "F.Fab"))`);
 for(let pd of def.pads){let [pin,x,y,w,h,th]=pd,net=p.nets[pin]||'',netInfo=netMap.get(net);let padInfo=`    (pad ${q(pin)} ${th?'thru_hole':'smd'} ${th?'circle':'rect'} (at ${n(x)} ${n(y)}) (size ${n(w)} ${n(h)}) ${th?'(drill 1) ':''}(layers ${th?'"*.Cu" "*.Mask"':'"F.Cu" "F.Paste" "F.Mask"'})${netInfo?` (net ${netInfo} ${q(net)})`:''})`;lines.push(padInfo);}
 }
 lines.push('  )');}
 for(let t of b.tracks)for(let i=1;i<t.points.length;i++){let a=t.points[i-1],c=t.points[i];lines.push(`  (segment (start ${n(a.x)} ${n(a.y)}) (end ${n(c.x)} ${n(c.y)}) (width ${n(t.width)}) (layer ${q(t.layer)}) (net ${netMap.get(t.net)||0}) (tstamp ${uuid()}))`);}
 for(let v of b.vias)lines.push(`  (via (at ${n(v.x)} ${n(v.y)}) (size ${n(v.diameter)}) (drill ${n(v.drill)}) (layers "F.Cu" "B.Cu") (net ${netMap.get(v.net)||0}) (tstamp ${uuid()}))`);
 lines.push(')');return lines.join('\n');}
// UUID is only an object identifier, not a security secret.
function uuid(){let x='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';return x.replace(/[xy]/g,c=>{let r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3|8)).toString(16)});}
function routedExample(){let b=getTemplate('led');b.tracks=[
 {id:'t1',net:'VIN_5V',layer:'F.Cu',width:.45,points:[{x:11,y:24.46},{x:27.15,y:24.46}]},
 {id:'t2',net:'VCC_PROTECTED',layer:'F.Cu',width:.45,points:[{x:30.85,y:24.46},{x:38,y:24.46},{x:43.85,y:34}]},
 {id:'t3',net:'VCC_PROTECTED',layer:'F.Cu',width:.4,points:[{x:43.85,y:34},{x:48,y:30},{x:52.85,y:16}]},
 {id:'t4',net:'LED_A',layer:'F.Cu',width:.3,points:[{x:55.15,y:16},{x:68.85,y:16}]},
 {id:'t5',net:'GND',layer:'F.Cu',width:.3,points:[{x:46.15,y:34},{x:47,y:39}]},
 {id:'t6',net:'GND',layer:'F.Cu',width:.3,points:[{x:71.15,y:16},{x:74,y:21}]},
 {id:'t7',net:'GND',layer:'B.Cu',width:.55,points:[{x:11,y:29.54},{x:19,y:43},{x:47,y:39},{x:74,y:21}]}
 ];b.vias=[{id:'v1',x:47,y:39,net:'GND',diameter:.8,drill:.35},{id:'v2',x:74,y:21,net:'GND',diameter:.8,drill:.35}];b.notes.push('Fully routed reference demonstrates top/bottom routing and GND vias. Re-check the board in KiCad before use: DRC in this simplified editor is not fab signoff.');return b;}
return{COMPONENTS,part,base,getTemplate,presets,routedExample,rotated,padsFor,allPads,nets,newPart,check,copperLoss,microstrip,widthForZ,validateImport,csv,toKiCad,pathLength,round,clamp,dist,pointSegment,segmentDistance};
});
