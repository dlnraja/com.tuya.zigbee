#!/usr/bin/env node
'use strict';
const {execSync}=require('child_process');
const {loadFingerprints}=require('./load-fingerprints');
const fs=require('fs');

const UPSTREAM='JohanBendz/com.tuya.zigbee';
const os=require('os');
const SUMMARY=process.env.GITHUB_STEP_SUMMARY||(process.platform==='win32'?'NUL':'/dev/null');

function gh(c){return execSync(`gh ${c}`,{encoding:'utf8',timeout:60000,maxBuffer:50*1024*1024}).trim();}

function scanForks(){
  const fps=loadFingerprints();
  console.log(`Our DB: ${fps.size} fingerprints`);
  
  // Get all forks of upstream
  let forks=[];
  try{
    forks=JSON.parse(gh(`api repos/${UPSTREAM}/forks --paginate --jq '[.[].full_name]'`));
  }catch(e){console.error('Fork list error:',e.message);return;}
  
  console.log(`Found ${forks.length} forks to scan`);
  const newFps=new Map(); // fp -> [fork, driver]
  
  for(const fork of forks){
    try{
      // Get driver.compose.json files from default branch
      const tree=gh(`api repos/${fork}/git/trees/HEAD?recursive=1 --jq '.tree[].path'`);
      const composeFiles=tree.split('\n').filter(f=>f.match(/drivers\/.*\/driver\.compose\.json/));
      
      for(const cf of composeFiles){
        try{
          const raw=gh(`api repos/${fork}/contents/${cf} --jq '.content'`);
          const decoded=Buffer.from(raw,'base64').toString('utf8');
          const matches=decoded.match(/"_T[A-Za-z0-9_]+"/g)||[];
          for(const m of matches){
            const fp=m.replace(/"/g,'');
            if(!fps.has(fp)&&!newFps.has(fp)){
              const driver=cf.match(/drivers\/([^/]+)\//)?.[1]||'unknown';
              newFps.set(fp,{fork,driver});
            }
          }
        }catch{}
      }
      if(newFps.size>0)console.log(`  ${fork}: found new FPs so far: ${newFps.size}`);
    }catch(e){
      console.log(`  ${fork}: skip (${e.message.slice(0,50)})`);
    }
  }
  
  // Report
  let report=`## Fork Scanner Results\n`;
  report+=`| Metric | Value |\n|--------|-------|\n`;
  report+=`| Forks scanned | ${forks.length} |\n`;
  report+=`| New fingerprints | ${newFps.size} |\n\n`;
  
  if(newFps.size>0){
    report+=`### New Fingerprints Found\n| Fingerprint | Fork | Driver |\n|-------------|------|--------|\n`;
    for(const [fp,{fork,driver}] of newFps){
      report+=`| \`${fp}\` | ${fork} | ${driver} |\n`;
    }
  }
  
  console.log(report);
  fs.appendFileSync(SUMMARY,report+'\n');
  
  // Save for downstream use
  if(newFps.size>0){
    const data=JSON.stringify([...newFps.entries()],null,2);
    fs.writeFileSync('/tmp/new_fork_fps.json',data);
  }
}

scanForks();
