#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const SD=path.join(__dirname,'..','state');
const DD=path.join(__dirname,'..','..','drivers');
const DRY=process.env.DRY_RUN==='true';
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const GH='https://api.github.com';
const OWN='dlnraja/com.tuya.zigbee';
const UP='JohanBendz/com.tuya.zigbee';
const TAG='<!-- diag-resolver -->';
const SF=path.join(SD,'resolver-state.json');
const RF=path.join(SD,'resolver-report.json');
let appVer='?';try{appVer=require('../../app.json').version}catch{}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hdrs=t=>({Accept:'application/vnd.github+json','User-Agent':'tuya-resolver',...(t?{Authorization:'Bearer '+t}:{})});
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};
const loadSt=()=>loadJ(SF)||{resolved:[],commented:[],lastRun:null};
const saveSt=s=>{fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s,null,2))};
const exFP=t=>[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])];
const exPID=t=>[...new Set((t||'').match(/\bTS[0-9]{4}[A-Z]?\b/g)||[])];
function buildIdx(){
  const idx=new Map();if(!fs.existsSync(DD))return idx;
  for(const d of fs.readdirSync(DD)){
    const f=path.join(DD,d,'driver.compose.json');if(!fs.existsSync(f))continue;
    try{const c=JSON.parse(fs.readFileSync(f,'utf8'));
      for(const m of(c.zigbee?.manufacturerName||[]))idx.set(m,(idx.get(m)||[]).concat(d).filter((v,i,a)=>a.indexOf(v)===i));
      for(const p of(c.zigbee?.productId||[])){const k='pid:'+p;idx.set(k,(idx.get(k)||[]).concat(d).filter((v,i,a)=>a.indexOf(v)===i))}
    }catch{}
  }return idx;
}

async function ghGet(ep){
  try{const r=await fetchWithRetry(GH+ep,{headers:hdrs(TOKEN)},{retries:2,label:'ghGet'});return r.ok?r.json():null}catch{return null}
}
async function ghPost(ep,body){
  if(DRY){console.log('[DRY] POST',ep.slice(0,60));return{id:'dry'}}
  try{const r=await fetchWithRetry(GH+ep,{method:'POST',headers:{...hdrs(TOKEN),'Content-Type':'application/json'},body:JSON.stringify(body)},{retries:2,label:'ghPost'});return r.ok?r.json():null}catch{return null}
}
async function ghPatch(ep,body){
  if(DRY){console.log('[DRY] PATCH',ep.slice(0,60));return true}
  try{const r=await fetchWithRetry(GH+ep,{method:'PATCH',headers:{...hdrs(TOKEN),'Content-Type':'application/json'},body:JSON.stringify(body)},{retries:2,label:'ghPatch'});return r.ok}catch{return false}
}
// Collect FPs from all diagnostic sources
function collectDiagFPs(){
  const all=new Map();
  // 1. Gmail diagnostics
  const gd=loadJ(path.join(SD,'diagnostics-report.json'));
  if(gd&&gd.diagnostics){for(const d of gd.diagnostics){for(const fp of(d.fps&&d.fps.mfr||[]))all.set(fp,{source:'gmail',date:d.date,type:d.type})}}
  // 2. Homey device report
  const hd=loadJ(path.join(SD,'homey-device-report.json'));
  if(hd&&hd.devices){for(const d of hd.devices){if(d.manufacturerName&&d.manufacturerName.startsWith('_T'))all.set(d.manufacturerName,{source:'homey',pid:d.modelId,driver:d.driver})}}
  // 3. Forum activity
  const fa=loadJ(path.join(SD,'forum-activity-data.json'));
  if(fa&&fa.recentPosts){for(const p of fa.recentPosts){for(const fp of exFP(p.excerpt||p.text||''))all.set(fp,{source:'forum',user:p.username,date:p.createdAt||p.date})}}
  // 4. PR/Issue scan
  const ps=loadJ(path.join(SD,'pr-issue-scan.json'));
  if(ps&&ps.prs){for(const pr of ps.prs){for(const fp of(pr.fps||[]))all.set(fp,{source:'pr',num:pr.number,repo:pr.repo||UP})}}
  if(ps&&ps.issues){for(const iss of ps.issues){for(const fp of(iss.fps||[]))all.set(fp,{source:'issue',num:iss.number,repo:iss.repo||UP})}}
  return all;
}

// Fetch open issues from a repo (with cache)
const _cache={};
async function fetchOpen(repo,type){
  const k=repo+type;if(_cache[k])return _cache[k];
  const items=[];
  for(let pg=1;pg<=3;pg++){
    const ep='/repos/'+repo+'/'+(type==='pr'?'pulls':'issues')+'?state=open&per_page=50&page='+pg;
    const d=await ghGet(ep);if(!d||!d.length)break;
    items.push(...d);await sleep(1000);
  }
  _cache[k]=items;return items;
}
// Build resolution comment for an issue/PR where all FPs are supported
function buildComment(fpResults,isPR,isDelay){
  const drvList=fpResults.map(f=>'`'+f.fp+'` -> **'+f.drivers.join(', ')+'**').join('\n- ');
  return TAG+'\n### Auto-resolved by Diagnostic Resolver\n\n'+
    'All fingerprints in this '+(isPR?'PR':'issue')+' are already supported in **Universal Tuya Zigbee v'+appVer+'**:\n- '+drvList+'\n\n'+
    '**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/\n'+
    'Remove and re-pair your device after installing.\n\n'+
    (fpResults.some(f=>f.drivers.length>1)?'> Note: Some fingerprints map to multiple drivers — the correct driver is determined by the **productId** (e.g. TS0001, TS0002).\n\n':'')+
    (isDelay?'> **Delay fix (v5.11.99+):** Devices now send dataQuery immediately on init. Update and re-pair to fix.\n\n':'')+
    'Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352';
}

// Build forum response draft
function buildForumDraft(user,fps,drivers){
  const drvList=fps.map(f=>'`'+f+'` -> **'+(drivers.get(f)||[]).join(', ')+'**').join(', ');
  return 'Hi @'+user+',\n\nYour device(s) are already supported in Universal Tuya Zigbee v'+appVer+': '+drvList+'.\n\n'+
    'Please install the latest test version and re-pair your device:\nhttps://homey.app/a/com.dlnraja.tuya.zigbee/test/\n\n'+
    'If you still have issues after re-pairing, please submit a diagnostic report from the device settings.';
}

// Process open issues on a repo — auto-comment + close if all FPs supported
async function processIssues(repo,idx,state,report){
  console.log('\n=== Processing issues: '+repo+' ===');
  const issues=await fetchOpen(repo,'issue');
  console.log('Open issues: '+issues.length);
  let commented=0,closed=0;
  for(const iss of issues){
    if(iss.pull_request)continue; // skip PRs in issue list
    const key=repo+'#'+iss.number;
    if(state.resolved.includes(key)||state.commented.includes(key))continue;
    const text=(iss.title||'')+' '+(iss.body||'');
    const fps=exFP(text);
    const pids=exPID(text);
    if(!fps.length&&!pids.length)continue;
    // v5.11.99: Detect delay complaints
    const isDelay=/after\s+\d+\s*min|few\s+minutes?\s+later|takes?\s+\d+\s*min|not\s+report|no\s+data|works?\s+after/i.test(text);
    // Check support status
    const results=fps.map(fp=>({fp,drivers:idx.get(fp)||[],supported:(idx.get(fp)||[]).length>0}));
    const allSupported=results.length>0&&results.every(r=>r.supported);
    if(!allSupported)continue;
    // Check if already commented by us
    const comments=await ghGet('/repos/'+repo+'/issues/'+iss.number+'/comments?per_page=5');
    if(comments&&comments.some(c=>(c.body||'').includes(TAG)||(c.body||'').includes('<!-- tuya-issue-manager -->')))
      {state.commented.push(key);continue}
    // Post comment
    const body=buildComment(results,false,isDelay);
    console.log('  #'+iss.number+' [RESOLVE] '+fps.join(',')+' -> '+results.map(r=>r.drivers[0]).join(',')+(isDelay?' [DELAY]':''));
    await ghPost('/repos/'+repo+'/issues/'+iss.number+'/comments',{body});
    commented++;
    // Auto-close on own repo if device_request with all supported
    if(repo===OWN){
      await ghPatch('/repos/'+repo+'/issues/'+iss.number,{state:'closed',state_reason:'completed'});
      state.resolved.push(key);closed++;
      console.log('    -> Closed');
    }else{
      state.commented.push(key);
    }
    await sleep(3000);
    if(commented>=15)break; // rate limit guard
  }
  report[repo]={issues:issues.length,commented,closed};
}

// Process open PRs — auto-comment if all FPs already integrated
async function processPRs(repo,idx,state,report){
  console.log('\n=== Processing PRs: '+repo+' ===');
  const prs=await fetchOpen(repo,'pr');
  console.log('Open PRs: '+prs.length);
  let commented=0;
  for(const pr of prs){
    const key=repo+'#PR'+pr.number;
    if(state.commented.includes(key))continue;
    const text=(pr.title||'')+' '+(pr.body||'');
    const fps=exFP(text);if(!fps.length)continue;
    const results=fps.map(fp=>({fp,drivers:idx.get(fp)||[],supported:(idx.get(fp)||[]).length>0}));
    const allSupported=results.length>0&&results.every(r=>r.supported);
    if(!allSupported)continue;
    const comments=await ghGet('/repos/'+repo+'/pulls/'+pr.number+'/comments?per_page=5');
    const revComments=await ghGet('/repos/'+repo+'/issues/'+pr.number+'/comments?per_page=5');
    const allC=[...(comments||[]),...(revComments||[])];
    if(allC.some(c=>(c.body||'').includes(TAG)||(c.body||'').includes('<!-- tuya-issue-manager -->')))
      {state.commented.push(key);continue}
    const body=buildComment(results,true);
    console.log('  PR#'+pr.number+' [INTEGRATED] '+fps.join(','));
    await ghPost('/repos/'+repo+'/issues/'+pr.number+'/comments',{body});
    state.commented.push(key);commented++;
    await sleep(3000);
    if(commented>=10)break;
  }
  report[repo+'_prs']={prs:prs.length,commented};
}
// Generate forum response drafts for users with supported devices
function generateForumDrafts(diagFPs,idx){
  const drafts=[];
  for(const[fp,info]of diagFPs){
    if(info.source!=='forum'||!info.user)continue;
    const drivers=idx.get(fp)||[];
    if(!drivers.length)continue;
    drafts.push({user:info.user,fp,drivers,date:info.date,
      draft:buildForumDraft(info.user,[fp],idx)});
  }
  return drafts;
}

// Main
async function main(){
  if(!TOKEN){console.log('No GH token');process.exit(0)}
  const state=loadSt();
  const idx=buildIdx();
  const diagFPs=collectDiagFPs();
  const report={timestamp:new Date().toISOString(),diagFPs:diagFPs.size,driverIdx:idx.size};
  console.log('Driver index:',idx.size,'FPs |','Diagnostic FPs:',diagFPs.size);

  // 1. Cross-ref diagnostic FPs with driver index
  let supported=0,unsupported=0;
  const newFPs=[];
  for(const[fp,info]of diagFPs){
    const drivers=idx.get(fp)||[];
    if(drivers.length){supported++}else{unsupported++;newFPs.push({fp,...info})}
  }
  console.log('Supported:',supported,'| Unsupported:',unsupported);
  report.supported=supported;report.unsupported=unsupported;report.newFPs=newFPs.slice(0,50);

  // 2. Process open issues on both repos
  await processIssues(OWN,idx,state,report);
  await processIssues(UP,idx,state,report);

  // 3. Process open PRs on upstream
  await processPRs(UP,idx,state,report);

  // 4. Forum drafts
  const drafts=generateForumDrafts(diagFPs,idx);
  report.forumDrafts=drafts.length;
  if(drafts.length){
    console.log('\n=== Forum Response Drafts ===');
    for(const d of drafts.slice(0,10))
      console.log('  @'+d.user+': '+d.fp+' -> '+d.drivers.join(',')); 
  }

  // 5. Trim state (keep last 500)
  state.resolved=state.resolved.slice(-500);
  state.commented=state.commented.slice(-500);
  state.lastRun=new Date().toISOString();
  saveSt(state);
  fs.writeFileSync(RF,JSON.stringify(report,null,2));
  console.log('\nDone. Resolved:',JSON.stringify(report));

  // Step summary
  if(process.env.GITHUB_STEP_SUMMARY){
    let sm='## Diagnostic Auto-Resolver\n| Metric | Count |\n|---|---|\n';
    sm+='| Diag FPs | '+diagFPs.size+' |\n| Supported | '+supported+' |\n| Unsupported | '+unsupported+' |\n';
    if(report[OWN])sm+='| Own issues resolved | '+report[OWN].closed+' |\n| Own issues commented | '+report[OWN].commented+' |\n';
    if(report[UP])sm+='| Upstream commented | '+report[UP].commented+' |\n';
    if(report[UP+'_prs'])sm+='| Upstream PRs commented | '+report[UP+'_prs'].commented+' |\n';
    sm+='| Forum drafts | '+drafts.length+' |\n';
    if(newFPs.length)sm+='\n**New unsupported FPs:**\n'+newFPs.slice(0,20).map(f=>'- `'+f.fp+'` ('+f.source+')').join('\n')+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,sm);
  }
}
main().catch(e=>{console.error(e.message);process.exit(1)});