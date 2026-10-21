'use strict';
/** Compact, facts-only KB for the repo: exact mfr|pid couples -> source refs (commit-pinned URLs). No prose.
 *  Output data/kb/couples.json (excluded from the Homey bundle by .homeyignore). Idempotent: same input -> same bytes. */
const fs=require('fs'),path=require('path');
const KB=process.env.KB_DIR||'/workspace/kb';const OUT=process.env.KB_OUT||path.join(__dirname,'../../data/kb/couples.json');
const MAX_BYTES=+process.env.KB_MAX_BYTES||4*1024*1024;
function couplesOf(src,e){const o=[];for(const f of e.fingerprints||[])if(f.mfr&&f.pid)o.push([f.mfr,f.pid]);
 for(const m of e.manufacturerName||[])for(const p of (e.productId&&e.productId.length?e.productId:[]))o.push([m,p]);
 if(src==='ota')for(const m of e.manufacturerName||[])if(e.modelId)o.push([m,e.modelId]);return o;}
function build(kb=KB){const sources={};const couples={};
 for(const src of ['z2m','zhc','zha','deconz','johan','ota']){const f=path.join(kb,'index',src,'entries.json');if(!fs.existsSync(f))continue;const j=JSON.parse(fs.readFileSync(f,'utf8'));
  sources[src]={name:j.cite.source,repo:j.cite.repo,license:j.cite.license,commit:j.cite.commit,date:j.cite.date};
  j.entries.forEach((e,i)=>{for(const [m,p] of couplesOf(src,e)){const k=`${m}|${p}`;const a=(couples[k]=couples[k]||[]);const ref=[src,e.model||e.driver||e.quirk||e.product||null,e.url];if(!a.some(r=>r[0]===src&&r[2]===e.url))a.push(ref);}});}
 const keys=Object.keys(couples).sort();const out={schema:1,sources,couples:Object.fromEntries(keys.map(k=>[k,couples[k].sort((a,b)=>(a[0]+a[2]).localeCompare(b[0]+b[2]))]))};
 return out;}
function write(out,file=OUT){const s=JSON.stringify(out);if(s.length>MAX_BYTES)throw new Error(`kb compact too big: ${s.length}>${MAX_BYTES}`);fs.mkdirSync(path.dirname(file),{recursive:true});
 const prev=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;if(prev===s)return false;fs.writeFileSync(file,s);return true;}
module.exports={build,write,couplesOf};
if(require.main===module){const o=build();console.log('couples',Object.keys(o.couples).length,'changed',write(o));}
