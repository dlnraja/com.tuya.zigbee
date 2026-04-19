#!/usr/bin/env node
'use strict';
const fs=require('fs'),p=require('path');
const S=p.join(__dirname,'..','state');
const H=p.join(S,'pipeline-health.json');
function ld(f){try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}}
function sv(f,d){fs.mkdirSync(p.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(d,null,2))}
const st=ld(H)||{runs:[],alerts:[]};
const now=new Date().toISOString();
const wf=process.env.GITHUB_WORKFLOW||'manual';
const ck=['nightly-state.json','diagnostics-state.json','pattern-data.json','resolver-state.json','issue-manager-state.json','github-state.json'];
const h={};
for(const f of ck){try{const s=fs.statSync(p.join(S,f));h[f]={ok:true,ageH:Math.round((Date.now()-s.mtimeMs)/36e5),size:s.size}}catch{h[f]={ok:false}}}
const stale=Object.entries(h).filter(([,v])=>v.ok&&v.ageH>48).map(([k])=>k);
const missing=Object.entries(h).filter(([,v])=>!v.ok).map(([k])=>k);
const alerts=[];
if(stale.length)alerts.push({type:'stale',files:stale,msg:`${stale.length} state file(s) older than 48h`});
if(missing.length)alerts.push({type:'missing',files:missing,msg:`${missing.length} state file(s) missing`});
// Check pattern-data for high-priority unresolved issues
const pd=ld(p.join(S,'pattern-data.json'));
if(pd&&pd.patterns){const hi=pd.patterns.filter(x=>x.priority==='high'&&!x.resolved);if(hi.length>3)alerts.push({type:'patterns',count:hi.length,msg:`${hi.length} high-priority unresolved patterns`})}
// Record run
st.runs.push({ts:now,wf,stale:stale.length,missing:missing.length,alerts:alerts.length});
if(st.runs.length>30)st.runs=st.runs.slice(-30);
st.alerts=alerts;
st.lastRun=now;
st.fileHealth=h;
sv(H,st);
// Output summary
const sm=process.env.GITHUB_STEP_SUMMARY;
if(sm){let md='## Pipeline Health\n\n';md+='| File | Status | Age |\n|------|--------|-----|\n';for(const[f,v]of Object.entries(h)){md+=`| ${f} | ${v.ok?'OK':'MISSING'} | ${v.ok?v.ageH+'h':'-'} |\n`}if(alerts.length){md+='\n### Alerts\n';for(const a of alerts)md+=`- **${a.type}**: ${a.msg}\n`}else{md+='\n*No alerts  all healthy*\n'}fs.appendFileSync(sm,md)}
console.log(`Health check: ${Object.keys(h).length} files, ${stale.length} stale, ${missing.length} missing, ${alerts.length} alerts`);
for(const a of alerts)console.log(`::warning::${a.msg}`);
