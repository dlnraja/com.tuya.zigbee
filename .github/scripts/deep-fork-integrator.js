#!/usr/bin/env node
'use strict';
// v5.12.0: Deep Fork Integrator - full driver extraction from ALL forks
// Scans ascending+descending from JohanBendz, any date/status
// Extracts: driver.compose.json (FPs+PIDs+settings), device.js, new drivers
// Auto-integrates safe changes without confirmation
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const ROOT=path.join(__dirname,'..','..');
const DDIR=path.join(ROOT,'drivers');
const SD=path.join(__dirname,'..','state');
const GH='https://api.github.com';
const TK=process.env.GH_PAT||process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
const UP='JohanBendz/com.tuya.zigbee';
const OWN='dlnraja/com.tuya.zigbee';
const MD=parseInt(process.env.FORK_DEPTH||'3',10);
const DRY=process.env.DRY_RUN==='true';
const SUMMARY=process.env.GITHUB_STEP_SUMMARY||null;
const hdrs={Accept:'application/vnd.github+json','User-Agent':'tuya-deep'};
if(TK)hdrs.Authorization='Bearer '+TK;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const saveJ=(f,d)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(d,null,2))};

// Driver name normalization
const DMAP={
  switch_1_gang:'switch_1gang',switch_2_gang:'switch_2gang',
  switch_3_gang:'switch_3gang',switch_4_gang:'switch_4gang',
  wall_switch_1_gang:'wall_switch_1gang_1way',
  wall_switch_2_gang:'wall_switch_2gang_1way',
  wall_switch_3_gang:'wall_switch_3gang_1way',
  smoke_sensor:'smoke_detector',doorwindowsensor:'contact_sensor',
  doorwindowsensor_2:'contact_sensor',flood_sensor:'water_leak_sensor',
  pirsensor:'motion_sensor',rgb_bulb_E27:'bulb_rgb',
  tuya_dummy_device:null
};
function normDriver(d){if(DMAP[d]===null)return null;return DMAP[d]||d}
function isValidFP(m){return m&&m.length>=6&&!/xxxxxxxx/.test(m)&&m!=='undefined'&&m!=='null'}

// GitHub API helpers
async function ghGet(url){
  try{const r=await fetchWithRetry(GH+url,{headers:hdrs},{retries:3,label:'gh'});
    if(!r.ok)return null;return r.json()}catch{return null}
}
async function ghGetAll(url){
  let all=[],pg=1;
  while(pg<=10){
    const r=await ghGet(url+(url.includes('?')?'&':'?')+'per_page=100&page='+pg);
    if(!r||!r.length)break;all=all.concat(r);pg++}
  return all;
}
async function ghBlob(repo,fpath,ref){
  try{const r=await ghGet('/repos/'+repo+'/contents/'+fpath+'?ref='+ref);
    if(!r||!r.content)return null;
    return Buffer.from(r.content,'base64').toString('utf8')}catch{return null}
}

// Build local driver index
function buildLocal(){
  const idx={mfrs:new Map(),pids:new Map(),drivers:new Set(),composes:{}};
  for(const d of fs.readdirSync(DDIR)){
    const cf=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    idx.drivers.add(d);
    try{
      const data=JSON.parse(fs.readFileSync(cf,'utf8'));
      idx.composes[d]=data;
      for(const m of(data.zigbee?.manufacturerName||[]))idx.mfrs.set(m,(idx.mfrs.get(m)||[]).concat(d));
      for(const p of(data.zigbee?.productId||[]))idx.pids.set(p,(idx.pids.get(p)||[]).concat(d));
    }catch{}
  }
  return idx;
}

// Recursively collect all forks
async function collectForks(repo,depth,visited){
  if(depth>MD||visited.has(repo))return[];
  visited.add(repo);
  console.log('  '.repeat(depth)+'Forks of '+repo+' (depth '+depth+')');
  const forks=await ghGetAll('/repos/'+repo+'/forks');
  if(!forks.length)return[];
  let all=forks.map(f=>({full_name:f.full_name,owner:f.owner?.login||'?',branch:f.default_branch||'main',updated:f.updated_at,depth}));
  for(const f of forks){
    if(f.forks_count>0&&depth<MD){
      const sub=await collectForks(f.full_name,depth+1,visited);
      all=all.concat(sub);
    }
  }
  return all;
}

// Deep scan a single fork — extract FULL driver data
async function scanForkDeep(fork,local,results){
  try{
    const tree=await ghGet('/repos/'+fork.full_name+'/git/trees/'+fork.branch+'?recursive=1');
    if(!tree||!tree.tree)return;
    const files=tree.tree.filter(t=>t.path&&/^drivers\//.test(t.path));
    const composes=files.filter(t=>/driver\.compose\.json$/.test(t.path));
    const deviceJs=files.filter(t=>/device\.js$/.test(t.path));
    const driverJs=files.filter(t=>/driver\.js$/.test(t.path));
    const flowJsons=files.filter(t=>/driver\.flow\.compose\.json$/.test(t.path));

    for(const cf of composes){
      await sleep(200);
      const raw=await ghBlob(fork.full_name,cf.path,fork.branch);
      if(!raw)continue;
      let data;try{data=JSON.parse(raw)}catch{continue}
      const drvName=cf.path.match(/drivers\/([^\/]+)\//)?.[1];
      if(!drvName)continue;
      const norm=normDriver(drvName);
      if(norm===null)continue; // skip dummy

      const remoteMfrs=new Set(data.zigbee?.manufacturerName||[]);
      const remotePids=new Set(data.zigbee?.productId||[]);

      // Case 1: Driver exists in our repo — check for missing FPs and PIDs
      if(local.drivers.has(norm)){
        const ourData=local.composes[norm];
        const ourMfrs=new Set(ourData.zigbee?.manufacturerName||[]);
        const ourPids=new Set(ourData.zigbee?.productId||[]);
        const newMfrs=[...remoteMfrs].filter(m=>!ourMfrs.has(m)&&isValidFP(m));
        const newPids=[...remotePids].filter(p=>!ourPids.has(p)&&p.length>=4);
        if(newMfrs.length||newPids.length){
          results.fpAdds.push({driver:norm,fork:fork.full_name,owner:fork.owner,
            newMfrs,newPids,srcDriver:drvName});
        }
        // Check for new settings/capabilities in remote compose
        const remoteSettings=(data.settings||[]).map(g=>(g.children||[]).map(c=>c.id)).flat();
        const ourSettings=(ourData.settings||[]).map(g=>(g.children||[]).map(c=>c.id)).flat();
        const newSettings=remoteSettings.filter(s=>s&&!ourSettings.includes(s));
        if(newSettings.length>0){
          results.settingsAdds.push({driver:norm,fork:fork.full_name,newSettings,srcDriver:drvName});
        }
      }
      // Case 2: Driver does NOT exist — potential new driver
      else if(remoteMfrs.size>0){
        results.newDrivers.push({driver:drvName,normalizedAs:norm,fork:fork.full_name,
          owner:fork.owner,mfrs:[...remoteMfrs],pids:[...remotePids],
          hasDeviceJs:deviceJs.some(f=>f.path.includes(drvName+'/')),
          hasDriverJs:driverJs.some(f=>f.path.includes(drvName+'/')),
          hasFlowJson:flowJsons.some(f=>f.path.includes(drvName+'/'))});
      }
    }

    // Scan device.js for DP mapping patterns we don't have
    for(const dj of deviceJs.slice(0,10)){
      const drvName=dj.path.match(/drivers\/([^\/]+)\//)?.[1];
      if(!drvName)continue;
      const norm=normDriver(drvName);
      if(!norm||!local.drivers.has(norm))continue;
      await sleep(300);
      const code=await ghBlob(fork.full_name,dj.path,fork.branch);
      if(!code||code.length<100)continue;
      // Extract DP mappings from fork's device.js
      const dpMatches=code.match(/dp[_:]?\s*(?:===?|==)\s*(\d+)/g)||[];
      const dpNums=[...new Set(dpMatches.map(m=>parseInt(m.match(/(\d+)/)[1])))];
      // Check our device.js for those DPs
      const ourDjPath=path.join(DDIR,norm,'device.js');
      if(!fs.existsSync(ourDjPath))continue;
      const ourCode=fs.readFileSync(ourDjPath,'utf8');
      const ourDPs=[...new Set((ourCode.match(/dp[_:]?\s*(?:===?|==)\s*(\d+)/g)||[]).map(m=>parseInt(m.match(/(\d+)/)[1])))];
      const missingDPs=dpNums.filter(d=>d>0&&d<200&&!ourDPs.includes(d));
      if(missingDPs.length>0){
        results.dpFinds.push({driver:norm,fork:fork.full_name,missingDPs,srcDriver:drvName,
          codeSize:code.length,forkDPs:dpNums,ourDPs});
      }
    }

    // Also scan non-default branches (up to 3)
    const branches=await ghGet('/repos/'+fork.full_name+'/branches?per_page=10');
    if(branches&&branches.length>1){
      for(const b of branches.slice(0,3)){
        if(b.name===fork.branch)continue;
        const btree=await ghGet('/repos/'+fork.full_name+'/git/trees/'+b.name+'?recursive=1');
        if(!btree||!btree.tree)continue;
        const bComposes=btree.tree.filter(t=>t.path&&/drivers\/.*\/driver\.compose\.json$/.test(t.path));
        for(const cf of bComposes){
          await sleep(200);
          const raw=await ghBlob(fork.full_name,cf.path,b.name);
          if(!raw)continue;
          let data;try{data=JSON.parse(raw)}catch{continue}
          const drvName=cf.path.match(/drivers\/([^\/]+)\//)?.[1];
          if(!drvName)continue;
          const norm=normDriver(drvName);
          if(norm===null||!local.drivers.has(norm))continue;
          const remoteMfrs=new Set(data.zigbee?.manufacturerName||[]);
          const ourMfrs=new Set(local.composes[norm]?.zigbee?.manufacturerName||[]);
          const newMfrs=[...remoteMfrs].filter(m=>!ourMfrs.has(m)&&isValidFP(m));
          if(newMfrs.length){
            results.fpAdds.push({driver:norm,fork:fork.full_name,branch:b.name,
              owner:fork.owner,newMfrs,newPids:[],srcDriver:drvName});
          }
        }
      }
    }
  }catch(e){console.log('  ERR '+fork.full_name+': '+(e.message||'').slice(0,60))}
}

// Auto-apply safe changes: add missing FPs and PIDs to driver.compose.json
function applyIntegration(results,local){
  let totalMfrs=0,totalPids=0,driversModified=new Set();
  // Deduplicate fpAdds by driver
  const byDriver=new Map();
  for(const item of results.fpAdds){
    if(!byDriver.has(item.driver))byDriver.set(item.driver,{mfrs:new Set(),pids:new Set(),sources:[]});
    const e=byDriver.get(item.driver);
    item.newMfrs.forEach(m=>e.mfrs.add(m));
    item.newPids.forEach(p=>e.pids.add(p));
    e.sources.push(item.fork+(item.branch?'@'+item.branch:''));
  }
  for(const[drv,data]of byDriver){
    const cf=path.join(DDIR,drv,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    const compose=JSON.parse(fs.readFileSync(cf,'utf8'));
    if(!compose.zigbee)continue;
    const existMfrs=new Set(compose.zigbee.manufacturerName||[]);
    const existPids=new Set(compose.zigbee.productId||[]);
    let changed=false;
    for(const m of data.mfrs){
      if(!existMfrs.has(m)){
        compose.zigbee.manufacturerName.push(m);
        existMfrs.add(m);totalMfrs++;changed=true;
      }
    }
    for(const pid of data.pids){
      if(!existPids.has(pid)){
        if(!compose.zigbee.productId)compose.zigbee.productId=[];
        compose.zigbee.productId.push(pid);
        existPids.add(pid);totalPids++;changed=true;
      }
    }
    if(changed&&!DRY){
      fs.writeFileSync(cf,JSON.stringify(compose,null,2)+'\n');
      driversModified.add(drv);
      console.log('  '+drv+': +'+data.mfrs.size+'mfrs +'+data.pids.size+'pids <- '+data.sources[0]);
    }
  }
  return{totalMfrs,totalPids,driversModified:driversModified.size};
}

// Also scan PRs from upstream+own for complete driver diffs
async function scanPRsDeep(repos,local,results){
  for(const repo of repos){
    console.log('\n=== PR deep scan: '+repo+' ===');
    let prs=[];
    for(let pg=1;pg<=5;pg++){
      const batch=await ghGet('/repos/'+repo+'/pulls?state=all&per_page=100&page='+pg);
      if(!batch||!batch.length)break;
      prs=prs.concat(batch);
    }
    console.log('  PRs: '+prs.length);
    for(const pr of prs){
      const fps=(pr.title+' '+(pr.body||'')).match(/_T[A-Z][A-Za-z0-9]{2,5}_[a-z0-9]{4,16}/g)||[];
      const newFPs=fps.filter(fp=>!local.mfrs.has(fp)&&isValidFP(fp));
      if(!newFPs.length)continue;
      // Try to get files changed in this PR for driver context
      await sleep(300);
      const files=await ghGet('/repos/'+repo+'/pulls/'+pr.number+'/files?per_page=30');
      const driverFiles=(files||[]).filter(f=>f.filename&&/^drivers\//.test(f.filename));
      const drivers=[...new Set(driverFiles.map(f=>f.filename.match(/drivers\/([^\/]+)\//)?.[1]).filter(Boolean))];
      for(const fp of newFPs){
        const drv=drivers[0]?normDriver(drivers[0]):null;
        if(drv&&local.drivers.has(drv)){
          results.fpAdds.push({driver:drv,fork:repo,owner:pr.user?.login||'?',
            newMfrs:[fp],newPids:[],srcDriver:drivers[0],prNum:pr.number,prState:pr.state,merged:!!pr.merged_at});
        }
      }
    }
  }
}

async function main(){
  if(!TK){console.log('No GitHub token — set GH_PAT');process.exit(0)}
  const local=buildLocal();
  console.log('Local: '+local.drivers.size+' drivers, '+local.mfrs.size+' mfrs, '+local.pids.size+' pids');

  const results={fpAdds:[],newDrivers:[],dpFinds:[],settingsAdds:[]};
  const visited=new Set();visited.add(OWN);

  // 1. Scan upstream directly
  console.log('\n=== Scanning upstream: '+UP+' ===');
  await scanForkDeep({full_name:UP,owner:'JohanBendz',branch:'master',depth:0},local,results);

  // 2. Recursively scan ALL forks from upstream
  console.log('\n=== Collecting forks recursively (depth '+MD+') ===');
  const allForks=await collectForks(UP,0,visited);
  console.log('Total forks: '+allForks.length);
  for(const fork of allForks){
    await scanForkDeep(fork,local,results);
    await sleep(500);
  }

  // 3. Scan ALL PRs from upstream and own repo
  console.log('\n=== Deep PR scan ===');
  await scanPRsDeep([UP,OWN],local,results);

  // 4. Apply safe integrations
  console.log('\n=== Applying integrations ===');
  const applied=applyIntegration(results,local);

  // 5. Save reports
  const report={
    timestamp:new Date().toISOString(),
    forksScanned:allForks.length,
    applied,
    newDriversFound:results.newDrivers.length,
    dpFindsCount:results.dpFinds.length,
    settingsFinds:results.settingsAdds.length,
    fpAddsTotal:results.fpAdds.length
  };
  saveJ(path.join(SD,'deep-fork-report.json'),report);
  saveJ(path.join(SD,'fork-new-drivers.json'),results.newDrivers);
  saveJ(path.join(SD,'fork-dp-finds.json'),results.dpFinds);
  if(results.settingsAdds.length)saveJ(path.join(SD,'fork-settings-finds.json'),results.settingsAdds);

  // Also save new-fork-fps.json for backward compat with implement-fork-fps.js
  const legacyFPs={};
  for(const item of results.fpAdds){
    for(const m of item.newMfrs){
      if(!legacyFPs[m])legacyFPs[m]={fork:item.fork,owner:item.owner,driver:item.srcDriver||item.driver,depth:0};
    }
  }
  if(Object.keys(legacyFPs).length)saveJ(path.join(SD,'new-fork-fps.json'),legacyFPs);

  // Summary
  console.log('\n========================================');
  console.log('DEEP FORK INTEGRATION COMPLETE');
  console.log('========================================');
  console.log('Forks scanned: '+allForks.length);
  console.log('FPs added: '+applied.totalMfrs+' | PIDs added: '+applied.totalPids);
  console.log('Drivers modified: '+applied.driversModified);
  console.log('New drivers found: '+results.newDrivers.length);
  console.log('DP mapping gaps: '+results.dpFinds.length);
  console.log('Settings gaps: '+results.settingsAdds.length);
  if(results.newDrivers.length){
    console.log('\nNew drivers not in our repo:');
    for(const d of results.newDrivers.slice(0,20))
      console.log('  '+d.driver+' ('+d.mfrs.length+' FPs) <- '+d.fork);
  }
  if(results.dpFinds.length){
    console.log('\nDP mapping gaps:');
    for(const d of results.dpFinds.slice(0,15))
      console.log('  '+d.driver+': DPs '+d.missingDPs.join(',')+' <- '+d.fork);
  }

  // GitHub step summary
  if(SUMMARY){
    let sm='## Deep Fork Integrator\n';
    sm+='| Metric | Value |\n|--------|-------|\n';
    sm+='| Forks scanned | '+allForks.length+' |\n';
    sm+='| FPs integrated | '+applied.totalMfrs+' |\n';
    sm+='| PIDs integrated | '+applied.totalPids+' |\n';
    sm+='| Drivers modified | '+applied.driversModified+' |\n';
    sm+='| New drivers found | '+results.newDrivers.length+' |\n';
    sm+='| DP mapping gaps | '+results.dpFinds.length+' |\n';
    sm+='| Settings gaps | '+results.settingsAdds.length+' |\n';
    if(results.newDrivers.length){
      sm+='\n**New drivers:**\n';
      for(const d of results.newDrivers.slice(0,10))
        sm+='- `'+d.driver+'` ('+d.mfrs.length+' FPs) <- '+d.fork+'\n';
    }
    fs.appendFileSync(SUMMARY,sm+'\n');
  }
}

main().catch(e=>{console.error(e);process.exit(1)});
