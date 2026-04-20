#!/usr/bin/env node
'use strict';
// v5.11.27: Auto-Learn Fingerprints  scans all driver.compose.json to discover
// non-Tuya manufacturers and non-TS productIds, then updates load-fingerprints.js
// Eliminates hardcoded NON_TUYA_KNOWN / NON_TS_PIDS lists going stale
const fs=require('fs'),path=require('path');
const DDIR=path.join(__dirname,'..','..','drivers');
const LFP=path.join(__dirname,'load-fingerprints.js');

function scanDrivers(){
  const nonTuyaMfrs=new Set(), nonTsPids=new Set();
  const tuyaMfrs=new Set(), tsPids=new Set();
  const stats={drivers:0, totalMfrs:0, totalPids:0};

  for(const d of fs.readdirSync(DDIR)){
    const f=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(f))continue;
    try{
      const data=JSON.parse(fs.readFileSync(f,'utf8'));
      const mfrs=data.zigbee?.manufacturerName||[];
      const pids=data.zigbee?.productId||[];
      stats.drivers++;
      stats.totalMfrs+=mfrs.length;
      stats.totalPids+=pids.length;

      for(const m of mfrs){
        if(/^_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}$/.test(m)) tuyaMfrs.add(m);
        else if(m.length >= 4 && !/^[a-z]{2,5}$/i.test(m)) nonTuyaMfrs.add(m); // Skip short common words
      }
      for(const p of pids){
        if(/^TS[0-9]{4}[A-Z]?$/.test(p)) tsPids.add(p);
        else if(p.length >= 4 && !/^[a-z]{2,5}$/i.test(p)) nonTsPids.add(p);
      }
    }catch(e){console.warn('  Parse error:',d,e.message)}
  }
  return{nonTuyaMfrs:[...nonTuyaMfrs].sort(),nonTsPids:[...nonTsPids].sort(),tuyaMfrs:tuyaMfrs.size,tsPids:tsPids.size,stats};
}

function updateLoadFingerprints(nonTuyaMfrs,nonTsPids){
  if(!fs.existsSync(LFP)){console.log('load-fingerprints.js not found');return false}
  let src=fs.readFileSync(LFP,'utf8');
  let changed=false;

  // Update NON_TUYA_KNOWN array
  const mfrMatch=src.match(/const NON_TUYA_KNOWN\s*=\s*\[[\s\S]*?\];/);
  if(mfrMatch){
    const newList=nonTuyaMfrs.map(m=>"'"+m.replace(/'/g,"\\'")+"'").join(', ');
    const newBlock='const NON_TUYA_KNOWN = [\n  '+newList+'\n];';
    if(mfrMatch[0]!==newBlock){
      src=src.replace(mfrMatch[0],newBlock);
      changed=true;
    }
  }

  // Update NON_TS_PIDS array
  const pidMatch=src.match(/const NON_TS_PIDS\s*=\s*\[[\s\S]*?\];/);
  if(pidMatch){
    const newList=nonTsPids.map(p=>"'"+p.replace(/'/g,"\\'")+"'").join(', ');
    const newBlock='const NON_TS_PIDS = [\n  '+newList+'\n];';
    if(pidMatch[0]!==newBlock){
      src=src.replace(pidMatch[0],newBlock);
      changed=true;
    }
  }

  if(changed){
    fs.writeFileSync(LFP,src);
    console.log('Updated load-fingerprints.js');
  }else{
    console.log('load-fingerprints.js already up-to-date');
  }
  return changed;
}

function generateReport(scan){
  let md='## Auto-Learn Fingerprints Report\n\n';
  md+='| Metric | Count |\n|---|---|\n';
  md+='| Drivers scanned | '+scan.stats.drivers+' |\n';
  md+='| Total manufacturers | '+scan.stats.totalMfrs+' |\n';
  md+='| Total productIds | '+scan.stats.totalPids+' |\n';
  md+='| Tuya _T* mfrs | '+scan.tuyaMfrs+' |\n';
  md+='| Non-Tuya mfrs | '+scan.nonTuyaMfrs.length+' |\n';
  md+='| TS* pids | '+scan.tsPids+' |\n';
  md+='| Non-TS pids | '+scan.nonTsPids.length+' |\n\n';
  if(scan.nonTuyaMfrs.length){
    md+='### Non-Tuya Manufacturers\n';
    md+=scan.nonTuyaMfrs.map(m=>'`'+m+'`').join(', ')+'\n\n';
  }
  if(scan.nonTsPids.length){
    md+='### Non-TS Product IDs\n';
    md+=scan.nonTsPids.map(p=>'`'+p+'`').join(', ')+'\n\n';
  }
  return md;
}

if(require.main===module){
  console.log('=== Auto-Learn Fingerprints ===');
  const scan=scanDrivers();
  console.log('Drivers:',scan.stats.drivers);
  console.log('Tuya _T*:',scan.tuyaMfrs,'| Non-Tuya:',scan.nonTuyaMfrs.length);
  console.log('TS*:',scan.tsPids,'| Non-TS:',scan.nonTsPids.length);
  if(scan.nonTuyaMfrs.length)console.log('Non-Tuya mfrs:',scan.nonTuyaMfrs.join(', '));
  if(scan.nonTsPids.length)console.log('Non-TS pids:',scan.nonTsPids.join(', '));

  const updated=updateLoadFingerprints(scan.nonTuyaMfrs,scan.nonTsPids);
  console.log('Updated:',updated);

  // Write report
  const report=generateReport(scan);
  const reportFile=path.join(__dirname,'..','state','auto-learn-report.md');
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});
  fs.writeFileSync(reportFile,report);
  console.log('Report:',reportFile);

  // GitHub Actions outputs
  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      'non_tuya_mfrs='+scan.nonTuyaMfrs.length+'\n'+
      'non_ts_pids='+scan.nonTsPids.length+'\n'+
      'updated='+updated+'\n');
  }
  if(process.env.GITHUB_STEP_SUMMARY){
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
  }
}

module.exports={scanDrivers,updateLoadFingerprints,generateReport};
