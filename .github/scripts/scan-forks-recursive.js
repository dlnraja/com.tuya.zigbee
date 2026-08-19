#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{loadFingerprints}=require('./load-fingerprints');
const{fetchWithRetry}=require('./retry-helper');
const ROOT=path.join(__dirname,'..','..');
const GH='https://api.github.com';
const TOKEN=process.env.GH_PAT||process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
const UPSTREAM='JohanBendz/com.tuya.zigbee';
const OWN='dlnraja/com.tuya.zigbee';
const CREDITS_FILE=path.join(ROOT,'docs','CREDITS.md');
const STATE_FILE=path.join(__dirname,'..','state','fork-scan-state.json');
const FORK_FPS_FILE=path.join(__dirname,'..','state','new-fork-fps.json');
function resolveSummaryPath(){
  const env=process.env.GITHUB_STEP_SUMMARY;
  if(env && !(process.platform==='win32' && /^\/dev\/null/i.test(env))){
    return env;
  }
  return path.join(__dirname,'..','state','fork-scan-summary.md');
}
const SUMMARY=resolveSummaryPath();
const MAX_DEPTH=parseInt(process.env.FORK_DEPTH||'3',10);
const MAX_FORKS=parseInt(process.env.FORK_MAX_FORKS||'0',10)||0;
const SKIP_PRS=process.argv.includes('--fast')||process.env.FORK_SKIP_PRS==='1';
const hdrs={Accept:'application/vnd.github+json','User-Agent':'tuya-fork-scanner'};
if(TOKEN)hdrs.Authorization='Bearer '+TOKEN;

async function ghGet(url){
  try{const r=await fetchWithRetry(GH+url,{headers:hdrs},{retries:3,label:'ghFork'});
    if(!r.ok){console.log('  GH '+r.status+': '+url.substring(0,60));return null;}
    return r.json();
  }catch{return null;}
}

async function ghGetAll(url){
  let all=[],page=1;
  while(page<=10){
    const r=await ghGet(url+(url.includes('?')?'&':'?')+'per_page=100&page='+page);
    if(!r||!r.length)break;
    all=all.concat(r);page++;
  }
  return all;
}

// Recursively collect all forks (parent -> children -> grandchildren)
async function collectForks(repo,depth,visited){
  if(depth>MAX_DEPTH||visited.has(repo))return[];
  visited.add(repo);
  console.log('  '.repeat(depth)+'Scanning forks of '+repo+' (depth '+depth+')');
  const forks=await ghGetAll('/repos/'+repo+'/forks');
  if(!forks.length)return[];
  let all=forks.map(f=>({full_name:f.full_name,owner:f.owner?.login||'?',default_branch:f.default_branch||'main',updated:f.updated_at,depth}));
  // Recurse into each fork's forks
  for(const f of forks){
    if(f.forks_count>0&&depth<MAX_DEPTH){
      const sub=await collectForks(f.full_name,depth+1,visited);
      all=all.concat(sub);
    }
  }
  return all;
}

// Get a GitHub tree object containing ONLY drivers/*, to avoid
// downloading the full repo with `?recursive=1` (huge payload).
async function getDriversTree(fork, branch){
  // First: root tree without recursion (small).
  const root=await ghGet('/repos/'+fork.full_name+'/git/trees/'+branch+'?recursive=0');
  const driversEntry=root?.tree?.find(t=>t?.path==='drivers' && t?.type==='tree');
  if(driversEntry?.sha){
    return await ghGet('/repos/'+fork.full_name+'/git/trees/'+driversEntry.sha+'?recursive=1');
  }
  // Fallback: previous (slower) approach.
  return await ghGet('/repos/'+fork.full_name+'/git/trees/'+branch+'?recursive=1');
}

// Scan a single fork for new fingerprints
async function scanFork(fork,fps,newFPs,credits){
  try{
    const tree=await getDriversTree(fork,fork.default_branch);
    if(!tree||!tree.tree)return;
    const composeFiles=tree.tree.filter(t=>t.path&&t.path.match(/drivers\/.*\/driver\.compose\.json/));
    for(const cf of composeFiles){
      try{
        const blob=await ghGet('/repos/'+fork.full_name+'/contents/'+cf.path+'?ref='+fork.default_branch);
        if(!blob||!blob.content)continue;
        const decoded=Buffer.from(blob.content,'base64').toString('utf8');
        const matches=decoded.match(/"_T[A-Za-z0-9_]+"/g)||[];
        const driver=cf.path.match(/drivers\/([^/]+)\//)?.[1]||'unknown';
        for(const m of matches){
          const fp=m.replace(/"/g,'');
          if(!fps.has(fp)&&!newFPs.has(fp)){
            newFPs.set(fp,{fork:fork.full_name,owner:fork.owner,driver,depth:fork.depth});
            if(!credits.has(fork.owner))credits.set(fork.owner,{fps:[],prs:0,repo:fork.full_name});
            credits.get(fork.owner).fps.push(fp);
          }
        }
      }catch{}
    }
    // Also scan branches for this fork
    const branches=await ghGet('/repos/'+fork.full_name+'/branches?per_page=20');
    if(branches&&branches.length>1){
      for(const b of branches.slice(0,5)){
        if(b.name===fork.default_branch)continue;
        try{
          const btree=await getDriversTree(fork,b.name);
          if(!btree||!btree.tree)continue;
          const bComposes=btree.tree.filter(t=>t.path&&t.path.match(/drivers\/.*\/driver\.compose\.json/));
          for(const cf of bComposes){
            const blob=await ghGet('/repos/'+fork.full_name+'/contents/'+cf.path+'?ref='+b.name);
            if(!blob||!blob.content)continue;
            const decoded=Buffer.from(blob.content,'base64').toString('utf8');
            const matches=decoded.match(/"_T[A-Za-z0-9_]+"/g)||[];
            const driver=cf.path.match(/drivers\/([^/]+)\//)?.[1]||'unknown';
            for(const m of matches){
              const fp=m.replace(/"/g,'');
              if(!fps.has(fp)&&!newFPs.has(fp)){
                newFPs.set(fp,{fork:fork.full_name,owner:fork.owner,driver,depth:fork.depth,branch:b.name});
                if(!credits.has(fork.owner))credits.set(fork.owner,{fps:[],prs:0,repo:fork.full_name});
                credits.get(fork.owner).fps.push(fp);
              }
            }
          }
        }catch{}
      }
    }
  }catch(e){console.log('  Skip '+fork.full_name+': '+e.message?.slice(0,40));}
}

// Also scan PRs from all repos for credits
async function scanPRs(repos,credits){
  for(const repo of repos){
    const prs=await ghGetAll('/repos/'+repo+'/pulls?state=all&per_page=50');
    for(const pr of(prs||[])){
      const author=pr.user?.login;
      if(!author||author==='github-actions[bot]')continue;
      if(!credits.has(author))credits.set(author,{fps:[],prs:0,repo});
      credits.get(author).prs++;
    }
  }
}

// Update CREDITS.md
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
  console.log('Config: depth='+MAX_DEPTH+(MAX_FORKS?(', maxForks='+MAX_FORKS):'')+(SKIP_PRS?', skipPRs':''));
  const visited=new Set();
  visited.add(OWN);

  // Collect all forks recursively from upstream
  console.log('=== Recursive Fork Collection ===');
  let allForks=await collectForks(UPSTREAM,0,visited);
  allForks=allForks.filter(f=>f.full_name!==OWN);
  allForks.sort((a,b)=>String(b.updated||'').localeCompare(String(a.updated||'')));
  if(MAX_FORKS>0&&allForks.length>MAX_FORKS){
    console.log('Limiting scan to '+MAX_FORKS+' most recently updated forks (of '+allForks.length+')');
    allForks=allForks.slice(0,MAX_FORKS);
  }
  console.log('Total forks to scan: '+allForks.length);

  // Scan each fork
  const newFPs=new Map();
  const credits=new Map();
  console.log('=== Scanning Forks ===');
  let scanned=0;
  for(const fork of allForks){
    await scanFork(fork,fps,newFPs,credits);
    scanned++;
    if(scanned%10===0)console.log('  Progress: '+scanned+'/'+allForks.length+' forks, new FPs: '+newFPs.size);
  }

  // Scan PRs for credits (optional — needs token; 403 without auth)
  if(!SKIP_PRS&&TOKEN){
    console.log('=== Scanning PRs ===');
    await scanPRs([OWN,UPSTREAM],credits);
  }else if(!SKIP_PRS){
    console.log('=== Scanning PRs skipped (no GH token) ===');
  }

  // Update CREDITS.md only when we found contributor signal
  if(credits.size>0)updateCredits(credits);

  // Save state + fork FP payload (always — implement-fork-fps expects the file)
  const state={
    lastRun:new Date().toISOString(),
    forksScanned:allForks.length,
    maxDepth:MAX_DEPTH,
    maxForks:MAX_FORKS||null,
    newFPs:newFPs.size,
    contributors:credits.size,
    skipPRs:SKIP_PRS,
  };
  fs.mkdirSync(path.dirname(STATE_FILE),{recursive:true});
  fs.writeFileSync(STATE_FILE,JSON.stringify(state,null,2)+'\n');
  fs.writeFileSync(FORK_FPS_FILE,JSON.stringify(Object.fromEntries(newFPs),null,2)+'\n');

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
  try{fs.appendFileSync(SUMMARY,report+'\n');}catch(e){console.log('Summary write skipped: '+e.message);}

  console.log('Done: '+allForks.length+' forks, '+newFPs.size+' new FPs, '+credits.size+' contributors');
  console.log('Wrote '+FORK_FPS_FILE);
}

main().catch(e=>{console.error(e);process.exit(1);});
