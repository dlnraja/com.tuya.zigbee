#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry,sleep,setThrottle}=require('./retry-helper');
const{extractFP:_vFP,extractFPWithBrands:_vFPB,extractPID:_vPID,isValidTuyaFP}=require('./fp-validator');
const ROOT=path.join(__dirname,'..','..');
const DDIR=path.join(ROOT,'drivers');
const SD=path.join(__dirname,'..','state');
const GH='https://api.github.com';
const TK=process.env.GH_PAT||process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
const UP='JohanBendz/com.tuya.zigbee';
const OWN='dlnraja/com.tuya.zigbee';
const MD=parseInt(process.env.FORK_DEPTH||'3',10);
const DRY=process.env.DRY_RUN==='true';
const SUM=process.env.GITHUB_STEP_SUMMARY||null;
const hdrs={Accept:'application/vnd.github+json','User-Agent':'tuya-verifier'};
if(TK)hdrs.Authorization='Bearer '+TK;
setThrottle('gh',300);
const saveJ=(f,d)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(d,null,2))};
const isVFP=m=>m&&m.length>=6&&!/xxxxxxxx/.test(m)&&m!=='undefined';

// Driver name normalization map
const DMAP={switch_1_gang:'switch_1gang',switch_2_gang:'switch_2gang',switch_3_gang:'switch_3gang',switch_4_gang:'switch_4gang',wall_switch_1_gang:'wall_switch_1gang_1way',wall_switch_2_gang:'wall_switch_2gang_1way',wall_switch_3_gang:'wall_switch_3gang_1way',smoke_sensor:'smoke_detector',doorwindowsensor:'contact_sensor',doorwindowsensor_2:'contact_sensor',flood_sensor:'water_leak_sensor',pirsensor:'motion_sensor',rgb_bulb_E27:'bulb_rgb',tuya_dummy_device:null};
function normD(d){if(DMAP[d]===null)return null;return DMAP[d]||d}

// GitHub API helpers
async function ghGet(url){
  try{const r=await fetchWithRetry(GH+url,{headers:hdrs},{retries:3,label:'gh',queue:'gh'});
    if(!r.ok)return null;return r.json()}catch{return null}
}
async function ghGetAll(url){
  let all=[],pg=1;
  while(pg<=10){
    const r=await ghGet(url+(url.includes('?')?'&':'?')+'per_page=100&page='+pg);
    if(!r||!r.length)break;all=all.concat(r);pg++}
  return all;
}
async function ghBlob(repo,fp,ref){
  try{const r=await ghGet('/repos/'+repo+'/contents/'+fp+'?ref='+ref);
    if(!r||!r.content)return null;
    return Buffer.from(r.content,'base64').toString('utf8')}catch{return null}
}

// === BUILD LOCAL DRIVER INDEX ===
function buildLocal(){
  const idx={mfrs:new Map(),pids:new Map(),drivers:new Set(),composes:{},caps:{},flows:{},dpNums:{},clusters:{}};
  for(const d of fs.readdirSync(DDIR)){
    const cf=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    idx.drivers.add(d);
    try{
      const data=JSON.parse(fs.readFileSync(cf,'utf8'));
      idx.composes[d]=data;
      for(const m of(data.zigbee?.manufacturerName||[]))idx.mfrs.set(m,(idx.mfrs.get(m)||[]).concat(d));
      for(const p of(data.zigbee?.productId||[]))idx.pids.set(p,(idx.pids.get(p)||[]).concat(d));
      // Capabilities
      const allCaps=new Set(data.capabilities||[]);
      if(data.capabilitiesOptions)Object.keys(data.capabilitiesOptions).forEach(c=>allCaps.add(c));
      idx.caps[d]=[...allCaps];
      // Cluster endpoints
      const eps=data.zigbee?.endpoints||{};
      const clusterSet=new Set();
      for(const ep of Object.values(eps)){
        for(const c of(ep.clusters||[]))clusterSet.add(typeof c==='string'?c:(c.id||c.name||JSON.stringify(c)));
      }
      idx.clusters[d]=[...clusterSet];
    }catch{}
    // Flow cards
    const ff=path.join(DDIR,d,'driver.flow.compose.json');
    if(fs.existsSync(ff)){
      try{const fdata=JSON.parse(fs.readFileSync(ff,'utf8'));
        idx.flows[d]={triggers:(fdata.triggers||[]).map(t=>t.id),conditions:(fdata.conditions||[]).map(c=>c.id),actions:(fdata.actions||[]).map(a=>a.id)};
      }catch{}
    }
    // DP numbers from device.js
    const dj=path.join(DDIR,d,'device.js');
    if(fs.existsSync(dj)){
      try{const code=fs.readFileSync(dj,'utf8');
        const dpM=[...(code.match(/dp[_:]?\s*(?:={2,3})\s*(\d+)/g)||[]),...(code.match(/dp\s*:\s*(\d+)/g)||[])];
        idx.dpNums[d]=[...new Set(dpM.map(m=>parseInt(m.match(/(\d+)/)[1])))].filter(n=>n>0&&n<200);
      }catch{}
    }
  }
  return idx;
}

// === RECURSIVE FORK COLLECTION (ascending + descending) ===
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

// Get parent repo (ascending)
async function getParent(repo){
  const info=await ghGet('/repos/'+repo);
  if(!info)return null;
  if(info.parent)return{full_name:info.parent.full_name,owner:info.parent.owner?.login,branch:info.parent.default_branch||'master'};
  if(info.source&&info.source.full_name!==repo)return{full_name:info.source.full_name,owner:info.source.owner?.login,branch:info.source.default_branch||'master'};
  return null;
}

// === DEEP SCAN A SINGLE FORK ===
async function scanForkDeep(fork,local,res){
  try{
    const tree=await ghGet('/repos/'+fork.full_name+'/git/trees/'+fork.branch+'?recursive=1');
    if(!tree||!tree.tree)return;
    const files=tree.tree.filter(t=>t.path&&/^drivers\//.test(t.path));
    const composes=files.filter(t=>/driver\.compose\.json$/.test(t.path));
    const deviceJsFiles=files.filter(t=>/\/device\.js$/.test(t.path));
    const flowJsons=files.filter(t=>/driver\.flow\.compose\.json$/.test(t.path));

    for(const cf of composes){
      await sleep(200);
      const raw=await ghBlob(fork.full_name,cf.path,fork.branch);
      if(!raw)continue;
      let data;try{data=JSON.parse(raw)}catch{continue}
      const drvName=cf.path.match(/drivers\/([^\/]+)\//)?.[1];
      if(!drvName)continue;
      const norm=normD(drvName);
      if(norm===null)continue;

      const remoteMfrs=new Set(data.zigbee?.manufacturerName||[]);
      const remotePids=new Set(data.zigbee?.productId||[]);

      if(local.drivers.has(norm)){
        const ourData=local.composes[norm];
        const ourMfrs=new Set(ourData.zigbee?.manufacturerName||[]);
        const ourPids=new Set(ourData.zigbee?.productId||[]);
        // 1) FP/PID gaps
        const newMfrs=[...remoteMfrs].filter(m=>!ourMfrs.has(m)&&isVFP(m));
        const newPids=[...remotePids].filter(p=>!ourPids.has(p)&&p.length>=4);
        if(newMfrs.length||newPids.length){
          res.fpGaps.push({driver:norm,fork:fork.full_name,owner:fork.owner,newMfrs,newPids,src:drvName});
        }
        // 2) Capability gaps
        const remoteCaps=new Set([...(data.capabilities||[]),...Object.keys(data.capabilitiesOptions||{})]);
        const ourCaps=new Set(local.caps[norm]||[]);
        const newCaps=[...remoteCaps].filter(c=>!ourCaps.has(c)&&c.length>2);
        if(newCaps.length){
          res.capGaps.push({driver:norm,fork:fork.full_name,newCaps,src:drvName});
        }
        // 3) Settings gaps
        const remoteSettings=(data.settings||[]).flatMap(g=>(g.children||[]).map(c=>c.id).filter(Boolean));
        const ourSettings=(ourData.settings||[]).flatMap(g=>(g.children||[]).map(c=>c.id).filter(Boolean));
        const newSettings=remoteSettings.filter(s=>!ourSettings.includes(s));
        if(newSettings.length){
          res.settingsGaps.push({driver:norm,fork:fork.full_name,newSettings,src:drvName});
        }
        // 4) Cluster/endpoint gaps
        const remoteEps=data.zigbee?.endpoints||{};
        const ourEps=ourData.zigbee?.endpoints||{};
        const remoteClusters=new Set();
        for(const ep of Object.values(remoteEps)){
          for(const c of(ep.clusters||[]))remoteClusters.add(typeof c==='string'?c:JSON.stringify(c));
        }
        const ourClusters=new Set(local.clusters[norm]||[]);
        const newClusters=[...remoteClusters].filter(c=>!ourClusters.has(c));
        if(newClusters.length){
          res.clusterGaps.push({driver:norm,fork:fork.full_name,newClusters,src:drvName});
        }
      } else if(remoteMfrs.size>0){
        // New driver not in our repo
        res.newDrivers.push({driver:drvName,norm,fork:fork.full_name,owner:fork.owner,
          mfrs:[...remoteMfrs],pids:[...remotePids],
          hasDev:deviceJsFiles.some(f=>f.path.includes(drvName+'/')),
          hasFlow:flowJsons.some(f=>f.path.includes(drvName+'/'))});
      }
    }

    // 5) Flow card gaps
    for(const ff of flowJsons){
      const drvName=ff.path.match(/drivers\/([^\/]+)\//)?.[1];
      if(!drvName)continue;
      const norm=normD(drvName);
      if(!norm||!local.drivers.has(norm))continue;
      await sleep(200);
      const raw=await ghBlob(fork.full_name,ff.path,fork.branch);
      if(!raw)continue;
      let fdata;try{fdata=JSON.parse(raw)}catch{continue}
      const ourFlow=local.flows[norm]||{triggers:[],conditions:[],actions:[]};
      const remoteTriggers=(fdata.triggers||[]).map(t=>t.id);
      const remoteConditions=(fdata.conditions||[]).map(c=>c.id);
      const remoteActions=(fdata.actions||[]).map(a=>a.id);
      const newTriggers=remoteTriggers.filter(t=>t&&!ourFlow.triggers.includes(t));
      const newConditions=remoteConditions.filter(c=>c&&!ourFlow.conditions.includes(c));
      const newActions=remoteActions.filter(a=>a&&!ourFlow.actions.includes(a));
      if(newTriggers.length||newConditions.length||newActions.length){
        res.flowGaps.push({driver:norm,fork:fork.full_name,newTriggers,newConditions,newActions,src:drvName});
      }
    }

    // 6) DP mapping gaps from device.js
    for(const dj of deviceJsFiles.slice(0,10)){
      const drvName=dj.path.match(/drivers\/([^\/]+)\//)?.[1];
      if(!drvName)continue;
      const norm=normD(drvName);
      if(!norm||!local.drivers.has(norm))continue;
      await sleep(300);
      const code=await ghBlob(fork.full_name,dj.path,fork.branch);
      if(!code||code.length<100)continue;
      const dpMatches=[...(code.match(/dp[_:]?\s*(?:={2,3})\s*(\d+)/g)||[]),...(code.match(/dp\s*:\s*(\d+)/g)||[])];
      const remoteDPs=[...new Set(dpMatches.map(m=>parseInt(m.match(/(\d+)/)[1])))].filter(n=>n>0&&n<200);
      const ourDPs=local.dpNums[norm]||[];
      const missingDPs=remoteDPs.filter(d=>!ourDPs.includes(d));
      if(missingDPs.length){
        res.dpGaps.push({driver:norm,fork:fork.full_name,missingDPs,forkDPs:remoteDPs,ourDPs,src:drvName});
      }
    }
  }catch(e){console.log('  ERR '+fork.full_name+': '+(e.message||'').slice(0,60))}
}

// === SCAN PRs DEEP (extract FPs, drivers, code changes) ===
async function scanPRsDeep(repos,local,res){
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
      const text=(pr.title||'')+' '+(pr.body||'');
      const fps=_vFP(text);
      const newFPs=fps.filter(fp=>!local.mfrs.has(fp));
      if(!newFPs.length)continue;
      await sleep(300);
      const files=await ghGet('/repos/'+repo+'/pulls/'+pr.number+'/files?per_page=30');
      const driverFiles=(files||[]).filter(f=>f.filename&&/^drivers\//.test(f.filename));
      const drivers=[...new Set(driverFiles.map(f=>f.filename.match(/drivers\/([^\/]+)\//)?.[1]).filter(Boolean))];
      for(const fp of newFPs){
        const drv=drivers[0]?normD(drivers[0]):null;
        if(drv&&local.drivers.has(drv)){
          res.prFinds.push({driver:drv,repo,pr:pr.number,state:pr.state,merged:!!pr.merged_at,
            user:pr.user?.login,fp,title:pr.title?.slice(0,80)});
        }
      }
    }
    // Also scan issues for FPs
    console.log('  Issues scan: '+repo);
    let issues=[];
    for(let pg=1;pg<=5;pg++){
      const batch=await ghGet('/repos/'+repo+'/issues?state=all&per_page=100&page='+pg);
      if(!batch||!batch.length)break;
      issues=issues.concat(batch.filter(i=>!i.pull_request));
    }
    for(const issue of issues){
      const text=(issue.title||'')+' '+(issue.body||'');
      const fps=_vFP(text);
      const newFPs=fps.filter(fp=>!local.mfrs.has(fp));
      if(newFPs.length){
        res.issueFinds.push({repo,number:issue.number,state:issue.state,user:issue.user?.login,
          title:issue.title?.slice(0,80),newFPs,labels:(issue.labels||[]).map(l=>l.name)});
      }
    }
  }
}

// === AUTO-APPLY SAFE CHANGES (FPs + PIDs only) ===
function applyFPIntegration(res,local){
  let totalMfrs=0,totalPids=0,modified=new Set();
  const byDriver=new Map();
  for(const item of res.fpGaps){
    if(!byDriver.has(item.driver))byDriver.set(item.driver,{mfrs:new Set(),pids:new Set(),sources:[]});
    const e=byDriver.get(item.driver);
    item.newMfrs.forEach(m=>e.mfrs.add(m));
    item.newPids.forEach(p=>e.pids.add(p));
    e.sources.push(item.fork);
  }
  for(const[drv,data]of byDriver){
    const cf=path.join(DDIR,drv,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    const compose=JSON.parse(fs.readFileSync(cf,'utf8'));
    if(!compose.zigbee)continue;
    const existM=new Set(compose.zigbee.manufacturerName||[]);
    const existP=new Set(compose.zigbee.productId||[]);
    let changed=false;
    for(const m of data.mfrs){
      if(!existM.has(m)){compose.zigbee.manufacturerName.push(m);existM.add(m);totalMfrs++;changed=true;}
    }
    for(const p of data.pids){
      if(!existP.has(p)){
        if(!compose.zigbee.productId)compose.zigbee.productId=[];
        compose.zigbee.productId.push(p);existP.add(p);totalPids++;changed=true;
      }
    }
    if(changed&&!DRY){
      fs.writeFileSync(cf,JSON.stringify(compose,null,2)+'\n');
      modified.add(drv);
      console.log('  '+drv+': +'+data.mfrs.size+'mfrs +'+data.pids.size+'pids <- '+data.sources[0]);
    }
  }
  return{totalMfrs,totalPids,driversModified:modified.size};
}

// === GENERATE COMPREHENSIVE REPORT ===
function generateReport(res,applied,forkCount){
  let r='## Full Fork Verification Report\n';
  r+='| Metric | Value |\n|--------|-------|\n';
  r+='| Forks scanned | '+forkCount+' |\n';
  r+='| FPs integrated | '+applied.totalMfrs+' |\n';
  r+='| PIDs integrated | '+applied.totalPids+' |\n';
  r+='| Drivers modified | '+applied.driversModified+' |\n';
  r+='| New drivers found | '+res.newDrivers.length+' |\n';
  r+='| Capability gaps | '+res.capGaps.length+' |\n';
  r+='| Cluster gaps | '+res.clusterGaps.length+' |\n';
  r+='| Flow card gaps | '+res.flowGaps.length+' |\n';
  r+='| DP mapping gaps | '+res.dpGaps.length+' |\n';
  r+='| Settings gaps | '+res.settingsGaps.length+' |\n';
  r+='| PR finds | '+res.prFinds.length+' |\n';
  r+='| Issue finds | '+res.issueFinds.length+' |\n\n';

  if(res.newDrivers.length){
    r+='### New Drivers (not in our repo)\n| Driver | FPs | Fork |\n|--------|-----|------|\n';
    for(const d of res.newDrivers.slice(0,15))
      r+='| '+d.driver+' | '+d.mfrs.length+' | '+d.fork+' |\n';
    r+='\n';
  }
  if(res.capGaps.length){
    r+='### Capability Gaps\n| Driver | Missing Caps | Fork |\n|--------|-------------|------|\n';
    for(const g of res.capGaps.slice(0,15))
      r+='| '+g.driver+' | '+g.newCaps.join(', ')+' | '+g.fork+' |\n';
    r+='\n';
  }
  if(res.clusterGaps.length){
    r+='### Cluster/Endpoint Gaps\n| Driver | Missing Clusters | Fork |\n|--------|-----------------|------|\n';
    for(const g of res.clusterGaps.slice(0,15))
      r+='| '+g.driver+' | '+g.newClusters.length+' clusters | '+g.fork+' |\n';
    r+='\n';
  }
  if(res.flowGaps.length){
    r+='### Flow Card Gaps\n| Driver | Triggers | Conditions | Actions | Fork |\n|--------|----------|-----------|---------|------|\n';
    for(const g of res.flowGaps.slice(0,15))
      r+='| '+g.driver+' | '+g.newTriggers.length+' | '+g.newConditions.length+' | '+g.newActions.length+' | '+g.fork+' |\n';
    r+='\n';
  }
  if(res.dpGaps.length){
    r+='### DP Mapping Gaps\n| Driver | Missing DPs | Fork |\n|--------|------------|------|\n';
    for(const g of res.dpGaps.slice(0,15))
      r+='| '+g.driver+' | '+g.missingDPs.join(',')+ ' | '+g.fork+' |\n';
    r+='\n';
  }
  if(res.settingsGaps.length){
    r+='### Settings Gaps\n| Driver | Missing Settings | Fork |\n|--------|-----------------|------|\n';
    for(const g of res.settingsGaps.slice(0,15))
      r+='| '+g.driver+' | '+g.newSettings.join(', ')+' | '+g.fork+' |\n';
    r+='\n';
  }
  if(res.prFinds.length){
    r+='### PR Fingerprint Finds\n| PR | Driver | FP | User | State |\n|------|--------|-----|------|-------|\n';
    for(const p of res.prFinds.slice(0,20))
      r+='| #'+p.pr+' | '+p.driver+' | '+p.fp+' | '+p.user+' | '+p.state+' |\n';
    r+='\n';
  }
  return r;
}

// === MAIN ORCHESTRATOR ===
async function main(){
  if(!TK){console.log('No GitHub token - set GH_PAT');process.exit(0)}
  const local=buildLocal();
  console.log('Local: '+local.drivers.size+' drivers, '+local.mfrs.size+' mfrs, '+local.pids.size+' pids');
  console.log('Caps indexed: '+Object.keys(local.caps).length+' drivers');
  console.log('Flows indexed: '+Object.keys(local.flows).length+' drivers');
  console.log('DPs indexed: '+Object.keys(local.dpNums).length+' drivers');
  console.log('Clusters indexed: '+Object.keys(local.clusters).length+' drivers');

  const res={fpGaps:[],capGaps:[],clusterGaps:[],flowGaps:[],dpGaps:[],settingsGaps:[],
    newDrivers:[],prFinds:[],issueFinds:[]};
  const visited=new Set();visited.add(OWN);

  // 1. Ascending: scan parent of upstream (if any)
  console.log('\n=== Ascending: checking parent of '+UP+' ===');
  const parent=await getParent(UP);
  if(parent){
    console.log('Parent: '+parent.full_name);
    await scanForkDeep({full_name:parent.full_name,owner:parent.owner,branch:parent.branch,depth:0},local,res);
    visited.add(parent.full_name);
  } else console.log('No parent found ('+UP+' is root)');

  // 2. Scan upstream directly
  console.log('\n=== Scanning upstream: '+UP+' ===');
  await scanForkDeep({full_name:UP,owner:'JohanBendz',branch:'master',depth:0},local,res);

  // 3. Recursively scan ALL descendant forks
  console.log('\n=== Collecting descendant forks (depth '+MD+') ===');
  const allForks=await collectForks(UP,0,visited);
  console.log('Total forks: '+allForks.length);
  for(const fork of allForks){
    await scanForkDeep(fork,local,res);
    await sleep(500);
  }

  // 4. Also scan non-default branches of upstream
  console.log('\n=== Scanning upstream branches ===');
  const branches=await ghGet('/repos/'+UP+'/branches?per_page=20');
  if(branches&&branches.length>1){
    for(const b of branches.slice(0,5)){
      if(b.name==='master'||b.name==='main')continue;
      console.log('  Branch: '+b.name);
      await scanForkDeep({full_name:UP,owner:'JohanBendz',branch:b.name,depth:0},local,res);
    }
  }

  // 5. Deep PR/issue scan
  console.log('\n=== Deep PR/Issue scan ===');
  await scanPRsDeep([UP,OWN],local,res);

  // 6. Apply safe integrations (FPs + PIDs only)
  console.log('\n=== Applying safe integrations ===');
  const applied=applyFPIntegration(res,local);

  // 7. Save detailed reports
  fs.mkdirSync(SD,{recursive:true});
  saveJ(path.join(SD,'full-verify-report.json'),{
    timestamp:new Date().toISOString(),forksScanned:allForks.length,applied,
    fpGaps:res.fpGaps.length,capGaps:res.capGaps.length,
    clusterGaps:res.clusterGaps.length,flowGaps:res.flowGaps.length,
    dpGaps:res.dpGaps.length,settingsGaps:res.settingsGaps.length,
    newDrivers:res.newDrivers.length,prFinds:res.prFinds.length,issueFinds:res.issueFinds.length
  });
  if(res.newDrivers.length)saveJ(path.join(SD,'verify-new-drivers.json'),res.newDrivers);
  if(res.capGaps.length)saveJ(path.join(SD,'verify-cap-gaps.json'),res.capGaps);
  if(res.clusterGaps.length)saveJ(path.join(SD,'verify-cluster-gaps.json'),res.clusterGaps);
  if(res.flowGaps.length)saveJ(path.join(SD,'verify-flow-gaps.json'),res.flowGaps);
  if(res.dpGaps.length)saveJ(path.join(SD,'verify-dp-gaps.json'),res.dpGaps);
  if(res.settingsGaps.length)saveJ(path.join(SD,'verify-settings-gaps.json'),res.settingsGaps);
  if(res.prFinds.length)saveJ(path.join(SD,'verify-pr-finds.json'),res.prFinds);
  if(res.issueFinds.length)saveJ(path.join(SD,'verify-issue-finds.json'),res.issueFinds);

  // Legacy compat: new-fork-fps.json
  const legacyFPs={};
  for(const item of res.fpGaps){
    for(const m of item.newMfrs){
      if(!legacyFPs[m])legacyFPs[m]={fork:item.fork,owner:item.owner,driver:item.src||item.driver,depth:0};
    }
  }
  if(Object.keys(legacyFPs).length)saveJ(path.join(SD,'new-fork-fps.json'),legacyFPs);
  try{if(Object.keys(legacyFPs).length)fs.writeFileSync('/tmp/new_fork_fps.json',JSON.stringify(legacyFPs,null,2))}catch{}

  // 8. Generate report
  const report=generateReport(res,applied,allForks.length);
  console.log('\n'+report);
  if(SUM)fs.appendFileSync(SUM,report+'\n');

  // Console summary
  console.log('========================================');
  console.log('FULL FORK VERIFICATION COMPLETE');
  console.log('========================================');
  console.log('Forks: '+allForks.length+' | FPs added: '+applied.totalMfrs+' | PIDs: '+applied.totalPids);
  console.log('Drivers modified: '+applied.driversModified);
  console.log('Gaps found: caps='+res.capGaps.length+' clusters='+res.clusterGaps.length+' flows='+res.flowGaps.length+' DPs='+res.dpGaps.length+' settings='+res.settingsGaps.length);
  console.log('New drivers: '+res.newDrivers.length+' | PR finds: '+res.prFinds.length+' | Issue finds: '+res.issueFinds.length);
}

main().catch(e=>{console.error(e);process.exit(1)});
