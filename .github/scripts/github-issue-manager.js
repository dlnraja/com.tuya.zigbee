#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{callAI,analyzeImage}=require('./ai-helper');
const{loadFingerprints,findAllDrivers,extractMfrFromText}=require('./load-fingerprints');
const REPOS=(process.env.REPOS||'dlnraja/com.tuya.zigbee,JohanBendz/com.tuya.zigbee').split(',').map(s=>s.trim());
const OWN=REPOS[0];
const DRY=process.env.DRY_RUN==='true';
const GH='https://api.github.com';
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const STALE_DAYS=parseInt(process.env.STALE_DAYS||'30');
const STATE_F=path.join(__dirname,'..','state','issue-manager-state.json');
const REPORT_F=path.join(__dirname,'..','state','issue-manager-report.json');
const TAG='<!-- tuya-issue-manager -->';
const{fetchWithRetry}=require('./retry-helper');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let appVer='?';try{appVer=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
const fps=loadFingerprints();
const hdrs=t=>({Accept:'application/vnd.github+json','User-Agent':'tuya-bot',...(t?{Authorization:'Bearer '+t}:{})});

// Load external sources + forum data for enrichment
function loadExtData(){try{return JSON.parse(fs.readFileSync(path.join(__dirname,'..','state','external-sources-data.json'),'utf8'))}catch{return null}}
function loadForumData(){try{return JSON.parse(fs.readFileSync(path.join(__dirname,'..','state','forum-activity-data.json'),'utf8'))}catch{return null}}
function findVariants(fp,ext){if(!ext||!ext.allDevices)return[];const pfx=fp.substring(0,fp.lastIndexOf('_'));return ext.allDevices.filter(d=>d.fp.startsWith(pfx)&&d.fp!==fp).slice(0,10)}
function findBugs(fp,ext){if(!ext||!ext.bugs)return[];return ext.bugs.filter(b=>b.fp===fp)}

// Cross-post to forum
async function crossPostForum(msg){
  try{const{getForumAuth,fmtCk,FORUM}=require('./forum-auth');const auth=await getForumAuth();if(!auth)return;
    const h=auth.type==='apikey'?{'Content-Type':'application/json','User-Api-Key':auth.key}:{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
    if(DRY){console.log('[DRY] Forum post:',msg.slice(0,80));return}
    await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:h,body:JSON.stringify({topic_id:140352,raw:msg})},{retries:3,label:'forumCrossPost'});
    console.log('    Cross-posted to forum');
  }catch(e){console.log('    Forum cross-post skip:',e.message)}
}

// Cross-post to other GitHub repo
async function crossPostGH(fromRepo,issueNum,msg,report){
  const target=fromRepo===OWN?'JohanBendz/com.tuya.zigbee':OWN;
  const searchUrl='/search/issues?q=repo:'+target+'+'+encodeURIComponent(msg.slice(0,30));
  // Don't create duplicate - just log
  report.crossPosts=(report.crossPosts||0)+1;
  console.log('    Cross-ref: '+target+' (from '+fromRepo+'#'+issueNum+')');
}

function loadState(){try{return JSON.parse(fs.readFileSync(STATE_F,'utf8'))}catch{return{processed:[],closed:[],labeled:[],lastRun:null}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE_F),{recursive:true});fs.writeFileSync(STATE_F,JSON.stringify(s,null,2)+'\n')}

async function ghGet(ep){
  try{const r=await fetchWithRetry(GH+ep,{headers:hdrs(TOKEN)},{retries:3,label:'ghGet'});if(!r.ok)return null;return r.json()}catch{return null}
}
async function ghPost(ep,body){
  if(DRY){console.log('[DRY] POST',ep,JSON.stringify(body).slice(0,120));return{id:'dry'}}
  try{const r=await fetchWithRetry(GH+ep,{method:'POST',headers:hdrs(TOKEN),body:JSON.stringify(body)},{retries:3,label:'ghPost'});
    return r.ok?r.json():null}catch{return null}
}
async function ghPatch(ep,body){
  if(DRY){console.log('[DRY] PATCH',ep,JSON.stringify(body).slice(0,120));return true}
  try{const r=await fetchWithRetry(GH+ep,{method:'PATCH',headers:hdrs(TOKEN),body:JSON.stringify(body)},{retries:3,label:'ghPatch'});return r.ok}catch{return false}
}

function extractFP(t){return[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])]}
function extractImages(t){const u=[];const re=/!\[[^\]]*\]\(([^)]+)\)/g;let m;while((m=re.exec(t||''))!==null)u.push(m[1]);return u}
function extractLinks(t){return(t||'').match(/https?:\/\/[^\s)>"]+/g)||[]}
function daysSince(d){return Math.floor((Date.now()-new Date(d).getTime())/86400000)}
function wasProcessed(state,repo,num){return state.processed.includes(repo+'#'+num)}
function markProcessed(state,repo,num){if(!state.processed.includes(repo+'#'+num))state.processed.push(repo+'#'+num)}

// Classify issue with AI
async function classifyIssue(issue,fpResults){
  const prompt='Classify this GitHub issue for a Zigbee device app. Return ONLY a JSON object: {"type":"device_request|bug_report|feature|question|duplicate|stale|resolved","priority":"high|medium|low","shouldClose":true/false,"closeReason":"string or null","labels":["label1"],"summary":"one line"}';
  const text='Issue #'+issue.number+' by @'+(issue.user?.login||'?')+':\nTitle: '+issue.title+'\nBody: '+(issue.body||'').slice(0,1500)+'\nFingerprints: '+JSON.stringify(fpResults)+'\nDays since update: '+daysSince(issue.updated_at)+'\nState: '+issue.state;
  const ai=await callAI(text,prompt,{maxTokens:512});
  if(!ai)return null;
  try{const m=ai.text.match(/\{[\s\S]*\}/);return m?JSON.parse(m[0]):null}catch{return null}
}

// Generate personalized AI response (with variants + bugs)
async function generateResponse(issue,fpResults,classification,variants,bugs,imageCtx,bodyLinks){
  const ctx={appVersion:appVer,totalFPs:fps.size,driverCount:fs.readdirSync(path.join(__dirname,'..','..','drivers')).length,
    installUrl:'https://homey.app/a/com.dlnraja.tuya.zigbee/test/',
    forumUrl:'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352',
    devTools:'https://tools.developer.homey.app',githubUrl:'https://github.com/dlnraja/com.tuya.zigbee'};
  const prompt='You are the Universal Tuya Zigbee bot (v'+appVer+'). Write a personalized GitHub comment for this issue. Be helpful, technical, concise. Use GitHub markdown. Include relevant links. If device is supported, show which driver. If not, ask for interview from developer tools. If bug, acknowledge and explain fix status. IMPORTANT: if variants exist, mention them so user knows related models. If bugs found in Z2M/ZHA, reference them. End with ---\\n*Universal Tuya Zigbee v'+appVer+' — '+ctx.driverCount+' drivers, '+fps.size+'+ fingerprints*\\nContext: '+JSON.stringify(ctx);
  let text='Issue: '+issue.title+'\nBy: @'+(issue.user?.login||'?')+'\nBody: '+(issue.body||'').slice(0,2000)+'\nFP results: '+JSON.stringify(fpResults)+'\nClassification: '+JSON.stringify(classification)+'\nVariants from Z2M/ZHA/Blakadder: '+JSON.stringify(variants||[])+'\nAssociated bugs: '+JSON.stringify(bugs||[]);
  if(imageCtx)text+='\nImage analysis: '+imageCtx;
  if(bodyLinks&&bodyLinks.length)text+='\nExternal refs: '+bodyLinks.join(', ');
  const ai=await callAI(text,prompt,{maxTokens:1024});
  return ai?TAG+'\n'+ai.text:null;
}

// Process a single issue
async function processIssue(repo,issue,state,report,extData){
  const key=repo+'#'+issue.number;
  if(wasProcessed(state,repo,issue.number))return;
  const text=(issue.title||'')+' '+(issue.body||'');
  const foundFPs=extractFP(text);
  const mfrs=extractMfrFromText(text);
  const allFPs=[...new Set([...foundFPs,...mfrs.filter(m=>m.startsWith('_T'))])];

  // Check which are supported
  const fpResults=allFPs.map(fp=>{
    const drivers=findAllDrivers(fp);
    return{fp,supported:drivers.length>0,drivers};
  });
  const newFPs=fpResults.filter(f=>!f.supported).map(f=>f.fp);
  const existingFPs=fpResults.filter(f=>f.supported);

  // Search variants and bugs from external sources
  const variants=[];const bugs=[];
  for(const fp of allFPs){
    const v=findVariants(fp,extData);if(v.length){variants.push({fp,variants:v});console.log('    Variants for '+fp+': '+v.length)}
    const b=findBugs(fp,extData);if(b.length){bugs.push(...b);console.log('    Bugs for '+fp+': '+b.length)}
  }

  // Classify with AI
  const classification=await classifyIssue(issue,fpResults);
  if(!classification){console.log('  Skip #'+issue.number+' (AI classify failed)');return}
  console.log('  #'+issue.number+' ['+classification.type+'/'+classification.priority+'] '+issue.title?.slice(0,60));

  // Track new fingerprints
  if(newFPs.length)report.newFingerprints.push(...newFPs.map(fp=>({fp,source:key,type:classification.type})));

  // Label the issue (own repo only)
  if(repo===OWN&&!state.labeled.includes(key)){
    const labels=classification.labels||[];
    if(classification.type==='device_request')labels.push('device-request');
    if(classification.type==='bug_report')labels.push('bug');
    if(newFPs.length)labels.push('new-fingerprint');
    if(labels.length){
      await ghPost('/repos/'+repo+'/issues/'+issue.number+'/labels',{labels:[...new Set(labels)]});
      state.labeled.push(key);
      console.log('    Labels:',labels.join(', '));
    }
  }

  // Analyze images in issue body
  const bodyImgs=extractImages(issue.body||'');
  let imageCtx='';
  if(bodyImgs.length){
    console.log('    Images:',bodyImgs.length);
    const ia=await analyzeImage(bodyImgs[0],'Extract Tuya fingerprints, device type, clusters from this image. Return JSON or NULL.');
    if(ia){imageCtx=ia;console.log('    Image:',ia.substring(0,80))}
  }
  // Analyze external links
  const bodyLinks=extractLinks(issue.body||'').filter(l=>l.includes('zigbee2mqtt')||l.includes('blakadder')||l.includes('zigpy'));
  // Check comments for extra FPs and images
  const comments=await ghGet('/repos/'+repo+'/issues/'+issue.number+'/comments?per_page=30');
  const hasBot=comments&&comments.some(c=>(c.body||'').includes(TAG));
  if(comments&&Array.isArray(comments))for(const c of comments){
    if((c.body||'').includes(TAG))continue;
    for(const fp of extractFP(c.body||''))if(!allFPs.includes(fp)){allFPs.push(fp);const d=findAllDrivers(fp);fpResults.push({fp,supported:d.length>0,drivers:d})}
    if(!imageCtx){const ci=extractImages(c.body||'');if(ci.length){imageCtx=await analyzeImage(ci[0],'Extract Tuya fingerprints from image. JSON or NULL.')||''}}
  }

  // Respond if not already responded
  if(!hasBot){
    const response=await generateResponse(issue,fpResults,classification,variants,bugs,imageCtx,bodyLinks);
    if(response){
      const posted=await ghPost('/repos/'+repo+'/issues/'+issue.number+'/comments',{body:response});
      if(posted){
        console.log('    Responded');report.responded++;
        // Cross-post to forum for device requests
        if(classification.type==='device_request'||newFPs.length){
          const forumMsg='**GitHub #'+issue.number+'** — '+issue.title+'\nFPs: '+allFPs.map(f=>'`'+f+'`').join(', ')+(variants.length?' | Variants: '+variants.flatMap(v=>v.variants).slice(0,5).map(v=>v.fp).join(', '):'')+'\n[View issue](https://github.com/'+repo+'/issues/'+issue.number+')';
          await crossPostForum(forumMsg);
        }
        // Cross-ref to other repo
        await crossPostGH(repo,issue.number,issue.title,report);
      }
    }
    await sleep(2000);
  }

  // Close stale/resolved issues
  if(classification.shouldClose&&issue.state==='open'){
    const age=daysSince(issue.updated_at);
    if(age>=STALE_DAYS||classification.type==='resolved'||classification.type==='duplicate'){
      const reason=classification.closeReason||'Auto-closed: '+(age>=STALE_DAYS?'inactive >'+STALE_DAYS+' days':classification.type);
      await ghPost('/repos/'+repo+'/issues/'+issue.number+'/comments',{body:TAG+'\n'+reason+'\n\nIf this is still relevant, please reopen with updated info.\n\n---\n*Auto-managed by Universal Tuya Zigbee v'+appVer+'*'});
      await ghPatch('/repos/'+repo+'/issues/'+issue.number,{state:'closed',state_reason:'not_planned'});
      state.closed.push(key);
      report.closed++;
      console.log('    CLOSED:',reason);
    }
  }

  markProcessed(state,repo,issue.number);
}

// Process a single PR
async function processPR(repo,pr,state,report,extData){
  const key=repo+'#PR'+pr.number;
  if(wasProcessed(state,repo,'PR'+pr.number))return;
  const text=(pr.title||'')+' '+(pr.body||'');
  const allFPs=extractFP(text);
  if(!allFPs.length&&!text.toLowerCase().match(/fix|bug|feature|driver|sensor|switch/))return;

  const fpResults=allFPs.map(fp=>({fp,supported:findAllDrivers(fp).length>0,drivers:findAllDrivers(fp)}));
  const newFPs=fpResults.filter(f=>!f.supported).map(f=>f.fp);

  console.log('  PR#'+pr.number+' ['+pr.state+'] '+pr.title?.slice(0,60)+' FPs:'+allFPs.length);
  if(newFPs.length)report.newFingerprints.push(...newFPs.map(fp=>({fp,source:key,type:'pr'})));

  // Check if already responded
  const comments=await ghGet('/repos/'+repo+'/issues/'+pr.number+'/comments?per_page=20');
  const hasBot=comments&&comments.some(c=>(c.body||'').includes(TAG));

  if(!hasBot){
    let msg=TAG+'\nThanks for this PR! Tracked in [Universal Tuya Zigbee](https://github.com/dlnraja/com.tuya.zigbee) v'+appVer+'.\n\n';
    if(fpResults.filter(f=>f.supported).length)msg+='**Already supported:**\n'+fpResults.filter(f=>f.supported).map(f=>'- '+f.fp+' → **'+f.drivers.join(', ')+'**').join('\n')+'\n\n';
    if(newFPs.length)msg+='**New FPs to integrate:**\n'+newFPs.map(fp=>'- '+fp+'').join('\n')+'\n\n';
    msg+='[Install test version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) | [Forum](https://community.homey.app/t/140352)\n\n---\n*Universal Tuya Zigbee v'+appVer+'*';
    await ghPost('/repos/'+repo+'/issues/'+pr.number+'/comments',{body:msg});
    report.responded++;
    console.log('    Responded to PR');
  }

  // Close old PRs on JohanBendz that are fully supported
  if(repo!==OWN&&pr.state==='open'&&allFPs.length&&!newFPs.length&&daysSince(pr.updated_at)>14){
    await ghPost('/repos/'+repo+'/issues/'+pr.number+'/comments',{body:TAG+'\nAll fingerprints in this PR are already supported in [Universal Tuya Zigbee](https://github.com/dlnraja/com.tuya.zigbee) v'+appVer+'. Closing as resolved.\n\n---\n*Auto-managed*'});
    await ghPatch('/repos/'+repo+'/pulls/'+pr.number,{state:'closed'});
    state.closed.push(key);report.closed++;
    console.log('    CLOSED PR (all FPs supported)');
  }

  markProcessed(state,repo,'PR'+pr.number);
  await sleep(1000);
}

// Update project docs based on findings
async function updateProjectDocs(report){
  if(!report.newFingerprints.length&&!report.responded)return;
  const docsDir=path.join(__dirname,'..','..','docs');
  fs.mkdirSync(docsDir,{recursive:true});

  // Update USER_DEVICE_EXPECTATIONS
  const udeFile=path.join(docsDir,'rules','USER_DEVICE_EXPECTATIONS.md');
  if(report.newFingerprints.length){
    let udeContent='';
    try{udeContent=fs.readFileSync(udeFile,'utf8')}catch{udeContent='# User Device Expectations\n\n'}
    const newSection='\n\n## Auto-discovered from GitHub ('+new Date().toISOString().split('T')[0]+')\n\n| Fingerprint | Source | Type |\n|---|---|---|\n'+
      report.newFingerprints.slice(0,50).map(f=>'| '+f.fp+' | '+f.source+' | '+f.type+' |').join('\n')+'\n';
    if(!udeContent.includes(report.newFingerprints[0]?.fp)){
      fs.writeFileSync(udeFile,udeContent+newSection);
      console.log('Updated USER_DEVICE_EXPECTATIONS with',report.newFingerprints.length,'new FPs');
    }
  }

  // Generate evolution report with AI
  if(report.responded>0||report.closed>0||report.newFingerprints.length>0){
    const prompt='Generate a concise project evolution summary (max 200 words) based on GitHub issue/PR management results. Focus on: new devices discovered, issues resolved, action items.';
    const ai=await callAI(JSON.stringify({responded:report.responded,closed:report.closed,newFPs:report.newFingerprints.length,
      topFPs:report.newFingerprints.slice(0,10),issuesProcessed:report.issuesProcessed,prsProcessed:report.prsProcessed},null,2),prompt,{maxTokens:512});
    if(ai)report.evolutionSummary=ai.text;
  }
}

async function main(){
  if(!TOKEN){console.error('GH_PAT/GITHUB_TOKEN required');process.exit(0)}
  const state=loadState();
  const report={timestamp:new Date().toISOString(),appVersion:appVer,responded:0,closed:0,labeled:0,
    issuesProcessed:0,prsProcessed:0,newFingerprints:[],evolutionSummary:null};

  console.log('=== GitHub Issue & PR Manager ===');
  const extData=loadExtData();
  const forumData=loadForumData();
  console.log('Mode:',DRY?'DRY RUN':'LIVE','| Repos:',REPOS.join(', '),'| FPs:',fps.size,'| Stale:',STALE_DAYS+'d');
  console.log('ExtData:',extData?'loaded ('+((extData.allDevices||[]).length)+' devices)':'none','| ForumData:',forumData?'loaded':'none');

  for(const repo of REPOS){
    console.log('\n== '+repo+' ==');

    // Fetch open issues
    const issues=await ghGet('/repos/'+repo+'/issues?state=open&sort=updated&direction=desc&per_page=50');
    if(!issues){console.log('  Failed to fetch issues');continue}
    const realIssues=issues.filter(i=>!i.pull_request);
    console.log('Open issues:',realIssues.length);

    for(const iss of realIssues.slice(0,20)){
      await processIssue(repo,iss,state,report,extData);
      report.issuesProcessed++;
    }
    await sleep(2000);

    // Fetch open PRs
    const prs=await ghGet('/repos/'+repo+'/pulls?state=open&sort=updated&direction=desc&per_page=30');
    if(!prs){console.log('  Failed to fetch PRs');continue}
    console.log('Open PRs:',prs.length);

    for(const pr of prs.slice(0,15)){
      await processPR(repo,pr,state,report,extData);
      report.prsProcessed++;
    }
    await sleep(2000);
  }

  // Update project docs
  console.log('\n== Updating project docs ==');
  await updateProjectDocs(report);

  // Save state & report
  state.lastRun=new Date().toISOString();
  // Keep state manageable
  if(state.processed.length>500)state.processed=state.processed.slice(-300);
  if(state.closed.length>200)state.closed=state.closed.slice(-100);
  if(state.labeled.length>200)state.labeled=state.labeled.slice(-100);
  saveState(state);
  fs.writeFileSync(REPORT_F,JSON.stringify(report,null,2)+'\n');

  // Summary
  console.log('\n=== Results ===');
  console.log('Issues processed:',report.issuesProcessed);
  console.log('PRs processed:',report.prsProcessed);
  console.log('Responded:',report.responded);
  console.log('Closed:',report.closed);
  console.log('New FPs found:',report.newFingerprints.length);

  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## GitHub Issue & PR Manager\n| Metric | Count |\n|---|---|\n';
    md+='| Issues processed | '+report.issuesProcessed+' |\n';
    md+='| PRs processed | '+report.prsProcessed+' |\n';
    md+='| Responded | '+report.responded+' |\n';
    md+='| Closed (stale/resolved) | '+report.closed+' |\n';
    md+='| New fingerprints | '+report.newFingerprints.length+' |\n';
    if(report.evolutionSummary)md+='\n### Evolution Summary\n'+report.evolutionSummary+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
