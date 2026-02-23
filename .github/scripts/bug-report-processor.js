#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{callAI}=require('./ai-helper');
const{loadFingerprints,findAllDrivers}=require('./load-fingerprints');
const ROOT=path.join(__dirname,'..','..');
const DDIR=path.join(ROOT,'drivers');
const GH='https://api.github.com';
const TOKEN=process.env.GH_TOKEN||process.env.GH_PAT||process.env.GITHUB_TOKEN;
const ISSUE_NUM=process.env.ISSUE_NUMBER;
const REPO=process.env.GITHUB_REPOSITORY||'dlnraja/com.tuya.zigbee';
const SUMMARY=process.env.GITHUB_OUTPUT||'/dev/null';

async function ghGet(ep){
  const r=await fetch(GH+ep,{headers:{Accept:'application/vnd.github+json','User-Agent':'tuya-bot',Authorization:'Bearer '+TOKEN}});
  return r.ok?r.json():null;
}

function extractFP(t){return[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])];}
function extractPID(t){return[...new Set((t||'').match(/\bTS[0-9]{4}[A-Z]?\b/g)||[])];}

async function main(){
  if(!ISSUE_NUM){console.log('No ISSUE_NUMBER');process.exit(0);}
  console.log('Processing bug report #'+ISSUE_NUM);
  const issue=await ghGet('/repos/'+REPO+'/issues/'+ISSUE_NUM);
  if(!issue){console.log('Issue not found');process.exit(0);}

  const text=(issue.title||'')+'\n'+(issue.body||'');
  const fps=extractFP(text);
  const pids=extractPID(text);
  console.log('Fingerprints:',fps,'PIDs:',pids);

  // Check which drivers match
  const fpDB=loadFingerprints();
  const matches=fps.map(fp=>({fp,drivers:findAllDrivers(fp)}));
  const newFPs=matches.filter(m=>m.drivers.length===0);
  const existingFPs=matches.filter(m=>m.drivers.length>0);

  // For new fingerprints: add to nearest matching driver
  let hasFix=false;
  let summary='';
  let details='';

  if(newFPs.length>0){
    for(const{fp}of newFPs){
      // Find best driver match by prefix
      const prefix=fp.substring(0,fp.lastIndexOf('_'));
      let bestDriver=null,bestCount=0;
      for(const d of fs.readdirSync(DDIR)){
        const cf=path.join(DDIR,d,'driver.compose.json');
        if(!fs.existsSync(cf))continue;
        const raw=fs.readFileSync(cf,'utf8');
        const count=(raw.match(new RegExp(prefix,'g'))||[]).length;
        if(count>bestCount){bestCount=count;bestDriver=d;}
      }
      if(bestDriver&&bestCount>=1){
        // Add fingerprint to driver
        const cf=path.join(DDIR,bestDriver,'driver.compose.json');
        const compose=JSON.parse(fs.readFileSync(cf,'utf8'));
        if(compose.zigbee&&compose.zigbee.manufacturerName){
          if(!compose.zigbee.manufacturerName.includes(fp)){
            compose.zigbee.manufacturerName.push(fp);
            compose.zigbee.manufacturerName.sort();
            fs.writeFileSync(cf,JSON.stringify(compose,null,2)+'\n');
            console.log('Added '+fp+' to '+bestDriver);
            hasFix=true;
            summary+='Add '+fp+' to '+bestDriver+'. ';
            details+='- Added fingerprint `'+fp+'` to driver `'+bestDriver+'` (matched prefix `'+prefix+'`)\n';
          }
        }
      }
    }
  }

  // For existing FPs with bugs: try to analyze with AI
  if(existingFPs.length>0&&!hasFix){
    const driver=existingFPs[0].drivers[0];
    const devFile=path.join(DDIR,driver,'device.js');
    if(fs.existsSync(devFile)){
      const devCode=fs.readFileSync(devFile,'utf8').substring(0,3000);
      const ai=await callAI(
        'Bug report for driver '+driver+':\n'+text.substring(0,2000)+'\n\nDevice code (partial):\n'+devCode,
        'Analyze this Zigbee device bug. If it is a fingerprint issue, provide the fix. If it is a DP mapping issue, suggest the fix. Return JSON: {"canFix":true/false,"fixType":"fingerprint|dp_mapping|config|unknown","summary":"one line","details":"explanation"}',
        {maxTokens:512}
      );
      if(ai){
        try{
          const m=ai.text.match(/\{[\s\S]*\}/);
          if(m){
            const r=JSON.parse(m[0]);
            summary=r.summary||'';
            details=r.details||'';
            console.log('AI analysis:',r.fixType,r.summary);
          }
        }catch{}
      }
    }
  }

  if(!summary)summary='Bug report analysis for fingerprints: '+fps.join(', ');
  if(!details)details='Fingerprints: '+fps.join(', ')+'\nPIDs: '+pids.join(', ')+'\nMatched drivers: '+existingFPs.map(m=>m.drivers.join(',')).join('; ');

  // Write outputs
  const out=fs.createWriteStream(SUMMARY,{flags:'a'});
  out.write('has_fix='+(hasFix?'true':'false')+'\n');
  out.write('summary='+summary.replace(/\n/g,' ').substring(0,200)+'\n');
  out.write('details='+details.replace(/\n/g,'\\n').substring(0,500)+'\n');
  out.end();
  console.log('Done. hasFix='+hasFix);
}

main().catch(e=>{console.error(e);process.exit(1);});
