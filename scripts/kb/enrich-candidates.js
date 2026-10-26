'use strict';
/** Staged enrichment: KB couples not yet in any driver. Writes data/leads/kb-enrich-candidates.json only (no driver edits).
 *  'confirmed' = >=1 reliable source (zhc/z2m/zha/deconz) with a commit-pinned URL; johan/ota-only = provisional. */
const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'../..');
function ours(root=ROOT){const s=new Set();for(const d of fs.readdirSync(path.join(root,'drivers'))){let z;try{z=JSON.parse(fs.readFileSync(path.join(root,'drivers',d,'driver.compose.json'),'utf8')).zigbee;}catch{continue;}
 if(!z)continue;for(const m of [].concat(z.manufacturerName||[]))for(const p of [].concat(z.productId||[]))s.add(`${m}|${p}`.toLowerCase());}return s;}
// P3068: optional reviewed verdicts (data/leads/kb-candidate-verdicts.json). promoted = one reliable source confirms the exact couple;
// demoted = contradicted pid (Johan cross-product). Exact mfr+pid, case-insensitive. Additive: without verdicts the output is unchanged.
function verdictIndex(v){const ix=new Map();for(const kind of ['promoted','demoted'])for(const e of ((v&&v[kind])||[]))if(e&&e.mfr&&e.pid)ix.set(`${e.mfr}|${e.pid}`.toLowerCase(),{kind,e});return ix;}
function candidates(kb,have,verdicts){const out={confirmed:[],provisional:[]};const ix=verdictIndex(verdicts);if(ix.size)out.demoted=[];
 for(const [k,refs] of Object.entries(kb.couples)){if(have.has(k.toLowerCase()))continue;const [mfr,pid]=k.split('|');if(!/^_T|^TS|^TUYATEC/i.test(mfr+pid))continue;
  const rel=refs.filter(r=>['zhc','z2m','zha','deconz'].includes(r[0]));const e={mfr,pid,model:(rel[0]||refs[0])[1],refs:refs.slice(0,4).map(r=>r[2])};
  const v=ix.get(k.toLowerCase());
  if(!rel.length&&v&&v.kind==='promoted'){e.refs=[v.e.url,...e.refs].filter(Boolean).slice(0,4);e.verdict={source:v.e.source,status:v.e.status||'promoted',target:v.e.target};out.confirmed.push(e);continue;}
  if(!rel.length&&v&&v.kind==='demoted'){e.verdict={reason:v.e.reason,upstreamPids:v.e.upstreamPids||[]};out.demoted.push(e);continue;}
  (rel.length?out.confirmed:out.provisional).push(e);}return out;}
function loadVerdicts(root=ROOT){try{return JSON.parse(fs.readFileSync(path.join(root,'data/leads/kb-candidate-verdicts.json'),'utf8'));}catch{return null;}}
module.exports={ours,candidates,loadVerdicts};
if(require.main===module){const kb=JSON.parse(fs.readFileSync(path.join(ROOT,'data/kb/couples.json'),'utf8'));const c=candidates(kb,ours(),loadVerdicts());
 fs.writeFileSync(path.join(ROOT,'data/leads/kb-enrich-candidates.json'),JSON.stringify({generated:'see git',...c},null,0));console.log('confirmed',c.confirmed.length,'provisional',c.provisional.length,'demoted',(c.demoted||[]).length);}
