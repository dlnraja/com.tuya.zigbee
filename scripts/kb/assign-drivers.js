'use strict';
/** Assign KB-confirmed couples to a target driver without guessing:
 *  rule A (sibling): other manufacturerNames of the SAME upstream definition (same source URL) with the same pid all live in exactly one of our drivers -> that driver.
 *  rule B (pid-unique): pid is not TS0601 and every one of our drivers listing that pid is a single driver -> that driver.
 *  Anything else stays unassigned (provisional tier). Output is deterministic. */
const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'../..');
function driverMap(root=ROOT){const byCouple=new Map(),byPid=new Map();for(const d of fs.readdirSync(path.join(root,'drivers')).sort()){let z;try{z=JSON.parse(fs.readFileSync(path.join(root,'drivers',d,'driver.compose.json'),'utf8')).zigbee;}catch{continue;}if(!z)continue;
 for(const p0 of [].concat(z.productId||[])){const p=String(p0).toUpperCase();(byPid.get(p)||byPid.set(p,new Set()).get(p)).add(d);for(const m of [].concat(z.manufacturerName||[])){const k=`${m}|${p}`.toLowerCase();(byCouple.get(k)||byCouple.set(k,new Set()).get(k)).add(d);}}}return {byCouple,byPid};}
function assign(kb,cands,dm){const byUrl=new Map();for(const [k,refs] of Object.entries(kb.couples))for(const r of refs)(byUrl.get(r[2])||byUrl.set(r[2],[]).get(r[2])).push(k);
 const GENERIC=/^(universal_zigbee|device_generic|generic_|zigbee_universal)/;const OKM=/^(_T[A-Z0-9]{2,5}_[A-Za-z0-9]{8}|_TYZB0[12]_[A-Za-z0-9]{8}|TUYATEC-[A-Za-z0-9]{8})$/,OKP=/^TS[0-9]{3}[0-9A-F][A-Z]?$/;
 const out=[],un=[];for(const c of cands){if(!OKM.test(c.mfr)||!OKP.test(c.pid)){un.push({...c,why:'malformed ids (parser noise)'});continue;}const pid=c.pid.toUpperCase();const sib=new Set();
  for(const u of c.refs)for(const k of byUrl.get(u)||[]){const [m,p]=k.split('|');if(p.toUpperCase()!==pid||m===c.mfr)continue;for(const d of dm.byCouple.get(k.toLowerCase())||[])if(!GENERIC.test(d))sib.add(d);}
  if(sib.size===1){out.push({...c,driver:[...sib][0],rule:'sibling'});continue;}
  const pd=dm.byPid.get(pid);if(pid!=='TS0601'&&pd&&pd.size===1&&!sib.size){out.push({...c,driver:[...pd][0],rule:'pid-unique'});continue;}
  un.push({...c,why:sib.size>1?'siblings in several drivers: '+[...sib].join(','):'no sibling in our drivers'});}
 return {assigned:out.sort((a,b)=>(a.driver+a.mfr).localeCompare(b.driver+b.mfr)),unassigned:un};}
function batches(list,n=30){const o=[];for(let i=0;i<list.length;i+=n)o.push(list.slice(i,i+n));return o;}
module.exports={driverMap,assign,batches};
if(require.main===module){const kb=JSON.parse(fs.readFileSync(path.join(ROOT,'data/kb/couples.json'),'utf8'));const c=JSON.parse(fs.readFileSync(path.join(ROOT,'data/leads/kb-enrich-candidates.json'),'utf8'));
 const r=assign(kb,c.confirmed,driverMap());fs.writeFileSync(path.join(ROOT,'data/leads/kb-assignments.json'),JSON.stringify(r,null,1));
 const t={};r.assigned.forEach(a=>t[a.rule]=(t[a.rule]||0)+1);console.log('assigned',r.assigned.length,t,'unassigned',r.unassigned.length);}
