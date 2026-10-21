'use strict';
/** Staged enrichment: KB couples not yet in any driver. Writes data/leads/kb-enrich-candidates.json only (no driver edits).
 *  'confirmed' = >=1 reliable source (zhc/z2m/zha/deconz) with a commit-pinned URL; johan/ota-only = provisional. */
const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'../..');
function ours(root=ROOT){const s=new Set();for(const d of fs.readdirSync(path.join(root,'drivers'))){let z;try{z=JSON.parse(fs.readFileSync(path.join(root,'drivers',d,'driver.compose.json'),'utf8')).zigbee;}catch{continue;}
 if(!z)continue;for(const m of [].concat(z.manufacturerName||[]))for(const p of [].concat(z.productId||[]))s.add(`${m}|${p}`.toLowerCase());}return s;}
function candidates(kb,have){const out={confirmed:[],provisional:[]};
 for(const [k,refs] of Object.entries(kb.couples)){if(have.has(k.toLowerCase()))continue;const [mfr,pid]=k.split('|');if(!/^_T|^TS|^TUYATEC/i.test(mfr+pid))continue;
  const rel=refs.filter(r=>['zhc','z2m','zha','deconz'].includes(r[0]));const e={mfr,pid,model:(rel[0]||refs[0])[1],refs:refs.slice(0,4).map(r=>r[2])};
  (rel.length?out.confirmed:out.provisional).push(e);}return out;}
module.exports={ours,candidates};
if(require.main===module){const kb=JSON.parse(fs.readFileSync(path.join(ROOT,'data/kb/couples.json'),'utf8'));const c=candidates(kb,ours());
 fs.writeFileSync(path.join(ROOT,'data/leads/kb-enrich-candidates.json'),JSON.stringify({generated:'see git',...c},null,0));console.log('confirmed',c.confirmed.length,'provisional',c.provisional.length);}
