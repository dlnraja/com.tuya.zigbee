#!/usr/bin/env node
'use strict';
// Forum Intel Processor — reads forum-intel.json, matches missing FPs to Z2M device types,
// auto-adds confirmed FPs to drivers, generates improvement report. NEVER posts to forum.
const fs=require('fs'),path=require('path');
let callAI;try{callAI=require('./ai-helper').callAI}catch{callAI=null}
const ROOT=path.join(__dirname,'..','..');
const SD=process.env.STATE_DIR||path.join(__dirname,'..','state');
const DDIR=path.join(ROOT,'drivers');
const DRY=process.env.DRY_RUN!=='false';

function loadAllFPs(){
  const map=new Map();
  for(const d of fs.readdirSync(DDIR)){
    try{
      const c=JSON.parse(fs.readFileSync(path.join(DDIR,d,'driver.compose.json'),'utf8'));
      for(const m of(c.zigbee?.manufacturerName||[]))map.set(m,d);
    }catch{}
  }
  return map;
}

function suggestDriver(fp){
  // Prefix-based heuristic when no Z2M data available
  if(fp.startsWith('_TZE200')||fp.startsWith('_TZE204')||fp.startsWith('_TZE284'))return null;
  if(fp.startsWith('_TZ3210'))return null;
  if(fp.startsWith('_TZ3000'))return'switch_1gang';
  if(fp.startsWith('_TZ3002'))return'switch_1gang';
  if(fp.startsWith('_TZB000'))return null;
  return null;
}

async function aiSuggestDrivers(fps){
  if(!callAI||!fps.length)return{};
  const drivers=fs.readdirSync(DDIR).filter(d=>fs.existsSync(path.join(DDIR,d,'driver.compose.json')));
  const prompt='Given these drivers: '+drivers.join(',')+'. For each fingerprint, suggest the best driver or "unknown". Return JSON: {"fp":"driver",...}';
  const r=await callAI(JSON.stringify(fps.slice(0,15)),prompt,{maxTokens:512});
  if(!r)return{};
  try{const m=r.text.match(/\{[^}]+\}/);return m?JSON.parse(m[0]):{}}catch{return{}}
}

function addFPToDriver(fp,driver){
  const cf=path.join(DDIR,driver,'driver.compose.json');
  if(!fs.existsSync(cf))return false;
  try{
    const c=JSON.parse(fs.readFileSync(cf,'utf8'));
    if(!c.zigbee)c.zigbee={};
    if(!c.zigbee.manufacturerName)c.zigbee.manufacturerName=[];
    if(c.zigbee.manufacturerName.includes(fp))return false;
    c.zigbee.manufacturerName.push(fp);
    c.zigbee.manufacturerName.sort();
    fs.writeFileSync(cf,JSON.stringify(c,null,2)+'\n');
    return true;
  }catch{return false}
}

async function main(){
  const intelFile=path.join(SD,'forum-intel.json');
  if(!fs.existsSync(intelFile)){console.log('No forum-intel.json found, run scan-forum.js first');return}
  const intel=JSON.parse(fs.readFileSync(intelFile,'utf8'));
  const fps=loadAllFPs();
  console.log('=== Forum Intel Processor ===');
  console.log('Mode:',DRY?'DRY RUN':'LIVE');
  console.log('Known FPs:',fps.size,'| Missing from forum:',intel.missingFPs?.length||0);

  const added=[],skipped=[],suggestions=[];
  for(const fp of(intel.missingFPs||[])){
    if(fps.has(fp)){skipped.push(fp);continue}
    if(!fp.match(/^_T[A-Z][A-Z0-9]{2,5}_[a-z0-9]{4,}$/i)){skipped.push(fp);continue}
    const driver=suggestDriver(fp);
    if(!driver){suggestions.push({fp,reason:'Need Z2M/interview data to assign driver'});continue}
    if(DRY){added.push({fp,driver,dry:true});continue}
    if(addFPToDriver(fp,driver))added.push({fp,driver,dry:false});
    else skipped.push(fp);
  }

  // AI-assisted driver suggestions for unknowns
  const unknownFPs=suggestions.map(s=>s.fp);
  if(unknownFPs.length&&callAI){
    console.log('AI suggesting drivers for',unknownFPs.length,'unknown FPs...');
    const aiMap=await aiSuggestDrivers(unknownFPs);
    for(const s of suggestions){
      if(aiMap[s.fp]&&aiMap[s.fp]!=='unknown'){s.aiSuggestion=aiMap[s.fp];s.reason='AI: '+aiMap[s.fp]}
    }
    const aiSuggested=suggestions.filter(s=>s.aiSuggestion);
    if(aiSuggested.length)console.log('AI suggested:',aiSuggested.map(s=>s.fp+'->'+s.aiSuggestion).join(', '));
  }

  // Issue summary from forum intel
  const cats=intel.categories||{};
  const report={
    timestamp:new Date().toISOString(),
    mode:DRY?'dry':'live',
    fpStats:{known:fps.size,missing:intel.missingFPs?.length||0,added:added.length,skipped:skipped.length,needsReview:suggestions.length},
    issueCategories:cats,
    added,suggestions:suggestions.slice(0,50),
    topPainPoints:Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>k+': '+v),
    wifiRequestCount:(intel.wifiRequests||[]).length,
    pairingIssueCount:(intel.pairingIssues||[]).length,
  };

  fs.writeFileSync(path.join(SD,'forum-intel-report.json'),JSON.stringify(report,null,2));
  console.log('Added:',added.length,'| Skipped:',skipped.length,'| Need review:',suggestions.length);
  console.log('Top pain points:',report.topPainPoints.join(', '));
  if(added.length)console.log('Added FPs:',added.map(a=>a.fp+'->'+a.driver).join(', '));

  let md='## Forum Intel Report\n';
  md+='| Metric | Value |\n|--------|-------|\n';
  md+='| Known FPs | '+fps.size+' |\n';
  md+='| Missing from forum | '+(intel.missingFPs?.length||0)+' |\n';
  md+='| Auto-added | '+added.length+' |\n';
  md+='| Need review | '+suggestions.length+' |\n';
  md+='| WiFi requests | '+report.wifiRequestCount+' |\n';
  md+='| Pairing issues | '+report.pairingIssueCount+' |\n\n';
  if(report.topPainPoints.length){
    md+='### Top Pain Points\n';
    for(const p of report.topPainPoints)md+='- '+p+'\n';
  }
  const SUM=process.env.GITHUB_STEP_SUMMARY||(process.platform==='win32'?'NUL':'/dev/null');
  fs.appendFileSync(SUM,md+'\n');
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
