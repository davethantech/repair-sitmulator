"use strict";
const assert=require("node:assert/strict");
const M=require("../simulation/mna-core.js"),S=require("../simulation/export-spice.js");
for(const [id,fixture] of Object.entries(M.EXAMPLES)){
const deck=S.build(fixture,{analysis:id==="rc"?"tran":"op"});
assert.ok(deck.startsWith("* BOARD//LAB"));
assert.ok(deck.endsWith(".end\n"));
assert.match(deck,/\.print (op|tran)/);
assert.ok(!deck.includes("undefined"));
if(id==="rc")assert.match(deck,/\.tran/);
if(id==="nmos")assert.match(deck,/\.model MOS_Q1 NMOS/);
if(id==="diode")assert.match(deck,/\.model DM_D1 D/);
}
assert.throws(()=>S.build(M.EXAMPLES.divider,{analysis:"exploit"}),/Analysis must/);
assert.throws(()=>S.build(M.EXAMPLES.rc,{analysis:"tran",stepS:-1}),/Invalid simulation/);
const evil=JSON.parse(JSON.stringify(M.EXAMPLES.divider));evil.components[0].p="IN\n.control\n.shell";
assert.throws(()=>S.build(evil),/Invalid net identifier/);
const c=JSON.parse(JSON.stringify(M.EXAMPLES.divider));c.title="Safe example\n.fake";
assert.ok(S.build(c).includes("BOARD//LAB 6"));
console.log("PASS v6: safe compact SPICE export, device models, transient deck and netlist injection rejection");
