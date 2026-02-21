#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const STATE=path.join(__dirname,'..','state','public-apis-report.json');
const SUM=process.env.GITHUB_STEP_SUMMARY||null;
const AI_RE=/\b(llm|gpt|chat|inference|nlp|neural|completion)/i;
const IOT_RE=/\b(iot|smart.home|zigbee|mqtt|home.auto|tuya|sensor)/i;
async function main(){
  console.log('Fetching public-apis list...');
  const r=await fetch('https://raw.githubusercontent.com/public-apis/public-apis/master/README.md');
  if(!r.ok)throw new Error('Fetch failed: '+r.status);
  const md=await r.text();
  const entries=[];let cat=null;
  for(const line of md.split('\n')){
    const cm=line.match(/^###\s+(.+)/);
    if(cm){cat=cm[1].trim();continue}
    const rm=line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|/);
    if(rm&&cat)entries.push({name:rm[1].trim(),url:rm[2].trim(),desc:rm[3].trim(),auth:rm[4].trim().replace(/`/g,''),https:rm[5].trim(),cors:rm[6].trim(),category:cat});
  }
  console.log('Parsed '+entries.length+' total APIs');
  const ai=entries.filter(e=>e.category==='Machine Learning'||AI_RE.test(e.name+' '+e.desc));
  const iot=entries.filter(e=>IOT_RE.test(e.name+' '+e.desc));
  const free_ai=ai.filter(e=>!e.auth||e.auth==='No');
  const dev=entries.filter(e=>['Machine Learning','Open Source Projects','Development'].includes(e.category));
  const rpt={timestamp:new Date().toISOString(),total:entries.length,ai:ai.map(e=>({name:e.name,url:e.url,desc:e.desc,auth:e.auth})),iot:iot.map(e=>({name:e.name,url:e.url,desc:e.desc,auth:e.auth})),free_ai:free_ai.map(e=>({name:e.name,url:e.url,desc:e.desc})),dev_count:dev.length};
  fs.mkdirSync(path.dirname(STATE),{recursive:true});
  fs.writeFileSync(STATE,JSON.stringify(rpt,null,2)+'\n');
  console.log('AI:'+ai.length+' IoT:'+iot.length+' FreeAI:'+free_ai.length+' Dev:'+dev.length);
  if(SUM){let s='## Public APIs Scan\n|Cat|Count|\n|--|--|\n|Total|'+entries.length+'|\n|AI/ML|'+ai.length+'|\n|IoT|'+iot.length+'|\n|FreeAI|'+free_ai.length+'|\n';fs.appendFileSync(SUM,s);}
  console.log('Report:',STATE);
}
main().catch(e=>{console.error(e.message);process.exit(1)});