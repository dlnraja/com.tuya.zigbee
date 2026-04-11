#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const R=path.join(__dirname,'..');
const z=JSON.parse(fs.readFileSync(path.join(__dirname,'z2m-data.json'),'utf8'));
const E=new Map();
const D=path.join(R,'drivers');
fs.readdirSync(D).filter(d=>fs.statSync(path.join(D,d)).isDirectory()).forEach(drv=>{
const f=path.join(D,drv,'driver.compose.json');
if(!fs.existsSync(f))return;
try{const j=JSON.parse(fs.readFileSync(f,'utf8'));
if(j.zigbee)(j.zigbee.manufacturerName||[]).forEach(m=>E.set(m.toLowerCase(),drv))}catch(e){}});
const miss=[],hit=[];
for(const fp of z.fps)for(const m of fp.f){
if(E.has(m.toLowerCase()))hit.push({m,mid:fp.m,drv:E.get(m.toLowerCase())});
else miss.push({m,mid:fp.m,dp:z.dp[m]?z.dp[m].dps:null})}
const ty=(mid,dp)=>{if(!dp){if(/TS0[0-9]{3}/.test(mid))return mid;return 'unknown'}
const n=dp.map(d=>d.n).join(' ');
if(/cover|position|curtain/.test(n))return'cover';if(/heating_setpoint|thermostat/.test(n))return'thermostat';
if(/state_l\d/.test(n))return'switch_multi';if(/energy|power.*voltage/.test(n))return'plug';
if(/occupancy|presence/.test(n))return'sensor_presence';if(/temperature.*humidity|humidity.*temperature/.test(n))return'sensor_climate';
if(/smoke|gas/.test(n))return'sensor_safety';if(/contact/.test(n))return'sensor_contact';
if(/water_leak/.test(n))return'sensor_water';if(/brightness|color/.test(n))return'light';
if(/action/.test(n))return'button';if(/state/.test(n))return'switch';return'other'};
const byType={};miss.forEach(x=>{const t=ty(x.mid,x.dp);byType[t]=(byType[t]||[]);byType[t].push(x)});
const o={matched:hit.length,missing:miss.length,existingMfrs:E.size,byType:Object.fromEntries(Object.entries(byType).map(([k,v])=>[k,v.length])),missingDetails:miss};
fs.writeFileSync(path.join(__dirname,'cross-ref.json'),JSON.stringify(o,null,2));
console.log('Matched:',hit.length,'Missing:',miss.length);
console.log('By type:',JSON.stringify(o.byType));
