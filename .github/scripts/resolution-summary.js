#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const f=path.join(__dirname,'..','state','pattern-data.json');
if(!fs.existsSync(f)){console.log('No pattern data');process.exit(0)}
const d=JSON.parse(fs.readFileSync(f,'utf8'));
const s=d.suggestions||[],det=d.detections||{};
let md='## Resolution Summary\n\n';
md+='| Pattern | Count | Priority | Fix |\n|---|---|---|---|\n';
for(const p of s) md+='| '+p.pattern+' | '+p.count+' | '+p.priority+' | '+p.fix+' |\n';
md+='\n### Symptom Counters\n';
for(const[k,v]of Object.entries(det)) if(v>0) md+='- **'+k+'**: '+v+'\n';
const out=process.env.GITHUB_STEP_SUMMARY;
if(out) fs.appendFileSync(out,md);
console.log(md);
