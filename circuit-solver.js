/* Small linear DC modified-nodal-analysis solver for isolated training circuits.
   Real KCL/MNA for resistor/ideal source networks, NOT full device SPICE or motherboard solver. */
(function(root,factory){const a=factory();if(typeof module==='object'&&module.exports)module.exports=a;root.TrainerDC=a})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function solve(components,ground='GND'){
 if(!Array.isArray(components)||components.length>250)throw Error('Provide at most 250 modeled components');
 const names=new Set();for(const c of components){if(!['R','V','I'].includes(c.type))throw Error('Unrecognized type '+c.type);if(!c.a||!c.b)throw Error('Every element needs two nodes');if(c.a!==ground)names.add(c.a);if(c.b!==ground)names.add(c.b)}
 const nodes=[...names],n=nodes.length,vs=components.filter(c=>c.type==='V'),k=vs.length,m=n+k;
 if(m>80)throw Error('Trainer solver limited to 80 unknowns');
 const M=Array.from({length:m},()=>Array(m+1).fill(0)),index=t=>t===ground?-1:nodes.indexOf(t);
 const add=(i,j,v)=>{if(i>=0&&j>=0)M[i][j]+=v},rhs=(i,v)=>{if(i>=0)M[i][m]+=v};
 let vIndex=0;
 for(const c of components){const a=index(c.a),b=index(c.b),x=Number(c.value);if(!Number.isFinite(x))throw Error('Non-finite component value');
  if(c.type==='R'){if(x<=0)throw Error('Resistance must be positive');const g=1/x;add(a,a,g);add(b,b,g);add(a,b,-g);add(b,a,-g)}
  if(c.type==='I'){rhs(a,-x);rhs(b,x)}
  if(c.type==='V'){const row=n+vIndex++;add(a,row,1);add(b,row,-1);add(row,a,1);add(row,b,-1);rhs(row,x)}
 }
 for(let i=0;i<m;i++){let pivot=i;for(let j=i+1;j<m;j++)if(Math.abs(M[j][i])>Math.abs(M[pivot][i]))pivot=j;if(Math.abs(M[pivot][i])<1e-12)throw Error('Floating, open or contradictory circuit; reference at least one node to GND');if(pivot!==i)[M[i],M[pivot]]=[M[pivot],M[i]];const factor=M[i][i];for(let j=i;j<=m;j++)M[i][j]/=factor;for(let row=0;row<m;row++){if(row===i)continue;const q=M[row][i];if(!q)continue;for(let col=i;col<=m;col++)M[row][col]-=q*M[i][col]}}
 const potential={[ground]:0};nodes.forEach((x,i)=>potential[x]=M[i][m]);vIndex=0;
 const branches=components.map(c=>{const volts=potential[c.a]-potential[c.b];const amps=c.type==='R'?volts/c.value:c.type==='I'?c.value:M[n+vIndex++][m];return{id:c.id||c.type,from:c.a,to:c.b,voltage:volts,current:amps,power:volts*amps}});
 return{nodes:potential,branches,KCL:'Computed by modified nodal analysis; zero sum of currents at each node.'};
}
function divider(V=12,R1=1000,R2=1000,parallel=false){const parts=[{type:'V',id:'V_SRC',a:'VIN',b:'GND',value:V},{type:'R',id:'R1',a:'VIN',b:parallel?'GND':'VOUT',value:R1},{type:'R',id:'R2',a:parallel?'VIN':'VOUT',b:'GND',value:R2}];const out=solve(parts);return{...out,topology:parallel?'parallel':'divider',output:parallel?out.nodes.VIN:out.nodes.VOUT,components:parts}}
return{solve,divider};
});
