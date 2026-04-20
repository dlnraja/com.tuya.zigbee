#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..','..'),D=path.join(ROOT,'drivers');
let e=0,w=0;
const err=(f,m)=>{console.log('ERR ['+f+'] '+m);e++;};
const wrn=(f,m)=>{console.log('WARN ['+f+'] '+m);w++;};
const ds=fs.readdirSync(D).filter(d=>{try{return fs.statSync(path.join(D,d)).isDirectory()}catch{return false}});
// JSON + empty fingerprints
for(const d of ds){const f=path.join(D,d,'driver.compose.json');if(!fs.existsSync(f))continue;try{const c=JSON.parse(fs.readFileSync(f,'utf8'));const z=c.zigbee;if(z){if(!z.manufacturerName||!z.manufacturerName.length)wrn(d,'Empty manufacturerName');if(!z.productId||!z.productId.length)wrn(d,'Empty productId')}}catch(ex){err(d,'Bad JSON: '+ex.message)}}
// FP collisions
const fp={};for(const d of ds){const f=path.join(D,d,'driver.compose.json');if(!fs.existsSync(f))continue;try{const c=JSON.parse(fs.readFileSync(f,'utf8'));const ms=c.zigbee?.manufacturerName||[];const ps=c.zigbee?.productId||[];for(const m of ms)for(const p of ps){const k=m+'+'+p;if(fp[k]&&fp[k]!==d)wrn(d,'FP collision '+k+' vs '+fp[k]);if(!fp[k])fp[k]=d}}catch{}}
// Mains + battery
for(const d of ds){const f=path.join(D,d,'device.js');if(!fs.existsSync(f))continue;const c=fs.readFileSync(f,'utf8');if(c.includes('mainsPowered')&&c.includes('return true')&&!c.includes('removeCapability')){const dc=path.join(D,d,'driver.compose.json');try{const cfg=JSON.parse(fs.readFileSync(dc,'utf8'));if((cfg.capabilities||[]).includes('measure_battery'))wrn(d,'Mains but has battery')}catch{}}}
console.log('\nErrors:',e,'Warnings:',w);
process.exit(e>0?1:0);
