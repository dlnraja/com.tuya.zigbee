#!/usr/bin/env node
/**
 * scan-forks-recursive.js  Recursively scan all forks of com.tuya.zigbee for new fingerprints.
 * Also scans PRs (open and closed) to identify contributors.
 *
 * Required env: GITHUB_TOKEN
 */
'use strict';
const fs=require('fs'),path=require('path');
const{loadFingerprints}=require('./load-fingerprints');

const OWN='dlnraja/com.tuya.zigbee';
const UPSTREAM='com-tuya-zigbee/com.tuya.zigbee';
const MAX_DEPTH=2; // How deep to follow forks
const CREDITS_FILE=path.join(__dirname,'..','..','CREDITS.md');
const STATE_FILE=path.join(__dirname,'..','state','fork-scan-state.json');
const SUMMARY=process.env.GITHUB_STEP_SUMMARY||'summary.txt';

const TOKEN=process.env.GITHUB_TOKEN;
if(!TOKEN){console.error('GITHUB_TOKEN required');process.exit(1);}

async function fetchGH(url){
  const r=await fetch('https://api.github.com'+url,{headers:{Authorization:'token '+TOKEN,Accept:'application/vnd.github.v3+json'}});
  if(!r.ok){if(r.status===403)console.warn(' Rate limit hit?');throw new Error('GH Error '+r.status+': '+await r.text());}
  return r.json();
}

async function collectForks(repo,depth,visited){
  if(depth>=MAX_DEPTH)return[];
  console.log('  Collecting forks for '+repo+' (depth '+depth+')...');
  const forks=[];
  try{
    const data=await fetchGH('/repos/'+repo+'/forks?per_page=100');
    for(const f of data){
      if(!visited.has(f.full_name)){
        visited.add(f.full_name);
        forks.push(f.full_name);
        const sub=await collectForks(f.full_name,depth+1,visited);
        forks.push(...sub);
      }
    }
  }catch(e){console.error('    Error fetching forks for '+repo+': '+e.message);}
  return forks;
}

async function scanFork(repo,knownFPs,newFPs,credits){
  console.log('  Scanning '+repo+'...');
  try{
    const repoInfo=await fetchGH('/repos/'+repo);
    const branch=repoInfo.default_branch||'master';
    const tree=await fetchGH('/repos/'+repo+'/git/trees/'+branch+'?recursive=1');
    const pathList=tree.tree.filter(n=>n.path.endsWith('driver.compose.json')).map(n=>n.path);
    
    let foundCount=0;
    for(const cp of pathList){
      try{
        const content=await (await fetch('https://raw.githubusercontent.com/'+repo+'/'+branch+'/'+cp)).text();
        const json=JSON.parse(content);
        const fps=[...(json.zigbee?.manufacturerName||[]),...(json.zigbee?.productId||[])];
        for(const fp of fps){
          if(!knownFPs.has(fp)){
            if(!newFPs.has(fp)){
              newFPs.set(fp,{fork:repo,path:cp,date:new Date().toISOString(),driver:path.basename(path.dirname(cp)),branch});
              foundCount++;
            }
            // Track contributor
            const owner=repo.split('/')[0];
            if(!credits.has(owner))credits.set(owner,{fps:[],prs:0,repo});
            if(!credits.get(owner).fps.includes(fp))credits.get(owner).fps.push(fp);
          }
        }
      }catch{}
    }
    if(foundCount>0)console.log('    Found '+foundCount+' new fingerprints in '+repo);
  }catch(e){console.error('    Error scanning '+repo+': '+e.message);}
}

async function scanPRs(repos,credits){
  for(const repo of repos){
    console.log('  Scanning PRs for '+repo+'...');
    try{
      const prs=await fetchGH('/repos/'+repo+'/pulls?state=all&per_page=100');
      for(const pr of prs){
        const user=pr.user?.login;
        if(!user)continue;
        if(!credits.has(user))credits.set(user,{fps:[],prs:0,repo:pr.head?.repo?.full_name||'?'});
        credits.get(user).prs++;
      }
    }catch(e){console.error('    Error scanning PRs for '+repo+': '+e.message);}
  }
}

function updateCredits(credits){
  const sorted=[...credits.entries()].sort((a,b)=>(b[1].fps.length+b[1].prs)-(a[1].fps.length+a[1].prs));
  let md='# Credits & Contributors\n\n';
  md+='> Auto-generated from fork scanning and PR analysis.\n';
  md+='> Last updated: '+new Date().toISOString().split('T')[0]+'\n\n';
  md+='| Contributor | Fingerprints | PRs | Source |\n';
  md+='|------------|-------------|-----|--------|\n';
  for(const[name,data] of sorted){
    if(data.fps.length===0&&data.prs===0)continue;
    md+='| [@'+name+'](https://github.com/'+name+') | '+data.fps.length+' | '+data.prs+' | ['+data.repo+'](https://github.com/'+data.repo+') |\n';
  }
  md+='\n## New Fingerprints by Contributor\n\n';
  for(const[name,data] of sorted){
    if(!data.fps.length)continue;
    md+='### @'+name+'\n';
    md+=data.fps.map(fp=>'- `'+fp+'`').join('\n')+'\n\n';
  }
  fs.mkdirSync(path.dirname(CREDITS_FILE),{recursive:true});
  fs.writeFileSync(CREDITS_FILE,md);
  console.log('CREDITS.md updated with '+sorted.length+' contributors');
}

async function main(){
  const fps=loadFingerprints();
  console.log('Our DB: '+fps.size+' fingerprints');
  const visited=new Set();
  visited.add(OWN);

  // Collect all forks recursively from upstream
  console.log('=== Recursive Fork Collection ===');
  const allForks=await collectForks(UPSTREAM,0,visited);
  console.log('Total forks found: '+allForks.length);

  // Scan each fork
  const newFPs=new Map();
  const credits=new Map();
  console.log('=== Scanning Forks ===');
  for(const fork of allForks){
    await scanFork(fork,fps,newFPs,credits);
    if(newFPs.size%10===0&&newFPs.size>0)console.log('  New FPs so far: '+newFPs.size);
  }

  // Scan PRs for credits
  console.log('=== Scanning PRs ===');
  await scanPRs([OWN,UPSTREAM],credits);

  // Update CREDITS.md
  updateCredits(credits);

  // Save state
  const state={lastRun:new Date().toISOString(),forksScanned:allForks.length,newFPs:newFPs.size,contributors:credits.size};
  fs.mkdirSync(path.dirname(STATE_FILE),{recursive:true});
  fs.writeFileSync(STATE_FILE,JSON.stringify(state,null,2)+'\n');

  // Summary
  let report='## Recursive Fork Scanner\n';
  report+='| Metric | Value |\n|--------|-------|\n';
  report+='| Forks scanned | '+allForks.length+' |\n';
  report+='| Max depth | '+MAX_DEPTH+' |\n';
  report+='| New fingerprints | '+newFPs.size+' |\n';
  report+='| Contributors | '+credits.size+' |\n\n';
  if(newFPs.size>0){
    report+='### New Fingerprints\n| FP | Fork | Driver | Branch |\n|-----|------|--------|--------|\n';
    for(const[fp,info]of[...newFPs.entries()].slice(0,50)){
      report+='| `'+fp+'` | '+info.fork+' | '+info.driver+' | '+(info.branch||'default')+' |\n';
    }
  }
  console.log(report);
  fs.appendFileSync(SUMMARY,report+'\n');

  // Save new FPs for downstream processing (both locations for compat)
  if(newFPs.size>0){
    const data=Object.fromEntries(newFPs);
    fs.writeFileSync(path.join(__dirname,'..','state','new-fork-fps.json'),JSON.stringify(data,null,2)+'\n');
    try{fs.writeFileSync('/tmp/new_fork_fps.json',JSON.stringify(data,null,2)+'\n');}catch{}
  }

  console.log('Done: '+allForks.length+' forks, '+newFPs.size+' new FPs, '+credits.size+' contributors');
}

main().catch(e=>{console.error(e);process.exit(1);});
