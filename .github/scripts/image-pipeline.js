#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..'),DD=path.join(ROOT,'drivers');
const STATE=path.join(__dirname,'..','state');
const SPECS={small:{max:102400},large:{max:512000}};
const args=process.argv.slice(2);
const FIX=args.includes('--fix'),REPORT=args.includes('--report');
const SINGLE=args.find(a=>a.startsWith('--driver='))?.split('=')[1];

function audit(name){
  const d=path.join(DD,name,'assets','images');
  const r={driver:name,issues:[]};
  for(const s of['small','large']){
    const f=path.join(d,s+'.png');
    if(!fs.existsSync(f)){r.issues.push(s+' missing');continue}
    const sz=fs.statSync(f).size;
    r[s]={exists:true,bytes:sz};
    if(sz>SPECS[s].max)r.issues.push(s+' too large');
    if(sz<100)r.issues.push(s+' corrupt');
  }
  return r;
}

function copyFrom(src,dst){
  const sd=path.join(DD,src,'assets','images');
  const dd=path.join(DD,dst,'assets','images');
  if(!fs.existsSync(sd))return false;
  fs.mkdirSync(dd,{recursive:true});
  for(const f of['small.png','large.png']){
    const s=path.join(sd,f),d=path.join(dd,f);
    if(fs.existsSync(s)&&!fs.existsSync(d))fs.copyFileSync(s,d);
  }
  return true;
}

async function main(){
  const dirs=SINGLE?[SINGLE]:fs.readdirSync(DD).filter(d=>fs.existsSync(path.join(DD,d,'driver.compose.json')));
  console.log('Image Pipeline v1.0 — '+dirs.length+' drivers');
  const results=[],issues=[];
  for(const d of dirs){
    const r=audit(d);
    results.push(r);
    if(r.issues.length){issues.push(r);console.log('  '+d+': '+r.issues.join(', '))}
  }
  console.log('\nTotal: '+results.length+' | Issues: '+issues.length);
  if(REPORT||!FIX){
    fs.mkdirSync(STATE,{recursive:true});
    fs.writeFileSync(path.join(STATE,'image-audit.json'),JSON.stringify({date:new Date().toISOString(),total:results.length,issues:issues.length,details:issues},null,2));
    console.log('Report: .github/state/image-audit.json');
  }
  if(!issues.length){console.log('All images OK');return}
  if(!FIX){console.log('Run with --fix to repair');return}
  console.log('\n--- Fixing ---');
  let fixed=0;
  for(const r of issues){
    if(r.issues.some(i=>i.includes('missing'))){
      // Try copy from similar driver
      const compose=JSON.parse(fs.readFileSync(path.join(DD,r.driver,'driver.compose.json'),'utf8'));
      const cls=compose.class||'other';
      const donor=results.find(x=>x.driver!==r.driver&&!x.issues.length&&
        JSON.parse(fs.readFileSync(path.join(DD,x.driver,'driver.compose.json'),'utf8')).class===cls);
      if(donor&&copyFrom(donor.driver,r.driver)){console.log('  '+r.driver+' <- '+donor.driver);fixed++}
      else console.log('  '+r.driver+': no donor found');
    }
  }
  console.log('Fixed: '+fixed+'/'+issues.length);
}
main().catch(e=>{console.error(e.message);process.exit(1)});
