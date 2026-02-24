#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const STATE=path.join(__dirname,'..','state','public-apis-report.json');
const SUM=process.env.GITHUB_STEP_SUMMARY||null;
const AI_RE=/\b(llm|gpt|chat|inference|nlp|neural|completion)/i;
const IOT_RE=/\b(iot|smart.home|zigbee|mqtt|home.auto|tuya|sensor)/i;
async function main(){
  let entries=[];
  // Primary: davemachado/public-api
  try{
    console.log('Trying api.publicapis.org...');
    const r=await fetchWithRetry('https://api.publicapis.org/entries',{headers:{'User-Agent':'TuyaZigbeeBot/1.0'}},{retries:2,timeout:10000,label:'publicAPIs'});
    if(r.ok){const d=await r.json();entries=(d.entries||[]).map(e=>({name:e.API,url:e.Link,desc:e.Description,auth:e.Auth||'',category:e.Category}));}
  }catch(e){console.log('API down: '+e.message)}
  // Fallback: GitHub README
  if(!entries.length){
    console.log('Fallback: GitHub README...');
    const r2=await fetchWithRetry('https://raw.githubusercontent.com/public-apis/public-apis/master/README.md',{},{retries:3,label:'publicApisFallback'});
    if(!r2.ok)throw new Error('Fetch failed: '+r2.status);
    const md=await r2.text();let cat=null;
    for(const l of md.split('\n')){const cm=l.match(/^###\s+(.+)/);if(cm){cat=cm[1].trim();continue}
      const rm=l.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]*)\|\s*([^|]*)\|/);
      if(rm&&cat)entries.push({name:rm[1].trim(),url:rm[2].trim(),desc:rm[3].trim(),auth:rm[4].trim().replace(/`/g,''),category:cat});}
  }
  console.log('Total: '+entries.length+' APIs');
  const ai=entries.filter(e=>e.category==='Machine Learning'||AI_RE.test(e.name+' '+e.desc));
  const iot=entries.filter(e=>IOT_RE.test(e.name+' '+e.desc));
  const free_ai=ai.filter(e=>!e.auth||e.auth==='No');
  const dev=entries.filter(e=>['Machine Learning','Open Source Projects','Development'].includes(e.category));
  const rpt={source:'davemachado/public-api',timestamp:new Date().toISOString(),total:entries.length,ai:ai.map(e=>({name:e.name,url:e.url,desc:e.desc,auth:e.auth})),iot:iot.map(e=>({name:e.name,url:e.url,desc:e.desc,auth:e.auth})),free_ai:free_ai.map(e=>({name:e.name,url:e.url,desc:e.desc})),dev_count:dev.length};
  fs.mkdirSync(path.dirname(STATE),{recursive:true});
  fs.writeFileSync(STATE,JSON.stringify(rpt,null,2)+'\n');
  console.log('AI:'+ai.length+' IoT:'+iot.length+' FreeAI:'+free_ai.length+' Dev:'+dev.length);
  if(SUM){let s='## Public APIs Scan\n|Cat|Count|\n|--|--|\n|Total|'+entries.length+'|\n|AI/ML|'+ai.length+'|\n|IoT|'+iot.length+'|\n|FreeAI|'+free_ai.length+'|\n';fs.appendFileSync(SUM,s);}
  console.log('Report:',STATE);
}
main().catch(e=>{console.error(e.message);process.exit(1)});