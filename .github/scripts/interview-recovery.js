#!/usr/bin/env node
'use strict';
/**
 * Interview & Diagnostic Recovery — collects device interviews, crash logs,
 * diagnostic reports from GitHub issues, forum posts, Gmail, and PM data.
 * Consolidates into .github/state/interviews/ for enrichment pipeline.
 */
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const{loadFingerprints,extractMfrFromText}=require('./load-fingerprints');
const{callAI}=require('./ai-helper');
const GH='https://api.github.com';
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const DRY=process.env.DRY_RUN==='true';
const SD=path.join(__dirname,'..','state');
const ID=path.join(SD,'interviews');
const SF=path.join(SD,'interview-recovery-state.json');
const REPOS=['dlnraja/com.tuya.zigbee','JohanBendz/com.tuya.zigbee'];
const hdrs=t=>({Accept:'application/vnd.github+json','User-Agent':'tuya-bot',...(t?{Authorization:'Bearer '+t}:{})});
function loadState(){try{return JSON.parse(fs.readFileSync(SF,'utf8'))}catch{return{lastRun:null,processed:[],total:0}}}
function saveState(s){fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s,null,2))}

const DIAG_PATTERNS=[
  /device\s*interview/i,/diagnostic\s*report/i,/crash\s*log/i,
  /zigbee\s*(?:log|debug|trace)/i,/\bDP\s*\d+\b/i,/cluster\s*0x/i,
  /zb_model_id|zb_manufacturer_name/i,/manufacturerName.*_T[A-Z]/i,
  /\bnode\s*descriptor\b/i,/\bendpoint\s*descriptor\b/i,
  /\bactive\s*endpoints?\b/i,/\bsimple\s*descriptor\b/i
];
function hasDiagData(t){return DIAG_PATTERNS.some(p=>p.test(t))}

async function ghGet(ep){
  try{const r=await fetchWithRetry(GH+ep,{headers:hdrs(TOKEN)},{retries:2,label:'ghGet'});
    if(!r.ok)return null;return r.json()}catch{return null}
}

async function scanGitHubIssues(){
  console.log('=== GitHub Interview Recovery ===');
  let found=0;
  for(const repo of REPOS){
    const issues=await ghGet('/repos/'+repo+'/issues?state=all&per_page=50&sort=updated&direction=desc');
    if(!issues)continue;
    for(const iss of issues){
      const body=iss.body||'';
      const title=iss.title||'';
      const combined=title+'\n'+body;
      if(!hasDiagData(combined))continue;
      const mfrs=extractMfrFromText(combined);
      const key=repo.replace('/','-')+'_'+iss.number;
      const outF=path.join(ID,key+'.json');
      if(fs.existsSync(outF))continue;
      const data={source:'github',repo,issue:iss.number,title:iss.title,
        user:iss.user?.login,date:iss.created_at,url:iss.html_url,
        fingerprints:mfrs,bodyLength:body.length,
        excerpt:body.slice(0,5000)};
      // Check comments for more diagnostic data
      if(iss.comments>0){
        const comments=await ghGet('/repos/'+repo+'/issues/'+iss.number+'/comments?per_page=20');
        if(comments){
          data.diagComments=[];
          for(const c of comments){
            if(hasDiagData(c.body||'')){
              data.diagComments.push({user:c.user?.login,date:c.created_at,
                fps:extractMfrFromText(c.body||''),excerpt:(c.body||'').slice(0,3000)});
            }
          }
        }
      }
      // AI extract structured data
      try{
        const ai=await callAI('Extract structured device info from this GitHub issue.\n'+combined.slice(0,3000),
          'Extract: manufacturerName, productId, DPs, capabilities, errors, device type.');
        if(ai?.text){data.aiAnalysis=ai.text;data.aiModel=ai.model;}
      }catch{}
      fs.mkdirSync(ID,{recursive:true});
      fs.writeFileSync(outF,JSON.stringify(data,null,2));
      found++;console.log('  Saved:',key,'fps='+mfrs.join(','));
    }
  }
  return found;
}

async function scanForumDiagnostics(){
  console.log('=== Forum Diagnostic Recovery ===');
  // Read previously saved forum activity data
  const faFile=path.join(SD,'forum-activity-data.json');
  if(!fs.existsSync(faFile)){console.log('No forum activity data');return 0}
  let found=0;
  try{
    const fa=JSON.parse(fs.readFileSync(faFile,'utf8'));
    const posts=fa.recentPosts||fa.posts||[];
    for(const p of posts){
      const txt=typeof p==='string'?p:(p.text||p.cooked||p.raw||'');
      if(!hasDiagData(txt))continue;
      const mfrs=extractMfrFromText(txt);
      const key='forum_'+(p.topic_id||p.id||Date.now());
      const outF=path.join(ID,key+'.json');
      if(fs.existsSync(outF))continue;
      fs.mkdirSync(ID,{recursive:true});
      fs.writeFileSync(outF,JSON.stringify({source:'forum',topicId:p.topic_id,postId:p.id,
        user:p.username,date:p.created_at,fingerprints:mfrs,excerpt:txt.slice(0,5000)},null,2));
      found++;
    }
  }catch(e){console.log('Forum scan err:',e.message)}
  return found;
}

async function scanGmailDiagnostics(){
  console.log('=== Gmail Diagnostic Recovery ===');
  const gmFile=path.join(SD,'gmail-diagnostics.json');
  if(!fs.existsSync(gmFile)){console.log('No Gmail data');return 0}
  let found=0;
  try{
    const gm=JSON.parse(fs.readFileSync(gmFile,'utf8'));
    const emails=gm.emails||gm.messages||[];
    for(const e of emails){
      const txt=typeof e==='string'?e:(e.body||e.snippet||e.text||'');
      if(!hasDiagData(txt))continue;
      const mfrs=extractMfrFromText(txt);
      const key='gmail_'+(e.id||Date.now());
      const outF=path.join(ID,key+'.json');
      if(fs.existsSync(outF))continue;
      fs.mkdirSync(ID,{recursive:true});
      fs.writeFileSync(outF,JSON.stringify({source:'gmail',emailId:e.id,
        from:e.from,subject:e.subject,date:e.date,fingerprints:mfrs,excerpt:txt.slice(0,5000)},null,2));
      found++;
    }
  }catch(e){console.log('Gmail scan err:',e.message)}
  return found;
}

async function scanPMDiagnostics(){
  console.log('=== PM Diagnostic Recovery ===');
  if(!fs.existsSync(path.join(SD,'pm-diagnostics'))){return 0}
  let found=0;
  try{
    const files=fs.readdirSync(path.join(SD,'pm-diagnostics')).filter(f=>f.endsWith('.json')&&!f.includes('-ai'));
    for(const f of files){
      const data=JSON.parse(fs.readFileSync(path.join(SD,'pm-diagnostics',f),'utf8'));
      const key='pm_'+data.topicId+'_'+data.postId;
      const outF=path.join(ID,key+'.json');
      if(fs.existsSync(outF))continue;
      fs.mkdirSync(ID,{recursive:true});
      fs.writeFileSync(outF,JSON.stringify({...data,source:'forum-pm'},null,2));
      found++;
    }
  }catch(e){console.log('PM scan err:',e.message)}
  return found;
}

async function generateSummary(){
  if(!fs.existsSync(ID))return;
  const files=fs.readdirSync(ID).filter(f=>f.endsWith('.json'));
  const allFps=new Set();const sources={github:0,forum:0,gmail:0,'forum-pm':0};
  for(const f of files){
    try{const d=JSON.parse(fs.readFileSync(path.join(ID,f),'utf8'));
      sources[d.source]=(sources[d.source]||0)+1;
      (d.fingerprints||[]).forEach(fp=>allFps.add(fp));
    }catch{}
  }
  const summary={date:new Date().toISOString(),totalInterviews:files.length,
    sources,uniqueFingerprints:[...allFps].sort()};
  fs.writeFileSync(path.join(SD,'interview-summary.json'),JSON.stringify(summary,null,2));
  console.log('\n=== Interview Recovery Summary ===');
  console.log('Total:',files.length,'| FPs:',allFps.size);
  console.log('Sources:',JSON.stringify(sources));
}

async function main(){
  const st=loadState();
  const gh=await scanGitHubIssues();
  const forum=await scanForumDiagnostics();
  const gmail=await scanGmailDiagnostics();
  const pm=await scanPMDiagnostics();
  await generateSummary();
  st.lastRun=new Date().toISOString();st.total=(st.total||0)+gh+forum+gmail+pm;
  st.lastCounts={github:gh,forum,gmail,pm};
  saveState(st);
  console.log('Recovery complete:',gh+forum+gmail+pm,'new items');
}
main().catch(e=>{console.error('Fatal:',e);process.exit(0)});
