#!/usr/bin/env node
'use strict';
const https=require('https'),fs=require('fs'),path=require('path');
const U='https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
function get(u){return new Promise((ok,no)=>{https.get(u,{headers:{'User-Agent':'S'},timeout:60000},r=>{if(r.statusCode!==200)return no(Error('HTTP '+r.statusCode));let d='';r.on('data',c=>d+=c);r.on('end',()=>ok(d));r.on('error',no)}).on('error',no)})}
async function main(){
const s=await get(U);console.log('Got '+s.length);
const d=[],dp={};
const r=/fingerprint\s*\(\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\)/g;
let m;while((m=r.exec(s))!==null){
const ms=[...m[2].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
if(ms.length)d.push({m:m[1],f:ms})}
const r2=/tuyaDatapoints:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*\}/g;
while((m=r2.exec(s))!==null){
const ps=[...m[1].matchAll(/\[\s*(\d+)\s*,\s*"([^"]+)"/g)].map(x=>({d:+x[1],n:x[2]}));
if(!ps.length)continue;
const b=s.substring(Math.max(0,m.index-4000),m.index);
const fp=[...b.matchAll(/fingerprint\s*\(\s*"([^"]+)"\s*,\s*\[([\s\S]*?)\]\s*\)/g)];
if(fp.length){const l=fp[fp.length-1];
[...l[2].matchAll(/"([^"]+)"/g)].map(x=>x[1]).forEach(f=>{dp[f]={model:l[1],dps:ps}})}}
const o={date:new Date().toISOString(),fps:d,dp:dp,
stats:{devBlocks:d.length,mfrs:d.reduce((a,x)=>a+x.f.length,0),dpProfiles:Object.keys(dp).length}};
fs.writeFileSync(path.join(__dirname,'z2m-data.json'),JSON.stringify(o,null,2));
console.log(JSON.stringify(o.stats))}
main().catch(e=>{console.error(e);process.exit(1)});
