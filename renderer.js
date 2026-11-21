/* Small dependency-free WebGL 3D engine for the offline training board. Real geometry + depth picking. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const C={board:[.035,.23,.235],edge:[.045,.42,.43],metal:[.65,.73,.79],gold:[.94,.68,.29],chip:[.105,.14,.19],dark:[.12,.17,.22],green:[.05,.4,.36],ram:[.12,.45,.36],blue:[.11,.53,.72],red:[.72,.33,.29],battery:[.13,.17,.22]};
function box(x,y,z,w,h,d){let v=[],n=[];
 const f=[[[1,0,0],[x+w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x+w/2,y+h/2,z+d/2],[x+w/2,y-h/2,z+d/2]],
 [[-1,0,0],[x-w/2,y-h/2,z+d/2],[x-w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z-d/2],[x-w/2,y-h/2,z-d/2]],
 [[0,1,0],[x-w/2,y+h/2,z-d/2],[x-w/2,y+h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x+w/2,y+h/2,z-d/2]],
 [[0,-1,0],[x-w/2,y-h/2,z+d/2],[x-w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z+d/2]],
 [[0,0,1],[x+w/2,y-h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z+d/2],[x-w/2,y-h/2,z+d/2]],
 [[0,0,-1],[x-w/2,y-h/2,z-d/2],[x-w/2,y+h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x+w/2,y-h/2,z-d/2]]];
 for(const f0 of f){const nn=f0[0],p=f0.slice(1);for(const i of [0,1,2,0,2,3]){v.push(...p[i]);n.push(...nn)}}return {v:new Float32Array(v),n:new Float32Array(n)};
}
function cyl(x,y,z,r,h,sides=16){const v=[],n=[];for(let i=0;i<sides;i++){let a=i*TAU/sides,b=(i+1)*TAU/sides;const p=[x+r*Math.cos(a),z+r*Math.sin(a)],q=[x+r*Math.cos(b),z+r*Math.sin(b)];let tri=[[p[0],y+h/2,p[1]],[p[0],y-h/2,p[1]],[q[0],y-h/2,q[1]],[p[0],y+h/2,p[1]],[q[0],y-h/2,q[1]],[q[0],y+h/2,q[1]]];for(let k=0;k<6;k++){v.push(...tri[k]);const ang=k===0||k===1||k===3?a:b;n.push(Math.cos(ang),0,Math.sin(ang))}
 for(let top of [true,false]){const yy=y+(top?1:-1)*h/2,seq=top?[a,b]:[b,a];for(const ang of [0,...seq]){v.push(ang===0?x:x+r*Math.cos(ang),yy,ang===0?z:z+r*Math.sin(ang));n.push(0,top?1:-1,0)}}
 }return {v:new Float32Array(v),n:new Float32Array(n)};
}
function matMul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let x=0;for(let k=0;k<4;k++)x+=a[k*4+r]*b[c*4+k];o[c*4+r]=x}return o}
function perspective(fov,aspect,near,far){let f=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=2*far*near/(near-far);return o}
function lookAt(eye,target,up){let z=[eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]],len=Math.hypot(...z);z=z.map(a=>a/len);let x=[up[1]*z[2]-up[2]*z[1],up[2]*z[0]-up[0]*z[2],up[0]*z[1]-up[1]*z[0]];len=Math.hypot(...x);x=x.map(a=>a/len);let y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];let o=new Float32Array(16);o[0]=x[0];o[1]=y[0];o[2]=z[0];o[4]=x[1];o[5]=y[1];o[6]=z[1];o[8]=x[2];o[9]=y[2];o[10]=z[2];o[12]=-x.reduce((s,v,i)=>s+v*eye[i],0);o[13]=-y.reduce((s,v,i)=>s+v*eye[i],0);o[14]=-z.reduce((s,v,i)=>s+v*eye[i],0);o[15]=1;return o}
function rot(yaw,pitch){let c=Math.cos(yaw),s=Math.sin(yaw),a=Math.cos(pitch),b=Math.sin(pitch);return new Float32Array([c,s*b,-s*a,0,0,a,b,0,s,-c*b,c*a,0,0,0,0,1])}
function move(x,y,z){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1])}
function shader(gl,type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function program(gl,v,f){let p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
const VSH=`attribute vec3 aP;attribute vec3 aN;uniform mat4 uMVP;uniform mat4 uM;varying vec3 vN;varying vec3 vP;void main(){vN=mat3(uM)*aN;vP=(uM*vec4(aP,1.)).xyz;gl_Position=uMVP*vec4(aP,1.);}`;
const FSH=`precision mediump float;varying vec3 vN;varying vec3 vP;uniform vec3 uColor;uniform float uGlow;void main(){vec3 n=normalize(vN);float d=max(dot(n,normalize(vec3(.32,1.,.6))),0.);float soft=.38+.62*d;float rim=pow(1.-max(dot(n,normalize(vec3(.1,.8,1.))),0.),2.);vec3 color=uColor*soft+vec3(.07,.19,.22)*rim+vec3(.02,.32,.38)*uGlow;gl_FragColor=vec4(color,1.);}`;
const PFSH=`precision mediump float;uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor,1.);}`;
class Renderer{
 constructor(canvas,onPick){this.canvas=canvas;this.onPick=onPick;this.meshes=[];this.refMap={};this.pitch=-.09;this.yaw=-.3;this.zoom=11.5;this.drag=null;this.disassembly=false;this.exploded=false;this.removed=new Set();this.removedScrews=new Set();this.screwCount=6;this.highlight=null;
  this.gl=canvas.getContext('webgl',{antialias:true,preserveDrawingBuffer:true});if(!this.gl){this.ctx=canvas.getContext('2d');this.hitTriangles=[];this.makeBoard();this.bind();this.resize();this.render();return}
  const gl=this.gl;this.p=program(gl,VSH,FSH);this.pk=program(gl,VSH,PFSH);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.025,.055,.075,1);
  this.makeBoard();this.bind();this.resize();this.render();
 }
 add(key,group,shape,color,options={}){const gl=this.gl,g=shape;let v,n;if(gl){v=gl.createBuffer();n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,v);gl.bufferData(gl.ARRAY_BUFFER,g.v,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,g.n,gl.STATIC_DRAW)}const mesh={key,group,v,n,vertices:gl?null:g.v,normals:gl?null:g.n,count:g.v.length/3,color,glow:options.glow||0,selectable:options.selectable!==false,id:this.meshes.length+1};this.meshes.push(mesh);if(key&&!this.refMap[key])this.refMap[key]=[];if(key)this.refMap[key].push(mesh);return mesh}
 addBox(k,g,x,y,z,w,h,d,color,opts={}){return this.add(k,g,box(x,y,z,w,h,d),color,opts)}
 addCyl(k,g,x,y,z,r,h,color,opts={}){return this.add(k,g,cyl(x,y,z,r,h),color,opts)}
 makeBoard(){let b=(k,g,x,y,z,w,h,d,c,o)=>this.addBox(k,g,x,y,z,w,h,d,c,o),cy=(k,g,x,y,z,r,h,c,o)=>this.addCyl(k,g,x,y,z,r,h,c,o);
 // Fictional training board, physically modelled geometry: board and gold mounting holes.
 b('PCB','board',0,0,0,10.7,.14,6.6,C.board);b('PCB','board',0,.08,-3.22,10.55,.02,.05,C.edge);
 for(let x of [-4.7,4.7])for(let z of [-2.75,2.75]){cy('PCB','board',x,.14,z,.2,.035,C.gold);cy('PCB','board',x,.16,z,.112,.038,C.dark)}
 // Network traces: thin, visibly raised copper strands.
 let traces=[[-4.3,-2.0,-3.52,-2.0],[-3.24,-2.0,-2.47,-2.0],[-2.12,-2.0,-1.6,-2.0],[-1.6,-2.0,-1.3,-1.35],[-1.3,-1.35,-.6,-.92],[-.6,-.92,.7,-.75],[-.6,-.92,-.7,.15],[.7,-.75,2.7,-1.5],[.6,.3,2.3,.8],[1.1,.6,2.5,1.8],[-1.1,-1.9,-1.1,2.4],[-1.4,2.2,1.6,2.2]];
 for(let [x1,z1,x2,z2] of traces){let steps=20;for(let j=0;j<steps;j++){let xx=x1+(x2-x1)*(j+.5)/steps,zz=z1+(z2-z1)*(j+.5)/steps;let w=Math.hypot(x2-x1,z2-z1)/steps;b(null,'board',xx,.083,zz,w<.005?.006: .045,.009,.035,[.09,.48,.48],{selectable:false})}}
 // Small component field - deterministic layout, no randomness.
 for(let i=0;i<75;i++){let x=-4.9+(i*2.71%9.7),z=-2.85+(i*1.37%5.7);if((x>-.85&&x<2.5&&z>-.7&&z<1.8)||(x<-2&&z<-1.3)||(x>2.2&&z>1.1))continue;b(null,'board',x,.145,z,i%3===0?.27:.12,.09,i%4===0?.18:.13,i%5===0?C.metal:C.chip,{selectable:false})}
 // DC power path: input jack, fuse, FET and charger IC.
 b('J_DC','board',-4.85,.29,-1.91,.64,.38,.65,C.metal);b('J_DC','board',-4.9,.49,-1.9,.43,.1,.4,C.dark);
 b('F1','board',-3.56,.22,-1.96,.52,.19,.27,C.metal);b('F1','board',-3.56,.326,-1.96,.38,.015,.18,C.gold);
 b('Q1','board',-2.58,.25,-1.93,.58,.25,.53,C.chip);
 for(let j=-1;j<=1;j++){b('Q1','board',-2.58+j*.16,.15,-1.62,.09,.065,.16,C.metal);b('Q1','board',-2.58+j*.16,.15,-2.24,.09,.065,.16,C.metal)}
 b('U3','board',-1.35,.27,-1.93,.82,.27,.7,C.chip);for(let j=-2;j<=2;j++)for(let side of [-1,1])b('U3','board',-1.35+j*.13,.14,-1.93+side*.43,.075,.07,.19,C.metal);
 for(let k of [0,1,2]){b('L'+(k+1),'board',-1.4+k*.55,.29,-.98,.36,.28,.37,C.metal)}
 b('U_PD','board',-4.12,.25,.24,.58,.23,.58,C.chip);b('C24','board',-.22,.20,-1.55,.22,.16,.36,C.metal);
 // CPU, GPU, memory and VRM thermal clusters.
 b('CPU','board',.15,.30,.32,1.45,.24,1.45,C.gold);b('CPU','board',.15,.45,.32,1.17,.08,1.17,[.13,.28,.35]);
 b('GPU','board',2.29,.3,.46,1.25,.24,1.27,C.gold);b('GPU','board',2.29,.45,.46,.99,.08,1.0,[.14,.22,.29]);
 b('U_VRM','board',-1.15,.26,.63,.64,.3,.65,C.chip);for(let x of [-1.73,-1.27,-.81])b('U_VRM','board',x,.31,1.38,.35,.3,.38,C.metal);
 b('U_EC','board',2.58,.26,-1.75,.75,.23,.7,C.chip);b('U_BIOS','board',3.65,.23,-1.75,.47,.2,.37,C.chip);
 for(let i=0;i<8;i++){b('RAM','ram',-.6+i*.26,.32,2.38,.13,.18,.58,C.chip);b('RAM','ram',-1.8,.24,2.38,.26,.17,.62,C.metal)}
 b('RAM','ram',-.9,.21,2.35,2.8,.13,.83,C.ram);b('RAM','ram',-.9,.32,2.38,2.55,.015,.58,[.16,.52,.40]);
 for(let i=0;i<5;i++)b('RAM','ram',-1.94+i*.42,.335,2.37,.25,.05,.42,C.chip);
 b('SSD','ssd',2.7,.25,2.35,3.0,.13,.76,[.11,.37,.39]);b('SSD','ssd',3.3,.39,2.35,.76,.18,.54,C.chip);b('SSD','ssd',2.3,.39,2.35,.65,.18,.54,C.chip);cy('SSD','ssd',4.06,.34,2.35,.12,.05,C.gold);
 // Battery pack, two fans, cooling path, flex cable.
 b('BATTERY','battery',-3.74,.32,.39,2.03,.43,2.12,C.battery);for(let i=0;i<3;i++)b('BATTERY','battery',-4.32+i*.55,.55,.39,.45,.02,1.73,[.19,.27,.34]);
 for(let x of [-3.7,3.75]){cy('FAN','fan',x,.35,1.68,.67,.15,C.dark);cy('FAN','fan',x,.46,1.68,.22,.06,C.metal);for(let i=0;i<9;i++){let angle=i*TAU/9;cy('FAN','fan',x+Math.cos(angle)*.40,.46,1.68+Math.sin(angle)*.40,.17,.035,C.metal)}}
 b('HEATSINK','heatsink',.18,.65,.44,1.55,.16,1.65,C.metal);b('HEATSINK','heatsink',2.29,.65,.44,1.36,.16,1.48,C.metal);b('HEATSINK','heatsink',1.23,.7,.48,.69,.10,.17,C.gold);
 for(let i=0;i<12;i++)b('HEATSINK','heatsink',.0+i*.19,.76,.36,.055,.10,1.17,[.38,.48,.52]);
 b('J_EDP','cable',-3.48,.2,-.62,1.1,.06,.2,C.gold);
 // Interactive voltage pads, colored gold discs. Selected via exact picking IDs.
 const pads=[['GND',-4.75,2.55],['JACK',-4.32,-1.15],['FUSE_OUT',-3.12,-1.28],['SYS',-2.14,-1.25],['V3',-.72,-1.43],['V5',-.68,-.6],['EC_EN',2.22,-2.47],['CPU_EN',1.2,-1.1],['VCORE',.79,-.2],['DISPLAY',-3.51,-.8],['USB_CC',-4.23,.85]];
 for(let [name,x,z]of pads){cy('TP_'+name,'board',x,.22,z,.14,.05,C.gold);cy('TP_'+name,'board',x,.254,z,.062,.014,[.13,.25,.23]);}
 // Advanced training-board components and accessible test points.
 const extras=[['U_CHG',-3.25,-.95,'CHG_EN'],['J_USBC',-5.03,.20,'USB_CC'],['U5',-1.25,-.15,'V5'],['C51',-.25,-.2,'V5'],['C_SYS',-2.24,-2.70,'SYS'],['U_PGOOD',.45,-2.35,'PGOOD'],['C_RTC',2.94,-2.52,'RTC_3V'],['X1',3.65,-2.52,'CLK_32K'],['U_RESET',2.90,-.80,'PLT_RST'],['U_ECRST',3.65,-.92,'EC_RST'],['U_MEM',.20,1.65,'VDDQ'],['U_SSD',3.46,1.60,'SSD_3V'],['J_M2',4.22,2.35,'SSD_LINK'],['U_GPU',1.93,-.88,'GPU_CORE'],['U_BL',-3.57,-.12,'BACKLIGHT'],['J_KBD',-2.30,1.34,'KBD_SCAN'],['U_USB',-4.65,-.10,'USB_5V'],['U_AUDIO',-4.50,1.34,'AUDIO_3V'],['U_SPI',4.20,-1.72,'BIOS_CS'],['R_SENSE',.80,1.30,'VCORE'],['C_COR',-.15,-2.57,'V3']];
 for(const [id,x,z,net] of extras){b(id,'board',x,.205,z,.32,.14,.29,C.chip);b(id,'board',x,.278,z,.15,.009,.11,id.startsWith('C')?C.metal:C.gold,{selectable:false});for(let k of [-1,1])b(id,'board',x+k*.19,.13,z,.07,.05,.10,C.metal,{selectable:false})}
 const extraPads=[['PGOOD',.55,-2.65],['VDDQ',-.12,1.84],['V1_8',.75,1.92],['RTC_3V',3.05,-2.84],['CLK_32K',4.12,-2.63],['PLT_RST',2.85,-.30],['SSD_3V',3.62,1.07],['SSD_LINK',4.2,1.70],['FAN_TACH',-2.95,1.79],['GPU_CORE',2.83,-.70],['BACKLIGHT',-3.23,-.45],['CHG_EN',-3.12,-.61],['VBAT',-4.05,.85],['KBD_SCAN',-2.02,1.14],['USB_5V',-4.12,-.45],['AUDIO_3V',-4.31,1.04],['EC_RST',3.78,-.55],['BIOS_CS',4.26,-1.38],['PD_VBUS',-4.84,.62],['USB_PD_MSG',-4.52,.55]];
 for(const [name,x,z] of extraPads){cy('TP_'+name,'board',x,.22,z,.095,.045,C.gold);cy('TP_'+name,'board',x,.248,z,.038,.009,C.dark)}
 // Reverse-side passive footprints and solder features are visible when the PCB is flipped.
 for(let i=0;i<58;i++){const x=-4.4+(i*1.687%8.8),z=-2.35+(i*1.249%4.7);b(null,'board',x,-.122,z,.12,.028,i%4===0?.23:.1,i%3?C.metal:C.chip,{selectable:false});if(i%3===0)cy(null,'board',x+.19,-.1,z,.04,.014,C.gold,{selectable:false})}
 // 6 removable screws and top cover for disassembly module only.
 b('COVER','cover',0,1.1,0,11.3,.20,7.12,[.23,.29,.35]);for(let i=0;i<13;i++)b('COVER','cover',-4.5+i*.68,1.212,-1.8,.28,.008,.035,[.06,.12,.18]);
 const pts=[[-5.0,-3.10],[5,-3.1],[-5,3.1],[5,3.1],[0,-3.1],[0,3.1]];
 pts.forEach(([x,z],i)=>{cy('SCREW_'+i,'screw',x,1.26,z,.19,.12,C.metal);b('SCREW_'+i,'screw',x,1.33,z,.19,.012,.04,C.dark)});
 }
 bind(){let c=this.canvas; c.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,moved:false};c.setPointerCapture(e.pointerId)});c.addEventListener('pointermove',e=>{if(!this.drag)return;let dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.abs(dx)+Math.abs(dy)>3)this.drag.moved=true;if(this.drag.moved){this.yaw+=dx*.007;this.pitch=Math.max(-1.35,Math.min(.65,this.pitch+dy*.006));this.drag.x=e.clientX;this.drag.y=e.clientY;this.render()}});c.addEventListener('pointerup',e=>{if(this.drag&&!this.drag.moved)this.pick(e);this.drag=null});c.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(8,Math.min(23,this.zoom+e.deltaY*.013));this.render()},{passive:false});window.addEventListener('resize',()=>this.resize())}
 resize(){let b=this.canvas.getBoundingClientRect(),w=Math.max(1,Math.round(b.width*devicePixelRatio)),h=Math.max(1,Math.round(b.height*devicePixelRatio));if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}if(this.gl)this.gl.viewport(0,0,w,h);this.render()}
 visible(mesh){if(!this.disassembly&&['cover','screw'].includes(mesh.group))return false;if(mesh.group==='screw'){const i=Number(mesh.key.slice(6));return this.disassembly&&!this.removedScrews.has(i)&&!this.removed.has('cover')}
 if(mesh.group==='cover')return this.disassembly&&!this.removed.has('cover');
 if(this.disassembly&&this.removed.has(mesh.group))return false;
 return true}
 groupMatrix(group){let y=0;if(this.exploded){let offsets={battery:1.9,ssd:1.3,ram:.85,fan:2.45,heatsink:2.1,cable:1.3,cover:3.5,screw:3.7,board:0};y=offsets[group]||0}return move(0,y,0)}
 matrices(){let ratio=this.canvas.width/Math.max(1,this.canvas.height),pr=perspective(Math.PI/4,ratio,.1,80),cam=lookAt([0,this.zoom*.85,this.zoom*.85],[0,.13,0],[0,1,0]),rotation=rot(this.yaw,this.pitch);return {view:matMul(pr,cam),rotation}}
 draw(pick=false){const gl=this.gl;if(!gl)return;gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let prog=pick?this.pk:this.p;gl.useProgram(prog);let aP=gl.getAttribLocation(prog,'aP'),aN=gl.getAttribLocation(prog,'aN'),uM=gl.getUniformLocation(prog,'uM'),uMVP=gl.getUniformLocation(prog,'uMVP'),uColor=gl.getUniformLocation(prog,'uColor'),uGlow=pick?null:gl.getUniformLocation(prog,'uGlow'),m=this.matrices();if(aP>=0)gl.enableVertexAttribArray(aP);if(aN>=0)gl.enableVertexAttribArray(aN);
  for(const mesh of this.meshes){if(!this.visible(mesh))continue;const mm=matMul(m.rotation,this.groupMatrix(mesh.group));const mvp=matMul(m.view,mm);gl.uniformMatrix4fv(uM,false,mm);gl.uniformMatrix4fv(uMVP,false,mvp);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.v);if(aP>=0)gl.vertexAttribPointer(aP,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.n);if(aN>=0)gl.vertexAttribPointer(aN,3,gl.FLOAT,false,0,0);
   let col=pick?[mesh.id&255,(mesh.id>>8)&255,(mesh.id>>16)&255].map(x=>x/255):mesh.color;gl.uniform3fv(uColor,col);if(!pick)gl.uniform1f(uGlow,mesh.key&&mesh.key===this.highlight?.22:mesh.glow);gl.drawArrays(gl.TRIANGLES,0,mesh.count)}
 }
 drawSoftware(){
 const ctx=this.ctx;if(!ctx)return;const W=this.canvas.width,H=this.canvas.height;ctx.clearRect(0,0,W,H);
 let g=ctx.createRadialGradient(W*.5,H*.45,30,W*.5,H*.5,Math.max(W,H)*.8);g.addColorStop(0,'#183f4a');g.addColorStop(.55,'#0a2435');g.addColorStop(1,'#061421');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#2c50621b';ctx.lineWidth=1;for(let x=0;x<W;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 const m=this.matrices(),tris=[],proj=(mat,v,i)=>{let x=v[i],y=v[i+1],z=v[i+2],w=mat[3]*x+mat[7]*y+mat[11]*z+mat[15];if(w<=.2)return null;return [(mat[0]*x+mat[4]*y+mat[8]*z+mat[12])/w*W*.5+W*.5,-(mat[1]*x+mat[5]*y+mat[9]*z+mat[13])/w*H*.5+H*.5,(mat[2]*x+mat[6]*y+mat[10]*z+mat[14])/w]};
 for(const mesh of this.meshes){if(!this.visible(mesh))continue;const mm=matMul(m.rotation,this.groupMatrix(mesh.group)),mvp=matMul(m.view,mm),v=mesh.vertices,n=mesh.normals;
  for(let i=0;i<v.length;i+=9){let p0=proj(mvp,v,i),p1=proj(mvp,v,i+3),p2=proj(mvp,v,i+6);if(!p0||!p1||!p2)continue;
   const area=(p1[0]-p0[0])*(p2[1]-p0[1])-(p1[1]-p0[1])*(p2[0]-p0[0]);if(Math.abs(area)<.03)continue;
   let nx=n[i],ny=n[i+1],nz=n[i+2],nl=Math.max(.25,.34+Math.max(0,nx*.38+ny*.82+nz*.40)*.65);let color=mesh.color.map(c=>Math.min(255,Math.max(0,Math.round((c*nl+(mesh.key===this.highlight?.19:0))*255))));
   tris.push({p:[p0,p1,p2],d:(p0[2]+p1[2]+p2[2])/3,col:`rgb(${color.join(',')})`,key:mesh.key,sel:mesh.selectable});
  }
 }
 tris.sort((a,b)=>{const ap=a.key==='PCB'?-1:0,bp=b.key==='PCB'?-1:0;return ap===bp?b.d-a.d:ap-bp});this.hitTriangles=[];
 for(const t of tris){const p=t.p;ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[1][0],p[1][1]);ctx.lineTo(p[2][0],p[2][1]);ctx.closePath();ctx.fillStyle=t.col;ctx.fill();if(t.sel&&t.key)this.hitTriangles.push(t)}
 // Readable test pads and principal component markers projected onto the real 3D model.
 this.tagHits=[];const tags=[['F1',-3.56,.46,-1.96],['Q1',-2.58,.45,-1.93],['U3',-1.35,.56,-1.93],['U_PD',-4.12,.43,.24],['CPU',.15,.65,.32],['GPU',2.29,.66,.46],['U_EC',2.58,.50,-1.75],['U_BIOS',3.65,.48,-1.75],['J_EDP',-3.48,.36,-.62],['V3',-.72,.4,-1.43],['VCORE',.79,.4,-.2]];
 if(!this.disassembly||this.removed.has('cover')){let mat=matMul(m.view,m.rotation);for(let [label,x,y,z] of tags){if(this.disassembly&&this.removed.has(label.toLowerCase()))continue;let pt=proj(mat,new Float32Array([x,y,z]),0);if(!pt)continue;ctx.font=`${Math.max(9,Math.round(W/110))}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillStyle='#051826dd';let tw=ctx.measureText(label).width;this.tagHits.push({key:label==='V3'?'TP_V3':label==='VCORE'?'TP_VCORE':label,x:pt[0],y:pt[1],w:tw/2+8});ctx.fillRect(pt[0]-tw/2-6,pt[1]-24,tw+12,20);ctx.fillStyle='#abf5ec';ctx.fillText(label,pt[0],pt[1]-10)}}
 if(this.disassembly&&!this.removed.has('cover')){const pts=[[-5,-3.1],[5,-3.1],[-5,3.1],[5,3.1],[0,-3.1],[0,3.1]];let mat=matMul(m.view,m.rotation);pts.forEach(([x,z],i)=>{if(this.removedScrews.has(i))return;let pt=proj(mat,new Float32Array([x,1.43,z]),0);if(!pt)return;ctx.fillStyle='#d8f2e7';ctx.beginPath();ctx.arc(pt[0],pt[1],10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#16454c';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(String(i+1),pt[0],pt[1]+4);this.tagHits.push({key:'SCREW_'+i,x:pt[0],y:pt[1]+13,w:13})})}ctx.textAlign='left';ctx.fillStyle='#87c5c4';ctx.font=`${Math.max(10,Math.round(W/130))}px ui-monospace,monospace`;ctx.textAlign='right';ctx.fillText('SOFTWARE 3D / DEPTH-PICKING',W-17,H-18);
 }
 render(){if(!this.gl){this.drawSoftware();return}this.draw(false)}
 pick(e){if(!this.gl){const rect=this.canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*this.canvas.width/rect.width,y=(e.clientY-rect.top)*this.canvas.height/rect.height;let key=null;for(const t of this.tagHits||[]){if(Math.abs(x-t.x)<t.w&&y>t.y-30&&y<t.y+3){this.onPick(t.key);return}}for(let i=this.hitTriangles.length-1;i>=0;i--){const t=this.hitTriangles[i],a=t.p[0],b=t.p[1],c=t.p[2],d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<.00001)continue;let u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;if(u>=0&&v>=0&&u+v<=1){key=t.key;break}}this.onPick(key);return}const gl=this.gl,rect=this.canvas.getBoundingClientRect();this.draw(true);const px=Math.floor((e.clientX-rect.left)*this.canvas.width/rect.width),py=Math.floor((rect.bottom-e.clientY)*this.canvas.height/rect.height);const color=new Uint8Array(4);gl.readPixels(Math.max(0,Math.min(px,this.canvas.width-1)),Math.max(0,Math.min(py,this.canvas.height-1)),1,1,gl.RGBA,gl.UNSIGNED_BYTE,color);const id=color[0]+(color[1]<<8)+(color[2]<<16),mesh=this.meshes[id-1];this.render();if(mesh?.key)this.onPick(mesh.key);else this.onPick(null)}
 setElectrical(voltages){const mapping={F1:'FUSE_OUT',Q1:'SYS',U3:'V3',C24:'V3',U5:'V5',C51:'V5',U_CHG:'CHG_EN',U_EC:'EC_EN',U_VRM:'VCORE',CPU:'VCORE',GPU:'GPU_CORE',U_GPU:'GPU_CORE',U_PGOOD:'PGOOD',U_BIOS:'BIOS_CS',U_PD:'USB_CC',X1:'CLK_32K',U_RESET:'PLT_RST',U_BL:'BACKLIGHT',U_SSD:'SSD_3V',U_MEM:'VDDQ'};for(const mesh of this.meshes){const net=mapping[mesh.key];if(net)mesh.glow=(voltages[net]||0)>0?.12:0}this.render()}
 setMode(isDisassembly){this.disassembly=isDisassembly;this.exploded=false;this.resize()}
 setExploded(t){this.exploded=t;this.render()}
 resetDisassembly(){this.removed=new Set();this.removedScrews=new Set();this.screwCount=6;this.render()}
 restorePart(name){if(name.startsWith('SCREW_')){this.removedScrews.delete(Number(name.slice(6)));this.screwCount=6-this.removedScrews.size;this.render();return}this.removed.delete(name);this.render()}
 removePart(name){if(name.startsWith('SCREW_')){const i=Number(name.slice(6));if(!this.removedScrews.has(i)){this.removedScrews.add(i);this.screwCount=Math.max(0,6-this.removedScrews.size)}this.render();return}this.removed.add(name);this.render()}
}
root.BoardRenderer=Renderer;
})(typeof globalThis!=='undefined'?globalThis:this);
