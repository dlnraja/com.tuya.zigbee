#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const dd=path.join(__dirname,'..','drivers');
const r={},m2d={};
for(const d of fs.readdirSync(dd)){
const f=path.join(dd,d,'driver.compose.json');
if(!fs.existsSync(f))continue;
try{const j=JSON.parse(fs.readFileSync(f,'utf8'));
if(!j.zigbee)continue;
const m=j.zigbee.manufacturerName||[],p=j.zigbee.productId||[];
r[d]={m,p};
m.forEach(x=>{if(!m2d[x])m2d[x]=[];m2d[x].push(d)});
}catch(e){}}
fs.writeFileSync(path.join(__dirname,'current-fps.json'),JSON.stringify({r,m2d},null,2));
console.log('Done:',Object.keys(r).length,'drivers');
