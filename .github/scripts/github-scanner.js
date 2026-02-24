/**
 * GitHub Activity Scanner - Scans dlnraja + JohanBendz repos
 * Finds: new issues, PRs, fingerprints in forks, community contributions
 * Uses Gemini AI for analysis, posts findings to forum + GitHub
 */
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const STATE=path.join(__dirname,'..','state','github-state.json');
const DDIR=path.join(__dirname,'..','..','drivers');
const GH='https://api.github.com';
const REPOS=['dlnraja/com.tuya.zigbee','JohanBendz/com.tuya.zigbee'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function loadState(){try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch{return{repos:{},forks:{},lastRun:null}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE),{recursive:true});fs.writeFileSync(STATE,JSON.stringify(s,null,2)+'\n')}

function buildIndex(){
  const idx=new Map();
  if(!fs.existsSync(DDIR))return idx;
  for(const d of fs.readdirSync(DDIR)){
    const f=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(f))continue;
    for(const m of(fs.readFileSync(f,'utf8').match(/"_T[A-Za-z0-9_]+"/g)||[]))
      {const k=m.replace(/"/g,'');if(!idx.has(k))idx.set(k,[]);if(!idx.get(k).includes(d))idx.get(k).push(d)}
  }
  return idx;
}

const extractFP=t=>([...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])]);
const extractImgs=t=>{const u=[];const re=/!\[[^\]]*\]\(([^)]+)\)/g;let m;while((m=re.exec(t||''))!==null)u.push(m[1]);return u};

async function ghFetch(url,token){
  const h={Accept:'application/vnd.github+json','User-Agent':'tuya-bot'};
  if(token)h.Authorization='Bearer '+token;
  const r=await fetchWithRetry(url,{headers:h},{retries:3,label:'ghFetch'});
  if(!r.ok){console.log('  GH API '+r.status+' for '+url);return null}
  return r.json();
}

async function scanRepoIssues(repo,since,token){
  const url=GH+'/repos/'+repo+'/issues?state=all&sort=updated&direction=desc&per_page=30'+(since?'&since='+since:'');
  return await ghFetch(url,token)||[];
}

async function scanRepoPRs(repo,since,token){
  const url=GH+'/repos/'+repo+'/pulls?state=all&sort=updated&direction=desc&per_page=30';
  return await ghFetch(url,token)||[];
}

async function scanForks(repo,token){
  const url=GH+'/repos/'+repo+'/forks?sort=newest&per_page=50';
  return await ghFetch(url,token)||[];
}

async function scanForkForFingerprints(fork,token,idx){
  const newFPs=[];
  // Check if fork has driver.compose.json changes
  const url=GH+'/repos/'+fork.full_name+'/compare/'+fork.parent?.default_branch+'...'+fork.default_branch;
  const diff=await ghFetch(url,token);
  if(!diff||!diff.files)return newFPs;
  for(const f of diff.files){
    if(!f.filename.includes('driver.compose.json'))continue;
    const fps=extractFP(f.patch||'');
    for(const fp of fps){
      if(!idx.has(fp))newFPs.push({fp,file:f.filename,fork:fork.full_name,owner:fork.owner?.login});
    }
  }
  return newFPs;
}

const{callAI,analyzeImage}=require('./ai-helper');

async function main(){
  const token=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  const dryRun=process.env.DRY_RUN!=='false';
  const state=loadState();
  const idx=buildIndex();
  let appVersion='unknown';
  try{appVersion=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}

  console.log('=== GitHub Activity Scanner ===');
  console.log('Mode:',dryRun?'DRY RUN':'LIVE','| Repos:',REPOS.join(', '),'| Index:',idx.size,'fps');

  const findings={issues:[],prs:[],newFPs:[],forkFPs:[]};

  // 1. Scan issues & PRs from both repos
  for(const repo of REPOS){
    const rs=state.repos[repo]||{lastIssue:null,lastPR:null};
    console.log('\n-- Repo:',repo,'--');

    const issues=await scanRepoIssues(repo,rs.lastIssue,token);
    console.log('  Issues:',issues.length);
    let maxDate=rs.lastIssue;
    for(const iss of issues){
      if(iss.pull_request)continue;
      const fps=extractFP((iss.title||'')+' '+(iss.body||''));
      if(!fps.length)continue;
      try{const cm=await ghFetch(GH+'/repos/'+repo+'/issues/'+iss.number+'/comments?per_page=10',token);if(cm)for(const c of cm)for(const f of extractFP(c.body||''))if(!fps.includes(f))fps.push(f)}catch{}
      const newOnes=fps.filter(fp=>!idx.has(fp));
      const existing=fps.filter(fp=>idx.has(fp));
      // Analyze images in issue body
      const imgs=extractImgs(iss.body||'');
      let imgCtx=null;
      if(imgs.length){try{imgCtx=await analyzeImage(imgs[0],'Extract Tuya fingerprints from image. JSON or NULL.')}catch{}}
      if(newOnes.length||existing.length){
        findings.issues.push({repo,number:iss.number,title:iss.title,user:iss.user?.login,
          newFPs:newOnes,existingFPs:existing.map(fp=>({fp,drivers:idx.get(fp)})),
          url:iss.html_url,state:iss.state,imageAnalysis:imgCtx});
        console.log('  #'+iss.number,iss.title?.substring(0,60),'new:',newOnes.length,'existing:',existing.length);
      }
      if(!maxDate||iss.updated_at>maxDate)maxDate=iss.updated_at;
    }
    state.repos[repo]={...rs,lastIssue:maxDate||rs.lastIssue};

    const prs=await scanRepoPRs(repo,null,token);
    console.log('  PRs:',prs.length);
    for(const pr of prs.slice(0,10)){
      const fps=extractFP((pr.title||'')+' '+(pr.body||''));
      if(fps.length){
        findings.prs.push({repo,number:pr.number,title:pr.title,user:pr.user?.login,
          fps,url:pr.html_url,state:pr.state,merged:pr.merged_at?true:false});
      }
    }
    await sleep(1000);
  }

  // 2. Scan JohanBendz forks for new fingerprints
  console.log('\n-- Scanning JohanBendz forks --');
  const forks=await scanForks('JohanBendz/com.tuya.zigbee',token);
  console.log('  Forks found:',forks?.length||0);
  if(forks){
    for(const fork of forks.slice(0,20)){
      const lastChecked=state.forks[fork.full_name];
      if(lastChecked&&new Date(lastChecked)>new Date(Date.now()-7*86400000))continue;
      console.log('  Checking fork:',fork.full_name);
      try{
        const newFPs=await scanForkForFingerprints(fork,token,idx);
        if(newFPs.length){
          findings.forkFPs.push(...newFPs);
          console.log('    NEW fingerprints:',newFPs.map(f=>f.fp).join(', '));
        }
      }catch(e){console.log('    Error:',e.message)}
      state.forks[fork.full_name]=new Date().toISOString();
      await sleep(500);
    }
  }

  // 3. Generate summary with Gemini
  const sysPrompt='You are the automation bot for Universal Tuya Zigbee (com.dlnraja.tuya.zigbee). Analyze GitHub activity findings and produce a concise Markdown summary for posting on the Homey forum topic #140352. Include: new device requests found, fingerprints already supported, fingerprints from forks to integrate, and PRs with useful changes. Be technical and concise. Max 500 words.';
  let summary=null;
  if(findings.issues.length||findings.forkFPs.length||findings.prs.length){
    console.log('\n-- Generating AI summary --');
    const aiRes=await callAI(JSON.stringify(findings,null,2),sysPrompt);
    summary=aiRes?aiRes.text:null;
    if(summary)console.log('AI summary:',summary.length,'chars');
  }

  // 4. Save report
  const report={timestamp:new Date().toISOString(),appVersion,findings,aiSummary:summary};
  const reportPath=path.join(__dirname,'..','state','github-scan-report.json');
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  saveState({...state,lastRun:new Date().toISOString()});

  // 5. Output for GitHub Actions
  console.log('\n=== Summary ===');
  console.log('Issues with FPs:',findings.issues.length);
  console.log('PRs with FPs:',findings.prs.length);
  console.log('New FPs from forks:',findings.forkFPs.length);

  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,'issues='+findings.issues.length+'\nprs='+findings.prs.length+'\nfork_fps='+findings.forkFPs.length+'\n');
  }
  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## GitHub Activity Scanner\n| Source | Count |\n|---|---|\n';
    md+='| Issues with fingerprints | '+findings.issues.length+' |\n';
    md+='| PRs with fingerprints | '+findings.prs.length+' |\n';
    md+='| New FPs from forks | '+findings.forkFPs.length+' |\n';
    if(summary)md+='\n### AI Summary\n'+summary+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
