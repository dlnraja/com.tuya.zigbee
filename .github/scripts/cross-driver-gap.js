#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const S=process.env.GITHUB_STEP_SUMMARY||(process.platform==='win32'?'NUL':'/dev/null');
const G=[
{n:'Sensors',d:['climate_sensor','motion_sensor','contact_sensor'],m:2,p:['_TZ3000_']},
{n:'Switches',d:['switch_1gang','switch_2gang','switch_3gang','switch_4gang'],m:2,p:['_TZ3000_','_TZ3002_']},
];
const dir=path.join(__dirname,'..','..','drivers'),all={};
for(const d of fs.readdirSync(dir)){
const f=path.join(dir,d,'driver.compose.json');
if(!fs.existsSync(f))continue;
all[d]=new Set((fs.readFileSync(f,'utf8').match(/"_T[A-Za-z0-9_]+"/g)||[]).map(s=>s.replace(/"/g,'')));
}
let r='## Cross-Driver Gaps\n\n',t=0;
for(const g of G){
const fm=new Map();
for(const d of g.d){if(!all[d])continue;for(const fp of all[d])if(g.p.some(p=>fp.startsWith(p))){if(!fm.has(fp))fm.set(fp,[]);fm.get(fp).push(d);}}
const gaps=[];
for(const[fp,ds]of fm)if(ds.length>=g.m&&ds.length<g.d.length)gaps.push({fp,missing:g.d.filter(d=>!ds.includes(d))});
t+=gaps.length;
r+=`### ${g.n}: ${gaps.length} gaps\n`;
if(gaps.length){r+='| FP | Missing from |\n|---|---|\n';for(const x of gaps)r+=`| \`${x.fp}\` | ${x.missing.join(', ')} |\n`;}
r+='\n';
}
r+=`**Total gaps: ${t}**\n`;
console.log(r);
fs.appendFileSync(S,r);
if(t>0)fs.writeFileSync('/tmp/driver_gaps.json',JSON.stringify({total:t}));
