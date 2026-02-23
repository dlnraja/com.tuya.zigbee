#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const APP='com.dlnraja.tuya.zigbee';
const PAT=process.env.HOMEY_PAT;
const DRY=process.env.DRY_RUN==='true';
const SUM=process.env.GITHUB_STEP_SUMMARY||null;

// All known Athom API base URLs (tools.developer.homey.app uses these)
const BASES=[
  'https://apps-sdk-v3.athom.com',
  'https://api.athom.com',
  'https://apps-api.developer.athom.com',
];

if(!PAT){console.error('HOMEY_PAT not set');process.exit(1);}
const H={'Authorization':'Bearer '+PAT,'Content-Type':'application/json','Accept':'application/json'};

function log(t){console.log(t);if(SUM)try{fs.appendFileSync(SUM,t+'\n')}catch{}}

async function api(url,method,body){
  const o={method,headers:{...H}};
  if(body)o.body=JSON.stringify(body);
  try{
    const r=await fetch(url,o);
    const t=await r.text();
    let d;try{d=JSON.parse(t)}catch{d=t}
    return{ok:r.ok,status:r.status,data:d,url};
  }catch(e){return{ok:false,status:0,data:e.message,url}}
}

// Try all bases for an endpoint
async function tryAll(method,ep,body){
  for(const base of BASES){
    const r=await api(base+ep,method,body);
    if(r.ok)return r;
    log('  '+r.status+' '+base+ep);
  }
  return null;
}

// Discover app versions from multiple possible endpoints
async function discoverVersions(ver){
  const versions=new Map(); // version -> status
  versions.set(ver,'unknown');

  // Try getting app info (contains versions list)
  const appEndpoints=[
    '/api/app/'+APP,
    '/app/'+APP,
    '/api/manager/devkit/app/'+APP,
  ];
  for(const ep of appEndpoints){
    const r=await tryAll('GET',ep);
    if(r&&r.data){
      const d=r.data;
      log('App info from: '+r.url);
      // Extract versions from various response shapes
      const vList=d.versions||d.liveBuild?.versions||d.builds||[];
      if(Array.isArray(vList)){
        for(const v of vList){
          const vn=v.version||v.id||v.name;
          const vs=v.status||v.channel||v.state||'unknown';
          if(vn)versions.set(vn,vs);
        }
      }
      // Single version object in app info
      if(d.version&&d.status)versions.set(d.version,d.status);
      if(d.latestVersion){
        const lv=typeof d.latestVersion==='string'?d.latestVersion:d.latestVersion.version;
        if(lv)versions.set(lv,d.latestVersion.status||'unknown');
      }
      break;
    }
  }

  // Check specific version
  const verEndpoints=[
    '/api/app/'+APP+'/version/'+ver,
    '/app/'+APP+'/version/'+ver,
    '/api/manager/devkit/app/'+APP+'/version/'+ver,
  ];
  for(const ep of verEndpoints){
    const r=await tryAll('GET',ep);
    if(r&&r.data){
      const st=r.data.status||r.data.channel||r.data.state||'unknown';
      versions.set(ver,st);
      log('v'+ver+' status: '+st+' (from '+r.url+')');
      log('Full version info: '+JSON.stringify(r.data).slice(0,500));
      break;
    }
  }

  return versions;
}

// Try all known API patterns to promote a version to test
async function promoteToTest(v){
  log('\n--- Promoting v'+v+' to Test ---');

  // All known endpoint patterns for draft->test promotion
  const attempts=[
    // Pattern 1: PUT /version/{v}/test
    ['PUT','/api/app/'+APP+'/version/'+v+'/test',null],
    ['PUT','/app/'+APP+'/version/'+v+'/test',null],
    // Pattern 2: POST /version/{v}/publish with channel
    ['POST','/api/app/'+APP+'/version/'+v+'/publish',{channel:'test'}],
    ['POST','/app/'+APP+'/version/'+v+'/publish',{channel:'test'}],
    // Pattern 3: PUT /version/{v}/publish
    ['PUT','/api/app/'+APP+'/version/'+v+'/publish',{channel:'test'}],
    // Pattern 4: PATCH version status
    ['PATCH','/api/app/'+APP+'/version/'+v,{status:'test'}],
    ['PATCH','/app/'+APP+'/version/'+v,{channel:'test'}],
    // Pattern 5: PUT build/test
    ['PUT','/api/app/'+APP+'/build/test',{version:v}],
    ['PUT','/app/'+APP+'/build/test',{version:v}],
    // Pattern 6: POST release
    ['POST','/api/app/'+APP+'/version/'+v+'/release',{channel:'test'}],
    ['POST','/app/'+APP+'/version/'+v+'/release',{channel:'test'}],
    // Pattern 7: devkit endpoints
    ['PUT','/api/manager/devkit/app/'+APP+'/version/'+v+'/test',null],
    ['POST','/api/manager/devkit/app/'+APP+'/version/'+v+'/publish',{channel:'test'}],
  ];

  for(const [method,ep,body] of attempts){
    log('  '+method+' '+ep+(body?' '+JSON.stringify(body):''));
    for(const base of BASES){
      const r=await api(base+ep,method,body);
      if(r.ok){
        log('  ✓ SUCCESS via '+r.url);
        log('  Response: '+JSON.stringify(r.data).slice(0,300));
        return true;
      }
      // Log non-404 errors (404 = wrong endpoint, expected)
      if(r.status!==404&&r.status!==0){
        log('  '+r.status+': '+JSON.stringify(r.data).slice(0,200));
      }
    }
  }
  return false;
}

async function main(){
  const ver=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version;
  log('## Auto-Publish Draft → Test');
  log('App: '+APP+' | Current: v'+ver+' | DRY='+DRY);
  log('PAT: '+PAT.slice(0,8)+'...('+PAT.length+' chars)');

  // Step 1: Discover all versions and their statuses
  log('\n### Step 1: Discover versions');
  const versions=await discoverVersions(ver);
  log('Found '+versions.size+' version(s):');
  for(const[v,s]of versions)log('  v'+v+' → '+s);

  // Step 2: Find drafts to promote
  const drafts=[];
  for(const[v,s]of versions){
    const sl=String(s).toLowerCase();
    if(sl==='draft'||sl==='unknown'||sl==='pending')drafts.push(v);
  }
  // Always include current version if not already test/live
  const curStatus=String(versions.get(ver)||'').toLowerCase();
  if(curStatus!=='test'&&curStatus!=='live'&&!drafts.includes(ver)){
    drafts.unshift(ver);
  }

  if(!drafts.length){
    log('\nNo drafts to promote. All versions are already test/live.');
    return;
  }
  log('\nDrafts to promote: '+drafts.join(', '));

  if(DRY){log('\nDRY RUN — would promote: '+drafts.join(', '));return;}

  // Step 3: Promote each draft
  let promoted=0;
  for(const v of drafts){
    const ok=await promoteToTest(v);
    if(ok)promoted++;
  }

  log('\n### Result: '+promoted+'/'+drafts.length+' promoted to Test');
  if(promoted===0){
    log('\n⚠️ Could not auto-promote via API.');
    log('Manual action needed at: https://tools.developer.homey.app/apps/app/'+APP+'/versions');
    log('Steps: Click version → "Publish to Test"');
  }
  log('\nManage: https://tools.developer.homey.app/apps/app/'+APP);
}

main().catch(e=>{console.error('Fatal:',e);process.exit(1)});
