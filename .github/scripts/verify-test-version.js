#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const APP='com.dlnraja.tuya.zigbee';
const PAT=process.env.HOMEY_PAT;
const SUM=process.env.GITHUB_STEP_SUMMARY||null;
const CLOUD='https://api.athom.com';
const APPS='https://apps-api.athom.com/api/v1';
function log(t){console.log(t);if(SUM)try{fs.appendFileSync(SUM,t+'\n')}catch{}}

async function main(){
  if(!PAT){log('HOMEY_PAT not set');process.exit(0)}
  const ver=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version;
  log('## Verify Test Version');
  log('Expected: v'+ver);
  // Get delegation token
  let token=PAT;
  try{
    const h={'Authorization':'Bearer '+PAT,'Content-Type':'application/json'};
    const r=await fetchWithRetry(CLOUD+'/delegation/token',{method:'POST',headers:h,body:JSON.stringify({audience:'apps'})},{retries:2,label:'deleg'});
    const d=await r.json();if(d.token)token=d.token;
  }catch{}
  // List builds
  const h2={'Authorization':'Bearer '+token,'Accept':'application/json'};
  const r2=await fetchWithRetry(APPS+'/app/'+APP+'/build',{headers:h2},{retries:3,label:'builds'});
  const raw=await r2.json().catch(()=>null);
  const builds=Array.isArray(raw)?raw:(raw?.builds||raw?.data||[]);
  if(!builds.length){log('No builds found');process.exitCode=1;return}
  const test=builds.filter(b=>String(b.channel||'').toLowerCase()==='test');
  const draft=builds.filter(b=>{const c=String(b.channel||b.status||'').toLowerCase();return c==='draft'||c===''||c==='none'});
  log('Builds: '+builds.length+' total, '+test.length+' test, '+draft.length+' draft');
  const inTest=test.some(b=>b.version===ver);
  const inDraft=draft.some(b=>b.version===ver);
  if(inTest){log(' v'+ver+' is on test channel')}
  else if(inDraft){log(' v'+ver+' still in draft  promotion may have failed');process.exitCode=1}
  else{log(' v'+ver+' not found in any build');process.exitCode=1}
  // Show latest test version
  if(test.length){const latest=test.sort((a,b)=>(b.version||'').localeCompare(a.version||'',undefined,{numeric:true}))[0];log('Latest test: v'+(latest.version||'?'))}
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
