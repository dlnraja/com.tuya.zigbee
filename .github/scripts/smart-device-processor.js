#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{callAI}=require('./ai-helper');
const ROOT=path.join(__dirname,'..','..'),DDIR=path.join(ROOT,'drivers');
const SD=path.join(__dirname,'..','state');
const DRY=process.env.DRY_RUN==='true';
const MAX_AI=15,AI_DELAY=4500;
let aiUsed=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};
const saveJ=(f,d)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n')};
const{buildIndex,collectAll,filterNew,suggestDriver,aiBatchAnalyze,addFpToDriver}=require('./smart-device-lib');
async function main(){
  let appVer='?';try{appVer=JSON.parse(fs.readFileSync(path.join(ROOT,'app.json'),'utf8')).version}catch{}
  console.log('=== Smart Device Processor v2 ===');
  console.log('Mode:',DRY?'DRY':'LIVE','| App: v'+appVer);
  const{mIdx,pIdx,meta}=buildIndex(DDIR);
  console.log('Index:',mIdx.size,'mfrs |',pIdx.size,'pids |',meta.size,'drivers');
  console.log('\n== Collecting Sources ==');
  const allDevs=collectAll(SD);
  console.log('Total collected:',allDevs.size);
  const newDevs=filterNew(allDevs,mIdx);
  console.log('NEW unsupported:',newDevs.size);
  if(!newDevs.size){console.log('Nothing new.');return}
  // Sort by source count (most requested first)
  const sorted=[...newDevs.values()].sort((a,b)=>b.src.length-a.src.length);
  // Phase 1: Auto-assign by productId match
  const report={timestamp:new Date().toISOString(),appVer,total:sorted.length,added:[],aiAnalyzed:[],skipped:[]};
  let added=0;
  for(const dev of sorted){
    const s=suggestDriver(dev,pIdx,meta);
    if(s.driver&&s.pid&&s.method==='productId'){
      if(!DRY){addFpToDriver(s.driver,dev.fp,null,meta);added++}
      report.added.push({fp:dev.fp,driver:s.driver,pid:s.pid,method:s.method});
      console.log('  +',dev.fp,'→',s.driver,'('+s.method+')');
    }
  }
  console.log('Phase 1 (productId match):',report.added.length,'added');
  // Phase 2: AI batch analysis for remaining
  const remaining=sorted.filter(d=>!report.added.find(a=>a.fp===d.fp));
  const batches=[];
  for(let i=0;i<remaining.length;i+=8)batches.push(remaining.slice(i,i+8));
  console.log('\n== Phase 2: AI Analysis (',Math.min(batches.length,MAX_AI),'batches) ==');
  for(const batch of batches.slice(0,MAX_AI)){
    if(aiUsed>=MAX_AI){console.log('  AI budget exhausted');break}
    if(aiUsed>0)await sleep(AI_DELAY);
    aiUsed++;
    const sys='Tuya Zigbee expert for Homey SDK3 v'+appVer+'. For each device return JSON: '+
      '[{deviceType,suggestedDriver,productId,dpMappings:[{dp,capability,type,divisor}],capabilities:[],quirks:[],confidence:0-100}]. NULL if insufficient data.';
    const input=batch.map(d=>({fp:d.fp,pids:[...d.pids],src:d.src.slice(0,3),dps:d.dps.slice(0,10),interviewHint:d.interviews[0]?.title||''}));
    const res=await callAI(JSON.stringify(input),sys,{maxTokens:1500});
    if(!res){report.skipped.push(...batch.map(d=>d.fp));continue}
    console.log('  AI via',res.model);
    let analyses=null;
    try{const m=res.text.match(/\[[\s\S]*\]/);analyses=m?JSON.parse(m[0]):null}catch{}
    if(!analyses){report.skipped.push(...batch.map(d=>d.fp));continue}
    for(let i=0;i<batch.length;i++){
      const dev=batch[i],ai=analyses[i];
      if(!ai||ai==='NULL'||!ai.suggestedDriver){report.skipped.push(dev.fp);continue}
      if(ai.confidence<40){report.skipped.push(dev.fp);continue}
      const driver=ai.suggestedDriver;
      if(!meta.has(driver)){report.skipped.push(dev.fp);continue}
      const pid=ai.productId||[...dev.pids][0]||null;
      if(!DRY){addFpToDriver(driver,dev.fp,pid,meta);added++}
      report.aiAnalyzed.push({fp:dev.fp,driver,pid,type:ai.deviceType,caps:ai.capabilities,dps:ai.dpMappings,quirks:ai.quirks,confidence:ai.confidence});
      console.log('  +',dev.fp,'→',driver,'(AI:'+ai.confidence+'%)',ai.deviceType);
    }
  }
  console.log('\n== Results ==');
  console.log('Added (productId):',report.added.length);
  console.log('Added (AI):',report.aiAnalyzed.length);
  console.log('Skipped:',report.skipped.length);
  console.log('AI calls used:',aiUsed,'/',MAX_AI);
  saveJ(path.join(SD,'smart-processor-report.json'),report);
  saveJ(path.join(SD,'smart-processor-state.json'),{lastRun:new Date().toISOString(),processed:[...report.added.map(a=>a.fp),...report.aiAnalyzed.map(a=>a.fp)]});
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Smart Device Processor\n| Metric | Count |\n|---|---|\n';
    md+='| Sources collected | '+allDevs.size+' |\n| New unsupported | '+newDevs.size+' |\n';
    md+='| Added (productId) | '+report.added.length+' |\n| Added (AI) | '+report.aiAnalyzed.length+' |\n';
    md+='| AI calls | '+aiUsed+'/'+MAX_AI+' |\n';
    if(report.aiAnalyzed.length){md+='\n### AI Implementations\n';for(const a of report.aiAnalyzed.slice(0,15))md+='- `'+a.fp+'` → **'+a.driver+'** ('+a.type+', '+a.confidence+'%)\n'}
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
