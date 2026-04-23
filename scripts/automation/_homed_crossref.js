'use strict';
const https=require('https'),fs=require('fs'),path=require('path');
const U='https://raw.githubusercontent.com/u236/homed-service-zigbee/master/deploy/data/usr/share/homed-zigbee/tuya.json';
const D=path.join(__dirname,'..','..','drivers');
function get(u){return new Promise((r,j)=>{https.get(u,{headers:{'User-Agent':'N'}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r(d));}).on('error',j);})}
async function main(){
const raw=await get(U);const db=JSON.parse(raw).TUYA||[];
const hm=new Map();
for(const d of db)for(const n of(d.modelNames||[]))hm.set(n,(hm.get(n)||[]).concat(d.description));
const ours=new Set();const ourMap=new Map();
for(const dir of fs.readdirSync(D)){
const f=path.join(D,dir,'driver.compose.json');
if(!fs.existsSync(f))continue;
const j=JSON.parse(fs.readFileSync(f,'utf8'));
for(const m of(j.zigbee?.manufacturerName||[])){ours.add(m );ourMap.set(m,dir);}
}
console.log('HOMEd:'+hm.size+' Ours:'+ours.size);
const missing=[];
for(const[k,v]of hm)if(!ours.has(k))missing.push({mfr:k,desc:v[0]});
console.log('Missing:'+missing.length);
missing.forEach(m=>console.log(m.mfr+' -> '+m.desc));
}
main().catch(e=>console.error(e));
