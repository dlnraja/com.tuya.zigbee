#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const DDIR=path.join(ROOT,'drivers');
const DOCS=path.join(ROOT,'docs');

function getStats(){
  const app=JSON.parse(fs.readFileSync(path.join(ROOT,'app.json'),'utf8'));
  const dirs=fs.readdirSync(DDIR).filter(d=>fs.existsSync(path.join(DDIR,d,'driver.compose.json')));
  let fps=0;
  for(const d of dirs){
    try{const c=JSON.parse(fs.readFileSync(path.join(DDIR,d,'driver.compose.json'),'utf8'));
      fps+=(c.zigbee?.manufacturerName||[]).length;}catch{}
  }
  return{version:app.version,drivers:dirs.length,fps,date:new Date().toISOString().split('T')[0]};
}

function updateContributing(stats){
  const f=path.join(DOCS,'CONTRIBUTING.md');
  let md;
  if(fs.existsSync(f)){md=fs.readFileSync(f,'utf8');}
  else{md='# Contributing to Universal Tuya Zigbee\n\n';}
  // Update stats section
  const statsBlock='## Project Stats\n\n'
    +'| Metric | Value |\n|--------|-------|\n'
    +'| Version | v'+stats.version+' |\n'
    +'| Drivers | '+stats.drivers+' |\n'
    +'| Fingerprints | '+stats.fps.toLocaleString()+' |\n'
    +'| Last Updated | '+stats.date+' |\n\n';
  if(md.includes('## Project Stats')){
    md=md.replace(/## Project Stats[\s\S]*?(?=\n## |$)/,statsBlock);
  }else{md+='\n'+statsBlock;}
  // Ensure key sections exist
  if(!md.includes('## How to Add a Device')){
    md+='\n## How to Add a Device\n\n'
      +'1. Get your device fingerprint from Homey Developer Tools\n'
      +'2. Find the matching driver in `drivers/` directory\n'
      +'3. Add the fingerprint to `driver.compose.json`\n'
      +'4. Test with `homey app run`\n'
      +'5. Submit a PR or open an issue\n\n';
  }
  if(!md.includes('## Bug Reports')){
    md+='\n## Bug Reports\n\n'
      +'- Use the [Bug Report template](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=02_bug_report.yml)\n'
      +'- Include your device fingerprint (`_TZxxxx_xxxxx`)\n'
      +'- Include Homey developer tools diagnostic report\n'
      +'- Issues are auto-triaged and responses generated daily\n\n';
  }
  if(!md.includes('## Device Finder')){
    md+='\n## Device Finder\n\n'
      +'Check [Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) to see if your device is already supported.\n'
      +'Each device card includes a bug report button that creates a pre-filled issue.\n\n';
  }
  fs.writeFileSync(f,md);
  console.log('CONTRIBUTING.md updated');
}

function updateReadmeStats(stats){
  const f=path.join(ROOT,'README.md');
  if(!fs.existsSync(f))return;
  let md=fs.readFileSync(f,'utf8');
  // Update driver/FP counts in badges or stats sections
  md=md.replace(/(\d+)\+?\s*drivers/gi,stats.drivers+' drivers');
  md=md.replace(/(\d+)\+?\s*fingerprints/gi,stats.fps+' fingerprints');
  md=md.replace(/Last Updated\|[0-9-]*/,'Last Updated|'+stats.date);
  fs.writeFileSync(f,md);
  console.log('README.md stats updated');
}

function updateProjectStatus(stats){
  const f=path.join(DOCS,'PROJECT_STATUS.md');
  let md='# Project Status\n\n';
  md+='> Auto-generated on '+stats.date+'\n\n';
  md+='## Overview\n\n';
  md+='| Metric | Value |\n|--------|-------|\n';
  md+='| Version | v'+stats.version+' |\n';
  md+='| Drivers | '+stats.drivers+' |\n';
  md+='| Fingerprints | '+stats.fps.toLocaleString()+' |\n';
  md+='| Last Updated | '+stats.date+' |\n\n';
  // Driver breakdown by class
  const classes={};
  for(const d of fs.readdirSync(DDIR)){
    const cf=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    try{const r=JSON.parse(fs.readFileSync(cf,'utf8'));
      const c=r.class||'other';classes[c]=(classes[c]||0)+1;}catch{}
  }
  md+='## Drivers by Category\n\n';
  md+='| Category | Count |\n|----------|-------|\n';
  for(const[c,n]of Object.entries(classes).sort((a,b)=>b[1]-a[1])){
    md+='| '+c+' | '+n+' |\n';
  }
  md+='\n## Links\n\n';
  md+='- [Device Finder](https://dlnraja.github.io/com.tuya.zigbee/)\n';
  md+='- [Install Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)\n';
  md+='- [Forum](https://community.homey.app/t/140352)\n';
  md+='- [GitHub](https://github.com/dlnraja/com.tuya.zigbee)\n';
  fs.mkdirSync(DOCS,{recursive:true});
  fs.writeFileSync(f,md);
  console.log('PROJECT_STATUS.md updated');
}

const stats=getStats();
console.log('Stats: v'+stats.version+', '+stats.drivers+' drivers, '+stats.fps+' FPs');
updateContributing(stats);
updateReadmeStats(stats);
updateProjectStatus(stats);
console.log('All docs updated');
