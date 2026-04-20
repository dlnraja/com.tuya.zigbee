#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const cur=JSON.parse(fs.readFileSync(path.join(__dirname,'current-fps.json'),'utf8'));
const z2m=JSON.parse(fs.readFileSync(path.join(__dirname,'z2m-data.json'),'utf8'));
const allMfrs=new Set();
for(const d of Object.values(cur.r))d.m.forEach(x=>allMfrs.add(x.toLowerCase()));
const missing=[];
for(const block of z2m.fps){
const pid=block.m;
for(const mfr of block.f){
if(!allMfrs.has(mfr.toLowerCase())){
missing.push({mfr,pid});
}}}
const byPid={};
missing.forEach(x=>{if(!byPid[x.pid])byPid[x.pid]=[];byPid[x.pid].push(x.mfr)});
console.log('Missing from Z2M:',missing.length);
for(const [pid,mfrs] of Object.entries(byPid).sort((a,b)=>a[0].localeCompare(b[0]))){
console.log(`  ${pid}: ${mfrs.join(', ')}`);}
fs.writeFileSync(path.join(__dirname,'z2m-missing.json'),JSON.stringify({total:missing.length,byPid},null,2));
