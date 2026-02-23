#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const ROOT=path.join(__dirname,'..','..');
const REPO='JohanBendz/com.tuya.zigbee';
const OWN='dlnraja/com.tuya.zigbee';
const STATE=path.join(__dirname,'..','state');
const OUT=path.join(STATE,'johan-full-scan.json');
fs.mkdirSync(STATE,{recursive:true});

// Load our fingerprints
function loadOurFPs(){
  const fps=new Set();const ddir=path.join(ROOT,'drivers');
  for(const d of fs.readdirSync(ddir)){
    const cf=path.join(ddir,d,'driver.compose.json');
    if(!fs.existsSync(cf))continue;
    try{const r=JSON.parse(fs.readFileSync(cf,'utf8'));
      (r.zigbee?.manufacturerName||[]).forEach(m=>fps.add(m));
    }catch{}
  }
  return fps;
}

function extractFP(text){return[...new Set((text||'').match(/_T[A-Z][A-Za-z0-9]{2,5}_[a-z0-9]{4,16}/g)||[])];}
function extractPID(text){return[...new Set((text||'').match(/\bTS[0-9]{3,4}[A-Z]?\b/g)||[])];}

function gh(cmd){
  try{return execSync('gh '+cmd,{encoding:'utf8',maxBuffer:50*1024*1024,timeout:120000});}
  catch(e){console.log('  gh error: '+e.message?.slice(0,80));return'';}
}

async function main(){
  const ourFPs=loadOurFPs();
  console.log('Our FPs: '+ourFPs.size);
  const report={timestamp:new Date().toISOString(),issues:{total:0,withFPs:0,newFPs:[],categories:{}},prs:{total:0,withFPs:0,newFPs:[],contributors:{}},allNewFPs:[],allMentionedFPs:[],summary:{}};

  // === SCAN ALL ISSUES (open + closed) ===
  console.log('\n=== Scanning ALL issues from '+REPO+' ===');
  let page=1,allIssues=[];
  while(page<=20){
    console.log('  Issues page '+page+'...');
    const raw=gh('api "/repos/'+REPO+'/issues?state=all&per_page=100&page='+page+'&sort=updated&direction=desc" --paginate=false');
    if(!raw)break;
    try{
      const items=JSON.parse(raw);
      if(!items.length)break;
      // Filter out PRs (GitHub API returns PRs as issues too)
      const issues=items.filter(i=>!i.pull_request);
      allIssues=allIssues.concat(issues);
      page++;
      if(items.length<100)break;
    }catch{break;}
  }
  console.log('  Total issues fetched: '+allIssues.length);
  report.issues.total=allIssues.length;

  for(const issue of allIssues){
    const text=(issue.title||'')+' '+(issue.body||'');
    const fps=extractFP(text);
    const pids=extractPID(text);
    if(fps.length)report.issues.withFPs++;
    const newFPs=fps.filter(fp=>!ourFPs.has(fp));
    if(newFPs.length){
      report.issues.newFPs.push({number:issue.number,title:issue.title?.slice(0,80),state:issue.state,fps:newFPs,pids,user:issue.user?.login,updated:issue.updated_at?.split('T')[0],labels:(issue.labels||[]).map(l=>l.name)});
    }
    // Track all mentioned FPs
    fps.forEach(fp=>report.allMentionedFPs.push({fp,source:'issue#'+issue.number,state:issue.state,isNew:!ourFPs.has(fp)}));
    // Categorize
    const labels=(issue.labels||[]).map(l=>l.name).join(',');
    const cat=labels.includes('bug')?'bug':labels.includes('enhancement')||labels.includes('feature')?'feature':fps.length?'device_request':'other';
    report.issues.categories[cat]=(report.issues.categories[cat]||0)+1;
  }

  // === SCAN ALL PRs (open + closed + merged) ===
  console.log('\n=== Scanning ALL PRs from '+REPO+' ===');
  page=1;let allPRs=[];
  while(page<=20){
    console.log('  PRs page '+page+'...');
    const raw=gh('api "/repos/'+REPO+'/pulls?state=all&per_page=100&page='+page+'&sort=updated&direction=desc" --paginate=false');
    if(!raw)break;
    try{
      const items=JSON.parse(raw);
      if(!items.length)break;
      allPRs=allPRs.concat(items);
      page++;
      if(items.length<100)break;
    }catch{break;}
  }
  console.log('  Total PRs fetched: '+allPRs.length);
  report.prs.total=allPRs.length;

  for(const pr of allPRs){
    const text=(pr.title||'')+' '+(pr.body||'');
    const fps=extractFP(text);
    const pids=extractPID(text);
    if(fps.length)report.prs.withFPs++;
    const newFPs=fps.filter(fp=>!ourFPs.has(fp));
    const author=pr.user?.login||'?';
    if(!report.prs.contributors[author])report.prs.contributors[author]={prs:0,fps:[],merged:0};
    report.prs.contributors[author].prs++;
    if(pr.merged_at)report.prs.contributors[author].merged++;
    if(newFPs.length){
      report.prs.newFPs.push({number:pr.number,title:pr.title?.slice(0,80),state:pr.state,merged:!!pr.merged_at,fps:newFPs,pids,user:author,updated:pr.updated_at?.split('T')[0]});
      report.prs.contributors[author].fps.push(...newFPs);
    }
    fps.forEach(fp=>report.allMentionedFPs.push({fp,source:'PR#'+pr.number,state:pr.state,merged:!!pr.merged_at,isNew:!ourFPs.has(fp)}));
  }

  // === ALSO CHECK RECENT COMMENTS on top issues ===
  console.log('\n=== Scanning recent comments on top issues ===');
  const recentIssues=allIssues.filter(i=>new Date(i.updated_at)>new Date(Date.now()-90*86400000)).slice(0,30);
  for(const issue of recentIssues){
    try{
      const raw=gh('api "/repos/'+REPO+'/issues/'+issue.number+'/comments?per_page=50" --paginate=false');
      if(!raw)continue;
      const comments=JSON.parse(raw);
      for(const c of comments){
        const fps=extractFP(c.body||'');
        const newFPs=fps.filter(fp=>!ourFPs.has(fp));
        if(newFPs.length){
          report.issues.newFPs.push({number:issue.number,title:'[comment] '+issue.title?.slice(0,60),state:issue.state,fps:newFPs,user:c.user?.login,updated:c.updated_at?.split('T')[0],fromComment:true});
        }
        fps.forEach(fp=>report.allMentionedFPs.push({fp,source:'comment#'+issue.number,isNew:!ourFPs.has(fp)}));
      }
    }catch{}
  }

  // === DEDUPLICATE AND SUMMARIZE ===
  const allNew=new Map();
  [...report.issues.newFPs,...report.prs.newFPs].forEach(item=>{
    (item.fps||[]).forEach(fp=>{
      if(!allNew.has(fp))allNew.set(fp,{sources:[],users:new Set()});
      allNew.get(fp).sources.push((item.fromComment?'comment':'')+'#'+item.number+' ('+item.state+')');
      allNew.get(fp).users.add(item.user||'?');
    });
  });
  report.allNewFPs=[...allNew.entries()].map(([fp,info])=>({fp,sources:info.sources.slice(0,5),users:[...info.users]}));
  report.summary={
    totalIssues:allIssues.length,
    totalPRs:allPRs.length,
    issuesWithFPs:report.issues.withFPs,
    prsWithFPs:report.prs.withFPs,
    newFPsFromIssues:report.issues.newFPs.length,
    newFPsFromPRs:report.prs.newFPs.length,
    totalUniqueNewFPs:allNew.size,
    totalContributors:Object.keys(report.prs.contributors).length,
    categories:report.issues.categories
  };

  // Save full report
  fs.writeFileSync(OUT,JSON.stringify(report,null,2));
  console.log('\n========================================');
  console.log('FULL SCAN COMPLETE: '+REPO);
  console.log('========================================');
  console.log('Issues: '+allIssues.length+' ('+report.issues.withFPs+' with FPs)');
  console.log('PRs: '+allPRs.length+' ('+report.prs.withFPs+' with FPs)');
  console.log('New FPs not in our DB: '+allNew.size);
  console.log('Contributors: '+Object.keys(report.prs.contributors).length);
  console.log('Categories:', JSON.stringify(report.issues.categories));
  console.log('\nTop new fingerprints:');
  [...allNew.entries()].slice(0,30).forEach(([fp,info])=>{
    console.log('  '+fp+' <- '+info.sources[0]+' by '+[...info.users].join(','));
  });
  console.log('\nTop contributors:');
  Object.entries(report.prs.contributors).sort((a,b)=>(b[1].prs+b[1].fps.length)-(a[1].prs+a[1].fps.length)).slice(0,15).forEach(([u,d])=>{
    console.log('  @'+u+': '+d.prs+' PRs ('+d.merged+' merged), '+d.fps.length+' new FPs');
  });
  console.log('\nReport saved: '+OUT);
}

main().catch(e=>{console.error(e);process.exit(1);});
