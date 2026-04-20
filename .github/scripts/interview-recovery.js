#!/usr/bin/env node
'use strict';
/**
 * v5.11.29: Interview & Diagnostic Recovery  collects device interviews, crash logs,
 * diagnostic reports from ALL sources: GitHub issues, forum posts (direct API), Gmail, PMs.
 * Consolidates into .github/state/interviews/ + docs/data/interviews/ (project resources).
 * Also detects hidden/flagged posts and cross-references expectations-ref.json.
 */
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const{extractMfrFromText}=require('./load-fingerprints');
const{callAI}=require('./ai-helper');
const GH='https://api.github.com';
const FORUM='https://community.homey.app';
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const DRY=process.env.DRY_RUN==='true';
const SD=path.join(__dirname,'..','state');
const ID=path.join(SD,'interviews');
const RESOURCE_DIR=path.join(__dirname,'..','..','docs','data','interviews');
const SF=path.join(SD,'interview-recovery-state.json');
const REPOS=['dlnraja/com.tuya.zigbee','JohanBendz/com.tuya.zigbee'];
const FORUM_TOPICS=[140352,26439,146735,89271,54018,12758,85498];
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
  console.log('=== Forum Diagnostic Recovery (direct API) ===');
  let found=0,hidden=0;
  for(const tid of FORUM_TOPICS){
    try{
      const r=await fetchWithRetry(FORUM+'/t/'+tid+'.json',{},{retries:2,label:'forum-t'+tid});
      if(!r.ok)continue;
      const d=await r.json();
      const highest=d.highest_post_number||0;
      // Scan last 50 posts for interview data
      const from=Math.max(1,highest-50);
      const r2=await fetchWithRetry(FORUM+'/t/'+tid+'/'+from+'.json',{},{retries:2,label:'forum-posts'});
      if(!r2.ok)continue;
      const posts=(await r2.json()).post_stream?.posts||[];
      for(const p of posts){
        // Track hidden posts
        if(p.hidden){
          console.log('  HIDDEN: T'+tid+' #'+p.post_number+' @'+p.username+' (id='+p.id+')');
          hidden++;
        }
        const txt=stripHtml(p.cooked||'');
        if(!hasDiagData(txt))continue;
        const mfrs=extractMfrFromText(txt);
        const key='forum_'+tid+'_'+p.id;
        const outF=path.join(ID,key+'.json');
        if(fs.existsSync(outF))continue;
        const data={source:'forum',topicId:tid,postId:p.id,postNumber:p.post_number,
          user:p.username,date:p.created_at,fingerprints:mfrs,hidden:!!p.hidden,
          excerpt:txt.slice(0,5000)};
        fs.mkdirSync(ID,{recursive:true});
        fs.writeFileSync(outF,JSON.stringify(data,null,2));
        // Also save as project resource
        saveAsResource(key,data);
        found++;
      }
    }catch(e){console.log('Forum T'+tid+' err:',e.message)}
  }
  // Also read cached forum activity data
  const faFile=path.join(SD,'forum-activity-data.json');
  if(fs.existsSync(faFile)){
    try{
      const fa=JSON.parse(fs.readFileSync(faFile,'utf8'));
      const posts=fa.recentPosts||fa.posts||[];
      for(const p of posts){
        const txt=typeof p==='string'?p:(p.text||p.cooked||p.raw||'');
        if(!hasDiagData(txt))continue;
        const mfrs=extractMfrFromText(txt);
        const key='forum_cached_'+(p.topic_id||p.id||Date.now());
        const outF=path.join(ID,key+'.json');
        if(fs.existsSync(outF))continue;
        fs.mkdirSync(ID,{recursive:true});
        fs.writeFileSync(outF,JSON.stringify({source:'forum',topicId:p.topic_id,postId:p.id,
          user:p.username,date:p.created_at,fingerprints:mfrs,excerpt:txt.slice(0,5000)},null,2));
        found++;
      }
    }catch(e){console.log('Cached forum scan err:',e.message)}
  }
  if(hidden)console.log('   Found '+hidden+' hidden posts across topics');
  return found;
}

function stripHtml(html){
  return(html||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
}

// Save interview as a project resource file
function saveAsResource(key,data){
  try{
    fs.mkdirSync(RESOURCE_DIR,{recursive:true});
    const resFile=path.join(RESOURCE_DIR,key+'.json');
    if(!fs.existsSync(resFile)){
      fs.writeFileSync(resFile,JSON.stringify(data,null,2));
      console.log('  Resource:',key);
    }
  }catch{}
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
  // Cross-reference with expectations-ref.json if available
  try{
    const refFile=path.join(SD,'expectations-ref.json');
    if(fs.existsSync(refFile)){
      const ref=JSON.parse(fs.readFileSync(refFile,'utf8'));
      console.log('Cross-ref: expectations-ref.json loaded ('+ref.version+', '+
        (ref.pending||[]).length+' pending, '+(ref.decisions||[]).length+' decisions)');
    }
  }catch{}
  st.lastRun=new Date().toISOString();st.total=(st.total||0)+gh+forum+gmail+pm;
  st.lastCounts={github:gh,forum,gmail,pm};
  saveState(st);
  console.log('Recovery complete:',gh+forum+gmail+pm,'new items');
}
main().catch(e=>{console.error('Fatal:',e);process.exit(0)});
