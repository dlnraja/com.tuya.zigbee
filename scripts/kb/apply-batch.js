'use strict';
/** Apply one batch of KB-assigned couples (additive): mfr appended to driver.compose.json + app.json of the target driver,
 *  pid appended if missing. Skips a couple if adding the mfr would create a dual couple with any pid of the target driver.
 *  Usage: node scripts/kb/apply-batch.js <batchIndex> [size=30]  -> writes data/leads/kb-batch-<i>.json report. */
const fs=require('fs'),path=require('path');const {driverMap,batches}=require('./assign-drivers');const ROOT=path.join(__dirname,'../..');
function plan(list,dm,composeOf){const ok=[],skip=[];const added=new Map();
 for(const c of list){const z=composeOf(c.driver);if(!z){skip.push({...c,why:'no compose'});continue;}const pids=new Set([...[].concat(z.productId||[]).map(p=>String(p).toUpperCase()),c.pid.toUpperCase()]);
  const clash=[...pids].map(p=>[p,[...(dm.byCouple.get(`${c.mfr}|${p}`.toLowerCase())||[])].filter(d=>d!==c.driver)]).filter(x=>x[1].length);
  if(clash.length){skip.push({...c,why:'dual couple: '+clash.map(x=>x[0]+'@'+x[1].join('/')).join(',')});continue;}
  if((added.get(c.mfr.toLowerCase())||c.driver)!==c.driver){skip.push({...c,why:'same mfr assigned to two drivers in batch'});continue;}added.set(c.mfr.toLowerCase(),c.driver);ok.push(c);}
 return {ok,skip};}
function apply(ok,root=ROOT){const appF=path.join(root,'app.json');const app=JSON.parse(fs.readFileSync(appF,'utf8'));
 for(const c of ok){const f=path.join(root,'drivers',c.driver,'driver.compose.json');const raw=fs.readFileSync(f,'utf8');const ind=(raw.match(/\n(\s+)"/)||[,'  '])[1];const j=JSON.parse(raw);
  for(const z of [j.zigbee,(app.drivers.find(d=>d.id===c.driver)||{}).zigbee].filter(Boolean)){z.manufacturerName=[].concat(z.manufacturerName||[]);for(const form of [c.mfr,c.mfr.toLowerCase()])if(!z.manufacturerName.includes(form))z.manufacturerName.push(form); // SSOT: both case forms (case-variant completeness test)
   z.productId=[].concat(z.productId||[]);if(!z.productId.some(p=>String(p).toUpperCase()===c.pid.toUpperCase()))z.productId.push(c.pid);}
  fs.writeFileSync(f,JSON.stringify(j,null,ind)+(raw.endsWith('\n')?'\n':''));}
 fs.writeFileSync(appF,JSON.stringify(app));return ok.length;}
module.exports={plan,apply};
if(require.main===module){const i=+process.argv[2]||0,n=+process.argv[3]||30;const a=JSON.parse(fs.readFileSync(path.join(ROOT,'data/leads/kb-assignments.json'),'utf8')).assigned;
 const b=batches(a,n)[i]||[];const dm=driverMap();const before=fs.statSync(path.join(ROOT,'app.json')).size;
 const p=plan(b,dm,d=>{try{return JSON.parse(fs.readFileSync(path.join(ROOT,'drivers',d,'driver.compose.json'),'utf8')).zigbee;}catch{return null;}});apply(p.ok);
 const after=fs.statSync(path.join(ROOT,'app.json')).size;const rep={batch:i,applied:p.ok.map(c=>({mfr:c.mfr,pid:c.pid,driver:c.driver,rule:c.rule,source:c.refs[0]})),skipped:p.skip.map(c=>({mfr:c.mfr,pid:c.pid,driver:c.driver,why:c.why})),appJsonBytes:{before,after,delta:after-before}};
 fs.writeFileSync(path.join(ROOT,`data/leads/kb-batch-${i}.json`),JSON.stringify(rep,null,1));console.log(JSON.stringify({applied:p.ok.length,skipped:p.skip.length,delta:after-before}));}
