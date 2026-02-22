#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const APP='com.dlnraja.tuya.zigbee';
const PAT=process.env.HOMEY_PAT;
const DRY=process.env.DRY_RUN==='true';
const SUM=process.env.GITHUB_STEP_SUMMARY||null;
const BASES=['https://api.athom.com','https://apps-sdk-v3.athom.com'];
if(!PAT){console.error('HOMEY_PAT not set');process.exit(1);}
const H={'Authorization':'Bearer '+PAT,'Content-Type':'application/json'};

async function api(base,m,ep,b){
  const u=base+ep,o={method:m,headers:H};
  if(b)o.body=JSON.stringify(b);
  try{const r=await fetch(u,o),t=await r.text();
    let d;try{d=JSON.parse(t)}catch{d=t}
    return{ok:r.ok,s:r.status,d};
  }catch(e){return{ok:false,s:0,d:e.message}}
}

async function tryBases(m,ep,b){
  for(const base of BASES){
    const r=await api(base,m,ep,b);
    if(r.ok)return r;
    console.log('  '+base+ep+' => '+r.s);
  }
  return{ok:false,s:0,d:'All API bases failed'};
}

function log(t){console.log(t);if(SUM)fs.appendFileSync(SUM,t+'\n');}

async function main(){
  const ver=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version;
  log('## Auto-Publish Draft to Test');
  log('App: '+APP+' v'+ver+' DRY='+DRY);

  // Step 1: Get app info and find versions
  log('\n### Step 1: Fetch app info');
  const appPaths=['/api/app/'+APP,'/app/'+APP];
  let appInfo=null;
  for(const ep of appPaths){
    const r=await tryBases('GET',ep);
    if(r.ok){appInfo=r.d;log('App found: '+JSON.stringify(r.d).slice(0,300));break;}
  }

  // Step 2: Get version info
  log('\n### Step 2: Check version '+ver);
  const verPaths=['/api/app/'+APP+'/version/'+ver,'/app/'+APP+'/version/'+ver];
  let verInfo=null;
  for(const ep of verPaths){
    const r=await tryBases('GET',ep);
    if(r.ok){verInfo=r.d;log('Version info: '+JSON.stringify(r.d).slice(0,300));break;}
  }

  if(verInfo){
    const status=verInfo.status||verInfo.channel||'unknown';
    log('Current status: '+status);
    if(status==='test'||status==='live'){
      log('Already published to '+status+' - nothing to do');
      return;
    }
  }

  if(DRY){log('DRY RUN - would publish to test');return;}

  // Step 3: Publish draft to test
  log('\n### Step 3: Publishing to Test channel');
  const pubEndpoints=[
    ['/api/app/'+APP+'/version/'+ver+'/test','PUT'],
    ['/api/app/'+APP+'/version/'+ver+'/publish','POST'],
    ['/app/'+APP+'/version/'+ver+'/test','PUT'],
    ['/api/app/'+APP+'/version/'+ver+'/publish','PUT'],
    ['/app/'+APP+'/build/test','PUT',{version:ver}],
  ];
  for(const[ep,m,body]of pubEndpoints){
    log('Trying: '+m+' '+ep);
    const r=await tryBases(m,ep,body);
    if(r.ok){
      log('SUCCESS: Draft v'+ver+' published to Test!');
      log('Manage at: https://tools.developer.homey.app/apps/app/'+APP);
      return;
    }
    log('  Result: '+r.s+' '+JSON.stringify(r.d).slice(0,200));
  }

  // Step 4: Fallback - try homey CLI approach
  log('\n### Fallback: Manual action needed');
  log('Could not auto-publish via API. Please publish manually:');
  log('https://tools.developer.homey.app/apps/app/'+APP);
  log('Or run: npx homey app publish');
}

main().catch(e=>{console.error('Fatal:',e);process.exit(1)});
